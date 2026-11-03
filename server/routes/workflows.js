// Workflows API: owner CRUD + runs, and the public no-login pages (task decisions, tracking page).
import { Router } from 'express';
import crypto from 'node:crypto';
import { db, parseForm, parseSub } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { parseWorkflow, decideTask, resumeRun, startRun, getStep } from '../workflows.js';
import { formatValue, isInput } from '../../shared/fields.js';

const r = Router();
const newId = () => (Date.now().toString(36) + crypto.randomBytes(4).toString('hex')).slice(-14);

// ── Public ──
r.get('/public/wf-task/:token', (req, res) => {
  const task = db.prepare('SELECT * FROM workflow_tasks WHERE token = ?').get(req.params.token);
  if (!task) return res.status(404).json({ error: 'This link is not valid.' });
  const run = db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(task.run_id);
  const wf = parseWorkflow(db.prepare('SELECT * FROM workflows WHERE id = ?').get(run.workflow_id));
  const sub = parseSub(db.prepare('SELECT * FROM submissions WHERE id = ?').get(run.submission_id));
  const form = parseForm(db.prepare('SELECT * FROM forms WHERE id = ?').get(sub.form_id));
  const step = (function find(steps) { for (const s of steps || []) { if (s.id === task.node_id) return s; for (const b of s.branches || []) { const x = find(b.steps); if (x) return x; } } return null; })(wf.definition.steps);
  res.json({
    kind: task.kind, status: task.status, assignee: task.assignee, note: task.note,
    title: step?.title || (task.kind === 'approval' ? 'Approval request' : 'Task'), message: step?.message || step?.details || '',
    workflow: wf.title, form: form.title, submissionId: sub.id, createdAt: sub.created_at,
    answers: form.definition.fields.filter((f) => isInput(f) && !['hidden', 'captcha'].includes(f.type)).map((f) => ({ label: f.label, value: formatValue(f, sub.data[f.id]) })),
  });
});

r.post('/public/wf-task/:token', async (req, res) => {
  const err = await decideTask(req.params.token, String(req.body?.decision || ''), String(req.body?.note || '').slice(0, 2000));
  if (err) return res.status(400).json({ error: err });
  res.json({ ok: true });
});

r.get('/public/track/:token', (req, res) => {
  const run = db.prepare('SELECT * FROM workflow_runs WHERE token = ?').get(req.params.token);
  if (!run) return res.status(404).json({ error: 'Tracking link not found.' });
  const wf = parseWorkflow(db.prepare('SELECT * FROM workflows WHERE id = ?').get(run.workflow_id));
  const log = JSON.parse(run.log);
  const tracking = wf.definition.tracking || {};
  // Respondents see milestones, not internal notes.
  const milestones = [{ label: 'Flow started', at: run.created_at }];
  for (const e of log) if (e.type === 'setStatus') milestones.push({ label: e.note.replace(/^Status: /, ''), at: e.at });
  if (run.status === 'completed') milestones.push({ label: 'Completed', at: run.updated_at });
  res.json({ title: tracking.title || wf.title, message: tracking.message || 'Track the status and follow each step as it progresses.', label: run.label, status: run.status, milestones, color: tracking.color || '#0f766e' });
});

// ── Owner ──
r.use('/workflows', requireAuth, requireRole('editor'));
const own = (req, res) => {
  const wf = parseWorkflow(db.prepare('SELECT * FROM workflows WHERE id = ? AND user_id = ?').get(req.params.id, req.ws.id));
  if (!wf) res.status(404).json({ error: 'Workflow not found' });
  return wf;
};
const counts = db.prepare("SELECT COUNT(*) total, SUM(status IN ('running','waiting')) active FROM workflow_runs WHERE workflow_id = ?");

r.get('/workflows', (req, res) => {
  const rows = req.query.formId
    ? db.prepare('SELECT w.*, f.title form_title FROM workflows w LEFT JOIN forms f ON f.id = w.form_id WHERE w.user_id = ? AND w.form_id = ? ORDER BY w.updated_at DESC').all(req.ws.id, req.query.formId)
    : db.prepare('SELECT w.*, f.title form_title FROM workflows w LEFT JOIN forms f ON f.id = w.form_id WHERE w.user_id = ? ORDER BY w.updated_at DESC').all(req.ws.id);
  res.json(rows.map((w) => { const p = parseWorkflow(w); const c = counts.get(w.id); return { id: p.id, title: p.title, status: p.status, form_id: p.form_id, form_title: p.form_title, steps: (p.definition.steps || []).length, runs: c.total, active: c.active || 0, updated_at: p.updated_at }; }));
});

r.post('/workflows', (req, res) => {
  const { formId, title, steps = [] } = req.body || {};
  if (!formId || !db.prepare('SELECT 1 FROM forms WHERE id = ? AND user_id = ?').get(formId, req.ws.id)) return res.status(400).json({ error: 'Choose a form for this workflow' });
  const id = newId();
  const definition = { steps, trigger: 'submission', settings: { restartOnEdit: false }, tracking: {} };
  db.prepare('INSERT INTO workflows (id, user_id, form_id, title, definition) VALUES (?, ?, ?, ?, ?)').run(id, req.ws.id, formId, String(title || 'Untitled workflow').slice(0, 120), JSON.stringify(definition));
  res.json({ id });
});

r.get('/workflows/:id', (req, res) => {
  const wf = own(req, res);
  if (!wf) return;
  const form = parseForm(db.prepare('SELECT * FROM forms WHERE id = ?').get(wf.form_id));
  res.json({ ...wf, form: form && { id: form.id, title: form.title, fields: form.definition.fields, settings: { emails: form.definition.settings?.emails } } });
});

r.put('/workflows/:id', (req, res) => {
  const wf = own(req, res);
  if (!wf) return;
  const { title, status, definition } = req.body || {};
  db.prepare("UPDATE workflows SET title = ?, status = ?, definition = ?, updated_at = datetime('now') WHERE id = ?").run(
    String(title ?? wf.title).slice(0, 120), status === 'disabled' ? 'disabled' : status === 'enabled' ? 'enabled' : wf.status, JSON.stringify(definition || wf.definition), wf.id,
  );
  res.json({ ok: true });
});

r.delete('/workflows/:id', (req, res) => {
  const wf = own(req, res);
  if (!wf) return;
  db.prepare('DELETE FROM workflows WHERE id = ?').run(wf.id);
  res.json({ ok: true });
});

r.get('/workflows/:id/runs', (req, res) => {
  const wf = own(req, res);
  if (!wf) return;
  const runs = db.prepare('SELECT * FROM workflow_runs WHERE workflow_id = ? ORDER BY id DESC LIMIT 100').all(wf.id).map((x) => {
    const step = getStep(wf.definition.steps || [], JSON.parse(x.cursor));
    return { id: x.id, submission_id: x.submission_id, status: x.status, label: x.label, token: x.token, current: step?.type || null, resume_at: x.resume_at, log: JSON.parse(x.log), created_at: x.created_at, updated_at: x.updated_at };
  });
  res.json(runs);
});

r.post('/workflows/:id/runs/:rid/:action', async (req, res) => {
  const wf = own(req, res);
  if (!wf) return;
  const run = db.prepare('SELECT * FROM workflow_runs WHERE id = ? AND workflow_id = ?').get(req.params.rid, wf.id);
  if (!run) return res.status(404).json({ error: 'Run not found' });
  if (req.params.action === 'cancel') db.prepare("UPDATE workflow_runs SET status = 'cancelled' WHERE id = ?").run(run.id);
  else if (req.params.action === 'resume') await resumeRun(run.id);
  else if (req.params.action === 'restart') {
    db.prepare("UPDATE workflow_runs SET status = 'cancelled' WHERE id = ? AND status IN ('running', 'waiting')").run(run.id);
    const sub = parseSub(db.prepare('SELECT * FROM submissions WHERE id = ?').get(run.submission_id));
    await startRun(wf, sub);
  } else return res.status(400).json({ error: 'Unknown action' });
  res.json({ ok: true });
});

// Run a workflow now against a submission (handy for testing a new flow).
r.post('/workflows/:id/test', async (req, res) => {
  const wf = own(req, res);
  if (!wf) return;
  const sub = parseSub(db.prepare('SELECT * FROM submissions WHERE form_id = ? ORDER BY id DESC LIMIT 1').get(wf.form_id));
  if (!sub) return res.status(400).json({ error: 'This form has no submissions yet. Submit the form once, then test.' });
  const runId = await startRun(wf, sub);
  res.json({ ok: true, runId });
});

export default r;
