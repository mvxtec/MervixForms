// Settings → Emails (notifications & autoresponders, each with a rich editor) and Settings → Notifications.
import { useState } from 'react';
import { isDisplay } from '@shared/fields.js';
import { formEmails, newEmail } from '@shared/emails.js';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';
import RichText from '../components/RichText.jsx';

function EmailEditor({ def, email, set, onBack, formId, me }) {
  const [adv, setAdv] = useState(false);
  const [msg, setMsg] = useState('');
  const fields = def.fields.filter((f) => !isDisplay(f));
  const emailFields = def.fields.filter((f) => f.type === 'email' || (f.type === 'widget' && /email/i.test(f.widget || '')));
  const test = async () => {
    setMsg('Sending…');
    try { const r = await api(`/forms/${formId}/test-email`, { method: 'POST', body: { email, definition: def } }); setMsg(`Test sent to ${r.to}${me.email ? '' : ' (recorded in the Outbox — SMTP is not configured)'}.`); } catch (e) { setMsg(e.message); }
  };
  return (
    <div className="settings-pane">
      <div className="settings-title">
        <button className="icon-btn ghost" aria-label="Back to e-mails" onClick={onBack}><Icon name="back" /></button>
        <span className="settings-icon" style={{ background: '#ea580c' }}><Icon name="inbox" /></span>
        <div className="grow">
          <input className="title-input" aria-label="E-mail name" value={email.name} onChange={(e) => set({ name: e.target.value })} />
          <p>{email.kind === 'autoresponder' ? 'Send a confirmation to the person who filled out your form' : 'Receive an e-mail when someone fills out your form'}</p>
        </div>
      </div>
      <div className="panel email-meta">
        <div className="meta-row">
          <span>Recipients</span>
          {email.kind === 'autoresponder' ? (
            <select aria-label="Recipient field" value={email.toField || ''} onChange={(e) => set({ toField: e.target.value })}>
              <option value="">Choose the respondent's e-mail field</option>
              {emailFields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
            </select>
          ) : <input aria-label="Recipients" value={email.to || ''} placeholder={me.user.email} onChange={(e) => set({ to: e.target.value })} />}
        </div>
        <div className="meta-row">
          <span>Subject</span>
          <input aria-label="Subject" value={email.subject || ''} onChange={(e) => set({ subject: e.target.value })} />
          <select aria-label="Insert field into subject" value="" onChange={(e) => e.target.value && set({ subject: `${email.subject || ''} {${e.target.value}}` })} style={{ maxWidth: 120 }}>
            <option value="">Fields ▾</option><option value="form_title">Form title</option>{fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </div>
        <RichText label="E-mail body" value={email.body} onChange={(body) => set({ body })} fields={fields} minHeight={320} />
        {adv && (
          <div className="grid2" style={{ marginTop: 12 }}>
            <div><label className="lbl">Sender name</label><input value={email.senderName || ''} placeholder="WpForms" onChange={(e) => set({ senderName: e.target.value })} /></div>
            <div>
              <label className="lbl">Reply-to</label>
              <select value={email.replyTo || ''} onChange={(e) => set({ replyTo: e.target.value })}>
                <option value="">Default</option>
                {emailFields.map((f) => <option key={f.id} value={`{${f.id}}`}>Respondent: {f.label}</option>)}
                {email.replyTo && !email.replyTo.startsWith('{') && <option value={email.replyTo}>{email.replyTo}</option>}
              </select>
            </div>
          </div>
        )}
      </div>
      <div className="row wrap">
        <label className="row"><input type="checkbox" checked={!!email.attachPdf} onChange={(e) => set({ attachPdf: e.target.checked })} /> Attach submission PDF</label>
        <button className="small" onClick={() => setAdv(!adv)} aria-expanded={adv}><Icon name="logic" size={14} />Advanced</button>
        <span className="right" />
        <button onClick={test}><Icon name="external" size={14} />Test e-mail</button>
        <button className="accent" onClick={onBack}><Icon name="check" size={14} />Save</button>
      </div>
      {msg && <p className="hint" role="status">{msg}</p>}
    </div>
  );
}

export function Emails({ def, update, formId, me }) {
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(false);
  const emails = formEmails(def.settings);
  const setEmails = (fn) => update((d) => ({ ...d, settings: { ...d.settings, emails: fn(formEmails(d.settings)) } }));
  const setEmail = (id, patch) => setEmails((list) => list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const cur = emails.find((e) => e.id === editing);
  if (cur) return <EmailEditor def={def} email={cur} set={(p) => setEmail(cur.id, p)} onBack={() => setEditing(null)} formId={formId} me={me} />;
  const add = (kind) => {
    const e = newEmail(kind);
    e.name = `${kind === 'autoresponder' ? 'Autoresponder' : 'Notification'} ${emails.filter((x) => x.kind === e.kind).length + 1}`;
    if (kind === 'autoresponder') e.toField = def.fields.find((f) => f.type === 'email')?.id || '';
    setEmails((list) => [...list, e]); setAdding(false); setEditing(e.id);
  };
  return (
    <div className="settings-pane">
      <div className="settings-title">
        <span className="settings-icon" style={{ background: '#2563eb' }}><Icon name="inbox" /></span>
        <div><h2>Emails</h2><p>Send autoresponders and notifications</p></div>
      </div>
      {adding ? (
        <div className="grid2">
          <button className="type-card" onClick={() => add('notification')}><span className="grow" style={{ textAlign: 'left' }}><b>Notification e-mail</b><span className="hint" style={{ display: 'block' }}>Get an e-mail when someone submits</span></span></button>
          <button className="type-card" onClick={() => add('autoresponder')}><span className="grow" style={{ textAlign: 'left' }}><b>Autoresponder e-mail</b><span className="hint" style={{ display: 'block' }}>Send a confirmation to the respondent</span></span></button>
        </div>
      ) : <button className="add-bar" onClick={() => setAdding(true)}><Icon name="plus" />Add e-mail</button>}
      <div className="stack">
        {emails.map((e, i) => (
          <article key={e.id} className={`email-card ${e.enabled ? '' : 'off'}`}>
            <div className="row">
              <span className="settings-icon small" style={{ background: e.kind === 'autoresponder' ? '#0f766e' : '#ea580c' }}><Icon name="inbox" size={15} /></span>
              <b className="grow">{e.name}</b>
              <label className="row hint"><input type="checkbox" checked={!!e.enabled} onChange={(ev) => setEmail(e.id, { enabled: ev.target.checked })} /> On</label>
              <button className="small" style={{ background: '#ea580c', color: '#fff', borderColor: '#ea580c' }} onClick={() => setEditing(e.id)}>Edit</button>
              <button className="icon-btn small" aria-label={`Duplicate ${e.name}`} title="Duplicate" onClick={() => setEmails((l) => [...l.slice(0, i + 1), { ...structuredClone(e), id: newEmail(e.kind).id, name: `${e.name} (copy)` }, ...l.slice(i + 1)])}><Icon name="copy" size={14} /></button>
              <button className="icon-btn small danger" aria-label={`Delete ${e.name}`} title="Delete" onClick={() => confirm(`Delete ${e.name}?`) && setEmails((l) => l.filter((x) => x.id !== e.id))}><Icon name="trash" size={14} /></button>
            </div>
            <div className="hint" style={{ marginTop: 8 }}>From: {e.senderName || 'WpForms'}</div>
            <div className="row wrap hint" style={{ marginTop: 4 }}>To: {e.kind === 'autoresponder'
              ? <span className="wg-chip" style={{ fontSize: 12 }}>{def.fields.find((f) => f.id === e.toField)?.label || 'No e-mail field chosen'}</span>
              : (e.to || me.user.email).split(',').map((x) => <span key={x} className="wg-chip" style={{ fontSize: 12 }}>{x.trim()}</span>)}</div>
          </article>
        ))}
        {!emails.length && <p className="hint">No e-mails yet. Add a notification to hear about new submissions.</p>}
      </div>
      <p className="hint">{me.email ? 'E-mails go out through your SMTP server and are logged in the ' : 'SMTP is not configured, so e-mails are only recorded in the '}<a href="#/account/outbox">Outbox</a>.</p>
    </div>
  );
}

export function Notifications({ def, update }) {
  const s = def.settings || {};
  const nt = s.notifications || {};
  const setNt = (k, patch) => update((d) => ({ ...d, settings: { ...d.settings, notifications: { ...(d.settings?.notifications || {}), [k]: { ...(d.settings?.notifications?.[k] || {}), ...patch } } } }));
  const setInteg = (k, patch) => update((d) => ({ ...d, settings: { ...d.settings, integrations: { ...(d.settings?.integrations || {}), [k]: { ...(d.settings?.integrations?.[k] || {}), ...patch } } } }));
  const cards = [
    { key: 'sms', title: 'SMS / Text Message', desc: 'Receive text messages for new submissions', value: nt.sms, set: (p) => setNt('sms', p), field: ['to', 'Phone numbers (comma-separated, with country code)', '+91 98765 43210'], env: 'Needs TWILIO_SID, TWILIO_TOKEN and TWILIO_FROM in .env' },
    { key: 'whatsapp', title: 'WhatsApp', desc: 'Receive submissions as WhatsApp messages', value: nt.whatsapp, set: (p) => setNt('whatsapp', p), field: ['to', 'WhatsApp numbers (comma-separated, with country code)', '+91 98765 43210'], env: 'Needs WHATSAPP_TOKEN and WHATSAPP_PHONE_ID (Meta WhatsApp Cloud API) in .env' },
    { key: 'push', title: 'Push Notification', desc: 'Alerts on your device instantly', soon: true },
    { key: 'slack', title: 'Slack', desc: 'Send new submission alerts to Slack channels', value: s.integrations?.slack, set: (p) => setInteg('slack', p), field: ['url', 'Incoming webhook URL', 'https://hooks.slack.com/services/…'] },
    { key: 'teams', title: 'Microsoft Teams', desc: 'Send alerts to Microsoft Teams channels', value: nt.teams, set: (p) => setNt('teams', p), field: ['url', 'Incoming webhook / Workflows URL', 'https://…'] },
    { key: 'discord', title: 'Discord', desc: 'Post new submissions to a Discord channel', value: s.integrations?.discord, set: (p) => setInteg('discord', p), field: ['url', 'Channel webhook URL', 'https://discord.com/api/webhooks/…'] },
  ];
  return (
    <div className="settings-pane">
      <div className="settings-title">
        <span className="settings-icon" style={{ background: '#7c3aed' }}><Icon name="inbox" /></span>
        <div><h2>Notifications</h2><p>Receive instant notifications when your form is submitted</p></div>
      </div>
      <div className="stack">
        {cards.map((c) => (
          <article key={c.key} className={`panel notif-card ${c.soon ? 'off' : ''}`}>
            <div className="row">
              <div className="grow"><b>{c.title}</b><div className="hint">{c.desc}</div></div>
              {c.soon ? <span className="pill">Coming soon</span> : (
                <button role="switch" aria-checked={!!c.value?.enabled} aria-label={`${c.title} notifications`} className={`wg-switch ${c.value?.enabled ? 'on' : ''}`} onClick={() => c.set({ enabled: !c.value?.enabled })}>
                  <span className="wg-knob" aria-hidden="true" />{c.value?.enabled ? 'On' : 'Off'}
                </button>
              )}
            </div>
            {c.value?.enabled && c.field && (
              <>
                <label className="lbl">{c.field[1]}</label>
                <input value={c.value?.[c.field[0]] || ''} placeholder={c.field[2]} onChange={(e) => c.set({ [c.field[0]]: e.target.value })} />
                {c.env && <p className="hint" style={{ marginBottom: 0 }}>{c.env}. Messages are logged in the Outbox either way.</p>}
              </>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
