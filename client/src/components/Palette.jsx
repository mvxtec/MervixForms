// Builder palette: Basic elements, Payments (elements + gateways) and the Widgets catalog.
import { forwardRef, useState } from 'react';
import { FIELD_GROUPS, FIELD_TYPES, PAYMENT_TYPES } from '@shared/fields.js';
import { WIDGETS, WIDGET_CATEGORIES } from '@shared/widgets.js';
import { GATEWAYS } from '@shared/payments.js';
import Icon, { widgetIcon } from './Icon.jsx';


function Item({ icon, label, onAdd, drag, badge, disabled, title }) {
  return (
    <button className={`item ${disabled ? 'soon' : ''}`} draggable={!disabled} disabled={disabled} title={title || `Add ${label}`}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', drag)} onClick={onAdd}>
      <span className="ico" aria-hidden="true"><Icon name={icon} size={16} /></span>
      <span className="grow">{label}</span>
      {badge && <span className="tag">{badge}</span>}
    </button>
  );
}

const Palette = forwardRef(function Palette({ def, update, onAddType, onAddWidget }, searchRef) {
  const [tab, setTab] = useState('basic');
  const [find, setFind] = useState('');
  const q = find.trim().toLowerCase();
  const match = (label) => !q || label.toLowerCase().includes(q);
  const provider = def.settings?.payment?.provider || 'test';
  const setProvider = (key) => update((d) => ({ ...d, settings: { ...d.settings, payment: { ...d.settings?.payment, provider: key } } }));
  const ready = WIDGETS.filter((w) => !w.soon && match(w.label));
  const soon = WIDGETS.filter((w) => w.soon && match(w.label));

  return (
    <aside className="palette" aria-label="Add form elements">
      <div className="seg palette-tabs" role="tablist" aria-label="Element types">
        {[['basic', 'Basic'], ['payments', 'Payments'], ['widgets', `Widgets`]].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <label className="search" style={{ minHeight: 38 }}>
        <Icon name="search" size={15} />
        <span className="sr-only">Search {tab}</span>
        <input ref={searchRef} type="search" placeholder={tab === 'widgets' ? `Search ${WIDGETS.length} widgets` : 'Search elements'} value={find} onChange={(e) => setFind(e.target.value)} />
      </label>

      {tab === 'basic' && FIELD_GROUPS.map((g) => {
        const types = g.types.filter((t) => match(FIELD_TYPES[t].label));
        if (!types.length) return null;
        return (
          <div key={g.name}>
            <h4>{g.name}</h4>
            <div className="palette-grid">
              {types.map((t) => <Item key={t} icon={t} label={FIELD_TYPES[t].label} drag={`new:${t}`} onAdd={() => onAddType(t)} />)}
            </div>
          </div>
        );
      })}

      {tab === 'payments' && (
        <>
          <div>
            <h4>Payment elements</h4>
            <div className="palette-grid">
              {PAYMENT_TYPES.filter((t) => match(FIELD_TYPES[t].label)).map((t) => <Item key={t} icon={t} label={FIELD_TYPES[t].label} drag={`new:${t}`} onAdd={() => onAddType(t)} />)}
            </div>
          </div>
          <div>
            <h4>Payment gateway</h4>
            <div className="gateways" role="radiogroup" aria-label="Payment gateway">
              {GATEWAYS.filter((g) => match(g.name)).map((g) => (
                <button key={g.key} role="radio" aria-checked={provider === g.key} disabled={!g.ready} className={`gateway ${provider === g.key ? 'on' : ''}`} onClick={() => setProvider(g.key)} title={g.ready ? g.note : 'Coming soon'}>
                  <span className="gw-logo" aria-hidden="true"><Icon name={g.key === 'test' ? 'code' : g.key === 'purchaseOrder' ? 'pdf' : g.key === 'stripe' || g.key === 'paypal' ? g.key : 'card'} size={16} /></span>
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontWeight: 500 }}>{g.name}</span>
                    <span className="hint" style={{ display: 'block' }}>{g.ready ? g.note : g.note || 'Coming soon'}</span>
                  </span>
                  {!g.ready && <span className="tag">Soon</span>}
                  {g.india && g.ready === undefined && <span className="tag">India</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'widgets' && (
        <>
          {WIDGET_CATEGORIES.map((cat) => {
            const list = ready.filter((w) => w.category === cat);
            if (!list.length) return null;
            return (
              <div key={cat}>
                <h4>{cat}</h4>
                <div className="palette-list">
                  {list.map((w) => <Item key={w.key} icon={widgetIcon(w)} label={w.label} badge={w.isNew ? 'New' : ''} drag={`widget:${w.key}`} onAdd={() => onAddWidget(w.key)} />)}
                </div>
              </div>
            );
          })}
          {soon.length > 0 && (
            <details className="soon-list">
              <summary>Coming soon ({soon.length})</summary>
              <p className="hint">These need a third-party service or account, or are still being built.</p>
              <div className="palette-list">
                {soon.map((w) => <Item key={w.key} icon={widgetIcon(w)} label={w.label} disabled title={w.reason} />)}
              </div>
            </details>
          )}
          {!ready.length && !soon.length && <p className="hint">No widgets match “{find}”.</p>}
        </>
      )}
      {tab !== 'payments' && <p className="hint" style={{ margin: 0 }}>Drag onto the form, or click to add after the selected field.</p>}
    </aside>
  );
});

export default Palette;
