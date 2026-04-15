/**
 * Snake Draft LLM Recommendations (FF-266)
 *
 * Snake-specific client helper: ADP/rank-based payload,
 * round-targeting prompt, pickRound in response (no budget/maxBid).
 *
 * Calls /api/draft/recommend with format:'snake'.
 */

import type { DraftState } from './state'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy, ScoringSettings } from '@/lib/supabase/database.types'

export interface LLMSnakeTarget {
  name: string
  position: string
  /** Round by which to target this player before they get drafted */
  pickRound: number
  reasoning: string
  confidence: 'high' | 'medium' | 'low'
}

export interface LLMSnakeRecommendation {
  targets: LLMSnakeTarget[]
  summary: string
}

// --- Client-side cache ---

interface CacheEntry {
  key: string
  result: LLMSnakeRecommendation
  timestamp: number
}

let cache: CacheEntry | null = null
const CACHE_TTL_MS = 30_000

function buildCacheKey(pickCount: number, strategyId: string | null, managerName: string): string {
  return `snake:${pickCount}:${strategyId ?? 'none'}:${managerName}`
}

export async function fetchSnakeRecommendation(
  state: DraftState,
  managerName: string,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
  strategy: DbStrategy | null,
  scoringSettings?: ScoringSettings | null,
): Promise<LLMSnakeRecommendation> {
  if (state.format !== 'snake') throw new Error('fetchSnakeRecommendation called in auction mode')

  const mgr = state.managers[managerName]
  if (!mgr) throw new Error(`Manager "${managerName}" not found`)

  const cacheKey = buildCacheKey(state.picks.length, strategy?.id ?? null, managerName)
  if (cache && cache.key === cacheKey && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.result
  }

  const totalSlots = Object.values(state.roster_slots).reduce((s, v) => s + v, 0)

  const rosterNeeds: Record<string, number> = {}
  const posMap: Record<string, string> = { qb: 'QB', rb: 'RB', wr: 'WR', te: 'TE', k: 'K', dst: 'DEF' }
  for (const [key, required] of Object.entries(state.roster_slots)) {
    if (key === 'flex' || key === 'superflex' || key === 'bench') continue
    const pos = posMap[key] ?? key.toUpperCase()
    const filled = mgr.roster_count[pos] || 0
    const need = required - filled
    if (need > 0) rosterNeeds[pos] = need
  }

  // Snake: send ADP/rank, not auction values
  const topAvailable = scoredPlayers
    .filter(sp => !draftedNames.has(sp.player.name.toLowerCase()))
    .sort((a, b) => b.strategyScore - a.strategyScore)
    .slice(0, 12)
    .map(sp => ({
      name: sp.player.name,
      position: sp.player.position,
      adp: sp.player.adp,
      consensusRank: sp.player.consensusRank,
      adjustedRound: sp.adjustedRoundValue,
      strategyScore: sp.strategyScore,
    }))

  // Snake picks include round, no price
  const recentPicks = state.picks.slice(-3).reverse().map(p => ({
    player: p.player_name,
    position: p.position ?? '?',
    manager: p.manager,
    round: p.round,
  }))

  const res = await fetch('/api/draft/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      managerName,
      format: 'snake',
      rosterNeeds,
      picksMade: mgr.picks.length,
      totalSlots,
      currentRound: state.current_round,
      strategyName: strategy?.name,
      strategyArchetype: strategy?.archetype,
      scoringSettings: scoringSettings ?? null,
      topAvailable,
      recentPicks,
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    throw new Error(err.error || 'Failed to get snake recommendation')
  }

  const data = await res.json()
  const result: LLMSnakeRecommendation = data.recommendation
  cache = { key: cacheKey, result, timestamp: Date.now() }
  return result
}

export function clearSnakeRecommendationCache() {
  cache = null
}
