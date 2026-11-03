import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { formatValue } from '@shared/fields.js';

// Public approval page reached from the e-mail link (no login).
export default function Approve({ sid, email, token }) {
  const base = `/public/approval/${sid}/${encodeURIComponent(email)}/${token}`;
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const load = () => api(base).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);
  const decide = async (decision) => { await api(base, { method: 'POST', body: { decision, note } }); load(); };

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <h1>Approval request</h1>
      {err && <p className="error">{err}</p>}
      {d && (
        <div className="panel">
          <h2>{d.form.title} <span className="muted">#{d.submission.id}</span></h2>
          <p className="hint">Submitted {fmtDate(d.submission.created_at)} · You are reviewing as {email}</p>
          <table className="tbl"><tbody>
            {d.fields.map((f) => (
              <tr key={f.id}><th style={{ width: '35%', position: 'static' }}>{f.label}</th>
                <td>{f.type === 'signature' && d.submission.data[f.id] ? <img src={d.submission.data[f.id]} alt="signature" style={{ maxWidth: 260 }} /> : formatValue(f, d.submission.data[f.id]) || '—'}</td></tr>
            ))}
          </tbody></table>
          {d.submission.approval === 'pending' ? (
            <div style={{ marginTop: 16 }}>
              <textarea rows={2} placeholder="Optional note" value={note} onChange={(e) => setNote(e.target.value)} />
              <div className="row" style={{ marginTop: 8 }}>
                <button className="primary" onClick={() => decide('approved')}>Approve</button>
                <button className="danger" onClick={() => decide('rejected')}>Reject</button>
              </div>
            </div>
          ) : (
            <p style={{ marginTop: 16 }}>Decision recorded: <b>{d.submission.approval}</b>{d.submission.approval_note && ` — ${d.submission.approval_note}`}</p>
          )}
        </div>
      )}
    </div>
  );
}
