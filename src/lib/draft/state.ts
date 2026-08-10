/**
 * Draft State Machine
 *
 * Core types and state management for live drafts.
 * Supports both auction and snake draft formats.
 * Tracks per-manager: budget/picks, roster slots, position needs.
 */

import type { DraftFormat, Position, RosterSlots } from '@/lib/supabase/database.types'

// Type kept for DB backward-compat; keeper feature removed 2026-08-09
export interface KeeperAssignment {
  player_name: string
  position?: string
  manager: string
  cost?: number
  round?: number
}

// --- Types ---

export interface DraftPick {
  pick_number: number
  player_name: string
  position?: string
  manager: string
  price?: number   // auction
  round?: number   // snake
  is_keeper?: boolean // true if this pick was a pre-draft keeper
  provisional?: boolean // true = recorded while offline from auctioneer (FF-315)
}

// ---------------------------------------------------------------------------
// FF-315: Offline resync types
// ---------------------------------------------------------------------------

/** Minimal auctioneer pick shape needed for reconciliation. */
export interface AuctioneerPickSnapshot {
  player_name: string
  manager: string
  price: number
  position?: string
}

/** A provisional pick whose price or manager differed from the auctioneer. */
export interface PickCorrection {
  playerName: string
  loggedPrice: number
  actualPrice: number
  loggedManager: string
  actualManager: string
}

export interface ReconciliationResult {
  picks: DraftPick[]                          // updated picks array (corrections applied, provisional cleared)
  corrections: PickCorrection[]               // picks that were auto-corrected (for toast)
  newPicksFromAuctioneer: AuctioneerPickSnapshot[] // in auctioneer but absent from state (fold in via addManualPick)
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
  // Keeper support (FF-029)
  keepers: KeeperAssignment[]
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
    keepers: [],
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

  // Check if draft is complete. Keepers fill roster slots but live in state.keepers
  // (and per-manager picks), not state.picks, so they must be counted here or a keeper
  // league can never reach total_roster_spots and never flips to 'completed'.
  const isComplete = newTotal + state.keepers.length >= state.total_roster_spots

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
/**
 * Remove the pick with the given pick_number and renumber the remainder so pick
 * numbers stay contiguous (1..n). Returns a new array; the input is not mutated.
 * Keepers are not affected (they live in state.keepers, never state.picks).
 */
export function removePickByNumber(picks: DraftPick[], pickNumber: number): DraftPick[] {
  return picks
    .filter(p => p.pick_number !== pickNumber)
    .map((p, i) => ({ ...p, pick_number: i + 1 }))
}

/**
 * Apply changes to the pick with the given pick_number (e.g. correct a price,
 * manager, player, or position). pick_number itself is preserved. Returns a new
 * array; the input is not mutated. No-op if no pick matches.
 */
export function editPickByNumber(
  picks: DraftPick[],
  pickNumber: number,
  changes: Partial<Omit<DraftPick, 'pick_number'>>,
): DraftPick[] {
  return picks.map(p =>
    p.pick_number === pickNumber ? { ...p, ...changes } : p,
  )
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
 * Includes keeper players.
 */
export function getDraftedPlayerNames(state: DraftState): Set<string> {
  const names = new Set(state.picks.map(p => p.player_name.toLowerCase()))
  // Also include keepers (they're on rosters but not in the picks array)
  for (const k of state.keepers) {
    names.add(k.player_name.toLowerCase())
  }
  return names
}

/**
 * FF-315: Reconcile provisional picks against the auctioneer's full pick snapshot.
 *
 * Called on reconnect after the phone was offline from a connected auctioneer.
 * The auctioneer is the system of record — it always wins on discrepancies.
 *
 * Match key: player_name (case-insensitive, trimmed). Both the app and the
 * auctioneer pull from the same Sleeper database so names are consistent.
 *
 * Returns:
 *   picks                 — new picks array with corrections applied + `provisional`
 *                           cleared on confirmed picks (input is NOT mutated)
 *   corrections           — subset that was auto-corrected (for the toast)
 *   newPicksFromAuctioneer — auctioneer picks absent from state (fold in via addManualPick)
 */
export function reconcileWithAuctioneerPicks(
  currentPicks: DraftPick[],
  auctioneerPicks: AuctioneerPickSnapshot[],
): ReconciliationResult {
  const corrections: PickCorrection[] = []

  // Build a name→snapshot map for O(1) auctioneer lookups.
  const auctioneerByName = new Map<string, AuctioneerPickSnapshot>()
  for (const ap of auctioneerPicks) {
    auctioneerByName.set(ap.player_name.toLowerCase().trim(), ap)
  }

  // Names already in state — used to find net-new auctioneer picks.
  const stateNames = new Set<string>()
  for (const sp of currentPicks) {
    stateNames.add(sp.player_name.toLowerCase().trim())
  }

  // Process each pick in state.
  const reconciledPicks = currentPicks.map((pick): DraftPick => {
    if (!pick.provisional) return pick  // non-provisional: untouched

    const key = pick.player_name.toLowerCase().trim()
    const ap = auctioneerByName.get(key)

    if (!ap) {
      // Not yet in auctioneer → stays provisional ("unconfirmed")
      return pick
    }

    const priceMatch = ap.price === (pick.price ?? 0)
    const managerMatch = ap.manager.toLowerCase().trim() === pick.manager.toLowerCase().trim()

    if (priceMatch && managerMatch) {
      // Values match → confirmed, clear provisional flag.
      return { ...pick, provisional: undefined }
    }

    // Values differ → auctioneer wins.
    corrections.push({
      playerName: pick.player_name,
      loggedPrice: pick.price ?? 0,
      actualPrice: ap.price,
      loggedManager: pick.manager,
      actualManager: ap.manager,
    })

    return {
      ...pick,
      price: ap.price,
      manager: ap.manager,
      position: ap.position ?? pick.position,
      provisional: undefined,
    }
  })

  // Find auctioneer picks not yet in state.
  const newPicksFromAuctioneer: AuctioneerPickSnapshot[] = []
  for (const ap of auctioneerPicks) {
    if (!stateNames.has(ap.player_name.toLowerCase().trim())) {
      newPicksFromAuctioneer.push(ap)
    }
  }

  return { picks: reconciledPicks, corrections, newPicksFromAuctioneer }
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
