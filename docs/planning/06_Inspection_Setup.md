# Inspection Setup

## Overview

The entry point for every inspection. An inspector creates a new inspection by entering property details, client and agent contact information, and selecting a checklist template. The setup screen is designed for speed -- an inspector sitting in their car before walking up to the property should be able to complete setup in under 60 seconds. Contacts entered here are automatically used as report recipients at publish time (see `12_Report_Preview_Publish.md`).

## Dependencies

- `02_Database_Schema.md` -- `inspections` collection, `PropertyInfo` shape, `checklistTemplates` collection
- `04_UI_Design_System.md` -- Form patterns, touch targets, field ergonomics
- `05_Mobile_Shell_Navigation.md` -- Entry point from InspectionsList, transitions to ActiveInspection
- `07_Checklist_Engine.md` -- Template selection determines checklist structure

## Setup Flow

### Screen Structure

Single scrollable screen with three collapsible sections. All sections expand by default on a new inspection. Sections collapse after being filled to reduce visual clutter.

**Section 1: Property Details**
**Section 2: Client & Agent**
**Section 3: Checklist Template**

Bottom action bar: "Start Inspection" button (disabled until required fields are complete).

### Section 1: Property Details

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Address | Text input | Yes | Street address, single line |
| City | Text input | Yes | |
| State | Picker (2-letter) | Yes | Default to device locale state |
| ZIP | Text input (numeric) | Yes | 5-digit, numeric keyboard |
| Property Type | Segmented control | Yes | Single Family, Condo, Townhouse, Multi-Family |
| Year Built | Text input (numeric) | No | 4-digit year, numeric keyboard |
| Square Footage | Text input (numeric) | No | Numeric keyboard |

**Address autocomplete**: Use device location to suggest the current address on screen load. If GPS is available and the inspector is at the property, pre-populate address fields. Use Google Places Autocomplete as the inspector types. This is the single biggest time-saver for setup.

**Property Type**: Segmented control with four options. Displayed as a horizontal row of tappable pills (not a dropdown). Default: Single Family. See `04_UI_Design_System.md` for segmented control pattern -- four options fits within the guideline of preferring segmented controls over dropdowns for 4 or fewer options.

### Section 2: Client & Agent

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| Client Name | Text input | Yes | Buyer's name |
| Client Email | Text input (email) | Yes | Primary report delivery address |
| Client Phone | Text input (phone) | No | For SMS notification |
| Agent Name | Text input | No | Buyer's agent |
| Agent Email | Text input (email) | No | Secondary report delivery |
| Agent Phone | Text input (phone) | No | For SMS notification |

**Additional Recipients**: "Add another recipient" link below the agent fields. Opens an inline row with Name, Email, and Type (dropdown: Agent, Attorney, Other). Max 5 additional recipients [default -- PRD unspecified].

**Contacts from recent inspections**: When the inspector starts typing an agent name or email, suggest matches from their previous inspections. Agents are frequently repeated across inspections. Query the inspector's past 50 inspections for unique agent entries, cached locally.

### Section 3: Checklist Template

A selectable list of available templates. Each template shows:

- Template name (e.g., "Standard Residential", "Condo Inspection")
- Item count (e.g., "127 items across 14 sections")
- Source badge: "System" (built-in), "Custom" (inspector-created), or "Firm" (shared by firm)

Default template is pre-selected (the template marked `isDefault` in Firestore -- see `02_Database_Schema.md`). Inspector can tap to change.

If only one template exists (common for new users), skip the selection UI entirely and show the template name as a non-interactive label.

**Template preview**: Tapping a template shows a modal with section names and item counts per section. Does not show individual items -- that level of detail lives in the active inspection.

## Validation Rules

- Address, City, State, ZIP, Client Name, Client Email are required
- Email fields: standard email format validation on blur
- ZIP: exactly 5 digits
- Year Built: 1800-current year (if provided)
- Square Footage: positive integer (if provided)
- At least one checklist template must exist (system templates satisfy this)

Validation messages appear inline below the field. Do not use alert dialogs for validation.

## Creating the Inspection Document

When the inspector taps "Start Inspection":

1. Validate all required fields
2. Create `inspections` document in Firestore with status `"in_progress"` and `startedAt` set to now
3. Copy all checklist items from the selected template into the `checklistProgress` subcollection with status `"pending"`
4. Navigate to ActiveInspection (see `05_Mobile_Shell_Navigation.md`)

The inspection document includes `firmId` denormalized from the inspector's user document at creation time. This ensures firm visibility even if the inspector later leaves the firm.

### Offline Creation

Inspection creation must work offline. Firestore's offline persistence handles this -- the document is written to the local cache and synced when connectivity returns. The inspector can immediately begin the inspection without waiting for server confirmation.

The `checklistProgress` subcollection write (copying template items) also happens locally. This is a batch write of potentially 100+ documents. Use Firestore batch writes (max 500 per batch, well within template sizes).

## Draft Inspections

If the inspector exits the setup screen before tapping "Start Inspection", no document is created. There is no draft state for setup -- the form is lightweight enough to re-enter.

If the inspector starts an inspection and then exits the active inspection, the inspection remains in `"in_progress"` status and appears in the InspectionsList with a "Resume" button.

## Editing Setup Details

After an inspection is created, the inspector can edit property details and contacts from the inspection detail screen or from within the active inspection (tap the address in the header to open property details).

Editable until the report is published. Once published, property and contact details are frozen in the report snapshot (see `02_Database_Schema.md`, `reports` collection).

## Recent Inspections List

The InspectionsList screen (parent of InspectionSetup) shows inspections grouped by status:

**Active section** (top, always visible):
- In-progress inspections with resume button, property address, started time
- Maximum of 3 concurrent in-progress inspections [default -- PRD unspecified]

**Recent section** (below):
- Published and completed inspections, sorted by `publishedAt` descending
- Shows property address, date, finding count summary (severity badges)
- Tap opens InspectionDetail (read-only summary with link to report)

**Search and filter**:
- Search by property address or client name
- Filter by status: All, In Progress, Published
- Firm admins see toggle: "My Inspections" / "All Firm Inspections" (see `05_Mobile_Shell_Navigation.md`)

## Repeat Inspection

"Repeat" action on any past inspection in the list. Pre-fills property details and client/agent contacts from the previous inspection into a new setup form. Inspector reviews, adjusts if needed, and starts. This is common for re-inspections or follow-up visits.

Does not copy findings or checklist progress -- only setup metadata.

## Gaps & Assumptions

1. **Google Places API cost** -- Address autocomplete requires a Google Places API key and incurs per-request charges. No cost estimate in the PRD. Debounce autocomplete requests to 300ms minimum.
2. **GPS permission handling** -- Pre-populating address from GPS requires location permission. If denied, the feature degrades gracefully to manual entry. Do not block setup on location permission.
3. **Concurrent inspection limit** -- Set to 3 as a default. This prevents orphaned inspections but the limit is arbitrary. May need adjustment based on user feedback.
4. **Template selection UX for firms** -- If a firm has 10+ templates, the simple list becomes unwieldy. For v1, a flat list with search is sufficient. Categorization or folders deferred.
5. **Contact storage and privacy** -- Agent contact suggestions pull from past inspections stored locally. No separate contacts collection. This means suggestions are lost if the app cache is cleared. A dedicated contacts collection is a post-MVP consideration.
6. **Multi-unit properties** -- Condos and multi-family properties may need unit numbers. Not specified. Default: include unit number in the address field as free text.  
