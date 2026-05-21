# UI Design System

## Overview

Central design reference for Inspectly. Mobile-first, field-optimized design system built for one-handed, gloved operation in challenging environments (crawl spaces, attics, rain). Every component decision prioritizes large touch targets, high contrast, and minimal typing. The app uses a Clean & Professional aesthetic -- authoritative without being clinical.

This file is referenced by all feature files for consistent styling.

## Dependencies

- `05_Mobile_Shell_Navigation.md` -- App shell structure and navigation patterns
- `16_Branding_Configuration.md` -- How firm branding overrides default design tokens on reports

## Colors

### Brand Palette

| Token | Value | Usage |
|-------|-------|-------|
| `teal-600` | `#0D9488` | Primary brand color, CTAs, active states |
| `teal-700` | `#0F766E` | Pressed/active variant |
| `teal-50` | `#F0FDFA` | Primary tint backgrounds |

### Neutral Palette (Slate)

| Token | Value | Usage |
|-------|-------|-------|
| `slate-900` | `#0F172A` | Primary text |
| `slate-700` | `#334155` | Secondary text |
| `slate-500` | `#64748B` | Tertiary text, placeholders |
| `slate-300` | `#CBD5E1` | Borders, dividers |
| `slate-100` | `#F1F5F9` | Background surfaces |
| `slate-50` | `#F8FAFC` | Page background |
| `white` | `#FFFFFF` | Card backgrounds |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `critical` | `#DC2626` (red-600) | Critical severity, destructive actions |
| `critical-bg` | `#FEF2F2` (red-50) | Critical severity background |
| `major` | `#EA580C` (orange-600) | Major severity |
| `major-bg` | `#FFF7ED` (orange-50) | Major severity background |
| `minor` | `#CA8A04` (yellow-600) | Minor severity |
| `minor-bg` | `#FEFCE8` (yellow-50) | Minor severity background |
| `info` | `#2563EB` (blue-600) | Informational severity |
| `info-bg` | `#EFF6FF` (blue-50) | Informational severity background |
| `success` | `#16A34A` (green-600) | Completed states, confirmations |
| `success-bg` | `#F0FDF4` (green-50) | Success background |

Severity colors are critical to the product -- inspectors, clients, and agents all use color to quickly parse finding urgency. These must remain consistent across the mobile app, report portal, and PDF output.

## Typography

### Font Family

**Inter** via Google Fonts. Highly legible at small sizes on mobile, excellent number rendering for measurements, addresses, and costs.

- Body/UI: Inter
- Monospace (code, IDs): System monospace stack

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `heading-xl` | 24px | 700 | 32px | Screen titles |
| `heading-lg` | 20px | 600 | 28px | Section headers |
| `heading-md` | 16px | 600 | 24px | Card titles, subsections |
| `body` | 14px | 400 | 20px | Default body text |
| `body-medium` | 14px | 500 | 20px | Emphasized body text |
| `caption` | 12px | 400 | 16px | Labels, timestamps, metadata |
| `caption-medium` | 12px | 500 | 16px | Badge text, status labels |

14px base size is intentional -- field use involves glare, rain, and quick glances. Do not go smaller than 12px anywhere in the mobile app.

## Spacing and Layout

### Spacing Scale

4px base unit: 4, 8, 12, 16, 20, 24, 32, 40, 48.

### Screen Padding

- Horizontal page padding: 16px
- Card internal padding: 16px
- Section spacing: 24px
- List item vertical padding: 12px

### Card Pattern

Cards use `white` background, 1px `slate-300` border, 8px border radius, 16px padding. No drop shadows -- they perform poorly in bright outdoor light and add visual noise.

## Field Ergonomics

These constraints are non-negotiable. The app's competitive advantage is field usability.

### Touch Targets

- **Minimum tap target**: 48x48px (Apple HIG and Material guidelines)
- **Primary action buttons**: 56px height minimum
- **List items / checklist rows**: 56px minimum height
- **Spacing between adjacent tap targets**: 8px minimum

### Thumb Zone Design

On standard phone sizes (375-428px width), primary actions must sit in the bottom 40% of the screen -- the natural thumb reach zone.

- FABs and primary CTAs: bottom-right or bottom-center
- Navigation: bottom tab bar
- Destructive or secondary actions: top of screen (harder to hit accidentally)
- Pull-to-refresh and swipe gestures: avoid requiring upward swipes, which are awkward one-handed

### Gloved Operation

- No long-press interactions as primary actions (unreliable with gloves)
- No pinch-to-zoom as the only way to view photos (provide explicit zoom button)
- No drag-and-drop for reordering (use move-up/move-down buttons)
- Prefer toggles and segmented controls over dropdowns where options are 4 or fewer
- Text input: minimize required typing. Use selection from predefined options wherever possible

### Outdoor Visibility

- All text meets WCAG AA contrast ratio (4.5:1 body, 3:1 large text) against its background
- Severity colors chosen to remain distinguishable in bright sunlight
- No thin (< 300 weight) font usage
- Avoid light gray text on white backgrounds -- use `slate-700` minimum for readable text

## Component Patterns

### Severity Badge

Pill-shaped badge using semantic severity colors. Appears on findings, checklist items, and report sections.

- Height: 24px
- Padding: 4px 10px
- Border radius: 12px (full pill)
- Font: `caption-medium`
- Background: severity background color (e.g., `critical-bg`)
- Text: severity foreground color (e.g., `critical`)
- Always uppercase: CRITICAL, MAJOR, MINOR, INFO

### Checklist Row

The most-used component in the app. See `07_Checklist_Engine.md` for behavior.

- Height: 64px minimum (thumb-friendly)
- Left: status indicator (circle icon -- pending/checked/skipped)
- Center: item label (`body-medium`), section context (`caption`)
- Right: finding count badge if findings exist, chevron
- Bottom border: 1px `slate-100`
- Tap: navigates to item detail
- Status indicator tap target: enlarged to 48x48 for easy toggling

### Photo Thumbnail Grid

Used in finding entry and report preview. See `09_Photo_Capture_Annotation.md`.

- Grid: 3 columns with 4px gap
- Thumbnail: square, 1:1 aspect ratio, 8px border radius
- Annotation indicator: small teal dot overlay (top-right) if photo has annotations
- Add button: dashed border square, teal plus icon, same size as thumbnails
- Long-press on thumbnail: shows full-screen preview (but also provide an explicit "view" tap since long-press is unreliable with gloves)

### Bottom Action Bar

Sticky bar at the bottom of the screen for primary actions. Used on inspection screens, review screens, and publish flow.

- Height: 72px (56px button + 16px bottom padding for safe area)
- Background: `white` with top border 1px `slate-200`
- Full-width primary button inside, or split layout (secondary left, primary right)
- Respects device safe area insets (notch, home indicator)

### Empty State

Centered illustration area (optional), heading (`heading-md`), description (`body`, `slate-500`), and CTA button. Used for first inspection, no findings, empty search results.

### Loading States

- Skeleton screens for list/card loading (prefer over spinners)
- Inline spinner only for discrete actions (saving, generating narrative)
- Never block the full screen with a loading overlay during inspection -- inspectors must be able to continue working

## Report Portal Styles

The report portal (web, viewed by clients/agents) shares color tokens and typography with the mobile app but adapts layout for desktop viewing.

- Max content width: 800px centered
- Responsive down to 375px for mobile viewing
- Uses firm branding colors where configured (see `16_Branding_Configuration.md`)
- Print/PDF styles: severity colors must render in CMYK-safe values
- Photo annotations rendered as flat images (baked at publish time)

## Gaps & Assumptions

1. **Icon library** -- Not specified. Recommend Lucide React Native (consistent, MIT-licensed, good at small sizes). Using outlined style, 24px default, `slate-700` default color.
2. **Animation and transitions** -- Not detailed. Default: 200ms ease-out for screen transitions, no decorative animations. Field use prioritizes speed over polish.
3. **Dark mode** -- Not specified for v1. The high-contrast design and slate palette would adapt well, but defer to `18_Future_Features.md`.
4. **Accessibility beyond contrast** -- Screen reader labels, focus management, and VoiceOver/TalkBack support not detailed. Should follow React Native accessibility best practices as baseline.
5. **Firm branding boundaries** -- How much of the design system a firm can override on reports needs specification. Default: logo, primary color, and footer text only. See `16_Branding_Configuration.md`.  
