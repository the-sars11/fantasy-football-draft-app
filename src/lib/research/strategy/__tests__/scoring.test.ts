/**
 * scoring.test.ts — Strategy Scoring Engine (FF-S02 / FF-227 / FF-230).
 *
 * Locks the load-bearing behavior the research dataset leans on:
 *   - position-weight / target / avoid / team-avoid / risk score model
 *   - intel modifiers (user tags + system tags + rules) and the 0-100 clamp
 *   - computeAdjustedAuctionValue, including the two shipped bug fixes:
 *       BUG-R13-02  budget_allocation keys DEF as 'DST'; legacy 'DEF' still resolves
 *       BUG-R13-07  a binding max-bid cap returns whole auction dollars, never a fraction
 * Pure, $0 — no Claude, no DB.
 */

import { describe, it, expect } from 'vitest'
import { scorePlayersWithStrategy, calculateIntelScore } from '../scoring'
import type { PlayerIntelContext } from '../scoring'
import type { Player, Position } from '@/lib/players/types'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makePlayer(
  overrides: Partial<Player> & { id: string; position: Position },
): Player {
  return {
    name: overrides.id,
    team: 'TST',
    byeWeek: 7,
    consensusRank: 20,
    consensusAuctionValue: 20,
    consensusTier: 3,
    adp: 20,
    sourceData: [],
    projections: { points: 200 },
    ...overrides,
  }
}

function makeStrategy(overrides: Partial<DbStrategy> = {}): DbStrategy {
  return {
    id: 'strat-1',
    user_id: 'u1',
    league_id: 'l1',
    name: 'Test',
    description: null,
    archetype: 'balanced',
    source: 'preset',
    is_active: true,
    position_weights: { QB: 5, RB: 5, WR: 5, TE: 5, DST: 5, K: 5 } as DbStrategy['position_weights'],
    player_targets: [],
    player_avoids: [],
    team_avoids: [],
    risk_tolerance: 'balanced',
    budget_allocation: { QB: 5, RB: 40, WR: 35, TE: 8, DST: 2, bench: 10 },
    max_bid_percentage: 40,
    round_targets: null,
    position_round_priority: null,
    ai_reasoning: null,
    ai_confidence: null,
    projected_ceiling: null,
    projected_floor: null,
    created_at: '',
    updated_at: '',
    ...overrides,
  }
}

function scoreOne(player: Player, strategy: DbStrategy, budget = 200) {
  return scorePlayersWithStrategy([player], strategy, 'auction', budget)[0]
}

// ─── Score model ─────────────────────────────────────────────────────────────

describe('scorePlayersWithStrategy - strategy score model', () => {
  it('baseline with neutral weights and no tags is 50', () => {
    const s = scoreOne(makePlayer({ id: 'p', position: 'WR' }), makeStrategy())
    expect(s.strategyScore).toBe(50)
    expect(s.targetStatus).toBe('neutral')
  })

  it('position emphasis raises the score (RB weight 9 -> +16)', () => {
    const strat = makeStrategy({
      position_weights: { QB: 5, RB: 9, WR: 5, TE: 5, DST: 5, K: 5 } as DbStrategy['position_weights'],
    })
    const s = scoreOne(makePlayer({ id: 'rb', position: 'RB' }), strat)
    expect(s.strategyScore).toBe(66) // 50 + (9-5)*4
  })

  it('a heavily targeted player crosses the target threshold', () => {
    const rb = makePlayer({ id: 'rb1', position: 'RB' })
    const strat = makeStrategy({
      player_targets: [{ player_id: 'rb1', player_name: 'rb1', weight: 10 }],
    })
    const s = scoreOne(rb, strat)
    expect(s.strategyScore).toBe(80) // 50 + 10*3
    expect(s.targetStatus).toBe('target')
  })

  it('a hard avoid drives the score down and flags avoid', () => {
    const wr = makePlayer({ id: 'wr9', position: 'WR' })
    const strat = makeStrategy({
      player_avoids: [{ player_id: 'wr9', player_name: 'wr9', severity: 'hard' }],
    })
    const s = scoreOne(wr, strat)
    expect(s.strategyScore).toBe(10) // 50 - 40
    expect(s.targetStatus).toBe('avoid')
  })

  it('clamps the strategy score into [0, 100]', () => {
    const wr = makePlayer({ id: 'wr', position: 'WR' })
    const strat = makeStrategy({
      position_weights: { QB: 5, RB: 5, WR: 0, TE: 5, DST: 5, K: 5 } as DbStrategy['position_weights'],
      player_avoids: [{ player_id: 'wr', player_name: 'wr', severity: 'hard' }],
      team_avoids: ['TST'],
    })
    const s = scoreOne(wr, strat)
    expect(s.strategyScore).toBeGreaterThanOrEqual(0)
    expect(s.strategyScore).toBeLessThanOrEqual(100)
  })

  it('sorts results by combinedScore descending', () => {
    const target = makePlayer({ id: 'good', position: 'RB' })
    const avoid = makePlayer({ id: 'bad', position: 'RB' })
    const strat = makeStrategy({
      player_targets: [{ player_id: 'good', player_name: 'good', weight: 10 }],
      player_avoids: [{ player_id: 'bad', player_name: 'bad', severity: 'hard' }],
    })
    const out = scorePlayersWithStrategy([avoid, target], strat, 'auction', 200)
    expect(out[0].player.id).toBe('good')
    expect(out[1].player.id).toBe('bad')
  })
})

// ─── Intel modifiers ─────────────────────────────────────────────────────────

describe('intel modifiers', () => {
  it('a user TARGET tag adds +25 and forces target status', () => {
    const p = makePlayer({ id: 'p', position: 'WR' })
    const intel = new Map<string, PlayerIntelContext>([['p', { userTags: ['target'] }]])
    const s = scorePlayersWithStrategy([p], makeStrategy(), 'auction', 200, intel)[0]
    expect(s.intelScore).toBe(25)
    expect(s.isUserTarget).toBe(true)
    expect(s.targetStatus).toBe('target')
  })

  it('a system BUST tag is negative; a dismissed tag is ignored', () => {
    const p = makePlayer({ id: 'p', position: 'WR' })
    const withBust = new Map<string, PlayerIntelContext>([
      ['p', { systemTags: [{ tag: 'BUST', reasoning: 'age cliff' }] as never }],
    ])
    const dismissed = new Map<string, PlayerIntelContext>([
      ['p', { systemTags: [{ tag: 'BUST', reasoning: 'age cliff' }] as never, dismissedSystemTags: ['BUST'] }],
    ])
    expect(scorePlayersWithStrategy([p], makeStrategy(), 'auction', 200, withBust)[0].intelScore).toBe(-20)
    expect(scorePlayersWithStrategy([p], makeStrategy(), 'auction', 200, dismissed)[0].intelScore).toBe(0)
  })

  it('combined score is clamped to 100 even when intel piles on', () => {
    const rb = makePlayer({ id: 'rb', position: 'RB' })
    const strat = makeStrategy({
      position_weights: { QB: 5, RB: 10, WR: 5, TE: 5, DST: 5, K: 5 } as DbStrategy['position_weights'],
      player_targets: [{ player_id: 'rb', player_name: 'rb', weight: 10 }],
    })
    const intel = new Map<string, PlayerIntelContext>([['rb', { userTags: ['target', 'breakout'] }]])
    const s = scorePlayersWithStrategy([rb], strat, 'auction', 200, intel)[0]
    expect(s.combinedScore).toBe(100)
  })

  it('calculateIntelScore standalone sums user + system + rules', () => {
    const { score } = calculateIntelScore(
      ['target'],
      [{ tag: 'VALUE', reasoning: 'adp gap' }] as never,
      [],
      [-5],
    )
    expect(score).toBe(25 + 12 - 5)
  })
})

// ─── computeAdjustedAuctionValue (via public API) ────────────────────────────

describe('computeAdjustedAuctionValue', () => {
  it('a bigger position budget share pushes the adjusted value up', () => {
    const rb = makePlayer({ id: 'rb', position: 'RB', consensusAuctionValue: 30 })
    const wr = makePlayer({ id: 'wr', position: 'WR', consensusAuctionValue: 30 })
    // RB gets 40% of budget, WR 35% -> RB should be valued higher at equal base.
    const strat = makeStrategy()
    const rbVal = scoreOne(rb, strat).adjustedAuctionValue!
    const wrVal = scoreOne(wr, strat).adjustedAuctionValue!
    expect(rbVal).toBeGreaterThan(wrVal)
  })

  it('BUG-R13-02: reads the DST budget key for a DEF player', () => {
    const def = makePlayer({ id: 'def', position: 'DEF', consensusAuctionValue: 10 })
    const dstKeyed = makeStrategy({ budget_allocation: { RB: 40, DST: 30, bench: 10 } })
    const legacyKeyed = makeStrategy({ budget_allocation: { RB: 40, DEF: 30, bench: 10 } })
    const dstVal = scoreOne(def, dstKeyed).adjustedAuctionValue!
    const legacyVal = scoreOne(def, legacyKeyed).adjustedAuctionValue!
    // Both resolve to the same 30% share -> identical adjusted value (fallback works).
    expect(dstVal).toBe(legacyVal)
    expect(dstVal).toBeGreaterThan(0)
  })

  it('BUG-R13-07: a binding max-bid cap returns a whole-dollar value', () => {
    // Elite base + 33% cap of $200 = $66 ceiling; the adjusted value binds on it.
    const stud = makePlayer({ id: 'stud', position: 'RB', consensusAuctionValue: 200 })
    const strat = makeStrategy({ max_bid_percentage: 33 })
    const val = scoreOne(stud, strat, 200).adjustedAuctionValue!
    expect(val).toBe(66) // round(200 * 0.33) = 66, integer, not 66.xx
    expect(Number.isInteger(val)).toBe(true)
  })

  it('never returns below $1', () => {
    const scrub = makePlayer({ id: 'scrub', position: 'TE', consensusAuctionValue: 1 })
    const strat = makeStrategy({
      budget_allocation: { RB: 40, TE: 1, bench: 10 },
    })
    const val = scoreOne(scrub, strat).adjustedAuctionValue!
    expect(val).toBeGreaterThanOrEqual(1)
  })

  it('is only computed in auction mode', () => {
    const p = makePlayer({ id: 'p', position: 'RB' })
    const snake = scorePlayersWithStrategy([p], makeStrategy(), 'snake', 200)[0]
    expect(snake.adjustedAuctionValue).toBeUndefined()
  })
})
