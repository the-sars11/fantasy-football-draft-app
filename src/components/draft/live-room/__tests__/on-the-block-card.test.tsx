import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OnTheBlockCard } from '../on-the-block-card'
import type { Player } from '@/lib/players/types'
import type { WhatToDoAdvice } from '@/lib/draft/what-to-do'
import type { RepricedPlayer } from '@/lib/draft/live-reprice'

function repriced(o: Partial<RepricedPlayer> = {}): RepricedPlayer {
  return {
    id: 'p1',
    room: 20,
    you: 24,
    pocket: 4,
    roomDelta: 0,
    youDelta: 0,
    isPocket: false,
    isTax: false,
    ...o,
  }
}

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

describe('OnTheBlockCard repriced You/Room glance (LB-4)', () => {
  it('shows the live repriced You over the room price with a hot arrow and pocket chip', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice(null)}
        repriced={repriced({ room: 20, you: 26, pocket: 6, roomDelta: 3, isPocket: true })}
        onChangePlayer={() => {}}
        onToggleTarget={() => {}}
        onToggleAvoid={() => {}}
      />
    )
    // You = the roster-need-adjusted target, room = the inflation-moved price.
    expect(screen.getByTestId('otb-you')).toHaveTextContent('$26')
    expect(screen.getByTestId('otb-room')).toHaveTextContent('room 20')
    // Room moved up (roomDelta > 0) => the hot amber up-arrow rides the room line.
    expect(screen.getByTestId('otb-room')).toHaveTextContent('▲')
    // A real value pocket shows the +$ chip; the static advisor cap is replaced.
    expect(screen.getByTestId('otb-pocket')).toHaveTextContent('+$6')
    expect(screen.queryByTestId('otb-max-bid')).not.toBeInTheDocument()
  })

  it('shows the tax chip and the soft down-arrow when the room has gone over Joe', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice(null)}
        repriced={repriced({ room: 30, you: 24, pocket: -6, roomDelta: -2, isTax: true })}
        onChangePlayer={() => {}}
        onToggleTarget={() => {}}
        onToggleAvoid={() => {}}
      />
    )
    expect(screen.getByTestId('otb-tax')).toBeInTheDocument()
    expect(screen.getByTestId('otb-room')).toHaveTextContent('▼')
    expect(screen.queryByTestId('otb-pocket')).not.toBeInTheDocument()
  })

  it('falls back to the static advisor cap when there is no live reprice', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice(null)}
        repriced={null}
        onChangePlayer={() => {}}
        onToggleTarget={() => {}}
        onToggleAvoid={() => {}}
      />
    )
    expect(screen.getByTestId('otb-max-bid')).toHaveTextContent('$24')
    expect(screen.queryByTestId('otb-repriced')).not.toBeInTheDocument()
  })
})
