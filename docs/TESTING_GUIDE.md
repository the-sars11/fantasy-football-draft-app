# Testing Guide -- Fantasy Football Draft Advisor

**Scope:** auction draft only (Joe's Nasties, ESPN, 12-team, $200, PPR, no-kicker)
**Last updated:** 2026-08-10
**Dev URL:** http://localhost:3003

---

## Getting Started

```bash
npm run dev   # starts on :3003
```

Required env (`.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `AUCTIONEER_BASE_URL` -- the deployed auctioneer URL (for live sync)
- `ANTHROPIC_API_KEY` -- optional; AI panels fall back gracefully without it

---

## Auth

1. Navigate to `/sign-in`; sign in with Joe's account
2. Verify redirect to Prep Hub (`/prep`)

---

## League Setup (Setup tab)

1. Go to **Setup** tab (`/settings`)
2. Verify Nasties defaults are auto-seeded: 12-team, $200, PPR, no-kicker, ESPN, auction
3. Confirm signed-in user email is correct (not the PM-email)

---

## Prep -- Research Hub

### Draft Board (`/prep/board`)
- [ ] Players sorted by strategy-adjusted value
- [ ] Position tabs filter correctly (QB/RB/WR/TE/FLEX/DEF)
- [ ] Auction values display -- real 2026 ECR values (Ja'Marr Chase ~$70)
- [ ] Tier breaks visible

### Player Browser (`/prep/players`)
- [ ] Position filter and ADP slider work
- [ ] User TARGET/AVOID tags can be set and persist
- [ ] No random/fabricated BREAKOUT/SLEEPER badges (DR-4 fix)

### Strategy Proposals (`/prep/strategies`)
- [ ] "Generate Strategies" shows a cost-confirm dialog before calling Claude (DR-3 fix)
- [ ] Strategies display correctly after generation

### Research Runs (`/prep/runs`)
- [ ] "New Run" triggers the research pipeline without any cost warning (DR-3 fix: it is deterministic, $0)

### Dry-Run Simulator (`/prep/simulate`)
- [ ] Roster shape is QB1 / RB1 / WR1 / TE1 / FLEX3 / DEF1 / K0 / Bench5 / IR1 (DR-4 fix)

---

## Live Draft

### Go Live (DR-5)
1. With the auctioneer running, go to the Draft tab (`/draft`)
2. "Go Live" should drop straight into the auction room -- no 3-step setup detour

### Connection Status
- [ ] Status bar shows LIVE (green) when auctioneer is up
- [ ] Goes STALE then OFFLINE within ~10s when auctioneer is unreachable

### Auctioneer Feed (requires live auctioneer)
1. Record a pick in the auctioneer
2. Verify it appears in this app within ~5s
3. Manager name resolves to a real name (not a numeric team ID)
4. Price, position, player name all match

### What-To-Do Advisor
- [ ] Nominated player appears in the "On the Block" card
- [ ] Advice shows one of: HOLD / BID / PUSH / PASS
- [ ] Max bid and rationale display
- [ ] Joe's remaining budget updates after each pick

### Manual Pick Entry
- [ ] Block picker sheet lets Joe record a pick manually
- [ ] Pick appears in My Team roster; budget updates

### Offline Resync (DR-7.3 verification)
1. Go offline; record a provisional pick with a deliberately wrong price
2. Reconnect
3. Auctioneer value auto-corrects it with a visible notice
4. No pick duplicates; budget recomputes correctly; offline-only picks remain flagged until reconciled

---

## Post-Draft Review (`/draft/review`)
- [ ] Grade displays after draft completion
- [ ] All picks listed (with STEAL / REACH / GREAT VALUE badges where applicable)
- [ ] Positional breakdown visible

---

## Mobile -- Arm's-Length (DR-7.4 verification)
- [ ] Every tap target reachable one-handed in portrait mode
- [ ] Text readable without pinching
- [ ] Status bar, On-the-Block card, and budget strip all visible without scrolling
- [ ] One-tap Go Live works on Joe's phone

---

## Known Limitations

- **Supabase seed required** -- `players_cache` (3,141 players), the Nasties league, and a valid auction session must exist in the live DB. If APIs return 503, the DB is not seeded. Verify in DR-7.1.
- **ANTHROPIC_API_KEY absent** -- strategy proposals and AI top-targets show a fallback/empty state. The rule-based advisor (What-To-Do, max bid, budget) works without it.
- **Live auctioneer required for full DR-7** -- auctioneer feed steps need a running auctioneer instance. Manual pick entry covers all other testing.
- **season/* screens parked** -- the in-season companion routes are unreachable by design. Do not test them.

---

*Rewritten 2026-08-10 -- auction-only. Prior Phase 8 guide (Sheets, snake, in-season content) is in git history.*
