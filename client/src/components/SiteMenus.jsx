// Header mega menus (Templates, Integrations, Products, Support) and the "My Workspace" switcher.
// Shared by the public site header and the signed-in app header.
import { useEffect, useRef, useState } from 'react';
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from '@shared/integrations.js';
import Icon from './Icon.jsx';

const TEMPLATE_LINKS = [
  ['Form templates', 'Surveys, registrations, orders and applications', '#/templates', '#ea580c'],
  ['Card form templates', 'Quizzes, feedback and sign-ups, one question at a time', '#/templates?type=card', '#0369a1'],
  ['App templates', 'Client portals, staff hubs and event directories', '#/templates?type=apps', '#7c3aed'],
  ['Sign templates', 'NDAs, leases, waivers and offer letters', '#/templates?type=sign', '#65a30d'],
  ['Workflow templates', 'Leave requests, purchase orders, content approvals', '#/templates?type=workflows', '#0f766e'],
  ['Store templates', 'Product catalogues, merch shops and takeaway menus', '#/templates?type=stores', '#0e7490'],
];

// Products: `to` is where signed-in people land; `soon` ones aren't built yet.
export const PRODUCTS = [
  ['Form Builder', 'Create powerful forms with a drag-and-drop builder', '#/', 'forms', '#ea580c'],
  ['Workflows', 'Automate tasks, approvals and follow-ups', '#/workflows', 'redo', '#0f766e'],
  ['E-sign', 'Create, share and e-sign documents', '#/sign-docs', 'sign', '#65a30d'],
  ['Apps', 'Build installable apps without coding', '#/apps', 'apps', '#7c3aed'],
  ['Store Builder', 'Create an online store and sell products', '#/apps', 'apps', '#0e7490'],
  ['Inbox & Tables', 'Manage submissions in an inbox or spreadsheet view', '#/', 'inbox', '#0369a1'],
  ['Reports', 'Turn responses into charts and stats', '#/', 'forms', '#475569'],
  ['PDF documents', 'Polished PDFs from every submission', '#/', 'forms', '#2563eb'],
  ['AI Agents', 'Let people fill forms by chatting', '#/', 'sparkles', '#db2777'],
  ['Boards', 'Turn responses into tasks', null, 'apps', '#b45309', true],
  ['Website Widgets', 'Embeddable widgets for your site', null, 'external', '#be123c', true],
  ['Mobile App', 'Collect submissions on the go', null, 'apps', '#57534e', true],
];
const AI_PRODUCTS = [['AI Form Builder', 'Create forms from a short description', '#/'], ['AI conditions', 'Describe logic in plain words', '#/'], ['AI workflow steps', 'Summarize, categorize and analyse responses', '#/workflows']];
const FEATURES = [['Conditional logic', '#/templates'], ['Online payments', '#/pricing'], ['E-mail notifications', '#/templates'], ['Form widgets', '#/templates'], ['Teams', '#/pricing'], ['Approvals', '#/templates?type=workflows']];
const SUPPORT = [['Help centre', 'Guides for every feature', '#/help'], ['Contact us', 'Questions about your account', '#/help?s=contact'], ['Report abuse', 'Tell us about a harmful form', '#/help?s=abuse']];

function useOutside(ref, onOut) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
}

// Each top-level menu opens on hover or click; Escape closes it.
export function MegaMenus({ signedIn, dark }) {
  const [open, setOpen] = useState('');
  const ref = useRef(null);
  useOutside(ref, () => setOpen(''));
  const link = (to) => (signedIn ? to : '#/signup');
  const featured = INTEGRATIONS.filter((x) => ['webhooks', 'zapier', 'make', 'n8n', 'slack', 'sheets', 'teams', 'discord', 'pipedream', 'powerAutomate', 'pabbly', 'stripe'].includes(x.key));
  const panels = {
    templates: (
      <div className="mega-grid cols-3">
        {TEMPLATE_LINKS.map(([t, d, to, c]) => (
          <a key={t} href={to} className="mega-item"><span className="mega-thumb" style={{ background: c }} aria-hidden="true" /><span><b>{t}</b><span>{d}</span></span></a>
        ))}
      </div>
    ),
    integrations: (
      <div className="mega-split">
        <div className="mega-side">
          <span className="mega-label">Browse</span>
          {INTEGRATION_CATEGORIES.slice(0, 7).map((c) => <a key={c} href={`#/integrations?category=${encodeURIComponent(c)}`}>{c}<Icon name="down" size={14} style={{ transform: 'rotate(-90deg)' }} /></a>)}
          <a href="#/integrations" className="mega-all">See all {INTEGRATIONS.length} integrations →</a>
        </div>
        <div style={{ flex: 1 }}>
          <span className="mega-label">Featured integrations</span>
          <div className="mega-grid cols-3">
            {featured.map((x) => <a key={x.key} href="#/integrations" className="mega-item small"><span className="mega-logo" aria-hidden="true">{x.name.slice(0, 2)}</span><span><b>{x.name}</b><span>{x.desc}</span></span></a>)}
          </div>
        </div>
      </div>
    ),
    products: (
      <div className="mega-split">
        <div style={{ flex: 2 }}>
          <span className="mega-label">Products</span>
          <div className="mega-grid cols-3">
            {PRODUCTS.map(([t, d, to, icon, c, soon]) => (
              <a key={t} href={soon ? undefined : link(to)} aria-disabled={soon || undefined} className={`mega-item small ${soon ? 'soon' : ''}`}>
                <span className="mega-icon" style={{ background: c }} aria-hidden="true"><Icon name={icon} size={16} /></span>
                <span><b>{t}{soon && <span className="pill" style={{ marginLeft: 6, fontSize: 10, padding: '0 6px' }}>Soon</span>}</b><span>{d}</span></span>
              </a>
            ))}
          </div>
        </div>
        <div className="mega-side wide">
          <span className="mega-label">AI products</span>
          {AI_PRODUCTS.map(([t, d, to]) => <a key={t} href={link(to)} className="mega-item small"><span><b>{t}</b><span>{d}</span></span></a>)}
          <span className="mega-label" style={{ marginTop: 12 }}>Features</span>
          {FEATURES.map(([t, to]) => <a key={t} href={to} className="mega-plain">{t}</a>)}
        </div>
      </div>
    ),
    support: (
      <div className="mega-grid cols-3">
        {SUPPORT.map(([t, d, to]) => <a key={t} href={to} className="mega-item"><span><b>{t}</b><span>{d}</span></span></a>)}
      </div>
    ),
  };
  const items = [['templates', 'Templates'], ['integrations', 'Integrations'], ['products', 'Products'], ['support', 'Support']];
  return (
    <nav ref={ref} className={`mega ${dark ? 'dark' : ''}`} aria-label="Site" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(''); }} onMouseLeave={() => setOpen('')}>
      {items.map(([k, l]) => (
        <div key={k} className="mega-root" onMouseEnter={() => setOpen(k)}>
          <button className={`mega-btn ${open === k ? 'on' : ''}`} aria-expanded={open === k} onClick={() => setOpen(open === k ? '' : k)}>{l}<Icon name="down" size={14} /></button>
          {open === k && <div className="mega-panel" role="region" aria-label={l} onClick={() => setOpen('')}>{panels[k]}</div>}
        </div>
      ))}
      <a className="mega-btn" href="#/pricing">Pricing</a>
    </nav>
  );
}

const SWITCH = [
  ['My Workspace', '#/', 'apps', '#18181b'], ['My Forms', '#/w/forms', 'forms', '#ea580c'], ['My Agents', null, 'sparkles', '#7c3aed'],
  ['My Workflows', '#/w/workflows', 'redo', '#0f766e'], ['My Tables', null, 'apps', '#15803d'], ['My Sign Documents', '#/w/sign', 'sign', '#65a30d'],
  ['My Boards', null, 'apps', '#2563eb'], ['My Apps', '#/w/apps', 'apps', '#9333ea'], ['My Reports', null, 'forms', '#334155'], ['My Website Widgets', null, 'external', '#db2777'],
];

export function WorkspaceSwitcher({ me, view, onSwitchTeam }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const teams = me.workspaces.filter((w) => w.id !== me.user.id);
  return (
    <div className="ws-switcher" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button className="ws-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        {me.workspace.id === me.user.id ? 'My Workspace' : `${me.workspace.email}'s team`}<Icon name="down" size={14} />
      </button>
      {open && (
        <div className="ws-panel" role="dialog" aria-label="Switch workspace">
          <div className="ws-grid">
            {SWITCH.map(([t, to, icon, c]) => (
              <a key={t} href={to || undefined} aria-disabled={!to || undefined} className={`ws-tile ${(to === '#/' && !view) || (view && to === `#/w/${view}`) ? 'on' : ''} ${to ? '' : 'soon'}`} onClick={() => to && setOpen(false)}>
                <span className="ws-icon" style={{ background: c }} aria-hidden="true"><Icon name={icon} size={22} /></span>
                <span>{t}</span>{!to && <span className="pill" style={{ fontSize: 10, padding: '0 6px' }}>Soon</span>}
              </a>
            ))}
          </div>
          <div className="ws-teams">
            <span className="mega-label">My teams</span>
            {teams.length ? teams.map((w) => <button key={w.id} className={`ws-team ${me.workspace.id === w.id ? 'on' : ''}`} onClick={() => onSwitchTeam(w.id)}><b>{w.email}'s team</b><span className="hint">{w.role}</span></button>)
              : <p className="hint">You don't have any teams yet. Create a team to collaborate with colleagues.</p>}
            {me.workspace.id !== me.user.id && <button className="ws-team" onClick={() => onSwitchTeam(me.user.id)}><b>Back to my workspace</b></button>}
            <a className="btn primary" style={{ marginTop: 'auto' }} href="#/account/team">+ Create a team</a>
          </div>
        </div>
      )}
    </div>
  );
}

export function UserMenu({ me, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const initial = (me.user.name || me.user.email)[0].toUpperCase();
  return (
    <div className="user-menu" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button className="avatar" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen(!open)}>{initial}</button>
      {open && (
        <div className="user-panel" role="menu">
          <div style={{ padding: '10px 12px' }}><b>{me.user.name || 'Your account'}</b><div className="hint">{me.user.email}</div><span className="pill blue" style={{ marginTop: 6 }}>{me.plan.name} plan</span></div>
          <a role="menuitem" href="#/account/plan" onClick={() => setOpen(false)}>Plan & usage</a>
          <a role="menuitem" href="#/account/profile" onClick={() => setOpen(false)}>Profile</a>
          <a role="menuitem" href="#/account/team" onClick={() => setOpen(false)}>Team</a>
          <a role="menuitem" href="#/account/api" onClick={() => setOpen(false)}>API keys</a>
          <a role="menuitem" href="#/account/outbox" onClick={() => setOpen(false)}>Outbox</a>
          <button role="menuitem" onClick={onLogout}>Log out</button>
        </div>
      )}
    </div>
  );
}
