/**
 * Player Intelligence System - Service Orchestration
 *
 * Main service that coordinates:
 * - Multi-source sentiment aggregation
 * - System tag detection
 * - Intel caching and retrieval
 * - Integration with the normalize pipeline
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AggregatedPlayerIntel,
  TagDetectionInput,
  DetectedTag,
  SourceSentimentData,
} from './types'
import type { ConsensusPlayer } from '../normalize'
import { detectTags, getMostImpactfulTag, calculateTotalModifier } from './tag-detector'
import { aggregateSentimentFromSources, type AggregatedSentiment } from './sentiment'

// --- Intel Service Types ---

export interface IntelEnrichmentResult {
  playerName: string
  playerCacheId: string
  intel: AggregatedPlayerIntel | null
  tags: DetectedTag[]
  mostImpactfulTag: DetectedTag | null
  totalScoreModifier: number
  sentimentScore: number
  consensusSentiment: 'bullish' | 'neutral' | 'bearish'
}

export interface BulkIntelResult {
  enrichedPlayers: Map<string, IntelEnrichmentResult>
  missingPlayers: string[]
  computedAt: string
}

// --- Mock Sentiment Data (to be replaced with real source fetching) ---

/**
 * Generate mock sentiment for testing until real sources are integrated
 */
function generateMockSentiment(
  playerName: string,
  consensusRank: number
): Array<{
  source: string
  sentiment: 'bullish' | 'neutral' | 'bearish'
  mentions: string[]
  fetchedAt: string
}> {
  // For now, return empty - real sentiment will come from source adapters
  // This allows the system to work without sentiment data
  return []
}

// --- Intel Service Functions ---

/**
 * Enrich a single player with intel data
 */
export function enrichPlayerWithIntel(
  player: ConsensusPlayer,
  sentimentSources?: Array<{
    source: string
    sentiment: 'bullish' | 'neutral' | 'bearish'
    mentions: string[]
    fetchedAt?: string
  }>
): IntelEnrichmentResult {
  // Build tag detection input
  const input: TagDetectionInput = {
    playerName: player.name,
    consensusRank: player.consensusRank,
    adp: player.adp,
    ecrStdDev: player.ecrStdDev,
    sentimentSources: sentimentSources || generateMockSentiment(player.name, player.consensusRank),
  }

  // Detect tags
  const tags = detectTags(input)
  const mostImpactfulTag = getMostImpactfulTag(tags)
  const totalScoreModifier = calculateTotalModifier(tags)

  // Aggregate sentiment for display
  const aggregatedSentiment = aggregateSentimentFromSources(input.sentimentSources)

  return {
    playerName: player.name,
    playerCacheId: player.sleeperId || player.espnId?.toString() || player.name,
    intel: {
      playerName: player.name,
      playerCacheId: player.sleeperId || player.espnId?.toString() || player.name,
      season: 2026,
      sentimentData: {
        sources: aggregatedSentiment.sources,
        consensusSentiment: aggregatedSentiment.consensusSentiment,
        sentimentScore: aggregatedSentiment.sentimentScore,
      },
      systemTags: tags.map((t) => ({
        tag: t.tag,
        confidence: t.confidence,
        sources: t.sources,
        reasoning: t.reasoning,
        scoreModifier: t.scoreModifier,
        adpGap: t.adpGap,
      })),
      sourceFreshness: {},
      computedAt: new Date().toISOString(),
    },
    tags,
    mostImpactfulTag,
    totalScoreModifier,
    sentimentScore: aggregatedSentiment.sentimentScore,
    consensusSentiment: aggregatedSentiment.consensusSentiment,
  }
}

/**
 * Enrich multiple players with intel data in bulk
 */
export function enrichPlayersWithIntel(
  players: ConsensusPlayer[],
  sentimentByPlayer?: Map<
    string,
    Array<{
      source: string
      sentiment: 'bullish' | 'neutral' | 'bearish'
      mentions: string[]
      fetchedAt?: string
    }>
  >
): BulkIntelResult {
  const enrichedPlayers = new Map<string, IntelEnrichmentResult>()
  const missingPlayers: string[] = []

  for (const player of players) {
    const sentiment = sentimentByPlayer?.get(player.name.toLowerCase())
    const result = enrichPlayerWithIntel(player, sentiment)
    enrichedPlayers.set(player.name.toLowerCase(), result)
  }

  return {
    enrichedPlayers,
    missingPlayers,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Apply intel-based score adjustments to a player's base score
 */
export function applyIntelScoreAdjustment(
  baseScore: number,
  intel: IntelEnrichmentResult | null,
  userTags?: string[]
): number {
  let adjustedScore = baseScore

  // Apply system tag modifiers
  if (intel) {
    adjustedScore += intel.totalScoreModifier
  }

  // Apply user TARGET tag (+25)
  if (userTags?.includes('target')) {
    adjustedScore += 25
  }

  // Apply user avoid tag (-30)
  if (userTags?.includes('avoid')) {
    adjustedScore -= 30
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, adjustedScore))
}

// --- Database Operations ---

/**
 * Save computed intel to database for caching
 */
export async function savePlayerIntel(
  supabase: SupabaseClient,
  intel: AggregatedPlayerIntel
): Promise<void> {
  const { error } = await supabase.from('player_intel').upsert(
    {
      player_cache_id: intel.playerCacheId,
      player_name: intel.playerName,
      season: intel.season,
      sentiment_data: intel.sentimentData,
      system_tags: intel.systemTags,
      source_freshness: intel.sourceFreshness,
      computed_at: intel.computedAt,
    },
    {
      onConflict: 'player_cache_id,season',
    }
  )

  if (error) {
    console.error('Failed to save player intel:', error)
  }
}

/**
 * Load cached intel for a player
 */
export async function loadPlayerIntel(
  supabase: SupabaseClient,
  playerCacheId: string,
  season: number = 2026
): Promise<AggregatedPlayerIntel | null> {
  const { data, error } = await supabase
    .from('player_intel')
    .select('*')
    .eq('player_cache_id', playerCacheId)
    .eq('season', season)
    .single()

  if (error || !data) {
    return null
  }

  return {
    playerName: data.player_name,
    playerCacheId: data.player_cache_id,
    season: data.season,
    sentimentData: data.sentiment_data as AggregatedPlayerIntel['sentimentData'],
    systemTags: data.system_tags as AggregatedPlayerIntel['systemTags'],
    sourceFreshness: data.source_freshness as AggregatedPlayerIntel['sourceFreshness'],
    computedAt: data.computed_at,
  }
}

/**
 * Load cached intel for multiple players
 */
export async function loadBulkPlayerIntel(
  supabase: SupabaseClient,
  playerCacheIds: string[],
  season: number = 2026
): Promise<Map<string, AggregatedPlayerIntel>> {
  const { data, error } = await supabase
    .from('player_intel')
    .select('*')
    .in('player_cache_id', playerCacheIds)
    .eq('season', season)

  const intelMap = new Map<string, AggregatedPlayerIntel>()

  if (error || !data) {
    return intelMap
  }

  for (const row of data) {
    intelMap.set(row.player_cache_id, {
      playerName: row.player_name,
      playerCacheId: row.player_cache_id,
      season: row.season,
      sentimentData: row.sentiment_data as AggregatedPlayerIntel['sentimentData'],
      systemTags: row.system_tags as AggregatedPlayerIntel['systemTags'],
      sourceFreshness: row.source_freshness as AggregatedPlayerIntel['sourceFreshness'],
      computedAt: row.computed_at,
    })
  }

  return intelMap
}

/**
 * Check if cached intel is still fresh
 */
export function isIntelFresh(intel: AggregatedPlayerIntel, maxAgeHours: number = 24): boolean {
  const computedAt = new Date(intel.computedAt).getTime()
  const now = Date.now()
  const maxAge = maxAgeHours * 60 * 60 * 1000

  return now - computedAt < maxAge
}

/**
 * Get stale player IDs that need intel refresh
 */
export async function getStaleIntelPlayerIds(
  supabase: SupabaseClient,
  playerCacheIds: string[],
  season: number = 2026,
  maxAgeHours: number = 24
): Promise<string[]> {
  const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString()

  // Find players with stale or missing intel
  const { data: freshIntel } = await supabase
    .from('player_intel')
    .select('player_cache_id')
    .in('player_cache_id', playerCacheIds)
    .eq('season', season)
    .gte('computed_at', cutoff)

  const freshIds = new Set(freshIntel?.map((r) => r.player_cache_id) || [])

  return playerCacheIds.filter((id) => !freshIds.has(id))
}
