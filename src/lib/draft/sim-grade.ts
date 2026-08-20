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

import { mulberry32 } from './sim-engine'
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
 * Weekly scoring noise as a fraction of the league-average weekly lineup points.
 * Fantasy team scores swing hard week to week; ~0.16 reproduces believable records
 * — the best paper roster lands around 9-5 to 11-3, not a deterministic 14-0, and
 * the worst still steals a couple of games. Tunable in one place.
 */
const WEEKLY_SD_FRACTION = 0.16

/** Salt so the grading PRNG is independent of the auction PRNG at the same seed. */
const WEEKLY_SEED_SALT = 0x9e3779b9

/**
 * One standard-normal draw via Box-Muller from a seeded uniform PRNG. Deterministic
 * for a given rng state, so a fixed run seed yields a fixed season.
 */
function standardNormal(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-9)
  const u2 = rng()
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
}

// ─── Injury / weekly-availability model ──────────────────────────────────────

/**
 * Weekly probability a player at each position is OUT (injured or inactive) for a
 * given week. A STATED MODEL PARAMETER, tunable here, exactly the same status as
 * WEEKLY_SD_FRACTION above — not a measured constant, a documented assumption.
 *
 * Grounded in the real, well-known shape of NFL games-missed by position: running
 * backs miss the most games (highest contact load), quarterbacks the fewest, wide
 * receivers and tight ends in between, and a DEF is a team unit that is never
 * "injured" as a whole. Values are per-week per-player out-rates that imply a
 * healthy full-season games-played roughly in line with those positional norms
 * (e.g. RB ~0.12/week ≈ misses ~1.7 of 14 weeks).
 *
 * Why this exists: without it, the best-lineup optimizer plays every stud at full
 * projection every week, so a two-stud / dollar-bench roster is scored as if its
 * anchors never get hurt. With it, an OUT player is dropped from the weekly pool
 * and his slot falls to the next-best AVAILABLE player. A concentrated roster's
 * next man up is a $1 scrub, so it craters on the weeks a stud sits; a balanced
 * roster barely dips. That asymmetric downside is the real cost of concentration
 * the sim was missing.
 */
export const WEEKLY_INJURY_OUT_RATE: Record<SimWonPlayer['position'], number> = {
  QB: 0.06,
  RB: 0.12,
  WR: 0.09,
  TE: 0.1,
  DEF: 0.0,
}

export interface InjuryModel {
  /** Weekly out-probability by position. */
  outRate: Record<SimWonPlayer['position'], number>
}

/** The default injury model used by the real sim path (buildSimSummary). */
export const DEFAULT_INJURY_MODEL: InjuryModel = { outRate: WEEKLY_INJURY_OUT_RATE }

/**
 * Best starting-lineup points for ONE week under an injury draw. Each player is
 * independently OUT with his position's weekly out-rate (one rng draw per player,
 * in roster order, so it stays deterministic for a fixed seed). OUT players are
 * removed from the pool, then the normal best-legal-lineup optimizer fills every
 * slot from whoever is left — the injured man's slot naturally falls to the
 * next-best available body, which is where a thin bench gets punished.
 */
function weeklyAvailablePoints(
  players: SimWonPlayer[],
  lineup: StarterConfig,
  outRate: Record<SimWonPlayer['position'], number>,
  rng: () => number,
): number {
  const available: SimWonPlayer[] = []
  for (const p of players) {
    const out = rng() < (outRate[p.position] ?? 0)
    if (!out) available.push(p)
  }
  return bestLineupPoints(available, lineup)
}

export interface GradeRunOptions {
  /**
   * Injury/availability model to apply during the weekly season sim. Omit or pass
   * false for the legacy behavior (studs never miss a game, team-level noise only).
   * buildSimSummary passes DEFAULT_INJURY_MODEL so the real product accounts for it.
   */
  injury?: InjuryModel | false
}

/**
 * Grade one simulated draft into a projected regular-season record by SIMULATING
 * THE SEASON with weekly variance. Each seat is scored on its best starting
 * lineup's projected season points, converted to a per-week mean. Then for each of
 * `games` weeks, my lineup scores its mean plus gaussian noise and faces a random
 * opponent doing the same; I bank a win when I outscore them. Counting wins over
 * the season turns roster strength into a BELIEVABLE record — a strong roster still
 * drops games to variance, a weak one still steals a few — instead of the old
 * deterministic rank→record map that sent every top roster straight to 14-0.
 *
 * Deterministic: all noise flows from mulberry32(run.seed ^ salt), so byte-identical
 * reruns still produce byte-identical records. myRank (by season points) is kept for
 * roster clustering and labels.
 */
export function gradeRun(
  run: SimRun,
  lineup: StarterConfig,
  numManagers: number,
  games: number,
  opts: GradeRunOptions = {},
): RunGrade {
  const leagueStarterPoints = run.rosters.map(r => bestLineupPoints(r.players, lineup))
  const myIndex = run.myRoster.managerIndex
  const myStarterPoints = leagueStarterPoints[myIndex]

  // Rank: 1 = highest points. Count teams strictly better, +1. (Deterministic.)
  // Rank is HEALTHY-roster season points, a structural label for clustering; the
  // injury model changes the projected RECORD, not the paper-strength ranking.
  let rank = 1
  for (let i = 0; i < leagueStarterPoints.length; i++) {
    if (i === myIndex) continue
    if (leagueStarterPoints[i] > myStarterPoints) rank++
  }

  const seats = leagueStarterPoints.length
  const perWeek = leagueStarterPoints.map(p => p / games)
  const leagueAvgWeekly =
    perWeek.reduce((s, v) => s + v, 0) / (perWeek.length || 1)
  const sd = Math.max(0.5, WEEKLY_SD_FRACTION * leagueAvgWeekly)

  const injury = opts.injury === false ? null : (opts.injury ?? null)

  const rng = mulberry32((run.seed ^ WEEKLY_SEED_SALT) >>> 0)
  let wins = 0
  for (let wk = 0; wk < games; wk++) {
    // Weekly base points: with an injury model, redraw each seat's best AVAILABLE
    // lineup this week (thin benches pay here); without one, use the fixed
    // healthy per-week mean (legacy behavior, byte-identical for a given seed).
    const myBase = injury
      ? weeklyAvailablePoints(run.rosters[myIndex].players, lineup, injury.outRate, rng) / games
      : perWeek[myIndex]
    const myScore = myBase + standardNormal(rng) * sd

    // Face a random other seat this week (schedule luck included).
    let opp = myIndex
    if (seats > 1) {
      do {
        opp = Math.floor(rng() * seats)
      } while (opp === myIndex)
    }
    const oppBase = injury
      ? weeklyAvailablePoints(run.rosters[opp].players, lineup, injury.outRate, rng) / games
      : perWeek[opp]
    const oppScore = oppBase + standardNormal(rng) * sd
    if (myScore > oppScore) wins++
  }

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
