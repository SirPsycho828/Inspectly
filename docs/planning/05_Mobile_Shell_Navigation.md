# Mobile Shell & Navigation

## Overview

App shell structure and navigation hierarchy for Inspectly. Built with React Navigation (standard for Expo/React Native). The navigation is organized around two primary contexts: the dashboard (managing inspections) and the active inspection (field capture workflow). Transitions between these contexts are clear and deliberate -- an inspector should never accidentally leave an active inspection.

## Dependencies

- `04_UI_Design_System.md` -- Touch targets, thumb zone, bottom action bar
- `01_Auth_Roles.md` -- Auth states drive which navigator is shown
- `06_Inspection_Setup.md` -- Inspection creation entry point
- `07_Checklist_Engine.md` -- Active inspection screen structure

## Navigation Architecture

### Root Navigator (Stack)

The root navigator switches between auth and app contexts based on auth state. No animated transitions between auth states -- use conditional rendering.

```
Root (Stack, no header)
├── Auth Flow (shown when unauthenticated or unverified)
│   ├── SignIn
│   ├── SignUp
│   ├── VerifyEmail
│   └── ForgotPassword
│
├── Onboarding Flow (shown when needs_onboarding)
│   ├── ProfileSetup (name, license, phone)
│   └── FirmJoin (optional invite code)
│
└── Main App (shown when authenticated)
    └── Bottom Tab Navigator
```

### Bottom Tab Navigator

Four tabs. Icons from the chosen icon library (see `04_UI_Design_System.md`). Active tab uses `teal-600`, inactive uses `slate-500`.

| Tab | Icon | Label | Stack Contents |
|-----|------|-------|----------------|
| Inspections | clipboard-list | Inspections | Inspection list, filters, search |
| Reports | file-text | Reports | Published reports list, status |
| Firm | users | Firm | Firm dashboard (firm members only) |
| Settings | settings | Settings | Profile, branding, templates, account |

The Firm tab is conditionally visible -- only shown when `user.firmId` is not null. Solo inspectors see three tabs.

Tab bar height: 56px plus safe area inset. Labels shown below icons at `caption` size.

### Inspections Tab Stack

```
InspectionsList (default)
├── InspectionSetup (create new)
├── InspectionDetail (view summary of a past/in-progress inspection)
└── ActiveInspection (full-screen inspection mode)
    ├── ChecklistView (section list, item list)
    ├── FindingEntry (record a finding)
    ├── PhotoCapture (camera + annotation)
    ├── SectionReview (mini-review after completing a section)
    ├── ReportPreview (interactive preview before publish)
    └── PublishFlow (executive summary, recipient confirmation, publish)
```

### Reports Tab Stack

```
ReportsList (default)
├── ReportDetail (view published report, access codes, delivery status)
├── AmendReport (create amendment)
└── ManageAccess (view/revoke/resend access codes)
```

### Firm Tab Stack

```
FirmDashboard (default)
├── FirmMemberList
├── MemberDetail (view member's published reports)
├── FirmSettings (firm name, invite codes)
└── FirmBranding (logo, colors, footer text)
```

### Settings Tab Stack

```
SettingsMain (default)
├── EditProfile
├── ChecklistTemplates (view/manage templates)
├── CommentLibrary (view/manage saved narratives)
├── BrandingSetup (solo inspectors -- personal branding)
├── AccountSecurity (change password, delete account)
└── About (version, support, legal)
```

## Screen States

Every screen handles four states consistently:

| State | Behavior |
|-------|----------|
| Loading | Skeleton screen matching the content layout. Never a full-screen spinner. |
| Empty | Centered empty state with context-specific message and CTA. |
| Error | Inline error banner at top with retry button. Never replaces content already on screen. |
| Content | Normal rendered state. |

For screens within the active inspection flow, loading and error states must not block access to other inspection features. An inspector must always be able to navigate away from a failing screen.

## Active Inspection Mode

The active inspection is the core experience. When an inspector enters an active inspection, the navigation shifts to a focused mode.

### Entry and Exit

- **Enter**: Tap "Start Inspection" from InspectionSetup or "Resume" from InspectionDetail. Pushes ActiveInspection onto the stack, hiding the bottom tab bar.
- **Exit**: Explicit "Exit Inspection" button in top-left corner. Shows confirmation dialog: "Your progress is saved. You can resume anytime." Returns to InspectionsList.
- **No accidental exits**: Back gesture/button from the root ActiveInspection screen shows the exit confirmation. Does not silently pop back to the tab navigator.

### Active Inspection Header

Replaces the default stack header with a persistent inspection header:

- Left: Exit button (X icon, `slate-700`)
- Center: Property address (truncated, `body-medium`), tappable to show full address
- Right: Progress indicator (e.g., "12/34 items")

This header persists across all screens within the active inspection flow.

### Active Inspection Navigation

Within the active inspection, navigation between sections and items uses a combination of:

1. **Checklist view**: Scrollable list of sections and items. Primary navigation method. See `07_Checklist_Engine.md`.
2. **Bottom action bar**: Context-sensitive. On a checklist item: "Add Finding" and "Mark Inspected". On a finding: "Save" and "Add Photo".
3. **Forward/back between items**: Optional swipe or arrow buttons to move to next/previous checklist item without returning to the list. Arrows in the header, right side.

### Quick Actions

From any screen within an active inspection, the inspector can access:

- **Quick photo**: Hardware camera button or a persistent small FAB that opens the camera immediately, captures a photo, and prompts to attach it to a finding or create a new finding from the photo.
- **Quick note**: Voice-to-text or quick text input that creates an unattached finding to be categorized later.

Quick actions are accessible via a small floating button anchored to the bottom-right, above the bottom action bar. 48px circle, `teal-600` background.

## Navigation Patterns

### Deep Linking

Support deep links for:
- `inspectly://inspection/:id` -- Opens InspectionDetail or resumes active inspection
- `inspectly://report/:id` -- Opens ReportDetail
- `inspectly://settings/templates` -- Opens checklist templates

Deep links from push notifications (e.g., "Report PDF ready") navigate directly to the relevant screen.

### State Preservation

- Active inspection state persists to local storage. If the app is killed mid-inspection, reopening the app resumes where the inspector left off.
- Tab selection and scroll position within InspectionsList persist across app sessions.
- FindingEntry form state persists if the inspector navigates away to take a photo and returns.

### Modal Screens

Some screens present as modals (slide up from bottom) rather than stack pushes:

- PhotoCapture (full-screen camera)
- Photo annotation editor
- Severity picker
- Component/condition selector
- Exit inspection confirmation

Modals use `presentation: "modal"` in React Navigation. They do not affect the underlying navigation state.

## Offline Indicators

A persistent offline banner appears below the inspection header (or below the tab bar on dashboard screens) when the device has no connectivity.

- Height: 32px
- Background: `minor-bg` (yellow-50)
- Text: "Offline -- changes will sync when connected" in `caption-medium`, `minor` color
- Slides in/out with 200ms animation
- Does not block interaction -- the app is fully functional offline during inspections

When connectivity returns, the banner briefly changes to "Syncing..." then "Back online" (green, `success-bg`) before dismissing.

See `17_Offline_Sync.md` for sync strategy details.

## Firm Admin Additions

When the user has `firm_admin` role, the following navigation changes apply:

- Firm tab becomes visible in the bottom tab navigator
- InspectionsList shows a toggle: "My Inspections" / "All Firm Inspections"
- ReportsList shows the same toggle
- Firm members' reports are read-only (view but not edit or amend)

No additional navigation structures are needed -- firm admin features layer onto existing screens with conditional UI.

## Gaps & Assumptions

1. **Navigation library version** -- Assumes React Navigation v6+. Navigation structure would be similar with v7 but API details differ.
2. **Tablet layout** -- Not specified. Default: phone layout scales up. A split-view (checklist left, detail right) on tablets would improve the inspection experience but is deferred.
3. **Gesture navigation conflicts** -- React Navigation's back swipe gesture may conflict with the "no accidental exit" rule on ActiveInspection. Disable swipe-to-go-back on the root ActiveInspection screen.
4. **Quick action discoverability** -- The floating quick-action button may not be immediately obvious. Consider a one-time tooltip on first active inspection.
5. **Hardware back button (Android)** -- Must match the same exit-confirmation behavior as iOS back gesture on the ActiveInspection root screen.  
