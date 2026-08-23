/**
 * value-range.ts - FB-10. A defensible auction-value RANGE, not a single point.
 *
 * WHY A RANGE: at a live auction "he's worth $X" is a lie of false precision.
 * What Joe actually needs is a sensible-bid BAND: a floor he'd happily win at
 * and a ceiling he will not cross. The band below is built from two REAL,
 * separately-sourced dollar figures already on the Player from the S2 (P3)
 * engine - nothing here is an invented ±% spread.
 *
 * THE MODEL (source: 'league'):
 *   ceiling = riskAdjustedCeiling ?? ceilingValue - genuine worth in Nasties
 *                                 full-PPR/no-K scoring (roster-aware VORP $,
 *                                 budget-balanced to $2,400), after the VAL-2.3
 *                                 injury haircut so the band and the POCKET star
 *                                 agree; raw ceilingValue for rows without one (DEF).
 *   room    = expectedRoomPrice - what Joe's 12-team room has historically PAID
 *                                 for this positional rank (16-yr Nasties ledger)
 *   low  = min(ceiling, room)   - the cheaper of "his worth" and "what it costs"
 *   high = max(ceiling, room)   - the dearer of the two
 *   base = round((ceiling + room) / 2)  - fair-value midpoint; the SAME anchor
 *                                 VAL-3 (auction-advisor) uses for max-bid
 *
 * Both endpoints are real sourced numbers, so the band's WIDTH is itself a
 * signal: a wide band = worth and market disagree (a value pocket or a room
 * tax); a tight band = the market prices him about right.
 *
 * FALLBACK (source: 'national'): rows without a calibrated ceiling/room (DEF, or
 * any legacy/unranked row) use the FantasyPros ECR-modeled valueRange already on
 * the Player. That band is modeled from national expert-rank disagreement - good
 * enough to render, but NOT Joe's room, so it is labeled distinctly.
 *
 * DEGENERATE (source: 'point'): if neither exists, low = base = high =
 * consensusAuctionValue. We never render a fabricated spread around a bare point.
 *
 * Pure + deterministic → unit-tested in value-range.test.ts. No I/O, no cost.
 */

import type { Player } from './types'

export type ValueRangeSource = 'league' | 'national' | 'point'

export interface CalibratedValueRange {
  low: number
  base: number
  high: number
  /** Where the band came from - drives the in-app "how this is calculated" note. */
  source: ValueRangeSource
}

/**
 * Compute the display value range for a player from the real fields already on
 * it. See the file header for the model. Deterministic; safe on partial rows.
 */
export function computeValueRange(p: Player): CalibratedValueRange {
  // Use the injury-risk-adjusted worth (VAL-2.3) when present so the band's high
  // end and the POCKET star are driven by the SAME worth; fall back to raw ceiling
  // for rows that have none (DEF / unpriced).
  const ceiling = p.riskAdjustedCeiling ?? p.ceilingValue
  const room = p.expectedRoomPrice

  // LEAGUE band - both real Nasties-calibrated dollars present and the worth is
  // a genuine positive figure (a ranked-but-unpriced row has ceiling 0).
  if (typeof ceiling === 'number' && ceiling > 0 && typeof room === 'number') {
    const low = Math.min(ceiling, room)
    const high = Math.max(ceiling, room)
    const base = Math.round((ceiling + room) / 2)
    return { low, base, high, source: 'league' }
  }

  // NATIONAL band - FantasyPros ECR-modeled range (not Joe's room, labeled so).
  const nat = p.valueRange
  if (
    nat &&
    Number.isFinite(nat.low) &&
    Number.isFinite(nat.base) &&
    Number.isFinite(nat.high)
  ) {
    // Guard ordering - national data is generally sane but never trust blind.
    const low = Math.min(nat.low, nat.base, nat.high)
    const high = Math.max(nat.low, nat.base, nat.high)
    const base = Math.min(Math.max(nat.base, low), high)
    return { low, base, high, source: 'national' }
  }

  // DEGENERATE - a single honest point, no fake spread.
  const point = Math.max(0, Math.round(p.consensusAuctionValue || 0))
  return { low: point, base: point, high: point, source: 'point' }
}
