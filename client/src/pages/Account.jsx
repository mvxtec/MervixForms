import { Fragment, useEffect, useState } from 'react';
import { api, fmtBytes, fmtDate } from '../api.js';
import { navigate } from '../router.js';
import { useMe } from '../App.jsx';

const LIMITS = [
  ['forms', 'Forms', (n) => n],
  ['submissionsPerMonth', 'Monthly submissions', (n) => n],
  ['viewsPerMonth', 'Monthly form views', (n) => n?.toLocaleString()],
  ['totalSubmissions', 'Total submission storage', (n) => n?.toLocaleString()],
  ['uploadBytes', 'Upload space', fmtBytes],
  ['paymentsPerMonth', 'Monthly payment submissions', (n) => n],
  ['signaturesPerMonth', 'Monthly signed documents', (n) => n],
  ['fieldsPerForm', 'Fields per form', (n) => n],
];

function Plan() {
  const me = useMe();
  const [busy, setBusy] = useState('');
  const ownWs = me.workspace.id === me.user.id;
  const choose = async (key) => { setBusy(key); await api('/me/plan', { method: 'POST', body: { plan: key } }); await me.refresh(); setBusy(''); };
  return (
    <>
      <div className="panel">
        <h2>Usage this month — {me.plan.name} plan</h2>
        <table className="tbl"><tbody>
          {LIMITS.filter(([k]) => k !== 'fieldsPerForm').map(([k, label, fmt]) => {
            const used = me.usage[k] ?? 0, limit = me.plan[k];
            const pct = limit == null ? 0 : Math.min(100, (used / limit) * 100);
            return (
              <tr key={k}>
                <td style={{ width: '35%' }}>{label}</td>
                <td>{k === 'uploadBytes' ? fmtBytes(used) : used} / {limit == null ? 'Unlimited' : fmt(limit)}<div className={`meter ${pct >= 100 ? 'full' : ''}`}><div style={{ width: `${pct}%` }} /></div></td>
              </tr>
            );
          })}
        </tbody></table>
      </div>
      <div className="panel">
        <h2>Plans</h2>
        <p className="hint">{me.canChangePlan ? 'You manage plans for this installation; switching is instant.' : 'To change your plan, contact your administrator.'}</p>
        <div className="table-scroll" style={{ maxHeight: 'none' }}>
          <table className="tbl">
            <thead><tr><th></th>{Object.entries(me.plans).map(([k, p]) => <th key={k} style={{ textAlign: 'center' }}>{p.name}<div style={{ fontSize: 16, color: 'var(--text)' }}>{p.price == null ? 'Custom' : p.price === 0 ? 'Free' : `$${p.price}/mo`}</div></th>)}</tr></thead>
            <tbody>
              {LIMITS.map(([k, label, fmt]) => (
                <tr key={k}><td>{label}</td>{Object.entries(me.plans).map(([pk, p]) => <td key={pk} style={{ textAlign: 'center' }}>{p[k] == null ? 'Unlimited' : fmt(p[k])}</td>)}</tr>
              ))}
              <tr><td>Remove branding</td>{Object.entries(me.plans).map(([k, p]) => <td key={k} style={{ textAlign: 'center' }}>{p.branding ? '—' : '✓'}</td>)}</tr>
              <tr><td>HIPAA features</td>{Object.entries(me.plans).map(([k, p]) => <td key={k} style={{ textAlign: 'center' }}>{p.hipaa ? '✓' : '—'}</td>)}</tr>
              <tr><td></td>{Object.keys(me.plans).map((k) => (
                <td key={k} style={{ textAlign: 'center' }}>
                  {me.plan.key === k ? <span className="pill green">Current</span> : ownWs && me.canChangePlan && <button className="small primary" disabled={!!busy} onClick={() => choose(k)}>{busy === k ? '…' : 'Switch'}</button>}
                </td>
              ))}</tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Profile() {
  const me = useMe();
  const [name, setName] = useState(me.user.name);
  const [pw, setPw] = useState({ currentPassword: '', password: '' });
  const [msg, setMsg] = useState('');
  const save = async (body) => { setMsg(''); try { await api('/me', { method: 'PATCH', body }); setMsg('Saved.'); me.refresh(); setPw({ currentPassword: '', password: '' }); } catch (e) { setMsg(e.message); } };
  return (
    <div className="panel" style={{ maxWidth: 520 }}>
      <h2>Profile</h2>
      <label className="lbl">E-mail</label><input value={me.user.email} disabled />
      <label className="lbl">Name</label>
      <div className="row"><input value={name} onChange={(e) => setName(e.target.value)} /><button onClick={() => save({ name })}>Save</button></div>
      <h3 style={{ marginTop: 20 }}>Change password</h3>
      <input type="password" placeholder="Current password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} />
      <input type="password" placeholder="New password (8+ characters)" style={{ marginTop: 6 }} value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
      <button style={{ marginTop: 6 }} onClick={() => save(pw)}>Update password</button>
      {msg && <p className="hint">{msg}</p>}
      <h3 style={{ marginTop: 24 }} className="danger">Danger zone</h3>
      <button className="danger" onClick={async () => {
        if (prompt('Type DELETE to permanently delete your account, forms and submissions.') !== 'DELETE') return;
        await api('/me', { method: 'DELETE' }); navigate('/'); window.location.reload();
      }}>Delete account</button>
    </div>
  );
}

function ApiKeys() {
  const [keys, setKeys] = useState([]);
  const load = () => api('/keys').then(setKeys);
  useEffect(() => { load(); }, []);
  return (
    <div className="panel">
      <div className="row"><h2 style={{ margin: 0 }}>API keys</h2><button className="primary right" onClick={async () => { await api('/keys', { method: 'POST', body: { label: prompt('Label for this key:') || 'API key' } }); load(); }}>+ Create key</button></div>
      <p className="hint">Send as header <code>APIKEY: &lt;key&gt;</code>. Endpoints: <code>GET /api/forms</code>, <code>GET /api/forms/:id</code>, <code>GET /api/forms/:id/submissions</code>, <code>GET /api/forms/:id/submissions.csv</code>, <code>GET /api/forms/:id/report</code>, <code>GET|PATCH|DELETE /api/submissions/:id</code>, <code>POST /api/public/forms/:id/submit</code>.</p>
      <table className="tbl"><tbody>
        {keys.map((k) => <tr key={k.key}><td>{k.label}</td><td><code>{k.key}</code></td><td className="hint">{fmtDate(k.created_at)}</td><td><button className="small danger" onClick={async () => { await api(`/keys/${k.key}`, { method: 'DELETE' }); load(); }}>Revoke</button></td></tr>)}
        {!keys.length && <tr><td className="muted">No keys.</td></tr>}
      </tbody></table>
    </div>
  );
}

function Team() {
  const me = useMe();
  const [t, setT] = useState(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [msg, setMsg] = useState('');
  const load = () => api('/team').then(setT);
  useEffect(() => { load(); }, []);
  if (!t) return <div className="panel muted">Loading…</div>;
  const admin = ['owner', 'admin'].includes(me.workspace.role);
  const invite = async (e) => {
    e.preventDefault(); setMsg('');
    try { const r = await api('/team/invite', { method: 'POST', body: { email, role } }); setMsg(r.added ? 'Added to the team.' : 'Invitation sent — they join when they sign up with that e-mail.'); setEmail(''); load(); } catch (x) { setMsg(x.message); }
  };
  return (
    <div className="panel">
      <h2>Team — {t.owner.email}'s workspace</h2>
      <p className="hint">Members work inside this workspace: <b>admins</b> manage forms and the team, <b>editors</b> build forms and manage submissions, <b>viewers</b> can only look. Plan limits come from the workspace owner.</p>
      {!t.multiUser && <p className="error">Team members require the Enterprise plan.</p>}
      <table className="tbl"><tbody>
        <tr><td>{t.owner.email}</td><td><span className="pill blue">owner</span></td><td></td></tr>
        {t.members.map((m) => (
          <tr key={m.id}>
            <td>{m.email}{m.name && <span className="hint"> · {m.name}</span>}</td>
            <td>{admin ? (
              <select style={{ width: 'auto' }} value={m.role} onChange={async (e) => { await api(`/team/members/${m.id}`, { method: 'PATCH', body: { role: e.target.value } }); load(); }}>
                <option value="admin">admin</option><option value="editor">editor</option><option value="viewer">viewer</option>
              </select>) : <span className="pill">{m.role}</span>}</td>
            <td style={{ textAlign: 'right' }}>{(admin || m.id === me.user.id) && <button className="small danger" onClick={async () => { await api(`/team/members/${m.id}`, { method: 'DELETE' }); if (m.id === me.user.id) window.location.reload(); else load(); }}>{m.id === me.user.id ? 'Leave' : 'Remove'}</button>}</td>
          </tr>
        ))}
        {t.invites.map((i) => (
          <tr key={i.token}><td>{i.email} <span className="hint">(invited)</span></td><td><span className="pill amber">{i.role}</span></td>
            <td style={{ textAlign: 'right' }}>{admin && <button className="small" onClick={async () => { await api(`/team/invites/${i.token}`, { method: 'DELETE' }); load(); }}>Cancel</button>}</td></tr>
        ))}
      </tbody></table>
      {admin && (
        <form className="row" style={{ marginTop: 12 }} onSubmit={invite}>
          <input type="email" placeholder="colleague@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <select style={{ width: 'auto' }} value={role} onChange={(e) => setRole(e.target.value)}><option value="admin">Admin</option><option value="editor">Editor</option><option value="viewer">Viewer</option></select>
          <button className="primary">Invite</button>
        </form>
      )}
      {msg && <p className="hint">{msg}</p>}
    </div>
  );
}

function Outbox() {
  const [mail, setMail] = useState([]);
  const [open, setOpen] = useState(null);
  useEffect(() => { api('/outbox').then(setMail); }, []);
  return (
    <div className="panel">
      <h2>Outbox</h2>
      <p className="hint">Every e-mail the system generated (notifications, autoresponders, approvals, signing requests, orders). {useMe().email ? 'SMTP is configured: e-mails are delivered.' : 'SMTP is not configured, so e-mails are only stored here — links in them still work.'}</p>
      <table className="tbl"><thead><tr><th>When</th><th>To</th><th>Subject</th><th>Form</th><th>Status</th></tr></thead><tbody>
        {mail.map((m) => (
          <Fragment key={m.id}>
            <tr className="clickable" onClick={() => setOpen(open === m.id ? null : m.id)}><td className="hint">{fmtDate(m.created_at)}</td><td>{m.recipient}</td><td>{m.subject}{m.has_attachment ? ' 📎' : ''}</td><td>{m.form_title}</td><td><span className={`pill ${m.status === 'sent' ? 'green' : m.status === 'failed' ? 'red' : ''}`} title={m.error || ''}>{m.status}</span></td></tr>
            {open === m.id && <tr><td colSpan={5}><pre>{m.body.split(/(https?:\/\/\S+)/).map((part, i) => (/^https?:/.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer">{part}</a> : part))}</pre></td></tr>}
          </Fragment>
        ))}
        {!mail.length && <tr><td colSpan={5} className="muted">Nothing sent yet.</td></tr>}
      </tbody></table>
    </div>
  );
}

export default function Account({ section }) {
  const S = { plan: ['Plan & usage', Plan], team: ['Team', Team], profile: ['Profile', Profile], api: ['API', ApiKeys], outbox: ['Outbox', Outbox] };
  const Comp = (S[section] || S.plan)[1];
  return (
    <div className="page">
      <div className="sidebar-layout">
        <div className="side-list">{Object.entries(S).map(([k, [l]]) => <a key={k} href={`#/account/${k}`} className={section === k ? 'active' : ''}>{l}</a>)}</div>
        <div><Comp /></div>
      </div>
    </div>
  );
}
