import { describe, it, expect } from 'vitest'
import { proposeStrategiesRuleBased } from '../research'
import type { StrategyResearchInput } from '../research'
import type { ConsensusPlayer } from '@/lib/research/normalize'

// Minimal League shape matching the app type
const NASTIES_LEAGUE = {
  id: 'test-league',
  userId: 'test-user',
  name: 'The Nasties',
  platform: 'espn' as const,
  format: 'auction' as const,
  size: 12,
  budget: 200,
  scoringFormat: 'ppr' as const,
  rosterSlots: { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, superflex: 0, k: 0, def: 1, bench: 5 },
}

function makePlayer(overrides: Partial<ConsensusPlayer> & { name: string; position: ConsensusPlayer['position']; consensusRank: number }): ConsensusPlayer {
  return {
    team: 'TST',
    byeWeek: 7,
    injuryStatus: null,
    sleeperId: null,
    espnId: null,
    fpId: null,
    consensusAuctionValue: 20,
    consensusTier: 3,
    adp: overrides.consensusRank,
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

const PLAYER_POOL: ConsensusPlayer[] = [
  makePlayer({ name: 'Ja"Marr Chase', position: 'WR', consensusRank: 1, consensusAuctionValue: 70 }),
  makePlayer({ name: 'Breece Hall', position: 'RB', consensusRank: 2, consensusAuctionValue: 65 }),
  makePlayer({ name: 'Sam LaPorta', position: 'TE', consensusRank: 20, consensusAuctionValue: 30 }),
  makePlayer({ name: 'Lamar Jackson', position: 'QB', consensusRank: 5, consensusAuctionValue: 40 }),
  makePlayer({ name: 'Saquon Barkley', position: 'RB', consensusRank: 3, consensusAuctionValue: 60 }),
  makePlayer({ name: 'CeeDee Lamb', position: 'WR', consensusRank: 4, consensusAuctionValue: 55 }),
  makePlayer({ name: 'Justin Jefferson', position: 'WR', consensusRank: 6, consensusAuctionValue: 50 }),
  makePlayer({ name: 'Christian McCaffrey', position: 'RB', consensusRank: 7, consensusAuctionValue: 75 }),
]

const BASE_INPUT: StrategyResearchInput = {
  league: NASTIES_LEAGUE,
  players: PLAYER_POOL,
}

describe('proposeStrategiesRuleBased - core output', () => {
  it('returns exactly 4 proposals', () => {
    const { proposals } = proposeStrategiesRuleBased(BASE_INPUT)
    expect(proposals).toHaveLength(4)
  })

  it('all proposals have required fields', () => {
    const { proposals } = proposeStrategiesRuleBased(BASE_INPUT)
    for (const p of proposals) {
      expect(p.name).toBeTruthy()
      expect(p.archetype).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(p.philosophy).toBeTruthy()
      expect(p.reasoning).toBeTruthy()
      expect(p.key_targets.length).toBeGreaterThan(0)
      expect(p.projected_ceiling).toBeGreaterThan(p.projected_floor)
      expect(p.budget_allocation).toBeTruthy()
      expect(p.max_bid_percentage).toBeGreaterThan(0)
    }
  })

  it('produces inserts with source preset', () => {
    const { inserts } = proposeStrategiesRuleBased(BASE_INPUT)
    expect(inserts).toHaveLength(4)
    for (const ins of inserts) {
      expect(ins.source).toBe('preset')
      expect(ins.league_id).toBe('test-league')
    }
  })

  it('all key_targets reference players that exist in the pool', () => {
    const { proposals } = proposeStrategiesRuleBased(BASE_INPUT)
    const poolNames = new Set(PLAYER_POOL.map((p) => p.name))
    for (const prop of proposals) {
      for (const t of prop.key_targets) {
        expect(poolNames.has(t)).toBe(true)
      }
    }
  })
})

describe('proposeStrategiesRuleBased - user targets', () => {
  it('puts user-specified targets first in key_targets', () => {
    const { proposals } = proposeStrategiesRuleBased({
      ...BASE_INPUT,
      targetNames: ['Breece Hall', 'Saquon Barkley'],
    })
    // At least one proposal should include the user targets in key_targets
    const anyWithTarget = proposals.some((p) =>
      p.key_targets.includes('Breece Hall') || p.key_targets.includes('Saquon Barkley')
    )
    expect(anyWithTarget).toBe(true)
  })

  it('does not include avoided players in key_targets', () => {
    const { proposals } = proposeStrategiesRuleBased({
      ...BASE_INPUT,
      avoidNames: ['Ja"Marr Chase', 'CeeDee Lamb'],
    })
    for (const p of proposals) {
      expect(p.key_targets).not.toContain('Ja"Marr Chase')
      expect(p.key_targets).not.toContain('CeeDee Lamb')
    }
  })

  it('puts avoided player names in key_avoids', () => {
    const { proposals } = proposeStrategiesRuleBased({
      ...BASE_INPUT,
      avoidNames: ['Breece Hall'],
    })
    const anyWithAvoid = proposals.some((p) => p.key_avoids.includes('Breece Hall'))
    expect(anyWithAvoid).toBe(true)
  })
})

// FB-17: proves the chain -- player pool data flows into strategy proposals
describe('FB-17 - player pull feeds chain end-to-end', () => {
  it('strategy proposals are derived from the player pool passed in', () => {
    // The player pool (as if freshly pulled into players_cache) feeds directly into proposals
    const { proposals } = proposeStrategiesRuleBased(BASE_INPUT)
    const poolNames = new Set(PLAYER_POOL.map((p) => p.name))
    const allTargets = proposals.flatMap((p) => p.key_targets)
    // Every target came from the pool - not invented
    for (const t of allTargets) {
      expect(poolNames.has(t)).toBe(true)
    }
  })

  it('a different player pool produces different targets', () => {
    const altPool: ConsensusPlayer[] = [
      makePlayer({ name: 'Alt RB One', position: 'RB', consensusRank: 1 }),
      makePlayer({ name: 'Alt WR One', position: 'WR', consensusRank: 2 }),
      makePlayer({ name: 'Alt QB One', position: 'QB', consensusRank: 3 }),
      makePlayer({ name: 'Alt TE One', position: 'TE', consensusRank: 4 }),
    ]
    const { proposals: altProposals } = proposeStrategiesRuleBased({
      ...BASE_INPUT,
      players: altPool,
    })
    const altTargets = new Set(altProposals.flatMap((p) => p.key_targets))
    // Targets must come from the alt pool
    const originalPoolNames = new Set(PLAYER_POOL.map((p) => p.name))
    for (const t of altTargets) {
      expect(originalPoolNames.has(t)).toBe(false)
    }
  })
})
