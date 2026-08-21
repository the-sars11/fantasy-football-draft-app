/**
 * leaderboard.ts - W1: pure ranking + target-price resolution for the Strategy
 * Leaderboard screen (`/prep/leaderboard`). No React, no network, no Claude -
 * everything here reads the already-published `ResearchDataset` (W0) and
 * derives display-ready shapes. Nothing invents a number: a target with no
 * `target_pricing` entry falls back to the `EnrichedPlayer`'s own consensus/
 * expected price, labeled plainly via `source`.
 */

import type { DatasetStrategy, EnrichedPlayer } from './dataset-types'
import type { TargetPricing } from './strategy/target-pricing'
import type { Position } from '@/lib/players/types'

/**
 * Rank strategies DESCENDING by `sim.grade.meanWins` (the headline "who wins
 * more" number). Ties break to the strategy with the higher modal-record win
 * total, then alphabetically by proposal name - a stable, deterministic order
 * so rank #1 never flickers between equal-strength strategies on a re-render.
 */
export function rankStrategies(strategies: DatasetStrategy[]): DatasetStrategy[] {
  return [...strategies].sort((a, b) => {
    const meanWinsDiff = b.sim.grade.meanWins - a.sim.grade.meanWins
    if (meanWinsDiff !== 0) return meanWinsDiff

    const modalDiff = b.sim.grade.modalRecord.wins - a.sim.grade.modalRecord.wins
    if (modalDiff !== 0) return modalDiff

    return a.proposal.name.localeCompare(b.proposal.name)
  })
}

/** Where a resolved target price came from - drives the plain-English label. */
export type TargetPriceSource = 'solver' | 'consensus' | 'unknown'

/**
 * A key_target's price, ready to render. `price` is the number to lead with
 * (the durability-adjusted solver EXPECT price when one exists, otherwise the
 * player's own consensus/expected room price). `roomPrice` and
 * `durabilityFactor` are only populated on the solver path, where the
 * pre-discount room anchor is a real, separately-meaningful number (e.g.
 * McCaffrey: price ~$60 after his durability haircut, roomPrice ~$67 before it).
 */
export interface ResolvedTargetPrice {
  name: string
  position: Position | null
  price: number | null
  roomPrice: number | null
  walkUp: number | null
  durabilityFactor: number | null
  source: TargetPriceSource
}

/**
 * Resolve one `key_targets` name to a display price. Checks the strategy's
 * solver-fit `target_pricing` first (the real durability-discounted number);
 * falls back to the matching `EnrichedPlayer`'s own expected room price or
 * consensus auction value when the solver dropped or never priced this name
 * (e.g. it didn't make the affordable set, or the target list includes a
 * name outside `target_pricing.prices`). Returns an all-null/`unknown` shape
 * only when the name matches no player in the dataset at all - never a
 * fabricated number.
 */
export function resolveTargetPrice(
  name: string,
  targetPricing: TargetPricing | undefined,
  players: EnrichedPlayer[],
): ResolvedTargetPrice {
  const key = name.toLowerCase()

  const priced = targetPricing?.prices.find((p) => p.name.toLowerCase() === key)
  if (priced) {
    return {
      name: priced.name,
      position: priced.position,
      price: priced.price,
      roomPrice: priced.baseValue,
      walkUp: priced.walkUp,
      durabilityFactor: priced.durabilityFactor ?? null,
      source: 'solver',
    }
  }

  const player = players.find((p) => p.name.toLowerCase() === key)
  if (player) {
    const consensus = player.expectedRoomPrice ?? player.consensusAuctionValue ?? null
    return {
      name: player.name,
      position: player.position,
      price: consensus,
      roomPrice: null,
      walkUp: null,
      durabilityFactor: null,
      source: 'consensus',
    }
  }

  return {
    name,
    position: null,
    price: null,
    roomPrice: null,
    walkUp: null,
    durabilityFactor: null,
    source: 'unknown',
  }
}
