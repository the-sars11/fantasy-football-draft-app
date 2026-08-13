-- R7a: Graded tag scale + stable external player ID for user_tags
-- Closes RV-15 (binary tagging UI) + RV-17 (name-anchored persistence)
--
-- RV-15: user_tags.tags[] was binary ('target'/'avoid'). Two new columns carry
--   the grade: tag_weight (1-10, urgency of a target) and tag_severity
--   ('soft'/'hard', strength of an avoid). Both default to the neutral midpoint.
--
-- RV-17: players_cache.id is an auto-generated UUID that changes whenever the
--   seed script re-runs. Tagging was anchored on that UUID, so a re-seed could
--   cascade-delete every user_tags row. player_external_id stores the Sleeper
--   player ID (stable across re-seeds). The existing player_cache_id FK is kept
--   for backward compat and still enforces relational integrity; player_external_id
--   is the durable anchor for tag survival.
--
-- Backfill: rows where players_cache.external_id is NULL receive NULL in
--   player_external_id. They are NOT deleted or orphaned; their player_cache_id
--   FK is intact. Count is logged via RAISE NOTICE for the migration run record.

-- 1. Add the three new columns (idempotent via IF NOT EXISTS)
ALTER TABLE public.user_tags
  ADD COLUMN IF NOT EXISTS tag_weight   integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS tag_severity text    NOT NULL DEFAULT 'soft',
  ADD COLUMN IF NOT EXISTS player_external_id text;

-- 2. Constraints (skip if already exist — re-run safe pattern)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_tags_tag_weight_range'
      AND table_name = 'user_tags'
  ) THEN
    ALTER TABLE public.user_tags
      ADD CONSTRAINT user_tags_tag_weight_range
        CHECK (tag_weight >= 1 AND tag_weight <= 10);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'user_tags_tag_severity_values'
      AND table_name = 'user_tags'
  ) THEN
    ALTER TABLE public.user_tags
      ADD CONSTRAINT user_tags_tag_severity_values
        CHECK (tag_severity IN ('soft', 'hard'));
  END IF;
END $$;

-- 3. Backfill player_external_id from players_cache.external_id
--    Only updates rows where external_id is available; leaves the rest NULL
--    (documented below). This is the stable Sleeper/ESPN player ID that survives
--    a full re-seed of the players_cache table.
UPDATE public.user_tags ut
SET player_external_id = pc.external_id
FROM public.players_cache pc
WHERE ut.player_cache_id = pc.id
  AND pc.external_id IS NOT NULL
  AND ut.player_external_id IS NULL;

-- 4. Document unmatched rows in migration output
--    "Unmatched" = player_external_id still NULL after backfill, meaning
--    players_cache.external_id was NULL for those players. These rows are valid.
--    Their player_cache_id FK is intact. player_external_id stays NULL until
--    the seed is re-run with external_id populated for those players.
DO $$
DECLARE
  unmatched_count integer;
  total_count     integer;
BEGIN
  SELECT COUNT(*) INTO total_count FROM public.user_tags;
  SELECT COUNT(*) INTO unmatched_count
  FROM public.user_tags
  WHERE player_external_id IS NULL;

  RAISE NOTICE 'R7a migration: % of % user_tags rows have no player_external_id (players_cache.external_id was NULL). These rows are VALID — player_cache_id FK intact. player_external_id will be populated on the next seed run that includes external_id for those players.',
    unmatched_count, total_count;
END $$;

-- 5. Index for future lookups by stable external player ID
CREATE INDEX IF NOT EXISTS idx_user_tags_external_id
  ON public.user_tags(player_external_id)
  WHERE player_external_id IS NOT NULL;
