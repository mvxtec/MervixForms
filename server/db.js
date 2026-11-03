import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DATA_DIR = process.env.DATA_DIR || path.join(root, 'data');
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

export const db = new DatabaseSync(process.env.DB_FILE || path.join(DATA_DIR, 'forms.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enabled',      -- enabled | disabled | trashed
  folder TEXT NOT NULL DEFAULT '',
  favorite INTEGER NOT NULL DEFAULT 0,
  definition TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',          -- new | read
  starred INTEGER NOT NULL DEFAULT 0,
  approval TEXT,                               -- pending | approved | rejected
  approval_note TEXT,
  payment TEXT,                                -- JSON {status, amount, currency, provider, ref}
  signed INTEGER NOT NULL DEFAULT 0,
  ip TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sub_form ON submissions(form_id, created_at);
CREATE TABLE IF NOT EXISTS drafts (
  token TEXT PRIMARY KEY,
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  data TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS usage (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  submissions INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  payments INTEGER NOT NULL DEFAULT 0,
  signatures INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  form_id TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS api_keys (
  key TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  form_id TEXT,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS webhook_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL,
  url TEXT NOT NULL,
  status INTEGER,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS form_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  definition TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS team_members (
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor',          -- admin | editor | viewer
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (owner_id, user_id)
);
CREATE TABLE IF NOT EXISTS team_invites (
  token TEXT PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sign_docs (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_id TEXT NOT NULL,
  fields TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft',         -- draft | sent | completed | voided
  message TEXT NOT NULL DEFAULT '',
  signed_file_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE TABLE IF NOT EXISTS sign_signers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT NOT NULL REFERENCES sign_docs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',       -- pending | viewed | signed
  values_json TEXT,
  ip TEXT,
  viewed_at TEXT,
  signed_at TEXT
);
CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'app',             -- app | store
  title TEXT NOT NULL,
  definition TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enabled',
  views INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  items TEXT NOT NULL,
  customer TEXT NOT NULL,
  total REAL NOT NULL,
  currency TEXT NOT NULL,
  payment TEXT,
  status TEXT NOT NULL DEFAULT 'new',           -- new | fulfilled | cancelled
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

// Additive column migrations for databases created by earlier versions.
const addColumn = (table, col, ddl) => {
  if (!db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
};
addColumn('outbox', 'status', "status TEXT NOT NULL DEFAULT 'stored'"); // stored | sent | failed
addColumn('outbox', 'error', 'error TEXT');
addColumn('outbox', 'attachments', 'attachments TEXT');

// Users who sign in with Google / Microsoft: provider + subject id.
addColumn('users', 'oauth', 'oauth TEXT');

// Workflows: a tree of steps run after each submission (see server/workflows.js).
db.exec(`
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  form_id TEXT REFERENCES forms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'enabled',       -- enabled | disabled
  definition TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS workflow_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id TEXT NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  submission_id INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,                   -- public tracking-page token
  status TEXT NOT NULL DEFAULT 'running',       -- running | waiting | completed | cancelled | failed
  label TEXT NOT NULL DEFAULT 'In Progress',    -- shown on the tracking page (Set Status step)
  cursor TEXT NOT NULL DEFAULT '[0]',           -- path to the current step
  vars TEXT NOT NULL DEFAULT '{}',              -- outputs of earlier steps
  log TEXT NOT NULL DEFAULT '[]',
  resume_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_runs_wait ON workflow_runs(status, resume_at);
CREATE TABLE IF NOT EXISTS workflow_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  kind TEXT NOT NULL,                           -- approval | task
  assignee TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',       -- pending | approved | rejected | done | skipped
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at TEXT
);
`);

export const month = () => new Date().toISOString().slice(0, 7);

export function bumpUsage(userId, col, by = 1) {
  if (!['submissions', 'views', 'payments', 'signatures'].includes(col)) throw new Error('bad usage column');
  db.prepare(`INSERT INTO usage (user_id, month, ${col}) VALUES (?, ?, ?)
              ON CONFLICT(user_id, month) DO UPDATE SET ${col} = ${col} + excluded.${col}`).run(userId, month(), by);
}

export function getUsage(userId) {
  const row = db.prepare('SELECT * FROM usage WHERE user_id = ? AND month = ?').get(userId, month()) || {};
  const forms = db.prepare("SELECT COUNT(*) n FROM forms WHERE user_id = ? AND status != 'trashed'").get(userId).n;
  const total = db.prepare('SELECT COUNT(*) n FROM submissions s JOIN forms f ON f.id = s.form_id WHERE f.user_id = ?').get(userId).n;
  const bytes = db.prepare('SELECT COALESCE(SUM(size), 0) n FROM uploads WHERE user_id = ?').get(userId).n;
  return {
    forms, totalSubmissions: total, uploadBytes: bytes,
    submissionsPerMonth: row.submissions || 0, viewsPerMonth: row.views || 0,
    paymentsPerMonth: row.payments || 0, signaturesPerMonth: row.signatures || 0,
  };
}

export const parseForm = (row) => row && ({ ...row, favorite: !!row.favorite, definition: JSON.parse(row.definition) });
export const parseSub = (row) => row && ({
  ...row, starred: !!row.starred, signed: !!row.signed, data: JSON.parse(row.data), payment: row.payment ? JSON.parse(row.payment) : null,
});

// Stars on the unified workspace list.
for (const t of ['workflows', 'apps', 'sign_docs']) addColumn(t, 'favorite', 'favorite INTEGER NOT NULL DEFAULT 0');

// Sequential Unique ID widget numbers; never reused after a submission is deleted.
db.exec(`CREATE TABLE IF NOT EXISTS form_counters (form_id TEXT NOT NULL, field_id TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (form_id, field_id))`);
