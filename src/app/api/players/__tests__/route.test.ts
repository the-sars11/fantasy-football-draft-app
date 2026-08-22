/**
 * players/route.test.ts — Group C3.
 *
 * The board and every pool-quality calc reads from this endpoint. DoD asserts
 * the exact query the handler builds, not just that it returns rows:
 *  - default limit === 300
 *  - ?position=DEF is translated to the DB value 'DST'
 *  - the empty-adp exclusion filter .not('adp','eq','{}') is present
 *  - no client -> 503
 */
import { vi, describe, it, expect, afterEach } from 'vitest'

vi.mock('@/lib/supabase/dev-mode', () => ({ DEV_MODE: false }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import type { NextRequest } from 'next/server'
import { GET } from '../route'
import { createClient as createServerClient } from '@/lib/supabase/server'

const PLAYER_ROW = { id: 'p1', name: 'Test Player', position: 'RB', adp: { sleeper: 5 } }

interface Recorded {
  notArgs?: unknown[]
  limit?: number
  eq?: { col: string; val: string }
}

/** Chainable + thenable query builder that records the params the route sets. */
function fakeClient(rows: unknown[]) {
  const rec: Recorded = {}
  const builder = {
    select: () => builder,
    not: (...a: unknown[]) => {
      rec.notArgs = a
      return builder
    },
    order: () => builder,
    limit: (n: number) => {
      rec.limit = n
      return builder
    },
    eq: (col: string, val: string) => {
      rec.eq = { col, val }
      return builder
    },
    // Awaited at the end of the chain -> resolves the query result.
    then: (resolve: (v: { data: unknown[]; error: null }) => void) =>
      resolve({ data: rows, error: null }),
  }
  const client = { from: () => builder }
  return { client, rec }
}

function req(query = '') {
  return new Request(`http://localhost/api/players${query}`) as NextRequest
}

afterEach(() => vi.clearAllMocks())

describe('GET /api/players (C3)', () => {
  it('defaults to limit 300 and returns { players, count }', async () => {
    const { client, rec } = fakeClient([PLAYER_ROW])
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    const res = await GET(req())
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(rec.limit).toBe(300)
    expect(json.players).toEqual([PLAYER_ROW])
    expect(json.count).toBe(1)
  })

  it('maps ?position=DEF to the DB position "DST"', async () => {
    const { client, rec } = fakeClient([])
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await GET(req('?position=DEF'))
    expect(rec.eq).toEqual({ col: 'position', val: 'DST' })
  })

  it('passes a non-DEF position through unchanged', async () => {
    const { client, rec } = fakeClient([])
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await GET(req('?position=WR'))
    expect(rec.eq).toEqual({ col: 'position', val: 'WR' })
  })

  it('applies the empty-adp exclusion filter', async () => {
    const { client, rec } = fakeClient([])
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await GET(req())
    expect(rec.notArgs).toEqual(['adp', 'eq', '{}'])
  })

  it('honors an explicit ?limit', async () => {
    const { client, rec } = fakeClient([])
    vi.mocked(createServerClient).mockResolvedValue(client as never)

    await GET(req('?limit=50'))
    expect(rec.limit).toBe(50)
  })

  it('returns 503 when no database client is available', async () => {
    vi.mocked(createServerClient).mockResolvedValue(null as never)

    const res = await GET(req())
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe('Database not available')
  })
})
