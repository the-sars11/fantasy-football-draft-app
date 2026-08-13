/**
 * target-pricing.test.ts — R6: solver-fit strategy target prices.
 *
 * Proves the two done-when conditions:
 *   1. Every strategy's target prices + the $1-per-slot completion reserve sum
 *      to a completable $200 roster (sum invariant).
 *   2. Swapping the archetype's budget emphasis re-allocates the money.
 * Pure, $0 — no Claude.
 */

import { describe, it, expect } from 'vitest'
import { assignTargetPrices } from '../target-pricing'
import type { AssignTargetPricesInput } from '../target-pricing'
import type { ConsensusPlayer } from '@/lib/research/normalize'
import type { RosterSlots } from '@/lib/players/types'

// Joe's Nasties: QB1 RB1 WR1 TE1 FLEX3 DEF1 Bench5 = 13 draftable slots.
const NASTIES_SLOTS: RosterSlots = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, superflex: 0, k: 0, def: 1, bench: 5,
}
const TOTAL_SLOTS = 13
const BUDGET = 200

function makePlayer(
  overrides: Partial<ConsensusPlayer> & {
    name: string
    position: ConsensusPlayer['position']
    consensusAuctionValue: number
  }
): ConsensusPlayer {
  return {
    team: 'TST',
    byeWeek: 7,
    injuryStatus: null,
    sleeperId: null,
    espnId: null,
    fpId: null,
    consensusRank: 10,
    consensusTier: 3,
    adp: 10,
    sourceRanks: {},
    sourceADP: {},
    sourceAuctionValues: {},
    projections: { points: 200 },
    ecrStdDev: null,
    percentOwned: null,
    age: null,
    yearsExp: null,
    sources: ['fantasypros'],
    ...overrides,
  }
}

const POOL: ConsensusPlayer[] = [
  makePlayer({ name: 'Elite RB', position: 'RB', consensusAuctionValue: 60 }),
  makePlayer({ name: 'Elite WR', position: 'WR', consensusAuctionValue: 55 }),
  makePlayer({ name: 'Elite QB', position: 'QB', consensusAuctionValue: 40 }),
  makePlayer({ name: 'Elite TE', position: 'TE', consensusAuctionValue: 30 }),
  makePlayer({ name: 'Second WR', position: 'WR', consensusAuctionValue: 25 }),
  makePlayer({ name: 'Kicker Guy', position: 'K', consensusAuctionValue: 3 }),
]

// Stars & Scrubs style: RB/WR heavy (the default baseInput allocation).
const RB_HEAVY = { QB: 5, RB: 40, WR: 35, TE: 8, K: 1, DST: 1, bench: 10 }

function baseInput(overrides: Partial<AssignTargetPricesInput> = {}): AssignTargetPricesInput {
  return {
    targetNames: ['Elite RB', 'Elite WR', 'Elite QB', 'Elite TE'],
    budgetAllocation: RB_HEAVY,
    maxBidPercentage: 40,
    players: POOL,
    rosterSlots: NASTIES_SLOTS,
    budget: BUDGET,
    ...overrides,
  }
}

describe('assignTargetPrices - sum invariant (completable $200 roster)', () => {
  it('target prices + reserve never exceed the budget', () => {
    const r = assignTargetPrices(baseInput())
    expect(r.total).toBe(r.targetTotal + r.reserve)
    expect(r.total).toBeLessThanOrEqual(BUDGET)
    expect(r.fits).toBe(true)
  })

  it('reserves exactly $1 for every non-target roster slot', () => {
    const r = assignTargetPrices(baseInput())
    // 4 targets each claim a slot -> 9 non-target slots -> $9 reserve.
    expect(r.prices).toHaveLength(4)
    expect(r.reserve).toBe(TOTAL_SLOTS - 4)
  })

  it('every priced target costs at least $1', () => {
    const r = assignTargetPrices(baseInput())
    for (const p of r.prices) expect(p.price).toBeGreaterThanOrEqual(1)
  })

  it('accounts for all 13 slots: priced targets + $1 reserve slots = full roster', () => {
    const r = assignTargetPrices(baseInput())
    // Each price is one filled slot; reserve dollars == remaining slot count.
    expect(r.prices.length + r.reserve).toBe(TOTAL_SLOTS)
  })

  it('holds the invariant even when every target is a max-value stud', () => {
    const studPool: ConsensusPlayer[] = [
      makePlayer({ name: 'Stud A', position: 'RB', consensusAuctionValue: 80 }),
      makePlayer({ name: 'Stud B', position: 'WR', consensusAuctionValue: 78 }),
      makePlayer({ name: 'Stud C', position: 'RB', consensusAuctionValue: 75 }),
      makePlayer({ name: 'Stud D', position: 'WR', consensusAuctionValue: 72 }),
      makePlayer({ name: 'Stud E', position: 'TE', consensusAuctionValue: 60 }),
    ]
    const r = assignTargetPrices(
      baseInput({
        targetNames: ['Stud A', 'Stud B', 'Stud C', 'Stud D', 'Stud E'],
        players: studPool,
      })
    )
    expect(r.total).toBeLessThanOrEqual(BUDGET)
    expect(r.fits).toBe(true)
    for (const p of r.prices) expect(p.price).toBeGreaterThanOrEqual(1)
  })
})

describe('assignTargetPrices - archetype re-allocation', () => {
  it('shifts money to RB under an RB-heavy allocation vs a WR-heavy one', () => {
    // Same targets/bases; only the budget emphasis changes. Allocations are kept
    // inside the unclipped emphasis band (pct 10.5-27 -> 0.7x-1.8x) so the tilt
    // is visible rather than both positions pinning to the cap.
    const RB_TILT = { QB: 8, RB: 24, WR: 12, TE: 8, K: 1, DST: 1, bench: 46 }
    const WR_TILT = { QB: 8, RB: 12, WR: 24, TE: 8, K: 1, DST: 1, bench: 46 }
    const equalPool: ConsensusPlayer[] = [
      makePlayer({ name: 'RB One', position: 'RB', consensusAuctionValue: 20 }),
      makePlayer({ name: 'WR One', position: 'WR', consensusAuctionValue: 20 }),
    ]
    const rbHeavy = assignTargetPrices(
      baseInput({ targetNames: ['RB One', 'WR One'], players: equalPool, budgetAllocation: RB_TILT })
    )
    const wrHeavy = assignTargetPrices(
      baseInput({ targetNames: ['RB One', 'WR One'], players: equalPool, budgetAllocation: WR_TILT })
    )

    const rbPriceHeavy = rbHeavy.prices.find((p) => p.name === 'RB One')!.price
    const rbPriceWr = wrHeavy.prices.find((p) => p.name === 'RB One')!.price
    const wrPriceHeavy = rbHeavy.prices.find((p) => p.name === 'WR One')!.price
    const wrPriceWr = wrHeavy.prices.find((p) => p.name === 'WR One')!.price

    // RB-heavy pays more for the RB; WR-heavy pays more for the WR.
    expect(rbPriceHeavy).toBeGreaterThan(rbPriceWr)
    expect(wrPriceWr).toBeGreaterThan(wrPriceHeavy)
  })

  it('different targets produce a different reserve and total', () => {
    const twoTargets = assignTargetPrices(baseInput({ targetNames: ['Elite RB', 'Elite WR'] }))
    const fourTargets = assignTargetPrices(baseInput())
    // Fewer targets -> more slots reserved at $1.
    expect(twoTargets.reserve).toBe(TOTAL_SLOTS - 2)
    expect(fourTargets.reserve).toBe(TOTAL_SLOTS - 4)
  })
})

describe('assignTargetPrices - resolution rules', () => {
  it('skips unknown and kicker targets', () => {
    const r = assignTargetPrices(
      baseInput({ targetNames: ['Elite RB', 'Nonexistent Player', 'Kicker Guy'] })
    )
    const names = r.prices.map((p) => p.name)
    expect(names).toContain('Elite RB')
    expect(names).not.toContain('Nonexistent Player')
    expect(names).not.toContain('Kicker Guy')
    expect(r.prices).toHaveLength(1)
  })

  it('dedupes repeated target names', () => {
    const r = assignTargetPrices(baseInput({ targetNames: ['Elite RB', 'Elite RB', 'Elite WR'] }))
    expect(r.prices).toHaveLength(2)
  })

  it('caps a target at the strategy max single bid', () => {
    const bigPool: ConsensusPlayer[] = [
      makePlayer({ name: 'Overpriced', position: 'RB', consensusAuctionValue: 190 }),
    ]
    const r = assignTargetPrices(
      baseInput({ targetNames: ['Overpriced'], players: bigPool, maxBidPercentage: 30 })
    )
    // 30% of $200 = $60 cap.
    expect(r.prices[0].price).toBeLessThanOrEqual(60)
  })

  it('returns an empty, fitting result when no targets resolve', () => {
    const r = assignTargetPrices(baseInput({ targetNames: ['Ghost'] }))
    expect(r.prices).toHaveLength(0)
    expect(r.targetTotal).toBe(0)
    expect(r.reserve).toBe(TOTAL_SLOTS)
    expect(r.fits).toBe(true)
  })
})
