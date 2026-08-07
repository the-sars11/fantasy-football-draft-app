-- COMBINED SUPABASE SETUP for Fantasy Football Draft Advisor
-- Auto-generated Sat Aug  1 12:59:46 PDT 2026. Paste this whole file into the Supabase SQL Editor and Run.
-- Contains all 13 migrations in chronological order.


-- ============================================================
-- 20260319000001_initial_schema.sql
-- ============================================================
-- Fantasy Football Draft Advisor — Initial Schema
-- Tables: leagues, players_cache, research_runs, draft_sessions

-- Leagues: stores league configuration for each user
create table public.leagues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text not null check (platform in ('espn', 'yahoo', 'sleeper', 'other')),
  format text not null check (format in ('auction', 'snake')),
  team_count integer not null default 12,
  budget integer default 200, -- auction only
  scoring_format text not null default 'ppr' check (scoring_format in ('standard', 'half_ppr', 'ppr', 'custom')),
  roster_slots jsonb not null default '{
    "qb": 1, "rb": 2, "wr": 2, "te": 1, "flex": 1, "k": 1, "dst": 1, "bench": 6
  }'::jsonb,
  keeper_enabled boolean not null default false,
  keeper_settings jsonb default null, -- { max_keepers, cost_type: "round" | "auction_price", keepers: [...] }
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_leagues_user_id on public.leagues(user_id);

-- Players cache: normalized player data from all sources
create table public.players_cache (
  id uuid primary key default gen_random_uuid(),
  external_id text, -- platform-specific player ID
  name text not null,
  team text,
  position text not null check (position in ('QB', 'RB', 'WR', 'TE', 'K', 'DST')),
  bye_week integer,
  adp jsonb default '{}'::jsonb, -- { espn: 15.2, yahoo: 14.8, sleeper: 16.1 }
  auction_values jsonb default '{}'::jsonb, -- { espn: 42, yahoo: 38, fantasypros: 40 }
  projections jsonb default '{}'::jsonb, -- { points: 285, passing_yds: 4200, ... }
  injury_status text,
  source_data jsonb default '{}'::jsonb, -- raw per-source data
  last_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index idx_players_cache_position on public.players_cache(position);
create index idx_players_cache_name on public.players_cache(name);

-- Research runs: saved prep analysis runs
create table public.research_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  strategy_settings jsonb not null default '{}'::jsonb, -- position weights, risk tolerance, etc.
  results jsonb default null, -- full analysis output (rankings, tiers, targets, avoids)
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_research_runs_user_id on public.research_runs(user_id);
create index idx_research_runs_league_id on public.research_runs(league_id);

-- Draft sessions: live draft tracking sessions
create table public.draft_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  sheet_url text,
  format text not null check (format in ('auction', 'snake')),
  status text not null default 'setup' check (status in ('setup', 'live', 'paused', 'completed')),
  managers jsonb not null default '[]'::jsonb, -- [{ name, budget?, draft_position? }]
  picks jsonb not null default '[]'::jsonb, -- [{ player_id, manager, price?, round?, pick_number }]
  recommendations jsonb not null default '[]'::jsonb, -- LLM recs per pick
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_draft_sessions_user_id on public.draft_sessions(user_id);
create index idx_draft_sessions_league_id on public.draft_sessions(league_id);

-- Row-Level Security
alter table public.leagues enable row level security;
alter table public.players_cache enable row level security;
alter table public.research_runs enable row level security;
alter table public.draft_sessions enable row level security;

-- Leagues: users can only access their own leagues
create policy "Users can view own leagues" on public.leagues
  for select using (auth.uid() = user_id);
create policy "Users can insert own leagues" on public.leagues
  for insert with check (auth.uid() = user_id);
create policy "Users can update own leagues" on public.leagues
  for update using (auth.uid() = user_id);
create policy "Users can delete own leagues" on public.leagues
  for delete using (auth.uid() = user_id);

-- Players cache: readable by all authenticated users
create policy "Authenticated users can read players" on public.players_cache
  for select using (auth.role() = 'authenticated');
create policy "Service role can manage players" on public.players_cache
  for all using (auth.role() = 'service_role');

-- Research runs: users can only access their own
create policy "Users can view own research runs" on public.research_runs
  for select using (auth.uid() = user_id);
create policy "Users can insert own research runs" on public.research_runs
  for insert with check (auth.uid() = user_id);
create policy "Users can update own research runs" on public.research_runs
  for update using (auth.uid() = user_id);

-- Draft sessions: users can only access their own
create policy "Users can view own draft sessions" on public.draft_sessions
  for select using (auth.uid() = user_id);
create policy "Users can insert own draft sessions" on public.draft_sessions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own draft sessions" on public.draft_sessions
  for update using (auth.uid() = user_id);

-- Updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_leagues_updated
  before update on public.leagues
  for each row execute function public.handle_updated_at();

create trigger on_draft_sessions_updated
  before update on public.draft_sessions
  for each row execute function public.handle_updated_at();


-- ============================================================
-- 20260320000001_strategies_table.sql
-- ============================================================
-- FF-S01: Strategies table — named strategy profiles per league
-- Supports both auction (budget allocation) and snake (round targets) with NO cross-contamination

-- Strategy archetypes enum-like check
-- Auction archetypes: stars-and-scrubs, balanced-auction, studs-and-duds, zero-rb-auction, wr-heavy-auction
-- Snake archetypes: zero-rb, hero-rb, wr-heavy, robust-rb, balanced, late-round-qb

create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,

  -- Identity
  name text not null,
  description text, -- short philosophy summary
  archetype text not null, -- base strategy archetype
  source text not null default 'user' check (source in ('ai', 'user', 'preset')),
  is_active boolean not null default false, -- only one active per league

  -- Position emphasis (1-10 scale, format-agnostic)
  position_weights jsonb not null default '{
    "QB": 5, "RB": 5, "WR": 5, "TE": 5, "K": 2, "DST": 2
  }'::jsonb,

  -- Player targeting
  player_targets jsonb not null default '[]'::jsonb,
  -- [{ player_id: string, player_name: string, weight: number (1-10), note?: string }]

  player_avoids jsonb not null default '[]'::jsonb,
  -- [{ player_id: string, player_name: string, severity: "soft" | "hard", reason?: string }]

  team_avoids text[] not null default '{}',
  -- team abbreviations to deprioritize (e.g. ['NYJ', 'CAR'])

  -- Risk profile
  risk_tolerance text not null default 'balanced' check (risk_tolerance in ('conservative', 'balanced', 'aggressive')),

  -- AUCTION-ONLY fields (null when format is snake)
  budget_allocation jsonb, -- { "QB": 8, "RB": 40, "WR": 35, "TE": 7, "K": 1, "DST": 1, "bench": 8 } (percentages)
  max_bid_percentage integer, -- max % of budget on a single player (e.g. 35)

  -- SNAKE-ONLY fields (null when format is auction)
  round_targets jsonb, -- { "QB": [8,9], "RB": [1,2,4], "WR": [3,5,6], "TE": [7], "K": [14], "DST": [15] }
  position_round_priority jsonb, -- { "early": ["RB","WR"], "mid": ["WR","TE","QB"], "late": ["QB","K","DST"] }

  -- AI reasoning (populated when source = 'ai')
  ai_reasoning text, -- why this strategy was proposed
  ai_confidence text check (ai_confidence in ('high', 'medium', 'low')),
  projected_ceiling numeric, -- projected max points
  projected_floor numeric, -- projected min points

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_strategies_user_id on public.strategies(user_id);
create index idx_strategies_league_id on public.strategies(league_id);
create index idx_strategies_active on public.strategies(league_id, is_active) where is_active = true;

-- RLS
alter table public.strategies enable row level security;

create policy "Users can view own strategies" on public.strategies
  for select using (auth.uid() = user_id);
create policy "Users can insert own strategies" on public.strategies
  for insert with check (auth.uid() = user_id);
create policy "Users can update own strategies" on public.strategies
  for update using (auth.uid() = user_id);
create policy "Users can delete own strategies" on public.strategies
  for delete using (auth.uid() = user_id);

-- Updated_at trigger
create trigger on_strategies_updated
  before update on public.strategies
  for each row execute function public.handle_updated_at();

-- Function to ensure only one active strategy per league
create or replace function public.ensure_single_active_strategy()
returns trigger as $$
begin
  if new.is_active = true then
    update public.strategies
    set is_active = false
    where league_id = new.league_id
      and id != new.id
      and is_active = true;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger on_strategy_activate
  before insert or update of is_active on public.strategies
  for each row execute function public.ensure_single_active_strategy();


-- ============================================================
-- 20260321000001_add_keepers_to_draft_sessions.sql
-- ============================================================
-- FF-029: Add keepers column to draft_sessions
-- Stores keeper assignments: [{ player_name, position, manager, cost }]
alter table public.draft_sessions
  add column if not exists keepers jsonb not null default '[]'::jsonb;


-- ============================================================
-- 20260321000002_add_scoring_settings_to_leagues.sql
-- ============================================================
-- FF-067: Add scoring_settings jsonb column to leagues table
-- Stores custom scoring settings when scoring_format = 'custom'
-- For preset formats (standard, half_ppr, ppr), this can be null — the app resolves from presets

alter table public.leagues
  add column if not exists scoring_settings jsonb default null;

-- Add a comment for documentation
comment on column public.leagues.scoring_settings is
  'Custom scoring settings (jsonb). Populated when scoring_format = "custom". Schema matches ScoringSettings interface: pass_yds, pass_td, rush_yds, rec, etc.';


-- ============================================================
-- 20260322000001_add_unique_name_to_players_cache.sql
-- ============================================================
-- Add unique constraint on name in players_cache for upsert support
-- The cache upserts use onConflict: 'name' which requires this constraint
alter table public.players_cache add constraint players_cache_name_unique unique (name);


-- ============================================================
-- 20260323000001_player_intel_table.sql
-- ============================================================
-- Player Intelligence System: player_intel table
-- Stores aggregated intelligence per player with sentiment and system tags

create table public.player_intel (
  id uuid primary key default gen_random_uuid(),
  player_cache_id uuid not null references public.players_cache(id) on delete cascade,
  player_name text not null,
  season integer not null default 2026,

  -- Multi-source sentiment aggregation
  -- Structure: {
  --   "sources": [
  --     { "source": "fantasypros", "sentiment": "bullish", "mentions": ["breakout candidate"], "fetched_at": "2026-06-15T..." },
  --     { "source": "espn", "sentiment": "neutral", "mentions": [], "fetched_at": "2026-06-15T..." }
  --   ],
  --   "consensus_sentiment": "bullish",
  --   "sentiment_score": 72
  -- }
  sentiment_data jsonb not null default '{}'::jsonb,

  -- System-detected tags with confidence and reasoning
  -- Structure: [
  --   { "tag": "BREAKOUT", "confidence": 0.85, "sources": ["fp", "espn"], "reasoning": "3+ sources identify as breakout", "score_modifier": 15 },
  --   { "tag": "VALUE", "confidence": 0.92, "adp_gap": 15.3, "reasoning": "ADP 45 vs projection rank 30", "score_modifier": 12 }
  -- ]
  system_tags jsonb not null default '[]'::jsonb,

  -- Per-source freshness tracking for 2026 validation
  -- Structure: {
  --   "fantasypros": { "fetched_at": "2026-06-15", "is_2026_data": true, "data_type": "rankings" },
  --   "espn": { "fetched_at": "2026-06-10", "is_2026_data": true, "data_type": "projections" }
  -- }
  source_freshness jsonb not null default '{}'::jsonb,

  -- Advanced metrics from sources (optional)
  -- Structure: { "target_share": 0.24, "snap_share": 0.85, "air_yards": 1450 }
  advanced_metrics jsonb default null,

  computed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint unique_player_season unique (player_cache_id, season)
);

-- Indexes
create index idx_player_intel_player on public.player_intel(player_cache_id);
create index idx_player_intel_season on public.player_intel(season);
create index idx_player_intel_player_name on public.player_intel(player_name);
create index idx_player_intel_system_tags on public.player_intel using gin(system_tags);
create index idx_player_intel_computed on public.player_intel(computed_at);

-- RLS policies
alter table public.player_intel enable row level security;

-- All authenticated users can read player intel
create policy "Authenticated users can read player intel" on public.player_intel
  for select using (auth.role() = 'authenticated');

-- Service role can manage player intel
create policy "Service role can manage player intel" on public.player_intel
  for all using (auth.role() = 'service_role');

-- Updated_at trigger
create trigger on_player_intel_updated
  before update on public.player_intel
  for each row execute function public.handle_updated_at();


-- ============================================================
-- 20260323000002_user_tags_table.sql
-- ============================================================
-- Player Intelligence System: user_tags table
-- User-defined tags, notes, and system tag overrides per player

create table public.user_tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  player_cache_id uuid not null references public.players_cache(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade, -- null = applies to all leagues

  -- User-assigned tags
  -- Special tags: 'target' (highest priority, +25 score), 'avoid', 'watch', 'sleeper', 'breakout'
  -- Can also include custom tags
  tags text[] not null default '{}',

  -- User notes on the player
  note text,

  -- If true, hide system tags on compact view (user prefers their own assessment)
  override_system_tags boolean not null default false,

  -- System tags the user has explicitly dismissed (won't show in UI)
  dismissed_system_tags text[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint unique_user_player_league unique (user_id, player_cache_id, league_id)
);

-- Indexes
create index idx_user_tags_user on public.user_tags(user_id);
create index idx_user_tags_player on public.user_tags(player_cache_id);
create index idx_user_tags_league on public.user_tags(league_id);
create index idx_user_tags_tags on public.user_tags using gin(tags);

-- RLS policies
alter table public.user_tags enable row level security;

-- Users can view their own tags
create policy "Users can view own tags" on public.user_tags
  for select using (auth.uid() = user_id);

-- Users can insert their own tags
create policy "Users can insert own tags" on public.user_tags
  for insert with check (auth.uid() = user_id);

-- Users can update their own tags
create policy "Users can update own tags" on public.user_tags
  for update using (auth.uid() = user_id);

-- Users can delete their own tags
create policy "Users can delete own tags" on public.user_tags
  for delete using (auth.uid() = user_id);

-- Updated_at trigger
create trigger on_user_tags_updated
  before update on public.user_tags
  for each row execute function public.handle_updated_at();


-- ============================================================
-- 20260323000003_user_rules_table.sql
-- ============================================================
-- Player Intelligence System: user_rules table
-- Natural language rules parsed by LLM for scoring adjustments

create table public.user_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade, -- null = applies to all leagues

  -- Original rule text from user
  rule_text text not null,

  -- Rule type classification
  rule_type text not null check (rule_type in ('avoid', 'target', 'filter', 'boost', 'custom')),

  -- Whether this rule is active
  is_active boolean not null default true,

  -- LLM-parsed structured rule
  -- Structure: {
  --   "action": "avoid",
  --   "conditions": [
  --     { "field": "position", "operator": "equals", "value": "WR" },
  --     { "field": "team", "operator": "equals", "value": "DAL" }
  --   ],
  --   "score_modifier": -30,
  --   "confidence": 0.95
  -- }
  -- Supported fields: position, team, age, years_exp, injury_status, bye_week, adp, auction_value, tag
  -- Supported operators: equals, not_equals, greater_than, less_than, contains, in_list
  parsed_rule jsonb not null,

  -- Human-readable interpretation of the rule (for UI display)
  llm_interpretation text,

  -- Validation status
  is_validated boolean not null default false,
  validation_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_user_rules_user on public.user_rules(user_id);
create index idx_user_rules_league on public.user_rules(league_id);
create index idx_user_rules_active on public.user_rules(user_id, is_active) where is_active = true;

-- RLS policies
alter table public.user_rules enable row level security;

-- Users can view their own rules
create policy "Users can view own rules" on public.user_rules
  for select using (auth.uid() = user_id);

-- Users can insert their own rules
create policy "Users can insert own rules" on public.user_rules
  for insert with check (auth.uid() = user_id);

-- Users can update their own rules
create policy "Users can update own rules" on public.user_rules
  for update using (auth.uid() = user_id);

-- Users can delete their own rules
create policy "Users can delete own rules" on public.user_rules
  for delete using (auth.uid() = user_id);

-- Updated_at trigger
create trigger on_user_rules_updated
  before update on public.user_rules
  for each row execute function public.handle_updated_at();


-- ============================================================
-- 20260323000004_source_registry_table.sql
-- ============================================================
-- Player Intelligence System: source_registry table
-- Tracks all data sources with freshness configuration

create table public.source_registry (
  id uuid primary key default gen_random_uuid(),
  source_key text unique not null, -- 'fantasypros', 'espn', 'sleeper', 'ff_footballers', etc.
  display_name text not null,
  source_type text not null check (source_type in ('api', 'scrape', 'manual')),

  -- Source configuration
  -- Structure: {
  --   "base_url": "https://...",
  --   "requires_auth": false,
  --   "rate_limit_per_hour": 100,
  --   "data_types": ["rankings", "projections", "auction_values", "sentiment"]
  -- }
  config jsonb not null default '{}'::jsonb,

  -- Freshness settings per data type (in hours)
  -- Structure: {
  --   "rankings_ttl_hours": 24,
  --   "projections_ttl_hours": 168,
  --   "sentiment_ttl_hours": 48
  -- }
  freshness_config jsonb not null default '{
    "rankings_ttl_hours": 24,
    "projections_ttl_hours": 168,
    "sentiment_ttl_hours": 48
  }'::jsonb,

  -- Weight in consensus calculations (0.00 to 1.00)
  consensus_weight numeric(3,2) not null default 0.10,

  -- Source status
  is_enabled boolean not null default true,
  last_fetch_at timestamptz,
  last_fetch_status text, -- 'success', 'failed', 'rate_limited', etc.
  last_fetch_error text,

  -- Season availability
  season_data_available boolean not null default false, -- has 2026 data
  season_data_checked_at timestamptz,

  -- Scraping metadata
  -- Structure: {
  --   "user_agent_rotation": true,
  --   "rate_limit_delay_ms": 1000,
  --   "retry_count": 3
  -- }
  scrape_config jsonb default null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_source_registry_enabled on public.source_registry(is_enabled) where is_enabled = true;
create index idx_source_registry_key on public.source_registry(source_key);

-- RLS policies
alter table public.source_registry enable row level security;

-- All authenticated users can read source registry
create policy "Authenticated users can read sources" on public.source_registry
  for select using (auth.role() = 'authenticated');

-- Service role can manage source registry
create policy "Service role can manage sources" on public.source_registry
  for all using (auth.role() = 'service_role');

-- Updated_at trigger
create trigger on_source_registry_updated
  before update on public.source_registry
  for each row execute function public.handle_updated_at();

-- Seed with existing sources
insert into public.source_registry (source_key, display_name, source_type, config, freshness_config, consensus_weight, is_enabled, season_data_available) values
  ('fantasypros', 'FantasyPros', 'scrape',
   '{"base_url": "https://www.fantasypros.com", "data_types": ["rankings", "auction_values", "sentiment"]}'::jsonb,
   '{"rankings_ttl_hours": 24, "projections_ttl_hours": 168, "sentiment_ttl_hours": 48}'::jsonb,
   0.40, true, false),
  ('espn', 'ESPN Fantasy', 'api',
   '{"base_url": "https://lm-api-reads.fantasy.espn.com", "data_types": ["rankings", "projections", "auction_values", "adp"]}'::jsonb,
   '{"rankings_ttl_hours": 24, "projections_ttl_hours": 168, "sentiment_ttl_hours": 48}'::jsonb,
   0.35, true, false),
  ('sleeper', 'Sleeper', 'api',
   '{"base_url": "https://api.sleeper.app", "data_types": ["players", "adp", "trending", "projections"]}'::jsonb,
   '{"rankings_ttl_hours": 24, "projections_ttl_hours": 168, "sentiment_ttl_hours": 48}'::jsonb,
   0.25, true, false),
  ('ff_footballers', 'Fantasy Footballers', 'scrape',
   '{"base_url": "https://www.thefantasyfootballers.com", "data_types": ["rankings", "sentiment"]}'::jsonb,
   '{"rankings_ttl_hours": 48, "projections_ttl_hours": 168, "sentiment_ttl_hours": 48}'::jsonb,
   0.00, false, false),
  ('pfr', 'Pro Football Reference', 'scrape',
   '{"base_url": "https://www.pro-football-reference.com", "data_types": ["historical"]}'::jsonb,
   '{"rankings_ttl_hours": 168, "projections_ttl_hours": 168, "sentiment_ttl_hours": 168}'::jsonb,
   0.00, false, false);


-- ============================================================
-- 20260324000001_weekly_projections_table.sql
-- ============================================================
-- Weekly Projections: stores per-week projection data for in-season features
-- Supports multiple sources per player per week for consensus calculations

create table public.weekly_projections (
  id uuid primary key default gen_random_uuid(),
  player_cache_id uuid not null references public.players_cache(id) on delete cascade,
  player_name text not null,
  season integer not null default 2026,
  week integer not null check (week >= 1 and week <= 18),

  -- Per-source projections
  -- Structure: {
  --   "sleeper": { "points": 14.5, "passing_yds": 0, "rushing_yds": 85, "receiving_yds": 0, "touchdowns": 1, "receptions": 0 },
  --   "espn": { "points": 13.8, "passing_yds": 0, "rushing_yds": 78, "receiving_yds": 12, "touchdowns": 1, "receptions": 1 },
  --   "fantasypros": { "points": 15.2 }
  -- }
  source_projections jsonb not null default '{}'::jsonb,

  -- Consensus calculation (weighted average across sources)
  consensus_points numeric(6,2),
  consensus_floor numeric(6,2),
  consensus_ceiling numeric(6,2),

  -- Matchup context stored with projection
  opponent text,
  is_home boolean,
  game_time timestamptz,

  -- Player status for this week
  -- 'active', 'bye', 'out', 'doubtful', 'questionable', 'probable', 'ir'
  status text not null default 'active',

  -- Positional rank for the week (1 = top QB, etc.)
  position_rank integer,

  -- Scoring format this projection is for
  scoring_format text not null default 'ppr' check (scoring_format in ('standard', 'half_ppr', 'ppr')),

  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint unique_player_week_format unique (player_cache_id, season, week, scoring_format)
);

-- Indexes for common queries
create index idx_weekly_proj_player on public.weekly_projections(player_cache_id);
create index idx_weekly_proj_week on public.weekly_projections(season, week);
create index idx_weekly_proj_status on public.weekly_projections(status);
create index idx_weekly_proj_position_rank on public.weekly_projections(position_rank);
create index idx_weekly_proj_fetched on public.weekly_projections(fetched_at);

-- GIN index for querying source projections
create index idx_weekly_proj_sources on public.weekly_projections using gin(source_projections);

-- RLS policies
alter table public.weekly_projections enable row level security;

-- All authenticated users can read projections
create policy "Authenticated users can read weekly projections" on public.weekly_projections
  for select using (auth.role() = 'authenticated');

-- Service role can manage projections
create policy "Service role can manage weekly projections" on public.weekly_projections
  for all using (auth.role() = 'service_role');


-- ============================================================
-- 20260324000002_injury_updates_table.sql
-- ============================================================
-- Injury Updates: timestamped injury status changes with severity tracking
-- Enables injury timeline display and alert generation

create table public.injury_updates (
  id uuid primary key default gen_random_uuid(),
  player_cache_id uuid not null references public.players_cache(id) on delete cascade,
  player_name text not null,
  season integer not null default 2026,

  -- Status change details
  -- 'healthy', 'questionable', 'doubtful', 'out', 'ir', 'pup', 'suspended'
  previous_status text,
  new_status text not null,

  -- Injury details
  injury_type text, -- 'hamstring', 'ankle', 'concussion', etc.
  injury_location text, -- 'leg', 'arm', 'head', etc.

  -- Severity assessment (for AI recommendations)
  -- 1 = minor (day-to-day), 2 = moderate (week-to-week), 3 = significant (multi-week), 4 = severe (season-ending)
  severity integer check (severity >= 1 and severity <= 4),

  -- Expected return
  expected_return_week integer,
  expected_return_date date,

  -- Source of update
  source text not null, -- 'espn', 'sleeper', 'team_report', 'manual'

  -- Practice participation (for Wednesday-Friday tracking)
  -- 'full', 'limited', 'dnp' (did not practice), null
  practice_status text,

  -- Game designation (official)
  -- 'active', 'inactive', 'out', 'questionable', 'doubtful'
  game_designation text,

  -- For which week this update applies
  week integer,

  -- Raw source data
  source_notes text,

  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_injury_player on public.injury_updates(player_cache_id);
create index idx_injury_season_week on public.injury_updates(season, week);
create index idx_injury_status on public.injury_updates(new_status);
create index idx_injury_severity on public.injury_updates(severity);
create index idx_injury_reported on public.injury_updates(reported_at desc);

-- Composite index for timeline queries
create index idx_injury_player_timeline on public.injury_updates(player_cache_id, reported_at desc);

-- RLS policies
alter table public.injury_updates enable row level security;

-- All authenticated users can read injury updates
create policy "Authenticated users can read injury updates" on public.injury_updates
  for select using (auth.role() = 'authenticated');

-- Service role can manage injury updates
create policy "Service role can manage injury updates" on public.injury_updates
  for all using (auth.role() = 'service_role');


-- Matchup Data: defensive rankings and game context for recommendations
create table public.matchup_data (
  id uuid primary key default gen_random_uuid(),
  season integer not null default 2026,
  week integer not null check (week >= 1 and week <= 18),
  team text not null,

  -- Opponent for this week
  opponent text not null,
  is_home boolean not null,
  game_time timestamptz,

  -- Defensive rankings vs position (lower = tougher matchup)
  -- Rank 1-32 where 1 = allows fewest points to that position
  def_rank_vs_qb integer,
  def_rank_vs_rb integer,
  def_rank_vs_wr integer,
  def_rank_vs_te integer,

  -- Fantasy points allowed per game by position
  def_fpts_allowed_qb numeric(5,2),
  def_fpts_allowed_rb numeric(5,2),
  def_fpts_allowed_wr numeric(5,2),
  def_fpts_allowed_te numeric(5,2),

  -- Vegas data for game script prediction
  spread numeric(4,1),
  over_under numeric(4,1),
  implied_team_total numeric(4,1),

  -- Weather (outdoor games only)
  weather_temp integer,
  weather_wind integer,
  weather_precip_chance integer,
  dome boolean not null default false,

  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  constraint unique_team_week unique (team, season, week)
);

-- Indexes
create index idx_matchup_week on public.matchup_data(season, week);
create index idx_matchup_team on public.matchup_data(team);
create index idx_matchup_def_ranks on public.matchup_data(def_rank_vs_qb, def_rank_vs_rb, def_rank_vs_wr, def_rank_vs_te);

-- RLS policies
alter table public.matchup_data enable row level security;

create policy "Authenticated users can read matchup data" on public.matchup_data
  for select using (auth.role() = 'authenticated');

create policy "Service role can manage matchup data" on public.matchup_data
  for all using (auth.role() = 'service_role');


-- ============================================================
-- 20260324000003_user_connections_table.sql
-- ============================================================
-- User Platform Connections (FF-114)
-- Stores OAuth tokens and platform-specific user IDs for roster sync

CREATE TABLE IF NOT EXISTS user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('espn', 'yahoo', 'sleeper')),
  platform_user_id text NOT NULL,
  platform_username text NOT NULL,

  -- OAuth tokens (null for Sleeper which doesn't require auth)
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One connection per platform per user
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- Index for quick lookup by user
CREATE INDEX idx_user_connections_user ON user_connections(user_id);

-- RLS policies
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own connections"
  ON user_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON user_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON user_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role full access"
  ON user_connections
  USING (auth.jwt()->>'role' = 'service_role');


-- User Rosters Cache (for quick access without API calls)
CREATE TABLE IF NOT EXISTS user_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('espn', 'yahoo', 'sleeper')),
  league_id text NOT NULL,
  league_name text NOT NULL,
  team_id text NOT NULL,
  team_name text NOT NULL,
  season integer NOT NULL DEFAULT 2026,
  week integer NOT NULL,
  scoring_format text NOT NULL CHECK (scoring_format IN ('standard', 'half_ppr', 'ppr')),

  -- Full roster data as JSONB
  players jsonb NOT NULL DEFAULT '[]',
  roster_settings jsonb NOT NULL DEFAULT '{}',

  -- FAAB and waiver info
  faab_budget integer,
  faab_remaining integer,
  waiver_priority integer,

  -- Record
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  ties integer DEFAULT 0,

  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  -- One roster per league per week per user
  CONSTRAINT unique_user_league_week UNIQUE (user_id, platform, league_id, season, week)
);

-- Indexes
CREATE INDEX idx_user_rosters_user ON user_rosters(user_id);
CREATE INDEX idx_user_rosters_league ON user_rosters(league_id);
CREATE INDEX idx_user_rosters_week ON user_rosters(season, week);

-- RLS policies
ALTER TABLE user_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rosters"
  ON user_rosters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rosters"
  ON user_rosters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rosters"
  ON user_rosters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on rosters"
  ON user_rosters
  USING (auth.jwt()->>'role' = 'service_role');


-- ============================================================
-- 20260324000004_notifications_tables.sql
-- ============================================================
-- Notifications: stores user notifications for injury alerts, waiver results, reminders
-- Part of FF-133 to FF-136

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Notification type and priority
  type text not null check (type in ('injury', 'waiver_result', 'weekly_reminder', 'lineup_lock', 'trade_offer', 'trade_accepted', 'player_news', 'game_start', 'custom')),
  priority text not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
  channel text not null default 'in_app' check (channel in ('push', 'email', 'in_app')),

  -- Content
  title text not null,
  message text not null,
  short_message text, -- For push notifications

  -- Context
  player_id text,
  player_name text,
  league_id text,
  week integer,

  -- Status
  read boolean not null default false,
  dismissed boolean not null default false,
  action_taken boolean,

  -- Timestamps
  created_at timestamptz not null default now(),
  read_at timestamptz,
  expires_at timestamptz
);

-- Indexes for common queries
create index idx_notifications_user on public.notifications(user_id);
create index idx_notifications_user_unread on public.notifications(user_id) where read = false and dismissed = false;
create index idx_notifications_type on public.notifications(type);
create index idx_notifications_created on public.notifications(created_at desc);
create index idx_notifications_expires on public.notifications(expires_at) where expires_at is not null;

-- RLS policies
alter table public.notifications enable row level security;

create policy "Users can read own notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);

create policy "Service role can manage notifications" on public.notifications
  for all using (auth.role() = 'service_role');


-- Notification Preferences: user settings for notification delivery
create table public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,

  -- Global settings
  enabled boolean not null default true,
  quiet_hours_start text, -- "22:00" format
  quiet_hours_end text,   -- "08:00" format

  -- Channel preferences
  push_enabled boolean not null default true,
  email_enabled boolean not null default false,
  in_app_enabled boolean not null default true,

  -- Type preferences
  injury_alerts boolean not null default true,
  injury_alert_severity text not null default 'starters' check (injury_alert_severity in ('all', 'starters', 'critical')),
  waiver_results boolean not null default true,
  weekly_reminders boolean not null default true,
  lineup_lock_reminders boolean not null default true,
  trade_alerts boolean not null default true,
  player_news boolean not null default false,
  game_start_alerts boolean not null default false,

  -- Timing preferences
  reminder_lead_time integer not null default 60, -- Minutes before lineup lock
  waiver_reminder_lead_time integer not null default 4, -- Hours before waiver deadline

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS policies
alter table public.notification_preferences enable row level security;

create policy "Users can read own preferences" on public.notification_preferences
  for select using (auth.uid() = user_id);

create policy "Users can update own preferences" on public.notification_preferences
  for update using (auth.uid() = user_id);

create policy "Users can insert own preferences" on public.notification_preferences
  for insert with check (auth.uid() = user_id);

create policy "Service role can manage preferences" on public.notification_preferences
  for all using (auth.role() = 'service_role');


-- Push Subscriptions: Web Push API subscription data
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Web Push subscription data
  endpoint text not null,
  p256dh_key text not null,
  auth_key text not null,

  created_at timestamptz not null default now(),

  constraint unique_user_endpoint unique (user_id, endpoint)
);

-- Index for looking up subscriptions by user
create index idx_push_subscriptions_user on public.push_subscriptions(user_id);

-- RLS policies
alter table public.push_subscriptions enable row level security;

create policy "Users can read own subscriptions" on public.push_subscriptions
  for select using (auth.uid() = user_id);

create policy "Users can insert own subscriptions" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own subscriptions" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

create policy "Service role can manage subscriptions" on public.push_subscriptions
  for all using (auth.role() = 'service_role');

