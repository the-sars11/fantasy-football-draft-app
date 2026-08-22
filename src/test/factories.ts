/**
 * Shared test factories for live-draft engine tests.
 *
 * These builders were previously copy-pasted across what-to-do.test.ts and
 * adaptive-guidance.test.ts. Centralizing them lets the adaptive-engine and
 * recompute-on-pick suites reuse one consistent set of fixtures. Every builder
 * returns a fully-typed object with realistic defaults and a shallow override.
 */
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { PositionScarcityExtended } from '@/lib/draft/explain'
import type {
  Strategy as DbStrategy,
  StrategyPlayerTarget,
  RosterSlots,
  Position,
} from '@/lib/supabase/database.types'
import {
  createInitialState,
  applyPick,
  type DraftState,
  type DraftPick,
} from '@/lib/draft/state'

/** The Nasties: 12-team, $200, PPR, no-kicker. Roster used across draft tests. */
export const NASTIES_SLOTS: RosterSlots = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1,
}

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: overrides.id ?? overrides.name ?? 'p-generic',
    name: overrides.name ?? 'Generic Player',
    team: overrides.team ?? 'KC',
    position: overrides.position ?? 'RB',
    byeWeek: overrides.byeWeek ?? 10,
    injuryStatus: overrides.injuryStatus,
    consensusRank: overrides.consensusRank ?? 12,
    consensusAuctionValue: overrides.consensusAuctionValue ?? 30,
    consensusTier: overrides.consensusTier ?? 2,
    adp: overrides.adp ?? 20,
    sourceData: overrides.sourceData ?? [],
    projections: overrides.projections ?? { points: 200 },
    analysis: overrides.analysis,
    ...overrides,
  }
}

export function makeScored(player: Player, overrides: Partial<ScoredPlayer> = {}): ScoredPlayer {
  return {
    player,
    strategyScore: overrides.strategyScore ?? 70,
    intelScore: overrides.intelScore ?? 0,
    combinedScore: overrides.combinedScore ?? 70,
    adjustedAuctionValue: overrides.adjustedAuctionValue,
    adjustedRoundValue: overrides.adjustedRoundValue,
    targetStatus: overrides.targetStatus ?? 'neutral',
    isUserTarget: overrides.isUserTarget ?? false,
    isUserAvoid: overrides.isUserAvoid ?? false,
    boosts: overrides.boosts ?? [],
    intelBoosts: overrides.intelBoosts ?? [],
  }
}

export function makeScarcity(
  overrides: Partial<PositionScarcityExtended> = {},
): PositionScarcityExtended {
  return {
    position: overrides.position ?? 'RB',
    totalRemaining: overrides.totalRemaining ?? 8,
    tier1Remaining: overrides.tier1Remaining ?? 3,
    tier2Remaining: overrides.tier2Remaining ?? 2,
    tier3Remaining: overrides.tier3Remaining ?? 3,
    startableRemaining: overrides.startableRemaining ?? 5,
    scarcityLevel: overrides.scarcityLevel ?? 'moderate',
    spendRange: overrides.spendRange,
    avgValue: overrides.avgValue,
  }
}

export function makeTarget(
  name: string,
  overrides: Partial<StrategyPlayerTarget> = {},
): StrategyPlayerTarget {
  return {
    player_id: overrides.player_id ?? name,
    player_name: name,
    weight: overrides.weight ?? 8,
    note: overrides.note,
  }
}

const DEFAULT_WEIGHTS: Record<Position, number> = {
  QB: 5, RB: 5, WR: 5, TE: 5, K: 0, DST: 3,
}

export function makeStrategy(overrides: Partial<DbStrategy> = {}): DbStrategy {
  return {
    id: overrides.id ?? 'strat-1',
    user_id: overrides.user_id ?? 'user-1',
    league_id: overrides.league_id ?? 'league-1',
    name: overrides.name ?? 'Balanced',
    description: overrides.description ?? null,
    archetype: overrides.archetype ?? 'balanced',
    source: overrides.source ?? 'user',
    is_active: overrides.is_active ?? true,
    position_weights: overrides.position_weights ?? { ...DEFAULT_WEIGHTS },
    player_targets: overrides.player_targets ?? [],
    player_avoids: overrides.player_avoids ?? [],
    team_avoids: overrides.team_avoids ?? [],
    risk_tolerance: overrides.risk_tolerance ?? 'balanced',
    budget_allocation: overrides.budget_allocation ?? null,
    max_bid_percentage: overrides.max_bid_percentage ?? null,
    round_targets: overrides.round_targets ?? null,
    position_round_priority: overrides.position_round_priority ?? null,
    ai_reasoning: overrides.ai_reasoning ?? null,
    ai_confidence: overrides.ai_confidence ?? null,
    projected_ceiling: overrides.projected_ceiling ?? null,
    projected_floor: overrides.projected_floor ?? null,
    created_at: overrides.created_at ?? '2026-08-01T00:00:00Z',
    updated_at: overrides.updated_at ?? '2026-08-01T00:00:00Z',
  }
}

/** A fresh 4-manager auction (Joe seat first) with the Nasties roster. */
export function freshAuction(
  managers: Array<{ name: string; budget?: number }> = [
    { name: 'Joe', budget: 200 },
    { name: 'Rival1', budget: 200 },
    { name: 'Rival2', budget: 200 },
    { name: 'Rival3', budget: 200 },
  ],
  slots: RosterSlots = NASTIES_SLOTS,
): DraftState {
  return createInitialState('auction', managers, slots)
}

/** Apply a buy (any manager) to state and return the new immutable state. */
export function buy(
  state: DraftState,
  player: Player,
  manager: string,
  price: number,
): DraftState {
  const pick: DraftPick = {
    pick_number: state.picks.length + 1,
    player_name: player.name,
    position: player.position,
    manager,
    price,
  }
  return applyPick(state, pick)
}

/** Lowercased set of every drafted player name in a state (matches engine convention). */
export function draftedNamesOf(state: DraftState): Set<string> {
  return new Set(state.picks.map((p) => p.player_name.toLowerCase()))
}
