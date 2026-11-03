// Settings → Integrations: searchable catalog; URL-based integrations connect here, the rest are listed as coming soon.
import { useState } from 'react';
import { INTEGRATIONS, INTEGRATION_BY_KEY, INTEGRATION_CATEGORIES } from '@shared/integrations.js';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

export const SHEETS_SCRIPT = `function doPost(e) {
  var body = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(body.sheet) || ss.insertSheet(body.sheet);
  var keys = Object.keys(body.row);
  if (sh.getLastRow() === 0) sh.appendRow(keys);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  keys.forEach(function (k) { if (head.indexOf(k) < 0) { head.push(k); sh.getRange(1, head.length).setValue(k); } });
  sh.appendRow(head.map(function (h) { return body.row[h] === undefined ? '' : body.row[h]; }));
  return ContentService.createTextOutput('ok');
}`;

const COLORS = ['#0f766e', '#4f46e5', '#db2777', '#ea580c', '#0369a1', '#15803d', '#7c3aed', '#b45309'];
const tint = (key) => COLORS[[...key].reduce((s, c) => s + c.charCodeAt(0), 0) % COLORS.length];
const initials = (n) => n.replace(/\(.*?\)/g, '').split(/[\s.-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const CONNECTABLE = ['webhook', 'slack', 'discord', 'teams', 'sheets'];

function Setup({ def, update, item, formId, onBack }) {
  const s = def.settings || {};
  const [test, setTest] = useState('');
  // Teams shares its setting with Notifications; the others live under settings.integrations.
  const cfg = item.kind === 'teams' ? s.notifications?.teams || {} : s.integrations?.[item.key] || {};
  const setCfg = (patch) => update((d) => {
    const st = d.settings || {};
    if (item.kind === 'teams') return { ...d, settings: { ...st, notifications: { ...(st.notifications || {}), teams: { ...(st.notifications?.teams || {}), ...patch } } } };
    return { ...d, settings: { ...st, integrations: { ...(st.integrations || {}), [item.key]: { ...(st.integrations?.[item.key] || {}), ...patch } } } };
  });
  const sendTest = async (url) => {
    setTest('Sending…');
    const r = await api(`/forms/${formId}/test-integration`, { method: 'POST', body: { kind: item.kind === 'webhook' ? 'webhook' : item.kind, url } }).catch((e) => ({ ok: false, error: e.message }));
    setTest(r.ok ? `Test delivered (HTTP ${r.status}).` : `Test failed: ${r.error || `HTTP ${r.status}`}`);
  };
  const isPlainWebhooks = item.key === 'webhooks';
  const hooks = s.webhooks || [];
  const setHooks = (list) => update((d) => ({ ...d, settings: { ...d.settings, webhooks: list } }));
  return (
    <div className="settings-pane">
      <div className="settings-title">
        <button className="icon-btn ghost" aria-label="Back to integrations" onClick={onBack}><Icon name="back" /></button>
        <span className="settings-icon" style={{ background: tint(item.key), fontWeight: 700, fontSize: 13 }}>{initials(item.name)}</span>
        <div><h2>{item.name}</h2><p>{item.desc}</p></div>
      </div>
      <div className="panel settings-card">
        {isPlainWebhooks ? (
          <div className="set-row col">
            <b>Webhook URLs</b><span className="hint">Every submission is POSTed as JSON to each URL.</span>
            {hooks.map((u, i) => (
              <div className="opt-row" key={i}>
                <input aria-label={`Webhook ${i + 1}`} value={u} onChange={(e) => setHooks(hooks.map((x, j) => (j === i ? e.target.value : x)))} />
                <button className="small" onClick={() => sendTest(u)}>Test</button>
                <button className="small danger" aria-label={`Remove webhook ${i + 1}`} onClick={() => setHooks(hooks.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className="small" style={{ alignSelf: 'flex-start' }} onClick={() => setHooks([...hooks, 'https://'])}><Icon name="plus" size={14} />Add webhook</button>
          </div>
        ) : (
          <>
            <div className="set-row">
              <div className="grow"><b>Send submissions to {item.name}</b><div className="hint">{cfg.enabled ? 'Connected — new submissions are sent automatically.' : 'Off'}</div></div>
              <button role="switch" aria-checked={!!cfg.enabled} aria-label={`Enable ${item.name}`} className={`wg-switch ${cfg.enabled ? 'on' : ''}`} onClick={() => setCfg({ enabled: !cfg.enabled })}><span className="wg-knob" aria-hidden="true" />{cfg.enabled ? 'On' : 'Off'}</button>
            </div>
            <div className="set-row col">
              <b>{item.kind === 'sheets' ? 'Apps Script web app URL' : 'Webhook URL'}</b>
              {item.hint && <span className="hint">{item.hint}</span>}
              <div className="opt-row"><input aria-label="URL" value={cfg.url || ''} placeholder="https://…" onChange={(e) => setCfg({ url: e.target.value })} /><button className="small" disabled={!cfg.url} onClick={() => sendTest(cfg.url)}>Send test</button></div>
            </div>
            {item.kind === 'sheets' && (
              <div className="set-row col">
                <b>Sheet name</b><input value={cfg.sheet || ''} placeholder={def.title} onChange={(e) => setCfg({ sheet: e.target.value })} />
                <details><summary className="hint" style={{ cursor: 'pointer' }}>Setup: paste this script in your Sheet (Extensions → Apps Script), then Deploy → Web app (access: anyone)</summary><pre>{SHEETS_SCRIPT}</pre></details>
              </div>
            )}
          </>
        )}
      </div>
      {test && <p className="hint" role="status">{test}</p>}
      {item.kind === 'webhook' && (
        <pre style={{ fontSize: 12 }}>{'POST <your url>\n{\n  "event": "submission.created",\n  "formId": "...", "formTitle": "...", "submissionId": 12,\n  "data": { "<fieldId>": <value>, ... },\n  "payment": { "status": "paid", "amount": 62, "currency": "INR" } | null\n}'}</pre>
      )}
    </div>
  );
}

export default function Integrations({ def, update, formId }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [open, setOpen] = useState(null);
  const s = def.settings || {};
  if (open) return <Setup def={def} update={update} formId={formId} item={INTEGRATION_BY_KEY[open]} onBack={() => setOpen(null)} />;
  const isOn = (x) => (x.kind === 'teams' ? s.notifications?.teams?.enabled : x.key === 'webhooks' ? (s.webhooks || []).length > 0 : s.integrations?.[x.key]?.enabled);
  const list = INTEGRATIONS.filter((x) => (!cat || x.category === cat) && (!q || `${x.name} ${x.desc}`.toLowerCase().includes(q.toLowerCase())));
  const ready = list.filter((x) => x.kind !== 'soon');
  const soon = list.filter((x) => x.kind === 'soon');
  const action = (x) => {
    if (CONNECTABLE.includes(x.kind)) return setOpen(x.key);
    if (x.kind === 'payment') window.location.hash = `#/forms/${formId}/build`;
    if (x.kind === 'notify') window.location.hash = `#/forms/${formId}/settings/notifications`;
    if (x.kind === 'builtin') window.location.hash = `#/forms/${formId}/${x.link}`;
  };
  const Card = (x) => (
    <button key={x.key} className={`integ-card ${x.kind === 'soon' ? 'soon' : ''}`} disabled={x.kind === 'soon'} onClick={() => action(x)} title={x.kind === 'soon' ? 'Coming soon' : `Set up ${x.name}`}>
      <span className="integ-logo" style={{ background: x.kind === 'soon' ? '#a8a29e' : tint(x.key) }} aria-hidden="true">{initials(x.name)}</span>
      <span className="grow" style={{ minWidth: 0 }}>
        <span className="row" style={{ fontWeight: 600 }}>{x.name}{isOn(x) && <span className="pill green" style={{ fontSize: 10, padding: '0 6px' }}>Connected</span>}</span>
        <span className="hint" style={{ display: 'block' }}>{x.desc}</span>
      </span>
      {x.kind === 'soon' && <span className="pill" style={{ fontSize: 10, padding: '0 6px' }}>Soon</span>}
      {x.kind === 'payment' && <span className="pill blue" style={{ fontSize: 10, padding: '0 6px' }}>Payments tab</span>}
    </button>
  );
  return (
    <div className="settings-pane" style={{ maxWidth: 980 }}>
      <div className="settings-title">
        <span className="settings-icon" style={{ background: '#0e7490' }}><Icon name="apps" /></span>
        <div><h2>Integrations</h2><p>Connect your form to other apps · {INTEGRATIONS.length} listed, {INTEGRATIONS.filter((x) => x.kind !== 'soon').length} available now</p></div>
      </div>
      <div className="row wrap">
        <label className="search" style={{ flex: '1 1 260px' }}><Icon name="search" /><span className="sr-only">Search integrations</span><input type="search" placeholder="Search integrations" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <select aria-label="Category" style={{ width: 'auto' }} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {INTEGRATION_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      {ready.length > 0 && <><h3 style={{ margin: '4px 0 0' }}>Available now</h3><div className="integ-grid">{ready.map(Card)}</div></>}
      {soon.length > 0 && <><h3 style={{ margin: '12px 0 0' }}>Coming soon <span className="hint">— connect these today through Zapier, Make or n8n</span></h3><div className="integ-grid">{soon.map(Card)}</div></>}
      {!list.length && <p className="hint">No integrations match “{q}”.</p>}
    </div>
  );
}
