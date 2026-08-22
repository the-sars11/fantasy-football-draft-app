import type { Player } from './types'

/**
 * Impute missing season projections for draftable players whose scoring feed
 * came back null/0 in the offseason (Sleeper season projections empty, ESPN
 * fuzzy match dropped them). Affects elite players -- Jonathan Taylor, Ashton
 * Jeanty, Brock Bowers, Lamar Jackson, Derrick Henry, Breece Hall -- who would
 * otherwise silently score 0 and tank any strategy built around them.
 *
 * The estimate is a MODEL value, never a fabricated feed number: for each
 * position we build a rank -> points curve from the players who DO have a real
 * projection, then read off the missing player's expert positional rank
 * (ecrPositionRank). Linear interpolation between the two nearest known ranks;
 * clamp to the nearest endpoint outside the known range (no extrapolation, so
 * we never invent a number beyond what the real curve supports).
 *
 * Every imputed value is flagged `projectionImputed: true` so the UI and grade
 * can treat it as an estimate. Pure, deterministic, $0. Players that already
 * have a real projection are returned untouched.
 */

interface CurvePoint {
  rank: number
  points: number
}

/** Linear-interpolate points at `rank` on a rank-ascending curve; clamp at ends. */
function interpolate(curve: CurvePoint[], rank: number): number {
  if (curve.length === 0) return 0
  if (rank <= curve[0].rank) return curve[0].points
  const last = curve[curve.length - 1]
  if (rank >= last.rank) return last.points
  for (let i = 0; i < curve.length - 1; i++) {
    const a = curve[i]
    const b = curve[i + 1]
    if (rank >= a.rank && rank <= b.rank) {
      if (b.rank === a.rank) return a.points
      const t = (rank - a.rank) / (b.rank - a.rank)
      return a.points + t * (b.points - a.points)
    }
  }
  return last.points
}

/** Build one rank->points curve per position from players with real projections. */
function buildCurves(players: Player[]): Map<string, CurvePoint[]> {
  const byPos = new Map<string, CurvePoint[]>()
  for (const p of players) {
    if (
      p.ecrPositionRank == null ||
      p.projectedPoints == null ||
      p.projectedPoints <= 0 ||
      p.projectionImputed
    ) {
      continue
    }
    const list = byPos.get(p.position) ?? []
    list.push({ rank: p.ecrPositionRank, points: p.projectedPoints })
    byPos.set(p.position, list)
  }
  // Sort ascending by rank and collapse duplicate ranks (keep the higher points).
  for (const [pos, list] of byPos) {
    list.sort((a, b) => a.rank - b.rank || b.points - a.points)
    const deduped: CurvePoint[] = []
    for (const pt of list) {
      const prev = deduped[deduped.length - 1]
      if (prev && prev.rank === pt.rank) continue
      deduped.push(pt)
    }
    byPos.set(pos, deduped)
  }
  return byPos
}

/**
 * Return a new array where any player with a missing projection but a real
 * expert positional rank gets an imputed `projectedPoints` (+ `projectionImputed`).
 * Input is not mutated. Players with a real projection are copied through as-is.
 */
export function imputeMissingProjections(players: Player[]): Player[] {
  const curves = buildCurves(players)
  return players.map((p) => {
    const hasProjection = p.projectedPoints != null && p.projectedPoints > 0
    if (hasProjection) return p
    if (p.ecrPositionRank == null) return p
    const curve = curves.get(p.position)
    if (!curve || curve.length === 0) return p
    const estimate = Math.round(interpolate(curve, p.ecrPositionRank))
    if (estimate <= 0) return p
    return { ...p, projectedPoints: estimate, projectionImputed: true }
  })
}
