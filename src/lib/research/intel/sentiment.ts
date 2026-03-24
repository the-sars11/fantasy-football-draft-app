/**
 * Player Intelligence System - Sentiment Aggregation
 *
 * Aggregates sentiment data from multiple sources into a consensus view.
 * Provides sentiment scoring and keyword detection for tag assignment.
 */

import type { SourceSentimentData } from './types'

// --- Sentiment Keywords ---

/**
 * Keywords that indicate bullish/breakout sentiment
 */
export const BULLISH_KEYWORDS = [
  'breakout',
  'emerging',
  'sleeper',
  'undervalued',
  'hidden gem',
  'upside',
  'rising',
  'ascending',
  'improving',
  'ready to explode',
  'poised for',
  'target',
  'must-draft',
  'steal',
  'value pick',
  'league winner',
  'smash spot',
  'elite upside',
  'workhorse',
  'bellcow',
  'alpha',
  'wr1',
  'rb1',
  'qb1',
  'te1',
] as const

/**
 * Keywords that indicate bearish/bust sentiment
 */
export const BEARISH_KEYWORDS = [
  'bust',
  'avoid',
  'overvalued',
  'overhyped',
  'decline',
  'declining',
  'concerning',
  'concern',
  'risk',
  'risky',
  'fade',
  'fading',
  'red flag',
  'injury risk',
  'injury prone',
  'aging',
  'washed',
  'regression',
  'regressing',
  'timeshare',
  'committee',
  'crowded backfield',
  'limited upside',
  'ceiling concerns',
  'overpriced',
] as const

// --- Sentiment Aggregation Types ---

export interface AggregatedSentiment {
  /**
   * Sources that contributed sentiment data
   */
  sources: Array<{
    source: string
    sentiment: 'bullish' | 'neutral' | 'bearish'
    mentions: string[]
    confidence: number
    fetchedAt: string
  }>

  /**
   * Consensus sentiment across all sources
   */
  consensusSentiment: 'bullish' | 'neutral' | 'bearish'

  /**
   * Sentiment score: 0-100, higher = more bullish
   * 50 = neutral, 75+ = strong bullish, 25- = strong bearish
   */
  sentimentScore: number

  /**
   * Detected keywords from mentions
   */
  detectedKeywords: {
    bullish: string[]
    bearish: string[]
  }

  /**
   * Count of sources mentioning specific patterns
   */
  keywordCounts: {
    breakout: number
    sleeper: number
    bust: number
    avoid: number
    concern: number
    value: number
  }
}

// --- Sentiment Aggregation Functions ---

/**
 * Convert sentiment label to numeric value
 */
function sentimentToScore(sentiment: 'bullish' | 'neutral' | 'bearish'): number {
  switch (sentiment) {
    case 'bullish':
      return 75
    case 'neutral':
      return 50
    case 'bearish':
      return 25
  }
}

/**
 * Convert numeric score back to sentiment label
 */
function scoreToSentiment(score: number): 'bullish' | 'neutral' | 'bearish' {
  if (score >= 62.5) return 'bullish'
  if (score <= 37.5) return 'bearish'
  return 'neutral'
}

/**
 * Extract detected keywords from mentions
 */
export function extractKeywords(mentions: string[]): {
  bullish: string[]
  bearish: string[]
} {
  const bullish: string[] = []
  const bearish: string[] = []
  const combinedText = mentions.join(' ').toLowerCase()

  for (const keyword of BULLISH_KEYWORDS) {
    if (combinedText.includes(keyword.toLowerCase())) {
      bullish.push(keyword)
    }
  }

  for (const keyword of BEARISH_KEYWORDS) {
    if (combinedText.includes(keyword.toLowerCase())) {
      bearish.push(keyword)
    }
  }

  return { bullish, bearish }
}

/**
 * Count specific pattern mentions across all sources
 */
export function countKeywordPatterns(
  sourceSentiments: Array<{ mentions: string[] }>
): AggregatedSentiment['keywordCounts'] {
  const allMentions = sourceSentiments.flatMap((s) => s.mentions).join(' ').toLowerCase()

  return {
    breakout: countPatternOccurrences(allMentions, ['breakout', 'emerging', 'ready to break out']),
    sleeper: countPatternOccurrences(allMentions, ['sleeper', 'hidden gem', 'undervalued', 'under the radar']),
    bust: countPatternOccurrences(allMentions, ['bust', 'overhyped', 'overvalued', 'going to disappoint']),
    avoid: countPatternOccurrences(allMentions, ['avoid', 'stay away', 'fade', 'do not draft']),
    concern: countPatternOccurrences(allMentions, ['concern', 'risk', 'red flag', 'worry', 'worrying']),
    value: countPatternOccurrences(allMentions, ['value', 'steal', 'bargain', 'discount', 'falling adp']),
  }
}

/**
 * Count occurrences of any pattern in text
 */
function countPatternOccurrences(text: string, patterns: string[]): number {
  let count = 0
  for (const pattern of patterns) {
    // Count non-overlapping occurrences
    let index = 0
    while ((index = text.indexOf(pattern.toLowerCase(), index)) !== -1) {
      count++
      index += pattern.length
    }
  }
  return count
}

/**
 * Aggregate sentiment data from multiple sources into consensus
 */
export function aggregateSentiment(
  sentimentData: SourceSentimentData[]
): AggregatedSentiment {
  if (sentimentData.length === 0) {
    return {
      sources: [],
      consensusSentiment: 'neutral',
      sentimentScore: 50,
      detectedKeywords: { bullish: [], bearish: [] },
      keywordCounts: {
        breakout: 0,
        sleeper: 0,
        bust: 0,
        avoid: 0,
        concern: 0,
        value: 0,
      },
    }
  }

  // Map source data
  const sources = sentimentData.map((s) => ({
    source: s.articleUrl?.split('/')[2] || 'unknown', // Extract domain as source name
    sentiment: s.sentiment,
    mentions: s.mentions,
    confidence: s.confidence,
    fetchedAt: s.publishedAt || new Date().toISOString(),
  }))

  // Calculate weighted average sentiment score
  let totalWeight = 0
  let weightedScore = 0

  for (const source of sentimentData) {
    const weight = source.confidence
    const score = sentimentToScore(source.sentiment)
    totalWeight += weight
    weightedScore += score * weight
  }

  const sentimentScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 50

  // Collect all mentions for keyword detection
  const allMentions = sentimentData.flatMap((s) => s.mentions)
  const detectedKeywords = extractKeywords(allMentions)

  // Count keyword patterns
  const keywordCounts = countKeywordPatterns(sources)

  return {
    sources,
    consensusSentiment: scoreToSentiment(sentimentScore),
    sentimentScore,
    detectedKeywords,
    keywordCounts,
  }
}

/**
 * Aggregate sentiment from per-source format (already keyed by source name)
 */
export function aggregateSentimentFromSources(
  sourceSentiments: Array<{
    source: string
    sentiment: 'bullish' | 'neutral' | 'bearish'
    mentions: string[]
    fetchedAt?: string
  }>
): AggregatedSentiment {
  if (sourceSentiments.length === 0) {
    return {
      sources: [],
      consensusSentiment: 'neutral',
      sentimentScore: 50,
      detectedKeywords: { bullish: [], bearish: [] },
      keywordCounts: {
        breakout: 0,
        sleeper: 0,
        bust: 0,
        avoid: 0,
        concern: 0,
        value: 0,
      },
    }
  }

  // Map to internal format with default confidence and fetchedAt
  const sources = sourceSentiments.map((s) => ({
    ...s,
    fetchedAt: s.fetchedAt || new Date().toISOString(),
    confidence: 0.8, // Default confidence for pre-aggregated sources
  }))

  // Calculate average sentiment score (equal weights for pre-aggregated)
  const scores = sources.map((s) => sentimentToScore(s.sentiment))
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  // Collect all mentions for keyword detection
  const allMentions = sourceSentiments.flatMap((s) => s.mentions)
  const detectedKeywords = extractKeywords(allMentions)

  // Count keyword patterns
  const keywordCounts = countKeywordPatterns(sourceSentiments)

  return {
    sources,
    consensusSentiment: scoreToSentiment(avgScore),
    sentimentScore: avgScore,
    detectedKeywords,
    keywordCounts,
  }
}

/**
 * Check if sentiment meets threshold for a specific tag type
 */
export function checkSentimentThreshold(
  aggregated: AggregatedSentiment,
  tagType: 'BREAKOUT' | 'SLEEPER' | 'BUST' | 'AVOID' | 'VALUE'
): { meets: boolean; sourceCount: number; reason: string } {
  switch (tagType) {
    case 'BREAKOUT':
      // 3+ sources mention "breakout" or "emerging"
      const breakoutCount = aggregated.keywordCounts.breakout
      return {
        meets: breakoutCount >= 3,
        sourceCount: breakoutCount,
        reason:
          breakoutCount >= 3
            ? `${breakoutCount} mentions of breakout/emerging keywords`
            : `Only ${breakoutCount} breakout mentions (need 3+)`,
      }

    case 'SLEEPER':
      // 2+ sources identify as undervalued
      const sleeperCount = aggregated.keywordCounts.sleeper + aggregated.keywordCounts.value
      return {
        meets: sleeperCount >= 2,
        sourceCount: sleeperCount,
        reason:
          sleeperCount >= 2
            ? `${sleeperCount} mentions of sleeper/value keywords`
            : `Only ${sleeperCount} sleeper mentions (need 2+)`,
      }

    case 'BUST':
      // 3+ sources express concern
      const bustCount = aggregated.keywordCounts.bust + aggregated.keywordCounts.concern
      return {
        meets: bustCount >= 3,
        sourceCount: bustCount,
        reason:
          bustCount >= 3
            ? `${bustCount} mentions of bust/concern keywords`
            : `Only ${bustCount} concern mentions (need 3+)`,
      }

    case 'AVOID':
      // Multiple red flags or explicit avoid mentions
      const avoidCount = aggregated.keywordCounts.avoid
      return {
        meets: avoidCount >= 2,
        sourceCount: avoidCount,
        reason:
          avoidCount >= 2
            ? `${avoidCount} explicit avoid recommendations`
            : `Only ${avoidCount} avoid mentions (need 2+)`,
      }

    case 'VALUE':
      // Value is primarily ADP-based, but sentiment can reinforce
      const valueCount = aggregated.keywordCounts.value
      return {
        meets: valueCount >= 2,
        sourceCount: valueCount,
        reason:
          valueCount >= 2
            ? `${valueCount} mentions of value/steal keywords`
            : `Only ${valueCount} value mentions`,
      }
  }
}
