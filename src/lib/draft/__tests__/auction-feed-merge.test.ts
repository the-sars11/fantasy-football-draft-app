import { describe, it, expect } from 'vitest'
import { createPickMerger, playerNameToPickId, type NormalizedPickEvent } from '../auction-feed-merge'

function makeEvent(pickId: string, overrides: Partial<NormalizedPickEvent> = {}): NormalizedPickEvent {
  return { pickId, playerName: 'Player', manager: 'A', price: 10, source: 'broadcast', ...overrides }
}

describe('playerNameToPickId', () => {
  it('prefixes with sheets: and lowercases', () => {
    expect(playerNameToPickId('CMC')).toBe('sheets:cmc')
  })

  it('trims leading and trailing whitespace', () => {
    expect(playerNameToPickId('  Justin Jefferson  ')).toBe('sheets:justin jefferson')
  })

  it('produces the same ID for different casings', () => {
    expect(playerNameToPickId('cmc')).toBe(playerNameToPickId('CMC'))
  })

  it('never collides with Auctioneer IDs (no "sheets:" prefix on native IDs)', () => {
    expect(playerNameToPickId('pick-1')).toBe('sheets:pick-1')
    // Auctioneer IDs like 'pick-1' do not have the prefix
    expect(playerNameToPickId('pick-1')).not.toBe('pick-1')
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
    const event = makeEvent('pick-1', { playerName: 'CMC', manager: 'Bob', price: 55, source: 'sheets' })
    const [result] = merger.merge([event])
    expect(result.playerName).toBe('CMC')
    expect(result.manager).toBe('Bob')
    expect(result.price).toBe(55)
    expect(result.source).toBe('sheets')
  })
})
