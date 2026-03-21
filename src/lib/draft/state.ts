/**
 * Draft State Machine
 *
 * Core types and state management for live drafts.
 * Supports both auction and snake draft formats.
 * Tracks per-manager: budget/picks, roster slots, position needs.
 */

import type { DraftFormat, Position, RosterSlots } from '@/lib/supabase/database.types'
import type { SheetRow } from '@/lib/sheets'

// --- Types ---

export interface DraftPick {
  pick_number: number
  player_name: string
  position?: string
  manager: string
  price?: number   // auction
  round?: number   // snake
}

export interface ManagerState {
  name: string
  picks: DraftPick[]
  // Auction
  budget_remaining?: number
  budget_total?: number
  // Snake
  draft_position?: number
  // Roster tracking
  roster_count: Record<string, number>  // e.g. { QB: 1, RB: 2 }
}

export interface DraftState {
  format: DraftFormat
  status: 'setup' | 'live' | 'paused' | 'completed'
  picks: DraftPick[]
  managers: Record<string, ManagerState>
  manager_order: string[]  // ordered list of manager names
  roster_slots: RosterSlots
  // Snake-specific
  current_round?: number
  current_pick_in_round?: number
  current_manager?: string
  // Totals
  total_picks: number
  total_roster_spots: number // team_count * sum(roster_slots)
}

// --- State creation ---

export function createInitialState(
  format: DraftFormat,
  managers: Array<{ name: string; budget?: number; draft_position?: number }>,
  rosterSlots: RosterSlots,
): DraftState {
  const managerMap: Record<string, ManagerState> = {}
  const managerOrder: string[] = []

  for (const m of managers) {
    managerMap[m.name] = {
      name: m.name,
      picks: [],
      budget_remaining: format === 'auction' ? m.budget : undefined,
      budget_total: format === 'auction' ? m.budget : undefined,
      draft_position: format === 'snake' ? m.draft_position : undefined,
      roster_count: {},
    }
    managerOrder.push(m.name)
  }

  const totalRosterSpots = Object.values(rosterSlots).reduce((sum, v) => sum + v, 0)

  return {
    format,
    status: 'live',
    picks: [],
    managers: managerMap,
    manager_order: managerOrder,
    roster_slots: rosterSlots,
    current_round: format === 'snake' ? 1 : undefined,
    current_pick_in_round: format === 'snake' ? 1 : undefined,
    current_manager: format === 'snake' ? managerOrder[0] : undefined,
    total_picks: 0,
    total_roster_spots: totalRosterSpots * managers.length,
  }
}

// --- State updates ---

/**
 * Apply a pick to the draft state. Returns updated state (immutable).
 */
export function applyPick(state: DraftState, pick: DraftPick): DraftState {
  const newPicks = [...state.picks, pick]
  const manager = state.managers[pick.manager]

  if (!manager) {
    console.warn(`Unknown manager: ${pick.manager}`)
    return { ...state, picks: newPicks, total_picks: newPicks.length }
  }

  // Update manager state
  const updatedManager: ManagerState = {
    ...manager,
    picks: [...manager.picks, pick],
    roster_count: { ...manager.roster_count },
  }

  // Track position
  if (pick.position) {
    const pos = pick.position.toUpperCase()
    updatedManager.roster_count[pos] = (updatedManager.roster_count[pos] || 0) + 1
  }

  // Auction: deduct price
  if (state.format === 'auction' && pick.price !== undefined && updatedManager.budget_remaining !== undefined) {
    updatedManager.budget_remaining -= pick.price
  }

  const newManagers = { ...state.managers, [pick.manager]: updatedManager }
  const newTotal = newPicks.length

  // Snake: advance turn
  let currentRound = state.current_round
  let currentPickInRound = state.current_pick_in_round
  let currentManager = state.current_manager

  if (state.format === 'snake' && currentRound !== undefined && currentPickInRound !== undefined) {
    const teamCount = state.manager_order.length
    currentPickInRound++

    if (currentPickInRound > teamCount) {
      currentRound++
      currentPickInRound = 1
    }

    // Snake order: odd rounds go forward, even rounds go backward
    const orderIdx = currentRound % 2 === 1
      ? currentPickInRound - 1
      : teamCount - currentPickInRound

    currentManager = state.manager_order[orderIdx] || state.manager_order[0]
  }

  // Check if draft is complete
  const isComplete = newTotal >= state.total_roster_spots

  return {
    ...state,
    picks: newPicks,
    managers: newManagers,
    total_picks: newTotal,
    current_round: currentRound,
    current_pick_in_round: currentPickInRound,
    current_manager: currentManager,
    status: isComplete ? 'completed' : state.status,
  }
}

/**
 * Convert sheet rows into DraftPick objects and apply them to state.
 * Skips rows that are already tracked (by pick_number).
 */
export function applySheetRows(state: DraftState, rows: SheetRow[]): DraftState {
  let current = state
  const existingCount = state.picks.length

  for (let i = 0; i < rows.length; i++) {
    const pickNumber = i + 1
    if (pickNumber <= existingCount) continue // already tracked

    const row = rows[i]
    const pick: DraftPick = {
      pick_number: pickNumber,
      player_name: row.player_name,
      position: row.position,
      manager: row.manager,
      price: row.price,
      round: row.round ?? (current.current_round),
    }

    current = applyPick(current, pick)
  }

  return current
}

// --- Queries ---

/**
 * Get remaining budget for a manager (auction only).
 */
export function getRemainingBudget(state: DraftState, managerName: string): number | null {
  if (state.format !== 'auction') return null
  return state.managers[managerName]?.budget_remaining ?? null
}

/**
 * Get position needs for a manager based on roster slots.
 */
export function getPositionNeeds(state: DraftState, managerName: string): Record<string, number> {
  const manager = state.managers[managerName]
  if (!manager) return {}

  const needs: Record<string, number> = {}
  for (const [pos, required] of Object.entries(state.roster_slots)) {
    const filled = manager.roster_count[pos.toUpperCase()] || 0
    const remaining = Math.max(0, required - filled)
    if (remaining > 0) {
      needs[pos.toUpperCase()] = remaining
    }
  }

  return needs
}

/**
 * Get list of all drafted player names (for filtering available pool).
 */
export function getDraftedPlayerNames(state: DraftState): Set<string> {
  return new Set(state.picks.map(p => p.player_name.toLowerCase()))
}

/**
 * Max bid a manager can make in auction (must leave $1 per empty slot).
 */
export function getMaxBid(state: DraftState, managerName: string): number | null {
  if (state.format !== 'auction') return null
  const manager = state.managers[managerName]
  if (!manager || manager.budget_remaining === undefined) return null

  const totalSlots = Object.values(state.roster_slots).reduce((s, v) => s + v, 0)
  const filledSlots = manager.picks.length
  const emptySlots = Math.max(0, totalSlots - filledSlots - 1) // -1 for current pick

  return Math.max(1, manager.budget_remaining - emptySlots)
}
