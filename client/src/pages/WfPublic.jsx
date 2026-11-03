// No-login pages reached from workflow e-mails: approve/reject or complete a task, and the status tracking page.
import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';

export function WfTask({ token }) {
  const [t, setT] = useState(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState('');
  useEffect(() => { api(`/public/wf-task/${token}`).then(setT).catch((e) => setErr(e.message)); }, [token]);
  const decide = async (decision) => {
    try { await api(`/public/wf-task/${token}`, { method: 'POST', body: { decision, note } }); setDone(decision); } catch (e) { setErr(e.message); }
  };
  if (err) return <div className="page" style={{ maxWidth: 720 }}><div className="panel error">{err}</div></div>;
  if (!t) return <div className="page muted">Loading…</div>;
  const finished = done || (t.status !== 'pending' && t.status);
  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <div className="panel" style={{ padding: 28 }}>
        <span className="pill teal">{t.kind === 'approval' ? 'Approval request' : 'Task'}</span>
        <h1 style={{ margin: '12px 0 4px' }}>{t.title}</h1>
        <p className="hint">{t.workflow} · {t.form} · submission #{t.submissionId} · {fmtDate(t.createdAt)}</p>
        {t.message && <p style={{ whiteSpace: 'pre-wrap' }}>{t.message}</p>}
        <dl className="answers">{t.answers.map((a, i) => <div key={i}><dt>{a.label}</dt><dd>{a.value || '—'}</dd></div>)}</dl>
        {finished ? (
          <p className="panel" role="status" style={{ marginTop: 20, background: 'var(--accent-soft)' }}>Thanks — this {t.kind} is marked <b>{finished}</b>. You can close this page.</p>
        ) : (
          <>
            <label className="lbl" htmlFor="wf-note">Note (optional)</label>
            <textarea id="wf-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="row" style={{ marginTop: 14 }}>
              {t.kind === 'approval' ? (
                <>
                  <button className="accent grow" style={{ minHeight: 48 }} onClick={() => decide('approved')}>Approve</button>
                  <button className="grow danger" style={{ minHeight: 48 }} onClick={() => decide('rejected')}>Reject</button>
                </>
              ) : <button className="accent grow" style={{ minHeight: 48 }} onClick={() => decide('done')}>Mark as done</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Track({ token }) {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/public/track/${token}`).then(setD).catch((e) => setErr(e.message)); }, [token]);
  if (err) return <div className="page" style={{ maxWidth: 640 }}><div className="panel error">{err}</div></div>;
  if (!d) return <div className="page muted">Loading…</div>;
  const finished = ['completed', 'cancelled', 'failed'].includes(d.status);
  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="track-card" style={{ '--tc': d.color }}>
        <div className="row"><h1 className="grow" style={{ margin: 0, fontSize: 22 }}>{d.title}</h1><span className={`pill ${d.status === 'completed' ? 'green' : 'amber'}`}>{d.label}</span></div>
        <p className="hint">{d.message}</p>
        <ol className="track-steps">
          {d.milestones.map((m, i) => <li key={i} className={i === d.milestones.length - 1 && !finished ? 'current' : 'done'}><b>{m.label}</b><span>{fmtDate(m.at)}</span></li>)}
        </ol>
      </div>
    </div>
  );
}
