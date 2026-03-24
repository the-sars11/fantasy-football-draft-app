/**
 * Weekly Projections Service
 *
 * Handles fetching, caching, and consensus calculation for weekly player projections.
 * This is the core data layer for in-season Start/Sit recommendations.
 */

import { createClient } from '@supabase/supabase-js'
import {
  fetchSleeperWeeklyProjections,
  fetchSleeperPlayers,
  fetchSleeperState,
  type NormalizedSleeperWeeklyProjection,
  type NormalizedSleeperPlayer,
} from '@/lib/research/sources/sleeper'
import type { WeeklyProjection, ScoringFormat, Position, WeeklyStatus } from '@/lib/players/types'

// Supabase client with service role for writes
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials for service role')
  }
  return createClient(url, serviceKey)
}

interface WeeklyProjectionRow {
  id: string
  player_cache_id: string
  player_name: string
  season: number
  week: number
  source_projections: Record<string, {
    points: number
    passing_yds?: number
    rushing_yds?: number
    receiving_yds?: number
    touchdowns?: number
    receptions?: number
  }>
  consensus_points: number | null
  consensus_floor: number | null
  consensus_ceiling: number | null
  opponent: string | null
  is_home: boolean | null
  game_time: string | null
  status: string
  position_rank: number | null
  scoring_format: string
  fetched_at: string
}

interface PlayerCacheRow {
  id: string
  name: string
  team: string | null
  position: string
  bye_week: number | null
}

/**
 * Fetch weekly projections from all sources and compute consensus.
 * Returns normalized WeeklyProjection objects ready for caching.
 */
export async function fetchWeeklyProjections(
  week: number,
  scoringFormat: ScoringFormat = 'ppr',
  season?: number
): Promise<WeeklyProjection[]> {
  // Get current season from Sleeper state if not provided
  const state = await fetchSleeperState()
  const currentSeason = season || parseInt(state.season)

  // Fetch projections and player data in parallel
  const [sleeperProjections, sleeperPlayers] = await Promise.all([
    fetchSleeperWeeklyProjections(week, String(currentSeason)),
    fetchSleeperPlayers(),
  ])

  // Build player lookup by Sleeper ID
  const playerMap = new Map<string, NormalizedSleeperPlayer>()
  for (const p of sleeperPlayers) {
    playerMap.set(p.sleeperId, p)
  }

  // Convert Sleeper projections to WeeklyProjection format
  const projections: WeeklyProjection[] = []

  for (const proj of sleeperProjections) {
    const player = playerMap.get(proj.sleeperId)
    if (!player) continue

    // Get points based on scoring format
    const points = getPointsForFormat(proj.points, scoringFormat)
    if (!points || points <= 0) continue

    // Determine weekly status
    const status = determineWeeklyStatus(player, week)

    projections.push({
      playerId: proj.sleeperId,
      playerName: player.name,
      season: currentSeason,
      week,
      position: player.position,
      team: player.team || 'FA',
      sourceProjections: {
        sleeper: {
          points,
          passingYards: proj.passingYards,
          passingTDs: proj.passingTDs,
          rushingYards: proj.rushingYards,
          rushingTDs: proj.rushingTDs,
          receivingYards: proj.receivingYards,
          receivingTDs: proj.receivingTDs,
          receptions: proj.receptions,
        },
      },
      consensusPoints: points, // Single source for now, will expand
      status,
      scoringFormat,
    })
  }

  // Sort by consensus points descending
  projections.sort((a, b) => b.consensusPoints - a.consensusPoints)

  // Calculate position ranks
  const positionRanks: Record<Position, number> = {
    QB: 0,
    RB: 0,
    WR: 0,
    TE: 0,
    K: 0,
    DEF: 0,
  }

  for (const proj of projections) {
    positionRanks[proj.position]++
    proj.positionRank = positionRanks[proj.position]
  }

  return projections
}

/**
 * Get points value based on scoring format.
 */
function getPointsForFormat(
  points: { ppr?: number; halfPpr?: number; standard?: number },
  format: ScoringFormat
): number | undefined {
  switch (format) {
    case 'ppr':
      return points.ppr
    case 'half-ppr':
      return points.halfPpr
    case 'standard':
      return points.standard
    default:
      return points.ppr
  }
}

/**
 * Determine weekly status based on player data.
 */
function determineWeeklyStatus(
  player: NormalizedSleeperPlayer,
  week: number
): WeeklyStatus {
  // Check injury status first
  if (player.injuryStatus) {
    const status = player.injuryStatus.toLowerCase()
    if (status === 'out' || status === 'ir') return 'out'
    if (status === 'doubtful') return 'doubtful'
    if (status === 'questionable') return 'questionable'
    if (status === 'probable') return 'probable'
  }

  // Note: bye week logic would need team schedule data
  // For now, mark as active if no injury status
  return 'active'
}

/**
 * Cache weekly projections to Supabase.
 * Upserts projections to avoid duplicates.
 */
export async function cacheWeeklyProjections(
  projections: WeeklyProjection[]
): Promise<{ upserted: number; errors: string[] }> {
  const supabase = getServiceClient()
  const errors: string[] = []
  let upserted = 0

  // First, get player cache IDs by name
  const playerNames = [...new Set(projections.map((p) => p.playerName))]
  const { data: playerCache, error: cacheError } = await supabase
    .from('players_cache')
    .select('id, name, team, position')
    .in('name', playerNames)

  if (cacheError) {
    return { upserted: 0, errors: [`Failed to fetch player cache: ${cacheError.message}`] }
  }

  // Build lookup by name
  const cacheMap = new Map<string, PlayerCacheRow>()
  for (const p of (playerCache || []) as PlayerCacheRow[]) {
    cacheMap.set(p.name, p)
  }

  // Prepare rows for upsert
  const rows: Array<{
    player_cache_id: string
    player_name: string
    season: number
    week: number
    source_projections: Record<string, unknown>
    consensus_points: number
    consensus_floor: number | null
    consensus_ceiling: number | null
    opponent: string | null
    is_home: boolean | null
    game_time: string | null
    status: string
    position_rank: number | null
    scoring_format: string
    fetched_at: string
  }> = []

  for (const proj of projections) {
    const cached = cacheMap.get(proj.playerName)
    if (!cached) {
      // Player not in cache, skip (they should be added during full refresh)
      continue
    }

    rows.push({
      player_cache_id: cached.id,
      player_name: proj.playerName,
      season: proj.season,
      week: proj.week,
      source_projections: proj.sourceProjections,
      consensus_points: proj.consensusPoints,
      consensus_floor: proj.consensusFloor || null,
      consensus_ceiling: proj.consensusCeiling || null,
      opponent: proj.opponent || null,
      is_home: proj.isHome ?? null,
      game_time: proj.gameTime || null,
      status: proj.status,
      position_rank: proj.positionRank || null,
      scoring_format: proj.scoringFormat.replace('-', '_'), // half-ppr -> half_ppr
      fetched_at: new Date().toISOString(),
    })
  }

  // Batch upsert (Supabase supports up to 1000 rows per upsert)
  const BATCH_SIZE = 500
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('weekly_projections')
      .upsert(batch, {
        onConflict: 'player_cache_id,season,week,scoring_format',
      })

    if (error) {
      errors.push(`Batch ${i / BATCH_SIZE + 1} failed: ${error.message}`)
    } else {
      upserted += batch.length
    }
  }

  return { upserted, errors }
}

/**
 * Read cached weekly projections from Supabase.
 */
export async function readWeeklyProjections(
  week: number,
  options: {
    season?: number
    scoringFormat?: ScoringFormat
    position?: Position
    limit?: number
    minPoints?: number
  } = {}
): Promise<WeeklyProjection[]> {
  const supabase = getServiceClient()

  const season = options.season || new Date().getFullYear()
  const scoringFormat = options.scoringFormat || 'ppr'
  const limit = options.limit || 500

  let query = supabase
    .from('weekly_projections')
    .select(`
      *,
      players_cache!inner (
        id,
        name,
        team,
        position
      )
    `)
    .eq('season', season)
    .eq('week', week)
    .eq('scoring_format', scoringFormat.replace('-', '_'))
    .order('consensus_points', { ascending: false })
    .limit(limit)

  if (options.minPoints) {
    query = query.gte('consensus_points', options.minPoints)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to read weekly projections: ${error.message}`)
  }

  // Transform to WeeklyProjection type
  return (data || []).map((row: WeeklyProjectionRow & { players_cache: PlayerCacheRow }) => ({
    playerId: row.player_cache_id,
    playerName: row.player_name,
    season: row.season,
    week: row.week,
    position: row.players_cache.position as Position,
    team: row.players_cache.team || 'FA',
    sourceProjections: row.source_projections as Record<string, WeeklyProjection['sourceProjections'][string]>,
    consensusPoints: row.consensus_points || 0,
    consensusFloor: row.consensus_floor || undefined,
    consensusCeiling: row.consensus_ceiling || undefined,
    positionRank: row.position_rank || undefined,
    status: row.status as WeeklyStatus,
    opponent: row.opponent || undefined,
    isHome: row.is_home ?? undefined,
    gameTime: row.game_time || undefined,
    scoringFormat: row.scoring_format.replace('_', '-') as ScoringFormat,
  }))
}

/**
 * Get current NFL week from Sleeper state.
 */
export async function getCurrentWeek(): Promise<{ season: number; week: number }> {
  const state = await fetchSleeperState()
  return {
    season: parseInt(state.season),
    week: state.week,
  }
}

/**
 * Check if weekly projections are stale (older than TTL).
 */
export async function isWeeklyProjectionsStale(
  week: number,
  season: number,
  ttlHours: number = 24
): Promise<boolean> {
  const supabase = getServiceClient()

  const { data } = await supabase
    .from('weekly_projections')
    .select('fetched_at')
    .eq('season', season)
    .eq('week', week)
    .order('fetched_at', { ascending: false })
    .limit(1)
    .single()

  if (!data) return true // No data = stale

  const fetchedAt = new Date(data.fetched_at)
  const ageHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60)

  return ageHours > ttlHours
}
