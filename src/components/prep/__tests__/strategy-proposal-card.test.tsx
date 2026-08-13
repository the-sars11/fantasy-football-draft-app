/**
 * strategy-proposal-card.test.tsx - R6: proves the SOLVER-FIT target prices
 * actually reach the screen (the render path), since the live /prep/strategies
 * page needs Supabase auth + a Claude/preset run to reach this component and a
 * pixel screenshot is deferred.
 *
 * It renders the REAL StrategyProposalCard fed by the REAL assignTargetPrices
 * ($0 solver math, no mocks) and asserts the two done-when conditions are
 * visible in the DOM:
 *   1. The card shows target prices + the $1-per-slot reserve summing to a
 *      completable $200 roster ("Completes a full roster").
 *   2. Swapping the archetype's budget emphasis re-allocates the money on screen.
 */

import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StrategyProposalCard } from '../strategy-proposal-card'
import { assignTargetPrices } from '@/lib/research/strategy/target-pricing'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { ConsensusPlayer } from '@/lib/research/normalize'
import type { RosterSlots } from '@/lib/players/types'

// Joe's Nasties: QB1 RB1 WR1 TE1 FLEX3 DEF1 Bench5 = 13 draftable slots.
const NASTIES_SLOTS: RosterSlots = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, superflex: 0, k: 0, def: 1, bench: 5,
}
const BUDGET = 200

function makePlayer(
  overrides: Partial<ConsensusPlayer> & {
    name: string
    position: ConsensusPlayer['position']
    consensusAuctionValue: number
  }
): ConsensusPlayer {
  return {
    team: 'TST', byeWeek: 7, injuryStatus: null,
    sleeperId: null, espnId: null, fpId: null,
    consensusRank: 10, consensusTier: 3, adp: 10,
    sourceRanks: {}, sourceADP: {}, sourceAuctionValues: {},
    projections: { points: 200 },
    ecrStdDev: null, percentOwned: null, age: null, yearsExp: null,
    sources: ['fantasypros'],
    ...overrides,
  }
}

const POOL: ConsensusPlayer[] = [
  makePlayer({ name: 'Elite RB', position: 'RB', consensusAuctionValue: 60 }),
  makePlayer({ name: 'Elite WR', position: 'WR', consensusAuctionValue: 55 }),
  makePlayer({ name: 'Elite QB', position: 'QB', consensusAuctionValue: 40 }),
  makePlayer({ name: 'Elite TE', position: 'TE', consensusAuctionValue: 30 }),
]

function makeProposal(
  overrides: Partial<StrategyProposal> = {},
  pool: ConsensusPlayer[] = POOL,
): StrategyProposal {
  const base: StrategyProposal = {
    name: 'Stars and Scrubs',
    archetype: 'stars_and_scrubs',
    description: 'Spend big on a few studs, fill the rest for a dollar.',
    philosophy: 'Concentrate spend on elite ceiling.',
    risk_tolerance: 'aggressive',
    position_weights: { QB: 4, RB: 9, WR: 8, TE: 5 },
    key_targets: ['Elite RB', 'Elite WR', 'Elite QB', 'Elite TE'],
    key_avoids: [],
    reasoning: 'Elite talent wins your PPR league.',
    projected_ceiling: 88,
    projected_floor: 42,
    confidence: 'high',
    budget_allocation: { QB: 5, RB: 40, WR: 35, TE: 8, K: 1, DST: 1, bench: 10 },
    max_bid_percentage: 40,
  }
  const merged = { ...base, ...overrides }
  merged.target_pricing = assignTargetPrices({
    targetNames: merged.key_targets,
    budgetAllocation: merged.budget_allocation,
    maxBidPercentage: merged.max_bid_percentage,
    players: pool,
    rosterSlots: NASTIES_SLOTS,
    budget: BUDGET,
  })
  return merged
}

describe('StrategyProposalCard - R6 solver-fit prices reach the screen', () => {
  it('renders a summary proving the targets complete a full $200 roster', () => {
    const proposal = makeProposal()
    const { container } = render(<StrategyProposalCard proposal={proposal} format="auction" />)

    const pricing = proposal.target_pricing!
    // Invariant the card is displaying must itself hold.
    expect(pricing.total).toBe(pricing.targetTotal + pricing.reserve)
    expect(pricing.total).toBeLessThanOrEqual(BUDGET)
    expect(pricing.fits).toBe(true)

    // The completable-roster summary is on screen (text is split across spans,
    // so assert against the flattened textContent).
    const text = container.textContent ?? ''
    expect(text).toContain('Completes a full roster')
    expect(text).toContain(`$${pricing.targetTotal}`)
    expect(text).toContain(`to fill your other ${pricing.reserve} slots`)
    expect(text).toContain(`= $${pricing.total} of $${BUDGET}`)
  })

  it('renders a $price badge on each priced target', () => {
    const proposal = makeProposal()
    render(<StrategyProposalCard proposal={proposal} format="auction" />)
    for (const p of proposal.target_pricing!.prices) {
      // The name and its dollar amount both appear in the targets area.
      expect(screen.getByText(p.name)).toBeInTheDocument()
      expect(screen.getAllByText(`$${p.price}`).length).toBeGreaterThan(0)
    }
  })

  it('re-allocates money on screen when the archetype budget emphasis changes', () => {
    // Two equal-value targets; only the budget tilt differs. Kept inside the
    // unclipped emphasis band so the shift is visible rather than cap-pinned.
    const equalTargets = ['RB One', 'WR One']
    const equalPool: ConsensusPlayer[] = [
      makePlayer({ name: 'RB One', position: 'RB', consensusAuctionValue: 20 }),
      makePlayer({ name: 'WR One', position: 'WR', consensusAuctionValue: 20 }),
    ]
    const priceFor = (alloc: Record<string, number>, name: string) =>
      assignTargetPrices({
        targetNames: equalTargets, budgetAllocation: alloc,
        maxBidPercentage: 40, players: equalPool,
        rosterSlots: NASTIES_SLOTS, budget: BUDGET,
      }).prices.find((p) => p.name === name)!.price

    const RB_TILT = { QB: 8, RB: 24, WR: 12, TE: 8, K: 1, DST: 1, bench: 46 }
    const WR_TILT = { QB: 8, RB: 12, WR: 24, TE: 8, K: 1, DST: 1, bench: 46 }
    const rbOneUnderRbTilt = priceFor(RB_TILT, 'RB One')
    const rbOneUnderWrTilt = priceFor(WR_TILT, 'RB One')
    // Sanity: the tilt genuinely moves the money before we assert on the DOM.
    expect(rbOneUnderRbTilt).toBeGreaterThan(rbOneUnderWrTilt)

    // Locate RB One's own target badge (text is "RB One$<price>") so the
    // symmetric WR price on the same card can't be mistaken for it.
    const rbOneBadgeText = (c: HTMLElement) => {
      const badge = Array.from(c.querySelectorAll('.ffi-badge')).find((el) =>
        (el.textContent ?? '').startsWith('RB One')
      )
      return badge?.textContent ?? ''
    }

    const rbTiltCard = render(
      <StrategyProposalCard
        proposal={makeProposal({ key_targets: equalTargets, budget_allocation: RB_TILT }, equalPool)}
        format="auction"
      />
    )
    // The RB-tilt card shows RB One priced higher than under the WR tilt.
    expect(rbOneBadgeText(rbTiltCard.container)).toBe(`RB One$${rbOneUnderRbTilt}`)
    rbTiltCard.unmount()

    const wrTiltCard = render(
      <StrategyProposalCard
        proposal={makeProposal({ key_targets: equalTargets, budget_allocation: WR_TILT }, equalPool)}
        format="auction"
      />
    )
    expect(rbOneBadgeText(wrTiltCard.container)).toBe(`RB One$${rbOneUnderWrTilt}`)
  })
})
