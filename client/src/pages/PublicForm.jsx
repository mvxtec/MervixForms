import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { applyTranslation } from '@shared/i18n.js';
import FormRenderer, { themeStyle } from '../components/FormRenderer.jsx';
import ChatAgent from '../components/ChatAgent.jsx';
import { safeRedirect } from '@shared/urls.js';

export default function PublicForm({ formId, embed }) {
  const params = new URLSearchParams(window.location.search);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [draft, setDraft] = useState(null);
  const [lang, setLang] = useState(params.get('lang') || '');
  const [mode, setMode] = useState(params.get('mode') === 'chat' ? 'chat' : 'form');
  const [prefill, setPrefill] = useState(null);
  const [chatDone, setChatDone] = useState(null);

  const load = (pw) => {
    const q = new URLSearchParams();
    if (params.get('preview')) q.set('preview', '1');
    // The password goes in a header so it never appears in URLs, logs or browser history.
    api(`/public/forms/${formId}?${q}`, { headers: pw ? { 'X-Form-Password': pw } : undefined }).then((d) => { setData(d); document.title = d.title; }).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
    const token = params.get('draft');
    if (token) api(`/public/drafts/${token}`).then((d) => setDraft({ token, values: d.values })).catch(() => setDraft({}));
    else setDraft({});
  }, [formId]);

  const def = useMemo(() => (data?.definition ? applyTranslation(data.definition, lang) : null), [data, lang]);

  const shell = (children) => (
    <div className="wf" style={{ ...themeStyle(data?.definition?.theme), minHeight: '100vh' }}><div className="wf-card">{children}</div></div>
  );

  if (error) return shell(<p className="error">{error}</p>);
  if (!data || !draft) return shell(<p className="muted">Loading…</p>);
  if (params.get('done')) return shell(<div className="wf-thanks"><div className="wf-check" aria-hidden="true">✓</div><p>Payment received. Thank you!</p></div>);
  if (data.passwordRequired) {
    return shell(
      <form onSubmit={(e) => { e.preventDefault(); load(password); }}>
        <h2>{data.title}</h2>
        <p>This form is password protected.</p>
        {data.wrongPassword && <p className="error">Incorrect password.</p>}
        <div className="row"><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" /><button className="wf-btn">Open</button></div>
      </form>,
    );
  }
  if (data.closed) return shell(<div className="wf-thanks"><h2>{data.title}</h2><p>{data.closed}</p></div>);

  const translations = data.definition.translations || [];
  const agent = data.definition.settings?.agent?.enabled;
  const toolbar = (translations.length > 0 || agent) && (
    <div className="wf-lang">
      {agent && (
        <div className="wf-seg">
          <button type="button" className={mode === 'form' ? 'on' : ''} onClick={() => setMode('form')}>Form</button>
          <button type="button" className={mode === 'chat' ? 'on' : ''} onClick={() => setMode('chat')}>Chat with AI</button>
        </div>
      )}
      {translations.length > 0 && (
        <select style={{ width: 'auto' }} value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
          <option value="">{data.definition.languageName || 'English'}</option>
          {translations.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
        </select>
      )}
    </div>
  );

  return (
    <div style={{ minHeight: embed ? undefined : '100vh', background: data.definition.theme?.background }}>
      {params.get('payment') === 'cancelled' && <div className="panel" style={{ maxWidth: 720, margin: '12px auto' }}>Payment was cancelled. Your submission was not completed.</div>}
      {mode === 'chat' && agent ? (
        <div className="wf" style={themeStyle(data.definition.theme)}>
          {toolbar}
          <div className="wf-card">
            <h2 style={{ marginTop: 0 }}>{def.title}</h2>
            {chatDone ? (
              <div className="wf-thanks"><div className="wf-check" aria-hidden="true">✓</div><div style={{ whiteSpace: 'pre-wrap' }}>{chatDone.thankYou}</div></div>
            ) : (
              <ChatAgent def={def} formId={formId} password={password}
                onDone={(res) => (safeRedirect(res.redirect) ? (window.top.location.href = safeRedirect(res.redirect)) : setChatDone(res))}
                onSwitchToForm={(answers) => { setPrefill(answers); setMode('form'); }} />
            )}
          </div>
          {data.branding && <div className="wf-branding"><span>Made with <b>WpForms</b></span></div>}
        </div>
      ) : (
        <div className="wf" style={{ ...themeStyle(data.definition.theme), padding: toolbar ? '24px 12px 0' : 0, minHeight: 0 }}>
          {toolbar}
          <FormRenderer key={`${lang}-${prefill ? 'p' : ''}`} def={def} formId={formId} mode="live" branding={data.branding}
            initial={{ ...draft.values, ...prefill }} draftToken={draft.token} password={password} />
        </div>
      )}
    </div>
  );
}
