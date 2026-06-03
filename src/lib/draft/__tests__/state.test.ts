import { describe, it, expect } from 'vitest'
import { createInitialState, applyPick, type DraftPick } from '../state'
import { applyKeepersToState, type KeeperAssignment } from '../keepers'
import type { RosterSlots } from '../../supabase/database.types'

// Minimal roster: 1 QB + 1 RB per team. With 2 teams => 4 total roster spots.
const ROSTER: RosterSlots = {
  qb: 1, rb: 1, wr: 0, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0,
}

function pick(n: number, manager: string, position: string): DraftPick {
  return { pick_number: n, player_name: `Player ${n}`, position, manager }
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
