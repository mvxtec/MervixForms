// Creates (or resets) a local admin account from ADMIN_EMAIL / ADMIN_PASSWORD in .env,
// on the Enterprise plan so every feature is unlocked. Local testing only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const { db } = await import('./db.js');
const { hashPassword } = await import('./auth.js');

const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD || '';
if (!email || password.length < 8) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) in .env first.');
  process.exit(1);
}

const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
if (existing) {
  db.prepare("UPDATE users SET password_hash = ?, plan = 'enterprise', email_verified_at = COALESCE(email_verified_at, datetime('now')) WHERE id = ?").run(hashPassword(password), existing.id);
  console.log(`Updated admin ${email} (Enterprise plan).`);
} else {
  db.prepare("INSERT INTO users (email, name, password_hash, plan, email_verified_at) VALUES (?, 'Admin', ?, 'enterprise', datetime('now'))").run(email, hashPassword(password));
  console.log(`Created admin ${email} (Enterprise plan).`);
}
