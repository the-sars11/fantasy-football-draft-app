/**
 * Tests for calculateMaxBidAdvice -- specifically the VAL-3 calibrated anchor
 * (ceiling/room midpoint + HOT/COOL/NEUTRAL tilt). The legacy consensusValue
 * path is a fallback and tested separately.
 *
 * Key invariant the calibrated path must hold:
 *   - NEUTRAL: anchor = midpoint(ceiling, room)
 *   - COOL:    anchor = min(ceiling, midpoint * 1.08)  -- worth a small premium
 *   - HOT:     anchor = min(midpoint, ceiling)         -- don't chase, cap at worth
 *   In all cases: 1 <= maxBid <= absoluteMax (budget_remaining - emptySlots)
 */

import { describe, it, expect } from 'vitest'
import { calculateMaxBidAdvice } from '../auction-advisor'
import type { DraftState, ManagerState } from '../state'
import type { CalibratedBidInputs } from '../auction-advisor'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Player } from '@/lib/players/types'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Nasties roster shape: 1+1+1+1+3+0+1+5+1 = 14 total slots
const NASTIES_SLOTS = { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1 }

function makeState(
  budgetRemaining: number,
  picksAlreadyMade: number = 0,
): DraftState {
  const picks = Array.from({ length: picksAlreadyMade }, (_, i) => ({
    pick_number: i + 1,
    player_name: `Player ${i}`,
    manager: 'Joe',
    position: 'RB' as const,
    price: 10,
  }))
  const mgr: ManagerState = {
    name: 'Joe',
    picks,
    budget_remaining: budgetRemaining,
    budget_total: 200,
    roster_count: {},
  }
  return {
    format: 'auction',
    status: 'live',
    picks,
    managers: { Joe: mgr },
    manager_order: ['Joe'],
    roster_slots: NASTIES_SLOTS,
    keepers: [],
    total_picks: picksAlreadyMade,
    total_roster_spots: 14 * 12,
  }
}

// 5 neutral RB alternatives -- keeps alternatives between 2 and 8, so neither
// the scarcity boost nor the deep-position discount fires.
function makeAlts(count: number, pos = 'RB'): ScoredPlayer[] {
  return Array.from({ length: count }, (_, i) => {
    const p: Player = {
      id: `alt-${i}`,
      name: `Alt Player ${i}`,
      team: 'TST',
      position: pos as Player['position'],
      byeWeek: 1,
      consensusRank: 50 + i,
      consensusAuctionValue: 20,
      consensusTier: 3,
      adp: 50,
      sourceData: [],
      projections: { points: 200 },
    }
    return {
      player: p,
      strategyScore: 55,
      intelScore: 0,
      combinedScore: 55,
      targetStatus: 'neutral' as const,
      isUserTarget: false,
      isUserAvoid: false,
      boosts: [],
      intelBoosts: [],
    }
  })
}

// ---------------------------------------------------------------------------
// Helper: call with neutral factors so only the calibrated anchor matters.
// Budget 150 + 0 picks made -> absoluteMax = 150 - 13 = 137 (non-binding).
// strategyScore 50 -> neither high nor low boost fires.
// 5 alternatives -> neither scarcity nor deep-position discount fires.
// ---------------------------------------------------------------------------
function bid(calibrated?: CalibratedBidInputs, opts: { budget?: number; picks?: number } = {}) {
  const state = makeState(opts.budget ?? 150, opts.picks ?? 0)
  return calculateMaxBidAdvice(
    state,
    'Joe',
    'Jahmyr Gibbs',
    'RB',
    60,             // consensusValue (legacy anchor; ignored when calibrated present)
    50,             // strategyScore -- neutral
    makeAlts(5),
    new Set<string>(),
    null,
    calibrated,
  )
}

// ---------------------------------------------------------------------------
// Calibrated anchor: NEUTRAL (no inflation tag)
// ceiling=97, room=76 -> midpoint=86.5 -> rounds to 87
// ---------------------------------------------------------------------------
describe('calculateMaxBidAdvice -- calibrated NEUTRAL', () => {
  it('anchors on the ceiling/room midpoint', () => {
    const result = bid({ ceiling: 97, expectedRoomPrice: 76 })
    expect(result.maxBid).toBe(87)
  })

  it('emits a League-calibrated factor with worth/room detail', () => {
    const result = bid({ ceiling: 97, expectedRoomPrice: 76 })
    const cal = result.factors.find((f) => f.label === 'League-calibrated')
    expect(cal).toBeDefined()
    expect(cal!.detail).toContain('$97')
    expect(cal!.detail).toContain('$76')
  })
})

// ---------------------------------------------------------------------------
// Calibrated anchor: COOL (value pocket -- room underpays)
// ceiling=97, room=76 -> midpoint=86.5 * 1.08 = 93.42 -> min(97, 93) = 93
// ---------------------------------------------------------------------------
describe('calculateMaxBidAdvice -- calibrated COOL', () => {
  it('adds an 8% premium over midpoint to secure a value pocket', () => {
    const result = bid({ ceiling: 97, expectedRoomPrice: 76, inflationTag: 'COOL' })
    // midpoint * 1.08 = 86.5 * 1.08 = 93.42 -> rounds to 93, capped at ceiling 97
    expect(result.maxBid).toBe(93)
  })

  it('COOL maxBid > NEUTRAL maxBid for the same pocket player', () => {
    const neutral = bid({ ceiling: 97, expectedRoomPrice: 76 })
    const cool = bid({ ceiling: 97, expectedRoomPrice: 76, inflationTag: 'COOL' })
    expect(cool.maxBid).toBeGreaterThan(neutral.maxBid)
  })

  it('COOL anchor never exceeds the genuine ceiling worth', () => {
    // room=90, ceiling=91 -> midpoint=90.5, * 1.08 = 97.74 -> min(91, 97) = 91
    const result = bid({ ceiling: 91, expectedRoomPrice: 90, inflationTag: 'COOL' })
    expect(result.maxBid).toBeLessThanOrEqual(91)
  })
})

// ---------------------------------------------------------------------------
// Calibrated anchor: HOT (room reliably overpays -- TAX scenario)
// ceiling=20, room=30 -> midpoint=25; HOT -> anchor = min(25, 20) = 20
// vs NEUTRAL -> anchor = 25
// HOT prevents chasing a reputation premium.
// ---------------------------------------------------------------------------
describe('calculateMaxBidAdvice -- calibrated HOT (tax scenario)', () => {
  it('caps anchor at genuine worth to prevent chasing (room > ceiling)', () => {
    const result = bid({ ceiling: 20, expectedRoomPrice: 30, inflationTag: 'HOT' })
    expect(result.maxBid).toBe(20)
  })

  it('when room exceeds ceiling, both HOT and NEUTRAL are capped at genuine worth', () => {
    // ceiling=20, room=30 -> midpoint=25 which itself exceeds ceiling.
    // valueCeiling=20 clamps both paths to worth: NEUTRAL (was 25, now 20) and
    // HOT (anchor already 20 via min(midpoint,ceiling)) both land at 20.
    const neutral = bid({ ceiling: 20, expectedRoomPrice: 30 })
    const hot = bid({ ceiling: 20, expectedRoomPrice: 30, inflationTag: 'HOT' })
    expect(neutral.maxBid).toBeLessThanOrEqual(20)
    expect(hot.maxBid).toBeLessThanOrEqual(20)
  })

  it('HOT has no effect in a value pocket (ceiling > room) -- NEUTRAL and HOT agree', () => {
    // ceiling 97 > room 76 -> midpoint 86.5 = min(86.5, 97) -> HOT acts as NEUTRAL
    const neutral = bid({ ceiling: 97, expectedRoomPrice: 76 })
    const hot = bid({ ceiling: 97, expectedRoomPrice: 76, inflationTag: 'HOT' })
    expect(hot.maxBid).toBe(neutral.maxBid)
  })
})

// ---------------------------------------------------------------------------
// absoluteMax ceiling: maxBid can never strand Joe with no $1 per empty slot
// ---------------------------------------------------------------------------
describe('calculateMaxBidAdvice -- absoluteMax ceiling', () => {
  it('caps maxBid when budget is tight (never strand remaining slots)', () => {
    // budgetRemaining=15, 0 picks -> emptySlots=13 -> absoluteMax=max(1,15-13)=2
    const result = bid({ ceiling: 97, expectedRoomPrice: 76 }, { budget: 15 })
    expect(result.maxBid).toBeLessThanOrEqual(2)
    expect(result.maxBid).toBeGreaterThanOrEqual(1)
  })

  it('minimum maxBid is always $1', () => {
    // budget=1 -> emptySlots=13 -> absoluteMax=max(1,-12)=1
    const result = bid({ ceiling: 97, expectedRoomPrice: 76 }, { budget: 1 })
    expect(result.maxBid).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Legacy fallback: without calibrated input, uses consensusValue * 1.3
// consensusValue=60 -> round(60 * 1.3) = 78
// ---------------------------------------------------------------------------
describe('calculateMaxBidAdvice -- legacy fallback (no calibrated input)', () => {
  it('falls back to consensusValue * 1.3 when calibrated is absent', () => {
    const result = bid(undefined)
    // consensusValue=60, factor=1.3 -> 78; absoluteMax=137 (non-binding)
    expect(result.maxBid).toBe(78)
  })

  it('calibrated anchor replaces the legacy anchor (different values)', () => {
    const legacy = bid(undefined)
    const calibrated = bid({ ceiling: 97, expectedRoomPrice: 76 })
    // legacy=78, calibrated=87 for this player -- they must differ
    expect(calibrated.maxBid).not.toBe(legacy.maxBid)
  })
})

// ---------------------------------------------------------------------------
// RV-4: maxBid must never exceed calibrated ceiling regardless of factor boosts
// ceiling=50, room=40 -> anchor (NEUTRAL) = round((50+40)/2) = 45
// strategy boost (1.15×): 45*1.15 = 51.75 -> would have been 52, must be <=50
// scarcity boost (1.2×):  45*1.2  = 54    -> would have been 54, must be <=50
// both combined:           45*1.15*1.2 ~ 62 -> must be <=50
// ---------------------------------------------------------------------------
describe('calculateMaxBidAdvice -- maxBid never exceeds calibrated ceiling (RV-4)', () => {
  const CAL_50: CalibratedBidInputs = { ceiling: 50, expectedRoomPrice: 40 }

  it('strategy-score boost (1.15×) cannot push maxBid past ceiling', () => {
    const state = makeState(150)
    const result = calculateMaxBidAdvice(
      state, 'Joe', 'Test', 'RB', 35, 80, makeAlts(5), new Set(), null, CAL_50,
    )
    expect(result.maxBid).toBeLessThanOrEqual(50)
    expect(result.maxBid).toBeGreaterThanOrEqual(1)
  })

  it('scarcity boost (1.2×) cannot push maxBid past ceiling', () => {
    const state = makeState(150)
    const result = calculateMaxBidAdvice(
      state, 'Joe', 'Test', 'RB', 35, 50, makeAlts(1), new Set(), null, CAL_50,
    )
    expect(result.maxBid).toBeLessThanOrEqual(50)
    expect(result.maxBid).toBeGreaterThanOrEqual(1)
  })

  it('all boosts combined cannot push maxBid past ceiling', () => {
    const state = makeState(150)
    const result = calculateMaxBidAdvice(
      state, 'Joe', 'Test', 'RB', 35, 80, makeAlts(1), new Set(), null, CAL_50,
    )
    expect(result.maxBid).toBeLessThanOrEqual(50)
    expect(result.maxBid).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// missing manager guard
// ---------------------------------------------------------------------------
describe('calculateMaxBidAdvice -- missing manager', () => {
  it('returns maxBid=1 with no-data reasoning when manager is absent', () => {
    const state = makeState(150)
    const result = calculateMaxBidAdvice(
      state, 'Unknown', 'Gibbs', 'RB', 60, 50, [], new Set(), null,
    )
    expect(result.maxBid).toBe(1)
    expect(result.reasoning).toContain('No budget data')
  })
})
