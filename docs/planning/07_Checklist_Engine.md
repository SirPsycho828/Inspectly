# Checklist Engine

## Overview

The checklist is the spine of every inspection. It guides the inspector through the property systematically, tracks progress, and ensures nothing is missed. Inspectly uses a hybrid organization model -- sections are organized by area (where you are in the house) with system-based items within each area (what you're looking at). This matches how inspectors physically move through a property while ensuring all systems are evaluated in each location.

## Dependencies

- `02_Database_Schema.md` -- `checklistTemplates` collection, `checklistProgress` subcollection
- `04_UI_Design_System.md` -- Checklist row component, touch targets, severity badges
- `05_Mobile_Shell_Navigation.md` -- Active inspection navigation, forward/back between items
- `06_Inspection_Setup.md` -- Template selection and progress subcollection initialization
- `08_Finding_Entry_Severity.md` -- Finding creation from checklist items

## Hybrid Organization Model

### Structure Hierarchy

```
Template
└── Section (area-based)
    └── Item (system/component-based)
```

**Sections** represent physical areas of the property:

| Section | Typical Item Count |
|---------|-------------------|
| Exterior - Front | 8-12 |
| Exterior - Rear/Sides | 8-10 |
| Roof | 10-15 |
| Garage | 6-10 |
| Kitchen | 10-14 |
| Bathrooms | 8-12 (per bathroom) |
| Bedrooms | 4-6 (per bedroom) |
| Living Areas | 4-6 |
| Basement/Crawl Space | 10-15 |
| Attic | 8-12 |
| Electrical (Main Panel) | 8-12 |
| Plumbing (Main Systems) | 6-10 |
| HVAC | 8-12 |
| Laundry | 4-6 |

A standard residential template has roughly 120-160 items across 14-18 sections.

**Items** within a section represent specific systems or components to inspect:

Example -- "Kitchen" section items:
- Countertops & Cabinets
- Sink & Faucet
- Dishwasher
- Disposal
- Range/Oven
- Microwave (built-in)
- Exhaust/Ventilation
- GFCI Outlets
- Flooring
- Walls & Ceiling
- Windows
- Plumbing Under Sink
- Lighting

### Why Hybrid

Area-first organization matches the inspector's physical path through the property. An inspector doing the kitchen checks everything in the kitchen before moving to the next room. System-based items within each area ensure complete coverage of electrical, plumbing, structural, and mechanical components in that location.

Pure system-based organization (all electrical together, all plumbing together) forces inspectors to walk the property multiple times. Pure area-based organization risks missing systems that span the whole house. Hybrid solves both.

## Checklist View

### Section List Screen

The default view when entering an active inspection. Shows all sections as a vertical scrollable list.

Each section row displays:
- Section name (e.g., "Kitchen")
- Progress bar: thin horizontal bar under the name, `teal-600` fill
- Progress text: "4 of 12 inspected" in `caption`
- Finding count: severity-colored badges if findings exist (e.g., red "2" badge for critical findings in this section)
- Status indicator: checkmark icon when all items are inspected or skipped

Sections are displayed in template-defined order. The inspector cannot reorder sections, but can tap any section in any order -- inspections are non-linear. Some inspectors work top-to-bottom, others follow their own path.

### Item List Screen

Tapping a section shows its items. Each item row follows the checklist row pattern from `04_UI_Design_System.md`:

- **Left**: Status circle
  - Empty circle: `pending`
  - Teal checkmark: `inspected`
  - Slash icon, `slate-400`: `skipped`
  - Dash icon, `slate-300`: `not_applicable`
- **Center**: Item label, finding count in `caption` if findings exist
- **Right**: Chevron to item detail

### Item Detail Screen

Tapping an item opens its detail view:

- Item label as header
- Status selector: row of four tappable options (Inspected, Skipped, N/A, Reset to Pending)
- Findings list: all findings attached to this item, each showing severity badge, component, first line of narrative, photo count
- "Add Finding" button in the bottom action bar
- Forward/back arrows in the header to navigate to adjacent items without returning to the list

## Progress Tracking

### Per-Item Status

| Status | Meaning | Counts Toward Progress |
|--------|---------|----------------------|
| `pending` | Not yet inspected | No |
| `inspected` | Inspector has reviewed this item | Yes |
| `skipped` | Deliberately skipped (e.g., not accessible) | Yes |
| `not_applicable` | Does not exist at this property (e.g., no dishwasher) | Yes |

An item can be marked `inspected` with zero findings -- it means the inspector looked and found nothing notable. Findings are additive, not required.

### Section Completion

A section is complete when all its items have a status other than `pending`. The section row updates in real time as items are marked.

When a section reaches 100% completion, the mini-review flow triggers (see below).

### Inspection Completion

An inspection is complete when all sections are complete. The status changes from `"in_progress"` to `"review"`, and the bottom action bar on the section list screen changes to "Review & Publish" leading to the report preview flow (see `12_Report_Preview_Publish.md`).

The inspector can publish before all sections are complete by explicitly choosing "Publish Partial" -- this requires confirmation and adds a note to the report that certain sections were not inspected.

### Progress Persistence

Progress is written to the `checklistProgress` subcollection in Firestore. Each item status change writes to its corresponding document. These writes work offline (Firestore local cache) and sync when connectivity returns. See `17_Offline_Sync.md`.

The denormalized `checklistProgress` summary on the parent inspection document (`{ total, completed, skipped }`) is updated via a Cloud Function triggered on `checklistProgress` subcollection writes. Offline, the client computes progress locally from the subcollection for display -- the denormalized counts catch up on sync.

## Mini-Review Per Section

When an inspector completes all items in a section, the app presents a section mini-review screen. This catches errors early and builds confidence before the final review.

### Mini-Review Screen

- Section name as header
- Summary: "X items inspected, Y skipped, Z not applicable"
- Finding summary: grouped by severity with counts
- Scrollable list of all findings in this section, showing severity badge, component, narrative preview, and photo thumbnails
- Each finding is tappable to edit
- Bottom action bar: "Confirm Section" (primary), "Keep Editing" (secondary)

"Confirm Section" marks the section as reviewed and returns to the section list. "Keep Editing" returns to the item list for that section.

Mini-review is interruptible -- if the inspector navigates away (e.g., to answer a phone call or check another section), the review state is not lost. Returning to the completed section shows the mini-review again until confirmed.

### Skipping Mini-Review

The mini-review is shown but not enforced. The inspector can dismiss it or navigate away. Unconfirmed sections are still publishable -- the final review step covers everything.

## Checklist Customization

### During Inspection

- **Skip item**: Mark as `skipped` with optional reason (free text, max 100 chars). Reason appears in the report as a note.
- **Mark N/A**: Mark as `not_applicable`. No reason required. Does not appear in the report.
- **Add ad-hoc item**: "Add Item" button at the bottom of any section's item list. Inspector types a label. Creates a new `checklistProgress` document with a generated ID. Ad-hoc items are specific to this inspection and do not modify the template.

### Template Editing (Outside Inspections)

Managed in Settings > Checklist Templates (see `05_Mobile_Shell_Navigation.md`).

- Duplicate a system template to create a custom template
- Add, remove, reorder sections and items
- Rename items and sections
- Cannot edit system templates directly -- duplicate first
- Firm admins can create firm-level templates visible to all firm members

Template changes do not affect in-progress inspections. Active inspections use the snapshot copied at setup time (see `06_Inspection_Setup.md`).

## Default System Templates

Ship with two built-in templates:

1. **Standard Residential** -- Full home inspection, ~150 items across 16 sections. Covers all major systems per ASHI Standards of Practice.
2. **Condo/Townhouse** -- Modified residential template excluding exterior structure, roof, and lot drainage sections that are typically HOA responsibility. ~100 items across 12 sections.

Templates are seeded in Firestore on first deploy. Marked with `ownerId: "system"` and `isDefault: true` for Standard Residential.

## Gaps & Assumptions

1. **Section order vs. inspector path** -- Sections are displayed in template order. No dynamic reordering based on GPS floor detection or similar. Inspectors navigate freely by tapping any section.
2. **Multi-unit handling** -- For multi-family or condo inspections with multiple units, the template does not dynamically duplicate sections per unit. Inspector would need a template designed for the unit count, or use ad-hoc items. Post-MVP enhancement in `18_Future_Features.md`.
3. **Checklist item descriptions** -- Template items have a `description` field (see `02_Database_Schema.md`) for guidance text. The content of these descriptions (what to look for, common defects) is not defined. System templates need this content authored.
4. **ASHI/InterNACHI alignment** -- System templates should follow ASHI Standards of Practice categories. The exact mapping is not specified. The section/item structure above is a reasonable approximation but needs review by a practicing inspector.
5. **Maximum template size** -- No hard limit specified. Templates with 300+ items may cause performance issues on the progress subcollection. Default cap: 500 items per template.  
