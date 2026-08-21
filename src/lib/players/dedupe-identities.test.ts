import { describe, it, expect } from 'vitest'
import { canonicalPlayerName, dedupePlayerIdentities } from './dedupe-identities'
import type { Player } from './types'

/** Minimal Player factory - only the fields the dedup reads/merges. */
function mkPlayer(over: Partial<Player>): Player {
  return {
    id: over.id ?? 'id',
    name: over.name ?? 'Player',
    team: over.team ?? '',
    position: over.position ?? 'WR',
    byeWeek: 0,
    injuryStatus: undefined,
    consensusRank: over.consensusRank ?? 100,
    consensusAuctionValue: over.consensusAuctionValue ?? 1,
    consensusTier: 1,
    adp: over.adp ?? 100,
    projectedPoints: over.projectedPoints,
    vorp: over.vorp,
    positionRankByPoints: over.positionRankByPoints,
    replacementPoints: over.replacementPoints,
    marketAuctionValue: over.marketAuctionValue,
    valueRange: over.valueRange,
    ceilingValue: over.ceilingValue,
    expectedRoomPrice: over.expectedRoomPrice,
    sourceData: [],
    projections: over.projections ?? { points: 0 },
  } as Player
}

describe('canonicalPlayerName', () => {
  it('strips generational suffixes so III and base collide', () => {
    expect(canonicalPlayerName('Luther Burden III')).toBe('luther burden')
    expect(canonicalPlayerName('Luther Burden')).toBe('luther burden')
  })

  it('strips periods and apostrophes', () => {
    expect(canonicalPlayerName("Ja'Marr Chase")).toBe('jamarr chase')
    expect(canonicalPlayerName('A.J. Brown')).toBe('aj brown')
  })
})

describe('dedupePlayerIdentities', () => {
  it('merges the ghost into the best-ranked row and adopts its projection', () => {
    const players = [
      mkPlayer({
        id: 'real',
        name: 'Luther Burden III',
        team: 'CHI',
        position: 'WR',
        adp: 47,
        consensusRank: 47,
        ceilingValue: 27,
        consensusAuctionValue: 27,
        projectedPoints: undefined, // real row is missing the projection
      }),
      mkPlayer({
        id: 'ghost',
        name: 'Luther Burden',
        team: '',
        position: 'WR',
        adp: 999,
        consensusRank: 999,
        ceilingValue: 16,
        projectedPoints: 212.3, // ghost carries the projection
      }),
    ]

    const out = dedupePlayerIdentities(players)

    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('real') // identity of the best-ranked row survives
    expect(out[0].name).toBe('Luther Burden III')
    expect(out[0].adp).toBe(47) // real pricing/ADP untouched
    expect(out[0].ceilingValue).toBe(27)
    expect(out[0].projectedPoints).toBe(212.3) // adopted from the ghost
  })

  it('never overwrites an existing value on the surviving row', () => {
    const players = [
      mkPlayer({ id: 'a', name: 'Test Guy', position: 'RB', adp: 10, projectedPoints: 300 }),
      mkPlayer({ id: 'b', name: 'Test Guy', position: 'RB', adp: 20, projectedPoints: 999 }),
    ]
    const out = dedupePlayerIdentities(players)
    expect(out).toHaveLength(1)
    expect(out[0].projectedPoints).toBe(300) // base value kept, not clobbered
  })

  it('does NOT merge same-name players on different real teams', () => {
    const players = [
      mkPlayer({ id: 'a', name: 'Mike Williams', position: 'WR', team: 'NYJ', adp: 80 }),
      mkPlayer({ id: 'b', name: 'Mike Williams', position: 'WR', team: 'PIT', adp: 120 }),
    ]
    const out = dedupePlayerIdentities(players)
    expect(out).toHaveLength(2)
  })

  it('does NOT merge same-name players at different positions', () => {
    const players = [
      mkPlayer({ id: 'a', name: 'Josh Allen', position: 'QB', team: 'BUF', adp: 15 }),
      mkPlayer({ id: 'b', name: 'Josh Allen', position: 'DEF', team: 'JAX', adp: 300 }),
    ]
    const out = dedupePlayerIdentities(players)
    expect(out).toHaveLength(2)
  })

  it('preserves order and leaves a clean list unchanged in length', () => {
    const players = [
      mkPlayer({ id: 'a', name: 'Alpha', position: 'RB', adp: 1 }),
      mkPlayer({ id: 'b', name: 'Bravo', position: 'WR', adp: 2 }),
      mkPlayer({ id: 'c', name: 'Charlie', position: 'TE', adp: 3 }),
    ]
    const out = dedupePlayerIdentities(players)
    expect(out.map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })
})
