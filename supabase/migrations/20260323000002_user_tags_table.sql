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
