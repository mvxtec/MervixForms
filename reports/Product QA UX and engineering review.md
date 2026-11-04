# WpForms — QA, UX and engineering review

Build `main @ ae5a89c` · 4 November 2026 · Tested on isolated copies of the server with throwaway databases; your real data was not touched.

## Verdict
The product works end to end. Sign-up, building, publishing, submitting, payments in test mode, inbox, workflows, e-sign and stores all passed. **It is not ready for public production yet.** One critical and seven high-severity security problems, plus missing provider keys, have to be dealt with first. For an internal pilot inside your organisation it is usable once the **"Before any launch"** list below is done.

| | Count |
|---|---|
| Test cases run | **334** (316 API and flow cases + 18 hands-on browser checks) |
| Passed | **287** |
| Failed | **45** → **37 distinct defects** (1 Critical · 7 High · 17 Medium · 12 Low) |
| Blocked | 2 (need real Slack/Teams endpoints; in-memory state across restarts) |
| Screens opened without a console error | 31 of 31 |
| Automated test suite | 29 of 29 pass |

### Before any launch (shortest path)
1. Set a strong `SESSION_SECRET`. Without it, anyone can forge a login (D1).
2. Serve uploaded files as downloads, not web pages (D2), and allow only `http(s)` links in redirects and app buttons (D3, D4).
3. Add e-mail verification and password reset. Accept team invites only through the invite link (D5, D6, D22).
4. Remove free self-upgrade of plans (D7, D15).
5. Add rate limits to login, sign-up, form submit, uploads and the AI agent (D8, D21).
6. Configure SMTP, Stripe (or turn payments off), backups and HTTPS. See *Left for you*.

---

## Part 1 — Manual and end-to-end test report (senior SDET)

### Scope
- **API and flow testing:** 316 scripted cases against a running server, with one cookie jar per simulated user, a local webhook receiver and generated PDFs. Covered:
  - auth, teams and API keys
  - workspace
  - builder, all 36 element types, 24 widgets, conditions and versions
  - public forms, drafts, uploads, appointments, payments and ID/PIN
  - inbox, CSV, PDF and reports
  - e-mails, approvals and webhooks
  - workflows
  - e-sign
  - apps and stores
  - security and isolation across 41 endpoints
  - concurrency, performance and restart persistence
- **Hands-on browser testing:** a fresh account at desktop (1280 px) and phone (375 px) widths. Sign-up validation, Create menu, JSON import, template creation, builder add/undo/redo/autosave, public form errors and submission, test payment, thank-you page, inbox detail, outbox, and all 31 app and site screens.
- **Not covered:** real SMTP, Stripe, Claude AI, Google/Microsoft OAuth, Twilio and WhatsApp, because no keys are configured.

### Results by area
| Area | Cases | Pass | Fail | Blocked |
|---|---|---|---|---|
| Auth, account, keys, plans, teams, OAuth | 60 | 53 | 7 | 0 |
| Workspace | 20 | 20 | 0 | 0 |
| Builder, fields, widgets, conditions, versions, limits | 69 | 58 | 11 | 0 |
| Public form, drafts, uploads, appointments, payments | 46 | 37 | 9 | 0 |
| Inbox, CSV, PDF, reports, e-mails, approvals, webhooks | 35 | 31 | 3 | 1 |
| Workflows | 25 | 25 | 0 | 0 |
| E-sign, apps, stores | 25 | 22 | 3 | 0 |
| Security, isolation, roles | 25 | 17 | 8 | 0 |
| Concurrency and performance | 9 | 9 | 0 | 0 |
| Restart persistence | 2 | 1 | 0 | 1 |
| Browser: flows, screens, phone layout, accessibility | 18 | 14 | 4 | 0 |
| **Total** | **334** | **287** | **45** | **2** |

All fixes from the previous audit were re-tested and hold: async error handling, malformed products, single-use captcha, closed forms, JSON import, approval replay, workflow resume, unique IDs, pagination and unknown API paths.

### Defects
Severity: **Critical** means anyone can take over accounts. **High** is a security or money issue that is easy to exploit. **Medium** is a real bug or abuse path. **Low** is minor.

#### Critical and High (fix before any launch)
| ID | Sev | Defect | How to reproduce | Root cause | Fix |
|---|---|---|---|---|---|
| D1 | Critical | **Login cookies can be forged** when `SESSION_SECRET` is not set, because the code falls back to a public default secret. | Sign `{uid, exp}` with `dev-secret-change-me` and call `/api/me`: you are logged in as that user. | `server/auth.js:4`, `notify.js:13`, `routes/public.js:20` | Refuse to start in production without a strong secret; otherwise generate and persist one. |
| D2 | High | **Stored XSS through uploads.** A respondent uploads an `.html` or `.svg` file; when the owner opens it from the inbox, the script runs with the owner's session. | Upload an HTML file declared as `text/html` and open `/api/files/:id`. | `routes/submissions.js:166-167` serves the uploader's MIME type inline; no `nosniff` or CSP. | Download as an attachment except png/jpg/gif/pdf; add `nosniff` and `CSP: sandbox`; detect the type from file bytes. |
| D3 | High | **Thank-you redirect accepts `javascript:` URLs**, so scripts run on the platform's domain. | Set redirect to `javascript:…` and submit. | No scheme check: `routes/forms.js` PUT, `routes/public.js`, `FormRenderer.jsx:139`, `PublicForm.jsx:84` | Allow only `https?://` on save, on submit and in the browser. |
| D4 | High | **App and store buttons accept `javascript:` links.** | `PUT /api/apps/:id` with a button URL `javascript:…`. | `routes/apps.js:45-52`, `AppView.jsx:80` | Same URL allow-list. |
| D5 | High | **No e-mail verification.** Anyone who registers an approver's address sees their workflow tasks and can approve them. | Register `cfo@corp.io` → `/api/tasks/assigned` returns the token → approve. | `routes/account.js:11-21`, `routes/workspace.js:55-59` | Verify e-mail; don't return task tokens from `/tasks/assigned`. |
| D6 | High | **Team invites go to whoever registers that address first.** | Invite `newhire@x` as admin; an attacker registers it and becomes an admin. | `acceptInvites()` in `routes/account.js:24-29` | Accept only through the e-mailed invite link, with a verified address. |
| D7 | High (business) | **Anyone can upgrade to any plan for free**, including Enterprise. | `POST /api/me/plan {plan:"enterprise"}` | `routes/account.js:122-127` | Plan changes only from billing or a super-admin. |
| D8 | High | **No brute-force protection on login.** | 30 wrong passwords in a row: no lockout, then the right one works. | `routes/account.js:31-38` | Rate-limit per IP and per account, with backoff. |

#### Medium
| ID | Defect | Where | Fix |
|---|---|---|---|
| D9 | Sessions can't be revoked: a copied cookie works for 30 days after logout or a password change. | `server/auth.js:21-39` | Sessions table or `session_version`. |
| D10 | No security headers (CSP, X-Frame-Options, HSTS, nosniff); cookie never `Secure`; `X-Powered-By` exposed. | `server/index.js`, `auth.js:23,47` | helmet-style headers; keep `/f` and `/embed` frameable. |
| D11 | SSRF: form webhooks accept `http://` and internal addresses (loopback, cloud metadata). | `server/notify.js:169` | https only; block private and metadata IPs after DNS resolution. |
| D12 | Anonymous uploads that are never submitted use up the owner's storage quota (10 junk uploads blocked a real one). | `routes/public.js:317-333` | Count uploads only once submitted; delete orphans after 24 h. |
| D13 | The ID & PIN lockout can be bypassed by guessing through `/submit` (PIN found on the 10th try). | `routes/public.js:414-420` | Apply the same lockout to submit. |
| D14 | A form password can be brute-forced and travels in the URL. | `routes/public.js:295-298` | POST body, rate limit, constant-time compare. |
| D15 | Plan names like `__proto__` are accepted and remove every limit. | `account.js:124`, `shared/plans.js:38` | `Object.hasOwn(PLANS, plan)`. |
| D16 | The fields-per-form limit is skipped on JSON import and clone (500 fields on Starter). | `routes/forms.js:73-89,173-179` | Check the limit in `insertForm`. |
| D17 | CSV formula injection: `=HYPERLINK(…)` answers run in Excel or Sheets. | `routes/submissions.js:48` | Prefix `= + - @` with `'`. |
| D18 | A form mixing currencies adds them together (USD 40 + INR 999 recorded as INR 1,039). | `routes/public.js:459-473` | One currency per form. |
| D19 | Unbounded quantity (`1e308`) gives a `null` total that is still marked paid. | `routes/public.js:455` | Clamp quantity; reject non-finite totals. |
| D20 | Anonymous drafts have no size cap (10 MB stored) or rate limit. | `routes/public.js:360-372` | Cap size, rate-limit, expire. |
| D21 | No rate limit on public submit (200 in a burst accepted); with autoresponders the server can be used to spam. | `routes/public.js` | Per-IP/per-form limits; honeypot. |
| D22 | No forgot-password / reset flow. | — | E-mailed reset token. |
| D34 | **Respondent form fields aren't linked to their labels.** Screen readers announce unlabelled boxes on every form (WCAG 1.3.1 fail). *Found in the browser.* | `FormRenderer.jsx:198` | `id` on inputs plus `htmlFor`; `fieldset`/`legend` for grouped fields. |
| D35 | **After a failed submit, focus stays on the page body**, with no error summary for keyboard and screen-reader users. *Found in the browser.* | `FormRenderer.jsx` | Error summary with `role="alert"`; move focus; `aria-invalid`. |
| D36 | **Form builder is unusable on a phone:** the element palette fills the screen and the form is far below. *Found in the browser.* | `styles.css` builder breakpoints | Canvas first, palette and properties as bottom sheets. |

#### Low
| ID | Defect | Where |
|---|---|---|
| D23 | Server-side validation gaps: radio values outside the options, rating 99/5, slider above max, non-dates, objects in text fields, custom donation when disabled. | `shared/logic.js:186-252` |
| D24 | No default answer length cap (a 5 MB answer was stored). | `shared/logic.js` |
| D25 | Appointment slot and past dates not validated on the server. | `routes/public.js` |
| D26 | Store order with malformed `items` returns 500. | `routes/apps.js:94` |
| D27 | Negative store price gives a negative "paid" order. | `routes/apps.js:45-52,94-99` |
| D28 | Favourite endpoint returns 500 for prototype-key types (not injectable). | `routes/workspace.js:47` |
| D29 | Profile name accepts objects (`[object Object]`). | `routes/account.js:111` |
| D30 | ~~Landing page claimed IFSC validation, which doesn't exist~~. **Copy corrected in this session**; the IFSC validator itself is still missing. | `Site.jsx:159`, `shared/widgets.js` |
| D31 | Outgoing webhooks are unsigned. | `server/notify.js` |
| D32 | A draft token can overwrite another form's draft. | `routes/public.js:368-370` |
| D33 | A voided sign document can still be downloaded through the old signer link. | `routes/sign.js:128-133` |
| D37 | Signed in, an unknown address (`#/nope`) silently shows the workspace instead of "page not found". *Found in the browser.* | `client/src/App.jsx` |

### What's working (verified)
- **Accounts:** sign-up validation, login and logout, scrypt-hashed passwords, profile and password change, account deletion, API keys, team invites/roles/removal, viewer read-only, forged workspace cookie rejected, OAuth disabled cleanly without keys.
- **Workspace:** every view (all, forms, workflows, apps, sign, favorites, archive, trash, labels), search, sort, favourites on every item type, restore with quota re-check, delete forever, assigned tasks.
- **Builder:** blank, 7 templates, JSON import with clear errors, all 36 element types save and render, autosave, undo/redo, versions and restore, clone, form and field quotas on save, 24 sampled widgets including Aadhaar, PAN, GSTIN, IBAN, PIN code, BMI, EMI and date difference, all condition types, server-side calculation.
- **Public forms:** owner-only settings hidden, password, close date, max submissions, one per person, drafts, uploads with type/size limits, appointment double-booking blocked (also under 20 parallel bookings), signatures, test payments with server-side prices, purchase order, donation and subscription, thank-you page and redirect, card and multi-page layouts, translations, prefill.
- **Inbox:** list, search, filters, read/star/edit, bulk actions, CSV, Unicode-safe PDF (Hindi, emoji, CJK), reports, owner decisions e-mailed.
- **Notifications:** test e-mail, notification and autoresponder e-mails (answers escaped), PDF attachment, conditional recipient, outbox, WhatsApp/SMS fail gracefully without keys, form approvals, webhooks delivered and logged, https-only integrations, Teams posts.
- **Workflows:** all 20 templates, tracking e-mail and page, approvals with notes, team approval, tasks, if/else, ID generator, calculate, update value, AI steps skipped without key, pause/resume/cancel/restart, waits and scheduled e-mails resume on time, conditional trigger, test run.
- **E-sign:** PDF upload checked by content, fields and signers, consent, signing, double-sign blocked, signed PDF with certificate page, void and delete.
- **Apps and stores:** create, edit, delete, public page, order totals, quantity limits, test payment, order e-mails and status.
- **Security:** isolation between accounts on 41 endpoints, no CORS exposure, parameterised SQL, path traversal blocked, deleted users logged out, 15 MB body limit.
- **Robustness:** 30 parallel submits against a limit of 10 stored exactly 10; 50 parallel unique IDs all distinct; data survives restarts.
- **Interface:** no console errors on any of 31 screens; respondent form works well on a phone.

### Performance (2,000 submissions, local laptop)
| Operation | Result |
|---|---|
| 2,000 public submissions (50 at a time) | 5.7 s (~349 per second) |
| Inbox page of 50 | 12 ms |
| Search | 1 ms |
| CSV export of 2,000 rows | 13 ms |
| Report | 9 ms |
| Other requests while a CSV export runs | 15 ms |

This is fine at this size. Lists, CSV and reports load every row into memory, so move paging into the database before you reach about 100,000 submissions per form.

### Left for you (configuration, keys and decisions)
**Must do before launch**
1. `SESSION_SECRET`: 32+ random characters (D1). Never use the `.env.example` value.
2. `BASE_URL`: your public https address. It is used in every e-mailed link, QR code and payment redirect.
3. HTTPS reverse proxy (for example Caddy or Nginx), process manager and log rotation.
4. Backups of `data/forms.db` (including its `-wal` file) and `data/uploads/`, with a tested restore.
5. Change or remove the seeded admin account (`ADMIN_EMAIL` / `ADMIN_PASSWORD`).
6. SMTP (`SMTP_*`) plus SPF, DKIM and DMARC on your domain. Until then, no e-mail is actually sent; it only appears in the Outbox.
7. **Payments:** set `STRIPE_SECRET_KEY`. Without it, every payment is *simulated and marked paid*, so don't publish payment forms until a gateway is configured.

**Optional keys (features switch on when set)**
8. `ANTHROPIC_API_KEY`: AI form builder, AI conditions, translation, chat agent, AI workflow steps.
9. Google / Microsoft OAuth credentials. Callback: `<BASE_URL>/api/auth/oauth/google/callback` (or `/microsoft/callback`).
10. Twilio (`TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`) for SMS; WhatsApp Cloud API (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`) plus approved message templates.

**Business decisions**
11. Billing for plans. Today plans are free to switch (D7); prices are in `shared/plans.js` and shown in US dollars.
12. Indian payment gateway: Razorpay, Cashfree or PayU (not built yet).
13. Terms of service and privacy policy text. The Help page has placeholders; you also need e-sign consent wording and a cookie notice.
14. A support e-mail address and a grievance officer contact (DPDP Act).
15. Product name and branding, and the "Powered by" line on free forms.
16. Remove the "HIPAA features" claim from plans unless you implement and certify it; nothing enforces it today.
17. Data retention period for submissions and uploads.

---

## Part 2 — UI/UX and frontend review

Reviewed in the browser at 1280 px and 375 px on a fresh account, plus the client source. Each item has a priority: **P0** fix before launch, **P1** next, **P2** polish.

### What already works well
- One icon set (Phosphor), one cool-grey palette, one accent; header, menus, workspace, builder, settings, workflow builder and landing page now look like one product.
- Autosave with a visible "All changes saved" state, undo/redo, keyboard-reachable menus, Escape closes popovers.
- Respondent forms: large touch targets, labels above inputs, clear inline errors, correct server-side totals.

### Accessibility (respondent forms are public — these matter most)
| # | Pri | Finding | Evidence | Change |
|---|---|---|---|---|
| A1 | P0 | Form labels are not linked to their inputs, so screen readers announce every field as an unlabeled edit box (9 of 9 inputs on the Event Registration form). Fails WCAG 1.3.1 / 4.1.2. | `client/src/components/FormRenderer.jsx:198` renders `<label className="wf-label">` without `htmlFor`; inputs have no `id`. | Give each input `id={`f-${f.id}`}` and the label `htmlFor`; for multi-input fields (name, address, products) use `<fieldset><legend>`. |
| A2 | P0 | After a failed submit, focus stays on `<body>` and there is no error summary, so keyboard and screen-reader users don't learn what went wrong. | Reproduced: submit empty form → `document.activeElement` is body. | Render an error summary (`role="alert"`, links to fields) at the top and move focus to it; set `aria-invalid` and `aria-describedby` on the field. |
| A3 | P1 | Quantity boxes for products have no accessible name. | Probe on `/f/:id`. | `aria-label={`Quantity for ${p.name}`}`. |
| A4 | P1 | Required errors are generic ("This field is required.") | Reproduced. | Use the label: "Enter your e-mail", "Choose at least one ticket". |
| A5 | P2 | Colour contrast of `--faint` (#a1a1aa) text on white is 2.6:1 — used for section labels and "Soon" items. | `styles.css` tokens. | Use `--muted` (#71717a, 4.8:1) for any text people must read. |

### Flows and screens
| # | Pri | Finding | Change |
|---|---|---|---|
| U1 | P0 | **Builder on a phone shows the element palette first**; the form itself is several screens down. Editing on mobile is effectively impossible. | Below 900 px show the canvas only, with a floating "Add element" button that opens the palette as a bottom sheet, and field properties as a sheet. |
| U2 | P1 | First run is a bare "Nothing here yet". New users get no guidance. | Replace with a 3-step start: "Create your first form" (blank / template / AI), "Share it", "See responses", plus 3 template tiles. |
| U3 | P1 | Developer messages reach end users: "Set ANTHROPIC_API_KEY in .env…" in Create form, and "Connect a billing provider in `server/routes/account.js`" on Plan & usage. | Show these only to the workspace owner/admin, worded as "AI drafting isn't switched on for this workspace. Ask your administrator." |
| U4 | P1 | The Create-form modal still uses coloured placeholder bars on template cards, the last trace of the old look. | Reuse the landing page's template tiles (icon, name, field count, description). |
| U5 | P1 | Sign documents, Apps & stores, Workflows list and Account pages still use the older plain table with "+ New app" text glyphs and title-case headings ("E-Sign Documents"). | Move them onto the workspace list pattern (rows with icon, status pill, action menu), sentence-case titles, `Icon name="plus"` in buttons. |
| U6 | P1 | 20 native `alert()` / `confirm()` / `prompt()` dialogs (rename, set label, delete forever, etc.). They block the page, can't be styled and read poorly on phones. | One `<Dialog>` component (confirm + single-input variants) and an inline rename on double-click. Use a toast for success. |
| U7 | P1 | Templates price in **US$** for an India-first product; currency defaults to USD. | Default currency INR and `en-IN` number formatting; per-workspace currency setting. |
| U8 | P2 | Signed in, an unknown address (`#/nope`) silently shows the workspace. | Show the same not-found page the public site uses. |
| U9 | P2 | Create menu shows "Website Widget" as both **New** and **Soon**. | Keep only "Soon". |
| U10 | P2 | Inbox shows raw IPv6 (`::ffff:127.0.0.1`) and a "Mark read" button on a message that was just opened. | Strip the `::ffff:` prefix; label the toggle by state ("Mark unread"). |
| U11 | P2 | Plan table mixes `1000` and `1,000`. | Format every number with `toLocaleString('en-IN')`. |
| U12 | P2 | Loading states are the word "Loading…". | Skeleton rows matching the list layout. |
| U13 | P2 | No dark mode. | Tokens are already variables; add a `prefers-color-scheme: dark` palette for the app (keep respondent forms on the form's own theme). |

### Frontend engineering
| # | Pri | Finding | Evidence | Change |
|---|---|---|---|---|
| F1 | P0 | One JavaScript bundle of **1.46 MB** (minified) for every page, including the public form people open on phones. | `client/dist/assets/index-*.js` | Route-level code splitting with `React.lazy` (builder, workflow builder, sign/PDF editor, reports, site). Load `pdfjs-dist` only on the sign editor. Serve public forms from a tiny separate entry. Target < 200 kB for `/f/:id`. |
| F2 | P1 | Hash routing (`#/pricing`) means the public site can't be indexed or shared with clean links, and skip links/anchors fight the router. | `client/src/router.js` | Move to History API routing (`/pricing`, `/templates`) with server fallback to `index.html`; keep `/f/:id` server-rendered or pre-rendered for SEO and link previews. |
| F3 | P1 | 472 inline `style={{…}}` objects. They bypass the design tokens and are why some screens drift visually. | `grep -c "style={{"` | Move to classes; add small utility classes (`stack-8`, `text-muted`, `w-auto`) for the common cases. |
| F4 | P1 | Large components: `Widgets.jsx` 566 lines, `Site.jsx` 446, `WorkflowBuilder.jsx` 398, `Fields.jsx` 373, `Builder.jsx` 362. | `wc -l` | Split by responsibility (one file per widget kind; site pages per file; builder canvas/props/palette). |
| F5 | P1 | No client tests and no end-to-end tests; all 29 tests are server-side. | `server/test` only | Playwright smoke suite: sign up → create from template → publish → submit → inbox → CSV; plus axe-core accessibility checks on `/f/:id`. |
| F6 | P2 | No TypeScript or shared schemas; the same form shape is validated by hand on both sides. | — | Define the form definition with zod in `shared/` (zod is already a dependency) and infer types via JSDoc or move to TypeScript gradually. |
| F7 | P2 | No ESLint/Prettier config. | repo root | Add both with a pre-commit hook. |

---

## Part 3 — Scope of improvements (senior full-stack review)

Senior full-stack / architecture review of `C:\Users\sarthak\Desktop\mervix\jotform2` at commit `ae5a89c` (2026-11-04).
Read-only review. Ran `npm test`, `npm run build`, and `npm audit` for root and client. No source files were edited.

Conventions: **P0** = must fix before production. **P1** = next quarter. **P2** = later. Effort: **S** ≤ 2 days, **M** ≤ 2 weeks, **L** > 2 weeks.
"Verified" means I read the code at the cited line. "Inferred" means a reasonable conclusion I did not test at runtime.
Gaps already in the spec (`docs/Product and engineering specification.md` §3.2, G1–G17) are referenced by ID and not re-explained. **NEW** marks findings that are not in the spec.

---

### 1. Executive summary

- **Several new P0 security defects are not in the G-list.** (a) **Account takeover through Microsoft sign-in**: the email fallback in `server/routes/oauth.js:55-60` logs a Microsoft identity into any existing account that is already linked to *any* OAuth provider. (b) **Workspace takeover through invites**: any account registered with an invited e-mail joins the team, and nobody checks that the person owns that address (`account.js:19,24-29`). (c) **Stored XSS**: a public form serves uploaded files `inline`, on the app origin, with the MIME type the uploader declared (`public.js:128`, `submissions.js:162-169`). There is no CSP and no `nosniff`.
- **Payments fail open.** If `STRIPE_SECRET_KEY` is missing in production, every form payment and store order is silently marked **paid** (`public.js:243,279`, `apps.js:102`). There are no Stripe webhooks: a payment is confirmed only when the buyer's browser comes back to the return URL, so a closed tab means a paid order that is never recorded. Zero-decimal currencies such as JPY, which the currency list offers, are charged 100×.
- **All 17 documented gaps (G1–G17) still exist**, including G16 (anyone can upgrade their own plan for free). Not one has been fixed since the spec was written.
- **There is no abuse protection at all.** No rate limiting exists anywhere: login, register, submit, upload, and the **unauthenticated AI agent** that spends the owner's Anthropic credits. There are no security headers, no password reset, no e-mail verification, and sessions are 30-day stateless cookies that cannot be revoked and have no `Secure` flag.
- **Data layer.** The single SQLite file (WAL) is fine for one organisation's volume. But only 2 secondary indexes exist against roughly 25 query patterns, there is no migration versioning, no backups and no audit log, and Aadhaar/PAN values sit in plain JSON. Deleting a form or an account leaves its files on disk, which is a gap against the DPDP Act's erasure requirement.
- **Client.** One 1.46 MB JS chunk (398 kB gzip) loads for every page, including the public form `/f/:id`, which respondents on Indian mobile networks hit most. Lazy routes plus a separate public-form entry would cut public-form JS by roughly 70% (inferred).
- **Engineering hygiene.** There are 29 server tests and 0 client or e2e tests. There is no ESLint, Prettier, TypeScript or JSDoc typing, CI, Dockerfile, health check or graceful shutdown. zod is a dependency but is used only in `server/ai.js`. `nodemailer@6.10.1` has a **high-severity** advisory.
- **Recommended path.** First, two weeks of Phase 0 hardening (the P0 list in §4). Then Phase 1: a job queue, Postgres plus S3/R2, Razorpay/UPI, and the API/OpenAPI/zod contract. Finally Phase 2: product parity items such as Tables, analytics, SSO, the WordPress plugin and the public API.

---

### 2. Current state snapshot

| Metric | Value | How measured |
|---|---|---|
| Server code (excl. tests) | 3,048 lines / 176 KB, 10 route modules | `wc` on `server/*.js server/routes/*.js` |
| Server tests | 641 lines, **29 tests, 29 pass**, ~2.2 s | `npm test` (node:test, 6 files) |
| Shared code | 1,501 lines / 128 KB (`shared/widgets.js` alone is 62 KB) | `wc` |
| Client code | 6,467 lines / 398 KB in 41 page/component files + 805-line / 75 KB `styles.css` | `wc` |
| Largest client files | `Widgets.jsx` 36 KB, `WorkflowBuilder.jsx` 28 KB, `Site.jsx` 25 KB, `Builder.jsx` 22 KB, `Fields.jsx` 20 KB, `SettingsPanel.jsx` 20 KB | `wc -c` |
| Inline styles | **494** `style={{…}}` occurrences in `client/src` | grep |
| Client bundle | `index-*.js` **1,463.8 kB (398.5 kB gzip), single chunk**; `pdf.worker.min.mjs` 1,375.8 kB; CSS 65 kB (12.6 kB gzip); 4,670 modules | `npm run build` (Vite 6.4.5) |
| Runtime deps (server) | 6: express 4.22.3, multer 2.5.0, nodemailer 6.10.1, pdf-lib 1.17.1, zod 4.6.7, @anthropic-ai/sdk 1.3.0 | `npm ls` |
| Runtime deps (client) | 5: react/react-dom 18.3.1, @phosphor-icons/react, pdfjs-dist 4.10.38, qrcode | `npm ls` |
| npm audit (root) | **1 high**: nodemailer < 10.x (address-parser recipient-domain bypass, DoS, TLS issues; fix = major bump to 10.3.1) | `npm audit` |
| npm audit (client) | 0 vulnerabilities | `npm audit` |
| Node | v24.22.1 (`node:sqlite` `DatabaseSync`) | `node --version` |
| DB indexes | 2 secondary (`idx_sub_form`, `idx_runs_wait`) for 17 tables | `server/db.js:49,208` |
| Tooling | No ESLint, Prettier, tsconfig/jsconfig, `.github/` CI, Dockerfile, or client/e2e tests | `ls` |

#### Spec gap status (G1–G17): all still present

| Gap | Still present? | Evidence |
|---|---|---|
| G1 SQLite single process | Yes | `server/db.js:11-12` |
| G2 no `form_version_id` on submissions | Yes | `db.js:35-48` |
| G3 in-process side effects | Yes | `public.js:310`, `notify.js:139-188` |
| G4 webhooks unsigned, no retry/SSRF guard | Yes (`http://` allowed for plain webhooks) | `notify.js:128-135,169` |
| G5 local-disk uploads, no scan | Yes | `public.js:106-112` |
| G6 plaintext form password | Yes | `public.js:92-93,163,185`; `ai.js` route line 39 |
| G7 API keys plaintext, query param accepted | Yes | `auth.js:60,62`; `db.js:74-79` |
| G8 one-per-user by IP | Yes | `public.js:186` |
| G9 booking scan of all submissions | Yes (twice: `/booked` and submit) | `public.js:138,237` |
| G10 inbox loads all rows, `LIKE` on JSON | Yes (also CSV and `/report`) | `submissions.js:21-41,50` |
| G11 guessable integer submission IDs | Yes | `db.js:36` |
| G12 no Razorpay/UPI | Yes | `server/payments.js` (Stripe only) |
| G13 forms on app origin | Yes; this is what makes the new XSS finding S3 exploitable | `index.js:69-73` |
| G14 insecure default secret | Yes, duplicated in 3 places | `auth.js:4`, `public.js:20`, `notify.js:13` |
| G15 form password in GET query | Yes | `public.js:93` |
| G16 self-upgrade plan | **Yes, confirmed**: any signed-in user, no role check, no payment | `account.js:121-127` |
| G17 keys listed in full, user-scoped | Yes | `account.js:135-137` |

---

### 3. Findings by area

#### 3.1 Security

| # | Pri | Effort | Finding (what and why) | Evidence | Recommendation |
|---|---|---|---|---|---|
| S1 **NEW** | P0 | S | **Account takeover through Microsoft OAuth.** The callback looks the user up by `oauth` key **or by e-mail**. The "don't link non-Google providers" guard runs only when the found user has *no* `oauth` value. So a Microsoft identity whose `email` claim equals the victim's address gets a session for any victim already linked to Google. Microsoft's `common` endpoint `email` claim is not guaranteed verified (the nOAuth class of bug). | `server/routes/oauth.js:55-60` (`…WHERE oauth = ?').get(key) \|\| …WHERE email = ?'`, then `if (user && !user.oauth)`) | Look up **only** by `provider:sub`. Link by e-mail only for Google with `email_verified === true`, and only after the user has authenticated to the existing account. Add a regression test. |
| S2 **NEW** | P0 | M | **Team invite hijack and no e-mail verification.** `acceptInvites` runs on register and on every login, and turns any pending invite for that e-mail into membership. Registration never verifies the e-mail, so anyone who learns (or guesses) an invited address joins the workspace with the invited role. | `account.js:11-21` (register), `:19,36` (call sites), `:24-29` | Add e-mail verification (signed token, `users.email_verified_at`). Accept invites only through the invite token link, and only once the e-mail is verified. Expire invites (7 days). |
| S3 **NEW** | P0 | S | **Stored XSS through uploads.** Public uploads store the client-declared `file.mimetype`. The authenticated `/api/files/:fid` serves the file `inline` with that Content-Type from the app origin. A respondent uploads `x.html` (or SVG) declared as `text/html`, the owner opens it in the inbox, and the script runs with the owner's session and can call every `/api` endpoint. `accept` is only checked if the owner set it, and only by extension. | `public.js:114-129` (stores `file.mimetype`), `submissions.js:162-169` (`inline`, `up.mime`); no CSP or `nosniff` anywhere (grep) | Always send `Content-Disposition: attachment` except for an allow-list (png/jpg/pdf). Send `X-Content-Type-Options: nosniff` and `Content-Security-Policy: sandbox` on file responses. Sniff the type server-side (magic bytes). Long term, serve files from a separate cookieless origin or signed S3 URLs (G13/G5). |
| S4 **NEW** | P0 | S | **No rate limiting anywhere.** Login and register can be brute-forced. Submit, upload, draft, captcha and the approval/sign/task token endpoints have no throttling. Only the ID & PIN widget has an in-memory limiter. | grep for rate limiting: none; `public.js:50-60` is the only limiter | Add `express-rate-limit` (or a token bucket in SQLite/Redis) per IP plus per account: login 5/min, register 3/hr/IP, submit 30/min/IP/form, upload 20/min, AI 10/min. Lock out the account with progressive delay. |
| S5 **NEW** | P0 | S | **Unauthenticated AI agent spends the owner's Anthropic credits.** `/api/public/forms/:id/agent` accepts up to 80 history entries of unbounded size (the global JSON limit is 15 MB) with no throttle. AI translate/conditions also accept an arbitrary client `definition`. | `server/routes/ai.js:34-48`; `index.js:46` | Per-form and per-IP limits, a monthly AI-call quota in `usage`, cap history entry length and total tokens, and a kill-switch per workspace. |
| S6 | P0 | S | **G16 confirmed.** `POST /me/plan` changes the plan with no payment and no role check. This also bypasses the HIPAA, custom-domain and team gates. | `account.js:121-127` | Remove it, or gate it behind `ADMIN_EMAILS` / a staff role. Plan changes should come only from billing webhooks. |
| S7 **NEW** | P0 | S | **Session design.** The HMAC-signed stateless cookie (`uid`, `exp`) lasts 30 days, lacks the `Secure` flag, and cannot be revoked: logout only clears the browser cookie, and a password change leaves other sessions valid. The `mf_ws` cookie is not HttpOnly. The secret has an insecure default (G14). | `auth.js:4,6,23,27,47` | Use a server-side `sessions` table (random 256-bit id, hashed), sliding 7-day idle / 30-day absolute expiry, `Secure; HttpOnly; SameSite=Lax` (`__Host-` prefix). Rotate the session on login and on privilege change, revoke all on password change, and add a "sign out other devices" option. Refuse to boot with `NODE_ENV=production` and a default secret. Use **separate** secrets for session, captcha and approval links. |
| S8 **NEW** | P0 | M | **No password reset flow** (grep finds no forgot/reset). Users who forget their password are locked out permanently. | grep `forgot\|reset` → none | Add a reset with a single-use, 30-minute hashed token, e-mailed. Revoke sessions on reset. |
| S9 | P0 | S | **SSRF (G4, extended).** Plain form webhooks accept `http://` to any host (`169.254.169.254`, `localhost:…`, RFC 1918 addresses). `test-integration` requires https but still reaches internal hosts and returns the status code, which gives a port and service oracle. The workflow webhook, Slack, Teams and Sheets steps behave the same. | `notify.js:128-135,169,174,191-205`; `workflows.js:111-114` | Run one `safeFetch()` for all outbound calls: https only, resolve DNS and reject private/link-local/loopback/CGNAT ranges (and again after redirects, or disable redirects), with a timeout and size cap. Ideally route through an egress proxy. HMAC-sign the payload (`X-WpForms-Signature`). |
| S10 **NEW** | P1 | S | **No security headers.** No CSP, HSTS, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy` or `nosniff`. Embeds need framing for `/embed/:id` only. | `index.js` (no headers middleware) | Add `helmet` with a strict CSP (`script-src 'self'`). Allow `frame-ancestors *` only on `/f/*` and `/embed/*`, and `DENY` elsewhere. |
| S11 **NEW** | P1 | S | **Autoresponder open relay / phishing.** Anyone can submit a public form with a victim's address, and the platform mails owner-authored, unsanitised HTML (custom sender name, reply-to) to that address. Spam complaints will burn the SMTP domain's reputation. | `notify.js:79-88` (`emailList(data[email.toField])`), `:42` | Rate-limit per recipient and per form. Sanitise owner HTML server-side with the same allow-list as `client/src/sanitize.js`, moved into `shared/` and run on the server with a DOM implementation or `sanitize-html`. Optionally use double opt-in for autoresponders and add `List-Unsubscribe`. |
| S12 **NEW** | P1 | S | **Quota-exhaustion DoS.** Every public `GET /forms/:id` increments views and the plan's view quota. Hitting it in a loop closes all of the owner's forms ("reached its monthly view limit"). Uploads count against the owner's storage even if never submitted (orphans are never cleaned). | `public.js:96-99,69-70,127-128` | Count views in a beacon after render, deduplicated per visitor per day. Use a rate limit (S4). Put uploads into a `pending` state, count them only once attached to a submission, and garbage-collect orphans after 24 h. |
| S13 **NEW** | P1 | S | **Global 15 MB JSON body limit**, including unauthenticated public endpoints. | `index.js:46` | Default 100 kB. Raise per route only (form PUT, sign PNG data URLs). |
| S14 **NEW** | P1 | S | **`trust proxy` is `'loopback'`.** Behind Docker, a load balancer or Cloudflare, `req.ip` becomes the proxy IP, so G8, the ID/PIN lockout and any future rate limit apply to everyone at once. | `index.js:45` | Make it configurable (`TRUST_PROXY` = hop count or CIDR). |
| S15 **NEW** | P1 | S | **Editors can permanently delete** forms and all their submissions, and bulk-delete submissions. There is no soft delete and no audit trail. | `forms.js:166-170`; `submissions.js:142-160` | Restrict permanent delete to admin/owner. Purge trash after 30 days via a job. Write an audit log (D7). |
| S16 **NEW** | P1 | S | **Inbox edits accept arbitrary keys.** `PATCH /submissions/:sid` merges any `data` object without validating it against the form. | `submissions.js:113-117` | Validate with the shared `validateAll` and restrict keys to input field ids. Record the edit in the audit log. |
| S17 | P1 | S | **nodemailer 6.10.1 is high severity** (recipient-domain bypass, DoS, TLS validation). | `npm audit` | Upgrade to nodemailer ≥ 10.3 (breaking; mostly API-compatible for `createTransport` and `sendMail`) and retest. Add `npm audit --omit=dev` to CI. |
| S18 **NEW** | P1 | S | **CSRF relies only on `SameSite=Lax` plus JSON content type.** This is acceptable today, but `/auth/logout` and multipart endpoints have no Origin check. Same-site subdomains (e.g. a future `forms.` subdomain) are not covered by SameSite. | `auth.js:23`; `sign.js:37` (multer) | Add an Origin/`Sec-Fetch-Site` check middleware for state-changing `/api` routes (excluding `/api/public` and API-key requests). |
| S19 **NEW** | P2 | S | **Weak password policy.** Only a length ≥ 8 rule, no breached-password check. scrypt is used with default cost. | `account.js:14,115`; `auth.js:8-11` | Use a 10+ character minimum and a k-anon HIBP check or a top-100k list. Raise the scrypt cost (N=2^15) and store the parameters in the hash string. Offer TOTP 2FA (P1 for admins). |
| S20 **NEW** | P2 | S | **Weak public tokens.** The approval link token is an HMAC truncated to 32 characters, keyed on the session secret, and never expires. Signer/task/draft tokens never expire. | `notify.js:17-18`; `public.js:171-175` | Use expiring, purpose-separated keys. Expire drafts after 30 days. |

#### 3.2 Payments

| # | Pri | Effort | Finding | Evidence | Recommendation |
|---|---|---|---|---|---|
| P1 **NEW** | P0 | S | **Simulated gateway fails open.** Without `STRIPE_SECRET_KEY`, form payments get `status: 'paid'` with a `test_…` ref, and store orders are marked paid and confirmed to the customer. A missing env var in production equals free goods. | `public.js:243,279`; `apps.js:102` | Allow the test provider only with `PAYMENTS_TEST_MODE=true`. In production, refuse to publish forms with payment fields until a gateway is configured. Label test submissions clearly in the inbox. |
| P2 **NEW** | P0 | M | **No Stripe webhook.** Confirmation happens only on `GET /payment/return`. If the buyer closes the tab after paying, the submission stays `pending`, notifications, workflows and the receipt never fire, and the order is never fulfilled. There is also a check-then-act race: two concurrent returns can both run `afterSubmit`. Subscriptions get no renewal or failure events. | `public.js:314-329`; `apps.js:131-146` | Add `POST /api/public/stripe/webhook` with signature verification (raw body, `Stripe-Signature`) handling `checkout.session.completed`, `async_payment_succeeded`/`failed`, `charge.refunded`, and `invoice.*`. Make the transition idempotent: `UPDATE … SET payment=… WHERE id=? AND json_extract(payment,'$.status')!='paid'` and act only if `changes===1`. Keep the return URL for UX only. Use `Idempotency-Key` on session creation. |
| P3 **NEW** | P0 | S | **Currency bugs.** `unit_amount = Math.round(price*100)` is wrong for zero-decimal currencies, and JPY is in the currency list, so JPY is charged 100×. With several product/donation/subscription fields in different currencies, `payment.currency` is simply the last one's, so the amounts are summed across currencies. Amounts are JS floats and the `orders.total` column is REAL. | `payments.js:28` (`server/payments.js` line with `unit_amount`); `shared/datasets.js:32`; `public.js:256,263,270`; `db.js:163` | Store integer minor units. Use a currency-exponent table (JPY/KRW = 0, KWD/BHD = 3). Reject mixed currencies in one form at save time and at submit. |
| P4 | P1 | L | **No Indian gateways (G12).** There is no Razorpay, Cashfree or PayU, so no UPI, RuPay or netbanking, the core payment methods for an India-first product. | `server/payments.js` | Create a `PaymentGateway` interface (`createCheckout`, `verifyWebhook`, `refund`, `fetchStatus`). Ship **Razorpay first** (UPI intent/collect, Orders API, webhook HMAC), then Cashfree, and keep PayU optional. Store each owner's gateway credentials encrypted per workspace (Razorpay Route or Partner for marketplace mode). |
| P5 **NEW** | P1 | M | **No refunds, receipts or GST invoices.** No refund endpoint or UI exists. There is no invoice numbering, GSTIN of seller or buyer, HSN/SAC, CGST/SGST/IGST split by place of supply, or PDF tax invoice. A GSTIN validator widget exists, but no invoicing does. | grep `refund\|invoice\|GST` (server) → none | Add `payments` and `refunds` tables (see D2), a sequential per-workspace invoice series (Rule 46 CGST), and an invoice PDF through `pdf-lib`. Owner settings: legal name, GSTIN, state, default HSN/SAC and tax rate. Put a refund action in the inbox that calls the gateway API. |
| P6 **NEW** | P1 | S | **Usage is counted before payment is confirmed.** A failed Stripe session deletes the submission but leaves `payments`/`submissions` usage bumped (`apps.js` bumps before checkout). The Stripe `fetch` has no timeout. | `public.js:285-305`; `apps.js:104-115`; `payments.js` `stripe()` (no `AbortSignal`) | Bump usage only on confirmation. Add a 10 s timeout and retry with an idempotency key. |
| P7 | P2 | M | **Platform billing for our own plans** (SaaS resale) does not exist; it is G16's other half. | `account.js:121` | Razorpay Subscriptions / Stripe Billing, with plan state written only from the webhook. |

#### 3.3 Architecture

| # | Pri | Effort | Finding | Evidence | Recommendation |
|---|---|---|---|---|---|
| A1 | P1 | M | **Monolith layout is reasonable, but route modules mix transport, authz, business logic and SQL.** For example, `public.js` submit is a 135-line handler covering validation, ID/PIN, counters, uploads, booking, pricing, quota, insert, Stripe and side effects. | `public.js:177-312` | Keep the modular monolith, but split each domain into `routes/` (thin), `services/` (submitSubmission, pricing, quota) and `repo/` (SQL). This is the seam the Postgres move (D1) and the job queue (R1) need. |
| A2 **NEW** | P1 | S | **Monkey-patching Express internals** (`Layer.prototype.handle_request`) to catch async errors. It is fragile across Express versions. | `index.js:31-39` | Move to **Express 5**, which has native async error handling and is otherwise a near drop-in, or use `express-async-errors`. Remove the patch. |
| A3 | P1 | M | **API consistency.** Errors are `{error}` with an ad-hoc `errors` map (422) and `upgrade:true` (402). List shapes vary: `{forms, folders}`, `{total, submissions}`, `{items, labels}`, bare arrays (`/sign/docs`, `/keys`, `/outbox`, `/tasks/assigned`). Success writes are `{ok:true}`. Pagination is offset/limit on one endpoint only, and only after loading all rows. Paths mix `/public/apps` inside the `apps` router with `/api/public` on its own router. There is no versioning. | `forms.js:70`; `submissions.js:41`; `workspace.js:42`; `account.js:136,149` | Define a contract: `{ data, page: { nextCursor } }` for lists, RFC 7807-style `{ error: { code, message, fields } }`, cursor pagination everywhere lists can grow (submissions, outbox, runs, webhook log, orders), and a `/api/v1` prefix for the public API (keep the internal UI API unversioned). |
| A4 | P1 | M | **No OpenAPI and no shared schemas.** zod 4 is installed but used only in `server/ai.js`. Validation is hand-rolled per route (`badDefinition`, regexes repeated across 5 files). | `forms.js:13-24`; email regex in `account.js:13,74`, `notify.js:76`, `workflows.js:72`, `apps.js:90` | Put zod schemas in `shared/schemas/` (FormDefinition, Field union, Settings, Submission, Workflow, App), used by the client builder, server validation and `zod-to-openapi` to emit `/api/v1/openapi.json`. That gives the public API docs and an SDK generator. |
| A5 | P1 | M | **Hash routing for the app, with path routes only for `/f`, `/embed` and `/a`.** The public marketing site (`Site.jsx`: pricing, templates, features) lives under `#/…`, so search engines index only `/`. Form pages have no server-rendered `<title>`/OG tags (social shares show the generic title). Approval, sign and task links in hashes are good: tokens stay out of server logs. | `client/src/router.js:3-16`; `App.jsx:65-80`; `index.js:72`; `main.jsx:8` | Move to history routing (React Router 6 or a small custom router) for app and site pages, with a server catch-all to `index.html`. For `/f/:id`, have the server inject `<title>`, description and OG image into `index.html` (cheap SSR-lite), add `noindex` on draft and password forms, and a sitemap for public templates. Keep tokens in the hash or a POST body. |
| A6 **NEW** | P0→P1 | S | **One 1.46 MB chunk (398 kB gzip) for every page, including the respondent form.** All pages are imported eagerly (`App.jsx:4-19`). `pdfjs-dist` is statically imported by `PdfPages.jsx` (pulled in by Sign pages). Phosphor icons, `qrcode` and the full 62 KB widget catalog all ship to respondents. | `npm run build`; `App.jsx:4-19`; `components/PdfPages.jsx:2`; `components/Icon.jsx:16`; `pages/Publish.jsx:2` | (1) A separate Vite entry or `React.lazy` for `PublicForm`/`PublicApp`, so `main.jsx` dynamically imports one of three trees. (2) `lazy()` every app page. (3) Dynamic `import('pdfjs-dist')` and `import('qrcode')`. (4) `manualChunks` for react/vendor. (5) Split `shared/widgets.js` into a metadata catalog (builder only) and runtime renderers. Target: public form under 150 kB gzip, measured in CI with `size-limit`. |
| A7 | P2 | M | **State management.** Plain `useState` plus one `MeContext` works at this size, but every page re-fetches by hand. There is no cache, no request deduplication, and errors are often swallowed (8 empty `catch(() => {})`). | `App.jsx:21-22,49`; grep for `catch(() => {})` | Add TanStack Query for server state (cache, retries, optimistic inbox updates). Keep local UI state in components. A global store is not needed. |
| A8 | P2 | S | **The shared folder is a good asset** (logic, validation and pricing run identically on client and server). But `shared/` is imported by relative path from the server and via the `@shared` alias in the client, with no package boundary, and it mixes catalog data (62 KB) with runtime logic. | `vite.config.js:7`; `public.js:8-11` | Make `shared` an npm workspace package (`@wpforms/shared`) with `exports` subpaths. Add unit tests for the logic and formula engines (only partly covered by `widgets.test.js`). |
| A9 **NEW** | P2 | S | **Config.** A hand-rolled `.env` loader is duplicated in `index.js:6-14` and `seed-admin.js`. Cookie parsing is duplicated 3× (`auth.js:30,44`, `oauth.js:24`). | cited | `node --env-file` (Node 20+) or `dotenv`. Add one `config.js` validated with zod that fails fast on missing production settings (SESSION_SECRET, BASE_URL https, payment mode). |

#### 3.4 Data layer

| # | Pri | Effort | Finding | Evidence | Recommendation |
|---|---|---|---|---|---|
| D1 | P1 | L | **SQLite single file (G1).** WAL is on, but `busy_timeout` is not set, so concurrent writers would get `SQLITE_BUSY` immediately (inferred: `DatabaseSync` defaults to 0 ms). `DatabaseSync` is synchronous, so every query blocks the event loop. G9/G10 full scans then block all requests. For a single organisation (thousands of submissions per day) SQLite is viable; for SaaS it is not. | `db.js:11-12` | **Now:** add `PRAGMA busy_timeout=5000; synchronous=NORMAL;` and wrap the multi-statement writes (submit, decideTask, sign completion) in `BEGIN IMMEDIATE` transactions. **Phase 1:** move to Postgres via a query builder (Kysely, or Drizzle with SQL migrations), which needs the repo layer from A1. Use JSONB for definitions and data, with GIN and full-text indexes. Keep SQLite as a dev/self-host option only if the repo layer stays portable. |
| D2 **NEW** | P0 | S | **Missing indexes.** Only `submissions(form_id, created_at)` and `workflow_runs(status, resume_at)` exist. Hot unindexed lookups: `forms.user_id` (every list and `getUsage`, which runs on **every public view**: `public.js:65` → `db.js:233-235`), `uploads.user_id` (SUM), `workflows.form_id` (every submit), `workflow_runs.workflow_id/submission_id`, `workflow_tasks.run_id` and `lower(assignee)`, `sign_signers.doc_id`, `sign_docs.user_id`, `apps.user_id`, `orders.app_id`, `outbox.user_id`, `webhook_log.form_id`, `form_versions.form_id`, `team_members.user_id`, `team_invites.email`, `drafts.form_id`, `users.oauth`. `getUsage.totalSubmissions` joins every submission of the owner on each public view. | `db.js:49,208,231-241`; queries in `workspace.js:18-34,56-58`, `workflows.js:232`, `sign.js:19,30-33`, `account.js:25,149` | Add the indexes listed (all cheap). Keep running per-owner counters (`usage_totals`) instead of COUNT/SUM on hot paths. Cache `closedReason` inputs for 30 s. |
| D3 | P1 | M | **Migrations.** `CREATE TABLE IF NOT EXISTS` plus an ad-hoc `addColumn` on boot cannot rename or drop columns, backfill data, or record which version ran. `addColumn` interpolates table names into SQL (constant today, so safe). | `db.js:171-177,249` | Add numbered migration files (`migrations/0001_init.sql` …) tracked with `PRAGMA user_version` (SQLite) or a `schema_migrations` table, run by `npm run migrate`, never implicitly on import. Choose a tool compatible with Postgres (Kysely migrator, node-pg-migrate). |
| D4 | P1 | M | **JSON blobs vs columns.** `forms.definition` as a document is right: it is versioned and edited as a whole. `submissions.data` as an opaque TEXT blob prevents search (G10), per-field reports and booking uniqueness (G9). Payment state is JSON inside the submission, so it cannot be queried for revenue, reconciliation or refunds. | `db.js:35-48,160-168` | Keep `data` as JSONB. Add `form_version_id` (G2), a `public_id` ULID (G11), a `search tsvector` (Postgres), and extract `payments`, `bookings(form_id, field_id, date, slot) UNIQUE` (G9) and `submission_files` into tables. Orders use the same `payments` table. |
| D5 **NEW** | P0 | M | **DPDP Act 2023 / GDPR: erasure and export.** Deleting a form (`DELETE FROM forms`) or an account (`DELETE FROM users`) cascades rows but **leaves uploaded files on disk**: `uploads.form_id` has no FK and no file unlink. Signed PDFs and attachments in the outbox are kept. There is no data-principal export (account-wide), no per-respondent erasure ("delete everything about this e-mail"), no retention setting (auto-delete submissions after N days), and no consent record. Drafts never expire. | `forms.js:169`; `account.js:129-133`; `db.js:65-73`; `submissions.js:155-160` (no file unlink) | Add a `purgeFiles(ids)` service used by every delete path, plus a nightly orphan sweeper. Add per-form retention (`settings.retentionDays`) enforced by a job. Add a workspace export (ZIP of JSON + CSV + files) and respondent lookup/erase by e-mail or phone. Store consent text, version and timestamp per submission, and show a DPDP-compliant notice field. Name a grievance officer contact in settings. |
| D6 **NEW** | P1 | M | **Sensitive fields are stored in clear.** Aadhaar, PAN and GSTIN validator widgets exist, and values go straight into `submissions.data` JSON, the outbox `body` (e-mail text with `{all_fields}`), webhooks, Sheets and AI steps. UIDAI rules require Aadhaar to be masked/stored in a vault. The "HIPAA features" plan flag is advertised in the UI but **not enforced anywhere on the server**. | `shared/widgets.js:419-421,467-468`; `notify.js:38` (outbox stores full body); grep `hipaa` in `server/` → none; `Site.jsx:258` | Field-level `sensitive: true`: encrypt the value with AES-256-GCM using a per-workspace data key wrapped by a KMS/master key in env, mask in inbox/e-mail/CSV (`XXXX XXXX 1234`), exclude from AI and webhooks unless explicitly allowed, and audit-log every reveal. Remove the "HIPAA" marketing claim until there is a BAA, audit logging and encryption. |
| D7 **NEW** | P1 | M | **No audit log.** Nothing records who viewed or exported a submission, edited data, changed a role, deleted a form, changed the plan, or created an API key. The sign audit trail exists only inside the PDF. | grep `audit` → only `pdf.js:151,179` | Add an `audit_events(id, ws_id, actor_id, actor_ip, action, target_type, target_id, meta JSON, at)` table that is append-only, written by a helper in each service. Show it in the Account UI (Enterprise). |
| D8 **NEW** | P0 | S | **No backups.** `data/forms.db` plus `uploads/` sit on local disk with no backup script or docs. | `db.js:7-11`; README (no backup section) | Before launch: nightly `VACUUM INTO` (or Litestream continuous replication to S3/R2) plus rsync/rclone of uploads, a 30-day retention, and a **tested restore runbook**. With Postgres: managed PITR. |
| D9 | P1 | S | **Multi-tenant isolation** uses `user_id = req.ws.id` in each query. It is consistent in the routes I read (`ownForm`, `ownSub`, `loadDoc`, `own` in apps), but enforced only by convention, and `user_id` naming confuses the workspace and the person. | `forms.js:28-32`; `submissions.js:15-19`; `sign.js:17-20` | Introduce a real `workspaces` table (owner becomes a member with role `owner`) and rename `user_id` to `workspace_id` during the Postgres move. Repo functions take `wsId` as a mandatory first argument. Postgres RLS on `workspace_id` as defence in depth. Add a cross-tenant test suite that tries every id-based route with a foreign workspace. |
| D10 **NEW** | P2 | S | **Unbounded growth.** `outbox`, `webhook_log`, `workflow_runs.log` (JSON array rewritten on every step) and `form_versions` (capped at 100) grow without limit. | `db.js:80-96`; `workflows.js:191-194` | Retention jobs (outbox 180 d, webhook log 30 d). Move the run log into a `workflow_run_events` table. |

#### 3.5 Reliability and scale

| # | Pri | Effort | Finding | Evidence | Recommendation |
|---|---|---|---|---|---|
| R1 | P1 | M | **Side effects are fire-and-forget in the request process (G3).** `afterSubmit` runs e-mails, WhatsApp, SMS, Teams, approvals, webhooks, Slack, Discord and Sheets **sequentially** with awaits after the response. A crash or deploy mid-way loses the rest. There are no retries: webhook failures are just logged, and e-mail failures set `outbox.status='failed'` forever. | `public.js:310`; `notify.js:139-188,43-45,128-135` | Add a durable job table (Phase 1: SQLite/Postgres `jobs` with `run_at`, `attempts`, `locked_by`, `locked_until`, using **pg-boss** or graphile-worker once on Postgres). Each side effect is one job with exponential backoff (1 m … 24 h), a dead-letter state, and "retry" in the outbox/webhook log UI. Outgoing webhooks carry `X-WpForms-Delivery` ids for receiver dedupe. |
| R2 **NEW** | P1 | S | **The workflow scheduler is a `setInterval` in the web process.** It is unsafe with more than one instance: `resumeRun` runs `UPDATE … WHERE status='waiting'` but ignores `changes`, so two instances both call `advance()` and send duplicate e-mails. Runs that crash while `running` are never resumed. An `await` inside the `for` loop serialises everything, and `tick` can overlap itself when it runs longer than 30 s. | `workflows.js:281-295`; `index.js:26-27` | Claim with `UPDATE … WHERE id=? AND status='waiting' RETURNING id` and proceed only if claimed. Add a reaper for stale `running` runs. Move to the job queue (R1) with a `worker` process (`node server/worker.js`). |
| R3 **NEW** | P1 | S | **In-memory state blocks horizontal scaling.** `usedCaptchas` (replay protection), the ID/PIN `attempts` map, the module-level nodemailer transport, and local-disk uploads (G5). | `public.js:21,50`; `notify.js:20-30`; `db.js:8` | Move these to the DB or Redis (`captcha_used(nonce PK, exp)`, a rate-limit store). Uploads go to S3/R2 with presigned PUT/GET. Note that the arithmetic captcha is trivially solvable by bots; offer hCaptcha/Turnstile as an option. |
| R4 **NEW** | P1 | S | **No health check, metrics or structured logging.** Logging is `console.error` only. There is no request id, access log, error tracker or graceful shutdown (no SIGTERM handler, so in-flight `afterSubmit` work is killed on deploy). The only `unhandledRejection` handler just logs. | `index.js:42,62,77`; grep for `health\|SIGTERM` → none | Add `GET /healthz` (process) and `/readyz` (DB `SELECT 1`, disk free). Use **pino** with a per-request id and redact (`password`, `data.*` for sensitive fields). Add Sentry or GlitchTip for errors and `prom-client` `/metrics` (request latency, submit count, job queue depth, e-mail failures). On SIGTERM: stop accepting connections, drain jobs, close the DB. |
| R5 **NEW** | P1 | S | **Idempotency.** A double-clicked submit creates duplicate submissions and payments. Payment returns race (P2). Unique-ID counters are fine (upsert). | `public.js:177-312` | Accept a client-generated `Idempotency-Key` (UUID per form-fill) on submit and order, stored with a unique constraint. Return the original result on retry. |
| R6 | P2 | M | **The event loop is blocked by synchronous work:** `node:sqlite` sync calls, `scryptSync` on login and register (~50–100 ms each; inferred), PDF generation, and full-table scans for `/report`, CSV export and booking (G9/G10). | `auth.js:8-16`; `submissions.js:44-98` | Use async `crypto.scrypt`, stream the CSV with SQL pagination, precompute report aggregates, and run PDF generation in the worker. |

#### 3.6 Product and feature completeness vs Jotform

These are verified as absent by grep or route inventory unless marked otherwise. They are ordered by value for an India-first organisation.

| # | Pri | Effort | Gap | Notes / recommendation |
|---|---|---|---|---|
| F1 | P1 | L | **Razorpay/UPI payments, GST invoices, refunds** | See P4/P5. This is the biggest India-specific differentiator. |
| F2 | P1 | L | **Real Tables view** (spreadsheet grid, saved views, column filters, inline edit, formulas, multiple tabs) | Today the inbox is a list/detail with offset paging (`Inbox.jsx`, `submissions.js:35-42`). It needs SQL-side filtering (D4) first. |
| F3 | P1 | M | **Form analytics / funnel** (views → starts → completions, per-field drop-off, time to complete, device and source, UTM) | Only `forms.views` plus `/report` aggregates exist (`submissions.js:60-98`). Add a `form_events` beacon table (start, page, field-blur, abandon). |
| F4 | P1 | M | **Public REST API v1 + OpenAPI docs + webhooks spec + JS SDK, plus a Zapier/Make app** | There is no OpenAPI. API keys are user-scoped and plaintext (G7/G17). Generic webhook "integrations" exist (`shared/integrations.js`), but there is no native Zapier app with triggers and actions. |
| F5 | P1 | M | **SSO (SAML/OIDC per workspace), SCIM, enforced 2FA** | None (grep `saml` → none). Needed for any organisation-wide rollout. |
| F6 | P1 | M | **App UI localisation** (Hindi plus regional languages) | `shared/i18n.js` translates *forms* only. All app UI strings are hard-coded English in JSX. Introduce `i18next` or Lingui and extract strings. |
| F7 | P1 | M | **WordPress plugin** (the product name implies it) | Only embed snippets exist (`Publish.jsx`). Build a WP plugin: a Gutenberg block plus shortcode with an iframe/JS embed and API-key connect. |
| F8 | P2 | M | **Custom domains** | Advertised as a plan feature (`shared/plans.js:25,31`) but not implemented on the server. Use Caddy on-demand TLS with a `domains` table and DNS verification. |
| F9 | P2 | L | **Boards (kanban of submissions), PDF Editor (designer for submission PDFs), approval-flow visual polish** | `server/pdf.js` produces a fixed layout. |
| F10 | P2 | M | **Offline / PWA form filling and mobile app** | No service worker. A PWA with IndexedDB queueing for field data collection (common in Indian field ops) is cheaper than native apps. |
| F11 | P2 | M | **A/B testing of forms, partial-submission capture, prefill via URL/API** | Not found. |
| F12 | P2 | L | **AI Agent channel parity** (WhatsApp/voice agent, knowledge base) | A chat agent on the form exists (`ai.js`). WhatsApp send exists only as notification. |
| F13 | P1 | M | **Builder accessibility** | The builder uses drag/drop (inferred from `Builder.jsx`). Verify keyboard reordering, ARIA live regions and focus management, and run axe in Playwright (Q4). |
| F14 | P2 | — | **HIPAA** | Do not market it (D6). |

#### 3.7 Code quality

| # | Pri | Effort | Finding | Evidence | Recommendation |
|---|---|---|---|---|---|
| Q1 | P1 | S | **No lint or format tooling.** Very long, dense lines (server averages about 58 characters per line, but many single-line handlers exceed 300 characters, e.g. `workspace.js:19-20`, `notify.js:32`). Hard to review and diff. | `ls` → no eslint/prettier config | Add ESLint (flat config: `eslint:recommended`, `react-hooks`, `jsx-a11y`, `security`) and Prettier (`printWidth 120`), plus a pre-commit hook (lint-staged + simple-git-hooks). Run one bulk format commit. |
| Q2 | P1 | M | **No typing.** Shapes like FormDefinition, Field and Settings are implicit across 62 KB of widgets, logic and builder code. | — | Step 1: zod schemas in `shared/schemas` with `z.infer` types and JSDoc `@typedef {import(...)}`, plus `// @ts-check` and `checkJs` in `jsconfig.json`. Step 2 (optional): migrate `shared/` and `server/` to TypeScript (Node 24 runs `.ts` with type stripping). |
| Q3 | P1 | M | **Large components.** `Widgets.jsx` (36 KB, 19 `useState`), `WorkflowBuilder.jsx` (28 KB), `Site.jsx` (25 KB, marketing site inside the app bundle), `Builder.jsx` (22 KB). 494 inline `style={{}}` objects despite a 75 KB design-system CSS file. | `wc -c`; grep | Split by feature (`builder/Canvas`, `builder/Inspector`, `builder/dnd`). Move the marketing `Site` to its own entry or a static site generator (Astro), which also solves the SEO part of A5. Replace inline styles with utility classes or CSS modules. Add `React.memo` on field rows (rendering cost of large forms is unmeasured). |
| Q4 | P0→P1 | M | **Tests are server-only: 29 integration-style tests, no client tests, no e2e, no coverage measurement.** Security regressions (S1–S3, P1–P3) have no tests. | `server/test/*` | Add `node --test --experimental-test-coverage` (target 70% of `server/` + `shared/`), unit tests for `shared/logic.js` and `formula.js`, Vitest + Testing Library for builder components, and **Playwright** e2e for create form → publish → submit with file and payment (Stripe test) → inbox → workflow approval, plus an axe a11y scan. Write a security test per P0 fix. |
| Q5 | P1 | S | **No CI/CD.** | no `.github/` | GitHub Actions: install, lint, `npm test`, `vite build`, `size-limit`, `npm audit --omit=dev --audit-level=high`, Playwright (on PRs to main). Deploy on tag. |
| Q6 | P2 | S | **Error handling.** Empty catches in the client (8), `alert(` in 1 place, and server failures are swallowed to `console.error` (`afterSubmit`, workflows). Error messages from Stripe are echoed to respondents (`public.js:305`). | grep | Use a toast/error boundary in the client and structured logging (R4) on the server. Map gateway errors to generic messages. |
| Q7 | P2 | S | **Duplication.** Default secret (3×), e-mail regex (≥ 5×), cookie parsing (3×), `.env` loader (2×), Stripe-return flow duplicated between forms and stores (`public.js:314-329` vs `apps.js:131-146`). | cited above | Consolidate into `config.js`, `shared/validators.js`, `auth/cookies.js` and `services/payments.js`. |

#### 3.8 DevEx and ops

| # | Pri | Effort | Finding | Recommendation |
|---|---|---|---|---|
| O1 | P0 | S | **No production deployment artefacts.** No Dockerfile, process manager, reverse proxy config, TLS, or `NODE_ENV` handling. The `.env` file is correctly git-ignored (`.gitignore`). | Add a multi-stage **Dockerfile** (node:24-slim, `npm ci --omit=dev`, build client, non-root user, `/data` volume) and `docker-compose.yml` (app + worker + Caddy). **Recommended initial target for one organisation:** a single VM in an Indian region (AWS Mumbai `ap-south-1`, or DigitalOcean/Hetzner) with Docker Compose, Caddy (automatic TLS, HSTS, compression), and Litestream replicating SQLite to R2/S3. **SaaS target (Phase 1–2):** stateless app containers (Fly.io/Render/ECS) + managed Postgres (Neon/RDS/Supabase in ap-south-1 for data residency) + R2/S3 for files + Redis/pg-boss for jobs. |
| O2 | P1 | S | **No staging environment.** | Staging uses the same compose file, a separate DB/bucket, Stripe/Razorpay test keys, and an SMTP sandbox (Mailpit). Seed it with anonymised fixtures. |
| O3 | P1 | S | **Seed data.** Only `seed-admin.js` exists, which resets the admin password to the `.env` value. | Add `npm run seed:demo` (forms from templates, 500 fake submissions with Indian names, numbers and INR) for performance and UX testing. Block seed scripts when `NODE_ENV=production`. |
| O4 | P1 | S | **Dev setup** is simple (`npm run setup`, `npm run dev`) but there are two separate `package.json` installs. | Use npm workspaces (root, `client`, `shared`) with one lockfile. Add `.nvmrc`/`engines: node >=24` (needed for `node:sqlite`). Add a `Makefile` or `npm run check`. |
| O5 | P1 | S | **Monitoring and alerting** | Uptime check on `/healthz` (UptimeRobot / Better Stack), Sentry, alerts on e-mail failure rate, queue depth and backup age. A status page for SaaS. |
| O6 | P2 | S | **Secrets** live in a flat `.env` with no rotation story, and per-owner provider credentials (Twilio, WhatsApp) are global env vars, not per workspace. | A secrets manager (Doppler / AWS SSM). Per-workspace integration credentials stored encrypted (same envelope key as D6). |

---

### 4. Phased roadmap

#### Phase 0: pre-launch hardening (about 2–3 weeks, 1–2 engineers)

| Item | Ref | Pri | Effort |
|---|---|---|---|
| Fix Microsoft/OAuth account linking (lookup by `provider:sub` only) | S1 | P0 | S |
| E-mail verification; invite acceptance only via token and only with a verified e-mail | S2 | P0 | M |
| Uploads: `attachment` + `nosniff` + sandbox CSP; server-side type sniffing | S3 | P0 | S |
| Rate limiting (login, register, submit, upload, captcha, tokens, AI) | S4, S5 | P0 | S |
| Remove or admin-gate `POST /me/plan` | S6 / G16 | P0 | S |
| Server-side sessions, `Secure` cookies, revocation, fail-boot on default secret, split secrets | S7 / G14 | P0 | S |
| Password reset flow | S8 | P0 | M |
| `safeFetch` SSRF guard for webhooks, integrations and workflow steps; HMAC-signed webhooks | S9 / G4 | P0 | S |
| Payments: test gateway behind an explicit flag; Stripe webhook plus idempotent transition; currency exponent and single-currency rule | P1, P2, P3 | P0 | M |
| Add missing indexes, `busy_timeout`, transactions around multi-step writes | D2, D1 | P0 | S |
| File purge on delete, orphan sweeper, account export, retention setting (DPDP minimum) | D5 | P0 | M |
| Backups (Litestream/`VACUUM INTO` + uploads) with a tested restore | D8 | P0 | S |
| Dockerfile + Caddy + `/healthz` + SIGTERM drain + pino + Sentry | O1, R4 | P0 | S |
| Security tests for each item above; CI running test, build and audit | Q4, Q5 | P0 | S |
| Hash form passwords and POST them (G6/G15); hash API keys, header-only (G7/G17) | G6, G7, G15, G17 | P0 | S |
| Upgrade nodemailer; add security headers (helmet/CSP) | S17, S10 | P1→do now | S |

#### Phase 1: next quarter (foundation for scale and India)

| Item | Ref | Pri | Effort |
|---|---|---|---|
| Durable job queue + separate worker; move `afterSubmit` and the scheduler onto it; retries and dead-letter UI | R1, R2, G3 | P1 | M |
| Postgres + Kysely/Drizzle + numbered migrations; `workspaces` table; `form_version_id`, ULIDs, `payments`/`bookings` tables | D1, D3, D4, D9, G1, G2, G9, G11 | P1 | L |
| S3/R2 object storage with presigned URLs, separate file origin; ClamAV scan job | R3, G5, G13 | P1 | M |
| Razorpay (UPI) gateway adapter, refunds, GST tax invoices | P4, P5, G12 | P1 | L |
| Sensitive-field encryption and masking (Aadhaar/PAN), audit log, remove HIPAA claim | D6, D7 | P1 | M |
| zod schemas in `shared/` → validation + OpenAPI; API v1 conventions (errors, cursor pagination) | A3, A4 | P1 | M |
| Code splitting (public-form entry, lazy routes, dynamic pdfjs/qrcode); size budget in CI | A6 | P1 | S |
| History routing + server-injected meta for `/f/:id`; split marketing site | A5, Q3 | P1 | M |
| Express 5 migration; services/repo layering | A2, A1 | P1 | M |
| ESLint/Prettier, `@ts-check`, Playwright e2e + axe, coverage | Q1, Q2, Q4 | P1 | M |
| Staging environment, demo seed, monitoring and alerts | O2, O3, O5 | P1 | S |
| Tables view, funnel analytics, SSO/2FA, app-UI i18n (Hindi), WordPress plugin, public API docs and Zapier app | F2–F7 | P1 | L |

#### Phase 2: later

| Item | Ref | Pri | Effort |
|---|---|---|---|
| Platform billing (Razorpay Subscriptions / Stripe Billing) for SaaS resale | P7 | P2 | M |
| Custom domains (Caddy on-demand TLS) | F8 | P2 | M |
| Boards, PDF editor, A/B tests, partial submissions | F9, F11 | P2 | L |
| PWA offline collection; WhatsApp/voice AI agent | F10, F12 | P2 | L |
| TanStack Query, component decomposition, inline-style cleanup | A7, Q3 | P2 | M |
| Postgres RLS, SCIM, data-residency options, retention for logs and runs | D9, D10, F5 | P2 | M |
| Optional TypeScript migration of `shared/` and `server/` | Q2 | P2 | L |

---

#### Verification notes

- All file:line references were read in this review. Line numbers in `server/routes/oauth.js`, `workspace.js` and `server/payments.js` are file-relative.
- **Inferred, not executed:** `busy_timeout` default behaviour of `DatabaseSync` (D1); scrypt latency (R6); the size reduction from code splitting (A6); builder keyboard accessibility (F13). S1 (OAuth takeover) and S3 (XSS) were confirmed by code reading, not by a live exploit, because no server was started.
- No server was started on port 4000. `npm run build` overwrote `client/dist/` (git-ignored build output).

---

## Part 4 — Feature inventory

Counted from the shared catalogues (`shared/*.js`), the 95 server routes and the client screens. **Built** means it works end to end today. **Incomplete** means it exists but part of it is a placeholder, needs a key, or has a known gap. **Missing** means it isn't there at all.

### At a glance
| Area | Built | Incomplete or placeholder | Missing |
|---|---|---|---|
| Form elements | 36 basic and payment elements | — | — |
| Widgets | 236 working | 201 listed as "Soon" (117 need a third-party account, 21 planned, 8 need datasets, 7 need a maps key…) | — |
| Payment gateways | 3 (Test mode, Stripe Checkout, Purchase order) | 34 listed but not connectable, including **Razorpay, Cashfree, PayU** | Refunds, GST invoices |
| Integrations | 25 connectable (14 webhook-based automation tools, Slack, Discord, Teams, Google Sheets, WhatsApp, SMS…) | 137 listed as "Soon" (CRM, e-mail marketing, storage, calendar…) | Native OAuth integrations |
| Workflow steps | 27 | 16 "Soon" (Approve & Sign, Get/Create/Update Entry, Request Payment, For Each, Push…) | — |
| Workflow templates | 20 | 2 starters marked Soon (Schedule Workflow, Request Appointment) | — |
| Form translations | 14 languages | — | App interface in Hindi / regional languages |

### Built and working
**Accounts and workspace**
- [x] Sign up, log in, log out, profile, change password, delete account
- [x] Teams: invite by e-mail, admin / editor / viewer roles, switch workspace, leave team (Enterprise plan)
- [x] API keys and a REST API for forms and submissions
- [x] Plans and usage limits (forms, submissions, views, storage, payments, signatures, fields per form)
- [x] Workspace home: one list of forms, workflows, apps, stores and sign documents; type filter, sort, search, favourites, labels, archive, trash, restore, delete forever, bulk archive/trash
- [x] Workspace switcher, header menus, account menu, "Assigned to me" approvals list
- [x] Google and Microsoft sign-in (code complete; appears once keys are added)

**Form builder**
- [x] Drag-and-drop builder, 36 elements, 236 widgets, classic and card layouts, multi-page
- [x] Undo/redo, autosave, version history with restore, clone, import/export JSON
- [x] Theme: colours, font, width, logo, cover, custom CSS
- [x] Conditions: show/hide, require, set/calculate value, skip to page, change thank-you page, redirect, disable, mask, update options, hide products, change e-mail recipient, trigger workflow (9 types); AI-written conditions (needs AI key)
- [x] Calculations and formulas; Indian validators (Aadhaar Verhoeff, PAN, GSTIN) plus IBAN, CPF and others; IFSC is not built yet, re-checked on the server
- [x] AI form generation from a description (needs AI key)

**Publishing and respondents**
- [x] Share link, QR code, iframe and script embed, REST API snippet
- [x] Password protection, close date, maximum submissions, one submission per person, closed message
- [x] Save and continue later (drafts), progress bar, 14-language form translation with a switcher
- [x] File uploads with type and size limits, signatures, appointment slots with double-booking guard, captcha (server-checked, single use)
- [x] Thank-you page (rich HTML) or redirect
- [x] Chat-to-fill AI agent on the form (needs AI key)

**Submissions**
- [x] Inbox with list and table views, search, filters (unread, starred, approval), date range, read/star/edit/delete, bulk actions
- [x] CSV export, per-submission PDF (Unicode-safe), print, file downloads
- [x] Reports: totals, views, conversion, submissions over time, per-field summaries, revenue
- [x] Approvals on submissions (e-mailed approve/reject links)

**Payments**
- [x] Product list, donation and subscription elements with server-side price checks
- [x] Stripe Checkout (with key), purchase order, test mode

**Automation and notifications**
- [x] Multiple notification and autoresponder e-mails with a rich-text editor, field tags, test e-mail and outbox
- [x] SMS (Twilio), WhatsApp Cloud API, Slack, Teams and Discord notifications (need keys or webhook URLs)
- [x] Webhooks and 14 automation-platform integrations, Google Sheets via Apps Script, integration test button
- [x] Workflows: visual builder with branches, approvals, tasks, waits, scheduled e-mails, status tracking page, run history, cancel/restart, 20 templates, AI steps

**Other products**
- [x] E-sign: upload PDF, place fields, multiple signers, signing page, signed PDF with audit trail, void
- [x] Apps and stores: app pages, product catalogue, cart, checkout, orders
- [x] Public website: landing, pricing, templates, integrations, help, log in / sign up

### Incomplete (exists, but not finished)
| Feature | What's missing |
|---|---|
| Indian payments | Razorpay, Cashfree and PayU are in the gateway list but can't be connected — no UPI, RuPay or netbanking yet. |
| Stripe | No webhook: a payment is recorded only if the buyer returns to the site. No refunds. |
| 201 widgets, 137 integrations, 31 gateways, 16 workflow steps | Shown with a "Soon" tag; they need third-party accounts or are planned. |
| Encrypt form data, Draft mode | Toggles appear in Form settings but are disabled. |
| Plan upgrades | Anyone can switch their own plan for free; there's no billing. |
| Teams | No e-mail verification, so invites can be claimed by anyone who registers with that address. |
| AI features (form generation, conditions, agent, workflow AI steps) | Built, but off until `ANTHROPIC_API_KEY` is set; the public agent has no usage cap. |
| E-mail, SMS, WhatsApp | Built, but messages only land in the Outbox until SMTP, Twilio or WhatsApp keys are set. |
| Google / Microsoft sign-in | Built, untested with real keys; Microsoft linking has an account-takeover flaw to fix first. |
| HIPAA, custom domain | Advertised as plan features but not implemented on the server. |
| Inbox "Table" | A basic table view exists; no spreadsheet-style editing, saved views or column filters. |
| Shared with me, Continue filling, Sent | Shown in the sidebar as "Soon". |
| Agents, Tables, Boards, Reports, Website widgets in the workspace switcher | "Soon" or not linked. |
| App and Sign templates | Template pages say "on the way". |
| Captcha | Simple arithmetic; no Turnstile/hCaptcha option. |

### Missing
- [ ] Password reset ("forgot password") and e-mail verification
- [ ] Two-factor authentication, SSO (SAML/OIDC), SCIM
- [ ] Rate limiting and abuse protection
- [ ] GST tax invoices, receipts, refunds
- [ ] Payment webhooks and reconciliation
- [ ] Audit log (who viewed, exported, edited or deleted what)
- [ ] Data export for a whole account, retention settings, respondent data erasure (DPDP Act)
- [ ] Encryption and masking of sensitive fields such as Aadhaar
- [ ] Spreadsheet-style Tables, Boards (kanban), PDF template editor
- [ ] Form analytics funnel (views → starts → completions, drop-off by field, sources/UTM)
- [ ] A/B testing, partial-submission capture, URL prefill documentation
- [ ] Public API documentation (OpenAPI), SDK, native Zapier app
- [ ] WordPress plugin (only embed code today)
- [ ] App interface in Hindi and regional languages
- [ ] Offline / installable form filling (PWA), mobile app
- [ ] Custom domains
- [ ] Platform billing (charging customers for plans)
- [ ] Backups, health checks, monitoring, Docker/deployment setup
- [ ] Builder usable on a phone
