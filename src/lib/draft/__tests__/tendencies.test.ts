import { describe, it, expect } from 'vitest'
import {
  positionExploit,
  ownerExploit,
  detectPositionRun,
  runExploit,
  buildExploitSignals,
} from '@/lib/draft/tendencies'
import type { DraftPick } from '@/lib/draft/state'

// --- Fixtures -------------------------------------------------------------

function pick(position: string, n: number, manager = 'Rasar'): DraftPick {
  return { pick_number: n, player_name: `P${n}`, position, manager, price: 5 }
}

/** Build a pick list ending in a given tail of positions (oldest → newest). */
function board(tail: string[]): DraftPick[] {
  return tail.map((pos, i) => pick(pos, i + 1))
}

// --- 1. Position inflation → exploit -------------------------------------

describe('positionExploit', () => {
  it('flags RB as a value pocket (room runs COOL on RB)', () => {
    const sig = positionExploit('RB')
    expect(sig).not.toBeNull()
    expect(sig!.tone).toBe('advantage')
    expect(sig!.position).toBe('RB')
    expect(sig!.headline).toMatch(/value pocket/i)
  })

  it('flags WR as hot / caution (room overpays on WR)', () => {
    const sig = positionExploit('WR')
    expect(sig!.tone).toBe('caution')
    expect(sig!.position).toBe('WR')
    expect(sig!.headline).toMatch(/hot/i)
  })

  it('normalises DST → DEF', () => {
    const sig = positionExploit('DST')
    expect(sig).not.toBeNull()
    expect(sig!.position).toBe('DEF')
  })

  it('returns null for uncalibrated positions (K)', () => {
    expect(positionExploit('K')).toBeNull()
  })

  it('weights a hot/cool position louder than a neutral one', () => {
    const wr = positionExploit('WR')! // HOT
    const qb = positionExploit('QB')! // NEUTRAL
    expect(wr.weight).toBeGreaterThan(qb.weight)
  })
})

// --- 2. Owner leans → exploit --------------------------------------------

describe('ownerExploit', () => {
  it('surfaces a known heavy owner lean (Shultz → TE)', () => {
    const sig = ownerExploit('Shultz')
    expect(sig).not.toBeNull()
    expect(sig!.position).toBe('TE')
    expect(sig!.kind).toBe('owner')
    expect(sig!.detail).toMatch(/TE/)
  })

  it('surfaces Leems → DEF', () => {
    expect(ownerExploit('Leems')!.position).toBe('DEF')
  })

  it('returns null for a balanced owner with no strong lean', () => {
    // 'Rasar' is balanced (topLean === null) in the calibrated ledger.
    expect(ownerExploit('Rasar')).toBeNull()
  })

  it('returns null for an unknown owner', () => {
    expect(ownerExploit('Nobody')).toBeNull()
  })
})

// --- 3. Live nomination-run detection ------------------------------------

describe('detectPositionRun', () => {
  it('fires when 3+ of the last 8 picks are the position', () => {
    const run = detectPositionRun(board(['QB', 'RB', 'WR', 'WR', 'RB', 'WR', 'TE', 'DEF']), 'WR')
    expect(run!.count).toBe(3)
    expect(run!.isRun).toBe(true)
  })

  it('does NOT fire on a single isolated pick', () => {
    const run = detectPositionRun(board(['QB', 'RB', 'WR', 'TE', 'DEF', 'RB', 'QB', 'TE']), 'WR')
    expect(run!.count).toBe(1)
    expect(run!.isRun).toBe(false)
  })

  it('fires on a majority of a short early board', () => {
    const run = detectPositionRun(board(['RB', 'RB']), 'RB')
    expect(run!.window).toBe(2)
    expect(run!.isRun).toBe(true)
  })

  it('handles an empty board without firing', () => {
    const run = detectPositionRun([], 'RB')
    expect(run!.window).toBe(0)
    expect(run!.isRun).toBe(false)
  })

  it('only considers the lookback window, not the whole history', () => {
    // Three WRs, but all older than the last 8 picks → no run.
    const picks = board(['WR', 'WR', 'WR', 'QB', 'RB', 'TE', 'DEF', 'QB', 'RB', 'TE', 'DEF'])
    const run = detectPositionRun(picks, 'WR')
    expect(run!.count).toBe(0)
    expect(run!.isRun).toBe(false)
  })

  it('returns null for uncalibrated positions', () => {
    expect(detectPositionRun(board(['K', 'K', 'K']), 'K')).toBeNull()
  })
})

describe('runExploit', () => {
  it('produces a caution signal only when a run is live', () => {
    expect(runExploit(board(['WR', 'WR', 'WR']), 'WR')!.kind).toBe('run')
    expect(runExploit(board(['QB', 'RB', 'TE']), 'WR')).toBeNull()
  })
})

// --- Aggregate ------------------------------------------------------------

describe('buildExploitSignals', () => {
  it('folds position + run + owner layers and ranks by weight', () => {
    const signals = buildExploitSignals({
      position: 'WR',
      owner: 'Cross', // WR-heavy owner
      recentPicks: board(['WR', 'WR', 'WR', 'QB']),
    })
    // WR position (hot) + live WR run + Cross owner lean = 3 signals.
    expect(signals.length).toBe(3)
    // Sorted descending by weight.
    for (let i = 1; i < signals.length; i++) {
      expect(signals[i - 1].weight).toBeGreaterThanOrEqual(signals[i].weight)
    }
  })

  it('drops neutral position noise when an actionable signal exists', () => {
    // QB is neutral; Danny is QB-heavy (actionable owner signal).
    const signals = buildExploitSignals({ position: 'QB', owner: 'Danny' })
    expect(signals.every((s) => s.tone !== 'neutral')).toBe(true)
    expect(signals.some((s) => s.kind === 'owner')).toBe(true)
  })

  it('keeps a lone neutral signal when nothing stronger is present', () => {
    const signals = buildExploitSignals({ position: 'QB' })
    expect(signals.length).toBe(1)
    expect(signals[0].tone).toBe('neutral')
  })

  it('returns an empty list when there is nothing to say', () => {
    expect(buildExploitSignals({})).toEqual([])
  })
})
