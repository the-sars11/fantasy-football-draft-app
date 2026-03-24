/**
 * Player Intelligence System - Tag Detection
 *
 * Detects system tags (BREAKOUT, SLEEPER, VALUE, BUST, AVOID) based on:
 * - Multi-source sentiment analysis
 * - ADP vs projection rank gaps
 * - ECR standard deviation (expert disagreement)
 *
 * Detection Rules (from plan):
 * - BREAKOUT: 3+ sources mention "breakout" or "emerging" → +15
 * - SLEEPER: 2+ sources identify as undervalued OR ECR std dev > 20 → +10
 * - VALUE: ADP rank > projection rank by 10+ spots → +12
 * - BUST: 3+ sources express concern → -20
 * - AVOID: ADP < projection by 10+ spots OR multiple red flags → -25
 */

import type {
  SystemTagType,
  TagDetectionInput,
  DetectedTag,
  TAG_SCORE_MODIFIERS,
} from './types'
import {
  aggregateSentimentFromSources,
  checkSentimentThreshold,
  type AggregatedSentiment,
} from './sentiment'

// --- Detection Thresholds ---

export const TAG_DETECTION_CONFIG = {
  BREAKOUT: {
    minSourceMentions: 3,
    keywords: ['breakout', 'emerging', 'ascending', 'ready to explode'],
    scoreModifier: 15,
  },
  SLEEPER: {
    minSourceMentions: 2,
    ecrStdDevThreshold: 20,
    keywords: ['sleeper', 'undervalued', 'hidden gem', 'value'],
    scoreModifier: 10,
  },
  VALUE: {
    adpGapThreshold: 10, // ADP rank > projection rank by this many spots
    keywords: ['value', 'steal', 'bargain'],
    scoreModifier: 12,
  },
  BUST: {
    minSourceMentions: 3,
    keywords: ['bust', 'overvalued', 'concern', 'declining'],
    scoreModifier: -20,
  },
  AVOID: {
    adpGapThreshold: -10, // ADP < projection by 10+ spots (negative = overpriced)
    minRedFlags: 2,
    keywords: ['avoid', 'fade', 'stay away'],
    scoreModifier: -25,
  },
} as const

// --- Individual Tag Detectors ---

/**
 * Detect BREAKOUT tag: Player with strong breakout potential
 * Criteria: 3+ sources mention breakout/emerging keywords
 */
export function detectBreakout(
  input: TagDetectionInput,
  aggregatedSentiment: AggregatedSentiment
): DetectedTag | null {
  const check = checkSentimentThreshold(aggregatedSentiment, 'BREAKOUT')

  if (!check.meets) {
    return null
  }

  // Gather contributing sources
  const contributingSources = aggregatedSentiment.sources
    .filter((s) =>
      s.mentions.some((m) =>
        TAG_DETECTION_CONFIG.BREAKOUT.keywords.some((k) =>
          m.toLowerCase().includes(k.toLowerCase())
        )
      )
    )
    .map((s) => s.source)

  // Dedupe sources
  const uniqueSources = Array.from(new Set(contributingSources))

  return {
    tag: 'BREAKOUT',
    confidence: Math.min(0.9, 0.6 + uniqueSources.length * 0.1),
    sources: uniqueSources,
    reasoning: check.reason,
    scoreModifier: TAG_DETECTION_CONFIG.BREAKOUT.scoreModifier,
  }
}

/**
 * Detect SLEEPER tag: Undervalued player flying under the radar
 * Criteria: 2+ sources identify as undervalued OR ECR std dev > 20
 */
export function detectSleeper(
  input: TagDetectionInput,
  aggregatedSentiment: AggregatedSentiment
): DetectedTag | null {
  const sentimentCheck = checkSentimentThreshold(aggregatedSentiment, 'SLEEPER')

  // Check ECR standard deviation (high disagreement = potential sleeper)
  const highEcrVariance =
    input.ecrStdDev !== null && input.ecrStdDev > TAG_DETECTION_CONFIG.SLEEPER.ecrStdDevThreshold

  if (!sentimentCheck.meets && !highEcrVariance) {
    return null
  }

  const reasons: string[] = []
  const contributingSources: string[] = []

  if (sentimentCheck.meets) {
    reasons.push(sentimentCheck.reason)
    contributingSources.push(
      ...aggregatedSentiment.sources
        .filter((s) =>
          s.mentions.some((m) =>
            TAG_DETECTION_CONFIG.SLEEPER.keywords.some((k) =>
              m.toLowerCase().includes(k.toLowerCase())
            )
          )
        )
        .map((s) => s.source)
    )
  }

  if (highEcrVariance) {
    reasons.push(`High ECR variance (std dev: ${input.ecrStdDev?.toFixed(1)})`)
    contributingSources.push('ecr_analysis')
  }

  const uniqueSources = Array.from(new Set(contributingSources))

  return {
    tag: 'SLEEPER',
    confidence: Math.min(0.85, 0.5 + (sentimentCheck.meets ? 0.2 : 0) + (highEcrVariance ? 0.2 : 0)),
    sources: uniqueSources,
    reasoning: reasons.join('; '),
    scoreModifier: TAG_DETECTION_CONFIG.SLEEPER.scoreModifier,
  }
}

/**
 * Detect VALUE tag: Market inefficiency - player is underpriced
 * Criteria: ADP rank > projection rank by 10+ spots (going later than expected)
 */
export function detectValue(
  input: TagDetectionInput,
  aggregatedSentiment: AggregatedSentiment
): DetectedTag | null {
  // ADP gap: positive = going later than projected (underpriced)
  const adpGap =
    input.adp !== null
      ? input.adp - input.consensusRank
      : null

  if (adpGap === null || adpGap < TAG_DETECTION_CONFIG.VALUE.adpGapThreshold) {
    return null
  }

  // Check for reinforcing sentiment (optional boost to confidence)
  const sentimentCheck = checkSentimentThreshold(aggregatedSentiment, 'VALUE')
  const hasValueSentiment = sentimentCheck.meets

  return {
    tag: 'VALUE',
    confidence: Math.min(0.95, 0.7 + (hasValueSentiment ? 0.15 : 0)),
    sources: ['adp_analysis', ...(hasValueSentiment ? ['sentiment'] : [])],
    reasoning: `ADP ${input.adp} vs rank ${input.consensusRank} (${adpGap} spots later)${
      hasValueSentiment ? ' + value sentiment' : ''
    }`,
    scoreModifier: TAG_DETECTION_CONFIG.VALUE.scoreModifier,
    adpGap,
  }
}

/**
 * Detect BUST tag: Player likely to underperform expectations
 * Criteria: 3+ sources express concern about performance
 */
export function detectBust(
  input: TagDetectionInput,
  aggregatedSentiment: AggregatedSentiment
): DetectedTag | null {
  const check = checkSentimentThreshold(aggregatedSentiment, 'BUST')

  if (!check.meets) {
    return null
  }

  const contributingSources = aggregatedSentiment.sources
    .filter((s) =>
      s.mentions.some((m) =>
        TAG_DETECTION_CONFIG.BUST.keywords.some((k) =>
          m.toLowerCase().includes(k.toLowerCase())
        )
      )
    )
    .map((s) => s.source)

  const uniqueSources = Array.from(new Set(contributingSources))

  return {
    tag: 'BUST',
    confidence: Math.min(0.85, 0.55 + uniqueSources.length * 0.1),
    sources: uniqueSources,
    reasoning: check.reason,
    scoreModifier: TAG_DETECTION_CONFIG.BUST.scoreModifier,
  }
}

/**
 * Detect AVOID tag: Strong recommendation to avoid at current price
 * Criteria: ADP < projection by 10+ spots (overpriced) OR multiple red flags
 */
export function detectAvoid(
  input: TagDetectionInput,
  aggregatedSentiment: AggregatedSentiment
): DetectedTag | null {
  const reasons: string[] = []
  const sources: string[] = []
  let confidence = 0.5

  // Check ADP gap: negative = going earlier than projected (overpriced)
  const adpGap =
    input.adp !== null
      ? input.adp - input.consensusRank
      : null

  const isOverpriced =
    adpGap !== null && adpGap < TAG_DETECTION_CONFIG.AVOID.adpGapThreshold

  if (isOverpriced) {
    reasons.push(`ADP ${input.adp} vs rank ${input.consensusRank} (${Math.abs(adpGap!)} spots early)`)
    sources.push('adp_analysis')
    confidence += 0.2
  }

  // Check for explicit avoid sentiment
  const avoidCheck = checkSentimentThreshold(aggregatedSentiment, 'AVOID')
  if (avoidCheck.meets) {
    reasons.push(avoidCheck.reason)
    sources.push('sentiment')
    confidence += 0.2
  }

  // Check for multiple red flags (bust + avoid keywords)
  const redFlagCount =
    aggregatedSentiment.keywordCounts.bust +
    aggregatedSentiment.keywordCounts.avoid +
    aggregatedSentiment.keywordCounts.concern

  if (redFlagCount >= TAG_DETECTION_CONFIG.AVOID.minRedFlags) {
    reasons.push(`${redFlagCount} red flag mentions`)
    sources.push('red_flag_analysis')
    confidence += 0.15
  }

  // Need at least one trigger to assign AVOID
  if (reasons.length === 0) {
    return null
  }

  // AVOID requires strong evidence - at least two triggers or one very strong one
  if (!isOverpriced && !avoidCheck.meets && redFlagCount < 3) {
    return null
  }

  return {
    tag: 'AVOID',
    confidence: Math.min(0.9, confidence),
    sources: Array.from(new Set(sources)),
    reasoning: reasons.join('; '),
    scoreModifier: TAG_DETECTION_CONFIG.AVOID.scoreModifier,
    adpGap: adpGap ?? undefined,
  }
}

// --- Main Detection Function ---

/**
 * Detect all applicable system tags for a player
 */
export function detectTags(input: TagDetectionInput): DetectedTag[] {
  // Aggregate sentiment from input sources
  const aggregatedSentiment = aggregateSentimentFromSources(input.sentimentSources)

  const tags: DetectedTag[] = []

  // Run all detectors
  const breakout = detectBreakout(input, aggregatedSentiment)
  if (breakout) tags.push(breakout)

  const sleeper = detectSleeper(input, aggregatedSentiment)
  if (sleeper) tags.push(sleeper)

  const value = detectValue(input, aggregatedSentiment)
  if (value) tags.push(value)

  const bust = detectBust(input, aggregatedSentiment)
  if (bust) tags.push(bust)

  const avoid = detectAvoid(input, aggregatedSentiment)
  if (avoid) tags.push(avoid)

  // Handle conflicting tags - prioritize stronger signals
  return resolveTagConflicts(tags)
}

/**
 * Resolve conflicting tags (e.g., VALUE + AVOID shouldn't both appear)
 */
function resolveTagConflicts(tags: DetectedTag[]): DetectedTag[] {
  const tagMap = new Map<SystemTagType, DetectedTag>()
  for (const tag of tags) {
    tagMap.set(tag.tag, tag)
  }

  // Rule: If both VALUE and AVOID detected, keep the one with higher confidence
  if (tagMap.has('VALUE') && tagMap.has('AVOID')) {
    const value = tagMap.get('VALUE')!
    const avoid = tagMap.get('AVOID')!

    if (value.confidence >= avoid.confidence) {
      tagMap.delete('AVOID')
    } else {
      tagMap.delete('VALUE')
    }
  }

  // Rule: If both BREAKOUT and BUST detected, keep the one with higher confidence
  if (tagMap.has('BREAKOUT') && tagMap.has('BUST')) {
    const breakout = tagMap.get('BREAKOUT')!
    const bust = tagMap.get('BUST')!

    if (breakout.confidence >= bust.confidence) {
      tagMap.delete('BUST')
    } else {
      tagMap.delete('BREAKOUT')
    }
  }

  // Rule: SLEEPER is compatible with VALUE but not AVOID
  if (tagMap.has('SLEEPER') && tagMap.has('AVOID')) {
    tagMap.delete('SLEEPER')
  }

  return Array.from(tagMap.values())
}

/**
 * Get the most impactful tag for compact display
 * Priority: BREAKOUT > VALUE > SLEEPER > BUST > AVOID
 */
export function getMostImpactfulTag(tags: DetectedTag[]): DetectedTag | null {
  if (tags.length === 0) return null

  const priority: SystemTagType[] = ['BREAKOUT', 'VALUE', 'SLEEPER', 'BUST', 'AVOID']

  for (const tagType of priority) {
    const tag = tags.find((t) => t.tag === tagType)
    if (tag) return tag
  }

  return tags[0]
}

/**
 * Calculate total score modifier from all tags
 */
export function calculateTotalModifier(tags: DetectedTag[]): number {
  return tags.reduce((sum, tag) => sum + tag.scoreModifier, 0)
}
