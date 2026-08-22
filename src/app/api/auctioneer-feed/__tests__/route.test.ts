/**
 * auctioneer-feed/route.test.ts — Group C1.
 *
 * The live draft's whole data path enters through this proxy. Contract
 * (verified from route.ts): it ALWAYS returns HTTP 200 with an
 * `{ state, error? }` envelope so the client never has to handle a proxy error
 * status; upstream failures collapse to `{ state: null, error }`.
 *
 * DoD (un-fakable): each branch asserts the exact envelope AND status 200, and
 * the forwarded upstream URL is asserted exactly (code encoding + origin
 * trailing-slash strip).
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

const ORIGIN = 'https://auct.test'

/** Build an upstream Response stand-in with a given ok/status/body. */
function upstream(ok: boolean, status: number, body: string) {
  return { ok, status, text: async () => body } as unknown as Response
}

function req(code?: string) {
  const url = code
    ? `http://localhost/api/auctioneer-feed?code=${code}`
    : 'http://localhost/api/auctioneer-feed'
  return new NextRequest(url)
}

let prevOrigin: string | undefined

beforeEach(() => {
  prevOrigin = process.env.NEXT_PUBLIC_AUCTIONEER_ORIGIN
  process.env.NEXT_PUBLIC_AUCTIONEER_ORIGIN = ORIGIN
})

afterEach(() => {
  process.env.NEXT_PUBLIC_AUCTIONEER_ORIGIN = prevOrigin
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('GET /api/auctioneer-feed (C1)', () => {
  it('wraps a live upstream DraftState in { state } at 200', async () => {
    const draftState = { config: {}, picks: [], phase: 'live', pickNumber: 3 }
    vi.stubGlobal('fetch', vi.fn(async () => upstream(true, 200, JSON.stringify(draftState))))

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ state: draftState })
  })

  it('returns { state: null, error } (still 200) when upstream is 404', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => upstream(false, 404, '')))

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ state: null, error: 'Auctioneer responded 404' })
  })

  it('returns { state: null, error } (200) when upstream is 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => upstream(false, 500, '')))

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ state: null, error: 'Auctioneer responded 500' })
  })

  it('returns { state: null } for an empty body (no active draft)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => upstream(true, 200, '   ')))

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ state: null })
  })

  it('returns { state: null } for the literal string "null"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => upstream(true, 200, 'null')))

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ state: null })
  })

  it('returns { state: null, error: /malformed/ } for non-JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => upstream(true, 200, '{not json')))

    const res = await GET(req())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.state).toBeNull()
    expect(json.error).toMatch(/malformed/i)
  })

  it('returns { state: null, error: /timed out/ } on an AbortError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        const e = new Error('The operation was aborted')
        e.name = 'AbortError'
        throw e
      }),
    )

    const res = await GET(req())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.state).toBeNull()
    expect(json.error).toMatch(/timed out/i)
  })

  it('forwards no ?code to the bare /api/state URL', async () => {
    const fetchMock = vi.fn(async () => upstream(true, 200, 'null'))
    vi.stubGlobal('fetch', fetchMock)

    await GET(req())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe(`${ORIGIN}/api/state`)
  })

  it('URL-encodes a forwarded ?code', async () => {
    const fetchMock = vi.fn(async () => upstream(true, 200, 'null'))
    vi.stubGlobal('fetch', fetchMock)

    await GET(req('ABC%20123')) // decodes to "ABC 123", must re-encode
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe(`${ORIGIN}/api/state?code=ABC%20123`)
  })

  it('strips trailing slashes from the configured origin', async () => {
    process.env.NEXT_PUBLIC_AUCTIONEER_ORIGIN = 'https://auct.test///'
    const fetchMock = vi.fn(async () => upstream(true, 200, 'null'))
    vi.stubGlobal('fetch', fetchMock)

    await GET(req())
    expect((fetchMock.mock.calls[0] as unknown[])[0]).toBe('https://auct.test/api/state')
  })
})
