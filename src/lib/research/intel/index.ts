/**
 * Player Intelligence System
 *
 * This module provides intelligent player analysis with:
 * - Multi-source data aggregation with 2026 season validation
 * - System-detected tags (BREAKOUT, SLEEPER, VALUE, BUST, AVOID)
 * - User tags with TARGET as highest priority
 * - Natural language rules parsed by LLM
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
