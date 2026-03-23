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
