/**
 * pull-signal.test.ts - the cross-route Player Pull freshness signal.
 * Proves mark writes a readable per-league stamp, later marks win, and the
 * reader degrades to 0 when nothing is stored.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { markPullComplete, readPullStamp } from './pull-signal'

describe('pull-signal', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns 0 when no pull has been marked', () => {
    expect(readPullStamp('L1')).toBe(0)
  })

  it('reads back the stamp it wrote for a league', () => {
    markPullComplete('L1', 1_000)
    expect(readPullStamp('L1')).toBe(1_000)
  })

  it('keeps stamps isolated per league', () => {
    markPullComplete('L1', 1_000)
    markPullComplete('L2', 2_000)
    expect(readPullStamp('L1')).toBe(1_000)
    expect(readPullStamp('L2')).toBe(2_000)
  })

  it('overwrites with the newer pull', () => {
    markPullComplete('L1', 1_000)
    markPullComplete('L1', 5_000)
    expect(readPullStamp('L1')).toBe(5_000)
  })

  it('ignores an empty leagueId', () => {
    markPullComplete('', 1_000)
    expect(readPullStamp('')).toBe(0)
  })
})
