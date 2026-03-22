# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-03-22
- **Focus:** Phase 6 Sprint 9 — Design System Foundation
- **Status:** SPRINT 9 COMPLETE — ready for Sprint 10

## Last Completed
- FF-060: Design system tokens — COMPLETE
  - Full FFI color palette in globals.css
  - Surface hierarchy utilities (ffi-surface, ffi-surface-elevated)
  - Glassmorphism utilities (ffi-glass, ffi-glass-heavy)
  - Shadow and glow effects (ffi-shadow-card, ffi-glow-accent)
  - Gradient utilities (ffi-bg-gradient, ffi-gradient-progress)
- FF-061: Typography overhaul — COMPLETE
  - Added Oswald font for display headlines
  - Full type scale (ffi-display-xl through ffi-caption)
  - All-caps label treatment with letter-spacing
- FF-062: Component primitives reskin — COMPLETE
  - FFI button variants (primary lime pill, glass secondary, ghost)
  - FFI card variants (default, elevated, interactive)
  - FFI input styles (recessed, glow focus)
  - FFI badges (position-specific QB/RB/WR/TE/K/DEF, status badges)
  - FFI progress bars (gradient, scarcity status indicators)
  - App shell updated with FFI branding and styling

## Files Modified (This Session)
- `src/app/globals.css` — Complete FFI design system tokens and utilities
- `src/app/layout.tsx` — Added Oswald font, updated metadata to FFIntelligence
- `src/components/ui/ffi-primitives.tsx` — NEW: React component primitives
- `src/components/layout/app-shell.tsx` — Updated with FFI styling and branding
- `.claude/BUILD_PLAN.md` — Marked Sprint 9 tasks complete

## Next Up
- **Phase 6 Sprint 10:** Screen redesigns (FF-063 through FF-066)
  - FF-063: App shell + nav redesign (full redesign, not just styling)
  - FF-064: Prep Hub redesign
  - FF-065: Draft Board redesign (compact player cards)
  - FF-066: Live Draft room redesign
- FF-069: Tyler's league setup — waiting on his scoring settings + keeper rules/costs
- FF-072: Live draft dry run — mock Google Sheet, full live draft flow

## New FFI Components Available
```tsx
// Buttons
<FFIButton variant="primary|secondary|ghost">
// Cards
<FFICard variant="default|elevated|interactive">
<FFICardHeader>, <FFICardTitle>, <FFICardDescription>
// Badges
<FFIBadge position="QB|RB|WR|TE|K|DEF">
<FFIBadge status="success|warning|danger|info">
<FFIPositionBadge position="RB" />
// Progress
<FFIProgress value={75} status="critical|stable|elite" label="RBs" />
// Grades
<FFIGrade grade="B+" size="sm|default|lg" />
// Composite Cards
<FFITacticalInsight insight="..." confidence={98} />
<FFITrashTalkAlert type="overpay" message="..." />
<FFIAIRecommendation title="..." message="..." />
<FFIPlayerCard rank={1} name="CMC" ... />
```

## Architecture Notes
- shadcn/ui v4 uses base-ui (not Radix) — no `asChild` prop on Button/TooltipTrigger
- `buttonVariants()` is client-only, can't be called in server components — use plain Tailwind classes for Links in server pages
- Dev mode (`DEV_MODE=true`) bypasses all Supabase auth, returns mock user
- Middleware redirects: root → /prep, auth routes → /prep (when authenticated)
- Dark mode is default (class="dark" on html element)
- Draft state is immutable — `applyPick()` returns new state, enables undo
- Session picks persist to Supabase via PATCH /api/draft/sessions/[id]
- Keepers stored in session.keepers jsonb, applied to state at init via `applyKeepersToState()`
- Keepers have negative pick_numbers to distinguish from real draft picks
- Keeper picks are excluded from draft grading (only real picks are graded)
- `getDraftedPlayerNames()` includes both real picks AND keeper player names
- Explainability engine uses `calculateScarcity()` shared between scarcity tracker and "Why?" reasoning
- Auction advisor uses analyzeBudgetStrategy() for pace tracking, getPositionUrgencyWarnings() for scarcity alerts
- LLM recommendations via /api/draft/recommend — sends top 15 available players + context, gets back 3 targets (~500 tokens)

## Notes
- gh CLI not installed — GitHub repo needs web UI or gh install
- Port 3003 to avoid conflicts
- Joe = ESPN / Auction / Full redraft
- Tyler = Yahoo / Snake / Keeper league
