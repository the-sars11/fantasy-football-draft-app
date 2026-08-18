/**
 * solver-bridge.ts — R5: maps live draft state into the roster solver.
 *
 * The R4 solver (roster-solver.ts) is a pure, app-agnostic module: it speaks
 * BoardPlayer / SlotsRemaining / SolverInput and knows nothing about the live
 * draft's Player, DraftPick, or RosterSlots shapes. This bridge is the single
 * seam that translates the live world into solver inputs so the LIVE max-bid can
 * reflect roster-completion math (RV-1), not just wallet math.
 *
 * Everything here is pure and $0 — no React, no network, no Claude. Replacement
 * costs are a flat $1 per empty slot: Joe's roster-completion reserve is "keep at
 * least a dollar for every slot I still have to fill".
 *
 * Copy rule (Joe): plain English, NO em/en dashes anywhere in surfaced strings.
 */

import type { Player } from '@/lib/players/types'
import type { RosterSlots } from '@/lib/supabase/database.types'
import {
  computeRosterConstrainedMaxBid,
  type BoardPlayer,
  type SlotsRemaining,
  type ReplacementCosts,
  type SolverInput,
  type RosterConstrainedMaxBid,
} from './roster-solver'
import { buildMyBiasFromTags, type GradedTagLike } from './sim-results'

/** Flat $1 reserve per empty slot — the roster-completion floor. */
const FLAT_REPLACEMENT: ReplacementCosts = {
  qb: 1, rb: 1, wr: 1, te: 1, dst: 1, bench: 1,
}

/** Minimal pick shape the bridge needs (DraftPick is a superset). */
export interface FilledPick {
  position?: string
}

type DedicatedKey = 'qb' | 'rb' | 'wr' | 'te' | 'dst'

// Pick position strings may arrive as 'DEF' (Player type) or 'DST' (DB type).
const POSITION_TO_DEDICATED: Record<string, DedicatedKey> = {
  QB: 'qb', RB: 'rb', WR: 'wr', TE: 'te', DEF: 'dst', DST: 'dst',
}
const FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])

/**
 * Joe's remaining unfilled slots after his picks, with FLEX contention modeled.
 * Each pick fills its dedicated slot first; RB/WR/TE overflow beyond the
 * dedicated slots spills into FLEX; anything past that lands on the bench. IR
 * folds into bench (both fill at $1). K is a no-op (no-kicker league).
 */
export function buildSlotsRemaining(
  config: RosterSlots,
  picks: FilledPick[],
): SlotsRemaining {
  const remaining: SlotsRemaining = {
    qb: config.qb ?? 0,
    rb: config.rb ?? 0,
    wr: config.wr ?? 0,
    te: config.te ?? 0,
    flex: config.flex ?? 0,
    dst: config.dst ?? 0,
    bench: (config.bench ?? 0) + (config.ir ?? 0),
  }

  for (const pick of picks) {
    const pos = (pick.position ?? '').toUpperCase()
    const dedicated = POSITION_TO_DEDICATED[pos]

    if (dedicated && remaining[dedicated] > 0) {
      remaining[dedicated] -= 1
    } else if (FLEX_ELIGIBLE.has(pos) && remaining.flex > 0) {
      remaining.flex -= 1
    } else if (remaining.bench > 0) {
      remaining.bench -= 1
    }
    // else: roster already over-full for this pick — nothing left to decrement.
  }

  return remaining
}

/**
 * Undrafted players mapped to solver BoardPlayers. Kickers are dropped
 * (no-kicker league). expectedCost = expectedRoomPrice ?? consensusAuctionValue;
 * ceiling = ceilingValue ?? consensusAuctionValue. Both floored at $1.
 */
export function buildBoardPlayers(
  players: Player[],
  draftedNames: Set<string>,
): BoardPlayer[] {
  const board: BoardPlayer[] = []
  for (const p of players) {
    if (p.position === 'K') continue
    if (draftedNames.has(p.name.toLowerCase())) continue
    const expectedCost = p.expectedRoomPrice ?? p.consensusAuctionValue ?? 1
    const ceiling = p.ceilingValue ?? p.consensusAuctionValue ?? 1
    board.push({
      id: p.id,
      name: p.name,
      // K already filtered; remaining positions are all BoardPlayer-valid.
      position: p.position as BoardPlayer['position'],
      expectedCost: Math.max(1, Math.round(expectedCost)),
      ceiling: Math.max(1, Math.round(ceiling)),
      // Real season-points projection for R10b grading (0 when unknown).
      projectedPoints: Math.max(0, p.projectedPoints ?? p.projections?.points ?? 0),
    })
  }
  return board
}

/** Assemble a SolverInput from the live draft world. */
export function buildSolverInput(args: {
  budgetRemaining: number
  rosterConfig: RosterSlots
  myPicks: FilledPick[]
  players: Player[]
  draftedNames: Set<string>
  /** DEC-1 (BIAS): Joe's graded target/avoid tags, keyed by player id. */
  userTagsMap?: Record<string, GradedTagLike>
}): SolverInput {
  return {
    budgetRemaining: Math.max(0, Math.round(args.budgetRemaining)),
    slotsRemaining: buildSlotsRemaining(args.rosterConfig, args.myPicks),
    availablePlayers: buildBoardPlayers(args.players, args.draftedNames),
    replacementCosts: FLAT_REPLACEMENT,
    minPerSlot: 1,
    bias: args.userTagsMap ? buildMyBiasFromTags(args.userTagsMap) : undefined,
  }
}

/** Per-player roster-constrained max-bid plus a Joe-voice explanation. */
export interface RosterMaxBidEntry {
  /** Most Joe can bid while still affording the best AFFORDABLE rest-of-roster. */
  maxBid: number
  /** false when the player has no slot, or budget cannot complete the roster. */
  feasible: boolean
  /** Plain-English, no-dashes constraint line for the on-block card. */
  note: string
}

const SLOT_WORD: Record<string, string> = {
  QB: 'QB', RB: 'RB', WR: 'WR', TE: 'TE', DST: 'DST', FLEX: 'FLEX', BENCH: 'bench',
}
const SLOT_ORDER = ['QB', 'RB', 'WR', 'TE', 'DST', 'FLEX', 'BENCH'] as const

function humanJoin(parts: string[]): string {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
}

/**
 * Turn a solver result into Joe's live-room line, e.g.
 * "More than $24 and you cannot fill QB, 2 FLEX and 4 bench."
 * No em/en dashes (app copy rule).
 */
export function describeRosterConstraint(
  advice: RosterConstrainedMaxBid,
  player: BoardPlayer,
): string {
  // BUG-007 case: nowhere to put this player.
  if (!advice.feasible && advice.bestRestOfRoster.length === 0) {
    return `No open slot for ${player.position} on your roster.`
  }

  const counts: Record<string, number> = {}
  for (const a of advice.bestRestOfRoster) {
    counts[a.slotType] = (counts[a.slotType] ?? 0) + 1
  }

  const parts = SLOT_ORDER.filter(s => (counts[s] ?? 0) > 0).map(s => {
    const n = counts[s]
    const word = SLOT_WORD[s]
    return n > 1 ? `${n} ${word}` : word
  })

  if (parts.length === 0) {
    return `This is your last roster slot. You can bid up to $${advice.maxBid}.`
  }

  return `More than $${advice.maxBid} and you cannot fill ${humanJoin(parts)}.`
}

/**
 * Roster-constrained max-bid for every undrafted player on the board, keyed by
 * lowercased name (matching maxBidAdviceMap's keying in the live client).
 */
export function computeRosterMaxBidMap(
  input: SolverInput,
): Map<string, RosterMaxBidEntry> {
  const map = new Map<string, RosterMaxBidEntry>()
  for (const bp of input.availablePlayers) {
    const advice = computeRosterConstrainedMaxBid(bp, input)
    map.set(bp.name.toLowerCase(), {
      maxBid: advice.maxBid,
      feasible: advice.feasible,
      note: describeRosterConstraint(advice, bp),
    })
  }
  return map
}
