import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { db, parseSub, parseForm, UPLOAD_DIR } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { ownForm } from './forms.js';
import { formatValue, isInput, isEmpty } from '../../shared/fields.js';
import { notifyDecision } from '../notify.js';
import { submissionPdf } from '../pdf.js';
import { restartOnEdit } from '../workflows.js';

const r = Router();
r.use(requireAuth, requireRole('editor'));

function ownSub(req, res) {
  const row = db.prepare('SELECT s.* FROM submissions s JOIN forms f ON f.id = s.form_id WHERE s.id = ? AND f.user_id = ?').get(req.params.sid, req.ws.id);
  if (!row) { res.status(404).json({ error: 'Submission not found' }); return null; }
  return parseSub(row);
}

function filtered(form, query) {
  const { q = '', status, starred, approval, from, to, sort = 'desc' } = query;
  let sql = 'SELECT * FROM submissions WHERE form_id = ?';
  const args = [form.id];
  if (status) { sql += ' AND status = ?'; args.push(status); }
  if (starred === '1') sql += ' AND starred = 1';
  if (approval) { sql += ' AND approval = ?'; args.push(approval); }
  if (from) { sql += ' AND created_at >= ?'; args.push(from); }
  if (to) { sql += ' AND created_at <= ?'; args.push(`${to} 23:59:59`); }
  if (q) { sql += ' AND data LIKE ?'; args.push(`%${q}%`); }
  sql += ` ORDER BY id ${sort === 'asc' ? 'ASC' : 'DESC'}`;
  return db.prepare(sql).all(...args).map(parseSub);
}

r.get('/forms/:id/submissions', (req, res) => {
  const form = ownForm(req, res);
  if (!form) return;
  const all = filtered(form, req.query);
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const offset = Number(req.query.offset) || 0;
  res.json({ total: all.length, submissions: all.slice(offset, offset + limit) });
});

r.get('/forms/:id/submissions.csv', (req, res) => {
  const form = ownForm(req, res);
  if (!form) return;
  const fields = form.definition.fields.filter(isInput);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Submission ID', 'Submitted At', ...fields.map((f) => f.label), 'Payment', 'Approval'];
  const lines = filtered(form, req.query).map((s) => [
    s.id, s.created_at, ...fields.map((f) => formatValue(f, s.data[f.id])),
    s.payment ? `${s.payment.status} ${s.payment.currency} ${s.payment.amount}` : '', s.approval || '',
  ].map(esc).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${form.title.replace(/[^\w -]/g, '')}.csv"`);
  res.send('﻿' + [head.map(esc).join(','), ...lines].join('\r\n'));
});

// Aggregates for the report builder.
r.get('/forms/:id/report', (req, res) => {
  const form = ownForm(req, res);
  if (!form) return;
  const subs = filtered(form, req.query);
  const byDay = {};
  for (const s of subs) { const d = s.created_at.slice(0, 10); byDay[d] = (byDay[d] || 0) + 1; }
  const fields = form.definition.fields.filter(isInput).map((f) => {
    const vals = subs.map((s) => s.data[f.id]).filter((v) => !isEmpty(v));
    const out = { id: f.id, type: f.type, label: f.label, answered: vals.length };
    const count = (list) => { const c = {}; for (const v of list) c[v] = (c[v] || 0) + 1; return c; };
    if (['dropdown', 'radio', 'yesno', 'scale', 'rating'].includes(f.type)) {
      out.counts = count(vals.map(String));
      if (f.type === 'radio' || f.type === 'dropdown') for (const o of f.options || []) out.counts[o] ??= 0;
    } else if (f.type === 'checkbox') out.counts = count(vals.flat());
    else if (f.type === 'matrix') {
      out.matrix = {};
      for (const row of f.rows || []) out.matrix[row] = count(vals.map((v) => v[row]).filter(Boolean));
    } else if (['number', 'slider', 'calculation'].includes(f.type)) {
      const nums = vals.map(Number).filter(Number.isFinite);
      if (nums.length) out.stats = { min: Math.min(...nums), max: Math.max(...nums), avg: nums.reduce((a, b) => a + b, 0) / nums.length, sum: nums.reduce((a, b) => a + b, 0) };
    } else if (f.type === 'products') {
      const c = {};
      let revenue = 0;
      for (const v of vals) { revenue += Number(v.total || 0); for (const i of v.items || []) c[i.name] = (c[i.name] || 0) + Number(i.qty || 1); }
      out.counts = c; out.revenue = revenue; out.currency = f.currency;
    } else out.samples = vals.slice(0, 8).map((v) => formatValue(f, v));
    if (f.type === 'rating' || f.type === 'scale') {
      const nums = vals.map(Number);
      out.stats = { avg: nums.reduce((a, b) => a + b, 0) / (nums.length || 1) };
    }
    return out;
  });
  const paid = subs.filter((s) => s.payment?.status === 'paid');
  res.json({
    total: subs.length, views: form.views, conversion: form.views ? subs.length / form.views : 0, byDay, fields,
    revenue: paid.reduce((a, s) => a + Number(s.payment.amount || 0), 0),
    approvals: { pending: subs.filter((s) => s.approval === 'pending').length, approved: subs.filter((s) => s.approval === 'approved').length, rejected: subs.filter((s) => s.approval === 'rejected').length },
  });
});

r.get('/submissions/:sid', (req, res) => {
  const s = ownSub(req, res);
  if (!s) return;
  if (s.status === 'new') db.prepare("UPDATE submissions SET status = 'read' WHERE id = ?").run(s.id);
  res.json(s);
});

r.patch('/submissions/:sid', (req, res) => {
  const s = ownSub(req, res);
  if (!s) return;
  const { status, starred, data } = req.body || {};
  if (status) db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(status === 'new' ? 'new' : 'read', s.id);
  if (starred !== undefined) db.prepare('UPDATE submissions SET starred = ? WHERE id = ?').run(starred ? 1 : 0, s.id);
  if (data && typeof data === 'object') {
    db.prepare("UPDATE submissions SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify({ ...s.data, ...data }), s.id);
    const form = parseForm(db.prepare('SELECT * FROM forms WHERE id = ?').get(s.form_id));
    restartOnEdit(form, { ...s, data: { ...s.data, ...data } }).catch((e) => console.error('workflow restart', e));
  }
  res.json({ ok: true });
});

r.get('/submissions/:sid/pdf', async (req, res) => {
  const s = ownSub(req, res);
  if (!s) return;
  const form = parseForm(db.prepare('SELECT * FROM forms WHERE id = ?').get(s.form_id));
  const bytes = await submissionPdf(form, s);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${form.title.replace(/[^\w -]/g, '')}-${s.id}.pdf"`);
  res.send(Buffer.from(bytes));
});

r.post('/submissions/:sid/decision', (req, res) => {
  const s = ownSub(req, res);
  if (!s) return;
  const { decision, note } = req.body || {};
  if (!['approved', 'rejected', 'pending'].includes(decision)) return res.status(400).json({ error: 'Invalid decision' });
  db.prepare('UPDATE submissions SET approval = ?, approval_note = ? WHERE id = ?').run(decision, note || null, s.id);
  const form = parseForm(db.prepare('SELECT * FROM forms WHERE id = ?').get(s.form_id));
  if (decision !== 'pending') notifyDecision(form, req.ws.owner, s, decision, req.user.email, note);
  res.json({ ok: true });
});

r.post('/submissions/bulk', (req, res) => {
  const { ids = [], action } = req.body || {};
  const own = db.prepare('SELECT s.id FROM submissions s JOIN forms f ON f.id = s.form_id WHERE s.id = ? AND f.user_id = ?');
  for (const id of ids) {
    if (!own.get(id, req.ws.id)) continue;
    if (action === 'delete') db.prepare('DELETE FROM submissions WHERE id = ?').run(id);
    if (action === 'read' || action === 'new') db.prepare('UPDATE submissions SET status = ? WHERE id = ?').run(action, id);
    if (action === 'star' || action === 'unstar') db.prepare('UPDATE submissions SET starred = ? WHERE id = ?').run(action === 'star' ? 1 : 0, id);
  }
  res.json({ ok: true });
});

r.delete('/submissions/:sid', (req, res) => {
  const s = ownSub(req, res);
  if (!s) return;
  db.prepare('DELETE FROM submissions WHERE id = ?').run(s.id);
  res.json({ ok: true });
});

r.get('/files/:fid', (req, res) => {
  const up = db.prepare('SELECT * FROM uploads WHERE id = ? AND user_id = ?').get(req.params.fid, req.ws.id);
  const file = up && path.join(UPLOAD_DIR, path.basename(up.id));
  if (!up || !fs.existsSync(file)) return res.status(404).json({ error: 'File not found' });
  res.setHeader('Content-Type', up.mime || 'application/octet-stream');
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${up.name.replace(/"/g, '')}"`);
  fs.createReadStream(file).pipe(res);
});

export default r;
