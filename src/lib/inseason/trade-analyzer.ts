/**
 * Trade Analyzer Service (FF-124 to FF-127)
 *
 * Analyzes fantasy football trades with:
 * - Rest-of-Season (ROS) value calculations
 * - Roster impact analysis
 * - Fair trade finder
 * - Veto risk prediction
 */

import type { Position, ScoringFormat } from '@/lib/players/types'
import type { UserRoster, RosterPlayer } from './roster-sync'
import { fetchSleeperProjections } from '@/lib/research/sources/sleeper'

// --- Types ---

export interface PlayerValue {
  playerId: string
  playerName: string
  position: Position
  team: string
  rosValue: number // Rest-of-season projected points
  rosRank: number // Position rank ROS
  weeklyAvg: number // Average weekly points
  ceiling: number // Upside projection
  floor: number // Floor projection
  byeWeek: number
  injuryRisk: 'low' | 'medium' | 'high'
  schedule: 'easy' | 'neutral' | 'hard'
  tradeValue: number // 0-100 normalized value
}

export interface TradePackage {
  players: PlayerValue[]
  totalValue: number
  positionBreakdown: Record<Position, number>
}

export interface RosterImpact {
  position: Position
  beforeStarter: string | null
  afterStarter: string | null
  beforeBackup: string | null
  afterBackup: string | null
  improvement: number // Positive = better, negative = worse
  fillsNeed: boolean
  createsHole: boolean
}

export interface TradeAnalysis {
  giving: TradePackage
  receiving: TradePackage
  netValue: number // Positive = you win
  verdict: 'strong_accept' | 'accept' | 'fair' | 'decline' | 'strong_decline'
  confidence: number // 0-100
  rosterImpacts: RosterImpact[]
  rosProjectionChange: number // Change in total ROS points
  ceilingChange: number
  floorChange: number
  reasoning: string[]
  warnings: string[]
  vetoRisk: 'none' | 'low' | 'medium' | 'high'
  vetoReasons: string[]
}

export interface FairTradeOption {
  playersToOffer: PlayerValue[]
  targetPlayer: PlayerValue
  valueDifference: number // How close to fair (0 = perfect)
  yourNetGain: number
  likelihood: 'high' | 'medium' | 'low' // Chance other manager accepts
  reasoning: string
}

// --- Constants ---

// Position scarcity multipliers (RBs are more scarce than WRs)
const POSITION_SCARCITY: Record<Position, number> = {
  QB: 0.85,
  RB: 1.15,
  WR: 1.0,
  TE: 1.1,
  K: 0.5,
  DEF: 0.5,
}

// Bye week importance (later = more valuable to have player available)
const BYE_WEEK_PENALTY: Record<number, number> = {
  5: 0.02,
  6: 0.02,
  7: 0.03,
  8: 0.03,
  9: 0.04,
  10: 0.04,
  11: 0.05,
  12: 0.05,
  13: 0.06,
  14: 0.08, // Fantasy playoffs
}

// Trade value thresholds for verdicts
const TRADE_VERDICT_THRESHOLDS = {
  strong_accept: 15,
  accept: 5,
  fair: -5,
  decline: -15,
  // Below -15 = strong_decline
}

// Veto thresholds (one-sided trades)
const VETO_THRESHOLDS = {
  low: 20, // > 20% value difference
  medium: 35, // > 35% value difference
  high: 50, // > 50% value difference
}

// --- Player Value Calculations ---

/**
 * Calculate Rest-of-Season value for a player
 */
export async function calculatePlayerValue(
  playerId: string,
  playerName: string,
  position: Position,
  team: string,
  scoringFormat: ScoringFormat = 'ppr',
  currentWeek: number = 1
): Promise<PlayerValue> {
  // Fetch season projections
  const projections = await fetchSleeperProjections()
  const projection = projections.find((p) => p.sleeperId === playerId)

  // Get projected points based on scoring format
  const seasonPoints = projection?.points?.[scoringFormat === 'ppr' ? 'ppr' : scoringFormat === 'half-ppr' ? 'halfPpr' : 'standard'] || 0

  // Calculate remaining weeks (18 week season, typically 14-15 fantasy weeks)
  const remainingWeeks = Math.max(1, 15 - currentWeek)
  const weeklyAvg = seasonPoints / 17 // Full season average
  const rosValue = weeklyAvg * remainingWeeks

  // Calculate ceiling/floor (rough estimates)
  const ceiling = rosValue * 1.3
  const floor = rosValue * 0.7

  // Get position rank (would need more data for accurate ranking)
  const rosRank = await getPositionRank(playerId, position, scoringFormat)

  // Estimate bye week from team (simplified - would use real schedule)
  const byeWeek = getTeamByeWeek(team)

  // Estimate injury risk (would use real injury data)
  const injuryRisk = estimateInjuryRisk(playerName, position)

  // Estimate schedule strength (would use real matchup data)
  const schedule = estimateScheduleStrength(team)

  // Calculate normalized trade value (0-100)
  const tradeValue = calculateTradeValue(rosValue, position, rosRank, byeWeek, currentWeek)

  return {
    playerId,
    playerName,
    position,
    team,
    rosValue,
    rosRank,
    weeklyAvg,
    ceiling,
    floor,
    byeWeek,
    injuryRisk,
    schedule,
    tradeValue,
  }
}

/**
 * Calculate normalized trade value (0-100 scale)
 */
function calculateTradeValue(
  rosValue: number,
  position: Position,
  positionRank: number,
  byeWeek: number,
  currentWeek: number
): number {
  // Base value from ROS points
  let value = rosValue

  // Apply position scarcity
  value *= POSITION_SCARCITY[position]

  // Apply position rank bonus/penalty
  if (positionRank <= 5) value *= 1.2
  else if (positionRank <= 12) value *= 1.1
  else if (positionRank <= 24) value *= 1.0
  else if (positionRank <= 36) value *= 0.85
  else value *= 0.7

  // Apply bye week penalty if bye hasn't passed
  if (byeWeek > currentWeek) {
    value *= 1 - (BYE_WEEK_PENALTY[byeWeek] || 0.03)
  }

  // Normalize to 0-100 scale
  // Top players ~300 ROS points, bottom ~50
  const normalized = Math.min(100, Math.max(0, (value / 300) * 100))

  return Math.round(normalized * 10) / 10
}

/**
 * Get position rank for a player
 */
async function getPositionRank(
  playerId: string,
  position: Position,
  scoringFormat: ScoringFormat
): Promise<number> {
  const projections = await fetchSleeperProjections()

  // Filter to same position and sort by points
  const positionPlayers = projections
    .filter((p) => {
      // Would need position data here - for now assume all are relevant
      return true
    })
    .sort((a, b) => {
      const aPoints = a.points?.[scoringFormat === 'ppr' ? 'ppr' : scoringFormat === 'half-ppr' ? 'halfPpr' : 'standard'] || 0
      const bPoints = b.points?.[scoringFormat === 'ppr' ? 'ppr' : scoringFormat === 'half-ppr' ? 'halfPpr' : 'standard'] || 0
      return bPoints - aPoints
    })

  const rank = positionPlayers.findIndex((p) => p.sleeperId === playerId) + 1
  return rank > 0 ? rank : 50 // Default to 50 if not found
}

/**
 * Get team bye week (simplified - would use real schedule)
 */
function getTeamByeWeek(team: string): number {
  // 2024 bye weeks (example)
  const byeWeeks: Record<string, number> = {
    DET: 5, LAC: 5,
    KC: 6, LAR: 6, MIA: 6, MIN: 6, PHI: 6,
    CHI: 7, DAL: 7,
    CLE: 10, GB: 10, LV: 10, SEA: 10,
    ATL: 12, BUF: 12, CIN: 12, JAX: 12, NO: 12, NYJ: 12,
    ARI: 11, CAR: 11, NYG: 11, TB: 11,
    DEN: 14, IND: 14, NE: 14, TEN: 14,
    BAL: 14, HOU: 14, PIT: 9, WAS: 14,
    SF: 9,
  }
  return byeWeeks[team] || 9
}

/**
 * Estimate injury risk (simplified)
 */
function estimateInjuryRisk(playerName: string, position: Position): 'low' | 'medium' | 'high' {
  // RBs have higher injury risk
  if (position === 'RB') return 'medium'
  // Would check actual injury history here
  return 'low'
}

/**
 * Estimate schedule strength (simplified)
 */
function estimateScheduleStrength(team: string): 'easy' | 'neutral' | 'hard' {
  // Would use actual schedule/matchup data
  return 'neutral'
}

// --- Trade Analysis ---

/**
 * Analyze a proposed trade
 */
export async function analyzeTrade(
  givingPlayers: Array<{ playerId: string; playerName: string; position: Position; team: string }>,
  receivingPlayers: Array<{ playerId: string; playerName: string; position: Position; team: string }>,
  roster: UserRoster | null,
  scoringFormat: ScoringFormat = 'ppr',
  currentWeek: number = 1
): Promise<TradeAnalysis> {
  // Calculate values for all players
  const givingValues = await Promise.all(
    givingPlayers.map((p) =>
      calculatePlayerValue(p.playerId, p.playerName, p.position, p.team, scoringFormat, currentWeek)
    )
  )

  const receivingValues = await Promise.all(
    receivingPlayers.map((p) =>
      calculatePlayerValue(p.playerId, p.playerName, p.position, p.team, scoringFormat, currentWeek)
    )
  )

  // Build trade packages
  const giving: TradePackage = {
    players: givingValues,
    totalValue: givingValues.reduce((sum, p) => sum + p.tradeValue, 0),
    positionBreakdown: buildPositionBreakdown(givingValues),
  }

  const receiving: TradePackage = {
    players: receivingValues,
    totalValue: receivingValues.reduce((sum, p) => sum + p.tradeValue, 0),
    positionBreakdown: buildPositionBreakdown(receivingValues),
  }

  // Calculate net value
  const netValue = receiving.totalValue - giving.totalValue

  // Determine verdict
  const verdict = determineVerdict(netValue)

  // Calculate confidence based on player count and value certainty
  const confidence = calculateConfidence(givingValues, receivingValues)

  // Analyze roster impact
  const rosterImpacts = roster
    ? analyzeRosterImpact(roster, givingValues, receivingValues)
    : []

  // Calculate projection changes
  const rosProjectionChange =
    receivingValues.reduce((sum, p) => sum + p.rosValue, 0) -
    givingValues.reduce((sum, p) => sum + p.rosValue, 0)

  const ceilingChange =
    receivingValues.reduce((sum, p) => sum + p.ceiling, 0) -
    givingValues.reduce((sum, p) => sum + p.ceiling, 0)

  const floorChange =
    receivingValues.reduce((sum, p) => sum + p.floor, 0) -
    givingValues.reduce((sum, p) => sum + p.floor, 0)

  // Generate reasoning
  const reasoning = generateTradeReasoning(
    givingValues,
    receivingValues,
    netValue,
    rosterImpacts
  )

  // Generate warnings
  const warnings = generateTradeWarnings(
    givingValues,
    receivingValues,
    rosterImpacts,
    currentWeek
  )

  // Calculate veto risk
  const { vetoRisk, vetoReasons } = calculateVetoRisk(giving.totalValue, receiving.totalValue)

  return {
    giving,
    receiving,
    netValue,
    verdict,
    confidence,
    rosterImpacts,
    rosProjectionChange,
    ceilingChange,
    floorChange,
    reasoning,
    warnings,
    vetoRisk,
    vetoReasons,
  }
}

function buildPositionBreakdown(players: PlayerValue[]): Record<Position, number> {
  const breakdown: Record<Position, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    K: 0,
    DEF: 0,
  }

  for (const player of players) {
    breakdown[player.position] += player.tradeValue
  }

  return breakdown
}

function determineVerdict(netValue: number): TradeAnalysis['verdict'] {
  if (netValue >= TRADE_VERDICT_THRESHOLDS.strong_accept) return 'strong_accept'
  if (netValue >= TRADE_VERDICT_THRESHOLDS.accept) return 'accept'
  if (netValue >= TRADE_VERDICT_THRESHOLDS.fair) return 'fair'
  if (netValue >= TRADE_VERDICT_THRESHOLDS.decline) return 'decline'
  return 'strong_decline'
}

function calculateConfidence(giving: PlayerValue[], receiving: PlayerValue[]): number {
  // Higher confidence with fewer players (less uncertainty)
  const playerCount = giving.length + receiving.length
  let confidence = 90 - (playerCount - 2) * 5

  // Lower confidence for injured players
  const hasInjuredPlayers =
    [...giving, ...receiving].some((p) => p.injuryRisk === 'high')
  if (hasInjuredPlayers) confidence -= 10

  // Lower confidence for hard schedules
  const hasHardSchedule =
    [...giving, ...receiving].some((p) => p.schedule === 'hard')
  if (hasHardSchedule) confidence -= 5

  return Math.max(40, Math.min(95, confidence))
}

function analyzeRosterImpact(
  roster: UserRoster,
  giving: PlayerValue[],
  receiving: PlayerValue[]
): RosterImpact[] {
  const impacts: RosterImpact[] = []

  // Group players by position
  const currentByPosition = new Map<Position, RosterPlayer[]>()
  for (const player of roster.players) {
    const existing = currentByPosition.get(player.position) || []
    existing.push(player)
    currentByPosition.set(player.position, existing)
  }

  // Analyze each position affected
  const affectedPositions = new Set<Position>([
    ...giving.map((p) => p.position),
    ...receiving.map((p) => p.position),
  ])

  for (const position of affectedPositions) {
    const currentPlayers = currentByPosition.get(position) || []
    const starters = currentPlayers.filter((p) => p.isStarter)
    const bench = currentPlayers.filter((p) => !p.isStarter)

    const givingAtPosition = giving.filter((p) => p.position === position)
    const receivingAtPosition = receiving.filter((p) => p.position === position)

    // Calculate value change at position
    const givingValue = givingAtPosition.reduce((sum, p) => sum + p.tradeValue, 0)
    const receivingValue = receivingAtPosition.reduce((sum, p) => sum + p.tradeValue, 0)
    const improvement = receivingValue - givingValue

    // Check if this fills a need or creates a hole
    const isLosingStarter = givingAtPosition.some((g) =>
      starters.some((s) => s.playerName.toLowerCase() === g.playerName.toLowerCase())
    )
    const hasBackupToPromote = bench.length > givingAtPosition.length

    impacts.push({
      position,
      beforeStarter: starters[0]?.playerName || null,
      afterStarter: isLosingStarter
        ? (receivingAtPosition[0]?.playerName || bench[0]?.playerName || null)
        : starters[0]?.playerName || null,
      beforeBackup: bench[0]?.playerName || null,
      afterBackup: isLosingStarter
        ? (bench[1]?.playerName || null)
        : (receivingAtPosition[0]?.playerName || bench[0]?.playerName || null),
      improvement,
      fillsNeed: receivingAtPosition.length > 0 && (starters.length === 0 || bench.length === 0),
      createsHole: isLosingStarter && !hasBackupToPromote && receivingAtPosition.length === 0,
    })
  }

  return impacts
}

function generateTradeReasoning(
  giving: PlayerValue[],
  receiving: PlayerValue[],
  netValue: number,
  impacts: RosterImpact[]
): string[] {
  const reasons: string[] = []

  // Value comparison
  if (netValue > 10) {
    reasons.push(`You're gaining significant value (+${netValue.toFixed(1)} points)`)
  } else if (netValue > 0) {
    reasons.push(`Slight value advantage in your favor (+${netValue.toFixed(1)} points)`)
  } else if (netValue > -5) {
    reasons.push(`Trade is roughly even in value`)
  } else {
    reasons.push(`You're giving up value (${netValue.toFixed(1)} points)`)
  }

  // Position upgrades/downgrades
  for (const impact of impacts) {
    if (impact.improvement > 5) {
      reasons.push(`Upgrading at ${impact.position} (+${impact.improvement.toFixed(1)} value)`)
    } else if (impact.improvement < -5) {
      reasons.push(`Downgrading at ${impact.position} (${impact.improvement.toFixed(1)} value)`)
    }
  }

  // Roster fit
  const fillsNeed = impacts.some((i) => i.fillsNeed)
  const createsHole = impacts.some((i) => i.createsHole)

  if (fillsNeed && !createsHole) {
    reasons.push(`This trade addresses a roster need without creating a new hole`)
  } else if (createsHole && !fillsNeed) {
    reasons.push(`Warning: This trade may leave you thin at a position`)
  }

  // Star player considerations
  const topPlayerGiving = giving.sort((a, b) => b.tradeValue - a.tradeValue)[0]
  const topPlayerReceiving = receiving.sort((a, b) => b.tradeValue - a.tradeValue)[0]

  if (topPlayerReceiving && topPlayerGiving) {
    if (topPlayerReceiving.tradeValue > topPlayerGiving.tradeValue + 10) {
      reasons.push(
        `Getting the best player in the deal (${topPlayerReceiving.playerName})`
      )
    } else if (topPlayerGiving.tradeValue > topPlayerReceiving.tradeValue + 10) {
      reasons.push(
        `Giving up the best player in the deal (${topPlayerGiving.playerName})`
      )
    }
  }

  return reasons
}

function generateTradeWarnings(
  giving: PlayerValue[],
  receiving: PlayerValue[],
  impacts: RosterImpact[],
  currentWeek: number
): string[] {
  const warnings: string[] = []

  // Injury risk
  const highInjuryRisk = receiving.filter((p) => p.injuryRisk === 'high')
  if (highInjuryRisk.length > 0) {
    warnings.push(
      `${highInjuryRisk.map((p) => p.playerName).join(', ')} has elevated injury risk`
    )
  }

  // Bye week conflicts
  const receivingByes = receiving.map((p) => p.byeWeek).filter((b) => b > currentWeek)
  const byeConflicts = receivingByes.filter(
    (bye, i) => receivingByes.indexOf(bye) !== i
  )
  if (byeConflicts.length > 0) {
    warnings.push(`Multiple players share bye week ${byeConflicts[0]}`)
  }

  // Creating roster holes
  const holes = impacts.filter((i) => i.createsHole)
  if (holes.length > 0) {
    warnings.push(
      `Creates a hole at ${holes.map((h) => h.position).join(', ')}`
    )
  }

  // Hard schedule
  const hardSchedule = receiving.filter((p) => p.schedule === 'hard')
  if (hardSchedule.length > 0) {
    warnings.push(
      `${hardSchedule.map((p) => p.playerName).join(', ')} faces tough remaining schedule`
    )
  }

  // Trading for quantity over quality
  if (receiving.length > giving.length + 1) {
    const topGiving = Math.max(...giving.map((p) => p.tradeValue))
    const topReceiving = Math.max(...receiving.map((p) => p.tradeValue))
    if (topGiving > topReceiving + 10) {
      warnings.push(`Trading star power for depth - make sure you need the depth`)
    }
  }

  return warnings
}

function calculateVetoRisk(
  givingValue: number,
  receivingValue: number
): { vetoRisk: TradeAnalysis['vetoRisk']; vetoReasons: string[] } {
  const totalValue = givingValue + receivingValue
  if (totalValue === 0) return { vetoRisk: 'none', vetoReasons: [] }

  const valueDifference = Math.abs(receivingValue - givingValue)
  const percentDifference = (valueDifference / totalValue) * 100

  const vetoReasons: string[] = []
  let vetoRisk: TradeAnalysis['vetoRisk'] = 'none'

  if (percentDifference >= VETO_THRESHOLDS.high) {
    vetoRisk = 'high'
    vetoReasons.push(`Trade is heavily one-sided (${percentDifference.toFixed(0)}% value difference)`)
    vetoReasons.push(`League members may view this as collusion or a bad-faith trade`)
  } else if (percentDifference >= VETO_THRESHOLDS.medium) {
    vetoRisk = 'medium'
    vetoReasons.push(`Trade appears unbalanced (${percentDifference.toFixed(0)}% value difference)`)
    vetoReasons.push(`May draw scrutiny from league members`)
  } else if (percentDifference >= VETO_THRESHOLDS.low) {
    vetoRisk = 'low'
    vetoReasons.push(`Slight value imbalance (${percentDifference.toFixed(0)}% difference)`)
  }

  return { vetoRisk, vetoReasons }
}

// --- Fair Trade Finder ---

/**
 * Find fair trade options to acquire a target player
 */
export async function findFairTrades(
  targetPlayer: { playerId: string; playerName: string; position: Position; team: string },
  roster: UserRoster,
  scoringFormat: ScoringFormat = 'ppr',
  currentWeek: number = 1
): Promise<FairTradeOption[]> {
  // Calculate target player value
  const targetValue = await calculatePlayerValue(
    targetPlayer.playerId,
    targetPlayer.playerName,
    targetPlayer.position,
    targetPlayer.team,
    scoringFormat,
    currentWeek
  )

  // Calculate values for all roster players
  const rosterValues = await Promise.all(
    roster.players.map((p) =>
      calculatePlayerValue(
        p.playerId,
        p.playerName,
        p.position,
        p.team,
        scoringFormat,
        currentWeek
      )
    )
  )

  // Sort by value descending
  rosterValues.sort((a, b) => b.tradeValue - a.tradeValue)

  const options: FairTradeOption[] = []

  // Try single player trades
  for (const player of rosterValues) {
    if (player.tradeValue >= targetValue.tradeValue * 0.85) {
      const valueDiff = Math.abs(player.tradeValue - targetValue.tradeValue)
      const netGain = targetValue.tradeValue - player.tradeValue

      options.push({
        playersToOffer: [player],
        targetPlayer: targetValue,
        valueDifference: valueDiff,
        yourNetGain: netGain,
        likelihood: valueDiff < 5 ? 'high' : valueDiff < 10 ? 'medium' : 'low',
        reasoning: `Straight-up swap: ${player.playerName} for ${targetValue.playerName}`,
      })
    }
  }

  // Try 2-for-1 trades
  for (let i = 0; i < rosterValues.length; i++) {
    for (let j = i + 1; j < rosterValues.length; j++) {
      const combined = rosterValues[i].tradeValue + rosterValues[j].tradeValue

      // Slight overpay needed for 2-for-1 (other manager gives up roster spot)
      if (combined >= targetValue.tradeValue * 0.95 && combined <= targetValue.tradeValue * 1.3) {
        const valueDiff = Math.abs(combined - targetValue.tradeValue)
        const netGain = targetValue.tradeValue - combined

        options.push({
          playersToOffer: [rosterValues[i], rosterValues[j]],
          targetPlayer: targetValue,
          valueDifference: valueDiff,
          yourNetGain: netGain,
          likelihood: combined > targetValue.tradeValue ? 'medium' : 'low',
          reasoning: `2-for-1: ${rosterValues[i].playerName} + ${rosterValues[j].playerName} for ${targetValue.playerName}`,
        })
      }
    }
  }

  // Sort by likelihood then by net gain
  options.sort((a, b) => {
    const likelihoodOrder = { high: 0, medium: 1, low: 2 }
    if (likelihoodOrder[a.likelihood] !== likelihoodOrder[b.likelihood]) {
      return likelihoodOrder[a.likelihood] - likelihoodOrder[b.likelihood]
    }
    return b.yourNetGain - a.yourNetGain
  })

  return options.slice(0, 10) // Return top 10 options
}

/**
 * Quick trade value lookup for a list of players
 */
export async function getPlayerValues(
  players: Array<{ playerId: string; playerName: string; position: Position; team: string }>,
  scoringFormat: ScoringFormat = 'ppr',
  currentWeek: number = 1
): Promise<PlayerValue[]> {
  return Promise.all(
    players.map((p) =>
      calculatePlayerValue(p.playerId, p.playerName, p.position, p.team, scoringFormat, currentWeek)
    )
  )
}
