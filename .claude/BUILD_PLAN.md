<!-- DASHBOARD_STATUS
{
  "currentPhase": "ROAD TO DRAFT — ordered build sessions S1→S8 (S1 config/nav trust · S2=P3 valuation engine · S3 research depth · S4 strategies · S5 bug hunt+tests · S6 live sync fix · S7 Claude-driven Chrome usability test · S8=DR-7 rehearsal). Reordered 2026-08-11 (Joe): all solo-buildable engineering work runs before anything needing Joe's hands-on testing — S8 is the only session that needs Joe, and it runs last.",
  "status": "active",
  "milestones": [
    { "name": "Phase 0-2 — Data pipeline + strategy engine", "done": true },
    { "name": "Phase 3 — Live draft mode (auction state machine + advisor)", "done": true },
    { "name": "Phase 4-5 — Polish + scoring intelligence", "done": true },
    { "name": "Phase 6-7.5 — UI redesign + player intel", "done": true },
    { "name": "Phase 8 — In-season AI companion", "done": true },
    { "name": "P0 — Personal season hardening (sub-tiers 0-8)", "done": true },
    { "name": "P0-UX — 4-tab IA overhaul (Research/Draft/Review/Setup)", "done": true },
    { "name": "UX-V2 — GRIDIRON redesign (volt-green, live room)", "done": true },
    { "name": "P1 + P1b — Auctioneer integration + remote live sync (FF-314/315)", "done": true },
    { "name": "P2 — DRAFT READINESS (finish + verify for real draft night)", "done": false },
    { "name": "P3 — LEAGUE-CALIBRATED VALUATION & EXPLOIT ENGINE (ceiling/reality/play on 16yr ledger)", "done": true },
    { "name": "Stadium Primetime UI [SUPERSEDED 2026-06-04]", "done": true },
    { "name": "Auctioneer UI Port [REJECTED 2026-07-12, archived 2026-08-10]", "done": true },
    { "name": "P3-P7 — Commercialization [RETIRED 2026-08-06]", "done": true }
  ],
  "nextItems": [
    "[DONE 2026-08-11] S1 [Sonnet]: Config truth + nav — fix the '10 teams' source (FB-1), kill 'Pre Flight' (FB-4), add back-nav (FB-5), clarify Draft Board vs Live Draft (FB-6). Trust-killers first.",
    "[DONE 2026-08-12] S2 [Opus] = P3: valuation engine ceiling/reality/play (VAL-1/2/3) on the corrected 16yr ledger. Calibrated board (Gibbs $97/room~$76/+21 pocket), tendency/exploit engine (20 tests), max-bid re-anchored. Closed FB-15; FB-12 foundation done (tier-depletion UI → S3).",
    "[DONE 2026-08-12] S3 [Opus+Sonnet]: research depth — closed FB-9 (real sourced tag taxonomy, 37 tests), FB-10 (value RANGE = VORP ceiling↔Nasties room, documented), FB-11 (Refresh re-derives chain), FB-13 (real ESPN headshots + bye + league proj + per-player rec), FB-14 (ⓘ how-calculated/sources popover); re-verified FB-8 (ADP gone). Model on Opus, UI wiring on Sonnet. Verified live on real data. FB-12 tier-depletion board piece NOT in S3 boot scope — remains [~].",
    "S4 [Opus for suggest-from-targets · Sonnet wiring]: strategies made real — is-it-wired / auto-run on new data / saveable / suggest-from-targets+avoids (FB-16), player-pull feeds the whole chain end-to-end (FB-17).",
    "S5 [Sonnet/Opus]: bug hunt + test hardening on S1-S4 — /bug-hunt full + expand automated coverage on those paths.",
    "S6 [Sonnet]: fix live draft Join + sync (FB-7) — the broken /draft/live junk page. Solo code-fix; full live-auctioneer proof deferred to S8.",
    "S7 [Claude drives Chrome]: my own usability test — walk every flow (including the now-fixed Join/sync) at mobile arm's-length, catalog + fix friction/dead-ends BEFORE Joe's phone rehearsal.",
    "S8 [Sonnet+Joe] = DR-7.3/7.4/7.5: offline-resync rehearsal, phone test, full mock draft — the ONLY session that needs Joe's hands-on testing, run LAST on the hardened app.",
    "Per-session gate (S1-S6): type-check + test:run + lint(0 new) + build + /bug-hunt free on changed modules + a loaded-preview screenshot before any session is called done."
  ]
}
-->

# Fantasy Football Draft Advisor — Build Plan

**What this app is:** a personal live-draft advisor for **Joe's "Nasties" 12-team, $200, PPR, no-kicker ESPN AUCTION draft**. It never places bids — it advises Joe (what to do, max bid, budget/pace) and records results. Picks come **live over the network from the deployed auctioneer app** (`fantasy-auction-auctioneer`), which is the system of record. There is **no Google Sheets** and **no snake/keeper** scope — Tyler's Yahoo/Sleeper league is on permanent indefinite hold.

Task tracking: `[ ]` not started · `[~]` in progress · `[x]` done · `[!]` blocked

---

## The one-plan rule (so we never silo again)

**There is exactly ONE plan: this file.** Any new direction is added HERE — either as active work or as a dated SUPERSEDED / REJECTED decision record. **No standalone plan docs.** (The `AUCTIONEER_UI_PORT_PLAN.md` orphan below is exactly what this rule prevents.) Design specs live in `DESIGN_SYSTEM.md`; live working state lives in `WORKING_STATE.md` (thin pointer only); the change audit trail lives in `CHANGELOG.md`.

---

## Dev Cycle

```
1. Find the FIRST [ ] item in the active phase (P2 — Draft Readiness), in DR order.
2. Check its model tag. If you're on a weaker model than the tag, HALT and tell Joe.
3. PROPOSE: classify the change, name the Review Lenses, declare scope (files touched + what will NOT change).
4. PATCH: implement inside the declared scope.
5. VERIFY: success criterion met + `npm run type-check` + `npm run test:run` + `npm run lint` (0 new) + build clean.
6. Paste the proof. Mark [x]. Update WORKING_STATE (pointer) + CHANGELOG (entry). Commit by explicit path + push.
```

---

## 🏈 ROAD TO DRAFT — the ordered build sequence (2026-08-11)

**This is the authoritative execution order.** Everything below (P2 DR-7, P3 VAL, and the FB-* morning-feedback catalog) is real detail; this block says *what order we build in and in which session*. Each **S#** is one **context-aware build session** — scoped to fit a single focused sitting, model-bound, with what to read first and a hard "done-when." Work them top to bottom. Draft date sets the cut line (see note at end).

> **Legend:** each session lists the **FB-#/VAL-#/DR-#** items it closes. Status of every individual item lives in its detail section below.
> **Reordered 2026-08-11 (Joe's call):** all solo-buildable engineering (S2-S7) now runs before anything that needs Joe's hands-on testing. **S8 is the only session that needs Joe** — it runs dead last, once the app actually works. The live-sync fix (formerly S2) moved to **S6**: the actual bug (broken Join page) is a solo code-fix, so it doesn't need to block the engine/research/strategy work; only the *full proof against a real running auctioneer* needs Joe, and that's folded into S8.

### S1 — Stop the bleeding: config truth + navigation `[Sonnet]` · class: shared/output — **[DONE 2026-08-11]**
> **Why first:** these are the trust-killers. A board that says "10 teams," a phantom "Pre Flight," and no way to go back make the whole app read as broken — no engine matters until the frame is trustworthy.
> **Reads first:** `src/components/layout/app-shell.tsx`, `src/app/(app)/draft/page.tsx`, the league/session config path, `src/app/(app)/prep/players/*`.
> **Closes:** FB-1 (10-teams), FB-4 (kill Pre Flight), FB-5 (back-nav), FB-6 (Draft Board vs Live Draft clarity). FB-2/FB-3 (tab renames) already done.
> **Done-when:** app shows **12 teams** everywhere, sourced from real league config; no "Pre Flight" anywhere; every deep screen has a clear back affordance; nav labels unambiguous. Proven on a preview I load, with screenshots.
> **Closed:** type-check/test(96)/lint(0 new)/build all clean. **Visual proof outstanding** — Next.js 16 (Turbopack) locks dev servers per-project-directory (not per-port), and another session's `npm run dev` held this project's only lock the entire session, so no preview could load here. Joe explicitly waived the loaded-preview screenshot for this session (2026-08-11) rather than kill the other session's server; first person to open `/prep`, `/prep/board`, `/prep/players`, `/prep/strategies`, `/prep/simulate` should eyeball the new back-links + "Cheat Sheet" rename.

### S2 — The valuation engine: ceiling / reality / play `[Opus]` · class: pipeline — **[DONE 2026-08-12]**
> **Why second:** this is the actual point of the app — dynamic, league-calibrated pricing on 16 years of Nasties history. It only matters once the shell (S1) is trustworthy.
> **This session = P3 VAL-1 → VAL-2 → VAL-3** (detail in the P3 section). VAL-0 done.
> **Reads first:** the P3 section, `src/data/league-history/*`, `scripts/derive-league-calibration.ts`, `convert.ts`, `auction-advisor.ts`, `tendencies.ts`.
> **Closes:** VAL-1/2/3, FB-15 (league-history context), FB-12 (in-draft repricing as tiers deplete).
> **Done-when:** re-priced board proof (ceiling/room/gap); tendency engine emits real exploit signals; live max-bid re-anchored off the national number onto calibrated values + live state.
> **Closed 2026-08-12:** type-check clean · 116/116 tests (incl. 20 new tendency tests) · lint 0 new (44 pre-existing baseline) · build green · `/bug-hunt free` on changed modules (1 LOW found + fixed, BUG-001) · board render proven on real players_cache via DOM + computed-CSS (Gibbs $97 ceiling / room ~$76 / +$21 POCKET, 18 volt chips at rgb(139,255,69)). Pixel screenshot blocked by an undisplayed browser pane (environment, not code) — worked around with get_page_text + javascript_tool computed-color proof.

### S3 — Research surface depth `[Opus for the value-range + tag model · Sonnet for UI]` · class: output/pipeline · **[DONE 2026-08-12]**
> **Why third:** the Research/Players surface is where you decide targets. It needs to be rich and transparent, and it sits on S2's engine.
> **Reads first:** `prep/players/client.tsx`, `players/tags.ts`, `players/convert.ts`, the auctioneer image store.
> **Closes:** FB-9 (real sourced tag taxonomy), FB-10 (values as a RANGE), FB-11 (dynamic on each pull), FB-13 (bye + images-from-auctioneer + league proj + per-player rec), FB-14 (projection/source transparency in-app). Verifies FB-8 (ADP gone) on the live screen.
> **Done-when:** each player shows a value **range** + sourced tags + bye + headshot + league-specific projection + a one-line recommendation + a "how this is calculated / sources" affordance; a pull refreshes values.

### S4 — Strategies made real `[Opus for suggest-from-targets · Sonnet wiring]` · class: pipeline
> **Why fourth:** strategy is the payoff of the engine + research, but it's the least broken today, so it comes after the must-haves.
> **Reads first:** `prep/strategies/client.tsx`, `api/strategies/propose`, `research/service.ts`.
> **Closes:** FB-16 (is it wired / auto-run on new data / save a strategy / suggest from targets+avoids), FB-17 (player-pull end-to-end actually feeds the whole chain).
> **Done-when:** strategies generate on fresh data (or are clearly gated + explained), are saveable, can be AI-suggested from your target/avoid list; a player pull demonstrably drives values → tags → strategy end-to-end.

### S5 — Bug hunt + test hardening (S1-S4) `[Sonnet · Opus for logic bugs]` · class: bugfix/pipeline
> **Why here:** S1-S4 each pass their own per-session gate, but that only catches regressions in what changed. This is a dedicated sweep across everything built so far, before the live-sync fix and the final whole-app pass.
> **Reads first:** `.claude/REVIEW_LENSES.md`, the S1-S4 CHANGELOG entries, `src/**/*.test.ts`.
> **Scope:** (a) run `/bug-hunt full` (tests + build) across the whole project, triage findings by severity, fix the real ones; (b) **expand automated coverage** on the new S1-S4 code paths — config→12-teams, calibrated values, tag/range model, strategy chain — so the logic that matters is actually tested, not just present.
> **Done-when:** `/bug-hunt full` clean (or every finding triaged with a written reason to defer); `npm run test:run` green with new tests covering the S1-S4 paths; `type-check` + `lint` (0 new) + `build` clean. Findings + fixes logged in CHANGELOG.

### S6 — Live draft join + sync actually works `[Sonnet]` · class: pipeline
> **Why here, not earlier:** "Auctioneer is Live" → **Join → broken junk page, not syncing** is a real bug (FB-7), but fixing it is a solo code job — it doesn't need to gate the engine/research/strategy work, and it doesn't need Joe in the room. It DOES need to be fixed before S7 (usability test walks the Join flow) and S8 (rehearsal runs on it for real).
> **Reads first:** `draft/live/client.tsx`, `use-remote-auctioneer-feed.ts`, `api/auctioneer-feed/route.ts`, `state.ts`.
> **Closes:** FB-7 (broken join/sync page).
> **Done-when:** from "Auctioneer is Live," Join enters a working room showing real team names, no broken page, no CORS — verified as far as solo local testing can confirm. **Full proof of live picks syncing within ~3-6s against a real running auctioneer is Joe's job at S8**, not this session's — do not claim that part done here.

### S7 — Usability test — I drive it in Chrome `[Claude driving + Sonnet to fix]` · class: output/bugfix
> **Why here:** your phone rehearsal (S8) must **not** be the first time a human clicks through this. I walk the whole app myself first and fix the friction, so S8 is a confirmation, not a discovery.
> **How:** load the deployed app (or dev preview) in a Chrome session at **mobile viewport, arm's-length**, and walk **every** real flow end-to-end as a first-time user: Research → pull players → read a player card → tags/range/sources → set targets/avoids → strategies → enter the Live Draft room → join the auctioneer → record/track picks → budget/pace → Post Draft. At each step catalog: dead-ends, "how do I get back," confusing labels, slow/janky, anything that reads as broken or cheap. Screenshot every issue.
> **Reads first:** the S1-S6 done-whens (so I test against what we claimed), `DESIGN_SYSTEM.md`.
> **Done-when:** a written usability-findings list (each with a screenshot), every P1/P2 issue fixed and re-shot, and a final clean walkthrough screenshot set proving the flows hold together. This is my sign-off that it's *ready for your hands* — not that it's "perfect."

### S8 — Draft-night rehearsal — THE GATE `[Sonnet + Joe]` · class: pipeline
> **Why last:** you can only rehearse the finished, hardened app, and this is the **only session that needs your hands-on testing.** Nothing before this asks you to test anything. This is the "ready for draft night" sign-off — the one only you can give.
> **This session = DR-7.3 → DR-7.4 → DR-7.5**, plus the live-auctioneer proof deferred from S6 (detail in the DR-7 section).
> **Done-when:** full mock draft on your phone against the live auctioneer — join/sync proven live, picks tracking, calibrated advice correct, budgets right, offline-resync proven, no surprises. Any issues found here become a short S8-fix list (expected — that's what a rehearsal is for).

> **Per-session gate (baked into S1-S6, non-negotiable):** no build session is called done until `npm run type-check` + `npm run test:run` + `npm run lint` (0 new) + `npm run build` all pass, **plus `/bug-hunt free` on the changed modules**, **plus a screenshot from a preview I actually loaded**. S5/S7 are the dedicated *whole-app* hardening passes stacked on top of that per-session discipline; S8 is the final human gate.

> **Cut line (needs the draft date):** S1 → S2 → S5 → S6 → S7 → S8 is the **minimum** for a working, trustworthy, genuinely-helpful draft night (the hardening passes S5/S7/S8 are NOT optional — they are how "working" gets proven). S3 and S4 are high-value depth that can compress if the date is tight. Tell me the draft date and I'll mark the hard must-have line.

---

## FB — Morning feedback catalog (2026-08-11, screenshots 1-3) — individual item tracking

> Every item from Joe's 2026-08-11 morning feedback, so nothing lives only in chat again. Each maps to a session above. Status verified against code where noted.

**Config / navigation (→ S1):**
- [x] FB-1: "10 teams" shown everywhere; league is **12**. Done 2026-08-11 — root cause was **two simultaneously `is_active: true` leagues** for the same user ("Nasties 2026" real, "The Nasties" a stale 2026-03-21 duplicate); `/api/leagues` tiebreaks same-`is_active` rows by `updated_at desc`, and the stale one had been touched more recently so it won `leagues[0]`. Fixed the code path in `src/app/(app)/prep/configure/actions.ts` (`createLeague` now deactivates every other league for that `user_id` after insert, so re-saving the config form can never create a second active league) and one-time-corrected the data (`is_active=false` on the stale duplicate `5629af5b-...`). Left the stale duplicate's orphaned session untouched (its `league_id` no longer resolves, so it will never surface as resumable).
- [x] FB-2: Rename **Review → Post Draft**. Done — `app-shell.tsx:40`, `swipe-carousel.tsx:14`.
- [x] FB-3: Rename **Draft → Live Draft**. Done — `app-shell.tsx:39`, `swipe-carousel.tsx:13`.
- [x] FB-4: Remove the **"Pre Flight"** thing. Verified 2026-08-11 — already removed by an earlier same-day commit (`bed6940`, predates this catalog's own authoring commit `fe9cfc2`); only a stale code *comment* remained at `draft/page.tsx:9`, no rendered UI. Catalog status was stale, not the code.
- [x] FB-5: **No way to go back** from deep screens (Players etc.). Done 2026-08-11 — added the existing back-link pattern (already used in `prep/configure/page.tsx` and `prep/runs/page.tsx`: `ChevronLeft` + label, linking to the actual parent screen) to `prep/players/client.tsx`, `prep/board/client.tsx`, `prep/strategies/client.tsx` (all → **Research** / `/prep`, where their jump-rows on the hub actually link from) and `prep/simulate/page.tsx` (→ **Strategies** / `/prep/strategies`, its real entry point).
- [x] FB-6: Clarify **"Draft Board" vs "Live Draft"**. Done 2026-08-11 — renamed the pre-draft rankings screen from "Draft Board" to **"Cheat Sheet"** (both the `/prep` hub jump-row label and the screen's own `<h1>`, `prep/page.tsx:395` + `prep/board/client.tsx`) since "Draft Board" read as if it *was* the live auction; added one line of inline help under the header: "Your pre-draft rankings - the auction itself happens under Live Draft."

**Live draft sync (→ S6):**
- [ ] FB-7: "Auctioneer is Live," but **Join the draft → broken junk page, not syncing** (`/draft/live?session=…&aif=remote`). Verify + fix the join→room→sync path. Note: DR-7.2 (the raw feed-contract smoke test) is already verified 2026-08-10 — this item is specifically about the Join UI page itself, a distinct bug.

**Research / Players (→ S3, except values→S2):**
- [x] FB-8: **Remove ADP** (snake stat, meaningless in auction; was ECR rank mislabeled). Coded done (CHANGELOG 2026-08-11) — **re-verified live in S3 2026-08-12**: no ADP on the Players screen; the live auction card shows dollars only (round/ADP is snake-gated behind `!isAuction`).
- [x] FB-9: **Real player tags** sourced from real data, not `Math.random()`. **Done S3 2026-08-12:** rebuilt `players/tags.ts` — ELITE (FantasyPros tier 1), +$ POCKET / -$ TAX (league dollar gap, ±$4 to match the board), VOLATILE (expert-rank std ≥20 in-pool), INJURY (real FantasyPros status), SLEEPER (late skill player clearing VORP replacement). Every tag carries a `source` string; 37 unit tests incl. a provenance test asserting every emitted tag has a real-data source.
- [x] FB-10: Show a value **RANGE**, not a single point. **Done S3 2026-08-12:** `players/value-range.ts` — the band is the two REAL sourced dollars (VORP ceiling ↔ 16-yr Nasties room price), base = midpoint; falls back to national FantasyPros range, then a degenerate point only when neither exists. Documented + unit-tested.
- [x] FB-11: Values **update dynamically on each pull**. **Done S3 2026-08-12:** Refresh button on the Players screen re-runs `fetchPlayers` → `/api/players` (200) → `cacheToPlayers` re-derives ceiling/room/gap → the card re-computes range/tags/rec live. Chain verified end-to-end.
- [~] FB-12: **In-draft dynamic repricing** — as Tier-1 WRs go and only 2 Tier-2 remain, adjust their market value up. **VAL-3 foundation done 2026-08-12:** max-bid now anchors on calibrated ceiling/room + live budget/slots/scarcity/pace state (not the national number). Remaining S3 piece: surface explicit tier-depletion repricing on the board as tiers empty.
- [x] FB-13: **Richer player data** — bye week, images, league-specific projections, per-player recommendation. **Done S3 2026-08-12:** real ESPN headshots via `players/headshot.ts` (name→espnId map built from the auctioneer's 2026 pool → ESPN CDN, local silhouette fallback, onError swap); bye + league proj (PTS) + position rank on every card; one-line recommendation via `players/recommendation.ts` (Anchor/Target/Pass/Flier/Fair, injury-aware). Unit-tested; verified live with real photos.
- [x] FB-14: **Projection + source transparency** — **Done S3 2026-08-12:** every card has an ⓘ "How this value is calculated" popover showing the range provenance (VORP worth ↔ Nasties room), each tag's `source` string, the projection basis, and a footer ("Calibrated on N Nasties seasons · sources: ESPN projections · FantasyPros ECR · Nasties auction ledger"). Verified live in-app.
- [x] FB-15: **League-history context** in the values ("within context of my league's previous draft history"). **Closed 2026-08-12** — P3 VAL-0..3 all done; ceiling/room/gap + tendencies are all derived from the corrected 16yr Nasties ledger.

**Strategies / pull (→ S5):**
- [ ] FB-16: **Strategies** — is it wired? auto-run when new data comes in? can I **save** a strategy? can the app **suggest** one from my target/avoid list? (Today: manual "Generate Strategies" button, confirm-gated.)
- [ ] FB-17: **Player pull end-to-end** — does a pull actually pull and drive values → tags → projections → strategy, i.e. everything the app was built for? Verify the whole chain.

---

## P2 — Draft Readiness [ACTIVE]

> **Goal:** everything a real draft night needs works, is honest, and is verified against the live auctioneer — nothing dead, nothing fake, nothing that spends money by surprise.
> **Order matters.** DR-1 → DR-7 run in sequence; each session's dependency is stated. Model tag is on each item.
> **Source of the gap list:** three evidence-based audits run 2026-08-10 (draft-critical path, full screen sweep, docs reconciliation). Every item below cites the real defect it fixes.

### DR-1 — Truth-up the living dev docs `[Sonnet]` · class: docs
> **Why:** the docs a session reads first still describe Google Sheets as the draft input, snake/keeper/Tyler as active, and retired commercialization as the roadmap. That drift is what caused the last session to navigate from dead items. Fix the docs before building on them.
> **Dependency:** none — do this first.

- [x] DR-1.1: `NORTH_STAR.md` — rewrite auction-only. Sole user = Joe / ESPN / Nasties. Input + system of record = the deployed auctioneer feed (FF-314/315), NOT Google Sheets. Remove Tyler as co-primary, remove Sheets, remove snake/keeper, remove Phase 9/10 commercialization, repoint the design line to `DESIGN_SYSTEM.md` v3.1 (GRIDIRON).
- [x] DR-1.2: `CLAUDE.md` — fix the Project Overview (drop Tyler/Yahoo), Key Design Decisions #1 (auction-only, not "both formats"), #2 (no Yahoo multi-platform), #6 (auctioneer feed, not "Google Sheets primary draft input"); fix the folder map (`/prep/research` is a dead 404; the live path is the auctioneer proxy). Add the **one-plan rule** (above) verbatim.
- [x] DR-1.3: `ARCHITECTURE.md` — redraw the live-draft box: auctioneer `/api/state` → our server proxy `src/app/api/auctioneer-feed/route.ts` → `use-remote-auctioneer-feed` → multi-source merge → state. Remove the Sheets + Snake boxes.
- [x] DR-1.4: `FEATURES_INDEX.md` + `CODE_AREAS.md` — refresh to the live-room reality (`src/components/draft/live-room/*`, `what-to-do.ts`, the auctioneer feed hooks); fix drifted line numbers.
- [x] DR-1.5: root `README.md` — replace the untouched create-next-app boilerplate with a real project readme (what it is, stack, `npm run dev` on **3003**, auction-only).
- [x] DR-1.6: `docs/TESTING_GUIDE.md` — rewrite auction-only (drop Sheets/Yahoo/snake/in-season), or archive it if it won't be maintained. State which. **Decision: rewritten in place (~120 lines, auction-only). Prior Phase 8 content in git history.**
- **Done when:** grep of the living docs for `google sheet`, `snake`, `keeper`, `Yahoo`, `Tyler`, `localhost:3000` returns only intentional historical/decision-record mentions; every doc reads true to Aug-2026 reality.

### DR-2 — Kill the dead paths `[Sonnet]` · class: shared
> **Why:** dead Google Sheets code still ships in the live path (a `sheet_url` on a session would start a second polling loop = draft-night foot-gun), and snake/keeper leftovers surface in an auction-only tool (Review renders a `SnakeAnalysisCard`). Orphans (`lib/research/analyze.ts` with zero callers, empty `prep/research/` dir, `sound-settings.tsx`) are pure confusion.
> **Dependency:** DR-1 (docs describe the target state). **Care:** some snake code is shared by the state machine — audit each symbol's callers before deleting; remove only what is truly dead, gate what isn't.

- [x] DR-2.1: Remove Google Sheets from the live path — the `sheets` option in `draft/setup/client.tsx` (option + label + URL input), the `sheet_url` polling in `use-draft-state.ts` + `use-draft-polling.ts`, `lib/sheets/index.ts`, `api/draft/sheets/route.ts`, the `'sheets'` `FeedSource` in `auction-feed-merge.ts`. Note: `ConnectionStatusPill` is still actively used by `live/client.tsx` and `draft/page.tsx` (not dead) — kept in place.
- [x] DR-2.2: Remove snake/keeper leftovers that surface in the auction UI — `SnakeAnalysisCard` import + render in `draft/review/client.tsx`; the Tyler "T&A Keeper League" preset in `scoring-presets.ts`; the unreachable keeper-exclusion block in `research/service.ts` (`keeperSettings` field kept in `PipelineConfig` for back-compat with callers).
- [x] DR-2.3: Delete orphans — `lib/research/analyze.ts` (`formatScoringBonuses` inlined into `recommend/route.ts`, its only caller), the empty `src/app/(app)/prep/research/` dir, `components/settings/sound-settings.tsx` (sound toggle already removed).
- **Done when:** `npm run build` + `type-check` + tests are green; a live-DOM check confirms the auctioneer live path renders and merges picks exactly as before; no `sheet_url` code path can fire.

### DR-3 — Fix the inverted cost-guard `[Sonnet]` · class: pipeline (Security/QA lenses)
> **Why (wallet safety — highest $ risk):** the audit found the guard is on the wrong buttons. "Run Research" is confirm-gated and warns "uses your API credits" but its pipeline is **deterministic — zero Claude spend**. Meanwhile "Generate Strategies" (`/api/strategies/propose`) and the board "Refresh" (`/api/research` with `skipRefresh:false`) **do spend Claude with no confirm at all**.
> **Dependency:** DR-2 (clean code). **Cost note:** this is a guarding change, not new spend. Any test that would fire a real Claude call needs Joe's typed approval first (per global rule #3).

- [x] DR-3.1: Put an explicit cost-confirm on the buttons that actually bill Claude -- "Generate Strategies" (`components/prep/strategy-proposals.tsx`). Board Refresh (`prep/board/client.tsx` `handleFullRefresh`) was flagged in the audit but traces to the same deterministic `/api/research` pipeline (zero Claude); no confirm added there.
- [x] DR-3.2: Fixed the misleading "uses your API credits" copy on Run Research (`prep/page.tsx`) -- text now accurately states "Free data pull · no AI credits." Also removed the spurious `ANTHROPIC_API_KEY` guard from `/api/research/route.ts` that was 503-ing the endpoint when the key is absent (the pipeline never calls Claude).
- [x] DR-3.3: `analyze.ts` confirmed deleted in DR-2.3. No orphaned Claude functions remain.
- **Done when:** the only buttons carrying an AI-cost confirm are the ones that reach a real Claude endpoint, verified by tracing each button to its route; no confirm fires a $0 deterministic path.

### DR-4 — Kill misleading / fake data `[Sonnet]` · class: output (QA lens)
> **Why:** two places show fiction as fact at the draft. Player Browser "system intel" tags use `getMockSystemTags` with `Math.random()` for BREAKOUT (`prep/players/client.tsx:36-95`, comment says "until intel API is built"). The Dry-Run sim uses a generic `DEFAULT_ROSTER` (qb1/rb2/wr2/te1/flex1/k1/dst1/bench6) instead of the locked Nasties shape (flex3/k0/bench5), so practice grades won't match the real draft.
> **Dependency:** DR-2.

- [x] DR-4.1: Player Browser intel tags — removed the `Math.random()`/fabricated-source mock tags (BREAKOUT, SLEEPER). Kept VALUE/AVOID, which are genuinely derived from real ADP/rank data already present. Removed the dead `'breakout'`/`'sleeper'` filter options. Real user target/avoid tags untouched.
- [x] DR-4.2: Dry-Run sim (`prep/simulate/client.tsx`) — `DEFAULT_ROSTER` now matches the locked Nasties shape (QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1) exactly. Dropped Kicker from position grading (Nasties drafts zero kickers) so the sim never shows a fake "F" grade for a position Joe never rosters.
- **Done when:** nothing in the prep surface displays a computed-random or placeholder value as if it were analysis; the sim scores against Joe's real roster shape.

### DR-5 — One-tap Go Live + connection-UX cleanup `[Sonnet]` · class: pipeline
> **Why:** on a cold start with no pre-existing resumable session, "Auctioneer is LIVE" still routes through the 3-step `/draft/setup` flow before entering the room (`draft/page.tsx`). At the table Joe wants one tap into the cockpit.
> **Dependency:** DR-2 (Sheets removed from setup), DR-1.

- [x] DR-5.1: When the auctioneer is detected live, "Go Live" now auto-creates/auto-resumes a valid auction session (seeded with the auctioneer's real team names via new `useRemoteAuctioneerFeed().teams`) instead of routing through `/draft/setup`. Manual-mode fallback untouched.
- [x] DR-5.2: Fixed `draft/live/client.tsx`'s room status `online` calc — it was `!(remoteError || aifError)`, which read LIVE before the first poll ever landed and stayed LIVE in pure Manual mode with no feed connected at all. Now sources `aifConnected`/`remoteConnected` directly. Manager attribution (DR-5.1's team-name seeding) makes `applyPick`'s exact-string-match against the auctioneer's real names hold end-to-end instead of against generic "Manager 2"-style placeholders.
- **Done when:** from the pre-Go-Live screen with the auctioneer live, Joe reaches the working room in one tap; manual fallback still works. **Code-verified** (type-check/tests/lint/build clean); **live-path verification against a real running auctioneer is DR-7's job**, not confirmed this session — this session's browser preview was also blocked by an unrelated chat session holding the shared preview infra port.

### DR-6 — Design-consistency sweep + season/* decision `[Sonnet]` · class: output (Design lens)
> **Why:** the app is ~85% on the GRIDIRON system. `prep/runs/client.tsx` and `components/prep/strategy-proposals.tsx` still use old shadcn primitives; the 5 unreachable `season/*` screens sit on the pre-GRIDIRON design system with stub TODOs.
> **Dependency:** DR-1..DR-5. **Lowest draft priority — only if time before the draft.**

- [x] DR-6.1: Bring `prep/runs` and `strategy-proposals` onto the GRIDIRON tokens/components so Research is 100% on-system. **Scope expanded (Joe-approved, 2026-08-10):** all 9 reachable off-system Research-tab files converted, not just the original 2 -- `strategy-proposals.tsx`, `strategy-proposal-card.tsx`, `strategy-compare.tsx`, `strategy-value-preview.tsx`, `strategy-list.tsx`, `league-config-form.tsx`, `position-breakdown.tsx`, `strategy-editor.tsx`, `prep/runs/client.tsx`. All shadcn primitives (Button/Card/Badge/Input/Label/Select/Slider/Table) removed in favor of `ffi-*` classes + `var(--ffi-*)` inline styles; `prep/runs/client.tsx`'s comparison table converted to a CSS-grid row layout (Table removal was mandatory regardless, so went fully off-table for consistency). Verified: `type-check` 0 errors, `lint` 41 pre-existing baseline errors unchanged/0 new, `test:run` 96/96 passed, `build` clean (54 routes). Browser-verified 4 of 9 screens via DOM/console/computed-style (pixel screenshot tool was unavailable this session, see CHANGELOG); computed styles confirmed real GRIDIRON tokens resolve at runtime. 3 pre-existing dead/orphan files found during the sweep (`data-freshness.tsx`, `source-weights-config.tsx`, `user-rules-editor.tsx`) were flagged as a separate follow-up task, not touched here.
- [x] DR-6.2: **Decision: quarantine, not delete.** `season/*` (5 files: `page.tsx`, `matchups/page.tsx`, `start-sit/page.tsx`, `trade/page.tsx`, `waivers/page.tsx`) confirmed unreachable, zero references in `src/components/layout/` or `app/(app)/layout.tsx` nav. Each file's top-of-file docblock now carries an explicit "PARKED / OFF-SYSTEM (DR-6.2, 2026-08-10)" banner stating it's unreachable, pre-GRIDIRON, out of scope for draft night, and held for a future in-season companion phase (P8). In-season companion is confirmed out of scope for draft night.
- **Done when:** every reachable screen is on GRIDIRON; season/* is either removed or unambiguously marked parked-and-off-system. **✅ Met.**

### DR-7 — LIVE verification + mock-draft rehearsal `[Sonnet + Joe]` · class: pipeline (QA/Ops) — **DRAFT-READINESS GATE**
> **Why:** the auctioneer `/api/state` contract is **comment-verified only** (2026-08-07); FF-315 offline reconciliation is unit-tested but **never run against a live auctioneer**; the whole path **hard-depends on a seeded Supabase** that this session could not confirm (Supabase MCP needs auth). None of this is proven until it's run for real.
> **Dependency:** DR-1..DR-5 (DR-6 optional). **Needs Joe:** a running auctioneer instance + Joe on his phone. **Cost gate:** if the AI decision below is "on," a real dry run spends ~$0.01-0.03/pick — needs Joe's typed approval before firing.

- [x] DR-7.1: Confirm the live Supabase is seeded — `players_cache` (real 2026 board values from FF-080), the 12-team Nasties league, and a valid auction session. (`/api/players|leagues|draft/sessions` 503 on an empty DB.) **Verified 2026-08-10:** `/api/players?limit=500` → 491 players, Ja'Marr Chase #1 $70 (rank 1). `/api/leagues` → "Nasties 2026", 12 teams, $200, PPR, auction, `is_active:true`. Old stale dev sessions (June 2026, generic "Me/Manager 2" names, zero picks each) marked `completed` via PATCH so DR-5.1 auto-create fires cleanly with real Nasties team names.
- [x] DR-7.2: Smoke-test the real auctioneer contract — with the auctioneer live and one pick recorded, confirm the pick appears in this app within ~5s, manager names resolve, price/position/bye are correct, no CORS error. (Replaces the old FF-072/FFT-006 "mock Google Sheet dry run.") **Verified 2026-08-10:** `/api/auctioneer-feed` live during today's test draft (`isTest:true`) — 85 picks, 12 teams [Rasar/Leems/Reggie/...], pick data (name/position/team/byeWeek/price) all correct. No CORS error — server-side proxy handles it by design. Poll latency: ~3s by code (not timed against live pick-to-render; no browser access this session).
- [ ] DR-7.3: Rehearse FF-315 offline resync — go offline, record a provisional sale with a deliberately wrong price, reconnect, confirm the auctioneer value auto-corrects it with a visible notice and budgets/max-bid recompute; an offline-only pick not yet in the auctioneer stays flagged; no pick duplicates.
- [ ] DR-7.4: Arm's-length physical test on Joe's phone (was FFT-008) — every tap target reachable one-handed, text readable, one-tap Go Live works, the room is smooth/screenshot-able.
- [ ] DR-7.5: Full mock-draft rehearsal end-to-end on the real path (auctioneer + phone), start to graded review.
- **Done when:** Joe has run a full mock draft against the live auctioneer on his phone with picks tracking, advice correct, budgets right, offline-resync proven, and no surprises. **This is the "ready for draft night" sign-off.**

---

## P3 — League-Calibrated Valuation & Exploit Engine [ACTIVE — build before DR-7 rehearsal]

> **North Star (Joe's words, 2026-08-11):** every player shows **three things, not one price** — a **CEILING** (what he's genuinely worth in Nasties Full-PPR/no-K scoring; Gibbs *can* be $97), the **REALITY** (what Joe's room actually pays + what spending it costs him strategically), and **THE PLAY** (a dynamic max-bid that flexes with Joe's team state, money left in the room, positional scarcity, and 16 years of exploitable league tendencies). Built on the **real Nasties auction ledger** (`fantasy_auction_auctioneer/history/bundle.json`, 16 drafts 2010-2025), **never** national ESPN/FantasyPros distribution curves.
>
> **Why this phase exists:** the shipped board values (FF-080: FantasyPros ECR → derived auction values) are national data run through a distribution curve — zero of Joe's league history. That produced a $97 Gibbs / $86 Puka top end that is $12-17 above his room's all-time high (#1 has never exceeded $85 in 16 years). This phase replaces that with league-calibrated numbers. Approved by Joe 2026-08-11.
>
> **Order:** VAL-0 → VAL-3 in sequence. **All work is $0** (local scripts + free ESPN/Sleeper reads; no Claude API). Each item follows PROPOSE/PATCH/VERIFY and pastes proof before `[x]`.

### VAL-0 — Correct + import the 16-year ledger `[Opus]` · class: pipeline (Architecture/QA)
> **Why:** `bundle.json`'s position field is corrupted — only the 5 dedicated single-starter slots are reliable; every flex/bench pick is mislabeled "RB", which poisons any positional analysis (it produced a false "63% RB" reading that reversed once fixed). And the calibration data currently lives only in the sibling auctioneer repo (`../fantasy_auction_auctioneer/...`), which does NOT deploy with this app — the draft app must be self-contained.
> **Dependency:** none — foundation.

- [x] VAL-0.1: Position repair — `history-corrected.json` (normalized-name → real position) generated by the auctioneer's local-only `correct-history-positions.mjs` (hand-map → exact → first+last → fuzzy Levenshtein → lastname vs on-disk Sleeper DB). **Verified 2026-08-11:** 961 names, 98.8% of 2,292 picks resolved; the 5 WRs mislabeled RB on Joe's own 2025 roster (Pittman/Higgins/M.Harrison/Flowers/Worthy) now correctly WR.
- [x] VAL-0.2: Ledger in-repo — copied `bundle.json` (1.2MB) + `history-corrected.json` into `src/data/league-history/`; new tracked `scripts/derive-league-calibration.ts` reads ONLY in-repo data and reproduces the curves. The 4 exploratory scratch scripts (analyze-real-history / calibrate-per-position / diagnose-espn-match / model-analysis) were removed (superseded). **Verified 2026-08-11:** in-repo script prints identical curves with no `../fantasy_auction_auctioneer` path.
- **Done when:** the corrected ledger lives in this repo and is committed; a script in this repo reproduces the calibration curves reading only in-repo data. **✅ Met.**

### VAL-1 — Calibrated per-player values (ceiling + expected room price) `[Opus]` · class: pipeline (Architecture/QA)
> **Why:** this is the CEILING and the REALITY, the first two of Joe's three numbers. Ceiling = roster-aware VORP worth (what the player is genuinely worth in Nasties scoring). Expected room price = what Joe's room actually pays for "the RB5 / WR3 / TE1", from the real per-position price-by-rank curves (RB1 $76…RB16 $22; WR1 $79…WR16 $23; QB1 $36…QB12 $3; TE1 $49…TE12 $2; DEF1 $6).
> **Dependency:** VAL-0.

- [x] VAL-1.1: Derive + store a `league-calibration.json` artifact (per-position rank→price curves + positional inflation multipliers + per-owner leans) from the in-repo corrected ledger. Runtime accessors in `src/lib/draft/league-calibration.ts`. Done 2026-08-12.
- [x] VAL-1.2: Compute, per cached player, a **ceiling** (VORP worth), an **expected room price** (positional rank → room curve), and a **value gap**, exposed through `convert.ts`/`types.ts`. Done 2026-08-12.
- [x] VAL-1.3: Re-priced board proof — `draft-board-table.tsx` renders ceiling / room~ / gap-chip. Proven on real players_cache: Gibbs $97 ceiling / room ~$76 / +$21 POCKET (18 volt chips, computed color rgb(139,255,69)). Done 2026-08-12.
- **Done when:** the board shows league-calibrated ceiling + expected-price per player. **Success criterion + proof:** a screenshot of the re-priced board, e.g. "Gibbs — ceiling $97 / room ~$74 / RB = value pocket," from a preview I load myself.

### VAL-2 — Tendency / exploit engine `[Opus]` · class: pipeline (Architecture/QA)
> **Why:** this is THE PLAY's intelligence layer, and it does not exist — `lib/draft/tendencies.ts` is an 8-line stub (`// TODO: FF-039`). The exploitable edges are all in the ledger: positional inflation (WR runs HOT 1.18x, RB runs COOL 0.84x = Joe's value pocket, TE HOT 1.17x = Shultz effect), per-owner leans (Cross→WR, Crandall→QB, Bruce/Leems→stud RB, Shultz→TE #1), and in-draft nomination runs (bundle has pickNumber + timestamps).
> **Dependency:** VAL-0 (data), VAL-1 (values to modulate).

- [x] VAL-2.1: Built out `tendencies.ts` — `positionExploit` (inflation) + `ownerExploit` (per-owner leans), sourced from the calibration artifact, folded by `buildExploitSignals`. 20 unit tests in `__tests__/tendencies.test.ts`. Done 2026-08-12.
- [x] VAL-2.2: Nomination-run detection — `detectPositionRun`/`runExploit` read the last-N live picks (window-bounded) and flag a position running hot vs the room's pace. Regression-tested. Done 2026-08-12.
- **Done when:** the engine emits real exploit signals sourced from history; `npm run test:run` covers the inflation + owner-lean math. **PROVEN:** 116/116 tests pass, incl. RB value-pocket / WR-hot / Shultz→TE / Leems→DEF assertions.

### VAL-3 — Wire calibrated values + tendencies into the live advisor `[Opus]` · class: pipeline (Security/QA)
> **Why:** the dynamic engine already exists (`auction-advisor.ts` `calculateMaxBidAdvice` flexes on budget/slots/need/scarcity/pace) but anchors to `consensusValue × 1.3` — the wrong national number (`auction-advisor.ts:48`). Re-anchor it onto the calibrated ceiling + expected-price + live state, and surface the exploit layer in the room. This is where THE PLAY becomes the live max-bid.
> **Dependency:** VAL-1, VAL-2.

- [x] VAL-3.1: Re-anchored `calculateMaxBidAdvice` — new optional `calibrated` input (ceiling + expectedRoomPrice + inflationTag) anchors max-bid on the ceiling/room midpoint with a directional HOT/COOL tilt, replacing `consensusValue × 1.3`. Inflation is NOT re-multiplied (already baked into the room curve). Live caller wires it in `draft/live/client.tsx`. Done 2026-08-12.
- [x] VAL-3.2: Exploit signals available via `buildExploitSignals` for the live room (value-pocket / runs-hot / owner-lean), ranked and neutral-dropped. Done 2026-08-12.
- **Done when:** live max-bid reflects Joe's room, not national data, and the exploit layer is visible. **Success criterion + proof:** calibrated anchor verified against real players_cache (Gibbs midpoint anchor from $97 ceiling / ~$76 room); `League-calibrated` factor surfaces "Worth X, room pays ~Y" in the advice.

---

## Decisions to make (flagged, non-blocking — resolve during/before DR-7)

1. **AI features at the draft (cost).** Core advice — What-To-Do, budget, max-bid — is 100% rule-based and needs no API key (works today, free). The **AI "Top Targets" / research / strategy-proposal** panels need `ANTHROPIC_API_KEY` (absent from `.env.local`) and cost per call. **Recommended default: keep the rule-based advisor as the draft-night engine (free, reliable); leave the AI panels in safe fallback; only add a key + accept ~$0.01-0.03/pick if Joe wants LLM-generated picks live.** Joe decides in DR-7.
2. **season/* (in-season companion).** ~~Delete vs keep-parked~~ **Decided (DR-6.2, 2026-08-10): quarantine/park, out of scope for draft night.** Files carry explicit "PARKED / OFF-SYSTEM" banners.

---

## Superseded / rejected directions (decision records — do NOT resume)

- **Auctioneer UI Port** `[REJECTED 2026-07-12 · archived 2026-08-10]` — a standalone plan (`AUCTIONEER_UI_PORT_PLAN.md`) proposed swapping GRIDIRON's visual system for the auctioneer's (`--ck-*` tokens, 5-identity WA theme bank, Rajdhani/Archivo fonts, ESPN headshots). **Joe's decision: the draft app keeps its own GRIDIRON identity.** The shipped live room uses its own scoped `theme.ts` palette, not the auctioneer's system. Auctioneer components may be reusable but are **not needed** after the screen-by-screen overhaul. Nothing to build. Full doc archived at `.claude/archive/AUCTIONEER_UI_PORT_PLAN.md`. (This orphan is why the "one-plan rule" above now exists.)
- **Stadium Primetime / "Sunday Night Gridiron"** `[SUPERSEDED 2026-06-04]` — gold-glass direction rejected as generic AI slop; replaced by UX-V2 GRIDIRON. Engine/infra reused; look rebuilt. History-only.

---

## Completed Work (History)

> Full detail lives in `CHANGELOG.md` + git; these are the compact records. Original FF-XXX / UX IDs intact.

**S1 — Config truth + navigation** `[x]` (2026-08-11)
- FB-1: fixed duplicate-active-league drift at the source (`prep/configure/actions.ts`) + one-time data correction. FB-4: verified already-dead. FB-5: back-nav added to players/board/strategies/simulate. FB-6: "Draft Board" → "Cheat Sheet" + inline help distinguishing it from Live Draft. Verify gate clean (type-check/test 96·96/lint 0 new/build); loaded-preview screenshot deferred — see S1 detail note above (Next.js per-project dev-server lock, Joe waived it this session).

**P1 + P1b — Auctioneer integration + remote live sync** `[x]`
- FF-279..283: read auctioneer JSON/BroadcastChannel on same device; `auction-feed-merge.ts` pickId dedup; multi-source priority merge in `use-draft-feed.ts`; dynamic max-bid recompute per pick.
- FF-314: over-the-network remote sync — server proxy `src/app/api/auctioneer-feed/route.ts` (CORS dodge) + `use-remote-auctioneer-feed.ts` (~3s poll, backoff) folded in as a source. Contract read as-built 2026-08-07 (payload IS the `DraftState`; picks at `picks[]`; teams at `config.teams[]`). **Live-verified against a running auctioneer: pending → DR-7.2.**
- FF-315: offline resync + reconciliation — auctioneer is system of record; `reconcileWithAuctioneerPicks` in `state.ts` + corrections banner; 35 unit tests. Spec `.claude/OFFLINE_RESYNC_SPEC.md`. **Live-verified: pending → DR-7.3.**

**UX-V2 — GRIDIRON redesign** `[x]` (UXV2-1..8, 2026-06-04 → 2026-08-09)
- Direction: EA FC energy + Linear discipline; colorful-dark canvas, volt-green = the moment/value/action, electric blue = structure; Anton/Saira Condensed/JetBrains Mono; performant (no backdrop-filter stacks). No app-wide gold.
- Motion system (`lib/motion.ts`, motion components). Prep hub, Draft Board, Player Pool, Review rebuilt to GRIDIRON.
- UXV2-6: Live Auction Draft Room built — decision-first: status bar → On-the-Block hero with "What To Do" (`lib/draft/what-to-do.ts`, HOLD/BID/PUSH/PASS + cap + rationale) → awareness/budget/tier → My Team → bottom nav → block-picker + fix-a-pick sheets. Research-tab in-room view. Scoped `live-room/theme.ts` palette.
- UXV2-7: reduced-motion DIAL-DOWN + perf/arm's-length pass (lean, no filter stack). UXV2-8: full-track VERIFY + DESIGN docs reconciled to v3.1.

**P0-UX — 4-tab IA overhaul** `[x]` (UX-S1..S6, 2026-08-08 → 2026-08-09)
- Replaced 3-tab nav with 4 tabs: Research (`/prep`, landing) / Draft (`/draft`) / Review (`/draft/review`) / Setup (`/settings`), longest-prefix active state. Spec: `.claude/UX_OVERHAUL_2026-08.md`.
- Research consolidation; Draft = live auction room + FF-314 auto-connect; Setup with locked Nasties defaults auto-seeded (QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1), real signed-in user email (PM-email leak fixed), snake/keeper/sounds UI removed; Review as its own tab.

**P0 — Personal season hardening** `[x]` (sub-tiers 0-8)
- FF-253/254 UI eval (verdict B). FF-257/258/259 pinned quick-entry, mode selector, 4-state connection pill. FF-313 app-shell double-mount fix. FF-261-264 ESPN $200 auction calibration + budget trackers. FF-265-267 auction/snake separation. FF-268/269 mobile-first + touch targets. FF-243/270-272 AI transparency (confidence, source attribution, drift alerts). FF-276-278 pre-draft tools (dry run, news, ADP shifts). FF-305-311 trash-talk engine + live wiring + owner history. Sub-tier 6 (Tyler keeper) built then permanently held — out of scope.

**Phases 0-8 — core engine** `[x]`
- P0 foundation (FF-001-008b): scaffold, auth, league config, mobile shell.
- P1 data (FF-009-016): player model, ESPN/Sleeper/FantasyPros adapters, multi-source normalize, Supabase cache, freshness UI.
- P2 strategy (FF-S01-S08, FF-017-028): strategy model, AI proposals, editor, research pipeline, draft board, run management. FF-029 keeper (held).
- P3 live draft (FF-030-049, FF-P01-P05): setup, manual entry, scarcity, explainability, auction + snake state machines, recommendations, max-bid, budget strategy.
- P4 polish (FF-050-055): dark mode, states, post-draft review, CSV/share export, latency opt.
- P5 scoring (FF-067/068/070/071): scoring-aware analysis, Vercel deploy, Nasties E2E.
- P6-7.5 (FF-060-105, FF-073-078, FF-201-252): UI redesign, player intelligence (tags/rules/scoring/browser).
- P8 (FF-110-137): in-season companion (parked — see DR-6.2).
- **Data seed (FF-080, 2026-08-10):** `seed-players-sleeper.ts` (3,141 cached) + `populate-fantasypros.ts` (489 real 2026 PPR ECR + derived auction values, Ja'Marr Chase #1 $70). Free APIs. **Live-DB confirmation: pending → DR-7.1.**

**Retired:** P3 Community Release, P4 Session Layer, P5 Commercial Beta, P6 B2B, P7 Scale — all RETIRED 2026-08-06 (personal tool, no commercialization). FFT-007 (Sleeper dry run) retired 2026-08-06.

---

## Dead-code register (being removed in DR-2)

Kept here so the removal is tracked, not silent:
- **Google Sheets:** `lib/sheets/index.ts`, `api/draft/sheets/route.ts`, `use-draft-polling.ts`, the `sheet_url` branch in `use-draft-state.ts`, the `sheets` option in `draft/setup/client.tsx`, `'sheets'` in `auction-feed-merge.ts`, legacy `connection-status-pill.tsx`.
- **Snake/keeper surfacing:** `SnakeAnalysisCard` in `draft/review/client.tsx`, Tyler preset in `scoring-presets.ts`, keeper block in `research/service.ts`. (Shared state-machine internals stay if load-bearing.)
- **Orphans:** `lib/research/analyze.ts` (0 callers), empty `prep/research/` dir, `components/settings/sound-settings.tsx`.
- **Off-system/parked:** `season/*` -- quarantined, not deleted (DR-6.2, 2026-08-10). Each file's docblock now has a "PARKED / OFF-SYSTEM" banner.

---

## Bug Hunt Schedule

| Cadence | Mode | Scope | Last Run | Next Run |
|---------|------|-------|----------|----------|
| Per-sprint | `free` ($0, static) | Changed modules | — | After DR-2 |
| Monthly | `full` (tests + build) | Full project | — | After DR-5 |

Run: `/bug-hunt free` or `/bug-hunt full`

## Feedback Queue

| Date | Reporter | Issue | Triaged To |
|------|----------|-------|------------|
| 2026-08-10 | Joe | Build plan + dev docs riddled with dead Google Sheets / snake refs; orphaned AUCTIONEER_UI_PORT_PLAN. Full overhaul. | This refresh (P2 Draft Readiness + DR-1 docs truth-up) |
