import { describe, it, expect } from 'vitest'
import { computeWhatToDo, type WhatToDoInput } from '@/lib/draft/what-to-do'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { PositionScarcityExtended } from '@/lib/draft/explain'

// --- Fixtures -------------------------------------------------------------

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: overrides.id ?? 'p-mahomes',
    name: overrides.name ?? 'Patrick Mahomes',
    team: overrides.team ?? 'KC',
    position: overrides.position ?? 'QB',
    byeWeek: overrides.byeWeek ?? 10,
    injuryStatus: overrides.injuryStatus,
    consensusRank: overrides.consensusRank ?? 12,
    consensusAuctionValue: overrides.consensusAuctionValue ?? 52,
    consensusTier: overrides.consensusTier ?? 1,
    adp: overrides.adp ?? 20,
    sourceData: overrides.sourceData ?? [],
    projections: overrides.projections ?? { points: 320 },
    analysis: overrides.analysis,
  }
}

function makeScored(player: Player, overrides: Partial<ScoredPlayer> = {}): ScoredPlayer {
  return {
    player,
    strategyScore: overrides.strategyScore ?? 70,
    intelScore: overrides.intelScore ?? 0,
    combinedScore: overrides.combinedScore ?? 70,
    adjustedAuctionValue: overrides.adjustedAuctionValue,
    adjustedRoundValue: overrides.adjustedRoundValue,
    targetStatus: overrides.targetStatus ?? 'neutral',
    isUserTarget: overrides.isUserTarget ?? false,
    isUserAvoid: overrides.isUserAvoid ?? false,
    boosts: overrides.boosts ?? [],
    intelBoosts: overrides.intelBoosts ?? [],
  }
}

function makeScarcity(overrides: Partial<PositionScarcityExtended> = {}): PositionScarcityExtended {
  return {
    position: overrides.position ?? 'QB',
    totalRemaining: overrides.totalRemaining ?? 8,
    tier1Remaining: overrides.tier1Remaining ?? 3,
    tier2Remaining: overrides.tier2Remaining ?? 2,
    tier3Remaining: overrides.tier3Remaining ?? 3,
    startableRemaining: overrides.startableRemaining ?? 5,
    scarcityLevel: overrides.scarcityLevel ?? 'moderate',
    spendRange: overrides.spendRange,
    avgValue: overrides.avgValue,
  }
}

function baseInput(overrides: Partial<WhatToDoInput> = {}): WhatToDoInput {
  const player = overrides.player ?? makePlayer()
  return {
    player,
    scored: overrides.scored ?? makeScored(player),
    myMaxBid: overrides.myMaxBid ?? 50,
    budgetMaxBid: overrides.budgetMaxBid ?? 120,
    scarcity: overrides.scarcity ?? makeScarcity(),
    alternatives: overrides.alternatives ?? [],
    isTarget: overrides.isTarget ?? false,
    isAvoid: overrides.isAvoid ?? false,
    avoidSeverity: overrides.avoidSeverity,
  }
}

// Assert no em dash or en dash leaks into any surfaced copy.
function assertNoDashes(...strings: string[]): void {
  for (const s of strings) {
    expect(s).not.toMatch(/[–—]/)
  }
}

// --- Tests ----------------------------------------------------------------

describe('computeWhatToDo', () => {
  it('PASS when the player is a hard avoid', () => {
    const result = computeWhatToDo(baseInput({ isAvoid: true, avoidSeverity: 'hard' }))
    expect(result.move).toBe('PASS')
    expect(result.moveColor).toBe('red')
    expect(result.rationale).toContain('avoid')
    assertNoDashes(result.cap, result.rationale, result.scarcityNote)
  })

  it('PASS when the wallet cannot support any bid', () => {
    const result = computeWhatToDo(baseInput({ budgetMaxBid: 0 }))
    expect(result.move).toBe('PASS')
    expect(result.capValue).toBeNull()
    assertNoDashes(result.cap, result.rationale)
  })

  it('an unset-severity avoid is soft by default, not an automatic PASS', () => {
    // Joe ruling 2026-08-17: a quick-tapped avoid carries no severity and now
    // defaults to soft, so an affordable one flows through at a discounted cap
    // instead of forcing PASS. (myMaxBid 50 halved by the soft discount = 25.)
    const result = computeWhatToDo(baseInput({ isAvoid: true, budgetMaxBid: 200 }))
    expect(result.move).not.toBe('PASS')
    expect(result.capValue).toBe(25)
  })

  it('PUSH when this is the last startable player of a scarce tier you want', () => {
    const player = makePlayer({ consensusTier: 1 })
    const result = computeWhatToDo(
      baseInput({
        player,
        isTarget: true,
        scarcity: makeScarcity({ tier1Remaining: 1, startableRemaining: 1 }),
        alternatives: [],
      }),
    )
    expect(result.move).toBe('PUSH')
    expect(result.moveColor).toBe('orange')
    expect(result.capValue).not.toBeNull()
    // Stretch should exceed the personal cap.
    expect(result.capValue as number).toBeGreaterThan(50)
    // But never exceed the affordability ceiling.
    expect(result.capValue as number).toBeLessThanOrEqual(120)
    assertNoDashes(result.cap, result.rationale, result.scarcityNote)
  })

  it('PUSH cap is clamped to the budget ceiling', () => {
    const player = makePlayer({ consensusTier: 1 })
    const result = computeWhatToDo(
      baseInput({
        player,
        isTarget: true,
        myMaxBid: 50,
        budgetMaxBid: 52, // stretch (57) would exceed this
        scarcity: makeScarcity({ tier1Remaining: 1, startableRemaining: 1 }),
      }),
    )
    expect(result.move).toBe('PUSH')
    expect(result.capValue).toBe(52)
  })

  it('HOLD when a comparable player is still on the board at a similar or lower price', () => {
    const player = makePlayer({ name: 'Patrick Mahomes', consensusAuctionValue: 52 })
    const altPlayer = makePlayer({
      id: 'p-allen',
      name: 'Josh Allen',
      consensusAuctionValue: 50,
      consensusTier: 1,
    })
    const result = computeWhatToDo(
      baseInput({
        player,
        scored: makeScored(player, { combinedScore: 70 }),
        alternatives: [makeScored(altPlayer, { combinedScore: 71 })],
        scarcity: makeScarcity({ tier1Remaining: 3 }),
      }),
    )
    expect(result.move).toBe('HOLD')
    expect(result.moveColor).toBe('gold')
    expect(result.rationale).toContain('Josh Allen')
    expect(result.cap).toContain('under')
    assertNoDashes(result.cap, result.rationale, result.scarcityNote)
  })

  it('does not HOLD on a more expensive alternative', () => {
    const player = makePlayer({ name: 'Patrick Mahomes', consensusAuctionValue: 52 })
    const pricierAlt = makePlayer({
      id: 'p-lamar',
      name: 'Lamar Jackson',
      consensusAuctionValue: 70, // more expensive, so not a hold reason
      consensusTier: 1,
    })
    const result = computeWhatToDo(
      baseInput({
        player,
        scored: makeScored(player, { combinedScore: 70 }),
        alternatives: [makeScored(pricierAlt, { combinedScore: 75 })],
        scarcity: makeScarcity({ tier1Remaining: 3 }),
      }),
    )
    expect(result.move).toBe('BID')
  })

  it('BID when the player is a target with no comparable alternative waiting', () => {
    const result = computeWhatToDo(
      baseInput({
        isTarget: true,
        alternatives: [],
        scarcity: makeScarcity({ tier1Remaining: 3 }),
      }),
    )
    expect(result.move).toBe('BID')
    expect(result.moveColor).toBe('volt')
    expect(result.cap).toContain('go up to')
    expect(result.capValue).toBe(50)
    expect(result.rationale).toContain('target')
    assertNoDashes(result.cap, result.rationale)
  })

  it('personal cap is clamped to affordability on a BID', () => {
    const result = computeWhatToDo(
      baseInput({
        isTarget: true,
        myMaxBid: 80,
        budgetMaxBid: 40, // wallet says no more than 40
        alternatives: [],
      }),
    )
    expect(result.move).toBe('BID')
    expect(result.capValue).toBe(40)
  })

  it('always reports the tier label and a market estimate', () => {
    const result = computeWhatToDo(baseInput())
    expect(result.tierLabel).toBe('TIER 1')
    expect(result.marketEst).toBe(52)
    expect(result.range).not.toBeNull()
  })

  it('handles a missing strategy cap by falling back to market', () => {
    const result = computeWhatToDo(
      baseInput({
        myMaxBid: null,
        scored: null,
        alternatives: [],
        isTarget: false,
      }),
    )
    // No personal cap, no scored entry: still produces a usable directive.
    expect(['BID', 'HOLD', 'PUSH', 'PASS']).toContain(result.move)
    expect(result.marketEst).toBe(52)
    assertNoDashes(result.cap, result.rationale)
  })
})

// --- DEC-1 (BIAS): avoidSeverity ------------------------------------------
// Mirrors sim-engine.ts's already-shipped pattern: only an explicit hard avoid
// = never bid (force PASS). An unset severity defaults to soft (Joe ruling
// 2026-08-17), so soft avoid = discount only, still in the decision tree.

describe('computeWhatToDo -DEC-1 (BIAS) avoidSeverity', () => {
  it('explicit hard avoid still forces PASS (regression protection)', () => {
    const result = computeWhatToDo(baseInput({ isAvoid: true, avoidSeverity: 'hard' }))
    expect(result.move).toBe('PASS')
    expect(result.rationale).toContain('avoid')
  })

  it('unset severity on an avoid defaults to soft (discount, not PASS)', () => {
    const result = computeWhatToDo(baseInput({ isAvoid: true }))
    expect(result.move).not.toBe('PASS')
  })

  it('soft avoid does NOT force PASS: it flows through at a discounted cap', () => {
    const result = computeWhatToDo(
      baseInput({ isAvoid: true, avoidSeverity: 'soft', myMaxBid: 50, budgetMaxBid: 120 }),
    )
    expect(result.move).not.toBe('PASS')
    // 50 (myMaxBid, budget allows it) halved by the soft-avoid discount = 25.
    expect(result.capValue).toBe(25)
    expect(result.rationale.toLowerCase()).toContain('discount')
    assertNoDashes(result.cap, result.rationale)
  })

  it('soft avoid never PUSHes, even on the last of a scarce tier you would otherwise want', () => {
    const player = makePlayer({ consensusTier: 1 })
    const result = computeWhatToDo(
      baseInput({
        player,
        isTarget: true,
        isAvoid: true,
        avoidSeverity: 'soft',
        scarcity: makeScarcity({ tier1Remaining: 1, startableRemaining: 1 }),
        alternatives: [],
      }),
    )
    expect(result.move).not.toBe('PUSH')
  })

  it('hard avoid takes precedence over affordability regardless of severity default', () => {
    const result = computeWhatToDo(
      baseInput({ isAvoid: true, avoidSeverity: 'hard', budgetMaxBid: 200 }),
    )
    expect(result.move).toBe('PASS')
  })
})
