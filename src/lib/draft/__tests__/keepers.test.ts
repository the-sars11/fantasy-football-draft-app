import { describe, it, expect } from 'vitest'
import {
  validateKeepers,
  keepersToPicks,
  applyKeepersToState,
  isKeeperPick,
  displayPickNum,
  type KeeperAssignment,
} from '../keepers'
import { createInitialState } from '../state'
import type { RosterSlots } from '../../supabase/database.types'

const ROSTER: RosterSlots = { qb: 1, rb: 1, wr: 0, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0 }

describe('validateKeepers', () => {
  const managers = ['Alice', 'Bob']

  it('returns no errors for a valid keeper list', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 50 },
    ]
    expect(validateKeepers(keepers, 'auction', 3, managers)).toHaveLength(0)
  })

  it('errors when a manager exceeds maxKeepers', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 50 },
      { player_name: 'JT', position: 'RB', manager: 'Alice', cost: 40 },
    ]
    const errors = validateKeepers(keepers, 'auction', 1, managers)
    expect(errors.some(e => e.includes('Alice'))).toBe(true)
  })

  it('errors on duplicate player across managers', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 50 },
      { player_name: 'CMC', position: 'RB', manager: 'Bob', cost: 40 },
    ]
    const errors = validateKeepers(keepers, 'auction', 3, managers)
    expect(errors.some(e => e.toLowerCase().includes('duplicate'))).toBe(true)
  })

  it('errors on unknown manager', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Ghost', cost: 50 },
    ]
    const errors = validateKeepers(keepers, 'auction', 3, managers)
    expect(errors.some(e => e.includes('Ghost'))).toBe(true)
  })

  it('errors when cost is zero', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 0 },
    ]
    expect(validateKeepers(keepers, 'auction', 3, managers).length).toBeGreaterThan(0)
  })

  it('errors when cost is negative', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: -5 },
    ]
    expect(validateKeepers(keepers, 'auction', 3, managers).length).toBeGreaterThan(0)
  })

  it('errors when snake round is non-integer', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 2.5 },
    ]
    const errors = validateKeepers(keepers, 'snake', 3, managers)
    expect(errors.some(e => e.includes('whole number'))).toBe(true)
  })

  it('allows integer rounds for snake', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 3 },
    ]
    expect(validateKeepers(keepers, 'snake', 3, managers)).toHaveLength(0)
  })

  it('returns multiple errors at once', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Ghost', cost: 0 },
    ]
    const errors = validateKeepers(keepers, 'auction', 3, managers)
    expect(errors.length).toBeGreaterThanOrEqual(2)
  })
})

describe('keepersToPicks', () => {
  it('assigns negative pick_numbers so keepers are distinguishable', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 50 },
      { player_name: 'JT', position: 'RB', manager: 'Bob', cost: 40 },
    ]
    const picks = keepersToPicks(keepers, 'auction')
    expect(picks.every(p => p.pick_number < 0)).toBe(true)
    expect(picks[0].pick_number).toBe(-1)
    expect(picks[1].pick_number).toBe(-2)
  })

  it('sets is_keeper=true on all picks', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 50 },
    ]
    expect(keepersToPicks(keepers, 'auction').every(p => p.is_keeper === true)).toBe(true)
  })

  it('sets price (not round) for auction keepers', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 55 },
    ]
    const [p] = keepersToPicks(keepers, 'auction')
    expect(p.price).toBe(55)
    expect(p.round).toBeUndefined()
  })

  it('sets round (not price) for snake keepers', () => {
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Alice', cost: 3 },
    ]
    const [p] = keepersToPicks(keepers, 'snake')
    expect(p.round).toBe(3)
    expect(p.price).toBeUndefined()
  })
})

describe('applyKeepersToState', () => {
  it('deducts auction keeper cost from budget_remaining', () => {
    const state = createInitialState('auction', [{ name: 'A', budget: 200 }], ROSTER)
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'A', cost: 75 },
    ]
    const result = applyKeepersToState(state, keepers, 'auction')
    expect(result.managers['A'].budget_remaining).toBe(125)
  })

  it('does not touch budget for snake keepers', () => {
    const state = createInitialState('snake', [{ name: 'A', draft_position: 1 }], ROSTER)
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'A', cost: 3 },
    ]
    const result = applyKeepersToState(state, keepers, 'snake')
    expect(result.managers['A'].budget_remaining).toBeUndefined()
  })

  it('adds a keeper pick to manager.picks with is_keeper=true', () => {
    const state = createInitialState('auction', [{ name: 'A', budget: 200 }], ROSTER)
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'A', cost: 50 },
    ]
    const result = applyKeepersToState(state, keepers, 'auction')
    expect(result.managers['A'].picks).toHaveLength(1)
    expect(result.managers['A'].picks[0].is_keeper).toBe(true)
    expect(result.managers['A'].picks[0].pick_number).toBeLessThan(0)
  })

  it('tracks keeper position in roster_count', () => {
    const state = createInitialState('auction', [{ name: 'A', budget: 200 }], ROSTER)
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'A', cost: 50 },
    ]
    const result = applyKeepersToState(state, keepers, 'auction')
    expect(result.managers['A'].roster_count['RB']).toBe(1)
  })

  it('populates state.keepers array', () => {
    const state = createInitialState('auction', [{ name: 'A', budget: 200 }], ROSTER)
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'A', cost: 50 },
    ]
    const result = applyKeepersToState(state, keepers, 'auction')
    expect(result.keepers).toHaveLength(1)
    expect(result.keepers[0].player_name).toBe('CMC')
  })

  it('applies multiple keepers to different managers independently', () => {
    const state = createInitialState(
      'auction',
      [{ name: 'A', budget: 200 }, { name: 'B', budget: 200 }],
      ROSTER,
    )
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'A', cost: 50 },
      { player_name: 'JT', position: 'RB', manager: 'B', cost: 60 },
    ]
    const result = applyKeepersToState(state, keepers, 'auction')
    expect(result.managers['A'].budget_remaining).toBe(150)
    expect(result.managers['B'].budget_remaining).toBe(140)
    expect(result.managers['A'].picks).toHaveLength(1)
    expect(result.managers['B'].picks).toHaveLength(1)
  })

  it('silently skips unknown managers', () => {
    const state = createInitialState('auction', [{ name: 'A', budget: 200 }], ROSTER)
    const keepers: KeeperAssignment[] = [
      { player_name: 'CMC', position: 'RB', manager: 'Ghost', cost: 50 },
    ]
    const result = applyKeepersToState(state, keepers, 'auction')
    expect(result.managers['A'].budget_remaining).toBe(200)
  })
})

describe('isKeeperPick', () => {
  it('identifies keeper by negative pick_number', () => {
    expect(isKeeperPick({ pick_number: -1 })).toBe(true)
    expect(isKeeperPick({ pick_number: 1 })).toBe(false)
  })

  it('identifies keeper by is_keeper flag regardless of pick_number', () => {
    expect(isKeeperPick({ pick_number: 99, is_keeper: true })).toBe(true)
  })
})

describe('displayPickNum', () => {
  it('formats negative pick numbers as K labels', () => {
    expect(displayPickNum(-1)).toBe('K1')
    expect(displayPickNum(-3)).toBe('K3')
  })

  it('formats positive pick numbers as strings', () => {
    expect(displayPickNum(5)).toBe('5')
    expect(displayPickNum(100)).toBe('100')
  })
})
