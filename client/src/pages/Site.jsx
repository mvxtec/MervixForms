// Public website: landing page, pricing, templates, integrations and help, with the shared header
// (mega menus) and footer. Signed-in visitors see "My Workspace" instead of Log in / Sign up.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate, query, setPending } from '../router.js';
import { INTEGRATIONS, INTEGRATION_CATEGORIES } from '@shared/integrations.js';
import { WIDGETS } from '@shared/widgets.js';
import { GATEWAYS } from '@shared/payments.js';
import { PLANS } from '@shared/plans.js';
import { WF_TEMPLATES } from '@shared/workflowElements.js';
import { MegaMenus } from '../components/SiteMenus.jsx';
import { OAuthButtons } from './Auth.jsx';
import Icon from '../components/Icon.jsx';

export function SiteHeader({ me }) {
  return (
    <header className="site-header">
      <div className="site-wrap site-header-row">
        <a href="#/" className="brand"><span className="logo">W</span>WpForms</a>
        <MegaMenus signedIn={!!me} />
        <div className="row" style={{ marginLeft: 'auto' }}>
          {me ? <a className="btn primary" href="#/">My Workspace</a> : (
            <>
              <a className="btn ghost" href="#/login">Log in</a>
              <a className="btn accent" href="#/signup">Sign up for free</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

const FOOTER = [
  ['WpForms', [['Pricing', '#/pricing'], ['Enterprise', '#/pricing'], ['Templates', '#/templates'], ['Integrations', '#/integrations']]],
  ['Products', [['Form Builder', '#/signup'], ['Workflows', '#/templates?type=workflows'], ['E-sign', '#/signup'], ['Apps & stores', '#/signup']]],
  ['Support', [['Help centre', '#/help'], ['Contact us', '#/help?s=contact'], ['Report abuse', '#/help?s=abuse']]],
  ['Company', [['About', '#/help?s=about'], ['Privacy', '#/help?s=privacy'], ['Terms', '#/help?s=terms'], ['Security', '#/help?s=security']]],
  ['Apps & platforms', [['Embed on any website', '#/help?s=embed'], ['WordPress', '#/help?s=embed'], ['REST API', '#/help?s=api']]],
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-wrap">
        <div className="footer-cols">
          <div className="footer-brand">
            <a href="#/" className="brand"><span className="logo">W</span>WpForms</a>
            <p className="muted">Forms, payments, e-signatures and approval workflows for teams in India and beyond. By GlixWordpress.</p>
          </div>
          {FOOTER.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <h3>{h}</h3>
              {links.map(([t, to]) => <a key={t} href={to}>{t}</a>)}
            </nav>
          ))}
        </div>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} GlixWordpress. All rights reserved.</span>
          <span className="row wrap" style={{ gap: 16 }}><a href="#/help?s=terms">Terms</a><a href="#/help?s=privacy">Privacy</a><a href="#/help?s=security">Security</a></span>
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

function TemplateCard({ t, onUse }) {
  return (
    <button className="tpl-card" onClick={onUse}>
      <div className="tpl-preview" style={{ '--c': t.primary }}>
        <span className="bar" /><span /><span /><span className="short" /><span className="btn-fake" />
      </div>
      <b>{t.name}</b>
      <span className="hint">{t.category} · {t.fieldCount} fields · {t.layout === 'card' ? 'Card form' : 'Classic form'}</span>
    </button>
  );
}

function Landing({ me }) {
  const [prompt, setPrompt] = useState('');
  const [templates, setTemplates] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { api('/public/templates').then(setTemplates).catch(() => {}); }, []);
  const go = (p) => start(me, p).catch((e) => setError(e.message));
  const usable = WIDGETS.filter((w) => !w.soon).length;
  const connectable = INTEGRATIONS.filter((x) => x.kind !== 'soon').length;
  return (
    <>
      <section className="hero">
        <div className="site-wrap hero-grid">
          <div>
            <span className="pill teal"><Icon name="sparkles" size={14} />AI form builder</span>
            <h1>Create forms with AI</h1>
            <p className="lead">Describe what you need and get a ready-to-edit form with logic, payments and notifications. Then automate what happens next.</p>
            <form className="hero-prompt" onSubmit={(e) => { e.preventDefault(); if (prompt.trim().length >= 5) go({ prompt: prompt.trim() }); }}>
              <label htmlFor="hero-p" className="sr-only">Describe your form</label>
              <textarea id="hero-p" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. Admission form for Class 1 with parent details, document upload and ₹500 fee by UPI" />
              <div className="row wrap">
                <a className="btn small ghost" href="#/templates"><Icon name="forms" size={16} />Browse templates</a>
                <button type="button" className="btn small ghost" onClick={() => go({ blank: true })}><Icon name="plus" size={16} />Start blank</button>
                <button className="accent right" disabled={prompt.trim().length < 5}><Icon name="sparkles" size={16} />Create form</button>
              </div>
            </form>
            {error && <p className="error">{error}</p>}
            <h2 className="hero-sub">Recommended forms for you</h2>
            <div className="tpl-row">
              {templates.slice(0, 4).map((t) => <TemplateCard key={t.id} t={t} onUse={() => go({ templateId: t.id })} />)}
            </div>
          </div>
          {!me && (
            <aside className="signup-card" aria-labelledby="su-h">
              <h2 id="su-h">Get started — it's free</h2>
              <p className="muted">No credit card needed. The Starter plan includes {PLANS.starter.forms} forms and {PLANS.starter.submissionsPerMonth} submissions a month.</p>
              <OAuthButtons />
              <a className="btn primary" style={{ width: '100%', minHeight: 44 }} href="#/signup">Sign up with e-mail</a>
              <p className="hint" style={{ textAlign: 'center' }}>Already have an account? <a href="#/login">Log in</a></p>
            </aside>
          )}
        </div>
      </section>

      <section className="stats">
        <div className="site-wrap stats-row">
          <div><b>{usable}+</b><span>form elements and widgets</span></div>
          <div><b>{GATEWAYS.length}</b><span>payment gateways in the catalogue</span></div>
          <div><b>{connectable}+</b><span>apps you can connect today</span></div>
          <div><b>{WF_TEMPLATES.length}</b><span>ready-made approval workflows</span></div>
        </div>
      </section>

      <section className="site-section">
        <div className="site-wrap">
          <h2 className="section-title">One workspace for forms and everything after</h2>
          <div className="feature-grid">
            <article className="feature">
              <div className="feature-art art-build"><span /><span /><span className="short" /><span className="cta" /></div>
              <h3>Build forms</h3>
              <p>Drag and drop {usable}+ elements: Aadhaar, PAN and GSTIN checks, signatures, file uploads, ratings and calculations. Show or hide fields with conditions.</p>
              <a href={me ? '#/' : '#/signup'}>Create a form →</a>
            </article>
            <article className="feature">
              <div className="feature-art art-int">{['Sl', 'Sh', 'Za', 'Te', 'n8', 'Wh'].map((x) => <span key={x}>{x}</span>)}</div>
              <h3>Integrate apps</h3>
              <p>Send every submission to Slack, Teams, Google Sheets, Zapier, Make, n8n or any webhook. Notify people by e-mail, SMS or WhatsApp.</p>
              <a href="#/integrations">Explore integrations →</a>
            </article>
            <article className="feature">
              <div className="feature-art art-pay"><b>₹1,499</b><span>Workshop pass</span><i>Pay now</i></div>
              <h3>Collect payments</h3>
              <p>Sell products, take donations and run subscriptions with Stripe or purchase orders, with Razorpay, Cashfree and PayU on the way. Amounts are re-checked on the server before anyone is charged.</p>
              <a href="#/pricing">See plans →</a>
            </article>
          </div>
        </div>
      </section>

      <section className="site-section alt">
        <div className="site-wrap split">
          <div>
            <h2 className="section-title" style={{ textAlign: 'left' }}>Approvals that run themselves</h2>
            <p className="lead">Route leave requests, purchase orders and admissions to the right approver. People approve from an e-mail link, and requesters follow progress on a tracking page.</p>
            <a className="btn" href="#/templates?type=workflows">Browse workflow templates</a>
          </div>
          <ol className="flow" aria-label="Example workflow">
            <li><span className="dot" style={{ background: '#ea580c' }} />Form submitted</li>
            <li><span className="dot" style={{ background: '#0369a1' }} />Manager approval</li>
            <li><span className="dot" style={{ background: '#0f766e' }} />Finance task</li>
            <li><span className="dot" style={{ background: '#65a30d' }} />Requester notified</li>
          </ol>
        </div>
      </section>

      <section className="cta-band">
        <div className="site-wrap">
          <h2>Ready to get started?</h2>
          <p>Create your first form in minutes. Free forever on the Starter plan.</p>
          <a className="btn accent" style={{ minHeight: 46, padding: '0 24px' }} href={me ? '#/' : '#/signup'}>{me ? 'Go to my workspace' : 'Create a free account'}</a>
        </div>
      </section>
    </>
  );
}

const ROWS = [
  ['Forms', 'forms'], ['Submissions per month', 'submissionsPerMonth'], ['Form views per month', 'viewsPerMonth'], ['Total submission storage', 'totalSubmissions'],
  ['Payment submissions per month', 'paymentsPerMonth'], ['Signed documents per month', 'signaturesPerMonth'], ['Fields per form', 'fieldsPerForm'],
  ['File upload space', 'uploadBytes'], ['No WpForms branding', 'branding'], ['HIPAA features', 'hipaa'], ['Custom domain', 'customDomain'], ['Team members', 'multiUser'],
];
const fmtLimit = (k, v) => {
  if (typeof v === 'boolean') return (k === 'branding' ? !v : v) ? '✓' : '—';
  if (v === Infinity) return 'Unlimited';
  if (k === 'uploadBytes') return v >= 1024 ** 3 ? `${v / 1024 ** 3} GB` : `${v / 1024 ** 2} MB`;
  return v.toLocaleString();
};

function Pricing({ me }) {
  const plans = Object.entries(PLANS);
  return (
    <section className="site-section">
      <div className="site-wrap">
        <h1 className="section-title">Plans for every team</h1>
        <p className="lead" style={{ textAlign: 'center' }}>Start free. Upgrade when you need more forms, submissions or team members.</p>
        <div className="price-grid">
          {plans.map(([k, p]) => (
            <div key={k} className={`price-card ${k === 'silver' ? 'pop' : ''}`}>
              {k === 'silver' && <span className="pill teal">Most popular</span>}
              <h2>{p.name}</h2>
              <div className="price">{p.price == null ? 'Custom' : p.price === 0 ? 'Free' : <>${p.price}<span>/month</span></>}</div>
              <ul>
                <li>{fmtLimit('forms', p.forms)} forms</li>
                <li>{fmtLimit('s', p.submissionsPerMonth)} submissions / month</li>
                <li>{fmtLimit('uploadBytes', p.uploadBytes)} uploads</li>
                {p.hipaa && <li>HIPAA features</li>}
                {p.multiUser && <li>Team members & roles</li>}
              </ul>
              <a className={`btn ${k === 'silver' ? 'accent' : ''}`} style={{ width: '100%' }} href={me ? '#/account/plan' : '#/signup'}>{p.price == null ? 'Contact sales' : me ? 'Choose plan' : 'Sign up'}</a>
            </div>
          ))}
        </div>
        <div className="tbl-wrap" style={{ marginTop: 32 }}>
          <table className="tbl" style={{ minWidth: 720 }}>
            <thead><tr><th>Compare plans</th>{plans.map(([k, p]) => <th key={k} style={{ textAlign: 'center' }}>{p.name}</th>)}</tr></thead>
            <tbody>{ROWS.map(([l, k]) => <tr key={k}><td>{l}</td>{plans.map(([pk, p]) => <td key={pk} style={{ textAlign: 'center' }}>{fmtLimit(k, p[k])}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

const TYPE_TABS = [['', 'Form templates'], ['card', 'Card forms'], ['workflows', 'Workflows'], ['apps', 'Apps'], ['sign', 'Sign'], ['stores', 'Stores']];

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
        <h1 className="section-title">Templates</h1>
        <div className="row wrap" style={{ justifyContent: 'center', marginBottom: 20 }}>
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
            <div className="tpl-row wrap">
              {forms.map((t) => <TemplateCard key={t.id} t={t} onUse={() => start(me, { templateId: t.id }).catch((e) => setError(e.message))} />)}
              {!forms.length && <p className="muted">No templates match.</p>}
            </div>
          </div>
        )}
        {type === 'workflows' && (
          <div className="wf-tpl-grid">
            {wfs.map((t) => (
              <a key={t.key} className="wf-tpl" href={me ? '#/workflows' : '#/signup'}>
                <span className="pill">{t.category}</span>
                <b>{t.title}</b>
                <span className="muted">{t.desc}</span>
                <span className="hint">{t.build().length} steps</span>
              </a>
            ))}
          </div>
        )}
        {['apps', 'sign', 'stores'].includes(type) && (
          <div className="ws-empty">
            <Icon name={type === 'sign' ? 'sign' : 'apps'} size={28} />
            <b>{{ apps: 'App', sign: 'Sign', stores: 'Store' }[type]} templates are coming soon</b>
            <span className="hint">You can already build {type === 'sign' ? 'sign documents' : type} from scratch in your workspace.</span>
            <a className="btn primary" href={me ? (type === 'sign' ? '#/sign-docs' : '#/apps') : '#/signup'}>{me ? 'Open builder' : 'Sign up free'}</a>
          </div>
        )}
      </div>
    </section>
  );
}

const KIND_NOTE = { webhook: 'Webhook', slack: 'Ready', discord: 'Ready', teams: 'Ready', sheets: 'Ready', builtin: 'Built in', payment: 'Payments tab', notify: 'Notifications', soon: 'Coming soon' };

function Integrations({ route }) {
  const [cat, setCat] = useState(query(route).get('category') || '');
  const [q, setQ] = useState('');
  useEffect(() => { setCat(query(route).get('category') || ''); }, [route]);
  const list = INTEGRATIONS.filter((x) => (!cat || x.category === cat) && (x.name + x.desc).toLowerCase().includes(q.toLowerCase()));
  return (
    <section className="site-section">
      <div className="site-wrap">
        <h1 className="section-title">Integrations</h1>
        <p className="lead" style={{ textAlign: 'center' }}>Connect forms to the tools your team already uses. Set them up under a form's Settings → Integrations.</p>
        <div className="tpl-layout">
          <nav className="side-list" aria-label="Categories">
            <label className="search" style={{ marginBottom: 8 }}><Icon name="search" /><span className="sr-only">Search integrations</span><input type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></label>
            <button className={!cat ? 'active' : ''} onClick={() => setCat('')}>All ({INTEGRATIONS.length})</button>
            {INTEGRATION_CATEGORIES.map((c) => <button key={c} className={cat === c ? 'active' : ''} onClick={() => setCat(c)}>{c}</button>)}
          </nav>
          <div className="int-grid">
            {list.map((x) => (
              <div key={x.key} className="int-card">
                <span className="mega-logo" aria-hidden="true">{x.name.slice(0, 2)}</span>
                <div><b>{x.name}</b><p className="muted">{x.desc}</p></div>
                <span className={`pill ${x.kind === 'soon' ? '' : 'green'}`}>{KIND_NOTE[x.kind] || 'Ready'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const HELP = [
  ['start', 'Getting started', 'Sign up, press Create and pick Form. Start blank, from a template or describe the form to the AI builder. Drag elements from the left panel, then Publish to get a link, an embed code or a QR code.'],
  ['embed', 'Embedding and WordPress', 'Every form has an embed code under Publish. Paste the iframe snippet into any website, including a WordPress Custom HTML block. The form resizes itself to fit.'],
  ['api', 'REST API', 'Create an API key under Account → API keys and send it as a Bearer token. Endpoints cover forms, submissions and webhooks; see the API reference in the product documentation.'],
  ['contact', 'Contact us', 'For account, billing or data questions, write to the support address your organisation published for WpForms. Include the form link and what you expected to happen.'],
  ['abuse', 'Report abuse', 'If a form asks for passwords, bank details or tries to impersonate someone, report it with the form link to the support address. We review reports and disable forms that break the terms.'],
  ['about', 'About', 'WpForms is a form, payment, e-signature and workflow platform built by GlixWordpress for teams in India and beyond.'],
  ['privacy', 'Privacy', 'Submissions belong to the form owner. Owners can export or delete them at any time. The full privacy policy is published by your organisation before launch.'],
  ['terms', 'Terms', 'Forms must not collect data unlawfully or deceive respondents. The full terms of service are published by your organisation before launch.'],
  ['security', 'Security', 'Passwords are hashed, sessions use HTTP-only cookies, payment amounts are recomputed on the server and file uploads are size-limited per plan.'],
];

function Help({ route }) {
  const s = query(route).get('s');
  useEffect(() => { if (s) document.getElementById(`help-${s}`)?.scrollIntoView({ behavior: 'smooth' }); }, [s]);
  return (
    <section className="site-section">
      <div className="site-wrap" style={{ maxWidth: 820 }}>
        <h1 className="section-title">Help centre</h1>
        {HELP.map(([k, h, body]) => (
          <article key={k} id={`help-${k}`} className={`help-item ${s === k ? 'on' : ''}`}>
            <h2>{h}</h2>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export const SITE_PAGES = ['/', '/pricing', '/templates', '/integrations', '/help'];

export default function Site({ me, route }) {
  const page = route.split('?')[0];
  useEffect(() => { window.scrollTo(0, 0); }, [page]);
  return (
    <div className="site">
      <SiteHeader me={me} />
      <main>
        {page === '/pricing' ? <Pricing me={me} />
          : page === '/templates' ? <Templates me={me} route={route} />
            : page === '/integrations' ? <Integrations route={route} />
              : page === '/help' ? <Help route={route} />
                : <Landing me={me} />}
      </main>
      <SiteFooter />
    </div>
  );
}
