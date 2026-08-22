/**
 * sim-engine.ts — R10a Monte-Carlo auction simulation engine
 *
 * Replaces the old deterministic-toy sim (single draft, opponents pick by ADP,
 * not persisted). This is a pure, seeded Monte-Carlo engine where EVERY manager
 * bids by auction up to their own roster-completion max via the R4 solver
 * (roster-solver.ts) — competition-aware, not ADP. It runs N full auctions and
 * returns per-run resulting rosters for all seats plus an aggregate distribution.
 *
 * What this module is NOT (deliberately, per the R10a/R10b split):
 *   - No React, no Supabase, no network, no Claude. Pure + $0 + synchronous.
 *   - No strategy grading, no projected record, no representative-team selection,
 *     no persistence. Those hang off this engine in R10b.
 *
 * Determinism: all randomness flows from a single seeded PRNG per run (mulberry32).
 * Same input + same seed -> byte-identical runs. This is what the "determinism
 * under seed" acceptance clause requires, and it is why the module never calls
 * Math.random().
 *
 * Auction model (one "lot"):
 *   1. A manager nominates a player (round-robin nominator; nomination jitters
 *      among the top few remaining by ceiling so runs diverge -> a distribution).
 *   2. Every manager with an open slot for that position computes a willingness
 *      to pay = min(noisy valuation of the player, solvency floor). The solvency
 *      floor reserves $1 for every OTHER unfilled slot (budget − $1×otherSlots),
 *      so a bid can never strand a manager's roster.
 *
 *      NOTE (bid model — deliberate, see git history): willingness is capped by
 *      this flat $1/slot solvency floor, NOT by the R4 solver's roster-constrained
 *      max-bid. The solver reserves the cost of the BEST AFFORDABLE rest-of-roster,
 *      which from an empty roster on a stud-rich board is ~the entire budget — so
 *      every seat's max-bid collapses to $1, every stud ties at $1, and the
 *      lowest-index seat (me) sweeps them all. That is correct, conservative advice
 *      for the LIVE max-bid advisor (auction-advisor.ts) but wrong as an opponent
 *      bidding model here, where studs must clear near market value. The solver is
 *      intentionally left untouched; only this sim's bid cap uses the solvency floor.
 *   3. Winner = highest willingness. Sale price = second-highest willingness + 1,
 *      floored at $1 and capped at the winner's willingness (classic ascending /
 *      second-price English-auction clearing). One bidder -> $1 (an uncontested
 *      steal, which is realistic).
 *   4. The player is removed from the board either way (sold, or unsold when no
 *      manager can take them). The board strictly shrinks, so the loop terminates.
 */

import {
  type BoardPlayer,
  type SlotsRemaining,
} from './roster-solver'

// ─── PRNG ───────────────────────────────────────────────────────────────────

/**
 * mulberry32 — a tiny, fast, well-distributed 32-bit seeded PRNG. Deterministic:
 * the same seed always yields the same sequence. Returns floats in [0, 1).
 * Chosen over Math.random precisely so the sim is reproducible under a seed.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Input / output types ─────────────────────────────────────────────────────

/** Full roster shape (per manager) the sim allocates against. */
export interface SimRosterConfig {
  qb: number
  rb: number
  wr: number
  te: number
  flex: number
  dst: number
  bench: number
  /** IR folds into bench (both fill at $1). Optional. */
  ir?: number
}

export interface SimEngineInput {
  /** Every valued, undrafted player available at the start of the draft. */
  board: BoardPlayer[]
  /** Per-manager roster shape (Nasties: qb1/rb1/wr1/te1/flex3/dst1/bench5+ir1). */
  rosterConfig: SimRosterConfig
  /** Number of managers (Nasties = 12). Seat 0 is "me". */
  numManagers: number
  /** Per-manager auction budget (Nasties = $200). */
  budget: number
  /** Monte-Carlo runs. Default 24. */
  runs?: number
  /** Base RNG seed; run i uses seed + i. Default 1. */
  seed?: number
  /**
   * Valuation noise as a fraction of the seat's base valuation. Each manager
   * values a nominated player at base × (1 ± noisePct), where base is the national
   * ceiling for the me-seat and unprofiled opponents, or the room price
   * (expectedCost) for profiled opponents. Default 0.15. This is the only source
   * of run-to-run variance, so 0 collapses the distribution to a single outcome.
   */
  noisePct?: number
  /** Seat index that is "me" (Joe). Default 0. */
  myManagerIndex?: number
  /**
   * DEC-1 (BIAS): the "me" seat bids toward Joe's graded targets/avoids at a
   * BOUNDED weight. Keyed by BoardPlayer.id. The 11 opponents are NEVER biased —
   * they stay on generic ceiling valuation. The bias only nudges the me-seat's
   * private valuation; the roster-constrained max-bid still caps every bid, so a
   * target can never blow the roster. Absent => no bias (pure R10a behavior).
   */
  myBias?: SimMyBias
  /**
   * LEAGUE-REPLICATION (LR-1): per-seat opponent profiles derived from the real
   * Nasties ledger. When present, each opponent seat bids off the ROOM price
   * (BoardPlayer.expectedCost) tilted by that owner's positional lean, instead of
   * the generic national-ceiling model — so the simulated room drafts like the
   * actual league. Index-aligned to the opponent seats in ascending manager order
   * (every seat except `myManagerIndex`); a short/empty array leaves the remaining
   * opponents on the generic model. The me-seat is never affected. Absent => pure
   * generic opponents (backwards-compatible with every existing sim test).
   */
  opponentProfiles?: OpponentProfile[]
  /**
   * R10b (STRATEGY-DRIVE): the me-seat's concrete plan for ONE strategy, so the
   * sim executes that strategy's shape instead of chasing a fixed national
   * ceiling. When present, the me-seat pursues its named anchors up to their
   * solved walk-up price and fills every OTHER slot at room price capped by a
   * dynamic per-slot fair share (so leftover dollars spread across the whole
   * roster rather than collapsing to $1 fills). Absent => legacy ceiling-chase
   * (backwards-compatible with every existing sim test). Only the me-seat is
   * affected; opponents are untouched.
   */
  myPlan?: SimMyPlan
}

/**
 * LR-1: one opponent seat's draft personality, built from league-calibration.
 * `leanByPos` is the owner's spend-share vs the room for each position (vsRoom,
 * centered ~1.0: >1 pays up, <1 lays off). `name` is carried for reporting only.
 */
export interface OpponentProfile {
  name?: string
  leanByPos: Record<BoardPlayer['position'], number>
}

/** One graded lean for the me-seat. Targets use weight; avoids use severity. */
export interface SimBiasEntry {
  kind: 'target' | 'avoid'
  /** Target weight 1..10 (from user_tags.tag_weight). Ignored for avoids. */
  weight?: number
  /** Avoid severity. 'hard' => me never bids; 'soft' => me only takes a discount. */
  severity?: 'soft' | 'hard'
}

/** Me-seat graded leans keyed by BoardPlayer.id. */
export type SimMyBias = Record<string, SimBiasEntry>

/**
 * R10b (STRATEGY-DRIVE): the me-seat's concrete draft plan for ONE strategy.
 * `anchors` are the strategy's named studs keyed by BoardPlayer.id, each with the
 * most me will pay to WIN that anchor (the solver's durability-adjusted walk-up
 * price, already fit to $200 and capped at LEAGUE_MAX_CLEAR upstream). The sim
 * uses this to make the me-seat spend like the strategy: chase these specific
 * players hard, then fill the rest of the roster at market value under a per-slot
 * cap. Two strategies with different anchors therefore land visibly different
 * rosters instead of both converging on the same national-ceiling studs.
 */
export interface SimMyPlan {
  /** Named anchors keyed by BoardPlayer.id -> the most me will pay to win them. */
  anchors: Record<string, { maxPrice: number }>
}

/** One player a manager won, with what they paid. */
export interface SimWonPlayer {
  id: string
  /** Sleeper/external id, carried from the board so grading can join real durability. */
  sleeperId?: string
  name: string
  position: BoardPlayer['position']
  price: number
  ceiling: number
  /** Projected full-PPR season points, carried from the board for R10b grading. */
  projectedPoints: number
}

/** A single manager's resulting roster after one simulated draft. */
export interface SimManagerRoster {
  managerIndex: number
  isMe: boolean
  players: SimWonPlayer[]
  spent: number
  budgetLeft: number
  /** Sum of ceiling across won players — a raw roster-strength proxy. Real
   *  points-vs-league grading is R10b; this is just the engine's primitive. */
  totalCeiling: number
  /** Count of won players by position (QB/RB/WR/TE/DEF). */
  positionCounts: Record<BoardPlayer['position'], number>
}

/** One complete simulated draft. */
export interface SimRun {
  seed: number
  /** Rosters for every seat, index-aligned to manager index. */
  rosters: SimManagerRoster[]
  /** Convenience handle on the "me" seat. */
  myRoster: SimManagerRoster
  /** Number of auction lots that resolved (sold or unsold). */
  lots: number
}

export interface DistributionStats {
  min: number
  max: number
  mean: number
  median: number
  p10: number
  p90: number
  stdev: number
}

/** Aggregate distribution across all Monte-Carlo runs (from the "me" seat). */
export interface SimDistribution {
  runs: number
  myTotalCeiling: DistributionStats
  mySpend: DistributionStats
  /** Average number of each position "me" ends the draft with. */
  myPositionMeans: Record<BoardPlayer['position'], number>
}

export interface SimEngineResult {
  runs: SimRun[]
  distribution: SimDistribution
  /** Echo of the resolved config actually used (defaults filled in). */
  config: Required<Omit<SimEngineInput, 'board' | 'rosterConfig'>> & {
    rosterConfig: SimRosterConfig
  }
}

// ─── Internal manager state ────────────────────────────────────────────────────

interface ManagerState {
  index: number
  budget: number
  slots: SlotsRemaining
  players: SimWonPlayer[]
}

const POSITIONS: BoardPlayer['position'][] = ['QB', 'RB', 'WR', 'TE', 'DEF']

const FLEX_ELIGIBLE = new Set<BoardPlayer['position']>(['RB', 'WR', 'TE'])

// ─── DEC-1 me-seat bias constants (bounded) ──────────────────────────────────
/** Max valuation lift for a weight-10 target: +35% over generic ceiling worth. */
const TARGET_MAX_BOOST = 0.35
/** Soft-avoid valuation multiplier: me only takes the player at a real discount. */
const SOFT_AVOID_FACTOR = 0.5

/**
 * R10b (STRATEGY-DRIVE): how far above the per-slot fair share the me-seat will
 * pay for a NON-anchor filler. With the plan active, me values every non-anchor at
 * min(room price, (remaining budget / open slots) x this). At 2.5, a seat holding
 * $120 for 12 open slots ($10/slot) will pay up to ~$25 for a filler, so leftover
 * budget spreads across ~10-12 real mid-tier players and tapers as slots fill,
 * instead of me hoarding the next-nominated stud at national ceiling and dropping
 * to $1 fills. Higher => more concentrated at the top; lower => flatter/cheaper.
 */
const VALUE_FILL_SPREAD = 2.5

// ─── LR-1 opponent "room-price drive" ────────────────────────────────────────
/**
 * How strongly a profiled opponent's historical positional lean tilts their
 * valuation. Opponents anchor on the ROOM price (expectedCost = what Joe's league
 * has actually paid for this player's positional rank), so the simulated field
 * clears studs at ledger prices rather than national ceiling; their lean then
 * tilts appetite around that room price. Strength in (0,1]: 0 = pure room price (no
 * personality), 1 = the full historical lean. At 0.35 a WR-loving owner (lean 1.5)
 * values WRs at ~1.18x room and a WR-averse owner (lean 0.5) at ~0.83x room, so
 * tendency still shows while the clearing price stays anchored to what the room
 * pays. This is what lets distinct strategies separate against a realistic market
 * instead of every seat overpaying to national ceiling.
 *
 * Trimmed 0.5 -> 0.35 (Joe, 2026-08-20): at 0.5 the high-lean tail slammed studs
 * into the $88 cap; 0.35 lands hungry owners in the low-to-mid $80s naturally, so
 * $85+ stays rare, matching the Nasties ledger (all-time high $85, next $81).
 */
const OPPONENT_LEAN_STRENGTH = 0.35

/**
 * Hard clearing-price ceiling ($). The 4-draft Nasties ledger has NEVER cleared a
 * player above $85 (McCaffrey 2024; next $81, a few $80s, tier-1 typically mid/low
 * $70s). The room anchor + trimmed lean already sit the field there, but noise and
 * second-price ties can push a contested stud over $90 in rare runs. This caps every
 * clearing price a hair above the all-time high so the sim never invents a $90+ price
 * the room has never paid, while $85 stays reachable. (Joe, 2026-08-20.)
 */
const LEAGUE_MAX_CLEAR = 88

/**
 * Nomination realism (Phase 2, board control). The old model nominated randomly
 * among the top-3 remaining by ceiling, so players cleared in near-strict value
 * order: a startable mid-tier player (ceiling ~$20) was not nominated until every
 * higher-ceiling player had sold, by which point rivals had filled that position
 * and only the me-seat still had a slot -- so genuinely startable players (Tee
 * Higgins, DJ Moore, Bucky Irving) cleared at $1 to a lone late bidder, which the
 * Nasties ledger never shows.
 *
 * Real drafts nominate a MIXTURE every lot, and we model exactly that:
 *   - TIGHT branch (NOMINATION_TIGHT_SHARE of lots): draw from the top few remaining
 *     by ceiling, so the current best players clear PROMPTLY and never linger into
 *     the thin-budget late phase. This is the ONLY branch that nominates the very
 *     top of the board, which is what stops an elite (Puka, Gibbs) from ever
 *     cratering to $1 -- he is always sold near the top while the room is flush.
 *   - WILDCARD branch (the rest): draw UNIFORMLY from the mid/late board (ranks at
 *     or below the tight window), deliberately pulling mid-tier and role players up
 *     THROUGHOUT the draft while budgets are still live, so a startable (Tee Higgins,
 *     Bucky Irving) faces a full market and clears at a realistic price instead of
 *     $1 to a lone late bidder. (Decay toward the top was wrong here -- it just
 *     re-nominated near-stud players; the mid-tier is exactly what needs surfacing.)
 * Together: studs go early (tight), mid-tier is injected early (wildcard), neither
 * defect returns. All three knobs are tunable (Joe, 2026-08-22).
 */
const NOMINATION_TIGHT_SHARE = 0.55
const NOMINATION_TIGHT_WINDOW = 4
const NOMINATION_POOL = 60

/**
 * Draw a nomination index into the ceiling-desc-sorted `remaining` array via the
 * tight/wildcard mixture described above. Deterministic given `rng` (consumes two
 * draws per call: branch, then index). Exported for tests.
 */
export function pickNominationIndex(
  rng: () => number,
  count: number,
  poolCap: number = NOMINATION_POOL,
  tightShare: number = NOMINATION_TIGHT_SHARE,
  tightWindow: number = NOMINATION_TIGHT_WINDOW,
): number {
  if (count <= 1) return 0

  // TIGHT branch: keep the top of the board moving so studs never linger.
  if (rng() < tightShare) {
    const tight = Math.min(count, tightWindow)
    return Math.floor(rng() * tight)
  }

  // WILDCARD branch: uniform over the mid/late board [tightWindow, pool), pulling
  // role players up early. When few remain (count <= tightWindow) fall back to the
  // whole field so we always return a valid index.
  const hi = Math.min(count, poolCap)
  const lo = Math.min(tightWindow, hi - 1)
  return lo + Math.floor(rng() * (hi - lo))
}

const POSITION_TO_DEDICATED: Record<BoardPlayer['position'], keyof SlotsRemaining> = {
  QB: 'qb',
  RB: 'rb',
  WR: 'wr',
  TE: 'te',
  DEF: 'dst',
}

/** Build a manager's initial SlotsRemaining from the roster config (IR folds into bench). */
function initSlots(config: SimRosterConfig): SlotsRemaining {
  return {
    qb: config.qb ?? 0,
    rb: config.rb ?? 0,
    wr: config.wr ?? 0,
    te: config.te ?? 0,
    flex: config.flex ?? 0,
    dst: config.dst ?? 0,
    bench: (config.bench ?? 0) + (config.ir ?? 0),
  }
}

/** Total unfilled slots for a manager. */
function openSlotCount(slots: SlotsRemaining): number {
  return (
    (slots.qb ?? 0) +
    (slots.rb ?? 0) +
    (slots.wr ?? 0) +
    (slots.te ?? 0) +
    (slots.flex ?? 0) +
    (slots.dst ?? 0) +
    (slots.bench ?? 0)
  )
}

/** Does this manager have any slot a player of `pos` could fill? */
function hasOpenSlotFor(slots: SlotsRemaining, pos: BoardPlayer['position']): boolean {
  const dedicated = POSITION_TO_DEDICATED[pos]
  if ((slots[dedicated] ?? 0) > 0) return true
  if (FLEX_ELIGIBLE.has(pos) && (slots.flex ?? 0) > 0) return true
  if ((slots.bench ?? 0) > 0) return true
  return false
}

/**
 * Decrement the slot a won player fills, in priority order: dedicated -> FLEX
 * (RB/WR/TE only) -> bench. Mutates and returns the slots object. Assumes
 * hasOpenSlotFor already returned true (the caller guards on it).
 */
function assignWonSlot(slots: SlotsRemaining, pos: BoardPlayer['position']): void {
  const dedicated = POSITION_TO_DEDICATED[pos]
  if ((slots[dedicated] ?? 0) > 0) {
    slots[dedicated] -= 1
    return
  }
  if (FLEX_ELIGIBLE.has(pos) && (slots.flex ?? 0) > 0) {
    slots.flex -= 1
    return
  }
  slots.bench -= 1
}

// ─── One auction run ───────────────────────────────────────────────────────────

/**
 * Simulate one complete auction draft with the given seed. All managers bid
 * competitively via the solver; the "me" seat is just another solver-driven
 * bidder here (strategy-driven "me" bidding + grading arrive in R10b).
 */
export function runAuctionSim(
  input: SimEngineInput,
  seed: number,
): SimRun {
  const {
    board,
    rosterConfig,
    numManagers,
    budget,
    myManagerIndex = 0,
    myBias,
    opponentProfiles,
    myPlan,
  } = input
  const noisePct = input.noisePct ?? 0.15
  const rng = mulberry32(seed)

  /**
   * LR-1: map an opponent seat index to its owner profile. Opponent seats are
   * every manager except `myManagerIndex`, numbered ascending; seat `i` past the
   * me-seat shifts down one so the profile array stays 0-based over opponents.
   * Returns undefined when no profile is supplied for that seat (generic bidder).
   */
  function profileForSeat(index: number): OpponentProfile | undefined {
    if (!opponentProfiles || index === myManagerIndex) return undefined
    const opponentSlot = index < myManagerIndex ? index : index - 1
    return opponentProfiles[opponentSlot]
  }

  // Live copy of the board; players are spliced out as they sell/go unsold.
  const remaining: BoardPlayer[] = board.map(p => ({ ...p }))

  const managers: ManagerState[] = Array.from({ length: numManagers }, (_, i) => ({
    index: i,
    budget,
    slots: initSlots(rosterConfig),
    players: [],
  }))

  let lots = 0

  // Each lot removes exactly one player from `remaining`, so the loop is bounded
  // by the board size and always terminates.
  while (remaining.length > 0) {
    // Stop if no manager can take anyone (all rosters full).
    const anyoneHasSlot = managers.some(m => openSlotCount(m.slots) > 0)
    if (!anyoneHasSlot) break

    // --- Nomination (Phase 2, board control): draw from a wide pool with weight
    //     decaying in ceiling-rank, so studs still go early on average but mid-tier
    //     startables surface throughout the draft while budgets are live, instead
    //     of clearing in strict value order and dropping to $1 to a lone late
    //     bidder. See pickNominationIndex / NOMINATION_TEMP above. ---
    remaining.sort((a, b) => b.ceiling - a.ceiling)
    const nomIdx = pickNominationIndex(rng, remaining.length)
    const nominated = remaining[nomIdx]

    // --- Collect willingness across all managers who can slot this player. ---
    const bids: { manager: ManagerState; willing: number }[] = []
    for (const m of managers) {
      if (m.budget < 1) continue
      if (!hasOpenSlotFor(m.slots, nominated.position)) continue

      // Noisy multiplier for this manager's private valuation (the only source of
      // run-to-run variance). Drawn once per bidder per lot so me and opponents
      // stay directly comparable within a lot.
      const noise = 1 + (rng() * 2 - 1) * noisePct

      // Base valuation depends on the seat:
      //   - me: the player's TRUE worth (national VORP ceiling), so I chase value
      //     against a room that pays historical prices. If I want a stud I pay the
      //     room's price to win him (second price + $1), which IS the walk-up.
      //   - a profiled opponent (LR-1): the ROOM price (expectedCost) tilted by
      //     that owner's positional lean (softened toward 1.0), so each seat pays
      //     what Joe's league actually pays for that rank while still showing its
      //     historical tendency. This makes the field clear studs at ledger prices.
      //   - an unprofiled opponent: the generic ceiling model (pure R10a).
      const profile = profileForSeat(m.index)
      let valuation: number
      if (profile) {
        const lean = profile.leanByPos[nominated.position] ?? 1
        // Anchor on the ROOM price (expectedCost = the ledger's expectedRoomPrice
        // for this player's positional rank), then tilt by the owner's historical
        // lean softened toward 1.0. A neutral owner (lean 1) pays exactly room
        // price; a pos-hungry owner pays a bounded premium, a pos-averse one a
        // bounded discount. tilt in [1-s, 1+s(leanMax-1)]. This makes the field
        // clear studs at what Joe's league actually pays, not national ceiling.
        const tilt = 1 + OPPONENT_LEAN_STRENGTH * (lean - 1)
        valuation = Math.max(1, Math.round(nominated.expectedCost * tilt * noise))
      } else if (m.index === myManagerIndex && myPlan) {
        // R10b (STRATEGY-DRIVE): the me-seat executes THIS strategy's plan.
        //   - Anchor (a named target for this strategy): chase it up to the
        //     solver's walk-up price so me actually wins its advertised studs.
        //   - Any other player: value at the ROOM price (expectedCost) but never
        //     above a dynamic per-slot fair share (remaining budget / open slots
        //     x VALUE_FILL_SPREAD). openSlotCount is >= 1 here (hasOpenSlotFor
        //     guarded it), so perSlot is finite. This spends leftover budget
        //     across the whole roster in real mid-tier players and tapers as
        //     slots fill, instead of hoarding the next stud at national ceiling.
        const anchor = myPlan.anchors[nominated.id]
        if (anchor) {
          valuation = Math.max(1, Math.round(anchor.maxPrice * noise))
        } else {
          const openSlots = openSlotCount(m.slots)
          const perSlot = openSlots > 0 ? m.budget / openSlots : m.budget
          const fillCap = perSlot * VALUE_FILL_SPREAD
          const base = Math.min(nominated.expectedCost, fillCap)
          valuation = Math.max(1, Math.round(base * noise))
        }
      } else {
        valuation = Math.max(1, Math.round(nominated.ceiling * noise))
      }

      // DEC-1 (BIAS): only the "me" seat leans toward Joe's graded targets/avoids,
      // and only its valuation is nudged (the roster max-bid below still caps it).
      // Opponents fall straight through with the valuation above.
      if (m.index === myManagerIndex && myBias) {
        const bias = myBias[nominated.id]
        if (bias) {
          if (bias.kind === 'avoid') {
            // Hard avoid: me never bids on this lot at all.
            if (bias.severity === 'hard') continue
            // Soft avoid: me only bites at a genuine discount.
            valuation = Math.max(1, Math.round(valuation * SOFT_AVOID_FACTOR))
          } else {
            // Target: bounded lift, scaled by graded weight (1..10).
            const w = Math.min(10, Math.max(1, bias.weight ?? 5))
            valuation = Math.max(
              1,
              Math.round(valuation * (1 + TARGET_MAX_BOOST * (w / 10))),
            )
          }
        }
      }

      // Solvency floor: the most a manager can commit to THIS player and still
      // keep $1 for every OTHER slot they must fill. `hasOpenSlotFor` already
      // guaranteed an open slot, so openSlotCount(m.slots) >= 1 and slotsAfterThis
      // >= 0. This is the roster-completion reserve the engine documents ($1 per
      // other unfilled slot) — NOT the solver's best-affordable-rest-of-roster
      // cost, which from an empty roster reserves ~the whole budget and collapses
      // every bid to $1 (see the bid-model note in the module header).
      const slotsAfterThis = openSlotCount(m.slots) - 1
      const maxAffordable = Math.max(1, m.budget - slotsAfterThis)

      // Willing to pay up to the lesser of what they think it's worth and what
      // their budget allows while keeping the roster completable. maxAffordable
      // is always >= 1, so a manager with a slot and >= $1 always bids at least $1
      // (end-of-draft dollar grabs).
      const willing = Math.max(1, Math.min(valuation, maxAffordable))
      bids.push({ manager: m, willing })
    }

    if (bids.length === 0) {
      // Nobody can/will take this player — pull them and move on.
      remaining.splice(remaining.indexOf(nominated), 1)
      lots++
      continue
    }

    // Winner = highest willingness. Ties broken by lower manager index for
    // determinism. Second price + 1 sets the clearing price (English auction).
    bids.sort((a, b) => (b.willing - a.willing) || (a.manager.index - b.manager.index))
    const winner = bids[0].manager
    const top = bids[0].willing
    const second = bids.length > 1 ? bids[1].willing : 0
    // Second price + 1, floored at $1, then capped at the room's all-time ceiling
    // so no run invents a price the Nasties have never actually paid (LEAGUE_MAX_CLEAR).
    const price = Math.min(top, Math.max(1, second + 1), LEAGUE_MAX_CLEAR)

    // Award the player.
    winner.budget -= price
    assignWonSlot(winner.slots, nominated.position)
    winner.players.push({
      id: nominated.id,
      sleeperId: nominated.sleeperId,
      name: nominated.name,
      position: nominated.position,
      price,
      ceiling: nominated.ceiling,
      projectedPoints: nominated.projectedPoints ?? 0,
    })

    remaining.splice(remaining.indexOf(nominated), 1)
    lots++
  }

  // Build resulting rosters.
  const rosters: SimManagerRoster[] = managers.map(m => {
    const positionCounts: Record<BoardPlayer['position'], number> = {
      QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0,
    }
    let totalCeiling = 0
    let spent = 0
    for (const pl of m.players) {
      positionCounts[pl.position] += 1
      totalCeiling += pl.ceiling
      spent += pl.price
    }
    return {
      managerIndex: m.index,
      isMe: m.index === myManagerIndex,
      players: m.players,
      spent,
      budgetLeft: m.budget,
      totalCeiling,
      positionCounts,
    }
  })

  return {
    seed,
    rosters,
    myRoster: rosters[myManagerIndex],
    lots,
  }
}

// ─── Distribution stats ────────────────────────────────────────────────────────

/** Percentile (linear interpolation) of an unsorted numeric array. p in [0,1]. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  if (sorted.length === 1) return sorted[0]
  const idx = p * (sorted.length - 1)
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  const frac = idx - lo
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac
}

function statsOf(values: number[]): DistributionStats {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, p10: 0, p90: 0, stdev: 0 }
  }
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance =
    values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / values.length
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean,
    median: percentile(values, 0.5),
    p10: percentile(values, 0.1),
    p90: percentile(values, 0.9),
    stdev: Math.sqrt(variance),
  }
}

// ─── Monte Carlo driver ────────────────────────────────────────────────────────

/**
 * Run N seeded auction drafts and return every run plus the aggregate
 * distribution from the "me" seat. Same input + same base seed -> identical
 * result (each run i uses base seed + i).
 */
export function runMonteCarlo(input: SimEngineInput): SimEngineResult {
  const runs = input.runs ?? 24
  const seed = input.seed ?? 1
  const noisePct = input.noisePct ?? 0.15
  const myManagerIndex = input.myManagerIndex ?? 0

  const results: SimRun[] = []
  for (let i = 0; i < runs; i++) {
    results.push(runAuctionSim(input, seed + i))
  }

  const myCeilings = results.map(r => r.myRoster.totalCeiling)
  const mySpends = results.map(r => r.myRoster.spent)

  const myPositionMeans: Record<BoardPlayer['position'], number> = {
    QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0,
  }
  for (const pos of POSITIONS) {
    const counts = results.map(r => r.myRoster.positionCounts[pos])
    myPositionMeans[pos] =
      counts.reduce((s, v) => s + v, 0) / (counts.length || 1)
  }

  return {
    runs: results,
    distribution: {
      runs,
      myTotalCeiling: statsOf(myCeilings),
      mySpend: statsOf(mySpends),
      myPositionMeans,
    },
    config: {
      numManagers: input.numManagers,
      budget: input.budget,
      runs,
      seed,
      noisePct,
      myManagerIndex,
      myBias: input.myBias ?? {},
      opponentProfiles: input.opponentProfiles ?? [],
      myPlan: input.myPlan ?? { anchors: {} },
      rosterConfig: input.rosterConfig,
    },
  }
}
