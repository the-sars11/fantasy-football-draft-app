/**
 * draft-plan.ts - derives the one-glance "Your Plan" panel view-model from the
 * research dataset. Pure and $0: no Claude, no invented numbers. Every field is
 * read straight off the same snapshot the board already loads, using the SAME
 * rules the headless report uses (scripts/research-run.ts):
 *
 *   - anchor + second-buys : studCombos ranked by sim.grade.meanWins; the stud
 *     that appears in the most top combos is the anchor, the other stud in each
 *     top pairing is a second-buy option, each carrying that pairing's record
 *     and the solver-fit walk-up price.
 *   - pockets   : players tagged 'pocket'/'sleeper', best valueGap first.
 *   - overpays  : players tagged 'tax', worst valueGap first (room pays over worth).
 *   - room read : leagueIntel.positionalInflation (where the room over/under-pays).
 *   - spread    : min/max mean wins across strategies ("the whole board is close").
 *
 * When the dataset has no combos yet the anchor/second-buys resolve to empty and
 * the panel simply renders the sections it can - never a fabricated pick.
 */

import type { Position } from '@/lib/players/types'
import type {
  ResearchDataset,
  EnrichedPlayer,
  DatasetStudCombo,
} from '@/lib/research/dataset-types'

/** A player line in the plan - worth vs room, with the injury-tag flag. */
export interface PlanPlayer {
  id: string
  name: string
  position: Position
  /** Our model ceiling ($ the seat is worth under budget). */
  worth: number | null
  /** What the room pays at this rank (durability-adjusted). */
  roomPrice: number | null
  /** Max to bid to actually win the lot; falls back to worth when unpriced. */
  walkAway: number | null
  /** True when a durability haircut or listed injury status applies. */
  injury: boolean
}

/** A second big-buy option: a PlanPlayer plus its sim pairing record. */
export interface SecondBuyOption extends PlanPlayer {
  /** Sim record of the anchor+this pairing, e.g. "8.9-5.1". */
  record: string
  meanWins: number
  /** True for the best-graded pairing(s) - gets the "best" chip. */
  best: boolean
}

/** The anchor seat you pay full freight for. */
export interface PlanAnchor {
  player: PlanPlayer
  /** Sim record of the top pairing this anchor appears in. */
  record: string
  /** How dominant the anchor is across the top combos, e.g. "in 5 of 6 top combos". */
  presence: string
}

/** A let-them-overpay line: fine player, wrong price in this room. */
export interface OverpayLine {
  id: string
  name: string
  position: Position
  worth: number | null
  roomPrice: number | null
  /** roomPrice - worth, the tax the room pays. */
  overpay: number
}

/** One positional-inflation read row. */
export interface RoomReadLine {
  position: string
  sharePct: number
  nationalPct: number
  multiplier: number
  tag: string
}

/** The whole panel view-model. */
export interface DraftPlan {
  anchor: PlanAnchor | null
  secondBuys: SecondBuyOption[]
  pockets: PlanPlayer[]
  overpays: OverpayLine[]
  roomRead: RoomReadLine[]
  /** Min/max mean wins across strategies - the "board is close" framing. */
  spread: { min: number; max: number } | null
  /** Provenance line for the panel header. */
  source: { generatedAt: string; simRuns: number; strategies: number }
}

const TOP_COMBOS = 8
const MAX_SECOND_BUYS = 5
const MAX_POCKETS = 8
const MAX_OVERPAYS = 6

function normName(n: string): string {
  return n.trim().toLowerCase()
}

/** A player's walk-up price from a combo's solver-fit target pricing, by name. */
function walkUpFor(combo: DatasetStudCombo, name: string): number | null {
  const row = combo.proposal.target_pricing?.prices.find(
    (p) => normName(p.name) === normName(name),
  )
  return row ? row.walkUp : null
}

function isInjured(p: EnrichedPlayer): boolean {
  return p.durabilityPriceFactor < 1 || !!p.injuryStatus
}

function toPlanPlayer(p: EnrichedPlayer, walkAway: number | null): PlanPlayer {
  return {
    id: p.id,
    name: p.name,
    position: p.position,
    worth: p.ceilingValue,
    roomPrice: p.expectedRoomPrice,
    walkAway: walkAway ?? p.ceilingValue,
    injury: isInjured(p),
  }
}

function fmtRecord(meanWins: number, meanLosses: number): string {
  const r = (n: number) => (Math.round(n * 10) / 10).toFixed(1)
  return `${r(meanWins)}-${r(meanLosses)}`
}

/**
 * Derive the panel from the dataset. Returns null only when the dataset is
 * absent; a dataset with no combos still yields pockets/overpays/room-read.
 */
export function buildDraftPlan(dataset: ResearchDataset | null): DraftPlan | null {
  if (!dataset) return null

  const byName = new Map<string, EnrichedPlayer>()
  for (const p of dataset.players) byName.set(normName(p.name), p)

  // ── Anchor + second-buys from the sim'd stud combos ──────────────────────
  const ranked = [...dataset.studCombos].sort(
    (a, b) => b.sim.grade.meanWins - a.sim.grade.meanWins,
  )
  const top = ranked.slice(0, TOP_COMBOS)

  let anchor: PlanAnchor | null = null
  let secondBuys: SecondBuyOption[] = []

  if (top.length > 0) {
    // Frequency of each stud across the top combos; best mean-wins as tiebreak.
    const freq = new Map<string, { count: number; bestWins: number }>()
    for (const c of top) {
      for (const name of c.anchorNames) {
        const key = normName(name)
        const cur = freq.get(key) ?? { count: 0, bestWins: 0 }
        cur.count += 1
        cur.bestWins = Math.max(cur.bestWins, c.sim.grade.meanWins)
        freq.set(key, cur)
      }
    }
    // Anchor = most-frequent stud, tiebreak by best pairing wins.
    let anchorKey: string | null = null
    let anchorScore = { count: -1, bestWins: -1 }
    for (const [key, v] of freq) {
      if (
        v.count > anchorScore.count ||
        (v.count === anchorScore.count && v.bestWins > anchorScore.bestWins)
      ) {
        anchorKey = key
        anchorScore = { count: v.count, bestWins: v.bestWins }
      }
    }

    if (anchorKey) {
      const anchorPlayer = byName.get(anchorKey)
      // The top combo the anchor appears in (ranked already sorted by wins).
      const topAnchorCombo = ranked.find((c) =>
        c.anchorNames.some((n) => normName(n) === anchorKey),
      )
      if (anchorPlayer && topAnchorCombo) {
        // Best walk-up seen for the anchor across combos.
        let anchorWalk: number | null = null
        for (const c of ranked) {
          const w = walkUpFor(c, anchorPlayer.name)
          if (w != null) anchorWalk = Math.max(anchorWalk ?? 0, w)
        }
        const appearsIn = ranked
          .slice(0, TOP_COMBOS)
          .filter((c) => c.anchorNames.some((n) => normName(n) === anchorKey)).length
        anchor = {
          player: toPlanPlayer(anchorPlayer, anchorWalk),
          record: fmtRecord(
            topAnchorCombo.sim.grade.meanWins,
            topAnchorCombo.sim.grade.meanLosses,
          ),
          presence: `in ${appearsIn} of ${top.length} top combos`,
        }

        // Second-buys = the OTHER stud in each pairing the anchor is in.
        const seen = new Set<string>()
        const options: SecondBuyOption[] = []
        for (const c of ranked) {
          if (!c.anchorNames.some((n) => normName(n) === anchorKey)) continue
          const others = c.anchorNames.filter((n) => normName(n) !== anchorKey)
          // Only clean pairings (anchor + exactly one other) stay legible.
          if (others.length !== 1) continue
          const otherKey = normName(others[0])
          if (seen.has(otherKey)) continue
          const op = byName.get(otherKey)
          if (!op) continue
          seen.add(otherKey)
          options.push({
            ...toPlanPlayer(op, walkUpFor(c, op.name)),
            record: fmtRecord(c.sim.grade.meanWins, c.sim.grade.meanLosses),
            meanWins: c.sim.grade.meanWins,
            best: false,
          })
        }
        options.sort((a, b) => b.meanWins - a.meanWins)
        const bestWins = options.length > 0 ? options[0].meanWins : 0
        for (const o of options) o.best = o.meanWins >= bestWins - 0.05
        secondBuys = options.slice(0, MAX_SECOND_BUYS)
      }
    }
  }

  // ── Pockets: model + experts both beat the room ──────────────────────────
  // The anchor and the second-buys are already called out above, so drop them
  // from the pocket list to keep it a one-glance set of NEW names.
  const alreadyNamed = new Set<string>()
  if (anchor) alreadyNamed.add(anchor.player.id)
  for (const b of secondBuys) alreadyNamed.add(b.id)
  const pockets: PlanPlayer[] = dataset.players
    .filter((p) => p.tags.some((t) => t.id === 'pocket' || t.id === 'sleeper'))
    .filter((p) => !alreadyNamed.has(p.id))
    .sort((a, b) => (b.valueGap ?? 0) - (a.valueGap ?? 0))
    .slice(0, MAX_POCKETS)
    .map((p) => toPlanPlayer(p, p.ceilingValue))

  // ── Overpays (room tax): let someone else pay over worth ─────────────────
  const overpays: OverpayLine[] = dataset.players
    .filter((p) => p.tags.some((t) => t.id === 'tax'))
    .sort((a, b) => (a.valueGap ?? 0) - (b.valueGap ?? 0))
    .slice(0, MAX_OVERPAYS)
    .map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      worth: p.ceilingValue,
      roomPrice: p.expectedRoomPrice,
      overpay:
        p.expectedRoomPrice != null && p.ceilingValue != null
          ? p.expectedRoomPrice - p.ceilingValue
          : Math.abs(p.valueGap ?? 0),
    }))

  // ── Room read: positional inflation ──────────────────────────────────────
  const roomRead: RoomReadLine[] = Object.entries(
    dataset.leagueIntel.positionalInflation,
  ).map(([position, inf]) => ({
    position,
    sharePct: inf.sharePct,
    nationalPct: inf.nationalPct,
    multiplier: inf.multiplier,
    tag: inf.tag,
  }))

  // ── Strategy spread: how close is the whole board? ───────────────────────
  let spread: { min: number; max: number } | null = null
  if (dataset.strategies.length > 0) {
    const wins = dataset.strategies.map((s) => s.sim.grade.meanWins)
    spread = { min: Math.min(...wins), max: Math.max(...wins) }
  }

  return {
    anchor,
    secondBuys,
    pockets,
    overpays,
    roomRead,
    spread,
    source: {
      generatedAt: dataset.meta.generatedAt,
      simRuns: dataset.meta.simRunsPerStrategy,
      strategies: dataset.strategies.length,
    },
  }
}
