# Report Delivery Portal

## Overview

The client-facing web portal where buyers, agents, and other recipients view published inspection reports. The portal is a separate web application hosted on Firebase Hosting -- it is not part of the React Native mobile app. Recipients access it via a unique link received by email or SMS, enter an access code, and view an interactive branded report with the option to download a PDF. No account creation required.

## Dependencies

- `01_Auth_Roles.md` -- Access code system, portal session tokens, rate limiting
- `02_Database_Schema.md` -- `reports` collection, `accessCodes` subcollection
- `03_API_Endpoints.md` -- Portal HTTP endpoints (`/portal/verify`, `/portal/report`, `/portal/report/pdf`)
- `04_UI_Design_System.md` -- Color tokens, typography, severity colors (shared with mobile app)
- `11_Report_Assembly.md` -- Report structure and section format
- `16_Branding_Configuration.md` -- Firm branding applied to portal display

## Portal Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js (static export) or React SPA | Lightweight, fast initial load |
| Hosting | Firebase Hosting | Same project as the mobile backend |
| Styling | Tailwind CSS | Utility-first, matches design system tokens |
| PDF viewer | None -- PDF is a download, not inline | |

The portal is a simple read-only web app. No complex state management needed. Server-side rendering is unnecessary since content loads via API after access code verification.

## Access Flow

### URL Structure

```
https://report.inspectly.app/r/{reportId}
```

The URL contains only the report ID, not the access code. The access code is entered on the portal page. This prevents codes from leaking in browser history, link previews, or shared URLs.

### Access Code Entry Screen

The first screen a recipient sees:

- Inspectly or firm logo at top (fetched from report metadata after page load using the reportId)
- Property address displayed (non-sensitive, fetched from a lightweight public endpoint that returns only address and inspector/firm name)
- Heading: "Enter your access code"
- Subtext: "Check your email or text message for your 6-character code"
- Input: 6-character field, auto-uppercase, large font (24px), auto-advance between characters or single field with monospace display
- "View Report" button below the input
- "Didn't receive a code?" link at bottom (see troubleshooting below)

Input field: single text input, maxlength 6, auto-uppercase transform. Characters displayed with letter-spacing for readability. Auto-submit when 6 characters are entered (no need to tap the button).

### Verification

On code submission:

1. Call `POST /portal/verify` with `{ reportId, code }`
2. On success: store portal session token in `sessionStorage`, navigate to report view
3. On failure:
   - Show inline error: "Invalid code. X attempts remaining."
   - After 5 failures: "Too many attempts. Try again in 15 minutes." Input disabled with countdown timer.
4. On expired code: "This code has expired. Contact your inspector for a new code."
5. On revoked code: "This code is no longer active. Contact your inspector."

### Session Behavior

Portal session token is stored in `sessionStorage` (cleared when tab closes, not shared across tabs). This means:

- Closing the tab requires re-entering the code
- Opening the same link in a new tab requires re-entering the code
- Refreshing the page within the same tab preserves the session
- 24-hour expiry regardless of activity

This is intentional -- inspection reports contain sensitive property and financial information. Short sessions with code-based access protect recipients who share devices or access reports on public computers.

## Report View

### Layout

Responsive single-page layout. Max content width 800px, centered. Designed primarily for desktop viewing but responsive down to 375px for mobile browsers.

Top bar (sticky):
- Firm logo or Inspectly logo (left)
- Property address (center, truncated on mobile)
- "Download PDF" button (right)

### Content Sections

Rendered in order matching the report structure from `11_Report_Assembly.md`:

**1. Cover Section**
- Property address (full)
- Inspection date
- Inspector name and license number
- Firm name and contact info (if applicable)
- Firm branding colors applied to section headers and accents

**2. Executive Summary**
- Full summary text in a highlighted card (light teal background `teal-50`, left border `teal-600`)
- Severity summary bar chart (same as mobile preview)

**3. Inspection Summary Table**
- Section-by-section finding counts by severity
- Rows are clickable -- smooth scroll to the corresponding section below

**4. Report Sections**
Each section renders as:
- Section header (firm primary color or `teal-600`)
- Findings listed as cards, each showing:
  - Severity badge (pill, colored per `04_UI_Design_System.md`)
  - Component name as card title
  - Condition as subtitle
  - Narrative text
  - Recommendation in a distinct style (italic or bordered left)
  - Photo grid: thumbnails in a responsive grid (2-3 columns depending on screen width)

**5. Additional Observations** (if unattached findings exist)

**6. Limitations & Disclaimers**
- Standard appendix text from the report

### Photo Interaction

- Tap/click a photo thumbnail to open a lightbox overlay
- Lightbox shows the full-resolution baked image (annotations composited)
- Left/right navigation between photos in the same finding
- Close button and click-outside-to-close
- No annotation editing in the portal -- photos are flat baked images

### Navigation

- Sticky table of contents sidebar on desktop (left side, visible at viewport widths > 1024px)
- On mobile: collapsible TOC accessible via a hamburger/list icon in the top bar
- "Back to top" floating button appears after scrolling past the first section
- Smooth scroll anchors for each section

## PDF Download

### Trigger

"Download PDF" button in the top bar. Calls `GET /portal/report/{reportId}/pdf` with the session token.

### States

| State | Behavior |
|-------|----------|
| PDF ready | Returns signed download URL. Browser initiates download. |
| PDF generating | Returns 202 with `retryAfter: 10`. Button shows "Preparing PDF..." and auto-retries. |
| PDF failed | Returns 500. Show "PDF unavailable. You can still view the report online." with a "Retry" option. |

The PDF is generated once at publish time and cached in Cloud Storage. Subsequent downloads serve the cached file via a time-limited signed URL (1 hour expiry).

### PDF Content

The PDF mirrors the portal view with print-optimized formatting:

- A4 or Letter page size (configurable per inspector, default Letter for US)
- Cover page with branding, property info, and inspection date
- Table of contents with page numbers
- Each finding as a block with severity indicator, narrative, recommendation
- Photos inline at appropriate sizes (primary photo larger, others in grid)
- Photos do not break across pages
- Page headers: property address. Page footers: inspector/firm name, page number, report ID
- Severity colors print in CMYK-safe equivalents

## Report Amendments

When an inspector publishes an amendment (see `03_API_Endpoints.md`, `amendReport`):

- The original report's status changes to `superseded`
- A new report document is created with `version` incremented
- Existing access codes for the original report continue to work but redirect to the latest version
- Recipients see a banner at the top of the amended report: "This report was updated on [date]. Version [N]."
- A "View Changes" link in the banner shows a simple list of what changed (added findings, removed findings, modified findings). This is a flat list, not a visual diff.
- The original version is accessible via "View previous version" link in the banner

### Access Code Behavior on Amendment

- Old codes map to the original report but the portal redirects to the latest version
- New codes are generated for the amended report and sent to recipients
- Recipients can use either their old or new code
- If an inspector revokes an old code, it stops working for both versions

## Troubleshooting

### "Didn't receive a code?"

Link at the bottom of the access code entry screen. Opens a help section:

- "Check your spam/junk folder"
- "Make sure your email address is correct: [partially masked recipient email from the report metadata, e.g., j***@gmail.com]"
- "Contact your inspector: [inspector name]" (no email or phone displayed for inspector privacy -- the recipient should already have the inspector's contact info from the inspection booking)

The portal does not offer a "resend code" feature directly. Only the inspector can resend from the mobile app (see `14_Client_Agent_Notifications.md`).

## Security Considerations

- No report data is exposed without a valid access code or session token
- The lightweight public endpoint (for showing property address on the code entry screen) returns only: property address, inspector first name, and firm name. No finding data, no full names, no contact info.
- Session tokens are validated on every API call, not just at initial verification
- Signed PDF download URLs expire after 1 hour and cannot be shared (tied to the session)
- The portal does not use cookies -- `sessionStorage` only
- No analytics or third-party tracking scripts on the portal. Recipient privacy is paramount.
- Content Security Policy headers restrict script sources to same-origin

## Gaps & Assumptions

1. **Portal domain** -- `report.inspectly.app` is assumed. Could be a subdomain of the main marketing site. Custom domains per firm (e.g., `reports.smithinspections.com`) would require DNS configuration per firm and SSL certificate provisioning. Deferred to `18_Future_Features.md`.
2. **Portal framework** -- Next.js static export or a plain React SPA both work. The portal is simple enough that framework choice is a tactical decision. No SSR needed since content loads after code verification.
3. **Accessibility** -- Portal should meet WCAG 2.1 AA. Specific requirements: keyboard navigation for all interactive elements, screen reader support for the report structure, alt text on photos (using captions or component names), sufficient color contrast (already covered by design system).
4. **Print from browser** -- Some users will Ctrl+P the portal view. Adding `@media print` styles to produce a reasonable printed output is a low-effort improvement over relying solely on PDF download.
5. **Report link expiry** -- Access codes expire after 90 days but the report URL itself does not expire. If all codes for a report are expired or revoked, the URL shows the code entry screen but no valid code exists. The property address still displays. Consider showing "This report's access has expired" instead of the code entry form when all codes are expired.  
