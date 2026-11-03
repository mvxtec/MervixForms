import { useState } from 'react';
import { isDisplay } from '@shared/fields.js';
import { LANGUAGES, TEXT_PROPS, LIST_PROPS } from '@shared/i18n.js';
import { api } from '../api.js';

const SECTIONS = [['general', 'General'], ['thankyou', 'Thank You Page'], ['emails', 'Emails'], ['pdf', 'PDF Document'], ['approvals', 'Approvals'], ['payments', 'Payments'], ['translations', 'Translations'], ['agent', 'AI Agent'], ['integrations', 'Integrations']];

const SHEETS_SCRIPT = `function doPost(e) {
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

export default function SettingsPanel({ def, update, me, formId }) {
  const [sec, setSec] = useState('general');
  const s = def.settings || {};
  const set = (patch) => update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  const setIn = (k, patch) => set({ [k]: { ...(s[k] || {}), ...patch } });
  const setInteg = (k, patch) => set({ integrations: { ...(s.integrations || {}), [k]: { ...(s.integrations?.[k] || {}), ...patch } } });
  const setPdf = (patch) => update((d) => ({ ...d, pdf: { ...(d.pdf || {}), ...patch } }));
  const emailFields = def.fields.filter((f) => f.type === 'email');
  const tokens = def.fields.filter((f) => !isDisplay(f));

  const Tokens = () => (
    <div className="hint" style={{ marginTop: 6 }}>
      Insert answers: <code>{'{form_title}'}</code> <code>{'{all_fields}'}</code>{' '}
      {tokens.map((f) => <code key={f.id} title={f.label} style={{ marginRight: 4 }}>{`{${f.id}}`}</code>)}
    </div>
  );

  return (
    <div className="sidebar-layout">
      <div className="side-list">
        {SECTIONS.map(([k, l]) => <button key={k} className={sec === k ? 'active' : ''} onClick={() => setSec(k)}>{l}</button>)}
      </div>
      <div className="panel" style={{ maxWidth: 760 }}>
        {sec === 'general' && (
          <>
            <h2>General</h2>
            <label className="lbl">Close form on date</label>
            <input type="datetime-local" value={s.closeDate || ''} onChange={(e) => set({ closeDate: e.target.value })} style={{ maxWidth: 260 }} />
            <label className="lbl">Limit total submissions</label>
            <input type="number" value={s.maxSubmissions || ''} onChange={(e) => set({ maxSubmissions: e.target.value })} style={{ maxWidth: 160 }} placeholder="No limit" />
            <label className="lbl">Message when closed</label>
            <input value={s.closedMessage || ''} onChange={(e) => set({ closedMessage: e.target.value })} />
            <label className="lbl">Password protection</label>
            <input value={s.password || ''} onChange={(e) => set({ password: e.target.value })} placeholder="Leave empty for no password" style={{ maxWidth: 260 }} />
            <label className="row" style={{ marginTop: 12 }}><input type="checkbox" checked={!!s.saveAndContinue} onChange={(e) => set({ saveAndContinue: e.target.checked })} /> Allow "Save and continue later" (multi-page forms)</label>
            <label className="row" style={{ marginTop: 6 }}><input type="checkbox" checked={!!s.oneSubmissionPerUser} onChange={(e) => set({ oneSubmissionPerUser: e.target.checked })} /> One submission per user (by IP address)</label>
            <label className="row" style={{ marginTop: 6 }}><input type="checkbox" checked={s.showProgress !== false} onChange={(e) => set({ showProgress: e.target.checked })} /> Show progress bar</label>
            <p className="hint" style={{ marginTop: 16 }}>Enable/disable the form from My Forms → More.</p>
          </>
        )}
        {sec === 'thankyou' && (
          <>
            <h2>Thank You Page</h2>
            <label className="lbl">Message after submission</label>
            <textarea rows={5} value={s.thankYou?.message || ''} onChange={(e) => setIn('thankYou', { message: e.target.value })} />
            <label className="lbl">…or redirect to URL</label>
            <input value={s.thankYou?.redirect || ''} onChange={(e) => setIn('thankYou', { redirect: e.target.value })} placeholder="https://example.com/thanks" />
            <p className="hint">Conditions can override the message or redirect per answer (Conditions tab).</p>
          </>
        )}
        {sec === 'emails' && (
          <>
            <h2>Notification e-mail (to you)</h2>
            <label className="row"><input type="checkbox" checked={!!s.notify?.enabled} onChange={(e) => setIn('notify', { enabled: e.target.checked })} /> Send me an e-mail for every submission</label>
            <label className="row" style={{ marginTop: 6 }}><input type="checkbox" checked={!!s.notify?.attachPdf} onChange={(e) => setIn('notify', { attachPdf: e.target.checked })} /> Attach the submission PDF</label>
            <label className="lbl">Recipient(s)</label>
            <input value={s.notify?.to || ''} onChange={(e) => setIn('notify', { to: e.target.value })} placeholder={me.user.email} />
            <label className="lbl">Subject</label>
            <input value={s.notify?.subject || ''} onChange={(e) => setIn('notify', { subject: e.target.value })} />
            <Tokens />
            <h2 style={{ marginTop: 24 }}>Autoresponder (to the respondent)</h2>
            <label className="row"><input type="checkbox" checked={!!s.autoresponder?.enabled} onChange={(e) => setIn('autoresponder', { enabled: e.target.checked })} /> Send a confirmation e-mail</label>
            <label className="row" style={{ marginTop: 6 }}><input type="checkbox" checked={!!s.autoresponder?.attachPdf} onChange={(e) => setIn('autoresponder', { attachPdf: e.target.checked })} /> Attach a PDF copy of their answers</label>
            <label className="lbl">Send to the address in</label>
            <select value={s.autoresponder?.emailField || ''} onChange={(e) => setIn('autoresponder', { emailField: e.target.value })}>
              <option value="">— choose an Email field —</option>
              {emailFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
            <label className="lbl">Subject</label>
            <input value={s.autoresponder?.subject || ''} onChange={(e) => setIn('autoresponder', { subject: e.target.value })} />
            <label className="lbl">Body</label>
            <textarea rows={7} value={s.autoresponder?.body || ''} onChange={(e) => setIn('autoresponder', { body: e.target.value })} />
            <Tokens />
            <p className="hint">{me.email ? 'E-mails are delivered via your SMTP server and logged in the ' : 'SMTP is not configured: e-mails are only recorded in the '}<a href="#/account/outbox">Outbox</a>.{!me.email && <> Set <code>SMTP_HOST</code>, <code>SMTP_USER</code>, <code>SMTP_PASS</code> and <code>SMTP_FROM</code> in <code>.env</code> to send them.</>}</p>
          </>
        )}
        {sec === 'approvals' && (
          <>
            <h2>Approval workflow</h2>
            <label className="row"><input type="checkbox" checked={!!s.approvals?.enabled} onChange={(e) => setIn('approvals', { enabled: e.target.checked })} /> Require approval for each submission</label>
            <label className="lbl">Approvers (comma-separated e-mails)</label>
            <input value={s.approvals?.approvers || ''} onChange={(e) => setIn('approvals', { approvers: e.target.value })} placeholder={me.user.email} />
            <p className="hint">Each approver gets a secure link to approve or reject without logging in. The respondent is notified of the decision. You can also decide from the Inbox.</p>
          </>
        )}
        {sec === 'payments' && (
          <>
            <h2>Payments</h2>
            <p>Add a <b>Product List</b> field in the builder to sell products, tickets or collect donations. Totals are always recalculated on the server.</p>
            <p>Gateway: {me.stripe ? <span className="pill green">Stripe Checkout (live keys from server .env)</span> : <span className="pill amber">Test mode — payments are simulated</span>}</p>
            {!me.stripe && <p className="hint">Set <code>STRIPE_SECRET_KEY</code> in <code>.env</code> and restart the server to accept real card payments.</p>}
            <p className="hint">Payment submissions this month: {me.usage.paymentsPerMonth} / {me.plan.paymentsPerMonth ?? '∞'}</p>
          </>
        )}
        {sec === 'pdf' && (
          <>
            <h2>PDF Document</h2>
            <p className="hint">Every submission can be downloaded as a designed PDF from the Inbox, and attached to e-mails (Emails section).</p>
            <label className="lbl">Document title</label>
            <input value={def.pdf?.title ?? '{form_title}'} onChange={(e) => setPdf({ title: e.target.value })} />
            <label className="lbl">Introduction text</label>
            <textarea rows={3} value={def.pdf?.intro || ''} onChange={(e) => setPdf({ intro: e.target.value })} placeholder="Shown above the answers" />
            <label className="lbl">Footer</label>
            <input value={def.pdf?.footer || ''} onChange={(e) => setPdf({ footer: e.target.value })} placeholder="e.g. Company Ltd - Confidential" />
            <div className="grid2">
              <div><label className="lbl">Accent color</label><input type="color" value={def.pdf?.color || def.theme?.primary || '#0a1551'} onChange={(e) => setPdf({ color: e.target.value })} /></div>
              <div><label className="lbl">Logo URL (PNG/JPG)</label><input value={def.pdf?.logo ?? def.theme?.logo ?? ''} onChange={(e) => setPdf({ logo: e.target.value })} /></div>
            </div>
            <label className="row" style={{ marginTop: 10 }}><input type="checkbox" checked={def.pdf?.includeMeta !== false} onChange={(e) => setPdf({ includeMeta: e.target.checked })} /> Show submission ID and date</label>
            <label className="row" style={{ marginTop: 6 }}><input type="checkbox" checked={!!def.pdf?.showEmpty} onChange={(e) => setPdf({ showEmpty: e.target.checked })} /> Include unanswered questions</label>
            <p className="hint">Placeholders: <code>{'{form_title}'}</code> <code>{'{submission_id}'}</code> <code>{'{date}'}</code></p>
          </>
        )}
        {sec === 'translations' && <Translations def={def} update={update} me={me} formId={formId} />}
        {sec === 'agent' && (
          <>
            <h2>AI Agent</h2>
            <p className="hint">Respondents can fill the form by chatting with an AI assistant instead of clicking through fields. Answers are validated exactly like the regular form. File uploads, signatures and payments are finished in the form.</p>
            {!me.ai && <p className="error">Set <code>ANTHROPIC_API_KEY</code> in <code>.env</code> and restart the server to use the AI agent.</p>}
            <label className="row"><input type="checkbox" checked={!!s.agent?.enabled} onChange={(e) => setIn('agent', { enabled: e.target.checked })} /> Offer "Chat with AI" on this form</label>
            <label className="lbl">Personality / instructions</label>
            <textarea rows={3} value={s.agent?.persona || ''} onChange={(e) => setIn('agent', { persona: e.target.value })} placeholder="friendly and concise; speak like a hotel concierge" />
            <p className="hint">Link straight to chat mode: <code>/f/&lt;form id&gt;?mode=chat</code></p>
          </>
        )}
        {sec === 'integrations' && (
          <>
            <h2>Integrations</h2>
            {[['slack', 'Slack', 'Incoming webhook URL (https://hooks.slack.com/services/...)'], ['discord', 'Discord', 'Channel webhook URL (https://discord.com/api/webhooks/...)'], ['sheets', 'Google Sheets', 'Apps Script web app URL (https://script.google.com/macros/s/.../exec)']].map(([k, name, ph]) => (
              <div key={k} className="panel" style={{ padding: 12 }}>
                <label className="row"><input type="checkbox" checked={!!s.integrations?.[k]?.enabled} onChange={(e) => setInteg(k, { enabled: e.target.checked })} /> <b>{name}</b></label>
                <input style={{ marginTop: 6 }} value={s.integrations?.[k]?.url || ''} placeholder={ph} onChange={(e) => setInteg(k, { url: e.target.value })} />
                {k === 'sheets' && (
                  <details style={{ marginTop: 6 }}>
                    <summary className="hint">Setup: paste this script in your Sheet (Extensions → Apps Script), then Deploy → Web app (access: anyone)</summary>
                    <pre>{SHEETS_SCRIPT}</pre>
                  </details>
                )}
              </div>
            ))}
            <h3 style={{ marginTop: 16 }}>Webhooks</h3>
            <p className="hint">Each submission is POSTed as JSON to these URLs (Zapier, Make, n8n, your own API...).</p>
            {(s.webhooks || []).map((u, i) => (
              <div className="opt-row" key={i}>
                <input value={u} onChange={(e) => set({ webhooks: s.webhooks.map((x, j) => (j === i ? e.target.value : x)) })} />
                <button className="small danger" onClick={() => set({ webhooks: s.webhooks.filter((_, j) => j !== i) })}>✕</button>
              </div>
            ))}
            <button className="small" onClick={() => set({ webhooks: [...(s.webhooks || []), 'https://'] })}>+ Add webhook</button>
            <pre style={{ marginTop: 16 }}>{'POST <your url>\n{\n  "event": "submission.created",\n  "formId": "...", "formTitle": "...", "submissionId": 12,\n  "data": { "<fieldId>": <value>, ... },\n  "payment": { "status": "paid", "amount": 62, "currency": "USD" } | null\n}'}</pre>
          </>
        )}
      </div>
    </div>
  );
}
