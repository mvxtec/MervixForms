// "My Workspace": one list of every asset (forms, workflows, apps & stores, sign documents) plus the
// sidebar's Assigned Tasks. Favourites for non-form assets live in a `favorite` column on each table.
import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';

const r = Router();
r.use(['/workspace/items', '/tasks/assigned'], requireAuth);

const TABLES = { workflow: 'workflows', app: 'apps', sign: 'sign_docs' };

r.get('/workspace/items', (req, res) => {
  const { view = 'all', q = '', sort = 'activity', label = '' } = req.query;
  const uid = req.ws.id;
  const items = [];
  const formStatus = view === 'trash' ? "f.status = 'trashed'" : view === 'archive' ? "f.status = 'archived'" : "f.status NOT IN ('trashed', 'archived')";
  if (['all', 'favorites', 'trash', 'archive', 'forms', 'label'].includes(view)) {
    for (const f of db.prepare(`SELECT f.id, f.title, f.status, f.folder, f.favorite, f.updated_at, f.created_at, (SELECT COUNT(*) FROM submissions s WHERE s.form_id = f.id) subs,
      (SELECT COUNT(*) FROM submissions s WHERE s.form_id = f.id AND s.status = 'new') unread FROM forms f WHERE f.user_id = ? AND ${formStatus}${view === 'label' ? ' AND f.folder = ?' : ''}`).all(...(view === 'label' ? [uid, String(label)] : [uid]))) {
      items.push({ type: 'form', id: f.id, title: f.title, status: f.status, folder: f.folder, favorite: !!f.favorite, updated_at: f.updated_at, created_at: f.created_at, meta: `${f.subs} submission${f.subs === 1 ? '' : 's'}${f.unread ? ` · ${f.unread} new` : ''}`, href: `#/forms/${f.id}/build` });
    }
  }
  if (['all', 'favorites', 'workflows'].includes(view)) {
    for (const w of db.prepare('SELECT w.id, w.title, w.status, w.favorite, w.updated_at, w.created_at, f.title form_title FROM workflows w LEFT JOIN forms f ON f.id = w.form_id WHERE w.user_id = ?').all(uid)) {
      items.push({ type: 'workflow', id: w.id, title: w.title, status: w.status, favorite: !!w.favorite, updated_at: w.updated_at, created_at: w.created_at, meta: w.form_title ? `Runs on ${w.form_title}` : 'Workflow', href: `#/workflows/${w.id}/build` });
    }
  }
  if (['all', 'favorites', 'apps'].includes(view)) {
    for (const a of db.prepare('SELECT id, kind, title, status, favorite, updated_at, created_at FROM apps WHERE user_id = ?').all(uid)) {
      items.push({ type: a.kind === 'store' ? 'store' : 'app', id: a.id, title: a.title, status: a.status, favorite: !!a.favorite, updated_at: a.updated_at, created_at: a.created_at, meta: a.kind === 'store' ? 'Store' : 'App', href: `#/apps/${a.id}` });
    }
  }
  if (['all', 'favorites', 'sign'].includes(view)) {
    for (const d of db.prepare('SELECT id, title, status, favorite, created_at, completed_at FROM sign_docs WHERE user_id = ?').all(uid)) {
      items.push({ type: 'sign', id: d.id, title: d.title, status: d.status, favorite: !!d.favorite, updated_at: d.completed_at || d.created_at, created_at: d.created_at, meta: `Sign document · ${d.status}`, href: `#/sign-docs/${d.id}` });
    }
  }
  let out = view === 'favorites' ? items.filter((i) => i.favorite) : items;
  if (q) out = out.filter((i) => i.title.toLowerCase().includes(String(q).toLowerCase()));
  const key = { title: (a, b) => a.title.localeCompare(b.title), created: (a, b) => b.created_at.localeCompare(a.created_at) }[sort] || ((a, b) => b.updated_at.localeCompare(a.updated_at));
  const labels = db.prepare("SELECT DISTINCT folder FROM forms WHERE user_id = ? AND folder != '' AND status != 'trashed' ORDER BY folder").all(uid).map((x) => x.folder);
  res.json({ items: out.sort(key), labels });
});

// Star / unstar workflows, apps and sign documents (forms use PATCH /forms/:id).
r.patch('/workspace/items/:type/:id', requireAuth, requireRole('editor'), (req, res) => {
  const table = TABLES[req.params.type === 'store' ? 'app' : req.params.type];
  if (!table) return res.status(400).json({ error: 'Unknown item type' });
  const { changes } = db.prepare(`UPDATE ${table} SET favorite = ? WHERE id = ? AND user_id = ?`).run(req.body?.favorite ? 1 : 0, req.params.id, req.ws.id);
  if (!changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

// Workflow approvals and tasks waiting on the signed-in person.
r.get('/tasks/assigned', (req, res) => {
  const rows = db.prepare(`SELECT t.kind, t.token, t.created_at, w.title workflow, f.title form, r.submission_id
    FROM workflow_tasks t JOIN workflow_runs r ON r.id = t.run_id JOIN workflows w ON w.id = r.workflow_id LEFT JOIN forms f ON f.id = w.form_id
    WHERE lower(t.assignee) = lower(?) AND t.status = 'pending' AND r.status = 'waiting' ORDER BY t.id DESC LIMIT 200`).all(req.user.email);
  res.json(rows);
});

export default r;
