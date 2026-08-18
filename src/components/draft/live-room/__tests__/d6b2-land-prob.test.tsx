/**
 * d6b2-land-prob.test.tsx — D6b-2
 *
 * The on-block card renders the real Monte-Carlo land probability as a "LAND · NN%"
 * chip in The Read, next to the CONF chip, and hides it when there is no signal.
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { OnTheBlockCard } from '../on-the-block-card'
import type { Player } from '@/lib/players/types'
import type { WhatToDoAdvice } from '@/lib/draft/what-to-do'

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

describe('D6b-2 OnTheBlockCard - LAND probability chip', () => {
  it('renders LAND · NN% (rounded) when a probability is provided', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        confidence="high"
        landProbability={0.58}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('LAND · 58%')).toBeInTheDocument()
    // Sits alongside the CONF chip in The Read, not instead of it.
    expect(screen.getByText('CONF · HIGH')).toBeInTheDocument()
  })

  it('rounds to a whole percent', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        landProbability={0.333}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('LAND · 33%')).toBeInTheDocument()
  })

  it('shows 0% honestly when the player never lands (not hidden)', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        landProbability={0}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.getByText('LAND · 0%')).toBeInTheDocument()
  })

  it('hides the chip entirely when there is no signal (null/undefined)', () => {
    render(
      <OnTheBlockCard
        player={player}
        advice={makeAdvice()}
        landProbability={null}
        onChangePlayer={noop}
        onToggleTarget={noop}
        onToggleAvoid={noop}
      />,
    )
    expect(screen.queryByText(/LAND ·/)).not.toBeInTheDocument()
  })
})
