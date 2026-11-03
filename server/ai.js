// Claude-powered features: AI form builder, form translation and the conversational form agent.
// Requires ANTHROPIC_API_KEY (or another credential source the Anthropic SDK resolves).
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import { FIELD_TYPES, isInput } from '../shared/fields.js';
import { CONDITION_OPS, ACTION_TYPES } from '../shared/logic.js';
import { formEmails } from '../shared/emails.js';

const MODEL = process.env.AI_MODEL || 'claude-opus-5-5';
let client = null;
const anthropic = () => (client ||= new Anthropic());

export class AiUnavailable extends Error {}

// One structured call. Server-side fallbacks re-run a declined request on a fallback model.
async function structured(schema, { system, messages, effort = 'medium', maxTokens = 16000 }) {
  let response;
  try {
    response = await anthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: betaZodOutputFormat(schema) },
      system,
      messages,
    });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || /credentials|api key|apiKey/i.test(String(e.message))) {
      throw new AiUnavailable('AI is not configured. Set ANTHROPIC_API_KEY in .env and restart the server.');
    }
    if (e instanceof Anthropic.RateLimitError) throw new Error('The AI service is busy. Please try again in a moment.');
    if (e instanceof Anthropic.APIError) throw new Error(`AI request failed (${e.status}).`);
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new Error('The AI declined this request.');
  if (response.stop_reason === 'max_tokens' || !response.parsed_output) throw new Error('The AI response was incomplete. Try a shorter request.');
  return response.parsed_output;
}

// Widgets need a catalog key the generator doesn't know, so it sticks to basic elements.
const INPUT_TYPES = Object.keys(FIELD_TYPES).filter((t) => !FIELD_TYPES[t].display && t !== 'widget');
const BUILDABLE = [...INPUT_TYPES, 'heading', 'paragraph', 'divider', 'pagebreak'];

const FormSpec = z.object({
  title: z.string(),
  subtitle: z.string(),
  layout: z.enum(['classic', 'card']),
  primaryColor: z.string().describe('hex color like #2563eb'),
  thankYou: z.string(),
  fields: z.array(z.object({
    key: z.string().describe('unique snake_case id, referenced by formulas and logic'),
    type: z.enum(BUILDABLE),
    label: z.string(),
    required: z.boolean(),
    description: z.string(),
    options: z.array(z.string()).describe('choices for dropdown/radio/checkbox, rows for matrix; [] otherwise'),
    columns: z.array(z.string()).describe('columns for matrix; [] otherwise'),
    products: z.array(z.object({ name: z.string(), price: z.number(), description: z.string() })).describe('only for products; [] otherwise'),
    formula: z.string().describe('only for calculation, e.g. {qty} * 10; empty otherwise'),
  })),
  logic: z.array(z.object({
    match: z.enum(['all', 'any']),
    conditions: z.array(z.object({ field: z.string(), op: z.enum(Object.keys(CONDITION_OPS)), value: z.string() })),
    actions: z.array(z.object({ type: z.enum(['show', 'hide', 'require', 'unrequire', 'setValue', 'thankyou']), target: z.string(), value: z.string() })),
  })),
});

export async function generateForm(prompt) {
  const spec = await structured(FormSpec, {
    system: `You design online forms for a form builder. Field types: ${BUILDABLE.map((t) => `${t} (${FIELD_TYPES[t].label})`).join(', ')}.
Use fullname/email/phone/address for contact details rather than plain text. Use pagebreak to split long forms into steps.
Use logic rules sparingly, only where the request implies conditional questions: conditions and targets refer to field keys.
For "show" actions, the target field stays hidden until the rule fires. Keep labels short and natural.`,
    messages: [{ role: 'user', content: `Create a form for: ${prompt}` }],
  });
  return specToDefinition(spec);
}

export function specToDefinition(spec) {
  const used = new Set();
  const idOf = {};
  const fields = [{ id: 'title', type: 'heading', label: spec.title, subheading: spec.subtitle }];
  for (const f of spec.fields) {
    let id = String(f.key || f.label).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'field';
    while (used.has(id) || id === 'title') id += '_';
    used.add(id);
    idOf[f.key] = id;
    const base = { id, type: f.type, required: !!f.required, description: f.description || '', ...structuredClone(FIELD_TYPES[f.type].defaults), label: f.label };
    if (['dropdown', 'radio', 'checkbox'].includes(f.type) && f.options.length) base.options = f.options;
    if (f.type === 'matrix') { if (f.options.length) base.rows = f.options; if (f.columns.length) base.columns = f.columns; }
    if (f.type === 'products' && f.products.length) base.products = f.products.map((p, i) => ({ id: `p${i + 1}`, ...p }));
    if (f.type === 'calculation') base.formula = f.formula;
    fields.push(base);
  }
  // Formulas reference keys; rewrite them to the final ids.
  for (const f of fields) if (f.type === 'calculation') f.formula = String(f.formula || '').replace(/\{([^}]+)\}/g, (m, k) => (idOf[k.trim()] ? `{${idOf[k.trim()]}}` : m));
  const logic = spec.logic.map((r, i) => ({
    id: `r${i + 1}`,
    match: r.match,
    conditions: r.conditions.filter((c) => idOf[c.field]).map((c) => ({ ...c, field: idOf[c.field] })),
    actions: r.actions.filter((a) => a.type === 'thankyou' || idOf[a.target]).map((a) => ({ ...a, target: idOf[a.target] || '' })),
  })).filter((r) => r.conditions.length && r.actions.length);
  return {
    title: spec.title,
    layout: spec.layout,
    fields,
    logic,
    theme: { primary: /^#[0-9a-f]{6}$/i.test(spec.primaryColor) ? spec.primaryColor : '#2563eb', background: '#f3f3fe', text: '#2c3345', fieldBg: '#ffffff', font: 'Inter', width: 720, logo: '', css: '' },
    settings: { thankYou: { message: spec.thankYou || 'Thank you!', redirect: '' } },
  };
}

// Strings in a form that need translating, keyed "fieldId.prop" (options as "fieldId.options.N").
export function translatableStrings(def) {
  const out = {};
  for (const f of def.fields) {
    for (const k of ['label', 'description', 'placeholder', 'subheading', 'text', 'lowLabel', 'highLabel', 'yesLabel', 'noLabel']) if (f[k]) out[`${f.id}.${k}`] = f[k];
    for (const k of ['options', 'rows', 'columns']) if (Array.isArray(f[k])) f[k].forEach((o, i) => { out[`${f.id}.${k}.${i}`] = o; });
  }
  const s = def.settings || {};
  if (s.thankYou?.message) out['_form.thankYou'] = s.thankYou.message;
  if (s.submitLabel) out['_form.submitLabel'] = s.submitLabel;
  out['_form.title'] = def.title;
  return out;
}

export async function translateForm(def, language) {
  const strings = translatableStrings(def);
  const result = await structured(z.object({ items: z.array(z.object({ key: z.string(), text: z.string() })) }), {
    system: 'You translate user-facing text of online forms. Keep placeholders like {field} untouched. Return every key exactly once.',
    messages: [{ role: 'user', content: `Translate each value into ${language}:\n${JSON.stringify(strings)}` }],
  });
  return Object.fromEntries(result.items.filter((i) => i.key in strings).map((i) => [i.key, i.text]));
}

// --- Workflow AI steps (summarize, sentiment, categorize, custom prompt) -------
export async function aiText(instruction, content) {
  const out = await structured(z.object({ text: z.string() }), {
    system: 'You process form submissions inside an automated workflow. Reply with only the requested result, no preamble.',
    messages: [{ role: 'user', content: `${instruction}\n\n${content}` }],
    effort: 'low',
    maxTokens: 2000,
  });
  return out.text.trim();
}

// --- Conditions from a description ("Describe your conditions") --------------
const RuleSpec = z.object({
  rules: z.array(z.object({
    match: z.enum(['all', 'any']),
    conditions: z.array(z.object({ field: z.string(), op: z.enum(Object.keys(CONDITION_OPS)), value: z.string() })),
    actions: z.array(z.object({ type: z.enum(Object.keys(ACTION_TYPES)), target: z.string(), value: z.string() })),
  })),
});

export async function generateConditions(def, prompt) {
  const fields = def.fields.map((f) => ({ id: f.id, type: f.type, label: f.label, options: f.options || f.products?.map((p) => p.id) }));
  const emails = formEmails(def.settings).map((e) => ({ id: e.id, name: e.name }));
  const spec = await structured(RuleSpec, {
    system: `You turn plain-language requirements into conditional-logic rules for an online form.
Each rule: IF its conditions match (all/any) THEN run its actions. Use only the field ids given. Condition ops: ${Object.entries(CONDITION_OPS).map(([k, l]) => `${k} (${l})`).join(', ')}.
Actions: ${Object.entries(ACTION_TYPES).map(([k, l]) => `${k} (${l})`).join(', ')}.
For skipTo/hidePage the target is a pagebreak field id (or "end"). For emailTo the target is an e-mail id and value the address. For setOptions value is a newline list; for show/hideProducts value lists product ids. Use "" for unused value/target.`,
    messages: [{ role: 'user', content: `Fields: ${JSON.stringify(fields)}\nE-mails: ${JSON.stringify(emails)}\n\nRequirement: ${prompt}` }],
    effort: 'low',
    maxTokens: 4000,
  });
  const ids = new Set(def.fields.map((f) => f.id));
  return spec.rules
    .map((r, i) => ({ id: `r${Date.now().toString(36)}${i}`, match: r.match, conditions: r.conditions.filter((c) => ids.has(c.field)), actions: r.actions }))
    .filter((r) => r.conditions.length && r.actions.length);
}

// --- Conversational agent ---------------------------------------------------
const CHAT_UNSUPPORTED = ['file', 'signature', 'products', 'captcha', 'appointment', 'calculation', 'hidden', 'widget', 'donation', 'subscription', 'fillblank'];

export const chatFields = (def) => def.fields.filter((f) => isInput(f) && !CHAT_UNSUPPORTED.includes(f.type));

// Converts the agent's string answer into the value shape the form stores.
export function coerceAnswer(f, raw) {
  const v = String(raw ?? '').trim();
  if (!v) return undefined;
  const tryJson = () => { try { return JSON.parse(v); } catch { return null; } };
  switch (f.type) {
    case 'checkbox': return tryJson() || v.split(/\s*[,;]\s*/).filter(Boolean);
    case 'fullname': { const j = tryJson(); if (j) return j; const p = v.split(/\s+/); return { first: p[0], last: p.slice(1).join(' ') }; }
    case 'address': return tryJson() || { street: v };
    case 'matrix': return tryJson() || undefined;
    case 'rating': case 'scale': case 'slider': return Number(v.replace(/[^0-9.\-]/g, ''));
    case 'terms': return /^(true|yes|y|agree|accepted?)$/i.test(v);
    case 'yesno': return /^(y|yes|true)/i.test(v) ? 'Yes' : 'No';
    default: return v;
  }
}

const AgentTurn = z.object({
  reply: z.string().describe('your next message to the respondent'),
  answers: z.array(z.object({ fieldId: z.string(), value: z.string() })).describe('answers extracted from the latest user message'),
  done: z.boolean().describe('true when every required question has an answer and the user confirmed'),
});

export async function agentTurn(def, history, answers, errors = {}) {
  const fields = chatFields(def);
  const describe = (f) => {
    const extra = f.options?.length ? ` options: ${f.options.join(' | ')}` : f.type === 'matrix' ? ` rows: ${f.rows.join(' | ')}; columns: ${f.columns.join(' | ')}` : f.type === 'rating' ? ` 1-${f.stars}` : f.type === 'scale' ? ` ${f.from}-${f.to}` : '';
    return `- ${f.id} [${f.type}${f.required ? ', required' : ''}] "${f.label}"${extra}${f.description ? ` (${f.description})` : ''}`;
  };
  const persona = def.settings?.agent?.persona || 'friendly and concise';
  const system = `You are an assistant that fills in the form "${def.title}" by chatting with a respondent. Tone: ${persona}.
Ask one or two questions at a time, in order, and accept natural answers. Never invent answers.
Questions:\n${fields.map(describe).join('\n')}
Answer format: plain strings; checkbox = comma-separated choices from the options; fullname = JSON {"first","last"}; address = JSON {"street","city","state","zip","country"}; matrix = JSON {row: column}; date = YYYY-MM-DD; time = HH:MM; terms = "yes" once they agree.
Choice answers must use the exact option text. When all required questions are answered, summarise and ask for confirmation; set done only after the user confirms.`;
  const state = `Current answers: ${JSON.stringify(answers)}${Object.keys(errors).length ? `\nValidation problems to resolve with the user: ${JSON.stringify(errors)}` : ''}`;
  const msgs = history.slice(-30).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content).slice(0, 4000) }));
  if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: '(The respondent opened the chat.)' });
  msgs.push({ role: 'user', content: `[system note, not from the respondent] ${state}` });
  const out = await structured(AgentTurn, { system, messages: msgs, effort: 'low', maxTokens: 4000 });
  const byId = Object.fromEntries(fields.map((f) => [f.id, f]));
  const parsed = {};
  for (const a of out.answers) if (byId[a.fieldId]) { const v = coerceAnswer(byId[a.fieldId], a.value); if (v !== undefined) parsed[a.fieldId] = v; }
  return { reply: out.reply, answers: parsed, done: out.done };
}
