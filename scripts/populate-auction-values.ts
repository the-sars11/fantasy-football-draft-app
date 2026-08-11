/**
 * Populate REAL, roster-aware, budget-balanced auction values for Joe's exact
 * league (The Nasties): 12 teams, $200 budget, FULL PPR, no kicker.
 *
 * Roster (draftable): QB1, RB1, WR1, TE1, FLEX3 (RB/WR/TE), DEF1, Bench5 = 13.
 * 12 teams x 13 = 156 total draftable spots. Budget pool = 12 x $200 = $2,400.
 *
 * The math (VORP = Value Over Replacement Player):
 *   1. Projected points  -> ESPN 2026 FULL-PPR season projections (verified:
 *      receptions=1.0, passTD=4, rushTD/recTD=6). appliedTotal is per-game, so
 *      season = perGame x 17.
 *   2. Replacement level  -> for each position, the points of the first player
 *      who will NOT start across the league, given Joe's exact roster. Base
 *      starters = 12 each (QB/RB/WR/TE/DST). The 36 FLEX slots go to whichever
 *      RB/WR/TE are the best remaining -> that decides how many extra RB vs WR
 *      vs TE get started. THIS is what makes the values league-specific.
 *   3. VORP_i = max(0, seasonPoints_i - replacementPoints[pos_i]).
 *   4. Dollars (balanced): every rostered spot costs >= $1 (156 x $1 = $156).
 *      The remaining $2,244 is split in proportion to VORP:
 *         price_i = $1 + VORP_i * ($2,400 - $156) / sum(VORP over drafted pool)
 *      Prices of the top 156 sum to exactly $2,400.
 *
 * Nothing is fabricated: every point total traces to ESPN's projected stat line;
 * every dollar traces to VORP under Joe's roster + budget.
 *
 * Writes into existing players_cache rows (matched by name / DST team), merging
 * new keys without clobbering the FantasyPros ECR data already there.
 *
 * Usage: npx tsx scripts/populate-auction-values.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

function loadEnvLocal() {
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
  } catch {}
}
loadEnvLocal()

// ---- League constants (Joe's Nasties) --------------------------------------
const SEASON = 2026
const TEAMS = 12
const BUDGET = 200
const GAMES = 17
const TOTAL_POOL = TEAMS * BUDGET // 2400
// Base starters per position across the league
const BASE: Record<string, number> = { QB: TEAMS, RB: TEAMS, WR: TEAMS, TE: TEAMS, DST: TEAMS }
const FLEX_TOTAL = 3 * TEAMS // 36 flex slots, RB/WR/TE eligible
const FLEX_POS = new Set(['RB', 'WR', 'TE'])
const ROSTER_SPOTS = TEAMS * 13 // 156 draftable spots

// ---- ESPN ------------------------------------------------------------------
const ESPN_BASE = 'https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl'
const POS: Record<number, string> = { 1: 'QB', 2: 'RB', 3: 'WR', 4: 'TE', 5: 'K', 16: 'DST' }
const ESPN_TEAM: Record<number, string> = {
  1: 'ATL', 2: 'BUF', 3: 'CHI', 4: 'CIN', 5: 'CLE', 6: 'DAL', 7: 'DEN', 8: 'DET', 9: 'GB',
  10: 'TEN', 11: 'IND', 12: 'KC', 13: 'LV', 14: 'LAR', 15: 'MIA', 16: 'MIN', 17: 'NE', 18: 'NO',
  19: 'NYG', 20: 'NYJ', 21: 'PHI', 22: 'ARI', 23: 'PIT', 24: 'LAC', 25: 'SF', 26: 'SEA', 27: 'TB',
  28: 'WAS', 29: 'CAR', 30: 'JAX', 33: 'BAL', 34: 'HOU',
}

interface EspnPlayer {
  name: string
  pos: string
  team: string | null
  seasonPoints: number
  espnAuction: number | null
}

async function fetchEspn(): Promise<EspnPlayer[]> {
  const url = new URL(`${ESPN_BASE}/seasons/${SEASON}/segments/0/leaguedefaults/3`)
  url.searchParams.set('scoringPeriodId', '0')
  url.searchParams.set('view', 'kona_player_info')
  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'x-fantasy-filter': JSON.stringify({
        players: {
          filterSlotIds: { value: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24] },
          sortPercOwned: { sortPriority: 2, sortAsc: false },
          limit: 700,
          offset: 0,
        },
      }),
    },
  })
  if (!res.ok) throw new Error(`ESPN ${res.status} ${res.statusText}`)
  const data = (await res.json()) as { players?: any[] }
  const out: EspnPlayer[] = []
  for (const entry of data.players ?? []) {
    const p = entry.playerPoolEntry?.player || entry.player
    if (!p) continue
    const pos = POS[p.defaultPositionId]
    if (!pos || pos === 'K') continue // no kicker
    const proj = (p.stats || []).find((s: any) => s.statSplitTypeId === 1 && s.seasonId === SEASON)
    const perGame = typeof proj?.appliedTotal === 'number' ? proj.appliedTotal : 0
    if (perGame <= 0) continue
    out.push({
      name: p.fullName,
      pos,
      team: ESPN_TEAM[p.proTeamId] ?? null,
      seasonPoints: Math.round(perGame * GAMES * 10) / 10,
      espnAuction: p.ownership?.auctionValueAverage ?? null,
    })
  }
  return out
}

// ---- Replacement levels (roster-aware) -------------------------------------
function computeReplacement(players: EspnPlayer[]): Record<string, number> {
  const byPos: Record<string, EspnPlayer[]> = {}
  for (const p of players) (byPos[p.pos] ??= []).push(p)
  for (const pos of Object.keys(byPos)) byPos[pos].sort((a, b) => b.seasonPoints - a.seasonPoints)

  // Flex pool = RB/WR/TE beyond their base-12; best 36 get started as flex.
  const flexPool: EspnPlayer[] = []
  for (const pos of FLEX_POS) flexPool.push(...(byPos[pos] ?? []).slice(BASE[pos]))
  flexPool.sort((a, b) => b.seasonPoints - a.seasonPoints)
  const flexFillers = flexPool.slice(0, FLEX_TOTAL)
  const flexCount: Record<string, number> = { RB: 0, WR: 0, TE: 0 }
  for (const p of flexFillers) flexCount[p.pos]++

  const starters: Record<string, number> = {
    QB: BASE.QB,
    DST: BASE.DST,
    RB: BASE.RB + flexCount.RB,
    WR: BASE.WR + flexCount.WR,
    TE: BASE.TE + flexCount.TE,
  }
  const replacement: Record<string, number> = {}
  for (const pos of Object.keys(starters)) {
    const arr = byPos[pos] ?? []
    const idx = starters[pos] // first NON-starter (0-based index = count of starters)
    replacement[pos] = arr[idx]?.seasonPoints ?? arr[arr.length - 1]?.seasonPoints ?? 0
  }
  console.log('Flex allocation (best 36 RB/WR/TE):', JSON.stringify(flexCount))
  console.log('Starters per position:', JSON.stringify(starters))
  console.log('Replacement points per position:')
  for (const pos of Object.keys(replacement)) console.log(`  ${pos}: ${replacement[pos].toFixed(1)}`)
  return replacement
}

// ---- Name normalization for matching ---------------------------------------
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.'']/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: Supabase env vars not set in .env.local')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  console.log(`Fetching ESPN ${SEASON} full-PPR projections...`)
  const espn = await fetchEspn()
  const counts: Record<string, number> = {}
  for (const p of espn) counts[p.pos] = (counts[p.pos] || 0) + 1
  console.log(`  ${espn.length} players with projected points. By pos: ${JSON.stringify(counts)}\n`)

  const replacement = computeReplacement(espn)

  // VORP per ESPN player
  const withVorp = espn.map((p) => ({
    ...p,
    vorp: Math.max(0, p.seasonPoints - (replacement[p.pos] ?? 0)),
  }))

  // Dollar scalar: distribute ($2,400 - $156) across the drafted pool by VORP.
  // Denominator = sum of VORP over the top ROSTER_SPOTS players (the ones that
  // actually get drafted). Everyone rostered also gets the $1 floor.
  const byVorpDesc = [...withVorp].sort((a, b) => b.vorp - a.vorp)
  const draftedPool = byVorpDesc.slice(0, ROSTER_SPOTS)
  const sumVorp = draftedPool.reduce((s, p) => s + p.vorp, 0)
  const discretionary = TOTAL_POOL - ROSTER_SPOTS * 1 // 2400 - 156 = 2244
  const scalar = sumVorp > 0 ? discretionary / sumVorp : 0
  console.log(`\nDollar model: sumVORP(top ${ROSTER_SPOTS}) = ${sumVorp.toFixed(1)}, scalar = $${scalar.toFixed(4)}/VORP`)

  const priceOf = (vorp: number) => Math.max(1, Math.round(1 + vorp * scalar))

  // Sanity: raw (unrounded) prices of top 156 must sum to exactly $2,400.
  const rawTotal = draftedPool.reduce((s, p) => s + (1 + p.vorp * scalar), 0)
  const roundedTop = draftedPool.reduce((s, p) => s + priceOf(p.vorp), 0)
  console.log(`Balance check: raw top-${ROSTER_SPOTS} sum = $${rawTotal.toFixed(0)} (target $${TOTAL_POOL}); rounded sum = $${roundedTop}`)

  // ---- Match to existing players_cache rows --------------------------------
  console.log('\nLoading players_cache rows...')
  const existing: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('players_cache')
      .select('id, name, team, position, adp, auction_values, projections, source_data')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    existing.push(...data)
    if (data.length < 1000) break
  }
  console.log(`  ${existing.length} cache rows loaded`)

  const byName = new Map<string, any>()
  const byTeamDst = new Map<string, any>()
  for (const row of existing) {
    byName.set(norm(row.name), row)
    if (row.position === 'DST' && row.team) byTeamDst.set(norm(row.team), row)
  }

  // Build patches
  const patches: { id: string; auction_values: any; projections: any; source_data: any }[] = []
  const posRankByPos: Record<string, number> = {}
  const sortedForRank = [...withVorp].sort((a, b) => b.seasonPoints - a.seasonPoints)
  const posRankMap = new Map<EspnPlayer, number>()
  for (const p of sortedForRank) {
    posRankByPos[p.pos] = (posRankByPos[p.pos] || 0) + 1
    posRankMap.set(p, posRankByPos[p.pos])
  }

  let matched = 0
  const unmatched: string[] = []
  for (const p of withVorp) {
    let row = byName.get(norm(p.name))
    if (!row && p.pos === 'DST' && p.team) row = byTeamDst.get(norm(p.team))
    if (!row) {
      unmatched.push(`${p.name} (${p.pos})`)
      continue
    }
    matched++
    const price = priceOf(p.vorp)
    patches.push({
      id: row.id,
      auction_values: { ...(row.auction_values || {}), vorp_12_200_ppr: price },
      projections: { ...(row.projections || {}), points: p.seasonPoints },
      source_data: {
        ...(row.source_data || {}),
        proj_points: p.seasonPoints,
        vorp: Math.round(p.vorp * 10) / 10,
        vorp_auction_value: price,
        pos_rank_points: posRankMap.get(p) ?? null,
        replacement_points: Math.round((replacement[p.pos] ?? 0) * 10) / 10,
        espn_auction_value: p.espnAuction,
      },
    })
  }
  console.log(`\nMatched ${matched}/${withVorp.length} ESPN players to cache rows. Unmatched: ${unmatched.length}`)
  if (unmatched.length) console.log('  first 20 unmatched:', unmatched.slice(0, 20).join(', '))

  // ---- Apply updates (by id, merged) ---------------------------------------
  console.log('\nUpdating rows...')
  let done = 0
  const CHUNK = 25
  for (let i = 0; i < patches.length; i += CHUNK) {
    const chunk = patches.slice(i, i + CHUNK)
    await Promise.all(
      chunk.map((patch) =>
        supabase
          .from('players_cache')
          .update({
            auction_values: patch.auction_values,
            projections: patch.projections,
            source_data: patch.source_data,
            last_updated_at: new Date().toISOString(),
          })
          .eq('id', patch.id)
      )
    )
    done += chunk.length
    process.stdout.write(`\r  ${done}/${patches.length}`)
  }
  console.log('\n')

  // ---- Verify: top 20 by VORP $ --------------------------------------------
  const verify = [...withVorp]
    .map((p) => ({ ...p, price: priceOf(p.vorp) }))
    .sort((a, b) => b.price - a.price)
    .slice(0, 20)
  console.log('--- top 20 by REAL VORP auction value (12tm/$200/PPR/no-K) ---')
  for (const p of verify) {
    console.log(
      `  $${String(p.price).padStart(3)}  ${p.pos.padEnd(3)} ${p.name.padEnd(24)} ` +
        `pts ${p.seasonPoints.toFixed(0).padStart(3)}  VORP ${p.vorp.toFixed(0).padStart(3)}  (ESPN$ ${p.espnAuction ?? '-'})`
    )
  }
  console.log(`\nDONE: ${matched} players now carry real VORP auction values.`)
}

main().catch((e) => {
  console.error('Fatal:', e instanceof Error ? e.message : e)
  process.exit(1)
})
