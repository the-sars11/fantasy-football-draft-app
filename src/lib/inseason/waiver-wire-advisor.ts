/**
 * Waiver Wire Advisor Service (FF-119 to FF-122)
 *
 * Intelligent waiver wire recommendations:
 * - FF-119: Available player scanner (ownership %, trend velocity, schedule)
 * - FF-120: Roster fit analysis (fills holes, playoff schedule)
 * - FF-121: FAAB bid recommendations (bid amounts with reasoning)
 * - FF-122: Priority ranking (ordered list with confidence)
 */

import type { Position, ScoringFormat, WaiverTrending, MatchupData } from '@/lib/players/types'
import type { UserRoster, RosterSettings } from './roster-sync'
import { getCurrentWeek, readWeeklyProjections } from './weekly-projections'
import { getTopWaiverTargets, getRisingPlayers, getTrendingSummary } from './waiver-trending'
import { getWeekMatchups, rateMatchup } from './matchup-data'
import { getInjuredPlayers } from './injury-tracker'

// --- Types ---

export interface WaiverTarget {
  playerId: string
  playerName: string
  position: Position
  team: string

  // Ownership & trending
  ownershipPercent: number
  addCount: number
  dropCount: number
  netAdds: number
  trendDirection: 'rising' | 'falling' | 'stable'
  trendVelocity: number // Rate of change (high = rapidly rising)

  // Projections
  projectedPoints: number
  restOfSeasonRank: number
  upcomingScheduleRating: 'elite' | 'favorable' | 'neutral' | 'tough' | 'brutal'

  // FAAB recommendation (FF-121)
  faabRecommendation: FaabRecommendation

  // Roster fit (FF-120)
  rosterFit?: RosterFitAnalysis

  // Priority score (FF-122)
  priorityScore: number
  priorityRank: number

  // Reasoning
  reasoning: string
  keyFactors: string[]
}

export interface FaabRecommendation {
  recommendedBid: number
  maxBid: number
  bidPercentage: number // % of remaining budget
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  competitionLevel: 'hot' | 'moderate' | 'low' // How contested this player is
}

export interface RosterFitAnalysis {
  fillsNeed: boolean
  positionNeed: 'critical' | 'moderate' | 'depth' | 'none'
  wouldStart: boolean
  improvesDepth: boolean
  playoffSchedule: 'elite' | 'favorable' | 'neutral' | 'tough'
  droppablePlayer?: {
    playerId: string
    playerName: string
    reason: string
  }
}

export interface WaiverWireAnalysis {
  week: number
  season: number
  leagueId: string
  scoringFormat: ScoringFormat

  // Top targets by category
  topOverall: WaiverTarget[]
  topByPosition: Record<Position, WaiverTarget[]>
  fastestRising: WaiverTarget[]
  deepSleepers: WaiverTarget[] // Low ownership but high upside

  // Roster-specific recommendations
  bestFits: WaiverTarget[] // Best for YOUR roster
  depthNeeds: WaiverTarget[] // Shore up weak spots

  // FAAB summary
  budgetRemaining: number
  budgetRecommendation: {
    aggressiveBids: number // How much to spend this week
    saveForLater: number
    reasoning: string
  }

  // Watchlist suggestions
  watchlist: WaiverTarget[] // Not worth bidding now but monitor

  analyzedAt: string
}

// --- Position Need Analysis (FF-120) ---

interface PositionStrength {
  position: Position
  starterCount: number
  starterQuality: number // Average rank of starters
  depthCount: number
  depthQuality: number
  needLevel: 'critical' | 'moderate' | 'depth' | 'none'
}

function analyzePositionNeeds(
  roster: UserRoster
): Map<Position, PositionStrength> {
  const needs = new Map<Position, PositionStrength>()
  const settings = roster.rosterSettings

  // Group players by position
  const byPosition: Record<Position, typeof roster.players> = {
    QB: [],
    RB: [],
    WR: [],
    TE: [],
    K: [],
    DEF: [],
  }

  for (const player of roster.players) {
    byPosition[player.position].push(player)
  }

  // Analyze each position
  const positionSlots: Record<Position, number> = {
    QB: settings.qb + (settings.superflex > 0 ? settings.superflex : 0),
    RB: settings.rb + Math.ceil(settings.flex / 2),
    WR: settings.wr + Math.ceil(settings.flex / 2),
    TE: settings.te + Math.floor(settings.flex / 3),
    K: settings.k,
    DEF: settings.def,
  }

  for (const pos of Object.keys(byPosition) as Position[]) {
    const players = byPosition[pos]
    const requiredStarters = positionSlots[pos]
    const starters = players.filter((p) => p.isStarter)
    const bench = players.filter((p) => !p.isStarter)

    // Simple quality scoring based on slot (would be enhanced with actual rankings)
    const starterQuality = starters.length > 0 ? 50 : 0 // Placeholder
    const depthQuality = bench.length > 0 ? 30 : 0 // Placeholder

    // Determine need level
    let needLevel: PositionStrength['needLevel']
    if (starters.length < requiredStarters) {
      needLevel = 'critical'
    } else if (bench.length < 1 && requiredStarters > 0) {
      needLevel = 'moderate'
    } else if (bench.length < 2 && requiredStarters > 1) {
      needLevel = 'depth'
    } else {
      needLevel = 'none'
    }

    needs.set(pos, {
      position: pos,
      starterCount: starters.length,
      starterQuality,
      depthCount: bench.length,
      depthQuality,
      needLevel,
    })
  }

  return needs
}

// --- FAAB Recommendation (FF-121) ---

interface FaabContext {
  budgetRemaining: number
  budgetTotal: number
  weeksRemaining: number
  leagueCompetitiveness: number // 0-1, how aggressive other managers are
}

function calculateFaabBid(
  target: Partial<WaiverTarget>,
  context: FaabContext,
  rosterFit?: RosterFitAnalysis
): FaabRecommendation {
  const { budgetRemaining, weeksRemaining, leagueCompetitiveness } = context

  // Base value calculation
  let baseValue = 0

  // Trending velocity drives base bid
  const velocity = target.trendVelocity || 0
  if (velocity > 0.8) baseValue += 25 // Hot commodity
  else if (velocity > 0.5) baseValue += 15
  else if (velocity > 0.2) baseValue += 8
  else baseValue += 3

  // Ownership drives demand
  const ownership = target.ownershipPercent || 0
  if (ownership < 10) baseValue += 5 // Under the radar
  else if (ownership < 30) baseValue += 3
  else if (ownership > 70) baseValue -= 5 // Might be too late

  // Roster fit multiplier
  let fitMultiplier = 1.0
  if (rosterFit) {
    if (rosterFit.positionNeed === 'critical') fitMultiplier = 1.5
    else if (rosterFit.positionNeed === 'moderate') fitMultiplier = 1.2
    else if (rosterFit.positionNeed === 'depth') fitMultiplier = 0.8
    else fitMultiplier = 0.5 // Don't need this position

    if (rosterFit.wouldStart) fitMultiplier *= 1.3
    if (rosterFit.playoffSchedule === 'elite') fitMultiplier *= 1.2
  }

  // Competition adjustment
  const competitionLevel = velocity > 0.6 || ownership > 50 ? 'hot' : velocity > 0.3 ? 'moderate' : 'low'
  if (competitionLevel === 'hot') baseValue *= 1.3
  else if (competitionLevel === 'low') baseValue *= 0.8

  // League competitiveness
  baseValue *= 1 + leagueCompetitiveness * 0.5

  // Apply multipliers
  let recommendedBid = Math.round(baseValue * fitMultiplier)

  // Cap at percentage of remaining budget
  const weeklyBudget = budgetRemaining / Math.max(weeksRemaining, 1)
  const maxReasonable = Math.round(weeklyBudget * 2) // Don't spend more than 2 weeks' budget on one player

  recommendedBid = Math.min(recommendedBid, maxReasonable)
  recommendedBid = Math.max(recommendedBid, 1) // Minimum $1

  // Max bid is what you'd pay if you really want them
  const maxBid = Math.min(recommendedBid * 1.5, budgetRemaining * 0.5)

  // Confidence based on how clear the decision is
  let confidence: 'high' | 'medium' | 'low'
  if (rosterFit?.positionNeed === 'critical' && competitionLevel === 'hot') {
    confidence = 'high'
  } else if (rosterFit?.fillsNeed || velocity > 0.5) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  // Generate reasoning
  const reasons: string[] = []
  if (rosterFit?.positionNeed === 'critical') {
    reasons.push('fills a critical roster need')
  }
  if (competitionLevel === 'hot') {
    reasons.push('high demand across leagues')
  }
  if (velocity > 0.6) {
    reasons.push('trending up rapidly')
  }
  if (ownership < 20) {
    reasons.push('still available in most leagues')
  }

  return {
    recommendedBid,
    maxBid: Math.round(maxBid),
    bidPercentage: Math.round((recommendedBid / budgetRemaining) * 100),
    confidence,
    reasoning: reasons.length > 0 ? `Bid $${recommendedBid}: ${reasons.join(', ')}.` : `Bid $${recommendedBid}`,
    competitionLevel,
  }
}

// --- Priority Scoring (FF-122) ---

function calculatePriorityScore(
  target: Partial<WaiverTarget>,
  rosterFit?: RosterFitAnalysis
): number {
  let score = 0

  // Base score from trending
  const velocity = target.trendVelocity || 0
  score += velocity * 30

  // Ownership sweet spot (20-50% is prime)
  const ownership = target.ownershipPercent || 0
  if (ownership >= 20 && ownership <= 50) {
    score += 20
  } else if (ownership < 20) {
    score += 10 // Sleeper
  } else {
    score += 5 // Might miss out
  }

  // Projection bonus
  const projected = target.projectedPoints || 0
  score += Math.min(projected / 2, 20)

  // Schedule bonus
  if (target.upcomingScheduleRating === 'elite') score += 15
  else if (target.upcomingScheduleRating === 'favorable') score += 10
  else if (target.upcomingScheduleRating === 'tough') score -= 5

  // Roster fit is huge
  if (rosterFit) {
    if (rosterFit.positionNeed === 'critical') score += 30
    else if (rosterFit.positionNeed === 'moderate') score += 15
    else if (rosterFit.positionNeed === 'depth') score += 5

    if (rosterFit.wouldStart) score += 20
    if (rosterFit.playoffSchedule === 'elite') score += 10
  }

  return Math.max(0, Math.min(100, score))
}

// --- Scanner (FF-119) ---

/**
 * Scan available players and identify top waiver targets
 */
export async function scanWaiverWire(
  scoringFormat: ScoringFormat = 'ppr',
  limit: number = 50
): Promise<WaiverTarget[]> {
  const { week, season } = await getCurrentWeek()

  // Get trending players
  const [trendingAdds, risingPlayers, trendingSummary] = await Promise.all([
    getTopWaiverTargets(limit),
    getRisingPlayers(limit),
    getTrendingSummary(),
  ])

  // Get weekly projections
  const projections = await readWeeklyProjections(week, {
    scoringFormat,
    limit: 500,
  })

  // Get matchup data for upcoming weeks
  const matchups = await getWeekMatchups(week, season)
  const matchupMap = new Map<string, MatchupData>()
  for (const m of matchups) {
    matchupMap.set(m.team, m)
  }

  // Build projection lookup
  const projectionMap = new Map<string, typeof projections[0]>()
  for (const p of projections) {
    projectionMap.set(p.playerName.toLowerCase(), p)
  }

  // Build waiver targets
  const targets: WaiverTarget[] = []

  // Process trending adds
  for (const trending of trendingAdds) {
    const projection = projectionMap.get(trending.playerName.toLowerCase())
    const matchup = matchupMap.get(trending.team)

    // Calculate trend velocity
    const maxTrending = Math.max(...trendingAdds.map((t) => t.addCount))
    const velocity = trending.addCount / maxTrending

    // Rate upcoming schedule
    let scheduleRating: WaiverTarget['upcomingScheduleRating'] = 'neutral'
    if (matchup) {
      // Get the defensive rank for the player's position
      const defRank = trending.position === 'QB' ? matchup.defRankVsQB :
                      trending.position === 'RB' ? matchup.defRankVsRB :
                      trending.position === 'WR' ? matchup.defRankVsWR :
                      trending.position === 'TE' ? matchup.defRankVsTE : null
      const rating = rateMatchup(defRank ?? null)
      // Map the simple rating to our more detailed rating
      scheduleRating = rating === 'favorable' ? 'favorable' :
                       rating === 'unfavorable' ? 'tough' : 'neutral'
    }

    // Generate key factors
    const keyFactors: string[] = []
    if (velocity > 0.8) keyFactors.push('Hottest add in the league')
    if (trending.ownershipPercent && trending.ownershipPercent < 20) keyFactors.push('Flying under the radar')
    if (scheduleRating === 'favorable') keyFactors.push('Great upcoming schedule')
    if (projection && projection.positionRank && projection.positionRank <= 20) keyFactors.push(`Top ${projection.positionRank} at ${trending.position}`)

    targets.push({
      playerId: trending.playerId,
      playerName: trending.playerName,
      position: trending.position,
      team: trending.team,
      ownershipPercent: trending.ownershipPercent || 0,
      addCount: trending.addCount,
      dropCount: trending.dropCount,
      netAdds: trending.netAdds,
      trendDirection: trending.trendDirection,
      trendVelocity: velocity,
      projectedPoints: projection?.consensusPoints || 0,
      restOfSeasonRank: projection?.positionRank || 999,
      upcomingScheduleRating: scheduleRating,
      faabRecommendation: {
        recommendedBid: 0,
        maxBid: 0,
        bidPercentage: 0,
        confidence: 'low',
        reasoning: '',
        competitionLevel: velocity > 0.6 ? 'hot' : velocity > 0.3 ? 'moderate' : 'low',
      },
      priorityScore: 0,
      priorityRank: 0,
      reasoning: '',
      keyFactors,
    })
  }

  // Calculate priority scores and sort
  targets.forEach((t) => {
    t.priorityScore = calculatePriorityScore(t)
  })

  targets.sort((a, b) => b.priorityScore - a.priorityScore)

  // Assign ranks
  targets.forEach((t, i) => {
    t.priorityRank = i + 1
    t.reasoning = `#${t.priorityRank} priority: ${t.keyFactors.slice(0, 2).join('. ')}`
  })

  return targets.slice(0, limit)
}

// --- Roster Fit Analysis (FF-120) ---

function analyzeRosterFit(
  target: WaiverTarget,
  roster: UserRoster,
  positionNeeds: Map<Position, PositionStrength>
): RosterFitAnalysis {
  const need = positionNeeds.get(target.position)

  // Determine if this fills a need
  const fillsNeed = need?.needLevel !== 'none'
  const positionNeed = need?.needLevel || 'none'

  // Would this player start?
  const currentStarters = roster.players.filter(
    (p) => p.position === target.position && p.isStarter
  )
  const worstStarterRank = Math.max(...currentStarters.map((s) => s.projectedPoints || 0), 0)
  const wouldStart = target.projectedPoints > worstStarterRank

  // Playoff schedule analysis (weeks 14-17)
  // Simplified - would need full schedule data
  const playoffSchedule: RosterFitAnalysis['playoffSchedule'] = target.upcomingScheduleRating === 'elite'
    ? 'elite'
    : target.upcomingScheduleRating === 'favorable'
    ? 'favorable'
    : target.upcomingScheduleRating === 'tough'
    ? 'tough'
    : 'neutral'

  // Find droppable player if roster is full
  let droppablePlayer: RosterFitAnalysis['droppablePlayer']
  if (roster.players.length >= 15) { // Typical roster size
    const benchPlayers = roster.players.filter((p) => !p.isStarter)
    const lowestValue = benchPlayers.reduce((lowest, p) =>
      (p.projectedPoints || 0) < (lowest?.projectedPoints || Infinity) ? p : lowest,
      benchPlayers[0]
    )
    if (lowestValue && (lowestValue.projectedPoints || 0) < target.projectedPoints) {
      droppablePlayer = {
        playerId: lowestValue.playerId,
        playerName: lowestValue.playerName,
        reason: `Lower projected points than ${target.playerName}`,
      }
    }
  }

  return {
    fillsNeed,
    positionNeed,
    wouldStart,
    improvesDepth: fillsNeed || !wouldStart,
    playoffSchedule,
    droppablePlayer,
  }
}

// --- Full Waiver Analysis ---

/**
 * Complete waiver wire analysis for a user's roster
 */
export async function analyzeWaiverWire(
  roster: UserRoster
): Promise<WaiverWireAnalysis> {
  const { week, season } = await getCurrentWeek()

  // Analyze position needs
  const positionNeeds = analyzePositionNeeds(roster)

  // Scan waiver wire
  const allTargets = await scanWaiverWire(roster.scoringFormat, 100)

  // Add roster fit analysis to each target
  for (const target of allTargets) {
    target.rosterFit = analyzeRosterFit(target, roster, positionNeeds)
  }

  // Calculate FAAB recommendations
  const faabContext: FaabContext = {
    budgetRemaining: roster.faabRemaining || 100,
    budgetTotal: roster.faabBudget || 100,
    weeksRemaining: 17 - week,
    leagueCompetitiveness: 0.5, // Would be calculated from league history
  }

  for (const target of allTargets) {
    target.faabRecommendation = calculateFaabBid(target, faabContext, target.rosterFit)
  }

  // Re-calculate priority with roster fit
  for (const target of allTargets) {
    target.priorityScore = calculatePriorityScore(target, target.rosterFit)
  }

  // Sort by priority
  allTargets.sort((a, b) => b.priorityScore - a.priorityScore)
  allTargets.forEach((t, i) => {
    t.priorityRank = i + 1
  })

  // Group targets
  const topOverall = allTargets.slice(0, 10)
  const bestFits = allTargets
    .filter((t) => t.rosterFit?.fillsNeed)
    .slice(0, 10)
  const fastestRising = [...allTargets]
    .sort((a, b) => b.trendVelocity - a.trendVelocity)
    .slice(0, 10)
  const deepSleepers = allTargets
    .filter((t) => t.ownershipPercent < 20 && t.priorityScore > 30)
    .slice(0, 10)
  const depthNeeds = allTargets
    .filter((t) => t.rosterFit?.positionNeed === 'depth')
    .slice(0, 10)
  const watchlist = allTargets
    .filter((t) => t.priorityScore < 30 && t.trendDirection === 'rising')
    .slice(0, 10)

  // Group by position
  const topByPosition: Record<Position, WaiverTarget[]> = {
    QB: allTargets.filter((t) => t.position === 'QB').slice(0, 5),
    RB: allTargets.filter((t) => t.position === 'RB').slice(0, 5),
    WR: allTargets.filter((t) => t.position === 'WR').slice(0, 5),
    TE: allTargets.filter((t) => t.position === 'TE').slice(0, 5),
    K: allTargets.filter((t) => t.position === 'K').slice(0, 3),
    DEF: allTargets.filter((t) => t.position === 'DEF').slice(0, 3),
  }

  // Budget recommendation
  const criticalNeeds = Array.from(positionNeeds.values()).filter(
    (n) => n.needLevel === 'critical'
  ).length
  const hotTargets = topOverall.filter((t) => t.faabRecommendation.competitionLevel === 'hot').length

  let aggressiveBids = Math.round(faabContext.budgetRemaining * 0.15) // Default 15% per week
  if (criticalNeeds > 0) aggressiveBids = Math.round(faabContext.budgetRemaining * 0.3)
  if (hotTargets >= 2) aggressiveBids = Math.round(aggressiveBids * 1.5)

  return {
    week,
    season,
    leagueId: roster.leagueId,
    scoringFormat: roster.scoringFormat,
    topOverall,
    topByPosition,
    fastestRising,
    deepSleepers,
    bestFits,
    depthNeeds,
    budgetRemaining: faabContext.budgetRemaining,
    budgetRecommendation: {
      aggressiveBids,
      saveForLater: faabContext.budgetRemaining - aggressiveBids,
      reasoning: criticalNeeds > 0
        ? `Critical position need - be aggressive this week`
        : hotTargets >= 2
        ? `Multiple hot targets - spend to compete`
        : `Standard week - maintain budget discipline`,
    },
    watchlist,
    analyzedAt: new Date().toISOString(),
  }
}

// --- Quick Lookups ---

/**
 * Get top waiver pickups without roster context
 */
export async function getTopWaiverPickups(
  scoringFormat: ScoringFormat = 'ppr',
  limit: number = 20
): Promise<WaiverTarget[]> {
  return scanWaiverWire(scoringFormat, limit)
}

/**
 * Get FAAB recommendation for a specific player
 */
export async function getFaabRecommendation(
  playerId: string,
  playerName: string,
  position: Position,
  roster?: UserRoster
): Promise<FaabRecommendation> {
  const { week } = await getCurrentWeek()
  const targets = await scanWaiverWire('ppr', 100)
  const target = targets.find(
    (t) => t.playerId === playerId || t.playerName.toLowerCase() === playerName.toLowerCase()
  )

  if (!target) {
    return {
      recommendedBid: 1,
      maxBid: 5,
      bidPercentage: 1,
      confidence: 'low',
      reasoning: 'Player not trending - minimal bid recommended',
      competitionLevel: 'low',
    }
  }

  const context: FaabContext = {
    budgetRemaining: roster?.faabRemaining || 100,
    budgetTotal: roster?.faabBudget || 100,
    weeksRemaining: 17 - week,
    leagueCompetitiveness: 0.5,
  }

  let rosterFit: RosterFitAnalysis | undefined
  if (roster) {
    const needs = analyzePositionNeeds(roster)
    rosterFit = analyzeRosterFit(target, roster, needs)
  }

  return calculateFaabBid(target, context, rosterFit)
}
