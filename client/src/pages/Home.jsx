// "My Workspace": sidebar (create, labels, teams, tasks, favourites, archive, trash) and one list of
// every asset — forms, workflows, apps, stores and sign documents.
import { useEffect, useRef, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { navigate, takePending } from '../router.js';
import { useMe } from '../App.jsx';
import Icon from '../components/Icon.jsx';
import { NewFormModal, AiBox } from './Workspace.jsx';
import CreateMenu from '../components/CreateMenu.jsx';
import Menu from '../components/Menu.jsx';

export const TYPES = {
  form: { label: 'Form', icon: 'forms' },
  workflow: { label: 'Workflow', icon: 'workflow' },
  app: { label: 'App', icon: 'apps' },
  store: { label: 'Store', icon: 'store' },
  sign: { label: 'Sign document', icon: 'sign' },
};
const VIEW_TITLES = { all: 'All items', favorites: 'Favorites', archive: 'Archive', trash: 'Trash', tasks: 'Assigned to me', forms: 'Forms', workflows: 'Workflows', apps: 'Apps and stores', sign: 'Sign documents' };
const LABELS_KEY = 'mf_labels'; // labels created but not yet given to any form

function readLabels() { try { return JSON.parse(localStorage.getItem(LABELS_KEY) || '[]'); } catch { return []; } }
function saveLabels(v) { try { localStorage.setItem(LABELS_KEY, JSON.stringify(v)); } catch { /* storage blocked */ } }

function Sidebar({ view, label, labels, onCreate, onAddLabel, taskCount }) {
  const me = useMe();
  const teams = me.workspaces.filter((w) => w.id !== me.user.id);
  const subs = me.plan.submissionsPerMonth;
  const used = me.usage.submissionsPerMonth;
  const item = (href, icon, text, on, extra) => (
    <a href={href} className={on ? 'active' : ''} aria-current={on ? 'page' : undefined}><Icon name={icon} />{text}{extra}</a>
  );
  const soon = (icon, text) => <span className="side-soon" aria-disabled="true"><Icon name={icon} />{text}<span className="tag" style={{ marginLeft: 'auto' }}>Soon</span></span>;
  return (
    <aside className="ws-side" aria-label="Workspace">
      <button className="create-btn" onClick={onCreate}><Icon name="plus" />Create</button>
      <button className="side-ai" onClick={() => onCreate('ai')}><Icon name="sparkles" />Create with AI</button>
      <nav className="side-nav">
        <span className="side-label">Workspace</span>
        {item('#/', 'apps', 'All', view === 'all')}
        {[...labels].map((l) => item(`#/w/label/${encodeURIComponent(l)}`, 'tag', l, view === 'label' && label === l))}
        <button className="side-add" onClick={onAddLabel}><Icon name="plus" size={14} />Add label</button>

        <span className="side-label">Teams</span>
        {teams.map((w) => <button key={w.id} className="side-add" onClick={() => switchTo(w.id)}><Icon name="users" size={16} />{w.email.split('@')[0]}'s team</button>)}
        {me.workspace.id !== me.user.id && <button className="side-add" onClick={() => switchTo(me.user.id)}><Icon name="back" size={16} />Back to my workspace</button>}
        {item('#/account/team', 'plus', 'Create a team', false)}

        <span className="side-label" />
        {soon('users', 'Shared with me')}
        {item('#/w/tasks', 'task', 'Assigned to me', view === 'tasks', taskCount ? <span className="badge" style={{ marginLeft: 'auto' }}>{taskCount}</span> : null)}
        {soon('edit', 'Continue filling')}
        {soon('send', 'Sent')}
        {item('#/w/favorites', 'star', 'Favorites', view === 'favorites')}
        {item('#/w/archive', 'archive', 'Archive', view === 'archive')}
        {item('#/w/trash', 'trash', 'Trash', view === 'trash')}
      </nav>
      <div className="side-foot">
        <div className="usage">
          <span className="muted">Submissions this month</span>
          <b>{used.toLocaleString()} / {subs == null ? '∞' : subs.toLocaleString()}</b>
          <div className={`meter ${subs != null && used >= subs ? 'full' : ''}`}><div style={{ width: subs ? `${Math.min(100, (used / subs) * 100)}%` : '0%' }} /></div>
          <a href="#/account/plan">{me.plan.name} plan · Manage</a>
        </div>
      </div>
    </aside>
  );
}

export async function switchTo(id) {
  await api('/workspace', { method: 'POST', body: { id: Number(id) } });
  navigate('/');
  window.location.reload();
}

function Tasks({ onCount }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api('/tasks/assigned').then((r) => { setRows(r); onCount(r.length); }).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="ws-empty"><span className="empty-icon"><Icon name="mail" size={22} /></span><b>Confirm your e-mail first</b><span className="hint">{error}</span></div>;
  if (!rows) return <p className="muted">Loading…</p>;
  if (!rows.length) return <div className="ws-empty"><Icon name="check" size={28} /><b>No tasks waiting for you</b><span className="hint">Approvals and tasks that workflows assign to you show up here.</span></div>;
  return (
    <ul className="ws-list">
      {rows.map((t) => (
        <li key={t.token} className="ws-row">
          <span className="ws-type"><Icon name={t.kind === 'approval' ? 'approval' : 'task'} size={18} /></span>
          <div className="ws-title">
            <a href={`#/wf-task/${t.token}`}>{t.kind === 'approval' ? 'Approval' : 'Task'} · {t.workflow}</a>
            <span className="hint">{t.form ? `${t.form} · ` : ''}submission #{t.submission_id} · assigned {fmtDate(t.created_at)}</span>
          </div>
          <a className="btn small" href={`#/wf-task/${t.token}`}>{t.kind === 'approval' ? 'Review' : 'Open'}</a>
        </li>
      ))}
    </ul>
  );
}

function RowMenu({ it, view, act }) {
  const pf = (body) => act(() => api(`/forms/${it.id}`, { method: 'PATCH', body }));
  const choose = (a) => {
    if (a === 'inbox') navigate(`/forms/${it.id}/inbox`);
    if (a === 'open') window.open(`/f/${it.id}`, '_blank', 'noopener');
    if (a === 'rename') { const t = prompt('Rename form:', it.title); if (t) pf({ title: t }); }
    if (a === 'clone') act(() => api(`/forms/${it.id}/clone`, { method: 'POST' }));
    if (a === 'toggle') pf({ status: it.status === 'enabled' ? 'disabled' : 'enabled' });
    if (a === 'label') { const l = prompt('Label (leave empty to remove):', it.folder || ''); if (l !== null) pf({ folder: l.trim() }); }
    if (a === 'archive') pf({ status: 'archived' });
    if (a === 'trash') pf({ status: 'trashed' });
    if (a === 'restore') pf({ status: 'enabled' });
    if (a === 'delete' && confirm(`Delete "${it.title}" and all its submissions permanently? This cannot be undone.`)) act(() => api(`/forms/${it.id}`, { method: 'DELETE' }));
  };
  if (it.type !== 'form') return <a className="btn small" href={it.href}>Open</a>;
  if (view === 'trash' || view === 'archive') {
    return (
      <div className="row">
        <button className="small" onClick={() => choose('restore')}>Restore</button>
        {view === 'trash' && <button className="small danger" onClick={() => choose('delete')}>Delete forever</button>}
      </div>
    );
  }
  return (
    <div className="row">
      <a className="btn small" href={it.href}>Edit</a>
      <Menu label={`Actions for ${it.title}`} items={[
        { icon: 'inbox', label: 'Inbox', onClick: () => choose('inbox') },
        { icon: 'external', label: 'Open form', onClick: () => choose('open') },
        '-',
        { icon: 'edit', label: 'Rename', onClick: () => choose('rename') },
        { icon: 'copy', label: 'Duplicate', onClick: () => choose('clone') },
        { icon: 'tag', label: 'Set label', onClick: () => choose('label') },
        { icon: it.status === 'enabled' ? 'pause' : 'play', label: it.status === 'enabled' ? 'Disable' : 'Enable', onClick: () => choose('toggle') },
        '-',
        { icon: 'archive', label: 'Archive', onClick: () => choose('archive') },
        { icon: 'trash', label: 'Move to trash', danger: true, onClick: () => choose('trash') },
      ]} />
    </div>
  );
}

export default function Home({ view = 'all', label = '' }) {
  const me = useMe();
  const [data, setData] = useState({ items: [], labels: [] });
  const [loaded, setLoaded] = useState(false);
  const [extraLabels, setExtraLabels] = useState(readLabels);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('activity');
  const [type, setType] = useState('');
  const [picked, setPicked] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [pending] = useState(() => { const p = takePending(); return p?.prompt ? p.prompt : ''; });
  const [taskCount, setTaskCount] = useState(0);

  // Reloads after an action read the current view (not the one the action started in), and only
  // the latest request may update the list.
  const seq = useRef(0);
  const current = useRef();
  current.current = { view, label, q, sort };
  const load = () => {
    const { view, label, q, sort } = current.current;
    if (view === 'tasks') return;
    const n = ++seq.current;
    const p = new URLSearchParams({ view, q, sort });
    if (view === 'label') p.set('label', label);
    api(`/workspace/items?${p}`).then((d) => { if (n === seq.current) { setData(d); setLoaded(true); } });
  };
  useEffect(load, [view, label, q, sort]);
  useEffect(() => { setPicked([]); setType(''); }, [view, label]);
  useEffect(() => { if (me.user.emailVerified) api('/tasks/assigned').then((r) => setTaskCount(r.length)).catch(() => {}); }, []);

  const act = async (fn) => { setError(''); try { await fn(); load(); me.refresh(); } catch (e) { setError(e.message); } };
  const star = (it) => act(() => (it.type === 'form'
    ? api(`/forms/${it.id}`, { method: 'PATCH', body: { favorite: !it.favorite } })
    : api(`/workspace/items/${it.type}/${it.id}`, { method: 'PATCH', body: { favorite: !it.favorite } })));
  const bulk = (status) => act(async () => {
    for (const k of picked) await api(`/forms/${k.split(':')[1]}`, { method: 'PATCH', body: { status } });
    setPicked([]);
  });
  const addLabel = () => {
    const l = prompt('Label name:');
    if (!l?.trim()) return;
    const next = [...new Set([...extraLabels, l.trim()])];
    setExtraLabels(next); saveLabels(next);
    navigate(`/w/label/${encodeURIComponent(l.trim())}`);
  };
  const labels = [...new Set([...data.labels, ...extraLabels])].sort();
  const items = type ? data.items.filter((i) => i.type === type || (type === 'app' && i.type === 'store')) : data.items;
  const keyOf = (i) => `${i.type}:${i.id}`;
  const formKeys = items.filter((i) => i.type === 'form').map(keyOf);
  const title = view === 'label' ? label : VIEW_TITLES[view] || 'All';

  return (
    <div className="ws-layout">
      <Sidebar view={view} label={label} labels={labels} taskCount={taskCount} onAddLabel={addLabel} onCreate={(how) => setCreating(how === 'ai' ? 'ai' : 'menu')} />
      <div className="ws-main">
        {pending && <AiBox folder="" onError={setError} initial={pending} />}
        <header className="ws-head">
          <h1>{title}</h1>
          {view !== 'tasks' && (
            <div className="row wrap" style={{ marginLeft: 'auto' }}>
              <select aria-label="Filter by type" value={type} onChange={(e) => setType(e.target.value)} style={{ width: 'auto' }}>
                <option value="">All types</option>
                <option value="form">Forms</option>
                <option value="workflow">Workflows</option>
                <option value="app">Apps & stores</option>
                <option value="sign">Sign documents</option>
              </select>
              <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }}>
                <option value="activity">Last activity</option>
                <option value="created">Date created</option>
                <option value="title">Title</option>
              </select>
              <label className="search" style={{ minWidth: 220 }}>
                <Icon name="search" />
                <span className="sr-only">Search</span>
                <input type="search" placeholder={`Search in ${title}`} value={q} onChange={(e) => setQ(e.target.value)} />
              </label>
            </div>
          )}
        </header>
        {error && <p className="error">{error}</p>}
        {view === 'tasks' ? <Tasks onCount={setTaskCount} /> : (
          <>
            {picked.length > 0 && (
              <div className="ws-bulk" role="region" aria-label="Selected items">
                <b>{picked.length} selected</b>
                {view === 'trash' || view === 'archive'
                  ? <button className="small" onClick={() => bulk('enabled')}>Restore</button>
                  : <><button className="small" onClick={() => bulk('archived')}>Archive</button><button className="small danger" onClick={() => bulk('trashed')}>Move to trash</button></>}
                <button className="small ghost" onClick={() => setPicked([])}>Clear</button>
              </div>
            )}
            {!loaded ? <p className="muted">Loading…</p> : !items.length ? (
              <div className="ws-empty">
                <Icon name={view === 'trash' ? 'trash' : view === 'favorites' ? 'star' : 'apps'} size={28} />
                <b>{q ? 'Nothing matches your search' : { trash: 'Trash is empty', archive: 'Nothing archived', favorites: 'No favorites yet' }[view] || 'Nothing here yet'}</b>
                <span className="hint">{view === 'favorites' ? 'Star a form, workflow, app or document to keep it here.' : view === 'trash' ? 'Forms you move to trash stay here until you delete them.' : ''}</span>
                {['all', 'label', 'forms'].includes(view) && !q && <button className="primary" onClick={() => setCreating('menu')}><Icon name="plus" />Create</button>}
              </div>
            ) : (
              <ul className="ws-list">
                {formKeys.length > 1 && (
                  <li className="ws-row ws-row-head">
                    <input type="checkbox" aria-label="Select all forms" checked={formKeys.every((k) => picked.includes(k))} onChange={(e) => setPicked(e.target.checked ? formKeys : [])} />
                    <span className="hint">Select all forms</span>
                  </li>
                )}
                {items.map((it) => {
                  const t = TYPES[it.type];
                  const k = keyOf(it);
                  return (
                    <li key={k} className={`ws-row ${picked.includes(k) ? 'picked' : ''}`}>
                      {it.type === 'form'
                        ? <input type="checkbox" aria-label={`Select ${it.title}`} checked={picked.includes(k)} onChange={(e) => setPicked(e.target.checked ? [...picked, k] : picked.filter((x) => x !== k))} />
                        : <span style={{ width: 16 }} />}
                      {view !== 'trash' && (
                        <button className="link ws-star" style={{ color: it.favorite ? '#d97706' : 'var(--border-strong)' }} aria-label={it.favorite ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={it.favorite} onClick={() => star(it)}>
                          <Icon name="star" size={18} fill={it.favorite ? 'currentColor' : 'none'} />
                        </button>
                      )}
                      <span className="ws-type" title={t.label}><Icon name={t.icon} size={18} /></span>
                      <div className="ws-title">
                        <a href={it.href}>{it.title}</a>
                        <span className="hint">{t.label} · {it.meta}{it.folder ? ` · ${it.folder}` : ''} · Last edited {fmtDate(it.updated_at)}</span>
                      </div>
                      {it.type === 'form' && it.status === 'disabled' && <span className="pill amber">Disabled</span>}
                      {it.type !== 'form' && it.status && <span className={`pill ${['enabled', 'active', 'published', 'completed'].includes(it.status) ? 'green' : ['draft', 'sent', 'pending'].includes(it.status) ? 'amber' : ''}`}>{{ enabled: 'Live', disabled: 'Off' }[it.status] || it.status[0].toUpperCase() + it.status.slice(1)}</span>}
                      <RowMenu it={it} view={view} act={act} />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
      {creating === 'ai' && <NewFormModal folder={view === 'label' ? label : ''} onClose={() => setCreating(false)} />}
      {creating === 'menu' && <CreateMenu onClose={() => setCreating(false)} />}
    </div>
  );
}

