/**
 * recompute-on-pick.test.ts — Group B (integration).
 *
 * These are the tests that actually answer "does the app adapt as the draft
 * happens?" They evolve REAL draft state with applyPick/buy and re-run the
 * advisor after each pick, asserting the recomputed numbers move in the right
 * direction by the exact amount the engine specifies.
 *
 *  B1 — calculateMaxBidAdvice recomputes across evolving state:
 *       scarcity boost when alternatives drain to <= 2 (up), then budget clamp
 *       when Joe's own budget shrinks (down). Exact: 72 -> 86 -> 8.
 *  B2 — detectStrategyDrift and detectPivotOpportunity flip at the exact pick
 *       that removes the last target, not before.
 */
import { describe, it, expect } from 'vitest'
import {
  calculateMaxBidAdvice,
} from '@/lib/draft/auction-advisor'
import { analyzeDraftFlow, detectStrategyDrift } from '@/lib/draft/flow-monitor'
import { detectPivotOpportunity } from '@/lib/draft/pivot-detector'
import {
  makePlayer,
  makeScored,
  makeStrategy,
  makeTarget,
  freshAuction,
  buy,
  draftedNamesOf,
} from '@/test/factories'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Position } from '@/lib/supabase/database.types'

// ── B1: max-bid recompute across evolving state ──────────────────────────────

describe('calculateMaxBidAdvice recompute-on-pick (B1)', () => {
  const JEFFERSON = 'Justin Jefferson'
  // 5 viable WR alternatives (strategyScore >= 50). Between 2 and 8 -> neither
  // scarcity nor deep-position modifier fires initially.
  const altWrs: Player[] = Array.from({ length: 5 }, (_, i) =>
    makePlayer({ id: `wr-${i}`, name: `WR Alt ${i}`, position: 'WR', consensusAuctionValue: 30 }),
  )
  const scored: ScoredPlayer[] = altWrs.map((p) => makeScored(p, { strategyScore: 55 }))

  function bidFor(state: ReturnType<typeof freshAuction>) {
    return calculateMaxBidAdvice(
      state,
      'Joe',
      JEFFERSON,
      'WR',
      55, // consensusValue -> legacy anchor round(55 * 1.3) = 72
      60, // strategyScore: neutral (>=40, <75)
      scored,
      draftedNamesOf(state),
      null,
    )
  }

  it('rises on scarcity as alternatives drain, then falls when Joe budget shrinks', () => {
    let state = freshAuction()

    // BEFORE: 5 alternatives, full budget.
    const before = bidFor(state)
    expect(before.maxBid).toBe(72)
    expect(before.factors.some((f) => f.label === 'Scarcity')).toBe(false)

    // Rivals take 3 of the 5 WR alternatives -> only 2 viable left -> scarcity.
    state = buy(state, altWrs[0], 'Rival1', 12)
    state = buy(state, altWrs[1], 'Rival2', 12)
    state = buy(state, altWrs[2], 'Rival3', 12)
    const after1 = bidFor(state)
    expect(after1.maxBid).toBe(86) // 72 * 1.2 = 86.4 -> 86
    expect(after1.maxBid).toBeGreaterThan(before.maxBid)
    expect(after1.factors.some((f) => f.label === 'Scarcity')).toBe(true)

    // Joe spends $180 on an RB -> budget_remaining 20, absoluteMax = 20 - 12 = 8.
    state = buy(state, makePlayer({ name: 'Expensive RB', position: 'RB' }), 'Joe', 180)
    const after2 = bidFor(state)
    expect(after2.maxBid).toBe(8) // scarcity anchor 86 clamped to absoluteMax 8
    expect(after2.maxBid).toBeLessThan(after1.maxBid)
  })
})

// ── B2: drift + pivot flip at the exact transition pick ──────────────────────

describe('drift + pivot transition over a scripted sequence (B2)', () => {
  // Active plan: Hero-RB, two RB targets. Alt: Zero-RB.
  const targetA = 'Bijan Robinson'
  const targetB = 'Breece Hall'

  const heroRb = makeStrategy({
    id: 'hero-rb',
    name: 'Hero RB',
    position_weights: { RB: 9, WR: 4, QB: 3, TE: 3, K: 0, DST: 2 } as Record<Position, number>,
    player_targets: [makeTarget(targetA), makeTarget(targetB)],
  })
  const zeroRb = makeStrategy({
    id: 'zero-rb',
    name: 'Zero RB',
    position_weights: { WR: 9, RB: 2, QB: 4, TE: 5, K: 0, DST: 2 } as Record<Position, number>,
    player_targets: [makeTarget('Chase'), makeTarget('Jefferson'), makeTarget('Lamb')],
  })

  // RB pool is intentionally shallow and low-scoring so remaining avgScore < 40
  // (poolQuality "depleted" contributes to the pivot score throughout).
  const rbA = makePlayer({ name: targetA, position: 'RB', consensusAuctionValue: 40 })
  const rbB = makePlayer({ name: targetB, position: 'RB', consensusAuctionValue: 38 })
  const rbDepth = Array.from({ length: 3 }, (_, i) =>
    makePlayer({ id: `rbd-${i}`, name: `RB Depth ${i}`, position: 'RB', consensusAuctionValue: 8 }),
  )
  const wrPool = Array.from({ length: 8 }, (_, i) =>
    makePlayer({ id: `wr-${i}`, name: `WR ${i}`, position: 'WR', consensusAuctionValue: 20 }),
  )
  const scored: ScoredPlayer[] = [
    makeScored(rbA, { strategyScore: 35 }),
    makeScored(rbB, { strategyScore: 35 }),
    ...rbDepth.map((p) => makeScored(p, { strategyScore: 35 })),
    ...wrPool.map((p) => makeScored(p, { strategyScore: 45 })),
  ]

  /** Recompute drift + pivot for a given state. */
  function evaluate(state: ReturnType<typeof freshAuction>) {
    const drafted = draftedNamesOf(state)
    const myPicked = new Set(
      state.managers['Joe'].picks.map((p) => p.player_name.toLowerCase()),
    )
    const drift = detectStrategyDrift(heroRb.player_targets, drafted, myPicked)
    const flow = analyzeDraftFlow(state, scored, drafted, [])
    const pivot = detectPivotOpportunity(heroRb, [heroRb, zeroRb], state, flow, scored, drafted)
    return { driftActive: drift.active, pivotFired: pivot !== null, totalPicks: state.total_picks }
  }

  it('keeps drift and pivot inactive until the last RB target leaves the board', () => {
    let state = freshAuction()

    // Step 1: rival buys a WR filler.
    state = buy(state, wrPool[0], 'Rival1', 15)
    const s1 = evaluate(state)
    expect(s1.driftActive).toBe(false)
    expect(s1.pivotFired).toBe(false)

    // Step 2: rival buys another WR filler.
    state = buy(state, wrPool[1], 'Rival2', 14)
    const s2 = evaluate(state)
    expect(s2.driftActive).toBe(false)
    expect(s2.pivotFired).toBe(false)

    // Step 3: rival takes the FIRST RB target. One target still remains.
    state = buy(state, rbA, 'Rival3', 40)
    const s3 = evaluate(state)
    expect(s3.driftActive).toBe(false) // Breece still on the board
    expect(s3.pivotFired).toBe(false) // only 1/2 targets gone -> under 15

    // Step 4: rival takes the SECOND RB target. Now both are gone.
    state = buy(state, rbB, 'Rival1', 38)
    const s4 = evaluate(state)
    expect(s4.driftActive).toBe(true) // last target gone -> drift fires
    expect(s4.pivotFired).toBe(true) // pool depleted (+8) + targets gone (+8) >= 15
    expect(s4.totalPicks).toBeGreaterThanOrEqual(3) // UI gate would also pass
  })

  it('names the alternative strategy when the pivot fires', () => {
    let state = freshAuction()
    state = buy(state, wrPool[0], 'Rival1', 15)
    state = buy(state, wrPool[1], 'Rival2', 14)
    state = buy(state, rbA, 'Rival3', 40)
    state = buy(state, rbB, 'Rival1', 38)

    const drafted = draftedNamesOf(state)
    const flow = analyzeDraftFlow(state, scored, drafted, [])
    const pivot = detectPivotOpportunity(heroRb, [heroRb, zeroRb], state, flow, scored, drafted)

    expect(pivot).not.toBeNull()
    expect(pivot!.strategy.id).toBe('zero-rb')
  })
})
