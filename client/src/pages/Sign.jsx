import { useEffect, useRef, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { navigate } from '../router.js';
import PdfPages from '../components/PdfPages.jsx';
import Icon from '../components/Icon.jsx';

const TYPES = [['signature', 'Signature', 0.25, 0.06], ['initials', 'Initials', 0.1, 0.05], ['name', 'Full name', 0.25, 0.03], ['date', 'Date signed', 0.15, 0.03], ['text', 'Text', 0.25, 0.03], ['checkbox', 'Checkbox', 0.03, 0.02]];
const COLORS = ['#2563eb', '#16a34a', '#d97706', '#db2777', '#7c3aed', '#0891b2', '#dc2626', '#4b5563', '#65a30d', '#9333ea'];
const statusPill = (s) => <span className={`pill ${{ completed: 'green', sent: 'blue', voided: 'red', signed: 'green', viewed: 'amber' }[s] || ''}`}>{s}</span>;

export function SignList() {
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => api('/sign/docs').then(setDocs);
  useEffect(() => { load(); }, []);
  const upload = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    const fd = new FormData();
    fd.append('file', file);
    try { const { id } = await api('/sign/docs', { method: 'POST', form: fd }); navigate(`/sign-docs/${id}`); } catch (x) { setError(x.message); }
    setBusy(false);
  };
  return (
    <div className="page">
      <div className="row" style={{ marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>E-Sign Documents</h1>
        <label className="btn primary right" style={{ cursor: 'pointer' }}>{busy ? 'Uploading…' : '+ Upload PDF to sign'}<input type="file" accept="application/pdf" hidden onChange={upload} /></label>
      </div>
      <p className="hint">Upload a PDF, place signature and text fields, and send it to one or more signers. Everyone receives the signed PDF with an audit trail when the last person signs.</p>
      {error && <p className="error">{error}</p>}
      <table className="tbl" style={{ border: '1px solid var(--border)' }}>
        <thead><tr><th>Document</th><th>Status</th><th>Signed</th><th>Created</th><th></th></tr></thead>
        <tbody>
          {docs.map((d) => (
            <tr key={d.id}>
              <td><a href={`#/sign-docs/${d.id}`}><b>{d.title}</b></a></td>
              <td>{statusPill(d.status)}</td>
              <td>{d.signed} / {d.signers}</td>
              <td className="hint">{fmtDate(d.created_at)}</td>
              <td style={{ textAlign: 'right' }}>
                {d.status === 'completed' && <a className="btn small" href={`/api/sign/docs/${d.id}/pdf?signed=1&download=1`}>Signed PDF</a>}{' '}
                <button className="small danger" onClick={async () => { if (confirm('Delete this document?')) { await api(`/sign/docs/${d.id}`, { method: 'DELETE' }); load(); } }}>Delete</button>
              </td>
            </tr>
          ))}
          {!docs.length && <tr><td colSpan={5} className="muted">No documents yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export function SignEditor({ id }) {
  const [doc, setDoc] = useState(null);
  const [tool, setTool] = useState('signature');
  const [signerIdx, setSignerIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState('');
  const drag = useRef(null);
  const load = () => api(`/sign/docs/${id}`).then((d) => setDoc({ ...d, signers: d.signers.length ? d.signers : [{ name: '', email: '' }] }));
  useEffect(() => { load(); }, [id]);
  if (!doc) return <div className="page muted">Loading…</div>;
  const draft = doc.status === 'draft';
  const set = (patch) => setDoc((d) => ({ ...d, ...patch }));
  const setField = (fid, patch) => set({ fields: doc.fields.map((f) => (f.id === fid ? { ...f, ...patch } : f)) });

  const place = (e, page, size) => {
    if (!draft || e.target !== e.currentTarget) return;
    const r = e.currentTarget.getBoundingClientRect();
    const [, label, w, h] = TYPES.find((t) => t[0] === tool);
    const f = { id: `f${Date.now().toString(36)}`, type: tool, page, signer: signerIdx, label, required: true, w, h,
      x: Math.min(1 - w, Math.max(0, (e.clientX - r.left) / size.w - w / 2)), y: Math.min(1 - h, Math.max(0, (e.clientY - r.top) / size.h - h / 2)) };
    set({ fields: [...doc.fields, f] });
    setSelected(f.id);
  };
  const startDrag = (e, f, size, mode) => {
    if (!draft) return;
    e.stopPropagation();
    setSelected(f.id);
    drag.current = { id: f.id, mode, sx: e.clientX, sy: e.clientY, f, size };
    const move = (ev) => {
      const d = drag.current;
      const dx = (ev.clientX - d.sx) / d.size.w, dy = (ev.clientY - d.sy) / d.size.h;
      if (d.mode === 'move') setField(d.id, { x: Math.min(1 - d.f.w, Math.max(0, d.f.x + dx)), y: Math.min(1 - d.f.h, Math.max(0, d.f.y + dy)) });
      else setField(d.id, { w: Math.max(0.02, Math.min(1 - d.f.x, d.f.w + dx)), h: Math.max(0.015, Math.min(1 - d.f.y, d.f.h + dy)) });
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };
  const save = async () => {
    setMsg('');
    try { await api(`/sign/docs/${id}`, { method: 'PUT', body: { title: doc.title, message: doc.message, fields: doc.fields, signers: doc.signers } }); setMsg('Saved.'); return true; } catch (e) { setMsg(e.message); return false; }
  };
  const send = async () => {
    if (!(await save())) return;
    try { await api(`/sign/docs/${id}/send`, { method: 'POST' }); load(); setMsg('Sent! Signers received their links (see Outbox).'); } catch (e) { setMsg(e.message); }
  };
  const sel = doc.fields.find((f) => f.id === selected);

  return (
    <div className="builder" style={{ gridTemplateColumns: '280px 1fr' }}>
      <div className="palette" style={{ padding: 12 }}>
        <a href="#/sign-docs"><Icon name="back" size={14} />All documents</a>
        <label className="lbl">Title</label>
        <input value={doc.title} disabled={!draft} onChange={(e) => set({ title: e.target.value })} />
        <div style={{ marginTop: 8 }}>Status: {statusPill(doc.status)}</div>
        <h4>Signers</h4>
        {doc.signers.map((s, i) => (
          <div key={i} className="panel" style={{ padding: 8, marginBottom: 6, borderLeft: `4px solid ${COLORS[i]}` }}>
            {draft ? (
              <>
                <div className="row"><input placeholder="Name" value={s.name} onChange={(e) => set({ signers: doc.signers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                  {doc.signers.length > 1 && <button className="small danger" onClick={() => set({ signers: doc.signers.filter((_, j) => j !== i), fields: doc.fields.filter((f) => f.signer !== i).map((f) => (f.signer > i ? { ...f, signer: f.signer - 1 } : f)) })}><Icon name="close" size={14} /></button>}</div>
                <input style={{ marginTop: 4 }} placeholder="E-mail" value={s.email} onChange={(e) => set({ signers: doc.signers.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)) })} />
                <label className="row hint" style={{ marginTop: 4 }}><input type="radio" checked={signerIdx === i} onChange={() => setSignerIdx(i)} /> place fields for this signer</label>
              </>
            ) : (
              <>
                <b>{s.name}</b> {statusPill(s.status)}<div className="hint">{s.email}</div>
                {s.signed_at && <div className="hint">Signed {fmtDate(s.signed_at)}</div>}
                {s.link && <div className="hint" style={{ wordBreak: 'break-all' }}>Link: <a href={s.link} target="_blank" rel="noreferrer">{s.link}</a></div>}
              </>
            )}
          </div>
        ))}
        {draft && doc.signers.length < 10 && <button className="small" onClick={() => set({ signers: [...doc.signers, { name: '', email: '' }] })}>+ Add signer</button>}
        {draft && (
          <>
            <h4>Field to place</h4>
            {TYPES.map(([t, l]) => (
              <div key={t} className="item" style={{ borderColor: tool === t ? COLORS[signerIdx] : undefined, cursor: 'pointer' }} onClick={() => setTool(t)}>{tool === t ? '●' : '○'} {l}</div>
            ))}
            <p className="hint">Click on the document to place the field; drag to move, drag the corner to resize.</p>
            {sel && (
              <div className="panel" style={{ padding: 8 }}>
                <b>{sel.label}</b>
                <label className="lbl">Label</label><input value={sel.label} onChange={(e) => setField(sel.id, { label: e.target.value })} />
                <label className="lbl">Signer</label>
                <select value={sel.signer} onChange={(e) => setField(sel.id, { signer: Number(e.target.value) })}>{doc.signers.map((s, i) => <option key={i} value={i}>{s.name || `Signer ${i + 1}`}</option>)}</select>
                <label className="row" style={{ marginTop: 6 }}><input type="checkbox" checked={sel.required} onChange={(e) => setField(sel.id, { required: e.target.checked })} /> Required</label>
                <button className="small danger" style={{ marginTop: 6 }} onClick={() => { set({ fields: doc.fields.filter((f) => f.id !== sel.id) }); setSelected(null); }}>Remove field</button>
              </div>
            )}
            <label className="lbl">Message to signers</label>
            <textarea rows={3} value={doc.message} onChange={(e) => set({ message: e.target.value })} />
            <div className="row" style={{ marginTop: 10 }}>
              <button onClick={save}>Save draft</button>
              <button className="primary" onClick={send}>Send for signature</button>
            </div>
          </>
        )}
        {!draft && (
          <div className="stack" style={{ marginTop: 12 }}>
            <a className="btn" href={`/api/sign/docs/${id}/pdf`} target="_blank" rel="noreferrer">Original PDF</a>
            {doc.status === 'completed' && <a className="btn primary" href={`/api/sign/docs/${id}/pdf?signed=1&download=1`}>Download signed PDF</a>}
            {doc.status === 'sent' && <button className="danger" onClick={async () => { if (confirm('Void this document? Signers can no longer sign.')) { await api(`/sign/docs/${id}/void`, { method: 'POST' }); load(); } }}>Void document</button>}
          </div>
        )}
        {msg && <p className="hint">{msg}</p>}
      </div>
      <div className="canvas" style={{ background: '#e9ebf1' }}>
        <PdfPages url={`/api/sign/docs/${id}/pdf${doc.status === 'completed' ? '?signed=1' : ''}`} overlay={(page, size) => (
          <div style={{ position: 'absolute', inset: 0, cursor: draft ? 'crosshair' : 'default' }} onClick={(e) => place(e, page, size)}>
            {doc.status !== 'completed' && doc.fields.filter((f) => f.page === page).map((f) => (
              <div key={f.id} onPointerDown={(e) => startDrag(e, f, size, 'move')}
                style={{ position: 'absolute', left: f.x * size.w, top: f.y * size.h, width: f.w * size.w, height: f.h * size.h, border: `2px solid ${COLORS[f.signer]}`, background: `${COLORS[f.signer]}22`, fontSize: 11, color: COLORS[f.signer], padding: '0 3px', overflow: 'hidden', cursor: draft ? 'move' : 'default', outline: selected === f.id ? '2px dashed #111' : 'none', userSelect: 'none' }}>
                {f.label}{f.required ? '*' : ''}
                {draft && <div onPointerDown={(e) => startDrag(e, f, size, 'resize')} style={{ position: 'absolute', right: 0, bottom: 0, width: 10, height: 10, background: COLORS[f.signer], cursor: 'nwse-resize' }} />}
              </div>
            ))}
          </div>
        )} />
      </div>
    </div>
  );
}
