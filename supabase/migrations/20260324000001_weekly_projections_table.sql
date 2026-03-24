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
