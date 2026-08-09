import { describe, it, expect } from 'vitest'
import { createInitialState, applyPick, applySheetRows, type DraftPick } from '../state'
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
