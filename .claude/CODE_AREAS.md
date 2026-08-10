# Code Areas Index -- Fantasy Football Draft Advisor

**Last Updated:** 2026-08-10

Detailed **function and endpoint index** with approximate line numbers.

---

## API Endpoints

### Auctioneer Feed (the live draft input)

| Endpoint | Method | File | Description |
|----------|--------|------|-------------|
| `/api/auctioneer-feed` | GET | `auctioneer-feed/route.ts` | Server proxy to auctioneer /api/state (CORS-dodge) |

### Draft Endpoints (`src/app/api/draft/`)

| Endpoint | Method | File | Description |
|----------|--------|------|-------------|
| `/api/draft/recommend` | POST | `draft/recommend/route.ts` | LLM recommendation -- top targets with max bids (costs Claude) |
| `/api/draft/sessions` | POST | `draft/sessions/route.ts` | Create new draft session |
| `/api/draft/sessions/[id]` | GET/PATCH | `draft/sessions/[id]/route.ts` | Get or update session state + picks |

**Dead:** `POST /api/draft/sheets` -- Google Sheets proxy, removed in DR-2.

### Research Endpoints (`src/app/api/`)

| Endpoint | Method | File | Description |
|----------|--------|------|-------------|
| `/api/research` | POST | `research/route.ts` | Run full research pipeline (deterministic, $0) |
| `/api/research/[runId]` | GET | `research/[runId]/route.ts` | Get saved run results |
| `/api/players` | GET | `players/route.ts` | Fetch player cache |
| `/api/players/refresh` | POST | `players/refresh/route.ts` | Force-refresh player data from sources |
| `/api/players/status` | GET | `players/status/route.ts` | Player status/injury feed |
| `/api/players/weekly` | GET | `players/weekly/route.ts` | Weekly projections |
| `/api/strategies` | GET/POST | `strategies/route.ts` | CRUD strategy profiles |
| `/api/strategies/propose` | POST | `strategies/propose/route.ts` | AI-generate strategy proposals (costs Claude -- confirm-gated) |
| `/api/leagues` | GET/POST | `leagues/route.ts` | CRUD league configurations |

### Player Intelligence Endpoints

| Endpoint | Method | File | Description |
|----------|--------|------|-------------|
| `/api/user-tags` | GET/POST/DELETE | `user-tags/route.ts` | User tag CRUD |
| `/api/user-tags/batch` | POST | `user-tags/batch/route.ts` | Batch tag operations |
| `/api/user-rules` | GET/POST/DELETE | `user-rules/route.ts` | User rule CRUD |
| `/api/user-rules/preview` | POST | `user-rules/preview/route.ts` | Preview rule effect on player list |

---

## Core Functions

### Draft State Machine (`src/lib/draft/state.ts`)

| Function | Lines (approx) | Purpose |
|----------|-------|---------|
| `createInitialState()` | ~50-100 | Initialize draft state for auction |
| `applyPick()` | ~100-140 | Immutably apply a pick, update manager state |
| `reconcileWithAuctioneerPicks()` | ~140-200 | Offline resync -- auctioneer picks win on conflict |
| `getDraftedPlayerNames()` | ~200-220 | Returns Set<string> of all drafted player names |
| `getPositionNeeds()` | ~220-240 | Per-manager unfilled position slots |
| `getRemainingBudget()` | ~240-255 | Manager's budget remaining |
| `getMaxBid()` | ~255-270 | Maximum safe bid given remaining picks |

**Key interfaces:**
- `DraftPick` -- player_name, manager, price, round, pick_number
- `ManagerState` -- picks, budget_remaining, roster_count
- `DraftState` -- format, picks, managers, roster_slots

### What-To-Do Advisor (`src/lib/draft/what-to-do.ts`)

| Function | Lines (approx) | Purpose |
|----------|-------|---------|
| `getWhatToDo()` | main export | HOLD/BID/PUSH/PASS + max_bid + rationale; rule-based, $0 |

### Auction Advisor (`src/lib/draft/auction-advisor.ts`)

| Function | Lines (approx) | Purpose |
|----------|-------|---------|
| `calculateMaxBidAdvice()` | 28-146 | Context-aware max bid (strategy score, need, alternatives, budget) |
| `analyzeBudgetStrategy()` | 161-202 | Ahead/behind pace analysis with suggestion |
| `getPositionUrgencyWarnings()` | 215-267 | Scarcity alerts by position + budget threshold |
| `getPositionBudgetBreakdown()` | ~270-310 | Per-position spend vs. planned budget |

**Key interfaces:**
- `MaxBidResult` -- ~16-20
- `BudgetAnalysis` -- ~150-159
- `PositionUrgencyWarning` -- ~206-213

### Feed Merge (`src/lib/draft/auction-feed-merge.ts`)

| Function | Purpose |
|----------|---------|
| main merge fn | pickId dedup, multi-source priority merge (auctioneer > same-device > manual) |

### Explainability Engine (`src/lib/draft/explain.ts`)

| Function | Lines (approx) | Purpose |
|----------|-------|---------|
| `calculateScarcity()` | 46-81 | Tier counts by position (critical/low/moderate/abundant) |
| `calculateScarcityExtended()` | 87-119 | + spend ranges and avg values for auction UI |
| `explainPlayer()` | 124-302 | Full explanation: strategy fit, scarcity, need, value, risk |

---

## React Hooks (`src/hooks/`)

| Hook | File | What it does |
|------|------|--------------|
| `useRemoteAuctioneerFeed()` | `use-remote-auctioneer-feed.ts` | ~3s poll of the server proxy; LIVE/STALE/OFFLINE status; backoff |
| `useAuctioneerFeed()` | `use-auctioneer-feed.ts` | Same-device BroadcastChannel listener |
| `useDraftState()` | `use-draft-state.ts` | Full draft state: state machine + auctioneer feed + manual picks + Supabase persistence |
| `useResearch()` | `use-research.ts` | Research pipeline hook (run, status, results) |
| `useUserTags()` | `use-user-tags.ts` | User tag CRUD with optimistic updates |
| `useUserRules()` | `use-user-rules.ts` | User rule CRUD + preview |
| `useDraftSimulator()` | `use-draft-simulator.ts` | Dry-run simulation against the Nasties roster shape |
| `useAutoRecommend()` | `use-auto-recommend.ts` | Auto-trigger LLM recommendations at configurable intervals |

---

## UI Components

### Live Room (`src/components/draft/live-room/`)

| Component | File | Purpose |
|-----------|------|---------|
| `AuctionRoom` | `auction-room.tsx` | Top-level room shell; scoped theme |
| `StatusBar` | `status-bar.tsx` | LIVE/STALE/OFFLINE + manager names |
| `OnTheBlockCard` | `on-the-block-card.tsx` | Nomination hero + What-To-Do advice |
| `AwarenessStrip` | `awareness-strip.tsx` | Dangerous manager awareness |
| `BudgetStrip` | `budget-strip.tsx` | Joe's budget + pace |
| `TierContext` | `tier-context.tsx` | Tier scarcity context |
| `MyTeamRoster` | `my-team-roster.tsx` | Joe's picks in progress |
| `BottomNav` | `bottom-nav.tsx` | In-room navigation |
| `BlockPickerSheet` | `block-picker-sheet.tsx` | Manual pick entry |
| `FixPickSheet` | `fix-pick-sheet.tsx` | Correct a wrong price |
| `ResearchView` | `research-view.tsx` | Research tab inside the room |

### Prep Components (`src/components/prep/`)

| Component | File | Purpose |
|-----------|------|---------|
| `DraftBoardTable` | `draft-board-table.tsx` | Sortable/filterable player board |
| `FFIPlayerIntelCard` | `ffi-player-intel-card.tsx` | Player card with tag badges |
| `LeagueConfigForm` | `league-config-form.tsx` | League settings form |
| `PositionBreakdown` | `position-breakdown.tsx` | Top players per position with tier coloring |
| `StrategyEditor` | `strategy-editor.tsx` | Interactive strategy filter sliders |
| `StrategyProposals` | `strategy-proposals.tsx` | AI-generated strategy cards (confirm-gated, costs Claude) |
| `StrategyCompare` | `strategy-compare.tsx` | Side-by-side strategy comparison |
| `UserRulesEditor` | `user-rules-editor.tsx` | Natural language rule management UI |

### Layout Components (`src/components/layout/`)

| Component | File | Purpose |
|-----------|------|---------|
| `AppShell` | `app-shell.tsx` | 4-tab nav (Research/Draft/Review/Setup), bottom tabs |
| `PageTransition` | `page-transition.tsx` | Directional slide + crossfade transitions |

---

## Notes

- Line numbers marked `~N` are approximate -- verify before editing
- `DEV_MODE=true` env var bypasses all Supabase auth -- returns mock user
- shadcn/ui v4 uses base-ui (not Radix) -- `asChild` prop does NOT exist on Button/TooltipTrigger
- The `src/lib/research/analyze.ts` file exists on disk but has 0 callers -- pending removal in DR-2
- `src/lib/scoring-presets.ts` exists but contains the Tyler keeper preset (dead) -- clean up in DR-2
