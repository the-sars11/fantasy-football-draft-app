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
  SolverBias,
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
  bias?: SolverBias,
): SolverInput {
  return {
    budgetRemaining: budget,
    slotsRemaining: slots,
    availablePlayers: players,
    replacementCosts: replacement,
    bias,
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
    // Budget covers the $45 QB -real player is used.
    expect(result.assignments[0].player?.id).toBe('qb1')
    expect(result.completionCost).toBe(45)
  })

  it('is genuinely infeasible only when budget < slot count (can\'t even field $1 scrubs)', () => {
    // 5 slots, $3 budget: even $1 fillers cost $5 > $3.
    const fiveSlots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1, rb: 1, wr: 1, te: 1, bench: 1 }
    const result = solveAllocation(makeInput(3, fiveSlots, []))
    expect(result.completionCost).toBe(5)
    expect(result.feasible).toBe(false)
  })
})

// ─── R5 budget-aware fill: unaffordable studs drop to $1 fillers ───────────────

describe('solveAllocation -R5 budget-aware fill', () => {
  it('drops an unaffordable starter to a $1 filler instead of overspending', () => {
    // One QB slot, only a $45 QB on the board, but just $30 to spend.
    // The $45 player is unaffordable → the slot falls to a $1 replacement.
    const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1 }
    const board: BoardPlayer[] = [p('qb1', 'QB', 50, 45)]
    const result = solveAllocation(makeInput(30, slots, board))

    expect(result.assignments[0].player).toBeNull()
    expect(result.assignments[0].assignedCost).toBe(1)
    expect(result.completionCost).toBe(1)
    expect(result.feasible).toBe(true)
  })

  it('reserves $1 per remaining slot: buys the stud only if the rest still fills', () => {
    // RB slot + 4 bench, $12 budget. A $10 RB is affordable ($12-$10=$2 >= 4×$1?
    // no -> 2 < 4), so it must drop to a $1 filler to keep the bench fillable.
    const slots: SlotsRemaining = { ...EMPTY_SLOTS, rb: 1, bench: 4 }
    const board: BoardPlayer[] = [p('rb1', 'RB', 40, 10)]
    const result = solveAllocation(makeInput(12, slots, board))

    const rbSlot = result.assignments.find(a => a.slotType === 'RB')
    expect(rbSlot?.player).toBeNull()
    expect(rbSlot?.assignedCost).toBe(1)
    // 1 (rb filler) + 4 (bench) = 5, all within budget.
    expect(result.completionCost).toBe(5)
    expect(result.feasible).toBe(true)
  })

  it('buys the stud when the budget comfortably covers the rest', () => {
    // Same $10 RB but $100 budget -> easily affordable with room for 4 bench.
    const slots: SlotsRemaining = { ...EMPTY_SLOTS, rb: 1, bench: 4 }
    const board: BoardPlayer[] = [p('rb1', 'RB', 40, 10)]
    const result = solveAllocation(makeInput(100, slots, board))

    const rbSlot = result.assignments.find(a => a.slotType === 'RB')
    expect(rbSlot?.player?.id).toBe('rb1')
    expect(rbSlot?.assignedCost).toBe(10)
    expect(result.completionCost).toBe(14) // 10 + 4 bench
  })

  // BUG-R5-01 regression: an unaffordable top player must not collapse the slot
  // to a $1 filler when a cheaper AFFORDABLE player of the same eligibility is
  // still on the board. The fill advances to the best affordable, not a scrub.
  it('advances to a cheaper affordable DEDICATED player instead of a $1 filler (BUG-R5-01)', () => {
    // 1 RB slot + 2 bench, $9 budget. The $40 stud is unaffordable; the $5 RB is
    // affordable (9 - 5 = 4 >= 2 bench) and must fill the slot instead of a scrub.
    const slots: SlotsRemaining = { ...EMPTY_SLOTS, rb: 1, bench: 2 }
    const board: BoardPlayer[] = [
      p('rbStud', 'RB', 90, 40),
      p('rbCheap', 'RB', 40, 5),
    ]
    const result = solveAllocation(makeInput(9, slots, board))

    const rbSlot = result.assignments.find(a => a.slotType === 'RB')
    expect(rbSlot?.player?.id).toBe('rbCheap') // not the unaffordable stud, not a filler
    expect(rbSlot?.assignedCost).toBe(5)
    expect(result.completionCost).toBe(7) // 5 (rb) + 2 bench
  })

  it('advances through the FLEX pool instead of dropping every slot to $1 (BUG-R5-01)', () => {
    // 3 FLEX, $10 budget. The $25 stud is unaffordable, but a $3 and a $2 flex are
    // affordable and must be bought before the last slot falls to a $1 filler.
    // Old bug: the unaffordable stud was re-picked every iteration -> 3 scrubs.
    const slots: SlotsRemaining = { ...EMPTY_SLOTS, flex: 3 }
    const board: BoardPlayer[] = [
      p('stud', 'RB', 90, 25),
      p('mid', 'WR', 50, 3),
      p('cheap', 'TE', 40, 2),
    ]
    const result = solveAllocation(makeInput(10, slots, board))

    const flexIds = result.assignments
      .filter(a => a.slotType === 'FLEX')
      .map(a => a.player?.id)
    expect(flexIds).toContain('mid') // affordable mid bought, not skipped
    expect(flexIds).toContain('cheap') // affordable cheap bought
    expect(flexIds).not.toContain('stud') // unaffordable stud left on the board
    // mid($3) + cheap($2) + one $1 filler = 6, not three $1 fillers = 3.
    expect(result.completionCost).toBe(6)
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

// ─── BUG-007: no slot available for the nominated player ─────────────────────

describe('computeRosterConstrainedMaxBid -BUG-007 no slot available', () => {
  // Only a QB slot is open and bench is full (0). A nominated WR has nowhere to
  // go: no dedicated WR slot, no FLEX, no bench. Previously resolvePlayerSlot did
  // Math.max(0, 0-1)=0 -a silent no-op that let the solver run on unmodified
  // slots and hand back a bogus max-bid. It must now report infeasible instead.
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1, bench: 0 }
  const nominated = p('wr1', 'WR', 40, 30)
  const result = computeRosterConstrainedMaxBid(
    nominated,
    makeInput(100, slots, [nominated], DEFAULT_REPLACEMENT),
  )

  it('is not feasible', () => {
    expect(result.feasible).toBe(false)
  })

  it('maxBid floors to $1', () => {
    expect(result.maxBid).toBe(1)
  })

  it('explains that no slot is available for the position', () => {
    expect(result.explanation).toBe('No slot available for WR')
  })

  it('does not fabricate a rest-of-roster', () => {
    expect(result.bestRestOfRoster).toHaveLength(0)
    expect(result.completionCost).toBe(0)
  })

  it('positive control: with a bench slot open the same WR is placeable', () => {
    const benchOpen: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1, bench: 1 }
    const ok = computeRosterConstrainedMaxBid(
      nominated,
      makeInput(100, benchOpen, [nominated], DEFAULT_REPLACEMENT),
    )
    // WR takes the bench slot; only the QB slot remains at $1 replacement.
    expect(ok.feasible).toBe(true)
    expect(ok.explanation).not.toBe('No slot available for WR')
  })
})

// ─── DEC-1 (BIAS): solveAllocation honors bounded target/avoid bias ──────────
// Mirrors sim-engine.ts's already-shipped pattern: target = bounded lift scaled
// by weight (max +35% at weight 10), soft avoid = half-value deprioritization
// (still eligible), hard avoid = excluded entirely. Selection priority only:
// the money math (assignedCost / completionCost) must always use the real,
// un-adjusted expectedCost.

describe('DEC-1 (BIAS): a weight-10 target outranks a higher raw ceiling', () => {
  // qbB's raw ceiling (45) is below qbA's (50), but a weight-10 target lift
  // (45 * 1.35 = 60.75) pushes it above qbA's unbiased 50.
  const qbA = p('qbA', 'QB', 50, 40)
  const qbB = p('qbB', 'QB', 45, 38)
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, qb: 1 }
  const bias: SolverBias = { qbB: { kind: 'target', weight: 10 } }
  const result = solveAllocation(makeInput(200, slots, [qbA, qbB], DEFAULT_REPLACEMENT, bias))

  it('fills the QB slot with the biased target, not the raw-ceiling leader', () => {
    expect(result.assignments[0]?.player?.id).toBe('qbB')
  })

  it('charges the real expectedCost, never an inflated bias-adjusted price', () => {
    expect(result.assignments[0]?.assignedCost).toBe(38)
    expect(result.completionCost).toBe(38)
  })
})

describe('DEC-1 (BIAS): a hard avoid is excluded from the allocation entirely', () => {
  // rbA has the best raw ceiling but is hard-avoided: it must never be
  // assigned, even to FLEX, even though it would otherwise win both slots.
  const rbA = p('rbA', 'RB', 70, 60)
  const rbB = p('rbB', 'RB', 50, 45)
  const rbC = p('rbC', 'RB', 40, 35)
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, rb: 1, flex: 1 }
  const bias: SolverBias = { rbA: { kind: 'avoid', severity: 'hard' } }
  const result = solveAllocation(makeInput(200, slots, [rbA, rbB, rbC], DEFAULT_REPLACEMENT, bias))

  it('never assigns the hard-avoided player to any slot', () => {
    const ids = result.assignments.map(a => a.player?.id)
    expect(ids).not.toContain('rbA')
  })

  it('falls through to the next-best eligible players instead', () => {
    const ids = result.assignments.map(a => a.player?.id)
    expect(ids).toContain('rbB')
    expect(ids).toContain('rbC')
  })
})

describe('DEC-1 (BIAS): a soft avoid is deprioritized but stays eligible', () => {
  // wrA's raw ceiling (60) beats wrB's (40), but a soft avoid halves wrA's
  // priority (60 * 0.5 = 30 < 40), so wrB should fill the single WR slot.
  const wrA = p('wrA', 'WR', 60, 50)
  const wrB = p('wrB', 'WR', 40, 35)
  const slots: SlotsRemaining = { ...EMPTY_SLOTS, wr: 1 }
  const bias: SolverBias = { wrA: { kind: 'avoid', severity: 'soft' } }
  const result = solveAllocation(makeInput(200, slots, [wrA, wrB], DEFAULT_REPLACEMENT, bias))

  it('prefers the untagged alternative over the soft-avoided higher ceiling', () => {
    expect(result.assignments[0]?.player?.id).toBe('wrB')
  })

  it('still places the soft-avoided player when it is the only option', () => {
    const onlyOption = solveAllocation(
      makeInput(200, slots, [wrA], DEFAULT_REPLACEMENT, bias),
    )
    expect(onlyOption.assignments[0]?.player?.id).toBe('wrA')
    // Real cost, not the halved priority number.
    expect(onlyOption.assignments[0]?.assignedCost).toBe(50)
  })
})

describe('DEC-1 (BIAS): undefined bias is a no-op (backward compatible)', () => {
  it('produces identical output to the unbiased Nasties fill', () => {
    const withBias = solveAllocation(makeInput(300, NASTIES_SLOTS, NASTIES_BOARD, DEFAULT_REPLACEMENT, undefined))
    const withoutBias = solveAllocation(makeInput(300, NASTIES_SLOTS, NASTIES_BOARD))
    expect(withBias).toEqual(withoutBias)
  })
})
