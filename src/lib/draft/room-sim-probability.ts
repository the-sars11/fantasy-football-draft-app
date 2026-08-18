/**
 * room-sim-probability.ts — D6b-2: real Monte-Carlo land probability for the
 * player on the block, wired from live room state into the deterministic Read.
 *
 * DEC-2b (READ ENGINE = DETERMINISTIC, no hallucination): the sim% surfaced on
 * the on-block card is a REAL fraction of `runMonteCarlo` runs where the me-seat
 * ends the draft holding this player. It is never a fabricated number. Same
 * inputs + same seed => byte-identical result (the engine's determinism clause).
 *
 * Everything here is pure, $0, synchronous — no React, no network, no Claude.
 *
 * MODELING NOTE (deliberate approximation, in scope for the wiring step):
 * The R10a engine (`sim-engine.ts`) runs a full auction from an EMPTY board with
 * ONE uniform budget and ONE roster shape for all seats. It has no per-manager
 * initial-state support. So "from here" is modeled symmetrically: the board is
 * the CURRENT undrafted pool (picks already made are gone), and every seat is
 * given the me-seat's REMAINING roster shape and REMAINING budget. This captures
 * what actually drives a land probability — positional scarcity on the live board
 * and how contested the player is at the resources left — without inventing a
 * number. A true per-seat-state sim (each opponent's own budget/filled slots)
 * would require extending the engine and is a separate step, not this one.
 */

import type { Player } from '@/lib/players/types'
import type { RosterSlots } from '@/lib/supabase/database.types'
import { buildBoardPlayers, buildSlotsRemaining, type FilledPick } from './solver-bridge'
import { runMonteCarlo, type SimRosterConfig } from './sim-engine'

/**
 * Monte-Carlo runs for the LIVE land probability. Picked after the latency check
 * in room-sim-probability.test.ts: N seeded full-auction runs over the remaining
 * board resolve well under the nomination clock, and this runs once per
 * nomination (memoized), not per render. Enough runs for a stable percentage,
 * few enough to stay snappy on the render thread.
 */
export const LAND_PROB_RUNS = 16

/**
 * Hard ceiling on board size handed to the engine, as a multiple of total
 * roster demand. Players below the deepest slot any manager could fill never get
 * bought before rosters fill, so trimming the tail changes nothing but bounds the
 * worst-case (early-draft) latency. The on-block player is always kept.
 */
const BOARD_MARGIN = 12

export interface LandProbabilityInput {
  /** The player currently up for auction. */
  onBlockPlayer: Player
  /** Undrafted, scored pool (the room's `available` players). */
  availablePlayers: Player[]
  /** Lower-cased drafted names, to build the board from live state. */
  draftedNames: Set<string>
  /** League roster shape (full slots). */
  rosterSlots: RosterSlots
  /** The me-seat's own picks so far (drives remaining slots). */
  myPicks: FilledPick[]
  /** Number of managers in the league (Nasties = 12). */
  numManagers: number
  /** Per-seat auction budget for the "from-here" sim (me-seat remaining). */
  budget: number
  /** Monte-Carlo runs. Defaults to LAND_PROB_RUNS. */
  runs?: number
  /** Base RNG seed. Fixed default keeps the displayed % deterministic. */
  seed?: number
}

export interface LandProbabilityResult {
  /** Fraction of runs the me-seat won the on-block player, in [0, 1]. */
  probability: number
  /** Runs actually simulated. */
  runs: number
  /** Runs in which the me-seat ended with the player. */
  hits: number
}

/** Sum of a manager's unfilled slots. */
function openSlots(config: SimRosterConfig): number {
  return (
    config.qb + config.rb + config.wr + config.te + config.flex + config.dst + config.bench
  )
}

/**
 * Compute the real Monte-Carlo land probability for the on-block player from live
 * room state. Returns null when there is no meaningful signal to show (empty
 * board, on-block player not on the board, no open slots, or no managers) so the
 * caller can simply hide the chip rather than render a fake 0%.
 */
export function computeLandProbability(
  input: LandProbabilityInput,
): LandProbabilityResult | null {
  const {
    onBlockPlayer,
    availablePlayers,
    draftedNames,
    rosterSlots,
    myPicks,
    numManagers,
    budget,
  } = input

  if (numManagers < 1 || budget < 1) return null

  // Ensure the on-block player is in the pool the board is built from.
  const pool = availablePlayers.some(p => p.id === onBlockPlayer.id)
    ? availablePlayers
    : [onBlockPlayer, ...availablePlayers]

  let board = buildBoardPlayers(pool, draftedNames)
  const onBlock = board.find(b => b.id === onBlockPlayer.id)
  if (!onBlock || board.length === 0) return null

  // Me-seat remaining slots become the symmetric roster shape (see header note).
  const mySlots = buildSlotsRemaining(rosterSlots, myPicks)
  const rosterConfig: SimRosterConfig = {
    qb: mySlots.qb,
    rb: mySlots.rb,
    wr: mySlots.wr,
    te: mySlots.te,
    flex: mySlots.flex,
    dst: mySlots.dst,
    bench: mySlots.bench,
  }
  const slotsOpen = openSlots(rosterConfig)
  if (slotsOpen <= 0) return null // roster already full — nothing lands

  // Latency cap: keep the top-by-ceiling players covering total roster demand
  // plus a margin. The tail never sells before rosters fill, so this is lossless
  // for the land probability while bounding the early-draft worst case.
  const cap = numManagers * slotsOpen + BOARD_MARGIN
  if (board.length > cap) {
    const trimmed = [...board]
      .sort((a, b) => b.ceiling - a.ceiling)
      .slice(0, cap)
    if (!trimmed.some(b => b.id === onBlock.id)) trimmed.push(onBlock)
    board = trimmed
  }

  const runs = input.runs ?? LAND_PROB_RUNS
  const seed = input.seed ?? 1

  const result = runMonteCarlo({
    board,
    rosterConfig,
    numManagers,
    budget,
    runs,
    seed,
    myManagerIndex: 0,
  })

  let hits = 0
  for (const run of result.runs) {
    if (run.myRoster.players.some(pl => pl.id === onBlock.id)) hits++
  }
  const total = result.runs.length || 1

  return { probability: hits / total, runs: result.runs.length, hits }
}
