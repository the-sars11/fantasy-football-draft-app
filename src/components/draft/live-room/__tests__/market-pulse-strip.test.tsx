import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MarketPulseStrip } from '../market-pulse-strip'
import type { Position } from '@/lib/players/types'
import type { PositionInflation } from '@/lib/draft/market-inflation'

/** Build a full inflation map; only the given positions carry sales. */
function inflation(
  overrides: Partial<Record<Position, { multiplier: number; soldCount: number }>> = {},
): Record<Position, PositionInflation> {
  const out = {} as Record<Position, PositionInflation>
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const) {
    const o = overrides[pos]
    out[pos] = {
      multiplier: o?.multiplier ?? 1,
      rawMultiplier: o?.multiplier ?? 1,
      soldCount: o?.soldCount ?? 0,
      actualSpent: 0,
      baselineSpent: 0,
    }
  }
  return out
}

describe('MarketPulseStrip', () => {
  it('shows a quiet read before anything has cleared', () => {
    render(<MarketPulseStrip inflation={inflation()} />)
    expect(screen.getByText(/Nothing has cleared yet/i)).toBeInTheDocument()
    // Every chip reads "quiet" with no sales.
    expect(screen.getByTestId('pulse-RB')).toHaveTextContent(/quiet/i)
  })

  it('marks a position hot when the room overpays past the threshold', () => {
    render(<MarketPulseStrip inflation={inflation({ RB: { multiplier: 1.2, soldCount: 3 } })} />)
    const rb = screen.getByTestId('pulse-RB')
    expect(rb).toHaveTextContent('+20%')
    expect(rb).toHaveTextContent('▲')
  })

  it('marks a position soft when the room lets it go cheap', () => {
    render(<MarketPulseStrip inflation={inflation({ WR: { multiplier: 0.85, soldCount: 4 } })} />)
    const wr = screen.getByTestId('pulse-WR')
    expect(wr).toHaveTextContent('-15%')
    expect(wr).toHaveTextContent('▼')
  })

  it('reads flat inside the threshold band even with sales', () => {
    render(<MarketPulseStrip inflation={inflation({ TE: { multiplier: 1.03, soldCount: 2 } })} />)
    expect(screen.getByTestId('pulse-TE')).toHaveTextContent(/flat/i)
  })

  it('names both the hot and the cheap position when the room is split', () => {
    render(
      <MarketPulseStrip
        inflation={inflation({
          RB: { multiplier: 1.25, soldCount: 3 },
          WR: { multiplier: 0.82, soldCount: 3 },
        })}
      />,
    )
    expect(screen.getByText(/overpaying RB/i)).toBeInTheDocument()
    expect(screen.getByText(/WR go cheap/i)).toBeInTheDocument()
    expect(screen.getByText(/Push your dollars to WR value now/i)).toBeInTheDocument()
  })
})
