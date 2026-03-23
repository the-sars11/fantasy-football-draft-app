export type Platform = 'espn' | 'yahoo' | 'sleeper' | 'other'
export type DraftFormat = 'auction' | 'snake'
export type ScoringFormat = 'standard' | 'half_ppr' | 'ppr' | 'custom'
export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST'
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed'
export type DraftStatus = 'setup' | 'live' | 'paused' | 'completed'

export interface RosterSlots {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  k: number
  dst: number
  bench: number
  ir: number
  [key: string]: number
}

export interface ScoringSettings {
  // Passing
  pass_yds: number       // pts per yard (e.g. 0.04 = 1pt/25yds, ESPN "0.2 per 5yds" = 0.04)
  pass_td: number
  pass_int: number       // negative
  pass_2pt: number
  pass_td_40: number     // 40+ yd TD bonus
  pass_td_50: number     // 50+ yd TD bonus
  pass_300: number       // 300-399 yd game bonus
  pass_400: number       // 400+ yd game bonus
  // Rushing
  rush_yds: number       // pts per yard
  rush_td: number
  rush_2pt: number
  rush_td_40: number
  rush_td_50: number
  rush_100: number       // 100-199 yd game bonus
  rush_200: number       // 200+ yd game bonus
  // Receiving
  rec_yds: number        // pts per yard
  rec: number            // pts per reception (PPR value)
  rec_td: number
  rec_2pt: number
  rec_td_40: number
  rec_td_50: number
  rec_100: number        // 100-199 yd game bonus
  rec_200: number        // 200+ yd game bonus
  // D/ST
  dst_sack: number
  dst_int: number
  dst_fr: number         // fumble recovery
  dst_td: number         // any return TD
  dst_safety: number
  dst_block: number      // blocked kick
  // Misc
  fumble_lost: number    // negative
  // Allow arbitrary additional keys for platform-specific settings
  [key: string]: number
}

export interface KeeperSettings {
  max_keepers: number
  cost_type: 'round' | 'auction_price'
  keepers: Array<{
    player_name: string
    position: Position
    cost: number // round number or auction price
  }>
}

export interface League {
  id: string
  user_id: string
  name: string
  platform: Platform
  format: DraftFormat
  team_count: number
  budget: number | null
  scoring_format: ScoringFormat
  scoring_settings: ScoringSettings | null
  roster_slots: RosterSlots
  keeper_enabled: boolean
  keeper_settings: KeeperSettings | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LeagueInsert {
  name: string
  platform: Platform
  format: DraftFormat
  team_count?: number
  budget?: number | null
  scoring_format?: ScoringFormat
  scoring_settings?: ScoringSettings | null
  roster_slots?: RosterSlots
  keeper_enabled?: boolean
  keeper_settings?: KeeperSettings | null
}

export interface PlayerCache {
  id: string
  external_id: string | null
  name: string
  team: string | null
  position: Position
  bye_week: number | null
  adp: Record<string, number>
  auction_values: Record<string, number>
  projections: Record<string, number>
  injury_status: string | null
  source_data: Record<string, unknown>
  last_updated_at: string
  created_at: string
}

export interface ResearchRun {
  id: string
  user_id: string
  league_id: string
  strategy_settings: Record<string, unknown>
  results: Record<string, unknown> | null
  status: RunStatus
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface DraftSession {
  id: string
  user_id: string
  league_id: string
  sheet_url: string | null
  format: DraftFormat
  status: DraftStatus
  managers: Array<{
    name: string
    budget?: number
    draft_position?: number
  }>
  picks: Array<{
    player_id: string
    manager: string
    price?: number
    round?: number
    pick_number: number
  }>
  keepers: Array<{
    player_name: string
    position: string
    manager: string
    cost: number
  }>
  recommendations: Array<Record<string, unknown>>
  created_at: string
  updated_at: string
}

// --- Strategy types ---

export type StrategySource = 'ai' | 'user' | 'preset'
export type RiskTolerance = 'conservative' | 'balanced' | 'aggressive'
export type AiConfidence = 'high' | 'medium' | 'low'
export type PlayerAvoidSeverity = 'soft' | 'hard'

export interface StrategyPlayerTarget {
  player_id: string
  player_name: string
  weight: number // 1-10
  note?: string
}

export interface StrategyPlayerAvoid {
  player_id: string
  player_name: string
  severity: PlayerAvoidSeverity
  reason?: string
}

export interface Strategy {
  id: string
  user_id: string
  league_id: string
  name: string
  description: string | null
  archetype: string
  source: StrategySource
  is_active: boolean
  position_weights: Record<Position, number>
  player_targets: StrategyPlayerTarget[]
  player_avoids: StrategyPlayerAvoid[]
  team_avoids: string[]
  risk_tolerance: RiskTolerance
  // Auction-only
  budget_allocation: Record<string, number> | null
  max_bid_percentage: number | null
  // Snake-only
  round_targets: Record<Position, number[]> | null
  position_round_priority: Record<string, Position[]> | null
  // AI fields
  ai_reasoning: string | null
  ai_confidence: AiConfidence | null
  projected_ceiling: number | null
  projected_floor: number | null
  created_at: string
  updated_at: string
}

export interface StrategyInsert {
  league_id: string
  name: string
  description?: string | null
  archetype: string
  source?: StrategySource
  is_active?: boolean
  position_weights?: Record<Position, number>
  player_targets?: StrategyPlayerTarget[]
  player_avoids?: StrategyPlayerAvoid[]
  team_avoids?: string[]
  risk_tolerance?: RiskTolerance
  budget_allocation?: Record<string, number> | null
  max_bid_percentage?: number | null
  round_targets?: Record<Position, number[]> | null
  position_round_priority?: Record<string, Position[]> | null
  ai_reasoning?: string | null
  ai_confidence?: AiConfidence | null
  projected_ceiling?: number | null
  projected_floor?: number | null
}

export interface StrategyUpdate {
  name?: string
  description?: string | null
  archetype?: string
  is_active?: boolean
  position_weights?: Record<Position, number>
  player_targets?: StrategyPlayerTarget[]
  player_avoids?: StrategyPlayerAvoid[]
  team_avoids?: string[]
  risk_tolerance?: RiskTolerance
  budget_allocation?: Record<string, number> | null
  max_bid_percentage?: number | null
  round_targets?: Record<Position, number[]> | null
  position_round_priority?: Record<string, Position[]> | null
}

// --- Player Intelligence System types ---

export type SystemTagType = 'BREAKOUT' | 'SLEEPER' | 'VALUE' | 'BUST' | 'AVOID'
export type UserTagType = 'target' | 'avoid' | 'watch' | 'sleeper' | 'breakout' | string
export type SentimentType = 'bullish' | 'neutral' | 'bearish'
export type SourceType = 'api' | 'scrape' | 'manual'
export type RuleType = 'avoid' | 'target' | 'filter' | 'boost' | 'custom'
export type ConditionOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_list'
export type FetchStatus = 'success' | 'failed' | 'rate_limited' | 'awaiting_data'

// System tag detected by sentiment analysis
export interface SystemTag {
  tag: SystemTagType
  confidence: number // 0-1
  sources: string[] // sources that contributed to this tag
  reasoning: string
  score_modifier: number
  adp_gap?: number // for VALUE/AVOID tags
}

// Sentiment from a single source
export interface SourceSentiment {
  source: string
  sentiment: SentimentType
  mentions: string[] // relevant quotes/phrases
  fetched_at: string
}

// Aggregated sentiment data
export interface SentimentData {
  sources: SourceSentiment[]
  consensus_sentiment: SentimentType
  sentiment_score: number // 0-100, higher = more bullish
}

// Source freshness tracking
export interface SourceFreshness {
  fetched_at: string
  is_2026_data: boolean
  data_type: string // 'rankings', 'projections', 'sentiment', etc.
}

// Player Intelligence record
export interface PlayerIntel {
  id: string
  player_cache_id: string
  player_name: string
  season: number
  sentiment_data: SentimentData
  system_tags: SystemTag[]
  source_freshness: Record<string, SourceFreshness>
  advanced_metrics: Record<string, number> | null
  computed_at: string
  created_at: string
}

export interface PlayerIntelInsert {
  player_cache_id: string
  player_name: string
  season?: number
  sentiment_data?: SentimentData
  system_tags?: SystemTag[]
  source_freshness?: Record<string, SourceFreshness>
  advanced_metrics?: Record<string, number> | null
}

// User tags for a player
export interface UserTags {
  id: string
  user_id: string
  player_cache_id: string
  league_id: string | null
  tags: UserTagType[]
  note: string | null
  override_system_tags: boolean
  dismissed_system_tags: string[]
  created_at: string
  updated_at: string
}

export interface UserTagsInsert {
  player_cache_id: string
  league_id?: string | null
  tags?: UserTagType[]
  note?: string | null
  override_system_tags?: boolean
  dismissed_system_tags?: string[]
}

export interface UserTagsUpdate {
  tags?: UserTagType[]
  note?: string | null
  override_system_tags?: boolean
  dismissed_system_tags?: string[]
}

// Parsed rule condition
export interface RuleCondition {
  field: string // position, team, age, years_exp, injury_status, bye_week, adp, auction_value, tag
  operator: ConditionOperator
  value: string | number | string[]
}

// Parsed rule structure
export interface ParsedRule {
  action: RuleType
  conditions: RuleCondition[]
  score_modifier: number // -50 to +50
  confidence: number // 0-1
}

// User rule record
export interface UserRule {
  id: string
  user_id: string
  league_id: string | null
  rule_text: string
  rule_type: RuleType
  is_active: boolean
  parsed_rule: ParsedRule
  llm_interpretation: string | null
  is_validated: boolean
  validation_error: string | null
  created_at: string
  updated_at: string
}

export interface UserRuleInsert {
  league_id?: string | null
  rule_text: string
  rule_type: RuleType
  is_active?: boolean
  parsed_rule: ParsedRule
  llm_interpretation?: string | null
  is_validated?: boolean
  validation_error?: string | null
}

export interface UserRuleUpdate {
  rule_text?: string
  rule_type?: RuleType
  is_active?: boolean
  parsed_rule?: ParsedRule
  llm_interpretation?: string | null
  is_validated?: boolean
  validation_error?: string | null
}

// Source freshness configuration
export interface FreshnessConfig {
  rankings_ttl_hours: number
  projections_ttl_hours: number
  sentiment_ttl_hours: number
}

// Source configuration
export interface SourceConfig {
  base_url: string
  requires_auth?: boolean
  rate_limit_per_hour?: number
  data_types: string[]
}

// Scrape configuration
export interface ScrapeConfig {
  user_agent_rotation: boolean
  rate_limit_delay_ms: number
  retry_count: number
}

// Source registry record
export interface SourceRegistry {
  id: string
  source_key: string
  display_name: string
  source_type: SourceType
  config: SourceConfig
  freshness_config: FreshnessConfig
  consensus_weight: number
  is_enabled: boolean
  last_fetch_at: string | null
  last_fetch_status: FetchStatus | null
  last_fetch_error: string | null
  season_data_available: boolean
  season_data_checked_at: string | null
  scrape_config: ScrapeConfig | null
  created_at: string
  updated_at: string
}

export interface SourceRegistryInsert {
  source_key: string
  display_name: string
  source_type: SourceType
  config?: SourceConfig
  freshness_config?: FreshnessConfig
  consensus_weight?: number
  is_enabled?: boolean
  scrape_config?: ScrapeConfig | null
}

export interface SourceRegistryUpdate {
  display_name?: string
  source_type?: SourceType
  config?: SourceConfig
  freshness_config?: FreshnessConfig
  consensus_weight?: number
  is_enabled?: boolean
  last_fetch_at?: string | null
  last_fetch_status?: FetchStatus | null
  last_fetch_error?: string | null
  season_data_available?: boolean
  season_data_checked_at?: string | null
  scrape_config?: ScrapeConfig | null
}

// Score modifiers for tags (constants)
export const TAG_SCORE_MODIFIERS: Record<SystemTagType, number> = {
  BREAKOUT: 15,
  SLEEPER: 10,
  VALUE: 12,
  BUST: -20,
  AVOID: -25,
}

// Special user tag score modifier
export const TARGET_SCORE_MODIFIER = 25
