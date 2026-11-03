import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { useHashRoute, match, navigate } from './router.js';
import Auth from './pages/Auth.jsx';
import Workspace from './pages/Workspace.jsx';
import FormWorkspace from './pages/FormWorkspace.jsx';
import Account from './pages/Account.jsx';
import Approve from './pages/Approve.jsx';
import SignPublic from './pages/SignPublic.jsx';
import { SignList, SignEditor } from './pages/Sign.jsx';
import { AppsList, AppEditor } from './pages/Apps.jsx';
import Icon from './components/Icon.jsx';

const MeContext = createContext(null);
export const useMe = () => useContext(MeContext);

export default function App() {
  const route = useHashRoute();
  const [me, setMe] = useState(undefined);
  const refresh = () => api('/me').then(setMe).catch(() => setMe(null));
  useEffect(() => { refresh(); }, []);

  // Public pages reached from e-mailed links (no login).
  const approve = match('/approve/:sid/:email/:token', route);
  if (approve) return <Approve {...approve} />;
  const signLink = match('/sign/:token', route);
  if (signLink) return <SignPublic token={signLink.token} />;

  if (me === undefined) return <div className="page muted">Loading…</div>;
  if (!me) return <Auth onDone={refresh} />;

  let body, m;
  if ((m = match('/forms/:id/:tab/:sid', route)) || (m = match('/forms/:id/:tab', route))) body = <FormWorkspace key={m.id} {...m} />;
  else if ((m = match('/account/:section', route)) || route === '/account') body = <Account section={m?.section || 'plan'} />;
  else if ((m = match('/sign-docs/:id', route))) body = <SignEditor key={m.id} id={m.id} />;
  else if (route.startsWith('/sign-docs')) body = <SignList />;
  else if ((m = match('/apps/:id/:tab', route)) || (m = match('/apps/:id', route))) body = <AppEditor key={m.id} id={m.id} tab={m.tab} />;
  else if (route.startsWith('/apps')) body = <AppsList />;
  else body = <Workspace />;

  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setMe(null); navigate('/'); };
  const switchWs = async (id) => { await api('/workspace', { method: 'POST', body: { id: Number(id) } }); navigate('/'); window.location.reload(); };
  const top = route.split('/')[1] || '';
  const nav = [
    ['#/', 'forms', 'Forms', top === '' || top === 'forms'],
    ['#/sign-docs', 'sign', 'Sign documents', top.startsWith('sign')],
    ['#/apps', 'apps', 'Apps & stores', top === 'apps'],
    ['#/account/plan', 'account', 'Account', top === 'account'],
  ];
  const subs = me.plan.submissionsPerMonth;
  const used = me.usage.submissionsPerMonth;

  return (
    <MeContext.Provider value={{ ...me, refresh }}>
      <div className="shell">
        <aside className="side" aria-label="Main">
          <a href="#/" className="brand"><span className="logo">W</span>WpForms</a>
          {me.workspaces.length > 1 ? (
            <select className="ws-switch" value={me.workspace.id} onChange={(e) => switchWs(e.target.value)} aria-label="Workspace">
              {me.workspaces.map((w) => <option key={w.id} value={w.id}>{w.id === me.user.id ? 'My workspace' : `${w.email}'s team`} ({w.role})</option>)}
            </select>
          ) : (
            <div className="hint" style={{ padding: '0 10px' }}>{me.plan.name} plan{me.workspace.role !== 'owner' ? ` · ${me.workspace.role}` : ''}</div>
          )}
          <nav className="side-nav">
            {nav.map(([href, icon, label, active]) => (
              <a key={href} href={href} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon name={icon} />{label}</a>
            ))}
          </nav>
          <div className="side-foot">
            <div className="usage">
              <span className="muted">Submissions this month</span>
              <b>{used.toLocaleString()} / {subs == null ? '∞' : subs.toLocaleString()}</b>
              <div className={`meter ${subs != null && used >= subs ? 'full' : ''}`}><div style={{ width: subs ? `${Math.min(100, (used / subs) * 100)}%` : '0%' }} /></div>
              <a href="#/account/plan">{me.plan.name} plan · Manage</a>
            </div>
            <div className="side-user">
              <span className="grow" title={me.user.email}>{me.user.email}</span>
              <button className="icon-btn small ghost" onClick={logout} aria-label="Log out" title="Log out"><Icon name="logout" /></button>
            </div>
          </div>
        </aside>
        <div className="main">{body}</div>
      </div>
    </MeContext.Provider>
  );
}
