/**
 * injury-flags.ts - split the single blanket "INJ" designation into the two
 * signals Joe actually acts on differently at the auction:
 *
 *   FRAGILE (injury RISK) - the player is HEALTHY right now, but the measured
 *     15-season durability model says he breaks down more than his position's
 *     baseline (McCaffrey-class fragile vet). This is a standing-value dent, not
 *     a "he's not playing" flag. Sourced from the same chronic durability factor
 *     the worth haircut uses (durabilityPriceFactor, sim-grade.ts).
 *
 *   OUT (injured NOW) - the player carries a real current absence designation
 *     (Doubtful / Out / PUP / IR / Suspended). He is not on the field now.
 *
 * "Questionable" is deliberately NOT a flag. It is ESPN's broad August camp
 * catch-all (~97 players wear it: Puka, Nabers, Zay) and its tiny worth haircut
 * is already baked into the value range (injury-risk.ts). Flagging it would be
 * the exact blanket-INJ noise Joe asked us to drop.
 *
 * A player can be BOTH fragile and out at once - the two are independent.
 *
 * Pure + deterministic -> unit-tested in injury-flags.test.ts.
 */

import { durabilityPriceFactor, type RiskModel } from '@/lib/draft/sim-grade'

/**
 * Chronic durability factor at or below this is a FRAGILE flag. The factor is
 * 1.0 for a position-baseline-durable player and floors at ~0.75 for the most
 * fragile; 0.90 marks "meaningfully more fragile than his position," roughly the
 * bottom third of players who carry any durability signal at all.
 */
export const FRAGILE_FACTOR_THRESHOLD = 0.9

/**
 * Current designations that mean "not on the field now." Lowercase. Mirrors the
 * acute-absence tier in injury-risk.ts (doubtful/out/pup/ir) plus suspended,
 * which is an absence for non-injury reasons but plays the same at the auction.
 * "questionable" and "probable" are expected-to-play and are intentionally out.
 */
const ACUTE_OUT = new Set(['doubtful', 'out', 'pup', 'ir', 'suspended'])

export interface InjuryFlags {
  /** Chronic durability risk, but healthy right now (injury RISK). */
  fragile: boolean
  /** The chronic durability factor driving `fragile` (1 = position-baseline). */
  fragileFactor: number
  /** A real current absence designation (injured NOW). */
  out: boolean
  /** The raw status string driving `out` (empty when not out). */
  outStatus: string
}

/**
 * Classify a player into the two injury signals. `sleeperId` joins the chronic
 * durability model; `model` is injectable for tests (defaults to the real one).
 */
export function classifyInjury(
  sleeperId: string | null | undefined,
  position: string,
  injuryStatus: string | null | undefined,
  model?: RiskModel,
): InjuryFlags {
  const fragileFactor = durabilityPriceFactor(sleeperId, position, model)
  const fragile = fragileFactor <= FRAGILE_FACTOR_THRESHOLD

  const status = (injuryStatus ?? '').trim()
  const out = ACUTE_OUT.has(status.toLowerCase())

  return {
    fragile,
    fragileFactor,
    out,
    outStatus: out ? status : '',
  }
}
