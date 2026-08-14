# THE VISION — FFI Gridiron (the finished app)

**Status: LOCKED 2026-08-14 (Joe approved).** This is the single canonical target the whole rebuild builds toward. The stale `.claude/NORTH_STAR.md` (4-months old, describes a different product) is retired (see its header banner). The root `NORTH_STAR.md` engine principle (best $200 roster) is preserved and points here. Built strictly on the root `NORTH_STAR.md` (best $200 roster), `.claude/BUILD_PLAN.md` (sessions R1–R15), and the current code — nothing invented. This is the WHAT-IT-BECOMES; the build plan is the HOW-WE-GET-THERE. Look/feel (references, mockups) is a separate visual effort and is deliberately NOT decided here.

---

## What this app IS (one paragraph)

A personal live-draft advisor for **Joe's "Nasties" 12-team, $200, PPR, no-kicker ESPN auction draft.** It never bids. It has exactly one job: help Joe build the **single best possible full 15-man roster for $200.** It does that across **three equal surfaces — Prep, Sim, and Live — all powered by the same team-construction solver.** Prep is where Joe arrives ready. Sim is where he pressure-tests the plan before it counts. Live is where the app earns its keep on draft night. Picks arrive live from the deployed auctioneer app (the system of record). Dark-first GRIDIRON. One user, one league, one night a year. Not commercial, not multi-user, not in-season, not snake, not keeper.

**The one test every screen must pass:** does this number/screen help build the best full $200 roster — or is it a silo fact that looks useful and isn't?

---

## The three pillars (equal — this is the whole point)

The current app has Prep and Live as first-class, engine-backed pillars and Sim as a buried shell running a toy. In the finished app **all three are first-class, each with its own home in the nav, each running its real engine.** Making Sim equal to Prep and Live is a decision this vision locks.

### PILLAR 1 — PREP  *(builds on R2, R6, R7a, R7b, R8, R9)*

- **What it does:** turns the ~491-player 2026 pool + the 16-year Nasties ledger into a board Joe trusts and a set of strategies that are provably affordable, so he walks in knowing his targets, his prices, and his fallbacks.
- **How it works:** Run research → browse the player pool and a ranked, position-colored **Cheat Sheet** (real ECR / projected points / tier / calibrated value-range — no ADP, with a real FLEX list) → set **graded targets and avoids** (weight 1–10, soft/hard) → the app **auto-generates strategies from the pool + solver**, each with a per-target price that sums to a **completable $200 roster**, and adapts when Joe swaps archetype → save runs, reload, compare.
- **Done feels like:** every number on the board is real and traces to a source; every strategy is provably completable (targets + $1-per-remaining-slot ≤ $200); the Cheat Sheet is fast enough that Joe would actually keep it open during the draft.

### PILLAR 2 — SIM  *(builds on R10a [engine, shipped], R10b [grading + output + saved runs])*

- **What it does:** lets Joe pressure-test a strategy **before** draft night — run his plan through hundreds of realistic auction drafts and see what rosters and what season outcome it actually produces.
- **How it works:** pick a strategy → run **Monte Carlo** (N seeded drafts where all 12 opponents bid up to their own roster-completion max via the solver — competition-aware, NOT ADP) → get a **distribution**: projected season points vs. the league, a projected **win-loss record**, and **4–5 representative resulting teams** → **save runs, reload, and compare** strategies head-to-head.
- **Done feels like:** Sim is a first-class pillar with its own nav home (not buried under Prep); it runs the real `sim-engine.ts` Monte-Carlo (the toy inline sim is gone); a result is a confidence read Joe can act on ("this plan finishes top-3 in most drafts, and here's the roster it usually gets me"), and it persists so he can compare plan A vs. plan B.

### PILLAR 3 — LIVE  *(builds on R5 [shipped], R9 [adaptive], R11, R15)*

- **What it does:** during the real draft, tell Joe exactly what to do on the player on the block — **HOLD / BID / PUSH / PASS**, a **max bid that still lets him finish the roster**, and a plain-English reason — updating live as the board and his budget move.
- **How it works:** auto-detect the live auctioneer → join → every nomination shows **THE PLAY** (roster-aware max bid = `min(what he's worth, the most you can pay and still complete the roster)`), budget/pace, positional scarcity, and **adaptive guidance that re-fits as the draft moves** ("you missed the RB run — pivot to WR value + hero RB") → tracks every pick, survives a mid-draft network drop via local cache, all **one-thumb on his phone.**
- **Done feels like:** one glance gives the decision; the number **never** tells him to overpay past worth or to strand a roster slot; it's calm and legible between nominations and lights up with broadcast energy at the moment of a bid; and it has been **proven live against the real auctioneer**, not just unit-tested.

---

## The WHOLE-APP definition of done (not a session — the app)

The rebuild is finished, and the app is ready for draft night, when ALL of these are true:

1. **All three pillars run their real engines end-to-end.** Prep research → solver-priced strategies; Sim → the real Monte-Carlo `sim-engine.ts`; Live → roster-aware advice + adaptive re-fit. **No orphaned engines** — `adaptive-guidance.ts` is wired into the live room (R11) and `sim-engine.ts` is wired into the Sim screen (R10b). No toy sim survives.
2. **Sim is a first-class nav pillar,** equal to Prep and Live — its own destination, not a page hidden inside Prep.
3. **Every number serves the North Star and none lies.** No silo max-bid, no label showing a value it isn't, no path that recommends paying past worth. (The R1–R3 trust/valuation fixes stay true.)
4. **It works the way Joe will actually use it:** one-thumb, mobile-first, dark-first GRIDIRON, with page switches fast enough not to break draft-night flow (R12).
5. **It's hardened where it counts:** `/bug-hunt full` clean and real test coverage on the draft-deciding engines — solver, roster-aware max-bid, strategy target prices, Monte-Carlo sim (R13) — plus a full first-person usability walkthrough with friction fixed before Joe's hands touch it (R14).
6. **It's rehearsed for real (THE GATE, R15):** Joe has run a **full mock draft on his phone against the live auctioneer** — join/sync proven, picks tracking, roster-aware advice correct, budgets right, offline-resync proven, no surprises.
7. **There is one canonical target:** this document. The stale `.claude/NORTH_STAR.md` is retired; the root `NORTH_STAR.md` engine principle (best $200 roster) is preserved and points here.

---

## What this vision DECIDES (the only two non-obvious calls)

Everything above is a restatement of the North Star + build plan except these two, which follow directly from "Prep, Sim, and Live are equally important":

1. **Sim becomes a first-class pillar with its own nav home** — today it's a single screen buried under Prep. Equal importance means equal presence.
2. **The two built-but-orphaned engines get wired, not left dead** — `sim-engine.ts` (R10a shipped) is wired in R10b; `adaptive-guidance.ts` (R9 shipped) is wired into the live room in R11. Equal importance means the live-adaptive and real-sim behavior actually reach the screen.

Everything else the build plan already covers. Nothing here changes the auction-only / ESPN-only / no-snake / no-keeper / no-Tyler / GRIDIRON / no-in-season locks.
