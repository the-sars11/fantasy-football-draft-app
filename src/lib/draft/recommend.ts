/**
 * Real-Time LLM Recommendations (FF-041)
 *
 * Client-side helper to call the /api/draft/recommend endpoint.
 * Builds the request payload from current draft state + scored players.
 */

import type { DraftState } from './state'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

export interface LLMTarget {
  name: string
  position: string
  maxBid: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

export interface LLMRecommendation {
  targets: LLMTarget[]
  summary: string
}

export async function fetchRecommendation(
  state: DraftState,
  managerName: string,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
  strategy: DbStrategy | null,
): Promise<LLMRecommendation> {
  const mgr = state.managers[managerName]
  if (!mgr) throw new Error(`Manager "${managerName}" not found`)

  const totalSlots = Object.values(state.roster_slots).reduce((s, v) => s + v, 0)

  // Build roster needs
  const rosterNeeds: Record<string, number> = {}
  const posMap: Record<string, string> = { qb: 'QB', rb: 'RB', wr: 'WR', te: 'TE', k: 'K', dst: 'DEF' }
  for (const [key, required] of Object.entries(state.roster_slots)) {
    if (key === 'flex' || key === 'superflex' || key === 'bench') continue
    const pos = posMap[key] ?? key.toUpperCase()
    const filled = mgr.roster_count[pos] || 0
    const need = required - filled
    if (need > 0) rosterNeeds[pos] = need
  }

  // Top available by strategy score
  const available = scoredPlayers
    .filter(sp => !draftedNames.has(sp.player.name.toLowerCase()))
    .sort((a, b) => b.strategyScore - a.strategyScore)
    .slice(0, 15)
    .map(sp => ({
      name: sp.player.name,
      position: sp.player.position,
      consensusValue: sp.player.consensusAuctionValue ?? 0,
      strategyScore: sp.strategyScore,
      adjustedValue: sp.adjustedAuctionValue,
    }))

  // Recent picks
  const recentPicks = state.picks.slice(-5).reverse().map(p => ({
    player: p.player_name,
    position: p.position ?? '?',
    manager: p.manager,
    price: p.price,
  }))

  const res = await fetch('/api/draft/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      managerName,
      format: state.format,
      budgetRemaining: mgr.budget_remaining,
      budgetTotal: mgr.budget_total,
      rosterNeeds,
      picksMade: mgr.picks.length,
      totalSlots,
      currentRound: state.current_round,
      strategyName: strategy?.name,
      strategyArchetype: strategy?.archetype,
      topAvailable: available,
      recentPicks,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to get recommendation')
  }

  const data = await res.json()
  return data.recommendation
}
