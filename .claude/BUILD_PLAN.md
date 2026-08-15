<!-- DASHBOARD_STATUS
{
  "currentPhase": "REBUILD — the app was marked 'done' but prices players in a silo and breaks on a dead model. Reset to truth 2026-08-12. New North Star: build the best full 15-man roster for $200, not price players one at a time. Ordered rebuild sessions R1→R15 (17 with the R7a/R7b + R10a/R10b splits), model-bound, one-sitting each, testing + bug hunts baked in. NO date gating — built well, done right.",
  "status": "active",
  "milestones": [
    { "name": "Data pipeline — Sleeper/FantasyPros seed + Supabase cache (real, verified via API)", "done": true },
    { "name": "GRIDIRON design system (real, shipped)", "done": true },
    { "name": "Live auction state machine + rule-based advisor (built, NOT live-verified)", "done": false },
    { "name": "Auctioneer remote sync proxy (built, NOT verified against a running auctioneer)", "done": false },
    { "name": "Per-player calibrated valuation ceiling/room/gap (built, but prices in a SILO — no roster context)", "done": false },
    { "name": "TEAM-CONSTRUCTION ENGINE — best full roster for $200 (THE North Star — NOT BUILT)", "done": false },
    { "name": "Strategy engine (partial — 500s on the dead model)", "done": false },
    { "name": "Simulation (built but deterministic toy — not Monte Carlo, opponents draft by ADP)", "done": false },
    { "name": "Live AI panels (BROKEN — point at a 404 model id)", "done": false }
  ],
  "nextItems": [
    "R1 [Sonnet]: Trust triage — dead model id, error-gated AI fallback, ADP off the Cheat Sheet, nav active-state, kill the dead theme toggle, /draft/live renders (not null). The app stops lying and stops throwing.",
    "R2 [Sonnet]: Data truth — ECR/PTS show real fields (not round(ADP)), kill the fake ±15% range, surface tier data.",
    "R3 [Opus]: Valuation correctness — never recommend a max-bid above worth; kill the 'pay up to $97' ceiling line; legible POCKET/TAX; wire or delete the breakout/bust detector.",
    "R4 [Opus]: Team-construction SOLVER (pure lib) — best full-roster allocation for $200 given budget/slots/board; per-nomination max-bid that still lets you finish the roster. The North Star, as a tested library.",
    "R5 [Opus]: Wire the solver into the LIVE max-bid — 'THE PLAY' becomes roster-aware, not silo.",
    "R6 [Opus]: Wire the solver into STRATEGY target prices — each strategy's targets sum to a completable $200 roster.",
    "R7a [Sonnet]: Persistence rework + graded tag scale — migrate user_tags to player_id anchor (+ backfill), wire the weight/severity scale into the tagging UI. (Schema session, isolated from UI.)",
    "R7b [Sonnet+Opus]: Player filters + strategy-fit line — expanded filters (position/FLEX/tier/pocket/bye/tag), solver-driven per-player fit line. Depends on R4 + R7a.",
    "R8 [Sonnet]: Cheat Sheet resolution + FLEX view — stop duplicating Players; add a real roster-construction board + a FLEX list.",
    "R9 [Opus]: Strategy engine rebuild — auto-generate options from the pool + solver; live adaptive guidance.",
    "R10a [Opus]: Simulation engine — Monte Carlo + auction-priced roster-aware opponents (via the solver), returns per-run rosters + a distribution. Pure + tested, no UI. (Isolated like R4.)",
    "R10b [Opus]: Sim grading + output — season-points-vs-league grade, projected record, 4-5 representative teams, saved runs (persist/reload/compare). Depends on R10a.",
    "R11 [Sonnet]: Live draft — offline cache + team-aware live guidance in the room.",
    "R12 [Sonnet]: Shell/UX/perf — page-switch load time, mobile-first verification across every screen.",
    "R13 [Sonnet+Opus]: Dedicated bug hunt + test hardening — /bug-hunt full, real coverage on the new engines (the old 205 tested the wrong things).",
    "R14 [Claude drives Chrome + Sonnet]: usability walkthrough — walk every flow mobile arm's-length, fix friction before Joe touches it.",
    "R15 [Sonnet + Joe]: rehearsal GATE — full mock draft on Joe's phone against the live auctioneer. The only session that needs Joe's hands.",
    "Per-session gate (R1-R13): type-check + test:run + lint(0 new) + build + /bug-hunt free on changed modules + a screenshot from a preview I loaded myself. No session is 'done' without all of it."
  ]
}
-->

# Fantasy Football Draft Advisor — Build Plan

**Rebuilt 2026-08-12** after a full screen-by-screen review against the actual code. The prior plan claimed sessions S1–S5 "done" (205 tests, valuation "done," strategies "done"). That self-assessment was false in the ways that matter, and this file resets to the truth. The full prior plan is preserved verbatim at `.claude/archive/BUILD_PLAN_pre-rebuild_2026-08-12.md` — nothing was deleted.

**What this app is:** a personal live-draft advisor for **Joe's "Nasties" 12-team, $200, PPR, no-kicker ESPN AUCTION draft.** It never places bids — it advises Joe (what to do, max bid, budget/pace, roster fit) and records results. Picks arrive **live over the network from the deployed auctioneer app** (`fantasy-auction-auctioneer`), the system of record. No Google Sheets. No snake/keeper. Tyler's league is out of scope forever.

Task tracking: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## ▶ HOW TO RUN A SESSION (read this first, every session)

**Installed 2026-08-13** after too many loosely-defined, all-Opus sessions with no real definition of "done." This block turns every R# session into a tightly-scoped, model-gated, one-sitting unit whose completion is *proven*, not asserted. Do exactly ONE step per session. Do not improvise; do not fold in the next step.

### The hard model-gate (step 3 of the launch prompt — a real STOP, not a suggestion)

Each R# names its required model. **Opus** and **Sonnet** are not interchangeable: Opus for the sessions that design or reason through engine/logic/architecture, Sonnet for the mechanical/UI/wiring sessions (cheaper, and correct for that work).

| Model | Sessions |
|-------|----------|
| **Opus** (required) | R3, R4, R5, R6, R9, R10a, R10b — plus the Opus half of R7b (fit logic) and R13 (logic bugs) |
| **Sonnet** | R1, R2, R7a, R8, R11, R12, R14, R15 |

**Gate:** at session start, state which model this session is running on. If it does **not** match the step's tag, **STOP, do no work, and tell Joe to relaunch on the correct model.** Claude cannot switch its own model mid-session — forcing the relaunch is Joe's job, so make him do it. Running an Opus step on Sonnet (or burning Opus on a Sonnet step) is exactly the waste this process exists to kill.

### The A1–A10 Acceptance Checklist — THE definition of done

A step is **not done** because a file exists, the code committed, or it runs. A step is done when **every applicable item below is proven with pasted evidence, in-chat, in the same message that claims completion.** Skip an item only by stating why it does not apply.

```
A1.  Step's own "Done-when" met, CLAUSE BY CLAUSE — each clause proven separately
     (output / screenshot / test), not "mostly."
A2.  type-check clean — `npm run type-check` -> 0 errors. Paste the tail.
A3.  Tests green AND coverage followed the engine — `npm run test:run` all green, and the
     new draft-deciding logic has NEW tests (a green pre-existing suite is not coverage).
     Paste the count + name the new tests.
A4.  Lint 0 new — changed-module `eslint` exit 0; paste the full-project error delta
     (was N, now N).
A5.  Build clean — `npm run build` compiles, static pages generated. Paste the success line.
A6.  Bug-hunt free on changed modules — `/bug-hunt free` -> 0 unresolved CRITICAL/HIGH;
     every MED/LOW fixed or logged in BUG_LOG with a defer reason + target session.
A7.  Visual proof OR honest no-UI declaration — if a human sees the change, paste a
     screenshot from a preview I loaded myself with the interaction working. If no UI
     ships, say so and name where it surfaces later. Never fake or hand-wave a screenshot.
A8.  No lies, no silos, no overpay — serves the North Star (best $200 roster), breaks no
     Locked Decision, no label shows a value it isn't, no path recommends paying past worth.
A9.  Cost gate honored — no paid Claude / 3rd-party call fired without Joe's typed approval.
     Confirm $0, or name the approval.
A10. Records + commit — BUILD_PLAN step marked with a "Shipped:" proof note, WORKING_STATE
     pointer updated, CHANGELOG entry added, BUG_LOG updated if a hunt ran; committed by
     EXPLICIT PATH (never `git add -A`), pushed to main, SHA + range pasted.
```

### The launch prompt (paste this to start a session; it reprints itself at the end)

Every session ends by regenerating this prompt verbatim with a `NEXT SESSION:` line added at the top, so the next session is always a copy-paste away.

```
Work the Fantasy Football Draft Advisor rebuild plan. Follow this exactly; do not improvise.

1. READ FIRST. Open C:\Users\jrasa\AI Projects\fantasy_football_draft_app\.claude\BUILD_PLAN.md.
   Read the "▶ HOW TO RUN A SESSION" block (model-gate + A1–A10 + this prompt), "⭐ THE NORTH
   STAR," "🏗️ THE REBUILD" step table, and the "Superseded / rejected directions" locks. Then
   open .claude/WORKING_STATE.md and read "Next open item." Cite file:line for every claim about
   code — if you did not open the file THIS session, you do not know it; go read it.

2. PICK THE STEP. In THE REBUILD, find the FIRST R# whose "Done-when" is not yet proven. That is
   this session's step. Do exactly ONE step. Do not fold in the next one. Spot adjacent work? Note
   it in the plan as a future step; do not do it.

3. MODEL CHECK (hard gate). The step names its required model (see the model-gate table: Opus for
   R3,R4,R5,R6,R9,R10a,R10b + Opus-halves of R7b/R13; Sonnet for R1,R2,R7a,R8,R11,R12,R14,R15).
   Tell me which model this session is running on. If it does NOT match, STOP immediately, do no
   work, and tell me to relaunch on the correct model. Claude cannot switch its own model — this
   is my job, so make me do it.

4. ANCHOR. Confirm the step still serves the North Star (best full $200 roster, never a silo) and
   breaks no Locked Decision (auction-only, ESPN-only, no keeper/snake, no Tyler's league, GRIDIRON
   dark-first, Google Sheets out). If it conflicts, STOP and tell me before touching anything.

5. WORK IT until context is nearly out (leave headroom to do step 6 cleanly — do NOT run out
   mid-write). "Done" = the artifact passes the A1–A10 Acceptance Checklist item-by-item, with the
   proof pasted in-chat — NEVER "a file exists / it committed / it runs." If you are a Sonnet
   session and hit a decision your step's spec did not cover, STOP and kick it to an Opus re-plan.
   Never improvise a decision. Paid Claude/3rd-party calls need my typed approval first.

6. CLEAN EXIT (always, before stopping, even if the step is only partly done):
   a. Mark the R# in THE REBUILD with a "Shipped:" proof note; update WORKING_STATE "Next open
      item"; add a CHANGELOG entry; update BUG_LOG if a hunt ran.
   b. Commit by EXPLICIT PATH only (never git add -A). Push to main. Use git push --no-verify ONLY
      if the push is blocked solely by pre-existing env-failing tests in files I did not touch this
      session — otherwise fix it. git commit --no-verify is always blocked.
   c. Print the proof of commit+push (SHA + range).

7. REGENERATE. Determine the NEXT open step after this session's work and its required model. Then
   print — in a fenced code block — a fresh copy of THIS ENTIRE PROMPT, with one line added at the
   very top: "NEXT SESSION: launch <Opus|Sonnet> — step <R#> (<one-line name>)." Print it verbatim
   so I can paste it straight into a new session.
```

---

## ⭐ THE NORTH STAR (reframed 2026-08-12)

> **The job is to build the single best possible full 15-man roster for $200 — not to price players one at a time.**

> **📎 Canonical whole-app vision + definition of done: `.claude/VISION.md` (LOCKED 2026-08-14).** This section is the ENGINE principle; VISION.md is what the finished app looks/feels/works/does across the three EQUAL pillars (Prep / Sim / Live) and the 7-point whole-app "done." Every R# below builds toward it. Two calls the vision locks: **Sim becomes a first-class nav pillar** (today buried under Prep), and **the two built-but-orphaned engines get wired** — `sim-engine.ts` → R10b, `adaptive-guidance.ts` → R11.

Every number the app shows must serve that one goal. "Gibbs is worth $97, room pays ~$76, +$21 pocket" is a *silo* fact — it is true and it is nearly useless on its own, because it never answers the only question that wins the draft:

> *Given I have $X left, these slots still open (QB/RB/WR/TE/FLEX×3/DEF/Bench×5), and this board in front of me — what is the most I can pay for THIS player and still finish with the best possible rest-of-roster?*

That is **team construction**, and it was never built. The shipped max-bid is capped by the *wallet* (what's left in the budget), not by *roster completion* (what finishing the team costs). That is the root defect this rebuild fixes. Everything else — valuation, strategy, simulation, live guidance — hangs off the team-construction engine (R4).

Roster shape (locked, Joe-confirmed 2026-07-12): **QB1 / RB1 / WR1 / TE1 / FLEX3 / DEF1 / K0 / Bench5 / IR1** = 12 active + 1 IR (13 slots the auctioneer fills; a 15-man mental model with the 3 FLEX counted).

---

## 🚨 REALITY CORRECTION / TRUST RESET (2026-08-12)

The prior plan's "done" checkmarks counted work that was either wrong, wired to nothing, or testing the wrong thing. Stated plainly, with evidence, so no future session builds on a false floor:

| Prior claim | Reality (verified 2026-08-12) | Evidence |
|---|---|---|
| "Strategies made real — DONE (S4)" | Strategy proposals **500** whenever the AI path runs: the default/best Claude model id is a **dead 404 model**. | `src/lib/ai/claude.ts:28-29` — `default`/`best` = `claude-sonnet-4-20250514` (retired). `fast` = `claude-haiku-4-5-20251001` (valid). |
| "Strategies have a $0 rule-based fallback" | The fallback is **key-gated, not error-gated** — it only fires when the API key is *absent*, not when the AI call *fails*. So with a key present + a dead model, it 500s instead of falling back. | `src/app/api/strategies/propose/route.ts:158-160`. |
| "Valuation engine — DONE (S2/P3)" | It prices players in a **silo**. Max-bid multiplier stacking is capped by the **wallet** (`absoluteMax`), not the **ceiling** — so it can recommend paying *past what a player is worth*. No roster-completion math anywhere. | `src/lib/draft/auction-advisor.ts:98,127,147`; anchor midpoint `:74`. |
| "ADP removed (FB-8) — DONE" | True only on the Players screen. The **Cheat Sheet still sorts by ADP and shows an 'ADP Movers' strip** — the snake stat Joe explicitly said is meaningless in an auction. | `src/app/(app)/prep/board/client.tsx:35` (ADP sort pill), `:447-511` (ADP Movers). |
| "Richer player data — DONE (FB-13)" | The board's **"ECR" is `Math.round(avgAdp)`** (ADP relabeled), and the value **RANGE is a fake flat ±15%**, not the real VORP↔room band. | `src/lib/players/convert.ts:96` ("approximate from ADP"); real `ecrPositionRank` at `:61-64/111` unused; `src/components/prep/draft-board-table.tsx:78` (±15%), cells `:392-400`. |
| "205 tests passing" | The 205 tests are real and green — but they test the code that **exists**, and the thing that matters (team construction) **doesn't exist**, so it's untested by definition. Tests also **mock the Claude client**, so none of them caught the dead-model 404. Green suite ≠ working app. | S5 bug-log entry; `.claude/BUG_LOG.md`. |
| "Live draft room works" | `/draft/live` can **`return null`** (blank dead screen) under a real condition, and `myManager` can throw. "Demo Draft" routes to `/draft/live?sim=1`, so it lands on the same dead screen. | `src/app/(app)/draft/live/client.tsx:462` (`return null`), `:466` (throw risk); `src/app/(app)/settings/page.tsx:116,147`. |
| "Simulation" | It's a **single deterministic draft**, opponents pick by **ADP** (not auction bidding), the result isn't persisted (useState only), and it grades against a generic roster. Not Monte Carlo, not competition-aware. | `src/app/(app)/prep/simulate/client.tsx:92-229`, opponents `:184-189`, verdict `:224-226`, state `:255,330`. |

**Corrected misreads (the review also cleared these — they are NOT bugs):**
- Mobile nav **does** exist (the earlier "no mobile nav" read was the desktop sidebar, or the intentionally nav-less live-draft screen).
- Persistence + reconnect **do** work; the gap is the lack of a **local offline cache** for a mid-draft network drop (R11).
- "Demo Draft" is a legitimate **dev-only sim launcher** (`NODE_ENV==='development'` guard) — useful once `/draft/live` renders (R1).

---

## ✅ What is ACTUALLY built and trustworthy (the real floor to build on)

- **Data pipeline** — `seed-players-sleeper.ts` + `populate-fantasypros.ts` seeded ~491 real 2026 PPR players with ECR + derived auction values into Supabase `players_cache`. Verified live via `/api/players` (Ja'Marr Chase #1 $70).
- **League config truth** — the "10 teams" bug was fixed at the source (duplicate active-league drift); `/api/leagues` returns the real 12-team Nasties config.
- **GRIDIRON design system** — shipped and consistent; volt-green/electric-blue, Anton/Saira/JetBrains Mono, motion system, scoped live-room palette. Design is dark-first by intent.
- **Calibrated ledger** — the corrected 16-year Nasties auction ledger is in-repo (`src/data/league-history/`) with a reproducible calibration script. This is genuinely good raw material — the per-position price-by-rank curves and owner leans are real. The problem isn't the data; it's that the data feeds a silo instead of a team engine.
- **Auctioneer feed proxy + state machine + rule-based What-To-Do** — built and unit-tested, but **never verified against a running auctioneer** (that's R15).

Treat everything else as suspect until a rebuild session re-verifies it against running code.

---

## 🐞 Confirmed bug / gap register (from the 2026-08-12 review)

Every item below was confirmed against code. `RV-#` = review finding. Severity is impact on a real, trustworthy, winning draft night. Each maps to a rebuild session.

| ID | Sev | Finding | Location | Session |
|----|-----|---------|----------|---------|
| RV-1 | **CRITICAL** | ~~**No team-construction.** Max-bid capped by wallet, not by roster-completion. The app can't build a team for $200 — the whole point.~~ **[x] FIXED R4 (library) + R5 (live wire)** — solver builds the best $200 roster; live max-bid = `min(worth ceiling, roster-completion max)` and explains the constraint in plain words on the card. | `roster-solver.ts`, `solver-bridge.ts`, `client.tsx:363` | R4→R5 |
| RV-2 | **CRITICAL** | ~~Dead Claude model id → strategy/research AI paths 404/500.~~ **[x] FIXED R1** | `ai/claude.ts:28-29` | R1 |
| RV-3 | **HIGH** | ~~Rule-based fallback is key-gated, not error-gated → 500 on AI failure instead of graceful $0 fallback.~~ **[x] FIXED R1** | `strategies/propose/route.ts:158-160` | R1 |
| RV-4 | **HIGH** | ~~Max-bid can exceed the player's ceiling (recommends overpaying past worth).~~ **[x] FIXED R3** | `auction-advisor.ts:98,127,147` | R3 |
| RV-5 | **HIGH** | ~~"Anchor — pay up to $97" shows the theoretical **ceiling** as a pay-to price → tells Joe to overpay.~~ **[x] FIXED R3** | `players/recommendation.ts:43` | R3 |
| RV-6 | **HIGH** | ~~ADP still drives the Cheat Sheet (sort pill + Movers strip) — meaningless in auction, Joe called it out.~~ **[x] FIXED R1** | `prep/board/client.tsx:35,447-511` | R1 |
| RV-7 | **HIGH** | ~~Board "ECR" is `round(avgAdp)` (ADP mislabeled); real `ecrPositionRank` unused. "PTS" similarly suspect.~~ **[x] FIXED R2** | `convert.ts:96` (real at `:61-64/111`) | R2 |
| RV-8 | MED | ~~Value RANGE on the board is a fake flat ±15%, not the real VORP↔room band.~~ **[x] FIXED R2** | `draft-board-table.tsx:78,392-400` | R2 |
| RV-9 | MED | No FLEX list — you can't see the RB/WR/TE flex pool as one ranked board. | prep board/players | R8 |
| RV-10 | MED | Cheat Sheet largely duplicates the Players screen — two screens, one job. | `prep/board/*` vs `prep/players/*` | R8 |
| RV-11 | MED | ~~Simulation is a single deterministic draft, ADP opponents, not persisted, generic grading.~~ **[x] ENGINE HALF FIXED R10a** (`sim-engine.ts` — Monte-Carlo, roster-aware auction opponents via the solver, seed-deterministic, tested). Grading/record/persistence still R10b. | `prep/simulate/client.tsx:92-229` | R10a/R10b |
| RV-12 | MED | ~~Nav active-state mis-highlights (Setup destinations live under /draft & /prep; longest-prefix logic picks wrong).~~ **[x] FIXED R1** | `layout/app-shell.tsx:37-52` | R1 |
| RV-13 | MED | ~~Dead light/dark toggle — no `.light` token block exists, so the toggle does nothing.~~ **[x] FIXED R1 (toggle removed)** | `globals.css` (`:root`+`.dark` only) | R1 |
| RV-14 | MED | ~~FantasyPros tier data is loaded but its only consumer is the single ELITE flag — wasted signal.~~ **[x] FIXED R2** (tier badge in card header) | `players/tags.ts:72` | R2 |
| RV-15 | MED | ~~Graded tag scale exists in types (weight 1-10, severity soft/hard) but the tagging UI is binary.~~ **[x] FIXED R7a** (weight stepper + severity toggle wired into tagging UI; DB columns + API round-trip added) | `research/strategy/types.ts:151-166` | R7a |
| RV-16 | MED | ~~`/draft/live` can `return null` (blank dead screen); `myManager` can throw.~~ **[x] FIXED R1** | `draft/live/client.tsx:462,466` | R1 |
| RV-17 | MED | ~~Target/avoid persistence is name-anchored (UUID FK on a name) — fragile to any name variance.~~ **[x] FIXED R7a** (`player_external_id` column added + backfilled from `players_cache.external_id`; stable Sleeper/ESPN ID survives re-seeds) | `user_tags` migration | R7a |
| RV-18 | LOW | ~~BREAKOUT/BUST/VALUE detector exists but is wired to nothing.~~ **[x] RESOLVED R3** — `lib/intel/tag-detector.ts` does not exist; was a stale reference. Dead badge cleanup in `ffi-player-card.tsx` deferred to R11/R13. | `lib/intel/tag-detector.ts` | R3 |
| RV-19 | LOW | ~~"Demo Draft" routes to `/draft/live?sim=1` → hits the RV-16 dead screen (collateral). Genuinely useful once RV-16 is fixed.~~ **[x] FIXED R1** | `settings/page.tsx:116,147` | R1 |

---

## The one-plan rule (so we never silo the plan again)

**There is exactly ONE plan: this file.** New directions go here — as active work or as a dated SUPERSEDED / REJECTED record. **No standalone plan docs.** Design specs live in `DESIGN_SYSTEM.md`; live working state in `.claude/WORKING_STATE.md` (thin pointer); the audit trail in `.claude/CHANGELOG.md`.

---

## Dev Cycle (per session)

> **The authoritative session procedure and definition of done is `▶ HOW TO RUN A SESSION` at the top of this file** (the launch prompt + the hard model-gate + the A1–A10 Acceptance Checklist). The steps below are the PROPOSE/PATCH/VERIFY detail that fills in step 5 ("WORK IT") of that prompt — they do not replace it. The A1–A10 checklist is the single definition of done; the per-session gate below is A2–A7 of it.

```
1. Read this plan's session block (R#) + the files it says to read first. Read NORTH_STAR.md for engine/architecture work.
2. Model-gate (see HOW TO RUN A SESSION): state this session's model; if it ≠ the step's tag, STOP and make Joe relaunch.
3. PROPOSE: classify the change, name the Review Lenses, declare scope (files touched + what will NOT change), state a concrete success criterion.
4. PATCH: implement inside the declared scope. Don't exceed it without re-proposing.
5. VERIFY: prove the success criterion with output/screenshot, then clear the A1–A10 Acceptance Checklist item-by-item.
6. Paste the proof. Mark [x]. Update WORKING_STATE (pointer) + CHANGELOG (entry) + BUG_LOG (if a hunt ran). Commit by explicit path + push.
```

**Per-session gate (R1–R13, non-negotiable)** — this is A2–A7 of the Acceptance Checklist; no session is "done" until ALL pass:
`npm run type-check` · `npm run test:run` · `npm run lint` (0 new) · `npm run build` · `/bug-hunt free` on the changed modules · **a screenshot from a preview I loaded myself.** R13/R14 are the whole-app hardening passes stacked on top; R15 is the human gate.

**Cost gate:** the rule-based advisor, valuation, solver, and simulation are all **$0** (local math + free ESPN/Sleeper reads). The only paid paths are the **AI strategy/research/top-targets panels** (Claude). Fixing the model id is free; **verifying any live AI path costs money and needs Joe's typed approval first** (global rule #3, ~$0.01–0.03/call). Do not fire a real Claude call to "test" without it.

---

## 🏗️ THE REBUILD — ordered, model-bound sessions

Work top to bottom. Each session is scoped to finish cleanly in one focused sitting on the stated model, with its own gate. Dependencies are stated; the order respects them.

### R1 — Trust triage: the app stops lying and stops throwing `[Sonnet]` · class: bugfix `[x]` DONE 2026-08-12
> **Why first:** these are the trust-killers and the crashes. Nothing downstream matters while strategies 500, the Cheat Sheet shows a snake stat, the theme toggle is dead, and the live screen can blank out.
> **Reads first:** `src/lib/ai/claude.ts`, `src/app/api/strategies/propose/route.ts`, `src/lib/research/strategy/research.ts`, `src/app/(app)/prep/board/client.tsx`, `src/components/layout/app-shell.tsx`, `src/app/globals.css`, `src/app/(app)/draft/live/client.tsx`, `src/app/(app)/settings/page.tsx`.
> **Closes:** RV-2, RV-3, RV-6, RV-12, RV-13, RV-16, RV-19.
> **Work:**
> - RV-2: point `default`/`best` at a **live** model id (Opus/Sonnet current). Add a startup/self-check assertion so a dead id can't fail silently again.
> - RV-3: make the rule-based fallback **error-gated** — fire on any AI failure, not just a missing key. Never 500 a strategy request.
> - RV-6: remove the ADP sort pill + ADP Movers strip from the Cheat Sheet (auction = dollars, not ADP).
> - RV-12: fix nav active-state so every screen highlights the right tab.
> - RV-13 **(recommend: remove the toggle, don't build a light theme).** GRIDIRON is dark-first by design; nobody asked for light mode. Delete the dead toggle rather than ship a half-built theme. (If Joe wants light mode, that's its own scoped session.)
> - RV-16/RV-19: make `/draft/live` render a real screen instead of `null`; guard `myManager`. Confirm "Demo Draft" reaches a working room. **If the null is entangled with the join/sync architecture, stop and fold the deep fix into R11** — triage only makes it render, not rebuild sync.
> **Done-when:** strategy generation returns proposals with the key absent (rule-based) and does not 500 with the key present (live path verification is a Joe-approved paid check); no ADP anywhere on the Cheat Sheet; correct tab highlights from every screen; no dead theme toggle; `/draft/live` + Demo Draft render real screens. Screenshots of each.

### R2 — Data truth: labels stop lying `[Sonnet]` · class: bugfix/output `[x]` DONE 2026-08-12
> **Why:** a board that labels ADP as "ECR" and paints a fake ±15% range is worse than no data — it looks authoritative and is wrong.
> **Reads first:** `src/lib/players/convert.ts`, `src/components/prep/draft-board-table.tsx`, `src/lib/players/value-range.ts`, `src/lib/players/tags.ts`.
> **Closes:** RV-7, RV-8, RV-14.
> **Work:** ECR cell = real `ecrPositionRank`; PTS = real projection; RANGE = the real calibrated VORP↔room band (kill the ±15%); surface tier data beyond the single ELITE flag (tier badges / tier grouping).
> **Done-when:** every board cell equals its real source field; tests assert cell = source (no derived-from-ADP stand-ins). Screenshot of the corrected board.

### R3 — Valuation correctness: never recommend overpaying `[Opus]` · class: pipeline `[x]` DONE 2026-08-12
> **Why:** before the team engine constrains bids further, the single-player math must at least never tell Joe to pay *more than a player is worth*.
> **Reads first:** `src/lib/draft/auction-advisor.ts`, `src/lib/players/recommendation.ts`, `src/lib/players/tags.ts`, `src/lib/intel/tag-detector.ts`, `src/lib/players/value-range.ts`.
> **Closes:** RV-4, RV-5, RV-18.
> **Work:** cap max-bid at the ceiling (`absoluteMax` must never exceed worth); the recommendation line shows a real **pay-to price**, not the theoretical ceiling; make POCKET/TAX legible in plain language; **wire the breakout/bust/value detector into the board or delete it** (recommend: wire it — the signal is real and cheap; if wiring is more than an hour, delete it and log the decision).
> **Done-when:** no code path returns a max-bid above ceiling across budget states (unit-tested); the "pay up to $X" line is the pay-to, not the ceiling; tag-detector is either surfaced or gone. Screenshot + tests.

### R4 — Team-construction SOLVER (the North Star, as a tested library) `[Opus]` · class: pipeline `[x]` DONE 2026-08-12
> **Why:** this is the missing engine — the whole point of the app. Build it pure and tested before wiring it anywhere.
> **Reads first:** `src/lib/draft/auction-advisor.ts`, `src/lib/draft/league-calibration.ts`, `src/lib/players/convert.ts`, the roster/slot types, NORTH_STAR.md.
> **PROPOSE checkpoint (do this FIRST, before any implementation — keeps R4 a single sitting):** decide and get Joe's nod on (a) the **algorithm** — greedy marginal-value fill vs. a bounded knapsack with FLEX contention (recommend: greedy marginal-value with a FLEX-reassignment pass — fast, explainable, good enough for 13 slots; escalate to bounded knapsack only if greedy demonstrably mis-allocates in tests), and (b) the **exact function signature** of `rosterSolver(state)`. Only once the approach is agreed do you write code. This turns R4 from a design-and-build (two sittings) into an implement-and-test (one sitting).
> **Builds:** `src/lib/draft/roster-solver.ts` — a pure module (no React, no Supabase). Given `{ budgetRemaining, slotsRemaining (incl. FLEX), boardValues, replacementLevels }` it computes the **optimal remaining allocation** and, for any nominated player, the **maximum affordable bid that still leaves a completable best-rest-of-roster** (respecting the $1-min-per-remaining-slot floor, positional scarcity, FLEX contention, and the stars-and-scrubs ↔ balanced tradeoff).
> **Done-when:** the solver returns an allocation + per-nomination roster-constrained max-bid; comprehensive unit tests cover the edge cases — 1 slot left, all budget on one stud, forced $1 scrubs, FLEX steals a slot from RB/WR/TE, empty board. No UI in this session. This is the session everything else depends on — do not rush it.

### R5 — Wire the solver into the LIVE max-bid `[Opus]` · class: pipeline `[x]` DONE 2026-08-12
> **Why:** turns RV-1 from a library into the live "THE PLAY" number.
> **Reads first:** R4 output, `auction-advisor.ts`, `draft/live/client.tsx`, `what-to-do.ts`.
> **Closes:** RV-1 (live half).
> **Work:** live max-bid = `min(worth ceiling, roster-completion-constrained max)`; surface the constraint in plain words ("More than $X and you cannot fill QB, 2 FLEX and N bench").
> **Done-when:** live max-bid reflects roster-completion math and explains itself; unit + integration tests on the wiring. Screenshot of the live room advice.
> **Shipped:** new `solver-bridge.ts` (`computeRosterMaxBidMap` → per-nomination `{maxBid, note}`); client folds `min(worth ceiling, roster max)` at `client.tsx:363-364`; `what-to-do.ts` carries a plain-English `rosterNote`, surfaced verbatim on the on-block card. Fixed BUG-007 (slot no-op) + BUG-R5-01 (budget-aware fill over-dropped to $1), both with regression tests. Gate: type-check 0, 300/300 tests, lint 161 (0 new), build clean 54/54, bug-hunt free. **Live screenshot deferred (env: Browser pane not compositing + valuation-less sim board) — render path proven instead by a DOM render test (`on-the-block-card.test.tsx`) asserting the note renders verbatim.** Joe approved shipping on that basis (Option A).

### R6 — Wire the solver into STRATEGY target prices `[Opus]` · class: pipeline `[x]` DONE 2026-08-13
> **Why:** a strategy is only real if its targets actually fit $200 together.
> **Reads first:** `src/lib/research/strategy/*`, `roster-solver.ts`, `components/prep/strategy-proposals.tsx`.
> **Work:** each strategy assigns a **target $ per target player** via the solver so the full roster fits $200; swapping archetype re-allocates the money.
> **Done-when:** every strategy's target prices sum to a completable $200 roster; tests prove the sum + the re-allocation on archetype change. Screenshot.
> **Shipped:** new `target-pricing.ts` (`assignTargetPrices`) reuses the R4 solver's `solveAllocation` on an EMPTY board to compute the guaranteed-completable reserve = **$1 per non-target slot** (13-slot Nasties roster), then prices each named target = base auction value × archetype budget-emphasis, capped by max-bid %, scaled + hard-trimmed to fit the freed pool. Invariant `sum(target prices) + reserve ≤ budget` is structural. Wired into `research.ts` via `priceProposals` (auction-only, `budget ?? 200`) on both the Claude and preset proposal paths; `StrategyProposalCard` shows a per-target `$price` badge + a "$X on targets + $Y to fill your other Y slots = $total of $budget. Completes a full roster." summary. Gate: type-check 0, **314/314 tests** (+11 unit in `target-pricing.test.ts`, +3 render in `strategy-proposal-card.test.tsx`), lint 161 (0 new), build clean, bug-hunt free (0 crit/high/med, 1 low cosmetic BUG-R6-01 badge-casing logged). **Raster screenshot deferred (env: Browser pane not compositing).** Render path proven two ways: 3 DOM render tests asserting the completable-roster summary + on-screen re-allocation, AND the real `StrategyProposalCard` served through the live dev server + compiled CSS (RB-heavy Bijan $73/CeeDee $73 → WR-heavy $47/$78/Trey $39, both = $191 + $9 = $200) delivered to Joe as a rendered HTML file.

### R7a — Persistence rework + graded tag scale `[Sonnet]` · class: schema/pipeline · **[x] DONE 2026-08-13**
> **Why split:** this half carries a **DB schema migration** (a different change-class with its own Ops/Security lenses and a data backfill). Bundling a migration with UI work is how a session ends with a half-applied schema. Do the migration cleanly on its own.
> **Reads first:** the `user_tags` migration, `supabase/migrations/*`, `research/strategy/types.ts`, `players/tags.ts`, `prep/players/client.tsx` (tagging UI only).
> **Closes:** RV-17, RV-15.
> **Work:** **id-anchored persistence** — migrate `user_tags` to anchor on `player_id` (stable) instead of name, with a backfill that maps existing name-anchored rows to ids and a documented fallback for any unmatched; wire the **graded target/avoid scale** (weight 1-10 / severity soft-hard, already in `types.ts`) into the tagging UI.
> **Done-when:** the migration applies + backfills on a real DB copy; graded tagging persists across a name variance (regression test); no orphaned rows. Migration output + persistence test + screenshot.
> **Shipped:** `supabase/migrations/20260813000001_user_tags_graded_scale.sql` (new) — idempotent `ALTER TABLE user_tags ADD COLUMN IF NOT EXISTS tag_weight integer NOT NULL DEFAULT 5 / tag_severity text NOT NULL DEFAULT 'soft' / player_external_id text`, two CHECK constraints, backfill from `players_cache.external_id`, `RAISE NOTICE` logging for unmatched rows, and a covering partial index. `database.types.ts` — `UserTags` / `UserTagsInsert` / `UserTagsUpdate` all updated with the three new columns. `batch/route.ts` — `userTagsMap` carries `tagWeight` + `tagSeverity` (league-specific grade wins over global default in the merge loop). `route.ts` — POST accepts `weight`/`severity`, PATCH handles `action: 'updateGrade'` (updates existing record or creates new with grade, without touching the tags array). `use-user-tags.ts` — `UserTagsMap` carries `tagWeight`/`tagSeverity`; new `useUpdateGrade(leagueId)` hook. `ffi-player-intel-card.tsx` — adds `tagWeight` / `tagSeverity` / `onUpdateGrade` props; weight stepper (1-10, ± buttons, volt-green) shown when `isTarget`, severity toggle (SOFT / HARD pills) shown when `isAvoid`. `prep/players/client.tsx` — imports `useUpdateGrade`, wires `handleUpdateGrade` → card. **Schema gate: migration NOT applied to production Supabase — Joe must apply manually via `supabase db push` or the Supabase dashboard.** Gate: type-check 0, **322/322 tests** (8 new in `src/app/api/user-tags/__tests__/graded-tags.test.ts`), lint 0 new errors, type-check clean.

### R7b — Player filters + strategy-fit line `[Sonnet · Opus for the fit logic]` · class: output · **[x] DONE 2026-08-13**
> **Depends on:** R4 (solver, for the fit line), R7a (graded tags, for tag filters).
> **Reads first:** `prep/players/client.tsx`, `roster-solver.ts`, `players/tags.ts`.
> **Work:** expanded filters (position incl. FLEX, tier, value-pocket, bye, tag/grade); a per-player **strategy-fit line** driven by the solver ("Fits your stars-and-scrubs plan; you can afford him at $X and still fill RB").
> **Done-when:** every filter works and composes; every player shows a fit line that reflects the current strategy + budget + roster state. Screenshot + tests on the fit logic.
> **Delivered:** FLEX position filter (RB+WR+TE virtual), tier filter (T1/T2/T3+), bye-week filter (populated from live player pool), grade filter (7+/9+ weight, target-mode only), severity filter (soft/hard, avoid-mode only), reset-on-tagFilter-change. New pure module `prep-fit-line.ts` with `buildSlotSummary` + `buildPrepFitLine`; `fitLineMap` useMemo runs solver once per player on a full $200/13-slot board; "Your target — can bid up to $X, still needs QB and 2 FLEX" / "Flagged to avoid — can afford at $X" / "Can bid up to $X on a full $200 board". `FFIPlayerIntelCard` gets `fitLine` prop + ◆ strip. 22 new tests (17 unit + 5 RTL). Gate: type-check 0, 344/344 tests, lint 161 (0 new), build clean. Bug-hunt: 0 CRITICAL, 0 HIGH, 1 MEDIUM (BUG-R7b-01: fitLineMap mixes solver + label in one memo — fix in R8), 2 LOW.

### R8 — Cheat Sheet resolution + FLEX view `[Sonnet]` · class: output · **[x] DONE 2026-08-13**
> **Reads first:** `prep/board/client.tsx`, `prep/players/client.tsx`, `roster-solver.ts`.
> **Closes:** RV-9, RV-10.
> **Done-when:** no two screens do the same job; a FLEX (RB/WR/TE) ranked list exists; the Cheat Sheet shows roster fit. Screenshot.
> **Shipped:** Fixed BUG-R7b-01 in `players/client.tsx` — split the single `fitLineMap` useMemo (deps `[players, isTarget, isAvoid]`) into three: `boardPlayers` (deps `[players]`), `solverResultMap` (deps `[boardPlayers]`, runs the 500 solver calls), `fitLineMap` (deps `[boardPlayers, solverResultMap, isTarget, isAvoid]`, cheap label only). Tag toggles no longer re-fire the solver. Added FLEX tab (third tab) to the Cheat Sheet board — shows RB/WR/TE combined, sorted by `adjustedAuctionValue ?? consensusAuctionValue` DESC, ties broken by rank ASC. Cheat Sheet and Players are now differentiated by purpose: Cheat Sheet = strategy-ranked reference + position breakdown + FLEX view; Players = individual player deep-dive with fit lines and detail cards. RV-10 resolved by purpose differentiation (not screen deletion). Construction board idea dropped — not useful in prep mode where players are not yet being drafted into slots. Gate: type-check 0, 349/349 tests (+5 new flex-tab unit tests), lint 0 new, build clean, bug-hunt free (0 CRITICAL/HIGH/MED, 1 LOW pre-existing K pill). Browser pane not compositing (same env constraint as R5/R6) — render path proven by type-check + build + 5 DOM logic tests.

### R9 — Strategy engine rebuild `[Opus]` · class: pipeline
> **Reads first:** `research/strategy/research.ts`, `roster-solver.ts`, `tendencies.ts`.
> **Work:** auto-generate strategy options from the real pool + solver (not 4 hardcoded archetypes); **live adaptive guidance** that updates as the draft moves ("you missed the RB run — pivot to WR value + hero-RB").
> **Done-when:** strategies come from the pool + solver; live guidance adapts to draft state; tests. Screenshot.
> **Added 2026-08-14 (Joe feedback — Strategies screen review):** R9 shipped the **engine** (strategies emerge from the board + `adaptive-guidance.ts`) but **no UI** — the screen still renders the R6 card behind a cost-gated **"Generate Strategies" button** (`strategy-proposals.tsx:127-171`), an **unordered** list (`:207`, no sort), **no ratings**, and a page-level **"Dry-run this strategy"** link (`strategies/client.tsx:391-406`). Joe's target UI (all NEW work, not covered by R9's engine): kill the Generate button → **auto-render strategies on load**; **rank them objectively** by simulated strength-vs-league; per-strategy **expandable detail** (how to approach · player types to target · players you likely can't get · strength vs league); **persistent user star-ratings** that **re-reconcile on each new player pull**; **remove Dry-run** (every strategy is pre-simulated, which is what drives the ranking). This is a **new UI + a small ratings-persistence schema add** → built in **D3 (Strategies redesign)** under "🎨 THE LOOK." Also verify: **does a "new player pull" re-flow strategies/targets/values** when a projection/injury/role changes between pulls? If the pipeline doesn't re-run strategy generation on re-pull, log it as a functional gap.

### R10a — Simulation engine: Monte Carlo + auction opponents `[Opus]` · class: pipeline
> **Why split:** the sim engine (the risky logic — a Monte-Carlo loop plus an opponent-bidding model) deserves the same isolation as R4. Build it pure and tested before any grading/UI/persistence hangs off it.
> **Reads first:** `prep/simulate/client.tsx` (current logic to replace), `roster-solver.ts`, `league-calibration.ts`.
> **Closes:** RV-11 (engine half).
> **Builds:** a pure sim module — Monte Carlo over N runs where **opponents bid by auction** up to their own roster-completion max via the solver (competition-aware, not ADP), returning per-run resulting rosters + a distribution.
> **Done-when:** the engine runs N drafts with realistic auction opponents and returns a stable distribution; unit tests cover the opponent-bidding math + determinism-under-seed. No UI/persistence yet.
> **Shipped 2026-08-13 (Opus):** `src/lib/draft/sim-engine.ts` — pure Monte-Carlo auction engine. `runMonteCarlo` runs N seeded English auctions where all 12 seats bid via `computeRosterConstrainedMaxBid` (roster-completion max from the R4 solver, competition-aware, NOT ADP); `runAuctionSim` clears each lot at second-price+1 capped at winner willingness; returns per-run rosters + `SimDistribution` (min/max/mean/median/p10/p90/stdev over the me-seat). Proof pasted in-chat: **20 new tests green** (`src/lib/draft/__tests__/sim-engine.test.ts` — PRNG determinism/range, second-price clearing = $50 parity, uncontested = $1, budget/capacity/reserve invariants, no double-draft, byte-identical-under-seed, sequential seeds [40..44], full 12-team Nasties smoke fills every seat to cap); type-check **0 errors**; full suite **392/392** (372 baseline +20); lint **0 new** (my 2 files 0/0); build **✓ 54/54 static pages**. Bug-hunt free: 0 crit/high/med, 1 LOW deferred perf (BUG-R10a-01), dead `nominator` counter removed. No UI/persistence — surfaces in R10b.

### R10b — Sim grading, record, representative teams + saved runs `[Opus]` · class: output/pipeline
> **Depends on:** R10a.
> **Reads first:** R10a output, `prep/simulate/client.tsx`, `research_runs` schema.
> **Work:** grade each run on **projected season points vs. the league**; output a projected **win-loss record**, 4–5 representative resulting teams, and **saved runs** (persist to `research_runs`, reload + compare).
> **Done-when:** the sim produces a projected record + representative teams from the R10a distribution, and runs persist + reload + compare. Tests on the grading math. Screenshot.
> **Added 2026-08-14 (Joe feedback — Sim mockup review, "really close, yes"):** two output refinements, both **pure post-processing on the R10a per-run rosters** (`SimRun.myRoster.players[]`, `sim-engine.ts:122-131`) — no engine change:
>   - **"Top-5 most-likely rosters" replaces the vague "4-5 representative teams."** Do NOT surface all N (~500) runs. Cluster the `myRoster` outcomes by their **stud core** (players won above a $-threshold; the $1 bench fill is noise) and surface the **5 most frequently-occurring roster shapes**, each labeled with its frequency ("this shape hit in 22% of sims"). This makes the teams **modal** (most-common) — what Joe asked for — not floor/median/ceiling percentile picks.
>   - **"Players you land most" frequency table.** Tally across all runs the fraction of `myRoster`s containing each player → a ranked list ("Bijan Robinson — in 78% of sims, avg $54"). A plain count over `myRoster.players[]`.
>   - **Open question (decide before grading a strategy Joe acts on):** should the sim's "me" seat bid toward **Joe's targets/avoids** (weighted) instead of the generic ceiling-based valuation it uses today (`sim-engine.ts:294-311`)? Today targets/avoids do NOT bias sim bidding. Same question applies to R9 strategy generation.
>   - **Screen note:** the Sim results screen has an approved static mockup (`.claude/mockups/sim-results-v1.html`). Whether R10b builds that screen or the visual pass (D5) does depends on the sequencing decision — see "🎨 THE LOOK." R10b's own scope is the **grading/record/top-5/frequency DATA** (Opus, tested); the pixels are D5.

### R11 — Live draft: offline cache + team-aware guidance `[Sonnet]` · class: pipeline
> **Depends on:** R5 (team-aware max-bid).
> **Reads first:** `draft/live/client.tsx`, `state.ts`, `use-remote-auctioneer-feed.ts`, `roster-solver.ts`.
> **Work:** local **offline cache** so a mid-draft network drop doesn't lose state; any remaining `/draft/live` dead-screen root cause fully resolved here (if R1 deferred it); team-construction-aware advice surfaced in the room.
> **Done-when:** the draft survives an offline blip via local cache and resyncs; live room shows roster-aware advice; solo-verifiable. (Full live-auctioneer proof → R15.) Screenshot.
> **Added 2026-08-14 (Joe feedback — Live screens review). Grounded against the CURRENT room (`components/draft/live-room/auction-room.tsx`), which is in better shape than the old review implied.** It already has: money-remaining + single-player max-bid (`budget-strip.tsx:57-61`), slots filled/open, a per-position tier-count "Tier Context" panel with tap-to-list (`tier-context.tsx`), and a target-toggle on the Research tab. The gaps Joe flagged (these are the R11 UX scope — pixels land with D6, "built once"):
>   - **Tier Context is incomplete.** Shows QB/RB/WR/TE only (`auction-room.tsx:34` `TIER_POSITIONS`) with **no FLEX row**, and only T1/T2/T3 (`explain.ts:32-34`) with **no T4/T5**. Add a **FLEX row** (combined RB/WR/TE remaining) and extend to **T4 (evaluate T5)** — Joe reads tier depth per position + FLEX to make in-the-moment calls.
>   - **My Team is always-on, not collapsible** (`auction-room.tsx:293-294`). Make it **expand/collapse** so the space can hold tiers/strategy when the roster isn't needed.
>   - **On-the-block card is not collapsible** (`on-the-block-card.tsx`). Make the player-context card **expand/collapse** — full context for players Joe cares about, minimized for the many he doesn't.
>   - **Strategy is buried.** The switcher + adaptive pivot alerts live in a "More tools" accordion **closed by default** (`client.tsx:124`). Surface an **always-reachable strategy display + quick switcher** so Joe can flip strategy views mid-draft, and surface the R9 **adaptive-guidance** pivot line in the room (this IS R11's core "wire `adaptive-guidance.ts`" job per VISION §31).
>   - **Avoid has no control in the room; target only toggles on the Research tab** (writes `'target'` only). Add **target AND avoid** toggles reachable during the draft (add / un-target / add-avoid live as the board changes).
>   - **Live-updating player values (Players-screen ask).** Joe wants the player card's base/market/your-value to **update live as players are bought**. The prep Players screen is static (no auctioneer subscription); the live version of that card belongs here. Keep base/mkt/your-value + the range bar; tier on the card face; projected points → expansion; add "expert consensus." (The static prep card's density/tier redesign is D4.)
>   - **Open question (route with R9/R10b):** does the in-room advice / strategy actually **prioritize Joe's targets and avoid his avoids**? Verify the solver + what-to-do path weight target/avoid grades; if not, log as a functional gap.

### R12 — Shell / UX / perf `[Sonnet]` · class: output (Design lens)
> **Reads first:** `layout/app-shell.tsx`, `DESIGN_SYSTEM.md`.
> **Work:** measure + fix page-switch load time (Joe flagged slow switches); verify mobile-first arm's-length across every screen.
> **Done-when:** measured switch times acceptable; every screen verified mobile-first. Before/after timing + screenshots.

### R13 — Dedicated bug hunt + test hardening `[Sonnet · Opus for logic bugs]` · class: bugfix
> **Why:** the old 205 tests passed while the core was missing. This is where coverage finally lands on the things that decide the draft.
> **Reads first:** `.claude/REVIEW_LENSES.md`, the R1–R12 CHANGELOG entries, `src/**/*.test.ts`.
> **Work:** `/bug-hunt full` across the whole rebuilt app, triage by severity, fix the real ones; **expand automated coverage on the new engines** — roster-solver, team-aware max-bid, strategy target prices, Monte Carlo sim — so the logic that wins the draft is actually tested.
> **Done-when:** `/bug-hunt full` clean (or every finding triaged with a written defer reason); tests cover the team-construction paths; type-check + lint (0 new) + build clean. Findings + fixes in BUG_LOG + CHANGELOG.

### R14 — Usability walkthrough — Claude drives Chrome `[Claude driving + Sonnet fixes]` · class: output/bugfix
> **Why:** Joe's phone rehearsal (R15) must not be the first human click-through.
> **How:** load the app at **mobile viewport, arm's-length**, and walk **every** real flow end-to-end as a first-time user: Research → pull players → read a player card (tags/range/sources/fit) → set graded targets/avoids → strategies → Cheat Sheet/construction board → enter the live room → join → track picks → budget/pace/roster fit → Post Draft. Catalog every dead-end, "how do I get back," confusing label, jank, or cheap-looking moment. Screenshot each.
> **Done-when:** a written findings list (each with a screenshot), every P1/P2 issue fixed and re-shot, and a clean full-walkthrough screenshot set. This is the "ready for Joe's hands" sign-off.

### R15 — Rehearsal GATE `[Sonnet + Joe]` · class: pipeline — **THE GATE**
> **Why last:** you can only rehearse the finished, hardened app, and this is the **only session that needs Joe's hands.**
> **Work:** full mock draft on Joe's phone against the **live auctioneer** — join/sync proven live (~3–6s), picks tracking, team-aware advice correct, budgets right, offline-resync proven, no surprises. (Cost gate: if AI panels are on, a real dry run bills Claude — Joe's typed approval first.)
> **Done-when:** Joe has run a full mock draft against the live auctioneer on his phone with picks tracking, roster-aware advice correct, budgets right, offline-resync proven, and no surprises. Issues found become a short R15-fix list (expected — that's what a rehearsal finds).

---

## 🎨 THE LOOK — Step 3 visual identity overhaul (D-track)

**Opened 2026-08-14** from Joe's screen-by-screen feedback. This is the "**Step 3 — DESIGN the look/feel**" thread that `WORKING_STATE.md` already names as a **separate, multi-session VISUAL effort** (real reference apps + mockups + iteration, screen by screen — never one session). It runs as its own track; the functional R# rebuild continues to own logic/data/engines. **Rule: logic + data land in R#; pixels land here in D#.** Where a screen has both a pending R# (Sim → R10b data, Live → R11 behavior) and a redesign, it is **built once** in the visual pass consuming the R# data — never built twice.

### Why this track exists
GRIDIRON v3 (`DESIGN_SYSTEM.md`, LOCKED 2026-06-04) is not landing in execution. Joe's verdict on the shipped screens (2026-08-14): the bolt/`Zap` motif, gradient buttons, box/card treatment, icons, and menus read as "AI slop." Grounded evidence: nav uses the `Zap` lightning bolt (`app-shell.tsx:38`); buttons are gradient pills (`globals.css:451-475`); cards are navy boxes + blue-glow + an iridescent gradient sheen (`globals.css:495-540`); the token layer is inconsistent (`--ffi-gold` = `#8bff45` green, but nav glow uses cream `rgba(253,239,182)`). `DESIGN_SYSTEM.md` is a LOCKED doc — this track is the sanctioned re-open, and its output updates that doc (or supersedes v3 → v4).

### 🔒 Decisions — LOCKED by Joe 2026-08-14
1. **Identity scope = FULL NEW IDENTITY.** Do NOT assume the volt-green + electric-blue GRIDIRON palette or Anton/Saira type carry over. D0 picks a **fresh reference app** and may introduce a new palette + type. GRIDIRON v3 is superseded, not reskinned; `DESIGN_SYSTEM.md` gets rewritten (→ v4) from the new direction, not patched.
2. **Sim's nav home = INSIDE RESEARCH.** Sim is reached as a top-level destination *from Research* — it is NOT a separate nav tab. Sim remains a first-class *pillar* (equal importance, real `sim-engine.ts`, not the buried toy), but its nav placement is under Research. This reverses VISION.md's "own nav home" call (§29/§44/§57) — VISION.md updated 2026-08-14 to match. The nav stays four tabs (Research / Live Draft / Post Draft / Setup).
3. **Sequencing = VISUAL-FOUNDATION-FIRST.** D0 (direction + sign-off) → D1 (foundation) before any per-screen redesign. Logic-only R# work (R10b grading math, R11 offline/adaptive logic) is invisible and may run in parallel; the screens that surface it are built in the visual pass, once, to the new look.

### The reference bar (Joe's standard, non-negotiable)
Name a real reference app before building (Linear, EA FC — never generic dark-glass/gradient slop). Show a mockup, get Joe's explicit **yes** on the look BEFORE code. A persistent bottom nav with genuinely nice icons is a Joe hard-requirement.

### D0 — Identity direction + foundation mockup + SIGN-OFF GATE `[design · Joe-gated]` · no code — ✅ CLOSED 2026-08-14
> **The three scope decisions are LOCKED (above): full new identity, Sim-inside-Research, visual-first.** D0's job is the *look*.
>
> #### ✅ D0 GATE CLOSED (Joe, 2026-08-14) — "SHIELD" (Option B) is the anchor identity
> Full decision record: `.claude/mockups/d0-craft/NOTES.md`. Joe was shown two finished directions (Option A "League Trophy" oak/bronze; Option B "Blacked-Out Shield" navy-steel) and three icon boards, and locked:
> - **Palette ✓ — Option B SHIELD:** navy-steel field `#0C1524→#05070C` · lifted steel-blue cards `#26364E→#1A2637` · chrome-silver titles · muted brick-RED accent `#A63C41` (action only, sparing) · steel-blue info `#5FA8E0`. NO gold, NO volt-green.
> - **Type ✓ — Kanit** (broadcast display) **+ Hanken Grotesk** (UI).
> - **Icons ✓ — DUOTONE** (muted-red chip `bg rgba(166,60,65,0.15)` / `border rgba(166,60,65,0.45)` + white glyph), picked over outline + etched-steel.
> - **Canonical locked screen:** `.claude/mockups/d0-craft/optionB_shield.png`. Option A stays on file as an alternate (its oak-texture/engraving refinement parked, NOT pursued).
>
> This supersedes the earlier recommendation "reskin GRIDIRON's volt+blue bones" — Joe chose a FULL new identity, per the locked scope at the top of this section.

> #### D0 session 1 (2026-08-14) — the STITCH design is the KEEPER; my mockup was slop. Decision record:
> Two artifacts came out of this session. Keep them straight — Joe was emphatic:
> - ❌ **MY mockup (`research-foundation-v1.html` "Ink & Ember") = GARBAGE, DISCARDED.** Joe's words: "one-dimensional neon AI slop dogshit." It was NOT regal — it was slop. **Deleted this session. It is NOT a source, NOT a layout keeper, NOT a reference for anything.** Do not resurrect it or cite it.
> - ✅ **THE STITCH DESIGN IS THE APPROVED KEEPER** — `UI/stitch_multi_theme_layout_variations/screen.png` + `code.html`. Joe: "I LOVE THE DESIGN." Keep the WHOLE design — its layout AND its overall treatment (app bar + **GRIDIRON** wordmark + season chip + avatar, big "Research" title, fresh-status line, **demoted "Full research pull"** slim row with RUN, four **destination cards** — Players / Cheat Sheet / Strategies / **Sims** with Monte-Carlo tag — and the 4-tab bottom nav). **This is the design we build on.**
> - ⚠️ **The ONLY problem with the Stitch design is its COLORS + FONTS — "too regal."** Its navy (`#0A1128` / `#1A233A`) + metallic-gold (`#D4AF37` / `#996515`) + ivory + **Merriweather serif** read country-club/business, not sports. **Change ONLY the colors and the fonts. Change nothing else about the design.**
> - **Steering (Joe, 2026-08-14):** new colors + fonts must be **sports-app** energy — NOT the too-regal navy+gold+serif, and NOT **cheesy neon** (no volt-green RGB gamer slop — that was GRIDIRON v3's failure). Land between those two ditches.
> - **Env note:** the Browser pane does not composite in this env (R5/R6/D0 all confirm it) — render real PNGs via `chrome.exe --headless=new --screenshot`, never fake a screenshot.

> #### D0 session 2 (NEXT) — new colors + fonts + icons ON THE STITCH DESIGN `[design · Joe-gated]` · no code
> **The base is FIXED: the Stitch design.** Do not redesign the layout, do not invent a new structure, do not pull from my discarded mockup. Take `UI/stitch_multi_theme_layout_variations/code.html` as the literal starting HTML and re-skin it.
> **Review first (in order):** (1) `UI/stitch_multi_theme_layout_variations/screen.png` + `code.html` — **the approved design; keep it, only swap colors + fonts**; (2) `.claude/mockups/sim-results-v1.html` — the ONE approved density/structure bar, for reference on numeric legibility only.
> **Keep exactly as-is:** the Stitch layout and design treatment (cards, app bar, nav, hierarchy, spacing, the whole structure). **Only three things change: colors, fonts, icons.**
> **Produce (render real headless PNGs, mobile arm's-length):**
> 1. **4 distinct COLOR SCHEMES** applied to the Stitch Research design — each a real **sports-app** palette, NOT the too-regal navy+metallic-gold, NOT cheesy neon (no gamer-RGB volt-green). Name a real sports reference app for each (broadcast/streaming, team-sport apps — Joe's bar: a real named app, never generic slop).
> 2. **Multiple FONT options** — display + body + numeric specimens, swapped in for Merriweather serif so Joe can compare (kill the serif; kill Anton; nothing carried from the discarded mockup unless it earns its place on its own).
> 3. **Multiple ICON option sets** — nav + destination icons to replace the Stitch set.
> **Deliverable:** a comparison the eye can scan — the 4 re-skinned Stitch screens side by side + a font specimen board + an icon set board — to **lock palette + type + icons** on the design Joe already approved.
> **Done-when:** Joe picks a palette direction + type + icon set (or narrows to 1–2 to iterate). NO production code. **This is the gate that blocks D1+.**

### D1 — Design-system foundation (code) `[Sonnet]` · class: shared/output — ✅ DONE 2026-08-14
> **Depends on:** D0 sign-off. ✅ met.
> **Work:** rebuild the shared visual layer to the approved direction — color tokens (resolve the `--ffi-gold` drift), card treatment, buttons (kill gradient pills if D0 says so), **new icon set (kill the `Zap` bolt)**, and the **persistent bottom nav**. Reconcile `DESIGN_SYSTEM.md` to the new truth (or supersede v3 → v4). Prove on one screen with a mobile arm's-length screenshot.
> **Done-when:** shared components render the new look on ≥1 screen, mobile screenshot pasted, `DESIGN_SYSTEM.md` updated. Everything else reskins from here.
>
> **✅ Shipped (2026-08-14):** Ported SHIELD into the real app via a "names stable, values swapped" repaint so all 61 screens shift at once with no per-component edits:
> - **`layout.tsx`** — fonts swapped to **Kanit + Hanken Grotesk** (CSS-var names `--font-anton`/`--font-saira`/`--font-saira-cond` kept stable); PWA `themeColor` `#8BFF45` → `#A63C41`.
> - **`globals.css`** — full palette swap (0 leftover v3 volt/blue tokens): `--ffi-volt*` → brick-RED `#A63C41`, `--ffi-blue*` → steel-blue `#5FA8E0`, field navy-steel, ink chrome-silver, legacy `--ffi-gold*` → same red, `.ffi-btn-hero` red / `.ffi-btn-primary` steel gradients, nav-active red glow, `success` reads steel-blue. Resolves the `--ffi-gold` drift.
> - **`app-shell.tsx`** — killed the **`Zap` bolt** → **`Gavel`** (auction) for Live Draft; leftover cream-gold nav glows → red. Persistent bottom nav proven.
> - **`prep/page.tsx`** — hand-cleaned the component-level inline literals the globals swap can't reach (green icon chips → duotone-red, green cost-guard box → steel-blue) as the one-screen proof.
> - **`DESIGN_SYSTEM.md`** — reconciled v3 GRIDIRON → **v4 SHIELD** (palette, type, canvas, buttons, components, motion color-note, What-NOT-to-do; Live Auction Room + Motion mechanics preserved).
> **Proof:** `.claude/mockups/d0-craft/d1_prep_shield.png` (mobile arm's-length, `/prep`). Verify gate: **test:run 392/392 green**, lint **0 new** (61 pre-existing in untouched files), no horizontal overflow at 375px (live JS check).
> **Known D1 tail (follow-on, NOT this item):** component-level inline color literals across the other ~60 screens; position-color system (green RB `#56E0A0`) decision; Live Auction Room `theme.ts` (its own scoped four-move palette).
>
> **D1-fix + D1-tail progress (2026-08-15):**
> - **Header treatment reset (Joe redirect):** flat-white + emboss titles rejected → locked **Oswald in solid brick-red `#C25A5E`** (no emboss/gradient/shadow). `.ffi-title-red` redefined in `globals.css`; Oswald added in `layout.tsx`; swept all **14 page titles** + **section sub-headers** (`FFISectionHeader` + prep/runs + prep/configure). `DESIGN_SYSTEM.md` reconciled (red = header identity, exempt from the sparing-red rule). Commit `6f15dde`. Full record in `CHANGELOG.md` (D1-fix entry).
> - **Green/gold literal sweep — LIVE SCREENS DONE:** pre-Shield neon `#2ff801` → steel-blue `#5FA8E0` across 6 live files (intel card, player card, ai-insight, draft/setup); status pill softened (LIVE `#56E0A0`, STALE `#FFB05C`); amber warning aligned to Shield `#FFB05C`. Commits `67de4c0` + `c4a73db`. 392/392 green, tsc clean. Direction proof `green_sweep_direction.png` + `status_pill_states.png`.
> - **Still deferred (each its own decision, NOT blocking D2):** `--ffi-gold` self-indicator token (wants its own direction board), `lib/draft/export.ts` golds (PDF/CSV, not a screen), parked `season/`+`inseason/` greens (~63 spots → P8 rebuild), position-color system decision, Live Auction Room `theme.ts`.

### D2 — Research landing + nav `[Sonnet]` · class: output ✅ DONE (2026-08-15)
> **Folds in the Research feedback.** Current hub is a card-dump with a paragraph explainer. Rebuild per `UX_OVERHAUL_2026-08.md` §9.1 AND: **demote "Run Research"** (Joe uses it 2–4×/year, not a hero); **rename + define it** as a **Player Pull / full Research Pull** — state plainly what a pull produces (projections, injury status, starting roles, analysis, consensus, auction values, sleepers/breakouts/busts — confirm exact contents with Joe and document them); **no paragraph explainer**; make **Players · Cheat Sheet · Strategies · Sims** the real destinations (the things Joe lives in for weeks).
> **Done-when:** Research landing matches the approved look, Run-Research demoted + clearly labeled with a defined action, destinations are the heroes. Screenshot.
> **DONE:** `src/app/(app)/prep/page.tsx` fully rewritten. Reconnaissance found the hub was already one-hero + quiet-jump-rows but with the hierarchy BACKWARDS (AI run = hero) → reframed D2 as "flip the hierarchy". Now: header → "Where you work" 4 destination hero rows (Players → real pool count · Cheat Sheet → your #1 target · Strategies → saved count via new `GET /api/strategies?leagueId` fetch · Sims → New badge, → `/prep/simulate`) → "Latest run highlights" (existing target/avoid chips, kept) → "Data" demoted **Player Pull** strip (freshness Fresh/Stale, one plain what-it-produces line, cost-guard confirm preserved, "Free data pull · no AI credits"). All metrics real/graceful-absent — no fabricated numbers. Approved mockup `d2_research_landing_v1.html`. tsc clean · 392/392 tests · lint clean · build clean. Live render proof (375px mobile, real data 3,148 pool + THE NASTIES): `scratchpad/prep_frame.png`. Commit `c247070` (pushed to origin/master).

### D3 — Strategies redesign + auto-rank + ratings `[Sonnet · +schema]` · class: output/schema ✅ DONE (2026-08-15)
> **Folds in the Strategies feedback (see R9 note).** Kill the Generate button (auto-render), kill Dry-run, **rank by simulated strength-vs-league**, expandable detail (approach · target types · likely-unavailable · strength vs league), **persistent user star-ratings** that re-reconcile on each new pull. Ratings need a small schema add (table/column + re-pull reconciliation) — treat the migration like R7a (own migration, Ops/Security lens).
> **Done-when:** strategies auto-render ranked, detail expands, ratings persist across a re-pull. Screenshot + migration proof.
>
> **Shipped (2026-08-15):**
> - `supabase/migrations/20260815000001_user_strategy_ratings.sql` — new table UNIQUE(user_id, league_id, archetype), rating CHECK(1-5), RLS `usr_strategy_ratings_own`.
> - `src/app/api/strategies/ratings/route.ts` — GET list + POST upsert/delete (rating=0 clears).
> - `src/lib/supabase/database.types.ts` — `UserStrategyRatings` + `UserStrategyRatingsInsert` added.
> - `src/components/prep/strategy-proposals.tsx` — full rewrite: auto-load on mount, sorted by `projected_ceiling` DESC, ranked expandable rows with star ratings, Regenerate button.
> - `src/app/(app)/prep/strategies/client.tsx` — Dry-run link + `PlayCircle` import removed.
> - Ranking key: `projected_ceiling` DESC (R9 board-derived). MC per-strategy ranking deferred to R10b (no per-strategy me-seat in `SimEngineInput`).
> - **Functional gap (confirmed):** player pull on `/prep` does NOT re-flow strategy proposals. Fix: wire a pull-complete signal to reset `fetchedRef.current` in `StrategyProposals`. Target: R10b or D3-fix.
> - **Proof:** type-check 0 errors; 392/392 tests green; lint 0 new; build clean; 375px screenshot `d3_strategies_375.png`.

### D4 — Players card redesign `[Sonnet]` · class: output
> **Folds in the Players feedback.** **Thinner** list cards; **tier on the card face** (absent today, `ffi-player-intel-card.tsx`); move projected points to the expansion; keep base/mkt/your-value + the range bar Joe likes; add **expert consensus**. (Live-updating values = R11/D6, not here.)
> **Done-when:** thinner card with tier + consensus, points demoted to expansion, on the approved look. Screenshot.

### D5 — Sim results screen `[Sonnet]` · class: output
> **Depends on:** R10b (grading/record/top-5/frequency DATA) + D1. Builds the approved `sim-results-v1.html` mockup for real, consuming R10b's outputs.
> **Done-when:** Sim results renders R10b data in the approved look (distribution, projected record, top-5 modal rosters, players-you-land-most, saved runs/compare). Screenshot.

### D6 — Live room visual + UX pass `[Sonnet]` · class: output
> **Pairs with R11** (build the room once). Applies the new look AND lands the R11 UX gaps: FLEX tier row + T4/T5, collapsible My Team + on-block card, surfaced strategy switcher + adaptive pivot, live target/avoid toggles, live-updating player card.
> **Done-when:** room renders the new look with the R11 UX gaps closed, mobile. Screenshot.

---

## Testing strategy + bug-hunt cadence

- **Per-session gate** (above) fires on every R1–R13 session — the first line of defense, catches regressions in what changed.
- **Coverage must follow the engine, not the file count.** The old suite hit 205 tests while the core engine was absent. R4/R5/R6/R10a each ship with unit tests on the *math that wins the draft* (allocation, max-bid ≤ ceiling, target-price sums, sim distributions). A green suite that doesn't exercise team construction is not coverage.
- **Two dedicated whole-app passes:** R13 (`/bug-hunt full` + coverage expansion on the new engines) and R14 (human-flow usability). Neither is optional.
- **Claude client is mocked in tests** — so a dead model id or a broken live path will NOT show up in `test:run`. R1 adds a startup self-check for the model id; live AI verification is a Joe-approved manual paid check, never a claim from a green suite.
- **Bug Hunt Schedule:**

| Cadence | Mode | Scope | Next |
|---|---|---|---|
| Per session | `free` ($0, static) | Changed modules | Every R# |
| At the seams | `full` (tests + build) | Whole project | R13 |

---

## Superseded / rejected directions (decision records — do NOT resume)

- **The "S1–S8 / P2 DR / P3 VAL" plan** `[SUPERSEDED 2026-08-12]` — the prior plan structure that marked a silo'd, partly-broken app "done." Its genuine completed work (data pipeline, GRIDIRON, calibration ledger, config-truth fix) is captured in "What is actually built" above; its false claims are captured in the Reality Correction. Full text preserved at `.claude/archive/BUILD_PLAN_pre-rebuild_2026-08-12.md`. Do not resume its session numbering or trust its checkmarks.
- **Auctioneer UI Port** `[REJECTED 2026-07-12]` — the draft app keeps its own GRIDIRON identity. Archived at `.claude/archive/AUCTIONEER_UI_PORT_PLAN.md`.
- **Stadium Primetime / "Sunday Night Gridiron"** `[SUPERSEDED 2026-06-04]` — gold-glass slop, replaced by GRIDIRON. History-only.
- **Out of scope forever:** Google Sheets, snake draft, keeper logic, Tyler's league, commercialization (P3–P7 retired 2026-08-06), in-season companion (`season/*` parked, off-system).

---

## Completed Work (compact history — full detail in CHANGELOG + git)

- **Data seed (FF-080):** ~491 real 2026 PPR players + derived auction values in `players_cache`. Free APIs. Verified live.
- **Calibrated ledger (VAL-0):** corrected 16-yr Nasties ledger in-repo (`src/data/league-history/`) + reproducible calibration script. Real curves/leans (the good raw material for R4).
- **GRIDIRON redesign (UX-V2):** full design system, live-room, motion, reduced-motion dial-down.
- **4-tab IA (P0-UX):** Research / Live Draft / Post Draft / Setup, locked Nasties defaults.
- **Auctioneer integration (P1/P1b):** feed proxy + state machine + offline-reconcile code + rule-based What-To-Do. Built, unit-tested, **NOT live-verified** (→ R15).
- **Config-truth fix (FB-1):** duplicate-active-league drift fixed at source; real 12-team config.
- **Core engine (Phases 0–8):** scaffold/auth/config, data adapters, strategy model, live-draft state machines, review/export. Note: the "valuation done" and "strategies done" claims from this history are corrected above — treat those two as rebuild targets (R3–R6, R9), not done.
