# CLAUDE.md — Fantasy Football Draft Advisor

## Project Overview
Fantasy draft prep + live draft advisor app for Joe Rasar (ESPN, auction, full redraft) and Tyler Young (Yahoo, snake draft, keeper league). Two modes: Prep Mode (research + strategy) and Live Draft Mode (real-time adaptive recommendations).

## Tech Stack
| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) + React + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (New York style) |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Claude API (@anthropic-ai/sdk) |
| Data Sources | ESPN API, Yahoo Fantasy API, Sleeper API, FantasyPros |
| Google Sheets | googleapis (live draft sheet polling) |
| Icons | Lucide React |
| Testing | Vitest + React Testing Library |
| Hosting | Vercel (free tier) |

## Folder Structure
```
src/
├── app/
│   ├── (auth)/                # Sign in/up (Supabase Auth)
│   ├── (app)/
│   │   ├── prep/              # Draft prep mode
│   │   │   ├── configure/     # League settings
│   │   │   ├── research/      # Run analysis
│   │   │   ├── board/         # Draft board view
│   │   │   └── runs/          # Saved run history + compare
│   │   ├── draft/             # Live draft mode
│   │   │   ├── setup/         # Connect sheet, set managers/keepers
│   │   │   ├── live/          # Real-time tracking + advisor
│   │   │   └── review/        # Post-draft analysis
│   │   └── settings/          # User preferences
│   └── api/
│       ├── research/          # Data ingestion + LLM analysis
│       ├── draft/             # Live draft state + recommendations
│       ├── players/           # Player data cache
│       └── sheets/            # Google Sheets polling
├── components/
│   ├── ui/                    # shadcn/ui base components
│   ├── prep/                  # Prep mode components
│   ├── draft/                 # Live draft components
│   └── layout/                # Shell, nav
├── lib/
│   ├── supabase/              # DB queries + auth helpers
│   ├── research/              # Research pipeline
│   │   ├── sources/           # Data source adapters (ESPN, Yahoo, Sleeper, FantasyPros)
│   │   ├── normalize.ts       # Multi-source merge into consensus
│   │   ├── analyze.ts         # LLM analysis layer
│   │   └── service.ts         # Pipeline orchestrator
│   ├── draft/                 # Live draft engine
│   │   ├── state.ts           # Draft state machine (auction + snake)
│   │   ├── recommend.ts       # Real-time LLM recommendations
│   │   ├── tendencies.ts      # Manager tendency tracking
│   │   ├── keepers.ts         # Keeper logic
│   │   └── explain.ts         # Explainability layer
│   ├── sheets/                # Google Sheets API integration
│   ├── players/               # Player types + cache
│   └── utils.ts               # Shared utilities (cn, etc.)
├── hooks/
│   ├── use-draft-state.ts
│   └── use-research.ts
└── contexts/
    └── auth-context.ts
supabase/
└── migrations/
docs/                          # Planning docs
.claude/                       # Dev workflow files
```

## Database Schema
| Table | Purpose |
|-------|---------|
| `users` | Auth + profile (Supabase Auth) |
| `leagues` | League config (platform, format, size, budget, roster, scoring, keeper rules) |
| `players_cache` | Normalized player data from all sources, freshness timestamps |
| `research_runs` | Saved prep runs (league_id, strategy settings, timestamp) |
| `research_results` | Per-run analysis (rankings, values, targets, avoids, tiers) |
| `draft_sessions` | Live draft sessions (league_id, sheet_url, format, status) |
| `draft_picks` | Individual picks (session_id, player_id, manager, price/round, pick_number) |
| `draft_recommendations` | LLM recommendations per pick (targets, reasoning, confidence) |
| `manager_profiles` | Per-draft manager tracking (name, budget/picks, roster, tendency scores) |

## Code Standards
- **TypeScript:** Strict mode, no `any`, interfaces for objects, types for unions
- **React/Next.js:** Server Components by default, `use server` for mutations, loading.tsx / error.tsx patterns
- **Styling:** Tailwind only, dark mode default, shadcn/ui patterns
- **API routes:** Input validation, consistent error format `{ error: string, details?: any }`
- **Database:** Typed Supabase helpers, RLS policies, migrations tracked
- **LLM:** Claude synthesizes from real data only, never invents stats. Every recommendation cites source data. All outputs tagged `source: "llm" | "fallback"`
- **Testing:** Vitest with jsdom, unit tests in `src/**/*.test.ts`

## Session Protocol
1. Find work in `BUILD_PLAN.md` — first unchecked `[ ]` task in highest priority phase
2. Implement following existing patterns in the codebase
3. Test with `npm run build`
4. Commit with functional prefix (feat/fix/refactor/docs/chore/style)
5. Mark `[x]` in BUILD_PLAN.md and update `WORKING_STATE.md`
6. Report what to test

## Commit Format
```
feat: Brief description (50 chars max)

- Specific change 1
- Specific change 2

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Dev Commands
```bash
npm run dev          # Start dev server (localhost:3003)
npm run build        # Production build
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run format       # Prettier on src/
npm run type-check   # TypeScript check (no emit)
npm run test         # Vitest watch
npm run test:run     # Vitest single run
npm run test:coverage # Coverage report
```

## Key Design Decisions
1. **Both draft formats** — Auction (Joe/ESPN) and Snake (Tyler/Yahoo). Prep outputs differ per format.
2. **Multi-platform** — ESPN + Yahoo adapters. League config stores platform.
3. **Keeper support** — Optional. Mark kept players + costs/rounds, exclude from pool.
4. **LLM bounded** — Claude analyzes real data, never hallucinates stats. Same as stock-evaluation-engine.
5. **Explainability first-class** — Every recommendation has a `reasoning` field. "Why?" button everywhere.
6. **Google Sheets primary draft input** — Polls shared sheet for new picks. Manual entry fallback.
7. **Incremental LLM calls** — Small focused Claude calls per pick during live draft. Fast + cheap.
8. **Multi-source consensus** — Average 3+ ranking sources for baseline, LLM adjusts for league context.
