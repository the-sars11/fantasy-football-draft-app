/**
 * sim-grade.test.ts — R10b grading + post-processing.
 *
 * Covers the three deliverables by name:
 *   (1) GRADE — best starting-lineup points and the rank-vs-league projected record.
 *   (2) TOP-5 MODAL ROSTERS — stud-core clustering, frequency, ordering.
 *   (3) PLAYERS YOU LAND MOST — frequency count + average price.
 */

import { describe, it, expect } from 'vitest'
import {
  bestLineupPoints,
  gradeRun,
  summarizeGrades,
  studCore,
  topModalRosters,
  playersYouLandMost,
  starterConfigOf,
  DEFAULT_INJURY_MODEL,
  type StarterConfig,
} from '../sim-grade'
import type { SimRun, SimManagerRoster, SimWonPlayer, SimRosterConfig } from '../sim-engine'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function won(
  id: string,
  position: SimWonPlayer['position'],
  projectedPoints: number,
  price = 1,
): SimWonPlayer {
  return { id, name: id, position, price, ceiling: price, projectedPoints }
}

function roster(
  managerIndex: number,
  isMe: boolean,
  players: SimWonPlayer[],
): SimManagerRoster {
  const positionCounts = { QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0 }
  let spent = 0
  let totalCeiling = 0
  for (const p of players) {
    positionCounts[p.position] += 1
    spent += p.price
    totalCeiling += p.ceiling
  }
  return {
    managerIndex,
    isMe,
    players,
    spent,
    budgetLeft: 200 - spent,
    totalCeiling,
    positionCounts,
  }
}

function run(seed: number, rosters: SimManagerRoster[]): SimRun {
  const my = rosters.find(r => r.isMe) ?? rosters[0]
  return { seed, rosters, myRoster: my, lots: rosters.reduce((s, r) => s + r.players.length, 0) }
}

const LINEUP: StarterConfig = { qb: 1, rb: 1, wr: 1, te: 1, flex: 1, dst: 1 }
const QB_ONLY: StarterConfig = { qb: 1, rb: 0, wr: 0, te: 0, flex: 0, dst: 0 }

// ─── (0) starterConfigOf ─────────────────────────────────────────────────────

describe('starterConfigOf', () => {
  it('drops bench/ir from the scoring lineup', () => {
    const config: SimRosterConfig = { qb: 1, rb: 2, wr: 2, te: 1, flex: 3, dst: 1, bench: 5, ir: 1 }
    expect(starterConfigOf(config)).toEqual({ qb: 1, rb: 2, wr: 2, te: 1, flex: 3, dst: 1 })
  })
})

// ─── (1) GRADE ───────────────────────────────────────────────────────────────

describe('bestLineupPoints', () => {
  it('fills each slot with the best at that position and FLEX from the leftover', () => {
    const players = [
      won('qb', 'QB', 300),
      won('rb1', 'RB', 200),
      won('rb2', 'RB', 150), // best FLEX leftover
      won('wr', 'WR', 100),
      won('te', 'TE', 80),
      won('def', 'DEF', 50),
      won('rb3', 'RB', 10), // bench, should not score
    ]
    // 300 + 200 + 100 + 80 + 50(dst) + 150(flex) = 880
    expect(bestLineupPoints(players, LINEUP)).toBe(880)
  })

  it('scores 0 for a slot with no eligible player (e.g. no DEF drafted)', () => {
    const players = [won('qb', 'QB', 300)]
    expect(bestLineupPoints(players, QB_ONLY)).toBe(300)
    // With the full lineup, the empty RB/WR/TE/FLEX/DST slots simply add nothing.
    expect(bestLineupPoints(players, LINEUP)).toBe(300)
  })
})

describe('gradeRun projected record (weekly-variance season)', () => {
  it('a dominant roster wins most weeks but need not sweep', () => {
    const r = run(1, [
      roster(0, true, [won('me', 'QB', 300)]),
      roster(1, false, [won('o1', 'QB', 200)]),
      roster(2, false, [won('o2', 'QB', 100)]),
    ])
    const g = gradeRun(r, QB_ONLY, 3, 12)
    expect(g.myRank).toBe(1)
    expect(g.wins).toBeGreaterThanOrEqual(9)
    expect(g.wins + g.losses).toBe(12)
  })

  it('a clearly worst roster loses most weeks', () => {
    const r = run(1, [
      roster(0, true, [won('me', 'QB', 50)]),
      roster(1, false, [won('o1', 'QB', 200)]),
      roster(2, false, [won('o2', 'QB', 100)]),
    ])
    const g = gradeRun(r, QB_ONLY, 3, 12)
    expect(g.myRank).toBe(3)
    expect(g.wins).toBeLessThanOrEqual(3)
  })

  it('a middle roster projects to a roughly .500 record', () => {
    const r = run(1, [
      roster(0, true, [won('me', 'QB', 150)]),
      roster(1, false, [won('o1', 'QB', 200)]),
      roster(2, false, [won('o2', 'QB', 100)]),
    ])
    const g = gradeRun(r, QB_ONLY, 3, 12)
    expect(g.myRank).toBe(2)
    expect(g.wins).toBeGreaterThanOrEqual(3)
    expect(g.wins).toBeLessThanOrEqual(9)
  })

  it('is deterministic under a fixed run seed', () => {
    const seats = [
      roster(0, true, [won('me', 'QB', 180)]),
      roster(1, false, [won('o1', 'QB', 160)]),
      roster(2, false, [won('o2', 'QB', 120)]),
    ]
    const a = gradeRun(run(1, seats), QB_ONLY, 3, 14)
    const b = gradeRun(run(1, seats), QB_ONLY, 3, 14)
    expect(a.wins).toBe(b.wins)
  })
})

// ─── (1b) INJURY / AVAILABILITY MODEL ────────────────────────────────────────

describe('gradeRun injury/availability model', () => {
  // A concentrated roster: two studs carry it, the rest are $1 replacement-level.
  // Equal healthy best-lineup points to the balanced roster below (618), so the
  // ONLY difference the sim can see is depth. When a stud misses a week the slot
  // (and the FLEX behind it) craters to replacement level.
  const CONCENTRATED = () => [
    won('c_qb', 'QB', 40, 2),
    won('c_rb1', 'RB', 320, 90), // stud
    won('c_wr1', 'WR', 200, 80), // stud
    won('c_te', 'TE', 40, 2),
    won('c_def', 'DEF', 10, 1),
    won('c_flex', 'RB', 8, 1), // $1 bench-tier FLEX filler
  ]
  // A balanced roster: same healthy best lineup (618) but real depth behind every
  // slot, so one player missing barely dents the weekly score.
  const BALANCED = () => [
    won('b_qb', 'QB', 40, 12),
    won('b_rb1', 'RB', 150, 40),
    won('b_rb2', 'RB', 148, 38), // durable backup + FLEX
    won('b_rb3', 'RB', 145, 36),
    won('b_wr1', 'WR', 150, 40),
    won('b_wr2', 'WR', 148, 38),
    won('b_te1', 'TE', 120, 20),
    won('b_te2', 'TE', 100, 8),
    won('b_def', 'DEF', 10, 1),
  ]
  // Fixed, competitive opponents so injuries actually swing games (not pinned at
  // 0 or 14 wins). Same objects reused across every scenario.
  const OPPONENTS = () => [
    roster(1, false, [
      won('o1_qb', 'QB', 55, 12),
      won('o1_rb1', 'RB', 140, 40),
      won('o1_rb2', 'RB', 130, 30),
      won('o1_wr1', 'WR', 140, 40),
      won('o1_wr2', 'WR', 130, 30),
      won('o1_te', 'TE', 95, 12),
      won('o1_def', 'DEF', 15, 1),
    ]),
    roster(2, false, [
      won('o2_qb', 'QB', 50, 10),
      won('o2_rb1', 'RB', 145, 40),
      won('o2_rb2', 'RB', 135, 30),
      won('o2_wr1', 'WR', 140, 40),
      won('o2_wr2', 'WR', 120, 28),
      won('o2_te', 'TE', 100, 14),
      won('o2_def', 'DEF', 15, 1),
    ]),
  ]

  it('grades the two rosters as equally strong when perfectly healthy', () => {
    // Fair test: the depth difference is the only variable, not raw strength.
    expect(bestLineupPoints(CONCENTRATED(), LINEUP)).toBe(618)
    expect(bestLineupPoints(BALANCED(), LINEUP)).toBe(618)
  })

  it('is deterministic with the injury model on (same seed => same record)', () => {
    const seats = [roster(0, true, CONCENTRATED()), ...OPPONENTS()]
    const a = gradeRun(run(7, seats), LINEUP, 3, 14, { injury: DEFAULT_INJURY_MODEL })
    const b = gradeRun(run(7, seats), LINEUP, 3, 14, { injury: DEFAULT_INJURY_MODEL })
    expect(a.wins).toBe(b.wins)
    expect(a.losses).toBe(b.losses)
  })

  it('injuries punish a concentrated roster far harder than a deep one of equal healthy strength', () => {
    // Sum wins across many fixed seeds; compare each roster to its own no-injury
    // baseline. Equal healthy points, same opponents => any gap in the injury
    // penalty is attributable to bench depth alone.
    const SEEDS = 300
    let concOff = 0
    let concOn = 0
    let deepOff = 0
    let deepOn = 0

    for (let seed = 1; seed <= SEEDS; seed++) {
      const concSeats = [roster(0, true, CONCENTRATED()), ...OPPONENTS()]
      const deepSeats = [roster(0, true, BALANCED()), ...OPPONENTS()]
      concOff += gradeRun(run(seed, concSeats), LINEUP, 3, 14, { injury: false }).wins
      concOn += gradeRun(run(seed, concSeats), LINEUP, 3, 14, { injury: DEFAULT_INJURY_MODEL }).wins
      deepOff += gradeRun(run(seed, deepSeats), LINEUP, 3, 14, { injury: false }).wins
      deepOn += gradeRun(run(seed, deepSeats), LINEUP, 3, 14, { injury: DEFAULT_INJURY_MODEL }).wins
    }

    const concPenalty = concOff - concOn // wins lost to injuries, concentrated
    const deepPenalty = deepOff - deepOn // wins lost to injuries, deep

    // Injuries cost the thin roster real wins...
    expect(concPenalty).toBeGreaterThan(0)
    // ...and cost it markedly more than the deep roster. A large, stable margin
    // so this never flakes on rng noise.
    expect(concPenalty).toBeGreaterThan(deepPenalty + 100)
  })
})

describe('summarizeGrades', () => {
  it('reports the modal record and best/worst spread', () => {
    const grades = [
      { seed: 1, myStarterPoints: 0, leagueStarterPoints: [], myRank: 1, wins: 10, losses: 4 },
      { seed: 2, myStarterPoints: 0, leagueStarterPoints: [], myRank: 2, wins: 10, losses: 4 },
      { seed: 3, myStarterPoints: 0, leagueStarterPoints: [], myRank: 3, wins: 6, losses: 8 },
    ]
    const s = summarizeGrades(grades, 14, 12)
    expect(s.modalRecord.wins).toBe(10)
    expect(s.modalRecord.losses).toBe(4)
    expect(s.modalRecord.frequencyPct).toBeCloseTo(66.7, 1)
    expect(s.bestRecord.wins).toBe(10)
    expect(s.worstRecord.wins).toBe(6)
  })
})

// ─── (2) TOP-5 MODAL ROSTERS ─────────────────────────────────────────────────

describe('studCore', () => {
  it('keeps only players at/above the threshold, sorted, ignoring the $1 fill', () => {
    const players = [
      won('a', 'RB', 200, 50),
      won('c', 'WR', 150, 40),
      won('b', 'QB', 100, 1), // bench fill: noise, excluded
    ]
    expect(studCore(players, 10)).toEqual(['a', 'c'])
  })
})

describe('topModalRosters', () => {
  it('clusters by stud core and ranks the most frequent shapes first', () => {
    // Shape A (studs a+b) occurs in 3 runs; shape B (studs a+c) in 1.
    const shapeA = () => [won('a', 'RB', 200, 50), won('b', 'WR', 150, 40), won('z', 'TE', 5, 1)]
    const shapeB = () => [won('a', 'RB', 200, 50), won('c', 'WR', 140, 45), won('z', 'TE', 5, 1)]
    const runs = [
      run(1, [roster(0, true, shapeA())]),
      run(2, [roster(0, true, shapeA())]),
      run(3, [roster(0, true, shapeA())]),
      run(4, [roster(0, true, shapeB())]),
    ]
    const grades = runs.map(r => gradeRun(r, LINEUP, 12, 14))
    const top = topModalRosters(runs, grades, LINEUP, { studThreshold: 10, top: 5 })

    expect(top).toHaveLength(2)
    expect(top[0].coreIds).toEqual(['a', 'b'])
    expect(top[0].frequency).toBe(3)
    expect(top[0].frequencyPct).toBe(75)
    expect(top[1].coreIds).toEqual(['a', 'c'])
    expect(top[1].frequency).toBe(1)
  })

  it('caps the result at the requested top-N', () => {
    const runs = Array.from({ length: 8 }, (_, i) =>
      run(i, [roster(0, true, [won(`stud${i}`, 'RB', 100, 30)])]),
    )
    const grades = runs.map(r => gradeRun(r, LINEUP, 12, 14))
    const top = topModalRosters(runs, grades, LINEUP, { studThreshold: 10, top: 5 })
    expect(top).toHaveLength(5)
  })
})

// ─── (3) PLAYERS YOU LAND MOST ───────────────────────────────────────────────

describe('playersYouLandMost', () => {
  it('ranks by land rate and averages the price paid', () => {
    const runs = [
      run(1, [roster(0, true, [won('a', 'RB', 200, 10), won('b', 'WR', 100, 5)])]),
      run(2, [roster(0, true, [won('a', 'RB', 200, 20)])]),
      run(3, [roster(0, true, [won('a', 'RB', 200, 30)])]),
    ]
    const landed = playersYouLandMost(runs)

    expect(landed[0].id).toBe('a')
    expect(landed[0].count).toBe(3)
    expect(landed[0].landRate).toBeCloseTo(1, 5)
    expect(landed[0].avgPrice).toBe(20) // (10+20+30)/3

    const b = landed.find(l => l.id === 'b')!
    expect(b.count).toBe(1)
    expect(b.landRate).toBeCloseTo(1 / 3, 5)
    expect(b.avgPrice).toBe(5)
  })
})
