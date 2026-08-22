/**
 * sim-results-cards.test.tsx - D5: proves the SHIELD-styled sim results
 * components actually render real R10b data, and specifically covers
 * deriveWinningTeamLanded (the pure "winning teams only, not raw roster
 * frequency" derivation) since it is the one bit of new math in this file.
 */

import '@testing-library/jest-dom'
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import {
  deriveWinningTeamLanded,
  SimRecordHero,
  SimWinningTeamPlayers,
  SimRosterCarousel,
  SimRosterDetail,
  SimLandedTable,
  SimNarrative,
  SimCompareRows,
  SimSavedRunsList,
} from '../sim-results-cards'
import type { GradeSummary, ModalRoster, LandedPlayer } from '@/lib/draft/sim-grade'
import type { SimWonPlayer } from '@/lib/draft/sim-engine'

function makeGrade(overrides: Partial<GradeSummary> = {}): GradeSummary {
  return {
    runs: 30,
    games: 14,
    numManagers: 12,
    meanStarterPoints: 1850.4,
    meanRank: 3.2,
    meanWins: 8.4,
    meanLosses: 5.6,
    modalRecord: { wins: 9, losses: 5, frequencyPct: 36.7 },
    bestRecord: { wins: 12, losses: 2 },
    worstRecord: { wins: 5, losses: 9 },
    ...overrides,
  }
}

function wonPlayer(overrides: Partial<SimWonPlayer> & { id: string; name: string }): SimWonPlayer {
  return {
    position: 'RB',
    price: 40,
    ceiling: 45,
    projectedPoints: 260,
    ...overrides,
  }
}

function makeRoster(overrides: Partial<ModalRoster> = {}): ModalRoster {
  return {
    coreIds: ['p1'],
    coreNames: ['Bijan Robinson'],
    frequency: 9,
    frequencyPct: 30,
    representative: [wonPlayer({ id: 'p1', name: 'Bijan Robinson' })],
    avgSpent: 195,
    avgStarterPoints: 1900,
    avgWins: 9.5,
    ...overrides,
  } as ModalRoster
}

describe('deriveWinningTeamLanded', () => {
  it('only counts shapes whose avgWins meets the modal record (winning teams only)', () => {
    const grade = makeGrade({ modalRecord: { wins: 9, losses: 5, frequencyPct: 36.7 } })
    const winningShape = makeRoster({
      coreIds: ['a'],
      coreNames: ['Winner Guy'],
      frequencyPct: 40,
      avgWins: 10,
      representative: [wonPlayer({ id: 'a', name: 'Winner Guy', position: 'WR' })],
    })
    const losingShape = makeRoster({
      coreIds: ['b'],
      coreNames: ['Loser Guy'],
      frequencyPct: 60,
      avgWins: 4,
      representative: [wonPlayer({ id: 'b', name: 'Loser Guy', position: 'WR' })],
    })

    const result = deriveWinningTeamLanded([winningShape, losingShape], grade)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('a')
    expect(result[0].name).toBe('Winner Guy')
    // Only one qualifying shape at 100% of the (filtered) winning total.
    expect(result[0].sharePct).toBe(100)
  })

  it('weights multiple winning shapes by real frequencyPct and normalizes to 100', () => {
    const grade = makeGrade({ modalRecord: { wins: 8, losses: 6, frequencyPct: 30 } })
    const shapeA = makeRoster({
      coreIds: ['a'],
      coreNames: ['Player A'],
      frequencyPct: 30,
      avgWins: 9,
      representative: [wonPlayer({ id: 'a', name: 'Player A', position: 'RB' })],
    })
    const shapeB = makeRoster({
      coreIds: ['a', 'b'],
      coreNames: ['Player A', 'Player B'],
      frequencyPct: 10,
      avgWins: 8,
      representative: [
        wonPlayer({ id: 'a', name: 'Player A', position: 'RB' }),
        wonPlayer({ id: 'b', name: 'Player B', position: 'WR' }),
      ],
    })

    const result = deriveWinningTeamLanded([shapeA, shapeB], grade)
    const a = result.find((p) => p.id === 'a')
    const b = result.find((p) => p.id === 'b')

    expect(a).toBeDefined()
    expect(b).toBeDefined()
    // Player A appears in both winning shapes (30 + 10 of 40 total = 100%).
    expect(a!.sharePct).toBe(100)
    // Player B only in shapeB (10 of 40 total = 25%).
    expect(b!.sharePct).toBe(25)
    const shares = result.map((p) => p.sharePct)
    expect([...shares].sort((x, y) => y - x)).toEqual(shares)
  })

  it('returns an empty array when no shape meets the modal win threshold (never fabricates)', () => {
    const grade = makeGrade({ modalRecord: { wins: 11, losses: 3, frequencyPct: 20 } })
    const belowThreshold = makeRoster({ avgWins: 6, frequencyPct: 50 })

    expect(deriveWinningTeamLanded([belowThreshold], grade)).toEqual([])
    expect(deriveWinningTeamLanded([], grade)).toEqual([])
  })
})

describe('SimRecordHero', () => {
  it('renders the real modal record and stat line', () => {
    render(<SimRecordHero grade={makeGrade()} biasedPlayers={4} />)
    expect(screen.getByText('9-5')).toBeInTheDocument()
    expect(screen.getByText(/36\.7% of sims/)).toBeInTheDocument()
    expect(screen.getByText(/4 graded players/)).toBeInTheDocument()
  })
})

describe('SimWinningTeamPlayers', () => {
  it('renders derived winning-team players, not raw roster frequency', () => {
    const grade = makeGrade({ modalRecord: { wins: 9, losses: 5, frequencyPct: 36.7 } })
    const winning = makeRoster({
      coreIds: ['a'],
      coreNames: ['Justin Jefferson'],
      frequencyPct: 40,
      avgWins: 10,
      representative: [wonPlayer({ id: 'a', name: 'Justin Jefferson', position: 'WR' })],
    })
    render(<SimWinningTeamPlayers topRosters={[winning]} grade={grade} />)
    expect(screen.getByText('Justin Jefferson')).toBeInTheDocument()
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('renders nothing when no shape clears the win threshold', () => {
    const grade = makeGrade({ modalRecord: { wins: 12, losses: 2, frequencyPct: 10 } })
    const losing = makeRoster({ avgWins: 3 })
    const { container } = render(<SimWinningTeamPlayers topRosters={[losing]} grade={grade} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('SimRosterCarousel', () => {
  it('renders up to 5 sample rosters with real stud-core names', () => {
    const rosters = [
      makeRoster({ coreNames: ['Shape One Core'] }),
      makeRoster({ coreNames: ['Shape Two Core'] }),
    ]
    render(<SimRosterCarousel rosters={rosters} runs={30} />)
    const isCoreBadge = (text: string) => (_: string, el: Element | null) =>
      el?.tagName === 'SPAN' && el.textContent === text
    expect(screen.getByText(isCoreBadge('Shape One Core $40'))).toBeInTheDocument()
    expect(screen.getByText(isCoreBadge('Shape Two Core $40'))).toBeInTheDocument()
    expect(screen.getAllByText(/^Shape \d$/)).toHaveLength(2)
  })
})

describe('SimRosterDetail', () => {
  // A realistic 13-man build: studs at RB/WR, mid-tier fills, cheap bench, DEF.
  const fullRoster = makeRoster({
    coreIds: ['rb1', 'wr1'],
    coreNames: ['Jahmyr Gibbs', 'Justin Jefferson'],
    frequency: 12,
    frequencyPct: 40,
    avgSpent: 199,
    representative: [
      wonPlayer({ id: 'qb1', name: 'Josh Allen', position: 'QB', price: 6 }),
      wonPlayer({ id: 'rb1', name: 'Jahmyr Gibbs', position: 'RB', price: 62 }),
      wonPlayer({ id: 'rb2', name: 'James Cook', position: 'RB', price: 22 }),
      wonPlayer({ id: 'rb3', name: 'Tony Pollard', position: 'RB', price: 9 }),
      wonPlayer({ id: 'wr1', name: 'Justin Jefferson', position: 'WR', price: 58 }),
      wonPlayer({ id: 'wr2', name: 'DK Metcalf', position: 'WR', price: 18 }),
      wonPlayer({ id: 'wr3', name: 'Jaylen Waddle', position: 'WR', price: 11 }),
      wonPlayer({ id: 'wr4', name: 'Rome Odunze', position: 'WR', price: 4 }),
      wonPlayer({ id: 'te1', name: 'Trey McBride', position: 'TE', price: 5 }),
      wonPlayer({ id: 'rb4', name: 'Roschon Johnson', position: 'RB', price: 1 }),
      wonPlayer({ id: 'wr5', name: 'Jalen McMillan', position: 'WR', price: 1 }),
      wonPlayer({ id: 'te2', name: 'Cade Otton', position: 'TE', price: 1 }),
      wonPlayer({ id: 'def1', name: 'Broncos', position: 'DEF', price: 1 }),
    ],
  })

  it('renders all 13 slots with each dollar price (not just the stud core)', () => {
    render(<SimRosterDetail rosters={[fullRoster]} runs={30} />)
    // A mid-tier and a $1 bench player that the old core-only view never showed.
    expect(screen.getByText('James Cook')).toBeInTheDocument()
    expect(screen.getByText('Roschon Johnson')).toBeInTheDocument()
    expect(screen.getByText('Broncos')).toBeInTheDocument()
    expect(screen.getByText('$62')).toBeInTheDocument()
  })

  it('shows total spend of the $200 budget and money left', () => {
    render(<SimRosterDetail rosters={[fullRoster]} runs={30} />)
    // 6+62+22+9+58+18+11+4+5+1+1+1+1 = 199, so $1 left of the $200 budget.
    expect(screen.getByText('$199 of $200')).toBeInTheDocument()
    expect(screen.getByText(/\$1 left/)).toBeInTheDocument()
  })

  it('flips to another shape via the pill selector', () => {
    const other = makeRoster({
      frequency: 6,
      frequencyPct: 20,
      representative: [wonPlayer({ id: 'x', name: 'Breece Hall', position: 'RB', price: 70 })],
    })
    render(<SimRosterDetail rosters={[fullRoster, other]} runs={30} />)
    expect(screen.queryByText('Breece Hall')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Shape 2/ }))
    expect(screen.getByText('Breece Hall')).toBeInTheDocument()
  })

  it('renders nothing for an empty roster set', () => {
    const { container } = render(<SimRosterDetail rosters={[]} runs={30} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('SimLandedTable', () => {
  it('renders players you land most with real land-rate and price', () => {
    const landed: LandedPlayer[] = [
      { id: 'p1', name: 'CeeDee Lamb', position: 'WR', count: 24, landRate: 0.8, avgPrice: 55 },
    ]
    render(<SimLandedTable landed={landed} />)
    expect(screen.getByText('CeeDee Lamb')).toBeInTheDocument()
    expect(screen.getByText('80%')).toBeInTheDocument()
    expect(screen.getByText('$55')).toBeInTheDocument()
  })
})

describe('SimNarrative', () => {
  it('has zero em or en dashes in generated copy and expands on click', () => {
    const grade = makeGrade()
    const topRosters = [makeRoster()]
    const landed: LandedPlayer[] = [
      { id: 'p1', name: 'CeeDee Lamb', position: 'WR', count: 24, landRate: 0.8, avgPrice: 55 },
    ]
    render(<SimNarrative grade={grade} topRosters={topRosters} landed={landed} biasedPlayers={3} />)

    const toggle = screen.getByRole('button', { name: /What this run says/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    const text = document.body.textContent ?? ''
    expect(text).not.toMatch(/[–—]/)
  })
})

describe('SimCompareRows', () => {
  it('renders both runs real record values side by side', () => {
    const current = makeGrade({ modalRecord: { wins: 9, losses: 5, frequencyPct: 36.7 } })
    const other = makeGrade({ modalRecord: { wins: 7, losses: 7, frequencyPct: 22.1 } })
    render(<SimCompareRows current={current} currentLabel="This run" other={other} otherLabel="Old run" />)
    expect(screen.getByText('9-5')).toBeInTheDocument()
    expect(screen.getByText('7-7')).toBeInTheDocument()
  })
})

describe('SimSavedRunsList', () => {
  it('renders saved runs and fires onLoad with the real id', () => {
    let loadedId: string | null = null
    render(
      <SimSavedRunsList
        runs={[{ id: 'run-1', name: 'Sim 9-5', createdAt: '8/17/2026' }]}
        onLoad={(id) => { loadedId = id }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Load/ }))
    expect(loadedId).toBe('run-1')
  })

  it('renders nothing for an empty list', () => {
    const { container } = render(<SimSavedRunsList runs={[]} onLoad={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })
})
