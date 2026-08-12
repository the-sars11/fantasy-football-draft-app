import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/research/strategy/research', () => ({
  proposeStrategies: vi.fn(),
  proposeStrategiesRuleBased: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import type { NextRequest } from 'next/server'
import { POST } from './route'
import { proposeStrategies, proposeStrategiesRuleBased } from '@/lib/research/strategy/research'
import { createClient } from '@/lib/supabase/server'

const LEAGUE_ROW = {
  id: 'league-1',
  user_id: 'user-1',
  name: 'The Nasties',
  platform: 'espn',
  format: 'auction',
  team_count: 12,
  budget: 200,
  scoring_format: 'ppr',
  roster_slots: { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5 },
  keeper_enabled: false,
  keeper_settings: null,
}

const PLAYER_ROW = {
  id: 'p1',
  name: 'Test Player',
  team: 'BUF',
  position: 'RB',
  bye_week: 7,
  injury_status: null,
  external_id: 'sleeper-1',
  adp: { sleeper: 5, espn: 6 },
  auction_values: { espn: 40, fantasypros: 42 },
  projections: { points: 250 },
  source_data: {},
  last_updated_at: '2026-08-01T00:00:00Z',
}

function makeFakeSupabase() {
  const leaguesBuilder = {
    select: () => leaguesBuilder,
    eq: () => leaguesBuilder,
    single: () => Promise.resolve({ data: LEAGUE_ROW, error: null }),
  }
  const playersBuilder = {
    select: () => playersBuilder,
    order: () => playersBuilder,
    limit: () => Promise.resolve({ data: [PLAYER_ROW], error: null }),
  }
  return {
    from: (table: string) => (table === 'leagues' ? leaguesBuilder : playersBuilder),
  }
}

function makeRequest(body: object): NextRequest {
  return new Request('http://localhost/api/strategies/propose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

describe('POST /api/strategies/propose - RV-3 error-gated fallback', () => {
  const prevKey = process.env.ANTHROPIC_API_KEY

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key'
    vi.mocked(createClient).mockResolvedValue(makeFakeSupabase() as never)
    vi.mocked(proposeStrategiesRuleBased).mockReturnValue({ proposals: [], inserts: [] })
  })

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = prevKey
    vi.clearAllMocks()
  })

  it('falls back to rule-based (never 500s) when the AI path throws with a key present', async () => {
    vi.mocked(proposeStrategies).mockRejectedValue(new Error('404 model not found'))

    const res = await POST(makeRequest({ leagueId: 'league-1' }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('rule-based')
    expect(proposeStrategiesRuleBased).toHaveBeenCalled()
  })

  it('uses the AI path and reports source:ai when it succeeds', async () => {
    vi.mocked(proposeStrategies).mockResolvedValue({ proposals: [], inserts: [] })

    const res = await POST(makeRequest({ leagueId: 'league-1' }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('ai')
  })

  it('uses rule-based directly (no AI call) when the API key is absent', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const res = await POST(makeRequest({ leagueId: 'league-1' }))

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.source).toBe('rule-based')
    expect(proposeStrategies).not.toHaveBeenCalled()
  })
})
