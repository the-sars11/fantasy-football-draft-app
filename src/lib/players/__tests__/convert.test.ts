import { describe, it, expect } from 'vitest'
import { cacheToPlayer } from '../convert'
import type { CachedPlayer } from '@/lib/research/cache'

function cachedPlayer(overrides: Partial<CachedPlayer> = {}): CachedPlayer {
  return {
    id: 'p1',
    external_id: null,
    name: 'Test Player',
    team: 'TEST',
    position: 'RB',
    bye_week: 7,
    adp: { sleeper: 24 },
    auction_values: {},
    projections: {},
    injury_status: null,
    source_data: {},
    last_updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('cacheToPlayer - field truth (RV-7 regression)', () => {
  it('maps external_id to sleeperId (risk-model join key)', () => {
    // external_id is the Sleeper id for Sleeper-backed players; the risk model
    // is keyed by it. `id` is a Supabase UUID that never joins. Regression for
    // the McCaffrey durability blind-spot bug.
    const p = cacheToPlayer(cachedPlayer({ id: 'uuid-abc', external_id: '4034' }))
    expect(p.sleeperId).toBe('4034')
    expect(p.id).toBe('uuid-abc')
  })

  it('leaves sleeperId undefined when external_id is null', () => {
    const p = cacheToPlayer(cachedPlayer({ external_id: null }))
    expect(p.sleeperId).toBeUndefined()
  })

  it('maps source_data.pos_rank "RB12" to ecrPositionRank=12', () => {
    const p = cacheToPlayer(cachedPlayer({ source_data: { pos_rank: 'RB12' } }))
    expect(p.ecrPositionRank).toBe(12)
  })

  it('maps source_data.pos_rank "WR3" to ecrPositionRank=3', () => {
    const p = cacheToPlayer(cachedPlayer({ position: 'WR', source_data: { pos_rank: 'WR3' } }))
    expect(p.ecrPositionRank).toBe(3)
  })

  it('sets ecrPositionRank to undefined when pos_rank is absent', () => {
    const p = cacheToPlayer(cachedPlayer({ source_data: {} }))
    expect(p.ecrPositionRank).toBeUndefined()
  })

  it('maps source_data.proj_points to projectedPoints', () => {
    const p = cacheToPlayer(cachedPlayer({ source_data: { proj_points: 285.4 } }))
    expect(p.projectedPoints).toBe(285.4)
  })

  it('sets projectedPoints to undefined when proj_points is absent', () => {
    const p = cacheToPlayer(cachedPlayer({ source_data: {} }))
    expect(p.projectedPoints).toBeUndefined()
  })

  // Documenting the known labeling issue: consensusRank is ADP-derived, NOT the ECR.
  // This test locks in the current behavior so any future fix to consensusRank is deliberate.
  it('consensusRank is derived from avgAdp (NOT from ecrPositionRank)', () => {
    const p = cacheToPlayer(cachedPlayer({
      adp: { sleeper: 30 },
      source_data: { pos_rank: 'WR5' },
      position: 'WR',
    }))
    expect(p.consensusRank).toBe(30)    // ADP-derived
    expect(p.ecrPositionRank).toBe(5)   // real ECR positional rank — distinct field
  })

  it('prefers vorp_12_200_ppr auction value over legacy averaged values', () => {
    const p = cacheToPlayer(cachedPlayer({
      auction_values: { vorp_12_200_ppr: 55, espn: 40, sleeper: 42 },
    }))
    expect(p.ceilingValue).toBe(55)
    expect(p.consensusAuctionValue).toBe(55)
  })
})

describe('cacheToPlayer - VAL-2.2 expert-anchored valuation', () => {
  const LAMBDA = 0.3

  it('pins expertAdjustedValue to the lambda=0.3 blend of ceiling and room price', () => {
    const p = cacheToPlayer(cachedPlayer({
      position: 'RB',
      source_data: { pos_rank: 'RB5' },
      auction_values: { vorp_12_200_ppr: 60 },
    }))
    // ceiling is the optimistic VORP $; room is the ECR-rank room price.
    expect(p.ceilingValue).toBe(60)
    const room = p.expectedRoomPrice
    expect(typeof room).toBe('number')
    const expectedWorth = Math.max(1, Math.round(LAMBDA * 60 + (1 - LAMBDA) * (room as number)))
    expect(p.expertAdjustedValue).toBe(expectedWorth)
    const expectedGap = Math.max(-40, Math.min(40, Math.round(expectedWorth - (room as number))))
    expect(p.valueGap).toBe(expectedGap)
  })

  it('gives two same-ECR-rank players DIFFERENT gaps by VORP (per-player signal restored)', () => {
    // Regression for the VAL-2.1 bug: valueGap = room * (1/mult - 1) was a
    // per-POSITION constant, so every RB got the same gap. The blend must ride
    // each player's own ceiling, so two RBs at the same ECR rank but different
    // VORP get different gaps.
    const hi = cacheToPlayer(cachedPlayer({
      position: 'RB',
      source_data: { pos_rank: 'RB8' },
      auction_values: { vorp_12_200_ppr: 55 },
    }))
    const lo = cacheToPlayer(cachedPlayer({
      position: 'RB',
      source_data: { pos_rank: 'RB8' },
      auction_values: { vorp_12_200_ppr: 18 },
    }))
    // Same ECR rank -> identical room price (the thing you bid against).
    expect(hi.expectedRoomPrice).toBe(lo.expectedRoomPrice)
    // But per-player worth -> different, ordered gaps. This is the whole fix.
    expect(hi.valueGap).not.toBe(lo.valueGap)
    expect(hi.valueGap as number).toBeGreaterThan(lo.valueGap as number)
  })
})

describe('cacheToPlayer - VAL-2.3 injury-risk-adjusted worth', () => {
  // The acute (designation) layer needs no risk model, so it is deterministic
  // here. The chronic durability layer is unit-tested in injury-risk.test.ts.
  const base = {
    position: 'RB' as const,
    source_data: { pos_rank: 'RB5' },
    auction_values: { vorp_12_200_ppr: 60 },
  }

  it('a healthy player is NOT haircut: riskAdjustedCeiling === ceilingValue', () => {
    const p = cacheToPlayer(cachedPlayer({ ...base, injury_status: null }))
    expect(p.ceilingValue).toBe(60)
    expect(p.riskAdjustedCeiling).toBe(60)
  })

  it('a PUP player is haircut hard: riskAdjustedCeiling below ceiling, gap shrinks', () => {
    const healthy = cacheToPlayer(cachedPlayer({ ...base, injury_status: null }))
    const pup = cacheToPlayer(cachedPlayer({ ...base, injury_status: 'PUP' }))
    // Same ceiling + same ECR rank -> same room price to bid against...
    expect(pup.ceilingValue).toBe(healthy.ceilingValue)
    expect(pup.expectedRoomPrice).toBe(healthy.expectedRoomPrice)
    // ...but PUP worth is faded (0.6x), so both the worth and the gap drop.
    expect(pup.riskAdjustedCeiling).toBe(Math.round(60 * 0.6))
    expect(pup.expertAdjustedValue as number).toBeLessThan(healthy.expertAdjustedValue as number)
    expect(pup.valueGap as number).toBeLessThan(healthy.valueGap as number)
  })

  it('"Questionable" (camp catch-all) barely moves the worth vs a PUP fade', () => {
    const q = cacheToPlayer(cachedPlayer({ ...base, injury_status: 'Questionable' }))
    const pup = cacheToPlayer(cachedPlayer({ ...base, injury_status: 'PUP' }))
    // 0.95 vs 0.60: Questionable stays near ceiling, PUP is much lower.
    expect(q.riskAdjustedCeiling).toBe(Math.round(60 * 0.95))
    expect(q.riskAdjustedCeiling as number).toBeGreaterThan(pup.riskAdjustedCeiling as number)
  })
})

describe('cacheToPlayer - DEF/DST price cap (Joe-locked 2026-08-26, $3)', () => {
  // A defense is a stream slot. The VORP model invents $8-14 of phantom "worth"
  // for the top DSTs; the read funnel must clamp worth AND room price to $3 so no
  // downstream surface ever advises paying up for a defense. Regression for the
  // "pay up to $13 for a defense" bug.
  function topDst(): CachedPlayer {
    return cachedPlayer({
      name: 'Houston Texans',
      team: 'HOU',
      position: 'DST',
      // VORP model would price this defense at $14 of worth...
      auction_values: { vorp_12_200_ppr: 14 },
      // ...and the ledger's DEF1 room curve at $6.
      source_data: { pos_rank: 'DST1', vorp: 26.5, proj_points: 117.8 },
    })
  }

  it('caps DEF worth (ceilingValue) at $3, never the raw $14', () => {
    const d = cacheToPlayer(topDst())
    expect(d.position).toBe('DEF')
    expect(d.ceilingValue).toBeLessThanOrEqual(3)
  })

  it('caps DEF room price at $3, never the raw ledger splurge', () => {
    const d = cacheToPlayer(topDst())
    expect(d.expectedRoomPrice as number).toBeLessThanOrEqual(3)
  })

  it('caps DEF consensusAuctionValue at $3', () => {
    const d = cacheToPlayer(topDst())
    expect(d.consensusAuctionValue).toBeLessThanOrEqual(3)
  })

  it('does NOT cap a non-DEF player at $3 (RB worth passes through)', () => {
    const rb = cacheToPlayer(cachedPlayer({
      position: 'RB',
      auction_values: { vorp_12_200_ppr: 87 },
      source_data: { pos_rank: 'RB1' },
    }))
    expect(rb.ceilingValue).toBe(87)
  })
})
