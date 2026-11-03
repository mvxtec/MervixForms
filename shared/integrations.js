// Integrations catalog (Settings → Integrations). kind:
//   webhook  — we POST each submission as JSON to a URL the owner pastes (Zapier, Make, n8n, Power Automate…)
//   slack / discord / teams / sheets — URL-based with a service-specific payload
//   builtin  — already part of the product (inbox table, boards…), links elsewhere
//   payment / notify — configured on the Payments tab or in Notifications
//   soon     — needs an OAuth app or partner approval; listed, not yet connectable
const I = [];
const add = (key, name, desc, category, kind = 'soon', extra = {}) => I.push({ key, name, desc, category, kind, ...extra });

const CRM = 'CRM & sales', MKT = 'E-mail marketing', STO = 'Storage & files', PM = 'Productivity & projects', PAY = 'Payments', AUTO = 'Automation platforms', COM = 'Communication', HC = 'Healthcare', DATA = 'Spreadsheets & data', SUP = 'Support', CAL = 'Calendar & meetings', OTHER = 'Other';

add('webhooks', 'Webhooks', 'Send each submission as JSON to any URL', AUTO, 'webhook', { featured: true, hint: 'Any HTTPS endpoint that accepts POST requests' });
add('zapier', 'Zapier', 'Sync submissions to 7,000+ apps', AUTO, 'webhook', { featured: true, hint: 'Zapier → Webhooks by Zapier → Catch Hook URL' });
add('make', 'Make', 'Connect your form with 1,000+ apps', AUTO, 'webhook', { featured: true, hint: 'Make → Webhooks → Custom webhook URL' });
add('n8n', 'n8n', 'Automate workflows with 1,000+ tools', AUTO, 'webhook', { featured: true, hint: 'n8n → Webhook node → Production URL' });
add('pabbly', 'Pabbly Connect', 'Integrate with 2,000+ applications', AUTO, 'webhook', { hint: 'Pabbly → Webhook trigger URL' });
add('pipedream', 'Pipedream', 'Trigger actions across 2,000+ apps', AUTO, 'webhook', { hint: 'Pipedream → HTTP / Webhook trigger URL' });
add('ifttt', 'IFTTT', 'Sync submissions to hundreds of services', AUTO, 'webhook', { hint: 'IFTTT → Webhooks service → https://maker.ifttt.com/trigger/<event>/json/with/key/<key>' });
add('powerAutomate', 'Microsoft Power Automate', 'Sync responses and build flows', AUTO, 'webhook', { hint: 'Power Automate → "When an HTTP request is received" URL' });
add('zohoFlow', 'Zoho Flow', 'Trigger automated actions from every submission', AUTO, 'webhook', { hint: 'Zoho Flow → Webhook trigger URL' });
add('trayio', 'Tray.io', 'Connect to hundreds of platforms', AUTO, 'webhook', { hint: 'Tray.io → Webhook trigger URL' });
add('apixDrive', 'ApiX-Drive', 'Integrate with other services quickly', AUTO, 'webhook', { hint: 'ApiX-Drive → Webhook URL' });
add('appmixer', 'Appmixer', 'Use submissions in Appmixer workflows', AUTO, 'webhook');
add('monkedo', 'Monkedo', 'Connect to 400+ apps', AUTO, 'webhook');
add('unito', 'Unito', 'Sync with multiple tools and apps', AUTO);
add('skyvia', 'Skyvia', 'Sync data with your business systems', AUTO, 'webhook');
add('slack', 'Slack', 'Send submissions to Slack channels or teammates', COM, 'slack', { featured: true, hint: 'Slack → Incoming Webhooks → https://hooks.slack.com/services/…' });
add('discord', 'Discord', 'Send submission notifications to Discord', COM, 'discord', { hint: 'Channel settings → Integrations → Webhooks → Copy URL' });
add('teams', 'Microsoft Teams', 'Send submissions to Teams channels', COM, 'teams', { hint: 'Teams channel → Workflows → "Post to a channel when a webhook request is received"' });
add('whatsapp', 'WhatsApp', 'Send submission notifications to WhatsApp', COM, 'notify');
add('whatsappBusiness', 'WhatsApp Business', 'Notifications from your WhatsApp Business account', COM, 'notify');
add('sms', 'SMS', 'Send SMS messages from your forms', COM, 'notify');
add('clicksend', 'ClickSend SMS', 'SMS notifications for new submissions', COM);
add('simpletexting', 'SimpleTexting', 'Send submissions to SimpleTexting', COM);
add('gmail', 'Gmail', 'Turn submissions into e-mails or drafts', COM);
add('sheets', 'Google Sheets', 'Instantly populate your spreadsheets', DATA, 'sheets', { featured: true, hint: 'Apps Script web app URL (see setup script)' });
add('tables', 'WpForms Tables', 'Every submission already lands in your Inbox table', DATA, 'builtin', { link: 'inbox' });
add('boards', 'Boards', 'Create tasks from submissions', PM, 'soon');
add('excel', 'Microsoft Excel', 'Sync submissions to Excel', DATA);
add('airtable', 'Airtable', 'Sync submissions to your spreadsheet database', DATA);
add('smartsheet', 'Smartsheet', 'Add submissions to Smartsheet', DATA);
add('notion', 'Notion', 'Send data between your form and Notion', DATA);
add('powerBi', 'Power BI Connector', 'Visualize your data in Power BI', DATA);
add('attributer', 'Attributer', 'Capture UTM and attribution data', DATA);
add('leadSources', 'LeadSources', 'Track the source of every lead', DATA);
add('stripe', 'Stripe', 'Accept payments and donations', PAY, 'payment');
add('stripeCheckout', 'Stripe Checkout', 'Polished checkout with Stripe', PAY, 'payment');
add('purchaseOrder', 'Purchase Order', 'Accept non-card payments', PAY, 'payment');
for (const [k, n] of [['clover', 'Clover'], ['square', 'Square'], ['authorizeNet', 'Authorize.Net'], ['paypal', 'PayPal'], ['worldpayUk', 'WorldPay UK'], ['2checkout', '2CheckOut'], ['appleGooglePay', 'Apple Pay & Google Pay'], ['venmo', 'Venmo'], ['cashApp', 'Cash App Pay'], ['cybersource', 'CyberSource'], ['braintree', 'Braintree'], ['iyzico', 'iyzico'], ['eway', 'Eway'], ['bluepay', 'BluePay'], ['payjunction', 'PayJunction'], ['chargify', 'Chargify'], ['cardpointe', 'CardPointe'], ['echeck', 'eCheck.Net'], ['bluesnap', 'BlueSnap'], ['paymentwall', 'Paymentwall'], ['payu', 'PayU'], ['moneris', 'Moneris'], ['paysafe', 'Paysafe'], ['skrill', 'Skrill'], ['gocardless', 'GoCardless'], ['afterpay', 'Afterpay'], ['mollie', 'Mollie'], ['payfast', 'Payfast'], ['sensepass', 'SensePass'], ['clearpay', 'Clearpay'], ['razorpay', 'Razorpay (India)'], ['cashfree', 'Cashfree (India)']]) add(k, n, 'Collect payments through your form', PAY);
for (const [k, n, d] of [['salesforce', 'Salesforce', 'Send leads, contacts or accounts to your CRM'], ['hubspot', 'HubSpot', 'Send contacts to your CRM and create deals'], ['activecampaign', 'ActiveCampaign', 'Update contacts and deals'], ['keap', 'Keap', 'Add contacts and assign tags'], ['pipedrive', 'Pipedrive', 'Send contacts, deals and activities'], ['zohoCrm', 'Zoho CRM', 'Send new contacts to your CRM'], ['insightly', 'Insightly', 'Send lead information to your CRM'], ['highrise', 'Highrise', 'Sync cases and contacts'], ['solve', 'Solve', 'Add contacts or companies'], ['callingly', 'Callingly', 'Call new leads instantly'], ['clinchpad', 'ClinchPad', 'Create leads in your pipeline'], ['platformly', 'Platform.ly', 'Send lead info to Platform.ly'], ['engagebay', 'EngageBay', 'Sync contacts to EngageBay CRM'], ['opencrm', 'OpenCRM', 'Create leads and contacts'], ['kommo', 'Kommo', 'Sync leads into an AI-powered CRM'], ['brevo', 'Brevo', 'Manage contacts, deals and companies'], ['mailsoftly', 'Mailsoftly', 'Create customer profiles'], ['highlevel', 'HighLevel', 'Send contacts to HighLevel'], ['leadconnector', 'LeadConnector', 'Manage lead data'], ['followUpBoss', 'Follow Up Boss', 'Create or update contacts'], ['close', 'Close', 'Create leads'], ['copper', 'Copper', 'Create leads in Copper CRM'], ['agileCrm', 'Agile CRM', 'Create contacts'], ['ontraport', 'Ontraport', 'Create contacts'], ['streak', 'Streak', 'Create boxes in Streak'], ['pardot', 'Salesforce Pardot', 'Sync with marketing automations'], ['chiliPiper', 'Chili Piper', 'Book prospects in real time'], ['freshsales', 'Freshsales Classic', 'Sync submissions'], ['growsurf', 'GrowSurf', 'Referral programs'], ['callhippo', 'CallHippo', 'Communication'], ['systemeIo', 'systeme.io', 'Marketing automation'], ['podio', 'Podio', 'Create Podio items']]) add(k, n, d, CRM);
for (const [k, n] of [['mailchimp', 'Mailchimp'], ['constantContact', 'Constant Contact'], ['aweber', 'AWeber'], ['getresponse', 'GetResponse'], ['mailerlite', 'MailerLite'], ['campaignMonitor', 'Campaign Monitor'], ['sendgrid', 'SendGrid'], ['icontact', 'iContact'], ['verticalresponse', 'VerticalResponse'], ['klaviyo', 'Klaviyo'], ['kit', 'Kit'], ['mailgun', 'Mailgun'], ['flodesk', 'Flodesk'], ['drip', 'Drip'], ['omnisend', 'Omnisend'], ['zohoCampaigns', 'Zoho Campaigns']]) add(k, n, 'Add and update contacts in your lists', MKT);
for (const [k, n] of [['googleDrive', 'Google Drive'], ['dropbox', 'Dropbox'], ['onedrive', 'OneDrive'], ['box', 'Box'], ['egnyte', 'Egnyte'], ['ftp', 'FTP'], ['sharepoint', 'Microsoft SharePoint'], ['boxSign', 'Box Sign'], ['basecamp', 'Basecamp']]) add(k, n, 'Send uploads and submission PDFs to storage', STO);
for (const [k, n, d] of [['trello', 'Trello', 'Turn submissions into cards'], ['asana', 'Asana', 'Add projects, tasks and comments'], ['monday', 'monday.com', 'Add items to your boards'], ['clickup', 'ClickUp', 'Turn submissions into tasks'], ['jira', 'Jira', 'Create issues from submissions'], ['linear', 'Linear', 'Create issues from submissions'], ['todoist', 'Todoist', 'Turn submissions into tasks'], ['softr', 'Softr', 'Automate workflows'], ['plainlyVideos', 'Plainly Videos', 'Create videos from submission data'], ['clinked', 'Clinked Client Portal', 'Manage submissions in Clinked'], ['appyReward', 'appyReward', 'Survey rewards and giveaways'], ['canvasLms', 'Canvas LMS', 'Manage course enrollments'], ['quickbooks', 'QuickBooks', 'Create invoices and customers'], ['stocktwits', 'StockTwits', 'Connect with traders']]) add(k, n, d, PM);
for (const [k, n] of [['googleCalendar', 'Google Calendar'], ['outlookCalendar', 'Outlook Calendar'], ['zoom', 'Zoom'], ['gotoWebinar', 'GoTo Webinar'], ['optimantra', 'Optimantra'], ['zenoti', 'Zenoti'], ['googleContacts', 'Google Contacts']]) add(k, n, 'Create events, meetings and registrants', CAL);
for (const [k, n] of [['zendesk', 'Zendesk'], ['freshdesk', 'Freshdesk']]) add(k, n, 'Turn submissions into support tickets', SUP);
for (const [k, n] of [['drchrono', 'DrChrono'], ['cerbo', 'Cerbo'], ['tebra', 'Tebra (Kareo)'], ['elation', 'Elation'], ['healthie', 'Healthie'], ['openDental', 'Open Dental'], ['modmed', 'ModMed'], ['athenahealth', 'Athenahealth'], ['charmHealth', 'Charm Health'], ['advancedmd', 'AdvancedMD'], ['canvasMedical', 'Canvas Medical'], ['intakeq', 'IntakeQ'], ['keragon', 'Keragon']]) add(k, n, 'Sync patient intake data to your EHR', HC);

export const INTEGRATIONS = I;
export const INTEGRATION_BY_KEY = Object.fromEntries(I.map((x) => [x.key, x]));
export const INTEGRATION_CATEGORIES = [AUTO, COM, DATA, PAY, CRM, MKT, STO, PM, CAL, SUP, HC, OTHER].filter((c) => I.some((x) => x.category === c));
// Integrations whose submissions we POST as the generic webhook payload.
export const WEBHOOK_KEYS = I.filter((x) => x.kind === 'webhook').map((x) => x.key);
