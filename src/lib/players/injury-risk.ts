/**
 * injury-risk.ts - VAL-2.3. Risk-adjust our optimistic worth (ceilingValue)
 * BEFORE it drives the value gap / POCKET star, so the display stops rewarding
 * Joe for buying the injury discount.
 *
 * THE BUG THIS FIXES: the room prices a player off his EXPERT (ECR) rank, and
 * the experts fade a hurt player's rank -> his room price drops. But ceilingValue
 * is built from projected fantasy points and does NOT fade the injury nearly as
 * hard, so valueGap = f(ceiling - room) blew up for injured guys and lit a POCKET
 * star on them. Measured on the live pool: injured players got starred at ~4x the
 * rate of healthy ones. The star was real arithmetic on a worth number that was
 * ignoring risk the market had already priced in.
 *
 * THE FIX: two separated, defensible haircuts on the worth used for the GAP:
 *   1. CHRONIC durability - the engine's measured 15-season games-played factor
 *      (durabilityPriceFactor, floored 0.75). Catches the fragile-vet case
 *      (McCaffrey) whether or not he carries a current designation.
 *   2. ACUTE designation - a severity-graded discount off the CURRENT injury
 *      status. "Questionable" is ESPN's broad camp catch-all (97 players wear it
 *      in the August snapshot: Puka, Nabers, Zay) so it barely nudges; PUP / IR /
 *      Doubtful / Out are real absences and fade hard.
 * The two multiply, floored at RISK_WORTH_FLOOR so a genuinely absent player still
 * keeps a real (small) number instead of zeroing out.
 *
 * SCOPE: this only reshapes the DISPLAY worth (expertAdjustedValue / valueGap /
 * My Range). It never touches raw ceilingValue, which the decision engine (sim,
 * roster solver, live advisor) reads directly - those already carry their own
 * measured risk model and must stay untouched.
 *
 * Pure + deterministic -> unit-tested in injury-risk.test.ts.
 */

import { durabilityPriceFactor, type RiskModel } from '@/lib/draft/sim-grade'

/**
 * Acute injury-DESIGNATION discount. The current status is a coarse label, so the
 * severity ladder is a stated model parameter (like WEEKLY_INJURY_OUT_RATE), not a
 * measured constant. Keyed lowercase.
 *   questionable 0.95  - expected to play; ESPN's broad camp catch-all, barely fades
 *   doubtful     0.70  - likely to miss the week / start slow
 *   out          0.55  - out now, timeline unclear
 *   pup          0.60  - misses >= the first 4 games by rule (Kittle case)
 *   ir           0.40  - shelved to open the season
 * Any other non-healthy label falls to DEFAULT_ACUTE (mild, uncertain).
 */
export const INJURY_STATUS_FACTOR: Record<string, number> = {
  questionable: 0.95,
  doubtful: 0.7,
  out: 0.55,
  pup: 0.6,
  ir: 0.4,
}

/** A non-healthy status we don't have a specific severity for: mild, uncertain. */
export const DEFAULT_ACUTE_FACTOR = 0.9

/** Statuses that mean "healthy enough, no worth haircut." Mirrors tags.ts. */
const HEALTHY = new Set(['', 'healthy', 'active', 'none', 'probable'])

/**
 * The combined worth haircut is never harsher than this, so even an IR stud keeps
 * a real (small) worth rather than collapsing to $0.
 */
export const RISK_WORTH_FLOOR = 0.3

/**
 * Acute factor for a current injury designation (1 = no haircut). Healthy/empty
 * and the "probable"-class labels return 1.
 */
export function injuryStatusFactor(status: string | null | undefined): number {
  const key = (status ?? '').trim().toLowerCase()
  if (HEALTHY.has(key)) return 1
  return INJURY_STATUS_FACTOR[key] ?? DEFAULT_ACUTE_FACTOR
}

/**
 * Risk-adjusted worth = ceilingValue * chronicDurability * acuteInjury, rounded,
 * floored so a priced player never drops below $1. Returns ceilingValue unchanged
 * for an unpriced/zero row (nothing to adjust). `sleeperId` joins the chronic
 * durability model; `model` is injectable for tests (defaults to the real one).
 */
export function riskAdjustedCeiling(
  ceilingValue: number,
  sleeperId: string | null | undefined,
  position: string,
  injuryStatus: string | null | undefined,
  model?: RiskModel,
): number {
  if (!(ceilingValue > 0)) return ceilingValue
  const chronic = durabilityPriceFactor(sleeperId, position, model)
  const acute = injuryStatusFactor(injuryStatus)
  const factor = Math.max(RISK_WORTH_FLOOR, chronic * acute)
  return Math.max(1, Math.round(ceilingValue * factor))
}
