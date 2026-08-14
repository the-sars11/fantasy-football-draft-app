# Bug Hunt Log

## Hunt: 2026-08-13 -- free mode -- Scope: R10a changed modules (sim-engine.ts, sim-engine.test.ts)

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code (static read-only pass)
**Mode:** FREE -- static analysis of the 2 files created in R10a.

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 1 (deferred to R10b) |

### Findings

#### LOW

##### BUG-R10a-01: Solver invoked per-bidder-per-lot may be slow on the full board
- **File:** `src/lib/draft/sim-engine.ts` (bidding loop in `runAuctionSim`)
- **Category:** Performance
- **Effort:** S
- **Description:** Every lot asks every legal manager to run `computeRosterConstrainedMaxBid`, which runs the greedy solver. For the deep test board (190 players) at 8-24 runs this is fine (tests pass in well under a second), but the real prep board is ~450 players; 12 seats × ~450 lots × N runs of a full solve could get slow when R10b lets the UI crank N up.
- **Evidence:** `runAuctionSim` calls the solver inside the per-manager willingness loop, inside the per-lot loop, inside the per-run loop of `runMonteCarlo`.
- **Fix (exact-safe):** pre-trim the priced board to the top-K per position (K = total slots across all managers) before simulating — players below every seat's Kth need are never affordable-and-wanted, so trimming does not change outcomes, only cost. Defer to R10b because R10a's Done-when does not include perf and the UI (which sets N) does not exist yet.
- **Impact:** None at R10a scale (all 20 tests green, sub-second). A latency risk only once the real board + a user-chosen large N are wired in R10b.

### Items verified clean (no bugs found)

- **Completion guarantee:** bench accepts any position, so while any manager holds an open bench slot no lot goes unsold; board (190 in tests) > total slots (168) so the loop exits only when all seats are full — smoke test confirms every seat reaches cap.
- **Solver purity under repeated calls:** `computeRosterConstrainedMaxBid` reads `slotsRemaining` via spread and does not mutate the shared `manager.slots`, so calling it once per bidder per lot is side-effect-free — no cross-manager contamination.
- **Determinism:** a single `rng` per run, drawn in a fixed order (nomination jitter, then per-qualifying-manager valuation in ascending manager index) → byte-identical runs under the same seed (asserted).
- **Dead code removed:** the vestigial `nominator` round-robin counter (assigned + incremented, never read) was deleted; it consumed no RNG draw, so behavior is identical and 20/20 stayed green.

---

## Hunt: 2026-08-13 -- free mode -- Scope: R8 changed modules (board/client.tsx, players/client.tsx)

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code (static read-only pass)
**Mode:** FREE -- static analysis of 2 files changed in R8.

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 1 (pre-existing, not introduced by R8) |

### Findings

#### LOW

##### BUG-R8-01: K in POSITIONS filter on no-kicker Cheat Sheet
- **File:** `src/app/(app)/prep/board/client.tsx:27`
- **Category:** UX
- **Effort:** S
- **Description:** `POSITIONS` includes `'K'` but the Nasties is a no-kicker league. Selecting the K pill returns an empty list with no explanation. Not introduced by R8 (pre-existing).
- **Evidence:** `const POSITIONS: (Position | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']` — K produces zero results.
- **Fix:** Remove K from POSITIONS array.
- **Impact:** Cosmetic confusion; no functional breakage.

### Items verified clean (no bugs found)

- **BUG-R7b-01 fix:** three-memo split correct — `boardPlayers` (deps `[players]`), `solverResultMap` (deps `[boardPlayers]`), `fitLineMap` (deps `[boardPlayers, solverResultMap, isTarget, isAvoid]`). Tag toggles only re-run `fitLineMap`; 500 solver calls stay stable.
- **fitLineMap iteration safety:** iterates `boardPlayers` and looks up `solverResultMap.get(bp.id)` — same source array, all IDs present. `if (result)` guard is defensive and correct.
- **K players fitLine:** K excluded from `boardPlayers`, returns `undefined` from `fitLineMap.get()`. `FFIPlayerIntelCard.fitLine` prop is optional — no crash.
- **flexPlayers sort:** called on `.filter()` return (new array) — no mutation of `scoredPlayers`.
- **adjustedAuctionValue optional:** `a.adjustedAuctionValue ?? a.player.consensusAuctionValue` — correctly falls back when no active strategy.
- **DraftBoardTable props:** `onToggleTarget`, `onToggleAvoid`, `isTagLoading` all match the component interface at `draft-board-table.tsx:13-16`.
- **Gate results:** type-check 0, 344/344 tests, lint 0 new, build clean.

---

## Hunt: 2026-08-12 -- free mode -- Scope: R5 roster-solver wiring changed modules

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code (static read-only pass; type-check/test/lint/build already run green in the R5 VERIFY gate)
**Mode:** FREE -- static analysis of the 6 files touched/added by R5: roster-solver.ts, solver-bridge.ts (new), what-to-do.ts, on-the-block-card.tsx, auction-room.tsx, draft/live/client.tsx (+ 2 test files).

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 0 |

| Category | Count |
|----------|-------|
| Logic | 1 |

### Findings

#### MEDIUM

##### BUG-R5-01: budget-aware fill never advances to a cheaper affordable player; over-drops to $1 fillers
- **File:** `src/lib/draft/roster-solver.ts:200-215` (Phase 1 dedicated) and `:230-245` (Phase 2 FLEX)
- **Category:** Logic
- **Effort:** S (~5 lines + one regression test)
- **Description:** When the highest-ceiling candidate for a slot is unaffordable under the R5 guard, the loop drops that slot straight to a $1 replacement filler instead of trying the next-cheaper affordable player of the same eligibility. In the FLEX phase the unaffordable candidate is never marked `used`, so `flexPool.find(p => !used.has(p.id))` returns the *same* unaffordable player on every FLEX iteration -- every FLEX slot collapses to a $1 filler even when affordable mid-tier RB/WR/TE are on the board. The dedicated phase has the same latent shape (masked in Nasties because there is exactly one QB/RB/WR/TE/DST slot, so there is no second iteration to expose it).
- **Evidence:** Scenario -- `flex:3`, tight budget, board flexPool sorted ceiling DESC = [stud $25 exp, mid $3 exp, cheap $2 exp]. Guard fails on the $25 stud, passes on the $3 mid. Current code fills all three FLEX slots with $1 fillers ($3 total) and never buys the affordable $3 mid. Correct "best affordable rest" would spend $3 + $2 + filler.
- **Direction of error:** completionCost is *understated* -> `maxBid = budget - completionCost` is *overstated*. The displayed cap reads too GENEROUS in tight-budget/multi-FLEX spots (opposite direction from the already-documented "elite studs read conservative" calibration flag). Budget-SAFE: the roster is still completable at $1/slot, so it never advises a bid Joe literally cannot cover -- it just under-reserves for a good bench/FLEX.
- **Fix:** Select the first *affordable* unused eligible player (`flexPool.find(p => !used.has(p.id) && affordable(p.expectedCost))`), else filler -- applied consistently to both the dedicated and FLEX phases. Add a regression test with a 3-FLEX pool where the top player is unaffordable but cheaper ones are affordable.
- **Impact if unfixed:** In tight mid/late-draft states the roster-completion cap can advise a few dollars more than the true best-affordable completion supports. Not a crash, not a budget blowout; a calibration imperfection in the exact scenario RV-1 exists to protect. Same family as the honest-calibration flag already carried into R6/R9.
- **Verified-not-broken:** All 296 tests stay green because every existing tight-budget test uses a single-player-per-position board (no cheaper alternative to advance to), so the fix would return identical results there.

### Notes

- Client-side fold (`client.tsx:363-365`) verified correct: `maxBidAdviceMap` and `rosterAdviceMap` both key on `name.toLowerCase()`; `Math.min(silo, roster)` is the intended RV-1 cap; memo deps complete; `getBudget` is a stable `useCallback`.
- BUG-007 short-circuit (`roster-solver.ts:356`) verified: no-slot players return `maxBid:1, feasible:false` and fold to a $1 cap on the board, which is correct.
- `describeRosterConstraint` copy verified dash-free (test asserts `not.toMatch(/[--]/)`).

---

## Hunt: 2026-08-12 -- free mode -- Scope: R3 valuation-correctness changed modules

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code (static read-only pass, no commands beyond the R3 verify gate already run)
**Mode:** FREE -- static analysis of the 7 files touched/added by R3 (auction-advisor.ts, recommendation.ts, tags.ts, value-range.ts, and their test files).

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 0 |

### Findings

None. The three source changes are correct across all edge cases:
- `valueCeiling = Infinity` on the legacy (no-calibrated) path keeps prior test coverage unaffected.
- `Math.max(1, Math.round(calibrated.ceiling))` safely handles 0 and negative ceiling values (both resolve to 1, the minimum bid).
- `NaN` ceiling input is excluded by the `Number.isFinite()` guard, which falls through to `Infinity` (no ceiling cap), consistent with the intent.
- TAX label `-$${Math.abs(gap)} TAX` correctly handles all negative gap magnitudes.
- `range.base` (midpoint) for the ELITE anchor line is the same value the live auction-advisor computes for NEUTRAL inflation -- the two surfaces now agree.

### RV-18 resolution (tag-detector.ts)

`src/lib/intel/tag-detector.ts` does not exist and has no references anywhere in `src/`. The file was either deleted in a prior session or was never created at the file level (the original RV-18 finding may have noted the plan to build it, not a live file). Either way: nothing to wire, nothing to delete at that path. **RV-18 is resolved.**

Residual stale code: `src/components/draft/ffi-player-card.tsx` defines `BadgeType` entries `'breakout'` and `'bust'` and their associated `BADGE_CONFIG` styling, which reference the now-defunct detector. These badge types appear dead (no code path ever instantiates them with real detector data since the detector doesn't exist), but `ffi-player-card.tsx` is the live-draft-room card -- touching it carries R11-scope risk. **Deferred to R11/R13** for cleanup alongside the full live-room pass. Not a production correctness issue (dead code paths don't execute).

### Notes

- The updated HOT describe block test `when room exceeds ceiling, both HOT and NEUTRAL are capped at genuine worth` correctly reflects the post-RV-4 behavior. When `room > ceiling`, the `valueCeiling` clamp dominates and both HOT and NEUTRAL land at the ceiling. HOT and NEUTRAL still produce different initial anchors (and would differ if decreasing factors such as "position filled" are subsequently applied), but the simpler test case (no factor boosts/decreases) now shows them equal -- which is the correct behavior.
- Type-check, full test suite (227/227), lint (161 = baseline, 0 new), and production build all green on the R3 changed modules.

---

## Review: 2026-08-12 — full screen-by-screen audit vs. code (feedback-driven, read-only)

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code (5 parallel Explore agents + targeted grep, every finding confirmed against source)
**Mode:** read-only investigation — NO code changed this session. Findings feed the rebuild plan (`BUILD_PLAN.md` R1–R15). Fixes are scheduled, not applied here.
**Trigger:** Joe's screen-by-screen feedback ("what we have right now is FUCKING TRASH"). The prior plan marked S1–S5 "done"; this audit tested that claim against the code and it did not hold.

### Summary

| Severity | Count | IDs |
|----------|-------|-----|
| CRITICAL | 2 | RV-1 (no team-construction), RV-2 (dead model 404) |
| HIGH | 5 | RV-3, RV-4, RV-5, RV-6, RV-7 |
| MEDIUM | 9 | RV-8..RV-17 (excl. counted) |
| LOW | 2 | RV-18, RV-19 |

Full register with locations + assigned session lives in `BUILD_PLAN.md` → "Confirmed bug / gap register." Highlights:

#### CRITICAL

- **RV-1 — No team-construction engine.** Max-bid multiplier stacking is capped by the wallet (`absoluteMax`), not by roster-completion. The app cannot build the best full roster for $200 — its entire purpose. `src/lib/draft/auction-advisor.ts:98,127,147`. → R4/R5.
- **RV-2 — Dead Claude model id.** `src/lib/ai/claude.ts:28-29`: `default`/`best` = `claude-sonnet-4-20250514` (retired 404). Strategy/research AI paths 500. Tests mock the client, so the green suite never caught it. → R1.

#### HIGH

- **RV-3** — rule-based fallback key-gated, not error-gated → 500 on AI failure instead of $0 fallback. `strategies/propose/route.ts:158-160`. → R1.
- **RV-4** — max-bid can exceed the player's ceiling (overpay past worth). `auction-advisor.ts:98,127,147`. → R3.
- **RV-5** — "Anchor — pay up to $97" shows the theoretical ceiling as a pay-to price. `players/recommendation.ts:43`. → R3.
- **RV-6** — ADP still drives the Cheat Sheet (sort pill + Movers strip) despite FB-8 marked done. `prep/board/client.tsx:35,447-511`. → R1.
- **RV-7** — board "ECR" is `Math.round(avgAdp)` (ADP mislabeled); real `ecrPositionRank` unused. `convert.ts:96` (real at `:61-64/111`). → R2.

#### MEDIUM

- **RV-8** fake ±15% value range (`draft-board-table.tsx:78`) → R2 · **RV-9** no FLEX list → R8 · **RV-10** Cheat Sheet duplicates Players → R8 · **RV-11** deterministic toy sim, ADP opponents, not persisted (`prep/simulate/client.tsx:92-229`) → R10 · **RV-12** nav active-state mis-highlight (`app-shell.tsx:37-52`) → R1 · **RV-13** dead light/dark toggle, no `.light` tokens (`globals.css`) → R1 · **RV-14** tier data feeds only the ELITE flag (`tags.ts:72`) → R2 · **RV-15** graded tag scale exists in types but UI is binary (`research/strategy/types.ts:151-166`) → R7 · **RV-16** `/draft/live` can `return null`; `myManager` throw risk (`draft/live/client.tsx:462,466`) → R1 · **RV-17** name-anchored tag persistence (`user_tags`) → R7.

#### LOW

- **RV-18** breakout/bust/value detector wired to nothing (`lib/intel/tag-detector.ts`) → R3.
- **RV-19** "Demo Draft" routes to `/draft/live?sim=1` → hits the RV-16 dead screen (collateral; useful once RV-16 fixed). `settings/page.tsx:116,147` → R1.

### Cleared (NOT bugs — misreads corrected during the audit)

- Mobile nav **exists** (earlier "no mobile nav" was the desktop sidebar / the intentionally nav-less live screen).
- Persistence + reconnect **work**; the real gap is a local offline cache for a mid-draft drop (→ R11).
- "Demo Draft" is a legitimate dev-only sim launcher (`NODE_ENV` guarded), not fake data.

### Note on prior "done" claims

The prior 205-test suite is real and green — but it tests the code that exists, and the core (team construction) does not exist, so the number never measured the thing that matters. The suite also mocks the Claude client, so RV-2 (dead model) was invisible to it. **A green suite is not a working app.** R13 adds coverage on the new engines (solver, team-aware max-bid, strategy prices, Monte-Carlo sim).

---

## Hunt: 2026-08-12 — free mode — Scope: VAL-1/2/3 changed modules

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code
**Mode:** free (static analysis only, no test execution beyond the standing gate)

### Scope (changed this session — S2 valuation engine)

- `src/lib/draft/tendencies.ts` (new — exploit engine)
- `src/lib/draft/league-calibration.ts` (added `toCalibratedPositionSafe`)
- `src/lib/draft/auction-advisor.ts` (calibrated max-bid anchor, VAL-3)
- `src/lib/players/convert.ts` (VAL-1.2 ceiling/room/gap fields)
- `src/lib/players/types.ts` (VAL-1 Player fields)
- `src/components/prep/draft-board-table.tsx` (VAL-1.3 board display)
- `src/app/(app)/draft/live/client.tsx` (VAL-3 caller wiring)
- `scripts/derive-league-calibration.ts` (rewritten — artifact writer)
- `src/lib/draft/__tests__/tendencies.test.ts` (new — 20 tests)

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 1 (fixed in-session) |

| Category | Count |
|----------|-------|
| Data Quality | 1 |

### Findings

#### LOW

##### BUG-001: `valueGap` painted a false "over/hot" chip on $0-worth ranked rows
- **File:** `src/lib/players/convert.ts:82`
- **Category:** Data Quality
- **Effort:** S
- **Description:** `ceilingValue` is never nullish (falls back to `Math.round(avgAuction)`, i.e. `0` for a legacy row with no VORP and no auction values). The gap guard `ceilingValue !== undefined` was therefore always true, so a ranked-but-unpriced player (`ecrPositionRank` present → `expectedRoom` defined, ceiling `0`) computed `valueGap = 0 - room` (negative) and rendered a misleading "$-X hot" exploit chip on a $0 player.
- **Evidence:** `const ceilingValue = vorpValue !== undefined ? vorpValue : Math.round(avgAuction)` → `0` when no auction data; guard `ceilingValue !== undefined` never excludes `0`.
- **Fix (applied):** Changed the guard to `ceilingValue > 0` so only a real, positive worth yields a gap. Unpriced rows now get `valueGap = undefined` → no chip (self-consistent with the board's `gap == null` guard).
- **Impact:** Visible-quality bug on the draft board (a false exploit signal). Low likelihood in current data (the VORP run prices all ECR-ranked players) but a real correctness gap.

### Notes

- Type-check, full test suite (116/116), lint (0 new errors), and production build all green on the changed modules.
- `auction-advisor.ts` calibrated anchor correctly does NOT re-multiply inflation into the room price (inflation is already baked into the curve) — verified: `inflationTag` is used only as a directional min/×1.08 tilt.
- `tendencies.ts` run detection uses `slice(-lookback)` (window-bounded, not whole-history) — covered by a dedicated regression test.
- Backward compatibility: `calculateMaxBidAdvice`'s new `calibrated` param is optional; the legacy `consensusValue * 1.3` anchor still fires for callers/tests that don't pass it.

---

## Hunt: 2026-08-12 -- free mode -- Scope: S4 (FB-16/FB-17) changed modules

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code
**Mode:** free (static analysis only)

### Scope (changed this session -- S4 strategies)

- `src/lib/research/strategy/research.ts` (proposeStrategiesRuleBased + prompt/proposalToInsert changes)
- `src/app/api/strategies/propose/route.ts` (AI/rule-based dispatch, targetNames/avoidNames wiring)
- `src/components/prep/strategy-proposals.tsx` (Calibrated/AI badge, useCallback deps fix, loading text)
- `src/app/(app)/prep/strategies/client.tsx` (passes targetNames/avoidNames to StrategyProposals)
- `src/lib/research/strategy/__tests__/research-ruleBased.test.ts` (new -- 9 tests, FB-17 proof)

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 2 (both fixed in-session) |

| Category | Count |
|----------|-------|
| Correctness | 1 |
| UX | 1 |

### Findings

#### LOW

##### BUG-002: `proposeStrategiesRuleBased` generated auction proposals for any format, including snake
- **File:** `src/lib/research/strategy/research.ts` (proposeStrategiesRuleBased function body)
- **Category:** Correctness
- **Effort:** XS
- **Description:** The function uses `AUCTION_PRESETS` and `CALIBRATED_ARCHETYPES` unconditionally. If called with a snake-format league and no ANTHROPIC_API_KEY, the route dispatches to the rule-based path and returns proposals with `budget_allocation` fields instead of `round_targets` -- wrong data shape for a snake league.
- **Fix (applied):** Added format guard: if `league.format !== 'auction'` return `{ proposals: [], inserts: [] }`. Zero production risk (Nasties = auction only), but the code now has correct semantics.

##### BUG-003: Loading state text misleading for the rule-based path
- **File:** `src/components/prep/strategy-proposals.tsx` (loading state JSX)
- **Category:** UX
- **Effort:** XS
- **Description:** Loading text read "Claude is analyzing... This usually takes 10-20 seconds." The rule-based path involves no Claude and resolves near-instantly. Component cannot know which path runs before the response returns.
- **Fix (applied):** Changed to "Generating strategies from your player pool..." -- accurate for both paths.

### Notes

- `useCallback` with array props (`targetNames`, `avoidNames`) recreates `generate` on every parent render. Performance annoyance only -- `generate` is called on user interaction (button click), never from a `useEffect`, so no infinite-loop risk.
- No runtime validation on `targetNames`/`avoidNames` in the route body. Internal-only endpoint; the app's own UI always sends proper arrays. Acceptable risk.
- Type-check, full test suite (162/162), lint (0 new errors), and production build all green on the changed modules.

---

## Hunt: 2026-08-12 -- full mode -- Scope: whole project (S5 dedicated bug hunt)

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code
**Mode:** full (type-check + test:run + lint + build + static analysis)

### Scope

All S1-S4 code paths and supporting infrastructure:

- `src/lib/players/value-range.ts` (VORP/room band logic)
- `src/lib/players/tags.ts` (tag generation, POCKET/TAX/VOLATILE/SLEEPER criteria)
- `src/lib/players/recommendation.ts` (Anchor/Target/Pass/Flier/Fair)
- `src/lib/players/headshot.ts` (normalizeName edge cases, silhouette fallback)
- `src/lib/draft/auction-advisor.ts` (calibrated max-bid anchor VAL-3)
- `src/app/api/strategies/propose/route.ts` (config->12-teams mapper path)
- All existing `src/**/__tests__/*.test.ts`

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 1 (testability gap -- fixed by extraction) |

| Category | Count |
|----------|-------|
| Testability | 1 |

### Findings

#### LOW

##### BUG-004: `dbLeagueToAppLeague` untestable -- private function inside a server route
- **File:** `src/app/api/strategies/propose/route.ts` (function body, not exported)
- **Category:** Testability
- **Effort:** S
- **Description:** The 12-team/auction/budget→League mapper lived entirely inside route.ts, which imports Supabase server clients and Next.js server-only code. Writing a unit test for it would require mocking the entire Next.js server environment. The function itself is pure (no side effects) and carries the critical `team_count->size`, `roster_slots.dst->rosterSlots.def`, and `budget: null->undefined` conversions that were never regression-tested.
- **Fix (applied):** Extracted to `src/lib/research/strategy/league-mapper.ts` (pure function, only type imports). `route.ts` updated to `import { dbLeagueToAppLeague } from '@/lib/research/strategy/league-mapper'`. Net lint improvement: 1 unused-import warning eliminated from route.ts (161 vs 162 baseline).
- **Impact:** The 12-team/auction config flow was in production without automated verification. A silent regression in the DB→app mapping (e.g., a schema column rename) would have been invisible to the test suite.

### Coverage expanded (Part B -- new tests)

**New test files:**
- `src/lib/research/strategy/__tests__/league-mapper.test.ts` -- 11 tests: Nasties 12-team fixture, team_count->size, format auction, budget 200, budget null->undefined, roster_slots.dst->rosterSlots.def (double-negative asserts .dst is absent), superflex hardcoded 0, half_ppr->half-ppr conversion, keeper guard.
- `src/lib/draft/__tests__/auction-advisor.test.ts` -- 16 tests: calibrated NEUTRAL (ceiling/room midpoint, factor label+detail), COOL (8% premium, COOL > NEUTRAL, COOL <= ceiling), HOT-TAX (cap at worth, HOT < NEUTRAL, HOT == NEUTRAL in a pocket), absoluteMax (tight budget, minimum $1), legacy fallback (consensusValue*1.3), missing manager guard.

**Extended test files:**
- `src/lib/players/__tests__/value-range.test.ts` -- +2 tests: BUG-001 regression (ceilingValue=0 + room=30 must NOT produce 'league'), ceilingValue=0 with national fallback.
- `src/lib/players/__tests__/tags.test.ts` -- +9 tests: VOLATILE boundaries (rank=120 inclusive, rank=121 out, std=19 below), SLEEPER boundaries (vorp=0 does not fire, rank=84 does not fire, rank=85+vorp=1 fires), multiple tags (ELITE+POCKET, INJURY+SLEEPER, plain player no tags).
- `src/lib/players/__tests__/headshot.test.ts` -- +8 tests: normalizeName III/IV/Sr. suffixes, apostrophe, whitespace-only, idempotency; headshotUrl unknown player returns null; null ?? SILHOUETTE_SRC pattern.

**Test count:** 162 (baseline) -> **205/205** (+43 new)

### Gate results

| Check | Result |
|-------|--------|
| `npm run type-check` | CLEAN (0 errors) |
| `npm run test:run` | **205/205 passed** |
| `npm run lint` | 161 problems (51 errors, 110 warnings) -- 1 FEWER than 162 baseline; 0 new |
| `npm run build` | CLEAN |

## Hunt: 2026-08-12 -- free mode -- Scope: R1 trust-triage changed modules

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code (static read-only pass, no commands beyond the R1 verify gate already run)
**Mode:** FREE -- static analysis of the 7 files touched by R1 (dead model id, error-gated AI fallback, ADP removal, nav active-state, dead theme toggle, `/draft/live` null-render fix) plus the 3 new test files.

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 0 |

| Category | Count |
|----------|-------|
| UX | 1 |

### Findings

#### MEDIUM

##### BUG-005: Error-gated AI fallback silently returns 0 proposals for a snake-format league
- **File:** `src/app/api/strategies/propose/route.ts:162-172` calling `src/lib/research/strategy/research.ts:404-407`
- **Category:** UX / Silent failure
- **Effort:** S
- **Description:** `proposeStrategiesRuleBased` has always been calibrated for auction only -- `if (league.format !== 'auction') return { proposals: [], inserts: [] }` (`research.ts:405-406`). Before RV-3, this path only fired when `ANTHROPIC_API_KEY` was absent. RV-3 widened the fallback to fire on ANY AI failure (dead model, timeout, rate limit) for a key-present league too. A snake-format league now silently gets `{ proposals: [], source: 'rule-based', proposalCount: 0 }` on an AI hiccup, with no signal to the caller about *why* it's empty (as opposed to "AI just found nothing").
- **Evidence:** `research.ts:404-407` (`// Only calibrated for auction format; snake proposals require the AI path`).
- **Fix:** Not applied -- out of R1's declared scope (R1 is trust triage on auction-only surfaces per CLAUDE.md Key Design Decision #1: "Auction only -- Nasties 12-team ... No snake"). If snake ever comes back in scope, either extend `proposeStrategiesRuleBased` to snake or have the route return a distinct `source: 'unavailable'` with a reason string instead of an empty `'rule-based'` result.
- **Impact:** None today -- the only live league (The Nasties) is auction format, so this path is currently unreachable in practice. Flagged so it isn't rediscovered as a mystery "empty proposals" report if snake support is ever added.

### Recommended Fix Order

1. No action required for R1. BUG-005 queued as a note for whenever snake-format support (if ever) re-enters scope -- not blocking.

### Notes

- No CRITICAL or HIGH findings in the R1 diff itself -- the six fixes (RV-2, RV-3, RV-6, RV-12, RV-13, RV-16, RV-19) each match their BUILD_PLAN.md "Done when" criteria with no new unused imports, no new lint errors, and full type-check/build/test coverage (see R1 verify table in this session's CHANGELOG entry).
- `getActiveHref` in `app-shell.tsx` was un-exported before this session; exporting it for testability is a net positive and matches the same pattern used for `dbLeagueToAppLeague` in BUG-004 above.
- `draft/live/client.tsx` still carries several pre-existing unused-import warnings (`motion`, `AnimatePresence`, `Radio`, `ChevronLeft`, `Clock`, `Gavel`, `Check`, `FFIBadge`, `PositionRunTicker`, `LiveScoreBug`, `PickFeed`, `MySquadPanel`, plus `saving`, `isAuction`, `myNeeds`) -- all pre-existing, none introduced this session, not in R1's declared scope.

---

## Hunt: 2026-08-12 -- free mode -- Scope: R4 team-construction solver (new modules)

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code (static read-only pass, no commands beyond the R4 verify gate already run)
**Mode:** FREE -- static analysis of the 2 files created by R4: `src/lib/draft/roster-solver.ts` (320 lines) and `src/lib/draft/__tests__/roster-solver.test.ts` (504 lines). No downstream consumers exist yet (R5 wires it into the live bid advisor).

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 3 |

| Category | Count |
|----------|-------|
| Logic / Edge case | 1 |
| Data Quality | 1 |
| Test Coverage | 2 |

### Findings

#### MEDIUM

##### BUG-007: `resolvePlayerSlot` silent slot-no-op when bench=0 and player has no valid slot
- **File:** `src/lib/draft/roster-solver.ts:242`
- **Category:** Logic / Edge case
- **Effort:** S
- **Description:** When a nominated player has no dedicated slot, no FLEX slot, and `bench = 0`, the bench-fallback line `Math.max(0, (slots.bench ?? 0) - 1)` clamps to 0 — identical to the input. The function returns the input slots unchanged, meaning the nominated player's slot is silently discarded. `computeRosterConstrainedMaxBid` then runs `solveAllocation` with unmodified `slotsRemaining`, computes `completionCost` as if the player was never assigned, and returns `maxBid = budgetRemaining - completionCost` with `feasible = true`. If the slot genuinely doesn't exist, the max-bid is artificially high.
- **Evidence:** The infeasible test at `roster-solver.test.ts:380-393` exercises exactly this path (WR nominated, bench=0, no wr/flex slots) — but the budget ($20) is small enough that `rawMaxBid = 20 - 60 = -40` forces `feasible: false` anyway. No test exercises the slot-leak with sufficient budget to expose the wrong `maxBid`.
  ```typescript
  // roster-solver.ts:242
  return { ...slots, bench: Math.max(0, (slots.bench ?? 0) - 1) }
  // When bench=0: Math.max(0, -1) = 0 → same as input → slot not consumed
  ```
- **Fix:** Before the bench clamp, check if `slots.bench <= 0` and return an out-of-slots sentinel (e.g., keep slots unchanged AND surface it). Caller `computeRosterConstrainedMaxBid` should detect the no-slot case and return `{ maxBid: 1, feasible: false, explanation: 'No slot available for [position]' }`. R5 will wire this into the UI, so fix before or alongside R5.
- **Impact:** R4 is a library — no UI yet. When R5 wires `computeRosterConstrainedMaxBid` into the live bid display, a player nominated after the roster is full (or with no slot of the right type) would show an inflated max-bid instead of "no slot available." Low probability in real usage (UI should prevent nominating when slots full), but a correctness gap.

#### LOW

##### BUG-008: `solveAllocation` feasibility flag uses pre-rounded `completionCost`
- **File:** `src/lib/draft/roster-solver.ts:215`
- **Category:** Data Quality
- **Effort:** S
- **Description:** `feasible: completionCost <= budgetRemaining` fires on the raw accumulated float; the returned `completionCost` is `Math.round(completionCost)`. If `expectedCost` values ever have decimals (e.g., 42.5), the feasibility signal and the returned cost can differ by up to $0.49. Example: raw cost 99.6 with budget 100 → `feasible: true`, returned `completionCost: 100` → caller computes `rawMaxBid = 100 - 100 = 0`, `maxBid = 1`, `feasible: false` — the two feasibility signals disagree. In practice, all auction bids are whole dollars, so `expectedCost` values are integers and this is purely theoretical.
- **Evidence:** `roster-solver.ts:214-218` — feasibility check before rounding.
- **Fix:** Move the feasibility check to after rounding: `const roundedCost = Math.round(completionCost); return { feasible: roundedCost <= budgetRemaining, completionCost: roundedCost, ... }`.
- **Impact:** None in current app (integer-dollar inputs). Defensive fix before non-integer inputs could reach the solver.

##### BUG-009: `explanation` field is zero-tested across all 47 test cases
- **File:** `src/lib/draft/__tests__/roster-solver.test.ts` (coverage gap)
- **Category:** Test Coverage
- **Effort:** S
- **Description:** Every `computeRosterConstrainedMaxBid` call checks `maxBid`, `feasible`, and `completionCost`, but no test ever asserts `result.explanation`. The `buildExplanation` function (26 lines) — including the "Roster complete" short-circuit path and the "Need X + Y (~$N) → max $M" assembly — is unverified. When R5 displays `explanation` in the live bid UI, a regression in the string format (wrong slot labels, missing prefix, off-by-one in cost display) would be invisible to the test suite.
- **Fix:** Add 2-3 targeted assertions in an existing describe block, e.g.: (1) `explanation` contains the slot labels when slots remain; (2) `explanation` is `"Roster complete - max $N"` when `assignments.length === 0`; (3) cost estimate in explanation matches `completionCost`.
- **Impact:** Test gap only — no production impact until R5. Flag for R5 or R13 (full test pass).

##### BUG-010: Incorrect comment on `te2` in FLEX contention test
- **File:** `src/lib/draft/__tests__/roster-solver.test.ts:485`
- **Category:** Test Coverage / Clarity
- **Effort:** XS
- **Description:** The board fixture comment reads `p('te2', 'TE', 25, 20), // next TE → FLEX` — but te2 does NOT go to FLEX. rb1 (ceiling=30) outbids te2 (ceiling=25) for the one FLEX slot. The test assertion is correct (`expect(flexAssignment?.player?.id).toBe('rb1')`), but the comment tells a future reader the opposite. A reader expecting te2 to be in FLEX would be confused by the assertion.
- **Fix:** Change comment to `// next TE → loses FLEX to rb1 (ceiling 30 > 25)`.
- **Impact:** Cosmetic only. No test correctness impact.

### Recommended Fix Order

1. **BUG-007** (before R5) — slot-no-op when bench=0. Correctness gap that will surface in the live UI the moment R5 wires `computeRosterConstrainedMaxBid` in.
2. **BUG-008** (R13 or alongside BUG-007) — rounding order in `solveAllocation`. One-line defensive fix.
3. **BUG-009** (R5 or R13) — add `explanation` assertions. Without them, the explanation field is untested dead code from the suite's perspective.
4. **BUG-010** (next touch of the test file) — fix the te2 comment. XS cosmetic.

### Notes

- No CRITICAL or HIGH findings in the R4 deliverable. The core greedy algorithm (dedicated → FLEX → bench, scarcity order, ceiling-DESC selection, FLEX pool post-Phase-1) is correct across all 47 test cases.
- FLEX eligibility guard (QB/DEF excluded, `FLEX_ELIGIBLE = Set(['RB','WR','TE'])`) is correctly enforced and tested.
- `dst` / `DEF` naming convention (DB schema uses `dst`, position enum uses `DEF`) is correctly mapped in both directions via `POSITION_TO_DEDICATED` and `DEDICATED_TO_POSITION`.
- The module has zero downstream consumers yet — R5 wires it. BUG-007 is the only fix that must land before or with R5.
- Gate: type-check 0 errors, 274/274 tests green (47 new), lint 0 new errors vs 161-warning baseline, build clean.

---

## Hunt: 2026-08-12 -- free mode -- Scope: R2 data-truth changed modules

**Project:** fantasy_football_draft_app
**Type:** TypeScript / Next.js (App Router) + Vitest
**Auditor:** Claude Code (static read-only pass, no commands beyond the R2 verify gate already run)
**Mode:** FREE -- static analysis of the 2 files changed in R2 (draft-board-table.tsx + new convert.test.ts).

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 (pre-existing, not introduced by R2) |
| LOW | 0 |

### Findings

#### MEDIUM

##### BUG-006: Duplicate React key `'ECR'` in stats grid for snake-format sessions
- **File:** `src/components/prep/draft-board-table.tsx:436`
- **Category:** UX / React correctness
- **Effort:** S
- **Description:** The 4-stat grid uses `key={k}` where `k` is the stat label. For auction format the labels are `ECR / PTS / RANGE / BYE` — all unique. For snake format the third label becomes `'ECR'` (`k: isAuction ? 'RANGE' : 'ECR'`), giving two cells with `key='ECR'`. React will silently pick one during reconciliation, producing undefined behavior on re-renders. Pre-existed R2 (the original code had the same key collision, both cells showed `consensusRank`). This session did not introduce the collision.
- **Evidence:** `k: isAuction ? 'RANGE' : 'ECR'` at line 426; `key={k}` at line 436. For snake format: cell 1 `k='ECR'`, cell 3 `k='ECR'`.
- **Fix:** Change cell 1 label to `'POS'` (positional rank) and keep cell 3 as `'ECR'` (overall), or assign index-based keys; scheduled naturally in R8 (Cheat Sheet redesign removes this screen's snake-format path). No action in R2 — Nasties is auction-only, so the duplicate key is unreachable in production today.
- **Impact:** None in production (Nasties = auction only). Theoretical React reconciliation issue if snake format is ever activated.

### Recommended Fix Order

1. No action required for R2. BUG-006 is pre-existing, unreachable in production (auction-only league), and scheduled for natural resolution in R8.

### Notes

- No bugs introduced by the R2 changes themselves. The three fixes (ECR stat cell, RANGE stat cell, tier badge) are all correct: no leftover `valueRange` references, no stale imports, no missing null checks.
- `computeValueRange` is called only when `isAuction === true` (guarded by `calibratedRange = isAuction ? computeValueRange(p) : undefined`) — no unnecessary computation for snake format.
- All 7 new convert.test.ts assertions target real source-field → Player-field mappings at the data layer (not UI layer) and pass the full gate (223/223 green, 0 new lint errors, type-check clean, build clean).

---

## Hunt: 2026-08-13 — free mode — Scope: R6 changed modules

**Project:** fantasy_football_draft_app (TypeScript / Next.js, Vitest, ESLint + tsc)
**Auditor:** Claude Code
**Files:** `src/lib/research/strategy/target-pricing.ts` (new), `research.ts`, `index.ts`, `src/components/prep/strategy-proposal-card.tsx`

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 0 |
| LOW | 1 |

### Findings

#### LOW

##### BUG-R6-01: Price-badge lookup keys by raw target name, price map keys by canonical name
- **File:** `src/components/prep/strategy-proposal-card.tsx:33,94`
- **Category:** Data Quality (display)
- **Effort:** S
- **Description:** `priceOf` is built from `pricing.prices` whose `.name` is the pool's canonical `player.name`; the badge then looks it up with the raw `key_targets` string (`priceOf.get(name)`). If a `key_target` differs in casing/whitespace from the pool's canonical name, the `$price` badge silently renders without its dollar amount.
- **Why it is only LOW:** `assignTargetPrices` resolves targets case-insensitively, so the price IS computed and the summary box total (`targetTotal`/`reserve`/`total`) stays correct — only the per-badge `$` can drop. In practice `key_targets` are populated from the same pool, so casing matches. No incorrect number is ever shown; at worst a badge omits its price.
- **Fix (when next touching this file):** key `priceOf` by `name.toLowerCase()` and look up with `priceOf.get(name.toLowerCase())`, mirroring the solver's own case-insensitive resolution.
- **Impact if unfixed:** cosmetic — an occasional target badge shows the name with no `$` even though the target was priced.

### Notes

- Core invariant (`sum(target prices) + reserve <= budget`, reserve = one `$1` per non-target slot) is enforced structurally: empty-board `solveAllocation` returns exactly the remaining-slot count, and a `while`-loop hard-trims `$1` from the largest price until the pool fits. Proven by 11 new tests in `target-pricing.test.ts` (sum invariant, stud-only invariant, archetype re-allocation, resolution rules) — all green in the 311/311 suite.
- Null-safety verified: `League.rosterSlots` is a required field (`players/types.ts:112`), already dereferenced unconditionally elsewhere in `research.ts`; `budget?` is optional and defaulted (`?? 200`); `positionEmphasis` tolerates undefined/null `budgetAllocation` via optional chaining + `??`.
- Division in the scale-down step is guarded by `sumDesired > 0`; the `$1`-floor `while`-loop breaks rather than looping forever when a strategy genuinely over-reaches (`fits` then reports false).

---

## Hunt: 2026-08-13 — free mode — Scope: R7b changed modules

**Project:** fantasy_football_draft_app (TypeScript / Next.js, Vitest, ESLint + tsc)
**Auditor:** Claude Code (static read-only pass; type-check/test/lint/build already run green in the R7b VERIFY gate)
**Mode:** FREE — static analysis of 3 files changed/created by R7b: `client.tsx` (player browser, expanded filters + fitLineMap), `ffi-player-intel-card.tsx` (fitLine prop + strip), `prep-fit-line.ts` (new pure module).

### Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MEDIUM | 1 |
| LOW | 2 |

| Category | Count |
|----------|-------|
| Performance | 1 |
| Logic / Edge case | 1 |
| UX | 1 |

### Findings

#### MEDIUM

##### BUG-R7b-01: `fitLineMap` mixes solver (expensive) with label-selection (cheap) in one useMemo — tag toggle re-runs all 500 solver calls unnecessarily

- **File:** `src/app/(app)/prep/players/client.tsx:242-269`
- **Category:** Performance
- **Effort:** S (split into two useMemos)
- **Description:** The `fitLineMap` useMemo builds `boardPlayers`, runs `computeRosterConstrainedMaxBid` for every player, and calls `buildPrepFitLine` (which selects the "Your target" / "Flagged to avoid" / generic prefix) — all in a single memo with deps `[players, isTarget, isAvoid]`. The solver computation depends only on `players`; the label prefix depends only on `isTarget`/`isAvoid`. Because `isTarget` and `isAvoid` are `useCallback` functions that chain through `hasTag(useCallback([userTagsMap]))`, they receive new function references any time `userTagsMap` state is replaced — which happens on every tag fetch (initial load AND after every toggle+refetch). Result: toggling one player's target tag triggers all 500 solver runs to re-execute just to change ONE player's prefix from "Can bid up to" to "Your target".
- **Evidence:** `use-user-tags.ts:138-160` — `hasTag` is `useCallback([userTagsMap])`; `isTarget`/`isAvoid` are `useCallback([hasTag])`. Any tag mutation calls `refetchTags()` → `setUserTagsMap(...)` → new `userTagsMap` reference → new `hasTag` ref → new `isTarget`/`isAvoid` refs → `fitLineMap` useMemo cache-miss → 500 `computeRosterConstrainedMaxBid` calls. Solver is fast (~3-5ms total at 500 players), so no user-visible freeze today, but wasted work that grows O(N) with the pool.
- **Fix:** Split into two useMemos:
  1. `solverResultMap: Map<string, RosterConstrainedMaxBid>` — deps `[players]` only. Runs the 500 solver calls. Never reruns on tag changes.
  2. `fitLineMap: Map<string, string>` — deps `[solverResultMap, isTarget, isAvoid]`. Iterates the solver result map and calls `buildPrepFitLine` for each. Cheap (~0ms) and reruns on tag changes correctly.
  Also memoize `boardPlayers` separately (deps: `[players]`) to avoid rebuilding the array twice.
- **Impact if unfixed:** Minor — solver is fast enough that Joe won't notice. But the pattern will degrade if the pool grows to 1000+ players, and the solver is the wrong thing to pay for a label change.

#### LOW

##### BUG-R7b-02: `buildPrepFitLine` infeasibility guard doesn't handle `!feasible && bestRestOfRoster.length > 0`

- **File:** `src/lib/players/prep-fit-line.ts:54`
- **Category:** Logic / Edge case
- **Effort:** XS (one comment or an explicit branch)
- **Description:** The function guards against the no-slot case (`!result.feasible && result.bestRestOfRoster.length === 0`) and returns `"No open slot for {position} on a full roster"`. The path `!result.feasible && result.bestRestOfRoster.length > 0` (slot exists but budget exhausted) is unguarded and falls through to the normal display branches. In that case `result.maxBid` could be $1 (from `Math.max(minPerSlot, rawMaxBid)`), producing "Can bid up to $1 on a full $200 board" — technically accurate but potentially confusing without context.
- **Evidence:** `computeRosterConstrainedMaxBid` (roster-solver.ts:369-374): when `rawMaxBid < minPerSlot`, `feasible = false` but `bestRestOfRoster = result.assignments` (non-empty). In prep mode with a fresh $200 board and 500 players, this is effectively unreachable (the rest-of-roster will always fit within budget). But the logic gap exists.
- **Fix:** Add a comment or explicit branch: `if (!result.feasible && result.bestRestOfRoster.length > 0) { return \`Budget too tight — max $${result.maxBid} on a full board\` }` to make the semantics explicit and avoid the confusing generic output.
- **Impact if unfixed:** None in practice (full $200 board never exhausted at prep time). The existing test suite already verifies the no-slot path; this path is untested because it's unreachable with normal inputs.

##### BUG-R7b-03: Pagination reset useEffect missing `isTarget`/`isAvoid`/`userTagsMap` from deps

- **File:** `src/app/(app)/prep/players/client.tsx:223-225`
- **Category:** UX
- **Effort:** XS
- **Description:** The pagination reset `useEffect` (which sets `displayCount` back to 50 on any filter change) lists 7 deps: `[positionFilter, searchQuery, tagFilter, tierFilter, byeFilter, gradeFilter, severityFilter]`. The `filteredPlayers` useMemo has 3 additional deps: `isTarget`, `isAvoid`, `userTagsMap`. When `tagFilter='target'` and Joe toggles a player's target tag, `filteredPlayers` updates (the toggled player appears or disappears from the filtered list), but `displayCount` doesn't reset to 50. If Joe was viewing 100+ players via Load More, the load-more count and remaining-count badge may be stale until the next user filter interaction.
- **Evidence:** `client.tsx:220` — filteredPlayers deps include `isTarget, isAvoid, userTagsMap`; `client.tsx:224-225` — reset effect deps do not.
- **Fix:** Add `isTarget, isAvoid, userTagsMap` to the pagination reset effect deps. Alternatively (cleaner): derive `displayCount` reset from `filteredPlayers.length` change via a separate useMemo comparison, not from listing individual filter deps.
- **Impact if unfixed:** Minor UX — if Joe toggles a target while on the 'target' filter with Load More active (showing 100+), the newly-added player appears in the correct sorted position but displayCount may show an inflated "remaining" count in the Load More button. No data corruption.

### Recommended Fix Order

1. **BUG-R7b-01** (R8 or next `client.tsx` touch) — split fitLineMap into solver-map + label-map. S effort, clean architectural win.
2. **BUG-R7b-03** (R8 or next `client.tsx` touch) — add missing deps to pagination reset. XS.
3. **BUG-R7b-02** (next `prep-fit-line.ts` touch) — add explicit comment or branch for the `!feasible && bestRestOfRoster.length > 0` path. XS, unreachable today.

### Notes

- **DEF/DST mapping verified correct.** `POSITION_TO_DEDICATED` (roster-solver.ts:104-110) maps `DEF → 'dst'`. `Player.position` for defenses is `'DEF'`; `BoardPlayer['position']` is `'QB' | 'RB' | 'WR' | 'TE' | 'DEF'` — same values after filtering K. The `as BoardPlayer['position']` cast at `client.tsx:250` is safe.
- **No unused imports.** All imports in all three files are used.
- **No `any` types.** Strict TypeScript throughout the three files.
- **No empty catch blocks.** The one catch block in `client.tsx:123` properly extracts and sets the error message.
- **fitLine strip render verified correct.** The `{fitLine && (...)}` conditional at `ffi-player-intel-card.tsx:304` correctly suppresses the strip when fitLine is undefined.
- **Gate results at time of hunt:** type-check 0 errors, 344/344 tests passing (322 baseline + 22 new), lint 161 (0 new), build clean.
