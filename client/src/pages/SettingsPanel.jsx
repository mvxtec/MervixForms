import { useState } from 'react';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';
import Conditions from './Conditions.jsx';
import { Emails, Notifications } from './Emails.jsx';
import Integrations from './Integrations.jsx';
import { looksLikeHtml } from '../sanitize.js';
import { isDisplay } from '@shared/fields.js';
import { LANGUAGES, TEXT_PROPS, LIST_PROPS } from '@shared/i18n.js';
import { api } from '../api.js';



function Translations({ def, update, me, formId }) {
  const list = def.translations || [];
  const [active, setActive] = useState(list[0]?.code || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const cur = list.find((t) => t.code === active);
  const setList = (fn) => update((d) => ({ ...d, translations: fn(d.translations || []) }));
  const setString = (key, v) => setList((ts) => ts.map((t) => (t.code === active ? { ...t, strings: { ...t.strings, [key]: v } } : t)));
  const rows = [['_form.title', 'Form title', def.title], ['_form.thankYou', 'Thank-you message', def.settings?.thankYou?.message], ['_form.submitLabel', 'Submit button', def.settings?.submitLabel || 'Submit']];
  for (const f of def.fields) {
    for (const k of TEXT_PROPS) if (f[k]) rows.push([`${f.id}.${k}`, `${f.label} · ${k}`, f[k]]);
    for (const k of LIST_PROPS) if (Array.isArray(f[k])) f[k].forEach((o, i) => rows.push([`${f.id}.${k}.${i}`, `${f.label} · ${k.slice(0, -1)} ${i + 1}`, o]));
  }
  const add = (code) => {
    if (!code || list.some((t) => t.code === code)) return;
    const name = LANGUAGES.find(([c]) => c === code)?.[1] || code;
    setList((ts) => [...ts, { code, name, strings: {} }]);
    setActive(code);
  };
  const autoTranslate = async () => {
    setBusy(true); setErr('');
    try {
      const { strings } = await api('/ai/translate', { method: 'POST', body: { formId, language: cur.name, definition: def } });
      setList((ts) => ts.map((t) => (t.code === active ? { ...t, strings: { ...t.strings, ...strings } } : t)));
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };
  return (
    <>
      <h2>Translations</h2>
      <p className="hint">Respondents pick a language on the form, or open it with <code>?lang=es</code>. Answers are stored in the original language, so reports and logic keep working.</p>
      <label className="lbl">Original language name</label>
      <input style={{ maxWidth: 220 }} value={def.languageName || ''} placeholder="English" onChange={(e) => update((d) => ({ ...d, languageName: e.target.value }))} />
      <div className="row wrap" style={{ marginTop: 12 }}>
        {list.map((t) => <button key={t.code} className={`small ${active === t.code ? 'primary' : ''}`} onClick={() => setActive(t.code)}>{t.name}</button>)}
        <select style={{ width: 'auto' }} value="" onChange={(e) => add(e.target.value)}>
          <option value="">+ Add language</option>
          {LANGUAGES.filter(([c]) => !list.some((t) => t.code === c)).map(([c, n]) => <option key={c} value={c}>{n}</option>)}
        </select>
      </div>
      {cur && (
        <>
          <div className="row" style={{ margin: '12px 0' }}>
            <button className="small" disabled={busy || !me.ai} onClick={autoTranslate} title={me.ai ? '' : 'Set ANTHROPIC_API_KEY to enable'}>{busy ? 'Translating…' : '✨ Auto-translate with AI'}</button>
            <button className="small danger right" onClick={() => { setList((ts) => ts.filter((t) => t.code !== active)); setActive(''); }}>Remove {cur.name}</button>
          </div>
          {err && <p className="error">{err}</p>}
          <table className="tbl"><tbody>
            {rows.map(([key, label, orig]) => (
              <tr key={key}>
                <td style={{ width: '35%' }}><div className="hint">{label}</div>{orig}</td>
                <td><input value={cur.strings[key] || ''} placeholder={orig} onChange={(e) => setString(key, e.target.value)} /></td>
              </tr>
            ))}
          </tbody></table>
        </>
      )}
    </>
  );
}

// Left menu of Settings, in Jotform's order; extra sections sit under "More".
export const SETTINGS_MENU = [
  ['form', 'Form Settings', 'Customize form status and properties', 'forms'],
  ['conditions', 'Conditions', 'Set up conditional logic', 'logic'],
  ['emails', 'Emails', 'Send autoresponders and notifications', 'inbox'],
  ['notifications', 'Notifications', 'Receive submission notifications', 'sparkles'],
  ['integrations', 'Integrations', 'Connect your form to other apps', 'apps'],
  ['thankyou', 'Thank You Page', 'Show page after submission', 'check'],
  ['documents', 'Documents', 'Turn submissions into documents', 'forms'],
  ['workflows', 'Workflows', 'Automate tasks after submissions', 'redo'],
];
const MORE = [['payments', 'Payments'], ['translations', 'Translations'], ['agent', 'AI Agent']];

function Toggle({ on, onChange, label, disabled }) {
  return (
    <button role="switch" aria-checked={!!on} aria-label={label} disabled={disabled} className={`wg-switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span className="wg-knob" aria-hidden="true" />{on ? 'On' : 'Off'}
    </button>
  );
}

function Title({ icon, color, title, desc, children }) {
  return (
    <div className="settings-title">
      <span className="settings-icon" style={color ? { background: color } : undefined}><Icon name={icon} /></span>
      <div><h2>{title}</h2><p>{desc}</p></div>
      {children}
    </div>
  );
}

function FormSettings({ def, update, s, set, form, onStatus }) {
  const [more, setMore] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const status = form.status === 'enabled' ? (s.closeDate ? 'date' : s.maxSubmissions ? 'limit' : 'enabled') : 'disabled';
  const STATUS = {
    enabled: ['Enabled', 'Your form is visible and accepting submissions'],
    disabled: ['Disabled', 'Your form is not accepting submissions'],
    date: ['Disable on date', `Closes ${s.closeDate ? new Date(s.closeDate).toLocaleString() : ''}`],
    limit: ['Disable on submission limit', `Closes after ${s.maxSubmissions} submissions`],
  };
  const choose = async (k) => {
    if (k === 'disabled') await onStatus('disabled');
    else {
      if (form.status !== 'enabled') await onStatus('enabled');
      set({ closeDate: k === 'date' ? s.closeDate || new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 16) : '', maxSubmissions: k === 'limit' ? s.maxSubmissions || 100 : '' });
    }
    setStatusOpen(false);
  };
  return (
    <div className="settings-pane">
      <Title icon="forms" color="#ea580c" title="Form Settings" desc="Customize form status and properties" />
      <div className="panel settings-card">
        <div className="set-row col">
          <b>Title</b><span className="hint">Enter a name for your form</span>
          <input value={def.title} onChange={(e) => update((d) => ({ ...d, title: e.target.value }))} />
        </div>
        <div className="set-row col">
          <b>Form Status</b><span className="hint">Enable, disable, or conditionally enable your form</span>
          <button className={`status-card ${status === 'disabled' ? 'off' : ''}`} aria-expanded={statusOpen} onClick={() => setStatusOpen(!statusOpen)}>
            <span className="status-dot" aria-hidden="true"><Icon name={status === 'disabled' ? 'lock' : 'check'} size={16} /></span>
            <span className="grow" style={{ textAlign: 'left' }}><b className="status-label">{STATUS[status][0]}</b><span className="hint" style={{ display: 'block' }}>{STATUS[status][1]}</span></span>
            <Icon name="down" size={16} />
          </button>
          {statusOpen && (
            <div className="stack">
              {Object.entries(STATUS).map(([k, [l, d]]) => (
                <button key={k} className={`type-card ${status === k ? 'on' : ''}`} onClick={() => choose(k)}>
                  <span className="grow" style={{ textAlign: 'left' }}><b>{l}</b><span className="hint" style={{ display: 'block' }}>{k === 'enabled' ? 'Always accept submissions' : k === 'disabled' ? 'Stop accepting submissions now' : k === 'date' ? 'Stop on a date and time you choose' : 'Stop after a number of submissions'}</span></span>
                </button>
              ))}
            </div>
          )}
          {status === 'date' && <input type="datetime-local" aria-label="Close date" value={s.closeDate || ''} onChange={(e) => set({ closeDate: e.target.value })} style={{ maxWidth: 260 }} />}
          {status === 'limit' && <input type="number" aria-label="Submission limit" min="1" value={s.maxSubmissions || ''} onChange={(e) => set({ maxSubmissions: e.target.value })} style={{ maxWidth: 160 }} />}
        </div>
        <div className="set-row">
          <div className="grow"><b>Encrypt Form Data</b><div className="hint">Encrypt responses so only you can read them. Coming soon.</div></div>
          <Toggle on={false} onChange={() => {}} label="Encrypt form data" disabled />
        </div>
        <div className="set-row">
          <div className="grow"><b>Draft Mode</b><div className="hint">Edit in draft and publish changes when ready. Today every edit autosaves to the live form; use History to roll back.</div></div>
          <Toggle on={false} onChange={() => {}} label="Draft mode" disabled />
        </div>
      </div>
      <button className="primary" style={{ alignSelf: 'flex-start' }} onClick={() => setMore(!more)} aria-expanded={more}>{more ? 'Show fewer options' : 'Show more options'}</button>
      {more && (
        <div className="panel settings-card">
          <div className="set-row col"><b>Message when closed</b><input value={s.closedMessage || ''} onChange={(e) => set({ closedMessage: e.target.value })} /></div>
          <div className="set-row col"><b>Password protection</b><span className="hint">Respondents need this password to open the form</span><input value={s.password || ''} placeholder="No password" onChange={(e) => set({ password: e.target.value })} style={{ maxWidth: 280 }} /></div>
          <div className="set-row col"><b>Submit button text</b><input value={s.submitLabel || ''} placeholder="Submit" onChange={(e) => set({ submitLabel: e.target.value })} style={{ maxWidth: 280 }} /></div>
          <div className="set-row"><div className="grow"><b>Save and continue later</b><div className="hint">Respondents get a link to finish multi-page forms later</div></div><Toggle on={s.saveAndContinue} onChange={(v) => set({ saveAndContinue: v })} label="Save and continue later" /></div>
          <div className="set-row"><div className="grow"><b>One submission per person</b><div className="hint">Blocks repeat submissions from the same IP address</div></div><Toggle on={s.oneSubmissionPerUser} onChange={(v) => set({ oneSubmissionPerUser: v })} label="One submission per person" /></div>
          <div className="set-row"><div className="grow"><b>Progress bar</b><div className="hint">Show progress on multi-page and card forms</div></div><Toggle on={s.showProgress !== false} onChange={(v) => set({ showProgress: v })} label="Progress bar" /></div>
        </div>
      )}
    </div>
  );
}

function ThankYou({ def, s, setIn }) {
  const ty = s.thankYou || {};
  const mode = ty.mode || (ty.redirect ? 'redirect' : 'page');
  const fields = def.fields.filter((f) => !isDisplay(f));
  return (
    <div className="settings-pane">
      <Title icon="check" color="#16a34a" title="Thank You Page" desc="Choose an action after submission" />
      <div className="grid2" role="radiogroup" aria-label="After submission">
        {[['page', 'Show a Thank You page after submission'], ['redirect', 'Redirect to an external link after submission']].map(([k, l]) => (
          <button key={k} role="radio" aria-checked={mode === k} className={`type-card ${mode === k ? 'on' : ''}`} onClick={() => setIn('thankYou', { mode: k })}>
            <span className={`radio-dot ${mode === k ? 'on' : ''}`} aria-hidden="true" /><span className="grow" style={{ textAlign: 'left' }}>{l}</span>
          </button>
        ))}
      </div>
      {mode === 'page' ? (
        <>
          <RichText label="Thank-you page" value={looksLikeHtml(ty.message) ? ty.message : `<div style="text-align: center"><h1>Thank You!</h1><p>${(ty.message || 'Your submission has been received.').replace(/</g, '&lt;')}</p></div>`} onChange={(message) => setIn('thankYou', { message })} fields={fields} minHeight={240} />
          <p className="hint">Use the Fields menu to greet people with their answers, e.g. “Thanks, {'{name}'}!”. Conditions can show a different message per answer.</p>
        </>
      ) : (
        <div className="panel settings-card">
          <div className="set-row col"><b>Redirect URL</b><span className="hint">Respondents go here after submitting</span><input value={ty.redirect || ''} placeholder="https://example.com/thanks" onChange={(e) => setIn('thankYou', { redirect: e.target.value })} /></div>
        </div>
      )}
    </div>
  );
}

function Documents({ def, setPdf }) {
  return (
    <div className="settings-pane">
      <Title icon="forms" color="#0369a1" title="Documents" desc="Turn submissions into documents" />
      <div className="panel settings-card">
        <div className="set-row col"><b>Document title</b><input value={def.pdf?.title ?? '{form_title}'} onChange={(e) => setPdf({ title: e.target.value })} /></div>
        <div className="set-row col"><b>Introduction</b><textarea rows={3} value={def.pdf?.intro || ''} onChange={(e) => setPdf({ intro: e.target.value })} placeholder="Shown above the answers" /></div>
        <div className="set-row col"><b>Footer</b><input value={def.pdf?.footer || ''} onChange={(e) => setPdf({ footer: e.target.value })} placeholder="e.g. Company Ltd — Confidential" /></div>
        <div className="set-row">
          <div className="grow"><b>Accent colour</b></div>
          <input type="color" aria-label="Accent colour" value={def.pdf?.color || def.theme?.primary || '#0f766e'} onChange={(e) => setPdf({ color: e.target.value })} style={{ maxWidth: 80 }} />
        </div>
        <div className="set-row col"><b>Logo URL (PNG or JPG)</b><input value={def.pdf?.logo ?? def.theme?.logo ?? ''} onChange={(e) => setPdf({ logo: e.target.value })} /></div>
        <div className="set-row"><div className="grow"><b>Show submission ID and date</b></div><Toggle on={def.pdf?.includeMeta !== false} onChange={(v) => setPdf({ includeMeta: v })} label="Show submission ID and date" /></div>
        <div className="set-row"><div className="grow"><b>Include unanswered questions</b></div><Toggle on={!!def.pdf?.showEmpty} onChange={(v) => setPdf({ showEmpty: v })} label="Include unanswered questions" /></div>
      </div>
      <p className="hint">Every submission can be viewed or downloaded as this PDF from the Inbox, and attached to e-mails (Emails → Attach submission PDF). Placeholders: <code>{'{form_title}'}</code> <code>{'{submission_id}'}</code> <code>{'{date}'}</code>. Uploading your own document template is coming soon.</p>
    </div>
  );
}

export default function SettingsPanel({ def, update, me, formId, form, section = 'form', onStatus, workflowsPane }) {
  const s = def.settings || {};
  const set = (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const setIn = (k, patch) => set({ [k]: { ...(s[k] || {}), ...patch } });
  const setPdf = (patch) => update((d) => ({ ...d, pdf: { ...(d.pdf || {}), ...patch } }));
  const go = (k) => { window.location.hash = `#/forms/${formId}/settings/${k}`; };

  let body;
  switch (section) {
    case 'conditions': body = <Conditions def={def} update={update} formId={formId} me={me} workflows={def.workflows || []} />; break;
    case 'emails': body = <Emails def={def} update={update} formId={formId} me={me} />; break;
    case 'notifications': body = <Notifications def={def} update={update} />; break;
    case 'thankyou': body = <ThankYou def={def} s={s} setIn={setIn} />; break;
    case 'documents': body = <Documents def={def} setPdf={setPdf} />; break;
    case 'workflows': body = workflowsPane; break;
    case 'integrations':
      body = <Integrations def={def} update={update} formId={formId} />;
      break;
    case 'payments':
      body = (
        <div className="settings-pane">
          <Title icon="apps" color="#15803d" title="Payments" desc="Gateway and payment settings" />
          <div className="panel settings-card">
            <div className="set-row col">
              <b>Gateway</b>
              <span className="hint">Choose the gateway on the builder's Payments tab. Current: <b>{{ test: 'Test mode', stripe: 'Stripe', purchaseOrder: 'Purchase Order' }[s.payment?.provider] || 'Test mode'}</b>{s.payment?.provider !== 'purchaseOrder' && (me.stripe ? ' — Stripe keys found, so card payments go through Stripe Checkout.' : ' — no Stripe key, so payments are simulated.')}</span>
            </div>
            <div className="set-row"><div className="grow"><b>Payment submissions this month</b></div><span>{me.usage.paymentsPerMonth} / {me.plan.paymentsPerMonth ?? '∞'}</span></div>
          </div>
        </div>
      );
      break;
    case 'translations': body = <div className="settings-pane"><div className="panel"><Translations def={def} update={update} me={me} formId={formId} /></div></div>; break;
    case 'agent':
      body = (
        <div className="settings-pane">
          <Title icon="sparkles" color="#0f766e" title="AI Agent" desc="Let respondents fill the form by chatting" />
          <div className="panel settings-card">
            {!me.ai && <p className="error">Set <code>ANTHROPIC_API_KEY</code> in <code>.env</code> and restart the server to use the AI agent.</p>}
            <div className="set-row"><div className="grow"><b>Offer “Chat with AI”</b><div className="hint">Answers are validated exactly like the form. Uploads, signatures and payments finish in the form.</div></div><Toggle on={s.agent?.enabled} onChange={(v) => setIn('agent', { enabled: v })} label="Chat with AI" /></div>
            <div className="set-row col"><b>Personality / instructions</b><textarea rows={3} value={s.agent?.persona || ''} onChange={(e) => setIn('agent', { persona: e.target.value })} placeholder="friendly and concise; speak like a hotel concierge" /></div>
            <p className="hint">Link straight to chat: <code>/f/{formId}?mode=chat</code></p>
          </div>
        </div>
      );
      break;
    default: body = <FormSettings def={def} update={update} s={s} set={set} form={form} onStatus={onStatus} />;
  }

  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings">
        {SETTINGS_MENU.map(([k, l, d, icon]) => (
          <a key={k} href={`#/forms/${formId}/settings/${k}`} className={section === k ? 'active' : ''} aria-current={section === k ? 'page' : undefined}>
            <Icon name={icon} size={18} />
            <span><b>{l}</b><span>{d}</span></span>
            {k === 'conditions' && (def.logic || []).length > 0 && <span className="badge">{def.logic.length}</span>}
          </a>
        ))}
        <div className="settings-more">More</div>
        {MORE.map(([k, l]) => <a key={k} href={`#/forms/${formId}/settings/${k}`} className={`small-link ${section === k ? 'active' : ''}`}>{l}</a>)}
      </nav>
      <div className="settings-main">{body}</div>
      <button className="sr-only" onClick={() => go('form')}>Back to form settings</button>
    </div>
  );
}

