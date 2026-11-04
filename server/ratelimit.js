// Fixed-window rate limits kept in memory (one server process). When the app runs on several instances,
// move the counters to the database or Redis.
const buckets = new Map();

function hit(key, windowMs) {
  const now = Date.now();
  let b = buckets.get(key);
  if (!b || b.reset <= now) { b = { count: 0, reset: now + windowMs }; buckets.set(key, b); }
  b.count++;
  if (buckets.size > 50000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
  return b;
}

const tooMany = (res, b, message) => {
  res.setHeader('Retry-After', Math.ceil((b.reset - Date.now()) / 1000));
  return res.status(429).json({ error: message });
};

// Middleware: at most `max` requests per `windowMs` for each key (default: client IP).
export const limit = ({ name, max, windowMs, key = (req) => req.ip, message = 'Too many requests. Please wait a moment and try again.' }) => (req, res, next) => {
  const b = hit(`${name}:${key(req)}`, windowMs);
  return b.count > max ? tooMany(res, b, message) : next();
};

// Failed-login tracking per account: after `max` failures the account is locked for `windowMs`,
// whatever the caller's IP, so a password can't be guessed by spreading attempts across addresses.
const LOGIN_MAX = 5, LOGIN_WINDOW = 15 * 60 * 1000;
export function loginLocked(email) {
  const b = buckets.get(`login-fail:${email}`);
  return b && b.reset > Date.now() && b.count >= LOGIN_MAX ? b : null;
}
export const recordLoginFailure = (email) => hit(`login-fail:${email}`, LOGIN_WINDOW);
export const clearLoginFailures = (email) => buckets.delete(`login-fail:${email}`);
export const lockedResponse = (res, b) => tooMany(res, b, 'Too many failed attempts. Try again in 15 minutes.');

// Test hook: forget all counters.
export const resetLimits = () => buckets.clear();
