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
