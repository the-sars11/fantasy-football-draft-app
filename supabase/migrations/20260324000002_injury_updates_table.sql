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
