import { Router } from 'express';
import crypto from 'node:crypto';
import { db, getUsage } from '../db.js';
import { hashPassword, verifyPassword, issueSession, clearSession, endSessions, requireAuth, requireRole, workspacesOf, setWorkspaceCookie } from '../auth.js';
import { deliver, BASE_URL, emailEnabled } from '../notify.js';
import { PLANS, planOf, serializePlan } from '../../shared/plans.js';
import { stripeEnabled } from '../payments.js';
import { hmac, sameSig } from '../secrets.js';
import { limit, loginLocked, recordLoginFailure, clearLoginFailures, lockedResponse } from '../ratelimit.js';

const r = Router();

// E-mail verification: a signed, expiring link proves the person owns the address. Team invites and
// workflow tasks addressed to an e-mail are only honoured once it is verified.
const VERIFY_MS = 3 * 24 * 3600 * 1000;
const verifySig = (id, email, exp) => hmac('verify', `${id}.${email}.${exp}`);
export function sendVerification(user) {
  const exp = Date.now() + VERIFY_MS;
  const url = `${BASE_URL()}/#/verify/${user.id}.${exp}.${verifySig(user.id, user.email, exp)}`;
  deliver(user.id, null, user.email, 'Confirm your e-mail address',
    `Confirm that ${user.email} is your address to finish setting up your account:\n\n${url}\n\nThe link works for 3 days. If you didn't sign up, ignore this e-mail.`);
}

// Plan changes are made by the operator until billing is connected (SUPER_ADMIN_EMAILS, plus ADMIN_EMAIL).
const superAdmins = () => new Set([...String(process.env.SUPER_ADMIN_EMAILS || '').split(','), process.env.ADMIN_EMAIL || ''].map((e) => e.trim().toLowerCase()).filter(Boolean));
export const isSuperAdmin = (email) => superAdmins().has(String(email || '').toLowerCase());

const registerLimit = limit({ name: 'register', max: 10, windowMs: 60 * 60 * 1000, message: 'Too many sign-ups from this network. Try again later.' });
const loginLimit = limit({ name: 'login', max: 30, windowMs: 15 * 60 * 1000, message: 'Too many sign-in attempts. Please wait a few minutes.' });

r.post('/auth/register', registerLimit, (req, res) => {
  const { email, password, name } = req.body || {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '')) return res.status(400).json({ error: 'Enter a valid e-mail.' });
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  if (typeof email !== 'string') return res.status(400).json({ error: 'Enter a valid e-mail.' });
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.toLowerCase())) return res.status(409).json({ error: 'An account with this e-mail already exists.' });
  const { lastInsertRowid } = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)').run(email.toLowerCase(), name || '', hashPassword(password));
  issueSession(res, Number(lastInsertRowid));
  sendVerification({ id: Number(lastInsertRowid), email: email.toLowerCase() });
  res.json({ ok: true });
});

// Invites addressed to this e-mail turn into memberships once the address is verified.
function acceptInvites(userId, email) {
  for (const inv of db.prepare('SELECT * FROM team_invites WHERE email = ?').all(email)) {
    if (inv.owner_id !== userId) db.prepare('INSERT OR IGNORE INTO team_members (owner_id, user_id, role) VALUES (?, ?, ?)').run(inv.owner_id, userId, inv.role);
    db.prepare('DELETE FROM team_invites WHERE token = ?').run(inv.token);
  }
}

r.post('/auth/login', loginLimit, (req, res) => {
  const { email, password } = req.body || {};
  const addr = String(email || '').toLowerCase();
  const locked = loginLocked(addr);
  if (locked) return lockedResponse(res, locked);
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(addr);
  if (!u || !verifyPassword(String(password || ''), u.password_hash)) {
    recordLoginFailure(addr);
    return res.status(401).json({ error: 'Incorrect e-mail or password.' });
  }
  clearLoginFailures(addr);
  issueSession(res, u.id);
  if (u.email_verified_at) acceptInvites(u.id, u.email);
  res.json({ ok: true });
});

const verifyLimit = limit({ name: 'verify', max: 20, windowMs: 15 * 60 * 1000 });
r.post('/auth/verify', verifyLimit, (req, res) => {
  const [id, exp, sig] = String(req.body?.token || '').split('.');
  const u = /^\d+$/.test(id || '') && db.prepare('SELECT id, email, email_verified_at FROM users WHERE id = ?').get(Number(id));
  if (!u || !sameSig(sig, verifySig(u.id, u.email, exp))) return res.status(400).json({ error: 'This confirmation link is not valid. Request a new one from your account.' });
  if (Number(exp) < Date.now()) return res.status(410).json({ error: 'This confirmation link has expired. Request a new one from your account.' });
  if (!u.email_verified_at) db.prepare("UPDATE users SET email_verified_at = datetime('now') WHERE id = ?").run(u.id);
  acceptInvites(u.id, u.email);
  res.json({ ok: true, email: u.email });
});

// Password reset. The link is signed over the current password hash, so it works once and stops working
// as soon as the password changes. The response is the same whether or not the address has an account.
const RESET_MS = 60 * 60 * 1000;
const resetSig = (u, exp) => hmac('reset', `${u.id}.${u.password_hash}.${exp}`);
const forgotLimit = limit({ name: 'forgot', max: 5, windowMs: 15 * 60 * 1000, message: 'Too many reset requests. Please wait 15 minutes.' });
r.post('/auth/forgot', forgotLimit, (req, res) => {
  const u = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(String(req.body?.email || '').trim().toLowerCase());
  if (u) {
    const exp = Date.now() + RESET_MS;
    const url = `${BASE_URL()}/#/reset/${u.id}.${exp}.${resetSig(u, exp)}`;
    deliver(u.id, null, u.email, 'Reset your password',
      `Someone asked to reset the password for ${u.email}. To choose a new password, open:\n\n${url}\n\nThe link works for 1 hour and only once. If it wasn't you, ignore this e-mail; your password stays the same.`);
  }
  res.json({ ok: true });
});
r.post('/auth/reset', forgotLimit, (req, res) => {
  const [id, exp, sig] = String(req.body?.token || '').split('.');
  const u = /^\d+$/.test(id || '') && db.prepare('SELECT id, email, password_hash FROM users WHERE id = ?').get(Number(id));
  if (!u || !sameSig(sig, resetSig(u, exp))) return res.status(400).json({ error: 'This reset link is not valid or was already used. Request a new one.' });
  if (Number(exp) < Date.now()) return res.status(410).json({ error: 'This reset link has expired. Request a new one.' });
  const { password } = req.body || {};
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  // Opening the e-mailed link also proves the person owns the address.
  db.prepare("UPDATE users SET password_hash = ?, email_verified_at = COALESCE(email_verified_at, datetime('now')) WHERE id = ?").run(hashPassword(password), u.id);
  endSessions(u.id);
  clearLoginFailures(u.email);
  res.json({ ok: true });
});

const resendLimit = limit({ name: 'verify-resend', max: 5, windowMs: 60 * 60 * 1000, key: (req) => req.user.id, message: 'You can request 5 confirmation e-mails an hour.' });
r.post('/auth/verify/resend', requireAuth, resendLimit, (req, res) => {
  if (!req.user.email_verified_at) sendVerification(req.user);
  res.json({ ok: true, alreadyVerified: !!req.user.email_verified_at });
});

r.post('/auth/logout', (req, res) => { clearSession(req, res); res.json({ ok: true }); });

r.get('/me', requireAuth, (req, res) => {
  res.json({
    user: { id: req.user.id, email: req.user.email, name: req.user.name, plan: req.user.plan, created_at: req.user.created_at, emailVerified: !!req.user.email_verified_at },
    canChangePlan: isSuperAdmin(req.user.email),
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
  // Only an account that has proved it owns the address joins straight away; otherwise the invite waits.
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND email_verified_at IS NOT NULL').get(email);
  if (existing) {
    db.prepare('INSERT INTO team_members (owner_id, user_id, role) VALUES (?, ?, ?) ON CONFLICT(owner_id, user_id) DO UPDATE SET role = excluded.role').run(req.ws.id, existing.id, role);
    deliver(req.ws.id, null, email, `You were added to ${req.ws.owner.email}'s workspace`, `${req.user.email} added you as ${role}. Switch workspaces from the top bar: ${BASE_URL()}`);
    return res.json({ ok: true, added: true });
  }
  const token = crypto.randomBytes(16).toString('hex');
  db.prepare('DELETE FROM team_invites WHERE owner_id = ? AND email = ?').run(req.ws.id, email); // re-invite replaces
  db.prepare('INSERT INTO team_invites (token, owner_id, email, role) VALUES (?, ?, ?, ?)').run(token, req.ws.id, email, role);
  deliver(req.ws.id, null, email, `Invitation to join ${req.ws.owner.email}'s workspace`, `${req.user.email} invited you as ${role}. Sign up or log in with this e-mail and confirm it to join: ${BASE_URL()}/#/signup`);
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
    endSessions(req.user.id, req.sessionId); // other devices must sign in with the new password
  }
  res.json({ ok: true });
});

// Until billing is connected, only the operator can change plans. Hook a billing webhook in here to sell plans.
r.post('/me/plan', requireAuth, (req, res) => {
  if (!isSuperAdmin(req.user.email)) return res.status(403).json({ error: 'Plan changes are handled by your administrator.' });
  const { plan } = req.body || {};
  if (typeof plan !== 'string' || !Object.hasOwn(PLANS, plan)) return res.status(400).json({ error: 'Unknown plan' });
  db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, req.user.id);
  res.json({ ok: true });
});

r.delete('/me', requireAuth, (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  clearSession(req, res);
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
