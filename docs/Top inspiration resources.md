# Top inspiration and reference resources

Short list of the best resources for building WpForms. The full list (about 140 resources with notes) is in [Inspiration and reference resources.md](Inspiration%20and%20reference%20resources.md). All links checked on 3 Nov 2026.

---

## Frontend

### Visual inspiration
- [Mobbin](https://mobbin.com) — real app screens and full user flows. Study Typeform, Tally, Linear, Airtable.
- [Refero](https://refero.design) — real web app UI, searchable by pattern ("form builder", "inbox", "pricing").
- [Page Flows](https://pageflows.com) — videos of onboarding and checkout journeys.
- [SaaSFrame](https://www.saasframe.io) — SaaS screens by page type.
- [Dribbble](https://dribbble.com) — concept designs for mood and direction.
- [Awwwards](https://www.awwwards.com), [Godly](https://godly.website), [Land-book](https://land-book.com), [SaaS Landing Page](https://saaslandingpage.com) — marketing site ideas.

### Ready-made components
- [21st.dev](https://21st.dev) — community marketplace of React + Tailwind components.
- [shadcn/ui](https://ui.shadcn.com) — copy-paste components you own; best base for the builder app.
- [coss.com UI](https://coss.com/ui) (formerly Origin UI) — many form-input variants.
- [Magic UI](https://magicui.design), [Aceternity UI](https://ui.aceternity.com) — animated sections, marketing site only.
- [Tailwind Plus](https://tailwindcss.com/plus) — paid app UI blocks (tables, settings, layouts).
- [Tremor](https://tremor.so) — charts for reports.

### Accessible primitives
- [Radix UI](https://www.radix-ui.com)
- [React Aria](https://react-spectrum.adobe.com/react-aria/) — great date pickers and number fields for respondent forms.
- [Ark UI](https://ark-ui.com)

### Form-builder libraries
- Drag and drop: [dnd kit](https://dndkit.com), [Pragmatic drag and drop](https://github.com/atlassian/pragmatic-drag-and-drop)
- Inbox table: [TanStack Table](https://tanstack.com/table)
- Rich text: [Tiptap](https://tiptap.dev)
- Workflow canvas: [React Flow](https://reactflow.dev)
- Apps builder: [Puck](https://puckeditor.com)
- Live co-editing: [Yjs](https://yjs.dev)

### Open-source form builders to study
- [Formbricks](https://github.com/formbricks/formbricks), [OpnForm](https://github.com/JhumanJ/OpnForm), [HeyForm](https://github.com/heyform/heyform), [Typebot](https://github.com/baptisteArno/typebot.io) — reference only (AGPL/FSL licences make copying code into a closed product risky).
- [SurveyJS](https://surveyjs.io), [Form.io](https://form.io) — MIT-licensed form renderers.

### Form design guidance
- [GOV.UK Design System](https://design-system.service.gov.uk) — best-researched form patterns anywhere.
- [NN/g: Web form design](https://www.nngroup.com/articles/web-form-design/), [Baymard Institute](https://baymard.com/blog) — form and checkout usability research.
- [Component Gallery](https://component.gallery) — how 90+ design systems build each component.
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) — keyboard and screen-reader behaviour for every widget.

### Motion, icons, fonts, colour
- [Motion](https://motion.dev), [Lucide](https://lucide.dev), [Google Fonts](https://fonts.google.com) (Noto covers all Indian scripts), [Fontshare](https://www.fontshare.com), [Radix Colors](https://www.radix-ui.com/colors)

---

## Backend and database

### Architecture
- [Designing Data-Intensive Applications](https://dataintensive.net) — the standard book on databases, queues, consistency.
- [System Design Primer](https://github.com/donnemartin/system-design-primer), [ByteByteGo](https://bytebytego.com)
- [The Twelve-Factor App](https://12factor.net) — config, processes, logs in SaaS.

### PostgreSQL
- [PostgreSQL docs](https://www.postgresql.org/docs/), [Use The Index, Luke](https://use-the-index-luke.com)
- [Crunchy Data blog](https://www.crunchydata.com/blog), [pganalyze blog](https://pganalyze.com/blog)
- [Drizzle ORM](https://orm.drizzle.team) — typed queries and migrations.
- [dbdiagram.io](https://dbdiagram.io) — draw schemas.

### Background jobs and search
- [BullMQ](https://docs.bullmq.io) — emails, webhooks, PDFs (planned in the design document).
- [Inngest](https://www.inngest.com), [Trigger.dev](https://trigger.dev) — hosted alternatives.
- [Temporal](https://temporal.io) — multi-step workflows later.
- [Meilisearch](https://www.meilisearch.com) — if Postgres search isn't enough.

### API design and docs
- [Stripe API docs](https://docs.stripe.com/api) — copy its error format and pagination.
- [Google AIP](https://google.aip.dev), [Zalando RESTful guidelines](https://opensource.zalando.com/restful-api-guidelines/)
- [Scalar](https://scalar.com), [Mintlify](https://www.mintlify.com) — API documentation sites.
- [Speakeasy](https://www.speakeasy.com), [Stainless](https://www.stainless.com) — SDK generation.
- [Model Context Protocol](https://modelcontextprotocol.io) — AI-assistant integration.

### Webhooks
- [Standard Webhooks](https://www.standardwebhooks.com) — open spec for signing and retries; adopt it.
- [Svix](https://www.svix.com)

### Payments
- [Razorpay docs](https://razorpay.com/docs/), [Cashfree docs](https://docs.cashfree.com), [NPCI UPI](https://www.npci.org.in)

### Security
- [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org)
- [Better Auth](https://www.better-auth.com) — login and two-factor sign-in.
- [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) — spam protection.
- [ClamAV](https://www.clamav.net) — virus-scanning uploads.

### Email and PDF
- [React Email](https://react.email) + [Resend](https://resend.com)
- [Gotenberg](https://gotenberg.dev) — HTML to PDF.

### Testing and monitoring
- [Playwright](https://playwright.dev) (end-to-end), [k6](https://k6.io) (load testing)
- [OpenTelemetry](https://opentelemetry.io), [Sentry](https://sentry.io)
- [PostHog](https://posthog.com) — product analytics and funnels.

### Engineering blogs to follow
- [Stripe](https://stripe.com/blog/engineering), [Linear](https://linear.app/now), [Figma](https://www.figma.com/blog/engineering/) (multiplayer editing), [Notion](https://www.notion.com/blog/topic/tech) (block data model)

---

## Suggested starter stack

- **App:** shadcn/ui + Radix + Tailwind, dnd kit, TanStack Table, Lucide, Motion.
- **Respondent forms:** React Aria inputs, GOV.UK form patterns, Noto fonts.
- **Marketing site:** 21st.dev + Magic UI, inspiration from Godly and Awwwards.
- **Backend:** Postgres (JSONB) + Drizzle, BullMQ on Redis, Standard Webhooks, Razorpay, OWASP ASVS, Playwright + k6.
