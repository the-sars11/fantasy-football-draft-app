/**
 * target-pricing.ts — R6: wire the roster solver into STRATEGY target prices.
 *
 * A strategy is only real if its named targets actually fit $200 together, AND
 * the prices are ones Joe's room actually pays. This module assigns two dollar
 * numbers per `key_target`:
 *   - EXPECT: the player's expected ROOM price -- what Joe's league has actually
 *     paid for that positional rank across the 4-draft ledger (expectedRoomPrice).
 *     This is the honest "plan to pay" number, NOT a national value scaled to fit.
 *   - WALK-UP: expected room price + a small buffer (WALKUP_BUFFER) so a contested
 *     bid actually WINS rather than ties the room's average. Room price is the
 *     average winning bid, so bidding exactly it wins only about half the time.
 *
 * How it uses the solver (the R4/R5 engine, reused not re-invented):
 *   1. Each target is assigned to a roster slot (dedicated -> FLEX -> bench).
 *   2. `solveAllocation` computes the completion RESERVE for the remaining
 *      non-target slots — the same "keep enough to finish the roster" math the
 *      live max-bid uses. Here we ask for the guaranteed-completable floor
 *      ($1 per unfilled slot), so the sum invariant is a hard guarantee.
 *   3. Each target is priced at its expected room price. If the named targets
 *      collectively overflow the budget at real room prices, the CHEAPEST targets
 *      are dropped until the set fits — surfacing the honest truth that $200 only
 *      buys a couple of studs at room prices, rather than shrinking every stud
 *      below its real cost to make five of them appear affordable (the old bug).
 *
 * Invariant: sum(EXPECT prices) + reserve <= budget. Always a completable roster.
 *
 * Pure and $0 — no React, no network, no Claude. Deterministic.
 */

import type { Position, RosterSlots } from '@/lib/players/types'
import {
  solveAllocation,
  type BoardPlayer,
  type SlotsRemaining,
  type ReplacementCosts,
} from '@/lib/draft/roster-solver'

/** Flat $1 reserve per empty slot — the guaranteed-completable floor. */
const FLAT_REPLACEMENT: ReplacementCosts = {
  qb: 1, rb: 1, wr: 1, te: 1, dst: 1, bench: 1,
}

/**
 * Overpay buffer over the average room price so a contested bid actually wins.
 * Room price is the AVERAGE winning bid across Joe's 4 drafts, so bidding exactly
 * it wins only ~half the time; +10% clears most of the field without torching the
 * budget. Locked with Joe 2026-08-20 ("show both: expect + walk-up", ~10%).
 */
const WALKUP_BUFFER = 0.1

type DedicatedKey = 'qb' | 'rb' | 'wr' | 'te' | 'dst'

const POSITION_TO_DEDICATED: Record<Position, DedicatedKey | null> = {
  QB: 'qb', RB: 'rb', WR: 'wr', TE: 'te', DEF: 'dst', K: null,
}
const FLEX_ELIGIBLE = new Set<Position>(['RB', 'WR', 'TE'])

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TargetPrice {
  name: string
  position: Position
  /**
   * EXPECT: the price to plan on paying, >= 1. This is the room price after the
   * durability haircut (== baseValue when the player has no injury discount).
   */
  price: number
  /** WALK-UP: the max to bid to actually win a contested lot (expect +buffer). */
  walkUp: number
  /**
   * The un-adjusted room-price anchor (what Joe's league pays for this rank),
   * BEFORE any durability haircut. baseValue - price = the injury discount.
   */
  baseValue: number
  /**
   * Durability multiplier applied to baseValue to get price (1 = none, <1 =
   * fragile). Present so the report/UI can show "room $67, 0.89x durability".
   */
  durabilityFactor?: number
}

export interface TargetPricing {
  /** League budget the prices must fit within (e.g. 200). */
  budget: number
  /** One entry per priced target, in key_targets order. */
  prices: TargetPrice[]
  /** Sum of all target prices. */
  targetTotal: number
  /** $1-per-slot completion floor for the non-target roster slots. */
  reserve: number
  /** targetTotal + reserve — the full completable-roster cost. */
  total: number
  /** true when total <= budget (the roster is completable). */
  fits: boolean
}

// ─── Slot math ───────────────────────────────────────────────────────────────

/** Full remaining slots from the app-level RosterSlots (def -> dst, drop k/superflex). */
function toSlotsRemaining(config: RosterSlots): SlotsRemaining {
  return {
    qb: config.qb ?? 0,
    rb: config.rb ?? 0,
    wr: config.wr ?? 0,
    te: config.te ?? 0,
    flex: config.flex ?? 0,
    dst: config.def ?? 0,
    bench: config.bench ?? 0,
  }
}

/** Decrement the slot a target fills (dedicated -> FLEX -> bench), or null if full. */
function assignSlot(position: Position, slots: SlotsRemaining): SlotsRemaining | null {
  const dedicated = POSITION_TO_DEDICATED[position]

  if (dedicated && (slots[dedicated] ?? 0) > 0) {
    return { ...slots, [dedicated]: slots[dedicated] - 1 }
  }
  if (FLEX_ELIGIBLE.has(position) && (slots.flex ?? 0) > 0) {
    return { ...slots, flex: slots.flex - 1 }
  }
  if ((slots.bench ?? 0) > 0) {
    return { ...slots, bench: slots.bench - 1 }
  }
  return null
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * D6: minimal structural shape this module actually reads off a player.
 * Both `ConsensusPlayer` (prep-time research) and the live room's `Player`
 * (from `@/lib/players/types`) satisfy this without a cast -- narrowing the
 * param to only what's used lets the live room reuse this solver directly.
 *
 * `expectedRoomPrice` is the honest anchor (what Joe's room actually pays for
 * this player's positional rank); `consensusAuctionValue` is a national-value
 * fallback used only when the ledger has no room price for the player.
 */
export interface TargetPricingPlayer {
  name: string
  position: Position
  expectedRoomPrice?: number | null
  consensusAuctionValue?: number | null
  /**
   * Durability price multiplier in (0,1]; 1 (or absent) = no injury discount.
   * Resolved by the caller from the risk model (durabilityPriceFactor). Haircuts
   * the room anchor so the target price reflects games a fragile stud misses.
   */
  durabilityFactor?: number | null
}

export interface AssignTargetPricesInput {
  targetNames: string[]
  /** Accepted for call-site back-compat; no longer tilts price (room price is the anchor). */
  budgetAllocation?: Record<string, number>
  /** Accepted for call-site back-compat; no longer caps price (solvency does). */
  maxBidPercentage?: number
  players: TargetPricingPlayer[]
  rosterSlots: RosterSlots
  budget: number
}

/** The honest anchor: room price if the ledger has one, else national fallback. */
function anchorPrice(player: TargetPricingPlayer): number {
  const room = player.expectedRoomPrice
  if (typeof room === 'number' && Number.isFinite(room) && room >= 1) {
    return Math.round(room)
  }
  return Math.max(1, Math.round(player.consensusAuctionValue ?? 1))
}

/**
 * Clamp a caller-supplied durability factor into (0,1). Absent, invalid, or >= 1
 * -> 1 (no discount): durability only ever haircuts a price, never inflates it.
 */
function durabilityMultiplier(factor: number | null | undefined): number {
  if (typeof factor === 'number' && Number.isFinite(factor) && factor > 0 && factor < 1) {
    return factor
  }
  return 1
}

/**
 * Assign each key_target its EXPECT (room) price + a WALK-UP (room +buffer) price
 * so the full roster fits `budget`. Unknown or kicker targets are skipped. When
 * the named targets overflow the budget at real room prices, the cheapest are
 * dropped until the set fits. Prices are returned in input order.
 */
export function assignTargetPrices(input: AssignTargetPricesInput): TargetPricing {
  const { targetNames, players, rosterSlots, budget } = input

  // Resolve targets by name (case-insensitive), dedupe, skip unknown / kickers.
  const byName = new Map<string, TargetPricingPlayer>()
  for (const p of players) byName.set(p.name.toLowerCase(), p)

  const seen = new Set<string>()
  const resolved: Array<{
    name: string
    position: Position
    /** Un-adjusted room-price anchor. */
    baseValue: number
    /** Room anchor after the durability haircut (what counts against budget). */
    price: number
    /** The multiplier applied (1 = no discount). */
    durabilityFactor: number
  }> = []
  let slots = toSlotsRemaining(rosterSlots)

  for (const rawName of targetNames) {
    const key = rawName.toLowerCase()
    if (seen.has(key)) continue
    const player = byName.get(key)
    if (!player || player.position === 'K') continue

    // Only price a target that can actually claim a roster slot.
    const nextSlots = assignSlot(player.position, slots)
    if (nextSlots === null) continue
    slots = nextSlots
    seen.add(key)

    const roomValue = anchorPrice(player)
    const factor = durabilityMultiplier(player.durabilityFactor)
    resolved.push({
      name: player.name,
      position: player.position,
      baseValue: roomValue,
      // Haircut the room anchor for injury risk, floored at $1.
      price: Math.max(1, Math.round(roomValue * factor)),
      durabilityFactor: factor,
    })
  }

  // Reserve = solver's guaranteed-completable floor for the remaining slots.
  // Empty board -> every slot falls to $1 replacement -> reserve = slot count.
  // TOTAL draftable slots stays constant; when a target is dropped its slot
  // returns to reserve, so reserve = TOTAL - (kept target count) throughout.
  const reserveAfterAllTargets = solveAllocation({
    budgetRemaining: budget,
    slotsRemaining: slots,
    availablePlayers: [] as BoardPlayer[],
    replacementCosts: FLAT_REPLACEMENT,
    minPerSlot: 1,
  }).completionCost
  const totalSlots = reserveAfterAllTargets + resolved.length

  // Price each kept target at its room-price anchor. If the set overflows the
  // budget, drop the CHEAPEST target (its slot falls back to a $1 reserve slot)
  // and retry -- the honest "you can only afford a couple of studs" outcome,
  // never a below-room discount to squeeze more studs in.
  // price already carries the durability haircut; the budget math and drop order
  // both run on the adjusted price (what a target actually costs Joe).
  const kept = resolved.map((t) => ({ ...t }))
  const reserveFor = (n: number) => totalSlots - n
  const sumPrices = (rows: { price: number }[]) => rows.reduce((s, r) => s + r.price, 0)

  while (kept.length > 1 && sumPrices(kept) + reserveFor(kept.length) > budget) {
    let minIdx = 0
    for (let i = 1; i < kept.length; i++) if (kept[i].price < kept[minIdx].price) minIdx = i
    kept.splice(minIdx, 1)
  }

  // A single unaffordable stud is capped at the solvency ceiling (buy him, fill
  // the rest at $1) rather than dropped -- you CAN roster one $188 player in a
  // $200 / 13-slot league; you just spend almost everything on him.
  if (kept.length === 1) {
    const solvencyMax = Math.max(1, budget - reserveFor(1))
    if (kept[0].price > solvencyMax) kept[0].price = solvencyMax
  }

  const reserve = reserveFor(kept.length)
  const singleSlotMax = Math.max(1, budget - (totalSlots - 1))

  const prices: TargetPrice[] = kept.map((t) => ({
    name: t.name,
    position: t.position,
    price: t.price,
    // Walk-up = durability-adjusted expect + buffer, never below the expect price
    // and never past what a single slot can solvently absorb.
    walkUp: Math.min(singleSlotMax, Math.max(t.price, Math.round(t.price * (1 + WALKUP_BUFFER)))),
    baseValue: t.baseValue,
    // Only surface the factor when it actually discounted (< 1), so the
    // no-durability path stays byte-identical to before.
    ...(t.durabilityFactor < 1 ? { durabilityFactor: t.durabilityFactor } : {}),
  }))

  const targetTotal = prices.reduce((s, p) => s + p.price, 0)
  const total = targetTotal + reserve
  return {
    budget,
    prices,
    targetTotal,
    reserve,
    total,
    fits: total <= budget,
  }
}
