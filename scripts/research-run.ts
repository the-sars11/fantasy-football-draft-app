/**
 * research-run.ts - headless draft-prep orchestrator (the missing glue).
 *
 * Runs the ENTIRE research machinery once, with zero UI, and dumps one cohesive,
 * data-backed dataset Joe (or any LLM) can interrogate. It imports the same pure,
 * $0, deterministic engine functions the app uses and chains them:
 *
 *   players_cache (Supabase)
 *     -> cacheToPlayers            (calibrated Player[]: ceiling, room price, VORP)
 *     -> generateStrategiesFromPool(solver-enumerated anchor strategies, $0)
 *     -> buildSimSummary per strategy (Monte-Carlo record + modal rosters + landed)
 *     -> per-player enrichment     (value band, tags, the "read", land probability)
 *     -> league intel              (positional inflation HOT/COOL, owner leans)
 *     -> research-output/dataset.json (machine) + report.md (human)
 *
 * Nothing is fabricated: every number traces to a real engine function over the
 * fresh cache. No Claude API call, no network beyond the Supabase read.
 *
 * Usage: npm run research:run   (tsx scripts/research-run.ts)
 * Copy rule (Joe): plain English, NO em/en dashes anywhere in surfaced strings.
 */

import { createClient } from '@supabase/supabase-js'
import { mkdirSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

import type { League, Player, Position, RosterSlots } from '@/lib/players/types'
import type { RosterSlots as DbRosterSlots } from '@/lib/supabase/database.types'
import { readPlayerCache, getCacheStatus } from '@/lib/research/cache'
import { cacheToPlayers } from '@/lib/players/convert'
import type { ConsensusPlayer } from '@/lib/research/normalize'
import { sweepStrategiesFromPool, combosFromPool, SWEEP_PATTERNS } from '@/lib/research/strategy/generate'
import type { StudCombo } from '@/lib/research/strategy/generate'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import { buildBoardPlayers } from '@/lib/draft/solver-bridge'
import { buildOpponentProfiles } from '@/lib/draft/league-opponents'
import {
  buildSimSummary,
  buildMyBiasFromTags,
  toPersistedSim,
  type GradedTagLike,
  type SimSummary,
} from '@/lib/draft/sim-results'
import type { SimRosterConfig } from '@/lib/draft/sim-engine'
import { computeValueRange } from '@/lib/players/value-range'
import { computePlayerTags } from '@/lib/players/tags'
import { computeRecommendation } from '@/lib/players/recommendation'
import { computeLandProbability } from '@/lib/draft/room-sim-probability'
import {
  allPositionalInflation,
  allOwnerLeans,
  CALIBRATION_ERA,
  CALIBRATION_DRAFTS_USED,
} from '@/lib/draft/league-calibration'
import type { ResearchDataset, DatasetMeta } from '@/lib/research/dataset-types'

// ─── .env.local loader (tsx does not auto-load it) ───────────────────────────

function loadEnvLocal(): void {
  try {
    const content = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t || t.startsWith('#')) continue
      const i = t.indexOf('=')
      if (i < 0) continue
      const k = t.slice(0, i).trim()
      const v = t.slice(i + 1).trim()
      if (k && !(k in process.env)) process.env[k] = v
    }
  } catch {
    /* no .env.local - rely on the ambient environment */
  }
}
loadEnvLocal()

// ─── Joe's league (The Nasties): 12-team, $200, full PPR, no kicker ──────────

const NUM_MANAGERS = 12
const BUDGET = 200
const REGULAR_SEASON_GAMES = 14
const SIM_RUNS = 400 // Monte-Carlo runs per strategy - stable record, quick batch.
const SIM_SEED = 42 // fixed seed -> byte-identical reruns (engine determinism).
const LANDPROB_SEED = 7
const LANDPROB_POOL_SIZE = 120 // only the draft-relevant top of the board.
const BOARD_DEPTH = 240 // top-N by ceiling the sim bids on (12 rosters x ~18 = 216 + slack).
const ME_OWNER = 'Rasar' // my seat in the ledger - excluded from the opponent pool.

const NASTIES_LEAGUE: League = {
  id: 'nasties-2026',
  userId: 'joe',
  name: 'The Nasties',
  platform: 'espn',
  format: 'auction',
  size: NUM_MANAGERS,
  budget: BUDGET,
  scoringFormat: 'ppr',
  rosterSlots: {
    qb: 1, rb: 1, wr: 1, te: 1, flex: 3, superflex: 0, k: 0, def: 1, bench: 5,
  },
}

/** Sim engine roster shape (uses `dst`, no superflex/k). */
const SIM_ROSTER: SimRosterConfig = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5,
}

/** Land-probability roster shape (DB RosterSlots: `dst` + `ir`). */
const LANDPROB_ROSTER = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5, ir: 0,
} as unknown as DbRosterSlots

// ─── Small helpers ───────────────────────────────────────────────────────────

const OUT_DIR = join(process.cwd(), 'research-output')
const r1 = (n: number): number => Math.round(n * 10) / 10
const pct = (n: number): string => `${Math.round(n * 1000) / 10}%`

/**
 * The strategy generator reads only name/position/consensusRank/
 * consensusAuctionValue off each player (priceBoard + assignTargetPrices). Player
 * satisfies that shape; this presents Player[] as the ConsensusPlayer[] the
 * signature asks for without inventing any data.
 */
function asConsensus(players: Player[]): ConsensusPlayer[] {
  return players as unknown as ConsensusPlayer[]
}

/** Me-seat bias from a strategy's named targets/avoids (keyed by player id). */
function biasFromStrategy(
  proposal: StrategyProposal,
  byName: Map<string, Player>,
): Record<string, GradedTagLike> {
  const map: Record<string, GradedTagLike> = {}
  for (const name of proposal.key_targets ?? []) {
    const p = byName.get(name.toLowerCase())
    if (p) map[p.id] = { tags: ['target'], tagWeight: 8 }
  }
  for (const name of proposal.key_avoids ?? []) {
    const p = byName.get(name.toLowerCase())
    if (p && !map[p.id]) map[p.id] = { tags: ['avoid'], tagSeverity: 'soft' }
  }
  return map
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
    )
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  console.log('[research-run] reading players_cache ...')
  const status = await getCacheStatus(supabase)
  const cached = await readPlayerCache(supabase)
  const players = cacheToPlayers(cached)
  console.log(
    `[research-run] ${players.length} players (cache last updated ${status.lastUpdated ?? 'unknown'}, stale=${status.isStale})`,
  )
  if (players.length === 0) throw new Error('players_cache is empty - run npm run data:pull first')

  const byName = new Map<string, Player>()
  for (const p of players) byName.set(p.name.toLowerCase(), p)

  // 1) STRATEGIES - full anchor-pattern sweep off the real board ($0). Every
  // pattern (RB-RB, WR-WR, RB-WR, hero-RB, zero-RB, elite-QB, elite-TE, triple-WR,
  // double-RB, balanced) crossed with heavy/even/light budget splits, deduped to
  // the genuinely distinct completable rosters this board supports.
  console.log('[research-run] sweeping strategy space ...')
  const stratResult = sweepStrategiesFromPool({
    league: NASTIES_LEAGUE,
    players: asConsensus(players),
  })
  console.log(`[research-run] ${stratResult.proposals.length} distinct strategies`)

  // 2) SIMS - Monte-Carlo record + modal rosters + landed, biased to each strategy.
  // Trim to the draft-relevant top of the board (by national ceiling) so the room
  // bids on studs, not the deep bench, and so opponent seats fill realistic rosters.
  const board = buildBoardPlayers(players, new Set<string>())
    .sort((a, b) => b.ceiling - a.ceiling)
    .slice(0, BOARD_DEPTH)

  // LEAGUE REPLICATION - the other 11 seats draft like the real Nasties owners
  // (each bids off the room price for the player's positional rank, scaled by that
  // owner's historical positional lean). Deterministic, $0, sourced from the ledger.
  const { profiles: opponentProfiles, ownerOrder } = buildOpponentProfiles({
    count: NUM_MANAGERS - 1,
    meOwner: ME_OWNER,
  })
  console.log(
    `[research-run] opponents replicated from ledger: ${ownerOrder.join(', ')}`,
  )

  // One sim input per strategy: the shared board + replicated room, biased to that
  // strategy's named targets. Reused by the pattern sweep and the stud-combo tier.
  const simInputFor = (proposal: StrategyProposal) => ({
    board,
    rosterConfig: SIM_ROSTER,
    numManagers: NUM_MANAGERS,
    budget: BUDGET,
    runs: SIM_RUNS,
    seed: SIM_SEED,
    myManagerIndex: 0,
    myBias: buildMyBiasFromTags(biasFromStrategy(proposal, byName)),
    opponentProfiles,
  })

  const strategies = stratResult.proposals.map((proposal, i) => {
    console.log(
      `[research-run]   sim ${i + 1}/${stratResult.proposals.length}: ${proposal.name} (${SIM_RUNS} runs)`,
    )
    const simInput = simInputFor(proposal)
    // AFTER: graded with the measured risk model on (durability + tier bust/breakout).
    const summary: SimSummary = buildSimSummary(simInput, { games: REGULAR_SEASON_GAMES })
    // BEFORE: same board/seed graded on the old "every stud plays every game at full
    // projection" basis, so the report can show exactly what the risk model changed.
    const summaryHealthy: SimSummary = buildSimSummary(simInput, {
      games: REGULAR_SEASON_GAMES,
      risk: false,
    })
    return { proposal, sim: summary, simHealthy: summaryHealthy }
  })

  // 2b) SPECIFIC STUD COMBOS - the "which exact players" tier. Within each anchor
  // pattern, enumerate concrete stud sets (Chase+Bijan vs Jefferson+Gibbs ...) and
  // sim-grade each with the risk model on, so the leaderboard names the pair/trio to
  // target, not just the shape. One graded sim each (risk on) to keep the batch quick.
  console.log('[research-run] enumerating specific stud combos ...')
  const { combos: studCombosRaw } = combosFromPool({
    league: NASTIES_LEAGUE,
    players: asConsensus(players),
  })
  console.log(`[research-run] ${studCombosRaw.length} specific stud combos`)
  const studCombos = studCombosRaw.map((combo, i) => {
    console.log(
      `[research-run]   combo sim ${i + 1}/${studCombosRaw.length}: ${combo.proposal.name} (${SIM_RUNS} runs)`,
    )
    const sim: SimSummary = buildSimSummary(simInputFor(combo.proposal), {
      games: REGULAR_SEASON_GAMES,
    })
    return { ...combo, sim }
  })

  // 3) LAND PROBABILITY - top of the board only, full board models the scarcity.
  console.log(`[research-run] land probability for top ${LANDPROB_POOL_SIZE} ...`)
  const landPool = [...players]
    .filter((p) => p.position !== 'K')
    .sort((a, b) => a.consensusRank - b.consensusRank)
    .slice(0, LANDPROB_POOL_SIZE)
  const landMap = new Map<string, number>()
  for (const onBlock of landPool) {
    const res = computeLandProbability({
      onBlockPlayer: onBlock,
      availablePlayers: players,
      draftedNames: new Set<string>(),
      rosterSlots: LANDPROB_ROSTER,
      myPicks: [],
      numManagers: NUM_MANAGERS,
      budget: BUDGET,
      seed: LANDPROB_SEED,
    })
    if (res) landMap.set(onBlock.id, res.probability)
  }

  // 4) PER-PLAYER ENRICHMENT - band, tags, the "read", land odds.
  const enriched = players.map((p) => ({
    id: p.id,
    name: p.name,
    team: p.team,
    position: p.position,
    byeWeek: p.byeWeek,
    injuryStatus: p.injuryStatus ?? null,
    consensusRank: p.consensusRank,
    adp: p.adp,
    consensusAuctionValue: p.consensusAuctionValue,
    ceilingValue: p.ceilingValue ?? null,
    expectedRoomPrice: p.expectedRoomPrice ?? null,
    valueGap: p.valueGap ?? null,
    projectedPoints: p.projectedPoints ?? null,
    vorp: p.vorp ?? null,
    expertTier: p.expertTier ?? null,
    ecrPositionRank: p.ecrPositionRank ?? null,
    valueBand: computeValueRange(p),
    tags: computePlayerTags(p),
    read: computeRecommendation(p),
    landProbability: landMap.has(p.id) ? landMap.get(p.id)! : null,
  }))

  // 5) LEAGUE INTEL - the Nasties ledger that grounds the advice.
  const leagueIntel = {
    era: CALIBRATION_ERA,
    draftsUsed: CALIBRATION_DRAFTS_USED,
    positionalInflation: allPositionalInflation(),
    ownerLeans: allOwnerLeans(),
    // The 11 simulated opponents, in seat order - each a real ledger owner whose
    // positional leans drove their bids in every strategy sim above.
    replicatedOpponents: ownerOrder,
  }

  // ── Write artifacts ─────────────────────────────────────────────────────────
  mkdirSync(OUT_DIR, { recursive: true })

  const dataset: ResearchDataset = {
    meta: {
      generatedAt: new Date().toISOString(),
      league: NASTIES_LEAGUE.name,
      playerCount: players.length,
      simRunsPerStrategy: SIM_RUNS,
      simSeed: SIM_SEED,
      regularSeasonGames: REGULAR_SEASON_GAMES,
      cacheLastUpdated: status.lastUpdated,
      cacheStale: status.isStale,
      note: 'All values come from pure, deterministic engine functions over the fresh players_cache. No LLM, no fabrication.',
    },
    league: NASTIES_LEAGUE,
    leagueIntel,
    strategies: strategies.map((s) => ({
      proposal: s.proposal,
      sim: toPersistedSim(s.sim),
    })),
    studCombos: studCombos.map((c) => ({
      patternKey: c.patternKey,
      patternLabel: c.patternLabel,
      anchorNames: c.anchorNames,
      proposal: c.proposal,
      sim: toPersistedSim(c.sim),
    })),
    players: enriched,
  }
  writeFileSync(join(OUT_DIR, 'dataset.json'), JSON.stringify(dataset, null, 2), 'utf-8')

  writeFileSync(join(OUT_DIR, 'report.md'), buildReport(dataset, enriched, strategies, studCombos), 'utf-8')

  console.log(`[research-run] wrote research-output/dataset.json + report.md`)
}

// ─── Human report ────────────────────────────────────────────────────────────

type Enriched = ReturnType<typeof buildEnrichedType>
// helper only for the type above; never called.
function buildEnrichedType() {
  return {
    id: '', name: '', team: '', position: 'RB' as Position, byeWeek: 0,
    injuryStatus: null as string | null, consensusRank: 0, adp: 0,
    consensusAuctionValue: 0, ceilingValue: null as number | null,
    expectedRoomPrice: null as number | null, valueGap: null as number | null,
    projectedPoints: null as number | null, vorp: null as number | null,
    expertTier: null as number | null, ecrPositionRank: null as number | null,
    valueBand: computeValueRange({} as Player), tags: computePlayerTags({} as Player),
    read: computeRecommendation({} as Player), landProbability: null as number | null,
  }
}

type StudComboGraded = StudCombo & { sim: SimSummary }

function buildReport(
  dataset: { meta: DatasetMeta; leagueIntel: ReturnType<typeof buildIntelType> },
  players: Enriched[],
  strategies: Array<{ proposal: StrategyProposal; sim: SimSummary; simHealthy: SimSummary }>,
  studCombos: StudComboGraded[],
): string {
  const L: string[] = []
  const meta = dataset.meta

  L.push('# The Nasties - Draft Research Dataset')
  L.push('')
  L.push(`Generated ${meta.generatedAt}. 12-team, $${BUDGET} auction, full PPR, no kicker.`)
  L.push(`Roster: QB1, RB1, WR1, TE1, FLEX3, DEF1, Bench5.`)
  L.push(`Players: ${meta.playerCount}. Cache last updated ${meta.cacheLastUpdated} (stale=${meta.cacheStale}).`)
  L.push(`Sims: ${meta.simRunsPerStrategy} Monte-Carlo runs per strategy, ${REGULAR_SEASON_GAMES}-game season, seed ${meta.simSeed}.`)
  L.push('')

  // ── Strategy leaderboard ────────────────────────────────────────────────────
  L.push('## Strategy leaderboard (which approach wins, and why)')
  L.push('')
  const ranked = [...strategies].sort((a, b) => b.sim.grade.meanWins - a.sim.grade.meanWins)
  L.push('| # | Strategy | Proj record | Modal record | Mean starter pts | Ceiling / Floor |')
  L.push('|---|----------|-------------|--------------|------------------|-----------------|')
  ranked.forEach((s, i) => {
    const g = s.sim.grade
    L.push(
      `| ${i + 1} | ${s.proposal.name} | ${r1(g.meanWins)}-${r1(g.meanLosses)} | ${g.modalRecord.wins}-${g.modalRecord.losses} (${g.modalRecord.frequencyPct}%) | ${r1(g.meanStarterPoints)} | $${s.proposal.projected_ceiling} / $${s.proposal.projected_floor} |`,
    )
  })
  L.push('')
  L.push('_Records above are graded with the measured risk model ON (real per-player')
  L.push('durability + tier bust/breakout from 15 seasons of Sleeper actuals)._')
  L.push('')

  // ── Before/after: what the risk model changed ────────────────────────────────
  L.push('## Before/after: what the risk model did to each strategy')
  L.push('')
  L.push('BEFORE grades every drafted player as if he plays all 14 games at his full')
  L.push('projection (the old basis that made "spend on two studs" look unbeatable).')
  L.push('AFTER applies the measured model. A bigger drop = a strategy the old grader')
  L.push('flattered because it never priced in that studs bust or miss time.')
  L.push('')
  const risked = [...strategies].sort((a, b) => b.sim.grade.meanWins - a.sim.grade.meanWins)
  L.push('| # | Strategy | Before (healthy) | After (risk on) | Wins lost to risk |')
  L.push('|---|----------|------------------|-----------------|-------------------|')
  risked.forEach((s, i) => {
    const before = s.simHealthy.grade
    const after = s.sim.grade
    const delta = before.meanWins - after.meanWins
    L.push(
      `| ${i + 1} | ${s.proposal.name} | ${r1(before.meanWins)}-${r1(before.meanLosses)} | ${r1(after.meanWins)}-${r1(after.meanLosses)} | ${delta >= 0 ? '-' : '+'}${r1(Math.abs(delta))} |`,
    )
  })
  L.push('')
  {
    const before = [...strategies].sort((a, b) => b.simHealthy.grade.meanWins - a.simHealthy.grade.meanWins)
    const after = [...strategies].sort((a, b) => b.sim.grade.meanWins - a.sim.grade.meanWins)
    L.push(`Healthy-basis winner: **${before[0].proposal.name}** (${r1(before[0].simHealthy.grade.meanWins)} wins).`)
    L.push(`Risk-adjusted winner: **${after[0].proposal.name}** (${r1(after[0].sim.grade.meanWins)} wins).`)
    L.push(
      before[0].proposal.name === after[0].proposal.name
        ? `The top strategy is unchanged once risk is priced in.`
        : `The top strategy CHANGES once risk is priced in: "${before[0].proposal.name}" no longer leads.`,
    )
    L.push('')
  }

  // ── Per-strategy detail ─────────────────────────────────────────────────────
  ranked.forEach((s, i) => {
    const p = s.proposal
    const g = s.sim.grade
    L.push(`### ${i + 1}. ${p.name}  (${p.archetype}, ${p.risk_tolerance} risk)`)
    L.push('')
    L.push(p.description)
    L.push('')
    L.push(`- Projected record: ${r1(g.meanWins)}-${r1(g.meanLosses)} (best ${g.bestRecord.wins}-${g.bestRecord.losses}, worst ${g.worstRecord.wins}-${g.worstRecord.losses}).`)
    L.push(`- Why: ${p.reasoning}`)
    if (p.philosophy) L.push(`- Philosophy: ${p.philosophy}`)
    if (p.budget_allocation) {
      const alloc = Object.entries(p.budget_allocation)
        .map(([k, v]) => `${k} ${v}%`)
        .join(', ')
      L.push(`- Budget split: ${alloc}.`)
    }
    // Target prices (solver-fit so the full roster completes within $200).
    const tp = p.target_pricing
    if (tp && tp.prices.length > 0) {
      const line = tp.prices.map((t) => {
        // When durability haircut the price, show the room anchor + factor so the
        // discount is explicit ("$60 (room $67, 0.89x)"), not a silent markdown.
        const cut =
          t.durabilityFactor !== undefined && t.durabilityFactor < 1 && t.baseValue > t.price
            ? ` (room $${t.baseValue}, ${t.durabilityFactor.toFixed(2)}x durability)`
            : ''
        return `${t.name} $${t.price}${cut} (win by $${t.walkUp})`
      }).join(', ')
      L.push(`- Target prices (durability-adjusted expect / walk-up to win): ${line}.`)
      L.push(`  Targets $${tp.targetTotal} + reserve $${tp.reserve} = $${tp.total} of $${tp.budget} (${tp.fits ? 'completable' : 'OVER BUDGET'}).`)
    } else if (p.key_targets?.length) {
      L.push(`- Key targets: ${p.key_targets.join(', ')}.`)
    }
    if (p.key_avoids?.length) L.push(`- Avoid: ${p.key_avoids.join(', ')}.`)

    // Most common roster shapes this strategy produced.
    if (s.sim.topRosters.length > 0) {
      L.push('')
      L.push('  Most common roster cores this strategy landed:')
      s.sim.topRosters.slice(0, 3).forEach((tr) => {
        const core = tr.coreNames.length ? tr.coreNames.join(' + ') : '(all cheap, no stud core)'
        L.push(`  - ${tr.frequencyPct}% of drafts: ${core} - avg spend $${tr.avgSpent}, avg record ${r1(tr.avgWins)}-${r1(REGULAR_SEASON_GAMES - tr.avgWins)}.`)
      })
    }
    // Players this strategy lands most often.
    const topLanded = s.sim.landed.filter((l) => l.landRate >= 0.15).slice(0, 8)
    if (topLanded.length > 0) {
      L.push('')
      L.push('  Players you land most:')
      topLanded.forEach((l) => {
        L.push(`  - ${l.name} (${l.position}): ${pct(l.landRate)} of drafts, avg $${Math.round(l.avgPrice)}.`)
      })
    }
    L.push('')
  })

  // ── Specific stud combos (which exact players to target) ─────────────────────
  if (studCombos.length > 0) {
    L.push('## Specific stud combos (which exact players to target)')
    L.push('')
    L.push('The strategy leaderboard above says which SHAPE wins. This tier says which')
    L.push('exact studs to buy inside each shape. Every combo is a completable $200')
    L.push('roster (the named anchors forced in, the rest filled at room price) graded')
    L.push('with the risk model on. Grouped by pattern, best projected record first.')
    L.push('')

    // Overall combo leaderboard - the single best specific pairs/trios on the board.
    const comboRanked = [...studCombos].sort((a, b) => b.sim.grade.meanWins - a.sim.grade.meanWins)
    L.push('### Top combos overall')
    L.push('')
    L.push('| # | Anchors | Pattern | Proj record | Mean starter pts |')
    L.push('|---|---------|---------|-------------|------------------|')
    comboRanked.slice(0, 12).forEach((c, i) => {
      const g = c.sim.grade
      L.push(
        `| ${i + 1} | ${c.anchorNames.join(' + ')} | ${c.patternLabel} | ${r1(g.meanWins)}-${r1(g.meanLosses)} | ${r1(g.meanStarterPoints)} |`,
      )
    })
    L.push('')

    // Per-pattern breakout so Joe can compare pairs within one shape head to head.
    const byPattern = new Map<string, StudComboGraded[]>()
    for (const c of studCombos) {
      const list = byPattern.get(c.patternKey) ?? []
      list.push(c)
      byPattern.set(c.patternKey, list)
    }
    for (const [, list] of byPattern) {
      const sorted = [...list].sort((a, b) => b.sim.grade.meanWins - a.sim.grade.meanWins)
      L.push(`### ${sorted[0].patternLabel}`)
      L.push('')
      sorted.forEach((c) => {
        const g = c.sim.grade
        const tp = c.proposal.target_pricing
        const priceStr = tp && tp.prices.length > 0
          ? ` - target ${tp.prices.slice(0, c.anchorNames.length).map((t) => `${t.name} $${t.price}`).join(', ')}`
          : ''
        L.push(
          `- **${c.anchorNames.join(' + ')}**: ${r1(g.meanWins)}-${r1(g.meanLosses)}, ${r1(g.meanStarterPoints)} starter pts${priceStr}.`,
        )
      })
      L.push('')
    }

    // Honest coverage note: anchor patterns whose elite studs cannot co-exist under
    // $200 at room price produce no combo at all. That is a real finding, not a gap.
    const covered = new Set(studCombos.map((c) => c.patternKey))
    const infeasible = SWEEP_PATTERNS
      .filter((p) => p.studPositions.length > 0 && !covered.has(p.key))
      .map((p) => p.label)
    if (infeasible.length > 0) {
      L.push(`_No affordable elite combo: ${infeasible.join(', ')}. The top studs at`)
      L.push(`those positions cost more than $200 combined at room price, so no concrete`)
      L.push(`elite combination completes a $200 roster - the room prices these shapes out._`)
      L.push('')
    }
  }

  // ── League intel ────────────────────────────────────────────────────────────
  L.push('## League intel (Nasties ledger)')
  L.push('')
  L.push(`Derived from ${dataset.leagueIntel.draftsUsed} drafts (${CALIBRATION_ERA.join(', ')}).`)
  L.push('')
  L.push(
    `Simulated opponents (11 seats, real ledger owners drafting to their leans): ${dataset.leagueIntel.replicatedOpponents.join(', ')}.`,
  )
  L.push('')
  L.push('Positional inflation (where the room over- or under-pays vs national):')
  L.push('')
  L.push('| Pos | Room share | National | Multiplier | Read |')
  L.push('|-----|-----------|----------|-----------|------|')
  for (const [pos, inf] of Object.entries(dataset.leagueIntel.positionalInflation)) {
    L.push(`| ${pos} | ${r1(inf.sharePct)}% | ${r1(inf.nationalPct)}% | ${r1(inf.multiplier)}x | ${inf.tag} |`)
  }
  L.push('')

  // ── Top targets by position with the read ───────────────────────────────────
  L.push('## Top targets by position (with the read)')
  L.push('')
  const positions: Position[] = ['QB', 'RB', 'WR', 'TE', 'DEF']
  for (const pos of positions) {
    const top = players
      .filter((p) => p.position === pos)
      .sort((a, b) => (b.ceilingValue ?? 0) - (a.ceilingValue ?? 0))
      .slice(0, pos === 'QB' || pos === 'TE' || pos === 'DEF' ? 6 : 10)
    if (top.length === 0) continue
    L.push(`### ${pos}`)
    L.push('')
    for (const p of top) {
      const band = p.valueBand
      const bandStr = band.low === band.high ? `$${band.base}` : `$${band.low}-$${band.high} (base $${band.base})`
      const tags = p.tags.map((t) => t.label).join(', ')
      const land = p.landProbability != null ? `, land odds ${pct(p.landProbability)}` : ''
      const bandSrc = band.source === 'league' ? 'league band' : band.source === 'national' ? 'national band' : 'point'
      L.push(`- **${p.name}** (${p.team}, bye ${p.byeWeek}) - ${bandStr} ${bandSrc}${land}.`)
      L.push(`  ${p.read.line}${tags ? `  [${tags}]` : ''}`)
    }
    L.push('')
  }

  // ── Breakouts / pockets / sleepers ──────────────────────────────────────────
  const pockets = players
    .filter((p) => p.tags.some((t) => t.id === 'pocket' || t.id === 'sleeper'))
    .sort((a, b) => (b.valueGap ?? 0) - (a.valueGap ?? 0))
  L.push('## Value pockets and sleepers (win them below the room)')
  L.push('')
  if (pockets.length === 0) L.push('_None flagged._')
  for (const p of pockets.slice(0, 25)) {
    const tags = p.tags.map((t) => t.label).join(', ')
    L.push(`- **${p.name}** (${p.position}, ${p.team}) - ${p.read.line}  [${tags}]`)
  }
  L.push('')

  // ── Tax / avoid ─────────────────────────────────────────────────────────────
  const taxes = players
    .filter((p) => p.tags.some((t) => t.id === 'tax'))
    .sort((a, b) => (a.valueGap ?? 0) - (b.valueGap ?? 0))
  L.push('## Room tax (let someone else overpay)')
  L.push('')
  if (taxes.length === 0) L.push('_None flagged._')
  for (const p of taxes.slice(0, 20)) {
    L.push(`- **${p.name}** (${p.position}, ${p.team}) - ${p.read.line}`)
  }
  L.push('')

  L.push('---')
  L.push('')
  L.push('Full machine-readable data (every player, every strategy sim, league intel) is in `dataset.json`.')
  L.push('')
  return L.join('\n')
}

// type-only helper for leagueIntel shape in buildReport's signature
function buildIntelType() {
  return {
    era: [] as number[],
    draftsUsed: 0,
    positionalInflation: allPositionalInflation(),
    ownerLeans: allOwnerLeans(),
    replicatedOpponents: [] as string[],
  }
}

main().catch((err) => {
  console.error('[research-run] FAILED:', err)
  process.exit(1)
})
