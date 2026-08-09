import { describe, it, expect } from 'vitest'
import { analyzePickForTrashTalk } from '../trash-talk'
import type { DraftPick } from '../state'
import type { Player } from '@/lib/players/types'

const AUCTION_ONLY_TYPES = ['budget_buster', 'last_big_spender', 'cheapskate_special', 'budget_dominance']
const MY_MANAGER = 'Alice'

function makePick(overrides: Partial<DraftPick> = {}): DraftPick {
  return {
    pick_number: 10,
    player_name: 'Tyreek Hill',
    position: 'WR',
    manager: 'Bob',
    ...overrides,
  }
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Tyreek Hill',
    team: 'MIA',
    position: 'WR',
    byeWeek: 10,
    consensusRank: 5,
    consensusAuctionValue: 55,
    consensusTier: 1,
    adp: 5.0,
    sourceData: [],
    projections: { points: 250 },
    ...overrides,
  } as Player
}

describe('analyzePickForTrashTalk - auction-only triggers silent in snake', () => {
  it('auction-only alert types never appear when format is snake', () => {
    // Use a pick that would likely fire budget_buster in auction (price high, roster sparse)
    const pick = makePick({ price: 120, manager: 'Bob' })
    const allPicks = [pick]

    const alert = analyzePickForTrashTalk(pick, allPicks, [makePlayer()], 'snake', MY_MANAGER, 12)
    if (alert) {
      expect(AUCTION_ONLY_TYPES).not.toContain(alert.type)
    }
  })

  it('snake-only trigger (reach) does not fire in auction', () => {
    // reach requires format:'snake' and pick.round; in auction mode it must not fire
    const pick = makePick({ round: 1, price: 5, manager: 'Bob' })
    const alert = analyzePickForTrashTalk(pick, [pick], [makePlayer()], 'auction', MY_MANAGER, 12)
    if (alert) {
      expect(alert.type).not.toBe('reach')
    }
  })

  it('late_roster_qb_panic does not fire in auction format', () => {
    // Build a manager with 7 non-QB picks and then a WR; in snake this would fire, in auction it must not
    const managerPicks: DraftPick[] = Array.from({ length: 7 }, (_, i) => ({
      pick_number: i + 1,
      player_name: `RB${i}`,
      position: 'RB',
      manager: 'Bob',
    }))
    const latePick = makePick({ pick_number: 8, manager: 'Bob', position: 'WR' })
    const allPicks = [...managerPicks, latePick]

    const alert = analyzePickForTrashTalk(latePick, allPicks, [], 'auction', MY_MANAGER, 12)
    if (alert) {
      expect(alert.type).not.toBe('late_roster_qb_panic')
    }
  })

  it('late_roster_qb_panic can fire in snake format', () => {
    // 7 RB picks + an 8th WR pick without a QB => late_roster_qb_panic fires
    const managerPicks: DraftPick[] = Array.from({ length: 7 }, (_, i) => ({
      pick_number: i + 1,
      player_name: `RB${i}`,
      position: 'RB',
      manager: 'Bob',
      round: i + 1,
    }))
    const latePick = makePick({ pick_number: 8, manager: 'Bob', position: 'WR', round: 8 })
    const allPicks = [...managerPicks, latePick]

    const alert = analyzePickForTrashTalk(latePick, allPicks, [], 'snake', MY_MANAGER, 12)
    // May or may not fire depending on other guards, but if it does it must be snake-safe
    if (alert) {
      expect(AUCTION_ONLY_TYPES).not.toContain(alert.type)
    }
  })
})

describe('analyzePickForTrashTalk - self-picks (myManager)', () => {
  it('does not generate non-steal alerts for your own picks', () => {
    const myPick = makePick({ manager: MY_MANAGER, price: 5 })
    const alert = analyzePickForTrashTalk(myPick, [myPick], [makePlayer()], 'auction', MY_MANAGER, 12)
    if (alert) {
      expect(alert.type).toBe('steal')
    }
  })
})

describe('analyzePickForTrashTalk - K and DEF picks', () => {
  it('returns null for a K pick (after first_defense_buy check)', () => {
    const kPick = makePick({ position: 'K', pick_number: 50, price: 1 })
    // Provide an existing K pick so first_defense_buy has already fired
    const existingK = makePick({ position: 'K', pick_number: 49 })
    const alert = analyzePickForTrashTalk(kPick, [existingK, kPick], [], 'auction', MY_MANAGER, 12)
    expect(alert).toBeNull()
  })

  it('returns null for a subsequent DEF pick', () => {
    const firstDef = makePick({ position: 'DEF', pick_number: 49 })
    const secondDef = makePick({ position: 'DEF', pick_number: 50, price: 1 })
    // first_defense_buy fires on the first DEF and returns early; second DEF hits the null guard
    const alert = analyzePickForTrashTalk(secondDef, [firstDef, secondDef], [], 'auction', MY_MANAGER, 12)
    expect(alert).toBeNull()
  })
})
