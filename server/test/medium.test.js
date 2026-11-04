// Regression tests for the Medium defects in reports/Product QA UX and engineering review.md (D9–D22).
import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-med-'));
process.env.DATA_DIR = tmp;
delete process.env.SMTP_HOST;
delete process.env.ALLOW_PRIVATE_URLS;
process.env.SUPER_ADMIN_EMAILS = 'boss@x.io';
const { app } = await import('../index.js');
const { db, UPLOAD_DIR } = await import('../db.js');
const { resetLimits } = await import('../ratelimit.js');
const { sweep } = await import('../files.js');
const { isPrivateAddress, checkPublicUrl } = await import('../net.js');

let server, base;
before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
beforeEach(() => resetLimits());

function browser() {
  let cookie = '';
  const call = async (method, url, body, { headers = {} } = {}) => {
    const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie, ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const set = r.headers.get('set-cookie');
    if (set?.startsWith('mf_session=')) cookie = set.split(';')[0];
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, headers: r.headers, body: ct.includes('json') ? await r.json() : await r.text() };
  };
  call.cookie = () => cookie;
  call.setCookie = (c) => { cookie = c; };
  return call;
}
const anon = (method, url, body, headers = {}) => fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) })
  .then(async (r) => ({ status: r.status, headers: r.headers, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text() }));

const boss = browser();
async function form(fields, settings = {}) {
  const { id } = (await boss('POST', '/api/forms', { title: 'Med' })).body;
  const def = (await boss('GET', `/api/forms/${id}`)).body.definition;
  const put = await boss('PUT', `/api/forms/${id}`, { definition: { ...def, fields, settings: { ...def.settings, ...settings } } });
  return { id, def, put };
}

test('setup', async () => {
  await boss('POST', '/api/auth/register', { email: 'boss@x.io', password: 'password1' });
  await boss('POST', '/api/me/plan', { plan: 'enterprise' });
});

test('D9: logout and password changes end sessions', async () => {
  const a = browser();
  await a('POST', '/api/auth/register', { email: 'sess@x.io', password: 'password1' });
  const copied = a.cookie();
  await a('POST', '/api/auth/logout');
  const thief = browser(); thief.setCookie(copied);
  assert.equal((await thief('GET', '/api/me')).status, 401, 'a copied cookie stops working after logout');

  const laptop = browser(), phone = browser();
  await laptop('POST', '/api/auth/login', { email: 'sess@x.io', password: 'password1' });
  await phone('POST', '/api/auth/login', { email: 'sess@x.io', password: 'password1' });
  assert.equal((await laptop('PATCH', '/api/me', { password: 'password2', currentPassword: 'password1' })).status, 200);
  assert.equal((await laptop('GET', '/api/me')).status, 200, 'the device that changed the password stays signed in');
  assert.equal((await phone('GET', '/api/me')).status, 401, 'other devices are signed out');
});

test('D10: security headers; embeds stay frameable', async () => {
  const page = await anon('GET', '/api/public/templates');
  assert.equal(page.headers.get('x-powered-by'), null);
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  assert.match(page.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(page.headers.get('content-security-policy'), /frame-ancestors 'self'/);
  assert.equal(page.headers.get('x-frame-options'), 'SAMEORIGIN');
  const embed = await anon('GET', '/embed/abc');
  assert.match(embed.headers.get('content-security-policy'), /frame-ancestors \*/);
  assert.equal(embed.headers.get('x-frame-options'), null);
});

test('D11: outgoing calls refuse private and internal addresses', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) assert.ok(isPrivateAddress(ip), ip);
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) assert.ok(!isPrivateAddress(ip), ip);
  await assert.rejects(checkPublicUrl('http://example.org/hook'), /https/);
  await assert.rejects(checkPublicUrl('https://169.254.169.254/latest/meta-data/'), /private or internal/);
  await assert.rejects(checkPublicUrl('https://localhost:4000/api/me'), /private or internal/);
  await assert.rejects(checkPublicUrl('https://user:pw@example.org/'), /user name or password/);

  const { id } = await form([{ id: 'n', type: 'text', label: 'Name' }], { webhooks: [`https://127.0.0.1:${server.address().port}/api/me`] });
  const t = await boss('POST', `/api/forms/${id}/test-integration`, { kind: 'webhook', url: 'https://169.254.169.254/latest' });
  assert.equal(t.body.ok, false);
  assert.match(t.body.error, /private or internal/);
  await anon('POST', `/api/public/forms/${id}/submit`, { values: { n: 'x' } });
  await new Promise((r) => setTimeout(r, 200));
  const log = db.prepare('SELECT status, error FROM webhook_log WHERE form_id = ?').all(id);
  assert.ok(log.length && log.every((l) => l.status == null && /private or internal/.test(l.error)), JSON.stringify(log));
});

test('D12: unsubmitted uploads do not use storage and are cleaned up', async () => {
  const { id } = await form([{ id: 'doc', type: 'file', label: 'Doc' }]);
  const up = async () => {
    const fd = new FormData();
    fd.append('field', 'doc');
    fd.append('file', new Blob([Buffer.alloc(1024, 1)]), 'a.bin');
    return (await fetch(`${base}/api/public/forms/${id}/upload`, { method: 'POST', body: fd })).json();
  };
  const usage = async () => (await boss('GET', '/api/me')).body.usage.uploadBytes;
  const before = await usage();
  const orphan = await up();
  assert.equal(await usage(), before, 'a pending upload does not count');
  const kept = await up();
  await anon('POST', `/api/public/forms/${id}/submit`, { values: { doc: [kept] } });
  assert.equal(await usage(), before + 1024, 'an attached upload counts');
  db.prepare("UPDATE uploads SET created_at = datetime('now', '-2 days') WHERE id = ?").run(orphan.id);
  assert.equal(sweep(db, UPLOAD_DIR), 1);
  assert.ok(!fs.existsSync(path.join(UPLOAD_DIR, orphan.id)));
  assert.ok(fs.existsSync(path.join(UPLOAD_DIR, kept.id)));
});

test('D13: the ID & PIN lockout also applies to submissions', async () => {
  const { id } = await form([{ id: 'emp', type: 'widget', widget: 'idPin', label: 'Employee', maxAttempts: 3, roster: [{ id: 'E1', pin: '4321', name: 'Asha' }] }]);
  for (let i = 0; i < 3; i++) assert.equal((await anon('POST', `/api/public/forms/${id}/submit`, { values: { emp: { id: 'E1', pin: `000${i}` } } })).status, 422);
  assert.equal((await anon('POST', `/api/public/forms/${id}/submit`, { values: { emp: { id: 'E1', pin: '4321' } } })).status, 429);
});

test('D14: form passwords travel in a header and lock after 10 wrong guesses', async () => {
  const { id } = await form([{ id: 'n', type: 'text', label: 'Name' }], { password: 'opensesame' });
  assert.equal((await anon('GET', `/api/public/forms/${id}?password=opensesame`)).body.passwordRequired, true, 'query string is ignored');
  assert.ok((await anon('GET', `/api/public/forms/${id}`, undefined, { 'X-Form-Password': 'opensesame' })).body.definition);
  for (let i = 0; i < 10; i++) await anon('GET', `/api/public/forms/${id}`, undefined, { 'X-Form-Password': `guess${i}` });
  assert.equal((await anon('GET', `/api/public/forms/${id}`, undefined, { 'X-Form-Password': 'opensesame' })).status, 429);
  assert.equal((await anon('POST', `/api/public/forms/${id}/submit`, { values: { n: 'x' }, password: 'opensesame' })).status, 429);
});

test('D16: field limits apply to imports and clones', async () => {
  const user = browser();
  await user('POST', '/api/auth/register', { email: 'small@x.io', password: 'password1' });
  const fields = Array.from({ length: 101 }, (_, i) => ({ id: `f${i}`, type: 'text', label: `F${i}` }));
  assert.equal((await user('POST', '/api/forms', { definition: { title: 'Big', fields } })).status, 402);
});

test('D17: CSV answers cannot run as formulas', async () => {
  const { id } = await form([{ id: 'n', type: 'text', label: 'Name' }]);
  await anon('POST', `/api/public/forms/${id}/submit`, { values: { n: '=HYPERLINK("https://evil.example","x")' } });
  const csv = (await boss('GET', `/api/forms/${id}/submissions.csv`)).body;
  assert.match(csv, /"'=HYPERLINK/);
});

test('D18 and D19: one currency per form; quantities are bounded', async () => {
  const mixed = await form([{ id: 'p', type: 'products', label: 'P', currency: 'USD', products: [{ id: 'a', name: 'A', price: 10 }] }, { id: 'd', type: 'donation', label: 'D', currency: 'INR' }]);
  assert.equal(mixed.put.status, 400);
  const { id } = await form([{ id: 'p', type: 'products', label: 'P', currency: 'INR', quantity: true, products: [{ id: 'a', name: 'A', price: 10 }] }]);
  const sub = await anon('POST', `/api/public/forms/${id}/submit`, { values: { p: { items: [{ id: 'a', qty: 1e308 }] } } });
  assert.equal(sub.status, 200);
  const saved = (await boss('GET', `/api/submissions/${sub.body.id}`)).body;
  assert.equal(saved.data.p.items[0].qty, 9999);
  assert.ok(Number.isFinite(saved.payment.amount) && saved.payment.amount === 99990);
});

test('D20: drafts are size-capped and stay with their form', async () => {
  const a = await form([{ id: 'n', type: 'text', label: 'Name' }], { saveAndContinue: true });
  const b = await form([{ id: 'n', type: 'text', label: 'Name' }], { saveAndContinue: true });
  assert.equal((await anon('POST', `/api/public/forms/${a.id}/draft`, { values: { n: 'x'.repeat(300 * 1024) } })).status, 413);
  const { token } = (await anon('POST', `/api/public/forms/${a.id}/draft`, { values: { n: 'mine' } })).body;
  const other = (await anon('POST', `/api/public/forms/${b.id}/draft`, { token, values: { n: 'overwrite' } })).body;
  assert.notEqual(other.token, token);
  assert.equal((await anon('GET', `/api/public/drafts/${token}`)).body.values.n, 'mine');
});

test('D21: public submissions are rate-limited per form and network', async () => {
  const { id } = await form([{ id: 'n', type: 'text', label: 'Name' }]);
  const codes = [];
  for (let i = 0; i < 21; i++) codes.push((await anon('POST', `/api/public/forms/${id}/submit`, { values: { n: `x${i}` } })).status);
  assert.equal(codes.filter((c) => c === 200).length, 20);
  assert.equal(codes.at(-1), 429);
});

test('D22: forgot password sends a single-use link that signs out other sessions', async () => {
  const user = browser(), other = browser();
  await user('POST', '/api/auth/register', { email: 'forgetful@x.io', password: 'password1' });
  await other('POST', '/api/auth/login', { email: 'forgetful@x.io', password: 'password1' });
  assert.deepEqual((await anon('POST', '/api/auth/forgot', { email: 'nobody@x.io' })).body, { ok: true }, 'same answer for unknown addresses');
  assert.equal((await anon('POST', '/api/auth/forgot', { email: 'forgetful@x.io' })).status, 200);
  const mail = (await user('GET', '/api/outbox')).body.find((m) => m.subject === 'Reset your password');
  const token = mail.body.match(/#\/reset\/(\S+)/)[1];
  assert.equal((await anon('POST', '/api/auth/reset', { token, password: 'short' })).status, 400);
  assert.equal((await anon('POST', '/api/auth/reset', { token, password: 'brand-new-pass' })).status, 200);
  assert.equal((await anon('POST', '/api/auth/reset', { token, password: 'again-new-pass' })).status, 400, 'the link works once');
  assert.equal((await other('GET', '/api/me')).status, 401, 'existing sessions end');
  assert.equal((await anon('POST', '/api/auth/login', { email: 'forgetful@x.io', password: 'brand-new-pass' })).status, 200);
});
