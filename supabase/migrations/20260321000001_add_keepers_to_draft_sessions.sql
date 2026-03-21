-- FF-029: Add keepers column to draft_sessions
-- Stores keeper assignments: [{ player_name, position, manager, cost }]
alter table public.draft_sessions
  add column if not exists keepers jsonb not null default '[]'::jsonb;
