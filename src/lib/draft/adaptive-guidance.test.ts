/**
 * adaptive-guidance.test.ts — R9 Part 2: proves the live adaptive re-fit.
 *
 * The point of the task is that guidance RECALCULATES off live draft state:
 *   - snake is not applicable (auction-only engine),
 *   - a fresh auction recommends a completable shape,
 *   - as the elite RB tier drains, the run detector flags it, the pivot line
 *     says Joe is behind it, and the re-fit stops recommending drafted RBs.
 */

import { describe, it, expect } from 'vitest'
import {
  computeAdaptiveGuidance,
  detectPositionRuns,
  priceLiveBoard,
} from './adaptive-guidance'
import { createInitialState, applyPick, type DraftState, type DraftPick } from './state'
import type { Player } from '@/lib/players/types'
import type { RosterSlots } from '@/lib/supabase/database.types'

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ROSTER: RosterSlots = { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 0 }

function mkPlayer(
  name: string,
  position: Player['position'],
  rank: number,
  value: number,
): Player {
  return {
    id: name,
    name,
    team: 'TST',
    position,
    byeWeek: 7,
    consensusRank: rank,
    consensusAuctionValue: value,
    consensusTier: 2,
    adp: rank,
    ceilingValue: value + 5,
    expectedRoomPrice: Math.max(1, value - 3),
    projectedPoints: 150,
    sourceData: [],
    projections: { points: 150 },
  }
}

/** 7 RBs (6 elite tier + depth), 6 WRs, 3 TE, 3 QB, 2 DEF. */
function pool(): Player[] {
  return [
    mkPlayer('RB One', 'RB', 1, 62),
    mkPlayer('RB Two', 'RB', 3, 55),
    mkPlayer('RB Three', 'RB', 6, 48),
    mkPlayer('RB Four', 'RB', 9, 40),
    mkPlayer('RB Five', 'RB', 13, 33),
    mkPlayer('RB Six', 'RB', 18, 28),
    mkPlayer('RB Depth', 'RB', 40, 8),
    mkPlayer('WR One', 'WR', 2, 60),
    mkPlayer('WR Two', 'WR', 4, 54),
    mkPlayer('WR Three', 'WR', 7, 45),
    mkPlayer('WR Four', 'WR', 11, 36),
    mkPlayer('WR Five', 'WR', 16, 24),
    mkPlayer('WR Six', 'WR', 30, 10),
    mkPlayer('TE One', 'TE', 8, 34),
    mkPlayer('TE Two', 'TE', 20, 14),
    mkPlayer('TE Three', 'TE', 45, 4),
    mkPlayer('QB One', 'QB', 10, 26),
    mkPlayer('QB Two', 'QB', 25, 12),
    mkPlayer('QB Three', 'QB', 50, 4),
    mkPlayer('DEF One', 'DEF', 90, 5),
    mkPlayer('DEF Two', 'DEF', 95, 3),
  ]
}

function freshAuction(): DraftState {
  return createInitialState(
    'auction',
    [
      { name: 'Joe', budget: 200 },
      { name: 'Rival1', budget: 200 },
      { name: 'Rival2', budget: 200 },
      { name: 'Rival3', budget: 200 },
    ],
    ROSTER,
  )
}

/** Apply a rival buy to state and return the new state. */
function rivalBuys(state: DraftState, player: Player, manager: string, price: number): DraftState {
  const pick: DraftPick = {
    pick_number: state.picks.length + 1,
    player_name: player.name,
    position: player.position,
    manager,
    price,
  }
  return applyPick(state, pick)
}

// ── Applicability ────────────────────────────────────────────────────────────

describe('computeAdaptiveGuidance - applicability', () => {
  it('is not applicable for snake drafts', () => {
    const snake = createInitialState('snake', [{ name: 'Joe', draft_position: 1 }], ROSTER)
    const g = computeAdaptiveGuidance(snake, 'Joe', pool())
    expect(g.applicable).toBe(false)
    expect(g.recommended).toBeNull()
  })

  it('is applicable but empty for an unknown manager', () => {
    const g = computeAdaptiveGuidance(freshAuction(), 'Nobody', pool())
    expect(g.applicable).toBe(true)
    expect(g.recommended).toBeNull()
    expect(g.budgetRemaining).toBe(0)
  })
})

// ── Fresh auction: recommends a completable shape ────────────────────────────

describe('computeAdaptiveGuidance - fresh auction', () => {
  it('recommends a shape with full budget and all starter needs open', () => {
    const g = computeAdaptiveGuidance(freshAuction(), 'Joe', pool())
    expect(g.applicable).toBe(true)
    expect(g.budgetRemaining).toBe(200)
    expect(g.recommended).not.toBeNull()
    expect(g.recommended!.key_targets.length).toBeGreaterThan(0)
    // No picks yet -> no runs.
    expect(g.runs).toEqual([])
    // Every starter position is still needed.
    expect(g.openNeeds.RB).toBe(1)
    expect(g.openNeeds.WR).toBe(1)
    expect(g.openNeeds.QB).toBe(1)
  })

  it('reflects Joe’s own spend in budgetRemaining', () => {
    let state = freshAuction()
    state = applyPick(state, {
      pick_number: 1,
      player_name: 'WR One',
      position: 'WR',
      manager: 'Joe',
      price: 55,
    })
    const g = computeAdaptiveGuidance(state, 'Joe', pool())
    expect(g.budgetRemaining).toBe(145)
  })
})

// ── Run detection ────────────────────────────────────────────────────────────

describe('detectPositionRuns', () => {
  it('does not flag a run before the tier drains past threshold', () => {
    let state = freshAuction()
    const players = pool()
    // Only 2 of the top-6 RBs gone (< 60% threshold).
    state = rivalBuys(state, players[0], 'Rival1', 60)
    state = rivalBuys(state, players[1], 'Rival2', 52)
    const mgr = state.managers['Joe']
    const runs = detectPositionRuns(state, mgr, players, new Set(state.picks.map((p) => p.player_name.toLowerCase())))
    expect(runs.find((r) => r.position === 'RB')).toBeUndefined()
  })

  it('flags a HOT RB run when 5 of the top 6 are gone and Joe still needs RB', () => {
    let state = freshAuction()
    const players = pool()
    // Rivals take the top 5 RBs.
    for (let i = 0; i < 5; i++) {
      state = rivalBuys(state, players[i], `Rival${(i % 3) + 1}`, 40)
    }
    const mgr = state.managers['Joe']
    const drafted = new Set(state.picks.map((p) => p.player_name.toLowerCase()))
    const runs = detectPositionRuns(state, mgr, players, drafted)
    const rbRun = runs.find((r) => r.position === 'RB')
    expect(rbRun).toBeDefined()
    expect(rbRun!.tierDrafted).toBe(5)
    expect(rbRun!.affectsMe).toBe(true)
    expect(rbRun!.severity).toBe('hot')
  })
})

// ── The re-fit: guidance changes as anchors drain ────────────────────────────

describe('computeAdaptiveGuidance - adaptive re-fit', () => {
  it('stops recommending drafted RBs and changes the shape after an RB run', () => {
    const players = pool()
    const before = computeAdaptiveGuidance(freshAuction(), 'Joe', players)

    // Drain the top 5 RBs to rivals, then recompute for Joe.
    let state = freshAuction()
    const draftedRbNames: string[] = []
    for (let i = 0; i < 5; i++) {
      state = rivalBuys(state, players[i], `Rival${(i % 3) + 1}`, 40)
      draftedRbNames.push(players[i].name)
    }
    const after = computeAdaptiveGuidance(state, 'Joe', players)

    // The recommendation recalculated: its targets no longer include any RB
    // that was drafted away.
    expect(after.recommended).not.toBeNull()
    for (const drafted of draftedRbNames) {
      expect(after.recommended!.key_targets).not.toContain(drafted)
    }

    // The shape actually moved (targets differ from the pre-run recommendation).
    const beforeTargets = before.recommended!.key_targets.join('|')
    const afterTargets = after.recommended!.key_targets.join('|')
    expect(afterTargets).not.toBe(beforeTargets)
  })

  it('tells Joe he is behind the RB run in the pivot line', () => {
    const players = pool()
    let state = freshAuction()
    for (let i = 0; i < 5; i++) {
      state = rivalBuys(state, players[i], `Rival${(i % 3) + 1}`, 40)
    }
    const g = computeAdaptiveGuidance(state, 'Joe', players)
    expect(g.pivot.toLowerCase()).toContain('behind')
    expect(g.pivot).toContain('RB')
    // No em/en dashes in surfaced copy (Joe's rule).
    expect(g.pivot).not.toMatch(/[—–]/)
  })

  it('prices the live board without any drafted player', () => {
    const players = pool()
    const drafted = new Set(['rb one', 'wr one'])
    const board = priceLiveBoard(players, drafted)
    const names = board.map((p) => p.name.toLowerCase())
    expect(names).not.toContain('rb one')
    expect(names).not.toContain('wr one')
    // Kickers are never on the board (no-kicker league); DEF still is.
    expect(board.some((p) => p.position === 'DEF')).toBe(true)
  })
})
