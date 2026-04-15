# Code Areas Index — FFIntelligence

**Last Updated:** 2026-04-14

Detailed **function & endpoint index** with line numbers.

---

## API Endpoints

### Draft Endpoints (`src/app/api/draft/`)

| Endpoint | Method | File | Description |
|----------|--------|------|-------------|
| `/api/draft/recommend` | POST | `draft/recommend/route.ts` | LLM recommendation — top 3 targets with max bids |
| `/api/draft/sheets` | POST | `draft/sheets/route.ts` | Google Sheets polling proxy (avoids CORS) |
| `/api/draft/sessions` | POST | `draft/sessions/route.ts` | Create new draft session |
| `/api/draft/sessions/[id]` | GET/PATCH | `draft/sessions/[id]/route.ts` | Get or update session state + picks |

### Research Endpoints (`src/app/api/`)

| Endpoint | Method | File | Description |
|----------|--------|------|-------------|
| `/api/research` | POST | `research/route.ts` | Kick off full research pipeline run |
| `/api/research/[runId]` | GET | `research/[runId]/route.ts` | Get saved run results |
| `/api/players` | GET | `players/route.ts` | Fetch player cache |
| `/api/players/refresh` | POST | `players/refresh/route.ts` | Force-refresh player data from sources |
| `/api/players/status` | GET | `players/status/route.ts` | Player status/injury feed |
| `/api/players/weekly` | GET | `players/weekly/route.ts` | Weekly projections |
| `/api/strategies` | GET/POST | `strategies/route.ts` | CRUD strategy profiles |
| `/api/strategies/propose` | POST | `strategies/propose/route.ts` | AI-generate strategy proposals |
| `/api/leagues` | GET/POST | `leagues/route.ts` | CRUD league configurations |

### Player Intelligence Endpoints

| Endpoint | Method | File | Description |
|----------|--------|------|-------------|
| `/api/user-tags` | GET/POST/DELETE | `user-tags/route.ts` | User tag CRUD |
| `/api/user-tags/batch` | POST | `user-tags/batch/route.ts` | Batch tag operations |
| `/api/user-rules` | GET/POST/DELETE | `user-rules/route.ts` | User rule CRUD |
| `/api/user-rules/preview` | POST | `user-rules/preview/route.ts` | Preview rule effect on player list |

### In-Season Endpoints

| Endpoint | Method | File | Description |
|----------|--------|------|-------------|
| `/api/start-sit` | POST | `start-sit/route.ts` | Start/sit recommendation |
| `/api/waivers/analyze` | POST | `waivers/analyze/route.ts` | Waiver wire AI analysis |
| `/api/waivers/trending` | GET | `waivers/trending/route.ts` | Add/drop trending data |
| `/api/trade` | POST | `trade/route.ts` | Trade evaluation |
| `/api/matchup-preview` | POST | `matchup-preview/route.ts` | Weekly matchup preview |
| `/api/injuries` | GET | `injuries/route.ts` | Active injury/status feed |
| `/api/roster/connect` | POST | `roster/connect/route.ts` | Connect to ESPN/Yahoo/Sleeper |
| `/api/roster` | GET | `roster/route.ts` | Current roster data |
| `/api/notifications` | GET/POST | `notifications/route.ts` | Notification management |
| `/api/notifications/push` | POST | `notifications/push/route.ts` | Send push notification |
| `/api/notifications/preferences` | GET/PATCH | `notifications/preferences/route.ts` | Notification preferences |

---

## Core Functions

### Draft State Machine (`src/lib/draft/state.ts`)

| Function | Lines | Purpose |
|----------|-------|---------|
| `createInitialState()` | 57-~100 | Initialize draft state for auction or snake |
| `applyPick()` | ~100-~140 | Immutably apply a pick, update manager state |
| `applySheetRows()` | ~140-~180 | Reconcile sheet rows against current state |
| `getDraftedPlayerNames()` | ~180-~200 | Returns `Set<string>` of all drafted + keeper names |
| `getPositionNeeds()` | ~200-~220 | Per-manager unfilled position slots |
| `getRemainingBudget()` | ~220-~230 | Manager's budget remaining (auction) |
| `getMaxBid()` | ~230-~245 | Maximum safe bid given remaining picks |

**Key interfaces:**
- `DraftPick` — lines 15-23 (pick_number, player_name, manager, price, round, is_keeper)
- `ManagerState` — lines 25-35 (picks, budget_remaining, roster_count)
- `DraftState` — lines 37-53 (format, picks, managers, roster_slots, keepers)

### AI Recommendations (`src/lib/draft/recommend.ts`)

| Function | Lines | Purpose |
|----------|-------|---------|
| `fetchRecommendation()` | 45-132 | Call `/api/draft/recommend`, cache 30s by pick count + strategy |
| `clearRecommendationCache()` | 135-137 | Invalidate cache (e.g., after strategy swap) |
| `buildCacheKey()` | 41-43 | `pickCount:strategyId:managerName` cache key |

**Key interfaces:**
- `LLMTarget` — lines 17-23 (name, position, maxBid, reasoning, confidence)
- `LLMRecommendation` — lines 25-28 (targets, summary)

### Auction Advisor (`src/lib/draft/auction-advisor.ts`)

| Function | Lines | Purpose |
|----------|-------|---------|
| `calculateMaxBidAdvice()` | 28-146 | Context-aware max bid (strategy score, need, alternatives, budget) |
| `analyzeBudgetStrategy()` | 161-202 | Ahead/behind pace analysis with suggestion |
| `getPositionUrgencyWarnings()` | 215-267 | Scarcity alerts by position + budget threshold |
| `getPositionBudgetBreakdown()` | ~270-310 | Per-position spend vs. planned budget (FF-262) |

**Key interfaces:**
- `MaxBidResult` — lines 16-20
- `MaxBidFactor` — lines 22-26
- `BudgetAnalysis` — lines 150-159
- `PositionUrgencyWarning` — lines 206-213
- `PositionBudgetRow` — ~270 (position, planned, spent, delta)

### Explainability Engine (`src/lib/draft/explain.ts`)

| Function | Lines | Purpose |
|----------|-------|---------|
| `calculateScarcity()` | 46-81 | Tier counts by position (critical/low/moderate/abundant) |
| `calculateScarcityExtended()` | 87-119 | + spend ranges and avg values for auction UI |
| `explainPlayer()` | 124-302 | Full explanation: strategy fit, scarcity, need, value, risk |

**Key interfaces:**
- `ExplainFactor` — lines 12-17 (label, detail, impact, weight)
- `Explanation` — lines 19-22 (summary, factors, confidence)
- `PositionScarcity` — lines 27-35
- `PositionScarcityExtended` — lines 37-40

### Google Sheets (`src/lib/sheets/index.ts`)

| Function | Lines | Purpose |
|----------|-------|---------|
| `extractSheetId()` | 41-48 | Parse sheet ID from any Google Sheets URL format |
| `detectColumnMapping()` | 54-91 | Auto-detect Player/Manager/Price/Round columns from headers |
| `parseCSV()` | 96-128 | CSV parser with quoted-field and escaped-comma support |
| `mapRows()` | 133-170 | Apply column mapping → `SheetRow[]` (filters empty rows) |
| `readSheet()` | 180-236 | Main entry: fetch CSV export, parse, detect/apply mapping |

**Key interfaces:**
- `ColumnMapping` — lines 12-19 (player, manager, price, round, pick, position indices)
- `SheetRow` — lines 21-29 (player_name, manager, price, round, pick_number, position)
- `SheetReadResult` — lines 31-35 (rows, headers, mapping, total_rows)

### Player Intelligence (`src/lib/research/intel/`)

| Function | File | Purpose |
|----------|------|---------|
| `detectTags()` | `tag-detector.ts` | BREAKOUT/SLEEPER/BUST/VALUE/AVOID detection logic |
| `aggregateSentiment()` | `sentiment.ts` | Merge source mentions into unified sentiment score |
| `computePlayerIntel()` | `service.ts` | Orchestrate tag detection + write to Supabase |
| `parseUserRule()` | `rule-parser.ts` | Natural language rule → structured rule via LLM |
| `getFreshnessConfig()` | `freshness.ts` | TTL per data type, 2026 season detection |

---

## React Hooks (`src/hooks/`)

| Hook | File | Lines | What it does |
|------|------|-------|--------------|
| `useDraftState()` | `use-draft-state.ts` | 50-224 | Full draft state: state machine + sheet polling + manual picks + Supabase persistence |
| `useDraftPolling()` | `use-draft-polling.ts` | 33-137 | Poll Sheets every 7s via `/api/draft/sheets`, detect new rows |
| `useResearch()` | `use-research.ts` | — | Research pipeline hook (run, status, results) |
| `useUserTags()` | `use-user-tags.ts` | — | User tag CRUD with optimistic updates |
| `useUserRules()` | `use-user-rules.ts` | — | User rule CRUD + preview |

### Key useDraftState internals:
| Function | Lines | What it does |
|----------|-------|--------------|
| `addManualPick()` | 145-159 | Apply pick + persist to Supabase |
| `undoLastPick()` | 162-190 | Rebuild state minus last pick + persist |
| `handleNewSheetPicks()` | 122-130 | Apply sheet rows, persist |
| `persistPicks()` | 96-119 | PATCH `/api/draft/sessions/[id]` with current picks |

---

## UI Components

### Draft Components (`src/components/draft/`)

| Component | File | Purpose |
|-----------|------|---------|
| `AuctionAdvisor` | `auction-advisor.tsx` | Budget health panel + max bid display |
| `DraftFlowAlerts` | `draft-flow-alerts.tsx` | Pivot alerts (draft conditions favor strategy change) |
| `FFIAIInsight` | `ffi-ai-insight.tsx` | AI insight card with confidence bar |
| `FFIPlayerCard` | `ffi-player-card.tsx` | Glass-panel player card (rank, badges, value, expand) |
| `FFIPositionFilters` | `ffi-position-filters.tsx` | Glow-active position filter tabs |
| `LeagueOverview` | `league-overview.tsx` | All managers' rosters at a glance |
| `ManagerTendencies` | `manager-tendencies.tsx` | Per-manager pattern tracking display |
| `ManualPickEntry` | `manual-pick-entry.tsx` | Quick pick entry (player search + team + price) |
| `MyRoster` | `my-roster.tsx` | Current picks + position needs + grade |
| `PivotHistory` | `pivot-history.tsx` | Strategy swap log with timestamps |
| `PlayerPool` | `player-pool.tsx` | Live-updated available player list (FFIPlayerCard list) |
| `PositionScarcity` | `position-scarcity.tsx` | Remaining slots per position with status labels |
| `SnakeAdvisor` | `snake-advisor.tsx` | Best available + trade-up suggestions (snake mode) |
| `StrategyImpactPreview` | `strategy-impact-preview.tsx` | "Switching to X changes your top 3 targets to..." |
| `StrategySwap` | `strategy-swap.tsx` | One-tap strategy profile switcher |
| `TeamReports` | `team-reports.tsx` | Per-team exportable analysis reports |
| `TrashTalk` | `trash-talk.tsx` | Live overpay/imbalance alerts + roast report |
| `WhyExplainer` | `why-explainer.tsx` | Expandable "Why?" reasoning panel |

### Prep Components (`src/components/prep/`)

| Component | File | Purpose |
|-----------|------|---------|
| `DraftBoardTable` | `draft-board-table.tsx` | Sortable/filterable player board |
| `FFIPlayerIntelCard` | `ffi-player-intel-card.tsx` | Player card with tag badges (compact + expanded) |
| `LeagueConfigForm` | `league-config-form.tsx` | League settings form (platform, format, size, scoring) |
| `PositionBreakdown` | `position-breakdown.tsx` | Top players per position with tier coloring |
| `StrategyEditor` | `strategy-editor.tsx` | Interactive strategy filter sliders |
| `StrategyProposals` | `strategy-proposals.tsx` | AI-generated strategy proposal cards |
| `StrategyCompare` | `strategy-compare.tsx` | Side-by-side strategy comparison |
| `UserRulesEditor` | `user-rules-editor.tsx` | Natural language rule management UI |

### Layout Components (`src/components/layout/`)

| Component | File | Purpose |
|-----------|------|---------|
| `AppShell` | `app-shell.tsx` | Glass backdrop nav, bottom tabs, FFI branding |
| `PageTransition` | `page-transition.tsx` | Directional slide + crossfade transitions |
| `SwipeCarousel` | `swipe-carousel.tsx` | 3-screen swipe nav (Prep / Draft / Settings) |

### FFI Design System (`src/components/ui/`)

| Component | File | What it exports |
|-----------|------|-----------------|
| `ffi-primitives.tsx` | `ui/ffi-primitives.tsx` | FFIButton, FFICard, FFIBadge, FFIProgress, FFIGrade, FFITacticalInsight, FFITrashTalkAlert, FFIAIRecommendation, FFIPlayerCard |
| `ffi-motion.tsx` | `ui/ffi-motion.tsx` | Animation presets (Framer Motion) |

---

## Notes

- Line numbers marked `~N` are approximate (file not fully read) — verify before editing
- Update this file when adding new functions/endpoints
- Keeper picks stored with negative `pick_number` to distinguish from real draft picks
- `DEV_MODE=true` env var bypasses all Supabase auth — returns mock user
- shadcn/ui v4 uses base-ui (not Radix) — `asChild` prop does NOT exist on Button/TooltipTrigger
