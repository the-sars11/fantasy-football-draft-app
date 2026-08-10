import { describe, it, expect } from 'vitest'
import {
  createPickMerger,
  auctionPickId,
  playerNameToPickId,
  type NormalizedPickEvent,
} from '../auction-feed-merge'

function makeEvent(pickId: string, overrides: Partial<NormalizedPickEvent> = {}): NormalizedPickEvent {
  return { pickId, playerName: 'Player', manager: 'A', price: 10, source: 'broadcast', ...overrides }
}

// ---------------------------------------------------------------------------
// Finding 8: the single dedup key is the source-assigned stable id.
// auctionPickId() namespaces the auctioneer id; playerNameToPickId() is the
// id-less fallback only. These two suites lock that decision.
// ---------------------------------------------------------------------------

describe('auctionPickId (single source of truth for auction picks)', () => {
  it('prefixes the auctioneer id with auction:', () => {
    expect(auctionPickId('pick-1')).toBe('auction:pick-1')
  })

  it('same auctioneer id -> same key (dedups a player across same-device + remote)', () => {
    // Same player is 'pick-7' in the auctioneer whether read via localStorage or
    // the remote proxy, so both sources map to one key.
    expect(auctionPickId('pick-7')).toBe(auctionPickId('pick-7'))
  })

  it('never collides with sleeper ids or the name fallback', () => {
    expect(auctionPickId('1')).not.toBe('sleeper:1')
    expect(auctionPickId('cmc')).not.toBe(playerNameToPickId('cmc'))
  })
})

describe('playerNameToPickId (id-less fallback only)', () => {
  it('prefixes with name: and lowercases', () => {
    expect(playerNameToPickId('CMC')).toBe('name:cmc')
  })

  it('trims leading and trailing whitespace', () => {
    expect(playerNameToPickId('  Justin Jefferson  ')).toBe('name:justin jefferson')
  })

  it('produces the same key for different casings', () => {
    expect(playerNameToPickId('cmc')).toBe(playerNameToPickId('CMC'))
  })

  it('never collides with real source ids (auction:/sleeper:)', () => {
    expect(playerNameToPickId('pick-1')).toBe('name:pick-1')
    expect(playerNameToPickId('pick-1')).not.toBe(auctionPickId('pick-1'))
  })
})

describe('createPickMerger', () => {
  it('passes through picks on first call', () => {
    const merger = createPickMerger()
    const result = merger.merge([makeEvent('pick-1'), makeEvent('pick-2')])
    expect(result).toHaveLength(2)
    expect(merger.seenCount).toBe(2)
  })

  it('deduplicates across subsequent batches', () => {
    const merger = createPickMerger()
    merger.merge([makeEvent('pick-1')])
    const result = merger.merge([makeEvent('pick-1'), makeEvent('pick-2')])
    expect(result).toHaveLength(1)
    expect(result[0].pickId).toBe('pick-2')
  })

  it('deduplicates within a single batch', () => {
    const merger = createPickMerger()
    const result = merger.merge([makeEvent('pick-1'), makeEvent('pick-1')])
    expect(result).toHaveLength(1)
    expect(merger.seenCount).toBe(1)
  })

  it('seenCount accumulates across batches, counting only distinct IDs', () => {
    const merger = createPickMerger()
    merger.merge([makeEvent('a'), makeEvent('b')])
    merger.merge([makeEvent('a'), makeEvent('c')])
    expect(merger.seenCount).toBe(3) // a, b, c
  })

  it('reset() clears seen IDs so previously seen picks pass through again', () => {
    const merger = createPickMerger()
    merger.merge([makeEvent('pick-1')])
    merger.reset()
    expect(merger.seenCount).toBe(0)
    const result = merger.merge([makeEvent('pick-1')])
    expect(result).toHaveLength(1)
  })

  it('two independent mergers do not share state', () => {
    const m1 = createPickMerger()
    const m2 = createPickMerger()
    m1.merge([makeEvent('pick-1')])
    const result = m2.merge([makeEvent('pick-1')])
    expect(result).toHaveLength(1) // m2 has not seen pick-1
  })

  it('passes through all fields on a new pick', () => {
    const merger = createPickMerger()
    const event = makeEvent('pick-1', { playerName: 'CMC', manager: 'Bob', price: 55, source: 'remote' })
    const [result] = merger.merge([event])
    expect(result.playerName).toBe('CMC')
    expect(result.manager).toBe('Bob')
    expect(result.price).toBe(55)
    expect(result.source).toBe('remote')
  })

  it('dedups the same auctioneer pick across same-device and remote sources', () => {
    // Real flow: the same player ('pick-3') arrives first from the same-device
    // path and later from the remote proxy. Both map to auctionPickId('pick-3'),
    // so the merger emits it exactly once.
    const merger = createPickMerger()
    const local = makeEvent(auctionPickId('pick-3'), { playerName: 'CeeDee Lamb', source: 'localstorage' })
    const remote = makeEvent(auctionPickId('pick-3'), { playerName: 'CeeDee Lamb', source: 'remote' })

    expect(merger.merge([local])).toHaveLength(1)
    expect(merger.merge([remote])).toHaveLength(0)
    expect(merger.seenCount).toBe(1)
  })

  it('keeps two different players even when their names would clash under a name key', () => {
    // Distinct auctioneer ids => distinct keys, so a name-key false-merge can never
    // drop a legitimate second pick.
    const merger = createPickMerger()
    const a = makeEvent(auctionPickId('pick-10'), { playerName: 'Mike Williams' })
    const b = makeEvent(auctionPickId('pick-11'), { playerName: 'Mike Williams' })
    const result = merger.merge([a, b])
    expect(result).toHaveLength(2)
  })
})
