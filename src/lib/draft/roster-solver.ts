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

export interface SolverInput {
  /** Joe's current remaining budget (before paying for any nominated player). */
  budgetRemaining: number
  slotsRemaining: SlotsRemaining
  /** Undrafted players only; the solver does not mutate this array. */
  availablePlayers: BoardPlayer[]
  replacementCosts: ReplacementCosts
  /** Minimum per-slot bid floor (default 1). */
  minPerSlot?: number
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

// ─── Core: best-fill allocation ───────────────────────────────────────────────

/**
 * Compute the best-fill allocation for all remaining slots.
 * Picks the highest-ceiling available player for each slot in priority order,
 * falling back to replacementCosts when the board is dry at a position.
 */
export function solveAllocation(input: SolverInput): SolverResult {
  const { slotsRemaining, availablePlayers, replacementCosts, budgetRemaining } = input

  // Build per-position buckets sorted by ceiling DESC (best players first).
  const buckets = new Map<BoardPlayer['position'], BoardPlayer[]>()
  for (const pos of ['QB', 'RB', 'WR', 'TE', 'DEF'] as const) {
    buckets.set(
      pos,
      availablePlayers
        .filter(p => p.position === pos)
        .sort((a, b) => b.ceiling - a.ceiling),
    )
  }

  const used = new Set<string>()
  const assignments: SlotAssignment[] = []
  let completionCost = 0

  function takeFromBucket(pos: BoardPlayer['position']): BoardPlayer | null {
    const bucket = buckets.get(pos) ?? []
    const player = bucket.find(p => !used.has(p.id)) ?? null
    if (player) used.add(player.id)
    return player
  }

  // Phase 1: Fill dedicated starter slots in scarcity order.
  for (const slot of DEDICATED_ORDER) {
    const count = slotsRemaining[slot] ?? 0
    const pos = DEDICATED_TO_POSITION[slot]
    const slotType = DEDICATED_TO_LABEL[slot]

    for (let i = 0; i < count; i++) {
      const player = takeFromBucket(pos)
      const cost = player?.expectedCost ?? replacementCosts[slot]
      assignments.push({ slotType, player, assignedCost: cost })
      completionCost += cost
    }
  }

  // Phase 2: Fill FLEX slots from the combined RB/WR/TE pool (ceiling DESC).
  // Build after Phase 1 so dedicated-slot players are already excluded via `used`.
  const flexPool: BoardPlayer[] = (['RB', 'WR', 'TE'] as const)
    .flatMap(pos => (buckets.get(pos) ?? []).filter(p => !used.has(p.id)))
    .sort((a, b) => b.ceiling - a.ceiling)

  const minFlexReplacement = Math.min(
    replacementCosts.rb,
    replacementCosts.wr,
    replacementCosts.te,
  )
  const flexCount = slotsRemaining.flex ?? 0

  for (let i = 0; i < flexCount; i++) {
    const player = flexPool.find(p => !used.has(p.id)) ?? null
    if (player) used.add(player.id)
    const cost = player?.expectedCost ?? minFlexReplacement
    assignments.push({ slotType: 'FLEX', player, assignedCost: cost })
    completionCost += cost
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
 * Returns the updated SlotsRemaining with that slot decremented by 1.
 */
function resolvePlayerSlot(
  player: BoardPlayer,
  slots: SlotsRemaining,
): SlotsRemaining {
  const dedicatedKey = POSITION_TO_DEDICATED[player.position]

  if ((slots[dedicatedKey] ?? 0) > 0) {
    return { ...slots, [dedicatedKey]: slots[dedicatedKey] - 1 }
  }

  if (FLEX_ELIGIBLE.has(player.position) && (slots.flex ?? 0) > 0) {
    return { ...slots, flex: slots.flex - 1 }
  }

  return { ...slots, bench: Math.max(0, (slots.bench ?? 0) - 1) }
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
