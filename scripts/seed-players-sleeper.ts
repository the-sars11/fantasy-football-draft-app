/**
 * FFT-004: Seed 2026 NFL players from Sleeper API into players_cache
 *
 * Usage: npx tsx scripts/seed-players-sleeper.ts
 * Free API — no key required. Run once to populate player pool.
 * Nasties rule: no kickers (K excluded). Includes QB/RB/WR/TE/DEF only.
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
    // Not found — rely on real env vars
  }
}
loadEnvLocal()

interface SleeperPlayer {
  player_id: string
  first_name?: string
  last_name?: string
  full_name?: string
  position?: string
  fantasy_positions?: string[]
  team?: string | null
  active?: boolean
  age?: number | null
  years_exp?: number | null
  injury_status?: string | null
  search_rank?: number | null
  depth_chart_order?: number | null
}

// Nasties league: QB/RB/WR/TE/DEF only — no kickers
const INCLUDE_POSITIONS = new Set(['QB', 'RB', 'WR', 'TE', 'DEF'])
const BATCH_SIZE = 100

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  // 1. Fetch all NFL players from Sleeper (free, no key required)
  console.log('Fetching NFL players from Sleeper API...')
  const res = await fetch('https://api.sleeper.app/v1/players/nfl')
  if (!res.ok) {
    throw new Error(`Sleeper API error: ${res.status} ${res.statusText}`)
  }

  const allPlayers: Record<string, SleeperPlayer> = await res.json()
  console.log(`Total players in Sleeper response: ${Object.keys(allPlayers).length}`)

  // 2. Filter: active + fantasy-relevant positions (no kickers)
  const filtered = Object.values(allPlayers).filter(p => {
    if (!p.active) return false
    if (!p.position || !INCLUDE_POSITIONS.has(p.position)) return false
    return true
  })

  console.log(`After filter (active, QB/RB/WR/TE/DEF): ${filtered.length} players`)

  if (filtered.length < 300) {
    console.warn(`WARNING: Only ${filtered.length} players - expected 300+. Continuing anyway.`)
  }

  // 3. Normalize to players_cache schema
  const rows = filtered.map(p => {
    const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ')
    // DB uses DST for team defenses
    const position = p.position === 'DEF' ? 'DST' : p.position!

    return {
      name,
      team: p.team || null,
      position,
      bye_week: null as number | null,
      external_id: p.player_id,
      adp: {},
      auction_values: {},
      projections: {},
      injury_status: p.injury_status || null,
      source_data: {
        sleeper_id: p.player_id,
        age: p.age ?? null,
        years_exp: p.years_exp ?? null,
        search_rank: p.search_rank ?? null,
        depth_chart_order: p.depth_chart_order ?? null,
        sources: ['sleeper'],
        consensus_rank: p.search_rank ?? null,
      },
      last_updated_at: new Date().toISOString(),
    }
  })

  // 4. Deduplicate by name — same conflict key as the upsert; keep better search_rank
  const byName = new Map<string, (typeof rows)[0]>()
  for (const row of rows) {
    const existing = byName.get(row.name)
    if (!existing) {
      byName.set(row.name, row)
    } else {
      const existingRank = (existing.source_data as Record<string, unknown>).search_rank as number ?? 99999
      const newRank = (row.source_data as Record<string, unknown>).search_rank as number ?? 99999
      if (newRank < existingRank) byName.set(row.name, row)
    }
  }
  const deduped = Array.from(byName.values())
  console.log(`After dedup by name: ${deduped.length} unique players (removed ${rows.length - deduped.length} duplicates)`)

  // 5. Upsert in batches of 100
  console.log(`\nUpserting ${deduped.length} players in batches of ${BATCH_SIZE}...`)
  let upserted = 0
  const errors: string[] = []

  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE)
    const { error } = await supabase
      .from('players_cache')
      .upsert(batch, { onConflict: 'name', ignoreDuplicates: false })

    if (error) {
      const msg = `Batch ${Math.floor(i / BATCH_SIZE) + 1} (rows ${i}-${i + batch.length}): ${error.message}`
      errors.push(msg)
      process.stderr.write(`\rERROR: ${msg}\n`)
    } else {
      upserted += batch.length
      process.stdout.write(`\rProgress: ${upserted}/${deduped.length}`)
    }
  }

  console.log('\n')

  // 5. Verify count in Supabase
  const { count, error: countErr } = await supabase
    .from('players_cache')
    .select('*', { count: 'exact', head: true })

  if (countErr) {
    console.error('Could not verify count:', countErr.message)
  } else {
    console.log(`Supabase players_cache total: ${count}`)
  }

  if (errors.length > 0) {
    console.error(`\n${errors.length} upsert error(s):`)
    errors.forEach(e => console.error(`  - ${e}`))
    process.exit(1)
  }

  console.log(`\nUpserted: ${upserted} / ${deduped.length} players`)

  if ((count ?? 0) >= 300) {
    console.log('FFT-004 PASS: 300+ players confirmed in players_cache')
  } else {
    console.error(`FFT-004 FAIL: Only ${count} players in cache - expected 300+`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
