// Conditional logic engine, page splitting and validation. Runs identically in the
// browser (live form behaviour) and on the server (authoritative validation).
import { evaluateFormula, toNumber } from './formula.js';
import { isEmpty, isInput } from './fields.js';
import { widgetKind, computeWidget, validateWidget, maskMatches } from './widgets.js';

// Fields filled automatically and never shown (hidden fields, metadata widgets).
export const isAutoField = (f) => f.type === 'hidden' || (f.type === 'widget' && ['meta', 'uniqueId'].includes(widgetKind(f)));
const isComputed = (f) => f.type === 'calculation' || (f.type === 'widget' && widgetKind(f) === 'calc');

export const CONDITION_OPS = {
  equals: 'is equal to',
  notEquals: 'is not equal to',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  gt: 'is greater than',
  lt: 'is less than',
  isFilled: 'is filled',
  isEmpty: 'is empty',
};

export const ACTION_TYPES = {
  show: 'Show field',
  hide: 'Hide field',
  require: 'Require field',
  unrequire: 'Make field optional',
  enable: 'Enable field',
  disable: 'Disable field',
  mask: 'Set input mask',
  setValue: 'Set / calculate value',
  setOptions: 'Update options',
  showProducts: 'Show products',
  hideProducts: 'Hide products',
  skipTo: 'Skip to page',
  hidePage: 'Hide page',
  thankyou: 'Change thank-you message',
  redirect: 'Redirect to URL',
  emailTo: 'Change e-mail recipient',
  runWorkflow: 'Run workflow',
};

// Condition types offered when adding a condition (Jotform's "New condition" screen); each maps to a set of actions.
export const CONDITION_TYPES = [
  { key: 'visibility', title: 'Show/Hide Field', desc: 'Change visibility of specific form fields', actions: ['show', 'hide'] },
  { key: 'calculate', title: 'Update/Calculate Field', desc: "Copy a field's value or perform calculations", actions: ['setValue'] },
  { key: 'state', title: 'Enable/Require/Mask Field', desc: 'Require or disable a field, or set a mask', actions: ['require', 'unrequire', 'enable', 'disable', 'mask'] },
  { key: 'options', title: 'Update Options', desc: 'Change dropdown, single-choice and multiple-choice options', actions: ['setOptions'], isNew: true },
  { key: 'products', title: 'Update Product List', desc: 'Show or hide products in a payment field', actions: ['showProducts', 'hideProducts'], isNew: true },
  { key: 'page', title: 'Skip to/Hide a Page', desc: 'Skip to or hide a specific page', actions: ['skipTo', 'hidePage'] },
  { key: 'thankyou', title: 'Change Thank You Page', desc: 'Customize your thank-you page action', actions: ['thankyou', 'redirect'] },
  { key: 'email', title: 'Change Email Recipient', desc: 'Send e-mails to specific people', actions: ['emailTo'] },
  { key: 'workflow', title: 'Run Workflow', desc: 'Trigger a workflow when a condition is met', actions: ['runWorkflow'], isNew: true },
];

// Which page (0-based) each field sits on in a classic layout, and the page each page break starts.
function pageIndex(fields) {
  const byField = {}, byBreak = {};
  let page = 0;
  for (const f of fields) {
    if (f.type === 'pagebreak') { page++; byBreak[f.id] = page; } else byField[f.id] = page;
  }
  return { byField, byBreak };
}

const str = (v) => (Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v ? JSON.stringify(v) : String(v ?? '')).toLowerCase();

export function testCondition(c, values) {
  const v = values[c.field];
  const target = String(c.value ?? '').toLowerCase();
  switch (c.op) {
    case 'equals': return Array.isArray(v) ? v.map((x) => String(x).toLowerCase()).includes(target) : str(v) === target;
    case 'notEquals': return Array.isArray(v) ? !v.map((x) => String(x).toLowerCase()).includes(target) : str(v) !== target;
    case 'contains': return str(v).includes(target);
    case 'notContains': return !str(v).includes(target);
    case 'startsWith': return str(v).startsWith(target);
    case 'endsWith': return str(v).endsWith(target);
    case 'gt': return toNumber(v) > toNumber(c.value);
    case 'lt': return toNumber(v) < toNumber(c.value);
    case 'isFilled': return !isEmpty(v);
    case 'isEmpty': return isEmpty(v);
    default: return false;
  }
}

export function ruleFires(rule, values) {
  const conds = rule.conditions || [];
  if (!conds.length) return false;
  return rule.match === 'any' ? conds.some((c) => testCondition(c, values)) : conds.every((c) => testCondition(c, values));
}

// Returns derived state for the current values: computed values, hidden & required sets, overrides.
export function computeState(def, rawValues) {
  const fields = def.fields || [];
  const rules = (def.logic || []).filter((r) => !r.disabled);
  const values = { ...rawValues };
  const byId = Object.fromEntries(fields.map((f) => [f.id, f]));

  // Calculations may depend on each other; a few passes settle chains.
  const settle = () => {
    for (let pass = 0; pass < 3; pass++) {
      for (const f of fields) {
        if (f.type === 'calculation') values[f.id] = evaluateFormula(f.formula, values);
        else if (f.type === 'widget' && widgetKind(f) === 'calc') values[f.id] = computeWidget(f, values);
      }
    }
  };
  settle();

  const hidden = new Set(fields.filter((f) => f.hiddenByDefault).map((f) => f.id));
  const required = new Set(fields.filter((f) => f.required).map((f) => f.id));
  const showTargets = new Set();
  const shown = new Set();
  let thankYou = null;
  let redirect = null;
  const skips = [];
  const disabled = new Set();
  const masks = {};
  const options = {};
  const hiddenProducts = {};
  const shownProducts = {};
  const hiddenPages = new Set();
  const emailTo = {};
  const workflows = [];
  const list = (v) => (Array.isArray(v) ? v : String(v || '').split(/\n|,/)).map((x) => String(x).trim()).filter(Boolean);

  for (const r of rules) for (const a of r.actions || []) if (a.type === 'show') showTargets.add(a.target);

  for (const r of rules) {
    if (!ruleFires(r, values)) continue;
    for (const a of r.actions || []) {
      switch (a.type) {
        case 'show': shown.add(a.target); break;
        case 'hide': hidden.add(a.target); break;
        case 'require': required.add(a.target); break;
        case 'unrequire': required.delete(a.target); break;
        case 'setValue':
          if (byId[a.target]) values[a.target] = /[{}+\-*/()]/.test(a.value || '') ? evaluateFormula(a.value, values) : a.value;
          break;
        case 'skipTo': skips.push({ target: a.target, from: (r.conditions || []).map((c) => c.field) }); break;
        case 'thankyou': thankYou = a.value; break;
        case 'redirect': redirect = a.value; break;
        case 'enable': disabled.delete(a.target); break;
        case 'disable': disabled.add(a.target); break;
        case 'mask': masks[a.target] = a.value; break;
        case 'setOptions': options[a.target] = list(a.value); break;
        case 'hideProducts': hiddenProducts[a.target] = new Set([...(hiddenProducts[a.target] || []), ...list(a.value)]); break;
        case 'showProducts': shownProducts[a.target] = new Set([...(shownProducts[a.target] || []), ...list(a.value)]); break;
        case 'hidePage': hiddenPages.add(a.target); break;
        case 'emailTo': emailTo[a.target] = a.value; break;
        case 'runWorkflow': if (a.target) workflows.push(a.target); break;
      }
    }
  }
  settle();
  for (const id of showTargets) if (!shown.has(id)) hidden.add(id);
  for (const id of shown) hidden.delete(id);
  for (const f of fields) if (isAutoField(f)) hidden.add(f.id);
  // "Show products" rules: listed products start hidden until a rule shows them.
  for (const r of rules) for (const a of r.actions || []) {
    if (a.type !== 'showProducts') continue;
    for (const id of list(a.value)) if (!shownProducts[a.target]?.has(id)) (hiddenProducts[a.target] ||= new Set()).add(id);
  }
  if (hiddenPages.size) {
    const { byField, byBreak } = pageIndex(fields);
    const pages = new Set([...hiddenPages].map((id) => byBreak[id]).filter((x) => x != null));
    for (const f of fields) if (pages.has(byField[f.id])) hidden.add(f.id);
  }
  for (const id of disabled) required.delete(id);

  return { values, hidden, required, thankYou, redirect, skips, disabled, masks, options, hiddenProducts, emailTo, workflows };
}

// Pages: classic layout splits on page breaks; card layout puts each visible element on its own page.
export function buildPages(def) {
  const fields = def.fields || [];
  if (def.layout === 'card') return fields.filter((f) => f.type !== 'pagebreak' && f.type !== 'section' && !isAutoField(f)).map((f) => [f]);
  const pages = [[]];
  for (const f of fields) {
    if (f.type === 'pagebreak') pages.push([]);
    else pages[pages.length - 1].push(f);
  }
  return pages.filter((p, i) => p.length || i === 0);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateField(f, v, state) {
  if (state.hidden.has(f.id) || !isInput(f) || isComputed(f)) return null;
  const req = state.required.has(f.id);
  if (f.type === 'fullname' && req && (isEmpty(v?.first) || isEmpty(v?.last))) return 'First and last name are required.';
  if (f.type === 'address' && req && (isEmpty(v?.street) || isEmpty(v?.city))) return 'Street and city are required.';
  if (f.type === 'terms' && req && !v) return 'You must accept to continue.';
  if (f.type === 'matrix' && req && Object.keys(v || {}).length < (f.rows || []).length) return 'Please answer every row.';
  if (f.type === 'appointment' && req && (!v?.date || !v?.slot)) return 'Please pick a date and time.';
  if (f.type === 'fillblank' && req && blanks(f) > Object.values(v || {}).filter((x) => !isEmpty(x)).length) return 'Please fill in every blank.';
  if (f.type === 'donation' && req && !(Number(v?.amount) > 0)) return 'Please choose an amount.';
  if (f.type === 'widget' && widgetKind(f) === 'idpin' && req && !v?.id) return 'Please enter your ID.';
  if (req && isEmpty(v)) return 'This field is required.';
  if (isEmpty(v)) return null;
  if (state.masks?.[f.id] && !maskMatches(state.masks[f.id], String(v))) return `Use the format ${state.masks[f.id]}.`;
  switch (f.type) {
    case 'email':
      if (!EMAIL_RE.test(String(v))) return 'Enter a valid e-mail address.';
      break;
    case 'url':
      if (!/^https?:\/\/\S+\.\S+/.test(String(v))) return 'Enter a valid URL (https://…).';
      break;
    case 'phone':
      if (String(v).replace(/\D/g, '').length < 7) return 'Enter a valid phone number.';
      break;
    case 'number': {
      const n = Number(v);
      if (!Number.isFinite(n)) return 'Enter a number.';
      if (f.min !== '' && f.min != null && n < Number(f.min)) return `Minimum is ${f.min}.`;
      if (f.max !== '' && f.max != null && n > Number(f.max)) return `Maximum is ${f.max}.`;
      break;
    }
    case 'text':
    case 'textarea':
      if (f.maxLength && String(v).length > Number(f.maxLength)) return `Maximum ${f.maxLength} characters.`;
      break;
    case 'checkbox':
      if (f.minSelect && v.length < Number(f.minSelect)) return `Select at least ${f.minSelect}.`;
      if (f.maxSelect && v.length > Number(f.maxSelect)) return `Select at most ${f.maxSelect}.`;
      break;
    case 'date':
      if (f.minDate && v < f.minDate) return `Date must be on or after ${f.minDate}.`;
      if (f.maxDate && v > f.maxDate) return `Date must be on or before ${f.maxDate}.`;
      break;
    case 'spinner': {
      const n = Number(v);
      if (!Number.isFinite(n)) return 'Enter a number.';
      if (f.min !== '' && f.min != null && n < Number(f.min)) return `Minimum is ${f.min}.`;
      if (f.max !== '' && f.max != null && n > Number(f.max)) return `Maximum is ${f.max}.`;
      break;
    }
    case 'donation':
      if (!(Number(v.amount) > 0)) return 'Please choose an amount.';
      if (f.minAmount && Number(v.amount) < Number(f.minAmount)) return `The minimum is ${f.currency} ${f.minAmount}.`;
      break;
    case 'subscription':
      if (!(f.plans || []).some((pl) => pl.id === v.plan)) return 'Please choose a plan.';
      break;
    case 'widget':
      return validateWidget(f, v, state.values);
    case 'captcha':
      if (Number(v?.a) + Number(v?.b) !== Number(v?.answer)) return 'Captcha answer is incorrect.';
      break;
  }
  return null;
}

export function validateAll(def, rawValues, fieldsSubset) {
  const state = computeState(def, rawValues);
  const errors = {};
  for (const f of fieldsSubset || def.fields || []) {
    const e = validateField(f, state.values[f.id], state);
    if (e) errors[f.id] = e;
  }
  return { errors, state };
}

// Products total (server recomputes; never trusts client total).
export function productTotal(field, value) {
  if (!value?.items) return 0;
  const byId = Object.fromEntries((field.products || []).map((p) => [p.id, p]));
  return value.items.reduce((s, i) => s + (byId[i.id] ? Number(byId[i.id].price) * Math.max(1, Number(i.qty) || 1) : 0), 0);
}

// Number of {blank} slots in a Fill in the Blank element.
export const blanks = (f) => (String(f.text || '').match(/{blank}/g) || []).length;
