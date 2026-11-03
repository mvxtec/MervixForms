import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { useMe } from '../App.jsx';
import Builder from './Builder.jsx';
import WorkflowsPane from './Workflows.jsx';
import SettingsPanel from './SettingsPanel.jsx';
import Publish from './Publish.jsx';
import Inbox from './Inbox.jsx';
import Reports from './Reports.jsx';
import Versions from './Versions.jsx';
import FormRenderer from '../components/FormRenderer.jsx';
import Icon from '../components/Icon.jsx';

const TABS = [['build', 'Build'], ['settings', 'Settings'], ['publish', 'Publish'], ['inbox', 'Inbox'], ['reports', 'Reports'], ['history', 'History']];

export default function FormWorkspace({ id, tab, sid }) {
  const me = useMe();
  const [form, setForm] = useState(null);
  const [def, setDef] = useState(null);
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | saving | error
  const [saveError, setSaveError] = useState('');
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState({ past: [], future: [] });
  const timer = useRef(null);
  const latest = useRef(null);

  const loadForm = () => api(`/forms/${id}`).then((f) => { setForm(f); setDef(f.definition); latest.current = f.definition; setHistory({ past: [], future: [] }); }).catch(() => navigate('/'));
  useEffect(() => { loadForm(); }, [id]);
  // Conditions moved into Settings; keep old links working.
  useEffect(() => { if (tab === 'logic') navigate(`/forms/${id}/settings/conditions`); }, [tab]);

  const save = useCallback(async () => {
    clearTimeout(timer.current);
    if (!latest.current) return;
    setSaveState('saving');
    try {
      await api(`/forms/${id}`, { method: 'PUT', body: { definition: latest.current } });
      setSaveState('saved'); setSaveError('');
    } catch (e) { setSaveState('error'); setSaveError(e.message); }
  }, [id]);

  const apply = useCallback((next) => {
    latest.current = next;
    setDef(next);
    setSaveState('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(save, 1200);
  }, [save]);

  // All edits go through update(): keeps undo history and autosaves after a short pause.
  const update = useCallback((fn) => {
    const prev = latest.current;
    const next = typeof fn === 'function' ? fn(prev) : fn;
    setHistory((h) => ({ past: [...h.past.slice(-50), prev], future: [] }));
    apply(next);
  }, [apply]);

  const undo = () => {
    if (!history.past.length) return;
    setHistory({ past: history.past.slice(0, -1), future: [latest.current, ...history.future] });
    apply(history.past[history.past.length - 1]);
  };
  const redo = () => {
    if (!history.future.length) return;
    setHistory({ past: [...history.past, latest.current], future: history.future.slice(1) });
    apply(history.future[0]);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 's') { e.preventDefault(); save(); }
      if (e.key === 'z' && !e.shiftKey && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { e.preventDefault(); undo(); }
    };
    const onLeave = (e) => { if (saveState === 'dirty' || saveState === 'saving') { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onLeave);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('beforeunload', onLeave); };
  });

  if (!form || !def) return <div className="page muted">Loading…</div>;
  const isEditorTab = ['build', 'logic', 'settings', 'publish'].includes(tab);

  return (
    <div className={`fw-page ${tab === 'build' ? 'fill' : ''}`}>
      <header className="fw-head">
        <div className="fw-title">
          <a href="#/" className="btn icon-btn" aria-label="Back to forms"><Icon name="back" /></a>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
            <input value={def.title} aria-label="Form title" onChange={(e) => update((d) => ({ ...d, title: e.target.value }))} />
            <span className={`fw-status ${saveState === 'error' ? 'error' : ''}`} title={saveError} role="status">
              <span className={`dot ${saveState === 'error' ? 'err' : saveState === 'saved' ? '' : 'warn'}`} />
              {{ saved: 'All changes saved', dirty: 'Unsaved changes', saving: 'Saving…', error: `Save failed: ${saveError}` }[saveState]}
              {form.status !== 'enabled' && <span className="pill amber" style={{ marginLeft: 4 }}>{form.status}</span>}
            </span>
          </div>
        </div>
        <nav className="seg" aria-label="Form sections">
          {TABS.map(([k, l]) => (
            <a key={k} href={`#/forms/${id}/${k}`} className={tab === k ? 'on' : ''} aria-current={tab === k ? 'page' : undefined}>
              {l}
              {k === 'inbox' && form.unread > 0 && <span className="badge">{form.unread}</span>}
            </a>
          ))}
        </nav>
        <div className="fw-actions">
          {isEditorTab && (
            <>
              <button className="icon-btn" onClick={undo} disabled={!history.past.length} aria-label="Undo" title="Undo"><Icon name="undo" /></button>
              <button className="icon-btn" onClick={redo} disabled={!history.future.length} aria-label="Redo" title="Redo"><Icon name="redo" /></button>
              <button onClick={() => setPreview(true)}><Icon name="eye" />Preview</button>
            </>
          )}
          <a className="btn primary" href={`/f/${id}`} target="_blank" rel="noreferrer">Open form<Icon name="external" size={14} /></a>
        </div>
      </header>
      {tab === 'build' && <Builder def={def} update={update} plan={me.plan} />}
      {tab === 'settings' && (
        <SettingsPanel def={def} update={update} me={me} formId={id} form={form} section={sid || 'form'}
          onStatus={async (status) => { await api(`/forms/${id}`, { method: 'PATCH', body: { status } }); setForm((f) => ({ ...f, status })); }}
          workflowsPane={<WorkflowsPane formId={id} def={def} update={update} me={me} />} />
      )}
      {tab === 'publish' && <div className="page"><Publish id={id} def={def} /></div>}
      {tab === 'inbox' && <Inbox form={{ ...form, definition: def }} sid={sid} />}
      {tab === 'reports' && <div className="page"><Reports form={{ ...form, definition: def }} /></div>}
      {tab === 'history' && <div className="page"><Versions id={id} def={def} onRestored={() => { loadForm(); setSaveState('saved'); navigate(`/forms/${id}/build`); }} /></div>}
      {preview && (
        <div className="modal-back" onClick={() => setPreview(false)}>
          <div className="modal wide" style={{ padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
              <b>Preview</b><span className="hint">Logic, validation and calculations are live. Nothing is submitted.</span>
              <button className="right icon-btn ghost" onClick={() => setPreview(false)} aria-label="Close preview"><Icon name="close" size={14} /></button>
            </div>
            <FormRenderer key={JSON.stringify(def).length} def={def} formId={id} mode="preview" branding={me.plan.branding} />
          </div>
        </div>
      )}
    </div>
  );
}
