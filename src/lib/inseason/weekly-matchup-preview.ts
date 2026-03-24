/**
 * Weekly Matchup Preview Service (FF-129 to FF-132)
 *
 * Head-to-head fantasy matchup analysis:
 * - Team vs team projections
 * - Leverage plays (high variance opportunities)
 * - Ceiling/floor analysis
 * - Position-by-position breakdown
 */

import type { Position, ScoringFormat, WeeklyProjection } from '@/lib/players/types'
import type { UserRoster, RosterPlayer } from './roster-sync'
import { readWeeklyProjections, getCurrentWeek } from './weekly-projections'
import { getTeamMatchup, getWeekMatchups } from './matchup-data'
import { getStartSitRecommendation, type StartSitRecommendation } from './start-sit-advisor'

// --- Types ---

export interface TeamProjection {
  teamName: string
  teamId?: string
  leagueId?: string

  // Overall projections
  projectedTotal: number
  projectedFloor: number
  projectedCeiling: number

  // Position breakdown
  positionTotals: Record<Position, PositionProjection>

  // Roster
  starters: PlayerMatchupProjection[]
  bench: PlayerMatchupProjection[]

  // Analysis
  highVariancePlayers: PlayerMatchupProjection[]
  safePlayers: PlayerMatchupProjection[]
  injuryRisks: PlayerMatchupProjection[]
}

export interface PositionProjection {
  projected: number
  floor: number
  ceiling: number
  playerCount: number
}

export interface PlayerMatchupProjection {
  playerId: string
  playerName: string
  position: Position
  team: string
  isStarter: boolean

  // Projections
  projectedPoints: number
  floor: number
  ceiling: number
  variance: number // ceiling - floor (higher = more boom/bust)

  // Matchup context
  opponent?: string
  isHome?: boolean
  matchupRating: 'elite' | 'favorable' | 'neutral' | 'tough' | 'brutal'
  matchupBoost: number // -10 to +10 expected point adjustment

  // Status
  injuryStatus?: string
  isOnBye: boolean
  gameTime?: string

  // Flags
  isLeveragePlay: boolean // High variance, could swing matchup
  isSafeFloor: boolean // Low variance, reliable points
  isBoomCandidate: boolean // High ceiling relative to projection
}

export interface MatchupPreview {
  week: number
  season: number
  leagueId: string

  // Teams
  myTeam: TeamProjection
  opponent: TeamProjection

  // Head-to-head analysis
  projectedMargin: number // Positive = winning, negative = losing
  winProbability: number // 0-100

  // Key insights
  keyMatchups: PositionMatchup[]
  leveragePlays: LeveragePlay[]
  recommendations: string[]

  // Risk analysis
  riskLevel: 'low' | 'medium' | 'high'
  riskFactors: string[]

  analyzedAt: string
}

export interface PositionMatchup {
  position: Position
  myProjected: number
  opponentProjected: number
  advantage: 'mine' | 'opponent' | 'even'
  margin: number
  analysis: string
}

export interface LeveragePlay {
  type: 'start' | 'bench' | 'pivot'
  player: PlayerMatchupProjection
  alternatePlayer?: PlayerMatchupProjection
  reasoning: string
  impactScore: number // 1-10, how much this decision could swing matchup
  recommendation: 'do-it' | 'consider' | 'risky'
}

// --- Constants ---

const VARIANCE_THRESHOLDS = {
  high: 8, // ceiling - floor > 8 = high variance
  low: 4,  // ceiling - floor < 4 = low variance (safe)
}

const WIN_PROBABILITY_ADJUSTMENTS = {
  highVarianceTeam: -5, // More variance = less predictable
  moreStarters: 2, // Per starter advantage
  betterMatchups: 3, // Per favorable matchup
}

// --- Core Functions ---

/**
 * Generate full matchup preview between two fantasy teams
 */
export async function generateMatchupPreview(
  myRoster: UserRoster,
  opponentRoster: UserRoster | null,
  week: number,
  leagueId: string
): Promise<MatchupPreview> {
  const { season } = await getCurrentWeek()

  // Build projections for both teams
  const myTeam = await buildTeamProjection(myRoster, week, season, 'My Team')
  const opponent = opponentRoster
    ? await buildTeamProjection(opponentRoster, week, season, 'Opponent')
    : createEmptyOpponentProjection()

  // Calculate head-to-head metrics
  const projectedMargin = myTeam.projectedTotal - opponent.projectedTotal
  const winProbability = calculateWinProbability(myTeam, opponent)

  // Analyze position matchups
  const keyMatchups = analyzePositionMatchups(myTeam, opponent)

  // Find leverage plays
  const leveragePlays = findLeveragePlays(myTeam, opponent, projectedMargin)

  // Generate recommendations
  const recommendations = generateRecommendations(myTeam, opponent, keyMatchups, leveragePlays)

  // Assess risk
  const { riskLevel, riskFactors } = assessMatchupRisk(myTeam, opponent)

  return {
    week,
    season,
    leagueId,
    myTeam,
    opponent,
    projectedMargin,
    winProbability,
    keyMatchups,
    leveragePlays,
    recommendations,
    riskLevel,
    riskFactors,
    analyzedAt: new Date().toISOString(),
  }
}

/**
 * Build team projection from roster
 */
async function buildTeamProjection(
  roster: UserRoster,
  week: number,
  season: number,
  teamName: string
): Promise<TeamProjection> {
  // Get projections for all players
  const playerProjections: PlayerMatchupProjection[] = await Promise.all(
    roster.players.map(async (player) => {
      return buildPlayerProjection(player, week, season, roster.scoringFormat)
    })
  )

  // Separate starters and bench
  const starters = playerProjections.filter((p) => {
    const rosterPlayer = roster.players.find((rp) => rp.playerId === p.playerId)
    return rosterPlayer?.isStarter ?? false
  })
  const bench = playerProjections.filter((p) => !starters.includes(p))

  // Calculate totals
  const projectedTotal = starters.reduce((sum, p) => sum + p.projectedPoints, 0)
  const projectedFloor = starters.reduce((sum, p) => sum + p.floor, 0)
  const projectedCeiling = starters.reduce((sum, p) => sum + p.ceiling, 0)

  // Build position breakdown
  const positionTotals: Record<Position, PositionProjection> = {
    QB: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
    RB: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
    WR: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
    TE: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
    K: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
    DEF: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
  }

  for (const player of starters) {
    const pos = positionTotals[player.position]
    pos.projected += player.projectedPoints
    pos.floor += player.floor
    pos.ceiling += player.ceiling
    pos.playerCount++
  }

  // Identify special players
  const highVariancePlayers = playerProjections.filter(
    (p) => p.variance >= VARIANCE_THRESHOLDS.high
  )
  const safePlayers = playerProjections.filter(
    (p) => p.variance <= VARIANCE_THRESHOLDS.low && p.isStarter
  )
  const injuryRisks = playerProjections.filter(
    (p) => p.injuryStatus && p.injuryStatus !== 'healthy'
  )

  return {
    teamName,
    teamId: roster.teamId,
    leagueId: roster.leagueId,
    projectedTotal,
    projectedFloor,
    projectedCeiling,
    positionTotals,
    starters,
    bench,
    highVariancePlayers,
    safePlayers,
    injuryRisks,
  }
}

/**
 * Build individual player projection with matchup context
 */
async function buildPlayerProjection(
  player: RosterPlayer,
  week: number,
  season: number,
  scoringFormat: ScoringFormat
): Promise<PlayerMatchupProjection> {
  // Get matchup data
  let matchup = null
  let matchupRating: PlayerMatchupProjection['matchupRating'] = 'neutral'
  let matchupBoost = 0

  try {
    matchup = await getTeamMatchup(player.team, week, season)
    if (matchup) {
      // Rate the matchup based on defensive rankings
      const defRank = player.position === 'QB' ? matchup.defRankVsQB :
                      player.position === 'RB' ? matchup.defRankVsRB :
                      player.position === 'WR' ? matchup.defRankVsWR :
                      player.position === 'TE' ? matchup.defRankVsTE : null

      if (defRank) {
        if (defRank >= 28) {
          matchupRating = 'elite'
          matchupBoost = 4
        } else if (defRank >= 22) {
          matchupRating = 'favorable'
          matchupBoost = 2
        } else if (defRank <= 5) {
          matchupRating = 'brutal'
          matchupBoost = -4
        } else if (defRank <= 10) {
          matchupRating = 'tough'
          matchupBoost = -2
        }
      }
    }
  } catch (e) {
    // Ignore matchup errors
  }

  // Get base projection (estimated based on scoring format)
  const baseProjection = estimatePlayerProjection(player, scoringFormat)
  const projectedPoints = baseProjection + matchupBoost

  // Calculate floor/ceiling
  const variance = calculatePlayerVariance(player.position, baseProjection)
  const floor = Math.max(0, projectedPoints - variance)
  const ceiling = projectedPoints + variance * 1.5

  return {
    playerId: player.playerId,
    playerName: player.playerName,
    position: player.position,
    team: player.team,
    isStarter: player.isStarter,
    projectedPoints,
    floor,
    ceiling,
    variance: ceiling - floor,
    opponent: matchup?.opponent,
    isHome: matchup?.isHome,
    matchupRating,
    matchupBoost,
    injuryStatus: player.status === 'injured' || player.status === 'out' ? player.status : undefined,
    isOnBye: false, // Would check schedule
    gameTime: matchup?.gameTime,
    isLeveragePlay: (ceiling - floor) >= VARIANCE_THRESHOLDS.high,
    isSafeFloor: (ceiling - floor) <= VARIANCE_THRESHOLDS.low,
    isBoomCandidate: ceiling >= projectedPoints * 1.5,
  }
}

/**
 * Estimate player projection based on position and scoring
 */
function estimatePlayerProjection(player: RosterPlayer, scoringFormat: ScoringFormat): number {
  // Base projections by position (rough estimates without full data)
  const baseByPosition: Record<Position, number> = {
    QB: 18,
    RB: 12,
    WR: 11,
    TE: 8,
    K: 8,
    DEF: 7,
  }

  let base = baseByPosition[player.position] || 8

  // Adjust for PPR scoring (affects RB/WR/TE)
  if (scoringFormat === 'ppr' && ['RB', 'WR', 'TE'].includes(player.position)) {
    base *= 1.15
  } else if (scoringFormat === 'half-ppr' && ['RB', 'WR', 'TE'].includes(player.position)) {
    base *= 1.07
  }

  return Math.round(base * 10) / 10
}

/**
 * Calculate player variance based on position
 */
function calculatePlayerVariance(position: Position, projection: number): number {
  // Variance multipliers by position (WR/RB more volatile than QB/TE)
  const varianceMultipliers: Record<Position, number> = {
    QB: 0.35,
    RB: 0.45,
    WR: 0.50,
    TE: 0.40,
    K: 0.30,
    DEF: 0.60,
  }

  return projection * varianceMultipliers[position]
}

/**
 * Create empty opponent projection when no data available
 */
function createEmptyOpponentProjection(): TeamProjection {
  return {
    teamName: 'Opponent (No Data)',
    projectedTotal: 0,
    projectedFloor: 0,
    projectedCeiling: 0,
    positionTotals: {
      QB: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
      RB: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
      WR: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
      TE: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
      K: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
      DEF: { projected: 0, floor: 0, ceiling: 0, playerCount: 0 },
    },
    starters: [],
    bench: [],
    highVariancePlayers: [],
    safePlayers: [],
    injuryRisks: [],
  }
}

// --- Analysis Functions ---

/**
 * Calculate win probability based on projections and variance
 */
function calculateWinProbability(myTeam: TeamProjection, opponent: TeamProjection): number {
  if (opponent.projectedTotal === 0) return 50 // No opponent data

  const margin = myTeam.projectedTotal - opponent.projectedTotal
  const totalVariance = (myTeam.projectedCeiling - myTeam.projectedFloor) +
                       (opponent.projectedCeiling - opponent.projectedFloor)

  // Simple probability model based on margin and variance
  // Base: 50% + margin contribution
  let probability = 50 + (margin / totalVariance) * 30

  // Adjust for variance (high variance = less certainty)
  const myVariance = myTeam.projectedCeiling - myTeam.projectedFloor
  const oppVariance = opponent.projectedCeiling - opponent.projectedFloor

  if (myVariance > oppVariance + 10) {
    probability -= 3 // More variance = less predictable
  }

  // Clamp to 5-95 range (never certain)
  return Math.max(5, Math.min(95, Math.round(probability)))
}

/**
 * Analyze position-by-position matchups
 */
function analyzePositionMatchups(myTeam: TeamProjection, opponent: TeamProjection): PositionMatchup[] {
  const matchups: PositionMatchup[] = []
  const positions: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

  for (const position of positions) {
    const myPos = myTeam.positionTotals[position]
    const oppPos = opponent.positionTotals[position]

    if (myPos.playerCount === 0 && oppPos.playerCount === 0) continue

    const margin = myPos.projected - oppPos.projected
    let advantage: PositionMatchup['advantage'] = 'even'
    if (margin >= 3) advantage = 'mine'
    else if (margin <= -3) advantage = 'opponent'

    let analysis = ''
    if (advantage === 'mine' && margin >= 5) {
      analysis = `Strong ${position} advantage (+${margin.toFixed(1)} pts)`
    } else if (advantage === 'opponent' && margin <= -5) {
      analysis = `${position} disadvantage (${margin.toFixed(1)} pts)`
    } else if (advantage === 'mine') {
      analysis = `Slight ${position} edge (+${margin.toFixed(1)} pts)`
    } else if (advantage === 'opponent') {
      analysis = `Slight ${position} deficit (${margin.toFixed(1)} pts)`
    } else {
      analysis = `${position} essentially even`
    }

    matchups.push({
      position,
      myProjected: myPos.projected,
      opponentProjected: oppPos.projected,
      advantage,
      margin,
      analysis,
    })
  }

  // Sort by absolute margin (biggest gaps first)
  return matchups.sort((a, b) => Math.abs(b.margin) - Math.abs(a.margin))
}

/**
 * Find leverage plays that could swing the matchup
 */
function findLeveragePlays(
  myTeam: TeamProjection,
  opponent: TeamProjection,
  projectedMargin: number
): LeveragePlay[] {
  const plays: LeveragePlay[] = []

  // Look for bench players who could outperform starters
  for (const benchPlayer of myTeam.bench) {
    if (benchPlayer.isOnBye || benchPlayer.injuryStatus === 'out') continue

    // Find starter at same position
    const startersAtPosition = myTeam.starters.filter(
      (s) => s.position === benchPlayer.position
    )

    for (const starter of startersAtPosition) {
      // Check if bench player has higher ceiling
      if (benchPlayer.ceiling > starter.ceiling + 3) {
        plays.push({
          type: 'pivot',
          player: benchPlayer,
          alternatePlayer: starter,
          reasoning: `${benchPlayer.playerName} has ${(benchPlayer.ceiling - starter.ceiling).toFixed(1)} pts higher ceiling than ${starter.playerName}`,
          impactScore: Math.min(10, Math.ceil((benchPlayer.ceiling - starter.ceiling) / 2)),
          recommendation: projectedMargin < -5 ? 'do-it' : 'consider',
        })
      }

      // Check if bench player has better matchup
      if (benchPlayer.matchupBoost - starter.matchupBoost >= 4) {
        plays.push({
          type: 'pivot',
          player: benchPlayer,
          alternatePlayer: starter,
          reasoning: `${benchPlayer.playerName} has much better matchup (${benchPlayer.matchupRating} vs ${starter.matchupRating})`,
          impactScore: 6,
          recommendation: 'consider',
        })
      }
    }
  }

  // Flag high-variance starters as leverage plays
  for (const player of myTeam.highVariancePlayers) {
    if (!player.isStarter) continue

    const shouldSwing = Math.abs(projectedMargin) > 10
    plays.push({
      type: 'start',
      player,
      reasoning: `${player.playerName} is a boom/bust play (${player.floor.toFixed(1)}-${player.ceiling.toFixed(1)} range)`,
      impactScore: Math.ceil(player.variance / 2),
      recommendation: (projectedMargin < -5 && player.ceiling > 20) ? 'do-it' : 'risky',
    })
  }

  // Sort by impact score
  return plays.sort((a, b) => b.impactScore - a.impactScore).slice(0, 5)
}

/**
 * Generate strategic recommendations
 */
function generateRecommendations(
  myTeam: TeamProjection,
  opponent: TeamProjection,
  matchups: PositionMatchup[],
  leveragePlays: LeveragePlay[]
): string[] {
  const recs: string[] = []
  const margin = myTeam.projectedTotal - opponent.projectedTotal

  // Overall outlook
  if (margin >= 15) {
    recs.push('You\'re favored. Play safe floors over risky ceilings.')
  } else if (margin >= 5) {
    recs.push('Slight edge. Stick with your studs but monitor late swaps.')
  } else if (margin <= -15) {
    recs.push('Underdog alert. Consider pivoting to high-upside plays.')
  } else if (margin <= -5) {
    recs.push('Close call. One boom performance could swing this matchup.')
  } else {
    recs.push('This matchup is a coin flip. Every roster decision matters.')
  }

  // Position-specific
  const biggestAdvantage = matchups.find((m) => m.advantage === 'mine' && m.margin >= 5)
  const biggestDeficit = matchups.find((m) => m.advantage === 'opponent' && m.margin <= -5)

  if (biggestAdvantage) {
    recs.push(`Your ${biggestAdvantage.position} advantage is key. Protect it.`)
  }
  if (biggestDeficit) {
    recs.push(`Watch ${biggestDeficit.position}. Consider streaming or waiver moves.`)
  }

  // Injury concerns
  if (myTeam.injuryRisks.length > 0) {
    const names = myTeam.injuryRisks.slice(0, 2).map((p) => p.playerName).join(', ')
    recs.push(`Monitor injury status: ${names}`)
  }

  // Leverage plays
  const highImpactPlay = leveragePlays.find((p) => p.impactScore >= 7 && p.recommendation === 'do-it')
  if (highImpactPlay) {
    recs.push(`High-impact move: ${highImpactPlay.reasoning}`)
  }

  return recs.slice(0, 5)
}

/**
 * Assess overall matchup risk
 */
function assessMatchupRisk(
  myTeam: TeamProjection,
  opponent: TeamProjection
): { riskLevel: 'low' | 'medium' | 'high'; riskFactors: string[] } {
  const factors: string[] = []
  let riskScore = 0

  // Injury risks
  const seriousInjuries = myTeam.injuryRisks.filter(
    (p) => p.isStarter && (p.injuryStatus === 'doubtful' || p.injuryStatus === 'questionable')
  )
  if (seriousInjuries.length >= 2) {
    factors.push(`${seriousInjuries.length} starters with injury concerns`)
    riskScore += 2
  } else if (seriousInjuries.length === 1) {
    factors.push(`${seriousInjuries[0].playerName} has injury risk`)
    riskScore += 1
  }

  // High variance team
  const highVarStarters = myTeam.starters.filter((p) => p.variance >= VARIANCE_THRESHOLDS.high)
  if (highVarStarters.length >= 3) {
    factors.push('Multiple boom/bust starters increase unpredictability')
    riskScore += 2
  }

  // Tight matchup
  const margin = Math.abs(myTeam.projectedTotal - opponent.projectedTotal)
  if (margin <= 5) {
    factors.push('Projected margin is razor thin')
    riskScore += 2
  } else if (margin <= 10) {
    factors.push('Matchup could go either way')
    riskScore += 1
  }

  // Brutal matchups
  const brutalMatchups = myTeam.starters.filter((p) => p.matchupRating === 'brutal')
  if (brutalMatchups.length >= 2) {
    factors.push('Multiple starters face tough defenses')
    riskScore += 1
  }

  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (riskScore >= 5) riskLevel = 'high'
  else if (riskScore >= 3) riskLevel = 'medium'

  return { riskLevel, riskFactors: factors }
}

// --- Quick Analysis Functions ---

/**
 * Get ceiling/floor spread for a player
 */
export function getPlayerSpread(player: PlayerMatchupProjection): {
  spread: number
  label: 'tight' | 'normal' | 'wide'
} {
  const spread = player.ceiling - player.floor
  let label: 'tight' | 'normal' | 'wide' = 'normal'

  if (spread <= VARIANCE_THRESHOLDS.low) label = 'tight'
  else if (spread >= VARIANCE_THRESHOLDS.high) label = 'wide'

  return { spread, label }
}

/**
 * Compare two teams for quick head-to-head
 */
export function quickCompare(
  myTotal: number,
  oppTotal: number,
  myFloor: number,
  myCeiling: number,
  oppFloor: number,
  oppCeiling: number
): { favoredTeam: 'mine' | 'opponent' | 'tossup'; confidence: string; message: string } {
  const margin = myTotal - oppTotal

  if (Math.abs(margin) <= 3) {
    return {
      favoredTeam: 'tossup',
      confidence: 'Low',
      message: 'Too close to call - could go either way',
    }
  }

  if (margin > 0) {
    const confidence = margin >= 15 ? 'High' : margin >= 8 ? 'Medium' : 'Low'
    return {
      favoredTeam: 'mine',
      confidence,
      message: `Projected to win by ${margin.toFixed(1)} points`,
    }
  }

  const confidence = margin <= -15 ? 'High' : margin <= -8 ? 'Medium' : 'Low'
  return {
    favoredTeam: 'opponent',
    confidence,
    message: `Projected to lose by ${Math.abs(margin).toFixed(1)} points`,
  }
}
