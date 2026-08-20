/**
 * strategy-proposals-reflow.test.tsx - closes the confirmed functional gap
 * (BUILD_PLAN.md line 517): a fresh Player Pull on /prep must re-flow the
 * strategy proposals on /prep/strategies.
 *
 * The component fetches once and caches (fetchedRef). This proves that when a
 * newer pull stamp is signaled and the tab regains focus, StrategyProposals
 * re-runs its /api/strategies/propose fetch - and that an ordinary focus with
 * no new pull does NOT trigger a re-fetch.
 */

import '@testing-library/jest-dom'
import { render, waitFor, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StrategyProposals } from '../strategy-proposals'
import { markPullComplete } from '@/lib/prep/pull-signal'

function jsonOk(body: unknown): Promise<Response> {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(body) } as Response)
}

describe('StrategyProposals - Player Pull re-flow', () => {
  let proposeCalls = 0

  beforeEach(() => {
    proposeCalls = 0
    window.localStorage.clear()
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string | URL) => {
        const u = String(url)
        if (u.includes('/api/strategies/propose')) {
          proposeCalls++
          return jsonOk({
            proposals: [],
            meta: { leagueId: 'L1', format: 'auction', playerCount: 0, proposalCount: 0 },
          })
        }
        if (u.includes('/api/strategies/ratings')) {
          return jsonOk({ ratings: [] })
        }
        return jsonOk({})
      })
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('re-fetches proposals when a newer Player Pull is signaled + tab refocuses', async () => {
    render(<StrategyProposals leagueId="L1" format="auction" />)
    await waitFor(() => expect(proposeCalls).toBe(1))

    // A fresh pull lands with a stamp newer than the one proposals were built from.
    act(() => {
      markPullComplete('L1', Date.now() + 10_000)
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => expect(proposeCalls).toBe(2))
  })

  it('does NOT re-fetch on focus when no new pull happened', async () => {
    render(<StrategyProposals leagueId="L1" format="auction" />)
    await waitFor(() => expect(proposeCalls).toBe(1))

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(proposeCalls).toBe(1)
  })
})
