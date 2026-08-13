/**
 * target-pricing.ts — R6: wire the roster solver into STRATEGY target prices.
 *
 * A strategy is only real if its named targets actually fit $200 together. This
 * module assigns a target $ per `key_target` player so the FULL roster is
 * completable within budget, and re-allocates the money when the archetype
 * changes (different targets + different budget emphasis + different reserve).
 *
 * How it uses the solver (the R4/R5 engine, reused not re-invented):
 *   1. Each target is assigned to a roster slot (dedicated -> FLEX -> bench).
 *   2. `solveAllocation` computes the completion RESERVE for the remaining
 *      non-target slots — the same "keep enough to finish the roster" math the
 *      live max-bid uses. Here we ask for the guaranteed-completable floor
 *      ($1 per unfilled slot), so the sum invariant is a hard guarantee.
 *   3. The freed pool (budget - reserve) is distributed across the targets,
 *      weighted by base auction value x the archetype's position-budget
 *      emphasis, capped by max_bid_percentage, floored at $1, and scaled down
 *      to fit if the strategy over-reaches.
 *
 * Invariant: sum(target prices) + reserve <= budget. Always a completable roster.
 *
 * Pure and $0 — no React, no network, no Claude. Deterministic.
 */

import type { ConsensusPlayer } from '@/lib/research/normalize'
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

/** Neutral budget share (%) — a position at this share gets a 1.0x multiplier. */
const NEUTRAL_BUDGET_PCT = 15
const EMPHASIS_MIN = 0.7
const EMPHASIS_MAX = 1.8
/** Fallback max single-bid share when the strategy omits max_bid_percentage. */
const DEFAULT_MAX_BID_PCT = 35

type DedicatedKey = 'qb' | 'rb' | 'wr' | 'te' | 'dst'

const POSITION_TO_DEDICATED: Record<Position, DedicatedKey | null> = {
  QB: 'qb', RB: 'rb', WR: 'wr', TE: 'te', DEF: 'dst', K: null,
}
const FLEX_ELIGIBLE = new Set<Position>(['RB', 'WR', 'TE'])

/** budget_allocation keys DEF as 'DST' (DB convention); players key it 'DEF'. */
function budgetKeyFor(position: Position): string {
  return position === 'DEF' ? 'DST' : position
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TargetPrice {
  name: string
  position: Position
  /** Solver-fit target dollar amount for this player (>= 1). */
  price: number
  /** Base consensus auction value the price is anchored to. */
  baseValue: number
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

// ─── Emphasis ────────────────────────────────────────────────────────────────

/** Archetype position-budget tilt, clamped so studs never blow up or vanish. */
function positionEmphasis(
  budgetAllocation: Record<string, number> | undefined,
  position: Position,
): number {
  const pct = budgetAllocation?.[budgetKeyFor(position)] ?? NEUTRAL_BUDGET_PCT
  const raw = pct / NEUTRAL_BUDGET_PCT
  return Math.min(EMPHASIS_MAX, Math.max(EMPHASIS_MIN, raw))
}

// ─── Main ────────────────────────────────────────────────────────────────────

export interface AssignTargetPricesInput {
  targetNames: string[]
  budgetAllocation?: Record<string, number>
  maxBidPercentage?: number
  players: ConsensusPlayer[]
  rosterSlots: RosterSlots
  budget: number
}

/**
 * Assign a solver-fit target $ per key_target so the full roster fits `budget`.
 * Unknown or kicker targets are skipped. Prices are returned in input order.
 */
export function assignTargetPrices(input: AssignTargetPricesInput): TargetPricing {
  const { targetNames, budgetAllocation, maxBidPercentage, players, rosterSlots, budget } = input

  // Resolve targets by name (case-insensitive), dedupe, skip unknown / kickers.
  const byName = new Map<string, ConsensusPlayer>()
  for (const p of players) byName.set(p.name.toLowerCase(), p)

  const seen = new Set<string>()
  const resolved: Array<{ name: string; position: Position; baseValue: number }> = []
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

    resolved.push({
      name: player.name,
      position: player.position,
      baseValue: Math.max(1, Math.round(player.consensusAuctionValue ?? 1)),
    })
  }

  // Reserve = solver's guaranteed-completable floor for the remaining slots.
  // Empty board -> every slot falls to $1 replacement -> reserve = slot count.
  const reserve = solveAllocation({
    budgetRemaining: budget,
    slotsRemaining: slots,
    availablePlayers: [] as BoardPlayer[],
    replacementCosts: FLAT_REPLACEMENT,
    minPerSlot: 1,
  }).completionCost

  const pool = Math.max(0, budget - reserve)
  const maxBidDollars = Math.max(
    1,
    Math.round((budget * (maxBidPercentage ?? DEFAULT_MAX_BID_PCT)) / 100),
  )

  // Desired price = base value x archetype emphasis, capped by max single bid.
  const desired = resolved.map((t) => {
    const emphasis = positionEmphasis(budgetAllocation, t.position)
    const raw = Math.round(t.baseValue * emphasis)
    return Math.min(maxBidDollars, Math.max(1, raw))
  })

  // Scale down proportionally if the strategy over-reaches the pool.
  const sumDesired = desired.reduce((s, d) => s + d, 0)
  let priced = desired.slice()
  if (sumDesired > pool && sumDesired > 0) {
    const scale = pool / sumDesired
    priced = desired.map((d) => Math.max(1, Math.round(d * scale)))
  }

  // Hard-enforce the invariant: trim $1 from the largest prices until the target
  // total fits the pool (rounding can otherwise drift a dollar or two over).
  let targetTotal = priced.reduce((s, p) => s + p, 0)
  while (targetTotal > pool && priced.length > 0) {
    let maxIdx = 0
    for (let i = 1; i < priced.length; i++) if (priced[i] > priced[maxIdx]) maxIdx = i
    if (priced[maxIdx] <= 1) break // cannot trim below $1 each — strategy over-reaches
    priced[maxIdx] -= 1
    targetTotal -= 1
  }

  const prices: TargetPrice[] = resolved.map((t, i) => ({
    name: t.name,
    position: t.position,
    price: priced[i],
    baseValue: t.baseValue,
  }))

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
