# Offline Support & Sync

## Overview

Inspectors work in basements, crawl spaces, attics, and rural properties where cellular signal is unreliable or nonexistent. The app must be fully functional during an active inspection without connectivity. All field capture operations -- checklist progress, finding entry, photo capture, and annotation -- work offline using Firestore's built-in offline persistence and a local photo queue. Data syncs automatically when connectivity returns. The inspector should never notice a sync event; it happens silently in the background.

## Dependencies

- `02_Database_Schema.md` -- All inspection-related collections (writes must work offline)
- `05_Mobile_Shell_Navigation.md` -- Offline indicator banner
- `06_Inspection_Setup.md` -- Offline inspection creation
- `08_Finding_Entry_Severity.md` -- Finding auto-save behavior offline
- `09_Photo_Capture_Annotation.md` -- Photo storage queue
- `10_AI_Narrative_Generation.md` -- AI unavailability when offline

## Offline Capability Matrix

### Fully Functional Offline

| Operation | How It Works Offline |
|-----------|---------------------|
| Create inspection | Firestore offline write, syncs later |
| Navigate checklist | Template copied to subcollection at setup, reads from local cache |
| Mark items inspected/skipped/N/A | Firestore offline write |
| Create and edit findings | Firestore offline write with auto-save |
| Set severity, component, condition | Local Firestore writes |
| Capture photos | Saved to device storage, queued for upload |
| Annotate photos | Annotations stored on finding document (offline write), baking happens at publish |
| View own past inspections | Available if previously loaded (in Firestore cache) |
| Edit inspection setup details | Firestore offline write |

### Degraded Offline (Functional with Limitations)

| Operation | Limitation |
|-----------|-----------|
| AI narrative generation | Unavailable. Inspector writes manually or field shows "Will generate when online." Structured inputs (component, condition, severity) are saved; narrative generation fires on reconnect. |
| Comment library | Available if previously loaded. New entries saved offline but firm-shared entries may be stale. |
| Address autocomplete | Google Places API unavailable. Manual address entry only. |
| Photo thumbnails (Cloud Function) | Thumbnails generate on upload, which happens after sync. Local photos display using device file URI until then. |

### Requires Connectivity

| Operation | Why |
|-----------|-----|
| Publish report | Server-side processing: annotation baking, report snapshot, access code generation, notifications |
| View report portal | Web-based, requires internet |
| Generate PDF | Server-side rendering |
| Firm invite redemption | Server-side validation |
| Account creation / sign-in | Firebase Auth requires connectivity |

## Firestore Offline Persistence

### Configuration

Enable Firestore offline persistence at app initialization. React Native Firestore (`@react-native-firebase/firestore`) supports offline persistence by default on mobile.

Key settings:
- `persistence: true` (default on mobile)
- Cache size: unlimited (`CACHE_SIZE_UNLIMITED`) -- inspection data must not be evicted mid-inspection

### How It Works

Firestore's offline persistence maintains a local copy of all documents the client has read or written. When the device is offline:

- **Reads** return data from the local cache. Documents not previously fetched are unavailable.
- **Writes** are queued locally and applied to the cache immediately. The app sees the write as successful. Queued writes sync to the server when connectivity returns, in the order they were made.

This is transparent to the app code -- the same Firestore API calls work identically online and offline. No conditional logic needed in feature code.

### Pre-Fetching for Offline Readiness

To ensure critical data is available in the cache before the inspector loses connectivity:

**At inspection start** (when connectivity is likely available -- inspector is in their car):
1. Checklist template items are copied to the `checklistProgress` subcollection (see `06_Inspection_Setup.md`). This puts all checklist data in the local cache.
2. Inspector's comment library is fetched (paginated, most-used first, up to 200 entries).
3. Firm branding data is fetched (if applicable).

**On app launch:**
1. User profile document is fetched and cached.
2. Recent inspections list (last 20) is fetched.
3. Active (in-progress) inspection data is fetched including all subcollections.

**Not pre-fetched** (acceptable to be unavailable offline):
- Other inspectors' reports (firm admin view)
- Template management screens
- Account settings

### Write Queue Behavior

Firestore queues offline writes and applies them in order on reconnect. Key behaviors:

- Writes to the same document merge. If the inspector edits a finding three times offline, only the final state syncs (Firestore sends the latest version, not each intermediate write).
- Subcollection writes (findings, checklist progress) are independent documents and sync individually.
- The write queue persists across app restarts. Killing and reopening the app does not lose queued writes.
- There is no explicit queue size limit, but extremely large queues (thousands of writes) can cause slow reconnection sync. A typical inspection generates 150-300 writes (checklist items + findings), well within comfortable range.

## Photo Sync

Photos require special handling because they are binary files stored in Cloud Storage, not Firestore documents.

### Local Storage

When a photo is captured offline:

1. Photo is compressed per spec (JPEG, 85% quality, max 3000px -- see `09_Photo_Capture_Annotation.md`)
2. Saved to device local storage: `{appDocumentsDir}/photos/{inspectionId}/{photoId}.jpg`
3. Finding document is updated (offline Firestore write) with the photo entry using a local file URI as `storageUrl`
4. Photo is added to the upload queue

### Upload Queue

A background upload queue managed at the application level (not Firestore -- Cloud Storage has no offline write capability).

Queue properties:
- Persisted to device local storage (survives app restart)
- FIFO ordering (upload in capture order)
- Entries: `{ photoId, inspectionId, localPath, attempts, status }`
- Statuses: `pending`, `uploading`, `completed`, `failed`

### Sync Process

When connectivity is detected:

1. Queue processor starts, picks the next `pending` entry
2. Uploads the photo to Cloud Storage at the expected path (see `09_Photo_Capture_Annotation.md` storage path convention)
3. On success:
   - Status set to `completed`
   - Finding document updated with the Cloud Storage URL (replacing the local file URI)
   - `onPhotoUpload` Cloud Function triggers to generate thumbnail
   - Local file retained until confirmed uploaded (do not delete prematurely)
4. On failure:
   - Retry up to 3 times with exponential backoff (5s, 30s, 2min)
   - After 3 failures, status set to `failed`, skip to next item in queue
   - Failed uploads surface in the UI (see below)
5. Process next item. Uploads are sequential (not parallel) to avoid bandwidth competition on slow connections.

### Local File Cleanup

Local photo files are deleted only after:
1. Cloud Storage upload confirmed (upload returned success)
2. Finding document updated with Cloud Storage URL (Firestore write confirmed, not just queued)

If the app is uninstalled with pending uploads, local photos are lost. This is an accepted risk -- the app should warn if uninstalled with pending items (OS-level uninstall hooks are limited, so this is best-effort).

## Connectivity Detection

### Network State

Use React Native's `NetInfo` library to detect connectivity changes.

States:
- **Online**: Device has network connectivity and can reach Firebase services
- **Offline**: No network or Firebase unreachable

Detection is not just "does the device have WiFi/cellular" -- it must verify actual reachability. `NetInfo`'s `isInternetReachable` flag handles this.

### Offline Banner

When connectivity is lost, the offline indicator banner appears (see `05_Mobile_Shell_Navigation.md`):

- Slides in below the inspection header or tab bar
- Yellow background (`minor-bg`), "Offline -- changes will sync when connected"
- Persists until connectivity returns

When connectivity returns:
- Banner changes to "Syncing..." (if there are queued writes or photos)
- After sync completes: "Back online" in green (`success-bg`), dismisses after 3 seconds

### Connectivity Transitions

| Transition | App Behavior |
|------------|-------------|
| Online to offline | Show banner. All operations continue using local cache. No interruption. |
| Offline to online | Firestore auto-syncs queued writes. Photo queue processor starts. Banner updates. |
| Intermittent (flapping) | Debounce state changes (wait 3 seconds before acting on a state change). Prevents UI flickering. |

## Conflict Resolution

### Why Conflicts Are Rare

The data model minimizes conflict potential:
- Each inspection is owned by one inspector. No concurrent editing.
- Findings are individual documents in a subcollection. Two people never edit the same finding.
- Checklist progress items are individual documents. Same reasoning.

The only realistic conflict scenario: the inspector uses the app on two devices (phone and tablet) simultaneously on the same inspection. This is an edge case.

### Conflict Strategy

Firestore uses last-write-wins for document-level conflicts. For Inspectly, this is acceptable because:
- Single-user-per-inspection means true conflicts are rare
- Finding documents are small and self-contained
- Checklist item status is a simple enum -- the most recent status is the correct one

No custom conflict resolution logic is needed for v1.

## Failed Sync Handling

### Firestore Write Failures

Firestore offline writes can fail on sync if security rules reject them (e.g., the user's permissions changed while offline). This is rare but possible.

Handling: Firestore surfaces these as errors on the pending write promise. The app should listen for sync errors and surface them as a non-blocking notification: "Some changes could not be saved. Please check your connection and try again."

### Photo Upload Failures

Failed photo uploads (after 3 retries) are surfaced in the inspection detail screen:

- "X photos failed to upload" warning banner at the top of the findings list
- Tapping shows the list of failed photos with "Retry" and "Delete" options per photo
- "Retry All" button to re-queue all failed uploads

## Gaps & Assumptions

1. **Storage space** -- An inspection with 200 photos at 1MB each uses 200MB of device storage. No monitoring of available device storage before capture. If the device runs out of space, the camera will fail at the OS level. Consider showing a warning when available storage drops below 500MB.
2. **Background sync** -- Photo uploads currently require the app to be in the foreground. Background upload (when the app is backgrounded) would improve reliability but adds complexity (background task APIs differ between iOS and Android). Deferred to post-MVP.
3. **Sync progress visibility** -- No detailed sync progress indicator beyond the banner. The inspector cannot see "uploading photo 3 of 47." For v1, the simple "Syncing..." message is sufficient.
4. **Multi-device sync** -- If an inspector starts on their phone and switches to a tablet mid-inspection, Firestore handles the data sync. But the photo upload queue is device-local. Photos captured on the phone must upload from the phone. No cross-device queue sharing.
5. **Cache invalidation** -- Firestore cache grows indefinitely with `CACHE_SIZE_UNLIMITED`. Over months of use, this could become large. Monitor cache size in production and consider periodic eviction of completed inspection data older than 90 days.
6. **Offline duration limits** -- No theoretical limit to how long the app can operate offline. Practically, Firestore's offline write queue and the photo queue both persist to disk. An inspector could complete an entire 3-hour inspection offline and sync afterward.  
