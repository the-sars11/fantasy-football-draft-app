import { describe, it, expect } from 'vitest'
import { createInitialState, applyPick, applySheetRows, removePickByNumber, editPickByNumber, getMaxBid, getRemainingBudget, reconcileWithAuctioneerPicks, type DraftPick, type DraftState, type AuctioneerPickSnapshot } from '../state'
import type { RosterSlots } from '../../supabase/database.types'
import type { SheetRow } from '../../sheets'

// Minimal roster: 1 QB + 1 RB per team. With 2 teams => 4 total roster spots.
const ROSTER: RosterSlots = {
  qb: 1, rb: 1, wr: 0, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0,
}

function pick(n: number, manager: string, position: string): DraftPick {
  return { pick_number: n, player_name: `Player ${n}`, position, manager }
}

function sheetRow(player_name: string, manager: string, overrides: Partial<SheetRow> = {}): SheetRow {
  return { player_name, manager, raw: [], ...overrides }
}

describe('applyPick draft completion', () => {
  it('completes a non-keeper draft when all roster spots are filled', () => {
    let state = createInitialState(
      'snake',
      [{ name: 'A', draft_position: 1 }, { name: 'B', draft_position: 2 }],
      ROSTER,
    )
    expect(state.total_roster_spots).toBe(4)

    state = applyPick(state, pick(1, 'A', 'QB'))
    state = applyPick(state, pick(2, 'B', 'QB'))
    state = applyPick(state, pick(3, 'A', 'RB'))
    expect(state.status).toBe('live') // 3 of 4 filled

    state = applyPick(state, pick(4, 'B', 'RB'))
    expect(state.status).toBe('completed') // 4 of 4
  })

})

describe('applySheetRows', () => {
  function twoTeamSnake() {
    return createInitialState(
      'snake',
      [{ name: 'A', draft_position: 1 }, { name: 'B', draft_position: 2 }],
      ROSTER,
    )
  }

  it('applies rows not yet in state', () => {
    const state = twoTeamSnake()
    const result = applySheetRows(state, [sheetRow('CMC', 'A'), sheetRow('Tyreek', 'B')])
    expect(result.picks).toHaveLength(2)
    expect(result.picks[0].player_name).toBe('CMC')
    expect(result.picks[1].player_name).toBe('Tyreek')
  })

  it('is idempotent: calling twice with the same rows produces no duplicates', () => {
    const state = twoTeamSnake()
    const rows = [sheetRow('CMC', 'A'), sheetRow('Tyreek', 'B')]
    const once = applySheetRows(state, rows)
    const twice = applySheetRows(once, rows)
    expect(twice.picks).toHaveLength(2)
    expect(twice.total_picks).toBe(2)
  })

  it('deduplicates by name+manager identity, not array index', () => {
    const state = twoTeamSnake()
    const afterFirst = applySheetRows(state, [sheetRow('CMC', 'A')])
    const result = applySheetRows(afterFirst, [sheetRow('CMC', 'A'), sheetRow('Tyreek', 'B')])
    expect(result.picks).toHaveLength(2)
    expect(result.picks.filter(p => p.player_name === 'CMC')).toHaveLength(1)
  })

  it('is case-insensitive and trims whitespace in identity key', () => {
    const state = twoTeamSnake()
    const afterFirst = applySheetRows(state, [sheetRow('cmc', 'a ')])
    const result = applySheetRows(afterFirst, [sheetRow('CMC', 'A')])
    expect(result.picks).toHaveLength(1)
  })

  it('applies only genuinely new rows when some are already in state', () => {
    const state = twoTeamSnake()
    const afterFirst = applySheetRows(state, [sheetRow('CMC', 'A')])
    const result = applySheetRows(afterFirst, [
      sheetRow('CMC', 'A'),
      sheetRow('Tyreek', 'B'),
      sheetRow('JT', 'A'),
    ])
    expect(result.picks).toHaveLength(3)
    expect(result.picks.map(p => p.player_name)).toEqual(['CMC', 'Tyreek', 'JT'])
  })

  it('derives snake round from ceil(pick_number / teamCount)', () => {
    const fourTeamRoster: RosterSlots = { qb: 3, rb: 0, wr: 0, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0 }
    const state = createInitialState(
      'snake',
      [
        { name: 'M1', draft_position: 1 }, { name: 'M2', draft_position: 2 },
        { name: 'M3', draft_position: 3 }, { name: 'M4', draft_position: 4 },
      ],
      fourTeamRoster,
    )
    const rows = [
      sheetRow('P1', 'M1', { pick_number: 1 }),   // ceil(1/4) = 1
      sheetRow('P4', 'M4', { pick_number: 4 }),   // ceil(4/4) = 1
      sheetRow('P5', 'M3', { pick_number: 5 }),   // ceil(5/4) = 2
      sheetRow('P8', 'M2', { pick_number: 8 }),   // ceil(8/4) = 2
      sheetRow('P9', 'M1', { pick_number: 9 }),   // ceil(9/4) = 3
    ]
    const result = applySheetRows(state, rows)
    expect(result.picks).toHaveLength(5)
    expect(result.picks[0].round).toBe(1)
    expect(result.picks[1].round).toBe(1)
    expect(result.picks[2].round).toBe(2)
    expect(result.picks[3].round).toBe(2)
    expect(result.picks[4].round).toBe(3)
  })

  it('uses row.round for auction picks and leaves it undefined when absent', () => {
    const state = createInitialState(
      'auction',
      [{ name: 'A', budget: 200 }, { name: 'B', budget: 200 }],
      ROSTER,
    )
    const rows = [
      sheetRow('CMC', 'A', { price: 50, round: 99 }),
      sheetRow('Tyreek', 'B', { price: 40 }),
    ]
    const result = applySheetRows(state, rows)
    expect(result.picks[0].round).toBe(99)
    expect(result.picks[1].round).toBeUndefined()
  })
})

describe('getMaxBid (auction only)', () => {
  const TWO_SLOT: RosterSlots = { qb: 1, rb: 1, wr: 0, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0 }

  it('returns null for snake format', () => {
    const state = createInitialState('snake', [{ name: 'A', draft_position: 1 }], TWO_SLOT)
    expect(getMaxBid(state, 'A')).toBeNull()
  })

  it('returns null for unknown manager', () => {
    const state = createInitialState('auction', [{ name: 'A', budget: 200 }], TWO_SLOT)
    expect(getMaxBid(state, 'NOBODY')).toBeNull()
  })

  it('reserves $1 per remaining empty slot', () => {
    // 2 total slots, 0 filled, budget 200
    // emptySlots = max(0, 2 - 0 - 1) = 1 => maxBid = 200 - 1 = 199
    const state = createInitialState('auction', [{ name: 'A', budget: 200 }], TWO_SLOT)
    expect(getMaxBid(state, 'A')).toBe(199)
  })

  it('reserve shrinks as slots fill up', () => {
    // After 1 real pick ($50): budget_remaining=150, picks.length=1
    // emptySlots = max(0, 2-1-1) = 0 => maxBid = 150
    const state = createInitialState('auction', [{ name: 'A', budget: 200 }, { name: 'B', budget: 200 }], TWO_SLOT)
    const after = applyPick(state, { pick_number: 1, player_name: 'CMC', manager: 'A', price: 50 })
    expect(getMaxBid(after, 'A')).toBe(150)
  })

  it('floors at $1 when reserve equals remaining budget', () => {
    // budget=1, 2 total slots, 0 filled
    // emptySlots=1 => maxBid = max(1, 1-1) = 1
    const state = createInitialState('auction', [{ name: 'A', budget: 1 }], TWO_SLOT)
    expect(getMaxBid(state, 'A')).toBe(1)
  })

})

describe('snake draft order - 12-team parity', () => {
  const ROSTER_3R: RosterSlots = { qb: 3, rb: 0, wr: 0, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0 }
  const MANAGERS = Array.from({ length: 12 }, (_, i) => ({ name: `M${i}`, draft_position: i + 1 }))

  // Apply n picks using state.current_manager so the manager sequence is self-consistent
  function applyN(n: number): DraftState {
    let state = createInitialState('snake', MANAGERS, ROSTER_3R)
    for (let i = 0; i < n; i++) {
      state = applyPick(state, {
        pick_number: i + 1,
        player_name: `P${i + 1}`,
        manager: state.current_manager!,
        position: 'QB',
      })
    }
    return state
  }

  it('M0 picks first (pick 1)', () => {
    const state = createInitialState('snake', MANAGERS, ROSTER_3R)
    expect(state.current_manager).toBe('M0')
  })

  it('M11 picks last in round 1 (pick 12)', () => {
    expect(applyN(11).current_manager).toBe('M11')
  })

  it('M11 snakes back: picks first in round 2 (pick 13)', () => {
    expect(applyN(12).current_manager).toBe('M11')
  })

  it('M0 picks last in round 2 (pick 24)', () => {
    expect(applyN(23).current_manager).toBe('M0')
  })

  it('M0 opens round 3 again (pick 25)', () => {
    expect(applyN(24).current_manager).toBe('M0')
  })
})

describe('removePickByNumber (finding 12)', () => {
  const picks: DraftPick[] = [
    { pick_number: 1, player_name: 'CMC', manager: 'A', price: 50 },
    { pick_number: 2, player_name: 'Tyreek', manager: 'B', price: 40 },
    { pick_number: 3, player_name: 'JT', manager: 'A', price: 30 },
    { pick_number: 4, player_name: 'Kelce', manager: 'B', price: 25 },
  ]

  it('removes the target pick and renumbers the remainder contiguously', () => {
    const result = removePickByNumber(picks, 2)
    expect(result.map(p => p.player_name)).toEqual(['CMC', 'JT', 'Kelce'])
    expect(result.map(p => p.pick_number)).toEqual([1, 2, 3])
  })

  it('removing the last pick behaves like undo (drops it, no gap)', () => {
    const result = removePickByNumber(picks, 4)
    expect(result.map(p => p.player_name)).toEqual(['CMC', 'Tyreek', 'JT'])
    expect(result.map(p => p.pick_number)).toEqual([1, 2, 3])
  })

  it('is a no-op (same length) when no pick matches', () => {
    const result = removePickByNumber(picks, 99)
    expect(result).toHaveLength(picks.length)
    expect(result.map(p => p.player_name)).toEqual(['CMC', 'Tyreek', 'JT', 'Kelce'])
  })

  it('does not mutate the input array', () => {
    const copy = picks.map(p => ({ ...p }))
    removePickByNumber(picks, 2)
    expect(picks).toEqual(copy)
  })
})

describe('editPickByNumber (finding 12)', () => {
  const picks: DraftPick[] = [
    { pick_number: 1, player_name: 'CMC', manager: 'A', price: 50 },
    { pick_number: 2, player_name: 'Tyreek', manager: 'B', price: 40 },
  ]

  it('applies changes to the matching pick and preserves pick_number', () => {
    const result = editPickByNumber(picks, 1, { price: 65, manager: 'B' })
    expect(result[0]).toEqual({ pick_number: 1, player_name: 'CMC', manager: 'B', price: 65 })
    expect(result[1]).toEqual(picks[1]) // untouched
  })

  it('is a no-op when no pick matches', () => {
    const result = editPickByNumber(picks, 99, { price: 1 })
    expect(result).toEqual(picks)
  })

  it('does not mutate the input array', () => {
    const copy = picks.map(p => ({ ...p }))
    editPickByNumber(picks, 1, { price: 999 })
    expect(picks).toEqual(copy)
  })
})

// ---------------------------------------------------------------------------
// FF-315: reconcileWithAuctioneerPicks
// ---------------------------------------------------------------------------

describe('reconcileWithAuctioneerPicks (FF-315)', () => {
  function provPick(playerName: string, manager: string, price: number, position?: string): DraftPick {
    return { pick_number: 1, player_name: playerName, manager, price, position, provisional: true }
  }
  function confPick(playerName: string, manager: string, price: number): DraftPick {
    return { pick_number: 1, player_name: playerName, manager, price }
  }
  function snap(playerName: string, manager: string, price: number): AuctioneerPickSnapshot {
    return { player_name: playerName, manager, price }
  }

  it('non-provisional picks are passed through untouched', () => {
    const picks = [confPick('CMC', 'A', 50)]
    const { picks: out, corrections, newPicksFromAuctioneer } = reconcileWithAuctioneerPicks(picks, [snap('CMC', 'A', 50)])
    expect(out).toHaveLength(1)
    expect(out[0].provisional).toBeUndefined()
    expect(corrections).toHaveLength(0)
    expect(newPicksFromAuctioneer).toHaveLength(0)
  })

  it('provisional pick matching auctioneer exactly: clears provisional, no correction', () => {
    const picks = [provPick('Tyreek', 'B', 40)]
    const { picks: out, corrections } = reconcileWithAuctioneerPicks(picks, [snap('Tyreek', 'B', 40)])
    expect(out[0].provisional).toBeUndefined()
    expect(corrections).toHaveLength(0)
  })

  it('provisional pick with wrong price: auctioneer wins, records correction, clears provisional', () => {
    const picks = [provPick('JT', 'A', 30)]
    const { picks: out, corrections } = reconcileWithAuctioneerPicks(picks, [snap('JT', 'A', 55)])
    expect(out[0].price).toBe(55)
    expect(out[0].provisional).toBeUndefined()
    expect(corrections).toHaveLength(1)
    expect(corrections[0]).toMatchObject({ playerName: 'JT', loggedPrice: 30, actualPrice: 55, loggedManager: 'A', actualManager: 'A' })
  })

  it('provisional pick with wrong manager: auctioneer wins, records correction', () => {
    const picks = [provPick('Kelce', 'A', 25)]
    const { picks: out, corrections } = reconcileWithAuctioneerPicks(picks, [snap('Kelce', 'B', 25)])
    expect(out[0].manager).toBe('B')
    expect(corrections[0]).toMatchObject({ loggedManager: 'A', actualManager: 'B' })
  })

  it('provisional pick absent from auctioneer: stays provisional (unconfirmed)', () => {
    const picks = [provPick('Unknown', 'A', 10)]
    const { picks: out, corrections, newPicksFromAuctioneer } = reconcileWithAuctioneerPicks(picks, [])
    expect(out[0].provisional).toBe(true)
    expect(corrections).toHaveLength(0)
    expect(newPicksFromAuctioneer).toHaveLength(0)
  })

  it('auctioneer pick absent from state: surfaces in newPicksFromAuctioneer', () => {
    const picks = [confPick('CMC', 'A', 50)]
    const { newPicksFromAuctioneer } = reconcileWithAuctioneerPicks(picks, [snap('CMC', 'A', 50), snap('Tyreek', 'B', 40)])
    expect(newPicksFromAuctioneer).toHaveLength(1)
    expect(newPicksFromAuctioneer[0].player_name).toBe('Tyreek')
  })

  it('match key is case-insensitive and trims whitespace', () => {
    const picks = [provPick('cmc', 'a', 50)]
    const { picks: out, corrections } = reconcileWithAuctioneerPicks(picks, [snap('CMC', 'A', 50)])
    expect(out[0].provisional).toBeUndefined()
    expect(corrections).toHaveLength(0)
  })
})

describe('rebuild after edit/remove recomputes budgets (finding 12)', () => {
  // Mirrors the hook: rebuild = fresh state -> replay the corrected pick list.
  function rebuild(format: 'auction', budget: number, picks: DraftPick[]): DraftState {
    let state = createInitialState(
      format,
      [{ name: 'A', budget }, { name: 'B', budget }],
      { qb: 1, rb: 1, wr: 1, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0 },
    )
    for (const p of picks) state = applyPick(state, p)
    return state
  }

  const start: DraftPick[] = [
    { pick_number: 1, player_name: 'CMC', position: 'RB', manager: 'A', price: 50 },
    { pick_number: 2, player_name: 'Tyreek', position: 'WR', manager: 'A', price: 40 },
    { pick_number: 3, player_name: 'JT', position: 'RB', manager: 'A', price: 30 },
  ]

  it('removing a pick refunds its price on rebuild', () => {
    // A spent 50+40+30 = 120 of 200 => 80 remaining. Remove the $40 Tyreek => 120 remaining.
    const before = rebuild('auction', 200, start)
    expect(getRemainingBudget(before, 'A')).toBe(80)

    const after = rebuild('auction', 200, removePickByNumber(start, 2))
    expect(getRemainingBudget(after, 'A')).toBe(120)
    // roster count for WR (Tyreek) drops back to 0
    expect(after.managers['A'].roster_count['WR']).toBeUndefined()
  })

  it('editing a price adjusts the budget on rebuild', () => {
    // Correct CMC from $50 to $75 => A now spent 145 => 55 remaining.
    const after = rebuild('auction', 200, editPickByNumber(start, 1, { price: 75 }))
    expect(getRemainingBudget(after, 'A')).toBe(55)
  })

  it('editing the manager moves the spend to the new manager on rebuild', () => {
    // Move JT ($30) from A to B. A spent 90 => 110 left; B spent 30 => 170 left.
    const after = rebuild('auction', 200, editPickByNumber(start, 3, { manager: 'B' }))
    expect(getRemainingBudget(after, 'A')).toBe(110)
    expect(getRemainingBudget(after, 'B')).toBe(170)
  })
})
