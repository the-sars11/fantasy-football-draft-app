/**
 * Explainability Engine (FF-036)
 *
 * Generates human-readable reasoning for draft recommendations.
 * Every recommendation cites concrete data: scarcity, value, strategy fit, manager needs.
 */

import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftState } from './state'

export interface ExplainFactor {
  label: string       // short tag: "Scarcity", "Value", "Strategy Fit", etc.
  detail: string      // full sentence explanation
  impact: 'positive' | 'negative' | 'neutral'
  weight: number      // 0-10, how much this factor matters
}

export interface Explanation {
  summary: string           // 1-sentence recommendation
  factors: ExplainFactor[]  // ordered by weight desc
  confidence: 'high' | 'medium' | 'low'
}

// --- Position scarcity types (also used by FF-035) ---

export interface PositionScarcity {
  position: Position
  totalRemaining: number
  tier1Remaining: number  // top-12 (startable)
  tier2Remaining: number  // 13-24
  tier3Remaining: number  // 25+
  startableRemaining: number // tier1 + tier2
  scarcityLevel: 'critical' | 'low' | 'moderate' | 'abundant'
}

// Extended interface with spend ranges for FF-073 redesign
export interface PositionScarcityExtended extends PositionScarcity {
  spendRange?: { low: number; high: number }
  avgValue?: number
}

/**
 * Calculate position scarcity across all undrafted players.
 */
export function calculateScarcity(
  availablePlayers: Player[],
  teamCount: number,
): PositionScarcity[] {
  const positions: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

  return positions.map(pos => {
    const posPlayers = availablePlayers.filter(p => p.position === pos)
    const tier1 = posPlayers.filter(p => p.consensusTier <= 1)
    const tier2 = posPlayers.filter(p => p.consensusTier === 2)
    const tier3 = posPlayers.filter(p => p.consensusTier >= 3)
    const startable = tier1.length + tier2.length

    // Scarcity thresholds relative to team count
    let scarcityLevel: PositionScarcity['scarcityLevel']
    if (startable <= Math.floor(teamCount * 0.5)) {
      scarcityLevel = 'critical'
    } else if (startable <= teamCount) {
      scarcityLevel = 'low'
    } else if (startable <= teamCount * 1.5) {
      scarcityLevel = 'moderate'
    } else {
      scarcityLevel = 'abundant'
    }

    return {
      position: pos,
      totalRemaining: posPlayers.length,
      tier1Remaining: tier1.length,
      tier2Remaining: tier2.length,
      tier3Remaining: tier3.length,
      startableRemaining: startable,
      scarcityLevel,
    }
  })
}

/**
 * Calculate extended scarcity with spend ranges for auction drafts (FF-073).
 * Includes value ranges for remaining players at each position.
 */
export function calculateScarcityExtended(
  availablePlayers: Player[],
  teamCount: number,
): PositionScarcityExtended[] {
  const baseScarcity = calculateScarcity(availablePlayers, teamCount)

  return baseScarcity.map(scarcity => {
    const posPlayers = availablePlayers.filter(p => p.position === scarcity.position)

    // Get auction values for startable players (tier 1-2)
    const startablePlayers = posPlayers.filter(p => p.consensusTier <= 2)
    const auctionValues = startablePlayers
      .map(p => p.consensusAuctionValue)
      .filter(v => v != null && v > 0)
      .sort((a, b) => b - a)

    let spendRange: { low: number; high: number } | undefined
    let avgValue: number | undefined

    if (auctionValues.length > 0) {
      const high = Math.round(auctionValues[0])
      const low = Math.round(auctionValues[auctionValues.length - 1])
      spendRange = { low, high }
      avgValue = Math.round(auctionValues.reduce((a, b) => a + b, 0) / auctionValues.length)
    }

    return {
      ...scarcity,
      spendRange,
      avgValue,
    }
  })
}

/**
 * Generate full explanation for why a player is recommended (or not).
 */
export function explainPlayer(
  scored: ScoredPlayer,
  draftState: DraftState,
  managerName: string,
  allAvailable: Player[],
): Explanation {
  const factors: ExplainFactor[] = []
  const player = scored.player
  const teamCount = draftState.manager_order.length

  // 1. Strategy fit (from scoring boosts)
  if (scored.strategyScore >= 70) {
    factors.push({
      label: 'Strategy Fit',
      detail: `Score of ${scored.strategyScore}/100 — strong match for your strategy.`,
      impact: 'positive',
      weight: 8,
    })
  } else if (scored.strategyScore < 40) {
    factors.push({
      label: 'Strategy Mismatch',
      detail: `Score of ${scored.strategyScore}/100 — poor fit for your strategy.`,
      impact: 'negative',
      weight: 7,
    })
  }

  // 2. Position scarcity
  const scarcity = calculateScarcity(allAvailable, teamCount)
  const posScarcity = scarcity.find(s => s.position === player.position)
  if (posScarcity) {
    if (posScarcity.scarcityLevel === 'critical') {
      factors.push({
        label: 'Scarcity',
        detail: `Only ${posScarcity.startableRemaining} startable ${player.position}s remain — critical scarcity.`,
        impact: 'positive',
        weight: 9,
      })
    } else if (posScarcity.scarcityLevel === 'low') {
      factors.push({
        label: 'Scarcity',
        detail: `${posScarcity.startableRemaining} startable ${player.position}s left — supply running low.`,
        impact: 'positive',
        weight: 6,
      })
    } else if (posScarcity.scarcityLevel === 'abundant') {
      factors.push({
        label: 'Deep Position',
        detail: `${posScarcity.startableRemaining} startable ${player.position}s available — no rush.`,
        impact: 'neutral',
        weight: 3,
      })
    }
  }

  // 3. Position need for this manager
  const manager = draftState.managers[managerName]
  if (manager) {
    const posKey = player.position.toUpperCase()
    const rosterKey = posKey === 'DEF' ? 'dst' : posKey.toLowerCase()
    const slotCount = draftState.roster_slots[rosterKey] ?? 0
    const filled = manager.roster_count[posKey] || 0
    const needed = slotCount - filled

    if (needed > 0) {
      factors.push({
        label: 'Roster Need',
        detail: `You still need ${needed} ${player.position}${needed > 1 ? 's' : ''} — ${filled}/${slotCount} filled.`,
        impact: 'positive',
        weight: 7,
      })
    } else if (slotCount > 0) {
      factors.push({
        label: 'Position Full',
        detail: `${player.position} slots already filled (${filled}/${slotCount}). Would go to bench.`,
        impact: 'negative',
        weight: 5,
      })
    }
  }

  // 4. Value (auction) or ADP value (snake)
  if (draftState.format === 'auction' && scored.adjustedAuctionValue != null) {
    const consensus = player.consensusAuctionValue
    const adjusted = scored.adjustedAuctionValue
    if (adjusted > consensus * 1.1) {
      factors.push({
        label: 'Premium Value',
        detail: `Strategy values at $${adjusted} vs consensus $${consensus} — worth paying up.`,
        impact: 'positive',
        weight: 5,
      })
    } else if (adjusted < consensus * 0.9) {
      factors.push({
        label: 'Discount',
        detail: `Strategy values at $${adjusted} vs consensus $${consensus} — potential bargain.`,
        impact: 'positive',
        weight: 4,
      })
    }
  }

  if (draftState.format === 'snake' && scored.adjustedRoundValue != null) {
    const adpRound = Math.ceil(player.adp / teamCount) || 10
    const adjusted = scored.adjustedRoundValue
    if (adjusted < adpRound) {
      factors.push({
        label: 'Reach Target',
        detail: `Strategy says draft in Rd ${adjusted}, ADP suggests Rd ${adpRound} — draft earlier than consensus.`,
        impact: 'positive',
        weight: 5,
      })
    }
  }

  // 5. Analysis-based factors
  if (player.analysis) {
    if (player.analysis.isSleeper) {
      factors.push({
        label: 'Sleeper',
        detail: 'Identified as a sleeper pick — upside outweighs ADP.',
        impact: 'positive',
        weight: 4,
      })
    }
    if (player.analysis.riskLevel === 'high') {
      factors.push({
        label: 'High Risk',
        detail: player.analysis.reasoning || 'Elevated risk profile — injury or role uncertainty.',
        impact: 'negative',
        weight: 4,
      })
    }
  }

  // 6. Target/avoid from strategy
  if (scored.targetStatus === 'target' && scored.strategyScore < 70) {
    factors.push({
      label: 'Targeted',
      detail: 'Marked as a target in your strategy.',
      impact: 'positive',
      weight: 6,
    })
  }
  if (scored.targetStatus === 'avoid') {
    factors.push({
      label: 'Avoided',
      detail: 'Marked as avoid in your strategy.',
      impact: 'negative',
      weight: 8,
    })
  }

  // Sort by weight desc
  factors.sort((a, b) => b.weight - a.weight)

  // Confidence based on factor count and consistency
  const positives = factors.filter(f => f.impact === 'positive').length
  const negatives = factors.filter(f => f.impact === 'negative').length
  let confidence: Explanation['confidence'] = 'medium'
  if (positives >= 3 && negatives === 0) confidence = 'high'
  else if (negatives >= 2 && positives <= 1) confidence = 'high'
  else if (positives > 0 && negatives > 0) confidence = 'low'

  // Summary sentence
  const topFactor = factors[0]
  let summary: string
  if (scored.targetStatus === 'avoid') {
    summary = `Avoid ${player.name} — ${topFactor?.detail || 'does not fit your strategy.'}`
  } else if (scored.strategyScore >= 70) {
    summary = `${player.name} is a strong pick — ${topFactor?.detail || 'fits your strategy well.'}`
  } else if (scored.strategyScore >= 50) {
    summary = `${player.name} is a reasonable pick. ${topFactor?.detail || ''}`
  } else {
    summary = `${player.name} is a weak fit. ${topFactor?.detail || 'Consider other options.'}`
  }

  return { summary, factors, confidence }
}
