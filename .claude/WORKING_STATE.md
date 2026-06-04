# Working State — Fantasy Football Draft Advisor

## Current Session
- **Date:** 2026-06-03
- **Focus:** UX-6.4 — Stadium Primetime "after" state audit (UX-6 QA gate close-out)
- **Status:** UX-6.4 complete. 6 screens DOM-audited at 1280px + 375px via preview_snapshot (screenshot renderer timed out; DOM audit substituted). All screens render without errors. Stadium Primetime v2.0 tokens confirmed active. QA gate for UX-6 is closed. Audit doc: `.claude/UX6_AFTER_AUDIT.md`. type-check / lint / tests not re-run (no source code changed — docs-only item).
- **NEXT:** UX-7.1 — Dev-only Sim engine (`useDraftSimulator` hook or `?sim=1` flag on `/draft/live`, gated DEV_MODE). Or FF-313 if Joe picks Option D or B.
- **GATED:** live AI auto-fire needs `ANTHROPIC_API_KEY` + typed cost approval. FF-313 app-shell double-mount awaits Joe's approach pick (D vs B). FFT-008 arm's-length physical test needs Joe on phone.
- **BACKLOG (deferred, tracked in CODE_REVIEW_2026-06.md):** giant-component extraction (live/review clients), broader test suite, sheet/dedup hardening, connection-pill a11y size, 25 pre-existing lint errors (unrelated debt).

## Last Completed (most recent first)
- **UX-6.4** (2026-06-03): UX-6 QA gate close-out. DOM-level snapshot audit of 6 screens (Prep Hub, Configure, Draft Board, Draft Setup, Live Auction Draft Room, Post-Draft Review) at desktop 1280px + mobile 375px. All panels render without errors. Real player data confirmed (3093 cached, 8 INJURY WATCH entries, 180+ player pool, 12 managers). `preview_screenshot` timed out on all attempts (heavy CSS filter stack); `preview_snapshot` substituted as authoritative record. Audit document: `.claude/UX6_AFTER_AUDIT.md`. No source code changed.
- **UX-6.3** (2026-06-03): Background-layer GPU promotion. `globals.css` only — `.atmos-grain` gains `transform: translateZ(0)` (dedicated compositor layer; before my change `getComputedStyle().transform` returned `none`). `.stadium-atmos.atmos-clock` + `body.ffi-on-the-clock .stadium-atmos` gain `will-change: filter` so filter-brightness animation is pre-allocated on GPU. Reduced-motion block resets those two to `will-change: auto` to release GPU memory when animations are off. type-check clean, 29/29 tests, 0 net-new lint errors, build clean. Arm's-length physical test (FFT-008) still deferred — needs Joe on phone.
- **UX-6.2** (2026-06-03): WCAG contrast + reduced-motion audit. `globals.css`: `--ffi-text-muted` #64748b→#7d8fa8 (passes 5.33:1 on `#0a1b25` surface, was 3.69:1). `glass-interactive:hover` added to reduced-motion block. `ffi-motion.tsx`: `useReducedMotion()` added to all 11 animation components — `FFIGlowPulse` persistent loop skipped, spatial transforms (y/x/scale/rotate) zeroed on entrance, whileHover/whileTap set to `{}`. Previously correct: `FFICelebration`, `FFIConfettiBurst`. type-check clean, 29/29 tests, 0 net-new lint errors, build clean.
- **UX-6.1** (2026-06-03): Empty states + skeletons across remaining screens. `page-skeleton.tsx`: removed shadcn Skeleton dep, replaced with inline `.ffi-skeleton` shimmer divs, card wrappers upgraded to `bg-[#0a1b25] border-white/[0.04]`. `prep/runs/client.tsx`: 3x `Loader2` spinners replaced with shimmer row skeletons; 2x empty state `<Card>` replaced with glass divs. `prep/strategies/client.tsx`: `Loader2` loading state replaced with shimmer skeleton cards; empty state upgraded to glass + v2.0 text tokens; unused `Loader2` import removed. `prep/runs/page.tsx` + `prep/strategies/page.tsx`: h1 → `ffi-display-md text-white` + p → `ffi-body-md text-[var(--ffi-text-secondary)]`. Verified live on /prep/runs + /prep/strategies. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- **UX-4.1 + UX-4.2** (2026-06-03): Prep Hub gold hover + Configure form glow. `prep/page.tsx` HubCard: icon/title/chevron hover updated from lime `--ffi-accent` to gold; icon container from slate-800 to v2.0 surface-container token. `configure/page.tsx`: h1 replaced with `ffi-display-md` v2.0 header. `globals.css`: added `.ffi-form-input` gold-glow focus class. `league-config-form.tsx`: `ffi-form-input` applied to all 11 inputs/selects. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.
- **Sunday Night Gridiron (Phases 0-5)** (2026-06-03): AAA broadcast-graphics UI + code-review P0 fixes. New files: `hooks/use-auto-recommend.ts`, `hooks/use-haptic.ts`, `lib/sound/use-sound.ts`, `lib/view-transition.ts`, `components/draft/pick-lower-third.tsx`, `components/draft/live-scorebug.tsx`, `components/draft/position-run-ticker.tsx`, `components/settings/sound-settings.tsx`, `lib/draft/__tests__/state.test.ts`, `.claude/CODE_REVIEW_2026-06.md`, `.claude/AAA_UI_RESEARCH.md`. Edited: `globals.css` (cyan token, easing, @property, tabular-nums, lower-third/ticker/scorebug/grade-ring CSS), `ai/claude.ts` (caching+guard), `api/draft/recommend/route.ts` (resilience+fallback), `draft/state.ts` (keeper completion), `position-scarcity.tsx` (default false), `auction-advisor.tsx`+`snake-advisor.tsx` (auto-fire), `ffi-motion.tsx` (FFICelebration gold tone + FFIConfettiBurst), `ffi-primitives.tsx` + `trash-talk.tsx` + live/review clients (emoji purge + grade-gold + sensory wiring), `eslint.config.mjs` (dash guard). type-check clean, build passes, 29/29 tests, 0 net-new lint errors.
- **App-shell double-mount investigation** (2026-06-03): Investigation only — NO code changed (fix proposed, awaiting Joe's approach pick). `app-shell.tsx` renders `{children}` in both the desktop (`hidden md:block`) and mobile (`md:hidden` SwipeCarousel) wrappers, so React mounts the route twice (confirmed live: `.ffi-onclock-banner` count = 2). Affects every `(app)` page; `LiveDraftClient` worst case — 2× polling/scoring + a last-write-wins clobber race that can drop manual picks (PATCH replaces the whole array, so no duplicate picks). Full analysis + Option D (recommended) vs Option B in BUILD_PLAN **FF-313**.
- **UX-2 (Opus elevation)** (2026-06-03): Reviewed Sonnet's UX-2 and upgraded the design-judgment core. (1) On-the-clock spotlight now fires only at the moment (snake turn / auction on-the-block) via `body.ffi-on-the-clock`, not the whole draft — preserves gold-as-the-moment. (2) Added on-the-clock HERO banner (`.ffi-onclock-banner` — gold glass + breathing glow + Framer spring reveal; Clock icon snake / Gavel icon auction). (3) Finished the lime → blue/value-green recolor in `client.tsx` (StrategyPicker icon+active, MySquad Target, "Roster complete!"). (4) Gray `--ffi-border` hairline → white light-catch. Visual-only (reads existing state). type-check clean, 27/27 tests, 0 lint errors; banner + spotlight verified live on both formats at 1280 + 390 (DOM geometry + computed styles).
- **UX-3.1–3.3** (2026-06-03): Draft Board / Player Pool v2.0. Ranks 1–24 gold, 25+ blue, no italic ghost. JetBrains Mono tabular-nums on all values/ADP/scores. Position filter active: lime → blue (board client + FFIPositionFilters). Sticky glass filter headers in both DraftBoardClient and PlayerPool. Density toggle (compact/comfortable) in both. Skeleton shimmer loaders replace loading text. Flash streaks: lime → gold. type-check clean, 27/27 tests, 0 lint errors in changed files.
- **UX-2.1–2.4** (2026-06-03): Live Draft Room v2.0. Gold Radio icon + AUCTION/SNAKE mode badge in header. `body.draft-active` class triggers `atmos-clock` gold spotlight pulse via CSS. `.ffi-pick-flash` CSS utility for gold-glow on newest pick (box-shadow only, no conflict with Framer Motion). PickFeed: your picks = gold left rail + gold-bright player name + gold price. Record button in pinned bar: lime → metallic gold gradient (`.ffi-btn-hero` values). ConnectionStatusPill: value-green LIVE state + glass blur on pill + `ffi-glass` error bar. TrashTalk steal/budget_dominance/keeper_steal: `--ffi-success → --value-green`. Bookmark icon gold. MySquadPanel budget: blue primary. type-check clean, 27/27, lint 0 errors.
- **UX-1.1–1.7** (2026-06-02): Stadium Primetime foundation. Superseded DESIGN_SYSTEM.md → v2.0; created UI_UPGRADE_PLAN.md + UI_DESIGN_SPEC v2.0 addendum; added UX track to BUILD_PLAN. `layout.tsx` loads Space Grotesk/Manrope/JetBrains via next/font (Inter dropped; fonts verified live on :3003 — fixes the long-standing silent system-font fallback). `globals.css`: gold ramp + value-green tokens, `.stadium-atmos`/`.atmos-grain`/`.atmos-clock` background, 3-tier light-catch glass (all gray card borders removed), `.ffi-btn-primary`(blue)/`.ffi-btn-hero`(gold)/`.ffi-btn-value`(green), `.ffi-animate-reveal`(+gold flash)/`.ffi-animate-stagger`. `app-shell.tsx`: atmosphere layers replace light-streak/flash divs; active nav lime→gold. `ffi-primitives.tsx`: FFIButton hero/value variants. type-check clean, 27/27 tests, changed files lint clean. Full `next build` deferred (port 3003 held by parallel dev server).
- **FFT-005** (2026-06-02): Prep configure + player pool Chrome test — `/prep/configure` renders ESPN/Auction/12-team/$200/Full PPR; Draft Board loads 500 players from Sleeper-seeded cache; 3 console issues all pre-existing (ThemeToggle hydration × 2 + user_tags fetch). PASS.
- **FFT-004** (2026-06-02): Seeded 2026 NFL players via Sleeper API. Created `scripts/seed-players-sleeper.ts` — fetches 12,194 players, filters to 3,064 active QB/RB/WR/TE/DEF (no kickers), deduplicates 16 name collisions → 3,048 unique rows upserted. Supabase total: 3,093. PASS.
- **FFT-002 + FFT-003** (2026-06-02): Chrome UI smoke tests — all prep screens pass; live draft auction + snake both render with connection pill, manual bar, 300-player pool. 3 bugs fixed (see below). ThemeToggle hydration mismatch and `user_tags` missing are known outstanding issues. Two Supabase migrations need Joe to apply via Dashboard SQL Editor.
- **Bug fixes** (2026-06-02): `createLeague` DEV_MODE now saves to Supabase via service role key; `ffi-player-card.tsx` `$undefined`/`$NaN-$NaN`/`Rd NaN` fixed with null-guards; `manual-pick-entry.tsx` `$undefined` in search dropdown fixed.
- **FF-DS-001–005** (2026-06-02): UI Design Spec formalized — `.claude/UI_DESIGN_SPEC.md` created, all 17 sections filled from DESIGN_SYSTEM.md.
- **FFT-001** (2026-06-02): PARTIAL PASS — dev server starts, build clean (3.8s), root → 200, /api/players/status → 200 (573 players in cache, last seeded 2026-03-22 — stale). One remaining blocker: ANTHROPIC_API_KEY missing from .env.local (AI calls will fail until added).
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
- **FF-313 — App-shell double-mount (architectural; fix proposed, not yet applied):** `LiveDraftClient` mounts twice (desktop + mobile wrappers both render `{children}`). 2× polling/scoring on the live-draft screen + a last-write-wins clobber race that can silently drop manually-entered picks (no duplicate picks in DB — PATCH replaces the whole array). Awaiting Joe's pick of Option D vs B; needs live confirmation of the clobber path. See BUILD_PLAN FF-313.
- Otherwise none confirmed — needs audit (FF-253)

#### Known Non-Blocking
- FF-243: Confirm/dismiss system tag API pending
- FF-269: Arm's-length physical test — needs Joe on phone
- FF-072: Live draft dry run not yet completed
- Google Sheets 403 edge case on first connect (non-blocking — manual entry fallback works)

### Blockers

| Blocker | Blocking | Owner | Since |
|---------|----------|-------|-------|
| `ANTHROPIC_API_KEY` missing from `.env.local` | All AI calls (research pipeline, recommendations, trash talk) | Joe — add key to `.env.local` | 2026-06-02 |

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
