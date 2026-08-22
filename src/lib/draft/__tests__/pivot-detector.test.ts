/**
 * pivot-detector.test.ts — Group A2.
 *
 * Covers the previously-untested strategy-pivot engine. The scoring in
 * scoreAlternative is private, so it is exercised through detectPivotOpportunity.
 *
 * Firing contract read directly from pivot-detector.ts:
 *  - returns null if activeStrategy is null, allStrategies.length <= 1,
 *    state.total_picks < 3, or best alternative score < 15
 *  - active high-priority (weight >= 7) position with poolQuality
 *    remainingCount <= 5 && avgScore < 40  -> +8 ("<POS> pool depleted")
 *  - > 60% of active strategy targets gone                 -> +8 ("x/y targets gone")
 *  Two of those clear the 15-point bar, which is the scenario asserted below.
 */
import { describe, it, expect } from 'vitest'
import { detectPivotOpportunity } from '@/lib/draft/pivot-detector'
import type { DraftFlowState, PoolQuality } from '@/lib/draft/flow-monitor'
import { makeStrategy, makeTarget, freshAuction, buy, makePlayer } from '@/test/factories'
import type { Position } from '@/lib/supabase/database.types'

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePool(overrides: Partial<PoolQuality> & { position: string }): PoolQuality {
  return {
    position: overrides.position,
    remainingCount: overrides.remainingCount ?? 20,
    avgScore: overrides.avgScore ?? 60,
    topPlayerName: overrides.topPlayerName ?? `${overrides.position} Top`,
    topPlayerScore: overrides.topPlayerScore ?? 80,
  }
}

function makeFlow(poolQuality: PoolQuality[]): DraftFlowState {
  return {
    currentRuns: [],
    recentAnomalies: [],
    spending: null,
    poolQuality,
    alerts: [],
  }
}

/** State advanced to total_picks = 3 so the early-return guard is cleared. */
function stateWithThreePicks() {
  let state = freshAuction()
  state = buy(state, makePlayer({ name: 'Bijan Robinson', position: 'RB' }), 'Rival1', 40)
  state = buy(state, makePlayer({ name: 'Breece Hall', position: 'RB' }), 'Rival2', 38)
  state = buy(state, makePlayer({ name: 'Filler One', position: 'WR' }), 'Rival3', 10)
  return state
}

const heroRb = makeStrategy({
  id: 'hero-rb',
  name: 'Hero RB',
  position_weights: { RB: 9, WR: 4, QB: 3, TE: 3, K: 0, DST: 2 } as Record<Position, number>,
  player_targets: [makeTarget('Bijan Robinson'), makeTarget('Breece Hall')],
  risk_tolerance: 'balanced',
})

const zeroRb = makeStrategy({
  id: 'zero-rb',
  name: 'Zero RB',
  position_weights: { WR: 9, RB: 2, QB: 4, TE: 5, K: 0, DST: 2 } as Record<Position, number>,
  player_targets: [makeTarget('Ja\'Marr Chase'), makeTarget('Justin Jefferson'), makeTarget('CeeDee Lamb')],
  risk_tolerance: 'balanced',
})

// ── A2 ───────────────────────────────────────────────────────────────────────

describe('detectPivotOpportunity (A2)', () => {
  it('suggests the alternative when the active RB plan is depleted and its targets are gone', () => {
    const flow = makeFlow([
      makePool({ position: 'RB', remainingCount: 3, avgScore: 30 }), // depleted -> +8
      makePool({ position: 'WR', remainingCount: 18, avgScore: 62 }), // alt still rich
    ])
    // Both Hero-RB targets already drafted by rivals -> 2/2 = 100% gone -> +8.
    const draftedNames = new Set(['bijan robinson', 'breece hall'])

    const suggestion = detectPivotOpportunity(
      heroRb,
      [heroRb, zeroRb],
      stateWithThreePicks(),
      flow,
      [],
      draftedNames,
    )

    expect(suggestion).not.toBeNull()
    expect(suggestion!.strategy.id).toBe('zero-rb')
    expect(suggestion!.reason).toContain('targets gone')
    expect(suggestion!.reason).toContain('pool depleted')
  })

  it('returns null when pools are healthy and no targets are gone', () => {
    const flow = makeFlow([
      makePool({ position: 'RB', remainingCount: 20, avgScore: 60 }), // healthy
      makePool({ position: 'WR', remainingCount: 8, avgScore: 45 }), // not rich enough for +5
    ])
    const draftedNames = new Set<string>() // no targets gone

    const suggestion = detectPivotOpportunity(
      heroRb,
      [heroRb, zeroRb],
      stateWithThreePicks(),
      flow,
      [],
      draftedNames,
    )

    expect(suggestion).toBeNull()
  })

  it('returns null when there is only one strategy to choose from', () => {
    const flow = makeFlow([makePool({ position: 'RB', remainingCount: 3, avgScore: 30 })])
    const suggestion = detectPivotOpportunity(
      heroRb,
      [heroRb], // no alternatives
      stateWithThreePicks(),
      flow,
      [],
      new Set(['bijan robinson', 'breece hall']),
    )
    expect(suggestion).toBeNull()
  })

  it('returns null before pick 3 even when conditions otherwise favor a pivot', () => {
    const flow = makeFlow([
      makePool({ position: 'RB', remainingCount: 3, avgScore: 30 }),
      makePool({ position: 'WR', remainingCount: 18, avgScore: 62 }),
    ])
    const earlyState = freshAuction() // total_picks = 0
    const suggestion = detectPivotOpportunity(
      heroRb,
      [heroRb, zeroRb],
      earlyState,
      flow,
      [],
      new Set(['bijan robinson', 'breece hall']),
    )
    expect(suggestion).toBeNull()
  })
})
