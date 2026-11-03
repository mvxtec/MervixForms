import { useEffect, useState } from 'react';
import { api, fmtDate, fmtBytes } from '../api.js';
import { navigate } from '../router.js';
import { formatValue, isInput } from '@shared/fields.js';
import { FieldInput } from '../components/Fields.jsx';
import Icon from '../components/Icon.jsx';

const money = (amount, currency) => {
  try { return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : undefined, { style: 'currency', currency: currency || 'USD' }).format(Number(amount) || 0); }
  catch { return `${currency} ${Number(amount || 0).toFixed(2)}`; }
};
const approvalPill = (a) => a && <span className={`pill ${a === 'approved' ? 'green' : a === 'rejected' ? 'red' : 'blue'}`}>{a === 'pending' ? 'Needs approval' : a}</span>;
const paymentPill = (p) => p && <span className={`pill ${p.status === 'paid' ? 'green' : p.status === 'failed' ? 'red' : 'amber'}`}>{p.status === 'paid' ? 'Paid' : p.status} · {money(p.amount, p.currency)}</span>;

function Value({ f, v }) {
  if (v === undefined || v === null || v === '') return <span className="muted">—</span>;
  if (f.type === 'signature') return <img src={v} alt="signature" style={{ maxWidth: 300, border: '1px solid var(--border)', borderRadius: 8, background: '#fff' }} />;
  if (f.type === 'file') {
    return (Array.isArray(v) ? v : [v]).map((x) => (
      <div key={x.id}><a href={`/api/files/${x.id}`} target="_blank" rel="noreferrer">{x.name}</a> <span className="hint">({fmtBytes(x.size)})</span> <a className="hint" href={`/api/files/${x.id}?download=1`}>download</a></div>
    ));
  }
  if (f.type === 'matrix') return <table className="tbl" style={{ width: 'auto' }}><tbody>{Object.entries(v).map(([r, c]) => <tr key={r}><td>{r}</td><td>{c}</td></tr>)}</tbody></table>;
  if (f.type === 'products') {
    return (
      <div>
        {(v.items || []).map((i) => <div key={i.id}>{i.name} × {i.qty} — {money(i.price * i.qty, v.currency)}</div>)}
        <b>Total: {money(v.total, v.currency)}</b>
      </div>
    );
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{formatValue(f, v)}</span>;
}

// Respondent name for list rows and the detail header: first full-name / text answer, else the email.
function whoIs(fields, data) {
  const name = fields.find((f) => f.type === 'fullname' && data[f.id]);
  if (name) return formatValue(name, data[name.id]);
  const email = fields.find((f) => f.type === 'email' && data[f.id]);
  if (email) return data[email.id];
  const first = fields.find((f) => data[f.id] !== undefined && data[f.id] !== '');
  return first ? String(formatValue(first, data[first.id])).slice(0, 40) : '';
}

function Detail({ form, sid, onChanged }) {
  const [s, setS] = useState(null);
  const [editing, setEditing] = useState(null);
  const [note, setNote] = useState('');
  const fields = form.definition.fields.filter(isInput);
  const load = () => api(`/submissions/${sid}`).then((x) => { setS(x); setNote(x.approval_note || ''); onChanged(); });
  useEffect(() => { setEditing(null); load(); }, [sid]);
  if (!s) return <div className="panel muted">Loading…</div>;

  const patch = async (body) => { await api(`/submissions/${s.id}`, { method: 'PATCH', body }); load(); };
  const decide = async (decision) => { await api(`/submissions/${s.id}/decision`, { method: 'POST', body: { decision, note } }); load(); };
  const del = async () => { if (!confirm('Delete this submission?')) return; await api(`/submissions/${s.id}`, { method: 'DELETE' }); onChanged(); navigate(`/forms/${form.id}/inbox`); };
  const who = whoIs(fields, s.data) || `Submission #${s.id}`;
  const initials = who.split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  return (
    <article className="panel" id="print-area" aria-label="Submission detail">
      <div className="detail-head">
        <div className="row">
          <div className="avatar" aria-hidden="true">{initials || '#'}</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17 }}>{who}</h2>
            <div className="hint mono">#{s.id} · {fmtDate(s.created_at)}{s.ip ? ` · IP ${s.ip}` : ''}</div>
          </div>
        </div>
        <div className="row wrap no-print">
          <button className="icon-btn" onClick={() => patch({ starred: !s.starred })} aria-pressed={s.starred} aria-label={s.starred ? 'Unstar' : 'Star'} title={s.starred ? 'Unstar' : 'Star'} style={{ color: s.starred ? '#d97706' : undefined }}>
            <Icon name="star" fill={s.starred ? 'currentColor' : 'none'} />
          </button>
          <button className="small" onClick={() => patch({ status: s.status === 'new' ? 'read' : 'new' })}>Mark {s.status === 'new' ? 'read' : 'unread'}</button>
          {editing ? (
            <>
              <button className="small primary" onClick={async () => { await patch({ data: editing }); setEditing(null); }}>Save changes</button>
              <button className="small" onClick={() => setEditing(null)}>Cancel</button>
            </>
          ) : <button className="small" onClick={() => setEditing({ ...s.data })}>Edit</button>}
          <a className="btn small" href={`/api/submissions/${s.id}/pdf?download=1`}>Download PDF</a>
          <button className="small" onClick={() => window.print()}>Print</button>
          <button className="small danger" onClick={del}>Delete</button>
        </div>
      </div>

      <div className="row wrap" style={{ alignItems: 'flex-start', gap: 20 }}>
        <div style={{ flex: '3 1 340px', minWidth: 0 }}>
          <dl className="answers">
            {fields.map((f) => (
              <div key={f.id}>
                <dt>{f.label}</dt>
                <dd>
                  {editing && !['signature', 'file', 'calculation', 'captcha', 'products'].includes(f.type)
                    ? <FieldInput f={f} value={editing[f.id]} onChange={(v) => setEditing({ ...editing, [f.id]: v })} mode="edit" />
                    : <Value f={f} v={s.data[f.id]} />}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {(s.payment || s.approval || s.signed) && (
          <div style={{ flex: '2 1 260px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {s.payment && (
              <section className="panel" style={{ padding: 14 }} aria-labelledby="pay-h">
                <div className="row"><h3 id="pay-h" style={{ margin: 0 }}>Payment</h3><span className="right">{paymentPill(s.payment)}</span></div>
                <div style={{ fontSize: 24, fontWeight: 600, margin: '8px 0', fontVariantNumeric: 'tabular-nums' }}>{money(s.payment.amount, s.payment.currency)}</div>
                <div className="hint">Gateway: {s.payment.provider}</div>
                <div className="hint">Reference: <span className="mono">{s.payment.ref || '—'}</span></div>
              </section>
            )}
            {s.approval && (
              <section className="panel no-print" style={{ padding: 14 }} aria-labelledby="appr-h">
                <div className="row"><h3 id="appr-h" style={{ margin: 0 }}>Approval</h3><span className="right">{approvalPill(s.approval)}</span></div>
                <label className="lbl" htmlFor="appr-note">Note to respondent (optional)</label>
                <textarea id="appr-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="row" style={{ marginTop: 10 }}>
                  <button className="accent grow" onClick={() => decide('approved')}>Approve</button>
                  <button className="grow danger" onClick={() => decide('rejected')}>Reject</button>
                </div>
                {s.approval !== 'pending' && <button className="link small" style={{ marginTop: 8 }} onClick={() => decide('pending')}>Reset to pending</button>}
              </section>
            )}
            {s.signed && <span className="pill blue" style={{ alignSelf: 'flex-start' }}>Signed</span>}
          </div>
        )}
      </div>
    </article>
  );
}

const FILTERS = [['unread', 'Unread', { status: 'new' }], ['starred', 'Starred', { starred: '1' }], ['pending', 'Needs approval', { approval: 'pending' }], ['approved', 'Approved', { approval: 'approved' }]];

export default function Inbox({ form, sid }) {
  const [filters, setFilters] = useState({ q: '', status: '', starred: '', approval: '', from: '', to: '', sort: 'desc' });
  const [data, setData] = useState({ total: 0, submissions: [] });
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(0);
  const [checked, setChecked] = useState([]);
  const [view, setView] = useState('detail');
  const fields = form.definition.fields.filter((f) => isInput(f) && !['signature', 'captcha'].includes(f.type));
  const allInputs = form.definition.fields.filter(isInput);
  const currency = form.definition.fields.find((f) => f.type === 'products')?.currency;
  const PAGE = 50;

  const qs = () => new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
  const load = () => api(`/forms/${form.id}/submissions?${qs()}&limit=${PAGE}&offset=${page * PAGE}`).then(setData);
  const loadStats = () => Promise.all([api(`/forms/${form.id}/report`), api(`/forms/${form.id}/submissions?status=new&limit=1`)])
    .then(([r, unread]) => setStats({ ...r, unread: unread.total }));
  useEffect(() => { load(); }, [JSON.stringify(filters), page]);
  useEffect(() => { loadStats(); }, [form.id]);
  useEffect(() => { if (sid) setView('detail'); }, [sid]);

  const setF = (k) => (e) => { setPage(0); setFilters({ ...filters, [k]: e.target.value }); };
  const isOn = (patch) => Object.entries(patch).every(([k, v]) => filters[k] === v);
  const toggle = (patch) => { setPage(0); setFilters({ ...filters, ...Object.fromEntries(Object.keys(patch).map((k) => [k, isOn(patch) ? '' : patch[k]])) }); };
  const bulk = async (action) => {
    if (action === 'delete' && !confirm(`Delete ${checked.length} submissions?`)) return;
    await api('/submissions/bulk', { method: 'POST', body: { ids: checked, action } });
    setChecked([]); load(); loadStats();
  };
  const open = (id) => navigate(`/forms/${form.id}/inbox/${id}`);
  const refresh = () => { load(); loadStats(); };

  return (
    <div className="page" style={{ maxWidth: 1440 }}>
      {stats && (
        <section className="stats no-print" aria-label="Summary">
          <div className="stat"><span>Responses</span><b>{stats.total.toLocaleString()}</b></div>
          <div className="stat"><span>Unread</span><b>{stats.unread.toLocaleString()}</b></div>
          {currency
            ? <div className="stat"><span>Collected</span><b>{money(stats.revenue, currency)}</b></div>
            : <div className="stat"><span>Views</span><b>{stats.views.toLocaleString()}</b></div>}
          <div className="stat"><span>{stats.approvals.pending ? 'Awaiting approval' : 'Conversion'}</span><b>{stats.approvals.pending ? stats.approvals.pending : `${Math.round(stats.conversion * 100)}%`}</b></div>
        </section>
      )}

      <div className="row wrap no-print" style={{ marginBottom: 12 }}>
        <div className="seg" role="tablist" aria-label="View">
          <button role="tab" aria-selected={view === 'detail'} className={view === 'detail' ? 'on' : ''} onClick={() => { setView('detail'); if (!sid && data.submissions[0]) open(data.submissions[0].id); }}>Inbox</button>
          <button role="tab" aria-selected={view === 'table'} className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>Table</button>
        </div>
        <label className="search" style={{ flex: '1 1 240px', maxWidth: 360, minHeight: 36 }}>
          <Icon name="search" size={15} />
          <span className="sr-only">Search answers</span>
          <input type="search" placeholder="Search answers" value={filters.q} onChange={setF('q')} />
        </label>
        {FILTERS.map(([k, l, patch]) => (
          <button key={k} className={`chip ${isOn(patch) ? 'on' : ''}`} aria-pressed={isOn(patch)} onClick={() => toggle(patch)}>{l}</button>
        ))}
        <details className="right" style={{ position: 'relative' }}>
          <summary className="btn small" style={{ listStyle: 'none' }}>More filters</summary>
          <div className="panel" style={{ position: 'absolute', right: 0, top: 36, zIndex: 10, width: 260, padding: 12 }}>
            <label className="lbl" style={{ marginTop: 0 }}>From</label><input type="date" value={filters.from} onChange={setF('from')} />
            <label className="lbl">To</label><input type="date" value={filters.to} onChange={setF('to')} />
            <label className="lbl">Sort</label>
            <select value={filters.sort} onChange={setF('sort')}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select>
          </div>
        </details>
        <a className="btn small primary" href={`/api/forms/${form.id}/submissions.csv?${qs()}`}>Export CSV</a>
      </div>

      {view === 'table' ? (
        <>
          {checked.length > 0 && (
            <div className="row" style={{ marginBottom: 8 }}>
              <b>{checked.length} selected</b>
              <button className="small" onClick={() => bulk('read')}>Mark read</button>
              <button className="small" onClick={() => bulk('new')}>Mark unread</button>
              <button className="small" onClick={() => bulk('star')}>Star</button>
              <button className="small danger" onClick={() => bulk('delete')}>Delete</button>
            </div>
          )}
          <div className="table-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Select all" checked={checked.length > 0 && checked.length === data.submissions.length} onChange={(e) => setChecked(e.target.checked ? data.submissions.map((s) => s.id) : [])} /></th>
                  <th>#</th><th>Submitted</th>
                  {fields.map((f) => <th key={f.id}>{f.label}</th>)}
                  <th>Payment</th><th>Approval</th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((s) => (
                  <tr key={s.id} className={`clickable ${s.status === 'new' ? 'unread' : ''}`} onClick={() => open(s.id)}>
                    <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select submission ${s.id}`} checked={checked.includes(s.id)} onChange={(e) => setChecked(e.target.checked ? [...checked, s.id] : checked.filter((x) => x !== s.id))} /></td>
                    <td>{s.starred && '★ '}{s.id}</td>
                    <td className="hint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(s.created_at)}</td>
                    {fields.map((f) => <td key={f.id} style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{formatValue(f, s.data[f.id])}</td>)}
                    <td>{paymentPill(s.payment)}</td>
                    <td>{approvalPill(s.approval)}</td>
                  </tr>
                ))}
                {!data.submissions.length && <tr><td colSpan={fields.length + 5} className="muted">No submissions{filters.q ? ' match your filters' : ' yet. Share your form from the Publish tab.'}</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="hint">{data.total} submission{data.total === 1 ? '' : 's'}</span>
            <button className="small right" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Prev</button>
            <span className="hint">Page {page + 1} of {Math.max(1, Math.ceil(data.total / PAGE))}</span>
            <button className="small" disabled={(page + 1) * PAGE >= data.total} onClick={() => setPage(page + 1)}>Next ›</button>
          </div>
        </>
      ) : (
        <div className="inbox-split">
          <nav className="inbox-list no-print" aria-label="Submissions">
            {data.submissions.map((s) => {
              const current = String(s.id) === String(sid);
              return (
                <button key={s.id} onClick={() => open(s.id)} className={current ? 'current' : ''} aria-current={current ? 'true' : undefined}>
                  <span className="unread-dot" style={{ background: s.status === 'new' ? 'var(--accent)' : 'transparent' }} aria-label={s.status === 'new' ? 'Unread' : undefined} />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span className="row" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: s.status === 'new' ? 600 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.starred && '★ '}{whoIs(allInputs, s.data) || `Submission #${s.id}`}</span>
                      <span className="hint" style={{ whiteSpace: 'nowrap' }}>{fmtDate(s.created_at)}</span>
                    </span>
                    <span className="row wrap" style={{ gap: 6 }}>{paymentPill(s.payment)}{approvalPill(s.approval)}<span className="hint mono">#{s.id}</span></span>
                  </span>
                </button>
              );
            })}
            {!data.submissions.length && <div className="muted" style={{ padding: 16 }}>No submissions{filters.q ? ' match your filters' : ' yet'}.</div>}
          </nav>
          <div className="inbox-detail">{sid ? <Detail form={form} sid={sid} onChanged={refresh} /> : <div className="panel muted" style={{ textAlign: 'center', padding: 40 }}>Select a submission to see the answers.</div>}</div>
        </div>
      )}
    </div>
  );
}
