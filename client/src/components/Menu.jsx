// Small action menu: a "more" button that opens a list of actions. Closes on outside click, Escape or choice.
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon.jsx';

export default function Menu({ label, items, align = 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const onKey = (e) => {
    if (e.key === 'Escape') setOpen(false);
    if (!['ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const els = [...ref.current.querySelectorAll('[role=menuitem]')];
    const i = els.indexOf(document.activeElement);
    els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
  };
  return (
    <div className="menu" ref={ref} onKeyDown={onKey}>
      <button className="icon-btn small ghost" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Icon name="more" size={18} weight="bold" />
      </button>
      {open && (
        <div className={`menu-pop ${align}`} role="menu" aria-label={label}>
          {items.filter(Boolean).map((it, i) => (it === '-' ? <hr key={i} /> : (
            <button key={it.label} role="menuitem" className={it.danger ? 'danger' : ''} onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon && <Icon name={it.icon} size={16} />}{it.label}
            </button>
          )))}
        </div>
      )}
    </div>
  );
}
