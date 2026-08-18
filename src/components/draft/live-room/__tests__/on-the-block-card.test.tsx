import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OnTheBlockCard } from '../on-the-block-card'
import type { Player } from '@/lib/players/types'
import type { WhatToDoAdvice } from '@/lib/draft/what-to-do'

// The card only reads player.name/position/team/byeWeek. A partial cast keeps
// the fixture honest to what the component actually touches (sourceData and
// projections are required on Player but never referenced here).
const player = {
  id: 'p1',
  name: 'Bijan Robinson',
  team: 'ATL',
  position: 'RB',
  byeWeek: 12,
  consensusRank: 1,
  consensusAuctionValue: 60,
  consensusTier: 1,
  adp: 1.2,
} as Player

function makeAdvice(rosterNote: string | null): WhatToDoAdvice {
  return {
    move: 'BID',
    moveColor: 'volt',
    cap: 'go up to $24',
    capValue: 24,
    rationale: 'Fair value at the top of tier one.',
    range: { low: 18, high: 24 },
    marketEst: 22,
    isTarget: false,
    isAvoid: false,
    tierLabel: 'TIER 1',
    scarcityNote: '',
    rosterNote,
  }
}

describe('OnTheBlockCard roster note (R5 RV-1)', () => {
  it('renders the plain-English roster-completion note verbatim when present', () => {
    const note = 'More than $24 and you cannot fill QB, 2 FLEX and 2 bench.'
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice(note)}
        onChangePlayer={() => {}}
        onToggleTarget={() => {}}
        onToggleAvoid={() => {}}
      />
    )
    // The plain-English constraint is on the card, exactly as the solver produced it.
    expect(screen.getByText(note)).toBeInTheDocument()
    // Labeled so Joe knows the line is a roster-completion cap, not wallet math.
    expect(screen.getByText('Roster')).toBeInTheDocument()
  })

  it('omits the roster-note block entirely when rosterNote is null', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice(null)}
        onChangePlayer={() => {}}
        onToggleTarget={() => {}}
        onToggleAvoid={() => {}}
      />
    )
    expect(screen.queryByText('Roster')).not.toBeInTheDocument()
  })
})
