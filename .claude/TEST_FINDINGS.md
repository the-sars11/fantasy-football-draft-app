# TEST_FINDINGS.md — Live-Draft Adaptive Test Suite

Defect log + evidence trail for the live-draft adaptive-engine test suite (plan:
`tranquil-knuth`). Every checked behavior gets a row: a PASS row (proof it was
exercised) or a DEFECT row. Clear-cut defects are fixed in the same pass and the
row flips to `fixed` with the commit SHA. Ambiguous/large defects are logged
`open` for Joe to triage — assertions are never softened to make a test pass.

Columns: **ID | layer | feature | expected | actual | repro | severity | suspected file:line | status**

Baseline before this suite: 632 tests. After: 684 tests (+52). Command:
`npm run test:run` (run 2026-08-22, all green).

---

## Group A — Adaptive-engine unit tests (Vitest, pure functions)

| ID | layer | feature | expected | actual | repro | severity | suspected file:line | status |
|----|-------|---------|----------|--------|-------|----------|---------------------|--------|
| A1 | engine | detectStrategyDrift: 2 targets both gone → active | active===true, goneTargets deep-equals both, remainingTargets===[] | matches | `npm run test:run flow-monitor` | — | flow-monitor.ts:321 | PASS |
| A1 | engine | detectStrategyDrift: 1 of 2 still on board | active===false | matches | same | — | flow-monitor.ts:321 | PASS |
| A1 | engine | detectStrategyDrift: target drafted by ME excluded from gone | not in goneTargets, active===false | matches | same | — | flow-monitor.ts:312 | PASS |
| A1 | engine | detectStrategyDrift: empty targets | active===false | matches | same | — | flow-monitor.ts:321 | PASS |
| A2 | engine | detectPivotOpportunity: depleted pool + >60% targets gone → suggest Zero-RB | returns PivotSuggestion, .strategy.id==='zero-rb' | matches | `npm run test:run pivot-detector` | — | pivot-detector.ts:61 | PASS |
| A2 | engine | detectPivotOpportunity: healthy pools, few gone | null (score<15) | matches | same | — | pivot-detector.ts:61 | PASS |
| A2 | engine | detectPivotOpportunity: single strategy in list | null | matches | same | — | pivot-detector.ts | PASS |
| A3 | engine | detectPositionRuns: 3 RB in last 8 → run count>=3 | run {position:'RB', count>=3} | matches | `npm run test:run flow-monitor` | — | flow-monitor.ts | PASS |
| A3 | engine | detectValueAnomalies: >=2x room price → overpay; <=0.5x → bargain | tagged enums | matches | same | — | flow-monitor.ts | PASS |
| A3 | engine | analyzePoolQuality: drained position reflects reduced count | reduced remainingCount | matches | same | — | flow-monitor.ts | PASS |
| A4 | engine | analyzeBudgetStrategy pace boundaries | +16→ahead, -16→behind, ±10→on_track | matches | `npm run test:run auction-advisor` | — | auction-advisor.ts:234 | PASS |
| A4 | engine | getPositionUrgencyWarnings severity | 1 startable→critical, 2→warning, threshold:15 | matches | same | — | auction-advisor.ts:301 | PASS |

## Group B — Recompute-on-pick integration tests (Vitest, real state machine)

| ID | layer | feature | expected | actual | repro | severity | suspected file:line | status |
|----|-------|---------|----------|--------|-------|----------|---------------------|--------|
| B1 | engine | max-bid rises on scarcity as alternatives drain to <=2 | 72 → 86 (×1.2), factors include 'Scarcity' | matches | `npm run test:run recompute-on-pick` | — | auction-advisor.ts:153 | PASS |
| B1 | engine | max-bid clamps down when Joe budget shrinks | 86 → 8 (absoluteMax = 20-12) | matches | same | — | auction-advisor.ts | PASS |
| B2 | engine | drift+pivot inactive until last target leaves board | false through step 3, both true at step 4 | matches | same | — | flow-monitor.ts / pivot-detector.ts | PASS |
| B2 | engine | pivot names the alternative strategy | pivot.strategy.id==='zero-rb' | matches | same | — | pivot-detector.ts | PASS |
| B3 | hook | useDraftState: initial draftedNames.size===0, getBudget===200 | matches | matches | `npm run test:run use-draft-state` | — | use-draft-state.ts | PASS |
| B3 | hook | addManualPick → draftedNames adds lowercased name, budget -= price | 200→155→140 | matches | same | — | use-draft-state.ts | PASS |

## Group C — Backend / API route tests (Vitest, handler-level)

| ID | layer | feature | expected | actual | repro | severity | suspected file:line | status |
|----|-------|---------|----------|--------|-------|----------|---------------------|--------|
| C1 | api | auctioneer-feed: upstream ok wraps raw state | {state}, HTTP 200 | matches | `npm run test:run auctioneer-feed` | — | api/auctioneer-feed/route.ts | PASS |
| C1 | api | auctioneer-feed: 404/5xx → {state:null, error:"Auctioneer responded <n>"} | matches, HTTP 200 | matches | same | — | api/auctioneer-feed/route.ts | PASS |
| C1 | api | auctioneer-feed: empty/"null" → {state:null}; malformed → error /malformed/; abort → /timed out/ | matches, always 200 | matches | same | — | api/auctioneer-feed/route.ts | PASS |
| C1 | api | auctioneer-feed: ?code forwarded URL-encoded, trailing slash stripped | matches | matches | same | — | api/auctioneer-feed/route.ts | PASS |
| C2 | api | draft/sessions POST 400s (missing/blank/<2/dup names), 404 not-owned, 201 valid | matches | matches | `npm run test:run draft/sessions` | — | api/draft/sessions/route.ts | PASS |
| C2 | api | draft/sessions PATCH 404 not-owned, 200 echoes picks | matches | matches | same | — | api/draft/sessions/[id]/route.ts | PASS |
| C3 | api | players GET default limit===300, {players,count} | matches | matches | `npm run test:run players` | — | api/players/route.ts | PASS |
| C3 | api | players GET ?position=DEF → DB 'DST'; empty-adp filter present; null client→503 | matches | matches | same | — | api/players/route.ts | PASS |

## Group D — Claude-driven Chrome UI tests (live browser, `?sim=1`)

Run 2026-08-22 against the dev server on `http://localhost:3003/draft/live?sim=1`
via the in-app browser. Values read directly from the DOM by `data-testid`.

### D1 — baseline render + testid presence

Screen renders with no login (DEV_MODE bypass). SIM HUD present: `Start sim`,
`Reset sim`, speed toggles, all confirmed. Baseline testid values captured:

| testid | baseline value |
|--------|----------------|
| round-pick | R1 · PICK 1 |
| budget-remaining | $200 |
| budget-maxbid | $187 |
| roster-count | 0/14 |
| budget-pace | $200 left · 14 slots (avg $14.29) |
| pivot-line | "On plan. Balanced Auction still fits you" |
| progressbar aria-valuenow | 100 |

Conditional testids absent at baseline (correct — gated): `otb-max-bid` (no player
on block yet), `urgency-<POS>` (see F1), `drift-alert` / `pivot-suggestion` (engine
condition not met, inside closed "More tools").

| ID | layer | feature | expected | actual | repro | severity | suspected file:line | status |
|----|-------|---------|----------|--------|-------|----------|---------------------|--------|
| D1 | ui | baseline testids present + captured | all P1 testids render once with valid values | matches (table above) | nav `?sim=1`, read testids | — | live-room components | PASS |

### D2 — recompute-on-pick, observed in the DOM

Started the sim (fast), let picks land, paused, set a player on the block. Exact
before/after DOM reads, each direction is the un-fakable check:

| testid | before | after (picks landed) | direction | verdict |
|--------|--------|----------------------|-----------|---------|
| round-pick | R1 · PICK 1 | R3 · PICK 27 | advanced | PASS |
| budget-remaining | $200 | $199 → $198 → $197 | decreased as Rasar won | PASS |
| roster-count | 0/14 | 1/14 → 2/14 → 3/14 | +1 per Rasar win | PASS |
| progressbar aria-valuenow | 100 | 99 | decreased | PASS |
| budget-pace | $200 left · 14 slots | $197 left · fewer slots, avg recomputed | recomputed | PASS |
| otb-max-bid | (absent) | $1 (finite, ≥1, ≤ budget $198) | renders valid value | PASS |
| pivot-line | "On plan..." | "You are behind the WR run. Best remaining build is Balanced Auction: pay up for..." | adaptive recompute | PASS |

| ID | layer | feature | expected | actual | repro | severity | suspected file:line | status |
|----|-------|---------|----------|--------|-------|----------|---------------------|--------|
| D2 | ui | budget/roster/pace/round recompute in DOM as picks land | each moves in the correct direction | matches (table above) | Start sim, poll testids | — | client.tsx adaptive memos | PASS |
| D2 | ui | otb-max-bid renders finite $>=1 for on-block player | valid, not NaN/stale | $1 | Set player on block | — | on-the-block-card.tsx:306 | PASS |
| D2 | ui | pivot-line adapts to draft flow | copy changes from baseline | "behind the WR run" recommendation | let WR run develop | — | strategy-strip.tsx:74 | PASS |

### D3 — drift + pivot surface in the UI (cross-layer)

`drift-alert` and `pivot-suggestion` correctly return **null / absent** throughout
this sim run: Rasar's full target set was not drained (drift needs remainingTargets===0)
and no alternative strategy scored >=15 (pivot threshold). This is a verified TRUE
NEGATIVE — the gated cards do not false-fire. Positive render was not forced in this
bounded run (would require draining the demo strategy's full target list; the sim
cadence is ~2 picks/10s and the target list is not cheaply enumerable from the DOM).
The drift/pivot ENGINE behavior is proven exact by A1 (drift active/inactive), A2
(pivot suggestion + named strategy), and B2 (exact transition step). The UI render
path is proven present + correctly gated (grep + true-negative above), and the
always-on adaptive `pivot-line` was positively observed recomputing in the DOM (D2).

| ID | layer | feature | expected | actual | repro | severity | suspected file:line | status |
|----|-------|---------|----------|--------|-------|----------|---------------------|--------|
| D3 | ui | drift-alert / pivot-suggestion gated correctly (no false positive) | absent when engine condition false | absent | open "More tools" mid-draft | — | draft-flow-alerts.tsx:87 | PASS |
| D3 | ui | drift-alert positive render when all targets gone | card renders with "Strategy drift" | NOT FORCED this run | manual: record all Balanced-Auction targets to rivals | — | draft-flow-alerts.tsx:164 | MANUAL-REPRO |

---

## Defects found by the browser layer

| ID | layer | feature | expected | actual | repro | severity | suspected file:line | status |
|----|-------|---------|----------|--------|-------|----------|---------------------|--------|
| F1 | ui/data | position-urgency in `?sim=1` (and real draft) | tier counts populate so `urgency-<POS>` awareness items can surface | all tier counts render 0 (T1:0..T5:0 for every position); `urgency-<POS>` never renders | nav `?sim=1`, read tier context rows; `GET /api/players` rows have no top-level `consensusTier` | medium | `src/hooks/use-live-draft-data.ts` fed raw `players_cache` rows into a `Player[]` state without the canonical `cacheToPlayers` mapping; raw rows keep the FP tier under `source_data.tier`, so `consensusTier` was `undefined` and every `calculateScarcity` tier filter returned 0 | **FIXED** (SHA eb61ea0). Root cause was NOT sim-only: the same raw-row path also degraded a REAL draft. Fix: map through `cacheToPlayers` at all 3 setPlayers sites in `use-live-draft-data.ts` (the read path every prep screen already uses). Regression test `src/lib/draft/__tests__/scarcity-tier-mapping.test.ts` pins it: raw rows -> `tier1Remaining=0` (bug), mapped rows -> WR `tier1Remaining=2`, `tier2=1`, RB `tier1=1` (urgency gate fires). Browser confirm: tier context now reads WR T3:44/T4:2/T5:42 (was all 0). |
| F2 | app | `?sim=1` user-tags load | no server error in sim | `500` + console `[useUserTags] invalid input syntax for type uuid: "demo-league"` | open `?sim=1`, read console errors | low | useUserTags passes the non-UUID demo league id `"demo-league"` to a uuid column | open (sim-only, non-blocking; does not affect the adaptive room). |

---

## Summary

- **Groups A, B, C (automated Vitest): 26 checked behaviors, 0 defects.** Exact-value
  assertions, none softened.
- **Group D (browser): D1 PASS, D2 PASS (live recompute observed in DOM with exact
  before/after), D3 gating PASS (true negative) + drift positive-render logged as a
  manual repro.**
- **2 defects found by the browser layer:** F1 (medium) and F2 (low).
  - **F1 FIXED** (SHA `eb61ea0`): tiers rendered 0 not because of the sim but
    because `use-live-draft-data.ts` skipped the canonical `cacheToPlayers`
    mapping, leaving `consensusTier` undefined in a real draft too. Mapped all 3
    setPlayers sites; regression test `scarcity-tier-mapping.test.ts` pins raw→0
    vs mapped→real counts. Browser confirms tier context now populates.
  - **F2 (low, still `open`):** useUserTags 500 on the non-UUID demo league id.
    Sim-path only, non-blocking; logged for Joe to triage. No test assertion
    was weakened.

---

## Summary

- **Groups A, B, C (automated Vitest): 26 checked behaviors, 0 defects.** All new
  tests assert exact values; none were softened. Engine behavior matches the spec
  the plan derived from source.
- **Group D (browser): in progress.**
