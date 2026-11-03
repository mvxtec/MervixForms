import { useEffect, useState } from 'react';
import { api } from '../api.js';

function Bars({ counts, total }) {
  const entries = Object.entries(counts || {});
  const max = Math.max(1, ...entries.map(([, n]) => n));
  if (!entries.length) return <div className="muted">No answers yet.</div>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <tbody>
        {entries.map(([k, n]) => (
          <tr key={k}>
            <td style={{ width: '30%', padding: '3px 8px 3px 0', fontSize: 13 }}>{k}</td>
            <td style={{ padding: '3px 0' }}>
              <div style={{ background: '#e8edfb', borderRadius: 3 }}>
                <div style={{ width: `${(n / max) * 100}%`, background: 'var(--primary)', height: 18, borderRadius: 3, minWidth: n ? 2 : 0 }} />
              </div>
            </td>
            <td style={{ width: 90, textAlign: 'right', fontSize: 13 }}>{n} {total ? <span className="hint">({Math.round((n / total) * 100)}%)</span> : null}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Reports({ form }) {
  const [range, setRange] = useState({ from: '', to: '' });
  const [r, setR] = useState(null);
  useEffect(() => {
    const q = new URLSearchParams(Object.entries(range).filter(([, v]) => v));
    api(`/forms/${form.id}/report?${q}`).then(setR);
  }, [form.id, range.from, range.to]);
  if (!r) return <div className="muted">Loading…</div>;

  const days = Object.entries(r.byDay).sort();
  const maxDay = Math.max(1, ...days.map(([, n]) => n));
  const stat = (label, value) => <div className="panel" style={{ flex: 1, margin: 0 }}><div className="hint">{label}</div><div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div></div>;

  return (
    <div style={{ maxWidth: 1000 }}>
      <div className="row no-print" style={{ marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Report — {form.title}</h2>
        <input type="date" className="right" style={{ width: 'auto' }} value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} />
        <input type="date" style={{ width: 'auto' }} value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} />
        <button className="small" onClick={() => window.print()}>Print / PDF</button>
      </div>
      <div className="row" style={{ gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
        {stat('Submissions', r.total)}
        {stat('Views', r.views)}
        {stat('Conversion', `${(r.conversion * 100).toFixed(1)}%`)}
        {r.revenue > 0 && stat('Revenue (paid)', r.revenue.toFixed(2))}
        {r.approvals.pending + r.approvals.approved + r.approvals.rejected > 0 && stat('Approvals', `${r.approvals.approved}✓ ${r.approvals.rejected}✗ ${r.approvals.pending}…`)}
      </div>
      <div className="panel">
        <h3>Submissions over time</h3>
        {!days.length ? <div className="muted">No data.</div> : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 140, overflowX: 'auto' }}>
            {days.map(([d, n]) => (
              <div key={d} title={`${d}: ${n}`} style={{ flex: '0 0 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <span className="hint" style={{ fontSize: 10 }}>{n}</span>
                <div style={{ width: 16, height: `${(n / maxDay) * 100}px`, background: 'var(--primary)', borderRadius: '3px 3px 0 0' }} />
                <span className="hint" style={{ fontSize: 9 }}>{d.slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {r.fields.map((f) => (
        <div className="panel" key={f.id}>
          <div className="row"><h3 style={{ margin: 0 }}>{f.label}</h3><span className="hint right">{f.answered} of {r.total} answered</span></div>
          <div style={{ marginTop: 10 }}>
            {f.stats && (
              <div className="row hint" style={{ marginBottom: 8 }}>
                {Object.entries(f.stats).map(([k, v]) => <span key={k} className="pill">{k}: {Number(v).toFixed(2)}</span>)}
              </div>
            )}
            {f.counts && <Bars counts={f.counts} total={f.type === 'checkbox' || f.type === 'products' ? null : f.answered} />}
            {f.revenue !== undefined && <div style={{ marginTop: 6 }}><b>Revenue: {f.currency} {f.revenue.toFixed(2)}</b></div>}
            {f.matrix && Object.entries(f.matrix).map(([row, counts]) => (
              <div key={row} style={{ marginBottom: 10 }}><b style={{ fontSize: 13 }}>{row}</b><Bars counts={counts} total={f.answered} /></div>
            ))}
            {f.samples && (f.samples.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>{f.samples.map((s, i) => <li key={i}>{s}</li>)}</ul>
            ) : <div className="muted">No answers yet.</div>)}
          </div>
        </div>
      ))}
    </div>
  );
}
