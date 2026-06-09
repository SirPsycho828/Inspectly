# UX Intuitiveness State

## Current Phase: Complete
## Completed: [1, 2, 3, 4, 5, 6, 7]

## Phase 1 (Discovery) — Complete
- [x] Step 1: Read project identity
- [x] Step 2: Detect tech stack
- [x] Step 3: Inventory all pages
- [x] Step 4: Map navigation structure
- [x] Step 5: Identify existing UX patterns
- [x] Step 6: Check for design system
- [x] Step 7: Output discovery summary
- [x] Step 8: Write state file

## Project
- **Name:** Inspectly
- **Domain:** Home inspection (construction/real estate)
- **Target Users:** Solo home inspectors and small firms (1-10 inspectors); moderately tech-savvy tradespeople
- **Framework:** Next.js 15 (App Router, static export)
- **CSS:** Tailwind CSS v4 with @theme tokens ("Fieldwork" design system)
- **Component Library:** None (custom components)
- **Router:** Next.js file-based (App Router)
- **State:** React Context (AuthProvider)
- **Animation:** Custom CSS (reveal, slide-up, fade-in)
- **Icons:** Lucide React
- **Toasts:** None
- **Package Manager:** npm

## Page Inventory
| Page | Route | File | Type | Score |
|------|-------|------|------|-------|
| Landing | `/` | `portal/src/app/page.tsx` | landing | pending |
| Login | `/login` | `portal/src/app/login/page.tsx` | auth | pending |
| Signup | `/signup` | `portal/src/app/signup/page.tsx` | auth | pending |
| Dashboard | `/dashboard` | `portal/src/app/dashboard/page.tsx` | dashboard | pending |
| Inspections | `/dashboard/inspections` | `portal/src/app/dashboard/inspections/page.tsx` | list | pending |
| Reports | `/dashboard/reports` | `portal/src/app/dashboard/reports/page.tsx` | list | pending |
| Templates | `/dashboard/templates` | `portal/src/app/dashboard/templates/page.tsx` | list | pending |
| Settings | `/dashboard/settings` | `portal/src/app/dashboard/settings/page.tsx` | settings | pending |
| Report Viewer | `/report` | `portal/src/app/report/page.tsx` | detail | pending |
| 404 | N/A | `portal/src/app/not-found.tsx` | error | pending |

## Navigation Structure
- **Landing:** Fixed top navbar — Features, Pricing, Sign In, Get Started
- **Dashboard:** Top Rail with segmented tabs — Dashboard, Inspections, Reports, Templates, Settings
- **User menu:** Dropdown with display name + sign out
- **Mobile:** Hamburger menu (both landing and dashboard)
- **No:** breadcrumbs, footer in dashboard, sidebar

## Existing UX Patterns
- **Empty states:** Present on 5 pages (Dashboard recent, Inspections, Reports, Templates, Settings/firm) — all text-only, no actionable CTAs
- **Loading states:** Consistent Loader2 spinner centered on all pages
- **Error states:** Inline error messages on auth forms (destructive bg), report page error/no-id/expired views
- **Help text:** Minimal — password strength indicator, search placeholders, "Not set" for license
- **Metrics:** Dashboard 4 stat cards (Total, Published, In Progress, This Month) — counts only, no trends
- **Progress:** Checklist progress bar in inspection detail slide-over only
- **Toasts:** ABSENT — no notification system
- **Confirmation dialogs:** ABSENT — sign out is immediate
- **Feedback:** Password strength meter on signup only

## Design Tokens
- Typography: Fraunces (heading), Public Sans (body)
- Palette: Dark walnut primary (#3B2F27), brass accent (#C29650), cream bg (#F6F3EF)
- Interaction classes: btn-interactive, card-interactive, link-underline
- Reduced motion support present

## Phase 2 (Workflow Audit) — Complete
- [x] Step 1: Load references (workflow-gap-types.md)
- [x] Step 2: Discover workflows (7 identified)
- [x] Step 3: Walk each workflow
- [x] Step 4: Identify cross-workflow dependencies
- [x] Step 5: Rate workflow health
- [x] Step 6: Output workflow map
- [x] Step 7: Update state
- [x] Step 8: Load Phase 3

## Workflow Map

### WF1: Sign up and get started — Broken
Path: Landing → Signup → Email verification → Login → Dashboard
Dependencies: none
Gaps:
- [WF-001] Dead end at Dashboard — New user sees empty states saying "from the mobile app" with no download link, QR code, or guidance
- [WF-002] Unclear sequence at Dashboard — 5 nav tabs with equal weight, no "Getting Started" checklist
- [WF-003] Missing handoff from Portal to Mobile App — No bridge to download/open the mobile app

### WF2: Sign in and review dashboard — Smooth
Path: Login → Dashboard
Dependencies: WF1
Gaps: none critical (stats lack trends/context — minor)

### WF3: View inspection details — Bumpy
Path: Dashboard → Inspections → Click → Detail slide-over
Dependencies: WF1, mobile app data
Gaps:
- [WF-004] Dead end at Detail slide-over — Shows data but no actions (no "View Report" link)
- [WF-005] Missing handoff from Inspection → Report — Published inspections don't link to their report

### WF4: View published reports — Bumpy
Path: Dashboard → Reports → Click → Detail slide-over
Dependencies: WF1, mobile app data
Gaps:
- [WF-006] Dead end at Report detail — No portal link, shareable URL, or access code visibility
- [WF-007] Missing handoff from Report → Public Portal — No bridge to client-facing experience

### WF5: Browse checklist templates — Bumpy
Path: Dashboard → Templates → View cards
Dependencies: WF1
Gaps:
- [WF-008] Dead end — Cards are display-only, no create/edit/duplicate actions
- [WF-009] Missing handoff — No explanation of how templates connect to inspections

### WF6: Manage settings — Bumpy
Path: Dashboard → Settings → View sections
Dependencies: WF1
Gaps:
- [WF-010] Broken feedback loop — Profile is read-only, license "Not set" with no edit capability
- [WF-011] Hidden prerequisite — Firm section says "from the mobile app" with no specifics

### WF7: View report as client — Smooth
Path: Report link → Access code → Report viewer
Dependencies: none (external)
Gaps: none

## Cross-Workflow Dependencies
- All dashboard workflows (WF2-WF6) require WF1 (auth)
- Inspection/Report data comes exclusively from mobile app — portal is read-only companion
- Templates are read-only in portal (system or mobile-created)
- WF3 and WF4 are related but disconnected (no inspection→report link)

## Workflow Findings Summary
| ID | Gap Type | Workflow | Location | Severity |
|----|----------|----------|----------|----------|
| WF-001 | Dead end | Sign up | Dashboard (empty) | Critical |
| WF-002 | Unclear sequence | Sign up | Dashboard nav | High |
| WF-003 | Missing handoff | Sign up | Portal → Mobile | Critical |
| WF-004 | Dead end | Inspection detail | Slide-over | High |
| WF-005 | Missing handoff | Inspection detail | Inspection → Report | High |
| WF-006 | Dead end | Report detail | Slide-over | High |
| WF-007 | Missing handoff | Report detail | Report → Portal | High |
| WF-008 | Dead end | Templates | Template cards | Medium |
| WF-009 | Missing handoff | Templates | Template → Inspection | Medium |
| WF-010 | Broken feedback loop | Settings | Profile section | Medium |
| WF-011 | Hidden prerequisite | Settings | Firm section | Medium |

## Phase 3 (Page Scorecard) — Complete
- [x] Step 1: Load references (ux-layers.md)
- [x] Step 2: Score each page (10 pages scored)
- [x] Step 3: Cross-reference with workflow gaps
- [x] Step 4: Generate findings (14 findings)
- [x] Step 5: Write audit report (docs/ux-audit-report.md)
- [x] Step 6: Present summary
- [x] Step 7: Update state
- [x] Step 8: Load Phase 4

## Page Scores
| Page | Score | Key Gaps |
|------|-------|----------|
| Landing | 6/6 | — |
| Login | 3.5/6 | Guidance, Next Steps, Feedback |
| Signup | 5.5/7 | Progress |
| Dashboard | 2/8 | Actions, Guidance, Next Steps |
| Inspections | 3.5/9 | Guidance, Metrics, Next Steps |
| Reports | 3/9 | Guidance, Metrics, Next Steps |
| Templates | 0.5/7 | Actions, Guidance, Next Steps |
| Settings | 2.5/7 | Next Steps, Feedback |
| Report Viewer | 4.5/5 | — |
| 404 | 4/4 | — |

## Findings (14 total: 2 critical, 5 high, 5 medium, 2 low)
| ID | Severity | Status | Pages |
|----|----------|--------|-------|
| UX-001 | Critical | resolved | Dashboard |
| UX-002 | Critical | resolved | Dashboard |
| UX-003 | High | resolved | Dashboard, Inspections, Reports, Templates, Settings |
| UX-004 | High | resolved | Inspections |
| UX-005 | High | resolved | Reports |
| UX-006 | High | resolved | All |
| UX-007 | High | resolved | Dashboard |
| UX-008 | Medium | resolved | Templates |
| UX-009 | Medium | resolved | Settings |
| UX-010 | Medium | resolved | Dashboard layout |
| UX-011 | Medium | resolved | Inspections, Reports |
| UX-012 | Medium | resolved | Inspections, Reports |
| UX-013 | Low | resolved | Login |
| UX-014 | Low | resolved | Inspections, Reports |

## Phase 4 (Components) — Complete
- [x] Step 1: Load references (component-catalog.md, anti-patterns.md)
- [x] Step 2: Analyze findings for patterns (4 components needed)
- [x] Step 3: Determine component directory (portal/src/components/ux/)
- [x] Step 4: Fetch library documentation (Tailwind CSS v4)
- [x] Step 5: Build each component
- [x] Step 6: Verify build (TS compiles clean; pre-existing static export error unrelated)
- [x] Step 7: Update state
- [x] Step 8: Load Phase 5

## Components Created
| Component | File | Used By |
|-----------|------|---------|
| EmptyState | `portal/src/components/ux/EmptyState.tsx` | UX-003, UX-014 |
| GuidanceTip | `portal/src/components/ux/GuidanceTip.tsx` | UX-002, UX-008, UX-009 |
| NextStepCard | `portal/src/components/ux/NextStepCard.tsx` | UX-001, UX-004, UX-005 |
| ToastProvider + useToast | `portal/src/components/ux/Toast.tsx` | UX-006, UX-010 |

## Phase 5 (Implementation) — Complete
- [x] Step 1: Load references (anti-patterns.md)
- [x] Step 2: Sort findings by priority
- [ ] Step 3: Set up Playwright verification — skipped: pre-existing build error prevents dev server reliability; visual check deferred to Phase 7
- [x] Step 4: Implement fixes page by page (7 pages modified)
- [x] Step 5: Handle edge cases (responsive, no dark mode)
- [x] Step 6: Final build check (TS compiles clean)
- [x] Step 7: Update state
- [x] Step 8: Load Phase 6

## Pages Modified in Phase 5
| Page | File | Findings Resolved |
|------|------|-------------------|
| Dashboard layout | `portal/src/app/dashboard/layout.tsx` | UX-006, UX-010 |
| Dashboard | `portal/src/app/dashboard/page.tsx` | UX-001, UX-002, UX-003, UX-007 |
| Inspections | `portal/src/app/dashboard/inspections/page.tsx` | UX-003, UX-004, UX-011, UX-012, UX-014 |
| Reports | `portal/src/app/dashboard/reports/page.tsx` | UX-003, UX-005, UX-011, UX-012, UX-014 |
| Templates | `portal/src/app/dashboard/templates/page.tsx` | UX-003, UX-008 |
| Settings | `portal/src/app/dashboard/settings/page.tsx` | UX-003, UX-009 |
| Login | `portal/src/app/login/page.tsx` | UX-013 |
| Auth module | `portal/src/lib/auth.tsx` | UX-013 (resetPassword) |

## Phase 6 (Onboarding) — Complete
- [x] Step 1: Assess need
- [ ] Steps 2-8: Skipped — onboarding not warranted
- [x] Step 9: Update state
- [x] Step 10: Load Phase 7

### Onboarding Decision: Skipped
- **Setup Wizard:** Not needed — portal is read-only companion to mobile app, no entities to create
- **App Tour:** Not needed — 5 flat pages with clear labels, GuidanceTips already provide contextual help
- Risk of IAP-2 (Eternal Onboarding) if tour were added to such a simple navigation
