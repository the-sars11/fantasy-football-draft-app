/**
 * room-target-pricing.test.ts — D6: per-slot target-at-price for the live
 * room's My Team panel. Covers the RosterSlots adapter and the open-slot
 * mapping on top of the existing $0 solver (assignTargetPrices). Pure, $0.
 */

import { describe, it, expect } from 'vitest'
import type { Player } from '@/lib/players/types'
import type { RosterSlots, StrategyPlayerTarget } from '@/lib/supabase/database.types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import { toPlayersRosterSlots, computeOpenSlotTargets } from '../room-target-pricing'

// Joe's Nasties: qb1 rb1 wr1 te1 flex3 dst1 bench5 ir1, no kicker.
const NASTIES: RosterSlots = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1,
}

function player(fields: Partial<Player> & { id: string; name: string; position: Player['position'] }): Player {
  return { consensusAuctionValue: 10, consensusTier: 3, ...fields } as Player
}

function scored(p: Player): ScoredPlayer {
  return {
    player: p,
    strategyScore: 50,
    intelScore: 0,
    combinedScore: 50,
    targetStatus: 'neutral',
    isUserTarget: false,
    isUserAvoid: false,
    boosts: [],
  } as unknown as ScoredPlayer
}

function target(name: string, weight: number): StrategyPlayerTarget {
  return { player_id: name, player_name: name, weight }
}

describe('toPlayersRosterSlots', () => {
  it('maps dst -> def and drops ir', () => {
    const mapped = toPlayersRosterSlots(NASTIES)
    expect(mapped).toEqual({ qb: 1, rb: 1, wr: 1, te: 1, flex: 3, superflex: 0, k: 0, def: 1, bench: 5 })
  })
})

describe('computeOpenSlotTargets', () => {
  const pool = [
    scored(player({ id: 'qb1', name: 'Elite QB', position: 'QB', consensusAuctionValue: 30 })),
    scored(player({ id: 'rb1', name: 'Elite RB', position: 'RB', consensusAuctionValue: 40 })),
    scored(player({ id: 'wr1', name: 'Elite WR', position: 'WR', consensusAuctionValue: 35 })),
  ]

  it('returns no slots when there is no active strategy', () => {
    const r = computeOpenSlotTargets({
      activeStrategy: null,
      available: pool,
      myPicks: [],
      rosterSlots: NASTIES,
      budgetRemaining: 200,
    })
    expect(r.bySlot).toEqual([])
    expect(r.fits).toBe(true)
  })

  it('returns no slots when budget is null or exhausted', () => {
    const r = computeOpenSlotTargets({
      activeStrategy: { player_targets: [target('Elite QB', 5)] },
      available: pool,
      myPicks: [],
      rosterSlots: NASTIES,
      budgetRemaining: 0,
    })
    expect(r.bySlot).toEqual([])
  })

  it('prices still-available targets onto their dedicated open slots', () => {
    const r = computeOpenSlotTargets({
      activeStrategy: {
        player_targets: [target('Elite RB', 8), target('Elite QB', 5)],
        budget_allocation: null,
        max_bid_percentage: null,
      },
      available: pool,
      myPicks: [],
      rosterSlots: NASTIES,
      budgetRemaining: 200,
    })
    expect(r.bySlot.length).toBe(2)
    expect(r.bySlot.map(s => s.name).sort()).toEqual(['Elite QB', 'Elite RB'])
    for (const s of r.bySlot) expect(s.price).toBeGreaterThan(0)
    expect(r.fits).toBe(true)
  })

  it('drops a target that has already been drafted by someone else', () => {
    const r = computeOpenSlotTargets({
      activeStrategy: { player_targets: [target('Elite QB', 5), target('Drafted Guy', 9)] },
      available: pool, // 'Drafted Guy' is not in the available pool
      myPicks: [],
      rosterSlots: NASTIES,
      budgetRemaining: 200,
    })
    expect(r.bySlot.map(s => s.name)).toEqual(['Elite QB'])
  })

  it('falls back to FLEX once the dedicated position slot is already filled by my picks', () => {
    const r = computeOpenSlotTargets({
      activeStrategy: { player_targets: [target('Elite RB', 5)] },
      available: pool,
      myPicks: [{ player_name: 'My Other RB', position: 'RB', price: 20 }],
      rosterSlots: NASTIES,
      budgetRemaining: 180,
    })
    expect(r.bySlot).toHaveLength(1)
    expect(r.bySlot[0].position).toBe('FLEX')
    expect(r.bySlot[0].name).toBe('Elite RB')
  })

  it('returns no slots once every roster slot is already filled', () => {
    const full: RosterSlots = { qb: 1, rb: 0, wr: 0, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0 }
    const r = computeOpenSlotTargets({
      activeStrategy: { player_targets: [target('Elite QB', 5)] },
      available: pool,
      myPicks: [{ player_name: 'Already Have', position: 'QB', price: 30 }],
      rosterSlots: full,
      budgetRemaining: 170,
    })
    expect(r.bySlot).toEqual([])
  })
})
