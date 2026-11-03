// App builder (mobile-friendly pages bundling forms, links and content) and Store builder (products + cart + checkout).
import { Router } from 'express';
import crypto from 'node:crypto';
import { db, bumpUsage, getUsage } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { planOf } from '../../shared/plans.js';
import { deliver, BASE_URL } from '../notify.js';
import { stripeEnabled, createCheckout, retrieveCheckout } from '../payments.js';

const r = Router();
const parse = (row) => row && { ...row, definition: JSON.parse(row.definition) };

const defaults = (kind, title) => ({
  title, description: '',
  theme: { primary: kind === 'store' ? '#16a34a' : '#2563eb', background: '#f4f5f9', logo: '' },
  elements: kind === 'store'
    ? [{ id: 'e1', type: 'heading', text: title }, { id: 'e2', type: 'text', text: 'Browse our products and check out securely.' }, { id: 'e3', type: 'products' }]
    : [{ id: 'e1', type: 'heading', text: title }, { id: 'e2', type: 'text', text: 'Welcome! Pick an option below.' }],
  products: kind === 'store' ? [{ id: 'p1', name: 'Sample product', price: 19, description: 'Describe your product', image: '' }] : [],
  currency: 'USD',
  checkout: { collectAddress: true, collectPhone: false, thankYou: 'Thanks for your order! A confirmation e-mail is on its way.' },
});

r.get('/apps', requireAuth, (req, res) => {
  res.json(db.prepare(`SELECT a.id, a.kind, a.title, a.status, a.views, a.updated_at, (SELECT COUNT(*) FROM orders o WHERE o.app_id = a.id) orders
    FROM apps a WHERE a.user_id = ? ORDER BY a.updated_at DESC`).all(req.ws.id));
});

r.post('/apps', requireAuth, requireRole('editor'), (req, res) => {
  const kind = req.body?.kind === 'store' ? 'store' : 'app';
  const title = String(req.body?.title || (kind === 'store' ? 'My Store' : 'My App')).slice(0, 120);
  const id = crypto.randomBytes(6).toString('hex');
  db.prepare('INSERT INTO apps (id, user_id, kind, title, definition) VALUES (?, ?, ?, ?, ?)').run(id, req.ws.id, kind, title, JSON.stringify(defaults(kind, title)));
  res.json({ id });
});

const own = (req, res) => {
  const a = parse(db.prepare('SELECT * FROM apps WHERE id = ? AND user_id = ?').get(req.params.id, req.ws.id));
  if (!a) res.status(404).json({ error: 'App not found' });
  return a;
};

r.get('/apps/:id', requireAuth, (req, res) => { const a = own(req, res); if (a) res.json(a); });

r.put('/apps/:id', requireAuth, requireRole('editor'), (req, res) => {
  const a = own(req, res);
  if (!a) return;
  const def = req.body?.definition;
  if (!def || !Array.isArray(def.elements)) return res.status(400).json({ error: 'Invalid app' });
  db.prepare("UPDATE apps SET definition = ?, title = ?, status = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(def), String(def.title || a.title), req.body.status === 'disabled' ? 'disabled' : 'enabled', a.id);
  res.json({ ok: true });
});

r.delete('/apps/:id', requireAuth, requireRole('editor'), (req, res) => {
  const a = own(req, res);
  if (!a) return;
  db.prepare('DELETE FROM apps WHERE id = ?').run(a.id);
  res.json({ ok: true });
});

r.get('/apps/:id/orders', requireAuth, (req, res) => {
  const a = own(req, res);
  if (!a) return;
  res.json(db.prepare('SELECT * FROM orders WHERE app_id = ? ORDER BY id DESC').all(a.id).map((o) => ({ ...o, items: JSON.parse(o.items), customer: JSON.parse(o.customer), payment: o.payment ? JSON.parse(o.payment) : null })));
});

r.patch('/orders/:oid', requireAuth, requireRole('editor'), (req, res) => {
  const o = db.prepare('SELECT o.id FROM orders o JOIN apps a ON a.id = o.app_id WHERE o.id = ? AND a.user_id = ?').get(req.params.oid, req.ws.id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (['new', 'fulfilled', 'cancelled'].includes(req.body?.status)) db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(req.body.status, o.id);
  res.json({ ok: true });
});

// ---- Public ----
r.get('/public/apps/:id', (req, res) => {
  const a = parse(db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id));
  if (!a || a.status !== 'enabled') return res.status(404).json({ error: 'App not found' });
  db.prepare('UPDATE apps SET views = views + 1 WHERE id = ?').run(a.id);
  const owner = db.prepare('SELECT plan FROM users WHERE id = ?').get(a.user_id);
  // Titles of embedded forms so the app can show them as tiles.
  const formIds = a.definition.elements.filter((e) => e.type === 'form' && e.formId).map((e) => e.formId);
  const forms = Object.fromEntries(formIds.map((id) => [id, db.prepare("SELECT title FROM forms WHERE id = ? AND user_id = ? AND status = 'enabled'").get(id, a.user_id)?.title]).filter(([, t]) => t));
  res.json({ id: a.id, kind: a.kind, definition: a.definition, forms, branding: planOf(owner.plan).branding, stripe: stripeEnabled() });
});

r.post('/public/apps/:id/order', async (req, res) => {
  const a = parse(db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id));
  if (!a || a.status !== 'enabled' || a.kind !== 'store') return res.status(404).json({ error: 'Store not found' });
  const def = a.definition;
  const c = req.body?.customer || {};
  if (!c.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email || '')) return res.status(422).json({ error: 'Enter your name and a valid e-mail.' });
  if (def.checkout?.collectAddress && (!c.address?.street || !c.address?.city)) return res.status(422).json({ error: 'Enter your shipping address.' });
  const catalog = Object.fromEntries((def.products || []).map((p) => [p.id, p]));
  const items = (req.body?.items || []).filter((i) => catalog[i.id]).map((i) => ({ id: i.id, name: catalog[i.id].name, price: Number(catalog[i.id].price), qty: Math.max(1, Math.min(999, Math.floor(Number(i.qty) || 1))) }));
  if (!items.length) return res.status(422).json({ error: 'Your cart is empty.' });
  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(a.user_id);
  const plan = planOf(owner.plan);
  if (getUsage(owner.id).paymentsPerMonth >= plan.paymentsPerMonth) return res.status(402).json({ error: 'This store has reached its monthly order limit.' });
  const total = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100;
  const currency = def.currency || 'USD';
  const customer = { name: String(c.name).slice(0, 100), email: String(c.email).slice(0, 200), phone: String(c.phone || '').slice(0, 40), address: c.address || null, note: String(c.note || '').slice(0, 1000) };
  let payment = stripeEnabled() ? { status: 'pending', provider: 'stripe' } : { status: 'paid', provider: 'test', ref: `test_${crypto.randomBytes(6).toString('hex')}` };
  const { lastInsertRowid: oid } = db.prepare('INSERT INTO orders (app_id, items, customer, total, currency, payment) VALUES (?, ?, ?, ?, ?, ?)').run(a.id, JSON.stringify(items), JSON.stringify(customer), total, currency, JSON.stringify(payment));
  bumpUsage(owner.id, 'payments');
  if (payment.provider === 'stripe') {
    try {
      const session = await createCheckout({
        items, currency, email: customer.email, metadata: { appId: a.id, orderId: String(oid) },
        successUrl: `${BASE_URL()}/api/public/apps/${a.id}/order-return?order=${oid}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${BASE_URL()}/a/${a.id}?order=cancelled`,
      });
      db.prepare('UPDATE orders SET payment = ? WHERE id = ?').run(JSON.stringify({ ...payment, ref: session.id }), oid);
      return res.json({ id: oid, checkoutUrl: session.url });
    } catch (e) {
      db.prepare('DELETE FROM orders WHERE id = ?').run(oid);
      return res.status(502).json({ error: `Payment could not be started: ${e.message}` });
    }
  }
  confirmOrder(a, owner, oid);
  res.json({ id: oid, thankYou: def.checkout?.thankYou || 'Thank you for your order!' });
});

function confirmOrder(a, owner, oid) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(oid);
  const items = JSON.parse(o.items), c = JSON.parse(o.customer);
  const lines = items.map((i) => `${i.name} x ${i.qty} = ${o.currency} ${(i.price * i.qty).toFixed(2)}`).join('\n');
  deliver(owner.id, null, owner.email, `New order #${oid} — ${a.title}`, `${c.name} <${c.email}> ordered:\n${lines}\nTotal: ${o.currency} ${o.total.toFixed(2)}${c.address ? `\n\nShip to: ${Object.values(c.address).filter(Boolean).join(', ')}` : ''}${c.note ? `\n\nNote: ${c.note}` : ''}`);
  deliver(owner.id, null, c.email, `Your order #${oid} from ${a.title}`, `Hi ${c.name},\n\nThanks for your order!\n\n${lines}\nTotal: ${o.currency} ${o.total.toFixed(2)}`);
}

r.get('/public/apps/:id/order-return', async (req, res) => {
  const o = db.prepare('SELECT * FROM orders WHERE id = ? AND app_id = ?').get(req.query.order, req.params.id);
  if (!o) return res.status(404).send('Unknown order');
  const payment = JSON.parse(o.payment || '{}');
  try {
    const session = await retrieveCheckout(String(req.query.session_id));
    if (session.id === payment.ref && session.payment_status === 'paid' && payment.status !== 'paid') {
      db.prepare('UPDATE orders SET payment = ? WHERE id = ?').run(JSON.stringify({ ...payment, status: 'paid' }), o.id);
      const a = parse(db.prepare('SELECT * FROM apps WHERE id = ?').get(o.app_id));
      confirmOrder(a, db.prepare('SELECT * FROM users WHERE id = ?').get(a.user_id), o.id);
    }
  } catch (e) { console.error('order return', e); }
  res.redirect(`/a/${req.params.id}?order=${o.id}`);
});

export default r;
