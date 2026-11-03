# WpForms — Product and Engineering Specification

| | |
|---|---|
| Product | WpForms by GlixWordpress (working name, see Risk R-1) |
| Document set | PRD, SRS, Software Design Document, API Reference, README |
| Version | 1.0 (draft for review) |
| Date | 3 November 2026 |
| Owner | Sarthak Srivastava |
| Sources | `reports/Jotform market and product research.md`, `reports/Jotform feature list.md`, current codebase (`client/`, `server/`, `shared/`) |

## How to read this document

| Part | Audience | Answers |
|---|---|---|
| [1. PRD](#part-1--product-requirements-document-prd) | Founders, product, sales, design | Why are we building this, for whom, and what is in each release? |
| [2. SRS](#part-2--software-requirements-specification-srs) | Engineering, QA | What exactly must the system do, and how well? |
| [3. SDD](#part-3--software-design-document-sdd) | Engineering | How is the system built: architecture, components, data models? |
| [4. API Reference](#part-4--api-reference) | Engineering, integrators | How do I call the API, and what comes back? |
| [5. README](#part-5--readme) | Every developer | How do I run, test and contribute to the code? |
| [Appendices](#appendices) | All | Jotform parity matrix, glossary, open questions |

**Status labels** used throughout:
- **Built**: exists in the current codebase.
- **Partial**: exists but needs hardening or is incomplete.
- **Planned**: not yet built; release noted (R1, R2, R3).

**Requirement priority**: **P0** must ship in the release, **P1** should ship, **P2** nice to have.

---

# Part 1 — Product Requirements Document (PRD)

## 1.1 Summary

WpForms is an online form and data-collection platform, comparable to Jotform, built India-first. People build forms with drag and drop or AI, publish them by link, embed or QR code, collect answers and payments, and manage responses in an inbox with emails, PDFs, approvals, e-signatures, reports and integrations.

Jotform is a 20-year-old, ~US$145–172M revenue (estimated), 40M-user incumbent with about 15 products around one shared submission record. We will not win by matching its breadth. We win on four things Jotform does badly or not at all:

1. **India-native payments**: Razorpay and Cashfree with UPI (Intent and QR), INR pricing and GST invoices. Jotform has no Indian gateway and no UPI, which its own staff have confirmed.
2. **Fair, predictable pricing**: one main limit (submissions), unlimited forms, team seats on paid plans, and a free tier near 1,000 submissions a month. Jotform's free plan has 5 forms and 100 submissions, and every self-serve plan is single-user.
3. **Trust**: transparent abuse enforcement with clear reasons, human review and a stated appeal time; AI that proposes changes rather than overwriting work.
4. **Developer friendliness**: OAuth API, typed SDK, signed webhooks, plain-HTML form endpoint, MCP server, and an optional self-hosted edition.

## 1.2 Problem statement

| Who | Problem today | Evidence |
|---|---|---|
| Indian SMBs, coaches, event organisers, schools, clinics | Cannot collect UPI payments through Jotform, Google Forms or Typeform without third-party glue | Jotform staff answers (2022, 2023); indie tools such as Formpey exist for this reason |
| Small teams on a budget | Jotform needs Enterprise for a second user; caps on forms, submissions, storage, payments and AI all force upgrades | Jotform pricing page; G2 flags "feature limitations" in 139 reviews |
| Organisations handling sensitive data | Account suspensions by automated abuse detection with little explanation | Jotform support forum threads |
| Developers | API keys only, stale SDKs, no OAuth, no API for newer products | Jotform API docs and GitHub org |

## 1.3 Goals and success metrics

| Goal | Metric | Target (12 months after R1 launch) |
|---|---|---|
| Acquire Indian SMB users | Sign-ups | 25,000 accounts |
| Convert to paid | Free → paid conversion | ≥ 3% |
| Prove the payments wedge | Monthly GMV processed through forms | ₹5 crore |
| Activation | % of sign-ups publishing a form within 24 hours | ≥ 40% |
| Reliability | Public form availability | 99.9% monthly |
| Trust | Abuse appeals resolved within 48 hours | ≥ 95% |
| Quality | Respondent form completion rate (views → submissions) | ≥ 35% median |

## 1.4 Non-goals (for the first 12 months)

- Voice, phone and SMS AI agents across 16 channels (Jotform's 2025–26 focus).
- Presentation agents, kanban Boards and a full help-desk.
- Matching Jotform's 20,000 templates or ~700 widgets. We target 200 high-quality templates and an open widget SDK.
- Native iOS and Android apps (a PWA comes first).
- HIPAA, unless a paying US healthcare customer requires it.

## 1.5 Target users and personas

| Persona | Description | Top jobs to be done |
|---|---|---|
| **Priya, small business owner** | Runs a coaching institute in Pune; uses WhatsApp and UPI daily | Registration + fee collection in one link; GST receipt; WhatsApp confirmation |
| **Rahul, operations lead** | 20-person company; HR, IT and admin requests | Internal request forms, approvals, team access, exports |
| **Anita, school administrator** | Admissions and event forms for 2,000 parents | Multilingual forms (English, Hindi, regional), file uploads, fee payment |
| **Dr. Mehta, clinic owner** | Patient intake and consent | E-signature, PDF of each submission, data privacy |
| **Arjun, developer/agency** | Builds sites for clients | Embeds, webhooks, API, white-label, many client workspaces |
| **Respondent** | Anyone filling a form, mostly on a phone | Fast, mobile-friendly, in their language, pay by UPI |

## 1.6 Product principles

1. **Mobile-first respondent experience.** Most Indian respondents use phones; every form must be fast on a low-end Android device over 3G.
2. **One canonical submission record.** Every channel (form, card, chat agent, app, store, signing) writes the same versioned record; every view (inbox, table, report, PDF) reads it.
3. **The server is the authority.** Logic, calculations, prices and limits are re-checked on the server.
4. **AI assists, humans decide.** AI drafts and suggests; changes are previewed and versioned before they apply.
5. **No surprises.** Plain pricing, clear limits shown before they are hit, clear reasons for any enforcement.

## 1.7 Feature scope and release plan

Status reflects the current codebase as of 3 Nov 2026. Releases: **R1** = public launch (0–3 months), **R2** = 3–6 months, **R3** = 6–12 months.

### 1.7.1 Workspace and account

| Feature | Priority | Status | Release |
|---|---|---|---|
| Email/password sign-up and login | P0 | Built | — |
| Google sign-in | P1 | Planned | R1 |
| Forms list with search, favorites, folders, trash/restore, clone, enable/disable | P0 | Built | — |
| Team workspaces with admin/editor/viewer roles and invites | P0 | Built (Enterprise-gated) | R1: open to paid plans |
| 2FA (TOTP) | P1 | Planned | R2 |
| SSO / SAML, SCIM | P2 | Planned | R3 |
| Audit log | P1 | Planned | R3 |

### 1.7.2 Form builder

| Feature | Priority | Status | Release |
|---|---|---|---|
| Drag-and-drop builder, reorder, duplicate, undo/redo, autosave | P0 | Built | — |
| 30 field types (see SRS FR-FLD) | P0 | Built | — |
| Classic and Card layouts, progress bar | P0 | Built | — |
| Multi-page forms (page breaks) | P0 | Built | — |
| Conditional logic: show/hide, require/optional, set/calculate, skip to page, thank-you, redirect; all/any | P0 | Built | — |
| Logic: change email recipient, enable/disable, input mask | P1 | Planned | R2 |
| Formula engine (`{field}` refs, arithmetic, functions) | P0 | Built | — |
| Design: colors, font, width, logo, submit text, custom CSS | P0 | Built | — |
| Themes gallery | P1 | Planned | R2 |
| Field validation presets and input masks | P1 | Partial | R1 |
| Unique-value fields (no duplicate answers) | P1 | Planned | R2 |
| Section collapse, fill-in-the-blank, full-featured repeating group (configurable list) | P1 | Planned | R2 |
| Version history with preview and restore | P0 | Built | — |
| Submissions stamped with the form version they used | P0 | Planned | R1 |
| Real-time co-editing | P2 | Planned | R3 |
| 200 curated templates (India-relevant first) | P0 | Partial | R1 |
| Import from Google Forms, Jotform JSON, PDF | P1 | Partial (own JSON only) | R2 |
| Widget SDK (sandboxed iframe) | P1 | Planned | R2 |
| Accessibility checker | P1 | Planned | R2 |

### 1.7.3 Form settings and publishing

| Feature | Priority | Status | Release |
|---|---|---|---|
| Close date, submission cap, password, save & continue, one-submission-per-user, thank-you/redirect | P0 | Built | — |
| Spam protection: honeypot, Cloudflare Turnstile, rate limits | P0 | Partial (captcha field) | R1 |
| Link, QR code, iframe/script/popup embed, URL prefill | P0 | Built | — |
| Floating feedback-button and lightbox embeds | P1 | Planned | R2 |
| WordPress plugin | P1 | Planned | R2 |
| Custom domain for forms | P1 | Planned | R3 |
| Multilingual forms with language picker and `?lang=` | P0 | Built | — |
| AI auto-translation | P0 | Built | — |
| Indian languages (Hindi, Marathi, Tamil, Telugu, Bengali, Kannada, Gujarati) as defaults; RTL for Urdu | P1 | Planned | R2 |
| Email invitations with reminders, assign form to people | P2 | Planned | R3 |

### 1.7.4 Responses

| Feature | Priority | Status | Release |
|---|---|---|---|
| Inbox and spreadsheet table with filters, bulk actions, edit, star, delete, print/PDF, CSV export | P0 | Built | — |
| Excel export, uploads as ZIP | P1 | Planned | R2 |
| Comments and @-mentions on submissions | P2 | Planned | R3 |
| Partial (abandoned) submissions | P1 | Planned | R2 |
| Data retention / auto-delete policies | P1 | Planned | R2 |

### 1.7.5 Notifications, PDFs, approvals, signatures

| Feature | Priority | Status | Release |
|---|---|---|---|
| Owner notification and autoresponder emails with tokens and PDF attachment | P0 | Built | — |
| Reliable email via queue with retries and bounce handling | P0 | Planned | R1 |
| WhatsApp notifications (Business API) | P0 | Planned | R1 |
| SMS notifications (DLT-compliant) | P2 | Planned | R3 |
| Designed submission PDF | P0 | Built | — |
| Drag-and-drop PDF template editor | P2 | Planned | R3 |
| Approvals with no-login links, notes, approve from inbox | P0 | Built | — |
| Multi-step workflows canvas | P2 | Planned | R3 |
| E-sign documents: upload PDF, place fields, multiple signers, audit certificate | P0 | Built | — |
| Aadhaar eSign | P2 | Planned | R3 (research) |

### 1.7.6 Payments

| Feature | Priority | Status | Release |
|---|---|---|---|
| Product list with quantities, server-side totals | P0 | Built | — |
| Stripe Checkout | P0 | Built | — |
| **Razorpay: UPI Intent/QR, cards, net banking, wallets** | **P0** | **Planned** | **R1** |
| Cashfree as second Indian gateway | P1 | Planned | R2 |
| PayPal | P1 | Planned | R2 |
| Donations / user-defined amount, coupons, tax (GST), shipping | P0 | Planned | R1 |
| Subscriptions (Razorpay Subscriptions, Stripe Billing) | P1 | Planned | R2 |
| GST-compliant receipts for respondents | P1 | Planned | R2 |
| Refunds from inbox | P1 | Planned | R2 |

### 1.7.7 Analytics and reports

| Feature | Priority | Status | Release |
|---|---|---|---|
| Submissions over time, views and conversion, revenue, per-field charts, matrix breakdowns | P0 | Built | — |
| **Per-field drop-off and completion time** (Jotform lacks this) | P1 | Planned | R2 |
| Traffic source, device, location | P1 | Planned | R2 |
| Google Analytics / GTM / Meta Pixel | P1 | Planned | R2 |
| Shareable report links | P2 | Planned | R3 |

### 1.7.8 AI

| Feature | Priority | Status | Release |
|---|---|---|---|
| Create form from description | P0 | Built | — |
| Auto-translate form | P0 | Built | — |
| Conversational chat agent that fills a form | P1 | Built | — |
| AI edits shown as a diff with accept/reject; version snapshot first | P0 | Planned | R1 |
| AI summary and insights over responses | P1 | Planned | R2 |
| Create form from PDF/image/URL | P1 | Planned | R2 |
| WhatsApp form-filling agent | P2 | Planned | R3 |

### 1.7.9 Apps, stores, integrations, developer platform

| Feature | Priority | Status | Release |
|---|---|---|---|
| App pages bundling forms, links, content | P1 | Built | — |
| Stores with cart, checkout, order management | P1 | Built | — |
| Slack, Discord, Google Sheets (Apps Script) | P0 | Built | — |
| Webhooks with delivery log | P0 | Partial (no signing/retry) | R1 |
| Native Google Sheets OAuth, Zoho CRM, HubSpot, Mailchimp, Notion, Airtable | P1 | Planned | R2 |
| Zapier, Make, n8n, Pabbly apps | P1 | Planned | R2 |
| REST API with API keys | P0 | Built | — |
| Versioned public API `/v1` with OAuth 2.0 | P1 | Planned | R2 |
| TypeScript SDK | P1 | Planned | R2 |
| MCP server | P1 | Planned | R2 |
| Plain-HTML POST endpoint | P2 | Planned | R2 |
| Self-hosted Enterprise edition | P2 | Planned | R3 |

### 1.7.10 Trust, safety and compliance

| Feature | Priority | Status | Release |
|---|---|---|---|
| Publish-time abuse scan (credential/card/OTP fields, brand impersonation) | P0 | Planned | R1 |
| "Report abuse" link on every public form | P0 | Planned | R1 |
| Human review queue with reasons and appeal | P0 | Planned | R1 |
| Public forms on a separate domain with strict CSP | P0 | Planned | R1 |
| Virus scanning of uploads | P0 | Planned | R1 |
| DPDP Act 2023 compliance (consent, notices, data principal rights) | P0 | Planned | R1 (verify with counsel) |
| India data residency (Mumbai) | P0 | Planned | R1 |
| EU residency, GDPR DPA | P2 | Planned | R3 |
| SOC 2 Type II | P2 | Planned | R3 |

## 1.8 Key user journeys

**J1. Priya collects workshop fees by UPI**
1. Signs up with Google, picks the "Workshop registration + payment" template.
2. Edits fields, sets price ₹1,499 with 18% GST, connects Razorpay (OAuth/keys).
3. Publishes, shares the link on WhatsApp.
4. A respondent fills the form on a phone and pays with a UPI app via intent; on desktop they scan a QR.
5. Priya gets a WhatsApp and email alert; the respondent gets a receipt with GST breakdown.
6. Priya exports the paid registrations to Excel.

**J2. Rahul runs an approval flow**
1. Builds a "Laptop request" form, enables approvals with two approvers.
2. Invites two teammates as editors (included in paid plan).
3. Approver clicks a no-login link in email, approves with a note; requester is notified.

**J3. Anita runs multilingual admissions**
1. Uses AI to create the form from a description, then auto-translates to Hindi and Marathi.
2. Parents pick a language; answers are stored against stable field IDs.
3. Uploaded documents are virus-scanned; she downloads them as a ZIP.

**J4. Arjun integrates with a client's CRM**
1. Creates an OAuth app, subscribes to `submission.created` webhooks.
2. Verifies webhook signatures, gets retries on failure, replays a missed event from the log.

## 1.9 Pricing and plans (proposal)

The code currently mirrors Jotform's tiers (`shared/plans.js`). This proposal replaces that with a single main axis. Prices are placeholders to validate in customer interviews.

| | Free | Starter | Pro | Business | Enterprise |
|---|---|---|---|---|---|
| Price / month (annual) | ₹0 | ₹499 | ₹1,499 | ₹3,999 | Custom |
| Submissions / month | 1,000 | 5,000 | 25,000 | 100,000 | Custom |
| Forms | Unlimited | Unlimited | Unlimited | Unlimited | Unlimited |
| Team seats | 1 | 3 | 10 | 25 | Unlimited |
| Storage | 1 GB | 10 GB | 50 GB | 200 GB | Custom |
| Payments | ✓ (platform fee 1%) | ✓ (0%) | ✓ (0%) | ✓ (0%) | ✓ |
| Branding removed | — | ✓ | ✓ | ✓ | ✓ |
| WhatsApp notifications | — | ✓ | ✓ | ✓ | ✓ |
| AI credits / month | 50 | 500 | 2,000 | 10,000 | Custom |
| Custom domain, white-label | — | — | ✓ | ✓ | ✓ |
| SSO, audit log, SLA, data residency choice | — | — | — | — | ✓ |
| Self-hosted | — | — | — | — | ✓ |

Discounts: 50% for registered nonprofits and educational institutions (Jotform offers the same).

## 1.10 Competitive positioning

| | WpForms (target) | Jotform | Google Forms | Typeform | Tally | Zoho Forms |
|---|---|---|---|---|---|---|
| UPI / Razorpay | Native | No | No | No | No | Yes |
| Free submissions/month | 1,000 | 100 | Unlimited | ~10 | Unlimited (fair use) | 500 |
| Team seats on paid self-serve | Yes | No | n/a | Plus plan | Yes | Yes |
| INR pricing, GST invoices | Yes | No | n/a | No | No | Yes |
| Payments | Yes | Yes (~40 gateways) | No | Stripe | Stripe | Yes |
| E-sign, approvals, PDF | Yes | Yes | No | Limited | Limited | Yes |
| API + OAuth + signed webhooks | Yes | API key only | Apps Script | Yes | Webhooks | Yes |
| Self-hosted option | Enterprise | No | No | No | No | No |

Main competitor in India is **Zoho Forms** (native Razorpay, Indian company). Our edge over Zoho must be UX, design quality, AI and developer friendliness, not just payments.

## 1.11 Risks

| ID | Risk | Impact | Mitigation |
|---|---|---|---|
| R-1 | "WpForms" is close to the WPForms WordPress plugin trademark | Forced rebrand after launch | Trademark search and rename **before** R1 |
| R-2 | Phishing and scam forms on our domain lead to domain blocklisting (Jotform's domain was suspended in 2012) | Outage for all customers | Separate form domain, publish-time scanning, report-abuse flow, fast takedown |
| R-3 | Payment gateway onboarding/KYC friction for small merchants | Lower activation | Support Razorpay route or partner onboarding; clear setup guide |
| R-4 | Zoho Forms already offers Razorpay | Weaker wedge | Win on UX, free tier, AI, WhatsApp, developer features |
| R-5 | DPDP Act rules not yet fully understood | Compliance gaps | Legal review before R1 |
| R-6 | SQLite single-node limits | Outages at scale | Postgres migration in R1 |
| R-7 | AI cost per user | Margin erosion | AI credits per plan; caching; smaller models for simple tasks |

## 1.12 Release criteria for R1 (public launch)

- All P0 items marked R1 are complete and pass QA.
- Razorpay UPI payments tested end-to-end in live mode with refunds.
- Load test: 200 submissions/second sustained on one form for 10 minutes with p95 < 500 ms.
- Abuse pipeline live with on-call reviewer rota.
- Privacy policy, terms, DPDP notices published; data in an Indian region.
- Product renamed if trademark search requires it.

---

# Part 2 — Software Requirements Specification (SRS)

## 2.1 Introduction

### 2.1.1 Purpose
This part states what the WpForms system must do (functional requirements) and how well it must do it (non-functional requirements). It is the contract between product and engineering and the basis for QA test cases.

### 2.1.2 Scope
The system consists of:
- **Builder app**: the authenticated web app for form owners and teams.
- **Form runtime**: public form pages, embeds and the submission endpoint.
- **API**: the REST API used by the builder, integrators and SDKs.
- **Workers**: background jobs for email, WhatsApp, webhooks, integrations, PDFs, scanning.
- **Admin console**: internal tools for trust and safety, support and billing.

### 2.1.3 Definitions

| Term | Meaning |
|---|---|
| Owner | The account that owns a workspace and its plan |
| Workspace | A tenant: an owner's forms, apps, documents and members |
| Member | A user with a role (admin, editor, viewer) in someone else's workspace |
| Form definition | JSON describing fields, logic, settings, design and translations |
| Form version | Immutable snapshot of a form definition |
| Submission | One respondent's answers, stored against a form version |
| Respondent | Anyone filling a public form; no account needed |
| Draft | A saved partial submission (save & continue later) |
| Plan limit | A quota from the owner's plan (submissions, storage, seats, etc.) |

### 2.1.4 References
- `reports/Jotform market and product research.md`
- `reports/Jotform feature list.md`
- Digital Personal Data Protection Act, 2023 (India) — requires legal verification
- WCAG 2.2 AA
- Razorpay payment gateway documentation (UPI Intent/QR; UPI Collect deprecated 28 Feb 2026)

## 2.2 Overall description

### 2.2.1 User classes

| Class | Access | Notes |
|---|---|---|
| Owner | Everything in own workspace, billing, delete account | One per workspace |
| Admin | Everything except billing and deletion; manage members | |
| Editor | Create/edit forms, manage submissions | |
| Viewer | Read forms and submissions | Cannot change anything |
| Respondent | Fill public forms, pay, sign, approve via link | No account |
| API client | Same rights as the key's or token's user and scopes | |
| Platform staff | Trust & safety, support (scoped, audited) | Admin console only |

### 2.2.2 Operating environment
- Browsers: last two versions of Chrome, Edge, Firefox, Safari; Chrome on Android 9+; Safari on iOS 15+.
- Respondent pages must work on 2 GB RAM Android phones on a 3G connection.
- Server: Node.js 22 LTS or later on Linux containers.

### 2.2.3 Constraints
- Card data never touches our servers: hosted checkout or gateway SDK only (keeps us at PCI DSS SAQ-A).
- Personal data of Indian users stored in an Indian cloud region by default.
- UPI must use Intent or QR flows (Collect is deprecated by Razorpay).

### 2.2.4 Assumptions
- Merchants complete gateway KYC directly with Razorpay/Cashfree.
- WhatsApp messages are sent through a Business Solution Provider using pre-approved templates.
- An LLM provider (Anthropic Claude) is available for AI features.

## 2.3 Functional requirements

Each requirement has an ID, a "shall" statement, a priority and its current status.

### FR-AUTH — Accounts and authentication

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-AUTH-1 | The system shall let a user register with name, email and a password of at least 8 characters. | P0 | Built |
| FR-AUTH-2 | The system shall store passwords with a salted memory-hard hash (scrypt or argon2id). | P0 | Built |
| FR-AUTH-3 | The system shall keep sessions in signed, HttpOnly, SameSite cookies that expire after 30 days. | P0 | Built |
| FR-AUTH-4 | The system shall verify email addresses before a user can publish a form that accepts payments. | P0 | Planned |
| FR-AUTH-5 | The system shall support Google sign-in (OIDC). | P1 | Planned |
| FR-AUTH-6 | The system shall support password reset by emailed one-time link valid for 60 minutes. | P0 | Planned |
| FR-AUTH-7 | The system shall support TOTP two-factor authentication. | P1 | Planned |
| FR-AUTH-8 | The system shall support SAML 2.0 SSO per workspace (Enterprise). | P2 | Planned |
| FR-AUTH-9 | The system shall rate-limit login attempts per IP and per account (5 failures → 15-minute lockout). | P0 | Planned |
| FR-AUTH-10 | The system shall let a user delete their account and all data. | P0 | Built |

### FR-WS — Workspaces and teams

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-WS-1 | Every user shall own one workspace and may belong to others as a member. | P0 | Built |
| FR-WS-2 | Owners and admins shall invite members by email with a role (admin, editor, viewer). | P0 | Built |
| FR-WS-3 | The system shall enforce role permissions on every write (viewer < editor < admin < owner). | P0 | Built |
| FR-WS-4 | The number of members shall be limited by the owner's plan seat count. | P0 | Planned |
| FR-WS-5 | Users shall switch workspace from the app header; API clients select with `X-Workspace`. | P0 | Built |
| FR-WS-6 | Forms shall be organised in folders, marked favorite, cloned, disabled, trashed and restored. | P0 | Built |
| FR-WS-7 | The system shall record an audit log of security-relevant events (login, role change, export, delete, API key create). | P1 | Planned |

### FR-BLD — Form builder

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-BLD-1 | Users shall add fields by drag-and-drop or click, then reorder, duplicate and delete them. | P0 | Built |
| FR-BLD-2 | The builder shall support undo/redo of at least 50 steps. | P0 | Built |
| FR-BLD-3 | The builder shall autosave within 2 seconds of the last change. | P0 | Built |
| FR-BLD-4 | The builder shall show a live preview in Classic and Card layouts and on mobile width. | P0 | Partial |
| FR-BLD-5 | The system shall limit fields per form by plan. | P0 | Built |
| FR-BLD-6 | The system shall create a version snapshot automatically on publish and periodically while editing; users can name, preview and restore versions. | P0 | Built |
| FR-BLD-7 | Forms shall be exportable and importable as JSON. | P1 | Built |
| FR-BLD-8 | The system shall import Google Forms (via Google API) and convert PDFs into forms (AI-assisted). | P1 | Planned |
| FR-BLD-9 | Users shall create a form from 200+ templates, filterable by category and language. | P0 | Partial |
| FR-BLD-10 | The builder shall flag accessibility problems (missing labels, low contrast, images without alt text). | P1 | Planned |

### FR-FLD — Field types

The system shall support these field types, each with label, help text, required flag, default value, hide-label option and a stable `id`:

| Group | Types | Status |
|---|---|---|
| Basic | heading, fullname, email, phone, address, text (short), textarea (long), number, date, time, dropdown, radio (single choice, with "Other"), checkbox (multiple choice, with "Other"), file, url | Built |
| Survey | rating (stars), scale, slider, matrix (input table), yesno | Built |
| Payments | products (product list with quantities and prices) | Built |
| Advanced | signature, appointment, calculation, hidden, terms, captcha | Built |
| Layout | paragraph, image, divider, pagebreak | Built |
| Planned (R2) | section (collapsible), repeating group, fill-in-the-blank, unique ID, Indian phone with OTP verification, PIN code with auto city/state, GSTIN, PAN (format validation only), location/map, take photo | Planned |

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-FLD-1 | Text fields shall support min/max length and validation presets (letters, alphanumeric, numeric, email, URL, custom regex). | P1 | Partial |
| FR-FLD-2 | Text fields shall support input masks (`#` digit, `@` letter, `*` any). | P1 | Planned |
| FR-FLD-3 | Number, slider and scale fields shall support min, max and step. | P0 | Built |
| FR-FLD-4 | File fields shall restrict extensions, file count and size per file; size also bounded by plan storage. | P0 | Partial |
| FR-FLD-5 | Appointment fields shall define slots, durations, available days and one booking per slot, and shall reject double bookings at submit time. | P0 | Built |
| FR-FLD-6 | Email fields shall optionally require a confirmation entry. | P1 | Built |
| FR-FLD-7 | Selected fields (email, text, number, dropdown) shall support "unique answer" across submissions. | P1 | Planned |
| FR-FLD-8 | Hidden fields shall be fillable by URL parameter. | P0 | Built |
| FR-FLD-9 | Answer piping: labels and text shall be able to insert earlier answers with `{fieldId}`. | P1 | Planned |

### FR-LOG — Conditional logic

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-LOG-1 | A form shall hold an ordered list of rules; each rule has conditions, a match mode (all/any) and one or more actions. | P0 | Built |
| FR-LOG-2 | Operators: equals, not equals, contains, not contains, starts with, ends with, greater than, less than, is filled, is empty. | P0 | Built |
| FR-LOG-3 | Date operators: before, after, on (R2). | P1 | Planned |
| FR-LOG-4 | Actions: show field, hide field, require field, make optional, set/calculate value, skip to page, change thank-you message, redirect to URL. | P0 | Built |
| FR-LOG-5 | Actions: enable/disable field, change email recipient, change autoresponder template. | P1 | Planned |
| FR-LOG-6 | The same logic engine shall run in the browser and on the server; the server result is authoritative. | P0 | Built |
| FR-LOG-7 | Values of hidden fields shall not be stored or validated (except `hidden` type fields). | P0 | Built |
| FR-LOG-8 | The rule editor shall let users reorder rules and shall warn about loops and references to deleted fields. | P1 | Planned |

### FR-CALC — Calculations

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-CALC-1 | Formulas shall reference fields as `{fieldId}` and support `+ - * / % ^` and parentheses. | P0 | Built |
| FR-CALC-2 | Functions: min, max, round, floor, ceil, abs, sqrt, sum, avg, if. | P0 | Built |
| FR-CALC-3 | Formulas shall be evaluated by a safe parser; no `eval` or `Function`. | P0 | Built |
| FR-CALC-4 | Date functions (days between, age) and text functions (concat, upper) shall be added. | P1 | Planned |
| FR-CALC-5 | Division by zero and invalid input shall yield empty, not an error page. | P0 | Built |

### FR-DES — Design

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-DES-1 | Users shall set primary color, background, font, form width, logo and submit-button text. | P0 | Built |
| FR-DES-2 | Users on paid plans shall add custom CSS, scoped to the form container. | P0 | Built |
| FR-DES-3 | The system shall offer at least 20 themes. | P1 | Planned |
| FR-DES-4 | "Powered by" branding shall show on free-plan forms and be removable on paid plans. | P0 | Built |
| FR-DES-5 | Card layout shall show one question per screen with a progress bar and keyboard navigation. | P0 | Built |

### FR-SET — Form settings

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-SET-1 | Owners shall set a close date and a maximum number of submissions, with a custom "closed" message. | P0 | Built |
| FR-SET-2 | Owners shall protect a form with a password. Passwords shall be stored hashed. | P0 | Partial (stored in plain text in definition) |
| FR-SET-3 | Owners shall enable save & continue later; respondents get a resume link, valid 30 days. | P0 | Built |
| FR-SET-4 | Owners shall limit one submission per respondent by cookie, cookie+IP, or verified email/phone. | P0 | Partial (IP only) |
| FR-SET-5 | Owners shall set a thank-you message or redirect URL. | P0 | Built |
| FR-SET-6 | Owners shall add translations; respondents choose a language or use `?lang=`; answers are stored against field IDs. | P0 | Built |
| FR-SET-7 | Owners shall enable approvals with one or more approvers. | P0 | Built |
| FR-SET-8 | Owners shall set a data retention period after which submissions are deleted automatically. | P1 | Planned |

### FR-PUB — Publishing and the form runtime

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-PUB-1 | Each form shall have a public URL `/f/{formId}` and an embed URL `/embed/{formId}`. | P0 | Built |
| FR-PUB-2 | The publish screen shall provide link, QR code (PNG/SVG), iframe, script and popup embed code. | P0 | Built |
| FR-PUB-3 | Embeds shall auto-resize height via postMessage. | P0 | Partial |
| FR-PUB-4 | Fields shall be prefillable from URL parameters (`?fieldId=value`). | P0 | Built |
| FR-PUB-5 | The runtime shall reject submissions to disabled, trashed, closed or over-limit forms with a clear message. | P0 | Built |
| FR-PUB-6 | The runtime shall protect against spam: honeypot field, Cloudflare Turnstile (optional per form), per-IP and per-form rate limits. | P0 | Planned |
| FR-PUB-7 | Public forms shall be served from a separate domain (e.g. `forms.<brand>.in`) with strict Content-Security-Policy. | P0 | Planned |
| FR-PUB-8 | The runtime shall count views (once per session) for analytics and plan limits. | P0 | Built |
| FR-PUB-9 | Paid plans shall support a custom domain with automatic TLS. | P1 | Planned |

### FR-SUB — Submission processing

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-SUB-1 | On submit, the server shall accept only keys of real input fields, re-run logic and validation, and return field-level errors (HTTP 422). | P0 | Built |
| FR-SUB-2 | The server shall recompute payment totals from the stored product catalog; client totals are ignored. | P0 | Built |
| FR-SUB-3 | Each submission shall store the `form_version_id` it was collected under. | P0 | Planned |
| FR-SUB-4 | Each submission shall store created time, IP (hashed after 30 days), user agent, language and source (link/embed/agent/app). | P1 | Partial |
| FR-SUB-5 | Uploaded files shall be linked only if they were uploaded to the same form. | P0 | Built |
| FR-SUB-6 | Post-submit side effects (emails, WhatsApp, webhooks, integrations, PDFs) shall run asynchronously via a job queue and must not delay the response. | P0 | Partial (in-process) |
| FR-SUB-7 | Submission IDs shown to users shall be non-guessable (ULID or similar). | P1 | Planned |
| FR-SUB-8 | Partial submissions shall be stored for analytics when the respondent leaves after starting (opt-in per form). | P1 | Planned |

### FR-INB — Inbox and tables

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-INB-1 | Users shall view submissions as an inbox (list + detail) and as a table. | P0 | Built |
| FR-INB-2 | Filters: text search, unread, starred, approval status, payment status, date range. | P0 | Built (payment status planned) |
| FR-INB-3 | Bulk actions: mark read/unread, star/unstar, delete. | P0 | Built |
| FR-INB-4 | Users shall edit a submission; edits are recorded with who/when. | P0 | Partial (no edit history) |
| FR-INB-5 | Export filtered submissions as CSV and Excel; files as ZIP. | P0 | Partial (CSV) |
| FR-INB-6 | View and download each submission as PDF. | P0 | Built |
| FR-INB-7 | Comments on a submission with @-mentions. | P2 | Planned |
| FR-INB-8 | Large exports (> 5,000 rows) shall run as background jobs and be delivered by email link. | P1 | Planned |

### FR-NOT — Notifications

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-NOT-1 | Owner notification email with subject/body templates using `{form_title}`, `{all_fields}`, `{fieldId}`. | P0 | Built |
| FR-NOT-2 | Autoresponder to the respondent's email field. | P0 | Built |
| FR-NOT-3 | Optional PDF attachment on either email. | P0 | Built |
| FR-NOT-4 | All emails shall be logged in an Outbox with sent/failed status and error. | P0 | Built |
| FR-NOT-5 | Email sending shall retry with backoff (5 attempts over 1 hour) and handle bounces/complaints. | P0 | Planned |
| FR-NOT-6 | WhatsApp notifications to owner and respondent using approved templates. | P0 | Planned |
| FR-NOT-7 | Daily/weekly digest email. | P2 | Planned |

### FR-PAY — Payments

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-PAY-1 | Owners shall connect a payment gateway per workspace: Stripe (Built), Razorpay (P0), Cashfree (P1), PayPal (P1). | P0 | Partial |
| FR-PAY-2 | Product fields shall support price, quantity, options (size/color), stock limits and images. | P0 | Partial |
| FR-PAY-3 | Support user-defined amounts (donations) with min/max. | P0 | Planned |
| FR-PAY-4 | Support coupons (percent/fixed, expiry, usage cap), tax (GST %) and shipping. | P0 | Planned |
| FR-PAY-5 | Razorpay: create order server-side, open Checkout with UPI Intent (mobile) and QR (desktop), verify the payment signature server-side, and confirm via webhook. | P0 | Planned |
| FR-PAY-6 | A submission with a payment shall be in `pending` until the gateway confirms; notifications fire only on `paid`. | P0 | Built (Stripe) |
| FR-PAY-7 | Payment webhooks shall be idempotent (keyed by gateway event ID). | P0 | Planned |
| FR-PAY-8 | Owners shall issue full or partial refunds from the inbox. | P1 | Planned |
| FR-PAY-9 | Subscriptions (recurring) through gateway subscription APIs. | P1 | Planned |
| FR-PAY-10 | Respondents shall receive a receipt; GST receipt when the owner provides GSTIN. | P1 | Planned |
| FR-PAY-11 | A test mode shall simulate payments without a gateway. | P0 | Built |

### FR-PDF — Documents and e-signature

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-PDF-1 | Generate a designed PDF per submission (title, intro, footer, color, logo, embedded signatures). | P0 | Built |
| FR-PDF-2 | Upload a PDF, place signature/initials/name/date/text/checkbox fields, assign to multiple signers. | P0 | Built |
| FR-PDF-3 | Send signing links in order; signers sign without an account after consenting to e-sign. | P0 | Built |
| FR-PDF-4 | Produce a signed PDF with an audit certificate (names, emails, IPs, timestamps, document hash). | P0 | Built |
| FR-PDF-5 | Void a document; send reminders. | P0 | Built (void), Planned (reminders) |
| FR-PDF-6 | Signed-document count shall count against the plan. | P0 | Built |

### FR-APR — Approvals

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-APR-1 | Approvers receive an email with a signed, no-login link to approve or reject with a note. | P0 | Built |
| FR-APR-2 | Approvers can also decide from the inbox. | P0 | Built |
| FR-APR-3 | The respondent and owner are notified of the decision. | P0 | Built |
| FR-APR-4 | Approval links shall expire after 30 days and be single-use. | P1 | Planned |
| FR-APR-5 | Multi-step, conditional approval workflows. | P2 | Planned |

### FR-ANA — Analytics and reports

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-ANA-1 | Report page: submissions over time, views, conversion rate, revenue, per-field charts, matrix breakdowns, numeric stats. | P0 | Built |
| FR-ANA-2 | Per-field drop-off funnel and median completion time. | P1 | Planned |
| FR-ANA-3 | Traffic source (UTM, referrer), device type and city-level location. | P1 | Planned |
| FR-ANA-4 | Google Analytics 4, GTM and Meta Pixel IDs per form. | P1 | Planned |

### FR-AI — AI features

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-AI-1 | Generate a form definition from a text description. | P0 | Built |
| FR-AI-2 | Translate a form's labels, options and messages into chosen languages. | P0 | Built |
| FR-AI-3 | A chat agent shall fill a form conversationally and submit through the same validation as FR-SUB-1. | P1 | Built |
| FR-AI-4 | AI edits to an existing form shall be shown as a diff; nothing changes until the user accepts; a version is saved first. | P0 | Planned |
| FR-AI-5 | AI output shall be validated against the form definition schema before it is saved. | P0 | Partial |
| FR-AI-6 | AI usage shall be metered in credits per plan. | P1 | Planned |
| FR-AI-7 | Submission data sent to the LLM shall be limited to what the feature needs; customers can disable AI per workspace. | P0 | Planned |

### FR-APP — Apps and stores

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-APP-1 | Users shall build app pages that bundle forms, links and content, installable as a PWA. | P1 | Built |
| FR-APP-2 | Stores shall show a product grid, cart and checkout, and record orders with fulfilment status. | P1 | Built |
| FR-APP-3 | Stores shall use the same gateway adapters as forms (including Razorpay). | P1 | Planned |

### FR-INT — Integrations and webhooks

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-INT-1 | Per-form webhooks receive `submission.created` JSON. | P0 | Built |
| FR-INT-2 | Webhook requests shall carry an HMAC-SHA256 signature header and timestamp. | P0 | Planned |
| FR-INT-3 | Failed webhooks shall retry with exponential backoff for 24 hours, then dead-letter; users can replay from the delivery log. | P0 | Planned |
| FR-INT-4 | Slack, Discord and Google Sheets (Apps Script) integrations. | P0 | Built |
| FR-INT-5 | OAuth-based integrations: Google Sheets, Google Drive (uploads), Zoho CRM, HubSpot, Mailchimp, Notion, Airtable. | P1 | Planned |
| FR-INT-6 | Zapier, Make, n8n and Pabbly apps. | P1 | Planned |
| FR-INT-7 | Webhook URLs shall be validated to block private/internal IP ranges (SSRF protection). | P0 | Planned |

### FR-API — Public API

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-API-1 | Users shall create and revoke API keys. | P0 | Built |
| FR-API-2 | API keys shall be accepted in the `APIKEY` header (query parameter deprecated). | P0 | Built |
| FR-API-3 | API keys shall be stored hashed and shown once on creation. | P0 | Planned |
| FR-API-4 | A versioned API under `/api/v1` with OAuth 2.0 (authorization code + PKCE) and scopes. | P1 | Planned |
| FR-API-5 | Rate limits per plan with `RateLimit-*` response headers. | P0 | Planned |
| FR-API-6 | OpenAPI 3.1 specification published and used to generate the TypeScript SDK. | P1 | Planned |
| FR-API-7 | MCP server exposing forms, submissions and sign documents to AI assistants. | P1 | Planned |

### FR-TS — Trust and safety

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-TS-1 | On publish, the system shall scan forms for password/OTP/card/CVV/net-banking fields and impersonation keywords (bank, brand names, "verify your account"). | P0 | Planned |
| FR-TS-2 | High-risk forms shall be held for human review before going live; medium-risk forms go live with monitoring. | P0 | Planned |
| FR-TS-3 | Every public form shall show a "Report abuse" link. | P0 | Planned |
| FR-TS-4 | Takedowns shall notify the owner with the reason and an appeal link; appeals answered within 48 hours. | P0 | Planned |
| FR-TS-5 | Free-plan forms shall not collect payments until the owner's email is verified. | P0 | Planned |
| FR-TS-6 | Uploaded files shall be virus-scanned before they can be downloaded. | P0 | Planned |

### FR-BILL — Plans and billing

| ID | Requirement | Pri | Status |
|---|---|---|---|
| FR-BILL-1 | Each workspace shall have a plan with limits (see PRD 1.9). | P0 | Built (Jotform-style tiers) |
| FR-BILL-2 | The system shall enforce limits server-side with HTTP 402 and an upgrade hint. | P0 | Built |
| FR-BILL-3 | Users shall see current usage against limits; warnings at 80% and 100% by email. | P0 | Partial |
| FR-BILL-4 | Subscription billing through Razorpay Subscriptions (INR) and Stripe (other currencies), with GST invoices. | P0 | Planned |
| FR-BILL-6 | A workspace's plan shall change only through a confirmed billing event or a staff action, never by a direct user API call. | P0 | Not met (`POST /me/plan`) |
| FR-BILL-5 | Hitting the monthly submission limit shall not lose data: submissions over the limit are accepted up to 10% overage and held read-only until upgrade or next month. | P1 | Planned |

## 2.4 Non-functional requirements

### NFR-PERF — Performance

| ID | Requirement |
|---|---|
| NFR-PERF-1 | Public form page: Largest Contentful Paint < 2.0 s at p75 on a mid-range Android over 4G; JS payload for the runtime < 80 KB gzipped. |
| NFR-PERF-2 | Submit API p95 < 500 ms excluding payment redirects, at 200 submissions/second on a single form. |
| NFR-PERF-3 | Builder API p95 < 300 ms for reads, < 600 ms for writes. |
| NFR-PERF-4 | Inbox loads the first 50 submissions of a 100,000-submission form in < 1 s. |
| NFR-PERF-5 | Notification emails dispatched within 60 s of submission at p95. |

### NFR-AV — Availability and reliability

| ID | Requirement |
|---|---|
| NFR-AV-1 | Public form runtime and submit endpoint: 99.9% monthly availability. |
| NFR-AV-2 | Builder app: 99.5% monthly availability. |
| NFR-AV-3 | No accepted submission shall be lost: submission writes are durable before the 200 response (RPO 0 for submissions). |
| NFR-AV-4 | Database backups: point-in-time recovery for 14 days; daily snapshot kept 35 days; restore tested quarterly. RTO 4 hours. |
| NFR-AV-5 | Background jobs are at-least-once with idempotent handlers. |

### NFR-SEC — Security

| ID | Requirement |
|---|---|
| NFR-SEC-1 | TLS 1.2+ everywhere; HSTS on all domains. |
| NFR-SEC-2 | Data encrypted at rest (database, object storage, backups). |
| NFR-SEC-3 | OWASP ASVS Level 2 controls for the builder and API. |
| NFR-SEC-4 | CSRF protection for cookie-authenticated writes (SameSite + Origin check or token). |
| NFR-SEC-5 | Strict CSP on public forms; custom CSS sanitised; no custom JavaScript on free plans. |
| NFR-SEC-6 | Secrets (gateway keys, SMTP, API keys) encrypted with a KMS-managed key; never logged. |
| NFR-SEC-7 | Every tenant query scoped by workspace ID; automated tests for cross-tenant access. |
| NFR-SEC-8 | Dependency and container scanning in CI; critical vulnerabilities patched within 7 days. |
| NFR-SEC-9 | Annual third-party penetration test from R2 onward. |

### NFR-PRIV — Privacy and compliance

| ID | Requirement |
|---|---|
| NFR-PRIV-1 | Indian customers' data stored in an Indian region (e.g. AWS ap-south-1 Mumbai) by default. |
| NFR-PRIV-2 | Support DPDP Act duties: consent notices, purpose limitation, access/correction/erasure requests within 30 days, breach notification. (Verify with counsel.) |
| NFR-PRIV-3 | Owners can export and permanently delete all their data. Deleted data purged from backups within 35 days. |
| NFR-PRIV-4 | Respondent IP addresses hashed after 30 days unless the owner needs them for fraud checks. |
| NFR-PRIV-5 | Data processing agreement available to paid customers. |

### NFR-A11Y — Accessibility
- Public forms and the builder shall meet WCAG 2.2 AA: keyboard operable, visible focus, labels bound to inputs, error messages announced, 4.5:1 contrast for default themes.

### NFR-I18N — Internationalisation
- UI available in English and Hindi at R1; more Indian languages in R2.
- All stored text UTF-8; right-to-left rendering for Urdu and Arabic.
- Currency per form (INR default); dates formatted per locale; times stored in UTC.

### NFR-SCALE — Scalability
- Design for 1M forms, 100M submissions and 10,000 submissions/minute peak across the platform within 3 years.
- Stateless application servers that scale horizontally.

### NFR-OBS — Observability
- Structured JSON logs with request ID; metrics (RED) per endpoint; distributed traces for submit flow.
- Alerts on submit error rate > 1% for 5 minutes, queue lag > 5 minutes, payment webhook failures.

### NFR-MAINT — Maintainability
- Shared logic (fields, logic, formula, plans) lives in `shared/` and runs identically in browser and server.
- Unit test coverage ≥ 80% for `shared/`; integration tests for every public endpoint.
- TypeScript adoption for new modules from R2.

---

# Part 3 — Software Design Document (SDD)

## 3.1 Design goals

1. **One canonical, versioned submission record.** Every input channel writes it; every output view reads it. This is the decision that let Jotform add Tables, Sign, Boards and Agents cheaply.
2. **Shared, isomorphic form engine.** Field catalog, logic, formulas and validation run identically in the browser and on the server (`shared/`).
3. **Fast, durable submit path; everything else async.** The submit request only validates and persists. Emails, WhatsApp, webhooks, PDFs and integrations are queued jobs.
4. **Tenant isolation by construction.** Every row carries a workspace ID; every query filters on it.
5. **Abuse resistance from day one.** Public forms are isolated on their own domain and scanned on publish.

## 3.2 Current architecture (as built)

```
Browser (React + Vite SPA)                Respondent browser
  ├─ Builder, Inbox, Reports, Sign, Apps     └─ /f/:id, /embed/:id, /a/:id (same SPA)
  └─ calls /api/* with session cookie                calls /api/public/*
                │                                        │
                ▼                                        ▼
        Express server (server/index.js, port 4000)
          ├─ routes/account.js     auth, me, team, keys, outbox
          ├─ routes/forms.js       forms CRUD, versions, templates, webhook log
          ├─ routes/submissions.js inbox, CSV, report, PDF, decisions, files
          ├─ routes/public.js      public form, upload, draft, submit, payment return, approval links
          ├─ routes/sign.js        e-sign documents and public signing
          ├─ routes/apps.js        apps, stores, orders
          ├─ routes/ai.js          AI form, translate, chat agent (Anthropic SDK)
          ├─ notify.js             emails (nodemailer), approvals, webhooks, Slack/Discord/Sheets
          ├─ payments.js           Stripe Checkout via REST, or simulated "test" gateway
          ├─ pdf.js                pdf-lib submission PDFs and signed documents
          └─ db.js                 node:sqlite (data/forms.db), uploads on local disk (data/uploads)
        shared/  fields.js · logic.js · formula.js · i18n.js · plans.js  (used by client and server)
```

**Strengths:** small, readable, already covers most of Jotform's visible surface; shared engine; server-side validation and price recomputation; plan limits enforced with HTTP 402.

**Gaps that block production (fix in R1):**

| # | Gap | Where | Fix |
|---|---|---|---|
| G1 | Single-file SQLite, single process; no horizontal scale or PITR | `server/db.js` | Postgres (§3.6) |
| G2 | Submissions don't record `form_version_id` | `submissions` table | Add column; write on submit (§3.6) |
| G3 | Side effects run in-process after response; lost on crash, no retry | `notify.js afterSubmit` | Job queue (§3.9) |
| G4 | Webhooks unsigned, no retry, no SSRF guard | `notify.js postJson` | §3.10 |
| G5 | Uploads on local disk, no virus scan | `routes/public.js`, `UPLOAD_DIR` | Object storage + scanning (§3.11) |
| G6 | Form password stored and compared in plain text | `settings.password` | Store hash; compare with timing-safe check |
| G7 | API keys stored in plain text; accepted in query string | `api_keys`, `auth.js` | Store SHA-256 hash, prefix display, header only |
| G8 | "One submission per user" uses IP only | `routes/public.js` | Cookie token + optional IP + verified email/phone |
| G9 | Appointment double-booking check scans all submissions | `routes/public.js` | Unique index on a `bookings` table |
| G10 | Inbox search uses `LIKE` over JSON text, loads all rows then slices | `routes/submissions.js filtered()` | SQL pagination + Postgres full-text/GIN |
| G11 | Integer submission IDs are guessable | `submissions.id` | ULID public IDs |
| G12 | No Razorpay/UPI | `server/payments.js` | Gateway adapter interface (§3.8) |
| G13 | Public forms served from the same origin as the app | `server/index.js` | Separate form domain (§3.12) |
| G14 | Session secret has an insecure default | `auth.js` | Fail to boot in production without `SESSION_SECRET` |
| G15 | Form password sent as a GET query parameter (ends up in logs and browser history) | `routes/public.js GET /forms/:id` | POST the password; return a short-lived signed access token |
| G16 | **Any signed-in user can change their own plan for free** via `POST /me/plan` | `routes/account.js` | Remove for SaaS; plan changes only via billing webhooks or staff admin |
| G17 | API keys listed back in full; keys belong to a user, not a workspace | `routes/account.js /keys` | Hash + prefix; workspace-scoped keys with scopes |

## 3.3 Target architecture (R1–R3)

```
                      Cloudflare (DNS, WAF, bot management, Turnstile, CDN)
                 ┌──────────────────────────┴──────────────────────────┐
         app.<brand>.in (builder SPA)                    forms.<brand>.in + custom domains
                 │                                         (form runtime: SSR'd light page)
                 ▼                                                     ▼
        ┌───────────────── API service (Node.js, Express → Fastify optional) ─────────────────┐
        │ auth · workspaces · forms · versions · submissions · files · payments · sign · apps │
        │ ai · integrations · billing · admin · public runtime · webhooks-in (gateways)       │
        └───────┬──────────────┬───────────────┬────────────────┬───────────────┬─────────────┘
                │              │               │                │               │
          PostgreSQL 16     Redis 7        Object storage    Job queue       LLM provider
          (primary +       (sessions,      (S3 / R2:         (BullMQ on      (Anthropic)
           read replica,    rate limits,    uploads,          Redis)
           PITR)            cache, locks)   PDFs, exports)       │
                                                                 ▼
                                          Workers: email · whatsapp · webhooks · integrations
                                                   pdf · export · virus-scan (ClamAV) · abuse-scan
                                                   analytics rollups · retention purge · billing
```

**Technology choices**

| Concern | Choice | Reason |
|---|---|---|
| Frontend | React 18 + Vite (existing) | Already built; large ecosystem |
| Public form runtime | Small Preact/vanilla bundle rendered from the same `shared/` engine | Meets 80 KB budget on low-end phones |
| API | Node.js 22, Express (existing), zod validation | Keep existing code; zod already a dependency |
| Database | PostgreSQL 16 with JSONB | Relational integrity for tenants/billing, flexible submission data, GIN indexes |
| Cache / queue | Redis 7 + BullMQ | Simple, proven retries, delays, dead-letter |
| Files | S3-compatible (AWS S3 Mumbai or Cloudflare R2) via presigned URLs | Offloads bandwidth; lifecycle policies |
| PDF | pdf-lib (existing); headless Chromium for HTML templates later | Existing code works |
| Email | Amazon SES (Mumbai) or Postmark via nodemailer transport | Deliverability, bounce webhooks |
| WhatsApp | Meta Cloud API or a BSP (Gupshup, Interakt) | Template messages |
| Payments | Gateway adapter: Razorpay, Cashfree, Stripe, PayPal | §3.8 |
| AI | Anthropic Claude via `@anthropic-ai/sdk` (existing) | Already integrated |
| Hosting | AWS ap-south-1 (Mumbai) containers (ECS Fargate) or Kubernetes | India data residency |
| Observability | OpenTelemetry → Grafana/Loki/Tempo or Datadog; Sentry for errors | |
| CI/CD | GitHub Actions; Docker images; blue-green deploys | |

**Repository layout (target)**

```
client/          builder SPA (React)
runtime/         public form runtime bundle (new, R1)
server/
  routes/        HTTP handlers (thin)
  services/      business logic (forms, submissions, payments, sign, billing, abuse)
  gateways/      payment adapters (razorpay.js, cashfree.js, stripe.js, paypal.js, test.js)
  jobs/          queue definitions and worker handlers
  integrations/  slack, sheets, zoho, hubspot, ...
  db/            migrations (SQL) and query helpers
shared/          fields, logic, formula, i18n, plans, form-definition schema (zod)
docs/            this specification, ADRs, OpenAPI spec
```

## 3.4 Components

| Component | Responsibility | Key modules |
|---|---|---|
| Auth & workspace | Sessions, API keys, OAuth, roles, workspace selection | `auth.js`, `routes/account.js` |
| Form service | CRUD, validation of definitions, versions, publish, templates | `routes/forms.js`, `templates.js` |
| Form engine (shared) | Field catalog, defaults, formatting, logic, formulas, pages, validation | `shared/*.js` |
| Public runtime | Serve definition, uploads, drafts, submit, appointment availability | `routes/public.js`, `runtime/` |
| Submission service | Persist, query, edit, export, delete, retention | `routes/submissions.js` |
| Payment service | Gateway adapters, orders, webhooks, refunds | `payments.js` → `gateways/` |
| Notification service | Email, WhatsApp, digest, outbox | `notify.js` → `jobs/` |
| Document service | Submission PDFs, e-sign documents, audit certificate | `pdf.js`, `routes/sign.js` |
| Approval service | Approver links, decisions, notifications | `routes/public.js`, `notify.js` |
| Integration service | Webhooks, native integrations, delivery log | `notify.js` → `integrations/` |
| AI service | Generate, translate, agent, AI diffs, credits | `ai.js`, `routes/ai.js` |
| Apps & stores | App pages, stores, orders | `routes/apps.js` |
| Analytics | View counting, funnels, rollups, reports | `routes/submissions.js` report + new `analytics` |
| Billing | Plans, usage metering, subscriptions, invoices | `shared/plans.js`, `db.js usage` |
| Trust & safety | Publish scan, reports, review queue, takedown, appeals | new `services/abuse.js` |
| Admin console | Staff tools (T&S queue, user lookup, refunds) | new |

## 3.5 Form definition schema

The form definition is a JSON document stored in `form_versions.definition` (and the current draft in `forms.definition`). It is validated with a zod schema in `shared/schema.js` (to add) on every write, including AI output.

```jsonc
{
  "title": "Workshop Registration",
  "layout": "classic",                 // classic | card
  "fields": [
    { "id": "h", "type": "heading", "label": "Workshop Registration", "subheading": "Sat 12 Dec" },
    { "id": "name", "type": "fullname", "label": "Name", "required": true },
    { "id": "email", "type": "email", "label": "E-mail", "required": true, "confirm": false },
    { "id": "level", "type": "radio", "label": "Level", "options": ["Beginner", "Advanced"], "other": false },
    { "id": "exp", "type": "number", "label": "Years of experience", "min": 0, "max": 50, "hiddenByDefault": false },
    { "id": "seats", "type": "products", "label": "Seats", "currency": "INR", "quantity": true,
      "products": [{ "id": "std", "name": "Standard", "price": 1499 }] },
    { "id": "total", "type": "calculation", "label": "Total", "formula": "{seats} * 1.18" },
    { "id": "utm", "type": "hidden", "label": "UTM source", "defaultValue": "" }
  ],
  "logic": [
    { "id": "r1", "match": "all",
      "conditions": [{ "field": "level", "op": "equals", "value": "Advanced" }],
      "actions": [{ "type": "show", "target": "exp" }, { "type": "require", "target": "exp" }] }
  ],
  "theme": { "primary": "#0a1551", "background": "#f3f3fe", "text": "#2c3345",
             "fieldBg": "#ffffff", "font": "Inter", "width": 720, "logo": "", "css": "" },
  "settings": {
    "thankYou": { "message": "Thanks!", "redirect": "" },
    "notify": { "enabled": true, "to": "", "subject": "New submission: {form_title}", "attachPdf": false },
    "autoresponder": { "enabled": false, "emailField": "email", "subject": "", "body": "", "attachPdf": false },
    "closeDate": "", "maxSubmissions": "", "closedMessage": "",
    "passwordHash": "",                 // R1: replaces plain "password"
    "saveAndContinue": true, "oneSubmissionPerUser": false,
    "approvals": { "enabled": false, "approvers": "", "steps": 1 },
    "webhooks": [],                     // R1: moves to the webhooks table
    "payment": { "provider": "razorpay", "currency": "INR" },
    "language": "en", "showProgress": true
  },
  "translations": { "hi": { "name.label": "नाम" } }
}
```

**Rules**
- Field `id`s are stable strings, unique per form, never reused after deletion. Logic, translations, submission data and integrations all key on them.
- Display-only types (`heading`, `paragraph`, `image`, `divider`, `pagebreak`) never produce data.
- Unknown properties are rejected by the schema (prevents AI or import from injecting junk).
- Definition size limit: 512 KB; field count limited by plan.

## 3.6 Data model (target PostgreSQL schema)

```sql
-- Tenancy
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext UNIQUE NOT NULL,
  name          text NOT NULL DEFAULT '',
  password_hash text,                       -- null for SSO-only users
  email_verified_at timestamptz,
  totp_secret_enc bytea,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE workspaces (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   uuid NOT NULL REFERENCES users(id),
  name       text NOT NULL,
  plan       text NOT NULL DEFAULT 'free',
  region     text NOT NULL DEFAULT 'in',     -- data residency
  status     text NOT NULL DEFAULT 'active', -- active | suspended
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE memberships (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid REFERENCES users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('owner','admin','editor','viewer')),
  PRIMARY KEY (workspace_id, user_id)
);

-- Forms
CREATE TABLE forms (
  id            text PRIMARY KEY,                     -- short public id, e.g. 14-char base36
  workspace_id  uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title         text NOT NULL,
  status        text NOT NULL DEFAULT 'enabled',      -- enabled | disabled | trashed | held | taken_down
  folder        text NOT NULL DEFAULT '',
  favorite      boolean NOT NULL DEFAULT false,
  draft         jsonb NOT NULL,                       -- working definition
  published_version_id bigint,                        -- FK added below
  risk_score    smallint NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE form_versions (
  id          bigserial PRIMARY KEY,
  form_id     text NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  definition  jsonb NOT NULL,
  label       text NOT NULL DEFAULT '',
  author_id   uuid REFERENCES users(id),
  source      text NOT NULL DEFAULT 'user',          -- user | autosave | ai | import | restore
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE forms ADD FOREIGN KEY (published_version_id) REFERENCES form_versions(id);

-- Submissions: the canonical record
CREATE TABLE submissions (
  id              bigserial PRIMARY KEY,
  public_id       text UNIQUE NOT NULL,              -- ULID shown to users and API
  form_id         text NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  workspace_id    uuid NOT NULL,                     -- denormalised for tenant filtering
  form_version_id bigint NOT NULL REFERENCES form_versions(id),
  data            jsonb NOT NULL,                    -- { fieldId: value }
  source          text NOT NULL DEFAULT 'form',      -- form | embed | agent | app | api | import
  language        text,
  status          text NOT NULL DEFAULT 'new',       -- new | read
  starred         boolean NOT NULL DEFAULT false,
  approval        text,                              -- pending | approved | rejected
  payment_status  text,                              -- pending | paid | failed | refunded | partially_refunded
  signed          boolean NOT NULL DEFAULT false,
  ip_hash         text,
  user_agent      text,
  search          tsvector GENERATED ALWAYS AS (jsonb_to_tsvector('simple', data, '["string","numeric"]')) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);
CREATE INDEX ON submissions (form_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX ON submissions USING gin (search);
CREATE INDEX ON submissions USING gin (data jsonb_path_ops);

CREATE TABLE submission_edits (           -- audit of inbox edits
  id bigserial PRIMARY KEY, submission_id bigint REFERENCES submissions(id) ON DELETE CASCADE,
  user_id uuid, before jsonb, after jsonb, created_at timestamptz DEFAULT now()
);
CREATE TABLE drafts (                     -- save & continue + partial submissions
  token text PRIMARY KEY, form_id text REFERENCES forms(id) ON DELETE CASCADE,
  form_version_id bigint, data jsonb NOT NULL, last_field text,
  updated_at timestamptz DEFAULT now(), expires_at timestamptz
);
CREATE TABLE bookings (                   -- appointment slots; unique index prevents double booking
  form_id text, field_id text, slot_start timestamptz, submission_id bigint,
  PRIMARY KEY (form_id, field_id, slot_start)
);

-- Files
CREATE TABLE files (
  id text PRIMARY KEY, workspace_id uuid NOT NULL, form_id text,
  object_key text NOT NULL, name text NOT NULL, mime text, size bigint NOT NULL,
  scan_status text NOT NULL DEFAULT 'pending',  -- pending | clean | infected | error
  created_at timestamptz DEFAULT now()
);

-- Payments
CREATE TABLE payment_accounts (           -- connected gateway per workspace
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL,
  provider text NOT NULL, mode text NOT NULL, credentials_enc bytea NOT NULL, created_at timestamptz DEFAULT now()
);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL, submission_id bigint REFERENCES submissions(id), order_id bigint,
  provider text NOT NULL, provider_order_id text, provider_payment_id text,
  amount_minor bigint NOT NULL, currency char(3) NOT NULL, tax_minor bigint DEFAULT 0,
  status text NOT NULL, method text,       -- upi | card | netbanking | wallet
  items jsonb, coupon text, raw jsonb, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX ON payments (provider, provider_payment_id);
CREATE TABLE gateway_events (             -- idempotency for incoming gateway webhooks
  provider text, event_id text, received_at timestamptz DEFAULT now(), PRIMARY KEY (provider, event_id)
);

-- Messaging, integrations, API
CREATE TABLE outbox (                     -- every email / WhatsApp sent
  id bigserial PRIMARY KEY, workspace_id uuid, form_id text, channel text NOT NULL,
  recipient text NOT NULL, subject text, body text, attachments jsonb,
  status text NOT NULL DEFAULT 'queued', attempts int DEFAULT 0, error text,
  created_at timestamptz DEFAULT now(), sent_at timestamptz
);
CREATE TABLE webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, form_id text,
  url text NOT NULL, secret_enc bytea NOT NULL, events text[] NOT NULL DEFAULT '{submission.created}',
  active boolean DEFAULT true
);
CREATE TABLE webhook_deliveries (
  id bigserial PRIMARY KEY, webhook_id uuid REFERENCES webhooks(id) ON DELETE CASCADE,
  event_id text NOT NULL, payload jsonb NOT NULL, attempt int NOT NULL,
  status int, error text, next_attempt_at timestamptz, created_at timestamptz DEFAULT now()
);
CREATE TABLE api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), workspace_id uuid NOT NULL, user_id uuid NOT NULL,
  prefix text NOT NULL, key_hash text UNIQUE NOT NULL, label text, scopes text[],
  last_used_at timestamptz, created_at timestamptz DEFAULT now(), revoked_at timestamptz
);

-- Usage, billing, safety, audit
CREATE TABLE usage_monthly (
  workspace_id uuid, month date, submissions int DEFAULT 0, views int DEFAULT 0,
  payments int DEFAULT 0, signatures int DEFAULT 0, ai_credits int DEFAULT 0,
  PRIMARY KEY (workspace_id, month)
);
CREATE TABLE abuse_reports (
  id bigserial PRIMARY KEY, form_id text, reporter_email text, reason text, details text,
  status text DEFAULT 'open', created_at timestamptz DEFAULT now()
);
CREATE TABLE enforcement_actions (
  id bigserial PRIMARY KEY, form_id text, workspace_id uuid, action text, reason text,
  staff_id uuid, appeal_status text, created_at timestamptz DEFAULT now()
);
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY, workspace_id uuid, actor_id uuid, action text, target text,
  meta jsonb, ip_hash text, created_at timestamptz DEFAULT now()
);
-- Existing modules carried over with workspace_id instead of user_id:
-- sign_docs, sign_signers, apps, orders, team_invites
```

**Migration from SQLite (R1)**
1. Add a `db/` layer with a query interface used by all routes (today routes call `db.prepare` directly).
2. Write SQL migrations (node-pg-migrate or drizzle-kit).
3. One-off script copies SQLite rows to Postgres, mapping `user_id` → a workspace per user, generating `public_id`s, and linking each submission to the latest `form_versions` row created before it (best-effort backfill).
4. Keep SQLite as the "single-node / self-hosted lite" driver only if the self-hosted edition needs it; otherwise remove.

## 3.7 Submission pipeline

```
Respondent            Form runtime            API (submit)                         Queue / workers
    │ open /f/:id ───────▶ GET /api/public/forms/:id  (published version, counts view)
    │ fill (logic runs locally via shared/logic.js)
    │ upload file ───────▶ POST /upload → presigned PUT to object storage → file row (scan pending)
    │ submit ────────────▶ POST /api/public/forms/:id/submit
    │                         1. Rate limit (IP, form), Turnstile/honeypot check
    │                         2. Load form + published version; status/close/limit/password checks
    │                         3. Whitelist keys → computeState → validateAll  ── 422 on errors
    │                         4. Verify uploads belong to form; appointment slot insert (unique)
    │                         5. Recompute totals from catalog (+ coupon, GST, shipping)
    │                         6. BEGIN; insert submission (+ payment row pending); bump usage; COMMIT
    │                         7. If payment: create gateway order → return checkout params
    │                            else enqueue "submission.completed"
    │◀── 200 {id, thankYou, redirect | checkout} ──
    │ pay (UPI intent / QR) ─▶ gateway ─▶ webhook POST /api/gateways/razorpay
    │                                     verify signature, idempotent → payment paid
    │                                     enqueue "submission.completed"
    │                                                                   ──▶ email jobs
    │                                                                   ──▶ whatsapp jobs
    │                                                                   ──▶ approval emails
    │                                                                   ──▶ webhook deliveries
    │                                                                   ──▶ integrations
    │                                                                   ──▶ pdf render (if attached)
```

Logic engine (`shared/logic.js`): `computeState(def, values)` settles calculation fields (3 passes for chained formulas), evaluates rules in order, applies actions (show/hide/require/unrequire/setValue/skipTo/thankyou/redirect), re-settles calculations, and returns `{values, hidden, required, thankYou, redirect, skips}`. Fields targeted by any `show` action start hidden. `validateAll` then validates only visible fields. R2 adds cycle detection and a dependency graph so evaluation is O(rules) instead of fixed passes.

Formula engine (`shared/formula.js`): a hand-written tokenizer and recursive-descent parser over numbers, `{fieldId}` references, operators `+ - * / % ^`, parentheses and a fixed function table. No access to globals. Errors evaluate to empty.

## 3.8 Payments design

**Adapter interface** (`server/gateways/*.js`):

```js
export default {
  id: 'razorpay',
  currencies: ['INR'],
  async createOrder({ account, amountMinor, currency, receipt, customer, notes }) {},  // → { orderId, clientParams }
  verifyClientResult({ account, payload }) {},       // checkout callback signature check → { paymentId } | throws
  verifyWebhook({ account, rawBody, headers }) {},   // → normalized event { id, type, orderId, paymentId, status, amountMinor, method }
  async refund({ account, paymentId, amountMinor }) {},
  async createSubscription({ ... }) {},              // R2
};
```

**Razorpay UPI flow (R1)**
1. Owner connects Razorpay (API key + secret, encrypted in `payment_accounts`; Razorpay OAuth/partner onboarding in R2).
2. Submit creates a Razorpay Order (`amount` in paise, `receipt` = submission public ID) and a `payments` row `pending`.
3. Runtime opens Razorpay Checkout. On mobile, UPI Intent hands off to the respondent's UPI app; on desktop, QR is shown. UPI Collect is not used (deprecated 28 Feb 2026).
4. Checkout returns `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`; server verifies HMAC-SHA256(`order_id|payment_id`, secret).
5. The authoritative confirmation is the `payment.captured` / `order.paid` webhook, verified with the webhook secret and deduplicated in `gateway_events`.
6. On `paid`: submission `payment_status = paid`, usage bumped, `submission.completed` enqueued.
7. Pending payments older than 24 hours are marked `failed` by a sweeper job.

**Money rules:** amounts stored as integer minor units; GST computed per line and rounded half-up at line level; currency per form; totals always recomputed server-side.

## 3.9 Background jobs

| Queue | Job | Retries | Notes |
|---|---|---|---|
| `notifications` | `email.send`, `whatsapp.send` | 5, exponential (1 min → 1 h) | Writes outbox status |
| `webhooks` | `webhook.deliver` | 8 over 24 h | Dead-letter after last attempt; replay from UI |
| `integrations` | `sheets.append`, `hubspot.upsert`, ... | 5 | Per-integration rate limits |
| `documents` | `pdf.render`, `sign.finalize` | 3 | Stores output in object storage |
| `files` | `file.scan` | 3 | ClamAV; infected → quarantine + notify |
| `safety` | `form.scan` (on publish), `report.triage` | 3 | |
| `exports` | `export.csv`, `export.xlsx`, `export.zip` | 3 | Emails a signed download link |
| `cron` | usage rollup, retention purge, payment sweeper, digests | — | BullMQ repeatable jobs |

All handlers are idempotent (keyed by `event_id` or job ID). The `submission.completed` event fans out into child jobs so one failing channel does not block others.

## 3.10 Webhooks (outgoing)

- Payload: see API Reference §4.8.
- Headers: `X-WpForms-Event`, `X-WpForms-Delivery` (UUID), `X-WpForms-Timestamp` (unix seconds), `X-WpForms-Signature: v1=<hex HMAC-SHA256(secret, timestamp + "." + rawBody)>`.
- Receivers should reject timestamps older than 5 minutes.
- SSRF guard: resolve DNS and reject private, loopback, link-local and metadata IP ranges; HTTPS required in production; 10 s timeout; response body discarded.

## 3.11 Files and uploads

- `POST /api/public/forms/:id/upload` validates type/size against the field and plan, creates a `files` row, returns a presigned PUT URL (R1) or accepts multipart (current).
- Objects stored at `ws/{workspaceId}/forms/{formId}/{fileId}`; private bucket; downloads only via short-lived signed URLs after auth.
- A `file.scan` job runs ClamAV; files stay `pending` (not downloadable) until `clean`.
- Storage usage counted per workspace for plan limits.

## 3.12 Security design

| Area | Design |
|---|---|
| Domains | `app.` for the builder (cookies scoped here); `forms.` for public forms (no auth cookies); `api.` optional. Prevents a malicious form from reading builder sessions. |
| CSP (forms) | `default-src 'self'; script-src 'self' <gateway checkout domains> challenges.cloudflare.com; frame-ancestors *` (owner can restrict); custom CSS sanitised (no `url()` to external hosts on free plan, no `@import`). |
| CSRF | SameSite=Lax cookies plus Origin header check on state-changing requests. |
| Authorization | Middleware resolves `req.ws` (workspace + role); every repository function requires `workspaceId`. |
| Secrets | Gateway keys, webhook secrets and TOTP secrets encrypted with AES-256-GCM, data key from KMS. |
| API keys | Format `wpf_live_<32 random>`; store SHA-256 hash and an 8-char prefix; show once. |
| Rate limits | Redis token buckets: submit 30/min per IP per form; login 5/15 min; API per plan. |
| Abuse | Publish-time scan (keywords, field types, brand list, link reputation); risk score → allow / monitor / hold; report link; staff review queue; takedown with reason; appeal flow; repeat-offender account suspension. |
| Logging | No submission values or secrets in logs; PII fields masked. |

## 3.13 AI design

- `ai.generateForm(prompt)`, `ai.translate(def, langs)`, `ai.agentTurn(form, history)` call Claude through `@anthropic-ai/sdk` (model from `AI_MODEL`, default `claude-opus-5-5`; a smaller model for translation is cheaper).
- All AI output is parsed and validated with the form-definition zod schema; invalid output is retried once, then rejected.
- **AI edit flow (R1):** `POST /api/ai/forms/:id/propose` returns a proposed definition and a JSON-patch diff; the client shows the diff; `POST /api/forms/:id/versions` with `source: "ai"` applies it after acceptance. A version snapshot is always written first.
- The chat agent submits through the same `submit` service as the form, so validation, limits and payments are identical.
- Credits: each call debits `usage_monthly.ai_credits` by a model-weighted cost.
- Workspace setting "Disable AI" removes all AI endpoints for that workspace.

## 3.14 Multi-tenancy, plans and metering

- Tenant = workspace. `req.ws` is resolved from session + `mf_ws` cookie or API key + `X-Workspace` header (existing behaviour).
- Plans defined in `shared/plans.js`; enforcement helper `assertWithinLimit(ws, metric, increment)` returns HTTP 402 `{ error, upgrade: true, limit, used }`.
- Counters updated atomically (`INSERT ... ON CONFLICT DO UPDATE`), monthly rows keyed by month start (existing pattern).

## 3.15 Deployment and environments

| Env | Purpose | Data |
|---|---|---|
| local | Developer machines; SQLite or Docker Postgres + Redis | Seed data |
| staging | Pre-release; gateway test mode | Synthetic |
| production | ap-south-1 (Mumbai), 2 AZs | Real |

- Containers: `api`, `worker`, `runtime` (static on CDN), `clamav`.
- Postgres: managed (RDS/Aurora) with Multi-AZ, PITR 14 days.
- Zero-downtime deploys: expand/contract migrations; blue-green API.
- Configuration via environment variables (see README §5.4); secrets from a secret manager.

## 3.16 Testing strategy

| Level | Scope | Tooling |
|---|---|---|
| Unit | `shared/` engine: every field type, operator, action, formula function | `node --test` (existing) |
| Integration | Every API route against a real Postgres + Redis in Docker | node test runner + supertest |
| Contract | OpenAPI spec vs implementation | schemathesis or dredd |
| Payments | Razorpay/Stripe test mode end-to-end; webhook replay and signature tests | |
| E2E | Build → publish → submit → pay → inbox → export | Playwright, including mobile viewport |
| Load | Submit endpoint 200 rps for 10 min | k6 |
| Security | Tenant isolation tests, SSRF tests, dependency scan, annual pentest | |
| Accessibility | axe-core on runtime and builder in CI | |

## 3.17 Architecture decision records (summary)

| ADR | Decision | Status |
|---|---|---|
| ADR-001 | Keep React SPA + Express; no framework rewrite | Accepted |
| ADR-002 | Move to PostgreSQL with JSONB submission data | Proposed (R1) |
| ADR-003 | BullMQ on Redis for background jobs | Proposed (R1) |
| ADR-004 | Separate public form domain | Proposed (R1) |
| ADR-005 | Gateway adapter interface; Razorpay first | Proposed (R1) |
| ADR-006 | Stamp submissions with `form_version_id`; publish creates an immutable version | Proposed (R1) |
| ADR-007 | Do not fork AGPL form builders (Formbricks, OpnForm, HeyForm); MIT renderers (SurveyJS, Form.io) only as references | Accepted |
| ADR-008 | AI changes are proposals with diff, never silent overwrites | Accepted |

---

# Part 4 — API Reference

This documents the **current** API (status Built) and the **planned** additions (marked Planned). The current API is used by the builder SPA and by integrators with API keys. From R2, a frozen, versioned copy is served under `/api/v1` and described by an OpenAPI 3.1 file at `docs/openapi.yaml`.

## 4.1 Conventions

| Item | Rule |
|---|---|
| Base URL | `https://<host>/api` (local: `http://localhost:4000/api`) |
| Format | JSON request and response bodies (`Content-Type: application/json`), UTF-8 |
| IDs | Form IDs are 14-char base36 strings. Submission IDs are integers today; ULID `public_id` strings from R1. |
| Timestamps | ISO 8601 / SQLite `YYYY-MM-DD HH:MM:SS` UTC today; ISO 8601 with `Z` from R1 |
| Pagination | `limit` (default 50, max 500) and `offset`; responses include `total` |
| Unlimited values | Plan limits serialise `Infinity` as `null` |

## 4.2 Authentication

| Method | How | Used by |
|---|---|---|
| Session cookie | `mf_session` HttpOnly cookie set by `/auth/login` or `/auth/register` | Builder SPA |
| API key | Header `APIKEY: <key>` (the `?apiKey=` query parameter also works but is deprecated) | Scripts, integrations |
| Workspace selection | Cookie `mf_ws` (SPA) or header `X-Workspace: <ownerId>` (API key). Defaults to the caller's own workspace. | Teams |
| OAuth 2.0 (Planned R2) | Authorization code + PKCE; `Authorization: Bearer <token>`; scopes `forms:read`, `forms:write`, `submissions:read`, `submissions:write`, `webhooks:write`, `sign:write` | Third-party apps |

**Roles.** Write requests (POST/PUT/PATCH/DELETE) need at least `editor` in the selected workspace; team management needs `admin`. GET requests are allowed for `viewer`.

## 4.3 Errors

All errors return JSON `{ "error": "<message>" }`, with extra fields where noted.

| Status | Meaning | Extra fields |
|---|---|---|
| 400 | Invalid request | |
| 401 | Not signed in / bad API key | |
| 402 | Plan limit reached | `upgrade: true` |
| 403 | Role too low, form closed, wrong password, invalid approval link | |
| 404 | Not found (also returned for other tenants' resources) | |
| 409 | Conflict: duplicate submission, slot already booked | `errors` (per field) |
| 413 / 415 | Upload too large / wrong file type | |
| 422 | Validation failed | `errors: { fieldId: message }` |
| 429 | Rate limited (Planned R1) | `Retry-After` header |
| 502 / 503 | Payment or AI provider failure / AI not configured | |

## 4.4 Rate limits (Planned R1)

Per workspace, per day: Free 1,000 · Starter 10,000 · Pro 50,000 · Business 100,000 · Enterprise custom. Responses carry `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

## 4.5 Account, workspace and team

| Method | Path | Body / query | Response |
|---|---|---|---|
| POST | `/auth/register` | `{ name, email, password }` (password ≥ 8 chars) | Sets session; `{ ok: true }` · 409 if email exists. Pending team invites for the email are accepted. |
| POST | `/auth/login` | `{ email, password }` | Sets session; `{ ok: true }` · 401 on bad credentials |
| POST | `/auth/logout` | — | `{ ok: true }` |
| GET | `/me` | — | `{ user, workspace, workspaces, plan, ownPlan, usage, plans, stripe, email, ai }` (`email`/`ai`/`stripe` say whether those services are configured) |
| PATCH | `/me` | `{ name?, password?, currentPassword? }` | `{ ok: true }` · 400 if current password wrong |
| POST | `/me/plan` | `{ plan }` — changes plan immediately with no payment (self-hosted only; must be removed or admin-only before a public launch, see SDD G16) | `{ ok: true }` |
| DELETE | `/me` | — | Deletes account and data |
| POST | `/workspace` | `{ id }` | Switches workspace (sets `mf_ws`) |
| GET | `/team` | — | Members and pending invites |
| POST | `/team/invite` | `{ email, role }` (admin) | Invite created |
| PATCH | `/team/members/:uid` | `{ role }` (admin) | `{ ok: true }` |
| DELETE | `/team/members/:uid` | — | Remove member (or leave) |
| DELETE | `/team/invites/:token` | — (admin) | Cancel invite |
| GET | `/keys` | — | `[{ key, label, created_at }]` — the caller's keys (keys belong to a user, not a workspace; full keys are returned today, see SDD G7) |
| POST | `/keys` | `{ label? }` | `{ key }` (40 hex chars) |
| DELETE | `/keys/:key` | — | Revoke |
| GET | `/outbox` | — | Recent emails with status |

## 4.6 Forms

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/templates` | — | `[{ id, name, category, description, fieldCount, layout, primary }]` |
| GET | `/forms` | `status=active|favorites|trashed`, `q`, `folder` | `{ forms: [{ id, title, status, folder, favorite, views, submissions, unread, last_submission, created_at, updated_at }], folders: [] }` |
| POST | `/forms` | `{ title? }` blank, `{ templateId }`, or `{ definition }` (import); optional `folder` | `{ id }` · 402 if form limit reached |
| GET | `/forms/:id` | — | `{ id, title, status, folder, favorite, views, definition, created_at, updated_at }` |
| PUT | `/forms/:id` | `{ definition, versionLabel? }` | `{ ok, updated_at }` · 402 if too many fields |
| PATCH | `/forms/:id` | `{ status?: enabled|disabled|trashed, favorite?, folder?, title? }` | `{ ok: true }` |
| DELETE | `/forms/:id` | — | Permanent delete (trash with PATCH) |
| POST | `/forms/:id/clone` | — | `{ id }` |
| GET | `/forms/:id/versions` | — | `[{ id, label, author, created_at, title, fieldCount, ruleCount }]` (max 100 kept) |
| GET | `/forms/:id/versions/:vid` | — | Version with `definition` |
| POST | `/forms/:id/versions/:vid/restore` | — | Snapshots current, restores version |
| GET | `/forms/:id/webhooks` | — | Last 50 webhook deliveries |

**Example — create from template and add a field**

```bash
curl -X POST http://localhost:4000/api/forms \
  -H "APIKEY: $KEY" -H "Content-Type: application/json" \
  -d '{"templateId":"contact"}'
# → {"id":"mhx2k9a1b3c4d5"}
```

The form definition format is described in SDD §3.5.

## 4.7 Submissions

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/forms/:id/submissions` | `q`, `status=new|read`, `starred=1`, `approval=pending|approved|rejected`, `from`, `to` (YYYY-MM-DD), `sort=asc|desc`, `limit`, `offset` | `{ total, submissions: [Submission] }` |
| GET | `/forms/:id/submissions.csv` | same filters | CSV file (UTF-8 BOM) |
| GET | `/forms/:id/report` | — | Aggregates: counts over time, views, conversion, revenue, per-field stats |
| GET | `/submissions/:sid` | — | Submission (marks it read) |
| PATCH | `/submissions/:sid` | `{ status?, starred?, data? }` (`data` is merged) | `{ ok: true }` |
| GET | `/submissions/:sid/pdf` | `download=1` for attachment | PDF |
| POST | `/submissions/:sid/decision` | `{ decision: approved|rejected|pending, note? }` | `{ ok: true }`; notifies owner and respondent |
| POST | `/submissions/bulk` | `{ ids: [], action: delete|read|new|star|unstar }` | `{ ok: true }` |
| DELETE | `/submissions/:sid` | — | `{ ok: true }` |
| GET | `/files/:fid` | `download=1` | File stream |

**Submission object**

```json
{
  "id": 1042,
  "form_id": "mhx2k9a1b3c4d5",
  "data": { "name": { "first": "Asha", "last": "Rao" }, "email": "asha@example.com", "topic": "Sales" },
  "status": "new",
  "starred": false,
  "approval": null,
  "approval_note": null,
  "payment": { "status": "paid", "amount": 1499, "currency": "INR", "provider": "razorpay", "ref": "pay_N1x..." },
  "signed": false,
  "ip": "203.0.113.7",
  "created_at": "2026-11-03 10:15:22",
  "updated_at": "2026-11-03 10:15:22"
}
```

Planned R1 additions to the object: `public_id`, `form_version_id`, `source`, `language`.

## 4.8 Public form runtime (no auth)

| Method | Path | Body / query | Response |
|---|---|---|---|
| GET | `/public/forms/:id` | `password?` (moves to POST in R1), `preview=1` (no view count) | `{ id, title, closed, definition, branding, stripe }` or `{ passwordRequired: true }` |
| POST | `/public/forms/:id/upload` | multipart: `file`, `field` | `{ id, name, size, mime }` · 413/415/402 |
| GET | `/public/forms/:id/booked` | `date=YYYY-MM-DD` | `{ fieldId: ["09:00", ...] }` |
| POST | `/public/forms/:id/draft` | `{ token?, values }` | `{ token, url }` |
| GET | `/public/drafts/:token` | — | `{ formId, values }` |
| POST | `/public/forms/:id/submit` | `{ values, password?, draftToken? }` | `{ id, thankYou, redirect, checkoutUrl? }` · 422/409/403/402 |
| GET | `/public/payment/return` | `sub`, `session_id` (Stripe) | Redirect to `/f/:id?done=:sid` |
| GET | `/public/approval/:sid/:email/:token` | — | Form summary and submission for the approver |
| POST | `/public/approval/:sid/:email/:token` | `{ decision: approved|rejected, note? }` | `{ ok: true }` |
| POST | `/public/forms/:id/agent` | `{ history, answers, errors, password? }` | Agent turn: next message, extracted answers, `chatFieldIds`, `needsForm` |

**Submit example**

```bash
curl -X POST http://localhost:4000/api/public/forms/mhx2k9a1b3c4d5/submit \
  -H "Content-Type: application/json" \
  -d '{"values":{"name":{"first":"Asha","last":"Rao"},"email":"asha@example.com","topic":"Sales","msg":"Hi"}}'
# → {"id":1042,"thankYou":"Thank you! Your submission has been received.","redirect":""}
```

**Validation error example (422)**

```json
{ "error": "Please fix the highlighted fields.", "errors": { "email": "Enter a valid e-mail address." } }
```

**Planned (R1) — Razorpay**

| Method | Path | Purpose |
|---|---|---|
| POST | `/public/forms/:id/submit` | Response includes `checkout: { provider: "razorpay", key_id, order_id, amount, currency, prefill }` instead of `checkoutUrl` |
| POST | `/public/payments/razorpay/verify` | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` → `{ status }` |
| POST | `/gateways/razorpay/webhook` | Razorpay → us; verifies `X-Razorpay-Signature`; idempotent |

## 4.9 E-sign documents

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/sign/docs` | — | Documents with status and signer progress |
| POST | `/sign/docs` | multipart: `file` (PDF), `title` | Document |
| GET | `/sign/docs/:id` | — | Document with fields and signers |
| GET | `/sign/docs/:id/pdf` | — | Original or signed PDF |
| PUT | `/sign/docs/:id` | `{ title, message, fields: [{ id, type, page, signer, x, y, w, h, required, label }], signers: [{ name, email }] }` (max 10 signers; drafts only, else 409) | `{ ok: true }` |
| POST | `/sign/docs/:id/send` | — | Emails signing links in order |
| POST | `/sign/docs/:id/void` | — | Voids the document |
| DELETE | `/sign/docs/:id` | — | Deletes |
| GET | `/public/sign/:token` | — | Signer view of the document |
| GET | `/public/sign/:token/pdf` | — | PDF for signing |
| POST | `/public/sign/:token` | `{ values, consent: true }` | Records signature; finalises with audit certificate when all signers are done |

## 4.10 Apps and stores

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/apps` | — | Apps and stores |
| POST | `/apps` | `{ kind: app|store, title }` | `{ id }` |
| GET | `/apps/:id` | — | App with definition |
| PUT | `/apps/:id` | `{ title, definition }` | `{ ok }` |
| DELETE | `/apps/:id` | — | `{ ok }` |
| GET | `/apps/:id/orders` | — | Orders |
| PATCH | `/orders/:oid` | `{ status: new|fulfilled|cancelled }` | `{ ok }` |
| GET | `/public/apps/:id` | — | Public app/store |
| POST | `/public/apps/:id/order` | `{ items, customer }` | Order + checkout URL (Stripe) or paid (test) |
| GET | `/public/apps/:id/order-return` | Stripe return | Redirect |

## 4.11 AI

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/ai/form` | `{ prompt }` (5–4,000 chars) | `{ definition }` (not saved; the client creates the form) |
| POST | `/ai/translate` | `{ formId, language, definition? }` | `{ strings }` keyed by element path |
| POST | `/ai/forms/:id/propose` (Planned R1) | `{ instruction }` | `{ proposed, diff }` — applied only after user acceptance |
| POST | `/ai/forms/:id/insights` (Planned R2) | `{ question? }` | Summary of responses |

Returns 503 if `ANTHROPIC_API_KEY` is not configured.

## 4.12 Webhooks (outgoing)

Configured per form (today: `settings.webhooks` array of URLs; R1: webhooks API with secrets).

**Event: `submission.created`** (current payload)

```json
{
  "event": "submission.created",
  "formId": "mhx2k9a1b3c4d5",
  "formTitle": "Contact Us",
  "submissionId": 1042,
  "createdAt": "2026-11-03 10:15:22",
  "data": { "email": "asha@example.com", "topic": "Sales" },
  "payment": null
}
```

For paid forms the event fires after the payment is confirmed.

**Planned (R1)**
- Events: `submission.created`, `submission.updated`, `submission.deleted`, `payment.paid`, `payment.refunded`, `approval.decided`, `sign.completed`.
- Headers: `X-WpForms-Event`, `X-WpForms-Delivery`, `X-WpForms-Timestamp`, `X-WpForms-Signature: v1=<hex>`.
- Verification (Node.js):

```js
import crypto from 'node:crypto';
function verify(rawBody, headers, secret) {
  const ts = headers['x-wpforms-timestamp'];
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = 'v1=' + crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
  const got = headers['x-wpforms-signature'] || '';
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
```

- Retries: 8 attempts over 24 hours with exponential backoff on non-2xx or timeout (10 s). Delivery log and manual replay in the UI.

**Webhook management API (Planned R1)**

| Method | Path | Body |
|---|---|---|
| GET | `/forms/:id/hooks` | — |
| POST | `/forms/:id/hooks` | `{ url, events[] }` → returns `secret` once |
| DELETE | `/hooks/:hid` | — |
| POST | `/hooks/:hid/deliveries/:did/replay` | — |

## 4.13 Embedding

| Method | Code |
|---|---|
| Link | `https://<host>/f/<formId>` |
| iframe | `<iframe src="https://<host>/embed/<formId>" style="width:100%;border:0" height="800" title="Form"></iframe>` |
| Script (auto-resize) | Generated on the Publish tab; inserts the iframe and listens for height `postMessage` events |
| Popup | Button that opens the form in a modal iframe (Publish tab) |
| Prefill | Append `?<fieldId>=<value>`; language `?lang=hi` |

## 4.14 Planned developer surface (R2)

- `/api/v1` frozen versioned API with OAuth 2.0 and the same resources as above.
- `@wpforms/sdk` TypeScript client generated from OpenAPI.
- MCP server exposing tools: `list_forms`, `get_form`, `create_form`, `update_form`, `list_submissions`, `get_submission`, `create_sign_document`.
- Plain-HTML endpoint: `<form action="https://<host>/api/public/forms/<id>/html" method="post">` with redirect on success.
- Widget SDK: iframe widget pages using `postMessage` (`ready`, `setValue`, `resize`, `validate`, `submit`), reviewed before public listing.

---

# Part 5 — README

> Proposed replacement for the repository `README.md`. Keep it short; link to this specification for detail.

## 5.1 WpForms

Online forms for India: drag-and-drop and AI form builder with conditional logic, UPI/card payments, e-signatures, approvals, an inbox, reports, webhooks and an API.

## 5.2 Quick start

Requirements: Node.js 22.5+ (uses the built-in `node:sqlite`), npm.

```bash
npm run setup      # install server and client dependencies
cp .env.example .env
npm run dev        # API on http://localhost:4000, UI on http://localhost:5173
```

Production build:

```bash
npm run build      # builds client/dist
npm start          # serves API + built client on http://localhost:4000
```

Tests:

```bash
npm test
```

## 5.3 Project structure

```
client/            React + Vite builder and public form UI
  src/pages/       Workspace, Builder, LogicEditor, SettingsPanel, Publish, Inbox, Reports, Versions, Sign, Apps, Account
  src/components/  FormRenderer, Fields, ChatAgent, AppView, PdfPages
server/
  index.js         Express app, route mounting, static client
  db.js            SQLite schema, usage counters
  auth.js          sessions, API keys, workspaces, roles
  routes/          account, forms, submissions, public, sign, apps, ai
  notify.js        emails, approvals, webhooks, Slack/Discord/Sheets
  payments.js      Stripe Checkout or simulated test gateway
  pdf.js           submission PDFs and signed documents
  ai.js            Claude-powered form generation, translation, chat agent
  templates.js     starter templates
  test/            node:test suites
shared/            code used by both client and server
  fields.js        field catalog and formatting
  logic.js         conditional logic, pages, validation
  formula.js       safe formula engine
  i18n.js          translations
  plans.js         plan limits
data/              SQLite database and uploads (git-ignored)
docs/              this specification
```

## 5.4 Configuration

| Variable | Required | Purpose |
|---|---|---|
| `PORT` | No (4000) | HTTP port |
| `SESSION_SECRET` | **Yes in production** | Signs session cookies and approval links |
| `BASE_URL` | Yes | Public URL used in emails, QR codes, signing links, payment redirects |
| `DATA_DIR`, `DB_FILE` | No | Where the SQLite database and uploads live |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | No | Real email delivery (otherwise emails are only stored in the Outbox) |
| `STRIPE_SECRET_KEY` | No | Card payments via Stripe Checkout (otherwise a simulated test gateway) |
| `ANTHROPIC_API_KEY`, `AI_MODEL` | No | AI form builder, translation, chat agent |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | Planned R1 | UPI and Indian payments |
| `DATABASE_URL`, `REDIS_URL`, `S3_*` | Planned R1 | Postgres, Redis queue, object storage |

## 5.5 Features

Workspace (folders, favorites, trash, clone), 30 field types, Classic and Card layouts, conditional logic (all/any, show/hide, require, calculate, skip, thank-you, redirect), safe formulas, design and custom CSS, form settings (close date, cap, password, save & continue, one per user), owner and respondent emails with PDF attachments, Stripe payments, approvals, inbox and table with CSV export, reports, link/QR/embed publishing, Slack/Discord/Sheets/webhooks, REST API with keys, PDF documents, e-sign documents with audit certificate, AI form generation, translation and chat agent, multilingual forms, version history, apps and stores, team workspaces, plan limits.

## 5.6 Development guidelines

- Put logic that must behave the same in the browser and on the server in `shared/`, and test it there.
- Every route that touches tenant data must filter by `req.ws.id`.
- Never trust client totals, visibility or validation; recompute on the server.
- Add a test in `server/test/` for every new endpoint or bug fix.
- Keep comments short and explain *why*, matching the existing style.
- Commit messages: imperative mood, one change per commit.

## 5.7 Code comment conventions

- One-line comment above non-obvious functions explaining purpose or a constraint (e.g. `// Autosave fires often; keep at most one snapshot per 5 minutes unless the save is labelled.`).
- Document status enums inline in schema definitions (e.g. `status TEXT -- enabled | disabled | trashed`).
- No commented-out code; no TODOs without an issue link.

---

# Appendices

## A. Jotform parity matrix (form features)

| Jotform feature | WpForms status | Plan |
|---|---|---|
| ~30 native fields | Built (30) | Add section, repeating group, fill-in-blank, unique ID (R2) |
| ~700 widgets | Not built | Widget SDK (R2); India-specific fields (R2) |
| Classic + Card layouts | Built | — |
| 6 logic action types | Built: show/hide, require, calculate, skip, thank-you (+ redirect) | Change email recipient, enable/disable, mask (R2) |
| Calculations | Built | Date and text functions (R2) |
| Form Designer, themes, CSS | Built (no theme gallery) | Themes (R2) |
| Form limits, password, unique submission, save & continue | Built | Hash passwords, cookie-based uniqueness (R1) |
| Multilingual forms | Built, with AI translation | Indian languages default (R2) |
| Accessibility checker | Not built | R2 |
| Embeds: link, JS, iframe, popup, QR | Built | Lightbox, feedback button, WordPress plugin (R2) |
| Email invites, assign forms | Not built | R3 |
| Inbox, tables, CSV/Excel/PDF export | Built (CSV, PDF) | Excel, ZIP, comments (R2–R3) |
| Notifications, autoresponders | Built | Queue + retries (R1), WhatsApp (R1) |
| PDF Editor | Partial (designed PDF) | Drag-and-drop editor (R3) |
| ~40 payment gateways | Stripe + test | Razorpay (R1), Cashfree, PayPal (R2) |
| Analytics | Built (views, conversion, field charts) | Drop-off, sources, devices (R2) |
| 20,000 templates | ~handful | 200 curated (R1) |
| AI form creation | Built | Diff-based AI edits (R1), PDF/image import (R2) |
| Revision history | Built | Version-stamped submissions (R1) |
| Teams | Built (Enterprise-gated) | Seats on paid plans (R1) |
| Approvals / Workflows | Approvals built | Workflow canvas (R3) |
| Sign | Built | Reminders (R1), Aadhaar eSign research (R3) |
| Apps, Store Builder | Built | Razorpay in stores (R1) |
| 200+ integrations | Slack, Discord, Sheets, webhooks | Zapier/Make/n8n + OAuth integrations (R2) |
| REST API, SDKs | API with keys | OAuth, OpenAPI, TS SDK, MCP (R2) |
| HIPAA, SOC 2, SSO | Not built | SSO, audit log, SOC 2 (R3) |

## B. Glossary

| Term | Meaning |
|---|---|
| BSP | WhatsApp Business Solution Provider |
| DPDP Act | India's Digital Personal Data Protection Act, 2023 |
| GST / GSTIN | Goods and Services Tax / GST identification number |
| PITR | Point-in-time recovery |
| PWA | Progressive web app (installable website) |
| UPI Intent / QR | UPI payment by handing off to a UPI app on the phone, or by scanning a QR code |
| ULID | Sortable, non-guessable unique ID |

## C. Open questions

1. Final product name (trademark search pending; see R-1).
2. Pricing levels in INR, and whether the free plan charges a payment platform fee.
3. Razorpay integration model: merchant's own keys (R1) vs Razorpay Partner/Route onboarding.
4. DPDP Act obligations as a data processor for form owners — legal review.
5. Self-hosted edition licensing and support model.
6. Which WhatsApp BSP to use, and who pays per-message costs.
7. Whether to support HIPAA at all (only if US healthcare demand appears).
