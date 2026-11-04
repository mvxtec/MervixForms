// Outgoing requests to owner-supplied URLs (webhooks, integrations, workflow steps, PDF images).
// Only public internet addresses are allowed, so a form can't be used to reach the server's own network,
// cloud metadata endpoints or other internal services. Redirects are not followed.
import dns from 'node:dns/promises';
import net from 'node:net';

const v4ToInt = (ip) => ip.split('.').reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
const V4_BLOCKED = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16], ['172.16.0.0', 12],
  ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
  ['224.0.0.0', 4], ['240.0.0.0', 4],
].map(([base, bits]) => [v4ToInt(base), bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0]);

export function isPrivateAddress(ip) {
  if (net.isIPv4(ip)) {
    const n = v4ToInt(ip);
    return V4_BLOCKED.some(([base, mask]) => ((n & mask) >>> 0) === base);
  }
  const v6 = ip.toLowerCase();
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  return v6 === '::' || v6 === '::1' || /^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || /^ff/.test(v6) || v6.startsWith('64:ff9b:') || v6.startsWith('2001:db8');
}

// Throws a readable error when the URL may not be called. `allowHttp` is for images in PDFs only.
export async function checkPublicUrl(raw, { allowHttp = false } = {}) {
  let url;
  try { url = new URL(String(raw)); } catch { throw new Error('Not a valid URL.'); }
  if (url.protocol !== 'https:' && !(allowHttp && url.protocol === 'http:')) throw new Error('Use an https:// URL.');
  if (url.username || url.password) throw new Error('URLs with a user name or password are not allowed.');
  if (process.env.ALLOW_PRIVATE_URLS === 'true') return url; // local development against services on this machine
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true, verbatim: true }).catch(() => [])).map((a) => a.address);
  if (!addresses.length) throw new Error(`Could not find the server ${host}.`);
  if (addresses.some(isPrivateAddress)) throw new Error('That address points to a private or internal network.');
  return url;
}

export async function safeFetch(raw, { allowHttp = false, timeoutMs = 8000, maxBytes, ...opts } = {}) {
  const url = await checkPublicUrl(raw, { allowHttp });
  const r = await fetch(url, { ...opts, redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) });
  if (r.status >= 300 && r.status < 400) throw new Error(`The server redirected (HTTP ${r.status}); use the final URL.`);
  if (maxBytes && Number(r.headers.get('content-length')) > maxBytes) throw new Error('Response too large.');
  return r;
}
