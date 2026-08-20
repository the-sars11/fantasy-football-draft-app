/**
 * generate.ts — R9: Solver-enumerated anchor strategies.
 *
 * The OLD strategy engine (research.ts) picks archetypes FIRST (a fixed list of
 * 4-6) and then hangs players/prices off them. R9 inverts that: strategies
 * EMERGE from what the $200 board actually supports.
 *
 * Algorithm ("Solver-enumerated anchor strategies"):
 *   1. Price the real pool off Joe's room curve (league-calibration REALITY):
 *      ceiling = consensus auction value (genuine worth), expectedCost =
 *      expectedRoomPrice(pos, positional rank) so the money reflects what the
 *      room actually pays.
 *   2. Detect where the board has anchors (per-position value cliff). A position
 *      only "supports an anchor strategy" if a genuinely elite player sits above
 *      the pack. This is the BOARD GATE: no elite RB on the board -> no hero-RB
 *      option is ever offered; it pivots to wherever the cliff actually is.
 *   3. Fill anchor slots greedily under several BUDGET-SHAPE POLICIES, each
 *      respecting the solver's $1-per-slot completion invariant (the same
 *      "keep enough to finish the roster" math solveAllocation/target-pricing
 *      use). Each policy yields a concrete, completable roster shape.
 *   4. Derive the strategy FROM the solved shape (budget split, targets, weights,
 *      risk, archetype name) instead of hardcoding it, cite the real cliff +
 *      calibration HOT/COOL inflation, then attach solver-fit target prices (R6).
 *   5. Dedupe policies that converge to the same shape, so the count is whatever
 *      the board supports (not a fixed 4).
 *
 * Pure and $0 - no React, no network, no Claude. Deterministic.
 * Copy rule (Joe): plain English, NO em/en dashes in any surfaced string.
 */

import type { League } from '@/lib/players/types'
import type { ConsensusPlayer } from '@/lib/research/normalize'
import { expectedRoomPrice, positionalInflation } from '@/lib/draft/league-calibration'
import { assignTargetPrices } from './target-pricing'
import type { AuctionArchetype } from './presets'
import type {
  StrategyProposal,
  StrategyResearchInput,
  StrategyResearchResult,
} from './research'
import { proposalToInsert } from './research'

// ─── Priced board ─────────────────────────────────────────────────────────────

/** Positions the generator anchors on (K excluded: no-kicker league). */
type GenPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'DEF'

/** One pool player priced off the room curve, ready for anchor selection. */
export interface PricedBoardPlayer {
  id: string
  name: string
  position: GenPosition
  /** Genuine Nasties worth ($) — the "he CAN be" number. */
  ceiling: number
  /** What the room actually pays ($) — league-calibration REALITY. */
  expectedCost: number
  /** 1-indexed rank within the player's own position (drives the room curve). */
  posRank: number
}

/**
 * Remaining roster slots the anchor fill works against. Mirrors the solver's
 * SlotsRemaining but kept local so this module stays decoupled.
 */
export interface AnchorSlots {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  dst: number
  bench: number
}

const GEN_POSITIONS: GenPosition[] = ['QB', 'RB', 'WR', 'TE', 'DEF']

const POSITION_TO_SLOT: Record<GenPosition, keyof AnchorSlots> = {
  QB: 'qb', RB: 'rb', WR: 'wr', TE: 'te', DEF: 'dst',
}
const FLEX_ELIGIBLE = new Set<GenPosition>(['RB', 'WR', 'TE'])

function sumSlots(s: AnchorSlots): number {
  return s.qb + s.rb + s.wr + s.te + s.flex + s.dst + s.bench
}

/** True if `position` can still claim a slot (dedicated -> FLEX -> bench). */
function canClaim(position: GenPosition, slots: AnchorSlots): boolean {
  const dedicated = POSITION_TO_SLOT[position]
  if ((slots[dedicated] ?? 0) > 0) return true
  if (FLEX_ELIGIBLE.has(position) && slots.flex > 0) return true
  return slots.bench > 0
}

/** True if `position` can fill an open STARTER slot (dedicated or FLEX, not bench). */
function canClaimStarter(position: GenPosition, slots: AnchorSlots): boolean {
  const dedicated = POSITION_TO_SLOT[position]
  if ((slots[dedicated] ?? 0) > 0) return true
  return FLEX_ELIGIBLE.has(position) && slots.flex > 0
}

/** Claim the slot `position` fills (dedicated -> FLEX -> bench), or null if full. */
function claimSlot(position: GenPosition, slots: AnchorSlots): AnchorSlots | null {
  const dedicated = POSITION_TO_SLOT[position]
  if ((slots[dedicated] ?? 0) > 0) return { ...slots, [dedicated]: slots[dedicated] - 1 }
  if (FLEX_ELIGIBLE.has(position) && slots.flex > 0) return { ...slots, flex: slots.flex - 1 }
  if (slots.bench > 0) return { ...slots, bench: slots.bench - 1 }
  return null
}

// ─── Pool -> priced board ──────────────────────────────────────────────────────

/**
 * Map the consensus pool to priced board players. Positional rank comes from the
 * pool itself (sort each position by consensus rank), so expectedRoomPrice reads
 * "the RB5 / WR3 / TE1" off Joe's real room curve. Kickers are dropped.
 */
export function priceBoard(players: ConsensusPlayer[]): PricedBoardPlayer[] {
  const board: PricedBoardPlayer[] = []

  for (const pos of GEN_POSITIONS) {
    const atPos = players
      .filter((p) => p.position === pos)
      .sort((a, b) => a.consensusRank - b.consensusRank)

    atPos.forEach((p, i) => {
      const posRank = i + 1
      const ceiling = Math.max(1, Math.round(p.consensusAuctionValue ?? 1))
      const room = expectedRoomPrice(pos, posRank) ?? p.consensusAuctionValue ?? 1
      board.push({
        id: p.espnId != null ? `espn-${p.espnId}` : `${pos}-${p.name}`,
        name: p.name,
        position: pos,
        ceiling,
        expectedCost: Math.max(1, Math.round(room)),
        posRank,
      })
    })
  }

  return board
}

// ─── Cliff detection (the board gate) ──────────────────────────────────────────

/**
 * Per-position value cliff: the ceiling drop from the top anchor to the pack
 * below it (best minus the ~4th best). A steep cliff means the elite player is
 * genuinely scarce and worth anchoring; a flat position is fungible.
 */
function positionCliffs(board: PricedBoardPlayer[]): Record<GenPosition, number> {
  const cliffs = {} as Record<GenPosition, number>
  for (const pos of GEN_POSITIONS) {
    const ceilings = board
      .filter((p) => p.position === pos)
      .map((p) => p.ceiling)
      .sort((a, b) => b - a)
    if (ceilings.length === 0) {
      cliffs[pos] = 0
      continue
    }
    const packIdx = Math.min(3, ceilings.length - 1)
    cliffs[pos] = Math.max(0, ceilings[0] - ceilings[packIdx])
  }
  return cliffs
}

// ─── Budget-shape policies ─────────────────────────────────────────────────────

/** Budget context passed to a policy so it can pace spend across the roster. */
interface PolicyContext {
  budget: number
  maxAnchors: number
  spent: number
  /** Roster slots still open at this pick (dedicated + flex + bench remaining). */
  slots: AnchorSlots
}

/** Given the affordable candidates and what is already chosen, pick the next anchor. */
type Policy = {
  key: string
  select: (
    affordable: PricedBoardPlayer[],
    chosen: PricedBoardPlayer[],
    cliffs: Record<GenPosition, number>,
    maxCliff: number,
    ctx: PolicyContext,
  ) => PricedBoardPlayer | null
}

// Balanced policy: cap any single anchor at this share of the budget so no stud
// eats the room. 0.20 of $200 = $40, which excludes the ~$76 top studs and forces
// spend across mid-tier players -> a genuine even-dollar (balanced) roster.
const BALANCED_ANCHOR_CAP_FRACTION = 0.2

function bestBy(
  candidates: PricedBoardPlayer[],
  score: (p: PricedBoardPlayer) => number,
): PricedBoardPlayer | null {
  let best: PricedBoardPlayer | null = null
  let bestScore = -Infinity
  for (const p of candidates) {
    const s = score(p)
    // Tie-break on ceiling then name so the result is deterministic.
    if (
      s > bestScore ||
      (s === bestScore && best !== null && p.ceiling > best.ceiling)
    ) {
      best = p
      bestScore = s
    }
  }
  return best
}

const POLICIES: Policy[] = [
  // Ceiling-max: chase the highest absolute worth -> stars-and-scrubs.
  { key: 'ceiling', select: (aff) => bestBy(aff, (p) => p.ceiling) },
  // Value-per-pocket: biggest worth-over-room bargains -> value hunter (exploits COOL).
  { key: 'value', select: (aff) => bestBy(aff, (p) => p.ceiling - p.expectedCost) },
  // Scarcity-first: weight worth by the steepness of the position cliff ->
  // hero-RB / robust-RB emerges wherever the real cliff is.
  {
    key: 'scarcity',
    select: (aff, _chosen, cliffs, maxCliff) =>
      bestBy(aff, (p) => p.ceiling * (1 + (maxCliff > 0 ? cliffs[p.position] / maxCliff : 0))),
  },
  // Spread: prefer positions not yet anchored -> balanced, protected floor.
  {
    key: 'spread',
    select: (aff, chosen) => {
      const anchoredCount = (pos: GenPosition) => chosen.filter((c) => c.position === pos).length
      const minCount = Math.min(...aff.map((p) => anchoredCount(p.position)))
      const leastAnchored = aff.filter((p) => anchoredCount(p.position) === minCount)
      return bestBy(leastAnchored, (p) => p.ceiling)
    },
  },
  // Budget-balanced: cap each anchor near a share of the budget so no stud eats
  // the room, then spread the capped spend across the least-anchored positions.
  // This is the only policy that avoids front-loading the two priciest studs, so
  // it is the one that actually builds an even-dollar (balanced-auction) roster.
  {
    key: 'balanced',
    select: (aff, chosen, _cliffs, _maxCliff, ctx) => {
      const cap = ctx.budget * BALANCED_ANCHOR_CAP_FRACTION
      // Anchor into open STARTER slots only, so the budget builds a starting
      // lineup instead of paying up for a bench backup (e.g. a 2nd QB you can
      // never start). Bench fills at $1 replacement outside the anchor pass.
      const starters = aff.filter((p) => canClaimStarter(p.position, ctx.slots))
      const eligible = starters.length > 0 ? starters : aff
      const underCap = eligible.filter((p) => p.expectedCost <= cap)
      // If nothing sits under the cap (only studs left), fall back to the eligible
      // set so the roster still completes rather than stalling.
      const pool = underCap.length > 0 ? underCap : eligible
      const anchoredCount = (pos: GenPosition) => chosen.filter((c) => c.position === pos).length
      const minCount = Math.min(...pool.map((p) => anchoredCount(p.position)))
      const leastAnchored = pool.filter((p) => anchoredCount(p.position) === minCount)
      return bestBy(leastAnchored, (p) => p.ceiling)
    },
  },
]

// ─── Anchor fill ───────────────────────────────────────────────────────────────

interface AnchorPlan {
  policyKey: string
  chosen: PricedBoardPlayer[]
  /** Total expected spend on the anchors. */
  anchorSpend: number
}

/**
 * Fill anchor slots one at a time under a policy. Each pick must keep the roster
 * completable: after paying this anchor's expected cost, at least $1 must remain
 * for every roster slot not yet filled. This is the solver's completion
 * invariant applied inline, so every plan is guaranteed to fit `budget`.
 */
function fillPlan(
  board: PricedBoardPlayer[],
  initialSlots: AnchorSlots,
  budget: number,
  maxAnchors: number,
  cliffs: Record<GenPosition, number>,
  policy: Policy,
): AnchorPlan {
  const totalSlots = sumSlots(initialSlots)
  const maxCliff = Math.max(0, ...GEN_POSITIONS.map((p) => cliffs[p]))

  let slots = { ...initialSlots }
  const used = new Set<string>()
  const chosen: PricedBoardPlayer[] = []
  let spent = 0

  while (chosen.length < maxAnchors) {
    // Reserve $1 for every roster slot still empty AFTER this pick.
    const reserveRest = totalSlots - chosen.length - 1
    const affordable = board.filter(
      (p) =>
        !used.has(p.id) &&
        canClaim(p.position, slots) &&
        spent + p.expectedCost + reserveRest <= budget,
    )
    if (affordable.length === 0) break

    const pick = policy.select(affordable, chosen, cliffs, maxCliff, { budget, maxAnchors, spent, slots })
    if (!pick) break

    const nextSlots = claimSlot(pick.position, slots)
    if (nextSlots === null) break // defensive: canClaim already guaranteed a slot

    used.add(pick.id)
    slots = nextSlots
    spent += pick.expectedCost
    chosen.push(pick)
  }

  return { policyKey: policy.key, chosen, anchorSpend: spent }
}

// ─── Shape -> archetype classification ─────────────────────────────────────────

function spendByPosition(plan: AnchorPlan): Record<GenPosition, number> {
  const spend = { QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0 } as Record<GenPosition, number>
  for (const p of plan.chosen) spend[p.position] += p.expectedCost
  return spend
}

/**
 * Classify the SOLVED shape into one of the auction archetypes. This is read off
 * the roster the policy actually built, not chosen up front.
 */
function classifyArchetype(plan: AnchorPlan, budget: number): AuctionArchetype {
  const spend = spendByPosition(plan)
  const rbAnchors = plan.chosen.filter((p) => p.position === 'RB').length
  const wrAnchors = plan.chosen.filter((p) => p.position === 'WR').length

  const sorted = [...plan.chosen].sort((a, b) => b.expectedCost - a.expectedCost)
  const top2 = sorted.slice(0, 2).reduce((s, p) => s + p.expectedCost, 0)
  const top2Share = budget > 0 ? top2 / budget : 0

  // Two players eating more than half the budget is stars-and-scrubs, whatever
  // positions they are.
  if (top2Share >= 0.55) return 'stars-and-scrubs'
  // Skipped RB entirely with real WR/TE investment -> zero-RB.
  if (rbAnchors === 0 && (spend.WR + spend.TE) > 0) return 'zero-rb-auction'
  // WR-led and deep at WR.
  if (wrAnchors >= 3 && spend.WR >= spend.RB) return 'wr-heavy-auction'
  // Exactly one RB anchor with WR support -> hero-RB.
  if (rbAnchors === 1 && wrAnchors >= 2) return 'hero-rb-auction'
  // No position dominates -> balanced.
  const maxShare = Math.max(...GEN_POSITIONS.map((p) => (budget > 0 ? spend[p] / budget : 0)))
  if (maxShare <= 0.4) return 'balanced-auction'
  return 'studs-and-duds'
}

const ARCHETYPE_NAME: Record<AuctionArchetype, string> = {
  'stars-and-scrubs': 'Stars & Scrubs',
  'balanced-auction': 'Balanced Auction',
  'studs-and-duds': 'Studs & Duds',
  'zero-rb-auction': 'Zero RB (Auction)',
  'wr-heavy-auction': 'WR Heavy (Auction)',
  'hero-rb-auction': 'Hero RB (Auction)',
}

// ─── Shape -> StrategyProposal ─────────────────────────────────────────────────

function inflationPhrase(pos: GenPosition): string {
  const inf = positionalInflation(pos)
  if (!inf || inf.tag === 'NEUTRAL') return ''
  // inf.tag is narrowed to 'HOT' | 'COOL' here, which is exactly the label text.
  return `${pos} runs ${inf.tag} (${inf.multiplier.toFixed(2)}x room vs national)`
}

/** Percentages that sum to 100, derived from the solved anchor spend. */
function budgetAllocation(
  spend: Record<GenPosition, number>,
  anchorSpend: number,
  budget: number,
): Record<string, number> {
  const reserve = Math.max(0, budget - anchorSpend)
  const raw: Record<string, number> = {
    QB: (spend.QB / budget) * 100,
    RB: (spend.RB / budget) * 100,
    WR: (spend.WR / budget) * 100,
    TE: (spend.TE / budget) * 100,
    DST: (spend.DEF / budget) * 100,
    K: 0,
    bench: (reserve / budget) * 100,
  }
  // Round, then fix drift onto the bench bucket so the total is exactly 100.
  const rounded: Record<string, number> = {}
  let sum = 0
  for (const [k, v] of Object.entries(raw)) {
    rounded[k] = Math.round(v)
    sum += rounded[k]
  }
  rounded.bench += 100 - sum
  if (rounded.bench < 0) rounded.bench = 0
  return rounded
}

/** Position weights (1-10) scaled from anchor spend share. */
function positionWeights(spend: Record<GenPosition, number>): Record<string, number> {
  const core: GenPosition[] = ['QB', 'RB', 'WR', 'TE']
  const maxSpend = Math.max(1, ...core.map((p) => spend[p]))
  const weights: Record<string, number> = { K: 1, DEF: 2 }
  for (const pos of core) {
    const share = spend[pos] / maxSpend // 0..1
    weights[pos] = Math.max(1, Math.min(10, Math.round(4 + 6 * share)))
  }
  return weights
}

function planToProposal(
  plan: AnchorPlan,
  budget: number,
): StrategyProposal {
  const archetype = classifyArchetype(plan, budget)
  const spend = spendByPosition(plan)
  const sorted = [...plan.chosen].sort((a, b) => b.expectedCost - a.expectedCost)

  const top2Share = budget > 0
    ? sorted.slice(0, 2).reduce((s, p) => s + p.expectedCost, 0) / budget
    : 0
  const risk_tolerance: StrategyProposal['risk_tolerance'] =
    top2Share >= 0.5 ? 'aggressive' : top2Share <= 0.3 ? 'conservative' : 'balanced'

  const maxAnchorCost = sorted.length > 0 ? sorted[0].expectedCost : 0
  const max_bid_percentage = plan.chosen.length > 0
    ? Math.max(10, Math.min(70, Math.ceil((maxAnchorCost / budget) * 100)))
    : 25

  const key_targets = sorted.slice(0, 5).map((p) => p.name)

  // Anchored positions, richest first, for reasoning.
  const anchoredPositions = (['RB', 'WR', 'TE', 'QB', 'DEF'] as GenPosition[])
    .filter((p) => spend[p] > 0)
    .sort((a, b) => spend[b] - spend[a])

  const totalAnchorCeiling = plan.chosen.reduce((s, p) => s + p.ceiling, 0)
  const projected_ceiling = Math.max(
    55,
    Math.min(92, Math.round(58 + (totalAnchorCeiling / budget) * 18)),
  )
  const projected_floor = Math.max(
    38,
    Math.min(projected_ceiling - 6, Math.round(projected_ceiling - (top2Share >= 0.5 ? 24 : 14))),
  )

  const leadPos = anchoredPositions[0]
  const leadInflation = leadPos ? inflationPhrase(leadPos) : ''
  const anchorList = sorted.slice(0, 3).map((p) => `${p.name} (~$${p.expectedCost})`).join(', ')

  const reasoning = plan.chosen.length > 0
    ? `The board supports paying up for ${anchorList}. ${
        leadInflation ? leadInflation + '. ' : ''
      }This shape spends $${plan.anchorSpend} on anchors and keeps $${Math.max(0, budget - plan.anchorSpend)} to complete the roster at room prices.`
    : `The board has no clear anchor tier within budget. Spread evenly and buy value at room prices.`

  const philosophy = `Built from the live board: ${archetype
    .replace(/-auction$/, '')
    .replace(/-/g, ' ')} shape emerged as a completable $${budget} roster given the current pool.`

  return {
    name: ARCHETYPE_NAME[archetype],
    archetype,
    description: `Pool-generated ${ARCHETYPE_NAME[archetype]}: ${plan.chosen.length} anchor${
      plan.chosen.length === 1 ? '' : 's'
    } (${anchoredPositions.map((p) => (p === 'DEF' ? 'DEF' : p)).join('/') || 'value'}), rest at room price.`,
    philosophy,
    risk_tolerance,
    position_weights: positionWeights(spend),
    key_targets,
    key_avoids: [],
    reasoning,
    projected_ceiling,
    projected_floor,
    confidence: plan.chosen.length >= 3 ? 'high' : 'medium',
    budget_allocation: budgetAllocation(spend, plan.anchorSpend, budget),
    max_bid_percentage,
  }
}

// ─── Core generator ────────────────────────────────────────────────────────────

export interface AnchorGenInput {
  board: PricedBoardPlayer[]
  slots: AnchorSlots
  budget: number
}

/**
 * Generate distinct anchor strategies from a priced board + remaining slots +
 * budget. Runs every budget-shape policy, classifies each solved shape, and
 * dedupes archetypes (keeping the richer total-ceiling shape). Shared by the
 * prep generator and the live adaptive re-fit so both speak one engine.
 */
export function generateAnchorStrategies(input: AnchorGenInput): StrategyProposal[] {
  const { board, slots, budget } = input
  if (board.length === 0 || budget <= 0) return []

  const cliffs = positionCliffs(board)
  // Anchors only claim starter + FLEX slots; bench fills at $1 replacement.
  const maxAnchors = slots.qb + slots.rb + slots.wr + slots.te + slots.flex + slots.dst

  const byArchetype = new Map<string, { proposal: StrategyProposal; ceiling: number }>()

  for (const policy of POLICIES) {
    const plan = fillPlan(board, slots, budget, maxAnchors, cliffs, policy)
    if (plan.chosen.length === 0) continue
    const proposal = planToProposal(plan, budget)
    const totalCeiling = plan.chosen.reduce((s, p) => s + p.ceiling, 0)
    const existing = byArchetype.get(proposal.archetype)
    // Dedupe: keep the higher total-ceiling version of a converged shape.
    if (!existing || totalCeiling > existing.ceiling) {
      byArchetype.set(proposal.archetype, { proposal, ceiling: totalCeiling })
    }
  }

  return [...byArchetype.values()]
    .sort((a, b) => b.ceiling - a.ceiling)
    .map((v) => v.proposal)
}

// ─── Prep wrapper ──────────────────────────────────────────────────────────────

/** Full remaining slots from an app-level League roster config (K dropped). */
function leagueToAnchorSlots(league: League): AnchorSlots {
  const r = league.rosterSlots
  return {
    qb: r.qb ?? 0,
    rb: r.rb ?? 0,
    wr: r.wr ?? 0,
    te: r.te ?? 0,
    flex: r.flex ?? 0,
    dst: r.def ?? 0,
    bench: r.bench ?? 0,
  }
}

/**
 * R9 prep entry point: generate strategies from the real player pool + solver.
 * Returns the SAME StrategyResearchResult contract as proposeStrategies, so it
 * flows through proposalToInsert and the /strategies/propose route unchanged.
 * Auction only (the solver + room curve are auction concepts); snake pools
 * return empty (the AI path still owns snake).
 */
export function generateStrategiesFromPool(
  input: StrategyResearchInput,
): StrategyResearchResult {
  const { league, players, keeperNames = [] } = input

  if (league.format !== 'auction') return { proposals: [], inserts: [] }

  const available = keeperNames.length > 0
    ? players.filter((p) => !keeperNames.includes(p.name))
    : players

  const budget = league.budget ?? 200
  const board = priceBoard(available)
  const slots = leagueToAnchorSlots(league)

  const rawProposals = generateAnchorStrategies({ board, slots, budget })

  // Attach solver-fit target prices (R6) so each strategy's targets sum to a
  // completable $200 roster.
  const proposals = rawProposals.map((p) => ({
    ...p,
    target_pricing: assignTargetPrices({
      targetNames: p.key_targets,
      budgetAllocation: p.budget_allocation,
      maxBidPercentage: p.max_bid_percentage,
      players: available,
      rosterSlots: league.rosterSlots,
      budget,
    }),
  }))

  const inserts = proposals.map((p) => proposalToInsert(p, league.id, league.format, 'preset'))
  return { proposals, inserts }
}
