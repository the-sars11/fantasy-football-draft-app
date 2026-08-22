/**
 * use-draft-state.test.ts — Group B3.
 *
 * Proves the pick-arrival path every adaptive memo in client.tsx is keyed on:
 * a pick enters through addManualPick, and the two derived values the whole
 * live screen reads off of - draftedNames and the manager budget - update
 * exactly. If this wiring is wrong, every downstream recompute is stale.
 *
 * DoD (un-fakable, exact):
 *  - fresh session:  draftedNames.size === 0  and getBudget('Rasar') === 200
 *  - after a $45 Rasar pick: draftedNames contains the lowercased name AND
 *    getBudget('Rasar') === 155 (200 - 45), not merely "changed".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDraftState } from '@/hooks/use-draft-state'
import { NASTIES_SLOTS } from '@/test/factories'
import type { DraftSession } from '@/lib/supabase/database.types'

// The hook fire-and-forgets a PATCH to /api/draft/sessions/[id] on every pick.
// Stub it to a resolved ok response so persistPicks never hits the network or
// logs a failure; the derived state under test is synchronous and independent
// of the persist result.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, status: 200 }) as Response),
  )
  window.localStorage.clear()
})

function nastiesSession(): DraftSession {
  const rivals = Array.from({ length: 11 }, (_, i) => ({ name: `Rival ${i + 1}`, budget: 200 }))
  return {
    id: 'sess-b3',
    user_id: 'u1',
    league_id: 'lg1',
    sheet_url: null,
    format: 'auction',
    status: 'live',
    managers: [{ name: 'Rasar', budget: 200 }, ...rivals],
    picks: [],
    keepers: [],
    recommendations: [],
    created_at: '2026-08-22T00:00:00Z',
    updated_at: '2026-08-22T00:00:00Z',
  }
}

describe('useDraftState pick-arrival wiring (B3)', () => {
  it('starts empty at full budget, then reflects a Rasar pick in draftedNames and budget', async () => {
    const session = nastiesSession()
    const { result } = renderHook(() =>
      useDraftState({ session, rosterSlots: NASTIES_SLOTS }),
    )

    // Init effect has run: state seeded, nothing drafted, full auction budget.
    expect(result.current.state).not.toBeNull()
    expect(result.current.draftedNames.size).toBe(0)
    expect(result.current.getBudget('Rasar')).toBe(200)

    // A pick arrives for my seat. await act flushes the fire-and-forget persist.
    await act(async () => {
      result.current.addManualPick({
        player_name: 'Justin Jefferson',
        manager: 'Rasar',
        price: 45,
        position: 'WR',
      })
    })

    // draftedNames is what filters the available pool and feeds every memo.
    expect(result.current.draftedNames.has('justin jefferson')).toBe(true)
    expect(result.current.draftedNames.size).toBe(1)
    // Budget floor that max-bid clamps against: 200 - 45 = 155, exact.
    expect(result.current.getBudget('Rasar')).toBe(155)
  })

  it('deducts only from the buying manager, leaving rivals at full budget', async () => {
    const session = nastiesSession()
    const { result } = renderHook(() =>
      useDraftState({ session, rosterSlots: NASTIES_SLOTS }),
    )

    await act(async () => {
      result.current.addManualPick({
        player_name: 'Bijan Robinson',
        manager: 'Rival 1',
        price: 60,
        position: 'RB',
      })
    })

    expect(result.current.getBudget('Rival 1')).toBe(140) // 200 - 60
    expect(result.current.getBudget('Rasar')).toBe(200) // untouched
    expect(result.current.draftedNames.has('bijan robinson')).toBe(true)
  })
})
