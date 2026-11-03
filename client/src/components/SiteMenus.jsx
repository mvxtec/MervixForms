// Header menus (Templates, Integrations, Products, Support), the workspace switcher and the account menu.
// Shared by the public site header and the signed-in app header.
import { useEffect, useRef, useState } from 'react';
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from '@shared/integrations.js';
import Icon, { integrationIcon } from './Icon.jsx';

const TEMPLATE_LINKS = [
  ['Form templates', 'Registrations, orders, applications and surveys', '#/templates', 'forms'],
  ['Card forms', 'One question at a time for quizzes and feedback', '#/templates?type=card', 'browsers'],
  ['Workflow templates', 'Leave requests, purchase orders and approvals', '#/templates?type=workflows', 'workflow'],
  ['Sign templates', 'NDAs, waivers and offer letters', '#/templates?type=sign', 'sign'],
  ['App templates', 'Portals, staff hubs and directories', '#/templates?type=apps', 'apps'],
  ['Store templates', 'Catalogues, merchandise and menus', '#/templates?type=stores', 'store'],
];

// [title, description, where signed-in people land, icon, not built yet]
export const PRODUCTS = [
  ['Form builder', 'Drag-and-drop forms with logic and calculations', '#/w/forms', 'forms'],
  ['Workflows', 'Approvals, tasks and follow-ups that run themselves', '#/workflows', 'workflow'],
  ['E-sign', 'Prepare documents and collect signatures', '#/sign-docs', 'sign'],
  ['Apps', 'Installable apps built from your forms', '#/apps', 'apps'],
  ['Store builder', 'Sell products with a hosted checkout', '#/apps', 'store'],
  ['Inbox and tables', 'Review, edit and export submissions', '#/w/forms', 'inbox'],
  ['Reports', 'Charts and summaries of responses', '#/w/forms', 'chart'],
  ['PDF documents', 'A PDF for every submission', '#/w/forms', 'pdf'],
  ['AI agent', 'Let people fill a form by chatting', '#/w/forms', 'robot'],
  ['Boards', 'Turn responses into tasks', null, 'kanban', true],
  ['Website widgets', 'Embeddable widgets for your site', null, 'browsers', true],
];
const FEATURES = [['Conditional logic', '#/help?s=start'], ['Payments', '#/pricing'], ['Notifications', '#/integrations?category=Communication'], ['Widgets', '#/templates'], ['Teams and roles', '#/pricing'], ['Approvals', '#/templates?type=workflows']];
const SUPPORT = [['Help centre', 'Guides for every feature', '#/help', 'help'], ['Contact', 'Questions about your account', '#/help?s=contact', 'mail'], ['Report abuse', 'Tell us about a harmful form', '#/help?s=abuse', 'warning']];

function useOutside(ref, onOut) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onOut(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
}

function MenuItem({ href, icon, title, desc, soon }) {
  return (
    <a href={soon ? undefined : href} aria-disabled={soon || undefined} className={`menu-item ${soon ? 'soon' : ''}`}>
      {icon && <span className="menu-icon"><Icon name={icon} size={18} /></span>}
      <span className="menu-text"><b>{title}{soon && <span className="tag">Soon</span>}</b>{desc && <span>{desc}</span>}</span>
    </a>
  );
}

// Each menu opens on hover or click; Escape or clicking outside closes it.
export function MegaMenus({ signedIn }) {
  const [open, setOpen] = useState('');
  const ref = useRef(null);
  useOutside(ref, () => setOpen(''));
  const link = (to) => (signedIn ? to : '#/signup');
  const featured = ['webhooks', 'zapier', 'make', 'n8n', 'slack', 'teams', 'discord', 'sheets', 'stripe']
    .map((k) => INTEGRATIONS.find((x) => x.key === k)).filter(Boolean);
  const panels = {
    templates: <div className="menu-grid cols-2">{TEMPLATE_LINKS.map(([t, d, to, icon]) => <MenuItem key={t} href={to} icon={icon} title={t} desc={d} />)}</div>,
    integrations: (
      <div className="menu-split">
        <div className="menu-side">
          <span className="menu-label">Categories</span>
          {INTEGRATION_CATEGORIES.slice(0, 8).map((c) => <a key={c} className="menu-plain" href={`#/integrations?category=${encodeURIComponent(c)}`}>{c}</a>)}
          <a href="#/integrations" className="menu-plain strong">All {INTEGRATIONS.length} integrations <Icon name="right" size={12} /></a>
        </div>
        <div className="menu-main">
          <span className="menu-label">Popular</span>
          <div className="menu-grid cols-3">{featured.map((x) => <MenuItem key={x.key} href="#/integrations" icon={integrationIcon(x)} title={x.name} desc={x.desc} />)}</div>
        </div>
      </div>
    ),
    products: (
      <div className="menu-split">
        <div className="menu-main">
          <span className="menu-label">Products</span>
          <div className="menu-grid cols-2">{PRODUCTS.map(([t, d, to, icon, soon]) => <MenuItem key={t} href={link(to)} icon={icon} title={t} desc={d} soon={soon} />)}</div>
        </div>
        <div className="menu-side right">
          <span className="menu-label">Features</span>
          {FEATURES.map(([t, to]) => <a key={t} href={to} className="menu-plain">{t}</a>)}
        </div>
      </div>
    ),
    support: <div className="menu-grid cols-3">{SUPPORT.map(([t, d, to, icon]) => <MenuItem key={t} href={to} icon={icon} title={t} desc={d} />)}</div>,
  };
  const items = [['templates', 'Templates'], ['integrations', 'Integrations'], ['products', 'Products'], ['support', 'Support']];
  return (
    <nav ref={ref} className="nav" aria-label="Site" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(''); }} onMouseLeave={() => setOpen('')}>
      {items.map(([k, l]) => (
        <div key={k} className="nav-root" onMouseEnter={() => setOpen(k)}>
          <button className={`nav-btn ${open === k ? 'on' : ''}`} aria-expanded={open === k} onClick={() => setOpen(open === k ? '' : k)}>{l}<Icon name="down" size={12} /></button>
          {open === k && <div className={`menu-panel menu-${k}`} role="region" aria-label={l} onClick={() => setOpen('')}>{panels[k]}</div>}
        </div>
      ))}
      <a className="nav-btn" href="#/pricing">Pricing</a>
    </nav>
  );
}

const SWITCH = [
  ['All items', 'Everything in this workspace', '#/', 'apps', ''],
  ['Forms', 'Forms, inboxes and reports', '#/w/forms', 'forms', 'forms'],
  ['Workflows', 'Approvals and automations', '#/w/workflows', 'workflow', 'workflows'],
  ['Sign documents', 'Documents sent for signature', '#/w/sign', 'sign', 'sign'],
  ['Apps and stores', 'Apps built from your forms', '#/w/apps', 'store', 'apps'],
  ['Assigned to me', 'Approvals waiting on you', '#/w/tasks', 'task', 'tasks'],
];

export function WorkspaceSwitcher({ me, view, onSwitchTeam }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useOutside(ref, () => setOpen(false));
  const teams = me.workspaces.filter((w) => w.id !== me.user.id);
  const mine = me.workspace.id === me.user.id;
  return (
    <div className="switcher" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button className="switcher-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="ws-avatar" aria-hidden="true">{(mine ? me.user.name || me.user.email : me.workspace.email)[0].toUpperCase()}</span>
        <span className="switcher-name">{mine ? 'My workspace' : `${me.workspace.email.split('@')[0]}'s team`}</span>
        <Icon name="sort" size={14} />
      </button>
      {open && (
        <div className="menu-panel switcher-panel" role="dialog" aria-label="Switch workspace">
          <div className="menu-main">
            <span className="menu-label">Go to</span>
            <div className="menu-grid cols-2">
              {SWITCH.map(([t, d, to, icon, v]) => (
                <a key={t} href={to} className={`menu-item ${(view || '') === v ? 'on' : ''}`} onClick={() => setOpen(false)}>
                  <span className="menu-icon"><Icon name={icon} size={18} /></span>
                  <span className="menu-text"><b>{t}</b><span>{d}</span></span>
                </a>
              ))}
            </div>
          </div>
          <div className="menu-side right">
            <span className="menu-label">Workspaces</span>
            <button className={`ws-row-btn ${mine ? 'on' : ''}`} onClick={() => !mine && onSwitchTeam(me.user.id)}>
              <span className="ws-avatar">{(me.user.name || me.user.email)[0].toUpperCase()}</span><span className="grow">My workspace</span>{mine && <Icon name="check" size={14} />}
            </button>
            {teams.map((w) => (
              <button key={w.id} className={`ws-row-btn ${me.workspace.id === w.id ? 'on' : ''}`} onClick={() => onSwitchTeam(w.id)}>
                <span className="ws-avatar">{w.email[0].toUpperCase()}</span>
                <span className="grow">{w.email.split('@')[0]}'s team<span className="hint" style={{ display: 'block' }}>{w.role}</span></span>
                {me.workspace.id === w.id && <Icon name="check" size={14} />}
              </button>
            ))}
            {!teams.length && <p className="hint" style={{ margin: '4px 10px' }}>Invite colleagues to share forms and submissions.</p>}
            <a className="menu-plain strong" href="#/account/team" onClick={() => setOpen(false)}><Icon name="plus" size={14} />Create a team</a>
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
  const go = () => setOpen(false);
  return (
    <div className="user-menu" ref={ref} onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}>
      <button className="user-btn" aria-label="Account menu" aria-expanded={open} onClick={() => setOpen(!open)}>{initial}</button>
      {open && (
        <div className="menu-panel user-panel" role="menu">
          <div className="user-head"><b>{me.user.name || 'Your account'}</b><span className="hint">{me.user.email}</span><span className="tag" style={{ alignSelf: 'flex-start', marginTop: 6 }}>{me.plan.name} plan</span></div>
          {[['account/plan', 'chart', 'Plan and usage'], ['account/profile', 'user', 'Profile'], ['account/team', 'users', 'Team'], ['account/api', 'key', 'API keys'], ['account/outbox', 'mail', 'Outbox']].map(([to, icon, t]) => (
            <a key={to} role="menuitem" href={`#/${to}`} onClick={go}><Icon name={icon} size={16} />{t}</a>
          ))}
          <hr />
          <a role="menuitem" href="#/home" onClick={go}><Icon name="globe" size={16} />Website</a>
          <a role="menuitem" href="#/help" onClick={go}><Icon name="help" size={16} />Help</a>
          <button role="menuitem" onClick={onLogout}><Icon name="logout" size={16} />Log out</button>
        </div>
      )}
    </div>
  );
}
