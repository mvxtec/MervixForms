# WpForms by GlixWordpress

Self-hosted online form platform: drag-and-drop builder, conditional logic, card forms, payments,
e-signatures, approvals, submission inbox/tables, reports, webhooks, REST API and plan limits.

## Run

```bash
npm run setup      # installs server + client deps (first time)
npm run build      # builds the client into client/dist
npm start          # http://localhost:4000
```

Development with hot reload: `npm run dev` (API on :4000, UI on http://localhost:5173).
Tests: `npm test`.

Copy `.env.example` to `.env` to set `SESSION_SECRET`, `BASE_URL`, and optionally SMTP (real e-mail), `STRIPE_SECRET_KEY` (card payments) and `ANTHROPIC_API_KEY` (AI features).
Data lives in `data/` (SQLite `forms.db` + `uploads/`).

## Features

| Area | What's included |
|---|---|
| Workspace | Forms list, search, favorites, folders, trash/restore, clone, enable/disable, rename |
| Builder | 30 field types, drag & drop + click to add, reorder, duplicate, undo/redo, autosave, field limits per plan |
| Fields | Heading, paragraph, image, divider, page break, short/long text, email, phone, URL, number, full name, address, date, time, dropdown, single/multiple choice (with "Other"), file upload, star rating, scale, slider, input table (matrix), yes/no, product list, signature, appointment (slot booking with double-booking guard), calculation, hidden (URL prefill), terms, captcha |
| Layouts | Classic (multi-page via page breaks) and Card (one question per page), progress bar |
| Logic | Show/hide, require/optional, set or calculate values, skip to page, custom thank-you, redirect; all/any conditions; enforced server-side too |
| Calculations | Safe formula engine: `{field}` refs, + - * / % ^, min/max/round/floor/ceil/abs/sqrt/sum/avg/if |
| Design | Colors, font, width, logo, submit text, custom CSS |
| Settings | Close date, submission cap, password protection, save & continue later, one submission per user, thank-you message/redirect |
| Emails | Owner notification + autoresponder with `{fieldId}`/`{all_fields}` tokens, optional PDF attachment; delivered via SMTP when configured, always logged in the Outbox with sent/failed status |
| Payments | Product lists with quantities, server-side totals; Stripe Checkout if `STRIPE_SECRET_KEY` set, otherwise simulated test gateway |
| E-sign | Signature field, signed-documents count against plan |
| Approvals | Approver e-mails with secure no-login approve/reject links, decision notes, respondent notified, approve from Inbox |
| Inbox / Tables | Spreadsheet table + inbox view, filters (search, unread, starred, approval, date), bulk actions, edit, star, delete, print/PDF, CSV export, file downloads |
| Reports | Submissions over time, views & conversion, revenue, per-field charts, matrix breakdowns, stats |
| Publish | Link, QR code, iframe/script/popup embed, URL prefill, JSON export/import |
| Integrations | Slack, Discord, Google Sheets (Apps Script), webhooks with delivery log, REST API with API keys |
| PDF documents | Designed PDF per submission (title, intro, footer, color, logo, signatures embedded), download from Inbox or attach to e-mails |
| E-sign documents | Upload any PDF, drag signature/initials/name/date/text/checkbox fields, multiple signers, no-login signing links, consent, signed PDF with audit-trail certificate |
| AI | Create a form from a description, auto-translate forms, chat agent that fills the form conversationally (Claude, `ANTHROPIC_API_KEY`) |
| Translations | Per-form languages with a language picker and `?lang=` links; answers stored in the original language |
| Version history | Automatic snapshots while editing, named versions, preview and restore |
| Apps & Stores | Mobile app pages bundling forms, links and content; stores with product grid, cart, checkout (test mode or Stripe) and order management |
| Teams | Enterprise workspaces with admin / editor / viewer roles, invites, workspace switcher |
| Plans | Starter / Bronze / Silver / Gold / Enterprise limits (forms, submissions, views, storage, payments, signatures, fields, branding) |
