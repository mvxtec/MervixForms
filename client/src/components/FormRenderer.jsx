import { useEffect, useMemo, useRef, useState } from 'react';
import { computeState, buildPages, validateField } from '@shared/logic.js';
import { isDisplay, isInput, formatValue } from '@shared/fields.js';
import { sanitizeHtml, escapeHtml, looksLikeHtml } from '../sanitize.js';
import { widgetKind } from '@shared/widgets.js';
import { FieldInput, DisplayBlock } from './Fields.jsx';
import { api } from '../api.js';
import Icon from './Icon.jsx';
import { safeRedirect } from '@shared/urls.js';

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

// Condition effects that change how a field renders: replaced options, hidden products, input masks.
function withRuleEffects(f, state) {
  let out = f;
  if (state.options?.[f.id]) out = { ...out, options: state.options[f.id] };
  if (state.hiddenProducts?.[f.id] && f.products) out = { ...out, products: f.products.filter((p) => !state.hiddenProducts[f.id].has(p.id)) };
  if (state.masks?.[f.id]) out = { ...out, placeholder: state.masks[f.id] };
  return out;
}

// {fieldId} tokens in the thank-you message become the respondent's answers (escaped for HTML messages).
const answerOf = (def, values, id) => { const f = (def.fields || []).find((x) => x.id === id); return f ? formatValue(f, values[id]) : null; };
const fillTokens = (tpl, def, values) => String(tpl).replace(/\{form_title\}/g, escapeHtml(def.title)).replace(/\{([\w-]+)\}/g, (m, id) => { const v = answerOf(def, values, id); return v == null ? m : escapeHtml(v); });
const fillTokensText = (tpl, def, values) => String(tpl).replace(/\{form_title\}/g, def.title).replace(/\{([\w-]+)\}/g, (m, id) => answerOf(def, values, id) ?? m);

// Values for metadata widgets, captured when the form opens.
function metaValue(source) {
  switch (source) {
    case 'url': return window.location.href;
    case 'referrer': return document.referrer || '';
    case 'useragent': return navigator.userAgent;
    case 'timestamp': return new Date().toISOString();
    case 'random': return Math.random().toString(36).slice(2, 10).toUpperCase();
    default: return '';
  }
}

// Fields between a Section Collapse element and the next section or page break belong to that section.
function sectionOf(fields) {
  const out = {};
  let current = null;
  for (const f of fields) {
    if (f.type === 'section') current = f.id;
    else if (f.type === 'pagebreak') current = null;
    else if (current) out[f.id] = current;
  }
  return out;
}

function initialValues(def, initial) {
  const params = new URLSearchParams(window.location.search);
  const v = { ...initial };
  for (const f of def.fields || []) {
    if (v[f.id] !== undefined) continue;
    if (f.type === 'hidden') v[f.id] = (f.fromUrl && params.get(f.fromUrl)) || f.defaultValue || '';
    else if (f.type === 'widget' && widgetKind(f) === 'meta') v[f.id] = metaValue(f.source);
    else if (params.has(f.id) && isInput(f)) v[f.id] = params.get(f.id); // URL prefill: ?fieldId=value
  }
  return v;
}

/**
 * Renders a form definition with logic, pagination, validation and submission.
 * mode: 'live' (published form) | 'preview' (builder preview, submissions are not sent)
 */
const SINGLE_INPUT = new Set(['text', 'textarea', 'email', 'phone', 'url', 'number', 'date', 'time', 'dropdown']);

export default function FormRenderer({ def, formId, mode = 'live', branding, initial, draftToken: initialDraft, password }) {
  const [raw, setRaw] = useState(() => initialValues(def, initial || {}));
  const [errors, setErrors] = useState({});
  // After a failed attempt, focus moves to a summary of the problems (keyboard and screen-reader users).
  const [errorTick, setErrorTick] = useState(0);
  const summaryRef = useRef(null);
  useEffect(() => { if (errorTick) summaryRef.current?.focus(); }, [errorTick]);
  const [page, setPage] = useState(0);
  const [history, setHistory] = useState([]);
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [draft, setDraft] = useState({ token: initialDraft, url: '' });
  const [collapsed, setCollapsed] = useState(() => new Set((def.fields || []).filter((f) => f.type === 'section' && f.collapsed).map((f) => f.id)));
  const sections = useMemo(() => sectionOf(def.fields || []), [def]);
  const fieldCss = (def.fields || []).filter((f) => f.css).map((f) => f.css).join('\n');

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
    if (Object.keys(errs).length) setErrorTick((t) => t + 1);
    const open = Object.keys(errs).map((id) => sections[id]).filter(Boolean);
    if (open.length) setCollapsed((c) => new Set([...c].filter((id) => !open.includes(id))));
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
      if (safeRedirect(res.redirect)) { window.top.location.href = safeRedirect(res.redirect); return; }
      setDone(res);
    } catch (e) {
      setFormError(e.message);
      if (e.body?.errors) {
        setErrors(e.body.errors);
        setErrorTick((t) => t + 1);
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
    const r = await api(`/public/forms/${formId}/draft`, { method: 'POST', body: { token: draft.token, values: raw, password } });
    setDraft(r);
  };

  const theme = def.theme || {};
  const progress = allPages.length > 1 ? Math.round((page / allPages.length) * 100) : 0;

  return (
    <div className={`wf ${isCard ? 'wf-card-mode' : ''}`} style={themeStyle(theme)}>
      {theme.css && <style>{theme.css}</style>}
      {fieldCss && <style>{fieldCss}</style>}
      <div className={`wf-card ${isCard ? '' : 'has-cover'}`}>
        {!isCard && <div className="wf-cover" aria-hidden="true" />}
        {theme.logo && <img className="wf-logo" src={theme.logo} alt="" />}
        {done ? (
          <div className="wf-thanks" role="status">
            <div className="wf-check"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg></div>
            {looksLikeHtml(done.thankYou)
              ? <div className="wf-thanks-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(fillTokens(done.thankYou, def, state.values)) }} />
              : <div style={{ whiteSpace: 'pre-wrap', fontSize: 18, lineHeight: 1.5 }}>{fillTokensText(done.thankYou, def, state.values)}</div>}
            {done.preview && <p className="hint">(Preview — nothing was submitted.)</p>}
            {mode !== 'live' && <button className="wf-btn secondary" style={{ marginTop: 16 }} onClick={() => { setDone(null); setPage(0); setHistory([]); setRaw(initialValues(def, {})); }}>Restart preview</button>}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); next(); }} noValidate>
            {settings.showProgress !== false && allPages.length > 1 && <div className="wf-progress"><div style={{ width: `${progress}%` }} /></div>}
            {Object.keys(errors).length > 0 && (
              <div className="wf-error-summary" role="alert" tabIndex={-1} ref={summaryRef}>
                <b>{Object.keys(errors).length === 1 ? 'There is a problem' : `There are ${Object.keys(errors).length} problems`}</b>
                <ul>
                  {def.fields.filter((f) => errors[f.id]).map((f) => (
                    <li key={f.id}><a href={`#field-${f.id}`} onClick={(e) => { e.preventDefault(); const el = document.getElementById(`field-${f.id}`); el?.scrollIntoView({ block: 'center' }); el?.querySelector('input, select, textarea, button')?.focus(); }}>{f.label}: {errors[f.id]}</a></li>
                  ))}
                </ul>
              </div>
            )}
            {visibleOn(page).filter((f) => !collapsed.has(sections[f.id])).map((f) => (
              <div key={f.id} className={`wf-field ${errors[f.id] ? 'has-err' : ''}`} id={`field-${f.id}`}>
                {f.type === 'section' ? (
                  <button type="button" className="wg-section-toggle" aria-expanded={!collapsed.has(f.id)} onClick={() => setCollapsed((c) => { const n = new Set(c); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })}>
                    <Icon name={collapsed.has(f.id) ? 'right' : 'down'} size={14} />
                    <span><span style={{ display: 'block', fontWeight: 600, fontSize: 18 }}>{f.label}</span>{f.subheading && <span className="wf-desc" style={{ display: 'block' }}>{f.subheading}</span>}</span>
                  </button>
                ) : isDisplay(f) ? <DisplayBlock f={f} /> : f.type === 'hidden' ? null : (
                  <>
                    {(() => {
                      // Single inputs get a real <label for>; grouped fields (name, choices, products…) are named by their fieldset.
                      const single = SINGLE_INPUT.has(f.type);
                      const ids = { input: `f-${f.id}`, label: `l-${f.id}`, desc: `d-${f.id}`, err: `e-${f.id}` };
                      const describedBy = [f.description && ids.desc, errors[f.id] && ids.err].filter(Boolean).join(' ') || undefined;
                      const required = state.required.has(f.id);
                      const ax = { id: ids.input, 'aria-describedby': describedBy, 'aria-invalid': errors[f.id] ? true : undefined, 'aria-required': required || undefined };
                      const Label = single ? 'label' : 'div';
                      return (
                        <>
                          {f.type !== 'terms' && <Label className="wf-label" id={ids.label} htmlFor={single ? ids.input : undefined}>{f.label}{required && <span className="wf-req" aria-hidden="true">*</span>}{required && <span className="sr-only"> (required)</span>}</Label>}
                          <fieldset disabled={state.disabled?.has(f.id)} className="wf-fieldset" aria-labelledby={single || f.type === 'terms' ? undefined : ids.label} aria-describedby={single ? undefined : describedBy}>
                            <FieldInput f={withRuleEffects(f, state)} value={raw[f.id]} computed={state.values[f.id]} onChange={(v) => set(f.id, v)} formId={formId} mode={mode} ax={single ? ax : undefined} />
                          </fieldset>
                          {f.description && <div className="wf-desc" id={ids.desc}>{f.description}</div>}
                          {errors[f.id] && <div className="wf-err" id={ids.err}>{errors[f.id]}</div>}
                        </>
                      );
                    })()}
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
