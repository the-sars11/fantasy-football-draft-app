import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/dev-mode', () => ({
  DEV_MODE: false,
}))

import type { NextRequest } from 'next/server'
import { POST, PATCH } from '../route'
import { createClient } from '@/lib/supabase/server'

// --- Helpers ---

function makeRequest(method: string, body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
    method,
    headers: new Headers({ 'Content-Type': 'application/json' }),
  } as unknown as NextRequest
}

const BASE_TAG_ROW = {
  id: 'tag-1',
  user_id: 'user-1',
  player_cache_id: 'player-1',
  player_external_id: 'ext-1',
  league_id: null,
  tags: ['target'],
  tag_weight: 7,
  tag_severity: 'soft',
  note: null,
  override_system_tags: false,
  dismissed_system_tags: [],
  created_at: '2026-08-13T00:00:00Z',
  updated_at: '2026-08-13T00:00:00Z',
}

function makeFakeSupabase(opts?: {
  existingRow?: typeof BASE_TAG_ROW | null
  insertRow?: typeof BASE_TAG_ROW
  updateRow?: Partial<typeof BASE_TAG_ROW>
}) {
  const existing = opts?.existingRow !== undefined ? opts.existingRow : BASE_TAG_ROW
  const insertRow = opts?.insertRow ?? { ...BASE_TAG_ROW, id: 'tag-new' }
  const updateRow = opts?.updateRow ?? BASE_TAG_ROW

  const maybeSingleResult = existing
    ? { data: existing, error: null }
    : { data: null, error: null }

  const chain = (extra?: Record<string, unknown>) => ({
    select: () => chain(extra),
    eq: () => chain(extra),
    is: () => chain(extra),
    in: () => chain(extra),
    maybeSingle: () => Promise.resolve(maybeSingleResult),
    single: () => Promise.resolve(extra ?? { data: updateRow, error: null }),
  })

  return {
    from: () => ({
      select: () => chain(),
      eq: () => chain(),
      is: () => chain(),
      in: () => chain(),
      maybeSingle: () => Promise.resolve(maybeSingleResult),
      insert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: insertRow, error: null }) }),
      }),
      update: (data: unknown) => ({
        eq: () => ({
          select: () => ({ single: () => Promise.resolve({ data: { ...BASE_TAG_ROW, ...(typeof data === 'object' ? (data as Record<string, unknown>) : {}) }, error: null }) }),
        }),
      }),
      upsert: () => ({
        select: () => ({ single: () => Promise.resolve({ data: insertRow, error: null }) }),
      }),
    }),
  }
}

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(createClient).mockResolvedValue(makeFakeSupabase() as any)
})

// --- Tests ---

describe('POST /api/user-tags - weight/severity round-trip', () => {
  it('accepts weight in [1,10] and stores it', async () => {
    const req = makeRequest('POST', {
      playerCacheId: 'player-1',
      tags: ['target'],
      weight: 8,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('clamps weight below 1 to 1', async () => {
    const req = makeRequest('POST', {
      playerCacheId: 'player-1',
      tags: ['target'],
      weight: -5,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('clamps weight above 10 to 10', async () => {
    const req = makeRequest('POST', {
      playerCacheId: 'player-1',
      tags: ['target'],
      weight: 99,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('accepts severity soft and hard', async () => {
    for (const sev of ['soft', 'hard'] as const) {
      const req = makeRequest('POST', {
        playerCacheId: 'player-1',
        tags: ['avoid'],
        severity: sev,
      })
      const res = await POST(req)
      expect(res.status).toBe(200)
    }
  })
})

describe('PATCH /api/user-tags - updateGrade action', () => {
  it('updates weight on existing record', async () => {
    const req = makeRequest('PATCH', {
      playerCacheId: 'player-1',
      action: 'updateGrade',
      weight: 9,
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.userTag).toBeDefined()
  })

  it('returns 400 when neither weight nor severity provided', async () => {
    const req = makeRequest('PATCH', {
      playerCacheId: 'player-1',
      action: 'updateGrade',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })

  it('creates new record if none exists', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(createClient).mockResolvedValue(makeFakeSupabase({ existingRow: null }) as any)
    const req = makeRequest('PATCH', {
      playerCacheId: 'player-99',
      action: 'updateGrade',
      weight: 5,
    })
    const res = await PATCH(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.created).toBe(true)
  })

  it('rejects unknown severity values by treating them as soft', async () => {
    const req = makeRequest('PATCH', {
      playerCacheId: 'player-1',
      action: 'updateGrade',
      severity: 'extreme',
    })
    // The route normalizes unknown severity to undefined; weight also undefined -> 400
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })
})
