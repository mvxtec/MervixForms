import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-test-'));
process.env.DATA_DIR = tmp;
const { app } = await import('../index.js');

let server, base, cookie = '';
const call = async (method, url, body, extra = {}) => {
  const r = await fetch(base + url, {
    method, headers: { 'Content-Type': 'application/json', cookie, ...extra }, body: body ? JSON.stringify(body) : undefined,
  });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  const type = r.headers.get('content-type') || '';
  return { status: r.status, body: type.includes('json') ? await r.json() : await r.text() };
};

before(async () => {
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => { server.close(); });

test('end-to-end form lifecycle', async () => {
  assert.equal((await call('POST', '/api/auth/register', { email: 'a@b.co', password: 'password1', name: 'A' })).status, 200);
  const me = await call('GET', '/api/me');
  assert.equal(me.body.plan.key, 'starter');

  const { body: { id } } = await call('POST', '/api/forms', { templateId: 'contact' });
  const pub = await call('GET', `/api/public/forms/${id}`);
  assert.equal(pub.body.closed, null);
  assert.equal(pub.body.definition.settings.notify, undefined, 'owner settings stripped');

  // Logic: "Other" topic reveals a required field.
  const bad = await call('POST', `/api/public/forms/${id}/submit`, { values: { name: { first: 'Jo', last: 'Do' }, email: 'jo@x.io', topic: 'Other', msg: 'hi' } });
  assert.equal(bad.status, 422);
  assert.ok(bad.body.errors.other_topic);

  const ok = await call('POST', `/api/public/forms/${id}/submit`, { values: { name: { first: 'Jo', last: 'Do' }, email: 'jo@x.io', topic: 'Sales', msg: 'hi', other_topic: 'ignored' } });
  assert.equal(ok.status, 200);
  const subs = await call('GET', `/api/forms/${id}/submissions`);
  assert.equal(subs.body.total, 1);
  assert.equal(subs.body.submissions[0].data.other_topic, undefined, 'hidden field dropped');

  const outbox = await call('GET', '/api/outbox');
  assert.ok(outbox.body.some((m) => m.recipient === 'a@b.co'));

  const csv = await call('GET', `/api/forms/${id}/submissions.csv`);
  assert.match(csv.body, /Jo Do/);
});

test('payments are recomputed server-side and calculations run', async () => {
  const { body: { id } } = await call('POST', '/api/forms', { templateId: 'order' });
  const r = await call('POST', `/api/public/forms/${id}/submit`, {
    values: { name: { first: 'A', last: 'B' }, email: 'x@y.zz', ship: { street: '1 Main', city: 'Town' }, items: { items: [{ id: 'tee', qty: 2 }, { id: 'mug', qty: 1 }], total: 1 } },
  });
  assert.equal(r.status, 200);
  const s = (await call('GET', `/api/forms/${id}/submissions`)).body.submissions[0];
  assert.equal(s.payment.amount, 62);
  assert.equal(s.payment.status, 'paid');

  const q = (await call('POST', '/api/forms', { templateId: 'quote' })).body.id;
  await call('POST', `/api/public/forms/${q}/submit`, { values: { hours: 10, rate: '50', rush: 'Yes', email: 'q@q.qq' } });
  const qs = (await call('GET', `/api/forms/${q}/submissions`)).body.submissions[0];
  assert.equal(qs.data.total, 625);
});

test('plan limits: starter allows 5 forms', async () => {
  for (let i = 0; i < 5; i++) await call('POST', '/api/forms', { title: `F${i}` });
  const r = await call('POST', '/api/forms', { title: 'too many' });
  assert.equal(r.status, 402);
  await call('POST', '/api/me/plan', { plan: 'gold' });
  assert.equal((await call('POST', '/api/forms', { title: 'ok now' })).status, 200);
});

test('approval links work without login', async () => {
  const { body: { id } } = await call('POST', '/api/forms', { templateId: 'job' });
  const sig = 'data:image/png;base64,iVBORw0KGgo=';
  // resume is required; skip by making it optional through the API
  const form = (await call('GET', `/api/forms/${id}`)).body;
  form.definition.fields.find((f) => f.id === 'resume').required = false;
  await call('PUT', `/api/forms/${id}`, { definition: form.definition });
  const r = await call('POST', `/api/public/forms/${id}/submit`, { values: { name: { first: 'A', last: 'B' }, email: 'c@d.ee', position: 'Engineer', sig } });
  assert.equal(r.status, 200);
  const mail = (await call('GET', '/api/outbox')).body.find((m) => m.subject.startsWith('Approval needed'));
  const link = mail.body.match(/#\/approve\/(\S+)/)[1];
  const saved = cookie; cookie = '';
  const view = await call('GET', `/api/public/approval/${link}`);
  assert.equal(view.body.submission.approval, 'pending');
  assert.equal((await call('POST', `/api/public/approval/${link}`, { decision: 'approved' })).status, 200);
  assert.equal((await call('GET', `/api/public/approval/${link.replace(/.$/, 'x')}`)).status, 403);
  cookie = saved;
  const sub = (await call('GET', `/api/forms/${id}/submissions`)).body.submissions[0];
  assert.equal(sub.approval, 'approved');
  assert.equal(sub.signed, true);
});
