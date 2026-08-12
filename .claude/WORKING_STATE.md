# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

**Active phase:** ROAD TO DRAFT -- ordered build sessions **S1 -> S8** (see BUILD_PLAN "ROAD TO DRAFT" block). Captures ALL of Joe's 2026-08-11 morning feedback (FB-1..FB-17) + P3 valuation + hardening (S6 bug hunt+tests, S7 Claude-driven Chrome usability test, S8 = DR-7 rehearsal) into one priority-ordered, model-bound sequence. Authored 2026-08-11. Per-session gate (S1-S5): type-check + test:run + lint(0 new) + build + `/bug-hunt free` on changed modules + a loaded-preview screenshot before any session is called done.

**S1 done (2026-08-11):** config truth + navigation. FB-1 (duplicate-active-league drift, fixed in `prep/configure/actions.ts` + one-time data fix), FB-4 (Pre Flight -- verified already dead), FB-5 (back-nav on players/board/strategies/simulate), FB-6 ("Draft Board" -> "Cheat Sheet" + inline help). Verify gate clean (type-check/test 96-96/lint 0 new/build); loaded-preview screenshot deferred -- Next.js 16 locks dev servers per-project-directory, another session held this project's only lock all session, Joe waived the screenshot rather than kill that session's server. Detail: `BUILD_PLAN.md` S1 section + FB-1/4/5/6 lines.

**Reordered 2026-08-11 (Joe's call):** all solo-buildable engineering now runs before anything needing Joe's hands-on testing. S8 is the only session that needs Joe -- it runs last, once the app actually works. New order: S1(done) -> S2=valuation engine -> S3=research depth -> S4=strategies -> S5=bug hunt (S1-S4) -> S6=live join/sync fix (solo code-fix; full live-auctioneer proof deferred to S8) -> S7=Claude-driven usability test -> S8=Joe's rehearsal (the only Joe-testing session). Detail: `BUILD_PLAN.md` "ROAD TO DRAFT" block.

**Next open item:** **S2 [Opus] -- P3 valuation engine (VAL-1 -> VAL-2 -> VAL-3).** Ceiling/reality/play pricing on the corrected 16yr Nasties ledger. VAL-0 done. Reads first: the P3 section of `BUILD_PLAN.md`, `src/data/league-history/*`, `scripts/derive-league-calibration.ts`, `convert.ts`, `auction-advisor.ts`, `tendencies.ts`.

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
- Pre-existing `npm run lint`: 39 errors (down from 41 baseline -- 2 removed in prior sessions; 0 new). Scratch files (`_dev_s5.js`, `fp_*.html`, `screenshot.mjs`, `out.txt`) uncommitted -- Joe to decide.
