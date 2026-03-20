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
