/**
 * ESPN Fantasy Football API Adapter
 *
 * Unofficial ESPN API for rankings, projections, auction values, and ADP.
 * No auth needed for public data endpoints.
 *
 * Endpoints used:
 * - GET https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leaguedefaults/3
 *     → Default auction values, rankings, projections
 * - GET https://fantasy.espn.com/apis/v3/games/ffl/seasons/{year}/segments/0/leaguedefaults/1
 *     → Player rankings and ADP
 * - GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams
 *     → Team metadata (bye weeks)
 *
 * ESPN position IDs: 1=QB, 2=RB, 3=WR, 4=TE, 5=K, 16=DST
 * ESPN stat categories vary by scoring type
 */

import type { Position, ScoringFormat } from '@/lib/players/types'

const ESPN_FANTASY_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl'
const ESPN_SITE_BASE = 'https://site.api.espn.com/apis/site/v2/sports/football/nfl'

// ESPN position ID mapping
const ESPN_POSITION_MAP: Record<number, Position> = {
  1: 'QB',
  2: 'RB',
  3: 'WR',
  4: 'TE',
  5: 'K',
  16: 'DEF',
}

// ESPN scoring type IDs
const ESPN_SCORING_MAP: Record<ScoringFormat, number> = {
  standard: 0,
  'half-ppr': 1,
  ppr: 2,
}

interface ESPNPlayer {
  id: number
  fullName: string
  defaultPositionId: number
  proTeamId: number
  injured: boolean
  injuryStatus?: string
  ownership?: {
    auctionValueAverage: number
    averageDraftPosition: number
    percentOwned: number
  }
  // Present in roster endpoint
  draftRanksByRankType?: Record<
    string,
    {
      rank: number
      auctionValue: number
    }
  >
  stats?: Array<{
    id: string
    seasonId: number
    statSplitTypeId: number
    stats: Record<string, number>
    appliedTotal?: number
  }>
}

interface ESPNPlayerEntry {
  id: number
  player: ESPNPlayer
  ratings?: Record<
    string,
    {
      totalRating: number
      totalRanking: number
      positionalRanking: number
    }
  >
  // Stat projections keyed by statSplitTypeId
  playerPoolEntry?: {
    player: ESPNPlayer & {
      stats?: Array<{
        id: string
        seasonId: number
        statSplitTypeId: number // 0 = actual, 1 = projected
        stats: Record<string, number>
        appliedTotal?: number
      }>
    }
  }
}

// ESPN proTeamId → NFL team abbreviation
const ESPN_TEAM_MAP: Record<number, string> = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE',
  6: 'DAL', 7: 'DEN', 8: 'DET', 9: 'GB', 10: 'TEN',
  11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA',
  16: 'MIN', 17: 'NE', 18: 'NO', 19: 'NYG', 20: 'NYJ',
  21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF',
  26: 'SEA', 27: 'TB', 28: 'WAS', 29: 'CAR', 30: 'JAX',
  33: 'BAL', 34: 'HOU',
}

// ESPN stat IDs for key categories
const ESPN_STAT_IDS = {
  passingYards: '3',
  passingTDs: '4',
  passingINTs: '20',
  rushingYards: '24',
  rushingTDs: '25',
  receptions: '53',
  receivingYards: '42',
  receivingTDs: '43',
  fumblesLost: '72',
} as const

export interface NormalizedESPNPlayer {
  espnId: number
  name: string
  team: string | null
  position: Position
  injuryStatus: string | null
  rank: number | null
  auctionValue: number | null
  adp: number | null
  percentOwned: number | null
  projectedPoints: number | null
  projections: {
    passingYards?: number
    passingTDs?: number
    rushingYards?: number
    rushingTDs?: number
    receivingYards?: number
    receivingTDs?: number
    receptions?: number
  }
}

async function fetchJSON<T>(url: string, params?: Record<string, string>): Promise<T> {
  const urlObj = new URL(url)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      urlObj.searchParams.set(k, v)
    }
  }

  const res = await fetch(urlObj.toString(), {
    headers: {
      'Accept': 'application/json',
      'x-fantasy-filter': JSON.stringify({
        players: {
          filterSlotIds: { value: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24] },
          filterStatsForTopScoringPeriodIds: {
            value: 5,
            additionalValue: ['002025', '102025', '002024'],
          },
          sortPercOwned: { sortPriority: 2, sortAsc: false },
          limit: 500,
          offset: 0,
          filterRanksForScoringPeriodIds: { value: [2025] },
          filterRanksForRankTypes: { value: ['PPR', 'STANDARD'] },
        },
      }),
    },
    next: { revalidate: 3600 },
  })
  if (!res.ok) {
    throw new Error(`ESPN API error: ${res.status} ${res.statusText} for ${urlObj.toString()}`)
  }
  return res.json() as Promise<T>
}

/**
 * Fetch ESPN player rankings, auction values, and ADP.
 * Uses the league defaults endpoint which returns public fantasy data.
 */
export async function fetchESPNPlayers(
  season: number = new Date().getFullYear(),
  scoringFormat: ScoringFormat = 'ppr'
): Promise<NormalizedESPNPlayer[]> {
  const scoringId = ESPN_SCORING_MAP[scoringFormat]

  // Fetch from the kona_player_info view which includes ownership + rankings
  const url = `${ESPN_FANTASY_BASE}/seasons/${season}/segments/0/leaguedefaults/3`

  const data = await fetchJSON<{ players?: ESPNPlayerEntry[] }>(url, {
    scoringPeriodId: '0',
    view: 'kona_player_info',
  })

  if (!data.players) return []

  const players: NormalizedESPNPlayer[] = []

  for (const entry of data.players) {
    const p = entry.playerPoolEntry?.player || entry.player
    if (!p) continue

    const position = ESPN_POSITION_MAP[p.defaultPositionId]
    if (!position) continue

    const team = ESPN_TEAM_MAP[p.proTeamId] || null

    // Extract rank from ratings (keyed by scoring period)
    let rank: number | null = null
    if (entry.ratings) {
      const ratingKey = Object.keys(entry.ratings)[0]
      if (ratingKey) {
        rank = entry.ratings[ratingKey].totalRanking ?? null
      }
    }

    // Extract projected stats
    const projections: NormalizedESPNPlayer['projections'] = {}
    let projectedPoints: number | null = null

    if (p.stats) {
      // Find the projected stats split (statSplitTypeId === 1)
      const projected = p.stats.find(
        (s) => s.statSplitTypeId === 1 && s.seasonId === season
      )
      if (projected) {
        projectedPoints = projected.appliedTotal ?? null
        const stats = projected.stats
        projections.passingYards = stats[ESPN_STAT_IDS.passingYards]
        projections.passingTDs = stats[ESPN_STAT_IDS.passingTDs]
        projections.rushingYards = stats[ESPN_STAT_IDS.rushingYards]
        projections.rushingTDs = stats[ESPN_STAT_IDS.rushingTDs]
        projections.receivingYards = stats[ESPN_STAT_IDS.receivingYards]
        projections.receivingTDs = stats[ESPN_STAT_IDS.receivingTDs]
        projections.receptions = stats[ESPN_STAT_IDS.receptions]
      }
    }

    players.push({
      espnId: p.id,
      name: p.fullName,
      team,
      position,
      injuryStatus: p.injuryStatus || null,
      rank,
      auctionValue: p.ownership?.auctionValueAverage ?? null,
      adp: p.ownership?.averageDraftPosition ?? null,
      percentOwned: p.ownership?.percentOwned ?? null,
      projectedPoints,
      projections,
    })
  }

  // Sort by rank (nulls last)
  players.sort((a, b) => {
    if (a.rank === null && b.rank === null) return 0
    if (a.rank === null) return 1
    if (b.rank === null) return -1
    return a.rank - b.rank
  })

  return players
}

/**
 * Fetch ESPN rankings only (lighter call).
 */
export async function fetchESPNRankings(
  season?: number,
  scoringFormat?: ScoringFormat
): Promise<NormalizedESPNPlayer[]> {
  return fetchESPNPlayers(season, scoringFormat)
}

/**
 * Fetch ESPN projections (same endpoint, just filtering output).
 */
export async function fetchESPNProjections(
  season?: number,
  scoringFormat?: ScoringFormat
): Promise<NormalizedESPNPlayer[]> {
  const players = await fetchESPNPlayers(season, scoringFormat)
  return players.filter((p) => p.projectedPoints !== null && p.projectedPoints > 0)
}

/**
 * Fetch ESPN auction values (same endpoint, filtered).
 */
export async function fetchESPNAuctionValues(
  season?: number,
  scoringFormat?: ScoringFormat
): Promise<NormalizedESPNPlayer[]> {
  const players = await fetchESPNPlayers(season, scoringFormat)
  return players.filter((p) => p.auctionValue !== null && p.auctionValue > 0)
}

/**
 * Fetch ESPN ADP (same endpoint, filtered).
 */
export async function fetchESPNADP(
  season?: number,
  scoringFormat?: ScoringFormat
): Promise<NormalizedESPNPlayer[]> {
  const players = await fetchESPNPlayers(season, scoringFormat)
  return players.filter((p) => p.adp !== null)
}

/**
 * Fetch all ESPN data in one call.
 * Since all data comes from a single endpoint, this is efficient.
 */
export async function fetchAllESPNData(
  season?: number,
  scoringFormat?: ScoringFormat
) {
  const players = await fetchESPNPlayers(season, scoringFormat)

  return {
    players,
    fetchedAt: new Date().toISOString(),
  }
}
