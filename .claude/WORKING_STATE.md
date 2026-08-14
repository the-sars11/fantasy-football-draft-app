# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

---

## ⚠️ Plan reset 2026-08-12 — read this before trusting any prior "done"

The prior plan (S1–S8 / P2 DR / P3 VAL) marked the app "done" while it (a) prices players in a **silo** with no team-construction, (b) **500s on a dead Claude model id**, (c) still shows **ADP on the Cheat Sheet**, and (d) has a **`/draft/live` screen that can blank out**. A full screen-by-screen review against the code confirmed 19 findings (RV-1..RV-19). The plan was rewritten to the truth. Full prior plan preserved at `.claude/archive/BUILD_PLAN_pre-rebuild_2026-08-12.md`.

**New North Star:** *build the best possible full 15-man roster for $200* — not price players one at a time. Everything hangs off the team-construction engine (R4), which was never built.

**Active phase:** REBUILD — ordered model-bound sessions **R1 → R15** (see `BUILD_PLAN.md` "THE REBUILD"). R1 trust triage → R2 data truth → R3 valuation correctness → R4 team-construction solver → R5/R6 wire it into live max-bid + strategy prices → R7a persistence rework → R7b filters+fit → R8 cheat-sheet+FLEX → R9 strategy engine → R10a Monte-Carlo engine → R10b sim grading+record → R11 live offline+guidance → R12 shell/perf → R13 bug-hunt+tests → R14 Claude usability → R15 Joe's rehearsal gate. (17 sessions with the R7a/R7b + R10a/R10b splits.)

**Per-session gate (R1–R13):** type-check + test:run + lint(0 new) + build + `/bug-hunt free` on changed modules + a screenshot from a preview I loaded myself. No session is "done" without all of it.

**Cost gate:** rule-based advisor / valuation / solver / simulation are all **$0**. The only paid paths are the AI strategy/research/top-targets panels. Fixing the model id is free; **verifying any live AI path needs Joe's typed approval** (~$0.01–0.03/call).

---

## Next open item

### 🎯 TOP PRIORITY — pivoted 2026-08-13: align the VISION + whole-app definition of done BEFORE any more R# work

**Why:** ten R# sessions ran with no agreed picture of what the finished app looks/feels/works like, and no whole-app definition of done — only a per-step bug list. Root cause found: **two contradicting north stars.** `NORTH_STAR.md` (root, 2026-08-10) is current but thin (functional only, no experience, no "done"). `.claude/NORTH_STAR.md` (2026-04-14) is **4 months stale and describes a DIFFERENT product** — two users (Joe+Tyler), snake+auction, "Tactical Hologram" (dead), $29/$99 pricing, Phase 9-10 commercialization, B2B/white-label, in-season companion. All now "out of scope forever." That stale doc must be retired/reconciled.

**Joe's locked constraints for the vision work (2026-08-13):**
- Prep + sim + live are **EQUALLY important** (not live-only).
- The vision must be **built on the existing root NORTH_STAR + BUILD_PLAN + current code** — reconciled, NOT invented fresh.
- Look/feel/UX is its **own proper multi-session VISUAL effort** (real reference apps, mockups, screen-by-screen, iterated). Do NOT try to snap UI/UX density/feel in a single Q&A — Joe (rightly) shut that down. He can't judge a vision abstractly: *"I don't know unless I understand what they'll look like."*

**Agreed 3-step path (Joe said yes to the path):**
1. **GROUND (do this next):** read the current code + actual screens + `DESIGN_SYSTEM.md`; reconcile the two north stars; bring Joe an **honest map of what exists TODAY** — the real screens and what each does, ideally loaded + screenshotted so he sees the actual app, not a description. (Note: Browser pane has failed to composite in R5/R6 — if screenshots fail, say so, don't fake.)
2. **LOCK the functional vision + whole-app definition of done in writing** — built only on north star + build plan + current code; prep/sim/live all first-class; NO look/feel decisions here. Then retire the stale `.claude/NORTH_STAR.md` and point BUILD_PLAN at one canonical vision doc. Get Joe's redline/sign-off.
3. **DESIGN the look/feel** as its own proper visual effort (references + mockups + iteration). Not one session.

**R10a status:** Joe reports he ran R10a (Monte-Carlo sim engine) in a **separate session** — NOT verified in this session. Verify it landed before R10b. It's a pure engine and stands regardless of the vision work.

---

**R1 [Sonnet] — Trust triage — DONE 2026-08-12.** Closed RV-2, RV-3, RV-6, RV-12, RV-13, RV-16, RV-19. Full verify gate + loaded-preview check passed (type-check clean, tests green with new coverage, lint 0 new errors, build clean, bug-hunt free 0 critical/0 high/1 medium, live screenshots of Cheat Sheet/nav/settings/draft-live). See `CHANGELOG.md` for the verify table and `BUILD_PLAN.md` R1.

**R2 [Sonnet] — Data truth — DONE 2026-08-12.** Closed RV-7, RV-8, RV-14. ECR stat = real `ecrPositionRank` (e.g. "WR1"), RANGE stat = calibrated VORP↔room band (e.g. "$64-$71" for Ja'Marr Chase), tier badge (T1/T2/T3+) now visible in main row. New `convert.test.ts` (7 tests) asserts real source→field mappings. Full gate passed (type-check 0 errors, 223/223 tests green, lint 0 new errors, build clean, bug-hunt free 0 critical/0 high/1 medium pre-existing, screenshot confirming WR1 ECR + $64-$71 RANGE + T1 badge). See `CHANGELOG.md` and `BUILD_PLAN.md` R2.

**R3 [Opus] — Valuation correctness — DONE 2026-08-12.** Closed RV-4, RV-5, RV-18. `valueCeiling` guard in `calculateMaxBidAdvice` ensures max-bid never exceeds `calibrated.ceiling` regardless of strategy/scarcity/position boosts; ELITE anchor changed from `range.high` (ceiling) to `range.base` (fair midpoint); TAX label fixed from `$-4 TAX` to `-$4 TAX`; `lib/intel/tag-detector.ts` confirmed not to exist (RV-18 stale reference resolved). 227/227 tests green. See `CHANGELOG.md` and `BUILD_PLAN.md` R3.

**R4 [Opus] — Team-construction SOLVER — DONE 2026-08-12.** Built `src/lib/draft/roster-solver.ts` (pure $0 module, 320 lines) + `src/lib/draft/__tests__/roster-solver.test.ts` (504 lines, 47 tests). Greedy best-fill: dedicated starters in scarcity order (QB→TE→RB→WR→DST), then FLEX from combined RB/WR/TE pool by ceiling DESC, then bench at $1. `solveAllocation` + `computeRosterConstrainedMaxBid` (maxBid = budget − best-rest-of-roster). 274/274 tests green. Bug hunt: 0 CRITICAL, 0 HIGH, 1 MEDIUM (BUG-007: slot-no-op when bench=0 — fix before R5), 3 LOW. See `BUILD_PLAN.md` R4 and `BUG_LOG.md`.

**R5 [Opus] — Wire the solver into the LIVE max-bid — DONE 2026-08-12.** Closed RV-1 (live + library halves now both done). New `src/lib/draft/solver-bridge.ts` (`computeRosterMaxBidMap` → per-undrafted-player `{maxBid, note}` from live draft state) + 14 tests. Displayed max-bid = `min(worth ceiling, roster-completion max)` via the client min-fold (`client.tsx:363-364`); `what-to-do.ts` carries a plain-English `rosterNote` ("More than $X and you cannot fill QB, 2 FLEX and N bench") surfaced verbatim on the on-block card. Fixed BUG-007 (slot no-op → `feasible:false` short-circuit) + BUG-R5-01 (budget-aware fill over-dropped to $1 → `takeAffordableFromBucket`/affordable-FLEX), both with regression tests. 300/300 tests green (solver-bridge 14 + first RTL render test proving the note renders on the card). Gate: type-check 0 errors, lint 161 (0 new), build clean 54/54, bug-hunt free. **Live browser screenshot deferred (env: Browser pane not compositing + valuation-less sim board); render path proven by DOM render test instead. Joe approved shipping on that basis (Option A).** See `CHANGELOG.md`, `BUILD_PLAN.md` R5, `BUG_LOG.md`.

**R6 [Opus] — Wire the solver into STRATEGY target prices — DONE 2026-08-13.** New `src/lib/research/strategy/target-pricing.ts` (`assignTargetPrices`) reuses the R4 solver on an empty board to compute reserve = $1 per non-target slot (13-slot roster), then prices each named target = base value × archetype budget-emphasis, capped by max-bid %, scaled + hard-trimmed to fit the freed pool. Invariant `sum(prices) + reserve ≤ budget` is structural → every strategy's targets complete a full $200 roster; swapping archetype re-allocates the money. Wired into `research.ts` (`priceProposals`, auction-only, both Claude + preset paths); `StrategyProposalCard` shows per-target `$price` badges + a completable-roster summary. 314/314 tests green (+11 unit target-pricing + 3 render strategy-proposal-card). Gate: type-check 0, lint 161 (0 new), build clean, bug-hunt free (1 low cosmetic BUG-R6-01). **Raster screenshot deferred (env: Browser pane not compositing); render path proven by 3 DOM render tests + the real card served through the live dev server delivered to Joe as HTML (RB-heavy $73/$73 → WR-heavy $47/$78/$39, both = $200).** See `CHANGELOG.md`, `BUILD_PLAN.md` R6, `BUG_LOG.md`.

**R7a [Sonnet] — Persistence rework + graded tag scale — DONE 2026-08-13.** Closed RV-17 (stable `player_external_id` anchor) + RV-15 (graded tagging UI: weight stepper 1-10 for targets, severity toggle soft/hard for avoids). Migration `20260813000001_user_tags_graded_scale.sql` ready — NOT yet applied to production Supabase (Joe applies manually). 322/322 tests green (+8 new in `graded-tags.test.ts`). See `CHANGELOG.md` and `BUILD_PLAN.md` R7a.

**R7b [Sonnet+Opus] — Player filters + strategy-fit line — DONE 2026-08-13.** FLEX filter (RB+WR+TE), tier (T1/T2/T3+), bye week, grade (7+/9+, target-mode), severity (soft/hard, avoid-mode). New pure module `prep-fit-line.ts`; `fitLineMap` useMemo runs solver per-player on a full $200/13-slot board; ◆ strip on every card. 22 new tests (17 unit + 5 RTL). Gate: type-check 0, 344/344, lint 161 (0 new), build clean. Bug-hunt: 1 MEDIUM (BUG-R7b-01: solver + label mixed in one memo — queued for R8), 2 LOW. See `CHANGELOG.md`, `BUILD_PLAN.md` R7b.

**R8 [Sonnet] — Cheat Sheet resolution + FLEX view — DONE 2026-08-13.** Fixed BUG-R7b-01 (`players/client.tsx` — split single fitLineMap useMemo into `boardPlayers`/`solverResultMap`/`fitLineMap` so 500 solver calls don't re-run on tag toggles). Added FLEX tab (third tab, volt-green active state) to Cheat Sheet — RB/WR/TE combined by value DESC, reuses DraftBoardTable. Screens are differentiated: Cheat Sheet = strategy-ranked + position breakdown + FLEX; Players = individual intel + fit lines + detail. Closed RV-9 + RV-10. 349/349 tests (+5 new flex-tab unit tests). See `BUILD_PLAN.md` R8.

**R9 [Opus] — Strategy engine rebuild — DONE 2026-08-13.** Strategies now EMERGE from the real board instead of 4 hardcoded archetypes. New `src/lib/research/strategy/generate.ts` ("Solver-enumerated anchor strategies"): prices the pool off the room curve, detects per-position value cliffs (the BOARD GATE — no elite RB on the board → no hero-RB ever offered), fills anchor slots under 4 budget-shape policies (ceiling / value / scarcity / spread) each respecting the solver's $1-per-slot completion invariant, classifies the SOLVED shape into an archetype, dedupes converged shapes, and attaches R6 target prices. New `src/lib/draft/adaptive-guidance.ts` re-runs the SAME anchor generator off LIVE draft state (remaining budget + open slots + undrafted board) and detects positional runs, so as the elite RB tier drains the recommendation pivots to where anchors still exist and the pivot line says "you are behind the RB run." Wired `generateStrategiesFromPool` into `/api/strategies/propose` as the primary $0 path (source `'generated'`; rule-based presets fall back for empty/snake; AI path stays error-gated). Incidental: fixed a pre-existing `flex-tab.test.ts` type error (missing `consensusTier`/`sourceData`/`projections` on the fixture + `injuryStatus: null`→`undefined`). **372/372 tests green** (+23 net: 12 generate + 10 adaptive-guidance + 1 route). Gate: type-check 0 errors, lint 51 (0 new — fixed my own 6 dash errors), build clean 54/54, static review of changed modules clean (DST-excluded-from-prep-board confirmed benign: DST is a $1 fill, slot still reserved, roster still completes). **No new UI screen in R9 → no screenshot:** Part 1 (generated strategies) renders through the R6-proven strategy card; Part 2 (adaptive guidance) is engine-only and gets surfaced in the live room in R11. See `CHANGELOG.md` and `BUILD_PLAN.md` R9.

**R10a [Opus] — Simulation engine — DONE 2026-08-13.** Built `src/lib/draft/sim-engine.ts` (pure $0 Monte-Carlo auction module) + `src/lib/draft/__tests__/sim-engine.test.ts` (20 tests). `runMonteCarlo` runs N seeded English auctions where all 12 seats bid via `computeRosterConstrainedMaxBid` (roster-completion max from the R4 solver — competition-aware, NOT ADP); each lot clears at second-price+1 capped at winner willingness; returns per-run rosters + `SimDistribution` (min/max/mean/median/p10/p90/stdev over the me-seat). `mulberry32` seeded PRNG gives byte-identical runs under the same seed (run i uses seed+i). Closed RV-11 (engine half). **392/392 tests green** (372 baseline +20). Gate: type-check 0 errors, lint 0 new (my 2 files 0/0), build clean 54/54, bug-hunt free (0 crit/high/med, 1 LOW deferred perf BUG-R10a-01, dead `nominator` counter removed). **No UI/persistence in R10a → no screenshot:** pure engine, surfaces in the sim UI in R10b. See `CHANGELOG.md`, `BUILD_PLAN.md` R10a, `BUG_LOG.md`.

**R10b [Opus] — Sim grading + output (NEXT).** See `BUILD_PLAN.md` R10b.

---

## What is real (safe to build on)

Data pipeline (~491 real 2026 players in `players_cache`, verified via API) · GRIDIRON design system · corrected 16-yr Nasties calibration ledger in-repo (`src/data/league-history/`) + reproducible script — real curves, the good raw material for R4 · 12-team config truth (duplicate-active-league drift fixed) · auctioneer feed proxy + state machine + rule-based What-To-Do (built, unit-tested, **NOT live-verified** → R15).

## What is NOT real (rebuild targets, despite prior "done")

~~Team construction (never built — R4/R5)~~ **built R4 (library) + wired live R5** · live AI panels (dead model — R1) · valuation recommendations (silo, can overpay past worth — R3) · ~~strategy target prices (don't fit $200 together — R6)~~ **fixed R6 (targets now sum to a completable $200 roster)** · ~~strategy options (4 hardcoded archetypes, not board-driven — R9)~~ **fixed R9 (strategies now emerge from the pool + solver; live adaptive re-fit engine built + tested, surfaced in the room in R11)** · ~~simulation (deterministic toy, ADP opponents — R10)~~ **engine rebuilt R10a (Monte-Carlo, roster-aware auction opponents via the solver, seed-deterministic, tested); grading/record/persistence + UI still to come in R10b** · Cheat Sheet labels + range (ADP-as-ECR, fake ±15% — R2) · live-auctioneer sync (never proven against a running auctioneer — R15).
