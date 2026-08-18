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

describe('gradeRun projected record', () => {
  it('best team in a 3-team league projects to win every game', () => {
    const r = run(1, [
      roster(0, true, [won('me', 'QB', 300)]),
      roster(1, false, [won('o1', 'QB', 200)]),
      roster(2, false, [won('o2', 'QB', 100)]),
    ])
    const g = gradeRun(r, QB_ONLY, 3, 12)
    expect(g.myRank).toBe(1)
    expect(g.wins).toBe(12)
    expect(g.losses).toBe(0)
  })

  it('worst team projects to lose every game', () => {
    const r = run(1, [
      roster(0, true, [won('me', 'QB', 50)]),
      roster(1, false, [won('o1', 'QB', 200)]),
      roster(2, false, [won('o2', 'QB', 100)]),
    ])
    const g = gradeRun(r, QB_ONLY, 3, 12)
    expect(g.myRank).toBe(3)
    expect(g.wins).toBe(0)
  })

  it('middle team projects to a .500-ish record', () => {
    const r = run(1, [
      roster(0, true, [won('me', 'QB', 150)]),
      roster(1, false, [won('o1', 'QB', 200)]),
      roster(2, false, [won('o2', 'QB', 100)]),
    ])
    const g = gradeRun(r, QB_ONLY, 3, 12)
    expect(g.myRank).toBe(2)
    expect(g.wins).toBe(6) // (3-2)/(3-1) = 0.5 * 12
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
