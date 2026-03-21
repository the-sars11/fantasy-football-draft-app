/**
 * Snake Advisor (FF-045, FF-046, FF-048, FF-049)
 *
 * Snake-specific calculations:
 * - FF-045: Draft position tracking — picks until next, who picks before you
 * - FF-046: Best available projection — estimate who'll be available at your next pick
 * - FF-048: Keeper round-cost tracking — show keeper value vs ADP
 * - FF-049: Trade-up/down suggestions — "trade up 2 to grab X before Y"
 */

import type { DraftState } from './state'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'

// --- FF-045: Draft Position Tracking ---

export interface SnakePositionInfo {
  currentRound: number
  currentPick: number
  myDraftPosition: number
  picksUntilMyTurn: number
  myNextPickOverall: number // overall pick number
  picksBetweenMyTurns: number // picks between my consecutive turns
  managersPickingBefore: string[] // who picks before me this round
  isMyPick: boolean
}

export function getSnakePositionInfo(
  state: DraftState,
  managerName: string,
): SnakePositionInfo | null {
  if (state.format !== 'snake') return null
  const mgr = state.managers[managerName]
  if (!mgr) return null

  const teamCount = state.manager_order.length
  const currentRound = state.current_round ?? 1
  const currentPick = state.current_pick_in_round ?? 1
  const myPosition = state.manager_order.indexOf(managerName) + 1 // 1-based

  if (myPosition === 0) return null

  // In snake, odd rounds go forward (1→N), even rounds go backward (N→1)
  const isOddRound = currentRound % 2 === 1
  const myPickInRound = isOddRound ? myPosition : teamCount - myPosition + 1

  const isMyPick = state.current_manager === managerName

  // Calculate picks until my next turn
  let picksUntilMyTurn = 0
  if (!isMyPick) {
    if (myPickInRound > currentPick) {
      // I haven't picked yet this round
      picksUntilMyTurn = myPickInRound - currentPick
    } else {
      // I already picked this round — next pick is next round
      const nextRound = currentRound + 1
      const isNextOdd = nextRound % 2 === 1
      const myPickNextRound = isNextOdd ? myPosition : teamCount - myPosition + 1
      picksUntilMyTurn = (teamCount - currentPick + 1) + (myPickNextRound - 1)
    }
  }

  // Overall pick number for my next pick
  const myNextPickOverall = state.total_picks + picksUntilMyTurn + 1

  // Picks between my turns (always 2*(teamCount-1) in snake, but simplified)
  const picksBetweenMyTurns = 2 * (teamCount - 1)

  // Managers picking before me this round
  const managersPickingBefore: string[] = []
  for (let p = currentPick; p < myPickInRound; p++) {
    const idx = isOddRound ? p - 1 : teamCount - p
    const name = state.manager_order[idx]
    if (name && name !== managerName) {
      managersPickingBefore.push(name)
    }
  }

  return {
    currentRound,
    currentPick,
    myDraftPosition: myPosition,
    picksUntilMyTurn,
    myNextPickOverall,
    picksBetweenMyTurns,
    managersPickingBefore,
    isMyPick,
  }
}

// --- FF-046: Best Available Projection ---

export interface ProjectedAvailability {
  player: ScoredPlayer
  survivalProbability: number // 0-100: chance player is still available
  reason: string
}

/**
 * Estimate which top players will still be available at your next pick.
 * Uses simple heuristic: players drafted proportional to their rank/value.
 */
export function projectBestAvailable(
  state: DraftState,
  managerName: string,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
): ProjectedAvailability[] {
  const posInfo = getSnakePositionInfo(state, managerName)
  if (!posInfo) return []

  const picksUntil = posInfo.picksUntilMyTurn
  if (picksUntil === 0) {
    // It's my pick — all available players are available
    return scoredPlayers
      .filter(sp => !draftedNames.has(sp.player.name.toLowerCase()))
      .slice(0, 10)
      .map(sp => ({
        player: sp,
        survivalProbability: 100,
        reason: 'Your pick now',
      }))
  }

  const available = scoredPlayers
    .filter(sp => !draftedNames.has(sp.player.name.toLowerCase()))
    .sort((a, b) => a.player.consensusRank - b.player.consensusRank)

  // Simple survival model: higher-ranked players are more likely to be picked
  // Each manager picks roughly by consensus rank with some variance
  const results: ProjectedAvailability[] = []
  const teamCount = state.manager_order.length

  for (const sp of available.slice(0, 20)) {
    const rank = sp.player.consensusRank
    const adp = sp.player.adp || rank
    const currentOverallPick = state.total_picks + 1
    const myNextPick = posInfo.myNextPickOverall

    // How many picks is this player "overdue" based on ADP?
    const picksSinceAdp = currentOverallPick - adp
    // If player's ADP is well past, others likely pass. If ADP is near, likely taken.
    const picksOfExposure = picksUntil

    let survival: number
    if (adp > myNextPick + teamCount) {
      // ADP is well after my pick — very likely available
      survival = 95
    } else if (adp > myNextPick) {
      // ADP is after my pick but close
      survival = 70 + Math.min(25, (adp - myNextPick) * 3)
    } else if (adp > currentOverallPick) {
      // ADP is between now and my pick
      const pctThrough = picksOfExposure > 0 ? (myNextPick - adp) / picksOfExposure : 1
      survival = Math.max(5, Math.round(60 - pctThrough * 55))
    } else {
      // ADP already passed — falling. Each pick past ADP reduces chance
      survival = Math.max(5, 40 - Math.abs(picksSinceAdp) * 8)
    }

    let reason: string
    if (survival >= 80) reason = `ADP ${adp} — likely available`
    else if (survival >= 50) reason = `ADP ${adp} — may get picked (${picksUntil} picks away)`
    else reason = `ADP ${adp} — unlikely to last ${picksUntil} more picks`

    results.push({ player: sp, survivalProbability: Math.round(survival), reason })
  }

  return results
    .sort((a, b) => {
      // Sort by: high survival + high strategy score
      const scoreA = a.survivalProbability * 0.4 + a.player.strategyScore * 0.6
      const scoreB = b.survivalProbability * 0.4 + b.player.strategyScore * 0.6
      return scoreB - scoreA
    })
    .slice(0, 10)
}

// --- FF-049: Trade-Up/Down Suggestions ---

export interface TradeSuggestion {
  direction: 'up' | 'down'
  spotsDelta: number
  targetPlayer: string
  targetPosition: string
  threatManager: string
  reasoning: string
  urgency: 'high' | 'medium' | 'low'
}

/**
 * Suggest trade-up opportunities when a high-value target might get taken.
 * Suggest trade-down when there's a run on a position you don't need.
 */
export function getTradeSuggestions(
  state: DraftState,
  managerName: string,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
): TradeSuggestion[] {
  const posInfo = getSnakePositionInfo(state, managerName)
  if (!posInfo || posInfo.picksUntilMyTurn < 2) return []

  const mgr = state.managers[managerName]
  if (!mgr) return []

  const suggestions: TradeSuggestion[] = []

  // Trade-up: if a top strategy target has low survival probability
  const projections = projectBestAvailable(state, managerName, scoredPlayers, draftedNames)
  const topTargets = projections.filter(
    p => p.player.strategyScore >= 70 && p.survivalProbability < 50 && p.survivalProbability > 10,
  )

  for (const target of topTargets.slice(0, 2)) {
    const pos = target.player.player.position
    const posKey = pos === 'DEF' ? 'dst' : pos.toLowerCase()
    const required = state.roster_slots[posKey] ?? 0
    const filled = mgr.roster_count[pos] || 0
    const need = required - filled

    if (need <= 0) continue

    // Find which manager is likely to take them
    const threatManagers = posInfo.managersPickingBefore.filter(mName => {
      const m = state.managers[mName]
      if (!m) return false
      const mFilled = m.roster_count[pos] || 0
      return required - mFilled > 0
    })

    if (threatManagers.length > 0) {
      suggestions.push({
        direction: 'up',
        spotsDelta: Math.min(posInfo.picksUntilMyTurn, 3),
        targetPlayer: target.player.player.name,
        targetPosition: pos,
        threatManager: threatManagers[0],
        reasoning: `${target.player.player.name} (${pos}) has ${target.survivalProbability}% chance of surviving — ${threatManagers[0]} also needs ${pos}`,
        urgency: target.survivalProbability < 25 ? 'high' : 'medium',
      })
    }
  }

  return suggestions.slice(0, 3)
}
