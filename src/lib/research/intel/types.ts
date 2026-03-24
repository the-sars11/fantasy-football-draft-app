/**
 * Player Intelligence System - Core Types
 *
 * Types for source adapters, sentiment analysis, tag detection, and intel aggregation.
 */

import type { ScoringFormat } from '@/lib/supabase/database.types'

// --- Source Adapter Types ---

export type DataType = 'rankings' | 'projections' | 'auction_values' | 'adp' | 'sentiment' | 'historical'

/**
 * Common player data structure returned by all source adapters
 */
export interface SourcePlayerData {
  name: string
  team: string | null
  position: string
  sourceId?: string // Source-specific player ID
  rank?: number
  adp?: number
  auctionValue?: number
  projectedPoints?: number
  projections?: {
    passingYards?: number
    passingTDs?: number
    rushingYards?: number
    rushingTDs?: number
    receivingYards?: number
    receivingTDs?: number
    receptions?: number
  }
  injuryStatus?: string | null
  byeWeek?: number | null
  age?: number | null
  yearsExp?: number | null
}

/**
 * Sentiment data from a source (articles, analysis)
 */
export interface SourceSentimentData {
  playerName: string
  sentiment: 'bullish' | 'neutral' | 'bearish'
  mentions: string[] // Relevant quotes or phrases
  confidence: number // 0-1
  articleUrl?: string
  articleTitle?: string
  publishedAt?: string
}

/**
 * Historical stats for projection modeling
 */
export interface SourceHistoricalData {
  playerName: string
  season: number
  games: number
  stats: Record<string, number>
}

/**
 * Result from a source fetch operation
 */
export interface SourceFetchResult<T> {
  success: boolean
  data: T[]
  source: string
  dataType: DataType
  fetchedAt: string // ISO 8601 timestamp
  is2026Data: boolean // Critical: indicates if this is 2026 season data
  seasonValidation: {
    method: string // How we determined if it's 2026 data
    confidence: number
    reason: string
  }
  error?: string
  playerCount: number
}

/**
 * Source adapter interface - all sources must implement this
 */
export interface SourceAdapter {
  readonly sourceKey: string
  readonly displayName: string
  readonly dataTypes: DataType[]

  /**
   * Check if 2026 season data is available from this source
   * Critical for data freshness validation
   */
  is2026DataAvailable(): Promise<{
    available: boolean
    confidence: number
    reason: string
    checkedAt: string
  }>

  /**
   * Get the last time this source was updated
   */
  getLastUpdatedDate(): Promise<Date | null>

  /**
   * Fetch player rankings (if supported)
   */
  fetchRankings?(
    season: number,
    format: ScoringFormat
  ): Promise<SourceFetchResult<SourcePlayerData>>

  /**
   * Fetch player projections (if supported)
   */
  fetchProjections?(season: number): Promise<SourceFetchResult<SourcePlayerData>>

  /**
   * Fetch ADP data (if supported)
   */
  fetchADP?(
    season: number,
    format: ScoringFormat
  ): Promise<SourceFetchResult<SourcePlayerData>>

  /**
   * Fetch auction values (if supported)
   */
  fetchAuctionValues?(
    season: number,
    budget: number
  ): Promise<SourceFetchResult<SourcePlayerData>>

  /**
   * Fetch sentiment/analysis for a specific player (if supported)
   */
  fetchPlayerSentiment?(playerName: string): Promise<SourceFetchResult<SourceSentimentData>>

  /**
   * Fetch bulk sentiment for all players (if supported)
   */
  fetchBulkSentiment?(): Promise<SourceFetchResult<SourceSentimentData>>

  /**
   * Fetch historical stats (if supported)
   */
  fetchHistorical?(
    season: number
  ): Promise<SourceFetchResult<SourceHistoricalData>>
}

// --- Intel Aggregation Types ---

/**
 * Combined intel for a player from all sources
 */
export interface AggregatedPlayerIntel {
  playerName: string
  playerCacheId: string
  season: number

  // Sentiment aggregation
  sentimentData: {
    sources: Array<{
      source: string
      sentiment: 'bullish' | 'neutral' | 'bearish'
      mentions: string[]
      fetchedAt: string
    }>
    consensusSentiment: 'bullish' | 'neutral' | 'bearish'
    sentimentScore: number // 0-100, higher = more bullish
  }

  // System-detected tags
  systemTags: Array<{
    tag: 'BREAKOUT' | 'SLEEPER' | 'VALUE' | 'BUST' | 'AVOID'
    confidence: number
    sources: string[]
    reasoning: string
    scoreModifier: number
    adpGap?: number
  }>

  // Source freshness
  sourceFreshness: Record<string, {
    fetchedAt: string
    is2026Data: boolean
    dataType: string
  }>

  computedAt: string
}

// --- Tag Detection Types ---

export type SystemTagType = 'BREAKOUT' | 'SLEEPER' | 'VALUE' | 'BUST' | 'AVOID'

export interface TagDetectionInput {
  playerName: string
  consensusRank: number
  adp: number | null
  ecrStdDev: number | null
  sentimentSources: Array<{
    source: string
    sentiment: 'bullish' | 'neutral' | 'bearish'
    mentions: string[]
    fetchedAt?: string
  }>
}

export interface DetectedTag {
  tag: SystemTagType
  confidence: number
  sources: string[]
  reasoning: string
  scoreModifier: number
  adpGap?: number
}

// --- Freshness Configuration ---

export interface FreshnessTier {
  dataType: DataType
  ttlHours: number
  offSeasonBehavior: 'skip' | 'use_previous' | 'fetch_anyway'
  requiresSeason2026: boolean
}

export const DEFAULT_FRESHNESS_TIERS: FreshnessTier[] = [
  { dataType: 'rankings', ttlHours: 24, offSeasonBehavior: 'skip', requiresSeason2026: true },
  { dataType: 'adp', ttlHours: 48, offSeasonBehavior: 'skip', requiresSeason2026: true },
  { dataType: 'projections', ttlHours: 168, offSeasonBehavior: 'skip', requiresSeason2026: true },
  { dataType: 'auction_values', ttlHours: 48, offSeasonBehavior: 'skip', requiresSeason2026: true },
  { dataType: 'sentiment', ttlHours: 48, offSeasonBehavior: 'use_previous', requiresSeason2026: false },
  { dataType: 'historical', ttlHours: 168, offSeasonBehavior: 'fetch_anyway', requiresSeason2026: false },
]

// --- Score Impact Constants ---

export const TAG_SCORE_MODIFIERS: Record<SystemTagType, number> = {
  BREAKOUT: 15,  // Bumps player ~15 spots in recommendations
  SLEEPER: 10,   // Moderate boost for hidden gems
  VALUE: 12,     // Market inefficiency detected
  BUST: -20,     // Significant penalty, still draftable at right price
  AVOID: -25,    // Strong penalty, needs deep discount
}

export const USER_TARGET_SCORE_MODIFIER = 25 // Highest priority user tag

/**
 * Calculate adjusted score with all modifiers
 */
export function calculateAdjustedScore(
  baseScore: number,
  systemTags: DetectedTag[],
  userTags: string[],
  userRuleModifiers: number[]
): number {
  let score = baseScore

  // Apply system tag modifiers
  for (const tag of systemTags) {
    score += tag.scoreModifier
  }

  // Apply user TARGET tag
  if (userTags.includes('target')) {
    score += USER_TARGET_SCORE_MODIFIER
  }

  // Apply user avoid tag
  if (userTags.includes('avoid')) {
    score -= 30 // User avoid is stronger than system AVOID
  }

  // Apply user rule modifiers
  for (const modifier of userRuleModifiers) {
    score += modifier
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score))
}
