# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

**Active phase:** P2 -- Draft Readiness (finish + verify for real draft night).

**Next open item:** **DR-5 [Sonnet] -- One-tap Go Live + connection-UX cleanup** (cold-start "Go Live" should drop straight into the room instead of routing through /draft/setup; confirm LIVE/STALE/OFFLINE reflects the remote proxy correctly; manager team-id -> name mapping resolves right). Class: pipeline. Dependency: DR-2 (done), DR-1 (done).

**Live blockers / needs-Joe:**
- DR-7 (draft-readiness gate) needs a running auctioneer instance + Joe on his phone.
- Supabase live-DB seed (`players_cache` from FF-080, Nasties league, valid session) is **unconfirmed** -- Supabase MCP needs interactive auth. Verify in DR-7.1.
- AI panels (`ANTHROPIC_API_KEY` absent from `.env.local`) need Joe's cost decision -- see BUILD_PLAN "Decisions to make" #1. The rule-based advisor works without a key. Generate Strategies is now properly confirm-gated (DR-3).
- Pre-existing `npm run lint`: 41 errors in untouched files (0 new this session). Scratch files (`_dev_s5.js`, `fp_*.html`, `screenshot.mjs`, `out.txt`) uncommitted -- Joe to decide.

**Recently landed (pointer; detail in CHANGELOG):** DR-4 fake-data fix 2026-08-10 -- removed Math.random()/fabricated-source BREAKOUT+SLEEPER tags from Player Browser (kept real VALUE/AVOID); Dry-Run sim's DEFAULT_ROSTER now matches the locked Nasties shape (qb1/rb1/wr1/te1/flex3/k0/dst1/bench5/ir1) and no longer grades a Kicker position Joe never drafts. 0 type errors, 96 tests pass, 0 new lint errors, build clean.
