import { useEffect, useState } from 'react';

// Hash router for the app (#/forms/abc/inbox). Public forms live at real paths (/f/:id).
export function useHashRoute() {
  const get = () => window.location.hash.replace(/^#/, '') || '/';
  const [route, setRoute] = useState(get);
  useEffect(() => {
    const on = () => setRoute(get());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

export const navigate = (to) => { window.location.hash = to; };

export function match(pattern, route) {
  const p = pattern.split('/'), r = route.split('?')[0].split('/');
  if (p.length !== r.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(r[i]);
    else if (p[i] !== r[i]) return null;
  }
  return params;
}

// Query string of a hash route: '/templates?type=apps' → URLSearchParams.
export const query = (route) => new URLSearchParams(route.split('?')[1] || '');

// Something a signed-out visitor started on the public site (an AI prompt or a template),
// carried through sign-up and picked up by the workspace.
const PENDING = 'mf_pending';
export const setPending = (v) => { try { sessionStorage.setItem(PENDING, JSON.stringify(v)); } catch { /* storage blocked */ } };
export function takePending() {
  try {
    const v = JSON.parse(sessionStorage.getItem(PENDING) || 'null');
    sessionStorage.removeItem(PENDING);
    return v;
  } catch { return null; }
}
