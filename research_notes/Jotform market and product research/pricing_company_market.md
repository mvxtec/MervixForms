# Jotform: Pricing, Security/Compliance, Company Profile, Business Model, and Form Builder Market

Research date: 2026-11-03. All pricing was pulled live from jotform.com/pricing on that date. Financial figures are third-party estimates unless noted, and their dates are flagged.

## 1. Pricing tiers and plan limits (incl. HIPAA, discounts, 2025-2026 changes)

### Takeaway
Jotform has five tiers: Starter (free), Bronze ($39/mo or $34/mo billed annually), Silver ($49/$39), Gold ($129/$99) and Enterprise (custom). Each paid tier raises the usage caps on forms, submissions, views, storage, payments, Sign documents and AI agents by roughly 2.5x to 10x. HIPAA is only available on Gold and Enterprise. Nonprofits and schools get 50% off the self-serve tiers. The main 2025-2026 change is new AI agent caps added to every tier. List prices for the self-serve tiers appear unchanged.

### Cited Findings
- Plan table as of 2026-11-03 (all limits monthly unless noted) — [Jotform Pricing](https://www.jotform.com/pricing/):

| Metric | Starter | Bronze | Silver | Gold | Enterprise |
|---|---|---|---|---|---|
| Monthly billing | $0 | $39 | $49 | $129 | Custom |
| Annual billing (total) | $0 | $408 | $468 | $1,188 | Custom |
| Effective $/mo, annual | $0 | $34 | $39 | $99 | Custom |
| Users | 1 | 1 | 1 | 1 | Multi-user |
| Active forms | 5 | 25 | 50 | 100 | Unlimited |
| Monthly submissions | 100 | 1,000 | 2,500 | 10,000 | Unlimited |
| Monthly form views | 10,000 | 100,000 | 1,000,000 | 10,000,000 | Unlimited |
| Upload storage | 100 MB | 1 GB | 10 GB | 100 GB | Unlimited |
| Total submission storage | 500 | 10,000 | 25,000 | 100,000 | Unlimited |
| Payment submissions/mo | 10 | 100 | 250 | 1,000 | Unlimited |
| Signed documents/mo | 10 | 100 | 250 | 1,000 | Unlimited |
| Fields per form | 100 | 250 | 500 | 1,000 | Unlimited |
| Active AI Agents | 5 | 25 | 50 | 100 | Unlimited |
| AI conversations/mo | 100 | 1,000 | 2,500 | 10,000 | Unlimited |
| AI sessions/mo | 10,000 | 100,000 | 1,000,000 | 2,000,000 | Unlimited |
| AI voice call minutes/mo | 3,000 | 6,000 | 12,000 | 18,000 | Unlimited |
| AI knowledge base (characters) | 10M | 20M | 50M | 100M | Unlimited |
| AI SMS/mo | 250 | 300 | 500 | 750 | Unlimited |
| HIPAA features | No | No | No | Yes | Yes |

- Self-serve plans are single-user. Multi-user teams require Enterprise — [Jotform Pricing](https://www.jotform.com/pricing/)
- Nonprofit and education organizations get 50% off Bronze, Silver and Gold, and 30% off Enterprise. The page also lists a limited-time, campaign-dependent offer of 50% off for the first 24 hours after signup — [Jotform Pricing](https://www.jotform.com/pricing/)
- HIPAA features come only with Gold and Enterprise. For HIPAA-friendly AI accounts, AI processing uses Google Gemini via Vertex AI under a BAA — [Jotform Pricing](https://www.jotform.com/pricing/)
- Annual billing saves "up to 20%". Jotform support answered a question about 2027 pricing — [Jotform Answers](https://www.jotform.com/answers/40444751-jotform-account-inquiry-about-2027-pricing-and-discount-options)
- Prices are mainly in USD and EUR, with GBP, CAD and AUD also supported — [Jotform Pricing](https://www.jotform.com/pricing/)
- Several 2026 third-party breakdowns report the same $39/$49/$129 monthly and $34/$39/$99 annual prices — [usagepricing.com](https://www.usagepricing.com/blueprint/jotform); [automationatlas.io](https://automationatlas.io/answers/jotform-pricing-explained-2026/)
- One aggregator lists $20/$25/$65, which looks outdated — [everydev.ai](https://www.everydev.ai/tools/jotform-ai)
- Sources disagree on AI limits. One breakdown lists voice minutes as 50/100/200/300, while the official page shows 3,000/6,000/12,000/18,000 — [usagepricing.com](https://www.usagepricing.com/blueprint/jotform) vs [Jotform Pricing](https://www.jotform.com/pricing/)
- A Jotform-hosted Salesforce-agent pricing page showed 2,500 conversations for Bronze, which conflicts with the 1,000 on the main pricing page — [Jotform Salesforce Agent pricing](https://www.jotform.com/sr/ai/salesforce-agent/pricing/)

### Inferences
- In 2025-2026 Jotform bundled AI Agents into its existing plans as a second usage axis: agents, conversations, sessions, voice minutes, knowledge base and SMS. It did not launch a separate AI SKU. The AI conversation caps exactly match the submission caps (100/1,000/2,500/10,000), which suggests they treat an AI conversation as roughly equal to a form submission.
- The real upgrade triggers are monthly submissions, active forms and HIPAA. Form views are generous enough that they rarely force an upgrade. Gold is the entry price for healthcare buyers (HIPAA), which makes it a deliberate monetization gate.
- Because every self-serve plan is single-user, any team that needs collaboration has to move to Enterprise. That pushes multi-seat organizations into sales-led deals.

### Gaps
- I found no authoritative dated record of past list price changes, so I can't confirm when the $34/$39/$99 annual pricing started. The everydev $20/$25/$65 figure suggests older, lower pricing but is undated.
- Enterprise pricing is not public. I found no reliable figures for typical deal sizes, seat-based pricing or Vendr benchmarks.
- I found no separate published "HIPAA plan" price beyond the Gold and Enterprise gating.
- The 50% first-24-hours promotion is campaign-dependent and may not always be active.

## 2. Security and compliance

### Takeaway
Jotform's security page lists 256-bit SSL/TLS, optional client-side encrypted forms, PCI DSS Service Provider Level 1, GDPR, CCPA, HIPAA (BAA on request), FERPA and HECVAT, plus StateRAMP progress for its government product. SOC 2 Type II covers Jotform Enterprise and was first issued in September 2022. Data is hosted on Google Cloud (primary) and AWS (secondary) in the US and EU (Frankfurt). Enterprise customers can choose other residency locations. SSO/SAML is Enterprise-only, and 2FA is available to all users.

### Cited Findings
- Forms are served over 256-bit SSL with a SHA256 certificate on all plans. TLS 1.2 is the default — [Jotform Security](https://www.jotform.com/security/)
- Encrypted forms use RSA 2048 keys generated on the user's computer with a custom password. File uploads are not covered by this encryption — [Jotform Security](https://www.jotform.com/security/)
- The page claims "PCI DSS Service Provider Level 1 compliant", backed by quarterly ASV scans, periodic penetration tests and a bug bounty program — [Jotform Security](https://www.jotform.com/security/)
- GDPR and CCPA are listed as compliant. HIPAA-enabled forms are available and a BAA can be requested. FERPA is supported, and HECVAT is used to assess the Enterprise product — [Jotform Security](https://www.jotform.com/security/)
- Jotform says it is in StateRAMP's Security Snapshot program, and that Jotform Government follows controls common to FedRAMP and StateRAMP — [Jotform Security](https://www.jotform.com/security/)
- Jotform Enterprise received its first SOC 2 Type II report in September 2022 from the auditor Auditwerx. It covers all five Trust Service Principles. The report is not public; Enterprise customers request it through their account representative, under NDA — [Jotform blog](https://www.jotform.com/blog/announcing-soc-2-type-ii-compliance-for-jotform-enterprise/); [Jotform SOC 2 page](https://jotform.com/enterprise/soc-2-compliance); [Jotform Answers](https://www.jotform.com/answers/39719321-requesting-soc-2-iso-27001-reports)
- The ISO 27001, 27017 and 27018 certifications cited on the security page belong to Google Cloud and AWS, not to Jotform itself — [Jotform Security](https://www.jotform.com/security/)
- Google Cloud is the primary host and AWS the secondary, with hourly replication to AWS. Regions are Google Cloud Iowa (US) and Frankfurt (EU), and AWS Virginia (US) and Frankfurt (EU). Users can move their data to EU servers in account settings. Backups are kept as 30-day snapshots — [Jotform Security](https://www.jotform.com/security/)
- Enterprise customers can choose a data residency location. The page names Australia, Canada, the UK and the EU as places with local residency requirements but does not list specific data centers in Canada, the UK or Australia — [Jotform Security](https://www.jotform.com/security/)
- 2FA is available. SSO/SAML (Active Directory, Okta, Google, OneLogin) is Enterprise-only — [Jotform Security](https://www.jotform.com/security/)
- Other measures: Cloudflare DDoS protection, OSSEC intrusion detection and a 99.9% uptime target, with SLAs only for Enterprise — [Jotform Security](https://www.jotform.com/security/)
- A third-party comparison site lists "SAML SSO + audit logs" for Jotform. I could not verify this on Jotform's own pages — [Formester](https://formester.com/blog/best-enterprise-form-builders/)

### Inferences
- The compliance stack (HIPAA BAA, PCI L1, SOC 2 Type II, FERPA, HECVAT, StateRAMP) lines up directly with the target verticals: healthcare, payments/SMB, education and government. The strongest controls (SSO, SOC 2 report access, dedicated environments, residency choice, SLAs) are reserved for Enterprise, which makes compliance a main driver of Enterprise upsell.

### Gaps
- Jotform's own pages do not document audit logs. Enterprise docs or the sales team would need to confirm them.
- Canadian, UK and Australian data center locations are implied (as Enterprise residency options) but not named on the security page.
- I found no evidence that Jotform holds its own ISO 27001 certification. A support answer titled "Requesting SOC 2 / ISO 27001 reports" exists but I did not confirm its contents.

## 3. Company profile (founding, size, users, revenue, customers, segments)

### Takeaway
Aytekin Tank founded Jotform in 2006. It is a bootstrapped, privately held company with headquarters in San Francisco and most of its staff in Turkey. It has roughly 850 to 1,000 employees and 35 to 40M+ registered users. Revenue is an estimated $145M to $172M (2024-2025 third-party estimates), up from a CEO-confirmed $84M in 2022. Its customers are mostly SMBs, education, nonprofits and healthcare, with an enterprise and government product line on top.

### Cited Findings
- Founded in 2006 by Aytekin Tank as the first WYSIWYG online form builder. Tank is founder and CEO, and the company is bootstrapped — [Jotform About](https://www.jotform.com/about/); [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
- The San Francisco HQ opened in 2014. Other offices are in Sydney, London, Vancouver, Ankara (two), Izmir and Istanbul — [Jotform About](https://www.jotform.com/about/); [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
- User counts:
  - Homepage and About page (Nov 2026): "40M+" users. The 2025 timeline entry says it passed 35 million — [Jotform About](https://www.jotform.com/about/)
  - 35M+ as of February 2025 — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
  - A June 2026 launch summary cites 38M — [briefglance](https://briefglance.com/companies/jotform-inc/pulses/45722)
  - About 20M in April 2023 — [AppMaster news](https://appmaster.io/de/news/jotform-20-millionen-benutzer-meilenstein-geschaftswachstum)
- Scale: 2B+ form submissions, 50M+ forms created (as of 2024), 20K+ templates, available in 16 to 18 languages — [Jotform About](https://www.jotform.com/about/); [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
- Employees:
  - 856 in 2025 — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
  - 1,012 — [Revelio Labs](https://www.reveliolabs.com/companies/jotform/employees)
  - 846 — [TechList](https://techlist.ai/jotform.com)
  - GetLatka history: 75 (Nov 2017), 200 (Dec 2020), 400 (Jul 2022, from a CEO interview), 500 (Oct 2024, from LinkedIn, likely stale) — [GetLatka](https://getlatka.com/companies/jotform)
- Revenue (none of these are company-reported except 2022):
  - $45M (Nov 2017, interview) — [GetLatka](https://getlatka.com/companies/jotform)
  - $54M (Sep 2019) — [GetLatka](https://getlatka.com/companies/jotform)
  - $84M (Jul 2022, confirmed by the CEO in an interview) — [GetLatka](https://getlatka.com/companies/jotform)
  - $144.9M (Oct 2024 estimate) — [GetLatka](https://getlatka.com/companies/jotform)
  - About $144M — [YesPress](https://yespress.io/jotform)
  - About $172M (undated estimate) — [TechList](https://techlist.ai/jotform.com)
- In 2017, Jotform had about 3M users and an estimated 180K+ paying customers. That paying-customer figure is the interviewer's own calculation and is unverified — [GetLatka](https://getlatka.com/companies/jotform)
- Jotform says it can't disclose revenue figures but describes revenue as "steadily increasing". An earlier interview cited annual growth of more than 50% — [Unite.AI interview](https://www.unite.ai/aytekin-tank-founder-ceo-of-jotform-interview-series/)
- Logos listed: Armani, AMA, Shell, City of Sydney, Red Bull, McLaren, State of Alaska, Ford, AMC, Netflix — [Jotform About](https://www.jotform.com/about/)
- Core users are small businesses, nonprofits, schools and healthcare providers, plus enterprises such as Netflix, Red Bull and Ford — [Unite.AI interview](https://www.unite.ai/aytekin-tank-founder-ceo-of-jotform-interview-series/)
- Product expansion timeline:
  - 2021: Jotform Apps, plus the rebrand from "JotForm" to "Jotform" — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
  - 2022: Jotform Sign — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
  - September 2023: listed on Salesforce AppExchange — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
  - October 2024: Workflows — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
  - February 2025: AI Agents — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
  - January 2026: AI Chatbot for Canva — [briefglance](https://briefglance.com/articles/jotform-and-canva-launch-first-native-ai-chatbot-for-designs)
  - March 24, 2026: "Jotform AI" conversational builder — [briefglance](https://briefglance.com/companies/jotform-inc/pulses/34320)
  - March 31, 2026: ChatGPT app — [Technobezz](https://www.technobezz.com/news/jotform-chat-gpt-app)
  - June 2026: AI App Builder — [briefglance](https://briefglance.com/companies/jotform-inc/pulses/45722)
- A March 2026 release reported 750,000 AI Agents created, 200M agent sessions and 22M messages. These figures come from secondary coverage — [martechedge](https://martechedge.com/news/jotform-ai-turns-form-building-into-a-conversationno-drag-and-drop-required)
- 2026 marks Jotform's 20th anniversary — [KCCR syndicated release](https://lifestyle.kccrradio.com/story/68075/jotform-celebrates-20-years-of-empowering-organizations-to-build-better-workflows/)
- History: in February 2012 the US Secret Service took the site down for two days as part of an investigation into user-created forms — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)

### Inferences
- Revenue roughly doubled from $45M (2017) to $84M (2022), about 13% CAGR. If the $145M 2024 estimate is right, growth from 2022 to 2024 was about 31% a year. That jump is plausible given the expansion into Sign, Apps, Workflows and Enterprise, but it depends on an unverified estimate.
- At about $145M to $172M in revenue with about 850 to 1,000 staff, revenue per employee is roughly $150K to $200K. That is consistent with an efficient bootstrapped SaaS company with a lower-cost engineering base in Turkey.
- Assuming 1% to 2% of 40M users pay would give about 400K to 800K paying accounts, at an implied ARPA of roughly $200 to $400 a year. This is illustrative arithmetic only and is not sourced.

### Gaps
- There is no official revenue, ARR, paying-customer count or growth rate. All figures after 2022 are third-party estimates of uncertain method.
- I found no breakdown of revenue by segment (SMB vs Enterprise vs Government) or by geography.
- The "first WYSIWYG form builder" claim comes from the company itself.

## 4. Business model and go-to-market

### Takeaway
Jotform runs a freemium, product-led subscription model. The free Starter tier converts to paid plans once usage caps are hit: submissions, forms, storage, payments, Sign documents and AI conversations. A sales-led Enterprise tier (multi-user, SSO, compliance, residency) sits on top, and Government and HIPAA editions target regulated buyers. Acquisition relies on a huge template library (20K+ templates in 16 to 18 languages), integrations and marketplaces (Salesforce, Canva, ChatGPT), and steady founder-led content.

### Cited Findings
- The free Starter plan has hard caps (5 forms, 100 submissions/month, 100 MB storage). Paid tiers scale those caps, and Enterprise is unlimited and multi-user — [Jotform Pricing](https://www.jotform.com/pricing/)
- 20K+ form templates and 16 languages — [Jotform About](https://www.jotform.com/about/). An earlier spokesperson figure was over 10,000 starter templates across many industries — [Unite.AI](https://www.unite.ai/aytekin-tank-founder-ceo-of-jotform-interview-series/)
- Jotform is fully bootstrapped and has never raised venture capital. Tank's "50-50 rule" splits effort between product work and growth — [Unite.AI](https://www.unite.ai/aytekin-tank-founder-ceo-of-jotform-interview-series/); [GetLatka](https://getlatka.com/companies/jotform/funding)
- Distribution through ecosystems: Salesforce AppExchange (2023), Weebly and IFTTT (2016), Canva (2026) and the ChatGPT app marketplace (2026) — [Wikipedia](https://en.wikipedia.org/wiki/Jotform); [briefglance](https://briefglance.com/articles/jotform-and-canva-launch-first-native-ai-chatbot-for-designs); [Technobezz](https://www.technobezz.com/news/jotform-chat-gpt-app)
- Jotform runs content and media properties. It acquired Noupe, an online magazine, in 2018 (flagged "citation needed" on Wikipedia) — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
- AI Agents are offered on every tier, including free (5 agents, 100 conversations), which extends the freemium funnel into AI customer service — [Jotform Pricing](https://www.jotform.com/pricing/)

### Inferences
- A localized library of 20K+ templates is a classic programmatic SEO engine: each template is a landing page for long-tail queries like "[industry] [form type] template". No source I found states this directly, so treat it as an inference.
- The broader product suite (Tables, Sign, Apps, Workflows, AI Agents, App Builder) raises account value and stickiness, which moves Jotform from a single-purpose form tool toward a "data collection and workflow platform". The March 2026 positioning as an "intelligent data management platform" supports this — [briefglance](https://briefglance.com/companies/jotform-inc/pulses/34320)
- Usage-based caps on many axes create natural upgrade moments without per-seat pricing until Enterprise.

### Gaps
- I found no primary-source data on Jotform's free-to-paid conversion rate, traffic share from organic search, number of template pages or marketing spend. Tank's interviews (Unite.AI, podcasts) do not quantify SEO.
- I found no channel or partner revenue breakdown.

## 5. Market size, growth, trends and consolidation

### Takeaway
Market sizing depends heavily on definition. Estimates for the "online form builder software" market range from about $0.6B to $5B (2024-2025 base) with CAGRs of about 9.6% to 15%. The most-cited figure is Verified Market Research's $4.06B (2024) growing to $9.48B by 2032 at 11.18%. The adjacent online survey software market is $3.6B to $4.5B, with Grand View forecasting 17.1% CAGR to $15.3B by 2033. The main trends are AI-generated and conversational forms, AI agents, no-code workflows, e-signatures and compliance. Consolidation has come mostly through private equity (SurveyMonkey/Momentive taken private for $1.5B) and venture-funded scaling (Typeform), while bootstrapped players (Jotform, Tally) keep growing.

### Cited Findings
- **Verified Market Research (online form builder):** $4.06B (2024) to $9.48B by 2032 at 11.18% CAGR. The page is inconsistent about the forecast window: the body says 2026-2032 and the title says 2025-2033. Cloud deployment held about 59.6% share in 2024. Large enterprises held about 62.95%, and SMEs are the fastest-growing segment. Named players: Typeform, Wufoo, Formstack, JotForm, WPForms, Laserfiche, Microsoft, Zoho, Cognito, ProntoForms. Drivers named: digital transformation, remote work, SaaS, analytics and AI automation — [Verified Market Research](https://www.verifiedmarketresearch.com/product/online-form-builder-software-market/)
- **DataHorizzon (online form builder):** about $2.8B (2024) to about $6.4B by 2033 at 9.6% CAGR (2025-2033) — [DataHorizzon Research](https://datahorizzonresearch.com/global-online-form-builder-software-market-58713)
- **Low-end estimate (online form builder):** $577.55M (2024) to $1,220.14M by 2033 at 9.8% CAGR — [Data Insights Market](https://www.datainsightsmarket.com/reports/online-form-builder-software-1972461). The search snippet's attribution was unclear; it may instead come from [Market Research Forecast](https://www.marketresearchforecast.com/reports/form-builder-software-60031).
- **High-end estimate:** about $5B (2025) at 15% CAGR to about $15B by 2033. This is an outlier — [Data Insights Market / Market Research Forecast](https://www.datainsightsmarket.com/reports/online-form-builder-software-1972461)
- **Grand View Research (online survey software):** $4.5B (2025) to $15.3B by 2033 at 17.1% CAGR (2026-2033). North America had a 30.4% share, cloud 70.4% and SMEs 57.3%. Asia Pacific is the fastest-growing region. Trends named: AI survey creation and sentiment analysis, CRM/BI integration and privacy compliance. Key companies: Qualtrics, SurveyMonkey, Zoho, Alchemer, Medallia — [Grand View Research](https://www.grandviewresearch.com/industry-analysis/online-survey-software-market-report). An earlier edition of the same report gave $3.6B (2023) and 14.3% CAGR (2024-2030), according to search snippets.
- **Other survey software forecasts:** Lucintel, about $8.7B by 2030 at 11.4% CAGR — [Lucintel](https://lucintel.com/online-survey-software-market.aspx). Market Research Future, about 10.9% CAGR (2025-2034) — [MRFR](https://www.marketresearchfuture.com/de/reports/online-survey-software-market-31744). Reanin, 10.6% CAGR to about $10.06B by 2031 — [Reanin](https://www.reanin.com/reports/online-survey-software-market)
- **SurveyMonkey/Momentive:** acquired by a Symphony Technology Group-led consortium for about $1.5B in cash ($9.46/share) in 2023. This came after Zendesk's $4.1B all-stock deal (October 2021) collapsed when Zendesk shareholders voted it down — [SurveyMonkey press release](https://www.surveymonkey.com/mp/news/stg-to-acquire-momentive/); [MarTech](https://martech.org/momentive-global-surveymonkey-acquired-by-symphony-technology-group/). Wufoo is among SurveyMonkey's past acquisitions — [Wikipedia: SurveyMonkey](https://en.wikipedia.org/wiki/SurveyMonkey)
- **Typeform:** raised a $135M Series C in 2022 at a reported valuation of about $935M. Some sources say $1.1B, and one valuation tracker lists $299.1M (October 2025), which conflicts — [SiliconANGLE](https://siliconangle.com/?p=574482); [Seedtable](https://seedtable.com/companies/typeform/funding-rounds/series-c-2022-03); [Premier Alts](https://www.premieralts.com/companies/typeform/valuation)
- **Formstack:** its parent company rebranded to Intellistack in June 2025, and the Formstack product suite keeps its name. Its last listed funding was a growth equity round in November 2021 — [Caplight](https://www.caplight.com/company/formstack)
- **Tally:** bootstrapped. Reported at about $2M ARR with 150K customers (March 2025), with other reports of about $4M revenue in 2025 — [GetLatka](https://getlatka.com/companies/tally-forms)
- **AI trend evidence at Jotform:**
  - AI Agents launched in February 2025 — [Wikipedia](https://en.wikipedia.org/wiki/Jotform)
  - 750K agents and 200M sessions by March 2026 — [martechedge](https://martechedge.com/news/jotform-ai-turns-form-building-into-a-conversationno-drag-and-drop-required)
  - Conversational "Jotform AI" builder and ChatGPT app in March 2026 — [Technobezz](https://www.technobezz.com/news/jotform-chat-gpt-app)
  - Voice and SMS agent quotas in pricing — [Jotform Pricing](https://www.jotform.com/pricing/)

### Inferences
- A defensible "core" online form builder market is roughly $3B to $4B in 2025, growing about 10% to 12% a year, based on the cluster of the VMR and DataHorizzon estimates. Survey software adds a further $4B to $5B. If Jotform's revenue is about $150M to $170M, that would put it at roughly 4% to 5% of the core form builder market, possibly making it one of the largest pure-play form vendors. This rests on unverified revenue estimates and inconsistent market definitions.
- Competitive pressure comes from three directions: free bundled tools (Google Forms, Microsoft Forms), venture- and PE-backed vendors (Typeform, SurveyMonkey/STG, Formstack/Intellistack) and low-cost bootstrapped newcomers (Tally). Jotform's moves into AI agents and the ChatGPT and Canva ecosystems look like a response, extending "forms" into AI-driven data collection and customer service.

### Gaps
- I did not obtain MarketsandMarkets or Business Research Insights figures for form builders. Their pages did not surface in search.
- Market research summaries are paywalled marketing pages with opaque methods and inconsistent scope. No single figure should be treated as authoritative.
- I could not verify the exact date of the Wufoo acquisition (widely reported as 2011) from the sources retrieved.
- There is no reliable market share data for Jotform against its peers.
