// Side effects after a submission: e-mails, approval requests, webhooks and app integrations.
// Every e-mail is recorded in the outbox; with SMTP_HOST configured it is also delivered via SMTP.
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from './db.js';
import { formatValue, isInput } from '../shared/fields.js';
import { submissionPdf } from './pdf.js';

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
export const BASE_URL = () => process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`;
export const emailEnabled = () => !!process.env.SMTP_HOST;

export const approvalToken = (subId, email) =>
  crypto.createHmac('sha256', SECRET).update(`approval:${subId}:${email}`).digest('base64url').slice(0, 32);

let transport = null;
const mailer = () => {
  if (!emailEnabled()) return null;
  transport ||= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transport;
};

/** Records an e-mail and sends it when SMTP is configured. attachments: [{filename, content: Buffer, contentType}] */
export function deliver(userId, formId, to, subject, body, attachments) {
  const meta = attachments?.length ? JSON.stringify(attachments.map((a) => ({ filename: a.filename, size: a.content.length }))) : null;
  const { lastInsertRowid: id } = db.prepare('INSERT INTO outbox (user_id, form_id, recipient, subject, body, attachments) VALUES (?, ?, ?, ?, ?, ?)').run(userId, formId, to, subject, body, meta);
  const t = mailer();
  if (!t) return;
  t.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text: body, attachments })
    .then(() => db.prepare("UPDATE outbox SET status = 'sent' WHERE id = ?").run(id))
    .catch((e) => db.prepare("UPDATE outbox SET status = 'failed', error = ? WHERE id = ?").run(String(e.message || e), id));
}

export function renderTemplate(tpl, form, data) {
  const fields = form.definition.fields.filter(isInput);
  const all = fields.filter((f) => f.type !== 'hidden').map((f) => `${f.label}: ${formatValue(f, data[f.id]) || '-'}`).join('\n');
  return String(tpl || '')
    .replace(/\{form_title\}/g, form.title)
    .replace(/\{all_fields\}/g, all)
    .replace(/\{([\w-]+)\}/g, (m, id) => {
      const f = fields.find((x) => x.id === id);
      return f ? formatValue(f, data[id]) : m;
    });
}

async function postJson(form, url, payload) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
    db.prepare('INSERT INTO webhook_log (form_id, url, status) VALUES (?, ?, ?)').run(form.id, url, r.status);
  } catch (e) {
    db.prepare('INSERT INTO webhook_log (form_id, url, error) VALUES (?, ?, ?)').run(form.id, url, String(e.message || e));
  }
}

const pdfName = (form, sub) => `${form.title.replace(/[^\w -]/g, '').trim() || 'submission'}-${sub.id}.pdf`;

export async function afterSubmit(form, owner, sub) {
  const s = form.definition.settings || {};
  const data = sub.data;
  const link = `${BASE_URL()}/#/forms/${form.id}/inbox/${sub.id}`;
  const summary = renderTemplate('{all_fields}', form, data);
  const pdf = async () => [{ filename: pdfName(form, sub), content: Buffer.from(await submissionPdf(form, sub)), contentType: 'application/pdf' }];

  if (s.notify?.enabled) {
    deliver(owner.id, form.id, s.notify.to || owner.email, renderTemplate(s.notify.subject || 'New submission: {form_title}', form, data),
      `${summary}\n\nView in inbox: ${link}`, s.notify.attachPdf ? await pdf() : undefined);
  }

  if (s.autoresponder?.enabled && s.autoresponder.emailField) {
    const to = data[s.autoresponder.emailField];
    if (to) deliver(owner.id, form.id, String(to), renderTemplate(s.autoresponder.subject, form, data), renderTemplate(s.autoresponder.body, form, data), s.autoresponder.attachPdf ? await pdf() : undefined);
  }

  if (s.approvals?.enabled) {
    const approvers = String(s.approvals.approvers || owner.email).split(',').map((e) => e.trim()).filter(Boolean);
    for (const email of approvers) {
      const url = `${BASE_URL()}/#/approve/${sub.id}/${encodeURIComponent(email)}/${approvalToken(sub.id, email)}`;
      deliver(owner.id, form.id, email, `Approval needed: ${form.title} #${sub.id}`, `A new submission needs your approval.\n\n${summary}\n\nApprove or reject: ${url}`);
    }
  }

  const event = { event: 'submission.created', formId: form.id, formTitle: form.title, submissionId: sub.id, createdAt: sub.created_at, data, payment: sub.payment };
  for (const url of s.webhooks || []) if (/^https?:\/\//.test(url)) await postJson(form, url, event);

  const integ = s.integrations || {};
  const text = `*New submission to ${form.title}* (#${sub.id})\n${summary}\n<${link}|Open in inbox>`;
  if (integ.slack?.enabled && /^https:\/\//.test(integ.slack.url || '')) await postJson(form, integ.slack.url, { text });
  if (integ.discord?.enabled && /^https:\/\//.test(integ.discord.url || '')) {
    await postJson(form, integ.discord.url, { content: `**New submission to ${form.title}** (#${sub.id})\n${summary}\n${link}`.slice(0, 1990) });
  }
  if (integ.sheets?.enabled && /^https:\/\//.test(integ.sheets.url || '')) {
    // Google Apps Script web app: receives one flat row per submission (see Settings → Integrations for the script).
    const fields = form.definition.fields.filter((f) => isInput(f) && !['signature', 'captcha'].includes(f.type));
    const row = { 'Submission ID': sub.id, 'Submitted At': sub.created_at };
    for (const f of fields) row[f.label] = formatValue(f, data[f.id]);
    await postJson(form, integ.sheets.url, { sheet: integ.sheets.sheet || form.title, row });
  }
}

export function notifyDecision(form, owner, sub, decision, by, note) {
  const s = form.definition.settings || {};
  deliver(owner.id, form.id, owner.email, `Submission #${sub.id} ${decision}`, `${by} ${decision} submission #${sub.id} of "${form.title}".${note ? `\n\nNote: ${note}` : ''}`);
  const emailField = s.autoresponder?.emailField || form.definition.fields.find((f) => f.type === 'email')?.id;
  const to = emailField && sub.data[emailField];
  if (to) deliver(owner.id, form.id, String(to), `Your submission to ${form.title} was ${decision}`, `Your submission was ${decision}.${note ? `\n\nNote: ${note}` : ''}`);
}
