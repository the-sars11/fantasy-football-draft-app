/**
 * normalize.test.ts — Multi-Source Normalization Engine.
 *
 * The consensus merge is the front door of the whole research pipeline: every
 * downstream value (calibration, strategies, sims, reads) starts from these
 * ConsensusPlayer rows. This locks the load-bearing behavior:
 *   - weighted consensus rank / ADP / auction value across sources
 *   - fuzzy name matching (suffixes, periods) so one player isn't double-counted
 *   - FantasyPros-only players (e.g. DSTs) still make the board
 *   - the min-data filter drops rows with no rank / adp / projection
 *   - output is sorted by consensus rank and freshness tracks missing sources
 * Pure, $0 — no network.
 */

import { describe, it, expect } from 'vitest'
import { normalizePlayerData } from '../normalize'
import type { NormalizeInput } from '../normalize'
import type { NormalizedSleeperPlayer, NormalizedSleeperProjection } from '../sources/sleeper'
import type { NormalizedESPNPlayer } from '../sources/espn'
import type { NormalizedFPPlayer, NormalizedFPAuctionValue } from '../sources/fantasypros'
import type { Position } from '@/lib/players/types'

const NOW = new Date().toISOString() // fresh, so nothing reads stale

// ─── Source fixture builders ─────────────────────────────────────────────────

function sleeper(
  o: Partial<NormalizedSleeperPlayer> & { sleeperId: string; name: string; position: Position },
): NormalizedSleeperPlayer {
  return { team: 'TST', injuryStatus: null, age: 25, yearsExp: 3, adp: {}, ...o }
}

function sleeperProj(
  o: Partial<NormalizedSleeperProjection> & { sleeperId: string },
): NormalizedSleeperProjection {
  return { points: {}, ...o }
}

function espn(
  o: Partial<NormalizedESPNPlayer> & { espnId: number; name: string; position: Position },
): NormalizedESPNPlayer {
  return {
    team: 'TST',
    injuryStatus: null,
    rank: null,
    auctionValue: null,
    adp: null,
    percentOwned: null,
    projectedPoints: null,
    projections: {},
    ...o,
  }
}

function fp(
  o: Partial<NormalizedFPPlayer> & { name: string; position: Position; ecrRank: number },
): NormalizedFPPlayer {
  return {
    team: 'TST',
    byeWeek: 7,
    ecrBestRank: o.ecrRank,
    ecrWorstRank: o.ecrRank,
    ecrAverage: o.ecrRank,
    ecrStdDev: 0,
    positionalRank: `${o.position}1`,
    tier: 1,
    ...o,
  }
}

function fpAuction(
  o: Partial<NormalizedFPAuctionValue> & { name: string; position: Position; auctionValue: number },
): NormalizedFPAuctionValue {
  return { team: 'TST', auctionLow: o.auctionValue - 2, auctionHigh: o.auctionValue + 2, ...o }
}

// ─── Consensus merge ─────────────────────────────────────────────────────────

describe('normalizePlayerData - consensus merge', () => {
  it('joins the same player across sources and records every contributor', () => {
    const input: NormalizeInput = {
      sleeper: {
        players: [sleeper({ sleeperId: 's1', name: "Ja'Marr Chase", position: 'WR', team: 'CIN', adp: { ppr: 3 } })],
        projections: [],
        fetchedAt: NOW,
      },
      espn: {
        players: [espn({ espnId: 1, name: "Ja'Marr Chase", position: 'WR', team: 'CIN', rank: 2, auctionValue: 40 })],
        fetchedAt: NOW,
      },
      fantasypros: {
        ecr: [fp({ name: 'JaMarr Chase', position: 'WR', team: 'CIN', ecrRank: 1 })],
        auctionValues: [fpAuction({ name: 'JaMarr Chase', position: 'WR', team: 'CIN', auctionValue: 50 })],
        fetchedAt: NOW,
      },
    }
    const { players } = normalizePlayerData(input)
    expect(players).toHaveLength(1)
    const p = players[0]
    expect(p.sources.sort()).toEqual(['espn', 'fantasypros', 'sleeper'])
    // weighted rank = (1*.35 + 2*.30 + 3*.20) / (.35+.30+.20) = 1.55/.85
    expect(p.consensusRank).toBeCloseTo(1.55 / 0.85, 4)
    // auction = (50*.5 + 40*.5) / 1.0 = 45
    expect(p.consensusAuctionValue).toBe(45)
  })

  it('matches across punctuation and suffix differences (no double-count)', () => {
    // Sleeper "A.J. Brown" must join FantasyPros "AJ Brown"; "Kenneth Walker III"
    // must join "Kenneth Walker". Both should be single merged rows, not dupes.
    const input: NormalizeInput = {
      sleeper: {
        players: [
          sleeper({ sleeperId: 's1', name: 'A.J. Brown', position: 'WR', team: 'PHI', adp: { ppr: 12 } }),
          sleeper({ sleeperId: 's2', name: 'Kenneth Walker III', position: 'RB', team: 'SEA', adp: { ppr: 20 } }),
        ],
        projections: [],
        fetchedAt: NOW,
      },
      fantasypros: {
        ecr: [
          fp({ name: 'AJ Brown', position: 'WR', team: 'PHI', ecrRank: 10 }),
          fp({ name: 'Kenneth Walker', position: 'RB', team: 'SEA', ecrRank: 18 }),
        ],
        auctionValues: [],
        fetchedAt: NOW,
      },
    }
    const { players } = normalizePlayerData(input)
    expect(players).toHaveLength(2) // not 4
    for (const p of players) {
      expect(p.sources).toContain('fantasypros')
      expect(p.sourceRanks.fantasypros).toBeDefined()
    }
  })

  it('adds FantasyPros-only players (e.g. a DST) not present in Sleeper', () => {
    const input: NormalizeInput = {
      sleeper: {
        players: [sleeper({ sleeperId: 's1', name: 'Some RB', position: 'RB', adp: { ppr: 5 } })],
        projections: [],
        fetchedAt: NOW,
      },
      fantasypros: {
        ecr: [
          fp({ name: 'Some RB', position: 'RB', ecrRank: 5 }),
          fp({ name: 'Ravens DST', position: 'DEF', team: 'BAL', ecrRank: 130 }),
        ],
        auctionValues: [],
        fetchedAt: NOW,
      },
    }
    const { players } = normalizePlayerData(input)
    const dst = players.find((p) => p.name === 'Ravens DST')
    expect(dst).toBeDefined()
    expect(dst!.position).toBe('DEF')
    expect(dst!.sources).toEqual(['fantasypros'])
  })
})

// ─── Filtering and ordering ──────────────────────────────────────────────────

describe('normalizePlayerData - filtering and ordering', () => {
  it('drops a player with no rank, no adp and no projection', () => {
    const input: NormalizeInput = {
      sleeper: {
        players: [
          sleeper({ sleeperId: 's1', name: 'Ranked Guy', position: 'RB', adp: { ppr: 4 } }),
          sleeper({ sleeperId: 's2', name: 'Ghost Guy', position: 'WR', adp: {} }), // nothing
        ],
        projections: [],
        fetchedAt: NOW,
      },
    }
    const { players } = normalizePlayerData(input)
    expect(players.map((p) => p.name)).toEqual(['Ranked Guy'])
  })

  it('keeps a projection-only player (rank absent but points > 0)', () => {
    const input: NormalizeInput = {
      sleeper: {
        players: [sleeper({ sleeperId: 's1', name: 'Proj Guy', position: 'TE', adp: {} })],
        projections: [sleeperProj({ sleeperId: 's1', points: { ppr: 140 } })],
        fetchedAt: NOW,
      },
    }
    const { players } = normalizePlayerData(input)
    expect(players).toHaveLength(1)
    expect(players[0].projections.points).toBe(140)
  })

  it('sorts output by ascending consensus rank', () => {
    const input: NormalizeInput = {
      sleeper: {
        players: [
          sleeper({ sleeperId: 's1', name: 'Third', position: 'RB', adp: { ppr: 30 } }),
          sleeper({ sleeperId: 's2', name: 'First', position: 'WR', adp: { ppr: 2 } }),
          sleeper({ sleeperId: 's3', name: 'Second', position: 'QB', adp: { ppr: 15 } }),
        ],
        projections: [],
        fetchedAt: NOW,
      },
    }
    const { players } = normalizePlayerData(input)
    expect(players.map((p) => p.name)).toEqual(['First', 'Second', 'Third'])
  })
})

// ─── Freshness ───────────────────────────────────────────────────────────────

describe('normalizePlayerData - freshness', () => {
  it('marks a supplied source fresh and an absent source missing', () => {
    const input: NormalizeInput = {
      sleeper: {
        players: [sleeper({ sleeperId: 's1', name: 'Guy', position: 'RB', adp: { ppr: 5 } })],
        projections: [],
        fetchedAt: NOW,
      },
    }
    const { freshness } = normalizePlayerData(input)
    const bySource = Object.fromEntries(freshness.map((f) => [f.source, f.status]))
    expect(bySource['sleeper']).toBe('fresh')
    expect(bySource['espn']).toBe('missing')
    expect(bySource['fantasypros']).toBe('missing')
  })

  it('flags a stale source when its fetchedAt is over 24h old', () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
    const input: NormalizeInput = {
      sleeper: {
        players: [sleeper({ sleeperId: 's1', name: 'Guy', position: 'RB', adp: { ppr: 5 } })],
        projections: [],
        fetchedAt: old,
      },
    }
    const { freshness } = normalizePlayerData(input)
    expect(freshness.find((f) => f.source === 'sleeper')!.status).toBe('stale')
  })
})
