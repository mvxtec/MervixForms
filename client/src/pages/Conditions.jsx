// Settings → Conditions: rule list, "New condition" type picker (with AI describe) and the IF / DO editor.
import { useState } from 'react';
import { CONDITION_OPS, ACTION_TYPES, CONDITION_TYPES } from '@shared/logic.js';
import { isDisplay, typeLabel } from '@shared/fields.js';
import { formEmails } from '@shared/emails.js';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

const NO_VALUE = ['isFilled', 'isEmpty'];
const rid = () => `r${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
const TYPE_ICON = { visibility: 'eye', calculate: 'logic', state: 'lock', options: 'forms', products: 'apps', page: 'down', thankyou: 'check', email: 'inbox', workflow: 'redo' };
const typeOf = (rule) => CONDITION_TYPES.find((t) => t.key === rule.kind) || CONDITION_TYPES.find((t) => t.actions.includes(rule.actions?.[0]?.type)) || CONDITION_TYPES[0];

function describe(def, rule) {
  const label = (id) => def.fields.find((f) => f.id === id)?.label || id || '…';
  const ifs = (rule.conditions || []).map((c) => `${label(c.field)} ${CONDITION_OPS[c.op] || c.op}${NO_VALUE.includes(c.op) ? '' : ` “${c.value ?? ''}”`}`).join(rule.match === 'any' ? ' OR ' : ' AND ');
  const dos = (rule.actions || []).map((a) => `${ACTION_TYPES[a.type] || a.type}${a.target ? ` ${a.target === 'end' ? 'end of form' : label(a.target)}` : ''}`).join(', ');
  return { ifs, dos };
}

function ValueInput({ def, c, onChange }) {
  const f = def.fields.find((x) => x.id === c.field);
  const opts = f?.options || (f?.type === 'yesno' ? ['Yes', 'No'] : f?.type === 'rating' ? Array.from({ length: f.stars || 5 }, (_, i) => String(i + 1)) : null);
  if (opts && ['equals', 'notEquals'].includes(c.op)) {
    return <select aria-label="Value" value={c.value} onChange={(e) => onChange(e.target.value)}><option value="">Select a value</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
  }
  return <input aria-label="Value" value={c.value ?? ''} disabled={!c.field || NO_VALUE.includes(c.op)} onChange={(e) => onChange(e.target.value)} placeholder="Please type a value here" />;
}

function ActionInputs({ def, a, setA, workflows }) {
  const inputs = def.fields.filter((f) => !isDisplay(f));
  const pick = (list, label = 'Select field') => (
    <select aria-label="Field" value={a.target || ''} onChange={(e) => setA({ target: e.target.value })}>
      <option value="">{label}</option>
      {list.map((f) => <option key={f.id} value={f.id}>{f.label} ({typeLabel(f)})</option>)}
    </select>
  );
  const pages = def.fields.filter((f) => f.type === 'pagebreak');
  switch (a.type) {
    case 'show': case 'hide': return pick(def.fields.filter((f) => f.type !== 'pagebreak'));
    case 'require': case 'unrequire': case 'enable': case 'disable': return pick(inputs);
    case 'mask': return <>{pick(def.fields.filter((f) => ['text', 'phone', 'number'].includes(f.type)))}<input aria-label="Mask" value={a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="Mask: # digit, @ letter, * any — e.g. (###) ###-####" /></>;
    case 'setValue':
      return (
        <>
          {pick(inputs)}
          <input aria-label="Value or formula" value={a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="Value, or formula like {qty} * {price}" />
          <div className="row wrap">{inputs.slice(0, 12).map((f) => <button key={f.id} type="button" className="chip" onClick={() => setA({ value: `${a.value || ''}{${f.id}}` })}>{f.label}</button>)}</div>
        </>
      );
    case 'setOptions': return <>{pick(def.fields.filter((f) => ['dropdown', 'radio', 'checkbox'].includes(f.type)))}<textarea aria-label="New options" rows={4} value={Array.isArray(a.value) ? a.value.join('\n') : a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="New options, one per line" /></>;
    case 'showProducts': case 'hideProducts': {
      const pf = def.fields.find((f) => f.id === a.target);
      const chosen = String(a.value || '').split(',').filter(Boolean);
      return (
        <>
          {pick(def.fields.filter((f) => f.type === 'products'), 'Select product list')}
          {pf && <div className="stack">{(pf.products || []).map((p) => (
            <label key={p.id} className="row"><input type="checkbox" checked={chosen.includes(p.id)} onChange={(e) => setA({ value: (e.target.checked ? [...chosen, p.id] : chosen.filter((x) => x !== p.id)).join(',') })} /> {p.name}</label>
          ))}</div>}
        </>
      );
    }
    case 'skipTo':
      return (
        <select aria-label="Page" value={a.target || ''} onChange={(e) => setA({ target: e.target.value })}>
          <option value="">Select page</option>
          {def.layout === 'card' ? def.fields.filter((f) => f.type !== 'pagebreak').map((f) => <option key={f.id} value={f.id}>{f.label}</option>) : pages.map((p, k) => <option key={p.id} value={p.id}>Page {k + 2}</option>)}
          <option value="end">End of form (submit)</option>
        </select>
      );
    case 'hidePage': return <select aria-label="Page" value={a.target || ''} onChange={(e) => setA({ target: e.target.value })}><option value="">Select page</option>{pages.map((p, k) => <option key={p.id} value={p.id}>Page {k + 2}</option>)}</select>;
    case 'thankyou': return <textarea aria-label="Thank-you message" rows={3} value={a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="Custom thank-you message (use {fieldId} for answers)" />;
    case 'redirect': return <input aria-label="Redirect URL" value={a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="https://…" />;
    case 'emailTo':
      return (
        <>
          <select aria-label="E-mail" value={a.target || ''} onChange={(e) => setA({ target: e.target.value })}><option value="">Select e-mail</option>{formEmails(def.settings).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
          <input aria-label="Send to" value={a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="Send to (comma-separated e-mails)" />
        </>
      );
    case 'runWorkflow':
      return workflows.length
        ? <select aria-label="Workflow" value={a.target || ''} onChange={(e) => setA({ target: e.target.value })}><option value="">Select workflow</option>{workflows.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select>
        : <p className="hint" style={{ margin: 0 }}>This form has no workflows yet. Create one in Settings → Workflows.</p>;
    default: return null;
  }
}

function RuleEditor({ def, rule, onSave, onCancel, workflows }) {
  const [r, setR] = useState(rule);
  const type = typeOf(r);
  const inputs = def.fields.filter((f) => !isDisplay(f));
  const setC = (i, patch) => setR({ ...r, conditions: r.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  const setA = (i, patch) => setR({ ...r, actions: r.actions.map((a, j) => (j === i ? { ...a, ...patch } : a)) });
  const valid = r.conditions.every((c) => c.field) && r.actions.every((a) => a.target || ['thankyou', 'redirect'].includes(a.type));
  return (
    <div className="settings-pane">
      <div className="settings-title">
        <button className="icon-btn ghost" aria-label="Back to conditions" onClick={onCancel}><Icon name="back" /></button>
        <span className="settings-icon"><Icon name={TYPE_ICON[type.key]} /></span>
        <div><h2>{type.title}</h2><p>{type.desc}</p></div>
      </div>
      <div className="cond-block if">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <b>IF</b>
          {r.conditions.length > 1 && (
            <div className="seg" role="radiogroup" aria-label="Match">
              {[['all', 'ALL'], ['any', 'ANY']].map(([k, l]) => <button key={k} role="radio" aria-checked={r.match === k} className={r.match === k ? 'on' : ''} onClick={() => setR({ ...r, match: k })}>{l}</button>)}
            </div>
          )}
        </div>
        {r.conditions.map((c, i) => (
          <div key={i} className="cond-row">
            <select aria-label="If field" value={c.field} onChange={(e) => setC(i, { field: e.target.value, value: '' })}>
              <option value="">Select field</option>
              {inputs.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <select aria-label="State" value={c.op} disabled={!c.field} onChange={(e) => setC(i, { op: e.target.value })}>
              {Object.entries(CONDITION_OPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <ValueInput def={def} c={c} onChange={(value) => setC(i, { value })} />
            {r.conditions.length > 1 && <button className="icon-btn ghost danger" aria-label="Remove condition" onClick={() => setR({ ...r, conditions: r.conditions.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>}
          </div>
        ))}
        <button className="small" onClick={() => setR({ ...r, conditions: [...r.conditions, { field: '', op: 'equals', value: '' }] })}><Icon name="plus" size={14} />Add condition</button>
      </div>
      <div className="cond-block do">
        <b>DO</b>
        {r.actions.map((a, i) => (
          <div key={i} className="cond-row">
            <select aria-label="Action" value={a.type} onChange={(e) => setA(i, { type: e.target.value, target: '', value: '' })}>
              {type.actions.map((k) => <option key={k} value={k}>{ACTION_TYPES[k]}</option>)}
            </select>
            <ActionInputs def={def} a={a} setA={(patch) => setA(i, patch)} workflows={workflows} />
            {r.actions.length > 1 && <button className="icon-btn ghost danger" aria-label="Remove action" onClick={() => setR({ ...r, actions: r.actions.filter((_, j) => j !== i) })}><Icon name="trash" size={14} /></button>}
          </div>
        ))}
        <button className="small" onClick={() => setR({ ...r, actions: [...r.actions, { type: type.actions[0], target: '', value: '' }] })}><Icon name="plus" size={14} />Add action</button>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={onCancel}>Cancel</button>
        <button className="accent" disabled={!valid} onClick={() => onSave(r)}>Save</button>
      </div>
      {!valid && <p className="hint" style={{ textAlign: 'right' }}>Choose a field for every condition and action to save.</p>}
    </div>
  );
}

export default function Conditions({ def, update, formId, me, workflows = [] }) {
  const [view, setView] = useState({ mode: 'list' });
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const rules = def.logic || [];
  const setRules = (fn) => update((d) => ({ ...d, logic: fn(d.logic || []) }));
  const save = (rule) => {
    setRules((rs) => (rs.some((x) => x.id === rule.id) ? rs.map((x) => (x.id === rule.id ? rule : x)) : [...rs, rule]));
    setView({ mode: 'list' });
  };
  const generate = async () => {
    setBusy(true); setErr('');
    try {
      const { rules: made } = await api('/ai/conditions', { method: 'POST', body: { formId, prompt, definition: def } });
      if (!made.length) setErr('The AI could not turn that into a condition. Try naming the fields.');
      else { setRules((rs) => [...rs, ...made]); setPrompt(''); setView({ mode: 'list' }); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  if (view.mode === 'edit') return <RuleEditor def={def} rule={view.rule} workflows={workflows} onSave={save} onCancel={() => setView({ mode: rules.length ? 'list' : 'new' })} />;

  if (view.mode === 'new' || !rules.length) {
    return (
      <div className="settings-pane">
        <div className="settings-title">
          {rules.length > 0 && <button className="icon-btn ghost" aria-label="Back to conditions" onClick={() => setView({ mode: 'list' })}><Icon name="back" /></button>}
          <span className="settings-icon" style={{ background: 'var(--ink)' }}><Icon name="logic" /></span>
          <div><h2>New condition</h2><p>Automatically trigger an action when a condition is met</p></div>
        </div>
        <section className="panel ai-cond">
          <h3 className="row"><Icon name="sparkles" size={18} style={{ color: 'var(--accent)' }} />Describe your conditions <span className="pill teal" style={{ fontSize: 10 }}>AI</span></h3>
          <textarea rows={3} aria-label="Describe your conditions" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. If the email is empty, hide the submit button. If topic is Other, show and require 'Describe your topic'." />
          <div className="row">
            <select aria-label="Insert a field" value="" onChange={(e) => e.target.value && setPrompt(`${prompt}${prompt && !prompt.endsWith(' ') ? ' ' : ''}“${def.fields.find((f) => f.id === e.target.value)?.label}” `)} style={{ maxWidth: 180 }}>
              <option value="">+ Add field</option>
              {def.fields.filter((f) => !isDisplay(f)).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <button className="accent right" disabled={busy || prompt.trim().length < 5 || !me.ai} onClick={generate} title={me.ai ? '' : 'Set ANTHROPIC_API_KEY to enable AI'}>{busy ? 'Generating…' : 'Generate'}</button>
          </div>
          {!me.ai && <p className="hint" style={{ margin: 0 }}>AI needs <code>ANTHROPIC_API_KEY</code> in <code>.env</code>. You can still add conditions manually below.</p>}
          {err && <p className="error" style={{ margin: 0 }}>{err}</p>}
        </section>
        <div className="type-list">
          {CONDITION_TYPES.map((t) => (
            <button key={t.key} className="type-card" onClick={() => setView({ mode: 'edit', rule: { id: rid(), kind: t.key, match: 'all', conditions: [{ field: '', op: 'equals', value: '' }], actions: [{ type: t.actions[0], target: '', value: '' }] } })}>
              <span className="settings-icon small"><Icon name={TYPE_ICON[t.key]} size={16} /></span>
              <span className="grow" style={{ textAlign: 'left' }}>
                <span className="row" style={{ fontWeight: 600 }}>{t.title}{t.isNew && <span className="tag">NEW</span>}</span>
                <span className="hint" style={{ display: 'block', fontSize: 13 }}>{t.desc}</span>
              </span>
              <Icon name="down" size={16} style={{ transform: 'rotate(-90deg)', color: 'var(--muted)' }} />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="settings-pane">
      <div className="settings-title">
        <span className="settings-icon" style={{ background: 'var(--ink)' }}><Icon name="logic" /></span>
        <div><h2>Conditions</h2><p>Set up conditional logic for your form</p></div>
        <button className="accent right" onClick={() => setView({ mode: 'new' })}><Icon name="plus" />Add a new condition</button>
      </div>
      <div className="stack">
        {rules.map((r, i) => {
          const t = typeOf(r);
          const { ifs, dos } = describe(def, r);
          return (
            <article key={r.id} className={`cond-card ${r.disabled ? 'off' : ''}`}>
              <span className="settings-icon small"><Icon name={TYPE_ICON[t.key]} size={16} /></span>
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="hint" style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t.title}{r.disabled && ' · disabled'}</div>
                <div><b>IF</b> {ifs || '…'}</div>
                <div><b>DO</b> {dos || '…'}</div>
              </div>
              <div className="row">
                <button className="small" onClick={() => setView({ mode: 'edit', rule: r })}>Edit</button>
                <button className="small" onClick={() => setRules((rs) => rs.map((x, j) => (j === i ? { ...x, disabled: !x.disabled } : x)))}>{r.disabled ? 'Enable' : 'Disable'}</button>
                <button className="icon-btn small" aria-label="Duplicate condition" title="Duplicate" onClick={() => setRules((rs) => [...rs.slice(0, i + 1), { ...structuredClone(r), id: rid() }, ...rs.slice(i + 1)])}><Icon name="copy" size={14} /></button>
                <button className="icon-btn small danger" aria-label="Delete condition" title="Delete" onClick={() => confirm('Delete this condition?') && setRules((rs) => rs.filter((_, j) => j !== i))}><Icon name="trash" size={14} /></button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
