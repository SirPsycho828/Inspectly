# Finding Entry & Severity

## Overview

Findings are the core data unit of an inspection -- each one documents a specific defect, observation, or informational note about a component. The finding entry flow is optimized for speed: an inspector selects a component, picks a condition, assigns a severity, and the system handles the narrative. The entire flow from "I see a problem" to "it's documented" should take under 30 seconds for a typical finding, excluding photos.

## Dependencies

- `02_Database_Schema.md` -- `findings` subcollection, `FindingPhoto` shape, severity enum
- `04_UI_Design_System.md` -- Severity badge colors, touch targets, field ergonomics
- `07_Checklist_Engine.md` -- Findings are attached to checklist items
- `09_Photo_Capture_Annotation.md` -- Photo capture launched from finding entry
- `10_AI_Narrative_Generation.md` -- Narrative generation from structured input

## Entry Points

A finding can be created from three places:

1. **Checklist item detail**: "Add Finding" button in the bottom action bar. Finding is automatically linked to that checklist item and inherits its `sectionId` and `checklistItemId`.
2. **Quick action FAB**: From anywhere in the active inspection. Creates an unattached finding that the inspector categorizes during entry or later.
3. **Photo-first flow**: Inspector takes a photo via quick action, then creates a finding from the photo. The photo is pre-attached.

All three entry points lead to the same FindingEntry screen with different fields pre-populated.

## Finding Entry Screen

### Layout

Single scrollable screen. Fields are ordered by the sequence inspectors think in: what component, what's wrong with it, how bad is it, then the details.

Bottom action bar: "Save" (primary). Finding is saved on each field change for offline resilience (debounced 500ms auto-save to Firestore), but the explicit Save button confirms and navigates back.

### Field 1: Component

**What are you looking at?**

Searchable picker with categorized options. Components are scoped to the current section context when entering from a checklist item.

Input method: text field at top that filters the list as the inspector types. Below the filter, a scrollable list of components grouped by category. Tapping a component selects it and advances focus to the next field.

Component options are derived from the checklist template. Each checklist item has a `component` field (see `02_Database_Schema.md`). When entering from a checklist item, that component is pre-selected. The inspector can override it.

When entering via quick action (no checklist context), show the full component list from the template. Recent components (from this inspection's existing findings) appear at the top as a "Recent" group.

Custom component entry: if the inspector types a value not in the list, an "Add [typed value]" option appears at the top of the list. This creates an ad-hoc component for this finding.

### Field 2: Condition

**What's wrong with it?**

Searchable picker, similar UI to component picker. Conditions are contextual -- the list changes based on the selected component.

Example conditions for "Water Heater":
- Corroded supply lines
- Improper venting
- No expansion tank
- Past useful life
- Leaking at base
- Missing TPR discharge pipe
- Inadequate clearance
- No seismic strapping

Example conditions for "Electrical Panel":
- Double-tapped breakers
- Missing knockouts
- Improper grounding
- Federal Pacific / Zinsco panel
- Aluminum wiring
- Exposed wiring
- Corrosion present

Condition lists are stored as part of the checklist template's item data. System templates ship with curated condition lists per component. Custom templates can extend these.

If no pre-built conditions match, the inspector types a custom condition. Custom conditions used 3+ times across inspections are suggested for addition to the inspector's personal condition library.

### Field 3: Severity

**How serious is it?**

Four-option segmented control, displayed as a horizontal row of large tappable pills. Each pill shows the severity label and is colored with its semantic color (see `04_UI_Design_System.md`).

| Severity | Color | When to Use |
|----------|-------|-------------|
| Critical | Red (`critical`) | Safety hazard, requires immediate attention. Inspector would recommend not closing without resolution. |
| Major | Orange (`major`) | Significant defect affecting function or longevity. Should be repaired or evaluated by a specialist. |
| Minor | Yellow (`minor`) | Cosmetic or minor functional issue. Maintenance item. |
| Informational | Blue (`info`) | Not a defect. Observation, FYI, or positive note (e.g., "roof replaced 2023"). |

Default selection: none. Inspector must explicitly choose. This prevents accidental mis-severity from a default value.

Severity pill size: 72px wide minimum, 48px tall. Full-width row with equal distribution. Large enough for gloved tapping.

### Field 4: Narrative

**Professional description of the finding.**

Text area displaying the AI-generated narrative. On component + condition + severity selection, the system calls `generateNarrative` (see `10_AI_Narrative_Generation.md`) to produce a professional description and recommendation.

States:
- **Generating**: Skeleton text lines with "Generating description..." label. Inspector can continue to photos while this loads.
- **Generated**: Full narrative text in an editable text area. Inspector can accept as-is, edit, or replace entirely.
- **Manual**: If AI is unavailable or inspector prefers, a "Write manually" toggle switches to a blank text area.
- **From library**: "Use saved" button opens the comment library filtered by the selected component and condition. See `10_AI_Narrative_Generation.md`.

The `narrativeSource` field on the finding document tracks origin: `"ai"`, `"manual"`, or `"ai_edited"` (AI-generated then modified).

### Field 5: Recommendation

Separate text area below the narrative. Also AI-generated alongside the narrative. Editable.

Recommendation is the actionable suggestion: "Have a licensed plumber evaluate and repair", "Monitor and repair as needed", "Recommend evaluation by a structural engineer."

### Field 6: Photos

Photo thumbnail grid (see `04_UI_Design_System.md` photo thumbnail grid pattern). Shows attached photos with annotation indicators.

- "Add Photo" button opens camera (see `09_Photo_Capture_Annotation.md`)
- Tap existing photo to view full-size or edit annotations
- Swipe left on photo to remove (with undo toast, not confirmation dialog)
- Max 10 photos per finding
- Photo order is drag-free: use move arrows (see gloved operation constraints in `04_UI_Design_System.md`)

If the finding was created via photo-first flow, the triggering photo appears here pre-attached.

## Auto-Save Behavior

Every field change triggers a debounced save (500ms) to the Firestore `findings` subcollection. This means:

- The inspector never loses work if the app crashes or is backgrounded
- Navigating away from a partially-complete finding preserves all entered data
- The finding document may exist in a partial state (e.g., component selected but no severity yet)

Partial findings are valid and saveable. The report assembly step (see `11_Report_Assembly.md`) flags findings missing required fields (component, condition, severity, narrative) during the review flow.

## Editing Existing Findings

Tapping a finding from the checklist item detail or section review opens the same FindingEntry screen with all fields populated. All fields remain editable until the report is published.

The finding's `updatedAt` timestamp tracks last modification. No edit history in v1 -- the current state is the only state.

## Deleting Findings

Swipe-left on a finding row in any list, or explicit "Delete" button at the bottom of the FindingEntry screen (top of screen per thumb zone rules -- destructive action placed outside easy thumb reach).

Deletion is soft: the document is removed from the subcollection. No undo beyond the immediate session (a toast with "Undo" for 5 seconds). After the toast dismisses, the finding and its photos are permanently deleted.

Finding deletion updates the parent inspection's `findingCounts` denormalized field and the checklist item's `findingCount`.

## Unattached Findings

Findings created via quick action without a checklist context have `checklistItemId: null` and `sectionId: null`. These appear in a dedicated "Unattached" group at the bottom of the section list in the checklist view.

The inspector can attach them later by tapping "Categorize" on the finding, which opens a picker showing sections and items. Selecting an item sets `checklistItemId` and `sectionId`.

Unattached findings are included in the report. They appear in an "Additional Observations" section at the end.

## Severity Distribution Guidance

The app does not enforce severity distribution rules, but the report preview (see `12_Report_Preview_Publish.md`) shows a severity summary chart. If an inspection has an unusual distribution (e.g., 20 critical findings, or zero findings across 150 items), the final review surfaces a non-blocking advisory.

This is informational only -- the inspector has final authority on severity assignments.

## Gaps & Assumptions

1. **Component and condition lists** -- System templates need curated component/condition mappings authored by practicing inspectors. The data structure supports them but the content is not defined in this PRD. This is a content authoring task, not an engineering task.
2. **Condition-to-severity suggestions** -- Some conditions imply a severity (e.g., "Federal Pacific panel" is always critical). The system could pre-select severity based on condition. Not specified -- default is no pre-selection. Consider as a post-MVP enhancement.
3. **AI narrative latency** -- Generating a narrative requires a Cloud Function call to the Claude API. Typical latency: 2-4 seconds. The inspector should not be blocked -- they can add photos or move to the next finding while the narrative generates.
4. **Offline narrative generation** -- AI narratives require connectivity. When offline, the narrative field shows "Will generate when online" and saves the structured input. The `generateNarrative` call fires when connectivity returns, or the inspector writes manually. See `17_Offline_Sync.md`.
5. **Finding ordering** -- Findings within a checklist item are ordered by `order` field. Default order is creation order. No manual reordering in v1.
6. **Maximum findings per item** -- No hard limit specified. Practically, more than 10 findings on a single checklist item is unusual. No enforcement, but the UI should handle long lists gracefully.  
