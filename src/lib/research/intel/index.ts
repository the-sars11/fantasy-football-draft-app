/**
 * Player Intelligence System
 *
 * This module provides intelligent player analysis with:
 * - Multi-source data aggregation with 2026 season validation
 * - System-detected tags (BREAKOUT, SLEEPER, VALUE, BUST, AVOID)
 * - User tags with TARGET as highest priority
 * - Sentiment aggregation and keyword detection
 * - Freshness-aware differential fetching
 */

// Types
export * from './types'

// Freshness & Season Validation
export {
  validate2026Data,
  detectSeason2026ForSource,
  FRESHNESS_TIERS,
  getFreshnessTier,
  isDataStale,
  getStaleSourcesForRefresh,
  filterSourcesToFetch,
  groupBySource,
  updateSourceAfterFetch,
  checkAllSourcesSeasonAvailability,
} from './freshness'
export type { SeasonValidation, StaleSourceInfo } from './freshness'

// Sentiment Aggregation
export {
  BULLISH_KEYWORDS,
  BEARISH_KEYWORDS,
  extractKeywords,
  countKeywordPatterns,
  aggregateSentiment,
  aggregateSentimentFromSources,
  checkSentimentThreshold,
} from './sentiment'
export type { AggregatedSentiment } from './sentiment'

// Tag Detection
export {
  TAG_DETECTION_CONFIG,
  detectBreakout,
  detectSleeper,
  detectValue,
  detectBust,
  detectAvoid,
  detectTags,
  getMostImpactfulTag,
  calculateTotalModifier,
} from './tag-detector'

// Service Orchestration
export {
  enrichPlayerWithIntel,
  enrichPlayersWithIntel,
  applyIntelScoreAdjustment,
  savePlayerIntel,
  loadPlayerIntel,
  loadBulkPlayerIntel,
  isIntelFresh,
  getStaleIntelPlayerIds,
} from './service'
export type { IntelEnrichmentResult, BulkIntelResult } from './service'
