/**
 * flow-monitor.test.ts — Group A1 + A3.
 *
 * Covers the previously-untested draft-flow engine:
 *  - detectStrategyDrift (A1): the exact drift-firing contract that gates the
 *    live "Strategy drift" alert.
 *  - analyzeDraftFlow (A3): the public composition of the private run /
 *    value-anomaly / spending / pool-quality / alert detectors. These privates
 *    are not exported, so they are exercised through the one public entry point.
 *
 * Thresholds asserted here are read directly from flow-monitor.ts, not guessed:
 *  - drift active iff goneTargets.length > 0 && remainingTargets.length === 0
 *  - position run: count >= 3 consecutive same-position picks in the last 10
 *  - value anomaly: >40% deviation from consensus AND abs(delta) >= $3
 *  - pool depletion alert: non-K/DEF position with remainingCount <= 3
 */
import { describe, it, expect } from 'vitest'
import { analyzeDraftFlow, detectStrategyDrift } from '@/lib/draft/flow-monitor'
import {
  makePlayer,
  makeScored,
  makeTarget,
  freshAuction,
  buy,
  draftedNamesOf,
} from '@/test/factories'
import type { Player } from '@/lib/players/types'

// ── A1: detectStrategyDrift ──────────────────────────────────────────────────

describe('detectStrategyDrift (A1)', () => {
  it('fires when both targets were drafted by others and none remain', () => {
    const targets = [makeTarget('Bijan Robinson'), makeTarget('Breece Hall')]
    const drafted = new Set(['bijan robinson', 'breece hall'])
    const mine = new Set<string>()

    const drift = detectStrategyDrift(targets, drafted, mine)

    expect(drift.active).toBe(true)
    expect(drift.goneTargets).toEqual(['Bijan Robinson', 'Breece Hall'])
    expect(drift.remainingTargets).toEqual([])
  })

  it('does NOT fire while at least one target is still on the board', () => {
    const targets = [makeTarget('Bijan Robinson'), makeTarget('Breece Hall')]
    const drafted = new Set(['bijan robinson']) // Breece still available
    const drift = detectStrategyDrift(targets, drafted, new Set())

    expect(drift.active).toBe(false)
    expect(drift.goneTargets).toEqual(['Bijan Robinson'])
    expect(drift.remainingTargets).toEqual(['Breece Hall'])
  })

  it('excludes targets the user drafted themselves from goneTargets', () => {
    const targets = [makeTarget('Bijan Robinson'), makeTarget('Breece Hall')]
    const drafted = new Set(['bijan robinson', 'breece hall']) // both off the board
    const mine = new Set(['bijan robinson']) // ...but the user got Bijan

    const drift = detectStrategyDrift(targets, drafted, mine)

    // Bijan is a success, not drift. Only Breece counts as gone.
    expect(drift.goneTargets).toEqual(['Breece Hall'])
    expect(drift.goneTargets).not.toContain('Bijan Robinson')
    // Still active: one target gone to a rival, none remaining.
    expect(drift.active).toBe(true)
    expect(drift.remainingTargets).toEqual([])
  })

  it('is inactive for an empty target list', () => {
    const drift = detectStrategyDrift([], new Set(['anyone']), new Set())
    expect(drift.active).toBe(false)
    expect(drift.goneTargets).toEqual([])
    expect(drift.remainingTargets).toEqual([])
  })
})

// ── A3: analyzeDraftFlow (public composition of the private detectors) ────────

/** Build a scored pool with N players at a position, each a distinct name. */
function scoredPool(
  spec: Array<{ pos: Player['position']; count: number; score: number; value?: number }>,
): ReturnType<typeof makeScored>[] {
  const out: ReturnType<typeof makeScored>[] = []
  for (const { pos, count, score, value } of spec) {
    for (let i = 0; i < count; i++) {
      const p = makePlayer({
        id: `${pos}-${i}`,
        name: `${pos} Player ${i}`,
        position: pos,
        consensusAuctionValue: value ?? 20,
      })
      out.push(makeScored(p, { strategyScore: score }))
    }
  }
  return out
}

describe('analyzeDraftFlow - position runs (A3)', () => {
  it('flags an RB run of exactly 3 after 3 consecutive RB picks', () => {
    let state = freshAuction()
    state = buy(state, makePlayer({ name: 'RB A', position: 'RB' }), 'Rival1', 10)
    state = buy(state, makePlayer({ name: 'RB B', position: 'RB' }), 'Rival2', 10)
    state = buy(state, makePlayer({ name: 'RB C', position: 'RB' }), 'Rival3', 10)

    const flow = analyzeDraftFlow(state, [], draftedNamesOf(state), [])
    const rbRun = flow.currentRuns.find((r) => r.position === 'RB')

    expect(rbRun).toBeDefined()
    expect(rbRun!.count).toBe(3)
  })

  it('does not flag a run when the 3 picks are different positions', () => {
    let state = freshAuction()
    state = buy(state, makePlayer({ name: 'RB A', position: 'RB' }), 'Rival1', 10)
    state = buy(state, makePlayer({ name: 'WR A', position: 'WR' }), 'Rival2', 10)
    state = buy(state, makePlayer({ name: 'TE A', position: 'TE' }), 'Rival3', 10)

    const flow = analyzeDraftFlow(state, [], draftedNamesOf(state), [])
    expect(flow.currentRuns).toEqual([])
  })
})

describe('analyzeDraftFlow - value anomalies (A3)', () => {
  it('tags an overpay when price is >40% above consensus (and >= $3)', () => {
    const player = makePlayer({ name: 'Overpay Guy', position: 'WR', consensusAuctionValue: 20 })
    let state = freshAuction()
    state = buy(state, player, 'Rival1', 30) // +$10 = +50% > 40%, abs 10 >= 3

    const flow = analyzeDraftFlow(state, [], draftedNamesOf(state), [player])
    const anomaly = flow.recentAnomalies.find((a) => a.playerName === 'Overpay Guy')

    expect(anomaly).toBeDefined()
    expect(anomaly!.type).toBe('overpay')
    expect(anomaly!.delta).toBe(10)
  })

  it('tags a bargain when price is >40% below consensus', () => {
    const player = makePlayer({ name: 'Bargain Guy', position: 'WR', consensusAuctionValue: 20 })
    let state = freshAuction()
    state = buy(state, player, 'Rival1', 8) // -$12 = -60%

    const flow = analyzeDraftFlow(state, [], draftedNamesOf(state), [player])
    const anomaly = flow.recentAnomalies.find((a) => a.playerName === 'Bargain Guy')

    expect(anomaly).toBeDefined()
    expect(anomaly!.type).toBe('bargain')
    expect(anomaly!.delta).toBe(-12)
  })

  it('does NOT tag a near-consensus price (within 40%)', () => {
    const player = makePlayer({ name: 'Fair Guy', position: 'WR', consensusAuctionValue: 20 })
    // $25 vs $20 = +25% < 40% -> no anomaly.
    const state = buy(freshAuction(), player, 'Rival1', 25)

    const flow = analyzeDraftFlow(state, [], draftedNamesOf(state), [player])
    expect(flow.recentAnomalies.find((a) => a.playerName === 'Fair Guy')).toBeUndefined()
  })
})

describe('analyzeDraftFlow - pool quality + depletion alert (A3)', () => {
  it('reports exact remaining count per position and fires depletion alert at <= 3', () => {
    // Pool: 2 TE remaining (below the <=3 depletion floor), 10 WR remaining.
    const scored = scoredPool([
      { pos: 'TE', count: 2, score: 50 },
      { pos: 'WR', count: 10, score: 60 },
    ])
    const state = freshAuction()

    const flow = analyzeDraftFlow(state, scored, new Set(), [])

    const te = flow.poolQuality.find((p) => p.position === 'TE')
    const wr = flow.poolQuality.find((p) => p.position === 'WR')
    expect(te!.remainingCount).toBe(2)
    expect(wr!.remainingCount).toBe(10)

    const depletion = flow.alerts.find(
      (a) => a.type === 'pool_depletion' && a.message.includes('TE'),
    )
    expect(depletion).toBeDefined()
    expect(depletion!.severity).toBe('critical')
    // WR is deep -> no depletion alert for it.
    expect(flow.alerts.find((a) => a.type === 'pool_depletion' && a.message.includes('WR')))
      .toBeUndefined()
  })

  it('drops a drafted player out of the remaining pool count', () => {
    const scored = scoredPool([{ pos: 'RB', count: 4, score: 55 }])
    const drafted = new Set(['rb player 0']) // one of the four is gone

    const flow = analyzeDraftFlow(freshAuction(), scored, drafted, [])
    const rb = flow.poolQuality.find((p) => p.position === 'RB')
    expect(rb!.remainingCount).toBe(3)
  })
})

describe('analyzeDraftFlow - spending pace (A3)', () => {
  it('flags league spending as ahead when burn rate outpaces pick progress', () => {
    // One big early buy: $180 of a single manager's budget on pick 1.
    // Burn rate high, pick progress tiny -> aheadOrBehind = 'ahead'.
    let state = freshAuction()
    state = buy(state, makePlayer({ name: 'Whale', position: 'RB' }), 'Rival1', 180)

    const flow = analyzeDraftFlow(state, [], draftedNamesOf(state), [])
    expect(flow.spending).not.toBeNull()
    expect(flow.spending!.aheadOrBehind).toBe('ahead')
  })
})
