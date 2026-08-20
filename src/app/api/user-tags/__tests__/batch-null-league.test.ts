/**
 * batch-null-league.test.ts - regression for the /prep/board + /prep/simulate
 * 500 found in the R14 walkthrough.
 *
 * When a caller passes leagueId=null (which /prep/board and /prep/simulate do
 * before a league finishes loading), the batch route must filter to global
 * tags with `.is('league_id', null)` and must NEVER interpolate null into
 * `.or('league_id.eq.null,...')` - league_id is a uuid column, so the literal
 * string "null" makes Postgres throw 22P02 and the request 500s.
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/dev-mode', () => ({
  DEV_MODE: false,
}))

import type { NextRequest } from 'next/server'
import { POST } from '../batch/route'
import { createClient } from '@/lib/supabase/server'

function makeRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as unknown as NextRequest
}

/**
 * A fake Supabase query builder that records which filter methods were called.
 * The final query object is awaited by the route (`await query`), so the chain
 * must be a thenable resolving to { data, error }.
 */
function makeRecordingSupabase() {
  const calls: string[] = []
  const chain: Record<string, unknown> = {}
  const record = (name: string, ret: unknown) => (...args: unknown[]) => {
    calls.push(`${name}(${args.map((a) => JSON.stringify(a)).join(',')})`)
    return ret
  }
  chain.select = record('select', chain)
  chain.in = record('in', chain)
  chain.eq = record('eq', chain)
  chain.is = record('is', chain)
  chain.or = record('or', chain)
  // Make the chain awaitable -> resolves to an empty, error-free result set.
  chain.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) =>
    resolve({ data: [], error: null })

  return {
    calls,
    client: { from: () => chain },
  }
}

describe('POST /api/user-tags/batch - null leagueId filter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters to global tags with .is (never .or/.eq) when leagueId is null', async () => {
    const rec = makeRecordingSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockResolvedValue(rec.client as any)

    const res = await POST(
      makeRequest({
        playerCacheIds: ['56a45574-1705-4c7d-a803-7ef4b498eb2b'],
        leagueId: null,
        includeGlobal: true,
      })
    )

    expect(res.status).toBe(200)
    expect(rec.calls).toContain('is("league_id",null)')
    // The bug interpolated null into an .or() eq filter - must not happen.
    expect(rec.calls.some((c) => c.startsWith('or('))).toBe(false)
  })

  it('still uses .or when a real leagueId is given with includeGlobal', async () => {
    const rec = makeRecordingSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockResolvedValue(rec.client as any)

    const res = await POST(
      makeRequest({
        playerCacheIds: ['56a45574-1705-4c7d-a803-7ef4b498eb2b'],
        leagueId: 'aaaaaaaa-1111-2222-3333-444444444444',
        includeGlobal: true,
      })
    )

    expect(res.status).toBe(200)
    expect(
      rec.calls.some((c) => c.startsWith('or(') && c.includes('aaaaaaaa-1111-2222-3333-444444444444'))
    ).toBe(true)
  })

  it('applies no league filter when leagueId is omitted (players page path)', async () => {
    const rec = makeRecordingSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockResolvedValue(rec.client as any)

    const res = await POST(
      makeRequest({
        playerCacheIds: ['56a45574-1705-4c7d-a803-7ef4b498eb2b'],
        includeGlobal: true,
      })
    )

    expect(res.status).toBe(200)
    expect(rec.calls.some((c) => c.startsWith('or('))).toBe(false)
    expect(rec.calls.some((c) => c.startsWith('is('))).toBe(false)
  })
})
