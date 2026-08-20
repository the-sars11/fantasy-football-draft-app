/**
 * league-calibration.test.ts — VAL-1.1 / VAL-2 typed accessors over the committed
 * `league-calibration.json` Nasties ledger artifact.
 *
 * These accessors are load-bearing for the whole research dataset: they power
 * REALITY (expectedRoomPrice), EXPLOIT (positionalInflation) and READ-THE-TABLE
 * (ownerLean). This locks their contract so a bad re-derive or refactor fails loud.
 *
 * Assertions are against the REAL committed artifact (4 drafts, 2022-2025), not a
 * fixture — so they double as a sanity check on the calibration data itself.
 */

import { describe, it, expect } from 'vitest'
import {
  expectedRoomPrice,
  positionalInflation,
  allPositionalInflation,
  ownerLean,
  allOwnerLeans,
  positionCurve,
  toCalibratedPositionSafe,
  CALIBRATION_ERA,
  CALIBRATION_DRAFTS_USED,
} from '../league-calibration'

// ─── Source transparency ─────────────────────────────────────────────────────

describe('calibration provenance', () => {
  it('reports the real era it was derived from (2022-2025, 4 drafts)', () => {
    expect(CALIBRATION_ERA).toEqual([2022, 2023, 2024, 2025])
    expect(CALIBRATION_DRAFTS_USED).toBe(4)
  })
})

// ─── toCalibratedPositionSafe ────────────────────────────────────────────────

describe('toCalibratedPositionSafe', () => {
  it('maps the app DST alias onto the calibrated DEF key', () => {
    expect(toCalibratedPositionSafe('DST')).toBe('DEF')
    expect(toCalibratedPositionSafe('DEF')).toBe('DEF')
  })

  it('lowercases are normalised, K and junk return null (uncalibrated)', () => {
    expect(toCalibratedPositionSafe('rb')).toBe('RB')
    expect(toCalibratedPositionSafe('K')).toBeNull()
    expect(toCalibratedPositionSafe('')).toBeNull()
    expect(toCalibratedPositionSafe('PUNTER')).toBeNull()
  })
})

// ─── REALITY: expectedRoomPrice ──────────────────────────────────────────────

describe('expectedRoomPrice', () => {
  it('returns the exact curve price for an in-range rank (RB1 = $76)', () => {
    // curves.RB[0] === 76 in the committed artifact.
    expect(expectedRoomPrice('RB', 1)).toBe(76)
    expect(expectedRoomPrice('WR', 1)).toBe(79)
    expect(expectedRoomPrice('QB', 1)).toBe(36)
  })

  it('is monotonically non-increasing down each position curve', () => {
    for (const pos of ['QB', 'RB', 'WR', 'TE', 'DEF'] as const) {
      const curve = positionCurve(pos)!
      for (let rank = 2; rank <= curve.length; rank++) {
        const prev = expectedRoomPrice(pos, rank - 1)!
        const cur = expectedRoomPrice(pos, rank)!
        expect(cur).toBeLessThanOrEqual(prev)
      }
    }
  })

  it('normalises DST to the DEF curve (same price)', () => {
    expect(expectedRoomPrice('DST', 1)).toBe(expectedRoomPrice('DEF', 1))
  })

  it('tapers past the curve toward a $1 floor, never below $1 or free', () => {
    const rbCurve = positionCurve('RB')!
    const deepRank = rbCurve.length + 100 // well past the taper span
    const deep = expectedRoomPrice('RB', deepRank)!
    expect(deep).toBe(1) // held at the floor, not $0 / free
    // A rank just past the curve is below the last known price but still >= $1.
    const justPast = expectedRoomPrice('RB', rbCurve.length + 1)!
    expect(justPast).toBeLessThanOrEqual(rbCurve[rbCurve.length - 1])
    expect(justPast).toBeGreaterThanOrEqual(1)
  })

  it('returns undefined for uncalibrated position (K) and bad ranks', () => {
    expect(expectedRoomPrice('K', 1)).toBeUndefined()
    expect(expectedRoomPrice('RB', 0)).toBeUndefined()
    expect(expectedRoomPrice('RB', -3)).toBeUndefined()
    expect(expectedRoomPrice('RB', NaN)).toBeUndefined()
  })
})

// ─── EXPLOIT: positionalInflation ────────────────────────────────────────────

describe('positionalInflation', () => {
  it('tags WR and TE HOT, RB COOL: the room-wide exploit map', () => {
    expect(positionalInflation('WR')!.tag).toBe('HOT')
    expect(positionalInflation('TE')!.tag).toBe('HOT')
    expect(positionalInflation('RB')!.tag).toBe('COOL')
  })

  it('a HOT multiplier is >1 and a COOL multiplier is <1', () => {
    expect(positionalInflation('WR')!.multiplier).toBeGreaterThan(1)
    expect(positionalInflation('RB')!.multiplier).toBeLessThan(1)
  })

  it('allPositionalInflation covers every calibrated position', () => {
    const all = allPositionalInflation()
    expect(Object.keys(all).sort()).toEqual(['DEF', 'QB', 'RB', 'TE', 'WR'])
  })

  it('returns undefined for the uncalibrated K position', () => {
    expect(positionalInflation('K')).toBeUndefined()
  })
})

// ─── READ THE TABLE: ownerLean ───────────────────────────────────────────────

describe('ownerLean', () => {
  it('surfaces a real owner top lean (Reggie leans RB HEAVY)', () => {
    const reggie = ownerLean('Reggie')!
    expect(reggie).not.toBeNull()
    expect(reggie.byPos.RB.lean).toBe('HEAVY')
    expect(reggie.topLean?.position).toBe('TE') // his single strongest vsRoom
  })

  it('vsRoom is centred on 1.0: HEAVY reads >1, LIGHT reads <1', () => {
    for (const lean of Object.values(allOwnerLeans())) {
      for (const pos of ['QB', 'RB', 'WR', 'TE', 'DEF'] as const) {
        const row = lean.byPos[pos]
        if (row.lean === 'HEAVY') expect(row.vsRoom).toBeGreaterThan(1)
        if (row.lean === 'LIGHT') expect(row.vsRoom).toBeLessThan(1)
      }
    }
  })

  it('trims whitespace and returns null for an unknown owner', () => {
    expect(ownerLean('  Reggie  ')).not.toBeNull()
    expect(ownerLean('Nobody')).toBeNull()
    expect(ownerLean('')).toBeNull()
  })

  it('includes Rasar (the me-seat) among the ledger owners', () => {
    expect(ownerLean('Rasar')).not.toBeNull()
    expect(Object.keys(allOwnerLeans())).toContain('Rasar')
  })
})
