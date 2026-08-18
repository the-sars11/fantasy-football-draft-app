/**
 * sim-results.test.ts — R10b orchestration: DEC-1 bias mapping, the stitched
 * summary, and the trimmed persistence shape.
 */

import { describe, it, expect } from 'vitest'
import {
  buildMyBiasFromTags,
  buildSimSummary,
  toPersistedSim,
  SIM_RUN_KIND,
} from '../sim-results'
import type { SimEngineInput } from '../sim-engine'
import type { BoardPlayer } from '../roster-solver'

// ─── DEC-1 bias mapping ──────────────────────────────────────────────────────

describe('buildMyBiasFromTags', () => {
  it('maps a graded target to a weighted target lean', () => {
    const bias = buildMyBiasFromTags({
      p1: { tags: ['target'], tagWeight: 8, tagSeverity: 'soft' },
    })
    expect(bias.p1).toEqual({ kind: 'target', weight: 8 })
  })

  it('maps avoids by severity (hard vs soft)', () => {
    const bias = buildMyBiasFromTags({
      hardGuy: { tags: ['avoid'], tagWeight: 0, tagSeverity: 'hard' },
      softGuy: { tags: ['avoid'], tagWeight: 0, tagSeverity: 'soft' },
    })
    expect(bias.hardGuy).toEqual({ kind: 'avoid', severity: 'hard' })
    expect(bias.softGuy).toEqual({ kind: 'avoid', severity: 'soft' })
  })

  it('clamps target weight into 1..10', () => {
    const bias = buildMyBiasFromTags({
      hi: { tags: ['target'], tagWeight: 99, tagSeverity: 'soft' },
      lo: { tags: ['target'], tagWeight: 0, tagSeverity: 'soft' },
    })
    expect(bias.hi).toEqual({ kind: 'target', weight: 10 })
    expect(bias.lo).toEqual({ kind: 'target', weight: 1 })
  })

  it('omits players with neither target nor avoid', () => {
    const bias = buildMyBiasFromTags({
      plain: { tags: ['sleeper'], tagWeight: 5, tagSeverity: 'soft' },
    })
    expect(bias.plain).toBeUndefined()
    expect(Object.keys(bias)).toHaveLength(0)
  })
})

// ─── Stitched summary + persistence ──────────────────────────────────────────

function board(): BoardPlayer[] {
  const b: BoardPlayer[] = []
  const spec: [BoardPlayer['position'], number][] = [
    ['QB', 6], ['RB', 12], ['WR', 12], ['TE', 6], ['DEF', 6],
  ]
  for (const [pos, n] of spec) {
    for (let i = 0; i < n; i++) {
      const ceiling = Math.max(1, 40 - i * 2)
      b.push({
        id: `${pos}${i + 1}`,
        name: `${pos}${i + 1}`,
        position: pos,
        expectedCost: Math.max(1, Math.round(ceiling * 0.8)),
        ceiling,
        projectedPoints: 200 - i * 5,
      })
    }
  }
  return b
}

function input(overrides: Partial<SimEngineInput> = {}): SimEngineInput {
  return {
    board: board(),
    rosterConfig: { qb: 1, rb: 1, wr: 1, te: 1, flex: 1, dst: 1, bench: 1 },
    numManagers: 4,
    budget: 200,
    runs: 6,
    seed: 1,
    ...overrides,
  }
}

describe('buildSimSummary', () => {
  it('produces a graded record, at most 5 modal rosters, and a landed table', () => {
    const summary = buildSimSummary(input())
    expect(summary.grade.runs).toBe(6)
    expect(summary.grade.games).toBe(14)
    expect(summary.grade.meanWins + summary.grade.meanLosses).toBeCloseTo(14, 0)
    expect(summary.topRosters.length).toBeLessThanOrEqual(5)
    expect(summary.topRosters.length).toBeGreaterThan(0)
    expect(summary.landed.length).toBeGreaterThan(0)
    expect(summary.runGrades).toHaveLength(6)
    expect(summary.config.biasedPlayers).toBe(0)
  })

  it('counts the biased players fed to the me-seat', () => {
    const summary = buildSimSummary(
      input({ myBias: { RB1: { kind: 'target', weight: 9 } } }),
    )
    expect(summary.config.biasedPlayers).toBe(1)
  })

  it('honors a custom regular-season length', () => {
    const summary = buildSimSummary(input(), { games: 13 })
    expect(summary.grade.games).toBe(13)
    expect(summary.grade.meanWins + summary.grade.meanLosses).toBeCloseTo(13, 0)
  })
})

describe('toPersistedSim', () => {
  it('stamps the sim discriminator, drops per-run detail, and caps the landed list', () => {
    const summary = buildSimSummary(input())
    const persisted = toPersistedSim(summary, 3)
    expect(persisted.kind).toBe(SIM_RUN_KIND)
    expect(persisted.landed.length).toBeLessThanOrEqual(3)
    expect(persisted).not.toHaveProperty('runGrades')
    expect(persisted.grade).toEqual(summary.grade)
  })
})
