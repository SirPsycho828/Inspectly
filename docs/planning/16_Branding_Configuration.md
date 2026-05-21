▸ Extended thinking (596 chars)  
# Branding Configuration

## Overview

Inspectors and firms customize the appearance of their published reports and the delivery portal with their own logo, colors, and contact information. Professional branding is a key selling point for small firms competing with larger inspection companies -- a polished, branded report builds client confidence. Branding is configured once and applied automatically to every report at publish time. Firm-level branding applies to all inspectors in the firm; solo inspectors configure their own.

## Dependencies

- `02_Database_Schema.md` -- `firms.branding` embedded object, `reports.branding` snapshot
- `03_API_Endpoints.md` -- `onBrandingLogoUpload` Cloud Storage trigger
- `04_UI_Design_System.md` -- Default color tokens, severity colors (never overridden by branding)
- `13_Report_Delivery_Portal.md` -- Portal renders with firm branding
- `15_Firm_Management.md` -- Firm admin manages firm branding, firm settings screen

## Branding Scope

| User Type | Where Configured | Applies To |
|-----------|-----------------|------------|
| Solo inspector (no firm) | Settings > Branding | Their own reports and portal pages |
| Firm member (non-admin) | Cannot configure | Firm branding applied automatically |
| Firm admin | Firm Settings > Branding | All firm members' reports and portal pages |

Firm branding always takes precedence. When an inspector joins a firm, their personal branding stops being used on new reports. If they leave the firm, personal branding resumes. Previously published reports retain whatever branding was active at publish time (snapshot).

## Branding Elements

### Logo

| Property | Specification |
|----------|--------------|
| Format | PNG or JPEG (SVG not supported -- inconsistent rendering in PDF) |
| Minimum size | 200 x 200 px |
| Maximum size | 2000 x 2000 px |
| Max file size | 2 MB |
| Aspect ratio | Any (displayed within a constrained box) |
| Background | Transparent PNG recommended for best results on white and colored backgrounds |

**Upload flow:**

1. Inspector/admin taps "Upload Logo" on the branding screen
2. Image picker opens (camera roll or file browser)
3. Client-side validation: file type, file size
4. Upload to Cloud Storage at `branding/{userId}/logo.{ext}` (solo) or `branding/firms/{firmId}/logo.{ext}` (firm)
5. `onBrandingLogoUpload` Cloud Function triggers:
   - Validates dimensions (rejects if outside min/max)
   - Generates sized variants:
     - `logo_full.png` -- original dimensions, max 1000px on longest edge
     - `logo_thumb.png` -- 200px on longest edge (for mobile app display)
     - `logo_email.png` -- 300px wide (for email templates)
   - Writes URLs back to the user or firm document
6. Branding screen updates with the new logo preview

**Logo display contexts:**

| Context | Variant Used | Display Size |
|---------|-------------|--------------|
| Mobile app (settings) | `logo_thumb` | 80 x 80 px, contained |
| Report cover page (portal) | `logo_full` | Max 200px wide, proportional height |
| Report cover page (PDF) | `logo_full` | Max 150px wide, proportional height |
| Email notification header | `logo_email` | Max 200px wide |
| Portal access code screen | `logo_full` | Max 160px wide |

Logo is always displayed in a constrained box with `object-fit: contain`. Never stretched or cropped.

### Primary Color

A single brand color that replaces the default teal (`#0D9488`) in report and portal contexts.

**Where applied:**
- Report section headers (background or left border)
- Portal CTA button ("View Report" button in email, portal navigation accents)
- Report cover page accent elements
- Portal table of contents active state
- Email CTA button background

**Where NOT applied (never overridden):**
- Severity colors (critical red, major orange, minor yellow, info blue) -- these must remain consistent across all reports for universal readability
- In-app UI for the inspector -- the mobile app always uses Inspectly teal
- Text colors -- brand color is used for accents and backgrounds only
- Status indicators (success green, error red)

**Input method:** Color picker on the branding screen. Displays a grid of 12 pre-selected professional colors (dark blues, greens, burgundies, navy, charcoal) plus a "Custom" option that opens a hex input field. No full spectrum color wheel -- constraining options prevents inspectors from choosing colors that look unprofessional or have poor contrast.

**Pre-selected colors:**

| Name | Hex | Category |
|------|-----|----------|
| Navy | `#1E3A5F` | Blue |
| Royal Blue | `#2563EB` | Blue |
| Forest | `#166534` | Green |
| Teal (default) | `#0D9488` | Green |
| Burgundy | `#881337` | Red |
| Crimson | `#B91C1C` | Red |
| Charcoal | `#374151` | Neutral |
| Slate | `#475569` | Neutral |
| Purple | `#7C3AED` | Purple |
| Bronze | `#92400E` | Brown |
| Steel Blue | `#3B82F6` | Blue |
| Emerald | `#059669` | Green |

**Contrast validation:** If a custom hex is entered, validate that white text on the chosen color meets WCAG AA contrast ratio (4.5:1). If not, show a warning: "This color may be hard to read. Consider a darker shade." Warning is non-blocking.

### Contact Information

| Field | Where Displayed |
|-------|----------------|
| Company Phone | Report cover page, report footer |
| Company Email | Report cover page, email "reply to" context |
| Company Website | Report cover page |
| Report Footer Text | Bottom of every report page (portal and PDF) |

These fields are configured on the firm settings screen (for firms) or the personal branding screen (for solo inspectors). See `15_Firm_Management.md` for firm settings.

**Report Footer Text** is a single line, max 200 characters. Used for taglines, license info, or disclaimers. Example: "Licensed & Insured | ABC Inspections LLC | State License #12345"

Default footer (if none configured): "[Inspector Name] | Powered by Inspectly"

## Branding Screen (UI)

### Solo Inspector: Settings > Branding

Single scrollable screen:

- **Logo section**: Current logo preview (or placeholder icon), "Upload Logo" and "Remove Logo" buttons
- **Color section**: Color grid with current selection highlighted, custom hex input
- **Contact section**: Phone, email, website fields
- **Footer section**: Report footer text field with character counter
- **Preview card**: A miniature report cover page preview showing how the branding looks with the current settings. Updates live as the inspector changes settings.

### Firm Admin: Firm Settings > Branding

Identical layout to the solo screen. Changes apply to all firm members' future reports.

A "Preview Report" button at the bottom opens a sample report in the portal (using demo data) so the admin can see the full branding in context.

## Branding Snapshot

At publish time, the current branding configuration is copied into the `reports.branding` field as a complete snapshot (see `02_Database_Schema.md`). This means:

- Changing branding settings does not affect previously published reports
- Each report is a self-contained document with all branding data it needs to render
- The portal reads branding from the report document, not from the firm document
- If an inspector leaves a firm, their old firm-branded reports still render correctly

The snapshot includes: `logoUrl` (the `logo_full` variant), `primaryColor`, `companyPhone`, `companyEmail`, `companyWebsite`, `reportFooterText`.

## Default Branding

When no branding is configured (new solo inspector, new firm before setup):

| Element | Default |
|---------|---------|
| Logo | Inspectly logo |
| Primary Color | `#0D9488` (teal-600) |
| Contact Phone | Inspector's phone from profile |
| Contact Email | Inspector's email from profile |
| Website | None |
| Footer | "[Inspector Name] | Powered by Inspectly" |

Defaults are functional -- an inspector can publish reports immediately without configuring branding. The branding screen is optional polish.

## Gaps & Assumptions

1. **"Powered by Inspectly" removal** -- The default footer includes Inspectly attribution. Whether paid tiers can remove this is a business decision not specified in the PRD. Default: always included in v1, even with custom footers (appended as a subtle line below the custom text).
2. **Dark logo variants** -- Only one logo is uploaded. If the firm's logo is dark and the report header background is dark (using the primary color), the logo may be invisible. No automatic detection or light/dark variant support. Recommend transparent PNG with sufficient contrast, but this is a user education issue.
3. **Brand color accessibility** -- The pre-selected palette is chosen for contrast, but custom hex input allows any color. The contrast warning is non-blocking. Severely low-contrast choices will produce hard-to-read reports.
4. **Email sender branding** -- Emails are sent from `reports@inspectly.app` with the inspector/firm name in the "From name" field. True custom sender domains (e.g., `reports@smithinspections.com`) require DNS verification per firm in SendGrid. Deferred to `18_Future_Features.md`.
5. **Multiple brand profiles** -- Some firms may want different branding for different services (home inspection vs. commercial). Only one branding configuration per firm in v1.
6. **Logo caching** -- Portal and PDF generation reference logo URLs from Cloud Storage. If a firm updates their logo, old reports reference the old URL (snapshotted). The old logo file should not be deleted from storage as long as reports reference it.  
