# Code Review and North Star Audit (2026-06)

Comprehensive review run as the research half of the "Sunday Night Gridiron" UI/UX upgrade.
Findings were produced by reading the actual code (file:line evidence), then a subset was
fixed in the same build. Each finding is tagged FIXED (this build) or BACKLOG (deferred).

## Executive summary

Overall grade at review time: C+ - a polished visual body around an unfinished nervous
system. The design system, scoring engine, explainability layer, and trash-talk trigger
engine are genuinely strong. The gaps were structural: the flagship live AI advisor did not
fire on its own, cost control was unimplemented, the highest-risk logic was untested, and
there were confirmed correctness bugs (keeper completion, cross-source dedup).

The top items have now been addressed (see FIXED below). The remaining items are recorded as
BACKLOG so they are tracked rather than lost.

## North Star scorecard

| # | Criterion | Verdict at review | Status after this build |
|---|-----------|-------------------|-------------------------|
| 1 | <=3s recommendations (pick detected -> on screen) | NOT MET for LLM path (manual button only) | FIXED: advisor now auto-fires on pick via use-auto-recommend (auction every pick, snake near your turn). Sub-3s end-to-end still needs a live dry run with an API key. |
| 2 | Format purity (no auction metrics in snake and vice versa) | MOSTLY MET, one latent leak (PositionScarcityTracker showSpendRanges default true) | FIXED: default flipped to false; callers opt in. Recommendation modules already hard-throw on wrong mode. |
| 3 | Explainability first-class | MET | Unchanged (strongest area). |
| 4 | Proactive pivot within 3 picks | PARTIAL (rule-based fired; cited rec needed manual tap) | IMPROVED: the cited rec now auto-fires too. |
| 5 | One-thumb mobile at arm's length | PARTIAL (tiny connection pill, sync badges 9-11px) | IMPROVED: broadcast score-bug adds glanceable numbers; connection-pill bumped to 13px + per-state glyph (finding 13, 2026-08-09). Full arm's-length phone test (FFT-008) still needs Joe on device. |

## Findings

Severity: P0 blocker / P1 important / P2 nice. Effort: S/M/L.

| # | Sev | Area | Location | Problem | Status |
|---|-----|------|----------|---------|--------|
| 1 | P0 | North Star / LLM | auction-advisor.tsx, snake-advisor.tsx | AI recommendation only fired on a manual button click. | FIXED - new src/hooks/use-auto-recommend.ts; debounced auto-fire keyed on state.picks.length; manual Refresh retained. |
| 2 | P0 | Cost | lib/ai/claude.ts | No prompt caching; system context re-billed every call. | FIXED - system prompt now marked cache_control ephemeral by default (cacheSystem option). Note: caching only helps above the model min cache size, so the biggest beneficiary is the larger research/analyze prompts; live Haiku recommend prompts are small and already cheap. |
| 3 | P0 | Resilience | api/draft/recommend/route.ts | maxTokens 384 risked truncated JSON -> 500; no timeout/retry/fallback. | FIXED - maxDuration=10, maxTokens 600, one retry with backoff, 8s per-call timeout, and a rule-based fallback (top available by strategy) tagged source:'fallback' so the route never 500s the live draft. |
| 4 | P0 | State machine | lib/draft/state.ts:153 | Keeper leagues never completed (real picks alone never reach total_roster_spots). | FIXED - completion now counts state.keepers.length; covered by a new Vitest test. |
| 5 | P1 | Testing | whole src | Only one unrelated test file existed. | FIXED (2026-08-09, 67debd0) - 107 tests across 7 files. New files: keepers.test.ts (validateKeepers, keepersToPicks, applyKeepersToState, helpers), auction-feed-merge.test.ts (createPickMerger, playerNameToPickId), recommend/route.test.ts (fallback/no-500, validation, LLM success), trash-talk.test.ts (format gating). state.test.ts extended: getMaxBid reserve math + keeper slot counting, 12-team snake-order parity (picks 1/12/13/24/25), applySheetRows (7 tests). NOTE: sleeper-feed.test.ts (pickNoToManagerIdx consistency) deferred - hook requires React test environment setup beyond current jsdom scope. |
| 6 | P1 | Hard rule | trash-talk.tsx (+13 files) | 66 emoji across 14 files; em/en-dashes in user-facing strings. | FIXED - all emoji replaced with Lucide icons; em/en-dashes removed from string literals/JSX/templates; ESLint no-restricted-syntax guard added; trash-talk route strip now covers en-dash too. |
| 7 | P1 | State / dedup | state.ts:171-193 (applySheetRows) | Picks keyed purely by array index; sheet reorder/correction/mixed-with-manual can misalign or duplicate; snake round inferred wrong when backfilling. | FIXED (2026-08-09, c56ce68) - identity dedup by name+manager, snake round = ceil(pick_number/teamCount), 7 unit tests. FLAG: live-confirmed pending Joe's real Nasties sheet. |
| 8 | P1 | Architecture / dedup | use-draft-feed.ts, auction-feed-merge.ts | Double, mismatched dedup (real pick.id vs name-key); the merger's cross-source-with-Sheets path never actually runs. | FIXED (2026-08-09) - single dedup key is the source-assigned stable pick id: `auction:<auctioneerPickId>` (new auctionPickId() helper) for both auction sources, `sleeper:<pick_no>` for Sleeper. AuctioneerPick now surfaces `sourceId` (was stripped); use-draft-feed keys by it instead of re-deriving a name key. playerNameToPickId kept as documented id-less fallback only (prefix `sheets:`->`name:`, no live caller). Behavior-preserving: same auctioneer draft => same id across same-device+remote; caller draftedNames name-gate untouched. Sheets never flowed through this merger and now documented as such. Tests 117->122 (auctionPickId + cross-source dedup + name fallback). type-check 0, eslint 0 new, build clean. |
| 9 | P1 | Giant components | live/client.tsx (~1140), review/client.tsx (~1200) | Mix data, 4 feeds, trash-talk, pivot logic, presentation; hard to test. | FIXED (2026-08-09, full extraction in 6 verified stages). review/client.tsx 1123 -> 376: extracted PickCard/GradeHero/etc. into review-cards.tsx (648) + useDraftReviewData hook (184). live/client.tsx 1444 -> 927: moved StrategyPicker/PickFeed/MySquadPanel to their own files, and extracted useLiveDraftData (151), useDraftFeeds (127), useTrashTalkEngine (174). All behavior-preserving; each stage passed type-check + lint (0 new) + 107 tests + build. SHAs 29cf13b, 72901e1, 9e5d012, 4ec7052, e6200eb, 0c2c233. |
| 10 | P1 | Resilience / UX | use-draft-polling.ts | Sheet poll has no failure backoff; callbacks in deps can restart the interval mid-draft. | FIXED (2026-08-09, 1f7cf79) - callbacks/mapping/sheetUrl moved to refs so pollOnce is stable and the loop no longer restarts on first mapping-detection or session change; fixed setInterval replaced with a self-scheduling setTimeout that backs off exponentially on consecutive failures (intervalMs * 2^failures, cap 60s) and resets on success. Public API unchanged. |
| 11 | P1 | Keeper numbering | keepers.ts | keepersToPicks uses global negative numbers; applyKeepersToState uses per-manager - K labels can disagree. | PERMANENT HOLD - out of scope (Tyler's league removed from this app). |
| 12 | P1 | UX / mechanics | live/client.tsx, manual-pick-entry.tsx | No edit/correct of a mis-entered pick; only LIFO undo. | FIXED (2026-08-09, 2e48c84 + bdd11c1). Stage A (logic): pure removePickByNumber/editPickByNumber in state.ts + editPick/removePick hook actions that rebuild from scratch (fresh managers -> re-apply keepers -> replay) so budgets/roster/snake-turn stay consistent; 10 new unit tests. Stage B (UI): FixPickSheet bottom sheet lists all teams' sales newest-first; tap opens an inline edit card (player/team/price) or Remove; entry via a "Fix a pick" button above the record bar. Design mockup approved before build. Verified live in sim: editing CeeDee Lamb $102->$92 refunded Rasar $54->$64, recomputed max bid and avg-needed, updated roster. |
| 13 | P1 | A11y / mobile | connection-status-pill.tsx | Connection state renders at 9-11px; color-only LIVE/STALE/OFFLINE. | FIXED (2026-08-09) - label 11px->13px, elapsed 9px->11px; the color-only dot replaced with a per-state Lucide glyph (LIVE Radio / STALE Clock / OFFLINE WifiOff / MANUAL Keyboard) so state is distinguishable by shape, not color alone. LIVE pulse now motion-safe. |
| 14 | P2 | Code quality | claude.ts (content[0]) | Unsafe access if a non-text/empty content block returns. | FIXED - now finds the text block defensively. |
| 15 | P2 | Format purity defense | position-scarcity.tsx | showSpendRanges defaulted true (unsafe). | FIXED - defaults false. |
| 16 | P2 | Pre-existing lint debt | ~25 errors | no-explicit-any (6), react-hooks/refs (~12), no-unescaped-entities (5), prefer-const (2). | BACKLOG - present before this work; unrelated to the UI upgrade. Next 16 does not run ESLint during build, so these do not block the build, but `npm run lint` is not clean until they are addressed. |

## Focused test plan (BACKLOG, highest value first)

1. state.test.ts - extend: snake-order parity at picks 1/12/13/24/25; getMaxBid $1-reserve with keepers; applySheetRows backfill round math.
2. format-purity.test.ts - fetchAuction/Snake throw in wrong mode; payload field disjointness; trash-talk auction-only triggers silent in snake.
3. keepers.test.ts - budget deduction, roster fill, excluded from grading, numbering consistency, validateKeepers cases.
4. auction-feed-merge.test.ts - dedup by pickId; cross-source same-player behavior once precedence is defined.
5. sleeper-feed.test.ts - pickNoToManagerIdx must match state.ts snake math at boundaries.
6. recommend-route.test.ts - truncated/invalid JSON returns fallback, not 500 (mock the SDK).

## What is genuinely good (keep it)

- explain.ts explainability engine (weighted factors, cited sources, thin-data guards).
- Format-split recommendation modules with hard throws.
- use-sleeper-draft-feed.ts is the model hook (refs for callbacks, stable deps) - use as the refactor template.
- Trash-talk trigger engine, correctly format-gated at detection.

## Process note

WORKING_STATE/CHANGELOG should be read with mild skepticism: "27/27 tests" was one unrelated
file, and "FF-265 fixed" was a render-layer band-aid over a data-layer default. Verify claims
against code. This review did.
