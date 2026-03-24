/**
 * Fantasy Footballers Data Adapter (FF-219)
 *
 * Scrapes free rankings and sentiment from The Fantasy Footballers website.
 * https://www.thefantasyfootballers.com/rankings/
 *
 * Data available:
 * - Overall rankings (free tier)
 * - Position-specific rankings
 * - Tags like "Sleeper", "Breakout", "Bust" from their analysis
 * - Last updated timestamp for 2026 season validation
 *
 * Rate limiting: 1 req/sec max, aggressive caching (24h for rankings)
 * Constraint: Free public data only, no paid subscription
 */

import type { Position } from '@/lib/players/types'
import type { ScoringFormat } from '@/lib/supabase/database.types'
import type {
  SourceAdapter,
  SourcePlayerData,
  SourceSentimentData,
  SourceFetchResult,
  DataType,
} from '../intel/types'
import { validate2026Data } from '../intel/freshness'

const FF_BASE = 'https://www.thefantasyfootballers.com'

// Rate limiting - track last request time
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 second between requests

// In-memory cache for rankings (TTL: 24 hours)
const rankingsCache = new Map<string, { data: FFRankingPlayer[]; fetchedAt: number; lastUpdated: string | null }>()
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

interface FFRankingPlayer {
  name: string
  team: string | null
  position: string
  rank: number
  positionalRank: number
  tier?: number
  tags?: string[] // Sleeper, Breakout, Bust, Value, etc.
  notes?: string
  byeWeek?: number
}

interface FFPageData {
  players: FFRankingPlayer[]
  lastUpdated: string | null
  seasonLabel: string | null
}

// Position slugs for Fantasy Footballers URLs
const FF_POSITION_SLUGS: Record<string, string> = {
  overall: '',
  QB: 'qb',
  RB: 'rb',
  WR: 'wr',
  TE: 'te',
  K: 'k',
  DEF: 'dst',
}

// Scoring format slugs (map DB format to FF website slugs)
const FF_SCORING_SLUGS: Record<ScoringFormat, string> = {
  ppr: 'ppr',
  half_ppr: 'half-ppr',
  standard: 'standard',
  custom: 'ppr', // Fallback custom to PPR
}

function mapPosition(pos: string): Position | null {
  const upper = pos.toUpperCase().trim()
  if (upper === 'DST' || upper === 'D/ST') return 'DEF'
  if (['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(upper)) return upper as Position
  return null
}

/**
 * Rate-limited fetch with polite delay
 */
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const timeSinceLastRequest = now - lastRequestTime

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest))
  }

  lastRequestTime = Date.now()

  const res = await fetch(url, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; FantasyFootballDraftAdvisor/1.0; +https://propermuse.co)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!res.ok) {
    throw new Error(`Fantasy Footballers error: ${res.status} ${res.statusText} for ${url}`)
  }

  return res
}

/**
 * Parse rankings table from Fantasy Footballers HTML
 * Their page structure uses a table with player rows
 */
function parseRankingsFromHTML(html: string): FFPageData {
  const players: FFRankingPlayer[] = []
  let lastUpdated: string | null = null
  let seasonLabel: string | null = null

  // Extract season year from page title or header
  // Look for patterns like "2026 Fantasy Football Rankings"
  const seasonMatch = html.match(/(\d{4})\s*Fantasy\s*Football\s*Rankings/i)
  if (seasonMatch) {
    seasonLabel = seasonMatch[0]
  }

  // Extract last updated date
  // Look for patterns like "Last Updated: March 23, 2026" or "Updated: 3/23/2026"
  const updatePatterns = [
    /Last\s*Updated[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /Updated[:\s]+(\d{1,2}\/\d{1,2}\/\d{4})/i,
    /as of[:\s]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
  ]

  for (const pattern of updatePatterns) {
    const match = html.match(pattern)
    if (match) {
      lastUpdated = match[1]
      break
    }
  }

  // Parse player rows from the rankings table
  // Fantasy Footballers uses structured HTML with player data
  // Look for table rows or list items with player info

  // Strategy 1: Parse JSON-LD or embedded data
  const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i)
  if (jsonLdMatch) {
    try {
      const jsonData = JSON.parse(jsonLdMatch[1])
      // Check if it contains player data
      if (jsonData?.itemListElement) {
        // Schema.org ItemList format
        for (const item of jsonData.itemListElement) {
          if (item.item?.name) {
            const playerName = item.item.name
            const rank = item.position || players.length + 1

            players.push({
              name: playerName,
              team: null,
              position: 'unknown',
              rank,
              positionalRank: 0,
            })
          }
        }
      }
    } catch {
      // JSON parsing failed, continue to HTML parsing
    }
  }

  // Strategy 2: Parse table rows (common structure)
  // <tr class="player-row"> or similar
  const tableRowPattern = /<tr[^>]*class="[^"]*player[^"]*"[^>]*>([\s\S]*?)<\/tr>/gi
  let rowMatch
  let currentRank = 0

  while ((rowMatch = tableRowPattern.exec(html)) !== null) {
    currentRank++
    const rowHtml = rowMatch[1]

    // Extract player name - usually in a link or span
    const nameMatch = rowHtml.match(/<a[^>]*class="[^"]*player-name[^"]*"[^>]*>([^<]+)<\/a>/i) ||
                      rowHtml.match(/<span[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                      rowHtml.match(/<td[^>]*class="[^"]*name[^"]*"[^>]*>([^<]+)<\/td>/i)

    // Extract team
    const teamMatch = rowHtml.match(/<span[^>]*class="[^"]*team[^"]*"[^>]*>([A-Z]{2,3})<\/span>/i) ||
                      rowHtml.match(/\(([A-Z]{2,3})\)/i)

    // Extract position
    const posMatch = rowHtml.match(/<span[^>]*class="[^"]*pos(?:ition)?[^"]*"[^>]*>([^<]+)<\/span>/i) ||
                     rowHtml.match(/(?:QB|RB|WR|TE|K|DEF|D\/ST)/i)

    // Extract tags (Sleeper, Breakout, Bust, etc.)
    const tags: string[] = []
    const tagPatterns = [
      /class="[^"]*sleeper[^"]*"/i,
      /class="[^"]*breakout[^"]*"/i,
      /class="[^"]*bust[^"]*"/i,
      /class="[^"]*value[^"]*"/i,
      /class="[^"]*avoid[^"]*"/i,
      /"tag"[^>]*>([^<]+)</gi,
    ]

    for (const pattern of tagPatterns) {
      if (pattern.global) {
        let tagMatch
        while ((tagMatch = pattern.exec(rowHtml)) !== null) {
          tags.push(tagMatch[1]?.toLowerCase() || pattern.source.match(/sleeper|breakout|bust|value|avoid/i)?.[0]?.toLowerCase() || '')
        }
      } else if (pattern.test(rowHtml)) {
        const tagType = pattern.source.match(/sleeper|breakout|bust|value|avoid/i)
        if (tagType) tags.push(tagType[0].toLowerCase())
      }
    }

    if (nameMatch) {
      const name = nameMatch[1].trim()
      const team = teamMatch?.[1]?.toUpperCase() || null
      const position = posMatch?.[1]?.trim() || posMatch?.[0]?.trim() || 'unknown'

      players.push({
        name,
        team,
        position,
        rank: currentRank,
        positionalRank: 0, // Will be calculated after grouping
        tags: tags.length > 0 ? tags : undefined,
      })
    }
  }

  // Strategy 3: Parse list items (alternative structure)
  if (players.length === 0) {
    const listPattern = /<li[^>]*class="[^"]*rank[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
    let listMatch

    while ((listMatch = listPattern.exec(html)) !== null) {
      currentRank++
      const itemHtml = listMatch[1]

      // Extract player name
      const nameMatch = itemHtml.match(/>([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)</i)
      if (nameMatch) {
        players.push({
          name: nameMatch[1].trim(),
          team: null,
          position: 'unknown',
          rank: currentRank,
          positionalRank: 0,
        })
      }
    }
  }

  // Calculate positional ranks
  const positionCounts: Record<string, number> = {}
  for (const player of players) {
    const pos = player.position.toUpperCase()
    positionCounts[pos] = (positionCounts[pos] || 0) + 1
    player.positionalRank = positionCounts[pos]
  }

  return { players, lastUpdated, seasonLabel }
}

/**
 * Fetch rankings from Fantasy Footballers
 */
async function fetchFFRankings(
  scoringFormat: ScoringFormat = 'ppr',
  position: string = 'overall'
): Promise<FFPageData> {
  const cacheKey = `${scoringFormat}-${position}`

  // Check cache first
  const cached = rankingsCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { players: cached.data, lastUpdated: cached.lastUpdated, seasonLabel: null }
  }

  // Build URL
  const scoringSlug = FF_SCORING_SLUGS[scoringFormat] || 'ppr'
  const positionSlug = FF_POSITION_SLUGS[position] || ''

  let url = `${FF_BASE}/rankings/`
  if (positionSlug) {
    url += `${positionSlug}-`
  }
  url += `${scoringSlug}-rankings/`

  try {
    const res = await rateLimitedFetch(url)
    const html = await res.text()
    const pageData = parseRankingsFromHTML(html)

    // Cache the results
    rankingsCache.set(cacheKey, {
      data: pageData.players,
      fetchedAt: Date.now(),
      lastUpdated: pageData.lastUpdated,
    })

    return pageData
  } catch (error) {
    // Return cached data if available, even if stale
    if (cached) {
      console.warn(`FF fetch failed, using stale cache for ${cacheKey}:`, error)
      return { players: cached.data, lastUpdated: cached.lastUpdated, seasonLabel: null }
    }
    throw error
  }
}

/**
 * Extract sentiment data from FF rankings tags
 */
function extractSentimentFromTags(
  player: FFRankingPlayer
): SourceSentimentData | null {
  if (!player.tags || player.tags.length === 0) return null

  // Determine sentiment from tags
  let sentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral'
  const mentions: string[] = []

  for (const tag of player.tags) {
    const lowerTag = tag.toLowerCase()
    if (lowerTag === 'breakout' || lowerTag === 'sleeper' || lowerTag === 'value') {
      sentiment = 'bullish'
      mentions.push(`Fantasy Footballers tagged as "${tag}"`)
    } else if (lowerTag === 'bust' || lowerTag === 'avoid') {
      sentiment = 'bearish'
      mentions.push(`Fantasy Footballers tagged as "${tag}"`)
    }
  }

  if (mentions.length === 0) return null

  return {
    playerName: player.name,
    sentiment,
    mentions,
    confidence: 0.7, // Tags are curated but limited context
  }
}

// --- SourceAdapter Implementation ---

export const fantasyFootballersAdapter: SourceAdapter = {
  sourceKey: 'fantasy_footballers',
  displayName: 'The Fantasy Footballers',
  dataTypes: ['rankings', 'sentiment'] as DataType[],

  async is2026DataAvailable(): Promise<{
    available: boolean
    confidence: number
    reason: string
    checkedAt: string
  }> {
    const checkedAt = new Date().toISOString()

    try {
      const pageData = await fetchFFRankings('ppr', 'overall')

      // Check if the page indicates 2026 season
      const seasonValidation = validate2026Data(
        'fantasy_footballers',
        checkedAt,
        pageData,
        {
          seasonLabel: pageData.seasonLabel || undefined,
          lastUpdateDate: pageData.lastUpdated ? new Date(pageData.lastUpdated) : null,
          hasSeasonHeader: pageData.seasonLabel?.includes('2026') || false,
        }
      )

      return {
        available: seasonValidation.is2026,
        confidence: seasonValidation.confidence,
        reason: seasonValidation.reason,
        checkedAt,
      }
    } catch (error) {
      return {
        available: false,
        confidence: 0.5,
        reason: `Failed to check Fantasy Footballers: ${error instanceof Error ? error.message : 'Unknown error'}`,
        checkedAt,
      }
    }
  },

  async getLastUpdatedDate(): Promise<Date | null> {
    try {
      const pageData = await fetchFFRankings('ppr', 'overall')
      if (pageData.lastUpdated) {
        const date = new Date(pageData.lastUpdated)
        return isNaN(date.getTime()) ? null : date
      }
      return null
    } catch {
      return null
    }
  },

  async fetchRankings(
    season: number,
    format: ScoringFormat
  ): Promise<SourceFetchResult<SourcePlayerData>> {
    const fetchedAt = new Date().toISOString()

    try {
      const pageData = await fetchFFRankings(format, 'overall')

      // Validate 2026 data
      const seasonValidation = validate2026Data(
        'fantasy_footballers',
        fetchedAt,
        pageData,
        {
          seasonLabel: pageData.seasonLabel || undefined,
          lastUpdateDate: pageData.lastUpdated ? new Date(pageData.lastUpdated) : null,
          hasSeasonHeader: pageData.seasonLabel?.includes('2026') || false,
        }
      )

      // Convert to SourcePlayerData format
      const players: SourcePlayerData[] = pageData.players
        .filter((p) => mapPosition(p.position) !== null)
        .map((p) => ({
          name: p.name,
          team: p.team,
          position: mapPosition(p.position) || 'QB',
          rank: p.rank,
          byeWeek: p.byeWeek || null,
        }))

      return {
        success: true,
        data: players,
        source: 'fantasy_footballers',
        dataType: 'rankings',
        fetchedAt,
        is2026Data: seasonValidation.is2026,
        seasonValidation: {
          method: seasonValidation.method,
          confidence: seasonValidation.confidence,
          reason: seasonValidation.reason,
        },
        playerCount: players.length,
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'fantasy_footballers',
        dataType: 'rankings',
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

  async fetchBulkSentiment(): Promise<SourceFetchResult<SourceSentimentData>> {
    const fetchedAt = new Date().toISOString()

    try {
      const pageData = await fetchFFRankings('ppr', 'overall')

      // Extract sentiment from player tags
      const sentiments: SourceSentimentData[] = []
      for (const player of pageData.players) {
        const sentiment = extractSentimentFromTags(player)
        if (sentiment) {
          sentiments.push(sentiment)
        }
      }

      // Validate 2026 data
      const seasonValidation = validate2026Data(
        'fantasy_footballers',
        fetchedAt,
        pageData,
        {
          seasonLabel: pageData.seasonLabel || undefined,
          lastUpdateDate: pageData.lastUpdated ? new Date(pageData.lastUpdated) : null,
          hasSeasonHeader: pageData.seasonLabel?.includes('2026') || false,
        }
      )

      return {
        success: true,
        data: sentiments,
        source: 'fantasy_footballers',
        dataType: 'sentiment',
        fetchedAt,
        is2026Data: seasonValidation.is2026,
        seasonValidation: {
          method: seasonValidation.method,
          confidence: seasonValidation.confidence,
          reason: seasonValidation.reason,
        },
        playerCount: sentiments.length,
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'fantasy_footballers',
        dataType: 'sentiment',
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

// --- Standalone Functions (for backward compatibility) ---

export interface NormalizedFFPlayer {
  name: string
  team: string | null
  position: Position
  ffRank: number
  positionalRank: number
  tier?: number
  tags?: string[]
}

/**
 * Fetch Fantasy Footballers rankings (standalone function)
 */
export async function fetchFantasyFootballersRankings(
  scoringFormat: ScoringFormat = 'ppr'
): Promise<NormalizedFFPlayer[]> {
  const pageData = await fetchFFRankings(scoringFormat, 'overall')

  return pageData.players
    .filter((p) => mapPosition(p.position) !== null)
    .map((p) => ({
      name: p.name,
      team: p.team,
      position: mapPosition(p.position)!,
      ffRank: p.rank,
      positionalRank: p.positionalRank,
      tier: p.tier,
      tags: p.tags,
    }))
}

/**
 * Fetch all Fantasy Footballers data
 */
export async function fetchAllFantasyFootballersData(
  scoringFormat: ScoringFormat = 'ppr'
) {
  const rankings = await fetchFantasyFootballersRankings(scoringFormat)

  // Build lookup by name
  const rankingsMap = new Map<string, NormalizedFFPlayer>()
  for (const player of rankings) {
    rankingsMap.set(player.name.toLowerCase(), player)
  }

  return {
    rankings,
    rankingsMap,
    fetchedAt: new Date().toISOString(),
  }
}

export default fantasyFootballersAdapter
