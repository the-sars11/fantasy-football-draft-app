-- FF-067: Add scoring_settings jsonb column to leagues table
-- Stores custom scoring settings when scoring_format = 'custom'
-- For preset formats (standard, half_ppr, ppr), this can be null — the app resolves from presets

alter table public.leagues
  add column if not exists scoring_settings jsonb default null;

-- Add a comment for documentation
comment on column public.leagues.scoring_settings is
  'Custom scoring settings (jsonb). Populated when scoring_format = "custom". Schema matches ScoringSettings interface: pass_yds, pass_td, rush_yds, rec, etc.';
