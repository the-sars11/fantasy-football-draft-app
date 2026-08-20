/**
 * league-opponents.ts — LR-1 league-replication bridge
 *
 * Turns the committed Nasties calibration (per-owner positional leans) into the
 * `OpponentProfile[]` the Monte-Carlo sim consumes, so the simulated room drafts
 * like the real league instead of a generic national-ceiling bidder pool.
 *
 * Pure + $0: reads the bundled calibration accessors only. No network / DB / Claude.
 * The engine (sim-engine.ts) stays free of any calibration dependency — this file
 * is the only seam between the ledger and the sim.
 *
 * Model (deliberate, faithful to the ledger):
 *   - Each opponent seat is one real owner (excluding the me-owner).
 *   - That owner bids off the ROOM price for the player (BoardPlayer.expectedCost,
 *     which is the historical expectedRoomPrice for the player's positional rank)
 *     multiplied by the owner's `vsRoom` spend-share for that position. vsRoom is
 *     centered ~1.0: an owner who historically pours share into WR (>1) pays up
 *     for WRs and lands more of them; one who lays off a position (<1) lets it go.
 *   - The room-wide inflation is already baked into expectedRoomPrice, and vsRoom
 *     is measured RELATIVE to the room, so expectedCost × vsRoom reconstructs what
 *     that specific owner actually pays — no double-counting.
 */

import { allOwnerLeans, type CalibratedPosition } from './league-calibration'
import type { BoardPlayer } from './roster-solver'
import type { OpponentProfile } from './sim-engine'

const POSITIONS: BoardPlayer['position'][] = ['QB', 'RB', 'WR', 'TE', 'DEF']

/**
 * Guard rails on the per-position lean so a sparse-sample owner (e.g. someone who
 * never once bought a TE, vsRoom ~0.08) still bids a sane-but-tiny amount rather
 * than an absurd one, and no owner is inflated past a hard ceiling.
 */
const MIN_LEAN = 0.1
const MAX_LEAN = 2.5

export interface BuildOpponentProfilesOptions {
  /** Number of opponent seats to fill (typically numManagers − 1). */
  count: number
  /** Owner name occupying the me-seat, excluded from opponents. Default 'Rasar'. */
  meOwner?: string
  /**
   * Explicit opponent owner order (the real current league, if known). When
   * omitted, all non-me owners are used, most-established first (yearsPresent then
   * totalSpent). If fewer owners than seats, the list cycles so every seat is filled.
   */
  ownerOrder?: string[]
}

export interface BuiltOpponentProfiles {
  profiles: OpponentProfile[]
  /** Owner name assigned to each opponent seat, in order (for report transparency). */
  ownerOrder: string[]
}

/** Clamp one lean multiplier into the sane band, defaulting missing/invalid to 1.0. */
function safeLean(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) return 1
  return Math.min(MAX_LEAN, Math.max(MIN_LEAN, v))
}

/**
 * Build `count` opponent profiles from the real ledger. Deterministic: same
 * calibration + same options → identical profiles (no RNG).
 */
export function buildOpponentProfiles(
  opts: BuildOpponentProfilesOptions,
): BuiltOpponentProfiles {
  const meOwner = (opts.meOwner ?? 'Rasar').trim()
  const leans = allOwnerLeans()

  const owners =
    opts.ownerOrder ??
    Object.keys(leans)
      .filter(name => name.trim() !== meOwner)
      .sort((a, b) => {
        const la = leans[a]
        const lb = leans[b]
        return (
          (lb.yearsPresent - la.yearsPresent) ||
          (lb.totalSpent - la.totalSpent) ||
          a.localeCompare(b)
        )
      })

  const profiles: OpponentProfile[] = []
  const assigned: string[] = []

  for (let i = 0; i < opts.count; i++) {
    // Cycle the owner list if the league has more opponent seats than known owners.
    const name = owners.length > 0 ? owners[i % owners.length] : `Generic ${i + 1}`
    const lean = leans[name]
    const leanByPos = {} as Record<BoardPlayer['position'], number>
    for (const pos of POSITIONS) {
      leanByPos[pos] = safeLean(lean?.byPos?.[pos as CalibratedPosition]?.vsRoom)
    }
    profiles.push({ name, leanByPos })
    assigned.push(name)
  }

  return { profiles, ownerOrder: assigned }
}
