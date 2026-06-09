# Design Overhaul State

## Current Phase: COMPLETE
## Completed: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

## Project
- **Name:** Inspectly
- **Domain:** Home inspection / PropTech / professional services
- **Framework:** Next.js 15 (App Router, static export)
- **CSS:** Tailwind CSS v4
- **Component Library:** None (lucide-react icons only)
- **Build Tool:** Next.js built-in
- **Package Manager:** npm
- **Animation Library:** None
- **Icon Library:** Lucide React

## Page Inventory
| Page | Route | File | Status |
|------|-------|------|--------|
| Landing | `/` | `src/app/page.tsx` | done |
| Login | `/login` | `src/app/login/page.tsx` | done |
| Signup | `/signup` | `src/app/signup/page.tsx` | done |
| Dashboard | `/dashboard` | `src/app/dashboard/page.tsx` | done |
| Inspections | `/dashboard/inspections` | `src/app/dashboard/inspections/page.tsx` | done |
| Reports | `/dashboard/reports` | `src/app/dashboard/reports/page.tsx` | done |
| Templates | `/dashboard/templates` | `src/app/dashboard/templates/page.tsx` | done |
| Settings | `/dashboard/settings` | `src/app/dashboard/settings/page.tsx` | done |
| Report Viewer | `/report` | `src/app/report/page.tsx` | done |
| App Shell | -- | `src/app/dashboard/layout.tsx` | done |
| Not Found | -- | `src/app/not-found.tsx` | done |
| Global Error | -- | `src/app/global-error.tsx` | removed (incompatible with static export) |

## Design Direction
**Chosen:** Fieldwork -- warm, grounded, built for tradespeople who value craft over flash
**Typography:** Fraunces (soft serif, wonky optical sizing) + Public Sans (US government typeface, neutral, trustworthy)
**Primary:** #3B2F27 (dark walnut)
**Accent:** #C29650 (warm brass)
**Background:** #F6F3EF (warm cream)
**Surface:** #FDFCFA (near-white warm)
**Foreground:** #1F1A16 (deep chocolate)
**Distinguishing:** #5A8A6B (sage green)
**Signature:** Warm photography of real residential properties as section backgrounds. Walnut-toned nav bar. Buttons with subtle warm texture. Editorial asymmetric layouts.

## Page Archetype
**Landing:** The Split Story
**Rationale:** "Old way vs New way" before/after narrative perfectly matches how inspectors experience the transition from paper clipboards to digital tools. Avoids generic Nav-Hero-Features-CTA formula.

## App Shell Archetype
**Shell:** Top Rail (segmented tabs variation)
**Rationale:** 5 nav items fit perfectly in horizontal tabs. Full-width content gives data tables and report panels room to breathe. Feels more modern than sidebar-heavy approach.

## 21st.dev Research
### Phase 5 (Landing)
- Hero sections with image + text layouts, product screenshot in browser frame
- Trust signal logo strips below hero
### Phase 6 (Auth)
- Clean login forms with social auth buttons
### Phase 7 (Shell)
- Carbon-style sidebar (reference for icon-based nav, adapt to top rail)
- Segmented tab navigation patterns
### Phase 8 (Pages)
- Data tables, card grids, form layouts

## Design System
See `portal/docs/design-system.md` — complete Fieldwork system with Tailwind v4 @theme tokens.

## Phase 4 (Foundation) — Complete
- globals.css rewritten with @theme tokens, base styles, animations
- layout.tsx updated with favicon, OG tags, theme-color
- Custom SVG favicon (house + checkmark)

## Phase 5 (Landing) — Complete
- Split Story archetype: Old Way vs New Way narrative
- Hero, trust badges, paired comparisons, stats, pricing, CTA, footer
- 4 Unsplash images downloaded with CREDITS.md

## Phase 6 (Auth) — Complete
- Login: split layout (brand panel + form), Google OAuth, design tokens
- Signup: split layout, value proposition checklist, password strength indicator, verification state

## Phase 7 (App Shell) — Complete
- Top Rail with walnut header, segmented tabs, user dropdown
- Mobile hamburger menu with slide-out drawer

## Phase 8 (Page Overhaul) — Complete
- All 5 dashboard pages overhauled (Overview, Inspections, Reports, Templates, Settings)
- Not Found + Global Error pages rewritten
- Report viewer page updated with design tokens

## Phase 9 (Polish) — Complete
- [x] Step 0: Context7 research — Tailwind v4 transition/animation utilities confirmed
- [x] Step 1: Micro-interactions — `btn-interactive`, `card-interactive`, input focus glow, `link-underline` classes added to globals.css and applied to landing page CTAs, pricing cards, comparison cards
- [x] Step 2: Scroll-triggered reveals — IntersectionObserver in landing page, `.reveal` + `.reveal-stagger` classes on features heading, comparison cards, stats, pricing, CTA sections
- [x] Step 3: Page load orchestration — `.hero-orchestrate` class with staggered `hero-enter` keyframes on hero right panel (badge → headline → paragraph → CTA → metric)
- [x] Step 4: Toast/notification styling — skipped, no toast library in project
- [x] Step 5: Image treatments — `.img-hover-zoom` class added; CSS background images (no `<img>` tags to lazy-load)
- [x] Step 6: Dark mode — skipped, design system has no dark tokens
- [x] Step 7: Responsive fine-tuning — verified at 1440px, 1280px, 1024px, 768px, 390px; no overflow or layout issues
- [x] Step 8: Accessibility — label/input `htmlFor`/`id` associations on login+signup; `aria-hidden` on Loader2 spinners and Google SVG; `focus-visible:ring-*` on all buttons
- [x] Step 9: `prefers-reduced-motion` — global media query disables all animation/transition durations
- [x] Step 10: Anti-pattern sweep — all 12 APs checked, all pass (Split Story hero, paired comparisons not 3-col grid, Top Rail not sidebar, walnut primary not blue, mixed radii, varied spacing, 4+ SaaS conventions broken)
- [x] Step 11: Console branding — ASCII "INSPECTLY" art in brass (#C29650), tagline "The clipboard retires today." in walnut, URL in muted; placed in layout.tsx `<script>`
- Zero `teal-` or `slate-` tokens remaining in any `.tsx` file
- All components migrated to semantic design tokens

## Phase 10 (Visual Verification) — Complete
- Landing: Split Story hero, warm walnut nav, brass accents, responsive mobile layout
- Login/Signup: Split layout with brand panels, responsive (form-only on mobile)
- 404: Minimal centered layout with shield icon, warm cream background
- Report: Error state renders correctly with Fraunces headings
- Dashboard: Auth-gated (verified build compiles clean)
- Mobile (390px): All pages stack correctly, typography readable, no overflow

## Audit Findings (all resolved)
- ~~No custom favicon~~ → Custom SVG house+checkmark favicon
- ~~System/default fonts only~~ → Fraunces + Public Sans loaded via Google Fonts
- ~~No animations or transitions~~ → Subtle fade-in, hover transitions throughout
- ~~No OG image~~ → OG meta tags added
- ~~Monochromatic teal-600 + slate palette~~ → Fieldwork: walnut, brass, cream, sage
- ~~Cookie-cutter AI landing page structure~~ → Split Story archetype
- ~~Identical card patterns across all sections~~ → Varied layouts per section
- ~~Standard sidebar + content dashboard layout~~ → Top Rail with segmented tabs
- ~~Centered-card-on-blank auth pages~~ → Split layout with brand photography
