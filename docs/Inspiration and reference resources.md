# Inspiration and reference resources

Curated for building WpForms (an India-first Jotform competitor). Every link was checked on 3 Nov 2026; a few sites block automated checks (marked †) but are live in a browser.

**How to use this list:** pick 1–2 sources per category, not all of them. ★ = start here.

---

## 1. Visual inspiration (look and feel)

| Resource | What it's best for | Use it for |
|---|---|---|
| ★ [Mobbin](https://mobbin.com) | Real screenshots and full user flows from shipped apps | Study Typeform, Tally, Notion, Linear, Airtable flows: onboarding, builder, settings, empty states |
| ★ [Refero](https://refero.design) | Searchable library of real web app UI, by pattern | Search "form builder", "table", "settings", "pricing", "inbox" |
| [Page Flows](https://pageflows.com) | Recorded videos of complete user journeys | Onboarding, checkout, upgrade flows |
| [SaaSFrame](https://www.saasframe.io) | SaaS screens grouped by page type | Dashboards, pricing pages, empty states |
| ★ [Dribbble](https://dribbble.com) | Concept UI shots | Mood and visual direction only (many shots aren't buildable) |
| [Awwwards](https://www.awwwards.com) | Award-winning websites | Marketing site, landing page, motion ideas |
| [Godly](https://godly.website) | Hand-picked modern websites with motion | Landing page hero and section ideas |
| [Land-book](https://land-book.com) † | Landing page gallery by category | Marketing pages |
| [Lapa Ninja](https://www.lapa.ninja) † | Landing page gallery | Marketing pages |
| [SaaS Landing Page](https://saaslandingpage.com) | Real SaaS landing pages, by section | Pricing, feature, testimonial sections |
| [Siteinspire](https://www.siteinspire.com) † | Curated, clean web design | Typography and layout |
| [Httpster](https://httpster.net) | Bold, unusual sites | Brand personality |
| [Behance](https://www.behance.net) † | Full case studies with process | Branding and product case studies |
| [Cosmos](https://cosmos.so) | Visual moodboarding tool | Building a shared moodboard for the team |

**Products worth copying the UX of:** [Tally](https://tally.so) (Notion-like editor), [Typeform](https://www.typeform.com) (one-question-per-screen), [Fillout](https://www.fillout.com) (integrations UI), [Jotform](https://www.jotform.com) (breadth, settings depth).

## 2. UI components (ready-to-use code)

| Resource | What it is | Notes |
|---|---|---|
| ★ [21st.dev](https://21st.dev) | Community marketplace of React + Tailwind components, copy or install via CLI | Hero sections, inputs, pricing tables, AI-generated variants |
| ★ [shadcn/ui](https://ui.shadcn.com) | Copy-paste React components on Radix + Tailwind | Best base for the builder app; you own the code |
| [coss.com UI (formerly Origin UI)](https://coss.com/ui) | Large set of shadcn-style inputs, selects, date pickers | Excellent for form field variants |
| [Magic UI](https://magicui.design) | Animated components | Marketing site only |
| [Aceternity UI](https://ui.aceternity.com) | Flashy animated sections | Marketing site only; too heavy for the app |
| [Tailwind Plus](https://tailwindcss.com/plus) | Paid, professionally designed Tailwind blocks | Application UI: tables, forms, settings, navigation |
| [Tremor](https://tremor.so) | Charts and dashboard components | Reports and analytics pages |
| [Mantine](https://mantine.dev) | Full React component library with forms and dates | Alternative if you don't want Tailwind |

## 3. Accessible primitives (behaviour, no styling)

| Resource | Use it for |
|---|---|
| ★ [Radix UI](https://www.radix-ui.com) | Dialogs, popovers, dropdowns, tabs in the builder (shadcn is built on it) |
| ★ [React Aria](https://react-spectrum.adobe.com/react-aria/) | Best-in-class accessible date pickers, number fields, comboboxes for respondent forms |
| [Ark UI](https://ark-ui.com) | Headless components incl. file upload, signature pad, rating |
| [Headless UI](https://headlessui.com) | Simple headless components from the Tailwind team |

## 4. Builder-specific libraries (the hard parts of a form builder)

| Need | Resource | Notes |
|---|---|---|
| Drag and drop fields | ★ [dnd kit](https://dndkit.com) | Sortable lists, keyboard accessible |
| | [Pragmatic drag and drop](https://github.com/atlassian/pragmatic-drag-and-drop) | Atlassian's, very fast, framework-agnostic |
| Visual page/app builder | [Puck](https://puckeditor.com) | Open-source React visual editor; good model for the Apps builder |
| | [Craft.js](https://craft.js.org) | Framework for drag-and-drop page editors |
| | [GrapesJS](https://grapesjs.com) | HTML page builder; reference for PDF/email template editors |
| Workflow canvas | [React Flow](https://reactflow.dev) | Node-based editor for approval/workflow canvas (R3) |
| Rich text (paragraph field, emails) | [Tiptap](https://tiptap.dev) | Notion-like editor, extensible |
| | [Lexical](https://lexical.dev) | Meta's editor framework |
| Real-time co-editing | [Yjs](https://yjs.dev) | CRDT library, free |
| | [Liveblocks](https://liveblocks.io) | Hosted multiplayer (presence, comments) |
| Form state and validation | [React Hook Form](https://react-hook-form.com) / [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev) | Zod is already in the repo |
| Inbox / table view | ★ [TanStack Table](https://tanstack.com/table) | Headless data grid: sorting, filters, virtualisation |
| Data fetching | [TanStack Query](https://tanstack.com/query) | Caching, optimistic updates |

## 5. Open-source form builders to study (reference, don't fork)

| Project | Licence | Learn from it |
|---|---|---|
| ★ [Formbricks](https://github.com/formbricks/formbricks) | AGPL (open-core) | Data model (org → workspace → survey → response), Next.js + Postgres |
| [OpnForm](https://github.com/JhumanJ/OpnForm) | AGPL (open-core) | Laravel + Vue form builder, logic UI |
| [HeyForm](https://github.com/heyform/heyform) | AGPL | Conversational forms, MongoDB |
| [Typebot](https://github.com/baptisteArno/typebot.io) | FSL → Apache after 2 years | Chat-flow builder; inspiration for the AI agent |
| ★ [SurveyJS](https://surveyjs.io) | MIT renderer, commercial creator | JSON form schema and expression language |
| [Form.io](https://form.io) | MIT renderer, OSL server | JSON schema forms, enterprise patterns |

## 6. Form UX and design guidance

| Resource | Why |
|---|---|
| ★ [GOV.UK Design System](https://design-system.service.gov.uk) | The best-researched form patterns anywhere: questions, errors, dates, addresses, "one thing per page" |
| [NN/g: Web form design](https://www.nngroup.com/articles/web-form-design/) | Research-backed form usability rules |
| [Baymard Institute](https://baymard.com/blog) | Checkout and form-field research (great for payment forms) |
| [Adam Silver](https://adamsilver.io) | Author of *Form Design Patterns*; articles on accessible forms |
| [Component Gallery](https://component.gallery) | How 90+ design systems implement each component |
| [Shopify Polaris](https://shopify.dev/docs/api/polaris) | Admin/settings patterns |
| [Atlassian Design](https://atlassian.design) | Complex app patterns, tables, empty states |
| [GitHub Primer](https://primer.style) | Developer-focused UI conventions |
| [IBM Carbon](https://carbondesignsystem.com) | Enterprise forms, data tables, accessibility docs |
| [Vercel Geist](https://vercel.com/geist) | Minimal modern design system |

## 7. Accessibility

| Resource | Use it for |
|---|---|
| ★ [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) | Exact keyboard and ARIA behaviour for every widget |
| [Inclusive Components](https://inclusive-components.design) | Deep dives on building accessible components |
| [The A11Y Project](https://www.a11yproject.com) | Checklist for WCAG audits |

## 8. Motion, icons, fonts, colour

| Category | Resources |
|---|---|
| Motion | ★ [Motion](https://motion.dev) (React animation), [GSAP](https://gsap.com) (marketing site), [Rive](https://rive.app) and [LottieFiles](https://lottiefiles.com) (illustrated animations) |
| Icons | ★ [Lucide](https://lucide.dev) (shadcn default), [Phosphor](https://phosphoricons.com), [Heroicons](https://heroicons.com) |
| Fonts | [Google Fonts](https://fonts.google.com) (includes Noto for all Indian scripts), [Fontshare](https://www.fontshare.com) (free, made in India by ITF) |
| Colour | ★ [Radix Colors](https://www.radix-ui.com/colors) (accessible scales, light/dark), [Realtime Colors](https://www.realtimecolors.com), [UI Colors](https://uicolors.app) (Tailwind palettes), [Coolors](https://coolors.co) † |

---

## 9. Backend architecture and system design

| Resource | Why |
|---|---|
| ★ [Designing Data-Intensive Applications](https://dataintensive.net) | The book on databases, queues, consistency |
| [System Design Primer](https://github.com/donnemartin/system-design-primer) | Free, structured system design guide |
| [ByteByteGo](https://bytebytego.com) | Visual system-design explanations |
| [The Twelve-Factor App](https://12factor.net) | Rules for config, processes, logs in SaaS |
| [AWS Well-Architected](https://aws.amazon.com/architecture/well-architected/) | Reliability, security, cost checklists |

## 10. Database (PostgreSQL)

| Resource | Why |
|---|---|
| ★ [PostgreSQL docs](https://www.postgresql.org/docs/) | JSONB, GIN indexes, full-text search, partitioning |
| ★ [Use The Index, Luke](https://use-the-index-luke.com) | Indexing explained for developers |
| [Crunchy Data blog](https://www.crunchydata.com/blog) | Practical Postgres (JSONB, multi-tenancy, partitioning) |
| [pganalyze blog](https://pganalyze.com/blog) | Query performance |
| [PlanetScale blog](https://planetscale.com/blog) | Schema changes, scaling, sharding |
| [Supabase database guides](https://supabase.com/docs/guides/database/overview) | Row-level security for multi-tenant apps |
| [Drizzle ORM](https://orm.drizzle.team) / [Prisma](https://www.prisma.io/docs) | Typed queries and migrations |
| [dbdiagram.io](https://dbdiagram.io) / [DrawSQL templates](https://drawsql.app/templates) | Draw schemas; browse real app schemas |

## 11. Queues, jobs, search

| Resource | Use it for |
|---|---|
| ★ [BullMQ docs](https://docs.bullmq.io) | Email, webhook, PDF jobs with retries (planned in SDD) |
| [Redis docs](https://redis.io/docs/latest/) | Rate limiting, caching, locks |
| [Inngest](https://www.inngest.com) / [Trigger.dev](https://trigger.dev) | Hosted durable background jobs (alternative to running BullMQ) |
| [Temporal](https://temporal.io) | Durable workflows (for the R3 workflow engine) |
| [Meilisearch](https://www.meilisearch.com) / [Typesense](https://typesense.org) | Fast search over submissions if Postgres search isn't enough |

## 12. API design, docs and SDKs

| Resource | Why |
|---|---|
| ★ [Stripe API reference](https://docs.stripe.com/api) | Gold standard for API design and docs; copy its error format and pagination |
| [Google AIP](https://google.aip.dev) | Rules for resource-oriented APIs |
| [Microsoft REST guidelines](https://github.com/microsoft/api-guidelines) | Versioning, errors, long-running operations |
| [Zalando RESTful guidelines](https://opensource.zalando.com/restful-api-guidelines/) | Practical, opinionated API rules |
| [OpenAPI 3.1 spec](https://spec.openapis.org/oas/latest.html) | Describe the `/v1` API |
| [Scalar](https://scalar.com) / [Mintlify](https://www.mintlify.com) / [Redocly](https://redocly.com) | Beautiful API documentation sites |
| [Speakeasy](https://www.speakeasy.com) / [Stainless](https://www.stainless.com) | Generate typed SDKs from OpenAPI |
| [Model Context Protocol](https://modelcontextprotocol.io) | Build the MCP server (Jotform has one) |

## 13. Webhooks

| Resource | Why |
|---|---|
| ★ [Standard Webhooks](https://www.standardwebhooks.com) | Open spec for signing, headers, retries — adopt it |
| [Svix](https://www.svix.com) | Hosted webhook sending (or study its open-source server) |
| [Hookdeck](https://hookdeck.com) | Webhook reliability patterns, testing incoming webhooks |

## 14. Payments (India-first)

| Resource | Why |
|---|---|
| ★ [Razorpay docs](https://razorpay.com/docs/) | Orders, Checkout, UPI Intent/QR, webhooks, Subscriptions, Route |
| [Cashfree docs](https://docs.cashfree.com) | Second Indian gateway |
| [Stripe docs](https://docs.stripe.com/api) | International payments; reference design for payment flows |
| [NPCI UPI](https://www.npci.org.in) † | Official UPI rules and product overview |

## 15. Auth, security, compliance

| Resource | Why |
|---|---|
| ★ [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | The security requirement checklist referenced in the SRS |
| ★ [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org) | Sessions, CSRF, SSRF, file upload, password storage |
| [Better Auth](https://www.better-auth.com) / [Auth.js](https://authjs.dev) | Auth libraries (OAuth, 2FA, organisations) |
| [Lucia](https://lucia-auth.com) | Now a learning guide for building sessions yourself |
| [BoxyHQ SAML Jackson](https://boxyhq.com/docs/jackson/overview) | Open-source SAML SSO for Enterprise |
| [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) | Free CAPTCHA alternative for spam protection |
| [ClamAV](https://www.clamav.net) | Virus scanning of uploads |
| [MeitY data protection](https://www.meity.gov.in/data-protection-framework) | DPDP Act and rules (verify with counsel) |

## 16. Email, PDF, AI

| Resource | Use it for |
|---|---|
| [React Email](https://react.email) + [Resend](https://resend.com) | Designing and sending notification emails |
| [pdf-lib](https://pdf-lib.js.org) | Already used for PDFs and e-sign |
| [react-pdf](https://react-pdf.org) | Building PDF templates with React components |
| [Gotenberg](https://gotenberg.dev) | HTML → PDF in a Docker container (for a visual PDF editor) |
| [Anthropic docs](https://docs.anthropic.com) | AI form generation, translation, agent |

## 17. Testing, observability, product analytics

| Resource | Use it for |
|---|---|
| ★ [Playwright](https://playwright.dev) | End-to-end tests (build → publish → submit → pay) |
| [Vitest](https://vitest.dev) | Fast unit tests for client code |
| [k6](https://k6.io) | Load testing the submit endpoint |
| [OpenTelemetry](https://opentelemetry.io) | Traces, metrics, logs |
| [Grafana OSS](https://grafana.com/oss/) | Dashboards and alerting |
| [Sentry](https://sentry.io) | Error tracking |
| [PostHog](https://posthog.com) | Product analytics, funnels, session replay, feature flags |
| [GitHub Actions](https://github.com/features/actions) | CI/CD |

## 18. Engineering blogs worth following

| Blog | Known for |
|---|---|
| [Stripe engineering](https://stripe.com/blog/engineering) | API design, reliability, payments |
| [Linear](https://linear.app/now) | Product craft, fast UI, sync engine |
| [Figma engineering](https://www.figma.com/blog/engineering/) | Multiplayer editing, canvas performance |
| [Notion tech](https://www.notion.com/blog/topic/tech) | Block data model, Postgres sharding |
| [Cloudflare blog](https://blog.cloudflare.com) | Security, bots, edge |
| [Vercel blog](https://vercel.com/blog) | Frontend performance |
| [GitHub engineering](https://github.blog/engineering/) | Scaling, MySQL, CI |

---

## Suggested starter stack from this list

- **App UI:** shadcn/ui + Radix + Tailwind, Lucide icons, Motion for small transitions; inspiration from Mobbin (Tally, Typeform, Linear) and Refero.
- **Respondent forms:** React Aria for complex inputs, GOV.UK patterns for questions and errors, Noto fonts for Indian scripts.
- **Builder:** dnd kit for field ordering, Tiptap for rich text, TanStack Table for the inbox.
- **Marketing site:** 21st.dev + Magic UI sections, inspiration from Godly and Awwwards.
- **Backend:** Postgres (JSONB) + Drizzle, BullMQ on Redis, Standard Webhooks, Razorpay, OWASP ASVS checklist, Playwright + k6.
