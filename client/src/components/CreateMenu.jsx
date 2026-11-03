// "How would you like to start?" — the sidebar Create button.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { navigate } from '../router.js';
import { NewFormModal } from '../pages/Workspace.jsx';
import Icon from './Icon.jsx';

const OPTIONS = [
  { key: 'form', title: 'Form', desc: 'Create forms with logic, payments and automation.', icon: 'forms', color: '#ea580c' },
  { key: 'esign', title: 'E-sign', desc: 'Create documents that can be signed on any device.', icon: 'sign', color: '#0f766e' },
  { key: 'app', title: 'App', desc: 'Make installable mobile apps with no coding.', icon: 'apps', color: '#4f46e5' },
  { key: 'workflow', title: 'Workflow', desc: 'Easily automate workflows and streamline approvals.', icon: 'redo', color: '#0369a1' },
  { key: 'agent', title: 'AI Agent', desc: 'Let people fill a form by chatting with an AI assistant.', icon: 'sparkles', color: '#db2777', needsForm: true },
  { key: 'table', title: 'Table', desc: 'Manage and collaborate on submission data in a spreadsheet view.', icon: 'apps', color: '#15803d', needsForm: true },
  { key: 'report', title: 'Report', desc: 'Generate reports from your form data.', icon: 'forms', color: '#7c3aed', needsForm: true },
  { key: 'board', title: 'Board', desc: 'Organize tasks and keep everything on track.', icon: 'apps', color: '#b45309', soon: true },
  { key: 'widget', title: 'Website Widget', desc: 'Embeddable widgets to boost engagement.', icon: 'external', color: '#57534e', soon: true, isNew: true },
];
// Where each "needs a form" option lands inside the chosen form.
const FORM_TARGET = { agent: 'settings/agent', table: 'inbox', report: 'reports' };

export default function CreateMenu({ onClose }) {
  const [step, setStep] = useState(null);
  const [forms, setForms] = useState([]);
  const [formId, setFormId] = useState('');
  useEffect(() => { api('/forms').then((d) => setForms(d.forms)); }, []);
  const go = (to) => { onClose(); navigate(to); };
  const choose = async (o) => {
    if (o.soon) return;
    if (o.key === 'form') return setStep('form');
    if (o.key === 'esign') return go('/sign-docs');
    if (o.key === 'workflow') return go('/workflows');
    if (o.key === 'app') {
      const { id } = await api('/apps', { method: 'POST', body: { kind: 'app', title: 'My App' } });
      return go(`/apps/${id}`);
    }
    if (o.needsForm) setStep(o.key);
  };
  if (step === 'form') return <NewFormModal onClose={onClose} folder="" />;
  const picked = OPTIONS.find((o) => o.key === step);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="create-h" onClick={(e) => e.stopPropagation()}>
        <div className="row"><h2 id="create-h" style={{ margin: 0 }}>{picked ? `${picked.title}: choose a form` : 'How would you like to start?'}</h2><button className="right icon-btn ghost" aria-label="Close" onClick={onClose}>✕</button></div>
        {picked ? (
          <div className="stack" style={{ marginTop: 16 }}>
            <p className="hint">{picked.desc} It works on top of one of your forms.</p>
            <select aria-label="Form" value={formId} onChange={(e) => setFormId(e.target.value)}>
              <option value="">Choose a form…</option>
              {forms.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
            </select>
            <div className="row"><button onClick={() => setStep(null)}>Back</button><button className="primary right" disabled={!formId} onClick={() => go(`/forms/${formId}/${FORM_TARGET[picked.key]}`)}>Continue</button></div>
          </div>
        ) : (
          <>
            <p className="hint">Create smart forms, collect and manage data, and automate workflows in one place.</p>
            <div className="create-grid">
              {OPTIONS.map((o) => (
                <button key={o.key} className="create-card" disabled={o.soon} onClick={() => choose(o)}>
                  <span className="create-icon" style={{ background: o.color }} aria-hidden="true"><Icon name={o.icon} size={20} /></span>
                  <span className="grow" style={{ textAlign: 'left' }}>
                    <b className="row">{o.title}{o.isNew && <span className="pill teal" style={{ fontSize: 10, padding: '0 6px' }}>New</span>}{o.soon && <span className="pill" style={{ fontSize: 10, padding: '0 6px' }}>Soon</span>}</b>
                    <span className="hint" style={{ display: 'block' }}>{o.desc}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
