import { useRef, useState } from 'react';
import Icon from '../components/Icon.jsx';
import { FIELD_TYPES, newField, newWidget, typeLabel, isDisplay } from '@shared/fields.js';
import { widgetKind } from '@shared/widgets.js';
import Palette from '../components/Palette.jsx';
import { WidgetProps, ExtraProps } from '../components/WidgetProps.jsx';
import { FieldInput, DisplayBlock } from '../components/Fields.jsx';
import { themeStyle } from '../components/FormRenderer.jsx';

const FONTS = ['System', 'Inter', 'Arial', 'Georgia', 'Verdana', 'Trebuchet MS', 'Courier New'];

function ListEditor({ label, items, onChange }) {
  return (
    <div>
      <label className="lbl">{label}</label>
      {items.map((o, i) => (
        <div className="opt-row" key={i}>
          <input value={o} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <button className="small" disabled={i === 0} onClick={() => { const n = [...items]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; onChange(n); }}>↑</button>
          <button className="small danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
        </div>
      ))}
      <div className="row">
        <button className="small" onClick={() => onChange([...items, `Option ${items.length + 1}`])}>+ Add</button>
        <button className="small" onClick={() => { const t = prompt('Paste one option per line:', items.join('\n')); if (t !== null) onChange(t.split('\n').map((x) => x.trim()).filter(Boolean)); }}>Bulk edit</button>
      </div>
    </div>
  );
}

function FieldProps({ f, set, def }) {
  const inp = (k, type = 'text', extra = {}) => (
    <input type={type} value={f[k] ?? ''} onChange={(e) => set({ [k]: type === 'number' && e.target.value !== '' ? Number(e.target.value) : e.target.value })} {...extra} />
  );
  const chk = (k, label) => (
    <label className="row" style={{ marginTop: 8 }}><input type="checkbox" checked={!!f[k]} onChange={(e) => set({ [k]: e.target.checked })} /> {label}</label>
  );
  const display = isDisplay(f);
  return (
    <div>
      <div className="props-head">
        <div><div className="hint">{typeLabel(f)}</div><div style={{ fontWeight: 600, fontSize: 15 }}>{f.label || 'Untitled'}</div></div>
        <code title="Field ID — use in formulas and email templates as {id}">id: {f.id}</code>
      </div>
      <label className="lbl">{f.type === 'heading' ? 'Heading text' : 'Label'}</label>
      {inp('label')}
      {!display && f.type !== 'hidden' && (
        <>
          {f.type !== 'calculation' && widgetKind(f) !== 'calc' && chk('required', 'Required')}
          {chk('hiddenByDefault', 'Hidden by default (show with conditions)')}
          <label className="lbl">Description / help text</label>
          {inp('description')}
        </>
      )}
      {f.type === 'widget' && <WidgetProps f={f} set={set} def={def} />}
      <ExtraProps f={f} set={set} />
      {f.type === 'heading' && (<><label className="lbl">Subheading</label>{inp('subheading')}</>)}
      {f.type === 'paragraph' && (<><label className="lbl">Text</label><textarea rows={6} value={f.text} onChange={(e) => set({ text: e.target.value })} /></>)}
      {f.type === 'image' && (<><label className="lbl">Image URL</label>{inp('src')}<label className="lbl">Alt text</label>{inp('alt')}<label className="lbl">Width (%)</label>{inp('width', 'number')}</>)}
      {['text', 'textarea', 'email', 'phone', 'url', 'number', 'dropdown'].includes(f.type) && (<><label className="lbl">Placeholder</label>{inp('placeholder')}</>)}
      {['text', 'textarea'].includes(f.type) && (<><label className="lbl">Max characters</label>{inp('maxLength', 'number')}</>)}
      {f.type === 'textarea' && (<><label className="lbl">Rows</label>{inp('rows', 'number')}</>)}
      {['number', 'slider'].includes(f.type) && (
        <div className="grid2">
          <div><label className="lbl">Min</label>{inp('min', 'number')}</div>
          <div><label className="lbl">Max</label>{inp('max', 'number')}</div>
          <div><label className="lbl">Step</label>{inp('step', 'number')}</div>
        </div>
      )}
      {f.type === 'fullname' && (<>{chk('prefix', 'Show prefix')}{chk('middle', 'Show middle name')}</>)}
      {f.type === 'date' && (
        <>
          {chk('disablePast', 'Disable past dates')}
          <div className="grid2">
            <div><label className="lbl">Earliest</label>{inp('minDate', 'date')}</div>
            <div><label className="lbl">Latest</label>{inp('maxDate', 'date')}</div>
          </div>
        </>
      )}
      {['dropdown', 'radio', 'checkbox'].includes(f.type) && <ListEditor label="Options" items={f.options || []} onChange={(options) => set({ options })} />}
      {['radio', 'checkbox'].includes(f.type) && (
        <>
          {chk('other', 'Add "Other" option')}
          <label className="lbl">Columns</label>{inp('columns', 'number', { min: 1, max: 4 })}
        </>
      )}
      {f.type === 'checkbox' && (
        <div className="grid2">
          <div><label className="lbl">Min selections</label>{inp('minSelect', 'number')}</div>
          <div><label className="lbl">Max selections</label>{inp('maxSelect', 'number')}</div>
        </div>
      )}
      {f.type === 'file' && (
        <>
          {chk('multiple', 'Allow multiple files')}
          <label className="lbl">Allowed extensions</label>{inp('accept', 'text', { placeholder: '.pdf,.jpg,image/*' })}
          <label className="lbl">Max file size (MB)</label>{inp('maxSizeMb', 'number')}
        </>
      )}
      {f.type === 'rating' && (<><label className="lbl">Number of stars</label>{inp('stars', 'number', { min: 2, max: 10 })}</>)}
      {f.type === 'scale' && (
        <div className="grid2">
          <div><label className="lbl">From</label>{inp('from', 'number')}</div>
          <div><label className="lbl">To</label>{inp('to', 'number')}</div>
          <div><label className="lbl">Low label</label>{inp('lowLabel')}</div>
          <div><label className="lbl">High label</label>{inp('highLabel')}</div>
        </div>
      )}
      {f.type === 'yesno' && (<div className="grid2"><div><label className="lbl">Yes label</label>{inp('yesLabel')}</div><div><label className="lbl">No label</label>{inp('noLabel')}</div></div>)}
      {f.type === 'matrix' && (<><ListEditor label="Rows" items={f.rows || []} onChange={(rows) => set({ rows })} /><ListEditor label="Columns" items={f.columns || []} onChange={(columns) => set({ columns })} /></>)}
      {f.type === 'appointment' && (
        <>
          <ListEditor label="Time slots" items={f.slots || []} onChange={(slots) => set({ slots })} />
          {chk('disablePast', 'Disable past dates')}
          {chk('oneBookingPerSlot', 'Prevent double booking')}
        </>
      )}
      {f.type === 'terms' && (<><label className="lbl">Agreement text</label><textarea rows={3} value={f.text} onChange={(e) => set({ text: e.target.value })} /></>)}
      {f.type === 'hidden' && (
        <>
          <label className="lbl">Default value</label>{inp('defaultValue')}
          <label className="lbl">Prefill from URL parameter</label>{inp('fromUrl', 'text', { placeholder: 'e.g. utm_source' })}
        </>
      )}
      {f.type === 'calculation' && (
        <>
          <label className="lbl">Formula</label>
          <textarea rows={3} value={f.formula} onChange={(e) => set({ formula: e.target.value })} placeholder="{qty} * {price}" />
          <div className="hint">Use field IDs in braces. Operators + - * / % ^ and min, max, round(x, d), floor, ceil, abs, sqrt, sum, avg, if(cond, a, b).</div>
          <div className="row wrap" style={{ marginTop: 6 }}>
            {def.fields.filter((x) => !isDisplay(x) && x.id !== f.id).map((x) => (
              <button key={x.id} className="small" onClick={() => set({ formula: `${f.formula || ''}{${x.id}}` })}>{x.label}</button>
            ))}
          </div>
          <div className="grid2">
            <div><label className="lbl">Prefix</label>{inp('prefix')}</div>
            <div><label className="lbl">Suffix</label>{inp('suffix')}</div>
            <div><label className="lbl">Decimals</label>{inp('decimals', 'number')}</div>
          </div>
        </>
      )}
      {f.type === 'products' && (
        <>
          <label className="lbl">Currency</label>
          <select value={f.currency} onChange={(e) => set({ currency: e.target.value })}>
            {['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'].map((c) => <option key={c}>{c}</option>)}
          </select>
          {chk('quantity', 'Show quantity')}
          {chk('singleChoice', 'Customer can select only one product')}
          <label className="lbl">Products</label>
          {(f.products || []).map((p, i) => (
            <div key={p.id} className="panel" style={{ padding: 8, marginBottom: 6 }}>
              <div className="opt-row">
                <input value={p.name} placeholder="Name" onChange={(e) => set({ products: f.products.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                <input type="number" style={{ width: 90 }} value={p.price} onChange={(e) => set({ products: f.products.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)) })} />
                <button className="small danger" onClick={() => set({ products: f.products.filter((_, j) => j !== i) })}>✕</button>
              </div>
              <input value={p.description || ''} placeholder="Description" onChange={(e) => set({ products: f.products.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)) })} />
            </div>
          ))}
          <button className="small" onClick={() => set({ products: [...(f.products || []), { id: `p${Date.now().toString(36)}`, name: 'New product', price: 0, description: '' }] })}>+ Add product</button>
        </>
      )}
    </div>
  );
}

function Designer({ def, update }) {
  const t = def.theme || {};
  const setT = (patch) => update((d) => ({ ...d, theme: { ...d.theme, ...patch } }));
  const color = (k, label) => (
    <div><label className="lbl">{label}</label><input type="color" value={t[k] || '#ffffff'} onChange={(e) => setT({ [k]: e.target.value })} /></div>
  );
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 15 }}>Form design</div>
      <p className="hint" style={{ marginTop: 4 }}>Select a field on the canvas to edit it.</p>
      <div className="grid2">
        {color('primary', 'Primary / buttons')}
        {color('background', 'Page background')}
        {color('text', 'Text')}
        {color('fieldBg', 'Field background')}
      </div>
      <label className="lbl">Font</label>
      <select value={t.font || 'System'} onChange={(e) => setT({ font: e.target.value })}>{FONTS.map((x) => <option key={x}>{x}</option>)}</select>
      <label className="lbl">Form width (px)</label>
      <input type="number" value={t.width || 720} onChange={(e) => setT({ width: Number(e.target.value) })} />
      <label className="lbl">Logo URL</label>
      <input value={t.logo || ''} onChange={(e) => setT({ logo: e.target.value })} placeholder="https://…/logo.png" />
      <label className="lbl">Submit button text</label>
      <input value={def.settings?.submitLabel || ''} placeholder="Submit" onChange={(e) => update((d) => ({ ...d, settings: { ...d.settings, submitLabel: e.target.value } }))} />
      <label className="lbl">Custom CSS</label>
      <textarea rows={5} value={t.css || ''} onChange={(e) => setT({ css: e.target.value })} placeholder=".wf-label { text-transform: uppercase; }" style={{ fontFamily: 'monospace' }} />
    </div>
  );
}

// Short description of the rule that shows/hides/requires a field, for the canvas tag.
function logicTag(def, id) {
  for (const r of def.logic || []) {
    const a = (r.actions || []).find((x) => x.target === id);
    if (!a) continue;
    const c = (r.conditions || [])[0];
    const src = c && def.fields.find((f) => f.id === c.field);
    const verb = { show: 'Shown', hide: 'Hidden', require: 'Required', unrequire: 'Optional', setValue: 'Calculated' }[a.type] || 'Logic';
    return src ? `${verb} if ${src.label} ${c.op === 'equals' ? '=' : c.op} ${c.value ?? ''}`.trim() : verb;
  }
  return '';
}

export default function Builder({ def, update, plan }) {
  const [selected, setSelected] = useState(null);
  const [dropAt, setDropAt] = useState(null);
  const searchRef = useRef(null);
  const fields = def.fields;
  const sel = fields.find((f) => f.id === selected);
  const limit = plan.fieldsPerForm;

  const [propTab, setPropTab] = useState('general');
  const addField = (f, index = sel ? fields.indexOf(sel) + 1 : fields.length) => {
    if (!f) return;
    if (limit != null && fields.length >= limit) return alert(`Your ${plan.name} plan allows ${limit} fields per form.`);
    update((d) => { const n = [...d.fields]; n.splice(index, 0, f); return { ...d, fields: n }; });
    setSelected(f.id);
    setPropTab('general');
  };
  const insert = (type, index) => addField(newField(type), index);
  const insertWidget = (key, index) => addField(newWidget(key), index);
  const move = (id, index) => update((d) => {
    const from = d.fields.findIndex((f) => f.id === id);
    const n = [...d.fields];
    const [f] = n.splice(from, 1);
    n.splice(index > from ? index - 1 : index, 0, f);
    return { ...d, fields: n };
  });
  const setField = (id, patch) => update((d) => ({ ...d, fields: d.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  const remove = (id) => {
    update((d) => ({
      ...d,
      fields: d.fields.filter((f) => f.id !== id),
      logic: (d.logic || []).map((r) => ({ ...r, conditions: r.conditions.filter((c) => c.field !== id), actions: r.actions.filter((a) => a.target !== id) })),
    }));
    if (selected === id) setSelected(null);
  };
  const duplicate = (f) => {
    const copy = { ...structuredClone(f), id: newField(f.type).id, label: `${f.label} (copy)` };
    update((d) => { const n = [...d.fields]; n.splice(n.indexOf(n.find((x) => x.id === f.id)) + 1, 0, copy); return { ...d, fields: n }; });
    setSelected(copy.id);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    const at = dropAt ?? fields.length;
    setDropAt(null);
    if (data.startsWith('new:')) insert(data.slice(4), at);
    if (data.startsWith('widget:')) insertWidget(data.slice(7), at);
    if (data.startsWith('move:')) move(data.slice(5), at);
  };
  const overField = (e, i) => {
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setDropAt(e.clientY < r.top + r.height / 2 ? i : i + 1);
  };

  return (
    <div className="builder">
      <Palette ref={searchRef} def={def} update={update} onAddType={(t) => insert(t)} onAddWidget={(k) => insertWidget(k)} />

      <div className="canvas" onDragOver={(e) => { e.preventDefault(); if (e.target === e.currentTarget) setDropAt(fields.length); }} onDrop={onDrop} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDropAt(null); }} onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}>
        <div className="canvas-bar" style={themeStyle(def.theme)}>
          <div className="seg" role="radiogroup" aria-label="Layout" style={{ background: 'var(--border)' }}>
            {[['classic', 'Classic'], ['card', 'Card']].map(([k, l]) => (
              <button key={k} role="radio" aria-checked={def.layout === k} className={def.layout === k ? 'on' : ''} onClick={() => update((d) => ({ ...d, layout: k }))}>{l}</button>
            ))}
          </div>
          <span className="hint">
            {fields.length} field{fields.length === 1 ? '' : 's'}{limit != null ? ` of ${limit}` : ''} · {(def.logic || []).length} rule{(def.logic || []).length === 1 ? '' : 's'}
            {def.layout === 'card' && ' · each item becomes its own screen'}
          </span>
        </div>
        <div className="canvas-sheet wf" style={{ ...themeStyle(def.theme), padding: 0, minHeight: 300, background: '#fff' }}>
          <div className="cover" style={{ background: def.theme?.primary || 'var(--accent)' }} />
          <div className="sheet-body">
            {def.theme?.logo && <img className="wf-logo" src={def.theme.logo} alt="" />}
            {fields.length === 0 && <div className="muted" style={{ padding: 40, textAlign: 'center' }}>Drag a field here to start.</div>}
            {fields.map((f, i) => {
              const tag = logicTag(def, f.id);
              return (
                <div key={f.id}>
                  {dropAt === i && <div className="drop-line" />}
                  <div
                    className={`canvas-field ${selected === f.id ? 'selected' : ''} ${tag || f.hiddenByDefault ? 'logic' : ''}`}
                    draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', `move:${f.id}`)}
                    onDragOver={(e) => overField(e, i)}
                    onClick={() => setSelected(f.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && e.target === e.currentTarget) setSelected(f.id); }}
                    tabIndex={0} role="button" aria-pressed={selected === f.id} aria-label={`${typeLabel(f)}: ${f.label}`}
                  >
                    <div className="tools">
                      <button title="Move up" aria-label="Move up" disabled={i === 0} onClick={(e) => { e.stopPropagation(); move(f.id, i - 1); }}><Icon name="up" size={14} /></button>
                      <button title="Move down" aria-label="Move down" disabled={i === fields.length - 1} onClick={(e) => { e.stopPropagation(); move(f.id, i + 2); }}><Icon name="down" size={14} /></button>
                      <button title="Duplicate" aria-label="Duplicate field" onClick={(e) => { e.stopPropagation(); duplicate(f); }}><Icon name="copy" size={14} /></button>
                      <button className="danger" title="Delete" aria-label="Delete field" onClick={(e) => { e.stopPropagation(); remove(f.id); }}><Icon name="trash" size={14} /></button>
                    </div>
                    <div className="wf-field" style={{ marginBottom: 0, pointerEvents: 'none' }}>
                      {isDisplay(f) ? <DisplayBlock f={f} /> : (
                        <>
                          {f.type !== 'terms' && (
                            <div className="wf-label">
                              {f.label}{f.required && <span className="wf-req">*</span>}
                              {f.type === 'hidden' && <span className="pill" style={{ marginLeft: 8 }}>hidden field</span>}
                              {tag ? <span className="logic-tag">{tag}</span> : f.hiddenByDefault && <span className="logic-tag">Hidden until shown</span>}
                            </div>
                          )}
                          {f.type === 'hidden' ? <div className="hint">Value: {f.defaultValue || '(empty)'}{f.fromUrl ? ` · from ?${f.fromUrl}=` : ''}</div>
                            : f.type === 'signature' ? <div className="hint" style={{ border: '1.5px dashed var(--border-strong)', borderRadius: 10, padding: 30, textAlign: 'center' }}>Signature pad</div>
                            : <FieldInput f={f} value={undefined} onChange={() => {}} mode="builder" />}
                          {f.description && <div className="wf-desc">{f.description}</div>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {dropAt === fields.length && <div className="drop-line" />}
            <button className="add-field" onClick={() => searchRef.current?.focus()}><Icon name="plus" />Add field</button>
            <div style={{ marginTop: 20 }}><button className="wf-btn" disabled>{def.settings?.submitLabel || 'Submit'}</button></div>
          </div>
        </div>
      </div>

      <aside className="props" aria-label={sel ? 'Field properties' : 'Form design'}>
        {sel ? (
          <>
            <button className="small ghost" onClick={() => setSelected(null)} style={{ marginBottom: 12, paddingLeft: 0 }}><Icon name="back" size={14} />Form design</button>
            <div className="seg" role="tablist" aria-label="Field settings" style={{ marginBottom: 12, display: 'flex' }}>
              {[['general', 'General'], ['css', 'Custom CSS']].map(([k, l]) => <button key={k} role="tab" aria-selected={propTab === k} className={propTab === k ? 'on' : ''} style={{ flex: 1 }} onClick={() => setPropTab(k)}>{l}</button>)}
            </div>
            {propTab === 'general' ? <FieldProps f={sel} def={def} set={(patch) => setField(sel.id, patch)} /> : (
              <div>
                <label className="lbl" htmlFor="field-css">CSS for this field</label>
                <textarea id="field-css" rows={10} value={sel.css || ''} onChange={(e) => setField(sel.id, { css: e.target.value })} placeholder={`#field-${sel.id} .wf-label {
  color: #0f766e;
}`} style={{ fontFamily: "'Geist Mono', monospace", fontSize: 13 }} />
                <p className="hint">Target this field with <code>#field-{sel.id}</code>. Applies to the live form and preview.</p>
              </div>
            )}
            {logicTag(def, sel.id) && (
              <div className="panel" style={{ marginTop: 16, background: 'var(--accent-soft)', borderColor: 'var(--accent-line)', padding: 12 }}>
                <div className="row" style={{ fontWeight: 500 }}><Icon name="logic" size={14} style={{ color: 'var(--accent)' }} />Logic</div>
                <div style={{ fontSize: 13, margin: '6px 0' }}>{logicTag(def, sel.id)}</div>
                <a href={`${window.location.hash.replace(/\/build.*$/, '')}/settings/conditions`}>Edit rules</a>
              </div>
            )}
          </>
        ) : <Designer def={def} update={update} />}
      </aside>
    </div>
  );
}
