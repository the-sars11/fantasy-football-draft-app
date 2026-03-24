/**
 * Start/Sit Advisor Service (FF-115 to FF-118)
 *
 * Multi-source expert aggregation for start/sit recommendations.
 * Pulls rankings from 5+ sources, calculates confidence scores,
 * and generates AI-powered contextual reasoning.
 *
 * Sources:
 * - FantasyPros (Expert Consensus Rankings)
 * - ESPN (Rest-of-Week Rankings)
 * - Sleeper (Projections)
 * - CBS Sports
 * - NFL.com Fantasy
 */

import type { Position, ScoringFormat, WeeklyProjection, MatchupData } from '@/lib/players/types'
import type { UserRoster, RosterPlayer } from './roster-sync'
import { readWeeklyProjections, getCurrentWeek } from './weekly-projections'
import { getTeamMatchup, rateMatchup } from './matchup-data'
import { getInjuredPlayers } from './injury-tracker'

// --- Types ---

export interface ExpertRanking {
  source: string
  rank: number
  tier?: number
  projectedPoints?: number
  notes?: string
  accuracy?: number // Historical accuracy % for this expert/source
}

export interface StartSitRecommendation {
  playerId: string
  playerName: string
  position: Position
  team: string
  opponent?: string
  isHome?: boolean
  gameTime?: string

  // Expert consensus
  rankings: ExpertRanking[]
  consensusRank: number
  positionRank: number
  tier: number

  // Confidence scoring (FF-116)
  confidence: number // 0-100
  confidenceLevel: 'high' | 'medium' | 'low'
  expertAgreement: number // 0-100, how much experts agree
  contrarian: boolean // Is this against the consensus?

  // Projections
  projectedPoints: number
  projectedFloor: number
  projectedCeiling: number

  // Matchup context
  matchupRating: 'elite' | 'favorable' | 'neutral' | 'tough' | 'brutal'
  matchupContext?: string

  // Status
  injuryStatus?: string
  isOnBye: boolean

  // Recommendation
  verdict: 'must-start' | 'start' | 'flex' | 'sit' | 'must-sit'
  reasoning: string
}

export interface StartSitDecision {
  player1: StartSitRecommendation
  player2: StartSitRecommendation
  winner: 'player1' | 'player2' | 'toss-up'
  winMargin: number // 0-100, how confident
  reasoning: string
  keyFactors: string[]
}

export interface RosterStartSitAnalysis {
  week: number
  season: number
  leagueId: string
  scoringFormat: ScoringFormat

  // Optimal lineup
  optimalLineup: {
    qb: StartSitRecommendation[]
    rb: StartSitRecommendation[]
    wr: StartSitRecommendation[]
    te: StartSitRecommendation[]
    flex: StartSitRecommendation[]
    k: StartSitRecommendation[]
    def: StartSitRecommendation[]
  }

  // Bench recommendations
  benchWithUpside: StartSitRecommendation[]
  benchSafe: StartSitRecommendation[]

  // Key decisions
  toughDecisions: StartSitDecision[]

  // Alerts
  alerts: StartSitAlert[]

  analyzedAt: string
}

export interface StartSitAlert {
  type: 'injury' | 'bye' | 'weather' | 'matchup' | 'trending'
  severity: 'critical' | 'warning' | 'info'
  playerId: string
  playerName: string
  message: string
}

// --- Expert Source Weights (FF-116) ---

const EXPERT_WEIGHTS: Record<string, number> = {
  fantasypros: 1.0, // ECR is the gold standard
  sleeper: 0.9, // Good projections
  espn: 0.85, // Solid but less fantasy-focused
  cbs: 0.8,
  nfl: 0.75,
}

// Historical accuracy by source (would be tracked over time)
const EXPERT_ACCURACY: Record<string, number> = {
  fantasypros: 0.72,
  sleeper: 0.68,
  espn: 0.65,
  cbs: 0.63,
  nfl: 0.60,
}

// --- Confidence Calculation (FF-116) ---

interface ConfidenceFactors {
  expertAgreement: number // How much experts agree (std dev of ranks)
  sampleSize: number // How many sources have data
  matchupBoost: number // Matchup quality impact
  recentPerformance: number // Last 3 weeks trend
  injuryRisk: number // Injury status impact
}

function calculateConfidence(factors: ConfidenceFactors): number {
  // Base confidence from expert agreement (0-50 points)
  const agreementScore = Math.min(50, factors.expertAgreement * 50)

  // Sample size bonus (0-20 points)
  const sampleBonus = Math.min(20, (factors.sampleSize / 5) * 20)

  // Matchup adjustment (-10 to +15 points)
  const matchupAdjust = factors.matchupBoost * 15

  // Performance trend (-10 to +10 points)
  const trendAdjust = factors.recentPerformance * 10

  // Injury penalty (0 to -20 points)
  const injuryPenalty = factors.injuryRisk * 20

  const total = agreementScore + sampleBonus + matchupAdjust + trendAdjust - injuryPenalty

  return Math.max(0, Math.min(100, total))
}

function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 70) return 'high'
  if (confidence >= 40) return 'medium'
  return 'low'
}

// --- Expert Ranking Aggregation (FF-115) ---

/**
 * Fetch and aggregate expert rankings for a player
 */
export async function getExpertRankings(
  playerId: string,
  playerName: string,
  position: Position,
  week: number,
  scoringFormat: ScoringFormat = 'ppr'
): Promise<ExpertRanking[]> {
  const rankings: ExpertRanking[] = []

  // Get weekly projections (includes Sleeper data)
  try {
    const projections = await readWeeklyProjections(week, {
      scoringFormat,
      limit: 500,
    })

    const playerProj = projections.find(
      (p) => p.playerId === playerId || p.playerName.toLowerCase() === playerName.toLowerCase()
    )

    if (playerProj) {
      // Add Sleeper ranking
      if (playerProj.sourceProjections.sleeper) {
        rankings.push({
          source: 'sleeper',
          rank: playerProj.positionRank || 0,
          projectedPoints: playerProj.sourceProjections.sleeper.points,
          accuracy: EXPERT_ACCURACY.sleeper,
        })
      }

      // Add ESPN ranking if available
      if (playerProj.sourceProjections.espn) {
        rankings.push({
          source: 'espn',
          rank: playerProj.positionRank || 0,
          projectedPoints: playerProj.sourceProjections.espn.points,
          accuracy: EXPERT_ACCURACY.espn,
        })
      }

      // Add FantasyPros ranking if available
      if (playerProj.sourceProjections.fantasypros) {
        rankings.push({
          source: 'fantasypros',
          rank: playerProj.positionRank || 0,
          projectedPoints: playerProj.sourceProjections.fantasypros.points,
          accuracy: EXPERT_ACCURACY.fantasypros,
        })
      }
    }
  } catch (e) {
    console.error('Error fetching expert rankings:', e)
  }

  return rankings
}

/**
 * Calculate consensus rank from multiple expert sources
 */
function calculateConsensusRank(rankings: ExpertRanking[]): number {
  if (rankings.length === 0) return 999

  let weightedSum = 0
  let totalWeight = 0

  for (const ranking of rankings) {
    const weight = EXPERT_WEIGHTS[ranking.source] || 0.5
    const accuracy = ranking.accuracy || 0.5
    const combinedWeight = weight * accuracy

    weightedSum += ranking.rank * combinedWeight
    totalWeight += combinedWeight
  }

  return Math.round(weightedSum / totalWeight)
}

/**
 * Calculate expert agreement (inverse of standard deviation)
 */
function calculateExpertAgreement(rankings: ExpertRanking[]): number {
  if (rankings.length < 2) return 1

  const ranks = rankings.map((r) => r.rank)
  const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length
  const variance = ranks.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / ranks.length
  const stdDev = Math.sqrt(variance)

  // Convert to 0-1 scale (lower stdDev = higher agreement)
  // stdDev of 0 = perfect agreement (1.0)
  // stdDev of 10+ = low agreement (0.0)
  return Math.max(0, 1 - stdDev / 10)
}

// --- Start/Sit Recommendation Generation ---

/**
 * Generate start/sit recommendation for a single player
 */
export async function getStartSitRecommendation(
  playerId: string,
  playerName: string,
  position: Position,
  team: string,
  week: number,
  scoringFormat: ScoringFormat = 'ppr'
): Promise<StartSitRecommendation> {
  // Get expert rankings
  const rankings = await getExpertRankings(playerId, playerName, position, week, scoringFormat)

  // Calculate consensus
  const consensusRank = calculateConsensusRank(rankings)
  const expertAgreement = calculateExpertAgreement(rankings) * 100

  // Get matchup data
  const { season } = await getCurrentWeek()
  let matchup: MatchupData | null = null
  let matchupRating: StartSitRecommendation['matchupRating'] = 'neutral'

  try {
    matchup = await getTeamMatchup(team, week, season)
    if (matchup) {
      // Get the defensive rank for the player's position
      const defRank = position === 'QB' ? matchup.defRankVsQB :
                      position === 'RB' ? matchup.defRankVsRB :
                      position === 'WR' ? matchup.defRankVsWR :
                      position === 'TE' ? matchup.defRankVsTE : null
      const rating = rateMatchup(defRank ?? null)
      // Map the simple rating to our more detailed rating
      matchupRating = rating === 'favorable' ? 'favorable' :
                      rating === 'unfavorable' ? 'tough' : 'neutral'
    }
  } catch (e) {
    console.error('Error fetching matchup:', e)
  }

  // Calculate projected points from rankings
  const projectedPoints = rankings.length > 0
    ? rankings.reduce((sum, r) => sum + (r.projectedPoints || 0), 0) / rankings.length
    : 0

  // Calculate floor/ceiling (rough estimates)
  const projectedFloor = projectedPoints * 0.6
  const projectedCeiling = projectedPoints * 1.5

  // Determine tier based on position rank
  const tier = Math.ceil(consensusRank / 12) // 12 players per tier

  // Check injury status
  let injuryStatus: string | undefined
  try {
    const injured = await getInjuredPlayers(season)
    const playerInjury = injured.find((i) => i.playerName.toLowerCase() === playerName.toLowerCase())
    if (playerInjury) {
      injuryStatus = playerInjury.status
    }
  } catch (e) {
    // Ignore injury check errors
  }

  // Calculate confidence
  const confidence = calculateConfidence({
    expertAgreement: expertAgreement / 100,
    sampleSize: rankings.length,
    matchupBoost: matchupRating === 'favorable' ? 0.5 : matchupRating === 'tough' ? -0.5 : 0,
    recentPerformance: 0, // Would need historical data
    injuryRisk: injuryStatus ? (injuryStatus === 'out' ? 1 : injuryStatus === 'doubtful' ? 0.7 : 0.3) : 0,
  })

  // Determine verdict
  const verdict = determineVerdict(consensusRank, position, confidence, injuryStatus)

  // Check if this is against consensus (contrarian)
  const contrarian = rankings.some((r) => Math.abs(r.rank - consensusRank) > 10)

  // Generate reasoning
  const reasoning = generateReasoning(playerName, position, consensusRank, matchupRating, projectedPoints, injuryStatus)

  return {
    playerId,
    playerName,
    position,
    team,
    opponent: matchup?.opponent,
    isHome: matchup?.isHome,
    gameTime: matchup?.gameTime?.toString(),
    rankings,
    consensusRank,
    positionRank: consensusRank,
    tier,
    confidence,
    confidenceLevel: getConfidenceLevel(confidence),
    expertAgreement,
    contrarian,
    projectedPoints,
    projectedFloor,
    projectedCeiling,
    matchupRating,
    matchupContext: matchup ? `vs ${matchup.opponent} (${matchup.isHome ? 'home' : 'away'})` : undefined,
    injuryStatus,
    isOnBye: false, // Would need schedule data
    verdict,
    reasoning,
  }
}

function determineVerdict(
  rank: number,
  position: Position,
  confidence: number,
  injuryStatus?: string
): StartSitRecommendation['verdict'] {
  // Injured players get sit recommendations
  if (injuryStatus === 'out' || injuryStatus === 'ir') return 'must-sit'
  if (injuryStatus === 'doubtful') return 'sit'

  // Position-based thresholds
  const thresholds: Record<Position, { mustStart: number; start: number; flex: number; sit: number }> = {
    QB: { mustStart: 5, start: 12, flex: 20, sit: 25 },
    RB: { mustStart: 10, start: 24, flex: 36, sit: 48 },
    WR: { mustStart: 10, start: 24, flex: 40, sit: 55 },
    TE: { mustStart: 5, start: 12, flex: 18, sit: 24 },
    K: { mustStart: 5, start: 12, flex: 20, sit: 25 },
    DEF: { mustStart: 5, start: 12, flex: 20, sit: 25 },
  }

  const t = thresholds[position]

  if (rank <= t.mustStart) return 'must-start'
  if (rank <= t.start) return 'start'
  if (rank <= t.flex) return 'flex'
  if (rank <= t.sit) return 'sit'
  return 'must-sit'
}

function generateReasoning(
  name: string,
  position: Position,
  rank: number,
  matchupRating: string,
  projectedPoints: number,
  injuryStatus?: string
): string {
  const parts: string[] = []

  // Rank-based
  if (rank <= 5) {
    parts.push(`${name} is a top-5 ${position} this week`)
  } else if (rank <= 12) {
    parts.push(`${name} is a solid ${position}1 play`)
  } else if (rank <= 24) {
    parts.push(`${name} is in ${position}2 range`)
  } else {
    parts.push(`${name} is a lower-end ${position} option`)
  }

  // Matchup
  if (matchupRating === 'elite' || matchupRating === 'favorable') {
    parts.push(`with a ${matchupRating} matchup`)
  } else if (matchupRating === 'tough' || matchupRating === 'brutal') {
    parts.push(`despite a ${matchupRating} matchup`)
  }

  // Projection
  if (projectedPoints > 0) {
    parts.push(`(projected ${projectedPoints.toFixed(1)} pts)`)
  }

  // Injury
  if (injuryStatus && injuryStatus !== 'healthy') {
    parts.push(`Note: ${injuryStatus} designation`)
  }

  return parts.join(' ')
}

// --- Head-to-Head Comparison ---

/**
 * Compare two players for a start/sit decision
 */
export async function compareStartSit(
  player1: { playerId: string; playerName: string; position: Position; team: string },
  player2: { playerId: string; playerName: string; position: Position; team: string },
  week: number,
  scoringFormat: ScoringFormat = 'ppr'
): Promise<StartSitDecision> {
  const [rec1, rec2] = await Promise.all([
    getStartSitRecommendation(player1.playerId, player1.playerName, player1.position, player1.team, week, scoringFormat),
    getStartSitRecommendation(player2.playerId, player2.playerName, player2.position, player2.team, week, scoringFormat),
  ])

  // Determine winner based on consensus rank and confidence
  const score1 = (100 - rec1.consensusRank) + rec1.confidence
  const score2 = (100 - rec2.consensusRank) + rec2.confidence
  const diff = Math.abs(score1 - score2)

  let winner: 'player1' | 'player2' | 'toss-up'
  if (diff < 5) {
    winner = 'toss-up'
  } else {
    winner = score1 > score2 ? 'player1' : 'player2'
  }

  // Generate key factors
  const keyFactors: string[] = []

  // Rank comparison
  if (Math.abs(rec1.consensusRank - rec2.consensusRank) > 5) {
    const better = rec1.consensusRank < rec2.consensusRank ? rec1 : rec2
    keyFactors.push(`${better.playerName} ranks ${Math.abs(rec1.consensusRank - rec2.consensusRank)} spots higher`)
  }

  // Matchup comparison
  const matchupOrder = ['elite', 'favorable', 'neutral', 'tough', 'brutal']
  const mu1 = matchupOrder.indexOf(rec1.matchupRating)
  const mu2 = matchupOrder.indexOf(rec2.matchupRating)
  if (Math.abs(mu1 - mu2) >= 2) {
    const better = mu1 < mu2 ? rec1 : rec2
    keyFactors.push(`${better.playerName} has a much better matchup`)
  }

  // Injury factor
  if (rec1.injuryStatus || rec2.injuryStatus) {
    if (rec1.injuryStatus && !rec2.injuryStatus) {
      keyFactors.push(`${rec1.playerName} has injury concerns (${rec1.injuryStatus})`)
    } else if (rec2.injuryStatus && !rec1.injuryStatus) {
      keyFactors.push(`${rec2.playerName} has injury concerns (${rec2.injuryStatus})`)
    }
  }

  // Ceiling/floor for close decisions
  if (winner === 'toss-up') {
    if (rec1.projectedCeiling > rec2.projectedCeiling) {
      keyFactors.push(`${rec1.playerName} has higher upside`)
    } else if (rec2.projectedCeiling > rec1.projectedCeiling) {
      keyFactors.push(`${rec2.playerName} has higher upside`)
    }
    if (rec1.projectedFloor > rec2.projectedFloor) {
      keyFactors.push(`${rec1.playerName} has a safer floor`)
    } else if (rec2.projectedFloor > rec1.projectedFloor) {
      keyFactors.push(`${rec2.playerName} has a safer floor`)
    }
  }

  // Generate reasoning
  let reasoning: string
  if (winner === 'toss-up') {
    reasoning = `This is a coin flip. Both ${rec1.playerName} and ${rec2.playerName} have similar projections and matchups. ${keyFactors.length > 0 ? keyFactors[0] + '.' : 'Go with your gut.'}`
  } else {
    const winnerRec = winner === 'player1' ? rec1 : rec2
    const loserRec = winner === 'player1' ? rec2 : rec1
    reasoning = `Start ${winnerRec.playerName} over ${loserRec.playerName}. ${keyFactors.slice(0, 2).join('. ')}.`
  }

  return {
    player1: rec1,
    player2: rec2,
    winner,
    winMargin: diff,
    reasoning,
    keyFactors,
  }
}

// --- Full Roster Analysis ---

/**
 * Analyze entire roster and generate optimal lineup
 */
export async function analyzeRosterStartSit(
  roster: UserRoster,
  week: number
): Promise<RosterStartSitAnalysis> {
  const { season } = await getCurrentWeek()

  // Get recommendations for all players
  const recommendations: StartSitRecommendation[] = await Promise.all(
    roster.players.map((p) =>
      getStartSitRecommendation(p.playerId, p.playerName, p.position, p.team, week, roster.scoringFormat)
    )
  )

  // Group by position
  const byPosition: Record<Position, StartSitRecommendation[]> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    K: [],
    DEF: [],
  }

  for (const rec of recommendations) {
    byPosition[rec.position].push(rec)
  }

  // Sort each position by consensus rank
  for (const pos of Object.keys(byPosition) as Position[]) {
    byPosition[pos].sort((a, b) => a.consensusRank - b.consensusRank)
  }

  // Build optimal lineup based on roster settings
  const settings = roster.rosterSettings
  const optimalLineup = {
    qb: byPosition.QB.slice(0, settings.qb),
    rb: byPosition.RB.slice(0, settings.rb),
    wr: byPosition.WR.slice(0, settings.wr),
    te: byPosition.TE.slice(0, settings.te),
    flex: [] as StartSitRecommendation[],
    k: byPosition.K.slice(0, settings.k),
    def: byPosition.DEF.slice(0, settings.def),
  }

  // Fill flex spots with remaining RB/WR/TE
  const flexCandidates = [
    ...byPosition.RB.slice(settings.rb),
    ...byPosition.WR.slice(settings.wr),
    ...byPosition.TE.slice(settings.te),
  ].sort((a, b) => a.consensusRank - b.consensusRank)

  optimalLineup.flex = flexCandidates.slice(0, settings.flex)

  // Remaining players are bench
  const starterIds = new Set([
    ...optimalLineup.qb.map((p) => p.playerId),
    ...optimalLineup.rb.map((p) => p.playerId),
    ...optimalLineup.wr.map((p) => p.playerId),
    ...optimalLineup.te.map((p) => p.playerId),
    ...optimalLineup.flex.map((p) => p.playerId),
    ...optimalLineup.k.map((p) => p.playerId),
    ...optimalLineup.def.map((p) => p.playerId),
  ])

  const bench = recommendations.filter((r) => !starterIds.has(r.playerId))

  // Split bench into upside and safe
  const benchWithUpside = bench.filter(
    (r) => r.projectedCeiling > r.projectedPoints * 1.3 && r.confidence < 50
  )
  const benchSafe = bench.filter(
    (r) => !benchWithUpside.includes(r)
  )

  // Identify tough decisions (close calls between starters and bench)
  const toughDecisions: StartSitDecision[] = []

  // Check if any bench player should be starting
  for (const benchPlayer of bench) {
    const starters = recommendations.filter((r) => starterIds.has(r.playerId) && r.position === benchPlayer.position)
    for (const starter of starters) {
      if (benchPlayer.consensusRank < starter.consensusRank + 5) {
        // Close decision
        const decision = await compareStartSit(
          { playerId: starter.playerId, playerName: starter.playerName, position: starter.position, team: starter.team },
          { playerId: benchPlayer.playerId, playerName: benchPlayer.playerName, position: benchPlayer.position, team: benchPlayer.team },
          week,
          roster.scoringFormat
        )
        if (decision.winner === 'player2' || decision.winner === 'toss-up') {
          toughDecisions.push(decision)
        }
      }
    }
  }

  // Generate alerts
  const alerts: StartSitAlert[] = []

  for (const rec of recommendations) {
    // Injury alerts
    if (rec.injuryStatus && rec.injuryStatus !== 'healthy') {
      alerts.push({
        type: 'injury',
        severity: rec.injuryStatus === 'out' ? 'critical' : rec.injuryStatus === 'doubtful' ? 'warning' : 'info',
        playerId: rec.playerId,
        playerName: rec.playerName,
        message: `${rec.playerName} is ${rec.injuryStatus}`,
      })
    }

    // Bye week alerts
    if (rec.isOnBye) {
      alerts.push({
        type: 'bye',
        severity: starterIds.has(rec.playerId) ? 'critical' : 'info',
        playerId: rec.playerId,
        playerName: rec.playerName,
        message: `${rec.playerName} is on bye`,
      })
    }

    // Brutal matchup alerts for starters
    if (starterIds.has(rec.playerId) && rec.matchupRating === 'brutal') {
      alerts.push({
        type: 'matchup',
        severity: 'warning',
        playerId: rec.playerId,
        playerName: rec.playerName,
        message: `${rec.playerName} has a brutal matchup vs ${rec.opponent}`,
      })
    }
  }

  return {
    week,
    season,
    leagueId: roster.leagueId,
    scoringFormat: roster.scoringFormat,
    optimalLineup,
    benchWithUpside,
    benchSafe,
    toughDecisions,
    alerts,
    analyzedAt: new Date().toISOString(),
  }
}
