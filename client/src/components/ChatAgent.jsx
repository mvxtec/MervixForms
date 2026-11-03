import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { formatValue } from '@shared/fields.js';

// Conversational way to fill a form. Answers go through the same submit endpoint (and validation) as the form.
export default function ChatAgent({ def, formId, password, onSwitchToForm, onDone }) {
  const [history, setHistory] = useState([]);
  const [answers, setAnswers] = useState({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);
  const started = useRef(false);

  const turn = async (hist, ans, errors) => {
    setBusy(true); setError('');
    try {
      const r = await api(`/public/forms/${formId}/agent`, { method: 'POST', body: { history: hist, answers: ans, errors, password } });
      const merged = { ...ans, ...r.answers };
      const nextHist = [...hist, { role: 'assistant', content: r.reply }];
      setAnswers(merged); setHistory(nextHist);
      if (r.done) await finish(nextHist, merged, r.needsForm);
    } catch (e) { setError(e.message); }
    setBusy(false);
  };

  const finish = async (hist, ans, needsForm) => {
    if (needsForm?.length) {
      setHistory([...hist, { role: 'assistant', content: `Almost done! Please finish the remaining part (${needsForm.join(', ')}) in the form — your answers are filled in.` }]);
      setTimeout(() => onSwitchToForm(ans), 1500);
      return;
    }
    try {
      const res = await api(`/public/forms/${formId}/submit`, { method: 'POST', body: { values: ans, password } });
      if (res.checkoutUrl) { window.location.href = res.checkoutUrl; return; }
      onDone(res);
    } catch (e) {
      if (e.body?.errors) {
        const named = Object.fromEntries(Object.entries(e.body.errors).map(([id, msg]) => [def.fields.find((f) => f.id === id)?.label || id, msg]));
        await turn(hist, ans, named);
      } else setError(e.message);
    }
  };

  useEffect(() => { if (!started.current) { started.current = true; turn([], {}); } }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history, busy]);

  const send = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const hist = [...history, { role: 'user', content: text }];
    setHistory(hist); setInput('');
    turn(hist, answers);
  };

  const answered = def.fields.filter((f) => answers[f.id] !== undefined);
  return (
    <div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, height: 380, overflowY: 'auto', background: '#fafbfd' }}>
        {history.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', margin: '6px 0' }}>
            <div style={{ maxWidth: '80%', padding: '8px 12px', borderRadius: 12, whiteSpace: 'pre-wrap', background: m.role === 'user' ? 'var(--f-primary)' : '#fff', color: m.role === 'user' ? '#fff' : 'inherit', border: m.role === 'user' ? 0 : '1px solid var(--border)' }}>{m.content}</div>
          </div>
        ))}
        {busy && <div className="hint">Assistant is typing…</div>}
        <div ref={endRef} />
      </div>
      {error && <div className="error" style={{ marginTop: 6 }}>{error}</div>}
      <form onSubmit={send} className="row" style={{ marginTop: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your answer…" disabled={busy} autoFocus />
        <button className="wf-btn" disabled={busy || !input.trim()}>Send</button>
      </form>
      {answered.length > 0 && (
        <details style={{ marginTop: 10 }}>
          <summary className="hint">Collected answers ({answered.length})</summary>
          <table className="tbl" style={{ marginTop: 6 }}><tbody>
            {answered.map((f) => <tr key={f.id}><td style={{ width: '40%' }}>{f.label}</td><td>{formatValue(f, answers[f.id])}</td></tr>)}
          </tbody></table>
        </details>
      )}
      <div style={{ marginTop: 8 }}><button type="button" className="link small" onClick={() => onSwitchToForm(answers)}>Switch to the regular form</button></div>
    </div>
  );
}
