import { describe, it, expect } from 'vitest'
import { computePlayerTags } from '../tags'
import type { Player } from '../types'

function player(overrides: Partial<Player>): Player {
  return {
    id: 'x',
    name: 'Test Player',
    team: 'TST',
    position: 'RB',
    byeWeek: 0,
    consensusRank: 50,
    consensusAuctionValue: 10,
    consensusTier: 5,
    adp: 50,
    sourceData: [],
    projections: { points: 0 },
    ...overrides,
  }
}

const ids = (p: Player) => computePlayerTags(p).map((t) => t.id)

describe('computePlayerTags — ELITE', () => {
  it('fires on real FantasyPros tier 1', () => {
    expect(ids(player({ expertTier: 1 }))).toContain('elite')
  })
  it('does not fire on tier 2', () => {
    expect(ids(player({ expertTier: 2 }))).not.toContain('elite')
  })
})

describe('computePlayerTags — POCKET / TAX (league dollar gap)', () => {
  it('POCKET at the +$4 threshold', () => {
    expect(ids(player({ valueGap: 4, ceilingValue: 30, expectedRoomPrice: 26 }))).toContain('pocket')
  })
  it('no POCKET at +$3 (below threshold)', () => {
    expect(ids(player({ valueGap: 3 }))).not.toContain('pocket')
  })
  it('TAX at the -$4 threshold', () => {
    expect(ids(player({ valueGap: -4, ceilingValue: 20, expectedRoomPrice: 24 }))).toContain('tax')
  })
  it('no TAX at -$3', () => {
    expect(ids(player({ valueGap: -3 }))).not.toContain('tax')
  })
  it('never both pocket and tax', () => {
    const t = ids(player({ valueGap: 10 }))
    expect(t.includes('pocket') && t.includes('tax')).toBe(false)
  })
})

describe('computePlayerTags — VOLATILE', () => {
  it('fires when std >= 20 and in the pool', () => {
    expect(ids(player({ rankSpread: { min: 10, max: 90, std: 24 }, consensusRank: 40 }))).toContain('volatile')
  })
  it('does not fire outside the bidding pool (rank > 120)', () => {
    expect(ids(player({ rankSpread: { min: 10, max: 90, std: 24 }, consensusRank: 121 }))).not.toContain('volatile')
  })
})

describe('computePlayerTags — INJURY', () => {
  it('fires on a real non-healthy designation', () => {
    expect(ids(player({ injuryStatus: 'Questionable' }))).toContain('injury')
    expect(ids(player({ injuryStatus: 'Out' }))).toContain('injury')
  })
  it('does not fire on healthy/active/empty', () => {
    expect(ids(player({ injuryStatus: 'Healthy' }))).not.toContain('injury')
    expect(ids(player({ injuryStatus: '' }))).not.toContain('injury')
    expect(ids(player({ injuryStatus: undefined }))).not.toContain('injury')
    expect(ids(player({ injuryStatus: 'Probable' }))).not.toContain('injury')
  })
})

describe('computePlayerTags — SLEEPER', () => {
  it('fires for a late skill player clearing replacement', () => {
    expect(ids(player({ position: 'WR', consensusRank: 100, vorp: 5 }))).toContain('sleeper')
  })
  it('does not fire for a QB (non-skill) or below replacement', () => {
    expect(ids(player({ position: 'QB', consensusRank: 100, vorp: 5 }))).not.toContain('sleeper')
    expect(ids(player({ position: 'WR', consensusRank: 100, vorp: -2 }))).not.toContain('sleeper')
  })
})

describe('computePlayerTags — provenance', () => {
  it('every emitted tag carries a real-data source string (FB-9)', () => {
    const p = player({
      expertTier: 1,
      valueGap: 8,
      ceilingValue: 40,
      expectedRoomPrice: 32,
      rankSpread: { min: 5, max: 80, std: 25 },
      consensusRank: 30,
      injuryStatus: 'Questionable',
    })
    const tags = computePlayerTags(p)
    expect(tags.length).toBeGreaterThan(0)
    for (const t of tags) {
      expect(typeof t.source).toBe('string')
      expect(t.source.length).toBeGreaterThan(0)
    }
  })
})

describe('computePlayerTags - VOLATILE boundaries', () => {
  it('fires at exactly rank 120 (the pool boundary is inclusive)', () => {
    expect(ids(player({ rankSpread: { min: 10, max: 90, std: 20 }, consensusRank: 120 }))).toContain('volatile')
  })

  it('does not fire at rank 121 (just outside the pool)', () => {
    expect(ids(player({ rankSpread: { min: 10, max: 90, std: 20 }, consensusRank: 121 }))).not.toContain('volatile')
  })

  it('does not fire at std exactly 19 (below the threshold)', () => {
    expect(ids(player({ rankSpread: { min: 10, max: 90, std: 19 }, consensusRank: 40 }))).not.toContain('volatile')
  })
})

describe('computePlayerTags - SLEEPER boundaries', () => {
  it('does not fire when vorp is exactly 0 (must be > 0)', () => {
    expect(ids(player({ position: 'WR', consensusRank: 100, vorp: 0 }))).not.toContain('sleeper')
  })

  it('does not fire at consensusRank exactly 84 (must be > 84)', () => {
    expect(ids(player({ position: 'RB', consensusRank: 84, vorp: 5 }))).not.toContain('sleeper')
  })

  it('fires at consensusRank 85 with positive vorp', () => {
    expect(ids(player({ position: 'TE', consensusRank: 85, vorp: 1 }))).toContain('sleeper')
  })
})

describe('computePlayerTags - multiple tags on one player', () => {
  it('emits ELITE + POCKET together when both signals present', () => {
    const t = ids(player({ expertTier: 1, valueGap: 8, ceilingValue: 50, expectedRoomPrice: 42 }))
    expect(t).toContain('elite')
    expect(t).toContain('pocket')
  })

  it('emits INJURY + SLEEPER together for a late hurt skill player', () => {
    const t = ids(player({ position: 'WR', consensusRank: 100, vorp: 3, injuryStatus: 'Questionable' }))
    expect(t).toContain('sleeper')
    expect(t).toContain('injury')
  })

  it('emits no tags for a plain average player with no signals', () => {
    const t = ids(player({ expertTier: 2, valueGap: 1, consensusRank: 40 }))
    expect(t).toHaveLength(0)
  })
})
