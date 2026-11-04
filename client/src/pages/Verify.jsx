// E-mail confirmation: the page the e-mailed link opens, and the reminder shown until the address is confirmed.
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Logo from '../components/Logo.jsx';
import Icon from '../components/Icon.jsx';

export function VerifyEmail({ token, signedIn, onDone }) {
  const [state, setState] = useState({ status: 'working' });
  useEffect(() => {
    api('/auth/verify', { method: 'POST', body: { token } })
      .then((r) => { setState({ status: 'done', email: r.email }); onDone?.(); })
      .catch((e) => setState({ status: 'error', message: e.message }));
  }, [token]);
  return (
    <div className="auth-page">
      <Logo />
      <div className="auth-card" role="status" aria-live="polite">
        {state.status === 'working' && <p className="muted">Confirming your e-mail address…</p>}
        {state.status === 'done' && (
          <>
            <span className="empty-icon"><Icon name="success" size={22} /></span>
            <h1>E-mail confirmed</h1>
            <p className="muted">{state.email} is confirmed. Team invitations and tasks sent to this address are now available.</p>
            <a className="btn primary" style={{ width: '100%', marginTop: 12 }} href={signedIn ? '#/' : '#/login'}>{signedIn ? 'Go to workspace' : 'Log in'}</a>
          </>
        )}
        {state.status === 'error' && (
          <>
            <h1>Link didn't work</h1>
            <p className="error" role="alert">{state.message}</p>
            <a className="btn" style={{ width: '100%', marginTop: 12 }} href={signedIn ? '#/' : '#/login'}>{signedIn ? 'Back to workspace' : 'Log in'}</a>
          </>
        )}
      </div>
    </div>
  );
}

export function VerifyBanner({ me }) {
  const [sent, setSent] = useState('');
  const resend = async () => {
    try { await api('/auth/verify/resend', { method: 'POST' }); setSent('Sent. Check your inbox.'); } catch (e) { setSent(e.message); }
  };
  return (
    <div className="verify-banner" role="region" aria-label="Confirm your e-mail">
      <Icon name="mail" size={16} />
      <span>Confirm <b>{me.user.email}</b> to accept team invitations and see tasks assigned to you.
        {!me.email && <> No mail server is set up, so the link is in <a className="link" href="#/account/outbox">Account → Outbox</a>.</>}
      </span>
      {sent ? <span className="hint">{sent}</span> : <button className="small" onClick={resend}>Resend link</button>}
    </div>
  );
}
