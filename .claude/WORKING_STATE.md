# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

**Active phase:** P2 -- Draft Readiness (finish + verify for real draft night).

**Next open item:** **DR-7.3..7.5 [Joe required] -- offline resync rehearsal, phone test, full mock-draft end-to-end.**

**What was verified this session (2026-08-10):**
- DR-7.1 CONFIRMED: players_cache has 491 real 2026 PPR players (Chase #1 $70, rank 1). Nasties 2026 league exists ($200, 12 teams, PPR, is_active=true). Two stale June-2026 dev sessions (generic "Me/Manager 2-12", zero picks each) marked completed -- DR-5.1 auto-create now fires cleanly with real Nasties team names when the auctioneer is detected live.
- DR-7.2 CONFIRMED: Auctioneer proxy working. Test draft (`isTest:true`) ran today (2026-08-10, ~3pm local, 85 picks, 12 teams Rasar/Leems/Reggie...). Contract matches: pick data has name/position/team/byeWeek/price/teamId all present and correct. No CORS errors -- server-side proxy handles by design.

**Live blockers / needs-Joe for DR-7.3-7.5:**
- DR-7.3: Offline resync rehearsal -- go offline, record a provisional pick with wrong price, reconnect, confirm the auctioneer auto-corrects it + no pick duplicates. Needs active testing.
- DR-7.4: Arm's-length phone test -- one-tap Go Live, thumb-reachable tap targets, room renders smoothly. Vercel URL: `fantasy-football-draft-app.vercel.app` (project: `fantasy_football_draft_app`). Needs Joe's phone.
- DR-7.5: Full mock draft end-to-end on phone against live auctioneer, picks tracking, advice correct, budgets right. The auctioneer test draft ran today (85 picks) -- Joe to confirm whether the app was working on his end.
- ANTHROPIC_API_KEY absent from `.env.local` and Vercel env -- rule-based advisor works free; AI panels show fallback. Joe's cost decision pending (see BUILD_PLAN "Decisions to make" #1).
- Pre-existing `npm run lint`: 39 errors (down from 41 baseline -- 2 removed in prior sessions; 0 new this session). Scratch files (`_dev_s5.js`, `fp_*.html`, `screenshot.mjs`, `out.txt`) uncommitted -- Joe to decide.

**Recently landed (pointer; detail in CHANGELOG):** DR-7 partial verification 2026-08-10 -- DR-7.1 and DR-7.2 verified via live API calls (no code changes). Stale dev sessions cleaned. Build suite: 0 type errors, 96 tests pass, 0 new lint errors, build clean.
