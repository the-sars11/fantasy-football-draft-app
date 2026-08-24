import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { InlinePlayersPanel, type DraftedRow } from '../inline-players-panel'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { RepricedPlayer } from '@/lib/draft/live-reprice'

/** Minimal Player fixture touching only what the Value Board row reads. */
function player(o: Partial<Player> = {}): Player {
  return {
    id: 'p1',
    name: 'Test Player',
    team: 'LAR',
    position: 'WR',
    consensusAuctionValue: 20,
    ...o,
  } as Player
}

/** Wrap a Player in a minimal ScoredPlayer. */
function scored(p: Player, combinedScore = 50): ScoredPlayer {
  return {
    player: p,
    strategyScore: combinedScore,
    intelScore: 0,
    combinedScore,
    targetStatus: 'neutral',
    isUserTarget: false,
    isUserAvoid: false,
    boosts: [],
    intelBoosts: [],
  }
}

function repriced(o: Partial<RepricedPlayer> & { id: string }): RepricedPlayer {
  return {
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

const noop = () => {}
const never = () => false

function renderBoard(available: ScoredPlayer[], repricedMap: Map<string, RepricedPlayer>) {
  return render(
    <InlinePlayersPanel
      available={available}
      maxBidMap={new Map()}
      repriced={repricedMap}
      isTarget={never}
      onToggleTarget={noop}
      onSelectPlayer={noop}
    />,
  )
}

describe('Value Board (InlinePlayersPanel)', () => {
  it('renders the You and Room prices from the repriced map', () => {
    const p = player({ id: 'a', name: 'Amon Ra', position: 'WR' })
    const map = new Map([['a', repriced({ id: 'a', room: 18, you: 27, pocket: 9, isPocket: true })]])
    renderBoard([scored(p)], map)
    expect(screen.getByText('$27')).toBeInTheDocument()
    expect(screen.getByText(/room 18/i)).toBeInTheDocument()
  })

  it('shows a +$ POCKET chip when the pocket is in Joe\'s favor', () => {
    const p = player({ id: 'a', name: 'Amon Ra' })
    const map = new Map([['a', repriced({ id: 'a', room: 16, you: 24, pocket: 8, isPocket: true })]])
    renderBoard([scored(p)], map)
    expect(screen.getByText('+$8')).toBeInTheDocument()
  })

  it('shows a tax chip when the room is at or over Joe\'s number', () => {
    const p = player({ id: 'a', name: 'Overpaid RB', position: 'RB' })
    const map = new Map([['a', repriced({ id: 'a', room: 52, you: 42, pocket: -10, isTax: true })]])
    renderBoard([scored(p)], map)
    expect(screen.getByText(/^tax$/i)).toBeInTheDocument()
  })

  it('splits injury truth: an OUT player wears the out pill', () => {
    const p = player({ id: 'a', name: 'Hurt Guy', injuryStatus: 'out' })
    renderBoard([scored(p)], new Map())
    expect(screen.getByText(/^out/i)).toBeInTheDocument()
  })

  it('silences "questionable" - it wears neither flag', () => {
    const p = player({ id: 'a', name: 'Maybe Guy', injuryStatus: 'questionable' })
    renderBoard([scored(p)], new Map())
    expect(screen.queryByText(/^out/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^fragile$/i)).not.toBeInTheDocument()
  })

  it('falls back to a bare value when a player has not been repriced yet', () => {
    const p = player({ id: 'a', name: 'Unpriced', consensusAuctionValue: 15 })
    renderBoard([scored(p)], new Map())
    expect(screen.getByText('$15')).toBeInTheDocument()
  })
})

/** A drafted-context row fixture (LB deferred: mine/gone interleaving). */
function drafted(o: Partial<DraftedRow> & { id: string }): DraftedRow {
  return {
    name: 'Drafted Guy',
    position: 'RB',
    team: 'KC',
    combinedScore: 40,
    price: 30,
    mine: false,
    ...o,
  }
}

function renderWithDrafted(available: ScoredPlayer[], draftedRows: DraftedRow[]) {
  return render(
    <InlinePlayersPanel
      available={available}
      maxBidMap={new Map()}
      repriced={new Map()}
      drafted={draftedRows}
      isTarget={never}
      onToggleTarget={noop}
      onSelectPlayer={noop}
    />,
  )
}

describe('Value Board mine/gone interleaving (LB deferred)', () => {
  it('weaves a gone player into the ladder with the gone tag and sale price', () => {
    const a = player({ id: 'a', name: 'Live One', position: 'WR' })
    const b = player({ id: 'b', name: 'Live Two', position: 'WR' })
    // Gone player ranks between the two live rows (score 40, between 60 and 20).
    const gone = drafted({ id: 'g', name: 'Gone Stud', combinedScore: 40, price: 55, mine: false })
    renderWithDrafted([scored(a, 60), scored(b, 20)], [gone])

    const row = screen.getByTestId('vb-gone-row')
    expect(row).toHaveTextContent('Gone Stud')
    expect(row).toHaveTextContent(/gone/i)
    expect(row).toHaveTextContent('$55')
    // Both live targets still render alongside the context row.
    expect(screen.getByText('Live One')).toBeInTheDocument()
    expect(screen.getByText('Live Two')).toBeInTheDocument()
  })

  it('marks a player Joe won with the mine tag, not gone', () => {
    const live = player({ id: 'a', name: 'Live One', position: 'RB' })
    const mine = drafted({ id: 'm', name: 'My Guy', combinedScore: 45, price: 42, mine: true })
    renderWithDrafted([scored(live, 60)], [mine])

    const row = screen.getByTestId('vb-mine-row')
    expect(row).toHaveTextContent('My Guy')
    expect(row).toHaveTextContent(/mine/i)
    expect(screen.queryByTestId('vb-gone-row')).not.toBeInTheDocument()
  })

  it('hides gone studs ranked above every live target until the full board opens', () => {
    const live = player({ id: 'a', name: 'Best Available', position: 'WR' })
    // Ranked far above the only live row -> excluded from the default window.
    const goneAbove = drafted({ id: 'g', name: 'Gone Above', combinedScore: 90 })
    renderWithDrafted([scored(live, 10)], [goneAbove])

    expect(screen.queryByText('Gone Above')).not.toBeInTheDocument()
    const toggle = screen.getByText('Show full board')
    fireEvent.click(toggle)
    expect(screen.getByText('Gone Above')).toBeInTheDocument()
  })

  it('keeps target ranks on live rows only, so a woven gone row does not bump the count', () => {
    const a = player({ id: 'a', name: 'Live A', position: 'WR' })
    const b = player({ id: 'b', name: 'Live B', position: 'WR' })
    const gone = drafted({ id: 'g', name: 'Between', combinedScore: 50, price: 77 })
    renderWithDrafted([scored(a, 60), scored(b, 40)], [gone])

    // Live A = rank 1, Live B = rank 2 (the gone row between them takes no number).
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })
})
