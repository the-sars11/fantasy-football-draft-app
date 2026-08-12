import { describe, it, expect } from 'vitest'
import { dbLeagueToAppLeague } from '../league-mapper'
import type { League as DbLeague } from '@/lib/supabase/database.types'

// Nasties 2026 base row - the league shape the app is calibrated for.
function dbRow(overrides: Partial<DbLeague> = {}): DbLeague {
  return {
    id: 'abc-123',
    user_id: 'u-joe',
    name: 'Nasties 2026',
    platform: 'espn',
    format: 'auction',
    team_count: 12,
    budget: 200,
    scoring_format: 'ppr',
    scoring_settings: null,
    roster_slots: { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1 },
    keeper_enabled: false,
    keeper_settings: null,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-08-12T00:00:00Z',
    ...overrides,
  }
}

describe('dbLeagueToAppLeague -- Nasties 12-team config', () => {
  it('maps team_count -> size correctly (12 teams)', () => {
    expect(dbLeagueToAppLeague(dbRow()).size).toBe(12)
  })

  it('preserves format auction', () => {
    expect(dbLeagueToAppLeague(dbRow()).format).toBe('auction')
  })

  it('maps budget 200 through unchanged', () => {
    expect(dbLeagueToAppLeague(dbRow()).budget).toBe(200)
  })

  it('maps budget: null -> undefined (DB nullable -> app optional)', () => {
    const league = dbLeagueToAppLeague(dbRow({ budget: null }))
    expect(league.budget).toBeUndefined()
  })

  it('maps roster_slots.dst -> rosterSlots.def (DST/DEF convention)', () => {
    const league = dbLeagueToAppLeague(dbRow())
    expect(league.rosterSlots.def).toBe(1)
    // The app type must NOT expose .dst -- that field stays DB-layer only.
    expect((league.rosterSlots as unknown as Record<string, number>).dst).toBeUndefined()
  })

  it('hardcodes superflex: 0 (not in DB schema, Nasties has none)', () => {
    expect(dbLeagueToAppLeague(dbRow()).rosterSlots.superflex).toBe(0)
  })

  it('maps k: 0 (Nasties no-kicker rule)', () => {
    expect(dbLeagueToAppLeague(dbRow()).rosterSlots.k).toBe(0)
  })

  it('converts half_ppr -> half-ppr (DB underscore -> app hyphen)', () => {
    const league = dbLeagueToAppLeague(dbRow({ scoring_format: 'half_ppr' }))
    expect(league.scoringFormat).toBe('half-ppr')
  })

  it('passes ppr through unchanged', () => {
    expect(dbLeagueToAppLeague(dbRow()).scoringFormat).toBe('ppr')
  })

  it('returns no keeperSettings when keeper_enabled is false', () => {
    const league = dbLeagueToAppLeague(dbRow({ keeper_enabled: false }))
    expect(league.keeperSettings).toBeUndefined()
  })

  it('returns no keeperSettings when keeper_enabled true but keeper_settings null', () => {
    const league = dbLeagueToAppLeague(dbRow({ keeper_enabled: true, keeper_settings: null }))
    expect(league.keeperSettings).toBeUndefined()
  })
})
