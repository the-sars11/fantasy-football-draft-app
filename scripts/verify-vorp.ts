import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
function loadEnv() {
  const c = readFileSync(join(process.cwd(), '.env.local'), 'utf-8')
  for (const l of c.split('\n')) { const t = l.trim(); if (!t || t.startsWith('#')) continue; const i = t.indexOf('='); if (i<0) continue; const k=t.slice(0,i).trim(); if (!(k in process.env)) process.env[k]=t.slice(i+1).trim() }
}
loadEnv()
async function main() {
  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await s.from('players_cache').select('name, position, auction_values, projections, source_data').in('name', ['Jahmyr Gibbs', 'Josh Allen', 'Trey McBride'])
  for (const r of data ?? []) {
    const sd = r.source_data as any
    console.log(`${r.name} (${r.position}):`)
    console.log(`  auction_values:`, JSON.stringify(r.auction_values))
    console.log(`  projections.points:`, (r.projections as any)?.points)
    console.log(`  source_data.vorp:`, sd?.vorp, ' vorp_$:', sd?.vorp_auction_value, ' repl:', sd?.replacement_points, ' pos_rank_pts:', sd?.pos_rank_points, ' espn_$:', sd?.espn_auction_value)
  }
}
main()
