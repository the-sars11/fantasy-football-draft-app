import { describe, it, expect } from 'vitest'
import { imputeMissingProjections } from './impute-projections'
import type { Player } from './types'

/** Minimal Player factory - only the fields the imputation reads. */
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
    projectionImputed: over.projectionImputed,
    vorp: over.vorp,
    positionRankByPoints: over.positionRankByPoints,
    ecrPositionRank: over.ecrPositionRank,
    replacementPoints: over.replacementPoints,
    marketAuctionValue: over.marketAuctionValue,
    ceilingValue: over.ceilingValue,
    expectedRoomPrice: over.expectedRoomPrice,
    sourceData: [],
    projections: over.projections ?? { points: 0 },
  } as Player
}

describe('imputeMissingProjections', () => {
  it('fills a null projection by interpolating the position rank curve', () => {
    const players = [
      mkPlayer({ id: 'rb1', position: 'RB', ecrPositionRank: 1, projectedPoints: 300 }),
      mkPlayer({ id: 'rb5', position: 'RB', ecrPositionRank: 5, projectedPoints: 200 }),
      // Missing RB at rank 3 -> halfway between 300 and 200 = 250.
      mkPlayer({ id: 'jt', name: 'Jonathan Taylor', position: 'RB', ecrPositionRank: 3 }),
    ]
    const out = imputeMissingProjections(players)
    const jt = out.find((p) => p.id === 'jt')!
    expect(jt.projectedPoints).toBe(250)
    expect(jt.projectionImputed).toBe(true)
  })

  it('clamps to the nearest endpoint above the known range (TE1 above min-known TE2)', () => {
    const players = [
      mkPlayer({ id: 'te2', position: 'TE', ecrPositionRank: 2, projectedPoints: 236 }),
      mkPlayer({ id: 'te5', position: 'TE', ecrPositionRank: 5, projectedPoints: 203 }),
      // Bowers is TE1 -> below the min known rank (2), clamp to 236 (no extrapolation).
      mkPlayer({ id: 'bowers', name: 'Brock Bowers', position: 'TE', ecrPositionRank: 1 }),
    ]
    const out = imputeMissingProjections(players)
    const bowers = out.find((p) => p.id === 'bowers')!
    expect(bowers.projectedPoints).toBe(236)
    expect(bowers.projectionImputed).toBe(true)
  })

  it('treats projectedPoints of 0 as missing and imputes it', () => {
    const players = [
      mkPlayer({ id: 'wr1', position: 'WR', ecrPositionRank: 1, projectedPoints: 320 }),
      mkPlayer({ id: 'wr10', position: 'WR', ecrPositionRank: 10, projectedPoints: 230 }),
      mkPlayer({ id: 'zero', position: 'WR', ecrPositionRank: 1, projectedPoints: 0 }),
    ]
    const out = imputeMissingProjections(players)
    const zero = out.find((p) => p.id === 'zero')!
    expect(zero.projectedPoints).toBe(320)
    expect(zero.projectionImputed).toBe(true)
  })

  it('leaves real projections untouched and unflagged', () => {
    const players = [
      mkPlayer({ id: 'a', position: 'RB', ecrPositionRank: 1, projectedPoints: 300 }),
      mkPlayer({ id: 'b', position: 'RB', ecrPositionRank: 5, projectedPoints: 200 }),
    ]
    const out = imputeMissingProjections(players)
    expect(out.every((p) => p.projectionImputed !== true)).toBe(true)
    expect(out.find((p) => p.id === 'a')!.projectedPoints).toBe(300)
  })

  it('does not impute when the player has no expert positional rank', () => {
    const players = [
      mkPlayer({ id: 'rb1', position: 'RB', ecrPositionRank: 1, projectedPoints: 300 }),
      mkPlayer({ id: 'noRank', position: 'RB', ecrPositionRank: undefined }),
    ]
    const out = imputeMissingProjections(players)
    const noRank = out.find((p) => p.id === 'noRank')!
    expect(noRank.projectedPoints).toBeUndefined()
    expect(noRank.projectionImputed).toBeUndefined()
  })

  it('does not impute when no known curve exists for the position', () => {
    const players = [
      mkPlayer({ id: 'onlyDef', position: 'DEF', ecrPositionRank: 9 }),
    ]
    const out = imputeMissingProjections(players)
    expect(out[0].projectedPoints).toBeUndefined()
    expect(out[0].projectionImputed).toBeUndefined()
  })

  it('does not use an already-imputed row as a curve anchor', () => {
    // First pass imputes 'seed'; a second pass must not treat it as real data.
    const players = [
      mkPlayer({ id: 'wr1', position: 'WR', ecrPositionRank: 1, projectedPoints: 300 }),
      mkPlayer({ id: 'wr9', position: 'WR', ecrPositionRank: 9, projectedPoints: 220 }),
      mkPlayer({ id: 'imputed', position: 'WR', ecrPositionRank: 5, projectedPoints: 260, projectionImputed: true }),
      mkPlayer({ id: 'target', position: 'WR', ecrPositionRank: 5 }),
    ]
    const out = imputeMissingProjections(players)
    const target = out.find((p) => p.id === 'target')!
    // Curve is built only from wr1 (300) and wr9 (220); rank 5 -> 300 + (4/8)*(220-300) = 260.
    expect(target.projectedPoints).toBe(260)
  })
})
