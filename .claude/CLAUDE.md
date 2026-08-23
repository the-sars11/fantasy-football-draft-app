# CLAUDE.md — Fantasy Football Draft Advisor

## Project Overview
Personal live-draft advisor for Joe Rasar's Nasties 12-team, $200, PPR, no-kicker ESPN auction draft. Advises Joe (what to do, max bid, budget/pace) and records results. Picks arrive live from the deployed auctioneer app (system of record). Two modes: Prep Mode (research + strategy) and Live Draft Mode (real-time auction advisor).

## Tech Stack
| Layer | Tech |
|-------|------|
| Framework | Next.js (App Router) + React + TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui (New York style) |
| Database | Supabase (PostgreSQL + Auth) |
| AI | Claude API (@anthropic-ai/sdk) |
| Data Sources | ESPN API, Sleeper API, FantasyPros |
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
│   │   │   ├── research/      # DEAD 404 -- analysis runs from /prep hub, not /prep/research
│   │   │   ├── board/         # Draft board view
│   │   │   └── runs/          # Saved run history + compare
│   │   ├── draft/             # Live draft mode
│   │   │   ├── setup/         # Draft setup (fallback when auctioneer not live)
│   │   │   ├── live/          # Real-time tracking + advisor
│   │   │   └── review/        # Post-draft analysis
│   │   └── settings/          # User preferences
│   └── api/
│       ├── auctioneer-feed/   # Proxy to auctioneer /api/state (CORS-dodge)
│       ├── research/          # Data ingestion + LLM analysis
│       ├── draft/             # Live draft state + recommendations
│       └── players/           # Player data cache
├── components/
│   ├── ui/                    # shadcn/ui base components
│   ├── prep/                  # Prep mode components
│   ├── draft/                 # Live draft components
│   └── layout/                # Shell, nav
├── lib/
│   ├── supabase/              # DB queries + auth helpers
│   ├── research/              # Research pipeline
│   │   ├── sources/           # Data source adapters (ESPN, Sleeper, FantasyPros)
│   │   ├── normalize.ts       # Multi-source merge into consensus
│   │   ├── analyze.ts         # LLM analysis layer
│   │   └── service.ts         # Pipeline orchestrator
│   ├── draft/                 # Live draft engine
│   │   ├── state.ts           # Draft state machine + offline resync
│   │   ├── what-to-do.ts      # HOLD/BID/PUSH/PASS advisor (rule-based, $0)
│   │   ├── auction-advisor.ts # Max bid, budget analysis, scarcity
│   │   ├── auction-feed-merge.ts  # pickId dedup, multi-source merge
│   │   ├── recommend.ts       # LLM recommendations (optional, costs Claude)
│   │   ├── tendencies.ts      # Manager tendency tracking
│   │   └── explain.ts         # Explainability layer
│   ├── players/               # Player types + cache
│   └── utils.ts               # Shared utilities (cn, etc.)
├── hooks/
│   ├── use-remote-auctioneer-feed.ts  # ~3s poll of server proxy; LIVE/STALE/OFFLINE
│   ├── use-auctioneer-feed.ts         # Same-device BroadcastChannel
│   ├── use-draft-state.ts             # Draft state machine + persistence
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
| `leagues` | League config (platform, format, size, budget, roster, scoring) |
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

> On major feature work or architectural decisions, read `NORTH_STAR.md` first.

## One-Plan Rule

There is exactly one plan: `.claude/BUILD_PLAN.md`. New directions go in that file as active work or dated decision records. No standalone plan docs. Design specs live in `DESIGN_SYSTEM.md`. Working state (thin pointer) lives in `.claude/WORKING_STATE.md`. Change audit trail lives in `.claude/CHANGELOG.md`.

## Commit Format
```
feat: Brief description (50 chars max)

- Specific change 1
- Specific change 2
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
1. **Auction only** -- Joe/ESPN, Nasties 12-team, $200, PPR, no-kicker, full redraft. No snake, no keeper, no Tyler's league.
2. **ESPN only** -- No Yahoo adapter. The Nasties league is on ESPN.
3. **No keeper support** -- Nasties is full redraft. Keeper code is dead (removed in DR-2).
4. **LLM bounded** -- Claude analyzes real data, never hallucinates stats. Same as stock-evaluation-engine.
5. **Rule-based advisor first** -- What-To-Do, max bid, and budget/pace are 100% rule-based ($0). LLM panels are optional and confirm-gated (DR-3).
6. **Auctioneer feed is the live draft input** -- Server proxy at `src/app/api/auctioneer-feed/route.ts` polls the deployed auctioneer app. Manual pick entry is the fallback.
7. **Incremental LLM calls** -- Small focused Claude calls per pick during live draft. Fast + cheap. Confirm-gated (DR-3).
8. **Multi-source consensus** -- Average 3+ ranking sources for baseline, LLM adjusts for league context.

---

## Git Commit Protocol

1. **Always use descriptive, functional commit messages** — explain WHAT changed, not just which files.
2. **Format:**
   ```
   <type>: <short functional description>

   - Specific changes
   - What was added/fixed/changed
   ```
   Types: `feat`, `fix`, `refactor`, `docs`, `chore`
3. **Commit after each completed task** — one fix = one commit = one deploy.
4. **Push immediately after commit** — never leave unpushed work.
5. **Session end:** Commit all changes, push, confirm clean state.

---

## Dev Workflow — Enterprise Tier

### Change Classification

Every change must be classified before work begins. The classification determines which Review Lenses apply and what testing is required.

| Class | Examples | Triggered Lenses |
|-------|----------|-----------------|
| output | Report content, UI layouts, email templates | Delivery, QA |
| pipeline | Data processing, API integration, polling | Architecture, QA, Security |
| shared | Shared components, utilities, hooks | Architecture, QA |
| schema | DB migrations, API contracts | Architecture, Security, Ops |
| prompt | LLM prompt changes, AI behavior | QA, Delivery |
| infra | Deploy config, CI/CD, env setup | Ops, Security |
| docs | Documentation, README, guides | Delivery |
| bugfix | Bug fixes, hotfixes | QA |

---

### PROPOSE / PATCH / VERIFY Workflow

Every non-trivial change follows this three-phase discipline.

**PROPOSE (before writing code):**
1. Classify the change (see Change Classification above)
2. Identify triggered Review Lenses (see `.claude/REVIEW_LENSES.md`)
3. Declare scope — which files will be touched, what will NOT change
4. Run pre-checks for each triggered lens
5. State a concrete success criterion (e.g., "failing test passes", "feature works on mobile at arm's length")

**PATCH (implementation):**
1. Execute changes matching declared scope exactly
2. Do not exceed declared scope without re-proposing

**VERIFY (after implementation):**
1. Show concretely how the success criterion is satisfied
2. Run: `npm run test:run` and `npm run lint`
3. Complete checklist for each triggered Review Lens
4. Prove completion with command output, not claims

---

### 6 Review Lenses

See `.claude/REVIEW_LENSES.md` for full pre-check and verify checklists.

| Lens | Triggered By |
|------|-------------|
| Architecture | pipeline, shared, schema changes |
| QA | ALL change classes |
| Security | pipeline, schema, infra |
| Delivery | output, prompt, docs |
| Design | output (if UI) |
| Ops | infra, schema |

---

### Bug Hunt Schedule

| Cadence | Mode | Scope | Last Run | Next Run |
|---------|------|-------|----------|----------|
| Per-sprint | `free` ($0, static) | Changed modules | 2026-08-13 | next sprint |
| Monthly | `full` (tests + build) | Full project | 2026-08-22 (R13 closeout: 0 CRIT, 0 HIGH, 1 MED, 4 LOW -- all non-core) | 2026-09-22 |

Run: `/bug-hunt free` or `/bug-hunt full`

---

### Evidence-Based Output Standard

All LLM-generated content and AI recommendations must meet this bar:
- **No fabricated data** — every stat must have a real source (already enforced in existing rules)
- **Ranges with stated assumptions**, not point estimates
- **Cited sources** — inline attribution required on recommendations
- **Claim Registry** — for audit: track every factual claim that drives a recommendation
- If data is unavailable, say so explicitly. Never fill gaps with plausible-sounding fiction.

---

### Codebase Navigation Index

Use index files to find code locations instead of reading full files.

| File | Purpose |
|------|---------|
| `.claude/FEATURES_INDEX.md` | Feature → code location + searchable tags |
| `.claude/CODE_AREAS.md` | Function/endpoint/component index with line numbers |
| `.claude/REVIEW_LENSES.md` | 6 Review Lenses pre-check + verify checklists |
| `.claude/CHANGELOG.md` | Change audit trail with root cause |

---

### Definition of Done

A task is not done until:
- [ ] Code committed with descriptive message
- [ ] `npm run test:run` passes
- [ ] `npm run lint` passes
- [ ] BUILD_PLAN.md item marked `[x]`
- [ ] WORKING_STATE.md updated (current state accurate)
- [ ] CHANGELOG.md entry added
- [ ] Triggered Review Lens checklists completed

---

## CI Note

Never mention GitHub Actions, GitHub billing, spending limits, or paying GitHub. Local pre-commit gate is the only CI. The `.github/workflows/ci.yml` has been permanently removed.

---

## Git Push — Pre-Existing Test Failures (`--no-verify` pre-approved)

If `git push` is blocked by failing tests that (a) were already failing before this session and (b) fail for environmental/external reasons (API quota, network), use `git push --no-verify` immediately — **do NOT stop to ask Joe.**

Conditions that must ALL be true: (1) I did not write or touch the failing test files this session. (2) The failure is environmental, not a regression in code I changed. (3) All tests I wrote this session still pass.
