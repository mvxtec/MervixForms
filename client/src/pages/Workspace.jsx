import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { navigate } from '../router.js';
import { useMe } from '../App.jsx';
import Icon from '../components/Icon.jsx';

// Soft tint per form so rows are easy to scan; derived from the id so it stays stable.
const TINTS = ['#ccfbf1', '#e0e7ff', '#fce7f3', '#fef3c7', '#ffedd5', '#dcfce7', '#e0f2fe'];
const tintOf = (id) => TINTS[[...String(id)].reduce((s, c) => s + c.charCodeAt(0), 0) % TINTS.length];

export function NewFormModal({ onClose, folder }) {
  const me = useMe();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [json, setJson] = useState('');
  useEffect(() => { api('/templates').then(setTemplates); }, []);
  const create = async (body) => {
    setError('');
    try {
      const { id } = await api('/forms', { method: 'POST', body: { ...body, folder } });
      navigate(`/forms/${id}/build`);
    } catch (e) { setError(e.message); }
  };
  const createWithAi = async () => {
    setAiBusy(true); setError('');
    try {
      const { definition } = await api('/ai/form', { method: 'POST', body: { prompt: aiPrompt } });
      await create({ definition });
    } catch (e) { setError(e.message); }
    setAiBusy(false);
  };
  const importJson = () => {
    try { create({ definition: JSON.parse(json) }); } catch { setError('That is not valid form JSON.'); }
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="new-form-h" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 8 }}><h2 id="new-form-h" style={{ margin: 0 }}>Create a form</h2><button className="right icon-btn ghost" onClick={onClose} aria-label="Close">✕</button></div>
        {error && <p className="error">{error}</p>}
        <h3 style={{ marginTop: 16 }}>Start from scratch</h3>
        <div className="row wrap">
          <input style={{ flex: '1 1 240px' }} placeholder="Form title" aria-label="Form title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="primary" onClick={() => create({ title: title || 'Untitled Form' })}>Blank classic form</button>
          <button onClick={() => create({ title: title || 'Untitled Card Form', definition: { title: title || 'Untitled Card Form', layout: 'card' } })}>Blank card form</button>
        </div>
        <h3 style={{ marginTop: 24 }} className="row"><Icon name="sparkles" size={18} style={{ color: 'var(--accent)' }} />Create with AI</h3>
        {me.ai ? (
          <div className="ai-row">
            <input placeholder="e.g. Admission form for Class 1 with parent details, documents upload and ₹500 fee" aria-label="Describe your form" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
            <button className="accent" disabled={aiBusy || aiPrompt.trim().length < 5} onClick={createWithAi}>{aiBusy ? 'Building…' : 'Generate draft'}</button>
          </div>
        ) : <p className="hint">Set <code>ANTHROPIC_API_KEY</code> in <code>.env</code> and restart the server to build forms from a description.</p>}
        <h3 style={{ marginTop: 24 }}>Use a template</h3>
        <div className="cards">
          {templates.map((t) => (
            <button key={t.id} className="card" onClick={() => create({ templateId: t.id })}>
              <div className="tpl-art" style={{ background: `${t.primary}1f` }}><span style={{ width: '60%', background: t.primary }} /><span style={{ width: '85%' }} /><span style={{ width: '40%' }} /></div>
              <b>{t.name}</b>
              <span className="hint">{t.category} · {t.fieldCount} fields · {t.layout}</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t.description}</span>
            </button>
          ))}
        </div>
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Import form from JSON</summary>
          <textarea rows={6} value={json} onChange={(e) => setJson(e.target.value)} placeholder='Paste a form definition exported from "Publish → Export JSON"' style={{ marginTop: 8 }} />
          <button onClick={importJson} style={{ marginTop: 8 }}>Import</button>
        </details>
      </div>
    </div>
  );
}

function AiBox({ folder, onError }) {
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); onError('');
    try {
      const { definition } = await api('/ai/form', { method: 'POST', body: { prompt } });
      const { id } = await api('/forms', { method: 'POST', body: { definition, folder } });
      navigate(`/forms/${id}/build`);
    } catch (e) { onError(e.message); }
    setBusy(false);
  };
  return (
    <section className="ai-box" aria-labelledby="ai-h">
      <h2 id="ai-h"><Icon name="sparkles" size={18} style={{ color: 'var(--accent)' }} />Describe a form and we'll draft it</h2>
      <form className="ai-row" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label="Form description" placeholder="e.g. Workshop registration with name, WhatsApp number, experience level and ₹1,499 pass by UPI" />
        <button className="accent" disabled={busy || prompt.trim().length < 5}>{busy ? 'Drafting…' : 'Generate draft'}</button>
      </form>
      <p className="hint" style={{ margin: 0 }}>The draft opens in the builder as a new form. Nothing is published until you choose to.</p>
    </section>
  );
}

export default function Workspace() {
  const me = useMe();
  const [view, setView] = useState('active');
  const [folder, setFolder] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState({ forms: [], folders: [] });
  const [templates, setTemplates] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    const p = new URLSearchParams({ status: view, q });
    if (folder) p.set('folder', folder);
    api(`/forms?${p}`).then(setData);
  };
  useEffect(load, [view, folder, q]);
  useEffect(() => { api('/templates').then(setTemplates); }, []);

  const act = async (fn) => { setError(''); try { await fn(); load(); me.refresh(); } catch (e) { setError(e.message); } };
  const patch = (id, body) => act(() => api(`/forms/${id}`, { method: 'PATCH', body }));
  const fromTemplate = (templateId) => act(async () => {
    const { id } = await api('/forms', { method: 'POST', body: { templateId, folder } });
    navigate(`/forms/${id}/build`);
  });
  const totalSubs = data.forms.reduce((s, f) => s + f.submissions, 0);
  const totalUnread = data.forms.reduce((s, f) => s + f.unread, 0);
  const heading = folder || { active: 'Forms', favorites: 'Favorites', trashed: 'Trash' }[view];

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>{heading}</h1>
          <p>{data.forms.length} form{data.forms.length === 1 ? '' : 's'} · {totalSubs.toLocaleString()} responses{totalUnread ? ` · ${totalUnread} unread` : ''} · {me.usage.forms} of {me.plan.forms ?? '∞'} forms on {me.plan.name}</p>
        </div>
        <div className="row wrap">
          <label className="search" style={{ minWidth: 260 }}>
            <Icon name="search" />
            <span className="sr-only">Search forms</span>
            <input type="search" placeholder="Search forms…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <button className="primary" style={{ minHeight: 40 }} onClick={() => setCreating(true)}><Icon name="plus" />New form</button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {view === 'active' && !folder && !q && (
        <>
          {me.ai && <AiBox folder={folder} onError={setError} />}
          <section className="section" aria-labelledby="tpl-h">
            <div className="section-head">
              <h2 id="tpl-h">Start from a template</h2>
              <button className="link" onClick={() => setCreating(true)}>Browse all templates</button>
            </div>
            <div className="cards">
              <button className="card dashed" onClick={() => act(async () => { const { id } = await api('/forms', { method: 'POST', body: { title: 'Untitled Form', folder } }); navigate(`/forms/${id}/build`); })}>
                <Icon name="plus" size={22} />Blank form
              </button>
              {templates.slice(0, 4).map((t) => (
                <button key={t.id} className="card" onClick={() => fromTemplate(t.id)}>
                  <div className="tpl-art" style={{ background: `${t.primary}1f` }}><span style={{ width: '60%', background: t.primary }} /><span style={{ width: '85%' }} /><span style={{ width: '40%' }} /></div>
                  <b style={{ fontWeight: 500 }}>{t.name}</b>
                  <span className="hint">{t.layout === 'card' ? 'Card' : 'Classic'} · {t.category}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="section" aria-labelledby="list-h">
        <div className="section-head">
          <div className="row wrap">
            <h2 id="list-h" className="sr-only">Your forms</h2>
            <div className="seg" role="tablist" aria-label="Filter forms">
              {[['active', 'All'], ['favorites', 'Favorites'], ['trashed', 'Trash']].map(([k, l]) => (
                <button key={k} role="tab" aria-selected={view === k && !folder} className={view === k && !folder ? 'on' : ''} onClick={() => { setView(k); setFolder(''); }}>{l}</button>
              ))}
            </div>
            {data.folders.map((f) => (
              <button key={f} className={`chip ${folder === f ? 'on' : ''}`} aria-pressed={folder === f} onClick={() => { setView('active'); setFolder(folder === f ? '' : f); }}>
                <Icon name="folder" size={14} />{f}
              </button>
            ))}
          </div>
        </div>
        {!data.forms.length ? (
          <div className="panel muted" style={{ textAlign: 'center', padding: 40 }}>
            No forms here yet. {view === 'active' && <button className="link" onClick={() => setCreating(true)}>Create your first form</button>}
          </div>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl" style={{ minWidth: 820 }}>
              <thead>
                <tr><th>Form</th><th>Status</th><th className="num">Responses</th><th className="num">Views</th><th>Last response</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {data.forms.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <div className="form-cell">
                        <div className="form-thumb" style={{ background: tintOf(f.id) }} />
                        <div style={{ minWidth: 0 }}>
                          <div className="row">
                            <a href={`#/forms/${f.id}/build`} style={{ color: 'var(--text)', fontWeight: 500 }}>{f.title}</a>
                            <button className="link" style={{ color: f.favorite ? '#d97706' : 'var(--border-strong)' }} aria-label={f.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={!!f.favorite} onClick={() => patch(f.id, { favorite: !f.favorite })}>
                              <Icon name="star" size={14} fill={f.favorite ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                          <div className="hint">{f.folder || 'No folder'} · updated {fmtDate(f.updated_at)}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`pill ${f.status === 'enabled' ? 'green' : f.status === 'disabled' ? 'amber' : 'red'}`}>{{ enabled: 'Live', disabled: 'Disabled', trashed: 'Trashed' }[f.status] || f.status}</span></td>
                    <td className="num">
                      <a href={`#/forms/${f.id}/inbox`} style={{ color: 'var(--text)' }}>{f.submissions.toLocaleString()}</a>
                      {f.unread > 0 && <span style={{ marginLeft: 6, fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>+{f.unread} new</span>}
                    </td>
                    <td className="num">{f.views.toLocaleString()}</td>
                    <td className="muted">{f.last_submission ? fmtDate(f.last_submission) : '—'}</td>
                    <td>
                      <div className="row" style={{ justifyContent: 'flex-end' }}>
                        {view === 'trashed' ? (
                          <>
                            <button className="small" onClick={() => patch(f.id, { status: 'enabled' })}>Restore</button>
                            <button className="small danger" onClick={() => confirm('Delete permanently with all submissions?') && act(() => api(`/forms/${f.id}`, { method: 'DELETE' }))}>Delete forever</button>
                          </>
                        ) : (
                          <>
                            <a className="btn small" href={`#/forms/${f.id}/inbox`}>Inbox</a>
                            <a className="btn small icon-btn" href={`/f/${f.id}`} target="_blank" rel="noreferrer" aria-label={`Open ${f.title} in a new tab`} title="Open form"><Icon name="external" size={14} /></a>
                            <select className="small" style={{ width: 'auto', minHeight: 30 }} value="" aria-label={`More actions for ${f.title}`} onChange={(e) => {
                              const a = e.target.value;
                              if (a === 'clone') act(() => api(`/forms/${f.id}/clone`, { method: 'POST' }));
                              if (a === 'toggle') patch(f.id, { status: f.status === 'enabled' ? 'disabled' : 'enabled' });
                              if (a === 'folder') { const name = prompt('Move to folder (empty = none):', f.folder); if (name !== null) patch(f.id, { folder: name.trim() }); }
                              if (a === 'rename') { const t = prompt('Rename form:', f.title); if (t) patch(f.id, { title: t }); }
                              if (a === 'reports') navigate(`/forms/${f.id}/reports`);
                              if (a === 'trash') patch(f.id, { status: 'trashed' });
                            }}>
                              <option value="">More…</option>
                              <option value="rename">Rename</option>
                              <option value="clone">Clone</option>
                              <option value="toggle">{f.status === 'enabled' ? 'Disable' : 'Enable'}</option>
                              <option value="folder">Move to folder</option>
                              <option value="reports">Reports</option>
                              <option value="trash">Move to trash</option>
                            </select>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {creating && <NewFormModal folder={folder} onClose={() => setCreating(false)} />}
    </div>
  );
}
