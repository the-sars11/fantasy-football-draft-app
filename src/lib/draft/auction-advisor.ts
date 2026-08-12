/**
 * Auction Advisor (FF-042, FF-043, FF-044)
 *
 * Auction-specific calculations:
 * - Max bid calculator with context (needs, alternatives, strategy)
 * - Budget strategy analysis (ahead/behind plan)
 * - Position urgency + budget warnings
 */

import type { DraftState } from './state'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

// --- FF-042: Max Bid Calculator ---

export interface MaxBidResult {
  maxBid: number
  reasoning: string
  factors: MaxBidFactor[]
}

export interface MaxBidFactor {
  label: string
  impact: 'increases' | 'decreases' | 'neutral'
  detail: string
}

/**
 * League-calibrated valuation for a player (VAL-3). When supplied, the max-bid
 * anchor is re-based off Joe's real Nasties ledger instead of `consensusValue *
 * 1.3`. Inflation is a DIRECTIONAL tilt only — it is already baked into
 * `expectedRoomPrice`, so it is never re-multiplied into the raw anchor.
 */
export interface CalibratedBidInputs {
  ceiling: number // genuine worth in Nasties scoring ($ VORP)
  expectedRoomPrice: number // what the room actually pays for this positional rank
  inflationTag?: 'HOT' | 'COOL' | 'NEUTRAL' // room vs national on this position
}

export function calculateMaxBidAdvice(
  state: DraftState,
  managerName: string,
  playerName: string,
  playerPosition: string,
  consensusValue: number,
  strategyScore: number,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
  strategy: DbStrategy | null,
  calibrated?: CalibratedBidInputs,
): MaxBidResult {
  const mgr = state.managers[managerName]
  if (!mgr || mgr.budget_remaining == null) {
    return { maxBid: 1, reasoning: 'No budget data', factors: [] }
  }

  const totalSlots = Object.values(state.roster_slots).reduce((s, v) => s + v, 0)
  const emptySlots = Math.max(0, totalSlots - mgr.picks.length - 1)
  const absoluteMax = Math.max(1, mgr.budget_remaining - emptySlots)

  const factors: MaxBidFactor[] = []

  // Base anchor. When calibrated inputs are present, sit the anchor between what
  // the player is WORTH (ceiling) and what the room actually PAYS (room price),
  // then tilt directionally by inflation. Otherwise fall back to the legacy
  // consensus-based anchor so every existing caller/test still behaves.
  let recommendedMax: number
  if (
    calibrated &&
    Number.isFinite(calibrated.ceiling) &&
    Number.isFinite(calibrated.expectedRoomPrice)
  ) {
    const { ceiling, expectedRoomPrice, inflationTag } = calibrated
    const midpoint = (ceiling + expectedRoomPrice) / 2
    let anchor = midpoint
    if (inflationTag === 'HOT') {
      // Room reliably overpays here — never chase past genuine worth.
      anchor = Math.min(midpoint, ceiling)
    } else if (inflationTag === 'COOL') {
      // Value pocket — worth a small premium over the midpoint to secure it,
      // still capped at genuine worth.
      anchor = Math.min(ceiling, midpoint * 1.08)
    }
    recommendedMax = Math.min(absoluteMax, Math.max(1, Math.round(anchor)))
    factors.push({
      label: 'League-calibrated',
      impact: 'neutral',
      detail: `Worth $${Math.round(ceiling)}, room pays ~$${Math.round(expectedRoomPrice)}${
        inflationTag && inflationTag !== 'NEUTRAL' ? ` (${inflationTag})` : ''
      }`,
    })
  } else {
    recommendedMax = Math.min(absoluteMax, Math.round(consensusValue * 1.3))
  }

  // Factor: Strategy alignment
  if (strategyScore >= 75) {
    recommendedMax = Math.min(absoluteMax, Math.round(recommendedMax * 1.15))
    factors.push({
      label: 'Strategy target',
      impact: 'increases',
      detail: `Score ${strategyScore}/100 - worth paying up`,
    })
  } else if (strategyScore < 40) {
    recommendedMax = Math.round(recommendedMax * 0.75)
    factors.push({
      label: 'Low strategy fit',
      impact: 'decreases',
      detail: `Score ${strategyScore}/100 - let others overpay`,
    })
  }

  // Factor: Position need
  const pos = playerPosition.toUpperCase()
  const posKey = pos === 'DEF' ? 'dst' : pos.toLowerCase()
  const required = state.roster_slots[posKey] ?? 0
  const filled = mgr.roster_count[pos] || 0
  const need = required - filled

  if (need > 0) {
    factors.push({
      label: 'Position need',
      impact: 'increases',
      detail: `Need ${need} more ${pos}${need > 1 ? 's' : ''}`,
    })
    if (need >= 2) {
      recommendedMax = Math.min(absoluteMax, Math.round(recommendedMax * 1.1))
    }
  } else {
    recommendedMax = Math.round(recommendedMax * 0.7)
    factors.push({
      label: 'Position filled',
      impact: 'decreases',
      detail: `Already have ${filled} ${pos}${filled > 1 ? 's' : ''}`,
    })
  }

  // Factor: Alternatives available
  const alternatives = scoredPlayers.filter(
    sp => sp.player.position === playerPosition
      && !draftedNames.has(sp.player.name.toLowerCase())
      && sp.player.name !== playerName
      && sp.strategyScore >= 50,
  )

  if (alternatives.length <= 2) {
    recommendedMax = Math.min(absoluteMax, Math.round(recommendedMax * 1.2))
    factors.push({
      label: 'Scarcity',
      impact: 'increases',
      detail: `Only ${alternatives.length} viable ${pos} alternatives`,
    })
  } else if (alternatives.length >= 8) {
    recommendedMax = Math.round(recommendedMax * 0.9)
    factors.push({
      label: 'Deep position',
      impact: 'decreases',
      detail: `${alternatives.length} alternatives available`,
    })
  }

  // Factor: Budget allocation alignment
  if (strategy?.budget_allocation) {
    const alloc = strategy.budget_allocation as Record<string, number>
    const targetPct = alloc[posKey] ?? alloc[pos] ?? 0
    const budget = mgr.budget_total ?? 200
    const positionBudget = Math.round((targetPct / 100) * budget)
    const positionSpent = mgr.picks
      .filter(p => p.position?.toUpperCase() === pos)
      .reduce((sum, p) => sum + (p.price ?? 0), 0)
    const positionRemaining = positionBudget - positionSpent

    if (positionRemaining > 0) {
      factors.push({
        label: 'Budget allocation',
        impact: 'neutral',
        detail: `$${positionRemaining} left in ${pos} budget`,
      })
    }
  }

  recommendedMax = Math.max(1, Math.min(absoluteMax, Math.round(recommendedMax)))

  const reasoning = recommendedMax >= consensusValue * 1.2
    ? `Worth stretching - high strategy fit + limited alternatives`
    : recommendedMax <= consensusValue * 0.8
    ? `Let it go if bidding exceeds $${recommendedMax}`
    : `Fair value range - bid up to $${recommendedMax}`

  return { maxBid: recommendedMax, reasoning, factors }
}

// --- FF-043: Adaptive Budget Strategy ---

export interface BudgetAnalysis {
  status: 'ahead' | 'behind' | 'on_track'
  budgetRemaining: number
  budgetTotal: number
  pctSpent: number
  pctPicks: number
  avgPricePerPick: number
  projectedEndBudget: number
  suggestion: string
}

export function analyzeBudgetStrategy(
  state: DraftState,
  managerName: string,
): BudgetAnalysis | null {
  if (state.format !== 'auction') return null
  const mgr = state.managers[managerName]
  if (!mgr || mgr.budget_remaining == null || mgr.budget_total == null) return null

  const totalSlots = Object.values(state.roster_slots).reduce((s, v) => s + v, 0)
  const spent = mgr.budget_total - mgr.budget_remaining
  const pctSpent = (spent / mgr.budget_total) * 100
  const pctPicks = (mgr.picks.length / totalSlots) * 100
  const avgPrice = mgr.picks.length > 0 ? Math.round(spent / mgr.picks.length) : 0
  const remainingPicks = totalSlots - mgr.picks.length
  const projectedEnd = remainingPicks > 0
    ? mgr.budget_remaining - remainingPicks // $1 per remaining slot
    : mgr.budget_remaining

  let status: 'ahead' | 'behind' | 'on_track' = 'on_track'
  let suggestion = ''

  if (pctSpent > pctPicks + 15) {
    status = 'ahead'
    suggestion = `Spending faster than draft pace. ${remainingPicks} picks left with $${mgr.budget_remaining}. Consider bargain targets to balance.`
  } else if (pctSpent < pctPicks - 15) {
    status = 'behind'
    suggestion = `Under-spending: $${mgr.budget_remaining} for ${remainingPicks} picks. Can afford to be aggressive on next key target.`
  } else {
    suggestion = `On pace: $${avgPrice} avg/pick, $${mgr.budget_remaining} remaining for ${remainingPicks} picks.`
  }

  return {
    status,
    budgetRemaining: mgr.budget_remaining,
    budgetTotal: mgr.budget_total,
    pctSpent: Math.round(pctSpent),
    pctPicks: Math.round(pctPicks),
    avgPricePerPick: avgPrice,
    projectedEndBudget: Math.max(0, projectedEnd),
    suggestion,
  }
}

// --- FF-044: Position Urgency + Budget Warnings ---

export interface PositionUrgencyWarning {
  position: string
  remaining: number
  underBudget: number
  threshold: number
  message: string
  severity: 'critical' | 'warning' | 'info'
}

export function getPositionUrgencyWarnings(
  state: DraftState,
  managerName: string,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
): PositionUrgencyWarning[] {
  if (state.format !== 'auction') return []
  const mgr = state.managers[managerName]
  if (!mgr || mgr.budget_remaining == null) return []

  const warnings: PositionUrgencyWarning[] = []
  const positions = ['QB', 'RB', 'WR', 'TE']

  for (const pos of positions) {
    const posKey = pos.toLowerCase()
    const required = state.roster_slots[posKey] ?? 0
    const filled = mgr.roster_count[pos] || 0
    const need = required - filled
    if (need <= 0) continue

    // Count available at various price points
    const available = scoredPlayers.filter(
      sp => sp.player.position === pos
        && !draftedNames.has(sp.player.name.toLowerCase()),
    )

    // Budget thresholds
    const budgetThresholds = [25, 15, 10, 5]
    for (const threshold of budgetThresholds) {
      const underBudget = available.filter(
        sp => (sp.adjustedAuctionValue ?? sp.player.consensusAuctionValue ?? 999) <= threshold,
      ).length

      if (underBudget <= 3 && available.length > 0) {
        const severity = underBudget <= 1 ? 'critical' : underBudget <= 2 ? 'warning' : 'info'
        warnings.push({
          position: pos,
          remaining: available.length,
          underBudget,
          threshold,
          message: `Only ${underBudget} startable ${pos}${underBudget !== 1 ? 's' : ''} left under $${threshold}`,
          severity,
        })
        break // only show the most relevant threshold per position
      }
    }
  }

  return warnings.sort((a, b) => {
    const sev = { critical: 0, warning: 1, info: 2 }
    return sev[a.severity] - sev[b.severity]
  })
}

// --- FF-262: Position Budget Breakdown ---

export interface PositionBudgetRow {
  position: string  // uppercase: 'QB', 'RB', 'WR', 'TE', 'K', 'DST'
  planned: number   // $ planned from strategy allocation (0 if no plan)
  spent: number     // $ actually spent on this position
  delta: number     // planned - spent: positive = money left, negative = over budget
}

const TRACKED_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as const

/**
 * Per-position spend vs. planned budget from the active strategy's budget_allocation.
 * Formula: planned = (alloc[pos] / 100) * budget_total
 * Returns only rows where spent > 0 or planned > 0 — empty if no relevant data.
 */
export function getPositionBudgetBreakdown(
  state: DraftState,
  managerName: string,
  strategy: DbStrategy | null,
): PositionBudgetRow[] {
  if (state.format !== 'auction') return []
  const mgr = state.managers[managerName]
  if (!mgr || mgr.budget_total == null) return []

  const alloc = (strategy?.budget_allocation ?? {}) as Record<string, number>
  const budget = mgr.budget_total

  const rows = TRACKED_POSITIONS.map(pos => {
    const pct = alloc[pos.toLowerCase()] ?? 0
    const planned = pct > 0 ? Math.round((pct / 100) * budget) : 0
    // DST row matches picks with position 'DST' or 'DEF' (ESPN uses 'DEF')
    const spent = mgr.picks
      .filter(p => {
        const pPos = p.position?.toUpperCase()
        return pos === 'DST' ? (pPos === 'DST' || pPos === 'DEF') : pPos === pos
      })
      .reduce((sum, p) => sum + (p.price ?? 0), 0)

    return { position: pos, planned, spent, delta: planned - spent }
  })

  return rows.filter(r => r.spent > 0 || r.planned > 0)
}
