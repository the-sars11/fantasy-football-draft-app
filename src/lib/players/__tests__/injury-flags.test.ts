import { describe, it, expect } from 'vitest'
import { classifyInjury, FRAGILE_FACTOR_THRESHOLD } from '../injury-flags'
import type { RiskModel } from '@/lib/draft/sim-grade'

/**
 * Minimal injectable durability model. RB baseline 1.0 so a player's gpRate IS his
 * factor (before the 0.75 floor), making the FRAGILE boundary easy to pin.
 */
function model(byPlayer: Record<string, { gpRate: number }>): RiskModel {
  return {
    durability: { baseline: { RB: 1, WR: 1, TE: 1, QB: 1 }, byPlayer },
    outcome: {},
  }
}

describe('classifyInjury - FRAGILE (chronic durability, injury RISK)', () => {
  it('fires when the durability factor is at/below the threshold', () => {
    const m = model({ frag: { gpRate: 0.7 } }) // 0.7 -> floored 0.75 <= 0.9
    const f = classifyInjury('frag', 'RB', 'Healthy', m)
    expect(f.fragile).toBe(true)
    expect(f.fragileFactor).toBeCloseTo(0.75, 5) // DURABILITY_PRICE_FLOOR
  })

  it('fires exactly at the 0.90 boundary (inclusive)', () => {
    const m = model({ edge: { gpRate: FRAGILE_FACTOR_THRESHOLD } }) // 0.90
    expect(classifyInjury('edge', 'RB', 'Healthy', m).fragile).toBe(true)
  })

  it('does NOT fire just above the boundary', () => {
    const m = model({ ok: { gpRate: 0.91 } })
    expect(classifyInjury('ok', 'RB', 'Healthy', m).fragile).toBe(false)
  })

  it('does not fire for a position-durable player (factor 1.0)', () => {
    const m = model({ iron: { gpRate: 1.0 } })
    const f = classifyInjury('iron', 'RB', 'Healthy', m)
    expect(f.fragile).toBe(false)
    expect(f.fragileFactor).toBe(1)
  })

  it('does not fire for a player the model cannot measure (no data -> 1.0)', () => {
    const m = model({})
    expect(classifyInjury('unknown', 'RB', 'Healthy', m).fragile).toBe(false)
  })

  it('does not fire for DEF (durability factor forced to 1.0)', () => {
    const m = model({ dst: { gpRate: 0.5 } })
    expect(classifyInjury('dst', 'DEF', 'Healthy', m).fragile).toBe(false)
  })
})

describe('classifyInjury - OUT (acute absence, injured NOW)', () => {
  const m = model({})
  it('fires on a real current absence designation (case-insensitive)', () => {
    for (const s of ['Out', 'doubtful', 'IR', 'pup', 'Suspended']) {
      const f = classifyInjury('x', 'RB', s, m)
      expect(f.out, s).toBe(true)
      expect(f.outStatus, s).toBe(s)
    }
  })

  it('does NOT fire on Questionable (camp catch-all)', () => {
    expect(classifyInjury('x', 'RB', 'Questionable', m).out).toBe(false)
  })

  it('does not fire on healthy / probable / empty / undefined', () => {
    for (const s of ['Healthy', 'Probable', 'active', '', undefined]) {
      expect(classifyInjury('x', 'RB', s, m).out).toBe(false)
    }
  })

  it('leaves outStatus empty when not out', () => {
    expect(classifyInjury('x', 'RB', 'Questionable', m).outStatus).toBe('')
  })
})

describe('classifyInjury - the two signals are independent', () => {
  it('a fragile vet who is also out now flags BOTH', () => {
    const m = model({ mac: { gpRate: 0.7 } })
    const f = classifyInjury('mac', 'RB', 'Out', m)
    expect(f.fragile).toBe(true)
    expect(f.out).toBe(true)
  })

  it('a fragile vet who is healthy now flags fragile only', () => {
    const m = model({ mac: { gpRate: 0.7 } })
    const f = classifyInjury('mac', 'RB', 'Healthy', m)
    expect(f.fragile).toBe(true)
    expect(f.out).toBe(false)
  })
})
