/**
 * Strategy Scoring Engine (FF-S02)
 *
 * Applies strategy filters (position weights, targets, avoids, team avoids)
 * to player data and produces a strategy-adjusted score per player.
 *
 * Auction mode: adjusts auction values based on budget allocation + position emphasis.
 * Snake mode: adjusts ADP/round value based on round targets + position emphasis.
 * No cross-contamination between formats.
 */

import type { Player, DraftFormat } from '@/lib/players/types'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

export interface ScoredPlayer {
  player: Player
  strategyScore: number // 0-100, higher = better fit for this strategy
  adjustedAuctionValue?: number // auction only
  adjustedRoundValue?: number // snake only: ideal round to draft
  targetStatus: 'target' | 'avoid' | 'neutral'
  boosts: string[] // human-readable reasons for score adjustments
}

/**
 * Score and rank players through the lens of a strategy.
 * Returns players sorted by strategyScore descending.
 */
export function scorePlayersWithStrategy(
  players: Player[],
  strategy: DbStrategy,
  format: DraftFormat,
  leagueBudget?: number
): ScoredPlayer[] {
  return players
    .map((player) => scorePlayer(player, strategy, format, leagueBudget))
    .sort((a, b) => b.strategyScore - a.strategyScore)
}

function scorePlayer(
  player: Player,
  strategy: DbStrategy,
  format: DraftFormat,
  leagueBudget?: number
): ScoredPlayer {
  let score = 50 // baseline
  const boosts: string[] = []

  // --- Position weight boost ---
  const posKey = player.position === 'DEF' ? 'DST' : player.position
  const posWeight = (strategy.position_weights as Record<string, number>)[posKey] ?? 5
  const posBoost = (posWeight - 5) * 4 // -16 to +20
  score += posBoost
  if (posBoost > 0) boosts.push(`+${posBoost} position emphasis (${player.position}: ${posWeight}/10)`)
  if (posBoost < 0) boosts.push(`${posBoost} position de-emphasized (${player.position}: ${posWeight}/10)`)

  // --- Player target boost ---
  const target = strategy.player_targets.find((t) => t.player_id === player.id)
  if (target) {
    const targetBoost = target.weight * 3 // +3 to +30
    score += targetBoost
    boosts.push(`+${targetBoost} targeted player (weight ${target.weight}/10)`)
  }

  // --- Player avoid penalty ---
  const avoid = strategy.player_avoids.find((a) => a.player_id === player.id)
  if (avoid) {
    const penalty = avoid.severity === 'hard' ? -40 : -20
    score += penalty
    boosts.push(`${penalty} avoided player (${avoid.severity})${avoid.reason ? `: ${avoid.reason}` : ''}`)
  }

  // --- Team avoid penalty ---
  if (strategy.team_avoids.includes(player.team)) {
    score -= 10
    boosts.push(`-10 team avoided (${player.team})`)
  }

  // --- Risk alignment ---
  const riskScore = getRiskAlignment(player, strategy.risk_tolerance)
  if (riskScore !== 0) {
    score += riskScore
    boosts.push(`${riskScore > 0 ? '+' : ''}${riskScore} risk alignment (${strategy.risk_tolerance})`)
  }

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  // --- Format-specific value adjustments ---
  let adjustedAuctionValue: number | undefined
  let adjustedRoundValue: number | undefined
  const targetStatus = getTargetStatus(score, !!avoid)

  if (format === 'auction' && strategy.budget_allocation && leagueBudget) {
    adjustedAuctionValue = computeAdjustedAuctionValue(player, strategy, leagueBudget, score)
  }

  if (format === 'snake' && strategy.round_targets) {
    adjustedRoundValue = computeAdjustedRoundValue(player, strategy, score)
  }

  return {
    player,
    strategyScore: Math.round(score),
    adjustedAuctionValue,
    adjustedRoundValue,
    targetStatus,
    boosts,
  }
}

function getRiskAlignment(
  player: Player,
  riskTolerance: string
): number {
  if (!player.analysis) return 0

  const playerRisk = player.analysis.riskLevel
  if (riskTolerance === 'aggressive' && playerRisk === 'high') return 5
  if (riskTolerance === 'aggressive' && playerRisk === 'low') return -3
  if (riskTolerance === 'conservative' && playerRisk === 'high') return -8
  if (riskTolerance === 'conservative' && playerRisk === 'low') return 5
  return 0
}

function getTargetStatus(score: number, isAvoided: boolean): 'target' | 'avoid' | 'neutral' {
  if (isAvoided) return 'avoid'
  if (score >= 70) return 'target'
  return 'neutral'
}

/**
 * Auction: adjust consensus value by position budget weight and strategy score.
 * Higher position budget % = willing to pay more for that position.
 */
function computeAdjustedAuctionValue(
  player: Player,
  strategy: DbStrategy,
  leagueBudget: number,
  score: number
): number {
  const baseValue = player.consensusAuctionValue || 1
  const posKey = player.position as string
  const posBudgetPct = strategy.budget_allocation?.[posKey] ?? 10
  const budgetMultiplier = posBudgetPct / 15 // 15% is "neutral" baseline

  // Score multiplier: 50 = 1.0x, 80 = 1.15x, 20 = 0.85x
  const scoreMultiplier = 1 + (score - 50) * 0.005

  const adjusted = baseValue * budgetMultiplier * scoreMultiplier

  // Cap at max bid percentage
  const maxBid = strategy.max_bid_percentage
    ? (leagueBudget * strategy.max_bid_percentage) / 100
    : leagueBudget * 0.35

  return Math.max(1, Math.min(Math.round(adjusted), maxBid))
}

/**
 * Snake: compute ideal round to draft this player based on round targets and score.
 * Lower = draft earlier.
 */
function computeAdjustedRoundValue(
  player: Player,
  strategy: DbStrategy,
  score: number
): number {
  const baseRound = Math.ceil(player.adp / 12) || 10 // fallback to round 10
  const rtPosKey = player.position === 'DEF' ? 'DST' : player.position
  const posTargetRounds = (strategy.round_targets as Record<string, number[]> | null)?.[rtPosKey]

  if (!posTargetRounds || posTargetRounds.length === 0) return baseRound

  // Find the closest target round to the player's ADP-based round
  const closestTargetRound = posTargetRounds.reduce((best, r) =>
    Math.abs(r - baseRound) < Math.abs(best - baseRound) ? r : best
  )

  // Blend ADP round with strategy target: high score = pull toward target, low score = ignore
  const blendWeight = Math.max(0, Math.min(1, (score - 30) / 50)) // 0 at score 30, 1 at score 80
  const adjusted = baseRound * (1 - blendWeight) + closestTargetRound * blendWeight

  return Math.max(1, Math.round(adjusted))
}
