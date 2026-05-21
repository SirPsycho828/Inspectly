# Report Assembly

## Overview

Report assembly is the transformation from working inspection data (scattered across checklist progress, findings, and photos) into a structured, publishable report. This happens automatically as the inspector works -- there is no manual "build report" step. The report structure mirrors the checklist organization, pulling findings into their respective sections with photos, narratives, and severity tags rendered in a consistent format. The inspector reviews and publishes; the system handles compilation.

## Dependencies

- `02_Database_Schema.md` -- `reports` collection, `ReportSection` and `ReportFinding` shapes, `inspections` collection
- `07_Checklist_Engine.md` -- Section and item structure that defines report organization
- `08_Finding_Entry_Severity.md` -- Finding data, severity levels, unattached findings
- `09_Photo_Capture_Annotation.md` -- Photo references, annotation baking at publish
- `12_Report_Preview_Publish.md` -- Preview uses the assembled report structure

## Report Structure

A published report follows a fixed structure. The inspector controls the content but not the layout.

```
Cover Page
  Property address, date, inspector name/firm, branding

Table of Contents
  Auto-generated from sections

Executive Summary
  AI-generated and/or inspector-written overview

Inspection Summary Table
  Section-by-section overview with finding counts by severity

Section 1: [Area Name]
  Item 1.1: [Component]
    Finding 1.1.1: severity, narrative, recommendation, photos
    Finding 1.1.2: ...
  Item 1.2: [Component]
    (no findings -- marked inspected, not shown OR shown as "No deficiencies")
  ...

Section 2: [Area Name]
  ...

Additional Observations
  Unattached findings (if any)

Appendix: Limitations & Disclaimers
  Standard inspection scope limitations
```

## Assembly Logic

### When Assembly Happens

The report is not pre-built as a separate document during the inspection. Instead, assembly is a read-time operation: the preview screen and the publish function both query the inspection's data and assemble it into the report structure on demand.

This means:
- No stale report data -- the preview always reflects current findings
- No sync issues between inspection edits and a cached report
- The `reports` collection document is only created at publish time as an immutable snapshot

### Section Assembly

Each report section maps to a checklist section. The assembly process:

1. Read all sections from `checklistProgress` subcollection, grouped by `sectionId`
2. For each section, read all findings where `sectionId` matches
3. Order findings within each item by the `order` field
4. Include items with findings. Items marked `inspected` with zero findings are optionally included (see display options below).
5. Exclude items marked `not_applicable`
6. Items marked `skipped` are listed with their skip reason in a separate "Skipped Items" note at the end of the section

### Finding Assembly

Each finding is compiled into a `ReportFinding` with:

| Field | Source |
|-------|--------|
| `component` | Finding document |
| `condition` | Finding document |
| `severity` | Finding document |
| `narrative` | Finding document |
| `recommendation` | Finding document |
| `photos` | Finding document's `photos` array -- URLs only at preview, baked at publish |

Findings are ordered within their checklist item by the `order` field, then by severity (critical first) as a secondary sort.

### Unattached Findings

Findings with `checklistItemId: null` are collected into an "Additional Observations" section appended after all checklist-based sections. They follow the same finding format but are grouped by component name rather than checklist item.

If there are no unattached findings, this section is omitted.

### Inspection Summary Table

Auto-generated table at the top of the report showing each section's status at a glance:

| Section | Items | Findings | Critical | Major | Minor | Info |
|---------|-------|----------|----------|-------|-------|------|
| Exterior - Front | 10 | 3 | 0 | 1 | 2 | 0 |
| Kitchen | 12 | 5 | 1 | 2 | 1 | 1 |
| ... | | | | | | |
| **Totals** | **142** | **47** | **3** | **11** | **22** | **11** |

This table gives clients and agents an immediate overview before diving into details.

## Display Options

### Items Without Findings

An inspected item with zero findings can be displayed two ways:

1. **Omit from report**: Only show items that have findings. This produces a shorter, defect-focused report.
2. **Show as "No deficiencies observed"**: Include all inspected items with a one-line note. This produces a more comprehensive report that shows the inspector checked everything.

Default: Option 2 (show all inspected items). The inspector can toggle this in report settings before publishing. The toggle lives on the report preview screen as a switch: "Show items with no findings."

This preference is saved per-inspector on their user document for future inspections.

### Section Ordering

Sections appear in the same order as the checklist template. The inspector cannot reorder sections in the report -- the template defines the structure.

Within a section, items appear in template order regardless of the order they were inspected.

### Photo Display in Report

Each finding shows its photos below the narrative and recommendation. Photos display:

- In the order set by the inspector (the `order` field on each `FindingPhoto`)
- With annotations baked in (at publish time)
- With captions below each photo (if provided)
- Primary photo (first in order) is displayed larger; subsequent photos display in a smaller grid

Portal rendering: photos are tappable to view full-size in a lightbox. PDF rendering: photos are inline at a fixed width.

## Report Metadata

The assembled report includes metadata that appears on the cover page and in document headers/footers:

| Metadata | Source |
|----------|--------|
| Property address | `inspection.property` |
| Inspection date | `inspection.startedAt` |
| Inspector name | `user.displayName` (snapshotted at publish) |
| Inspector license | `user.licenseNumber` |
| Firm name | `firm.name` (if applicable) |
| Firm logo | `firm.branding.logoUrl` (if applicable) |
| Firm contact info | `firm.branding.companyPhone`, `companyEmail` |
| Report footer | `firm.branding.reportFooterText` or default Inspectly footer |
| Report ID | Generated at publish (for reference in correspondence) |
| Page numbers | Auto-generated in PDF |

Solo inspectors without a firm use their personal branding (see `16_Branding_Configuration.md`). If no branding is configured, the report uses Inspectly defaults.

## Completeness Validation

Before the inspector can enter the publish flow, the assembly process runs a completeness check. This is advisory, not blocking -- the inspector can proceed with warnings.

### Warnings (Non-Blocking)

| Condition | Warning Message |
|-----------|-----------------|
| Sections with all items `pending` | "Section [name] has no inspected items" |
| Findings missing narrative | "X findings have no description" |
| Findings missing severity | "X findings have no severity assigned" |
| Findings missing photos | Not warned -- photos are optional |
| Unattached findings exist | "X findings are not linked to a checklist item" |
| Unusual severity distribution | "This inspection has X critical findings" (if > 10) |

### Blocking Conditions

| Condition | Message |
|-----------|---------|
| Zero findings and zero inspected items | "Cannot publish an empty inspection" |
| No client email | "A client email is required for report delivery" |

Blocking conditions prevent entry into the preview screen. The inspector must fix them first.

## Partial Inspections

An inspector may choose to publish before completing all checklist sections. This is valid -- some areas may be inaccessible (locked rooms, snow-covered roof, etc.).

Partial inspection reports include:
- A notice on the cover page: "This is a partial inspection. The following sections were not inspected: [list]"
- Skipped sections are listed with their skip reasons if provided
- The inspection summary table shows "Not Inspected" for these sections

The inspector must confirm "Publish as Partial" explicitly to acknowledge incomplete coverage.

## Report Versioning

Initial publish creates a report document with `version: 1`. Amendments create new report documents with incremented version numbers. See `13_Report_Delivery_Portal.md` for the amendment workflow.

The assembly process is identical for amendments -- the amended inspection data is re-assembled into a new report snapshot. The diff between versions is not computed or displayed in v1.

## Gaps & Assumptions

1. **Limitations and disclaimers text** -- The appendix section needs standard inspection limitation language (scope of inspection, systems not covered, general disclaimers). This is typically boilerplate that varies by state and business. The app should ship with a default template and allow inspectors to customize. Content authoring required.
2. **Report numbering/ID format** -- No specification for report ID format. Default: `RPT-{YYYYMMDD}-{4-digit sequential}` (e.g., RPT-20260520-0042). Unique per inspector.
3. **Photo layout in PDF** -- How many photos per page, sizing rules, and whether photos can span page breaks is not specified. Default: primary photo at 60% page width, secondary photos in a 2-column grid. Photos do not break across pages.
4. **Custom sections** -- Inspectors cannot add custom report sections beyond what the checklist defines (plus Additional Observations). Some inspectors include sections like "Maintenance Recommendations" or "Home Overview." Deferred to custom template support.
5. **Report language/locale** -- English only in v1. Date and number formatting follows US conventions (MM/DD/YYYY, comma-separated thousands).  
