// Server signing keys. Production refuses to start without a strong SESSION_SECRET; development generates
// one and keeps it in DATA_DIR so sessions survive restarts. Each purpose (sessions, approval links,
// captcha, e-mail verification) gets its own derived key, so one leaked token type can't forge another.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR } from './db.js';

const KNOWN_DEFAULTS = new Set(['change-me', 'changeme', 'dev-secret-change-me', 'secret', 'session-secret']);
export const isStrongSecret = (s) => typeof s === 'string' && s.length >= 32 && !KNOWN_DEFAULTS.has(s);

function loadMaster() {
  const configured = process.env.SESSION_SECRET || '';
  if (isStrongSecret(configured)) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be set to at least 32 random characters in production (e.g. `openssl rand -hex 32`).');
  }
  const file = path.join(DATA_DIR, '.session-secret');
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString('hex'), { mode: 0o600 });
  if (configured) console.warn('SESSION_SECRET is too short or a known default; using a generated secret from DATA_DIR instead.');
  return fs.readFileSync(file, 'utf8').trim();
}

const MASTER = loadMaster();
const keys = new Map();
export function keyFor(purpose) {
  if (!keys.has(purpose)) keys.set(purpose, crypto.createHmac('sha256', MASTER).update(`wpforms:${purpose}`).digest());
  return keys.get(purpose);
}
export const hmac = (purpose, data) => crypto.createHmac('sha256', keyFor(purpose)).update(data).digest('base64url');

// Constant-time comparison for base64url signatures.
export function sameSig(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
