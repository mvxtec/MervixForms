import { Router } from 'express';
import crypto from 'node:crypto';
import { db, getUsage } from '../db.js';
import { hashPassword, verifyPassword, issueSession, clearSession, requireAuth, requireRole, workspacesOf, setWorkspaceCookie } from '../auth.js';
import { deliver, BASE_URL, emailEnabled } from '../notify.js';
import { PLANS, planOf, serializePlan } from '../../shared/plans.js';
import { stripeEnabled } from '../payments.js';

const r = Router();

r.post('/auth/register', (req, res) => {
  const { email, password, name } = req.body || {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return res.status(400).json({ error: 'Enter a valid e-mail.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (typeof email !== 'string') return res.status(400).json({ error: 'Enter a valid e-mail.' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase())) return res.status(409).json({ error: 'An account with this e-mail already exists.' });
  const { lastInsertRowid } = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(email.toLowerCase(), name || '', hashPassword(password));
  issueSession(res, Number(lastInsertRowid));
  acceptInvites(Number(lastInsertRowid), email.toLowerCase());
  res.json({ ok: true });
});

// Invites addressed to this e-mail turn into memberships automatically.
function acceptInvites(userId, email) {
  for (const inv of db.prepare('SELECT * FROM team_invites WHERE email = ?').all(email)) {
    if (inv.owner_id !== userId) db.prepare('INSERT OR IGNORE INTO team_members (owner_id, user_id, role) VALUES (?, ?, ?)').run(inv.owner_id, userId, inv.role);
    db.prepare('DELETE FROM team_invites WHERE token = ?').run(inv.token);
  }
}

r.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(String(email || '').toLowerCase());
  if (!u || !verifyPassword(String(password || ''), u.password_hash)) return res.status(401).json({ error: 'Incorrect e-mail or password.' });
  issueSession(res, u.id);
  acceptInvites(u.id, u.email);
  res.json({ ok: true });
});

r.post('/auth/logout', (req, res) => { clearSession(res); res.json({ ok: true }); });

r.get('/me', requireAuth, (req, res) => {
  res.json({
    user: req.user,
    workspace: { id: req.ws.id, email: req.ws.email, name: req.ws.name, role: req.ws.role },
    workspaces: workspacesOf(req.user).map(({ id, email, name, role }) => ({ id, email, name, role })),
    plan: { key: req.ws.plan, ...serializePlan(planOf(req.ws.plan)) },
    ownPlan: req.user.plan,
    usage: getUsage(req.ws.id),
    plans: Object.fromEntries(Object.entries(PLANS).map(([k, p]) => [k, serializePlan(p)])),
    stripe: stripeEnabled(),
    email: emailEnabled(),
    ai: !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),
  });
});

r.post('/workspace', requireAuth, (req, res) => {
  const ws = workspacesOf(req.user).find((w) => w.id === Number(req.body?.id));
  if (!ws) return res.status(404).json({ error: 'Workspace not found' });
  setWorkspaceCookie(res, ws.id);
  res.json({ ok: true });
});

// Team management for the active workspace (admins and the owner).
r.get('/team', requireAuth, (req, res) => {
  const members = db.prepare('SELECT u.id, u.email, u.name, m.role, m.created_at FROM team_members m JOIN users u ON u.id = m.user_id WHERE m.owner_id = ? ORDER BY m.created_at').all(req.ws.id);
  const invites = db.prepare('SELECT token, email, role, created_at FROM team_invites WHERE owner_id = ? ORDER BY created_at').all(req.ws.id);
  res.json({ owner: { id: req.ws.owner.id, email: req.ws.owner.email, name: req.ws.owner.name }, members, invites, multiUser: planOf(req.ws.plan).multiUser });
});

r.post('/team/invite', requireAuth, requireRole('admin'), (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = ['admin', 'editor', 'viewer'].includes(req.body?.role) ? req.body.role : 'editor';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid e-mail.' });
  if (!planOf(req.ws.plan).multiUser) return res.status(402).json({ error: 'Team members require the Enterprise plan.', upgrade: true });
  if (email === req.ws.owner.email) return res.status(400).json({ error: 'That is the workspace owner.' });
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    db.prepare('INSERT INTO team_members (owner_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT(owner_id, user_id) DO UPDATE SET role = excluded.role').run(req.ws.id, existing.id, role);
    deliver(req.ws.id, null, email, `You were added to ${req.ws.owner.email}'s workspace`, `${req.user.email} added you as ${role}. Switch workspaces from the top bar: ${BASE_URL()}`);
    return res.json({ ok: true, added: true });
  }
  const token = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO team_invites (token, owner_id, email, role) VALUES (?, ?, ?, ?)').run(token, req.ws.id, email, role);
  deliver(req.ws.id, null, email, `Invitation to join ${req.ws.owner.email}'s workspace`, `${req.user.email} invited you as ${role}. Create an account with this e-mail to join: ${BASE_URL()}`);
  res.json({ ok: true, invited: true });
});

r.patch('/team/members/:uid', requireAuth, requireRole('admin'), (req, res) => {
  const role = ['admin', 'editor', 'viewer'].includes(req.body?.role) ? req.body.role : null;
  if (!role) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE team_members SET role = ? WHERE owner_id = ? AND user_id = ?').run(role, req.ws.id, req.params.uid);
  res.json({ ok: true });
});

r.delete('/team/members/:uid', requireAuth, (req, res) => {
  const self = Number(req.params.uid) === req.user.id; // members may leave on their own
  if (!self && !['admin', 'owner'].includes(req.ws.role)) return res.status(403).json({ error: 'Only admins can remove members.' });
  db.prepare('DELETE FROM team_members WHERE owner_id = ? AND user_id = ?').run(req.ws.id, req.params.uid);
  if (self) setWorkspaceCookie(res, req.user.id);
  res.json({ ok: true });
});

r.delete('/team/invites/:token', requireAuth, requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM team_invites WHERE token = ? AND owner_id = ?').run(req.params.token, req.ws.id);
  res.json({ ok: true });
});

r.patch('/me', requireAuth, (req, res) => {
  const { name, password, currentPassword } = req.body || {};
  if (name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name), req.user.id);
  if (password) {
    const u = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
    if (!verifyPassword(String(currentPassword || ''), u.password_hash)) return res.status(400).json({ error: 'Current password is incorrect.' });
    if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), req.user.id);
  }
  res.json({ ok: true });
});

// Self-hosted: plan changes are immediate. Hook a billing provider in here if you resell plans.
r.post('/me/plan', requireAuth, (req, res) => {
  const { plan } = req.body || {};
  if (!PLANS[plan]) return res.status(400).json({ error: 'Unknown plan' });
  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, req.user.id);
  res.json({ ok: true });
});

r.delete('/me', requireAuth, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  clearSession(res);
  res.json({ ok: true });
});

r.get('/keys', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT key, label, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id));
});
r.post('/keys', requireAuth, (req, res) => {
  const key = crypto.randomBytes(20).toString('hex');
  db.prepare('INSERT INTO api_keys (key, user_id, label) VALUES (?, ?, ?)').run(key, req.user.id, String(req.body?.label || 'API key'));
  res.json({ key });
});
r.delete('/keys/:key', requireAuth, (req, res) => {
  db.prepare('DELETE FROM api_keys WHERE key = ? AND user_id = ?').run(req.params.key, req.user.id);
  res.json({ ok: true });
});

r.get('/outbox', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT o.id, o.recipient, o.subject, o.body, o.status, o.error, o.created_at, o.attachments IS NOT NULL has_attachment, f.title form_title FROM outbox o LEFT JOIN forms f ON f.id = o.form_id WHERE o.user_id = ? ORDER BY o.id DESC LIMIT 200').all(req.ws.id));
});

export default r;
