/**
 * sim-results.ts — R10b: stitches the R10a engine and the sim-grade post-processor
 * into one summary the Simulate screen renders, plus the slim shape saved to
 * research_runs. Pure and $0: no React, no network, no Claude.
 *
 * DEC-1 (BIAS) lives here as buildMyBiasFromTags: it maps Joe's graded
 * targets/avoids (user_tags: weight 1..10, severity soft/hard) into the me-seat
 * bias the engine consumes. Opponents are never biased.
 *
 * Copy rule (Joe): plain English, NO em/en dashes anywhere in surfaced strings.
 */

import {
  runMonteCarlo,
  type SimEngineInput,
  type SimMyBias,
  type SimMyPlan,
  type SimDistribution,
} from './sim-engine'
import type { BoardPlayer } from './roster-solver'
import {
  starterConfigOf,
  gradeRun,
  summarizeGrades,
  topModalRosters,
  playersYouLandMost,
  DEFAULT_STUD_THRESHOLD,
  DEFAULT_RISK_MODEL,
  type GradeSummary,
  type ModalRoster,
  type LandedPlayer,
  type RunGrade,
  type RiskModel,
} from './sim-grade'

/** Nasties regular season length (H2H). Assumption, stated, not fabricated. */
export const DEFAULT_REGULAR_SEASON_GAMES = 14

// ─── DEC-1 bias from graded tags ─────────────────────────────────────────────

/** Minimal graded-tag shape (matches useUserTags' userTagsMap entries). */
export interface GradedTagLike {
  tags: string[]
  tagWeight?: number
  tagSeverity?: string
}

/**
 * Translate Joe's graded target/avoid tags into me-seat bias, keyed by player id.
 * target => bounded valuation lift scaled by weight; avoid => severity-driven
 * (hard = never bid, soft = discount only). Players with neither tag are omitted.
 */
export function buildMyBiasFromTags(
  map: Record<string, GradedTagLike>,
): SimMyBias {
  const bias: SimMyBias = {}
  for (const [playerId, entry] of Object.entries(map)) {
    const tags = entry.tags ?? []
    if (tags.includes('avoid')) {
      bias[playerId] = {
        kind: 'avoid',
        severity: entry.tagSeverity === 'hard' ? 'hard' : 'soft',
      }
    } else if (tags.includes('target')) {
      bias[playerId] = {
        kind: 'target',
        weight: Math.min(10, Math.max(1, Math.round(entry.tagWeight ?? 5))),
      }
    }
  }
  return bias
}

// ─── R10b strategy plan from a proposal ──────────────────────────────────────

/** Hard clearing cap ($) mirrored from the engine so an anchor never asks for a
 *  price the room has never paid. Kept in sync with sim-engine's LEAGUE_MAX_CLEAR. */
const PLAN_MAX_CLEAR = 88

/** Minimal solved-target shape (subset of research target-pricing TargetPrice). */
export interface PlanTargetLike {
  name: string
  /** WALK-UP: absolute max-to-win dollars for this target. */
  walkUp?: number | null
  /** EXPECT: plan-to-pay dollars (fallback when walkUp is absent). */
  price?: number | null
  /** Un-adjusted room anchor (last-resort fallback). */
  baseValue?: number | null
}

/**
 * R10b: turn ONE strategy's solved targets (+ any un-priced key_targets) into the
 * me-seat plan the engine executes. Anchors are keyed by BoardPlayer.id (resolved
 * by name against the sim board), each with the most me will pay to WIN it:
 *   - a solved target -> its walk-up price (fall back to expect, then room anchor),
 *   - an un-priced key_target -> the player's Nasties ceiling (band-high),
 * both floored at $1 and capped at PLAN_MAX_CLEAR. Names that match no board
 * player are dropped (never invents an id). First board row per name wins, matching
 * the dedup upstream. Returns { anchors: {} } when nothing resolves, which the
 * engine treats as "fill the whole roster at market" (still a valid plan).
 */
export function buildMyPlanFromStrategy(
  board: BoardPlayer[],
  solvedTargets: PlanTargetLike[],
  keyTargets: string[] = [],
): SimMyPlan {
  const byName = new Map<string, BoardPlayer>()
  for (const p of board) {
    const key = p.name.toLowerCase()
    if (!byName.has(key)) byName.set(key, p)
  }

  const anchors: SimMyPlan['anchors'] = {}

  for (const t of solvedTargets) {
    const bp = byName.get(t.name.toLowerCase())
    if (!bp) continue
    const raw = t.walkUp ?? t.price ?? t.baseValue ?? bp.ceiling
    const maxPrice = Math.min(PLAN_MAX_CLEAR, Math.max(1, Math.round(raw)))
    anchors[bp.id] = { maxPrice }
  }

  for (const name of keyTargets) {
    const bp = byName.get(name.toLowerCase())
    if (!bp || anchors[bp.id]) continue
    const maxPrice = Math.min(PLAN_MAX_CLEAR, Math.max(1, Math.round(bp.ceiling)))
    anchors[bp.id] = { maxPrice }
  }

  return { anchors }
}

// ─── Full sim summary ────────────────────────────────────────────────────────

export interface SimSummaryConfig {
  runs: number
  seed: number
  numManagers: number
  budget: number
  games: number
  studThreshold: number
  /** How many players have a graded lean feeding the me-seat this run. */
  biasedPlayers: number
}

export interface SimSummary {
  config: SimSummaryConfig
  grade: GradeSummary
  topRosters: ModalRoster[]
  landed: LandedPlayer[]
  distribution: SimDistribution
  /** Per-run grades (kept in-memory for the screen; trimmed before persistence). */
  runGrades: RunGrade[]
}

export interface BuildSimSummaryOptions {
  games?: number
  studThreshold?: number
  /**
   * Measured risk model for grading. Defaults to DEFAULT_RISK_MODEL (real per-player
   * durability + tier bust/breakout from 15 seasons of Sleeper actuals) so
   * concentrated rosters carry the real downside. Pass false to grade on the legacy
   * "every stud plays every game at full projection" basis (comparison/tests).
   */
  risk?: RiskModel | false
}

/** Run the Monte-Carlo sim and grade it into one screen-ready summary. */
export function buildSimSummary(
  input: SimEngineInput,
  opts: BuildSimSummaryOptions = {},
): SimSummary {
  const games = opts.games ?? DEFAULT_REGULAR_SEASON_GAMES
  const studThreshold = opts.studThreshold ?? DEFAULT_STUD_THRESHOLD
  const risk = opts.risk ?? DEFAULT_RISK_MODEL

  const result = runMonteCarlo(input)
  const lineup = starterConfigOf(input.rosterConfig)
  const numManagers = input.numManagers

  const runGrades = result.runs.map(run =>
    gradeRun(run, lineup, numManagers, games, { risk }),
  )
  const grade = summarizeGrades(runGrades, games, numManagers)
  const topRosters = topModalRosters(result.runs, runGrades, lineup, { studThreshold })
  const landed = playersYouLandMost(result.runs)

  return {
    config: {
      runs: result.config.runs,
      seed: result.config.seed,
      numManagers,
      budget: input.budget,
      games,
      studThreshold,
      biasedPlayers: Object.keys(input.myBias ?? {}).length,
    },
    grade,
    topRosters,
    landed,
    distribution: result.distribution,
    runGrades,
  }
}

// ─── Persistence shape (research_runs.results) ───────────────────────────────

/** Discriminator stamped on both strategy_settings and results for sim rows. */
export const SIM_RUN_KIND = 'sim' as const

/** The slim, serializable summary saved to research_runs.results (no per-run detail). */
export interface PersistedSimResults {
  kind: typeof SIM_RUN_KIND
  config: SimSummaryConfig
  grade: GradeSummary
  topRosters: ModalRoster[]
  /** Capped to keep the row small; the long tail of $1 fills adds no signal. */
  landed: LandedPlayer[]
  distribution: SimDistribution
}

/** Trim a full summary to the persisted shape (drops per-run grades, caps landed). */
export function toPersistedSim(summary: SimSummary, landedCap = 40): PersistedSimResults {
  return {
    kind: SIM_RUN_KIND,
    config: summary.config,
    grade: summary.grade,
    topRosters: summary.topRosters,
    landed: summary.landed.slice(0, landedCap),
    distribution: summary.distribution,
  }
}
