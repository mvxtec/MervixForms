// Regression tests for the Critical and High defects in reports/Product QA UX and engineering review.md (D1–D8).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-sec-'));
process.env.DATA_DIR = tmp;
delete process.env.SESSION_SECRET; // development: a secret is generated into DATA_DIR
delete process.env.SMTP_HOST;
process.env.SUPER_ADMIN_EMAILS = 'operator@x.io';
const { app } = await import('../index.js');
const { db } = await import('../db.js');
const { resetLimits } = await import('../ratelimit.js');
const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let server, base;
before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
beforeEach(() => resetLimits());

// Each "browser" keeps its own session cookie.
function browser() {
  let cookie = '';
  const call = async (method, url, body, { form, headers = {} } = {}) => {
    const r = await fetch(base + url, {
      method, headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), cookie, ...headers },
      body: form || (body === undefined ? undefined : JSON.stringify(body)),
    });
    const set = r.headers.get('set-cookie');
    if (set?.startsWith('mf_session=')) cookie = set.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, headers: r.headers, body: ct.includes('json') ? await r.json() : await r.text() };
  };
  call.cookie = () => cookie;
  return call;
}
async function confirmEmail(b) {
  const mail = (await b('GET', '/api/outbox')).body.find((m) => m.subject === 'Confirm your e-mail address');
  const token = mail.body.match(/#\/verify\/(\S+)/)[1];
  assert.equal((await b('POST', '/api/auth/verify', { token })).status, 200);
}
async function newForm(b, fields, settings = {}) {
  const { id } = (await b('POST', '/api/forms', { title: 'Sec' })).body;
  const def = (await b('GET', `/api/forms/${id}`)).body.definition;
  const r = await b('PUT', `/api/forms/${id}`, { definition: { ...def, fields, settings: { ...def.settings, ...settings } } });
  return { id, def, put: r };
}

test('D1: the old default secret no longer forges sessions; production refuses weak secrets', async () => {
  const owner = browser();
  await owner('POST', '/api/auth/register', { email: 'victim@x.io', password: 'password1' });
  const uid = db.prepare('SELECT id FROM users WHERE email = ?').get('victim@x.io').id;
  const payload = Buffer.from(JSON.stringify({ uid, exp: Date.now() + 3600e3 })).toString('base64url');
  const sig = crypto.createHmac('sha256', 'dev-secret-change-me').update(payload).digest('base64url');
  const r = await fetch(`${base}/api/me`, { headers: { cookie: `mf_session=${payload}.${sig}` } });
  assert.equal(r.status, 401);

  // Development without a secret: one is generated into DATA_DIR and reused.
  const devDir = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-dev-'));
  const dev = spawnSync(process.execPath, ['-e', "import('./secrets.js')"], { cwd: serverDir, timeout: 20000, encoding: 'utf8', env: { ...process.env, NODE_ENV: 'development', SESSION_SECRET: '', DATA_DIR: devDir } });
  assert.equal(dev.status, 0, dev.stderr);
  assert.ok(fs.readFileSync(path.join(devDir, '.session-secret'), 'utf8').length >= 64);

  for (const secret of ['', 'change-me', 'short']) {
    const run = spawnSync(process.execPath, ['-e', "import('./secrets.js')"], {
      cwd: serverDir, timeout: 20000, encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production', SESSION_SECRET: secret, DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'forms-prod-')) },
    });
    assert.notEqual(run.status, 0, `production must not start with SESSION_SECRET="${secret}"`);
    assert.match(run.stderr, /SESSION_SECRET must be set/);
  }
});

test('D2: uploads are typed by content, never rendered as HTML, and keep UTF-8 names', async () => {
  const owner = browser();
  await owner('POST', '/api/auth/register', { email: 'files@x.io', password: 'password1' });
  const { id } = await newForm(owner, [{ id: 'doc', type: 'file', label: 'Doc' }]);
  const upload = async (content, type, name) => {
    const fd = new FormData();
    fd.append('field', 'doc');
    fd.append('file', new Blob([content], { type }), name);
    return (await fetch(`${base}/api/public/forms/${id}/upload`, { method: 'POST', body: fd })).json();
  };
  const html = await upload('<script>fetch("/api/keys",{method:"POST"})</script>', 'text/html', 'आवेदन पत्र.html');
  const png = await upload(Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), 'text/html', 'photo.png');
  assert.equal(html.name, 'आवेदन पत्र.html');
  assert.equal(html.mime, 'application/octet-stream');
  assert.equal(png.mime, 'image/png');
  await fetch(`${base}/api/public/forms/${id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: { doc: [html, png] } }) });

  const h = await owner('GET', `/api/files/${html.id}`);
  assert.equal(h.headers.get('content-type'), 'application/octet-stream');
  assert.match(h.headers.get('content-disposition'), /^attachment;/);
  assert.match(h.headers.get('content-disposition'), /filename\*=UTF-8''%E0%A4%86/);
  assert.equal(h.headers.get('x-content-type-options'), 'nosniff');
  assert.match(h.headers.get('content-security-policy'), /sandbox/);
  const p = await owner('GET', `/api/files/${png.id}`);
  assert.equal(p.headers.get('content-type'), 'image/png');
  assert.match(p.headers.get('content-disposition'), /^inline;/);

  // An "image/*" rule checks the bytes, not the type the uploader claimed.
  await newForm(owner, [{ id: 'doc', type: 'file', label: 'Doc', accept: 'image/*' }]).then(async ({ id: fid }) => {
    const fd = new FormData();
    fd.append('field', 'doc');
    fd.append('file', new Blob(['<svg onload=alert(1)>'], { type: 'image/svg+xml' }), 'x.html');
    assert.equal((await fetch(`${base}/api/public/forms/${fid}/upload`, { method: 'POST', body: fd })).status, 415);
  });
});

test('D3: redirects and condition links must be http(s); stored script links are never returned', async () => {
  const owner = browser();
  await owner('POST', '/api/auth/register', { email: 'redir@x.io', password: 'password1' });
  const fields = [{ id: 'n', type: 'text', label: 'Name' }];
  for (const bad of ['javascript:alert(1)', ' JaVaScRiPt:alert(1)', 'java\tscript:alert(1)', 'data:text/html,<script>alert(1)</script>']) {
    assert.equal((await newForm(owner, fields, { thankYou: { mode: 'redirect', redirect: bad } })).put.status, 400, bad);
  }
  const { id, def } = await newForm(owner, fields, { thankYou: { mode: 'redirect', redirect: 'https://example.org/thanks' } });
  const rule = { id: 'r1', conditions: [{ field: 'n', op: 'equals', value: 'x' }], actions: [{ type: 'redirect', value: 'javascript:alert(1)' }] };
  assert.equal((await owner('PUT', `/api/forms/${id}`, { definition: { ...def, fields, logic: [rule] } })).status, 400);

  // Older data saved before the check: the server drops the unsafe redirect instead of returning it.
  const stored = JSON.parse(db.prepare('SELECT definition FROM forms WHERE id = ?').get(id).definition);
  stored.settings.thankYou.redirect = 'javascript:alert(1)';
  db.prepare('UPDATE forms SET definition = ? WHERE id = ?').run(JSON.stringify(stored), id);
  const sub = await fetch(`${base}/api/public/forms/${id}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ values: { n: 'y' } }) }).then((r) => r.json());
  assert.equal(sub.redirect, '');
});

test('D4: app and store buttons cannot link to script URLs', async () => {
  const owner = browser();
  await owner('POST', '/api/auth/register', { email: 'apps@x.io', password: 'password1' });
  const { id } = (await owner('POST', '/api/apps', { kind: 'app', title: 'A' })).body;
  const def = (await owner('GET', `/api/apps/${id}`)).body.definition;
  const save = (url) => owner('PUT', `/api/apps/${id}`, { definition: { ...def, elements: [{ id: 'b', type: 'button', label: 'Go', url }] } });
  assert.equal((await save('javascript:alert(document.cookie)')).status, 400);
  assert.equal((await save('vbscript:msgbox(1)')).status, 400);
  assert.equal((await save('https://example.org')).status, 200);
});

test('D5 and D6: unconfirmed addresses get no tasks and no team seats; confirmation links cannot be forged', async () => {
  const operator = browser(), attacker = browser(), real = browser();
  await operator('POST', '/api/auth/register', { email: 'operator@x.io', password: 'password1' });
  await operator('POST', '/api/me/plan', { plan: 'enterprise' });
  assert.equal((await operator('POST', '/api/team/invite', { email: 'newhire@x.io', role: 'admin' })).body.invited, true);

  // Someone registers the invited address first. Without confirming it they get nothing.
  await attacker('POST', '/api/auth/register', { email: 'newhire@x.io', password: 'password1' });
  assert.equal((await attacker('GET', '/api/me')).body.workspaces.length, 1);
  assert.equal((await attacker('GET', '/api/me')).body.user.emailVerified, false);
  assert.equal((await attacker('GET', '/api/tasks/assigned')).status, 403);
  const uid = db.prepare('SELECT id FROM users WHERE email = ?').get('newhire@x.io').id;
  const exp = Date.now() + 3600e3;
  for (const token of [`${uid}.${exp}.forged`, `${uid}.${exp}.${crypto.createHmac('sha256', 'dev-secret-change-me').update(`${uid}.newhire@x.io.${exp}`).digest('base64url')}`]) {
    assert.equal((await attacker('POST', '/api/auth/verify', { token })).status, 400);
  }
  assert.equal((await attacker('GET', '/api/me')).body.workspaces.length, 1);

  // The person who really owns the mailbox confirms with the e-mailed link and joins.
  await real('POST', '/api/auth/register', { email: 'owner2@x.io', password: 'password1' });
  await confirmEmail(real);
  assert.equal((await real('GET', '/api/tasks/assigned')).status, 200);
  await confirmEmail(attacker); // stands in for the mailbox owner opening the link
  assert.ok((await attacker('GET', '/api/me')).body.workspaces.some((w) => w.email === 'operator@x.io'));
});

test('D7: only the operator can change plans; prototype keys are rejected', async () => {
  const user = browser(), operator = browser();
  await user('POST', '/api/auth/register', { email: 'plain@x.io', password: 'password1' });
  assert.equal((await user('POST', '/api/me/plan', { plan: 'enterprise' })).status, 403);
  assert.equal((await user('GET', '/api/me')).body.plan.key, 'starter');
  assert.equal((await user('GET', '/api/me')).body.canChangePlan, false);
  await operator('POST', '/api/auth/login', { email: 'operator@x.io', password: 'password1' });
  for (const plan of ['__proto__', 'constructor', 'toString']) assert.equal((await operator('POST', '/api/me/plan', { plan })).status, 400);
  assert.equal((await operator('POST', '/api/me/plan', { plan: 'gold' })).status, 200);
});

test('D8: repeated wrong passwords lock the account for a while', async () => {
  const user = browser();
  await user('POST', '/api/auth/register', { email: 'brute@x.io', password: 'password1' });
  const login = (password) => browser()('POST', '/api/auth/login', { email: 'brute@x.io', password });
  for (let i = 0; i < 5; i++) assert.equal((await login(`wrong${i}`)).status, 401);
  const locked = await login('password1');
  assert.equal(locked.status, 429, 'even the right password waits once the account is locked');
  assert.ok(Number(locked.headers.get('retry-after')) > 0);
  resetLimits();
  assert.equal((await login('password1')).status, 200);

  // Sign-ups from one network are capped too.
  let last;
  for (let i = 0; i < 11; i++) last = await browser()('POST', '/api/auth/register', { email: `bulk${i}@x.io`, password: 'password1' });
  assert.equal(last.status, 429);
});
