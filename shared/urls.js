// Link safety shared by client and server. Owner-entered links (redirects, buttons, embeds) may only use
// web, mail and phone schemes; script schemes would run code on the platform's own origin.
const SAFE_SCHEME = /^(https?:|mailto:|tel:|sms:)/i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

// Browsers ignore tabs, newlines and leading spaces in URLs ("java\tscript:" still runs), so strip them first.
const normalise = (u) => String(u ?? '').replace(/[\u0000- \u007f]/g, '');

// For rendering: returns the link if it is safe to put in an href/src, otherwise ''.
// Relative links ("/f/abc", "#top", "page.html") are allowed; protocol-relative "//host" is too (same scheme).
export function safeUrl(u) {
  const s = normalise(u);
  if (!s) return '';
  if (SAFE_SCHEME.test(s)) return String(u).trim();
  return ANY_SCHEME.test(s) ? '' : String(u).trim();
}

// For redirects after submit: absolute http(s) only.
export const safeRedirect = (u) => (/^https?:\/\//i.test(normalise(u)) ? String(u).trim() : '');

// True when a stored value uses a scheme that must never be saved (javascript:, data:, vbscript:, file: …).
export const isUnsafeUrl = (u) => Boolean(normalise(u)) && safeUrl(u) === '';

// Keys in form and app definitions that hold links.
const LINK_KEYS = new Set(['url', 'href', 'link', 'redirect', 'redirectUrl', 'src', 'logo', 'logoUrl', 'image', 'imageUrl']);

// Finds the first unsafe link anywhere in a definition. Condition actions keep the URL in `value`
// when `type` is "redirect"; link-style button widgets keep it in `value` when `network` is "link".
export function findUnsafeUrl(node, path = '') {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) { const hit = findUnsafeUrl(node[i], `${path}[${i}]`); if (hit) return hit; }
    return null;
  }
  const linkValue = node.type === 'redirect' || node.network === 'link';
  for (const [k, v] of Object.entries(node)) {
    if (typeof v === 'string' && (LINK_KEYS.has(k) || (k === 'value' && linkValue))) {
      // Images may be inline data URIs (e.g. uploaded logos); nothing else may.
      if (/^data:image\/(png|jpe?g|gif|webp);/i.test(normalise(v)) && ['src', 'logo', 'logoUrl', 'image', 'imageUrl'].includes(k)) continue;
      if (isUnsafeUrl(v)) return `${path ? `${path}.` : ''}${k}`;
    } else if (v && typeof v === 'object') {
      const hit = findUnsafeUrl(v, `${path ? `${path}.` : ''}${k}`);
      if (hit) return hit;
    }
  }
  return null;
}
