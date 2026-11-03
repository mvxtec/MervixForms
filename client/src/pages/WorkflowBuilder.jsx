// Workflow builder (#/workflows/:id/:tab): vertical canvas with branches, element panel, step settings,
// workflow settings, tracking page and runs.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, fmtDate } from '../api.js';
import { navigate } from '../router.js';
import { WF_ELEMENTS, WF_BY_KEY, WF_GROUPS, newStep, stepId } from '@shared/workflowElements.js';
import { INTEGRATIONS } from '@shared/integrations.js';
import { CONDITION_OPS } from '@shared/logic.js';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';

const GROUP_COLOR = { Basic: '#0f766e', Data: '#0369a1', Payment: '#15803d', Logic: '#7c3aed', AI: '#db2777', Notifications: '#ea580c' };
const colorOf = (type) => GROUP_COLOR[WF_BY_KEY[type]?.group] || '#57534e';
const initials = (s) => s.replace(/[^\w\s/&]/g, '').split(/[\s/&]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// ── Tree helpers. A location `loc` points at a list: [] is the main list, [i, b] is branch b of step i, etc. ──
function listAt(steps, loc) {
  let list = steps;
  for (let k = 0; k < loc.length; k += 2) list = list[loc[k]].branches[loc[k + 1]].steps;
  return list;
}
function editTree(steps, fn) { const copy = structuredClone(steps); fn(copy); return copy; }
function findStep(steps, id, loc = []) {
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].id === id) return { step: steps[i], loc, index: i };
    for (let b = 0; b < (steps[i].branches || []).length; b++) {
      const hit = findStep(steps[i].branches[b].steps, id, [...loc, i, b]);
      if (hit) return hit;
    }
  }
  return null;
}
const summary = (s, fields) => {
  const label = (id) => fields.find((f) => f.id === id)?.label || id;
  switch (s.type) {
    case 'email': case 'scheduledEmail': case 'trackingEmail': case 'sendPdf': return `To ${s.to || 'respondent'}${s.type === 'scheduledEmail' ? ` · after ${s.amount} ${s.unit}` : ''}`;
    case 'approval': case 'teamApproval': return `${s.approvers || 'Form owner'}${s.type === 'teamApproval' ? ` · ${s.mode === 'all' ? 'everyone' : 'anyone'} must approve` : ''}`;
    case 'task': return `${s.title} → ${s.assignee || 'form owner'}`;
    case 'ifElse': return s.field ? `${label(s.field)} ${CONDITION_OPS[s.op]} ${s.value ?? ''}` : 'Set a condition';
    case 'setStatus': return `Status: ${s.status}`;
    case 'wait': return `${s.amount} ${s.unit}`;
    case 'webhook': case 'slack': case 'teams': return s.url ? s.url.replace(/^https:\/\//, '').slice(0, 40) : 'Add a URL';
    case 'idGenerator': return `{${s.name}} = ${s.prefix}${'1'.padStart(Number(s.digits) || 5, '0')}`;
    case 'updateValue': return s.field ? `${label(s.field)} = ${s.value}` : 'Choose a field';
    case 'calculate': case 'summarize': case 'sentiment': case 'categorize': case 'customPrompt': return `Saves {${s.name}}`;
    case 'sms': case 'whatsapp': return s.to || 'Add numbers';
    default: return '';
  }
};

function Insert({ onClick, active }) {
  return <div className="wfc-insert"><button className={active ? 'on' : ''} aria-label="Add a step here" title="Add a step here" onClick={onClick}><Icon name="plus" size={14} /></button></div>;
}

function StepList({ steps, loc, ctx }) {
  const list = listAt(steps, loc);
  const isActive = (i) => ctx.insertAt && JSON.stringify(ctx.insertAt.loc) === JSON.stringify(loc) && ctx.insertAt.index === i;
  return (
    <div className="wfc-list">
      <Insert active={isActive(0)} onClick={() => ctx.setInsertAt({ loc, index: 0 })} />
      {list.map((s, i) => {
        const e = WF_BY_KEY[s.type];
        return (
          <div key={s.id} className="wfc-item">
            <div className={`wfc-node ${ctx.selected === s.id ? 'selected' : ''}`} role="button" tabIndex={0} aria-pressed={ctx.selected === s.id}
              onClick={() => ctx.setSelected(s.id)} onKeyDown={(ev) => { if (ev.key === 'Enter') ctx.setSelected(s.id); }}>
              <span className="wfc-icon" style={{ background: colorOf(s.type) }} aria-hidden="true">{initials(e?.label || s.type)}</span>
              <span className="grow" style={{ minWidth: 0 }}>
                <b>{e?.label || s.type}</b>
                <span className="hint" style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary(s, ctx.fields)}</span>
              </span>
              <button className="icon-btn small ghost danger" aria-label={`Delete ${e?.label}`} onClick={(ev) => { ev.stopPropagation(); ctx.remove(s.id); }}><Icon name="trash" size={14} /></button>
            </div>
            {s.branches && (
              <div className="wfc-branches">
                {s.branches.map((b, bi) => (
                  <div key={b.id} className="wfc-branch">
                    <span className="wfc-branch-label">{b.label}</span>
                    <StepList steps={steps} loc={[...loc, i, bi]} ctx={ctx} />
                  </div>
                ))}
              </div>
            )}
            <Insert active={isActive(i + 1)} onClick={() => ctx.setInsertAt({ loc, index: i + 1 })} />
          </div>
        );
      })}
    </div>
  );
}

function ElementPanel({ onAdd }) {
  const [tab, setTab] = useState('basic');
  const [q, setQ] = useState('');
  const match = (l) => !q || l.toLowerCase().includes(q.toLowerCase());
  const integ = INTEGRATIONS.filter((x) => x.category !== 'Payments' && match(x.name));
  return (
    <aside className="wf-panel" aria-label="Workflow elements">
      <div className="seg palette-tabs" role="tablist">
        {[['basic', 'Basic'], ['integrations', 'Integrations']].map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
      </div>
      <label className="search" style={{ minHeight: 38 }}><Icon name="search" size={15} /><span className="sr-only">Search elements</span><input type="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      {tab === 'basic' ? WF_GROUPS.map((g) => {
        const items = WF_ELEMENTS.filter((e) => e.group === g && match(e.label));
        if (!items.length) return null;
        return (
          <div key={g}>
            <h4>{g}</h4>
            <div className="palette-list">
              {items.map((e) => (
                <button key={e.key} className={`item ${e.ready ? '' : 'soon'}`} disabled={!e.ready} title={e.ready ? `Add ${e.label}` : e.reason} onClick={() => onAdd(e.key)}>
                  <span className="ico" style={e.ready ? { background: GROUP_COLOR[g], color: '#fff' } : undefined} aria-hidden="true">{initials(e.label)}</span>
                  <span className="grow">{e.label}</span>
                  {e.isNew && e.ready && <span className="pill teal" style={{ fontSize: 10, padding: '0 6px' }}>New</span>}
                  {!e.ready && <span className="pill" style={{ fontSize: 10, padding: '0 6px' }}>Soon</span>}
                </button>
              ))}
            </div>
          </div>
        );
      }) : (
        <div className="palette-list">
          {integ.map((x) => {
            const step = { webhook: 'webhook', slack: 'slack', teams: 'teams' }[x.kind];
            return (
              <button key={x.key} className={`item ${step ? '' : 'soon'}`} disabled={!step} title={step ? `Add ${x.name} (via URL)` : 'Coming soon — use the Webhook step with Zapier, Make or n8n'} onClick={() => onAdd(step, x)}>
                <span className="ico" style={step ? { background: '#0e7490', color: '#fff' } : undefined} aria-hidden="true">{initials(x.name)}</span>
                <span className="grow">{x.name}</span>
                {!step && <span className="pill" style={{ fontSize: 10, padding: '0 6px' }}>Soon</span>}
              </button>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function StepSettings({ step, set, fields }) {
  const e = WF_BY_KEY[step.type];
  const inputs = fields.filter((f) => !['heading', 'paragraph', 'image', 'divider', 'pagebreak', 'section'].includes(f.type));
  const txt = (k, label, ph = '') => (<div key={k}><label className="lbl" htmlFor={`st-${k}`}>{label}</label><input id={`st-${k}`} value={step[k] ?? ''} placeholder={ph} onChange={(ev) => set({ [k]: ev.target.value })} /></div>);
  const area = (k, label, rows = 4) => (<div key={k}><label className="lbl" htmlFor={`st-${k}`}>{label}</label><textarea id={`st-${k}`} rows={rows} value={step[k] ?? ''} onChange={(ev) => set({ [k]: ev.target.value })} /></div>);
  const fieldSel = (k, label) => (<div key={k}><label className="lbl" htmlFor={`st-${k}`}>{label}</label><select id={`st-${k}`} value={step[k] || ''} onChange={(ev) => set({ [k]: ev.target.value })}><option value="">All answers / choose a field</option>{inputs.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select></div>);
  const delay = (<div className="grid2" key="delay"><div><label className="lbl">After</label><input type="number" min="1" value={step.amount} onChange={(ev) => set({ amount: Number(ev.target.value) })} /></div><div><label className="lbl">Unit</label><select value={step.unit} onChange={(ev) => set({ unit: ev.target.value })}>{['minutes', 'hours', 'days', 'weeks'].map((u) => <option key={u}>{u}</option>)}</select></div></div>);
  const toHint = <p className="hint" style={{ margin: '4px 0 0' }}>Use <code>{'{respondent}'}</code> for the person who submitted, or <code>{'{fieldId}'}</code> for an e-mail answer. Tokens like <code>{'{all_fields}'}</code> and saved values like <code>{'{reqId}'}</code> work in text.</p>;
  let body;
  switch (step.type) {
    case 'email': case 'scheduledEmail':
      body = <>{step.type === 'scheduledEmail' && delay}{txt('to', 'To', '{respondent}, team@company.com')}{toHint}{txt('subject', 'Subject')}<label className="lbl">Message</label><RichText label="E-mail message" value={step.body} onChange={(body) => set({ body })} fields={inputs} minHeight={200} /></>;
      break;
    case 'trackingEmail': body = <>{txt('to', 'To', '{respondent}')}{toHint}{txt('subject', 'Subject')}<p className="hint">Sends a link to the tracking page (see the Tracking page tab).</p></>; break;
    case 'sendPdf': body = <>{txt('to', 'To')}{toHint}{txt('subject', 'Subject')}</>; break;
    case 'approval': case 'teamApproval':
      body = (
        <>
          {txt('approvers', 'Approvers (comma-separated e-mails)', 'manager@company.com')}
          {step.type === 'teamApproval' && <div><label className="lbl">Decision rule</label><select value={step.mode} onChange={(ev) => set({ mode: ev.target.value })}><option value="all">Everyone must approve (one rejection rejects)</option><option value="any">Anyone can decide</option></select></div>}
          {area('message', 'Message to approvers', 3)}
          <p className="hint">Each approver gets a secure link. The flow continues down the Approved or Rejected branch. <code>{'{approval_note}'}</code> holds their note.</p>
        </>
      );
      break;
    case 'task': body = <>{txt('assignee', 'Assignee e-mail', 'ops@company.com')}{txt('title', 'Task title')}{area('details', 'Details', 3)}<p className="hint">The flow waits until the assignee marks the task done.</p></>; break;
    case 'webhook': body = <>{txt('url', 'URL (https)', 'https://hooks.zapier.com/…')}<p className="hint">POSTs the submission and saved values as JSON. Works with Zapier, Make, n8n and any API.</p></>; break;
    case 'slack': case 'teams': body = <>{txt('url', `${e.label} webhook URL`, 'https://…')}{area('message', 'Message', 3)}</>; break;
    case 'sms': case 'whatsapp': body = <>{txt('to', 'Phone numbers (with country code)', '+91 98765 43210')}{area('message', 'Message', 3)}</>; break;
    case 'ifElse':
      body = (
        <>
          {fieldSel('field', 'If field')}
          <div><label className="lbl">State</label><select value={step.op} onChange={(ev) => set({ op: ev.target.value })}>{Object.entries(CONDITION_OPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          {txt('value', 'Value')}
          <p className="hint">Saved values from earlier steps (like <code>sentiment</code>) can be compared too — type their name as the field in a Conditional Branch.</p>
        </>
      );
      break;
    case 'branch':
      body = (
        <>
          {(step.rules || []).map((r, i) => (
            <div key={i} className="panel" style={{ padding: 10, marginTop: 8 }}>
              <div className="opt-row"><input aria-label="Branch name" value={r.label} onChange={(ev) => set({ rules: step.rules.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)), branches: step.branches.map((b, j) => (j === i ? { ...b, label: ev.target.value } : b)) })} />
                <button className="small danger" aria-label="Remove branch" disabled={step.rules.length < 2} onClick={() => set({ rules: step.rules.filter((_, j) => j !== i), branches: step.branches.filter((_, j) => j !== i) })}>✕</button></div>
              <div className="grid2" style={{ marginTop: 6 }}>
                <select aria-label="Field" value={r.field} onChange={(ev) => set({ rules: step.rules.map((x, j) => (j === i ? { ...x, field: ev.target.value } : x)) })}><option value="">Field…</option>{inputs.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}</select>
                <select aria-label="State" value={r.op} onChange={(ev) => set({ rules: step.rules.map((x, j) => (j === i ? { ...x, op: ev.target.value } : x)) })}>{Object.entries(CONDITION_OPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              </div>
              <input aria-label="Value" style={{ marginTop: 6 }} placeholder="Value" value={r.value} onChange={(ev) => set({ rules: step.rules.map((x, j) => (j === i ? { ...x, value: ev.target.value } : x)) })} />
            </div>
          ))}
          <button className="small" style={{ marginTop: 8 }} onClick={() => {
            const label = `Branch ${step.rules.length + 1}`;
            set({ rules: [...step.rules, { label, field: '', op: 'equals', value: '' }], branches: [...step.branches.slice(0, -1), { id: stepId(), label, steps: [] }, step.branches[step.branches.length - 1]] });
          }}>+ Add branch</button>
          <p className="hint">The first matching branch runs; otherwise “Otherwise”.</p>
        </>
      );
      break;
    case 'split':
      body = (
        <>
          <label className="lbl">Number of branches</label>
          <input type="number" min="2" max="6" value={step.branches.length} onChange={(ev) => {
            const n = Math.max(2, Math.min(6, Number(ev.target.value) || 2));
            const b = [...step.branches];
            while (b.length < n) b.push({ id: stepId(), label: `Branch ${b.length + 1}`, steps: [] });
            set({ branches: b.slice(0, n), count: n });
          }} />
          <p className="hint">Branches run one after another, then the flow continues.</p>
        </>
      );
      break;
    case 'setStatus': body = <>{txt('status', 'Status shown on the tracking page', 'In review')}</>; break;
    case 'wait': body = <>{delay}<p className="hint">The flow pauses, then continues automatically.</p></>; break;
    case 'pause': body = <p className="hint">The flow stops here until you press Resume on the Runs tab.</p>; break;
    case 'end': body = <p className="hint">Ends the workflow. Steps after this one don't run.</p>; break;
    case 'verifyPayment': body = <p className="hint">Continues down “Paid” when the submission's payment succeeded, otherwise “Not paid”.</p>; break;
    case 'idGenerator': body = <>{txt('prefix', 'Prefix')}{txt('digits', 'Digits')}{txt('name', 'Save as', 'requestId')}<p className="hint">Use it later as <code>{`{${step.name}}`}</code>.</p></>; break;
    case 'updateValue': body = <>{fieldSel('field', 'Field to update')}{txt('value', 'New value (tokens allowed)')}</>; break;
    case 'calculate': body = <>{txt('formula', 'Formula', '{qty} * {price}')}{txt('name', 'Save as')}</>; break;
    case 'summarize': body = <>{txt('name', 'Save summary as')}<p className="hint">Needs <code>ANTHROPIC_API_KEY</code>. Skipped (empty) without it.</p></>; break;
    case 'sentiment': body = <>{fieldSel('field', 'Text to analyse')}{txt('name', 'Save as')}<p className="hint">Saves Positive, Neutral or Negative. Needs <code>ANTHROPIC_API_KEY</code>.</p></>; break;
    case 'categorize': body = <>{fieldSel('field', 'Text to categorize')}{area('categories', 'Categories (one per line)', 4)}{txt('name', 'Save as')}</>; break;
    case 'customPrompt': body = <>{area('prompt', 'Prompt (tokens allowed)', 5)}{txt('name', 'Save answer as')}</>; break;
    default: body = <p className="hint">No settings.</p>;
  }
  return (
    <div>
      <div className="props-head"><div><div className="hint">{e?.group}</div><div style={{ fontWeight: 600, fontSize: 15 }}>{e?.label || step.type}</div></div></div>
      {body}
    </div>
  );
}

function Runs({ wf }) {
  const [runs, setRuns] = useState(null);
  const [msg, setMsg] = useState('');
  const load = () => api(`/workflows/${wf.id}/runs`).then(setRuns);
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [wf.id]);
  const act = async (rid, a) => { await api(`/workflows/${wf.id}/runs/${rid}/${a}`, { method: 'POST' }); load(); };
  const test = async () => { setMsg(''); try { await api(`/workflows/${wf.id}/test`, { method: 'POST' }); load(); } catch (e) { setMsg(e.message); } };
  const pill = { running: 'blue', waiting: 'amber', completed: 'green', cancelled: '', failed: 'red' };
  return (
    <div className="page" style={{ maxWidth: 1000 }}>
      <div className="section-head"><h2 style={{ margin: 0 }}>Runs</h2><button className="accent" onClick={test}>Run now with the latest submission</button></div>
      {msg && <p className="error">{msg}</p>}
      {!runs ? <p className="muted">Loading…</p> : !runs.length ? <div className="panel muted">No runs yet. Submit the form, or run it now with the latest submission.</div> : (
        <div className="stack">
          {runs.map((r) => (
            <details key={r.id} className="panel" style={{ padding: 14 }}>
              <summary className="row wrap" style={{ cursor: 'pointer' }}>
                <b>Run #{r.id}</b><span className="hint">submission #{r.submission_id} · {fmtDate(r.created_at)}</span>
                <span className={`pill ${pill[r.status]}`}>{r.status}</span><span className="pill">{r.label}</span>
                {r.current && r.status === 'waiting' && <span className="hint">at {WF_BY_KEY[r.current]?.label}{r.resume_at ? ` until ${fmtDate(r.resume_at)}` : ''}</span>}
                <span className="right row">
                  {r.status === 'waiting' && <button className="small" onClick={(e) => { e.preventDefault(); act(r.id, 'resume'); }}>Resume</button>}
                  {['running', 'waiting'].includes(r.status) && <button className="small danger" onClick={(e) => { e.preventDefault(); act(r.id, 'cancel'); }}>Cancel</button>}
                  <button className="small" onClick={(e) => { e.preventDefault(); act(r.id, 'restart'); }}>Restart</button>
                  <a className="btn small" href={`#/track/${r.token}`} target="_blank" rel="noreferrer">Tracking page</a>
                </span>
              </summary>
              <ol className="wf-log">{r.log.map((l, i) => <li key={i}><span className="hint mono">{l.at}</span> {l.type ? <b>{WF_BY_KEY[l.type]?.label || l.type}</b> : null} {l.note}</li>)}</ol>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

export default function WorkflowBuilder({ id, tab = 'build' }) {
  const [wf, setWf] = useState(null);
  const [saveState, setSaveState] = useState('saved');
  const [selected, setSelected] = useState(null);
  const [insertAt, setInsertAt] = useState(null);
  const timer = useRef(null);
  const latest = useRef(null);
  useEffect(() => { api(`/workflows/${id}`).then((w) => { setWf(w); latest.current = w; }).catch(() => navigate('/workflows')); }, [id]);

  const save = useCallback(async () => {
    const w = latest.current;
    setSaveState('saving');
    try { await api(`/workflows/${id}`, { method: 'PUT', body: { title: w.title, status: w.status, definition: w.definition } }); setSaveState('saved'); } catch { setSaveState('error'); }
  }, [id]);
  const change = (fn) => {
    const next = fn(latest.current);
    latest.current = next; setWf(next); setSaveState('dirty');
    clearTimeout(timer.current); timer.current = setTimeout(save, 800);
  };
  const setDef = (patch) => change((w) => ({ ...w, definition: { ...w.definition, ...patch } }));
  const setSteps = (fn) => change((w) => ({ ...w, definition: { ...w.definition, steps: fn(w.definition.steps || []) } }));

  if (!wf) return <div className="page muted">Loading…</div>;
  const steps = wf.definition.steps || [];
  const fields = wf.form?.fields || [];
  const add = (key, integ) => {
    if (!key) return;
    const s = newStep(key, integ ? { url: '', message: `New submission to {form_title}` } : {});
    const at = insertAt || { loc: [], index: steps.length };
    setSteps((st) => editTree(st, (t) => listAt(t, at.loc).splice(at.index, 0, s)));
    setInsertAt({ loc: at.loc, index: at.index + 1 });
    setSelected(s.id);
  };
  const remove = (sid) => {
    setSteps((st) => editTree(st, (t) => { const hit = findStep(t, sid); if (hit) listAt(t, hit.loc).splice(hit.index, 1); }));
    if (selected === sid) setSelected(null);
    setInsertAt(null);
  };
  const sel = selected && findStep(steps, selected)?.step;
  const setSel = (patch) => setSteps((st) => editTree(st, (t) => { const hit = findStep(t, selected); if (hit) Object.assign(hit.step, patch); }));
  const tabs = [['build', 'Build'], ['settings', 'Settings'], ['tracking', 'Tracking page'], ['runs', 'Runs']];
  const tr = wf.definition.tracking || {};

  return (
    <div className={`fw-page ${tab === 'build' ? 'fill' : ''}`}>
      <header className="fw-head">
        <div className="fw-title">
          <a href={wf.form_id ? `#/forms/${wf.form_id}/settings/workflows` : '#/workflows'} className="btn icon-btn" aria-label="Back"><Icon name="back" /></a>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <input value={wf.title} aria-label="Workflow title" onChange={(e) => change((w) => ({ ...w, title: e.target.value }))} />
            <span className="fw-status"><span className={`dot ${saveState === 'saved' ? '' : saveState === 'error' ? 'err' : 'warn'}`} />{{ saved: 'All changes saved', dirty: 'Unsaved changes', saving: 'Saving…', error: 'Save failed' }[saveState]} · Form: {wf.form?.title || '—'}</span>
          </div>
        </div>
        <nav className="seg" aria-label="Workflow sections">
          {tabs.map(([k, l]) => <a key={k} href={`#/workflows/${id}/${k}`} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined}>{l}</a>)}
        </nav>
        <div className="fw-actions">
          <button role="switch" aria-checked={wf.status === 'enabled'} className={`wg-switch ${wf.status === 'enabled' ? 'on' : ''}`} onClick={() => change((w) => ({ ...w, status: w.status === 'enabled' ? 'disabled' : 'enabled' }))}>
            <span className="wg-knob" aria-hidden="true" />{wf.status === 'enabled' ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </header>

      {tab === 'build' && (
        <div className="wf-builder">
          <ElementPanel onAdd={add} />
          <div className="wf-canvas" onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
            <div className="wfc-start"><span className="wfc-icon" style={{ background: '#18181b' }} aria-hidden="true">F</span><span><b>Form submitted</b><span className="hint" style={{ display: 'block' }}>{wf.form?.title}{wf.definition.trigger === 'condition' ? ' · only when a Run Workflow condition fires' : ''}</span></span></div>
            <StepList steps={steps} loc={[]} ctx={{ selected, setSelected, insertAt, setInsertAt, remove, fields }} />
            <div className="wfc-end">End</div>
            {!steps.length && <p className="hint" style={{ textAlign: 'center' }}>Pick an element on the left to add your first step.</p>}
          </div>
          <aside className="props" aria-label="Step settings">
            {sel ? <StepSettings step={sel} set={setSel} fields={fields} /> : (
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Workflow</div>
                <p className="hint">Click a step to edit it. Click a <b>+</b> on the canvas to choose where new steps go, then pick an element on the left.</p>
                <p className="hint">{insertAt ? 'New steps will be added at the highlighted +.' : 'New steps are added at the end.'}</p>
              </div>
            )}
          </aside>
        </div>
      )}

      {tab === 'settings' && (
        <div className="page" style={{ maxWidth: 760 }}>
          <div className="panel settings-card">
            <div className="set-row col"><b>Workflow title</b><span className="hint">A short, descriptive name for this flow.</span><input value={wf.title} onChange={(e) => change((w) => ({ ...w, title: e.target.value }))} /></div>
            <div className="set-row col">
              <b>Starts when</b>
              <select value={wf.definition.trigger || 'submission'} onChange={(e) => setDef({ trigger: e.target.value })}>
                <option value="submission">Every new submission</option>
                <option value="condition">Only when a “Run Workflow” condition fires</option>
              </select>
              <span className="hint">Add “Run Workflow” conditions in the form's Settings → Conditions.</span>
            </div>
            <div className="set-row">
              <div className="grow"><b>Restart workflow on submission edit</b><div className="hint">The flow restarts every time a submission is edited in the Inbox.</div></div>
              <button role="switch" aria-checked={!!wf.definition.settings?.restartOnEdit} className={`wg-switch ${wf.definition.settings?.restartOnEdit ? 'on' : ''}`} onClick={() => setDef({ settings: { ...wf.definition.settings, restartOnEdit: !wf.definition.settings?.restartOnEdit } })}><span className="wg-knob" aria-hidden="true" />{wf.definition.settings?.restartOnEdit ? 'On' : 'Off'}</button>
            </div>
            <div className="set-row">
              <div className="grow"><b>Delete workflow</b><div className="hint">Removes the workflow and its run history.</div></div>
              <button className="danger" onClick={async () => { if (!confirm('Delete this workflow?')) return; await api(`/workflows/${id}`, { method: 'DELETE' }); navigate(wf.form_id ? `/forms/${wf.form_id}/settings/workflows` : '/workflows'); }}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'tracking' && (
        <div className="page" style={{ maxWidth: 1000 }}>
          <div className="row wrap" style={{ alignItems: 'flex-start', gap: 20 }}>
            <div className="panel settings-card" style={{ flex: '1 1 320px' }}>
              <div className="set-row col"><b>Page title</b><input value={tr.title || ''} placeholder={wf.title} onChange={(e) => setDef({ tracking: { ...tr, title: e.target.value } })} /></div>
              <div className="set-row col"><b>Message</b><textarea rows={3} value={tr.message || ''} placeholder="Track the status and follow each step as it progresses." onChange={(e) => setDef({ tracking: { ...tr, message: e.target.value } })} /></div>
              <div className="set-row"><div className="grow"><b>Accent colour</b></div><input type="color" aria-label="Accent colour" value={tr.color || '#0f766e'} onChange={(e) => setDef({ tracking: { ...tr, color: e.target.value } })} style={{ maxWidth: 80 }} /></div>
              <p className="hint" style={{ padding: '0 22px 16px' }}>Respondents get the link from a “Status Tracking Email” step. Milestones come from “Set Status” steps.</p>
            </div>
            <div className="track-card" style={{ flex: '1 1 320px', '--tc': tr.color || '#0f766e' }}>
              <div className="row"><b className="grow">{tr.title || wf.title}</b><span className="pill amber">In Progress</span></div>
              <p className="hint">{tr.message || 'Track the status and follow each step as it progresses.'}</p>
              <ol className="track-steps"><li className="done"><b>Flow Started</b><span>Sep 12</span></li><li className="current"><b>In Progress</b><span>Sep 15</span></li></ol>
            </div>
          </div>
        </div>
      )}

      {tab === 'runs' && <Runs wf={wf} />}
    </div>
  );
}
