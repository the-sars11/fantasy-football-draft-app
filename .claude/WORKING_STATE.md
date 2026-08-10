# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

**Active phase:** P2 -- Draft Readiness (finish + verify for real draft night).

**Next open item:** **DR-7.3..7.5 [Joe required] -- offline resync rehearsal, phone test, full mock-draft end-to-end.**

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
