# Authentication and Roles

## Overview

Inspectly has two distinct auth contexts: the mobile app (used by inspectors and firm admins) and the report delivery portal (used by clients and agents). The mobile app uses Firebase Authentication with full account creation. The report portal uses short-lived access codes with no account required -- clients and agents should never need to create an account to view a report.

## Dependencies

- `02_Database_Schema.md` -- User and firm document shapes
- `15_Firm_Management.md` -- Firm admin role capabilities
- `13_Report_Delivery_Portal.md` -- Portal access code verification flow

## Mobile App Authentication

### Auth Provider

Firebase Authentication with two sign-in methods:

1. **Email/password** -- Primary method. Standard Firebase email/password flow with email verification required before first inspection can be created.
2. **Google OAuth** -- Secondary method. One-tap sign-in via Google. Skips email verification since Google has already verified the address.

New users land in `needs_onboarding` state regardless of sign-in method. Onboarding collects inspector profile details (name, license number, firm affiliation if any) before granting full app access.

### Auth States

| State | Condition | Allowed Screens |
|-------|-----------|-----------------|
| `unauthenticated` | No Firebase user | Sign-in, sign-up |
| `unverified` | Firebase user exists, email not verified | Verify email prompt, resend link |
| `needs_onboarding` | Email verified (or Google), no profile completed | Onboarding flow |
| `authenticated` | Profile complete | Full app access |
| `suspended` | Account flagged by firm admin | Read-only, contact admin message |

Route guards must handle all signed-in states -- not just `authenticated`. A Google OAuth user who has not completed onboarding must be redirected to onboarding, not left stuck on the sign-in screen.

### Session Management

Firebase Auth handles token refresh automatically via the SDK. No custom session logic needed.

- Access tokens: 1 hour (Firebase default)
- Refresh tokens: Indefinite until explicitly revoked
- On app foreground: SDK silently refreshes if token expired
- On sign-out: Clear local Firestore cache to prevent stale data from previous account

## Roles and Permissions

### Role Definitions

| Role | Description | Assignment |
|------|-------------|------------|
| `inspector` | Solo inspector or firm team member. Can create/edit/publish their own inspections. | Default role on account creation |
| `firm_admin` | Firm owner or manager. Everything an inspector can do, plus visibility into all firm inspections. | Set when creating a firm or transferred by current admin |

Roles are stored on the user document in Firestore and mirrored as Firebase Auth custom claims for use in security rules. When a role changes in Firestore, a Cloud Function syncs the custom claim.

### Permission Matrix

| Action | `inspector` | `firm_admin` |
|--------|:-----------:|:------------:|
| Create inspection | Own | Own |
| Edit inspection (in progress) | Own | Own |
| Publish report | Own | Own |
| View published reports | Own | All in firm |
| View inspector activity | -- | All in firm |
| Manage firm settings | -- | Yes |
| Manage firm branding | -- | Yes |
| Invite/remove firm members | -- | Yes |
| Suspend firm member | -- | Yes |
| Delete own account | Yes | Yes (transfers admin first) |

"Own" means the inspector who created the inspection. There is no cross-inspector editing in v1 -- firm admins can view but not modify another inspector's reports.

### Custom Claims Structure

```
{
  role: "inspector" | "firm_admin",
  firmId: string | null
}
```

Custom claims are set via Cloud Function triggered on user document write. Claims propagate on next token refresh (up to 1 hour delay). For immediate effect after role change, force a token refresh on the client.

## Firestore Security Rules Pattern

Security rules use custom claims for role checks and document ownership for data access.

**Key rule patterns:**

- **Own data**: `request.auth.uid == resource.data.inspectorId`
- **Firm visibility**: `request.auth.token.role == "firm_admin" && request.auth.token.firmId == resource.data.firmId`
- **Write protection on published reports**: Once `status == "published"`, only amendment operations are allowed (see `13_Report_Delivery_Portal.md` for versioned amendments)

Detailed rules live alongside the schema. See `02_Database_Schema.md` for collection-level access patterns.

## Report Portal Access (No Account Required)

### Access Code System

When an inspector publishes a report, the system generates unique access codes for each recipient (client, agent, or additional contacts). Recipients receive their code via email or SMS (see `14_Client_Agent_Notifications.md`).

**Access code properties:**

| Property | Value |
|----------|-------|
| Format | 6-character alphanumeric, uppercase, no ambiguous chars (0/O, 1/I/L excluded) |
| Expiry | 90 days from publish date [default -- PRD unspecified] |
| Attempts | 5 failed attempts locks the code for 15 minutes |
| Uniqueness | Unique per report per recipient |
| Revocable | Inspector can revoke any access code from the app |

### Portal Auth Flow

1. Recipient clicks link from email/SMS notification
2. Link contains report ID in the URL path (not the access code)
3. Portal prompts for access code
4. Cloud Function validates code against the report's access code collection
5. On success, returns a short-lived portal session token (24 hours)
6. Portal session token stored in browser sessionStorage (not localStorage -- should not persist across tabs)
7. Subsequent requests to the portal API include this token

### Portal Session Token

Portal sessions are not Firebase Auth sessions. They are lightweight custom tokens:

- Generated by a Cloud Function on successful code verification
- Contain: `reportId`, `recipientType` (client/agent), `recipientEmail`, `exp`
- Verified by Cloud Functions on each portal API request
- 24-hour expiry, non-renewable (re-enter access code to get a new session)
- Scoped to a single report -- viewing a different report requires a separate code entry

### Rate Limiting

Access code verification endpoint is rate-limited:

- 5 attempts per code per 15-minute window
- 20 attempts per IP per hour
- Failed attempts logged for inspector visibility (optional notification for suspicious activity)

## Account Lifecycle

### Account Creation
1. Sign up via email/password or Google OAuth
2. Email verification (skipped for Google)
3. Onboarding: name, phone, license number, optional firm code
4. If firm code provided, validate and link to firm
5. Custom claims set, user document created
6. Redirect to dashboard

### Firm Joining
- Firm admin generates an invite code (6-char, 7-day expiry)
- New or existing inspector enters code during onboarding or from settings
- Cloud Function validates code, adds `firmId` to user document, updates custom claims
- Inspector's existing inspections remain personal -- they do not retroactively become visible to the firm

### Account Deletion
- Inspector can delete from settings
- Triggers Cloud Function that: soft-deletes user document, anonymizes published reports (inspector name replaced with "Inspector"), revokes all auth sessions
- Published reports remain accessible to clients/agents -- they are legal documents
- Firm admin must transfer admin role before deleting own account

### Firm Admin Transfer
- Current admin selects new admin from firm member list
- Cloud Function updates both user documents and custom claims
- Old admin becomes regular `inspector` role within the firm

## Gaps & Assumptions

1. **No multi-firm support in v1** -- An inspector belongs to zero or one firm. Contractors who work for multiple firms need separate accounts or this constraint needs revisiting.
2. **No client/agent accounts** -- Portal access is code-only. If future features need persistent client preferences (saved reports, notification settings), accounts may be needed later. Deferred to `18_Future_Features.md`.
3. **License number validation** -- Collected during onboarding but not validated against any external registry. Display-only for now.
4. **Custom claims sync delay** -- Up to 1 hour for claims to propagate after role change. Force-refresh mitigates this but the app should handle the stale-claims window gracefully.
5. **Social auth providers** -- Only Google OAuth specified. Apple Sign-In is required for iOS App Store approval if any social auth is offered. This needs to be added before App Store submission.
6. **Portal access code delivery** -- Assumes email is always available. SMS is secondary. If a recipient has no email, the flow is unspecified. Default: require at least one email per recipient.

## Implementation Notes

- Use `getAuth(app)` for Firebase Auth initialization, not `initializeAuth`. Simpler and consistent.
- PublicRoute guard must redirect for all signed-in states (`authenticated`, `needs_onboarding`, `unverified`), not just `authenticated`.
- Do not add `Cross-Origin-Opener-Policy` headers on Firebase Hosting -- the default (`unsafe-none`) is required for Google popup auth.  
