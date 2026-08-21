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
