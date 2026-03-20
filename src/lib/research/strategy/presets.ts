/**
 * Strategy Archetype Presets (FF-S02)
 *
 * Auction and Snake archetypes are FULLY DISTINCT.
 * Auction strategies have budget_allocation + max_bid_percentage.
 * Snake strategies have round_targets + position_round_priority.
 * No cross-contamination.
 */

import type { Position } from '@/lib/players/types'
import type { StrategyInsert, Position as DbPosition } from '@/lib/supabase/database.types'

// --- Archetype identifiers ---

export const AUCTION_ARCHETYPES = [
  'stars-and-scrubs',
  'balanced-auction',
  'studs-and-duds',
  'zero-rb-auction',
  'wr-heavy-auction',
  'hero-rb-auction',
] as const

export const SNAKE_ARCHETYPES = [
  'zero-rb',
  'hero-rb',
  'robust-rb',
  'wr-heavy',
  'balanced',
  'late-round-qb',
] as const

export type AuctionArchetype = (typeof AUCTION_ARCHETYPES)[number]
export type SnakeArchetype = (typeof SNAKE_ARCHETYPES)[number]
export type Archetype = AuctionArchetype | SnakeArchetype

// --- Preset definitions ---

interface PresetBase {
  name: string
  description: string
  archetype: string
  position_weights: Record<Position, number>
  risk_tolerance: 'conservative' | 'balanced' | 'aggressive'
}

interface AuctionPreset extends PresetBase {
  budget_allocation: Record<string, number>
  max_bid_percentage: number
}

interface SnakePreset extends PresetBase {
  round_targets: Record<string, number[]>
  position_round_priority: Record<string, Position[]>
}

// --- Auction Presets ---

export const AUCTION_PRESETS: Record<AuctionArchetype, AuctionPreset> = {
  'stars-and-scrubs': {
    name: 'Stars & Scrubs',
    description: 'Spend big on 2-3 elite players, fill the rest with $1-3 bargains. High ceiling, volatile floor.',
    archetype: 'stars-and-scrubs',
    position_weights: { QB: 4, RB: 9, WR: 8, TE: 5, K: 1, DEF: 1 },
    risk_tolerance: 'aggressive',
    budget_allocation: { QB: 5, RB: 40, WR: 35, TE: 8, K: 1, DEF: 1, bench: 10 },
    max_bid_percentage: 40,
  },
  'balanced-auction': {
    name: 'Balanced Auction',
    description: 'Spread budget evenly across positions. Target mid-tier value at every slot. Consistent floor.',
    archetype: 'balanced-auction',
    position_weights: { QB: 6, RB: 7, WR: 7, TE: 6, K: 2, DEF: 2 },
    risk_tolerance: 'balanced',
    budget_allocation: { QB: 10, RB: 30, WR: 30, TE: 10, K: 2, DEF: 2, bench: 16 },
    max_bid_percentage: 25,
  },
  'studs-and-duds': {
    name: 'Studs & Duds',
    description: 'Lock in 3-4 studs at premium prices, accept weak bench. Similar to Stars & Scrubs but targets one more mid-range starter.',
    archetype: 'studs-and-duds',
    position_weights: { QB: 5, RB: 8, WR: 8, TE: 6, K: 1, DEF: 1 },
    risk_tolerance: 'aggressive',
    budget_allocation: { QB: 7, RB: 38, WR: 35, TE: 8, K: 1, DEF: 1, bench: 10 },
    max_bid_percentage: 35,
  },
  'zero-rb-auction': {
    name: 'Zero RB (Auction)',
    description: 'Punt RB early, invest heavily in elite WRs and TE. Fill RB with $1-5 dart throws and handcuffs.',
    archetype: 'zero-rb-auction',
    position_weights: { QB: 5, RB: 3, WR: 10, TE: 8, K: 1, DEF: 1 },
    risk_tolerance: 'aggressive',
    budget_allocation: { QB: 8, RB: 15, WR: 45, TE: 15, K: 1, DEF: 1, bench: 15 },
    max_bid_percentage: 35,
  },
  'wr-heavy-auction': {
    name: 'WR Heavy (Auction)',
    description: 'Prioritize WR depth and elite WR talent. Moderate RB spend, target value at QB/TE.',
    archetype: 'wr-heavy-auction',
    position_weights: { QB: 4, RB: 6, WR: 10, TE: 5, K: 1, DEF: 1 },
    risk_tolerance: 'balanced',
    budget_allocation: { QB: 6, RB: 25, WR: 42, TE: 8, K: 1, DEF: 1, bench: 17 },
    max_bid_percentage: 30,
  },
  'hero-rb-auction': {
    name: 'Hero RB (Auction)',
    description: 'Pay up for one elite RB, then load up on WRs. Fill RB2 cheap. Best of both worlds.',
    archetype: 'hero-rb-auction',
    position_weights: { QB: 5, RB: 7, WR: 9, TE: 5, K: 1, DEF: 1 },
    risk_tolerance: 'balanced',
    budget_allocation: { QB: 7, RB: 30, WR: 38, TE: 8, K: 1, DEF: 1, bench: 15 },
    max_bid_percentage: 35,
  },
}

// --- Snake Presets ---

export const SNAKE_PRESETS: Record<SnakeArchetype, SnakePreset> = {
  'zero-rb': {
    name: 'Zero RB',
    description: 'Draft WRs and elite TE early, wait on RBs until mid-late rounds. Bank on RB volatility and waiver wire.',
    archetype: 'zero-rb',
    position_weights: { QB: 4, RB: 3, WR: 10, TE: 8, K: 1, DEF: 1 },
    risk_tolerance: 'aggressive',
    round_targets: { QB: [8, 9], RB: [5, 6, 7, 8], WR: [1, 2, 3, 4], TE: [3, 4], K: [14], DEF: [15] },
    position_round_priority: { early: ['WR', 'TE'], mid: ['WR', 'RB', 'QB'], late: ['RB', 'QB', 'K', 'DEF'] },
  },
  'hero-rb': {
    name: 'Hero RB',
    description: 'Take one elite RB in round 1, then hammer WR for rounds 2-5. Fill RB2 mid-rounds.',
    archetype: 'hero-rb',
    position_weights: { QB: 5, RB: 7, WR: 9, TE: 5, K: 1, DEF: 1 },
    risk_tolerance: 'balanced',
    round_targets: { QB: [7, 8], RB: [1, 6, 7], WR: [2, 3, 4, 5], TE: [5, 6], K: [14], DEF: [15] },
    position_round_priority: { early: ['RB', 'WR'], mid: ['WR', 'RB', 'TE'], late: ['QB', 'K', 'DEF'] },
  },
  'robust-rb': {
    name: 'Robust RB',
    description: 'Lock in 2-3 RBs in the first 4 rounds. Positional scarcity play — RB depth wins leagues.',
    archetype: 'robust-rb',
    position_weights: { QB: 4, RB: 10, WR: 6, TE: 4, K: 1, DEF: 1 },
    risk_tolerance: 'conservative',
    round_targets: { QB: [8, 9], RB: [1, 2, 4], WR: [3, 5, 6], TE: [7, 8], K: [14], DEF: [15] },
    position_round_priority: { early: ['RB'], mid: ['WR', 'RB', 'TE'], late: ['QB', 'K', 'DEF'] },
  },
  'wr-heavy': {
    name: 'WR Heavy',
    description: 'Draft 3+ WRs in the first 5 rounds. Target high-floor WRs, fill RB from mid-round value.',
    archetype: 'wr-heavy',
    position_weights: { QB: 4, RB: 5, WR: 10, TE: 5, K: 1, DEF: 1 },
    risk_tolerance: 'balanced',
    round_targets: { QB: [8, 9], RB: [4, 5, 6], WR: [1, 2, 3, 5], TE: [6, 7], K: [14], DEF: [15] },
    position_round_priority: { early: ['WR'], mid: ['WR', 'RB', 'TE'], late: ['QB', 'K', 'DEF'] },
  },
  balanced: {
    name: 'Balanced',
    description: 'Best player available with light positional weighting. Flexible, adapts to draft flow.',
    archetype: 'balanced',
    position_weights: { QB: 6, RB: 7, WR: 7, TE: 6, K: 2, DEF: 2 },
    risk_tolerance: 'balanced',
    round_targets: { QB: [6, 7], RB: [1, 2, 5], WR: [2, 3, 4], TE: [5, 6], K: [14], DEF: [15] },
    position_round_priority: { early: ['RB', 'WR'], mid: ['WR', 'RB', 'TE', 'QB'], late: ['QB', 'K', 'DEF'] },
  },
  'late-round-qb': {
    name: 'Late Round QB',
    description: 'Wait on QB until round 9+. Invest premium picks in RB/WR/TE. Stream QB if needed.',
    archetype: 'late-round-qb',
    position_weights: { QB: 2, RB: 8, WR: 8, TE: 6, K: 1, DEF: 1 },
    risk_tolerance: 'balanced',
    round_targets: { QB: [9, 10, 11], RB: [1, 2, 5], WR: [3, 4, 6], TE: [5, 7], K: [14], DEF: [15] },
    position_round_priority: { early: ['RB', 'WR'], mid: ['WR', 'RB', 'TE'], late: ['QB', 'K', 'DEF'] },
  },
}

// --- Helpers ---

export function getPresetsForFormat(format: 'auction' | 'snake') {
  return format === 'auction' ? AUCTION_PRESETS : SNAKE_PRESETS
}

export function getPreset(archetype: string): AuctionPreset | SnakePreset | null {
  if (archetype in AUCTION_PRESETS) return AUCTION_PRESETS[archetype as AuctionArchetype]
  if (archetype in SNAKE_PRESETS) return SNAKE_PRESETS[archetype as SnakeArchetype]
  return null
}

/** Map app-level Position (DEF) to DB Position (DST) in weights */
function mapWeightsToDb(weights: Record<Position, number>): Record<DbPosition, number> {
  const { DEF, ...rest } = weights as Record<string, number>
  return { ...rest, DST: DEF } as Record<DbPosition, number>
}

export function presetToStrategyInsert(
  leagueId: string,
  archetype: string,
  overrides?: Partial<StrategyInsert>
): StrategyInsert | null {
  const preset = getPreset(archetype)
  if (!preset) return null

  const base: StrategyInsert = {
    league_id: leagueId,
    name: preset.name,
    description: preset.description,
    archetype: preset.archetype,
    source: 'preset',
    position_weights: mapWeightsToDb(preset.position_weights),
    risk_tolerance: preset.risk_tolerance,
  }

  // Attach format-specific fields only
  if ('budget_allocation' in preset) {
    base.budget_allocation = preset.budget_allocation
    base.max_bid_percentage = preset.max_bid_percentage
  } else {
    base.round_targets = preset.round_targets as Record<DbPosition, number[]>
    base.position_round_priority = preset.position_round_priority as Record<string, DbPosition[]>
  }

  return { ...base, ...overrides }
}
