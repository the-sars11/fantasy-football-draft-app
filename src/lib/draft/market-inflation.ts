/**
 * market-inflation.ts - measure, live, how much Joe's room is over/under-paying
 * for each position RIGHT NOW versus the pre-draft expected room price.
 *
 * This is the "the league decided to overpay for RB this year" detector. It reads
 * only what has actually cleared the auction (sold players + their price) against
 * each sold player's own baseline room price. No national curves, no fabrication -
 * every dollar traces to a real pick and a real pre-draft price.
 *
 * Per position:
 *   rawMultiplier = sum(actualPrice) / sum(baselineRoom)   over sold players
 *     > 1  -> the room is paying OVER baseline for this position (running hot)
 *     < 1  -> the room is letting this position go cheap (soft)
 *
 * The raw ratio is dollar-weighted (a $60 RB going for $72 moves it more than a
 * $2 RB going for $3) - that is the inflation on the money, which is what a bid
 * decision cares about.
 *
 * Early in the draft one or two sales is noise, so the raw ratio is SHRUNK toward
 * 1.0 by sample size:
 *   multiplier = 1 + (rawMultiplier - 1) * n / (n + PRIOR_STRENGTH)
 * With n=1 sale and PRIOR_STRENGTH=4, an observed +50% only shows as +10%; by
 * n=12 sales it shows as +37%. The board reacts, but not to a single outlier.
 *
 * Pure + deterministic -> unit-tested in market-inflation.test.ts.
 */

import type { Position } from '@/lib/players/types'

/** How many "baseline" sales of prior belief to blend in before trusting the ratio. */
export const DEFAULT_PRIOR_STRENGTH = 4

/** A single cleared auction result, joined to its pre-draft baseline room price. */
export interface SoldPlayer {
  position: Position
  /** What the player actually sold for. */
  actualPrice: number
  /** The pre-draft expectedRoomPrice for this player (what the room was modeled to pay). */
  baselineRoom: number
}

export interface PositionInflation {
  /** Sample-size-shrunk multiplier applied to a position's room prices (1 = neutral). */
  multiplier: number
  /** Unshrunk sum(actual)/sum(baseline) - the raw observed inflation. */
  rawMultiplier: number
  /** Number of priced sales observed for this position. */
  soldCount: number
  /** Total actual dollars spent on this position. */
  actualSpent: number
  /** Total baseline room dollars for those same sold players. */
  baselineSpent: number
}

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

function neutral(): PositionInflation {
  return { multiplier: 1, rawMultiplier: 1, soldCount: 0, actualSpent: 0, baselineSpent: 0 }
}

/**
 * Compute per-position live inflation from the sold players so far. Positions with
 * no priced sales (or zero baseline dollars) return a neutral 1.0 multiplier.
 * Only players with a positive baseline room price count - a $0-baseline scrub
 * carries no inflation signal and would divide by zero.
 */
export function computeMarketInflation(
  sold: SoldPlayer[],
  opts: { priorStrength?: number } = {},
): Record<Position, PositionInflation> {
  const priorStrength = opts.priorStrength ?? DEFAULT_PRIOR_STRENGTH

  const result = {} as Record<Position, PositionInflation>
  for (const pos of POSITIONS) result[pos] = neutral()

  // Accumulate actual + baseline dollars per position.
  const acc = {} as Record<Position, { actual: number; baseline: number; count: number }>
  for (const pos of POSITIONS) acc[pos] = { actual: 0, baseline: 0, count: 0 }

  for (const s of sold) {
    if (!(s.baselineRoom > 0)) continue // no signal / avoid divide-by-zero
    if (!(s.actualPrice >= 0)) continue
    const bucket = acc[s.position]
    if (!bucket) continue
    bucket.actual += s.actualPrice
    bucket.baseline += s.baselineRoom
    bucket.count += 1
  }

  for (const pos of POSITIONS) {
    const { actual, baseline, count } = acc[pos]
    if (count === 0 || baseline <= 0) continue

    const raw = actual / baseline
    const shrink = count / (count + priorStrength)
    const multiplier = 1 + (raw - 1) * shrink

    result[pos] = {
      multiplier,
      rawMultiplier: raw,
      soldCount: count,
      actualSpent: actual,
      baselineSpent: baseline,
    }
  }

  return result
}
