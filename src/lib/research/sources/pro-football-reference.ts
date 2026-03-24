/**
 * Pro Football Reference Historical Adapter (FF-221)
 *
 * Fetches historical player statistics from Pro-Football-Reference.com.
 * https://www.pro-football-reference.com/
 *
 * Data available (free, no auth):
 * - Season statistics by player
 * - Career totals
 * - Fantasy points by year
 * - Game logs
 *
 * Used for:
 * - Projection trend analysis (year-over-year changes)
 * - Career trajectory modeling
 * - Injury history context
 *
 * Rate limiting: 1 req/3sec (PFR is strict), aggressive caching (7 days for historical)
 * Constraint: Free public data only
 */

import type { Position } from '@/lib/players/types'
import type {
  SourceAdapter,
  SourceHistoricalData,
  SourceFetchResult,
  DataType,
} from '../intel/types'
import { validate2026Data } from '../intel/freshness'

const PFR_BASE = 'https://www.pro-football-reference.com'

// Rate limiting - PFR is strict about scraping (3 sec between requests)
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 3000 // 3 seconds between requests

// In-memory cache for historical data (TTL: 7 days - historical data doesn't change)
const historicalCache = new Map<string, { data: PFRPlayerStats[]; fetchedAt: number }>()
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

interface PFRPlayerStats {
  name: string
  playerId: string // PFR player ID (e.g., "MahoPa00")
  team: string | null
  position: string
  season: number
  age: number | null
  games: number
  gamesStarted: number
  stats: {
    // Passing
    passingAtt?: number
    passingCmp?: number
    passingYds?: number
    passingTD?: number
    passingInt?: number
    passingRate?: number
    // Rushing
    rushingAtt?: number
    rushingYds?: number
    rushingTD?: number
    rushingYPC?: number
    // Receiving
    targets?: number
    receptions?: number
    receivingYds?: number
    receivingTD?: number
    receivingYPR?: number
    // Fantasy
    fantasyPointsPPR?: number
    fantasyPointsStd?: number
    fantasyRank?: number
  }
}

interface PFRSeasonData {
  season: number
  players: PFRPlayerStats[]
  lastUpdated: string | null
}

/**
 * Rate-limited fetch with strict delay for PFR
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    )
  }

  lastRequestTime = Date.now()

  const res = await fetch(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; FantasyFootballDraftAdvisor/1.0; research)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) {
    throw new Error(`PFR error: ${res.status} ${res.statusText} for ${url}`)
  }

  return res
}

function mapPosition(pos: string): Position | null {
  const upper = pos.toUpperCase().trim()
  if (upper === 'DST' || upper === 'D/ST') return 'DEF'
  if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(upper)) return upper as Position
  return null
}

/**
 * Parse fantasy stats table from PFR HTML
 * PFR uses table structure with id="fantasy"
 */
function parseFantasyStatsTable(html: string, season: number): PFRPlayerStats[] {
  const players: PFRPlayerStats[] = []

  // Find the fantasy stats table
  const tableMatch = html.match(/<table[^>]*id="fantasy"[^>]*>([\s\S]*?)<\/table>/i) ||
                     html.match(/<table[^>]*id="fantasy_total"[^>]*>([\s\S]*?)<\/table>/i)

  if (!tableMatch) {
    // Try rushing/receiving combined tables
    const rushRecTable = html.match(/<table[^>]*id="rushing_and_receiving"[^>]*>([\s\S]*?)<\/table>/i)
    if (rushRecTable) {
      return parseRushingReceivingTable(rushRecTable[1], season)
    }
    return players
  }

  const tableHtml = tableMatch[1]

  // Parse header to get column indices
  const headerMatch = tableHtml.match(/<thead[^>]*>([\s\S]*?)<\/thead>/i)
  const columnMap = new Map<string, number>()

  if (headerMatch) {
    const headerCells = headerMatch[1].match(/<th[^>]*>([\s\S]*?)<\/th>/gi) || []
    headerCells.forEach((cell, index) => {
      const text = cell.replace(/<[^>]+>/g, '').trim().toLowerCase()
      columnMap.set(text, index)
    })
  }

  // Parse body rows
  const bodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
  if (!bodyMatch) return players

  const rows = bodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []

  for (const row of rows) {
    // Skip header rows
    if (row.includes('class="thead"') || row.includes('class="over_header"')) continue

    const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || []
    if (cells.length < 5) continue

    // Extract player link and name
    const playerLinkMatch = row.match(/<a[^>]*href="\/players\/[A-Z]\/([^"]+)\.htm"[^>]*>([^<]+)<\/a>/i)
    if (!playerLinkMatch) continue

    const playerId = playerLinkMatch[1]
    const name = playerLinkMatch[2].trim()

    // Extract team
    const teamMatch = row.match(/<td[^>]*data-stat="team"[^>]*>([^<]*)<\/td>/i)
    const team = teamMatch?.[1]?.trim().toUpperCase() || null

    // Extract position
    const posMatch = row.match(/<td[^>]*data-stat="(?:fantasy_)?pos"[^>]*>([^<]*)<\/td>/i)
    const posRaw = posMatch?.[1]?.trim() || ''
    const position = mapPosition(posRaw)
    if (!position) continue

    // Extract age
    const ageMatch = row.match(/<td[^>]*data-stat="age"[^>]*>([^<]*)<\/td>/i)
    const age = ageMatch ? parseInt(ageMatch[1]) || null : null

    // Extract games
    const gamesMatch = row.match(/<td[^>]*data-stat="g"[^>]*>([^<]*)<\/td>/i)
    const games = gamesMatch ? parseInt(gamesMatch[1]) || 0 : 0

    const gsMatch = row.match(/<td[^>]*data-stat="gs"[^>]*>([^<]*)<\/td>/i)
    const gamesStarted = gsMatch ? parseInt(gsMatch[1]) || 0 : 0

    // Extract stats based on data-stat attributes
    const extractStat = (statName: string): number | undefined => {
      const match = row.match(new RegExp(`<td[^>]*data-stat="${statName}"[^>]*>([^<]*)<\/td>`, 'i'))
      if (match) {
        const val = parseFloat(match[1])
        return isNaN(val) ? undefined : val
      }
      return undefined
    }

    players.push({
      name,
      playerId,
      team,
      position: posRaw || position,
      season,
      age,
      games,
      gamesStarted,
      stats: {
        // Passing
        passingAtt: extractStat('pass_att'),
        passingCmp: extractStat('pass_cmp'),
        passingYds: extractStat('pass_yds'),
        passingTD: extractStat('pass_td'),
        passingInt: extractStat('pass_int'),
        passingRate: extractStat('pass_rating'),
        // Rushing
        rushingAtt: extractStat('rush_att'),
        rushingYds: extractStat('rush_yds'),
        rushingTD: extractStat('rush_td'),
        rushingYPC: extractStat('rush_yds_per_att'),
        // Receiving
        targets: extractStat('targets'),
        receptions: extractStat('rec'),
        receivingYds: extractStat('rec_yds'),
        receivingTD: extractStat('rec_td'),
        receivingYPR: extractStat('rec_yds_per_rec'),
        // Fantasy
        fantasyPointsPPR: extractStat('fantasy_points_ppr'),
        fantasyPointsStd: extractStat('fantasy_points'),
        fantasyRank: extractStat('fantasy_rank_overall'),
      },
    })
  }

  return players
}

/**
 * Parse rushing/receiving combined table (alternative format)
 */
function parseRushingReceivingTable(tableHtml: string, season: number): PFRPlayerStats[] {
  const players: PFRPlayerStats[] = []

  const bodyMatch = tableHtml.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i)
  if (!bodyMatch) return players

  const rows = bodyMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) || []

  for (const row of rows) {
    if (row.includes('class="thead"')) continue

    const playerLinkMatch = row.match(/<a[^>]*href="\/players\/[A-Z]\/([^"]+)\.htm"[^>]*>([^<]+)<\/a>/i)
    if (!playerLinkMatch) continue

    const playerId = playerLinkMatch[1]
    const name = playerLinkMatch[2].trim()

    const teamMatch = row.match(/<td[^>]*data-stat="team"[^>]*>([^<]*)<\/td>/i)
    const team = teamMatch?.[1]?.trim().toUpperCase() || null

    const posMatch = row.match(/<td[^>]*data-stat="pos"[^>]*>([^<]*)<\/td>/i)
    const posRaw = posMatch?.[1]?.trim() || 'RB'
    const position = mapPosition(posRaw)
    if (!position) continue

    const ageMatch = row.match(/<td[^>]*data-stat="age"[^>]*>([^<]*)<\/td>/i)
    const age = ageMatch ? parseInt(ageMatch[1]) || null : null

    const gamesMatch = row.match(/<td[^>]*data-stat="g"[^>]*>([^<]*)<\/td>/i)
    const games = gamesMatch ? parseInt(gamesMatch[1]) || 0 : 0

    const gsMatch = row.match(/<td[^>]*data-stat="gs"[^>]*>([^<]*)<\/td>/i)
    const gamesStarted = gsMatch ? parseInt(gsMatch[1]) || 0 : 0

    const extractStat = (statName: string): number | undefined => {
      const match = row.match(new RegExp(`<td[^>]*data-stat="${statName}"[^>]*>([^<]*)<\/td>`, 'i'))
      if (match) {
        const val = parseFloat(match[1])
        return isNaN(val) ? undefined : val
      }
      return undefined
    }

    players.push({
      name,
      playerId,
      team,
      position: posRaw,
      season,
      age,
      games,
      gamesStarted,
      stats: {
        rushingAtt: extractStat('rush_att'),
        rushingYds: extractStat('rush_yds'),
        rushingTD: extractStat('rush_td'),
        rushingYPC: extractStat('rush_yds_per_att'),
        targets: extractStat('targets'),
        receptions: extractStat('rec'),
        receivingYds: extractStat('rec_yds'),
        receivingTD: extractStat('rec_td'),
        receivingYPR: extractStat('rec_yds_per_rec'),
      },
    })
  }

  return players
}

/**
 * Fetch season fantasy stats from PFR
 */
async function fetchPFRSeasonStats(season: number): Promise<PFRSeasonData> {
  const cacheKey = `pfr-${season}`

  // Check cache first
  const cached = historicalCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { season, players: cached.data, lastUpdated: null }
  }

  // PFR fantasy stats URL
  const url = `${PFR_BASE}/years/${season}/fantasy.htm`

  try {
    const res = await rateLimitedFetch(url)
    const html = await res.text()

    const players = parseFantasyStatsTable(html, season)

    // Cache the results
    historicalCache.set(cacheKey, {
      data: players,
      fetchedAt: Date.now(),
    })

    return {
      season,
      players,
      lastUpdated: new Date().toISOString(),
    }
  } catch (error) {
    // Return cached data if available
    if (cached) {
      console.warn(`PFR fetch failed for ${season}, using stale cache:`, error)
      return { season, players: cached.data, lastUpdated: null }
    }
    throw error
  }
}

/**
 * Fetch multi-year historical data for trend analysis
 */
async function fetchPFRHistoricalTrend(
  seasons: number[]
): Promise<Map<number, PFRPlayerStats[]>> {
  const results = new Map<number, PFRPlayerStats[]>()

  for (const season of seasons) {
    try {
      const data = await fetchPFRSeasonStats(season)
      results.set(season, data.players)
    } catch (error) {
      console.warn(`Failed to fetch PFR data for ${season}:`, error)
    }
  }

  return results
}

/**
 * Calculate year-over-year changes for a player
 */
function calculateYoYTrends(
  playerName: string,
  seasonData: Map<number, PFRPlayerStats[]>
): { seasons: number[]; fantasyPoints: number[]; trend: 'up' | 'down' | 'stable' } | null {
  const playerSeasons: Array<{ season: number; points: number }> = []

  for (const [season, players] of seasonData) {
    const player = players.find(
      (p) => p.name.toLowerCase() === playerName.toLowerCase()
    )
    if (player?.stats.fantasyPointsPPR) {
      playerSeasons.push({ season, points: player.stats.fantasyPointsPPR })
    }
  }

  if (playerSeasons.length < 2) return null

  // Sort by season
  playerSeasons.sort((a, b) => a.season - b.season)

  // Calculate trend
  const latestPoints = playerSeasons[playerSeasons.length - 1].points
  const previousPoints = playerSeasons[playerSeasons.length - 2].points
  const changePercent = ((latestPoints - previousPoints) / previousPoints) * 100

  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (changePercent > 10) trend = 'up'
  else if (changePercent < -10) trend = 'down'

  return {
    seasons: playerSeasons.map((s) => s.season),
    fantasyPoints: playerSeasons.map((s) => s.points),
    trend,
  }
}

// --- SourceAdapter Implementation ---

export const proFootballReferenceAdapter: SourceAdapter = {
  sourceKey: 'pro_football_reference',
  displayName: 'Pro Football Reference',
  dataTypes: ['historical'] as DataType[],

  async is2026DataAvailable(): Promise<{
    available: boolean
    confidence: number
    reason: string
    checkedAt: string
  }> {
    const checkedAt = new Date().toISOString()
    const currentYear = new Date().getFullYear()

    // PFR only has historical data (completed seasons)
    // 2026 data won't be available until after the 2026 season
    return {
      available: false, // Historical data - 2026 won't exist until season ends
      confidence: 1.0,
      reason: `PFR provides historical stats only. ${currentYear} in-season data may be partial.`,
      checkedAt,
    }
  },

  async getLastUpdatedDate(): Promise<Date | null> {
    // Historical data - use cache timestamp or current date for recent seasons
    return new Date()
  },

  async fetchHistorical(season: number): Promise<SourceFetchResult<SourceHistoricalData>> {
    const fetchedAt = new Date().toISOString()

    try {
      const data = await fetchPFRSeasonStats(season)

      // Convert to SourceHistoricalData format
      const historicalData: SourceHistoricalData[] = data.players.map((p) => ({
        playerName: p.name,
        season: p.season,
        games: p.games,
        stats: {
          ...(p.stats.passingYds !== undefined && { passing_yds: p.stats.passingYds }),
          ...(p.stats.passingTD !== undefined && { passing_td: p.stats.passingTD }),
          ...(p.stats.passingInt !== undefined && { passing_int: p.stats.passingInt }),
          ...(p.stats.rushingYds !== undefined && { rushing_yds: p.stats.rushingYds }),
          ...(p.stats.rushingTD !== undefined && { rushing_td: p.stats.rushingTD }),
          ...(p.stats.receivingYds !== undefined && { receiving_yds: p.stats.receivingYds }),
          ...(p.stats.receivingTD !== undefined && { receiving_td: p.stats.receivingTD }),
          ...(p.stats.receptions !== undefined && { receptions: p.stats.receptions }),
          ...(p.stats.fantasyPointsPPR !== undefined && { fantasy_ppr: p.stats.fantasyPointsPPR }),
          ...(p.stats.fantasyPointsStd !== undefined && { fantasy_std: p.stats.fantasyPointsStd }),
        },
      }))

      // Historical data validation - always marks as not 2026 (it's past data)
      const seasonValidation = validate2026Data(
        'pro_football_reference',
        fetchedAt,
        { season },
        {
          seasonLabel: `${season} NFL Season`,
          hasSeasonHeader: false, // Historical is never "current season"
        }
      )

      return {
        success: true,
        data: historicalData,
        source: 'pro_football_reference',
        dataType: 'historical',
        fetchedAt,
        is2026Data: false, // Historical data is by definition not current season
        seasonValidation: {
          method: 'content_check',
          confidence: 1.0,
          reason: `Historical ${season} season data`,
        },
        playerCount: historicalData.length,
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'pro_football_reference',
        dataType: 'historical',
        fetchedAt,
        is2026Data: false,
        seasonValidation: {
          method: 'content_check',
          confidence: 0,
          reason: `Fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
        playerCount: 0,
      }
    }
  },
}

// --- Standalone Functions (for direct use) ---

export interface NormalizedPFRPlayer {
  name: string
  playerId: string
  team: string | null
  position: Position
  season: number
  age: number | null
  games: number
  gamesStarted: number
  fantasyPointsPPR: number | null
  fantasyPointsStd: number | null
  passingYards: number | null
  passingTDs: number | null
  rushingYards: number | null
  rushingTDs: number | null
  receivingYards: number | null
  receivingTDs: number | null
  receptions: number | null
}

/**
 * Fetch PFR fantasy stats for a season (standalone function)
 */
export async function fetchPFRFantasyStats(
  season: number = new Date().getFullYear() - 1
): Promise<NormalizedPFRPlayer[]> {
  const data = await fetchPFRSeasonStats(season)

  return data.players
    .filter((p) => mapPosition(p.position) !== null)
    .map((p) => ({
      name: p.name,
      playerId: p.playerId,
      team: p.team,
      position: mapPosition(p.position)!,
      season: p.season,
      age: p.age,
      games: p.games,
      gamesStarted: p.gamesStarted,
      fantasyPointsPPR: p.stats.fantasyPointsPPR ?? null,
      fantasyPointsStd: p.stats.fantasyPointsStd ?? null,
      passingYards: p.stats.passingYds ?? null,
      passingTDs: p.stats.passingTD ?? null,
      rushingYards: p.stats.rushingYds ?? null,
      rushingTDs: p.stats.rushingTD ?? null,
      receivingYards: p.stats.receivingYds ?? null,
      receivingTDs: p.stats.receivingTD ?? null,
      receptions: p.stats.receptions ?? null,
    }))
}

/**
 * Fetch multiple seasons for trend analysis
 */
export async function fetchPFRMultiYearStats(
  startSeason: number,
  endSeason: number
): Promise<Map<number, NormalizedPFRPlayer[]>> {
  const seasons: number[] = []
  for (let year = startSeason; year <= endSeason; year++) {
    seasons.push(year)
  }

  const rawData = await fetchPFRHistoricalTrend(seasons)
  const results = new Map<number, NormalizedPFRPlayer[]>()

  for (const [season, players] of rawData) {
    results.set(
      season,
      players
        .filter((p) => mapPosition(p.position) !== null)
        .map((p) => ({
          name: p.name,
          playerId: p.playerId,
          team: p.team,
          position: mapPosition(p.position)!,
          season: p.season,
          age: p.age,
          games: p.games,
          gamesStarted: p.gamesStarted,
          fantasyPointsPPR: p.stats.fantasyPointsPPR ?? null,
          fantasyPointsStd: p.stats.fantasyPointsStd ?? null,
          passingYards: p.stats.passingYds ?? null,
          passingTDs: p.stats.passingTD ?? null,
          rushingYards: p.stats.rushingYds ?? null,
          rushingTDs: p.stats.rushingTD ?? null,
          receivingYards: p.stats.receivingYds ?? null,
          receivingTDs: p.stats.receivingTD ?? null,
          receptions: p.stats.receptions ?? null,
        }))
    )
  }

  return results
}

/**
 * Calculate player trends from historical data
 */
export { calculateYoYTrends }

export default proFootballReferenceAdapter
