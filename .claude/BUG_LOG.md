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
