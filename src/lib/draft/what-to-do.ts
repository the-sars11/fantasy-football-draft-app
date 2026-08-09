/**
 * What To Do — live-auction decision brain (UXV2-6).
 *
 * Pure, side-effect-free logic that turns the player currently on the block
 * into a single directive move plus a plain-English rationale. This is the
 * "what should I do right now" summary that sits at the top of the live room.
 *
 * Reuses existing engine outputs (ScoredPlayer, PositionScarcityExtended,
 * the strategy-aware max bid, and the hard budget ceiling) rather than
 * recomputing any scoring. No LLM calls, no network, fully unit-testable.
 *
 * Copy rules (Joe): plain English, no jargon, and NO em/en dashes anywhere.
 * Dollar ranges render as "$38-$52" in compact chips and "$38 to $52" in prose.
 */

import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { PositionScarcityExtended } from '@/lib/draft/explain'

export type WhatToDoMove = 'HOLD' | 'BID' | 'PUSH' | 'PASS'

/** Maps to the v4 mockup move colors via the --move-* CSS vars. */
export type WhatToDoColor = 'gold' | 'volt' | 'orange' | 'red'

export interface WhatToDoInput {
  /** The player currently on the auction block. */
  player: Player
  /** Its scored entry from scorePlayersWithStrategy, if available. */
  scored: ScoredPlayer | null
  /**
   * Strategy-aware personal max bid for this player, from maxBidAdviceMap.
   * This is "the most you should pay given your plan". Null when no strategy.
   */
  myMaxBid: number | null
  /**
   * Hard affordability ceiling from getMaxBidFor(myManager): what your wallet
   * physically allows while still filling every empty roster slot at $1.
   */
  budgetMaxBid: number | null
  /** Extended scarcity for THIS player's position. Null if not computed. */
  scarcity: PositionScarcityExtended | null
  /**
   * Still-available players at the SAME position (excluding the on-block
   * player), already scored and sorted best-first. Drives the HOLD signal.
   */
  alternatives: ScoredPlayer[]
  /** True when Joe tagged this player TARGET. */
  isTarget: boolean
  /** True when Joe tagged this player AVOID. */
  isAvoid: boolean
}

export interface WhatToDoAdvice {
  move: WhatToDoMove
  moveColor: WhatToDoColor
  /** Short imperative cap line, e.g. "bid only under $40" or "go up to $54". */
  cap: string
  /** Numeric cap when one applies, else null. */
  capValue: number | null
  /** One plain-English line. No dashes. */
  rationale: string
  /** Your willingness band. Null when there is no value signal at all. */
  range: { low: number; high: number } | null
  /** Rounded market estimate (consensus auction value). Null when unknown. */
  marketEst: number | null
  isTarget: boolean
  isAvoid: boolean
  /** e.g. "TIER 1". */
  tierLabel: string
  /** e.g. "2 T1 WRs left". Empty string when scarcity is unknown. */
  scarcityNote: string
}

const MOVE_COLORS: Record<WhatToDoMove, WhatToDoColor> = {
  HOLD: 'gold',
  BID: 'volt',
  PUSH: 'orange',
  PASS: 'red',
}

function round(n: number): number {
  return Math.max(0, Math.round(n))
}

function tierOf(player: Player): number {
  // consensusTier can be fractional from normalization; clamp to a whole tier.
  // 0 = unknown (missing/NaN source data) so nothing ever renders "TIER NaN".
  const raw = player.consensusTier
  if (!Number.isFinite(raw)) return 0
  const t = Math.round(raw)
  return t < 1 ? 1 : t
}

function tierLabelOf(player: Player): string {
  const t = tierOf(player)
  return t === 0 ? 'UNRANKED' : `TIER ${t}`
}

function pluralPos(pos: string, n: number): string {
  return n === 1 ? pos : `${pos}s`
}

/** "2 T1 WRs left" style, keyed to the player's own tier. */
function scarcityNoteOf(
  player: Player,
  scarcity: PositionScarcityExtended | null,
): string {
  if (!scarcity) return ''
  const tier = tierOf(player)
  const pos = player.position
  if (tier <= 1) {
    return `${scarcity.tier1Remaining} T1 ${pluralPos(pos, scarcity.tier1Remaining)} left`
  }
  if (tier === 2) {
    return `${scarcity.tier2Remaining} T2 ${pluralPos(pos, scarcity.tier2Remaining)} left`
  }
  return `${scarcity.startableRemaining} startable ${pluralPos(pos, scarcity.startableRemaining)} left`
}

/**
 * Your willingness band. High end is your strategy-aware cap (clamped to what
 * you can actually afford); low end is a modest discount that reads as a steal.
 * Falls back to the market estimate when there is no personal cap.
 */
function computeRange(
  myCap: number | null,
  marketEst: number | null,
): { low: number; high: number } | null {
  const high = myCap != null ? myCap : marketEst
  if (high == null || high <= 0) return null
  const low = Math.max(1, round(high * 0.75))
  return { low, high: round(high) }
}

/**
 * The strongest still-available alternative at the same position that is worth
 * waiting for: you rate it at least as highly and it should not cost more.
 * This is the "let this one go, you can get similar value cheaper" signal.
 */
function findHoldAlternative(
  input: WhatToDoInput,
): { name: string; low: number; high: number; cap: number } | null {
  const { scored, alternatives, player } = input
  if (!scored || alternatives.length === 0) return null
  const myScore = scored.combinedScore
  const market = player.consensusAuctionValue ?? 0

  for (const alt of alternatives) {
    if (alt.player.id === player.id) continue
    const altScore = alt.combinedScore
    const altMarket = alt.player.consensusAuctionValue ?? 0
    // Comparable-or-better value AND not more expensive than the on-block guy.
    const comparable = altScore >= myScore - 3
    const cheaperOrEqual = altMarket <= market * 1.05
    if (comparable && cheaperOrEqual) {
      const altRange = computeRange(
        alt.adjustedAuctionValue != null ? round(alt.adjustedAuctionValue) : altMarket,
        altMarket > 0 ? altMarket : null,
      )
      return {
        name: alt.player.name,
        low: Math.max(1, altRange ? altRange.low : round(altMarket * 0.75)),
        high: Math.max(1, altRange ? altRange.high : round(altMarket)),
        cap: Math.max(1, round(Math.min(altMarket, market) * 0.85)),
      }
    }
  }
  return null
}

/** Is this the last startable player of a scarce tier at its position? */
function isLastOfScarceTier(
  player: Player,
  scarcity: PositionScarcityExtended | null,
): boolean {
  if (!scarcity) return false
  const tier = tierOf(player)
  if (tier <= 1) return scarcity.tier1Remaining <= 1
  if (tier === 2) return scarcity.tier2Remaining <= 1 && scarcity.tier1Remaining === 0
  return false
}

/**
 * Compute the directive move for the player on the block.
 *
 * Precedence: PASS (avoid or unaffordable) > PUSH (last of a scarce tier you
 * want) > HOLD (a comparable alternative is still on the board cheaper) > BID.
 */
export function computeWhatToDo(input: WhatToDoInput): WhatToDoAdvice {
  const { player, scored, myMaxBid, budgetMaxBid, scarcity, isTarget, isAvoid } = input

  const market = player.consensusAuctionValue ?? 0
  const marketEst = market > 0 ? round(market) : null

  // Personal cap: strategy max bid, never above what the wallet can afford.
  let myCap: number | null = myMaxBid != null ? round(myMaxBid) : null
  if (myCap != null && budgetMaxBid != null) {
    myCap = Math.min(myCap, round(budgetMaxBid))
  }

  const range = computeRange(myCap, marketEst)
  const tierLabel = tierLabelOf(player)
  const scarcityNote = scarcityNoteOf(player, scarcity)

  const base = {
    range,
    marketEst,
    isTarget,
    isAvoid,
    tierLabel,
    scarcityNote,
  }

  // --- PASS: explicitly avoided, or you cannot afford even a $1-competitive bid.
  const cannotAfford = budgetMaxBid != null && budgetMaxBid < 1
  if (isAvoid) {
    return {
      ...base,
      move: 'PASS',
      moveColor: MOVE_COLORS.PASS,
      cap: 'let this one go',
      capValue: null,
      rationale: `You marked ${player.name} as an avoid. Sit this one out and keep your budget for a target.`,
    }
  }
  if (cannotAfford) {
    return {
      ...base,
      move: 'PASS',
      moveColor: MOVE_COLORS.PASS,
      cap: 'let this one go',
      capValue: null,
      rationale: `You are out of room to bid without leaving a roster spot at $1. Pass and protect your remaining slots.`,
    }
  }

  // --- PUSH: last startable of a scarce tier that you actually want.
  const wantIt = isTarget || (scored != null && scored.combinedScore >= 60)
  if (wantIt && isLastOfScarceTier(player, scarcity)) {
    const stretch = myCap != null ? round(myCap * 1.15) : marketEst != null ? round(marketEst * 1.1) : null
    const affordableStretch =
      stretch == null
        ? null
        : Math.max(1, budgetMaxBid != null ? Math.min(stretch, round(budgetMaxBid)) : stretch)
    return {
      ...base,
      move: 'PUSH',
      moveColor: MOVE_COLORS.PUSH,
      cap: affordableStretch != null ? `go to $${affordableStretch}` : 'stretch a little',
      capValue: affordableStretch,
      rationale: `Last ${tierLabel.toLowerCase()} ${player.position} on the board. If you want the tier, stretch a little past your range for ${player.name}.`,
    }
  }

  // --- HOLD: a comparable player is still available at a similar or lower price.
  const holdAlt = findHoldAlternative(input)
  if (holdAlt) {
    const holdCap = Math.max(1, myCap != null ? Math.min(myCap, holdAlt.cap) : holdAlt.cap)
    return {
      ...base,
      move: 'HOLD',
      moveColor: MOVE_COLORS.HOLD,
      cap: `bid only under $${holdCap}`,
      capValue: holdCap,
      rationale: `${holdAlt.name} ($${holdAlt.low} to $${holdAlt.high}) is similar value and still on the board. Let ${player.name} go unless the price dips under $${holdCap}.`,
    }
  }

  // --- BID: solid fit, affordable, nothing better waiting. Go get him.
  const rawBidCap = myCap != null ? myCap : marketEst
  const bidCap = rawBidCap != null ? Math.max(1, rawBidCap) : null
  const capText = bidCap != null ? `go up to $${bidCap}` : 'your call'
  const rationale = isTarget
    ? `${player.name} is one of your targets and the math still works. Bid with confidence up to your cap and stop there.`
    : `Solid fit at fair value and nothing comparable is waiting. Bid up to your cap and stop there.`
  return {
    ...base,
    move: 'BID',
    moveColor: MOVE_COLORS.BID,
    cap: capText,
    capValue: bidCap,
    rationale,
  }
}
