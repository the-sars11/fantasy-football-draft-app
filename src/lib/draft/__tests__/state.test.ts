import { describe, it, expect } from 'vitest'
import { createInitialState, applyPick, applySheetRows, getMaxBid, type DraftPick, type DraftState } from '../state'
import { applyKeepersToState, type KeeperAssignment } from '../keepers'
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

  it('completes a keeper league once real picks + keepers fill the roster', () => {
    // Regression: keeper picks live in state.keepers (not state.picks), so completion
    // used to never trigger because real picks alone could not reach total_roster_spots.
    let state = createInitialState(
      'snake',
      [{ name: 'A', draft_position: 1 }, { name: 'B', draft_position: 2 }],
      ROSTER,
    )
    const keepers: KeeperAssignment[] = [
      { player_name: 'Kept QB', position: 'QB', manager: 'A', cost: 5 },
    ]
    state = applyKeepersToState(state, keepers, 'snake')
    expect(state.keepers.length).toBe(1)

    state = applyPick(state, pick(1, 'B', 'QB'))
    state = applyPick(state, pick(2, 'A', 'RB'))
    expect(state.status).toBe('live') // 2 picks + 1 keeper = 3 of 4

    state = applyPick(state, pick(3, 'B', 'RB'))
    expect(state.status).toBe('completed') // 3 picks + 1 keeper = 4 of 4
    expect(state.total_picks).toBe(3)
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

  it('counts keeper picks in manager.picks when calculating filled slots', () => {
    // Keeper adds to manager.picks (is_keeper=true) and deducts budget
    // budget=200, keeper cost=75 => budget_remaining=125, picks.length=1
    // emptySlots = max(0, 2-1-1) = 0 => maxBid = 125
    let state = createInitialState('auction', [{ name: 'A', budget: 200 }], TWO_SLOT)
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'A', cost: 75 },
    ]
    state = applyKeepersToState(state, keepers, 'auction')
    expect(getMaxBid(state, 'A')).toBe(125)
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
