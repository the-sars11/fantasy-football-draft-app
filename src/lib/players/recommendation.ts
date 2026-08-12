/**
 * recommendation.ts - FB-13. One deterministic, league-specific line per player.
 *
 * The single sentence Joe reads mid-auction: what to do and the dollar to do it
 * at. It is derived ENTIRELY from the calibrated signals already computed
 * elsewhere (the value RANGE from value-range.ts + the tag taxonomy from
 * tags.ts) - no new data, no LLM, no cost. Same inputs always produce the same
 * line, so it's unit-testable and never drifts.
 *
 * Priority (first match wins - Joe gets ONE instruction, not a paragraph):
 *   1. ELITE      → anchor, pay to the top of the band
 *   2. POCKET     → target, win at/under the midpoint
 *   3. TAX        → let him go, the room overpays
 *   4. SLEEPER    → cheap bench upside
 *   5. default    → fair value, here's the band
 * An active INJURY tag appends a short caution unless the line already says pass.
 *
 * Pure + deterministic → unit-tested in recommendation.test.ts.
 */

import type { Player } from './types'
import { computeValueRange } from './value-range'
import { computePlayerTags } from './tags'

export interface PlayerRecommendation {
  /** The one line shown on the card. */
  line: string
  /** Coarse intent, for optional card styling. */
  intent: 'anchor' | 'target' | 'pass' | 'flier' | 'fair'
}

export function computeRecommendation(p: Player): PlayerRecommendation {
  const range = computeValueRange(p)
  const tags = computePlayerTags(p)
  const has = (id: string) => tags.some((t) => t.id === id)
  const injured = has('injury')

  let intent: PlayerRecommendation['intent']
  let line: string

  if (has('elite')) {
    intent = 'anchor'
    line = `Anchor - pay up to $${range.high} to lock a Tier 1 player.`
  } else if (has('pocket')) {
    intent = 'target'
    line = `Target - worth ~$${p.ceilingValue}, room pays ~$${p.expectedRoomPrice}. Win him at or under $${range.base}.`
  } else if (has('tax')) {
    intent = 'pass'
    line = `Let him go - room pays ~$${p.expectedRoomPrice} over his ~$${p.ceilingValue} worth here.`
  } else if (has('sleeper')) {
    intent = 'flier'
    line = `Late flier - a $${range.low}-$${range.high} bench dollar with real upside.`
  } else {
    intent = 'fair'
    line =
      range.low === range.high
        ? `Fair value ~$${range.base}.`
        : `Fair value ~$${range.base} (band $${range.low}-$${range.high}).`
  }

  // Injury caution - skip if we're already saying pass (redundant).
  if (injured && intent !== 'pass') {
    line += ` Watch the injury tag - trim the bid.`
  }

  return { line, intent }
}
