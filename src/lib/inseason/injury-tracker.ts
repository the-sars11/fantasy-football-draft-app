/**
 * Injury Tracker Service
 *
 * Tracks player injury status changes over time.
 * Enables injury timeline display, alerts, and severity-based recommendations.
 */

import { createClient } from '@supabase/supabase-js'
import {
  fetchSleeperPlayers,
  type NormalizedSleeperPlayer,
} from '@/lib/research/sources/sleeper'
import type {
  InjuryUpdate,
  InjuryStatus,
  InjurySeverity,
  PracticeStatus,
} from '@/lib/players/types'

// Supabase client with service role for writes
function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase credentials for service role')
  }
  return createClient(url, serviceKey)
}

interface InjuryUpdateRow {
  id: string
  player_cache_id: string
  player_name: string
  season: number
  previous_status: string | null
  new_status: string
  injury_type: string | null
  injury_location: string | null
  severity: number | null
  expected_return_week: number | null
  expected_return_date: string | null
  source: string
  practice_status: string | null
  game_designation: string | null
  week: number | null
  source_notes: string | null
  reported_at: string
}

interface PlayerCacheRow {
  id: string
  name: string
  injury_status: string | null
}

/**
 * Map raw injury status string to normalized InjuryStatus type.
 */
function normalizeInjuryStatus(status: string | null): InjuryStatus {
  if (!status) return 'healthy'

  const lower = status.toLowerCase()
  if (lower === 'out' || lower === 'o') return 'out'
  if (lower === 'doubtful' || lower === 'd') return 'doubtful'
  if (lower === 'questionable' || lower === 'q') return 'questionable'
  if (lower === 'ir' || lower === 'injured reserve') return 'ir'
  if (lower === 'pup' || lower === 'physically unable') return 'pup'
  if (lower === 'suspended' || lower === 'sus') return 'suspended'

  return 'healthy'
}

/**
 * Estimate injury severity based on status and injury type.
 * 1 = minor (day-to-day), 2 = moderate (week-to-week),
 * 3 = significant (multi-week), 4 = severe (season-ending)
 */
function estimateSeverity(
  status: InjuryStatus,
  injuryType?: string
): InjurySeverity {
  // IR/PUP/Suspended are typically severe
  if (status === 'ir' || status === 'pup' || status === 'suspended') {
    return 4
  }

  // Out is typically significant
  if (status === 'out') {
    return 3
  }

  // Doubtful is moderate
  if (status === 'doubtful') {
    return 2
  }

  // Questionable/Probable is minor
  return 1
}

/**
 * Check for injury status changes and record updates.
 * Compares current Sleeper data against cached injury statuses.
 */
export async function checkInjuryUpdates(
  season: number,
  week?: number
): Promise<{ updates: InjuryUpdate[]; errors: string[] }> {
  const supabase = getServiceClient()
  const errors: string[] = []
  const updates: InjuryUpdate[] = []

  // Fetch current player data from Sleeper
  const sleeperPlayers = await fetchSleeperPlayers()

  // Get current cached injury statuses
  const { data: cachedPlayers, error: cacheError } = await supabase
    .from('players_cache')
    .select('id, name, injury_status')

  if (cacheError) {
    return {
      updates: [],
      errors: [`Failed to fetch player cache: ${cacheError.message}`],
    }
  }

  // Build lookup by name
  const cacheMap = new Map<string, PlayerCacheRow>()
  for (const p of (cachedPlayers || []) as PlayerCacheRow[]) {
    cacheMap.set(p.name, p)
  }

  // Compare and detect changes
  for (const player of sleeperPlayers) {
    const cached = cacheMap.get(player.name)
    if (!cached) continue

    const previousStatus = normalizeInjuryStatus(cached.injury_status)
    const newStatus = normalizeInjuryStatus(player.injuryStatus)

    // Skip if no change
    if (previousStatus === newStatus) continue

    // Record the update
    const update: InjuryUpdate = {
      id: '', // Will be set by database
      playerId: cached.id,
      playerName: player.name,
      season,
      week,
      previousStatus,
      newStatus,
      severity: estimateSeverity(newStatus),
      source: 'sleeper',
      reportedAt: new Date().toISOString(),
    }

    updates.push(update)
  }

  // Store updates in database
  if (updates.length > 0) {
    const rows = updates.map((u) => ({
      player_cache_id: u.playerId,
      player_name: u.playerName,
      season: u.season,
      week: u.week,
      previous_status: u.previousStatus,
      new_status: u.newStatus,
      severity: u.severity,
      source: u.source,
      reported_at: u.reportedAt,
    }))

    const { error: insertError } = await supabase
      .from('injury_updates')
      .insert(rows)

    if (insertError) {
      errors.push(`Failed to insert injury updates: ${insertError.message}`)
    }

    // Update cached injury statuses in players_cache
    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('players_cache')
        .update({ injury_status: update.newStatus })
        .eq('id', update.playerId)

      if (updateError) {
        errors.push(`Failed to update player ${update.playerName}: ${updateError.message}`)
      }
    }
  }

  return { updates, errors }
}

/**
 * Get injury history for a specific player.
 */
export async function getPlayerInjuryHistory(
  playerCacheId: string,
  season?: number
): Promise<InjuryUpdate[]> {
  const supabase = getServiceClient()

  let query = supabase
    .from('injury_updates')
    .select('*')
    .eq('player_cache_id', playerCacheId)
    .order('reported_at', { ascending: false })

  if (season) {
    query = query.eq('season', season)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch injury history: ${error.message}`)
  }

  return (data || []).map((row: InjuryUpdateRow) => ({
    id: row.id,
    playerId: row.player_cache_id,
    playerName: row.player_name,
    season: row.season,
    week: row.week || undefined,
    previousStatus: (row.previous_status as InjuryStatus) || undefined,
    newStatus: row.new_status as InjuryStatus,
    injuryType: row.injury_type || undefined,
    injuryLocation: row.injury_location || undefined,
    severity: (row.severity as InjurySeverity) || undefined,
    expectedReturnWeek: row.expected_return_week || undefined,
    expectedReturnDate: row.expected_return_date || undefined,
    source: row.source,
    practiceStatus: (row.practice_status as PracticeStatus) || undefined,
    gameDesignation: row.game_designation || undefined,
    sourceNotes: row.source_notes || undefined,
    reportedAt: row.reported_at,
  }))
}

/**
 * Get all recent injury updates across all players.
 */
export async function getRecentInjuryUpdates(
  options: {
    season?: number
    week?: number
    limit?: number
    severityMin?: InjurySeverity
  } = {}
): Promise<InjuryUpdate[]> {
  const supabase = getServiceClient()
  const limit = options.limit || 50

  let query = supabase
    .from('injury_updates')
    .select('*')
    .order('reported_at', { ascending: false })
    .limit(limit)

  if (options.season) {
    query = query.eq('season', options.season)
  }

  if (options.week) {
    query = query.eq('week', options.week)
  }

  if (options.severityMin) {
    query = query.gte('severity', options.severityMin)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to fetch recent injuries: ${error.message}`)
  }

  return (data || []).map((row: InjuryUpdateRow) => ({
    id: row.id,
    playerId: row.player_cache_id,
    playerName: row.player_name,
    season: row.season,
    week: row.week || undefined,
    previousStatus: (row.previous_status as InjuryStatus) || undefined,
    newStatus: row.new_status as InjuryStatus,
    injuryType: row.injury_type || undefined,
    injuryLocation: row.injury_location || undefined,
    severity: (row.severity as InjurySeverity) || undefined,
    expectedReturnWeek: row.expected_return_week || undefined,
    expectedReturnDate: row.expected_return_date || undefined,
    source: row.source,
    practiceStatus: (row.practice_status as PracticeStatus) || undefined,
    gameDesignation: row.game_designation || undefined,
    sourceNotes: row.source_notes || undefined,
    reportedAt: row.reported_at,
  }))
}

/**
 * Get players with active injury concerns (not healthy).
 */
export async function getInjuredPlayers(
  season: number
): Promise<Array<{ playerName: string; playerId: string; status: InjuryStatus; severity?: InjurySeverity }>> {
  const supabase = getServiceClient()

  // Get most recent update per player
  const { data, error } = await supabase
    .from('injury_updates')
    .select('player_cache_id, player_name, new_status, severity')
    .eq('season', season)
    .neq('new_status', 'healthy')
    .order('reported_at', { ascending: false })

  if (error) {
    throw new Error(`Failed to fetch injured players: ${error.message}`)
  }

  // Dedupe by player (keep most recent)
  const playerMap = new Map<string, { playerName: string; playerId: string; status: InjuryStatus; severity?: InjurySeverity }>()
  for (const row of data || []) {
    if (!playerMap.has(row.player_cache_id)) {
      playerMap.set(row.player_cache_id, {
        playerId: row.player_cache_id,
        playerName: row.player_name,
        status: row.new_status as InjuryStatus,
        severity: (row.severity as InjurySeverity) || undefined,
      })
    }
  }

  return Array.from(playerMap.values())
}
