import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { WidgetInput, WidgetDisplay } from './Widgets.jsx';
import Icon from './Icon.jsx';

const today = () => new Date().toISOString().slice(0, 10);
// Locale-aware price (₹1,499.00 for INR); falls back to "CUR 0.00" for unknown codes.
const money = (n, cur) => {
  try { return new Intl.NumberFormat(cur === 'INR' ? 'en-IN' : undefined, { style: 'currency', currency: cur || 'USD' }).format(Number(n) || 0); }
  catch { return `${cur} ${Number(n || 0).toFixed(2)}`; }
};
// Translated display label for a stored option value (see shared/i18n.js).
const L = (f, o, kind = 'option') => f[`${kind}Labels`]?.[o] ?? o;

export function SignaturePad({ value, onChange, disabled }) {
  const ref = useRef(null);
  const drawing = useRef(false);
  useEffect(() => {
    const c = ref.current;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio); ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    if (value) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, c.offsetWidth, c.offsetHeight); img.src = value; }
  }, []);
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  const down = (e) => { if (disabled) return; drawing.current = true; const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...pos(e)); ref.current.setPointerCapture(e.pointerId); };
  const move = (e) => { if (!drawing.current) return; const ctx = ref.current.getContext('2d'); ctx.lineTo(...pos(e)); ctx.stroke(); };
  const up = () => { if (!drawing.current) return; drawing.current = false; onChange(ref.current.toDataURL('image/png')); };
  const clear = () => { const c = ref.current; c.getContext('2d').clearRect(0, 0, c.width, c.height); onChange(''); };
  return (
    <div className="wf-sig">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <div><button type="button" className="link small" onClick={clear}>Clear</button></div>
    </div>
  );
}

function Choices({ f, value, onChange, multi }) {
  const list = multi ? (Array.isArray(value) ? value : []) : value;
  const opts = f.options || [];
  const otherVal = multi ? list.find((v) => !opts.includes(v)) : (value && !opts.includes(value) ? value : null);
  const [otherOn, setOtherOn] = useState(otherVal != null);
  const toggle = (o) => {
    if (!multi) return onChange(o);
    onChange(list.includes(o) ? list.filter((x) => x !== o) : [...list, o]);
  };
  return (
    <div className="wf-choices" style={{ gridTemplateColumns: `repeat(${f.columns || 1}, 1fr)` }}>
      {opts.map((o) => (
        <label key={o}>
          <input type={multi ? 'checkbox' : 'radio'} name={f.id} checked={multi ? list.includes(o) : value === o} onChange={() => { setOtherOn(false); toggle(o); }} />
          {L(f, o)}
        </label>
      ))}
      {f.other && (
        <label>
          <input type={multi ? 'checkbox' : 'radio'} name={f.id} checked={otherOn} onChange={(e) => {
            const on = multi ? e.target.checked : true;
            setOtherOn(on);
            if (!on) onChange(list.filter((x) => opts.includes(x)));
            else if (!multi) onChange('');
          }} />
          Other
          {otherOn && (
            <input style={{ maxWidth: 220 }} value={otherVal || ''} onChange={(e) => {
              const v = e.target.value;
              onChange(multi ? [...list.filter((x) => opts.includes(x)), ...(v ? [v] : [])] : v);
            }} />
          )}
        </label>
      )}
    </div>
  );
}

function Products({ f, value, onChange }) {
  const items = value?.items || [];
  const sel = (id) => items.find((i) => i.id === id);
  const set = (next) => {
    const total = next.reduce((s, i) => s + (f.products.find((p) => p.id === i.id)?.price || 0) * i.qty, 0);
    onChange(next.length ? { items: next, total, currency: f.currency } : null);
  };
  const total = value?.total || 0;
  return (
    <div className="wf-products">
      {(f.products || []).map((p) => {
        const s = sel(p.id);
        return (
          <div className="prod" key={p.id}>
            <input type={f.singleChoice ? 'radio' : 'checkbox'} name={f.id} aria-label={p.name} checked={!!s}
              onChange={(e) => set(f.singleChoice ? [{ id: p.id, name: p.name, qty: 1 }] : e.target.checked ? [...items, { id: p.id, name: p.name, qty: 1 }] : items.filter((i) => i.id !== p.id))} />
            <div className="grow">
              <div><b>{p.name}</b></div>
              {p.description && <div className="wf-desc">{p.description}</div>}
            </div>
            <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(p.price, f.currency)}</div>
            {f.quantity && (
              <input type="number" min="1" max="9999" style={{ width: 70 }} aria-label={`Quantity of ${p.name}`} value={s?.qty || 1} disabled={!s}
                onChange={(e) => set(items.map((i) => (i.id === p.id ? { ...i, qty: Math.max(1, Number(e.target.value) || 1) } : i)))} />
            )}
          </div>
        );
      })}
      <div className="wf-total"><span>Total</span><span>{money(total, f.currency)}</span></div>
    </div>
  );
}

function FileUpload({ f, value, onChange, formId, mode }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const files = Array.isArray(value) ? value : value ? [value] : [];
  const pick = async (e) => {
    const list = [...e.target.files];
    e.target.value = '';
    setErr('');
    const out = [];
    for (const file of list) {
      if (file.size > (Number(f.maxSizeMb) || 10) * 1024 * 1024) { setErr(`${file.name} exceeds ${f.maxSizeMb} MB`); continue; }
      if (mode !== 'live') { out.push({ id: 'preview', name: file.name, size: file.size }); continue; }
      const fd = new FormData();
      fd.append('field', f.id);
      fd.append('file', file);
      setBusy(true);
      try { out.push(await api(`/public/forms/${formId}/upload`, { method: 'POST', form: fd })); } catch (x) { setErr(x.message); }
      setBusy(false);
    }
    onChange(f.multiple ? [...files, ...out] : out.slice(0, 1));
  };
  return (
    <div>
      <input type="file" multiple={!!f.multiple} accept={f.accept || undefined} onChange={pick} disabled={busy} />
      {busy && <div className="hint">Uploading…</div>}
      {err && <div className="wf-err">{err}</div>}
      {files.map((x, i) => (
        <div key={i} className="row hint"><Icon name="file" size={14} /> {x.name} <button type="button" className="link small" onClick={() => onChange(files.filter((_, j) => j !== i))}>remove</button></div>
      ))}
    </div>
  );
}

function Appointment({ f, value, onChange, formId, mode }) {
  const v = value || {};
  const [booked, setBooked] = useState([]);
  useEffect(() => {
    if (!v.date || mode !== 'live') return;
    api(`/public/forms/${formId}/booked?date=${v.date}`).then((b) => setBooked(b[f.id] || [])).catch(() => {});
  }, [v.date]);
  return (
    <div>
      <input type="date" value={v.date || ''} min={f.disablePast ? today() : undefined} onChange={(e) => onChange({ date: e.target.value, slot: '' })} style={{ maxWidth: 220 }} />
      {v.date && (
        <div className="wf-slots">
          {(f.slots || []).map((s) => (
            <button type="button" key={s} disabled={booked.includes(s)} className={v.slot === s ? 'on' : ''} onClick={() => onChange({ ...v, slot: s })}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// The challenge is issued and checked by the server; each one can be answered once.
function Captcha({ value, onChange }) {
  const [q, setQ] = useState(null);
  const [failed, setFailed] = useState(false);
  const load = () => fetch('/api/public/captcha').then((r) => r.json()).then((c) => { setQ(c); setFailed(false); onChange({ ...c, answer: '' }); }).catch(() => setFailed(true));
  useEffect(() => { load(); }, []);
  if (failed) return <button type="button" className="wf-btn secondary" onClick={load}>Load the question again</button>;
  if (!q) return <span className="hint">Loading question…</span>;
  return (
    <div className="row">
      <span>What is {q.a} + {q.b}?</span>
      <input inputMode="numeric" style={{ width: 90 }} aria-label={`What is ${q.a} plus ${q.b}`} value={value?.answer || ''} onChange={(e) => onChange({ ...q, answer: e.target.value })} />
      <button type="button" className="link small" onClick={load}>New question</button>
    </div>
  );
}

function FillBlank({ f, value, onChange }) {
  const obj = value || {};
  const parts = String(f.text || '').split('{blank}');
  return (
    <div className="wg-fillblank">
      {parts.map((t, i) => (
        <span key={i}>
          {t}
          {i < parts.length - 1 && <input aria-label={`Blank ${i + 1}`} value={obj[i] || ''} onChange={(e) => onChange({ ...obj, [i]: e.target.value })} />}
        </span>
      ))}
    </div>
  );
}

function Spinner({ f, value, onChange }) {
  const step = Number(f.step) || 1;
  const n = value === '' || value == null ? Number(f.min) || 0 : Number(value);
  const clamp = (x) => Math.min(f.max === '' || f.max == null ? Infinity : Number(f.max), Math.max(f.min === '' || f.min == null ? -Infinity : Number(f.min), x));
  return (
    <div className="wg-stepper">
      <button type="button" aria-label="Decrease" onClick={() => onChange(clamp(n - step))}>−</button>
      <input type="number" aria-label={f.label} value={value ?? ''} min={f.min} max={f.max} step={step} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} />
      <button type="button" aria-label="Increase" onClick={() => onChange(clamp(n + step))}>+</button>
    </div>
  );
}

function Donation({ f, value, onChange }) {
  const v = value || {};
  const amounts = (f.amounts || []).map(Number).filter((x) => x > 0);
  const set = (amount) => onChange({ amount, currency: f.currency });
  return (
    <div className="stack">
      <div className="wf-seg wrap" role="radiogroup" aria-label="Amount">
        {amounts.map((a) => <button type="button" key={a} role="radio" aria-checked={Number(v.amount) === a} className={Number(v.amount) === a ? 'on' : ''} onClick={() => set(a)}>{money(a, f.currency)}</button>)}
      </div>
      {f.custom && (
        <label style={{ display: 'block' }}>
          <span className="wf-desc" style={{ display: 'block', margin: '0 0 4px' }}>Or enter an amount{f.minAmount ? ` (minimum ${money(f.minAmount, f.currency)})` : ''}</span>
          <input type="number" min={f.minAmount || 1} step="1" value={amounts.includes(Number(v.amount)) ? '' : v.amount ?? ''} onChange={(e) => set(e.target.value === '' ? '' : Number(e.target.value))} style={{ maxWidth: 220 }} />
        </label>
      )}
    </div>
  );
}

function Subscription({ f, value, onChange }) {
  const v = value || {};
  return (
    <div className="wf-choices">
      {(f.plans || []).map((p) => (
        <label key={p.id}>
          <input type="radio" name={f.id} checked={v.plan === p.id} onChange={() => onChange({ plan: p.id })} />
          <span className="grow"><b>{p.name}</b></span>
          <span style={{ fontWeight: 600 }}>{money(p.price, f.currency)} / {p.interval}</span>
        </label>
      ))}
    </div>
  );
}

export function FieldInput({ f, value, onChange, formId, mode, computed, ax = {} }) {
  const v = value ?? '';
  const obj = value || {};
  const sub = (k) => (e) => onChange({ ...obj, [k]: e.target.value });
  switch (f.type) {
    case 'text': return <input {...ax} value={v} placeholder={f.placeholder} maxLength={f.maxLength || undefined} onChange={(e) => onChange(e.target.value)} />;
    case 'textarea': return <textarea {...ax} rows={f.rows || 4} value={v} placeholder={f.placeholder} maxLength={f.maxLength || undefined} onChange={(e) => onChange(e.target.value)} />;
    case 'email': return <input {...ax} type="email" value={v} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'phone': return <input {...ax} type="tel" value={v} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'url': return <input {...ax} type="url" value={v} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case 'number': return <input {...ax} type="number" value={v} min={f.min} max={f.max} step={f.step || 'any'} placeholder={f.placeholder} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 220 }} />;
    case 'date': return <input {...ax} type="date" value={v} min={f.disablePast ? today() : f.minDate || undefined} max={f.maxDate || undefined} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 220 }} />;
    case 'time': return <input {...ax} type="time" value={v} onChange={(e) => onChange(e.target.value)} style={{ maxWidth: 160 }} />;
    case 'fullname':
      return (
        <div className="row wrap">
          {f.prefix && <input style={{ maxWidth: 80 }} placeholder="Prefix" aria-label="Prefix" value={obj.prefix || ''} onChange={sub('prefix')} />}
          <input className="grow" placeholder="First Name" aria-label="First Name" value={obj.first || ''} onChange={sub('first')} />
          {f.middle && <input className="grow" placeholder="Middle" aria-label="Middle" value={obj.middle || ''} onChange={sub('middle')} />}
          <input className="grow" placeholder="Last Name" aria-label="Last Name" value={obj.last || ''} onChange={sub('last')} />
        </div>
      );
    case 'address':
      return (
        <div className="stack">
          <input placeholder="Street Address" aria-label="Street Address" value={obj.street || ''} onChange={sub('street')} />
          <input placeholder="Street Address Line 2" aria-label="Street Address Line 2" value={obj.street2 || ''} onChange={sub('street2')} />
          <div className="grid2">
            <input placeholder="City" aria-label="City" value={obj.city || ''} onChange={sub('city')} />
            <input placeholder="State / Province" aria-label="State / Province" value={obj.state || ''} onChange={sub('state')} />
            <input placeholder="Postal / Zip Code" aria-label="Postal / Zip Code" value={obj.zip || ''} onChange={sub('zip')} />
            <input placeholder="Country" aria-label="Country" value={obj.country || ''} onChange={sub('country')} />
          </div>
        </div>
      );
    case 'dropdown':
      return (
        <select {...ax} value={v} onChange={(e) => onChange(e.target.value)}>
          <option value="">{f.placeholder || 'Please Select'}</option>
          {(f.options || []).map((o) => <option key={o} value={o}>{L(f, o)}</option>)}
        </select>
      );
    case 'radio': return <Choices f={f} value={value} onChange={onChange} />;
    case 'checkbox': return <Choices f={f} value={value} onChange={onChange} multi />;
    case 'yesno':
      return (
        <div className="wf-seg">
          {[f.yesLabel || 'Yes', f.noLabel || 'No'].map((o, i) => (
            <button type="button" key={o} className={v === (i ? 'No' : 'Yes') ? 'on' : ''} onClick={() => onChange(i ? 'No' : 'Yes')}>{o}</button>
          ))}
        </div>
      );
    case 'rating':
      return (
        <div className="wf-stars">
          {Array.from({ length: Number(f.stars) || 5 }, (_, i) => (
            <button type="button" key={i} className={Number(v) > i ? 'on' : ''} onClick={() => onChange(i + 1)} aria-label={`${i + 1} stars`}>★</button>
          ))}
        </div>
      );
    case 'scale': {
      const from = Number(f.from ?? 1), to = Number(f.to ?? 5);
      return (
        <div>
          <div className="wf-scale">
            {Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i).map((n) => (
              <button type="button" key={n} className={Number(v) === n && v !== '' ? 'on' : ''} onClick={() => onChange(n)}>{n}</button>
            ))}
          </div>
          <div className="row hint" style={{ justifyContent: 'space-between', maxWidth: 42 * (to - from + 1) }}><span>{f.lowLabel}</span><span>{f.highLabel}</span></div>
        </div>
      );
    }
    case 'slider':
      return (
        <div className="row">
          <input type="range" min={f.min} max={f.max} step={f.step} value={v === '' ? f.min : v} onChange={(e) => onChange(Number(e.target.value))} />
          <b style={{ minWidth: 40 }}>{v === '' ? '-' : v}</b>
        </div>
      );
    case 'matrix':
      return (
        <table className="wf-matrix">
          <thead><tr><th></th>{(f.columns || []).map((c) => <th key={c}>{L(f, c, 'column')}</th>)}</tr></thead>
          <tbody>
            {(f.rows || []).map((r) => (
              <tr key={r}>
                <td>{L(f, r, 'row')}</td>
                {(f.columns || []).map((c) => (
                  <td key={c}><input type="radio" name={`${f.id}-${r}`} checked={obj[r] === c} onChange={() => onChange({ ...obj, [r]: c })} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'file': return <FileUpload f={f} value={value} onChange={onChange} formId={formId} mode={mode} />;
    case 'signature': return <SignaturePad value={value} onChange={onChange} />;
    case 'products': return <Products f={f} value={value} onChange={onChange} />;
    case 'appointment': return <Appointment f={f} value={value} onChange={onChange} formId={formId} mode={mode} />;
    case 'terms':
      return <label className="row" style={{ fontWeight: 400 }}><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.text}</label>;
    case 'captcha': return <Captcha value={value} onChange={onChange} />;
    case 'calculation': {
      const n = computed;
      const shown = n === '' || n == null ? '-' : Number(n).toFixed(Number(f.decimals ?? 2));
      return <input readOnly value={`${f.prefix || ''}${shown}${f.suffix || ''}`} style={{ maxWidth: 240, background: '#f6f7fb' }} />;
    }
    case 'hidden': return null;
    case 'fillblank': return <FillBlank f={f} value={value} onChange={onChange} />;
    case 'spinner': return <Spinner f={f} value={value} onChange={onChange} />;
    case 'donation': return <Donation f={f} value={value} onChange={onChange} />;
    case 'subscription': return <Subscription f={f} value={value} onChange={onChange} />;
    case 'widget': return <WidgetInput f={f} value={value} onChange={onChange} formId={formId} mode={mode} computed={computed} />;
    default: return <div className="hint">Unsupported field: {f.type}</div>;
  }
}

export function DisplayBlock({ f }) {
  switch (f.type) {
    case 'heading':
      return <div className="wf-heading"><h2>{f.label}</h2>{f.subheading && <div className="muted">{f.subheading}</div>}</div>;
    case 'paragraph': return <div style={{ whiteSpace: 'pre-wrap' }}>{f.text}</div>;
    case 'image': return f.src ? <img src={f.src} alt={f.alt} style={{ width: `${f.width || 100}%`, borderRadius: 4 }} /> : <div className="hint">[Image — set a URL]</div>;
    case 'divider': return <hr style={{ border: 0, borderTop: '1px solid #e5e7ef' }} />;
    case 'pagebreak': return <div className="page-sep">— Page Break —</div>;
    case 'section': return <div className="wg-section"><h3 style={{ margin: 0 }}>{f.label}</h3>{f.subheading && <div className="wf-desc">{f.subheading}</div>}</div>;
    case 'widget': return <WidgetDisplay f={f} />;
    default: return null;
  }
}
