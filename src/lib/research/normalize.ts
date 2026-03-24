/**
 * Multi-Source Normalization Engine
 *
 * Merges player data from multiple sources into consensus rankings
 * and auction values per player. Uses fuzzy name matching to join across sources.
 *
 * Strategy:
 * 1. Sleeper provides the foundational player list (most complete roster)
 * 2. ESPN provides rankings, ADP, auction values, projections
 * 3. FantasyPros ECR provides expert consensus rankings, tiers, auction values
 * 4. Fantasy Footballers provides additional rankings and sentiment tags
 * 5. Pro Football Reference provides historical stats for trend analysis
 * 6. Consensus = weighted average across available sources
 * 7. Intel enrichment adds sentiment-based tags and score modifiers
 *
 * Source Weights (configurable):
 * - FantasyPros ECR: 35% (largest expert consensus)
 * - ESPN: 30% (mainstream + projections)
 * - Sleeper: 20% (ADP/trending data)
 * - Fantasy Footballers: 15% (additional expert rankings)
 */

import type { Position, ScoringFormat } from '@/lib/players/types'
import type { NormalizedSleeperPlayer, NormalizedSleeperProjection } from './sources/sleeper'
import type { NormalizedESPNPlayer } from './sources/espn'
import type { NormalizedFPPlayer, NormalizedFPAuctionValue } from './sources/fantasypros'
import type { NormalizedFFPlayer } from './sources/fantasy-footballers'
import type { NormalizedPFRPlayer } from './sources/pro-football-reference'
import {
  enrichPlayersWithIntel,
  type DetectedTag,
} from './intel'

// --- Source Weight Configuration ---

export interface SourceWeights {
  fantasypros: number
  espn: number
  sleeper: number
  fantasyFootballers: number
}

export const DEFAULT_SOURCE_WEIGHTS: SourceWeights = {
  fantasypros: 0.35,
  espn: 0.30,
  sleeper: 0.20,
  fantasyFootballers: 0.15,
}

export interface SourceFreshness {
  source: string
  fetchedAt: string
  playerCount: number
  status: 'fresh' | 'stale' | 'missing'
}

export interface ConsensusPlayer {
  // Identity
  name: string
  team: string | null
  position: Position
  byeWeek: number | null
  injuryStatus: string | null

  // Cross-platform IDs
  sleeperId: string | null
  espnId: number | null
  fpId: string | null

  // Consensus values (averaged across sources)
  consensusRank: number
  consensusAuctionValue: number | null
  consensusTier: number
  adp: number | null

  // Per-source rankings
  sourceRanks: {
    sleeper?: number // derived from ADP
    espn?: number
    fantasypros?: number
    fantasyFootballers?: number
  }

  // Per-source ADP
  sourceADP: {
    sleeper?: number
    espn?: number
  }

  // Per-source auction values
  sourceAuctionValues: {
    espn?: number
    fantasypros?: number
  }

  // Best available projections
  projections: {
    points: number
    passingYards?: number
    passingTDs?: number
    rushingYards?: number
    rushingTDs?: number
    receivingYards?: number
    receivingTDs?: number
    receptions?: number
  }

  // Metadata
  ecrStdDev: number | null // expert disagreement from FantasyPros
  percentOwned: number | null // from ESPN
  age: number | null
  yearsExp: number | null

  // Historical data (from Pro Football Reference)
  historical?: {
    lastSeasonPoints: number | null
    lastSeasonGames: number | null
    trend: 'up' | 'down' | 'stable' | null
  }

  // Source tracking
  sources: string[] // which sources contributed data

  // Intel enrichment (optional, added by enrichWithIntel)
  intel?: {
    tags: DetectedTag[]
    mostImpactfulTag: DetectedTag | null
    totalScoreModifier: number
    sentimentScore: number
    consensusSentiment: 'bullish' | 'neutral' | 'bearish'
  }
}

/**
 * Normalize a player name for fuzzy matching across sources.
 * Handles: case, suffixes (Jr, III, II), periods, hyphens, team DSTs.
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.']/g, '') // Remove periods and apostrophes
    .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '') // Remove suffixes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

/**
 * Build a lookup map for matching players by normalized name + team.
 * Falls back to name-only matching when team doesn't match (trades, etc.).
 */
function buildNameIndex<T>(
  items: T[],
  getName: (item: T) => string,
  getTeam: (item: T) => string | null
): Map<string, T> {
  const index = new Map<string, T>()
  for (const item of items) {
    const name = normalizeName(getName(item))
    const team = getTeam(item)?.toUpperCase() || ''
    // Primary key: name + team
    index.set(`${name}|${team}`, item)
    // Secondary key: name only (for fallback matching)
    if (!index.has(`${name}|`)) {
      index.set(`${name}|`, item)
    }
  }
  return index
}

function matchPlayer<T>(
  name: string,
  team: string | null,
  index: Map<string, T>
): T | undefined {
  const normName = normalizeName(name)
  const normTeam = team?.toUpperCase() || ''

  // Try name + team first
  const exact = index.get(`${normName}|${normTeam}`)
  if (exact) return exact

  // Fallback to name only
  return index.get(`${normName}|`)
}

/**
 * Calculate weighted average, ignoring undefined values.
 * Weights: FantasyPros ECR (40%), ESPN (35%), Sleeper (25%)
 * These weights reflect data quality and expert consensus breadth.
 */
function weightedAverage(
  values: { value: number | undefined; weight: number }[]
): number | null {
  let totalWeight = 0
  let totalValue = 0

  for (const { value, weight } of values) {
    if (value !== undefined && !isNaN(value)) {
      totalWeight += weight
      totalValue += value * weight
    }
  }

  if (totalWeight === 0) return null
  return totalValue / totalWeight
}

export interface NormalizeInput {
  sleeper?: {
    players: NormalizedSleeperPlayer[]
    projections: NormalizedSleeperProjection[]
    fetchedAt: string
  }
  espn?: {
    players: NormalizedESPNPlayer[]
    fetchedAt: string
  }
  fantasypros?: {
    ecr: NormalizedFPPlayer[]
    auctionValues: NormalizedFPAuctionValue[]
    fetchedAt: string
  }
  fantasyFootballers?: {
    rankings: NormalizedFFPlayer[]
    fetchedAt: string
  }
  proFootballRef?: {
    historical: NormalizedPFRPlayer[]
    season: number
    fetchedAt: string
  }
  scoringFormat?: ScoringFormat
  sourceWeights?: Partial<SourceWeights>
}

export interface NormalizeOutput {
  players: ConsensusPlayer[]
  freshness: SourceFreshness[]
  normalizedAt: string
}

/**
 * Main normalization function.
 * Merges all sources into a single consensus player list.
 */
export function normalizePlayerData(input: NormalizeInput): NormalizeOutput {
  const scoringFormat = input.scoringFormat || 'ppr'
  const weights = { ...DEFAULT_SOURCE_WEIGHTS, ...input.sourceWeights }
  const freshness: SourceFreshness[] = []

  // Track source freshness
  if (input.sleeper) {
    freshness.push({
      source: 'sleeper',
      fetchedAt: input.sleeper.fetchedAt,
      playerCount: input.sleeper.players.length,
      status: isStale(input.sleeper.fetchedAt) ? 'stale' : 'fresh',
    })
  } else {
    freshness.push({ source: 'sleeper', fetchedAt: '', playerCount: 0, status: 'missing' })
  }

  if (input.espn) {
    freshness.push({
      source: 'espn',
      fetchedAt: input.espn.fetchedAt,
      playerCount: input.espn.players.length,
      status: isStale(input.espn.fetchedAt) ? 'stale' : 'fresh',
    })
  } else {
    freshness.push({ source: 'espn', fetchedAt: '', playerCount: 0, status: 'missing' })
  }

  if (input.fantasypros) {
    freshness.push({
      source: 'fantasypros',
      fetchedAt: input.fantasypros.fetchedAt,
      playerCount: input.fantasypros.ecr.length,
      status: isStale(input.fantasypros.fetchedAt) ? 'stale' : 'fresh',
    })
  } else {
    freshness.push({ source: 'fantasypros', fetchedAt: '', playerCount: 0, status: 'missing' })
  }

  if (input.fantasyFootballers) {
    freshness.push({
      source: 'fantasy_footballers',
      fetchedAt: input.fantasyFootballers.fetchedAt,
      playerCount: input.fantasyFootballers.rankings.length,
      status: isStale(input.fantasyFootballers.fetchedAt) ? 'stale' : 'fresh',
    })
  } else {
    freshness.push({ source: 'fantasy_footballers', fetchedAt: '', playerCount: 0, status: 'missing' })
  }

  if (input.proFootballRef) {
    freshness.push({
      source: 'pro_football_reference',
      fetchedAt: input.proFootballRef.fetchedAt,
      playerCount: input.proFootballRef.historical.length,
      status: 'fresh', // Historical data has longer TTL
    })
  } else {
    freshness.push({ source: 'pro_football_reference', fetchedAt: '', playerCount: 0, status: 'missing' })
  }

  // Build lookup indexes for each source
  const espnIndex = input.espn
    ? buildNameIndex(input.espn.players, (p) => p.name, (p) => p.team)
    : new Map<string, NormalizedESPNPlayer>()

  const fpIndex = input.fantasypros
    ? buildNameIndex(input.fantasypros.ecr, (p) => p.name, (p) => p.team)
    : new Map<string, NormalizedFPPlayer>()

  const fpAuctionIndex = input.fantasypros
    ? buildNameIndex(input.fantasypros.auctionValues, (p) => p.name, (p) => p.team)
    : new Map<string, NormalizedFPAuctionValue>()

  const ffIndex = input.fantasyFootballers
    ? buildNameIndex(input.fantasyFootballers.rankings, (p) => p.name, (p) => p.team)
    : new Map<string, NormalizedFFPlayer>()

  const pfrIndex = input.proFootballRef
    ? buildNameIndex(input.proFootballRef.historical, (p) => p.name, (p) => p.team)
    : new Map<string, NormalizedPFRPlayer>()

  // Build Sleeper projection lookup
  const sleeperProjMap = new Map<string, NormalizedSleeperProjection>()
  if (input.sleeper) {
    for (const proj of input.sleeper.projections) {
      sleeperProjMap.set(proj.sleeperId, proj)
    }
  }

  // Start with Sleeper as the base player list (most complete)
  // If Sleeper is missing, fall back to FantasyPros ECR list
  const basePlayers = input.sleeper?.players || []
  const consensusPlayers: ConsensusPlayer[] = []
  const processedNames = new Set<string>()

  // Process Sleeper base players
  for (const sleeperPlayer of basePlayers) {
    const espnMatch = matchPlayer(sleeperPlayer.name, sleeperPlayer.team, espnIndex)
    const fpMatch = matchPlayer(sleeperPlayer.name, sleeperPlayer.team, fpIndex)
    const fpAuctionMatch = matchPlayer(sleeperPlayer.name, sleeperPlayer.team, fpAuctionIndex)
    const ffMatch = matchPlayer(sleeperPlayer.name, sleeperPlayer.team, ffIndex)
    const pfrMatch = matchPlayer(sleeperPlayer.name, sleeperPlayer.team, pfrIndex)
    const sleeperProj = sleeperProjMap.get(sleeperPlayer.sleeperId)

    const sources: string[] = ['sleeper']
    if (espnMatch) sources.push('espn')
    if (fpMatch) sources.push('fantasypros')
    if (ffMatch) sources.push('fantasy_footballers')
    if (pfrMatch) sources.push('pro_football_reference')

    // Get Sleeper ADP based on scoring format
    const sleeperADP =
      scoringFormat === 'ppr'
        ? sleeperPlayer.adp.ppr
        : scoringFormat === 'half-ppr'
          ? sleeperPlayer.adp.halfPpr
          : sleeperPlayer.adp.standard

    // Calculate consensus rank (weighted average of available ranks)
    // Weights are normalized based on which sources are present
    const consensusRank = weightedAverage([
      { value: fpMatch?.ecrRank, weight: weights.fantasypros },
      { value: espnMatch?.rank ?? undefined, weight: weights.espn },
      { value: sleeperADP, weight: weights.sleeper }, // Use ADP as proxy for rank
      { value: ffMatch?.ffRank, weight: weights.fantasyFootballers },
    ])

    // Calculate consensus ADP
    const adp = weightedAverage([
      { value: espnMatch?.adp ?? undefined, weight: 0.5 },
      { value: sleeperADP, weight: 0.5 },
    ])

    // Calculate consensus auction value
    const consensusAuctionValue = weightedAverage([
      { value: fpAuctionMatch?.auctionValue, weight: 0.5 },
      { value: espnMatch?.auctionValue ?? undefined, weight: 0.5 },
    ])

    // Best available projections (prefer ESPN, fall back to Sleeper)
    const projPoints =
      espnMatch?.projectedPoints ??
      (scoringFormat === 'ppr'
        ? sleeperProj?.points.ppr
        : scoringFormat === 'half-ppr'
          ? sleeperProj?.points.halfPpr
          : sleeperProj?.points.standard) ??
      0

    const projections = {
      points: projPoints,
      passingYards: espnMatch?.projections.passingYards ?? sleeperProj?.passingYards,
      passingTDs: espnMatch?.projections.passingTDs ?? sleeperProj?.passingTDs,
      rushingYards: espnMatch?.projections.rushingYards ?? sleeperProj?.rushingYards,
      rushingTDs: espnMatch?.projections.rushingTDs ?? sleeperProj?.rushingTDs,
      receivingYards: espnMatch?.projections.receivingYards ?? sleeperProj?.receivingYards,
      receivingTDs: espnMatch?.projections.receivingTDs ?? sleeperProj?.receivingTDs,
      receptions: espnMatch?.projections.receptions ?? sleeperProj?.receptions,
    }

    // Only include players that have at least a rank or projection
    if (consensusRank === null && projPoints <= 0 && adp === null) continue

    // Build historical data from PFR if available
    const historical = pfrMatch
      ? {
          lastSeasonPoints: pfrMatch.fantasyPointsPPR,
          lastSeasonGames: pfrMatch.games,
          trend: null as 'up' | 'down' | 'stable' | null, // Trend requires multi-year data
        }
      : undefined

    consensusPlayers.push({
      name: sleeperPlayer.name,
      team: sleeperPlayer.team,
      position: sleeperPlayer.position,
      byeWeek: fpMatch?.byeWeek ?? null,
      injuryStatus: sleeperPlayer.injuryStatus || espnMatch?.injuryStatus || null,
      sleeperId: sleeperPlayer.sleeperId,
      espnId: espnMatch?.espnId ?? null,
      fpId: fpMatch?.fpId ?? null,
      consensusRank: consensusRank ?? 999,
      consensusAuctionValue,
      consensusTier: fpMatch?.tier ?? ffMatch?.tier ?? Math.ceil((consensusRank ?? 999) / 12),
      adp,
      sourceRanks: {
        sleeper: sleeperADP,
        espn: espnMatch?.rank ?? undefined,
        fantasypros: fpMatch?.ecrRank,
        fantasyFootballers: ffMatch?.ffRank,
      },
      sourceADP: {
        sleeper: sleeperADP,
        espn: espnMatch?.adp ?? undefined,
      },
      sourceAuctionValues: {
        espn: espnMatch?.auctionValue ?? undefined,
        fantasypros: fpAuctionMatch?.auctionValue,
      },
      projections,
      ecrStdDev: fpMatch?.ecrStdDev ?? null,
      percentOwned: espnMatch?.percentOwned ?? null,
      age: sleeperPlayer.age ?? pfrMatch?.age ?? null,
      yearsExp: sleeperPlayer.yearsExp,
      historical,
      sources,
    })

    processedNames.add(normalizeName(sleeperPlayer.name))
  }

  // Add any FantasyPros players not in Sleeper (edge case: new players, DSTs)
  if (input.fantasypros) {
    for (const fpPlayer of input.fantasypros.ecr) {
      if (processedNames.has(normalizeName(fpPlayer.name))) continue

      const espnMatch = matchPlayer(fpPlayer.name, fpPlayer.team, espnIndex)
      const fpAuctionMatch = matchPlayer(fpPlayer.name, fpPlayer.team, fpAuctionIndex)
      const ffMatch = matchPlayer(fpPlayer.name, fpPlayer.team, ffIndex)
      const pfrMatch = matchPlayer(fpPlayer.name, fpPlayer.team, pfrIndex)

      const sources: string[] = ['fantasypros']
      if (espnMatch) sources.push('espn')
      if (ffMatch) sources.push('fantasy_footballers')
      if (pfrMatch) sources.push('pro_football_reference')

      const consensusAuctionValue = weightedAverage([
        { value: fpAuctionMatch?.auctionValue, weight: 0.5 },
        { value: espnMatch?.auctionValue ?? undefined, weight: 0.5 },
      ])

      // Calculate consensus rank including Fantasy Footballers
      const consensusRank = weightedAverage([
        { value: fpPlayer.ecrRank, weight: weights.fantasypros },
        { value: espnMatch?.rank ?? undefined, weight: weights.espn },
        { value: ffMatch?.ffRank, weight: weights.fantasyFootballers },
      ])

      const historical = pfrMatch
        ? {
            lastSeasonPoints: pfrMatch.fantasyPointsPPR,
            lastSeasonGames: pfrMatch.games,
            trend: null as 'up' | 'down' | 'stable' | null,
          }
        : undefined

      consensusPlayers.push({
        name: fpPlayer.name,
        team: fpPlayer.team,
        position: fpPlayer.position,
        byeWeek: fpPlayer.byeWeek || null,
        injuryStatus: espnMatch?.injuryStatus || null,
        sleeperId: fpPlayer.sleeperId || null,
        espnId: espnMatch?.espnId ?? (fpPlayer.espnId ? parseInt(fpPlayer.espnId) : null),
        fpId: fpPlayer.fpId || null,
        consensusRank: consensusRank ?? fpPlayer.ecrRank,
        consensusAuctionValue,
        consensusTier: fpPlayer.tier ?? ffMatch?.tier ?? Math.ceil(fpPlayer.ecrRank / 12),
        adp: espnMatch?.adp ?? null,
        sourceRanks: {
          espn: espnMatch?.rank ?? undefined,
          fantasypros: fpPlayer.ecrRank,
          fantasyFootballers: ffMatch?.ffRank,
        },
        sourceADP: {
          espn: espnMatch?.adp ?? undefined,
        },
        sourceAuctionValues: {
          espn: espnMatch?.auctionValue ?? undefined,
          fantasypros: fpAuctionMatch?.auctionValue,
        },
        projections: {
          points: espnMatch?.projectedPoints ?? 0,
          passingYards: espnMatch?.projections.passingYards,
          passingTDs: espnMatch?.projections.passingTDs,
          rushingYards: espnMatch?.projections.rushingYards,
          rushingTDs: espnMatch?.projections.rushingTDs,
          receivingYards: espnMatch?.projections.receivingYards,
          receivingTDs: espnMatch?.projections.receivingTDs,
          receptions: espnMatch?.projections.receptions,
        },
        ecrStdDev: fpPlayer.ecrStdDev,
        percentOwned: espnMatch?.percentOwned ?? null,
        age: pfrMatch?.age ?? null,
        yearsExp: null,
        historical,
        sources,
      })

      processedNames.add(normalizeName(fpPlayer.name))
    }
  }

  // Sort by consensus rank
  consensusPlayers.sort((a, b) => a.consensusRank - b.consensusRank)

  return {
    players: consensusPlayers,
    freshness,
    normalizedAt: new Date().toISOString(),
  }
}

/**
 * Check if a data source is stale (>24 hours old).
 */
function isStale(fetchedAt: string): boolean {
  if (!fetchedAt) return true
  const fetched = new Date(fetchedAt).getTime()
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000
  return now - fetched > twentyFourHours
}

// --- Intel Enrichment ---

export interface EnrichWithIntelOptions {
  /**
   * Sentiment data keyed by player name (lowercase)
   * If not provided, intel enrichment will run without sentiment input
   */
  sentimentByPlayer?: Map<
    string,
    Array<{
      source: string
      sentiment: 'bullish' | 'neutral' | 'bearish'
      mentions: string[]
      fetchedAt: string
    }>
  >
}

/**
 * Enrich normalized players with intel data (tags, sentiment scores)
 *
 * This is a separate step that can be called after normalizePlayerData
 * to add intelligence-based tags without modifying the core normalization.
 */
export function enrichWithIntel(
  output: NormalizeOutput,
  options: EnrichWithIntelOptions = {}
): NormalizeOutput {
  const { sentimentByPlayer } = options

  const enrichmentResult = enrichPlayersWithIntel(output.players, sentimentByPlayer)

  const enrichedPlayers = output.players.map((player) => {
    const intel = enrichmentResult.enrichedPlayers.get(player.name.toLowerCase())

    if (!intel) {
      return player
    }

    return {
      ...player,
      intel: {
        tags: intel.tags,
        mostImpactfulTag: intel.mostImpactfulTag,
        totalScoreModifier: intel.totalScoreModifier,
        sentimentScore: intel.sentimentScore,
        consensusSentiment: intel.consensusSentiment,
      },
    }
  })

  return {
    ...output,
    players: enrichedPlayers,
  }
}

/**
 * Combined normalize + enrich in one call
 */
export function normalizeAndEnrich(
  input: NormalizeInput,
  intelOptions?: EnrichWithIntelOptions
): NormalizeOutput {
  const normalized = normalizePlayerData(input)
  return enrichWithIntel(normalized, intelOptions)
}
