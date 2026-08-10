# Working State -- pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

**Active phase:** P2 -- Draft Readiness (finish + verify for real draft night).

**Next open item:** **DR-7 [Sonnet + Joe] -- LIVE verification + mock-draft rehearsal.** Draft-readiness GATE. Needs a running auctioneer instance + Joe on his phone. Dependency: DR-1..DR-6 (all done).

**Live blockers / needs-Joe:**
- DR-7 (draft-readiness gate) needs a running auctioneer instance + Joe on his phone. DR-5's auto-create/status-pill fixes are code-verified only -- DR-7 is where they get proven against a real live auctioneer.
- Supabase live-DB seed (`players_cache` from FF-080, Nasties league, valid session) is **unconfirmed** -- Supabase MCP needs interactive auth. Verify in DR-7.1.
- AI panels (`ANTHROPIC_API_KEY` absent from `.env.local`) need Joe's cost decision -- see BUILD_PLAN "Decisions to make" #1. The rule-based advisor works without a key. Generate Strategies is now properly confirm-gated (DR-3).
- Pre-existing `npm run lint`: 41 errors in untouched files (0 new this session). Scratch files (`_dev_s5.js`, `fp_*.html`, `screenshot.mjs`, `out.txt`) uncommitted -- Joe to decide.

**Recently landed (pointer; detail in CHANGELOG):** DR-6 GRIDIRON sweep + season/* quarantine 2026-08-10 -- all 9 reachable off-system Research-tab files (strategy-proposals, strategy-proposal-card, strategy-compare, strategy-value-preview, strategy-list, league-config-form, position-breakdown, strategy-editor, prep/runs/client) converted from shadcn to GRIDIRON tokens (scope expanded from the original 2-file plan item, Joe-approved); season/* (5 files) confirmed unreachable and quarantined with explicit "PARKED / OFF-SYSTEM" docblock banners rather than deleted. 0 type errors, 96 tests pass, 0 new lint errors, build clean. DR-5 one-tap Go Live 2026-08-10 -- cold-start "Go Live" now auto-creates/resumes a session seeded with the auctioneer's real team names (no more /draft/setup detour); fixed room LIVE/OFFLINE status to reflect an actual connected feed instead of "no error yet"; manual-mode fallback untouched. 0 type errors, 96 tests pass, 0 new lint errors, build clean. Live-path verification deferred to DR-7 (needs a real running auctioneer). DR-4 fake-data fix 2026-08-10 -- removed Math.random()/fabricated-source BREAKOUT+SLEEPER tags from Player Browser (kept real VALUE/AVOID); Dry-Run sim's DEFAULT_ROSTER now matches the locked Nasties shape (qb1/rb1/wr1/te1/flex3/k0/dst1/bench5/ir1) and no longer grades a Kicker position Joe never drafts.
