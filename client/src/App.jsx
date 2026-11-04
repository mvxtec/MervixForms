import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api.js';
import { useHashRoute, match, navigate, query, takePending, setPending } from './router.js';
import Auth, { ForgotPassword, ResetPassword } from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Site, { SITE_PAGES } from './pages/Site.jsx';
import FormWorkspace from './pages/FormWorkspace.jsx';
import Account from './pages/Account.jsx';
import Approve from './pages/Approve.jsx';
import SignPublic from './pages/SignPublic.jsx';
import { SignList, SignEditor } from './pages/Sign.jsx';
import { AppsList, AppEditor } from './pages/Apps.jsx';
import WorkflowBuilder from './pages/WorkflowBuilder.jsx';
import { WorkflowsPage } from './pages/Workflows.jsx';
import { WfTask, Track } from './pages/WfPublic.jsx';
import { MegaMenus, WorkspaceSwitcher, UserMenu } from './components/SiteMenus.jsx';
import { switchTo } from './pages/Home.jsx';
import Logo from './components/Logo.jsx';
import Icon from './components/Icon.jsx';
import { VerifyEmail, VerifyBanner } from './pages/Verify.jsx';

const MeContext = createContext(null);
export const useMe = () => useContext(MeContext);

function AppHeader({ me, view, onLogout }) {
  return (
    <header className="app-header">
      <SkipLink />
      <Logo />
      <span className="hdr-sep" aria-hidden="true">/</span>
      <WorkspaceSwitcher me={me} view={view} onSwitchTeam={switchTo} />
      <MegaMenus signedIn />
      <div className="hdr-right">
        {me.plan.name !== 'Enterprise' && <a className="btn small" href="#/account/plan"><Icon name="bolt" size={14} />Upgrade</a>}
        <UserMenu me={me} onLogout={onLogout} />
      </div>
    </header>
  );
}

// Hash routing owns location.hash, so the skip link moves focus instead of navigating.
export function SkipLink() {
  return <a className="skip-link" href="#/" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>;
}

export default function App() {
  const route = useHashRoute();
  const page = route.split('?')[0];
  const [me, setMe] = useState(undefined);
  const refresh = () => api('/me').then(setMe).catch(() => setMe(null));
  useEffect(() => { refresh(); }, []);

  // Signed in on a login page (e.g. back from Google): go to the workspace. A template or blank form
  // chosen on the public site before signing up is created now; an AI prompt waits for the workspace.
  useEffect(() => {
    if (!me) return;
    if (page === '/login' || page === '/signup') navigate('/');
    const p = takePending();
    if (p?.templateId || p?.blank) {
      api('/forms', { method: 'POST', body: p.blank ? { title: 'Untitled Form' } : { templateId: p.templateId } })
        .then(({ id }) => navigate(`/forms/${id}/build`)).catch(() => {});
    } else if (p) setPending(p);
  }, [me, page]);

  // Public pages reached from e-mailed links (no login).
  const approve = match('/approve/:sid/:email/:token', route);
  if (approve) return <Approve {...approve} />;
  const signLink = match('/sign/:token', route);
  if (signLink) return <SignPublic token={signLink.token} />;
  const wfTask = match('/wf-task/:token', route);
  if (wfTask) return <WfTask token={wfTask.token} />;
  const track = match('/track/:token', route);
  if (track) return <Track token={track.token} />;

  if (me === undefined) return <div className="page muted">Loading…</div>;
  if (page === '/forgot') return <ForgotPassword />;
  const reset = match('/reset/:token', route);
  if (reset) return <ResetPassword token={reset.token} />;
  const verify = match('/verify/:token', route);
  if (verify) return <VerifyEmail token={verify.token} signedIn={!!me} onDone={refresh} />;
  if (!me) {
    if (page === '/signup' || page === '/login') return <Auth key={page} mode={page.slice(1)} error={query(route).get('error') || ''} onDone={refresh} />;
    if (SITE_PAGES.includes(page)) return <Site me={null} route={route} />;
    return <Auth mode="login" onDone={refresh} />;
  }
  if (page !== '/' && (SITE_PAGES.includes(page) || page === '/home')) return <Site me={me} route={route} />;

  let body, m, view;
  if ((m = match('/forms/:id/:tab/:sid', route)) || (m = match('/forms/:id/:tab', route))) body = <FormWorkspace key={m.id} {...m} />;
  else if ((m = match('/account/:section', route)) || route === '/account') body = <Account section={m?.section || 'plan'} />;
  else if ((m = match('/sign-docs/:id', route))) body = <SignEditor key={m.id} id={m.id} />;
  else if (route.startsWith('/sign-docs')) body = <SignList />;
  else if ((m = match('/apps/:id/:tab', route)) || (m = match('/apps/:id', route))) body = <AppEditor key={m.id} id={m.id} tab={m.tab} />;
  else if (route.startsWith('/apps')) body = <AppsList />;
  else if ((m = match('/workflows/:id/:tab', route)) || (m = match('/workflows/:id', route))) body = <WorkflowBuilder key={m.id} id={m.id} tab={m.tab} />;
  else if (route.startsWith('/workflows')) body = <WorkflowsPage />;
  else if ((m = match('/w/label/:label', route))) { view = 'label'; body = <Home view="label" label={m.label} />; }
  else if ((m = match('/w/:view', route))) { view = m.view; body = <Home view={m.view} />; }
  else body = <Home view="all" />;

  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setMe(null); navigate('/'); };

  return (
    <MeContext.Provider value={{ ...me, refresh }}>
      <div className="app">
        <AppHeader me={me} view={view} onLogout={logout} />
        {!me.user.emailVerified && <VerifyBanner me={me} />}
        <main id="main" tabIndex={-1} className="app-body">{body}</main>
      </div>
    </MeContext.Provider>
  );
}
