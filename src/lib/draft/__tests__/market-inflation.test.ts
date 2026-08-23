import { describe, it, expect } from 'vitest'
import { computeMarketInflation, DEFAULT_PRIOR_STRENGTH, type SoldPlayer } from '../market-inflation'

const sold = (position: SoldPlayer['position'], actualPrice: number, baselineRoom: number): SoldPlayer => ({
  position,
  actualPrice,
  baselineRoom,
})

describe('computeMarketInflation - empty / neutral', () => {
  it('returns a neutral 1.0 multiplier for every position when nothing has sold', () => {
    const inf = computeMarketInflation([])
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const) {
      expect(inf[pos].multiplier).toBe(1)
      expect(inf[pos].rawMultiplier).toBe(1)
      expect(inf[pos].soldCount).toBe(0)
    }
  })

  it('leaves positions with no sales neutral even when others have sold', () => {
    const inf = computeMarketInflation([sold('RB', 72, 60)])
    expect(inf.RB.soldCount).toBe(1)
    expect(inf.WR.multiplier).toBe(1)
    expect(inf.WR.soldCount).toBe(0)
  })
})

describe('computeMarketInflation - raw ratio is dollar-weighted', () => {
  it('rawMultiplier = sum(actual) / sum(baseline)', () => {
    const inf = computeMarketInflation([sold('RB', 72, 60), sold('RB', 33, 30)])
    // 105 / 90 = 1.1667
    expect(inf.RB.rawMultiplier).toBeCloseTo(105 / 90, 6)
    expect(inf.RB.actualSpent).toBe(105)
    expect(inf.RB.baselineSpent).toBe(90)
    expect(inf.RB.soldCount).toBe(2)
  })

  it('a big-dollar overpay moves the ratio more than a small-dollar one', () => {
    const bigOverpay = computeMarketInflation([sold('RB', 80, 60), sold('RB', 3, 3)])
    const smallOverpay = computeMarketInflation([sold('RB', 60, 60), sold('RB', 6, 3)])
    expect(bigOverpay.RB.rawMultiplier).toBeGreaterThan(smallOverpay.RB.rawMultiplier)
  })
})

describe('computeMarketInflation - shrink toward 1.0 by sample size', () => {
  it('shrinks a single sale hard toward neutral', () => {
    // raw = 90/60 = 1.5; n=1 -> 1 + 0.5 * 1/(1+4) = 1.10
    const inf = computeMarketInflation([sold('RB', 90, 60)])
    expect(inf.RB.rawMultiplier).toBeCloseTo(1.5, 6)
    expect(inf.RB.multiplier).toBeCloseTo(1.1, 6)
  })

  it('approaches the raw ratio as sales pile up (same ratio, more samples)', () => {
    const one = computeMarketInflation([sold('RB', 90, 60)])
    const many = computeMarketInflation(Array.from({ length: 12 }, () => sold('RB', 90, 60)))
    expect(many.RB.rawMultiplier).toBeCloseTo(one.RB.rawMultiplier, 6)
    // both above neutral, but the 12-sale read sits closer to the raw 1.5
    expect(many.RB.multiplier).toBeGreaterThan(one.RB.multiplier)
    expect(many.RB.multiplier).toBeLessThan(one.RB.rawMultiplier)
    expect(1.5 - many.RB.multiplier).toBeLessThan(1.5 - one.RB.multiplier)
  })

  it('a soft position shrinks a below-1 ratio toward 1 from below', () => {
    // raw = 45/60 = 0.75; n=1 -> 1 + (-0.25)*0.2 = 0.95
    const inf = computeMarketInflation([sold('WR', 45, 60)])
    expect(inf.WR.rawMultiplier).toBeCloseTo(0.75, 6)
    expect(inf.WR.multiplier).toBeCloseTo(0.95, 6)
    expect(inf.WR.multiplier).toBeLessThan(1)
  })

  it('honors a custom priorStrength (weaker prior -> trusts the ratio faster)', () => {
    const weak = computeMarketInflation([sold('RB', 90, 60)], { priorStrength: 1 })
    // n=1, K=1 -> 1 + 0.5*0.5 = 1.25
    expect(weak.RB.multiplier).toBeCloseTo(1.25, 6)
    const strong = computeMarketInflation([sold('RB', 90, 60)], { priorStrength: DEFAULT_PRIOR_STRENGTH })
    expect(weak.RB.multiplier).toBeGreaterThan(strong.RB.multiplier)
  })
})

describe('computeMarketInflation - guards', () => {
  it('skips zero/negative baseline sales (no divide-by-zero, no signal)', () => {
    const inf = computeMarketInflation([sold('RB', 5, 0), sold('RB', 72, 60)])
    expect(inf.RB.soldCount).toBe(1) // only the real-baseline sale counted
    expect(inf.RB.baselineSpent).toBe(60)
  })

  it('a $1 win of a $0-baseline scrub does not swing the position', () => {
    const inf = computeMarketInflation([sold('WR', 1, 0)])
    expect(inf.WR.multiplier).toBe(1)
    expect(inf.WR.soldCount).toBe(0)
  })
})
