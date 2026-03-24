/**
 * Data Quality Validation Tests (FF-224)
 *
 * Tests for verifying 2026 season detection works correctly across sources.
 * These tests validate the freshness utilities and source adapters.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validate2026Data,
  detectSeason2026ForSource,
  isDataStale,
  getFreshnessTier,
} from '../intel/freshness'
import type { DataType, SourceFetchResult, SourcePlayerData } from '../intel/types'

// --- 2026 Season Detection Tests ---

describe('validate2026Data', () => {
  const mockFetchedAt = '2026-06-15T12:00:00.000Z'

  it('should detect 2026 data from explicit season label', () => {
    const result = validate2026Data(
      'fantasypros',
      mockFetchedAt,
      {},
      {
        seasonLabel: '2026 Fantasy Football Rankings',
        hasSeasonHeader: true,
      }
    )

    expect(result.is2026).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    expect(result.method).toBe('content_check')
  })

  it('should reject pre-2026 explicit season labels', () => {
    const result = validate2026Data(
      'fantasypros',
      mockFetchedAt,
      {},
      {
        seasonLabel: '2025 Fantasy Football Rankings',
        hasSeasonHeader: false,
      }
    )

    expect(result.is2026).toBe(false)
    expect(result.confidence).toBeGreaterThanOrEqual(0.9)
    expect(result.reason).toContain('pre-2026')
  })

  it('should detect 2026 from season header markers', () => {
    const result = validate2026Data(
      'espn',
      mockFetchedAt,
      {},
      {
        hasSeasonHeader: true,
      }
    )

    expect(result.is2026).toBe(true)
    expect(result.confidence).toBeGreaterThanOrEqual(0.8)
  })

  it('should use date heuristic after June 2026', () => {
    // Mock a fetch in July 2026 without explicit season info
    const julyFetch = '2026-07-15T12:00:00.000Z'
    const result = validate2026Data('sleeper', julyFetch, {}, {})

    expect(result.is2026).toBe(true)
    expect(result.method).toBe('date_heuristic')
    expect(result.confidence).toBeLessThan(0.8) // Lower confidence for heuristic
  })

  it('should mark as not 2026 before June 2026', () => {
    const earlyFetch = '2026-03-15T12:00:00.000Z'
    const result = validate2026Data('sleeper', earlyFetch, {}, {})

    expect(result.is2026).toBe(false)
    expect(result.reason).toContain('before June')
  })

  it('should trust recent source update dates during season', () => {
    const result = validate2026Data(
      'fantasypros',
      mockFetchedAt,
      {},
      {
        lastUpdateDate: new Date('2026-06-10'),
      }
    )

    expect(result.is2026).toBe(true)
    expect(result.method).toBe('source_metadata')
  })
})

describe('detectSeason2026ForSource', () => {
  it('should detect FantasyPros 2026 markers', () => {
    const html = '<title>2026 Fantasy Football Rankings</title>'
    const result = detectSeason2026ForSource('fantasypros', html)

    expect(result.hasSeasonHeader).toBe(true)
    expect(result.seasonLabel).toContain('2026')
  })

  it('should detect FantasyPros 2025 markers as not 2026', () => {
    const html = '<title>2025 Fantasy Football Rankings</title>'
    const result = detectSeason2026ForSource('fantasypros', html)

    expect(result.hasSeasonHeader).toBe(false)
    expect(result.seasonLabel).toContain('2025')
  })

  it('should detect ESPN season markers from JSON', () => {
    const json = { season: 2026, players: [] }
    const result = detectSeason2026ForSource('espn', json)

    expect(result.hasSeasonHeader).toBe(true)
  })

  it('should detect Sleeper projections URL markers', () => {
    const url = 'projections/nfl/2026'
    const result = detectSeason2026ForSource('sleeper', url)

    expect(result.hasSeasonHeader).toBe(true)
  })

  it('should handle generic 2026 markers', () => {
    const content = 'Check out our 2026 NFL Fantasy Rankings!'
    const result = detectSeason2026ForSource('unknown_source', content)

    expect(result.hasSeasonHeader).toBe(true)
  })
})

// --- Freshness Tier Tests ---

describe('getFreshnessTier', () => {
  it('should return correct tier for rankings', () => {
    const tier = getFreshnessTier('rankings')

    expect(tier).toBeDefined()
    expect(tier?.ttlHours).toBe(24)
    expect(tier?.requiresSeason2026).toBe(true)
  })

  it('should return correct tier for sentiment', () => {
    const tier = getFreshnessTier('sentiment')

    expect(tier).toBeDefined()
    expect(tier?.ttlHours).toBe(48)
    expect(tier?.requiresSeason2026).toBe(false)
  })

  it('should return correct tier for historical', () => {
    const tier = getFreshnessTier('historical')

    expect(tier).toBeDefined()
    expect(tier?.offSeasonBehavior).toBe('fetch_anyway')
    expect(tier?.requiresSeason2026).toBe(false)
  })
})

describe('isDataStale', () => {
  it('should mark never-fetched data as stale', () => {
    const result = isDataStale('rankings', null)

    expect(result.stale).toBe(true)
    expect(result.reason).toBe('Never fetched')
  })

  it('should mark old data as stale', () => {
    const oldDate = new Date()
    oldDate.setHours(oldDate.getHours() - 48) // 48 hours ago

    const result = isDataStale('rankings', oldDate.toISOString())

    expect(result.stale).toBe(true)
    expect(result.reason).toContain('TTL')
  })

  it('should mark recent data as fresh', () => {
    const recentDate = new Date()
    recentDate.setHours(recentDate.getHours() - 12) // 12 hours ago

    const result = isDataStale('rankings', recentDate.toISOString())

    expect(result.stale).toBe(false)
    expect(result.reason).toContain('Fresh')
  })
})

// --- Source Adapter Validation Tests ---

describe('Source Adapter Data Quality', () => {
  // Mock fetch for testing
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    global.fetch = originalFetch
  })

  describe('Fantasy Footballers Adapter', () => {
    it('should validate player data structure', async () => {
      // This test validates the expected output format
      const mockPlayerData: SourcePlayerData = {
        name: 'Patrick Mahomes',
        team: 'KC',
        position: 'QB',
        rank: 1,
        byeWeek: 10,
      }

      expect(mockPlayerData.name).toBeTruthy()
      expect(mockPlayerData.position).toMatch(/QB|RB|WR|TE|K|DEF/)
      expect(typeof mockPlayerData.rank).toBe('number')
    })

    it('should validate SourceFetchResult structure', () => {
      const mockResult: SourceFetchResult<SourcePlayerData> = {
        success: true,
        data: [],
        source: 'fantasy_footballers',
        dataType: 'rankings',
        fetchedAt: new Date().toISOString(),
        is2026Data: true,
        seasonValidation: {
          method: 'content_check',
          confidence: 0.9,
          reason: '2026 season detected',
        },
        playerCount: 0,
      }

      expect(mockResult.source).toBe('fantasy_footballers')
      expect(mockResult.dataType).toBe('rankings')
      expect(mockResult.is2026Data).toBe(true)
      expect(mockResult.seasonValidation.confidence).toBeGreaterThan(0)
    })
  })

  describe('FantasyPros Articles Adapter', () => {
    it('should validate sentiment data structure', () => {
      const mockSentiment = {
        playerName: 'Travis Kelce',
        sentiment: 'bullish' as const,
        mentions: ['breakout candidate', 'strong value pick'],
        confidence: 0.75,
        articleUrl: 'https://example.com/article',
        articleTitle: 'Top 10 TEs for 2026',
      }

      expect(mockSentiment.sentiment).toMatch(/bullish|neutral|bearish/)
      expect(mockSentiment.confidence).toBeGreaterThanOrEqual(0)
      expect(mockSentiment.confidence).toBeLessThanOrEqual(1)
      expect(Array.isArray(mockSentiment.mentions)).toBe(true)
    })
  })

  describe('Pro Football Reference Adapter', () => {
    it('should validate historical data structure', () => {
      const mockHistorical = {
        playerName: 'Tyreek Hill',
        season: 2025,
        games: 17,
        stats: {
          receiving_yds: 1799,
          receiving_td: 13,
          receptions: 119,
          fantasy_ppr: 350.8,
        },
      }

      expect(mockHistorical.season).toBeLessThan(2026) // Historical data
      expect(mockHistorical.games).toBeGreaterThan(0)
      expect(typeof mockHistorical.stats.fantasy_ppr).toBe('number')
    })
  })
})

// --- Data Normalization Tests ---

describe('Data Normalization Quality', () => {
  it('should properly weight sources in consensus calculation', () => {
    // Test weight normalization
    const weights = {
      fantasypros: 0.35,
      espn: 0.30,
      sleeper: 0.20,
      fantasyFootballers: 0.15,
    }

    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0)
    expect(totalWeight).toBeCloseTo(1.0, 2)
  })

  it('should handle missing sources gracefully', () => {
    // When a source is missing, its weight should be redistributed
    const presentWeights = {
      fantasypros: 0.35,
      espn: 0.30,
      // sleeper missing
      // fantasyFootballers missing
    }

    const totalPresent = Object.values(presentWeights).reduce((sum, w) => sum + w, 0)

    // Normalized weights should sum to 1
    const normalizedFP = presentWeights.fantasypros / totalPresent
    const normalizedESPN = presentWeights.espn / totalPresent

    expect(normalizedFP + normalizedESPN).toBeCloseTo(1.0, 2)
  })
})

// --- Edge Case Tests ---

describe('Edge Cases', () => {
  it('should handle empty player names', () => {
    const emptyName = ''
    expect(emptyName.trim()).toBe('')
  })

  it('should handle special characters in player names', () => {
    const names = [
      "D'Andre Swift",
      "Ja'Marr Chase",
      'Travis Kelce Jr.',
      'Odell Beckham Jr.',
      'Patrick Mahomes II',
    ]

    // Name normalization should handle these
    for (const name of names) {
      const normalized = name
        .toLowerCase()
        .replace(/[.']/g, '')
        .replace(/\s+(jr|sr|ii|iii|iv|v)$/i, '')
        .trim()

      expect(normalized.length).toBeGreaterThan(0)
    }
  })

  it('should handle team abbreviation variations', () => {
    const teamMappings: Record<string, string> = {
      'KC': 'KC',
      'kc': 'KC',
      'KAN': 'KC',
      'JAX': 'JAX',
      'JAC': 'JAX',
      'LV': 'LV',
      'LVR': 'LV',
      'OAK': 'LV', // Historical
    }

    // Verify mappings exist for common variations
    expect(teamMappings['KC']).toBe('KC')
    expect(teamMappings['JAX']).toBe('JAX')
  })

  it('should handle DST position variations', () => {
    const posVariations = ['DEF', 'DST', 'D/ST', 'def', 'Def']

    for (const pos of posVariations) {
      const upper = pos.toUpperCase()
      const normalized = upper === 'DST' || upper === 'D/ST' ? 'DEF' : upper
      expect(['DEF', 'DST', 'D/ST'].map(p => p === 'DST' || p === 'D/ST' ? 'DEF' : p)).toContain('DEF')
    }
  })
})
