import { Router } from 'express';
import crypto from 'node:crypto';
import { db, parseForm, getUsage } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { planOf } from '../../shared/plans.js';
import { TEMPLATES, blankForm, BASE_SETTINGS } from '../templates.js';
import { sendTestEmail, testIntegration } from '../notify.js';
import { findUnsafeUrl } from '../../shared/urls.js';

const r = Router();
r.use(['/forms', '/templates'], requireAuth, requireRole('editor'));

// A form definition must be an object whose fields are objects with an id and a type.
export function badDefinition(def) {
  if (!def || typeof def !== 'object' || Array.isArray(def)) return 'The form definition must be an object.';
  if (def.fields !== undefined && !Array.isArray(def.fields)) return 'fields must be a list.';
  const ids = new Set();
  for (const f of def.fields || []) {
    if (!f || typeof f !== 'object' || typeof f.id !== 'string' || typeof f.type !== 'string') return 'Every field needs an id and a type.';
    if (ids.has(f.id)) return `Duplicate field id "${f.id}".`;
    ids.add(f.id);
  }
  if (def.settings !== undefined && (typeof def.settings !== 'object' || Array.isArray(def.settings))) return 'settings must be an object.';
  const currencies = new Set((def.fields || []).filter((f) => ['products', 'donation', 'subscription'].includes(f.type)).map((f) => f.currency || 'USD'));
  if (currencies.size > 1) return `payment fields use different currencies (${[...currencies].join(', ')}); use one currency for the whole form.`;
  const unsafe = findUnsafeUrl(def);
  if (unsafe) return `the link in ${unsafe} must start with https://, http://, mailto: or tel:.`;
  return null;
}

const newId = () => (Date.now().toString(36) + crypto.randomBytes(4).toString('hex')).slice(-14);

export function ownForm(req, res) {
  const f = parseForm(db.prepare('SELECT * FROM forms WHERE id = ? AND user_id = ?').get(req.params.id, req.ws.id));
  if (!f) res.status(404).json({ error: 'Form not found' });
  return f;
}

function checkFormQuota(req, res) {
  const plan = planOf(req.ws.plan);
  if (getUsage(req.ws.id).forms >= plan.forms) {
    res.status(402).json({ error: `Your ${plan.name} plan allows ${plan.forms} forms. Upgrade to create more.`, upgrade: true });
    return false;
  }
  return true;
}

function checkFieldLimit(req, res, def) {
  const plan = planOf(req.ws.plan);
  if ((def.fields || []).length <= plan.fieldsPerForm) return true;
  res.status(402).json({ error: `Your ${plan.name} plan allows ${plan.fieldsPerForm} fields per form.`, upgrade: true });
  return false;
}

function insertForm(userId, def, folder = '') {
  const id = newId();
  def.settings = { ...structuredClone(BASE_SETTINGS), ...def.settings };
  db.prepare('INSERT INTO forms (id, user_id, title, definition, folder) VALUES (?, ?, ?, ?, ?)').run(id, userId, def.title, JSON.stringify(def), folder);
  db.prepare("INSERT INTO form_versions (form_id, definition, label) VALUES (?, ?, 'Created')").run(id, JSON.stringify(def));
  return id;
}

r.get('/templates', (req, res) => res.json(TEMPLATES.map(({ definition, ...t }) => ({ ...t, fieldCount: definition.fields.length, layout: definition.layout, primary: definition.theme.primary }))));

r.get('/forms', (req, res) => {
  const { status = 'active', q = '', folder } = req.query;
  let sql = `SELECT f.id, f.title, f.status, f.folder, f.favorite, f.views, f.created_at, f.updated_at,
             (SELECT COUNT(*) FROM submissions s WHERE s.form_id = f.id) submissions,
             (SELECT COUNT(*) FROM submissions s WHERE s.form_id = f.id AND s.status = 'new') unread,
             (SELECT MAX(created_at) FROM submissions s WHERE s.form_id = f.id) last_submission
             FROM forms f WHERE f.user_id = ?`;
  const args = [req.ws.id];
  if (status === 'trashed') sql += " AND f.status = 'trashed'";
  else if (status === 'favorites') sql += " AND f.status != 'trashed' AND f.favorite = 1";
  else if (status === 'archived') sql += " AND f.status = 'archived'";
  else sql += " AND f.status NOT IN ('trashed', 'archived')";
  if (folder) { sql += ' AND f.folder = ?'; args.push(folder); }
  if (q) { sql += ' AND f.title LIKE ?'; args.push(`%${q}%`); }
  sql += ' ORDER BY f.updated_at DESC';
  const forms = db.prepare(sql).all(...args).map((f) => ({ ...f, favorite: !!f.favorite }));
  const folders = db.prepare("SELECT DISTINCT folder FROM forms WHERE user_id = ? AND folder != '' AND status != 'trashed' ORDER BY folder").all(req.ws.id).map((x) => x.folder);
  res.json({ forms, folders });
});

r.post('/forms', (req, res) => {
  if (!checkFormQuota(req, res)) return;
  const { title, templateId, definition, folder } = req.body || {};
  let def;
  if (definition) { // import JSON
    const bad = badDefinition(definition);
    if (bad) return res.status(400).json({ error: `This JSON is not a valid form: ${bad}` });
    def = { ...blankForm(String(definition.title || title || 'Imported form')), ...definition };
  }
  else if (templateId) {
    const t = TEMPLATES.find((x) => x.id === templateId);
    if (!t) return res.status(404).json({ error: 'Template not found' });
    def = structuredClone(t.definition);
  } else def = blankForm(title || 'Untitled Form');
  if (title) def.title = title;
  if (!checkFieldLimit(req, res, def)) return;
  res.json({ id: insertForm(req.ws.id, def, folder || '') });
});

r.get('/forms/:id', (req, res) => {
  const f = ownForm(req, res);
  if (f) res.json(f);
});

r.put('/forms/:id', (req, res) => {
  const f = ownForm(req, res);
  if (!f) return;
  const def = req.body?.definition;
  const bad = badDefinition(def) || (!Array.isArray(def?.fields) && 'fields must be a list.');
  if (bad) return res.status(400).json({ error: `Invalid form definition: ${bad}` });
  const plan = planOf(req.ws.plan);
  if (def.fields.length > plan.fieldsPerForm) return res.status(402).json({ error: `Your ${plan.name} plan allows ${plan.fieldsPerForm} fields per form.`, upgrade: true });
  db.prepare("UPDATE forms SET definition = ?, title = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(def), def.title || f.title, f.id);
  saveVersion(f.id, def, req.user.email, req.body?.versionLabel);
  res.json({ ok: true, updated_at: new Date().toISOString() });
});

// Autosave fires often; keep at most one snapshot per 5 minutes unless the save is labelled.
function saveVersion(formId, def, author, label = '') {
  const last = db.prepare("SELECT id, label, created_at >= datetime('now', '-5 minutes') recent FROM form_versions WHERE form_id = ? ORDER BY id DESC LIMIT 1").get(formId);
  if (last?.recent && !last.label && !label) db.prepare('UPDATE form_versions SET definition = ?, author = ? WHERE id = ?').run(JSON.stringify(def), author, last.id);
  else db.prepare('INSERT INTO form_versions (form_id, definition, label, author) VALUES (?, ?, ?, ?)').run(formId, JSON.stringify(def), label, author);
  db.prepare('DELETE FROM form_versions WHERE form_id = ? AND id NOT IN (SELECT id FROM form_versions WHERE form_id = ? ORDER BY id DESC LIMIT 100)').run(formId, formId);
}

r.get('/forms/:id/versions', (req, res) => {
  const f = ownForm(req, res);
  if (!f) return;
  const rows = db.prepare('SELECT id, label, author, created_at, definition FROM form_versions WHERE form_id = ? ORDER BY id DESC').all(f.id);
  res.json(rows.map(({ definition, ...v }) => {
    const d = JSON.parse(definition);
    return { ...v, title: d.title, fieldCount: d.fields.length, ruleCount: (d.logic || []).length };
  }));
});

r.get('/forms/:id/versions/:vid', (req, res) => {
  const f = ownForm(req, res);
  if (!f) return;
  const v = db.prepare('SELECT * FROM form_versions WHERE id = ? AND form_id = ?').get(req.params.vid, f.id);
  if (!v) return res.status(404).json({ error: 'Version not found' });
  res.json({ ...v, definition: JSON.parse(v.definition) });
});

r.post('/forms/:id/versions/:vid/restore', (req, res) => {
  const f = ownForm(req, res);
  if (!f) return;
  const v = db.prepare('SELECT * FROM form_versions WHERE id = ? AND form_id = ?').get(req.params.vid, f.id);
  if (!v) return res.status(404).json({ error: 'Version not found' });
  saveVersion(f.id, f.definition, req.user.email, `Before restoring version #${v.id}`);
  db.prepare("UPDATE forms SET definition = ?, title = ?, updated_at = datetime('now') WHERE id = ?").run(v.definition, JSON.parse(v.definition).title || f.title, f.id);
  saveVersion(f.id, JSON.parse(v.definition), req.user.email, `Restored version #${v.id}`);
  res.json({ ok: true });
});

r.patch('/forms/:id', (req, res) => {
  const f = ownForm(req, res);
  if (!f) return;
  const { status, favorite, folder, title } = req.body || {};
  if (status !== undefined && !['enabled', 'disabled', 'trashed', 'archived'].includes(status)) return res.status(400).json({ error: 'Unknown status' });
  if (title !== undefined && (typeof title !== 'string' || !title.trim())) return res.status(400).json({ error: 'Title must be text' });
  if (folder !== undefined && folder !== null && typeof folder !== 'string') return res.status(400).json({ error: 'Label must be text' });
  if (status) {
    if (f.status === 'trashed' && status !== 'trashed' && !checkFormQuota(req, res)) return;
    db.prepare('UPDATE forms SET status = ? WHERE id = ?').run(status, f.id);
  }
  if (favorite !== undefined) db.prepare('UPDATE forms SET favorite = ? WHERE id = ?').run(favorite ? 1 : 0, f.id);
  if (folder !== undefined) db.prepare('UPDATE forms SET folder = ? WHERE id = ?').run((folder || '').trim().slice(0, 60), f.id);
  if (title) {
    f.definition.title = title.trim().slice(0, 200);
    db.prepare("UPDATE forms SET title = ?, definition = ?, updated_at = datetime('now') WHERE id = ?").run(f.definition.title, JSON.stringify(f.definition), f.id);
  }
  res.json({ ok: true });
});

r.delete('/forms/:id', (req, res) => {
  const f = ownForm(req, res);
  if (!f) return;
  db.prepare('DELETE FROM forms WHERE id = ?').run(f.id); // permanent; trash uses PATCH status
  res.json({ ok: true });
});

r.post('/forms/:id/clone', (req, res) => {
  const f = ownForm(req, res);
  if (!f || !checkFormQuota(req, res)) return;
  const def = structuredClone(f.definition);
  def.title = `Clone of ${f.title}`;
  if (!checkFieldLimit(req, res, def)) return;
  res.json({ id: insertForm(req.ws.id, def, f.folder) });
});

// Settings → Emails → "Test Email": sends the e-mail being edited to the signed-in user with sample answers.
r.post('/forms/:id/test-email', async (req, res) => {
  const f = ownForm(req, res);
  if (!f) return;
  const email = req.body?.email;
  if (!email || typeof email !== 'object') return res.status(400).json({ error: 'No e-mail to test' });
  const form = { ...f, definition: req.body?.definition || f.definition };
  await sendTestEmail(form, { id: req.ws.id, email: req.user.email }, email);
  res.json({ ok: true, to: req.user.email });
});

r.post('/forms/:id/test-integration', async (req, res) => {
  const f = ownForm(req, res);
  if (!f) return;
  res.json(await testIntegration(f, String(req.body?.kind || 'webhook'), String(req.body?.url || '')));
});

r.get('/forms/:id/webhooks', (req, res) => {
  const f = ownForm(req, res);
  if (f) res.json(db.prepare('SELECT * FROM webhook_log WHERE form_id = ? ORDER BY id DESC LIMIT 50').all(f.id));
});

export default r;
