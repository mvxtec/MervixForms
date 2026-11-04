// E-sign documents: upload a PDF, place fields, send to signers, collect signatures, produce a signed PDF.
import { Router } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, getUsage, bumpUsage, UPLOAD_DIR } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { planOf } from '../../shared/plans.js';
import { deliver, BASE_URL } from '../notify.js';
import { stampSignedPdf } from '../pdf.js';
import { fixUploadName } from '../files.js';

const r = Router();
const upload = multer({ storage: multer.diskStorage({ destination: UPLOAD_DIR, filename: (q, f, cb) => cb(null, crypto.randomBytes(16).toString('hex')) }), limits: { fileSize: 25 * 1024 * 1024 } });
const FIELD_TYPES = ['signature', 'initials', 'name', 'date', 'text', 'checkbox'];

const loadDoc = (id, userId) => {
  const d = db.prepare('SELECT * FROM sign_docs WHERE id = ? AND user_id = ?').get(id, userId);
  return d && { ...d, fields: JSON.parse(d.fields), signers: db.prepare('SELECT id, position, name, email, status, viewed_at, signed_at, token FROM sign_signers WHERE doc_id = ? ORDER BY position').all(d.id) };
};
const sendFile = (res, fileId, name, download) => {
  const file = path.join(UPLOAD_DIR, path.basename(fileId));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File missing' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="${name.replace(/[^\w .-]/g, '')}.pdf"`);
  fs.createReadStream(file).pipe(res);
};

r.get('/sign/docs', requireAuth, (req, res) => {
  const docs = db.prepare(`SELECT d.id, d.title, d.status, d.created_at, d.completed_at,
    (SELECT COUNT(*) FROM sign_signers s WHERE s.doc_id = d.id) signers,
    (SELECT COUNT(*) FROM sign_signers s WHERE s.doc_id = d.id AND s.status = 'signed') signed
    FROM sign_docs d WHERE d.user_id = ? ORDER BY d.created_at DESC`).all(req.ws.id);
  res.json(docs);
});

r.post('/sign/docs', requireAuth, requireRole('editor'), upload.single('file'), (req, res) => {
  const f = req.file;
  const drop = () => f && fs.rmSync(f.path, { force: true });
  if (!f) return res.status(400).json({ error: 'Choose a PDF file' });
  const head = Buffer.alloc(5);
  const fd = fs.openSync(f.path, 'r'); fs.readSync(fd, head, 0, 5, 0); fs.closeSync(fd);
  if (head.toString() !== '%PDF-') { drop(); return res.status(415).json({ error: 'Only PDF files can be signed.' }); }
  if (getUsage(req.ws.id).uploadBytes + f.size > planOf(req.ws.plan).uploadBytes) { drop(); return res.status(402).json({ error: 'Upload space exceeded for your plan.', upgrade: true }); }
  db.prepare('INSERT INTO uploads (id, user_id, form_id, name, mime, size) VALUES (?, ?, ?, ?, ?, ?)').run(f.filename, req.ws.id, 'sign', fixUploadName(f.originalname), 'application/pdf', f.size);
  const id = crypto.randomBytes(7).toString('hex');
  db.prepare('INSERT INTO sign_docs (id, user_id, title, file_id) VALUES (?, ?, ?, ?)').run(id, req.ws.id, fixUploadName(f.originalname).replace(/\.pdf$/i, ''), f.filename);
  res.json({ id });
});

r.get('/sign/docs/:id', requireAuth, (req, res) => {
  const d = loadDoc(req.params.id, req.ws.id);
  if (!d) return res.status(404).json({ error: 'Document not found' });
  res.json({ ...d, signers: d.signers.map(({ token, ...s }) => ({ ...s, link: d.status === 'sent' && s.status !== 'signed' ? `${BASE_URL()}/#/sign/${token}` : null })) });
});

r.get('/sign/docs/:id/pdf', requireAuth, (req, res) => {
  const d = loadDoc(req.params.id, req.ws.id);
  if (!d) return res.status(404).json({ error: 'Document not found' });
  const signed = req.query.signed && d.signed_file_id;
  sendFile(res, signed ? d.signed_file_id : d.file_id, `${d.title}${signed ? '-signed' : ''}`, req.query.download);
});

r.put('/sign/docs/:id', requireAuth, requireRole('editor'), (req, res) => {
  const d = loadDoc(req.params.id, req.ws.id);
  if (!d) return res.status(404).json({ error: 'Document not found' });
  if (d.status !== 'draft') return res.status(409).json({ error: 'Only drafts can be edited.' });
  const { title, message, fields = [], signers = [] } = req.body || {};
  if (!Array.isArray(signers) || signers.length > 10) return res.status(400).json({ error: 'Up to 10 signers' });
  if (!Array.isArray(fields)) return res.status(400).json({ error: 'fields must be a list' });
  const clean = fields.filter((f) => f && typeof f === 'object' && FIELD_TYPES.includes(f.type)).map((f) => ({
    id: String(f.id).slice(0, 40), type: f.type, page: Math.max(0, Math.floor(f.page)), signer: Math.max(0, Math.min(signers.length - 1, Math.floor(f.signer || 0))),
    x: +f.x, y: +f.y, w: +f.w, h: +f.h, required: f.required !== false, label: String(f.label || '').slice(0, 60),
  }));
  db.prepare('UPDATE sign_docs SET title = ?, message = ?, fields = ? WHERE id = ?').run(String(title || d.title), String(message || ''), JSON.stringify(clean), d.id);
  db.prepare('DELETE FROM sign_signers WHERE doc_id = ?').run(d.id);
  signers.forEach((s, i) => db.prepare('INSERT INTO sign_signers (doc_id, position, name, email, token) VALUES (?, ?, ?, ?, ?)').run(d.id, i, String(s.name || '').slice(0, 80), String(s.email || '').trim().toLowerCase(), crypto.randomBytes(18).toString('base64url')));
  res.json({ ok: true });
});

r.post('/sign/docs/:id/send', requireAuth, requireRole('editor'), (req, res) => {
  const d = loadDoc(req.params.id, req.ws.id);
  if (!d) return res.status(404).json({ error: 'Document not found' });
  if (d.status !== 'draft') return res.status(409).json({ error: 'Already sent.' });
  if (!d.signers.length || d.signers.some((s) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email) || !s.name)) return res.status(400).json({ error: 'Add a name and valid e-mail for every signer.' });
  for (let i = 0; i < d.signers.length; i++) if (!d.fields.some((f) => f.signer === i)) return res.status(400).json({ error: `Signer ${i + 1} has no fields to fill.` });
  const plan = planOf(req.ws.plan);
  if (getUsage(req.ws.id).signaturesPerMonth + d.signers.length > plan.signaturesPerMonth) return res.status(402).json({ error: `Your ${plan.name} plan allows ${plan.signaturesPerMonth} signed documents per month.`, upgrade: true });
  db.prepare("UPDATE sign_docs SET status = 'sent' WHERE id = ?").run(d.id);
  for (const s of d.signers) {
    deliver(req.ws.id, null, s.email, `Please sign: ${d.title}`, `Hi ${s.name},\n\n${req.user.email} sent you "${d.title}" to sign.${d.message ? `\n\n${d.message}` : ''}\n\nReview and sign: ${BASE_URL()}/#/sign/${s.token}`);
  }
  res.json({ ok: true });
});

r.post('/sign/docs/:id/void', requireAuth, requireRole('editor'), (req, res) => {
  const d = loadDoc(req.params.id, req.ws.id);
  if (!d) return res.status(404).json({ error: 'Document not found' });
  db.prepare("UPDATE sign_docs SET status = 'voided' WHERE id = ? AND status = 'sent'").run(d.id);
  res.json({ ok: true });
});

r.delete('/sign/docs/:id', requireAuth, requireRole('editor'), (req, res) => {
  const d = loadDoc(req.params.id, req.ws.id);
  if (!d) return res.status(404).json({ error: 'Document not found' });
  for (const fid of [d.file_id, d.signed_file_id].filter(Boolean)) { fs.rmSync(path.join(UPLOAD_DIR, path.basename(fid)), { force: true }); db.prepare('DELETE FROM uploads WHERE id = ?').run(fid); }
  db.prepare('DELETE FROM sign_docs WHERE id = ?').run(d.id);
  res.json({ ok: true });
});

// ---- Public signer endpoints (token = capability) ----
function signerCtx(req, res) {
  const s = db.prepare('SELECT * FROM sign_signers WHERE token = ?').get(req.params.token);
  const d = s && db.prepare('SELECT * FROM sign_docs WHERE id = ?').get(s.doc_id);
  if (!s || !d) { res.status(404).json({ error: 'This signing link is invalid.' }); return null; }
  return { s, d: { ...d, fields: JSON.parse(d.fields) } };
}

r.get('/public/sign/:token', (req, res) => {
  const ctx = signerCtx(req, res);
  if (!ctx) return;
  const { s, d } = ctx;
  if (d.status === 'voided') return res.status(410).json({ error: 'This document was voided by the sender.' });
  if (s.status === 'pending' && d.status === 'sent') db.prepare("UPDATE sign_signers SET status = 'viewed', viewed_at = datetime('now') WHERE id = ?").run(s.id);
  const owner = db.prepare('SELECT email FROM users WHERE id = ?').get(d.user_id);
  res.json({ title: d.title, message: d.message, from: owner?.email, status: d.status, signer: { name: s.name, email: s.email, status: s.status }, fields: d.fields.filter((f) => f.signer === s.position) });
});

r.get('/public/sign/:token/pdf', (req, res) => {
  const ctx = signerCtx(req, res);
  if (!ctx) return;
  const { d } = ctx;
  sendFile(res, d.status === 'completed' && d.signed_file_id ? d.signed_file_id : d.file_id, d.title, req.query.download);
});

r.post('/public/sign/:token', async (req, res) => {
  const ctx = signerCtx(req, res);
  if (!ctx) return;
  const { s, d } = ctx;
  if (d.status !== 'sent') return res.status(409).json({ error: 'This document is not open for signing.' });
  if (s.status === 'signed') return res.status(409).json({ error: 'You already signed this document.' });
  const mine = d.fields.filter((f) => f.signer === s.position);
  const values = {};
  for (const f of mine) {
    const v = req.body?.values?.[f.id];
    if (f.type === 'checkbox') values[f.id] = !!v;
    else if (f.type === 'signature' || f.type === 'initials') { if (typeof v === 'string' && v.startsWith('data:image/png;base64,') && v.length < 2_000_000) values[f.id] = v; }
    else if (v) values[f.id] = String(v).slice(0, 300);
    if (f.required && !values[f.id]) return res.status(422).json({ error: `Please complete: ${f.label || f.type}` });
  }
  if (!req.body?.consent) return res.status(422).json({ error: 'Please agree to sign electronically.' });
  db.prepare("UPDATE sign_signers SET status = 'signed', signed_at = datetime('now'), values_json = ?, ip = ? WHERE id = ?").run(JSON.stringify(values), req.ip, s.id);
  bumpUsage(d.user_id, 'signatures');

  const signers = db.prepare('SELECT * FROM sign_signers WHERE doc_id = ? ORDER BY position').all(d.id).map((x) => ({ ...x, values: x.values_json ? JSON.parse(x.values_json) : {} }));
  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(d.user_id);
  if (signers.every((x) => x.status === 'signed')) {
    const original = fs.readFileSync(path.join(UPLOAD_DIR, path.basename(d.file_id)));
    const bytes = await stampSignedPdf(original, d, d.fields, signers);
    const fileId = crypto.randomBytes(16).toString('hex');
    fs.writeFileSync(path.join(UPLOAD_DIR, fileId), bytes);
    db.prepare('INSERT INTO uploads (id, user_id, form_id, name, mime, size) VALUES (?, ?, ?, ?, ?, ?)').run(fileId, d.user_id, 'sign', `${d.title}-signed.pdf`, 'application/pdf', bytes.length);
    db.prepare("UPDATE sign_docs SET status = 'completed', signed_file_id = ?, completed_at = datetime('now') WHERE id = ?").run(fileId, d.id);
    const attachment = [{ filename: `${d.title}-signed.pdf`, content: Buffer.from(bytes), contentType: 'application/pdf' }];
    deliver(owner.id, null, owner.email, `Completed: ${d.title}`, `All signers have signed "${d.title}". The signed PDF is attached.`, attachment);
    for (const x of signers) deliver(owner.id, null, x.email, `Completed: ${d.title}`, `Everyone has signed "${d.title}". Your copy is attached, or download it: ${BASE_URL()}/#/sign/${x.token}`, attachment);
  } else {
    deliver(owner.id, null, owner.email, `${s.name} signed ${d.title}`, `${s.name} <${s.email}> signed "${d.title}". Waiting for ${signers.filter((x) => x.status !== 'signed').map((x) => x.name).join(', ')}.`);
  }
  res.json({ ok: true, completed: signers.every((x) => x.status === 'signed') });
});

export default r;
