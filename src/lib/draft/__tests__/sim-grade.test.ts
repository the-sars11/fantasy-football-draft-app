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
  medoidRoster,
  playersYouLandMost,
  starterConfigOf,
  DEFAULT_INJURY_MODEL,
  DEFAULT_RISK_MODEL,
  durabilityPriceFactor,
  DURABILITY_PRICE_FLOOR,
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

// ─── (1c) MEASURED RISK MODEL (real Sleeper data: durability + bust/breakout) ──

describe('gradeRun measured risk model (real data)', () => {
  // Two rosters with IDENTICAL healthy best-lineup points (750). They differ only
  // in WHERE the elite production sits: roster A stacks it on two RBs, roster B on
  // a QB + WR. The shipped risk-model.json (15 seasons of Sleeper actuals) measures
  // elite RBs (tier 1-3) busting 52.8% of the time at a median x0.74, versus elite
  // QBs busting 22.9% (x0.86). So equal paper strength, but the RB stack should
  // grade out to fewer wins once the measured outcome variance is applied. This is
  // the whole point: the sim now knows a two-elite-RB build is riskier than its
  // projection suggests, which a "healthy every week" grader could never see.
  const RB_STACK = () => [
    won('a_rb1', 'RB', 320, 90), // league RB1 -> tier 1-3
    won('a_rb2', 'RB', 300, 80), // league RB2 -> tier 1-3
    won('a_qb', 'QB', 40, 2),
    won('a_wr', 'WR', 40, 2),
    won('a_te', 'TE', 40, 2),
    won('a_def', 'DEF', 10, 1),
  ]
  const QB_WR_STACK = () => [
    won('b_qb', 'QB', 320, 90), // league QB1 -> tier 1-3
    won('b_wr', 'WR', 300, 80), // league WR1 -> tier 1-3
    won('b_rb1', 'RB', 40, 2),
    won('b_rb2', 'RB', 40, 2),
    won('b_te', 'TE', 40, 2),
    won('b_def', 'DEF', 10, 1),
  ]
  // Competitive opponents whose skill players all rank well below my studs, so my
  // studs land in tier 1-3 and the opponents' own tiers are identical across both
  // matchups (they wash out of the comparison).
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

  it('grades the two stacks as equally strong when perfectly healthy', () => {
    expect(bestLineupPoints(RB_STACK(), LINEUP)).toBe(750)
    expect(bestLineupPoints(QB_WR_STACK(), LINEUP)).toBe(750)
  })

  it('is deterministic with the risk model on (same seed => same record)', () => {
    const seats = [roster(0, true, RB_STACK()), ...OPPONENTS()]
    const a = gradeRun(run(11, seats), LINEUP, 3, 14, { risk: DEFAULT_RISK_MODEL })
    const b = gradeRun(run(11, seats), LINEUP, 3, 14, { risk: DEFAULT_RISK_MODEL })
    expect(a.wins).toBe(b.wins)
    expect(a.losses).toBe(b.losses)
  })

  it('measured bust risk costs the two-elite-RB build real wins vs an equal QB+WR build', () => {
    const SEEDS = 300
    let rbWins = 0
    let qbWins = 0
    for (let seed = 1; seed <= SEEDS; seed++) {
      const rbSeats = [roster(0, true, RB_STACK()), ...OPPONENTS()]
      const qbSeats = [roster(0, true, QB_WR_STACK()), ...OPPONENTS()]
      rbWins += gradeRun(run(seed, rbSeats), LINEUP, 3, 14, { risk: DEFAULT_RISK_MODEL }).wins
      qbWins += gradeRun(run(seed, qbSeats), LINEUP, 3, 14, { risk: DEFAULT_RISK_MODEL }).wins
    }
    // Same healthy strength, but the RB stack's measured 52.8% elite-bust rate drags
    // its record below the QB+WR stack's. Observed gap ~485 wins across 300 seeds;
    // the +200 margin sits well inside that so it never flakes on rng.
    expect(qbWins).toBeGreaterThan(rbWins + 200)
  })
})

describe('gradeRun durability joins on sleeperId (real per-player games-missed)', () => {
  // Regression for the McCaffrey blind-spot bug: risk-model.json is keyed by
  // Sleeper id, but board/sim players carry a Supabase UUID as `id`. Before the
  // fix, applyRiskModel looked up byPlayer[p.id], which never matched, so EVERY
  // player silently fell back to the position baseline and real injury history
  // (McCaffrey 84.6% games-played) was ignored. The join now uses sleeperId.
  const MCCAFFREY_SLEEPER_ID = '4034' // real: gpRate 0.8462 (misses ~2.6 of 17)

  function wonWithSleeperId(
    id: string,
    sleeperId: string | undefined,
    position: SimWonPlayer['position'],
    projectedPoints: number,
    price = 1,
  ): SimWonPlayer {
    return { id, sleeperId, name: id, position, price, ceiling: price, projectedPoints }
  }

  // Identical elite-RB builds; the ONLY difference is whether the anchor carries
  // McCaffrey's real Sleeper id (fragile, 84.6%) or no id (RB baseline ~94.7%).
  const anchorBuild = (sleeperId: string | undefined) => [
    wonWithSleeperId('anchor_rb', sleeperId, 'RB', 320, 90),
    won('c_rb2', 'RB', 40, 2),
    won('c_qb', 'QB', 40, 2),
    won('c_wr', 'WR', 40, 2),
    won('c_te', 'TE', 40, 2),
    won('c_def', 'DEF', 10, 1),
  ]
  const OPPONENTS = () => [
    roster(1, false, [
      won('o1_qb', 'QB', 55, 12), won('o1_rb1', 'RB', 140, 40), won('o1_rb2', 'RB', 130, 30),
      won('o1_wr1', 'WR', 140, 40), won('o1_wr2', 'WR', 130, 30), won('o1_te', 'TE', 95, 12),
      won('o1_def', 'DEF', 15, 1),
    ]),
    roster(2, false, [
      won('o2_qb', 'QB', 50, 10), won('o2_rb1', 'RB', 145, 40), won('o2_rb2', 'RB', 135, 30),
      won('o2_wr1', 'WR', 140, 40), won('o2_wr2', 'WR', 120, 28), won('o2_te', 'TE', 100, 14),
      won('o2_def', 'DEF', 15, 1),
    ]),
  ]

  it('has McCaffrey in the measured model at his real games-played rate', () => {
    // Guards the join key itself: if the model ever drops McCaffrey, this fails
    // loudly instead of silently reverting the sim to the baseline blind spot.
    const cmc = DEFAULT_RISK_MODEL.durability.byPlayer[MCCAFFREY_SLEEPER_ID]
    expect(cmc).toBeDefined()
    expect(cmc.gpRate).toBeCloseTo(0.8462, 3)
    expect(cmc.gpRate).toBeLessThan(DEFAULT_RISK_MODEL.durability.baseline.RB)
  })

  it('applies real durability only when the anchor carries its sleeperId', () => {
    // Healthy strength is identical, and the outcome (bust/breakout) draws are
    // identical because positional ranks match. The ONLY moving part is the
    // weekly out-rate: 0.8462 (real) vs the RB baseline. So the id-carrying
    // (fragile) build must grade to fewer wins than the id-less (baseline) build.
    const SEEDS = 400
    let fragileWins = 0
    let baselineWins = 0
    for (let seed = 1; seed <= SEEDS; seed++) {
      const fragileSeats = [roster(0, true, anchorBuild(MCCAFFREY_SLEEPER_ID)), ...OPPONENTS()]
      const baselineSeats = [roster(0, true, anchorBuild(undefined)), ...OPPONENTS()]
      fragileWins += gradeRun(run(seed, fragileSeats), LINEUP, 3, 14, { risk: DEFAULT_RISK_MODEL }).wins
      baselineWins += gradeRun(run(seed, baselineSeats), LINEUP, 3, 14, { risk: DEFAULT_RISK_MODEL }).wins
    }
    // Real injury history costs the fragile anchor games and therefore wins.
    // Observed gap ~125 wins across 400 seeds (baseline 1275 vs fragile 1150);
    // the +50 margin sits well inside that so it proves the join fires without
    // being rng-sensitive. Before the fix this gap was 0 (baseline for everyone).
    expect(baselineWins).toBeGreaterThan(fragileWins + 50)
  })
})

describe('durabilityPriceFactor (injury haircut for target prices)', () => {
  // The factor multiplies a player's room price. It measures durability RELATIVE
  // to the position baseline (what the market already assumes), never vs a perfect
  // season, so it does not double-count the risk the room has already priced in.
  const RB_BASE = DEFAULT_RISK_MODEL.durability.baseline.RB

  it('discounts McCaffrey to gpRate / RB-baseline (~0.89x), an ~11% haircut', () => {
    const f = durabilityPriceFactor('4034', 'RB')
    expect(f).toBeCloseTo(0.8462 / RB_BASE, 3)
    expect(f).toBeLessThan(1)
    expect(f).toBeGreaterThan(0.85) // real haircut, not catastrophic
  })

  it('returns 1 (no discount) for a player the model cannot measure', () => {
    // Rookie / model-absent -> no measured durability -> ride the price at room.
    expect(durabilityPriceFactor('does-not-exist', 'RB')).toBe(1)
    expect(durabilityPriceFactor(undefined, 'RB')).toBe(1)
    expect(durabilityPriceFactor(null, 'WR')).toBe(1)
  })

  it('returns 1 for DEF (defenses are always available in this model)', () => {
    expect(durabilityPriceFactor('4034', 'DEF')).toBe(1)
  })

  it('never inflates: a player at/above baseline durability stays at 1.0', () => {
    // Synthetic model: a WR exactly at the WR baseline must not get a premium.
    const model = {
      durability: {
        baseline: { WR: 0.95 },
        byPlayer: { solid: { gpRate: 0.99 }, exact: { gpRate: 0.95 } },
      },
      outcome: {},
    }
    expect(durabilityPriceFactor('solid', 'WR', model)).toBe(1)
    expect(durabilityPriceFactor('exact', 'WR', model)).toBe(1)
  })

  it('floors the haircut at DURABILITY_PRICE_FLOOR for a catastrophic history', () => {
    // gpRate 0.40 / baseline 0.95 = 0.42, well below the floor -> clamped up.
    const model = {
      durability: { baseline: { RB: 0.95 }, byPlayer: { wreck: { gpRate: 0.4 } } },
      outcome: {},
    }
    expect(durabilityPriceFactor('wreck', 'RB', model)).toBe(DURABILITY_PRICE_FLOOR)
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

  it('shows the medoid roster, not a flukey $1 end-game tail', () => {
    // Three runs share the same stud core (a+b); the bench slot z clears at
    // $6/$7 in the typical runs and $1 in one flukey run. The representative
    // must be a typical roster (z ~ $6), never the $1 outlier.
    const stud = () => [won('a', 'RB', 100, 50), won('b', 'WR', 90, 40)]
    const runs = [
      run(1, [roster(0, true, [...stud(), won('z', 'TE', 20, 6)])]),
      run(2, [roster(0, true, [...stud(), won('z', 'TE', 20, 7)])]),
      run(3, [roster(0, true, [...stud(), won('z', 'TE', 20, 1)])]),
    ]
    const grades = runs.map(r => gradeRun(r, LINEUP, 12, 14))
    const top = topModalRosters(runs, grades, LINEUP, { studThreshold: 10, top: 5 })
    expect(top).toHaveLength(1)
    const zPrice = top[0].representative.find(p => p.id === 'z')!.price
    expect(zPrice).toBe(6) // median of [1,6,7] is 6; run 1 is the medoid
    expect(zPrice).not.toBe(1)
  })
})

describe('medoidRoster', () => {
  it('picks the run closest to the per-player median price', () => {
    const mk = (zp: number) => [won('a', 'RB', 100, 50), won('z', 'TE', 20, zp)]
    const rosters = [mk(6), mk(7), mk(1)]
    const med = medoidRoster(rosters)
    expect(med.find(p => p.id === 'z')!.price).toBe(6)
  })

  it('returns the sole roster unchanged and [] for an empty cluster', () => {
    const only = [won('a', 'RB', 100, 50)]
    expect(medoidRoster([only])).toBe(only)
    expect(medoidRoster([])).toEqual([])
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
