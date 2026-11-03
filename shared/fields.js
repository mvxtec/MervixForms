// Field catalog shared by builder, renderer and server-side validation.
import { WIDGET_BY_KEY, isDisplayWidget, formatWidget } from './widgets.js';

// Basic tab of the builder palette, in Jotform's order. Payment elements live on the Payments tab.
export const FIELD_GROUPS = [
  { name: 'Quick elements', types: ['heading', 'fullname', 'email', 'address', 'phone', 'date', 'appointment', 'signature', 'fillblank', 'products'] },
  { name: 'Basic elements', types: ['text', 'textarea', 'paragraph', 'dropdown', 'radio', 'checkbox', 'number', 'image', 'file', 'time', 'captcha', 'spinner', 'url', 'yesno', 'slider', 'calculation', 'hidden', 'terms'] },
  { name: 'Survey elements', types: ['matrix', 'rating', 'scale'] },
  { name: 'Page elements', types: ['divider', 'section', 'pagebreak'] },
];
export const PAYMENT_TYPES = ['products', 'donation', 'subscription'];

export const FIELD_TYPES = {
  heading: { label: 'Heading', icon: 'H', display: true, defaults: { label: 'Heading', subheading: '' } },
  paragraph: { label: 'Paragraph', icon: '¶', display: true, defaults: { label: 'Paragraph', text: 'Write some text here.' } },
  image: { label: 'Image', icon: '🖼', display: true, defaults: { label: 'Image', src: '', alt: '', width: 100 } },
  divider: { label: 'Divider', icon: '—', display: true, defaults: { label: 'Divider' } },
  pagebreak: { label: 'Page Break', icon: '⤓', display: true, defaults: { label: 'Page Break' } },
  section: { label: 'Section Collapse', icon: '▸', display: true, defaults: { label: 'Section', subheading: '', collapsed: false } },

  text: { label: 'Short Text', icon: 'T', defaults: { label: 'Short Text', placeholder: '', maxLength: '' } },
  textarea: { label: 'Long Text', icon: '≡', defaults: { label: 'Long Text', placeholder: '', rows: 4, maxLength: '' } },
  email: { label: 'Email', icon: '@', defaults: { label: 'Email', placeholder: 'example@example.com', confirm: false } },
  phone: { label: 'Phone', icon: '☎', defaults: { label: 'Phone Number', placeholder: '(000) 000-0000' } },
  url: { label: 'Website', icon: '🔗', defaults: { label: 'Website', placeholder: 'https://' } },
  number: { label: 'Number', icon: '#', defaults: { label: 'Number', min: '', max: '', step: 1, placeholder: '' } },
  fullname: { label: 'Full Name', icon: '👤', defaults: { label: 'Full Name', middle: false, prefix: false } },
  address: { label: 'Address', icon: '⌂', defaults: { label: 'Address' } },
  date: { label: 'Date', icon: '📅', defaults: { label: 'Date', minDate: '', maxDate: '', disablePast: false } },
  time: { label: 'Time', icon: '⏱', defaults: { label: 'Time' } },
  dropdown: { label: 'Dropdown', icon: '▾', defaults: { label: 'Dropdown', options: ['Option 1', 'Option 2', 'Option 3'], placeholder: 'Please Select' } },
  radio: { label: 'Single Choice', icon: '◉', defaults: { label: 'Single Choice', options: ['Option 1', 'Option 2', 'Option 3'], other: false, columns: 1 } },
  checkbox: { label: 'Multiple Choice', icon: '☑', defaults: { label: 'Multiple Choice', options: ['Option 1', 'Option 2', 'Option 3'], other: false, columns: 1, minSelect: '', maxSelect: '' } },
  file: { label: 'File Upload', icon: '⇪', defaults: { label: 'File Upload', multiple: false, accept: '', maxSizeMb: 10 } },

  rating: { label: 'Star Rating', icon: '★', defaults: { label: 'Star Rating', stars: 5 } },
  scale: { label: 'Scale Rating', icon: '⋯', defaults: { label: 'Scale Rating', from: 1, to: 5, lowLabel: 'Worst', highLabel: 'Best' } },
  slider: { label: 'Slider', icon: '⇔', defaults: { label: 'Slider', min: 0, max: 100, step: 1 } },
  matrix: { label: 'Input Table', icon: '▦', defaults: { label: 'Input Table', rows: ['Service Quality', 'Overall Hygiene'], columns: ['Not Satisfied', 'Somewhat Satisfied', 'Satisfied', 'Very Satisfied'] } },
  yesno: { label: 'Yes / No', icon: '⊘', defaults: { label: 'Yes / No', yesLabel: 'Yes', noLabel: 'No' } },

  products: {
    label: 'Product List', icon: '$', payment: true,
    defaults: {
      label: 'My Products', currency: 'USD', quantity: true, singleChoice: false,
      products: [{ id: 'p1', name: 'Product 1', price: 10, description: '' }, { id: 'p2', name: 'Product 2', price: 20, description: '' }],
    },
  },

  signature: { label: 'Signature', icon: '✍', defaults: { label: 'Signature' } },
  appointment: { label: 'Appointment', icon: '🗓', defaults: { label: 'Appointment', slots: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'], disablePast: true, oneBookingPerSlot: true } },
  calculation: { label: 'Form Calculation', icon: 'ƒ', defaults: { label: 'Total', formula: '', prefix: '', suffix: '', decimals: 2 } },
  hidden: { label: 'Hidden Field', icon: '◌', defaults: { label: 'Hidden', defaultValue: '', fromUrl: '' } },
  terms: { label: 'Terms & Conditions', icon: '✓', defaults: { label: 'Terms & Conditions', text: 'I agree to the terms and conditions.' } },
  captcha: { label: 'Captcha', icon: '🛡', defaults: { label: 'Please verify you are human' } },
  fillblank: { label: 'Fill in the Blank', icon: '__', defaults: { label: 'Fill in the blanks', text: 'My name is {blank} and I live in {blank}.' } },
  spinner: { label: 'Spinner', icon: '±', defaults: { label: 'Quantity', min: 0, max: 10, step: 1 } },
  donation: {
    label: 'Donation', icon: '♥', payment: true,
    defaults: { label: 'Donation', currency: 'INR', amounts: [500, 1000, 2500], custom: true, minAmount: 100, description: '' },
  },
  subscription: {
    label: 'Subscription', icon: '↻', payment: true,
    defaults: {
      label: 'Choose a plan', currency: 'INR',
      plans: [{ id: 's1', name: 'Monthly', price: 499, interval: 'month' }, { id: 's2', name: 'Yearly', price: 4999, interval: 'year' }],
    },
  },
  widget: { label: 'Widget', icon: '◆', defaults: {} },
};

export const isDisplay = (f) => !!FIELD_TYPES[f.type]?.display || (f.type === 'widget' && isDisplayWidget(f));
export const isInput = (f) => !isDisplay(f);

let seq = 0;
export function newField(type) {
  const meta = FIELD_TYPES[type];
  seq = (seq + 1) % 1000;
  const id = `q${Date.now().toString(36)}${seq}`;
  const defaults = JSON.parse(JSON.stringify(meta.defaults));
  return { id, type, required: false, description: '', ...defaults };
}

// A palette widget becomes either a widget field or (for aliases) a basic element with preset settings.
export function newWidget(key) {
  const w = WIDGET_BY_KEY[key];
  if (!w || w.soon) return null;
  if (w.kind === 'alias') return { ...newField(w.type), ...JSON.parse(JSON.stringify(w.defaults)) };
  const f = newField('widget');
  return { ...f, widget: key, label: w.label, ...JSON.parse(JSON.stringify(w.defaults)) };
}

// Display name of a field's type (widgets show their own name).
export const typeLabel = (f) => (f.type === 'widget' ? WIDGET_BY_KEY[f.widget]?.label || 'Widget' : FIELD_TYPES[f.type]?.label || f.type);

export function isEmpty(v) {
  if (v === undefined || v === null || v === '') return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') {
    if ('items' in v) return !v.items || v.items.length === 0; // products
    return Object.values(v).every(isEmpty);
  }
  return false;
}

// Human-readable string for any stored value (tables, emails, CSV, PDFs).
export function formatValue(field, v) {
  if (isEmpty(v)) return '';
  switch (field?.type) {
    case 'fullname': return [v.prefix, v.first, v.middle, v.last].filter(Boolean).join(' ');
    case 'address': return [v.street, v.street2, v.city, v.state, v.zip, v.country].filter(Boolean).join(', ');
    case 'checkbox': return Array.isArray(v) ? v.join(', ') : String(v);
    case 'matrix': return Object.entries(v).map(([r, c]) => `${r}: ${c}`).join('; ');
    case 'file': return (Array.isArray(v) ? v : [v]).map((f) => f.name).join(', ');
    case 'signature': return '[signed]';
    case 'terms': return v ? 'Accepted' : '';
    case 'rating': return `${v} / ${field.stars}`;
    case 'appointment': return `${v.date} ${v.slot}`;
    case 'products':
      return (Array.isArray(v.items) ? v.items : []).map((i) => `${i?.name} x${i?.qty}`).join(', ') + ` — ${v.currency || ''} ${Number(v.total || 0).toFixed(2)}`;
    case 'donation': return `${v.currency || field.currency || ''} ${Number(v.amount || 0).toFixed(2)}`;
    case 'subscription': {
      const plan = (field.plans || []).find((p) => p.id === v.plan);
      return plan ? `${plan.name} — ${field.currency} ${plan.price} / ${plan.interval}` : String(v.plan || '');
    }
    case 'fillblank': return Object.keys(v).sort((a, b) => a - b).map((k) => v[k]).join(' / ');
    case 'widget': return formatWidget(field, v);
    default: return typeof v === 'object' ? JSON.stringify(v) : String(v);
  }
}
