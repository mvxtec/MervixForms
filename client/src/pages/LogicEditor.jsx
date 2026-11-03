import { CONDITION_OPS, ACTION_TYPES } from '@shared/logic.js';
import { isDisplay } from '@shared/fields.js';

const NO_VALUE = ['isFilled', 'isEmpty'];
const rid = () => `r${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

export default function LogicEditor({ def, update }) {
  const rules = def.logic || [];
  const inputs = def.fields.filter((f) => !isDisplay(f));
  const targets = def.fields.filter((f) => f.type !== 'pagebreak');
  const pages = def.fields.filter((f) => f.type === 'pagebreak');
  const setRules = (fn) => update((d) => ({ ...d, logic: fn(d.logic || []) }));
  const setRule = (i, patch) => setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const add = () => setRules((rs) => [...rs, { id: rid(), match: 'all', conditions: [{ field: inputs[0]?.id || '', op: 'equals', value: '' }], actions: [{ type: 'show', target: '' }] }]);

  const valueInput = (c, onChange) => {
    const f = def.fields.find((x) => x.id === c.field);
    const opts = f?.options || (f?.type === 'yesno' ? ['Yes', 'No'] : f?.type === 'rating' ? Array.from({ length: f.stars }, (_, i) => String(i + 1)) : null);
    if (opts && ['equals', 'notEquals'].includes(c.op)) {
      return <select value={c.value} onChange={(e) => onChange(e.target.value)}><option value="">— choose —</option>{opts.map((o) => <option key={o}>{o}</option>)}</select>;
    }
    return <input value={c.value} onChange={(e) => onChange(e.target.value)} placeholder="value" />;
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0 }}>Conditional logic</h2>
          <div className="hint">Show or hide fields, make them required, calculate values, skip pages or change the thank-you message based on answers.</div>
        </div>
        <button className="primary right" onClick={add} disabled={!inputs.length}>+ Add condition</button>
      </div>
      {!rules.length && <div className="panel muted">No conditions yet.</div>}
      {rules.map((r, i) => (
        <div className="logic-rule" key={r.id}>
          <div className="row">
            <b>IF</b>
            <select style={{ width: 'auto' }} value={r.match} onChange={(e) => setRule(i, { match: e.target.value })}>
              <option value="all">all of these are true</option>
              <option value="any">any of these is true</option>
            </select>
            <button className="small danger right" onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))}>Delete rule</button>
          </div>
          {r.conditions.map((c, ci) => {
            const setC = (patch) => setRule(i, { conditions: r.conditions.map((x, k) => (k === ci ? { ...x, ...patch } : x)) });
            return (
              <div className="row" key={ci}>
                <select value={c.field} onChange={(e) => setC({ field: e.target.value, value: '' })}>
                  <option value="">— field —</option>
                  {inputs.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
                <select value={c.op} onChange={(e) => setC({ op: e.target.value })}>
                  {Object.entries(CONDITION_OPS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {!NO_VALUE.includes(c.op) && valueInput(c, (value) => setC({ value }))}
                <button className="small" onClick={() => setRule(i, { conditions: r.conditions.filter((_, k) => k !== ci) })} disabled={r.conditions.length === 1}>✕</button>
              </div>
            );
          })}
          <button className="small" style={{ marginTop: 6 }} onClick={() => setRule(i, { conditions: [...r.conditions, { field: '', op: 'equals', value: '' }] })}>+ condition</button>
          <div className="row" style={{ marginTop: 12 }}><b>THEN</b></div>
          {r.actions.map((a, ai) => {
            const setA = (patch) => setRule(i, { actions: r.actions.map((x, k) => (k === ai ? { ...x, ...patch } : x)) });
            return (
              <div className="row" key={ai}>
                <select value={a.type} onChange={(e) => setA({ type: e.target.value, target: '', value: '' })}>
                  {Object.entries(ACTION_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                {['show', 'hide', 'require', 'unrequire', 'setValue'].includes(a.type) && (
                  <select value={a.target} onChange={(e) => setA({ target: e.target.value })}>
                    <option value="">— field —</option>
                    {(a.type === 'setValue' ? inputs : a.type === 'show' || a.type === 'hide' ? targets : inputs).map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                )}
                {a.type === 'skipTo' && (
                  <select value={a.target} onChange={(e) => setA({ target: e.target.value })}>
                    <option value="">— page —</option>
                    {def.layout === 'card'
                      ? targets.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)
                      : pages.map((p, k) => <option key={p.id} value={p.id}>Page {k + 2}</option>)}
                    <option value="end">End of form (submit)</option>
                  </select>
                )}
                {a.type === 'setValue' && <input value={a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="value or formula e.g. {qty} * 2" />}
                {a.type === 'thankyou' && <textarea rows={2} value={a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="Custom thank-you message" />}
                {a.type === 'redirect' && <input value={a.value || ''} onChange={(e) => setA({ value: e.target.value })} placeholder="https://…" />}
                <button className="small" onClick={() => setRule(i, { actions: r.actions.filter((_, k) => k !== ai) })} disabled={r.actions.length === 1}>✕</button>
              </div>
            );
          })}
          <button className="small" style={{ marginTop: 6 }} onClick={() => setRule(i, { actions: [...r.actions, { type: 'show', target: '' }] })}>+ action</button>
        </div>
      ))}
      {def.layout !== 'card' && !pages.length && <p className="hint">Tip: add Page Break fields in the builder to use "Skip to page".</p>}
    </div>
  );
}
