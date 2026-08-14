/**
 * generate.test.ts — R9 Part 1: proves the pool+solver strategy generator.
 *
 * These tests prove the four claims the task rests on:
 *   1. Strategies EMERGE from the board, not a hardcoded archetype list.
 *   2. The BOARD GATE holds: a shape the board can't support is never offered
 *      (no RB on the board -> no RB anchor; too-tight budget -> no anchors).
 *   3. Every generated shape respects the solver's $1-per-slot completion
 *      invariant, so it always fits the budget.
 *   4. key_targets are real board players (pool-driven), and archetypes dedupe.
 */

import { describe, it, expect } from 'vitest'
import {
  generateAnchorStrategies,
  generateStrategiesFromPool,
  priceBoard,
  type PricedBoardPlayer,
  type AnchorSlots,
} from './generate'
import type { ConsensusPlayer } from '@/lib/research/normalize'
import type { League, Position } from '@/lib/players/types'

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Full Nasties starting slots: 1QB/1RB/1WR/1TE/3FLEX/1DST/5BENCH = 13. */
const NASTIES_SLOTS: AnchorSlots = { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5 }

function bp(
  id: string,
  position: PricedBoardPlayer['position'],
  ceiling: number,
  expectedCost: number,
  posRank = 1,
): PricedBoardPlayer {
  return { id, name: `Board ${id}`, position, ceiling, expectedCost, posRank }
}

/**
 * A realistic-ish priced board: elite RB + WR cliffs, cheaper depth, one QB/TE/DEF.
 * Enough spread that several budget-shape policies produce distinct shapes.
 */
function fullBoard(): PricedBoardPlayer[] {
  return [
    bp('rb-elite', 'RB', 68, 62, 1),
    bp('rb-2', 'RB', 55, 48, 2),
    bp('rb-3', 'RB', 30, 22, 3),
    bp('rb-4', 'RB', 14, 8, 4),
    bp('rb-5', 'RB', 6, 3, 5),
    bp('wr-elite', 'WR', 64, 58, 1),
    bp('wr-2', 'WR', 58, 50, 2),
    bp('wr-3', 'WR', 44, 33, 3),
    bp('wr-4', 'WR', 22, 14, 4),
    bp('wr-5', 'WR', 9, 4, 5),
    bp('te-1', 'TE', 34, 26, 1),
    bp('te-2', 'TE', 12, 6, 2),
    bp('qb-1', 'QB', 28, 18, 1),
    bp('qb-2', 'QB', 10, 4, 2),
    bp('def-1', 'DEF', 6, 3, 1),
  ]
}

// ── Core: board gate ─────────────────────────────────────────────────────────

describe('generateAnchorStrategies - board gate', () => {
  it('returns nothing when the board is empty', () => {
    expect(generateAnchorStrategies({ board: [], slots: NASTIES_SLOTS, budget: 200 })).toEqual([])
  })

  it('returns nothing when the budget is zero or negative', () => {
    expect(generateAnchorStrategies({ board: fullBoard(), slots: NASTIES_SLOTS, budget: 0 })).toEqual([])
    expect(generateAnchorStrategies({ board: fullBoard(), slots: NASTIES_SLOTS, budget: -50 })).toEqual([])
  })

  it('never anchors a position that has no players on the board', () => {
    // A WR/TE/QB-only board (zero RB) must never produce an RB-weighted shape.
    const noRb = fullBoard().filter((p) => p.position !== 'RB')
    const strategies = generateAnchorStrategies({ board: noRb, slots: NASTIES_SLOTS, budget: 200 })

    expect(strategies.length).toBeGreaterThan(0)
    for (const s of strategies) {
      // No RB spend surfaces in the budget allocation.
      expect(s.budget_allocation?.RB ?? 0).toBe(0)
      // No RB name leaks into targets (all board RBs were removed).
      const rbTargets = s.key_targets.filter((n) => n.includes('rb-'))
      expect(rbTargets).toHaveLength(0)
    }
  })

  it('offers no anchors when the budget cannot cover even one under the $1/slot reserve', () => {
    // 13 slots must each keep >= $1: the first pick reserves $12 for the other
    // 12 slots. The cheapest board cost is $3, so anything under $15 (3 + 12)
    // can't afford even one anchor. $14 -> zero shapes, proving the gate.
    const tight = generateAnchorStrategies({ board: fullBoard(), slots: NASTIES_SLOTS, budget: 14 })
    expect(tight).toEqual([])
  })
})

// ── Core: completability invariant ───────────────────────────────────────────

describe('generateAnchorStrategies - completability + well-formed shapes', () => {
  it('every proposal fits budget with a positive completion reserve', () => {
    const strategies = generateAnchorStrategies({ board: fullBoard(), slots: NASTIES_SLOTS, budget: 200 })
    expect(strategies.length).toBeGreaterThan(0)

    for (const s of strategies) {
      const alloc = s.budget_allocation ?? {}
      const total = Object.values(alloc).reduce((sum, v) => sum + v, 0)
      // Allocation percentages are normalized to exactly 100.
      expect(total).toBe(100)
      // A completable roster always keeps some budget on the bench bucket.
      expect(alloc.bench ?? 0).toBeGreaterThan(0)
      // Max bid stays within the sane clamp the generator enforces.
      expect(s.max_bid_percentage ?? 0).toBeGreaterThanOrEqual(10)
      expect(s.max_bid_percentage ?? 0).toBeLessThanOrEqual(70)
    }
  })

  it('scales the anchor count to the slots actually open', () => {
    // Only one open starter slot -> at most one anchor is bought.
    const oneSlot: AnchorSlots = { qb: 0, rb: 1, wr: 0, te: 0, flex: 0, dst: 0, bench: 0 }
    const strategies = generateAnchorStrategies({ board: fullBoard(), slots: oneSlot, budget: 200 })
    expect(strategies.length).toBeGreaterThan(0)
    for (const s of strategies) {
      expect(s.key_targets.length).toBeLessThanOrEqual(1)
    }
  })
})

// ── Core: pool-driven targets + dedupe ───────────────────────────────────────

describe('generateAnchorStrategies - pool-driven targets + dedupe', () => {
  it('draws every key target from the real board (nothing invented)', () => {
    const board = fullBoard()
    const names = new Set(board.map((p) => p.name))
    const strategies = generateAnchorStrategies({ board, slots: NASTIES_SLOTS, budget: 200 })

    for (const s of strategies) {
      for (const t of s.key_targets) {
        expect(names.has(t)).toBe(true)
      }
    }
  })

  it('dedupes converged shapes so each archetype appears at most once', () => {
    const strategies = generateAnchorStrategies({ board: fullBoard(), slots: NASTIES_SLOTS, budget: 200 })
    const archetypes = strategies.map((s) => s.archetype)
    expect(new Set(archetypes).size).toBe(archetypes.length)
  })

  it('produces different shapes as the board changes (emergent, not fixed)', () => {
    // Stars board (one giant RB + one giant WR) vs a flat board should not
    // yield identical target lists.
    const starBoard: PricedBoardPlayer[] = [
      bp('rb-star', 'RB', 90, 85, 1),
      bp('wr-star', 'WR', 88, 80, 1),
      ...fullBoard().filter((p) => !['RB', 'WR'].includes(p.position)),
      bp('rb-scrub', 'RB', 5, 2, 2),
      bp('wr-scrub', 'WR', 5, 2, 2),
    ]
    const flatBoard: PricedBoardPlayer[] = Array.from({ length: 10 }, (_, i) =>
      bp(`flat-${i}`, i % 2 === 0 ? 'RB' : 'WR', 30, 25, i + 1),
    ).concat([bp('qb-f', 'QB', 20, 15, 1), bp('te-f', 'TE', 20, 15, 1), bp('def-f', 'DEF', 4, 2, 1)])

    const stars = generateAnchorStrategies({ board: starBoard, slots: NASTIES_SLOTS, budget: 200 })
    const flat = generateAnchorStrategies({ board: flatBoard, slots: NASTIES_SLOTS, budget: 200 })

    const starTop = stars[0]?.key_targets.join('|') ?? ''
    const flatTop = flat[0]?.key_targets.join('|') ?? ''
    expect(starTop).not.toBe(flatTop)
  })
})

// ── priceBoard ───────────────────────────────────────────────────────────────

function cp(overrides: Partial<ConsensusPlayer> & { name: string; position: Position }): ConsensusPlayer {
  return {
    team: 'TST',
    byeWeek: 7,
    injuryStatus: null,
    sleeperId: null,
    espnId: null,
    fpId: null,
    consensusRank: 100,
    consensusAuctionValue: 10,
    consensusTier: 3,
    adp: 100,
    sourceRanks: {},
    sourceADP: {},
    sourceAuctionValues: {},
    projections: { points: 120 },
    ecrStdDev: null,
    percentOwned: null,
    age: null,
    yearsExp: null,
    sources: ['espn'],
    ...overrides,
  }
}

describe('priceBoard', () => {
  it('drops kickers and ranks each position by consensus rank', () => {
    const pool: ConsensusPlayer[] = [
      cp({ name: 'RB A', position: 'RB', consensusRank: 5, consensusAuctionValue: 55 }),
      cp({ name: 'RB B', position: 'RB', consensusRank: 2, consensusAuctionValue: 62 }),
      cp({ name: 'Kicker', position: 'K', consensusRank: 3, consensusAuctionValue: 1 }),
    ]
    const board = priceBoard(pool)

    // The kicker is dropped: only the 2 RBs survive to the board.
    expect(board).toHaveLength(2)
    const rbs = board.filter((p) => p.position === 'RB')
    // Sorted by consensusRank ASC: RB B (rank 2) is posRank 1, RB A (rank 5) is posRank 2.
    expect(rbs[0].name).toBe('RB B')
    expect(rbs[0].posRank).toBe(1)
    expect(rbs[1].name).toBe('RB A')
    expect(rbs[1].posRank).toBe(2)
    // ceiling reflects genuine worth (consensus auction value).
    expect(rbs[0].ceiling).toBe(62)
  })
})

// ── generateStrategiesFromPool (prep wrapper) ────────────────────────────────

function auctionLeague(): League {
  return {
    id: 'league-1',
    userId: 'user-1',
    name: 'The Nasties',
    platform: 'espn',
    format: 'auction',
    size: 12,
    budget: 200,
    scoringFormat: 'ppr',
    rosterSlots: { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, superflex: 0, k: 0, def: 1, bench: 5 },
  }
}

function realPool(): ConsensusPlayer[] {
  const pool: ConsensusPlayer[] = []
  const spec: Array<[Position, number]> = [
    ['RB', 66], ['RB', 52], ['RB', 34], ['RB', 18], ['RB', 8],
    ['WR', 60], ['WR', 55], ['WR', 40], ['WR', 20], ['WR', 9],
    ['TE', 30], ['TE', 10], ['QB', 26], ['QB', 8], ['DEF', 4],
  ]
  spec.forEach(([pos, val], i) => {
    pool.push(cp({ name: `${pos}${i}`, position: pos, consensusRank: i + 1, consensusAuctionValue: val }))
  })
  return pool
}

describe('generateStrategiesFromPool', () => {
  it('returns empty for snake (the solver + room curve are auction concepts)', () => {
    const snake = { ...auctionLeague(), format: 'snake' as const }
    const result = generateStrategiesFromPool({ league: snake, players: realPool() })
    expect(result.proposals).toEqual([])
    expect(result.inserts).toEqual([])
  })

  it('generates completable auction strategies with target pricing and matching inserts', () => {
    const result = generateStrategiesFromPool({ league: auctionLeague(), players: realPool() })

    expect(result.proposals.length).toBeGreaterThan(0)
    // One insert row per proposal.
    expect(result.inserts).toHaveLength(result.proposals.length)
    for (const p of result.proposals) {
      // R6 solver-fit target prices are attached to each proposal.
      expect(p.target_pricing).toBeDefined()
      expect(p.key_targets.length).toBeGreaterThan(0)
    }
  })

  it('respects keeper removals (a kept player never appears as a target)', () => {
    const pool = realPool()
    const kept = pool[0].name // RB0, the top RB
    const result = generateStrategiesFromPool({
      league: auctionLeague(),
      players: pool,
      keeperNames: [kept],
    })
    for (const p of result.proposals) {
      expect(p.key_targets).not.toContain(kept)
    }
  })
})
