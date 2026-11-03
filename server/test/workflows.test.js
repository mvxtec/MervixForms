import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { newStep } from '../../shared/workflowElements.js';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'forms-wf-'));
process.env.DATA_DIR = tmp;
const { app } = await import('../index.js');
const { db } = await import('../db.js');
const { startScheduler } = await import('../workflows.js');

let server, base, cookie = '';
const call = async (method, url, body) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', cookie }, body: body ? JSON.stringify(body) : undefined });
  const set = r.headers.get('set-cookie');
  if (set) cookie = set.split(';')[0];
  return { status: r.status, body: (r.headers.get('content-type') || '').includes('json') ? await r.json() : await r.text() };
};
before(() => { server = app.listen(0); base = `http://127.0.0.1:${server.address().port}`; });
after(() => server.close());
const settle = () => new Promise((r) => setTimeout(r, 150));

test('workflow: approval branches, tasks, wait, tracking page and conditional trigger', async () => {
  await call('POST', '/api/auth/register', { email: 'owner@x.co', password: 'password1', name: 'O' });
  const { body: { id: formId } } = await call('POST', '/api/forms', { templateId: 'contact' });

  const approval = newStep('approval', { approvers: 'boss@x.co' });
  approval.branches[0].steps = [newStep('setStatus', { status: 'Approved' }), newStep('idGenerator', { prefix: 'REQ-', digits: 3, name: 'reqId' }), newStep('task', { assignee: 'ops@x.co', title: 'Ship {reqId}' })];
  approval.branches[1].steps = [newStep('setStatus', { status: 'Rejected' }), newStep('end')];
  const ifElse = newStep('ifElse', { field: 'topic', op: 'equals', value: 'Sales' });
  ifElse.branches[0].steps = [newStep('updateValue', { field: 'msg', value: 'routed to sales' })];
  const steps = [newStep('trackingEmail'), ifElse, approval, newStep('wait', { amount: 1, unit: 'minutes' }), newStep('email', { to: 'owner@x.co', subject: 'Done {reqId}' })];
  const { body: { id: wfId } } = await call('POST', '/api/workflows', { formId, title: 'Approval flow', steps });

  const sub = await call('POST', `/api/public/forms/${formId}/submit`, { values: { name: { first: 'Jo', last: 'Do' }, email: 'jo@x.io', topic: 'Sales', msg: 'hi' } });
  assert.equal(sub.status, 200);
  await settle();

  let runs = (await call('GET', `/api/workflows/${wfId}/runs`)).body;
  assert.equal(runs.length, 1);
  assert.equal(runs[0].status, 'waiting');
  assert.equal(runs[0].current, 'approval');
  const s1 = (await call('GET', `/api/submissions/${sub.body.id}`)).body;
  assert.equal(s1.data.msg, 'routed to sales', 'If/Else Yes branch updated the value');
  assert.equal(s1.approval, 'pending');

  const approveTask = db.prepare("SELECT * FROM workflow_tasks WHERE kind = 'approval'").get();
  assert.equal(approveTask.assignee, 'boss@x.co');
  const info = (await call('GET', `/api/public/wf-task/${approveTask.token}`)).body;
  assert.equal(info.kind, 'approval');
  assert.ok(info.answers.length > 0);
  assert.equal((await call('POST', `/api/public/wf-task/${approveTask.token}`, { decision: 'approved', note: 'ok' })).status, 200);
  assert.equal((await call('POST', `/api/public/wf-task/${approveTask.token}`, { decision: 'approved' })).status, 400, 'single use');

  runs = (await call('GET', `/api/workflows/${wfId}/runs`)).body;
  assert.equal(runs[0].current, 'task');
  assert.equal(runs[0].label, 'Approved');
  const task = db.prepare("SELECT * FROM workflow_tasks WHERE kind = 'task'").get();
  assert.equal(task.assignee, 'ops@x.co');
  assert.ok(db.prepare("SELECT 1 FROM outbox WHERE subject = 'Task: Ship REQ-001'").get(), 'task title uses the generated ID');
  await call('POST', `/api/public/wf-task/${task.token}`, { decision: 'done' });

  runs = (await call('GET', `/api/workflows/${wfId}/runs`)).body;
  assert.equal(runs[0].current, 'wait');
  assert.ok(runs[0].resume_at);
  // Time travel: make the wait due and run the scheduler once.
  db.prepare("UPDATE workflow_runs SET resume_at = '2000-01-01 00:00:00'").run();
  await startScheduler(60000)();
  runs = (await call('GET', `/api/workflows/${wfId}/runs`)).body;
  assert.equal(runs[0].status, 'completed');
  assert.ok(db.prepare("SELECT 1 FROM outbox WHERE subject = 'Done REQ-001'").get());

  const track = (await call('GET', `/api/public/track/${runs[0].token}`)).body;
  assert.deepEqual(track.milestones.map((m) => m.label), ['Flow started', 'Approved', 'Completed']);
  assert.equal((await call('GET', `/api/submissions/${sub.body.id}`)).body.approval, 'approved');

  // Conditional trigger: only runs when a "Run Workflow" condition fires.
  const wf = (await call('GET', `/api/workflows/${wfId}`)).body;
  await call('PUT', `/api/workflows/${wfId}`, { definition: { ...wf.definition, trigger: 'condition' } });
  const form = (await call('GET', `/api/forms/${formId}`)).body;
  form.definition.logic.push({ id: 'rw', match: 'all', conditions: [{ field: 'topic', op: 'equals', value: 'Support' }], actions: [{ type: 'runWorkflow', target: wfId }] });
  await call('PUT', `/api/forms/${formId}`, { definition: form.definition });
  await call('POST', `/api/public/forms/${formId}/submit`, { values: { name: { first: 'A', last: 'B' }, email: 'a@x.io', topic: 'Sales', msg: 'x' } });
  await settle();
  assert.equal((await call('GET', `/api/workflows/${wfId}/runs`)).body.length, 1, 'not triggered');
  await call('POST', `/api/public/forms/${formId}/submit`, { values: { name: { first: 'A', last: 'B' }, email: 'a@x.io', topic: 'Support', msg: 'x' } });
  await settle();
  assert.equal((await call('GET', `/api/workflows/${wfId}/runs`)).body.length, 2, 'triggered by condition');
});

test('workflow: rejection takes the No branch and team approval waits for everyone', async () => {
  const { body: { id: formId } } = await call('POST', '/api/forms', { templateId: 'contact' });
  const team = newStep('teamApproval', { approvers: 'a@x.co, b@x.co', mode: 'all' });
  team.branches[0].steps = [newStep('setStatus', { status: 'All approved' })];
  team.branches[1].steps = [newStep('setStatus', { status: 'Rejected' })];
  const { body: { id: wfId } } = await call('POST', '/api/workflows', { formId, title: 'Team', steps: [team] });
  await call('POST', `/api/public/forms/${formId}/submit`, { values: { name: { first: 'J', last: 'D' }, email: 'j@x.io', topic: 'Sales', msg: 'm' } });
  await settle();
  const runId = (await call('GET', `/api/workflows/${wfId}/runs`)).body[0].id;
  const [ta, tb] = db.prepare('SELECT * FROM workflow_tasks WHERE run_id = ? ORDER BY id').all(runId);
  await call('POST', `/api/public/wf-task/${ta.token}`, { decision: 'approved' });
  let run = (await call('GET', `/api/workflows/${wfId}/runs`)).body[0];
  assert.equal(run.status, 'waiting', 'still waiting for the second approver');
  await call('POST', `/api/public/wf-task/${tb.token}`, { decision: 'rejected', note: 'no budget' });
  run = (await call('GET', `/api/workflows/${wfId}/runs`)).body[0];
  assert.equal(run.status, 'completed');
  assert.equal(run.label, 'Rejected');
});
