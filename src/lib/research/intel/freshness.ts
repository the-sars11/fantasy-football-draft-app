/**
 * Player Intelligence System - Freshness & Season Validation
 *
 * Handles 2026 season data validation, freshness tiers, and differential fetching.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { SourceRegistry, FetchStatus } from '@/lib/supabase/database.types'
import type { DataType, FreshnessTier, SourceAdapter, SourceFetchResult } from './types'

// --- Season Validation ---

const CURRENT_SEASON = 2026
const SEASON_START_MONTH = 5 // June (0-indexed) - when quality 2026 data typically appears

/**
 * Determine if a fetch result contains valid 2026 season data
 */
export interface SeasonValidation {
  is2026: boolean
  confidence: number // 0-1
  reason: string
  method: 'content_check' | 'date_heuristic' | 'source_metadata'
}

/**
 * Validate if content is from 2026 season using multiple strategies
 */
export function validate2026Data(
  source: string,
  fetchedAt: string,
  content: unknown,
  contentHints?: {
    hasSeasonHeader?: boolean
    lastUpdateDate?: Date | null
    seasonLabel?: string
  }
): SeasonValidation {
  const fetchDate = new Date(fetchedAt)
  const currentYear = fetchDate.getFullYear()
  const currentMonth = fetchDate.getMonth()

  // Strategy 1: Explicit season label in content
  if (contentHints?.seasonLabel) {
    const is2026 = contentHints.seasonLabel.includes('2026')
    if (is2026) {
      return {
        is2026: true,
        confidence: 0.95,
        reason: `Season label explicitly shows 2026: "${contentHints.seasonLabel}"`,
        method: 'content_check',
      }
    }
    // Explicit 2025 or earlier label is a red flag
    if (/202[0-5]/.test(contentHints.seasonLabel)) {
      return {
        is2026: false,
        confidence: 0.9,
        reason: `Season label shows pre-2026 data: "${contentHints.seasonLabel}"`,
        method: 'content_check',
      }
    }
  }

  // Strategy 2: Content has 2026 season markers
  if (contentHints?.hasSeasonHeader) {
    return {
      is2026: true,
      confidence: 0.85,
      reason: 'Content contains 2026 season header/markers',
      method: 'content_check',
    }
  }

  // Strategy 3: Source's last update date is recent
  if (contentHints?.lastUpdateDate) {
    const updateDate = contentHints.lastUpdateDate
    const daysSinceUpdate = Math.floor(
      (fetchDate.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // If updated within last 30 days during season, likely 2026
    if (daysSinceUpdate <= 30 && currentMonth >= SEASON_START_MONTH) {
      return {
        is2026: true,
        confidence: 0.8,
        reason: `Source updated ${daysSinceUpdate} days ago during 2026 season`,
        method: 'source_metadata',
      }
    }
  }

  // Strategy 4: Date-based heuristic (fallback)
  // If we're past June 2026, sources should have 2026 data
  if (currentYear === CURRENT_SEASON && currentMonth >= SEASON_START_MONTH) {
    return {
      is2026: true,
      confidence: 0.65,
      reason: `Fetched after June ${CURRENT_SEASON}, assumed to be current season`,
      method: 'date_heuristic',
    }
  }

  // Before June 2026 or earlier year - data is likely stale
  return {
    is2026: false,
    confidence: 0.8,
    reason: currentYear < CURRENT_SEASON
      ? `Fetched in ${currentYear}, before ${CURRENT_SEASON} season`
      : `Fetched before June ${CURRENT_SEASON}, 2026 data not yet available`,
    method: 'date_heuristic',
  }
}

/**
 * Source-specific 2026 detection patterns
 */
export function detectSeason2026ForSource(
  source: string,
  rawContent: string | Record<string, unknown>
): { hasSeasonHeader: boolean; seasonLabel?: string } {
  const contentStr = typeof rawContent === 'string' ? rawContent : JSON.stringify(rawContent)

  switch (source) {
    case 'fantasypros':
      // FantasyPros includes season in page title and ECR data
      const fpMatch = contentStr.match(/(\d{4})\s*Fantasy\s*(Football)?/i)
      return {
        hasSeasonHeader: fpMatch?.[1] === '2026',
        seasonLabel: fpMatch?.[0],
      }

    case 'espn':
      // ESPN API includes season in endpoint and response
      const espnMatch = contentStr.match(/season[":]+(\d{4})/i)
      return {
        hasSeasonHeader: espnMatch?.[1] === '2026',
        seasonLabel: espnMatch?.[0],
      }

    case 'sleeper':
      // Sleeper projections endpoint includes season param
      const sleeperMatch = contentStr.match(/projections\/nfl\/(\d{4})/i)
      return {
        hasSeasonHeader: sleeperMatch?.[1] === '2026',
        seasonLabel: sleeperMatch?.[0],
      }

    default:
      // Generic year detection
      const genericMatch = contentStr.match(/2026\s*(NFL|Fantasy|Season|Rankings)/i)
      return {
        hasSeasonHeader: !!genericMatch,
        seasonLabel: genericMatch?.[0],
      }
  }
}

// --- Freshness Tiers ---

/**
 * Default freshness configuration per data type
 */
export const FRESHNESS_TIERS: FreshnessTier[] = [
  {
    dataType: 'rankings',
    ttlHours: 24,
    offSeasonBehavior: 'skip',
    requiresSeason2026: true,
  },
  {
    dataType: 'adp',
    ttlHours: 48,
    offSeasonBehavior: 'skip',
    requiresSeason2026: true,
  },
  {
    dataType: 'projections',
    ttlHours: 168, // Weekly
    offSeasonBehavior: 'skip',
    requiresSeason2026: true,
  },
  {
    dataType: 'auction_values',
    ttlHours: 48,
    offSeasonBehavior: 'skip',
    requiresSeason2026: true,
  },
  {
    dataType: 'sentiment',
    ttlHours: 48,
    offSeasonBehavior: 'use_previous',
    requiresSeason2026: false, // Sentiment can be from articles about 2026
  },
  {
    dataType: 'historical',
    ttlHours: 168,
    offSeasonBehavior: 'fetch_anyway',
    requiresSeason2026: false, // Historical is always past seasons
  },
]

/**
 * Get freshness tier for a data type
 */
export function getFreshnessTier(dataType: DataType): FreshnessTier | undefined {
  return FRESHNESS_TIERS.find((t) => t.dataType === dataType)
}

/**
 * Check if data is stale based on freshness tier
 */
export function isDataStale(
  dataType: DataType,
  lastFetchedAt: string | null
): { stale: boolean; reason: string } {
  if (!lastFetchedAt) {
    return { stale: true, reason: 'Never fetched' }
  }

  const tier = getFreshnessTier(dataType)
  if (!tier) {
    return { stale: true, reason: `No freshness tier for ${dataType}` }
  }

  const lastFetch = new Date(lastFetchedAt).getTime()
  const now = Date.now()
  const ttlMs = tier.ttlHours * 60 * 60 * 1000
  const ageHours = Math.round((now - lastFetch) / (1000 * 60 * 60))

  if (now - lastFetch > ttlMs) {
    return {
      stale: true,
      reason: `Data is ${ageHours}h old, TTL is ${tier.ttlHours}h`,
    }
  }

  return { stale: false, reason: `Fresh (${ageHours}h old, TTL ${tier.ttlHours}h)` }
}

// --- Differential Fetching ---

export interface StaleSourceInfo {
  sourceKey: string
  dataType: DataType
  lastFetchedAt: string | null
  staleness: { stale: boolean; reason: string }
  season2026Available: boolean
  shouldFetch: boolean
  skipReason?: string
}

/**
 * Determine which sources need to be refreshed based on staleness and season availability
 */
export async function getStaleSourcesForRefresh(
  supabase: SupabaseClient,
  requestedDataTypes: DataType[]
): Promise<StaleSourceInfo[]> {
  // Fetch source registry
  const { data: sources, error } = await supabase
    .from('source_registry')
    .select('*')
    .eq('is_enabled', true)

  if (error || !sources) {
    throw new Error(`Failed to fetch source registry: ${error?.message}`)
  }

  const results: StaleSourceInfo[] = []
  const now = new Date()
  const isOffSeason = now.getMonth() < SEASON_START_MONTH && now.getFullYear() === CURRENT_SEASON

  for (const source of sources as SourceRegistry[]) {
    // Determine which data types this source supports
    const sourceDataTypes = (source.config?.data_types as string[]) || []

    for (const dataType of requestedDataTypes) {
      // Skip if source doesn't support this data type
      if (!sourceDataTypes.includes(dataType)) {
        continue
      }

      const tier = getFreshnessTier(dataType)
      if (!tier) continue

      const staleness = isDataStale(dataType, source.last_fetch_at)
      const season2026Available = source.season_data_available

      // Determine if we should fetch
      let shouldFetch = staleness.stale
      let skipReason: string | undefined

      // Handle off-season behavior
      if (isOffSeason && tier.requiresSeason2026 && !season2026Available) {
        switch (tier.offSeasonBehavior) {
          case 'skip':
            shouldFetch = false
            skipReason = `Off-season: ${dataType} requires 2026 data, not yet available from ${source.source_key}`
            break
          case 'use_previous':
            shouldFetch = false
            skipReason = `Off-season: using cached ${dataType} until 2026 data available`
            break
          case 'fetch_anyway':
            // Allow fetch even if 2026 not available (e.g., historical data)
            break
        }
      }

      // If 2026 data is required and not available, skip
      if (tier.requiresSeason2026 && !season2026Available && !isOffSeason) {
        shouldFetch = false
        skipReason = `${source.source_key} doesn't have 2026 ${dataType} data yet`
      }

      results.push({
        sourceKey: source.source_key,
        dataType,
        lastFetchedAt: source.last_fetch_at,
        staleness,
        season2026Available,
        shouldFetch,
        skipReason,
      })
    }
  }

  return results
}

/**
 * Filter to only sources that need fetching
 */
export function filterSourcesToFetch(staleInfo: StaleSourceInfo[]): StaleSourceInfo[] {
  return staleInfo.filter((s) => s.shouldFetch)
}

/**
 * Group stale sources by source key for batch processing
 */
export function groupBySource(staleInfo: StaleSourceInfo[]): Map<string, DataType[]> {
  const grouped = new Map<string, DataType[]>()

  for (const info of staleInfo) {
    if (!info.shouldFetch) continue

    const existing = grouped.get(info.sourceKey) || []
    existing.push(info.dataType)
    grouped.set(info.sourceKey, existing)
  }

  return grouped
}

// --- Update Source Registry ---

/**
 * Update source registry after a fetch attempt
 */
export async function updateSourceAfterFetch(
  supabase: SupabaseClient,
  sourceKey: string,
  result: SourceFetchResult<unknown>
): Promise<void> {
  const status: FetchStatus = result.success ? 'success' : 'failed'

  const { error } = await supabase
    .from('source_registry')
    .update({
      last_fetch_at: result.fetchedAt,
      last_fetch_status: status,
      last_fetch_error: result.error || null,
      season_data_available: result.is2026Data,
      season_data_checked_at: result.fetchedAt,
    })
    .eq('source_key', sourceKey)

  if (error) {
    console.error(`Failed to update source registry for ${sourceKey}:`, error)
  }
}

/**
 * Check and update season availability for all sources
 */
export async function checkAllSourcesSeasonAvailability(
  supabase: SupabaseClient,
  adapters: Map<string, SourceAdapter>
): Promise<void> {
  for (const [sourceKey, adapter] of adapters) {
    try {
      const availability = await adapter.is2026DataAvailable()

      await supabase
        .from('source_registry')
        .update({
          season_data_available: availability.available,
          season_data_checked_at: availability.checkedAt,
        })
        .eq('source_key', sourceKey)
    } catch (err) {
      console.error(`Failed to check season availability for ${sourceKey}:`, err)
    }
  }
}
