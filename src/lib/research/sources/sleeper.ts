/**
 * Sleeper API Adapter
 *
 * Free REST API (no auth needed) for player metadata, ADP, projections, and trending.
 * Docs: https://docs.sleeper.com
 *
 * Endpoints used:
 * - GET https://api.sleeper.app/v1/players/nfl — full player database (~10k players)
 * - GET https://api.sleeper.app/projections/nfl/2025?season_type=regular — season projections
 * - GET https://api.sleeper.app/v1/players/nfl/trending/add — trending adds (last 24h)
 * - GET https://api.sleeper.app/v1/players/nfl/trending/drop — trending drops (last 24h)
 *
 * ADP comes from the state endpoint + player data (draft_adp fields).
 */

import type { Position } from '@/lib/players/types'

const SLEEPER_BASE = 'https://api.sleeper.app'

// Sleeper returns a massive object keyed by player_id
interface SleeperPlayer {
  player_id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  team: string | null
  position: string | null
  fantasy_positions: string[] | null
  status: string | null // Active, Injured Reserve, etc.
  injury_status: string | null // Questionable, Out, Doubtful, IR
  injury_body_part: string | null
  injury_notes: string | null
  age: number | null
  years_exp: number | null
  number: number | null
  depth_chart_order: number | null
  search_rank: number | null
  // ADP fields (when available)
  adp_ppr?: number
  adp_half_ppr?: number
  adp_std?: number
  adp_dynasty?: number
  adp_2qb?: number
}

interface SleeperProjection {
  player_id: string
  stats: {
    pts_ppr?: number
    pts_half_ppr?: number
    pts_std?: number
    pass_yd?: number
    pass_td?: number
    rush_yd?: number
    rush_td?: number
    rec_yd?: number
    rec_td?: number
    rec?: number
    fum_lost?: number
    pass_int?: number
    // Kicker stats
    fgm?: number
    xpm?: number
    // DST stats
    pts_allow?: number
    sack?: number
    int?: number
    fum_rec?: number
    def_td?: number
  }
  // Sleeper includes sport/season metadata
  sport?: string
  season?: string
  season_type?: string
  week?: number
}

interface SleeperTrendingPlayer {
  player_id: string
  count: number // number of adds/drops
}

interface SleeperState {
  season: string
  season_type: string
  week: number
  leg: number
  league_season: string
}

export interface NormalizedSleeperPlayer {
  sleeperId: string
  name: string
  team: string | null
  position: Position
  injuryStatus: string | null
  age: number | null
  yearsExp: number | null
  adp: {
    ppr?: number
    halfPpr?: number
    standard?: number
  }
}

export interface NormalizedSleeperProjection {
  sleeperId: string
  points: {
    ppr?: number
    halfPpr?: number
    standard?: number
  }
  passingYards?: number
  passingTDs?: number
  rushingYards?: number
  rushingTDs?: number
  receivingYards?: number
  receivingTDs?: number
  receptions?: number
}

export interface NormalizedSleeperWeeklyProjection extends NormalizedSleeperProjection {
  week: number
  season: string
  opponent?: string
}

export interface NormalizedSleeperTrending {
  sleeperId: string
  count: number
  direction: 'add' | 'drop'
}

const VALID_POSITIONS = new Set<string>(['QB', 'RB', 'WR', 'TE', 'K', 'DEF'])

function mapPosition(pos: string | null): Position | null {
  if (!pos) return null
  const upper = pos.toUpperCase()
  if (upper === 'DST' || upper === 'DEF') return 'DEF'
  if (VALID_POSITIONS.has(upper)) return upper as Position
  return null
}

function isRelevantPlayer(p: SleeperPlayer): boolean {
  // Only NFL offensive/K/DEF players on active rosters
  if (!p.full_name && !p.first_name) return false
  if (!p.position) return false
  const pos = mapPosition(p.position)
  if (!pos) return false
  // Filter out players without teams (free agents) unless they have search_rank
  // This keeps relevant players who might be between teams
  if (!p.team && (!p.search_rank || p.search_rank > 9999)) return false
  return true
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    next: { revalidate: 3600 }, // Cache for 1 hour in Next.js
  })
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${res.statusText} for ${url}`)
  }
  return res.json() as Promise<T>
}

/**
 * Get current NFL season info from Sleeper
 */
export async function fetchSleeperState(): Promise<SleeperState> {
  return fetchJSON<SleeperState>(`${SLEEPER_BASE}/v1/state/nfl`)
}

/**
 * Fetch all NFL players from Sleeper (~10k players, ~15MB response).
 * Returns only fantasy-relevant positions (QB, RB, WR, TE, K, DEF).
 * This is the foundational player list that other sources map onto.
 */
export async function fetchSleeperPlayers(): Promise<NormalizedSleeperPlayer[]> {
  const raw = await fetchJSON<Record<string, SleeperPlayer>>(
    `${SLEEPER_BASE}/v1/players/nfl`
  )

  const players: NormalizedSleeperPlayer[] = []

  for (const [id, p] of Object.entries(raw)) {
    if (!isRelevantPlayer(p)) continue
    const position = mapPosition(p.position)
    if (!position) continue

    const name = p.full_name || `${p.first_name || ''} ${p.last_name || ''}`.trim()
    if (!name) continue

    players.push({
      sleeperId: id,
      name,
      team: p.team || null,
      position,
      injuryStatus: p.injury_status || null,
      age: p.age,
      yearsExp: p.years_exp,
      adp: {
        ppr: p.adp_ppr ?? undefined,
        halfPpr: p.adp_half_ppr ?? undefined,
        standard: p.adp_std ?? undefined,
      },
    })
  }

  // Sort by search_rank (lower = more relevant) for consistent ordering
  return players
}

/**
 * Fetch season projections for all players.
 * Returns projected fantasy points + stat breakdowns.
 */
export async function fetchSleeperProjections(
  season?: string
): Promise<NormalizedSleeperProjection[]> {
  // Get current season if not provided
  const currentSeason = season || (await fetchSleeperState()).season

  const raw = await fetchJSON<SleeperProjection[]>(
    `${SLEEPER_BASE}/projections/nfl/${currentSeason}?season_type=regular`
  )

  const projections: NormalizedSleeperProjection[] = []

  for (const proj of raw) {
    if (!proj.stats) continue
    const s = proj.stats

    // Skip if no meaningful projection
    const hasPPR = s.pts_ppr !== undefined && s.pts_ppr > 0
    const hasHalf = s.pts_half_ppr !== undefined && s.pts_half_ppr > 0
    const hasStd = s.pts_std !== undefined && s.pts_std > 0
    if (!hasPPR && !hasHalf && !hasStd) continue

    projections.push({
      sleeperId: proj.player_id,
      points: {
        ppr: s.pts_ppr,
        halfPpr: s.pts_half_ppr,
        standard: s.pts_std,
      },
      passingYards: s.pass_yd,
      passingTDs: s.pass_td,
      rushingYards: s.rush_yd,
      rushingTDs: s.rush_td,
      receivingYards: s.rec_yd,
      receivingTDs: s.rec_td,
      receptions: s.rec,
    })
  }

  return projections
}

/**
 * Fetch weekly projections for a specific week.
 * Returns projected fantasy points + stat breakdowns for that week only.
 * This is the key endpoint for in-season Start/Sit recommendations.
 *
 * Endpoint: GET /projections/nfl/{season}/{week}?season_type=regular
 */
export async function fetchSleeperWeeklyProjections(
  week: number,
  season?: string
): Promise<NormalizedSleeperWeeklyProjection[]> {
  // Get current season if not provided
  const currentSeason = season || (await fetchSleeperState()).season

  const raw = await fetchJSON<SleeperProjection[]>(
    `${SLEEPER_BASE}/projections/nfl/${currentSeason}/${week}?season_type=regular`
  )

  const projections: NormalizedSleeperWeeklyProjection[] = []

  for (const proj of raw) {
    if (!proj.stats) continue
    const s = proj.stats

    // Skip if no meaningful projection
    const hasPPR = s.pts_ppr !== undefined && s.pts_ppr > 0
    const hasHalf = s.pts_half_ppr !== undefined && s.pts_half_ppr > 0
    const hasStd = s.pts_std !== undefined && s.pts_std > 0
    if (!hasPPR && !hasHalf && !hasStd) continue

    projections.push({
      sleeperId: proj.player_id,
      week,
      season: currentSeason,
      points: {
        ppr: s.pts_ppr,
        halfPpr: s.pts_half_ppr,
        standard: s.pts_std,
      },
      passingYards: s.pass_yd,
      passingTDs: s.pass_td,
      rushingYards: s.rush_yd,
      rushingTDs: s.rush_td,
      receivingYards: s.rec_yd,
      receivingTDs: s.rec_td,
      receptions: s.rec,
    })
  }

  return projections
}

/**
 * Fetch weekly projections for multiple weeks at once.
 * Useful for building out season projections or looking at upcoming schedule.
 */
export async function fetchSleeperWeeklyProjectionsRange(
  startWeek: number,
  endWeek: number,
  season?: string
): Promise<Map<number, NormalizedSleeperWeeklyProjection[]>> {
  const currentSeason = season || (await fetchSleeperState()).season

  // Fetch all weeks in parallel
  const weekNumbers = Array.from(
    { length: endWeek - startWeek + 1 },
    (_, i) => startWeek + i
  )

  const results = await Promise.all(
    weekNumbers.map((week) => fetchSleeperWeeklyProjections(week, currentSeason))
  )

  const weeklyMap = new Map<number, NormalizedSleeperWeeklyProjection[]>()
  weekNumbers.forEach((week, index) => {
    weeklyMap.set(week, results[index])
  })

  return weeklyMap
}

/**
 * Fetch trending player adds (last 24h).
 * Shows which players are being added most across Sleeper leagues.
 */
export async function fetchSleeperTrendingAdds(
  limit: number = 50
): Promise<NormalizedSleeperTrending[]> {
  const raw = await fetchJSON<SleeperTrendingPlayer[]>(
    `${SLEEPER_BASE}/v1/players/nfl/trending/add?lookback_hours=24&limit=${limit}`
  )

  return raw.map((p) => ({
    sleeperId: p.player_id,
    count: p.count,
    direction: 'add' as const,
  }))
}

/**
 * Fetch trending player drops (last 24h).
 * Shows which players are being dropped most across Sleeper leagues.
 */
export async function fetchSleeperTrendingDrops(
  limit: number = 50
): Promise<NormalizedSleeperTrending[]> {
  const raw = await fetchJSON<SleeperTrendingPlayer[]>(
    `${SLEEPER_BASE}/v1/players/nfl/trending/drop?lookback_hours=24&limit=${limit}`
  )

  return raw.map((p) => ({
    sleeperId: p.player_id,
    count: p.count,
    direction: 'drop' as const,
  }))
}

/**
 * Fetch all Sleeper data in one call — players + projections + trending.
 * This is the main entry point for the research pipeline.
 */
export async function fetchAllSleeperData(season?: string) {
  const [players, projections, trendingAdds, trendingDrops] = await Promise.all([
    fetchSleeperPlayers(),
    fetchSleeperProjections(season),
    fetchSleeperTrendingAdds(),
    fetchSleeperTrendingDrops(),
  ])

  // Build projection lookup by sleeper ID
  const projectionMap = new Map<string, NormalizedSleeperProjection>()
  for (const proj of projections) {
    projectionMap.set(proj.sleeperId, proj)
  }

  // Build trending lookup by sleeper ID
  const trendingMap = new Map<string, NormalizedSleeperTrending>()
  for (const t of [...trendingAdds, ...trendingDrops]) {
    trendingMap.set(t.sleeperId, t)
  }

  return {
    players,
    projections,
    projectionMap,
    trendingAdds,
    trendingDrops,
    trendingMap,
    fetchedAt: new Date().toISOString(),
  }
}
