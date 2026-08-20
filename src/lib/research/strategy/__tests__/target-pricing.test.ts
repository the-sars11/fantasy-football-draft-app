/**
 * target-pricing.test.ts — R6: solver-fit strategy target prices.
 *
 * Proves the done-when conditions:
 *   1. Every strategy's target prices + the $1-per-slot completion reserve sum
 *      to a completable $200 roster (sum invariant).
 *   2. Each target is priced at its expected ROOM price (what Joe's room pays),
 *      with a walk-up = room price + 10% to actually win a contested bid.
 *   3. When named targets overflow the budget at room prices, the cheapest are
 *      dropped (the honest "only a couple studs fit") rather than shrunk below room.
 * Pure, $0 — no Claude.
 */

import { describe, it, expect } from 'vitest'
import { assignTargetPrices } from '../target-pricing'
import type { AssignTargetPricesInput, TargetPricingPlayer } from '../target-pricing'
import type { ConsensusPlayer } from '@/lib/research/normalize'
import type { Position, RosterSlots } from '@/lib/players/types'

/** Minimal target carrying a real room price (what the ledger says Joe's room pays). */
function roomPlayer(name: string, position: Position, expectedRoomPrice: number): TargetPricingPlayer {
  return { name, position, expectedRoomPrice }
}

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

describe('assignTargetPrices - room-price anchoring (the honest number)', () => {
  it('prices a target at its expected room price, not a national value scaled to fit', () => {
    // Gibbs: national auction ~$96, but the room pays $76. The plan must say $76.
    const gibbs = roomPlayer('Jahmyr Gibbs', 'RB', 76)
    const withNationalNoise = { ...gibbs, consensusAuctionValue: 96 }
    const r = assignTargetPrices(
      baseInput({ targetNames: ['Jahmyr Gibbs'], players: [withNationalNoise] })
    )
    expect(r.prices).toHaveLength(1)
    // Expect = room price ($76), never the $96 national value or a crushed-down number.
    expect(r.prices[0].price).toBe(76)
    expect(r.prices[0].baseValue).toBe(76)
  })

  it('sets walk-up = room price + 10% so a contested bid actually wins', () => {
    const nacua = roomPlayer('Puka Nacua', 'WR', 79)
    const r = assignTargetPrices(baseInput({ targetNames: ['Puka Nacua'], players: [nacua] }))
    // 79 * 1.10 = 86.9 -> 87.
    expect(r.prices[0].walkUp).toBe(87)
    expect(r.prices[0].walkUp).toBeGreaterThan(r.prices[0].price)
  })

  it('is unaffected by the archetype budget allocation (room price is the anchor)', () => {
    const rb = roomPlayer('Room RB', 'RB', 50)
    const wr = roomPlayer('Room WR', 'WR', 50)
    const RB_TILT = { QB: 8, RB: 40, WR: 8, TE: 8, K: 1, DST: 1, bench: 34 }
    const WR_TILT = { QB: 8, RB: 8, WR: 40, TE: 8, K: 1, DST: 1, bench: 34 }
    const rbHeavy = assignTargetPrices(
      baseInput({ targetNames: ['Room RB', 'Room WR'], players: [rb, wr], budgetAllocation: RB_TILT })
    )
    const wrHeavy = assignTargetPrices(
      baseInput({ targetNames: ['Room RB', 'Room WR'], players: [rb, wr], budgetAllocation: WR_TILT })
    )
    // Same room prices regardless of archetype tilt: $50 is $50.
    expect(rbHeavy.prices.find((p) => p.name === 'Room RB')!.price).toBe(50)
    expect(wrHeavy.prices.find((p) => p.name === 'Room RB')!.price).toBe(50)
    expect(rbHeavy.prices.find((p) => p.name === 'Room WR')!.price).toBe(50)
    expect(wrHeavy.prices.find((p) => p.name === 'Room WR')!.price).toBe(50)
  })

  it('drops the cheapest targets when room prices overflow the budget', () => {
    // Three real studs at room prices: 76 + 79 + 67 = 222 > $200. Only two fit.
    const studs = [
      roomPlayer('Stud RB', 'RB', 76),
      roomPlayer('Stud WR', 'WR', 79),
      roomPlayer('Third Stud', 'RB', 67),
    ]
    const r = assignTargetPrices(
      baseInput({ targetNames: ['Stud RB', 'Stud WR', 'Third Stud'], players: studs })
    )
    // The two priciest survive at their true room prices; the cheapest is dropped.
    const names = r.prices.map((p) => p.name)
    expect(names).toContain('Stud RB')
    expect(names).toContain('Stud WR')
    expect(names).not.toContain('Third Stud')
    for (const p of r.prices) expect(p.price).toBe(p.baseValue) // never shrunk below room
    expect(r.fits).toBe(true)
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

  it('caps a single unaffordable stud at the solvency ceiling (roster stays completable)', () => {
    // A $190 room price cannot coexist with 12 other $1 slots in a $200 league.
    // The solvency ceiling is budget - (13 slots - 1) = $188: buy him, fill the rest at $1.
    const bigPool = [roomPlayer('Overpriced', 'RB', 190)]
    const r = assignTargetPrices(baseInput({ targetNames: ['Overpriced'], players: bigPool }))
    expect(r.prices).toHaveLength(1)
    expect(r.prices[0].price).toBe(BUDGET - (TOTAL_SLOTS - 1)) // $188
    expect(r.total).toBeLessThanOrEqual(BUDGET)
    expect(r.fits).toBe(true)
  })

  it('returns an empty, fitting result when no targets resolve', () => {
    const r = assignTargetPrices(baseInput({ targetNames: ['Ghost'] }))
    expect(r.prices).toHaveLength(0)
    expect(r.targetTotal).toBe(0)
    expect(r.reserve).toBe(TOTAL_SLOTS)
    expect(r.fits).toBe(true)
  })
})
