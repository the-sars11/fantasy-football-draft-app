/**
 * Dollar Bin selection (LB-3).
 *
 * The bin is Joe's end-game plan for the $1 tier - the moment prices collapse and
 * the room is throwing out singles. It has two groups, and one shared piece of
 * state (the existing star / target - there is NO separate "watch" concept):
 *
 *   1. STARRED - every available player Joe has starred, pinned at the top of the
 *      bin regardless of price, so his watchlist surfaces the instant the draft
 *      hits the dollar tier. Best-first.
 *   2. DARTS   - players Joe has NOT starred that sit in the $1-to-$3 room band AND
 *      carry a real reason to beat that tag (our model sees upside, positive VORP,
 *      or a flagged sleeper). NOT "whoever is highest left." Best dart first, capped.
 *
 * Pure + deterministic - no React, no clock, no randomness. Every descriptor field
 * traces to a real player number (ecrPositionRank / upsideValue / vorp / isSleeper).
 * We never invent a scouting note.
 */

import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { RepricedPlayer } from '@/lib/draft/live-reprice'

/** Room price at or below this (dollars) is "the $1 bin" - a dart candidate. */
export const DOLLAR_BAND = 3

/** Most darts to surface under the starred watchlist. Keeps the bin scannable. */
export const DART_MAX = 6

export interface DollarBinRow {
  id: string
  name: string
  position: Position
  /** true = Joe's star (pinned watchlist); false = a model dart. */
  starred: boolean
  /** Expected tag band, e.g. "$1", "$1 to $2", "$1 to $3". */
  priceLabel: string
  /** Position + expert rank, e.g. "RB38". Empty string when no rank is known. */
  posRank: string
  /** Short, data-derived reason chips, e.g. ["sleeper", "+$4 upside"]. */
  signals: string[]
}

export interface DollarBin {
  starred: DollarBinRow[]
  darts: DollarBinRow[]
}

/** The room price we plan against: repriced room if we have it, else the pre-draft expert price. */
function roomPriceOf(p: Player, rp: RepricedPlayer | undefined): number | undefined {
  if (rp) return rp.room
  if (p.expectedRoomPrice != null) return p.expectedRoomPrice
  if (p.consensusAuctionValue != null) return Math.round(p.consensusAuctionValue)
  return undefined
}

/** "$1" / "$1 to $2" / "$1 to $3" from the plan-against room price. */
export function priceLabel(room: number | undefined): string {
  if (room == null || room <= 1) return '$1'
  if (room <= 2) return '$1 to $2'
  return '$1 to $3'
}

/** "RB38" from the best positional rank we have; "" when we have none. */
function posRankLabel(p: Player): string {
  const rank = p.ecrPositionRank ?? p.positionRankByPoints
  return rank != null ? `${p.position}${rank}` : ''
}

/**
 * Data-derived reason chips for a dart. Order: the strongest single reason first,
 * then a concrete upside number when our model actually sees one. Every chip is a
 * real field - never an invented "if X gets hurt" note.
 */
function dartSignals(p: Player): string[] {
  const out: string[] = []
  if (p.analysis?.isSleeper) out.push('sleeper')
  else if (p.vorp != null && p.vorp > 0) out.push('VORP+')
  else out.push('dart')
  if (p.upsideValue != null && p.upsideValue > 0) out.push(`+$${Math.round(p.upsideValue)} upside`)
  return out
}

/** A dart only earns a spot if our model gives a reason it beats the $1-$3 tag. */
function hasBeatSignal(p: Player): boolean {
  if (p.analysis?.isSleeper) return true
  if (p.upsideValue != null && p.upsideValue > 0) return true
  if (p.vorp != null && p.vorp > 0) return true
  return false
}

/** Rank darts best-first: bigger model upside wins, VORP breaks ties. */
function dartScore(p: Player): number {
  const upside = p.upsideValue != null && p.upsideValue > 0 ? p.upsideValue : 0
  const vorp = p.vorp != null && p.vorp > 0 ? p.vorp : 0
  return upside * 10 + vorp
}

/**
 * Build the two-group Dollar Bin from the live available pool.
 *
 * @param available  currently available, scored players (already draft-filtered).
 * @param repriced   live You/Room reprice by player id (empty before any sale).
 * @param isTarget   the existing star predicate - the ONLY watchlist state.
 */
export function selectDollarBin(
  available: ScoredPlayer[],
  repriced: Map<string, RepricedPlayer>,
  isTarget: (id: string) => boolean,
): DollarBin {
  const starred: DollarBinRow[] = []
  const dartCandidates: { row: DollarBinRow; score: number }[] = []

  for (const sp of available) {
    const p = sp.player
    const rp = repriced.get(p.id)
    const room = roomPriceOf(p, rp)

    if (isTarget(p.id)) {
      // Starred players are pinned no matter the price - this is Joe's watchlist.
      starred.push({
        id: p.id,
        name: p.name,
        position: p.position,
        starred: true,
        priceLabel: priceLabel(room),
        posRank: posRankLabel(p),
        signals: dartSignals(p),
      })
      continue
    }

    // Darts: unstarred, sitting in the $1 bin, with a real reason to beat the tag.
    if (room != null && room <= DOLLAR_BAND && hasBeatSignal(p)) {
      dartCandidates.push({
        score: dartScore(p),
        row: {
          id: p.id,
          name: p.name,
          position: p.position,
          starred: false,
          priceLabel: priceLabel(room),
          posRank: posRankLabel(p),
          signals: dartSignals(p),
        },
      })
    }
  }

  // Starred best-first by combinedScore (available is already sorted, but a star
  // may be re-added from a dart; re-sort to keep the pin order stable and honest).
  const scoreById = new Map(available.map(sp => [sp.player.id, sp.combinedScore]))
  starred.sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0))

  const darts = dartCandidates
    .sort((a, b) => b.score - a.score)
    .slice(0, DART_MAX)
    .map(d => d.row)

  return { starred, darts }
}
