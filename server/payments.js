// Payment provider adapter. With STRIPE_SECRET_KEY set, payments go through Stripe Checkout
// (via its REST API, no SDK). Otherwise a simulated "test" gateway marks payments as paid.

export const stripeEnabled = () => !!process.env.STRIPE_SECRET_KEY;

async function stripe(path, params, method = 'POST') {
  const body = new URLSearchParams();
  const add = (prefix, v) => {
    if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) add(prefix ? `${prefix}[${k}]` : k, x);
    else if (v !== undefined) body.append(prefix, String(v));
  };
  add('', params);
  const r = await fetch(`https://api.stripe.com/v1/${path}${method === 'GET' ? `?${body}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : body,
  });
  const json = await r.json();
  if (!r.ok) throw new Error(json.error?.message || 'Stripe error');
  return json;
}

export async function createCheckout({ items, currency, email, successUrl, cancelUrl, metadata = {} }) {
  const line_items = Object.fromEntries(items.map((i, n) => [n, {
    quantity: i.qty,
    price_data: { currency: currency.toLowerCase(), unit_amount: Math.round(i.price * 100), product_data: { name: i.name } },
  }]));
  return stripe('checkout/sessions', {
    mode: 'payment', line_items, customer_email: email || undefined,
    success_url: successUrl, cancel_url: cancelUrl, metadata,
  });
}

export const retrieveCheckout = (id) => stripe(`checkout/sessions/${encodeURIComponent(id)}`, {}, 'GET');
