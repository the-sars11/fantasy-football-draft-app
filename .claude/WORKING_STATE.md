# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-04-16
- **Focus:** P0 sub-tier 8 — Trash Talk Live Wiring
- **Status:** FF-305 COMPLETE — live trash talk alerts wired into live draft client.

## Last Completed (most recent first)
- **FF-305** (2026-04-16): Wired `analyzePickForTrashTalk()` into `live/client.tsx`. Added `trashTalkAlerts` + `savedAlerts` state, `processedPickCountRef` to skip historical picks on load, `useEffect` watching `state` + `players` to detect incremental picks from both manual entry and sheet polling. Renders `<TrashTalkFeed>` and `<SavedTrashTalk>` below `<PickFeed>` in left column. Dismiss removes from feed; save moves to saved list. Rule-based only — no LLM calls.
- **FF-257** (2026-04-14): Sticky pinned `ManualPickEntry` bar at viewport bottom. Added `bar` variant to `manual-pick-entry.tsx`, removed component from left column in `live/client.tsx`, rendered as `fixed inset-x-0 bottom-0 z-40 ffi-glass-heavy` with `env(safe-area-inset-bottom)` padding. Search dropdown opens upward. Defaults collapsed on mobile (search + price + Record), expanded on desktop. Card variant preserved for backward compat. Build/lint/test/type-check all clean.
- **FF-253/254** (2026-04-14): UI evaluation gate — verdict B (targeted redesign). 4 fixes scheduled: FF-257, FF-258, FF-259, FF-274. FF-255/256 (full redesign sprint) skipped.
- **Enterprise dev system upgrade** (2026-04-14): `.claude/` upgraded to Enterprise tier — REVIEW_LENSES, FEATURES_INDEX, CODE_AREAS, CHANGELOG, hooks, code-review skill.

## Historical (Sprint 9 — Design System Foundation, 2026-03-22)

## Last Completed
### Sprint 9 details (archived):
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

---

## Next Up

**P0 sub-tier 0 — UI Evaluation (FF-253)**
1. Audit all live-draft screens against the 6 criteria in `.claude/BUILD_PLAN.md`
2. Produce `.claude/UI_EVAL_2026.md` with verdict A, B, or C
3. Verdict determines whether redesign sprint fires before P0 sub-tiers 1-7

---

## Enterprise Sections

### Last 48 Hours
- 2026-04-14: Enterprise dev system upgrade — added FEATURES_INDEX.md, CODE_AREAS.md, CHANGELOG.md, REVIEW_LENSES.md, hooks/pre-commit-gate.ps1, skills/code-review/SKILL.md, settings.json, .github/workflows/ci.yml. Merged PROPOSE/PATCH/VERIFY + Review Lenses + Bug Hunt Schedule + Evidence Standard into CLAUDE.md. Rewrote BUILD_PLAN.md to P0-P7 structure.

### What Works (Verified)

| Feature | Last Tested | Status |
|---------|-------------|--------|
| Prep mode (full flow) | Phase 7.5 complete | Working |
| Live draft — auction mode | Sprint 8 complete | Working |
| Live draft — snake mode | Sprint 8 complete | Working |
| AI recommendations | Sprint 8 complete | Working |
| Player Intelligence | Phase 7.5 complete | Working (FF-243 API pending) |
| In-season companion | Phase 8 complete | Working |
| Google Sheets polling | Integrated | Working (known 403 edge case) |
| Manual pick entry | FF-033 | Working |
| Post-draft review | FF-102 | Working |
| Vercel deploy | FF-070 | https://fantasyfootballdraftapp-lac.vercel.app |

### What's Broken / Known Issues

#### P0 (Blocking draft day)
- None confirmed — needs audit (FF-253)

#### Known Non-Blocking
- FF-243: Confirm/dismiss system tag API pending
- FF-069: Tyler's league scoring settings not yet entered
- FF-072: Live draft dry run not yet completed
- Google Sheets 403 edge case on first connect (non-blocking — manual entry fallback works)

### Blockers

| Blocker | Blocking | Owner | Since |
|---------|----------|-------|-------|
| Tyler's scoring settings | FF-069 | Tyler | 2026-03-22 |

### Google Sheets Setup (Exact Format)
Document exact format when confirmed:
- **Sheet URL:** [Joe fills in — Nasties 2026 auction sheet]
- **Column auto-detection:** Player | Manager | Price | Round | Position (see `src/lib/sheets/index.ts:54-91`)
- **Share permissions:** Anyone with link = Viewer (for CSV export polling)
- **Polling interval:** 7 seconds (`use-draft-polling.ts` default)
- **Error handling:** 403/404 → surface error message, fallback to manual entry
- **Note:** Tyler's Yahoo snake sheet uses same column format but different URL

### Commands Reference

```bash
npm run dev          # Dev server on localhost:3003
npm run build        # Production build
npm run lint         # ESLint (hard gate on commit)
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier on src/
npm run type-check   # TypeScript (advisory)
npm run test:run     # Vitest single run (advisory on commit)
npm run test         # Vitest watch mode
npm run test:coverage # Coverage report
```

### Bug Hunt Status

| Cadence | Mode | Last Run | Next Run |
|---------|------|----------|----------|
| Per-sprint | free | Never | Before first P0 code change |
| Monthly | full | Never | End of first P0 sprint |
