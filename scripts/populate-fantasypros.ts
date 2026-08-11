/**
 * Populate players_cache with REAL 2026 fantasy data from FantasyPros.
 *
 * Why this exists: the Sleeper seed (seed-players-sleeper.ts) loaded names and
 * positions only -- every player had empty adp/auction_values/projections, so
 * the draft board showed names with no values and a pile of retired players.
 * This script pulls FantasyPros Expert Consensus Rankings (ECR) -- real, current,
 * 2026 -- and writes the rank + a derived auction value into the exact JSON
 * fields the board converter reads (src/lib/players/convert.ts).
 *
 * Source: FantasyPros ranking pages embed `var ecrData = {...}` in the HTML.
 * Public data, no API key, no cost. ~455 ranked players for the current season.
 *
 * Auction values are DERIVED from ECR rank using the same quadratic-decay model
 * the live advisor uses (impliedAuctionValue in src/lib/draft/trash-talk.ts), so
 * the board, the advisor, and trash-talk all agree. $200 budget / 12 teams.
 *
 * Usage: npx tsx scripts/populate-fantasypros.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load .env.local (tsx doesn't auto-load it)
function loadEnvLocal() {
  try {
    const content = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx < 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (key && !(key in process.env)) process.env[key] = val
    }
  } catch {
    // Not found -- rely on real env vars
  }
}
loadEnvLocal()

const FP_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

// FantasyPros ranking pages that embed `var ecrData = {...}`.
const FP_PAGES: Record<string, string> = {
  ppr: 'https://www.fantasypros.com/nfl/rankings/ppr-cheatsheets.php',
  half_ppr: 'https://www.fantasypros.com/nfl/rankings/half-point-ppr-cheatsheets.php',
}

// Nasties + T&A both exclude kickers.
const INCLUDE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'DST'])
const BATCH_SIZE = 100

// League shape for the derived auction values (Joe's Nasties auction).
const AUCTION_BUDGET = 200
const AUCTION_TEAMS = 12

interface FPRankingPlayer {
  player_id?: string | number
  player_name: string
  player_team_id: string
  player_position_id: string
  player_bye_week: string
  player_filename?: string
  player_owned_avg?: string | number
  rank_ecr: string | number
  rank_min?: string | number
  rank_max?: string | number
  rank_ave?: string | number
  rank_std?: string | number
  pos_rank: string
  tier: string | number
  player_sleeper_id?: string
  player_yahoo_id?: string
  player_espn_id?: string
}

/**
 * Modeled auction value from ECR rank. Mirrors impliedAuctionValue() in
 * src/lib/draft/trash-talk.ts so the board and live advisor never disagree.
 * $70 max (budget * 0.35) at rank 1, quadratic decay to $1 by ~rank 120.
 *
 * NOTE: This is a MODEL off the consensus rank, not a live auction-market
 * price. FantasyPros' real auction-$ endpoint is gone (403). We surface it
 * honestly as a range (see auctionValueRange) built from real expert-rank
 * disagreement, never as a single fake-precise "market value".
 */
function auctionValueFromRank(rank: number): number {
  if (!rank || rank <= 0) return 1
  const maxValue = AUCTION_BUDGET * 0.35
  const maxRank = AUCTION_TEAMS * 10
  const decay = Math.max(0, 1 - (rank - 1) / maxRank)
  return Math.max(1, Math.round(maxValue * decay * decay))
}

/**
 * A real value RANGE from real expert disagreement. The best expert rank
 * (rank_min) is the bullish case -> higher $; the worst expert rank
 * (rank_max) is the bearish case -> lower $; the consensus rank is the base.
 * This replaces the single fake-precise number with an honest band.
 */
function auctionValueRange(
  rankEcr: number,
  rankMin: number | null,
  rankMax: number | null
): { low: number; base: number; high: number } {
  const base = auctionValueFromRank(rankEcr)
  const high = auctionValueFromRank(rankMin ?? rankEcr) // best rank -> most $
  const low = auctionValueFromRank(rankMax ?? rankEcr) // worst rank -> least $
  return {
    low: Math.min(low, base),
    base,
    high: Math.max(high, base),
  }
}

async function fetchEcr(url: string): Promise<FPRankingPlayer[]> {
  const res = await fetch(url, { headers: { 'User-Agent': FP_UA } })
  if (!res.ok) throw new Error(`FantasyPros ${res.status} for ${url}`)
  const html = await res.text()
  const m = html.match(/var\s+ecrData\s*=\s*(\{[\s\S]*?\});\s*(?:var|<\/script>)/)
  if (!m) throw new Error(`No ecrData found on ${url}`)
  const data = JSON.parse(m[1])
  if (!Array.isArray(data.players)) throw new Error(`No players array on ${url}`)
  return data.players as FPRankingPlayer[]
}

function num(v: string | number | undefined): number | null {
  if (v === undefined || v === null || v === '') return null
  const n = typeof v === 'number' ? v : parseInt(v, 10)
  return Number.isFinite(n) ? n : null
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: Supabase env vars not set in .env.local')
    process.exit(1)
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Fetch PPR (primary -- Joe's league) and half-PPR (Tyler) rankings.
  console.log('Fetching FantasyPros ECR (ppr + half_ppr)...')
  const ppr = await fetchEcr(FP_PAGES.ppr)
  console.log(`  ppr: ${ppr.length} players`)
  let halfPpr: FPRankingPlayer[] = []
  try {
    halfPpr = await fetchEcr(FP_PAGES.half_ppr)
    console.log(`  half_ppr: ${halfPpr.length} players`)
  } catch (e) {
    console.warn(`  half_ppr fetch failed (continuing PPR-only): ${e instanceof Error ? e.message : e}`)
  }

  // half-PPR rank lookup by name (stored in source_data for later, not averaged
  // into adp so it can't pollute Joe's PPR consensus rank).
  const halfRankByName = new Map<string, number>()
  for (const p of halfPpr) {
    const r = num(p.rank_ecr)
    if (r) halfRankByName.set(p.player_name.trim(), r)
  }

  // 2. Normalize PPR players into players_cache rows.
  const rows = ppr
    .map((p) => {
      const position = p.player_position_id?.toUpperCase()
      if (!position || !INCLUDE_POSITIONS.has(position)) return null
      const rank = num(p.rank_ecr)
      if (!rank) return null
      const name = p.player_name.trim()
      const rankMin = num(p.rank_min)
      const rankMax = num(p.rank_max)
      const range = auctionValueRange(rank, rankMin, rankMax)
      const halfRank = halfRankByName.get(name) ?? null
      const tier = num(p.tier)
      const fpId = p.player_id != null ? String(p.player_id) : null

      return {
        name,
        team: p.player_team_id || null,
        position,
        bye_week: num(p.player_bye_week),
        // adp: ONLY the PPR rank -> converter averages -> consensusRank = PPR ECR.
        adp: { fantasypros_ppr: rank },
        // auction_values: modeled base for $200/12 PPR (single, back-compat).
        auction_values: { fantasypros_ppr_12_200: range.base },
        projections: {},
        source_data: {
          sources: ['fantasypros'],
          consensus_rank: rank,
          ecr_rank_ppr: rank,
          ecr_rank_half_ppr: halfRank,
          // Real expert disagreement -> honest value range.
          rank_min: rankMin,
          rank_max: rankMax,
          rank_ave: p.rank_ave != null ? parseFloat(String(p.rank_ave)) : null,
          rank_std: p.rank_std != null ? parseFloat(String(p.rank_std)) : null,
          value_low: range.low,
          value_base: range.base,
          value_high: range.high,
          // Real FantasyPros tier (was previously faked as rank/12).
          tier,
          pos_rank: p.pos_rank ?? null,
          owned_avg: p.player_owned_avg != null ? parseFloat(String(p.player_owned_avg)) : null,
          // Handles for headshots + cross-referencing.
          fp_player_id: fpId,
          fp_filename: p.player_filename ?? null,
          sleeper_id: p.player_sleeper_id ?? null,
          yahoo_id: p.player_yahoo_id ?? null,
          espn_id: p.player_espn_id ?? null,
        },
        last_updated_at: new Date().toISOString(),
      }
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  console.log(`\nNormalized ${rows.length} ranked players (QB/RB/WR/TE/DST, kickers excluded).`)

  // 3. Upsert by name (updates matching Sleeper rows, inserts new).
  console.log(`Upserting in batches of ${BATCH_SIZE}...`)
  let upserted = 0
  const errors: string[] = []
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('players_cache')
      .upsert(batch, { onConflict: 'name', ignoreDuplicates: false })
    if (error) {
      errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
      process.stderr.write(`\nERROR: ${error.message}\n`)
    } else {
      upserted += batch.length
      process.stdout.write(`\rProgress: ${upserted}/${rows.length}`)
    }
  }
  console.log('\n')

  // 4. Verify: top 10 by rank now have real values.
  const { data: top } = await supabase
    .from('players_cache')
    .select('name, position, team, adp, auction_values')
    .not('adp', 'eq', '{}')
    .limit(500)

  const ranked = (top ?? [])
    .map((p) => {
      const adpVals = Object.values((p.adp ?? {}) as Record<string, number>)
      const aucVals = Object.values((p.auction_values ?? {}) as Record<string, number>)
      return {
        name: p.name,
        position: p.position,
        team: p.team,
        rank: adpVals.length ? adpVals[0] : 999,
        value: aucVals.length ? aucVals[0] : 0,
      }
    })
    .sort((a, b) => a.rank - b.rank)

  console.log(`Players with real values now: ${ranked.length}`)
  console.log('--- top 10 ---')
  for (const p of ranked.slice(0, 10)) {
    console.log(`  #${p.rank}  $${p.value}  ${p.name} (${p.position}, ${p.team})`)
  }

  if (errors.length) {
    console.error(`\n${errors.length} error(s):`)
    errors.forEach((e) => console.error('  - ' + e))
    process.exit(1)
  }
  console.log(`\nDONE: ${upserted} players populated with real ECR + auction values.`)
}

main().catch((err) => {
  console.error('Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
