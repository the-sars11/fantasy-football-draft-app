# Architecture — Fantasy Football Draft Advisor

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js App Router (React Server Components + Client)       │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐      │
│  │  Prep Mode   │  │  Live Draft  │  │   Settings    │      │
│  │  - Configure │  │  - Auction   │  │  - League     │      │
│  │  - Research  │  │  - Snake     │  │  - Strategy   │      │
│  │  - Board     │  │  - Sheets    │  │  - Account    │      │
│  │  - Runs      │  │  - Manual    │  │               │      │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘      │
│         │                 │                                   │
└─────────┼─────────────────┼───────────────────────────────────┘
          │                 │
          ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      API LAYER                               │
│  Next.js API Routes (/api/*)                                 │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/research │  │ /api/draft   │  │ /api/players │      │
│  │  - ingest     │  │  - state     │  │  - cache     │      │
│  │  - analyze    │  │  - recommend │  │  - refresh   │      │
│  │  - runs       │  │  - picks     │  │  - search    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                 │                  │                │
└─────────┼─────────────────┼──────────────────┼────────────────┘
          │                 │                  │
          ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVICE LAYER                             │
│                                                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Research Pipeline│  │ Draft Engine    │                   │
│  │  sources/ →      │  │  state.ts →     │                   │
│  │  normalize.ts →  │  │  recommend.ts → │                   │
│  │  analyze.ts      │  │  tendencies.ts  │                   │
│  │                  │  │  explain.ts     │                   │
│  └────────┬─────────┘  └────────┬────────┘                   │
│           │                     │                             │
│           ▼                     ▼                             │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ Claude API      │  │ Google Sheets   │                   │
│  │ (Anthropic SDK) │  │ API (polling)   │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA LAYER                                │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │              Supabase (PostgreSQL)            │           │
│  │                                               │           │
│  │  users │ leagues │ players_cache              │           │
│  │  research_runs │ research_results             │           │
│  │  draft_sessions │ draft_picks                 │           │
│  │  draft_recommendations │ manager_profiles     │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │          External Data Sources                │           │
│  │                                               │           │
│  │  ESPN API │ Yahoo API │ Sleeper API           │           │
│  │  FantasyPros │ Boris Chen │ Reddit            │           │
│  └──────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Data Pipeline (Prep Mode)

```
[Configure League]
       │
       ▼
[Ingest Data] ─── ESPN adapter ──┐
       │          Yahoo adapter ──┤
       │          Sleeper adapter ┤
       │          FantasyPros ────┘
       │                   │
       ▼                   ▼
[Normalize] ← Merge sources into consensus rankings + values
       │
       ▼
[Analyze (LLM)] ← Claude applies strategy preferences
       │
       ├── Positional rankings
       ├── Auction values / Round targets
       ├── Target list + Avoid list
       ├── Tier breaks
       └── Sleeper picks
       │
       ▼
[Draft Board] → Save as Run → Load / Compare / Refresh
```

## Live Draft Engine

```
[Draft Sheet / Manual Entry]
       │
       ▼
[Pick Detected] → Update State Machine
       │
       ├── Budget/pick tracking (all managers)
       ├── Position scarcity recalc
       ├── Manager tendency update
       └── Remaining player pool update
       │
       ▼
[LLM Recommendation] ← Incremental call with state delta
       │
       ├── Top 3 targets (with adjusted values)
       ├── Max bid / best available at next pick
       ├── Urgency warnings
       ├── Strategy pivot suggestions
       └── "Why?" reasoning for each
       │
       ▼
[Display] → Advisor panel + Roster panel + League overview
```

## LLM Integration Pattern

- Claude is **bounded**: synthesizes analysis from real data only
- Never invents stats, projections, or player information
- Every recommendation cites which data points drove it
- All outputs tagged `source: "llm" | "fallback"` for transparency
- Graceful fallback text if API unavailable
- Incremental calls during live draft (~500 tokens in, ~200 out per pick)
- Streaming responses for real-time feel during live draft

## Auth Flow

```
Supabase Auth (email/password)
       │
       ▼
[Middleware] → Check auth → Redirect if not authenticated
       │
       ▼
[RLS Policies] → Users can only access their own leagues, runs, drafts
```
