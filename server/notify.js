// Side effects after a submission: e-mails, approval requests, webhooks and app integrations.
// Every e-mail is recorded in the outbox; with SMTP_HOST configured it is also delivered via SMTP.
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { db } from './db.js';
import { formatValue, isInput } from '../shared/fields.js';
import { computeState } from '../shared/logic.js';
import { formEmails } from '../shared/emails.js';
import { WEBHOOK_KEYS } from '../shared/integrations.js';
import { startWorkflows } from './workflows.js';
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

const htmlToText = (h) => String(h || '').replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (m, href, text) => `${text} (${href})`).replace(/<\/(p|div|h\d|tr|li)>|<br\s*\/?>/gi, '\n').replace(/<\/t[dh]>/gi, '  ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\n{3,}/g, '\n\n').trim();

/** Records an e-mail and sends it when SMTP is configured. attachments: [{filename, content: Buffer, contentType}]. opts: { html, replyTo, senderName } */
export function deliver(userId, formId, to, subject, body, attachments, opts = {}) {
  const text = opts.html ? htmlToText(opts.html) : body;
  const meta = attachments?.length ? JSON.stringify(attachments.map((a) => ({ filename: a.filename, size: a.content.length }))) : null;
  const { lastInsertRowid: id } = db.prepare('INSERT INTO outbox (user_id, form_id, recipient, subject, body, attachments) VALUES (?, ?, ?, ?, ?, ?)').run(userId, formId, to, subject, text, meta);
  const t = mailer();
  if (!t) return;
  const fromAddr = process.env.SMTP_FROM || process.env.SMTP_USER;
  const from = opts.senderName ? `"${opts.senderName.replace(/"/g, '')}" <${String(fromAddr).replace(/^.*<|>.*$/g, '')}>` : fromAddr;
  t.sendMail({ from, to, subject, text, html: opts.html, replyTo: opts.replyTo || undefined, attachments })
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

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// HTML e-mail templates: answers are escaped; {all_fields} becomes a table of every answer.
export function renderHtml(tpl, form, data, extra = {}) {
  const fields = form.definition.fields.filter((f) => isInput(f) && !['hidden', 'captcha'].includes(f.type));
  const table = `<table style="border-collapse:collapse;width:100%;font-size:14px">${fields.map((f) => `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#57534e;width:40%;vertical-align:top">${esc(f.label)}</td><td style="padding:8px;border-bottom:1px solid #eee">${esc(formatValue(f, data[f.id]) || '-').replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
  return String(tpl || '')
    .replace(/\{form_title\}/g, esc(form.title))
    .replace(/\{all_fields\}/g, table)
    .replace(/\{(inbox_link|submission_id)\}/g, (m, k) => esc(extra[k] ?? m))
    .replace(/\{([\w-]+)\}/g, (m, id) => {
      const f = fields.find((x) => x.id === id);
      return f ? esc(formatValue(f, data[id])) : m;
    });
}

const emailList = (v) => String(v || '').split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));

// Sends one configured e-mail (Settings → Emails) for a submission. `toOverride` comes from "Change Email Recipient" conditions.
async function sendFormEmail(form, owner, sub, email, toOverride, pdf) {
  const data = sub.data;
  const to = toOverride ? emailList(toOverride) : email.kind === 'autoresponder' ? emailList(data[email.toField]) : emailList(email.to || owner.email);
  if (!to.length) return;
  const extra = { inbox_link: `${BASE_URL()}/#/forms/${form.id}/inbox/${sub.id}`, submission_id: sub.id };
  const subject = htmlToText(renderHtml(email.subject || form.title, form, data, extra));
  const html = `<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#18181b">${renderHtml(email.body, form, data, extra)}</div>`;
  const replyTo = email.replyTo && /^\{[\w-]+\}$/.test(email.replyTo) ? emailList(data[email.replyTo.slice(1, -1)])[0] : email.replyTo;
  deliver(owner.id, form.id, to.join(', '), subject, '', email.attachPdf ? await pdf() : undefined, { html, replyTo, senderName: email.senderName });
}

// Sends a sample of an e-mail to the form owner, using placeholder answers.
export async function sendTestEmail(form, owner, email) {
  const data = {};
  const textual = ['text', 'textarea', 'phone', 'url', 'number', 'dropdown', 'radio', 'date', 'time', 'yesno', 'hidden'];
  for (const f of form.definition.fields.filter(isInput)) {
    if (f.type === 'email') data[f.id] = owner.email;
    else if (textual.includes(f.type)) data[f.id] = `[${f.label}]`;
  }
  await sendFormEmail(form, owner, { id: 0, data, created_at: new Date().toISOString() }, { ...email, attachPdf: false }, owner.email, null);
}

export async function sendWhatsApp(owner, form, to, body) {
  const ok = process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID;
  const { lastInsertRowid: id } = db.prepare("INSERT INTO outbox (user_id, form_id, recipient, subject, body, status) VALUES (?, ?, ?, '[WhatsApp]', ?, ?)").run(owner.id, form.id, `whatsapp:${to}`, body, ok ? 'stored' : 'failed');
  if (!ok) return db.prepare('UPDATE outbox SET error = ? WHERE id = ?').run('Set WHATSAPP_TOKEN and WHATSAPP_PHONE_ID in .env to send WhatsApp messages.', id);
  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: to.replace(/[^\d]/g, ''), type: 'text', text: { body: body.slice(0, 4000) } }),
      signal: AbortSignal.timeout(10000),
    });
    db.prepare('UPDATE outbox SET status = ?, error = ? WHERE id = ?').run(r.ok ? 'sent' : 'failed', r.ok ? null : `WhatsApp API ${r.status}`, id);
  } catch (e) { db.prepare("UPDATE outbox SET status = 'failed', error = ? WHERE id = ?").run(String(e.message || e), id); }
}

export async function sendSms(owner, form, to, body) {
  const { TWILIO_SID: sid, TWILIO_TOKEN: token, TWILIO_FROM: from } = process.env;
  const { lastInsertRowid: id } = db.prepare("INSERT INTO outbox (user_id, form_id, recipient, subject, body, status) VALUES (?, ?, ?, '[SMS]', ?, ?)").run(owner.id, form.id, `sms:${to}`, body, sid ? 'stored' : 'failed');
  if (!sid || !token || !from) return db.prepare('UPDATE outbox SET error = ? WHERE id = ?').run('Set TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM in .env to send SMS.', id);
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 1500) }), signal: AbortSignal.timeout(10000),
    });
    db.prepare('UPDATE outbox SET status = ?, error = ? WHERE id = ?').run(r.ok ? 'sent' : 'failed', r.ok ? null : `Twilio ${r.status}`, id);
  } catch (e) { db.prepare("UPDATE outbox SET status = 'failed', error = ? WHERE id = ?").run(String(e.message || e), id); }
}

export async function postJson(form, url, payload) {
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

  const state = computeState(form.definition, data);
  for (const email of formEmails(s)) {
    if (email.enabled) await sendFormEmail(form, owner, sub, email, state.emailTo?.[email.id], pdf);
  }

  // Workflows run alongside e-mails; "Run Workflow" conditions start the ones set to run on condition.
  startWorkflows(form, sub, state.workflows || []).catch((e) => console.error('workflows', e));

  const nt = s.notifications || {};
  const short = `New submission to ${form.title} (#${sub.id})\n${summary}\n${link}`;
  if (nt.whatsapp?.enabled && nt.whatsapp.to) for (const to of String(nt.whatsapp.to).split(',').map((x) => x.trim()).filter(Boolean)) await sendWhatsApp(owner, form, to, short);
  if (nt.sms?.enabled && nt.sms.to) for (const to of String(nt.sms.to).split(',').map((x) => x.trim()).filter(Boolean)) await sendSms(owner, form, to, `New submission to ${form.title} (#${sub.id}). ${link}`);
  if (nt.teams?.enabled && /^https:\/\//.test(nt.teams.url || '')) await postJson(form, nt.teams.url, { text: short.replace(/\n/g, '  \n') });

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
  // Automation platforms (Zapier, Make, n8n…) receive the same JSON event as plain webhooks.
  for (const key of WEBHOOK_KEYS) {
    if (key !== 'webhooks' && integ[key]?.enabled && /^https:\/\//.test(integ[key].url || '')) await postJson(form, integ[key].url, { ...event, source: key });
  }
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

// Settings → Integrations → "Send test": posts a sample submission in the service's format and reports the HTTP status.
export async function testIntegration(form, kind, url) {
  if (!/^https:\/\//.test(url || '')) return { ok: false, error: 'Use an https:// URL.' };
  const data = {};
  for (const f of form.definition.fields.filter(isInput)) data[f.id] = `[${f.label}]`;
  const summary = form.definition.fields.filter(isInput).slice(0, 8).map((f) => `${f.label}: [${f.label}]`).join('\n');
  const payload = {
    slack: { text: `*Test from ${form.title}*\n${summary}` },
    discord: { content: `**Test from ${form.title}**\n${summary}`.slice(0, 1990) },
    teams: { text: `Test from ${form.title}  \n${summary.replace(/\n/g, '  \n')}` },
    sheets: { sheet: form.title, row: { 'Submission ID': 'test', ...Object.fromEntries(Object.entries(data).slice(0, 20)) } },
  }[kind] || { event: 'submission.created', test: true, formId: form.id, formTitle: form.title, submissionId: 0, createdAt: new Date().toISOString(), data, payment: null };
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000) });
    return { ok: r.ok, status: r.status };
  } catch (e) { return { ok: false, error: String(e.message || e) }; }
}

export function notifyDecision(form, owner, sub, decision, by, note) {
  const s = form.definition.settings || {};
  deliver(owner.id, form.id, owner.email, `Submission #${sub.id} ${decision}`, `${by} ${decision} submission #${sub.id} of "${form.title}".${note ? `\n\nNote: ${note}` : ''}`);
  const emailField = formEmails(s).find((e) => e.kind === 'autoresponder' && e.toField)?.toField || form.definition.fields.find((f) => f.type === 'email')?.id;
  const to = emailField && sub.data[emailField];
  if (to) deliver(owner.id, form.id, String(to), `Your submission to ${form.title} was ${decision}`, `Your submission was ${decision}.${note ? `\n\nNote: ${note}` : ''}`);
}
