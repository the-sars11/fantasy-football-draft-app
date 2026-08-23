import { describe, it, expect } from 'vitest'
import {
  repricePlayer,
  repriceBoard,
  needMultiplier,
  NEED_FILLED_FACTOR,
  NEED_MAX_LEAN,
  type RepriceContext,
  type PlayerRepriceInput,
} from '../live-reprice'
import type { Position } from '@/lib/players/types'
import type { PositionInflation } from '../market-inflation'

/** Build a full inflation map with the given per-position multipliers (default neutral). */
function inflation(overrides: Partial<Record<Position, number>> = {}): Record<Position, PositionInflation> {
  const one = (m: number): PositionInflation => ({
    multiplier: m,
    rawMultiplier: m,
    soldCount: 0,
    actualSpent: 0,
    baselineSpent: 0,
  })
  const out = {} as Record<Position, PositionInflation>
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const) {
    out[pos] = one(overrides[pos] ?? 1)
  }
  return out
}

function ctx(overrides: Partial<RepriceContext> = {}): RepriceContext {
  return {
    inflation: inflation(),
    openSlotsByPosition: { QB: 1, RB: 1, WR: 1, TE: 1, K: 0, DEF: 1 },
    maxBid: 200,
    ...overrides,
  }
}

const player = (o: Partial<PlayerRepriceInput> = {}): PlayerRepriceInput => ({
  id: 'p',
  position: 'WR',
  baselineRoom: 20,
  baselineTarget: 24,
  ...o,
})

describe('needMultiplier', () => {
  it('fades a filled position but never to zero', () => {
    expect(needMultiplier(0)).toBe(NEED_FILLED_FACTOR)
    expect(needMultiplier(-1)).toBe(NEED_FILLED_FACTOR)
  })
  it('is neutral at exactly one open slot', () => {
    expect(needMultiplier(1)).toBe(1)
  })
  it('leans up modestly with multiple open slots, capped', () => {
    expect(needMultiplier(2)).toBeCloseTo(1.08, 6)
    expect(needMultiplier(3)).toBeCloseTo(1.16, 6)
    expect(needMultiplier(100)).toBeCloseTo(1 + NEED_MAX_LEAN, 6)
  })
})

describe('repricePlayer - market inflation moves ROOM only', () => {
  it('raises the room price when the position is running hot', () => {
    const r = repricePlayer(player({ position: 'RB', baselineRoom: 40, baselineTarget: 40 }),
      ctx({ inflation: inflation({ RB: 1.25 }) }))
    expect(r.room).toBe(50) // 40 * 1.25
    expect(r.roomDelta).toBe(10)
  })

  it('lowers the room price when the position is soft', () => {
    const r = repricePlayer(player({ position: 'WR', baselineRoom: 20, baselineTarget: 20 }),
      ctx({ inflation: inflation({ WR: 0.8 }) }))
    expect(r.room).toBe(16) // 20 * 0.8
    expect(r.roomDelta).toBe(-4)
  })

  it('does not move Joe\'s target when only the room inflates', () => {
    const r = repricePlayer(player({ position: 'RB', baselineRoom: 40, baselineTarget: 40 }),
      ctx({ inflation: inflation({ RB: 1.25 }), openSlotsByPosition: { QB: 1, RB: 1, WR: 1, TE: 1, K: 0, DEF: 1 } }))
    expect(r.you).toBe(40) // unchanged - one open slot, neutral need
    expect(r.youDelta).toBe(0)
  })
})

describe('repricePlayer - roster need moves YOUR target only', () => {
  it('fades the target for a position Joe has already filled', () => {
    const r = repricePlayer(player({ position: 'RB', baselineRoom: 30, baselineTarget: 40 }),
      ctx({ openSlotsByPosition: { QB: 1, RB: 0, WR: 1, TE: 1, K: 0, DEF: 1 } }))
    expect(r.you).toBe(Math.round(40 * NEED_FILLED_FACTOR)) // 22
    expect(r.room).toBe(30) // room unaffected by his roster
  })

  it('leans the target up for a position of multiple open slots', () => {
    const r = repricePlayer(player({ position: 'WR', baselineRoom: 20, baselineTarget: 30 }),
      ctx({ openSlotsByPosition: { QB: 1, RB: 1, WR: 3, TE: 1, K: 0, DEF: 1 } }))
    expect(r.you).toBe(Math.round(30 * 1.16)) // 35
  })
})

describe('repricePlayer - solvency cap', () => {
  it('never targets above maxBid', () => {
    const r = repricePlayer(player({ position: 'WR', baselineRoom: 40, baselineTarget: 60 }),
      ctx({ maxBid: 25, openSlotsByPosition: { QB: 1, RB: 1, WR: 3, TE: 1, K: 0, DEF: 1 } }))
    expect(r.you).toBe(25)
  })
})

describe('repricePlayer - floors', () => {
  it('floors room and you at $1', () => {
    const r = repricePlayer(player({ position: 'WR', baselineRoom: 1, baselineTarget: 1 }),
      ctx({ inflation: inflation({ WR: 0.1 }), openSlotsByPosition: { QB: 1, RB: 1, WR: 0, TE: 1, K: 0, DEF: 1 } }))
    expect(r.room).toBe(1)
    expect(r.you).toBe(1)
  })
})

describe('repricePlayer - the core Joe scenario', () => {
  it('a hot RB the room overpays turns into a TAX for him', () => {
    // Baseline: room 40, his target 42 -> normally a slim pocket.
    // Room runs RB +30% -> room 52; his target holds ~42 -> pocket goes negative.
    const r = repricePlayer(player({ position: 'RB', baselineRoom: 40, baselineTarget: 42 }),
      ctx({ inflation: inflation({ RB: 1.3 }), openSlotsByPosition: { QB: 1, RB: 1, WR: 1, TE: 1, K: 0, DEF: 1 } }))
    expect(r.room).toBe(52)
    expect(r.you).toBe(42)
    expect(r.pocket).toBe(-10)
    expect(r.isTax).toBe(true)
    expect(r.isPocket).toBe(false)
  })

  it('a soft WR Joe still needs becomes a POCKET to target', () => {
    // Room lets WR go -20% -> room 16; Joe needs 2 WR -> target leans up.
    const r = repricePlayer(player({ position: 'WR', baselineRoom: 20, baselineTarget: 24 }),
      ctx({ inflation: inflation({ WR: 0.8 }), openSlotsByPosition: { QB: 1, RB: 1, WR: 2, TE: 1, K: 0, DEF: 1 } }))
    expect(r.room).toBe(16)
    expect(r.you).toBe(Math.round(24 * 1.08)) // 26
    expect(r.pocket).toBe(10)
    expect(r.isPocket).toBe(true)
    expect(r.isTax).toBe(false)
  })
})

describe('repriceBoard', () => {
  it('reprices every player and preserves ids', () => {
    const board = repriceBoard(
      [player({ id: 'a', position: 'RB' }), player({ id: 'b', position: 'WR' })],
      ctx(),
    )
    expect(board.map(p => p.id)).toEqual(['a', 'b'])
  })
})
