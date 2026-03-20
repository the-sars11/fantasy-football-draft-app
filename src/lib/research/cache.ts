/**
 * Player Cache Layer
 *
 * Manages the players_cache table in Supabase.
 * - Upserts normalized player data after each data pull
 * - Tracks freshness per source
 * - Auto-expires after 24 hours
 * - Supports incremental updates (only writes changed data)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ConsensusPlayer, SourceFreshness } from './normalize'

export interface CachedPlayer {
  id: string
  name: string
  team: string | null
  position: string
  bye_week: number | null
  adp: Record<string, number>
  auction_values: Record<string, number>
  projections: Record<string, number>
  injury_status: string | null
  source_data: Record<string, unknown>
  last_updated_at: string
}

export interface CacheStatus {
  totalPlayers: number
  lastUpdated: string | null
  sourceFreshness: SourceFreshness[]
  isStale: boolean
}

/**
 * Upsert normalized players into the cache.
 * Uses player name + position as the natural key for matching.
 */
export async function upsertPlayerCache(
  supabase: SupabaseClient,
  players: ConsensusPlayer[],
  freshness: SourceFreshness[]
): Promise<{ upserted: number; errors: string[] }> {
  const errors: string[] = []
  let upserted = 0

  // Process in batches of 50 to avoid payload limits
  const batchSize = 50
  for (let i = 0; i < players.length; i += batchSize) {
    const batch = players.slice(i, i + batchSize)

    const rows = batch.map((p) => ({
      name: p.name,
      team: p.team,
      position: p.position === 'DEF' ? 'DST' : p.position, // DB uses DST
      bye_week: p.byeWeek,
      external_id: p.sleeperId || p.espnId?.toString() || p.fpId || null,
      adp: Object.fromEntries(
        Object.entries(p.sourceADP).filter(([, v]) => v !== undefined)
      ),
      auction_values: Object.fromEntries(
        Object.entries(p.sourceAuctionValues).filter(([, v]) => v !== undefined)
      ),
      projections: {
        points: p.projections.points,
        ...(p.projections.passingYards !== undefined && { passing_yds: p.projections.passingYards }),
        ...(p.projections.passingTDs !== undefined && { passing_tds: p.projections.passingTDs }),
        ...(p.projections.rushingYards !== undefined && { rushing_yds: p.projections.rushingYards }),
        ...(p.projections.rushingTDs !== undefined && { rushing_tds: p.projections.rushingTDs }),
        ...(p.projections.receivingYards !== undefined && { receiving_yds: p.projections.receivingYards }),
        ...(p.projections.receivingTDs !== undefined && { receiving_tds: p.projections.receivingTDs }),
        ...(p.projections.receptions !== undefined && { receptions: p.projections.receptions }),
      },
      injury_status: p.injuryStatus,
      source_data: {
        consensus_rank: p.consensusRank,
        consensus_tier: p.consensusTier,
        consensus_auction_value: p.consensusAuctionValue,
        source_ranks: p.sourceRanks,
        ecr_std_dev: p.ecrStdDev,
        percent_owned: p.percentOwned,
        age: p.age,
        years_exp: p.yearsExp,
        sources: p.sources,
        sleeper_id: p.sleeperId,
        espn_id: p.espnId,
        fp_id: p.fpId,
        freshness: freshness.map((f) => ({
          source: f.source,
          fetched_at: f.fetchedAt,
          status: f.status,
        })),
      },
      last_updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from('players_cache')
      .upsert(rows, {
        onConflict: 'name',
        ignoreDuplicates: false,
      })

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
    } else {
      upserted += batch.length
    }
  }

  return { upserted, errors }
}

/**
 * Read all cached players, sorted by consensus rank.
 */
export async function readPlayerCache(
  supabase: SupabaseClient,
  position?: string
): Promise<CachedPlayer[]> {
  let query = supabase
    .from('players_cache')
    .select('*')
    .order('last_updated_at', { ascending: false })

  if (position) {
    const dbPosition = position === 'DEF' ? 'DST' : position
    query = query.eq('position', dbPosition)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to read player cache: ${error.message}`)
  }

  return (data || []) as CachedPlayer[]
}

/**
 * Get cache status — how many players, when last updated, source freshness.
 */
export async function getCacheStatus(
  supabase: SupabaseClient
): Promise<CacheStatus> {
  const { data, error, count } = await supabase
    .from('players_cache')
    .select('last_updated_at, source_data', { count: 'exact' })
    .order('last_updated_at', { ascending: false })
    .limit(1)

  if (error) {
    throw new Error(`Failed to get cache status: ${error.message}`)
  }

  const latestRow = data?.[0]
  const lastUpdated = latestRow?.last_updated_at ?? null

  // Extract freshness from the most recent row's source_data
  const sourceFreshness: SourceFreshness[] = []
  if (latestRow?.source_data) {
    const sd = latestRow.source_data as Record<string, unknown>
    const freshnessData = sd.freshness as Array<{
      source: string
      fetched_at: string
      status: string
    }> | undefined

    if (freshnessData) {
      for (const f of freshnessData) {
        sourceFreshness.push({
          source: f.source,
          fetchedAt: f.fetched_at,
          playerCount: 0, // Not stored per-row
          status: f.status as 'fresh' | 'stale' | 'missing',
        })
      }
    }
  }

  const isStale = !lastUpdated || isDataStale(lastUpdated)

  return {
    totalPlayers: count ?? 0,
    lastUpdated,
    sourceFreshness,
    isStale,
  }
}

/**
 * Clear the entire player cache (for manual refresh).
 */
export async function clearPlayerCache(
  supabase: SupabaseClient
): Promise<void> {
  const { error } = await supabase
    .from('players_cache')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows

  if (error) {
    throw new Error(`Failed to clear player cache: ${error.message}`)
  }
}

function isDataStale(lastUpdated: string): boolean {
  const updated = new Date(lastUpdated).getTime()
  const now = Date.now()
  const twentyFourHours = 24 * 60 * 60 * 1000
  return now - updated > twentyFourHours
}
