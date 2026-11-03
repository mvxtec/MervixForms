import { Router } from 'express';
import { db, parseForm } from '../db.js';
import { requireAuth, requireRole } from '../auth.js';
import { generateForm, translateForm, agentTurn, chatFields, AiUnavailable } from '../ai.js';

const r = Router();

const fail = (res, e) => res.status(e instanceof AiUnavailable ? 503 : 502).json({ error: e.message });

r.post('/ai/form', requireAuth, requireRole('editor'), async (req, res) => {
  const prompt = String(req.body?.prompt || '').trim();
  if (prompt.length < 5) return res.status(400).json({ error: 'Describe the form you need (a sentence is enough).' });
  try { res.json({ definition: await generateForm(prompt.slice(0, 4000)) }); } catch (e) { fail(res, e); }
});

r.post('/ai/translate', requireAuth, requireRole('editor'), async (req, res) => {
  const form = parseForm(db.prepare('SELECT * FROM forms WHERE id = ? AND user_id = ?').get(req.body?.formId, req.ws.id));
  if (!form) return res.status(404).json({ error: 'Form not found' });
  const language = String(req.body?.language || '').trim();
  if (!language) return res.status(400).json({ error: 'Choose a language' });
  try { res.json({ strings: await translateForm(req.body?.definition || form.definition, language) }); } catch (e) { fail(res, e); }
});

// Public conversational agent for a published form (enabled per form in Settings → AI Agent).
r.post('/public/forms/:id/agent', async (req, res) => {
  const form = parseForm(db.prepare('SELECT * FROM forms WHERE id = ?').get(req.params.id));
  if (!form || form.status !== 'enabled') return res.status(404).json({ error: 'Form not found' });
  const s = form.definition.settings || {};
  if (!s.agent?.enabled) return res.status(403).json({ error: 'The AI assistant is not enabled for this form.' });
  if (s.password && req.body?.password !== s.password) return res.status(403).json({ error: 'Password required' });
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  if (history.length > 80) return res.status(400).json({ error: 'Conversation too long. Please use the regular form.' });
  try {
    const turn = await agentTurn(form.definition, history, req.body?.answers || {}, req.body?.errors || {});
    const unsupported = form.definition.fields.filter((f) => f.required && ['file', 'signature', 'products', 'appointment'].includes(f.type)).map((f) => f.label);
    res.json({ ...turn, chatFieldIds: chatFields(form.definition).map((f) => f.id), needsForm: unsupported });
  } catch (e) { fail(res, e); }
});

export default r;
