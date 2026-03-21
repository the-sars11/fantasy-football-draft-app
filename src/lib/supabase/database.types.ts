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
