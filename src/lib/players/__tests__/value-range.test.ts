import { describe, it, expect } from 'vitest'
import { computeValueRange } from '../value-range'
import type { Player } from '../types'

// Minimal Player fixture — only the fields computeValueRange reads matter.
function player(overrides: Partial<Player>): Player {
  return {
    id: 'x',
    name: 'Test Player',
    team: 'TST',
    position: 'RB',
    byeWeek: 0,
    consensusRank: 50,
    consensusAuctionValue: 10,
    consensusTier: 5,
    adp: 50,
    sourceData: [],
    projections: { points: 0 },
    ...overrides,
  }
}

describe('computeValueRange', () => {
  it('builds a LEAGUE band from ceiling worth + expected room price', () => {
    const r = computeValueRange(player({ ceilingValue: 97, expectedRoomPrice: 76 }))
    expect(r.source).toBe('league')
    expect(r.low).toBe(76) // min(97, 76)
    expect(r.high).toBe(97) // max(97, 76)
    expect(r.base).toBe(87) // round((97+76)/2) = 86.5 -> 87
  })

  it('orders low/high correctly when the room pays OVER the worth (room tax)', () => {
    const r = computeValueRange(player({ ceilingValue: 20, expectedRoomPrice: 34 }))
    expect(r.source).toBe('league')
    expect(r.low).toBe(20)
    expect(r.high).toBe(34)
    expect(r.base).toBe(27)
  })

  it('collapses to a zero-width band when worth equals room', () => {
    const r = computeValueRange(player({ ceilingValue: 30, expectedRoomPrice: 30 }))
    expect(r).toEqual({ low: 30, base: 30, high: 30, source: 'league' })
  })

  it('falls back to the NATIONAL FantasyPros range when uncalibrated', () => {
    const r = computeValueRange(
      player({
        ceilingValue: 0, // ranked-but-unpriced → no league band
        expectedRoomPrice: undefined,
        valueRange: { low: 8, base: 12, high: 18 },
      }),
    )
    expect(r.source).toBe('national')
    expect(r).toMatchObject({ low: 8, base: 12, high: 18 })
  })

  it('guards national-range ordering (never trusts blind)', () => {
    const r = computeValueRange(
      player({ valueRange: { low: 18, base: 12, high: 8 } }), // scrambled
    )
    expect(r.low).toBe(8)
    expect(r.high).toBe(18)
    expect(r.base).toBe(12)
  })

  it('degenerates to an honest POINT from consensus value when nothing else exists', () => {
    const r = computeValueRange(player({ consensusAuctionValue: 5 }))
    expect(r).toEqual({ low: 5, base: 5, high: 5, source: 'point' })
  })

  it('never emits a fabricated spread around a bare point', () => {
    const r = computeValueRange(player({ consensusAuctionValue: 0 }))
    expect(r.low).toBe(r.high)
    expect(r.source).toBe('point')
  })

  // BUG-001 regression (fixed S2): ceilingValue=0 is a "ranked-but-unpriced"
  // row (ceiling falls back to Math.round(avgAuction)=0). It must NOT produce
  // a 'league' band because 0 is not a real worth signal -- the guard is "> 0",
  // not "!== undefined". Without the fix the old "!== undefined" check returned
  // a false $-X "hot" chip on a $0-worth row.
  it('does NOT produce a league band when ceilingValue is 0 (BUG-001 regression)', () => {
    const r = computeValueRange(
      player({ ceilingValue: 0, expectedRoomPrice: 30 }),
    )
    expect(r.source).not.toBe('league')
  })

  it('falls back to national when ceilingValue is 0 but a national range exists', () => {
    const r = computeValueRange(
      player({ ceilingValue: 0, expectedRoomPrice: 30, valueRange: { low: 5, base: 10, high: 15 } }),
    )
    expect(r.source).toBe('national')
  })
})
