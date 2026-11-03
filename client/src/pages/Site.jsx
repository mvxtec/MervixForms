// Public website: landing page, pricing, templates, integrations and help, with the shared header
// and footer. Signed-in visitors see "Open workspace" instead of Log in / Sign up.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate, query, setPending } from '../router.js';
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from '@shared/integrations.js';
import { WIDGETS } from '@shared/widgets.js';
import { FIELD_TYPES } from '@shared/fields.js';
import { GATEWAYS } from '@shared/payments.js';
import { PLANS } from '@shared/plans.js';
import { WF_TEMPLATES } from '@shared/workflowElements.js';
import { MegaMenus } from '../components/SiteMenus.jsx';
import { OAuthButtons } from './Auth.jsx';
import Icon, { integrationIcon } from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import { SkipLink } from '../App.jsx';

export function SiteHeader({ me }) {
  return (
    <header className="site-header">
      <SkipLink />
      <div className="site-wrap site-header-row">
        <Logo />
        <MegaMenus signedIn={!!me} />
        <div className="hdr-right">
          {me ? <a className="btn primary" href="#/">Open workspace</a> : (
            <>
              <a className="btn ghost" href="#/login">Log in</a>
              <a className="btn primary" href="#/signup">Sign up</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const FOOTER = [
  ['Product', [['Templates', '#/templates'], ['Integrations', '#/integrations'], ['Pricing', '#/pricing'], ['Workflows', '#/templates?type=workflows']]],
  ['Resources', [['Help centre', '#/help'], ['Embedding', '#/help?s=embed'], ['REST API', '#/help?s=api'], ['Contact', '#/help?s=contact']]],
  ['Company', [['About', '#/help?s=about'], ['Security', '#/help?s=security'], ['Report abuse', '#/help?s=abuse']]],
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-wrap">
        <div className="footer-cols">
          <div className="footer-brand">
            <Logo />
            <p>Forms, payments, e-signatures and approval workflows. Built by GlixWordpress.</p>
          </div>
          {FOOTER.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <h3>{h}</h3>
              {links.map(([t, to]) => <a key={t} href={to}>{t}</a>)}
            </nav>
          ))}
        </div>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} GlixWordpress</span>
          <span className="row" style={{ gap: 20 }}><a href="#/help?s=terms">Terms</a><a href="#/help?s=privacy">Privacy</a></span>
        </div>
      </div>
    </footer>
  );
}

// Start something from the public site: signed-in people go straight to it, others sign up first.
async function start(me, pending) {
  if (!me) { setPending(pending); return navigate('/signup'); }
  if (pending.templateId || pending.blank) {
    const { id } = await api('/forms', { method: 'POST', body: pending.blank ? { title: 'Untitled Form' } : { templateId: pending.templateId } });
    return navigate(`/forms/${id}/build`);
  }
  setPending(pending);
  navigate('/');
}

const CATEGORY_ICON = { Contact: 'mail', Registration: 'ticket', Survey: 'chart', Feedback: 'chat', Payment: 'card', Order: 'card', Application: 'briefcase', Booking: 'appointment', HR: 'users', Education: 'student', Healthcare: 'health' };
const templateIcon = (t) => CATEGORY_ICON[t.category] || 'forms';

function TemplateCard({ t, onUse }) {
  return (
    <button className="tpl-tile" onClick={onUse}>
      <span className="tpl-tile-icon"><Icon name={templateIcon(t)} size={18} /></span>
      <b>{t.name}</b>
      <span className="hint">{t.fieldCount} fields · {t.layout === 'card' ? 'Card form' : 'Classic form'}</span>
      {t.description && <span className="tpl-tile-desc">{t.description}</span>}
      <span className="tpl-tile-cta">Use template <Icon name="right" size={12} /></span>
    </button>
  );
}

const SHOWCASE_FIELDS = [
  ['text', 'Short text'], ['email', 'Email'], ['phone', 'Phone'], ['fullname', 'Full name'], ['address', 'Address'], ['date', 'Date'],
  ['dropdown', 'Dropdown'], ['radio', 'Single choice'], ['file', 'File upload'], ['signature', 'Signature'], ['appointment', 'Appointment'],
  ['rating', 'Star rating'], ['matrix', 'Input table'], ['calculation', 'Calculation'], ['products', 'Product list'], ['id', 'Aadhaar / PAN / GSTIN'],
];

function Landing({ me }) {
  const [prompt, setPrompt] = useState('');
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api('/public/templates').then(setTemplates).catch(() => {}); }, []);
  const go = (p) => start(me, p).catch((e) => setError(e.message));
  const usable = WIDGETS.filter((w) => !w.soon).length;
  const elementCount = Object.keys(FIELD_TYPES).filter((t) => t !== 'widget').length + usable;
  const live = INTEGRATIONS.filter((x) => x.kind !== 'soon');
  const brands = ['slack', 'teams', 'discord', 'whatsapp', 'sheets', 'webhooks', 'stripe', 'gmail'].map((k) => INTEGRATIONS.find((x) => x.key === k)).filter(Boolean);
  return (
    <>
      <section className="hero">
        <div className="site-wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Forms · Payments · E-sign · Workflows</p>
            <h1>Forms, payments and approvals in one workspace.</h1>
            <p className="lead">Build a form in minutes, take payments and signatures, and route every submission to the people who need to act on it.</p>
            <form className="hero-prompt" onSubmit={(e) => { e.preventDefault(); if (prompt.trim().length >= 5) go({ prompt: prompt.trim() }); }}>
              <label htmlFor="hero-p" className="sr-only">Describe your form</label>
              <Icon name="sparkles" size={18} className="hero-prompt-icon" />
              <textarea id="hero-p" rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe a form: admission form for Class 1 with parent details, documents and a ₹500 fee" />
              <div className="hero-prompt-bar">
                <button type="button" className="ghost small" onClick={() => go({ blank: true })}><Icon name="plus" size={14} />Blank form</button>
                <a className="btn ghost small" href="#/templates"><Icon name="forms" size={14} />Templates</a>
                <button className="primary small right" disabled={prompt.trim().length < 5}>Create with AI<Icon name="right" size={12} /></button>
              </div>
            </form>
            {error && <p className="error">{error}</p>}
            {templates.length > 0 && (
              <div className="hero-starts">
                <span className="hint">Or start from</span>
                {templates.slice(0, 5).map((t) => <button key={t.id} className="chip" onClick={() => go({ templateId: t.id })}><Icon name={templateIcon(t)} size={14} />{t.name}</button>)}
              </div>
            )}
          </div>
          {!me && (
            <aside className="signup-card" aria-labelledby="su-h">
              <h2 id="su-h">Create a free account</h2>
              <p className="muted">{PLANS.starter.forms} forms and {PLANS.starter.submissionsPerMonth} submissions a month on the Starter plan. No card needed.</p>
              <OAuthButtons />
              <a className="btn primary" style={{ width: '100%', minHeight: 40 }} href="#/signup">Sign up with e-mail</a>
              <p className="hint" style={{ textAlign: 'center', margin: 0 }}>Have an account? <a className="link" href="#/login">Log in</a></p>
            </aside>
          )}
        </div>
      </section>

      <section className="site-section">
        <div className="site-wrap">
          <div className="section-intro">
            <h2>Everything a form needs, nothing it doesn't.</h2>
            <p className="lead">The builder, inbox, payments and automation share one data model, so nothing has to be stitched together.</p>
          </div>
          <div className="bento">
            <article className="bento-cell span-2">
              <span className="bento-kicker"><Icon name="forms" size={16} />Form builder</span>
              <h3>{elementCount} elements, including Indian ID and tax checks</h3>
              <p>Drag fields onto the page. Validation for Aadhaar, PAN, GSTIN, IFSC and IBAN runs in the browser and again on the server.</p>
              <ul className="field-cloud" aria-label="Some of the available elements">
                {SHOWCASE_FIELDS.map(([icon, label]) => <li key={label}><Icon name={icon} size={14} />{label}</li>)}
              </ul>
            </article>
            <article className="bento-cell">
              <span className="bento-kicker"><Icon name="logic" size={16} />Conditions</span>
              <h3>Logic you can read</h3>
              <pre className="rule" aria-label="Example condition"><span className="k">if</span> Amount <span className="k">is greater than</span> 50,000{'\n'}<span className="k">show</span> Manager approval{'\n'}<span className="k">require</span> Purchase order</pre>
            </article>
            <article className="bento-cell">
              <span className="bento-kicker"><Icon name="card" size={16} />Payments</span>
              <h3>Take money with the form</h3>
              <ul className="status-list">
                {GATEWAYS.filter((g) => g.ready).map((g) => <li key={g.key}><span className="dot ok" />{g.name}</li>)}
                {['razorpay', 'cashfree', 'payuIndia'].map((k) => GATEWAYS.find((g) => g.key === k)).filter(Boolean).map((g) => <li key={g.key} className="muted"><span className="dot" />{g.name}<span className="tag">Soon</span></li>)}
              </ul>
            </article>
            <article className="bento-cell">
              <span className="bento-kicker"><Icon name="plug" size={16} />Integrations</span>
              <h3>Send submissions anywhere</h3>
              <div className="brand-row">{brands.map((x) => <span key={x.key} title={x.name}><Icon name={integrationIcon(x)} size={20} /></span>)}</div>
              <p className="hint" style={{ margin: 0 }}>{live.length} ready to connect, plus any webhook. <a className="link" href="#/integrations">See all</a></p>
            </article>
            <article className="bento-cell">
              <span className="bento-kicker"><Icon name="sign" size={16} />E-sign and documents</span>
              <h3>Signatures and PDFs</h3>
              <p>Send documents for signature and get a signed PDF back. Every submission can also become a PDF attached to its e-mail.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="site-section">
        <div className="site-wrap split">
          <div>
            <span className="bento-kicker"><Icon name="workflow" size={16} />Workflows</span>
            <h2 className="split-title">Approvals that move on their own.</h2>
            <p className="lead">Route requests to approvers by e-mail link, assign tasks, wait for payment, and keep the requester updated on a tracking page.</p>
            <a className="btn" href="#/templates?type=workflows">Browse {WF_TEMPLATES.length} workflow templates <Icon name="right" size={12} /></a>
          </div>
          <ol className="flow" aria-label="Example workflow">
            {[['forms', 'Leave request submitted', 'Form'], ['approval', 'Manager approves', 'Approval · any one of 2'], ['task', 'HR updates the roster', 'Task'], ['mail', 'Employee is notified', 'E-mail']].map(([icon, t, d]) => (
              <li key={t}><span className="flow-icon"><Icon name={icon} size={16} /></span><span><b>{t}</b><span className="hint">{d}</span></span></li>
            ))}
          </ol>
        </div>
      </section>

      <section className="site-section">
        <div className="site-wrap">
          <div className="cta-panel">
            <div>
              <h2>Build your first form today.</h2>
              <p className="muted">Free on the Starter plan. Upgrade when you need more.</p>
            </div>
            <div className="row wrap">
              <a className="btn primary" href={me ? '#/' : '#/signup'}>{me ? 'Open workspace' : 'Create a free account'}</a>
              <a className="btn" href="#/pricing">Compare plans</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

const ROWS = [
  ['Forms', 'forms'], ['Submissions per month', 'submissionsPerMonth'], ['Form views per month', 'viewsPerMonth'], ['Stored submissions', 'totalSubmissions'],
  ['Payment submissions per month', 'paymentsPerMonth'], ['Signed documents per month', 'signaturesPerMonth'], ['Fields per form', 'fieldsPerForm'],
  ['File storage', 'uploadBytes'], ['Remove WpForms branding', 'branding'], ['HIPAA features', 'hipaa'], ['Custom domain', 'customDomain'], ['Team members', 'multiUser'],
];
const fmtLimit = (k, v) => {
  if (typeof v === 'boolean') return (k === 'branding' ? !v : v) ? <Icon name="check" size={14} /> : <span className="muted">—</span>;
  if (v === Infinity) return 'Unlimited';
  if (k === 'uploadBytes') return v >= 1024 ** 3 ? `${v / 1024 ** 3} GB` : `${v / 1024 ** 2} MB`;
  return v.toLocaleString('en-IN');
};

function Pricing({ me }) {
  const plans = Object.entries(PLANS);
  return (
    <section className="site-section">
      <div className="site-wrap">
        <div className="section-intro">
          <h1>Pricing</h1>
          <p className="lead">Start free. Upgrade when you need more forms, submissions or team members.</p>
        </div>
        <div className="price-grid">
          {plans.map(([k, p]) => (
            <div key={k} className={`price-card ${k === 'silver' ? 'pop' : ''}`}>
              <div className="price-head">
                <h2>{p.name}{k === 'silver' && <span className="tag">Popular</span>}</h2>
                <div className="price">{p.price == null ? 'Custom' : p.price === 0 ? '$0' : <>${p.price}</>}{p.price ? <span> / month</span> : null}</div>
              </div>
              <ul>
                <li><Icon name="check" size={14} />{fmtLimit('forms', p.forms)} forms</li>
                <li><Icon name="check" size={14} />{fmtLimit('n', p.submissionsPerMonth)} submissions / month</li>
                <li><Icon name="check" size={14} />{fmtLimit('uploadBytes', p.uploadBytes)} storage</li>
                {p.hipaa && <li><Icon name="check" size={14} />HIPAA features</li>}
                {p.multiUser && <li><Icon name="check" size={14} />Team members and roles</li>}
              </ul>
              <a className={`btn ${k === 'silver' ? 'primary' : ''}`} style={{ width: '100%' }} href={me ? '#/account/plan' : '#/signup'}>{p.price == null ? 'Contact sales' : me ? 'Choose plan' : 'Get started'}</a>
            </div>
          ))}
        </div>
        <div className="tbl-wrap" style={{ marginTop: 40 }}>
          <table className="tbl" style={{ minWidth: 720 }}>
            <thead><tr><th>Compare plans</th>{plans.map(([k, p]) => <th key={k} style={{ textAlign: 'center' }}>{p.name}</th>)}</tr></thead>
            <tbody>{ROWS.map(([l, k]) => <tr key={k}><td>{l}</td>{plans.map(([pk, p]) => <td key={pk} style={{ textAlign: 'center' }}>{fmtLimit(k, p[k])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const TYPE_TABS = [['', 'Forms'], ['card', 'Card forms'], ['workflows', 'Workflows'], ['apps', 'Apps'], ['sign', 'Sign'], ['stores', 'Stores']];

function Templates({ me, route }) {
  const type = query(route).get('type') || '';
  const [templates, setTemplates] = useState([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { api('/public/templates').then(setTemplates).catch(() => {}); }, []);
  const forms = templates.filter((t) => (type === 'card' ? t.layout === 'card' : true) && (!cat || t.category === cat) && t.name.toLowerCase().includes(q.toLowerCase()));
  const wfs = WF_TEMPLATES.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
  const cats = [...new Set(templates.map((t) => t.category))];
  return (
    <section className="site-section">
      <div className="site-wrap">
        <div className="section-intro">
          <h1>Templates</h1>
          <p className="lead">Start from a working form or workflow and change anything.</p>
        </div>
        <div className="toolbar">
          <div className="seg" role="tablist" aria-label="Template type">
            {TYPE_TABS.map(([k, l]) => <a key={k} role="tab" aria-selected={type === k} className={type === k ? 'on' : ''} href={`#/templates${k ? `?type=${k}` : ''}`}>{l}</a>)}
          </div>
          <label className="search" style={{ minWidth: 240 }}><Icon name="search" /><span className="sr-only">Search templates</span><input type="search" placeholder="Search templates" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        </div>
        {error && <p className="error">{error}</p>}
        {(type === '' || type === 'card') && (
          <div className="tpl-layout">
            <nav className="side-list" aria-label="Categories">
              <button className={!cat ? 'active' : ''} onClick={() => setCat('')}>All categories</button>
              {cats.map((c) => <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>{c}</button>)}
            </nav>
            <div className="tpl-grid-site">
              {forms.map((t) => <TemplateCard key={t.id} t={t} onUse={() => start(me, { templateId: t.id }).catch((e) => setError(e.message))} />)}
              {!forms.length && <p className="muted">No templates match.</p>}
            </div>
          </div>
        )}
        {type === 'workflows' && (
          <div className="tpl-grid-site">
            {wfs.map((t) => (
              <a key={t.key} className="tpl-tile" href={me ? '#/workflows' : '#/signup'}>
                <span className="tpl-tile-icon"><Icon name="workflow" size={18} /></span>
                <b>{t.title}</b>
                <span className="hint">{t.category} · {t.build().length} steps</span>
                <span className="tpl-tile-desc">{t.desc}</span>
                <span className="tpl-tile-cta">Use template <Icon name="right" size={12} /></span>
              </a>
            ))}
          </div>
        )}
        {['apps', 'sign', 'stores'].includes(type) && (
          <div className="ws-empty">
            <span className="empty-icon"><Icon name={type === 'sign' ? 'sign' : type === 'stores' ? 'store' : 'apps'} size={22} /></span>
            <b>{{ apps: 'App', sign: 'Sign', stores: 'Store' }[type]} templates are on the way</b>
            <span className="hint">You can already build {type === 'sign' ? 'sign documents' : type} from scratch in your workspace.</span>
            <a className="btn primary" href={me ? (type === 'sign' ? '#/sign-docs' : '#/apps') : '#/signup'}>{me ? 'Open the builder' : 'Sign up free'}</a>
          </div>
        )}
      </div>
    </section>
  );
}

const KIND_NOTE = { webhook: 'Webhook', slack: 'Ready', discord: 'Ready', teams: 'Ready', sheets: 'Ready', builtin: 'Built in', payment: 'Payments', notify: 'Notifications', soon: 'Soon' };

function Integrations({ route }) {
  const [cat, setCat] = useState(query(route).get('category') || '');
  const [q, setQ] = useState('');
  useEffect(() => { setCat(query(route).get('category') || ''); }, [route]);
  const list = INTEGRATIONS.filter((x) => (!cat || x.category === cat) && (x.name + x.desc).toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="site-section">
      <div className="site-wrap">
        <div className="section-intro">
          <h1>Integrations</h1>
          <p className="lead">Connect forms to the tools your team already uses. Set them up under a form's Settings, Integrations.</p>
        </div>
        <div className="tpl-layout">
          <nav className="side-list" aria-label="Categories">
            <label className="search" style={{ marginBottom: 8 }}><Icon name="search" /><span className="sr-only">Search integrations</span><input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <button className={!cat ? 'active' : ''} onClick={() => setCat('')}>All <span className="hint right">{INTEGRATIONS.length}</span></button>
            {INTEGRATION_CATEGORIES.map((c) => <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>{c}</button>)}
          </nav>
          <div className="int-grid">
            {list.map((x) => (
              <div key={x.key} className={`int-card ${x.kind === 'soon' ? 'soon' : ''}`}>
                <span className="integ-logo"><Icon name={integrationIcon(x)} size={20} /></span>
                <div><b>{x.name}</b><p className="muted">{x.desc}</p></div>
                <span className={`tag ${x.kind === 'soon' ? '' : 'ok'}`}>{KIND_NOTE[x.kind] || 'Ready'}</span>
              </div>
            ))}
            {!list.length && <p className="muted">No integrations match.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}

const HELP = [
  ['start', 'Getting started', 'Sign up, press Create and choose Form. Start blank, from a template, or describe the form to the AI builder. Drag elements from the left panel, add conditions under Settings, then Publish to get a link, an embed code or a QR code.'],
  ['embed', 'Embedding and WordPress', 'Every form has an embed code under Publish. Paste the iframe snippet into any website, including a WordPress Custom HTML block. The form resizes itself to fit.'],
  ['api', 'REST API', 'Create an API key under Account, API keys, and send it as a Bearer token. Endpoints cover forms, submissions and webhooks.'],
  ['contact', 'Contact', 'For account, billing or data questions, write to the support address your organisation publishes for WpForms. Include the form link and what you expected to happen.'],
  ['abuse', 'Report abuse', 'If a form asks for passwords or bank details, or impersonates someone, send the form link to the support address. Reported forms are reviewed and disabled when they break the terms.'],
  ['about', 'About', 'WpForms is a form, payment, e-signature and workflow platform built by GlixWordpress.'],
  ['privacy', 'Privacy', 'Submissions belong to the form owner, who can export or delete them at any time. Your organisation publishes the full privacy policy before launch.'],
  ['terms', 'Terms', 'Forms must not collect data unlawfully or deceive respondents. Your organisation publishes the full terms of service before launch.'],
  ['security', 'Security', 'Passwords are hashed, sessions use HTTP-only cookies, payment amounts are recalculated on the server, and upload sizes are limited per plan.'],
];

function Help({ route }) {
  const s = query(route).get('s');
  const [q, setQ] = useState('');
  useEffect(() => { if (s) document.getElementById(`help-${s}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [s]);
  const list = HELP.filter(([, h, body]) => (h + body).toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="site-section">
      <div className="site-wrap help-layout">
        <nav className="side-list help-nav" aria-label="Topics">
          {HELP.map(([k, h]) => <a key={k} href={`#/help?s=${k}`} className={s === k ? 'active' : ''}>{h}</a>)}
        </nav>
        <div>
          <h1>Help centre</h1>
          <label className="search" style={{ margin: '8px 0 16px' }}><Icon name="search" /><span className="sr-only">Search help</span><input type="search" placeholder="Search help" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          {list.map(([k, h, body]) => (
            <article key={k} id={`help-${k}`} className={`help-item ${s === k ? 'on' : ''}`}>
              <h2>{h}</h2>
              <p>{body}</p>
            </article>
          ))}
          {!list.length && <p className="muted">Nothing matches “{q}”.</p>}
        </div>
      </div>
    </section>
  );
}

function NotFound() {
  return (
    <section className="site-section">
      <div className="site-wrap ws-empty" style={{ maxWidth: 520 }}>
        <span className="empty-icon"><Icon name="help" size={22} /></span>
        <b>Page not found</b>
        <span className="hint">The link may be old or mistyped.</span>
        <a className="btn primary" href="#/">Go home</a>
      </div>
    </section>
  );
}

export const SITE_PAGES = ['/', '/home', '/pricing', '/templates', '/integrations', '/help'];

export default function Site({ me, route }) {
  const page = route.split('?')[0];
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  const body = page === '/pricing' ? <Pricing me={me} />
    : page === '/templates' ? <Templates me={me} route={route} />
      : page === '/integrations' ? <Integrations route={route} />
        : page === '/help' ? <Help route={route} />
          : page === '/' || page === '/home' ? <Landing me={me} />
            : <NotFound />;
  return (
    <div className="site">
      <SiteHeader me={me} />
      <main id="main" tabIndex={-1}>{body}</main>
      <SiteFooter />
    </div>
  );
}
