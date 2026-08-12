import { describe, it, expect } from 'vitest'
import { computeRecommendation } from '../recommendation'
import type { Player } from '../types'

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

describe('computeRecommendation', () => {
  it('ELITE → anchor, pay to the top of the band', () => {
    const r = computeRecommendation(player({ expertTier: 1, ceilingValue: 90, expectedRoomPrice: 80 }))
    expect(r.intent).toBe('anchor')
    expect(r.line).toMatch(/Anchor/)
    expect(r.line).toContain('$90') // range.high
  })

  it('POCKET → target, win at/under the midpoint', () => {
    const r = computeRecommendation(player({ valueGap: 21, ceilingValue: 97, expectedRoomPrice: 76 }))
    expect(r.intent).toBe('target')
    expect(r.line).toMatch(/Target/)
    expect(r.line).toContain('$97')
    expect(r.line).toContain('$76')
    expect(r.line).toContain('$87') // base = round((97+76)/2)
  })

  it('TAX → pass, room overpays', () => {
    const r = computeRecommendation(player({ valueGap: -10, ceilingValue: 20, expectedRoomPrice: 30 }))
    expect(r.intent).toBe('pass')
    expect(r.line).toMatch(/Let him go/)
  })

  it('SLEEPER → late flier band', () => {
    const r = computeRecommendation(player({ position: 'WR', consensusRank: 100, vorp: 4, consensusAuctionValue: 3 }))
    expect(r.intent).toBe('flier')
    expect(r.line).toMatch(/flier/i)
  })

  it('default → fair value with the band', () => {
    const r = computeRecommendation(player({ ceilingValue: 12, expectedRoomPrice: 11, valueGap: 1 }))
    expect(r.intent).toBe('fair')
    expect(r.line).toMatch(/Fair value/)
  })

  it('injury appends a caution when not already a pass', () => {
    const r = computeRecommendation(
      player({ expertTier: 1, ceilingValue: 90, expectedRoomPrice: 80, injuryStatus: 'Questionable' }),
    )
    expect(r.line).toMatch(/injury/i)
  })

  it('injury does NOT double up when the line already says pass', () => {
    const r = computeRecommendation(
      player({ valueGap: -10, ceilingValue: 20, expectedRoomPrice: 30, injuryStatus: 'Out' }),
    )
    expect(r.line).not.toMatch(/Watch the injury/)
  })

  it('is deterministic — same input, same line', () => {
    const p = player({ valueGap: 21, ceilingValue: 97, expectedRoomPrice: 76 })
    expect(computeRecommendation(p)).toEqual(computeRecommendation(p))
  })
})
