import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { InlinePlayersPanel } from '../inline-players-panel'
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
