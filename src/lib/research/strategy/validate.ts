/**
 * Strategy Validation (FF-S02)
 *
 * Enforces format separation (auction vs snake) and data integrity.
 * Auction strategies MUST NOT have snake fields. Snake MUST NOT have auction fields.
 */

import type { DraftFormat } from '@/lib/players/types'
import type { StrategyInsert, StrategyUpdate, Position as DbPosition } from '@/lib/supabase/database.types'
import { AUCTION_ARCHETYPES, SNAKE_ARCHETYPES } from './presets'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

const POSITIONS: DbPosition[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']

export function validateStrategy(
  strategy: StrategyInsert | StrategyUpdate,
  format: DraftFormat
): ValidationResult {
  const errors: string[] = []

  // --- Archetype must match format ---
  if ('archetype' in strategy && strategy.archetype) {
    const isAuctionArchetype = (AUCTION_ARCHETYPES as readonly string[]).includes(strategy.archetype)
    const isSnakeArchetype = (SNAKE_ARCHETYPES as readonly string[]).includes(strategy.archetype)

    if (format === 'auction' && isSnakeArchetype) {
      errors.push(`Archetype "${strategy.archetype}" is a snake archetype — cannot use with auction format`)
    }
    if (format === 'snake' && isAuctionArchetype) {
      errors.push(`Archetype "${strategy.archetype}" is an auction archetype — cannot use with snake format`)
    }
  }

  // --- Format field enforcement: no cross-contamination ---
  if (format === 'auction') {
    if (strategy.round_targets !== undefined && strategy.round_targets !== null) {
      errors.push('Auction strategies must not have round_targets (snake-only field)')
    }
    if (strategy.position_round_priority !== undefined && strategy.position_round_priority !== null) {
      errors.push('Auction strategies must not have position_round_priority (snake-only field)')
    }
  }

  if (format === 'snake') {
    if (strategy.budget_allocation !== undefined && strategy.budget_allocation !== null) {
      errors.push('Snake strategies must not have budget_allocation (auction-only field)')
    }
    if (strategy.max_bid_percentage !== undefined && strategy.max_bid_percentage !== null) {
      errors.push('Snake strategies must not have max_bid_percentage (auction-only field)')
    }
  }

  // --- Position weights: must be 1-10 ---
  if (strategy.position_weights) {
    for (const pos of POSITIONS) {
      const w = strategy.position_weights[pos]
      if (w !== undefined && (w < 1 || w > 10)) {
        errors.push(`Position weight for ${pos} must be 1-10, got ${w}`)
      }
    }
  }

  // --- Risk tolerance ---
  if ('risk_tolerance' in strategy && strategy.risk_tolerance) {
    if (!['conservative', 'balanced', 'aggressive'].includes(strategy.risk_tolerance)) {
      errors.push(`Invalid risk_tolerance: ${strategy.risk_tolerance}`)
    }
  }

  // --- Budget allocation (auction): percentages should sum to ~100 ---
  if (format === 'auction' && strategy.budget_allocation) {
    const total = Object.values(strategy.budget_allocation).reduce((sum, v) => sum + v, 0)
    if (total < 95 || total > 105) {
      errors.push(`Budget allocation should sum to ~100%, got ${total}%`)
    }
    for (const [key, val] of Object.entries(strategy.budget_allocation)) {
      if (val < 0) errors.push(`Budget allocation for ${key} cannot be negative`)
      if (val > 100) errors.push(`Budget allocation for ${key} cannot exceed 100%`)
    }
  }

  // --- Max bid percentage (auction): 10-70% ---
  if (format === 'auction' && strategy.max_bid_percentage !== undefined && strategy.max_bid_percentage !== null) {
    if (strategy.max_bid_percentage < 10 || strategy.max_bid_percentage > 70) {
      errors.push(`Max bid percentage should be 10-70%, got ${strategy.max_bid_percentage}%`)
    }
  }

  // --- Player targets: weight 1-10 ---
  if (strategy.player_targets) {
    for (const target of strategy.player_targets) {
      if (target.weight < 1 || target.weight > 10) {
        errors.push(`Player target weight for "${target.player_name}" must be 1-10, got ${target.weight}`)
      }
    }
  }

  // --- Player avoids: valid severity ---
  if (strategy.player_avoids) {
    for (const avoid of strategy.player_avoids) {
      if (!['soft', 'hard'].includes(avoid.severity)) {
        errors.push(`Player avoid severity for "${avoid.player_name}" must be "soft" or "hard"`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Strip format-inappropriate fields before saving.
 * Call this before insert/update to ensure clean data.
 */
export function sanitizeStrategyForFormat<T extends StrategyInsert | StrategyUpdate>(
  strategy: T,
  format: DraftFormat
): T {
  const cleaned = { ...strategy }

  if (format === 'auction') {
    cleaned.round_targets = null
    cleaned.position_round_priority = null
  } else {
    cleaned.budget_allocation = null
    cleaned.max_bid_percentage = null
  }

  return cleaned
}
