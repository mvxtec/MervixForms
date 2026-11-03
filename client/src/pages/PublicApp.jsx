import { useEffect, useState } from 'react';
import { api } from '../api.js';
import AppView from '../components/AppView.jsx';

export default function PublicApp({ appId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const params = new URLSearchParams(window.location.search);
  useEffect(() => {
    api(`/public/apps/${appId}`).then((d) => { setData(d); document.title = d.definition.title; }).catch((e) => setError(e.message));
  }, [appId]);
  if (error) return <div className="page error">{error}</div>;
  if (!data) return <div className="page muted">Loading…</div>;
  const order = params.get('order');
  return (
    <div style={{ minHeight: '100vh', background: data.definition.theme?.background }}>
      {order && <div className="panel" style={{ maxWidth: 520, margin: '12px auto' }}>{order === 'cancelled' ? 'Payment was cancelled.' : `✓ Payment received for order #${order}. Thank you!`}</div>}
      <AppView appId={appId} kind={data.kind} def={data.definition} forms={data.forms} live branding={data.branding} />
    </div>
  );
}
