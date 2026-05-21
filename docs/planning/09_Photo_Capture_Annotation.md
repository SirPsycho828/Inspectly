# Photo Capture & Annotation

## Overview

Photos are the evidence layer of every inspection finding. The capture and annotation workflow is designed for speed and one-handed operation -- an inspector holding a flashlight in one hand should be able to snap a photo, circle a defect, and move on in under 15 seconds. Photos are captured through the device camera, optionally annotated with drawing tools, and anchored to specific findings. At publish time, annotations are baked into flat images for the report.

## Dependencies

- `02_Database_Schema.md` -- `FindingPhoto` shape, `Annotation` shape, storage URLs
- `04_UI_Design_System.md` -- Photo thumbnail grid, touch targets, gloved operation constraints
- `08_Finding_Entry_Severity.md` -- Photos attach to findings, photo-first flow entry point
- `03_API_Endpoints.md` -- `onPhotoUpload` trigger for thumbnail generation
- `17_Offline_Sync.md` -- Offline photo queuing and sync

## Capture Flow

### Entry Points

1. **From finding entry**: "Add Photo" button in the photos section of FindingEntry. Photo attaches to the current finding.
2. **Quick action FAB**: Camera icon on the floating button within active inspection. Photo is captured first, then attached to an existing finding or triggers new finding creation.
3. **Batch capture**: From a finding's photo section, hold the shutter button to enter burst mode -- captures multiple photos in sequence without returning to the finding screen between each shot.

### Camera Screen

Full-screen camera modal (see `05_Mobile_Shell_Navigation.md` for modal presentation).

Layout:
- Camera viewfinder fills the screen
- Bottom bar: large shutter button (72px circle, centered), gallery button (left), flash toggle (right)
- Top bar: close button (X), resolution indicator
- No additional UI chrome -- maximize viewfinder area

Shutter button: 72px diameter, white circle with white border. Tap to capture. Accessible with thumb in portrait and landscape orientation.

Flash modes: Auto (default), On, Off. Cycle through with tap on flash icon. Persist the inspector's flash preference across the session.

### After Capture

Photo captured -> brief freeze frame (200ms) -> two options:

1. **Use Photo**: Saves to device storage and uploads to Firebase Cloud Storage. Returns to the finding entry screen with the photo added to the grid. This is the default fast path.
2. **Annotate**: Opens the annotation editor before saving. For inspectors who want to mark up the photo immediately.

Both options are buttons overlaid on the captured image. "Use Photo" is the primary (larger, bottom-right). "Annotate" is secondary (bottom-left).

If the inspector entered via quick action (no finding context), after "Use Photo" a bottom sheet appears: "Attach to finding" with a list of recent findings from the current inspection, plus "New Finding" at the top. Selecting a finding attaches the photo; selecting "New Finding" opens FindingEntry with the photo pre-attached.

### Retake

Swipe the captured image away (or tap a small "Retake" button) to discard and return to the viewfinder. No confirmation dialog -- the photo hasn't been saved yet.

## Annotation Editor

### Access

- Immediately after capture (tap "Annotate")
- From the finding entry photo grid (tap a thumbnail, then tap "Edit" or the pencil icon)
- From the report preview (tap a photo to view, then tap "Annotate")

### Editor Layout

- Photo fills the screen
- Bottom toolbar: annotation tools
- Top bar: Undo, Redo, Done (save), Cancel (discard changes)
- Pinch to zoom and pan for precision work (also provide explicit zoom +/- buttons per gloved operation constraints)

### Annotation Tools

Four tools, displayed as a horizontal toolbar at the bottom. Active tool is highlighted with `teal-600` background.

| Tool | Icon | Behavior |
|------|------|----------|
| Arrow | arrow-up-right | Tap start point, drag to end point. Draws an arrow with a pointed head. |
| Circle | circle | Tap center, drag to set radius. Draws an unfilled circle outline. |
| Rectangle | square | Tap corner, drag to opposite corner. Draws an unfilled rectangle outline. |
| Text | type | Tap location, keyboard appears, type label (max 50 chars). Places text with a semi-transparent background pill. |

All annotations render in red (`#EF4444`) by default. A color picker is available but de-emphasized -- small dot next to the tools showing current color. Tapping it reveals a row of 5 colors: red (default), yellow, blue, white, black. Color choice is per-annotation, not global.

Annotation stroke width: 3px at 1x photo resolution. Scales proportionally when zoomed.

### Annotation Data Model

Annotations are stored as coordinate data on the `FindingPhoto` object (see `02_Database_Schema.md`). Coordinates use percentage-of-image-dimensions (0-100) so they scale correctly across display sizes and resolutions.

Annotations are non-destructive in the app -- the original photo is preserved and annotations render as an overlay. At publish time, annotations are baked into flat images server-side (see `03_API_Endpoints.md`, `publishReport`).

### Undo/Redo

Undo stack holds the last 20 annotation actions. Redo is available until a new annotation is drawn. Undo/redo buttons are 48px touch targets in the top bar.

## Photo Storage

### Upload Pipeline

1. Photo captured at device camera resolution
2. Saved to device local storage immediately (for offline resilience)
3. Uploaded to Firebase Cloud Storage at `inspections/{inspectionId}/photos/{photoId}.jpg`
4. `onPhotoUpload` Cloud Function generates a 400px-wide thumbnail at `inspections/{inspectionId}/photos/{photoId}_thumb.jpg`
5. Finding document updated with `storageUrl` and `thumbnailUrl`

### Compression

Photos are compressed before upload to balance quality and storage cost:

- Format: JPEG
- Quality: 85%
- Max resolution: 3000px on longest edge [default -- PRD unspecified]
- Estimated file size: 500KB-1.5MB per photo after compression

Original full-resolution photos are not preserved after compression. The compressed version is the canonical copy.

### Offline Queuing

When offline, photos are stored locally on device and queued for upload. The queue processes when connectivity returns, uploading in the order captured. See `17_Offline_Sync.md` for details.

The finding document references photos immediately using a local URI. When the upload completes and a Cloud Storage URL is available, the reference updates. This swap is transparent to the inspector.

### Storage Path Convention

```
inspections/
  {inspectionId}/
    photos/
      {photoId}.jpg           # Full resolution (compressed)
      {photoId}_thumb.jpg     # 400px thumbnail (generated by Cloud Function)
reports/
  {reportId}/
    photos/
      {photoId}_baked.jpg     # Annotations composited (generated at publish)
```

## Photo Management

### Within a Finding

Photos display in the thumbnail grid (3 columns, see `04_UI_Design_System.md`). Interactions:

- **Tap**: Full-screen photo viewer with zoom. Annotations rendered as overlay. Action bar: "Annotate", "Delete", "Set as Primary".
- **Move order**: Up/down arrow buttons on each thumbnail (no drag-and-drop, per gloved operation constraints). First photo is the "primary" photo shown in report summaries.
- **Delete**: Swipe left on thumbnail or delete button in full-screen view. 5-second undo toast. Deletes from Cloud Storage on confirmation.
- **Annotation indicator**: Small teal dot on the thumbnail's top-right corner if the photo has annotations.

### Photo Count Limits

- Max 10 photos per finding [default -- PRD unspecified]
- No max per inspection (but storage cost scales linearly)
- When limit reached, "Add Photo" button becomes disabled with label "10 photo limit reached"

### Photo-First Finding Creation

When an inspector captures a photo via quick action and selects "New Finding":

1. FindingEntry screen opens with the photo pre-attached
2. Component picker suggests components based on the current section context (if the inspector was viewing a section when they hit the quick action)
3. Standard finding entry flow proceeds

This supports inspectors who spot something, photograph it immediately, and categorize it afterward.

## Report Photo Handling

At publish time, the `publishReport` Cloud Function processes all finding photos:

1. For each photo with annotations, composite the annotations onto the image server-side (using Sharp or similar library)
2. Save the baked image to `reports/{reportId}/photos/{photoId}_baked.jpg`
3. The report document references baked URLs, not originals
4. Original annotated data preserved on the inspection's finding documents for future amendments

Photos in the report portal and PDF use the baked images. Clients and agents see annotations as part of the photo, not as interactive overlays.

## Gaps & Assumptions

1. **Camera library** -- Not specified. Expo Camera (expo-camera) is the standard choice for Expo-based React Native apps. Provides flash control, resolution settings, and device camera access.
2. **Image processing for baking** -- Server-side annotation compositing requires an image processing library in Cloud Functions. Sharp is lightweight but has native dependencies that complicate Cloud Functions deployment. Canvas (node-canvas) is an alternative. May require a Cloud Run service if Cloud Functions memory/timeout limits are exceeded for large photo sets.
3. **Photo metadata/EXIF** -- The app records `takenAt` from capture time. GPS coordinates from EXIF could auto-associate photos with property locations but raise privacy concerns in published reports. Default: strip EXIF GPS data before upload.
4. **Video capture** -- Not in scope for v1. Inspectors sometimes record video of running systems (HVAC, plumbing flow). Deferred to `18_Future_Features.md`.
5. **Cloud Storage security rules** -- Upload path must be scoped so inspectors can only write to their own inspection's photo directory. Read access for published report photos must be available to the portal (via signed URLs, not public access).
6. **Annotation precision on small screens** -- Drawing precise circles around small defects on a phone screen is inherently imprecise. Pinch-to-zoom before annotating mitigates this, but the UX may need refinement based on field testing.  
