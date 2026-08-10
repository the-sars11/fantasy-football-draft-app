# Architecture -- Fantasy Football Draft Advisor

**Last updated:** 2026-08-10

## Live Draft Data Flow

```
Auctioneer app (deployed, fantasy-auction-auctioneer)
  |
  | GET /api/state  (returns full DraftState: picks[], config.teams[])
  v
src/app/api/auctioneer-feed/route.ts      Server proxy -- CORS-dodge; client polls ~3s
  |
  v
src/hooks/use-remote-auctioneer-feed.ts   ~3s poll + exponential backoff; LIVE/STALE/OFFLINE status
  |
  v
src/lib/draft/auction-feed-merge.ts       pickId dedup + multi-source priority merge
  ^
  | (also merges same-device BroadcastChannel picks as a second source)
src/hooks/use-auctioneer-feed.ts          BroadcastChannel listener (same-device path)
  |
  v
src/lib/draft/state.ts                    State machine: picks, manager budgets, roster slots
  |    reconcileWithAuctioneerPicks -- auctioneer always wins on conflict
  v
src/app/(app)/draft/live/client.tsx       Page coordinator
  |
  v
src/components/draft/live-room/
  auction-room.tsx        Top-level room shell (scoped theme: live-room/theme.ts)
  status-bar.tsx          LIVE/STALE/OFFLINE indicator + manager name resolution
  on-the-block-card.tsx   Nomination hero + What-To-Do advice panel
  awareness-strip.tsx     Dangerous manager awareness
  budget-strip.tsx        Joe's remaining budget + pace
  tier-context.tsx        Tier scarcity context
  my-team-roster.tsx      Joe's picks so far
  bottom-nav.tsx          In-room navigation tabs
  block-picker-sheet.tsx  Manual pick entry sheet
  fix-pick-sheet.tsx      Correct a wrong price after the fact
  research-view.tsx       Research tab inside the room
```

## Advisor Engine (rule-based, no API key)

```
src/lib/draft/what-to-do.ts          HOLD / BID / PUSH / PASS + max-bid + rationale
src/lib/draft/auction-advisor.ts     calculateMaxBidAdvice, analyzeBudgetStrategy,
                                     getPositionUrgencyWarnings, getPositionBudgetBreakdown
src/lib/draft/explain.ts             explainPlayer -- strategy fit, scarcity, need, value, risk
src/lib/draft/state.ts               createInitialState, applyPick, reconcileWithAuctioneerPicks
src/lib/draft/recommend-auction.ts   Auction-specific recommendation helpers
```

## Research / Prep Pipeline

```
/prep          Research Hub (landing)
/prep/board    Draft board -- sortable, strategy-scored, tier breaks
/prep/strategies  AI strategy proposals (costs Claude -- confirm-gated in DR-3)
/prep/players  Player browser + user target/avoid tags and rules
/prep/runs     Saved research run history + compare
/prep/simulate Dry-run simulator (Nasties roster shape: QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1)

src/lib/research/
  service.ts              Pipeline orchestrator (deterministic, no Claude cost)
  normalize.ts            Multi-source merge into consensus
  sources/sleeper.ts      ADP, projections, player metadata
  sources/fantasypros.ts  ECR, tiers, real 2026 auction values (seeded via FF-080)
  sources/espn.ts         Rankings, projections
  intel/                  Player tag detection (BREAKOUT/SLEEPER/BUST/VALUE/AVOID)
  strategy/               Strategy scoring, validation, AI proposals
```

## API Surface

| Route | What it does |
|-------|-------------|
| `GET /api/auctioneer-feed` | Proxy to auctioneer /api/state (the live draft input) |
| `POST /api/draft/sessions` | Create a draft session |
| `GET /api/draft/sessions/[id]` | Get session state + picks |
| `PATCH /api/draft/sessions/[id]` | Persist picks to Supabase |
| `POST /api/research` | Run research pipeline (deterministic, $0) |
| `GET /api/research/[runId]` | Get saved run results |
| `GET /api/players` | Fetch player cache |
| `POST /api/players/refresh` | Force-refresh player data from sources |
| `POST /api/strategies/propose` | AI strategy proposals (costs Claude -- confirm-gated) |
| `GET/POST /api/leagues` | League config CRUD |
| `GET/POST /api/user-tags` | User target/avoid tags |
| `POST /api/user-tags/batch` | Batch tag ops |
| `GET/POST /api/user-rules` | Natural-language rules |
| `POST /api/user-rules/preview` | Preview rule effect on player list |

**Dead / removed:** `POST /api/draft/sheets` (Google Sheets proxy -- removed in DR-2)

## Supabase Schema

| Table | Purpose |
|-------|---------|
| `users` | Auth + profile (Supabase Auth) |
| `leagues` | League config (Nasties: 12-team, $200, PPR, no-K, ESPN, auction) |
| `players_cache` | 3,141 Sleeper players + 489 real 2026 ECR/auction values (FF-080 seed) |
| `research_runs` | Saved prep runs (league_id, strategy, timestamp) |
| `research_results` | Per-run analysis (rankings, values, targets, avoids, tiers) |
| `draft_sessions` | Live sessions (league_id, status) |
| `draft_picks` | Individual picks (session_id, player_id, manager, price) |
| `draft_recommendations` | Optional LLM recommendations (rule-based advisor needs no row here) |
| `manager_profiles` | Per-draft manager tracking (budget, roster, tendency scores) |

## What Is NOT in This App

| Dead path | Reason |
|-----------|--------|
| Google Sheets polling | Removed in DR-2 |
| Snake draft state | Removed in DR-2 (Nasties is auction-only) |
| Keeper logic | Removed in DR-2 (Nasties is full redraft) |
| Yahoo / Sleeper OAuth | Never built |
| `season/*` pages | Parked (DR-6.2 decides delete vs. quarantine) |
| P3-P7 commercialization | Retired 2026-08-06 |
