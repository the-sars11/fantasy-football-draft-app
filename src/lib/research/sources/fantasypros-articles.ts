/**
 * FantasyPros Articles Adapter (FF-220)
 *
 * Scrapes sentiment and analysis from FantasyPros' free public articles.
 * https://www.fantasypros.com/nfl/news/
 *
 * Data available:
 * - Player mentions in articles
 * - Sentiment analysis from article content
 * - Expert analysis quotes
 * - Breakout/sleeper/bust mentions
 *
 * Rate limiting: 1 req/sec max, aggressive caching (48h for articles)
 * Constraint: Free public data only, no paid subscription
 */

import type {
  SourceAdapter,
  SourceSentimentData,
  SourceFetchResult,
  DataType,
} from '../intel/types'
import { validate2026Data } from '../intel/freshness'

const FP_BASE = 'https://www.fantasypros.com'

// Rate limiting
let lastRequestTime = 0
const MIN_REQUEST_INTERVAL = 1000 // 1 second between requests

// In-memory cache for articles (TTL: 48 hours)
const articleCache = new Map<string, { data: ParsedArticle[]; fetchedAt: number }>()
const CACHE_TTL = 48 * 60 * 60 * 1000 // 48 hours

// Sentiment keyword patterns
const BULLISH_KEYWORDS = [
  'breakout',
  'sleeper',
  'undervalued',
  'upside',
  'value pick',
  'must draft',
  'steal',
  'bargain',
  'rising',
  'emerging',
  'target',
  'high ceiling',
  'league winner',
  'buy low',
  'elite',
  'dominant',
  'explosive',
]

const BEARISH_KEYWORDS = [
  'bust',
  'overvalued',
  'avoid',
  'overpaid',
  'overrated',
  'declining',
  'concern',
  'red flag',
  'risky',
  'sell high',
  'fading',
  'regression',
  'injury concern',
  'overpriced',
  'trap',
]

interface ParsedArticle {
  title: string
  url: string
  publishedAt: string | null
  author: string | null
  excerpt: string
  playerMentions: PlayerMention[]
}

interface PlayerMention {
  name: string
  context: string // Sentence containing the mention
  sentiment: 'bullish' | 'neutral' | 'bearish'
  keywords: string[] // Sentiment keywords found near the mention
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
    throw new Error(`FantasyPros Articles error: ${res.status} ${res.statusText} for ${url}`)
  }

  return res
}

/**
 * Extract player names from text using common NFL player name patterns
 */
function extractPlayerNames(text: string): string[] {
  const players: string[] = []

  // Pattern: Capitalized first name + last name (e.g., "Patrick Mahomes", "Josh Allen")
  const namePattern = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+(?:\s+(?:Jr|Sr|III|II|IV)\.?)?)\b/g
  let match

  // Common false positives to filter out
  const falsePositives = new Set([
    'Fantasy Football', 'Fantasy Pros', 'Super Bowl', 'Pro Bowl',
    'National Football', 'New York', 'New England', 'Los Angeles',
    'San Francisco', 'Las Vegas', 'Green Bay', 'Tampa Bay', 'Kansas City',
    'New Orleans', 'Monday Night', 'Sunday Night', 'Thursday Night',
    'Running Back', 'Wide Receiver', 'Tight End', 'Quarter Back',
  ])

  while ((match = namePattern.exec(text)) !== null) {
    const fullName = match[0]
    if (!falsePositives.has(fullName)) {
      players.push(fullName)
    }
  }

  return [...new Set(players)] // Remove duplicates
}

/**
 * Analyze sentiment of text surrounding a player mention
 */
function analyzeSentiment(context: string): { sentiment: 'bullish' | 'neutral' | 'bearish'; keywords: string[] } {
  const lowerContext = context.toLowerCase()
  const foundBullish: string[] = []
  const foundBearish: string[] = []

  for (const keyword of BULLISH_KEYWORDS) {
    if (lowerContext.includes(keyword)) {
      foundBullish.push(keyword)
    }
  }

  for (const keyword of BEARISH_KEYWORDS) {
    if (lowerContext.includes(keyword)) {
      foundBearish.push(keyword)
    }
  }

  if (foundBullish.length > foundBearish.length) {
    return { sentiment: 'bullish', keywords: foundBullish }
  } else if (foundBearish.length > foundBullish.length) {
    return { sentiment: 'bearish', keywords: foundBearish }
  }

  return { sentiment: 'neutral', keywords: [] }
}

/**
 * Extract context (surrounding sentence) for a player mention
 */
function extractContext(text: string, playerName: string): string {
  // Find sentences containing the player name
  const sentences = text.split(/[.!?]+/)

  for (const sentence of sentences) {
    if (sentence.includes(playerName)) {
      return sentence.trim().slice(0, 300) // Limit context length
    }
  }

  return ''
}

/**
 * Parse article list page to get article URLs and metadata
 */
function parseArticleListPage(html: string): Array<{ url: string; title: string; publishedAt: string | null }> {
  const articles: Array<{ url: string; title: string; publishedAt: string | null }> = []

  // FantasyPros article list patterns
  const patterns = [
    // Standard article card pattern
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    // News item pattern
    /<div[^>]*class="[^"]*news-item[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
    // Card pattern
    /<div[^>]*class="[^"]*article-card[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
  ]

  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const articleHtml = match[1]

      // Extract URL
      const urlMatch = articleHtml.match(/<a[^>]*href="([^"]*\/nfl\/[^"]*)"[^>]*>/i)
      // Extract title
      const titleMatch = articleHtml.match(/<h[2-4][^>]*>([^<]+)<\/h[2-4]>/i) ||
                         articleHtml.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</i)
      // Extract date
      const dateMatch = articleHtml.match(/datetime="([^"]+)"/) ||
                        articleHtml.match(/(\d{4}-\d{2}-\d{2})/) ||
                        articleHtml.match(/([A-Za-z]+\s+\d{1,2},?\s+\d{4})/)

      if (urlMatch && titleMatch) {
        const url = urlMatch[1].startsWith('http') ? urlMatch[1] : `${FP_BASE}${urlMatch[1]}`
        articles.push({
          url,
          title: titleMatch[1].trim(),
          publishedAt: dateMatch?.[1] || null,
        })
      }
    }
  }

  return articles.slice(0, 20) // Limit to 20 most recent articles
}

/**
 * Parse a single article page for content and player mentions
 */
function parseArticlePage(html: string, meta: { url: string; title: string; publishedAt: string | null }): ParsedArticle {
  // Extract article content
  let content = ''

  // Try multiple selectors for article content
  const contentPatterns = [
    /<div[^>]*class="[^"]*article-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
  ]

  for (const pattern of contentPatterns) {
    const match = html.match(pattern)
    if (match) {
      content = match[1]
      break
    }
  }

  // Strip HTML tags and clean up text
  const plainText = content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extract excerpt (first 500 chars)
  const excerpt = plainText.slice(0, 500)

  // Extract author
  const authorMatch = html.match(/class="[^"]*author[^"]*"[^>]*>([^<]+)/i) ||
                      html.match(/by\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/i)
  const author = authorMatch?.[1]?.trim() || null

  // Find player mentions
  const playerNames = extractPlayerNames(plainText)
  const playerMentions: PlayerMention[] = []

  for (const name of playerNames) {
    const context = extractContext(plainText, name)
    if (context) {
      const { sentiment, keywords } = analyzeSentiment(context)
      playerMentions.push({
        name,
        context,
        sentiment,
        keywords,
      })
    }
  }

  return {
    title: meta.title,
    url: meta.url,
    publishedAt: meta.publishedAt,
    author,
    excerpt,
    playerMentions,
  }
}

/**
 * Fetch and parse FantasyPros articles
 */
async function fetchFPArticles(maxArticles: number = 10): Promise<ParsedArticle[]> {
  const cacheKey = 'fp-articles'

  // Check cache first
  const cached = articleCache.get(cacheKey)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data
  }

  try {
    // Fetch the news list page
    const listRes = await rateLimitedFetch(`${FP_BASE}/nfl/news/`)
    const listHtml = await listRes.text()

    // Parse article list
    const articleMetas = parseArticleListPage(listHtml)

    // Fetch individual articles (limited to avoid rate limiting)
    const articles: ParsedArticle[] = []

    for (const meta of articleMetas.slice(0, maxArticles)) {
      try {
        const articleRes = await rateLimitedFetch(meta.url)
        const articleHtml = await articleRes.text()
        const article = parseArticlePage(articleHtml, meta)

        if (article.playerMentions.length > 0) {
          articles.push(article)
        }
      } catch (err) {
        console.warn(`Failed to fetch article ${meta.url}:`, err)
      }
    }

    // Cache results
    articleCache.set(cacheKey, {
      data: articles,
      fetchedAt: Date.now(),
    })

    return articles
  } catch (error) {
    // Return cached data if available, even if stale
    if (cached) {
      console.warn('FP Articles fetch failed, using stale cache:', error)
      return cached.data
    }
    throw error
  }
}

/**
 * Aggregate sentiment by player from all articles
 */
function aggregateSentimentByPlayer(articles: ParsedArticle[]): SourceSentimentData[] {
  const playerSentiments = new Map<string, {
    bullishCount: number
    bearishCount: number
    neutralCount: number
    mentions: string[]
    articles: Array<{ url: string; title: string }>
  }>()

  for (const article of articles) {
    for (const mention of article.playerMentions) {
      const existing = playerSentiments.get(mention.name) || {
        bullishCount: 0,
        bearishCount: 0,
        neutralCount: 0,
        mentions: [],
        articles: [],
      }

      if (mention.sentiment === 'bullish') existing.bullishCount++
      else if (mention.sentiment === 'bearish') existing.bearishCount++
      else existing.neutralCount++

      if (mention.keywords.length > 0) {
        existing.mentions.push(
          `${mention.keywords.join(', ')} (${article.title.slice(0, 50)})`
        )
      }

      existing.articles.push({ url: article.url, title: article.title })
      playerSentiments.set(mention.name, existing)
    }
  }

  // Convert to SourceSentimentData
  const results: SourceSentimentData[] = []

  for (const [name, data] of playerSentiments) {
    // Determine consensus sentiment
    let sentiment: 'bullish' | 'neutral' | 'bearish' = 'neutral'
    const total = data.bullishCount + data.bearishCount + data.neutralCount

    if (data.bullishCount > data.bearishCount && data.bullishCount > data.neutralCount) {
      sentiment = 'bullish'
    } else if (data.bearishCount > data.bullishCount && data.bearishCount > data.neutralCount) {
      sentiment = 'bearish'
    }

    // Calculate confidence based on number of mentions and clarity
    const majorityRatio = Math.max(data.bullishCount, data.bearishCount, data.neutralCount) / total
    const confidence = Math.min(0.9, 0.4 + (majorityRatio * 0.3) + (Math.min(total, 5) * 0.06))

    results.push({
      playerName: name,
      sentiment,
      mentions: data.mentions.slice(0, 5), // Limit to 5 most relevant mentions
      confidence,
      articleUrl: data.articles[0]?.url,
      articleTitle: data.articles[0]?.title,
    })
  }

  // Sort by confidence descending
  return results.sort((a, b) => b.confidence - a.confidence)
}

// --- SourceAdapter Implementation ---

export const fantasyProsArticlesAdapter: SourceAdapter = {
  sourceKey: 'fantasypros_articles',
  displayName: 'FantasyPros Articles',
  dataTypes: ['sentiment'] as DataType[],

  async is2026DataAvailable(): Promise<{
    available: boolean
    confidence: number
    reason: string
    checkedAt: string
  }> {
    const checkedAt = new Date().toISOString()

    try {
      const articles = await fetchFPArticles(3) // Just fetch a few to check

      if (articles.length === 0) {
        return {
          available: false,
          confidence: 0.5,
          reason: 'No articles found',
          checkedAt,
        }
      }

      // Check if articles are recent and about 2026 season
      const recentArticle = articles[0]
      const articleDate = recentArticle.publishedAt ? new Date(recentArticle.publishedAt) : null

      // If article is from within 30 days, likely current season content
      if (articleDate) {
        const daysSincePublish = Math.floor(
          (Date.now() - articleDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSincePublish <= 30) {
          return {
            available: true,
            confidence: 0.75,
            reason: `Recent article from ${daysSincePublish} days ago: "${recentArticle.title.slice(0, 50)}"`,
            checkedAt,
          }
        }
      }

      // Check for 2026 mentions in titles
      const has2026 = articles.some((a) => a.title.includes('2026') || a.excerpt.includes('2026'))

      return {
        available: has2026,
        confidence: has2026 ? 0.85 : 0.6,
        reason: has2026 ? 'Found articles mentioning 2026 season' : 'Articles found but no 2026 mentions',
        checkedAt,
      }
    } catch (error) {
      return {
        available: false,
        confidence: 0.3,
        reason: `Failed to check articles: ${error instanceof Error ? error.message : 'Unknown error'}`,
        checkedAt,
      }
    }
  },

  async getLastUpdatedDate(): Promise<Date | null> {
    try {
      const articles = await fetchFPArticles(1)
      if (articles.length > 0 && articles[0].publishedAt) {
        const date = new Date(articles[0].publishedAt)
        return isNaN(date.getTime()) ? null : date
      }
      return null
    } catch {
      return null
    }
  },

  async fetchBulkSentiment(): Promise<SourceFetchResult<SourceSentimentData>> {
    const fetchedAt = new Date().toISOString()

    try {
      const articles = await fetchFPArticles(15) // Fetch up to 15 articles
      const sentiments = aggregateSentimentByPlayer(articles)

      // Check for 2026 content
      const has2026Content = articles.some(
        (a) => a.title.includes('2026') || a.excerpt.includes('2026')
      )

      const seasonValidation = validate2026Data(
        'fantasypros_articles',
        fetchedAt,
        { articles },
        {
          hasSeasonHeader: has2026Content,
          seasonLabel: has2026Content ? '2026 Fantasy' : undefined,
          lastUpdateDate: articles[0]?.publishedAt ? new Date(articles[0].publishedAt) : null,
        }
      )

      return {
        success: true,
        data: sentiments,
        source: 'fantasypros_articles',
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
        source: 'fantasypros_articles',
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

  async fetchPlayerSentiment(playerName: string): Promise<SourceFetchResult<SourceSentimentData>> {
    const fetchedAt = new Date().toISOString()

    try {
      const articles = await fetchFPArticles(15)

      // Filter to articles mentioning this player
      const relevantArticles = articles.filter((a) =>
        a.playerMentions.some((m) => m.name.toLowerCase() === playerName.toLowerCase())
      )

      const sentiments = aggregateSentimentByPlayer(relevantArticles)
      const playerSentiment = sentiments.find(
        (s) => s.playerName.toLowerCase() === playerName.toLowerCase()
      )

      const has2026Content = relevantArticles.some(
        (a) => a.title.includes('2026') || a.excerpt.includes('2026')
      )

      const seasonValidation = validate2026Data(
        'fantasypros_articles',
        fetchedAt,
        { articles: relevantArticles },
        {
          hasSeasonHeader: has2026Content,
          lastUpdateDate: relevantArticles[0]?.publishedAt
            ? new Date(relevantArticles[0].publishedAt)
            : null,
        }
      )

      return {
        success: true,
        data: playerSentiment ? [playerSentiment] : [],
        source: 'fantasypros_articles',
        dataType: 'sentiment',
        fetchedAt,
        is2026Data: seasonValidation.is2026,
        seasonValidation: {
          method: seasonValidation.method,
          confidence: seasonValidation.confidence,
          reason: seasonValidation.reason,
        },
        playerCount: playerSentiment ? 1 : 0,
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        source: 'fantasypros_articles',
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

export default fantasyProsArticlesAdapter
