import { useMemo, useState } from 'react';
import { computeState, buildPages, validateField } from '@shared/logic.js';
import { isDisplay, isInput } from '@shared/fields.js';
import { FieldInput, DisplayBlock } from './Fields.jsx';
import { api } from '../api.js';

export function themeStyle(theme = {}) {
  return {
    '--f-primary': theme.primary || '#0f766e',
    '--f-bg': theme.background || '#f0f4f3',
    '--f-text': theme.text || '#18181b',
    '--f-field': theme.fieldBg || '#fff',
    '--f-width': `${theme.width || 720}px`,
    fontFamily: theme.font && theme.font !== 'System' ? `${theme.font}, system-ui, sans-serif` : undefined,
  };
}

function initialValues(def, initial) {
  const params = new URLSearchParams(window.location.search);
  const v = { ...initial };
  for (const f of def.fields || []) {
    if (v[f.id] !== undefined) continue;
    if (f.type === 'hidden') v[f.id] = (f.fromUrl && params.get(f.fromUrl)) || f.defaultValue || '';
    else if (params.has(f.id) && isInput(f)) v[f.id] = params.get(f.id); // URL prefill: ?fieldId=value
  }
  return v;
}

/**
 * Renders a form definition with logic, pagination, validation and submission.
 * mode: 'live' (published form) | 'preview' (builder preview, submissions are not sent)
 */
export default function FormRenderer({ def, formId, mode = 'live', branding, initial, draftToken: initialDraft, password }) {
  const [raw, setRaw] = useState(() => initialValues(def, initial || {}));
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(0);
  const [history, setHistory] = useState([]);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [draft, setDraft] = useState({ token: initialDraft, url: '' });

  const state = useMemo(() => computeState(def, raw), [def, raw]);
  const allPages = useMemo(() => buildPages(def), [def]);
  const visibleOn = (p) => (allPages[p] || []).filter((f) => !state.hidden.has(f.id));
  const isCard = def.layout === 'card';
  const settings = def.settings || {};

  const set = (id, v) => {
    setRaw((r) => ({ ...r, [id]: v }));
    if (errors[id]) setErrors((e) => { const n = { ...e }; delete n[id]; return n; });
  };

  const validatePage = (p) => {
    const errs = {};
    for (const f of visibleOn(p)) {
      const e = validateField(f, state.values[f.id], state);
      if (e) errs[f.id] = e;
    }
    setErrors(errs);
    return !Object.keys(errs).length;
  };

  // Next page, honouring skip-to rules triggered by fields on this page and skipping empty pages.
  const nextIndex = (p) => {
    const ids = new Set((allPages[p] || []).map((f) => f.id));
    const skip = state.skips.find((s) => s.from.some((id) => ids.has(id)));
    if (skip) {
      if (skip.target === 'end') return allPages.length;
      const idx = allPages.findIndex((pg) => pg.some((f) => f.id === skip.target)) ;
      const breakIdx = (def.fields || []).filter((f) => f.type === 'pagebreak').findIndex((f) => f.id === skip.target);
      const target = idx >= 0 ? idx : breakIdx >= 0 ? breakIdx + 1 : -1;
      if (target > p) return target;
    }
    let n = p + 1;
    while (n < allPages.length && !visibleOn(n).length) n++;
    return n;
  };

  const lastPage = (() => { let n = nextIndex(page); return n >= allPages.length; })();

  const submit = async () => {
    setFormError('');
    if (mode !== 'live') {
      setDone({ thankYou: state.thankYou || settings.thankYou?.message || 'Thank you!', preview: true });
      return;
    }
    setBusy(true);
    try {
      const res = await api(`/public/forms/${formId}/submit`, { method: 'POST', body: { values: raw, password, draftToken: draft.token } });
      if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
      if (res.redirect) { window.top.location.href = res.redirect; return; }
      setDone(res);
    } catch (e) {
      setFormError(e.message);
      if (e.body?.errors) {
        setErrors(e.body.errors);
        const first = allPages.findIndex((pg) => pg.some((f) => e.body.errors[f.id]));
        if (first >= 0) setPage(first);
      }
    }
    setBusy(false);
  };

  const next = () => {
    if (!validatePage(page)) return;
    if (lastPage) return submit();
    setHistory((h) => [...h, page]);
    setPage(nextIndex(page));
    window.scrollTo?.(0, 0);
  };
  const back = () => { setErrors({}); setPage(history[history.length - 1] ?? 0); setHistory((h) => h.slice(0, -1)); };

  const saveDraft = async () => {
    if (mode !== 'live') return;
    const r = await api(`/public/forms/${formId}/draft`, { method: 'POST', body: { token: draft.token, values: raw } });
    setDraft(r);
  };

  const theme = def.theme || {};
  const progress = allPages.length > 1 ? Math.round((page / allPages.length) * 100) : 0;

  return (
    <div className={`wf ${isCard ? 'wf-card-mode' : ''}`} style={themeStyle(theme)}>
      {theme.css && <style>{theme.css}</style>}
      <div className={`wf-card ${isCard ? '' : 'has-cover'}`}>
        {!isCard && <div className="wf-cover" aria-hidden="true" />}
        {theme.logo && <img className="wf-logo" src={theme.logo} alt="" />}
        {done ? (
          <div className="wf-thanks" role="status">
            <div className="wf-check"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: 18, lineHeight: 1.5 }}>{done.thankYou}</div>
            {done.preview && <p className="hint">(Preview — nothing was submitted.)</p>}
            {mode !== 'live' && <button className="wf-btn secondary" style={{ marginTop: 16 }} onClick={() => { setDone(null); setPage(0); setHistory([]); setRaw(initialValues(def, {})); }}>Restart preview</button>}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
            {settings.showProgress !== false && allPages.length > 1 && <div className="wf-progress"><div style={{ width: `${progress}%` }} /></div>}
            {visibleOn(page).map((f) => (
              <div key={f.id} className={`wf-field ${errors[f.id] ? 'has-err' : ''}`} id={`field-${f.id}`}>
                {isDisplay(f) ? <DisplayBlock f={f} /> : f.type === 'hidden' ? null : (
                  <>
                    {f.type !== 'terms' && <label className="wf-label">{f.label}{state.required.has(f.id) && <span className="wf-req">*</span>}</label>}
                    <FieldInput f={f} value={raw[f.id]} computed={state.values[f.id]} onChange={(v) => set(f.id, v)} formId={formId} mode={mode} />
                    {f.description && <div className="wf-desc">{f.description}</div>}
                    {errors[f.id] && <div className="wf-err">{errors[f.id]}</div>}
                  </>
                )}
              </div>
            ))}
            {formError && <div className="error" style={{ marginBottom: 8 }}>{formError}</div>}
            <div className="wf-nav">
              <div>{history.length > 0 && <button type="button" className="wf-btn secondary" onClick={back}>Back</button>}</div>
              <div className="row">
                {settings.saveAndContinue && mode === 'live' && allPages.length > 1 && <button type="button" className="link small" onClick={saveDraft}>Save and continue later</button>}
                <button className="wf-btn" disabled={busy}>{busy ? 'Submitting…' : lastPage ? (settings.submitLabel || 'Submit') : 'Next'}</button>
              </div>
            </div>
            {draft.url && <div className="hint" style={{ marginTop: 8 }}>Draft saved. Resume with this link: <a href={draft.url}>{draft.url}</a></div>}
          </form>
        )}
      </div>
      {branding && <div className="wf-branding"><span>Made with <b style={{ color: '#18181b' }}>WpForms</b> · Create your own free form</span></div>}
    </div>
  );
}
