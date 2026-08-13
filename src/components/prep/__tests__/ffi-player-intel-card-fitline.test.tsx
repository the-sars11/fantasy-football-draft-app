/**
 * ffi-player-intel-card-fitline.test.tsx — R7b
 *
 * Proves the solver-driven fitLine prop reaches the DOM on the
 * FFIPlayerIntelCard. The live /prep/players page needs Supabase auth; this
 * test bypasses that by rendering the card directly with real solver output.
 *
 * Done-when conditions asserted:
 *   1. A fitLine string renders on screen verbatim.
 *   2. "Your target" prefix appears when isTarget=true.
 *   3. "Flagged to avoid" prefix appears when isAvoid=true.
 *   4. fitLine is absent when the prop is not provided.
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FFIPlayerIntelCard } from '../ffi-player-intel-card'
import { buildPrepFitLine } from '@/lib/players/prep-fit-line'
import { computeRosterConstrainedMaxBid } from '@/lib/draft/roster-solver'
import type { Player } from '@/lib/players/types'
import type { BoardPlayer, SolverInput } from '@/lib/draft/roster-solver'

// Minimal player fixture — only the fields the card actually reads.
const GIBBS: Player = {
  id: 'gibbs-1',
  name: 'Jahmyr Gibbs',
  team: 'DET',
  position: 'RB',
  byeWeek: 9,
  consensusRank: 3,
  consensusAuctionValue: 73,
  consensusTier: 1,
  adp: 3.2,
  sourceData: [],
  projections: { points: 280 },
  ceilingValue: 80,
  expectedRoomPrice: 68,
  valueGap: 12,
  expertTier: 1,
}

// Nasties full board with one other player so the solver has something to fill slots with.
const OTHER_PLAYER: BoardPlayer = {
  id: 'other-1', name: 'Other Player', position: 'QB', expectedCost: 15, ceiling: 20,
}

const GIBBS_BOARD: BoardPlayer = {
  id: GIBBS.id, name: GIBBS.name, position: 'RB',
  expectedCost: Math.max(1, Math.round(GIBBS.expectedRoomPrice ?? GIBBS.consensusAuctionValue)),
  ceiling: Math.max(1, Math.round(GIBBS.ceilingValue ?? GIBBS.consensusAuctionValue)),
}

const SOLVER_INPUT: SolverInput = {
  budgetRemaining: 200,
  slotsRemaining: { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5 },
  availablePlayers: [GIBBS_BOARD, OTHER_PLAYER],
  replacementCosts: { qb: 1, rb: 1, wr: 1, te: 1, dst: 1, bench: 1 },
  minPerSlot: 1,
}

const solverResult = computeRosterConstrainedMaxBid(GIBBS_BOARD, SOLVER_INPUT)

function renderCard(props: {
  isTarget?: boolean
  isAvoid?: boolean
  fitLine?: string
}) {
  return render(
    <FFIPlayerIntelCard
      rank={3}
      player={GIBBS}
      tags={[]}
      isTarget={props.isTarget ?? false}
      isAvoid={props.isAvoid ?? false}
      fitLine={props.fitLine}
    />,
  )
}

describe('FFIPlayerIntelCard fitLine (R7b)', () => {
  it('renders the fitLine text on screen', () => {
    const line = buildPrepFitLine('RB', solverResult, false, false)
    renderCard({ fitLine: line })
    expect(screen.getByText(line)).toBeInTheDocument()
  })

  it('renders a target fitLine with "Your target" prefix', () => {
    const line = buildPrepFitLine('RB', solverResult, true, false)
    renderCard({ isTarget: true, fitLine: line })
    expect(screen.getByText(line)).toBeInTheDocument()
    expect(line).toMatch(/Your target/)
  })

  it('renders an avoid fitLine with "Flagged to avoid" prefix', () => {
    const line = buildPrepFitLine('RB', solverResult, false, true)
    renderCard({ isAvoid: true, fitLine: line })
    expect(screen.getByText(line)).toBeInTheDocument()
    expect(line).toMatch(/Flagged to avoid/)
  })

  it('does not render a fit strip when fitLine is not provided', () => {
    renderCard({})
    // The diamond marker only appears when fitLine is present
    expect(screen.queryByText(/Can bid up to|Your target|Flagged to avoid/)).not.toBeInTheDocument()
  })

  it('solver produces a positive maxBid from a $200 full board', () => {
    expect(solverResult.maxBid).toBeGreaterThan(0)
    expect(solverResult.maxBid).toBeLessThanOrEqual(200)
  })
})
