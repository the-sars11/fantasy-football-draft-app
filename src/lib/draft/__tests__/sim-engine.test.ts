/**
 * sim-engine.test.ts — R10a Monte-Carlo auction simulation engine
 *
 * Covers the two acceptance clauses by name:
 *   (1) OPPONENT-BIDDING MATH — second-price clearing, roster-constrained max-bid
 *       via the solver, budget/slot invariants, no double-drafting.
 *   (2) DETERMINISM UNDER SEED — same seed => byte-identical runs/distribution;
 *       different seed => diverging outcomes.
 * Plus: the PRNG, the percentile helper, and a full 12-team Nasties smoke run.
 */

import { describe, it, expect } from 'vitest'
import {
  mulberry32,
  runAuctionSim,
  runMonteCarlo,
  percentile,
  type SimEngineInput,
  type SimRosterConfig,
} from '../sim-engine'
import type { BoardPlayer } from '../roster-solver'

// ─── Fixtures ──────────────────────────────────────────────────────────────

function p(
  id: string,
  position: BoardPlayer['position'],
  ceiling: number,
  expectedCost: number,
): BoardPlayer {
  return { id, name: id, position, ceiling, expectedCost }
}

const NASTIES_CONFIG: SimRosterConfig = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5, ir: 1,
}

function totalSlots(c: SimRosterConfig): number {
  return (c.qb + c.rb + c.wr + c.te + c.flex + c.dst + c.bench + (c.ir ?? 0))
}

/** A generously deep, valued board so 12 managers can fill full rosters. */
function bigBoard(): BoardPlayer[] {
  const board: BoardPlayer[] = []
  const spec: [BoardPlayer['position'], number, number][] = [
    ['QB', 25, 40],
    ['RB', 60, 65],
    ['WR', 60, 65],
    ['TE', 25, 35],
    ['DEF', 20, 15],
  ]
  for (const [pos, count, topCeiling] of spec) {
    for (let i = 0; i < count; i++) {
      // Ceiling tapers from topCeiling down toward $1 across the position depth.
      const ceiling = Math.max(1, Math.round(topCeiling * (1 - i / count)))
      const cost = Math.max(1, Math.round(ceiling * 0.85))
      board.push(p(`${pos}${i + 1}`, pos, ceiling, cost))
    }
  }
  return board
}

function nastiesInput(overrides: Partial<SimEngineInput> = {}): SimEngineInput {
  return {
    board: bigBoard(),
    rosterConfig: NASTIES_CONFIG,
    numManagers: 12,
    budget: 200,
    runs: 8,
    seed: 1,
    ...overrides,
  }
}

// ─── (0) PRNG ────────────────────────────────────────────────────────────────

describe('mulberry32 PRNG', () => {
  it('is deterministic for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = [a(), a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('produces different sequences for different seeds', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    expect([a(), a(), a()]).not.toEqual([b(), b(), b()])
  })

  it('stays within [0, 1)', () => {
    const r = mulberry32(7)
    for (let i = 0; i < 1000; i++) {
      const v = r()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

// ─── (1) Opponent-bidding math ────────────────────────────────────────────────

describe('opponent-bidding math', () => {
  it('clears at second-price + 1 (English auction), capped at winner willingness', () => {
    // Two managers, one bench slot each, one player worth 100, budget 50 each.
    // noisePct 0 => valuation == ceiling == 100. Each has a single bench slot, so
    // maxBid = budget = 50. willing = min(100, 50) = 50 for both. Winner is M0
    // (index tiebreak); second price 50 + 1 caps at the winner's 50 -> pays 50.
    const board = [p('stud', 'RB', 100, 90)]
    const input: SimEngineInput = {
      board,
      rosterConfig: { qb: 0, rb: 0, wr: 0, te: 0, flex: 0, dst: 0, bench: 1 },
      numManagers: 2,
      budget: 50,
      runs: 1,
      seed: 5,
      noisePct: 0,
    }
    const run = runAuctionSim(input, 5)
    const sold = run.rosters.flatMap(r => r.players)
    expect(sold).toHaveLength(1)
    expect(sold[0].price).toBe(50)
    // The other seat won nothing (the single stud went to one manager).
    expect(run.rosters.filter(r => r.players.length > 0)).toHaveLength(1)
  })

  it('an uncontested bidder pays $1 (nobody else can slot the player)', () => {
    // Only manager 0 has a slot for a QB; everyone else has zero slots.
    const board = [p('qb', 'QB', 80, 70)]
    const input: SimEngineInput = {
      board,
      rosterConfig: { qb: 1, rb: 0, wr: 0, te: 0, flex: 0, dst: 0, bench: 0 },
      numManagers: 1,
      budget: 200,
      runs: 1,
      seed: 3,
      noisePct: 0,
    }
    const run = runAuctionSim(input, 3)
    expect(run.rosters[0].players).toHaveLength(1)
    expect(run.rosters[0].players[0].price).toBe(1)
  })

  it('never lets a manager overspend their budget', () => {
    const input = nastiesInput({ runs: 12 })
    const result = runMonteCarlo(input)
    for (const run of result.runs) {
      for (const roster of run.rosters) {
        expect(roster.spent).toBeLessThanOrEqual(input.budget)
        expect(roster.budgetLeft).toBeGreaterThanOrEqual(0)
        expect(roster.spent + roster.budgetLeft).toBe(input.budget)
      }
    }
  })

  it('never exceeds a manager\'s total roster capacity', () => {
    const cap = totalSlots(NASTIES_CONFIG)
    const result = runMonteCarlo(nastiesInput({ runs: 6 }))
    for (const run of result.runs) {
      for (const roster of run.rosters) {
        expect(roster.players.length).toBeLessThanOrEqual(cap)
      }
    }
  })

  it('never drafts the same player to two managers in one run', () => {
    const result = runMonteCarlo(nastiesInput({ runs: 6 }))
    for (const run of result.runs) {
      const ids = run.rosters.flatMap(r => r.players.map(pl => pl.id))
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('every sold player clears at >= $1', () => {
    const result = runMonteCarlo(nastiesInput({ runs: 6 }))
    for (const run of result.runs) {
      for (const roster of run.rosters) {
        for (const pl of roster.players) {
          expect(pl.price).toBeGreaterThanOrEqual(1)
        }
      }
    }
  })

  it('respects the $1-per-remaining-slot completion reserve (studs never strand a roster)', () => {
    // A single very expensive stud plus many cheap fillers. The solver reserve
    // guarantees an inductive invariant: after every purchase a manager still
    // holds at least $1 for each slot they have left to fill. At draft end that
    // means budgetLeft >= (capacity - players filled) for EVERY manager -- so no
    // one can ever sink so much on the stud that the roster becomes uncompletable.
    const board: BoardPlayer[] = [p('mega', 'RB', 400, 195)]
    for (let i = 0; i < 200; i++) {
      board.push(p(`fill${i}`, (['RB', 'WR', 'TE', 'QB', 'DEF'] as const)[i % 5], 5, 2))
    }
    const cap = totalSlots(NASTIES_CONFIG)
    const result = runMonteCarlo({
      board,
      rosterConfig: NASTIES_CONFIG,
      numManagers: 12,
      budget: 200,
      runs: 4,
      seed: 9,
    })
    for (const run of result.runs) {
      for (const roster of run.rosters) {
        const openSlots = cap - roster.players.length
        expect(roster.budgetLeft).toBeGreaterThanOrEqual(openSlots)
      }
    }
  })
})

// ─── (2) Determinism under seed ────────────────────────────────────────────────

describe('determinism under seed', () => {
  it('runAuctionSim is byte-identical for the same seed', () => {
    const input = nastiesInput()
    const a = runAuctionSim(input, 123)
    const b = runAuctionSim(input, 123)
    expect(a).toEqual(b)
  })

  it('runAuctionSim diverges for different seeds', () => {
    const input = nastiesInput()
    const a = runAuctionSim(input, 1)
    const b = runAuctionSim(input, 2)
    // At least one seat's roster differs (prices or players).
    expect(a).not.toEqual(b)
  })

  it('runMonteCarlo is fully reproducible for the same base seed', () => {
    const input = nastiesInput({ runs: 8, seed: 77 })
    const a = runMonteCarlo(input)
    const b = runMonteCarlo(input)
    expect(a.runs).toEqual(b.runs)
    expect(a.distribution).toEqual(b.distribution)
  })

  it('runMonteCarlo distribution shifts for a different base seed', () => {
    const a = runMonteCarlo(nastiesInput({ runs: 8, seed: 100 }))
    const b = runMonteCarlo(nastiesInput({ runs: 8, seed: 500 }))
    // The full run sets differ; the aggregate mean is very unlikely to match.
    expect(a.runs).not.toEqual(b.runs)
  })

  it('each run i uses base seed + i (seeds are recorded and sequential)', () => {
    const result = runMonteCarlo(nastiesInput({ runs: 5, seed: 40 }))
    expect(result.runs.map(r => r.seed)).toEqual([40, 41, 42, 43, 44])
  })
})

// ─── (3) Distribution + full Nasties smoke ─────────────────────────────────────

describe('distribution stats', () => {
  it('percentile interpolates correctly', () => {
    const v = [10, 20, 30, 40, 50]
    expect(percentile(v, 0)).toBe(10)
    expect(percentile(v, 0.5)).toBe(30)
    expect(percentile(v, 1)).toBe(50)
    expect(percentile(v, 0.25)).toBe(20)
  })

  it('percentile handles empty and singleton arrays', () => {
    expect(percentile([], 0.5)).toBe(0)
    expect(percentile([42], 0.9)).toBe(42)
  })

  it('produces a coherent distribution over the me-seat', () => {
    const result = runMonteCarlo(nastiesInput({ runs: 16 }))
    const d = result.distribution
    expect(d.runs).toBe(16)
    expect(d.myTotalCeiling.min).toBeLessThanOrEqual(d.myTotalCeiling.mean)
    expect(d.myTotalCeiling.mean).toBeLessThanOrEqual(d.myTotalCeiling.max)
    expect(d.myTotalCeiling.p10).toBeLessThanOrEqual(d.myTotalCeiling.p90)
    expect(d.mySpend.mean).toBeGreaterThan(0)
    expect(d.mySpend.max).toBeLessThanOrEqual(200)
  })
})

describe('full 12-team Nasties smoke run', () => {
  it('fills every seat and returns 12 rosters per run', () => {
    const result = runMonteCarlo(nastiesInput({ runs: 4 }))
    const cap = totalSlots(NASTIES_CONFIG)
    for (const run of result.runs) {
      expect(run.rosters).toHaveLength(12)
      // Deep board => every manager should reach a full roster.
      for (const roster of run.rosters) {
        expect(roster.players.length).toBe(cap)
      }
    }
  })

  it('exposes the me-seat roster with real position counts', () => {
    const run = runAuctionSim(nastiesInput(), 1)
    const my = run.myRoster
    expect(my.isMe).toBe(true)
    const sumCounts =
      my.positionCounts.QB + my.positionCounts.RB + my.positionCounts.WR +
      my.positionCounts.TE + my.positionCounts.DEF
    expect(sumCounts).toBe(my.players.length)
    // Every manager must satisfy their dedicated starters given a deep board:
    // at least one QB, one TE, one DEF.
    expect(my.positionCounts.QB).toBeGreaterThanOrEqual(1)
    expect(my.positionCounts.TE).toBeGreaterThanOrEqual(1)
    expect(my.positionCounts.DEF).toBeGreaterThanOrEqual(1)
  })
})
