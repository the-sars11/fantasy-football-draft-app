# Fantasy Football Draft Advisor — Build Plan

Task tracking: `[ ]` = not started, `[~]` = in progress, `[x]` = complete

---

## Phase 0: Foundation (Session 1)

### Project Scaffolding
- [x] FF-001: Next.js project scaffolding (create-next-app, TypeScript, Tailwind, App Router)
- [x] FF-002: Install core deps (Supabase, Anthropic SDK, shadcn/ui, googleapis)
- [x] FF-003: shadcn/ui init + base components (button, card, dialog, table, tabs, input, select, badge)
- [x] FF-004: Supabase project setup + environment variables
- [x] FF-005: Auth flow (sign-up, sign-in, password reset) — Supabase Auth
- [x] FF-006: App shell + navigation (sidebar: Prep, Draft, Settings)
- [x] FF-007: DB migration: `users`, `leagues`, `research_runs`, `draft_sessions`, `players_cache`
- [x] FF-008: League configuration page (league name, platform, format, size, budget, roster slots, scoring format, keeper settings)
- [x] FF-008b: Mobile-first app shell refactor — bottom tab bar on mobile, sidebar on desktop, responsive layout throughout

---

## Phase 1: Data Ingestion (Session 2)

### Player Data Model
- [x] FF-009: Player data model + TypeScript types (name, team, position, bye, ADP, auction values by source, projections, injury status)

### Data Source Adapters
- [x] FF-010: ESPN unofficial API adapter — rankings, projections, auction values, ADP
- [ ] FF-011: Yahoo Fantasy API adapter — rankings, projections, auction values, ADP (OAuth flow) — DEFERRED (requires OAuth app registration)
- [x] FF-012: Sleeper API adapter — ADP, projections, player metadata, trending players
- [x] FF-013: FantasyPros scraper — ECR (Expert Consensus Rankings), tiers, auction values

### Data Pipeline
- [x] FF-014: Multi-source normalization engine — merge 3+ sources into consensus rankings + auction values per player
- [x] FF-015: Player cache layer (Supabase) — store normalized data, track freshness per source, auto-expire after 24h
- [x] FF-016: Data freshness UI indicator — show when each source was last pulled, manual refresh button

---

## Phase 2: Strategy System + Draft Prep (Sessions 3-4)

### Strategy Data Model
- [x] FF-S01: `strategies` DB table + TypeScript types — named strategy profiles with base archetype, position weights, player filters, budget allocation
- [x] FF-S02: Strategy filter schema — player targets (+weight), player avoids (-weight/exclude), team avoids, position emphasis overrides, budget allocation shifts (auction) / round targets (snake)

### AI-Proposed Strategies
- [x] FF-S03: Strategy research engine — Claude analyzes league settings + player data to propose 4-6 named strategies (e.g. WR-Heavy, Zero-RB, Hero-RB, Balanced, Stars & Scrubs, Late-Round QB) with data-backed reasoning
- [ ] FF-S04: Strategy proposal UI — present AI-generated strategies as cards with: name, philosophy, key targets, position allocation, risk profile, projected ceiling/floor, "why this works in your league" reasoning
- [ ] FF-S05: Strategy comparison view — side-by-side comparison of 2-3 strategies showing position allocation, key player differences, risk/reward tradeoffs

### Interactive Strategy Tailoring
- [ ] FF-S06: Strategy editor UI — modify any base strategy with interactive filters: target specific players (weight slider), avoid players/teams (toggle + severity), adjust position emphasis (sliders), shift budget allocation (auction) / round priority (snake)
- [ ] FF-S07: Real-time value preview — as user adjusts filters, show how auction values / draft rankings shift for key players (top 5 changes highlighted)
- [ ] FF-S08: Save strategy profiles — save base strategy as-is, or save tailored version as named profile. Multiple profiles per league. Mark one as "active"

### Research Pipeline
- [ ] FF-017: Research pipeline orchestrator (configure → ingest → normalize → analyze through active strategy → output)

### LLM Analysis Prompts (Strategy-Aware)
- [ ] FF-019: Positional rankings — Claude analyzes consensus data through lens of active strategy + league settings
- [ ] FF-020: Auction value adjustments (auction) / Round value mapping (snake) — floor/ceiling/target per player, weighted by strategy filters
- [ ] FF-021: Target list (best value plays given active strategy) + Avoid list (overpriced/risky/filtered out) with reasoning
- [ ] FF-022: Tier analysis — where value drops off by position, tier breaks, strategy-adjusted
- [ ] FF-023: Sleeper picks — undervalued based on trend data + expert disagreement + strategy alignment

### Draft Board UI
- [ ] FF-024: Draft board view — sortable/filterable table (by position, tier, value, target/avoid, auction range or round). Active strategy badge shown. Strategy-adjusted values highlighted
- [ ] FF-025: Position breakdown view — top players by position with tier coloring + value indicators + strategy alignment score

### Run Management
- [ ] FF-026: Run save to Supabase (full snapshot: league config, active strategy profile, all analysis results, timestamp)
- [ ] FF-027: Run history page — list saved runs, load any run, compare side-by-side (including strategy differences)
- [ ] FF-028: "Refresh" action — re-pull all data sources, re-run LLM analysis with same strategy, save as new run

### Keeper Support
- [ ] FF-029: Keeper integration — mark kept players + their costs/rounds, remove from pool, adjust remaining values

---

## Phase 3: Live Draft Mode (Sessions 5-6)

### Shared Infrastructure (Both Formats)
- [ ] FF-030: Draft setup page — select league, choose active strategy profile, enter manager names, import keeper assignments
- [ ] FF-031: Google Sheets API integration — connect to draft sheet, configure column mapping
- [ ] FF-032: Sheet polling engine — check for new rows every 5-10 seconds, detect new picks, trigger state update
- [ ] FF-033: Manual pick entry fallback — quick-entry UI (search player → enter pick details → assign to manager)
- [ ] FF-034: Remaining player pool — live-updated list showing available players with strategy-adjusted values/rankings
- [ ] FF-035: Position scarcity tracker — count remaining startable players per position per tier
- [ ] FF-036: "Why?" explainability — expandable reasoning on every recommendation (cites data, scarcity, tendencies, active strategy)
- [ ] FF-037: Your roster panel — show current picks, position needs, grade vs. strategy plan
- [ ] FF-038: League overview panel — all managers' rosters at a glance
- [ ] FF-039: Manager tendency tracker — track each manager's patterns (positions targeted, spending/pick behavior)

### Mid-Draft Strategy Pivot System
- [ ] FF-P01: Strategy swap UI — one-tap to switch active strategy profile during live draft. All values/targets/recommendations recalculate instantly
- [ ] FF-P02: Draft flow monitor — continuous analysis of draft state: track position runs, value anomalies, spending patterns, remaining player pool quality by position
- [ ] FF-P03: Proactive pivot alerts — app detects when draft conditions favor a different strategy than active one. Alert: "Draft favors pivot to [strategy] — [reasoning]. [3 key opportunities]." Accept (swaps strategy) / Dismiss / Snooze (remind in N picks)
- [ ] FF-P04: Strategy impact preview — before accepting a pivot, show: "Switching to [strategy] changes your top 3 targets to X, Y, Z and adjusts budget allocation to [new split]"
- [ ] FF-P05: Pivot history log — track all strategy changes during draft with timestamp, reason, and what the app recommended vs. what user chose

### Auction Mode (Joe / ESPN)
- [ ] FF-040: Auction state machine — per-manager budget remaining, roster slots filled, picks made
- [ ] FF-041: Per-pick LLM recommendation — "top 3 targets now" with strategy-adjusted auction values
- [ ] FF-042: Max bid calculator — "bid up to $X" based on remaining budget, needs, alternatives, active strategy
- [ ] FF-043: Adaptive budget strategy — detect ahead/behind spending plan, suggest pivots with specific strategy profile recommendations
- [ ] FF-044: Position urgency + budget warnings — "only 3 startable RBs left under $25" contextualized by active strategy

### Snake Mode (Tyler / Yahoo)
- [ ] FF-045: Snake state machine — track draft order, current round, picks per round, compensatory picks
- [ ] FF-046: "Best available at your next pick" — project who'll be available X picks away based on other managers' needs + active strategy
- [ ] FF-047: Pick-by-pick LLM recommendation — at your pick: ranked by position need + value over replacement + strategy alignment
- [ ] FF-048: Keeper round-cost tracking — show where keepers slot in, flag keeper value vs. ADP
- [ ] FF-049: Trade-up/down suggestions — "if you trade up 2 spots, you can grab X before manager Y"

---

## Phase 4: Polish (Session 7)

### UI/UX
- [ ] FF-050: Dark mode (default) + light mode toggle
- [ ] FF-052: Loading states, error handling, empty states throughout

### Post-Draft
- [ ] FF-053: Post-draft review — grade your draft vs. active strategy targets, show deviations + why, compare to original strategy vs. any mid-draft pivots
- [ ] FF-054: Export draft results (CSV, shareable link)

### Performance
- [ ] FF-055: Minimize LLM latency during live draft (streaming responses, state deltas only, strategy swap = incremental recalc not full re-run)
