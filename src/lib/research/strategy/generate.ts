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
import { durabilityPriceFactor } from '@/lib/draft/sim-grade'
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

// ─── Anchor-pattern sweep (best-available per pattern × budget split) ──────────

/**
 * A concrete drafting pattern: which positions the paid "studs" go to. The sweep
 * builds the best-available completable roster for each pattern at several budget
 * splits, so the sim can rank genuinely distinct strategies (RB-RB vs WR-WR vs
 * hero-RB vs zero-RB vs elite-QB vs elite-TE ...) instead of a few archetype
 * buckets. An empty studPositions list means no anchor at all: spread the whole
 * budget, i.e. a true balanced draft.
 */
export interface AnchorPattern {
  key: string
  label: string
  /** Ordered positions the paid studs must fill (best-available within each). */
  studPositions: GenPosition[]
}

/** Share of budget the paid studs may consume. Same pattern, different shape. */
interface BudgetSplit {
  key: string
  label: string
  fraction: number
}

/**
 * The pattern grid. Kept to real, distinct draft philosophies (not every
 * combinatorial permutation) so the leaderboard stays readable. Best-available
 * within each pattern means the solver takes the top-ceiling players that fit the
 * required positions and the budget split.
 */
export const SWEEP_PATTERNS: AnchorPattern[] = [
  { key: 'rb-rb', label: 'Robust RB (RB-RB)', studPositions: ['RB', 'RB'] },
  { key: 'wr-wr', label: 'WR-WR', studPositions: ['WR', 'WR'] },
  { key: 'rb-wr', label: 'RB-WR', studPositions: ['RB', 'WR'] },
  { key: 'wr-wr-wr', label: 'Triple WR', studPositions: ['WR', 'WR', 'WR'] },
  { key: 'rb-rb-wr', label: 'Double RB + WR', studPositions: ['RB', 'RB', 'WR'] },
  { key: 'hero-rb', label: 'Hero RB (RB + WR-WR)', studPositions: ['RB', 'WR', 'WR'] },
  { key: 'zero-rb', label: 'Zero RB (WR-WR-TE)', studPositions: ['WR', 'WR', 'TE'] },
  { key: 'elite-qb', label: 'Elite QB anchor', studPositions: ['QB', 'RB', 'WR'] },
  { key: 'elite-te', label: 'Elite TE anchor', studPositions: ['TE', 'WR', 'WR'] },
  { key: 'balanced', label: 'Balanced (no anchor)', studPositions: [] },
]

const SWEEP_SPLITS: BudgetSplit[] = [
  { key: 'heavy', label: 'heavy anchors', fraction: 0.72 },
  { key: 'even', label: 'even split', fraction: 0.55 },
  { key: 'light', label: 'light anchors', fraction: 0.42 },
]

// Field-phase per-pick cap: once the pattern's studs are bought, the rest of the
// roster fills cheap so the budget split holds and the shape stays true to type.
const SWEEP_FIELD_CAP_FRACTION = 0.08

/**
 * Field-phase pick: once the paid anchors are bought, complete the roster cheaply.
 * Cap each remaining pick at ~8% of budget and spread it onto the least-anchored
 * open starter slot (bench last), so the anchor spend stays the shape's signature.
 * Shared by the pattern sweep and the forced stud-combo fill.
 */
function selectField(
  affordable: PricedBoardPlayer[],
  chosen: PricedBoardPlayer[],
  budget: number,
  slots: AnchorSlots,
): PricedBoardPlayer | null {
  const fieldCap = Math.max(1, budget * SWEEP_FIELD_CAP_FRACTION)
  const starters = affordable.filter((p) => canClaimStarter(p.position, slots))
  const eligible = starters.length > 0 ? starters : affordable
  const underCap = eligible.filter((p) => p.expectedCost <= fieldCap)
  const pool = underCap.length > 0 ? underCap : eligible
  const anchoredCount = (pos: GenPosition) => chosen.filter((c) => c.position === pos).length
  const minCount = Math.min(...pool.map((p) => anchoredCount(p.position)))
  const leastAnchored = pool.filter((p) => anchoredCount(p.position) === minCount)
  return bestBy(leastAnchored, (p) => p.ceiling)
}

/**
 * Build a policy that buys this pattern's studs best-available (highest ceiling at
 * the required position, capped so total stud spend stays under studFraction of
 * the budget), then fills the rest of the roster cheaply. Reuses fillPlan's
 * completion invariant, so every result is a completable $budget roster.
 */
function patternPolicy(pattern: AnchorPattern, studFraction: number): Policy {
  const studCount = pattern.studPositions.length
  return {
    key: `${pattern.key}@${Math.round(studFraction * 100)}`,
    select: (aff, chosen, _cliffs, _maxCliff, ctx) => {
      // STUD PHASE: still owe a paid anchor for this pattern.
      if (chosen.length < studCount) {
        const wantPos = pattern.studPositions[chosen.length]
        const studBudget = ctx.budget * studFraction
        const roomForStud = studBudget - ctx.spent // spent is all-stud in this phase
        const atPos = aff.filter((p) => p.position === wantPos)
        // Prefer the exact position; fall back to any pattern position, then any
        // affordable, so a thin position never stalls the whole roster.
        const patternPool = aff.filter((p) => pattern.studPositions.includes(p.position))
        const base = atPos.length > 0 ? atPos : patternPool.length > 0 ? patternPool : aff
        // Under the split cap where possible (light splits buy cheaper studs at the
        // same positions); if only pricier studs remain, take them so it completes.
        const underCap = base.filter((p) => p.expectedCost <= roomForStud)
        const pool = underCap.length > 0 ? underCap : base
        return bestBy(pool, (p) => p.ceiling)
      }
      // FIELD PHASE: studs bought. Fill starters first, then bench, cheap + spread.
      return selectField(aff, chosen, ctx.budget, ctx.slots)
    },
  }
}

export interface AnchorSweepInput {
  board: PricedBoardPlayer[]
  slots: AnchorSlots
  budget: number
}

/**
 * Sweep the strategy SPACE: for every anchor pattern × budget split, solve the
 * best-available completable roster and turn it into a StrategyProposal. Dedupes
 * by the concrete roster (identical player sets collapse to one), so the output is
 * the set of genuinely distinct, sim-gradeable ways to draft this board - far more
 * than the handful of archetype buckets generateAnchorStrategies emits. Ordered by
 * total anchor ceiling (richest shape first). Pure, deterministic, $0.
 */
export function sweepAnchorStrategies(input: AnchorSweepInput): StrategyProposal[] {
  const { board, slots, budget } = input
  if (board.length === 0 || budget <= 0) return []

  const cliffs = positionCliffs(board)
  const maxAnchors = slots.qb + slots.rb + slots.wr + slots.te + slots.flex + slots.dst

  const seen = new Map<string, { proposal: StrategyProposal; ceiling: number }>()

  for (const pattern of SWEEP_PATTERNS) {
    // Balanced has no studs, so the split axis does nothing - run it once.
    const splits = pattern.studPositions.length === 0 ? [SWEEP_SPLITS[1]] : SWEEP_SPLITS
    for (const split of splits) {
      const policy = patternPolicy(pattern, split.fraction)
      const plan = fillPlan(board, slots, budget, maxAnchors, cliffs, policy)
      if (plan.chosen.length === 0) continue

      // Dedupe by the concrete roster: identical player sets collapse to the first
      // (pattern, split) that produced them, deterministically.
      const rosterKey = plan.chosen.map((p) => p.id).sort().join('|')
      if (seen.has(rosterKey)) continue

      const base = planToProposal(plan, budget)
      const splitTag = pattern.studPositions.length === 0 ? '' : `, ${split.label}`
      const proposal: StrategyProposal = {
        ...base,
        name: `${pattern.label}${splitTag}`,
        philosophy: `Pattern sweep: ${pattern.label}${splitTag}. ${base.philosophy}`,
      }
      const totalCeiling = plan.chosen.reduce((s, p) => s + p.ceiling, 0)
      seen.set(rosterKey, { proposal, ceiling: totalCeiling })
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.ceiling - a.ceiling)
    .map((v) => v.proposal)
}

// ─── Specific stud combos (which exact players to target) ──────────────────────

/**
 * Fill a completable roster where a SPECIFIC ordered set of anchor players is
 * forced into the paid core, then the rest fills cheap + spread (same field logic
 * the pattern sweep uses). Returns null if any forced anchor can't be placed under
 * the $1-per-open-slot completion invariant, i.e. the concrete combo can't complete
 * a $budget roster. This is what turns "RB-WR" into "Bijan + Chase".
 */
function fillForcedPlan(
  board: PricedBoardPlayer[],
  initialSlots: AnchorSlots,
  budget: number,
  maxAnchors: number,
  forced: PricedBoardPlayer[],
): AnchorPlan | null {
  const totalSlots = sumSlots(initialSlots)
  let slots = { ...initialSlots }
  const used = new Set<string>()
  const chosen: PricedBoardPlayer[] = []
  let spent = 0

  // 1) Place the forced anchors, each honoring the completion invariant.
  for (const anchor of forced) {
    if (used.has(anchor.id)) return null
    const reserveRest = totalSlots - chosen.length - 1
    if (!canClaim(anchor.position, slots)) return null
    if (spent + anchor.expectedCost + reserveRest > budget) return null // can't complete
    const next = claimSlot(anchor.position, slots)
    if (next === null) return null
    used.add(anchor.id)
    slots = next
    spent += anchor.expectedCost
    chosen.push(anchor)
  }

  // 2) Fill the rest cheap + spread, exactly like the pattern sweep's field phase.
  while (chosen.length < maxAnchors) {
    const reserveRest = totalSlots - chosen.length - 1
    const affordable = board.filter(
      (p) =>
        !used.has(p.id) &&
        canClaim(p.position, slots) &&
        spent + p.expectedCost + reserveRest <= budget,
    )
    if (affordable.length === 0) break
    const pick = selectField(affordable, chosen, budget, slots)
    if (!pick) break
    const next = claimSlot(pick.position, slots)
    if (next === null) break
    used.add(pick.id)
    slots = next
    spent += pick.expectedCost
    chosen.push(pick)
  }

  return { policyKey: 'forced', chosen, anchorSpend: spent }
}

/** Top-K players at one position by ceiling (the genuine studs to enumerate). */
function topAtPosition(
  board: PricedBoardPlayer[],
  pos: GenPosition,
  k: number,
): PricedBoardPlayer[] {
  return board
    .filter((p) => p.position === pos)
    .sort((a, b) => b.ceiling - a.ceiling)
    .slice(0, k)
}

/**
 * Every distinct set of specific players that fills a pattern's required stud
 * positions, drawing top-K candidates per position. Players must be distinct and
 * each set is deduped order-independently, so ['WR','WR'] yields unordered WR pairs
 * (Chase+Jefferson once, not twice).
 */
function studComboSets(
  board: PricedBoardPlayer[],
  studPositions: GenPosition[],
  k: number,
): PricedBoardPlayer[][] {
  const pools = studPositions.map((pos) => topAtPosition(board, pos, k))
  const results: PricedBoardPlayer[][] = []
  const seen = new Set<string>()

  const recurse = (i: number, acc: PricedBoardPlayer[], usedIds: Set<string>): void => {
    if (i === pools.length) {
      const key = acc.map((p) => p.id).sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        results.push([...acc])
      }
      return
    }
    for (const cand of pools[i]) {
      if (usedIds.has(cand.id)) continue
      usedIds.add(cand.id)
      acc.push(cand)
      recurse(i + 1, acc, usedIds)
      acc.pop()
      usedIds.delete(cand.id)
    }
  }

  recurse(0, [], new Set())
  return results
}

export interface StudComboInput {
  board: PricedBoardPlayer[]
  slots: AnchorSlots
  budget: number
  /** Candidate studs per required position (default 4). */
  topKPerPosition?: number
  /** Keep the best N completable combos per pattern by anchor ceiling (default 3). */
  combosPerPattern?: number
}

/** One concrete stud combo: named players + the completable roster they anchor. */
export interface StudCombo {
  patternKey: string
  patternLabel: string
  anchorNames: string[]
  proposal: StrategyProposal
}

/**
 * The specific-combos tier: within each anchor pattern, enumerate CONCRETE stud
 * sets (Chase+Bijan vs Jefferson+Gibbs vs ...), keep the top completable ones by
 * anchor ceiling, and name each by its actual players. Where the pattern sweep says
 * "RB-WR wins," this says WHICH RB-WR pair to target. Every combo is a completable
 * $budget roster (fillForcedPlan enforces the invariant), deduped by concrete
 * roster across patterns. Pure, deterministic, $0. Balanced (no studs) is skipped -
 * there is nothing specific to enumerate.
 */
export function enumerateStudCombos(input: StudComboInput): StudCombo[] {
  const { board, slots, budget } = input
  const k = input.topKPerPosition ?? 4
  const perPattern = input.combosPerPattern ?? 3
  if (board.length === 0 || budget <= 0) return []

  const maxAnchors = slots.qb + slots.rb + slots.wr + slots.te + slots.flex + slots.dst
  const out: StudCombo[] = []
  const globalRosters = new Set<string>()

  for (const pattern of SWEEP_PATTERNS) {
    if (pattern.studPositions.length === 0) continue // nothing specific to enumerate

    const built: { combo: StudCombo; ceiling: number; rosterKey: string }[] = []
    const patternRosters = new Set<string>()

    for (const studs of studComboSets(board, pattern.studPositions, k)) {
      const plan = fillForcedPlan(board, slots, budget, maxAnchors, studs)
      if (!plan || plan.chosen.length === 0) continue

      const rosterKey = plan.chosen.map((p) => p.id).sort().join('|')
      if (patternRosters.has(rosterKey) || globalRosters.has(rosterKey)) continue
      patternRosters.add(rosterKey)

      const base = planToProposal(plan, budget)
      const anchorNames = studs.map((p) => p.name)
      const proposal: StrategyProposal = {
        ...base,
        name: `${anchorNames.join(' + ')} (${pattern.label})`,
        philosophy: `Stud combo, ${pattern.label}: pay up for ${anchorNames.join(
          ' + ',
        )}, fill the rest at room price. ${base.philosophy}`,
      }
      const ceiling = studs.reduce((s, p) => s + p.ceiling, 0)
      built.push({
        combo: { patternKey: pattern.key, patternLabel: pattern.label, anchorNames, proposal },
        ceiling,
        rosterKey,
      })
    }

    built.sort((a, b) => b.ceiling - a.ceiling)
    for (const b of built.slice(0, perPattern)) {
      globalRosters.add(b.rosterKey)
      out.push(b.combo)
    }
  }

  return out
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
  return attachTargetPricingAndInserts(rawProposals, league, available, board, budget)
}

/**
 * Shared tail for both the archetype generator and the pattern sweep: attach
 * solver-fit target prices (R6) so each strategy's targets sum to a completable
 * $budget roster, then build one insert row per proposal.
 *
 * Room price is the single source of truth from priceBoard (expectedCost =
 * expectedRoomPrice(pos, posRank)). We feed THAT into target-pricing instead of
 * relying on the input player objects to carry `expectedRoomPrice`. The headless
 * path passes real Player[] (which do carry it), but the live /strategies/propose
 * route passes ConsensusPlayer[] (which do NOT), so deriving room price here keeps
 * both paths room-anchored and consistent.
 */
function attachTargetPricingAndInserts(
  rawProposals: StrategyProposal[],
  league: League,
  available: ConsensusPlayer[],
  board: PricedBoardPlayer[],
  budget: number,
): StrategyResearchResult {
  const roomByName = new Map(board.map((b) => [b.name.toLowerCase(), b.expectedCost]))
  const pricedPlayers = available.map((p) => ({
    name: p.name,
    position: p.position,
    expectedRoomPrice: roomByName.get(p.name.toLowerCase()) ?? null,
    consensusAuctionValue: p.consensusAuctionValue ?? null,
    // Injury haircut off the measured risk model (1 = no discount when the
    // player has no Sleeper id / no measured durability). Joins on Sleeper id.
    durabilityFactor: durabilityPriceFactor(p.sleeperId, p.position),
  }))

  const proposals = rawProposals.map((p) => ({
    ...p,
    target_pricing: assignTargetPrices({
      targetNames: p.key_targets,
      budgetAllocation: p.budget_allocation,
      maxBidPercentage: p.max_bid_percentage,
      players: pricedPlayers,
      rosterSlots: league.rosterSlots,
      budget,
    }),
  }))

  const inserts = proposals.map((p) => proposalToInsert(p, league.id, league.format, 'preset'))
  return { proposals, inserts }
}

/**
 * Prep entry point for the FULL strategy sweep: instead of the handful of
 * archetype buckets generateStrategiesFromPool emits, this solves the
 * best-available completable roster for every anchor pattern (RB-RB, WR-WR,
 * RB-WR, hero-RB, zero-RB, elite-QB, elite-TE, ...) crossed with several budget
 * splits, dedupes identical rosters, and attaches solver-fit target prices. Same
 * StrategyResearchResult contract, so it flows through the sim + report unchanged.
 * Auction only; snake pools return empty (the AI path still owns snake).
 */
export function sweepStrategiesFromPool(
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

  const rawProposals = sweepAnchorStrategies({ board, slots, budget })
  return attachTargetPricingAndInserts(rawProposals, league, available, board, budget)
}

/**
 * Prep entry point for the SPECIFIC stud-combos tier: within each anchor pattern,
 * name the exact stud sets to target (Chase+Bijan vs Jefferson+Gibbs ...) instead
 * of only the shape. Returns the StudCombo list (pattern-tagged, named) with each
 * proposal carrying solver-fit target prices, plus the same StrategyResearchResult
 * insert contract so it flows through the sim + report unchanged. Auction only.
 */
export function combosFromPool(
  input: StrategyResearchInput,
  opts: { topKPerPosition?: number; combosPerPattern?: number } = {},
): { combos: StudCombo[]; result: StrategyResearchResult } {
  const { league, players, keeperNames = [] } = input
  if (league.format !== 'auction') return { combos: [], result: { proposals: [], inserts: [] } }

  const available = keeperNames.length > 0
    ? players.filter((p) => !keeperNames.includes(p.name))
    : players

  const budget = league.budget ?? 200
  const board = priceBoard(available)
  const slots = leagueToAnchorSlots(league)

  const combos = enumerateStudCombos({
    board,
    slots,
    budget,
    topKPerPosition: opts.topKPerPosition,
    combosPerPattern: opts.combosPerPattern,
  })
  const result = attachTargetPricingAndInserts(
    combos.map((c) => c.proposal),
    league,
    available,
    board,
    budget,
  )
  // attachTargetPricingAndInserts preserves order, so result.proposals[i] is the
  // priced version of combos[i]. Re-seat it so combo names/patterns stay aligned.
  const priced = combos.map((c, i) => ({ ...c, proposal: result.proposals[i] }))
  return { combos: priced, result }
}
