# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-06-02
- **Focus:** P0 Sub-tier 4 — Touch target audit
- **Status:** FF-269 code audit COMPLETE — 7 elements in 4 files bumped to min-h-[44px]. Physical test (FFT-008) still requires Joe on phone. Next actionable P0 items: FF-DS-001 (Design System Formalization) or FFT-001 (environment smoke test in P2).

## Last Completed (most recent first)
- **FF-269** (2026-06-02): Touch target audit — 7 elements in 4 files bumped to min-h-[44px]: position filter pills + sort tabs (ffi-position-filters.tsx), expand chevron (ffi-player-card.tsx), error bar Retry + dismiss × (connection-status-pill.tsx), card submit + undo (manual-pick-entry.tsx). Physical test FFT-008 still needs Joe on phone.
- **FF-283** (2026-04-16): Added `maxBidAdviceMap: Map<string, number>` useMemo in `live/client.tsx` — calls `calculateMaxBidAdvice()` for every undrafted player, keyed by lowercase name. Deps: `[state, scoredPlayers, draftedNames, strategy]` — all three pick sources (Auctioneer BroadcastChannel/localStorage, Sheets, manual) flow through `setState` and invalidate the memo. Added `maxBidMap?: Map<string, number>` prop to `PlayerPool`; each `FFIPlayerCard` now gets per-player strategy-aware max bid (not a global flat value). `MySquadPanel` keeps the simple `getMaxBid()` result. Import added: `calculateMaxBidAdvice` from `auction-advisor`. Type-check clean, lint zero new errors.
- **FF-282** (2026-04-16): Created `src/hooks/use-draft-feed.ts` — wraps `useAuctioneerfeed`, converts `AuctioneerPick[]` → `NormalizedPickEvent[]` via `createPickMerger()` + `playerNameToPickId()`. Re-exports `NormalizedPickEvent` + `AuctioneerConnectionType`. Gated: `format === 'auction'` (internal). Updated `live/client.tsx`: import swapped to `useDraftFeed` + `NormalizedPickEvent`; handler ref type updated; `pick.player_name` → `pick.playerName` in handler body; `useAuctioneerfeed(...)` → `useDraftFeed({format, connectionType, onNewPicks})`; gating now internal to hook. Sheets polling in `use-draft-state.ts` untouched — Tyler's path zero behavior change. Type-check clean, lint zero new errors.
- **FF-281** (2026-04-16): Created `src/lib/draft/auction-feed-merge.ts` — pure utility, no React deps. `NormalizedPickEvent` (pickId, playerName, manager, price, position?, source). `createPickMerger()` factory returns stateful `PickMerger` with `merge()`, `reset()`, `seenCount`. `playerNameToPickId()` synthesizes `sheets:<name>` IDs for sources without native pick IDs. Ready for FF-282's `use-draft-feed.ts` to consume.
- **FF-280** (2026-04-16): Added BroadcastChannel subscriber to `src/hooks/use-auctioneer-feed.ts`. New `useEffect` gates on `enabled && connectionType === 'localstorage'`. Opens `BroadcastChannel('ffi-auction-feed')`, on each message: reads teamNameMap from `auctioneer-draft-v1` localStorage, routes the single `_AAPick` through existing `processBatch` (seenPickIdsRef dedup). Channel fires instantly; 3-second poll below it serves as catch-up for any missed messages. Auctioneer publisher (`ffiBroadcastRef.postMessage`) was already wired in AA-INT1 (`draft/page.tsx` lines 86-93, 129). Zero changes to Auctioneer repo. Type-check clean, lint zero new errors.
- **FF-279** (2026-04-16): Created `src/hooks/use-auctioneer-feed.ts` — two polling paths (localStorage: reads `auctioneer-ffi-feed-v1` + `auctioneer-draft-v1` every 3s; file: polls `FileSystemFileHandle` from File System Access API every 3s). Auctioneer `Pick` normalized to FFI `AuctioneerPick` with teamId→name resolution. Dedup via `seenPickIdsRef`. Setup client: added Auctioneer Sync card in Step 3 (auction-only) with Same Device + Export File options; `setGlobalFileHandle` called on file pick; `?aif=` param appended to live URL. Live client: `onAuctioneerpicks` stable callback via `useCallback([])` + `handleAuctioneerPicksRef`; picks filtered against `draftedNames` before `addManualPick`; `AA ✓N` badge in header when connected. Type-check clean, lint clean (no new errors in changed files).
- **FF-311** (2026-04-16): Created `src/lib/draft/trash-talk-history.ts` — ported from auctioneer with adaptations: `buildTeamOwnerMap` takes `string[]` manager names (no team IDs), `buildHistoryBlock` uses `TrashTalkType` with FFI-specific trigger mappings (keeper_steal/bad_keeper added). Copied `src/data/history.json` (10 Nasties owner profiles). Wired into `live/client.tsx`: `teamOwnerMapRef` built once from `state.manager_order`; `historyBlock` computed per-alert and passed to `generateTrashTalk()` in both pick and keeper effects.
- **FF-310** (2026-04-16): Added `generateTrashTalk()` to `src/lib/draft/trash-talk.ts` — thin async wrapper that maps `TrashTalkAlert` fields to `TrashTalkRequest` and calls `/api/trash-talk`. Wired fire-and-forget calls in both trash talk `useEffect` hooks in `live/client.tsx` — alerts added to feed immediately with hardcoded message, then message updated in-place when Haiku responds non-null. Null response keeps hardcoded fallback. Keeper effect receives same treatment. Type-check clean.
- **FF-309 + Keeper/Sleeper augmentation** (2026-04-16): Added `market_mismatch` (both formats — ADP-comparable picks at same position with ≥35% price spread or ≥3 round diff) and `late_roster_qb_panic` (snake-only, 7+ picks no QB). Added `analyzeKeeperPicksForTrashTalk()` export — fires `keeper_steal`/`bad_keeper` alerts at draft start for keeper leagues. Live client now passes `keepersToPicks(state.keepers)` merged into `allPicks` so QB-detection triggers work correctly in Tyler's keeper snake league. Tyler's league preset updated from Yahoo → Sleeper in league-config-form.
- **FF-308** (2026-04-16): Upgraded auction trigger engine in `src/lib/draft/trash-talk.ts`. Added `impliedAuctionValue()` quadratic decay formula (replaces `AVG_POSITION_VALUES` fallback in overpay + steal). Added 6 triggers: `budget_buster` (>60% spent, <35% roster filled), `last_big_spender` (pick 30+, exactly 1 team >2x avg remaining AND >$30), `cheapskate_special` (price ≤$3, avg <$7/pick), `budget_dominance` (pick 40+, top team >1.5x avg remaining AND >$30), `first_defense_buy` (fires BEFORE K/DEF guard), `lone_wolf_qb` (9+ picks, no QB). Priority order updated. `TrashTalkType` union + component config map extended. `detectOverpay` and `detectSteal` updated to use `impliedAuctionValue`.
- **FF-307** (2026-04-16): Created `src/app/api/trash-talk/route.ts`. Claude Haiku (temperature 1.0, no streaming). Family-Safe: PG-13 system prompt, max_tokens 60. Adult-Only: Jeselnik/Ross/Hinchcliffe style, max_tokens 80. Em-dash hard-strip enforced post-response. Fail-silent on all errors — always returns `{ line: null }` rather than breaking the draft. Exports `TrashTalkRequest` and `TrashTalkResponse` types for FF-310 client wrapper.
- **FF-306** (2026-04-16): Added 3-way trash talk mode selector (Off/Family-Safe/Adult-Only) to setup Step 3. `TrashTalkMode` type defined in both files. Mode passed as `&ttm=` URL param to live client. Live client reads param from searchParams (default: `family-safe`), gates the trash talk `useEffect` with early return when `'off'`.
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
- FF-072: Live draft dry run — mock Google Sheet + Sleeper draft, full live draft flow

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
- Tyler = Sleeper / Snake / Keeper league (T&A Keeper League)

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
- FF-269: Arm's-length physical test — needs Joe on phone
- FF-072: Live draft dry run not yet completed
- Google Sheets 403 edge case on first connect (non-blocking — manual entry fallback works)

### Blockers

| Blocker | Blocking | Owner | Since |
|---------|----------|-------|-------|
| — | — | — | — |

### Google Sheets Setup (Exact Format)
Document exact format when confirmed:
- **Sheet URL:** [Joe fills in — Nasties 2026 auction sheet]
- **Column auto-detection:** Player | Manager | Price | Round | Position (see `src/lib/sheets/index.ts:54-91`)
- **Share permissions:** Anyone with link = Viewer (for CSV export polling)
- **Polling interval:** 7 seconds (`use-draft-polling.ts` default)
- **Error handling:** 403/404 → surface error message, fallback to manual entry
- **Note:** Tyler uses Sleeper app (snake/keeper) — FF-312 adds Sleeper live draft polling as a 4th draft mode

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
