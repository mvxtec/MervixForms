# Jotform Form Builder: Feature-Level Inventory (as of Nov 2026)

Research method: Jotform's own pages (features hub, help center guides, widget gallery, template gallery, AI features page, "Ultimate Guide to Online Forms" e-book) plus Jotform support-forum answers. Nearly every source is vendor-authored, so read the claims as vendor claims. Support-forum answers (jotform.com/answers) are dated and sometimes conflict with each other. Those conflicts are flagged below.

## 1. Form elements / fields and the widget gallery

### Takeaway
The builder's "Add Form Element" panel has Basic elements (subgroups Quick, Basic, Survey, Page), a Payments tab (30+ gateways) and a Widgets tab. The widget gallery has 19 categories whose counts add up to 698 listings. A widget can sit in several categories, so 698 overstates the number of unique widgets. The best estimate is several hundred unique widgets (Jotform itself says "hundreds").

### Cited Findings
**Quick Elements** — [Help: Quick overview of form fields](https://www.jotform.com/help/46-quick-overview-of-form-fields/)
- Header (heading + subheading); Full Name (first and last name fields); Email (built-in format validation); Address (multi-line postal address); Phone; Date Picker (optional time field); Appointment (booking slots, with a cap on bookings per time slot); Signature (e-signature); Fill In The Blank (inputs inline in sentence or paragraph text); Product List (the base payment/product element).

**Basic Elements** — [Help: Quick overview of form fields](https://www.jotform.com/help/46-quick-overview-of-form-fields/)
- Short Text; Long Text (textarea); Paragraph (rich-text display block with images); Dropdown; Single Choice (radio); Multiple Choice (checkbox); Number; Image (display only); File Upload; Time (hours/minutes); Captcha (Google reCAPTCHA option); Spinner (number with +/- controls); Submit button (required).

**Survey Elements** — [same source](https://www.jotform.com/help/46-quick-overview-of-form-fields/)
- Input Table (matrix/grid of inputs); Star Rating (stars, light bulbs and other shapes); Scale Rating (numeric scale).

**Page Elements** — [same source](https://www.jotform.com/help/46-quick-overview-of-form-fields/)
- Divider; Section Collapse (expandable/collapsible section); Page Break (multi-page forms; a heading on each page is recommended).

**Payments tab**
- 30+ payment gateways, including PayPal, Apple Pay/Google Pay, Square and Stripe. ACH is supported — [Ultimate Guide: The Form Builder](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
- Payment features listed on the features hub: PCI compliance; recurring donations (14 gateways); recurring subscriptions (40+ gateway integrations); ACH payments; eCheck.Net; Payment Sandbox (test) mode; coupons/promo codes — [Jotform Features](https://www.jotform.com/features/)
- The gateway counts conflict across Jotform pages: 30+ in the e-book and 40+ on the subscriptions card — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/); [Features](https://www.jotform.com/features/)

**Field-level properties**
- File Upload: accepts any file type (an asterisk wildcard allows all types; examples include PDF, DOCX, XLSX, CSV, JPG, PNG, MP4, ZIP). You can set a maximum number of files and file size limits, and route uploads to third-party storage such as Google Drive — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
- Short Text / Long Text validation dropdown: Alphabetic, AlphaNumeric, Cyrillic, Email, Numeric (per 2017–2018 support answers; may be outdated) — [Answer 1323162](https://jotform.com/answers/1323162-can-i-use-data-validation-to-disallow-commas-and-semicolons); [Answer 1401365](https://www.jotform.com/answers/1401365-How-to-add-validations)
- Input Mask syntax: `@` = letter, `#` = digit, `*` = either. Input Table does not support masks. Validation beyond masks (for example, rejecting all-numeric values) requires custom JavaScript — [Answer 4268495](https://jotform.com/answers/4268495-input-mask-how-to-allow-the-combination-of-letters-and-numbers-but-prevent-the-numbers-only)
- "Unique field" setting (no duplicate values across submissions) is available on Email, Short Text, Dropdown and Number — [Help 223: Form limits based on a unique field](https://www.jotform.com/help/223-how-to-set-form-limits-based-on-a-unique-field/)
- Answer piping (insert earlier answers into later labels/text) — [Features](https://www.jotform.com/features/)

**Widget gallery** — [jotform.com/widgets](https://www.jotform.com/widgets/)
- Category counts: Other 144; Pickers 79; Select Boxes 68; Rich Content 58; Mapping 51; Verification 42; Calculation 38; Multiple Entries 30; Photo 29; Analytics 28; Survey 27; Video 20; File Upload 17; Text Editor 15; Heading 13; Social 13; Drawing 11; Audio 9; Signature 6. Total 698, with overlaps.
- Featured widgets: Calendly (business), Clearout Email Validation (verification), Loom Video Recorder (video).
- Widgets shown prominently in the gallery listing (the Newest/Popular sort state was not confirmed): Form Calculation, Configurable List, Multiple Text Fields, Terms & Conditions, Take Photo, Signature, Checklist, Dynamic Textbox, Add Options, Data Grid, PDF Embedder, Dynamic Dropdowns, Inventory, Multiple Selection, Matrix Dynamique, Image Slider, Unique ID, Spreadsheet, Date Picker, Field Multiplier, Spreadsheet to Form, YouTube, Fit Text, Form Tabs.
- Configurable List is among Jotform's "Popular Guides" in the help center, which signals heavy use — [Help center](https://www.jotform.com/help/)
- Other widget examples: Take Photo, Image Gallery, Spreadsheet to Form — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
- Some widgets are removed when a form is switched from Card to Classic — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
- An older support answer says the Widgets tab was at one point renamed "More fields" and held about 380 items — [Answer 1006868](https://www.jotform.com/answers/1006868-More-Fields-has-less-than-380-items)
- The features hub counts 16 "Form Fields" features, 21 "Form Builder" features and 39 "Advanced Form Options" features, without itemizing them — [Features](https://www.jotform.com/features/)

### Inferences
- A comparable product needs about 30 native field types across the Quick, Basic, Survey and Page groups, plus a payments abstraction and a plugin (widget) SDK. The widget long tail (pickers, select boxes, verification, mapping) is where much of Jotform's breadth comes from.
- Validation is per-field (dropdown presets plus a mask DSL). It is not a general regex engine without custom code.

### Gaps
- No authoritative count of unique widgets, and no live "most popular" ranking.
- No current official list of every field-level property (min/max, character limits, sublabels, read-only, default values, hover text). I believe these exist but did not verify them on a current page.
- I did not confirm a dedicated "Gender" field or other newer elements.

## 2. Layouts: Classic vs Card, multi-page, Form Designer, themes, CSS, branding

### Takeaway
There are two layouts. Classic shows all fields, with optional page breaks. Card shows one question per page and is marketed as "conversational forms". Styling happens in the Form Designer (colors, fonts, themes, Theme Store) and through custom CSS. An Advanced Designer for Classic forms adds layout, cover page and label controls.

### Cited Findings
- Card Forms present one question at a time, marketed as "Conversational Forms" — [Features](https://www.jotform.com/features/); [Form Templates](https://www.jotform.com/form-templates/)
- The template gallery filters by Form Layout: Classic or Card — [Form Templates](https://www.jotform.com/form-templates/)
- Multi-page forms use the Page Break element, and skip logic can jump to or hide pages — [Help 46](https://www.jotform.com/help/46-quick-overview-of-form-fields/); [Help 57](https://www.jotform.com/help/57-smart-forms-using-conditional-logic/)
- Form Designer:
  - Colors: preset schemes, custom hex values for page, form and font colors, and a background image (upload or URL).
  - Styles: form width, font, font size, Submit button style, and custom CSS injection.
  - Themes: free and paid themes, favorites, and a Theme Store.
  - Layout: Classic/Card toggle.
  - Advanced Designer (Classic only): color schemes, form layout, cover page, label alignment, line layout, and a CSS tab.
  - Source: [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
- Custom CSS can style fields, widgets and layout. "Customizing Your Form Using CSS Codes" and "Injecting Custom CSS Codes" are among the most popular help guides — [Features](https://www.jotform.com/features/); [Help center](https://www.jotform.com/help/)
- The AI "Design Forms" feature generates themes from a text idea or from images and syncs a website's colors — [Jotform AI features](https://www.jotform.com/ai/features/)
- White Labeling (branding removal) and Custom Domains are listed as feature/Enterprise pages — [Features](https://www.jotform.com/features/); [AI features](https://www.jotform.com/ai/features/); [Help center](https://www.jotform.com/help/)
- A card form can be embedded as a floating feedback button — [Help 511](https://www.jotform.com/help/511-How-to-Embed-a-Card-Form-as-a-Floating-Feedback-Button)

### Inferences
- The data model should keep the field list layout-agnostic and render it as either Classic or Card. Widget compatibility then has to be tracked per layout.

### Gaps
- I did not verify which plan removes the "Powered by Jotform" badge. Historically this is the paid tiers, with full white-labeling on Enterprise; this is unconfirmed.
- I did not enumerate Card-specific settings (progress bar, transitions, welcome page).

## 3. Conditional logic

### Takeaway
There are six condition types. Each is an IF/THEN rule built in Settings > Conditions. The official guide does not list comparison operators or ANY/ALL semantics.

### Cited Findings
- The six types — [Help 57: Smart forms using conditional logic](https://www.jotform.com/help/57-smart-forms-using-conditional-logic/)
  1. Show/Hide Field
  2. Update/Calculate Field
  3. Enable/Require/Mask Field
  4. Skip To/Hide a Page
  5. Change Thank You Page
  6. Change E-mail Recipient
- Update/Calculate has its own formula menu — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
- Conditions can route emails and vary thank-you messages — [Features](https://www.jotform.com/features/)
- Jotform AI's "Build Conditions" creates logic (show/hide, skip pages, route emails, update fields, custom thank-you pages) from natural-language prompts — [AI features](https://www.jotform.com/ai/features/)
- User comments on the guide mention a limit of about 180 conditions and complaints that conditions are hard to reorder. Both are unverified — [Help 57](https://www.jotform.com/help/57-smart-forms-using-conditional-logic/)

### Inferences
- A rule engine should support: rule list → condition set (field, operator, value) → action list. Action types are visibility, value/formula, state (enable, disable, require, mask), page navigation, thank-you selection and email recipient.

### Gaps
- I could not confirm the official operator list on a primary page. From my prior knowledge (unverified here), the operators are: Is Equal To, Is Not Equal To, Contains, Does Not Contain, Starts/Ends With, Is Empty, Is Filled, Less/Greater Than, Before/After (dates), plus ANY/ALL linking and multiple actions per rule. Verify these before using them in a spec.

## 4. Calculations, hidden fields, prefill, unique IDs, validation, spam, limits, save-and-continue, translation, accessibility

### Takeaway
Most of these are configured either as form settings (Settings > Form Settings > Show More Options) or as widgets (Form Calculation, Unique ID).

### Cited Findings
- Form Calculation and Unique ID are both widgets in the gallery — [Widgets](https://www.jotform.com/widgets/)
- Calculation widget category: 38 widgets — [Widgets](https://www.jotform.com/widgets/)
- Hidden fields can be shown or hidden through conditional logic — [Features](https://www.jotform.com/features/)
- Prefill:
  - Pre-populate fields from previous submissions, other forms or Excel files — [Features](https://www.jotform.com/features/)
  - Publish > Prefill pulls from CRMs (Salesforce, Airtable, HubSpot), Jotform Tables, SSO servers or other forms — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
- Spam protection:
  - Captcha element and Google reCAPTCHA — [Help 46](https://www.jotform.com/help/46-quick-overview-of-form-fields/); [Features](https://www.jotform.com/features/)
  - Email validation / confirmation (verification codes); the Verification widget category has 42 entries — [Features](https://www.jotform.com/features/); [Widgets](https://www.jotform.com/widgets/)
- Form limits / scheduling ("Form Limiter"): auto-disable the form at a submission limit or on an expiration date — [Form Limiter](https://www.jotform.com/features/limit-form-submissions/)
- Enable/disable form is a feature page — [Features](https://www.jotform.com/features/)
- Unique Submission setting has three modes: No Check; Check Cookies (same browser); Check Cookies and IP ("Strict Check") — [Help 64](https://www.jotform.com/help/64-how-to-set-unique-submissions-on-a-form/)
- Unique field limits are a separate feature — [Help 223](https://www.jotform.com/help/223-how-to-set-form-limits-based-on-a-unique-field/)
- Save and Continue Later:
  - Enabled under Form Settings > Show More Options — [Help 227](https://www.jotform.com/help/227-how-to-enable-autofill-on-forms/)
  - Not supported with: Appointment element, Unique ID, Inventory, Weekly Appointment Planner and Gift Registry widgets — [Help 227](https://www.jotform.com/help/227-how-to-enable-autofill-on-forms/)
  - A third-party source says the form needs 4+ fields (unverified) — [ContentSnare](https://contentsnare.com/jotform-save-and-continue/)
- Other general settings:
  - Form title, enable/disable, data encryption toggle, language, password protection, translation, allow respondents to edit submissions, save & continue, SSO login (Enterprise) — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
  - The AI "Edit Form Settings" can change titles, availability, passwords and save-and-continue — [AI features](https://www.jotform.com/ai/features/)
- Multilingual forms:
  - Settings > Form Languages adds languages, and respondents choose one from a dropdown. Marketing claims 130+ languages — [Help 298](https://www.jotform.com/help/298-How-to-Make-Your-Forms-Multilingual)
  - Whether translation is automatic is disputed. A 2023 support answer says translations must be entered manually — [Answer 16524061](https://jotform.com/answers/16524061-can-the-dropdown-list-be-in-english-how-to-enable-automatic-translation); [Answer 39398191](https://www.jotform.com/answers/39398191-how-to-use-the-language-and-translation-feature)
- Accessibility:
  - Settings > Show More Options > Form Accessibility turns on a checker. The builder then flags fields that are not compliant with Section 508 / WCAG 2.1 A/AA. The checker is advisory and does not block editing — [Help 592](https://jotform.com/help/592-how-can-i-make-my-forms-accessible); [Accessible forms FAQ](https://jotform.com/help/603-accessible-forms-frequently-asked-questions)
  - The VPAT (March 2024) states testing against WCAG 2.2 AA — [VPAT](https://jotform.com/accessible-forms/vpat.pdf)
  - 2018–2019 support answers said there was no WCAG certification. They predate the Accessible Forms launch — [Answer 1190095](https://www.jotform.com/answers/1190095-wcag-20-compliancy)
- HIPAA forms and "Secure Forms" are listed; the Security category has 9 features — [Features](https://www.jotform.com/features/)
- Encryption limits some features: for example, PDF download from the submissions table is unavailable on encrypted forms (print only) — [Answer 39405271](https://www.jotform.com/answers/39405271-jotform-tables-the-download-pdf-option-is-not-showing)

### Inferences
- Save-and-continue and unique-ID or inventory widgets conflict because both depend on server-side state. A rebuild should design partial-submission storage with that in mind.

### Gaps
- I did not fetch a primary source for URL-parameter prefill syntax (`?fieldname=value`) or for hidden-field behavior. Jotform is widely known to support both, but neither is verified here.
- Not verified: Form Calculation widget function list; Unique ID format options; whether a scheduled open date (not only expiry) exists.

## 5. Publishing and distribution

### Takeaway
The Publish tab offers Quick Share (link, email, social), Embed (several code types), Assign Form, Email (with reminders), Prefill, PDF, Platforms (30+ site builders), Apps, QR code, iFrame and WordPress. Kiosk mode and offline collection live in the mobile app.

### Cited Findings
- Publish tab — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
  - Quick Share: copy link, email, social.
  - Embed: HTML/JS code, lightbox popup and scroll-along feedback tab.
  - Assign Form: by email (single addresses or CSV), by shareable link with an expiration date, or org-wide (Enterprise).
  - Email: invitations with scheduled reminders (daily, weekly, monthly). Starter (free) is capped at 10 email invitations per form.
  - Prefill.
  - PDF: download a fillable PDF of the form. Design changes to the PDF also change the web form.
  - Platforms: code for 30+ website platforms.
  - Apps: bundle forms into a no-code mobile app.
  - QR code, iFrame, WordPress.
- Floating Feedback Button (Publish > Embed), customizable title, icon and colors — [Help 511](https://www.jotform.com/help/511-How-to-Embed-a-Card-Form-as-a-Floating-Feedback-Button)
- Lightbox embeds as a button and can auto-open on page load; Popup is similar but triggered by a text link — [Answer 13203693](https://jotform.com/nl/answers/13203693-how-to-embed-forms-as-popups-or-lightboxes)
- Guidance on choosing an embed code (JS vs iFrame vs source) — [Help 67](https://www.jotform.com/help/67-which-form-embed-code-should-i-use)
- Platform-specific embed instructions exist (e.g. Tumblr: Platforms > Copy Code; iframe fallback) — [Help 54](https://www.jotform.com/help/54-how-to-embed-your-form-to-your-website/)
- QR code forms — [Features](https://www.jotform.com/features/)
- Offline Forms: collect responses offline in the mobile app and sync when back online — [Features](https://www.jotform.com/features/)
- Kiosk mode: the Jotform Mobile Forms app includes kiosk mode and mobile form editing; push notifications for new submissions — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
- Embeddable Form Builder (embed the builder itself in your own product) and Website Widgets (launched July 2026) — [Features](https://www.jotform.com/features/); [Product Hunt](https://www.producthunt.com/products/jotform/launches/jotform-website-widgets)
- The Form Sharing feature category has 7 features — [Features](https://www.jotform.com/features/)

### Gaps
- I did not obtain an exhaustive list of the 30+ named platforms (Wix, Squarespace, Shopify and others are likely). Shopify editing and submission viewing appear in recent help guides — [Help center](https://www.jotform.com/help/)

## 6. Submissions management

### Takeaway
Jotform Inbox (2.0) is the main submission manager. It supports search and filters, tags, comments, sharing, edit/resubmit, PDF print or download, and CSV/Excel/PDF export. It works alongside Jotform Tables (spreadsheet view) and the PDF Editor (PDF templates).

### Cited Findings
- Inbox — [Inbox product](https://www.jotform.com/products/inbox/); [Help: Download submissions in Inbox](https://www.jotform.com/help/how-to-download-submissions-in-your-inbox/); [Inbox 2.0 announcement](https://www.jotform.com/blog/announcing-jotform-inbox-2-0)
  - Export to CSV, Excel or PDF, including file-upload attachments, as single, bulk or filtered downloads.
  - Print in one click.
  - Edit a submission by reopening the original form and resubmitting.
  - Share the inbox by link or email invite, or add collaborators in bulk by CSV, with edit or comment permissions.
  - Comment and @-mention teammates by email.
  - Advanced search by field value, submission ID, IP or tag.
- Export forms as HTML and submissions as CSV, Excel or PDF, with uploads in a ZIP — [Features](https://www.jotform.com/features/)
- Notifications:
  - Notification emails, autoresponders (can attach files), custom emails, and Digest Emails (scheduled summaries) — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/); [Features](https://www.jotform.com/features/)
  - WhatsApp alerts — [Features](https://www.jotform.com/features/)
  - The Notifications feature category has 10 features — [Features](https://www.jotform.com/features/)
  - AI "Generate Emails" creates and styles notification and autoresponder emails — [AI features](https://www.jotform.com/ai/features/)
- PDF:
  - Drag-and-drop PDF Editor builds a customizable "PDF Submission Report". It opens from the Builder, Inbox, Tables, Apps, Workflows or Reports. The PDF can be sent to integrations or shown on the Thank You page — [Help 555](https://www.jotform.com/help/555-applying-form-submission-data-into-a-pdf-document/)
  - "Original PDF" download keeps the uploaded PDF's layout with the data filled in — [Help 881](https://www.jotform.com/help/881-how-to-download-submissions-in-original-pdf-layout/)
- Approvals:
  - Approval flows (formerly Approvals, now Jotform Workflows) support single or group approvers, conditional approve/deny paths and signature steps, with 100+ templates — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
  - Workflows also support scheduled reminder emails — [Help center](https://www.jotform.com/help/)
- Data retention: auto-delete submissions from the Jotform account after forwarding them to email, Inbox, Tables or apps — [Enterprise Data](https://www.jotform.com/enterprise/features/forms/data/)
- AI Data Assistant: summarize submissions, translate fields, visualize data, export filtered data as CSV, PDF or Excel — [Data Assistant](https://www.jotform.com/ai/data-assistant/features/visualize-submissions/)
- Visual Report Builder: bar and pie charts and submission grids — [Features](https://www.jotform.com/features/)

### Gaps
- Retention period options and timing for auto-delete were not found.

## 7. Form analytics

### Takeaway
Built-in Form Analytics covers views, responses, response and conversion rate on a timeline, traffic sources, platforms, devices, browsers, OS and locations. Google Analytics and GTM tracking can be added.

### Cited Findings
- Metrics: views, responses, response rate (timeline dashboard), conversion rate, traffic sources, technology platforms, devices, browsers and operating systems, locations — [Form Analytics](https://www.jotform.com/form-analytics/)
- Google Analytics / Tag Manager tracking of submissions, fields and thank-you pages — [Features](https://www.jotform.com/features/)
- The Analytics category has 6 features — [Features](https://www.jotform.com/features/)

### Gaps
- The analytics page does not mention field-level drop-off, abandonment or average completion time. Whether those exist is unverified.

## 8. Templates, AI and import

### Takeaway
Jotform advertises 20,000+ form templates across about 80 type categories plus industry categories. Classic and Card are filterable, and there are separate PDF, Sign, App, Workflow, Table, Board, AI Agent and Store template libraries. Jotform AI in the builder spans creating, editing and designing forms, settings, emails, conditions, previews and sharing, through a "Workspace Assistant". Forms can be created from files, images or URLs, and there is a Google Forms migration tool.

### Cited Findings
- 20,000+ form templates — [Form Templates](https://www.jotform.com/form-templates/); [Features](https://www.jotform.com/features/)
- Largest categories — [Form Templates](https://www.jotform.com/form-templates/)
  - Survey 28,118; Business 14,962; Request 14,051; Education 13,714; Application 9,445; Order 9,088; Report 8,773; Questionnaire 8,403; Registration 8,330; Checklist 7,229; Inspection 7,113; Consent 6,413; Tracking 5,808; Assessment 5,692.
  - About 80 more categories follow, down to Thanksgiving 42 and Summer Camp Surveys 20.
  - Category counts overlap and sum to more than 20,000.
- Other template libraries: Fillable PDF (48), PDF templates, Sign, App, Workflow, AI Agent, Board, Table, Store Builder — [Form Templates](https://www.jotform.com/form-templates/)
- Jotform AI features in the builder — [AI features](https://www.jotform.com/ai/features/)
  - Workspace Assistant.
  - Create Forms from a description, uploaded files or images, or an imported URL.
  - Edit Forms via natural language.
  - Design Forms: themes from an idea or images, website color sync.
  - Edit Form Settings.
  - Generate Emails.
  - Build Conditions.
  - Preview Forms (creates test submissions).
  - Share Forms (permissions, visibility, invites).
- AI products listed: AI Form Builder, AI App Builder, AI Data Assistant. Connectors: ChatGPT App, Claude App, MCP — [Features](https://www.jotform.com/features/)
- ChatGPT app marketplace launch (March/April 2026): build and edit forms and analyze submissions inside ChatGPT — [Press release](https://digital-release.wowktv.com/business/press-releases/cision/20260331SF22595/jotform-launches-in-chatgpt-app-marketplace-for-ai-powered-form-creation-and-insights)
- Claude app (May 2026) — [Claude features](https://form.jotform.com/claude/features/)
- One secondary source claims "Jotform AI" launched March 24, 2026. This conflicts with the AI Form Generator's much earlier existence and probably refers to a rebrand or relaunch, so treat it as unverified — [briefglance](https://briefglance.com/companies/jotform-inc/pulses/34320)
- Import:
  - Migrate Google Forms tool (forms and submissions) — [Import Google Forms app](https://jotform.com/apps/import-google-forms)
  - PDF to fillable online form via Smart PDF Forms. Page limits are 25 pages (Starter, Bronze, Silver) and 50 pages (Gold, Enterprise). Only fields are imported, not the PDF's design — [Help 605](https://www.jotform.com/help/605-how-to-use-and-get-the-best-out-of-jotform-smart-pdf-forms/)
  - Import App for importing submission data from CSV or Excel — [Answer 604027](https://www.jotform.com/answers/604027-can-we-import-a-google-doc-form-to-make-it-a-jot-form-editable-pdf-form)
- Some users report that the AI assistant overwrote an existing form instead of creating a new one. The undo path is Revision History — [Answer 40193911](https://www.jotform.com/answers/40193911-form-builder-ai-overwriting-existing-form-instead-of-creating-new-one)

### Gaps
- No exact live total of form templates, only "20,000+".
- No confirmed list of importers from Typeform, SurveyMonkey or Microsoft Forms.

## 9. Collaboration, assignees, roles and versioning

### Takeaway
Collaboration features: real-time co-editing via session links, Jotform Teams workspaces, multiple users and roles (Enterprise), assigning forms to fillers, and shared inboxes with permissions. The Form Builder has a Revision History with restore. App Builder and Workflow Builder do not.

### Cited Findings
- Real-time co-editing — [Ultimate Guide](https://www.jotform.com/books/the-ultimate-guide-to-online-forms/the-form-builder/)
  - A shared session link lets others edit at the same time.
  - Guests need no account but cannot use the Publish tab.
  - Session links expire after 72 hours.
- Jotform Teams, Multiple Users and Assign Forms are listed on the features hub; the Collaboration category has 16 features — [Features](https://www.jotform.com/features/)
- Inbox collaborators get edit or comment permissions — [Inbox FAQ](https://www.jotform.com/features/inbox/faq/)
- Revision History — [Help: Restore previous version](https://www.jotform.com/help/how-to-restore-your-previous-published-version-from-revision-history)
  - Build tab > clock icon > ⋯ > Restore.
  - Restoring in Draft Mode discards later edits and becomes the working draft. The help page's title ("Restore Your Previous Published Version") implies a draft/published split.
- Restoring a revision can bring back removed fields and their linked submission columns — [Answer 1096231](https://www.jotform.com/answers/1096231-Using-the-Form-Revision-History-tool)
- App Builder has no revision history — [Answer 40377821](https://www.jotform.com/answers/40377821-app-version-restore-recover-previous-version-replaced-by-ai-assistant)
- Users report the revision panel sometimes fails to load — [Answer 40365961](https://www.jotform.com/answers/40365961-form-history-unable-to-load-and-restore-previous-versions)

### Gaps
- The exact Teams role names and permissions (e.g. Admin, Creator, Data Collaborator) were not verified on a primary page during this research.
- How draft vs published versioning works (when a draft becomes live) is not fully documented in the sources found.
