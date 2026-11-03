// Workflow building blocks (the builder's element panel) and starter templates. Shared by builder and engine.
// Each element: key, label, group, ready, defaults, and optional `branches` (labels of fixed branches).

const E = [];
const el = (key, label, group, defaults = {}, extra = {}) => E.push({ key, label, group, ready: true, defaults, ...extra });
const soon = (key, label, group, reason = 'Coming soon') => E.push({ key, label, group, ready: false, reason, defaults: {} });

// Basic
el('email', 'Email', 'Basic', { to: '', subject: 'Update on your submission to {form_title}', body: '<p>Hello,</p><p>{all_fields}</p>' });
el('approval', 'Approval', 'Basic', { approvers: '', mode: 'any', message: 'Please review this submission.' }, { branches: ['Approved', 'Rejected'] });
soon('approveSign', 'Approve & Sign', 'Basic');
el('task', 'Task', 'Basic', { assignee: '', title: 'Review submission', details: '' });
el('sendPdf', 'Send PDF', 'Basic', { to: '', subject: '{form_title} — submission PDF' });
soon('signDocument', 'Sign Document', 'Basic', 'Use E-sign documents for now');
el('teamApproval', 'Team Approval', 'Basic', { approvers: '', mode: 'all', message: 'Please review this submission.' }, { branches: ['Approved', 'Rejected'], isNew: true });
el('webhook', 'Webhook', 'Basic', { url: '' });
el('scheduledEmail', 'Scheduled Email', 'Basic', { amount: 1, unit: 'days', to: '', subject: 'Reminder: {form_title}', body: '<p>This is a reminder about your submission.</p>' });
el('trackingEmail', 'Status Tracking Email', 'Basic', { to: '', subject: 'Track your request: {form_title}' }, { isNew: true });
soon('appointment', 'Appointment', 'Basic');
soon('flowReport', 'Flow Report', 'Basic');
soon('qrCode', 'QR Code', 'Basic');
// Data
soon('getData', 'Get Data', 'Data', 'Needs Tables (planned)'); soon('createEntry', 'Create Entry', 'Data', 'Needs Tables (planned)'); soon('updateEntry', 'Update Entry', 'Data', 'Needs Tables (planned)'); soon('dataAssistant', 'Data Assistant', 'Data');
// Payment
soon('paymentForm', 'Payment Form', 'Payment'); soon('requestPayment', 'Request Payment', 'Payment');
el('verifyPayment', 'Verify Payment', 'Payment', {}, { branches: ['Paid', 'Not paid'] });
soon('paymentAssistant', 'Payment Assistant', 'Payment');
// Logic
el('ifElse', 'If/Else Condition', 'Logic', { field: '', op: 'equals', value: '' }, { branches: ['Yes', 'No'] });
el('branch', 'Conditional Branch', 'Logic', { rules: [{ label: 'Branch 1', field: '', op: 'equals', value: '' }] }, { dynamicBranches: true });
el('setStatus', 'Set Status', 'Logic', { status: 'In review' });
soon('forEach', 'For Each', 'Logic');
el('split', 'Split Branches', 'Logic', { count: 2 }, { dynamicBranches: true, isNew: true });
el('wait', 'Wait', 'Logic', { amount: 1, unit: 'hours' });
el('pause', 'Pause', 'Logic', {});
el('end', 'End', 'Logic', {});
// AI
soon('automateTask', 'Automate Task', 'AI');
el('idGenerator', 'ID Generator', 'AI', { prefix: 'REQ-', digits: 5, name: 'requestId' });
el('updateValue', 'Update Value', 'AI', { field: '', value: '' }, { isNew: true });
el('customPrompt', 'Custom Prompt', 'AI', { prompt: 'Write a short reply to this submission:\n{all_fields}', name: 'reply' }, { ai: true, isNew: true });
el('summarize', 'Summarize', 'AI', { name: 'summary' }, { ai: true });
el('calculate', 'Calculate', 'AI', { formula: '', name: 'result' });
el('sentiment', 'Sentiment Analysis', 'AI', { field: '', name: 'sentiment' }, { ai: true });
el('categorize', 'Categorize', 'AI', { field: '', categories: 'Sales\nSupport\nBilling', name: 'category' }, { ai: true });
soon('extractFromFile', 'Extract From File', 'AI');
// Notifications
el('sms', 'SMS / Text Message', 'Notifications', { to: '', message: 'New update on {form_title}' });
el('whatsapp', 'WhatsApp Notifications', 'Notifications', { to: '', message: 'New update on {form_title}' });
el('slack', 'Slack', 'Notifications', { url: '', message: 'New submission to {form_title}' });
soon('push', 'Push Notification', 'Notifications');
el('teams', 'Microsoft Teams', 'Notifications', { url: '', message: 'New submission to {form_title}' });

export const WF_ELEMENTS = E;
export const WF_BY_KEY = Object.fromEntries(E.map((e) => [e.key, e]));
export const WF_GROUPS = ['Basic', 'Data', 'Payment', 'Logic', 'AI', 'Notifications'];
export const WAITING_STEPS = ['approval', 'teamApproval', 'task', 'wait', 'pause', 'scheduledEmail'];

let n = 0;
export const stepId = () => `s${Date.now().toString(36)}${(n++ % 1000).toString(36)}`;

// A new step; branching steps get their branches with empty step lists.
export function newStep(key, extra = {}) {
  const e = WF_BY_KEY[key];
  const step = { id: stepId(), type: key, ...JSON.parse(JSON.stringify(e?.defaults || {})), ...extra };
  if (e?.branches) step.branches = e.branches.map((label) => ({ id: stepId(), label, steps: [] }));
  if (key === 'branch') step.branches = [...step.rules.map((r) => ({ id: stepId(), label: r.label, steps: [] })), { id: stepId(), label: 'Otherwise', steps: [] }];
  if (key === 'split') step.branches = Array.from({ length: step.count || 2 }, (_, i) => ({ id: stepId(), label: `Branch ${i + 1}`, steps: [] }));
  return step;
}

// Workflow start options (Settings → Workflows → "Create a workflow").
export const STARTERS = [
  { key: 'scratch', title: 'Start from Scratch', desc: 'Build your workflow step by step on a blank canvas', steps: () => [] },
  { key: 'approvals', title: 'Request Approvals', desc: 'Build approval processes to streamline reviews and decisions', steps: () => approvalFlow() },
  { key: 'integrations', title: 'Automate Integrations', desc: 'Run integrations based on your conditions', steps: () => [newStep('ifElse'), newStep('webhook')] },
  { key: 'scheduled', title: 'Send Scheduled Emails', desc: 'Send e-mails at a specific time after submission', steps: () => [newStep('scheduledEmail')] },
  { key: 'schedule', title: 'Schedule Workflow', desc: 'Run a workflow on a recurring schedule', soon: true },
  { key: 'appointment', title: 'Request Appointment', desc: 'Send appointment requests automatically', soon: true },
];

function approvalFlow(subjectOk = 'Your request was approved', subjectNo = 'Your request was not approved') {
  const ap = newStep('approval');
  ap.branches[0].steps = [newStep('setStatus', { status: 'Approved' }), newStep('email', { to: '{respondent}', subject: subjectOk, body: '<p>Good news — your request <b>{form_title}</b> was approved.</p>' })];
  ap.branches[1].steps = [newStep('setStatus', { status: 'Rejected' }), newStep('email', { to: '{respondent}', subject: subjectNo, body: '<p>Sorry — your request <b>{form_title}</b> was not approved.</p><p>Note: {approval_note}</p>' })];
  return [newStep('trackingEmail', { to: '{respondent}' }), newStep('setStatus', { status: 'Awaiting approval' }), ap];
}

// Workflow template gallery. build() returns the steps.
const T = (key, title, category, desc, build) => ({ key, title, category, desc, build });
export const WF_TEMPLATES = [
  T('orderProcessing', 'Order Processing', 'Sales', 'Confirm orders, verify payment and notify fulfilment.', () => {
    const vp = newStep('verifyPayment');
    vp.branches[0].steps = [newStep('email', { to: '{respondent}', subject: 'Order confirmed', body: '<p>Thanks! Your order is confirmed.</p>{all_fields}' }), newStep('task', { title: 'Pack and ship order' })];
    vp.branches[1].steps = [newStep('email', { to: '{respondent}', subject: 'Payment pending', body: '<p>We have not received your payment yet.</p>' })];
    return [newStep('idGenerator', { prefix: 'ORD-', name: 'orderId' }), vp];
  }),
  T('recruiting', 'Recruiting', 'Human Resources', 'Screen applicants, request a hiring-manager decision and reply.', () => [newStep('task', { title: 'Screen application' }), ...approvalFlow('Next steps for your application', 'Update on your application')]),
  T('expenseReimbursement', 'Expense Reimbursement Approval', 'Human Resources', 'Manager approval, then finance processes the payout.', () => {
    const steps = approvalFlow('Expense approved', 'Expense not approved');
    steps[2].branches[0].steps.push(newStep('task', { title: 'Process reimbursement' }));
    return steps;
  }),
  T('training', 'Training', 'Administration', 'Enrol, remind before the session and collect completion.', () => [newStep('email', { to: '{respondent}', subject: 'You are enrolled', body: '<p>You are enrolled in the training.</p>' }), newStep('scheduledEmail', { amount: 1, unit: 'days', to: '{respondent}', subject: 'Training reminder' }), newStep('task', { title: 'Mark training complete' })]),
  T('clientOnboarding', 'Client Onboarding', 'Administration', 'Welcome the client, assign an owner, follow up.', () => [newStep('email', { to: '{respondent}', subject: 'Welcome aboard!', body: '<p>Welcome! We will be in touch shortly.</p>' }), newStep('task', { title: 'Kick-off call' }), newStep('wait', { amount: 3, unit: 'days' }), newStep('email', { to: '{respondent}', subject: 'How is it going?' })]),
  T('productReturn', 'Product Return Process', 'Sales', 'Approve the return and send instructions.', () => approvalFlow('Your return was approved', 'Your return request')),
  T('inventory', 'Inventory Management', 'Sales', 'Route stock requests to the warehouse.', () => [newStep('task', { title: 'Check stock' }), newStep('slack')]),
  T('patientFollowUp', 'Patient Follow-Up', 'Healthcare', 'Thank the patient and follow up after a few days.', () => [newStep('email', { to: '{respondent}', subject: 'Thank you for your visit' }), newStep('wait', { amount: 3, unit: 'days' }), newStep('email', { to: '{respondent}', subject: 'How are you feeling?' })]),
  T('leadQualification', 'Lead Qualification', 'Marketing', 'Score and route leads to sales.', () => {
    const b = newStep('categorize', { categories: 'Hot\nWarm\nCold', name: 'leadScore' });
    return [b, newStep('task', { title: 'Call lead ({leadScore})' }), newStep('webhook')];
  }),
  T('appointmentScheduling', 'Appointment Scheduling', 'Sales', 'Confirm the booking and remind the day before.', () => [newStep('email', { to: '{respondent}', subject: 'Appointment confirmed' }), newStep('scheduledEmail', { amount: 1, unit: 'days', to: '{respondent}', subject: 'Appointment reminder' })]),
  T('employeeOnboarding', 'Employee Onboarding', 'Human Resources', 'IT, HR and manager tasks for a new hire.', () => [newStep('task', { title: 'Create accounts (IT)' }), newStep('task', { title: 'Paperwork (HR)' }), newStep('email', { to: '{respondent}', subject: 'Welcome to the team!' })]),
  T('ticketEscalation', 'Customer Ticket Escalation', 'Sales', 'Escalate urgent tickets to a lead.', () => {
    const c = newStep('ifElse', { field: '', op: 'equals', value: 'Urgent' });
    c.branches[0].steps = [newStep('task', { title: 'Handle urgent ticket' }), newStep('slack')];
    c.branches[1].steps = [newStep('task', { title: 'Handle ticket' })];
    return [newStep('idGenerator', { prefix: 'TKT-', name: 'ticketId' }), c];
  }),
  T('nda', 'Non-Disclosure Agreement (NDA)', 'Administration', 'Legal review and countersignature.', () => [...approvalFlow('NDA approved', 'NDA needs changes'), newStep('sendPdf', { to: '{respondent}' })]),
  T('socialMedia', 'Social Media', 'Marketing', 'Draft, approve and schedule posts.', () => [newStep('customPrompt', { prompt: 'Draft a social media post from:\n{all_fields}', name: 'draft' }), ...approvalFlow('Post approved', 'Post needs edits')]),
  T('taxFiling', 'Tax Filing Process', 'Finance', 'Collect documents, review and file.', () => [newStep('task', { title: 'Review documents' }), newStep('task', { title: 'File return' }), newStep('email', { to: '{respondent}', subject: 'Your return was filed' })]),
  T('quotationRequest', 'Quotation Request Process', 'Administration', 'Prepare a quote and get it approved.', () => [newStep('task', { title: 'Prepare quotation' }), ...approvalFlow('Your quotation', 'About your quotation request')]),
  T('vendorPayment', 'Vendor Payment Processing', 'Sales', 'Approve invoices and schedule payment.', () => [...approvalFlow('Invoice approved', 'Invoice rejected'), newStep('task', { title: 'Schedule payment' })]),
  T('feedbackReview', 'Feedback Review', 'Administration', 'Analyse sentiment and route negative feedback.', () => {
    const c = newStep('ifElse', { field: '', op: 'contains', value: 'Negative' });
    c.branches[0].steps = [newStep('task', { title: 'Respond to negative feedback' })];
    return [newStep('sentiment', { name: 'sentiment' }), c];
  }),
  T('equipmentPurchase', 'Equipment Purchase Request', 'IT', 'Manager then finance approval.', () => [newStep('teamApproval', { mode: 'all' }), newStep('email', { to: '{respondent}', subject: 'Purchase request processed' })]),
  T('expenseReport', 'Expense Report', 'Finance', 'Approve and record expense reports.', () => approvalFlow('Expense report approved', 'Expense report returned')),
];
export const WF_TEMPLATE_CATEGORIES = [...new Set(WF_TEMPLATES.map((t) => t.category))];
