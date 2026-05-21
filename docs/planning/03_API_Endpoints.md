# API Endpoints

## Overview

Firebase Cloud Functions serving as the backend API for Inspectly. Most data reads/writes happen directly via the Firestore SDK on the client (governed by security rules). Cloud Functions handle operations that require server-side logic: AI narrative generation, report publishing, PDF generation, access code verification, and role management.

Functions are organized as callable functions (invoked via Firebase SDK) for authenticated app operations, and HTTP functions for the unauthenticated report portal.

## Dependencies

- `01_Auth_Roles.md` -- Auth context, custom claims, portal session tokens
- `02_Database_Schema.md` -- All collection and document shapes
- `10_AI_Narrative_Generation.md` -- Narrative generation business logic
- `13_Report_Delivery_Portal.md` -- Portal access and PDF delivery
- `14_Client_Agent_Notifications.md` -- Email/SMS notification triggers

## Direct Firestore Operations (No Cloud Function Needed)

These use client SDK with security rules. No API endpoint required:

- CRUD on own inspections and subcollections (findings, checklistProgress)
- Read own user profile, update profile fields
- Read checklist templates
- Read/write own comment library entries
- Read firm details (for firm members)

## Callable Functions (Authenticated via Firebase SDK)

### User and Firm Management

| Function | Purpose | Auth |
|----------|---------|------|
| `onUserDocWrite` | **Trigger**: Syncs `role` and `firmId` from user doc to custom claims | Firestore trigger |
| `redeemFirmInvite` | Validates invite code, adds user to firm, updates user doc | Any authenticated user |
| `createFirmInvite` | Generates 6-char invite code with 7-day expiry | `firm_admin` |
| `removeFirmMember` | Removes member from firm, clears their firmId | `firm_admin` |
| `transferFirmAdmin` | Swaps admin role to target member | `firm_admin` |
| `suspendFirmMember` | Sets member status to `suspended`, revokes sessions | `firm_admin` |
| `deleteAccount` | Soft-deletes user, anonymizes published reports, revokes auth | Own account |

### AI Narrative Generation

| Function | Purpose | Auth |
|----------|---------|------|
| `generateNarrative` | Generates finding narrative from structured input | `inspector` or `firm_admin` |
| `generateExecutiveSummary` | Generates report executive summary from finding data | `inspector` or `firm_admin` |

**`generateNarrative` details**:

Input:
- `component`: string (e.g., "Water Heater")
- `condition`: string (e.g., "Corroded supply lines")
- `severity`: enum
- `context`: optional string (inspector's brief note for additional context)

Output:
- `narrative`: string (professional finding description)
- `recommendation`: string (suggested action)

Rate limit: 60 calls per user per hour [default -- PRD unspecified]. See `10_AI_Narrative_Generation.md` for prompt design and Claude API integration.

**`generateExecutiveSummary` details**:

Input:
- `inspectionId`: string

The function reads all findings from the inspection, groups by severity, and generates a summary. Returns `{ summary: string }`. See `12_Report_Preview_Publish.md`.

### Report Publishing

| Function | Purpose | Auth |
|----------|---------|------|
| `publishReport` | Snapshots inspection into report doc, generates access codes, triggers notifications | `inspector` or `firm_admin`, own inspection |
| `generateReportPdf` | Renders report to PDF, uploads to Cloud Storage | Called by `publishReport` or on-demand |
| `amendReport` | Creates new report version from existing report with changes | `inspector` or `firm_admin`, own report |
| `revokeReport` | Sets report status to `revoked`, disables all access codes | `inspector` or `firm_admin`, own report |

**`publishReport` flow**:

1. Validate inspection status is `review` and all required sections complete
2. Bake photo annotations into flat images (server-side image processing)
3. Create `reports` document with full data snapshot
4. Generate access codes for client and agent (and any additional recipients)
5. Update inspection status to `published`, set `reportId`
6. Trigger PDF generation (async -- does not block publish)
7. Trigger notification delivery to all recipients
8. Return `{ reportId, accessCodes }` (codes shown to inspector for manual sharing)

**`amendReport` details**:

Input:
- `reportId`: string
- `changes`: object with updated findings, added/removed findings, or updated executive summary

Flow:
1. Create new report doc with `version` incremented, `parentReportId` set to original
2. Set previous report status to `superseded`
3. Generate new access codes (old codes continue to work but redirect to latest version)
4. Notify recipients of amendment
5. Trigger new PDF generation

### Access Code Management

| Function | Purpose | Auth |
|----------|---------|------|
| `revokeAccessCode` | Revokes a specific access code | Own report |
| `regenerateAccessCode` | Creates new code for a recipient, revokes old one | Own report |
| `addReportRecipient` | Generates new access code and notifies additional recipient | Own report |
| `resendNotification` | Re-sends email/SMS with existing access code | Own report |

### Photo Upload

| Function | Purpose | Auth |
|----------|---------|------|
| `onPhotoUpload` | **Trigger**: Cloud Storage trigger. Generates thumbnail (400px wide), writes thumbnail URL back to finding doc | Storage trigger |

Photo upload itself uses the Firebase Storage SDK directly from the client. The Cloud Function fires on upload completion to generate the thumbnail.

### Branding

| Function | Purpose | Auth |
|----------|---------|------|
| `onBrandingLogoUpload` | **Trigger**: Validates image dimensions (min 200x200, max 2000x2000), generates sized variants | Storage trigger |

## HTTP Functions (Report Portal -- Unauthenticated)

These endpoints serve the public report portal. No Firebase Auth required -- portal sessions use custom tokens. See `01_Auth_Roles.md` for portal auth flow.

### Portal Access

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/portal/verify` | Validates access code, returns portal session token |
| GET | `/portal/report/:reportId` | Returns report data for portal display |
| GET | `/portal/report/:reportId/pdf` | Returns signed download URL for PDF |

**`POST /portal/verify`**:

Input: `{ reportId: string, code: string }`

Validation:
- Check code exists for report and is not revoked or expired
- Check failed attempt count (5 max per 15-min window)
- Check IP rate limit (20 per hour)

On success: returns `{ token: string, expiresAt: timestamp, report: ReportSummary }` where `ReportSummary` is a lightweight preview (property address, inspector name, date, finding counts).

On failure: increments `failedAttempts`, returns 401 with remaining attempts count.

**`GET /portal/report/:reportId`**:

Headers: `Authorization: Bearer <portal-session-token>`

Returns full report data for rendering. Token must match the `reportId` in the path. If report has been superseded by an amendment, returns the latest version with a note about the update.

**`GET /portal/report/:reportId/pdf`**:

Headers: `Authorization: Bearer <portal-session-token>`

Returns `{ downloadUrl: string, expiresIn: 3600 }`. The download URL is a signed Cloud Storage URL valid for 1 hour. If PDF is not yet generated (async generation still in progress), returns 202 with `{ status: "generating", retryAfter: 10 }`.

## Background Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `cleanupExpiredInvites` | Scheduled: daily | Deletes firm invite docs past expiry |
| `cleanupExpiredAccessCodes` | Scheduled: daily | Marks expired access codes |
| `cleanupDeletedAccounts` | Scheduled: weekly | Hard-deletes user data 30 days after soft delete |
| `notificationDelivery` | Pub/Sub: `notifications` topic | Processes email (SendGrid) and SMS (Twilio) delivery. Retries 3x with exponential backoff |

## Error Handling

Standard error codes across all callable functions:

| Code | Meaning |
|------|---------|
| `unauthenticated` | No valid Firebase Auth token |
| `permission-denied` | Authenticated but lacks required role or ownership |
| `not-found` | Resource does not exist |
| `failed-precondition` | Invalid state transition (e.g., publishing a draft that skipped review) |
| `resource-exhausted` | Rate limit exceeded |
| `internal` | Server error (AI API failure, PDF generation failure, etc.) |

AI-related functions (`generateNarrative`, `generateExecutiveSummary`) return `unavailable` if the Claude API is down, with a `retryAfter` field. The client should surface this as "AI is temporarily unavailable -- you can write manually or try again."

## Gaps & Assumptions

1. **PDF rendering engine** -- Not specified. Options: Puppeteer (renders HTML template to PDF server-side), or a service like `@react-pdf/renderer`. Puppeteer is heavy for Cloud Functions; may need a dedicated Cloud Run service for PDF generation.
2. **Photo annotation baking** -- `publishReport` needs to composite annotations onto images server-side. Requires an image processing library (Sharp or Canvas). Processing time for 50+ annotated photos could be significant -- may need to run as a background job rather than blocking publish.
3. **AI API key management** -- Claude API key stored in Firebase environment config or Secret Manager. Not specified which.
4. **Notification delivery tracking** -- Schema does not include a notifications collection for tracking delivery status. SendGrid and Twilio webhooks could write delivery status back, but this is unspecified. Default: fire-and-forget with retry, no delivery tracking UI in v1.
5. **Rate limits** -- Narrative generation rate limit (60/hr) is a default. Actual limit depends on Claude API costs and usage patterns.
6. **CORS** -- Portal HTTP endpoints need CORS configured for the portal hosting domain. Callable functions handle CORS automatically via Firebase SDK.  
