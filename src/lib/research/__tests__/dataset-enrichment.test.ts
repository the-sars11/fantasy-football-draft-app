/**
 * dataset-enrichment.test.ts - W2: covers the two pure join helpers that let
 * /prep/players and /prep/board additively surface dataset-only fields
 * (land odds, durability price, value band) keyed on player id.
 */

import { describe, it, expect } from 'vitest'
import { buildEnrichmentMap, pickEnrichment } from '../dataset-enrichment'
import type { EnrichedPlayer } from '../dataset-types'

function makeEnrichedPlayer(overrides: Partial<EnrichedPlayer> = {}): EnrichedPlayer {
  return {
    id: 'player-1',
    name: 'Test Player',
    team: 'SEA',
    position: 'RB',
    byeWeek: 9,
    injuryStatus: null,
    consensusRank: 12,
    adp: 15.4,
    consensusAuctionValue: 42,
    ceilingValue: 50,
    expectedRoomPrice: 38,
    valueGap: 6,
    projectedPoints: 210.5,
    vorp: 30,
    expertTier: 2,
    ecrPositionRank: 8,
    valueBand: { low: 34, base: 42, high: 50, source: 'league' },
    tags: [],
    read: { intent: 'fair', line: 'Test read line.' },
    landProbability: 0.62,
    durabilityPriceFactor: 0.89,
    ...overrides,
  } as EnrichedPlayer
}

describe('buildEnrichmentMap', () => {
  it('keys players by id', () => {
    const players = [
      makeEnrichedPlayer({ id: 'a', name: 'Player A' }),
      makeEnrichedPlayer({ id: 'b', name: 'Player B' }),
    ]
    const map = buildEnrichmentMap(players)
    expect(map.size).toBe(2)
    expect(map.get('a')?.name).toBe('Player A')
    expect(map.get('b')?.name).toBe('Player B')
  })

  it('returns an empty map for empty input', () => {
    const map = buildEnrichmentMap([])
    expect(map.size).toBe(0)
  })

  it('last write wins when two players share an id', () => {
    const players = [
      makeEnrichedPlayer({ id: 'dup', name: 'First' }),
      makeEnrichedPlayer({ id: 'dup', name: 'Second' }),
    ]
    const map = buildEnrichmentMap(players)
    expect(map.size).toBe(1)
    expect(map.get('dup')?.name).toBe('Second')
  })
})

describe('pickEnrichment', () => {
  it('returns the matched player for a known id', () => {
    const map = buildEnrichmentMap([makeEnrichedPlayer({ id: 'a', durabilityPriceFactor: 0.75 })])
    const result = pickEnrichment(map, 'a')
    expect(result?.durabilityPriceFactor).toBe(0.75)
  })

  it('returns undefined for a missing id', () => {
    const map = buildEnrichmentMap([makeEnrichedPlayer({ id: 'a' })])
    expect(pickEnrichment(map, 'nonexistent')).toBeUndefined()
  })

  it('returns undefined for an empty map', () => {
    const map = buildEnrichmentMap([])
    expect(pickEnrichment(map, 'a')).toBeUndefined()
  })
})
