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
