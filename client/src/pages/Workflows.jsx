// Workflows: the form's Settings → Workflows pane, the global list (#/workflows) and the templates gallery.
import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { navigate } from '../router.js';
import { STARTERS, WF_TEMPLATES, WF_TEMPLATE_CATEGORIES } from '@shared/workflowElements.js';
import Icon from '../components/Icon.jsx';

async function createWorkflow(formId, title, steps) {
  const { id } = await api('/workflows', { method: 'POST', body: { formId, title, steps } });
  navigate(`/workflows/${id}/build`);
}

function WorkflowRows({ list }) {
  if (!list.length) return null;
  return (
    <div className="stack">
      {list.map((w) => (
        <a key={w.id} className="wf-row" href={`#/workflows/${w.id}/build`}>
          <span className="settings-icon small" style={{ background: '#0f766e' }}><Icon name="redo" size={15} /></span>
          <span className="grow" style={{ minWidth: 0 }}>
            <b style={{ color: 'var(--text)' }}>{w.title}</b>
            <span className="hint" style={{ display: 'block' }}>{w.form_title ? `${w.form_title} · ` : ''}{w.steps} step{w.steps === 1 ? '' : 's'} · {w.runs} run{w.runs === 1 ? '' : 's'}{w.active ? ` · ${w.active} in progress` : ''} · updated {fmtDate(w.updated_at)}</span>
          </span>
          <span className={`pill ${w.status === 'enabled' ? 'green' : ''}`}>{w.status === 'enabled' ? 'Enabled' : 'Disabled'}</span>
        </a>
      ))}
    </div>
  );
}

export function TemplatesGallery({ formId, forms, onClose }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [pickForm, setPickForm] = useState(formId || '');
  const [err, setErr] = useState('');
  const list = WF_TEMPLATES.filter((t) => (!cat || t.category === cat) && (!q || `${t.title} ${t.desc}`.toLowerCase().includes(q.toLowerCase())));
  const use = async (t) => {
    if (!pickForm) return setErr('Choose which form starts this workflow.');
    try { await createWorkflow(pickForm, `${t.title} Workflow`, t.build()); } catch (e) { setErr(e.message); }
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="tpl-title" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 1100 }}>
        <div className="row"><h2 id="tpl-title" style={{ margin: 0 }}>Workflow templates</h2><button className="right icon-btn ghost" aria-label="Close" onClick={onClose}><Icon name="close" size={14} /></button></div>
        <p className="hint">Start from a ready-made flow and adapt it. Each template is fully editable.</p>
        <div className="row wrap" style={{ marginBottom: 12 }}>
          <label className="search" style={{ flex: '1 1 240px' }}><Icon name="search" /><span className="sr-only">Search templates</span><input type="search" placeholder="Search in all workflow templates" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          {!formId && (
            <select aria-label="Form that starts the workflow" style={{ width: 'auto' }} value={pickForm} onChange={(e) => setPickForm(e.target.value)}>
              <option value="">Starts when this form is submitted…</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
          )}
        </div>
        {err && <p className="error">{err}</p>}
        <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
          <nav className="side-list" aria-label="Template categories" style={{ flex: '0 0 200px' }}>
            <button className={!cat ? 'active' : ''} onClick={() => setCat('')}>All categories <span className="right hint">{WF_TEMPLATES.length}</span></button>
            {WF_TEMPLATE_CATEGORIES.map((c) => <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>{c} <span className="right hint">{WF_TEMPLATES.filter((t) => t.category === c).length}</span></button>)}
          </nav>
          <div className="tpl-grid">
            {list.map((t) => (
              <article key={t.key} className="tpl-card">
                <b>{t.title} Workflow Template</b>
                <p className="hint">{t.desc}</p>
                <span className="hint">Category: {t.category}</span>
                <button className="accent small" style={{ alignSelf: 'flex-start' }} onClick={() => use(t)}>Use template</button>
              </article>
            ))}
            {!list.length && <p className="hint">No templates match.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings → Workflows inside a form.
export default function WorkflowsPane({ formId, def, update, me }) {
  const [list, setList] = useState(null);
  const [templates, setTemplates] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { api(`/workflows?formId=${formId}`).then(setList); }, [formId]);
  const s = def.settings || {};
  const setAp = (patch) => update((d) => ({ ...d, settings: { ...d.settings, approvals: { ...(d.settings?.approvals || {}), ...patch } } }));
  const start = async (st) => { setErr(''); try { await createWorkflow(formId, `${st.title === 'Start from Scratch' ? 'Workflow' : st.title}: ${def.title}`, st.steps()); } catch (e) { setErr(e.message); } };
  return (
    <div className="settings-pane" style={{ maxWidth: 900 }}>
      <div className="settings-title">
        <span className="settings-icon" style={{ background: '#0f766e' }}><Icon name="redo" /></span>
        <div><h2>Workflows</h2><p>Build workflows to automate your processes</p></div>
      </div>
      {list && <WorkflowRows list={list} />}
      <h3 style={{ margin: '8px 0 0' }}>Create a workflow for form submissions</h3>
      {err && <p className="error">{err}</p>}
      <div className="starter-grid">
        {STARTERS.map((st) => (
          <button key={st.key} className="type-card starter" disabled={st.soon} onClick={() => start(st)}>
            <span className="grow" style={{ textAlign: 'left' }}><b>{st.title}</b>{st.soon && <span className="tag">Soon</span>}<span className="hint" style={{ display: 'block' }}>{st.desc}</span></span>
          </button>
        ))}
        <button className="type-card starter" onClick={() => setTemplates(true)}>
          <span className="grow" style={{ textAlign: 'left' }}><b>Use Template</b><span className="hint" style={{ display: 'block' }}>Get started instantly with a workflow template</span></span>
        </button>
      </div>
      <details className="panel" style={{ padding: 16 }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Simple approvals (without a workflow)</summary>
        <div className="set-row" style={{ padding: '12px 0' }}><div className="grow"><b>Request approval</b><div className="hint">Approvers get a secure link to approve or reject each submission</div></div>
          <input type="checkbox" aria-label="Request approval" checked={!!s.approvals?.enabled} onChange={(e) => setAp({ enabled: e.target.checked })} /></div>
        <label className="lbl">Approvers</label><input value={s.approvals?.approvers || ''} placeholder={me.user.email} onChange={(e) => setAp({ approvers: e.target.value })} />
      </details>
      {templates && <TemplatesGallery formId={formId} forms={[]} onClose={() => setTemplates(false)} />}
    </div>
  );
}

// #/workflows — every workflow in the workspace.
export function WorkflowsPage() {
  const [list, setList] = useState(null);
  const [forms, setForms] = useState([]);
  const [templates, setTemplates] = useState(false);
  const [formId, setFormId] = useState('');
  useEffect(() => { api('/workflows').then(setList); api('/forms').then((d) => setForms(d.forms)); }, []);
  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Workflows</h1><p>Automate approvals, tasks, e-mails and integrations after each submission.</p></div>
        <div className="row wrap">
          <select aria-label="Form" style={{ width: 'auto', minHeight: 40 }} value={formId} onChange={(e) => setFormId(e.target.value)}>
            <option value="">Choose a form…</option>
            {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
          <button className="primary" style={{ minHeight: 40 }} disabled={!formId} onClick={() => createWorkflow(formId, 'Untitled workflow', [])}><Icon name="plus" />New workflow</button>
          <button style={{ minHeight: 40 }} onClick={() => setTemplates(true)}>Templates</button>
        </div>
      </header>
      {!list ? <p className="muted">Loading…</p> : list.length ? <WorkflowRows list={list} /> : <div className="panel muted" style={{ textAlign: 'center', padding: 40 }}>No workflows yet. Choose a form and create one, or start from a template.</div>}
      {templates && <TemplatesGallery forms={forms} onClose={() => setTemplates(false)} />}
    </div>
  );
}
