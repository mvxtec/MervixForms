import { useEffect, useState } from 'react';
import { api } from '../api.js';
import PdfPages from '../components/PdfPages.jsx';
import { SignaturePad } from '../components/Fields.jsx';

// Signer view reached from the e-mailed link (#/sign/:token). No login.
export default function SignPublic({ token }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [values, setValues] = useState({});
  const [padFor, setPadFor] = useState(null);
  const [padValue, setPadValue] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const load = () => api(`/public/sign/${token}`).then((x) => {
    setD(x);
    const init = {};
    for (const f of x.fields) { if (f.type === 'name') init[f.id] = x.signer.name; if (f.type === 'date') init[f.id] = new Date().toISOString().slice(0, 10); }
    setValues((v) => ({ ...init, ...v }));
  }).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [token]);

  if (err) return <div className="page"><div className="panel error">{err}</div></div>;
  if (!d) return <div className="page muted">Loading…</div>;
  const open = d.status === 'sent' && d.signer.status !== 'signed' && !done;
  const missing = d.fields.filter((f) => f.required && !values[f.id]);

  const submit = async () => {
    setBusy(true); setErr('');
    try { await api(`/public/sign/${token}`, { method: 'POST', body: { values, consent } }); setDone(true); load(); } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <div>
      <div className="topbar">
        <b>{d.title}</b>
        <span className="hint">from {d.from}</span>
        <div className="right row">
          <a className="btn small" href={`/api/public/sign/${token}/pdf?download=1`}>Download PDF</a>
        </div>
      </div>
      <div className="page" style={{ maxWidth: 900 }}>
        {d.message && <div className="panel" style={{ whiteSpace: 'pre-wrap' }}>{d.message}</div>}
        {!open && (
          <div className="panel" style={{ marginBottom: 16 }}>
            {d.status === 'completed' ? <>✓ Everyone has signed. <a href={`/api/public/sign/${token}/pdf?download=1`}>Download the signed PDF</a>.</>
              : d.signer.status === 'signed' || done ? '✓ Thanks — you signed this document. You will receive the final copy by e-mail once everyone has signed.'
                : `This document is ${d.status}.`}
          </div>
        )}
        {open && (
          <div className="panel" style={{ marginBottom: 16, position: 'sticky', top: 60, zIndex: 5 }}>
            <div className="row wrap">
              <span>Hi <b>{d.signer.name}</b> — fill the highlighted fields ({d.fields.length - missing.length}/{d.fields.length} done).</span>
              <label className="row right"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> I agree to sign electronically</label>
              <button className="primary" disabled={busy || missing.length > 0 || !consent} onClick={submit}>{busy ? 'Signing…' : 'Finish signing'}</button>
            </div>
            {err && <div className="error">{err}</div>}
          </div>
        )}
        <PdfPages url={`/api/public/sign/${token}/pdf`} width={820} overlay={(page, size) => open && (
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {d.fields.filter((f) => f.page === page).map((f) => {
              const style = { position: 'absolute', left: f.x * size.w, top: f.y * size.h, width: f.w * size.w, height: f.h * size.h, pointerEvents: 'auto', border: `2px solid ${values[f.id] ? '#16a34a' : '#d97706'}`, background: values[f.id] ? 'rgba(22,163,74,.08)' : 'rgba(253,230,138,.5)', fontSize: 12 };
              if (f.type === 'signature' || f.type === 'initials') {
                return (
                  <div key={f.id} style={{ ...style, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setPadFor(f); setPadValue(values[f.id] || ''); }}>
                    {values[f.id] ? <img src={values[f.id]} alt="" style={{ maxWidth: '100%', maxHeight: '100%' }} /> : `Click to ${f.type === 'initials' ? 'initial' : 'sign'}`}
                  </div>
                );
              }
              if (f.type === 'checkbox') return <input key={f.id} type="checkbox" style={{ ...style, margin: 0 }} checked={!!values[f.id]} onChange={(e) => setValues({ ...values, [f.id]: e.target.checked })} />;
              return <input key={f.id} type={f.type === 'date' ? 'date' : 'text'} placeholder={f.label} style={{ ...style, padding: '0 4px', borderRadius: 2 }} value={values[f.id] || ''} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} />;
            })}
          </div>
        )} />
      </div>
      {padFor && (
        <div className="modal-back" onClick={() => setPadFor(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{padFor.type === 'initials' ? 'Draw your initials' : 'Draw your signature'}</h3>
            <SignaturePad value={padValue} onChange={setPadValue} />
            <div className="row" style={{ marginTop: 10 }}>
              <button className="primary" disabled={!padValue} onClick={() => { setValues({ ...values, [padFor.id]: padValue }); setPadFor(null); }}>Apply</button>
              <button onClick={() => setPadFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
