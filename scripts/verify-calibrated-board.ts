/**
 * VAL-1/3 VERIFY (read-only, $0). Pulls real players_cache rows via the service
 * role key, runs them through the REAL cacheToPlayer pipeline (so ceiling / room
 * / gap come from the shipped calibration + convert code), and prints the
 * re-priced board. Read-only: no writes to the DB, no Claude, no paid API.
 *
 * Usage: npx tsx scripts/verify-calibrated-board.ts
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cacheToPlayers } from '../src/lib/players/convert'
import type { CachedPlayer } from '../src/lib/research/cache'

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
  const s = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data, error } = await s.from('players_cache').select('*').limit(600)
  if (error) throw error

  const players = cacheToPlayers((data ?? []) as CachedPlayer[])
    .filter((p) => p.ceilingValue && p.ceilingValue > 0)
    .sort((a, b) => (b.ceilingValue ?? 0) - (a.ceilingValue ?? 0))

  console.log(`\nRe-priced board (real players_cache -> cacheToPlayer, calibrated):\n`)
  console.log('  RK  POS  NAME                 CEILING  ROOM~   GAP   READ')
  players.slice(0, 30).forEach((p, i) => {
    const ceil = `$${p.ceilingValue}`.padStart(6)
    const room = p.expectedRoomPrice != null ? `$${p.expectedRoomPrice}`.padStart(5) : '   - '
    const gap = p.valueGap != null ? (p.valueGap > 0 ? `+${p.valueGap}` : `${p.valueGap}`) : '-'
    const read =
      p.valueGap == null ? '' : p.valueGap >= 4 ? 'VALUE POCKET' : p.valueGap <= -4 ? 'room hot' : 'fair'
    console.log(
      `  ${String(i + 1).padStart(2)}  ${(p.position + '').padEnd(3)}  ${p.name.slice(0, 20).padEnd(20)}  ${ceil}  ${room}  ${gap.padStart(5)}  ${read}`,
    )
  })
  console.log(`\n${players.length} priced players total. Read-only verify complete.`)
}
main()
