▸ Extended thinking (746 chars)  
# Report Preview & Publish

## Overview

The final gate between field work and delivery. After the inspector completes checklist sections (each with its own mini-review), they enter a two-step publish flow: an interactive preview of the full report, followed by a publish confirmation that triggers report creation, PDF generation, and notification delivery. The preview is interactive -- the inspector can tap into sections, review rendered findings, and make edits without leaving the preview context.

## Dependencies

- `02_Database_Schema.md` -- `reports` collection, `inspections` status transitions
- `04_UI_Design_System.md` -- Bottom action bar, severity badges, card patterns
- `10_AI_Narrative_Generation.md` -- Executive summary generation via `generateExecutiveSummary`
- `11_Report_Assembly.md` -- Assembly logic, completeness validation, display options
- `13_Report_Delivery_Portal.md` -- What happens after publish
- `14_Client_Agent_Notifications.md` -- Notification triggers at publish

## Entry to Publish Flow

The publish flow is accessible when the inspection status is `"in_progress"` or `"review"`.

**Primary entry**: When all checklist sections are complete, the bottom action bar on the section list screen changes to "Review & Publish." Tapping transitions the inspection status to `"review"` and opens the publish flow.

**Early entry**: An inspector can tap "Review & Publish" before all sections are complete. The completeness validation runs (see `11_Report_Assembly.md`) and shows warnings for incomplete sections. The inspector confirms "Publish as Partial" to proceed.

The publish flow is a linear sequence of screens within the active inspection navigation stack:

```
1. Report Preview (interactive)
2. Executive Summary
3. Publish Confirmation
```

Back navigation is available at every step. The inspector can exit the publish flow, make changes to the inspection, and re-enter.

## Step 1: Report Preview

### Layout

Full-screen scrollable view rendering the report as the client will see it. This is a live rendering of the assembled report (see `11_Report_Assembly.md`), not a static image or PDF preview.

Top bar: "Report Preview" title, close button (returns to active inspection).

The preview renders:
- Cover page section (property address, date, inspector/firm info, branding)
- Inspection summary table (section-by-section finding counts)
- Each section with its findings, narratives, recommendations, and photo thumbnails
- Additional Observations section (if unattached findings exist)

Bottom action bar: "Continue to Summary" (primary), "Edit Report Settings" (secondary).

### Interactive Editing

The preview is interactive, not read-only:

- **Tap a finding**: Expands the finding in-place showing full narrative, recommendation, and photos. Tap "Edit" to open the FindingEntry screen for that finding. On save, the preview updates immediately.
- **Tap a photo**: Opens full-screen photo viewer with annotation capability. Changes save back to the finding.
- **Tap a section header**: Collapses/expands the section for faster scrolling.
- **Tap the summary table**: Scrolls to the corresponding section in the report body.

Edits made from the preview update the underlying inspection data. The preview always reflects current state -- there is no separate "preview document" to sync.

### Report Settings

"Edit Report Settings" opens a bottom sheet with:

| Setting | Control | Default |
|---------|---------|---------|
| Show items with no findings | Toggle | On |
| Report display name | Text field | Inspector's `displayName` |
| Report display license | Text field | Inspector's `licenseNumber` |

These settings affect the current report only. The "show items with no findings" preference is persisted to the user document for future inspections.

### Severity Summary Chart

At the top of the preview, below the cover section, a horizontal stacked bar chart shows finding distribution by severity. Each segment is colored with the semantic severity color (see `04_UI_Design_System.md`). Segment labels show counts.

This chart appears in the published report and gives clients an immediate visual read on the inspection outcome.

## Step 2: Executive Summary

### Layout

Single screen focused on the executive summary text.

- Header: "Executive Summary"
- Subheader: "This summary appears at the top of your report and gives clients a quick overview."
- AI-generated summary in an editable text area (full screen width, min height 200px)
- Below the text area: severity breakdown as reference (critical: X, major: Y, minor: Z, info: W)
- Bottom action bar: "Continue to Publish" (primary)

### Generation Flow

1. On screen mount, call `generateExecutiveSummary` Cloud Function (see `10_AI_Narrative_Generation.md`)
2. Show skeleton loading in the text area while generating
3. Generated summary populates the text area (editable)
4. Inspector can accept, edit, rewrite, or regenerate

**Regenerate**: "Regenerate" button below the text area. Calls the API again and replaces the current text. Confirm before replacing if the inspector has made edits.

**Manual write**: The inspector can clear the generated text and write their own. Or start typing immediately -- if the AI response arrives after the inspector has begun typing, the AI result is discarded.

**Offline**: If offline, show "Summary will be generated when connected. You can write one now or publish without a summary." The summary field is optional -- a report can publish without one, though it's recommended.

### Summary Content

The generated summary covers (see `10_AI_Narrative_Generation.md` for prompt details):
- Overall impression of the property
- Count of findings by severity
- Top critical/major items called out by name
- Brief note on areas in good condition
- Balanced, professional tone

## Step 3: Publish Confirmation

### Layout

Final confirmation screen before the report goes live.

- Header: "Publish Report"
- Property address and date displayed prominently
- Recipient list showing who will receive the report:
  - Client: name, email, phone (if provided)
  - Agent: name, email (if provided)
  - Additional recipients: names and emails
  - Each recipient has a toggle (on by default) to include/exclude from notification
- "Add Recipient" button to add last-minute recipients (opens inline name + email fields)
- Report summary card: total findings by severity, total photos, section count
- Disclaimer checkbox: "I confirm this report is complete and ready for delivery" (required)
- Bottom action bar: "Publish Report" (primary, teal), "Back to Preview" (secondary)

### Publish Action

When the inspector taps "Publish Report":

1. Button enters loading state ("Publishing..."), disabled to prevent double-tap
2. Client calls the `publishReport` Cloud Function (see `03_API_Endpoints.md`)
3. Cloud Function executes the full publish pipeline:
   - Validates inspection is in `review` status
   - Bakes photo annotations into flat images
   - Creates `reports` document with complete data snapshot
   - Generates access codes for each enabled recipient
   - Updates inspection status to `"published"`, sets `reportId` and `publishedAt`
   - Triggers async PDF generation
   - Triggers notification delivery to all enabled recipients
4. On success: navigate to a "Report Published" confirmation screen
5. On failure: show error inline, button re-enables. Inspector can retry.

Expected duration: 5-15 seconds depending on photo count (annotation baking is the bottleneck). A progress indicator is shown but the inspector cannot cancel mid-publish.

### Post-Publish Confirmation Screen

Shown immediately after successful publish:

- Checkmark animation
- "Report Published" heading
- Property address
- Recipient delivery status: "Notifications sending..." (notifications are async)
- Access codes displayed for each recipient (for manual sharing via text/call)
  - Each code has a "Copy" button
  - "Share All Codes" button generates a shareable text block with all recipient names and codes
- "View Report" button: opens the report detail screen in the Reports tab
- "New Inspection" button: returns to InspectionsList
- "Done" button: exits active inspection mode, returns to InspectionsList

The inspector should write down or share access codes if they want to communicate them verbally to the client on-site (common practice -- hand the client their code before leaving).

## Publish Validation

The `publishReport` Cloud Function performs server-side validation before creating the report:

| Check | Behavior |
|-------|----------|
| Inspection status not `review` or `in_progress` | Reject with `failed-precondition` |
| No client email | Reject -- at least one recipient required |
| Zero inspected items and zero findings | Reject -- empty report |
| Findings missing severity | Include with severity `informational` (default, logged as warning) |
| Findings missing narrative | Include with narrative "No description provided" |
| Executive summary empty | Publish without summary (valid but flagged in logs) |

Server validation is the final safety net. Client-side validation in the preview step should catch most issues before reaching this point.

## Re-Entering the Publish Flow

If the inspector exits the publish flow (back button, app backgrounded, phone call), all state is preserved:

- Executive summary text is saved to the inspection document on every keystroke (debounced 500ms)
- Report settings are saved immediately on change
- Recipient list changes are saved immediately
- Re-entering the publish flow resumes at the last visited step

The inspection remains in `"review"` status until published or until the inspector explicitly returns to editing (which sets status back to `"in_progress"`).

## Gaps & Assumptions

1. **Publish timeout** -- Annotation baking for 100+ photos could exceed Cloud Functions timeout (540s max for 2nd gen). May require a task queue or Cloud Run for large inspections. Monitor processing time per photo to determine threshold.
2. **Offline publish** -- Publishing requires connectivity (server-side processing). If offline at publish time, show "Publishing requires an internet connection. Your report is saved and ready to publish when you're back online." Do not queue offline publishes.
3. **Access code display** -- Codes are shown post-publish for manual sharing. If the inspector navigates away before noting codes, they can retrieve them from the report detail screen in the Reports tab.
4. **PDF generation timing** -- PDF is generated asynchronously after publish. The confirmation screen does not wait for it. The inspector (and recipients) can view the report immediately via the portal. PDF download becomes available in the portal once generation completes (typically 30-60 seconds). A push notification to the inspector when PDF is ready is a nice-to-have.
5. **Publish undo** -- There is no unpublish. Once published, the report exists and access codes are delivered. The inspector can revoke access codes or publish an amendment, but cannot delete a published report (reports are legal documents).  
