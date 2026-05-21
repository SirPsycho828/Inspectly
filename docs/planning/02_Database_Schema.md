▸ Extended thinking (3054 chars)  
# Database Schema

## Overview

Firestore collections for Inspectly. The schema centers on the inspection lifecycle: an inspector creates an inspection, works through checklist items recording findings with photos, then publishes a report snapshot. Published reports are immutable -- amendments create new versions.

All documents include `createdAt` and `updatedAt` timestamps unless noted. These are omitted from the field tables below.

## Dependencies

- `01_Auth_Roles.md` -- Custom claims mirror role and firmId from user documents
- `13_Report_Delivery_Portal.md` -- Access code verification and portal session logic
- `07_Checklist_Engine.md` -- Checklist template structure and progress tracking

## Collections

### `users`

**Purpose**: Inspector and firm admin profiles. Created during onboarding.

| Field | Type | Notes |
|-------|------|-------|
| `displayName` | string | |
| `email` | string | |
| `phone` | string | Optional |
| `role` | `"inspector"` \| `"firm_admin"` | Synced to custom claims via Cloud Function |
| `firmId` | string \| null | Reference to `firms` doc |
| `licenseNumber` | string | Display only, not validated externally |
| `profilePhotoUrl` | string \| null | |
| `onboardingComplete` | boolean | |
| `status` | `"active"` \| `"suspended"` \| `"deleted"` | |
| `deletedAt` | timestamp \| null | Soft delete |

**Access**: Own document read/write. Firm admin can read members where `firmId` matches.

---

### `firms`

**Purpose**: Inspection firm entity. Created by the first firm admin.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | |
| `adminId` | string | Reference to `users` doc, the current firm admin |
| `memberIds` | string[] | All inspector user IDs including admin |
| `memberCount` | number | Denormalized for display |
| `branding` | Branding | See shape below |
| `status` | `"active"` \| `"inactive"` | |

**Branding shape** (embedded object):
| Field | Type | Notes |
|-------|------|-------|
| `logoUrl` | string \| null | Uploaded to Cloud Storage |
| `primaryColor` | string | Hex, defaults to Inspectly teal `#0D9488` |
| `companyPhone` | string | Appears on reports |
| `companyEmail` | string | Appears on reports |
| `companyWebsite` | string \| null | |
| `reportFooterText` | string | Custom footer line on reports |

See `16_Branding_Configuration.md` for branding management details.

**Access**: Firm admin full read/write. Firm members read-only.

---

### `firms/{firmId}/invites`

**Purpose**: Invite codes for joining a firm.

| Field | Type | Notes |
|-------|------|-------|
| `code` | string | 6-char alphanumeric |
| `expiresAt` | timestamp | 7 days from creation |
| `usedBy` | string \| null | User ID who redeemed |
| `usedAt` | timestamp \| null | |

**Access**: Firm admin create/read. Validated by Cloud Function on redemption.

---

### `inspections`

**Purpose**: Core inspection record. One per property visit.

| Field | Type | Notes |
|-------|------|-------|
| `inspectorId` | string | Reference to `users` |
| `firmId` | string \| null | Denormalized from inspector's firmId at creation |
| `status` | `"draft"` \| `"in_progress"` \| `"review"` \| `"published"` | |
| `property` | PropertyInfo | See shape below |
| `clientEmail` | string | Set during inspection setup |
| `clientName` | string | |
| `clientPhone` | string \| null | |
| `agentEmail` | string \| null | Buyer's agent |
| `agentName` | string \| null | |
| `additionalRecipients` | Recipient[] | Extra emails for report delivery |
| `templateId` | string | Reference to `checklistTemplates` used |
| `checklistProgress` | ProgressSummary | Denormalized counts |
| `findingCounts` | FindingCounts | Denormalized severity counts |
| `startedAt` | timestamp \| null | When inspector began on-site |
| `completedAt` | timestamp \| null | When all sections marked done |
| `publishedAt` | timestamp \| null | |
| `reportId` | string \| null | Reference to `reports` after publish |

**PropertyInfo shape**:
| Field | Type | Notes |
|-------|------|-------|
| `address` | string | Full street address |
| `city` | string | |
| `state` | string | 2-letter code |
| `zip` | string | |
| `propertyType` | `"single_family"` \| `"condo"` \| `"townhouse"` \| `"multi_family"` | |
| `yearBuilt` | number \| null | |
| `squareFootage` | number \| null | |

**ProgressSummary shape**: `{ total: number, completed: number, skipped: number }`

**FindingCounts shape**: `{ critical: number, major: number, minor: number, informational: number }`

**Indexes**:
- `inspectorId` + `status` (inspector's active/past inspections)
- `firmId` + `publishedAt` desc (firm admin dashboard)

**Access**: Inspector owns. Firm admin reads where `firmId` matches. No cross-inspector editing.

---

### `inspections/{inspectionId}/findings`

**Purpose**: Individual defects, observations, or informational notes recorded during inspection.

| Field | Type | Notes |
|-------|------|-------|
| `checklistItemId` | string | Which checklist item this finding belongs to |
| `sectionId` | string | Denormalized for section-level queries |
| `component` | string | e.g., "Water Heater", "Main Panel" |
| `condition` | string | e.g., "Corroded", "Improper installation" |
| `severity` | `"critical"` \| `"major"` \| `"minor"` \| `"informational"` | |
| `narrative` | string | AI-generated or manually written description |
| `narrativeSource` | `"ai"` \| `"manual"` \| `"ai_edited"` | Tracks origin for quality analysis |
| `recommendation` | string | Suggested action |
| `photos` | FindingPhoto[] | Max 10 per finding. See shape below |
| `order` | number | Display order within the checklist item |

**FindingPhoto shape**:
| Field | Type | Notes |
|-------|------|-------|
| `storageUrl` | string | Full-resolution in Cloud Storage |
| `thumbnailUrl` | string | 400px wide thumbnail |
| `caption` | string | Optional |
| `annotations` | Annotation[] | Drawing annotations on the photo |
| `takenAt` | timestamp | EXIF or capture time |
| `order` | number | Display order |

**Annotation shape**:
| Field | Type | Notes |
|-------|------|-------|
| `type` | `"arrow"` \| `"circle"` \| `"rectangle"` \| `"text"` | |
| `x` | number | Percentage of image width (0-100) |
| `y` | number | Percentage of image height (0-100) |
| `width` | number \| null | For rectangle |
| `height` | number \| null | For rectangle |
| `endX` | number \| null | For arrow |
| `endY` | number \| null | For arrow |
| `radius` | number \| null | For circle, percentage of image width |
| `color` | string | Hex, default `#EF4444` (red) |
| `text` | string \| null | For text annotations |

**Access**: Same as parent inspection.

---

### `inspections/{inspectionId}/checklistProgress`

**Purpose**: Per-item progress tracking during an inspection.

| Field | Type | Notes |
|-------|------|-------|
| `sectionId` | string | |
| `itemLabel` | string | Denormalized for offline display |
| `status` | `"pending"` \| `"inspected"` \| `"skipped"` \| `"not_applicable"` | |
| `findingCount` | number | Denormalized count of findings linked to this item |
| `inspectedAt` | timestamp \| null | |

Document ID matches the checklist item ID from the template.

**Access**: Same as parent inspection.

---

### `reports`

**Purpose**: Published report snapshot. Immutable after creation -- amendments create new versions.

| Field | Type | Notes |
|-------|------|-------|
| `inspectionId` | string | Source inspection |
| `inspectorId` | string | |
| `firmId` | string \| null | |
| `version` | number | Starts at 1, increments on amendment |
| `parentReportId` | string \| null | Previous version, null for original |
| `status` | `"active"` \| `"superseded"` \| `"revoked"` | |
| `property` | PropertyInfo | Snapshot from inspection |
| `inspectorName` | string | Snapshot (survives account deletion) |
| `firmName` | string \| null | Snapshot |
| `branding` | Branding | Snapshot of firm branding at publish time |
| `executiveSummary` | string | AI-generated and/or inspector-edited |
| `sections` | ReportSection[] | Ordered array of report content |
| `findingCounts` | FindingCounts | Severity summary |
| `totalPhotos` | number | |
| `pdfUrl` | string \| null | Generated PDF in Cloud Storage |
| `pdfGeneratedAt` | timestamp \| null | |
| `publishedAt` | timestamp | |

**ReportSection shape**: `{ sectionId: string, title: string, findings: ReportFinding[] }`

**ReportFinding shape**: Flattened snapshot of the finding at publish time -- `component`, `condition`, `severity`, `narrative`, `recommendation`, `photos` (URLs only, annotations baked into image).

Reports are self-contained snapshots. They do not reference live inspection data. This ensures report integrity even if the source inspection is later modified or deleted.

**Access**: Inspector who published. Firm admin where `firmId` matches. Portal access via access code (see below).

---

### `reports/{reportId}/accessCodes`

**Purpose**: Access codes for client/agent portal viewing.

| Field | Type | Notes |
|-------|------|-------|
| `code` | string | 6-char alphanumeric, no ambiguous characters |
| `recipientEmail` | string | |
| `recipientName` | string | |
| `recipientType` | `"client"` \| `"agent"` \| `"other"` | |
| `failedAttempts` | number | Reset after 15-min lockout window |
| `lockedUntil` | timestamp \| null | |
| `lastAccessedAt` | timestamp \| null | |
| `revokedAt` | timestamp \| null | |
| `expiresAt` | timestamp | 90 days from report publish |

See `01_Auth_Roles.md` for access code verification flow.

**Access**: Inspector who published (full CRUD). Cloud Function validates on portal entry.

---

### `checklistTemplates`

**Purpose**: Reusable checklist structures. System-provided defaults plus inspector-created custom templates.

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | e.g., "Standard Residential", "Condo" |
| `ownerId` | string \| `"system"` | `"system"` for built-in templates |
| `firmId` | string \| null | Firm-level shared templates |
| `sections` | TemplateSection[] | Ordered sections |
| `isDefault` | boolean | Used when no template is explicitly selected |

**TemplateSection shape**: `{ id: string, title: string, items: TemplateItem[] }`

**TemplateItem shape**: `{ id: string, label: string, component: string, description: string | null }`

See `07_Checklist_Engine.md` for hybrid organization (by area and system).

**Access**: System templates readable by all. Custom templates by owner or firm members.

---

### `commentLibrary`

**Purpose**: Saved narrative fragments for reuse. Inspectors build a personal library over time; firms can share entries.

| Field | Type | Notes |
|-------|------|-------|
| `ownerId` | string | |
| `firmId` | string \| null | If set, visible to all firm members |
| `component` | string | Matches component values in findings |
| `condition` | string | |
| `severity` | string | |
| `narrative` | string | The saved text |
| `useCount` | number | Tracks popularity for sorting |

See `10_AI_Narrative_Generation.md` for how the comment library integrates with AI generation.

**Access**: Owner or firm members if `firmId` is set.

## Gaps & Assumptions

1. **Photo storage cost** -- No max photos per inspection specified. Assumed max 10 per finding, but a 200-item checklist with 5 findings each at 10 photos = 10,000 photos. Storage rules or UI limits may be needed.
2. **Report snapshot size** -- Large inspections could produce hefty report documents. Firestore's 1MB document limit may require splitting `sections` into a subcollection for very large reports.
3. **Annotation baking** -- Schema assumes annotations are baked into images at publish time (report photos are flat images, not interactive). The baking process needs to happen server-side or at publish.
4. **Comment library scale** -- No cap on entries. Over time, an active inspector could accumulate thousands. Pagination and search will be needed.
5. **Checklist template versioning** -- If a template is updated after an inspection starts, the in-progress inspection keeps its original structure via `checklistProgress` subcollection. Template edits do not retroactively affect active inspections.  
