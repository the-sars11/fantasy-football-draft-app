/**
 * League-Calibration runtime (VAL-1.1 / VAL-2)
 *
 * Typed accessors over the committed `league-calibration.json` artifact derived
 * from Joe's real 16-year Nasties auction ledger (see
 * scripts/derive-league-calibration.ts). Everything here is $0, synchronous,
 * and pure — it reads a bundled JSON, no network / DB / Claude.
 *
 * The three things this powers, in Joe's words:
 *   - REALITY  → `expectedRoomPrice(pos, rank)`: what the room actually pays for
 *     "the RB5 / WR3 / TE1", from the per-position price-by-rank curves.
 *   - EXPLOIT  → `positionalInflation(pos)`: WR/TE run HOT, RB runs COOL vs a
 *     national baseline — where the value pockets are.
 *   - READ THE TABLE → `ownerLean(owner)`: who over-indexes on which position.
 */

import calibration from '@/data/league-history/league-calibration.json'

export type CalibratedPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'DEF'

export type InflationTag = 'HOT' | 'COOL' | 'NEUTRAL'
export type OwnerLeanTag = 'HEAVY' | 'LIGHT' | 'NEUTRAL'

export interface PositionInflation {
  sharePct: number
  nationalPct: number
  multiplier: number
  tag: InflationTag
}

export interface OwnerLean {
  yearsPresent: number
  totalSpent: number
  byPos: Record<CalibratedPosition, { sharePct: number; vsRoom: number; lean: OwnerLeanTag }>
  topLean: { position: CalibratedPosition; vsRoom: number } | null
}

interface Calibration {
  era: number[]
  draftsUsed: number
  curves: Record<CalibratedPosition, number[]>
  avgDrafted: Record<CalibratedPosition, number>
  inflation: Record<CalibratedPosition, PositionInflation>
  roomTotalSpentPerYear: number
  ownerLeans: Record<string, OwnerLean>
}

const CAL = calibration as unknown as Calibration

const CALIBRATED_POSITIONS: CalibratedPosition[] = ['QB', 'RB', 'WR', 'TE', 'DEF']

/** Normalise an app position ('DST' → 'DEF'); returns null for uncalibrated (K). */
function toCalibratedPosition(pos: string): CalibratedPosition | null {
  const p = pos === 'DST' ? 'DEF' : (pos ?? '').toUpperCase()
  return (CALIBRATED_POSITIONS as string[]).includes(p) ? (p as CalibratedPosition) : null
}

/**
 * Public position normaliser for consumers (e.g. the tendency engine).
 * 'DST'/'DEF' → 'DEF'; returns null for K or anything uncalibrated.
 */
export function toCalibratedPositionSafe(pos: string): CalibratedPosition | null {
  return toCalibratedPosition(pos)
}

/** Which era years the calibration was derived from (for source transparency). */
export const CALIBRATION_ERA: number[] = CAL.era
export const CALIBRATION_DRAFTS_USED: number = CAL.draftsUsed

/**
 * REALITY: the average $ Joe's room pays for the `rank`-th most expensive player
 * at `position` (1-indexed: rank 1 = the priciest RB that year, etc.).
 *
 * Ranks past the derived curve depth taper linearly toward a $1 floor so deep
 * bench players don't read as free. Returns undefined for K (uncalibrated) or a
 * non-positive rank.
 */
export function expectedRoomPrice(position: string, rank: number): number | undefined {
  const pos = toCalibratedPosition(position)
  if (!pos || !Number.isFinite(rank) || rank < 1) return undefined
  const curve = CAL.curves[pos]
  if (!curve || curve.length === 0) return undefined

  const i = Math.floor(rank) - 1
  if (i < curve.length) return curve[i]

  // Beyond the curve: taper from the last known price toward $1 over ~half the
  // curve depth, then hold the floor.
  const last = curve[curve.length - 1]
  const taperSpan = Math.max(4, Math.round(curve.length / 2))
  const stepsPast = i - (curve.length - 1)
  const tapered = Math.round(last - (last - 1) * (stepsPast / taperSpan))
  return Math.max(1, tapered)
}

/** EXPLOIT: how hot/cold the room runs on a position vs national baseline. */
export function positionalInflation(position: string): PositionInflation | undefined {
  const pos = toCalibratedPosition(position)
  if (!pos) return undefined
  return CAL.inflation[pos]
}

/** All positional inflation rows (for a room-wide exploit summary). */
export function allPositionalInflation(): Record<CalibratedPosition, PositionInflation> {
  return CAL.inflation
}

/** READ THE TABLE: a single owner's positional leans, or null if unknown. */
export function ownerLean(owner: string): OwnerLean | null {
  if (!owner) return null
  const key = owner.trim()
  return CAL.ownerLeans[key] ?? null
}

/** Every owner's leans (for building live per-manager exploit hints). */
export function allOwnerLeans(): Record<string, OwnerLean> {
  return CAL.ownerLeans
}

/** The full curve for a position (e.g. to render a price ladder). */
export function positionCurve(position: string): number[] | undefined {
  const pos = toCalibratedPosition(position)
  if (!pos) return undefined
  return CAL.curves[pos]
}
