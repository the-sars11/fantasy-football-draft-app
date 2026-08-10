# Working State — pointer only

> Thin overlay. The source of truth for item status is `.claude/BUILD_PLAN.md`. History lives in
> `.claude/CHANGELOG.md` + git. Do NOT accrete a per-session changelog here.

**App:** personal live-draft advisor for Joe's "Nasties" 12-team, $200, PPR, no-kicker **ESPN auction** draft. Advises Joe; never bids. Picks arrive live over the network from the deployed **auctioneer** app (system of record). No Google Sheets, no snake/keeper (Tyler's league = permanent hold).

**Active phase:** P2 — Draft Readiness (finish + verify for real draft night).

**Next open item:** **DR-1 [Sonnet] — Truth-up the living dev docs** (NORTH_STAR, CLAUDE, ARCHITECTURE, FEATURES_INDEX, CODE_AREAS, README, TESTING_GUIDE → auction-only + auctioneer-feed reality). Docs-only, no code. Then DR-2…DR-7 in order (see BUILD_PLAN).

**Live blockers / needs-Joe:**
- DR-7 (draft-readiness gate) needs a running auctioneer instance + Joe on his phone.
- Supabase live-DB seed (`players_cache` from FF-080, Nasties league, valid session) is **unconfirmed** — Supabase MCP needs interactive auth. Verify in DR-7.1.
- AI panels (`ANTHROPIC_API_KEY` absent from `.env.local`) need Joe's cost decision — see BUILD_PLAN "Decisions to make" #1. The rule-based advisor works without a key.
- Pre-existing `npm run lint`: ~27 errors in untouched research/supabase files (0 new). Scratch files (`_dev_s5.js`, `fp_*.html`, `screenshot.mjs`, `out.txt`) uncommitted — Joe to decide.

**Recently landed (pointer; detail in CHANGELOG):** FF-080 data refresh (3,141 cached players, 489 real 2026 ECR/auction values), SHA f4bbdc2. Build-plan + dev-doc overhaul 2026-08-10 (11 stale docs → `.claude/archive/`).

**Note:** `UI_DESIGN_SPEC.md` (32KB) is unreconciled — decide keep-vs-archive-vs-merge-with-DESIGN_SYSTEM during DR-1.
