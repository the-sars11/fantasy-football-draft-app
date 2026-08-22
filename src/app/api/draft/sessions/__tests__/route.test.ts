/**
 * draft/sessions/route.test.ts — Group C2.
 *
 * Session create/persist is how live picks reach the database. DoD asserts the
 * exact status for each validation and ownership branch, and that PATCH echoes
 * the persisted picks back unchanged.
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/dev-mode', () => ({ DEV_MODE: false }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  requireUser: vi.fn(),
}))

import type { NextRequest } from 'next/server'
import { POST } from '../route'
import { PATCH } from '../[id]/route'
import { createClient as createServerClient, requireUser } from '@/lib/supabase/server'

const USER = { id: 'user-1' }
const LEAGUE = { id: 'league-1', format: 'auction', budget: 200, team_count: 12 }

type Result = { data: unknown; error: unknown }

interface Handlers {
  leagues?: Result
  sessionSelect?: Result
  sessionInsert?: Result
  sessionUpdate?: Result
}

/**
 * Fake Supabase whose terminal `.single()` resolves a different result per
 * table and per operation (select / insert / update), so one fake covers both
 * the ownership lookup and the write.
 */
function fakeSupabase(h: Handlers) {
  return {
    from(table: string) {
      let mode: 'select' | 'insert' | 'update' = 'select'
      const b = {
        select: () => b,
        insert: () => {
          mode = 'insert'
          return b
        },
        update: () => {
          mode = 'update'
          return b
        },
        eq: () => b,
        order: () => b,
        single: () => {
          if (table === 'leagues') return Promise.resolve(h.leagues ?? { data: null, error: null })
          if (mode === 'insert') return Promise.resolve(h.sessionInsert ?? { data: null, error: null })
          if (mode === 'update') return Promise.resolve(h.sessionUpdate ?? { data: null, error: null })
          return Promise.resolve(h.sessionSelect ?? { data: null, error: null })
        },
      }
      return b
    },
  }
}

function postReq(body: object): NextRequest {
  return new Request('http://localhost/api/draft/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

function patchReq(body: object): NextRequest {
  return new Request('http://localhost/api/draft/sessions/sess-1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as NextRequest
}

const idParams = { params: Promise.resolve({ id: 'sess-1' }) }

const VALID_BODY = {
  league_id: 'league-1',
  format: 'auction' as const,
  managers: [{ name: 'Rasar' }, { name: 'Rival 1' }],
}

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue(USER as never)
  vi.mocked(createServerClient).mockResolvedValue(fakeSupabase({}) as never)
})

afterEach(() => vi.clearAllMocks())

describe('POST /api/draft/sessions - validation (C2)', () => {
  it('400 when league_id or format is missing', async () => {
    const res = await POST(postReq({ format: 'auction', managers: VALID_BODY.managers }))
    expect(res.status).toBe(400)
  })

  it('400 with fewer than 2 managers', async () => {
    const res = await POST(postReq({ ...VALID_BODY, managers: [{ name: 'Rasar' }] }))
    expect(res.status).toBe(400)
  })

  it('400 when a manager name is blank', async () => {
    const res = await POST(postReq({ ...VALID_BODY, managers: [{ name: 'Rasar' }, { name: '  ' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/name/i)
  })

  it('400 on duplicate manager names', async () => {
    const res = await POST(postReq({ ...VALID_BODY, managers: [{ name: 'Rasar' }, { name: 'Rasar' }] }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/unique/i)
  })
})

describe('POST /api/draft/sessions - ownership + create (C2)', () => {
  it('404 when the league is not owned by the user', async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      fakeSupabase({ leagues: { data: null, error: { message: 'no rows' } } }) as never,
    )
    const res = await POST(postReq(VALID_BODY))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('League not found')
  })

  it('201 with the inserted session on the valid path', async () => {
    const inserted = {
      id: 'sess-1',
      status: 'setup',
      format: 'auction',
      managers: VALID_BODY.managers,
      sheet_url: null,
      keepers: [],
      created_at: '2026-08-22T00:00:00Z',
    }
    vi.mocked(createServerClient).mockResolvedValue(
      fakeSupabase({
        leagues: { data: LEAGUE, error: null },
        sessionInsert: { data: inserted, error: null },
      }) as never,
    )

    const res = await POST(postReq(VALID_BODY))
    expect(res.status).toBe(201)
    expect((await res.json()).session).toEqual(inserted)
  })
})

describe('PATCH /api/draft/sessions/[id] (C2)', () => {
  const PICKS = [
    { player_id: 'Justin Jefferson', manager: 'Rasar', price: 45, round: 1, pick_number: 1 },
  ]

  it('404 when the session is not owned by the user', async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      fakeSupabase({ sessionSelect: { data: null, error: { message: 'no rows' } } }) as never,
    )
    const res = await PATCH(patchReq({ picks: PICKS }), idParams)
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Session not found')
  })

  it('persists picks and echoes them back on success', async () => {
    vi.mocked(createServerClient).mockResolvedValue(
      fakeSupabase({
        sessionSelect: { data: { id: 'sess-1' }, error: null },
        sessionUpdate: {
          data: { id: 'sess-1', status: 'live', picks: PICKS, updated_at: '2026-08-22T01:00:00Z' },
          error: null,
        },
      }) as never,
    )

    const res = await PATCH(patchReq({ picks: PICKS, status: 'live' }), idParams)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.session.picks).toEqual(PICKS)
    expect(json.session.status).toBe('live')
  })
})
