import { useEffect, useState } from 'react';
import { api, fmtDate } from '../api.js';
import FormRenderer from '../components/FormRenderer.jsx';

export default function Versions({ id, def, onRestored }) {
  const [list, setList] = useState([]);
  const [preview, setPreview] = useState(null);
  const [label, setLabel] = useState('');
  const load = () => api(`/forms/${id}/versions`).then(setList);
  useEffect(() => { load(); }, [id]);

  const saveNamed = async () => {
    if (!label.trim()) return;
    await api(`/forms/${id}`, { method: 'PUT', body: { definition: def, versionLabel: label.trim() } });
    setLabel(''); load();
  };
  const restore = async (v) => {
    if (!confirm(`Restore version #${v.id}? Your current form is saved as a version first.`)) return;
    await api(`/forms/${id}/versions/${v.id}/restore`, { method: 'POST' });
    onRestored();
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <h2>Version history</h2>
      <p className="hint">Snapshots are kept automatically while you edit (one per 5 minutes) — up to 100 per form.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <input style={{ maxWidth: 320 }} placeholder="Name this version, e.g. Before launch" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="primary" onClick={saveNamed} disabled={!label.trim()}>Save named version</button>
      </div>
      <table className="tbl" style={{ border: '1px solid var(--border)' }}>
        <thead><tr><th>#</th><th>Saved</th><th>Label</th><th>By</th><th>Fields</th><th>Rules</th><th></th></tr></thead>
        <tbody>
          {list.map((v, i) => (
            <tr key={v.id}>
              <td>{v.id}</td>
              <td className="hint">{fmtDate(v.created_at)}{i === 0 && <span className="pill green" style={{ marginLeft: 6 }}>latest</span>}</td>
              <td>{v.label || <span className="muted">autosave</span>}</td>
              <td className="hint">{v.author}</td>
              <td>{v.fieldCount}</td>
              <td>{v.ruleCount}</td>
              <td>
                <div className="row" style={{ justifyContent: 'flex-end' }}>
                  <button className="small" onClick={async () => setPreview(await api(`/forms/${id}/versions/${v.id}`))}>Preview</button>
                  {i > 0 && <button className="small" onClick={() => restore(v)}>Restore</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {preview && (
        <div className="modal-back" onClick={() => setPreview(null)}>
          <div className="modal wide" style={{ padding: 0, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
            <div className="row" style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
              <b>Version #{preview.id}</b><span className="hint">{fmtDate(preview.created_at)} {preview.label}</span>
              <button className="right" onClick={() => setPreview(null)}>✕</button>
            </div>
            <FormRenderer def={preview.definition} formId={id} mode="preview" />
          </div>
        </div>
      )}
    </div>
  );
}
