// Workflow engine. A workflow is a tree of steps; branching steps hold `branches: [{label, steps}]`.
// A run keeps a cursor (path) into that tree: [stepIndex, branchIndex, stepIndex, …]. Steps that wait
// (approval, task, wait, pause, scheduled e-mail) park the run; decisions or the scheduler resume it.
import crypto from 'node:crypto';
import { db, parseForm, parseSub } from './db.js';
import { deliver, renderHtml, BASE_URL, sendWhatsApp, sendSms, postJson } from './notify.js';
import { submissionPdf } from './pdf.js';
import { testCondition } from '../shared/logic.js';
import { evaluateFormula } from '../shared/formula.js';
import { formatValue, isInput } from '../shared/fields.js';
import { aiText } from './ai.js';

const token = () => crypto.randomBytes(18).toString('base64url');
const now = () => new Date().toISOString().replace('T', ' ').slice(0, 19);
export const parseWorkflow = (row) => row && ({ ...row, definition: JSON.parse(row.definition) });
const parseRun = (row) => row && ({ ...row, cursor: JSON.parse(row.cursor), vars: JSON.parse(row.vars), log: JSON.parse(row.log) });

// ── Tree navigation ──
export function getStep(steps, path) {
  let list = steps, step = null;
  for (let k = 0; k < path.length; k += 2) {
    step = list?.[path[k]];
    if (!step) return null;
    if (k + 1 < path.length) list = step.branches?.[path[k + 1]]?.steps;
  }
  return step;
}

function nextPath(steps, path) {
  let p = [...path];
  p[p.length - 1]++;
  for (;;) {
    if (getStep(steps, p)) return p;
    if (p.length === 1) return null;
    // Finished a branch. Split runs its branches one after another; others continue after the parent step.
    const parentPath = p.slice(0, -2), branchIdx = p[p.length - 2], parent = getStep(steps, parentPath);
    if (parent?.type === 'split') {
      for (let b = branchIdx + 1; b < parent.branches.length; b++) if (parent.branches[b].steps.length) return [...parentPath, b, 0];
    }
    p = [...parentPath];
    p[p.length - 1]++;
  }
}

function enterBranch(steps, path, b) {
  const step = getStep(steps, path);
  return step.branches?.[b]?.steps.length ? [...path, b, 0] : nextPath(steps, path);
}

// ── Templating ──
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const respondentEmail = (form, data) => {
  const f = form.definition.fields.find((x) => x.type === 'email' && data[x.id]);
  return f ? String(data[f.id]) : '';
};
function render(ctx, tpl, html = true) {
  const withVars = String(tpl || '').replace(/\{([\w-]+)\}/g, (m, k) => {
    if (k === 'tracking_link') return `${BASE_URL()}/#/track/${ctx.run.token}`;
    if (k in ctx.vars) return html ? esc(ctx.vars[k]) : String(ctx.vars[k]);
    return m;
  });
  const out = renderHtml(withVars, ctx.form, ctx.data, { inbox_link: `${BASE_URL()}/#/forms/${ctx.form.id}/inbox/${ctx.sub.id}`, submission_id: ctx.sub.id });
  return html ? out : out.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}
function recipients(ctx, to, fallbackOwner = true) {
  const out = [];
  for (const part of String(to || '').split(/[,;]+/).map((x) => x.trim()).filter(Boolean)) {
    if (part === '{respondent}') out.push(respondentEmail(ctx.form, ctx.data));
    else if (/^\{[\w-]+\}$/.test(part)) out.push(String(ctx.data[part.slice(1, -1)] ?? ''));
    else out.push(part);
  }
  const valid = out.filter((x) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
  return valid.length || !fallbackOwner ? valid : [ctx.owner.email];
}
const answersText = (ctx) => ctx.form.definition.fields.filter(isInput).map((f) => `${f.label}: ${formatValue(f, ctx.data[f.id]) || '-'}`).join('\n');
const mail = (ctx, to, subject, bodyHtml, attachments) => {
  const list = recipients(ctx, to);
  if (list.length) deliver(ctx.owner.id, ctx.form.id, list.join(', '), render(ctx, subject, false), '', attachments, { html: `<div style="font-family:Arial,sans-serif;max-width:640px;color:#18181b">${render(ctx, bodyHtml)}</div>` });
};
const delayMs = (amount, unit) => Number(amount || 0) * ({ minutes: 6e4, hours: 36e5, days: 864e5, weeks: 6048e5 }[unit] || 36e5);

// ── Step handlers: return { next } | { branch } | { wait, resumeAt? } | { end } ──
const HANDLERS = {
  async email(ctx, s) { mail(ctx, s.to || '{respondent}', s.subject, s.body); return { next: true, note: 'E-mail sent' }; },
  async trackingEmail(ctx, s) {
    mail(ctx, s.to || '{respondent}', s.subject || 'Track your request', `<p>Thanks for your submission to <b>{form_title}</b>.</p><p>You can follow its progress here:</p><p><a href="{tracking_link}">Track your request</a></p>`);
    return { next: true, note: 'Tracking e-mail sent' };
  },
  async scheduledEmail(ctx, s) {
    const flag = `_waited_${s.id}`;
    if (!ctx.vars[flag]) { ctx.vars[flag] = true; return { wait: true, resumeAt: new Date(Date.now() + delayMs(s.amount, s.unit)), note: `Scheduled for ${s.amount} ${s.unit}` }; }
    delete ctx.vars[flag];
    mail(ctx, s.to || '{respondent}', s.subject, s.body);
    return { next: true, note: 'Scheduled e-mail sent' };
  },
  async sendPdf(ctx, s) {
    const pdf = Buffer.from(await submissionPdf(ctx.form, ctx.sub));
    mail(ctx, s.to || ctx.owner.email, s.subject, '<p>The submission PDF for <b>{form_title}</b> is attached.</p>', [{ filename: `submission-${ctx.sub.id}.pdf`, content: pdf, contentType: 'application/pdf' }]);
    return { next: true, note: 'PDF sent' };
  },
  async approval(ctx, s) { return requestApproval(ctx, s, 'approval'); },
  async teamApproval(ctx, s) { return requestApproval(ctx, s, 'approval'); },
  async task(ctx, s) {
    const assignee = recipients(ctx, s.assignee)[0];
    const t = token();
    db.prepare("INSERT INTO workflow_tasks (run_id, node_id, kind, assignee, token) VALUES (?, ?, 'task', ?, ?)").run(ctx.run.id, s.id, assignee, t);
    const title = render(ctx, s.title || 'Task', false);
    deliver(ctx.owner.id, ctx.form.id, assignee, `Task: ${title}`, '', undefined, { html: `<p>You have a new task: <b>${esc(title)}</b></p>${s.details ? `<p>${esc(render(ctx, s.details, false))}</p>` : ''}<p><a href="${BASE_URL()}/#/wf-task/${t}">Open the task</a></p>` });
    return { wait: true, note: `Task assigned to ${assignee}` };
  },
  async webhook(ctx, s) {
    if (!/^https:\/\//.test(s.url || '')) return { next: true, note: 'Skipped: no https URL' };
    await postJson(ctx.form, s.url, { event: 'workflow.step', workflowId: ctx.wf.id, runId: ctx.run.id, submissionId: ctx.sub.id, formId: ctx.form.id, data: ctx.data, vars: ctx.vars });
    return { next: true, note: 'Webhook called' };
  },
  async slack(ctx, s) { if (/^https:\/\//.test(s.url || '')) await postJson(ctx.form, s.url, { text: render(ctx, s.message, false) }); return { next: true, note: 'Slack message sent' }; },
  async teams(ctx, s) { if (/^https:\/\//.test(s.url || '')) await postJson(ctx.form, s.url, { text: render(ctx, s.message, false) }); return { next: true, note: 'Teams message sent' }; },
  async sms(ctx, s) { for (const to of String(s.to || '').split(',').map((x) => x.trim()).filter(Boolean)) await sendSms(ctx.owner, ctx.form, to, render(ctx, s.message, false)); return { next: true, note: 'SMS sent' }; },
  async whatsapp(ctx, s) { for (const to of String(s.to || '').split(',').map((x) => x.trim()).filter(Boolean)) await sendWhatsApp(ctx.owner, ctx.form, to, render(ctx, s.message, false)); return { next: true, note: 'WhatsApp sent' }; },
  async verifyPayment(ctx) { return { branch: ctx.sub.payment?.status === 'paid' ? 0 : 1, note: `Payment ${ctx.sub.payment?.status || 'none'}` }; },
  async ifElse(ctx, s) { const yes = testCondition(s, { ...ctx.data, ...ctx.vars }); return { branch: yes ? 0 : 1, note: yes ? 'Condition met' : 'Condition not met' }; },
  async branch(ctx, s) {
    const i = (s.rules || []).findIndex((r) => r.field && testCondition(r, { ...ctx.data, ...ctx.vars }));
    return { branch: i >= 0 ? i : s.branches.length - 1, note: i >= 0 ? `Matched ${s.rules[i].label}` : 'No match' };
  },
  async split() { return { branch: 0, note: 'Running branches' }; },
  async setStatus(ctx, s) { ctx.label = s.status || 'In Progress'; return { next: true, note: `Status: ${ctx.label}` }; },
  async wait(ctx, s) {
    const flag = `_waited_${s.id}`;
    if (!ctx.vars[flag]) { ctx.vars[flag] = true; return { wait: true, resumeAt: new Date(Date.now() + delayMs(s.amount, s.unit)), note: `Waiting ${s.amount} ${s.unit}` }; }
    delete ctx.vars[flag];
    return { next: true, note: 'Wait finished' };
  },
  async pause(ctx, s) {
    const flag = `_waited_${s.id}`;
    if (!ctx.vars[flag]) { ctx.vars[flag] = true; return { wait: true, note: 'Paused until resumed by the owner' }; }
    delete ctx.vars[flag];
    return { next: true, note: 'Resumed' };
  },
  async end() { return { end: true, note: 'Ended' }; },
  async idGenerator(ctx, s) {
    const n = db.prepare('SELECT COUNT(*) n FROM workflow_runs WHERE workflow_id = ? AND id <= ?').get(ctx.wf.id, ctx.run.id).n;
    ctx.vars[s.name || 'id'] = `${s.prefix || ''}${String(n).padStart(Number(s.digits) || 5, '0')}`;
    return { next: true, note: `${s.name} = ${ctx.vars[s.name || 'id']}` };
  },
  async updateValue(ctx, s) {
    if (!s.field) return { next: true, note: 'Skipped: no field' };
    ctx.data[s.field] = render(ctx, s.value, false);
    db.prepare("UPDATE submissions SET data = ?, updated_at = datetime('now') WHERE id = ?").run(JSON.stringify(ctx.data), ctx.sub.id);
    return { next: true, note: `Updated ${s.field}` };
  },
  async calculate(ctx, s) { ctx.vars[s.name || 'result'] = evaluateFormula(s.formula, { ...ctx.data, ...ctx.vars }); return { next: true, note: `${s.name} = ${ctx.vars[s.name || 'result']}` }; },
  summarize: (ctx, s) => aiStep(ctx, s, 'Summarize this form submission in two sentences.', answersText(ctx)),
  sentiment: (ctx, s) => aiStep(ctx, s, 'Classify the sentiment as exactly one word: Positive, Neutral or Negative.', s.field ? String(formatValue(ctx.form.definition.fields.find((f) => f.id === s.field), ctx.data[s.field]) || '') : answersText(ctx)),
  categorize: (ctx, s) => aiStep(ctx, s, `Pick exactly one category from this list and reply with it only:\n${s.categories}`, s.field ? String(ctx.data[s.field] ?? '') : answersText(ctx)),
  customPrompt: (ctx, s) => aiStep(ctx, s, render(ctx, s.prompt, false), ''),
};

async function aiStep(ctx, s, instruction, content) {
  try { ctx.vars[s.name || 'ai'] = await aiText(instruction, content); return { next: true, note: `${s.name} = ${String(ctx.vars[s.name || 'ai']).slice(0, 80)}` }; } catch (e) {
    ctx.vars[s.name || 'ai'] = '';
    return { next: true, note: `AI step skipped: ${e.message}` };
  }
}

function requestApproval(ctx, s) {
  const approvers = recipients(ctx, s.approvers);
  for (const email of approvers) {
    const t = token();
    db.prepare("INSERT INTO workflow_tasks (run_id, node_id, kind, assignee, token) VALUES (?, ?, 'approval', ?, ?)").run(ctx.run.id, s.id, email, t);
    deliver(ctx.owner.id, ctx.form.id, email, `Approval needed: ${ctx.form.title} #${ctx.sub.id}`, '', undefined, {
      html: `<p>${esc(render(ctx, s.message || 'Please review this submission.', false))}</p>${renderHtml('{all_fields}', ctx.form, ctx.data)}<p><a href="${BASE_URL()}/#/wf-task/${t}">Approve or reject</a></p>`,
    });
  }
  db.prepare("UPDATE submissions SET approval = 'pending' WHERE id = ?").run(ctx.sub.id);
  return { wait: true, note: `Waiting for ${approvers.join(', ')}` };
}

// ── Running ──
function loadContext(runId) {
  const run = parseRun(db.prepare('SELECT * FROM workflow_runs WHERE id = ?').get(runId));
  if (!run) return null;
  const wf = parseWorkflow(db.prepare('SELECT * FROM workflows WHERE id = ?').get(run.workflow_id));
  const sub = parseSub(db.prepare('SELECT * FROM submissions WHERE id = ?').get(run.submission_id));
  const form = sub && parseForm(db.prepare('SELECT * FROM forms WHERE id = ?').get(sub.form_id));
  const owner = form && db.prepare('SELECT id, email, name, plan FROM users WHERE id = ?').get(form.user_id);
  if (!wf || !sub || !form) return null;
  return { run, wf, sub, form, owner, data: { ...sub.data }, vars: run.vars, label: run.label };
}

function save(ctx, patch) {
  const r = { ...ctx.run, ...patch };
  db.prepare("UPDATE workflow_runs SET status = ?, label = ?, cursor = ?, vars = ?, log = ?, resume_at = ?, updated_at = datetime('now') WHERE id = ?")
    .run(r.status, ctx.label, JSON.stringify(r.cursor), JSON.stringify(ctx.vars), JSON.stringify(r.log), r.resume_at ?? null, r.id);
  ctx.run = r;
}

export async function advance(runId) {
  const ctx = loadContext(runId);
  if (!ctx || ctx.run.status !== 'running') return;
  const steps = ctx.wf.definition.steps || [];
  let cursor = ctx.run.cursor;
  const log = ctx.run.log;
  for (let guard = 0; guard < 500; guard++) {
    const step = cursor && getStep(steps, cursor);
    if (!step) { if (ctx.label === 'In Progress') ctx.label = 'Completed'; log.push({ at: now(), note: 'Workflow completed' }); return save(ctx, { status: 'completed', cursor: cursor || [], log }); }
    const handler = HANDLERS[step.type];
    let res;
    try { res = handler ? await handler(ctx, step) : { next: true, note: `Skipped unsupported step "${step.type}"` }; } catch (e) {
      log.push({ at: now(), step: step.id, type: step.type, note: `Failed: ${e.message}` });
      return save(ctx, { status: 'failed', cursor, log });
    }
    log.push({ at: now(), step: step.id, type: step.type, note: res.note || '' });
    if (res.wait) return save(ctx, { status: 'waiting', cursor, log, resume_at: res.resumeAt ? res.resumeAt.toISOString().replace('T', ' ').slice(0, 19) : null });
    if (res.end) { if (ctx.label === 'In Progress') ctx.label = 'Completed'; return save(ctx, { status: 'completed', cursor, log }); }
    cursor = res.branch != null ? enterBranch(steps, cursor, res.branch) : nextPath(steps, cursor);
    save(ctx, { cursor: cursor || [], log });
  }
  log.push({ at: now(), note: 'Stopped: too many steps' });
  save(ctx, { status: 'failed', log });
}

export async function startRun(wf, sub) {
  const { lastInsertRowid } = db.prepare("INSERT INTO workflow_runs (workflow_id, submission_id, token, log) VALUES (?, ?, ?, ?)")
    .run(wf.id, sub.id, token(), JSON.stringify([{ at: now(), note: 'Flow started' }]));
  await advance(Number(lastInsertRowid));
  return Number(lastInsertRowid);
}

// Called after every submission. Workflows set to "Run on condition" start only when a Run Workflow condition fired.
export async function startWorkflows(form, sub, triggered = []) {
  const wfs = db.prepare("SELECT * FROM workflows WHERE form_id = ? AND status = 'enabled'").all(form.id).map(parseWorkflow);
  for (const wf of wfs) {
    if (wf.definition.trigger === 'condition' && !triggered.includes(wf.id)) continue;
    await startRun(wf, sub).catch((e) => console.error('workflow', wf.id, e));
  }
}

// Submission edited in the inbox: restart workflows that ask for it.
export async function restartOnEdit(form, sub) {
  const wfs = db.prepare("SELECT * FROM workflows WHERE form_id = ? AND status = 'enabled'").all(form.id).map(parseWorkflow).filter((w) => w.definition.settings?.restartOnEdit);
  for (const wf of wfs) {
    db.prepare("UPDATE workflow_runs SET status = 'cancelled' WHERE workflow_id = ? AND submission_id = ? AND status IN ('running', 'waiting')").run(wf.id, sub.id);
    await startRun(wf, sub);
  }
}

// Approval / task decision from the no-login link. Returns an error string or null.
export async function decideTask(tok, decision, note) {
  const task = db.prepare('SELECT * FROM workflow_tasks WHERE token = ?').get(tok);
  if (!task) return 'Task not found';
  if (task.status !== 'pending') return 'This task has already been completed.';
  const ctx = loadContext(task.run_id);
  if (!ctx || ctx.run.status !== 'waiting') return 'This workflow is no longer waiting for this task.';
  const valid = task.kind === 'task' ? ['done'] : ['approved', 'rejected'];
  if (!valid.includes(decision)) return 'Invalid decision';
  db.prepare("UPDATE workflow_tasks SET status = ?, note = ?, decided_at = datetime('now') WHERE id = ?").run(decision, note || null, task.id);
  const steps = ctx.wf.definition.steps || [];
  const step = getStep(steps, ctx.run.cursor);
  const log = ctx.run.log;
  log.push({ at: now(), step: task.node_id, type: step?.type, note: `${task.assignee} ${decision}${note ? `: ${note}` : ''}` });
  let cursor;
  if (task.kind === 'task') cursor = nextPath(steps, ctx.run.cursor);
  else {
    const all = db.prepare('SELECT status FROM workflow_tasks WHERE run_id = ? AND node_id = ?').all(task.run_id, task.node_id);
    const rejected = decision === 'rejected';
    const settled = rejected || step?.mode !== 'all' || all.every((t) => t.status === 'approved');
    if (!settled) { save(ctx, { log }); return null; }
    db.prepare("UPDATE workflow_tasks SET status = 'skipped' WHERE run_id = ? AND node_id = ? AND status = 'pending'").run(task.run_id, task.node_id);
    ctx.vars.approval_note = note || '';
    ctx.vars.approved_by = task.assignee;
    db.prepare('UPDATE submissions SET approval = ?, approval_note = ? WHERE id = ?').run(rejected ? 'rejected' : 'approved', note || null, ctx.sub.id);
    cursor = enterBranch(steps, ctx.run.cursor, rejected ? 1 : 0);
  }
  save(ctx, { status: 'running', cursor: cursor || [], log, resume_at: null });
  await advance(task.run_id);
  return null;
}

// Owner actions from the runs list.
export async function resumeRun(runId) {
  db.prepare("UPDATE workflow_runs SET status = 'running', resume_at = NULL WHERE id = ? AND status = 'waiting'").run(runId);
  await advance(runId);
}

// Resumes runs whose Wait / Scheduled E-mail time has come.
export function startScheduler(intervalMs = 30000) {
  const tick = async () => {
    const due = db.prepare("SELECT id FROM workflow_runs WHERE status = 'waiting' AND resume_at IS NOT NULL AND resume_at <= ?").all(now());
    for (const { id } of due) await resumeRun(id).catch((e) => console.error('workflow resume', id, e));
  };
  const t = setInterval(tick, intervalMs);
  t.unref?.();
  return tick;
}
