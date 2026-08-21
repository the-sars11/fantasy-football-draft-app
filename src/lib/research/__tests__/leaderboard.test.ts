/**
 * leaderboard.test.ts - W1: covers the two pure functions the Strategy
 * Leaderboard screen relies on - rankStrategies (the sort + tiebreak order)
 * and resolveTargetPrice (solver-first, consensus-fallback, never fabricated).
 */

import { describe, it, expect } from 'vitest'
import { rankStrategies, resolveTargetPrice } from '../leaderboard'
import type { DatasetStrategy, EnrichedPlayer } from '../dataset-types'
import type { PersistedSimResults } from '@/lib/draft/sim-results'
import type { GradeSummary } from '@/lib/draft/sim-grade'
import type { SimDistribution } from '@/lib/draft/sim-engine'
import type { StrategyProposal } from '../strategy/research'
import type { TargetPricing } from '../strategy/target-pricing'

function makeDistributionStats(overrides: Partial<SimDistribution['myTotalCeiling']> = {}) {
  return { min: 0, max: 0, mean: 0, median: 0, p10: 0, p90: 0, stdev: 0, ...overrides }
}

function makeDistribution(): SimDistribution {
  return {
    runs: 400,
    myTotalCeiling: makeDistributionStats(),
    mySpend: makeDistributionStats(),
    myPositionMeans: { QB: 1, RB: 1, WR: 1, TE: 1, DEF: 1 },
  }
}

function makeGrade(overrides: Partial<GradeSummary> = {}): GradeSummary {
  return {
    runs: 400,
    games: 14,
    numManagers: 12,
    meanStarterPoints: 1850.4,
    meanRank: 3.2,
    meanWins: 8.4,
    meanLosses: 5.6,
    modalRecord: { wins: 9, losses: 5, frequencyPct: 36.7 },
    bestRecord: { wins: 12, losses: 2 },
    worstRecord: { wins: 5, losses: 9 },
    ...overrides,
  }
}

function makeSim(overrides: Partial<PersistedSimResults> = {}): PersistedSimResults {
  return {
    kind: 'sim',
    config: {
      runs: 400,
      seed: 1,
      numManagers: 12,
      budget: 200,
      games: 14,
      studThreshold: 10,
      biasedPlayers: 0,
    },
    grade: makeGrade(),
    topRosters: [],
    landed: [],
    distribution: makeDistribution(),
    ...overrides,
  }
}

function makeProposal(overrides: Partial<StrategyProposal> = {}): StrategyProposal {
  return {
    name: 'Hero RB',
    archetype: 'hero-rb-auction',
    description: 'desc',
    philosophy: 'phil',
    risk_tolerance: 'balanced',
    position_weights: {},
    key_targets: [],
    key_avoids: [],
    reasoning: 'reason',
    projected_ceiling: 80,
    projected_floor: 50,
    confidence: 'medium',
    ...overrides,
  }
}

function makeStrategy(overrides: {
  proposal?: Partial<StrategyProposal>
  sim?: Partial<PersistedSimResults>
  grade?: Partial<GradeSummary>
} = {}): DatasetStrategy {
  return {
    proposal: makeProposal(overrides.proposal),
    sim: makeSim({ ...overrides.sim, grade: makeGrade({ ...overrides.grade, ...overrides.sim?.grade }) }),
  }
}

describe('rankStrategies', () => {
  it('sorts descending by meanWins', () => {
    const low = makeStrategy({ proposal: { name: 'Low' }, grade: { meanWins: 6.0 } })
    const high = makeStrategy({ proposal: { name: 'High' }, grade: { meanWins: 9.5 } })
    const mid = makeStrategy({ proposal: { name: 'Mid' }, grade: { meanWins: 8.0 } })

    const ranked = rankStrategies([low, high, mid])

    expect(ranked.map((s) => s.proposal.name)).toEqual(['High', 'Mid', 'Low'])
  })

  it('breaks a meanWins tie on modalRecord.wins, higher first', () => {
    const a = makeStrategy({
      proposal: { name: 'A' },
      grade: { meanWins: 8.4, modalRecord: { wins: 8, losses: 6, frequencyPct: 30 } },
    })
    const b = makeStrategy({
      proposal: { name: 'B' },
      grade: { meanWins: 8.4, modalRecord: { wins: 10, losses: 4, frequencyPct: 30 } },
    })

    const ranked = rankStrategies([a, b])

    expect(ranked.map((s) => s.proposal.name)).toEqual(['B', 'A'])
  })

  it('breaks a full tie alphabetically by proposal name', () => {
    const zeta = makeStrategy({ proposal: { name: 'Zeta' } })
    const alpha = makeStrategy({ proposal: { name: 'Alpha' } })

    const ranked = rankStrategies([zeta, alpha])

    expect(ranked.map((s) => s.proposal.name)).toEqual(['Alpha', 'Zeta'])
  })

  it('does not mutate the input array', () => {
    const low = makeStrategy({ proposal: { name: 'Low' }, grade: { meanWins: 6.0 } })
    const high = makeStrategy({ proposal: { name: 'High' }, grade: { meanWins: 9.5 } })
    const input = [low, high]

    rankStrategies(input)

    expect(input).toEqual([low, high])
  })
})

describe('resolveTargetPrice', () => {
  const targetPricing: TargetPricing = {
    budget: 200,
    prices: [
      {
        name: 'Christian McCaffrey',
        position: 'RB',
        price: 60,
        baseValue: 67,
        walkUp: 66,
        durabilityFactor: 0.89,
      },
    ],
    targetTotal: 60,
    reserve: 12,
    total: 72,
    fits: true,
  }

  const players: EnrichedPlayer[] = [
    {
      id: 'p1',
      name: 'Christian McCaffrey',
      team: 'SF',
      position: 'RB',
      byeWeek: 9,
      injuryStatus: null,
      consensusRank: 1,
      adp: 1,
      consensusAuctionValue: 70,
      ceilingValue: 75,
      expectedRoomPrice: 67,
      valueGap: null,
      projectedPoints: 300,
      vorp: 100,
      expertTier: 1,
      ecrPositionRank: 1,
      valueBand: { low: 60, base: 67, high: 75, source: 'league' },
      tags: [],
      read: { line: 'Anchor - pay up to $67 to lock a Tier 1 player.', intent: 'anchor' },
      landProbability: 0.5,
    },
    {
      id: 'p2',
      name: 'Fallback Guy',
      team: 'KC',
      position: 'WR',
      byeWeek: 10,
      injuryStatus: null,
      consensusRank: 40,
      adp: 40,
      consensusAuctionValue: 22,
      ceilingValue: null,
      expectedRoomPrice: 18,
      valueGap: null,
      projectedPoints: 150,
      vorp: 20,
      expertTier: 3,
      ecrPositionRank: 12,
      valueBand: { low: 18, base: 20, high: 22, source: 'national' },
      tags: [],
      read: { line: 'Fair value, here is the band.', intent: 'fair' },
      landProbability: 0.3,
    },
  ]

  it('resolves a priced target from target_pricing (solver path), room before the durability haircut', () => {
    const resolved = resolveTargetPrice('Christian McCaffrey', targetPricing, players)

    expect(resolved.source).toBe('solver')
    expect(resolved.price).toBe(60)
    expect(resolved.roomPrice).toBe(67)
    expect(resolved.durabilityFactor).toBe(0.89)
  })

  it('is case-insensitive when matching target_pricing', () => {
    const resolved = resolveTargetPrice('christian mccaffrey', targetPricing, players)
    expect(resolved.source).toBe('solver')
    expect(resolved.price).toBe(60)
  })

  it('falls back to the EnrichedPlayer expected room price when there is no target_pricing entry', () => {
    const resolved = resolveTargetPrice('Fallback Guy', targetPricing, players)

    expect(resolved.source).toBe('consensus')
    expect(resolved.price).toBe(18)
    expect(resolved.roomPrice).toBeNull()
    expect(resolved.durabilityFactor).toBeNull()
  })

  it('falls back to consensusAuctionValue when expectedRoomPrice is null', () => {
    const playerNoRoom: EnrichedPlayer = { ...players[1], name: 'No Room Guy', expectedRoomPrice: null }
    const resolved = resolveTargetPrice('No Room Guy', targetPricing, [playerNoRoom])

    expect(resolved.source).toBe('consensus')
    expect(resolved.price).toBe(22)
  })

  it('returns an unknown, all-null shape for a name matching no player - never a fabricated number', () => {
    const resolved = resolveTargetPrice('Nobody Real', targetPricing, players)

    expect(resolved.source).toBe('unknown')
    expect(resolved.price).toBeNull()
    expect(resolved.roomPrice).toBeNull()
  })

  it('handles an undefined target_pricing (snake proposals never carry one)', () => {
    const resolved = resolveTargetPrice('Fallback Guy', undefined, players)
    expect(resolved.source).toBe('consensus')
    expect(resolved.price).toBe(18)
  })
})
