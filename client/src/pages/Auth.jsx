import { useState } from 'react';
import { api } from '../api.js';

export default function Auth({ onDone }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await api(mode === 'login' ? '/auth/login' : '/auth/register', { method: 'POST', body: form });
      onDone();
    } catch (x) { setError(x.message); }
    setBusy(false);
  };

  return (
    <div style={{ maxWidth: 380, margin: '80px auto', padding: '0 16px' }}>
      <h1>WpForms <span className="muted" style={{ fontWeight: 400 }}>by GlixWordpress</span></h1>
      <form className="panel" onSubmit={submit}>
        <h2>{mode === 'login' ? 'Log in' : 'Create your account'}</h2>
        {mode === 'register' && (<><label className="lbl">Name</label><input value={form.name} onChange={set('name')} /></>)}
        <label className="lbl">E-mail</label>
        <input type="email" value={form.email} onChange={set('email')} required autoFocus />
        <label className="lbl">Password</label>
        <input type="password" value={form.password} onChange={set('password')} required minLength={mode === 'register' ? 8 : undefined} />
        {error && <p className="error">{error}</p>}
        <div style={{ marginTop: 14 }}><button className="primary" disabled={busy}>{mode === 'login' ? 'Log in' : 'Sign up free'}</button></div>
        <p className="hint" style={{ marginTop: 14 }}>
          {mode === 'login' ? <>No account? <button type="button" className="link" onClick={() => setMode('register')}>Sign up</button></>
            : <>Have an account? <button type="button" className="link" onClick={() => setMode('login')}>Log in</button></>}
        </p>
      </form>
    </div>
  );
}
