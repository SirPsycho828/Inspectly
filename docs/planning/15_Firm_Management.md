# Firm Management

## Overview

Firm management supports small inspection companies (1-10 inspectors) with a trust-based visibility model. The firm admin can view all published reports across the team and manage membership, but does not gate publication. Inspectors publish independently -- the admin sees everything after the fact. This matches how small inspection firms actually operate: the owner trusts their inspectors but needs oversight for quality, consistency, and client follow-up.

## Dependencies

- `01_Auth_Roles.md` -- `inspector` and `firm_admin` roles, custom claims, firm joining flow
- `02_Database_Schema.md` -- `firms` collection, `firms/{firmId}/invites` subcollection, `users` collection
- `03_API_Endpoints.md` -- Firm management callable functions
- `04_UI_Design_System.md` -- Card patterns, list styles
- `05_Mobile_Shell_Navigation.md` -- Firm tab (conditional), admin dashboard screens
- `16_Branding_Configuration.md` -- Firm-level branding shared across inspectors

## Firm Creation

### Who Can Create

Any authenticated inspector can create a firm. Creating a firm:

1. Sets the creator's role to `firm_admin`
2. Creates a `firms` document with the creator as `adminId` and sole member
3. Updates the creator's `firmId` on their user document
4. Syncs custom claims (triggers `onUserDocWrite`)

### Creation Flow

Accessed from Settings > "Create a Firm."

| Field | Type | Required |
|-------|------|----------|
| Firm Name | Text input | Yes |
| Company Phone | Text input (phone) | Yes |
| Company Email | Text input (email) | Yes |
| Company Website | Text input (URL) | No |

Logo and branding are configured separately after creation (see `16_Branding_Configuration.md`). Keep the creation form minimal -- the admin can flesh out details later.

After creation, the Firm tab appears in the bottom navigation and the admin is taken to the firm dashboard.

### One Firm Per Inspector

An inspector can belong to at most one firm at a time (see `01_Auth_Roles.md`). Creating a firm while already a member of another firm is not allowed. The inspector must leave the current firm first.

## Invite System

### Generating Invites

Firm admin generates invite codes from Firm > Settings > "Invite Inspector."

Each invite:
- 6-character alphanumeric code (uppercase, no ambiguous characters)
- Valid for 7 days from creation
- Single use -- consumed when redeemed
- Stored in `firms/{firmId}/invites` subcollection

The admin can generate multiple active invites simultaneously. The invite screen shows all active (unexpired, unused) invites with:
- Code displayed prominently (tappable to copy)
- Expiry date
- "Share" button (opens system share sheet with a pre-formatted message: "Join [Firm Name] on Inspectly. Enter this code in the app: [CODE]")
- "Delete" button to revoke an unused invite

### Redeeming Invites

Inspectors enter an invite code in two places:

1. **During onboarding**: Optional "Join a Firm" step. See `01_Auth_Roles.md`.
2. **From Settings > "Join a Firm"**: For existing users joining a firm after initial setup.

Redemption flow (handled by `redeemFirmInvite` Cloud Function):

1. Validate code exists, is not expired, is not used
2. Validate the inspector is not already in a firm
3. Add the inspector's user ID to the firm's `memberIds` array
4. Increment `memberCount`
5. Set `firmId` on the inspector's user document
6. Mark the invite as used (`usedBy`, `usedAt`)
7. Sync custom claims

On success, the Firm tab appears and the inspector sees their firm dashboard.

### Invalid Code Handling

| Scenario | Message |
|----------|---------|
| Code not found | "Invalid invite code. Check with your firm admin." |
| Code expired | "This invite has expired. Ask your admin for a new code." |
| Code already used | "This invite has already been used." |
| Inspector already in a firm | "You're already a member of [current firm name]. Leave your current firm first to join another." |

## Firm Dashboard

The Firm tab's main screen. Visible only to users with a `firmId`.

### Admin View

**Header section:**
- Firm name and logo
- Member count: "X inspectors"
- "Firm Settings" gear icon (top right)

**Activity feed** (main content area):
- Chronological list of recently published reports across all firm members
- Each entry shows: inspector name (avatar), property address, publish date, severity summary badges
- Tap to open the report detail (read-only for reports by other inspectors)
- Filter: date range picker, inspector name filter

**Summary cards** (horizontal scroll above the feed):
- "This Week": total inspections published, total findings
- "This Month": same metrics, monthly view
- Per-inspector breakdown: small card per inspector showing their monthly count

### Inspector View (Non-Admin)

Same layout but scoped:
- Sees their own published reports only (same as the Reports tab)
- Firm name and logo header
- No member list access
- No firm settings access
- "Leave Firm" option in the overflow menu

The Firm tab for non-admin members is lightweight. Its primary value is showing the firm branding and providing the leave action. The admin may extend firm-level features post-MVP.

## Member Management

Accessible from Firm Dashboard > Member List (admin only).

### Member List

Sorted by name. Each row shows:
- Inspector name and profile photo
- Status badge: Active (green) or Suspended (red)
- Inspection count (lifetime)
- Last active date
- Chevron to member detail

### Member Detail

Shows for a specific firm member:
- Profile: name, email, license number, phone
- Status: active or suspended with toggle
- Stats: total inspections, total findings, average findings per inspection
- Recent reports: last 10 published reports (tappable to view read-only)

### Admin Actions

| Action | Function | Notes |
|--------|----------|-------|
| Suspend Member | `suspendFirmMember` | Inspector can't create new inspections. Existing reports remain accessible. Sets user status to `suspended`. |
| Reinstate Member | Updates user status back to `active` | Direct Firestore write with security rules |
| Remove Member | `removeFirmMember` | Removes from firm. Inspector's published reports retain the `firmId` snapshot -- they don't disappear from firm history. |
| Transfer Admin | `transferFirmAdmin` | See below. |

### Suspend vs. Remove

**Suspend**: The inspector remains in the firm but cannot create new inspections or publish reports. Their existing published reports remain in the firm's report history. Use case: temporary deactivation during a dispute or leave of absence.

**Remove**: The inspector is fully disconnected from the firm. Their `firmId` is cleared, custom claims updated, and Firm tab disappears from their app. Their previously published reports still show in the firm's history (the `firmId` on the report document is a snapshot from publish time and does not change). Use case: inspector leaves the company.

### Admin Transfer

The firm admin can transfer admin privileges to any active firm member:

1. Admin opens member detail for the target inspector
2. Taps "Make Admin"
3. Confirmation dialog: "Transfer admin role to [name]? You will become a regular inspector."
4. `transferFirmAdmin` Cloud Function updates both user documents and syncs custom claims
5. Immediate effect on both users' permissions

A firm must always have exactly one admin. The admin cannot leave the firm without transferring first. The "Leave Firm" option is hidden for admins -- they see "Transfer Admin" instead.

## Report Visibility Rules

| Scenario | Visibility |
|----------|-----------|
| Inspector publishes while in firm | Report has `firmId`. Visible to current and future admin. |
| Inspector leaves firm after publishing | Report retains `firmId` snapshot. Still visible to admin. |
| Inspector joins firm with past reports | Past reports have `firmId: null`. Not visible to firm admin. Solo history stays private. |
| Admin views team report | Read-only. Cannot edit, amend, or revoke. |

This means firm visibility is forward-only. Joining a firm does not retroactively expose an inspector's independent work history.

## Firm Settings

Accessible by firm admin from the Firm Dashboard gear icon.

| Setting | Description |
|---------|-------------|
| Firm Name | Editable |
| Company Phone | Displayed on reports |
| Company Email | Displayed on reports, used as reply-to in notifications |
| Company Website | Displayed on reports |
| Logo | See `16_Branding_Configuration.md` |
| Primary Color | See `16_Branding_Configuration.md` |
| Report Footer | Custom text at bottom of reports |
| Active Invites | View and manage pending invite codes |

Changes to firm settings apply to future reports. Previously published reports retain the branding snapshot from their publish time.

## Gaps & Assumptions

1. **Multiple admins** -- Only one admin per firm in v1. Firms with 8-10 inspectors may want a lead inspector who also has admin access. Multi-admin support deferred to `18_Future_Features.md`.
2. **Inspector performance metrics** -- The admin dashboard shows basic counts. More detailed analytics (average report delivery time, client satisfaction, common findings) are post-MVP.
3. **Firm billing** -- No specification for whether the firm pays centrally or each inspector pays individually. Billing and subscription management are not in the v1 scope.
4. **Maximum firm size** -- Target is 1-10 inspectors. The `memberIds` array on the firm document works fine for this scale. Larger firms (50+) would need a different data model. No enforcement cap in v1.
5. **Communication within firm** -- No in-app messaging between admin and inspectors. Communication about report quality or issues happens outside the app (text, email, phone).
6. **Firm deletion** -- No firm deletion flow specified. If an admin wants to dissolve the firm, they would need to remove all members first, then the firm document could be soft-deleted. Edge case -- defer to support.  
