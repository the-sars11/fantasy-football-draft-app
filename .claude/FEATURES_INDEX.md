# Features Index -- Fantasy Football Draft Advisor

**Last Updated:** 2026-08-10
**App:** auction-only live-draft advisor for Joe's Nasties 12-team, $200, PPR, no-kicker ESPN draft.

Quick lookup: **Feature -> Code Location + Searchable Tags**

---

## Feature: Auctioneer Live Feed

**Tags:** `#live-draft` `#auctioneer` `#auction` `#feed` `#polling` `#sync`

| Component | File | What it does |
|-----------|------|--------------|
| Server proxy | `src/app/api/auctioneer-feed/route.ts` | CORS-dodge proxy to auctioneer /api/state |
| Remote feed hook | `src/hooks/use-remote-auctioneer-feed.ts` | ~3s poll + backoff; LIVE/STALE/OFFLINE status |
| Same-device feed hook | `src/hooks/use-auctioneer-feed.ts` | BroadcastChannel listener (same-device path) |
| Feed merge | `src/lib/draft/auction-feed-merge.ts` | pickId dedup + multi-source priority merge |

---

## Feature: Live Auction Draft Room

**Tags:** `#live-draft` `#auction` `#espn` `#room` `#advisor` `#budget`

### Auction Advisor Engine (`src/lib/draft/`)
| Component | File | What it does |
|-----------|------|--------------|
| What-To-Do advisor | `src/lib/draft/what-to-do.ts` | HOLD/BID/PUSH/PASS + max bid + rationale (rule-based, $0) |
| Max bid + budget | `src/lib/draft/auction-advisor.ts` | calculateMaxBidAdvice, analyzeBudgetStrategy, getPositionUrgencyWarnings |
| State machine | `src/lib/draft/state.ts` | Per-manager budget/roster, applyPick, reconcileWithAuctioneerPicks (offline resync) |
| Explainability | `src/lib/draft/explain.ts` | explainPlayer -- strategy fit, scarcity, need, value, risk |
| Trash talk | `src/lib/draft/trash-talk.ts` + `trash-talk-history.ts` | Overpay/imbalance alerts + roast report |
| Manager tendencies | `src/lib/draft/tendencies.ts` | Per-manager pattern tracking |

### Live Room UI (`src/components/draft/live-room/`)
| Component | File | What it does |
|-----------|------|--------------|
| Room shell | `auction-room.tsx` | Top-level room layout; uses scoped `theme.ts` palette |
| Status bar | `status-bar.tsx` | LIVE/STALE/OFFLINE + manager name resolution |
| On-the-Block card | `on-the-block-card.tsx` | Nominated player hero + What-To-Do advice |
| Awareness strip | `awareness-strip.tsx` | Dangerous manager awareness |
| Budget strip | `budget-strip.tsx` | Joe's remaining budget + pace analysis |
| Tier context | `tier-context.tsx` | Tier scarcity context |
| My team roster | `my-team-roster.tsx` | Joe's picks in progress |
| Bottom nav | `bottom-nav.tsx` | In-room tab navigation |
| Block picker sheet | `block-picker-sheet.tsx` | Manual pick entry |
| Fix pick sheet | `fix-pick-sheet.tsx` | Correct a wrong price after the fact |
| Research view | `research-view.tsx` | Research tab inside the room |
| Room theme | `theme.ts` | Scoped color palette for the live room |

### Live Draft Pages
| Page | Route | File |
|------|-------|------|
| Draft landing / Go Live | `/draft` | `src/app/(app)/draft/page.tsx` |
| Auction room | `/draft/live` | `src/app/(app)/draft/live/page.tsx` + `client.tsx` |
| Draft setup (fallback) | `/draft/setup` | `src/app/(app)/draft/setup/page.tsx` + `client.tsx` |
| Post-draft review | `/draft/review` | `src/app/(app)/draft/review/page.tsx` + `client.tsx` |

---

## Feature: Draft Prep / Research Pipeline

**Tags:** `#prep` `#research` `#llm` `#strategy` `#data-sources`

### Research Orchestration (`src/lib/research/`)
| Component | File | What it does |
|-----------|------|--------------|
| Pipeline orchestrator | `src/lib/research/service.ts` | configure -> ingest -> normalize -> analyze (deterministic, $0) |
| Multi-source normalization | `src/lib/research/normalize.ts` | Merge Sleeper/FantasyPros/ESPN into consensus |
| Player cache | `src/lib/research/cache.ts` | Supabase-backed cache with 24h freshness |

### Data Source Adapters (`src/lib/research/sources/`)
| Adapter | File | Source |
|---------|------|--------|
| Sleeper adapter | `src/lib/research/sources/sleeper.ts` | ADP, projections, player metadata |
| FantasyPros adapter | `src/lib/research/sources/fantasypros.ts` | ECR, tiers, real 2026 auction values (FF-080 seed) |
| ESPN adapter | `src/lib/research/sources/espn.ts` | Rankings, projections |

### Strategy Engine (`src/lib/research/strategy/`)
| Component | File | What it does |
|-----------|------|--------------|
| Strategy scoring | `src/lib/research/strategy/scoring.ts` | Score each player against active strategy |
| Strategy research | `src/lib/research/strategy/research.ts` | AI-proposed strategy generation (costs Claude) |
| Strategy presets | `src/lib/research/strategy/presets.ts` | Built-in archetypes (Zero-RB, Stars & Scrubs, etc.) |
| Strategy validation | `src/lib/research/strategy/validate.ts` | Validate strategy config |

### Prep UI Pages (`src/app/(app)/prep/`)
| Page | Route | What it does |
|------|-------|--------------|
| Research Hub | `/prep` | Landing hub with quick-access cards |
| League config | `/prep/configure` | League settings form |
| Draft board | `/prep/board` | Sortable/filterable player board with strategy values |
| Strategies | `/prep/strategies` | AI-proposed strategies + comparison + editor |
| Run history | `/prep/runs` | Saved research runs, side-by-side compare |
| Player browser | `/prep/players` | Player intel browser with tags/filters |
| Dry-run simulator | `/prep/simulate` | Simulate a draft against the Nasties roster shape |

---

## Feature: Player Intelligence System

**Tags:** `#player-intel` `#tags` `#rules` `#sentiment`

### Intel Engine (`src/lib/research/intel/`)
| Component | File | What it does |
|-----------|------|--------------|
| Tag detector | `src/lib/research/intel/tag-detector.ts` | BREAKOUT/SLEEPER/BUST/VALUE/AVOID detection |
| Sentiment aggregation | `src/lib/research/intel/sentiment.ts` | Merge mentions across multiple sources |
| Intel service | `src/lib/research/intel/service.ts` | Orchestrate tag detection + store to Supabase |
| Rule parser | `src/lib/research/intel/rule-parser.ts` | Natural language -> structured rule (LLM-parsed) |
| Data freshness | `src/lib/research/intel/freshness.ts` | TTL config per data type, 2026 season validation |
| Types | `src/lib/research/intel/types.ts` | PlayerIntel, UserTag, UserRule, SourceRegistry |

### User Tags & Rules APIs
| Route | File | What it does |
|-------|------|--------------|
| GET/POST /api/user-tags | `src/app/api/user-tags/route.ts` | CRUD user tags |
| POST /api/user-tags/batch | `src/app/api/user-tags/batch/route.ts` | Batch tag operations |
| GET/POST /api/user-rules | `src/app/api/user-rules/route.ts` | CRUD user rules |
| POST /api/user-rules/preview | `src/app/api/user-rules/preview/route.ts` | Preview rule effect on player list |

---

## Feature: AI Recommendations (optional, costs Claude)

**Tags:** `#llm` `#recommendations` `#claude-api`

| Component | File | What it does |
|-----------|------|--------------|
| Auction-specific recommend | `src/lib/draft/recommend-auction.ts` | Auction-context recommendation helpers |
| Recommend (general) | `src/lib/draft/recommend.ts` | fetchRecommendation -- calls Claude, caches 30s |
| Claude API wrapper | `src/lib/ai/claude.ts` | askClaudeJson -- Haiku model for low-latency calls |
| Strategy pivot detector | `src/lib/draft/pivot-detector.ts` | Detect when pivot to different strategy is optimal |
| Draft flow monitor | `src/lib/draft/flow-monitor.ts` | Continuous draft-state analysis |

### API Routes (cost Claude -- confirm-gated per DR-3)
| Route | File | What it does |
|-------|------|--------------|
| POST /api/draft/recommend | `src/app/api/draft/recommend/route.ts` | LLM recommendation endpoint |
| POST /api/strategies/propose | `src/app/api/strategies/propose/route.ts` | AI-generate strategy proposals |

---

## Feature: Auth + Session Management

**Tags:** `#auth` `#supabase` `#session` `#middleware`

| Component | File | What it does |
|-----------|------|--------------|
| Auth context | `src/contexts/auth-context.ts` | React context for Supabase Auth |
| Middleware | `src/middleware.ts` | Route protection + redirects (root -> /prep) |
| Dev mode bypass | `src/lib/supabase/dev-mode.ts` | DEV_MODE=true skips auth, returns mock user |
| Supabase client | `src/lib/supabase/client.ts` | Browser-side Supabase client |
| Supabase server | `src/lib/supabase/server.ts` | Server-side Supabase client |
| DB types | `src/lib/supabase/database.types.ts` | Generated TypeScript types for all tables |
| Strategy queries | `src/lib/supabase/strategies.ts` | Strategy CRUD + profile queries |

---

## Feature: GRIDIRON Design System

**Tags:** `#design` `#ui` `#components` `#tailwind` `#motion`

**LOCKED -- see `DESIGN_SYSTEM.md` v3.1. Do not modify without explicit approval.**

| Component | File | What it does |
|-----------|------|--------------|
| Design tokens | `src/app/globals.css` | Color palette, surface hierarchy |
| Motion system | `src/lib/motion.ts` | Animation presets (no backdrop-filter stacks) |
| Motion components | `src/components/motion/index.ts` | Reusable animated wrappers |
| Live room palette | `src/components/draft/live-room/theme.ts` | Scoped palette for the auction room |

---

## Dead / Removed Code (reference)

| Symbol | Was at | Status |
|--------|--------|--------|
| Google Sheets lib | `src/lib/sheets/index.ts` | Dead -- removed in DR-2 |
| Sheets polling hook | `src/hooks/use-draft-polling.ts` | Dead -- removed in DR-2 |
| Sheets API route | `src/app/api/draft/sheets/route.ts` | Dead -- removed in DR-2 |
| Snake advisor | `src/components/draft/snake-advisor.tsx` | Dead -- removed in DR-2 |
| Tyler keeper preset | `src/lib/scoring-presets.ts` (one entry) | Dead -- removed in DR-2 |
| Research analyze | `src/lib/research/analyze.ts` | Orphan -- removed in DR-2 |
| Sound settings | `src/components/settings/sound-settings.tsx` | Orphan -- removed in DR-2 |

---

## Tag Cloud

`#live-draft` `#auctioneer` `#auction` `#espn` `#budget` `#max-bid` `#feed` `#polling` `#sync` `#prep` `#research` `#llm` `#strategy` `#data-sources` `#player-intel` `#tags` `#rules` `#sentiment` `#recommendations` `#explain` `#claude-api` `#auth` `#supabase` `#middleware` `#design` `#ui` `#components` `#tailwind` `#motion`
