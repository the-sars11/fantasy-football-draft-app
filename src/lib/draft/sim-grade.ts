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
import riskModelJson from '../../data/risk-model.json'

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

// ─── Data-driven RISK model (real Sleeper actuals) ───────────────────────────

/**
 * The measured risk model, loaded from src/data/risk-model.json (derived by
 * scripts/derive-risk-model.mjs from 15 seasons of real Sleeper weekly PPR
 * actuals). Two separated, measured layers:
 *   - durability: real per-player games-played rate (position baseline fallback).
 *   - outcome:    per-game bust/breakout multiplier distribution by prior-year
 *                 positional tier, stored as a non-parametric empirical CDF ladder.
 * This supersedes the flat WEEKLY_INJURY_OUT_RATE guesswork above: when a run is
 * graded with `risk`, each player's OWN durability and his tier's REAL bust/breakout
 * odds drive the season, so concentrating on an elite RB (53% historical bust,
 * median x0.74) carries the downside the flat model could never see.
 */
export interface RiskModel {
  durability: {
    baseline: Record<string, number>
    byPlayer: Record<string, { gpRate: number; pos?: string; seasons?: number }>
  }
  /** outcome[pos][tierKey] carries a 21-point empirical CDF ladder when the sample is thick. */
  outcome: Record<string, Record<string, { n: number; cdf?: number[] }>>
}

/** The measured model used by the real sim path (buildSimSummary). */
export const DEFAULT_RISK_MODEL: RiskModel = riskModelJson as unknown as RiskModel

/**
 * A durability discount never haircuts a player's room price by more than this.
 * One 15-season model should nudge a price, not zero a stud out; a chronically
 * fragile guy still gets a real number.
 */
export const DURABILITY_PRICE_FLOOR = 0.75

/**
 * Durability PRICE factor: how much to haircut a player's room price for injury
 * risk. Multiply the room-anchor price by this (1 = no change, <1 = discount).
 *
 * The haircut is RELATIVE to the durability the market already assumes for the
 * position (the position baseline), NOT relative to a perfect 17-game season.
 * The room price already bakes in some awareness that RBs miss time; discounting
 * against a flawless season would double-count that. So a player exactly as
 * durable as his position's baseline gets factor 1.0 (no discount); only the
 * SHORTFALL below baseline is charged. McCaffrey 0.8462 / RB baseline 0.9466 =
 * 0.89x -> an ~11% haircut off his room price.
 *
 * It only ever discounts, never inflates (capped at 1.0): a rock-solid player's
 * price stays at room, we never tell Joe to bid MORE for health. Floored at
 * DURABILITY_PRICE_FLOOR. Returns 1 (no adjustment) for DEF and for any player
 * the model can't measure (rookies, <2 real-role seasons, model-absent) -- the
 * same set that correctly rides the position baseline in the sim.
 */
export function durabilityPriceFactor(
  sleeperId: string | null | undefined,
  position: string,
  model: RiskModel = DEFAULT_RISK_MODEL,
): number {
  if (position === 'DEF') return 1
  const entry = sleeperId ? model.durability.byPlayer[sleeperId] : undefined
  if (!entry || !Number.isFinite(entry.gpRate)) return 1
  const baseline = model.durability.baseline[position]
  if (!(typeof baseline === 'number' && baseline > 0)) return 1
  const raw = entry.gpRate / baseline
  return Math.min(1, Math.max(DURABILITY_PRICE_FLOOR, raw))
}

/** Salt so the season-outcome PRNG is independent of the weekly PRNG at the same seed. */
const OUTCOME_SEED_SALT = 0x85ebca6b

/** Cap a weekly out-rate so no single player is absent more than ~half the year. */
const MAX_WEEKLY_OUT = 0.5

/** Prior-year positional tiers, aligned to the derivation script. rank > 48 uses the last tier. */
const RISK_TIERS: { key: string; lo: number; hi: number }[] = [
  { key: '1-3', lo: 1, hi: 3 },
  { key: '4-6', lo: 4, hi: 6 },
  { key: '7-12', lo: 7, hi: 12 },
  { key: '13-24', lo: 13, hi: 24 },
  { key: '25-48', lo: 25, hi: 999 },
]

function tierOf(rank: number): string {
  return (RISK_TIERS.find(t => rank >= t.lo && rank <= t.hi) ?? RISK_TIERS[RISK_TIERS.length - 1]).key
}

/**
 * Rank every skill player by projected points WITHIN his position across all rosters
 * in the run. This projected positional rank (RB1, RB2, ...) is the sim-time analogue
 * of the prior-year finish the outcome tiers were measured on. DEF is not tiered.
 */
function positionalRanks(run: SimRun): Map<string, number> {
  const byPos: Record<string, SimWonPlayer[]> = { QB: [], RB: [], WR: [], TE: [] }
  for (const r of run.rosters) {
    for (const p of r.players) {
      if (byPos[p.position]) byPos[p.position].push(p)
    }
  }
  const ranks = new Map<string, number>()
  for (const pos of Object.keys(byPos)) {
    byPos[pos].sort(byPointsDesc).forEach((p, i) => ranks.set(p.id, i + 1))
  }
  return ranks
}

/** Find the empirical CDF for a position+tier, walking to the nearest thick tier if needed. */
function tierCdf(model: RiskModel, pos: string, tierKey: string): number[] | null {
  const posTiers = model.outcome[pos]
  if (!posTiers) return null
  const direct = posTiers[tierKey]?.cdf
  if (direct && direct.length > 1) return direct
  // Walk outward from the requested tier to the nearest tier that has a real ladder.
  const order = RISK_TIERS.map(t => t.key)
  const idx = order.indexOf(tierKey)
  for (let d = 1; d < order.length; d++) {
    for (const j of [idx - d, idx + d]) {
      const cdf = order[j] ? posTiers[order[j]]?.cdf : undefined
      if (cdf && cdf.length > 1) return cdf
    }
  }
  return null
}

/** Interpolate a season per-game multiplier from a 21-point empirical CDF ladder at u in [0,1). */
function drawMultiplier(cdf: number[], u: number): number {
  const x = Math.min(0.999999, Math.max(0, u)) * (cdf.length - 1)
  const lo = Math.floor(x)
  const hi = Math.min(cdf.length - 1, lo + 1)
  return cdf[lo] + (cdf[hi] - cdf[lo]) * (x - lo)
}

/**
 * Apply the measured risk model to one run: draw each player's season bust/breakout
 * multiplier (once per run, from his tier's real distribution) into a shadow roster
 * with scaled projected points, and precompute each player's weekly OUT rate from his
 * real durability. Deterministic: the outcome draws flow from a seed-salted PRNG that
 * is independent of the weekly PRNG, so adding this never disturbs the weekly stream.
 */
function applyRiskModel(
  run: SimRun,
  model: RiskModel,
): { effRosters: SimWonPlayer[][]; outRateById: Map<string, number> } {
  const ranks = positionalRanks(run)
  const outcomeRng = mulberry32((run.seed ^ OUTCOME_SEED_SALT) >>> 0)
  const outRateById = new Map<string, number>()
  const effRosters = run.rosters.map(r =>
    r.players.map(p => {
      // Durability: weekly out-rate = 1 - real games-played rate (per player, else baseline).
      // The risk model is keyed by Sleeper id, so join on sleeperId; `id` is a
      // Supabase UUID that never matches and would silently fall back to baseline
      // for everyone (the McCaffrey blind-spot bug). Rookies / players absent from
      // the model still fall back to the position baseline, which is correct.
      const gpRate =
        p.position === 'DEF'
          ? 1
          : model.durability.byPlayer[p.sleeperId ?? p.id]?.gpRate ?? model.durability.baseline[p.position] ?? 1
      outRateById.set(p.id, Math.min(MAX_WEEKLY_OUT, Math.max(0, 1 - gpRate)))

      // Outcome: one season multiplier drawn from this player's tier's REAL distribution.
      let mult = 1
      if (p.position !== 'DEF') {
        const cdf = tierCdf(model, p.position, tierOf(ranks.get(p.id) ?? 999))
        if (cdf) mult = drawMultiplier(cdf, outcomeRng())
      }
      return { ...p, projectedPoints: Math.round(p.projectedPoints * mult * 10) / 10 }
    }),
  )
  return { effRosters, outRateById }
}

/** Best available lineup for one week using per-PLAYER out-rates (real durability path). */
function weeklyAvailablePointsByPlayer(
  players: SimWonPlayer[],
  lineup: StarterConfig,
  outRateById: Map<string, number>,
  rng: () => number,
): number {
  const available: SimWonPlayer[] = []
  for (const p of players) {
    const out = rng() < (outRateById.get(p.id) ?? 0)
    if (!out) available.push(p)
  }
  return bestLineupPoints(available, lineup)
}

export interface GradeRunOptions {
  /**
   * Flat injury/availability model (positional out-rates only). Kept for focused unit
   * tests; the real product uses `risk` instead. Omit or false = studs never miss.
   */
  injury?: InjuryModel | false
  /**
   * Measured risk model (real per-player durability + tier bust/breakout). When set,
   * this supersedes `injury`: each player faces his OWN games-missed rate and a season
   * outcome draw from his tier's real distribution. buildSimSummary passes
   * DEFAULT_RISK_MODEL so the shipped grades reflect real concentration risk.
   */
  risk?: RiskModel | false
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
  const risk = opts.risk === false ? null : (opts.risk ?? null)

  // The real model (risk) supersedes the flat one: draw each player's season
  // bust/breakout multiplier and per-player durability once for this run.
  const applied = risk ? applyRiskModel(run, risk) : null

  const rng = mulberry32((run.seed ^ WEEKLY_SEED_SALT) >>> 0)
  let wins = 0
  for (let wk = 0; wk < games; wk++) {
    // Weekly base points, in priority order:
    //   risk   -> best AVAILABLE lineup of the bust/breakout-adjusted roster, each
    //             player out at his OWN real games-missed rate (thin benches pay most).
    //   injury -> flat positional out-rates on healthy points (unit-test path).
    //   none   -> fixed healthy per-week mean (legacy, byte-identical for a seed).
    const myBase = applied
      ? weeklyAvailablePointsByPlayer(applied.effRosters[myIndex], lineup, applied.outRateById, rng) / games
      : injury
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
    const oppBase = applied
      ? weeklyAvailablePointsByPlayer(applied.effRosters[opp], lineup, applied.outRateById, rng) / games
      : injury
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

  // Per run losses = games - wins (no ties: the matchup uses a strict >), so the
  // true mean losses is exactly games - meanWins. Derive it from the ROUNDED
  // meanWins so the persisted pair always sums to `games`; rounding each mean
  // independently could otherwise drift the sum to e.g. 14.1 (9.4 + 4.7).
  const meanWins = mean(winsList)

  return {
    runs: grades.length,
    games,
    numManagers,
    meanStarterPoints: mean(grades.map(g => g.myStarterPoints)),
    meanRank: mean(grades.map(g => g.myRank)),
    meanWins,
    meanLosses: Math.round((games - meanWins) * 10) / 10,
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
  /** A real roster instance from this cluster (the medoid -- the run whose
   *  per-slot prices are most typical of the cluster, not an arbitrary first
   *  occurrence). Every price is a real simulated clearing price. */
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
 * Pick the medoid roster of a cluster: the real run instance whose per-slot
 * prices deviate least from the cluster's per-player median price. This shows a
 * TYPICAL roster instead of an arbitrary first occurrence, so a flukey run whose
 * end-game bench slots all landed at $1 no longer stands in for the cluster. No
 * price is synthesized -- we return an actual simulated roster; we only choose
 * which one. Ties break to the earlier run for determinism.
 */
export function medoidRoster(rosters: SimWonPlayer[][]): SimWonPlayer[] {
  if (rosters.length <= 1) return rosters[0] ?? []
  // Per-player median price across the cluster.
  const pricesById = new Map<string, number[]>()
  for (const roster of rosters) {
    for (const p of roster) {
      const list = pricesById.get(p.id) ?? []
      list.push(p.price)
      pricesById.set(p.id, list)
    }
  }
  const medianById = new Map<string, number>()
  for (const [id, prices] of pricesById) {
    prices.sort((a, b) => a - b)
    const mid = Math.floor(prices.length / 2)
    const median =
      prices.length % 2 === 0 ? (prices[mid - 1] + prices[mid]) / 2 : prices[mid]
    medianById.set(id, median)
  }
  // The run whose slot prices sit closest to those medians is the most typical.
  let best = rosters[0]
  let bestDeviation = Infinity
  for (const roster of rosters) {
    let deviation = 0
    for (const p of roster) {
      deviation += Math.abs(p.price - (medianById.get(p.id) ?? p.price))
    }
    if (deviation < bestDeviation) {
      bestDeviation = deviation
      best = roster
    }
  }
  return best
}

/**
 * The 5 most frequently occurring roster shapes across all runs, clustered by
 * stud core. Modal, not percentile: these are the drafts that actually recurred,
 * each labeled with how often it hit. Ties break toward higher avg starter points
 * so the stronger of two equally-frequent shapes ranks first. Each cluster's
 * displayed roster is its medoid (see medoidRoster), not a first occurrence.
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
    rosters: SimWonPlayer[][]
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
        rosters: [],
        spends: [],
        starterPoints: [],
        wins: [],
      }
      clusters.set(key, cluster)
    }
    cluster.rosters.push(run.myRoster.players)
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
      representative: medoidRoster(c.rosters),
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
