# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

**Active phase:** P2 -- Draft Readiness (finish + verify for real draft night).

**Next open item:** **DR-4 [Sonnet] -- Kill misleading / fake data** (Player Browser random intel tags using Math.random(); Dry-Run sim using wrong roster shape instead of Nasties QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5). Class: output. Dependency: DR-2 (done), DR-3 (done).

**Live blockers / needs-Joe:**
- DR-7 (draft-readiness gate) needs a running auctioneer instance + Joe on his phone.
- Supabase live-DB seed (`players_cache` from FF-080, Nasties league, valid session) is **unconfirmed** -- Supabase MCP needs interactive auth. Verify in DR-7.1.
- AI panels (`ANTHROPIC_API_KEY` absent from `.env.local`) need Joe's cost decision -- see BUILD_PLAN "Decisions to make" #1. The rule-based advisor works without a key. Generate Strategies is now properly confirm-gated (DR-3).
- Pre-existing `npm run lint`: 41 errors in untouched files (0 new this session). Scratch files (`_dev_s5.js`, `fp_*.html`, `screenshot.mjs`, `out.txt`) uncommitted -- Joe to decide.

**Recently landed (pointer; detail in CHANGELOG):** DR-3 cost-guard fix 2026-08-10 -- confirmed Generate Strategies as the only real Claude caller; added inline cost-confirm; fixed misleading Run Research copy to "Free data pull -- no AI credits"; removed spurious ANTHROPIC_API_KEY check from /api/research route (was 503-ing a deterministic endpoint). 0 type errors, 96 tests pass, 0 new lint errors, build clean.
