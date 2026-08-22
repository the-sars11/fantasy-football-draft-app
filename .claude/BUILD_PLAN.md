<!-- DASHBOARD_STATUS
{
  "currentPhase": "REBUILD + LOOK. Reset to truth 2026-08-12 after the app was marked 'done' while it priced players in a silo and broke on a dead model. North Star: build the best full 15-man roster for $200, not price players one at a time. Two parallel tracks: the R-track (logic/data/engines, R1-R15) and the D-track ('THE LOOK' visual identity, D0-D6). Model-bound, one-sitting each, testing + bug hunts baked in. NO date gating. As of 2026-08-18: R1-R11b done, D0-D6 done (full D-track complete); next buildable is R12 (shell/UX/perf pass). R11 is split into R11a (offline cache, done) + R11b (in-room guidance, done). DEC-1 (targets/avoids bias) RESOLVED = BIAS, wired in R10b, reskinned live in D6. 2026-08-18: Joe locked the D6 cockpit spec (mockup v5) AFTER D6 shipped; DEC-2 records the spec lock + the deterministic-Read engine decision, and D6b is queued to align the shipped live room to v5 + wire the Monte Carlo sim% and rule confidence into the Read.",
  "status": "active",
  "milestones": [
    { "name": "Data pipeline - Sleeper/FantasyPros seed + Supabase cache (real, verified via API)", "done": true },
    { "name": "SHIELD v4 design system (D0-locked + D1-ported 2026-08-14; supersedes GRIDIRON v3)", "done": true },
    { "name": "Per-player calibrated valuation - never recommends above worth (R3), roster context added (R5)", "done": true },
    { "name": "TEAM-CONSTRUCTION ENGINE - best full roster for $200 (R4 solver + R5 live wire + R6 strategy prices)", "done": true },
    { "name": "Strategy engine - board-derived generation + target prices + adaptive-guidance (R6/R9), D3 UI", "done": true },
    { "name": "Live AI panels - model id fixed + error-gated fallback (R1); live path verify is a Joe-approved paid check", "done": true },
    { "name": "Visual redesign D-track - the 5 craft-pass screens (D2 /prep, D3 /strategies, D4 /players, D5 /sim, D6 /live) done 2026-08-18. Remaining screens tracked under SP-track (SHIELD screen-parity) - 2026-08-19 live audit found 572 inline-hex literals across 18 files + only /prep & /prep/players on the shield.tsx standard. SP-track is PAUSED behind functionality (R14 usability walkthrough + R15 rehearsal gate + the line-517 re-flow fix); retained, not deleted, runs last", "done": true },
    { "name": "Simulation - Monte-Carlo engine (R10a) + grading/record/top-5/frequency/saved-runs data (R10b) + SHIELD pixels (D5) all done", "done": true },
    { "name": "Live auction state machine + rule-based advisor - built + roster-aware wired (R5); live-verify pending R15", "done": false },
    { "name": "Auctioneer remote sync proxy - built; live-verify against a running auctioneer pending R15", "done": false }
  ],
  "nextItems": [
    "W-track [Joe-approved 2026-08-21]: wire the headless research engine + a draft-day decide->lock->phone workflow INTO the app UI (see 'W-track' section). W0 [Opus] DONE 2026-08-21 = dataset contract (dataset-types.ts) + storage seam (research:publish -> research_runs kind:'dataset' + GET /api/research-dataset + use-research-dataset hook); proven end-to-end, McCaffrey $60 (room $67, 0.894x) round-trips through the DB. W1 [Sonnet] DONE 2026-08-21 = Strategy Leaderboard screen (prep/leaderboard, ranks 26 strategies by 400-run meanWins, reuses sim-cards, +fixed a W0-introduced /prep hub crash + a stud-combo dup-key bug). W2 [Sonnet] DONE 2026-08-21 = LeagueIntelPanel (HOT/COOL inflation + owner leans) on leaderboard + /prep/board, per-player dataset enrichment merged over /prep/players + /prep/board (land odds, durability price, value bands), durabilityPriceFactor added to EnrichedPlayer contract + writer; commit 1cfea82. NEXT = W3 [Opus]: Decisions + Lock contract (research_runs kind:'plan') + Claude write seam (draft-plan.json + plan:set/plan:lock + GET/POST/DELETE /api/draft-plan).",
    "DEC-1 [Opus/Joe]: RESOLVED 2026-08-17 = BIAS. The sim 'me' seat (R10b) + in-room advice (R11b) bias toward Joe's graded targets/avoids at a bounded weight (respect user_tags weight 1-10 + soft/hard severity); opponents stay generic-ceiling. Encoded as a fixed instruction in R10b + R11b; both unblocked.",
    "R10b [Opus, L]: DONE 2026-08-17. Sim grading + output - season-points-vs-league grade, projected record, top-5 modal rosters, players-you-land-most frequency, saved runs (persist/reload/compare). Me-seat biases to targets/avoids per DEC-1 = BIAS. 45 new tests, 417/417 green; live-verified on port 3003 (screenshot blocked by non-compositing pane, DOM/network proof in-chat). Unblocks D5.",
    "R11a [Sonnet, M]: DONE 2026-08-17. Live offline cache + resync - localStorage write-through cache (session+league + full DraftState) survives a mid-draft network drop; DraftSyncStatus ('synced'|'pending'|'offline') drives a fixed 5s resync retry + online-event listener; resolveInitialDraftState decides cache-vs-server on reload. 456/456 tests green (+15). Live-verified on port 3003 via sim mode's demo endpoint (which 404s by design): offline banner rendered, 20+ real retry PATCH calls logged, localStorage cache confirmed synced:false. Unblocks D6 (alongside R11b).",
    "R11b [Sonnet, M]: DONE 2026-08-17. Team-aware in-room guidance - adaptive-guidance pivot line + StrategyStrip always-on (out of More tools), target AND avoid independently settable on Research rows + on-block card, DEC-1 BIAS verified/fixed end-to-end in roster-solver.ts + what-to-do.ts and wired live. 441/441 tests green; live-verified on port 3003 (pivot line + both toggles confirmed via DOM/network; tag-write persistence proof deferred to R15, verification browser has no Supabase session). Unblocks D6.",
    "R12 [Sonnet, M]: Shell/UX/perf - measure + fix page-switch load time, mobile-first verification across every screen.",
    "R13 [Sonnet+Opus, L]: Dedicated bug hunt + test hardening - /bug-hunt full, real coverage on the new engines. If findings exceed one sitting, catalog here and split fixes into R13-fix cards.",
    "R14 [Claude+Sonnet, L]: usability walkthrough - walk every flow mobile arm's-length, fix P1s this session; P2 overflow becomes R14-fix cards.",
    "R15 [Sonnet+Joe, M]: rehearsal GATE - full mock draft on Joe's phone against the live auctioneer. The only session that needs Joe's hands.",
    "D5 [Sonnet, M]: DONE 2026-08-17. Sim results screen restyled to SHIELD from keeper refs UI/mockup-strategy-detail/ + UI/mockup-post-draft-review/, consuming R10b data; winning-team-% bars (deriveWinningTeamLanded, winning shapes only) + 5-roster carousel + no-em-dash narrative shipped. 429/429 tests green, live-verified with real 30-sim data (screenshot blocked, DOM/network/console proof in-chat).",
    "D6 [Sonnet, L]: DONE 2026-08-18. Live room visual + UX pass - steel-blue primary / brick-red BID-verdict-only reskin (moveTheme recolor), the mockup's red-to-green budget bar rendered instead as a steel-blue progress fill, top 'Next Target' banner removed. R11 UX gaps closed: FLEX tier row + T4/T5, collapsible My Team panel + collapsible on-block card, per-slot target-at-price (NEW room-target-pricing.ts adapter reusing assignTargetPrices, no re-implemented solver math) with expand-to-alternates driven by the active strategy's combinedScore ranking. In-draft strategy switch + live target/avoid toggles were already wired by R11b -- this card only reskinned their pixels. 463/463 tests green (+7 new for the target-pricing adapter), 0 type errors, 0 new lint errors, build compiles clean (56 static pages). Visual confirmation blocked by the same known headless-env limitation as R11b/R12 (no reachable active draft session in this browser sandbox -- see WORKING_STATE.md); DOM/type/test proof only. Full D-track (D0-D6) now complete.",
    "SP-track [added 2026-08-18]: SHIELD Screen-Parity Sprint (13 items, SP-0..SP-7 + validators) -- rebuild every non-SHIELD screen to the real SHIELD bar (a repaint is not a redesign; only D2-D6 got a true craft pass). Tier A (token sweep only) = draft hub/review/board; Tier B (design + re-layout) = draft/setup, prep/configure, prep/runs, settings; Tier C (from scratch) = (auth). Spine: SP-0 (lens fix) + SP-1 (Tier A sweep) run now; SP-2 (Opus design mockups) is a JOE-GATED HALT that blocks all SP-3..SP-7 builds; each build has an OTHER_FAMILY validator behind it. Full item detail in the SP-track section below; plan of record = C:\\Users\\jrasa\\.claude\\plans\\cozy-waddling-creek.md.",
    "DEC-2 [Opus/Joe]: RESOLVED 2026-08-18. (a) D6 COCKPIT SPEC LOCKED = docs/ux_redesign/d6_cockpit_mockup_v5.html (iterated v1->v5 with Joe; v4 locked the layout, v5 corrected the Read region). This mockup is the source of truth for the live-room look; shipped D6 predates it and diverges (see D6b). (b) READ ENGINE = DETERMINISTIC. The on-block Read stays 100% rule/solver-driven ($0, no hallucination): rule move + roster-solver cap + range. UPGRADE with two signals that are already built but NOT wired to the card: the Monte Carlo land-probability (sim-engine.ts runMonteCarlo, currently PREP-ONLY) and the rule-based confidence HIGH/MED/LOW (explain.ts:318-330, currently feeds only the collapsed player-pool panel). AI (the /api/draft/recommend Haiku path) stays OPT-IN behind 'More tools' for LIVE NEWS/injury context only - it must NOT drive the per-pick Read (costs money each pick + reintroduces the reasoning-text hallucination surface the rule path avoids). NOTE: the '78% conf' drawn in earlier mockups was fabricated and has been removed; real signal is HIGH/MED/LOW.",
    "D6b-1 [Sonnet, M]: DONE 2026-08-18. UI alignment pass -- aligned shipped live room to locked v5 cockpit spec. 6 gaps closed: market band + red target marker, $X tgt in collapsed summary, strategy strip above block + ranked #1-#5, status bar R3 PICK 27, headshot + RB6 positional rank, inline Players panel. CONF chip wired from explain.ts HIGH/MED/LOW. 19 new tests, 485/485 green. 5 files changed/created.",
    "D6b-2 [Opus, M]: NOT STARTED. Wire runMonteCarlo land-probability into the live Read (DEC-2b Opus half) after a latency check (24 seeded runs/nomination synchronous may stall -- precompute per nomination or cap runs).",
    "Per-session gate (R1-R14): type-check + test:run + lint(0 new) + build + /bug-hunt free on changed modules + a screenshot from a preview I loaded myself. No session is 'done' without all of it."
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
| RV-11 | MED | ~~Simulation is a single deterministic draft, ADP opponents, not persisted, generic grading.~~ **[x] FIXED R10a + R10b** (`sim-engine.ts` — Monte-Carlo, roster-aware auction opponents via the solver, seed-deterministic; `sim-grade.ts`/`sim-results.ts` — real-points grading → projected record, top-5 modal rosters, players-you-land-most, DEC-1 me-seat bias, saved-runs persist/reload/compare). | `prep/simulate/client.tsx` | R10a/R10b |
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

## 🧪 HEADLESS ENGINE track (parallel to the R/D/SP tracks) — 2026-08-20

Joe's separate direction: stop fighting the UI, run the research machinery headless, and produce one cohesive data-backed dataset he interrogates with an LLM in-chat. Independent of R14/R15/SP.

- **[x] Phase 0/1 — orchestrator + verifier + Phase 2 tests · DONE 2026-08-20 · commit `c6a4f7f`.** `scripts/research-run.ts` reads `players_cache`, runs the existing pure engine (generate strategies -> per-strategy Monte Carlo -> per-player value bands / tags / reads / land-probability -> league intel) and writes `research-output/dataset.json` + `report.md`. `scripts/research-verify.ts` asserts 44 dataset invariants (no free ranked players, completable rosters, odds in [0,1], win-loss = season length, board sane). New unit tests on the untested load-bearing ingest modules (normalize / scoring / league-calibration). Whole pipeline is $0 (Supabase read only). Deterministic (SIM_SEED=42).
- **[x] Balanced-strategy refinement · DONE 2026-08-20.** Diagnosed why only 2 archetypes surfaced (all 4 policies front-load the same studs -> `top2Share` gate collapses them) and added a 5th budget-`balanced` anchor policy (20% single-anchor cap, starter-eligible only via `canClaimStarter`, least-anchored fill). Generator now emits 3 honest distinct archetypes (Stars & Scrubs / Studs & Duds / Balanced Auction). +2 tests lock the `balanced-auction` archetype and the no-backup-QB invariant. Also swept 17 em-dashes out of `research-run.ts`. Gate: type-check 0, test:run 552/552, verify 44/44, eslint 0 errors on touched files. See CHANGELOG 2026-08-20.
- **[x] Target prices anchored on real room prices · DONE 2026-08-20.** Joe-caught bug: `assignTargetPrices` priced targets off national `consensusAuctionValue` scaled to force 5 studs into $200, ignoring `expectedRoomPrice` -> told Joe to bid $56 for a $76 room player. Rewrote it: target price = `expectedRoomPrice` (ledger), plus a **walk-up** = room +10% to actually win a contested bid; removed the emphasis multiplier + max-bid-% cap; cheapest targets drop when room prices overflow budget (honest "~2 studs fit"); single unaffordable stud capped at solvency ceiling. Report shows "expect / walk-up to win". Stars & Scrubs now reads Gibbs $76 (win $84) / Nacua $79 (win $87). Gate: type-check 0, test:run **555/555** (pricing suite rewritten + card test updated), eslint 0 errors on touched files, verify 44/44. See CHANGELOG 2026-08-20.
- **[x] Sim field anchored on room price · DONE 2026-08-20 (Joe-approved).** The Monte-Carlo opponents bid off `nominated.ceiling` (national upside), so contested studs cleared ABOVE the ledger in-sim while `league-opponents.ts`'s own header said they should bid off room price. Swapped the profiled-opponent anchor in `sim-engine.ts` from `nominated.ceiling` to `nominated.expectedCost` (= `expectedRoomPrice ?? consensusAuctionValue`), keeping the softened lean tilt so a neutral owner pays exactly room price and leaners tilt around it. The me-seat still anchors on national worth (so a stud Joe targets costs him the room's going rate to WIN = the walk-up). A/B proof (same seed + real ledger profiles, ceiling-anchor vs room-anchor, field-wide avg clearing price): Gibbs $111->$93, McCaffrey $97->$85, Bijan $92->$82, Nacua $101->$94; and correctly clears HIGHER for players the room overpays vs national (CeeDee Lamb room $57 > ceiling $49: $55->$63). Gate: type-check 0, test:run 555/555 (LR-1 lean-split test byte-neutral -- its board sets expectedCost==ceiling), eslint 0 on `sim-engine.ts`, verify 44/44, dataset+report regenerated. See CHANGELOG 2026-08-20.
- **[x] Room-price model wired into the LIVE app (both gaps) · DONE 2026-08-20 · commit `0fcc1f9`.** The two fixes above were proven headless but INERT in the actual app. Gap 1: the live `/api/strategies/propose` route builds players via `cacheRowToConsensusPlayer` -> `ConsensusPlayer[]` with NO `expectedRoomPrice` (only `convert.ts` ever sets it), so `assignTargetPrices` fell back to national value in-app. Fixed in `generate.ts` -- room price now derives from `priceBoard` (single source of truth: `expectedCost = expectedRoomPrice(pos, posRank)`) and feeds `assignTargetPrices`, so BOTH headless (`Player[]`) and live (`ConsensusPlayer[]`) paths are room-anchored and identical. Gap 2: `simulate/client.tsx` called `buildSimSummary` WITHOUT `opponentProfiles`, so the live sim's opponents fell through to the national-ceiling branch. Fixed by wiring `buildOpponentProfiles({count: numManagers-1, meOwner:'Rasar'})`, identical to `research-run.ts`. Proof (live-shaped ConsensusPlayer, no room field): Gibbs `price:76 baseValue:76`, not 96; headless unchanged. Gate: type-check 0, test:run 555/555. See CHANGELOG 2026-08-20.
- **[x] Sim price cap · DONE 2026-08-20 (Joe-approved: $88 + lean 0.35) · commit `6eb72d8`.** Even room-anchored, contested studs still cleared ~$93 in-sim (high-lean tail + second-price ties). Joe's ledger has NEVER cleared a player above $85 (McCaffrey 2024; next $81). Added `LEAGUE_MAX_CLEAR = 88` at the clearing step (`price = min(top, max(1, second+1), 88)`) + trimmed `OPPONENT_LEAN_STRENGTH` 0.5 -> 0.35 so the tail lands low-to-mid $80s naturally. Proof (regenerated dataset, real cache, 11 ledger owners, 400 runs/strategy): global max of every price field = exactly $88, zero $90+. Known tension surfaced to Joe: the two most-contested anchors (Gibbs/Nacua) land AT the cap, $3 above the $85 all-time high -- lower to $85 or trim me-seat boost if he wants anchors in the low $80s; he chose $88 knowingly. Gate: type-check 0, test:run 555/555, eslint 0. See CHANGELOG 2026-08-20.
- **[x] Risk-model durability join was silently dead · DONE 2026-08-20 (Joe: "fix it").** Investigating Joe's "am I overthinking paying $70+ for McCaffrey?" surfaced the bug: durability is keyed by Sleeper id ("4034") but board/sim players carry a Supabase UUID as `id`, so `applyRiskModel` looked up `byPlayer[p.id]` (UUID vs Sleeper-keyed map) and **missed for EVERY player** -> everyone rode the position baseline (RB 0.9466); the measured per-player layer (McCaffrey's real 0.8462) was computed, shipped, never read. Fix: look up on `p.sleeperId ?? p.id`; threaded `external_id`->`sleeperId` end to end (`cache.ts` interface, `convert.ts`, `solver-bridge.ts`, `sim-engine.ts`). Also fixed a `summarizeGrades` rounding artifact (wins+losses now always sum to games). Proof: join hits **124/240** board (was 0); 400-seed fragile-vs-durable win-gap **125** (was 0); report flips Gibbs+Bijan (100%) 9.8-4.2 above Gibbs+McCaffrey (84.6%) 9.5-4.5. Gate: type-check 0, **582/582** (+4), eslint 0 on touched, verify 250/1 (the 1 = pre-existing cacheStale, needs `data:pull`). See CHANGELOG 2026-08-20 "Risk-model durability join".
- **[x] Durability-adjusted target price · DONE 2026-08-20 (Joe: "yes, build the durability-adjusted target price").** Closes the OPEN GAP above -- the injury signal now moves the pay-up number, not just the projected record. New `durabilityPriceFactor(sleeperId, position, model)` in `sim-grade.ts` (`clamp(gpRate / positionBaseline, 0.75, 1.0)`; discount-only, capped at 1.0; DEF + unmeasured rookies/absent = 1.0; relative to the position baseline so market-priced risk isn't double-counted). Multiplies the room-price anchor in `target-pricing.ts` (optional `durabilityFactor` field, `baseValue` preserves the un-adjusted room anchor, drop-cheapest loop compares the discounted price). Threaded at all 3 pricer call sites: `generate.ts`, `research.ts`, `room-target-pricing.ts`. Report renderer shows the haircut inline. Proof: McCaffrey **$67 -> $60** (0.89x durability), walk-up $74 -> $66; Adams **$13 -> $12** (0.94x), LaPorta **$7 -> $6** (0.93x); durable/unmeasured targets unchanged. Gate: type-check 0, **591/591** (+9), eslint 0 on 8 touched files, verify 250/1 (the 1 = same pre-existing cacheStale). See CHANGELOG 2026-08-20 "Durability-adjusted target price".
- **Deferred (not approved):** the `scarcity` RB-mono build ("Robust RB", ~95% one position) is still mislabeled `stars-and-scrubs` and lost in dedupe; refining `classifyArchetype` so it survives as a 4th archetype is pending Joe's go-ahead.

## 🔌 W-track — wire the research engine + draft-day plan INTO the app UI — 2026-08-21 (Joe-approved)

**Why:** the HEADLESS ENGINE track (above) deliberately produced `dataset.json` for in-chat interrogation and skipped the UI. Joe now wants it in the app too: *"wire all this engine into the actual app UI so i can use the app to see all this info like intended."* Plus a draft-day workflow: decide (in-app OR via Claude) -> LOCK -> draft dynamically on the phone off the locked plan. This track ADDS the missing seam (dataset -> app), the lock/snapshot, and the Claude write path. It does NOT rebuild the decisions layer (user_tags/strategies shipped in R7a/R7b/R9/R11b) and adds NO AI to the deterministic live Read (DEC-2 preserved). Full design record (superseded scratch, kept for context): the plan was authored in `C:\Users\jrasa\.claude\plans\fantasy-football-draft-app-this-app-tranquil-knuth.md` then transcribed here per the one-plan rule.

**Storage seam:** reuse `research_runs` kind-discrimination (`kind:'dataset'` + `kind:'plan'`), the exact `strategy_settings->>kind` pattern `/api/sim-runs` uses (R10b) -- **no migration**. Refresh stays a terminal batch (`research:run`/`research:publish`); the app READS the newest published snapshot (Vercel 10s cap forbids in-request compute). Deployed on Vercel, so on-disk reads are out.

**Shared contract:** `src/lib/research/dataset-types.ts` (`ResearchDataset`) imported by both the writer script and the UI reader so the shape can't drift. **Claude write path:** `draft-plan.json` + `scripts/plan-set.ts` (service-role, resolves Joe's `user_id` via the Nasties league row, upserts graded `user_tags` + activates a strategy). New screens are built to SHIELD (D-track reference-first rule: name a reference + mockup + Joe's yes before code). Live-room visual proof defers to R15 (no reachable live session in this headless env).

- [x] **W0 [Opus] · shared+pipeline — dataset contract + storage seam · DONE 2026-08-21.** Built `src/lib/research/dataset-types.ts` (`ResearchDataset` + `DatasetMeta`/`DatasetStrategy`/`DatasetStudCombo`/`DatasetLeagueIntel`/`EnrichedPlayer`/`ResearchDatasetRun`, `RESEARCH_DATASET_KIND='dataset'`), all fields referencing the engine's own return types so the contract can't drift; typed `research-run.ts`'s `dataset` const as `ResearchDataset` (writer bound to contract). `scripts/research-publish.ts` + `research:publish` npm script: reads `research-output/dataset.json`, validates the spine, resolves the active league scoped to `DEV_USER_ID`, INSERTs one `research_runs` row kind:'dataset' with explicit `user_id`, prints payload size (newest-wins, non-destructive). `GET /api/research-dataset` copies the `getClient()`+`requireUser()`+`strategy_settings->>kind` filter from `api/sim-runs/[id]/route.ts`, returns newest row (or `run:null`); `?meta=1` returns a cheap freshness envelope. `src/hooks/use-research-dataset.ts` (full + meta modes, empty state); retired the dead `use-research.ts` stub. **Proof:** `research:publish` -> row `7f63f239`, 1000 players/26 strategies/18 combos, 1.27 MB. `GET /api/research-dataset` round-trip (dev server :3003, DEV_MODE): 1,333,508 bytes, McCaffrey target price intact through the DB = **$60 (room $67, 0.894x durability)**. Gate: type-check 0, test:run 591/591, eslint 0 on 4 new files (3 pre-existing warnings on `research-run.ts` unchanged). See CHANGELOG 2026-08-21.
- [x] **W1 [Sonnet] · output (Design+QA) — Strategy Leaderboard screen · DONE 2026-08-21.** New `src/app/(app)/prep/leaderboard/{page,client}.tsx` + a "Leaderboard" destination row on the `/prep` hub (D2 pattern). Ranks `dataset.strategies` DESC by `sim.grade.meanWins` (tiebreak modalRecord.wins, then name) via new pure `src/lib/research/leaderboard.ts` (`rankStrategies` + `resolveTargetPrice`, 10 tests, never fabricates a price). Expandable rows (not a grid): why-it-wins (`proposal.reasoning`), reused `SimRecordHero`, key targets w/ solver + durability prices, reused `SimRosterCarousel`; a `dataset.studCombos` section. SHIELD-only (`Nameplate`/`PageTitle`/`FFISectionHeader`, zero inline hex). **Orchestrated:** Sonnet worker built, independent Sonnet validator (HOLD) caught 2 defects, both fixed before commit — (1) `/prep` hub crash regression from W0: `/api/research` filter now excludes sim+dataset+plan rows (null-tolerant) + defensive `?.analysis?.` guard in `prep/page.tsx`; (2) stud-combo duplicate React keys -> now keyed `patternKey::anchorNames`. **Proof:** type-check 0, test:run 601/601 (10 new), eslint 0 on edited files, build OK (`/prep/leaderboard` static). Live DOM (:3003 DEV_MODE, row `7f63f239`): 26 strategies ranked 9.5->9.0 avg wins, `McCaffrey $60 · room $67 · 0.89x`, combo `Gibbs + McCaffrey 10-4`; `/api/research` -> 200 runs:0 (dataset excluded), `/prep` clean, 0 duplicate-key warnings. See CHANGELOG 2026-08-21 / W1.
- [x] **W2 [Sonnet] · output+shared — League Intel + player-screen upgrades · DONE 2026-08-21.** New `src/components/prep/league-intel-panel.tsx` (collapsible `Nameplate` `LeagueIntelPanel`, prop `intel: DatasetLeagueIntel`): header from `intel.era`/`intel.draftsUsed` ("From 4 drafts, 2022 to 2025"), positional inflation rows (HOT->`--ffi-warning`, COOL->`--ffi-blue-bright`, NEUTRAL->`--ffi-ink-3`, percent = `Math.round((mult-1)*100)`), owner-leans list (non-null topLean, sorted by abs(vsRoom), scrollable). Mounted dataset-gated on `prep/leaderboard` + `prep/board`. New pure `src/lib/research/dataset-enrichment.ts` (`buildEnrichmentMap`/`pickEnrichment`, keyed by player.id, 7 tests): merges dataset enrichment (`valueBand`/`tags`/`read`/`landProbability`/`ceilingValue`/`expectedRoomPrice`/`valueGap`/`durabilityPriceFactor`) over `/prep/players` (FFIPlayerIntelCard OUTLOOK line) + `/prep/board` (DraftBoardTable expanded stats) rows, additive fallback to client compute when no dataset. `durabilityPriceFactor: number` added to the `EnrichedPlayer` contract + written per-player in `research-run.ts` via aliased `durabilityPriceFactor` from `sim-grade`; dataset republished (1000 players, factor 0.75->1.0). **Orchestrated:** Sonnet worker built, independent Sonnet validator (FAIL) caught 1 SHIELD token-lock defect (raw hex `#5FA8E0`/`#5e708a` in `ffi-player-intel-card.tsx`), fixed to `var(--ffi-blue)`/`var(--ffi-ink-3)` before commit. **Proof:** type-check 0, test:run 607/607 (7 new + 2 fixtures updated for required field), eslint 0 on fixed file, build `Compiled successfully 4.8s`. Live DOM (:3003 DEV_MODE, league `0d2914f1`, dataset row `8112f3e6`): League Intel panel renders on leaderboard + board, player card shows `land N% · room $X · 0.NNx · band $lo-$hi`. Screenshots NOT captured (computer/screenshot tool times out this session, "Browser pane not displayed"); verified via text DOM tools. Commit `1cfea82`. See CHANGELOG 2026-08-21 / W2.
- [ ] **W3 [Opus] · pipeline — Decisions + Lock contract + Claude write seam.** `DraftPlanSnapshot` (dataset_run_id + active-strategy snapshot + user_tags snapshot + locked_at) as `research_runs` kind:'plan'; `GET/POST/DELETE /api/draft-plan`; `draft-plan.json` + `scripts/plan-set.ts` (`plan:set`, service-role, explicit `user_id`) + `plan:lock`. Done-when: edit `draft-plan.json` (star 3, avoid 2, strategy X) -> `plan:set` -> `plan:lock` -> `GET /api/draft-plan` returns the frozen bundle + tags/strategy show in-app.
- [ ] **W4 [Sonnet] · output — Draft Plan screen + leaderboard bridge + live-room consumption.** `prep/plan/{page,client}.tsx` (review + LOCK/UNLOCK); leaderboard "Make this my plan" (activate strategy + seed `user_tags`); live room reads the locked plan as baseline in `use-live-draft-data.ts` when present (toggles still work), lock/freshness chip. No AI added to the Read. Done-when: engine/route/DOM proof now; live-room mobile screenshot deferred to R15.
- [ ] **W5 [Opus] · folds into R15 — end-to-end rehearsal + deploy.** Full workflow rehearsal (pull->run->publish->decide->lock->phone->live room); full gate (`test:run`/`lint`/`build`/`research:verify` 250/1); Vercel deploy reading prod-Supabase snapshots. Done-when: deployed URL loads the leaderboard with real records + the live room on a locked plan; gate green.

## 🔬 PREP RE-EVAL track — engine correctness + prep-screen IA rebuild — 2026-08-21 (Joe-approved)

**Why:** Joe reviewed the W1/W2 prep screens and rejected them on two fronts. (1) Engine/data: virtually every "strategy" produced the same roster (Gibbs + Burden regardless of strategy) and each sample roster spent the full $200 on 3-4 players -- not realistic. (2) Display: the screens "look terrible" and don't show the decision info in a readable format. Three upstream defects found independently from `dataset.json` + engine source: A = broken scoring feed (577/1000 `projectedPoints` null, incl. elites -- pricing feed is complete though); B = strategy-blind sim (me-seat chases a fixed national ceiling, +28% bias too weak, ties break to me -> every strategy converges); C = duplicate player identities ("Luther Burden III" + ghost "Luther Burden" both drafted). **Decisions locked with Joe:** engine = do both (rebase sim on the complete pricing feed now + repair projections in parallel as secondary); visual = stay inside SHIELD v4 (compliance + re-architect data grouping, no new reference hunt); scope = all four prep screens. Plan of record: `C:\Users\jrasa\.claude\plans\fantasy-football-draft-app-this-app-tranquil-knuth.md`.

- [x] **P1A [Opus] · pipeline — strategy-driven me-seat · DONE 2026-08-21.** `sim-engine.ts`: new `SimMyPlan` (per-player `anchors` keyed by board id + a `VALUE_FILL_SPREAD=2.5` per-open-slot value-fill cap). The me-seat now executes each strategy -- chases its anchors up to their walk-up price, then fills remaining slots at room price under `remaining-budget / open-slots x 2.5` -- instead of valuing every player at the national `ceiling`. Absent `myPlan` => legacy ceiling behavior (all 301 draft + 614 full tests pass unchanged). `sim-results.ts`: `buildMyPlanFromStrategy(board, target_pricing.prices, key_targets)` maps names -> board-id anchors (walk-up || price || baseValue || ceiling, capped at 88). Threaded through `research-run.ts` `simInputFor`. **Proof:** type-check 0, test:run 614/614, lint 0 on touched files. Dataset regenerated: spend now tracks strategy shape (heavy-anchor top-3 85-95%, even/light/balanced 46-74%), distinct core-sets 2 -> 17/26, grades 7.7-9.3, 18/26 rosters spread >=8 players over $1.
- [x] **P1C [Opus] · shared — dedupe player identities · DONE 2026-08-21.** New pure `src/lib/players/dedupe-identities.ts` (`canonicalPlayerName` strips punctuation + generational suffix; `dedupePlayerIdentities` merges same canonical-name+position+compatible-team rows, keeps the best-ranked identity, adopts ONLY missing projection/VORP/value fields, never overwrites, no input mutation; 8 tests). Wired into `cacheToPlayers` (the single shared read path for sim board + published dataset + live screens), NOT `normalize.ts` as the plan guessed -- normalize only runs on a network `data:pull` and would shift numbers under Joe mid-review + be unprovable without the re-pull; `cacheToPlayers` fixes it deterministically at the shared read seam. **Proof:** dup-identity roster hits 5 -> 0, max single-player prevalence 26 -> 15/26, all rosters full 13 players. Commit `2f09c0f` (P1A + P1C together).
- [x] **P1B-net [Opus] · shared — projection imputation safety net · DONE 2026-08-22.** New pure `src/lib/players/impute-projections.ts` (`imputeMissingProjections`): builds a rank->points curve per position from players with a REAL projection, then linear-interpolates a `projectedPoints` for any draftable with a null/0 projection but a real `ecrPositionRank` (clamp at curve ends, no extrapolation). Every imputed value flagged `projectionImputed:true` (new field on `Player`) so it is never mistaken for a feed number, and already-imputed rows are excluded as curve anchors. Wired into `cacheToPlayers` AFTER dedupe (the shared read seam), so the sim never silently scores an elite at 0 when the offseason feed is empty. 7 unit tests. **Proof:** type-check 0, 632/632 tests, lint 0 on touched files. Current live feed carries real projections for all 6 prior-null elites, so this fires as a safety net (0 imputed today) -- it activates only when the feed regresses. Does NOT replace the network `data:pull` repair (still deferred below); it removes the sim's dependency on that repair.
- [x] **P1D [Opus] · pipeline — realistic nomination order + medoid rosters · DONE 2026-08-22.** Fixes the residual "startable at $1 regardless of strategy" that P1A/P1C did not reach. TWO changes. (1) `sim-engine.ts` `pickNominationIndex`: replaced strict top-3-by-ceiling nomination with a tight/wildcard MIXTURE -- TIGHT (55% of lots) draws the top-4 remaining so studs clear promptly and NEVER crater into the thin late market; WILDCARD (45%) draws UNIFORMLY over the mid/late board `[tightWindow, pool)`, deliberately pulling role players up while budgets are still live so they face a real market instead of a lone $1 late bid. (2) `sim-grade.ts` `medoidRoster`: the per-strategy representative roster shown on screen is now the cluster MEDOID (the real run whose per-slot prices sit closest to the cluster's per-player medians), not an arbitrary first occurrence -- so a flukey run whose bench all landed at $1 no longer stands in for the strategy. No price synthesized; the medoid is an actual simulated roster. 6 new tests (4 nomination + medoid + topModalRosters medoid). **Proof:** type-check 0, 632/632 tests, lint 0 on touched files. Dataset regenerated + published (row `243b4cef`). Measured on the shown representatives (44 rosters): distinct stud cores **26** (was 2 at the original defect); Gibbs **$88** / Puka **$88** every appearance (no cratering); $1-startable slots **36** (was 54 pre-medoid); spread median **7** players over $1 per 13-slot roster (min 4, max 12). Residual $1 startables (e.g. LaPorta $1 in punt-TE strategies) verified as correct auction behavior -- his aggregate landed price is $3-8 in strategies that value TE; punt-TE strategies genuinely get the falling TE for $1.
- [ ] **P1B [Opus] · pipeline — repair projections feed · DEFERRED (secondary).** Only ~21 of 196 draftable (adp<200) players still carry null projections (J.Taylor adp11, Jeanty 13, Bowers 17, Lamar 31, Henry 37, Breece 41); the "577 null" was mostly undraftable bench. Requires a network `data:pull` (`normalize.ts`/`sleeper.ts`/`espn.ts` -- confirm 2026 season empty in offseason, fall back to prior-season PFR points + widen ESPN fuzzy match, recompute VORP). Sim is correct on the pricing track without it (P1A + P1B-net safety net), so do NOT block Part 2 on this.
- [~] **P2 · output (Design+QA) — per-screen IA rebuild inside SHIELD v4 · IN PROGRESS.** All four prep screens; render full 13-man rosters with the real dollar spread (Defect D); fix SHIELD violations (inline hex, volt-green `rgba(139,255,69,...)`, HTML-table player lists); expandable rows not card grids; mobile-first 44px.
  - [x] **P2 / Strategy Leaderboard [Opus] · DONE 2026-08-21 (commit `8e5e1ee`).** `prep/leaderboard/client.tsx` + new `sim-results-cards.tsx`: full 13-man MEDOID roster grouped by position with the dollar paid per slot (was only 3-4 core names). 16/16 component tests. Gate green.
  - [x] **P2 / Cheat Sheet + League Intel [Opus] · DONE 2026-08-22 (commit `b523f19`).** `draft-board-table.tsx` off its `var(--ffi-surface-2)` shell onto `ffi-plate-row` rows + `Nameplate` empty state; ALL volt-green + inline hex purged for `--ffi-*` tokens (live computed-style scan across 483 rendered rows = 0 green). SHIELD semantics: targets/pocket=steel-blue, elite/T1=brick-red, hot/avoid=coral. `globals.css` +`--ffi-pos-def`/`--ffi-pos-k`. `board/client.tsx` Nameplate error/empty + tokenized pills + brick-red strategy badge + blue/coral filters. `league-intel-panel.tsx` plain-English wrapping inflation actions (HOT/COOL/NEUTRAL). Gate: type-check 0, lint 0, test:run 632/632. See CHANGELOG 2026-08-22 / Part 2.
  - [ ] **P2 / Players intel card · DEFERRED.** `ffi-player-intel-card.tsx` already the Joe-approved D4 expandable-row IA; only 77 inline hex remain, most with Tailwind opacity modifiers (`text-[#5FA8E0]`, `bg-[#5FA8E0]/18`) that do not translate cleanly to `var(--ffi-*)`. Separate careful verified pass so the approved look is not disturbed.

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

### ✅ DEC-1 — Targets/avoids bias `[Opus/Joe]` · RESOLVED 2026-08-17: BIAS · unblocked R10b + R11b
> - Class: FRONTIER
>   Reason: ambiguous product decision
>   Verifier: OTHER_FAMILY
> **Type:** Thinking / DECISION. Extracted from inside R10b and R11 during the 2026-08-16 Re-Plan so no Doing card carries a buried judgment call (Scoping Gate).
> **The question:** should the sim's "me" seat (R10b) and the in-room advice (R11b) bid toward **Joe's graded targets/avoids** (weighted) instead of the generic ceiling-based valuation they use today (`sim-engine.ts:294-311`)? Today targets/avoids do NOT bias sim bidding, and the same question applies to R9 strategy generation.
> **Why it gates:** R10b grades a strategy Joe acts on and R11b advises him live. If the me-seat ignores his targets while grading/advising against opponents who also ignore them, the grade and the advice model a draft Joe would not actually run. This is a product-behavior call, not an implementation detail, so it cannot be resolved inside a Doing card.
> **RULING (Joe, 2026-08-17): BIAS.** The sim "me" seat (R10b) and the in-room advice (R11b) DO bias toward Joe's graded targets/avoids, with a **bounded weight** that respects the graded weight (1-10) + severity (soft/hard) already in `user_tags`. Opponents stay on the generic ceiling model, so the grade answers "how does MY plan fare," not "how does a generic drafter fare." This is now a fixed instruction for R10b + R11b (and applies to R9 strategy generation where the same question arises).
> **Done-when:** ✅ Joe ruled BIAS. Ruling written into R10b + R11b below as a fixed instruction; both cards unblocked.

### ✅ R10b — Sim grading, record, representative teams + saved runs `[Opus]` · class: output/pipeline · DONE 2026-08-17 (DEC-1 = BIAS)
> - Class: FRONTIER
>   Reason: approved spec; DEC-1 ruled BIAS 2026-08-17
>   Verifier: OTHER_FAMILY
> **Shipped 2026-08-17 (Opus):** two pure $0 modules on top of R10a — `src/lib/draft/sim-grade.ts` (`bestLineupPoints` scores each run's best legal starting lineup on real projected points; `gradeRun` ranks that vs the league → projected win-loss record; `studCore` clusters a roster by players won above a $-threshold; `topModalRosters` returns the top-5 shapes by frequency, tie-broken on avg starter points; `playersYouLandMost` tallies land-rate + avg $) and `src/lib/draft/sim-results.ts` (`buildMyBiasFromTags` maps graded `user_tags` → bounded me-seat bias; `buildSimSummary` orchestrates run→grade→cluster→frequency; `toPersistedSim` trims for storage). **DEC-1 = BIAS wired** in the me-seat branch of `sim-engine.ts` only (target lift ≤ `TARGET_MAX_BOOST=0.35` scaled by weight 1-10; soft avoid ×0.5; hard avoid skipped) — applied AFTER the RNG draw so determinism-under-seed and the 11 generic-ceiling opponents are byte-identical to R10a. Real `projectedPoints` now flows `roster-solver.ts` (optional field, solver ignores it) → `solver-bridge.ts` → sim award, so grading scores real points, not the $-ceiling proxy. New API `src/app/api/sim-runs/` (POST save / GET list / GET [id]) persists to `research_runs` behind a `strategy_settings.kind='sim'` discriminator (NO migration); `api/research/route.ts` GET excludes sim rows (null-tolerant `.or`). `prep/simulate/client.tsx` rewritten: run → grade → render (projected record card, top-5 modal rosters, players-you-land-most) → save/reload/compare. **45 new tests (sim-grade + sim-results + 6 DEC-1 bias tests on sim-engine); 417/417 green.** Gate: type-check 0 errors · lint 0 (R10b files exit 0; 61 pre-existing errors all in untouched files) · build ✓ Compiled successfully (both `/api/sim-runs` + `/api/sim-runs/[id]` registered). **Live-verified on the running dev server (port 3003):** 30 sims → projected record 14-0 (70% of sims, range 11-3→14-0, avg 13.4 wins), top-5 stud-core clustering (Shape 1 = 23.3%, 7 of 30), players-you-land-most table (Amon-Ra/Bijan/CMC 100%), and Save → POST /api/sim-runs 200 → row read back into the Saved-runs list — real connected DOM + network proof pasted in-chat. **Pixel screenshot blocked** (Browser pane not compositing in this headless session — same env constraint as R5/R6/R9/D4-note); DOM/network/console evidence stands in its place, not faked. **D5 now unblocked.**
> **Size:** L - grading math + record + top-5 modal clustering + players-you-land-most frequency + saved-runs persist/reload/compare, on top of the existing R10a engine. Large but bounded (the engine already exists, this is post-processing + one persistence path); if saved-runs compare overflows the window, it splits to an R10b-tail card.
> **Depends on:** R10a. **DEC-1 = BIAS (2026-08-17):** the me-seat bids toward Joe's graded targets/avoids at a bounded weight (respect `user_tags` weight 1-10 + soft/hard severity); opponents stay generic-ceiling. Encode this in the me-seat bidding path (`sim-engine.ts:294-311`) before grading.
> **Reads first:** R10a output, `prep/simulate/client.tsx`, `research_runs` schema.
> **Work:** grade each run on **projected season points vs. the league**; output a projected **win-loss record**, 4–5 representative resulting teams, and **saved runs** (persist to `research_runs`, reload + compare).
> **Done-when:** the sim produces a projected record + representative teams from the R10a distribution, and runs persist + reload + compare. Tests on the grading math. Screenshot.
> **Added 2026-08-14 (Joe feedback — Sim mockup review, "really close, yes"):** two output refinements, both **pure post-processing on the R10a per-run rosters** (`SimRun.myRoster.players[]`, `sim-engine.ts:122-131`) — no engine change:
>   - **"Top-5 most-likely rosters" replaces the vague "4-5 representative teams."** Do NOT surface all N (~500) runs. Cluster the `myRoster` outcomes by their **stud core** (players won above a $-threshold; the $1 bench fill is noise) and surface the **5 most frequently-occurring roster shapes**, each labeled with its frequency ("this shape hit in 22% of sims"). This makes the teams **modal** (most-common) — what Joe asked for — not floor/median/ceiling percentile picks.
>   - **"Players you land most" frequency table.** Tally across all runs the fraction of `myRoster`s containing each player → a ranked list ("Bijan Robinson — in 78% of sims, avg $54"). A plain count over `myRoster.players[]`.
>   - **DEC-1 RULED BIAS (2026-08-17):** the me-seat biases toward Joe's graded targets/avoids at a bounded weight (respect `user_tags` weight 1-10 + soft/hard severity), opponents stay generic-ceiling. This makes the top-5 rosters + "players you land most" reflect the draft Joe would actually run, not a generic drafter. Fixed instruction — no longer a blocker.
>   - **Screen note:** the Sim results screen has an approved static mockup (`.claude/mockups/sim-results-v1.html`). Whether R10b builds that screen or the visual pass (D5) does depends on the sequencing decision — see "🎨 THE LOOK." R10b's own scope is the **grading/record/top-5/frequency DATA** (Opus, tested); the pixels are D5.

### ✅ R11a — Live draft: offline cache + resync `[Sonnet]` · class: pipeline · DONE 2026-08-17
> - Class: WORKHORSE
>   Reason: bounded implementation against approved R11a plan
>   Verifier: OTHER_FAMILY
> **RESULT:** New pure $0 module `src/lib/draft/offline-cache.ts` (localStorage-backed, SSR/quota/corrupt-JSON guarded) write-through cached from two hooks: `use-live-draft-data.ts` caches the last-fetched session+league so a genuine network failure (`fetch` throws `TypeError` — never masks a real 404/500) falls back to the cache instead of the dead error screen; `use-draft-state.ts` caches the full live `DraftState` on every change, marks it `synced:false` before the Supabase PATCH and `synced:true` after it confirms, and a new `DraftSyncStatus` (`'synced'|'pending'|'offline'`) drives a fixed 5s resync retry + a `window.addEventListener('online', retry)` listener. Reload resolution (`resolveInitialDraftState`) is a documented pick-count heuristic, not a CRDT: no cache → server wins; currently offline → cache wins outright (only source that can reflect unsynced local picks); online → whichever of {server, cache} has strictly more picks wins. `client.tsx` surfaces both signals in one banner ("Offline - showing cached draft" / "Syncing pick to server..." / "The last pick could not reach the server..."). No `/draft/live` dead-screen root cause remained open from R1 to re-resolve. **456/456 tests green** (+15 new: session-cache round-trip/isolation/corrupt-JSON/null-league, draft-state-cache round-trip/corrupt-JSON/invalid-picks/clear/quota-exceeded, 4 `resolveInitialDraftState` branches). Gate: type-check 0 errors, lint 17 problems (0 errors, 17 warnings, ALL pre-existing baseline warnings — confirmed via `git stash` diff against the untouched files; my rewrite of the init effect incidentally fixed a pre-existing `prefer-const` error at baseline), build clean (`✓ Compiled successfully`). **Live-verified on the already-running port-3003 dev server** (this session's own server was locked by a concurrent session, Next 16's one-server-per-directory constraint): ran the built-in sim mode, whose demo session's PATCH 404s by design — the "Syncing pick to server..." banner rendered live in the DOM, the network log showed 20+ real repeated `PATCH /api/draft/sessions/demo → 404` calls proving the 5s resync interval actually fires (not dead code), and `localStorage['ffi-draft-state-cache:demo']` read back `{synced:false, picks:18}` proving the write-through cache captures every pick even while the server write fails. Pixel screenshot blocked (Browser pane not compositing — same env constraint as R5/R6/R10b/D5); DOM/network/localStorage evidence stands in its place per the pre-approved fallback. The reload-restores-from-cache branch is proven by the 4 `resolveInitialDraftState` unit tests rather than live browser, since `?sim=1` injects a hardcoded demo session that bypasses the real session-fetch path that branch guards.
> **Size:** M - one focused Sonnet sitting: a local cache layer + resync path, isolated from the in-room guidance work (R11b) and the pixels (D6). This is the "offline cache" chunk the 2026-08-16 Re-Plan split out of the old bundled R11.
> **Depends on:** R5 (team-aware max-bid).
> **Reads first:** `draft/live/client.tsx`, `state.ts`, `use-remote-auctioneer-feed.ts`.
> **Work:** local **offline cache** so a mid-draft network drop doesn't lose state; any remaining `/draft/live` dead-screen root cause fully resolved here (if R1 deferred it).
> **Done-when:** the draft survives an offline blip via local cache and resyncs; solo-verifiable. (Full live-auctioneer proof -> R15.) Screenshot.

### ✅ R11b — Live draft: team-aware in-room guidance `[Sonnet]` · class: pipeline · DONE 2026-08-17 (DEC-1 = BIAS)
> - Class: FRONTIER
>   Reason: approved spec; DEC-1 ruled BIAS 2026-08-17
>   Verifier: OTHER_FAMILY
> **RESULT:** R9's `adaptive-guidance.ts` pivot line now renders always-on in a new `StrategyStrip` between AwarenessStrip and BudgetStrip (not buried in "More tools"); target AND avoid are independently settable in two places (Research tab player rows, on-the-block hero card), each with its own button/aria-pressed state calling the existing generic `toggle(id, 'target'|'avoid')`. DEC-1 verified: `roster-solver.ts` and `what-to-do.ts` did NOT honor the bounded-bias ruling before this card; fixed to mirror R10b's `sim-engine.ts` pattern (`TARGET_MAX_BOOST = 0.35`, `SOFT_AVOID_FACTOR = 0.5`, hard avoid skipped), unit-tested, and wired end-to-end live (`userTagsMap` -> `buildSolverInput`; `avoidSeverity` -> the on-block `advice` memo -> `computeWhatToDo`). 441/441 tests green, 0 type errors, 0 lint errors on touched files, clean build. Live-verified on port 3003: pivot line and StrategyStrip visible in the always-on room ("On plan. Balanced Auction still fits your budget: target Trey Lance, Gardner Minshew II, Quinn Ewers."); both target/avoid buttons present and independently wired on Research rows and the on-the-block card (confirmed via DOM read + a live PATCH `/api/user-tags` network call fired per click). Persistence of the write itself could not be captured on camera: the verification browser tab carries no Supabase auth session (`localStorage`/`document.cookie` checked, empty), so every PATCH -- old target-only code path and the new avoid path alike -- 500s identically on the DB's `user_id` not-null constraint. Confirmed this is a test-environment gap, not a regression: same endpoint, same failure, on both the pre-existing and new toggle. Real-session persistence proof -> R15.
> **Size:** M - one Sonnet sitting for the in-room guidance BEHAVIOR only. The six UX-gap PIXELS listed below land once in D6 (build-once rule), not here; R11b owns the logic they surface.
> **Depends on:** R5 (team-aware max-bid), R9 (adaptive-guidance engine). **DEC-1 = BIAS (2026-08-17):** in-room advice weights Joe's targets/avoids at a bounded weight (respect `user_tags` weight 1-10 + soft/hard severity). Verify the solver + what-to-do path honor this; if not, fix here.
> **Reads first:** `draft/live/client.tsx`, `roster-solver.ts`, `adaptive-guidance.ts`, `what-to-do.ts`.
> **Work:** wire `adaptive-guidance.ts` pivot line into the room; in-room target/avoid toggle writes (add / un-target / add-avoid live); surface an always-reachable strategy display + quick switcher (the logic behind D6's pixels).
> **Done-when:** live room shows roster-aware advice + the adaptive pivot line; target AND avoid are settable during the draft; solo-verifiable. (Full live-auctioneer proof -> R15.) Screenshot.
> **Added 2026-08-14 (Joe feedback — Live screens review). Grounded against the CURRENT room (`components/draft/live-room/auction-room.tsx`), which is in better shape than the old review implied.** It already has: money-remaining + single-player max-bid (`budget-strip.tsx:57-61`), slots filled/open, a per-position tier-count "Tier Context" panel with tap-to-list (`tier-context.tsx`), and a target-toggle on the Research tab. The gaps Joe flagged (these are the R11b UX scope — the PIXELS land with D6, "built once"):
>   - **Tier Context is incomplete.** Shows QB/RB/WR/TE only (`auction-room.tsx:34` `TIER_POSITIONS`) with **no FLEX row**, and only T1/T2/T3 (`explain.ts:32-34`) with **no T4/T5**. Add a **FLEX row** (combined RB/WR/TE remaining) and extend to **T4 (evaluate T5)** — Joe reads tier depth per position + FLEX to make in-the-moment calls.
>   - **My Team is always-on, not collapsible** (`auction-room.tsx:293-294`). Make it **expand/collapse** so the space can hold tiers/strategy when the roster isn't needed.
>   - **On-the-block card is not collapsible** (`on-the-block-card.tsx`). Make the player-context card **expand/collapse** — full context for players Joe cares about, minimized for the many he doesn't.
>   - **Strategy is buried.** The switcher + adaptive pivot alerts live in a "More tools" accordion **closed by default** (`client.tsx:124`). Surface an **always-reachable strategy display + quick switcher** so Joe can flip strategy views mid-draft, and surface the R9 **adaptive-guidance** pivot line in the room (this IS R11's core "wire `adaptive-guidance.ts`" job per VISION §31).
>   - **Avoid has no control in the room; target only toggles on the Research tab** (writes `'target'` only). Add **target AND avoid** toggles reachable during the draft (add / un-target / add-avoid live as the board changes).
>   - **Live-updating player values (Players-screen ask).** Joe wants the player card's base/market/your-value to **update live as players are bought**. The prep Players screen is static (no auctioneer subscription); the live version of that card belongs here. Keep base/mkt/your-value + the range bar; tier on the card face; projected points → expansion; add "expert consensus." (The static prep card's density/tier redesign is D4.)
>   - **DEC-1 RULED BIAS (2026-08-17):** in-room advice biases toward Joe's targets/avoids at a bounded weight (respect `user_tags` weight 1-10 + soft/hard severity). R11b's Doing scope: VERIFY the current solver + what-to-do path honors this; if the code does not match the ruling, log it as a functional gap and fix it here. No longer a blocker.

### R12 — Shell / UX / perf `[Sonnet]` · class: output (Design lens) — DONE 2026-08-17
> - Class: WORKHORSE
>   Reason: bounded implementation against approved R12 plan
> **Size:** M - measure page-switch timing + targeted fixes + one mobile-first arm's-length pass. Screen fixes beyond quick wins spawn follow-up cards rather than bloating this sitting.
> **Reads first:** `layout/app-shell.tsx`, `DESIGN_SYSTEM.md`.
> **Work:** measure + fix page-switch load time (Joe flagged slow switches); verify mobile-first arm's-length across every screen.
> **Done-when:** measured switch times acceptable; every screen verified mobile-first. Before/after timing + screenshots.

**R12 DONE (2026-08-17).** Measured page-switch timing with event-driven instrumentation (`history.pushState` monkey-patch + `MutationObserver` — immune to this environment's background-tab timer throttling, which had produced false ~1-2s readings via naive `setInterval`/`rAF` polling). Real warm route-commit time: ~40-70ms; ~150-290ms on a first/cold visit to a route, which is `next dev`/Turbopack's JIT-compile-on-first-request behavior (dev-only, absent from `next build` production output) — not an app-code problem to fix. Found and fixed one genuine shell-level issue instead: `src/components/layout/page-transition.tsx`'s `PageTransition` used `AnimatePresence mode="wait"`, which serializes the outgoing page's full exit spring before the incoming page even mounts — contradicting `DESIGN_SYSTEM.md`'s own "Tabs/routes spring cross-fade, never a hard cut" rule and the file's own second export (`FrozenPageTransition`), which already used `mode="popLayout"`. Changed to `popLayout` so enter/exit animate concurrently (exiting element pulled out of layout flow via `position: absolute`, anchored on `<main>`'s existing `relative` class in `app-shell.tsx`) — same visual language, just not artificially serialized. Mobile-first arm's-length pass at 375px covered all 6 primary screens (prep hub, players, board, runs, sim results, live room) plus settings: zero unintended horizontal overflow (the one flagged "overflow" on `/prep/simulate` is the sample-roster carousel's intentional scroll-snap, not a bug). One real Design-lens violation found and fixed at the shell level: `swipe-carousel.tsx`'s 4 bottom dot-indicator buttons were 8x8px, under the 44px touch-target minimum — fixed via `p-[18px] -m-[18px]` (expands the tappable hit-box, cancels out in layout so the visible 8px dot and its 16px pitch spacing are pixel-identical; verified via DOM measurement pre/post). **Deferred, NOT fixed this session** (exceeds "quick win" scope per the card's own guardrail) — see R12-fix card below.

**R12-fix (follow-up, not yet scheduled) — page-level touch-target sweep + live-room mobile check.** Two things R12 found but explicitly did not fix in-session:
1. Sub-44px touch targets found on two prep pages, page-level not shell-level: `/prep/players` (~14 instances — icon buttons ~36px, position filter pills ~32-45px) and `/prep/board` (~21 instances). Needs its own sitting to fix without risking layout regressions on dense list/table screens.
2. `/draft/live` (the in-draft room) could not be rendered live in this session — no active draft session was available in the test environment — so its mobile-first legibility was not verified. Also explicitly out of scope for R12 regardless (the live-room reskin is D6's territory, design-gated separately). Verify at 375px whenever D6 or R15 next has a real/sim session up.

### R13 — Dedicated bug hunt + test hardening `[Sonnet · Opus for logic bugs]` · class: bugfix — DONE 2026-08-18
> **DONE 2026-08-18:** `/bug-hunt full` catalogued 1 HIGH / 3 MEDIUM / 3 LOW in `BUG_LOG.md`; phase 2 fixed all but the perf-only R13-04 (deferred watch-item). R13-01 offline-resync ref bug (rewrote `use-draft-feeds.ts` edge detection into an effect + monotonic `reconnectNonce`, consumer dedupes per nonce in `client.tsx`); R13-02 DEF/DST budget-key unified (`scoring.ts` + `presets.ts`); R13-03 scarce-tier PUSH threshold verified correct + pinned with 3 new tests; R13-05/06/07 LOW batch fixed (nav-context useState pattern, StealFlash scoped disable, rounded auction cap). Gate: type-check 0, test:run 466/466 (+3), build exit 0, lint 39/108 (down from 60/109, −21 refs/set-state errors, 0 new). See `BUG_LOG.md` R13 resolution table + `CHANGELOG.md`.
> - Class: WORKHORSE
>   Reason: bounded implementation against approved R13 plan
> **Size:** L - `/bug-hunt full` across the whole app + coverage expansion on the new engines. If findings exceed one sitting, catalog + triage them here and split the fixes into R13-fix cards (a full bug hunt legitimately produces more fix work than one window holds).
> **Why:** the old 205 tests passed while the core was missing. This is where coverage finally lands on the things that decide the draft.
> **Reads first:** `.claude/REVIEW_LENSES.md`, the R1–R12 CHANGELOG entries, `src/**/*.test.ts`.
> **Work:** `/bug-hunt full` across the whole rebuilt app, triage by severity, fix the real ones; **expand automated coverage on the new engines** — roster-solver, team-aware max-bid, strategy target prices, Monte Carlo sim — so the logic that wins the draft is actually tested.
> **Done-when:** `/bug-hunt full` clean (or every finding triaged with a written defer reason); tests cover the team-construction paths; type-check + lint (0 new) + build clean. Findings + fixes in BUG_LOG + CHANGELOG.

### R14 — Usability walkthrough — Claude drives Chrome `[Claude driving + Sonnet fixes]` · class: output/bugfix
> - Class: WORKHORSE
>   Reason: bounded implementation against approved R14 plan
> **Size:** L - walk every flow at mobile arm's-length + fix P1/P2. Fix P1s in-session; P2 overflow becomes R14-fix cards so the walkthrough itself stays one sitting.
> **Why:** Joe's phone rehearsal (R15) must not be the first human click-through.
> **How:** load the app at **mobile viewport, arm's-length**, and walk **every** real flow end-to-end as a first-time user: Research → pull players → read a player card (tags/range/sources/fit) → set graded targets/avoids → strategies → Cheat Sheet/construction board → enter the live room → join → track picks → budget/pace/roster fit → Post Draft. Catalog every dead-end, "how do I get back," confusing label, jank, or cheap-looking moment. Screenshot each.
> **Done-when:** a written findings list (each with a screenshot), every P1/P2 issue fixed and re-shot, and a clean full-walkthrough screenshot set. This is the "ready for Joe's hands" sign-off.
>
> **R14 findings log (in progress 2026-08-19):**
> - **F1 [P1, FIXED]** `POST /api/user-tags/batch` 500'd (`invalid input syntax for type uuid: "null"`) when `leagueId=null` + `includeGlobal` — the state `/prep/board` and `/prep/simulate` pass before a league loads, crashing their TARGET/AVOID tag load. Branch-order bug; fixed to handle null before the `.eq` interpolation (mirror the GET route's `if (leagueId)` guard). Live proof 500->200; +3 tests; gate green. See CHANGELOG 2026-08-19 / R14 finding #1.
> - **F2 [P3, FIXED]** `/prep` showed a "RUN FIRST PULL" call-to-action while simultaneously reporting `3,150 players · FRESH` — the button keyed off `latestRun` (a saved analysis run) instead of the player pool. Now keys off `cache` (same source as the badge): "Pull fresh data" when a pool exists, "Run first pull" only when there is none. Live proof (:3141): button reads "PULL FRESH DATA" beside "3,150 · FRESH". Commit `873f0eb`.
> - **F3 [P3, FIXED]** the "K" (kicker) filter tab was on `/prep/board`, not `/prep/players` (players already omits K). Removed K from the board `POSITIONS` list and filtered kickers from the base pool, mirroring the players page. Live proof (:3141): board BY POSITION row = ALL/QB/RB/WR/TE/DEF, no K. Commit `873f0eb`.
> - **F4 [P2, FIXED]** `/prep/simulate` league Select leaked the raw league uuid (`0d2914f1-...`) into the trigger instead of the name. Radix `SelectValue` auto-text fails on a value set programmatically on load. Fixed to render `selectedLeague.name`. Live proof: trigger now reads "Nasties 2026" (read_page ref_13). Gate green, commit `6a31095`. See CHANGELOG 2026-08-19 / R14 findings #4+#5.
> - **F5 [P1, FIXED]** live draft room never loaded a saved strategy: `use-live-draft-data.ts` fetched `/api/strategies` with no leagueId (paramless GET 400s), so `stratRes.ok` was false and the strategy block was skipped -- the in-room advisor fell back to "No strategy set" even when a saved strategy existed. Fixed by fetching strategies after the session resolves with `?leagueId=<session.league_id>`. Live proof (fresh tab): one room load = one `GET /api/strategies?leagueId=... -> 200`, zero bare 400s, 0 console errors. Gate green, commit `6a31095`. See CHANGELOG 2026-08-19 / R14 findings #4+#5.
> - **F6 [needs R15 confirm]** live room showed some rows at $1 with `PROJ="-"` during sandbox probing. Correlates with the intermittent sandbox Supabase egress (transient `fetch failed`, not present on Joe's machine), so it is most likely an environmental data-load artifact rather than an advisor-logic defect. NOT blind-fixed -- flagged to confirm on Joe's real device in R15; if it reproduces there it becomes an R15-fix card.
> - **Screenshot half BLOCKED:** the in-sandbox Browser pane does not composite frames, so the pixel screenshot set in this card's done-when cannot be produced here (same constraint documented on every prior D/SP card). Functional/structural half is being run via DOM + live endpoint probes. Recommendation: fold the visual sign-off into R15 (Joe's real device) rather than block R14 on a screenshot the sandbox cannot take.

### R15 — Rehearsal GATE `[Sonnet + Joe]` · class: pipeline — **THE GATE**
> - Class: WORKHORSE
>   Reason: bounded implementation against approved R15 plan
> **Size:** M - a single rehearsal sitting with Joe on his phone; issues found become a short R15-fix list (expected, that is what a rehearsal produces).
> **Why last:** you can only rehearse the finished, hardened app, and this is the **only session that needs Joe's hands.**
> **Work:** full mock draft on Joe's phone against the **live auctioneer** — join/sync proven live (~3–6s), picks tracking, team-aware advice correct, budgets right, offline-resync proven, no surprises. (Cost gate: if AI panels are on, a real dry run bills Claude — Joe's typed approval first.)
> **Done-when:** Joe has run a full mock draft against the live auctioneer on his phone with picks tracking, roster-aware advice correct, budgets right, offline-resync proven, and no surprises. Issues found become a short R15-fix list (expected — that's what a rehearsal finds).
> **Runbook:** tap-through phone checklist prepped at `.claude/R15_REHEARSAL_CHECKLIST.md` (both endpoints verified live 2026-08-20: app `fantasy-football-draft-app.vercel.app` 200, auctioneer `/api/state` 200). Covers the two pre-run decisions (cost gate; deployed-build freshness), pre-flight setup, the full mobile walkthrough, auto-connect + pick-tracking verification, the offline-resync proof step, and the F6 device check.

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
Name a real reference app before building (EA FC — never generic dark-glass/gradient slop). Show a mockup, get Joe's explicit **yes** on the look BEFORE code. A persistent bottom nav with genuinely nice icons is a Joe hard-requirement.

### 📥 Outsourced wireframes — KEEPER reference for the unbuilt screens (2026-08-17)
Joe outsourced 5 phone mockups (402px) and likes them. They are saved into `UI/mockup-*/` (per the `UI/` per-screen convention: `DESIGN.md` + as-received `screen.png`/`code.html`), with a shared translation guide at **`UI/mockup-SHIELD-token-map.md`**. **Two decisions LOCKED with Joe:**
1. **Every green → SHIELD steel-blue.** The mockups use lime-green `#A3E635` for all win/positive/grade/value signals; SHIELD has no green ("success reads steel-blue"). All green maps to `--ffi-blue`/`--ffi-success` `#5FA8E0`. **Zero new hues — the SHIELD palette stays locked.** (Mockup sky-blue also → steel-blue; ink `#EAF1F8` is already SHIELD ink exactly.)
2. **These 5 are the new keeper reference for the unbuilt screens** — **D5** (`UI/mockup-strategy-detail/` + `UI/mockup-post-draft-review/`) and **D6** (`UI/mockup-roster-pressure/`). The older `.claude/mockups/sim-results-v1.html` is **annotated SUPERSEDED** (kept for numeric-density reference only; do not build against it).

Screen → target: S1 research-hub `/research`; S2 player-browser (D4, already built); S3 strategy-detail (D5); S4 roster-pressure `/draft/live` (D6); S5 post-draft-review `/review`. Built-vs-new feature intents (including the winning-team-% bars, sample-roster carousel, per-slot expand-to-alternates, in-draft strategy switch, and the "no em-dashes" narrative rule) are captured per screen in each `UI/mockup-*/DESIGN.md`. **No app code changes were made — this is reference capture only.**

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
> - **Functional gap — ✅ CLOSED 2026-08-19 (Phase 1):** player pull on `/prep` now re-flows strategy proposals. `src/lib/prep/pull-signal.ts` stamps a per-league timestamp on pull completion (`/prep` `doRun`); `StrategyProposals` reads it on mount + tab focus/visibility and re-runs `/api/strategies/propose` when the stamp is newer than the one its proposals were built from. Proof: 7 new tests (pull-signal unit + re-flow component, both directions), 504/504 green, type-check 0, lint 0 new, build clean.
> - **Proof:** type-check 0 errors; 392/392 tests green; lint 0 new; build clean; 375px screenshot `d3_strategies_375.png`. Migration applied to production Supabase (Joe, 2026-08-15 via SQL Editor).

### D4 — Players card redesign `[Sonnet]` · class: output ✅ DONE (2026-08-16)
> **Folds in the Players feedback.** **Thinner** list cards; **tier on the card face** (absent today, `ffi-player-intel-card.tsx`); move projected points to the expansion; keep base/mkt/your-value + the range bar Joe likes; add **expert consensus**. (Live-updating values = R11/D6, not here.)
> **Done-when:** thinner card with tier + consensus, points demoted to expansion, on the approved look. Screenshot.
>
> **Shipped (2026-08-16) — 4th attempt, approved v3 mockup, all failed-session constraints honored:**
> - `src/components/prep/ffi-player-intel-card.tsx` — full rewrite. Compact row = one ~50px line: color rail + position chip (pos + rank) | mixed-case name + team/BYE | tier badge | value range + base underneath | chevron. Removed headshot, `.toUpperCase()`, rec strip, range bar, and the "Your value" label from the compact face. Tier now on the card face from `player.expertTier`: T1 = brick-red glow (elite), T2 = steel-blue outline, T3+ = muted outline. Projected points demoted into the expansion.
> - Expansion reorganized into labeled groups: **Valuation** (range bar room/base/worth + Market / Proj Pts / Experts strip — expert positional rank shown plainly, e.g. "RB2", no "ECR" jargon), **Outlook** (plain-English rec + solver fitLine), **Draft Intel** (user + system tags), **Your Call** (target/avoid + priority/severity graders), and a "how this value is calculated" provenance toggle.
> - `src/components/prep/__tests__/ffi-player-intel-card-fitline.test.tsx` — updated: fitLine now lives in the expansion, so the presence assertions render the card open (`isExpanded ?? true`). Guard preserved (fitLine-reaches-DOM), only location changed.
> - **Zero em/en-dashes** (hyphens only), per Joe's global policy. Verified across the whole file.
> - **Proof:** `npm run test:run` 392/392 green · changed-file lint clean (`npx eslint <2 files>` exit 0; the 61 project-wide lint errors are all pre-existing in untouched `src/lib/research/*` + `src/lib/supabase/*`) · `npm run build` ✓ Compiled successfully · two real 390px screenshots captured live in real Chrome via a temporary `/d4preview` auth-free harness (harness deleted after capture): (1) expanded McCaffrey card showing all five groups with real Kanit/Hanken/JetBrains fonts, range bar room $70/base $77/worth $83, Market ~$52 / Proj Pts 347 / Experts RB2; (2) all 8 collapsed rows proving tier variety (T1 red glow, T2 blue outline, T3/T4 muted) and position-color chips (RB green, WR blue, QB pink, TE orange, DEF grey).
>
> **FAILED SESSION (2026-08-16) — hard-won design constraints for the next attempt:**
> Three mockups, all rejected. Do NOT repeat these mistakes:
> - **NO ALL-CAPS names.** Current code does `.toUpperCase()` on player names -- this must be removed. Names read as yelling and scan poorly in a list.
> - **NO unexplained jargon.** "WR2 ECR" means nothing at a glance. If you show expert position rank, label it plainly ("WR2 consensus" or just show it contextually) or drop it from the face entirely -- Joe does not want acronym clutter.
> - **NO "Your value" label above the range.** The range is obviously the value. The label is noise.
> - **No blue blob.** Every element in all three mockups collapsed into the same steel-blue tonal family -- tier badge, value, tags, strip. Use RED for the one most important signal (T1 tier = elite, act now). Everything else earns its own clear treatment or gets dropped.
> - **Compact row = one line, ~44px tall.** Current cards are 130-160px. The entire compact row should be: position chip | name | tier | value | expand. Nothing else. No headshot, no recommendation strip, no range bar -- those open in the expansion.
> - **SHOW JOE A REAL BROWSER SCREENSHOT of the actual current card first.** Joe's feedback was partly about not recognizing the design. Start the next session by screenshotting the live card at 375px so you and Joe have a shared baseline before any mockup work.

### D5 — Sim results screen `[Sonnet]` · class: output · DONE 2026-08-17
> - Class: WORKHORSE
>   Reason: testable UI implementation against the keeper mockups (see below)
> **Keeper reference (updated 2026-08-17):** `UI/mockup-strategy-detail/` + `UI/mockup-post-draft-review/`, translated via `UI/mockup-SHIELD-token-map.md` (all green → steel-blue). `.claude/mockups/sim-results-v1.html` is SUPERSEDED — numeric-density reference only.
> **Size:** M - one Sonnet sitting to build the keeper look against R10b's data. UNBLOCKED 2026-08-17 (R10b shipped its grading/record/top-5/frequency outputs + a live `/prep/simulate` data path); D5 restyles that path to the SHIELD look.
> **Depends on:** R10b (grading/record/top-5/frequency DATA) + D1. Builds the keeper mockups for real, consuming R10b's outputs. Includes the NEW winning-team-% bars (winning teams only, not raw roster frequency) + the up-to-5 sample-roster carousel + the collapsible no-em-dashes narrative.
> **Done-when:** Sim results renders R10b data in the approved look (distribution, projected record, top-5 modal rosters, players-you-land-most, saved runs/compare). Screenshot.
> **Shipped 2026-08-17 (Sonnet):** New `src/components/prep/sim-results-cards.tsx` (SHIELD presentational layer, no engine changes): `SimRecordHero` (projected record hero card), `SimWinningTeamPlayers` + `deriveWinningTeamLanded` (winning-team-% bars derived from R10b's `topRosters` filtered to shapes whose `avgWins` clears the modal-record win threshold, weighted by real `frequencyPct`, NOT the raw all-sims `landed` frequency — documented data-shape workaround since `SimSummary` doesn't expose raw per-run rosters to the client), `SimRosterCarousel` (up-to-5 sample-roster horizontal scroll-snap carousel), `SimLandedTable` (players-you-land-most, row list not an HTML table), `SimNarrative` (collapsible, zero em/en dashes, built from real passed data only), `SimCompareRows` (saved-run comparison), `SimSavedRunsList`. `prep/simulate/client.tsx` rewired to the new components (data wiring/handlers untouched); "Run N sims" promoted to `.ffi-btn-hero` (red = the moment, per DESIGN_SYSTEM.md); info percentages moved off brick-red onto steel-blue-bright (red is action-only in SHIELD, not routine stats). `prep/simulate/page.tsx` heading swapped to `ffi-display-lg`/ink-2 tokens. **12 new tests** (`sim-results-cards.test.tsx`, incl. 3 covering `deriveWinningTeamLanded`'s winning-teams-only behavior); 429/429 green (was 417). Gate: type-check 0 errors · lint 0 new (4 touched files clean) · build succeeds (Turbopack, all 56 routes). **Live-verified** on the already-running port-3003 dev server in a fresh tab (this session's own `next dev` couldn't co-run — Next 16 locks one dev server per directory regardless of port): real 30-sim run rendered 14-0 projected record (70% of sims), winning-team-% bars (Amon-Ra St. Brown/Bijan Robinson/Brock Bowers etc. at real shares), 5-shape sample-roster carousel with real player/team names and $, players-you-land-most table, narrative expand/collapse with real sentences, saved-run load + compare, all confirmed via DOM text + network (`/api/sim-runs*` 200 OK) + console (0 new errors; one pre-existing unrelated `useUserTags` fetch-500 in this env). Zero em/en dashes confirmed by regex scan of full page text. Mobile 375px: no page-level horizontal overflow, carousel scrolls within its own container. **Pixel screenshot blocked** (Browser pane not compositing in this headless session, same constraint as R5/R6/R9/R10b) — DOM/network/console evidence stands in its place, not faked.

### D6 — Live room visual + UX pass `[Sonnet]` · class: output
> - Class: FRONTIER
>   Reason: keeper mockup now exists (`UI/mockup-roster-pressure/`, 2026-08-17); R11b behavior wiring now DONE (2026-08-17) -- NEXT BUILDABLE
>   Verifier: OTHER_FAMILY
> **Keeper reference (2026-08-17):** the live-room mockup set, all via `UI/mockup-SHIELD-token-map.md` (reconcile against the room's scoped `theme.ts`): `UI/mockup-draft-waiting/` (pre-draft waiting room), `UI/mockup-on-the-block-bid/` (on-the-clock BID — the red moment), `UI/mockup-on-the-block-pass/` (on-the-clock PASS — muted, no red), `UI/mockup-roster-pressure/` (target-at-price per open slot). NEW asks captured there: per-slot expand-to-alternates at target prices (active-strategy driven), REMOVE the arbitrary "next target," and an in-draft strategy switch that re-runs the pure/$0 solver. Red-usage rule across these: brick-red only on the BID state's verdict + max-bid; PASS/waiting stay steel-blue.
> **Size:** L - new look + the R11 UX gaps landed once. Large; if the UX gaps overflow one sitting, the visual reskin ships first and the gap-closure splits to a D6-tail card.
> **Pairs with R11b** (build the room once, done 2026-08-17). Applies the new look AND lands the remaining R11 UX gaps: FLEX tier row + T4/T5, collapsible My Team + on-block card, live-updating player card. (Strategy switcher, adaptive pivot, and live target/avoid toggles are already wired by R11b -- this card reskins their pixels, not their behavior.)
> **Done-when:** room renders the new look with the R11 UX gaps closed, mobile. Screenshot.

### ✅ D6b-1 -- Live room v5 alignment (UI pass) `[Sonnet]` · class: output · DONE 2026-08-18
> **Scope:** pure UI, no Monte Carlo (D6b-2 is the Opus session). Aligned the shipped D6 live room to the locked v5 cockpit spec (`docs/ux_redesign/d6_cockpit_mockup_v5.html`).
>
> **Shipped (2026-08-18, Sonnet):**
> - `src/components/draft/live-room/status-bar.tsx` -- `round?` + `pick?` props added; stacks "R{N} · PICK {N}" under the LIVE pill in JetBrains Mono tabular-nums (gap #4).
> - `src/components/draft/live-room/strategy-strip.tsx` -- label "Strategy · ranked from your research"; active = `{name} - #{rank}`; dropdown items ranked (gap #3).
> - `src/components/draft/live-room/on-the-block-card.tsx` -- complete restructure: summary row $X tgt chip (gap #2); headshot slot + "RB6" positional rank in meta (gap #5); `MarketBand` sub-component steel-blue track + red target marker (gap #1); "The Read" label; `CONF · HIGH/MED/LOW` chip from `explain.ts` (DEC-2b Sonnet half); red inset left rail.
> - `src/components/draft/live-room/inline-players-panel.tsx` (NEW) -- collapsible Players section: search + ALL/QB/RB/WR/TE/DEF filters + Rk/Player/Proj/Value/Fav grid + star toggle (gap #6).
> - `src/components/draft/live-room/auction-room.tsx` -- StrategyStrip above OnTheBlockCard; confidence via `explainPlayer()`; StatusBar round/pick; InlinePlayersPanel below My Team.
> - `src/components/draft/live-room/__tests__/d6b1-ui-alignment.test.tsx` (NEW) -- 19 new tests covering all 6 gaps + CONF chip + regression guards.
>
> **Gate:** type-check 0 errors · **485/485** tests green (+19) · lint 0 new errors in changed files · build 56 pages clean · bug-hunt free (0 findings in 5 changed files). Visual proof: headless-env limitation (same as D6/R11a/D5).
>
> **Not in D6b-1 scope:** Monte Carlo land-probability (D6b-2, Opus session).

### ✅ D6b-2 -- Live Read: Monte Carlo land-probability wiring `[Opus]` · class: pipeline · DONE 2026-08-18
> **Depends on:** D6b-1 (UI slot for the sim% signal is now built). **DEC-2b Opus half.**
> **Work:** wire `runMonteCarlo` land-probability into the live Read display. After a latency check -- 24 seeded runs per nomination synchronous may stall; precompute per nomination or cap at a fast-enough N to stay within the nomination clock window.
> **Done-when:** live Read shows a real sim% from Monte Carlo (not a fabricated number); latency budget confirmed. Tests on the wiring. Screenshot.
>
> **Shipped (2026-08-18, Opus):**
> - `src/lib/draft/room-sim-probability.ts` (NEW) -- pure $0 adapter `computeLandProbability`. Builds the board from live undrafted pool + drafted names, maps the me-seat's REMAINING roster shape + budget into `runMonteCarlo` (R10a engine, unchanged), and returns `hits/total` = the fraction of `LAND_PROB_RUNS` (16) seeded auctions where the me-seat ends holding the on-block player. Board capped at `numManagers * openSlots + 12` (lossless: the tail never sells before rosters fill) to bound early-draft latency. Returns `null` (chip hidden) on no signal: degenerate input (0 managers / $0), empty board, on-block already drafted, or roster full. **DEC-2b honored:** the % is always a real `runMonteCarlo` fraction or null, never fabricated; fixed default `seed=1` keeps it deterministic. Header documents the deliberate symmetric "from-here" approximation (engine has no per-manager initial state) as in-scope for the wiring step.
> - `src/components/draft/live-room/on-the-block-card.tsx` -- added `landProbability?: number | null` prop; renders a `LAND · NN%` chip (muted neutral, `Math.round`) right after the CONF chip in The Read. `!= null` guard: shows "LAND · 0%" honestly at 0, hides entirely at null/undefined.
> - `src/components/draft/live-room/auction-room.tsx` -- new `landProbability` useMemo calls `computeLandProbability` from live room state (on-block, available pool, drafted names, roster slots, my picks, team count, my/league budget); passes the result to OnTheBlockCard.
> - `src/app/(app)/draft/live/client.tsx` -- **bug-hunt fix (HIGH):** hoisted `myPicks` into a `useMemo` keyed off `state` (was a fresh `.filter()` array every render, which defeated the land-probability memo and re-ran 16 Monte-Carlo auctions on the render thread on every poll/interaction). Now stable between picks.
> - Tests (NEW): `src/lib/draft/__tests__/room-sim-probability.test.ts` (8 -- real-sim-output/DEC-2b, determinism, seed-distribution, drops-drafted, positive-land, roster-full null, degenerate null, latency) + `src/components/draft/live-room/__tests__/d6b2-land-prob.test.tsx` (4 -- renders NN% next to CONF, rounds, shows 0%, hides at null).
>
> **Gate:** type-check 0 errors · **497/497** tests green (+12) · lint 0 new errors in changed files (warnings all pre-existing) · build ✓ Compiled successfully in 4.6s · **latency 173.6ms** worst-case (16 runs, empty early-draft board -- well under the multi-second nomination clock, and memoized to run once per pick). **Bug-hunt (static, D6b-2 change set):** 1 HIGH (memoization defect -- FIXED this session, see above), 2 findings logged + deferred as pre-existing/disclosed engine behavior (BUG-D6b2-01 tie-break bias, BUG-D6b2-02 symmetric-state approximation). Visual proof: same headless-env limitation as D6/D6b-1/R11a (no active `/draft/live` session reachable) -- the LAND chip render path is proven by the 4 RTL DOM tests against the real `OnTheBlockCard`, plus a faithful static HTML render (exact `theme.ts` tokens + exact chip markup) delivered in-chat.
>
> **Not in D6b-2 scope:** extending `sim-engine.ts` with true per-manager initial state (each opponent's own budget/filled slots) -- documented as a separate future step.

---

## SP-track -- SHIELD Screen-Parity Sprint (added 2026-08-18) -- PAUSED

> ### ⏸ PAUSED 2026-08-19 -- functionality before pixels
>
> Joe's order: pause the SHIELD screen reskin, sequence functionality first, but KEEP this track on the build plan (do not delete it). This whole SP-track is retained and runs LAST, only after the three open functional/usability gates close: the line-517 strategy re-flow fix (Phase 1), R14 (usability walkthrough, `BUILD_PLAN.md:411`), and R15 (rehearsal gate, `:419`). No screen reskin jumps that queue again. Everything below is real, wanted work -- just not before the app is proven usable and rehearsed.

> ### ▶ AUDIT RECONCILIATION 2026-08-19 (regenerated live against the tree — supersedes stale estimates below)
>
> The three Explore passes for the full-app rollout did not survive context compaction, so the audit was re-run directly with grep/glob against the current source. Authoritative findings:
>
> **1. New sanctioned layer — `src/components/ui/shield.tsx`.** This session made the recovered SHIELD look a typed component layer: `ShieldBackground`, `PageTitle` (red bevel), `CardTitle` (chrome), `Nameplate` (approved gunmetal card, `interactive` = hover lift), `IconChip`. **This supersedes the "reuse ffi-primitives + DestRow/QuietLabel" instruction in this SP-track for cards/titles/icons.** The new acceptance bar: cards are `<Nameplate>` (never `.ffi-card`, never shadcn `Card`), headers `<PageTitle>`, chrome titles `<CardTitle>`, chip icons `<IconChip>`, buttons/badges/inputs still `ffi-primitives`, zero inline hex. `shield.tsx` + `ffi-primitives.tsx` = the whole vocabulary.
>
> **2. Only 2 screens are actually on-standard:** `/prep` hub and `/prep/players` (re-converted this session, Joe-approved, playwright-proven). Everything else is off-standard.
>
> **3. Inline-hex census = 572 literals across 18 files** (earlier "281/10" was wrong). Concentration: `/season` cluster + its two in-season components = **~470 of 572 (82%)**, and `/season` is NOT wired into `app-shell.tsx` nav (unreachable). `/prep/players` intel card = 102 (queued for the guarded sweep). `/draft/live` component subtree = ~94. Every prep page body, /draft hub, /draft/setup, /draft/review, and all auth pages carry ZERO inline hex — their flatness is the card construct, not hex.
> Per-file (desc): intel-card 102 · waiver-wire-panel 85 · season/trade 77 · season/matchups 75 · start-sit-comparison 74 · draft/ffi-player-card 35 · draft/ffi-ai-insight 24 · season/page 23 · season/start-sit 20 · draft/player-pool 17 · season/waivers 16 · draft/ffi-position-filters 11 · manual-pick-entry 3 · injury-watch 3 · page-skeleton 2 · settings 2 · players/loading 2 · draft/live/client 1.
>
> **4. Card-construct audit (criterion #1 — the real "flat" tell, hex-clean ≠ on-standard):** FLAT via `.ffi-card` (12 files) = screens /draft/live, /draft/review, /prep/runs + components position-scarcity, review-cards, strategy-picker, trash-talk, league-config-form, strategy-compare, strategy-editor, strategy-list, strategy-proposal-card. RAW shadcn `Card` (11 files) = all 4 auth pages + draft components auction-advisor, league-overview, manager-tendencies, manual-pick-entry, my-roster, pivot-history, strategy-swap. The "clean" prep screens look half-right because the flatness moved DOWN into their child components (strategy-editor/list/proposal-card, league-config-form still ride `.ffi-card`).
>
> **5. Not dead code:** `ffi-player-card` / `ffi-ai-insight` / `ffi-position-filters` render transitively under `/draft/live` via `player-pool` — convert them with the draft-live pass, do not delete.
>
> **6. Locked decisions this turn:** order = draft-path first then the rest; sign-off = per screen (convert one, paste playwright shot, Joe approves, next); drift guard = ESLint `no-restricted-syntax` hex rule (warning during sweep → error at end); auth = light SHIELD brand (background + one Nameplate + PageTitle), sequenced last.
>
> **7. Plan-of-record reconciliation:** the one plan of record is **`.claude/BUILD_PLAN.md`** (this file) per the one-plan rule. BOTH scratch files -- `C:\Users\jrasa\.claude\plans\fantasy-football-draft-app-repo-we-are-atomic-spindle.md` AND `C:\Users\jrasa\.claude\plans\cozy-waddling-creek.md` -- are SUPERSEDED and each carries a one-line banner pointing here. This SP-track section is the truth; the scratch files are history.
>
> **Progress:** SP screen 1 = `/prep/players` converted (card material `.ffi-plate-row` + `PageTitle` + Nameplate panels), type-check clean, playwright-proven, awaiting Joe sign-off before commit + screen 2 (`/prep/board`).

**Why this track exists:** SHIELD v4.0 (D0-locked) was rolled out as a token-VALUE swap in `globals.css`. Because the token NAMES were kept stable from GRIDIRON v3, that one change repainted all 61 screens at once -- but a repaint is not a redesign. Only 5 areas got a true craft pass (D2 /prep hub, D3 /prep/strategies, D4 /prep/players, D5 /prep/simulate, D6 /draft/live). Every other screen still wears GRIDIRON-era structure (flat forms, iOS list rows, generic primitive shells) plus stale off-token color literals the paint swap could not reach. Joe's verdict: the app "is in some of the right colors, but NOT THE ACTUAL DESIGN OBJECTS, BACKGROUND AND EVERY OTHER THING." This track rebuilds every non-SHIELD screen to the real SHIELD bar, comprehensively and verifiably. Opus is reserved for the one design/decision item; every build is a bounded Sonnet WORKHORSE against an approved mockup; a fresh-eyes OTHER_FAMILY validator runs behind every builder. Full scope lives in this SP-track section (the scratch plan files are SUPERSEDED per point 7 above).

**The SHIELD bar (what "rebuilt" means, from the 5 DONE screens):** (1) Oswald brick-red 26px page header `ffi-title-red text-[26px]` + steel-blue context chip; (2) rich hero/destination objects from inline `var(--ffi-*)` tokens (surface-3->surface-2 gradient, red left-rail accent, duotone icon chip) -- pattern in `prep/page.tsx` DestRow 464-539; (3) QuietLabel section headers (Kanit-cond, uppercase, 0.28em, `--ffi-ink-3`); (4) dedicated per-screen presentational components (generic `FFICard`/`FFIButton` shells alone do NOT qualify); (5) all color via inline `var(--ffi-*)`/rgba, `tabular-nums` on numbers, no hardcoded structure hex, no shadcn `Card`; (6) navy field (`.stadium-atmos`) inherited from `app-shell.tsx:106-107` for the `(app)` group -- the `(auth)` group lacks it and must be given it.

**Screen tiers:** A (near-target, token sweep only) = /draft hub, /draft/review, /prep/board. B (on-token but plain, needs design + re-layout) = /draft/setup (largest), /prep/configure, /prep/runs, /settings. C (from scratch) = (auth) sign-in + sign-up.

**Reuse, do not rebuild:** `src/components/ui/ffi-primitives.tsx`; `src/components/prep/ffi-player-intel-card.tsx`; `src/components/draft/review-cards.tsx`; `prep/page.tsx` DestRow/QuietLabel; class vocab in `src/app/globals.css` (`.ffi-title-red`, `.ffi-card*`, `.ffi-hero`, `.ffi-btn-hero`/`.ffi-btn-primary`, `.stadium-atmos`). Mockup translation via `UI/mockup-SHIELD-token-map.md`.

**Leave alone:** sanctioned position-chip hex (`board/client.tsx:38-43`, `prep/page.tsx:91-99`); legacy `--ffi-gold*` token names in `app-shell.tsx:144,271,294` (map to red via globals, functionally correct).

**Dependency spine:** SP-0 and SP-1 run immediately (no mockup needed). SP-2 (Opus design) is a HARD Joe-gated halt -- no SP-3..SP-7 build starts until Joe signs off the mockups. Each build has its own OTHER_FAMILY validator behind it.

### SP-0 -- Refresh stale Design review lens to SHIELD v4.0 `[Sonnet]` · class: docs
> - Class: WORKHORSE
>   Reason: bounded doc rewrite against an already-LOCKED spec (DESIGN_SYSTEM SHIELD v4.0); zero open judgment.
>   Verifier: self (docs class, QA lens only)
> **Size:** S. **Depends on:** nothing -- run first, validators depend on it.
> **Why:** `REVIEW_LENSES.md` Design lens still describes the retired Tactical Hologram system (`#8bacff`, `#2ff801`, `#031018`, Space Grotesk). Every SP validator uses that lens; if it is wrong, validation is wrong.
> **Reads first:** `.claude/DESIGN_SYSTEM.md` (SHIELD v4.0 LOCKED), `.claude/REVIEW_LENSES.md:73-83`, `src/app/globals.css`.
> **Work:** rewrite the Design lens pre-check + verify checklist to the SHIELD bar (Oswald-red 26px header + steel-blue chip; inline `var(--ffi-*)` only, no structure hex; dedicated components over generic shells; RED sparingly for action/moment/headers, steel-blue as everyday structure; 44px touch targets; navy field inherited from app-shell). Also commit the already-uncommitted `DESIGN_SYSTEM.md` + `UI/mockup-SHIELD-token-map.md` so the reference is version-pinned.
> **Done-when:** Design lens has zero references to Tactical Hologram / Space Grotesk / `#8bacff` / `#2ff801`; grep of `REVIEW_LENSES.md` for those literals returns 0; the SHIELD reference files show committed in `git status`.

### SP-1 -- Tier A token sweep: draft hub, draft/review, cheat sheet `[Sonnet]` · class: output
> - Class: WORKHORSE
>   Reason: mechanical find-replace against a known literal map on 3 already-SHIELD-shaped screens; zero layout decisions.
>   Verifier: OTHER_FAMILY (SP-1V)
> **Size:** M. **Depends on:** SP-0 (validator needs the correct lens). Not blocked on SP-2.
> **Why:** these 3 already hit the structural bar but carry stale GRIDIRON literals the paint swap missed: volt-green `rgba(139,255,69,...)`, off-token blue `rgba(77,130,255,...)` / `#8bacff` (NOT the SHIELD `--ffi-blue #5FA8E0`), plus a retired `Zap` bolt on the hub (DESIGN_SYSTEM says Live Draft carries `Gavel`).
> **Reads first:** `src/app/(app)/draft/page.tsx`, `src/app/(app)/draft/review/client.tsx`, `src/app/(app)/prep/board/client.tsx`, `src/app/globals.css`.
> **Work (exact literal map):** `rgba(139,255,69,...)` -> `var(--ffi-volt)`/`var(--ffi-volt-glow)` at `review/client.tsx:80-81,267` and `board/client.tsx:349-350,405,562-563`; off-token blue `rgba(77,130,255,...)`/`#8bacff` -> `var(--ffi-blue)`/rgba(95,168,224,...) at `board/client.tsx:335,442,476,532`; `Zap` -> `Gavel` at `draft/page.tsx:333`. DO NOT touch sanctioned position-chip hex (`board/client.tsx:38-43`). `runs/client.tsx:66` is out of scope here (SP-5).
> **Done-when:** grep of the 3 files for `139,255,69`, `77,130,255`, `8bacff`, `Zap` returns 0 (position-chip hex untouched); type-check 0; test:run green; lint 0-new; build clean; screenshots of all 3 show red/steel-blue accents and no green; A1-A10 pass.

### SP-1V -- Validate Tier A sweep `[Sonnet · Opus if visual dispute]` · class: output
> - Class: WORKHORSE (validation)
>   Reason: bounded verification against SP-1's literal map + screenshots; runs behind the builder.
>   Verifier: OTHER_FAMILY -- fresh context, adversarial, did NOT write SP-1.
> **Size:** S. **Depends on:** SP-1.
> **Work:** fresh-eyes `/code-review` (adversarial) + `/bug-hunt free` on the 3 changed files; re-run the SP-1 grep independently; apply the SHIELD Design lens (post-SP-0) + QA lens; screenshots confirm no green remains and structure blue is `--ffi-blue`.
> **Done-when:** validation report with 0 unresolved HIGH; independent grep confirms 0 stale literals; screenshots attached; gate re-run green.

### SP-2 -- SHIELD design + mockups for setup, configure, runs, settings, auth `[Opus]` · class: output -- **[x] DONE (Joe-approved 2026-08-18)**
> **Shipped:** `UI/mockup-SHIELD-screens.html` (all 5 screens, one combined pass; artifact `aa36d1ca-4dd2-4669-94ec-62ce90624634`). Rebuilt on the real SHIELD texture stack ported verbatim from `globals.css`: `.stadium-atmos` field + `.atmos-grain` film grain (398) + animated `.ffi-hero::before` sheen (562) + `.ffi-card-interactive::before` edge-sheen (531) + inset-lit `.ffi-btn-hero` (468). No net-new components. Per-screen reuse: (1) /draft/setup -> FFISectionHeader, FFICard/-Elevated, FFIButton, FFIBadge, FFIInput, DestRow (kills blur-3xl + #5FA8E0/#8bacff/#9eadb8); (2) /prep/configure -> FFISectionHeader, FFIInput, FFIBadge, FFIButton, FFICard (kills rgba(77,130,255)); (3) /prep/runs -> DestRow, FFIBadge, FFIPositionBadge, review-cards.tsx, FFIButton (kills green rgba(139,255,69)); (4) /settings -> DestRow, QuietLabel, FFICard+InfoRow, FFIBadge, signOut action preserved (kills #8bacff Dev badge); (5) (auth) from scratch -> FFIButton hero, FFIInput, FFICard-elevated, .stadium-atmos field, all Supabase wiring preserved. Persistent mobile bottom tab bar ported from `app-shell.tsx:249-315` onto all 4 (app) screens (active tab: setup=Setup, configure=Setup, runs=Research, settings=Setup, active state = SHIELD brick-red not blue); (auth) correctly nav-free. Zero em/en-dashes (verified). Joe approved the look incl. bottom nav before any build (SP-3..SP-7 unblocked).
> - Class: FRONTIER
>   Reason: open layout judgment for 5 screens with no existing mockup (Tier B + C); the only planning/decision item; Opus per the model-handoff rule.
>   Verifier: Joe (explicit look sign-off before any build starts).
> **Size:** L. **Depends on:** nothing (can run alongside SP-1). Gates all of SP-3..SP-7.
> **Why:** Joe's quality gate requires he approves the look of substantial UI BEFORE it is built. These 5 have no mockup, so their layout is an open judgment call that must be resolved and signed off before any WORKHORSE touches them. One combined pass keeps the 5 consistent and gives Joe a single sign-off (his chosen cadence).
> **Reads first:** `.claude/DESIGN_SYSTEM.md`, `prep/page.tsx` (DestRow/QuietLabel gold-standard), `prep/simulate/client.tsx` + `src/components/draft/live-room/*` (component-departure pattern), `UI/mockup-SHIELD-token-map.md`, and the current source of each target screen.
> **Work:** produce a SHIELD mockup (annotated static HTML/spec, translated through the token map) for each of: `/draft/setup` (3-step flow -> hero + section objects, kill the `blur-3xl` wallpaper), `/prep/configure` (flat form -> SHIELD sections), `/prep/runs` (card list -> hero/section treatment), `/settings` (iOS list -> SHIELD rows), `(auth)` sign-in + sign-up (from scratch: navy field, Oswald-red header, brick `.ffi-btn-hero` CTA, Kanit display, `ffi-*` inputs). Each mockup MUST name the header treatment, hero/destination object, section headers, and which existing primitives to reuse (no net-new component unless justified). Save under `UI/`.
> **Done-when:** Joe types explicit approval ("yes"/"go"/"approved"); approved mockups saved under `UI/` and referenced by ID; every mockup names its reused primitives. NO SP-3..SP-7 build may start until this is checked.

### SP-3 -- Rebuild /draft/setup to approved mockup `[Sonnet]` · class: output -- **[x] DONE (2026-08-18)**
> - Class: WORKHORSE
>   Reason: bounded build against the SP-2 mockup; largest surface but zero open judgment once the mockup is approved.
>   Verifier: OTHER_FAMILY (SP-3V)
> **Size:** L (biggest rebuild). **Depends on:** SP-2 (approved mockup).
> **Why:** the most GRIDIRON route in the app: generic `FFICard`/`FFIButton` primitives, a forbidden `blur-3xl` glow wallpaper (`client.tsx:253`), and heavy off-token hex (`#5FA8E0`, `#8bacff`, `#9eadb8` across `:250,251,254,257,287,345-346,350,357,435-440,469-473,481,511-525`).
> **Reads first:** approved SP-2 setup mockup; `src/app/(app)/draft/setup/page.tsx` + `client.tsx`; `ffi-primitives.tsx`; `prep/page.tsx` DestRow.
> **Work:** re-layout the 3-step flow to SHIELD hero + section objects per the mockup; remove the `blur-3xl` wallpaper; replace all hardcoded hex with inline `var(--ffi-*)`; reuse primitives (new component only if the mockup calls for it).
> **Done-when:** screenshot matches the approved mockup (header, hero, sections, no glow); grep of the 2 files for `#5FA8E0`, `#8bacff`, `#9eadb8`, `blur-3xl` returns 0; type-check 0; test:run green; lint 0-new; build clean; `/bug-hunt free` clean; A1-A10 pass.
>
> **Shipped:** Files changed: `src/app/(app)/draft/setup/page.tsx` (25 lines to 6, now a thin wrapper, client owns the header), `src/app/(app)/draft/setup/client.tsx` (full rebuild, all 3 steps). SHIELD objects: the GRIDIRON format-gate card (`blur-3xl` glow wallpaper + off-token hex) is replaced by a real `.ffi-hero` block with the giant AUCTION/SNAKE word in `.ffi-title-red`; the static page-level header is replaced by a step-aware `FFISectionHeader` (title/subtitle/action) plus a new steel-blue "Step N of 3" context chip with a red pulse dot, matching the prep-hub header pattern; the old oversized step titles ("Live Draft"/"Start Draft"/"Session Details") are replaced by local `QuietLabel` dividers ("Live Draft"/"Input Method"/"Session Details"); every selectable row (draft-mode, trash-talk, auctioneer-sync) now carries a DestRow-style red volt rail + check on the selected option instead of a blue tint; Step 1 and Step 3's commit CTAs moved from `variant="primary"` to `variant="hero"` (`.ffi-btn-hero`). All off-token literals (`#5FA8E0`, `#8bacff`, `#9eadb8`) and the `blur-3xl` wallpaper are gone from both files, replaced with `var(--ffi-blue)`/`var(--ffi-blue-bright)`/`var(--ffi-ink-2)`/`var(--ffi-volt*)`/`var(--ffi-gold-bright)` tokens. Zero em/en-dashes in both files (also fixed 8 dashes in my own new doc comments). No bottom tab bar added (persistent nav stays owned by `app-shell.tsx`). Data flow, Supabase wiring, and all server actions (`handleSubmit`, league load, manager population, `showOpenFilePicker` auctioneer sync) untouched. Gate: `npm run type-check` 0 errors; `npm run test:run` 38 files / 497 tests all green; `npm run lint` scoped to the 2 files: 0 errors, 0 warnings (full-repo lint run separately confirms 39 pre-existing errors, all in unrelated test fixtures `convert.test.ts`/`recommendation.test.ts`/`tags.test.ts`, none in touched files); `npm run build` clean, `/draft/setup` compiles as a static route. Both required greps (`5FA8E0|8bacff|9eadb8|blur-3xl` and `—|–`) return 0 matches on both files. Structural DOM verification done via a `next start` production preview on port 3121 (dev-mode blocked by Next 16's one-dev-server-per-directory lock, another session already held port 3003): `read_page`/`get_page_text` confirmed the backrow, H1, "Step 1 of 3" chip, "Live Draft" quiet label, league selector, and fallback card all render as built. Pixel screenshot blocked (Browser pane does not composite frames in this sandbox, same known env constraint as prior R/D-track cards). Noted in passing, not touched: `app-shell.tsx` renders `{children}` 3 times across responsive layout branches (lines 230/235/243), a pre-existing architectural pattern unrelated to this change.

### SP-3V -- Validate /draft/setup rebuild `[Sonnet · Opus for visual parity]` · class: output -- **[x] DONE (2026-08-18, Opus validator)**
> **Shipped:** independent fresh-context Opus validation of SP-3 (commit ad17e11). Re-ran the full gate (type-check 0, test:run 497/497, build clean; lint failures all pre-existing, outside the 2 setup files). Structural parity vs the approved mockup CONFIRMED: `.ffi-hero` AUCTION word (blur-3xl gone), StepChip "Step N of 3" + red pulse dot, three QuietLabel sections (Live Draft / Input Method / Session Details), DestRow-style red volt rail on selected selector rows; verified `--ffi-gold-bright` resolves to brick-red `#c25a5e` (not gold). Commit hygiene clean (only 5 intended files; Supabase/state/handler wiring untouched). **Found 1 HIGH:** raw `#ffffff` at `client.tsx:536` (off-token, contradicting SP-3's 0-hex claim) -- FIXED by orchestrator: swapped to `var(--ffi-text-primary)`, raw-hex grep re-verified 0, gate re-run green. Fix committed separately (see CHANGELOG SP-3V entry).
> - Class: WORKHORSE (validation)
>   Reason: independent accuracy + visual-parity check behind the largest build.
>   Verifier: OTHER_FAMILY -- fresh context, did NOT write SP-3.
> **Size:** S-M. **Depends on:** SP-3.
> **Work:** adversarial `/code-review` + `/bug-hunt free`; SHIELD Design + QA lenses; side-by-side screenshot vs the approved mockup (flag hero/section/spacing/type drift); independent grep for off-token hex + `blur-3xl`; re-run the gate.
> **Done-when:** 0 unresolved HIGH; screenshot parity confirmed + attached; independent grep clean; gate green.

### SP-4 -- Rebuild /prep/configure to approved mockup `[Sonnet]` · class: output -- **[x] DONE (2026-08-18)**
> - Class: WORKHORSE
>   Reason: bounded re-layout of a flat form to SHIELD sections against the SP-2 mockup.
>   Verifier: OTHER_FAMILY (SP-4V)
> **Size:** M. **Depends on:** SP-2.
> **Why:** header is on-token (`ffi-title-red`) but the body is a flat stacked form with no SHIELD hero/section identity, plus one off-token blue badge `rgba(77,130,255,...)` at `league-config-form.tsx:240`.
> **Reads first:** approved SP-2 configure mockup; `src/app/(app)/prep/configure/page.tsx`; `src/components/prep/league-config-form.tsx`.
> **Work:** promote the form to SHIELD section objects per the mockup; replace the off-token blue badge with `var(--ffi-blue)`; token-only; reuse primitives.
> **Done-when:** screenshot matches mockup; grep for `77,130,255` in the 2 files returns 0; gate green; A1-A10 pass.
>
> **Shipped:** Files changed: `src/app/(app)/prep/configure/page.tsx` (added a `.ffi-hero` identity strip below the header, "The Nasties" + "Auction · 12 teams · $200 · PPR, no-K", static text -- app is single-league Nasties-only, no new data fetch/server-action added), `src/components/prep/league-config-form.tsx` (restructured all 3 sections + fixed the off-token badge). SHIELD objects: the 3 flat `h3` section titles inside their cards ("League Details", "Roster Slots", "Scoring Settings") are replaced by a local `QuietLabel` divider placed above each `ffi-card`, copied verbatim from the gold-standard pattern in `prep/page.tsx` (font-cond, 10px, uppercase, 0.28em tracking, `var(--ffi-ink-3)`) since that file is off-limits to edit this session (unrelated uncommitted local changes). The off-token blue badge `rgba(77,130,255,0.16)` at the old `league-config-form.tsx:240` is gone, replaced by `<FFIBadge status="info">` (imported from `ffi-primitives.tsx`), which resolves through the existing `.ffi-badge-info` CSS class to steel-blue `var(--ffi-blue)`/`var(--ffi-blue-bright)` -- no inline color literal in the file at all. The "Custom" badge next to it is now also `<FFIBadge>` (was already token-compliant, just relocated out of the old `h3`). Inputs already carry the red-volt focus state via the pre-existing `.ffi-form-input:focus` rule in `globals.css` (untouched), so no input changes were needed. Collapsible scoring rows keep their `ChevronDown`/`ChevronRight` icons unchanged. No net-new primitive: reused `FFIBadge`, `FFICard` (className), `FFIInput`-equivalent `ffi-input`/`ffi-form-input` classes already in place, and the copied `QuietLabel` pattern. No bottom tab bar added (owned by `app-shell.tsx`). Also fixed 4 pre-existing em-dashes in code comments inside `league-config-form.tsx` (not UI copy) to satisfy the zero-dash gate on files touched this session. Supabase wiring, `createLeague` server action, field names/validation, and the save flow are byte-identical to before -- only JSX structure and className/style around existing fields changed.
>
> Gate: `npm run type-check` 0 errors. `npm run test:run` 38 files / 497 tests all green (no regressions). `npm run lint` scoped to the 2 files: 0 errors (1 pre-existing warning, `userId` unused param, not on a line I touched). `npm run build` clean, `/prep/configure` compiles as a static route among all 56 pages. Required greps on both changed files: `77,130,255` = 0 matches; em/en-dash (U+2014/U+2013) = 0 matches; raw hex/rgba self-check = 1 match (`rgba(255,110,138,0.12)` error-banner styling at `league-config-form.tsx:114`), confirmed via `git diff` to be a pre-existing untouched line, not part of my diff. Structural verification: could not live-render behind Supabase auth in this headless sandbox (confirmed via source-vs-mockup read only, no screenshot -- pixel preview blocked in this environment per the known constraint). Commit `git add --dry-run` confirmed exactly the 2 intended files staged, nothing else from the dirty working tree.

### SP-4V -- Validate /prep/configure rebuild `[x] DONE (2026-08-18)` · class: output
> - Class: WORKHORSE (validation)
>   Reason: independent check behind SP-4.
>   Verifier: OTHER_FAMILY -- did NOT write SP-4.
> **Size:** S. **Depends on:** SP-4.
> **Work:** adversarial `/code-review` + `/bug-hunt free`; Design + QA lenses; screenshot vs mockup; independent grep for off-token blue; re-run gate.
> **Done-when:** 0 unresolved HIGH; screenshot parity attached; grep clean; gate green.
> **VERDICT: PASS (Opus, fresh context, commit 771ecc1).** 0 HIGH. Independent re-run of the full gate reproduced green: type-check 0, test:run 497/497, scoped eslint 0 errors (1 pre-existing `userId` warning), build clean with `/prep/configure` static. Off-token `77,130,255` grep = 0 on both source files. Raw hex/rgba sweep = 1 match (`rgba(255,110,138)` error banner, `league-config-form.tsx:114`), git-blame confirms pre-existing (a591de36, 2026-08-10), untouched by SP-4, exempt. Structural parity vs mockup SCREEN 2 = full match (hero strip, 3 QuietLabel dividers, ffi-title-red header, FFIBadge status=info replacing the blue badge, red-volt-focus inputs); no missing or extra element. Supabase `createLeague` action not in diff; no form field name/id/value/hidden-input changed, form saves identically. Commit hygiene clean: exactly 5 files staged, none of the 24 unrelated dirty files swept in. One MED found and FIXED by orchestrator: 2 literal dashes (U+2014/U+2013) the build agent wrote into the SP-4 gate line above, swapped to ASCII codepoint names; SP-4 doc-block dash grep now 0. No live pixel render (Supabase-auth route in a headless no-composite sandbox); parity established via source-vs-mockup structural read, the documented fallback.

### SP-5 -- Rebuild /prep/runs to approved mockup `[Sonnet]` · class: output
> - Class: WORKHORSE
>   Reason: bounded promotion of a utility card-list to SHIELD card/section objects against the SP-2 mockup.
>   Verifier: OTHER_FAMILY (SP-5V)
> **Size:** M. **Depends on:** SP-2.
> **Why:** on-token header but a plain "list of cards" utility layout with no hero/section SHIELD objects, plus a stale volt-green leftover `rgba(139,255,69,0.16)` at `client.tsx:66` (completed-status style).
> **Reads first:** approved SP-2 runs mockup; `src/app/(app)/prep/runs/page.tsx` + `client.tsx` (includes `RunDetailView`/`CompareView`).
> **Work:** promote list rows + detail/compare views to SHIELD card/section treatment per the mockup; replace the green status literal with `var(--ffi-volt)`; token-only.
> **Done-when:** screenshot matches mockup; grep for `139,255,69` in the file returns 0; gate green; A1-A10 pass.

### SP-5V -- Validate /prep/runs rebuild `[Sonnet]` · class: output
> - Class: WORKHORSE (validation)
>   Reason: independent check behind SP-5.
>   Verifier: OTHER_FAMILY -- did NOT write SP-5.
> **Size:** S. **Depends on:** SP-5.
> **Work:** adversarial `/code-review` + `/bug-hunt free`; Design + QA lenses; screenshot vs mockup; independent grep for green literal; re-run gate.
> **Done-when:** 0 unresolved HIGH; screenshot parity attached; grep clean; gate green.

### SP-6 -- Rebuild /settings to approved mockup `[Sonnet]` · class: output
> - Class: WORKHORSE
>   Reason: bounded restyle of an iOS-style grouped list to SHIELD rows against the SP-2 mockup.
>   Verifier: OTHER_FAMILY (SP-6V)
> **Size:** S-M. **Depends on:** SP-2.
> **Why:** header is on-token but the body is an iOS-style grouped list with no SHIELD hero/card/section objects, plus an off-token blue badge `bg-[#8bacff]/15 text-[#8bacff]` at `page.tsx:45`.
> **Reads first:** approved SP-2 settings mockup; `src/app/(app)/settings/page.tsx` + `client.tsx` (local `SectionLabel`/`SettingsGroup`/`NavRow`/`InfoRow`/`SignOutRow`).
> **Work:** restyle the list rows to SHIELD section/card treatment per the mockup; replace the `#8bacff` badge with `var(--ffi-blue)`; token-only; keep 44px touch targets.
> **Done-when:** screenshot matches mockup; grep for `8bacff` in the 2 files returns 0; gate green; A1-A10 pass.

### SP-6V -- Validate /settings rebuild `[Sonnet]` · class: output
> - Class: WORKHORSE (validation)
>   Reason: independent check behind SP-6.
>   Verifier: OTHER_FAMILY -- did NOT write SP-6.
> **Size:** S. **Depends on:** SP-6.
> **Work:** adversarial `/code-review` + `/bug-hunt free`; Design + QA lenses; screenshot vs mockup; independent grep for `8bacff`; re-run gate.
> **Done-when:** 0 unresolved HIGH; screenshot parity attached; grep clean; gate green.

### SP-7 -- Rebuild (auth) sign-in + sign-up to approved mockup `[Sonnet]` · class: output
> - Class: WORKHORSE
>   Reason: bounded from-scratch build against the SP-2 mockup; judgment was resolved in SP-2, this is execution.
>   Verifier: OTHER_FAMILY (SP-7V)
> **Size:** M. **Depends on:** SP-2.
> **Why:** the `(auth)` screens are pure shadcn New-York cards with zero `ffi-*` styling and no navy field (their own `(auth)/layout.tsx` uses `bg-background` + a `bg-primary/5 blur-3xl` glow). No SHIELD identity at all.
> **Reads first:** approved SP-2 auth mockup; `src/app/(auth)/sign-in/page.tsx`, `sign-up/page.tsx`, `(auth)/layout.tsx`; `ffi-primitives.tsx`; `globals.css` (`.stadium-atmos`, `.ffi-btn-hero`, `.ffi-title-red`).
> **Work:** re-theme both screens per the mockup -- add the navy field to `(auth)/layout.tsx` (mount `.stadium-atmos`/`.atmos-grain` or equivalent), Oswald-red header, brick `.ffi-btn-hero` primary CTA, Kanit display, `ffi-*` inputs; remove the shadcn `Card` shells and the `blur-3xl` glow; PRESERVE all Supabase auth wiring and form behavior.
> **Done-when:** screenshot matches mockup (both sign-in and sign-up); screens use `ffi-*` and carry the navy field; no shadcn `Card` or `blur-3xl` remains; auth still functions (sign-in/sign-up submit works against Supabase in dev); gate green; A1-A10 pass.

### SP-7V -- Validate (auth) rebuild `[Sonnet · Opus for visual parity]` · class: output
> - Class: WORKHORSE (validation)
>   Reason: independent check behind the from-scratch auth build, including a functional auth smoke test.
>   Verifier: OTHER_FAMILY -- did NOT write SP-7.
> **Size:** S-M. **Depends on:** SP-7.
> **Work:** adversarial `/code-review` + `/bug-hunt free`; Design + QA lenses; screenshots of both screens vs mockup; confirm navy field present and no shadcn `Card`/`blur-3xl`; smoke-test that sign-in and sign-up forms submit and error-handle correctly; re-run gate.
> **Done-when:** 0 unresolved HIGH; screenshot parity for both screens attached; auth smoke test passes; gate green.

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

## Session Operating System (retrofit)

These sections were added to an existing plan by `devflow add-session-os`. Fold them into their ideal positions in a Thinking session if you want; they are functional as-is. Wind-down and continuation-prompt guidance live in the /session-lifecycle skill this command also installed.

## Session Type - every session is either Thinking or Doing

Sessions come in two kinds, and conflating them is the root cause of drift. Name the type on every card.

| Type | Purpose | Model | Produces | Is allowed to |
|------|---------|-------|----------|---------------|
| **Thinking** | scope, plan, research, decide, re-plan | Opus (Sonnet for bounded research) | a decision, a scoped plan, a findings doc | range wide, explore, spiral - this is the work |
| **Doing** | execute an already-decided chunk | Sonnet (Haiku if mechanical) | code + tests + a clean commit | build exactly the card, nothing else |

**The one rule that ties the whole plan together:** a **Thinking session is allowed to spiral** - exploring, learning, and deciding are a single connected act and must not be chopped mid-thought. A **Doing session is not allowed to spiral** - if it starts to, that is a signal, not a failure. It means an unresolved decision was left in the plan (the Scoping Gate was not met). Stop the Doing session, capture the decision as discovered work (see Discovered-Work Capture), and route it to a Thinking session. Do not resolve it inline.

**Diagnostic:** the frequency with which your Doing sessions spiral is the health readout on your scoping. Well-scoped plans produce Doing sessions that just execute. Frequent spiraling means the Thinking work was too shallow - deepen the KICKOFF / Re-Plan pass, do not blame the executor.

## The Scoping Gate (a chunk is not ready until decisions are out of it)

Session Size asks "does it fit a window?" The Scoping Gate asks the harder question: **"does this chunk still contain a decision nobody has made yet?"** A chunk can fit a window and still be un-executable because it hides an unresolved judgment call.

**The gate:** a session card may be authored as a **Doing** session only if it contains **zero open judgment calls.** Every "we'll figure it out when we get there," every "pick whichever seems right," every unresolved design or architecture fork inside the scope is a **judgment call that has leaked out of planning.** It does not belong in a Doing session.

When you find an open judgment call in a chunk, you have exactly two moves:
- **Resolve it now**, in the current Thinking session, and write the resolution into the card as a fixed instruction (not a choice). OR
- **Pull it back out** into its own Thinking session (or the KICKOFF / Re-Plan pass), and mark the Doing session `DEPENDS ON` that Thinking session.

**Why this matters:** an executor that meets an unresolved decision mid-build will invent an answer to keep moving. That invented answer is the "arbitrary decision" and the "shortcut" you keep seeing. The fix is not to tell the executor to try harder. It is to make sure no decision is ever left in a Doing session for it to trip over.

**The scoping test, in one line:** read a Doing card and ask "could a competent executor build exactly this with no choices left to make?" If no, it is not scoped yet - it is still a Thinking task wearing a Doing card.

## Model Handoff Logic (Opus for Opus, Sonnet for Sonnet, as things change)

Model choice is not fixed at authoring time - it can change mid-plan. Three rules govern the handoff:

- **Default flow:** one **Opus** Thinking session sets scope, then a run of **Sonnet** Doing sessions execute it, then **Opus** returns only at a Re-Plan checkpoint or when a decision surfaces.
- **Promotion trigger:** the moment new requirements, feedback, or a discovered fork introduces a judgment call, the next session becomes **Thinking / Opus** - do not let a Sonnet Doing session absorb a decision. That single rule is what keeps "Opus for Opus, Sonnet for Sonnet" honest as things change.
- **Demotion:** once the decision is made and written into cards, drop back to **Sonnet** for the execution run. Opus should be rare and decisive, not resident.

## Discovered-Work Capture (scoped, defined, placed correctly)

When a bug, item, or requirement is discovered mid-session, run this three-step capture instead of dropping it into a flat queue - it keeps every discovered item scoped, defined, model-bound, and filed in the right contextual place.

1. **CLASSIFY it** - which of four buckets:
   - **BLOCKER** (stops current work) -> P0 table, jumps the queue.
   - **FITS-CURRENT-PHASE** -> author a card in this phase, in dependency order.
   - **LATER-PHASE** -> park a one-line stub under that phase with a `NEW` tag.
   - **DECISION** (a judgment call, not buildable yet) -> a Thinking session stub, never a Doing card.
2. **SCOPE it** to the capture standard, even as a stub: Type (Thinking or Doing), a guessed Model, a one-line goal, and the success check if known. A DECISION-bucket item records the question, not an answer.
3. **PLACE + LINK it**: write it where it belongs (P0, phase, or decision list), and if it changes or blocks existing cards, note the `DEPENDS ON` in both directions. Record the discovery in `DECISION_LOG.md`.

Nothing lands as an undated one-liner in a flat table. Every discovered item leaves the session already carrying a type, a model, a home, and its links, so a future session can pick it up cold.

---

