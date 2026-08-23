import { describe, it, expect } from 'vitest'
import { selectDollarBin, priceLabel, DART_MAX } from '../dollar-bin'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { RepricedPlayer } from '../live-reprice'

function player(o: Partial<Player> & { id: string }): Player {
  return {
    name: o.id,
    team: 'LAR',
    position: 'RB',
    consensusAuctionValue: 2,
    ...o,
  } as Player
}

function scored(p: Player, combinedScore = 50): ScoredPlayer {
  return {
    player: p,
    strategyScore: combinedScore,
    intelScore: 0,
    combinedScore,
    targetStatus: 'neutral',
    isUserTarget: false,
    isUserAvoid: false,
    boosts: [],
    intelBoosts: [],
  } as ScoredPlayer
}

function repriced(o: Partial<RepricedPlayer> & { id: string }): RepricedPlayer {
  return {
    room: 2,
    you: 2,
    pocket: 0,
    roomDelta: 0,
    youDelta: 0,
    isPocket: false,
    isTax: false,
    ...o,
  }
}

const emptyRepriced = new Map<string, RepricedPlayer>()

describe('priceLabel', () => {
  it('collapses to $1 at or below a dollar', () => {
    expect(priceLabel(0)).toBe('$1')
    expect(priceLabel(1)).toBe('$1')
    expect(priceLabel(undefined)).toBe('$1')
  })
  it('reads a $1 to $2 band at two dollars', () => {
    expect(priceLabel(2)).toBe('$1 to $2')
  })
  it('reads a $1 to $3 band at three or above', () => {
    expect(priceLabel(3)).toBe('$1 to $3')
    expect(priceLabel(9)).toBe('$1 to $3')
  })
})

describe('selectDollarBin', () => {
  it('pins every starred player at the top regardless of price', () => {
    const pricey = player({ id: 'star-pricey', expectedRoomPrice: 40, ecrPositionRank: 4 })
    const cheap = player({ id: 'star-cheap', expectedRoomPrice: 1, ecrPositionRank: 55 })
    const bin = selectDollarBin(
      [scored(pricey, 90), scored(cheap, 20)],
      emptyRepriced,
      id => id.startsWith('star'),
    )
    expect(bin.starred.map(r => r.id)).toEqual(['star-pricey', 'star-cheap'])
    // A $40 star still shows in the bin - it is Joe's watchlist, not a price filter.
    expect(bin.starred[0].priceLabel).toBe('$1 to $3')
    expect(bin.darts).toHaveLength(0)
  })

  it('surfaces an unstarred $1-band player only when the model gives a beat signal', () => {
    const dart = player({ id: 'dart', expectedRoomPrice: 2, upsideValue: 5, ecrPositionRank: 38 })
    const filler = player({ id: 'filler', expectedRoomPrice: 2 }) // no upside / vorp / sleeper
    const bin = selectDollarBin([scored(dart), scored(filler)], emptyRepriced, () => false)
    expect(bin.darts.map(r => r.id)).toEqual(['dart'])
    expect(bin.starred).toHaveLength(0)
  })

  it('excludes players priced above the $1 bin from the dart list', () => {
    const tooRich = player({ id: 'rich', expectedRoomPrice: 8, upsideValue: 5 })
    const bin = selectDollarBin([scored(tooRich)], emptyRepriced, () => false)
    expect(bin.darts).toHaveLength(0)
  })

  it('prefers the live repriced room over the pre-draft price for the band', () => {
    // Pre-draft price is $2 (in band) but the room has re-priced him up to $9.
    const p = player({ id: 'moved', expectedRoomPrice: 2, upsideValue: 5 })
    const map = new Map([['moved', repriced({ id: 'moved', room: 9 })]])
    const bin = selectDollarBin([scored(p)], map, () => false)
    expect(bin.darts).toHaveLength(0) // repriced out of the bin
  })

  it('ranks darts best-first by model upside and caps the list', () => {
    const players = Array.from({ length: DART_MAX + 3 }, (_, i) =>
      scored(player({ id: `d${i}`, expectedRoomPrice: 1, upsideValue: i + 1 })),
    )
    const bin = selectDollarBin(players, emptyRepriced, () => false)
    expect(bin.darts).toHaveLength(DART_MAX)
    // Highest upsideValue first.
    expect(bin.darts[0].id).toBe(`d${DART_MAX + 2}`)
  })

  it('labels a sleeper and a real upside number from live fields only', () => {
    const p = player({
      id: 'sleep',
      expectedRoomPrice: 1,
      ecrPositionRank: 38,
      upsideValue: 4,
      analysis: { isSleeper: true } as Player['analysis'],
    })
    const bin = selectDollarBin([scored(p)], emptyRepriced, () => false)
    expect(bin.darts[0].posRank).toBe('RB38')
    expect(bin.darts[0].signals).toContain('sleeper')
    expect(bin.darts[0].signals).toContain('+$4 upside')
  })

  it('reads positive VORP as a beat signal when there is no sleeper flag', () => {
    const p = player({ id: 'vorp', expectedRoomPrice: 1, vorp: 3 })
    const bin = selectDollarBin([scored(p)], emptyRepriced, () => false)
    expect(bin.darts).toHaveLength(1)
    expect(bin.darts[0].signals).toContain('VORP+')
  })
})
