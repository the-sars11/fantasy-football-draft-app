/**
 * FantasyPros Data Adapter
 *
 * Fetches Expert Consensus Rankings (ECR), tier breakdowns, and auction values
 * from FantasyPros' public-facing data endpoints.
 *
 * Endpoints used:
 * - GET https://www.fantasypros.com/api/bo/2025/consensus-rankings — ECR data
 * - GET https://www.fantasypros.com/api/bo/2025/auction-values — Auction values
 *
 * These endpoints serve the ranking pages and return JSON with player data.
 * No API key needed — public data. Rate limit gently (1 req/sec).
 *
 * Fallback: If the API endpoints change, we can parse the embedded JSON from
 * the ranking pages (they embed ECR data in a <script> tag).
 */

import type { Position, ScoringFormat } from '@/lib/players/types'

const FP_BASE = 'https://www.fantasypros.com'

// FantasyPros scoring type slugs
const FP_SCORING_SLUGS: Record<ScoringFormat, string> = {
  standard: 'consensus-rankings',
  'half-ppr': 'half-point-ppr-rankings',
  ppr: 'ppr-rankings',
}

// Position filter slugs for FantasyPros URLs
const FP_POSITION_SLUGS: Record<string, string> = {
  overall: 'overall',
  QB: 'qb',
  RB: 'rb',
  WR: 'wr',
  TE: 'te',
  K: 'k',
  DEF: 'dst',
}

interface FPRankingPlayer {
  player_name: string
  player_team_id: string // NFL team abbreviation
  player_position_id: string // QB, RB, WR, TE, K, DST
  player_bye_week: string
  rank_ecr: string // overall ECR rank
  rank_min: string // best expert rank
  rank_max: string // worst expert rank
  rank_ave: string // average rank
  rank_std: string // standard deviation
  pos_rank: string // positional rank (e.g., "RB12")
  tier: string // tier number
  player_id?: string
  player_yahoo_id?: string
  player_espn_id?: string
  player_sleeper_id?: string
}

interface FPAuctionPlayer {
  player_name: string
  player_team_id: string
  player_position_id: string
  player_bye_week: string
  aav: string // average auction value
  low: string
  high: string
  player_id?: string
}

interface FPResponse {
  players: FPRankingPlayer[] | FPAuctionPlayer[]
  last_updated?: string
}

export interface NormalizedFPPlayer {
  name: string
  team: string
  position: Position
  byeWeek: number
  ecrRank: number
  ecrBestRank: number
  ecrWorstRank: number
  ecrAverage: number
  ecrStdDev: number
  positionalRank: string // "RB12"
  tier: number
  // Cross-platform IDs for matching
  fpId?: string
  yahooId?: string
  espnId?: string
  sleeperId?: string
}

export interface NormalizedFPAuctionValue {
  name: string
  team: string
  position: Position
  auctionValue: number
  auctionLow: number
  auctionHigh: number
  fpId?: string
}

function mapPosition(pos: string): Position | null {
  const upper = pos.toUpperCase()
  if (upper === 'DST') return 'DEF'
  if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(upper)) return upper as Position
  return null
}

async function fetchFPData<T>(path: string): Promise<T> {
  const url = `${FP_BASE}${path}`

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'FantasyFootballDraftAdvisor/1.0',
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`FantasyPros error: ${res.status} ${res.statusText} for ${url}`)
  }

  return res.json() as Promise<T>
}

/**
 * Fallback: Parse ECR data from the embedded JSON in the rankings page HTML.
 * FantasyPros embeds ranking data in a script tag as `var defined = {...}`.
 */
async function fetchFPRankingsFromPage(
  season: number,
  scoringFormat: ScoringFormat
): Promise<FPRankingPlayer[]> {
  const slug = FP_SCORING_SLUGS[scoringFormat]
  const url = `${FP_BASE}/nfl/rankings/${slug}.php`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'FantasyFootballDraftAdvisor/1.0',
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    throw new Error(`FantasyPros page error: ${res.status} for ${url}`)
  }

  const html = await res.text()

  // Look for embedded ECR data — FantasyPros puts it in:
  // var defined = {"players":[...]};
  // or ecrData = {"players":[...]};
  const patterns = [
    /var\s+ecrData\s*=\s*(\{[\s\S]*?\});\s*(?:var|<\/script>)/,
    /var\s+defined\s*=\s*(\{[\s\S]*?\});\s*(?:var|<\/script>)/,
    /"players"\s*:\s*(\[[\s\S]*?\])\s*[,}]/,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) {
      try {
        const parsed = JSON.parse(match[1])
        if (Array.isArray(parsed)) return parsed
        if (parsed.players && Array.isArray(parsed.players)) return parsed.players
      } catch {
        continue
      }
    }
  }

  return []
}

/**
 * Fetch Expert Consensus Rankings (ECR) from FantasyPros.
 * Tries the API endpoint first, falls back to page scraping.
 */
export async function fetchFantasyProsECR(
  season: number = new Date().getFullYear(),
  scoringFormat: ScoringFormat = 'ppr'
): Promise<NormalizedFPPlayer[]> {
  let rawPlayers: FPRankingPlayer[] = []

  // Try API endpoint first
  try {
    const data = await fetchFPData<FPResponse>(
      `/api/bo/${season}/${FP_SCORING_SLUGS[scoringFormat]}.php?type=overall&week=0`
    )
    if (data.players && Array.isArray(data.players)) {
      rawPlayers = data.players as FPRankingPlayer[]
    }
  } catch {
    // API endpoint failed, try page scraping
  }

  // Fallback to page parsing
  if (rawPlayers.length === 0) {
    try {
      rawPlayers = await fetchFPRankingsFromPage(season, scoringFormat)
    } catch {
      // Both methods failed
      return []
    }
  }

  const players: NormalizedFPPlayer[] = []

  for (const p of rawPlayers) {
    const position = mapPosition(p.player_position_id)
    if (!position) continue

    const ecrRank = parseFloat(p.rank_ecr)
    if (isNaN(ecrRank) || ecrRank <= 0) continue

    players.push({
      name: p.player_name,
      team: p.player_team_id,
      position,
      byeWeek: parseInt(p.player_bye_week) || 0,
      ecrRank,
      ecrBestRank: parseFloat(p.rank_min) || ecrRank,
      ecrWorstRank: parseFloat(p.rank_max) || ecrRank,
      ecrAverage: parseFloat(p.rank_ave) || ecrRank,
      ecrStdDev: parseFloat(p.rank_std) || 0,
      positionalRank: p.pos_rank || '',
      tier: parseInt(p.tier) || 1,
      fpId: p.player_id,
      yahooId: p.player_yahoo_id,
      espnId: p.player_espn_id,
      sleeperId: p.player_sleeper_id,
    })
  }

  // Sort by ECR rank
  players.sort((a, b) => a.ecrRank - b.ecrRank)

  return players
}

/**
 * Extract tier breakdowns from ECR data.
 * Returns players grouped by tier with tier boundaries.
 */
export async function fetchFantasyProsTiers(
  season?: number,
  scoringFormat?: ScoringFormat
): Promise<Map<number, NormalizedFPPlayer[]>> {
  const players = await fetchFantasyProsECR(season, scoringFormat)
  const tierMap = new Map<number, NormalizedFPPlayer[]>()

  for (const p of players) {
    const tier = p.tier
    if (!tierMap.has(tier)) {
      tierMap.set(tier, [])
    }
    tierMap.get(tier)!.push(p)
  }

  return tierMap
}

/**
 * Fetch auction values from FantasyPros.
 */
export async function fetchFantasyProsAuctionValues(
  season: number = new Date().getFullYear(),
  budget: number = 200
): Promise<NormalizedFPAuctionValue[]> {
  let rawPlayers: FPAuctionPlayer[] = []

  try {
    const data = await fetchFPData<FPResponse>(
      `/api/bo/${season}/auction-values.php?type=overall&teams=12&budget=${budget}`
    )
    if (data.players && Array.isArray(data.players)) {
      rawPlayers = data.players as FPAuctionPlayer[]
    }
  } catch {
    // Auction values endpoint failed
    return []
  }

  const players: NormalizedFPAuctionValue[] = []

  for (const p of rawPlayers) {
    const position = mapPosition(p.player_position_id)
    if (!position) continue

    const auctionValue = parseFloat(p.aav)
    if (isNaN(auctionValue)) continue

    players.push({
      name: p.player_name,
      team: p.player_team_id,
      position,
      auctionValue,
      auctionLow: parseFloat(p.low) || 0,
      auctionHigh: parseFloat(p.high) || auctionValue,
      fpId: p.player_id,
    })
  }

  // Sort by auction value descending
  players.sort((a, b) => b.auctionValue - a.auctionValue)

  return players
}

/**
 * Fetch all FantasyPros data in one call — ECR + auction values.
 */
export async function fetchAllFantasyProsData(
  season?: number,
  scoringFormat?: ScoringFormat,
  budget?: number
) {
  const [ecr, auctionValues] = await Promise.all([
    fetchFantasyProsECR(season, scoringFormat),
    fetchFantasyProsAuctionValues(season, budget),
  ])

  // Build auction value lookup by name for cross-referencing
  const auctionMap = new Map<string, NormalizedFPAuctionValue>()
  for (const av of auctionValues) {
    auctionMap.set(av.name.toLowerCase(), av)
  }

  return {
    ecr,
    auctionValues,
    auctionMap,
    fetchedAt: new Date().toISOString(),
  }
}
