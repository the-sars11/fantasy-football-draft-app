import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveSessionCache,
  loadSessionCache,
  saveDraftStateCache,
  loadDraftStateCache,
  clearDraftCache,
  resolveInitialDraftState,
} from '../offline-cache'
import { createInitialState, applyPick, type DraftState } from '../state'
import type { DraftSession, League, RosterSlots } from '../../supabase/database.types'

const ROSTER: RosterSlots = {
  qb: 1, rb: 1, wr: 0, te: 0, flex: 0, k: 0, dst: 0, bench: 0, ir: 0,
}

function makeSession(id: string): DraftSession {
  return {
    id,
    user_id: 'u1',
    league_id: 'l1',
    sheet_url: null,
    format: 'auction',
    status: 'live',
    managers: [{ name: 'A', budget: 200 }, { name: 'B', budget: 200 }],
    picks: [],
    keepers: [],
    recommendations: [],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function makeLeague(): League {
  return {
    id: 'l1',
    user_id: 'u1',
    name: 'Test League',
    platform: 'espn',
    format: 'auction',
    team_count: 2,
    budget: 200,
    scoring_format: 'ppr',
    scoring_settings: null,
    roster_slots: ROSTER,
    keeper_enabled: false,
    keeper_settings: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  }
}

function makeState(picks: number): DraftState {
  let state = createInitialState(
    'auction',
    [{ name: 'A', budget: 200 }, { name: 'B', budget: 200 }],
    ROSTER,
  )
  for (let i = 1; i <= picks; i++) {
    state = applyPick(state, {
      pick_number: i,
      player_name: `Player ${i}`,
      manager: i % 2 === 0 ? 'B' : 'A',
      price: 10,
      position: i % 2 === 0 ? 'RB' : 'QB',
    })
  }
  return state
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('session cache', () => {
  it('round-trips a saved session + league', () => {
    const session = makeSession('s1')
    const league = makeLeague()
    saveSessionCache('s1', session, league)

    const loaded = loadSessionCache('s1')
    expect(loaded).not.toBeNull()
    expect(loaded?.session.id).toBe('s1')
    expect(loaded?.league?.name).toBe('Test League')
    expect(typeof loaded?.savedAt).toBe('string')
  })

  it('returns null when nothing is cached', () => {
    expect(loadSessionCache('missing')).toBeNull()
  })

  it('isolates by session id -- a cache saved under one id is invisible under another', () => {
    saveSessionCache('s1', makeSession('s1'), makeLeague())
    expect(loadSessionCache('s2')).toBeNull()
  })

  it('returns null on corrupted JSON instead of throwing', () => {
    window.localStorage.setItem('ffi-draft-session-cache:s1', '{not valid json')
    expect(() => loadSessionCache('s1')).not.toThrow()
    expect(loadSessionCache('s1')).toBeNull()
  })

  it('supports a null league (session without a resolved league)', () => {
    saveSessionCache('s1', makeSession('s1'), null)
    const loaded = loadSessionCache('s1')
    expect(loaded?.league).toBeNull()
  })
})

describe('draft state cache', () => {
  it('round-trips a saved DraftState with its synced flag', () => {
    const state = makeState(2)
    saveDraftStateCache('s1', state, false)

    const loaded = loadDraftStateCache('s1')
    expect(loaded).not.toBeNull()
    expect(loaded?.synced).toBe(false)
    expect(loaded?.state.picks).toHaveLength(2)
    expect(loaded?.state.managers.A.budget_remaining).toBe(190)
  })

  it('returns null when nothing is cached', () => {
    expect(loadDraftStateCache('missing')).toBeNull()
  })

  it('returns null on corrupted JSON instead of throwing', () => {
    window.localStorage.setItem('ffi-draft-state-cache:s1', '{"state":"not an object"')
    expect(loadDraftStateCache('s1')).toBeNull()
  })

  it('returns null when the cached payload has no valid picks array', () => {
    window.localStorage.setItem('ffi-draft-state-cache:s1', JSON.stringify({ state: {}, savedAt: 'x', synced: true }))
    expect(loadDraftStateCache('s1')).toBeNull()
  })

  it('clearDraftCache removes both session and state entries', () => {
    saveSessionCache('s1', makeSession('s1'), makeLeague())
    saveDraftStateCache('s1', makeState(1), true)

    clearDraftCache('s1')

    expect(loadSessionCache('s1')).toBeNull()
    expect(loadDraftStateCache('s1')).toBeNull()
  })

  it('degrades silently when localStorage.setItem throws (quota exceeded / private browsing)', () => {
    const spy = vi.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    expect(() => saveDraftStateCache('s1', makeState(1), true)).not.toThrow()
    spy.mockRestore()
  })
})

describe('resolveInitialDraftState', () => {
  it('uses the server-replayed state when there is no cache', () => {
    const replayed = makeState(1)
    const result = resolveInitialDraftState(replayed, null, false)
    expect(result.source).toBe('server')
    expect(result.state).toBe(replayed)
  })

  it('trusts the cache outright when currently offline, even with fewer picks', () => {
    const replayed = makeState(2)
    const cached = { state: makeState(1), savedAt: 'x', synced: false }
    const result = resolveInitialDraftState(replayed, cached, true)
    expect(result.source).toBe('cache')
  })

  it('prefers the cache when online and it has strictly more picks than the server replay', () => {
    const replayed = makeState(1)
    const cached = { state: makeState(3), savedAt: 'x', synced: false }
    const result = resolveInitialDraftState(replayed, cached, false)
    expect(result.source).toBe('cache')
    expect(result.state.picks).toHaveLength(3)
  })

  it('prefers the server when online and it has caught up to or passed the cache', () => {
    const replayed = makeState(3)
    const cached = { state: makeState(3), savedAt: 'x', synced: true }
    const result = resolveInitialDraftState(replayed, cached, false)
    expect(result.source).toBe('server')
  })
})
