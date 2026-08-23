import { describe, it, expect } from 'vitest'
import type { RiskModel } from '@/lib/draft/sim-grade'
import {
  injuryStatusFactor,
  riskAdjustedCeiling,
  INJURY_STATUS_FACTOR,
  DEFAULT_ACUTE_FACTOR,
  RISK_WORTH_FLOOR,
} from '../injury-risk'

// Injectable stand-in for the real 15-season durability model so the CHRONIC
// layer is deterministic here. Baselines are the "market already assumes this
// much durability for the position" anchors; only the shortfall below baseline
// is charged (see durabilityPriceFactor).
const MODEL: RiskModel = {
  durability: {
    baseline: { RB: 0.95, WR: 0.97 },
    byPlayer: {
      iron1: { gpRate: 0.99 }, // 0.99/0.95 = 1.04 -> capped at 1.0 (no discount)
      frag1: { gpRate: 0.76 }, // 0.76/0.95 = 0.80 -> 0.80x chronic haircut
      fragFloor: { gpRate: 0.5 }, // 0.50/0.95 = 0.53 -> floored to 0.75 chronic
    },
  },
  outcome: {},
}

describe('injuryStatusFactor - acute designation ladder', () => {
  it('returns 1 (no haircut) for healthy / empty / probable-class labels', () => {
    expect(injuryStatusFactor(null)).toBe(1)
    expect(injuryStatusFactor(undefined)).toBe(1)
    expect(injuryStatusFactor('')).toBe(1)
    expect(injuryStatusFactor('Healthy')).toBe(1)
    expect(injuryStatusFactor('active')).toBe(1)
    expect(injuryStatusFactor('Probable')).toBe(1)
  })

  it('maps each graded status to its severity factor (case-insensitive)', () => {
    expect(injuryStatusFactor('Questionable')).toBe(INJURY_STATUS_FACTOR.questionable)
    expect(injuryStatusFactor('DOUBTFUL')).toBe(INJURY_STATUS_FACTOR.doubtful)
    expect(injuryStatusFactor('out')).toBe(INJURY_STATUS_FACTOR.out)
    expect(injuryStatusFactor('PUP')).toBe(INJURY_STATUS_FACTOR.pup)
    expect(injuryStatusFactor('IR')).toBe(INJURY_STATUS_FACTOR.ir)
  })

  it('orders severity correctly: Questionable barely fades, IR fades hardest', () => {
    expect(injuryStatusFactor('Questionable')).toBeGreaterThan(injuryStatusFactor('Doubtful'))
    expect(injuryStatusFactor('Doubtful')).toBeGreaterThan(injuryStatusFactor('Out'))
    expect(injuryStatusFactor('Out')).toBeGreaterThan(injuryStatusFactor('IR'))
    expect(injuryStatusFactor('PUP')).toBeGreaterThan(injuryStatusFactor('IR'))
  })

  it('falls to the default mild factor for an unknown non-healthy label', () => {
    expect(injuryStatusFactor('Suspended')).toBe(DEFAULT_ACUTE_FACTOR)
    expect(injuryStatusFactor('gronk-body')).toBe(DEFAULT_ACUTE_FACTOR)
  })
})

describe('riskAdjustedCeiling - chronic x acute worth haircut', () => {
  it('does not haircut a durable, healthy player (factor 1.0)', () => {
    expect(riskAdjustedCeiling(100, 'iron1', 'RB', null, MODEL)).toBe(100)
  })

  it('applies the CHRONIC durability haircut alone (fragile vet, no designation)', () => {
    // 100 * 0.80 = 80. This is the McCaffrey case: fragile even when "healthy".
    expect(riskAdjustedCeiling(100, 'frag1', 'RB', null, MODEL)).toBe(80)
  })

  it('applies the ACUTE designation haircut alone (durable player, current injury)', () => {
    // Unknown-to-model player -> chronic 1.0; PUP acute 0.60 -> 100 * 0.60 = 60.
    expect(riskAdjustedCeiling(100, 'unknown', 'RB', 'PUP', MODEL)).toBe(60)
  })

  it('MULTIPLIES the two layers (fragile vet who is ALSO hurt)', () => {
    // 100 * 0.80 (chronic) * 0.60 (PUP) = 48.
    expect(riskAdjustedCeiling(100, 'frag1', 'RB', 'PUP', MODEL)).toBe(48)
  })

  it('never haircuts below RISK_WORTH_FLOOR of the ceiling', () => {
    // Worst realistic case: chronic floored at 0.75 * IR 0.40 = 0.30 = the floor.
    // So an IR stud keeps 30% of his worth, not $0.
    const worst = riskAdjustedCeiling(100, 'fragFloor', 'RB', 'IR', MODEL)
    expect(worst).toBe(Math.round(100 * RISK_WORTH_FLOOR))
    expect(worst).toBe(30)
  })

  it('passes a zero / non-positive ceiling straight through (nothing to adjust)', () => {
    expect(riskAdjustedCeiling(0, 'frag1', 'RB', 'PUP', MODEL)).toBe(0)
    expect(riskAdjustedCeiling(-5, 'frag1', 'RB', 'PUP', MODEL)).toBe(-5)
  })

  it('floors a haircut priced player at $1, never rounding to $0', () => {
    // 2 * 0.40 (IR) = 0.8 -> rounds to 1, and the Math.max(1, ...) guard holds.
    expect(riskAdjustedCeiling(2, 'unknown', 'RB', 'IR', MODEL)).toBe(1)
  })

  it('returns 1 (no chronic haircut) for a model-absent player, acute still applies', () => {
    // No byPlayer entry -> chronic 1.0; Questionable 0.95 -> 100 * 0.95 = 95.
    expect(riskAdjustedCeiling(100, 'nobody', 'WR', 'Questionable', MODEL)).toBe(95)
  })
})
