/**
 * room-target-pricing.ts (D6): per-slot target-at-price for the live room's
 * My Team panel. Reuses the existing $0 solver (assignTargetPrices from
 * target-pricing.ts) instead of re-implementing target math -- this module
 * only adapts room-shaped inputs (the DB's RosterSlots, ScoredPlayer[], a
 * saved Strategy's player_targets) into what that solver expects, then maps
 * its output back onto still-open roster slots for display.
 *
 * Pure and $0 -- no React, no network, no Claude. Re-run on every strategy
 * switch or pick, same as the rest of the room's live-recalculated advice.
 */

import type { RosterSlots as DbRosterSlots, StrategyPlayerTarget } from '@/lib/supabase/database.types'
import type { RosterSlots as PlayersRosterSlots, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import { assignTargetPrices } from '@/lib/research/strategy/target-pricing'

interface RosterPick {
  player_name: string
  position?: string
  price?: number
}

/**
 * D6: bridges the DB's RosterSlots (dst/ir) to the solver's RosterSlots
 * (def, no ir/superflex). IR is untracked here -- it never gates the
 * target-price math, same as it's excluded from buildSlotRows' starters.
 */
export function toPlayersRosterSlots(slots: DbRosterSlots): PlayersRosterSlots {
  return {
    qb: slots.qb ?? 0,
    rb: slots.rb ?? 0,
    wr: slots.wr ?? 0,
    te: slots.te ?? 0,
    flex: slots.flex ?? 0,
    superflex: 0,
    k: slots.k ?? 0,
    def: slots.dst ?? 0,
    bench: slots.bench ?? 0,
  }
}

const FLEX_POSITIONS = new Set<Position>(['RB', 'WR', 'TE'])

/**
 * Still-open slot counts, filled the same order buildSlotRows uses --
 * dedicated first, then FLEX, then bench -- so the two stay in sync.
 */
function remainingRosterSlots(picks: RosterPick[], roster: DbRosterSlots): PlayersRosterSlots {
  const pool = picks.map(p => ({ pos: (p.position ?? '').toUpperCase(), used: false }))
  const take = (match: (pos: string) => boolean): boolean => {
    const found = pool.find(p => !p.used && match(p.pos))
    if (found) {
      found.used = true
      return true
    }
    return false
  }
  const consume = (count: number, match: (pos: string) => boolean): number => {
    let left = count
    for (let i = 0; i < count; i++) {
      if (take(match)) left -= 1
    }
    return left
  }
  const qb = consume(roster.qb ?? 0, pos => pos === 'QB')
  const rb = consume(roster.rb ?? 0, pos => pos === 'RB')
  const wr = consume(roster.wr ?? 0, pos => pos === 'WR')
  const te = consume(roster.te ?? 0, pos => pos === 'TE')
  const flex = consume(roster.flex ?? 0, pos => FLEX_POSITIONS.has(pos as Position))
  const def = consume(roster.dst ?? 0, pos => pos === 'DEF' || pos === 'DST')
  const k = consume(roster.k ?? 0, pos => pos === 'K')
  const benchFilled = pool.filter(p => !p.used).length
  const bench = Math.max(0, (roster.bench ?? 0) - benchFilled)
  return { qb, rb, wr, te, flex, superflex: 0, k, def, bench }
}

export interface SlotTarget {
  position: Position | 'FLEX'
  name: string
  price: number
}

export interface OpenSlotTargets {
  /** One entry per still-open slot a strategy target could claim, in slot-fill order. */
  bySlot: SlotTarget[]
  /** true when the solver-fit roster still fits the remaining budget. */
  fits: boolean
}

/**
 * D6: per-slot target-at-price for the room's My Team panel. Re-runs
 * assignTargetPrices against ONLY the still-open slots and the strategy's
 * still-available player_targets (highest weight first), then greedily
 * claims one open slot per priced target -- dedicated position first,
 * FLEX as the fallback for RB/WR/TE.
 */
export function computeOpenSlotTargets({
  activeStrategy,
  available,
  myPicks,
  rosterSlots,
  budgetRemaining,
}: {
  activeStrategy: {
    player_targets: StrategyPlayerTarget[]
    budget_allocation?: Record<string, number> | null
    max_bid_percentage?: number | null
  } | null
  available: ScoredPlayer[]
  myPicks: RosterPick[]
  rosterSlots: DbRosterSlots
  budgetRemaining: number | null
}): OpenSlotTargets {
  if (!activeStrategy || budgetRemaining == null || budgetRemaining <= 0) {
    return { bySlot: [], fits: true }
  }

  const availableNames = new Set(available.map(sp => sp.player.name.toLowerCase()))
  const openTargetNames = [...activeStrategy.player_targets]
    .sort((a, b) => b.weight - a.weight)
    .map(t => t.player_name)
    .filter(name => availableNames.has(name.toLowerCase()))
  if (openTargetNames.length === 0) return { bySlot: [], fits: true }

  const openSlots = remainingRosterSlots(myPicks, rosterSlots)
  const totalOpen =
    openSlots.qb + openSlots.rb + openSlots.wr + openSlots.te + openSlots.flex +
    openSlots.k + openSlots.def + openSlots.bench
  if (totalOpen === 0) return { bySlot: [], fits: true }

  const pricing = assignTargetPrices({
    targetNames: openTargetNames,
    budgetAllocation: activeStrategy.budget_allocation ?? undefined,
    maxBidPercentage: activeStrategy.max_bid_percentage ?? undefined,
    players: available.map(sp => sp.player),
    rosterSlots: openSlots,
    budget: budgetRemaining,
  })

  const remaining = { ...openSlots }
  const bySlot: SlotTarget[] = []
  for (const t of pricing.prices) {
    const key = t.position.toLowerCase() as 'qb' | 'rb' | 'wr' | 'te' | 'k' | 'def'
    if (remaining[key] > 0) {
      remaining[key] -= 1
      bySlot.push({ position: t.position, name: t.name, price: t.price })
    } else if (FLEX_POSITIONS.has(t.position) && remaining.flex > 0) {
      remaining.flex -= 1
      bySlot.push({ position: 'FLEX', name: t.name, price: t.price })
    }
  }

  return { bySlot, fits: pricing.fits }
}
