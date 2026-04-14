# Features Index — FFIntelligence

**Last Updated:** 2026-04-14

Quick lookup: **Feature → Code Location + Searchable Tags**

---

## How to Use This File

1. Find feature by name or search for tags
2. Jump to code location (file:line)
3. Read description for context

**Tags format:** `#category` `#technology` `#domain`

---

## Feature: Draft Prep / Research Pipeline

**Tags:** `#prep` `#research` `#llm` `#strategy` `#data-sources`

### Research Orchestration (`src/lib/research/service.ts`)
| Component | File | What it does |
|-----------|------|--------------|
| Research pipeline orchestrator | `src/lib/research/service.ts` | configure → ingest → normalize → analyze |
| LLM analysis layer | `src/lib/research/analyze.ts` | Claude analysis with strategy context |
| Multi-source normalization | `src/lib/research/normalize.ts` | Merge ESPN/Yahoo/Sleeper/FP into consensus |
| Player cache | `src/lib/research/cache.ts` | Supabase-backed cache with 24h freshness |

### Data Source Adapters (`src/lib/research/sources/`)
| Adapter | File | Source |
|---------|------|--------|
| ESPN adapter | `src/lib/research/sources/espn.ts` | Rankings, projections, auction values |
| Yahoo adapter | `src/lib/research/sources/yahoo.ts` | Rankings, projections (OAuth flow — DEFERRED) |
| Sleeper adapter | `src/lib/research/sources/sleeper.ts` | ADP, projections, player metadata, trending |
| FantasyPros adapter | `src/lib/research/sources/fantasypros.ts` | ECR, tiers, auction values |

### Strategy Engine (`src/lib/research/strategy/`)
| Component | File | What it does |
|-----------|------|--------------|
| Strategy scoring | `src/lib/research/strategy/scoring.ts` | Score each player against active strategy |
| Strategy research | `src/lib/research/strategy/research.ts` | AI-proposed strategy generation |
| Strategy presets | `src/lib/research/strategy/presets.ts` | Built-in archetypes (Zero-RB, Stars & Scrubs, etc.) |
| Strategy validation | `src/lib/research/strategy/validate.ts` | Validate strategy config |

### Prep UI Pages (`src/app/(app)/prep/`)
| Page | Route | What it does |
|------|-------|--------------|
| Prep Hub | `/prep` | Hub navigation with AI recommendation card |
| League config | `/prep/configure` | League settings form (platform, format, roster) |
| Draft board | `/prep/board` | Sortable/filterable player board with strategy values |
| Strategies | `/prep/strategies` | AI-proposed strategies + comparison + editor |
| Run history | `/prep/runs` | Saved prep runs, side-by-side compare |
| Player browser | `/prep/players` | Player intelligence browser with tags/filters |

---

## Feature: Live Draft — Auction Mode

**Tags:** `#live-draft` `#auction` `#espn` `#budget` `#max-bid`

### Auction Engine (`src/lib/draft/`)
| Component | File | What it does |
|-----------|------|--------------|
| Auction state machine | `src/lib/draft/state.ts` | Per-manager budget, roster slots, picks |
| Max bid calculator | `src/lib/draft/auction-advisor.ts:28-146` | `calculateMaxBidAdvice()` — context-aware max bid |
| Budget strategy analysis | `src/lib/draft/auction-advisor.ts:161-202` | `analyzeBudgetStrategy()` — ahead/behind pace |
| Position urgency warnings | `src/lib/draft/auction-advisor.ts:215-267` | `getPositionUrgencyWarnings()` — scarcity alerts |

### Auction UI (`src/components/draft/`)
| Component | File | What it does |
|-----------|------|--------------|
| Auction advisor panel | `src/components/draft/auction-advisor.tsx` | Budget health + max bid display |
| Manual pick entry | `src/components/draft/manual-pick-entry.tsx` | Quick-entry UI (search + assign + price) |
| Player pool | `src/components/draft/player-pool.tsx` | Live-updated available player list |
| Position scarcity | `src/components/draft/position-scarcity.tsx` | Remaining slots per position with urgency |

### Live Draft Page
| Page | Route | File |
|------|-------|------|
| Live draft | `/draft/live` | `src/app/(app)/draft/live/page.tsx` + `client.tsx` |
| Draft setup | `/draft/setup` | `src/app/(app)/draft/setup/page.tsx` + `client.tsx` |
| Post-draft review | `/draft/review` | `src/app/(app)/draft/review/page.tsx` + `client.tsx` |

---

## Feature: Live Draft — Snake Mode

**Tags:** `#live-draft` `#snake` `#yahoo` `#keeper` `#round-by-round`

### Snake Engine (`src/lib/draft/`)
| Component | File | What it does |
|-----------|------|--------------|
| Snake state machine | `src/lib/draft/state.ts` | Current round, pick order, compensatory picks |
| Snake advisor | `src/lib/draft/snake-advisor.ts` | "Best available at your next pick" logic |
| Keeper logic | `src/lib/draft/keepers.ts` | Keeper discount tracking, negative pick_numbers |

### Snake UI
| Component | File | What it does |
|-----------|------|--------------|
| Snake advisor panel | `src/components/draft/snake-advisor.tsx` | Best available + trade-up suggestions |
| My roster panel | `src/components/draft/my-roster.tsx` | Current picks + position needs + grade |
| League overview | `src/components/draft/league-overview.tsx` | All managers' rosters at a glance |

---

## Feature: Google Sheets Integration

**Tags:** `#sheets` `#polling` `#manual-entry` `#googleapis` `#live-draft`

### Sheets Library (`src/lib/sheets/index.ts`)
| Function | Lines | What it does |
|----------|-------|--------------|
| `extractSheetId()` | 41-48 | Parse sheet ID from any Google Sheets URL |
| `detectColumnMapping()` | 54-91 | Auto-detect Player/Manager/Price/Round columns |
| `readSheet()` | 180-236 | Fetch CSV export, parse, apply column mapping |
| `parseCSV()` | 96-128 | CSV parser with quoted-field support |
| `mapRows()` | 133-170 | Apply mapping to raw rows → `SheetRow[]` |

### Polling Hook (`src/hooks/use-draft-polling.ts`)
| Function | Lines | What it does |
|----------|-------|--------------|
| `useDraftPolling()` | 33-137 | Poll Sheets every 7s, detect new rows, fire `onNewPicks` callback |

### API Route
| Route | File | What it does |
|-------|------|--------------|
| POST /api/draft/sheets | `src/app/api/draft/sheets/route.ts` | Server-side sheet fetch (avoids CORS) |

---

## Feature: AI Recommendations

**Tags:** `#llm` `#recommendations` `#explain` `#claude-api` `#real-time`

### Recommendation Engine (`src/lib/draft/`)
| Component | File | Lines | What it does |
|-----------|------|-------|--------------|
| Fetch recommendation | `src/lib/draft/recommend.ts` | 45-132 | `fetchRecommendation()` — calls Claude, caches 30s |
| Clear cache | `src/lib/draft/recommend.ts` | 135-137 | `clearRecommendationCache()` — on strategy swap |
| Explainability engine | `src/lib/draft/explain.ts` | 124-302 | `explainPlayer()` — factors, confidence, summary |
| Scarcity calculator | `src/lib/draft/explain.ts` | 46-81 | `calculateScarcity()` — tier counts by position |
| Extended scarcity | `src/lib/draft/explain.ts` | 87-119 | `calculateScarcityExtended()` — adds spend ranges |

### AI Claude Client
| Component | File | What it does |
|-----------|------|--------------|
| Claude API wrapper | `src/lib/ai/claude.ts` | `askClaudeJson()` — Haiku model for low-latency draft calls |

### API Route
| Route | File | What it does |
|-------|------|--------------|
| POST /api/draft/recommend | `src/app/api/draft/recommend/route.ts` | LLM recommendation endpoint (~500 tokens in, ~300 out) |

### Strategy Pivot System (`src/lib/draft/`)
| Component | File | What it does |
|-----------|------|--------------|
| Pivot detector | `src/lib/draft/pivot-detector.ts` | Detect when pivot to different strategy is optimal |
| Flow monitor | `src/lib/draft/flow-monitor.ts` | Continuous draft-state analysis (position runs, value anomalies) |
| Pivot history | `src/lib/draft/pivot-detector.ts` | Track all strategy swaps during draft |

---

## Feature: Player Intelligence System

**Tags:** `#player-intel` `#tags` `#rules` `#sentiment` `#breakout` `#sleeper` `#bust`

### Intel Engine (`src/lib/research/intel/`)
| Component | File | What it does |
|-----------|------|--------------|
| Tag detector | `src/lib/research/intel/tag-detector.ts` | BREAKOUT/SLEEPER/BUST/VALUE/AVOID detection |
| Sentiment aggregation | `src/lib/research/intel/sentiment.ts` | Merge mentions across multiple sources |
| Intel service | `src/lib/research/intel/service.ts` | Orchestrate tag detection + store to Supabase |
| Rule parser | `src/lib/research/intel/rule-parser.ts` | Natural language → structured rule (LLM-parsed) |
| Data freshness | `src/lib/research/intel/freshness.ts` | TTL config per data type, 2026 season validation |
| Types | `src/lib/research/intel/types.ts` | `PlayerIntel`, `UserTag`, `UserRule`, `SourceRegistry` |

### User Tags & Rules APIs
| Route | File | What it does |
|-------|------|--------------|
| GET/POST /api/user-tags | `src/app/api/user-tags/route.ts` | CRUD user tags |
| POST /api/user-tags/batch | `src/app/api/user-tags/batch/route.ts` | Batch tag operations |
| GET/POST /api/user-rules | `src/app/api/user-rules/route.ts` | CRUD user rules |
| POST /api/user-rules/preview | `src/app/api/user-rules/preview/route.ts` | Preview rule effect on player list |

### Hooks
| Hook | File | What it does |
|------|------|--------------|
| `useUserTags()` | `src/hooks/use-user-tags.ts` | CRUD user tags with optimistic updates |
| `useUserRules()` | `src/hooks/use-user-rules.ts` | CRUD user rules + rule preview |

### Player Browser UI
| Component | File | What it does |
|-----------|------|--------------|
| Player Intel Card | `src/components/prep/ffi-player-intel-card.tsx` | Compact + expanded card with tag display |
| User Rules Editor | `src/components/prep/user-rules-editor.tsx` | Natural language rule management UI |
| Player browser page | `src/app/(app)/prep/players/client.tsx` | Full player browser with tag/ADP filters |

---

## Feature: In-Season AI Companion

**Tags:** `#inseason` `#startsit` `#waiver` `#trade` `#matchup` `#notifications`

### In-Season Engine (`src/lib/inseason/`)
| Component | File | What it does |
|-----------|------|--------------|
| Start/sit advisor | `src/lib/inseason/start-sit-advisor.ts` | Multi-source aggregation + confidence scoring |
| Waiver wire advisor | `src/lib/inseason/waiver-wire-advisor.ts` | Top pickups + FAAB bid recommendations |
| Waiver trending | `src/lib/inseason/waiver-trending.ts` | Add/drop velocity from Sleeper + ESPN |
| Trade analyzer | `src/lib/inseason/trade-analyzer.ts` | ROS value calculation + roster impact |
| Matchup preview | `src/lib/inseason/weekly-matchup-preview.ts` | Head-to-head projections + leverage plays |
| Weekly projections | `src/lib/inseason/weekly-projections.ts` | Fresh projections from all sources |
| Injury tracker | `src/lib/inseason/injury-tracker.ts` | Player status changes (Q/D/O/IR) |
| Roster sync | `src/lib/inseason/roster-sync.ts` | Connect to ESPN/Yahoo/Sleeper, pull current roster |
| Notifications | `src/lib/inseason/notifications.ts` | Push notification system (injury alerts, waiver results) |
| Matchup data | `src/lib/inseason/matchup-data.ts` | Defensive rankings, weather, Vegas lines |

### In-Season Routes
| Route | File | What it does |
|-------|------|--------------|
| POST /api/start-sit | `src/app/api/start-sit/route.ts` | Start/sit recommendation |
| POST /api/waivers/analyze | `src/app/api/waivers/analyze/route.ts` | Waiver wire analysis |
| GET /api/waivers/trending | `src/app/api/waivers/trending/route.ts` | Trending adds/drops |
| POST /api/trade | `src/app/api/trade/route.ts` | Trade evaluation |
| POST /api/matchup-preview | `src/app/api/matchup-preview/route.ts` | Weekly matchup preview |
| GET /api/injuries | `src/app/api/injuries/route.ts` | Active injury/status feed |

### In-Season Pages
| Page | Route | What it does |
|------|-------|--------------|
| Season Hub | `/season` | In-season navigation hub |
| Start/sit | `/season/start-sit` | Start/sit comparison UI |
| Waivers | `/season/waivers` | Waiver wire panel |
| Trade | `/season/trade` | Trade analyzer |
| Matchups | `/season/matchups` | Weekly matchup preview |

---

## Feature: Auth + Session Management

**Tags:** `#auth` `#supabase` `#session` `#middleware`

| Component | File | What it does |
|-----------|------|--------------|
| Auth context | `src/contexts/auth-context.ts` | React context for Supabase Auth |
| Middleware | `src/middleware.ts` | Route protection + redirects (root → /prep) |
| Dev mode bypass | `src/lib/supabase/dev-mode.ts` | `DEV_MODE=true` skips auth, returns mock user |
| Supabase client | `src/lib/supabase/client.ts` | Browser-side Supabase client |
| Supabase server | `src/lib/supabase/server.ts` | Server-side Supabase client |
| DB types | `src/lib/supabase/database.types.ts` | Generated TypeScript types for all tables |
| Strategy queries | `src/lib/supabase/strategies.ts` | Strategy CRUD + profile queries |

---

## Feature: FFI Design System (Tactical Hologram)

**Tags:** `#design` `#ui` `#components` `#tailwind` `#framer-motion`

**LOCKED — see `.claude/DESIGN_SYSTEM.md`. Do not modify without explicit approval.**

| Component | File | What it does |
|-----------|------|--------------|
| Design tokens | `src/app/globals.css` | Color palette, surface hierarchy, glassmorphism utilities |
| FFI primitives | `src/components/ui/ffi-primitives.tsx` | FFIButton, FFICard, FFIBadge, FFIProgress, FFIGrade, etc. |
| FFI motion | `src/components/ui/ffi-motion.tsx` | Framer Motion animation presets |
| Page transitions | `src/components/layout/page-transition.tsx` | Directional slide + fade transitions |
| Swipe carousel | `src/components/layout/swipe-carousel.tsx` | 3-screen swipe navigation (Prep / Draft / Settings) |
| App shell | `src/components/layout/app-shell.tsx` | Glass backdrop nav, bottom tabs, FFI branding |

---

## Tag Cloud

`#prep` `#research` `#llm` `#strategy` `#data-sources` `#live-draft` `#auction` `#espn` `#budget` `#max-bid` `#snake` `#yahoo` `#keeper` `#sheets` `#polling` `#manual-entry` `#recommendations` `#explain` `#claude-api` `#real-time` `#player-intel` `#tags` `#rules` `#sentiment` `#breakout` `#sleeper` `#bust` `#inseason` `#startsit` `#waiver` `#trade` `#matchup` `#notifications` `#auth` `#supabase` `#middleware` `#design` `#ui` `#components` `#tailwind` `#framer-motion`
