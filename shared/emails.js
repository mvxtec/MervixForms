// E-mail list for a form (Settings → Emails). Older forms stored one `notify` and one `autoresponder`
// object; formEmails() turns those into the list shape so builder and server read the same thing.

export const DEFAULT_NOTIFICATION_BODY = '<h2>{form_title}</h2><p>You have a new submission.</p>{all_fields}<p><a href="{inbox_link}">View in your inbox</a></p>';
export const DEFAULT_AUTORESPONDER_BODY = '<p>Hi,</p><p>Thanks for filling out <b>{form_title}</b>. Here is a copy of your answers:</p>{all_fields}';

let n = 0;
export const emailId = () => `em${Date.now().toString(36)}${(n++ % 100)}`;

export function newEmail(kind) {
  return kind === 'autoresponder'
    ? { id: emailId(), kind, name: 'Autoresponder', enabled: true, toField: '', subject: 'We received your submission', body: DEFAULT_AUTORESPONDER_BODY, replyTo: '', senderName: '', attachPdf: false }
    : { id: emailId(), kind: 'notification', name: 'Notification', enabled: true, to: '', subject: 'New submission: {form_title}', body: DEFAULT_NOTIFICATION_BODY, replyTo: '', senderName: '', attachPdf: false };
}

const textToHtml = (t) => String(t || '').split('\n').map((l) => (l.trim() === '{all_fields}' ? l : `<p>${l}</p>`)).join('');

export function formEmails(settings = {}) {
  if (Array.isArray(settings.emails)) return settings.emails;
  const out = [];
  const nt = settings.notify;
  if (nt) out.push({ id: 'notify', kind: 'notification', name: 'Notification 1', enabled: !!nt.enabled, to: nt.to || '', subject: nt.subject || 'New submission: {form_title}', body: DEFAULT_NOTIFICATION_BODY, attachPdf: !!nt.attachPdf, replyTo: '', senderName: '' });
  const ar = settings.autoresponder;
  if (ar) out.push({ id: 'autoresponder', kind: 'autoresponder', name: 'Autoresponder 1', enabled: !!ar.enabled, toField: ar.emailField || '', subject: ar.subject || '', body: ar.body ? textToHtml(ar.body) : DEFAULT_AUTORESPONDER_BODY, attachPdf: !!ar.attachPdf, replyTo: '', senderName: '' });
  return out;
}
