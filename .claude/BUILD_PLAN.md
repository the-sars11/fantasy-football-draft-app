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

---

## Phase 1: Data Ingestion (Session 2)

### Player Data Model
- [ ] FF-009: Player data model + TypeScript types (name, team, position, bye, ADP, auction values by source, projections, injury status)

### Data Source Adapters
- [ ] FF-010: ESPN unofficial API adapter — rankings, projections, auction values, ADP
- [ ] FF-011: Yahoo Fantasy API adapter — rankings, projections, auction values, ADP (OAuth flow)
- [ ] FF-012: Sleeper API adapter — ADP, projections, player metadata, trending players
- [ ] FF-013: FantasyPros scraper — ECR (Expert Consensus Rankings), tiers, auction values

### Data Pipeline
- [ ] FF-014: Multi-source normalization engine — merge 3+ sources into consensus rankings + auction values per player
- [ ] FF-015: Player cache layer (Supabase) — store normalized data, track freshness per source, auto-expire after 24h
- [ ] FF-016: Data freshness UI indicator — show when each source was last pulled, manual refresh button

---

## Phase 2: Draft Prep / Research Mode (Sessions 3-4)

### Pipeline
- [ ] FF-017: Research pipeline orchestrator (configure → ingest → normalize → analyze → output)

### Strategy Configuration
- [ ] FF-018: Strategy configuration UI — position priority weights (sliders), risk tolerance, preferred tiers, stack preferences, budget allocation (auction) / round targets (snake)

### LLM Analysis Prompts
- [ ] FF-019: Positional rankings — Claude analyzes consensus data through lens of user's strategy + league settings
- [ ] FF-020: Auction value adjustments (auction) / Round value mapping (snake) — floor/ceiling/target per player
- [ ] FF-021: Target list (best value plays) + Avoid list (overpriced/risky) with reasoning
- [ ] FF-022: Tier analysis — where value drops off by position, tier breaks
- [ ] FF-023: Sleeper picks — undervalued based on trend data + expert disagreement

### Draft Board UI
- [ ] FF-024: Draft board view — sortable/filterable table (by position, tier, value, target/avoid, auction range or round)
- [ ] FF-025: Position breakdown view — top players by position with tier coloring + value indicators

### Run Management
- [ ] FF-026: Run save to Supabase (full snapshot: league config, strategy settings, all analysis results, timestamp)
- [ ] FF-027: Run history page — list saved runs, load any run, compare side-by-side
- [ ] FF-028: "Refresh" action — re-pull all data sources, re-run LLM analysis with same strategy, save as new run

### Keeper Support
- [ ] FF-029: Keeper integration — mark kept players + their costs/rounds, remove from pool, adjust remaining values

---

## Phase 3: Live Draft Mode (Sessions 5-6)

### Shared Infrastructure (Both Formats)
- [ ] FF-030: Draft setup page — select league, choose format (auction/snake), enter manager names, import keeper assignments
- [ ] FF-031: Google Sheets API integration — connect to draft sheet, configure column mapping
- [ ] FF-032: Sheet polling engine — check for new rows every 5-10 seconds, detect new picks, trigger state update
- [ ] FF-033: Manual pick entry fallback — quick-entry UI (search player → enter pick details → assign to manager)
- [ ] FF-034: Remaining player pool — live-updated list showing available players with adjusted values/rankings
- [ ] FF-035: Position scarcity tracker — count remaining startable players per position per tier
- [ ] FF-036: "Why?" explainability — expandable reasoning on every recommendation (cites data, scarcity, tendencies, strategy)
- [ ] FF-037: Your roster panel — show current picks, position needs, grade vs. plan
- [ ] FF-038: League overview panel — all managers' rosters at a glance
- [ ] FF-039: Manager tendency tracker — track each manager's patterns (positions targeted, spending/pick behavior)

### Auction Mode (Joe / ESPN)
- [ ] FF-040: Auction state machine — per-manager budget remaining, roster slots filled, picks made
- [ ] FF-041: Per-pick LLM recommendation — "top 3 targets now" with adjusted auction values
- [ ] FF-042: Max bid calculator — "bid up to $X" based on remaining budget, needs, alternatives
- [ ] FF-043: Adaptive budget strategy — detect ahead/behind spending plan, suggest pivots
- [ ] FF-044: Position urgency + budget warnings — "only 3 startable RBs left under $25"

### Snake Mode (Tyler / Yahoo)
- [ ] FF-045: Snake state machine — track draft order, current round, picks per round, compensatory picks
- [ ] FF-046: "Best available at your next pick" — project who'll be available X picks away based on other managers' needs
- [ ] FF-047: Pick-by-pick LLM recommendation — at your pick: ranked by position need + value over replacement
- [ ] FF-048: Keeper round-cost tracking — show where keepers slot in, flag keeper value vs. ADP
- [ ] FF-049: Trade-up/down suggestions — "if you trade up 2 spots, you can grab X before manager Y"

---

## Phase 4: Polish (Session 7)

### UI/UX
- [ ] FF-050: Dark mode (default) + light mode toggle
- [ ] FF-051: Mobile-responsive layout (prep mode + live draft)
- [ ] FF-052: Loading states, error handling, empty states throughout

### Post-Draft
- [ ] FF-053: Post-draft review — grade your draft, compare to pre-draft targets, show deviations + why
- [ ] FF-054: Export draft results (CSV, shareable link)

### Performance
- [ ] FF-055: Minimize LLM latency during live draft (streaming responses, state deltas only)
