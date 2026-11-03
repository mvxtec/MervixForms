import crypto from 'node:crypto';
import { db } from './db.js';

const SECRET = process.env.SESSION_SECRET || 'dev-secret-change-me';
const COOKIE = 'mf_session';
const MAX_AGE = 30 * 24 * 3600;

export function hashPassword(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 64).toString('hex')}`;
}

export function verifyPassword(pw, stored) {
  const [salt, hash] = stored.split(':');
  const test = crypto.scryptSync(pw, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, 'hex'));
}

const sign = (payload) => crypto.createHmac('sha256', SECRET).update(payload).digest('base64url');

export function issueSession(res, userId) {
  const payload = Buffer.from(JSON.stringify({ uid: userId, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  res.setHeader('Set-Cookie', `${COOKIE}=${payload}.${sign(payload)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}`);
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

function readCookie(req) {
  const raw = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [payload, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  return data.exp > Date.now() ? data.uid : null;
}

const userById = (id) => db.prepare('SELECT id, email, name, plan, created_at FROM users WHERE id = ?').get(id);

const WS_COOKIE = 'mf_ws';
const cookieValue = (req, name) => (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

export function setWorkspaceCookie(res, ownerId) {
  res.append('Set-Cookie', `${WS_COOKIE}=${ownerId}; Path=/; SameSite=Lax; Max-Age=${MAX_AGE}`);
}

// Workspaces a user can act in: their own, plus any team they were added to.
export function workspacesOf(user) {
  const teams = db.prepare(`SELECT u.id, u.email, u.name, u.plan, m.role FROM team_members m JOIN users u ON u.id = m.owner_id WHERE m.user_id = ?`).all(user.id);
  return [{ id: user.id, email: user.email, name: user.name, plan: user.plan, role: 'owner' }, ...teams];
}

// Accepts a session cookie or an API key (header "APIKEY: ..." or ?apiKey=...).
// Sets req.user (who is acting) and req.ws (whose workspace: id, plan, role, owner).
export function requireAuth(req, res, next) {
  let uid = readCookie(req);
  const key = req.get('apikey') || req.query.apiKey;
  const viaKey = !uid && key;
  if (viaKey) uid = db.prepare('SELECT user_id FROM api_keys WHERE key = ?').get(String(key))?.user_id;
  const user = uid && userById(uid);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  const wanted = Number(viaKey ? req.get('x-workspace') : cookieValue(req, WS_COOKIE)) || user.id;
  const ws = workspacesOf(user).find((w) => w.id === wanted) || workspacesOf(user)[0];
  req.ws = { ...ws, owner: userById(ws.id) };
  next();
}

export const ROLE_RANK = { viewer: 1, editor: 2, admin: 3, owner: 4 };

// Blocks writes for workspace roles below `min` (GET/HEAD always pass).
export const requireRole = (min) => (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  if ((ROLE_RANK[req.ws?.role] || 0) < ROLE_RANK[min]) return res.status(403).json({ error: `Your role (${req.ws?.role}) cannot make changes here.` });
  next();
};

export function optionalUser(req) {
  const uid = readCookie(req);
  return uid ? userById(uid) : null;
}
