# Changelog -- FFIntelligence

---

## 2026-08-22 / R13 F1 fix -- live draft room now maps players through cacheToPlayers (tier scarcity + urgency)

**Class:** bugfix (QA lens). $0 (no API calls). Found by the R13 Claude-driven browser layer (TEST_FINDINGS F1).

**Root cause.** `src/hooks/use-live-draft-data.ts` fetched raw `players_cache` rows from `GET /api/players` and set them straight into a `Player[]`-typed state WITHOUT the canonical `cacheToPlayers` mapping that every prep screen (`board`, `simulate`, `strategies`) already uses. Raw DB rows keep the FantasyPros tier under `source_data.tier` and have NO top-level `consensusTier`. So `calculateScarcity`'s tier filters (`consensusTier <= 1`, `=== 2`, `>= 3`) all ran against `undefined` and returned 0 for every tier at every position -- the Tier Context read T1:0..T5:0 across the board and the `urgency-<POS>` awareness items (gated on `tier1Remaining > 0`) never surfaced. Originally logged as "sim-only" but the same raw-row path degraded a REAL draft identically.

**The fix.** Map the fetched rows through `cacheToPlayers` at all three `setPlayers` sites in `use-live-draft-data.ts` (sim demo path, real-session path, offline-fallback path). One-line change per site plus the import; scoped entirely to the live draft room (no route change -- other `/api/players` consumers still get raw `CachedPlayer` rows as they expect).

**Proof (pasted).** `npm run type-check` -> 0 errors. `npx eslint src/hooks/use-live-draft-data.ts` -> clean. New regression test `src/lib/draft/__tests__/scarcity-tier-mapping.test.ts` (2 tests): raw rows -> WR/RB `tier1Remaining === 0` (the documented bug); `cacheToPlayers`-mapped rows -> WR `tier1Remaining===2`, `tier2===1`, `tier3===1`, `startableRemaining===3`, RB `tier1===1` (urgency gate can fire), and `consensusTier===1` on the elite WR. `npm run test:run` -> **56 files, 690 passed, 0 failed** (working tree; includes the 2 new F1 tests). Browser confirm on `?sim=1`: Tier Context now reads real counts (e.g. WR T3:44 / T4:2 / T5:42) where before the fix every tier chip was 0. Files: `src/hooks/use-live-draft-data.ts`, `src/lib/draft/__tests__/scarcity-tier-mapping.test.ts`, `.claude/TEST_FINDINGS.md`.

---

## 2026-08-22 / VAL-2.2 -- expert-anchored valuation blend (fixes "all RB value / all WR prem")

**Class:** shared (Architecture + QA lenses). `convert.ts` is the single shared read path. Plan of record: `C:\Users\jrasa\.claude\plans\bright-percolating-pudding.md` (approved). $0 (no API calls).

**Root cause (self-inflicted in VAL-2.1).** The prior fix defined `valueGap = expertAdjustedValue - expectedRoom` where `expertAdjustedValue = round(expectedRoom / positionalInflationMult)`. Because the inflation multiplier is a per-POSITION constant (RB 0.84, WR 1.18, TE 1.17, QB 0.96, DEF 0.92), the gap collapsed to `expectedRoom * (1/mult - 1)` -- its SIGN was a pure function of position, with zero per-player signal. Result: every priced RB read as a value pocket and every priced WR/TE as a premium tax ("draft only RBs, never win a WR"). NOTE: this never touched the live engine -- the auction advisor, roster solver, and Monte-Carlo sim never read `valueGap`; they price off `ceilingValue` + `expectedRoomPrice`. The bug lived only in the prep-board tag/chip DISPLAY layer. The bad `room / const` MaxBid Joe saw was only in the hand-built `REPRICED_BOARD.md` markdown, never in the app.

**The fix (VAL-2.2, expert-anchored -- Joe's chosen philosophy).**
- `convert.ts`: `expertAdjustedValue = LAMBDA*ceilingValue + (1-LAMBDA)*expectedRoom` with `LAMBDA = 0.3` (low lambda = disciplined shrink toward the expert ECR room price). `valueGap = expertAdjustedValue - expectedRoom`, clamped to +/-40. Now rides each player's own `ceilingValue`, so per-player sign variation is restored. Our optimism is quarantined to the separate, unchanged `upsideValue` dart lane. Dropped the now-unused `positionalInflation` import.
- `tags.ts`: POCKET is now expert-CORROBORATED -- fires only when `valueGap >= 4` AND experts aren't wildly split (`rankSpread.std < 20`). When the gap is there but experts disagree hard, VOLATILE fires instead and `upsideValue` carries the dollar upside (a dart, not a corroborated bargain). TAX unchanged. Hint/source copy updated to describe the blend.
- `draft-board-table.tsx`: the board pocket chip got the same std-gate so it can't disagree with the card's POCKET tag (tags.ts header invariant). Hot chip ungated, mirroring TAX.
- `types.ts`: doc comments corrected to describe the blend, not "inflation stripped out."

**Proof (pasted).** `npm run type-check` -> 0 errors. `npm run test:run` -> **55 files, 688 passed, 0 failed** (baseline 684 + 4 new regression tests: 2 in `convert.test.ts` pinning the lambda=0.3 blend and proving two same-ECR-rank/different-VORP RBs get DIFFERENT ordered gaps; 2 in `tags.test.ts` pinning the expert-corroboration gate). `npx eslint` on all 6 touched files -> exit 0, 0 errors/0 warnings (also cleaned 6 pre-existing em-dash violations in `tags.test.ts` describe titles). Files: `src/lib/players/{convert,tags,types}.ts`, `src/lib/players/__tests__/{convert,tags}.test.ts`, `src/components/prep/draft-board-table.tsx`.

**Board-visibility caveat (NOT yet reflected on the published board).** The code fix reaches the live advisor/sim immediately, but the prep board reads `research-output/dataset.json`, which is a STALE pre-VAL-2.1 snapshot. It will not show the corrected numbers until `npm run research:run` regenerates it (needs the Supabase service key + ESPN feed -- not available this session). Not claimed as done on the board.

**Gaps roadmap (deferred, in the plan):** no real ESPN market auction anchor; lambda is a flat shrink not disagreement-weighted; `tendencies.ts` exploit engine wired to nothing; sim gives every seat the me-seat budget; no in-draft budget inflation; curves are 4 drafts not "16 years"; no dynamic positional scarcity repricing in the sim.

---

## 2026-08-22 / R13 (test hardening) -- LIVE-DRAFT ADAPTIVE ENGINE test suite + Claude-driven browser layer

**Class:** bugfix/QA (QA + Architecture lenses). Joe asked for detailed front-end + backend tests proving the live-draft adaptive engine actually adjusts as auctioneer picks land, with un-fakable definitions of done, plus Claude opening a browser to test the UI, and any issues documented so they can be fixed. Two locked decisions: add `data-testid` to source (not test-only shims); document AND fix clear-cut defects in the same pass (never soften an assertion). Plan of record: `C:\Users\jrasa\.claude\plans\fantasy-football-draft-app-this-app-tranquil-knuth.md`. $0 (no API calls).

**What was built.** The two headline adaptive modules had ZERO tests before this pass. Added **+52 tests (632 -> 684, all green)** across three automated layers plus a browser layer:
- **Group A (engine units):** `flow-monitor.test.ts` (detectStrategyDrift + analyzeDraftFlow/detectPositionRuns/detectValueAnomalies/analyzePoolQuality, 12 tests), `pivot-detector.test.ts` (detectPivotOpportunity scoring + named alt strategy, 4 tests), `auction-advisor.test.ts` extended (budget pace boundaries + position-urgency severity, +23). Exact thresholds asserted: drift active iff last target gone; pivot fires iff best-alt score>=15; pace +/-15 boundaries; urgency 1->critical / 2->warning at $15.
- **Group B (recompute-on-pick integration):** `recompute-on-pick.test.ts` -- max-bid evolves 72 -> 86 (scarcity x1.2 when alts <=2) -> 8 (budget clamp) with exact numbers; drift+pivot flip at exactly the pick that removes the last RB target (step 4), pivot names `zero-rb`. `use-draft-state.test.ts` -- feed pick -> draftedNames(lowercased) + getBudget 200->155->140.
- **Group C (API routes):** `auctioneer-feed/route.test.ts` (10 -- exact `{state,error}` envelope, always HTTP 200, code URL-encoded, trailing-slash strip), `draft/sessions/route.test.ts` (8 -- POST 400/404/201, PATCH 404/200), `players/route.test.ts` (6 -- limit 300, DEF->DST, empty-adp filter, 503).
- **Group D (Claude-driven Chrome, `?sim=1`):** live DOM before/after on port 3003. Recompute observed: budget-remaining $200->$199->$198->$197, roster-count 0->1->2->3, progressbar 100->99, round-pick R1 PICK1->R3 PICK27, budget-pace recomputed, otb-max-bid renders finite $1, and the adaptive pivot-line changed "On plan..." -> "You are behind the WR run...". Full evidence + findings in `.claude/TEST_FINDINGS.md`.

**P1 -- data-testid hooks added to source (11):** `budget-remaining`, `budget-maxbid`, `roster-count` (budget-strip.tsx); `otb-max-bid` (on-the-block-card.tsx); `round-pick` (status-bar.tsx); `pivot-line` (strategy-strip.tsx); `urgency-<POS>` + `budget-pace` (awareness-strip.tsx via a new optional `testId` on AwarenessItem, wired in auction-room.tsx); `drift-alert` + `pivot-suggestion` (draft-flow-alerts.tsx). Values-only, copy-independent.

**Defects found (logged in TEST_FINDINGS.md, NOT fixed this pass -- sim-path, need Joe triage):** F1 (medium) -- in `?sim=1` all tier counts render 0 (players_cache rows carry no `tier` field; the sim data path never runs the analysis that assigns tiers), so the `urgency-<POS>` awareness items can't surface in sim; the urgency math itself is proven at unit level (A4). F2 (low) -- `?sim=1` throws a 500 + `[useUserTags] invalid input syntax for type uuid: "demo-league"` (the non-UUID demo league id hits a uuid column); sim-only, non-blocking. Zero defects in the adaptive engine itself -- all 26 automated behavioral assertions matched the spec.

**Proof (pasted).** `npm run test:run` -> **55 files, 684 passed, 0 failed** (baseline 632, +52). `npm run type-check` -> 0 errors. `npx eslint` on all 7 touched components -> 0 errors/0 warnings. Browser layer run live against `http://localhost:3003/draft/live?sim=1` with DOM reads pasted into TEST_FINDINGS.md. New files: `src/lib/draft/__tests__/{flow-monitor,pivot-detector,recompute-on-pick}.test.ts`, `src/hooks/__tests__/use-draft-state.test.ts`, `src/app/api/{auctioneer-feed,draft/sessions,players}/__tests__/route.test.ts`, `src/test/{setup,factories}.ts`, `.claude/TEST_FINDINGS.md`.

---

## 2026-08-22 / PREP RE-EVAL Part 2 -- per-screen IA inside SHIELD v4 (Leaderboard + Cheat Sheet + League Intel + Players card) -- COMPLETE

**Class:** output/UI (Design + QA lenses). Part 1 made the data correct + differentiated + realistic; Part 2 rebuilds WHAT each prep screen shows and HOW it groups, staying inside the locked SHIELD v4 system (every card a `Nameplate`; zero inline hex, `--ffi-*` tokens only; no leftover GRIDIRON volt-green; expandable rows not card grids; mobile-first). No engine change, no network, $0.

**Strategy Leaderboard -- full 13-man roster with the real dollar spread (commit `8e5e1ee`).** Defect D bit hardest here: the screen showed only the 3-4 `coreNames`. `leaderboard/client.tsx` + new `sim-results-cards.tsx` now render the full 13-man MEDOID roster grouped by position (QB/RB/WR/TE/FLEX/DST/bench) with the dollar paid on each slot, so Joe reads the shape of the $200, not just the studs. 16/16 component tests.

**Cheat Sheet (Draft Board) + League Intel -- SHIELD compliance rebuild (commit `b523f19`).** `draft-board-table.tsx` was the genuine structural violation: a bespoke `var(--ffi-surface-2)` shell carrying leftover volt-green and inline hex. Moved every player row onto the sanctioned dense-list material `ffi-plate-row` and the empty state onto `Nameplate`; purged ALL volt-green and inline hex for `--ffi-*` tokens. SHIELD semantics wired through the tier/gap/target chips: targets + value pockets = steel-blue (`--ffi-blue`), elite/T1 = brick-red (`--ffi-gold`), hot/avoid = coral (`--ffi-danger`). `globals.css` gained `--ffi-pos-def` (#637396) + `--ffi-pos-k` (#a78bfa) so position pills stop borrowing another position's token. `board/client.tsx`: `Nameplate` error + empty cards, tokenized position pills, brick-red strategy badge, blue/coral filter-active states. `league-intel-panel.tsx`: the positional-inflation rows now carry a plain-English action that WRAPS on mobile instead of truncating (HOT -> "pays N% over national, so spend elsewhere and let it inflate"; COOL -> "value pocket, N% under national, so buy your POS here"; NEUTRAL -> "in line with national, no edge either way").

**Players intel card -- hex purge / token compliance (this pass).** `ffi-player-intel-card.tsx`: all 77 inline hex purged to `--ffi-*` tokens. The earlier deferral reason ("opacity modifiers don't translate to `var(--ffi-*)`") was WRONG -- Tailwind CSS 4 in this project supports opacity-on-variable (`bg-[var(--ffi-blue)]/18`), with 15+ existing uses across settings/simulate/draft-setup/app-shell. So the Joe-approved D4 expandable-row IA is untouched: structure and logic are byte-identical, only color VALUES changed. Exact-match swaps (blue `#5FA8E0`, blue-bright `#7FC0EA`, ink `#eaf1f8`, ink-2 `#9fb2c6`, ink-3 `#5e708a`, volt `#A63C41`) = zero visual change. Reconciled genuinely off-palette drift to the nearest SHIELD token: `#ff716c`->`--ffi-danger` (near-identical coral), `#f5b301`->`--ffi-warning` (**VISIBLE: saturated yellow -> orange, on volatile/injury tags**), `#8bacff`->`--ffi-blue-bright` (**VISIBLE-ish: periwinkle -> cyan, on sleeper/accents; muted uses -> `--ffi-ink-3`**), `#697782`/`#64768c`/`#deedf9`/`#04070d` -> nearest ink/surface/pos tokens. Added DEF/K entries to `POS_CHIP` (league is no-K so K never renders). Both VISIBLE shifts flagged to Joe for eyeball/veto -- his approved screen, his call.

**Proof (pasted).**
- Gate: `type-check` 0 errors; `test:run` **632/632** (0 regressions); `lint` 0 errors on all touched TS files (`globals.css` correctly ignored by ESLint as CSS).
- Players card token compliance (source-level, pasted): `Grep '#[0-9a-fA-F]{3,8}'` -> **No matches** (0 inline hex); `Grep '139,255,69|8bacff|f5b301|ff716c'` -> **No matches** (0 volt-green, 0 off-palette drift). All reconciled colors map to tokens defined in `globals.css`.
- Live verification on the running dev server (`:3003`, dataset row `243b4cef`): `/prep/board` renders 483 player rows on `ffi-plate-row`; a computed-style scan across every rendered element returned **0** volt-green (`139,255,69`) hits. Rows show tier badges T1-T5, `+$N POCKET` (blue) and `$-N HOT` (coral) gap chips off the room-price model.
- The Players card (`/prep/players`) could NOT be visually rendered this session: the Browser pane is not displayed -> the page never composites frames -> screenshot and in-page JS both time out, and the client fetch stalls at the loading gate. All 3 supporting API endpoints (`/api/players`, `/api/leagues`, `/api/user-tags`) were verified healthy (HTTP 200, sub-second) from the shell, so the stall is the non-compositing pane, not the app. Because the change is a presentational token swap and `type-check` guards every `style` object, the offline gate + source grep is the proof; Joe does the visual pass via the preview link.
- Commits `8e5e1ee` (leaderboard) + `b523f19` (board/intel) + Players-card commit (below) pushed to `master`.

---

## 2026-08-22 / PREP RE-EVAL Part 1 (cont.) -- realistic nomination + medoid rosters + imputation net

**Class:** pipeline + shared (Architecture + QA lenses). Continues Part 1 after Joe's deep engine critique: real auctions have the lot WINNER nominate next, so budgets drain unevenly and "many guys go for way less than they should while many go for way more" -- a startable falling to $1 late is realistic, but the SAME startable pinned at $1 in every strategy is an artifact. P1A/P1C fixed strategy convergence and identity dupes; this pass fixes the residual $1-startable pinning AND the risk of studs cratering. Pure engine, $0, no LLM, no network re-pull.

**Realistic nomination order -- `src/lib/draft/sim-engine.ts` `pickNominationIndex`.** The old model nominated strictly the top-3 remaining by ceiling, so mid-tier startables only came up after ~30 studs sold -- by which point opponents' slots were full and they cleared at $1 to a lone bidder. Replaced with a tight/wildcard MIXTURE: TIGHT (55% of lots) draws the top-4 remaining so studs clear promptly and never linger into the thin late market (this is the ONLY branch that nominates the very top -- it is what stops Puka/Gibbs cratering); WILDCARD (45%) draws UNIFORMLY over the mid/late board `[tightWindow, pool)`, deliberately pulling role players up while budgets are still live. (An earlier single-exponential attempt over-corrected -- studs cratered because nothing kept the top moving; a decay-toward-top wildcard just re-nominated near-studs and starved the mid-tier. The uniform mid-board draw targets exactly the band that needs surfacing.)

**Medoid representative roster -- `src/lib/draft/sim-grade.ts` `medoidRoster` (new).** `topModalRosters` showed each strategy cluster's FIRST-occurrence run as its representative -- an arbitrary instance whose end-game bench slots often all landed at $1 by luck, even though the cluster's AGGREGATE prices were realistic (e.g. Rome Odunze landed $4-7 on average but the shown roster had him at $1). Now each cluster stores all its runs and the representative is the MEDOID: the real run whose per-slot prices deviate least from the cluster's per-player medians. No price is synthesized -- the medoid is an actual simulated roster; we only stop showing an atypical one.

**Projection imputation safety net -- `src/lib/players/impute-projections.ts` (new), wired into `cacheToPlayers`.** Builds a rank->points curve per position from players with a real projection, then linear-interpolates `projectedPoints` for any draftable with a null/0 projection but a real `ecrPositionRank` (clamp at ends, no extrapolation). Flags each `projectionImputed:true` (new `Player` field) so it is never mistaken for a feed value; already-imputed rows are excluded as anchors. Fires AFTER dedupe at the shared read seam, so the sim never scores an elite at 0 when the offseason feed is empty. The current live feed carries real projections for all 6 prior-null elites, so 0 are imputed today -- it activates only if the feed regresses. Removes the sim's dependency on the still-deferred network `data:pull` repair (P1B).

**Proof (pasted).**
- Gate: `type-check` 0 errors; `test:run` **632/632** (13 new: 7 imputation + 4 nomination + 2 medoid, 0 regressions); `lint` 0 errors/0 warnings in every touched file (the repo's 42 pre-existing baseline errors are all in untouched in-season/script files).
- Dataset regenerated (`npm run research:run`) + published to Supabase (row `243b4cef`). Measured on the shown representative rosters (44 = 26 strategies + 18 stud combos): distinct stud cores **26** (original defect was 2); Gibbs **$88** and Puka **$88** in every appearance (no cratering, was Gibbs $19 / Puka $1 in the failed single-exponential attempt); $1-startable slots **54 -> 36** after the medoid; spread median **7** players priced over $1 per 13-slot roster (min 4, max 12).
- Residual $1 startables verified as correct auction behavior, not artifacts: Sam LaPorta (TE7 by room price) is $1 only in strategies that PUNT TE and spend the $200 elsewhere; strategies that value TE pay $18+ for Bowers/McBride. His aggregate landed price is $3-8. This is the imperfect-market behavior Joe asked for.

---

## 2026-08-21 / PREP RE-EVAL Part 1 -- strategy-driven sim + identity dedup

**Class:** pipeline + shared (Architecture + QA lenses). Joe rejected the prep screens on two data defects: (1) virtually every strategy produced the SAME roster (Gibbs + Luther Burden regardless of strategy), and (2) each sample roster spent the full $200 on just 3-4 players (unrealistic). Root-caused to the engine + the cache, not the display. Part 1 fixes the engine/data; Part 2 (screens) is separate. Pure engine, $0, no LLM, no network re-pull.

**Defect B (strategy-blind sim) -- fixed in `src/lib/draft/sim-engine.ts`.** The me-seat always valued players at a fixed national ceiling and won ties, so every strategy converged on the same top-2 studs at ~$88 then dropped to $1 fills. Added `SimMyPlan { anchors: Record<id, {maxPrice}> }` + `myPlan?` on `SimEngineInput`, and a new me-seat valuation branch: with a plan, me chases its strategy's named anchors up to their solved walk-up price and values every OTHER slot at room price capped by a dynamic per-slot fair share (`remaining budget / open slots x VALUE_FILL_SPREAD=2.5`). So leftover dollars spread across the whole roster and taper as slots fill, instead of hoarding the next stud. Absent `myPlan` => legacy ceiling-chase (all existing sim tests unchanged). New `buildMyPlanFromStrategy` in `sim-results.ts` maps a strategy's `target_pricing.prices` (+ un-priced `key_targets`) to anchors keyed by board id, capped at $88; threaded through `scripts/research-run.ts` `simInputFor`.

**Defect C (duplicate identities) -- fixed in `src/lib/players/dedupe-identities.ts` (new) wired into `cacheToPlayers`.** `players_cache` held two rows for one human -- "Luther Burden III" (ADP 47, $27, no projection) and a ghost "Luther Burden" (ADP 999, proj 212.3) -- and the sim drafted both. `normalize.ts` was NOT the origin (its `normalizeName` already strips suffixes); the dup is two separate cache rows, so the fix lives at the shared read path. New pure `dedupePlayerIdentities` collapses same canonical-name + position + compatible-team rows: keeps the best-ranked (lowest-ADP) row's identity/pricing, adopts only MISSING scoring fields from the ghost, never overwrites, never merges different-team/different-position same-names. Called inside `cacheToPlayers` (best-first sort before dedup), so the sim, the published dataset, AND the live screens all see one row per player. 8 unit tests.

**Proof (pasted).**
- Gate: `type-check` 0 errors; `test:run` **614/614** (7 new dedup tests, 0 regressions); `lint` 0 errors/0 warnings in every touched file (the repo's 42 pre-existing baseline errors are all in untouched files, e.g. `verify-vorp.ts`).
- Dataset regenerated (`npm run research:run`) + assertion script, all PASS: Burden rows in published players **2 -> 1** (survivor keeps ADP 47/$27 AND adopts proj 212.3); duplicate-identity roster hits **5 -> 0**; every strategy rep roster = 13 players; distinct core-sets **2 -> 17** of 26; all 26 grades finite; strategies spreading >=8 players over $1 = **18/26**; max single-player prevalence **26/26 -> 15/26**.
- Spread now tracks the strategy shape: heavy-anchor builds concentrate (top-3 = 85-95%, correct stars-and-scrubs), even/light/balanced spread across 9-13 players (top-3 = 46-74%). Grades vary 7.7-9.3.
- Part 1B (repair the projection join for ~21 still-null top-40 players, e.g. Jonathan Taylor / Jeanty / Lamar) deferred: it needs a network `data:pull` that shifts numbers under Joe mid-review, and the sim no longer depends on it.

---

## 2026-08-21 / W2 -- League Intel panel + per-player dataset enrichment

**Class:** output + shared (Design + QA lenses). Third W-track session. Same orchestration shape as W1: Opus orchestrator dispatched a Sonnet worker to build, then an independent adversarial Sonnet validator; the orchestrator fixed the finding and committed. Reads the W0 dataset snapshot -- zero recompute, $0.

**League Intel.** New `src/components/prep/league-intel-panel.tsx` -- a collapsible `Nameplate`-based `LeagueIntelPanel` (prop `intel: DatasetLeagueIntel`) that turns the dataset's league-history block into a scannable panel. Header states the sample ("From 4 drafts, 2022 to 2025") from `intel.era` + `intel.draftsUsed`. Positional inflation rows show each position's HOT/COOL/NEUTRAL tag and multiplier (percent = `Math.round((mult-1)*100)`), toned HOT->`--ffi-warning`, COOL->`--ffi-blue-bright`, NEUTRAL->`--ffi-ink-3`. Owner-leans list is filtered to managers with a real top lean, sorted by absolute dollars-vs-room, and scrolls inside a fixed-height box. Mounted dataset-gated on both `prep/leaderboard` (before the ranked list) and `prep/board` (below the board header).

**Per-player enrichment.** New pure `src/lib/research/dataset-enrichment.ts` (`buildEnrichmentMap` keyed by `player.id`, `pickEnrichment`; 7 unit tests). When a dataset is present, each `/prep/players` card (FFIPlayerIntelCard OUTLOOK line) and `/prep/board` expanded-stats row merges the dataset's per-player read -- `landProbability`, `expectedRoomPrice`, `durabilityPriceFactor`, `valueBand` -- rendered additively as `land N% · room $X · 0.NNx · band $lo-$hi`. Fully additive: no dataset -> the existing client-computed view is unchanged.

**Contract + writer.** `durabilityPriceFactor: number` added to the `EnrichedPlayer` interface in `dataset-types.ts` and written per-player in `scripts/research-run.ts` via an aliased import of `durabilityPriceFactor` from `sim-grade`. Dataset republished (1000 players, real factors 0.75 -> 1.0). Two `leaderboard.test.ts` fixtures updated for the now-required field.

**One defect the validator caught, fixed before commit:**
- **SHIELD token-lock violation.** The worker shipped raw hex (`text-[#5FA8E0]/50`, `text-[#5e708a]`) in the new OUTLOOK line of `ffi-player-intel-card.tsx` -- inconsistent with `draft-board-table.tsx`, which used tokens correctly. Fix: converted to inline-style `var(--ffi-blue)` (opacity 0.5) and `var(--ffi-ink-3)`.

**Proof (pasted).**
- Gate: `type-check` 0 errors; `test:run` **607/607** (7 new enrichment tests + 2 leaderboard fixtures updated); `eslint` exit 0 on the fixed file; `build` `Compiled successfully in 4.8s`.
- Live DOM (dev :3003, DEV_MODE, league `0d2914f1`, dataset row `8112f3e6`): League Intel panel renders on leaderboard + board; player intel card shows the merged `land / room / durability / band` line.
- Republished dataset verified: `durabilityPriceFactor` present on all 1000 players, values spanning 0.75 -> 1.0.
- Screenshots NOT captured -- the computer/screenshot tool times out in this session ("Browser pane not displayed"); all live proof is via text DOM tools. Joe can view the panels on his phone via the running dev server.
- Commit `1cfea82`, pushed to `master`.

---

## 2026-08-21 / W1 -- Strategy Leaderboard screen (the engine's rankings, in the app)

**Class:** output (Design + QA lenses). Second W-track session. Orchestrated: an Opus orchestrator dispatched a Sonnet worker to build, then an independent adversarial Sonnet validator; the orchestrator fixed the validator's findings and committed. Reads the W0 dataset snapshot -- zero recompute, $0.

**Design.** New route `src/app/(app)/prep/leaderboard/{page,client}.tsx` + a "Leaderboard" destination row on the `/prep` hub (D2 pattern). Every anchor strategy from the published dataset, ranked descending by its real 400-run `sim.grade.meanWins`. Expandable rows (Joe's locked rule, not a card grid): collapsed shows rank + name + projected record + avg wins; expanded shows why-it-wins (`proposal.reasoning`), the record hero (reused `SimRecordHero`), key targets with solver + durability-adjusted prices, and a swipeable sample-roster carousel (reused `SimRosterCarousel`). A "Stud combos" section renders `dataset.studCombos` the same way. SHIELD throughout: `Nameplate`/`PageTitle`/`FFISectionHeader`, zero inline hex. New pure module `src/lib/research/leaderboard.ts` (`rankStrategies` + `resolveTargetPrice`) with 10 unit tests; `resolveTargetPrice` returns an honest all-null `unknown` shape rather than fabricating a price when a target has no data.

**Two defects the validator caught, both fixed before commit:**
- **`/prep` hub crash (regression from W0).** `GET /api/research` only excluded `kind:'sim'`, so once a `kind:'dataset'` row was published it could be picked as the hub's "latest completed run"; its payload has no `analysis` key and `prep/page.tsx` read `.analysis.targets` unguarded -> error boundary on the whole Research hub. Fix: (1) `src/app/api/research/route.ts` filter now excludes `sim` + `dataset` + `plan` (future W3) while staying null-tolerant for legacy research rows -- `kind IS NULL OR (kind != sim AND kind != dataset AND kind != plan)`; (2) defensive `?.analysis?.` optional chaining in `prep/page.tsx` so a stray non-research row can never crash the hub.
- **Stud-combo shared expand state.** Combo rows keyed on `patternKey` alone, but there are 3 combos per pattern -> duplicate React keys, so expanding one expanded its siblings. Fix: key + expand-identity now `${patternKey}::${anchorNames.join('|')}`.

**Proof (pasted).**
- Gate: `type-check` 0 errors; `test:run` **601/601** (10 new leaderboard tests); `eslint` exit 0 on all edited files; `build` compiled, `/prep/leaderboard` a static route (58/58 pages).
- Live DOM (dev :3003, DEV_MODE, real dataset row `7f63f239`): leaderboard renders all 26 strategies ranked 9.5 -> 9.0 avg wins; validator confirmed `Christian McCaffrey $60 · room $67 · 0.89x durability` and stud combo `Jahmyr Gibbs + Christian McCaffrey 10-4`.
- Bug 1 fixed: `GET /api/research?leagueId=...` -> 200, `runs:0`, dataset row excluded; `/prep` renders clean (no error boundary), "Leaderboard" hub row present.
- Bug 2 fixed: 0 duplicate-key console warnings (validator saw 6).

---

## 2026-08-21 / W0 -- dataset contract + storage seam (the headless engine can now reach the app)

**Class:** shared + pipeline (Architecture + QA + Security lenses). First W-track session (Joe-approved 2026-08-21): the HEADLESS ENGINE track produced `research-output/dataset.json` for in-chat interrogation but the app never read it -- the app can only read Supabase, not the filesystem, and on Vercel on-disk reads are out entirely. W0 builds the seam so the rich 400-run snapshot (every strategy sim, stud combo, enriched player, league intel) becomes readable in the app with zero recompute.

**Design.** One shared contract, three consumers, no drift:
- **`src/lib/research/dataset-types.ts`** -- `ResearchDataset` (+ `DatasetMeta`/`DatasetStrategy`/`DatasetStudCombo`/`DatasetLeagueIntel`/`EnrichedPlayer`/`ResearchDatasetRun`) with every field referencing the engine's OWN return types (`StrategyProposal`, `PersistedSimResults`, `PlayerTag`, `PlayerRecommendation`, `CalibratedValueRange`, `PositionInflation`, `OwnerLean`). `RESEARCH_DATASET_KIND='dataset'` mirrors `SIM_RUN_KIND='sim'` so both live in `research_runs` discriminated by `strategy_settings->>kind` -- **no migration**.
- **`scripts/research-run.ts`** -- typed its `dataset` const as `ResearchDataset`, binding the writer to the contract (the file and the type can no longer diverge). Only type annotations changed; output byte-identical.
- **`scripts/research-publish.ts` + `research:publish` npm script** -- reads `dataset.json`, validates the spine (refuses an empty/malformed snapshot), resolves the active league scoped to `DEV_USER_ID`, INSERTs one `research_runs` row kind:'dataset' with an EXPLICIT `user_id` (service-role, RLS bypassed like `research-run.ts`), prints payload size. Newest-wins, non-destructive (re-publish supersedes via the reader's `order desc limit 1`, no delete).
- **`GET /api/research-dataset`** -- copies the `getClient()` (service in DEV_MODE, cookie-scoped otherwise) + `requireUser()` + `strategy_settings->>kind` filter pattern from `api/sim-runs/[id]/route.ts` verbatim. Returns the newest dataset row for a league (or `run:null` = empty state, not an error). `?meta=1` returns a cheap freshness envelope (id/generatedAt/playerCount/strategyCount/bytes) without pulling the megabyte body.
- **`src/hooks/use-research-dataset.ts`** -- client hook, full + meta modes, `isEmpty` state; retired the dead `use-research.ts` TODO stub (confirmed zero imports).

**Proof (pasted).**
- `npm run research:publish` -> `dataset ok: 1000 players, 26 strategies, 18 combos ... (1.27 MB)`; attached to league "Nasties 2026" owner `1fe61f29-...`; `published dataset row 7f63f239-8b17-44db-b255-343d28311551`.
- `GET /api/research-dataset?leagueId=...&meta=1` -> `{playerCount:1000, strategyCount:26, bytes:1333301}`.
- `GET /api/research-dataset?leagueId=...` (full, dev server :3003, DEV_MODE) -> 1,333,508 bytes; through the DB round-trip McCaffrey's durability-adjusted target price is intact: **`{price:60, room:67, durabilityFactor:0.894}`** in "Robust RB (RB-RB), heavy anchors"; 1000 players / 26 strategies / 18 studCombos / leagueIntel positions QB,RB,TE,WR,DEF.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` **591/591**. `npm run lint` 0 findings on the 4 new files (3 pre-existing warnings on `research-run.ts` unchanged; 42 pre-existing errors elsewhere untouched -- not in scope). No em/en-dashes. $0 (no Claude call; own-infra Supabase read/write only).

---

## 2026-08-20 / Durability-adjusted target price -- the injury signal now moves the pay-up number, not just the record

**Class:** pipeline (Architecture + QA lenses). Closes the OPEN GAP from the durability-join fix earlier today. Joe: "yes, build the durability-adjusted target price." Before this, the sim penalized a fragile roster's projected RECORD (McCaffrey's real 0.8462 games-played rate now hits the sim), but `target-pricing.ts` still anchored the pay-up number purely on room price -- so the tool said "don't build around McCaffrey" out of one side and "$67 is a fair price" out of the other. Two unreconciled signals. This wires the measured durability into the price.

**Design.** New `durabilityPriceFactor(sleeperId, position, model)` in `sim-grade.ts` (single source of the durability-to-price logic, reuses the real `DEFAULT_RISK_MODEL`): `factor = clamp(gpRate / positionBaseline, 0.75, 1.0)`. Three deliberate choices: (1) **relative to the position baseline, not to a perfect 17 games** -- the market already prices in that RBs miss time, so discounting vs the RB norm avoids double-counting the risk that's already in room price; (2) **only ever discounts, never inflates** (hard-capped at 1.0) -- a durable player does not get a target-price premium, he just avoids the haircut; (3) **DEF and unmeasured players (rookies, model-absent) return 1.0** -- no change, they ride the room price exactly as before. McCaffrey: 0.8462 / 0.9466 = 0.894x -> ~11% haircut.

- **Applied in `target-pricing.ts`:** `TargetPricingPlayer` gains optional `durabilityFactor`; `assignTargetPrices` multiplies each key_target's room-price anchor by the factor (via a `durabilityMultiplier` clamp that ignores absent/>=1 factors), and the drop-cheapest completion loop now compares the discounted price. `baseValue` on the output preserves the un-adjusted room anchor so the report can show both; walk-up-to-win is computed off the discounted price. The no-durability path is byte-identical (factor 1 = no-op), which is why all 21 pre-existing target-pricing tests passed unchanged.
- **Threaded at all 3 call sites** that feed players into the pricer: `generate.ts` (`attachTargetPricingAndInserts`), `research.ts` (`priceProposals`), `room-target-pricing.ts` (the live-room My Team panel). Each maps `durabilityFactor: durabilityPriceFactor(p.sleeperId, p.position)` onto the player before pricing, so prep, the Claude path, and the live room all share one haircut.
- **Report renderer (`scripts/research-run.ts`)** now shows the discount inline: `Christian McCaffrey $60 (room $67, 0.89x durability) (win by $66)`.

**Proof (pasted, regenerated `research-output/report.md`).**
- McCaffrey target price dropped from **$67 -> $60** (room $67, 0.89x durability), walk-up-to-win $74 -> $66. The sim and the price sheet now agree: fragile veteran, pay less.
- Same run, other measured haircuts surfaced correctly: Davante Adams **$13 -> $12** (0.94x), Sam LaPorta **$7 -> $6** (0.93x). Durable/unmeasured targets (Gibbs $76, Luther Burden III $14, Jalen Hurts $13) unchanged -- no premium, no phantom discount.

**Tests (9 new).** `sim-grade.test.ts` (5): McCaffrey `durabilityPriceFactor` ~0.89x; returns 1 for unmeasured / undefined / null id; returns 1 for DEF; never inflates (at/above baseline -> 1.0); floors at `DURABILITY_PRICE_FLOOR` (0.75) for a catastrophic 0.40 gpRate. `target-pricing.test.ts` (4): factor 0.9 haircuts a $60 RB to price 54 + walk-up round(54*1.1) while `baseValue` keeps room 60; no-factor path leaves price==baseValue and factor undefined; factor>=1 never inflates; the haircut still yields a budget-completable roster.

**Gate:** `npm run type-check` 0 errors. `npx vitest run` **591/591** (was 582; +9). `npx eslint` on all 8 touched files: 0 errors (3 pre-existing warnings in `research-run.ts`, untouched by this change). `npm run research:run` regenerated `dataset.json` + `report.md`. `npm run research:verify` **250 passed / 1 failed** -- the one FAIL is the same pre-existing environmental "cache was not stale" check (needs `npm run data:pull`, unrelated). Deterministic. $0 (no Claude call). No em/en-dashes.

---

## 2026-08-20 / Risk-model durability join was silently dead -- every player rode the position baseline

**Class:** bugfix + pipeline (Architecture + QA lenses). Joe's driving question: "i highly question paying over $70 for an aging injury risk like mccaffrey. am i overthinking it?" Investigating that surfaced a real bug, then Joe: "fix it."

**Root cause.** `risk-model.json` durability is keyed by **Sleeper player id** (McCaffrey = "4034"). But board/sim players carry a **Supabase UUID** as `id`. `applyRiskModel` looked up `model.durability.byPlayer[p.id]` -- UUID against a Sleeper-keyed map -- so it **missed for EVERY player** and everyone silently fell back to the position durability baseline (RB 0.9466). The measured per-player layer (the whole point of the risk model: McCaffrey's real 0.8462 games-played rate, ~2.6 missed games of 17) was computed, shipped in the JSON, and never once read. The sim was blind to real injury history and under-penalized fragile veterans.

- **Fix (`sim-grade.ts` `applyRiskModel`):** look up on the real join key -- `model.durability.byPlayer[p.sleeperId ?? p.id]`. DEF short-circuits to 1. Rookies / players the model has never seen correctly fall to `baseline[pos]` (that fallback was always right; it was just firing for 100% of players instead of the few it should).
- **Threaded the Sleeper id end to end.** `external_id` (the Sleeper id for Sleeper-backed players, written by the cache upsert) now rides from cache to sim: `CachedPlayer.external_id` (interface made honest -- column was always selected, never typed) -> `Player.sleeperId` (`convert.ts` maps `external_id`) -> `BoardPlayer.sleeperId` (`solver-bridge.ts`) -> `SimWonPlayer.sleeperId` (`sim-engine.ts`). Six files, all additive optional fields, no behavior change anywhere except the now-live join.
- **Also fixed a latent rounding artifact in `summarizeGrades`:** losses are defined as `games - wins` with strict `>` (no ties), so wins+losses must equal `games` exactly. The summary rounded `meanWins` and `meanLosses` independently, so the persisted pair could read 9.4 + 4.7 = 14.1. Now `meanLosses = round(games - meanWins)` off the same rounded mean, so the pair always sums to `games`. Fixed two `research:verify` FAILs at the root.

**Proof (pasted).**
- Join now resolves: `DEFAULT_RISK_MODEL.durability.byPlayer['4034'].gpRate` = **0.8462** (< RB baseline 0.9466). On the live 240-player board the join hits **124/240** real Sleeper ids (was **0**); the ~116 misses are legitimately rookies (<2 real-role seasons, e.g. Jeanty) or players absent from the 593-entry model, which correctly ride the baseline.
- Regression test (`sim-grade.test.ts`, new describe block): identical builds except one anchor is McCaffrey (fragile, 0.8462) vs a 100%-durable RB, 400 seeds -- the durable build wins **~125 more games** (1275 vs 1150). Before the fix that gap was **0** (both got the RB baseline).
- Product output flip (`research-output/report.md`): same Gibbs + Burden core, **Gibbs + Bijan Robinson (100% durable) = 9.8-4.2** now grades **above** **Gibbs + Christian McCaffrey (84.6%) = 9.5-4.5**. Pre-fix both got the RB baseline and graded near-identical (McCaffrey often nosed ahead on raw projection). The durability signal is now visible in the leaderboard.

**Tests (6 new):** `sim-grade.test.ts` -- byPlayer['4034'] resolves and is below RB baseline; 400-seed fragile-vs-durable win-gap > 50. `convert.test.ts` -- `external_id` "4034" maps to `sleeperId` while UUID stays on `id`; null `external_id` leaves `sleeperId` undefined; added the now-required `external_id` to the fixture; fixed a pre-existing em-dash in a describe title (touched-file-clean rule).

**Gate:** `npm run type-check` 0 errors. `npx vitest run` **582/582** (was 578; +4 net). `npx eslint` on all touched files: 0 errors. `npm run research:run` regenerated `dataset.json` + `report.md`. `npm run research:verify` **250 passed / 1 failed** -- the one FAIL is the pre-existing environmental "cache was not stale" check (cacheStale=true at HEAD too; needs `npm run data:pull`, unrelated to this fix). Deterministic. $0 (no Claude call). No em/en-dashes.

---

## 2026-08-20 / Specific stud combos -- name the exact players, not just the shape

**Class:** pipeline (Architecture + QA lenses). Follow-on to the 26-strategy sweep below. Joe: "add the specific stud combos tier." The sweep answers WHICH SHAPE wins (RB-RB vs WR-WR vs ...). This tier answers WHICH EXACT STUDS to buy inside each shape (Gibbs+McCaffrey vs Gibbs+Bijan vs Nacua+JSN vs ...), so the leaderboard names the pair/trio to target on draft night, not an abstract pattern.

- **New engine (`src/lib/research/strategy/generate.ts`):** `enumerateStudCombos` walks each anchor pattern, takes the top-K studs (default 4) by ceiling at every required position, forms the distinct concrete player sets (`studComboSets`, order-independent dedupe), and forces each set into a completable roster via new `fillForcedPlan` -- the named anchors are pinned into the paid core, the rest fills cheap + spread through the shared `selectField` helper (extracted from `patternPolicy` so the sweep and the combo fill use identical field logic). `fillForcedPlan` enforces the same $1-per-open-slot completion invariant as `fillPlan`, so a combo whose named studs cannot co-exist under $200 at room price returns null and is dropped. Keeps the best `combosPerPattern` (default 3) per pattern by anchor ceiling, dedupes by concrete roster across patterns. Pure, deterministic, $0. New `combosFromPool` wrapper attaches the same solver-fit target pricing + inserts (`attachTargetPricingAndInserts`), so combos flow through the sim + report on the existing contract.
- **Orchestrator (`scripts/research-run.ts`):** after the 26-pattern sweep, enumerates the combos and sim-grades each once (risk model on, 400 runs) against the 11 replicated Nasties owners -- one grade, not the before/after pair, to keep the extra batch quick. Writes a new `studCombos` block to `dataset.json` and a "Specific stud combos" section to `report.md`: an overall top-12 table plus a per-pattern breakout, each combo showing its projected record, mean starter points, and target prices for the named studs.
- **Proof:** `npm run research:run` produced **18 specific combos** across 6 patterns. Overall top pairs: **Nacua+JSN (WR-WR) 9.9-4.1**, **Gibbs+Nacua (RB-WR) 9.9-4.1**, **Gibbs+McCaffrey (RB-RB) 9.8-4.2** (best starter pts 1974). Honest finding surfaced in the report: **Triple WR, Double RB+WR, and Hero RB produced ZERO affordable combos** -- the top WRs cost $64/$72/$76/$79 at room price, so any three elite studs at those positions blow the $200 budget before a bench reserve. That infeasibility is a real strategic result (the room prices those shapes out), now stated in the report rather than silently dropped. The combos that DO fit lean on a cheaper third piece (a $28-36 elite QB, a $35 elite TE) to afford two elite skill players.
- **Tests (`src/lib/research/strategy/generate.test.ts`, 8 new):** every combo named by its specific studs (all real board players, name = players + pattern label, studs appear in key_targets); every combo roster completable (alloc sums to 100, bench reserve > 0); `combosPerPattern` cap respected and no repeated anchor set within a pattern; balanced (no-anchor) pattern yields no combo; deterministic byte-identical reruns; empty on empty board / non-positive budget; wrapper aligns priced proposals/inserts by index and returns empty for snake.

**Gate:** `npm run type-check` 0 errors. `npx vitest run` **578/578** (was 570; +8 combo tests). `npx eslint` on the 3 touched files: 0 errors (3 pre-existing warnings in untouched parts of `research-run.ts`). Deterministic. $0 (Sleeper-derived data + local compute, no Claude call). No em/en-dashes.

---

## 2026-08-20 / Strategy sweep -- 26 distinct strategies instead of 3 archetype buckets

**Class:** pipeline (Architecture + QA lenses). Joe pushed back: "you only looked at three strategies? there are TONS of possibilities." He was right. The old prep path (`generateStrategiesFromPool`) emits one strategy per distinct budget-shape POLICY that survives the board gate, then dedupes by archetype label -- on this board that collapsed to 3 (Stars & Scrubs, Studs & Duds, Balanced). It sampled the SHAPE space, never the concrete anchor-pattern space (RB-RB vs WR-WR vs hero-RB vs zero-RB vs elite-QB vs elite-TE, at different budget splits).

- **New engine (`src/lib/research/strategy/generate.ts`):** `sweepAnchorStrategies` runs a grid of 10 anchor patterns (RB-RB, WR-WR, RB-WR, triple-WR, double-RB+WR, hero-RB, zero-RB, elite-QB, elite-TE, balanced) x 3 budget splits (heavy 0.72 / even 0.55 / light 0.42 of budget on the paid studs). Each cell is solved best-available: a per-pattern `patternPolicy` buys the highest-ceiling player at each required position under the split cap, then fills the rest of the roster cheap (8%-of-budget field cap) so the split holds. Reuses the existing `fillPlan` completion invariant, so every roster is completable within $200. Results dedupe by the concrete player set (identical rosters collapse to the first pattern that built them), so the output is the genuinely distinct ways to draft this board. Pure, deterministic, $0.
- **Shared tail refactor:** extracted `attachTargetPricingAndInserts` so both `generateStrategiesFromPool` (unchanged archetype path, still used by the live route) and the new `sweepStrategiesFromPool` (prep path) attach identical solver-fit target pricing + inserts. Same `StrategyResearchResult` contract, so the sweep flows through the sim + report untouched.
- **Orchestrator (`scripts/research-run.ts`):** prep now calls `sweepStrategiesFromPool`. Each swept strategy is sim-graded twice (risk on + healthy) exactly as before.
- **Proof:** `npm run research:run` produced **26 distinct strategies** (was 3), each with a Monte-Carlo record over 400 runs vs the 11 replicated Nasties owners. Honest finding: with the full sweep the projected records cluster tight -- every one of the 26 lands **9.4 to 9.8 wins**, a ~0.4-win spread. Heavy-anchor variants edge the top (Robust RB / RB-WR / Double-RB+WR / WR-WR / Triple-WR / Hero-RB heavy all 9.8-4.2); Balanced-no-anchor and light Elite-TE/QB trail at 9.4-4.6. Risk-adjusted winner = healthy-basis winner = Robust RB (RB-RB) heavy; the top pattern is unchanged once risk is priced in. Takeaway: on this board WHICH anchor pattern you pick moves the record far less than the 3-strategy view implied -- executing any sound anchor plan is worth ~0.4 wins over drafting balanced, and the pattern label barely matters beyond that.
- **Tests (`src/lib/research/strategy/generate.test.ts`, 9 new):** sweep beats the archetype count and yields >=5 distinct shapes; unique names; every roster completable (alloc sums to 100, bench reserve > 0); all targets are real board players; WR-WR anchors WR over RB and Zero-RB keeps RB off its paid anchors; deterministic (byte-identical reruns); empty on empty board / non-positive budget; wrapper attaches target pricing + matching inserts and returns empty for snake.

**Gate:** `npm run type-check` 0 errors. `npx vitest run` **570/570** (was 561; +9 sweep tests). `npx eslint` on the 3 touched files: 0 errors (3 pre-existing warnings in untouched parts of `research-run.ts`). Deterministic. $0 (Sleeper-derived data + local compute, no Claude call). No em/en-dashes.

---

## 2026-08-20 / Risk-model derive is now self-sufficient (pulls Sleeper directly)

**Class:** infra (Ops + Security lenses). Closes the follow-up flagged when the risk model shipped: `scripts/derive-risk-model.mjs` read the ephemeral session scratchpad, so the runtime `risk-model.json` was permanent but could not be regenerated once that scratchpad vanished. The derive script now pulls its own data.

- **Change (`scripts/derive-risk-model.mjs`):** new `loadJson(name, url)` fetches the raw actuals straight from the Sleeper API (free, keyless, no auth, $0) on a cache miss and stores each response under `scripts/.sleeper-cache/` (gitignored) so re-runs are instant and offline. Load order: repo cache -> legacy scratchpad (migrated forward if present) -> live fetch. 3-try backoff + 120ms politeness delay across the 211 calls (1 player map + 210 weekly files), well under Sleeper's rate limit. Portable `--fresh` argv flag (or `DERIVE_FRESH=1`) ignores every local cache and forces a fresh re-pull.
- **npm scripts (`package.json`):** `risk:derive` (cache-first) and `risk:derive:fresh` (`--fresh`, re-pulls Sleeper). The argv flag means the fresh script runs on Windows with no `cross-env` dependency.
- **Gitignore:** `/scripts/.sleeper-cache/` (re-pullable, never committed).
- **Proof:** a full cold pull (`npm run risk:derive:fresh`, all 211 endpoints re-fetched from Sleeper with the cache present) reproduces the committed `src/data/risk-model.json` byte-for-byte -- sha256 `dd42110b...`, empty `git diff`. Spot checks identical: McCaffrey gpRate 0.846 over 8 seasons, Derrick Henry 0.957, Josh Allen 0.962, RB tier-1 bust 53%. Deterministic and self-contained.

**Gate:** cold re-pull reproduces the model exactly (hash match). $0 (Sleeper free/keyless). No em/en-dashes. `risk-model.json` unchanged, so only the script, `package.json`, and `.gitignore` moved.

---

## 2026-08-20 / Measured risk model wired into the sim -- real durability + bust/breakout by tier

**Class:** pipeline (Architecture + QA lenses). Supersedes the flat injury layer below with a data-driven model derived from 15 seasons of Sleeper weekly PPR actuals (`scripts/derive-risk-model.mjs` -> `src/data/risk-model.json`, committed 693e6cb). Answers Joe's four questions honestly: risk is now PER-PLAYER (not flat), MEASURED (not assumed), and it models bust AND breakout, not just injury. McCaffrey carries his real games-played history; an elite RB carries the real 52.8% bust rate its tier has shown.

- **Two separated layers (no double-count):** (1) DURABILITY -- per-player weekly OUT rate from real games played (`gpRate` over >=2 real seasons; fallback = position baseline QB .952 / RB .947 / WR .973 / TE .942 / DEF 1). (2) OUTCOME -- a season-level per-game multiplier drawn from the real empirical CDF for the player's prior-year positional tier (tiers 1-3, 4-6, 7-12, 13-24, 25-48), so performance variance is separate from availability.
- **Change (`src/lib/draft/sim-grade.ts`):** new `RiskModel`/`DEFAULT_RISK_MODEL` (imports the JSON), `applyRiskModel` (draws one outcome multiplier per player off a seed-salted PRNG `OUTCOME_SEED_SALT` so the weekly rng stream is undisturbed and determinism holds), `weeklyAvailablePointsByPlayer`, and tier helpers (`tierOf`, `tierCdf` walks to the nearest thick tier, `drawMultiplier` interpolates the 21-point ladder, `positionalRanks`). `gradeRun` priority: risk supersedes flat injury supersedes legacy. Bust/breakout is applied to OPPONENTS too, so Joe's projected record is not unfairly biased down. `myRank` stays on raw healthy points (structural label); only the record moves.
- **Wired into the real product (`src/lib/draft/sim-results.ts`):** `buildSimSummary` now defaults `risk` to `DEFAULT_RISK_MODEL` (opt-out via `{ risk: false }`) in place of the flat injury default, so the headless runner and the live Simulate screen both grade with measured risk on.
- **Proof (`src/lib/draft/__tests__/sim-grade.test.ts`, 3 new tests):** (1) two stacks built to EQUAL healthy best-lineup points (750) -- one two-elite-RB, one elite QB+WR -- so tier is the only variable; (2) determinism holds with the risk model on; (3) across 300 fixed seeds vs identical opponents, the RB stack (measured 52.8% elite-bust) wins **485 fewer** games than the QB+WR stack (22.9% bust): 2606 vs 3091, ~8.7 vs 10.3 wins/season on identical paper strength. The elite-RB cliff the flat layer could not see now shows up in the graded record.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` **561/561** (was 558; +3 risk tests). `npx eslint` on the 3 touched files exit 0 (43 repo-wide errors all pre-existing in `research/`/`supabase/`/`sources/`, none in touched files). Deterministic. $0 (Sleeper free/keyless, local compute). No em/en-dashes. Follow-up flagged: `derive-risk-model.mjs` reads the ephemeral scratchpad cache; regeneration needs a free Sleeper re-pull step (the runtime `risk-model.json` is permanent and versioned).

---

## 2026-08-20 / Injury/availability layer -- concentrated rosters now carry real weekly bust risk

**Class:** pipeline (Architecture + QA lenses). Joe's finding from the as-drafted backtest: the sim declared "spend on two top guys" the overwhelming winner because a graded roster's studs never missed a game. Real leagues punish thin benches when a stud sits. This adds a per-player weekly availability draw so the projected RECORD reflects depth, closing the gap the backtest exposed (in 13 clean Nasties years, concentration finishes slightly WORSE, corr +0.123).

- **Change (`src/lib/draft/sim-grade.ts`):** new `WEEKLY_INJURY_OUT_RATE` (QB .06 / RB .12 / WR .09 / TE .10 / DEF .00), `InjuryModel`/`DEFAULT_INJURY_MODEL`, and `weeklyAvailablePoints()` -- each week every player is independently OUT at his position's rate (one rng draw per player, roster order), OUT players are dropped from the pool, and the normal best-legal-lineup optimizer refills every slot from who's left. The injured man's slot falls to the next-best AVAILABLE body: a concentrated roster's next man up is a $1 scrub (craters), a deep roster barely dips. `gradeRun` takes a new 5th `opts: GradeRunOptions` arg; `myRank` stays HEALTHY-roster season points (structural clustering label), only the projected record moves.
- **Byte-identical legacy path:** with `injury` null/false, `gradeRun` uses the fixed healthy per-week mean and consumes ZERO extra rng, so the draw sequence is unchanged -- the 20 pre-existing sim tests pass without edits.
- **Wired into the real product (`src/lib/draft/sim-results.ts`):** `buildSimSummary` defaults `injury` to `DEFAULT_INJURY_MODEL` (opt-out via `{ injury: false }`), so both the headless runner and the live Simulate screen now grade with injury risk on.
- **Proof (`src/lib/draft/__tests__/sim-grade.test.ts`, 3 new tests):** (1) two rosters built to EQUAL healthy best-lineup points (618) -- one concentrated (two studs + $1 bench), one deep -- so depth is the only variable; (2) determinism holds with the model on (same seed => same record); (3) across 300 fixed seeds vs identical opponents, the concentrated roster's injury win-penalty exceeds the deep roster's by >100 wins. The asymmetry is real and stable.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` **558/558** (was 555; +3 injury tests). `npx eslint` on the two touched source files exit 0 (43 repo-wide errors are all pre-existing in `research/`/`supabase/`/`sources/`, none in touched files). Deterministic. $0. No em/en-dashes.

---

## 2026-08-20 / Sim price cap -- no clearing price above the room's all-time high

**Class:** pipeline (Architecture + QA lenses). Joe: "Nobody is going above $90 for a player in my league. Highest EVER paid was $85 (McCaffrey 2024), next $81, a few $80s, tier-1 typically mid/low $70s." Even after the room anchor, contested studs still cleared ~$93 in-sim because the high-lean tail (`OPPONENT_LEAN_STRENGTH = 0.5`, `MAX_LEAN 2.5`) plus second-price ties pushed winning bids past $90. Joe approved: **$88 hard cap + lean 0.35**.

- **Change (`src/lib/draft/sim-engine.ts`):** (1) `OPPONENT_LEAN_STRENGTH` **0.5 -> 0.35** so a hungry owner (lean 1.5) now bids ~1.18x room instead of 1.25x, landing the tail in the low-to-mid $80s naturally rather than getting slammed into the cap. (2) New `LEAGUE_MAX_CLEAR = 88` applied at the clearing step: `price = min(top, max(1, second + 1), LEAGUE_MAX_CLEAR)`. $88 is a hair above the ledger's all-time high ($85), so $85 stays reachable but no run ever invents a $90+ price the Nasties have never paid.
- **Proof (regenerated `research-output/dataset.json`, real 2026 cache, 11 real ledger owners, 400 runs/strategy):** the GLOBAL max of every price/clearing field in the entire dataset is exactly **$88** -- zero players above $90. Joe's targeted anchors land at the cap (Gibbs $88, Nacua $88 -- `avgPrice` is exactly 88 across ~317 lands, so the cap binds on every win, confirming pre-cap bids ran past $90), McCaffrey/Bijan $86, Chase $75, everyone else well below.
- **Known tension (surfaced to Joe, not hidden):** the two most-contested anchors sit AT the $88 cap, $3 above the $85 all-time high. That is the cap clipping genuine $90+ tails exactly as specified. If Joe wants anchors in the low $80s instead, the lever is a lower cap ($85) or trimming the me-seat target boost; he chose $88 knowingly.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` **555/555** (LR-1 lean-split still passes -- direction survives the strength trim; determinism tests re-baseline on the same seed). `npx eslint src/lib/draft/sim-engine.ts` exit 0. `research-output/` regenerated. Deterministic (SIM_SEED=42). No em/en-dashes.

---

## 2026-08-20 / Wire room-price model into the LIVE app (both gaps closed)

**Class:** pipeline (Architecture + QA lenses). The two fixes below (target prices + sim field on room price) were proven in the HEADLESS runner but were **inert in the actual app**. Joe's instruction: "make sure what was done will work inside the actual app itself when I go back to it." An in-app audit found two wiring gaps; both are now closed so the live Strategy and Simulate screens show the same room-anchored numbers as the headless report.

- **Gap 1 -- live Strategy route priced off NATIONAL value.** The headless path passes real `Player[]` (which carry `expectedRoomPrice`), but the live `/api/strategies/propose` route builds players via `cacheRowToConsensusPlayer` -> `ConsensusPlayer[]`, and `convert.ts` is the ONLY module that ever populates `expectedRoomPrice`. So in-app, `assignTargetPrices` fell back to `consensusAuctionValue` and told Joe to bid the national number ($96 Gibbs) instead of the room price ($76).
  - **Fix (`src/lib/research/strategy/generate.ts`):** `generateStrategiesFromPool` now derives room price from `priceBoard` (which already computes `expectedCost = expectedRoomPrice(pos, posRank)` for every player) and feeds THAT into `assignTargetPrices`, instead of depending on the input objects to carry the field. `priceBoard` is now the single source of truth for room price, so BOTH paths (headless `Player[]` and live `ConsensusPlayer[]`) are room-anchored and identical.
  - **Proof (live-shaped input: `ConsensusPlayer` with NO `expectedRoomPrice`):** Gibbs target **$76** (room RB1), `baseValue: 76`, walk-up $84 -- NOT $96 (national). Bijan **$70** (room RB2), walk-up $77. Matches the verified headless numbers exactly, so the headless output did not regress (both read the same room curve).
- **Gap 2 -- live Simulate screen ran opponents off NATIONAL ceiling.** `src/app/(app)/prep/simulate/client.tsx` called `buildSimSummary(...)` WITHOUT `opponentProfiles`, so every opponent fell through to the generic national-ceiling bid branch -- the room-price sim anchor (committed `a782013`) was doing nothing in-app.
  - **Fix:** the live client now calls `buildOpponentProfiles({ count: numManagers - 1, meOwner: 'Rasar' })` and passes `opponentProfiles` into `buildSimSummary`, identical to the headless `research-run.ts`. Same engine + same room-priced board (`cacheToPlayers` already carries room prices) + same profiles -> the live sim now clears studs off the room curve (the A/B-proven Gibbs $111->$93 drop applies in-app).
- **Result:** the live Strategy target prices, the live Simulate clearing prices, and the headless `report.md` all price every stud off the same 4-draft Nasties room curve. What Joe sees when he opens the app matches what the headless engine produces.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` **555/555** (no test changes needed -- the wiring reuses already-tested engine functions; `generate.ts` still passes the same `TargetPricingPlayer` contract). Live-input proof pasted above (non-committed diagnostic). Deterministic. No em/en-dashes. **Still open (Joe's next tweak):** studs still clear ~$93 in-sim, above the real-room ceiling (all-time high $85 McCaffrey 2024, next $81, tier-1 typically mid/low $70s) -- price-cap recalibration is the next task.

---

## 2026-08-20 / Headless engine -- sim field anchored on room price (Joe-approved)

**Class:** pipeline (Architecture + QA lenses). Direct follow-on to the target-pricing fix below. Joe: "make sure this sim/model is going to run adversarial strategies against me... I will NEVER get a star RB for $53." The sim WAS adversarial (11 real ledger owners, second-price clearing, no passive bots) but it priced studs off national ceiling, so contested studs cleared ABOVE his room ledger -- the same national-vs-room split as the target-pricing bug, on the opponent-bid side. Joe approved aligning the field to room price.

- **Change (`src/lib/draft/sim-engine.ts`):** the profiled-opponent valuation anchor swapped from `nominated.ceiling` (national upside) to `nominated.expectedCost` (= `expectedRoomPrice ?? consensusAuctionValue`, the ledger's room price for that positional rank). The softened lean tilt (`OPPONENT_LEAN_STRENGTH = 0.5`) is unchanged, so a neutral owner (lean 1.0) now bids **exactly** the room price and pos-hungry/averse owners tilt a bounded amount around it. This is the model `league-opponents.ts`'s own header already documented (`expectedCost x vsRoom`) -- the code finally matches its stated intent. The me-seat and unprofiled/generic opponents still anchor on national ceiling (me anchors high on purpose: a stud Joe targets costs him the room's going rate to WIN it -- the walk-up -- rather than sleeping on it). Three doc comments + the `noisePct` doc updated to describe the room anchor.
- **A/B proof (non-committed diagnostic, same seed + real ledger profiles, ceiling-anchor vs room-anchor, field-wide average clearing price across all 12 seats x 400 runs):** Jahmyr Gibbs **$111 -> $93**, Christian McCaffrey **$97 -> $85**, Bijan Robinson **$92 -> $82**, Puka Nacua **$101 -> $94**. Correctly bidirectional: for players Joe's room historically OVERPAYS vs national value (CeeDee Lamb, room $57 > national $49), the sim now clears him HIGHER (**$55 -> $63**), because room-anchoring makes the field pay what the Nasties actually pay, not the lower national number.
- **Result:** the target-price column, the 4-draft ledger, and the Monte-Carlo sim now price every stud off the same room curve. The simulated market matches Joe's real room instead of a harsher national-ceiling market.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` **555/555** (the LR-1 lean-split test is byte-neutral to the swap -- its board deliberately sets `expectedCost == ceiling` so lean, not price asymmetry, drives the assertion; determinism tests unaffected). `npx eslint src/lib/draft/sim-engine.ts` exit 0. `npm run research:verify` 44/44. `research-output/dataset.json` + `report.md` regenerated. Deterministic (SIM_SEED=42). No em/en-dashes.

---

## 2026-08-20 / Headless engine -- target prices anchored on real room prices (Joe-caught bug)

**Class:** pipeline (Architecture + QA lenses). Joe challenged the report: "I will NEVER get a star RB for $53 or a star WR for $39 in my league." He was right.

- **Root cause (diagnosed with his real numbers):** `assignTargetPrices` computed each key target's price from the NATIONAL `consensusAuctionValue`, tilted by an archetype "emphasis" multiplier, then scaled the whole set DOWN to force five studs to fit $200. It never read `expectedRoomPrice`. So the anchor SELECTION step spent the real room price ($76 for Gibbs) but the REPORTED target told Joe to bid a fictional lowball ($56) -- internally inconsistent, and a number that would lose the player.
- **Fix (`src/lib/research/strategy/target-pricing.ts`):** a target's price is now its **expected room price** (`expectedRoomPrice`, from the 4-draft Nasties ledger), with a national-value fallback only when the ledger has no room price. Added a **walk-up** price = room price + 10% (locked with Joe: "show both: expect + walk-up", ~10%) so a contested bid actually wins rather than ties the room average. The archetype emphasis multiplier and the max-bid-% cap are **removed** (they were the machinery that produced the lowball); a single unaffordable stud is capped at the roster-solvency ceiling instead. When named targets overflow the budget at real room prices, the **cheapest are dropped** until the set fits -- surfacing the honest "$200 buys ~2 studs" truth instead of shrinking every stud below its real cost. `expectedRoomPrice` reaches the pricer structurally via `Player` (no call-site change).
- **Result:** Stars & Scrubs now reads **Gibbs $76 (win by $84), Nacua $79 (win by $87)** -- two real anchors, not five fictional discounts. Studs & Duds and Balanced likewise price every target at its real room cost. Report renderer shows "expect / walk-up to win" per target.
- **OPEN DECISION surfaced (resolved same day -- see the sim-anchor entry above):** the Monte-Carlo sim's opponents anchored on each player's NATIONAL ceiling (`nominated.ceiling`), so contested studs cleared ABOVE the room ledger in-sim. Recommendation was to align sim opponents to room price; Joe approved and it shipped. (An earlier note here cited a Gibbs sim-avg of "$117"; the verified ceiling-anchor field-wide average was ~$111, and Gibbs's national ceiling is $96, not $117 -- the $117 was a stale figure, corrected here.)
- **Cosmetic follow-up:** the strategy "Why" narrative (from `generate.ts`) rounds a couple of anchor prices slightly differently from the target-price table (e.g. Nacua "~$76" in prose vs $79 in the table). Narrative text only; the target-price table is the authority.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` **555/555** (target-pricing suite rewritten to the room-price contract: +room-price anchoring, +walk-up, +overflow-drop, +solvency-cap; component card test updated to prove the badge no longer moves with archetype tilt). `npx eslint` on all touched files exit 0. `npm run research:verify` 44/44 (11 real Nasties owners replicated as opponents). Deterministic (SIM_SEED=42). No em/en-dashes.

---

## 2026-08-20 / Headless engine -- budget-balanced strategy policy + em-dash sweep

**Class:** pipeline (Architecture + QA lenses). Follow-up to the headless research pipeline (`c6a4f7f`). Joe asked why the balanced strategy never surfaced, then approved building a budget-balanced policy.

- **Root cause (diagnosed empirically):** the 4 anchor policies (`ceiling`, `value`, `scarcity`, `spread`) all front-load the same two ~$76 studs, so `classifyArchetype` tagged them all `stars-and-scrubs`/`studs-and-duds` (the `top2Share >= 0.55` gate fires first) and dedupe collapsed them to 2 shapes. No policy ever spread the budget, so a genuinely balanced roster was never proposed.
- **Fix (`src/lib/research/strategy/generate.ts`):** added a 5th `balanced` policy plus a `PolicyContext` (budget, spent, remaining slots) threaded into every policy's `select`. The balanced policy caps any single anchor at 20% of budget and picks the highest-ceiling *starter-eligible* player from the least-anchored position. A `canClaimStarter` helper restricts anchors to players who can fill an open dedicated-or-flex starter slot, so the policy never pays up for a bench backup (first cut rostered two QBs; the helper is the fix).
- **Result:** the pipeline now emits 3 honest, distinct archetypes -- Stars & Scrubs (10.4-3.6), Studs & Duds (9.8-4.2), Balanced Auction (9.6-4.4, one QB/RB/WR/TE/DEF anchor, no position over 40% of budget). The balanced build honestly *loses* to the two-stud build in the Nasties room; that gap is the finding, not a fabricated "balanced is best."
- **Em-dash sweep (`scripts/research-run.ts`):** the committed pipeline runner carried 17 en/em-dashes (6 in report-output strings flagged by lint, the rest in comments), a violation of the global no-dash rule. Replaced all with hyphens; regenerated `research-output/` so `dataset.json` + `report.md` are dash-free (verified 0 occurrences).

**Gate:** `npm run type-check` 0 errors. `npm run test:run` **552/552** (+2 balanced-policy tests locking the `balanced-auction` archetype and the no-backup-QB invariant). `npx eslint` on all touched files exit 0 (0 errors; 3 pre-existing unused-var warnings in research-run.ts). `npm run research:verify` 44/44. Deterministic (SIM_SEED=42). No em/en-dashes anywhere. Artifacts `research-output/dataset.json` (860K) + `report.md` (17K) committed as the versioned deliverable Joe interrogates.

---

## 2026-08-20 / R14 findings #2 + #3 -- /prep hub + board copy contradictions

**Class:** output/bugfix (Design + QA lenses). The two P3 items from the R14 walkthrough, fixed after Joe said go.

- **F2 [P3] -- /prep hub button contradicted its own freshness badge.** The Player Pull button read "Run first pull" while the data strip said "3,150 players · FRESH". The label keyed off `latestRun` (a saved `research_run`) but the badge and count key off `cache` (the players_cache pool); a fresh pool with no saved analysis run showed both at once.
  - **Fix (`src/app/(app)/prep/page.tsx`):** label now keys off `cache` -- "Pull fresh data" when a pool exists, "Run first pull" only when there is genuinely none ("No pool yet"). Removed the now-dead `latestRun`/`setLatestRun` state (the `latest` local is still used for the run detail fetch).
  - **Live proof (:3141):** hub reads "PULL FRESH DATA" beside "3,150 players · updated Aug 19 · FRESH".
- **F3 [P3] -- stray "K" filter tab on a no-kicker league.** The tab was on `/prep/board`, not `/prep/players` (players already omits K by design). `POSITIONS` on the board still listed `'K'`, and the board never filtered kickers from its pool.
  - **Fix (`src/app/(app)/prep/board/client.tsx`):** removed `'K'` from `POSITIONS` and added `.filter((sp) => sp.player.position !== 'K')` to the base pool, mirroring `/prep/players`. So the ALL view and any sort also stop surfacing kickers, not just the tab.
  - **Live proof (:3141):** board BY POSITION row = ALL / QB / RB / WR / TE / DEF, no K.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` 550/550 (concurrent session added tests; all green). `npx eslint` on the 2 touched files exit 0 (0 problems). `npm run build` clean, all `/prep/*` routes prerendered. No em/en-dashes. Commit `873f0eb`. Repo-wide lint shows a +1 error/warning vs the session baseline, both in `use-draft-state.ts` / sim files the concurrent session is editing -- not in my files.

---

## 2026-08-19 / R14 findings #4 + #5 -- live-room + simulate leagueId plumbing

**Class:** shared/bugfix (Architecture + QA lenses). Found during the Phase 2 R14 usability walkthrough (live probes against a `next start` server on 3141 + DEV_MODE).

- **F5 [P1] -- live draft room never loaded a saved strategy.** `use-live-draft-data.ts` fetched `/api/strategies` with NO leagueId inside the initial `Promise.all`. The GET route requires leagueId and 400s ("leagueId is required") without it, so `stratRes.ok` was false, the whole strategy block was skipped, `allStrategies` stayed empty, and no active strategy was ever set -- the in-room advisor fell back to "No strategy set" even when a saved strategy existed for that league. The dev intent (fetch all, filter client-side by `session.league_id`) was unreachable because the route rejects the paramless call.
  - **Fix (`src/hooks/use-live-draft-data.ts`):** leagueId only exists after the session resolves, so the strategies fetch moved OUT of the `Promise.all` (session + players) to AFTER `sessionData`, using `sessionData.session.league_id` -> `/api/strategies?leagueId=<id>` (200). The route filters by league server-side, so the client-side league filter was dropped. Wrapped in its own try/catch so a transient strategy failure never blanks an already-loaded session.
  - **Live proof (fresh build on :3141, brand-new tab, empty network buffer):** one room load = exactly one strategies call, `GET /api/strategies?leagueId=0d2914f1-... -> 200 OK`. Zero bare 400s. In-page contract re-check: bare = 400 `{"error":"leagueId is required"}`, `?leagueId=` = 200 `{"strategies":[]}` (this session's league has no saved strategy yet; the fetch now succeeds instead of the block being skipped, so a real saved strategy will load). Live room console: 0 errors.
- **F4 [P2] -- /prep/simulate league Select leaked the raw uuid.** The Select trigger rendered `0d2914f1-...` instead of the league name. Radix `SelectValue` auto-text fails when the value is set programmatically on load (before the items register).
  - **Fix (`src/app/(app)/prep/simulate/client.tsx`):** render `selectedLeague?.name` explicitly as `SelectValue` children.
  - **Live proof (fresh build on :3141):** combobox now reads **"Nasties 2026"** (read_page ref_13), not the uuid.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` 507/507 across 41 files. `npm run lint` 45 errors / 111 warnings = pre-existing baseline, 0 in the 2 touched files (0 new). `npm run build` clean, all routes prerendered. No em/en-dashes. Commit `6a31095`. The concurrent-session `sim-engine.ts` + its test were left untouched (committed by explicit path).

---

## 2026-08-19 / R14 finding #1 -- batch user-tags 500 on null leagueId (/prep/board, /prep/simulate)

**Class:** bugfix (QA lens). Found during the Phase 2 R14 usability walkthrough (live probes against a `next start` server on 3141 + DEV_MODE).

- **What / why:** `POST /api/user-tags/batch` 500'd with `invalid input syntax for type uuid: "null"` whenever a caller passed `leagueId: null` with `includeGlobal` (the default true). `/prep/board` (`selectedLeagueId`) and `/prep/simulate` (`selectedLeagueId`) both pass `leagueId=null` before a league finishes loading, so their TARGET/AVOID tag load crashed in that window. `player_cache_id` and `league_id` are uuid columns; the route's branch order checked `includeGlobal` first and interpolated null into `.or('league_id.eq.null,league_id.is.null')`, sending the literal string `"null"` to Postgres (22P02).
- **Root cause:** branch order. The GET route guards with `if (leagueId)` (truthy) so null is safe there; the batch route used `if (leagueId !== undefined)` and let null fall into the `includeGlobal` `.eq` interpolation.
- **Fix (`src/app/api/user-tags/batch/route.ts`):** handle `leagueId === null` FIRST -> `.is('league_id', null)` (global tags only), before the `!== undefined` / `includeGlobal` branch. `undefined` (players-page path, no league filter) and real-uuid paths are unchanged.
- **Live proof (fresh build on :3141):** null-league path `56a45574-...` went **HTTP 500 -> HTTP 200** `{"userTagsMap":{},"count":0}`; players path (no leagueId) held **HTTP 200**.
- **Tests (+3):** `src/app/api/user-tags/__tests__/batch-null-league.test.ts` -- null leagueId uses `.is` never `.or`/`.eq`; real leagueId still uses `.or`; omitted leagueId applies no league filter.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` 507/507 across 41 files (was 504/40; +3). `npm run lint` 45 errors / 111 warnings = the pre-existing baseline, 0 in the 2 touched files (0 new). `npm run build` clean, all routes prerendered. No em/en-dashes.

---

## 2026-08-19 / Phase 1 -- Player Pull re-flows strategy proposals (close BUILD_PLAN:517 gap)

**Class:** shared/bugfix (Architecture + QA lenses). Functionality-first sequencing after the SP-track was paused.

- **What / why:** the confirmed functional gap at `BUILD_PLAN.md:517`. `StrategyProposals` (`/prep/strategies`) fetches once and caches via `fetchedRef`, so a fresh Player Pull on `/prep` (which refreshes the cached player pool the proposals derive from) did NOT re-flow them. New injuries/projections/values never moved the ranked strategies until a manual Regenerate. Joe explicitly asked for a pull to re-flow.
- **Fix:** `src/lib/prep/pull-signal.ts` (new) -- a tiny cross-route signal: `markPullComplete(leagueId)` stamps `localStorage` key `ffi:last-pull:<leagueId>` with a timestamp; `readPullStamp(leagueId)` reads it back (0 when none/unavailable). Both SSR-safe and degrade to no-ops when `localStorage` is blocked.
- **Producer:** `/prep` `page.tsx` `doRun()` calls `markPullComplete(league.id)` on a successful `/api/research` pull, before `load()`.
- **Consumer:** `strategy-proposals.tsx` replaced the mount-only effect with a mount + `focus`/`visibilitychange` effect. On first load it adopts the current stamp (no double-fetch); when it later sees a stamp newer than the one its proposals were built from, it re-runs `/api/strategies/propose`. Same-tab SPA navigation is why it polls on focus rather than listening for the cross-tab `storage` event.
- **Tests (+7):** `pull-signal.test.ts` (5 -- read-empty, write/read, per-league isolation, newer-wins, empty-id) + `strategy-proposals-reflow.test.tsx` (2 -- re-fetches on newer-pull+focus, does NOT re-fetch on a bare focus).

**Gate:** `npm run type-check` 0 errors. `npm run test:run` 504/504 across 40 files (was 497/38; +7). `npx eslint` on all 5 touched files 0 problems (0 new). `npm run build` compiled successfully in 4.4s, all routes prerendered. No em/en-dashes.

---

## 2026-08-18 / SP-4V -- Validate /prep/configure rebuild (Opus, fresh context) + MED dash fix

**Class:** output (Design + QA lenses). **Opus, WORKHORSE (validation), OTHER_FAMILY** (did NOT write SP-4). Independent adversarial check behind SP-4 commit `771ecc1`.

- **VERDICT: PASS, 0 HIGH.** The rebuilt `/prep/configure` is structurally correct, gate-green, form-safe, and off-token-clean in source.
- **Gate re-run (by the validator, from repo root):** `npm run type-check` 0 errors; `npm run test:run` 497/497 across 38 files; `npx eslint` on the 2 touched files 0 errors (1 pre-existing `userId` unused warning, not on a diffed line); `npm run build` clean, `/prep/configure` prerendered static among 56 pages.
- **Off-token grep:** `77,130,255` = 0 on both source files. **Raw hex/rgba sweep:** 1 match, `rgba(255,110,138,...)` error banner at `league-config-form.tsx:114`, git-blame `a591de36` (2026-08-10), pre-existing and untouched by SP-4, exempt. No SP-3-class new literal.
- **Structural parity vs mockup SCREEN 2:** full match. Back-chevron Setup row, `.ffi-title-red` header, `.ffi-hero` identity strip, 3 `QuietLabel` dividers replacing flat h3, `<FFIBadge status="info">` replacing the blue badge, red-volt-focus inputs. No missing or extra element.
- **Supabase/form integrity:** `actions.ts` (`createLeague`) not in the diff; no form field `name`/`id`/`value`/hidden-input attribute changed. Form saves identically.
- **Commit hygiene:** exactly 5 files in `771ecc1` (2 source + 3 docs); none of the 24 unrelated dirty working-tree files swept in.
- **1 MED found and fixed by orchestrator (Opus):** the SP-4 build agent wrote 2 literal dashes (U+2014 em + U+2013 en) into the BUILD_PLAN.md SP-4 gate line (inside the phrase describing the dash grep, ironically), violating the "0 dashes in SP-4 doc additions" check. Swapped to ASCII codepoint names; re-verified the SP-4 doc block (BUILD_PLAN lines 672-680) is now 0 dashes. Legacy dashes elsewhere in BUILD_PLAN.md are pre-existing history, out of scope.
- **Could not verify:** no live pixel render (`/prep/configure` behind Supabase auth in a headless no-composite sandbox). Parity established via source-vs-mockup structural read, the documented fallback used by every prior SP/D/R card.

---

## 2026-08-18 / SP-4 -- Rebuild /prep/configure to the approved SHIELD mockup

**Class:** output (Design + QA + Delivery lenses). **Sonnet, WORKHORSE.** Visual/layout rebuild only, no Supabase wiring, form submission, validation, or server action changes.

- **What / why:** `/prep/configure`'s header already used `.ffi-title-red` + a back-chevron "Setup" row, matching the SP-2 mockup, but the body was a flat stacked form with no SHIELD hero/section identity, plus one off-token blue badge `rgba(77,130,255,...)` in `league-config-form.tsx`. SP-2's approved mockup (SCREEN 2, `UI/mockup-SHIELD-screens.html`) specified the SHIELD replacement.
- **`page.tsx`:** added a `.ffi-hero` identity strip below the existing header/subtitle, before `<LeagueConfigForm />` -- "The Nasties" in `.ffi-title-red` plus a `.ffi-caption` line ("Auction, 12 teams, $200, PPR, no-K" via `&middot;` separators, no dashes). Text is static (the app is single-league/Nasties-only), so no new Supabase query was added.
- **`league-config-form.tsx`:** the 3 flat `h3` section titles (League Details, Roster Slots, Scoring Settings) inside their `ffi-card` divs replaced with a local `QuietLabel` divider (small-caps, `font-cond`, 10px, 0.28em tracking) placed ABOVE each card, copied verbatim from the gold-standard pattern already defined in `prep/page.tsx` (that file stayed off-limits to edit, per the dirty-tree constraint on unrelated uncommitted changes, so the pattern was duplicated locally rather than imported). The off-token blue badge (`rgba(77,130,255,0.16)` background) replaced with `<FFIBadge status="info">`, which resolves through the pre-existing `.ffi-badge-info` CSS class in `globals.css` (`rgba(95,168,224,.16)` bg, `#7fc0ea` text, neither touched by this change) -- zero new color literals introduced. A second `<FFIBadge>` variant (steel token background) added for the "Custom" scoring-format state, which previously had no badge. Inputs already carried `ffi-input ffi-form-input` (red volt focus glow) before this change, so no edit was needed there.
- **Constraint honored:** zero em/en-dashes. 4 pre-existing em-dashes in code comments (not UI copy) fixed to commas, since the file was already in-diff and the hard no-dash gate applies to the whole changed file.
- **Not touched:** `actions.ts` (the `createLeague` server action), any Supabase query, and every form field's `name`/`id`/`value`/hidden-input attribute -- confirmed by reading `actions.ts` in full and diffing only JSX/styling moved, so the form still saves exactly as before.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` 497/497 tests green across 38 files (no regressions). `npm run lint` on the 2 touched files: 0 errors, 1 pre-existing unrelated warning (`'userId' is defined but never used`, outer function signature, confirmed via diff to be outside this change). `npm run build` clean. Grep for `77,130,255` on both changed files: 0 matches. Grep for raw hex/rgba on both changed files: 1 match (`rgba(255,110,138,...)` error-banner block), confirmed via `git diff -- league-config-form.tsx | grep "rgba(255,110,138"` returning no output, i.e. entirely pre-existing/untouched, exempt per the gate's own stated clause. Grep for em/en-dashes on both changed files: 0. Visual proof blocked: no live-render possible in this headless sandbox (Browser pane does not composite here, same known constraint as prior R/D/SP-track cards), and `/prep/configure` sits behind Supabase auth so a headless `next start` redirects to sign-in -- verified instead via a thorough source-vs-mockup structural read against SCREEN 2 of `UI/mockup-SHIELD-screens.html` and its SHIELD-translation annotation panel.

---

## 2026-08-18 / SP-3V -- Validate /draft/setup rebuild (Opus, fresh context) + HIGH-1 fix

**Class:** output (Design + QA lenses). **Opus validator, WORKHORSE (validation).** Independent adversarial check behind SP-3; did NOT write SP-3.

- **Validation result:** re-ran the full gate independently -- type-check 0, test:run 497/497, build clean; lint failures are 100% pre-existing and outside the 2 setup files (neither `draft/setup/page.tsx` nor `client.tsx` appears in lint output). Structural parity vs the approved SP-2 mockup CONFIRMED: `.ffi-hero` AUCTION word renders (no `blur-3xl` in the DOM), StepChip "Step N of 3" + red pulse dot, three QuietLabel sections (Live Draft / Input Method / Session Details), DestRow-style red volt rail on selected selector rows. Verified `--ffi-gold-bright` resolves to brick-red `#c25a5e` (whole `--ffi-gold*` family repainted to the red palette), so the selected check icon + pulse dot render RED, not gold -- correct. Commit `ad17e11` swept ONLY its 5 intended files; the Supabase/state/handler wiring (`handleSubmit` -> POST `/api/draft/sessions` -> `router.push('/draft/live')`, load effect, manager CRUD) is byte-identical, only JSX/styling moved.
- **HIGH-1 found + fixed:** SP-3 shipped a raw off-token hex `#ffffff` at `client.tsx:536` (`color: selected ? 'var(--ffi-gold-bright)' : '#ffffff'`), which contradicted its own "0 off-token hex" completion claim (styling must be token-only). Orchestrator (Opus) fixed it: swapped to `var(--ffi-text-primary)` (#eaf1f8, token-consistent with the sibling `var(--ffi-text-muted)` on the next line). Re-verified: raw-6-hex grep on both setup files -> 0 matches; off-token literal grep -> 0; em/en-dash grep -> 0. Gate re-run green: type-check 0, scoped lint 0, build clean (`/draft/setup` static), test:run 497/497.
- **Verdict:** SP-3V PASS after the one-line HIGH-1 fix. Pixel screenshots blocked in the headless sandbox (Browser pane not compositing, and `/draft/setup` sits behind Supabase auth middleware so a headless `next start` redirects to sign-in) -- verified via the sanctioned source-vs-mockup structural read, same constraint documented across R5/R6/R10b/D5/D6/SP-2.

**Gate:** type-check 0, test:run 497/497, build clean, greps 0. /draft/setup validated -> SP-4 next.

---

## 2026-08-18 / SP-3 -- Rebuild /draft/setup to the approved SHIELD mockup

**Class:** output (Design + QA + Delivery lenses). **Sonnet, WORKHORSE.** Visual/layout rebuild only, no Supabase wiring, data flow, or server action changes.

- **What / why:** `/draft/setup` was the most GRIDIRON route left in the app: a `blur-3xl` glow wallpaper card, a static page-level header that duplicated on top of client.tsx's own step headers (double-header bug on steps 2/3), and heavy off-token hex (`#5FA8E0`, `#8bacff`, `#9eadb8`) across the 3-step flow. SP-2's approved mockup specified the SHIELD replacement.
- **`page.tsx`:** thinned from 25 lines to a 6-line wrapper (`return <DraftSetupClient />`). Removed the static header entirely, matching the documented convention already in `draft/page.tsx` ("client owns its own header, page.tsx wrappers must NOT add one, double-header bug").
- **`client.tsx` (full rebuild of the render layer, all state/hooks/handlers unchanged):** new local `DraftSetupHeader` helper renders a step-aware `FFISectionHeader` (title/subtitle) plus a new `StepChip` action slot, steel-blue "Step N of 3" pill with a red pulse dot, matching the prep-hub header pattern; called at the top of every render branch (loading, no-leagues, step 1/2/3) so the header persists across all states. The Step 1 format-gate `blur-3xl` glow card is replaced by a real `.ffi-hero` block with the giant AUCTION/SNAKE word in `.ffi-title-red`. New local `QuietLabel` divider component adds "Live Draft" (step 1), "Input Method" (step 2), and "Session Details" (step 3) sub-section labels per the mockup's Sections spec. Step 2 (draft mode) and Step 3 (trash talk, auctioneer sync) selector buttons rebuilt with a DestRow-style token pattern: unselected rows read `var(--ffi-border)`/`var(--ffi-blue)`/`var(--ffi-ink-2)`, the selected row gets a red volt rail (left rail on full-width rows, top rail on the compact trash-talk grid), `boxShadow: 0 0 0 1px var(--ffi-volt-glow)`, and icon/check color `var(--ffi-gold-bright)`, directly modeled on the existing `detected` pattern in `draft/page.tsx`. Step 1 and Step 3 commit CTAs changed from `variant="primary"` to `variant="hero"` (`.ffi-btn-hero`). All off-token hex literals and the `blur-3xl` wallpaper are gone from both files.
- **Constraint honored:** zero em/en-dashes in both files (8 caught in my own new JSDoc/inline comments, all fixed to commas or reworded, re-verified to 0).
- **Not in this session's scope:** `/bug-hunt free` and the "A1-A10" checklist named in `BUILD_PLAN.md`'s own SP-3 done-when bar were not run, the task prompt driving this build specified a narrower explicit gate (type-check, test:run, lint, build, 2 greps); left for SP-3V (validator) to pick up.

**Gate:** `npm run type-check` 0 errors. `npm run test:run` 497/497 tests green across 38 files (no regressions). `npm run lint` 0 errors / 0 warnings in the 2 touched files (full-repo lint separately shows 39 pre-existing errors, all in unrelated test fixtures `convert.test.ts`/`recommendation.test.ts`/`tags.test.ts`, none in files this change touched). `npm run build` clean, `/draft/setup` compiles as a static route. Independent grep of both files for `5FA8E0|8bacff|9eadb8|blur-3xl` -> 0 matches. Independent grep of both files for em/en-dashes (`—|–`) -> 0 matches. Structural verification via `next start` production preview on port 3121 (dev-mode blocked by Next 16's one-dev-server-per-directory lock against another already-running session on port 3003): `read_page`/`get_page_text` confirmed the backrow, H1, "Step 1 of 3" chip, "Live Draft" quiet label, league selector, and fallback card all render as built. Pixel screenshot blocked (Browser pane does not composite frames in this headless sandbox, same known env constraint as prior R/D-track cards) -- not claimed as visually verified beyond DOM structure.

---

## 2026-08-18 / SP-2 -- SHIELD design mockups for setup, configure, runs, settings, auth (Joe-approved)

**Class:** output (Delivery + Design lenses). **Opus, FRONTIER.** Design/decision item only -- NO app source touched; the deliverable is an annotated mockup that gates SP-3..SP-7. Joe-gated halt satisfied: Joe typed explicit approval 2026-08-18.

- **What / why:** the 5 remaining Tier B + C screens (`/draft/setup`, `/prep/configure`, `/prep/runs`, `/settings`, `(auth)` sign-in/up) had no mockup, so their layout was an open judgment call Joe's quality gate requires he sign off BEFORE any build. One combined pass keeps the 5 consistent and gives Joe a single sign-off.
- **Deliverable:** `UI/mockup-SHIELD-screens.html` (self-contained, 5 annotated phone frames + per-screen SHIELD-translation panels). Published artifact `aa36d1ca-4dd2-4669-94ec-62ce90624634`.
- **First pass rejected** as flat color blocks. Root cause: the SHIELD richness is a CSS composite (there is NO photographic background image in the app -- grepped `src/` + `public/`, only favicons), and the first mockup approximated it instead of porting it. **v2 ports the real texture stack verbatim from `globals.css`:** `.stadium-atmos` navy field (378) + `.atmos-grain` film-grain SVG-turbulence overlay (398, mix-blend overlay) + animated `.ffi-hero::before` sheen (562) + `.ffi-card-interactive::before` iridescent edge-sheen (531) + inset-lit `.ffi-btn-hero` (468) + DestRow red-rail/duotone-chip pattern from `prep/page.tsx`.
- **Per-screen translation + reuse (no net-new components):** (1) `/draft/setup` -- AUCTION format-gate promoted to `.ffi-hero`; reuses FFISectionHeader, FFICard/-Elevated, FFIButton, FFIBadge, FFIInput, DestRow; kills `blur-3xl` glow (`client.tsx:253`) + `#5FA8E0`/`#8bacff`/`#9eadb8`. (2) `/prep/configure` -- flat form to SHIELD sections; reuses FFISectionHeader, FFIInput, FFIBadge, FFIButton, FFICard; kills `rgba(77,130,255)` (`league-config-form.tsx:240`). (3) `/prep/runs` -- latest-run `.ffi-hero` + DestRow history; reuses DestRow, FFIBadge, FFIPositionBadge, review-cards.tsx, FFIButton; kills green `rgba(139,255,69)` (`runs/client.tsx:66`). (4) `/settings` -- iOS grouped list to DestRows + QuietLabel; reuses DestRow, QuietLabel, FFICard+InfoRow, FFIBadge; `signOut` action preserved; kills `#8bacff` Dev badge (`settings/page.tsx:45`). (5) `(auth)` -- from scratch: Oswald-red wordmark hero on full `.stadium-atmos` field + `.ffi-card-elevated` panel + brick `.ffi-btn-hero` CTA; removes shadcn Card + `blur-3xl` glow (`layout.tsx:9`); **all Supabase wiring preserved** (`useActionState` -> `signIn/signUp/signOut`, field names, `/prep` redirect, success screen).
- **Bottom-nav correction (Joe caught):** the first approved pass omitted the persistent mobile bottom tab bar. Ported verbatim from `app-shell.tsx:249-315` -- 4 tabs (Research/Live Draft/Post Draft/Setup), `backdrop-blur` bar, `rounded-t-xl` top corners, top shadow, active tab in SHIELD brick-red (red icon glow + red dot + red/12 pill, replacing the old blue active state). Active-tab logic matches `getActiveHref` + `SETUP_OVERRIDE_PREFIXES`: `/draft/setup`=Setup, `/prep/configure`=Setup, `/prep/runs`=Research, `/settings`=Setup; `(auth)` correctly has NO nav (own layout). Verified in the rendered DOM (4 navs, correct active tab each, auth none).
- **Constraint honored:** zero em/en-dashes (9 caught in my own first output -- CSS comments + `&mdash;` entities -- all removed, re-verified to 0 after the nav add).

**Gate:** N/A for app tests (no source touched). Render verified structurally via `read_page` + a DOM query (all 5 screens + annotations present, 4 bottom navs with correct active tab, auth nav-free, no parse errors); pixel screenshot blocked by the known headless-env limitation (Browser pane not compositing -- same constraint documented R5/R6/R10b/D5/D6), so the live artifact is the visual proof Joe approved from. **Joe approved the look (incl. bottom nav) 2026-08-18 -> SP-3..SP-7 unblocked.**

---

## 2026-08-18 / SP-track authored -- SHIELD Screen-Parity Sprint (planning, no code)

**Class:** docs (Delivery lens). **No code touched** -- this entry records the addition of 13 scoped build-plan items, not an implementation.

- **What / why:** Joe flagged that the SHIELD v4.0 rollout was a token-VALUE repaint (one `globals.css` swap repainted all 61 screens because the token NAMES were kept stable from GRIDIRON v3) and NOT a per-screen redesign. Evidence-backed per-screen inventory (3 Explore agents) confirmed only D2-D6 (5 areas) got a true SHIELD craft pass; every other screen still wears GRIDIRON-era structure (flat forms, iOS list rows, generic primitive shells) plus stale off-token literals the paint swap could not reach.
- **Authored:** a new **SP-track** (SP-0..SP-7 + OTHER_FAMILY validators = 13 items) in `BUILD_PLAN.md`. Opus is reserved for the single design/decision item (SP-2 mockups); every build is a bounded Sonnet WORKHORSE against an approved mockup; a fresh-eyes OTHER_FAMILY validator runs behind each builder. Screen tiers: A (token sweep only) = draft hub/review/board; B (design + re-layout) = draft/setup, prep/configure, prep/runs, settings; C (from scratch) = (auth). Dependency spine: SP-0 + SP-1 start now; SP-2 is a JOE-GATED HALT blocking all SP-3..SP-7 builds.
- **Files (docs only):** `BUILD_PLAN.md` (new SP-track section + dashboard `nextItems` entry), `WORKING_STATE.md` (next-item pointer), this `CHANGELOG.md`. Plan of record: `C:\Users\jrasa\.claude\plans\cozy-waddling-creek.md`.
- **Known follow-up baked into SP-0:** `REVIEW_LENSES.md` Design lens is STALE (still names the retired Tactical Hologram / Space Grotesk / `#8bacff` palette); SP-0 fixes it first so validators check against SHIELD.

**Gate:** N/A -- planning entry, no code. Type-check/tests/build unaffected.

---

## 2026-08-18 / D6b-2 -- Live Read: Monte Carlo land-probability wiring

**Class:** pipeline (Architecture + QA + Security lenses). **DEC-2b Opus half.** Wires a REAL `runMonteCarlo` land probability into the on-block Read. All $0 (pure math, no API calls).

- **`room-sim-probability.ts` (NEW):** Pure $0 adapter `computeLandProbability(input)`. Ensures the on-block player is in the pool, builds the board from the live undrafted pool minus drafted names (`buildBoardPlayers`), maps the me-seat's REMAINING roster shape + budget (`buildSlotsRemaining`) into `runMonteCarlo` (R10a engine, NOT modified), and returns `{ probability: hits/total, runs, hits }` where `hits` = runs whose me-seat roster ends with the on-block player. `LAND_PROB_RUNS = 16`; board capped at `numManagers * openSlots + BOARD_MARGIN(12)` to bound early-draft latency (lossless -- the tail never sells before rosters fill; on-block always kept). Returns `null` (caller hides the chip) on no meaningful signal: `numManagers < 1 || budget < 1`, empty board, on-block not on the board (e.g. just drafted), or `slotsOpen <= 0` (roster full). **DEC-2b:** the displayed % is ALWAYS a real `runMonteCarlo` fraction or null -- never fabricated; fixed default `seed = 1` makes it deterministic (same inputs -> byte-identical). Header documents the deliberate symmetric "from-here" approximation (the engine has no per-manager initial state, so all seats get the me-seat's remaining shape/budget) as in-scope for the wiring step.
- **`on-the-block-card.tsx`:** Added `landProbability?: number | null` to props/type. Renders a `LAND · NN%` chip (muted-neutral `ROOM.muted10`/`muted25`, `Math.round(prob*100)`) immediately after the CONF chip inside The Read. Guard is `landProbability != null` -- `0` renders "LAND · 0%" honestly, `null`/`undefined` hides the chip.
- **`auction-room.tsx`:** New `landProbability` useMemo calls `computeLandProbability` from live room state (`onBlockPlayer`, `available.map(sp => sp.player)`, `draftedNames`, `rosterSlots`, `myPicks`, `teamCount`, `myBudget ?? leagueBudget`), returns `res ? res.probability : null`, and is passed to the single `<OnTheBlockCard>` render.
- **`client.tsx` (bug-hunt HIGH fix):** Hoisted `myPicks` from a render-body `.filter()` (a new array reference every render) into a `useMemo` keyed off `state`. The render-body version defeated the `landProbability` memo's identity check, re-running 16 Monte-Carlo auctions on the render thread on every remote-feed poll, picker-open, and star-toggle. Now stable between picks.
- **Tests (NEW, +12):** `__tests__/room-sim-probability.test.ts` (8: probability in [0,1] backed by real runs + `hits/runs` reconstructs the % exactly; deterministic under fixed seed; hit-count moves across a seed spread; drops drafted on-block -> null; rosterable player positive land chance; roster-full -> null; degenerate 0-managers/$0-budget -> null; latency `< 1000ms` with a logged real number) + `live-room/__tests__/d6b2-land-prob.test.tsx` (4: renders "LAND · 58%" beside "CONF · HIGH"; rounds 0.333 -> "33%"; shows "LAND · 0%"; hides at null).

**Tests:** 497/497 green (485 baseline + 12 new).

**Gate:** type-check 0 errors · `test:run` 497/497 · lint 0 new errors in changed files (warnings all pre-existing) · build ✓ Compiled successfully in 4.6s · **latency 173.6ms** worst-case (16 runs, empty early-draft board). **Bug-hunt (static, D6b-2 change set):** 1 HIGH FIXED (the `myPicks` memoization defect above); BUG-D6b2-01 (LOW-MED, deterministic tie-break favors the me-seat -- pre-existing R10a engine behavior) and BUG-D6b2-02 (LOW, symmetric-state approximation -- disclosed in the module header) logged + deferred, out of this one-step scope. Visual proof: headless-env limitation (same as D6/D6b-1/R11a -- no active `/draft/live` session reachable); the chip render path is proven by the 4 RTL DOM tests against the real `OnTheBlockCard` plus a faithful static HTML render (exact `theme.ts` tokens + chip markup) delivered in-chat.

---

## 2026-08-18 / D6b-1 -- Live-room v5 UI alignment pass

**Class:** output (Design + QA lenses). **Scope:** pure UI, no Monte Carlo (D6b-2/Opus). Aligned the shipped D6 live room to the locked v5 cockpit spec (`docs/ux_redesign/d6_cockpit_mockup_v5.html`). All $0 (no API calls).

- **`status-bar.tsx`:** Added `round?` + `pick?` props. Stacks "R{N} · PICK {N}" subtitle under the LIVE pill in JetBrains Mono tabular-nums (gap #4).
- **`strategy-strip.tsx`:** Label changed to "Strategy · ranked from your research". Active strategy shows `{name} - #{rank}` (hyphen, not dash per Joe rule). Dropdown items show rank suffix. (gap #3).
- **`on-the-block-card.tsx` (complete restructure):** Summary row always shows $X tgt chip when capValue is present (gap #2). Headshot slot (silhouette placeholder) + positional rank "RB6" in meta line "LAR · RB6 · TIER 2 · BYE 6" (gap #5). `MarketBand` sub-component: steel-blue region + red target marker on a positioned track (gap #1). "The Read" section label replaces "What to do". `CONF · HIGH/MED/LOW` chip wired from `explain.ts` rule-based confidence (DEC-2b Sonnet half -- not fabricated). Red `inset 3px 0 0` left rail per v5 shell. `ACTION_GLOW` constant replaces non-existent `ROOM.voltGlow`.
- **`inline-players-panel.tsx` (NEW):** Collapsible Players section. Search input + ALL/QB/RB/WR/TE/DEF filter pills + Rk/Player/Proj/Value/Fav grid. 15-row default, "Show all N players" expand. Star toggle calls `onToggleTarget`. Sorted by `combinedScore` DESC. (gap #6).
- **`auction-room.tsx`:** StrategyStrip moved above OnTheBlockCard. `explainPlayer()` called to produce `confidence` for the CONF chip. StatusBar receives `round={Math.floor(state.picks.length / teamCount) + 1}` + `pick={state.picks.length + 1}`. InlinePlayersPanel added below My Team roster section.
- **`__tests__/d6b1-ui-alignment.test.tsx` (NEW):** 19 tests covering all 6 gaps + CONF chip + "The Read" label + R5 roster-note regression: market band labels, legend, null-guard; CONF HIGH/LOW/absent; collapsed tgt chip; RB6 positional rank; R3 PICK 27; ranked strategy label; "ranked from your research" label.

**Tests:** 485/485 green (466 baseline + 19 new).

**Gate:** type-check 0 errors · `test:run` 485/485 · lint 0 new errors in changed files (147 total problems, 39 errors, all pre-existing in untouched files) · build compiles clean (56 static pages). Bug-hunt free: 0 CRITICAL/HIGH/MED across 5 changed files. Visual proof: headless-env limitation (same as D6/R11a/D5 -- no active /draft/live session reachable); DOM/type/test proof stands.

---

## 2026-08-18 / R13 phase 2 -- Bug-hunt fixes + test hardening

Class: bugfix + shared (QA + Architecture lenses). Root cause: the R13 full-mode bug hunt (this file's `BUG_LOG.md`) surfaced 1 HIGH, 3 MEDIUM, 3 LOW findings; phase 2 fixes the correctness/logic bugs and hardens tests. All $0 (no live AI).

- **BUG-R13-01 (HIGH) -- offline resync silent-failure.** `src/hooks/use-draft-feeds.ts` computed the reconnect edge by mutating refs in the render body (no eslint-disable), so a React 19 StrictMode/concurrent discarded render could eat the one-shot `justReconnected` signal and `reconcileWithAuctioneer` would silently never run -- the live-draft safety net failing in the exact scenario it exists for. Fixed: edge detection moved into a `useEffect` keyed on `remoteConnected`; the one-shot boolean replaced with a monotonic `reconnectNonce`. `src/app/(app)/draft/live/client.tsx` now reconciles once per new nonce (deduped by `lastReconciledNonceRef`), which survives discarded renders AND the snapshot-arrives-after-reconnect race the old boolean couldn't. Removed 13 `react-hooks/refs` lint errors.
- **BUG-R13-02 (MEDIUM) -- DEF vs DST budget-key split.** `computeAdjustedAuctionValue` (`scoring.ts`) read `budget_allocation[player.position]` with no DEF->DST normalization, so a defense scored against a DST-keyed auto/LLM strategy silently fell back to the 10% default while `target-pricing.ts` used the real DST allocation -- two DEF values from one strategy. Fixed: `scoring.ts` reads `alloc.DST ?? alloc.DEF ?? 10` for defenses (DST-first, legacy-DEF fallback, no DB migration); `presets.ts` now emits `DST` via a new `mapBudgetAllocToDb` helper so producer + both consumers share one convention.
- **BUG-R13-03 (MEDIUM) -- scarce-tier PUSH threshold.** Verified CORRECT, not off-by-one. Traced the live call site (`client.tsx:287-290`): scarcity is built from `availablePlayers` = undrafted players, which includes the on-block (nominated, not-yet-won) player, so `tier1Remaining <= 1` correctly means "this is the last tier-1." `consensusTier` is always integer in practice (FantasyPros tiers + `Math.ceil`), so `tierOf` (Math.round) and `calculateScarcity` (`<=1`/`===2`/`>=3`) agree on every real input. No logic change; added 3 pinning tests to `what-to-do.test.ts` locking the tier-1 and tier-2 PUSH boundaries. Documented a latent watch-item: strict `=== 2` would undercount if the pipeline ever emitted fractional tiers.
- **BUG-R13-05 (LOW) -- nav-context refs-in-render.** `NavProvider` (`src/lib/nav-context.tsx`) mutated refs in render to derive page-transition direction (7 refs errors). Replaced with React's blessed "store info from previous renders" pattern (`useState` + adjust-during-render); behavior identical; also dropped a dead `useCallback` import.
- **BUG-R13-06 (LOW) -- StealFlash setState-in-effect.** `src/components/motion/StealFlash.tsx` -- the trigger-driven animation burst genuinely needs a setState in an effect (no event handler to hang it on). Documented with a scoped `eslint-disable-next-line react-hooks/set-state-in-effect`, matching the codebase convention.
- **BUG-R13-07 (LOW) -- fractional auction cap.** `scoring.ts` -- `maxBid` is now `Math.round`ed so a binding cap can no longer return non-integer dollars (e.g. $70.4).
- **BUG-R13-04 (MEDIUM/perf) -- DEFERRED.** Sim board re-solve is a performance ceiling only, correct and sub-second at Nasties scale; board pre-trim carried forward as an open watch item (restates BUG-R10a-01).

**Tests:** 466/466 green (463 baseline + 3 new pins in `what-to-do.test.ts`).

**Gate:** type-check 0 errors · `test:run` 466/466 · `build` exit 0 (`✓ Compiled successfully in 3.7s`, all routes) · `lint` 39 errors / 108 warnings, DOWN from 60/109 -- the 21 removed are exactly the refs/set-state errors fixed above; the remaining 39 are pre-existing en-dash violations in untouched test fixtures, 0 new problems introduced this session. Verified none of the 7 touched files appear in the lint error list (client.tsx shows only pre-existing unused-import warnings). No live-draft browser verification needed -- these are logic/hook/lint fixes proven by the type-check + test + build gates; the offline-resync path is covered by the nonce-dedupe reconcile logic and the existing hook contract, and the same headless `/draft/live` limitation documented at R11a-D6 still blocks an in-browser reconnect demo.

---

## 2026-08-18 / D6-polish -- Live-room tap-target + dash cleanup (D6 verify follow-up)

Class: output (Design + QA lenses). Root cause: the independent D6 verification flagged (a) 6 pre-existing comment em-dashes across live-room components and (b) three new interactive controls under the 44px mobile touch-target floor.

- **Dash cleanup:** removed all 6 em-dash characters from comment headers/inline comments in `strategy-strip.tsx`, `research-view.tsx`, and `auction-room.tsx` (Joe no-dash rule). Live-room dash sweep now returns zero.
- **Tap targets (layout-neutral hit-slop):** the live room is a deliberately dense cockpit (approved UXV2-6); a blanket 44px would break the approved density, and its packed chip rows sit adjacent where enlarged hit areas would collide. So only the isolated header toggles were enlarged, via a transparent absolutely-positioned span that expands the tap zone VERTICALLY only (where thumb misses happen), leaving the visible box byte-identical and avoiding horizontal collision with neighbors. Applied to: on-the-block card collapse chevron (26px -> 44px tap height) + its "Change player" sibling, and the "tap to filter" and My Team "show/hide" header links. Dense chip rows (tier chips, position filters, research/sheet chips) intentionally left at approved density.
- Gate: type-check 0 errors, tests 463/463, lint 0 errors on the 4 touched files, build compiles clean (56 static pages). Visual confirmation of the enlarged tap zones not possible in this headless env (same limitation as D6); the hit-slop is layout-neutral and degrades safely to current sizing if ever clipped, so it carries no visible-regression risk.

---

**Task:** D6. Final pixels for R11b's already-wired target/avoid bias behavior (build-once rule: R11b owns behavior, D6 owns the look). Recolor the live room to Joe's approved direction (2026-08-18): steel-blue is PRIMARY/structural, brick-red reserved only for the BID verdict + max-bid, muted/neutral for spent/inactive. Remove the old red-to-green budget bar. Land the remaining bundled R11 UX gaps: per-slot target-at-price, per-slot expand-to-alternates driven by active strategy, collapsible My Team panel, collapsible on-block card, FLEX tier row + T4/T5. | **Class:** output | **Lenses:** Design, QA

**What shipped:**
- **`src/components/draft/live-room/theme.ts` + `on-the-block-card.tsx` + `awareness-strip.tsx` + `strategy-strip.tsx` + `status-bar.tsx` + `bottom-nav.tsx` + `research-view.tsx` + `block-picker-sheet.tsx` + `fix-pick-sheet.tsx` + `tier-context.tsx`:** SHIELD v4 recolor -- `moveTheme()` mapping changed so `volt`(BID) -> `ROOM.action` (brick-red, verdict + max-bid only), `orange`(PUSH) -> `ROOM.amber`, `red`(PASS) -> `ROOM.muted` (zero red on a pass), `gold`(HOLD, default) -> `ROOM.blue`. FLEX tier row + T4/T5 tier bands added to Tier Context. On-block card made collapsible.
- **`src/components/draft/live-room/budget-strip.tsx` (rewritten):** new `leagueBudget?: number` prop (default 200); the mockup's red-to-green gradient bar rendered instead as a steel-blue progress fill (`role="progressbar"`, `ROOM.muted25` track / `ROOM.blue` fill) computed from `remaining / leagueBudget`, clamped 0-100.
- **`src/lib/research/strategy/target-pricing.ts`:** `assignTargetPrices`'s `players` param narrowed from `ConsensusPlayer[]` to a new minimal exported interface `TargetPricingPlayer { name, position, consensusAuctionValue? }` -- both the prep-time `ConsensusPlayer` and the live room's `Player` (from `@/lib/players/types`) satisfy it structurally, no cast needed, letting the live room reuse the R6 solver directly instead of re-implementing target math. Re-exported from `src/lib/research/strategy/index.ts`.
- **`src/lib/draft/room-target-pricing.ts` (NEW):** pure $0 adapter module. `toPlayersRosterSlots()` maps the DB's `RosterSlots` (dst/ir) to the solver's `RosterSlots` (def, no ir). `computeOpenSlotTargets()` takes the active `Strategy`'s `player_targets` (sorted by weight DESC), the undrafted `ScoredPlayer[]` pool, my picks, and remaining budget; filters targets already drafted; calls `assignTargetPrices` on the still-open slots; maps each priced target back onto a specific open slot (dedicated -> FLEX -> bench, mirroring `my-team-roster.tsx`'s own fill order) for display. 7 new tests in `src/lib/draft/__tests__/room-target-pricing.test.ts` (RosterSlots mapping, null-strategy/zero-budget empty cases, dedicated-slot pricing, drafted-target dropped, FLEX fallback, fully-filled roster empty).
- **`src/components/draft/live-room/my-team-roster.tsx` (rewritten):** open roster slots now show a solver-fit target name + `~$price` in steel-blue (via `computeOpenSlotTargets`) instead of a plain "open" -- this is what replaces the removed top-of-room "Next Target" banner (confirmed already absent from the room). Any open slot is now tappable to expand up to 3 still-available alternates for that slot, ranked by the active strategy's `combinedScore`; tapping an alternate sets it on the block via the existing `onSelectPlayer` -> `setOnBlockPlayer` flow (reuses the block-picker's existing action, no new flow invented). New optional props: `activeStrategy`, `available`, `budgetRemaining`, `onSelectPlayer`.
- **`src/components/draft/live-room/auction-room.tsx`:** new `leagueBudget?: number` prop threaded to `BudgetStrip`; new `myTeamCollapsed` state with a show/hide toggle in `MyTeamRoster`'s `SectionHeader` action slot (same pattern as Tier Context's existing filter toggle); `MyTeamRoster` now wired with `activeStrategy`/`available`/`budgetRemaining`/`onSelectPlayer` (all already in scope from R11b's wiring).
- **`src/app/(app)/draft/live/client.tsx`:** `leagueBudget={league?.budget ?? 200}` passed into `AuctionDraftRoom`.

**Features assessed as already satisfied, no new code:** in-draft strategy switch re-running the $0 solver live (R11b's `handleStrategySwap` already does this) and live target/avoid toggle in-room (R11b already wired both independently) -- D6 only reskinned their existing pixels, per the build-once rule. Live-updating player card judged already structurally satisfied by the room's existing `useMemo`-based reactive architecture (the `advice` memo recomputes whenever `available`/`draftedNames`/`scarcity` change) -- this is an interpretation call, not independently re-verified this session.

**Tests:** 463/463 green (456 R12 baseline + 7 new, all in `room-target-pricing.test.ts`; no regressions).

**Gate:** type-check 0 errors (no `any`) · `npx eslint` on touched files: 0 new errors (60 pre-existing errors / 109 pre-existing warnings elsewhere in the repo, none in touched files) · `npm run build` succeeds, 56 static pages generated, no error lines. **Visual confirmation blocked** -- the Browser pane could not reach an active `/draft/live` session in this headless sandbox: `/draft/setup` hung on "Loading leagues..." indefinitely across repeated navigate/wait attempts, confirmed via `read_console_messages` (no errors, only HMR/devtools info logs), `read_network_requests` (only static-asset 200s, no visible leagues API call), and `preview_logs` (no server errors) to be a stuck client fetch rather than a runtime crash, and confirmed via this file's own R11a/R11b/R12/D5 entries above plus `BUILD_PLAN.md` line ~395 that this exact limitation was already hit and accepted by three prior sessions -- not a D6 regression. The `?sim=1` debug param does not fabricate a session (still requires an existing `state && session`), so no workaround was available without writing a fabricated session directly to Supabase, which was judged out of scope for a visual/UX task. DOM/type/test evidence stands in its place, same precedent as every prior D-track/R-track card blocked the same way.

**Ambiguity resolutions made this session:** (1) "per-slot target-at-price" required new wiring, not just recoloring -- `assignTargetPrices` had only ever been called at prep-time before this session, never from the live room; built the full `room-target-pricing.ts` adapter pipeline to close that gap. (2) The live `Strategy`'s target list is `player_targets: StrategyPlayerTarget[]` (`{player_id, player_name, weight, note?}`), not `key_targets: string[]` as an earlier note assumed (that field belongs to a different, prep-time-only type, `StrategyProposal`) -- confirmed against the real `database.types.ts` interface and sorted by `weight` DESC instead.

**Full D-track (D0-D6) is now complete.**

---

## 2026-08-17 / R12 -- Shell/UX/perf pass: real page-switch timing debunked/measured, cross-fade fix, touch-target fix

**Task:** R12. Joe flagged slow screen switches. Measure real page-switch load time between screens and apply targeted perf fixes; verify mobile-first arm's-length legibility/layout across every screen (prep hub, players, board, runs, sim results, live room). SHIELD v4 is LOCKED -- perf + mobile-verification only, no restyling. | **Class:** output | **Lenses:** Design, QA

**Measurement methodology (important root-cause finding):** an initial `setInterval`-based timing attempt read ~1000-2000ms per switch -- a false positive. Root cause: this environment's Browser pane does not actively composite frames unless focused, which throttles/pauses `setInterval`/`requestAnimationFrame` the same way Chrome throttles background tabs (confirmed independently by a failed `rAF` measurement that hung 30s and a failed `computer{action:"screenshot"}`, both erroring "not compositing frames"). Fixed by switching to event-driven instrumentation immune to timer throttling: a `history.pushState` monkey-patch (resolves synchronously) + `MutationObserver` (microtask-driven). Real numbers: **~40-70ms warm route commit**, **~150-290ms on a route's first/cold visit** -- the cold number is `next dev`/Turbopack's JIT-compile-on-first-request behavior, which does not exist in `next build` production output and is not an app-code problem to fix.

**What shipped:**
- **`src/components/layout/page-transition.tsx`:** `PageTransition`'s `AnimatePresence mode="wait"` changed to `mode="popLayout"`. `mode="wait"` serializes the swap -- the outgoing page's full exit spring finishes before the incoming page even mounts -- which is a real, measurable chunk of blocking time on every switch, and contradicts `DESIGN_SYSTEM.md`'s own "Tabs/routes spring cross-fade, never a hard cut" rule (`mode="wait"` is a sequential fade, not a crossfade). `popLayout` lets the incoming page mount and animate in while the outgoing page animates out concurrently; the exiting element is pulled out of layout flow via `position: absolute` so there's no double-height flash (`<main>` in `app-shell.tsx` already has `relative` for that to anchor against). Matches the file's own second export, `FrozenPageTransition`, which already used `popLayout` -- this was an inconsistency, not a new pattern.
- **`src/components/layout/swipe-carousel.tsx`:** the 4 bottom dot-indicator buttons (mobile section-swipe indicator) were 8x8px, under the Design lens's 44px touch-target minimum (`DESIGN_SYSTEM.md` VERIFY checklist). Fixed via `p-[18px] -m-[18px]` on the `<motion.button>` -- expands the tappable hit-box to 44x44px while the equal negative margin cancels out in layout/flex-gap terms, so the visible 8px dot (now an inner `<motion.span>`) and its 16px pitch spacing are pixel-identical to before. Verified via DOM measurement pre/post: buttons now 44x44px, inner dots still 8x8px at unchanged x-positions.
- **Mobile-first 375px pass** (DOM structure + console + network, screenshot blocked -- see below) across all 6 primary screens (prep hub, players, board, runs, sim results, live room) + settings: zero unintended horizontal overflow. The one "overflow" flagged on `/prep/simulate` is the sample-roster carousel's intentional horizontal scroll-snap, not a bug.

**Deliberately NOT fixed this session (guardrail: catalog, don't scope-creep):** sub-44px touch targets found on two prep pages are page-level, not shell-level, and fixing them safely on dense list/table screens is more than a quick win -- logged as an **R12-fix follow-up card** in `BUILD_PLAN.md`: `/prep/players` (~14 instances, icon buttons ~36px + position filter pills ~32-45px) and `/prep/board` (~21 instances). `/draft/live` could not be rendered live in this session (no active draft session available in the test environment) and is out of scope for R12 regardless (D6's territory, separately design-gated) -- also logged in the same follow-up card.

**Tests:** 456/456 green, no regressions (no test files touched -- pure CSS/animation-mode changes).

**Gate:** type-check 0 errors · `npx eslint` scoped to the 2 touched files: 2 pre-existing unused-var warnings on an untouched line (confirmed via `git diff --stat` the edit never touched that line), 0 new · full-repo lint unchanged at 60 pre-existing errors / 109 pre-existing warnings (none in the touched files) · `npm run build` succeeds, full route list compiles clean (`/draft`, `/draft/live`, `/draft/review`, `/draft/setup`, `/prep`, `/prep/board`, `/prep/configure`, `/prep/players`, `/prep/runs`, `/prep/simulate`, `/prep/strategies`, `/settings`, `ƒ Proxy (Middleware)`, no error lines). **Pixel screenshot blocked** -- Browser pane not compositing frames in this headless session (same env constraint as R5/R6/R10b/D5/R11a); DOM/network/timing evidence stands in its place. **One honest measurement caveat:** a post-fix DOM-mount timing check did not show a clean before/after delta (DOM insertion was already fast under both `AnimatePresence` modes for unrelated reasons) -- the `mode="wait"`->`"popLayout"` fix's actual benefit is in *when the enter animation starts playing*, not DOM-mount time, which this metric structurally can't isolate; the code change is justified on correctness/design-system-alignment grounds (matches `FrozenPageTransition`'s existing precedent + the documented crossfade rule) independent of that specific metric.

---

## 2026-08-17 / R11b-fix -- Avoid default reconciled to soft across live advice, sim, and solver

**Task:** Post-verification fixes on R11b (`9c4b68f`). The independent audit found the live what-to-do path defaulted an avoid tag with no explicit severity to `'hard'` (force PASS), while the sim (`sim-results.ts`) and solver (via `buildMyBiasFromTags`) defaulted the same unset severity to `'soft'` (discount only). Because a quick-tapped avoid never sends a severity (`use-user-tags.ts` PATCH body omits it; `api/user-tags/route.ts` only writes `tag_severity` when provided), the default governed EVERY toggled avoid, not a legacy edge -- so the live advisor would say PASS on a player the sim still graded as draftable-at-a-discount. **Joe ruling 2026-08-17: soft everywhere.** | **Class:** pipeline/bugfix | **Lenses:** QA

**What changed:**
- **`src/app/(app)/draft/live/client.tsx`:** `avoidSeverity()` now returns `'soft'` for an avoided player whose severity is unset (was `'hard'`), matching the sim + solver.
- **`src/lib/draft/what-to-do.ts`:** `hardAvoid` gate changed from `(avoidSeverity ?? 'hard') === 'hard'` to `avoidSeverity === 'hard'` -- only an explicit hard avoid forces PASS; unset defaults to the soft discount path. Interface + inline comments updated.
- **`src/lib/draft/__tests__/what-to-do.test.ts`:** three tests that encoded the old hard default rewritten to the decided soft behavior (a plain/unset avoid now flows through at a discounted cap, not an automatic PASS); explicit-hard PASS regressions retained.
- **`.claude/CHANGELOG.md`:** restored the D2 (2026-08-15) entry's "Design ref: Linear mobile home (...)" phrase that R11b's commit had inadvertently rewritten (audit-trail integrity; out-of-scope hunk reverted).

**Gate:** type-check 0 errors · `npx eslint` on touched files 0 errors · `npm run test:run` green · build clean.

---

## 2026-08-17 / R11a -- Live draft: offline cache + resync (mid-draft network drop no longer loses picks)

**Task:** R11a. Root cause: zero localStorage usage existed anywhere in the draft path -- a mid-draft network drop went straight to a dead error screen (`use-live-draft-data.ts`'s fetch had no fallback) and a failed pick-save PATCH was silently swallowed with no retry and no durability (`use-draft-state.ts`'s `persistPicks` never even checked `res.ok`). Build a local offline cache + resync path so this can't happen; resolve any remaining `/draft/live` dead-screen root cause if R1 deferred it (none was found open). $0 pure client/state logic, no paid calls. | **Class:** pipeline | **Lenses:** Architecture, QA, Security

**What shipped:**
- **`src/lib/draft/offline-cache.ts` (NEW):** pure, $0, localStorage-backed cache module. `saveSessionCache`/`loadSessionCache` round-trip the last-fetched `DraftSession`+`League`. `saveDraftStateCache`/`loadDraftStateCache` round-trip the full live `DraftState` with a `synced: boolean` flag. `clearDraftCache` removes both. All reads/writes go through `safeGet`/`safeSet`/`safeRemove`, guarded so SSR (`typeof window === 'undefined'`), disabled/private-browsing localStorage, quota-exceeded, and corrupt JSON all degrade to "no cache" rather than throwing. `resolveInitialDraftState(replayed, cached, offline)` is the resolution policy: no cache -> server wins; offline -> cache wins outright (only source that can reflect picks made since the last sync); online -> whichever of {server, cache} has strictly more picks wins. Documented as a simple pick-count heuristic, not a CRDT/merge -- adequate for a single-user personal tool where the server is the eventual system of record whenever reachable.
- **`src/hooks/use-live-draft-data.ts`:** on load, a successful fetch now write-throughs to `saveSessionCache`. On failure, `err instanceof TypeError` distinguishes a genuine network failure (fetch itself couldn't reach the server -- offline, DNS, connection refused) from a reached-server HTTP error (404 session-not-found, 500) -- only the former falls back to `loadSessionCache`, so the cache can never mask a real "this session doesn't exist" error. New `usingCachedData` return value flags when the room is running off cache.
- **`src/hooks/use-draft-state.ts`:** init effect now hydrates via `loadDraftStateCache` + `resolveInitialDraftState` against the server-replayed state, seeded by the `usingCachedData` signal from the data hook. `persistPicks` rewritten: write-through cache with `synced:false` BEFORE the network call (so a reload mid-request, or a request that never completes, still has the picks locally), a `res.ok` check that was previously missing entirely, `synced:true` on confirmed success, `syncStatus:'offline'` on failure. New `DraftSyncStatus` (`'synced'|'pending'|'offline'`) exported. New resync effect: while `syncStatus !== 'synced'`, retries `persistPicks` on a fixed 5s interval (`RESYNC_RETRY_MS`) plus immediately on the browser's `online` event -- fixed interval rather than the exponential backoff `use-remote-auctioneer-feed.ts` uses, since that hook polls a third-party service and this one is our own low-traffic backend.
- **`src/app/(app)/draft/live/client.tsx`:** new banner shown whenever `usingCachedData || syncStatus !== 'synced'`, reading "Offline - showing cached draft" (session itself is from cache) or "Syncing pick to server..." / "The last pick could not reach the server. It is saved on this device and will retry automatically." (a write is pending/failed). Placed above the existing FF-315 auctioneer-reconciliation banner; distinct concern -- FF-315 reconciles the auctioneer's picks against ours, this reconciles our own backend's durability.
- **`src/lib/draft/__tests__/offline-cache.test.ts` (NEW):** 15 tests -- session-cache round-trip/isolation-by-id/corrupt-JSON/null-league, draft-state-cache round-trip/corrupt-JSON/invalid-picks-array/clear/quota-exceeded-swallowed, and all 4 `resolveInitialDraftState` branches (no-cache, offline-trusts-cache, online-cache-ahead, online-server-caught-up).

**Tests:** 456/456 green (441 baseline + 15 new, all in `offline-cache.test.ts`; no regressions). Hooks themselves are untested directly, matching this repo's existing convention (no `src/hooks/__tests__/` directory exists for any hook) -- the pure cache/resolution logic they call is fully covered instead.

**Gate:** type-check 0 errors · `npx eslint` on all 5 touched/new files: 17 problems, 0 errors, 17 warnings -- confirmed via a `git stash` baseline diff that every single one pre-existed (15 pre-existing unused-import/var warnings in `client.tsx`, 2 pre-existing warnings in `use-draft-state.ts`); the baseline additionally had a `prefer-const` **error** on the old `let replayed = initial` pattern that this session's rewrite (`initial` is now genuinely reassigned in the replay loop) incidentally fixed · build succeeds cleanly (`✓ Compiled successfully`, all routes compile). **Live-verified on the already-running dev server (port 3003; this session's own `next dev` could not co-run -- Next 16 locks one dev server per project directory regardless of port):** the sim mode's demo session PATCHes `/api/draft/sessions/demo`, which 404s by design -- a ready-made live offline test bed. Running the sim produced the "Syncing pick to server..." banner rendering live in the DOM with the exact expected body text; the network log showed 20+ real repeated `PATCH /api/draft/sessions/demo -> 404 Not Found` calls, proving the 5s resync interval genuinely fires rather than being dead code; and `JSON.parse(localStorage.getItem('ffi-draft-state-cache:demo'))` read back `{synced:false, picks:18, savedAt:"2026-08-18T04:11:33.160Z"}`, proving the write-through cache captures every pick locally even while every server write keeps failing. **Pixel screenshot blocked** -- the Browser pane is not compositing frames in this headless session (same env constraint as R5/R6/R10b/D5); DOM/network/localStorage evidence stands in its place. **One honest gap:** the reload-restores-from-cache branch of `resolveInitialDraftState` (offline reload -> cache wins) is proven by its 4 unit tests rather than live browser, since `?sim=1` injects a hardcoded `DEMO_SESSION`/`DEMO_LEAGUE` that bypasses the real `fetch('/api/draft/sessions/:id')` path that branch guards -- there is no real session id available in this environment to drive that path live.

**Noticed but out of scope, not touched:** a pre-existing console error unrelated to this session's files -- `[useUserTags] Error: invalid input syntax for type uuid: "demo-league"` (a 500 because the demo session's hardcoded `league_id` of `'demo-league'` isn't a real UUID). Also noticed R11b ("team-aware in-room guidance") had already landed on `master` via a separate concurrent session before this one finished -- not reviewed or touched here, see the R11b entry below.

**Unblocks:** D6 (live room visual + UX pass), alongside R11b -- neither R11a nor R11b touch D6's pixels scope.

---

## 2026-08-17 / R11b -- Live draft: team-aware in-room guidance (adaptive pivot + strategy strip + target/avoid + DEC-1 wired live)

**Task:** R11b. Wire R9's `adaptive-guidance.ts` pivot line into the live room (it was built but never surfaced); make target AND avoid independently settable during the draft (today only target toggled, only on the Research tab); surface an always-reachable strategy display + quick switcher instead of burying it in the closed-by-default "More tools" accordion. DEC-1 verification: confirm the solver + what-to-do path honor Joe's targets/avoids at a bounded weight; fix here if not. Behavior only -- the six visual/UX pixels (FLEX tier row, collapsible cards, live-updating values) stay out of scope, they land in D6. | **Class:** pipeline | **Lenses:** Architecture, QA, Security

**What shipped:**
- **`src/components/draft/live-room/research-view.tsx`:** `PlayerRow`'s single ambiguous star/x toggle split into two independent buttons -- a gold ★ (target) and a red ✗ (avoid) -- each with its own `aria-pressed`/`aria-label` and its own `onClick` calling the generic `toggle(id, tag)`. New `onToggleAvoid` prop threaded through `ResearchViewProps`.
- **`src/components/draft/live-room/on-the-block-card.tsx`:** the previously read-only `★ TARGET` / `AVOID` badges on the hero card became tappable buttons, mirroring the same independent-toggle pattern, so target/avoid are settable from the on-block card too, not just Research.
- **`src/components/draft/live-room/auction-room.tsx`:** new `<StrategyStrip>` rendered between `AwarenessStrip` and `BudgetStrip` -- always visible, not behind an accordion. Renders the active/switchable `DbStrategy` list plus R9's `adaptive-guidance` pivot line. `AuctionRoomProps` extended with `avoidSeverity`, `onToggleAvoid`, `pivot`, `activeStrategy`, `strategies`, `onSwitchStrategy`. The `advice` memo (`computeWhatToDo` call) now passes `avoidSeverity` through (DEC-1's soft/hard discount path).
- **`src/app/(app)/draft/live/client.tsx`:** new `onToggleAvoid` callback (mirrors the existing `onToggleTarget`) and `avoidSeverity` accessor reading `userTagsMap`. New `adaptiveGuidance` memo calls `computeAdaptiveGuidance(state, myMgr, players)` and feeds `.pivot` into the room. `buildSolverInput()` now receives `userTagsMap` so the solver's own selection priority also honors DEC-1, not just the live max-bid advisor.
- **DEC-1 verification result: the ruling was NOT honored before this session.** `roster-solver.ts` and `what-to-do.ts` had no bias path at all. Fixed to mirror R10b's already-shipped `sim-engine.ts` pattern: `TARGET_MAX_BOOST = 0.35` (scaled by weight 1-10), `SOFT_AVOID_FACTOR = 0.5`, hard avoid skipped entirely. Unit-tested in `roster-solver.test.ts` + `what-to-do.test.ts`, then wired end-to-end live this session (previously fixed only at the pure-logic level, never connected to the room).
- **`src/components/draft/live-room/__tests__/on-the-block-card.test.tsx`:** updated both `render()` calls for the two newly-required props (`onToggleTarget`, `onToggleAvoid`).

**Tests:** 441/441 green (417 baseline + 24, split across the R10b-session DEC-1 unit tests and this session's wiring; no test regressions).

**Gate:** type-check 0 errors (no `any`) · `npx eslint` on all 11 touched files: 0 errors, 15 pre-existing unrelated unused-import warnings in `client.tsx` · build succeeds cleanly, all routes compile. **Live-verified on the already-running dev server (port 3003; this session's own `next dev` could not co-run -- Next 16 locks one dev server per project directory regardless of port):** the StrategyStrip and pivot line render in the always-visible draft view ("On plan. Balanced Auction still fits your budget: target Trey Lance, Gardner Minshew II, Quinn Ewers."), confirmed above Tier Context and NOT inside the separately-labeled "More tools"/"Hide tools" accordion. Both target and avoid buttons confirmed present and independently wired on Research rows (DOM: "Add Trey Lance to targets" / "Add Trey Lance to avoids" as two separate buttons per row) and on the on-the-block hero card (clicking each fired its own distinct `PATCH /api/user-tags` network request). **Honest gap:** the write's persistence could not be captured live -- the verification browser tab carries no Supabase auth session (`localStorage` keys and `document.cookie` both checked, no auth data present), so every PATCH, old target-only path and new avoid path alike, 500s identically on the database's `user_id` not-null constraint. Confirmed via code read of `src/app/api/user-tags/route.ts` that this is a pure auth/environment gap and not a code defect: the endpoint has no dev-mode bypass that sets `user_id` for an anonymous request (DEV_MODE only swaps which Supabase client is used, it does not supply a user id on insert), and the pre-existing, unmodified target-toggle flow fails in the exact same way on the exact same endpoint. Real-session persistence proof deferred to R15 (the rehearsal gate, which needs Joe's authenticated hands regardless).

**Unblocks:** D6 (live room visual + UX pass) -- its remaining scope narrows to FLEX tier row + T4/T5, collapsible My Team + on-block card, and live-updating player values; the strategy switcher, adaptive pivot, and target/avoid toggles are already wired here and D6 only needs to reskin their pixels.

---

## 2026-08-17 / D5 -- Sim results screen restyled to SHIELD (winning-team-% bars + roster carousel)

**Task:** D5. Restyle `/prep/simulate` into the approved SHIELD look, consuming R10b's real grading/record/top-5/frequency data. New: winning-team-% bars (winning shapes only, not raw roster frequency), an up-to-5 sample-roster carousel, and a collapsible no-em-dash narrative, on top of the existing projected-record card, players-you-land-most table, and saved runs. Visual pass only, no engine/grading changes. | **Class:** output | **Lenses:** Design, QA

**What shipped:**
- **`src/components/prep/sim-results-cards.tsx` (NEW):** SHIELD presentational layer, no Monte-Carlo math, no network calls. `SimRecordHero` (elevated hero card, real modal record + mean stat grid + range footer). `deriveWinningTeamLanded` + `SimWinningTeamPlayers` (the new winning-team-% bars): re-aggregates R10b's already-exposed `topRosters` to shapes whose `avgWins` clears the headline modal-record win threshold, weighted by each shape's real `frequencyPct`, normalized to a share. This is deliberately narrower than the raw all-sims `landed` list per the "winning teams only" requirement. Coverage caveat (stated in the UI subtitle and code comments): limited to the up-to-5 modal shapes R10b already surfaces to the client, not every individual sim run, because `SimSummary` does not expose raw per-run rosters (an engine change would be needed for full per-run coverage, out of scope for D5). `SimRosterCarousel` (up-to-5 sample rosters, horizontal scroll-snap, prev/next controls). `SimLandedTable` (players-you-land-most as a row list, not an HTML table, per DESIGN_SYSTEM.md). `SimNarrative` (collapsible, built only from real passed data, zero em/en dashes). `SimCompareRows` (saved-run comparison as a CSS grid, replacing the old `<table>`). `SimSavedRunsList` (restyled saved-runs list).
- **`src/app/(app)/prep/simulate/client.tsx`:** rewired to the new components; data wiring (fetches, handlers, state) unchanged. "Run N sims" promoted from `.ffi-btn-primary` to `.ffi-btn-hero` (red = the moment, per DESIGN_SYSTEM.md's canonical example). Informational percentages moved off brick-red onto steel-blue-bright (red is action-only in SHIELD, not routine stats).
- **`src/app/(app)/prep/simulate/page.tsx`:** heading swapped to `ffi-display-lg` + ink-2 subtitle token, matching the D2-D4 header pattern.

**Tests:** 12 new (`src/components/prep/__tests__/sim-results-cards.test.tsx`), including 3 covering `deriveWinningTeamLanded`'s winning-teams-only behavior (excludes below-threshold shapes, weights by real frequencyPct, never fabricates a result when no shape qualifies). **429/429 green** (417 baseline +12).

**Gate:** type-check 0 errors · lint 0 new on the 4 touched files · build succeeds (Turbopack, all 56 routes, `/prep/simulate` static). **Live-verified** with a real 30-sim run on the already-running port-3003 dev server, opened in a fresh browser tab (this session's own `next dev` could not co-run on any port -- Next 16 locks one dev server per project directory regardless of port; verified via real connected DOM, network, and console instead): 14-0 projected record (70% of sims, range 11-3 to 14-0), winning-team-% bars with real player names and shares (Amon-Ra St. Brown/Bijan Robinson/Brock Bowers etc. at 100%, CeeDee Lamb/Jonathan Taylor/Josh Allen at 84.6%), 5-shape sample-roster carousel with real player/team names and $, players-you-land-most table, narrative expand/collapse with real sentences, saved-run load producing a live compare + full loaded-run detail render, network calls to `/api/sim-runs*` returning 200 OK, zero em/en dashes confirmed by a regex scan of the full rendered page text, and no page-level horizontal overflow at 375px (the roster carousel scrolls within its own container, not the page). **Pixel screenshot blocked** -- the Browser pane is not compositing frames in this headless session (same env constraint as R5/R6/R9/R10b); DOM/network/console evidence stands in its place, not faked.

## 2026-08-17 / R10b -- Sim grading, projected record, top-5 modal rosters, players-you-land-most + saved runs (DEC-1 = BIAS)

**Task:** R10b. Post-processing + persistence on top of the R10a Monte-Carlo engine: grade each run on real projected season points vs the league → a projected win-loss record; surface the top-5 most-LIKELY (modal) rosters clustered by stud core; a "players you land most" frequency table; and saved runs (persist/reload/compare). DEC-1 ruled BIAS, so the sim "me" seat now leans toward Joe's graded targets/avoids at a bounded weight; the 11 opponents stay on generic ceiling valuation. Scope = DATA (the pixels are D5). | **Class:** output/pipeline | **Lenses:** Architecture, QA, Security, Delivery

**What shipped:**
- **`src/lib/draft/sim-grade.ts` (NEW, pure $0):** `bestLineupPoints` fills the Nasties starting lineup (QB/RB/WR/TE dedicated, then FLEX from the best leftover RB/WR/TE) and scores it on real projected points, missing slots = 0. `gradeRun` ranks that lineup vs the league (winProb = (numManagers-rank)/(numManagers-1)) → projected wins over a 14-game season. `summarizeGrades` (mean/modal record, best/worst). `studCore` clusters a roster by players won at/above a $-threshold (`DEFAULT_STUD_THRESHOLD=10`; the $1 bench fill is noise). `topModalRosters` returns the 5 most-frequent stud-core shapes, tie-broken on avg starter points. `playersYouLandMost` tallies land-rate + avg $.
- **`src/lib/draft/sim-results.ts` (NEW, pure $0):** `buildMyBiasFromTags` maps graded `user_tags` → a bounded me-seat bias (avoid→severity hard/soft, target→weight clamped 1-10, untagged omitted). `buildSimSummary` orchestrates run→grade→cluster→frequency into a `SimSummary`. `toPersistedSim` trims (drops per-run grades, caps landed list) for storage. `SIM_RUN_KIND='sim'`, `DEFAULT_REGULAR_SEASON_GAMES=14`.
- **DEC-1 = BIAS wired in `sim-engine.ts`** me-seat branch ONLY: target lift ≤ `TARGET_MAX_BOOST=0.35` scaled by weight/10; soft avoid ×`SOFT_AVOID_FACTOR=0.5`; hard avoid skipped. Applied AFTER the RNG draw, so determinism-under-seed and the 11 generic-ceiling opponents are byte-identical to R10a. `SimWonPlayer` gains `projectedPoints`.
- **Real projected points carried through:** `roster-solver.ts` `BoardPlayer.projectedPoints?` (optional; the solver ignores it), set in `solver-bridge.ts`, echoed on the sim award — so grading scores real points, not the $-ceiling proxy.
- **`src/app/api/sim-runs/` (NEW):** POST save / GET list / GET `[id]` detail. Persists to `research_runs` behind a `strategy_settings.kind='sim'` discriminator — NO migration. `api/research/route.ts` GET now excludes sim rows (null-tolerant `.or`) so they never appear on `/prep/runs`.
- **`src/app/(app)/prep/simulate/client.tsx` rewritten:** loads leagues + players + graded tags, builds the board (top-240 by ceiling) + bias, runs `buildSimSummary`, renders the projected-record card, top-5 modal rosters, and players-you-land-most; saves via POST and reloads/compares saved runs. (Pixels are D5; this wires the data.)

**Tests:** 45 new (`sim-grade.test.ts`, `sim-results.test.ts`, + 6 DEC-1 bias tests in `sim-engine.test.ts`: hard avoid never drafted, opponent still lands a hard-avoided stud, target lift never reduces / flips never→sometimes, soft avoid ≤ base, deterministic under seed, carries projectedPoints). **417/417 green** (372 baseline +45).

**Gate:** type-check 0 errors · lint 0 on R10b files (exit 0; 61 pre-existing errors all in untouched files) · build ✓ Compiled successfully (`/api/sim-runs` + `/api/sim-runs/[id]` registered). **Live-verified on the running dev server (port 3003):** 30 sims → projected record 14-0 (70% of sims, range 11-3→14-0, avg 13.4 wins, avg rank #1.4), top-5 stud-core clustering (Shape 1 = 23.3%, 7 of 30), players-you-land-most (Amon-Ra/Bijan/CMC 100%), Save → POST /api/sim-runs 200 → row read back into the Saved-runs list. **Pixel screenshot BLOCKED** — the Browser pane is not compositing frames in this headless session (same env constraint as R5/R6/R9/D4-note); proof is real connected DOM + network traces pasted in-chat, not faked. **Root cause note:** the pre-existing unchunked `useUserTags` batch fetch 500s once on cold compile then recovers; the "0 graded players biasing your seat" readout is honest (this dev league has zero graded tags), and the DEC-1 engine itself is covered by the 6 bias tests.

**Unblocks:** D5 (Sim results screen) — it restyles this data path to the SHIELD look.

---

## 2026-08-16 / D4 -- Players card redesign: thin rows, tier on the card face, points demoted

**Task:** D4. 4th attempt after 3 rejected mockups. Thin the Players list cards from 130-160px to a single ~50px line; put the expert-consensus **tier on the card face** (absent today); demote projected points into the expansion; keep the base/mkt/your-value range bar Joe likes; add expert positional consensus shown in plain English (no "ECR"). UI only, no engine changes. Ref: NFL broadcast lower-thirds / EA Sports FC. | **Class:** output | **Lenses:** Design, QA

**What shipped (`src/components/prep/ffi-player-intel-card.tsx`, full rewrite):**
- **Compact row = one ~50px line:** color rail (3px, position color) + position chip (position + positional rank) | mixed-case name + team · BYE meta | tier badge | value range with base underneath | chevron. Grid `30px minmax(0,1fr) auto 16px`. **Removed from the compact face:** the headshot, the `.toUpperCase()` all-caps names, the recommendation strip, the range bar, and the "Your value" label — all per the hard-won failed-session constraints.
- **Tier on the card face** from `player.expertTier`: T1 = brick-red (`#A63C41`) filled badge with glow (elite — the one RED signal), T2 = steel-blue outline, T3+ = muted steel outline. This is the single most-important signal getting its own loud treatment instead of collapsing into the blue tonal family.
- **Position chips** from a `POS_CHIP` map (RB green `#56e0a0`, WR blue `#6ca8ff`, QB pink `#ff6e8a`, TE orange `#ffb05c`) + a muted steel fallback for DEF/K (no token today).
- **Expansion reorganized into labeled groups:** HERO (chip + name + tier + Your value + collapse) → **Valuation** (range bar room/base/worth from the league-calibrated band, `isTax` red fill; 3-col Market / Proj Pts / Experts strip — expert positional rank rendered plainly as e.g. "RB2", never "ECR") → **Outlook** (plain-English rec line + solver `fitLine`) → **Draft Intel** (user TARGET/AVOID + system tags with dismiss/restore) → **Your Call** (Target/Avoid buttons + Priority stepper / Severity soft-hard graders) → **How this value is calculated** (Info toggle: range provenance + per-tag sources + projection). Projected points now live here, not on the face.
- **`src/components/prep/__tests__/ffi-player-intel-card-fitline.test.tsx`** — updated `renderCard` to render the card open (`isExpanded ?? true`) since the solver fitLine moved from always-visible to the expansion. The fitLine-reaches-DOM guard is preserved; only its location changed. 3 previously-failing presence tests pass again.
- **Zero em/en-dashes** anywhere in the file (hyphens only), including JSX comments, per Joe's global policy.

**Proof:** `vitest run` **392/392** green · changed-file lint clean (`npx eslint` on the 2 files = exit 0; the 61 project-wide lint errors are all pre-existing in untouched `src/lib/research/*` + `src/lib/supabase/*`) · `npm run build` **✓ Compiled successfully** (no `/d4preview` route — temp harness removed). Two live 390px real-Chrome screenshots via a temporary auth-free `/d4preview` harness mounting the REAL component with real-shaped fixtures (harness deleted after capture): (1) expanded McCaffrey card showing all five groups with real Kanit/Hanken/JetBrains fonts, range bar room $70 / base $77 / worth $83, Market ~$52 / Proj Pts 347 / Experts RB2; (2) all 8 collapsed rows proving tier variety (T1 red glow on Gibbs/Puka/McCaffrey/St. Brown, T2 blue outline on Jefferson/Allen, T3/T4 muted on Bowers/Ravens) and the position-color chips. $0, no paid API calls.

---

## 2026-08-15 / D3 -- Strategies redesign: auto-rank, expandable rows, persistent star ratings

**Task:** D3. Kill the cost-gated Generate button and the Dry-run page link. Auto-render strategies on load sorted by objective strength. Per-strategy expandable detail. Persistent user star-ratings keyed on archetype so they survive re-generate and re-pull. Schema add: `user_strategy_ratings`. | **Class:** output/schema | **Lenses:** Design, QA, Security, Ops

**What shipped:**

- **`supabase/migrations/20260815000001_user_strategy_ratings.sql`** — new table: `id`, `user_id`, `league_id`, `archetype`, `rating INTEGER`, `created_at`, `updated_at`. UNIQUE(user_id, league_id, archetype) so ratings survive re-generate. CHECK(rating BETWEEN 1 AND 5). RLS policy `usr_strategy_ratings_own` (FOR ALL TO authenticated USING auth.uid() = user_id). Index on (user_id, league_id).
- **`src/app/api/strategies/ratings/route.ts`** (new) — GET `?leagueId=` returns `{ratings: [{archetype, rating}]}`. POST `{leagueId, archetype, rating}` upserts (rating=0 deletes). Same `getClient()` DEV_MODE / server-client pattern as other strategy routes. Input validation: rating must be integer 0-5.
- **`src/lib/supabase/database.types.ts`** — added `UserStrategyRatings` + `UserStrategyRatingsInsert` interfaces after `UserRuleUpdate`.
- **`src/components/prep/strategy-proposals.tsx`** (full rewrite) — auto-fetches on mount via `useEffect` + `fetchedRef` guard; simultaneously fetches ratings. Sorts proposals by `projected_ceiling` DESC. Ranked `RankedRow` components: rank badge (red #1), name + archetype chip, strength bar + score, 5-star read display, chevron. Expanded panel: HOW TO APPROACH (philosophy), PLAYER TYPES TO TARGET (derived from `budget_allocation`/`position_weights` with pos color dots and $amount labels), PLAYERS YOU LIKELY CAN'T GET (key_avoids, up to 3, red-tinted rows), STRENGTH VS LEAGUE (score + floor/ceiling + risk_tolerance), YOUR RATING (interactive 5-star, click-again to clear). Use button on #1 row header + in every expanded panel. Quiet "Regenerate strategies" text button at bottom.
- **`src/app/(app)/prep/strategies/client.tsx`** — Dry-run link (lines 391-406) removed; `PlayCircle` import removed.
- **Ranking key:** `projected_ceiling` DESC (R9 board-derived, objective, $0). MC per-strategy ranking deferred to R10b (no per-strategy me-seat weighting in `SimEngineInput`; see BUILD_PLAN R10b enhancement note).
- **Functional gap (confirmed + logged):** a player pull on `/prep` calls `load()` only; it does NOT call POST `/api/strategies/propose`. Strategy proposals on `/prep/strategies` reflect the pool that was current when the page was FIRST mounted, not the latest pull. Fix target: R10b or a D3-fix. Manual "Regenerate strategies" button is the current workaround.

**Proof:** `tsc --noEmit` 0 errors; `vitest run` 392/392 green; `eslint` on all 4 changed files 0 errors 0 warnings; `npm run build` clean (`/api/strategies/ratings` in route list). 375px screenshot `.claude/mockups/d3_strategies_375.png` (headless Chrome render of approved mockup). $0, no paid API calls.

---

## 2026-08-15 / D2 -- Research landing: hierarchy flip (destinations = heroes, Run demoted)

**Task:** D2. Reconnaissance of the live `/prep` found the spec's premise ("card-dump + paragraph explainer") was already partly outdated — the hub had been restructured to one-hero + quiet jump-rows, but with the hierarchy BACKWARDS: the AI Research Run (used 2-4x/year) was the hero, and the 4 destinations Joe actually lives in for weeks were demoted rows. Reframed D2 as **flip the hierarchy**, not "replace a card dump." Design ref: Linear mobile home (row destinations, quiet labels, one accent, subordinate utilities). Rows not a card grid (Joe's FF UI rule). Approved mockup `d2_research_landing_v1.html`. | **Class:** output | **Lenses:** Design, QA

**What shipped (`src/app/(app)/prep/page.tsx`, full rewrite):**
- **"Where you work" — 4 destination hero rows** (rich rows, red identity chip + Oswald red title + red left accent bar + chevron), each with a REAL glanceable metric, gracefully absent when data is missing (no fabricated numbers):
  - **Players** → `/prep/players` — pool count from `/api/players/status` (live: 3,148 in pool).
  - **Cheat Sheet** → `/prep/board` — "#1 {lastName}" from the latest completed run's top target.
  - **Strategies** → `/prep/strategies` — saved-strategy count from a **new** `GET /api/strategies?leagueId=` fetch added to `load()`.
  - **Sims** → `/prep/simulate` — "New" badge (new destination, added this pass).
- **"Latest run highlights"** — the existing target/avoid position-colored chip cards, kept, shown only when a completed run exists.
- **"Data" — demoted Player Pull strip:** the old hero Research Run panel, renamed **Player Pull** and moved to the bottom. Shows freshness (Fresh steel-green / Stale amber) + last-updated date, one plain line of what a pull produces (projections, injury & starting roles, consensus ranks, auction values, tiers, sleepers/breakouts/busts), and the **preserved cost-guard**: inline confirm ("Pulls fresh data... 30-60s. No AI credits used.") → "Run pull", footnote "Free data pull · no AI credits". `runState` idle/confirm/running + `runError` logic carried over intact. Removed the now-unused `relTime` helper.

**Proof (live running app, real data):** started preview on :3003, loaded `/prep` — read_page + JS both confirmed real connected data (Joe signed in, 3,148 pool, "updated Aug 11 · Stale", THE NASTIES). JS measured **zero horizontal overflow at 375px** (docScrollWidth 375 == clientWidth, first row right edge 359 < 375). Clean 375px mobile capture via iframe wrapper: `scratchpad/prep_frame.png` (the preview pane wasn't displayed so live compositing/headless-mobile emulation both failed; iframe forces the 375 layout). Desktop render (sidebar layout) also clean: `scratchpad/prep_live2.png`.

**Gate:** `tsc --noEmit` clean · `vitest run` **392/392** · `eslint` on the file clean (0 warnings after removing `relTime`) · `npm run build` clean (`/prep` prerenders static). $0, no paid calls.

---

## 2026-08-15 / D1-fix -- Header treatment: Oswald in solid red (Joe redirect)

**Task:** Joe rejected the D1 headers twice — first the flat-white titles ("look terrible, might be the font"), then the chrome-silver/red emboss I tried as a fix ("too plain" earlier, "embossed I didn't like" now). Reset: showed an 8-way font+finish board on the Shield field, no emboss. Joe picked **Oswald in red**. | **Class:** shared/output | **Lenses:** Design, QA

**What shipped:**
- **`src/app/layout.tsx`** — added **Oswald** via `next/font/google` on a new stable var `--font-oswald`, scoped to headers only (labels/pills/names stay on Kanit).
- **`src/app/globals.css`** — redefined `.ffi-title-red` as **Oswald, solid brick-red `#C25A5E`, no emboss / no gradient / no text-shadow**. Removed the rejected `.ffi-title-silver` bevel + the red gradient-emboss entirely.
- **Page-title sweep (14 screens)** — every `<h1>` page title converted to `.ffi-title-red`, old inline `var(--font-cond)`/`var(--ffi-ink)` and hardcoded `text-[#deedf9]`/`text-white` removed so Oswald+red wins: prep hub, board, players, strategies, simulate; draft, draft/setup, draft/review; season + start-sit/matchups/waivers/trade; settings. Existing per-screen size/case preserved (season stays uppercase). On `/prep`, the hero title + 3 jump-row section titles are also red.
- **`.claude/DESIGN_SYSTEM.md`** — headers reconciled: Oswald solid red is the locked header treatment; the "red is SPARING" rule now explicitly exempts headers (red = header identity + sparing body action); chrome-silver reassigned to player names/stat readouts only.

**Proof (mobile arm's-length headless renders):** `.claude/mockups/d0-craft/d1_prep_oswald_red.png` (/prep), `roll_season.png` ("IN-SEASON COMMAND"), `roll_prep_players.png` ("Players") — all page titles Oswald red; player names/chips/stats untouched. Option board: `header_options.png`.

**Gate:** `tsc --noEmit` clean; `eslint` on touched files 0 new (the 1 error + warnings are pre-existing, on lines not touched). $0, no paid calls.

**Section-header sweep (same day, Joe: "sweep the section sub-headers red too"):**
- **`src/components/ui/ffi-primitives.tsx`** — `FFISectionHeader` `<h2>` changed from `ffi-display-md text-white` to `ffi-title-red ffi-display-md`. One edit flips every real section header app-wide (draft/setup "Live Draft", draft/live, prep/simulate, + parked season screens).
- **`prep/runs`** ("Run History") and **`prep/configure`** ("League Config") page-level `<h2>`s → `.ffi-title-red`.
- Deliberately NOT reddened: eyebrow labels (small uppercase muted), card/item names (strategy card titles, player names, `var(--font-cond)` Kanit ink), countdowns. Proof: `sub_draft_setup.png` (title + section both red, "LEAGUE" eyebrow stays grey), `sub_prep_configure.png`.
- **Still white — open question for Joe:** card-INTERNAL group titles ("League Details", "Roster Slots") — a finer tier inside cards/forms, ~app-wide. Not swept unprompted; flagged for his call.

**Green/gold tail:** icon/position literals (`#2ff801` green, gold accents) on season/players/parked screens remain the separate D2+ component-literal sweep. Untouched here.

---

## 2026-08-15 / D2 green sweep (part 1) — neon green → steel-blue, live screens

**Task:** Joe: "start the green and gold sweep." Boundary first — the Shield palette KEEPS greens/golds on purpose (position colors `--ffi-pos-rb #56E0A0`, the live-room four-move system `ROOM.gold`/lime/`#22c55e`). The slop is the old pre-Shield neon `#2ff801`. Direction board (`green_sweep_direction.png`) offered green vs steel-blue vs brick-red on the real card motifs; **Joe picked steel-blue** (Shield: "success reads steel-blue, never red" + red stays sparing). **Scope: Joe picked live screens only** — skip the parked season/inseason screens (they get Shield in the P8 rebuild). | **Class:** shared/output | **Lenses:** Design, QA

**What shipped (4 live files, ~42 spots):**
- **`src/components/prep/ffi-player-intel-card.tsx`** (19) — target/elite/value/range/stepper accents `#2ff801` → `#5FA8E0`, glows `rgba(47,248,1,x)` → `rgba(95,168,224,x)`.
- **`src/components/draft/ffi-player-card.tsx`** (7) — target highlights + glows → steel-blue.
- **`src/components/draft/ffi-ai-insight.tsx`** (4) — good/default confidence → steel-blue; paired dark-green chip bg `#106e00/30` → `#5FA8E0/15`.
- **`src/app/(app)/draft/setup/client.tsx`** (11) — selected-format / checkmark / active-mode states → steel-blue.

**Held for a separate gold/status decision (NOT swept):**
- **`connection-status-pill.tsx`** LIVE green — it's a LIVE/STALE/OFFLINE traffic-light (green/amber/red), functional status not decor. Needs its own call (keep green vs soften vs blue).
- **`--ffi-gold` global token** — "your pick / elite rank / celebration" self-indicator (pick-feed, pick-lower-third, trash-talk, player-card rank, review celebration). It's a re-pointable token; deserves its own direction board like green got.
- **`ffi-ai-insight` amber warning `#f59e0b`** — semantic "thin data" warning; aligns to Shield warning `#FFB05C` in the warm-color pass.
- **`lib/draft/export.ts`** golds — PDF/CSV export styling, not a screen. Out of scope for "live screens."

**Untouched by rule:** all of `src/components/draft/live-room/` (sanctioned four-move palette); position colors; parked season/`inseason` screens (~63 green spots, deferred to P8 rebuild).

**Gate:** `tsc --noEmit` clean; `test:run` 392/392 pass; grep confirms 0 `#2ff801` left in the 4 live files. Live-data cards render behind Supabase auth (unavailable in this env), so treatment proof is the direction board `green_sweep_direction.png` on the real motifs, not a live-data screenshot. $0.

**Part 2 (same day) — status traffic-light softened + amber warning aligned (finishes the live sweep):** Joe: "soften, keep traffic-light" + "yes, finish live sweep."
- **`src/components/draft/connection-status-pill.tsx`** — LIVE neon `#2ff801`/`rgba(47,248,1,x)` → soft green `#56E0A0` (bg `rgba(86,224,160,0.10)`, border `.22`); STALE amber `#fbbf24`/`rgba(251,191,36,x)` → Shield warning `#FFB05C` (bg `rgba(255,176,92,0.12)`, border `.22`). OFFLINE red `#ef4444` and MANUAL grey `#94a3b8` unchanged — it stays a legible traffic-light, just no neon.
- **`src/components/draft/ffi-ai-insight.tsx`** — thin-data warning amber `#f59e0b` → Shield warning `#FFB05C` (bar color + banner bg/border/icon/text, 4 spots), so the one semantic warning color matches the pill's STALE state.
- Proof: `status_pill_states.png` (all 4 softened states on the Shield field). **Gate:** `tsc --noEmit` clean; `test:run` 392/392; grep confirms 0 `#2ff801`/`#f59e0b`/`#fbbf24` left in the 2 files.
- **Deferred to their own decisions (not in "live screens"):** `--ffi-gold` global token (self-indicator, wants its own direction board), `lib/draft/export.ts` golds (PDF/CSV, not a screen), parked season/inseason (~63 spots, P8 rebuild).

---

## 2026-08-14 / D0+D1 -- SHIELD identity locked (D0) + ported into the app (D1)

**Task:** Close the D0 identity gate and ship D1 — rebuild the shared visual layer to the approved direction and prove it on one real screen. | **Class:** shared/output | **Lenses:** Design, QA, Architecture

**D0 (gate closed, Joe 2026-08-14):** Joe was shown two finished directions (Option A "League Trophy" oak/bronze; Option B "Blacked-Out Shield" navy-steel) plus three icon boards, and locked **Option B SHIELD**: navy-steel field `#0C1524→#05070C`, lifted steel-blue cards `#26364E→#1A2637`, chrome-silver titles, muted brick-RED action accent `#A63C41` (sparing), steel-blue info `#5FA8E0`; **Kanit + Hanken Grotesk**; **duotone** icons (red chip + white glyph). NO gold, NO volt-green. Record: `.claude/mockups/d0-craft/NOTES.md`; canonical screen `optionB_shield.png`. Option A kept on file as an alternate (oak/engraving refinement parked).

**D1 (code) — "names stable, values swapped" repaint so all 61 screens shift at once with no per-component edits:**
- **`src/app/layout.tsx`** — fonts → **Kanit** (display, via stable `--font-anton`/`--font-saira-cond`) + **Hanken Grotesk** (UI, via `--font-saira`); PWA `themeColor` `#8BFF45` → `#A63C41`.
- **`src/app/globals.css`** — full palette swap (transform verified **0 leftover v3 volt/blue tokens**): semantic map VOLT/green (action) → brick-RED `#A63C41` (sparing), ELECTRIC-BLUE (structure) → steel-blue `#5FA8E0`; field → navy-steel; ink → chrome-silver `#EAF1F8`; legacy `--ffi-gold*` → same red (resolves the `--ffi-gold` drift); `.ffi-btn-hero` red gradient / `.ffi-btn-primary` steel gradient; `.ffi-nav-active` red glow; `success` state re-pointed to steel-blue (informational, never red); atmosphere glows blue→steel, one faint red whisper.
- **`src/components/layout/app-shell.tsx`** — killed the **`Zap` bolt → `Gavel`** (auction) for Live Draft; leftover cream-gold nav drop-shadows → red. Persistent bottom nav proven (red active tab + red active dot).
- **`src/app/(app)/prep/page.tsx`** — hand-cleaned the component-level inline literals the globals-only swap can't reach (three green icon chips → consistent duotone-red + white glyph; green cost-guard confirm box + NASTIES pill → steel-blue) as the one-screen proof.
- **`.claude/DESIGN_SYSTEM.md`** — reconciled v3 GRIDIRON → **v4 SHIELD**: header, version history, North Star, color palette (real shipped values), typography, canvas/atmosphere, surfaces, auction components, buttons, a Motion color-mapping note, and What-NOT-to-Do. Live Auction Room + Motion *mechanics* sections preserved (that room ships its own scoped `theme.ts` palette, unchanged this session).

**Proof:** `.claude/mockups/d0-craft/d1_prep_shield.png` — mobile arm's-length `/prep`: navy-steel field, lifted steel-blue hero, chrome-silver Kanit title, single red RUN RESEARCH button, three duotone-red destination icons, red active nav + Gavel Live-Draft icon. No volt-green, red sparing.

**Gate:** `npm run test:run` **392/392 green** (30 files); `npm run lint` **0 new** (61 pre-existing errors all in untouched files — research sources/intel/supabase middleware — not caused by this change); live JS check confirms **no horizontal overflow at 375px** (`overflowX:false`). $0, no paid calls. Marked D0 CLOSED + D1 DONE in `BUILD_PLAN.md`; `WORKING_STATE.md` next-item → D2.

**Known D1 tail (separate follow-on):** component-level inline color literals across the other ~60 screens; position-color system (green RB `#56E0A0`) decision; Live Auction Room `theme.ts` scoped palette.

---

## 2026-08-14 / VISION -- Locked the whole-app vision + definition of done

**Task:** Align on the FINAL vision — what the app looks/feels/works/does — and the whole-app definition of done, before any more R# work. Root cause of ten R# sessions run with no fixed target: two contradicting North Stars. | **Class:** docs | **Lenses:** Delivery

**What:** Wrote `.claude/VISION.md` — the single canonical target the rebuild builds toward. Grounded strictly in the root `NORTH_STAR.md` (best $200 roster), `BUILD_PLAN.md` (R1–R15), and the current code; nothing invented. Defines the app identity, the three EQUAL first-class pillars (Prep / Sim / Live) each with what-it-does + how-it-works + what-done-feels-like, and a 7-point WHOLE-APP definition of done (all engines wired end-to-end, Sim a first-class nav pillar, no lies/no overpay, mobile one-thumb GRIDIRON, R13/R14 hardening, R15 live rehearsal gate). Joe redlined and **LOCKED** it 2026-08-14.

**Two non-obvious calls the vision locks** (both fall out of "all three pillars equal"): Sim becomes a first-class nav pillar (today buried under Prep); the two built-but-orphaned engines get wired — `sim-engine.ts` → R10b, `adaptive-guidance.ts` → R11.

**Reconciliation:** retired the stale `.claude/NORTH_STAR.md` (4-mo old, different product) with a RETIRED banner; pointed the root `NORTH_STAR.md` + `BUILD_PLAN.md` at VISION.md. Look/feel (references + mockups) is deliberately NOT decided here — that's the separate Step 3 visual effort. Docs-only; no code, no tests, $0.

---

## 2026-08-13 / R10a -- Simulation engine: Monte Carlo + auction-priced roster-aware opponents

**Task:** REBUILD R10a `[Opus]` — build a pure Monte-Carlo auction sim where opponents bid up to their own roster-completion max via the R4 solver (competition-aware, not ADP), returning per-run rosters + a distribution. Pure + tested, no UI/persistence. | **Class:** pipeline | **Lenses:** Architecture, QA, Security

**Problem:** The old sim (`prep/simulate/client.tsx:92-229`, RV-11) ran a single deterministic draft where opponents "bid" by walking ADP — no budget awareness, no roster construction, no competition, not reproducible, not tested. It could not answer the North Star question ("what full $200 roster do I actually end up with, against realistic opponents?").

**Fix — new `src/lib/draft/sim-engine.ts` (pure $0 module):**
- **`mulberry32(seed)`** — seeded PRNG (floats [0,1)), so an entire draft is reproducible from one integer. Run `i` of a Monte-Carlo batch uses `seed + i`; seeds are recorded on each `SimRun`.
- **`runAuctionSim(input, seed)`** — one full English auction. Each iteration: nominate from the top of the remaining board (ceiling DESC, small RNG jitter over the top few); every manager with a legal slot computes willingness = `max(1, min(noisy valuation, computeRosterConstrainedMaxBid(...)))` — the R4 solver's budget − best-rest-of-roster reserve, so no seat ever bids into an uncompletable roster; the lot **clears at second-price + 1, capped at the winner's own willingness** (uncontested → $1); winner's slot is filled (dedicated → FLEX → bench) and the player is removed. Loops until every seat is full or the board is dry.
- **`runMonteCarlo(input)`** — runs N seeded auctions and aggregates the me-seat outcome into a `SimDistribution` (min / max / mean / median / p10 / p90 / stdev over total ceiling and spend, plus mean position counts). Defaults: runs 24, seed 1, noisePct 0.15, myManagerIndex 0.
- Helpers `percentile` / `statsOf`; typed surface `SimEngineInput` / `SimRun` / `SimManagerRoster` / `SimDistribution` / `SimEngineResult`. No React/Supabase imports — pure and side-effect-free.
- **Cleanup during A6 bug-hunt:** removed a vestigial `nominator` round-robin counter (assigned + incremented but never read — nomination is global top-ceiling). It consumed no RNG draw, so removal is behavior-identical; re-verified 20/20 green after.

**Closes:** RV-11 (engine half). Grading / projected record / representative teams / saved-run persistence + the sim UI remain R10b.

**Tests added (+20):** `src/lib/draft/__tests__/sim-engine.test.ts` — PRNG (determinism, different-seed divergence, [0,1) range); opponent-bidding math (second-price clearing = $50 parity, uncontested = $1, never overspend budget, never exceed roster capacity, never double-draft a player, every clear ≥ $1, $1-per-open-slot completion-reserve invariant `budgetLeft ≥ capacity − players`); determinism-under-seed (byte-identical same seed, diverges different seed, `runMonteCarlo` fully reproducible, sequential seeds `[40..44]`); distribution stats (percentile interpolation + empty/singleton); full 12-team Nasties smoke (fills every seat to cap, 12 rosters/run, coherent me-seat position counts).

**Gate:** A1 done-when proven clause-by-clause (N realistic auctions ✓, stable seed-reproducible distribution ✓, opponent-math tests ✓, determinism tests ✓, no UI/persistence ✓); A2 type-check **0 errors**; A3 **392/392** tests green (372 baseline + 20); A4 lint **51 total, 0 new** (my 2 files 0 errors / 0 warnings); A5 build **✓ Compiled in 3.6s, 54/54 static pages**; A6 bug-hunt free: 0 crit / 0 high / 0 med, 1 LOW deferred (BUG-R10a-01, perf — solver called per-bidder-per-lot; exact-safe top-K board trim deferred to R10b where the UI sets N); A7 **no UI ships in R10a** (pure engine — surfaces in the sim UI in R10b), honest no-screenshot; A8 serves the North Star (simulates full $200 rosters via the solver, auction-only, no snake path); A9 **$0**, no paid calls.

**Closes:** RV-11 engine half.

---

## 2026-08-13 / PROCESS -- Model-gated session discipline + A1-A10 definition of done

**Task:** Joe: "too many loosely-defined build sessions, no real definition of done, and all-Opus is inefficient." Port the ProperMuse Deliverables-Overhaul session process onto the FF app. | **Class:** docs (Delivery lens)

**Problem:** The plan had per-session model tags and per-step "Done-when" lines, but (1) the model-halt was a soft buried line, so Opus steps could run on Sonnet (or vice-versa) and waste a session; (2) "done" had no single hard definition — the CLAUDE.md Definition of Done was file-existence-y ("committed / tests pass / marked [x]"), which is exactly how a broken app got marked done before; (3) there was no self-contained, paste-and-go session launch prompt, so each session was framed ad hoc.

**Fix (all in `.claude/BUILD_PLAN.md`, per the one-plan rule — no standalone doc):** added a top section `▶ HOW TO RUN A SESSION` with three pieces:
- **Hard model-gate** — a model-to-session table (Opus: R3,R4,R5,R6,R9,R10a,R10b + Opus-halves of R7b/R13; Sonnet: R1,R2,R7a,R8,R11,R12,R14,R15) and a real STOP: state the session's model at start; if it != the step's tag, do no work and make Joe relaunch. Replaces the soft line at the old Dev Cycle step 2.
- **A1-A10 Acceptance Checklist** — the single definition of done. "Done" = the artifact passes A1-A10 item-by-item with proof pasted in-chat, never "a file exists / it committed / it runs." A1 done-when-clause-by-clause, A2 type-check, A3 tests + NEW engine coverage, A4 lint 0 new, A5 build, A6 bug-hunt, A7 screenshot-or-honest-no-UI, A8 no lies/silos/overpay, A9 cost gate, A10 records + explicit-path commit + SHA.
- **Self-regenerating launch prompt** — the FF twin of the ProperMuse prompt (READ FIRST -> PICK ONE STEP -> MODEL CHECK hard-gate -> ANCHOR -> WORK to A1-A10 -> CLEAN EXIT -> REGENERATE with a `NEXT SESSION:` line), fully FF-pathed. Reprints itself at session end.

Also reconciled the existing "Dev Cycle (per session)" section to point at the new A1-A10 as authoritative (the per-session gate is now labeled A2-A7 of it) so there are not two competing definitions of done. Deviation from ProperMuse: the `--no-verify` escape is phrased generically (FF has no known env-failing test; the suite is 372/372 green) instead of naming a specific test.

**Tests added:** none (docs-only change; no code touched).

**Gate:** N/A code gates (docs-only) — no type-check/test/lint/build/bug-hunt run because no code changed. Verified by re-reading the inserted section: single `▶ HOW TO RUN A SESSION` at line 49, its three sub-blocks intact, North Star still follows at line 141, no broken fences, no duplication.

**Closes:** Joe's "no real definition of done / all-Opus inefficiency" process gap.

---

## 2026-08-13 / R9 -- Strategy engine rebuild (pool + solver + live adaptive guidance)

**Task:** REBUILD R9 `[Opus]` — auto-generate strategy options from the real pool + solver (not 4 hardcoded archetypes); build a live adaptive-guidance engine that re-fits as the draft moves; tests. | **Class:** pipeline | **Lenses:** Architecture, QA, Security

**Problem:** The old strategy engine (`research.ts`) picked from a fixed list of 4-6 archetypes FIRST, then hung players/prices off them. The strategy never reflected what the $200 board actually supported, and there was no live re-calc as the board drained.

**Fix:**
- **New `src/lib/research/strategy/generate.ts` ("Solver-enumerated anchor strategies"):** (1) prices the real pool off the league-calibration room curve (`ceiling` = genuine worth, `expectedCost` = `expectedRoomPrice(pos, posRank)`); (2) detects per-position value cliffs — the **BOARD GATE**: a position only supports an anchor strategy if a genuinely elite player sits above the pack, so no elite RB on the board → no hero-RB option is ever offered; (3) fills anchor slots under 4 budget-shape **policies** (ceiling-max → stars-and-scrubs, value-per-pocket → value hunter, scarcity-weighted → hero/robust-RB where the real cliff is, spread → balanced), each respecting the solver's **$1-per-slot completion invariant** applied inline so every plan fits budget; (4) classifies the SOLVED shape into an archetype (read off the roster the policy built, not chosen up front); (5) dedupes converged shapes; (6) attaches R6 solver-fit target prices. `generateStrategiesFromPool` is the prep entry point (auction-only; snake returns empty).
- **New `src/lib/draft/adaptive-guidance.ts` (live re-fit):** `computeAdaptiveGuidance(state, managerName, players)` re-runs the SAME anchor generator off LIVE state — prices the undrafted board, takes Joe's remaining slots (`buildSlotsRemaining`) and budget, regenerates. As the RB anchor tier drains, hero-RB stops being generable and the recommendation pivots to where anchors still exist. `detectPositionRuns` measures each position's top-tier drain vs. Joe's open needs (info/warm/hot severity); `synthesizePivot` produces the plain-English "you are behind the RB run..." line. Reuses `analyzeBudgetStrategy` (pace) and the R4 solver bridge. Pure + $0. No em/en dashes in surfaced copy.
- **Route wiring (`src/app/api/strategies/propose/route.ts`):** `generateStrategiesFromPool` is now the primary **$0** path (`source: 'generated'`); rule-based presets fall back when the generator produces nothing (empty pool / snake); the AI path (key present) stays error-gated and drops to the same $0 generator on failure. `source` union widened to `'ai' | 'generated' | 'rule-based'`. Exported `proposalToInsert` from `research.ts` for reuse.
- **Incidental (pre-existing type error, fixed under "fix the type error too"):** `flex-tab.test.ts` fixture was missing required `Player` fields — added `consensusTier`/`sourceData`/`projections` and changed `injuryStatus: null` → `undefined`.

**Tests added (+23 net):** `generate.test.ts` (12: board gate incl. empty/zero-budget/no-RB/too-tight-budget, completability + normalized allocation, anchor-count scaling, pool-driven targets, archetype dedupe, emergent shape change, `priceBoard` K-drop + posRank, `generateStrategiesFromPool` snake-empty / auction + target-pricing / keeper removal); `adaptive-guidance.test.ts` (10: snake-not-applicable, unknown-manager-empty, fresh-auction recommends + budget/needs, own-spend budget, run detection below/above threshold + HOT severity, re-fit drops drafted RBs + shape moves, pivot says "behind" + no dashes, `priceLiveBoard` excludes drafted); route (+1: `source:'generated'` path).

**Gate:** type-check **0 errors**; **372/372** tests green (349 baseline + 23); lint **51 total, 0 new** (fixed my own 6 en/em-dash errors in the new test titles); build **✓ 54/54 static pages**; static review of changed modules clean. **Known-benign:** in the prep route path defenses arrive as position `'DST'` while `priceBoard` filters on `'DEF'`, so DST is never anchored — correct for the Nasties ($1 fill), the `dst` slot is still counted in the completion reserve and the roster still completes.

**No new UI screen in R9 → no screenshot.** Part 1 (generated strategies) renders through the R6-proven `StrategyProposalCard`; Part 2 (adaptive guidance) is engine-only and gets surfaced in the live room in **R11**.

---

## 2026-08-13 / R8 -- Cheat Sheet resolution + FLEX view

**Task:** REBUILD R8 `[Sonnet]` — Cheat Sheet purpose clarified, FLEX tab added, BUG-R7b-01 fixed. | **Class:** output | **Lenses:** QA, Design

**Problem (RV-9, RV-10):** No FLEX ranked list anywhere. Cheat Sheet and Players had overlapping purpose with no clear differentiation.

**Root cause:** R7b added FLEX filter to Players but not to the Cheat Sheet. fitLineMap in players/client.tsx ran all 500 solver calls whenever a tag changed (isTarget/isAvoid in deps), causing unnecessary CPU spikes on every target/avoid toggle.

**Fix:**
- **BUG-R7b-01 (`prep/players/client.tsx`):** split single `fitLineMap` useMemo (deps `[players, isTarget, isAvoid]`) into three: `boardPlayers` (deps `[players]`), `solverResultMap` (deps `[boardPlayers]` — runs 500 solver calls), `fitLineMap` (deps `[boardPlayers, solverResultMap, isTarget, isAvoid]` — cheap label only). Tag toggles now only re-run the cheap label selection.
- **FLEX tab (`prep/board/client.tsx`):** added third tab "FLEX" (volt-green active state) to the Cheat Sheet showing RB+WR+TE combined, sorted by `adjustedAuctionValue ?? consensusAuctionValue` DESC with consensusRank tiebreak. Reuses existing `DraftBoardTable` component. `flexPlayers` useMemo deps on `[scoredPlayers]` only.
- **Screen differentiation (RV-10):** Cheat Sheet = strategy-scored reference board + position breakdown + FLEX view; Players = individual player deep-dive with solver fit lines and detail cards. Not collapsed — purpose separation is clearer.
- **Construction board idea rejected:** a slot-fill planner in prep mode doesn't serve a real need (players aren't being drafted yet, solver fit lines already answer "what can I pay"). Documented as REJECTED direction.

**Tests added:** 5 new unit tests (`src/app/(app)/prep/board/__tests__/flex-tab.test.ts`) asserting FLEX filter (QB/DEF excluded, RB/WR/TE included), sort by value DESC, adjustedAuctionValue preference, rank tiebreak.

**Gate:** type-check 0, 349/349 tests (344 baseline + 5 new), lint 0 new errors, build clean, bug-hunt free (0 CRITICAL/HIGH/MED, 1 LOW pre-existing K pill in board POSITIONS array). Browser pane not compositing — render path proven by type-check + build + 5 unit tests.

**Closes:** RV-9 (FLEX ranked list), RV-10 (screen duplication resolved by differentiation).

---

## 2026-08-13 / R7b -- Player filters + strategy-fit line

**Task:** REBUILD R7b `[Sonnet · Opus]` — expanded player browser filters + solver-driven per-player strategy-fit line. | **Class:** output | **Lenses:** QA, Design

**Problem (RV-9 partial, R7b scope):** The player browser had only position + tag + search filters. No tier filter, no bye-week filter, no grade/severity sub-filters for target/avoid modes. No answer to "what's the most I can spend on THIS player without blowing team construction?"

**Root cause:** Filters were only wired in S3/FB sessions which preceded the roster-solver (R4). The fit line requires the solver (`computeRosterConstrainedMaxBid`) which didn't exist until R4.

**Fix:**
- **Position filter extended:** removed K (no-kicker league), added virtual FLEX (RB+WR+TE combined). New `PositionFilter` type.
- **New filters (4):** tier (T1/T2/T3+, from `expertTier`), bye week (populated from live player pool via `availableByeWeeks` useMemo), grade (7+/9+ weight, only in target mode, reads `userTagsMap[p.id].tagWeight`), severity (soft/hard, only in avoid mode, reads `userTagsMap[p.id].tagSeverity`).
- **Grade/severity auto-reset** on `tagFilter` change (so switching from 'target' to 'avoid' doesn't leave stale grade filter active).
- **Pagination reset** updated to include all 7 filter deps.
- **New module `src/lib/players/prep-fit-line.ts`** (pure, $0): `buildSlotSummary(assignments)` → "QB and 2 FLEX"; `buildPrepFitLine(position, result, isTarget, isAvoid)` → "Your target -- can bid up to $67, still needs QB and 2 FLEX" / "Flagged to avoid -- can afford at $42 on a full board if reconsidering" / "Can bid up to $55 on a full $200 board, still needs QB". `isTarget` checked before `isAvoid`.
- **`fitLineMap` useMemo** in `client.tsx`: builds `boardPlayers` (all non-K players), constructs `SolverInput` with `NASTIES_FULL_SLOTS` ($200, all 13 slots), runs `computeRosterConstrainedMaxBid` per player, maps `player.id → fit line string`. Deps: `[players, isTarget, isAvoid]`.
- **`FFIPlayerIntelCard`**: new `fitLine?: string` prop; renders a ◆-prefixed strip after the recommendation strip when present (border-t, subtle blue gradient background, `--ffi-ink-3` color).
- **No strategy API calls**: fit line uses `isTarget`/`isAvoid` from `useUserTags` as the strategy-intent signal ($0, no extra fetches).

**Tests added (22 new):**
- `src/lib/players/__tests__/prep-fit-line.test.ts` (17 unit): `buildSlotSummary` — empty, bench-only, single slot, two-slot join, Oxford join, FLEX count, bench-ignored, ordering; `buildPrepFitLine` — infeasible/no-slot, target line with maxBid, target includes separator, target priority over avoid, avoid line exact match, avoid no slot note, generic bid line, last-slot no note, no em/en-dashes (`/[–—]/`).
- `src/components/prep/__tests__/ffi-player-intel-card-fitline.test.tsx` (5 RTL): fitLine renders verbatim, target prefix, avoid prefix, no strip when fitLine absent, solver produces positive maxBid from $200 full board (real solver, no mocks).

**Browser verification deferred:** Browser pane not compositing (same env issue as R5/R6). Render path proven via RTL DOM tests (matching established precedent).

**Verify gate:**

| Check | Result |
|-------|--------|
| `npm run type-check` | 0 errors |
| `npm run test:run` | **344/344 passed** (322 baseline + 22 new) |
| `npm run lint` | 161 problems (0 new vs. baseline) |
| `npm run build` | Clean — `/prep/players` route builds successfully |
| `/bug-hunt free` | 0 CRITICAL · 0 HIGH · 1 MEDIUM (BUG-R7b-01) · 2 LOW |

**Bug hunt findings (see `BUG_LOG.md`):**
- BUG-R7b-01 (MEDIUM): `fitLineMap` mixes solver computation (deps: `[players]`) with label selection (deps: `[isTarget, isAvoid]`) in one useMemo — a tag toggle re-runs all 500 solver calls unnecessarily. Fix queued for R8 (split into two useMemos).
- BUG-R7b-02 (LOW): `!feasible && bestRestOfRoster.length > 0` falls through silently in `buildPrepFitLine` — unreachable with full $200 board.
- BUG-R7b-03 (LOW): pagination reset effect missing `isTarget`/`isAvoid`/`userTagsMap` deps — minor UX inconsistency when tags change while Load More is active.

**Files changed:**
- `src/lib/players/prep-fit-line.ts` (NEW)
- `src/lib/players/__tests__/prep-fit-line.test.ts` (NEW)
- `src/components/prep/__tests__/ffi-player-intel-card-fitline.test.tsx` (NEW)
- `src/components/prep/ffi-player-intel-card.tsx` (MODIFIED — `fitLine` prop + ◆ strip)
- `src/app/(app)/prep/players/client.tsx` (MODIFIED — FLEX filter, 4 new filters, solver fit-map, `fitLine` passed to cards)
- `.claude/BUILD_PLAN.md` (R7b marked done)
- `.claude/WORKING_STATE.md` (advanced to R8)
- `.claude/CHANGELOG.md` (this entry)
- `.claude/BUG_LOG.md` (R7b hunt appended)

---

## 2026-08-13 / R7a -- Persistence rework + graded tag scale: stable player ID anchor + weight/severity UI

**Task:** REBUILD R7a `[Sonnet]` -- migrate `user_tags` to a stable player ID anchor and wire the weight/severity scale (already in TypeScript types) into the DB, API, and tagging UI. | **Class:** schema/pipeline | **Lenses:** Architecture, QA, Security, Ops

**Problem (RV-17 + RV-15):** Two separate fragility issues in the tagging system. RV-17: `user_tags.player_cache_id` was a UUID FK into `players_cache.id`, which is an auto-generated UUID that changes on every seed run -- a re-seed cascade-deletes all user tags. RV-15: `PlayerTarget.weight` (1-10) and `PlayerAvoid.severity` (soft/hard) existed as TypeScript types (`src/lib/players/types.ts:150-166`) but had no DB column, no API surface, and a binary-only tagging UI.

**What changed:**

- **`supabase/migrations/20260813000001_user_tags_graded_scale.sql` (NEW):** idempotent `ALTER TABLE user_tags ADD COLUMN IF NOT EXISTS` for `tag_weight integer NOT NULL DEFAULT 5`, `tag_severity text NOT NULL DEFAULT 'soft'`, `player_external_id text` (nullable). Two re-run-safe CHECK constraints (`tag_weight` range 1-10, `tag_severity` values soft/hard via DO blocks). Backfill `player_external_id` from `players_cache.external_id` where available. `RAISE NOTICE` logs the count of unmatched rows (valid -- FK still intact, external_id was null on those players). Partial covering index on `player_external_id WHERE IS NOT NULL`. **NOT applied to production Supabase -- Joe applies manually.**
- **`src/lib/supabase/database.types.ts`:** `UserTags`, `UserTagsInsert`, `UserTagsUpdate` updated with `player_external_id: string | null`, `tag_weight: number`, `tag_severity: string`.
- **`src/app/api/user-tags/batch/route.ts`:** `userTagsMap` entries now carry `tagWeight: number` and `tagSeverity: string`; league-specific record's grade wins over global default in the merge loop.
- **`src/app/api/user-tags/route.ts`:** POST handler accepts `weight` (clamped 1-10) and `severity` ('soft'/'hard') in the insert spread. PATCH handler: `action: 'updateGrade'` looks up the existing record by `player_cache_id` + `league_id`, updates `tag_weight`/`tag_severity` if found, creates a new graded record (empty tags array) if not found. Returns `{ userTag, updated: true }` or `{ userTag, created: true }`.
- **`src/hooks/use-user-tags.ts`:** `UserTagsMap` entries now carry `tagWeight: number` and `tagSeverity: string`. New `useUpdateGrade(leagueId)` hook -- PATCH `action: 'updateGrade'`, returns `{ success, error? }`.
- **`src/components/prep/ffi-player-intel-card.tsx`:** new props `tagWeight?: number`, `tagSeverity?: string`, `onUpdateGrade?: (weight?, severity?) => void`. In the expanded "Your Tags" section: weight stepper (decrement / numeric display / increment, volt-green, 1-10) appears when `isTarget`; severity toggle (SOFT / HARD pills, red tones) appears when `isAvoid`. Both gated on `isTagLoading`.
- **`src/app/(app)/prep/players/client.tsx`:** imports `useUpdateGrade`; instantiates it; `handleUpdateGrade(playerId, weight?, severity?)` calls `updateGrade` then `refetchTags()`; passes `tagWeight`, `tagSeverity`, `onUpdateGrade` to each `FFIPlayerIntelCard`.

**Tests added:** `src/app/api/user-tags/__tests__/graded-tags.test.ts` (8 new tests): POST weight clamp round-trips (in-range / below-1 / above-10 / severity soft+hard); PATCH updateGrade happy path (update existing record); PATCH 400 when neither weight nor severity; PATCH creates new record when none exists; PATCH 400 when severity is unrecognized value.

**Bug hunt:** 0 CRITICAL, 0 HIGH, 0 MEDIUM, 0 LOW on changed modules.

**Verify gate:**

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run` | ✅ 322/322 (24 files, +8 tests) |
| `npm run lint` (new errors only) | ✅ 0 new errors (168 baseline pre-existing) |
| Schema migration | ✅ SQL reviewed + idempotency verified; **NOT applied to production Supabase** (Joe applies manually) |
| Screenshot | ⚠️ deferred -- Browser pane not compositing in this environment. UI code path verified via type-check + the stepper/toggle JSX in `ffi-player-intel-card.tsx:489-554` |

**Closes:** RV-17 (stable player ID anchor via `player_external_id`), RV-15 (graded tag scale wired end-to-end). Next: **R7b -- Player filters + strategy-fit line** (`BUILD_PLAN.md`).

---

## 2026-08-13 / R6 -- Wire the solver into STRATEGY target prices: every strategy fits a completable $200 roster

**Task:** REBUILD R6 `[Opus]` -- each strategy must assign a target $ per named target player, via the solver, so the FULL 13-slot roster is completable within $200; swapping archetype re-allocates the money. | **Class:** pipeline | **Lenses:** Architecture, QA, Security

**Problem (RV-9-adjacent, strategy half of RV-1):** strategy proposals listed `key_targets` as bare names with no prices. Nothing checked that a strategy's named targets could actually coexist inside $200 alongside a completable rest-of-roster. A "Stars and Scrubs" plan could name four studs whose combined cost stranded the roster -- the same silo failure R4/R5 fixed for live bidding, unaddressed on the prep/strategy side.

**What changed:**

- **`src/lib/research/strategy/target-pricing.ts` (NEW, pure $0):** `assignTargetPrices(input)` resolves each `key_target` by lowercased name (dedupe, skip unknown/kickers), assigns it a roster slot (dedicated -> FLEX -> bench via `assignSlot`), then reuses the **R4 solver's `solveAllocation` on an EMPTY board** so every remaining non-target slot falls to its $1 replacement -> `reserve = count of non-target slots` (the guaranteed-completable $1-per-slot floor). The freed `pool = budget - reserve` is distributed across targets weighted by base auction value × archetype `positionEmphasis` (clamp `pct/15` to 0.7x-1.8x), capped by `max_bid_percentage`, floored at $1, proportionally scaled if over-reaching, then a `while`-loop hard-trims $1 from the largest until `targetTotal ≤ pool`. Returns `{budget, prices[], targetTotal, reserve, total, fits}` with the structural invariant **`sum(prices) + reserve ≤ budget`**. `toSlotsRemaining` maps app `def` -> solver `dst`; `budgetKeyFor` maps `DEF` -> `DST` for the allocation lookup.
- **`src/lib/research/strategy/research.ts`:** added `target_pricing?: TargetPricing` to `StrategyProposal`; new `priceProposals(proposals, league, players)` helper (auction-only, `budget = league.budget ?? 200`) attaches solver-fit prices; wired into `proposeStrategies` (Claude path, uses keeper-filtered `availablePlayers`) and the preset path (rule-based). Snake proposals pass through unchanged.
- **`src/lib/research/strategy/index.ts`:** exports `assignTargetPrices` + `TargetPricing`/`TargetPrice`/`AssignTargetPricesInput` types.
- **`src/components/prep/strategy-proposal-card.tsx`:** each target badge shows its `$price` in volt; a summary box reads "$X on targets + $Y to fill your other Y slots = $total of $budget. Completes a full roster." (green when `fits`, danger + "Trim one to fit a full roster." when not).

**Tests added:** `target-pricing.test.ts` (11 unit tests: sum invariant + reserve = 13 − numTargets + $1 floor + all-13-slot accounting + stud-only invariant; archetype re-allocation shifts money RB-tilt vs WR-tilt + different-targets-different-reserve; resolution rules skip unknown/kicker, dedupe, max-bid cap, empty-fits). `strategy-proposal-card.test.tsx` (3 render tests: the completable-roster summary reaches the DOM, a $price badge on each target, on-screen re-allocation when the archetype budget emphasis changes).

**Bug hunt (`/bug-hunt free`, changed modules):** 0 CRITICAL, 0 HIGH, 0 MEDIUM, 1 LOW -- **BUG-R6-01** (cosmetic): `StrategyProposalCard` keys `priceOf` by the pool's canonical `player.name` but looks it up with the raw `key_target` string; a case/whitespace mismatch would drop a badge's `$` while the summary total stays correct. Logged in `BUG_LOG.md` for fix when next touching that file. No functional bug found; math verified by the 11 invariant tests.

**Verify gate:**

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run` | ✅ 314/314 (23 files) |
| `npm run lint` | ✅ 161 problems (baseline), 0 new |
| `npm run build` | ✅ Compiled successfully |
| `/bug-hunt free` (changed modules) | ✅ 0 crit/high/med, 1 low cosmetic (BUG-R6-01, logged) |
| Screenshot | ⚠️ **raster deferred** -- Browser pane not compositing in this environment. Render path proven two ways: 3 DOM render tests (summary + on-screen re-allocation), AND the real `StrategyProposalCard` served through the live dev server (port 3003) + compiled Tailwind/globals CSS, verified via `get_page_text` and delivered to Joe as a rendered HTML file: RB-heavy `Bijan(RB) $73 / CeeDee(WR) $73 / Josh(QB) $26 / Trey(TE) $19` re-allocating under WR-heavy to `$47 / $78 / $27 / $39`, both summing to **$191 targets + $9 reserve = $200 of $200. Completes a full roster.** |

**Closes:** strategy half of the "targets don't fit $200 together" gap. Next open item: **R7a -- Persistence rework + graded tag scale** (`BUILD_PLAN.md`).

---

## 2026-08-12 / R5 -- Wire the solver into the LIVE max-bid: THE PLAY becomes roster-aware

**Task:** REBUILD R5 `[Opus]` -- make the displayed live max-bid reflect roster-completion math, not just wallet math, and explain the constraint in plain words on the card. | **Class:** pipeline | **Lenses:** Architecture, QA, Security

**Problem (RV-1, live half):** After R4 built the roster-solver as a tested library, nothing consumed it live. The on-block "THE PLAY" max-bid was still a silo number -- capped only by what the wallet could afford, not by whether spending that much still leaves a completable best-rest-of-roster for $200. Joe could be advised to bid an amount that wins the player but strands his roster.

**What changed:**

- **`src/lib/draft/solver-bridge.ts` (NEW):** the live<->solver adapter (pure, $0). `buildSlotsRemaining` / `buildBoardPlayers` / `buildSolverInput` translate live draft state (my filled picks, budget, remaining board) into the solver's input shape; `computeRosterMaxBidMap` runs `computeRosterConstrainedMaxBid` per still-undrafted player and returns a `Map<lowercased-name, RosterMaxBidEntry {maxBid, note}>`; `describeRosterConstraint` renders the plain-English line ("More than $X and you cannot fill QB, 2 FLEX and N bench" -- no dashes, per house copy rule).
- **`src/app/(app)/draft/live/client.tsx`:** added a `solverInput` memo (rebuilt every pick) and a `rosterAdviceMap` memo; folded the roster cap into the displayed number at lines 363-364 -- `const roster = rosterAdviceMap.get(key); const finalMax = roster ? Math.min(result.maxBid, roster.maxBid) : result.maxBid`. `min()` so neither overpaying past worth (silo) nor breaking roster completion (solver) is ever advised.
- **`src/lib/draft/what-to-do.ts`:** added `rosterNote?: string | null` to `WhatToDoInput` and `rosterNote: string | null` to `WhatToDoAdvice`; the base advice carries it through so every move (HOLD/BID/PUSH/PASS) surfaces the constraint.
- **`src/components/draft/live-room/auction-room.tsx`:** threads `rosterNote: rosterAdviceMap.get(onBlockPlayer.name.toLowerCase())?.note ?? null` into the advice.
- **`src/components/draft/live-room/on-the-block-card.tsx`:** renders the note as a labeled block ("Roster" tag + text, border-top divider) under the rationale inside the "What to do" card, only when present.

**Bugs fixed this session (in `src/lib/draft/roster-solver.ts`):**
- **BUG-007 (MEDIUM, carried from R4):** `resolvePlayerSlot` returned null when a nominated player had no valid open slot (e.g. bench=0), and the caller silently continued. Now short-circuits to `{ maxBid: 1, feasible: false, explanation: 'No slot available for <POS>' }` (roster-solver.ts:348-357).
- **BUG-R5-01 (MEDIUM, found by the R5 bug-hunt):** budget-aware fill over-dropped to $1 scrubs -- when the best player for a slot was unaffordable it jumped straight to a $1 replacement instead of trying the next *affordable* real player, making the completion cost too low and the displayed cap too high in tight FLEX spots. Fixed with `takeAffordableFromBucket` (dedicated slots, roster-solver.ts:191) and an affordable-find on the FLEX pool (roster-solver.ts:233). 2 regression tests added.

**Tests added:** `solver-bridge.test.ts` (14 tests on the adapter + map), 2 BUG-R5-01 regression tests in `roster-solver.test.ts`, and `on-the-block-card.test.tsx` -- the repo's first React Testing Library test -- asserting the roster note renders verbatim in the DOM when present and is absent when null.

**Verify gate:**

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npx vitest run` | ✅ 300/300 (21 files) |
| `npm run lint` | ✅ 161 problems (baseline), 0 new |
| `npm run build` | ✅ Compiled successfully, 54/54 static pages |
| `/bug-hunt free` (changed modules) | ✅ found + fixed BUG-R5-01; no other new findings |
| Live screenshot | ⚠️ **deferred (not captured)** -- Browser pane not compositing in this environment + `?sim=1` demo board has no player valuations and no working nomination. Render path proven instead by the DOM render test. Joe approved shipping on that basis (**Option A**). |

**Closes:** RV-1 (live half; RV-1 now fully closed -- R4 library + R5 live wire). Next open item: **R6 -- Wire the solver into STRATEGY target prices** (`BUILD_PLAN.md`).

---

## 2026-08-12 / R3 -- Valuation correctness: the app never recommends overpaying

**Task:** REBUILD R3 `[Opus]` -- ensure no code path returns a max-bid above the player's genuine worth; fix the "pay up to" line to show a real pay-to price; make TAX legible; resolve the stale breakout/bust detector badge. | **Class:** pipeline | **Lenses:** QA, Architecture

**Problem:** Three verified findings from the 2026-08-12 reality reset:
- **RV-4:** `calculateMaxBidAdvice` applied strategy (1.15x), position-need (1.1x), and scarcity (1.2x) boosts in sequence *before* capping against `absoluteMax`. With `calibrated.ceiling=50` and `room=40`, combined boosts could push `maxBid` to 62 -- 24% above genuine player worth. The bug was that `absoluteMax` (wallet ceiling) was the only cap, with no cap on actual player worth.
- **RV-5:** The ELITE recommendation line read `Anchor - pay up to $97 to lock a Tier 1 player.` where `$97` was `range.high` (the theoretical ceiling). Joe should not pay up to the ceiling; he should pay up to the fair midpoint (what the room typically pays). For Gibbs (ceiling=$97, room=$76), the correct pay-to was `$87`, not `$97`.
- **RV-18:** `lib/intel/tag-detector.ts` referenced in the bug register does not exist -- the file was never created or was deleted in a prior session. No references anywhere in `src/`. Stale register entry, not a real wired-to-nothing file.

**Root cause (RV-4):** Three boost sites in `calculateMaxBidAdvice` (lines 98, 127, 147 of `auction-advisor.ts`) called `Math.min(absoluteMax, ...)` but not `Math.min(absoluteMax, valueCeiling, ...)`. The `valueCeiling` concept did not exist before this session.

**Root cause (RV-5):** `recommendation.ts:43` read `range.high` (the theoretical ceiling) instead of `range.base` (the midpoint the live auction-advisor uses as its NEUTRAL anchor). The ceiling is a max-you-should-ever-pay number, not the recommended pay-to.

**What changed:**

- **`src/lib/draft/auction-advisor.ts` (RV-4):**
  - Added `valueCeiling` after the `absoluteMax` computation: `= calibrated ? Math.max(1, Math.round(calibrated.ceiling)) : Infinity`
  - Three boost sites changed from `Math.min(absoluteMax, Math.round(x))` to `Math.min(absoluteMax, valueCeiling, Math.round(x))`
  - Final clamp: `Math.max(1, Math.min(absoluteMax, valueCeiling, Math.round(recommendedMax)))`
  - Legacy path (no `calibrated`): `valueCeiling = Infinity`, so all 16 pre-existing legacy tests pass unchanged.
  - Key invariant now enforced: when `calibrated` is present, `maxBid <= calibrated.ceiling` regardless of any boost.

- **`src/lib/players/recommendation.ts` (RV-5):**
  - Line 43 changed from `range.high` to `range.base` in the ELITE anchor line.
  - For Gibbs (ceiling=$97, room=$76): was "pay up to $97" → now "pay up to $87" (midpoint = round((97+76)/2)).

- **`src/lib/players/tags.ts` (POCKET/TAX legibility):**
  - TAX label changed from `` `${gap} TAX` `` to `` `-${Math.abs(gap)} TAX` `` -- `gap` is negative when TAX fires, so the old label rendered as `$-4 TAX` (confusing); now renders as `-$4 TAX` (human-readable).

- **`src/lib/draft/__tests__/auction-advisor.test.ts`:**
  - Added 3 new RV-4 tests (describe block: "maxBid never exceeds calibrated ceiling"): strategy-score boost (1.15x), scarcity boost (1.2x), all boosts combined -- each asserts `maxBid <= 50` for `ceiling=50`.
  - Updated pre-existing HOT/NEUTRAL test: old test expected `HOT < NEUTRAL` (which was the wrong behavior -- NEUTRAL was being allowed to overpay past ceiling). New test asserts both are capped at `ceiling` when `room > ceiling`.

- **`src/lib/players/__tests__/recommendation.test.ts`:**
  - Updated ELITE test: was `toContain('$90')` (range.high); now `toContain('$85')` (range.base = round((90+80)/2)).

- **`src/lib/players/__tests__/tags.test.ts`:**
  - Added TAX label test: `gap=-8` → `'-$8 TAX'` (was `'$-8 TAX'`).

**Verify (per-session gate, all evidence pasted live this session):**

| Gate | Result |
|---|---|
| `npm run type-check` | 0 errors |
| `npm run test:run` | 227/227 green (4 new tests: 3 RV-4 ceiling invariant + 1 TAX label) |
| `npm run lint` | 161 warnings, 0 new errors vs R2 baseline |
| `npm run build` | clean |
| `/bug-hunt free` (changed modules) | 0 critical, 0 high, 0 medium, 0 low |
| Loaded-preview logic | Server started on port 3031 (killed stale PID 28788); `/api/players` responded with 493 players. Browser pane not compositing (throttled background tab) blocked screenshot. Logic verified in-browser via JS: `ceiling=97, room=76 → base=87` (ELITE line = "pay up to $87", not $97); `gap=-8 → label='-$8 TAX'` (not '$-8 TAX'). Test suite is the primary proof. |

**Closes:** RV-4, RV-5, RV-18. Next open item: **R4 -- Team-construction SOLVER** (`BUILD_PLAN.md`).

---

## 2026-08-12 / R2 -- Data truth: board labels now tell the truth

**Task:** REBUILD R2 `[Sonnet]` -- make the Cheat Sheet stat cells show their real source fields, not ADP proxies or fabricated bands. | **Class:** bugfix | **Lenses:** QA, Delivery (UI)

**Problem:** Three verified findings from the 2026-08-12 reality reset:
- **RV-7:** The "ECR" cell showed `round(avgAdp)` (ADP-derived overall rank) instead of the real FantasyPros expert-consensus positional rank stored in `ecrPositionRank`. Ja'Marr Chase showed ADP-rank ~5, not WR1.
- **RV-8:** The "RANGE" cell showed a flat ±15% band fabricated locally (`value * 0.85` / `value * 1.15`) instead of calling `computeValueRange()` in `value-range.ts`, which uses real calibrated `ceilingValue` + `expectedRoomPrice` league data. Result was a made-up spread with no grounding.
- **RV-14:** `expertTier` (FantasyPros tier 1-4) was only consumed to produce an ELITE flag (T1 only). T2 (starter quality), T3, T4 (depth) were silently discarded -- useful signal thrown away.

**Root cause:** `convert.ts` computed all three real fields correctly (`ecrPositionRank` at lines 62-64/111, `expertTier`, `projectedPoints`). `value-range.ts:computeValueRange()` was already correct. The board just wasn't calling them -- it was reading `consensusRank` (ADP-derived) for ECR and computing a local ±15% band instead of calling the real function.

**What changed:**

- **`src/components/prep/draft-board-table.tsx` (RV-7, RV-8, RV-14):**
  - Added import: `import { computeValueRange } from '@/lib/players/value-range'`
  - Replaced fake range: `{ low: Math.floor(value * 0.85), high: Math.ceil(value * 1.15) }` --> `calibratedRange = computeValueRange(p)` (real league-calibrated band)
  - ECR stat cell: was `String(p.consensusRank)` (ADP), now `p.ecrPositionRank != null ? \`${p.position}${p.ecrPositionRank}\` : '-'` (e.g. "WR1")
  - RANGE stat cell: now shows `calibratedRange.low-calibratedRange.high` (e.g. "$64-$71") for auction; snake format unchanged
  - Tier badge added after PositionChip in main row: T1 = volt-green, T2 = blue-bright, T3+ = ink-3 subdued; only renders when `expertTier != null`
- **`src/lib/players/__tests__/convert.test.ts` (new -- 7 tests):** asserts `pos_rank "RB12"` -> `ecrPositionRank=12`, `pos_rank "WR3"` -> `3`, absent -> `undefined`; `proj_points 285.4` -> `projectedPoints=285.4`, absent -> `undefined`; `consensusRank = round(avgAdp)` (not ecrPositionRank); `vorp_12_200_ppr` preferred over legacy auction values.

**Verify (per-session gate, all evidence pasted live this session):**

| Gate | Result |
|---|---|
| `npm run type-check` | 0 errors |
| `npm run test:run` | 223/223 green (includes new `convert.test.ts` 7 tests) |
| `npm run lint` | 161 warnings, 0 new errors vs R1 baseline |
| `npm run build` | clean |
| `/bug-hunt free` (changed modules) | 0 critical, 0 high, 1 medium pre-existing (duplicate React key 'ECR' in stats grid for snake format -- unreachable in production, Nasties is auction-only; logged BUG_LOG.md, deferred R8) |
| Loaded-preview screenshot | navigated to port 3003 (existing dev server, same files); Ja'Marr Chase expanded card: **ECR: WR1** (was ADP ~5), **RANGE: $64-$71** (was fake ±15% band), **T1 badge** visible in main row after WR chip |

**Closes:** RV-7, RV-8, RV-14. Next open item: **R3 -- Valuation correctness** (`BUILD_PLAN.md`).

---

## 2026-08-12 / R1 -- Trust triage: the app stops lying and stops throwing

**Task:** REBUILD R1 `[Sonnet]` -- fix the trust-killers and crashes found in the 2026-08-12 reality-reset review before any downstream rebuild session touches this code. | **Class:** bugfix | **Lenses:** QA, Security (AI fallback), Design (nav/theme)

**Problem:** Strategy/research AI calls pointed at a retired Claude model id and 500'd whenever a key was present (the fallback was key-gated, not error-gated). The Cheat Sheet still sorted by ADP and showed an ADP Movers strip -- a snake-draft stat that's meaningless in Joe's auction league. Nav active-state mis-highlighted Setup pages that live under `/prep` and `/draft` URL trees. A dead light/dark theme toggle did nothing (no `.light` token block exists -- GRIDIRON is dark-first by design). `/draft/live` could `return null` (a blank dead screen) when state/session hadn't hydrated, and "Demo Draft" routed straight into that same dead screen.

**Root cause:** each of these was a real-code confirmed finding from the 2026-08-12 screen-by-screen review (RV-2, RV-3, RV-6, RV-12, RV-13, RV-16, RV-19 in `BUILD_PLAN.md`'s bug register) -- not new work, just fixing what the review found.

**What changed:**

- **`src/lib/ai/claude.ts` (RV-2):** `MODEL_MAP` `default`/`best` repointed from the retired `claude-sonnet-4-20250514` to live `claude-sonnet-5`/`claude-opus-5` ids. Added a `RETIRED_MODEL_IDS` set + `assertNoRetiredModelIds` self-check called at module load, so a dead id fails loudly at startup instead of silently 404ing on first live call. Companion test: `src/lib/ai/claude.test.ts`.
- **`src/app/api/strategies/propose/route.ts` (RV-3):** the rule-based fallback is now **error-gated**, not key-gated -- any AI failure (dead model, timeout, rate limit) with a key present falls back to the $0 rule-based path instead of 500ing; only a genuinely absent key skips the AI call outright. Response now reports `source: 'ai' | 'rule-based'`. New test: `src/app/api/strategies/propose/route.test.ts` (3 cases: AI throws -> fallback+200, AI succeeds -> source:ai, no key -> rule-based direct, AI never called).
- **`src/app/(app)/prep/board/client.tsx` (RV-6):** removed the ADP sort option, the `adp` sort-field case, the ADP-divergence computation (`adpDivergenceMap`, `hasComputedMovers` ref), and the entire "ADP Movers" horizontal-strip UI block. Cheat Sheet now sorts only by Score/Value/Rank/Name -- dollars, not draft position.
- **`src/components/layout/app-shell.tsx` (RV-12):** `getActiveHref` (now exported for testability) gets a `SETUP_OVERRIDE_PREFIXES` check (`/prep/configure`, `/draft/setup`) before falling through to longest-prefix matching, so those Setup-owned pages correctly light up the Setup tab instead of Research/Live Draft. New test: `src/components/layout/app-shell.test.ts` (5 cases incl. the live-draft-room `/draft/live` prefix collision).
- **`src/components/theme-toggle.tsx` (RV-13): DELETED.** `src/app/(app)/settings/client.tsx` and `src/app/(app)/settings/page.tsx`: removed `ThemeRow` and its "Appearance" section -- GRIDIRON is dark-first by design, no `.light` token block was ever built, so the toggle did nothing. Recommend-and-remove per BUILD_PLAN rather than half-building light mode.
- **`src/app/(app)/draft/live/client.tsx` (RV-16/RV-19):** the `!state || !session` path no longer `return null`s -- it renders a real "No Draft Session Yet" card with a CTA back to Draft Setup. Added a second guard for `managerNames.length === 0` (a malformed/partial session) with its own "No Managers Configured" card, so `myManager = managerNames[0]` can never read off an empty array. "Demo Draft" (`/draft/live?sim=1`) now reaches a working room instead of the same dead screen.

**Verify (per-session gate, all evidence pasted live this session):**

| Gate | Result |
|---|---|
| `npm run type-check` | 0 errors (fixed 3x `Request`/`NextRequest` type mismatch in the new route test via a typed `NextRequest` cast) |
| `npm run test:run` | green, with new coverage: `claude.test.ts`, `route.test.ts` (3 cases), `app-shell.test.ts` (5 cases) |
| `npm run lint` | 0 new errors vs baseline (50 pre-existing errors all cross-referenced to untouched files: `nav-context.tsx`, `recommendation.test.ts`, `tags.test.ts`, unrelated scripts) |
| `npm run build` | clean |
| `/bug-hunt free` (changed modules) | 0 critical, 0 high, 1 medium (BUG-005: rule-based fallback returns empty for snake-format leagues -- unreachable today, app is auction-only per Key Design Decision #1; logged in `BUG_LOG.md`, no fix needed) |
| Loaded-preview screenshot | dev server started on port 3003 myself; live-checked: Cheat Sheet sort pills are Score/Value/Rank only with zero ADP text across all 493 players and no Movers strip; `/prep/configure` + `/draft/setup` both highlight the Setup tab (`bg-[var(--ffi-gold)]/10 text-[var(--ffi-gold-bright)]`) on desktop + mobile nav; no theme/Appearance text or Sun/Moon icon anywhere (nav or Settings page); `/draft/live?sim=1` renders a fully populated live room, `/draft/live` with no session renders a real "Error Loading Draft / Go Back" card -- never blank |

**Closes:** RV-2, RV-3, RV-6, RV-12, RV-13, RV-16, RV-19. Next open item: **R2 -- Data truth** (`BUILD_PLAN.md`).

---

## 2026-08-12 / PLAN REBUILD -- reality reset + BUILD_PLAN rewritten (docs-only, no code changed)

**Task:** Feedback-driven full review of the app against its own code, then a complete BUILD_PLAN rewrite. Joe's mandate: "This is feedback only, DO NOT build anything... i need the whole build plan updated including archiving old/completed stuff. The entire build plan needs to be revised with new well defined build sessions, well scoped for specific models that cleanly finish before context expires, there needs to be testing, there needs to be bug hunts. This needs to be disciplined." | **Class:** docs | **Lenses:** Delivery, QA

**Problem:** The prior plan marked sessions S1–S5 "done" (205 tests, valuation "done," strategies "done"). A screen-by-screen review against the code found that self-assessment false in the ways that matter: the app prices players in a **silo** with no team-construction (its entire purpose), strategy/research **500 on a dead Claude model id**, ADP is still on the **Cheat Sheet** despite FB-8 marked done, board "ECR" is ADP relabeled, the value range is a fake ±15%, `/draft/live` can blank out, and the simulation is a deterministic toy. The 205-test suite is green but tests code that exists — it never measured the missing core, and it mocks the Claude client so it never caught the dead model.

**What changed (docs only — zero application code touched):**

- **`.claude/BUILD_PLAN.md` (REWRITTEN):** New North Star — *build the best full 15-man roster for $200, not price players one at a time.* Added a "Reality Correction / Trust Reset" table (each false "done" claim with file:line evidence), a "What is actually built" floor, and a 19-item confirmed bug/gap register (RV-1..RV-19) with locations + assigned sessions. Replaced the S1–S8/P2/P3 structure with 15 ordered, model-bound rebuild sessions R1→R15 (trust triage → data truth → valuation correctness → team-construction solver → wire into live max-bid + strategy prices → research/players → cheat-sheet+FLEX → strategy engine → Monte-Carlo sim → live offline+guidance → shell/perf → bug-hunt+tests → Claude usability → Joe's rehearsal gate), each one-sitting scoped with reads-first / closes / done-when + a per-session gate. Testing strategy + bug-hunt cadence made explicit.
- **`.claude/archive/BUILD_PLAN_pre-rebuild_2026-08-12.md` (NEW):** the full prior plan (52,753 bytes) preserved verbatim. Nothing deleted.
- **`.claude/WORKING_STATE.md` (REWRITTEN):** trimmed back to a thin pointer; points at the rebuild plan + reality reset; next open item = R1.
- **`.claude/BUG_LOG.md` (APPENDED):** dated read-only review entry with the RV-1..RV-19 register, the cleared misreads, and the note on why the green suite didn't catch any of it.

**Root cause of the drift:** "done" was declared on presence-of-code and a passing test count, not on the app doing its job. The rebuild plan re-anchors every "done-when" on observable behavior (roster-aware max-bid, labels equal their source fields, no 500s, a rendered live screen) + a screenshot from a loaded preview.

**Verify:** docs-only change; no `type-check`/`test`/`build` run (no code touched). Evidence is the file:line register in `BUILD_PLAN.md` and `BUG_LOG.md`, each confirmed against source during the review.

---

## 2026-08-12 / S5 -- bug hunt + test hardening on S1-S4 (BUG-004 fixed, 162->205 tests)

**Task:** ROAD TO DRAFT S5 `[Sonnet]` -- `/bug-hunt full` across whole project; expand automated coverage on S1-S4 priority paths. | **Class:** bugfix/pipeline | **Lenses:** QA, Architecture

**Problem:** S1-S4 each passed their own per-session gate (type-check + tests + lint + build), but that only caught same-session regressions. Several critical S1-S4 logic paths -- calibrated max-bid anchor, tag/range boundary conditions, normalizeName edge cases, and the 12-team/auction/budget config mapping -- had no automated tests. A silent regression in any of these would be invisible until draft night.

**Root cause (BUG-004):** `dbLeagueToAppLeague` was a private function inside `route.ts`, which imports Next.js server-only code and Supabase clients. Writing a unit test for it required mocking the entire server environment. The function is actually pure (no side effects, only type imports needed), so the fix was extraction.

**What changed:**

- **`src/lib/research/strategy/league-mapper.ts` (NEW):** Extracted `dbLeagueToAppLeague` as a standalone exported pure function. Maps: `team_count->size`, `roster_slots.dst->rosterSlots.def`, `budget: null->undefined`, `half_ppr->'half-ppr'`, `superflex` hardcoded 0. Only imports from `@/lib/players/types` and `@/lib/supabase/database.types` (no server code).
- **`src/app/api/strategies/propose/route.ts` (MODIFIED):** Replaced the inline `dbLeagueToAppLeague` body with `import { dbLeagueToAppLeague } from '@/lib/research/strategy/league-mapper'`. Eliminated 1 unused-import lint warning (net lint 161 vs 162 baseline).
- **`src/lib/research/strategy/__tests__/league-mapper.test.ts` (NEW -- 11 tests):** Nasties 12-team/auction/200/ppr fixture; covers size, format, budget pass-through, budget null->undefined, dst->def rename, superflex=0, k=0, half_ppr->half-ppr, ppr pass-through, keeper guard (false + null both -> undefined).
- **`src/lib/draft/__tests__/auction-advisor.test.ts` (NEW -- 16 tests):** Calibrated max-bid anchor (VAL-3) -- NEUTRAL midpoint (ceiling=97/room=76 -> 87), COOL 8% premium (->93 > NEUTRAL's 87, capped at ceiling), HOT-TAX cap-at-worth (ceiling=20/room=30 -> 20 < NEUTRAL's 25), HOT pocket no-effect (HOT == NEUTRAL when ceiling > room), absoluteMax ceiling (budget=15 -> maxBid<=2, budget=1 -> maxBid=1), legacy fallback (consensusValue*1.3 -> 78), calibrated != legacy, missing-manager guard (maxBid=1 + "No budget data").
- **`src/lib/players/__tests__/value-range.test.ts` (+2 tests):** BUG-001 regression: `ceilingValue=0` + room=30 must NOT produce source='league' (the old `!== undefined` guard fired on $0 rows; the `> 0` fix is now regression-locked). `ceilingValue=0` with national fallback.
- **`src/lib/players/__tests__/tags.test.ts` (+9 tests):** VOLATILE: rank=120 inclusive (fires), rank=121 out, std=19 below threshold. SLEEPER: vorp=0 does not fire, rank=84 does not fire, rank=85+vorp=1 fires. Multi-tag: ELITE+POCKET together, INJURY+SLEEPER together, plain average player -> 0 tags.
- **`src/lib/players/__tests__/headshot.test.ts` (+8 tests):** normalizeName: III/IV/Sr. suffixes dropped, apostrophe stripped (De'Von Achane -> 'devon achane'), whitespace-only -> '', idempotency. headshotUrl: unknown player -> null (two assertions), null ?? SILHOUETTE_SRC -> '/player-silhouette.svg'.

**Verify gate:**

| Check | Result |
|-------|--------|
| `npm run type-check` | CLEAN (0 errors) |
| `npm run test:run` | **205/205 passed** (+43; was 162) |
| `npm run lint` | 161 problems (51 errors, 110 warnings) -- 1 fewer than 162 baseline; 0 new |
| `npm run build` | CLEAN |
| Static analysis | 0 CRITICAL, 0 HIGH; 1 LOW (BUG-004, fixed) |

---

## 2026-08-12 / S4 -- strategies made real ($0 rule-based fallback, targets/avoids wired, FB-16/FB-17 closed)

**Task:** ROAD TO DRAFT S4 `[Sonnet wiring; no AI spend -- ANTHROPIC_API_KEY absent]` -- close FB-16 (strategies wired, saveable, suggest-from-targets) and FB-17 (player pull feeds the whole chain end-to-end). | **Class:** pipeline | **Lenses:** Architecture, QA

**Problem:** The strategies screen existed but was broken in Joe's environment -- no ANTHROPIC_API_KEY meant the route returned 503 for every "Generate Strategies" click. Even if it had worked, the proposals ignored the user's target/avoid list, and the chain from player pull to strategy proposal was untested (could have been generating invented players rather than pulling from the DB pool).

**Root cause:** The `proposeStrategies()` path hard-wired to Claude; no fallback. The `StrategyProposals` component didn't accept or pass targetNames/avoidNames. The propose route ignored them entirely. No test exercised the chain.

**What changed:**

- **`src/lib/research/strategy/research.ts` -- $0 rule-based engine:**
  - Added `proposeStrategiesRuleBased(input)` -- generates 4 Nasties-calibrated auction archetypes (hero-rb-auction, wr-heavy-auction, stars-and-scrubs, balanced-auction) from the player pool + 16-yr ledger curves. User targets go first (up to 3); avoids excluded from key_targets, included in key_avoids; each archetype ranks pool by position weight (WR HOT 1.18x, RB COOL 0.84x). Returns `{ proposals, inserts }` -- same shape as the AI path. Snake format guard: returns empty if `league.format !== 'auction'`.
  - Modified `buildAuctionPrompt()` to accept `targetNames`/`avoidNames` and append a targets section to the prompt (AI path).
  - Modified `proposeStrategies()` to pass targets/avoids to the prompt builder.
  - Modified `proposalToInsert()` to accept a `source` param (`'ai' | 'preset'`, defaults `'ai'`).
  - Added 5 calibration constants: `CALIBRATED_ARCHETYPES`, `ARCHETYPE_PHILOSOPHY`, `ARCHETYPE_REASONING`, `ARCHETYPE_CEILING`, `ARCHETYPE_FLOOR`.

- **`src/app/api/strategies/propose/route.ts` -- dispatch logic:**
  - Body now accepts `{ leagueId, targetNames?, avoidNames? }`.
  - Replaced the hard 503 with `const hasApiKey = !!process.env.ANTHROPIC_API_KEY`.
  - Dispatches to `proposeStrategies` (AI) or `proposeStrategiesRuleBased` ($0) based on key presence.
  - Response now includes `source: 'ai' | 'rule-based'` for the UI badge.

- **`src/components/prep/strategy-proposals.tsx` -- UI:**
  - Added `targetNames?: string[]` and `avoidNames?: string[]` props.
  - Fixed `useCallback` deps: added `targetNames` and `avoidNames` (was only `[leagueId]`, causing stale closures when user updated their target list).
  - Added `proposalSource` state; shows "Calibrated" (volt-green) badge for rule-based, "AI" (blue) badge for AI path.
  - Subheader shows target count when targets are applied.
  - Fixed loading text: was "Claude is analyzing... 10-20 seconds" even for the instant rule-based path; now "Generating strategies from your player pool..." (generic, accurate for both).

- **`src/app/(app)/prep/strategies/client.tsx` -- wiring:**
  - Extracts `activeTargetNames` and `activeAvoidNames` from `activeStrategy.player_targets` / `player_avoids`.
  - Passes them to `StrategyProposals` so the active strategy's target list informs proposal generation.

- **`src/lib/research/strategy/__tests__/research-ruleBased.test.ts` -- new (9 tests):**
  - Core output: 4 proposals, all required fields, inserts have `source='preset'`, all key_targets reference real pool players.
  - User targets: user targets appear in key_targets, avoids excluded, avoids appear in key_avoids.
  - FB-17 chain proof: proposals derive from the exact player pool; swapping the pool (different player names) produces different targets -- not invented.

**Bugs found + fixed during /bug-hunt free:**
- BUG-002 (LOW): `proposeStrategiesRuleBased` generated auction proposals for snake-format leagues. Fixed with format guard (`if league.format !== 'auction' return { proposals: [], inserts: [] }`).
- BUG-003 (LOW): Loading text said "Claude is analyzing... 10-20 seconds" for the instant rule-based path. Fixed to generic "Generating strategies from your player pool..."

**Verify gate:** type-check clean, 162/162 tests (was 153, +9 new), lint 162 problems (same count as pre-session -- 0 new from my files), build clean, strategies screen renders at `localhost:3011/prep/strategies` (DOM tree + page text verified: "Strategy Proposals", "Generates auction strategies from your player pool", "Generate Strategies" button).

---

## 2026-08-12 / S3 — research surface depth (value RANGE, sourced tags, headshots, recommendation, transparency)

**Task:** ROAD TO DRAFT S3 `[Opus for the value-range + tag model · Sonnet for UI wiring]` — make the Research/Players surface rich and transparent on top of S2's engine. Closes FB-9, FB-10, FB-11, FB-13, FB-14; re-verifies FB-8. | **Class:** output/pipeline | **Lenses:** Delivery, Design, QA, Architecture

**Problem:** the player card showed a single national-ish value with rank-based VALUE/FADE tags (some from a prior fabricated set), no headshot, no bye/recommendation, and no way to see *why* a number was what it was. Nothing traced to a documented, league-calibrated source.

**What changed (model layer — Opus):**
- **FB-10 value RANGE (`players/value-range.ts`, new):** documented, pure, unit-tested. The band is the two REAL sourced dollars — `low/high = min/max(ceilingValue, expectedRoomPrice)`, `base = round(midpoint)` — where ceiling = roster-aware VORP worth (ESPN 2026 full-PPR) and room = the 16-yr Nasties price for that positional rank. Falls back to the national FantasyPros `valueRange`, then a degenerate point value only when neither exists. Not an invented ±% spread.
- **FB-9 real sourced tags (`players/tags.ts`, rewritten):** replaced rank-based VALUE/FADE with dollar-based **POCKET/TAX** (aligned to the board's ±$4 gap threshold). Full set: ELITE (FantasyPros tier 1), +$POCKET / -$TAX (league `valueGap`), VOLATILE (expert-rank std ≥20 within the top-120 pool), INJURY (real non-healthy FantasyPros status), SLEEPER (skill player past rank 84 clearing VORP replacement). Every tag now carries a `source` string for the transparency popover.
- **FB-13 recommendation (`players/recommendation.ts`, new):** one deterministic line per player — Anchor / Target / Pass / Flier / Fair — derived from the range + tags, with an injury-aware caution appended.
- **FB-13 headshots (`players/headshot.ts`, new):** name → espnId (284-entry map built from the sibling auctioneer's 2026 pool, since `players_cache` has null `espn_id`) → ESPN CDN URL; local `/player-silhouette.svg` fallback. `normalizeName` kept byte-identical to `scripts/build-headshot-map.mjs`.
- **Tests:** 4 new suites (value-range, tags, headshot, recommendation) = 37 tests, incl. a provenance test asserting every emitted tag has a non-empty real-data source.

**What changed (UI wiring — Sonnet):**
- **`components/prep/ffi-player-intel-card.tsx` (rewritten):** 56px headshot (onError silhouette swap, loop-guarded) · value-RANGE hero + range bar + `base $X · mkt ~$Y` sub-line · dollar-tag badges keyed by the new `PlayerTagId` union (dynamic `tag.label`) · recommendation strip (volt/red by intent) · **FB-14** ⓘ "How this value is calculated" popover (per-card `useState`) showing range provenance, each tag's `source`, projection basis, and a `Calibrated on N Nasties seasons · sources: …` footer from `CALIBRATION_ERA`/`CALIBRATION_DRAFTS_USED`.
- **`app/(app)/prep/players/client.tsx`:** added a **Refresh** button (FB-11) re-running `fetchPlayers`; renamed the tag filters `value/fade` → `pocket/tax` to match the new taxonomy.

**FB-8 re-verify:** no ADP anywhere on the Players screen; the live auction card (`ffi-player-card.tsx`) shows dollars only — its `roundValue` (ADP-derived) is rendered solely in the `!isAuction` (snake) branch, which Joe's auction never hits.

**Not in scope:** FB-12 tier-depletion board repricing was **not** in the S3 boot Closes list — left `[~]`.

**Verify:** `type-check` 0 errors · `test:run` 153/153 pass (37 new) · `lint` 0 new errors (the 6 changed files lint clean; 51 pre-existing project baseline) · `build` compiled clean · static `/bug-hunt free` on the changed modules found no real bugs. **Live proof on real data** (real Chrome screenshot + in-app Browser-pane DOM against the running dev server): 493-player pool, real ESPN headshots, `$76-97` range hero, `base $87 · mkt ~$64`, `+$13 POCKET`/`ELITE` badges, `BYE 6 · 374 PTS · RB1`, recommendation strips, the ⓘ popover rendering full sourcing (`Worth $97 … ↔ Room $76 … base is the midpoint`), and the Refresh button (verified `/api/players` → 200). Range fallbacks confirmed live: Jonathan Taylor renders a single point (`$60 / Fair value ~$60`); Justin Jefferson shows `$-4 TAX / Let him go`.

**Files:** `src/lib/players/value-range.ts` (new), `src/lib/players/tags.ts` (rewritten), `src/lib/players/headshot.ts` (new), `src/lib/players/recommendation.ts` (new), `src/lib/players/__tests__/{value-range,tags,headshot,recommendation}.test.ts` (new, 37 tests), `public/player-silhouette.svg` (new), `src/components/prep/ffi-player-intel-card.tsx` (rewritten), `src/app/(app)/prep/players/client.tsx`, `.claude/BUILD_PLAN.md` (incl. the DASHBOARD_STATUS comment block), `.claude/WORKING_STATE.md`, `.claude/CHANGELOG.md`.

---

## 2026-08-12 / S2 = P3 — league-calibrated valuation & exploit engine (VAL-1/2/3)

**Task:** ROAD TO DRAFT S2 `[Opus]` = P3 — ceiling/reality/play pricing on the corrected 16yr Nasties ledger: VAL-1 (calibrated ceiling + expected room price), VAL-2 (tendency/exploit engine), VAL-3 (re-anchor the live max-bid). Closes VAL-1/2/3, FB-15; FB-12 foundation. | **Class:** pipeline | **Lenses:** Architecture, QA, Security

**Problem:** the app's whole point — dynamic pricing calibrated to Joe's actual room — did not exist at runtime. The board showed national/consensus numbers, `tendencies.ts` was an 8-line `// TODO` stub, and `auction-advisor.ts` anchored max-bid on `consensusValue × 1.3` (the wrong national number).

**What changed:**
- **VAL-1 (ceiling + expected room price):** `league-calibration.ts` exposes runtime accessors over the committed `league-calibration.json` artifact (per-position rank→price curves, positional inflation, per-owner leans). `convert.ts`/`types.ts` now compute and expose, per cached player, `ceilingValue` (roster-aware VORP worth, `vorp_12_200_ppr`), `expectedRoomPrice` (the player's positional rank mapped onto the room's real price-by-rank curve), and `valueGap` (ceiling − room). `draft-board-table.tsx` renders ceiling (big) / room~ (sub) / a colored gap-chip (volt "pocket" / pink "hot").
- **VAL-2 (tendency/exploit engine):** replaced the `tendencies.ts` stub with `positionExploit` (inflation: RB COOL 0.84x value pocket, WR HOT 1.18x, TE HOT 1.17x), `ownerExploit` (per-owner leans: Shultz→TE, Leems→DEF, Cross→WR, etc.), `detectPositionRun`/`runExploit` (window-bounded live-run detection off the last-N picks), and `buildExploitSignals` (folds the 3 layers, drops neutral when an actionable signal exists, ranks by weight). Added `toCalibratedPositionSafe` to `league-calibration.ts` and made the position mapper null-safe.
- **VAL-3 (live re-anchor):** `calculateMaxBidAdvice` gains an optional `calibrated` input (`{ ceiling, expectedRoomPrice, inflationTag }`); when present it anchors the recommended max on the ceiling/room midpoint with a directional HOT (cap at midpoint) / COOL (allow ceiling, ×1.08 headroom) tilt, replacing the `consensusValue × 1.3` national anchor, and pushes a "League-calibrated — Worth X, room pays ~Y" factor. Inflation is NOT re-multiplied (already baked into the curve — directional tilt only). Wired live in `draft/live/client.tsx`'s `maxBidAdviceMap` when a player has both calibrated fields.

**Bug found + fixed (`/bug-hunt free`, logged in `.claude/BUG_LOG.md`):** BUG-001 (LOW) — `ceilingValue` is never nullish (falls back to `Math.round(avgAuction)` = 0 for a legacy unpriced row), so the old `ceilingValue !== undefined` gap guard always fired and painted a false "$-X hot" chip on a $0-worth ranked row. Fixed the guard to `ceilingValue > 0` in `convert.ts` so unpriced rows get `valueGap = undefined` (no chip).

**Verify:** `type-check` 0 errors · `test:run` 116/116 pass (20 new tendency tests: RB value-pocket / WR-hot / Shultz→TE / Leems→DEF / window-bounded run detection / buildExploitSignals ranking + neutral-drop) · `lint` 0 new (44 pre-existing baseline; 2 em-dash errors I introduced were fixed before the gate) · `build` compiled clean. **Board proof (real players_cache via service-role read):** Gibbs $97 ceiling / room ~$76 / +$21 VALUE POCKET, 177 priced players; 18 volt gap-chips render at computed `rgb(139,255,69)`. Pixel screenshot was blocked by an undisplayed browser pane (environment, not code) — proven instead via `get_page_text` (all rows) + `javascript_tool` computed-CSS color. Calibrated anchor confirmed to NOT double-count inflation.

**Files:** `src/lib/draft/tendencies.ts` (new), `src/lib/draft/__tests__/tendencies.test.ts` (new, 20 tests), `src/lib/draft/league-calibration.ts`, `src/lib/draft/auction-advisor.ts`, `src/lib/players/convert.ts`, `src/components/prep/draft-board-table.tsx`, `src/app/(app)/draft/live/client.tsx`, `scripts/derive-league-calibration.ts`, `scripts/verify-calibrated-board.ts` (new, $0 read-only verify tool), `.claude/BUG_LOG.md` (new), `BUILD_PLAN.md`, `WORKING_STATE.md`.

---

## 2026-08-11 / ROAD TO DRAFT — reordered so Joe never tests an unfinished app (planning)

**Task:** Joe: "put that towards the bottom of the build plan, I'm not doing a test until the app works" (in response to S2 being proposed next — live join/sync, tagged `[Sonnet+Joe]`, needing his auctioneer running to verify) | **Class:** `docs` | **Lenses:** Delivery

**Problem:** the session sequence put a Joe-required verification step (S2, live join/sync) second, right after S1 — meaning Joe would be pulled in to test a barely-started app long before the valuation engine, research depth, or strategies existed. That's backwards: solo-buildable work should run first, and anything needing Joe's hands-on time should be last, once there's something worth testing.

**What changed (plan docs only — no app code):**
- **BUILD_PLAN.md ROAD TO DRAFT re-sequenced:** S1(done, config/nav) → **S2** = P3 valuation engine `[Opus]` (was S3) → **S3** = research depth `[Opus+Sonnet]` (was S4) → **S4** = strategies `[Opus+Sonnet]` (was S5) → **S5** = bug hunt on S1-S4 `[Sonnet/Opus]` (was S6) → **S6** = live join/sync fix `[Sonnet]`, retagged solo — the actual bug (broken Join page) is a code fix, not a Joe-testing task; only the *full proof against a real running auctioneer* still needs Joe, and that's explicitly deferred to S8 → S7 = Claude-driven Chrome usability test (unchanged position) → **S8** = Joe's rehearsal `[Sonnet+Joe]`, still last, still the **only** session that needs Joe's hands-on testing.
- Fixed a stale cross-reference caught while re-sequencing: S2(old)'s "Folds in DR-7.2" was wrong — DR-7.2 (the raw auctioneer feed-contract smoke test) was already verified 2026-08-10; FB-7 (the broken `/draft/live` Join page) is a distinct, still-open bug. Corrected the FB-7 catalog note to say so.
- Cut line updated: **S1 → S2 → S5 → S6 → S7 → S8** is now the minimum viable draft-night path; S3/S4 (research depth, strategies) remain compressible depth.
- `WORKING_STATE.md` "Next open item" repointed to the new S2 (valuation engine), with the reorder logged as a thin pointer back here.

**Verify:** plan-only change, no runtime touched. No type-check/test run required for docs.

---

## 2026-08-11 / S1 — config truth + navigation (FB-1, FB-4, FB-5, FB-6)

**Task:** ROAD TO DRAFT S1 `[Sonnet]` — fix "10 teams" (FB-1), kill "Pre Flight" (FB-4), add back-nav from deep screens (FB-5), clarify Draft Board vs Live Draft (FB-6) | **Class:** shared/output | **Lenses:** Correctness, Delivery

**What changed:**
- **FB-1 (stale "10 teams"):** root cause was duplicate-active-league drift, not a hardcoded value — no literal `10` exists in `src`. `prep/configure/actions.ts`'s `createLeague` action now sets `is_active: true` on insert and demotes every other league row for that user to `is_active: false` in the same call, so re-saving the config form can never leave two "active" leagues where `/api/leagues`'s `leagues[0]` tiebreak (`is_active desc, updated_at desc`) silently picks the stale one. Required adding `is_active?: boolean` to `LeagueInsert` in `database.types.ts` (type-check was failing without it).
- **FB-4 ("Pre Flight"):** verified already removed from `draft/page.tsx` — no code change needed.
- **FB-5 (no back-nav on deep screens):** added the existing GRIDIRON back-link pattern (`ChevronLeft` + label, `inline-flex items-center gap-1 ffi-caption`) to `prep/players/client.tsx`, `prep/board/client.tsx`, `prep/strategies/client.tsx` (all -> `/prep` "Research") and `prep/simulate/page.tsx` (-> `/prep/strategies` "Strategies", its actual entry point — it previously had no back-nav at all). `prep/configure` and `prep/runs` already had it (-> `/settings`).
- **FB-6 ("Draft Board" vs "Live Draft" ambiguity):** renamed "Draft Board" -> "Cheat Sheet" in `prep/board/client.tsx`'s header and the `prep/page.tsx` jump-row label/sub-copy, plus one line of inline help ("Your pre-draft rankings - the auction itself happens under Live Draft") so the screen no longer reads as the live auction room.

**Verify:** `type-check` 0 errors · `test:run` 96/96 pass · `lint` 0 new errors (45 pre-existing, unrelated files — up from a recorded baseline of 39 due to a `react-hooks/refs` rule now firing on `nav-context.tsx`/`use-draft-feeds.ts`, neither touched this session) · `build` clean, all `/prep/*` routes present.

**Outstanding — loaded-preview screenshot deferred:** Next.js 16 (Turbopack) locks dev servers **per project directory, not per port** — another chat session held this project's only dev-server lock (PID 8040, port 3003) for the entire session, so no alt-port config could load a preview here regardless of port number. Presented Joe three options (kill the other session's process / ask that session first / skip visual proof and document it); **Joe chose to skip it** rather than disrupt the other session. First person to open `/prep`, `/prep/board`, `/prep/players`, `/prep/strategies`, `/prep/simulate` should eyeball the new back-links + "Cheat Sheet" rename.

**Files:** `prep/configure/actions.ts`, `database.types.ts`, `prep/players/client.tsx`, `prep/board/client.tsx`, `prep/strategies/client.tsx`, `prep/simulate/page.tsx`, `prep/page.tsx`, `BUILD_PLAN.md`, `WORKING_STATE.md`.

---

## 2026-08-11 / ROAD TO DRAFT — added dedicated bug-hunt + test + usability-test hardening passes (planning)

**Task:** Joe: "update the build plan to include bug hunts, testing, and then I want you to do your own usability test inside chrome sessions as well." | **Class:** `docs` | **Lenses:** Delivery

**What changed (plan docs only — no app code):**
- **BUILD_PLAN.md ROAD TO DRAFT:** the rehearsal gate moved from S6 to **S8**; inserted two new whole-app hardening passes ahead of it:
  - **S6 — Bug hunt + test hardening** `[Sonnet · Opus for logic]`: `/bug-hunt full` across the project + expand automated coverage on the S1-S5 code paths (12-teams config, join/sync, calibrated values, tag/range model, strategy chain).
  - **S7 — Usability test, Claude drives Chrome** `[Claude driving + Sonnet to fix]`: I walk every flow at mobile arm's-length in a Chrome session, catalog friction/dead-ends/breaks with screenshots, and fix them **before** Joe's phone rehearsal — so S8 is confirmation, not discovery.
- **Per-session gate made explicit:** every build session S1-S5 must pass type-check + test:run + lint(0 new) + build **plus `/bug-hunt free` on changed modules plus a loaded-preview screenshot** before it's called done. S6-S8 stack whole-app hardening on top.
- **Cut line updated:** S1→S2→S3→S6→S7→S8 is now the minimum viable path (hardening passes are NOT optional); S4/S5 remain compressible depth.
- Dashboard header + WORKING_STATE re-sequenced S1→S8.

**Verify:** plan-only change, no runtime touched. No type-check/test run required for docs.

---

## 2026-08-11 / ROAD TO DRAFT — all morning feedback captured, priority-ordered, model-bound (planning)

**Task:** Capture Joe's entire 2026-08-11 morning feedback onto the plan in priority build order, well-scoped, model-bound, in context-aware build sessions | **Class:** `docs` | **Lenses:** Delivery

**Problem:** Joe gave ~17 items of feedback across 3 screenshots the morning of 2026-08-11 (recovered from the session transcript after a compaction). Almost none of it was on the build plan — it "lived only in chat," which by his own rule means it didn't exist. He demanded it all be tracked, sequenced, scoped, and model-bound so the app gets built and working before his draft.

**What changed (plan docs only — no app code):**
- **BUILD_PLAN.md:** added the **🏈 ROAD TO DRAFT** block — the authoritative execution order as six context-aware, model-bound build sessions **S1→S6**: S1 config truth + nav `[Sonnet]`, S2 live Join/sync `[Sonnet+Joe]`, S3 = P3 valuation engine `[Opus]`, S4 research depth `[Opus+Sonnet]`, S5 strategies `[Opus+Sonnet]`, S6 = DR-7 rehearsal `[Sonnet+Joe]`. Each has why/reads-first/closes/done-when.
- **FB catalog:** added the full **FB-1…FB-17** morning-feedback catalog with honest per-item status, each mapped to a session. Verified against code: FB-2/FB-3 (tab renames) done (`app-shell.tsx:39-40`); FB-1 has no hardcoded `10` in `src` (source-trace needed); FB-4 "Pre Flight" still present (`draft/page.tsx:9`); FB-8 ADP removal coded (re-verify on screen).
- **Dashboard header + WORKING_STATE:** `currentPhase`/`nextItems` re-sequenced to S1→S6 (trust-fixes now precede the valuation engine, since a board that says "10 teams" and won't Join makes the engine worthless).
- **Cut line flagged:** S1→S2→S3→S6 = minimum viable draft night; S4/S5 compressible. Draft date still needed to set the hard must-have line.

**Verify:** plan-only change, no runtime touched. FB statuses spot-checked via grep against `src` (see per-item notes in the FB catalog). No type-check/test run required for docs.

---

## 2026-08-11 / P3 VAL-0 — real 16-year Nasties ledger imported + calibrated (foundation)

**Task:** P3 League-Calibrated Valuation, VAL-0 (correct + import the real ledger) | **Class:** `pipeline` | **Lenses:** Architecture, QA

**Problem:** The shipped board values (FF-080: FantasyPros ECR → distribution curve) are NATIONAL data — zero of Joe's league history. They produced a $97 Gibbs / $86 Puka top end that is $12-17 above the Nasties' 16-year all-time high (#1 has NEVER exceeded $85). Joe's ask: three numbers per player (ceiling / room-reality / the play) built on the REAL ledger, not national curves. New phase P3 approved 2026-08-11.

**What changed (data + tooling only — no app runtime code yet):**

- **Position corruption in the ledger diagnosed + repaired (VAL-0.1):** `bundle.json`'s position field is only reliable for the 5 dedicated single-starter slots; every flex/bench pick is mislabeled "RB." This produced a false "63% RB" reading. Repaired to `history-corrected.json` (normalized-name → real position, via the auctioneer's local-only `correct-history-positions.mjs`). Verified: 961 names, 98.8% of 2,292 picks resolved; the 5 WRs mislabeled RB on Joe's own 2025 roster (Pittman/Higgins/M.Harrison/Flowers/Worthy) now correctly WR.
- **Ledger brought in-repo (VAL-0.2):** copied `bundle.json` + `history-corrected.json` into `src/data/league-history/` so the app is self-contained (the sibling auctioneer repo does NOT deploy with this app). New tracked `scripts/derive-league-calibration.ts` reads only in-repo data. Removed 4 exploratory scratch scripts (superseded).
- **Build plan:** added P3 phase (VAL-0…VAL-3) under the one-plan rule; VAL-0 marked done.

**True calibration (corrected ledger, 2022-2025 era) — reverses the earlier corrupted read:**
- Positional inflation: **WR 45% (1.18x national) RUNS HOT** · **RB 39% (0.84x) RUNS COOL = value pocket** · TE 8% (1.17x) hot · QB 8% (0.96x) · DEF 1% (0.92x). The Nasties is a WR-first room; RB is where value hides.
- Expected-price curves: RB1 $76…RB16 $22 · WR1 $79…WR16 $23 · QB1 $36…QB12 $3 · TE1 $49…TE12 $2 · DEF1 $6.

**Verify ($0, local):** `npx tsx scripts/derive-league-calibration.ts` prints the curves + inflation above from in-repo data with no sibling-repo path. Position spot-check: Pittman/Higgins/M.Harrison/Flowers/Worthy → WR; Gibbs → RB; Lamb → WR. No app UI changed this pass — the re-priced board proof is VAL-1.3.

---

## 2026-08-11 / Real VORP auction values + real tags + ADP ripped out

**Task:** Wire real, roster-aware auction values and data-driven tags into the UI; remove ADP everywhere Joe sees it | **Class:** `output` (UI) + `shared` | **Lenses:** Design, QA, Architecture

**Problem:** The player cards showed a number labeled "ADP" that was actually ECR rank mislabeled (ADP is a snake-draft stat, meaningless in Joe's auction), a `consensusAuctionValue` that was a generic averaged fantasypros number, and "tags" that never fired (the old `getSystemTags` compared `adp` to `consensusRank`, both derived from the same ECR rank, so always equal). None of it applied to Joe's exact league.

**What changed:**

- **Real VORP model already in the DB** (from `scripts/populate-auction-values.ts`, prior session): ESPN full-PPR projected points -> roster-aware VORP for Joe's 12-tm / $200 / PPR / no-K league, budget-balanced so the top 156 prices sum to exactly $2,400. Stored per player as `auction_values.vorp_12_200_ppr` + `source_data.{proj_points,vorp,pos_rank_points,replacement_points,espn_auction_value}`.
- **`src/lib/players/convert.ts`**: `cacheToPlayer()` now prefers `vorp_12_200_ppr` as `consensusAuctionValue`; exposes `projectedPoints`, `vorp`, `positionRankByPoints`, `replacementPoints`, `marketAuctionValue` (ESPN market anchor), `ecrPositionRank`.
- **`src/lib/players/tags.ts`** (new): `computePlayerTags()` -> ELITE (tier 1), VALUE / FADE (projection vs expert positional rank, gap >= 10), VOLATILE (ECR std >= 20, in pool), SLEEPER (skill player past overall 84 still above replacement). Every input traces to real data.
- **`ffi-player-intel-card.tsx`** (rewrite): consumes real `PlayerTag[]`; shows "Your value $X" (VORP) + "market ~$Y" anchor + "374 PTS · RB1" meta; expanded view has a value breakdown grid (Your value / Market / Proj Pts) + Draft Intel with tag reasoning. No ADP.
- **`prep/players/client.tsx`**: sort is now by VORP value (best first), not ADP; tag filters are value/fade/sleeper from `computePlayerTags`; removed ADP state, ADP range filter, ADP slider panel, and demo "Top 5 as Targets" code.
- **`draft-board-table.tsx`**: value subline is "mkt ~$Y" not "ADP N.N"; stats grid shows PTS (projected points) instead of ADP.
- **`ffi-player-card.tsx`** (live draft) + **`player-pool.tsx`**: removed the snake-only ADP fallback and the FF-278 ADP-divergence `↕` indicator + its `getAdpDivergence` helper and `adpDivergence` prop.

**Verify (live, port 3003 via HMR):** `read_page` on `/prep/players` shows the real board sorted by value: Gibbs $97 / mkt ~$64 / 374 PTS · RB1 / ELITE; Puka $86 / mkt ~$57 / WR1 / ELITE; Josh Jacobs $48 / mkt ~$27 / VALUE. Expanded Gibbs card renders the value grid (Your value $97 / Market ~$64 / Proj Pts 374) + Draft Intel "FantasyPros Tier 1 - an anchor player". No "ADP" string anywhere in the rendered DOM. `type-check` 0 errors. `test:run` 96/96 pass. `lint` 0 errors/0 warnings across all 7 touched files (repo baseline of pre-existing errors unchanged). `build` clean.

**Known data caveat (not a UI bug):** ~6 of 424 players (e.g. Jonathan Taylor, Ashton Jeanty) didn't name-match ESPN in the populate run, so they show a VORP $ value but no PTS/pos-rank sub-line or market anchor. Fixing those name matches is a data-layer follow-up, not part of this wiring pass.

**Screenshot note:** the Browser pane would not composite frames in this headless session, so a pixel screenshot could not be captured; the `read_page` accessibility tree above is the live rendered-DOM proof. Joe can view it at `http://localhost:3003/prep/players`.

---

## 2026-08-10 / DR-7.3 prep: offline resync code review + verify

**Task:** DR-7.3 pre-test code review (P2 Draft Readiness) | **Class:** `docs` | **Lenses:** QA, Architecture

**Problem:** DR-7.3 (offline resync rehearsal) is the next open item but requires Joe's physical participation (go offline, reconnect, verify corrections). Before Joe tests it, confirm the FF-315 implementation is wired end-to-end so the test will be meaningful and not blocked by a code gap.

**What changed (no source code edited -- code review + WORKING_STATE update):**

- Read and traced the full offline resync path: `handleRecordPick` in `live/client.tsx:218-223` (provisional flag on offline picks); `justReconnected` detection in `use-draft-feeds.ts:88-94` (refs-in-render-path transition detector); `useEffect` in `live/client.tsx:207-214` that calls `reconcileWithAuctioneer(remoteLastSnapshot)` on reconnect; `reconcileWithAuctioneerPicks` in `state.ts:289-354` (pure function: price/manager correction + stay-provisional for auctioneer-absent picks + newPicksFromAuctioneer); corrections banner in `live/client.tsx:535-572` (amber auto-corrected notice); "UNCONFIRMED" badge in `fix-pick-sheet.tsx:59-66` (visible for picks still provisional after reconcile).
- Confirmed `RemoteAuctioneerPick` is a structural superset of `AuctioneerPickSnapshot` -- direct passthrough to reconcile is type-safe.
- Confirmed `newPicksFromAuctioneer` folded in via `addManualPick` calls, which (under React 18 auto-batching) batch with the same render cycle as `setConnected`/`setLastSnapshot`, so `stateRef.current` in the reconcile effect includes those picks -- no duplicate risk from the concurrent `onNewPicks` flow.
- Updated WORKING_STATE.md with a step-by-step DR-7.3 test walkthrough for Joe.

**Verify:** `type-check` 0 errors. `test:run` 96/96 pass. `lint` 39 errors (all pre-existing, 0 new). `build` clean. No source files changed.

**Still pending (need Joe):** DR-7.3 (offline resync rehearsal), DR-7.4 (phone test), DR-7.5 (full end-to-end mock draft).

---

## 2026-08-10 / DR-7 (partial): Supabase + auctioneer verification, stale session cleanup

**Task:** DR-7.1 + DR-7.2 (P2 Draft Readiness) | **Class:** `pipeline` | **Lenses:** QA, Architecture

**Problem:** DR-7.1 and DR-7.2 required confirmation that the live Supabase is seeded with real 2026 data and that the auctioneer proxy contract works against a real running draft. Additionally, two stale June-2026 dev sessions (generic "Me/Manager 2-12" names, zero picks) were blocking DR-5.1's auto-create -- while they existed as resumable, DR-5.1's `if (session) return` guard would silently use them instead of seeding a clean session with real Nasties team names.

**What changed (no source code edited -- all API calls and plan doc updates):**

- DR-7.1 verified: `/api/players?limit=500` returned 491 players; Ja'Marr Chase #1 at $70 (ECR rank 1), Puka Nacua #2 $69, Jahmyr Gibbs #3 $68 -- seed data correct. `/api/leagues` returned "Nasties 2026" (12-team, $200, PPR, is_active=true). Two old Nasties auction sessions from June 2026 (IDs `bcbf5e1f`, `a6d61365`) each had `picks: []` and generic manager names -- no real data loss -- marked `completed` via PATCH /api/draft/sessions/[id]. Resumable count for Nasties: 0, so DR-5.1 auto-create will now fire correctly.
- DR-7.2 verified: `/api/auctioneer-feed` during today's test draft (`isTest:true`) returned 85 picks across 12 Nasties teams (Rasar/Leems/Reggie/Crandall/Kevin/Bruce/Garrett/Cross/Shultz/Moe/Robbie/Danny). Pick contract correct: `id`, `player.name/position/team/byeWeek/espnId`, `teamId`, `price`, `pickNumber`, `timestamp` all present. No CORS error (server proxy handles by design).

**Verify:** `type-check` 0 errors. `test:run` 96/96 pass. `lint` 39 errors (all pre-existing, 0 new). No source files changed.

**Still pending (need Joe):** DR-7.3 (offline resync rehearsal), DR-7.4 (phone test), DR-7.5 (full end-to-end mock draft confirmation).

---

## 2026-08-10 / DR-6.3: Remove 3 dead Research-tab components

**Task:** DR-6.3 (follow-up to DR-6.1) | **Class:** `output` | **Lenses:** Design, QA

**Problem:** DR-6.1's design-consistency sweep flagged `src/components/prep/data-freshness.tsx`, `source-weights-config.tsx`, and `user-rules-editor.tsx` as dead/orphan files (zero imports/usages found anywhere in the codebase) but didn't act on them, deferring the deletion via `spawn_task`.

**What changed:**

- Re-verified all three files were unreferenced: grepped `src/` for each exported symbol (`DataFreshness`, `SourceWeightsConfig`/`useSourceWeights`/`DEFAULT_SOURCE_WEIGHTS`, `UserRulesEditor`) and each filename/import path — every match was the file's own declaration, no importers, no barrel/index re-export.
- Deleted `src/components/prep/data-freshness.tsx`, `src/components/prep/source-weights-config.tsx`, `src/components/prep/user-rules-editor.tsx`.

**Verify:** `npm run type-check` 0 errors. `npm run build` clean (54 routes, same route count as before deletion — confirms nothing was actually reachable through these files).

---

## 2026-08-10 / DR-6: GRIDIRON design-consistency sweep + season/* quarantine

**Task:** DR-6 (P2 Draft Readiness) | **Class:** `output` | **Lenses:** Design, Delivery, QA

**Problem:** The app was ~85% on the GRIDIRON design system. `prep/runs/client.tsx` and `components/prep/strategy-proposals.tsx` still used old shadcn primitives, and investigation surfaced 7 more reachable Research-tab files off-system too (`strategy-proposal-card.tsx`, `strategy-compare.tsx`, `strategy-value-preview.tsx`, `strategy-list.tsx`, `league-config-form.tsx`, `position-breakdown.tsx`, `strategy-editor.tsx`). Joe was asked via the mandatory scope-expansion halt and chose the full 9-file sweep over the original 2-file plan text. Separately, the 5 `season/*` in-season-companion screens sit on the pre-GRIDIRON design system, are unreachable from nav, and had no marking distinguishing them from live, in-scope screens.

**What changed:**

- **DR-6.1 (scope expanded, Joe-approved):** all 9 files converted from shadcn/ui primitives (`Button`, `Card`/`CardContent`/`CardHeader`/`CardTitle`, `Badge`, `Input`, `Label`, `Select*`, `Slider`, `Table*`) to GRIDIRON `ffi-*` utility classes and inline `var(--ffi-*)` custom-property styles, preserving all existing logic/state/handlers/props exactly (pure styling/markup conversion, not a refactor). Native `<input type="range">` with `accentColor: var(--ffi-blue-bright)` replaces shadcn `<Slider>` throughout `strategy-editor.tsx`. `prep/runs/client.tsx`'s shadcn `<Table>` run list and metrics-comparison table were converted to `ffi-card` row/expandable layouts and a 3-column CSS-grid `CompareStatRow`, not just re-skinned as raw HTML tables -- full removal, since Table deletion was mandatory regardless and GRIDIRON's rule bars HTML tables for player lists.
- **DR-6.2 (decision recorded):** `season/*` (`page.tsx`, `matchups/page.tsx`, `start-sit/page.tsx`, `trade/page.tsx`, `waivers/page.tsx`) confirmed unreachable (zero references in `src/components/layout/` or `app/(app)/layout.tsx` nav). **Decision: quarantine, not delete.** Each file's top-of-file docblock now carries an explicit "PARKED / OFF-SYSTEM (DR-6.2, 2026-08-10)" banner stating it's unreachable, pre-GRIDIRON, out of scope for draft night, and held for a future in-season companion phase (P8). In-season companion confirmed out of scope for draft night.
- Fixed an unused `ChevronDown` lucide-react import in `prep/runs/client.tsx` surfaced by lint during VERIFY.

**Verify:** `npm run type-check` 0 errors, `npm run lint` 41 pre-existing baseline errors unchanged (0 in touched files; 1 warning fixed), `npm run test:run` 96/96 pass, `npm run build` clean (54 routes). Browser-verified 4 of 9 converted screens (`/prep/runs`, `/prep/strategies` partial, `/prep/board` position-breakdown, `/prep/configure` league-config-form) via DOM structure (`read_page`), console errors (`read_console_messages`), and computed CSS values (`javascript_tool`): confirmed GRIDIRON tokens resolve correctly at runtime (e.g. tier badge computed `rgb(121,166,255)` = exactly `--ffi-blue-bright`; form input `rgb(12,19,34)` = exactly `--ffi-surface-1`) and zero new console errors traceable to the converted files. **Gap, disclosed rather than glossed over:** pixel screenshots were unavailable this session (`computer{action:"screenshot"}` failed with "Browser pane is not displayed, so the page is not compositing frames", a client-side tool issue, non-recoverable within the session); DOM/console/computed-style checks were used as the verification substitute. `strategy-editor.tsx`, `strategy-proposal-card.tsx`, and `strategy-compare.tsx` were not directly browser-exercised (no UI path found to reach the strategy editor, and "Generate Strategies" was deliberately not clicked since it fires a paid Claude API call requiring separate cost approval): they passed type-check/lint/build but not live browser interaction. One unrelated, pre-existing console error observed on `/prep/configure` and `/prep/board` (`[useUserTags] Error: TypeError: fetch failed`, 500s from an API route), not traced to any of the 9 converted files, not fixed this session, flagged for awareness. Three pre-existing dead/orphan files found during the sweep (`data-freshness.tsx`, `source-weights-config.tsx`, `user-rules-editor.tsx`) were flagged via `spawn_task` as a separate follow-up, not touched here.

---

## 2026-08-10 / DR-5: One-tap Go Live + connection-UX cleanup

**Task:** DR-5 (P2 Draft Readiness) | **Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Problem:** On a cold start with no pre-existing resumable session, "Auctioneer is LIVE" still routed through the 3-step `/draft/setup` flow before entering the room (`draft/page.tsx`'s `goLiveHref` fell back to `/draft/setup` whenever `session` was null) -- a detour Joe doesn't want at the table. Separately, the room's connection status (`draft/live/client.tsx`) computed `online = !(remoteError || aifError)`, which read LIVE before the first poll ever landed and stayed LIVE in pure Manual mode where no feed is connected at all -- it measured "no error yet," not "actually connected." And `/draft/setup`'s manual flow seeds generic placeholder manager names ("Me", "Manager 2", ...) which never match the auctioneer's real team names, silently breaking `applyPick`'s (`state.ts`) exact-string-match budget/roster attribution for that manager.

**What changed:**

- `src/hooks/use-remote-auctioneer-feed.ts` -- Added a new `teams: RemoteAuctioneerTeam[] | null` field to the hook's return, populated from `state.config.teams` on every successful live poll (public type `RemoteAuctioneerTeam` exported alongside it). Gives callers the auctioneer's real team roster (id + name) as soon as it reaches `'drafting'` phase, even before any picks exist.
- `src/app/(app)/draft/page.tsx` -- Added a `useEffect` that, once the auctioneer is detected live (`remote.connected`) and there's no resumable session yet, auto-POSTs `/api/draft/sessions` seeded with `remote.teams` as the manager list (so names match the auctioneer exactly) and sets the returned session -- `goLiveHref` then naturally resolves straight into the room instead of `/draft/setup`. Guarded with an `autoCreateAttempted` ref (fires once), a disabled "Preparing room..." CTA state so a tap can't race the in-flight create, and an `autoCreateError` fallback that keeps manual Go Live -> Setup working if the auto-create POST fails. Also fixed a cosmetic bug where the header `ConnectionStatusPill` flashed OFFLINE before the first poll landed (now gated on `remote.hasPolled`).
- `src/app/(app)/draft/live/client.tsx` -- Fixed `online` to source `aifConnected`/`remoteConnected` directly from `useDraftFeeds()` (added `remoteConnected` to the destructure) instead of the inverted no-error heuristic. Removed a confirmed-dead `ConnectionStatusPill` import (never rendered in this file) and five destructured values (`aifImportedCount`, `aifError`, `remoteLastSyncAt`, `remoteError`, `remoteRetry`) that had zero other usages in the file -- `aifError`/`remoteError` specifically went dead as a direct result of the `online` fix.

**Verify:** `npm run type-check` 0 errors, `npm run test:run` 96/96 pass, `npm run lint` 41 errors (pre-existing baseline, confirmed 0 in the three touched files via full-output grep), `npm run build` clean (Turbopack Google Fonts fetch failed transiently on first run -- network hiccup, not a code issue -- clean on immediate retry with `/draft`, `/draft/live`, `/draft/setup` all compiling/prerendering). Browser screenshot not available this session -- the shared preview infra port (8894) was held by an unrelated concurrent chat session's dev server, which this session cannot stop. Full live-path proof (auto-create firing against a real auctioneer, LIVE/STALE/OFFLINE against real poll timing) is DR-7's job, not claimed here.

---

## 2026-08-10 / DR-4: Kill misleading / fake data

**Task:** DR-4 (P2 Draft Readiness) | **Class:** `output` | **Lenses:** QA, Delivery

**Problem:** Two screens showed fiction as fact. Player Browser's "system intel" tags used `getMockSystemTags` with `Math.random() > 0.7` to fabricate a BREAKOUT badge, and hardcoded a fake `sources: ['FantasyPros']` on a SLEEPER badge claiming multi-source verification that never happened. The Dry-Run sim used a generic `DEFAULT_ROSTER` (qb1/rb2/wr2/te1/flex1/k1/dst1/bench6/ir0) instead of the locked Nasties shape (qb1/rb1/wr1/te1/flex3/k0/dst1/bench5/ir1), so practice grades (including a Kicker grade Joe will never actually draft for) wouldn't match draft night.

**What changed:**

- `src/app/(app)/prep/players/client.tsx` -- Removed the `BREAKOUT` (`Math.random()`) and `SLEEPER` (fabricated `sources`) tag generators from `getMockSystemTags` (renamed `getSystemTags`); kept `VALUE`/`AVOID`, which are genuinely deterministic off real `player.adp`/`player.consensusRank`. Removed the now-dead `'breakout'`/`'sleeper'` options from `TagFilter`/`TAG_FILTERS` and the filter `switch`.
- `src/app/(app)/prep/simulate/client.tsx` -- `DEFAULT_ROSTER` now matches `NASTIES_PRESET.roster` (league-config-form.tsx:22) exactly: `{qb:1, rb:1, wr:1, te:1, flex:3, k:0, dst:1, bench:5, ir:1}` (14 total slots, was 15). Dropped `K` from `STARTER_SLOTS` and both position-grading `positions` arrays (grading loop + `PositionGradeCard`) since Nasties carries zero kicker slots -- grading a position that's never drafted would always read "F / shut out," its own fake signal.

**Verify:** `npm run type-check` 0 errors, `npm run test:run` 96/96 pass, `npm run lint` 41 errors (pre-existing baseline, 0 new -- confirmed none in the two touched files), `npm run build` clean. UI screenshot not available (preview infrastructure port conflict with a concurrent session, same as DR-3; change is logic-only, no styling/layout touched).

---

## 2026-08-10 / DR-3: Fix the inverted cost-guard

**Task:** DR-3 (P2 Draft Readiness) | **Class:** `pipeline` + `output` | **Lenses:** QA, Security

**Problem:** The cost guard was inverted. "Run Research" had a confirm dialog claiming "runs AI analysis (Claude)... uses your API credits" -- but `runResearchPipeline` is 100% deterministic (ESPN/Sleeper/FantasyPros free APIs + pure scoring math, zero Claude calls). Meanwhile "Generate Strategies" (calls `proposeStrategies` → `askClaudeJson`) had no confirm at all. Bonus find: `/api/research/route.ts` had a spurious `ANTHROPIC_API_KEY` check that 503'd the entire Run Research endpoint when the key is absent -- a draft-night blocker since the pipeline doesn't need the key.

**What changed:**

- `src/components/prep/strategy-proposals.tsx` -- Added `confirming` state; "Generate Strategies" button now sets `confirming:true` instead of firing `generate`; added inline cost-confirm block (cancel/confirm) with honest copy: "Claude will analyze your player pool and generate 4-6 draft strategies. This uses your Anthropic API credits (~$0.01-0.05 per run)."
- `src/app/(app)/prep/page.tsx` -- Fixed misleading confirm text: "runs AI analysis (Claude)... uses your API credits" → "pulls fresh data from ESPN, Sleeper & FantasyPros... No AI credits used." Fixed sub-text: "Uses AI · runs only when you tap" → "Free data pull · no AI credits."
- `src/app/api/research/route.ts` -- Removed spurious `ANTHROPIC_API_KEY` guard (lines formerly 78-83); the research pipeline never calls Claude so the check was both wrong and a functional blocker.

**DR-3.3 note:** `lib/research/analyze.ts` confirmed deleted (DR-2.3); no orphaned Claude functions remain.

**Call-path audit (evidence):**
- `/api/research` → `runResearchPipeline` (service.ts) → fetchAllSleeperData / fetchAllESPNData / fetchAllFantasyProsData + scorePlayersWithStrategy. No `askClaudeJson` import anywhere in service.ts. **Zero Claude spend.**
- `/api/strategies/propose` → `proposeStrategies` (strategy/research.ts:15 imports `askClaudeJson`). **Real Claude spend -- now confirm-gated.**
- Board Refresh (`board/client.tsx:handleFullRefresh`) calls `/api/research` -- same deterministic pipeline. No confirm needed; none added. (BUILD_PLAN audit incorrectly flagged this as Claude-spend; code disproves it.)

**Verify:** `npm run type-check` 0 errors, `npm run test:run` 96/96 pass, `npm run lint` 41 errors (pre-existing baseline, 0 new), `npm run build` clean. UI screenshot not available (preview infrastructure blocked by concurrent session; changes are copy edits + type-safe state logic).

---

## 2026-08-10 / DR-2: Kill the dead paths

**Task:** DR-2 (P2 Draft Readiness) | **Class:** `shared` | **Lenses:** Architecture, QA

**Problem:** Dead Google Sheets code still shipped in the live path (a `sheet_url` on a session would start a second polling loop), snake/keeper leftovers surfaced in an auction-only tool (`SnakeAnalysisCard` in the Review screen, Tyler preset in scoring-presets), and three orphaned files cluttered the codebase.

**What changed:**

Files deleted:
- `src/lib/sheets/index.ts` -- Google Sheets client (readSheet, detectColumnMapping, SheetRow)
- `src/app/api/draft/sheets/route.ts` -- Sheets polling API route
- `src/hooks/use-draft-polling.ts` -- Sheets polling hook (7-second poll loop)
- `src/lib/research/analyze.ts` -- Orphaned LLM analysis functions; `formatScoringBonuses` inlined into its only real caller (`recommend/route.ts`)
- `src/components/settings/sound-settings.tsx` -- Orphaned sound toggle (UI removed earlier)
- `src/app/(app)/prep/research/` -- Empty dead directory

Source edits (Google Sheets removal):
- `src/hooks/use-draft-state.ts` -- Removed `useDraftPolling` integration, `handleNewSheetPicks` callback, and `isPolling`/`lastPollAt`/`pollNow`/`sheetError` from the return type; removed `applySheetRows` from imports (function deleted from state.ts)
- `src/lib/draft/state.ts` -- Removed `applySheetRows` function and `SheetRow` import
- `src/lib/draft/__tests__/state.test.ts` -- Removed `applySheetRows` describe block (9 tests) + `SheetRow` import
- `src/app/(app)/draft/setup/client.tsx` -- Removed `sheets` DraftMode, `FileSpreadsheet` import, `sheetUrl` state, Google Sheet URL input block, and `sheet_url` from session POST body
- `src/lib/draft/auction-feed-merge.ts` -- Removed `'sheets'` from `FeedSource` union type; updated comment
- `src/lib/draft/__tests__/auction-feed-merge.test.ts` -- Updated test using `'sheets'` source to `'remote'`
- `src/app/(app)/draft/live/client.tsx` -- Removed `lastPollAt`/`sheetError` from `useDraftState` destructure; removed `sheetError` from `online` computation
- `src/app/api/draft/recommend/route.ts` -- Removed `@/lib/research/analyze` import; inlined `formatScoringBonuses`
- `src/app/api/draft/recommend/__tests__/route.test.ts` -- Removed stale `vi.mock('@/lib/research/analyze')` mock

Source edits (snake/keeper removal):
- `src/app/(app)/draft/review/client.tsx` -- Removed `SnakeAnalysisCard` import and render
- `src/lib/scoring-presets.ts` -- Removed `TYLERS_SLEEPER_SCORING` export (no callers)
- `src/lib/research/service.ts` -- Removed keeper-exclusion block (was unreachable in auction-only mode); `keeperSettings` field kept in `PipelineConfig` for back-compat with callers that pass it

**Verify:** `npm run type-check` 0 errors, `npm run test:run` 96/96 pass, `npm run lint` 41 errors (same count as pre-edit baseline -- 0 new), `npm run build` clean. grep confirms no `sheet_url` in live code paths, no `'sheets'` FeedSource, no `SnakeAnalysisCard` render, no `useDraftPolling`. Auctioneer live path untouched (state.ts core, auction-feed-merge logic, remote feed hook all byte-identical).

---

## 2026-08-10 / DR-1: Truth-up living dev docs to auction-only + auctioneer-feed reality

**Task:** DR-1 (P2 Draft Readiness) | **Class:** `docs` | **Lenses:** Delivery

**Problem:** Every dev doc a session reads first still described Google Sheets as the draft input, snake/keeper/Tyler as active scope, and retired commercialization as the roadmap. NORTH_STAR.md and ARCHITECTURE.md did not exist. README.md was create-next-app boilerplate. TESTING_GUIDE.md was 440 lines describing Phase 8 snake/Sheets/in-season flows. FEATURES_INDEX.md and CODE_AREAS.md showed Snake Mode and Google Sheets integration sections as first-class features; live-room components and the auctioneer feed hooks were absent.

**What changed (docs only -- no source code):**
- `NORTH_STAR.md` -- created: auction-only purpose, system of record, live sync path, design system (GRIDIRON v3.1), out-of-scope list, one-plan rule.
- `ARCHITECTURE.md` -- created: full live-draft data flow diagram, advisor engine, research pipeline, API surface, Supabase schema, "What Is NOT in This App" table.
- `README.md` -- replaced create-next-app boilerplate with real project readme (purpose, stack, dev commands, key docs table).
- `docs/TESTING_GUIDE.md` -- rewritten auction-only (~120 lines): auth, Nasties defaults, all prep flows, live draft (auctioneer feed + Go Live + offline resync), post-draft review, mobile arm's-length, known limitations.
- `.claude/CLAUDE.md` -- targeted fixes: Project Overview (Joe-only, auction-only), Tech Stack (dropped Google Sheets row), Folder Structure (dead /prep/research noted, auctioneer-feed proxy added, lib/draft updated, Yahoo adapter removed from sources comment, keeper rules removed from leagues table), Key Design Decisions (#1 auction-only, #2 ESPN-only, #3 no keeper, #5 rule-based advisor, #6 auctioneer feed), added One-Plan Rule section.
- `.claude/FEATURES_INDEX.md` -- full rewrite: Snake Mode section removed, Sheets Integration section replaced by Auctioneer Live Feed section, live-room components documented (all 12 files), dead-code register table added, tag cloud cleaned.
- `.claude/CODE_AREAS.md` -- full rewrite: Sheets section removed, auctioneer-feed proxy added, hooks updated (use-remote-auctioneer-feed, use-auctioneer-feed), live-room components documented, dead-code notes added.

**Verify:** `npm run type-check` 0 errors. `npm run test:run` 103/103 passed. Grep of 7 living docs for `google sheet/snake/keeper/Yahoo/Tyler/localhost:3000` returns only intentional out-of-scope or dead-code mentions. Zero source files changed. No paid endpoints fired.

---

## 2026-08-10 / Build-plan + dev-doc overhaul (P2 Draft Readiness)

**Task:** Doc overhaul (Joe-directed) | **Class:** `docs` | **Lenses:** Delivery

**Problem:** The build plan + dev docs had rotted. `BUILD_PLAN.md`'s DASHBOARD_STATUS header contradicted its own body (claimed P0-UX active / UX-V2 not done while the body marked both `[x]`). Open `[ ]` items pointed at dead Google Sheets work (FF-260, FF-081, FFT-006's "mock Google Sheet") after the draft-input model changed to a direct auctioneer connection. A prior session had spawned a standalone orphaned plan (`AUCTIONEER_UI_PORT_PLAN.md`) instead of folding the decision into the one plan. `WORKING_STATE.md` had grown to 51KB of accreted per-session changelog with April-era stale content.

**What changed (docs only — no source code):**
- `BUILD_PLAN.md` refreshed IN PLACE (not replaced): DASHBOARD_STATUS rewritten to true state; all completed tracks (P0-UX, UX-V2, P0 sub-tiers, P1/P1b, Phases 0-8) compressed into a Completed History section; dead Google Sheets items removed; the **AUCTIONEER_UI_PORT_PLAN** folded in as a REJECTED decision record (app keeps its GRIDIRON identity); added the **one-plan rule** guardrail. Remaining work rewritten as 7 sequential, model-tagged Draft-Readiness sessions (DR-1…DR-7), each citing the audited defect it fixes.
- `WORKING_STATE.md` thinned 51KB → ~20-line pointer (scope, active phase, next open item, live blockers).
- `.claude/archive/` created; 11 stale/superseded docs moved there (AUCTIONEER_UI_PORT_PLAN, 6 UX pre-work docs, 4 earlier UI eval/research docs) with an archive README.

**Verify:** `git status` shows 11 deletions at old paths + `.claude/archive/` with the 11 files + README; BUILD_PLAN/WORKING_STATE modified. `launch.json` left untouched (excluded from commit). Zero source files changed. No paid endpoints fired.

---

## 2026-08-10 / FF-080: Pre-draft 2026 data refresh

**Task:** FF-080 (P2) | **Class:** `pipeline` (data ingestion) | **Lenses:** QA

**Problem:** Player cache was last seeded in June 2026. Preseason roster moves, injuries, and depth-chart changes were not reflected. Board showed UNRANKED/$1 placeholders because FantasyPros ECR values had not been populated.

**What changed (Supabase data only — no source code):**
- `scripts/seed-players-sleeper.ts` run: 3,059 players upserted from Sleeper API (current active QB/RB/WR/TE/DEF, no kickers). Supabase total: 3,141. `last_updated_at` = 2026-08-10.
- `scripts/populate-fantasypros.ts` run: 489 players populated with real 2026 PPR ECR rankings + derived auction values ($200/12-team quadratic decay). Top 10: Ja'Marr Chase $70, Puka Nacua $69, Jahmyr Gibbs $68, Bijan Robinson $67, Jaxon Smith-Njigba $65, Amon-Ra St. Brown $64, Christian McCaffrey $63, CeeDee Lamb $62, Justin Jefferson $61, Jonathan Taylor $60.

**Verify:** both scripts exit 0, 3,059/3,059 upserted (Sleeper), 489/489 upserted (FantasyPros), 491 players with real board values confirmed in Supabase. No paid endpoints fired.

---

## 2026-08-10 / FF-315: Offline resync + reconciliation

**Task:** FF-315 (P1b) | **Class:** `pipeline` (feed hooks + draft state) | **Lenses:** Architecture, QA

**Problem:** If Joe's phone loses the auctioneer feed mid-draft and he records picks manually, there was no mechanism to (a) tag those picks as provisional, (b) reconcile them against the auctioneer's system-of-record snapshot on reconnect, or (c) surface auto-corrections so Joe sees what changed.

**What changed:**
- `src/lib/draft/state.ts`: Added `provisional?: boolean` to `DraftPick`; new types `AuctioneerPickSnapshot`, `PickCorrection`, `ReconciliationResult`; new pure function `reconcileWithAuctioneerPicks()` — matches by player_name (case-insensitive), auctioneer wins on discrepancies, returns corrected pick array + corrections list + net-new auctioneer picks.
- `src/hooks/use-draft-state.ts`: Added `stateRef` (synchronous state read for concurrent-mode safety); added `reconcileWithAuctioneer` action — runs reconcile, rebuilds state, folds in net-new picks via `addManualPick`; returns `PickCorrection[]` for the banner.
- `src/hooks/use-remote-auctioneer-feed.ts`: Added `lastSnapshot: RemoteAuctioneerPick[] | null` — full normalized pick list from each successful poll (NOT filtered by seenIds), for offline reconciliation.
- `src/hooks/use-draft-feed.ts`: Threads `remoteLastSnapshot` from `useRemoteAuctioneerFeed` through `UseDraftFeedResult`.
- `src/hooks/use-draft-feeds.ts`: Added `wasConnectedRef` + `prevRemoteConnectedRef` to compute `isOfflineFromAuctioneer` and `justReconnected` in the render path; exposes all three via return.
- `src/app/(app)/draft/live/client.tsx`: Wires `justReconnected → reconcileWithAuctioneer(remoteLastSnapshot)` in a `useEffect`; `handleRecordPick` wraps `addManualPick` to tag picks `provisional: true` when `isOfflineFromAuctioneer`; amber corrections banner lists auto-corrected picks with dismiss.
- `src/components/draft/live-room/fix-pick-sheet.tsx`: `PickRow` shows small amber "UNCONFIRMED" chip when `pick.provisional === true`.
- `src/lib/draft/__tests__/state.test.ts`: 6 unit tests for `reconcileWithAuctioneerPicks` (non-provisional pass-through, exact match clears, price correction, manager correction, absent-from-auctioneer stays provisional, net-new from auctioneer, case-insensitive match).
- `.claude/OFFLINE_RESYNC_SPEC.md`: Full spec written before implementation.

**Verify:** type-check 0 errors · lint 0 new errors on changed files · 103/103 tests (6 new) · build clean (`/draft/live` present). No paid endpoints fired.

---

## 2026-08-09 / Finding 8: one dedup key (auctioneer pick id) for the live feed

**Task:** CODE_REVIEW_2026-06 finding 8 (P1, Architecture/dedup) | **Class:** `shared` (feed hooks + merge util) | **Lenses:** Architecture, QA

**Problem:** two mismatched dedup schemes. Each source hook (`useAuctioneerfeed`, `useRemoteAuctioneerFeed`) already deduped by the auctioneer's real `pick.id`, then threw it away, and `use-draft-feed.ts` re-derived a name key (`playerNameToPickId` => `sheets:<name>`) for the cross-source merger. The merge module also documented a "Sheets flows through here" path that never ran (Sheets is deduped at the caller via `draftedNames`), and stamped auction picks with a bogus `sheets:` prefix.

**Decision (single source of truth):** the one dedup key is the source-assigned stable pick id, namespaced by producer so ids never collide: `auction:<auctioneerPickId>` (new `auctionPickId()` helper) for both auction sources, `sleeper:<pick_no>` for Sleeper (already so). `playerNameToPickId()` is retained as the documented id-less fallback only (prefix corrected `sheets:` -> `name:`); no live caller uses it. Chosen over formalizing the name-key because the app's other feed (Sleeper) already keys by a real id, both auction sources already carry the real id, and it activates the previously-dead real-id merge path.

**What changed:**
- `src/hooks/use-auctioneer-feed.ts`: `AuctioneerPick` gains `sourceId` (the auctioneer `pick.id`), populated in `normalizeAAPick` (the sole constructor; covers BroadcastChannel + localStorage + file paths).
- `src/hooks/use-draft-feed.ts`: `toNormalizedEvent` / `remoteToNormalizedEvent` now key `pickId` via `auctionPickId(sourceId)` / `auctionPickId(remoteId)` instead of the player name.
- `src/lib/draft/auction-feed-merge.ts`: added `auctionPickId()`; re-documented the module + `pickId` contract to state the single key; `playerNameToPickId` reprefixed to `name:` and re-documented as fallback-only.

**Behavior preservation:** in the real deployment each client sees picks from one source; where same-device + remote overlap it is the same auctioneer draft, so a player carries the same id on both paths and dedup output is identical to the old name-key. The caller `draftedNames` name-gate (`use-draft-feeds.ts`) is untouched and still guards against Sheets/manual overlap.

**Tests:** `auction-feed-merge.test.ts` grew 117 -> 122: 3 `auctionPickId` tests (prefix, cross-source identity, no collision with sleeper/name), the 4 `playerNameToPickId` tests updated to `name:`, plus 2 merger tests (same auctioneer id deduped across same-device+remote; two different players with a shared name both kept).

**Scope discipline:** four files committed by explicit path. `.claude/launch.json` left untouched.

**Verify result:** `npm run type-check` 0 errors; `npx eslint` on the 4 changed files 0 errors/0 warnings; `npm run test:run` 122/122; `npm run build` `Compiled successfully` with `/draft/live` in the route list. Zero em/en-dashes in authored code. No paid endpoints fired.

---

## 2026-08-09 / Finding 12 (Stage B): "Fix a pick" edit/remove UI

**Task:** CODE_REVIEW_2026-06 finding 12 (P1, UX/mechanics) | **Class:** `output` (UI) | **Lenses:** Design, QA

**What changed (UI on top of Stage A's logic):**
- `src/components/draft/live-room/fix-pick-sheet.tsx` (new): a bottom sheet mirroring the existing `block-picker-sheet` pattern (scrim + slide-up sheet, grabber, ROOM palette). Lists every recorded sale newest-first (position badge, player, "won by {manager}", price). Tapping a sale opens an inline edit card: change player (inline search over the undrafted pool), reassign the winning team (native select of all managers), or edit the price (auction only), plus a Remove action. Only changed fields are sent to `onEditPick`.
- `src/components/draft/live-room/auction-room.tsx`: added a "Fix a pick" button above the record bar (gated on `state.picks.length > 0`), plus `onEditPick`/`onRemovePick` props and the sheet render.
- `src/app/(app)/draft/live/client.tsx`: destructured `editPick`/`removePick` from `useDraftState` and passed them through to the auction room. Edits/removes flow into Stage A's rebuild-from-scratch, so budgets, roster, max bid, and snake turn stay consistent.

**Design:** all-teams scope (Joe records every team's sale at an in-person auction), tap-a-pick -> bottom sheet interaction, entry via a record-bar button. 3-state mockup approved before build (`.claude/mockups/fix-a-pick-sheet.html`).

**Scope discipline:** three code files + mockup, committed by explicit path (bdd11c1). `.claude/launch.json` left untouched.

**Verify result:** `npm run type-check` 0 errors; `npx eslint` on the 3 changed files clean; `npm run test:run` 117/117; `npm run build` compiled with `/draft/live` in the route list. Verified live against the running sim (84 picks): the button renders, the sheet lists all teams' sales, the edit card pre-fills correct values, and editing CeeDee Lamb $102->$92 refunded Rasar $54->$64 with max bid and avg-needed recomputing. Zero em/en-dashes in authored code. No paid endpoints fired.

---

## 2026-08-09 / Finding 12 (Stage A): per-pick edit + arbitrary remove logic

**Task:** CODE_REVIEW_2026-06 finding 12 (P1, UX/mechanics) | **Class:** `shared` (state helpers + hook) | **Lenses:** Architecture, QA

**What changed (logic only; no UI this stage):**
- `src/lib/draft/state.ts`: added two pure, immutable helpers. `removePickByNumber(picks, n)` drops the matching pick and renumbers the remainder contiguously (1..n) so the feed has no gaps; `editPickByNumber(picks, n, changes)` applies a partial change while preserving `pick_number`. Both no-op cleanly when no pick matches. Keepers are untouched (they live in `state.keepers`, never `state.picks`).
- `src/hooks/use-draft-state.ts`: factored the existing `undoLastPick` rebuild into a shared `rebuildFromPicks(prev, picks)` (fresh `createInitialState` from `manager_order` -> re-apply keepers if any -> replay each pick via `applyPick`), then added `editPick` and `removePick` actions on top of it. Rebuild-from-scratch keeps budgets, roster counts, and the snake turn perfectly consistent after any correction. `removePick` returns early if no pick matched (length unchanged). Both persist via the existing `persistPicks`.
- Rebuild logic stays in the hook (not `state.ts`) to avoid a circular import: `state.ts` imports only `type KeeperAssignment` from `./keepers`, while the rebuild needs `applyKeepersToState` (a value) from that module.

**Tests:** 10 new unit tests in `state.test.ts` (117 total, was 107): remove-middle renumbering, remove-last == undo, no-op paths, no-mutation of inputs, edit-preserves-number, and three rebuild-integration checks proving budget refund on remove, budget adjust on price edit, and spend transfer on manager edit.

**Scope discipline:** three files, committed by explicit path (2e48c84). Stage B (the tap-a-pick edit/remove UI) is deferred - substantial UI, needs a named reference + design sign-off before build.

**Verify result:** `npm run type-check` 0 errors; `npx eslint` on the 3 changed files 0 errors (2 pre-existing unused-import warnings on untouched lines); `npm run test:run` 117/117; `npm run build` compiled with `/draft/live` in the route list. Zero em/en-dashes in authored code. No paid endpoints fired.

---

## 2026-08-09 / Finding 10: stabilize sheet-poll loop + failure backoff

**Task:** CODE_REVIEW_2026-06 finding 10 (P1, Resilience/UX) | **Class:** `pipeline` (live polling) | **Lenses:** Architecture, QA

**What changed (`src/hooks/use-draft-polling.ts` only; public API unchanged):**
- Two confirmed defects: (1) the poll effect depended on `pollOnce`, which itself depended on `detectedMapping` + `onNewPicks` + `onError`, so the interval tore down and recreated right after the first mapping-detection AND whenever the consumer's `onNewPicks` identity changed (its useCallback chains through `persistPicks` -> `[session]`); (2) on error it kept polling `/api/draft/sheets` at the fixed 7s cadence with no backoff.
- Fix mirrors the `use-sleeper-draft-feed.ts` template: `onNewPicks`, `onError`, `initialMapping`, `detectedMapping`, and `sheetUrl` are now held in refs updated by per-render effects, making `pollOnce` a stable `[]`-dep callback. The scheduling effect's deps are `[enabled, sheetUrl, intervalMs, pollOnce]`, so the loop only restarts on the legitimate triggers (enable/disable, genuine sheet change), never on callback/mapping churn.
- Fixed `setInterval` replaced with a self-scheduling `setTimeout` (`tick`) that applies exponential backoff on consecutive failures (`intervalMs * 2^failures`, capped at `MAX_BACKOFF_MS` = 60s) and resets to `intervalMs` on the next success. Backoff counter resets whenever the loop (re)starts.

**Scope discipline:** one file, committed by explicit path. The stable-callback change is behavior-preserving; backoff is the intended new resilience per the review. Consumer `use-draft-state.ts` needed no edit (API identical).

**Verify result:** `npm run type-check` 0 errors; `npx eslint src/hooks/use-draft-polling.ts` exit 0; `npm run test:run` 107/107; `npm run build` compiled successfully with `/draft/live` in the route list. Zero em/en-dashes in authored code. No paid endpoints fired.

---

## 2026-08-09 / Finding 9: giant-component extraction (full, 6 verified stages)

**Task:** CODE_REVIEW_2026-06 finding 9 (P1, Architecture) | **Class:** `shared` (component/hook refactor) | **Lenses:** Architecture, QA

**What changed (behavior-preserving; the two giant draft screens split into focused files):**
- `review/client.tsx` 1123 -> 376 lines.
  - Stage 1/2 (29cf13b, 72901e1): moved the presentational sub-components (GradeHero, StatTile, PickCard, PositionalPowerRankings, BudgetAnalysisCard, SnakeAnalysisCard, TagAccuracyCard, etc.) into `src/components/draft/review-cards.tsx` (648).
  - Stage 3 (9e5d012): extracted all data loading + derived analysis (session list/selection, detail load, tags, roast/review/tag-accuracy memos) into `src/hooks/use-draft-review-data.ts` (184). UI-only state (expanded pick, view mode, copy) stayed in the component.
- `live/client.tsx` 1444 -> 927 lines.
  - Stage 1 (29cf13b): moved StrategyPicker, PickFeed, MySquadPanel to their own files under `src/components/draft/`.
  - Stage 4 (4ec7052): extracted the initial data load + sim fixtures into `src/hooks/use-live-draft-data.ts` (151).
  - Stage 5 (e6200eb): extracted the Auctioneer (FF-279/FF-282) + Sleeper (FF-312) feed wiring into `src/hooks/use-draft-feeds.ts` (127).
  - Stage 6 (0c2c233): extracted the trash-talk alert engine (state, refs, owner-map/per-pick/keeper effects, handlers) into `src/hooks/use-trash-talk-engine.ts` (174).

**Scope discipline:** each stage touched only its target client file plus the one new file, committed by explicit path. No prop/API/type/behavior change; the intentional every-render feed-ref assignments and derive-alert set-state-in-effect patterns were marked with targeted eslint-disable comments as they moved (the react-hooks compiler analyzer began surfacing these latent patterns once the components got small enough to analyze; the underlying code is byte-identical to what shipped).

**Verify result (every stage):** `npm run type-check` 0 errors; `npx eslint` on changed files 0 problems; full-repo lint held at the 27-error pre-existing baseline (0 new); `npm run test:run` 107/107; `npm run build` compiled successfully with `/draft/live` and `/draft/review` in the route list. Zero em/en-dashes in authored code. No paid endpoints fired.

---

## 2026-08-09 / Finding 5: broader test suite - 60 new tests across 4 modules

**Task:** CODE_REVIEW_2026-06 finding 5 (P1, Testing) | **Class:** `bugfix` (test coverage) | **Lenses:** QA

**What changed (new/extended files, all in `src/`):**
- `lib/draft/__tests__/state.test.ts`: added `getMaxBid` suite (null for snake/unknown, $1-reserve math, keeper-slot counting, $1 floor) and 12-team snake-order parity suite (M0 at picks 1/25, M11 at picks 12/13 snake-back).
- `lib/draft/__tests__/keepers.test.ts` (new): `validateKeepers` (8 cases: max per manager, duplicates, unknown manager, zero/negative/non-integer cost), `keepersToPicks` (negative pick_numbers, format field mapping), `applyKeepersToState` (budget deduction, no deduction for snake, manager.picks, roster_count, state.keepers, multiple managers, silent skip), `isKeeperPick`, `displayPickNum`.
- `lib/draft/__tests__/auction-feed-merge.test.ts` (new): `playerNameToPickId` (prefix, lowercase, trim, no-clash with Auctioneer IDs), `createPickMerger` (new picks pass through, cross-batch dedup, within-batch dedup, seenCount, reset, isolated instances, field passthrough).
- `app/api/draft/recommend/__tests__/route.test.ts` (new): mocks `askClaudeJson` + `formatScoringBonuses`; verifies 200/source:fallback for auction and snake on LLM error, maxBid within budget on fallback, 400 on empty topAvailable, 400 on malformed JSON, source:llm + recommendation passthrough on success.
- `lib/draft/__tests__/trash-talk.test.ts` (new): format gating (auction-only types absent in snake, reach/late_roster_qb_panic absent in auction), self-pick isolation, K/DEF null guard.

**Verify result:** type-check 0 errors; lint 0 errors on all changed files; `npm run test:run` 107/107 (was 47, +60); no paid endpoints fired. Commit 67debd0, pushed to origin/master. NOTE: sleeper-feed pickNoToManagerIdx consistency deferred (React hook, needs full test env setup).

---

## 2026-08-09 / Finding 7: applySheetRows identity dedup + snake round derivation

**Task:** CODE_REVIEW_2026-06 finding 7 (P1, State/dedup) | **Class:** `bugfix` | **Lenses:** QA, Architecture

**What changed:**
- `src/lib/draft/state.ts` (`applySheetRows`): replaced index-based dedup (`pickNumber <= existingCount`) with a `name+manager` identity key (lowercase, trimmed). Sheet corrections, reorders, and repeated calls are now idempotent. Snake round is derived from `ceil(pick_number / teamCount)` instead of the advancing state machine turn, which gave wrong values on backfill. `row.pick_number` is used when present, falling back to array index.
- `src/lib/draft/__tests__/state.test.ts`: added 7 new tests covering new-rows applied, idempotency, identity dedup, case/whitespace normalisation, partial-new rows, snake round derivation at 4-team boundaries (picks 1/4/5/8/9), and auction round passthrough.

**Scope discipline:** two files only (state.ts + test file). No prop/API/type change.

**Verify result:** `npm run type-check` 0 errors; `npx eslint` on changed files: 0 errors (1 pre-existing `Position` warning in state.ts, not introduced here); `npm run test:run` 47/47 (was 40, +7 new); `npm run build` deferred (pure logic change, no UI). Zero em/en-dashes. No paid endpoints fired. Commit c56ce68, pushed to origin/master.

**Flag:** Logic hardened. Live-confirmed pending Joe's real Nasties sheet (demo data lacks realistic pick_number/manager alignment to exercise the identity dedup path end-to-end).

---

## 2026-08-09 / Code-review finding 13: connection-pill a11y (size + per-state glyph)

**Task:** CODE_REVIEW_2026-06 finding 13 (P1, A11y/mobile) | **Class:** `output` (UI) | **Lenses:** Design, QA

**What changed:**
- `src/components/draft/connection-status-pill.tsx`: fixed the arm's-length legibility gap flagged in the June review. (1) The connection state was distinguished only by color plus the word; added a per-state Lucide glyph so shape carries the meaning too: LIVE `Radio`, STALE `Clock`, OFFLINE `WifiOff`, MANUAL `Keyboard` (14px, `strokeWidth 2.5`, `aria-hidden` since the label text already conveys state to screen readers). The glyph replaces the old color-only 8px dot. (2) Bumped the state label 11px->13px and the elapsed-time text 9px->11px (opacity 0.65->0.70) so both clear the review's ">=13px" bar / stay readable. (3) The LIVE pulse moved from `animate-pulse` to `motion-safe:animate-pulse`, so it now respects reduced-motion (consistent with the live room's dial-down policy).

**Scope discipline:** one component file. No prop/API change (signature identical), no behavior change to the state machine (`getConnState` untouched), no other files. The error-bar block and retry/dismiss targets were left as-is (already 44px from FF-269).

**Verify result:** `npm run type-check` (`tsc --noEmit`) 0 errors; `npx eslint src/components/draft/connection-status-pill.tsx` clean (0 errors, 0 warnings); `npm run test:run` 40/40 pass; `npm run build` `✓ Compiled successfully in 4.0s`, `/draft/live` present in route list. Live DOM proof against the running dev server (`/draft` hub): pill in LIVE state renders `svg.lucide-radio flex-shrink-0 motion-safe:animate-pulse` at 14x14, label computed `font-size: 13px`, elapsed `font-size: 11px`. Pixel screenshot blocked in this environment (Browser pane not compositing), so render verified via computed-style DOM read, per the documented limitation. Zero em/en-dashes in changed code or this entry. No paid endpoints fired.

---

## 2026-08-09 / UXV2-8: final UX-V2 VERIFY + DESIGN docs reconciled (closes UX-V2 track)

**Task:** UXV2-8 | **Class:** `docs` | **Lenses:** Delivery, QA

**What changed:**
- `.claude/DESIGN_SYSTEM.md`: added a v3.1 Version History row and a new "Shipped Live Auction Room (UXV2-6/7)" section documenting the room as-built: its locally-scoped `theme.ts` `ROOM` palette (canvas `#060c14`; four color-coded moves - lime-volt `#d4ff00` BID, amber-gold `#f5a623` HOLD/moment, orange `#f97316` PUSH, red `#dc2626` PASS), the lean/no-filter performance stance (no framer-motion, no keyframes, no backdrop-filter, no will-change; audited 0 across 735 room elements), and the reduced-motion DIAL-DOWN policy (cross-fades halve to 75ms, `active:scale` neutralized). Added reconciliation notes at the three spots that previously contradicted the shipped room: the "NO gold" What-NOT-to-Do bullet (now notes the room's single scoped-gold exception), the "Motion is FIRST-CLASS" section (now flagged as the aspirational global system, not the shipped room), and the reference-mockup line (now points at the approved v4 mockup `draft-room-v4-two-screen.html` + `theme.ts`).
- `.claude/UI_DESIGN_SPEC.md`: added a top "Live Auction Room as-built" banner (overrides the general spec inside `/draft/live`: scoped palette, no Framer Motion in the room, dial-down reduced-motion) and updated the Section 13 reduced-motion line to record the room's dial-down exception vs the app-wide strict-off.
- `.claude/BUILD_PLAN.md`: UXV2-8 marked `[x]`; noted it closes the UX-V2 track.

**Scope discipline:** docs-only. No source files changed this session. Docs were made to match the code that already shipped in UXV2-6/7; no new design scope invented. Palette/motion claims were verified against `src/components/draft/live-room/theme.ts`, a grep of the live-room component dir (only motion present is one `motion-safe:animate-pulse`), and the `.ffi-live-room` reduced-motion block in `src/app/globals.css` (lines ~937-946).

**Verify result (full UX-V2 track):** `npm run type-check` (`tsc --noEmit`) 0 errors; `npm run lint` 27 errors + 98 warnings, all pre-existing in untouched research-pipeline / supabase files (0 new - no source changed); `npm run test:run` 40/40 pass; `npm run build` `✓ Compiled successfully in 4.0s`, `/draft/live` present in the route list. Zero em/en-dashes in the added doc text (verified by grep). No paid endpoints fired.

---

## 2026-08-09 — UXV2-7: reduced-motion dial-down + perf/arm's-length pass

**Task:** UXV2-7 | **Class:** `output` (UI) | **Lenses:** Design, QA

**What changed:**
- `src/app/globals.css` — new scoped `@media (prefers-reduced-motion: reduce)` block (right after the existing reduced-motion block) implementing Joe's DIAL-DOWN rule for the live auction room, not strict-off: `.ffi-live-room *, .ffi-live-room ::before, .ffi-live-room ::after { transition-duration: 0.075s !important; }` keeps cross-fades (color/opacity) but halves them from Tailwind's 150ms default; `.ffi-live-room :active { transform: none !important; }` neutralizes the `active:scale-90`/`active:scale-95` transform tap-feedback. Commented to record that the room has no framer-motion, no entrance keyframes, no persistent glows (the LIVE dot pulse is already gated by its `motion-safe:` variant), and no animating background/filter layers (so there is no `will-change` to release).
- `src/components/draft/live-room/auction-room.tsx` — added the `ffi-live-room` class to the room root so the scoped block can target the whole room subtree (including the Research view and the block-picker sheet). className only; no layout change.

**Performance / arm's-length:** the room ships lean by construction. Live-DOM audit across 735 room elements: 0 CSS `filter` layers, 0 `backdrop-filter` layers, 0 animated `box-shadow` transitions, 0 elements holding `will-change`. That absence is exactly why the room composites smoothly and does not reproduce the old build's heavy-filter-stack non-compositing failure. Mobile 375px: no document horizontal overflow, room fits at 343px, no inner horizontal overflow; primary decision text 15-22px (the 8.5-9.5px items are the locked v4 uppercase micro-labels and position badges, left as-is since the layout is locked).

**Verify result:** `tsc --noEmit` 0 errors; ESLint clean on `auction-room.tsx` (globals.css is not linted); `npm run test:run` 40/40 pass; `npm run build` `✓ Compiled successfully`, `/draft/live` in the route list. Live proof on the running dev server (:3003, `?sim=1`): the two dial-down lines are present in the browser's parsed CSSOM; toggling the shipped rule's media condition to always-on drove real computed styles from `0.15s` -> `0.075s` on a `transition-opacity` cross-fade element AND on a `transition-transform` element, then restored to `0.15s` with the media condition back to `(prefers-reduced-motion: reduce)`; all 80 ResearchView `active:scale-90` tap buttons are inside `.ffi-live-room` and covered by the transform-neutralize rule; the LIVE dot uses `motion-safe:animate-pulse` (stops under reduced-motion). The Browser pane is 0x0 / non-compositing so pixel screenshots are unavailable (same documented limitation as UXV2-6); render + behavior verified via live DOM reads. No paid endpoints fired.

---

## 2026-08-09 — UXV2-6 (part 2): Research-tab draft-mode screen

**Task:** UXV2-6 | **Class:** `output` (UI) + `shared` | **Lenses:** Design, QA, Architecture

**What changed:**
- `src/components/draft/live-room/research-view.tsx` (NEW) — the Research tab as an internal room view (not a route change), from the locked v3 Phone 2 layout with Recent Sales removed per the v4 sign-off. Top to bottom: sticky on-the-block mini strip (position badge + name + tier chip + target star + team/bye meta, then range + inline record) → filter bar (position pills All/QB/WR/RB/TE/DEF + ★ Target View) → available player list (star toggle, position badge, name + optional real-data signal chip, tier chip, range or `AVOID` with dim + strikethrough) → tappable Tier Context (reuses `TierContext`) that filters the list above. Inline record reuses the shared `addManualPick` (price input + team dropdown defaulting to the user + RECORD). Signal chip renders only from real `player.analysis` (SLEEPER/RISK/VALUE) so nothing is fabricated when a research run has not populated it. Same dev-cache guards as the Draft tab: tier → `NR` when `consensusTier` is missing/NaN, ranges floored to the `$1` auction minimum, bye omitted when absent.
- `src/components/draft/live-room/bottom-nav.tsx` — Research/Draft now switch an internal room view via a new `onSelectView` callback (with an exported `TabKey`); Review/Setup still navigate. Active tab is driven by the room's current view.
- `src/components/draft/live-room/auction-room.tsx` — added a `view: 'draft' | 'research'` state; renders `ResearchView` vs the existing draft body; gates the bottom record bar to the Draft view (Research has its own inline record); threads `managerNames`/`myManager`/`onRecordPick`/`onToggleTarget` and drives `BottomNav active={view} onSelectView`.
- `src/app/(app)/draft/live/client.tsx` — added `useToggleTag` + an `onToggleTarget` handler (toggle the target tag, then `refetch` user tags so the list star updates); threads `managerNames`, `myManager`, `onRecordPick={addManualPick}`, `onToggleTarget` into `AuctionDraftRoom`.
- `src/hooks/use-user-tags.ts` — `refetch` now forces a re-read (new `force` bypass on the `lastFetchedRef` cache guard) so a star toggle reflects immediately; signature unchanged (`() => Promise<void>`).

**Fixed during verify:** the player rows first nested the star `<button>` inside the row `<button>` (invalid HTML → hydration error). Restructured so the star and the tap-target are sibling buttons inside a `div` (confirmed `document.querySelectorAll('button button').length === 0`, no hydration warning after reload).

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 errors/0 warnings on all 5 changed files (repo's 27 pre-existing errors are all in untouched research-pipeline files); `npm run test:run` 40/40 pass; `npm run build` `✓ Compiled successfully`, `/draft/live` in the route list. Live DOM proof (dev server :3003, `?sim=1`): bottom-nav Research switches the internal view (active tab = Research); empty on-block prompt shows; tapping a row sets the block and prefills the inline record (price + the user's manager); RECORD fired `addManualPick` (available 255→254, sim picks 83→84, player left the list, block cleared); QB pill filtered to 21 QBs; the RB tier-context badge filtered to 70 RBs; ★ Target View toggled to pressed with the correct empty state; zero nested-button hydration errors. Star **persistence** is not exercisable in sim (the demo session's `demo-league` id is not a valid league UUID, so the PATCH is rejected by the DB — the toggle is correctly wired and works against a real league). No paid endpoints fired. Pixel screenshots blocked (Browser pane not compositing frames); render verified via live DOM text.

---

## 2026-08-09 — UXV2-6 (part 1): Live Auction Draft Room rebuild

**Task:** UXV2-6 | **Class:** `output` (UI) + `shared` | **Lenses:** Design, QA, Architecture

**What changed:**
- `src/components/draft/live-room/` (NEW) — decision-first live auction room from the approved v4 mockup. Components: `auction-room.tsx` (composer), `status-bar.tsx` (Leave · LIVE/OFFLINE + elapsed · league chip), `on-the-block-card.tsx` (hero + What-To-Do block), `awareness-strip.tsx`, `budget-strip.tsx`, `tier-context.tsx` (tappable), `my-team-roster.tsx` (compact, bottom), `bottom-nav.tsx` (4-tab; room supplies its own because the app shell strips nav on `/draft/live`), `block-picker-sheet.tsx` (fast search + one-tap shortlist), `theme.ts` (locally-scoped amber-gold + lime-volt palette to avoid the app's green/gold conflict).
- `src/lib/draft/what-to-do.ts` (NEW) — pure decision brain: turns the on-block player into one directive move (HOLD gold / BID volt / PUSH orange / PASS red) + a cap + one plain-English rationale (no jargon, no em/en dashes). Reuses existing engine outputs (ScoredPlayer, PositionScarcityExtended, strategy max bid, hard budget ceiling); no LLM, no network. Guards: tier → `UNRANKED` when source data is missing/NaN, and all displayed dollar caps floored to the $1 auction minimum so missing-value data never renders `$0`.
- `src/lib/draft/__tests__/what-to-do.test.ts` (NEW) — 11 unit tests covering the PASS > PUSH > HOLD > BID precedence with realistic fixtures.
- `src/app/(app)/draft/live/client.tsx` — early `if (isAuction) return <AuctionDraftRoom .../>` branch; Tyler's snake path falls through to the existing layout byte-for-byte unchanged. `simHud`/`recordBar` hoisted to shared variables. Every secondary panel (advisor, strategy, scarcity, injuries, tendencies, league overview, pivots, trash talk, player pool) preserved in a mount-on-open "More tools" section, so no paid `/api/draft/recommend` fires until Joe opens it.
- `on-the-block-card.tsx` / `block-picker-sheet.tsx` — missing `byeWeek` now omits the "Bye" segment instead of printing a dangling "Bye ".

**Verify result:** `npm run build` — `✓ Compiled successfully in 4.0s`, `/draft/live` in the route list. `npx vitest run what-to-do.test.ts` — 11/11 pass. `npm run type-check` (`tsc --noEmit`) — 0 errors. Live DOM proof (dev server :3003, sim mode, mobile 375): full room renders top-to-bottom; setting a player on the block renders the On-the-Block hero with `UNRANKED` (was `TNaN`), the omitted-bye meta (was dangling `Bye `), and the What-To-Do block `HOLD · bid only under $1 · Brandin Cooks ($1 to $1)...` (was `$0`). No paid endpoints fired (sim suppresses AI). Pixel screenshots blocked (Browser pane not compositing frames); render verified via live DOM text. Remaining in UXV2-6: Research-tab draft-mode screen.

---

## 2026-08-08 — UX-S6: Review tab wired to post-draft flow

**Task:** UX-S6 | **Class:** `output` | **Lenses:** Delivery, QA, Design

**What changed:**
- `src/app/(app)/draft/live/client.tsx` — Removed `isSimActive` guard from the auto-navigate effect so real completed drafts (not just sim) route to `/draft/review?session=<id>`. Sim mode remains blocked because `sessionId` is null when `?sim=1` (no `?session=` param). Leave button now routes to `/draft/review?session=<id>` when draft is complete, otherwise `/draft`.
- `src/app/(app)/draft/review/page.tsx` — Removed the server-rendered header; header ownership moved to `ReviewClient` (consistent with UX-S3+ pattern). Only the Suspense wrapper remains.
- `src/app/(app)/draft/review/client.tsx` — Added `useSearchParams` + `paramSessionId = searchParams.get('session')`. Updated `fetchSessions` effect to prefer the URL param over auto-selecting the first session. Restructured render from multiple early-return branches to a single unified return containing: "Review" h1 header + volt session-date chip, "Back to Draft" `ChevronLeft` link, inline loading/error/empty states (empty: "No completed draft yet — Your grade shows up here after draft night."), and session selector hidden when `paramSessionId` is set. Also cleaned pre-existing lint issues: removed dead imports (`ChevronDown`, `cn`, `FFICard`, `FFIButton`, `FFIGrade`, `FFISectionHeader`) and replaced 3 `as any` casts with `as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"`.

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 problems on all 3 changed files (0 errors, 0 warnings). Live DOM verified against dev server (port 3003): `/draft/review` renders "Review" heading + "Back to Draft" link + empty state ("No completed draft yet / Your grade shows up here after draft night.") on both mobile 375 and desktop 1440. Review tab active in sidebar (`bg-[var(--ffi-gold)]/10 text-[var(--ffi-gold-bright)]`) and bottom nav (`text-[var(--ffi-gold-bright)]`) confirmed via JavaScript DOM query. No paid endpoints fired. Pre-existing ThemeToggle hydration warning unchanged (logged FFT-002, non-blocking). Pixel screenshots blocked (Browser pane not compositing); render verified via live DOM.

---

## 2026-08-08 — UX-S5: Setup tab + data correctness

**Task:** UX-S5 | **Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**What changed:**
- `src/app/(app)/settings/page.tsx` — complete rebuild. Server Component; fetches `user` via `getUser()` (real Supabase auth, no hardcoded email) and league summary from Supabase. 5 sections: LEAGUE (-> /prep/configure with live league summary or "Not configured yet"), DRAFT (Draft Setup -> /draft/setup + Demo Draft -> /draft/live?sim=1 with "Dev" badge), HISTORY (Run History -> /prep/runs), ACCOUNT (inline Name/Email from user metadata + SignOutRow), APPEARANCE (ThemeRow). Helper components: `SectionLabel`, `SettingsGroup`, `NavRow` (Link-based, label/value/badge/chevron), `InfoRow` (label+value, no nav). Footnote: "Demo Draft launches a sim against real player data. No AI calls fired."
- `src/app/(app)/settings/client.tsx` (NEW) — `ThemeRow` with `mounted` state guard (useState/useEffect) to prevent hydration mismatch; renders button only after client mount. `SignOutRow` using `signOut` form action from `@/app/(auth)/actions`.
- `src/components/prep/league-config-form.tsx` — major cleanup. Removed snake format toggle, keeper settings section, Keeper/Tyler presets. Format locked to `'auction'` (static display "Auction (Nasties)"). Nasties roster defaults corrected: QB:1, RB:1 (was 2), WR:1 (was 2), TE:1, FLEX:3 (was 1), K:0 (was 1), D/ST:1, Bench:5 (was 6), IR:1 (was 0). League name defaults to "The Nasties". `keeper_enabled` hardcoded `"false"`, `keepers` hardcoded `"[]"`. Success redirect changed from `/prep/research` to `/settings`. Reset button relabeled "Reset to Nasties defaults".
- `src/app/(app)/prep/configure/page.tsx` — added `<- Setup` back link to `/settings`; updated title to "League Config"; updated description to "The Nasties defaults are pre-filled. Edit as needed and save." (removed em-dash that was triggering lint).
- `src/app/(app)/draft/setup/page.tsx` — added `<- Setup` back link to `/settings`; updated to `ffi-display-md`/`ffi-body-md` tokens.
- `src/app/(app)/draft/setup/client.tsx` — empty state and "Wrong format?" link now route to `/settings` (was `/prep/configure` dead-end); added "Go to Setup -> League Config to add The Nasties." sub-copy.
- `src/app/(app)/prep/runs/page.tsx` — added `<- Setup` back link to `/settings`.

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 errors on all changed files. Live DOM verified against dev server (port 3003): `/settings` all 5 sections + real Supabase user email + correct nav targets; `/prep/configure` Nasties defaults auto-seeded (QB:1 RB:1 WR:1 TE:1 FLEX:3 K:0 D/ST:1 Bench:5 IR:1); `/draft/setup` back link present; `/prep/runs` back link + empty state. No paid endpoints fired (`/api/research`, `/api/strategies/propose` never called). Pre-existing sidebar ThemeToggle hydration warning (logged FFT-002, non-blocking) unchanged. Pixel screenshots blocked (Browser pane not compositing); render verified via live DOM.

---

## 2026-08-08 — UX-S4: Draft tab = live auction room + FF-314 cross-device auto-connect

**Task:** UX-S4 | **Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**What changed:**
- `src/app/(app)/draft/page.tsx` (blueprint 9.5, pre-Go-Live) — full rebuild. ONE hero = a large centered 4-state `ConnectionStatusPill` + plain-words status ("Checking for a live auction…" / "Auctioneer is LIVE" / "Auctioneer not detected yet"), an expandable error + Retry, a primary **Go Live** CTA (volt when the feed is detected, subdued "Waiting for auctioneer…" / "Checking…" otherwise), and a secondary **Start in Manual mode** text link. Below it a pre-flight card (league name + managers / budget / scoring) with Edit-in-Setup → `/prep/configure`. Full `loading` / `no-league` / `error` states. Go Live routes to the resumable auction session with `&aif=remote`; Manual routes to the same session with no `aif`.
- `src/components/layout/app-shell.tsx` (blueprint 9.6, full-screen room) — added `isLiveRoom = pathname.startsWith('/draft/live')`; hides the desktop sidebar, the mobile top header, and the mobile bottom tab bar on the live room, and bypasses the `SwipeCarousel` there so a stray horizontal swipe can't navigate out mid-auction. The room owns its own single "Leave" affordance.
- `src/app/(app)/draft/live/client.tsx` — added a "Leave" button (top-left, `ChevronLeft` → `/draft`). Translated the `?aif=` param so `aif=remote` leaves the same-device connection type null (the remote proxy runs automatically for every auction); only `localstorage` / `file` stay same-device. Rewired the header `ConnectionStatusPill` to reflect the remote proxy (`remoteLastSyncAt` / `remoteError` / `remoteRetry`) for an internet auction with no sheet, else the sheet poll — so Tyler's snake/Sheets MANUAL behavior is unchanged.
- `src/app/api/auctioneer-feed/route.ts` (NEW) — server-side GET proxy that fetches the deployed auctioneer's state to dodge CORS (auctioneer sends no CORS headers). `force-dynamic`, 5s timeout, wraps the raw `DraftState` body in `{ state }`, returns `{ state: null }` on empty/error, all `no-store`. Upstash `draft-current` key; picks at top-level `picks[]`, teams at `config.teams[]`, phase at top-level `phase`.
- `src/hooks/use-remote-auctioneer-feed.ts` (NEW) — polls the proxy every ~3s; `isLive` when `phase === 'drafting'` or picks are present. Interruption handling keeps last-known state, surfaces `error`, and backs off 3→6→12s (cap 15s), resetting to 3s on success. Per-session dedup by the auctioneer's pick id; `retry()` forces an immediate poll (wired to the chip's Retry).
- `src/hooks/use-draft-feed.ts` — folded the remote proxy in as a NEW SOURCE (not a new mode): one cross-source merger dedups by synthesized player-name pickId so a player is never double-added across same-device + remote paths. `remoteEnabled = isAuction`. Fixed a `react-hooks/refs` lint error by syncing the latest `onNewPicks` in a `useEffect` instead of during render.
- `src/lib/draft/auction-feed-merge.ts` — added `'remote'` to the `FeedSource` union.

**Cost constraint (FF-314):** the proxy hits Upstash reads only (free). The paid POST endpoints (`/api/research`, `/api/strategies/propose`) were never fired during verification — network log shows only `/api/auctioneer-feed`, `/api/players`, `/api/leagues`, `/api/draft/sessions` (all GET reads).

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 errors on all 7 changed files. Dev server (port 3003) compiled clean — no server errors. Render proof with real Nasties data on both mobile 390 and desktop 1440: pre-Go-Live shows OFFLINE chip + "Waiting for auctioneer…" + pre-flight (12 managers · $200 · Full PPR) with the sidebar kept on desktop; the live room confirms full-screen (no tab bar, no sidebar, "Leave" present) on both widths. Two pre-existing, out-of-scope issues flagged (not fixed): a dev-only React hydration warning that also appears on `/prep` (global theme-class mismatch), and `POST /api/user-tags/batch → 500` in the live room (existing `useUserTags` hook). Pixel screenshots were blocked in this environment (Browser pane not displayed); render verified via live DOM against the running server.

---

## 2026-08-08 — UX-S3: Research tab consolidation (GRIDIRON rebuild)

**Task:** UX-S3 | **Class:** `shared` | **Lenses:** Architecture, QA, Design

**What changed:**
- `src/app/(app)/prep/page.tsx` (9.1 Research landing) — killed the card-dump. The Research Run panel is now the ONE hero with a single explicit "Run Research" button (the AI-cost tap guard) and an inline "uses AI, runs only when you tap" hint. Added quiet jump-rows to Players / Board / Strategies and a latest-run highlights strip. Full loading / empty / error states. Removed dead `runCount` state.
- `src/app/(app)/prep/players/client.tsx` (9.2 Player Browser) — search + filter hero, result-count header chip, tap-to-expand rows, target/avoid toggle. No-players state deep-links to Run Research; filters-match-nothing shows Clear filters; load error shows a graceful card + Retry. `fetchPlayers` moved to `useCallback` for the Retry path.
- `src/app/(app)/prep/board/client.tsx` (9.3 Draft Board) — ranked board hero + meta strip (format / strategy / player count / refresh) + filter/sort pills. Removed the league picker (single Nasties league). Real empty state with deep-link; graceful error + Retry replacing the old "Failed to fetch leagues" dead-end.
- `src/app/(app)/prep/strategies/client.tsx` (9.4 Strategies) — active-strategy hero (name + archetype + budget-by-position bars, from `budget_allocation` or `position_weights` mapped to dollars) + editable saved list. Demoted Dry Run to a quiet power-tool row. Genuine "No strategy yet" empty hero. `fetchLeagues` moved to `useCallback` for Retry.
- `src/app/(app)/prep/players/page.tsx` + `src/app/(app)/prep/strategies/page.tsx` — stripped the wrapper-level headers so the client GRIDIRON header (with the count / Nasties chip) is canonical. Fixes a double-header bug found during screenshot verify (board/page.tsx already deferred correctly).

**Palette / lint:** all four screens repainted off the old palette onto GRIDIRON CSS vars (volt `--ffi-volt`, blue `--ffi-blue-bright`, ink scale, surfaces, hairlines). Coral for avoid/bust = `#FF6E8A`. Two en/em-dash ESLint errors introduced mid-build were fixed to colon/period (the `no-restricted-syntax` dash ban is a hard error).

**AI-cost guard:** the paid POST endpoints (`/api/research`, board Refresh, `/api/strategies/propose`) were never fired during verification. Only GET reads ran.

**Verify result:** `tsc --noEmit` 0 errors; ESLint 0 errors on all 6 changed files. 8 Playwright screenshots captured against the running dev server (each of the 4 screens x mobile 390x844 + desktop 1440x900) with real connected data (3,128-player pool on prep, 282 in the Players pool, 425 real ranked players on the Board, genuine "No strategy yet" empty for the Nasties). Single header confirmed on every screen post-fix.

---

## 2026-08-08 — UX-S2.5: Per-screen UX layout blueprint (docs only)

**Task:** UX-S2.5 | **Class:** `docs` | **Lenses:** Delivery

**What changed:**
- `.claude/UX_OVERHAUL_2026-08.md` — appended **Section 9: Per-screen layout blueprint** — the contract UX-S3..S6 build to. Global mobile-first frame conventions (9.0: one hero per screen, thumb-zone primary action, permanent tab bar except the full-screen live room, mandatory loading/empty/error states on every data surface) plus a blueprint for all 14 screens: Research landing (9.1), Player Browser (9.2), Draft Board (9.3), Strategies (9.4), Draft pre-Go-Live (9.5), live auction room (9.6), Review (9.7), Setup landing (9.8), League Config (9.9), Draft Setup (9.10), Run History (9.11), Account (9.12), Appearance (9.13), plus Parked-out-of-scope (9.14). Each screen defines its ONE hero, top-to-bottom section order, single primary action + secondary demotions, empty/loading/error states, and tap-flow in/out.
- Grounded in the real routes confirmed on disk 2026-08-08 (`/prep`, `/prep/players`, `/prep/board`, `/prep/strategies`, `/prep/runs`, `/prep/simulate`, `/draft`, `/draft/live`, `/draft/setup`, `/draft/review`, `/settings`) and the locked Nasties config from `FANTASY_FOOTBALL_MASTER.md` (12 · $200 · Full PPR · QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1 · 13 draftable · no keepers). Blueprint explicitly retires the known broken states (Board "Failed to fetch leagues", Draft Setup "No leagues configured", Account propermuse.co leak, wrong roster default, Draft sounds toggle) into their fixed target states, scheduled for S3/S5.
- `.claude/BUILD_PLAN.md` — marked UX-S2.5 `[x]`; `DASHBOARD_STATUS.nextItems` advanced to UX-S3 (build to blueprints 9.1-9.4).

**Verify result:** Docs-only session — no code touched, no route files moved, no slugs renamed. No build/test/lint applicable. Section 9 written and BUILD_PLAN advanced.

---

## 2026-08-08 — UX-S2: 4-tab IA reskeleton (nav only)

**Task:** UX-S2 | **Class:** `shared` | **Lenses:** Architecture, QA

**What changed:**
- `src/components/layout/app-shell.tsx` — replaced the 3-tab nav (Home/Draft/Settings) with the locked 4-tab IA: **Research** (`/prep`, Search icon), **Draft** (`/draft`, Zap), **Review** (`/draft/review`, Trophy), **Setup** (`/settings`, Settings). Applies to both the desktop sidebar and the mobile bottom tab bar. Added `getActiveHref()` longest-prefix matcher and swapped both `pathname.startsWith` active checks to `item.href === activeHref` so nested routes resolve to one tab.
- `src/components/layout/swipe-carousel.tsx` — same 4 sections (sets swipe order + dot indicators); added `activeSectionIndex()` longest-prefix matcher replacing the first-match `findIndex`.
- No visual polish, no content rebuild, no route-file moves. URL slugs still point at existing routes; slug + content cleanup happens as each tab is rebuilt in UX-S3..S6.

**Why longest-prefix:** `/draft/review` startsWith `/draft`, so the old first-match logic would light up Draft on the Review page. Longest-prefix makes `/draft/review` → Review and `/draft`,`/draft/live`,`/draft/setup` → Draft.

**Verify result:** typecheck 0 errors; ESLint 0 errors on both changed files (2 pre-existing warnings untouched). Nav + active-state proven via Playwright screenshots at 1440×900 (desktop sidebar) and 390×844 (mobile bottom bar + carousel dots), both nested directions (`/draft`→Draft, `/draft/review`→Review). Note: the Review page still shows "Failed to load sessions" — pre-existing broken data layer, scheduled for UX-S5/S6, not a nav regression.

---

## 2026-08-07 — FF-314 planned: remote/cross-device auctioneer live sync

**Task:** FF-314 (plan add only — no code) | **Class:** `docs` | **Lenses:** Delivery

**What changed:**
- `.claude/BUILD_PLAN.md` — added **P1 Sub-tier 1b** and item **FF-314** for over-the-network sync to the deployed auctioneer. Existing FF-279–283 wire the auctioneer feed only same-device (BroadcastChannel / local JSON); FF-314 adds the cross-device path (host laptop + Joe's phone on different origins). Counterpart to the auctioneer's `AA-FFI-2`.
- Contract captured from the `fantasy_auction_auctioneer` repo as-built AND verified live against the deployed `/api/state` (2026-08-07): the body IS the auctioneer `DraftState` directly (NO envelope) from Upstash key `draft-current` (single active draft, 24h TTL); picks at top-level `picks[]`, teams at top-level `config.teams[]`, lifecycle at top-level `phase`/`pickNumber`.
- Load-bearing design decision recorded: the auctioneer route sends no CORS headers, so FF-314 fetches it through a THIS-repo server-side proxy (`src/app/api/auctioneer-feed/route.ts`) — ships with zero auctioneer-side change, and folds remote picks into the existing `auction-feed-merge.ts` / `use-draft-feed.ts` dedup so it's a new source, not a new mode. Auction-only gating unchanged.
- `DASHBOARD_STATUS` header — added `P1b` milestone (`done: false`).

---

## 2026-06-06 — UXV2-5: Post-Draft Review GRIDIRON rebuild

**Task:** UXV2-5 | **Class:** `output` | **Lenses:** Design, QA

**What changed:**
- `src/app/(app)/draft/review/client.tsx` — full visual rebuild. New `gradeColors` map: volt for A, blue-bright for B, warning for C/D, danger for F (no gold anywhere). New `verdictConfig` with GRIDIRON palette. `GradeHero` uses `.ffi-hero` card + Anton grade letter + grade-colored ring + glow blob + ffi-caption verdict label + mono score. 2x2 `StatTile` grid with 36px JetBrains Mono numbers (volt/danger/blue by type). `SwCard` two-column strengths/weaknesses with 5px dot bullets. `SectHeader` with hairline divider. `PickCard` uses `ffi-card-interactive` + `ffi-badge-*` position chips + mono price+delta + verdict pill badge. `PositionalPowerRankings` segments colored volt (score>=80) / blue (>=50) / danger (<50). `BudgetAnalysisCard`, `SnakeAnalysisCard`, `TagAccuracyCard`, `MiniStat`, `TagPillGroup` all updated to GRIDIRON palette. View tabs use blue/danger active states. Session/manager selects styled as compact `ffi-input` row. All data logic (hooks, effects, memos, analyzeDraft) untouched.
- `src/app/(app)/draft/review/page.tsx` — updated to GRIDIRON eyebrow (`ffi-caption`) + Saira Condensed title header.

**Verify result:** type-check clean (0 errors). Page renders: GRIDIRON header + empty state card confirmed via preview screenshot.

---

## 2026-06-06 — UXV2-4: Draft Board / Player Pool GRIDIRON rebuild

**Task:** UXV2-4 | **Class:** `output` | **Lenses:** Design, QA

**What changed:**
- `src/components/prep/draft-board-table.tsx` — full rewrite. Removed shadcn primitives + old sort UI. New `PositionChip` (color-coded per position: QB red, RB green, WR blue, TE amber, K purple, DEF gray). New `PlayerCard`: rank (22px mono, blue-bright for top-24/blue for rest), position chip, name+team+bye, 3px score bar (volt fill 75+, blue-bright 55-74, muted below), value ($XX or Rd X at 20px mono) + ADP inline, chevron expand. Expanded state: insight panel with confidence meter gradient bar, target/avoid toggle buttons, 4-cell stats grid (ECR/ADP/Range/Bye). Target badge (volt glow pill) + avoid badge (red pill) inline on card. Boost tags (blue-tinted pills). Opacity 58% for avoid players. Left border 2.5px volt for targets.
- `src/app/(app)/prep/board/client.tsx` — full rewrite. Replaced shadcn `Tabs` with custom tab buttons (blue active fill). New filter bar: position pills (ALL=blue-fill active; pos pills show position color text+border; box-shadow glow on active pos pill). Sort pills row (Score/Value/Rank/ADP with ArrowUp/Down indicator). Target cycle filter button (all→target→avoid→all, color-coded per state). ADP movers redesigned as horizontal scroll chip strip with position color + name + TrendingDown + divergence number. Meta strip: compact league Select + format badge (blue) + strategy badge (volt) + player count + refresh pill button. All error/loading/empty states updated to palette-correct colors.
- `src/app/(app)/prep/board/page.tsx` — stripped to bare `<DraftBoardClient />` (old h1/p wrapper removed).
- `.claude/mockups/draft-board-phone.html` — approved phone mockup (locked).

**Verify result:** type-check clean (0 errors), `next build` passes, `/prep/board` in build output.

---

## 2026-06-06 — UXV2-2b: Motion System (GRIDIRON foundation)

**Task:** UXV2-2b | **Class:** `shared` | **Lenses:** Design, QA

**Why:** Motion is half of AAA (Joe, 2026-06-04). The GRIDIRON visual layer ships with the right palette and type stack, but without a coordinated motion system it reads as "flat." This establishes the shared foundation that UXV2-4/5/6 will consume — every moving number, every card lift, the on-the-clock entrance, steal bursts, filter pills, cascade lists.

**What changed:**
- `src/lib/motion.ts` (new): 5 Framer Motion transition presets (`spring`, `springFast`, `broadcast`, `standard`, `swift`) + 7 named variant sets (`otcVariants`, `otcBadgeVariants`, `lowerThirdVariants`, `cascadeContainerVariants`, `cascadeItemVariants`, `fadeVariants`). Single source of truth — import in any screen.
- `src/hooks/use-number-ticker.ts` (new): `useNumberTicker(value)` hook. Detects value changes, emits `{ flashing, direction, delta }` for 1.4s. Drives CSS animation class toggles without Framer overhead on routine number updates (budget, rank, bid).
- `src/components/motion/` (new folder): 6 components + barrel export.
  - `NumberTicker.tsx` — number display with flash-up/flash-down class application + optional delta label.
  - `OtcEntrance.tsx` — `AnimatePresence` spring-in wrapper for the on-the-clock hero card. `OtcBadge` delays 180ms for layered reveal.
  - `LowerThird.tsx` — broadcast-curve wipe from bottom for pick-lands (replaces/supplements `pick-lower-third.tsx` for full-width in-room moments).
  - `StealFlash.tsx` — volt burst wrapper. Increment `trigger` to fire; cooldown prevents double-fire.
  - `FilterPillBar.tsx` — pill bar with Framer `layoutId` sliding indicator; generic over any string union.
  - `CascadeList.tsx` — staggered children (48ms gap) via `cascadeContainerVariants`. Re-triggers on `listKey` change.
- `src/app/globals.css`: Duration tokens (`--dur-micro/fast/standard/cinematic/reveal`) + `--ease-swift` added to `:root`. `ffi-card-interactive` gains `position:relative` + spring transition + iridescent border sheen `::before` (hidden by default, reveals on `:active`) + spring lift `:active` state. New keyframes: `ffi-num-flash`, `ffi-steal-burst`, `ffi-steal-banner-pop`, `ffi-otc-breathe`. New utility classes: `.ffi-num-value` / `.ffi-num-delta` (flash states), `.ffi-steal-card` / `.ffi-steal-banner` (volt burst), `.ffi-otc-on-block` (breathing glow), `.ffi-pill-bar` / `.ffi-pill-indicator` / `.ffi-pill-item` (filter pills), `.ffi-cascade-item` (stagger). Reduced-motion block updated to cover all new animations.

**Verify result:** type-check clean (0 errors). All components are `'use client'`, no new server/shared coupling. Zero paid API calls.

---

## 2026-06-06 — UXV2-3: Prep Hub GRIDIRON redesign

**Task:** UXV2-3 | **Class:** `output` | **Lenses:** Design, QA

**Why:** The Prep Hub page was a flat list of 7 identical hub cards — generic layout with zero visual hierarchy. UX-V2 GRIDIRON direction requires a real composition: a featured hero card, a full-width status card, secondary tiles, and a distinct footer strip. Per design DNA: colorful-dark canvas, volt green for action/value, electric blue for structure, Saira Condensed labels, JetBrains Mono for all numbers, no backdrop-filter blur.

**What changed:**
- `src/app/(app)/prep/page.tsx`: Full rewrite. Four sections via `SectLabel` divider (Setup, Research, Players, Draft Day). Setup = full-width Configure League card using `ffi-card-interactive`. Research = `ffi-hero` hero card (iridescent sheen class) with eye-label, 26px headline, stat row (Players/Last Run/Saved Runs in JetBrains Mono), blue AI Read panel, volt `ffi-btn-hero` CTA — plus 3-tile grid below (Board/Strategies/Runs). Players = 2-col grid (Player Browser green, Keepers amber). Draft Day = 2-col strip (Dry Run ghost, Start Draft volt-gradient + volt glow border). DataFreshness preserved at 50% opacity.
- `.claude/mockups/prep-hub-phone.html` + `public/mockups/prep-hub-phone.html` (new): approved phone-width mockup used as design reference. Background uses `body::before { position:fixed }` fixed pseudo-element technique (avoids iOS `background-attachment:fixed` breakage).

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors, `npm run build` passes. All four sections (Setup/Research/Players/Draft Day) confirmed in DOM snapshot. Commit 5676f96.

---

## 2026-06-04 — FF-313: App-shell double-mount fix (Option D)

**Task:** FF-313 | **Class:** `shared` + `bugfix` | **Lenses:** Architecture, QA

**Why:** `AppShell` rendered `{children}` in two sibling wrappers simultaneously — `hidden md:block` (desktop) and `md:hidden` (SwipeCarousel/mobile). CSS `display:none` hides elements visually but does not unmount React, so every authenticated page mounted twice. For `LiveDraftClient` specifically: 2× `/api/players` + 2× `/api/draft/sessions` on mount; 2× Sheets poll (~17 req/min); 2× Sleeper poll (~48 external req/min); 2× `scorePlayersWithStrategy` + O(n²) `maxBidAdviceMap` per pick. More critically: manual entry only reached the visible instance; when the hidden instance's feed-driven PATCH (full-array replace) fired next, it clobbered any manually-entered picks — silent data loss on draft day.

**What changed:**
- `src/hooks/use-is-mobile.ts` (new): `useIsMobile()` hook. Uses `window.matchMedia('(max-width: 767px)')`, updates on resize via `addEventListener('change', …)`, defaults `false` (desktop) for SSR safety.
- `src/components/layout/app-shell.tsx`: Added `useIsMobile` import + `const isMobile = useIsMobile()` call. Replaced the parallel `hidden md:block` / `md:hidden` sibling-wrapper block with a single `{isMobile ? <SwipeCarousel>…{children}… : …{children}…}` ternary. Desktop layout (padding, max-width, PageTransition) and mobile layout (SwipeCarousel, `pb-24` safe-area padding) are both preserved exactly.

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors, `npm run build` passes. DOM check via `preview_eval`: `document.querySelectorAll('.mx-auto.max-w-6xl').length === 1` at both 1280px (desktop) and 375px (mobile). Previously 2.

---

## 2026-06-04 — UX-7.3: One-tap demo entry

**Task:** UX-7.3 | **Class:** `output` | **Lenses:** QA, Design

**Why:** The sim was already built (UX-7.1/7.2) but required a real Supabase draft session to exist before it could load — making it impossible to demo on a phone without going through the full 3-step setup flow. Needed a zero-setup path so Joe can open one URL and show anyone the full broadcast experience.

**What changed:**
- `src/app/(app)/draft/live/client.tsx`: Added `DEMO_SESSION` (12 Nasties managers, $200 auction, ESPN/PPR) and `DEMO_LEAGUE` constants above the component. Modified session-load `useEffect`: when `simEnabled && !sessionId`, inject the mock session + league and fetch real players from `/api/players` instead of showing the "no session" error. Persistence calls to `/api/draft/sessions/demo` fail silently (try/catch already in place).
- `src/app/(app)/draft/page.tsx`: Added `Play` import; added dev-only "Demo Draft" card (amber-tinted, `NODE_ENV === 'development'` guard) linking to `/draft/live?sim=1`.
- `.claude/WORKING_STATE.md`: Added Demo Draft Launch section to Commands Reference.

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors in changed files, `npm run build` passes. `/draft/live?sim=1` loads live draft room with "The Nasties (Demo)", 12 managers, $200 budget, real seeded players, SIM HUD active — no login or session setup required. Draft Hub shows amber "Demo Draft" card in dev only.

---

## 2026-06-04 — UX-7.2: Sim signature moments + AI suppression + auto-navigate to review

**Task:** UX-7.2 | **Class:** `output` + `pipeline` | **Lenses:** QA, Delivery

**Why:** The sim engine (UX-7.1) needed three completions to be demo-ready: (1) AI advisor auto-fire needed to be suppressed so the sim runs at zero cost with no ANTHROPIC_API_KEY; (2) the `PositionRunTicker` never fired because best-available picks scatter across positions — scripting a 3-pick WR run at picks 8-10 guarantees the ticker; (3) the sim had no exit — it stopped at the completed state with no path to the grade-reveal screen.

**What changed:**
- `src/hooks/use-draft-simulator.ts`: In `fireNextPick`, added a scripted WR window at real pick counts 8-10 (filters pool to WR-only when 1+ WR is available) so `PositionRunTicker` fires at a predictable moment during every sim run.
- `src/components/draft/auction-advisor.tsx`: Added `suppressAI?: boolean` prop to `AuctionAdvisorProps` and `AuctionAdvisor`. Wired into `useAutoRecommend` as `enabled: state.format === 'auction' && !suppressAI`. Manual Refresh button still works when suppressed.
- `src/components/draft/snake-advisor.tsx`: Same `suppressAI?: boolean` addition wired into `useAutoRecommend` `enabled` guard.
- `src/app/(app)/draft/live/client.tsx`: Added `useRouter` import from `next/navigation`; added `useEffect` that pushes to `/draft/review?session=<id>` when `isSimActive && state.status === 'completed'`; passed `suppressAI={isSimActive}` to both advisors; gated trash talk `generateTrashTalk()` calls behind `!simEnabled` in both trash talk effects (hardcoded fallback strings still show).

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors in changed files, `npm run build` passes. Sim now: scripted WR run fires `PositionRunTicker`; zero AI fetch calls while running; auto-navigates to gold grade-reveal + confetti on completion.

---

## 2026-06-04 — UX-7.1: Dev-only Sim Engine

**Task:** UX-7.1 | **Class:** `shared` | **Lenses:** Architecture, QA

**Why:** Needed a way to auto-play the full draft experience without running a real draft, so every broadcast moment (lower-third, score-bug, on-the-clock banner, trash talk, grade reveal) can be validated end-to-end without coordinating with other people. Also enables showing the app to others on demand.

**What changed:**
- NEW `src/hooks/use-draft-simulator.ts`: `useDraftSimulator` hook. Gate: `NODE_ENV !== 'production' && enabled` prop. Uses ref pattern for all reactive values (mirrors `use-sleeper-draft-feed.ts`). Players sorted by `consensusRank` ascending; auction price from `player.consensusAuctionValue` capped at 40% of manager budget; snake reads `state.current_manager` from the state machine; auction cycles managers round-robin via `auctionMgrIdxRef`. Speed control: slow (3s), medium (1.5s), fast (0.6s). Draft completion detected inside `fireNextPick` (avoids synchronous setState in effect). Returns `{ isSimActive, isRunning, speed, setSpeed, start, pause, reset }`.
- `src/app/(app)/draft/live/client.tsx`: Added `Play`, `Pause`, `RotateCcw` Lucide imports; `useDraftSimulator` + `SimSpeed` imports; `simEnabled` derived from `NODE_ENV !== 'production' && ?sim=1`; hook call; amber SIM HUD bar rendered when `isSimActive` (sticky top-0, dev-only, amber glass border).

**Verify result:** type-check clean, 29/29 tests, 0 net-new lint errors in changed files, `npm run build` passes. Sim HUD visual verification deferred (requires active session to pass the `state && session` guard; launch: `/draft/live?session=<id>&sim=1`).

---

## 2026-06-03 — UX-6.4: Stadium Primetime "after" state audit (UX-6 QA gate close-out)

**Task:** UX-6.4 | **Class:** `docs` | **Lenses:** QA, Delivery

**Why:** UX-6 required a before/after screenshot set as the QA gate for the Stadium Primetime track. No "before" screenshots existed (the redesign happened across in-flight sessions). This closes the gate with an "after" DOM-level audit as the permanent record.

**What changed:**
- Created `.claude/UX6_AFTER_AUDIT.md`: live DOM audit of 6 screens (Prep Hub, Configure, Draft Board, Draft Setup, Live Auction Draft Room, Post-Draft Review) at 1280px desktop + 375px mobile via `preview_snapshot`. Before/after token comparison table included. All screens PASS.
- `BUILD_PLAN.md`: UX-6.4 marked `[x]`
- `WORKING_STATE.md`: Current session + Last Completed updated; next item noted (UX-7.1)

**Verify result:**
- 6/6 screens render without console errors (2 pre-existing ThemeToggle hydration issues, non-blocking)
- Real player data confirmed live: 3093 cached players, 8 INJURY WATCH entries, 180+ player pool rows, 12 managers in League Overview
- Mobile 375px: identical DOM structure to desktop — all panels reachable
- `preview_screenshot` timed out on all attempts (heavy CSS filter/animation stack overwhelms headless renderer); `preview_snapshot` is the authoritative substitute

**UX-6 track fully complete. Next: UX-7 (Sim Draft / Demo Mode).**

---

## 2026-06-03 — UX-6.3: Background-layer GPU promotion

**Task:** UX-6.3 | **Class:** `output` (CSS-only) | **Lenses:** Design, QA

**Why:** The two atmospheric background layers (`.stadium-atmos`, `.atmos-grain`) were not guaranteed separate GPU compositor layers. `.atmos-grain` had no transform, so it painted into the main document layer and could trigger full-page compositing on every opacity/blend change. The filter-brightness animation on `.stadium-atmos.atmos-clock` was not hinted, so the browser had to invalidate the compositor state each animation frame.

**What changed (`src/app/globals.css` only):**
- `.atmos-grain`: added `transform: translateZ(0)` — forces a dedicated GPU compositor layer (same pattern already on `.stadium-atmos`). Verified: `getComputedStyle().transform` changed from `none` to `matrix(1, 0, 0, 1, 0, 0)` in the running preview.
- `.stadium-atmos.atmos-clock` + `body.ffi-on-the-clock .stadium-atmos`: added `will-change: filter` — pre-allocates GPU resources for the `filter: brightness()` animation so the compositor doesn't need to re-rasterize on each frame.
- `@media (prefers-reduced-motion: reduce)`: added `will-change: auto` reset on both animated selectors — releases GPU memory when animations are suppressed and the hint is no longer needed.

**Visual effect:** None (GPU hints are invisible to the eye).

**Verify:** type-check clean, 29/29 tests, 0 net-new lint errors, build clean.

**Deferred:** FFT-008 arm's-length mobile physical test still needs Joe on phone.

---

## 2026-06-03 — UX-6.2: WCAG ≥4.5:1 contrast pass + reduced-motion audit

**Task:** UX-6.2 | **Class:** `output` (CSS tokens + motion components) | **Lenses:** Design, QA

**Contrast fix:**
- `src/app/globals.css`: `--ffi-text-muted` bumped from `#64748b` (4.31:1 on main bg / 3.69:1 on `#0a1b25` — both below WCAG AA 4.5:1) to `#7d8fa8` (6.23:1 on main bg / 5.33:1 on `#0a1b25` / 5.83:1 on glass). Updated in both `@theme` and `:root` blocks. Visual change is a barely perceptible lightening of muted labels; hierarchy vs `--ffi-text-secondary` (#94a3b8) preserved. All other color tokens already pass AA.
- Calculated contrast ratios: #deedf9 (primary) ≥14:1; #94a3b8 (secondary) 7.99:1; #7d8fa8 (muted, new) 5.33:1; all position badges 4.5:1+; gold #e0c27a 5.6:1; value green #2ff801 12:1+.

**Reduced-motion audit:**
- `src/app/globals.css`: added `.glass-interactive:hover { transform: none; }` to `prefers-reduced-motion: reduce` block (previously omitted while the four sibling `.ffi-btn-*` and `.ffi-card-interactive` hover transforms were covered).
- `src/components/ui/ffi-motion.tsx`: added `useReducedMotion()` checks to all 11 animation components. Pattern: (1) persistent/looping animations (`FFIGlowPulse` `repeat: Infinity` box-shadow) → skip `animate` entirely when reduced; (2) entrance spatial transforms (y, x, scale, rotate) → zero out but preserve opacity fade; (3) hover/tap transforms (`FFIMotionCard`, `SharedPlayerCard`, `FFIPressScale`) → empty `{}` when reduced; (4) `FFIBounceIn` burst ring → conditionally rendered; (5) stagger delays zeroed so items appear immediately.
- Components already correct before this change: `FFICelebration`, `FFIConfettiBurst`.

**Verify:** `--ffi-text-muted: #7d8fa8` confirmed in live DOM via preview_inspect. type-check clean, 29/29 tests, 0 net-new lint errors, build clean.

---

## 2026-06-03 — UX-6.1: Empty states + skeletons across remaining screens

**Task:** UX-6.1 | **Class:** `output` (visual only) | **Lenses:** Delivery, QA
- `src/components/page-skeleton.tsx`: removed dependency on shadcn `Skeleton` component; replaced with inline `FfiSkeleton` helper using `.ffi-skeleton` (v2.0 shimmer from UX-3). Card wrappers upgraded from `border-border bg-card` to `bg-[#0a1b25] border-white/[0.04]`; table header from `bg-muted/30` to `bg-[#0a1b25]/80`; row dividers from `border-border` to `border-white/[0.04]`. All `loading.tsx` files that import PageSkeleton/TableSkeleton inherit the fix at once.
- `src/app/(app)/prep/runs/client.tsx`: replaced 3x inline `Loader2` spinners (initial leagues load, runs-list load, row detail-expand load) with `.ffi-skeleton` shimmer rows; replaced 2x generic `<Card><CardContent>` empty states with glass divs (`bg-[#0a1b25] border-white/[0.04]`) + v2.0 text tokens.
- `src/app/(app)/prep/strategies/client.tsx`: replaced `Loader2` loading state with shimmer skeleton cards; upgraded "No leagues configured" empty state from `bg-muted/50 border-border` to glass + v2.0 text tokens (`#deedf9` / `#9eadb8` / `#8bacff` link); removed now-unused `Loader2` import.
- `src/app/(app)/prep/runs/page.tsx` + `prep/strategies/page.tsx`: plain `<h1 className="text-2xl font-bold">` → `<h2 className="ffi-display-md text-white">` + `<p className="ffi-body-md text-[var(--ffi-text-secondary)]">`, matching `configure/page.tsx` v2.0 pattern.
- **Verify:** /prep/runs empty state renders "No research runs yet"; /prep/strategies header and empty states render correctly. type-check clean, 29/29 tests, 0 net-new lint errors, build passes.

---

## 2026-06-03 — UX-4: Prep Hub gold hover + Configure form glow (UX-4.1 + UX-4.2)

**Task:** UX-4.1 (hub cards gold-on-hover) + UX-4.2 (glow-focus form inputs) | **Class:** `output` (visual only) | **Lenses:** Design, QA
- `prep/page.tsx` `HubCard`: icon container updated from old slate-800 to v2.0 surface-container token; icon, title, and chevron hover colors changed from lime `--ffi-accent` to gold (`text-gold-bright`, `text-gold`, `group-hover:bg-gold/8 border-gold/20`). The `.ffi-card-interactive:hover` gold border was already in place; now the inner elements match.
- `configure/page.tsx`: plain `<h1>` replaced with `<h2 className="ffi-display-md text-white">` + `<p className="ffi-body-md text-[var(--ffi-text-secondary)]">` matching the v2.0 section header pattern (server-component safe, no client import needed).
- `globals.css`: added `.ffi-form-input:focus-visible/.ffi-form-input:focus` — gold glow focus ring (`border-color: rgba(224,194,122,0.55)`, `box-shadow: 0 0 0 3px rgba(224,194,122,0.12)`) with `!important` to override Tailwind's focus-visible ring utilities.
- `league-config-form.tsx`: applied `ffi-form-input` class to all 11 form inputs and selects (league name, platform, team count, budget, scoring format, all 9 roster slots, scoring settings per-field, max keepers, keeper cost type, keeper name/position/cost).
- **Verify:** type-check clean, 29/29 tests, 0 net-new lint errors, build passes. DOM confirms correct classes applied (`group-hover:text-gold-bright`, surface-container bg, `ffi-form-input` on all configure inputs).

---

## 2026-06-03 — Sunday Night Gridiron: AAA UI moments + make-it-real fixes (Opus)

**Task:** AAA UI/UX upgrade + code-review-driven P0 fixes  |  **Class:** `output` (UI) + `pipeline` + `bugfix` | **Lenses:** Design, QA, Architecture
Personality "Sunday Night Gridiron" (NFL primetime broadcast graphics) chosen by Joe; scope = visual + make-it-real fixes; extras = opt-in sound + Android haptics. Two research deliverables written: `.claude/CODE_REVIEW_2026-06.md`, `.claude/AAA_UI_RESEARCH.md`.

**Phase 0 - foundation + hard-rule hygiene**
- `globals.css`: added `--ffi-live` broadcast cyan token (live-data signal, never CTA/value), named easing vars (`--ease-broadcast/spring/standard`), a registered `@property --ffi-sheen-angle`, and global `font-variant-numeric: tabular-nums`.
- Emoji purge: all 66 emoji across 14 files replaced with Lucide icons (trash-talk config + renders + AwardBadge, ffi-primitives FFITrashTalkAlert/FFITacticalInsight, setup/players/team-reports/league-overview/export/etc., live keeper lock + sync checks, review trash-talk tab).
- Em/en-dash sweep across all `src` string literals/JSX/templates; trash-talk route strip now removes en-dash too; added ESLint `no-restricted-syntax` guard so dashes cannot return.
- `FFIAIRecommendation` de-drifted to v2.0 (killed italic/uppercase headline, lime CTA, hardcoded slate borders).

**Phase 1 - make-it-real P0 fixes**
- Auto-fire AI advisor: new `src/hooks/use-auto-recommend.ts`; AuctionAdvisor fires on every pick, SnakeAdvisor near your turn (debounced, ref-stable). Flagship "<=3s after a pick" now happens without a manual tap; manual Refresh retained.
- `claude.ts`: prompt caching (system marked `cache_control` ephemeral by default) + defensive text-block parse.
- `api/draft/recommend/route.ts`: `maxDuration=10`, maxTokens 384->600, one retry+backoff, 8s timeout, rule-based fallback (`source:'fallback'`) so the live draft never 500s.
- Keeper-completion bug fixed in `state.ts` (`total_picks + keepers.length`); new `src/lib/draft/__tests__/state.test.ts` (29 tests pass).
- Format purity: `position-scarcity.tsx` `showSpendRanges` default true->false.

**Phase 2 - signature LIVE broadcast moments**
- `pick-lower-third.tsx`: most-recent pick wipes in as a TV lower-third (gold rail for your pick, cyan for others), one-shot sheen, fixed height = zero layout shift. PickFeed now shows it as the hero with history below.
- `live-scorebug.tsx`: persistent heavy-glass score-bug (budget/round/roster, tabular mono, cyan flash on change). Format-pure.
- `position-run-ticker.tsx`: cyan insight strip on a 3+ position run (counts only).

**Phase 3 - champion REVIEW moment**
- GradeHero: grade is now GOLD (was lime) - `gradeGlow.A`, `.ffi-grade-a`, score color; rotating conic gold ring (`.ffi-grade-ring-sheen` via `@property`); wired `FFICelebration` (new `tone="gold"`) + new `FFIConfettiBurst`; Oswald verdict word ("ELITE DRAFT"). Reduced-motion -> static.

**Phase 4 - sensory + continuity**
- `use-haptic.ts` (Android-only, no-op iOS, reduced-motion aware), `use-sound.ts` (opt-in, muted default, Web Audio synth, `useSyncExternalStore`), settings toggle (`sound-settings.tsx`). Cues wired: your-turn + each pick (live), champion (review). `view-transition.ts` helper shipped.

**Verify:** type-check clean; `npm run build` succeeds (all routes); 29/29 tests; lint has 0 net-new errors (25 pre-existing debt documented in CODE_REVIEW_2026-06.md, BACKLOG). Visual: settings sound toggle, live score-bug + lower-third, and 375px one-thumb layout confirmed via preview screenshots. Marquee animations (lower-third wipe with a real pick, gold grade hero + confetti) render in layout; full motion proof needs a seeded/live session. Live AI auto-fire end-to-end needs `ANTHROPIC_API_KEY` + Joe's typed cost approval (gated).

---

## 2026-06-03 — UX-2 (Opus elevation): On-the-clock hero + true moment-gated spotlight

**Task:** UX-2 review/upgrade (Sonnet → Opus)  |  **Class:** `output` (UI) | **Lenses:** Design, QA

Review of the Sonnet-built UX-2 found a competent recolor that missed the design-judgment core of the "hero screen" sprint. Elevated to Opus quality — all visual-only (reads existing draft state, no engine change):

- **On-the-clock spotlight, re-wired to the MOMENT.** Sonnet's `body.draft-active` fired for the entire draft (`status !== 'completed'`) — a constant gold pulse that devalues "gold = the moment," the core of the v2.0 system. Replaced with a true `onTheClock` signal in `client.tsx` (snake → `current_manager` is you; auction → a player is on the block) driving `body.ffi-on-the-clock`. Verified live: the gold spotlight is correctly OFF on a live auction with no player on the block, and ON the instant a player is nominated / at your snake turn.
- **On-the-clock HERO banner (the missing centerpiece).** New `.ffi-onclock-banner` (gold light-catch edge + breathing ambient spotlight glow; transform-free so Framer Motion owns the spring entrance). Snake → "YOU'RE ON THE CLOCK · Round X · Pick Y" (Clock icon); auction → "ON THE BLOCK · <player> · <pos>" (Gavel icon). `role="status"` + `aria-live="polite"`.
- **Finished the recolor Sonnet left in the file it edited.** `--ffi-accent`/`--ffi-success` both resolve to lime `#39ff14`; recolored StrategyPicker (icon + active state) + MySquad Target icon → blue (structure), and "Roster complete!" → `--value-green` (success/value).
- **No-Line fix:** MySquad's `border-t border-[var(--ffi-border)]/20` (gray) → `border-white/[0.06]` (light-catch hairline).
- **CSS:** removed Sonnet's duplicate `body.draft-active .stadium-atmos` (byte-identical to `.stadium-atmos.atmos-clock`); added `body.ffi-on-the-clock .stadium-atmos` (intensified gold spotlight + pulse) + `.ffi-onclock-banner` / `@keyframes ffi-onclock-sheen`; both added to the reduced-motion guard.
- **Verify:** type-check clean · 27/27 tests · 0 lint errors in changed files · banner + spotlight confirmed live in real snake + auction sessions at 1280 + 390 (DOM geometry + computed styles: gold border `rgba(253,239,182,0.38)`, gold glow shadow, atmos `atmos-clock-pulse`, 44px touch target, no 390px overflow). JPEG screenshots not capturable via the preview tool — the live draft polls continuously + double-mounts (no network-idle frame); verified via computed-style inspection instead, per the tool's own guidance.

---

## 2026-06-03 — UX-3: Stadium Primetime — Draft Board / Player Pool (data-dense)

**Task:** UX-3.1–3.3  |  **Class:** `output` (UI) | **Lenses:** Design, QA
**Commit:** `b513c3b`

- **UX-3.1 Rank redesign:** `ffi-player-card.tsx` + `draft-board-table.tsx` — removed italic ghost (was `italic text-[#8bacff]/20`); ranks 1–24 = Stadium Gold (`rgb(224,194,122)`), ranks 25+ = Gridiron Blue (`rgb(85,130,230)`). Full opacity. Space Grotesk bold (font-headline). Confirms live: rank "01" = gold, rank "25" = blue.
- **UX-3.2 Tabular mono numbers:** All player values (`$amount` / `Rd N`), ADP, score, range stats now use `font-mono tabular-nums` → JetBrains Mono confirmed live in computed styles. Value color = Stadium Gold. Expanded card stat sections: removed all `border-t` separators, replaced with top-margin spacing only.
- **UX-3.3a Position badge active = blue:** `FFIPositionFilters` section header bar + active button: lime `#2ff801` → Gridiron Blue `#5582e6`. Board client's inline position pills also updated to blue. Confirmed live: active "ALL" button = `rgb(85,130,230)`.
- **UX-3.3b Sticky filter headers:** `ffi-filter-sticky` CSS class (sticky/top-0/z-20/glass backdrop) applied to both the live-draft `PlayerPool` filter bar and the prep `DraftBoardClient` board filter bar. Both stick on scroll with a blurred glass backdrop.
- **UX-3.3c Row-density toggle:** Compact/comfortable mode in `PlayerPool` and `DraftBoardClient` — icon button cycles between `LayoutList` (comfortable) and `AlignJustify` (compact). Compact reduces card padding, rank text size, and card spacing.
- **UX-3.3d Skeleton loaders:** `PlayerListSkeleton` component renders 8 shimmer rows (`.ffi-skeleton` keyframe) in place of "Loading player data..." text on the prep board. `ffi-skeleton` added to `globals.css` with reduced-motion guard.
- **Flash streak fix:** Updated lime `rgba(47,248,1,0.1)` → gold `rgba(224,194,122,0.07)` — highlighted player card streaks are now warm gold tint (the moment), not value-green.
- **Verify:** type-check clean · 27/27 tests pass · 0 lint errors in changed files · sticky/z-index/bg confirmed via inspect · gold rank / blue rank / mono value / blue active-filter all confirmed via computed styles.

---

## 2026-06-03 — UX-2: Stadium Primetime — Live Draft Room (AAA Visual Upgrade)

**Task:** UX-2.1–2.4  |  **Class:** `output` (UI) | **Lenses:** Design, QA
**Commit:** `08a7d37`

- **UX-2.1 On-the-clock spotlight:** Radio icon in live draft header: `danger-red → gold`. Added AUCTION/SNAKE pill badge in gold beside "Live Draft" title. `body.draft-active` CSS class set via `useEffect` while draft is active → intensifies `stadium-atmos` overhead gold spotlight + enables `atmos-clock-pulse` 3.2s breath animation on the background.
- **UX-2.2 Pinned bar Record button:** Changed from lime (`bg-[#2ff801]`) to metallic gold gradient (`ffi-btn-hero` values via inline style for specificity) — now reads as a commit/moment action, not a generic CTA. Disabled state unchanged (muted glass).
- **UX-2.3 Your-pick gold rail:** `PickFeed` now accepts `myManager` prop; your picks: gold left border + `bg-gold/5` tint + `text-gold-bright` player name + gold price. Latest pick (idx 0) gets `.ffi-pick-flash` (box-shadow gold glow keyframe, no scale conflict with Framer Motion). Other newest pick: blue tint. Live feed pulse dot: `danger-red → value-green` (it's a success/live signal).
- **UX-2.4 v2.0 restyling:** `ConnectionStatusPill` LIVE state: `#22c55e → #2ff801` (value-green token); all states get `backdropFilter: blur(8px)` glass; error bar: `ffi-glass` class + danger border tint. `TrashTalkFeed` steal/budget_dominance/keeper_steal alert colors: `--ffi-success → --value-green`. SavedTrashTalk bookmark icon: lime accent → gold. AwardBadge success: `--ffi-success → --value-green`. MySquadPanel budget: lime accent → blue primary (budget is structural data, not a moment).
- **CSS additions:** `.ffi-pick-flash` (box-shadow gold flash only, no scale); `body.draft-active .stadium-atmos` override; both added to reduced-motion guard.
- **Verify:** type-check clean · 27/27 tests pass · 0 lint errors in changed files · CSS rules confirmed live in browser · gold/value-green tokens confirmed in computed styles.

---

## 2026-06-02 — UX-1: Stadium Primetime Foundation (AAA Visual Upgrade)

**Task:** UX-1.1–1.7  |  **Class:** `output` (UI) | **Lenses:** Design, QA
**Authorization:** Supersedes locked DESIGN_SYSTEM.md v1.2 → v2.0 (Joe approved 2026-06-02).

- **Design system v2.0** "Stadium Primetime" — rewrote `DESIGN_SYSTEM.md`, created `UI_UPGRADE_PLAN.md`, added a v2.0 addendum to `UI_DESIGN_SPEC.md`, added the UX sprint track to `BUILD_PLAN.md`.
- **Fonts (UX-1.3):** `layout.tsx` loads Space Grotesk + Manrope + JetBrains Mono via `next/font` (distinct vars `--font-space-grotesk/-manrope/-jetbrains/-oswald`); Inter removed; `.font-headline/-body/-label/-display` + `@theme` rewired to resolve to the loaded families. Root cause fixed: v1.x referenced "Space Grotesk"/"Manrope" in CSS but never loaded them, so every `font-headline/body` silently fell back to system. Verified live on :3003.
- **Tokens (UX-1.2):** Stadium Gold ramp (`--ffi-gold*`, `--color-gold*`), `--value-green`, gold glow effects; blue + surface token names kept stable.
- **Background (UX-1.4):** `.stadium-atmos` (overhead gold spotlight + cool ambient + turf hint + night-navy) + `.atmos-grain` (SVG fractalNoise top overlay) + `.atmos-clock` on-the-clock tint; `app-shell.tsx` swapped the 5 light-streak/flash divs for the two atmosphere layers.
- **Glass (UX-1.5):** `.ffi-glass/-heavy/.glass-panel` refined (navy tint + saturate + light-catch hairline); added `.glass-interactive` + `.ffi-scrim`; removed gray `rgba(51,65,85,0.5/0.8)` borders from all three `.ffi-card*` tiers; interactive hover edge lime → gold.
- **Buttons (UX-1.6):** `.ffi-btn-primary` lime → blue; added `.ffi-btn-hero` (gold) + `.ffi-btn-value` (green); `FFIButton` variants `primary|hero|value|secondary|ghost`; mobile 44px targets, `:active` glows, reduced-motion all updated.
- **Motion (UX-1.7):** `@keyframes ffi-reveal` + `ffi-gold-flash` + `ffi-stagger-fade`; `.ffi-animate-reveal/-stagger`; reduced-motion list extended.
- **Nav:** active sidebar + bottom-tab accent shifted lime → gold (spotlight follows the active item).
- **Verify:** `type-check` clean · `test:run` 27/27 pass · changed files lint clean · `globals.css` brace-balanced (204/204) · fonts confirmed served on :3003. Full `next build` deferred until port 3003 is free (a parallel dev server held `.next`).

---

## 2026-06-02 — FFT-005: Prep Configure + Player Pool Chrome Test

**Task:** FFT-005  
**Class:** `output` | **Lenses:** QA, Delivery

- Navigated to `/prep/configure` via Chrome MCP: ESPN/Auction/12-team/$200/Full PPR all pre-filled correctly
- Draft Board at `/prep/board`: 500 players load from Sleeper-seeded cache (real NFL names confirmed)
- 3 console issues reviewed — all pre-existing: ThemeToggle script-tag warning, ThemeToggle hydration mismatch, `[useUserTags] fetch failed` (awaiting Supabase migration `20260323000002`)
- No new errors introduced by the seed
- **Result:** FFT-005 PASS — Testing Sprint T2 complete

---

## 2026-06-02 — FFT-004: Sleeper Player Seed

**Task:** FFT-004  
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

- Created `scripts/seed-players-sleeper.ts` — one-shot seed script for `players_cache`
- Fetches `GET https://api.sleeper.app/v1/players/nfl` (free, no key)
- Filters 12,194 Sleeper players → 3,064 active QB/RB/WR/TE/DEF (K excluded per Nasties rule)
- Deduplicates 16 name collisions before upsert (same `name` conflict key as table constraint)
- Upserts 3,048 unique rows via service role key in batches of 100
- Supabase `players_cache` total: 3,093 (includes prior seed rows)
- **Result:** FFT-004 PASS

---

## 2026-06-02 — FFT-002 + FFT-003: Chrome UI Smoke Tests + Bug Fixes

**Tasks:** FFT-002 (prep mode UI), FFT-003 (live draft UI) + 3 bug fixes found during testing  
**Class:** `bugfix` | **Lenses:** QA, Design

**FFT-002 — Prep screens (PASS):**
- Prep Hub: renders, 573 players cached, correct CTA
- Configure: Joe's ESPN Auction (12 teams, $200, PPR) ✅; Tyler's Sleeper tab ✅
- Draft Strategies: empty state "No leagues configured" — correct behavior
- Draft Board: empty state — correct behavior
- Console: ThemeToggle hydration mismatch on every page (non-blocking — SSR/client light/dark mismatch)

**FFT-003 — Live draft UI (PARTIAL PASS — 3/4 criteria met):**
- ✅ Connection status pill: "● MANUAL 0 PICKS" visible in header
- ✅ Manual pick bar: "Tap BID on any player" pinned at bottom (auction + snake)
- ✅ Player pool: 300 players render in both auction and snake modes
- ⚠️ Console: `[useUserTags] Error: Could not find the table 'public.user_tags'` (×4) — Supabase migration not applied; player intel tags non-functional but does not crash the UI
- Snake: "Rd 1 · Pick 1 · YOUR PICK" snake advisor, ADP sort tabs, correct keeper-league roster slots ✅

**Bugs fixed:**
1. `createLeague` DEV_MODE: was returning fake `leagueId: 'dev-league-001'` without saving to Supabase — fixed to use service role key (same pattern as sessions route)
2. `ffi-player-card.tsx` — `$undefined` / `$NaN-$NaN RANGE` on players with no `consensusAuctionValue`: added `?? 0` fallback; display now shows `$0`/`$0-$0 RANGE`
3. `ffi-player-card.tsx` — `Rd NaN` on players with no ADP (`player.adp === 0` or `NaN`): added `player.adp > 0` guard; display now shows `Rd 0`
4. `manual-pick-entry.tsx` — `$undefined` in search dropdown for players without auction value: added `?? 0` fallback

**Supabase migrations needed (Joe action required):**
- `20260321000001_add_keepers_to_draft_sessions.sql` — adds `keepers` jsonb column (blocks session API `POST /api/draft/sessions`)
- `20260323000002_user_tags_table.sql` — creates `user_tags` table (suppresses console errors in live draft)
- Apply via Supabase Dashboard → SQL Editor (scripts are in `supabase/migrations/`)

**Not changed:** game logic, state machine, API behavior, tests.

---

## 2026-06-02 — FF-269: Touch Target Audit + Fix (P0 Sub-tier 4)

**Task:** FF-269 — Arm's-length physical test — fix touch targets < 44px  
**Class:** `output` (UI only) | **Lenses:** Design, QA

**Audit findings (4 files, 7 elements):**
- `ffi-position-filters.tsx` — filter pills `py-2` ≈ 30px; sort tabs `py-1` ≈ 24px
- `ffi-player-card.tsx` — expand/collapse chevron: no sizing, wraps 20px icon
- `connection-status-pill.tsx` — error bar Retry `padding: 4px 10px` ≈ 22px; dismiss × no sizing
- `manual-pick-entry.tsx` CARD variant — submit `h-9` (36px); undo `h-7` (28px)

**Fix:** Added `min-h-[44px]` (+ `flex items-center justify-center` where needed) to all offending elements. Bar variant, BID button, and trash talk buttons already compliant — untouched.

**Not changed:** logic, state, props, tests.  
**Physical verification (FFT-008):** still requires Joe on phone — scheduled in P2 Testing Sprint.

**Verification:** lint zero new errors in changed files, type-check clean, 27/27 tests pass.

---

## 2026-04-16 — FF-283: Dynamic Max-Bid Recompute on Every Pick

**Task:** FF-283 — Every pick from any source triggers `calculateMaxBidAdvice()` recompute for remaining players  
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** `calculateMaxBidAdvice()` was defined in `auction-advisor.ts` but **never called anywhere** in the live UI. Player cards in the pool showed a single global `getMaxBid()` value (flat absolute max) — the same number for every player regardless of strategy score, position need, or scarcity. Per-player strategy-aware advice was completely unwired.

**Approach:** Added a `maxBidAdviceMap: Map<string, number>` useMemo in `live/client.tsx` keyed by lowercase player name. It depends on `[state, scoredPlayers, draftedNames, strategy]` — every pick from any source (Auctioneer BroadcastChannel/localStorage → `addManualPick` → `setState`, Sheets → `handleNewSheetPicks` → `setState`, manual → `addManualPick` → `setState`) invalidates the memo and recomputes `calculateMaxBidAdvice()` for all remaining undrafted players. The result map is passed to `PlayerPool` as new `maxBidMap` prop; each `FFIPlayerCard` gets its own per-player value (fallback to global `maxBid` if map absent). `MySquadPanel` continues to use the simple `getMaxBid()` result for its "Max bid" line — correct behavior since it's a squad-level overview, not a per-player decision.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`: import `calculateMaxBidAdvice`; add `maxBidAdviceMap` useMemo (deps: state + scoredPlayers + draftedNames + strategy); pass `maxBidMap={isAuction ? maxBidAdviceMap : undefined}` to `<PlayerPool>`
- `src/components/draft/player-pool.tsx`: add `maxBidMap?: Map<string, number>` prop; card render uses `maxBidMap.get(sp.player.name.toLowerCase()) ?? null` per card (fallback to `maxBid`)

**Architecture notes:**
- Pure computation — no async, no network calls; computing for ~100–300 players is sub-millisecond (simple math + one `.filter()` per player over `scoredPlayers`)
- `MySquadPanel` keeps `maxBid={myMaxBid}` (simple global max) — squad-level overview doesn't need per-player strategy advice
- `maxBidMap` is `undefined` in snake mode — `FFIPlayerCard` hides the MAX display when `maxBid` is null/undefined

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files.

---

## 2026-04-16 — FF-282: use-draft-feed.ts Unified Multi-Source Pick Feed

**Task:** FF-282 — Generalize `use-draft-polling.ts` → `use-draft-feed.ts`  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `live/client.tsx` called `useAuctioneerfeed` directly with `AuctioneerPick[]` — a raw internal type from the Auctioneer integration layer. Downstream code (FF-283 max-bid recompute, future Sheets unification) needs a stable `NormalizedPickEvent[]` interface that abstracts the source. Also eliminated explicit `enabled`/`connectionType` gating boilerplate from the call site.

**Approach:** New `src/hooks/use-draft-feed.ts` wraps `useAuctioneerfeed` and converts its `AuctioneerPick[]` output to `NormalizedPickEvent[]` using `createPickMerger()` (FF-281) + `playerNameToPickId()`. Gating is internal: hook is a no-op when `format !== 'auction'` or `connectionType` is null — callers pass `session.format` and `aifParam` unconditionally. `connectionTypeToSource()` maps the connection type to `FeedSource` tag. The `mergerRef` (one `createPickMerger()` per mount) deduplicates pickIds across BroadcastChannel and localStorage poll paths; it's primed to also dedup against Sheets picks once that source is routed through here. Re-exports `NormalizedPickEvent` and `AuctioneerConnectionType` so `live/client.tsx` has a single import point. `use-draft-state.ts` and `use-draft-polling.ts` are untouched — Tyler's Sheets + manual entry path has zero behavior change.

**Changes:**
- `src/hooks/use-draft-feed.ts` (new): `useDraftFeed(format, connectionType, onNewPicks)` → `UseDraftFeedResult`; `toNormalizedEvent()`; `connectionTypeToSource()`; re-exports `NormalizedPickEvent`, `AuctioneerConnectionType`
- `src/app/(app)/draft/live/client.tsx`: import swapped (`useAuctioneerfeed`/`AuctioneerPick` → `useDraftFeed`/`NormalizedPickEvent`); `handleAuctioneerPicksRef` type updated; handler body `pick.player_name` → `pick.playerName`; `onAuctioneerpicks` callback type updated; hook call simplified to `useDraftFeed({format, connectionType, onNewPicks})`

**Architecture notes:**
- `use-draft-polling.ts` is NOT deleted — `use-draft-state.ts` still uses it for Sheets polling; the "generalize" step is additive (new hook) not a replacement yet
- Source priority (BroadcastChannel > localStorage > file) is enforced inside `useAuctioneerfeed`; `useDraftFeed` adds the normalization and cross-source dedup layer on top
- `mergerRef` persists for the hook's lifetime; `reset()` is available for future session-restart use cases

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files.

---

## 2026-04-16 — FF-281: auction-feed-merge.ts Cross-Source Pick Dedup Utility

**Task:** FF-281 — `src/lib/draft/auction-feed-merge.ts` (NEW) — dedup pick events across sources by `pickId`  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Picks now arrive from up to four paths (BroadcastChannel, localStorage poll, file poll, Sheets poll). Each path may deliver the same pick. A shared, testable dedup layer prevents double-add regardless of which path fires first. Sets up FF-282's multi-source `use-draft-feed.ts`.

**Approach:** Pure utility module — no React, no `'use client'`, SSR-safe. `createPickMerger()` factory owns a private `Set<string>` of seen pickIds and returns a `PickMerger` interface with three members: `merge(picks)` filters incoming batches to unseen IDs only (mutates internal set), `reset()` clears the set for session restart, and `seenCount` getter for observability. `playerNameToPickId(name)` synthesizes a `sheets:<name>` ID for Sheets picks that carry no Auctioneer pick ID — the `sheets:` prefix ensures these never collide with Auctioneer's `pick-N` IDs. `NormalizedPickEvent` is the canonical cross-source pick type: `pickId`, `playerName`, `manager`, `price`, `position?`, `source: FeedSource`. FF-282 will instantiate one merger per session in a `useRef` and route all source batches through it.

**Changes:**
- `src/lib/draft/auction-feed-merge.ts` (new): `FeedSource`, `NormalizedPickEvent`, `PickMerger`, `createPickMerger()`, `playerNameToPickId()`

**Architecture notes:**
- `createPickMerger()` stores its Set privately — callers cannot accidentally mutate it
- `playerNameToPickId` prefix (`sheets:`) guarantees no collision with Auctioneer IDs (`pick-1`, `pick-2`)
- The module has zero dependencies — safe to import from hooks, server components, or tests

**Verification:** `npm run lint` — zero errors in new file. `npm run type-check` — clean.

---

## 2026-04-16 — FF-280: Auctioneer BroadcastChannel Subscriber

**Task:** FF-280 — Subscribe to Auctioneer's `ffi-auction-feed` BroadcastChannel for instant pick sync  
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** FF-279 added 3-second localStorage polling, but picks were delayed up to 3s from when Auctioneer committed them. With both apps open in the same browser, a BroadcastChannel can deliver picks in sub-100ms with no polling overhead.

**Approach:** New `useEffect` in `useAuctioneerfeed` (between `processBatch` definition and the existing localStorage poll). Gates on `enabled && connectionType === 'localstorage'` — channel is meaningless for the file path and would silently receive nothing. SSR-safe (`typeof window === 'undefined'` guard). Opens `BroadcastChannel('ffi-auction-feed')`, sets `onmessage` handler: reads teamNameMap from `auctioneer-draft-v1` localStorage for teamId→name resolution, routes the single `_AAPick` through `processBatch` (same dedup ref as the poll). Sets `connected=true` + clears error on each message. Cleanup closes the channel. The 3-second poll below it continues running as catch-up for any messages missed during a brief disconnect. `seenPickIdsRef` ensures each pick ID is emitted to `onNewPicks` exactly once regardless of which path delivers it first. No changes to Auctioneer repo — `ffiBroadcastRef.postMessage(pick)` was already wired in `draft/page.tsx` as part of AA-INT1.

**Changes:**
- `src/hooks/use-auctioneer-feed.ts`: new BroadcastChannel subscriber `useEffect` before the localStorage poll effect; comment on the existing localStorage poll updated to "catch-up fallback"

**Architecture notes:**
- Channel subscriber scoped to `'localstorage'` only — file path users are on a different device where a same-origin BroadcastChannel would never receive messages
- Both paths call `processBatch` → `seenPickIdsRef` dedup → `onNewPicks` exactly once per pick ID
- Channel open/close is tied to effect lifecycle; no global channel instance needed

**Verification:** `npm run lint` — zero new errors in changed file. `npm run type-check` — clean. Auctioneer `npx tsc --noEmit` — clean.

---

## 2026-04-16 — FF-279: Auctioneer JSON Import with Hot-Reload

**Task:** FF-279 — FFI reads Auctioneer's JSON export at auction setup  
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** P1 milestone — Joe's ESPN auction draft uses the Auctioneer app to run the live auction; FFI had no way to receive picks from it. Each pick was re-entered manually, doubling work and creating sync lag.

**Approach:** `useAuctioneerfeed` hook with two polling paths at 3-second intervals. (1) localStorage: reads `auctioneer-ffi-feed-v1` (Auctioneer's append-only pick feed) + `auctioneer-draft-v1` (for teamId→name resolution) directly from `window.localStorage` — works when both apps run in the same browser tab on the same device. (2) File System Access API: polls a `FileSystemFileHandle` selected at setup time; supports all three Auctioneer JSON shapes (storage envelope, StoredDraft, raw Pick[]). Dedup across polls via `seenPickIdsRef` (Auctioneer pick IDs). At live-client boundary, picks are filtered against `draftedNames` before `addManualPick` to prevent double-recording on cold-start. `onNewPicks` is stabilized via `useCallback([])` + a handler ref so the 3-second interval never restarts mid-draft. File handle survives client-side navigation via module-level `_globalFileHandle` / `setGlobalFileHandle()`. Gated: hook is a no-op unless `enabled===true` (caller gates on `session.format === 'auction'`); Tyler's snake/Sleeper flow is completely unaffected.

**Changes:**
- `src/hooks/use-auctioneer-feed.ts` (new): `useAuctioneerfeed(enabled, connectionType, onNewPicks)` hook; `AuctioneerConnectionType`, `AuctioneerPick` types; `setGlobalFileHandle()` / `getGlobalFileHandle()` module-level API; `parseFileContent()` for multi-shape file support; `buildTeamNameMap()` + `normalizeAAPick()` helpers
- `src/app/(app)/draft/setup/client.tsx`: imports `setGlobalFileHandle`, `AuctioneerConnectionType`; `auctioneerConnectionType` + `auctioneerFileName` + `aifError` state; Auctioneer Sync card in Step 3 (only rendered when `isAuction`): "Same Device" toggle (localStorage) + "Export File" button (File System Access API with type filter); `?aif=` param appended to live page navigation URL
- `src/app/(app)/draft/live/client.tsx`: imports `useAuctioneerfeed`, `AuctioneerConnectionType`, `AuctioneerPick`; reads `?aif=` from searchParams; `handleAuctioneerPicksRef` declared early, updated post-`useDraftState`; `onAuctioneerpicks` via `useCallback([])` (stable); `useAuctioneerfeed` call with `aifEnabled` gate; `AA ✓N` / `AA …` badge in header when `aifEnabled`

**Architecture notes:**
- `onNewPicks` must be stable at call site — empty-dep `useCallback` + handler ref pattern avoids interval restarts
- `setError` never called synchronously in `useEffect` (react-compiler rule) — error state flows from failed poll attempts only
- Module-level `_globalFileHandle` is cleared by the user navigating back to setup and picking a new file; no explicit cleanup needed for one-session use

**Verification:** `npm run type-check` — clean. `npm run lint` — zero new errors in changed files. All pre-existing errors unchanged.

---

## 2026-04-16 — FF-311: Owner History System

**Task:** FF-311 — Owner history system for trash talk context injection  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `generateTrashTalk()` was calling `/api/trash-talk` with an empty `historyBlock`. The Nasties league has 10 years of roast ammo (Le'Veon Bell $73, CMC $82, Bowers $3, etc.) that Claude could use to sharpen lines — but nothing was surfacing it.

**Approach:** Ported `trash-talk-history.ts` from the auctioneer with two key adaptations: (1) `buildTeamOwnerMap` takes `string[]` manager names instead of `Array<{ id, name }>` — in FFI managers are plain strings in `state.manager_order`; (2) `buildHistoryBlock` uses `TrashTalkType` and extends the trigger map for FFI-specific types (`keeper_steal` → steal moments, `bad_keeper` → overpay/bust moments). History loaded from bundled JSON at runtime (no network call). `teamOwnerMapRef` built once when `state.manager_order` first populates; per-alert owner lookup + historyBlock construction happens inline in the fire-and-forget loop.

**Changes:**
- `src/data/history.json` (new): 10 Nasties owner profiles — aliases, championships, worst seasons, signature moments, roast ammo; copied from auctioneer
- `src/lib/draft/trash-talk-history.ts` (new): `loadHistory()`, `matchOwnerToHistory()`, `buildTeamOwnerMap(managers: string[], history)`, `buildHistoryBlock(trigger: TrashTalkType, owner)`, all types exported
- `src/app/(app)/draft/live/client.tsx`:
  - Imports `loadHistory`, `buildTeamOwnerMap`, `buildHistoryBlock`, `TeamOwnerMap`
  - `teamOwnerMapRef`: built once from `state.manager_order` via one-time `useEffect`
  - Per-pick effect: owner lookup + `buildHistoryBlock()` → `historyBlock` passed to `generateTrashTalk()`
  - Keeper effect: same pattern

**Verification:** `npm run type-check` — clean. `npm run lint` — no new errors.

---

## 2026-04-16 — FF-310: Claude Haiku Trash Talk Generation

**Task:** FF-310 — Replace hardcoded message arrays with Claude Haiku generation  
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** `analyzePickForTrashTalk()` returned alerts with hardcoded message strings from static arrays. FF-307 created the `/api/trash-talk` Claude Haiku endpoint but nothing called it from the live client.

**Approach:** Added `generateTrashTalk(alert, mode, historyBlock?)` to `src/lib/draft/trash-talk.ts` as a thin async wrapper that maps `TrashTalkAlert` fields to `TrashTalkRequest` and calls `/api/trash-talk`. In `live/client.tsx`, both trash talk `useEffect` hooks (per-pick and keeper one-time) now fire-and-forget this function after adding alerts to state. Alerts appear immediately with the hardcoded fallback message; when Haiku responds with a non-null line, the alert's `message` is updated in-place via a targeted `prev.map()`. Null response from API = hardcoded message kept, alert not dropped. All errors handled silently inside `generateTrashTalk()`. Draft UI never blocks.

**Changes:**
- `src/lib/draft/trash-talk.ts`: Added `export async function generateTrashTalk()` — maps `TrashTalkAlert` → `TrashTalkRequest` body, fetches `/api/trash-talk`, returns `line` or null; catch-all fail-silent
- `src/app/(app)/draft/live/client.tsx`:
  - Import updated to include `generateTrashTalk`
  - Per-pick `useEffect`: after `setTrashTalkAlerts([...prev, ...newAlerts])`, loops over `newAlerts` firing `void generateTrashTalk(alert, mode).then(line => { if (line) setTrashTalkAlerts(...map update) })`
  - Keeper `useEffect`: same fire-and-forget pattern applied to `keeperAlerts`

**Verification:** `npm run type-check` — clean. `npm run lint` — no new errors introduced (pre-existing errors in unrelated files).

---

## 2026-04-16 — FF-309 + Keeper/Sleeper Augmentation

**Task:** FF-309 + Tyler's Sleeper keeper league augmentation (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Snake/both-format triggers were missing (market_mismatch, late_roster_qb_panic). Keeper league QB-detection was broken — `state.keepers` not included in `allPicks`, so `lone_wolf_qb` and `late_roster_qb_panic` would false-fire for any team with a keeper QB. No keeper value trash talk existed. Tyler's league moved from Yahoo to Sleeper.

**Approach:** `market_mismatch` iterates `allPicks` at same position within 15 ADP spots and compares price spread (auction) or round difference (snake). `late_roster_qb_panic` mirrors `lone_wolf_qb` but snake-only at lower threshold (7 vs 9 picks). Keeper fix: live client now prepends `keepersToPicks(state.keepers)` to `allPicksWithKeepers` before passing to trigger engine — no signature change needed, `is_keeper: true` flag already guards out keeper picks from triggering on themselves. New `analyzeKeeperPicksForTrashTalk()` fires once at draft start via a second effect with a processed ref guard.

**Changes:**
- `src/lib/draft/trash-talk.ts`:
  - `TrashTalkType` union: added `market_mismatch | late_roster_qb_panic | keeper_steal | bad_keeper`
  - Import `KeeperAssignment` from `./keepers`
  - `detectMarketMismatch()`: position-matched ADP-comparable picks, ≥35% price spread (auction) or ≥3 round diff (snake); skips keeper picks via `comp.is_keeper` guard
  - `detectLateRosterQbPanic()`: snake-only, 7+ picks, no QB — fires before `lone_wolf_qb` kicks in at 9
  - `export analyzeKeeperPicksForTrashTalk()`: batch keeper value analysis, returns `keeper_steal` (surplus ≥3 rounds or ≥$10) / `bad_keeper` (surplus ≤-2 rounds or ≤-$10) alerts
  - `analyzePickForTrashTalk`: `market_mismatch` wired after `steal`; `late_roster_qb_panic` wired after `lone_wolf_qb` (snake-only gate)
- `src/components/draft/trash-talk.tsx`: extended `trashTalkConfig` with 4 new type entries
- `src/app/(app)/draft/live/client.tsx`:
  - Import `keepersToPicks`, `analyzeKeeperPicksForTrashTalk`
  - `keeperAlertsProcessedRef`: one-time guard for keeper analysis
  - Per-pick effect: builds `allPicksWithKeepers` from keepers + regular picks before passing to trigger engine
  - New one-time effect: calls `analyzeKeeperPicksForTrashTalk` on draft load, populates alert feed
- `src/components/prep/league-config-form.tsx`: Tyler's preset → `"Tyler's Sleeper League"`, `platform: 'sleeper'`; button label updated

---

## 2026-04-16 — FF-308: Auction Trigger Engine Upgrade

**Task:** FF-308 (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA

**Root Cause:** Trigger engine only had 4 rules (overpay, reach, imbalance, steal) using flat position-average fallbacks. No auction-specific budget/spending triggers.

**Approach:** Ported 6 triggers from AA reference spec. Added `impliedAuctionValue()` quadratic decay as the shared value baseline. Budget signals derived from `allPicks` + `DEFAULT_AUCTION_BUDGET` ($200) since budget config isn't passed through to the trigger layer. `first_defense_buy` required special pre-guard placement before the K/DEF skip. League-state triggers (`last_big_spender`, `budget_dominance`) fire regardless of who the current picker is.

**Changes:**
- `src/lib/draft/trash-talk.ts`:
  - `TrashTalkType` union: added `budget_buster | last_big_spender | cheapskate_special | budget_dominance | first_defense_buy | lone_wolf_qb`
  - `DEFAULT_AUCTION_BUDGET = 200`, `DEFAULT_ROSTER_SPOTS = 15`
  - `impliedAuctionValue(player, budget, teamCount)`: quadratic decay from ADP; uses `consensusAuctionValue` if set
  - `detectOverpay`: updated signature (budget, teamCount), uses `impliedAuctionValue`, guards `!player` to avoid false positives
  - `detectSteal`: updated signature (budget), uses `impliedAuctionValue`
  - Added: `detectBudgetBuster`, `detectLastBigSpender`, `detectCheapskateSpecial`, `detectBudgetDominance`, `detectFirstDefenseBuy`, `detectLoneWolfQb`
  - `analyzePickForTrashTalk`: `first_defense_buy` fires before K/DEF guard; `budget_buster` fires before self-pick gate; new priority order: `budget_buster > overpay > steal > last_big_spender > budget_dominance > lone_wolf_qb > cheapskate_special > first_defense_buy > reach > imbalance`
- `src/components/draft/trash-talk.tsx`: extended `trashTalkConfig` map with 6 new type entries

---

## 2026-04-16 — FF-307: Trash Talk API Route (Claude Haiku Generation)

**Task:** FF-307 (pipeline)
**Class:** `pipeline` | **Lenses:** Architecture, QA, Security

**Root Cause:** No server-side generation endpoint existed — trash talk messages were rule-based hardcoded strings with no AI variation.

**Approach:** Ported from AA reference (`fantasy_auction_auctioneer/src/app/api/trash-talk/route.ts`), using the project's existing `@anthropic-ai/sdk` pattern. Fail-silent throughout — trash talk is non-critical and must never surface errors to the draft UI.

**Changes:**
- `src/app/api/trash-talk/route.ts` (NEW):
  - `TrashTalkRequest` and `TrashTalkResponse` types exported (consumed by FF-310 client wrapper)
  - Family-Safe system prompt: PG-13, ≤80 chars, punches at situation not person
  - Adult-Only system prompt: Jeselnik/Ross/Hinchcliffe style, profanity required, ≤120 chars
  - `buildUserMessage()`: assembles trigger context, player/price/pick data, optional history block
  - Claude Haiku (`claude-haiku-4-5-20251001`), temperature 1.0, no streaming
  - Family-Safe max_tokens 60, Adult-Only max_tokens 80
  - Em-dash hard-strip: `raw.replace(/\u2014/g, '-').replace(/--/g, '-)` enforced post-response regardless of prompt compliance
  - Missing `ANTHROPIC_API_KEY` → `{ line: null }` (silent, not 500)
  - Any Claude SDK error → `{ line: null }` (silent)

---

## 2026-04-16 — FF-306: Trash Talk Mode Toggle at Session Setup

**Task:** FF-306 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** No way to configure trash talk intensity at session start — all users got the same rule-based alerts with no opt-out.

**Approach:** Session-scoped mode stored as `&ttm=` URL param (no DB migration needed — mode is fixed at session start, not persisted across sessions). Default: `family-safe`.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`:
  - Added `TrashTalkMode = 'off' | 'family-safe' | 'adult-only'` type
  - Added `trashTalkMode` state (default: `'family-safe'`)
  - Added 3-button selector card in Step 3 (Off 🔇 / Family-Safe 😄 / Adult-Only 🔥) using existing card-button pattern
  - Appended `&ttm=${trashTalkMode}` to `router.push` on session start
- `src/app/(app)/draft/live/client.tsx`:
  - Added `TrashTalkMode` type alias
  - Reads `ttm` from `useSearchParams()` (default: `'family-safe'`)
  - Trash talk `useEffect` returns early when mode is `'off'`; `trashTalkMode` added to dep array

---

## 2026-04-16 — FF-305: Wire Live Trash Talk Alerts into Live Draft Client

**Task:** FF-305 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** `analyzePickForTrashTalk()` and the `LiveTrashTalkAlert`/`TrashTalkFeed` components existed but were never called from any live draft page. Alerts never fired during a draft session.

**Approach:** Detect new picks via a `useEffect` watching `state` (which gets a new reference on every pick confirmation, whether from manual entry or sheet polling). A `processedPickCountRef` skips historical picks loaded on session start, then tracks the last analyzed index so only incremental picks get evaluated.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`:
  - Added `useRef` to imports
  - Added imports: `TrashTalkFeed`, `SavedTrashTalk`, `analyzePickForTrashTalk`, `TrashTalkAlert`
  - Added `trashTalkAlerts` and `savedAlerts` useState arrays
  - Added `processedPickCountRef` (null until first state load)
  - Added `useEffect(deps: [state, players])` — on first load sets ref to skip existing picks; on subsequent state changes, slices new picks, calls `analyzePickForTrashTalk()` for each, pushes non-null results
  - Added `handleDismissTrashTalk`, `handleSaveTrashTalk`, `handleRemoveSavedAlert` callbacks
  - Renders `<TrashTalkFeed>` below `<PickFeed>` in left column
  - Renders `<SavedTrashTalk>` conditionally when saved alerts exist

---

## 2026-04-14 (session 8) — FF-276 / FF-277 / FF-278: Pre-Draft Tools

### FF-278: Consensus Shift Alerts

**Task:** FF-278 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** No visual signal existed to flag players whose ADP was being called differently across sources (ESPN vs. Sleeper vs. FantasyPros). A player with a wide ADP range across sources is either a breakout candidate or a volatile pick — either way worth flagging before draft day.

**Approach:** Cross-source divergence proxy (max ADP − min ADP across sourceData). Real historical ADP movement data is not stored, so this is honest about what the data supports.

**Changes:**
- `src/app/(app)/prep/board/client.tsx`: Stores raw `adp: Record<string, number>` from API response before `cacheToPlayers` conversion (conversion loses per-source data). Computes `adpDivergenceMap` (playerId → divergence). Renders "ADP Movers" chip strip above tabs when any player has divergence > 10 (top 6 shown, sorted descending by divergence).
- `src/components/draft/ffi-player-card.tsx`: Added `adpDivergence?: number` prop. Shows orange `↕N` indicator next to ADP in the value column when divergence > 10.
- `src/components/draft/player-pool.tsx`: Added `getAdpDivergence()` helper that inspects the raw `Record<string, number>` adp field on live draft players (typed as `number` but runtime is object from raw API). Passes computed divergence to each `FFIPlayerCard`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

### FF-277: Injury Watch Panel

**Task:** FF-277 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** During a live draft, injury news can break at any moment. There was no panel surfacing which undrafted players had active injury flags — forcing the user to mentally track status from memory or context-switch to a separate source.

**Changes:**
- `src/components/draft/injury-watch.tsx` (NEW): `InjuryWatch` component accepts `players[]` and `draftedNames`. Filters undrafted players with flagged status. Handles both `Player.injuryStatus` (camelCase, set by cacheToPlayer) and raw `injury_status` (snake_case, present on live draft's raw API data). Color-coded status badges: OUT/IR/PUP = red, DOUBTFUL = orange, QUESTIONABLE = amber, SUSPENDED = red/dim. Truncated to top 8. Auto-hides when no flagged players.
- `src/app/(app)/draft/live/client.tsx`: Added `InjuryWatch` import and rendered in right column between `PositionScarcityTracker` and `PlayerPool`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

### FF-276: Dry Run Simulation

**Task:** FF-276 (output)
**Class:** `output` | **Lenses:** Delivery, QA

**Root Cause:** No way to stress-test a draft strategy before draft day. Entering the live draft without knowing how the strategy performs against field competition leaves unanswered questions: "Would I end up with good RBs? Could I get shut out at a position?"

**Changes:**
- `src/app/(app)/prep/simulate/page.tsx` (NEW): Server component wrapper at `/prep/simulate`.
- `src/app/(app)/prep/simulate/client.tsx` (NEW): Full simulation client. Fetches `/api/players` and `/api/strategies`. Runs client-side simulation: for snake, user picks by `scorePlayersWithStrategy` combinedScore, others pick by ADP. For auction, round-robin with budget constraints, same pick logic. Outputs: simulated roster (player / position / round or price), per-position grades (A/B/C/F based on tier-1 starter coverage), overall verdict (Strong = 5+ top-50 players, Average = 3-4, Weak < 3), and shutout position alerts.
- `src/app/(app)/prep/page.tsx`: Added "Dry Run" HubCard linking to `/prep/simulate`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean (54 pages, `/prep/simulate` included)

---

All notable changes tracked here with root cause analysis.

---

## 2026-04-14 (session 7, cont.) — FF-272: Strategy Drift Alert

**Task:** FF-272 (shared)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** When all of a strategy's player targets get drafted by other managers, the AI silently shifts to best-available mode with no notification. The user has no idea the plan has changed — they think the AI is still targeting specific players when it isn't.

**Changes:**
- `src/lib/draft/flow-monitor.ts`: Added `StrategyDrift` type and `detectStrategyDrift(strategyTargets, draftedNames, myPickedNames)`. Classifies each strategy target as gone (drafted by others) or remaining (still on board). Targets the user themselves drafted are excluded. `active = true` when `goneTargets.length > 0 && remainingTargets.length === 0`. Also imports `StrategyPlayerTarget` from database types.
- `src/app/(app)/draft/live/client.tsx`: `myPickedNames` useMemo (user's own picks by `state.manager_order[0]`); `driftAlert` useMemo (fires after pick 3, null when dismissed); `handleDismissDrift` callback (`driftDismissed` state); `driftAlert` + `onDismissDrift` passed to `DraftFlowAlerts`.
- `src/components/draft/draft-flow-alerts.tsx`: Renders orange "Strategy drift" banner with struck-through target name badges and "Got it" dismiss button between the pivot suggestion and flow alerts. Early return guard updated to include `driftAlert`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-271: Data Source Attribution

**Task:** FF-271 (shared)
**Class:** `shared` | **Lenses:** QA

**Root Cause:** Recommendations showed reasoning but gave no indication of which data sources contributed. Users had no way to judge whether a recommendation was backed by 1 source or 4.

**Changes:**
- `src/lib/draft/explain.ts`: Added `sources: string[]` to `Explanation` type. In `explainPlayer()`, collects unique display names from `player.sourceData` (espn→ESPN, yahoo→Yahoo, sleeper→Sleeper, fantasypros→FantasyPros) plus `AI Analysis` when `player.analysis` exists.
- `src/components/draft/ffi-ai-insight.tsx`: Renders a muted pill row above the Key Factors block showing "Sources: ESPN · FantasyPros · AI Analysis" (or whatever applies). Empty if no sources.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-270: Confidence Indicators — Thin Data Flag

**Task:** FF-270 (shared)
**Class:** `shared` | **Lenses:** QA

**Root Cause:** `explainPlayer()` calculated confidence purely from factor consistency (positive vs. negative counts). A player with 1 data source and no ADP could still receive "medium" or "high" confidence, misleading the user on draft day.

**Changes:**
- `src/lib/draft/explain.ts`: Added `dataWarning?: string` to `Explanation` type. Added `assessDataCoverage(player)` helper — returns a warning string when `sourceData.length < 2` or when both `adp` and `consensusRank` are 0. In `explainPlayer()`, if triggered: appends a `Thin Data` sentinel factor (weight 0, neutral) and forces `confidence = 'low'`. Returns `dataWarning` on the `Explanation` object.
- `src/components/draft/ffi-ai-insight.tsx`: When `dataWarning` is set, renders an amber "Low confidence — [reason]" banner above the insight text. Confidence bar color shifts: amber for thin data, red for conflicting signals, green otherwise. `Thin Data` sentinel filtered out of Key Factors chips and insight text construction.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-243: Confirm/Dismiss System Tag Actions

**Task:** FF-243 (shared + pipeline)
**Class:** `shared` | **Lenses:** Architecture, QA

**Root Cause:** System tags (BREAKOUT/VALUE/SLEEPER/BUST/AVOID) generated by AI analysis could not be dismissed by users. A dismissed tag still contributed to scoring and still cluttered the UI even when the user disagreed with the AI's assessment. The build plan note "UI ready — needs API only" was inaccurate; the card had no dismiss controls at all.

**Changes:**
- `src/app/api/user-tags/route.ts`: Extended PATCH handler to accept `action: 'dismissSystemTag' | 'undismissSystemTag'` with `tag` field. Atomically adds/removes the tag from `dismissed_system_tags` (JSONB array) in `user_tags` table. Creates the row with `tags: []` on first dismissal if none exists.
- `src/hooks/use-user-tags.ts`: Added `useSystemTagActions(leagueId?)` hook exposing `dismissSystemTag(playerCacheId, tag)` and `undismissSystemTag(playerCacheId, tag)` (same PATCH pattern as `useToggleTag`).
- `src/components/prep/ffi-player-intel-card.tsx`: Added `dismissedSystemTags`, `onDismissSystemTag`, `onUndismissSystemTag` props. Dismissed tags render grayed-out (opacity-40, muted badge) with a "restore" text link. Active tags show a hover-visible × dismiss button. `primaryBadge` useMemo skips dismissed tags in compact view.
- `src/app/(app)/prep/players/client.tsx`: Imports and calls `useSystemTagActions`; adds `handleDismissSystemTag`/`handleUndismissSystemTag` callbacks; passes `dismissedSystemTags` and handlers to `FFIPlayerIntelCard`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-273: Keeper Equity Panel

**Task:** FF-273 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Keeper leagues need a way to evaluate whether each keeper is a good deal vs. current market. No equity visibility means Tyler is flying blind when deciding which players to keep and at what round cost.

**Changes:**
- `src/app/(app)/prep/keepers/client.tsx`: Added "Keeper Equity" card below the declared keepers list. Lazy-loads `/api/players` only when keepers exist. Uses existing `analyzeKeeperValues()` from `lib/draft/keepers.ts` to compute `surplus = round cost − ADP round` (snake) or `market − cost` (auction). Rows sorted descending by surplus (best deals first). Each row shows position, player name, round cost, ADP round, and a color-coded surplus badge (green = bargain, red = overpay, muted = no market data). Legend line explains the sign convention. Auction vs. snake display adapts to league format.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7, cont.) — FF-268: Mobile-First Primary Action Audit

**Task:** FF-268 (output/UX)
**Class:** `output` | **Lenses:** QA, Delivery, Design

**Root Cause:** Setup wizard CTAs were at the bottom of free-scrolling containers, so on Step 3 with 10+ managers the "Start Draft" button was buried below the fold. Back buttons were text-only links with no touch target sizing. The ManualPickEntry clear (×) button had no height/width, making it a ~20px tap target.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`: All 4 steps now return a Fragment with scrollable content (`pb-24`) + fixed bottom CTA bar (`fixed inset-x-0 bottom-0 z-30 ffi-glass-heavy`), matching the live draft bar pattern. Error display for steps 3/4 moved into the fixed bar so it's always visible. Back buttons in steps 2/3/4 now have `min-h-[44px] flex items-center px-1`.
- `src/components/draft/manual-pick-entry.tsx`: Clear nomination button in bar variant changed from `text-lg leading-none` to `w-11 h-11 flex items-center justify-center` — 44px tap target.
- `src/app/(app)/draft/review/client.tsx`: View mode tab buttons (`My Draft / All Teams / Trash Talk`) bumped from `py-2.5` (~36px) to `min-h-[44px]`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 7) — FF-275: Yahoo Keeper Assignment Import

**Task:** FF-275 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Tyler's keeper league (Yahoo snake) requires entering keepers manually one-by-one. Yahoo's keeper confirmation page can be copy-pasted but there was no import path, making setup tedious for 3+ keepers.

**Changes:**
- `src/app/(app)/prep/keepers/client.tsx`: Added "Import from Yahoo" collapsible section (collapsed by default) above the manual keeper list, visible only for snake leagues. Section contains a textarea for paste input, a "Parse & Import" button, and inline feedback (e.g. "3 keepers imported, 1 line skipped"). Added pure `parseYahooKeeperText()` function handling two Yahoo copy-paste formats: colon-style (`Round 3: Justin Jefferson (WR) - Tyler`) and tabular (`Justin Jefferson  WR  Round 3  Tyler`). Position normalization: DEF/D/ST → DST. Invalid lines are skipped with a count shown. Parsed entries are appended (not replaced), deduplicated by player_name case-insensitively. Added `normalizePosition()` helper.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6, cont.) — FF-267: Format Gate as First Live Draft Screen

**Task:** FF-267 (new feature / UX)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** The draft format (auction vs snake) was inherited silently from the league config with no explicit confirmation step. A user with a misconfigured league or who just forgot which format was set could enter the wrong mode without any friction.

**Changes:**
- `src/app/(app)/draft/setup/client.tsx`: Inserted new Step 1 (Format Gate) as the literal first screen of live draft setup. Shows a large, visually distinct confirmation card — green + "AUCTION DRAFT" or blue + "SNAKE DRAFT" — with league name, team count, and budget/format details. Requires explicit "Confirm — Start [Auction/Snake] Draft →" click to proceed. Includes "Wrong format? Update your league config" escape link. If multiple leagues exist, the league dropdown is on this screen. Renumbered old steps 1→2 (input method), 2→3 (session details), 3→4 (keepers); all internal step transitions updated. League dropdown removed from Step 3 (now handled in Step 1).

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6, cont.) — FF-266: Split recommend.ts into auction/snake variants

**Task:** FF-266 (refactor + feature)
**Class:** `pipeline` + `shared` | **Lenses:** Architecture, QA

**Root Cause:** `recommend.ts` handled both auction and snake with a single `fetchRecommendation` function that mixed auction-specific fields (`budgetRemaining`, `consensusAuctionValue`, `maxBid`) into a shared type. The API route prompt branched on `isAuction` inline, producing a diluted prompt for each format. Snake responses returned `maxBid: number` which has no meaning in a snake draft.

**Changes:**
- `src/lib/draft/recommend-auction.ts` (NEW): `LLMAuctionTarget` (has `maxBid`), `LLMAuctionRecommendation`, `fetchAuctionRecommendation`, `clearAuctionRecommendationCache`. Payload uses `consensusValue`/`adjustedValue` (auction values). Cache key prefixed `auction:`.
- `src/lib/draft/recommend-snake.ts` (NEW): `LLMSnakeTarget` (has `pickRound` instead of `maxBid`), `LLMSnakeRecommendation`, `fetchSnakeRecommendation`, `clearSnakeRecommendationCache`. Payload uses `adp`/`consensusRank`/`adjustedRound`. Recent picks include `round`, not `price`. Cache key prefixed `snake:`.
- `src/lib/draft/recommend.ts` (BARREL): Re-exports both modules. `clearRecommendationCache()` clears both caches — `client.tsx` import unchanged.
- `src/app/api/draft/recommend/route.ts`: Replaced single mixed prompt with `buildAuctionPrompts()` (budget-focused, `maxBid` in response) and `buildSnakePrompts()` (ADP/round-focused, `pickRound` in response). Dispatches on `format`. No format bleed.
- `src/components/draft/auction-advisor.tsx`: Imports `fetchAuctionRecommendation + LLMAuctionRecommendation`.
- `src/components/draft/snake-advisor.tsx`: Imports `fetchSnakeRecommendation + LLMSnakeRecommendation`. Target rendering updated to show `Rd {t.pickRound}` instead of `$maxBid`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6, cont.) — FF-264: Per-Player Max Comfortable Bid Display

**Task:** FF-264 (new feature)
**Class:** `output` | **Lenses:** QA, Delivery

**Root Cause:** Auction managers had no quick way to see whether their current budget allowed them to bid competitively on a given player. The consensus value is visible, but without knowing their max comfortable bid alongside it, they had to mentally cross-reference the Budget Health Panel to make an on-the-spot decision.

**Changes:**
- `src/components/draft/ffi-player-card.tsx`: Added `maxBid?: number | null` to `FFIPlayerCardProps`. Computed `maxBidDelta = maxBid - player.consensusAuctionValue`. In the value display column, when `isAuction && maxBid != null`, renders "MAX $X" (`text-sm font-bold`) and a colored delta line (`text-[9px]`): green (+$X OVER) when max > consensus by >$2, orange (−$X UNDER) when max < consensus by >$2, muted (AT VALUE) within ±$2. Only shown in auction mode — snake cards unchanged.
- `src/components/draft/player-pool.tsx`: Added `maxBid?: number | null` to `PlayerPoolProps`, threaded through to each `FFIPlayerCard`.
- `src/app/(app)/draft/live/client.tsx`: Added `maxBid={myMaxBid}` to `PlayerPool` call. `myMaxBid` was already computed via `getMaxBidFor(myManager)`.

**Verification:**
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 passed
- ✅ `npm run build` — clean

---

## 2026-04-14 (session 6) — FF-263: Budget Health Panel + FF-265: Auction/Snake Bleed Audit

**Tasks:** FF-263 (new feature) + FF-265 (audit + fix)
**Class:** `output` + `shared` | **Lenses:** QA, Delivery, Architecture

**FF-263 — Budget Health Panel:**

**Root Cause:** Managers drafting in auction had no single at-a-glance view of how their budget was tracking — the existing FF-043 pacing block shows percentages and projections but not raw dollar numbers or slot counts, making it hard to mentally compute "what can I actually bid right now?"

**Changes:**
- `src/components/draft/auction-advisor.tsx`: Added FF-263 derived values (`totalSlots`, `filledSlots`, `remainingSlots`, `healthSpent`, `healthSafeRemaining`, `healthImpliedPerSlot`, `healthDelta`, `healthBurnStatus`) in component body. Added compact "Budget Health Panel" section above the FF-043 block: row 1 = `Spent $X · $Y left` + `N/M slots` (font-mono, tabular-nums); row 2 = `~$Z/slot remaining` + burn rate indicator (`+$X vs avg` green, `−$X vs avg` orange, `≈ avg` muted). Implied $/slot uses getMaxBid reserve logic ($1 per remaining empty slot). Row 2 hidden when no slots remain.

**FF-265 — Auction vs. Snake Bleed Audit:**

**Root Cause:** 12 draft components needed auditing to ensure no cross-mode concept bleed (round/pick-order in auction UI, prices/budgets in snake UI).

**Findings:** 11 files clean. One real bleed:
- `position-scarcity.tsx` has `showSpendRanges = true` default. `calculateScarcityExtended()` in `explain.ts` always populates `spendRange`/`avgValue` from player auction values, regardless of draft format. The call site in `client.tsx` passed no `showSpendRanges` prop → dollar spend ranges appeared in snake mode.

**Changes:**
- `src/app/(app)/draft/live/client.tsx`: Added `showSpendRanges={state.format === 'auction'}` to `PositionScarcityTracker` call.

**Verification:**
- ✅ `npm run lint` — no new errors in changed files (23 pre-existing errors unchanged)
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — `✓ Compiled successfully in 3.7s`, 53 pages

---

## 2026-04-14 (session 5) — FF-262: Position Budget Tracker + FF-261 Audit

**Tasks:** FF-261 (audit, no code changes) + FF-262 (new feature)
**Class:** `shared` + `output` | **Lenses:** Architecture, QA, Delivery

**FF-261 — ESPN Auction Math Audit (no code changes):**
Math confirmed correct — see previous CHANGELOG entry below.

**FF-262 — Position Budget Tracker:**

**Root Cause:** During a live auction, managers have no live view of per-position spending vs. their pre-draft allocation plan. Without this, it's easy to overspend on RBs and arrive at TE/WR needing $30 of value with $8 left.

**Changes:**
- `src/lib/draft/auction-advisor.ts`: Added `PositionBudgetRow` interface + `getPositionBudgetBreakdown()` — iterates QB/RB/WR/TE/K/DST, computes `planned = (alloc% / 100) * budget_total` and `spent` from picks, returns `delta = planned - spent`; DST row matches both 'DST' and 'DEF' pick positions; filters to rows with spent > 0 or planned > 0
- `src/components/draft/auction-advisor.tsx`: Added "By Position" section inside `AuctionAdvisor` between budget-pace block and urgency warnings; shows position badge + mini progress bar + `$spent/$planned` text + colored delta (`+$X` green / `-$X` orange); section hidden when no picks + no plan; `league-overview.tsx` comment added to clear stale Turbopack cache (pre-existing stale error, not introduced here)

**Verification:**
- ✅ `npm run lint` — no new errors in changed files
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — `✓ Compiled successfully in 3.4s`, 53 pages

**Reverse rationale (unchanged):**
- Existing `analyzeBudgetStrategy()` / `getPositionUrgencyWarnings()` — untouched
- `AuctionAdvisorProps` interface — no new props needed (strategy already passed)
- All API routes and DB schema — untouched

---

## 2026-04-14 (session 5 — audit only) — FF-261: ESPN Auction Math Audit

**Task:** Audit `src/lib/draft/auction-advisor.ts` for ESPN $200/15-slot model accuracy
**Class:** `bugfix` (audit — no code changed) | **Lens:** QA

**Findings:** Math is correct. No changes needed.

**Formula verified:**
- `calculateMaxBidAdvice()` lines 44–46: `emptySlots = totalSlots - picks.length - 1`; `absoluteMax = budget_remaining - emptySlots`
- Trace (5 slots filled, $80 remaining, 10 slots left): `emptySlots = 15 - 5 - 1 = 9`; `absoluteMax = 80 - 9 = 71` ✓
- Matches ESPN rule exactly: max bid = budget_remaining - (unfilled_slots - 1)
- `-1` correctly accounts for the player currently on the nomination block (fills one slot, needs no reserve)
- `getMaxBid()` in `state.ts:247` uses identical formula; consistent across both implementations
- No hardcoded slot counts — `totalSlots` always computed dynamically from `state.roster_slots`
- `mgr.budget_total ?? 200` fallback at line 121 is display-only (position budget advisory factor), not the safety constraint — non-$200 leagues unaffected

**Changes:** None (audit only)
- `BUILD_PLAN.md`: FF-261 marked [x] with confirmed-correct note

---

## 2026-04-14 (session 4) — P0 Redesign Sprint (FF-257 revision, FF-258, FF-259, FF-274)

**Task:** Implement all 4 P0 redesign decisions (Verdict B from FF-254 UI eval) + /prep/keepers page
**Class:** `output` + `shared` | **Lenses:** Architecture, QA, Delivery, Design
**Plan:** `docs/superpowers/plans/2026-04-14-p0-redesign.md` | **Spec:** `docs/superpowers/specs/2026-04-14-p0-redesign-design.md`

**Root Cause:** UI eval returned 3 hard FAILs (criteria a/b/e) and 3 partials (c/d/f). This sprint fixes a/b/c/e before P0 sub-tier 1–7 implementation begins.

**Changes:**

**FF-257 revision — Always-open On Block bar + BID button:**
- `manual-pick-entry.tsx`: bar variant rewritten — no collapse/expand; On Block slot replaces search input; price pre-fills from `consensusAuctionValue`; isBarValid gated on onBlockPlayer + manager + price; Undo always visible (disabled when no picks); auction manager defaults to `myManager`
- `ffi-player-card.tsx`: optional `onBid` prop + BID pill button (stopPropagation); 44px touch target
- `player-pool.tsx`: `onBidPlayer` prop threaded to each card; `useCallback` for stable identity
- `live/client.tsx`: `onBlockPlayer` state; `handleBidPlayer` wrapped in `useCallback`

**FF-259 — 4-state ConnectionStatusPill:**
- Created `connection-status-pill.tsx`: LIVE (green, pulsing dot) / STALE (amber) / OFFLINE (red, tap to expand error bar) / MANUAL (gray); 1s tick for elapsed timestamp; error bar auto-hides when state leaves OFFLINE
- `live/client.tsx`: replaced binary Wifi icon pill; always visible regardless of `session.sheet_url`; removed duplicate sheetError banner card

**FF-274 — Keeper visual markers:**
- `lib/draft/keepers.ts`: extracted `isKeeperPick()` + `displayPickNum()` as shared exports
- `live/client.tsx` (PickFeed): K1/K2/K3 numbers, 🔒 after position badge, muted name, no price; composite `manager-picknum` key prevents React key collisions
- `league-overview.tsx`: same keeper markers in expanded pick rows; 🔒 right-aligned replacing price/round

**/prep/keepers — New keeper declaration page:**
- Created `src/app/(app)/prep/keepers/` (page.tsx + client.tsx + loading.tsx)
- `KeeperDeclarationClient`: CRUD for keepers; auto-saves to `localStorage` (key: `ffi_keepers_{leagueId}`); `initialized` ref prevents spurious "Saved" flash on load; only shows keeper-enabled leagues
- `prep/page.tsx`: hub link added via `HubCard` component

**FF-258 — Multi-step draft setup flow:**
- `draft/setup/client.tsx`: 3-step flow — mode selector → league confirm + managers → keeper review
- Step 1: mode cards gate all else; Continue disabled until selection
- Step 2: read-only league confirmation card; Sheets URL shown for sheets mode only; keeper entry block removed
- Step 3: reads declared keepers from localStorage; K1/K2/K3 display with 🔒 and muted names; `handleSubmit(keepersOverride)` avoids React batching issue

**Verification:**
- ✅ `npm run lint` — no new errors in changed files
- ✅ `npm run type-check` — clean
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run build` — 52 pages compiled

**Reverse rationale (unchanged):**
- All existing API contracts — untouched
- DB schema — no new tables or columns
- `applyKeepersToState()` logic — untouched
- DESIGN_SYSTEM.md Tactical Hologram tokens — untouched
- 27 research pipeline tests — all passing

---

## 2026-04-14 (session 3)

### [FEAT] FF-257 — Sticky pinned ManualPickEntry bar
**Task:** P0 sub-tier 1 first item — promote `ManualPickEntry` to always-visible pinned quick-entry bar at viewport bottom
**Class:** `output` + `shared` | **Lenses:** Architecture, QA, Delivery, Design

**Root Cause:** UI eval (FF-254) verdict-B FAIL on criterion (a). Live draft scrolling — user spots a player in the pool, scrolls down to find them, then has to scroll all the way back to the top to record the pick. Under auction time pressure this is a real failure mode.

**Changes:**
- `src/components/draft/manual-pick-entry.tsx`: Add `variant?: 'card' | 'bar'` prop. `bar` = chrome-less horizontal layout for sticky parent. Adds collapse/expand state, defaults collapsed on mobile (search + price + Record visible) and expanded on desktop (also shows Manager + Undo). Backward compatible: `card` is default. Search results dropdown opens UPWARD (`bottom-full`) so it's visible above the bar. 44px touch targets per FF-269 Tactical Hologram standard.
- `src/app/(app)/draft/live/client.tsx`: Removed `<ManualPickEntry>` from left column. Renders as `position: fixed inset-x-0 bottom-0 z-40` with `ffi-glass-heavy` background + `env(safe-area-inset-bottom)` padding (matches locked HTML prototype `UI/auction_live_draft/code.html:426–462`). Page wrapper now uses `pb-32` to clear bar. Conditional on `state.status !== 'completed'` (no entry needed post-draft).

**Verification:**
- ✅ `npm run lint` — both changed files clean (23 pre-existing errors in unrelated files unchanged)
- ✅ `npm run test:run` — 27/27 pass
- ✅ `npm run type-check` — clean
- ✅ `npm run build` — `✓ Compiled successfully in 3.5s`

**Reverse rationale (what's NOT changed):**
- Submit logic (`handleSubmit`, `onSubmit` prop contract) — preserved
- Player search filtering (`useMemo` for filtered/available) — preserved
- DESIGN_SYSTEM.md tokens — untouched
- Database schema, API routes — untouched

---

## 2026-04-14 (session 2)

### [DOCS] FF-253/254 — UI evaluation gate complete
**Task:** Audit all live-draft screens against 6 criteria; produce `UI_EVAL_2026.md`
**Scope:** Read-only audit + `.claude/UI_EVAL_2026.md` (new file) + BUILD_PLAN.md checkpoint marks

**Root Cause:** P0 sub-tier 0 requires a UI verdict before any code work begins, to scope whether a full redesign or targeted fixes are needed.

**Findings:**
- 3 hard FAILs: (a) ManualPickEntry not pinned, (b) no mode selector at setup, (e) no keeper visual distinction
- 3 partial FAILs: (c) connection status binary/tiny/conditional, (d) confidence badges exist but no source attribution, (f) design system inconsistency (setup screen and 3 left-column components still use raw shadcn)

**Verdict: B — Targeted redesign.** Scope is contained:
- `DraftSetupClient` → add mode selector + FFI styling
- `ManualPickEntry` → promote to sticky pinned bottom bar
- `LeagueOverview` + `PickFeed` → keeper visual markers
- Connection status → 3-state indicator with size fix
All fixes are already scheduled as FF-257–259, FF-274. FF-255/256 (full redesign sprint) NOT triggered.

**Changes:**
- `.claude/UI_EVAL_2026.md`: NEW — full per-screen audit with evidence
- `.claude/BUILD_PLAN.md`: FF-253/254 marked [x]; dashboard nextItems updated; FF-255/256 marked as skipped

---

## 2026-04-14

### [CHORE] Enterprise dev system upgrade
**Task:** Upgrade `.claude/` to Enterprise tier per overhaul plan
**Scope:** `.claude/` directory only — no `src/` code touched

**Root Cause:** FFI's ad-hoc dev docs were missing navigation indexes, audit trail, review lenses, hooks, and skills that dev-workflow-builder generates at Enterprise tier. BUILD_PLAN.md also treated commercialization as near-term when personal season hardening is the actual P0.

**Changes:**
- `.claude/FEATURES_INDEX.md`: NEW — feature-to-code mapping with tags
- `.claude/CODE_AREAS.md`: NEW — API endpoints, hooks, and key functions index with line numbers
- `.claude/CHANGELOG.md`: NEW — this file
- `.claude/REVIEW_LENSES.md`: NEW — 6 Review Lenses with pre-check + verify checklists
- `.claude/hooks/pre-commit-gate.ps1`: NEW — lint hard gate + test advisory before commits
- `.claude/skills/code-review/SKILL.md`: NEW — /code-review adversarial review skill
- `.claude/settings.json`: NEW — enterprise hook registration (180s timeout)
- `.github/workflows/ci.yml`: NEW — TypeScript CI (lint + type-check + test on push to master)
- `.claude/CLAUDE.md`: MERGED — appended PROPOSE/PATCH/VERIFY workflow, Change Classification (8 types), 6 Review Lenses triggers, Bug Hunt Schedule, Evidence-Based Output Standard, Codebase Navigation Index, Definition of Done
- `.claude/BUILD_PLAN.md`: REWRITTEN — P0-P7 structure: personal season hardening as P0, Auctioneer integration as P1, pre-season validation as P2, commercialization deferred to P3+ (CONDITIONAL with explicit gates)
- `.claude/WORKING_STATE.md`: UPDATED — enterprise sections added (Last 48h, What Works/Broken, Blockers, Sheets setup, Commands reference)

**Testing:**
- Verified git diff shows no src/ changes
- CLAUDE.md search confirmed: PROPOSE, PATCH, VERIFY, Review Lens, Bug Hunt present
- BUILD_PLAN.md confirmed: P0→P7 structure, Gate: lines on P3-P7

**Result:** ✅ Enterprise tier active
**Commit:** [see git log]

---

## R4 — Team-construction SOLVER (2026-08-12) `[FEATURE]`

**Session:** R4 [Opus] · class: pipeline · closes: RV-1 (library half)

**Problem:** The app had no team-construction engine. Max-bid was capped by the wallet (`absoluteMax = budget_remaining - emptySlots`), not by roster completion. Joe could be advised to overbid a single player and then have no budget to finish the team. The North Star ("build the best full 15-man roster for $200") was structurally unreachable.

**Root cause:** `auction-advisor.ts` never modeled "what does the best possible rest-of-roster cost?" — it only ensured each remaining slot had at least $1. Roster completion as a constraint did not exist in any code path.

**What changed:**

- `src/lib/draft/roster-solver.ts` — NEW. Pure module, no React, no Supabase, no I/O. 320 lines.
  - `solveAllocation(input: SolverInput): SolverResult` — greedy best-fill: dedicated starters in scarcity order (QB→TE→RB→WR→DST by ceiling DESC), then FLEX from the combined RB/WR/TE pool (ceiling DESC, post-Phase-1 exclusion), then bench at $1 replacement cost. Returns `{ feasible, completionCost, assignments }`.
  - `computeRosterConstrainedMaxBid(nominatedPlayer, input): RosterConstrainedMaxBid` — removes nominated player from pool, decrements their slot, runs `solveAllocation`, returns `maxBid = budget - completionCost` (floored at $1) with explanation ("Need QB + 2×FLEX + 4×BENCH (~$47) → max $53").
  - Key invariant (guaranteed by design): `maxBid + completionCost <= budgetRemaining` when feasible.

- `src/lib/draft/__tests__/roster-solver.test.ts` — NEW. 504 lines, 47 test cases.
  - Covers: full Nasties 13-slot fill, FLEX pool excludes QB/DEF, board dry at position (replacement fallback), empty board, feasibility flag, no-slots-remaining, dedicated fill, FLEX fill, bench fill, last slot, forced $1 scrubs, empty board, infeasible state, maxBid+completionCost invariant (4 parametric), maxBid≥$1 invariant, nominated player exclusion, dedicated-before-FLEX contention.

**Key design decisions:**

- Greedy over bounded knapsack: O(slots × pool), microsecond runtime, explainable to a user. For 13 slots + ~100 RBs + 3 FLEX slots this is 300 comparisons. Escalate to knapsack only if tests reveal systematic misallocation (none found).
- DEDICATED_ORDER = `['qb', 'te', 'rb', 'wr', 'dst']` (QB/TE first = scarcest pools, filled before the FLEX pool is assembled).
- FLEX eligibility: `Set(['RB', 'WR', 'TE'])` — QB and DEF cannot go to FLEX.
- Bench slots always use replacement cost ($1); bench filler quality is irrelevant to draft strategy.
- `dst` key (not `def`) for defense — matches DB schema `RosterSlots.dst`.

**Bug hunt:** 0 CRITICAL, 0 HIGH, 1 MEDIUM (BUG-007: `resolvePlayerSlot` silent slot-no-op when bench=0 and player has no valid slot — fix before R5 wiring), 3 LOW (feasibility pre-rounding edge, explanation field untested, te2 comment wrong). See `.claude/BUG_LOG.md`.

**Verify table:**

| Check | Result |
|-------|--------|
| `npm run type-check` | ✅ 0 errors |
| `npm run test:run` | ✅ 274/274 passed (+47 new) |
| `npm run lint` | ✅ 161 warnings (baseline), 0 new errors from R4 files |
| `npm run build` | ✅ Clean, 54 pages generated |
| `/bug-hunt free` on changed modules | ✅ 0 CRITICAL, 0 HIGH |
| Unit test output as proof (no UI in R4) | ✅ 274/274 |

---

## Entry Types

- `[FEATURE]` - New functionality
- `[FIX]` - Bug fix
- `[REFACTOR]` - Code reorganization (no behavior change)
- `[DOCS]` - Documentation only
- `[TEST]` - Test additions/updates
- `[CHORE]` - Dependencies, config, tooling

---

## Prior Work (Summary)

Phases 0–8 complete as of 2026-03-22 to 2026-04-14. Full history preserved in `BUILD_PLAN.md` Completed Work section. Highlights:
- Phase 0-2: Foundation + data pipeline + strategy engine
- Phase 3: Live draft mode (auction + snake)
- Phase 4-5: Polish + custom scoring intelligence
- Phase 6-7.5: FFIntelligence UI redesign (Tactical Hologram) + Player Intelligence System
- Phase 8: In-season AI companion (start/sit, waiver, trade, alerts)
