/**
 * Prove the real tags actually fire. Loads players_cache, converts to Player,
 * runs computePlayerTags over the whole pool, prints counts + examples.
 * Usage: npx tsx scripts/probe-tags.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cacheToPlayer } from '../src/lib/players/convert'
import { computePlayerTags, type PlayerTag } from '../src/lib/players/tags'

function loadEnv() {
  const c = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
  for (const l of c.split('\n')) {
    const t = l.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const k = t.slice(0, i).trim()
    if (!(k in process.env)) process.env[k] = t.slice(i + 1).trim()
  }
}
loadEnv()

async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const rows: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await s
      .from('players_cache')
      .select('*')
      .not('adp', 'eq', '{}')
      .range(from, from + 999)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < 1000) break
  }
  console.log(`Loaded ${rows.length} ranked cache rows\n`)

  const players = rows.map((r) => cacheToPlayer(r as any))
  const counts: Record<string, number> = {}
  const examples: Record<string, string[]> = {}
  let taggedPlayers = 0

  for (const p of players) {
    const tags = computePlayerTags(p)
    if (tags.length) taggedPlayers++
    for (const t of tags) {
      counts[t.id] = (counts[t.id] || 0) + 1
      ;(examples[t.id] ??= [])
      if (examples[t.id].length < 5) examples[t.id].push(`${p.name} (${p.position}, #${p.consensusRank}, $${p.consensusAuctionValue})`)
    }
  }

  console.log('Tag counts across the pool:')
  for (const id of ['elite', 'value', 'fade', 'volatile', 'sleeper']) {
    console.log(`  ${id.toUpperCase().padEnd(9)} ${counts[id] || 0}`)
  }
  console.log(`\n${taggedPlayers}/${players.length} players carry at least one tag\n`)
  for (const id of ['elite', 'value', 'fade', 'volatile', 'sleeper']) {
    console.log(`${id.toUpperCase()} examples:`)
    for (const ex of examples[id] ?? []) console.log(`  - ${ex}`)
  }
}

main().catch((e) => {
  console.error('Fatal:', e instanceof Error ? e.message : e)
  process.exit(1)
})
