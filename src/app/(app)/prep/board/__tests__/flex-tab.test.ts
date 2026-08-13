/**
 * flex-tab.test.ts — R8: proves the FLEX tab filter+sort logic.
 *
 * The flexPlayers memo in board/client.tsx is inline, so this test extracts
 * the same logic as a pure function and verifies:
 *   1. Only RB/WR/TE appear (QB and DEF are excluded).
 *   2. Players are sorted by value DESC (adjustedAuctionValue ?? consensusAuctionValue).
 *   3. Ties break on consensusRank ASC.
 */

import { describe, it, expect } from 'vitest'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Player } from '@/lib/players/types'

function makePlayer(
  id: string,
  position: Player['position'],
  consensusAuctionValue: number,
  consensusRank: number,
  adjustedAuctionValue?: number,
): ScoredPlayer {
  const player: Player = {
    id,
    name: `Player ${id}`,
    position,
    team: 'TST',
    byeWeek: 7,
    consensusRank,
    consensusAuctionValue,
    adp: consensusRank,
    ceilingValue: consensusAuctionValue + 5,
    expectedRoomPrice: consensusAuctionValue - 2,
    projectedPoints: 200,
    expertTier: 2,
    injuryStatus: null,
  }
  return {
    player,
    strategyScore: 50,
    intelScore: 0,
    combinedScore: 50,
    adjustedAuctionValue,
    targetStatus: 'neutral',
    isUserTarget: false,
    isUserAvoid: false,
    boosts: [],
    intelBoosts: [],
  }
}

// Mirror the exact flexPlayers memo logic from board/client.tsx
function buildFlexPlayers(scoredPlayers: ScoredPlayer[]): ScoredPlayer[] {
  return scoredPlayers
    .filter((sp) => sp.player.position === 'RB' || sp.player.position === 'WR' || sp.player.position === 'TE')
    .sort((a, b) => {
      const aVal = a.adjustedAuctionValue ?? a.player.consensusAuctionValue
      const bVal = b.adjustedAuctionValue ?? b.player.consensusAuctionValue
      if (bVal !== aVal) return bVal - aVal
      return a.player.consensusRank - b.player.consensusRank
    })
}

describe('FLEX tab filter + sort', () => {
  const scoredPlayers: ScoredPlayer[] = [
    makePlayer('qb1', 'QB', 45, 1),          // excluded
    makePlayer('rb1', 'RB', 60, 2),          // included, $60
    makePlayer('wr1', 'WR', 55, 3),          // included, $55
    makePlayer('te1', 'TE', 40, 4),          // included, $40
    makePlayer('def1', 'DEF', 5, 100),       // excluded
    makePlayer('rb2', 'RB', 30, 6),          // included, $30
    makePlayer('wr2', 'WR', 55, 5),          // included, $55 (tie with wr1 → rank tiebreak)
  ]

  it('excludes QB and DEF from the FLEX list', () => {
    const flex = buildFlexPlayers(scoredPlayers)
    const positions = flex.map(sp => sp.player.position)
    expect(positions).not.toContain('QB')
    expect(positions).not.toContain('DEF')
  })

  it('includes all RB/WR/TE players', () => {
    const flex = buildFlexPlayers(scoredPlayers)
    expect(flex).toHaveLength(5) // rb1, wr1, te1, rb2, wr2
  })

  it('sorts by consensusAuctionValue DESC when no adjustedAuctionValue', () => {
    const flex = buildFlexPlayers(scoredPlayers)
    const values = flex.map(sp => sp.player.consensusAuctionValue)
    expect(values[0]).toBe(60) // rb1
    expect(values[values.length - 1]).toBe(30) // rb2
  })

  it('prefers adjustedAuctionValue over consensusAuctionValue in sort', () => {
    const withAdjusted: ScoredPlayer[] = [
      makePlayer('rb-cheap', 'RB', 20, 10, 70), // adjusted=$70, beats raw $60
      makePlayer('rb-raw', 'RB', 60, 5),         // raw=$60, no adjusted
    ]
    const flex = buildFlexPlayers(withAdjusted)
    expect(flex[0].player.id).toBe('rb-cheap') // $70 adjusted wins
    expect(flex[1].player.id).toBe('rb-raw')
  })

  it('breaks value ties by consensusRank ASC', () => {
    const flex = buildFlexPlayers(scoredPlayers)
    const wr1Idx = flex.findIndex(sp => sp.player.id === 'wr1')
    const wr2Idx = flex.findIndex(sp => sp.player.id === 'wr2')
    // wr1 has rank 3, wr2 has rank 5 — wr1 should come first
    expect(wr1Idx).toBeLessThan(wr2Idx)
  })
})
