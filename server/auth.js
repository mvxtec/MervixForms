import crypto from 'node:crypto';
import { db } from './db.js';
import { hmac, sameSig } from './secrets.js';

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

// Sessions live in the database so they can be ended: logging out ends this session, changing the
// password ends all of them. The cookie holds a random id (signed); only its hash is stored.
const sign = (id) => hmac('session', id);
const hashId = (id) => crypto.createHash('sha256').update(id).digest('hex');
const secureFlag = () => (process.env.NODE_ENV === 'production' || /^https:/i.test(process.env.BASE_URL || '') ? '; Secure' : '');

export function issueSession(res, userId) {
  const id = crypto.randomBytes(32).toString('base64url');
  db.prepare('INSERT INTO sessions (id_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hashId(id), userId, Date.now() + MAX_AGE * 1000);
  res.setHeader('Set-Cookie', `${COOKIE}=${id}.${sign(id)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secureFlag()}`);
}

export function clearSession(req, res) {
  const s = readSession(req);
  if (s) db.prepare('DELETE FROM sessions WHERE id_hash = ?').run(s.id);
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag()}`);
}

// Ends every session of a user except, optionally, the one making the request.
export function endSessions(userId, keepId) {
  db.prepare('DELETE FROM sessions WHERE user_id = ? AND id_hash != ?').run(userId, keepId || '');
}

function readSession(req) {
  const raw = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${COOKIE}=`));
  if (!raw) return null;
  const [id, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!id || !sig || !sameSig(sign(id), sig)) return null;
  const row = db.prepare('SELECT id_hash, user_id, expires_at FROM sessions WHERE id_hash = ?').get(hashId(id));
  return row && row.expires_at > Date.now() ? { id: row.id_hash, uid: row.user_id } : null;
}

const userById = (id) => db.prepare('SELECT id, email, name, plan, created_at, email_verified_at FROM users WHERE id = ?').get(id);

const WS_COOKIE = 'mf_ws';
const cookieValue = (req, name) => (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);

export function setWorkspaceCookie(res, ownerId) {
  res.append('Set-Cookie', `${WS_COOKIE}=${ownerId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}${secureFlag()}`);
}

// Workspaces a user can act in: their own, plus any team they were added to.
export function workspacesOf(user) {
  const teams = db.prepare(`SELECT u.id, u.email, u.name, u.plan, m.role FROM team_members m JOIN users u ON u.id = m.owner_id WHERE m.user_id = ?`).all(user.id);
  return [{ id: user.id, email: user.email, name: user.name, plan: user.plan, role: 'owner' }, ...teams];
}

// Accepts a session cookie or an API key (header "APIKEY: ..." or ?apiKey=...).
// Sets req.user (who is acting) and req.ws (whose workspace: id, plan, role, owner).
export function requireAuth(req, res, next) {
  const session = readSession(req);
  let uid = session?.uid;
  const key = req.get('apikey') || req.query.apiKey;
  const viaKey = !uid && key;
  if (viaKey) uid = db.prepare('SELECT user_id FROM api_keys WHERE key = ?').get(String(key))?.user_id;
  const user = uid && userById(uid);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user;
  req.sessionId = session?.id;
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
  const uid = readSession(req)?.uid;
  return uid ? userById(uid) : null;
}
