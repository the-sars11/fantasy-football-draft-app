/**
 * adaptive-guidance.ts — R9 Part 2: live adaptive strategy re-fit.
 *
 * The prep engine (research/strategy/generate.ts) enumerates anchor strategies
 * from the FULL $200 board before the draft. This module does the same thing
 * DURING the draft, off the LIVE state: it reads Joe's remaining budget, the
 * slots he still has to fill, and the players still on the board, then re-runs
 * the SAME anchor generator so the recommended shape reflects what is actually
 * left. It also detects positional runs ("you missed the RB run") so the pivot
 * line can say where the value moved.
 *
 * The re-fit is the point of the task: as the RB anchors drain, hero-RB stops
 * being generable (no elite RB left on the board), so the generator naturally
 * pivots the recommendation to wherever anchors still exist (WR value + one late
 * RB, etc.). Nothing here is hardcoded to a run; the board decides.
 *
 * Reuses (does not re-invent):
 *   - analyzeBudgetStrategy (auction-advisor) for ahead/behind/on_track pace.
 *   - buildSlotsRemaining (solver-bridge) for Joe's remaining slots with FLEX.
 *   - generateAnchorStrategies (strategy/generate) for the actual re-fit.
 *
 * Pure and $0 - no React, no network, no Claude. Deterministic.
 * Copy rule (Joe): plain English, NO em/en dashes in any surfaced string.
 */

import type { Player } from '@/lib/players/types'
import type { DraftState, ManagerState } from './state'
import { getDraftedPlayerNames } from './state'
import { analyzeBudgetStrategy, type BudgetAnalysis } from './auction-advisor'
import { buildSlotsRemaining } from './solver-bridge'
import {
  generateAnchorStrategies,
  type PricedBoardPlayer,
  type AnchorSlots,
} from '@/lib/research/strategy/generate'
import type { StrategyProposal } from '@/lib/research/strategy/research'

/** Positions the run detector watches (K excluded: no-kicker league). */
const RUN_POSITIONS = ['RB', 'WR', 'TE', 'QB'] as const
type RunPosition = (typeof RUN_POSITIONS)[number]

/** Positions that can hold a roster slot / anchor (K excluded). */
const BOARD_POSITIONS: PricedBoardPlayer['position'][] = ['QB', 'RB', 'WR', 'TE', 'DEF']

/** Size of the "anchor tier" per position that a run drains. */
const ANCHOR_TIER_SIZE = 6
/** Fraction of the anchor tier that must be gone to call it a run. */
const RUN_DRAIN_THRESHOLD = 0.6

/** A positional run detected in the live draft. */
export interface PositionRun {
  position: RunPosition
  /** How many of the top-tier players at this position existed to begin with. */
  tierSize: number
  /** How many of that tier are now drafted. */
  tierDrafted: number
  /** How many of that tier are still on the board. */
  tierRemaining: number
  /** tierDrafted / tierSize, 0..1. */
  drainPct: number
  /** True when Joe still has an open slot need at this position. */
  affectsMe: boolean
  severity: 'hot' | 'warm' | 'info'
  /** Plain-English, no-dashes line for the live card. */
  message: string
}

/** The full live guidance payload. */
export interface AdaptiveGuidance {
  /** Auction only; snake returns applicable=false with empty guidance. */
  applicable: boolean
  budgetRemaining: number
  /** Reused ahead/behind/on_track pace, or null when unavailable. */
  pace: BudgetAnalysis | null
  /** Detected positional runs, most severe first. */
  runs: PositionRun[]
  /** Best live re-fit anchor strategy given what is left, or null if none. */
  recommended: StrategyProposal | null
  /** Other completable shapes the remaining board still supports. */
  alternatives: StrategyProposal[]
  /** Joe's open starter needs by position (QB/RB/WR/TE/DEF). */
  openNeeds: Record<string, number>
  /** One synthesized line telling Joe what to do next. */
  pivot: string
}

const EMPTY_GUIDANCE: AdaptiveGuidance = {
  applicable: false,
  budgetRemaining: 0,
  pace: null,
  runs: [],
  recommended: null,
  alternatives: [],
  openNeeds: {},
  pivot: '',
}

/** Genuine worth for ranking, mirroring solver-bridge's board pricing. */
function playerCeiling(p: Player): number {
  return Math.max(1, Math.round(p.ceilingValue ?? p.consensusAuctionValue ?? 1))
}

/** What the room pays, mirroring solver-bridge's board pricing. */
function playerRoomPrice(p: Player): number {
  return Math.max(1, Math.round(p.expectedRoomPrice ?? p.consensusAuctionValue ?? 1))
}

/**
 * Map the undrafted pool to the priced board the anchor generator consumes.
 * Kickers are dropped. posRank is the live within-position rank (informational
 * for the live path; the generator prices off ceiling/expectedCost directly).
 */
export function priceLiveBoard(
  players: Player[],
  draftedNames: Set<string>,
): PricedBoardPlayer[] {
  const board: PricedBoardPlayer[] = []

  for (const pos of BOARD_POSITIONS) {
    const undrafted = players
      .filter((p) => p.position === pos && !draftedNames.has(p.name.toLowerCase()))
      .sort((a, b) => a.consensusRank - b.consensusRank)

    undrafted.forEach((p, i) => {
      board.push({
        id: p.id,
        name: p.name,
        position: pos,
        ceiling: playerCeiling(p),
        expectedCost: playerRoomPrice(p),
        posRank: i + 1,
      })
    })
  }

  return board
}

/** Joe's filled count at a position from his roster_count (uppercased keys). */
function filledAt(mgr: ManagerState, position: string): number {
  return mgr.roster_count[position.toUpperCase()] ?? 0
}

/** Required starters at a position from the league roster config. */
function requiredAt(state: DraftState, position: string): number {
  const key = position.toUpperCase() === 'DEF' ? 'dst' : position.toLowerCase()
  const slots = state.roster_slots as Record<string, number>
  return slots[key] ?? 0
}

/**
 * Detect positional runs: for each watched position, how much of its top anchor
 * tier is gone, and whether Joe still needs that position. Pure and testable.
 */
export function detectPositionRuns(
  state: DraftState,
  mgr: ManagerState,
  players: Player[],
  draftedNames: Set<string>,
): PositionRun[] {
  const runs: PositionRun[] = []

  for (const pos of RUN_POSITIONS) {
    // The anchor tier = the top-N players at this position by genuine worth,
    // across the WHOLE pool (drafted + not), so drain is measured against the
    // original tier, not a shrinking board.
    const tier = players
      .filter((p) => p.position === pos)
      .sort((a, b) => playerCeiling(b) - playerCeiling(a))
      .slice(0, ANCHOR_TIER_SIZE)

    if (tier.length === 0) continue

    const tierDrafted = tier.filter((p) => draftedNames.has(p.name.toLowerCase())).length
    const drainPct = tierDrafted / tier.length
    if (drainPct < RUN_DRAIN_THRESHOLD) continue

    const need = Math.max(0, requiredAt(state, pos) - filledAt(mgr, pos))
    const affectsMe = need > 0

    const severity: PositionRun['severity'] = !affectsMe
      ? 'info'
      : drainPct >= 0.75
        ? 'hot'
        : 'warm'

    const tierRemaining = tier.length - tierDrafted
    const message = affectsMe
      ? `${pos} run: ${tierDrafted} of the top ${tier.length} ${pos}s are gone and you still need ${need}. Pivot to where value remains.`
      : `${pos} run: ${tierDrafted} of the top ${tier.length} ${pos}s are gone, but your ${pos} is set.`

    runs.push({
      position: pos,
      tierSize: tier.length,
      tierDrafted,
      tierRemaining,
      drainPct: Math.round(drainPct * 100) / 100,
      affectsMe,
      severity,
      message,
    })
  }

  const rank = { hot: 0, warm: 1, info: 2 }
  return runs.sort((a, b) => rank[a.severity] - rank[b.severity] || b.drainPct - a.drainPct)
}

/** Joe's open starter needs by position (QB/RB/WR/TE/DEF), only where > 0. */
function openStarterNeeds(state: DraftState, mgr: ManagerState): Record<string, number> {
  const needs: Record<string, number> = {}
  for (const pos of BOARD_POSITIONS) {
    const need = Math.max(0, requiredAt(state, pos) - filledAt(mgr, pos))
    if (need > 0) needs[pos] = need
  }
  return needs
}

/** Convert solver-bridge SlotsRemaining into the generator's AnchorSlots. */
function toAnchorSlots(s: ReturnType<typeof buildSlotsRemaining>): AnchorSlots {
  return {
    qb: s.qb,
    rb: s.rb,
    wr: s.wr,
    te: s.te,
    flex: s.flex,
    dst: s.dst,
    bench: s.bench,
  }
}

function synthesizePivot(
  recommended: StrategyProposal | null,
  affectsMeRuns: PositionRun[],
): string {
  if (!recommended) {
    return 'Budget or board is thin. Fill your remaining slots with value at $1 to $3.'
  }

  const topTargets = recommended.key_targets.slice(0, 2).filter(Boolean)
  const targetPhrase = topTargets.length > 0 ? topTargets.join(' and ') : 'the best remaining anchor'

  if (affectsMeRuns.length > 0) {
    const runPos = affectsMeRuns.map((r) => r.position)
    const runPhrase =
      runPos.length === 1
        ? `the ${runPos[0]} run`
        : `${runPos.slice(0, -1).join(', ')} and ${runPos[runPos.length - 1]} runs`
    return `You are behind ${runPhrase}. Best remaining build is ${recommended.name}: pay up for ${targetPhrase}, then fill the rest at value.`
  }

  const three = recommended.key_targets.slice(0, 3).filter(Boolean)
  const listed = three.length > 0 ? three.join(', ') : 'the top remaining anchors'
  return `On plan. ${recommended.name} still fits your budget: target ${listed}.`
}

/**
 * R9 live entry point. Re-fits the anchor strategies to the current draft state
 * and returns actionable guidance. Auction only.
 */
export function computeAdaptiveGuidance(
  state: DraftState,
  managerName: string,
  players: Player[],
): AdaptiveGuidance {
  if (state.format !== 'auction') return EMPTY_GUIDANCE

  const mgr = state.managers[managerName]
  if (!mgr) return { ...EMPTY_GUIDANCE, applicable: true }

  const draftedNames = getDraftedPlayerNames(state)
  const budgetRemaining = mgr.budget_remaining ?? 0

  // Re-fit: price the LIVE board, take Joe's remaining slots, re-run the same
  // anchor generator the prep engine uses. As anchors drain, shapes that the
  // board can no longer support simply stop appearing.
  const board = priceLiveBoard(players, draftedNames)
  const slots = toAnchorSlots(buildSlotsRemaining(state.roster_slots, mgr.picks))
  const strategies = generateAnchorStrategies({ board, slots, budget: budgetRemaining })

  const recommended = strategies[0] ?? null
  const alternatives = strategies.slice(1)

  const runs = detectPositionRuns(state, mgr, players, draftedNames)
  const affectsMeRuns = runs.filter((r) => r.affectsMe)

  return {
    applicable: true,
    budgetRemaining,
    pace: analyzeBudgetStrategy(state, managerName),
    runs,
    recommended,
    alternatives,
    openNeeds: openStarterNeeds(state, mgr),
    pivot: synthesizePivot(recommended, affectsMeRuns),
  }
}
