import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { api, fmtDate } from '../api.js';
import { navigate } from '../router.js';
import AppView from '../components/AppView.jsx';

const ELEMENTS = [['heading', 'Heading'], ['text', 'Text'], ['form', 'Form'], ['button', 'Button link'], ['link', 'Outline link'], ['image', 'Image'], ['products', 'Product grid']];

export function AppsList() {
  const [apps, setApps] = useState([]);
  const load = () => api('/apps').then(setApps);
  useEffect(() => { load(); }, []);
  const create = async (kind) => { const { id } = await api('/apps', { method: 'POST', body: { kind, title: prompt(kind === 'store' ? 'Store name:' : 'App name:') || undefined } }); navigate(`/apps/${id}`); };
  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Apps & Stores</h1>
        <button className="right" onClick={() => create('app')}>+ New app</button>
        <button className="primary" onClick={() => create('store')}>+ New store</button>
      </div>
      <p className="hint">Apps bundle forms, links and content into one mobile-friendly page people can add to their home screen. Stores add a product catalog, cart and checkout.</p>
      <table className="tbl" style={{ border: '1px solid var(--border)' }}>
        <thead><tr><th>Name</th><th>Type</th><th>Views</th><th>Orders</th><th>Updated</th><th></th></tr></thead>
        <tbody>
          {apps.map((a) => (
            <tr key={a.id}>
              <td><a href={`#/apps/${a.id}`}><b>{a.title}</b></a> {a.status !== 'enabled' && <span className="pill amber">disabled</span>}</td>
              <td>{a.kind}</td><td>{a.views}</td><td>{a.kind === 'store' ? a.orders : '—'}</td>
              <td className="hint">{fmtDate(a.updated_at)}</td>
              <td style={{ textAlign: 'right' }}>
                <a className="btn small" href={`/a/${a.id}`} target="_blank" rel="noreferrer">Open</a>{' '}
                <button className="small danger" onClick={async () => { if (confirm('Delete?')) { await api(`/apps/${a.id}`, { method: 'DELETE' }); load(); } }}>Delete</button>
              </td>
            </tr>
          ))}
          {!apps.length && <tr><td colSpan={6} className="muted">Nothing yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Orders({ id, currency }) {
  const [orders, setOrders] = useState([]);
  const load = () => api(`/apps/${id}/orders`).then(setOrders);
  useEffect(() => { load(); }, [id]);
  return (
    <div className="page">
      <h2>Orders</h2>
      <table className="tbl" style={{ border: '1px solid var(--border)' }}>
        <thead><tr><th>#</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td>{o.id}</td><td className="hint">{fmtDate(o.created_at)}</td>
              <td>{o.customer.name}<div className="hint">{o.customer.email}</div>{o.customer.address && <div className="hint">{Object.values(o.customer.address).filter(Boolean).join(', ')}</div>}{o.customer.note && <div className="hint">“{o.customer.note}”</div>}</td>
              <td>{o.items.map((i) => <div key={i.id}>{i.name} × {i.qty}</div>)}</td>
              <td>{o.currency} {o.total.toFixed(2)}</td>
              <td><span className={`pill ${o.payment?.status === 'paid' ? 'green' : 'amber'}`}>{o.payment?.status} ({o.payment?.provider})</span></td>
              <td>
                <select style={{ width: 'auto' }} value={o.status} onChange={async (e) => { await api(`/orders/${o.id}`, { method: 'PATCH', body: { status: e.target.value } }); load(); }}>
                  <option value="new">New</option><option value="fulfilled">Fulfilled</option><option value="cancelled">Cancelled</option>
                </select>
              </td>
            </tr>
          ))}
          {!orders.length && <tr><td colSpan={7} className="muted">No orders yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function AppEditor({ id, tab = 'build' }) {
  const [app, setApp] = useState(null);
  const [forms, setForms] = useState([]);
  const [state, setState] = useState('saved');
  const [qr, setQr] = useState('');
  const timer = useRef(null);
  useEffect(() => {
    api(`/apps/${id}`).then(setApp);
    api('/forms').then((r) => setForms(r.forms));
    QRCode.toDataURL(`${window.location.origin}/a/${id}`, { width: 160, margin: 1 }).then(setQr);
  }, [id]);
  if (!app) return <div className="page muted">Loading…</div>;
  const def = app.definition;
  const update = (patch, status = app.status) => {
    const next = { ...app, status, definition: { ...def, ...patch } };
    setApp(next); setState('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try { await api(`/apps/${id}`, { method: 'PUT', body: { definition: next.definition, status: next.status } }); setState('saved'); } catch (e) { setState(`error: ${e.message}`); }
    }, 800);
  };
  const setEl = (eid, patch) => update({ elements: def.elements.map((e) => (e.id === eid ? { ...e, ...patch } : e)) });
  const moveEl = (i, d) => { const n = [...def.elements]; [n[i], n[i + d]] = [n[i + d], n[i]]; update({ elements: n }); };
  const formTitles = Object.fromEntries(forms.map((f) => [f.id, f.title]));

  return (
    <div>
      <div className="tabs">
        <a href="#/apps" style={{ alignSelf: 'center', marginRight: 12 }}>←</a>
        <b style={{ alignSelf: 'center', marginRight: 12 }}>{def.title}</b>
        <button className={tab === 'build' ? 'active' : ''} onClick={() => navigate(`/apps/${id}`)}>Build</button>
        {app.kind === 'store' && <button className={tab === 'orders' ? 'active' : ''} onClick={() => navigate(`/apps/${id}/orders`)}>Orders</button>}
        <div className="right row"><span className="hint">{state === 'saved' ? 'All changes saved' : state === 'dirty' ? 'Saving…' : state}</span><a className="btn small primary" href={`/a/${id}`} target="_blank" rel="noreferrer">Open ↗</a></div>
      </div>
      {tab === 'orders' ? <Orders id={id} currency={def.currency} /> : (
        <div className="builder" style={{ gridTemplateColumns: '380px 1fr' }}>
          <div className="props" style={{ borderLeft: 0, borderRight: '1px solid var(--border)' }}>
            <label className="lbl">Title</label><input value={def.title} onChange={(e) => update({ title: e.target.value })} />
            <div className="grid2">
              <div><label className="lbl">Primary color</label><input type="color" value={def.theme.primary} onChange={(e) => update({ theme: { ...def.theme, primary: e.target.value } })} /></div>
              <div><label className="lbl">Background</label><input type="color" value={def.theme.background} onChange={(e) => update({ theme: { ...def.theme, background: e.target.value } })} /></div>
            </div>
            <label className="lbl">Logo URL</label><input value={def.theme.logo} onChange={(e) => update({ theme: { ...def.theme, logo: e.target.value } })} />
            <label className="row" style={{ marginTop: 8 }}><input type="checkbox" checked={app.status === 'enabled'} onChange={(e) => update({}, e.target.checked ? 'enabled' : 'disabled')} /> Published</label>
            <h4 style={{ marginTop: 16 }}>Elements</h4>
            {def.elements.map((e, i) => (
              <div key={e.id} className="panel" style={{ padding: 8, marginBottom: 6 }}>
                <div className="row"><b>{ELEMENTS.find(([t]) => t === e.type)?.[1]}</b>
                  <span className="right"><button className="small" disabled={i === 0} onClick={() => moveEl(i, -1)}>↑</button><button className="small" disabled={i === def.elements.length - 1} onClick={() => moveEl(i, 1)}>↓</button><button className="small danger" onClick={() => update({ elements: def.elements.filter((x) => x.id !== e.id) })}>✕</button></span></div>
                {['heading', 'text'].includes(e.type) && (e.type === 'text' ? <textarea rows={2} value={e.text || ''} onChange={(ev) => setEl(e.id, { text: ev.target.value })} /> : <input value={e.text || ''} onChange={(ev) => setEl(e.id, { text: ev.target.value })} />)}
                {['button', 'link'].includes(e.type) && (<><input placeholder="Label" value={e.label || ''} onChange={(ev) => setEl(e.id, { label: ev.target.value })} /><input style={{ marginTop: 4 }} placeholder="https://" value={e.url || ''} onChange={(ev) => setEl(e.id, { url: ev.target.value })} /></>)}
                {e.type === 'image' && <input placeholder="Image URL" value={e.src || ''} onChange={(ev) => setEl(e.id, { src: ev.target.value })} />}
                {e.type === 'form' && (
                  <>
                    <select value={e.formId || ''} onChange={(ev) => setEl(e.id, { formId: ev.target.value })}><option value="">— choose a form —</option>{forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}</select>
                    <input style={{ marginTop: 4 }} placeholder="Tile label (optional)" value={e.label || ''} onChange={(ev) => setEl(e.id, { label: ev.target.value })} />
                  </>
                )}
                {e.type === 'products' && <div className="hint">Shows the product catalog below.</div>}
              </div>
            ))}
            <select value="" onChange={(e) => e.target.value && update({ elements: [...def.elements, { id: `e${Date.now().toString(36)}`, type: e.target.value }] })}>
              <option value="">+ Add element</option>
              {ELEMENTS.filter(([t]) => t !== 'products' || app.kind === 'store').map(([t, l]) => <option key={t} value={t}>{l}</option>)}
            </select>
            {app.kind === 'store' && (
              <>
                <h4 style={{ marginTop: 16 }}>Products</h4>
                <label className="lbl">Currency</label>
                <select value={def.currency} onChange={(e) => update({ currency: e.target.value })}>{['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'].map((c) => <option key={c}>{c}</option>)}</select>
                {def.products.map((p, i) => (
                  <div key={p.id} className="panel" style={{ padding: 8, margin: '6px 0' }}>
                    <div className="opt-row">
                      <input value={p.name} placeholder="Name" onChange={(e) => update({ products: def.products.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                      <input type="number" style={{ width: 90 }} value={p.price} onChange={(e) => update({ products: def.products.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })} />
                      <button className="small danger" onClick={() => update({ products: def.products.filter((_, j) => j !== i) })}>✕</button>
                    </div>
                    <input value={p.description} placeholder="Description" onChange={(e) => update({ products: def.products.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
                    <input style={{ marginTop: 4 }} value={p.image} placeholder="Image URL" onChange={(e) => update({ products: def.products.map((x, j) => (j === i ? { ...x, image: e.target.value } : x)) })} />
                  </div>
                ))}
                <button className="small" onClick={() => update({ products: [...def.products, { id: `p${Date.now().toString(36)}`, name: 'New product', price: 0, description: '', image: '' }] })}>+ Add product</button>
                <h4 style={{ marginTop: 16 }}>Checkout</h4>
                <label className="row"><input type="checkbox" checked={!!def.checkout.collectAddress} onChange={(e) => update({ checkout: { ...def.checkout, collectAddress: e.target.checked } })} /> Collect shipping address</label>
                <label className="row"><input type="checkbox" checked={!!def.checkout.collectPhone} onChange={(e) => update({ checkout: { ...def.checkout, collectPhone: e.target.checked } })} /> Collect phone</label>
                <label className="lbl">Thank-you message</label>
                <textarea rows={2} value={def.checkout.thankYou} onChange={(e) => update({ checkout: { ...def.checkout, thankYou: e.target.value } })} />
              </>
            )}
            <h4 style={{ marginTop: 16 }}>Share</h4>
            <input readOnly value={`${window.location.origin}/a/${id}`} onFocus={(e) => e.target.select()} />
            {qr && <img src={qr} alt="QR" style={{ marginTop: 8 }} />}
          </div>
          <div className="canvas" style={{ background: '#e9ebf1' }}>
            <div style={{ width: 390, margin: '0 auto', border: '10px solid #1f2433', borderRadius: 32, overflow: 'hidden', height: 760, overflowY: 'auto', background: '#fff' }}>
              <AppView appId={id} kind={app.kind} def={def} forms={formTitles} live={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
