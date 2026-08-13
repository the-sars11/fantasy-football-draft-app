/**
 * roster-solver.test.ts -R4 Team-Construction Engine
 *
 * Tests the core invariants the BUILD_PLAN requires:
 *   (a) solveAllocation fills slots with highest-ceiling players in the right order
 *   (b) computeRosterConstrainedMaxBid returns a max bid such that
 *       maxBid + completionCost <= budgetRemaining (when feasible)
 *   (c) Edge cases: 1 slot left, empty board, board dry at position, FLEX
 *       steals from RB/WR/TE pool, forced $1 scrubs, infeasible state.
 */

import { describe, it, expect } from 'vitest'
import { solveAllocation, computeRosterConstrainedMaxBid } from '../roster-solver'
import type {
  SolverInput,
  BoardPlayer,
  SlotsRemaining,
  ReplacementCosts,
} from '../roster-solver'

// ─── Fixtures ──────────────────────────────────────────────────────────────

const DEFAULT_REPLACEMENT: ReplacementCosts = {
  qb: 1, rb: 1, wr: 1, te: 1, dst: 1, bench: 1,
}

const NASTIES_SLOTS: SlotsRemaining = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5,
}

const EMPTY_SLOTS: SlotsRemaining = {
  qb: 0, rb: 0, wr: 0, te: 0, flex: 0, dst: 0, bench: 0,
}

function p(
  id: string,
  position: BoardPlayer['position'],
  ceiling: number,
  expectedCost: number,
): BoardPlayer {
  return { id, name: id, position, ceiling, expectedCost }
}

function makeInput(
  budget: number,
  slots: SlotsRemaining,
  players: BoardPlayer[],
  replacement: ReplacementCosts = DEFAULT_REPLACEMENT,
): SolverInput {
  return {
    budgetRemaining: budget,
    slotsRemaining: slots,
    availablePlayers: players,
    replacementCosts: replacement,
  }
}

// Nasties board: 8 real players covering every dedicated slot + 3 FLEX
const NASTIES_BOARD: BoardPlayer[] = [
  p('qb1',  'QB',  50, 42),
  p('rb1',  'RB',  70, 60),
  p('wr1',  'WR',  60, 50),
  p('te1',  'TE',  40, 35),
  p('dst1', 'DEF', 15, 12),
  p('rb2',  'RB',  35, 28),  // goes to FLEX1
  p('wr2',  'WR',  30, 24),  // goes to FLEX2
  p('te2',  'TE',  25, 20),  // goes to FLEX3
]

// ─── solveAllocation ─────────────────────────────────────────────────────────

describe('solveAllocation -full Nasties roster fill', () => {
  const result = solveAllocation(makeInput(300, NASTIES_SLOTS, NASTIES_BOARD))

  it('produces exactly 13 assignments (8 starters/flex + 5 bench)', () => {
    expect(result.assignments).toHaveLength(13)
  })

  it('assigns each dedicated slot to the correct player', () => {
    const byType = Object.fromEntries(
      ['QB', 'RB', 'WR', 'TE', 'DST'].map(t => [
        t,
        result.assignments.find(a => a.slotType === t),
      ]),
    )
    expect(byType.QB?.player?.id).toBe('qb1')
    expect(byType.RB?.player?.id).toBe('rb1')
    expect(byType.WR?.player?.id).toBe('wr1')
    expect(byType.TE?.player?.id).toBe('te1')
    expect(byType.DST?.player?.id).toBe('dst1')
  })

  it('fills three FLEX slots from the remaining RB/WR/TE pool by ceiling', () => {
    const flexAssignments = result.assignments.filter(a => a.slotType === 'FLEX')
    expect(flexAssignments).toHaveLength(3)
    const flexIds = flexAssignments.map(a => a.player?.id)
    expect(flexIds).toContain('rb2')
    expect(flexIds).toContain('wr2')
    expect(flexIds).toContain('te2')
  })

  it('fills five bench slots at replacement cost ($1 each), no board player', () => {
    const benchAssignments = result.assignments.filter(a => a.slotType === 'BENCH')
    expect(benchAssignments).toHaveLength(5)
    benchAssignments.forEach(a => {
      expect(a.player).toBeNull()
      expect(a.assignedCost).toBe(1)
    })
  })

  it('completionCost matches the sum of all assignedCosts', () => {
    const sum = result.assignments.reduce((acc, a) => acc + a.assignedCost, 0)
    expect(result.completionCost).toBe(sum)
  })

  it('is feasible when budget covers the completion cost', () => {
    expect(result.feasible).toBe(true)
  })
})

// ─── FLEX pool only contains RB/WR/TE ───────────────────────────────────────

describe('solveAllocation -FLEX pool excludes QB and DEF', () => {
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, flex: 2 }
  const board: BoardPlayer[] = [
    p('qb1',  'QB',  60, 55), // should NOT go to FLEX
    p('rb1',  'RB',  50, 45), // should go to FLEX1
    p('wr1',  'WR',  40, 35), // should go to FLEX2
    p('def1', 'DEF', 20, 15), // should NOT go to FLEX
  ]
  const result = solveAllocation(makeInput(200, slots, board))

  it('fills both FLEX slots with RB and WR only', () => {
    const flexAssignments = result.assignments.filter(a => a.slotType === 'FLEX')
    const flexIds = flexAssignments.map(a => a.player?.id)
    expect(flexIds).toContain('rb1')
    expect(flexIds).toContain('wr1')
    expect(flexIds).not.toContain('qb1')
    expect(flexIds).not.toContain('def1')
  })

  it('picks FLEX players by ceiling DESC (rb1 first, then wr1)', () => {
    const flexAssignments = result.assignments.filter(a => a.slotType === 'FLEX')
    expect(flexAssignments[0].player?.id).toBe('rb1')
    expect(flexAssignments[1].player?.id).toBe('wr1')
  })
})

// ─── Board dry at a position ─────────────────────────────────────────────────

describe('solveAllocation -board dry at QB (falls back to replacement cost)', () => {
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1, rb: 1 }
  const board: BoardPlayer[] = [p('rb1', 'RB', 50, 45)]
  const replacement: ReplacementCosts = { qb: 3, rb: 1, wr: 1, te: 1, dst: 1, bench: 1 }
  const result = solveAllocation(makeInput(200, slots, board, replacement))

  it('assigns the QB slot with a null player at replacement cost', () => {
    const qbAssignment = result.assignments.find(a => a.slotType === 'QB')
    expect(qbAssignment?.player).toBeNull()
    expect(qbAssignment?.assignedCost).toBe(3)
  })

  it('fills the RB slot with the available board player', () => {
    const rbAssignment = result.assignments.find(a => a.slotType === 'RB')
    expect(rbAssignment?.player?.id).toBe('rb1')
    expect(rbAssignment?.assignedCost).toBe(45)
  })

  it('completionCost = replacement(3) + rb expected(45) = 48', () => {
    expect(result.completionCost).toBe(48)
  })
})

// ─── Empty board -all replacement costs ─────────────────────────────────────

describe('solveAllocation -empty board uses replacement costs throughout', () => {
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1, rb: 2, flex: 1, bench: 2 }
  const replacement: ReplacementCosts = { qb: 3, rb: 2, wr: 2, te: 2, dst: 1, bench: 1 }
  const result = solveAllocation(makeInput(200, slots, [], replacement))

  it('all assignments have null players', () => {
    result.assignments.forEach(a => expect(a.player).toBeNull())
  })

  it('completionCost = qb(3) + rb(2+2) + flex(min(rb,wr,te)=2) + bench(1+1) = 11', () => {
    expect(result.completionCost).toBe(11)
  })
})

// ─── Feasibility flag ────────────────────────────────────────────────────────

describe('solveAllocation -feasibility flag', () => {
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1 }
  const board: BoardPlayer[] = [p('qb1', 'QB', 50, 45)]

  it('is feasible when budget >= completionCost', () => {
    const result = solveAllocation(makeInput(50, slots, board))
    expect(result.feasible).toBe(true)
  })

  it('is NOT feasible when budget < completionCost', () => {
    const result = solveAllocation(makeInput(30, slots, board))
    expect(result.completionCost).toBe(45)
    expect(result.feasible).toBe(false)
  })
})

// ─── No slots -zero cost ────────────────────────────────────────────────────

describe('solveAllocation -no slots remaining', () => {
  it('returns zero completionCost and empty assignments', () => {
    const result = solveAllocation(makeInput(100, EMPTY_SLOTS, NASTIES_BOARD))
    expect(result.completionCost).toBe(0)
    expect(result.assignments).toHaveLength(0)
    expect(result.feasible).toBe(true)
  })
})

// ─── computeRosterConstrainedMaxBid ──────────────────────────────────────────

describe('computeRosterConstrainedMaxBid -player fills dedicated slot', () => {
  // Joe has an unfilled RB slot and 2 bench slots. Bench costs $1 each.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, rb: 1, bench: 2 }
  const board: BoardPlayer[] = [
    p('rb1', 'RB', 60, 55), // nominated
    p('rb2', 'RB', 30, 25), // still on board (no rb slot after rb1 wins → not assigned)
  ]
  const result = computeRosterConstrainedMaxBid(
    p('rb1', 'RB', 60, 55),
    makeInput(100, slots, board),
  )

  // After rb1 wins: rb slot gone, bench×2 remain at $1 each = $2
  it('completionCost = bench×2 ($2)', () => {
    expect(result.completionCost).toBe(2)
  })

  it('maxBid = budget($100) - completionCost($2) = $98', () => {
    expect(result.maxBid).toBe(98)
  })

  it('is feasible', () => {
    expect(result.feasible).toBe(true)
  })

  it('satisfies the key invariant: maxBid + completionCost <= budgetRemaining', () => {
    expect(result.maxBid + result.completionCost).toBeLessThanOrEqual(100)
  })
})

describe('computeRosterConstrainedMaxBid -player fills FLEX slot', () => {
  // Dedicated RB slot already filled; nominated RB goes to FLEX.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, flex: 2, bench: 2 }
  const board: BoardPlayer[] = [
    p('rb1', 'RB', 50, 45), // nominated -goes to FLEX (no dedicated rb)
    p('wr1', 'WR', 30, 25), // fills FLEX2 after rb1 wins
  ]
  const result = computeRosterConstrainedMaxBid(
    p('rb1', 'RB', 50, 45),
    makeInput(100, slots, board),
  )

  // After rb1 wins flex slot: flex×1 + bench×2 remain
  // FLEX1: wr1 ($25). BENCH×2: $2. completionCost = 27.
  it('completionCost = wr1($25) + bench×2($2) = $27', () => {
    expect(result.completionCost).toBe(27)
  })

  it('maxBid = $100 - $27 = $73', () => {
    expect(result.maxBid).toBe(73)
  })

  it('satisfies invariant: maxBid + completionCost = budgetRemaining', () => {
    expect(result.maxBid + result.completionCost).toBe(100)
  })
})

describe('computeRosterConstrainedMaxBid -player fills bench (all other slots full)', () => {
  // No dedicated or FLEX slots; nominated player goes to bench.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, bench: 3 }
  const board: BoardPlayer[] = [p('star', 'RB', 80, 70)]

  const result = computeRosterConstrainedMaxBid(
    p('star', 'RB', 80, 70),
    makeInput(80, slots, board),
  )

  // After star wins bench slot: bench×2 remain at $1 each = $2
  it('completionCost = bench×2 ($2)', () => {
    expect(result.completionCost).toBe(2)
  })

  it('maxBid = $80 - $2 = $78', () => {
    expect(result.maxBid).toBe(78)
  })

  it('satisfies invariant', () => {
    expect(result.maxBid + result.completionCost).toBeLessThanOrEqual(80)
  })
})

describe('computeRosterConstrainedMaxBid -last slot (no remaining after nomination)', () => {
  // Only 1 slot left. After winning, zero slots remain → completionCost = 0.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, bench: 1 }
  const board: BoardPlayer[] = []

  const result = computeRosterConstrainedMaxBid(
    p('last', 'RB', 20, 15),
    makeInput(30, slots, board),
  )

  it('completionCost = 0 (no slots remain after nomination)', () => {
    expect(result.completionCost).toBe(0)
  })

  it('maxBid = full remaining budget ($30)', () => {
    expect(result.maxBid).toBe(30)
  })

  it('is feasible', () => {
    expect(result.feasible).toBe(true)
  })
})

describe('computeRosterConstrainedMaxBid -forced $1 scrubs (all budget on one stud)', () => {
  // Scenario: Joe goes stars-and-scrubs. Nominated player is a stud. Only bench slots remain.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, bench: 5 }
  const result = computeRosterConstrainedMaxBid(
    p('stud', 'RB', 90, 80),
    makeInput(100, slots, [], DEFAULT_REPLACEMENT),
  )

  // After stud wins bench slot: bench×4 remain at $1 each = $4
  it('completionCost = 4×bench ($4)', () => {
    expect(result.completionCost).toBe(4)
  })

  it('maxBid = $100 - $4 = $96', () => {
    expect(result.maxBid).toBe(96)
  })

  it('satisfies invariant', () => {
    expect(result.maxBid + result.completionCost).toBeLessThanOrEqual(100)
  })
})

describe('computeRosterConstrainedMaxBid -empty board (replacement-level rest)', () => {
  // Board is completely dry. Rest-of-roster fills at replacement cost.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1, rb: 1, flex: 1, bench: 2 }
  const replacement: ReplacementCosts = { qb: 2, rb: 2, wr: 2, te: 2, dst: 1, bench: 1 }

  // Nominate a QB. After QB wins: rb×1 + flex×1 + bench×2 remain.
  // completionCost = rb_replacement(2) + flex_replacement(min(2,2,2)=2) + bench(1+1) = 6
  const result = computeRosterConstrainedMaxBid(
    p('qb1', 'QB', 40, 35),
    makeInput(50, slots, [p('qb1', 'QB', 40, 35)], replacement),
  )

  it('completionCost uses replacement costs when board is dry', () => {
    expect(result.completionCost).toBe(6)
  })

  it('maxBid = $50 - $6 = $44', () => {
    expect(result.maxBid).toBe(44)
  })

  it('satisfies invariant', () => {
    expect(result.maxBid + result.completionCost).toBeLessThanOrEqual(50)
  })
})

describe('computeRosterConstrainedMaxBid -infeasible (completion cost > budget)', () => {
  // Budget is too low to field the remaining starters even at $1 per nomination.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1, rb: 1 }
  const board: BoardPlayer[] = [
    p('qb1', 'QB', 40, 35),
    p('rb1', 'RB', 30, 25),
  ]
  // Nominate a WR that goes to bench (no wr/flex slots), leaving qb(35)+rb(25)=$60 to fill.
  // Budget only $20 → rawMaxBid = 20 - 60 = -40 → infeasible.
  const result = computeRosterConstrainedMaxBid(
    p('wr1', 'WR', 20, 15),
    makeInput(20, slots, [...board, p('wr1', 'WR', 20, 15)]),
  )

  it('feasible = false', () => {
    expect(result.feasible).toBe(false)
  })

  it('maxBid floors to $1 (minimum possible bid)', () => {
    expect(result.maxBid).toBe(1)
  })
})

// ─── Key invariants ───────────────────────────────────────────────────────────

describe('invariant: maxBid + completionCost <= budgetRemaining when feasible', () => {
  const cases: Array<[string, BoardPlayer, SolverInput]> = [
    [
      'dedicated slot, board available',
      p('rb1', 'RB', 60, 50),
      makeInput(100, { ...EMPTY_SLOTS, rb: 1, flex: 1, bench: 2 }, [
        p('rb1', 'RB', 60, 50),
        p('wr1', 'WR', 30, 25),
      ]),
    ],
    [
      'FLEX slot fill, mixed pool',
      p('rb1', 'RB', 60, 50),
      makeInput(80, { ...EMPTY_SLOTS, flex: 2, bench: 3 }, [
        p('rb1', 'RB', 60, 50),
        p('wr1', 'WR', 40, 35),
        p('te1', 'TE', 20, 15),
      ]),
    ],
    [
      'full Nasties board + budget $200',
      p('rb1', 'RB', 70, 60),
      makeInput(200, NASTIES_SLOTS, NASTIES_BOARD),
    ],
    [
      'empty board, all replacement',
      p('qb1', 'QB', 40, 35),
      makeInput(50, { ...EMPTY_SLOTS, qb: 1, bench: 3 }, [p('qb1', 'QB', 40, 35)]),
    ],
  ]

  cases.forEach(([label, nominated, input]) => {
    it(label, () => {
      const result = computeRosterConstrainedMaxBid(nominated, input)
      if (result.feasible) {
        expect(result.maxBid + result.completionCost).toBeLessThanOrEqual(
          input.budgetRemaining,
        )
      }
    })
  })
})

describe('invariant: maxBid is always >= 1', () => {
  it('floors to $1 even when completion cost exceeds budget', () => {
    const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1 }
    const board = [p('qb1', 'QB', 40, 45)] // expectedCost > budget
    const result = computeRosterConstrainedMaxBid(
      p('wr1', 'WR', 20, 15),
      makeInput(10, slots, [...board, p('wr1', 'WR', 20, 15)]),
    )
    expect(result.maxBid).toBeGreaterThanOrEqual(1)
  })
})

// ─── Nominated player is excluded from the completion pool ───────────────────

describe('computeRosterConstrainedMaxBid -nominated player excluded from rest-of-roster', () => {
  // If nominated player were counted twice, completionCost would be wrong.
  // Board: only the nominated player. After winning, board is empty → replacement only.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, rb: 1, bench: 1 }
  const nominated = p('rb1', 'RB', 60, 50)

  const result = computeRosterConstrainedMaxBid(
    nominated,
    makeInput(80, slots, [nominated], DEFAULT_REPLACEMENT),
  )

  // After rb1 wins the RB slot: bench×1 at $1 only (rb1 NOT in pool again)
  it('completionCost = bench replacement ($1), not board player', () => {
    expect(result.completionCost).toBe(1)
  })

  it('maxBid = $80 - $1 = $79', () => {
    expect(result.maxBid).toBe(79)
  })
})

// ─── FLEX contention: dedicated slots consumed before FLEX ───────────────────

describe('solveAllocation -dedicated slots consumed before FLEX pool forms', () => {
  // 1 dedicated TE slot + 1 FLEX slot + 2 TE players on board.
  // TE1 (higher ceiling) should go to dedicated TE slot.
  // TE2 goes to FLEX (next best in RB/WR/TE pool).
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, te: 1, flex: 1 }
  const board: BoardPlayer[] = [
    p('te1', 'TE', 40, 35), // best TE → dedicated slot
    p('te2', 'TE', 25, 20), // next TE → FLEX
    p('rb1', 'RB', 30, 25), // RB → also FLEX-eligible, but lower ceiling than te1
  ]
  const result = solveAllocation(makeInput(200, slots, board))

  it('TE slot is filled by the highest-ceiling TE (te1)', () => {
    const teAssignment = result.assignments.find(a => a.slotType === 'TE')
    expect(teAssignment?.player?.id).toBe('te1')
  })

  it('FLEX slot is filled by the next-best eligible player from remaining pool', () => {
    const flexAssignment = result.assignments.find(a => a.slotType === 'FLEX')
    // rb1 (ceiling=30) > te2 (ceiling=25), so rb1 wins FLEX
    expect(flexAssignment?.player?.id).toBe('rb1')
  })

  it('completionCost = te1($35) + rb1($25) = $60', () => {
    expect(result.completionCost).toBe(60)
  })
})
