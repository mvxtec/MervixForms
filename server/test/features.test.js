import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-feat-'));
process.env.DATA_DIR = tmp;
process.env.SUPER_ADMIN_EMAILS = 'boss@x.io'; // the operator may change plans
delete process.env.ANTHROPIC_API_KEY;
delete process.env.SMTP_HOST;
const { app } = await import('../index.js');

let server, base;
// Each "browser" keeps its own cookies.
const browser = () => {
  const jar = {};
  const call = async (method, url, body, { form } = {}) => {
    const r = await fetch(base + url, {
      method,
      headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), cookie: Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ') },
      body: form || (body ? JSON.stringify(body) : undefined),
      redirect: 'manual',
    });
    for (const c of r.headers.getSetCookie?.() || []) { const [kv] = c.split(';'); const [k, v] = kv.split('='); jar[k] = v; }
    const type = r.headers.get('content-type') || '';
    return { status: r.status, type, body: type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()) };
  };
  return call;
};

before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());

// Opens the confirmation link from the user's outbox (no SMTP in tests).
async function confirmEmail(b) {
  const mail = (await b('GET', '/api/outbox')).body.find((m) => m.subject === 'Confirm your e-mail address');
  const token = mail.body.match(/#\/verify\/(\S+)/)[1];
  assert.equal((await b('POST', '/api/auth/verify', { token })).status, 200);
}

test('version history: autosave snapshot, named version, restore', async () => {
  const a = browser();
  await a('POST', '/api/auth/register', { email: 'v@x.io', password: 'password1' });
  const { id } = (await a('POST', '/api/forms', { title: 'Versioned' })).body;
  const form = (await a('GET', `/api/forms/${id}`)).body;
  const def2 = { ...form.definition, title: 'Versioned v2' };
  await a('PUT', `/api/forms/${id}`, { definition: def2, versionLabel: 'v2' });
  await a('PUT', `/api/forms/${id}`, { definition: { ...def2, title: 'Versioned v3' } });
  const versions = (await a('GET', `/api/forms/${id}/versions`)).body;
  assert.ok(versions.length >= 3);
  const v2 = versions.find((v) => v.label === 'v2');
  assert.equal((await a('POST', `/api/forms/${id}/versions/${v2.id}/restore`)).status, 200);
  assert.equal((await a('GET', `/api/forms/${id}`)).body.title, 'Versioned v2');
});

test('submission PDF renders and can be attached to notification e-mails', async () => {
  const a = browser();
  await a('POST', '/api/auth/register', { email: 'pdf@x.io', password: 'password1' });
  const { id } = (await a('POST', '/api/forms', { templateId: 'job' })).body;
  const form = (await a('GET', `/api/forms/${id}`)).body;
  form.definition.fields.find((f) => f.id === 'resume').required = false;
  form.definition.settings.notify.attachPdf = true;
  form.definition.pdf = { title: 'Application {submission_id}', footer: 'Confidential ★' };
  await a('PUT', `/api/forms/${id}`, { definition: form.definition });
  const sig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  await a('POST', `/api/public/forms/${id}/submit`, { values: { name: { first: 'Zoë', last: 'Ü' }, email: 'z@x.io', position: 'Designer', sig } });
  const sub = (await a('GET', `/api/forms/${id}/submissions`)).body.submissions[0];
  const pdf = await a('GET', `/api/submissions/${sub.id}/pdf`);
  assert.equal(pdf.type, 'application/pdf');
  const doc = await PDFDocument.load(pdf.body);
  assert.ok(doc.getPageCount() >= 1);
  await new Promise((r) => setTimeout(r, 300)); // afterSubmit is async
  const mail = (await a('GET', '/api/outbox')).body.find((m) => m.subject.startsWith('New submission'));
  assert.equal(mail.has_attachment, 1);
});

test('public payload hides integrations, agent persona and PDF settings; translations pass through', async () => {
  const a = browser();
  await a('POST', '/api/auth/register', { email: 'pub@x.io', password: 'password1' });
  const { id } = (await a('POST', '/api/forms', { templateId: 'contact' })).body;
  const form = (await a('GET', `/api/forms/${id}`)).body;
  form.definition.settings.integrations = { slack: { enabled: true, url: 'https://hooks.slack.com/secret' } };
  form.definition.settings.agent = { enabled: true, persona: 'secret persona' };
  form.definition.translations = [{ code: 'es', name: 'Español', strings: { 'msg.label': 'Mensaje' } }];
  await a('PUT', `/api/forms/${id}`, { definition: form.definition });
  const pub = (await browser()('GET', `/api/public/forms/${id}`)).body;
  const json = JSON.stringify(pub);
  assert.ok(!json.includes('hooks.slack.com'));
  assert.ok(!json.includes('secret persona'));
  assert.equal(pub.definition.settings.agent.enabled, true);
  assert.equal(pub.definition.translations[0].strings['msg.label'], 'Mensaje');
  // Agent endpoint reports missing AI credentials clearly.
  const r = await browser()('POST', `/api/public/forms/${id}/agent`, { history: [] });
  assert.equal(r.status, 503);
  assert.match(r.body.error, /ANTHROPIC_API_KEY/);
});

test('teams: enterprise owner invites editor and viewer; roles enforced', async () => {
  const owner = browser(), ed = browser(), viewer = browser();
  await owner('POST', '/api/auth/register', { email: 'boss@x.io', password: 'password1' });
  assert.equal((await owner('POST', '/api/team/invite', { email: 'ed@x.io', role: 'editor' })).status, 402);
  await owner('POST', '/api/me/plan', { plan: 'enterprise' });
  await ed('POST', '/api/auth/register', { email: 'ed@x.io', password: 'password1' });
  // An unconfirmed account isn't added directly; the invite waits until the address is confirmed.
  assert.equal((await owner('POST', '/api/team/invite', { email: 'ed@x.io', role: 'editor' })).body.invited, true);
  assert.equal((await ed('GET', '/api/me')).body.workspaces.length, 1);
  await confirmEmail(ed);
  assert.equal((await owner('POST', '/api/team/invite', { email: 'view@x.io', role: 'viewer' })).body.invited, true);
  await viewer('POST', '/api/auth/register', { email: 'view@x.io', password: 'password1' });
  assert.equal((await viewer('GET', '/api/me')).body.workspaces.length, 1, 'invite not accepted before confirming');
  await confirmEmail(viewer);
  const { id } = (await owner('POST', '/api/forms', { title: 'Team form' })).body;

  const me = (await ed('GET', '/api/me')).body;
  const ownerWs = me.workspaces.find((w) => w.email === 'boss@x.io');
  await ed('POST', '/api/workspace', { id: ownerWs.id });
  assert.equal((await ed('GET', '/api/me')).body.plan.key, 'enterprise');
  assert.ok((await ed('GET', '/api/forms')).body.forms.some((f) => f.id === id));
  assert.equal((await ed('PATCH', `/api/forms/${id}`, { title: 'Edited by editor' })).status, 200);

  await viewer('POST', '/api/workspace', { id: ownerWs.id });
  assert.equal((await viewer('GET', `/api/forms/${id}`)).status, 200);
  assert.equal((await viewer('PATCH', `/api/forms/${id}`, { title: 'nope' })).status, 403);
  assert.equal((await viewer('POST', '/api/team/invite', { email: 'z@x.io' })).status, 403);
});

test('e-sign: upload, place fields, two signers sign, signed PDF produced', async () => {
  const a = browser();
  await a('POST', '/api/auth/register', { email: 'signer-owner@x.io', password: 'password1' });
  const src = await PDFDocument.create();
  src.addPage([595, 842]);
  const fd = new FormData();
  fd.append('file', new Blob([await src.save()], { type: 'application/pdf' }), 'Contract.pdf');
  const { id } = (await a('POST', '/api/sign/docs', null, { form: fd })).body;
  const bad = new FormData();
  bad.append('file', new Blob(['not a pdf']), 'x.pdf');
  assert.equal((await a('POST', '/api/sign/docs', null, { form: bad })).status, 415);

  await a('PUT', `/api/sign/docs/${id}`, {
    title: 'Contract', message: 'Please sign',
    signers: [{ name: 'Ann', email: 'ann@x.io' }, { name: 'Bob', email: 'bob@x.io' }],
    fields: [
      { id: 's1', type: 'signature', page: 0, signer: 0, x: 0.1, y: 0.8, w: 0.3, h: 0.06 },
      { id: 'd1', type: 'date', page: 0, signer: 0, x: 0.5, y: 0.8, w: 0.2, h: 0.03 },
      { id: 's2', type: 'signature', page: 0, signer: 1, x: 0.1, y: 0.9, w: 0.3, h: 0.06 },
    ],
  });
  assert.equal((await a('POST', `/api/sign/docs/${id}/send`)).status, 200);
  const doc = (await a('GET', `/api/sign/docs/${id}`)).body;
  const tokens = doc.signers.map((s) => s.link.split('/sign/')[1]);
  const sig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const pub = browser();
  const view = (await pub('GET', `/api/public/sign/${tokens[0]}`)).body;
  assert.equal(view.fields.length, 2);
  assert.equal((await pub('POST', `/api/public/sign/${tokens[0]}`, { values: { s1: sig, d1: '2026-11-02' } })).status, 422, 'consent required');
  assert.equal((await pub('POST', `/api/public/sign/${tokens[0]}`, { values: { s1: sig, d1: '2026-11-02' }, consent: true })).body.completed, false);
  assert.equal((await pub('POST', `/api/public/sign/${tokens[1]}`, { values: { s2: sig }, consent: true })).body.completed, true);
  const done = (await a('GET', `/api/sign/docs/${id}`)).body;
  assert.equal(done.status, 'completed');
  const signed = await a('GET', `/api/sign/docs/${id}/pdf?signed=1`);
  assert.equal((await PDFDocument.load(signed.body)).getPageCount(), 2, 'original page + certificate');
});

test('store: order total recomputed server-side, test payment, confirmation e-mails', async () => {
  const a = browser();
  await a('POST', '/api/auth/register', { email: 'shop@x.io', password: 'password1' });
  const { id } = (await a('POST', '/api/apps', { kind: 'store', title: 'Shop' })).body;
  const appDef = (await a('GET', `/api/apps/${id}`)).body.definition;
  appDef.products = [{ id: 'a', name: 'Mug', price: 12.5, description: '', image: '' }, { id: 'b', name: 'Cap', price: 20, description: '', image: '' }];
  await a('PUT', `/api/apps/${id}`, { definition: appDef });
  const pub = browser();
  assert.equal((await pub('GET', `/api/public/apps/${id}`)).body.kind, 'store');
  const noAddr = await pub('POST', `/api/public/apps/${id}/order`, { items: [{ id: 'a', qty: 2 }], customer: { name: 'C', email: 'c@x.io' } });
  assert.equal(noAddr.status, 422);
  const ok = await pub('POST', `/api/public/apps/${id}/order`, { items: [{ id: 'a', qty: 2 }, { id: 'b', qty: 1 }, { id: 'zzz', qty: 5 }], customer: { name: 'C', email: 'c@x.io', address: { street: '1 Rd', city: 'X' } } });
  assert.equal(ok.status, 200);
  const orders = (await a('GET', `/api/apps/${id}/orders`)).body;
  assert.equal(orders[0].total, 45);
  assert.equal(orders[0].payment.status, 'paid');
  assert.ok((await a('GET', '/api/outbox')).body.some((m) => m.recipient === 'c@x.io'));
});
