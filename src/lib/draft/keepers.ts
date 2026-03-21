/**
 * Keeper Logic (FF-029)
 *
 * Handles keeper player management for keeper leagues.
 * - Mark kept players + their costs/rounds per manager
 * - Exclude keepers from available player pool
 * - Adjust remaining budget (auction) or mark rounds used (snake)
 * - Calculate keeper value vs. market (ADP / auction value)
 */

import type { DraftFormat, Position } from '@/lib/supabase/database.types'
import type { Player } from '@/lib/players/types'
import type { DraftPick, DraftState } from './state'

// --- Types ---

export interface KeeperAssignment {
  player_name: string
  position: Position
  manager: string
  /** Auction: price paid. Snake: round number (1-based). */
  cost: number
}

export interface KeeperValue {
  player_name: string
  position: Position
  manager: string
  cost: number
  /** Market value for comparison (auction value or ADP round). */
  marketValue: number
  /** Positive = good deal, negative = overpay. */
  surplus: number
}

// --- Validation ---

/**
 * Validate keeper assignments before applying them.
 * Returns array of error messages (empty = valid).
 */
export function validateKeepers(
  keepers: KeeperAssignment[],
  format: DraftFormat,
  maxKeepers: number,
  managerNames: string[],
): string[] {
  const errors: string[] = []

  // Check max keepers per manager
  const perManager = new Map<string, number>()
  for (const k of keepers) {
    const count = (perManager.get(k.manager) ?? 0) + 1
    perManager.set(k.manager, count)
    if (count > maxKeepers) {
      errors.push(`${k.manager} has more than ${maxKeepers} keeper(s)`)
    }
  }

  // Check no duplicate players
  const playerNames = keepers.map(k => k.player_name.toLowerCase())
  const uniqueNames = new Set(playerNames)
  if (uniqueNames.size !== playerNames.length) {
    errors.push('Duplicate keeper player detected')
  }

  // Check all managers exist
  const validManagers = new Set(managerNames.map(n => n.toLowerCase()))
  for (const k of keepers) {
    if (!validManagers.has(k.manager.toLowerCase())) {
      errors.push(`Unknown manager: ${k.manager}`)
    }
  }

  // Check costs are positive
  for (const k of keepers) {
    if (k.cost <= 0) {
      errors.push(`${k.player_name}: cost must be positive`)
    }
    if (format === 'snake' && !Number.isInteger(k.cost)) {
      errors.push(`${k.player_name}: round must be a whole number`)
    }
  }

  return errors
}

// --- State Integration ---

/**
 * Convert keeper assignments into DraftPick objects.
 * Keeper picks use pick_number starting from negative values
 * to distinguish them from real draft picks.
 */
export function keepersToPicks(keepers: KeeperAssignment[], format: DraftFormat): DraftPick[] {
  return keepers.map((k, i) => ({
    pick_number: -(i + 1), // negative = keeper pick
    player_name: k.player_name,
    position: k.position,
    manager: k.manager,
    price: format === 'auction' ? k.cost : undefined,
    round: format === 'snake' ? k.cost : undefined,
    is_keeper: true,
  }))
}

/**
 * Apply keepers to a fresh draft state.
 * - Deducts budget for auction keepers
 * - Fills roster slots for both formats
 * - Marks players as drafted
 *
 * Returns updated state with keepers pre-applied.
 */
export function applyKeepersToState(
  state: DraftState,
  keepers: KeeperAssignment[],
  format: DraftFormat,
): DraftState {
  let current = { ...state }
  const newManagers = { ...current.managers }

  for (const keeper of keepers) {
    const manager = newManagers[keeper.manager]
    if (!manager) continue

    const updatedManager = {
      ...manager,
      picks: [...manager.picks, {
        pick_number: -(manager.picks.filter(p => p.pick_number < 0).length + 1),
        player_name: keeper.player_name,
        position: keeper.position,
        manager: keeper.manager,
        price: format === 'auction' ? keeper.cost : undefined,
        round: format === 'snake' ? keeper.cost : undefined,
        is_keeper: true,
      } as DraftPick],
      roster_count: { ...manager.roster_count },
    }

    // Track position
    const pos = keeper.position.toUpperCase()
    updatedManager.roster_count[pos] = (updatedManager.roster_count[pos] || 0) + 1

    // Deduct auction budget
    if (format === 'auction' && updatedManager.budget_remaining !== undefined) {
      updatedManager.budget_remaining -= keeper.cost
    }

    newManagers[keeper.manager] = updatedManager
  }

  // Add keeper picks to the global keepers list (not the regular picks array)
  current = {
    ...current,
    managers: newManagers,
    keepers: keepers,
  }

  return current
}

// --- Value Analysis ---

/**
 * Calculate keeper value vs. market for display.
 * Positive surplus = keeper is a bargain.
 */
export function analyzeKeeperValues(
  keepers: KeeperAssignment[],
  players: Player[],
  format: DraftFormat,
): KeeperValue[] {
  return keepers.map(k => {
    const player = players.find(
      p => p.name.toLowerCase() === k.player_name.toLowerCase()
    )

    let marketValue: number
    if (format === 'auction') {
      marketValue = player?.consensusAuctionValue ?? k.cost
    } else {
      // For snake, lower ADP round = more valuable
      marketValue = player ? Math.ceil(player.adp / 12) : k.cost // rough round estimate
    }

    const surplus = format === 'auction'
      ? marketValue - k.cost // positive = paid less than market
      : k.cost - marketValue // positive = keeping in later round than ADP suggests

    return {
      player_name: k.player_name,
      position: k.position,
      manager: k.manager,
      cost: k.cost,
      marketValue,
      surplus,
    }
  })
}

/**
 * Get all keeper player names (lowercased) for filtering from available pool.
 */
export function getKeeperNames(keepers: KeeperAssignment[]): Set<string> {
  return new Set(keepers.map(k => k.player_name.toLowerCase()))
}

/**
 * Get keepers for a specific manager.
 */
export function getManagerKeepers(
  keepers: KeeperAssignment[],
  managerName: string,
): KeeperAssignment[] {
  return keepers.filter(
    k => k.manager.toLowerCase() === managerName.toLowerCase()
  )
}
