# Future Features (Post-MVP)

## Overview

Features explicitly deferred from v1 during the PRD process. Each entry documents what the feature is, why it was deferred, and what groundwork (if any) the v1 architecture lays for it. These are not speculative ideas -- they are features that came up during requirements gathering and were intentionally scoped out to keep the MVP focused on the core inspection-to-delivery workflow.

## Dependencies

This file references most other files in the set, as deferred features touch many parts of the system. No other file depends on this one.

## Deferred Features

### Template Import from Competitors

**What**: Import checklist templates, comment libraries, and report formats from Spectora, HomeGauge, and Horizon.

**Why deferred**: Competitor template formats are undocumented and would require reverse engineering. Inspectors have heavily customized templates built over years -- accurate import is technically complex. The switching cost is real but v1 can mitigate it with strong system defaults.

**Complexity**: High

**v1 groundwork**: The `checklistTemplates` collection (see `02_Database_Schema.md`) uses a generic section/item structure that could receive imported data. The `commentLibrary` collection is similarly generic. A future import tool would parse competitor exports and write to these collections.

**Likely approach**: Support CSV/JSON import of checklist items and comment libraries. Partner with inspectors switching from each competitor to map their export formats.

---

### Integrated Invoicing and Payments

**What**: Create and send invoices, accept credit card payments, track payment status. Inspectors currently manage this through separate tools (QuickBooks, Stripe invoicing, or paper invoices).

**Why deferred**: Payments introduce PCI compliance requirements, payment processor integration, tax handling, and refund logic. Significant scope expansion with its own set of edge cases. The inspection-to-delivery workflow is valuable without payments.

**Complexity**: High

**v1 groundwork**: The inspection document captures client contact information (see `06_Inspection_Setup.md`) which an invoicing feature would reuse. The report publish event could trigger invoice generation.

**Likely approach**: Stripe Connect integration. Inspector connects their Stripe account. Invoices generated from inspection metadata (property address, service type, amount entered by inspector). Payment link included in the report delivery email.

---

### Scheduling and Calendar Integration

**What**: Inspection booking calendar with availability management, client self-scheduling, and sync with Google Calendar / Apple Calendar.

**Why deferred**: Scheduling is a complete product domain with its own UX (availability windows, travel time between appointments, cancellation policies, booking confirmations). Several inspection-specific scheduling tools already exist. The inspection workflow starts when the inspector arrives at the property -- what happens before that is out of v1 scope.

**Complexity**: High

**v1 groundwork**: Inspection setup (see `06_Inspection_Setup.md`) captures property and client details that a scheduling system would pre-populate. The inspection creation flow could be triggered from a calendar booking.

---

### Review-Before-Publish Workflow for Firms

**What**: Firm admin can require that reports be approved before publication. Inspector submits report for review; admin reviews, requests changes, or approves; inspector publishes after approval.

**Why deferred**: The v1 firm model is trust-based with after-the-fact visibility (see `15_Firm_Management.md`). Approval workflows add complexity to the publish flow, introduce blocking dependencies (admin unavailable delays delivery), and may not match how small firms actually operate.

**Complexity**: Medium

**v1 groundwork**: The inspection `status` field supports additional states. A `"pending_review"` status between `"review"` and `"published"` would slot into the existing state machine. Firm admin already has read access to all firm reports. The notification system (see `14_Client_Agent_Notifications.md`) could deliver review requests.

---

### Advanced Analytics Dashboard

**What**: Business intelligence for inspectors and firms. Metrics including: inspections per month, average findings by severity, common defects by property type, revenue tracking (if invoicing exists), average time from start to publish, report delivery confirmation rates.

**Complexity**: Medium

**v1 groundwork**: All data needed for analytics exists in Firestore: inspections with timestamps, findings with severity and component data, reports with publish dates. The `narrativeSource` tracking (see `10_AI_Narrative_Generation.md`) enables AI usage analytics. Denormalized counts on inspection documents (see `02_Database_Schema.md`) provide quick aggregation without reading subcollections.

**Likely approach**: Firebase Analytics for app usage metrics. Custom Cloud Functions to aggregate inspection data into a `stats` collection on a nightly schedule. Dashboard screen in the mobile app.

---

### Multiple Firm Admins

**What**: Allow more than one admin per firm. Useful for firms with 5-10 inspectors where the owner and a lead inspector both need management access.

**Why deferred**: Single admin is simpler to implement and sufficient for the target firm size (1-10 people). Multi-admin introduces permission conflicts and shared responsibility for settings changes.

**Complexity**: Low

**v1 groundwork**: The role system (see `01_Auth_Roles.md`) could add a `"firm_manager"` role with a subset of admin permissions. The `adminId` field on the firm document would change to an `adminIds` array. Security rules already check role-based claims.

---

### Custom Domains for Report Portal

**What**: Firms host their report portal on a branded domain (e.g., `reports.smithinspections.com`) instead of `report.inspectly.app`.

**Why deferred**: Requires automated DNS configuration, SSL certificate provisioning per domain, and multi-tenant routing on the portal. Operational complexity is high for a v1 feature.

**Complexity**: High

**v1 groundwork**: Report branding (see `16_Branding_Configuration.md`) already customizes the visual appearance. The portal is a static web app that reads report data via API -- adding domain-based routing is an infrastructure change, not an app change.

---

### White-Label Option

**What**: Complete removal of Inspectly branding for firms that want to present the tool as their own.

**Why deferred**: Business decision (pricing tier). The "Powered by Inspectly" attribution in the default report footer (see `16_Branding_Configuration.md`) provides organic marketing.

**Complexity**: Low

**v1 groundwork**: Branding is already configurable. White-label would be a flag on the firm document that suppresses Inspectly branding in reports, emails, and the portal.

---

### Photo-Aware AI Narratives

**What**: AI analyzes finding photos to enhance narrative generation. Could identify specific brands, models, damage types, or conditions visible in the photo but not captured in the structured input.

**Why deferred**: Adds vision API costs per photo, increases narrative generation latency, and requires careful validation -- incorrect visual identification could produce misleading reports.

**Complexity**: Medium

**v1 groundwork**: The `generateNarrative` Cloud Function (see `10_AI_Narrative_Generation.md`) is the integration point. Adding a photo URL to the prompt would enable multi-modal generation. The Claude API supports vision. The finding's photo URLs are accessible when the function runs.

---

### Video Capture

**What**: Record short video clips during inspection, attached to findings. Common use case: demonstrating a running system (HVAC operation, water flow, electrical arcing).

**Why deferred**: Video storage is significantly more expensive than photos. Video in reports requires a player in the portal (photos are simple images). PDF reports cannot embed video. Adds complexity to the offline sync queue.

**Complexity**: Medium

**v1 groundwork**: The photo storage architecture (see `09_Photo_Capture_Annotation.md`) could extend to video with a similar capture/queue/upload pipeline. The `FindingPhoto` schema could become `FindingMedia` with a type discriminator.

---

### Multi-Language Reports

**What**: Generate reports in languages other than English. Primary need: Spanish-language reports in US markets with Spanish-speaking buyers.

**Why deferred**: Requires translated UI, translated system templates, and AI narrative generation in target languages. Template translation is a significant content effort.

**Complexity**: Medium

**v1 groundwork**: AI narrative generation (see `10_AI_Narrative_Generation.md`) could generate in any language by modifying the system prompt. The app UI would need i18n support (react-native-i18n or similar). Checklist templates would need translated variants.

---

### Multi-Unit Inspection Templates

**What**: Dynamic templates for multi-family properties and condos with multiple units. Template sections duplicate per unit (e.g., "Unit 1 - Kitchen", "Unit 2 - Kitchen") based on unit count entered during setup.

**Why deferred**: Requires dynamic template expansion logic and changes to the checklist engine's section structure. The current static template model works for single-unit inspections.

**Complexity**: Medium

**v1 groundwork**: The checklist engine (see `07_Checklist_Engine.md`) supports ad-hoc items and the template structure is flexible. Dynamic section duplication would be an enhancement to the setup flow (see `06_Inspection_Setup.md`).

---

### Dark Mode

**What**: Dark color theme for the mobile app.

**Why deferred**: The design system (see `04_UI_Design_System.md`) is built on a light palette optimized for outdoor visibility. Dark mode requires a complete alternate color mapping and testing of all screens.

**Complexity**: Low

**v1 groundwork**: The design system uses semantic color tokens. Mapping these to dark variants is straightforward. Severity colors would remain the same in both modes.

---

### Apple Sign-In

**What**: Sign in with Apple as an authentication option alongside email/password and Google OAuth.

**Why deferred in this list, but required before App Store submission**: Apple requires apps that offer third-party sign-in (Google OAuth) to also offer Apple Sign-In. This must be implemented before iOS App Store submission, making it effectively a v1 requirement despite being listed here.

**Complexity**: Low

**v1 groundwork**: Firebase Authentication supports Apple Sign-In as a provider. The auth flow (see `01_Auth_Roles.md`) handles any Firebase provider -- adding Apple is configuration, not architecture.

---

### Data Export

**What**: Export inspection data in standard formats (CSV, JSON, PDF archive) for record-keeping, insurance, or migration away from Inspectly.

**Complexity**: Low

**v1 groundwork**: All data is in Firestore with well-defined schemas. A Cloud Function could serialize an inspector's data into a downloadable archive.

## Prioritization Guidance

Based on user impact and implementation complexity:

| Priority | Feature | Rationale |
|----------|---------|-----------|
| Pre-launch | Apple Sign-In | App Store requirement |
| High | Integrated Invoicing | High user demand, revenue enabler |
| High | Template Import | Reduces switching friction |
| High | Review-Before-Publish | Firm feature request |
| Medium | Scheduling | Large scope but high demand |
| Medium | Analytics Dashboard | Retention driver |
| Medium | Photo-Aware AI | Differentiator |
| Low | Custom Domains | Enterprise feature |
| Low | White-Label | Pricing tier feature |
| Low | Dark Mode | Quality of life |

## Gaps & Assumptions

1. **Prioritization is preliminary** -- Based on PRD discussions, not user research or usage data. Actual prioritization should be informed by v1 user feedback and retention metrics.
2. **Effort estimates are relative** -- "Low/Medium/High" complexity is directional. Actual effort depends on team size, existing codebase state, and third-party API maturity at the time of implementation.
3. **Apple Sign-In timing** -- Listed as post-MVP but functionally required for App Store launch. Should be implemented during v1 development, before the first TestFlight build submitted to Apple.  
