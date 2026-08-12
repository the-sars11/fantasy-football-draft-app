# Bug Hunt Log

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
