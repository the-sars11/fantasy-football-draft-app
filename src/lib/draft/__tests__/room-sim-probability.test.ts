/**
 * room-sim-probability.test.ts — D6b-2
 *
 * Verifies the LIVE land-probability wiring:
 *   (1) REAL SIM OUTPUT (DEC-2b) — the % is a fraction of runMonteCarlo runs, in
 *       [0,1], and deterministic under a fixed seed (never fabricated).
 *   (2) LIVE STATE — drafted players are gone from the board; an uncontested
 *       player the me-seat can slot lands near-certainly; a roster with no open
 *       slot yields null (nothing lands).
 *   (3) LATENCY — a realistic early-draft board resolves well under the
 *       nomination clock at LAND_PROB_RUNS.
 */

import { describe, it, expect } from 'vitest'
import {
  computeLandProbability,
  LAND_PROB_RUNS,
  type LandProbabilityInput,
} from '../room-sim-probability'
import type { Player } from '@/lib/players/types'
import type { RosterSlots } from '@/lib/supabase/database.types'

const NASTIES_SLOTS: RosterSlots = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5, ir: 1, k: 0,
} as RosterSlots

/** Minimal Player fixture — only the fields buildBoardPlayers reads. */
function mk(
  id: string,
  position: Player['position'],
  ceiling: number,
  cost: number,
): Player {
  return {
    id,
    name: id,
    position,
    team: 'FA',
    ceilingValue: ceiling,
    consensusAuctionValue: cost,
    expectedRoomPrice: cost,
    projectedPoints: ceiling,
  } as unknown as Player
}

/** A realistic full-league undrafted pool (studs to $1 depth across positions). */
function realisticPool(): Player[] {
  const pool: Player[] = []
  const spec: [Player['position'], number, number][] = [
    ['QB', 32, 42],
    ['RB', 70, 65],
    ['WR', 80, 62],
    ['TE', 30, 35],
    ['DEF', 20, 8],
  ]
  for (const [pos, count, top] of spec) {
    for (let i = 0; i < count; i++) {
      const ceiling = Math.max(1, Math.round(top * (1 - i / count)))
      pool.push(mk(`${pos}${i + 1}`, pos, ceiling, Math.max(1, Math.round(ceiling * 0.85))))
    }
  }
  return pool
}

function baseInput(overrides: Partial<LandProbabilityInput> = {}): LandProbabilityInput {
  const pool = realisticPool()
  return {
    onBlockPlayer: pool[1], // RB1, a contested stud
    availablePlayers: pool,
    draftedNames: new Set<string>(),
    rosterSlots: NASTIES_SLOTS,
    myPicks: [],
    numManagers: 12,
    budget: 200,
    ...overrides,
  }
}

describe('D6b-2 computeLandProbability - real sim output (DEC-2b)', () => {
  it('returns a probability in [0,1] backed by real runs', () => {
    const res = computeLandProbability(baseInput())
    expect(res).not.toBeNull()
    expect(res!.probability).toBeGreaterThanOrEqual(0)
    expect(res!.probability).toBeLessThanOrEqual(1)
    expect(res!.runs).toBe(LAND_PROB_RUNS)
    // hits/runs must reconstruct the reported probability exactly (no fudging).
    expect(res!.hits / res!.runs).toBeCloseTo(res!.probability, 10)
    expect(res!.hits).toBeLessThanOrEqual(res!.runs)
  })

  it('is deterministic under a fixed seed (byte-identical)', () => {
    const a = computeLandProbability(baseInput({ seed: 7 }))
    const b = computeLandProbability(baseInput({ seed: 7 }))
    expect(a!.probability).toBe(b!.probability)
    expect(a!.hits).toBe(b!.hits)
  })

  it('changes with the seed (it is a distribution, not a constant)', () => {
    // Aggregated across many runs the exact hit-count should move with the seed
    // for a genuinely contested player. Compare a wide seed spread.
    const seeds = [1, 101, 202, 303, 404].map(s =>
      computeLandProbability(baseInput({ seed: s }))!.hits,
    )
    const allEqual = seeds.every(h => h === seeds[0])
    expect(allEqual).toBe(false)
  })
})

describe('D6b-2 computeLandProbability - live state', () => {
  it('drops drafted players from the board (they cannot be won)', () => {
    // Draft the on-block player itself away -> it is off the board -> null.
    const pool = realisticPool()
    const onBlock = pool[1]
    const res = computeLandProbability(
      baseInput({
        onBlockPlayer: onBlock,
        availablePlayers: pool,
        draftedNames: new Set([onBlock.name.toLowerCase()]),
      }),
    )
    // Board build drops the drafted name; on-block no longer present -> null.
    expect(res).toBeNull()
  })

  it('gives a rosterable undrafted player a real, positive land chance', () => {
    // A top TE the me-seat has an open slot for is winnable across runs, so its
    // land probability is a real fraction strictly above 0 (never a fake 0%).
    const pool = realisticPool()
    const te = pool.find(p => p.position === 'TE')!
    const res = computeLandProbability(
      baseInput({ onBlockPlayer: te, availablePlayers: pool }),
    )
    expect(res).not.toBeNull()
    expect(res!.probability).toBeGreaterThan(0)
  })

  it('returns null when the me-seat roster is already full', () => {
    // Fill every slot (14 picks: 1qb+1rb+1wr+1te+3flex+1dst+6bench).
    const filled = [
      { position: 'QB' }, { position: 'RB' }, { position: 'RB' }, { position: 'RB' },
      { position: 'WR' }, { position: 'WR' }, { position: 'WR' }, { position: 'WR' },
      { position: 'TE' }, { position: 'TE' }, { position: 'DEF' },
      { position: 'RB' }, { position: 'WR' }, { position: 'QB' },
    ]
    const res = computeLandProbability(baseInput({ myPicks: filled }))
    expect(res).toBeNull()
  })

  it('returns null on degenerate input (no managers / no budget)', () => {
    expect(computeLandProbability(baseInput({ numManagers: 0 }))).toBeNull()
    expect(computeLandProbability(baseInput({ budget: 0 }))).toBeNull()
  })
})

describe('D6b-2 computeLandProbability - latency', () => {
  it('resolves an early-draft board well under the nomination clock', () => {
    const input = baseInput() // full 12-team, empty draft = worst case board
    const start = performance.now()
    const res = computeLandProbability(input)
    const elapsed = performance.now() - start
    expect(res).not.toBeNull()
    // Nomination clock is many seconds; this runs once per nomination (memoized).
    // Assert a comfortable ceiling so a regression that blows latency is caught.
    expect(elapsed).toBeLessThan(1000)
    // Surface the real number in the test log for the latency-budget record.
    console.log(`[D6b-2 latency] ${LAND_PROB_RUNS} runs, early board: ${elapsed.toFixed(1)}ms`)
  })
})
