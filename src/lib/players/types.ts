/**
 * Player Data Types
 *
 * Core TypeScript types for the player data model.
 */

export type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF'

export type ScoringFormat = 'standard' | 'half-ppr' | 'ppr'

export type DraftFormat = 'auction' | 'snake'

export type Platform = 'espn' | 'yahoo' | 'sleeper'

export interface Player {
  id: string
  name: string
  team: string
  position: Position
  byeWeek: number
  injuryStatus?: string

  // Consensus values (normalized from multiple sources)
  consensusRank: number
  consensusAuctionValue: number
  consensusTier: number
  adp: number

  // Per-source data
  sourceData: SourcePlayerData[]

  // Projections
  projections: PlayerProjections

  // LLM analysis results (populated after research run)
  analysis?: PlayerAnalysis
}

export interface SourcePlayerData {
  source: Platform | 'fantasypros'
  rank: number
  auctionValue?: number
  adp?: number
  tier?: number
  fetchedAt: string
}

export interface PlayerProjections {
  points: number
  passingYards?: number
  passingTDs?: number
  rushingYards?: number
  rushingTDs?: number
  receivingYards?: number
  receivingTDs?: number
  receptions?: number
}

export interface PlayerAnalysis {
  adjustedAuctionValue?: { floor: number; ceiling: number; target: number }
  adjustedRoundTarget?: { early: number; late: number }
  targetStatus: 'target' | 'avoid' | 'neutral'
  reasoning: string
  tier: number
  isSleeper: boolean
  riskLevel: 'low' | 'medium' | 'high'
}

export interface League {
  id: string
  userId: string
  name: string
  platform: Platform
  format: DraftFormat
  size: number // number of teams
  budget?: number // auction budget per team
  scoringFormat: ScoringFormat
  rosterSlots: RosterSlots
  keeperSettings?: KeeperSettings
}

export interface RosterSlots {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  superflex: number
  k: number
  def: number
  bench: number
}

export interface KeeperSettings {
  enabled: boolean
  maxKeepers: number
  keeperCostType: 'round' | 'auction-price' | 'flat'
}

export interface KeeperPlayer {
  playerId: string
  cost: number // round number or auction price
  managerName: string
}

export interface ResearchRun {
  id: string
  leagueId: string
  strategySettings: StrategySettings
  players: Player[]
  createdAt: string
}

// --- Strategy System Types (FF-S01) ---

export type StrategySource = 'ai' | 'user' | 'preset'
export type RiskTolerance = 'conservative' | 'balanced' | 'aggressive'
export type PlayerAvoidSeverity = 'soft' | 'hard'

export interface PlayerTarget {
  playerId: string
  playerName: string
  weight: number // 1-10
  note?: string
}

export interface PlayerAvoid {
  playerId: string
  playerName: string
  severity: PlayerAvoidSeverity
  reason?: string
}

export interface Strategy {
  id: string
  leagueId: string
  name: string
  description?: string
  archetype: string
  source: StrategySource
  isActive: boolean

  // Position emphasis (1-10, format-agnostic)
  positionWeights: Record<Position, number>

  // Player targeting
  playerTargets: PlayerTarget[]
  playerAvoids: PlayerAvoid[]
  teamAvoids: string[]

  // Risk
  riskTolerance: RiskTolerance

  // Auction-only (undefined when snake)
  budgetAllocation?: Record<string, number> // % of budget per position + bench
  maxBidPercentage?: number

  // Snake-only (undefined when auction)
  roundTargets?: Record<Position, number[]>
  positionRoundPriority?: Record<string, Position[]> // early/mid/late

  // AI-generated fields
  aiReasoning?: string
  aiConfidence?: 'high' | 'medium' | 'low'
  projectedCeiling?: number
  projectedFloor?: number

  createdAt: string
  updatedAt: string
}

// Backward-compatible alias for ResearchRun
export interface StrategySettings {
  positionWeights: Record<Position, number>
  riskTolerance: RiskTolerance
  budgetAllocation?: Record<Position, number>
  roundTargets?: Record<Position, number[]>
}

export interface DraftPick {
  pickNumber: number
  round?: number
  playerId: string
  playerName: string
  managerName: string
  price?: number // auction
  position: Position
}

export interface DraftRecommendation {
  targets: Array<{
    playerId: string
    playerName: string
    position: Position
    adjustedValue: number
    reasoning: string
    confidence: 'high' | 'medium' | 'low'
  }>
  maxBid?: number // auction
  urgencyWarnings: string[]
  strategyPivot?: string
}
