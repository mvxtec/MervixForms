# Jotform Payments, Integrations, Developer API/SDKs and GitHub Open Source

Research date: 2026-11-03. Sources are mostly Jotform's own pages (marketing/help docs), the public GitHub REST API (unauthenticated `api.github.com/orgs/jotform/repos`, fetched 2026-11-03), and job boards. Jotform's own pages give inconsistent counts. Those conflicts are flagged below rather than resolved.

## 1. Payment gateways, payment types, fees, PCI

### Takeaway
Jotform integrates natively with about 33 to 40+ payment gateways. Its own pages give different counts: 30+, 40+, 33 named in a help article, and 40 in the integrations directory's "Payment Processor" category. It charges no transaction fee of its own; only the gateway's fees apply. It supports products (with options, stock, coupons, tax and shipping), subscriptions, donations and user-defined amounts. It claims PCI DSS Service Provider Level 1 compliance.

### Cited Findings
- A help article lists **33 gateways/payment options**: 2CheckOut, Afterpay, Apple Pay & Google Pay, Authorize.Net, BluePay, BlueSnap, Braintree, Cash App Pay, CardPointe (CardConnect), Chargify, Clearpay, CyberSource, eCheck.Net, Eway, GoCardless, iyzico, Mollie, Moneris, PayFast, PayJunction, Paymentwall, PayPal, Paysafe, PayU, PayU India, Purchase Order, SensePass, Skrill, Square, Stripe, Stripe Checkout, Venmo, WorldPay UK — [Jotform Help: Mastering Payment Form Integrations](https://www.jotform.com/help/323-mastering-payment-form-integrations-with-jotform/)
  - Not all 33 are separate gateways. Apple/Google Pay, Venmo and Cash App Pay run through other processors, and "Purchase Order" is an offline method.
  - Search snippets suggest the article may be old (~2,300 days), although it names newer methods such as Cash App Pay. It may not be the current master list.
- The integrations directory shows a "Payment Processor" category with **40** entries — [jotform.com/integrations](https://www.jotform.com/integrations/)
- The security page also names **Worldpay US**, **PayJunction** and **PayPal Payments Pro** as gateways where card data passes through Jotform's PCI servers. Worldpay US and PayPal Payments Pro are not in the 33-item list — [jotform.com/security](https://www.jotform.com/security/)
- Count conflict on one page: the payments feature page says "30+ popular payment gateways" in the intro, "40+ payment gateway integrations" in the subscriptions section, and "14 secure payment gateways" for recurring donations. It also says 9 gateways support authorization — [jotform.com/features/payments](https://www.jotform.com/features/payments)
- No Jotform fee: "Jotform will never charge you extra transaction fees" — [Payment Gateways Comparison Chart](https://www.jotform.com/online-payments/compare/). The feature page says payments are processed "without any additional transaction fees" — [features/payments](https://www.jotform.com/features/payments)
- A landing page claims "Integrate Your Forms with 40+ Payment Processors" and names Square, Stripe, PayPal (Standard, Personal), Authorize.net (incl. eCheck.Net) and Braintree — [Jotform landing 1371](https://www.jotform.com/landings/display/1371?activeDirectory=1)
- Payment types: Sell Products, Sell Subscriptions, User Defined Amount, Collect Donations — [Help 323](https://www.jotform.com/help/323-mastering-payment-form-integrations-with-jotform/)
  - Product prices can be tied to options or calculation values.
  - Stock quantities support "Sold Out" states and low-stock email alerts.
  - Coupons, taxes and shipping are optional settings in the payment integration.
- Authorization-only (two-step) payments work with PayPal, Square, Stripe, Authorize.Net, Braintree, CyberSource and Eway, among others — [Help 323](https://www.jotform.com/help/323-mastering-payment-form-integrations-with-jotform/)
- Other payment features — [features/payments](https://www.jotform.com/features/payments):
  - ACH/eCheck
  - Buy Now Pay Later (PayPal Pay in 4, Afterpay via Square)
  - Custom subscription periods
  - Recurring donations
  - Coupons/promo codes
  - Sandbox/test mode
  - Payments inside Jotform Workflows
- Jotform Store Builder advertises "23+ payment gateways" — [Jotform blog](https://www.jotform.com/blog/payment-gateways-in-jotform-store-builder/)
- PCI: Jotform claims it is "PCI DSS Service Provider Level 1 compliant" — [jotform.com/security](https://www.jotform.com/security/)
  - Approved Scanning Vendors run quarterly PCI scans.
  - For PayPal Payments Pro, Authorize.net, Worldpay US and PayJunction, card data is processed on PCI servers but not stored.
  - The other gateways use the processor's own hosted fields or checkout.

### Inferences
- "40+" is probably the current marketing count (the directory category also shows 40). The 33-item help list is a good named baseline that may be missing newer additions such as Worldpay US and PayPal Payments Pro. A safe claim is "~40 payment integrations".
- The no-fee model sets Jotform apart from competitors that take a platform fee on payments (for example, some form/store builders). Plan limits on payment submissions are covered under pricing (see gaps).

### Gaps
- No single, current, authoritative list of all 40 gateways was retrievable. The comparison chart page renders its table client-side, so its rows were empty when fetched.
- Clover was not found as a supported gateway.
- Per-plan limits on payment submissions were not verified here.

## 2. Integrations catalog

### Takeaway
Jotform markets "200+ integrations" (some pages say 150+). However, the directory's category counts add up to much more than 200 listings, because entries overlap across categories and probably include partner/third-party listings. The heaviest categories are CRM, Communication, Data Management and Emailing.

### Cited Findings
- Headline claim: "See 200+ integrations" — [jotform.com/integrations](https://www.jotform.com/integrations/)
- Directory category counts — [jotform.com/integrations](https://www.jotform.com/integrations/):

  | Category | Count |
  |---|---|
  | CRM | 186 |
  | Communication | 103 |
  | Data Management | 77 |
  | Emailing | 61 |
  | Project Management | 59 |
  | Automation | 56 |
  | Marketing & Sales | 54 |
  | E-commerce | 49 |
  | CMS | 45 |
  | Payment Processor | 40 |
  | Other | 40 |
  | Analytics & Reporting | 30 |
  | Scheduling & Booking | 27 |
  | EHR & Healthcare | 24 |
  | File Sharing & Storage | 24 |
  | Blogging | 12 |
  | Social Media | 11 |
  | E-Signature | 8 |
  | SSO | 4 |
  | Wrapper/Library/SDK | 4 |
  | GEO & Mapping | 3 |

- Featured and popular cards on the page — [jotform.com/integrations](https://www.jotform.com/integrations/):
  - Featured: Microsoft Excel, **Claude**, Square
  - Other cards: Google Sheets, PayPal, Google Drive, Mailchimp, Dropbox, Stripe, Authorize.Net, HubSpot, Google Calendar, Slack, Trello, OneDrive, Salesforce, ActiveCampaign, Airtable, Zoom, Asana, Keap, monday.com, Pipedrive, Zoho CRM, Constant Contact, Box, WorldPay UK
- Salesforce: Jotform launched a Salesforce AppExchange app in 2023 — [jotform.com/about](https://www.jotform.com/about/)
- Webhooks are a first-class API resource: `GET/POST /form/{id}/webhooks` and `DELETE /form/{id}/webhooks/{webhookID}` — [api.jotform.com/docs](https://api.jotform.com/docs/); [jotform-api-python source](https://github.com/jotform/jotform-api-python)
- Zapier, Make and Pipedream all offer Jotform connectors to thousands of downstream apps. Examples: Jotform to MySQL on [Make](https://www.make.com/en/integrations/jotform/mysql) and Jotform to Redis/MySQL on [Pipedream](https://pipedream.com/apps/mysql/integrations/jotform)

### Inferences
- The category sums exceed 200 by a wide margin. The directory likely counts one integration in several categories and includes 3rd-party-built connectors (for example, Zapier-powered or partner listings). "200+ native integrations" is a reasonable public figure.
- Featuring "Claude" as an integration matches Jotform's 2025–2026 AI push (see the MCP server below).

### Gaps
- I could not separate first-party native integrations from partner or iPaaS-routed listings. No official breakdown was found.
- No official Zapier or Make app statistics (number of triggers/actions) were collected.

## 3. REST API (api.jotform.com)

### Takeaway
Jotform has a mature, key-authenticated REST API (v1). It covers User, Form, Question, Properties, Submission, Report, Folder, Webhook and System resources. Daily rate limits are tied to plan, from 1,000/day on Starter to unlimited on Enterprise. There are separate EU and HIPAA base URLs.

### Cited Findings
- Base URLs — [api.jotform.com/docs](https://api.jotform.com/docs/):
  - `https://api.jotform.com` (standard)
  - `https://eu-api.jotform.com` (EU)
  - `https://hipaa-api.jotform.com` (HIPAA)
  - Enterprise can use a custom domain.
- Authentication — [api.jotform.com/docs](https://api.jotform.com/docs/):
  - API key passed as an `apiKey` query parameter or an `APIKEY` HTTP header.
  - The JS SDK can obtain a key through `JF.login()` / `JF.getAPIKey()`.
- Daily rate limits — [api.jotform.com/docs](https://api.jotform.com/docs/):

  | Plan | Requests/day |
  |---|---|
  | Starter (free) | 1,000 |
  | Bronze | 10,000 |
  | Silver | 50,000 |
  | Gold | 100,000 |
  | Enterprise | Unlimited |

  Limits can be raised by contacting Jotform.
- Endpoints, as implemented in the official Python client — [jotform-api-python/jotform.py](https://github.com/jotform/jotform-api-python):
  - **User:** `GET /user`, `GET /user/usage`, `GET /user/forms`, `POST`/`PUT /user/forms`, `GET /user/submissions`, `GET /user/subusers`, `GET /user/folders`, `GET /user/reports`, `GET`/`POST /user/settings`, `GET /user/history`, `POST /user/register`, `POST /user/login`, `GET /user/logout`
  - **Form:** `GET`/`DELETE /form/{id}`, `POST /form/{id}/clone`, `GET /form/{id}/files`
  - **Questions:** `GET`/`POST`/`PUT /form/{id}/questions`, `GET`/`POST`/`DELETE /form/{id}/question/{qid}`
  - **Properties:** `GET`/`POST`/`PUT /form/{id}/properties`, `GET /form/{id}/properties/{key}`
  - **Submissions:** `GET`/`POST`/`PUT /form/{id}/submissions`, `GET`/`POST`/`DELETE /submission/{sid}`
  - **Reports:** `GET`/`POST /form/{id}/reports`, `GET`/`DELETE /report/{id}`
  - **Webhooks:** `GET`/`POST /form/{id}/webhooks`, `DELETE /form/{id}/webhooks/{whid}`
  - **Folders:** `POST /folder`, `GET`/`PUT`/`DELETE /folder/{id}`
  - **System:** `GET /system/plan/{planName}`
- An old Swagger spec repo exists ("Swagger Specifications for the JotForm API", last push 2016-05-18) — [github.com/jotform/jotform-api-swagger](https://github.com/jotform/jotform-api-swagger)
- The developer page describes a "RESTful API" for accessing accounts, forms and submissions and for creating and editing forms — [jotform.com/developers](https://www.jotform.com/developers/)

### Inferences
- The API covers form CRUD, submission CRUD and webhooks, but it predates GraphQL- or OAuth-app-style designs. Auth is by API key, not OAuth, for 3rd-party apps. The new MCP server does sign-in through the Jotform account (see section 6).
- At 1,000 calls/day, the free plan is restrictive for any integration product built on Jotform.

### Gaps
- The live docs page loads its endpoint reference dynamically, so the endpoint list above comes from the official client source, not the docs page itself.
- There are no per-minute or burst limits, and no documented API versioning beyond `/v1`.
- No evidence of newer endpoints (for example, Apps, Sign, Tables or AI Agents) in the public REST docs.

## 4. Official SDKs / client libraries

### Takeaway
There are 11 official client libraries: Android, C#, Go, iOS, Java, JavaScript, Node.js, PHP, Python, Ruby and Scala. Most are thinly maintained. The Node.js SDK (rewritten in TypeScript, npm package `jotform`) is the most recently updated.

### Cited Findings
- 11 languages are listed: Android, C#, Go, iOS, Java, JavaScript, Node.js, PHP, Python, Ruby, Scala — [jotform.com/developers](https://www.jotform.com/developers/); [api.jotform.com/docs](https://api.jotform.com/docs/)
- Node.js SDK: TypeScript, `npm install jotform`, with an API like `new Jotform('KEY'); client.form.createForm(); client.form.addQuestions(...)`. Last push 2025-12-15, 37 stars — [github.com/jotform/jotform-api-nodejs](https://github.com/jotform/jotform-api-nodejs)
- GitHub stats for the other clients (as of 2026-11-03) — [GitHub API orgs/jotform/repos](https://api.github.com/orgs/jotform/repos):

  | Client | Stars | Last push |
  |---|---|---|
  | Python | 56 | 2024-02-23 |
  | PHP | 52 | 2022-02-16 |
  | C# | 10 | 2025-04-17 |
  | Ruby | 9 | 2024-01-30 |
  | Java | 6 | 2024-01-08 |
  | iOS (Objective-C) | 6 | 2019-01-08 |
  | Go | 3 | 2024-07-05 |
  | Scala (Java) | 2 | 2022-02-16 |
  | Android (Java) | 2 | 2021-06-04 |

- The browser JS client is `JotForm.js`, with `JF.initialize`, `JF.login` and `JF.getForms` — [api.jotform.com/docs](https://api.jotform.com/docs/)
- `api-use-cases` (PHP, 28 stars, last push 2025-07-16) contains example API use cases — [github.com/jotform/api-use-cases](https://github.com/jotform/api-use-cases)

### Inferences
- Apart from Node.js, the SDKs look like low-maintenance wrappers. Several have had no commits for 2 to 7 years.

### Gaps
- No download counts (npm/PyPI) were collected.

## 5. GitHub org (github.com/jotform) and what it reveals about the stack

### Takeaway
The org (created 2012-01-13) has 32 public repos and 427 followers. It holds API clients, three WordPress plugins, a React drag-and-drop page builder, a monorepo build tool (Zenith), lint configs, an MCP server and forks of React and React Native libraries. Together these point to a PHP backend with React/TypeScript frontends in a pnpm monorepo, plus React Native mobile apps.

### Cited Findings
All stats are as of 2026-11-03, from [api.github.com/orgs/jotform](https://api.github.com/orgs/jotform) and [its repos list](https://api.github.com/orgs/jotform/repos).

Org: 32 public repos, 427 followers, created 2012-01-13.

| Repo | Lang | Stars | Last push | Notes |
|---|---|---|---|---|
| css.js | JS | 426 | 2021-08-05 | Archived; "lightweight, battle tested, fast CSS parser in JavaScript" |
| before-after.js | JS | 359 | 2023-03-15 | Image comparison slider |
| dnd-builder | JS | 57 | 2026-09-23 | "Jotform – React Page Builder", npm `@jotforminc/dnd-builder`, Storybook, homepage jotform.com/open-source/dnd-builder |
| jotform-api-python | Python | 56 | 2024-02-23 | API client |
| jotform-api-php | PHP | 52 | 2022-02-16 | API client |
| jotform-api-nodejs | TypeScript | 37 | 2025-12-15 | API client (npm `jotform`) |
| mcp-server | – | 29 | 2026-11-03 | MCP server for AI assistants; MIT |
| api-use-cases | PHP | 28 | 2025-07-16 | API examples |
| zenith | TypeScript | 16 | 2026-09-22 | "Lightning-fast javascript monorepo build tool with remote/local caching ability w/ pnpm", npm `@jotforminc/zenith`; caching to local disk, S3-compatible storage or Redis |
| jotform-api-csharp / ruby / java / ios / go / scala / android | various | 2–10 | 2019–2025 | API clients |
| jotform-linter-configs | JS | 3 | 2023-07-11 | Shared ESLint configs |
| wordpress-embed-plugin | JS | 1 | 2026-08-14 | WordPress embed plugin |
| wordpress-feedback-plugin | PHP | 1 | 2026-08-14 | WordPress feedback button plugin |
| wordpress-store-plugin | JS | 1 | 2025-11-24 | WordPress store plugin |
| wordpress-oembed-plugin | PHP | 0 | 2025-11-20 | WordPress oEmbed plugin |
| mobile-patches | – | 0 | 2026-08-18 | Mobile app patches |
| react-native-webview, react-native-sqlite-storage, react-native-relative-popup, react-color, react-bootstrap, react-datepicker, react-zeroclipboard, Chart.js | various | 0–1 | 2015–2026 | Forks |
| jotform-api-swagger | – | 0 | 2016-05-18 | Swagger spec |
| webhook-nodejs-test-app | JS | 2 | 2015-07-25 | Archived webhook sample |

- The Zenith README says it caches to S3-compatible remote storage or Redis, and runs `pnpm zenith --target=<command> --project=<name>` — [github.com/jotform/zenith](https://github.com/jotform/zenith)
- The dnd-builder README describes a "Beautiful and accessible drag and drop page builder with React", published under the `@jotforminc` npm scope — [github.com/jotform/dnd-builder](https://github.com/jotform/dnd-builder)

### Inferences
- Frontend: React and TypeScript in a large pnpm JavaScript monorepo. Zenith was built to cut CI times for that monorepo. Internal packages are published under `@jotforminc`.
- Mobile: the React Native forks (webview, sqlite-storage) and the "mobile-patches" repo suggest the Jotform mobile apps are React Native with offline SQLite storage. That fits the advertised offline/kiosk mode.
- Backend: PHP. The job postings below confirm this, so the open-source repos are a small slice of the stack.
- The core product is closed source. Open-source activity in 2026 centres on the MCP server, dnd-builder, Zenith and WordPress plugins.

### Gaps
- `mcp-server` showed no primary language, and its tool list lives in a separate doc that I did not fetch.
- No contributor counts were collected.

## 6. Embedding and developer features (embed codes, JS SDK, widgets, apps, MCP)

### Takeaway
Developers can:
- Embed forms several ways: JS script, iframe, lightbox, feedback button, and WordPress plugins.
- Build custom form-field widgets through an iframe-based `JFCustomWidget` API, approved into a public widget catalog.
- Use the JS SDK and REST API.
- As of 2026, connect AI assistants through an official hosted MCP server at `mcp.jotform.com`.

### Cited Findings
- Embed options — [Jotform Help 67: Which form embed code should I use](https://www.jotform.com/help/67-which-form-embed-code-should-i-use):
  - JavaScript embed (recommended starting point)
  - iFrame (isolation from site scripts)
  - Feedback Button (floating button opening a modal)
  - Lightbox (button or auto-popup modal)
- Lightbox and feedback embeds accept prefill via URL params or `iframeParameters` — [Help 83](https://www.jotform.com/help/83-adding-parameters-in-lightbox-and-feedback-forms/)
- Custom widget platform — [developers.jotform.com/widgets](https://developers.jotform.com/widgets); [jotform.com/developers/widgets](https://www.jotform.com/developers/widgets/):
  - Build a hosted page and register it as an iFrame widget.
  - Uses the `JFCustomWidget` script from js.jotform.com: `sendData`, `requestFrameResize`, `getWidgetSetting`, `subscribe("ready")`, `subscribe("submit")`, plus a `valid` flag for required fields.
  - A widget is private at first; once submitted and approved, it becomes public to all users.
- Creating and registering a custom widget is free. Widget questions go to the API team at api@jotform.com — [Jotform Answers](https://jotform.com/answers/16048931-is-there-an-advantage-or-incentives-if-we-create-a-custom-widget)
- MCP server — [github.com/jotform/mcp-server](https://github.com/jotform/mcp-server):
  - Endpoint `https://mcp.jotform.com`, MIT license.
  - Covers Forms (create forms, read responses), Jotform Sign (prepare documents for signature) and Jotform Apps (client portals, event apps).
  - Claude plugins: Form Creator, Jotform Sign, Jotform Apps.
  - Also works with Gemini CLI, the ChatGPT app directory, Codex, Cursor and VS Code.
  - Users sign in with their Jotform account.
- A third-party directory describes a hosted Jotform MCP using Streamable HTTP with OAuth, plus a companion Jotform Sign server — [developersdigest.tech](https://www.developersdigest.tech/mcp-servers/jotform-apps)
- Jotform positions itself as an AI-powered form builder. "AI Agents" launched in 2025 and automate tasks across 15 channels. There is a mobile app with offline mode and kiosk mode — [jotform.com/about](https://www.jotform.com/about/)

### Inferences
- The widget platform is iframe/postMessage based, which keeps third-party code sandboxed. That makes it the main surface for extending the form builder.
- The MCP server makes Jotform an "AI-native" integration target. It is the most active developer-facing investment in 2026 (pushed on the day of research).

### Gaps
- I did not get the number of widgets in the catalog (historically "400+" widgets, unverified here).
- No details on a separate "Jotform Apps marketplace" for third-party developers. Jotform Apps appears to be a no-code app builder, not a developer marketplace.
- Webhook payload format and retry behaviour are not documented in the sources fetched.

## 7. Engineering, architecture and scale

### Takeaway
Jotform runs on Google Cloud (primary) with AWS as secondary, in the US (Iowa/Virginia) and EU (Frankfurt). It uses Cloudflare in front. The backend is mainly PHP (with Go/Node), using MySQL, Redis, Nginx and PHP-FPM; the frontend is React. Scale claims: 40M+ users, 50M+ forms and 2B+ submissions. I found no daily submission figure and no official engineering blog.

### Cited Findings
- Infrastructure — [jotform.com/security](https://www.jotform.com/security/):
  - "No in-house servers". Google Cloud is primary (Iowa US, Frankfurt EU) and AWS is secondary (Virginia, Frankfurt).
  - Active-active redundancy on GCP, with hourly replication to AWS and 30-day snapshots.
  - Cloudflare provides DDoS and spam protection; OSSEC provides intrusion detection.
  - TLS 1.2. Optional client-side RSA-2048 form encryption.
  - GDPR, with EU data kept in Frankfurt.
  - HIPAA BAA available.
  - A "dedicated SOC 2 certified environment" is available for Enterprise.
  - Enterprise data residency is "in any part of the world".
- Scale: 40M+ users (passed 35M in 2025), 50M+ forms created (2024), 2B+ submissions, 20K+ templates, 16 languages, founded 2006 by Aytekin Tank — [jotform.com/about](https://www.jotform.com/about/)
- Offices: San Francisco, Sydney, London, Vancouver, Ankara (2), Izmir, Istanbul — [jotform.com/about](https://www.jotform.com/about/)
- Job postings:
  - Senior PHP Developer (Ankara/Istanbul): "Proficiency in PHP (Go and/or NodeJS is a big plus)", with React familiarity and distributed systems experience preferred — [kariyer.net](https://www.kariyer.net/is-ilani/jotform-yazilim-a-s-senior-php-developer-3341649)
  - DevOps Engineer (Izmir): Linux, MySQL, Redis, Nginx, PHP-FPM, cloud platforms, Bash/PHP/Python/Golang, Ansible, Jenkins — [kariyer.net](https://www.kariyer.net/is-ilani/jotform-yazilim-a-s-devops-engineer-3422139)
  - Senior React Developer — [webrazzi](https://webrazzi.com/kariyer/jotform-yazilim-as/senior-react-developer/)
  - Senior Backend Developer (PHP/SaaS) in Vancouver at $110k–$170k CAD — [jobiglo](https://ca.jobiglo.com/emploi-senior-backend-developer-phpsaas-j-69ea5b25a464d386de03335a)
  - Some of these postings may be stale.
- StackShare (user-compiled) lists React, NGINX, Webpack, Node.js, Amazon RDS and PHP for Jotform — [StackShare](https://stackshare.io/mustafaculban/stacks). Low reliability.

### Inferences
- The stack is a classic LAMP-lineage SaaS, modernized: PHP/MySQL/Redis/Nginx on GCP, with React/TypeScript frontends in a pnpm monorepo and React Native mobile apps.
- 2B+ submissions over ~20 years implies, on average, hundreds of thousands to low millions of submissions per day today. That is only a rough inference, not a reported figure.

### Gaps
- No official engineering blog, conference talks or architecture write-ups were found.
- No daily or monthly submission throughput, request volume or headcount figures. Employee count is not stated on the About page.
