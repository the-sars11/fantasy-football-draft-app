/**
 * sim-grade.ts — R10b: grading + post-processing on top of the R10a Monte-Carlo
 * auction engine. Everything here is PURE, DETERMINISTIC, and $0 — no React, no
 * network, no Claude. It turns the raw per-run rosters from sim-engine into the
 * three things Joe actually reads:
 *
 *   1. GRADE  — each run's roster scored on projected season points vs the league,
 *               expressed as a projected win-loss record.
 *   2. TOP-5 MODAL ROSTERS — the 5 most frequently occurring roster SHAPES,
 *               clustered by their stud core (players won above a $ threshold;
 *               the $1 bench fill is noise), each labeled with its frequency.
 *   3. PLAYERS YOU LAND MOST — per-player fraction of sims you end up with them,
 *               ranked, with the average price paid.
 *
 * Grading is honest by construction: every point total traces to a real
 * projected-points value carried from the board (ESPN proj_points). The projected
 * record is a stated model — see gradeRun — not an invented number.
 *
 * Copy rule (Joe): plain English, NO em/en dashes anywhere in surfaced strings.
 */

import type { SimRun, SimWonPlayer, SimRosterConfig } from './sim-engine'

// ─── Starting-lineup scoring ─────────────────────────────────────────────────

/** The scoring lineup (bench never scores). Derived from SimRosterConfig. */
export interface StarterConfig {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  dst: number
}

const FLEX_POSITIONS: SimWonPlayer['position'][] = ['RB', 'WR', 'TE']

/** Pull the scoring-lineup shape out of the full roster config. */
export function starterConfigOf(config: SimRosterConfig): StarterConfig {
  return {
    qb: config.qb,
    rb: config.rb,
    wr: config.wr,
    te: config.te,
    flex: config.flex,
    dst: config.dst,
  }
}

function byPointsDesc(a: SimWonPlayer, b: SimWonPlayer): number {
  return b.projectedPoints - a.projectedPoints || a.id.localeCompare(b.id)
}

/**
 * Best starting-lineup projected points for one roster. Fills every dedicated
 * slot with that position's highest projections, then FLEX from the best
 * leftover RB/WR/TE, and sums. A slot with no eligible player simply scores 0
 * (e.g. a roster that never landed a DEF). Deterministic: ties break on id.
 */
export function bestLineupPoints(
  players: SimWonPlayer[],
  lineup: StarterConfig,
): number {
  const pool: Record<SimWonPlayer['position'], SimWonPlayer[]> = {
    QB: [], RB: [], WR: [], TE: [], DEF: [],
  }
  for (const p of players) pool[p.position].push(p)
  for (const pos of Object.keys(pool) as SimWonPlayer['position'][]) {
    pool[pos].sort(byPointsDesc)
  }

  let points = 0
  const take = (pos: SimWonPlayer['position'], n: number): void => {
    for (let i = 0; i < n; i++) {
      const pick = pool[pos].shift()
      if (pick) points += pick.projectedPoints
    }
  }

  take('QB', lineup.qb)
  take('RB', lineup.rb)
  take('WR', lineup.wr)
  take('TE', lineup.te)
  take('DEF', lineup.dst)

  // FLEX: best remaining RB/WR/TE across the leftover pools.
  const flexPool = FLEX_POSITIONS.flatMap(pos => pool[pos]).sort(byPointsDesc)
  for (let i = 0; i < lineup.flex; i++) {
    const pick = flexPool[i]
    if (pick) points += pick.projectedPoints
  }

  return Math.round(points * 10) / 10
}

// ─── Per-run grade → projected record ────────────────────────────────────────

export interface RunGrade {
  seed: number
  /** My best starting-lineup projected points this run. */
  myStarterPoints: number
  /** Every seat's starter points, index-aligned to manager index. */
  leagueStarterPoints: number[]
  /** 1 = best team in the league by starter points this run. */
  myRank: number
  /** Projected wins over the regular season (see model note). */
  wins: number
  /** Projected losses = games - wins. */
  losses: number
}

/**
 * Grade one simulated draft. Model: each seat is scored on its best starting
 * lineup's projected season points. My win probability against a random opponent
 * is (numManagers - myRank) / (numManagers - 1) — i.e. the share of the other
 * teams I outproject. Projected wins = round(games * that probability). This is a
 * transparent rank-vs-league model on real projections, not weekly variance.
 */
export function gradeRun(
  run: SimRun,
  lineup: StarterConfig,
  numManagers: number,
  games: number,
): RunGrade {
  const leagueStarterPoints = run.rosters.map(r => bestLineupPoints(r.players, lineup))
  const myStarterPoints = bestLineupPoints(run.myRoster.players, lineup)

  // Rank: 1 = highest points. Count teams strictly better, +1.
  let rank = 1
  for (let i = 0; i < leagueStarterPoints.length; i++) {
    if (i === run.myRoster.managerIndex) continue
    if (leagueStarterPoints[i] > myStarterPoints) rank++
  }

  const winProb =
    numManagers > 1 ? (numManagers - rank) / (numManagers - 1) : 0
  const wins = Math.round(games * winProb)

  return {
    seed: run.seed,
    myStarterPoints,
    leagueStarterPoints,
    myRank: rank,
    wins,
    losses: games - wins,
  }
}

export interface GradeSummary {
  runs: number
  games: number
  numManagers: number
  meanStarterPoints: number
  meanRank: number
  meanWins: number
  meanLosses: number
  /** Most frequently projected (wins-losses) record across all runs. */
  modalRecord: { wins: number; losses: number; frequencyPct: number }
  bestRecord: { wins: number; losses: number }
  worstRecord: { wins: number; losses: number }
}

/** Aggregate the per-run grades into one league-facing summary. */
export function summarizeGrades(grades: RunGrade[], games: number, numManagers: number): GradeSummary {
  const n = grades.length || 1
  const mean = (vals: number[]): number =>
    Math.round((vals.reduce((s, v) => s + v, 0) / (vals.length || 1)) * 10) / 10

  const winsList = grades.map(g => g.wins)

  // Modal record: most common (wins) value across runs (losses = games - wins).
  const recordCounts = new Map<number, number>()
  for (const w of winsList) recordCounts.set(w, (recordCounts.get(w) ?? 0) + 1)
  let modalWins = winsList[0] ?? 0
  let modalCount = 0
  for (const [w, c] of recordCounts) {
    if (c > modalCount || (c === modalCount && w > modalWins)) {
      modalWins = w
      modalCount = c
    }
  }

  const bestWins = winsList.length ? Math.max(...winsList) : 0
  const worstWins = winsList.length ? Math.min(...winsList) : 0

  return {
    runs: grades.length,
    games,
    numManagers,
    meanStarterPoints: mean(grades.map(g => g.myStarterPoints)),
    meanRank: mean(grades.map(g => g.myRank)),
    meanWins: mean(winsList),
    meanLosses: mean(grades.map(g => g.losses)),
    modalRecord: {
      wins: modalWins,
      losses: games - modalWins,
      frequencyPct: Math.round((modalCount / n) * 1000) / 10,
    },
    bestRecord: { wins: bestWins, losses: games - bestWins },
    worstRecord: { wins: worstWins, losses: games - worstWins },
  }
}

// ─── Top-5 modal rosters (clustered by stud core) ────────────────────────────

/** Default $ threshold above which a won player counts as part of the stud core. */
export const DEFAULT_STUD_THRESHOLD = 10

export interface ModalRoster {
  /** Sorted stud-core player ids — the cluster key. */
  coreIds: string[]
  /** Stud-core names, in the same order as coreIds, for display. */
  coreNames: string[]
  /** How many runs produced this exact stud core. */
  frequency: number
  /** Frequency as a percentage of all runs (one decimal). */
  frequencyPct: number
  /** A real roster instance from this cluster (first occurrence). */
  representative: SimWonPlayer[]
  /** Average total spent across runs in this cluster. */
  avgSpent: number
  /** Average best-lineup projected points across runs in this cluster. */
  avgStarterPoints: number
  /** Average projected wins across runs in this cluster. */
  avgWins: number
}

/** The stud core of a roster: sorted ids of players won at/above the threshold. */
export function studCore(players: SimWonPlayer[], threshold: number): string[] {
  return players
    .filter(p => p.price >= threshold)
    .map(p => p.id)
    .sort((a, b) => a.localeCompare(b))
}

/**
 * The 5 most frequently occurring roster shapes across all runs, clustered by
 * stud core. Modal, not percentile: these are the drafts that actually recurred,
 * each labeled with how often it hit. Ties break toward higher avg starter points
 * so the stronger of two equally-frequent shapes ranks first.
 */
export function topModalRosters(
  runs: SimRun[],
  grades: RunGrade[],
  lineup: StarterConfig,
  opts: { studThreshold?: number; top?: number } = {},
): ModalRoster[] {
  const threshold = opts.studThreshold ?? DEFAULT_STUD_THRESHOLD
  const top = opts.top ?? 5
  const total = runs.length || 1

  interface Cluster {
    coreIds: string[]
    coreNames: string[]
    representative: SimWonPlayer[]
    spends: number[]
    starterPoints: number[]
    wins: number[]
  }
  const clusters = new Map<string, Cluster>()

  runs.forEach((run, i) => {
    const core = studCore(run.myRoster.players, threshold)
    const key = core.join('|')
    let cluster = clusters.get(key)
    if (!cluster) {
      const byId = new Map(run.myRoster.players.map(p => [p.id, p]))
      cluster = {
        coreIds: core,
        coreNames: core.map(id => byId.get(id)?.name ?? id),
        representative: run.myRoster.players,
        spends: [],
        starterPoints: [],
        wins: [],
      }
      clusters.set(key, cluster)
    }
    cluster.spends.push(run.myRoster.spent)
    cluster.starterPoints.push(bestLineupPoints(run.myRoster.players, lineup))
    cluster.wins.push(grades[i]?.wins ?? 0)
  })

  const avg = (vals: number[]): number =>
    Math.round((vals.reduce((s, v) => s + v, 0) / (vals.length || 1)) * 10) / 10

  return Array.from(clusters.values())
    .map(c => ({
      coreIds: c.coreIds,
      coreNames: c.coreNames,
      frequency: c.spends.length,
      frequencyPct: Math.round((c.spends.length / total) * 1000) / 10,
      representative: c.representative,
      avgSpent: Math.round(avg(c.spends)),
      avgStarterPoints: avg(c.starterPoints),
      avgWins: avg(c.wins),
    }))
    .sort((a, b) => b.frequency - a.frequency || b.avgStarterPoints - a.avgStarterPoints)
    .slice(0, top)
}

// ─── Players you land most ───────────────────────────────────────────────────

export interface LandedPlayer {
  id: string
  name: string
  position: SimWonPlayer['position']
  /** Number of runs in which this player ended up on my roster. */
  count: number
  /** Fraction of all runs (0..1) I landed this player. */
  landRate: number
  /** Average price paid across the runs I landed them. */
  avgPrice: number
}

/**
 * Every player I ever landed, ranked by how often I landed them across the sims,
 * with the average price paid. A plain frequency count over my rosters — no
 * modeling, no estimation.
 */
export function playersYouLandMost(runs: SimRun[]): LandedPlayer[] {
  const total = runs.length || 1
  interface Acc {
    id: string
    name: string
    position: SimWonPlayer['position']
    count: number
    priceSum: number
  }
  const acc = new Map<string, Acc>()

  for (const run of runs) {
    for (const p of run.myRoster.players) {
      let a = acc.get(p.id)
      if (!a) {
        a = { id: p.id, name: p.name, position: p.position, count: 0, priceSum: 0 }
        acc.set(p.id, a)
      }
      a.count += 1
      a.priceSum += p.price
    }
  }

  return Array.from(acc.values())
    .map(a => ({
      id: a.id,
      name: a.name,
      position: a.position,
      count: a.count,
      landRate: a.count / total,
      avgPrice: Math.round(a.priceSum / a.count),
    }))
    .sort((a, b) => b.landRate - a.landRate || b.avgPrice - a.avgPrice || a.name.localeCompare(b.name))
}
