-- User Platform Connections (FF-114)
-- Stores OAuth tokens and platform-specific user IDs for roster sync

CREATE TABLE IF NOT EXISTS user_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('espn', 'yahoo', 'sleeper')),
  platform_user_id text NOT NULL,
  platform_username text NOT NULL,

  -- OAuth tokens (null for Sleeper which doesn't require auth)
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- One connection per platform per user
  CONSTRAINT unique_user_platform UNIQUE (user_id, platform)
);

-- Index for quick lookup by user
CREATE INDEX idx_user_connections_user ON user_connections(user_id);

-- RLS policies
ALTER TABLE user_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view own connections"
  ON user_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own connections"
  ON user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own connections"
  ON user_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own connections"
  ON user_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass
CREATE POLICY "Service role full access"
  ON user_connections
  USING (auth.jwt()->>'role' = 'service_role');


-- User Rosters Cache (for quick access without API calls)
CREATE TABLE IF NOT EXISTS user_rosters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('espn', 'yahoo', 'sleeper')),
  league_id text NOT NULL,
  league_name text NOT NULL,
  team_id text NOT NULL,
  team_name text NOT NULL,
  season integer NOT NULL DEFAULT 2026,
  week integer NOT NULL,
  scoring_format text NOT NULL CHECK (scoring_format IN ('standard', 'half_ppr', 'ppr')),

  -- Full roster data as JSONB
  players jsonb NOT NULL DEFAULT '[]',
  roster_settings jsonb NOT NULL DEFAULT '{}',

  -- FAAB and waiver info
  faab_budget integer,
  faab_remaining integer,
  waiver_priority integer,

  -- Record
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  ties integer DEFAULT 0,

  fetched_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),

  -- One roster per league per week per user
  CONSTRAINT unique_user_league_week UNIQUE (user_id, platform, league_id, season, week)
);

-- Indexes
CREATE INDEX idx_user_rosters_user ON user_rosters(user_id);
CREATE INDEX idx_user_rosters_league ON user_rosters(league_id);
CREATE INDEX idx_user_rosters_week ON user_rosters(season, week);

-- RLS policies
ALTER TABLE user_rosters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rosters"
  ON user_rosters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rosters"
  ON user_rosters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rosters"
  ON user_rosters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on rosters"
  ON user_rosters
  USING (auth.jwt()->>'role' = 'service_role');
