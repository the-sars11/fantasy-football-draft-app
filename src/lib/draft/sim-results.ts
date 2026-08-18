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
  type SimDistribution,
} from './sim-engine'
import {
  starterConfigOf,
  gradeRun,
  summarizeGrades,
  topModalRosters,
  playersYouLandMost,
  DEFAULT_STUD_THRESHOLD,
  type GradeSummary,
  type ModalRoster,
  type LandedPlayer,
  type RunGrade,
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
}

/** Run the Monte-Carlo sim and grade it into one screen-ready summary. */
export function buildSimSummary(
  input: SimEngineInput,
  opts: BuildSimSummaryOptions = {},
): SimSummary {
  const games = opts.games ?? DEFAULT_REGULAR_SEASON_GAMES
  const studThreshold = opts.studThreshold ?? DEFAULT_STUD_THRESHOLD

  const result = runMonteCarlo(input)
  const lineup = starterConfigOf(input.rosterConfig)
  const numManagers = input.numManagers

  const runGrades = result.runs.map(run =>
    gradeRun(run, lineup, numManagers, games),
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
