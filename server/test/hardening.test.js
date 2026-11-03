// Regression tests for input validation and robustness fixes.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-hard-'));
process.env.DATA_DIR = tmp;
const { app } = await import('../index.js');

let server, base, cookie = '';
const call = async (method, url, body, { auth = true } = {}) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie: auth ? cookie : '' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(5000) });
  const set = r.headers.get('set-cookie');
  if (set && auth) cookie = set.split(';')[0];
  return { status: r.status, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text() };
};
before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());

const field = (id, type, extra = {}) => ({ id, type, label: id, ...extra });
async function formWith(fields, settings = {}) {
  const { body: { id } } = await call('POST', '/api/forms', { title: 'Test' });
  const { body: f } = await call('GET', `/api/forms/${id}`);
  const put = await call('PUT', `/api/forms/${id}`, { definition: { ...f.definition, fields, settings: { ...f.definition.settings, ...settings } } });
  assert.equal(put.status, 200);
  return id;
}

test('account: non-string passwords are rejected, not crashed on', async () => {
  const r = await call('POST', '/api/auth/register', { email: 'h@x.co', password: 12345678 });
  assert.equal(r.status, 400);
  assert.equal((await call('POST', '/api/auth/register', { email: 'h@x.co', password: 'password1' })).status, 200);
  await call('POST', '/api/me/plan', { plan: 'enterprise' }); // the tests create more forms than Starter allows
});

test('forms: invalid definitions and patches return 400', async () => {
  assert.equal((await call('POST', '/api/forms', { definition: { title: 'Bad', fields: 'x' } })).status, 400);
  assert.equal((await call('POST', '/api/forms', { definition: 'hello' })).status, 400);
  const id = await formWith([field('a', 'text')]);
  assert.equal((await call('PUT', `/api/forms/${id}`, { definition: { fields: [null] } })).status, 400);
  assert.equal((await call('PATCH', `/api/forms/${id}`, { status: 'bogus' })).status, 400);
  assert.equal((await call('PATCH', `/api/forms/${id}`, { title: {} })).status, 400);
  assert.equal((await call('PATCH', `/api/forms/${id}`, { folder: null })).status, 200);
  const items = (await call('GET', '/api/workspace/items?view=all')).body;
  assert.ok(!items.labels.includes('null'));
  assert.equal((await call('GET', `/api/public/forms/${id}`, undefined, { auth: false })).status, 200);
});

test('submit: malformed product values are dropped and exports keep working', async () => {
  const id = await formWith([field('p', 'products', { currency: 'INR', products: [{ id: 'p1', name: 'Pen', price: 10 }] }), field('n', 'text')]);
  for (const items of [5, 'x', [null]]) {
    const r = await call('POST', `/api/public/forms/${id}/submit`, { values: { p: { items }, n: 'hi' } }, { auth: false });
    assert.equal(r.status, 200, `items=${JSON.stringify(items)}`);
  }
  assert.equal((await call('GET', `/api/forms/${id}/submissions.csv`)).status, 200);
  assert.equal((await call('GET', `/api/forms/${id}/report`)).status, 200);
  const list = (await call('GET', `/api/forms/${id}/submissions?offset=-2&limit=1`)).body;
  assert.equal(list.submissions.length, 1);
  assert.equal(list.submissions[0].id, list.submissions[0].id);
});

test('submit: a closed form stays closed when its message is empty', async () => {
  const id = await formWith([field('n', 'text')], { closeDate: '2000-01-01', closedMessage: '' });
  const g = await call('GET', `/api/public/forms/${id}`, undefined, { auth: false });
  assert.ok(g.body.closed);
  assert.equal((await call('POST', `/api/public/forms/${id}/submit`, { values: { n: 'x' } }, { auth: false })).status, 403);
});

test('captcha: forged or missing answers fail; a server challenge works once', async () => {
  const id = await formWith([field('n', 'text'), field('c', 'captcha')]);
  const submit = (c) => call('POST', `/api/public/forms/${id}/submit`, { values: { n: 'x', c } }, { auth: false });
  assert.equal((await submit(undefined)).status, 422);
  assert.equal((await submit({ a: 0, b: 0, answer: 0 })).status, 422);
  const ch = (await call('GET', '/api/public/captcha', undefined, { auth: false })).body;
  assert.equal((await submit({ ...ch, answer: ch.a + ch.b + 1 })).status, 422);
  const ok = { ...ch, answer: String(ch.a + ch.b) };
  assert.equal((await submit(ok)).status, 200);
  assert.equal((await submit(ok)).status, 422, 'a token cannot be reused');
});

test('unique ID numbers are not reused after a submission is deleted', async () => {
  const id = await formWith([field('n', 'text'), field('u', 'widget', { widget: 'uniqueId', prefix: 'ID-', digits: 3 })]);
  const s1 = (await call('POST', `/api/public/forms/${id}/submit`, { values: { n: 'a' } }, { auth: false })).body.id;
  const s2 = (await call('POST', `/api/public/forms/${id}/submit`, { values: { n: 'b' } }, { auth: false })).body.id;
  await call('DELETE', `/api/submissions/${s1}`);
  const s3 = (await call('POST', `/api/public/forms/${id}/submit`, { values: { n: 'c' } }, { auth: false })).body.id;
  const uid = async (sid) => (await call('GET', `/api/submissions/${sid}`)).body.data.u;
  assert.equal(await uid(s2), 'ID-002');
  assert.equal(await uid(s3), 'ID-003');
});

test('errors: async failures answer instead of hanging, unknown paths are 404', async () => {
  const id = await formWith([field('n', 'text')]);
  const r = await call('POST', `/api/forms/${id}/test-email`, { email: {}, definition: { fields: 'x' } });
  assert.ok(r.status >= 400 && r.status < 600);
  assert.equal((await call('GET', '/api/does-not-exist', undefined, { auth: false })).status, 404);
  assert.equal((await call('POST', '/api/submissions/bulk', { ids: 5, action: 'read' })).status, 400);
});
