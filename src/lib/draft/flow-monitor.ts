/**
 * Draft Flow Monitor (FF-P02)
 *
 * Continuous analysis of draft state:
 * - Position runs (3+ consecutive picks at same position)
 * - Value anomalies (players going way above/below consensus)
 * - Spending patterns (auction: league-wide budget burn rate)
 * - Remaining pool quality by position
 */

import type { DraftState, DraftPick } from '@/lib/draft/state'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'

export interface PositionRun {
  position: string
  count: number        // how many consecutive picks
  managers: string[]   // who's drafting this position
  startPick: number
}

export interface ValueAnomaly {
  playerName: string
  position: string
  manager: string
  price?: number         // auction: actual price paid
  consensusValue?: number // expected value
  delta: number          // positive = overpay, negative = bargain
  type: 'overpay' | 'bargain'
}

export interface SpendingPattern {
  avgPricePerPick: number
  budgetBurnRate: number // % of total league budget spent so far
  pickProgress: number   // % of total picks made
  aheadOrBehind: 'ahead' | 'behind' | 'on_track'
}

export interface PoolQuality {
  position: string
  remainingCount: number
  avgScore: number      // average strategy score of remaining players
  topPlayerName: string | null
  topPlayerScore: number
}

export interface DraftFlowState {
  currentRuns: PositionRun[]
  recentAnomalies: ValueAnomaly[]
  spending: SpendingPattern | null
  poolQuality: PoolQuality[]
  alerts: FlowAlert[]
}

export interface FlowAlert {
  type: 'position_run' | 'value_anomaly' | 'spending' | 'pool_depletion'
  severity: 'info' | 'warning' | 'critical'
  message: string
  pickNumber: number
}

export function analyzeDraftFlow(
  state: DraftState,
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
  players: Player[],
): DraftFlowState {
  const currentRuns = detectPositionRuns(state.picks)
  const recentAnomalies = detectValueAnomalies(state, players)
  const spending = state.format === 'auction' ? analyzeSpending(state) : null
  const poolQuality = analyzePoolQuality(scoredPlayers, draftedNames)
  const alerts = generateAlerts(currentRuns, recentAnomalies, spending, poolQuality, state)

  return { currentRuns, recentAnomalies, spending, poolQuality, alerts }
}

function detectPositionRuns(picks: DraftPick[]): PositionRun[] {
  if (picks.length < 3) return []

  const runs: PositionRun[] = []
  const recent = picks.slice(-10) // look at last 10 picks

  let currentPos = ''
  let runCount = 0
  let runManagers: string[] = []
  let runStart = 0

  for (const pick of recent) {
    const pos = pick.position?.toUpperCase() || ''
    if (pos === currentPos && pos !== '') {
      runCount++
      runManagers.push(pick.manager)
    } else {
      if (runCount >= 3) {
        runs.push({
          position: currentPos,
          count: runCount,
          managers: [...new Set(runManagers)],
          startPick: runStart,
        })
      }
      currentPos = pos
      runCount = 1
      runManagers = [pick.manager]
      runStart = pick.pick_number
    }
  }

  // Check final run
  if (runCount >= 3) {
    runs.push({
      position: currentPos,
      count: runCount,
      managers: [...new Set(runManagers)],
      startPick: runStart,
    })
  }

  return runs
}

function detectValueAnomalies(state: DraftState, players: Player[]): ValueAnomaly[] {
  if (state.format !== 'auction') return []

  const anomalies: ValueAnomaly[] = []
  const recent = state.picks.slice(-5) // last 5 picks

  const playerMap = new Map(players.map(p => [p.name.toLowerCase(), p]))

  for (const pick of recent) {
    if (pick.price == null) continue
    const player = playerMap.get(pick.player_name.toLowerCase())
    if (!player) continue

    const consensus = player.consensusAuctionValue
    if (!consensus || consensus <= 0) continue

    const delta = pick.price - consensus
    const pctDelta = Math.abs(delta) / consensus

    // Flag if >40% deviation from consensus
    if (pctDelta > 0.4 && Math.abs(delta) >= 3) {
      anomalies.push({
        playerName: pick.player_name,
        position: pick.position || '',
        manager: pick.manager,
        price: pick.price,
        consensusValue: consensus,
        delta,
        type: delta > 0 ? 'overpay' : 'bargain',
      })
    }
  }

  return anomalies
}

function analyzeSpending(state: DraftState): SpendingPattern {
  let totalSpent = 0
  let totalBudget = 0
  let totalPicks = 0
  const totalSlots = Object.values(state.roster_slots).reduce((s, v) => s + v, 0)
  const totalDraftSlots = totalSlots * state.manager_order.length

  for (const mgr of Object.values(state.managers)) {
    totalBudget += mgr.budget_total ?? 200
    for (const pick of mgr.picks) {
      if (pick.price) totalSpent += pick.price
      totalPicks++
    }
  }

  const budgetBurnRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
  const pickProgress = totalDraftSlots > 0 ? (totalPicks / totalDraftSlots) * 100 : 0
  const avgPricePerPick = totalPicks > 0 ? Math.round(totalSpent / totalPicks) : 0

  let aheadOrBehind: 'ahead' | 'behind' | 'on_track' = 'on_track'
  if (budgetBurnRate > pickProgress + 10) aheadOrBehind = 'ahead'
  else if (budgetBurnRate < pickProgress - 10) aheadOrBehind = 'behind'

  return { avgPricePerPick, budgetBurnRate, pickProgress, aheadOrBehind }
}

function analyzePoolQuality(
  scoredPlayers: ScoredPlayer[],
  draftedNames: Set<string>,
): PoolQuality[] {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']
  const quality: PoolQuality[] = []

  for (const pos of positions) {
    const available = scoredPlayers.filter(
      sp => sp.player.position === pos && !draftedNames.has(sp.player.name.toLowerCase()),
    )

    const avgScore = available.length > 0
      ? Math.round(available.reduce((s, sp) => s + sp.strategyScore, 0) / available.length)
      : 0

    const top = available.length > 0
      ? available.reduce((best, sp) => sp.strategyScore > best.strategyScore ? sp : best)
      : null

    quality.push({
      position: pos,
      remainingCount: available.length,
      avgScore,
      topPlayerName: top?.player.name ?? null,
      topPlayerScore: top?.strategyScore ?? 0,
    })
  }

  return quality
}

function generateAlerts(
  runs: PositionRun[],
  anomalies: ValueAnomaly[],
  spending: SpendingPattern | null,
  poolQuality: PoolQuality[],
  state: DraftState,
): FlowAlert[] {
  const alerts: FlowAlert[] = []
  const pickNum = state.total_picks

  // Position run alerts
  for (const run of runs) {
    alerts.push({
      type: 'position_run',
      severity: run.count >= 5 ? 'critical' : 'warning',
      message: `${run.position} run: ${run.count} straight picks`,
      pickNumber: pickNum,
    })
  }

  // Value anomaly alerts
  for (const anomaly of anomalies) {
    if (anomaly.type === 'bargain') {
      alerts.push({
        type: 'value_anomaly',
        severity: 'info',
        message: `${anomaly.playerName} went for $${anomaly.price} (consensus $${anomaly.consensusValue})`,
        pickNumber: pickNum,
      })
    } else {
      alerts.push({
        type: 'value_anomaly',
        severity: 'warning',
        message: `${anomaly.playerName} overpaid at $${anomaly.price} (consensus $${anomaly.consensusValue})`,
        pickNumber: pickNum,
      })
    }
  }

  // Pool depletion alerts
  for (const pq of poolQuality) {
    if (pq.position !== 'K' && pq.position !== 'DEF' && pq.remainingCount <= 3) {
      alerts.push({
        type: 'pool_depletion',
        severity: 'critical',
        message: `Only ${pq.remainingCount} ${pq.position}s left`,
        pickNumber: pickNum,
      })
    }
  }

  // Spending alerts
  if (spending && spending.aheadOrBehind === 'ahead' && spending.budgetBurnRate > 60) {
    alerts.push({
      type: 'spending',
      severity: 'warning',
      message: `League spending ahead of pace: ${Math.round(spending.budgetBurnRate)}% budget, ${Math.round(spending.pickProgress)}% picks`,
      pickNumber: pickNum,
    })
  }

  return alerts
}
