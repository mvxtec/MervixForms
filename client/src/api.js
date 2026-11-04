export class ApiError extends Error {
  constructor(msg, status, body) { super(msg); this.status = status; this.body = body; }
}

export async function api(path, { method = 'GET', body, form, headers } = {}) {
  const r = await fetch(`/api${path}`, {
    method,
    headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...headers },
    body: form || (body !== undefined ? JSON.stringify(body) : undefined),
    credentials: 'same-origin',
  });
  const json = (r.headers.get('content-type') || '').includes('json') ? await r.json() : null;
  if (!r.ok) throw new ApiError(json?.error || `Request failed (${r.status})`, r.status, json);
  return json;
}

export const fmtBytes = (n) => {
  if (n == null) return 'Unlimited';
  if (n < 1024) return `${n} B`;
  const u = ['KB', 'MB', 'GB', 'TB'];
  let i = -1;
  do { n /= 1024; i++; } while (n >= 1024 && i < u.length - 1);
  return `${n.toFixed(n < 10 ? 1 : 0)} ${u[i]}`;
};

export const fmtDate = (s) => (s ? new Date(s.replace(' ', 'T') + (s.includes('Z') ? '' : 'Z')).toLocaleString() : '');
