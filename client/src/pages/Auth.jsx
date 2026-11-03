import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Logo from '../components/Logo.jsx';

// "Sign up with Google / Microsoft" buttons, shown only for providers configured in .env.
export function OAuthButtons({ verb = 'Sign up' }) {
  const [p, setP] = useState({});
  useEffect(() => { api('/auth/oauth/providers').then(setP).catch(() => {}); }, []);
  if (!p.google && !p.microsoft) return null;
  return (
    <div className="oauth">
      {p.google && <a className="btn oauth-btn" href="/api/auth/oauth/google/start"><GoogleMark />{verb} with Google</a>}
      {p.microsoft && <a className="btn oauth-btn" href="/api/auth/oauth/microsoft/start"><MicrosoftMark />{verb} with Microsoft</a>}
      <div className="or"><span>or</span></div>
    </div>
  );
}

const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.2l7.8 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" /><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
);
const MicrosoftMark = () => (
  <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true"><path fill="#f25022" d="M1 1h9v9H1z" /><path fill="#7fba00" d="M11 1h9v9h-9z" /><path fill="#00a4ef" d="M1 11h9v9H1z" /><path fill="#ffb900" d="M11 11h9v9h-9z" /></svg>
);

export default function Auth({ mode = 'login', error: initialError = '', onDone }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const signup = mode === 'signup';

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api(signup ? '/auth/register' : '/auth/login', { method: 'POST', body: form });
      onDone(); // App leaves /login and /signup once signed in; other deep links stay where they are
    } catch (x) { setError(x.message); }
    setBusy(false);
  };

  return (
    <div className="auth-page">
      <Logo />
      <form className="auth-card" onSubmit={submit}>
        <h1>{signup ? 'Create your free account' : 'Welcome back'}</h1>
        <p className="muted" style={{ marginTop: -4 }}>{signup ? 'Build forms, collect payments and automate approvals.' : 'Log in to your workspace.'}</p>
        <OAuthButtons verb={signup ? 'Sign up' : 'Log in'} />
        {signup && (<><label className="lbl" htmlFor="au-name">Name</label><input id="au-name" value={form.name} onChange={set('name')} autoComplete="name" /></>)}
        <label className="lbl" htmlFor="au-email">E-mail</label>
        <input id="au-email" type="email" value={form.email} onChange={set('email')} required autoFocus autoComplete="email" />
        <label className="lbl" htmlFor="au-pass">Password</label>
        <input id="au-pass" type="password" value={form.password} onChange={set('password')} required minLength={signup ? 8 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} />
        {signup && <p className="hint" style={{ margin: '6px 0 0' }}>At least 8 characters.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="primary" style={{ width: '100%', minHeight: 40, marginTop: 18 }} disabled={busy}>{busy ? 'Please wait…' : signup ? 'Sign up for free' : 'Log in'}</button>
        <p className="hint" style={{ marginTop: 16, textAlign: 'center' }}>
          {signup ? <>Already have an account? <a className="link" href="#/login">Log in</a></> : <>No account yet? <a className="link" href="#/signup">Sign up</a></>}
        </p>
      </form>
    </div>
  );
}
