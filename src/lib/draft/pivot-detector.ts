/**
 * Pivot Detector (FF-P03)
 *
 * Detects when draft conditions favor a different strategy.
 * Compares active strategy against alternatives based on:
 * - Remaining player pool quality per position
 * - Position runs depleting key positions
 * - Budget conditions (auction)
 * - Strategy target availability
 */

import type { DraftState } from '@/lib/draft/state'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFlowState } from './flow-monitor'

export interface PivotSuggestion {
  strategy: DbStrategy
  reason: string
  opportunities: string[]
}

/**
 * Check if conditions favor pivoting to a different strategy.
 * Returns a suggestion if a pivot makes sense, null otherwise.
 */
export function detectPivotOpportunity(
  activeStrategy: DbStrategy | null,
  allStrategies: DbStrategy[],
  state: DraftState,
  flow: DraftFlowState,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
): PivotSuggestion | null {
  if (!activeStrategy || allStrategies.length <= 1) return null
  if (state.total_picks < 3) return null // too early to pivot

  const alternatives = allStrategies.filter(s => s.id !== activeStrategy.id)
  if (alternatives.length === 0) return null

  // Score each alternative strategy against current conditions
  let bestAlternative: DbStrategy | null = null
  let bestScore = 0
  let bestReason = ''
  let bestOpportunities: string[] = []

  for (const alt of alternatives) {
    const { score, reason, opportunities } = scoreAlternative(
      alt, activeStrategy, state, flow, scoredPlayers, draftedNames,
    )

    if (score > bestScore) {
      bestScore = score
      bestAlternative = alt
      bestReason = reason
      bestOpportunities = opportunities
    }
  }

  // Only suggest if the alternative scores significantly better
  if (bestScore >= 15 && bestAlternative) {
    return {
      strategy: bestAlternative,
      reason: bestReason,
      opportunities: bestOpportunities,
    }
  }

  return null
}

function scoreAlternative(
  alt: DbStrategy,
  active: DbStrategy,
  state: DraftState,
  flow: DraftFlowState,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
): { score: number; reason: string; opportunities: string[] } {
  let score = 0
  const reasons: string[] = []
  const opportunities: string[] = []

  const altWeights = alt.position_weights as Record<string, number>
  const activeWeights = active.position_weights as Record<string, number>

  // Check if active strategy's priority positions are depleted
  const activeHighPriority = Object.entries(activeWeights)
    .filter(([, w]) => w >= 7)
    .map(([pos]) => pos.toUpperCase())

  const altHighPriority = Object.entries(altWeights)
    .filter(([, w]) => w >= 7)
    .map(([pos]) => pos.toUpperCase())

  for (const pos of activeHighPriority) {
    const pq = flow.poolQuality.find(p => p.position === pos)
    if (pq && pq.remainingCount <= 5 && pq.avgScore < 40) {
      score += 8
      reasons.push(`${pos} pool depleted`)
    }
  }

  // Check if alternative's priority positions still have value
  for (const pos of altHighPriority) {
    const pq = flow.poolQuality.find(p => p.position === pos)
    if (pq && pq.remainingCount > 10 && pq.avgScore > 55) {
      score += 5
      if (pq.topPlayerName) {
        opportunities.push(`${pq.topPlayerName} (${pos})`)
      }
    }
  }

  // Position runs that deplete active strategy's targets
  for (const run of flow.currentRuns) {
    if (activeHighPriority.includes(run.position)) {
      score += 5
      reasons.push(`${run.position} run (${run.count} picks)`)
    }
  }

  // Check active strategy target availability
  const activeTargetNames = new Set(active.player_targets.map(t => t.player_name.toLowerCase()))
  let activeTargetsGone = 0
  for (const name of activeTargetNames) {
    if (draftedNames.has(name)) activeTargetsGone++
  }
  if (activeTargetNames.size > 0 && activeTargetsGone / activeTargetNames.size > 0.6) {
    score += 8
    reasons.push(`${activeTargetsGone}/${activeTargetNames.size} targets gone`)
  }

  // Check if alternative has more available targets
  const altTargetNames = new Set(alt.player_targets.map(t => t.player_name.toLowerCase()))
  let altTargetsAvailable = 0
  for (const name of altTargetNames) {
    if (!draftedNames.has(name)) {
      altTargetsAvailable++
      const targetInfo = alt.player_targets.find(t => t.player_name.toLowerCase() === name)
      if (targetInfo && opportunities.length < 3) {
        opportunities.push(targetInfo.player_name)
      }
    }
  }
  if (altTargetsAvailable > 2) {
    score += 3
  }

  // Risk tolerance alignment with draft conditions
  if (state.format === 'auction') {
    const myMgr = state.managers[state.manager_order[0]]
    if (myMgr && myMgr.budget_remaining != null && myMgr.budget_total) {
      const budgetPct = myMgr.budget_remaining / myMgr.budget_total
      const pickPct = myMgr.picks.length / Object.values(state.roster_slots).reduce((s, v) => s + v, 0)

      // If budget-rich late in draft, aggressive strategy better
      if (budgetPct > 0.5 && pickPct > 0.4 && alt.risk_tolerance === 'aggressive') {
        score += 5
        reasons.push('Budget surplus — can be aggressive')
      }
      // If budget-tight early, conservative better
      if (budgetPct < 0.3 && pickPct < 0.4 && alt.risk_tolerance === 'conservative') {
        score += 5
        reasons.push('Budget tight — shift conservative')
      }
    }
  }

  const reason = reasons.length > 0
    ? reasons.slice(0, 2).join('; ')
    : `${alt.name} may fit better`

  return { score, reason, opportunities: opportunities.slice(0, 3) }
}
