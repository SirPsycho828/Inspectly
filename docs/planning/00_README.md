▸ Extended thinking (4560 chars)  
# Inspectly

## Overview

Mobile-first operations app for independent home inspectors and 1-10 person inspection firms. Replaces disconnected photo workflows, slow report writing, and manual delivery with a single inspection-to-delivery system.

The core workflow: inspector runs a checklist-driven inspection on their phone, captures findings with severity tags and annotated photos, gets AI-generated narrative language, reviews per-section and at final summary, then publishes a branded report packet accessible via secure web portal with PDF download.

**Target users**: Solo home inspectors and small firms (1-10 inspectors) doing residential property inspections.

**Wedge**: Speed and field ergonomics. Competitors (Spectora, HomeGauge) are consolidating into bulky business suites. Inspectly focuses on compressing the field-capture-to-delivery handoff -- same-day report delivery, one-handed/gloved operation, and a workflow that matches how inspectors actually justify findings to buyers and agents.

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Mobile | React Native + Expo | Mobile-first, iOS and Android |
| Backend | Firebase Cloud Functions | TypeScript, Node.js runtime |
| Database | Cloud Firestore | Offline-capable, real-time sync |
| Auth | Firebase Authentication | Email/password + Google OAuth |
| Storage | Firebase Cloud Storage | Photo uploads, generated PDFs |
| Hosting | Firebase Hosting | Report delivery portal |
| AI | Anthropic Claude API | Narrative generation from structured inputs |
| Notifications | SendGrid + Twilio | Email and SMS delivery |

## File Structure

| # | File | Description |
|---|------|-------------|
| 00 | `00_README.md` | This file -- project overview, tech stack, file map |
| 01 | `01_Auth_Roles.md` | Authentication flows, user roles, permissions |
| 02 | `02_Database_Schema.md` | Firestore collections, document shapes, indexes |
| 03 | `03_API_Endpoints.md` | Cloud Functions HTTP and callable endpoints |
| 04 | `04_UI_Design_System.md` | Colors, typography, component patterns, field ergonomics |
| 05 | `05_Mobile_Shell_Navigation.md` | App shell, tab navigation, screen flow |
| 06 | `06_Inspection_Setup.md` | Creating inspections, property details, client/agent contacts |
| 07 | `07_Checklist_Engine.md` | Checklist structure, hybrid organization, progress tracking |
| 08 | `08_Finding_Entry_Severity.md` | Defect recording, severity tags, component selection |
| 09 | `09_Photo_Capture_Annotation.md` | Camera workflow, annotation tools, anchoring to findings |
| 10 | `10_AI_Narrative_Generation.md` | Structured input to narrative text, editing, comment library |
| 11 | `11_Report_Assembly.md` | Report structure, section ordering, content compilation |
| 12 | `12_Report_Preview_Publish.md` | Interactive preview, section reviews, executive summary, publish |
| 13 | `13_Report_Delivery_Portal.md` | Branded web portal, secure access codes, PDF download |
| 14 | `14_Client_Agent_Notifications.md` | Email/SMS delivery, access codes, re-send logic |
| 15 | `15_Firm_Management.md` | Multi-inspector visibility, admin dashboard, consistency |
| 16 | `16_Branding_Configuration.md` | Logo, colors, firm identity on reports and portal |
| 17 | `17_Offline_Sync.md` | Offline field capture, sync strategy, conflict resolution |
| 18 | `18_Future_Features.md` | Deferred and post-MVP features |

## Build Sequence

Implementation follows dependency order. Each phase assumes prior phases are complete.

**Phase 1 -- Foundation**
1. `01_Auth_Roles.md` -- Auth before any data access
2. `02_Database_Schema.md` -- Data layer before features
3. `04_UI_Design_System.md` -- Design tokens before UI components
4. `05_Mobile_Shell_Navigation.md` -- App shell before feature screens

**Phase 2 -- Core Inspection Flow**
5. `06_Inspection_Setup.md` -- Create an inspection
6. `07_Checklist_Engine.md` -- Navigate the inspection
7. `08_Finding_Entry_Severity.md` -- Record what you find
8. `09_Photo_Capture_Annotation.md` -- Document with photos

**Phase 3 -- AI and Report Generation**
9. `10_AI_Narrative_Generation.md` -- Generate finding descriptions
10. `11_Report_Assembly.md` -- Compile into report
11. `12_Report_Preview_Publish.md` -- Review and publish

**Phase 4 -- Delivery**
12. `13_Report_Delivery_Portal.md` -- Client-facing portal
13. `14_Client_Agent_Notifications.md` -- Notify recipients
14. `16_Branding_Configuration.md` -- Firm branding on reports

**Phase 5 -- Scale**
15. `15_Firm_Management.md` -- Multi-inspector features
16. `17_Offline_Sync.md` -- Offline reliability

Note: `03_API_Endpoints.md` serves as a consolidated API reference built incrementally alongside feature phases.

## Key Architectural Decisions

### Mobile-First, Field-Optimized
The entire UI targets one-handed, gloved operation in the field. Large touch targets, thumb-reachable primary actions, minimal typing required. See `04_UI_Design_System.md` for ergonomic specifications.

### AI Narratives from Structured Input
Inspectors do not write free-form descriptions. They select component + condition + severity, and the AI generates professional narrative language. Ensures consistency across inspectors in a firm and dramatically speeds field capture. See `10_AI_Narrative_Generation.md`.

### Checklist-Driven with Mini-Reviews
Inspections follow a hybrid checklist (organized by area and system) that tracks progress and ensures completeness. Mini-reviews happen per completed section; a final summary review with AI-generated executive summary happens before publish. See `07_Checklist_Engine.md` and `12_Report_Preview_Publish.md`.

### Portal-First Delivery with PDF Secondary
Reports are delivered via a branded web portal as the primary experience, with PDF download available within the portal. Clients and agents receive unique access codes via email/SMS at publish time. See `13_Report_Delivery_Portal.md`.

### Offline-Capable Field Capture
Inspectors work in basements, crawl spaces, and rural properties with poor connectivity. The app captures findings, photos, and checklist progress offline and syncs when connectivity returns. See `17_Offline_Sync.md`.

### Firm Visibility Without Gating
Firm owners get after-the-fact visibility into all published reports across their team but do not gate publication. Trust-based model for v1. See `15_Firm_Management.md`.

## MVP Scope

**In scope for v1:**
- Solo inspector workflow end-to-end (setup through delivery)
- Checklist-driven field capture with findings, severity, annotated photos
- AI narrative generation from structured inputs
- Report assembly with interactive preview and section-level mini-reviews
- AI-generated executive summary (editable by inspector)
- Branded report portal with secure access codes
- Email/SMS notifications to clients and agents
- Basic firm management (after-the-fact visibility)
- Offline capture with background sync

**Deferred to post-MVP** (see `18_Future_Features.md`):
- Template/comment library import from competitors
- Integrated invoicing and payments
- Scheduling and calendar integration
- Review-before-publish approval workflow for firms
- Analytics and business dashboards
- White-label and custom domain options
- Data migration tools for switching inspectors

## Key Gaps

These gaps are flagged in detail within individual files. Top-level concerns:

1. **Tech stack confirmation** -- React Native + Expo assumed. If this should be a PWA instead, offline strategy and photo capture approach change significantly.
2. **AI cost model** -- Claude API assumed for narratives. Token usage per inspection and cost-per-report need estimation to validate pricing.
3. **SMS provider** -- Twilio assumed. No explicit specification in the PRD.
4. **Photo storage limits** -- No spec on max photos per finding or per inspection. Defaults proposed in `09_Photo_Capture_Annotation.md`.
5. **Report portal hosting** -- Firebase Hosting assumed. Custom domains per firm would change the approach.
6. **Versioned amendments** -- Post-publish report amendments are referenced in design decisions but the exact workflow is underspecified. Addressed in `13_Report_Delivery_Portal.md`.
7. **Inspection standards compliance** -- No mention of ASHI, InterNACHI, or state-specific reporting requirements. These may constrain checklist structure and report format.  
