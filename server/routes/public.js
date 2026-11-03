// Unauthenticated endpoints used by published forms and approval links.
import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, parseForm, parseSub, bumpUsage, getUsage, UPLOAD_DIR } from '../db.js';
import { planOf } from '../../shared/plans.js';
import { validateAll, productTotal } from '../../shared/logic.js';
import { isInput, isEmpty } from '../../shared/fields.js';
import { afterSubmit, approvalToken, notifyDecision, BASE_URL } from '../notify.js';
import { stripeEnabled, createCheckout, retrieveCheckout } from '../payments.js';

const r = Router();

const loadForm = (id) => parseForm(db.prepare('SELECT * FROM forms WHERE id = ?').get(id));
const ownerOf = (form) => db.prepare('SELECT id, email, name, plan FROM users WHERE id = ?').get(form.user_id);

function closedReason(form, owner) {
  const s = form.definition.settings || {};
  const plan = planOf(owner.plan);
  const usage = getUsage(owner.id);
  if (form.status !== 'enabled') return s.closedMessage || 'This form is currently disabled.';
  if (s.closeDate && new Date(s.closeDate) < new Date()) return s.closedMessage;
  if (s.maxSubmissions && db.prepare('SELECT COUNT(*) n FROM submissions WHERE form_id = ?').get(form.id).n >= Number(s.maxSubmissions)) return s.closedMessage;
  if (usage.submissionsPerMonth >= plan.submissionsPerMonth || usage.totalSubmissions >= plan.totalSubmissions) return 'This form has reached its submission limit.';
  if (usage.viewsPerMonth >= plan.viewsPerMonth) return 'This form has reached its monthly view limit.';
  return null;
}

// Strip owner-only settings before sending a definition to the public.
function publicDefinition(def) {
  const { settings = {}, ...rest } = def;
  const { password, webhooks, notify, approvals, autoresponder, integrations, agent, ...safe } = settings;
  const { pdf, ...publicRest } = rest;
  return { ...publicRest, settings: { ...safe, approvalsEnabled: !!approvals?.enabled, agent: agent?.enabled ? { enabled: true, greeting: agent.greeting || '' } : undefined } };
}

r.get('/forms/:id', (req, res) => {
  const form = loadForm(req.params.id);
  if (!form || form.status === 'trashed') return res.status(404).json({ error: 'Form not found' });
  const owner = ownerOf(form);
  const closed = closedReason(form, owner);
  const pw = form.definition.settings?.password;
  if (pw && req.query.password !== pw) {
    return res.json({ id: form.id, title: form.title, passwordRequired: true, wrongPassword: !!req.query.password });
  }
  if (!closed && req.query.preview !== '1') {
    db.prepare('UPDATE forms SET views = views + 1 WHERE id = ?').run(form.id);
    bumpUsage(owner.id, 'views');
  }
  res.json({
    id: form.id, title: form.title, closed, definition: publicDefinition(form.definition),
    branding: planOf(owner.plan).branding, stripe: stripeEnabled(),
  });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, crypto.randomBytes(16).toString('hex')),
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

r.post('/forms/:id/upload', upload.single('file'), (req, res) => {
  const form = loadForm(req.params.id);
  const file = req.file;
  const drop = () => file && fs.rmSync(file.path, { force: true });
  if (!form || form.status !== 'enabled' || !file) { drop(); return res.status(400).json({ error: 'Upload failed' }); }
  const owner = ownerOf(form);
  const field = form.definition.fields.find((f) => f.id === req.body.field && f.type === 'file');
  if (!field) { drop(); return res.status(400).json({ error: 'Unknown upload field' }); }
  if (file.size > (Number(field.maxSizeMb) || 10) * 1024 * 1024) { drop(); return res.status(413).json({ error: `File exceeds ${field.maxSizeMb} MB.` }); }
  if (field.accept) {
    const ok = field.accept.split(',').map((x) => x.trim().toLowerCase()).some((a) => file.originalname.toLowerCase().endsWith(a) || (a.endsWith('/*') && file.mimetype.startsWith(a.slice(0, -1))));
    if (!ok) { drop(); return res.status(415).json({ error: `Allowed types: ${field.accept}` }); }
  }
  if (getUsage(owner.id).uploadBytes + file.size > planOf(owner.plan).uploadBytes) { drop(); return res.status(402).json({ error: 'The form owner has run out of upload space.' }); }
  db.prepare('INSERT INTO uploads (id, user_id, form_id, name, mime, size) VALUES (?, ?, ?, ?, ?, ?)').run(file.filename, owner.id, form.id, file.originalname, file.mimetype, file.size);
  res.json({ id: file.filename, name: file.originalname, size: file.size, mime: file.mimetype });
});

// Booked appointment slots for a date, so the form can grey them out.
r.get('/forms/:id/booked', (req, res) => {
  const form = loadForm(req.params.id);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  const fieldIds = form.definition.fields.filter((f) => f.type === 'appointment' && f.oneBookingPerSlot).map((f) => f.id);
  const booked = {};
  for (const s of db.prepare('SELECT data FROM submissions WHERE form_id = ?').all(form.id)) {
    const d = JSON.parse(s.data);
    for (const id of fieldIds) if (d[id]?.date === req.query.date) (booked[id] ||= []).push(d[id].slot);
  }
  res.json(booked);
});

r.post('/forms/:id/draft', (req, res) => {
  const form = loadForm(req.params.id);
  if (!form || !form.definition.settings?.saveAndContinue) return res.status(400).json({ error: 'Drafts are disabled' });
  const token = /^[a-f0-9]{24}$/.test(req.body?.token || '') ? req.body.token : crypto.randomBytes(12).toString('hex');
  db.prepare(`INSERT INTO drafts (token, form_id, data) VALUES (?, ?, ?)
              ON CONFLICT(token) DO UPDATE SET data = excluded.data, updated_at = datetime('now')`).run(token, form.id, JSON.stringify(req.body?.values || {}));
  res.json({ token, url: `${BASE_URL()}/f/${form.id}?draft=${token}` });
});

r.get('/drafts/:token', (req, res) => {
  const d = db.prepare('SELECT * FROM drafts WHERE token = ?').get(req.params.token);
  if (!d) return res.status(404).json({ error: 'Draft not found' });
  res.json({ formId: d.form_id, values: JSON.parse(d.data) });
});

r.post('/forms/:id/submit', async (req, res) => {
  const form = loadForm(req.params.id);
  if (!form || form.status === 'trashed') return res.status(404).json({ error: 'Form not found' });
  const owner = ownerOf(form);
  const plan = planOf(owner.plan);
  const settings = form.definition.settings || {};
  const closed = closedReason(form, owner);
  if (closed) return res.status(403).json({ error: closed });
  if (settings.password && req.body?.password !== settings.password) return res.status(403).json({ error: 'Password required' });
  if (settings.oneSubmissionPerUser && db.prepare('SELECT 1 FROM submissions WHERE form_id = ? AND ip = ?').get(form.id, req.ip)) {
    return res.status(409).json({ error: 'You have already submitted this form.' });
  }

  const input = req.body?.values || {};
  const fields = form.definition.fields;
  // Only accept keys for real input fields.
  const raw = {};
  for (const f of fields.filter(isInput)) if (input[f.id] !== undefined) raw[f.id] = input[f.id];
  for (const f of fields) if (f.type === 'hidden' && isEmpty(raw[f.id])) raw[f.id] = f.defaultValue ?? '';

  const { errors, state } = validateAll(form.definition, raw);
  if (Object.keys(errors).length) return res.status(422).json({ error: 'Please fix the highlighted fields.', errors });

  const data = {};
  for (const f of fields.filter(isInput)) {
    if (state.hidden.has(f.id) && f.type !== 'hidden') continue;
    if (f.type === 'captcha') continue;
    if (!isEmpty(state.values[f.id])) data[f.id] = state.values[f.id];
  }

  // Verify uploads belong to this form.
  for (const f of fields.filter((x) => x.type === 'file')) {
    if (!data[f.id]) continue;
    const files = (Array.isArray(data[f.id]) ? data[f.id] : [data[f.id]]).filter((x) => db.prepare('SELECT 1 FROM uploads WHERE id = ? AND form_id = ?').get(String(x.id), form.id));
    data[f.id] = files.map(({ id, name, size, mime }) => ({ id, name, size, mime }));
  }

  // Appointment double-booking guard.
  for (const f of fields.filter((x) => x.type === 'appointment' && x.oneBookingPerSlot)) {
    const v = data[f.id];
    if (!v) continue;
    const taken = db.prepare('SELECT data FROM submissions WHERE form_id = ?').all(form.id).some((s) => { const d = JSON.parse(s.data)[f.id]; return d?.date === v.date && d?.slot === v.slot; });
    if (taken) return res.status(409).json({ error: 'That time slot was just booked. Please choose another.', errors: { [f.id]: 'Slot no longer available.' } });
  }

  // Payments: recompute totals server-side from the product catalog.
  let payment = null;
  const payItems = [];
  for (const f of fields.filter((x) => x.type === 'products')) {
    const v = data[f.id];
    if (!v?.items?.length) continue;
    const catalog = Object.fromEntries((f.products || []).map((p) => [p.id, p]));
    v.items = v.items.filter((i) => catalog[i.id]).map((i) => ({ id: i.id, name: catalog[i.id].name, price: Number(catalog[i.id].price), qty: Math.max(1, Math.floor(Number(i.qty) || 1)) }));
    v.total = productTotal(f, v);
    v.currency = f.currency;
    payItems.push(...v.items);
    payment = { status: 'pending', amount: (payment?.amount || 0) + v.total, currency: f.currency, provider: stripeEnabled() ? 'stripe' : 'test' };
  }
  if (payment && payment.amount > 0) {
    if (getUsage(owner.id).paymentsPerMonth >= plan.paymentsPerMonth) return res.status(402).json({ error: 'This form has reached its payment submission limit.' });
  } else payment = null;

  const signed = fields.some((f) => f.type === 'signature' && data[f.id]);
  if (signed && getUsage(owner.id).signaturesPerMonth >= plan.signaturesPerMonth) return res.status(402).json({ error: 'This form has reached its signed document limit.' });

  if (payment?.provider === 'test') payment = { ...payment, status: 'paid', ref: `test_${crypto.randomBytes(6).toString('hex')}` };

  const { lastInsertRowid } = db.prepare('INSERT INTO submissions (form_id, data, approval, payment, signed, ip) VALUES (?, ?, ?, ?, ?, ?)').run(
    form.id, JSON.stringify(data), settings.approvals?.enabled ? 'pending' : null, payment ? JSON.stringify(payment) : null, signed ? 1 : 0, req.ip,
  );
  const sub = parseSub(db.prepare('SELECT * FROM submissions WHERE id = ?').get(lastInsertRowid));
  bumpUsage(owner.id, 'submissions');
  if (payment) bumpUsage(owner.id, 'payments');
  if (signed) bumpUsage(owner.id, 'signatures');
  if (req.body?.draftToken) db.prepare('DELETE FROM drafts WHERE token = ?').run(String(req.body.draftToken));

  const result = { id: sub.id, thankYou: state.thankYou || settings.thankYou?.message, redirect: state.redirect || settings.thankYou?.redirect || '' };

  if (payment?.provider === 'stripe') {
    try {
      const emailField = fields.find((f) => f.type === 'email');
      const session = await createCheckout({
        items: payItems, currency: payment.currency, email: emailField && data[emailField.id],
        successUrl: `${BASE_URL()}/api/public/payment/return?sub=${sub.id}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${BASE_URL()}/f/${form.id}?payment=cancelled`,
        metadata: { formId: form.id, submissionId: String(sub.id) },
      });
      db.prepare('UPDATE submissions SET payment = ? WHERE id = ?').run(JSON.stringify({ ...payment, ref: session.id }), sub.id);
      result.checkoutUrl = session.url;
    } catch (e) {
      db.prepare('DELETE FROM submissions WHERE id = ?').run(sub.id);
      return res.status(502).json({ error: `Payment could not be started: ${e.message}` });
    }
    return res.json(result); // notifications fire once payment completes
  }

  afterSubmit(form, owner, sub).catch((e) => console.error('afterSubmit', e));
  res.json(result);
});

r.get('/payment/return', async (req, res) => {
  const sub = parseSub(db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.query.sub));
  if (!sub?.payment) return res.status(404).send('Unknown submission');
  const form = loadForm(sub.form_id);
  try {
    const session = await retrieveCheckout(String(req.query.session_id));
    if (session.id === sub.payment.ref && session.payment_status === 'paid' && sub.payment.status !== 'paid') {
      const payment = { ...sub.payment, status: 'paid', paymentIntent: session.payment_intent };
      db.prepare('UPDATE submissions SET payment = ? WHERE id = ?').run(JSON.stringify(payment), sub.id);
      afterSubmit(form, ownerOf(form), { ...sub, payment }).catch((e) => console.error('afterSubmit', e));
    }
  } catch (e) {
    console.error('payment return', e);
  }
  res.redirect(`/f/${form.id}?done=${sub.id}`);
});

function approvalContext(req, res) {
  const sub = parseSub(db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.sid));
  const email = decodeURIComponent(req.params.email);
  const expected = sub && approvalToken(sub.id, email);
  if (!sub || !expected || expected.length !== req.params.token.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.params.token))) {
    res.status(403).json({ error: 'Invalid approval link' });
    return null;
  }
  return { sub, email, form: loadForm(sub.form_id) };
}

r.get('/approval/:sid/:email/:token', (req, res) => {
  const ctx = approvalContext(req, res);
  if (!ctx) return;
  const fields = ctx.form.definition.fields.filter(isInput).map(({ id, type, label, stars }) => ({ id, type, label, stars }));
  res.json({ form: { id: ctx.form.id, title: ctx.form.title }, fields, submission: { id: ctx.sub.id, data: ctx.sub.data, created_at: ctx.sub.created_at, approval: ctx.sub.approval, approval_note: ctx.sub.approval_note } });
});

r.post('/approval/:sid/:email/:token', (req, res) => {
  const ctx = approvalContext(req, res);
  if (!ctx) return;
  const { decision, note } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });
  db.prepare('UPDATE submissions SET approval = ?, approval_note = ? WHERE id = ?').run(decision, note || null, ctx.sub.id);
  notifyDecision(ctx.form, ownerOf(ctx.form), ctx.sub, decision, ctx.email, note);
  res.json({ ok: true });
});

export default r;
