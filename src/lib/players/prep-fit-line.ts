/**
 * prep-fit-line.ts — R7b
 *
 * Pure, $0 helpers that build the per-player strategy-fit line shown on the
 * Players browser in prep mode. Uses the solver-derived max-bid from a fresh
 * $200 / all-13-slots board to answer "how deep can Joe go on this player
 * without crippling the rest of his roster?"
 *
 * No React. No Supabase. No em-dashes (Joe's copy rule).
 */

import type { RosterConstrainedMaxBid, SlotAssignment } from '@/lib/draft/roster-solver'

const STARTER_ORDER: SlotAssignment['slotType'][] = ['QB', 'RB', 'WR', 'TE', 'DST', 'FLEX']

/** Summarise the non-bench slots remaining, e.g. "QB and 2 FLEX". Empty when none. */
export function buildSlotSummary(assignments: SlotAssignment[]): string {
  const counts: Partial<Record<string, number>> = {}
  for (const a of assignments) {
    if (a.slotType !== 'BENCH') {
      counts[a.slotType] = (counts[a.slotType] ?? 0) + 1
    }
  }

  const parts = STARTER_ORDER
    .filter(s => (counts[s] ?? 0) > 0)
    .map(s => {
      const n = counts[s]!
      return n > 1 ? `${n} ${s}` : s
    })

  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * Build the strategy-fit line for a single player in prep mode.
 * Solver result comes from computeRosterConstrainedMaxBid on a full $200 board.
 *
 * Examples:
 *   "Your target -- can bid up to $67, still needs QB and 2 FLEX"
 *   "Flagged to avoid -- can afford at $50 on a full board if reconsidering"
 *   "Can bid up to $42 on a full $200 board, still needs QB, RB and 2 FLEX"
 *   "No open slot for RB on a full roster"
 */
export function buildPrepFitLine(
  position: string,
  result: RosterConstrainedMaxBid,
  isTarget: boolean,
  isAvoid: boolean,
): string {
  if (!result.feasible && result.bestRestOfRoster.length === 0) {
    return `No open slot for ${position} on a full roster`
  }

  const maxBidStr = `$${result.maxBid}`
  const slotSummary = buildSlotSummary(result.bestRestOfRoster)
  const slotNote = slotSummary ? `, still needs ${slotSummary}` : ''

  if (isTarget) {
    return `Your target -- can bid up to ${maxBidStr}${slotNote}`
  }

  if (isAvoid) {
    return `Flagged to avoid -- can afford at ${maxBidStr} on a full board if reconsidering`
  }

  return `Can bid up to ${maxBidStr} on a full $200 board${slotNote}`
}
