import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OnTheBlockCard } from '../on-the-block-card'
import { StatusBar } from '../status-bar'
import { StrategyStrip } from '../strategy-strip'
import type { Player } from '@/lib/players/types'
import type { WhatToDoAdvice } from '@/lib/draft/what-to-do'

// Minimal Player fixture touching only what D6b-1 UI reads.
const player = {
  id: 'p1',
  name: 'Kyren Williams',
  team: 'LAR',
  position: 'RB',
  byeWeek: 6,
  consensusRank: 18,
  consensusAuctionValue: 38,
  consensusTier: 2,
  ecrPositionRank: 6,
  adp: 18,
} as Player

function makeAdvice(overrides: Partial<WhatToDoAdvice> = {}): WhatToDoAdvice {
  return {
    move: 'BID',
    moveColor: 'volt',
    cap: 'go up to $34',
    capValue: 34,
    rationale: 'Strong fit. Bid up to your cap.',
    range: { low: 26, high: 34 },
    marketEst: 38,
    isTarget: true,
    isAvoid: false,
    tierLabel: 'TIER 2',
    scarcityNote: '1 T2 RB left',
    rosterNote: null,
    ...overrides,
  }
}

const noop = () => {}

// ── OnTheBlockCard ──────────────────────────────────────────────────────────

describe('D6b-1 OnTheBlockCard - collapsed summary (gap #2)', () => {
  it('shows player name in the summary row when collapsed by default', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    // Default state is collapsed=false (expanded), so name appears in body.
    // The collapsed summary row always renders — verify the position chip.
    expect(screen.getByText('RB')).toBeInTheDocument()
    // Player name visible in expanded body (ob-name div).
    expect(screen.getAllByText('Kyren Williams').length).toBeGreaterThan(0)
  })

  it('renders target price ($XX tgt) in the summary row', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    // $34 appears in multiple places (summary chip, market band, cap line) — at least once is enough.
    expect(screen.getAllByText('$34').length).toBeGreaterThan(0)
    // 'tgt' only appears in the summary row target chip.
    expect(screen.getByText('tgt')).toBeInTheDocument()
  })

  it('hides target price chip when capValue is null', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice({ capValue: null })}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.queryByText('tgt')).not.toBeInTheDocument()
  })
})

describe('D6b-1 OnTheBlockCard - headshot + positional rank (gap #5)', () => {
  it('renders positional rank in meta line (e.g. RB6)', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    // "LAR · RB6 · TIER 2 · BYE 6"
    const meta = screen.getByText(/RB6/)
    expect(meta).toBeInTheDocument()
  })

  it('omits positional rank from meta when ecrPositionRank is undefined', () => {
    const playerNoRank = { ...player, ecrPositionRank: undefined } as Player
    render(
      <OnTheBlockCard
        player={playerNoRank}
        advice={makeAdvice()}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.queryByText(/RB\d+/)).not.toBeInTheDocument()
  })
})

describe('D6b-1 OnTheBlockCard - CONF chip (confidence wiring)', () => {
  it('renders CONF chip with HIGH when confidence prop is "high"', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        confidence="high"
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('CONF · HIGH')).toBeInTheDocument()
  })

  it('renders CONF chip with LOW when confidence prop is "low"', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        confidence="low"
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('CONF · LOW')).toBeInTheDocument()
  })

  it('omits CONF chip when confidence prop is not passed', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.queryByText(/CONF ·/)).not.toBeInTheDocument()
  })
})

describe('D6b-1 OnTheBlockCard - market band (gap #1)', () => {
  it('renders "Your target price" label when marketEst and capValue present', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice({ marketEst: 38, capValue: 34 })}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('Your target price')).toBeInTheDocument()
  })

  it('renders market band legend labels', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice({ marketEst: 38, capValue: 34 })}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('Market range')).toBeInTheDocument()
    expect(screen.getByText('Your target')).toBeInTheDocument()
  })

  it('omits market band when both marketEst and capValue are null', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice({ marketEst: null, capValue: null })}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.queryByText('Your target price')).not.toBeInTheDocument()
  })
})

describe('D6b-1 OnTheBlockCard - The Read label (replaces What to do)', () => {
  it('renders "The Read" section label', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('The Read')).toBeInTheDocument()
  })

  it('still renders rationale text inside The Read', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice({ rationale: 'Bid up to your cap.' })}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('Bid up to your cap.')).toBeInTheDocument()
  })

  it('still renders the roster-completion note (R5 regression)', () => {
    const note = 'More than $24 and you cannot fill QB, 2 FLEX and 2 bench.'
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice({ rosterNote: note })}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText(note)).toBeInTheDocument()
    expect(screen.getByText('Roster')).toBeInTheDocument()
  })
})

// ── StatusBar ───────────────────────────────────────────────────────────────

describe('D6b-1 StatusBar - round/pick (gap #4)', () => {
  it('renders R3 · PICK 27 when round=3 and pick=27 are passed', () => {
    render(<StatusBar leagueName="Nasties" online={true} onLeave={noop} round={3} pick={27} />)
    expect(screen.getByText('R3 · PICK 27')).toBeInTheDocument()
  })

  it('omits the round/pick line when props are not passed', () => {
    render(<StatusBar leagueName="Nasties" online={true} onLeave={noop} />)
    expect(screen.queryByText(/R\d+ · PICK/)).not.toBeInTheDocument()
  })

  it('always renders LIVE indicator when online', () => {
    render(<StatusBar leagueName="Nasties" online={true} onLeave={noop} round={1} pick={1} />)
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })
})

// ── StrategyStrip ───────────────────────────────────────────────────────────

const strats = [
  { id: 's1', name: 'Hero RB', league_id: 'l1' },
  { id: 's2', name: 'Balanced', league_id: 'l1' },
  { id: 's3', name: 'Zero RB', league_id: 'l1' },
] as Parameters<typeof StrategyStrip>[0]['strategies']

describe('D6b-1 StrategyStrip - ranked label (gap #3)', () => {
  it('shows ranked label for the active strategy', () => {
    render(
      <StrategyStrip
        activeStrategy={strats[0]}
        strategies={strats}
        onSelect={noop}
        pivot=""
      />,
    )
    // Active strategy should show "Hero RB - #1"
    expect(screen.getByText('Hero RB - #1')).toBeInTheDocument()
  })

  it('shows "ranked from your research" in the label', () => {
    render(
      <StrategyStrip
        activeStrategy={strats[0]}
        strategies={strats}
        onSelect={noop}
        pivot=""
      />,
    )
    expect(
      screen.getByText('Strategy · ranked from your research'),
    ).toBeInTheDocument()
  })
})
