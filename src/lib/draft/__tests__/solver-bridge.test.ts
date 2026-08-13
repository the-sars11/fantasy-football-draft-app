/**
 * solver-bridge.test.ts — R5: live-state → solver mapping.
 *
 * Covers the one non-trivial piece (FLEX contention in buildSlotsRemaining) plus
 * board mapping, input assembly, the Joe-voice constraint copy, and the batch
 * max-bid map. Pure, $0.
 */

import { describe, it, expect } from 'vitest'
import type { Player } from '@/lib/players/types'
import type { RosterSlots } from '@/lib/supabase/database.types'
import {
  buildSlotsRemaining,
  buildBoardPlayers,
  buildSolverInput,
  describeRosterConstraint,
  computeRosterMaxBidMap,
  type FilledPick,
} from '../solver-bridge'
import { computeRosterConstrainedMaxBid, type BoardPlayer } from '../roster-solver'

// Joe's Nasties: qb1 rb1 wr1 te1 flex3 dst1 bench5 ir1, no kicker.
const NASTIES: RosterSlots = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1,
}

function pick(position: string): FilledPick {
  return { position }
}

// The bridge only reads id/name/position/expectedRoomPrice/consensusAuctionValue/ceilingValue.
function player(fields: Partial<Player> & { id: string; name: string; position: Player['position'] }): Player {
  return fields as unknown as Player
}

// ─── buildSlotsRemaining ─────────────────────────────────────────────────────

describe('buildSlotsRemaining', () => {
  it('with no picks: dedicated slots intact, bench folds in IR', () => {
    const r = buildSlotsRemaining(NASTIES, [])
    expect(r).toEqual({ qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 6 }) // 5 + 1 IR
  })

  it('fills dedicated slots first', () => {
    const r = buildSlotsRemaining(NASTIES, [pick('QB'), pick('RB'), pick('WR')])
    expect(r.qb).toBe(0)
    expect(r.rb).toBe(0)
    expect(r.wr).toBe(0)
    expect(r.flex).toBe(3) // untouched — dedicated absorbed all three
  })

  it('spills RB/WR/TE overflow into FLEX (contention)', () => {
    // 2 RB + 2 WR: 1 each fills dedicated rb/wr, the extra RB and WR spill to FLEX.
    const r = buildSlotsRemaining(NASTIES, [pick('RB'), pick('RB'), pick('WR'), pick('WR')])
    expect(r.rb).toBe(0)
    expect(r.wr).toBe(0)
    expect(r.flex).toBe(1) // 3 - 2 overflow
  })

  it('spills past FLEX onto the bench', () => {
    // 5 RBs: rb dedicated (1) + flex (3) + 1 bench.
    const r = buildSlotsRemaining(NASTIES, [pick('RB'), pick('RB'), pick('RB'), pick('RB'), pick('RB')])
    expect(r.rb).toBe(0)
    expect(r.flex).toBe(0)
    expect(r.bench).toBe(5) // 6 - 1
  })

  it('maps both DEF and DST pick strings to the dst slot', () => {
    expect(buildSlotsRemaining(NASTIES, [pick('DEF')]).dst).toBe(0)
    expect(buildSlotsRemaining(NASTIES, [pick('DST')]).dst).toBe(0)
  })

  it('preserves the slot-count invariant: remaining = totalSlots - picks', () => {
    const total = 1 + 1 + 1 + 1 + 3 + 1 + 5 + 1 // 14 (k=0)
    const picks = [pick('QB'), pick('RB'), pick('RB'), pick('WR'), pick('TE'), pick('DEF')]
    const r = buildSlotsRemaining(NASTIES, picks)
    const remaining = r.qb + r.rb + r.wr + r.te + r.flex + r.dst + r.bench
    expect(remaining).toBe(total - picks.length)
  })
})

// ─── buildBoardPlayers ───────────────────────────────────────────────────────

describe('buildBoardPlayers', () => {
  const players: Player[] = [
    player({ id: '1', name: 'Ja Marr Chase', position: 'WR', ceilingValue: 70, expectedRoomPrice: 62, consensusAuctionValue: 60 }),
    player({ id: '2', name: 'Some Kicker', position: 'K', consensusAuctionValue: 2 }),
    player({ id: '3', name: 'Drafted RB', position: 'RB', consensusAuctionValue: 40 }),
    player({ id: '4', name: 'Fallback Guy', position: 'TE', consensusAuctionValue: 8 }), // no ceiling/room
  ]
  const drafted = new Set(['drafted rb'])

  it('drops kickers and drafted players', () => {
    const board = buildBoardPlayers(players, drafted)
    expect(board.map(b => b.id)).toEqual(['1', '4'])
  })

  it('uses expectedRoomPrice/ceilingValue when present', () => {
    const chase = buildBoardPlayers(players, drafted).find(b => b.id === '1')!
    expect(chase.expectedCost).toBe(62)
    expect(chase.ceiling).toBe(70)
  })

  it('falls back to consensusAuctionValue when calibrated fields are absent', () => {
    const te = buildBoardPlayers(players, drafted).find(b => b.id === '4')!
    expect(te.expectedCost).toBe(8)
    expect(te.ceiling).toBe(8)
  })
})

// ─── buildSolverInput ────────────────────────────────────────────────────────

describe('buildSolverInput', () => {
  it('assembles a $1-flat-replacement solver input from live state', () => {
    const input = buildSolverInput({
      budgetRemaining: 150,
      rosterConfig: NASTIES,
      myPicks: [pick('QB')],
      players: [player({ id: '1', name: 'A', position: 'RB', consensusAuctionValue: 30 })],
      draftedNames: new Set(),
    })
    expect(input.budgetRemaining).toBe(150)
    expect(input.slotsRemaining.qb).toBe(0)
    expect(input.availablePlayers).toHaveLength(1)
    expect(input.replacementCosts).toEqual({ qb: 1, rb: 1, wr: 1, te: 1, dst: 1, bench: 1 })
    expect(input.minPerSlot).toBe(1)
  })
})

// ─── describeRosterConstraint ────────────────────────────────────────────────

describe('describeRosterConstraint', () => {
  const wr = (): BoardPlayer => ({ id: 'w', name: 'W', position: 'WR', expectedCost: 30, ceiling: 40 })

  it('reports no open slot for the BUG-007 case', () => {
    const advice = { maxBid: 1, feasible: false, completionCost: 0, explanation: '', bestRestOfRoster: [] }
    expect(describeRosterConstraint(advice, wr())).toBe('No open slot for WR on your roster.')
  })

  it('lists remaining slots in Joe voice with no dashes', () => {
    const advice = {
      maxBid: 24,
      feasible: true,
      completionCost: 50,
      explanation: '',
      bestRestOfRoster: [
        { slotType: 'QB' as const, player: null, assignedCost: 1 },
        { slotType: 'FLEX' as const, player: null, assignedCost: 1 },
        { slotType: 'FLEX' as const, player: null, assignedCost: 1 },
        { slotType: 'BENCH' as const, player: null, assignedCost: 1 },
        { slotType: 'BENCH' as const, player: null, assignedCost: 1 },
      ],
    }
    const note = describeRosterConstraint(advice, wr())
    expect(note).toBe('More than $24 and you cannot fill QB, 2 FLEX and 2 bench.')
    expect(note).not.toMatch(/[—–]/) // no em/en dashes
  })

  it('handles the last-slot case', () => {
    const advice = { maxBid: 90, feasible: true, completionCost: 0, explanation: '', bestRestOfRoster: [] }
    // feasible + empty rest = last slot (not the infeasible no-slot case).
    expect(describeRosterConstraint({ ...advice, feasible: true }, wr()))
      .toBe('This is your last roster slot. You can bid up to $90.')
  })
})

// ─── computeRosterMaxBidMap ──────────────────────────────────────────────────

describe('computeRosterMaxBidMap', () => {
  it('keys entries by lowercased name and matches the single-player solver', () => {
    const input = buildSolverInput({
      budgetRemaining: 200,
      rosterConfig: NASTIES,
      myPicks: [],
      players: [
        player({ id: '1', name: 'Ja Marr Chase', position: 'WR', ceilingValue: 70, expectedRoomPrice: 62 }),
        player({ id: '2', name: 'Bijan Robinson', position: 'RB', ceilingValue: 65, expectedRoomPrice: 58 }),
      ],
      draftedNames: new Set(),
    })
    const map = computeRosterMaxBidMap(input)
    expect(map.has('ja marr chase')).toBe(true)
    expect(map.has('bijan robinson')).toBe(true)

    const chaseBoard = input.availablePlayers.find(b => b.name === 'Ja Marr Chase')!
    const direct = computeRosterConstrainedMaxBid(chaseBoard, input)
    expect(map.get('ja marr chase')!.maxBid).toBe(direct.maxBid)
  })
})
