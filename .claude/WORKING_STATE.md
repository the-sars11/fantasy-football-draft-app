# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

**Active phase:** ROAD TO DRAFT -- ordered build sessions **S1 -> S8** (see BUILD_PLAN "ROAD TO DRAFT" block). Captures ALL of Joe's 2026-08-11 morning feedback (FB-1..FB-17) + P3 valuation + hardening (S6 bug hunt+tests, S7 Claude-driven Chrome usability test, S8 = DR-7 rehearsal) into one priority-ordered, model-bound sequence. Authored 2026-08-11. Per-session gate (S1-S5): type-check + test:run + lint(0 new) + build + `/bug-hunt free` on changed modules + a loaded-preview screenshot before any session is called done.

**S1 done (2026-08-11):** config truth + navigation. FB-1 (duplicate-active-league drift, fixed in `prep/configure/actions.ts` + one-time data fix), FB-4 (Pre Flight -- verified already dead), FB-5 (back-nav on players/board/strategies/simulate), FB-6 ("Draft Board" -> "Cheat Sheet" + inline help). Verify gate clean (type-check/test 96-96/lint 0 new/build); loaded-preview screenshot deferred -- Next.js 16 locks dev servers per-project-directory, another session held this project's only lock all session, Joe waived the screenshot rather than kill that session's server. Detail: `BUILD_PLAN.md` S1 section + FB-1/4/5/6 lines.

**S2 done (2026-08-12) = P3 valuation engine (VAL-1/2/3):**
- **VAL-1 (ceiling + expected room price):** `convert.ts`/`types.ts` now expose `ceilingValue` (roster-aware VORP worth), `expectedRoomPrice` (positional rank -> room curve via `league-calibration.ts`), and `valueGap`. Board (`draft-board-table.tsx`) renders ceiling big / room~ sub / colored gap-chip.
- **VAL-2 (tendency/exploit engine):** `lib/draft/tendencies.ts` replaced the 8-line stub -- `positionExploit` (inflation), `ownerExploit` (per-owner leans), `detectPositionRun`/`runExploit` (window-bounded live-run detection), `buildExploitSignals` (folds 3 layers, drops neutral, ranks by weight). 20 new unit tests.
- **VAL-3 (live re-anchor):** `auction-advisor.ts` `calculateMaxBidAdvice` takes an optional `calibrated` input (ceiling + expectedRoomPrice + inflationTag); anchors max-bid on the ceiling/room midpoint with a directional HOT/COOL tilt, replacing `consensusValue * 1.3`. Inflation NOT re-multiplied (baked into the curve). Wired live in `draft/live/client.tsx`.
- **Verify gate:** type-check clean · 116/116 tests · lint 0 new (44 pre-existing baseline this session) · build green · `/bug-hunt free` on changed modules (1 LOW = BUG-001 found + fixed, logged in `.claude/BUG_LOG.md`).
- **Board proof (real players_cache):** Gibbs $97 ceiling / room ~$76 / +$21 POCKET; 18 volt gap-chips at computed rgb(139,255,69). Pixel screenshot blocked by an undisplayed browser pane (environment, not code) -- proven instead via `get_page_text` (all rows) + `javascript_tool` computed-CSS. Reusable $0 verify tool: `scripts/verify-calibrated-board.ts`.
- Detail: `BUILD_PLAN.md` S2 section + VAL-1/2/3 lines + FB-15 (closed) / FB-12 (foundation done).

**S3 done (2026-08-12) = research surface depth (FB-9/10/11/13/14 closed, FB-8 re-verified):**
- **FB-10 value RANGE (`players/value-range.ts`, Opus):** band = the two REAL sourced dollars (VORP ceiling ↔ 16-yr Nasties room price), base = midpoint; falls back to national FantasyPros range, then a degenerate point only if neither exists. Documented decision + unit tests.
- **FB-9 real sourced tags (`players/tags.ts`, Opus):** ELITE (FP tier 1) · +$POCKET / -$TAX (league dollar gap, ±$4 to match the board) · VOLATILE (expert-rank std ≥20 in-pool) · INJURY (real FP status) · SLEEPER (late skill player over VORP replacement). Every tag carries a `source` string. 37 tests incl. a provenance test.
- **FB-13 richer data (Opus model + Sonnet UI):** real ESPN headshots (`players/headshot.ts` name→espnId→CDN, silhouette fallback + onError swap) · bye + league proj (PTS) + position rank on every card · one-line recommendation (`players/recommendation.ts`: Anchor/Target/Pass/Flier/Fair, injury-aware).
- **FB-14 transparency (Sonnet UI):** ⓘ "How this value is calculated" popover on every card — range provenance, each tag's source, projection basis, calibration footer.
- **FB-11 dynamic-on-pull:** Refresh button on the Players screen re-runs the fetch→convert→derive chain; `/api/players` 200, values/tags/range re-compute live.
- **FB-8 re-verified:** no ADP on the Players screen; the live auction card shows dollars only (ADP/round is snake-gated behind `!isAuction`).
- **Verify gate:** type-check clean · 153/153 tests · lint 0 new (my 6 changed files 0 errors) · build green · static bug-hunt on changed modules clean. **Live proof on real data (real Chrome screenshot + Browser-pane DOM):** 493-player pool, real headshots, `$76-97` range hero, `base $87 · mkt ~$64`, `+$13 POCKET`/`ELITE` tags, `BYE 6 · 374 PTS · RB1`, recommendation strips, working ⓘ popover with full sourcing, Refresh wired.
- **NOT in S3 scope:** FB-12 tier-depletion board repricing (not in the S3 boot Closes list) stays `[~]`.
- Detail: `BUILD_PLAN.md` S3 section + FB-8/9/10/11/13/14 lines + CHANGELOG 2026-08-12.

**Reordered 2026-08-11 (Joe's call):** all solo-buildable engineering now runs before anything needing Joe's hands-on testing. S8 is the only session that needs Joe -- it runs last, once the app actually works. New order: S1(done) -> S2=valuation engine -> S3=research depth -> S4=strategies -> S5=bug hunt (S1-S4) -> S6=live join/sync fix (solo code-fix; full live-auctioneer proof deferred to S8) -> S7=Claude-driven usability test -> S8=Joe's rehearsal (the only Joe-testing session). Detail: `BUILD_PLAN.md` "ROAD TO DRAFT" block.

**S4 done (2026-08-12) = strategies made real (FB-16/FB-17 closed):**
- **FB-16 strategies wired:** `proposeStrategiesRuleBased()` in `research.ts` -- $0 fallback when no ANTHROPIC_API_KEY; generates 4 Nasties-calibrated auction archetypes (hero-rb, wr-heavy, stars-and-scrubs, balanced) using the 16-yr ledger curves. AI path gated by confirm dialog. targetNames/avoidNames extracted from the active strategy and passed through StrategyProposals to the route to both paths. Calibrated/AI badge in the UI. Saveable via existing StrategyProposals CRUD (unchanged). useCallback deps fixed (targetNames + avoidNames added).
- **FB-17 chain proven:** 9 new tests in `research-ruleBased.test.ts` -- proposals derive from the exact player pool; swapping the pool changes the targets (not invented). `proposalToInsert` source='preset' proven. Avoids excluded from targets; user targets appear first.
- **Bug hunt S4:** 2 LOW bugs found+fixed -- BUG-002 (format guard for snake leagues), BUG-003 (loading text said "Claude analyzing" for the instant rule-based path).
- **Verify gate:** type-check clean, 162/162 tests (+9 from S4), lint 0 new, build clean, strategies screen renders at `localhost:3011/prep/strategies` (DOM tree + page text verified).

**S5 done (2026-08-12) = bug hunt + test hardening (S1-S4):**
- **Static analysis (Part A):** 0 CRITICAL, 0 HIGH bugs. 1 LOW (BUG-004): `dbLeagueToAppLeague` was private inside route.ts (untestable). Fixed: extracted to `src/lib/research/strategy/league-mapper.ts` (pure function, type-only imports). Route.ts updated to import from there; unused-import warning eliminated (net lint 161 vs 162 baseline).
- **New tests (Part B):** +43 tests (162 -> 205/205). Two new files: `league-mapper.test.ts` (11 tests: 12-team/auction/budget config, dst->def mapping, half_ppr->half-ppr, null budget, keeper guard) and `auction-advisor.test.ts` (16 tests: NEUTRAL midpoint, COOL 8% premium, HOT-TAX cap-at-worth, absoluteMax ceiling, legacy fallback, missing-manager guard). Extensions: `value-range.test.ts` (+2, BUG-001 regression), `tags.test.ts` (+9, VOLATILE/SLEEPER boundaries + multi-tag), `headshot.test.ts` (+8, normalizeName III/IV/Sr./apostrophe/whitespace/idempotent + null-fallback pattern).
- **Verify gate:** type-check 0 errors, 205/205 tests, lint 161 (0 new, 1 fewer than baseline), build clean.
- Detail: `BUILD_PLAN.md` S5 section + `BUG_LOG.md` S5 hunt entry + CHANGELOG 2026-08-12 S5.

**Next open item:** **S6 [Sonnet] -- live draft join + sync actually works (FB-7).** The broken Join page (`/draft/live?session=...&aif=remote`) is a solo code-fix. Reads first: `draft/live/client.tsx`, `use-remote-auctioneer-feed.ts`, `api/auctioneer-feed/route.ts`, `state.ts`. Done-when: from "Auctioneer is Live," Join enters a working room showing real team names, no broken page, no CORS -- verified as far as solo local testing can confirm. Full live-auctioneer proof deferred to S8.

**Cut line (needs draft date):** S1 -> S2 -> S5 -> S6 -> S7 -> S8 is the minimum viable draft-night path (the hardening passes S5/S7/S8 are NOT optional); S3/S4 are compressible depth. Joe to give the draft date to set the hard must-have line.

**VAL-0 done (2026-08-11):** real 16-year Nasties ledger corrected + imported in-repo.
- Position corruption fixed: `src/data/league-history/history-corrected.json` (961 names, 98.8% of picks). The 5 WRs mislabeled RB on Joe's 2025 roster now correct.
- Ledger self-contained: `src/data/league-history/bundle.json` + `history-corrected.json`; `scripts/derive-league-calibration.ts` reproduces curves from in-repo data.
- TRUE calibration (reverses the earlier corrupted read): WR 45% 1.18x HOT · RB 39% 0.84x COOL (value pocket) · TE 8% 1.17x HOT · QB/DEF ~national. Curves: RB1 $76…RB16 $22, WR1 $79…WR16 $23, QB1 $36, TE1 $49, DEF1 $6.

**Still pending on P2 (deferred behind P3, still needed before draft night):** DR-7.3/7.4/7.5 [Joe required] -- offline resync rehearsal, phone test, full mock-draft end-to-end.

**Code is implementation-complete for DR-7.3 (2026-08-10 review):**
- Provisional flag wired: `handleRecordPick` in `draft/live/client.tsx:218-223` sets `provisional: isOfflineFromAuctioneer || undefined` on every manual pick when offline.
- Reconciliation on reconnect: `justReconnected` triggers `reconcileWithAuctioneer(remoteLastSnapshot)` in `live/client.tsx:207-214`. Corrections returned populate the amber "Auto-corrected on reconnect" banner (`live/client.tsx:535-572`).
- Unconfirmed picks (provisional but not yet in auctioneer) stay flagged as `provisional: true` and show "UNCONFIRMED" badge in the Fix-a-Pick sheet (`fix-pick-sheet.tsx:59-66`).
- Verify suite clean: `type-check` 0 errors, `test:run` 96/96 pass, `lint` 39 pre-existing errors (0 new), `build` clean.

**DR-7.3 test walkthrough (Joe):**
1. Open the app on phone; confirm auctioneer is live (status pill shows LIVE).
2. Disconnect phone from network (Airplane mode or Wi-Fi off).
3. Status pill should shift to OFFLINE/STALE -- confirm.
4. Record a pick manually with a **deliberately wrong price** (e.g. Auctioneer sold Chase for $65, enter $99).
5. Record a second pick that the auctioneer does **NOT** have yet (a fake player name) to test the stay-flagged path.
6. Reconnect network.
7. Within ~6s (two poll cycles): look for the amber "Auto-corrected on reconnect" banner -- should show Chase $99 -> $65 correction.
8. Open Fix-a-Pick sheet: the fake-player pick should show "UNCONFIRMED" badge (still provisional).
9. Chase pick should have no "UNCONFIRMED" badge (provisional cleared).
10. Check pick count -- should be no duplicates (total should match picks entered, not doubled).
11. Confirm Joe's budget updated to reflect the corrected $65, not $99.

**DR-7.4 test (Joe, phone):**
- Vercel URL: `fantasy-football-draft-app.vercel.app`
- One-tap Go Live with auctioneer running -- confirm room opens with real team names, no 3-step setup.
- Confirm all tap targets reachable one-handed; text readable; room renders smooth.

**DR-7.5:** Full mock draft end-to-end on phone against live auctioneer, picks tracking, advice correct, budgets right -- the gold standard for draft-night readiness.

**Live blockers / needs-Joe:**
- DR-7.3-7.5: physical test, need Joe's phone + auctioneer running.
- ANTHROPIC_API_KEY absent from `.env.local` and Vercel env -- rule-based advisor works free; AI panels show fallback. Joe's cost decision pending (see BUILD_PLAN "Decisions to make" #1).
- Pre-existing `npm run lint`: 44 errors this session, all pre-existing (S2 introduced 0 new -- 2 em-dash errors I added were fixed before the gate). Scratch files (`_dev_s5.js`, `fp_*.html`, `screenshot.mjs`, `out.txt`) uncommitted -- Joe to decide.
