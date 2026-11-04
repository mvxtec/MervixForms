// "Sign up with Google / Microsoft" (OpenID Connect, authorization-code flow). Enabled when the
// provider's client id and secret are set in .env; the buttons stay hidden otherwise.
import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';
import { hashPassword, issueSession } from '../auth.js';
import { BASE_URL } from '../notify.js';
import { sendVerification } from './account.js';

const r = Router();

const PROVIDERS = {
  google: {
    id: () => process.env.GOOGLE_CLIENT_ID, secret: () => process.env.GOOGLE_CLIENT_SECRET,
    auth: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', userinfo: 'https://openidconnect.googleapis.com/v1/userinfo',
  },
  microsoft: {
    id: () => process.env.MICROSOFT_CLIENT_ID, secret: () => process.env.MICROSOFT_CLIENT_SECRET,
    auth: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize', token: 'https://login.microsoftonline.com/common/oauth2/v2.0/token', userinfo: 'https://graph.microsoft.com/oidc/userinfo',
  },
};
const enabled = (p) => !!(PROVIDERS[p]?.id() && PROVIDERS[p]?.secret());
const redirectUri = (p) => `${BASE_URL()}/api/auth/oauth/${p}/callback`;
const STATE_COOKIE = 'mf_oauth';
const cookie = (req, name) => (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
const fail = (res, msg) => res.redirect(`/#/login?error=${encodeURIComponent(msg)}`);

r.get('/auth/oauth/providers', (req, res) => res.json({ google: enabled('google'), microsoft: enabled('microsoft') }));

r.get('/auth/oauth/:p/start', (req, res) => {
  const p = PROVIDERS[req.params.p];
  if (!p || !enabled(req.params.p)) return fail(res, 'This sign-in option is not set up.');
  const state = crypto.randomBytes(16).toString('base64url');
  res.setHeader('Set-Cookie', `${STATE_COOKIE}=${state}; Path=/api/auth/oauth; HttpOnly; SameSite=Lax; Max-Age=600`);
  const q = new URLSearchParams({ client_id: p.id(), redirect_uri: redirectUri(req.params.p), response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' });
  res.redirect(`${p.auth}?${q}`);
});

r.get('/auth/oauth/:p/callback', async (req, res) => {
  const name = req.params.p;
  const p = PROVIDERS[name];
  if (!p || !enabled(name)) return fail(res, 'This sign-in option is not set up.');
  const expected = cookie(req, STATE_COOKIE);
  if (!expected || expected !== req.query.state) return fail(res, 'Sign-in expired. Please try again.');
  try {
    const tok = await fetch(p.token, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: String(req.query.code || ''), client_id: p.id(), client_secret: p.secret(), redirect_uri: redirectUri(name), grant_type: 'authorization_code' }),
      signal: AbortSignal.timeout(10000),
    }).then((x) => x.json());
    if (!tok.access_token) return fail(res, 'Sign-in failed. Please try again.');
    const info = await fetch(p.userinfo, { headers: { Authorization: `Bearer ${tok.access_token}` }, signal: AbortSignal.timeout(10000) }).then((x) => x.json());
    const email = String(info.email || '').toLowerCase();
    if (!email || (name === 'google' && info.email_verified === false)) return fail(res, 'Your account has no verified e-mail address.');
    const key = `${name}:${info.sub}`;
    // Sign in only the account this provider identity created or was linked to. An e-mail match links
    // an existing account only when Google vouches for the address and the account has no other sign-in.
    const verified = name === 'google' && info.email_verified === true;
    let user = db.prepare('SELECT id FROM users WHERE oauth = ?').get(key);
    if (!user) {
      const byEmail = db.prepare('SELECT id, oauth FROM users WHERE email = ?').get(email);
      if (byEmail) {
        if (!verified || byEmail.oauth) return fail(res, 'An account with this e-mail already exists. Log in with your password.');
        db.prepare('UPDATE users SET oauth = ? WHERE id = ?').run(key, byEmail.id);
        user = byEmail;
      }
    }
    if (!user) {
      const { lastInsertRowid } = db.prepare('INSERT INTO users (email, name, password_hash, oauth) VALUES (?, ?, ?, ?)').run(email, String(info.name || ''), hashPassword(crypto.randomBytes(24).toString('hex')), key);
      user = { id: Number(lastInsertRowid) };
      if (!verified) sendVerification({ id: user.id, email });
    }
    if (verified) db.prepare("UPDATE users SET email_verified_at = COALESCE(email_verified_at, datetime('now')) WHERE id = ?").run(user.id);
    issueSession(res, user.id);
    res.append('Set-Cookie', `${STATE_COOKIE}=; Path=/api/auth/oauth; Max-Age=0`);
    res.redirect('/#/');
  } catch {
    fail(res, 'Sign-in failed. Please try again.');
  }
});

export default r;
