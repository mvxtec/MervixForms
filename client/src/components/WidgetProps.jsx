// Builder settings for widgets and the newer basic elements (donation, subscription, fill in the blank…).
import { isDisplay } from '@shared/fields.js';
import { WIDGET_BY_KEY, widgetSettings, CALC_INPUTS } from '@shared/widgets.js';
import Icon from './Icon.jsx';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'JPY'];
const toLines = (x) => (Array.isArray(x) ? x.join('\n') : x || '');
const fromLines = (t) => t.split('\n').map((s) => s.trim()).filter(Boolean);

function FieldPicker({ def, f, value, onChange, label }) {
  const others = def.fields.filter((x) => x.id !== f.id && !isDisplay(x));
  return (
    <>
      <label className="lbl">{label}</label>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        <option value="">Choose a field…</option>
        {others.map((x) => <option key={x.id} value={x.id}>{x.label} ({x.id})</option>)}
      </select>
    </>
  );
}

function ColumnsEditor({ cols = [], onChange }) {
  const set = (i, patch) => onChange(cols.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  return (
    <div className="stack">
      {cols.map((c, i) => (
        <div key={i} className="panel" style={{ padding: 10 }}>
          <div className="opt-row">
            <input aria-label={`Column ${i + 1} label`} value={c.label} onChange={(e) => set(i, { label: e.target.value })} />
            <select aria-label={`Column ${i + 1} type`} style={{ width: 120 }} value={c.type} onChange={(e) => set(i, { type: e.target.value })}>
              {['text', 'number', 'dropdown', 'date', 'time'].map((t) => <option key={t}>{t}</option>)}
            </select>
            <button className="small danger" aria-label={`Remove column ${i + 1}`} onClick={() => onChange(cols.filter((_, j) => j !== i))}><Icon name="close" size={14} /></button>
          </div>
          {c.type === 'dropdown' && <input aria-label="Dropdown options" placeholder="Options, comma separated" value={(c.options || []).join(', ')} onChange={(e) => set(i, { options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })} />}
        </div>
      ))}
      <button className="small" onClick={() => onChange([...cols, { label: `Column ${cols.length + 1}`, type: 'text' }])}>+ Add column</button>
    </div>
  );
}

function RosterEditor({ roster = [], onChange }) {
  const set = (i, patch) => onChange(roster.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <div className="stack">
      {roster.map((r, i) => (
        <div key={i} className="panel" style={{ padding: 10 }}>
          <div className="grid2">
            <input aria-label="Employee ID" placeholder="ID (E001)" value={r.id} onChange={(e) => set(i, { id: e.target.value })} />
            <input aria-label="PIN" placeholder="PIN" value={r.pin || ''} onChange={(e) => set(i, { pin: e.target.value })} />
          </div>
          <div className="opt-row" style={{ marginTop: 6 }}>
            <input aria-label="Employee name" placeholder="Name" value={r.name || ''} onChange={(e) => set(i, { name: e.target.value })} />
            <button className="small danger" aria-label={`Remove ${r.id}`} onClick={() => onChange(roster.filter((_, j) => j !== i))}><Icon name="close" size={14} /></button>
          </div>
        </div>
      ))}
      <button className="small accent" onClick={() => onChange([...roster, { id: `E${String(roster.length + 1).padStart(3, '0')}`, pin: '', name: '' }])}>+ Add new employee</button>
      <p className="hint" style={{ margin: 0 }}>The roster stays on the server; respondents never see it.</p>
    </div>
  );
}

export function WidgetProps({ f, set, def }) {
  const w = WIDGET_BY_KEY[f.widget];
  const settings = widgetSettings(w);
  return (
    <div>
      {w?.kind === 'calc' && (CALC_INPUTS[f.calc] || []).map(([k, label]) => <FieldPicker key={k} def={def} f={f} label={label} value={f[k]} onChange={(v) => set({ [k]: v })} />)}
      {settings.map(([k, label, type, options]) => {
        if (type === 'field') return <FieldPicker key={k} def={def} f={f} label={label} value={f[k]} onChange={(v) => set({ [k]: v })} />;
        if (type === 'columns') return <div key={k}><label className="lbl">{label}</label><ColumnsEditor cols={f.columns} onChange={(columns) => set({ columns })} /></div>;
        if (type === 'roster') return <div key={k}><label className="lbl">{label}</label><RosterEditor roster={f.roster} onChange={(roster) => set({ roster })} /></div>;
        if (type === 'bool') return <label key={k} className="row" style={{ marginTop: 10 }}><input type="checkbox" checked={!!f[k]} onChange={(e) => set({ [k]: e.target.checked })} /> {label}</label>;
        return (
          <div key={k}>
            <label className="lbl" htmlFor={`wp-${k}`}>{label}</label>
            {type === 'textarea' || type === 'lines'
              ? <textarea id={`wp-${k}`} rows={type === 'lines' ? 4 : 5} value={type === 'lines' ? toLines(f[k]) : f[k] || ''} onChange={(e) => set({ [k]: type === 'lines' ? fromLines(e.target.value) : e.target.value })} />
              : type === 'select'
                ? <select id={`wp-${k}`} value={f[k] || options[0]} onChange={(e) => set({ [k]: e.target.value })}>{options.map((o) => <option key={o}>{o}</option>)}</select>
                : <input id={`wp-${k}`} type={{ number: 'number', color: 'color', datetime: 'datetime-local' }[type] || 'text'} value={f[k] ?? ''} onChange={(e) => set({ [k]: type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value })} />}
          </div>
        );
      })}
      {!settings.length && w?.kind !== 'calc' && <p className="hint">This widget has no extra settings.</p>}
    </div>
  );
}

// Settings for basic elements added alongside the widgets.
export function ExtraProps({ f, set }) {
  const num = (k, label) => (<div><label className="lbl">{label}</label><input type="number" value={f[k] ?? ''} onChange={(e) => set({ [k]: e.target.value === '' ? '' : Number(e.target.value) })} /></div>);
  const currency = (<><label className="lbl">Currency</label><select value={f.currency} onChange={(e) => set({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></>);
  switch (f.type) {
    case 'fillblank':
      return <><label className="lbl">Text (write {'{blank}'} for each input)</label><textarea rows={4} value={f.text} onChange={(e) => set({ text: e.target.value })} /></>;
    case 'spinner':
      return <div className="grid2">{num('min', 'Min')}{num('max', 'Max')}{num('step', 'Step')}</div>;
    case 'section':
      return (
        <>
          <label className="lbl">Description</label><input value={f.subheading || ''} onChange={(e) => set({ subheading: e.target.value })} />
          <label className="row" style={{ marginTop: 10 }}><input type="checkbox" checked={!!f.collapsed} onChange={(e) => set({ collapsed: e.target.checked })} /> Start collapsed</label>
          <p className="hint">Fields below this element, up to the next section or page break, fold into it.</p>
        </>
      );
    case 'donation':
      return (
        <>
          {currency}
          <label className="lbl">Suggested amounts (one per line)</label>
          <textarea rows={3} value={toLines(f.amounts)} onChange={(e) => set({ amounts: fromLines(e.target.value).map(Number).filter((x) => x > 0) })} />
          <label className="row" style={{ marginTop: 10 }}><input type="checkbox" checked={!!f.custom} onChange={(e) => set({ custom: e.target.checked })} /> Let donors enter their own amount</label>
          {num('minAmount', 'Minimum amount')}
        </>
      );
    case 'subscription':
      return (
        <>
          {currency}
          <label className="lbl">Plans</label>
          {(f.plans || []).map((p, i) => (
            <div key={p.id} className="panel" style={{ padding: 10, marginBottom: 6 }}>
              <div className="opt-row">
                <input aria-label="Plan name" value={p.name} onChange={(e) => set({ plans: f.plans.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <button className="small danger" aria-label={`Remove ${p.name}`} onClick={() => set({ plans: f.plans.filter((_, j) => j !== i) })}><Icon name="close" size={14} /></button>
              </div>
              <div className="grid2" style={{ marginTop: 6 }}>
                <input aria-label="Price" type="number" value={p.price} onChange={(e) => set({ plans: f.plans.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })} />
                <select aria-label="Billing interval" value={p.interval} onChange={(e) => set({ plans: f.plans.map((x, j) => (j === i ? { ...x, interval: e.target.value } : x)) })}>
                  {['day', 'week', 'month', 'year'].map((x) => <option key={x}>{x}</option>)}
                </select>
              </div>
            </div>
          ))}
          <button className="small" onClick={() => set({ plans: [...(f.plans || []), { id: `s${Date.now().toString(36)}`, name: 'New plan', price: 0, interval: 'month' }] })}>+ Add plan</button>
        </>
      );
    default: return null;
  }
}
