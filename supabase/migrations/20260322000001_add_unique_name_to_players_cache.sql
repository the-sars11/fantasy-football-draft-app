-- Add unique constraint on name in players_cache for upsert support
-- The cache upserts use onConflict: 'name' which requires this constraint
alter table public.players_cache add constraint players_cache_name_unique unique (name);
