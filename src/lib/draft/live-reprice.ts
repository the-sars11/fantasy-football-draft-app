/**
 * live-reprice.ts - the core dynamic action base. Reprice every available player's
 * ROOM price and YOUR target live, off the two drivers Joe named:
 *
 *   1. What the draft has done  -> market inflation moves the ROOM price only.
 *      If the league overpays RB, RB room prices rise; if WR goes soft, WR room
 *      prices fall. Joe's worth of the player does not change because the room is
 *      dumb - only the price he'd have to beat changes.
 *
 *   2. Joe's current roster      -> roster need moves YOUR target only.
 *      A position he still must fill holds/raises his target; a position he has
 *      already filled drops it (he won't chase a slot he doesn't need). This never
 *      touches the room price - it is his willingness, not the market's.
 *
 * pocket = you - room. Positive = a value pocket: the (inflation-adjusted) room
 * price sits below what this player is worth to Joe -> a player to target. Negative
 * of any size means the room is at/over his number -> a tax, let him go.
 *
 * Everything here is pure arithmetic on numbers the caller supplies (baseline room,
 * baseline target, inflation map, open-slot counts, solvency cap). No data is
 * invented; the wiring layer joins players -> baselines -> draft state.
 *
 * Pure + deterministic -> unit-tested in live-reprice.test.ts.
 */

import type { Position } from '@/lib/players/types'
import type { PositionInflation } from './market-inflation'

/** A value gap of at least this many dollars is a real POCKET / TAX, not rounding. */
export const POCKET_MIN = 4

/** Need multiplier when Joe has already filled every slot this position can fill. */
export const NEED_FILLED_FACTOR = 0.55
/** Extra target lean per open slot beyond the first (capped). */
export const NEED_STEP = 0.08
/** Cap on the total upward need lean, so a run on his need never over-inflates. */
export const NEED_MAX_LEAN = 0.25

export interface PlayerRepriceInput {
  id: string
  position: Position
  /** Pre-draft expectedRoomPrice - the number Joe bids against. */
  baselineRoom: number
  /** Pre-draft target worth (value-range base / expert-adjusted value). */
  baselineTarget: number
}

export interface RepriceContext {
  /** Per-position inflation from computeMarketInflation. */
  inflation: Record<Position, PositionInflation>
  /**
   * How many of Joe's still-open roster slots each position can fill right now,
   * counting the FLEX share for RB/WR/TE. 0 = filled, don't chase.
   */
  openSlotsByPosition: Record<Position, number>
  /** Solvency cap from getMaxBid - Joe cannot target above what he can afford. */
  maxBid: number
}

export interface RepricedPlayer {
  id: string
  /** Inflation-adjusted room price (what Joe must beat). */
  room: number
  /** Roster-need-adjusted target, capped by solvency (Joe's number). */
  you: number
  /** you - room. Positive = value pocket in Joe's favor. */
  pocket: number
  /** room - baselineRoom (how far market inflation moved the room price). */
  roomDelta: number
  /** you - baselineTarget (how far roster need moved Joe's target). */
  youDelta: number
  /** A real value pocket to target (pocket >= POCKET_MIN). */
  isPocket: boolean
  /** The room is at/over Joe's number by a real margin - a tax, let him go. */
  isTax: boolean
}

/**
 * Roster-need multiplier on Joe's target. Filled position -> soft fade (he might
 * still take a falling value, so not zero). One open slot -> neutral. Multiple
 * open slots at a position -> a modest, capped lean up (he needs bodies there).
 */
export function needMultiplier(openSlots: number): number {
  if (openSlots <= 0) return NEED_FILLED_FACTOR
  if (openSlots === 1) return 1
  return 1 + Math.min(NEED_MAX_LEAN, NEED_STEP * (openSlots - 1))
}

/** Reprice a single player against the live draft context. */
export function repricePlayer(p: PlayerRepriceInput, ctx: RepriceContext): RepricedPlayer {
  const posInflation = ctx.inflation[p.position]?.multiplier ?? 1
  const room = Math.max(1, Math.round(p.baselineRoom * posInflation))

  const openSlots = ctx.openSlotsByPosition[p.position] ?? 0
  const needTarget = p.baselineTarget * needMultiplier(openSlots)
  const you = Math.max(1, Math.min(Math.round(needTarget), ctx.maxBid))

  const pocket = you - room

  return {
    id: p.id,
    room,
    you,
    pocket,
    roomDelta: room - Math.round(p.baselineRoom),
    youDelta: you - Math.round(p.baselineTarget),
    isPocket: pocket >= POCKET_MIN,
    isTax: pocket <= -POCKET_MIN,
  }
}

/** Reprice a whole board. */
export function repriceBoard(
  players: PlayerRepriceInput[],
  ctx: RepriceContext,
): RepricedPlayer[] {
  return players.map(p => repricePlayer(p, ctx))
}
