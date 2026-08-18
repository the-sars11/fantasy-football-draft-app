/**
 * roster-solver.ts — R4 Team-Construction Engine
 *
 * Pure solver: given budget, remaining slots, and the available board, computes
 * (a) the best-fill allocation (highest-ceiling player per slot) and (b) for any
 * nominated player, the max Joe can bid while still affording the best possible
 * rest-of-roster at expected prices.
 *
 * Algorithm: greedy best-fill by ceiling DESC — dedicated starters in scarcity
 * order (QB→TE→RB→WR→DST), then FLEX from the combined RB/WR/TE pool, then bench
 * at $1 replacement cost. Fast (O(slots × pool)), explainable, correct for 13-slot
 * Nasties rosters. Escalate to bounded knapsack only if tests reveal mis-allocation.
 *
 * No React. No Supabase. No I/O. Deterministic.
 */

// ─── Input types ──────────────────────────────────────────────────────────────

/** One undrafted player on the available board. */
export interface BoardPlayer {
  id: string
  name: string
  position: 'QB' | 'RB' | 'WR' | 'TE' | 'DEF'
  /** Expected auction cost — expectedRoomPrice ?? consensusAuctionValue */
  expectedCost: number
  /** Genuine Nasties worth — ceilingValue ?? consensusAuctionValue */
  ceiling: number
  /**
   * Projected full-PPR season points (ESPN proj_points). Optional: the solver
   * ignores it entirely. Carried through the sim so R10b grading can score a
   * roster on real projected points, not the $-ceiling proxy.
   */
  projectedPoints?: number
}

/**
 * Remaining unfilled slots for Joe's roster. Keys match the DB RosterSlots type
 * so callers can pass DraftState.roster_slots directly minus Joe's filled slots.
 * `bench` should include any IR slots (both fill at replacement cost).
 */
export interface SlotsRemaining {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  dst: number
  bench: number
  k?: number        // typically 0 for Nasties; ignored by solver
  ir?: number       // fold into bench before calling — or pass separately; ignored here
}

/**
 * Fallback cost when the board has no player for a slot.
 * In practice: $1–2 per starter position, $1 for bench.
 */
export interface ReplacementCosts {
  qb: number
  rb: number
  wr: number
  te: number
  dst: number
  bench: number
}

/**
 * DEC-1 (BIAS): one graded lean on a player, keyed by player id in SolverBias.
 * Structurally identical to sim-engine.ts's SimBiasEntry/SimMyBias (kept as a
 * separate type here, not imported, so roster-solver.ts stays free of any
 * sim-layer dependency). A value built by buildMyBiasFromTags (sim-results.ts)
 * satisfies this shape directly, no cast needed.
 */
export interface SolverBiasEntry {
  kind: 'target' | 'avoid'
  weight?: number
  severity?: 'soft' | 'hard'
}
export type SolverBias = Record<string, SolverBiasEntry>

export interface SolverInput {
  /** Joe's current remaining budget (before paying for any nominated player). */
  budgetRemaining: number
  slotsRemaining: SlotsRemaining
  /** Undrafted players only; the solver does not mutate this array. */
  availablePlayers: BoardPlayer[]
  replacementCosts: ReplacementCosts
  /** Minimum per-slot bid floor (default 1). */
  minPerSlot?: number
  /**
   * DEC-1 (BIAS): Joe's graded targets/avoids, keyed by player id. Affects
   * which players the best-fill allocation prefers (selection priority only);
   * expectedCost / completionCost money math is never adjusted by bias.
   */
  bias?: SolverBias
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface SlotAssignment {
  slotType: 'QB' | 'RB' | 'WR' | 'TE' | 'DST' | 'FLEX' | 'BENCH'
  /** null = using a $1 replacement-level filler */
  player: BoardPlayer | null
  assignedCost: number
}

export interface SolverResult {
  /** true when completionCost <= budgetRemaining */
  feasible: boolean
  /** Expected total cost of the best-fill roster for all remaining slots. */
  completionCost: number
  assignments: SlotAssignment[]
}

export interface RosterConstrainedMaxBid {
  /** Max Joe can bid for the nominated player while still affording the rest. */
  maxBid: number
  /** false when even a $1 bid leaves the roster uncomplete-able within budget. */
  feasible: boolean
  /** Expected cost of the best rest-of-roster (excluding the nominated player). */
  completionCost: number
  /** Plain English: "Need QB + 2×FLEX + 4×BENCH (~$47) → max $53" */
  explanation: string
  bestRestOfRoster: SlotAssignment[]
}

// ─── Internal constants ────────────────────────────────────────────────────────

type DedicatedSlot = 'qb' | 'rb' | 'wr' | 'te' | 'dst'

const POSITION_TO_DEDICATED: Record<BoardPlayer['position'], DedicatedSlot> = {
  QB: 'qb',
  RB: 'rb',
  WR: 'wr',
  TE: 'te',
  DEF: 'dst',
}

const DEDICATED_TO_POSITION: Record<DedicatedSlot, BoardPlayer['position']> = {
  qb: 'QB',
  rb: 'RB',
  wr: 'WR',
  te: 'TE',
  dst: 'DEF',
}

const DEDICATED_TO_LABEL: Record<DedicatedSlot, SlotAssignment['slotType']> = {
  qb: 'QB',
  rb: 'RB',
  wr: 'WR',
  te: 'TE',
  dst: 'DST',
}

// Fill dedicated slots in scarcity order: QB and TE first (smallest positional pools),
// then RB/WR (deeper), then DST. Order within dedicated slots does not affect cost;
// it only determines which specific players land in starter vs FLEX slots.
const DEDICATED_ORDER: DedicatedSlot[] = ['qb', 'te', 'rb', 'wr', 'dst']

const FLEX_ELIGIBLE = new Set<BoardPlayer['position']>(['RB', 'WR', 'TE'])

// ─── DEC-1 bias helpers ────────────────────────────────────────────────────────

/** Max ceiling lift for a weight-10 target: +35% over generic ceiling worth. */
const TARGET_MAX_BOOST = 0.35
/** Soft-avoid ceiling multiplier: still eligible, but deprioritized in fill order. */
const SOFT_AVOID_FACTOR = 0.5

/**
 * Bias-adjusted ceiling used ONLY to decide selection priority (bucket / FLEX
 * pool sort + which player wins an affordable slot). Returns null for a
 * hard-avoid player, meaning: exclude from the best-fill allocation entirely
 * (never assigned, never nominated as part of the rest-of-roster). Money math
 * (expectedCost / completionCost) always uses the player's real expectedCost,
 * never this adjusted number.
 */
function biasedCeiling(player: BoardPlayer, bias: SolverBias | undefined): number | null {
  const entry = bias?.[player.id]
  if (!entry) return player.ceiling
  if (entry.kind === 'avoid') {
    if (entry.severity === 'hard') return null
    return player.ceiling * SOFT_AVOID_FACTOR
  }
  const w = Math.min(10, Math.max(1, entry.weight ?? 5))
  return player.ceiling * (1 + TARGET_MAX_BOOST * (w / 10))
}

// ─── Core: best-fill allocation ───────────────────────────────────────────────

/**
 * Compute the best-fill allocation for all remaining slots.
 * Picks the highest-ceiling available player for each slot in priority order,
 * falling back to replacementCosts when the board is dry at a position.
 */
export function solveAllocation(input: SolverInput): SolverResult {
  const { slotsRemaining, availablePlayers, replacementCosts, budgetRemaining, bias } = input
  const minPerSlot = input.minPerSlot ?? 1

  // Total remaining slots to fill — drives the affordability guard below.
  const totalSlots =
    (slotsRemaining.qb ?? 0) +
    (slotsRemaining.rb ?? 0) +
    (slotsRemaining.wr ?? 0) +
    (slotsRemaining.te ?? 0) +
    (slotsRemaining.flex ?? 0) +
    (slotsRemaining.dst ?? 0) +
    (slotsRemaining.bench ?? 0)

  // Build per-position buckets sorted by bias-adjusted ceiling DESC (best
  // players first). DEC-1: hard-avoid players are excluded entirely (null
  // biasedCeiling); soft-avoid and target only reorder priority, never touch
  // expectedCost.
  const buckets = new Map<BoardPlayer['position'], BoardPlayer[]>()
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'DEF'] as const) {
    buckets.set(
      pos,
      availablePlayers
        .filter(p => p.position === pos && biasedCeiling(p, bias) !== null)
        .sort((a, b) => biasedCeiling(b, bias)! - biasedCeiling(a, bias)!),
    )
  }

  const used = new Set<string>()
  const assignments: SlotAssignment[] = []
  let completionCost = 0

  // R5 budget-aware fill: the rest-of-roster must itself be affordable. Money
  // spent so far and slots filled so far are tracked so each new slot can only
  // claim a real (priced) player when doing so still leaves at least
  // `minPerSlot` for every slot not yet filled. When it can't, the slot drops
  // to replacement cost ($1) — a scrub — instead of an unaffordable stud. This
  // is what stops the solver from reserving an all-studs rest-of-roster that
  // blows the budget and collapses every max-bid to $1.
  let budgetLeft = budgetRemaining
  let filled = 0

  /** Can we pay `cost` for this slot and still keep `minPerSlot` for the rest? */
  function affordable(cost: number): boolean {
    const slotsAfterThis = totalSlots - filled - 1
    return budgetLeft - cost >= minPerSlot * slotsAfterThis
  }

  // Take the best (highest-ceiling) player at this position that we can still
  // AFFORD under the guard. If the top player is unaffordable we advance to the
  // next cheaper one rather than skipping straight to a $1 filler — buckets are
  // ceiling DESC, so the first affordable hit is the best affordable player.
  function takeAffordableFromBucket(pos: BoardPlayer['position']): BoardPlayer | null {
    const bucket = buckets.get(pos) ?? []
    const player = bucket.find(p => !used.has(p.id) && affordable(p.expectedCost)) ?? null
    if (player) used.add(player.id)
    return player
  }

  // Phase 1: Fill dedicated starter slots in scarcity order.
  for (const slot of DEDICATED_ORDER) {
    const count = slotsRemaining[slot] ?? 0
    const pos = DEDICATED_TO_POSITION[slot]
    const slotType = DEDICATED_TO_LABEL[slot]

    for (let i = 0; i < count; i++) {
      // Best affordable player at this position, else a $1 replacement filler.
      const candidate = takeAffordableFromBucket(pos)
      const player = candidate
      const cost = candidate?.expectedCost ?? replacementCosts[slot]
      assignments.push({ slotType, player, assignedCost: cost })
      completionCost += cost
      budgetLeft -= cost
      filled++
    }
  }

  // Phase 2: Fill FLEX slots from the combined RB/WR/TE pool (ceiling DESC).
  // Build after Phase 1 so dedicated-slot players are already excluded via `used`.
  const flexPool: BoardPlayer[] = (['RB', 'WR', 'TE'] as const)
    .flatMap(pos => (buckets.get(pos) ?? []).filter(p => !used.has(p.id)))
    .sort((a, b) => biasedCeiling(b, bias)! - biasedCeiling(a, bias)!)

  const minFlexReplacement = Math.min(
    replacementCosts.rb,
    replacementCosts.wr,
    replacementCosts.te,
  )
  const flexCount = slotsRemaining.flex ?? 0

  for (let i = 0; i < flexCount; i++) {
    // Best affordable player left in the shared RB/WR/TE pool. Advancing past an
    // unaffordable stud (instead of dropping to a filler) is what stops all FLEX
    // slots from collapsing to $1 scrubs while cheaper flex players sit unused.
    const candidate = flexPool.find(p => !used.has(p.id) && affordable(p.expectedCost)) ?? null
    const player = candidate
    const cost = candidate?.expectedCost ?? minFlexReplacement
    if (candidate) used.add(candidate.id)
    assignments.push({ slotType: 'FLEX', player, assignedCost: cost })
    completionCost += cost
    budgetLeft -= cost
    filled++
  }

  // Phase 3: Bench slots — always use replacement cost ($1 each).
  // Bench filler quality is irrelevant to draft strategy; budget matters.
  const benchCount = slotsRemaining.bench ?? 0
  for (let i = 0; i < benchCount; i++) {
    assignments.push({
      slotType: 'BENCH',
      player: null,
      assignedCost: replacementCosts.bench,
    })
    completionCost += replacementCosts.bench
    budgetLeft -= replacementCosts.bench
    filled++
  }

  return {
    feasible: completionCost <= budgetRemaining,
    completionCost: Math.round(completionCost),
    assignments,
  }
}

// ─── Slot resolution ──────────────────────────────────────────────────────────

/**
 * Determine which remaining slot the nominated player fills, in priority order:
 * dedicated position slot → FLEX (RB/WR/TE only) → bench.
 * Returns the updated SlotsRemaining with that slot decremented by 1, or `null`
 * when there is no slot the player can fill (BUG-007: a full roster with bench=0
 * must not silently no-op — the player genuinely has nowhere to go).
 */
function resolvePlayerSlot(
  player: BoardPlayer,
  slots: SlotsRemaining,
): SlotsRemaining | null {
  const dedicatedKey = POSITION_TO_DEDICATED[player.position]

  if ((slots[dedicatedKey] ?? 0) > 0) {
    return { ...slots, [dedicatedKey]: slots[dedicatedKey] - 1 }
  }

  if (FLEX_ELIGIBLE.has(player.position) && (slots.flex ?? 0) > 0) {
    return { ...slots, flex: slots.flex - 1 }
  }

  if ((slots.bench ?? 0) > 0) {
    return { ...slots, bench: slots.bench - 1 }
  }

  return null
}

// ─── Explanation builder ──────────────────────────────────────────────────────

const EXPLANATION_ORDER: SlotAssignment['slotType'][] = [
  'QB', 'RB', 'WR', 'TE', 'DST', 'FLEX', 'BENCH',
]

function buildExplanation(
  assignments: SlotAssignment[],
  completionCost: number,
  maxBid: number,
): string {
  if (assignments.length === 0) {
    return `Roster complete - max $${maxBid}`
  }

  const counts: Partial<Record<SlotAssignment['slotType'], number>> = {}
  for (const a of assignments) {
    counts[a.slotType] = (counts[a.slotType] ?? 0) + 1
  }

  const parts = EXPLANATION_ORDER
    .filter(s => (counts[s] ?? 0) > 0)
    .map(s => {
      const n = counts[s]!
      return n > 1 ? `${n}×${s}` : s
    })

  return `Need ${parts.join(' + ')} (~$${Math.round(completionCost)}) → max $${maxBid}`
}

// ─── Primary export: roster-constrained max bid ───────────────────────────────

/**
 * For a nominated player: the maximum Joe can bid while still being able to
 * afford the best possible rest-of-roster at expected board prices.
 *
 * Formula: maxBid = budgetRemaining - expectedCostOfBestRemainingRoster
 *
 * @param nominatedPlayer  The player currently up for auction.
 * @param input            Current solver state. `slotsRemaining` must include the
 *                         slot the nominated player would fill (it is decremented
 *                         internally). `availablePlayers` must include the nominated
 *                         player (they are removed internally).
 */
export function computeRosterConstrainedMaxBid(
  nominatedPlayer: BoardPlayer,
  input: SolverInput,
): RosterConstrainedMaxBid {
  const minPerSlot = input.minPerSlot ?? 1

  // Remove nominated player from the available pool.
  const remainingPlayers = input.availablePlayers.filter(p => p.id !== nominatedPlayer.id)

  // Decrement the slot the nominated player fills.
  const reducedSlots = resolvePlayerSlot(nominatedPlayer, input.slotsRemaining)

  // BUG-007: no slot available for this player (roster full at their position,
  // no FLEX, no bench). Don't run the solver against unmodified slots — say so.
  if (reducedSlots === null) {
    return {
      maxBid: 1,
      feasible: false,
      completionCost: 0,
      explanation: `No slot available for ${nominatedPlayer.position}`,
      bestRestOfRoster: [],
    }
  }

  // Solve for the best possible rest-of-roster.
  const result = solveAllocation({
    ...input,
    slotsRemaining: reducedSlots,
    availablePlayers: remainingPlayers,
  })

  const rawMaxBid = input.budgetRemaining - result.completionCost
  const maxBid = Math.max(minPerSlot, Math.round(rawMaxBid))
  const feasible = rawMaxBid >= minPerSlot

  return {
    maxBid,
    feasible,
    completionCost: result.completionCost,
    explanation: buildExplanation(result.assignments, result.completionCost, maxBid),
    bestRestOfRoster: result.assignments,
  }
}
