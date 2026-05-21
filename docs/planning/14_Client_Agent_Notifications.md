# Client & Agent Notifications

## Overview

Notifications deliver the inspection report to recipients -- the buyer (client), their agent, and any additional contacts the inspector specified during setup. At publish time, each recipient receives an email and optionally an SMS containing a link to the report portal and their unique access code. The inspector can resend notifications, add recipients after publish, and see delivery status from the mobile app.

## Dependencies

- `01_Auth_Roles.md` -- Access code generation and properties
- `02_Database_Schema.md` -- `accessCodes` subcollection on reports
- `03_API_Endpoints.md` -- `resendNotification`, `addReportRecipient`, `notificationDelivery` Pub/Sub handler
- `06_Inspection_Setup.md` -- Client and agent contacts entered during setup
- `12_Report_Preview_Publish.md` -- Publish confirmation triggers notifications
- `13_Report_Delivery_Portal.md` -- Portal URL structure and access flow

## Notification Triggers

| Event | Who Gets Notified | Channel |
|-------|-------------------|---------|
| Report published | All enabled recipients from publish confirmation | Email + SMS (if phone provided) |
| Report amended | All recipients of the original report | Email + SMS |
| Access code regenerated | The specific recipient | Email + SMS |
| Recipient added post-publish | The new recipient only | Email + SMS |
| Notification resent | The specific recipient | Email + SMS |

All notifications are processed asynchronously via a Pub/Sub topic (`notifications`). The publish flow does not wait for delivery -- it returns success as soon as the report is created and notification messages are enqueued.

## Email Notifications

### Provider

SendGrid transactional email API. Single sender identity: `reports@inspectly.app` (or firm-branded sender if supported by SendGrid verified domain -- see gaps).

### Published Report Email

**Subject**: "Your inspection report for [property address] is ready"

**From name**: "[Inspector Name]" or "[Inspector Name] at [Firm Name]"

**Body structure**:

```
[Firm logo or Inspectly logo]

Hi [Recipient Name],

Your home inspection report for [property address] is ready to view.

[VIEW YOUR REPORT]  (button, links to portal URL)

Your access code: [CODE]

Report details:
- Property: [full address]
- Inspection date: [date]
- Inspector: [name], License #[number]
- Findings: [X critical, Y major, Z minor, W informational]

You can also download a PDF version from the report page.

If you have questions about this report, contact your inspector
at [inspector email or firm email].

---
This report was prepared by [Inspector/Firm Name].
Powered by Inspectly
```

The "VIEW YOUR REPORT" button links to `https://report.inspectly.app/r/{reportId}`. The access code is displayed in the email body, not embedded in the URL (see `13_Report_Delivery_Portal.md` for rationale).

### Amendment Email

**Subject**: "Updated inspection report for [property address]"

Same structure as the published email with additions:
- Banner text: "This report has been updated since the original inspection."
- New access code (if regenerated) or note that the existing code still works
- Brief note from the inspector (optional, entered during amendment flow)

### Template Management

Email templates are stored as SendGrid dynamic templates. Template IDs are stored in Firebase environment config. Template variables are populated by the `notificationDelivery` Cloud Function.

Templates:
- `report_published` -- New report notification
- `report_amended` -- Amendment notification
- `access_code_resend` -- Resent access code
- `access_code_new` -- New recipient added post-publish

### Email Styling

- Responsive HTML email (tested in Gmail, Outlook, Apple Mail, Yahoo)
- Max width: 600px
- Firm branding: logo at top, firm primary color on the CTA button and header accent
- Fallback: if no firm branding, use Inspectly teal (`#0D9488`) and Inspectly logo
- Plain text alternative included for all emails

## SMS Notifications

### Provider

Twilio Programmable Messaging. Sender: Inspectly shared short code or toll-free number [to be provisioned].

### Published Report SMS

```
Your inspection report for [short address] is ready.
View it here: https://report.inspectly.app/r/{reportId}
Access code: [CODE]
- [Inspector Name]
```

Total length target: under 160 characters (single SMS segment) when possible. If the address pushes it over, truncate to street address only (no city/state/zip).

### Amendment SMS

```
Updated inspection report for [short address]:
https://report.inspectly.app/r/{reportId}
Code: [CODE]
- [Inspector Name]
```

### SMS Opt-In

SMS is sent only when a phone number is provided for the recipient. Phone number entry is optional during inspection setup (see `06_Inspection_Setup.md`). Providing a phone number is treated as implicit opt-in for transactional messages about that specific report.

No marketing SMS. No recurring messages. This is a single transactional notification per report event.

## Delivery Pipeline

### Architecture

```
publishReport (Cloud Function)
  → Creates notification records
  → Publishes messages to Pub/Sub topic "notifications"

notificationDelivery (Pub/Sub subscriber)
  → Reads message (recipient, channel, template, data)
  → Calls SendGrid API (email) or Twilio API (SMS)
  → Retries on failure (3 attempts, exponential backoff)
  → Logs delivery result
```

### Pub/Sub Message Shape

```
{
  recipientName: string,
  recipientEmail: string,
  recipientPhone: string | null,
  recipientType: "client" | "agent" | "other",
  reportId: string,
  accessCode: string,
  template: "report_published" | "report_amended" | "access_code_resend" | "access_code_new",
  reportData: {
    propertyAddress: string,
    inspectionDate: string,
    inspectorName: string,
    inspectorLicense: string,
    firmName: string | null,
    brandingLogoUrl: string | null,
    brandingPrimaryColor: string,
    findingSummary: { critical: number, major: number, minor: number, informational: number }
  }
}
```

The message contains all data needed to render the notification. The subscriber does not read from Firestore -- this keeps the pipeline simple and idempotent.

### Retry Logic

| Attempt | Delay | Action |
|---------|-------|--------|
| 1 | Immediate | Send via provider |
| 2 | 30 seconds | Retry |
| 3 | 2 minutes | Retry |
| Failed | -- | Log as failed, no further retry |

Email and SMS are independent -- if email succeeds but SMS fails, only SMS retries. Each channel is a separate Pub/Sub message.

### Delivery Logging

Each notification attempt is logged to a `notificationLog` collection (not defined in the main schema -- this is an operational collection):

| Field | Type | Notes |
|-------|------|-------|
| `reportId` | string | |
| `recipientEmail` | string | |
| `channel` | `"email"` \| `"sms"` | |
| `template` | string | |
| `status` | `"sent"` \| `"failed"` \| `"pending"` | |
| `attempts` | number | |
| `lastAttemptAt` | timestamp | |
| `providerMessageId` | string \| null | SendGrid/Twilio message ID for tracking |
| `error` | string \| null | Error message on failure |

## Inspector-Facing Controls

### Report Detail Screen

After publishing, the report detail screen in the mobile app shows a "Delivery" section:

- List of all recipients with their notification status
- Each recipient row shows: name, email, type badge (Client/Agent/Other), delivery status icon
- Delivery status: green check (sent), yellow clock (pending), red X (failed)
- Tap a recipient to see details and actions

### Per-Recipient Actions

| Action | Description |
|--------|-------------|
| Resend | Re-sends the email and SMS with the existing access code |
| Regenerate Code | Creates a new access code, revokes old one, sends new notification |
| Revoke Access | Revokes the access code. No notification sent. |
| Copy Code | Copies the access code to clipboard for manual sharing |

### Adding Recipients Post-Publish

"Add Recipient" button on the delivery section. Inline form: name, email, phone (optional), type (dropdown: Agent, Attorney, Other). On submit, generates a new access code and sends notifications.

This is common when the buyer's attorney or a second agent needs access after the initial publish.

## Gaps & Assumptions

1. **SendGrid verified domain** -- Sending from `reports@inspectly.app` requires domain verification in SendGrid. Firm-branded sender addresses (e.g., `reports@smithinspections.com`) would require each firm to verify their domain, which is complex. Default: all emails from Inspectly domain with the inspector/firm name in the "From name" field.
2. **Twilio number provisioning** -- A shared short code or toll-free number needs provisioning and approval. Toll-free verification for A2P messaging is required in the US. This is an operational setup task, not a code task.
3. **Delivery webhooks** -- SendGrid and Twilio offer delivery status webhooks (delivered, bounced, opened, clicked). Not implemented in v1 -- status is based on successful API call, not actual delivery. Webhook integration would improve the delivery status display.
4. **Email open/click tracking** -- Intentionally omitted. Tracking pixels and link wrapping raise privacy concerns for a product handling sensitive property information.
5. **Notification preferences** -- No recipient-level preference for email vs. SMS. Both are sent if a phone number is available. An unsubscribe mechanism is not needed for one-time transactional messages but should be considered if notification frequency increases in future versions.
6. **Batch sending limits** -- SendGrid and Twilio have rate limits. A report with 7 recipients (client + agent + 5 additional) generates up to 14 messages (7 email + 7 SMS). This is well within provider limits. Bulk operations (firm publishing many reports simultaneously) may need throttling.  
