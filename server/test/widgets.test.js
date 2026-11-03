import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { WIDGETS, WIDGET_BY_KEY, validateWidget, computeWidget, inrWords, formatWidget } from '../../shared/widgets.js';
import { newWidget, newField, formatValue } from '../../shared/fields.js';
import { validateAll } from '../../shared/logic.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-widgets-'));
process.env.DATA_DIR = tmp;
const { app } = await import('../index.js');

let server, base, cookie = '';
const call = async (method, url, body) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: r.status, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text() };
};
before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());

test('catalog keys are unique and every ready widget can be created', () => {
  assert.equal(new Set(WIDGETS.map((w) => w.key)).size, WIDGETS.length);
  for (const w of WIDGETS.filter((x) => !x.soon)) {
    const f = newWidget(w.key);
    assert.ok(f?.id, w.key);
    assert.ok(f.type === 'widget' ? f.widget === w.key : f.type === w.type, w.key);
  }
  assert.equal(newWidget('docusign'), null, 'coming-soon widgets cannot be added');
});

test('validators accept valid and reject invalid identifiers', () => {
  const v = (validator, value) => validateWidget({ type: 'widget', widget: 'ibanValidator', validator }, value, {});
  const good = { iban: 'GB82 WEST 1234 5698 7654 32', cpf: '529.982.247-25', sin: '046 454 286', rut: '12.345.678-5', israeli: '000000018', isbn: '978-3-16-148410-0', nif: '12345678Z', siren: '732 829 320', gstin: '27AAPFU0939F1ZV', pan: 'ABCDE1234F', pincode: '411001', zipus: '12345', ssn: '123-45-6789', aadhaar: '234123412346' };
  for (const [k, value] of Object.entries(good)) assert.equal(v(k, value), null, `${k} should accept ${value}`);
  const bad = { iban: 'GB82 WEST 1234 5698 7654 33', cpf: '111.111.111-11', sin: '046 454 287', rut: '12.345.678-4', isbn: '978-3-16-148410-1', nif: '12345678A', gstin: '27AAPFU0939F1ZX', pan: 'ABC1234F', pincode: '011001', aadhaar: '234123412345' };
  for (const [k, value] of Object.entries(bad)) assert.ok(v(k, value), `${k} should reject ${value}`);
  assert.equal(validateWidget({ type: 'widget', widget: 'maskedInput', validator: 'mask', mask: '@@-####' }, 'AB-1234', {}), null);
  assert.ok(validateWidget({ type: 'widget', widget: 'maskedInput', validator: 'mask', mask: '@@-####' }, 'A1-1234', {}));
});

test('calculators', () => {
  assert.equal(computeWidget({ calc: 'bmi', a: 'w', b: 'h' }, { w: 70, h: 175 }), 22.9);
  assert.equal(computeWidget({ calc: 'emi', a: 'p', b: 'r', c: 'm' }, { p: 100000, r: 12, m: 12 }), 8884.88);
  assert.equal(computeWidget({ calc: 'datediff', a: 'x', b: 'y' }, { x: '2026-01-01', y: '2026-01-31' }), 30);
  assert.equal(computeWidget({ calc: 'adddays', a: 'x', b: 'n' }, { x: '2026-01-30', n: 3 }), '2026-02-02');
  assert.equal(inrWords(152000), 'One Lakh Fifty Two Thousand Rupees');
  assert.equal(inrWords(12345678.5), 'One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees and Fifty Paise');
});

test('calculator widgets are computed by the shared logic engine', () => {
  const bmi = { ...newWidget('bmiCalculator'), a: 'w', b: 'h' };
  const def = { fields: [{ ...newField('number'), id: 'w' }, { ...newField('number'), id: 'h' }, bmi] };
  const { state, errors } = validateAll(def, { w: 80, h: 180 });
  assert.equal(state.values[bmi.id], 24.7);
  assert.deepEqual(errors, {});
});

test('formatting widget values', () => {
  assert.equal(formatWidget({ type: 'widget', widget: 'geolocation' }, { lat: 18.5204, lng: 73.8567 }), '18.52040, 73.85670');
  assert.equal(formatValue({ type: 'subscription', currency: 'INR', plans: [{ id: 's1', name: 'Monthly', price: 499, interval: 'month' }] }, { plan: 's1' }), 'Monthly — INR 499 / month');
  assert.equal(WIDGET_BY_KEY.idPin.isNew, true);
});

test('server: ID & PIN roster is private and verified, unique IDs, donations and subscriptions', async () => {
  await call('POST', '/api/auth/register', { email: 'w@x.co', password: 'password1', name: 'W' });
  const idpin = { ...newWidget('idPin'), id: 'emp', required: true, roster: [{ id: 'E001', pin: '4321', name: 'Alex Smith' }] };
  const uid = { ...newWidget('uniqueId'), id: 'ref', prefix: 'REG-', digits: 4 };
  const donation = { ...newField('donation'), id: 'don' };
  const sub = { ...newField('subscription'), id: 'plan' };
  const definition = { title: 'Widgets', layout: 'classic', fields: [idpin, uid, donation, sub], logic: [], theme: {}, settings: {} };
  const { body: { id } } = await call('POST', '/api/forms', { definition });

  const pub = await call('GET', `/api/public/forms/${id}`);
  assert.equal(pub.body.definition.fields.find((f) => f.id === 'emp').roster, undefined, 'roster not sent to respondents');

  assert.equal((await call('POST', `/api/public/forms/${id}/verify-id`, { field: 'emp', id: 'E001', pin: '0000' })).body.ok, false);
  const okVerify = await call('POST', `/api/public/forms/${id}/verify-id`, { field: 'emp', id: 'e001', pin: '4321' });
  assert.deepEqual(okVerify.body, { ok: true, name: 'Alex Smith' });

  const wrong = await call('POST', `/api/public/forms/${id}/submit`, { values: { emp: { id: 'E001', pin: '1' } } });
  assert.equal(wrong.status, 422);
  assert.ok(wrong.body.errors.emp);

  const res = await call('POST', `/api/public/forms/${id}/submit`, { values: { emp: { id: 'E001', pin: '4321' }, don: { amount: 750 }, plan: { plan: 's2' } } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const s = (await call('GET', `/api/submissions/${res.body.id}`)).body;
  assert.deepEqual(s.data.emp, { id: 'E001', name: 'Alex Smith', verified: true }, 'PIN never stored');
  assert.equal(s.data.ref, 'REG-0001');
  assert.equal(s.data.don.amount, 750);
  assert.equal(s.data.plan.interval, 'year');
  assert.equal(s.payment.amount, 750 + 4999);
  assert.equal(s.payment.status, 'paid', 'test gateway marks paid');

  // Purchase order: collected but left pending.
  definition.settings = { payment: { provider: 'purchaseOrder' } };
  await call('PUT', `/api/forms/${id}`, { definition });
  const po = await call('POST', `/api/public/forms/${id}/submit`, { values: { emp: { id: 'E001', pin: '4321' }, don: { amount: 100 } } });
  const poSub = (await call('GET', `/api/submissions/${po.body.id}`)).body;
  assert.equal(poSub.payment.provider, 'purchaseOrder');
  assert.equal(poSub.payment.status, 'pending');
  assert.equal(poSub.data.ref, 'REG-0002');
});
