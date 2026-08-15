-- D3: Persistent user star-ratings for generated strategy proposals.
-- Keyed on (user_id, league_id, archetype) so ratings survive re-generate and re-pull.
-- Rating 1-5; a row's absence means unrated.

CREATE TABLE IF NOT EXISTS user_strategy_ratings (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  league_id  uuid        NOT NULL REFERENCES leagues(id)    ON DELETE CASCADE,
  archetype  text        NOT NULL,
  rating     integer     NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_strategy_rating UNIQUE (user_id, league_id, archetype),
  CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5)
);

CREATE INDEX IF NOT EXISTS idx_user_strategy_ratings_lookup
  ON user_strategy_ratings (user_id, league_id);

ALTER TABLE user_strategy_ratings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_strategy_ratings' AND policyname = 'usr_strategy_ratings_own'
  ) THEN
    CREATE POLICY usr_strategy_ratings_own ON user_strategy_ratings
      FOR ALL TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
