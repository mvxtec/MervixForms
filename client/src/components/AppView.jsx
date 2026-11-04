import { useState } from 'react';
import { api } from '../api.js';
import Icon from './Icon.jsx';
import { safeUrl } from '@shared/urls.js';

const money = (currency, n) => `${currency} ${Number(n || 0).toFixed(2)}`;

// Renders an app/store. `live` enables real ordering; in the editor it is a preview.
export default function AppView({ appId, kind, def, forms = {}, live, branding }) {
  const t = def.theme || {};
  const [openForm, setOpenForm] = useState(null);
  const [cart, setCart] = useState({});
  const [checkout, setCheckout] = useState(false);
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', note: '', address: { street: '', city: '', state: '', zip: '', country: '' } });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const products = def.products || [];
  const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ ...products.find((p) => p.id === id), qty })).filter((i) => i.name);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const add = (id, d) => setCart((c) => ({ ...c, [id]: Math.max(0, (c[id] || 0) + d) }));

  const order = async () => {
    if (!live) { setDone({ thankYou: `${def.checkout?.thankYou || 'Thanks!'} (preview — no order created)` }); return; }
    setBusy(true); setError('');
    try {
      const r = await api(`/public/apps/${appId}/order`, { method: 'POST', body: { items: items.map(({ id, qty }) => ({ id, qty })), customer: { ...customer, address: def.checkout?.collectAddress ? customer.address : null } } });
      if (r.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
      setDone(r); setCart({});
    } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const setC = (k) => (e) => setCustomer({ ...customer, [k]: e.target.value });
  const setA = (k) => (e) => setCustomer({ ...customer, address: { ...customer.address, [k]: e.target.value } });

  const btn = { background: t.primary, color: '#fff', border: 0, padding: '10px 16px', borderRadius: 8, fontWeight: 600, width: '100%', justifyContent: 'center' };
  return (
    <div style={{ background: t.background || '#f4f5f9', minHeight: '100%', padding: '20px 12px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        {t.logo && <img src={t.logo} alt="" style={{ maxHeight: 64, display: 'block', margin: '0 auto 12px' }} />}
        {done ? (
          <div className="panel" style={{ textAlign: 'center', padding: 30 }}><h2>✓</h2><p>{done.thankYou}</p><button onClick={() => { setDone(null); setCheckout(false); }}>Back</button></div>
        ) : openForm ? (
          <div>
            <button className="small" onClick={() => setOpenForm(null)} style={{ marginBottom: 8 }}><Icon name="back" size={14} />Back</button>
            <iframe title="form" src={`/embed/${openForm}`} style={{ width: '100%', minHeight: 640, border: 0, borderRadius: 8, background: '#fff' }} />
          </div>
        ) : checkout ? (
          <div className="panel">
            <button className="small" onClick={() => setCheckout(false)}><Icon name="back" size={14} />Back to cart</button>
            <h2 style={{ marginTop: 10 }}>Checkout</h2>
            {items.map((i) => <div key={i.id} className="row"><span>{i.name} × {i.qty}</span><span className="right">{money(def.currency, i.price * i.qty)}</span></div>)}
            <div className="row" style={{ fontWeight: 700, borderTop: '1px solid var(--border)', marginTop: 6, paddingTop: 6 }}><span>Total</span><span className="right">{money(def.currency, total)}</span></div>
            <label className="lbl">Name</label><input value={customer.name} onChange={setC('name')} />
            <label className="lbl">E-mail</label><input type="email" value={customer.email} onChange={setC('email')} />
            {def.checkout?.collectPhone && (<><label className="lbl">Phone</label><input value={customer.phone} onChange={setC('phone')} /></>)}
            {def.checkout?.collectAddress && (
              <>
                <label className="lbl">Shipping address</label>
                <input placeholder="Street" value={customer.address.street} onChange={setA('street')} />
                <div className="grid2" style={{ marginTop: 6 }}>
                  <input placeholder="City" value={customer.address.city} onChange={setA('city')} />
                  <input placeholder="State" value={customer.address.state} onChange={setA('state')} />
                  <input placeholder="ZIP" value={customer.address.zip} onChange={setA('zip')} />
                  <input placeholder="Country" value={customer.address.country} onChange={setA('country')} />
                </div>
              </>
            )}
            <label className="lbl">Order note</label><textarea rows={2} value={customer.note} onChange={setC('note')} />
            {error && <p className="error">{error}</p>}
            <button style={{ ...btn, marginTop: 12 }} disabled={busy} onClick={order}>{busy ? 'Placing order…' : `Pay ${money(def.currency, total)}`}</button>
          </div>
        ) : (
          <>
            {def.elements.map((e) => {
              switch (e.type) {
                case 'heading': return <h1 key={e.id} style={{ textAlign: 'center', fontSize: 26 }}>{e.text}</h1>;
                case 'text': return <p key={e.id} style={{ textAlign: 'center', whiteSpace: 'pre-wrap' }}>{e.text}</p>;
                case 'image': return e.src ? <img key={e.id} src={e.src} alt="" style={{ width: '100%', borderRadius: 8, margin: '8px 0' }} /> : null;
                case 'link': case 'button':
                  return <a key={e.id} href={safeUrl(e.url) || undefined} target="_blank" rel="noreferrer" className="btn" style={{ ...btn, margin: '6px 0', display: 'flex', ...(e.type === 'link' ? { background: '#fff', color: t.primary, border: `1px solid ${t.primary}` } : {}) }}>{e.label || e.url}</a>;
                case 'form':
                  return (
                    <div key={e.id} className="card" style={{ margin: '8px 0', display: 'flex', alignItems: 'center', gap: 12 }} onClick={() => e.formId && setOpenForm(e.formId)}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: t.primary, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📝</div>
                      <div><b>{e.label || forms[e.formId] || 'Form'}</b><div className="hint">{e.formId ? (forms[e.formId] ? 'Tap to open' : 'Form unavailable') : 'Choose a form in the editor'}</div></div>
                    </div>
                  );
                case 'products':
                  return (
                    <div key={e.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, margin: '10px 0' }}>
                      {products.map((p) => (
                        <div key={p.id} className="panel" style={{ padding: 10, margin: 0 }}>
                          {p.image && <img src={p.image} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} />}
                          <b>{p.name}</b>
                          {p.description && <div className="hint">{p.description}</div>}
                          <div style={{ fontWeight: 700, margin: '6px 0' }}>{money(def.currency, p.price)}</div>
                          {cart[p.id] ? (
                            <div className="row"><button className="small" onClick={() => add(p.id, -1)}>−</button><b>{cart[p.id]}</b><button className="small" onClick={() => add(p.id, 1)}>+</button></div>
                          ) : <button className="small" style={{ background: t.primary, color: '#fff', border: 0 }} onClick={() => add(p.id, 1)}>Add to cart</button>}
                        </div>
                      ))}
                    </div>
                  );
                default: return null;
              }
            })}
            {kind === 'store' && items.length > 0 && (
              <div style={{ position: 'sticky', bottom: 10 }}>
                <button style={btn} onClick={() => setCheckout(true)}>Checkout · {items.reduce((s, i) => s + i.qty, 0)} item(s) · {money(def.currency, total)}</button>
              </div>
            )}
          </>
        )}
        {branding && <div className="wf-branding">Made with <b>WpForms by GlixWordpress</b></div>}
      </div>
    </div>
  );
}
