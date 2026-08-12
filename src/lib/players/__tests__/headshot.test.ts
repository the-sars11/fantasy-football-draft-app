import { describe, it, expect } from 'vitest'
import { normalizeName, headshotUrl, SILHOUETTE_SRC } from '../headshot'

describe('normalizeName', () => {
  it('lowercases and strips punctuation', () => {
    expect(normalizeName('A.J. Brown')).toBe('aj brown')
    expect(normalizeName("Ja'Marr Chase")).toBe('jamarr chase')
  })
  it('drops generational suffixes', () => {
    expect(normalizeName('Patrick Mahomes II')).toBe('patrick mahomes')
    expect(normalizeName('Michael Pittman Jr.')).toBe('michael pittman')
  })
  it('collapses whitespace and trims', () => {
    expect(normalizeName('  Bijan   Robinson  ')).toBe('bijan robinson')
  })
  it('is null-safe', () => {
    expect(normalizeName('')).toBe('')
  })
})

describe('headshotUrl', () => {
  it('resolves a mapped player to the real ESPN CDN url', () => {
    const url = headshotUrl('Bijan Robinson')
    expect(url).toBe('https://a.espncdn.com/i/headshots/nfl/players/full/4430807.png')
  })
  it('matches regardless of punctuation/suffix formatting', () => {
    // Same player, messier spelling — must still resolve to the same id.
    expect(headshotUrl('bijan  robinson')).toBe(headshotUrl('Bijan Robinson'))
  })
  it('returns null for an unmapped name (caller uses the silhouette)', () => {
    expect(headshotUrl('Nonexistent Fakeplayer XYZ')).toBeNull()
  })
})

describe('SILHOUETTE_SRC', () => {
  it('points at a local public asset', () => {
    expect(SILHOUETTE_SRC).toBe('/player-silhouette.svg')
  })
})
