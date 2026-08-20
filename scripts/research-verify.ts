/**
 * research-verify.ts — dataset sanity-verifier (Phase 2 validation).
 *
 * Reads the artifact `research-run.ts` produced (research-output/dataset.json) and
 * asserts every invariant that would tell us the numbers are trustworthy BEFORE
 * Joe interrogates them. It runs no engine code and hits no network: it audits the
 * finished dataset the way an independent reviewer would, then fails loud (exit 1)
 * on any violation so a bad run can never be quietly trusted.
 *
 * Checks, in Joe's words:
 *   - no fabricated free players: ranked, draftable players carry real worth (>= $1)
 *   - completable rosters: each strategy's target prices + reserve fit inside $200
 *   - honest odds: every land probability sits in [0, 1]
 *   - a real season: sim win-loss totals always add up to the 14-game schedule
 *   - the board makes sense: an elite is near the top, every position is covered
 *
 * Usage: npm run research:verify   (tsx scripts/research-verify.ts)
 * Copy rule (Joe): plain English, NO em/en dashes anywhere in surfaced strings.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

// ─── Tiny assert harness (collects, never throws mid-run) ────────────────────

const failures: string[] = []
const passes: string[] = []

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passes.push(label)
  } else {
    failures.push(detail ? `${label} -> ${detail}` : label)
  }
}

// ─── Load the artifact ───────────────────────────────────────────────────────

const DATASET_PATH = join(process.cwd(), 'research-output', 'dataset.json')

let dataset: {
  meta: {
    playerCount: number
    regularSeasonGames: number
    simRunsPerStrategy: number
    cacheStale: boolean
  }
  league: { budget: number; numManagers: number }
  leagueIntel: {
    positionalInflation: Record<string, { tag: string; multiplier: number }>
    replicatedOpponents: string[]
  }
  strategies: Array<{
    proposal: {
      name: string
      key_targets: string[]
      target_pricing: { budget: number; total: number; targetTotal: number; reserve: number; fits: boolean }
    }
    sim: {
      grade: {
        games: number
        meanWins: number
        meanLosses: number
        modalRecord: { wins: number; losses: number }
        bestRecord: { wins: number; losses: number }
        worstRecord: { wins: number; losses: number }
      }
      landed: Array<{ name: string; landRate: number; avgPrice: number }>
    }
  }>
  players: Array<{
    name: string
    position: string
    consensusRank: number
    consensusAuctionValue: number
    ceilingValue: number
    expectedRoomPrice: number
    landProbability: number
    valueBand: { low: number; base: number; high: number } | null
  }>
}

try {
  dataset = JSON.parse(readFileSync(DATASET_PATH, 'utf-8'))
} catch (e) {
  console.error(`\n  FAIL: could not read ${DATASET_PATH}`)
  console.error(`  Run "npm run research:run" first. (${(e as Error).message})\n`)
  process.exit(1)
}

const { meta, league, leagueIntel, strategies, players } = dataset
const GAMES = meta.regularSeasonGames
const BUDGET = league.budget

// ─── 1. Structure and freshness ──────────────────────────────────────────────

check('dataset has players', players.length > 0, `got ${players.length}`)
check('meta.playerCount matches players array', meta.playerCount === players.length,
  `meta ${meta.playerCount} vs array ${players.length}`)
check('cache was not stale at run time', meta.cacheStale === false)
check('at least one strategy generated', strategies.length > 0, `got ${strategies.length}`)

// ─── 2. No fabricated free players (ranked, draftable => real worth) ──────────

// The draftable pool is roughly the top ~13 * 12 = 156 by rank; audit the top 150.
const draftable = players.filter((p) => p.consensusRank <= 150)
const freeRanked = draftable.filter((p) => !(p.ceilingValue >= 1) || !(p.expectedRoomPrice >= 1))
check('no draftable player is priced as free ($0 ceiling or room price)',
  freeRanked.length === 0,
  freeRanked.slice(0, 5).map((p) => `${p.name} ceil=${p.ceilingValue} room=${p.expectedRoomPrice}`).join('; '))

const badBands = players.filter(
  (p) => p.valueBand && !(p.valueBand.low <= p.valueBand.base && p.valueBand.base <= p.valueBand.high),
)
check('every value band is ordered low <= base <= high', badBands.length === 0,
  badBands.slice(0, 5).map((p) => `${p.name} ${JSON.stringify(p.valueBand)}`).join('; '))

// ─── 3. Honest odds: land probability in [0, 1] ──────────────────────────────

const badProb = players.filter((p) => !(p.landProbability >= 0 && p.landProbability <= 1))
check('every land probability is within [0, 1]', badProb.length === 0,
  badProb.slice(0, 5).map((p) => `${p.name}=${p.landProbability}`).join('; '))

const badLandRate = strategies.flatMap((s) =>
  s.sim.landed.filter((l) => !(l.landRate >= 0 && l.landRate <= 1)),
)
check('every simulated land rate is within [0, 1]', badLandRate.length === 0,
  badLandRate.slice(0, 5).map((l) => `${l.name}=${l.landRate}`).join('; '))

// ─── 4. Completable rosters: target prices + reserve fit inside the budget ────

for (const s of strategies) {
  const tp = s.proposal.target_pricing
  const label = `strategy "${s.proposal.name}"`
  check(`${label}: target prices are self-consistent (total = targets + reserve)`,
    tp.total === tp.targetTotal + tp.reserve,
    `total ${tp.total} vs ${tp.targetTotal}+${tp.reserve}`)
  check(`${label}: roster is completable within $${BUDGET}`,
    tp.total <= BUDGET && tp.fits === true,
    `total ${tp.total}, fits ${tp.fits}`)
  check(`${label}: has at least one key target`, s.proposal.key_targets.length > 0)
}

// ─── 5. A real season: win-loss totals equal the schedule length ─────────────

for (const s of strategies) {
  const g = s.sim.grade
  const label = `strategy "${s.proposal.name}"`
  check(`${label}: sim ran the ${GAMES}-game schedule`, g.games === GAMES, `games ${g.games}`)
  check(`${label}: modal record sums to ${GAMES}`, g.modalRecord.wins + g.modalRecord.losses === GAMES,
    `${g.modalRecord.wins}-${g.modalRecord.losses}`)
  check(`${label}: best record sums to ${GAMES}`, g.bestRecord.wins + g.bestRecord.losses === GAMES,
    `${g.bestRecord.wins}-${g.bestRecord.losses}`)
  check(`${label}: worst record sums to ${GAMES}`, g.worstRecord.wins + g.worstRecord.losses === GAMES,
    `${g.worstRecord.wins}-${g.worstRecord.losses}`)
  check(`${label}: mean wins+losses ~= ${GAMES}`, Math.abs(g.meanWins + g.meanLosses - GAMES) < 0.01,
    `${g.meanWins}+${g.meanLosses}`)
  // Believable, not a deterministic sweep: the best strategy should not win every game on average.
  check(`${label}: projected record is believable (not a ${GAMES}-0 sweep)`, g.meanWins < GAMES,
    `meanWins ${g.meanWins}`)
}

// ─── 6. The board makes sense: elite near the top, positions covered ─────────

const positions = new Set(players.map((p) => p.position))
for (const pos of ['QB', 'RB', 'WR', 'TE', 'DEF']) {
  check(`board covers ${pos}`, positions.has(pos))
}
check('board has no kicker (no-K league)', !positions.has('K'))

const top = [...players].sort((a, b) => a.consensusRank - b.consensusRank)[0]
check('the #1-ranked player carries an elite ceiling (>= $40)', top.ceilingValue >= 40,
  `${top.name} ceiling ${top.ceilingValue}`)

// League intel grounding (the exploit map the reads lean on).
check('positional inflation flags WR or TE as HOT',
  ['WR', 'TE'].some((p) => leagueIntel.positionalInflation[p]?.tag === 'HOT'))
check('opponents were replicated from the real ledger', leagueIntel.replicatedOpponents.length > 0,
  `${leagueIntel.replicatedOpponents.length} seats`)

// ─── Report ──────────────────────────────────────────────────────────────────

console.log('\n  Dataset sanity check: research-output/dataset.json')
console.log(`  Players ${players.length}, strategies ${strategies.length}, season ${GAMES} games, budget $${BUDGET}.`)
console.log(`  Opponents replicated: ${leagueIntel.replicatedOpponents.join(', ')}.\n`)

for (const p of passes) console.log(`  PASS  ${p}`)
if (failures.length > 0) {
  console.log('')
  for (const f of failures) console.log(`  FAIL  ${f}`)
}

console.log(`\n  ${passes.length} passed, ${failures.length} failed.\n`)
process.exit(failures.length === 0 ? 0 : 1)
