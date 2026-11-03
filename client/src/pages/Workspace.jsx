import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { useMe } from '../App.jsx';
import Icon from '../components/Icon.jsx';

export function NewFormModal({ onClose, folder }) {
  const me = useMe();
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [json, setJson] = useState('');
  useEffect(() => { api('/templates').then(setTemplates); }, []);
  const create = async (body) => {
    setError('');
    try {
      const { id } = await api('/forms', { method: 'POST', body: { ...body, folder } });
      navigate(`/forms/${id}/build`);
    } catch (e) { setError(e.message); }
  };
  const createWithAi = async () => {
    setAiBusy(true); setError('');
    try {
      const { definition } = await api('/ai/form', { method: 'POST', body: { prompt: aiPrompt } });
      await create({ definition });
    } catch (e) { setError(e.message); }
    setAiBusy(false);
  };
  const importJson = () => {
    try { create({ definition: JSON.parse(json) }); } catch { setError('That is not valid form JSON.'); }
  };
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="new-form-h" onClick={(e) => e.stopPropagation()}>
        <div className="row" style={{ marginBottom: 8 }}><h2 id="new-form-h" style={{ margin: 0 }}>Create a form</h2><button className="right icon-btn ghost" onClick={onClose} aria-label="Close"><Icon name="close" size={14} /></button></div>
        {error && <p className="error">{error}</p>}
        <h3 style={{ marginTop: 16 }}>Start from scratch</h3>
        <div className="row wrap">
          <input style={{ flex: '1 1 240px' }} placeholder="Form title" aria-label="Form title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className="primary" onClick={() => create({ title: title || 'Untitled Form' })}>Blank classic form</button>
          <button onClick={() => create({ title: title || 'Untitled Card Form', definition: { title: title || 'Untitled Card Form', layout: 'card' } })}>Blank card form</button>
        </div>
        <h3 style={{ marginTop: 24 }} className="row"><Icon name="sparkles" size={18} style={{ color: 'var(--accent)' }} />Create with AI</h3>
        {me.ai ? (
          <div className="ai-row">
            <input placeholder="e.g. Admission form for Class 1 with parent details, documents upload and ₹500 fee" aria-label="Describe your form" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} />
            <button className="accent" disabled={aiBusy || aiPrompt.trim().length < 5} onClick={createWithAi}>{aiBusy ? 'Building…' : 'Generate draft'}</button>
          </div>
        ) : <p className="hint">Set <code>ANTHROPIC_API_KEY</code> in <code>.env</code> and restart the server to build forms from a description.</p>}
        <h3 style={{ marginTop: 24 }}>Use a template</h3>
        <div className="cards">
          {templates.map((t) => (
            <button key={t.id} className="card" onClick={() => create({ templateId: t.id })}>
              <div className="tpl-art" style={{ background: `${t.primary}1f` }}><span style={{ width: '60%', background: t.primary }} /><span style={{ width: '85%' }} /><span style={{ width: '40%' }} /></div>
              <b>{t.name}</b>
              <span className="hint">{t.category} · {t.fieldCount} fields · {t.layout}</span>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{t.description}</span>
            </button>
          ))}
        </div>
        <details style={{ marginTop: 24 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 500 }}>Import form from JSON</summary>
          <textarea rows={6} value={json} onChange={(e) => setJson(e.target.value)} placeholder='Paste a form definition exported from "Publish → Export JSON"' style={{ marginTop: 8 }} />
          <button onClick={importJson} style={{ marginTop: 8 }}>Import</button>
        </details>
      </div>
    </div>
  );
}

// Also shown on the workspace with the prompt a visitor typed on the landing page before signing up.
export function AiBox({ folder, onError, initial = '' }) {
  const me = useMe();
  const [prompt, setPrompt] = useState(initial);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true); onError('');
    try {
      const { definition } = await api('/ai/form', { method: 'POST', body: { prompt } });
      const { id } = await api('/forms', { method: 'POST', body: { definition, folder } });
      navigate(`/forms/${id}/build`);
    } catch (e) { onError(e.message); }
    setBusy(false);
  };
  return (
    <section className="ai-box" aria-labelledby="ai-h">
      <h2 id="ai-h"><Icon name="sparkles" size={18} style={{ color: 'var(--accent)' }} />Describe a form and we'll draft it</h2>
      {!me.ai && <p className="hint" style={{ margin: 0 }}>AI drafting needs <code>ANTHROPIC_API_KEY</code> in <code>.env</code>. Until then, start from a blank form or a template with the Create button.</p>}
      <form className="ai-row" onSubmit={(e) => { e.preventDefault(); go(); }}>
        <input value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label="Form description" placeholder="e.g. Workshop registration with name, WhatsApp number, experience level and ₹1,499 pass by UPI" />
        <button className="accent" disabled={busy || !me.ai || prompt.trim().length < 5}>{busy ? 'Drafting…' : 'Generate draft'}</button>
      </form>
      <p className="hint" style={{ margin: 0 }}>The draft opens in the builder as a new form. Nothing is published until you choose to.</p>
    </section>
  );
}

