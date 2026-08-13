import { describe, it, expect } from 'vitest'
import { buildSlotSummary, buildPrepFitLine } from '../prep-fit-line'
import type { SlotAssignment, RosterConstrainedMaxBid } from '@/lib/draft/roster-solver'

// --- helpers ----------------------------------------------------------------

function makeAssignment(slotType: SlotAssignment['slotType']): SlotAssignment {
  return { slotType, player: null, assignedCost: 1 }
}

function makeResult(overrides: Partial<RosterConstrainedMaxBid>): RosterConstrainedMaxBid {
  return {
    maxBid: 50,
    feasible: true,
    completionCost: 150,
    explanation: 'Need QB (~$1) -> max $50',
    bestRestOfRoster: [],
    ...overrides,
  }
}

// --- buildSlotSummary -------------------------------------------------------

describe('buildSlotSummary', () => {
  it('returns empty string when assignments is empty', () => {
    expect(buildSlotSummary([])).toBe('')
  })

  it('returns empty string when only BENCH slots remain', () => {
    expect(buildSlotSummary([
      makeAssignment('BENCH'),
      makeAssignment('BENCH'),
    ])).toBe('')
  })

  it('returns a single slot name', () => {
    expect(buildSlotSummary([makeAssignment('QB')])).toBe('QB')
  })

  it('joins two slots with "and"', () => {
    expect(buildSlotSummary([makeAssignment('QB'), makeAssignment('TE')])).toBe('QB and TE')
  })

  it('uses Oxford-style join for three+ slots', () => {
    expect(buildSlotSummary([
      makeAssignment('QB'),
      makeAssignment('RB'),
      makeAssignment('TE'),
    ])).toBe('QB, RB and TE')
  })

  it('counts multiple FLEX correctly', () => {
    expect(buildSlotSummary([
      makeAssignment('FLEX'),
      makeAssignment('FLEX'),
      makeAssignment('FLEX'),
    ])).toBe('3 FLEX')
  })

  it('ignores BENCH in summary', () => {
    expect(buildSlotSummary([
      makeAssignment('QB'),
      makeAssignment('BENCH'),
      makeAssignment('BENCH'),
    ])).toBe('QB')
  })

  it('orders starters before FLEX', () => {
    expect(buildSlotSummary([
      makeAssignment('FLEX'),
      makeAssignment('QB'),
    ])).toBe('QB and FLEX')
  })
})

// --- buildPrepFitLine -------------------------------------------------------

describe('buildPrepFitLine', () => {
  it('returns infeasible/no-slot message when feasible=false and no rest-of-roster', () => {
    const result = makeResult({ feasible: false, bestRestOfRoster: [] })
    expect(buildPrepFitLine('RB', result, false, false)).toBe(
      'No open slot for RB on a full roster'
    )
  })

  it('returns target line with max bid for a tagged target', () => {
    const result = makeResult({
      maxBid: 67,
      bestRestOfRoster: [makeAssignment('QB'), makeAssignment('FLEX'), makeAssignment('FLEX')],
    })
    const line = buildPrepFitLine('WR', result, true, false)
    expect(line).toContain('Your target')
    expect(line).toContain('$67')
    expect(line).toContain('QB')
    expect(line).toContain('2 FLEX')
  })

  it('target line includes " -- " separator', () => {
    const result = makeResult({ maxBid: 67, bestRestOfRoster: [] })
    const line = buildPrepFitLine('WR', result, true, false)
    expect(line).toContain(' -- ')
  })

  it('returns avoid line for a tagged avoid', () => {
    const result = makeResult({ maxBid: 42 })
    const line = buildPrepFitLine('RB', result, false, true)
    expect(line).toContain('Flagged to avoid')
    expect(line).toContain('$42')
  })

  it('avoid line does NOT contain slot summary (not relevant for avoid context)', () => {
    const result = makeResult({
      maxBid: 42,
      bestRestOfRoster: [makeAssignment('QB'), makeAssignment('FLEX')],
    })
    const line = buildPrepFitLine('RB', result, false, true)
    // Avoid line is a fixed phrase; slot note not included for avoids
    expect(line).toBe('Flagged to avoid -- can afford at $42 on a full board if reconsidering')
  })

  it('returns generic bid line for untagged player', () => {
    const result = makeResult({
      maxBid: 55,
      bestRestOfRoster: [makeAssignment('QB')],
    })
    const line = buildPrepFitLine('TE', result, false, false)
    expect(line).toContain('Can bid up to')
    expect(line).toContain('$55')
    expect(line).toContain('full $200 board')
    expect(line).toContain('QB')
  })

  it('omits slot note when rest-of-roster is empty (last slot)', () => {
    const result = makeResult({ maxBid: 192, bestRestOfRoster: [] })
    const line = buildPrepFitLine('QB', result, false, false)
    expect(line).toBe('Can bid up to $192 on a full $200 board')
  })

  it('target takes priority over avoid if both somehow true', () => {
    const result = makeResult({ maxBid: 30 })
    const line = buildPrepFitLine('RB', result, true, true)
    expect(line).toContain('Your target')
  })

  it('does not contain em-dashes or en-dashes', () => {
    const result = makeResult({ maxBid: 50, bestRestOfRoster: [makeAssignment('QB')] })
    const lines = [
      buildPrepFitLine('RB', result, false, false),
      buildPrepFitLine('WR', result, true, false),
      buildPrepFitLine('TE', result, false, true),
    ]
    for (const line of lines) {
      // per Joe's copy rule: no unicode dashes (– = en, — = em)
      expect(line).not.toMatch(/[–—]/)
    }
  })
})
