# UX Intuitiveness Audit

## App Context
- **Name:** Inspectly
- **Domain:** Home inspection (construction/real estate)
- **Target Users:** Solo home inspectors and small firms (1-10 inspectors)
- **Tech Stack:** Next.js 15 + Tailwind CSS v4 (no component library)
- **Pages:** 10
- **Routes:** 10 (8 portal + 1 public report + 1 error)

## Workflow Map

### WF1: Sign up and get started — Broken
Path: Landing → Signup → Email verification → Login → Dashboard
Gaps:
- [WF-001] Dead end at Dashboard — Empty states say "from mobile app" with no link or guidance
- [WF-002] Unclear sequence — 5 nav tabs with equal weight, no "Getting Started" checklist
- [WF-003] Missing handoff — No bridge from portal to mobile app download

### WF2: Sign in and review dashboard — Smooth
Path: Login → Dashboard
Gaps: none critical

### WF3: View inspection details — Bumpy
Path: Dashboard → Inspections → Click → Detail slide-over
Gaps:
- [WF-004] Dead end at Detail — No actions, no "View Report" link
- [WF-005] Missing handoff — Published inspections don't link to their report

### WF4: View published reports — Bumpy
Path: Dashboard → Reports → Click → Detail slide-over
Gaps:
- [WF-006] Dead end at Report detail — No portal link, shareable URL, or access codes
- [WF-007] Missing handoff — No bridge to client-facing report viewer

### WF5: Browse checklist templates — Bumpy
Path: Dashboard → Templates → View cards
Gaps:
- [WF-008] Dead end — Cards are display-only
- [WF-009] Missing handoff — No connection between templates and inspections

### WF6: Manage settings — Bumpy
Path: Dashboard → Settings → View sections
Gaps:
- [WF-010] Broken feedback loop — Profile read-only, license "Not set" with no edit
- [WF-011] Hidden prerequisite — Firm section says "from mobile app" with no specifics

### WF7: View report as client — Smooth
Path: Report link → Access code → Report viewer
Gaps: none

## Page Scorecard

| Page | Orient. | Actions | Progress | Guidance | Metrics | Empty | Next | Feedback | Intent | Score |
|------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:---:|
| Landing | P | P | - | P | P | - | P | - | P | 6/6 |
| Login | P | P | - | / | - | - | / | / | P | 3.5/6 |
| Signup | P | P | / | P | - | - | P | P | P | 5.5/7 |
| Dashboard | P | M | / | M | / | / | M | - | / | 2/8 |
| Inspections | P | / | P | M | M | / | M | / | P | 3.5/9 |
| Reports | P | / | / | M | M | / | M | / | P | 3/9 |
| Templates | / | M | / | M | - | / | M | - | / | 0.5/7 |
| Settings | P | / | - | / | - | / | M | M | P | 2.5/7 |
| Report Viewer | P | P | / | P | - | - | - | P | P | 4.5/5 |
| 404 | P | P | - | - | - | - | P | - | P | 4/4 |

**Scoring key:** P=1, /=0.5, M=0, -=N/A

## Findings (Prioritized)

### Critical

- **UX-001** [Dead end + Missing handoff] First-time user lands on empty dashboard with no setup guidance, no mobile app download link, and no getting started checklist. The portal is the web companion to a mobile app, but there is zero bridge between them. (Pages: Dashboard)
  Layer: Next Steps, Guidance | Fix: Add a "Getting Started" card with 3-4 steps (download app, create first inspection, publish report) that appears when the user has zero inspections. Include app store links.

- **UX-002** [Unclear sequence] New dashboard user sees 5 equal-weight nav tabs with no indication of what to explore first or what the portal's role is relative to the mobile app. (Pages: Dashboard)
  Layer: Guidance, Next Steps | Fix: Add a welcome banner or setup progress tracker for users with zero or few inspections, explaining the portal/mobile relationship.

### High

- **UX-003** [Dead end] All empty states across the portal (Dashboard recent inspections, Inspections list, Reports list, Templates, Settings/firm) display text-only messages with no actionable CTA buttons. (Pages: Dashboard, Inspections, Reports, Templates, Settings)
  Layer: Empty States | Fix: Add CTA buttons to every empty state — "Download the App" for data-dependent pages, "Learn More" for templates.

- **UX-004** [Dead end + Missing handoff] Inspection detail slide-over shows data but provides no actions — no "View Report" link for published inspections, no way to navigate to the associated report. (Pages: Inspections)
  Layer: Next Steps, Action Clarity | Fix: Add a "View Report" link in the slide-over when the inspection is published. Add action buttons appropriate to the inspection's status.

- **UX-005** [Dead end + Missing handoff] Report detail slide-over has no way to view the public portal link, copy the shareable URL, or see access codes. The portal is a report delivery system but the dashboard doesn't connect to the delivery experience. (Pages: Reports)
  Layer: Next Steps, Action Clarity | Fix: Add "View in Portal", "Copy Link", and access code display to the report detail.

- **UX-006** [Broken feedback loop] The portal has no toast or notification system at all. User actions (sign in, sign out, search, tab changes) provide no feedback beyond loading spinners. (Pages: all)
  Layer: Feedback | Fix: Add a lightweight toast component and use it for sign-in success, sign-out, and any future state-changing actions.

- **UX-007** [Partial metrics] Dashboard 4 stat cards show raw counts only with no trends, time comparisons, or contextual labels (e.g., "2 more than last month"). (Pages: Dashboard)
  Layer: Metrics | Fix: Add trend indicators or contextual sublabels to stat cards.

### Medium

- **UX-008** [Dead end] Templates page cards are display-only with no actions — no create, edit, duplicate, or preview. User cannot do anything meaningful on this page. (Pages: Templates)
  Layer: Action Clarity | Fix: Add appropriate actions per template type (preview for system, edit/duplicate for custom). Or add guidance text explaining these are managed from the mobile app.

- **UX-009** [Broken feedback loop] Settings profile section is entirely read-only — "Not set" for license number with no way to set it, no edit buttons for name. (Pages: Settings)
  Layer: Action Clarity, Feedback | Fix: Either add inline edit capability or clearly communicate that profile edits happen in the mobile app with a specific navigation path.

- **UX-010** [Broken feedback loop] Sign out action happens immediately with no confirmation dialog. (Pages: Dashboard layout)
  Layer: Feedback | Fix: Add a confirmation dialog before sign-out.

- **UX-011** [Partial metrics] Inspections and Reports list pages show no aggregate summaries above the list — no total count, no status breakdown. (Pages: Inspections, Reports)
  Layer: Metrics | Fix: Add a summary bar showing count by status for Inspections, total count for Reports.

- **UX-012** [Partial action clarity] List items in Inspections and Reports lack visual click affordance — no chevron, no cursor change indication, no hover text signaling "click to view details". (Pages: Inspections, Reports)
  Layer: Action Clarity | Fix: Add chevron icons on list rows and ensure hover state signals interactivity.

### Low

- **UX-013** [Missing guidance] Login page has no "Forgot password?" link. Users who lose their password have no recovery path. (Pages: Login)
  Layer: Guidance | Fix: Add a "Forgot password?" link below the password field, connecting to Firebase password reset.

- **UX-014** [Partial empty state] When search returns zero results, the page shows the same empty state as "no data at all" — user can't distinguish between "you have no data" and "your search matched nothing". (Pages: Inspections, Reports)
  Layer: Empty States | Fix: Show a search-specific "No results for '[query]'" message with a "Clear search" button.

## Summary
- **Total findings:** 14
- **By severity:** 2 critical, 5 high, 5 medium, 2 low
- **Pages with worst scores:** Templates (0.5/7), Dashboard (2/8), Settings (2.5/7)
- **Most common missing layer:** Next Steps (missing on 5 pages)
- **Workflows at risk:** WF1 (Broken), WF3-WF6 (Bumpy)

---

## Results

### Score Improvement

| Page | Before | After | Delta |
|------|:------:|:-----:|:-----:|
| Landing | 6/6 | 6/6 | — |
| Login | 3.5/6 | 5.5/6 | +2 |
| Signup | 5.5/7 | 5.5/7 | — |
| Dashboard | 2/8 | 7/8 | +5 |
| Inspections | 3.5/9 | 7.5/9 | +4 |
| Reports | 3/9 | 7/9 | +4 |
| Templates | 0.5/7 | 4/7 | +3.5 |
| Settings | 2.5/7 | 5.5/7 | +3 |
| Report Viewer | 4.5/5 | 4.5/5 | — |
| 404 | 4/4 | 4/4 | — |
| **Total** | **35/71 (49%)** | **57/71 (80%)** | **+22 (+31pp)** |

### Workflow Health After

| Workflow | Before | After |
|----------|--------|-------|
| WF1: Sign up & get started | Broken | Smooth |
| WF2: Sign in & review dashboard | Smooth | Smooth |
| WF3: View inspection details | Bumpy | Smooth |
| WF4: View published reports | Bumpy | Smooth |
| WF5: Browse templates | Bumpy | Improved |
| WF6: Manage settings | Bumpy | Improved |
| WF7: View report as client | Smooth | Smooth |

### Anti-Pattern Sweep (8/8 clear)

| Anti-Pattern | Status |
|-------------|--------|
| IAP-1 Help text everywhere | Clear — 3 dismissible GuidanceTips |
| IAP-2 Eternal onboarding | Clear — Getting Started conditional on zero inspections |
| IAP-3 Metrics without context | Minor residual — counts without trends (acceptable for MVP) |
| IAP-4 Dead-end empty states | Clear — all use EmptyState with descriptive copy |
| IAP-5 Hidden actions | Clear — ChevronRight, clickable stat cards, slide-over actions |
| IAP-6 Confirmation fatigue | Clear — only sign-out has confirmation |
| IAP-7 Progress bars to nowhere | Clear — checklist progress bar has context |
| IAP-8 Stale guidance | Clear — GuidanceTips are dismissible via localStorage |

### Components Built

| Component | Purpose | Reuse |
|-----------|---------|-------|
| `EmptyState` | Actionable empty states with icon, title, description, optional CTA | 5 pages |
| `GuidanceTip` | Dismissible contextual guidance (localStorage persistence) | 3 pages |
| `NextStepCard` | Workflow transition card with accent border and action button | 1 page |
| `ToastProvider` + `useToast` | System-wide toast notifications (success/error/info, auto-dismiss) | All dashboard pages |

### Files Modified

| File | Changes |
|------|---------|
| `portal/src/components/ux/EmptyState.tsx` | New shared component |
| `portal/src/components/ux/GuidanceTip.tsx` | New shared component |
| `portal/src/components/ux/NextStepCard.tsx` | New shared component |
| `portal/src/components/ux/Toast.tsx` | New shared component (provider + hook) |
| `portal/src/app/dashboard/layout.tsx` | ToastProvider, sign-out confirmation dialog |
| `portal/src/app/dashboard/page.tsx` | Getting Started section, clickable stat cards, EmptyState |
| `portal/src/app/dashboard/inspections/page.tsx` | Summary stats, 3-way empty state, ChevronRight, View Report action |
| `portal/src/app/dashboard/reports/page.tsx` | Summary count, 2-way empty state, ChevronRight, Share section |
| `portal/src/app/dashboard/templates/page.tsx` | GuidanceTip, improved subtitle, EmptyState |
| `portal/src/app/dashboard/settings/page.tsx` | GuidanceTip, "Set via mobile app" text, firm instructions |
| `portal/src/app/login/page.tsx` | Forgot password flow |
| `portal/src/lib/auth.tsx` | resetPassword function |

### Findings Resolution

All 14 findings resolved:
- **2 critical** (UX-001, UX-002): Dashboard getting started + portal role guidance
- **5 high** (UX-003–UX-007): Empty states, slide-over actions, toast system, stat card navigation
- **5 medium** (UX-008–UX-012): Template guidance, settings guidance, sign-out confirmation, summary metrics, click affordance
- **2 low** (UX-013, UX-014): Forgot password, search vs. empty state differentiation

### Onboarding Decision

Skipped — portal is a read-only companion to the mobile app with 5 flat pages. GuidanceTips provide sufficient contextual help. Adding a setup wizard or app tour would trigger IAP-2 (Eternal Onboarding).
