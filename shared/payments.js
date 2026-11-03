// Payment gateway catalog for the builder's Payments tab. `ready` gateways work today;
// the rest are listed so owners can see what's coming (each needs its own API integration).
export const GATEWAYS = [
  { key: 'test', name: 'Test mode', note: 'Simulated payments, marked paid instantly', ready: true },
  { key: 'stripe', name: 'Stripe Checkout', note: 'Cards, wallets and subscriptions (set STRIPE_SECRET_KEY)', ready: true },
  { key: 'purchaseOrder', name: 'Purchase Order', note: 'Collect the order now, invoice later', ready: true },
  { key: 'razorpay', name: 'Razorpay', note: 'UPI, cards, net banking (India) — next up', india: true },
  { key: 'cashfree', name: 'Cashfree', note: 'UPI and cards (India)', india: true },
  { key: 'payuIndia', name: 'PayU India', note: 'UPI and cards (India)', india: true },
  { key: 'square', name: 'Square' }, { key: 'paypal', name: 'PayPal' }, { key: 'authorizeNet', name: 'Authorize.Net' },
  { key: 'stripeElements', name: 'Stripe (embedded card fields)' }, { key: 'mollie', name: 'Mollie' }, { key: 'moneris', name: 'Moneris' },
  { key: 'clover', name: 'Clover' }, { key: 'braintree', name: 'Braintree' }, { key: 'eway', name: 'Eway' }, { key: 'cardpointe', name: 'CardPointe' },
  { key: 'cybersource', name: 'CyberSource' }, { key: 'payjunction', name: 'PayJunction' }, { key: 'venmo', name: 'Venmo' },
  { key: 'cashApp', name: 'Cash App Pay' }, { key: 'afterpay', name: 'Afterpay' }, { key: 'clearpay', name: 'Clearpay' },
  { key: 'appleGooglePay', name: 'Apple Pay & Google Pay' }, { key: 'echeck', name: 'eCheck.Net' }, { key: 'bluepay', name: 'BluePay' },
  { key: 'payu', name: 'PayU' }, { key: 'worldpayUk', name: 'Worldpay UK' }, { key: 'gocardless', name: 'GoCardless' }, { key: 'payfast', name: 'Payfast' },
  { key: 'chargify', name: 'Chargify' }, { key: 'paymentwall', name: 'Paymentwall' }, { key: 'iyzico', name: 'iyzico' }, { key: 'skrill', name: 'Skrill' },
  { key: '2checkout', name: '2Checkout' }, { key: 'paysafe', name: 'Paysafe' }, { key: 'bluesnap', name: 'BlueSnap' }, { key: 'sensepass', name: 'SensePass' },
];
