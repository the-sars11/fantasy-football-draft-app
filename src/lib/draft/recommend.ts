/**
 * Real-Time LLM Recommendations (FF-041, FF-055)
 *
 * Client-side helper to call the /api/draft/recommend endpoint.
 * Builds the request payload from current draft state + scored players.
 *
 * FF-055 optimizations:
 * - Client-side cache: skips API call if pick count + strategy haven't changed
 * - Sends only top 12 players (down from 15) to reduce token count
 * - Server uses Haiku model for speed
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

// --- Client-side recommendation cache ---

interface CacheEntry {
  key: string
  result: LLMRecommendation
  timestamp: number
}

let cachedRecommendation: CacheEntry | null = null
const CACHE_TTL_MS = 30_000 // 30 seconds

function buildCacheKey(pickCount: number, strategyId: string | null, managerName: string): string {
  return `${pickCount}:${strategyId ?? 'none'}:${managerName}`
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

  // Check cache — if pick count + strategy haven't changed, return cached result
  const cacheKey = buildCacheKey(state.picks.length, strategy?.id ?? null, managerName)
  if (
    cachedRecommendation &&
    cachedRecommendation.key === cacheKey &&
    Date.now() - cachedRecommendation.timestamp < CACHE_TTL_MS
  ) {
    return cachedRecommendation.result
  }

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

  // Top available by strategy score — reduced to 12 for lower latency
  const available = scoredPlayers
    .filter(sp => !draftedNames.has(sp.player.name.toLowerCase()))
    .sort((a, b) => b.strategyScore - a.strategyScore)
    .slice(0, 12)
    .map(sp => ({
      name: sp.player.name,
      position: sp.player.position,
      consensusValue: sp.player.consensusAuctionValue ?? 0,
      strategyScore: sp.strategyScore,
      adjustedValue: sp.adjustedAuctionValue,
    }))

  // Recent picks — reduced to 3 for lower latency
  const recentPicks = state.picks.slice(-3).reverse().map(p => ({
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
  const result: LLMRecommendation = data.recommendation

  // Cache the result
  cachedRecommendation = { key: cacheKey, result, timestamp: Date.now() }

  return result
}

/** Clear the recommendation cache (e.g., on strategy swap) */
export function clearRecommendationCache() {
  cachedRecommendation = null
}
