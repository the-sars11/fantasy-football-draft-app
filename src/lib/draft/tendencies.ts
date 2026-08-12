/**
 * Tendency / Exploit Engine (VAL-2)
 *
 * Turns Joe's calibrated league history + the live pick order into concrete
 * exploit signals — where the room is predictable and where the value pockets
 * are. Three layers, all pure and $0 (no network / DB / Claude):
 *
 *   1. POSITION inflation — from the calibrated ledger: WR/TE run HOT (let them
 *      overpay), RB runs COOL (value pocket). `positionExploit()`.
 *   2. OWNER leans — who over-indexes on which position, so you can read a
 *      nomination before the bidding tells you. `ownerExploit()`.
 *   3. LIVE nomination runs — a positional run happening RIGHT NOW in the pick
 *      order inflates the next one at that position. `detectPositionRun()`.
 *
 * `buildExploitSignals()` folds all three into a ranked list the live room can
 * render without clutter.
 */

import type { DraftPick } from './state'
import {
  positionalInflation,
  ownerLean,
  toCalibratedPositionSafe,
  type CalibratedPosition,
  type InflationTag,
} from './league-calibration'

/** Direction of an exploit read from Joe's seat. */
export type ExploitTone = 'advantage' | 'caution' | 'neutral'

export interface ExploitSignal {
  /** Which layer produced this: position inflation, owner lean, or a live run. */
  kind: 'position' | 'owner' | 'run'
  tone: ExploitTone
  /** Short label for a chip (e.g. "RB value pocket"). */
  headline: string
  /** One-line plain-English read. */
  detail: string
  /** 0-100 — how strongly to surface this. Higher = louder. */
  weight: number
  position?: CalibratedPosition
}

// ---------------------------------------------------------------------------
// 1. Position inflation → exploit
// ---------------------------------------------------------------------------

/**
 * Read the room's structural tendency on a position from the calibrated ledger.
 * HOT = the room reliably overpays here (let them). COOL = value pocket (this is
 * where Joe's dollars go furthest). Returns null for uncalibrated (K) positions.
 */
export function positionExploit(position: string): ExploitSignal | null {
  const inf = positionalInflation(position)
  const pos = toCalibratedPositionSafe(position)
  if (!inf || !pos) return null

  const overIndex = Math.round((inf.multiplier - 1) * 100) // +% vs national

  if (inf.tag === 'HOT') {
    return {
      kind: 'position',
      tone: 'caution',
      position: pos,
      headline: `${pos} runs hot`,
      detail: `Room pays ${overIndex > 0 ? '+' : ''}${overIndex}% vs national on ${pos}. Let them overpay; don't chase the last dollar.`,
      weight: inflationWeight(inf.tag, inf.multiplier),
    }
  }
  if (inf.tag === 'COOL') {
    return {
      kind: 'position',
      tone: 'advantage',
      position: pos,
      headline: `${pos} value pocket`,
      detail: `Room underpays ${overIndex}% vs national on ${pos}. Your dollars go furthest here.`,
      weight: inflationWeight(inf.tag, inf.multiplier),
    }
  }
  return {
    kind: 'position',
    tone: 'neutral',
    position: pos,
    headline: `${pos} priced near national`,
    detail: `Room prices ${pos} roughly at national baseline (${inf.multiplier.toFixed(2)}x).`,
    weight: inflationWeight(inf.tag, inf.multiplier),
  }
}

/** Louder the further the multiplier is from 1.0; capped at 100. */
function inflationWeight(tag: InflationTag, mult: number): number {
  if (tag === 'NEUTRAL') return 20
  const dist = Math.abs(mult - 1)
  return Math.min(100, Math.round(40 + dist * 120))
}

// ---------------------------------------------------------------------------
// 2. Owner leans → exploit
// ---------------------------------------------------------------------------

/**
 * A single owner's most reliable positional lean, framed for Joe. HEAVY = they
 * reliably chase this position (expect them in, price accordingly). Returns null
 * for unknown owners or owners with no strong lean.
 */
export function ownerExploit(owner: string): ExploitSignal | null {
  const lean = ownerLean(owner)
  if (!lean || !lean.topLean) return null

  const { position, vsRoom } = lean.topLean
  const overIndex = Math.round((vsRoom - 1) * 100)
  return {
    kind: 'owner',
    tone: 'caution',
    position,
    headline: `${owner}: ${position} heavy`,
    detail: `${owner} spends ${overIndex > 0 ? '+' : ''}${overIndex}% vs the room on ${position} (${lean.yearsPresent}yr). Expect them bidding when a ${position} is up.`,
    weight: Math.min(100, Math.round(40 + Math.abs(vsRoom - 1) * 100)),
  }
}

// ---------------------------------------------------------------------------
// 3. Live nomination-run detection
// ---------------------------------------------------------------------------

export interface PositionRun {
  position: CalibratedPosition
  /** How many of the last `window` picks were this position. */
  count: number
  /** The lookback window actually examined. */
  window: number
  /** count / window. */
  share: number
  /** True once the run is dense enough to move the next price. */
  isRun: boolean
}

/**
 * Detect a nomination/spend RUN on a position in the most recent picks. A run
 * means the shelf at that position is emptying fast, which inflates whoever's up
 * next there — and drains the room's dollars, opening pockets elsewhere.
 *
 * `count` is over the last `lookback` picks (default 8). A run fires at >= 3 of
 * the last `lookback` (or a majority of a short board). Returns isRun=false for
 * uncalibrated positions or too-thin history.
 */
export function detectPositionRun(
  picks: DraftPick[],
  position: string,
  lookback = 8,
): PositionRun | null {
  const pos = toCalibratedPositionSafe(position)
  if (!pos) return null

  const recent = picks.slice(-lookback)
  const window = recent.length
  if (window === 0) {
    return { position: pos, count: 0, window: 0, share: 0, isRun: false }
  }

  const count = recent.filter(
    (p) => toCalibratedPositionSafe(p.position ?? '') === pos,
  ).length
  const share = count / window

  // A run: 3+ in the window, OR a majority when the board is still short.
  const isRun = count >= 3 || (window <= 4 && share >= 0.5 && count >= 2)
  return { position: pos, count, window, share, isRun }
}

/** Live run → exploit signal (only when a run is actually firing). */
export function runExploit(picks: DraftPick[], position: string): ExploitSignal | null {
  const run = detectPositionRun(picks, position)
  if (!run || !run.isRun) return null

  return {
    kind: 'run',
    tone: 'caution',
    position: run.position,
    headline: `${run.position} run live`,
    detail: `${run.count} of the last ${run.window} picks were ${run.position}. Shelf is thinning fast, so the next one bids up. Value is opening at the other positions.`,
    weight: Math.min(100, Math.round(55 + run.share * 45)),
  }
}

// ---------------------------------------------------------------------------
// Aggregate
// ---------------------------------------------------------------------------

export interface ExploitContext {
  /** Position currently on the block (drives position + run signals). */
  position?: string
  /** Owner nominating / likely bidding (drives owner signal). */
  owner?: string
  /** Live pick order, oldest → newest (drives run detection). */
  recentPicks?: DraftPick[]
}

/**
 * Fold all three layers into a de-duplicated, weight-ranked signal list for the
 * live room. Highest-weight first; caller can cap to the top 1-2 to avoid
 * clutter.
 */
export function buildExploitSignals(ctx: ExploitContext): ExploitSignal[] {
  const signals: ExploitSignal[] = []

  if (ctx.position) {
    const p = positionExploit(ctx.position)
    if (p) signals.push(p)
    if (ctx.recentPicks && ctx.recentPicks.length > 0) {
      const r = runExploit(ctx.recentPicks, ctx.position)
      if (r) signals.push(r)
    }
  }
  if (ctx.owner) {
    const o = ownerExploit(ctx.owner)
    if (o) signals.push(o)
  }

  // Neutral position signals are the least useful — drop them when any stronger
  // signal exists so the room only shows something worth acting on.
  const hasActionable = signals.some((s) => s.tone !== 'neutral')
  const filtered = hasActionable ? signals.filter((s) => s.tone !== 'neutral') : signals

  return filtered.sort((a, b) => b.weight - a.weight)
}
