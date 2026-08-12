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

**R1 [Sonnet] — Trust triage — DONE 2026-08-12.** Closed RV-2, RV-3, RV-6, RV-12, RV-13, RV-16, RV-19. Full verify gate + loaded-preview check passed (type-check clean, tests green with new coverage, lint 0 new errors, build clean, bug-hunt free 0 critical/0 high/1 medium, live screenshots of Cheat Sheet/nav/settings/draft-live). See `CHANGELOG.md` for the verify table and `BUILD_PLAN.md` R1.

**R2 [Sonnet] — Data truth: labels stop lying.** Fix: board "ECR" cell = real `ecrPositionRank` (not `round(avgAdp)`) (`players/convert.ts:96`, real field `:61-64/111`), "PTS" = real projection field, RANGE = the real calibrated VORP↔room band instead of the fake flat ±15% (`prep/draft-board-table.tsx:78,392-400`), surface tier data beyond the single ELITE flag (`players/tags.ts`). Closes RV-7, RV-8, RV-14. Done-when: every board cell equals its real source field, with tests asserting cell = source (no derived-from-ADP stand-ins). Screenshot of the corrected board. See `BUILD_PLAN.md` R2.

---

## What is real (safe to build on)

Data pipeline (~491 real 2026 players in `players_cache`, verified via API) · GRIDIRON design system · corrected 16-yr Nasties calibration ledger in-repo (`src/data/league-history/`) + reproducible script — real curves, the good raw material for R4 · 12-team config truth (duplicate-active-league drift fixed) · auctioneer feed proxy + state machine + rule-based What-To-Do (built, unit-tested, **NOT live-verified** → R15).

## What is NOT real (rebuild targets, despite prior "done")

Team construction (never built — R4/R5) · live AI panels (dead model — R1) · valuation recommendations (silo, can overpay past worth — R3) · strategy target prices (don't fit $200 together — R6) · simulation (deterministic toy, ADP opponents — R10) · Cheat Sheet labels + range (ADP-as-ECR, fake ±15% — R2) · live-auctioneer sync (never proven against a running auctioneer — R15).
