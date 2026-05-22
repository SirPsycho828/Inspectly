<div align="center">

# Inspectly

**AI-powered inspection platform for independent home inspectors**

![React Native](https://img.shields.io/badge/React_Native-0.76-61DAFB?logo=react&logoColor=white)
![Expo](https://img.shields.io/badge/Expo-52-000020?logo=expo&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-DD2C00?logo=firebase&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![Claude API](https://img.shields.io/badge/Claude_API-D97757?logo=anthropic&logoColor=white)

</div>

---

## Overview

Inspectly takes a home inspector from field capture to branded report delivery in a single workflow. Inspectors run checklist-driven inspections on their phone, capture findings with severity tags and annotated photos, get AI-generated narrative language via Claude, review section-by-section, then publish a branded report accessible to clients and agents through a secure web portal.

Built for solo inspectors and small firms (1-10 inspectors) doing residential property inspections.

## Features

<table>
<tr>
<td width="50%">

**Checklist-Driven Inspections**
Template-based checklists organized by area and system. Item-level status tracking (pending, inspected, skipped, not applicable) with progress indicators throughout.

</td>
<td width="50%">

**AI Narrative Generation**
Claude API transforms structured findings (component + condition + severity) into professional inspection language. Editable by inspector, tracks source as AI, manual, or AI-edited.

</td>
</tr>
<tr>
<td width="50%">

**Photo Capture & Annotation**
In-app camera and image picker with annotation tools (arrows, circles, rectangles, text labels). Photos anchored to specific findings for report context.

</td>
<td width="50%">

**Secure Report Portal**
Next.js web portal protected by access codes. Branded per firm (logo, colors, footer). PDF download, photo galleries, severity-coded findings, and executive summary.

</td>
</tr>
<tr>
<td width="50%">

**Report Assembly & Preview**
Section-by-section review with AI-generated executive summary. Interactive preview before publish. One-tap publish with automatic client/agent notification.

</td>
<td width="50%">

**Email & SMS Delivery**
SendGrid email and Twilio SMS notifications. Access code delivery to clients and agents with re-send capability and branded templates.

</td>
</tr>
<tr>
<td width="50%">

**Firm Management**
Multi-inspector firms with admin dashboard, member management, invite codes, and shared branding. Solo inspectors work without firm overhead.

</td>
<td width="50%">

**Offline Support**
Network detection, AsyncStorage persistence, offline banner UI, and background sync when connectivity returns. Built for field conditions.

</td>
</tr>
</table>

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native 0.76, Expo 52, TypeScript |
| Navigation | React Navigation (native-stack, bottom-tabs) |
| Camera/Photos | expo-camera, expo-image-picker, expo-image-manipulator |
| Annotations | react-native-svg |
| Database | Cloud Firestore (offline persistence) |
| Auth | Firebase Authentication (email/password) |
| Storage | Firebase Cloud Storage (photos, PDFs) |
| Backend | Cloud Functions v2 (Node 20) |
| AI | Anthropic Claude API (@anthropic-ai/sdk) |
| Email | SendGrid (@sendgrid/mail) |
| SMS | Twilio |
| Image Processing | Sharp (server-side thumbnails) |
| Report Portal | Next.js 15, React 19, Tailwind CSS 4 |
| Hosting | Firebase Hosting (portal) |

## Architecture

```
inspectly/
├── App.tsx                          # Root entry
├── app.json                         # Expo config (iOS/Android)
├── src/
│   ├── components/ui/              # Button, Card, EmptyState, SeverityBadge, OfflineBanner
│   ├── constants/                  # Firestore collections, design tokens
│   ├── contexts/AuthContext.tsx    # Auth state
│   ├── hooks/useAuth.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   ├── OnboardingNavigator.tsx
│   │   ├── MainTabNavigator.tsx
│   │   ├── ActiveInspectionNavigator.tsx
│   │   ├── InspectionsNavigator.tsx
│   │   ├── ReportsNavigator.tsx
│   │   ├── FirmNavigator.tsx
│   │   └── SettingsNavigator.tsx
│   ├── screens/
│   │   ├── auth/                   # Sign in, sign up, verify email, forgot password
│   │   ├── onboarding/            # Profile setup, firm join/create
│   │   ├── inspections/           # List, detail, setup
│   │   ├── inspection/            # Active flow: checklist, item detail, finding entry,
│   │   │                          #   photo capture, annotation, section review,
│   │   │                          #   executive summary, preview, publish
│   │   ├── reports/               # List, detail, manage access
│   │   ├── firm/                  # Dashboard, members, branding, settings
│   │   └── settings/              # Profile, security, branding, templates, comment library
│   ├── services/                  # Auth + Firebase helpers
│   └── types/index.ts             # Full domain types
│
├── functions/                      # Firebase Cloud Functions
│   └── src/
│       ├── callable/
│       │   ├── accessCode.ts      # Generate/validate access codes
│       │   ├── ai.ts              # Claude narrative generation
│       │   ├── firm.ts            # Firm management
│       │   ├── report.ts          # Report assembly/publish
│       │   └── user.ts            # User operations
│       ├── http/portal.ts         # Portal API endpoints
│       ├── triggers/
│       │   ├── onPhotoUpload.ts   # Auto-generate thumbnails
│       │   └── onUserDocWrite.ts  # Sync user state
│       └── scheduled/cleanup.ts   # Periodic cleanup
│
├── portal/                         # Client-facing report viewer (Next.js 15)
│   └── src/
│       ├── app/
│       │   ├── page.tsx           # Access code entry
│       │   └── report/page.tsx    # Report viewer
│       ├── components/
│       │   ├── AccessCodeEntry.tsx
│       │   ├── ReportViewer.tsx
│       │   └── SeverityBadge.tsx
│       └── lib/                   # API client, severity helpers
│
├── firestore.rules
├── storage.rules
└── firebase.json
```

## Inspection Flow

```
Setup → Checklist → Finding Entry → Photo/Annotate → Section Review → Executive Summary → Preview → Publish
```

| Step | Screen | What Happens |
|------|--------|-------------|
| 1 | InspectionSetup | Property address, type, client/agent info |
| 2 | ChecklistView | Template-based checklist with progress tracking |
| 3 | ItemDetail | Select component, mark status |
| 4 | FindingEntry | Component + condition + severity (structured input) |
| 5 | PhotoCapture | Camera or gallery, multiple photos per finding |
| 6 | AnnotationEditor | Arrows, circles, rectangles, text labels on photos |
| 7 | SectionReview | AI generates narrative per section, inspector edits |
| 8 | ExecutiveSummary | AI-generated overview of all critical/major findings |
| 9 | ReportPreview | Interactive preview of complete report |
| 10 | PublishConfirm | Send notifications, generate access codes |

## Cloud Functions

| Type | Function | Purpose |
|------|----------|---------|
| Callable | generateNarrative | Claude API: structured finding to professional language |
| Callable | generateAccessCode | Create time-limited access codes for report portal |
| Callable | validateAccessCode | Verify code with rate limiting and lockout |
| Callable | publishReport | Assemble report, notify clients/agents via email + SMS |
| Callable | firmInvite / firmJoin | Multi-inspector firm management |
| HTTP | portalGetReport | Authenticated report data for portal |
| Trigger | onPhotoUpload | Sharp thumbnail generation |
| Trigger | onUserDocWrite | Propagate profile changes |
| Scheduled | cleanup | Expire old access codes, purge orphaned files |

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Firebase CLI (`npm install -g firebase-tools`)
- Expo CLI (`npx expo`)
- iOS Simulator (macOS) or Android emulator, or Expo Go on a physical device

### Install

```bash
git clone https://github.com/SirPsycho828/Inspectly.git
cd Inspectly
npm install
cd functions && npm install && cd ..
cd portal && npm install && cd ..
```

### Environment Setup

#### Mobile App

Configure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) from your Firebase console.

#### Cloud Functions Secrets

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set TWILIO_ACCOUNT_SID
firebase functions:secrets:set TWILIO_AUTH_TOKEN
firebase functions:secrets:set TWILIO_PHONE_NUMBER
```

#### Report Portal

Create `portal/.env.local`:
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
```

### Development

```bash
# Mobile app (Expo dev server)
npx expo start

# Report portal (Next.js)
cd portal && npm run dev

# Cloud Functions
cd functions && npm run build
```

### Deploy

```bash
# Cloud Functions + Firestore rules + Storage rules
firebase deploy --only functions,firestore:rules,storage

# Report Portal (Firebase Hosting)
cd portal && npm run build && cd ..
firebase deploy --only hosting
```

## Security

- Access codes have rate limiting (failed attempts trigger lockout)
- Codes are time-limited with configurable expiration
- Firestore rules enforce inspector/firm_admin role separation
- Photo uploads restricted by authentication and file size limits
- Portal API validates access codes server-side before returning report data
- Firm admins can revoke access codes and suspend members

## License

Private - All rights reserved.
