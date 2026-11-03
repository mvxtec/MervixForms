# Jotform feature list (as of Nov 2026)

Compiled from the research notes in `research_notes/Jotform market and product research/`. Items marked (unverified) were not confirmed on a primary Jotform page.

## 1. Form fields (native elements)
- **Quick:** Header, Full Name, Email, Address, Phone, Date Picker (with optional time), Appointment (slot booking with per-slot caps), Signature, Fill in the Blank, Product List
- **Basic:** Short Text, Long Text, Paragraph (rich text), Dropdown, Single Choice, Multiple Choice, Number, Image, File Upload, Time, Captcha (reCAPTCHA), Spinner, Submit
- **Survey:** Input Table (matrix), Star Rating, Scale Rating
- **Page:** Divider, Section Collapse, Page Break
- **Field properties:** required, validation presets (alphabetic, alphanumeric, email, numeric), input masks (`@` letter, `#` digit, `*` either), unique value (no duplicates), answer piping, file type/count/size limits, upload routing to cloud storage, hidden fields, default values, sublabels, read-only (last four unverified)

## 2. Widgets (add-on fields)
- ~700 listings across 19 categories (several hundred unique): Pickers, Select Boxes, Rich Content, Mapping, Verification, Calculation, Multiple Entries, Photo, Analytics, Survey, Video, File Upload, Text Editor, Heading, Social, Drawing, Audio, Signature, Other
- Popular: Form Calculation, Configurable List, Unique ID, Data Grid, Dynamic Dropdowns, Inventory, Take Photo, Terms & Conditions, Checklist, Field Multiplier, Spreadsheet to Form, Image Slider, PDF Embedder, YouTube, Form Tabs, Calendly, Loom recorder, Clearout email validation
- Custom widget SDK (`JFCustomWidget` iframe/postMessage API), with Jotform review before public listing

## 3. Layout and design
- Classic form (all fields, multi-page via page breaks) and Card form (one question per page, "conversational")
- Form Designer: color schemes, hex colors, background image, fonts, font size, form width, button styles
- Themes (free and paid) and Theme Store
- Advanced Designer (Classic only): layout, cover page, label alignment, line layout
- Custom CSS injection
- AI theme generation from text or images, website color sync
- White labeling (remove Jotform branding) and custom domain

## 4. Conditional logic and calculations
- Six rule types: Show/Hide Field; Update/Calculate Field; Enable/Require/Mask Field; Skip To/Hide Page; Change Thank-You Page; Change Email Recipient
- Formula builder in Update/Calculate; Form Calculation widget (38 calculation widgets)
- AI builds conditions from plain-language prompts
- Operators such as equals, contains, empty/filled, greater/less than, before/after, with ANY/ALL (unverified)

## 5. Form settings and controls
- Enable/disable form; submission limit; expiry date (Form Limiter)
- Unique submissions: off / cookie / cookie + IP
- Password protection; SSO login (Enterprise)
- Encrypted forms (RSA-2048)
- Save and continue later
- Respondents can edit their submission
- Prefill from URL, previous submissions, other forms, Excel, CRMs (Salesforce, HubSpot, Airtable), Tables, SSO
- Multilingual forms (130+ languages, respondent picks language)
- Accessibility checker (Section 508 / WCAG 2.1 AA; VPAT says WCAG 2.2 AA)
- Spam protection: CAPTCHA, email verification codes, phishing/credential detection
- Custom thank-you page or redirect
- HIPAA-compliant forms

## 6. Publishing and sharing
- Direct link, custom URL slug, QR code
- Embed: JavaScript, iframe, lightbox (optionally auto-open), popup, floating feedback button
- Embed code for 30+ website platforms; WordPress plugins; Shopify
- Share by email with scheduled reminders; social sharing
- Assign form to people (email, CSV, expiring link, org-wide)
- Download as fillable PDF
- Bundle into an App
- Embeddable form builder (put the builder inside your own product)
- Website Widgets (2026)
- Mobile app: offline collection with sync, kiosk mode with PIN lock

## 7. Submissions management (Inbox)
- Inbox 2.0: list/detail view, search by field value, ID, IP or tag; filters; tags
- Comments and @-mentions
- Edit submission by resubmitting
- Print; download single/bulk/filtered as CSV, Excel, PDF (uploads as ZIP)
- Share inbox with edit or comment permissions
- Auto-delete submissions after forwarding (data retention)
- AI Data Assistant: summarize, translate, chart, filter and export
- Import submissions from CSV/Excel

## 8. Notifications and emails
- Owner notification emails, respondent autoresponders (with attachments)
- Custom email templates; conditional recipients
- Digest emails (scheduled summaries)
- WhatsApp alerts; mobile push notifications
- AI-generated email content

## 9. PDF features
- Drag-and-drop PDF Editor for branded submission PDFs
- Attach PDF to emails, send to integrations, show on thank-you page
- "Original PDF" layout download
- Smart PDF Forms: convert an uploaded PDF into an online form (25 or 50 page limit by plan)
- Fillable PDF forms and templates

## 10. Payments
- ~40 gateways: Stripe, PayPal (incl. Pro), Square, Authorize.Net, Braintree, Mollie, GoCardless, Moneris, Eway, CyberSource, Paysafe, Skrill, 2CheckOut, BlueSnap, BluePay, CardPointe, Chargify, iyzico, PayFast, PayJunction, Paymentwall, PayU, PayU India, SensePass, Worldpay UK/US, eCheck.Net, Purchase Order and others
- Wallets and BNPL: Apple Pay, Google Pay, Venmo, Cash App Pay, Afterpay, Clearpay
- Payment types: products (options, quantities, stock / sold-out), subscriptions, donations, user-defined amounts
- Coupons, tax, shipping; authorize-only capture; ACH/eCheck; sandbox test mode
- No Jotform transaction fee; PCI DSS Level 1
- **Not supported:** native Indian gateway (Razorpay) or UPI

## 11. Analytics
- Views, responses, response rate, conversion rate on a timeline
- Traffic sources, device, browser, OS, platform, location
- Google Analytics and Google Tag Manager tracking
- Visual Report Builder (bar/pie charts, grids)
- **Not advertised:** field-level drop-off, completion time

## 12. Templates, AI and import
- 20,000+ form templates in ~80 categories; separate libraries for PDF, Sign, Apps, Workflows, Tables, Boards, AI Agents, Store
- Jotform AI: create forms from prompt, file, image or URL; edit by chat; design; settings; emails; conditions; preview with test submissions; sharing
- Workspace Assistant
- Google Forms migration tool; PDF-to-form; CSV/Excel import

## 13. Collaboration and versioning
- Real-time co-editing via session links (expire after 72 hours)
- Teams and team workspaces; multiple users and roles (Enterprise)
- Revision history with restore (forms only, not Apps/Workflows)
- My Workspace hub: folders, cross-product labels, Shared with Me, Assigned to Me, Drafts

## 14. Other products in the suite
- **Tables:** spreadsheet-database; Table, Cards, Calendar, Report, Uploads and Form views; formulas; CSV/Excel import; action buttons (email, PDF, send to apps); AI Data Assistant
- **Reports:** visual report builder for charts and shareable reports
- **Inbox:** submission and workflow-run manager
- **Sign:** e-signature documents, signer roles, signing order, audit trail, reminders, in-person signing, 1,000+ templates; inside ChatGPT/Claude
- **Workflows (formerly Approvals):** canvas with Form, Email, Conditional Branch, Merge, Integration, Payment Form, Task and Approval steps; group approvers; reminders; expiry; restart/cancel; run tracking
- **Boards:** kanban tasks auto-created from submissions, agent chats, workflows, orders and signed docs; assignees, priorities, due dates, checklists, comments
- **Apps:** no-code PWA app builder with push notifications, public/private/company access; AI App Builder; inside ChatGPT/Claude
- **Store Builder:** online store using payment forms
- **AI Agents:** 16 channels (chatbot, phone, voice, SMS, WhatsApp, Messenger, Instagram, Gmail, Shopify, Salesforce, Canva, WordPress, kiosk, presentation, standalone, agent app); persona, knowledge base (text, URLs, files, Q&A), actions, tools (Calendar, Slack, OneDrive), human takeover, transcripts; fills linked forms by conversation; 7,000+ templates
- **Presentation Agents:** voice-narrated decks that answer questions
- **Mobile Forms app (iOS/Android):** offline, kiosk, push, in-person signing, mobile editing
- **Salesforce app**, **Canva chatbot**, **ChatGPT and Claude apps**, **MCP server**

## 15. Integrations and developer platform
- 200+ native integrations (CRM, email marketing, storage, spreadsheets, project management, communication), e.g. Google Sheets, Salesforce, HubSpot, Mailchimp, Slack, Dropbox, Google Drive, Airtable, Excel, Square, Claude
- Zapier, Make and Pipedream connectors; webhooks
- REST API (API key auth) for user, forms, questions, properties, submissions, reports, webhooks, folders; separate EU and HIPAA endpoints; daily rate limits by plan (1k to unlimited)
- 11 official SDKs (Node/TS actively maintained; PHP, Python, Java, C#, Go, Ruby, Scala, iOS, Android, JS)
- Official MCP server (Forms, Sign, Apps)
- WordPress plugins (embed, feedback, store, oEmbed)

## 16. Security, compliance and enterprise
- 256-bit SSL / TLS 1.2; encrypted forms; 2FA for all users
- GDPR (EU data in Frankfurt), CCPA, HIPAA with BAA (Gold+), PCI DSS Level 1, FERPA, HECVAT, StateRAMP
- SOC 2 Type II (Enterprise)
- Enterprise: SSO/SAML (multi-SSO), Admin Console, user management, custom domain, white labeling, AI Brand Kit, dedicated instance, data residency choice, team workspaces, org-wide form assignment
- Jotform Government edition

## 17. Plans and limits
| | Starter | Bronze | Silver | Gold | Enterprise |
|---|---|---|---|---|---|
| Price/mo (annual) | $0 | $39 ($34) | $49 ($39) | $129 ($99) | Custom |
| Forms | 5 | 25 | 50 | 100 | Unlimited |
| Submissions/mo | 100 | 1,000 | 2,500 | 10,000 | Unlimited |
| Form views/mo | 10K | 100K | 1M | 10M | Unlimited |
| Storage | 100 MB | 1 GB | 10 GB | 100 GB | Unlimited |
| Stored submissions | 500 | 10K | 25K | 100K | Unlimited |
| Payments & signed docs/mo | 10 | 100 | 250 | 1,000 | Unlimited |
| AI agents / conversations | 5 / 100 | 25 / 1K | 50 / 2.5K | 100 / 10K | Unlimited |
| API calls/day | 1K | 10K | 50K | 100K | Unlimited |
| Users | 1 | 1 | 1 | 1 | Multiple |
- 50% off Bronze–Gold for nonprofits and education
