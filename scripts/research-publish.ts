/**
 * research-publish.ts - persist the headless dataset into the app (the seam).
 *
 * research-run.ts produces `research-output/dataset.json` on disk, but the app
 * can only read Supabase, not the filesystem. This script closes that gap: it
 * loads the finished dataset, validates it against the ResearchDataset contract
 * enough to refuse a malformed or empty snapshot, resolves Joe's active league,
 * and writes the whole thing into `research_runs` as one row discriminated by
 * `strategy_settings.kind === 'dataset'` (the same table + kind pattern sim runs
 * use, so no migration). From then on the Strategy/Intel screens and any LLM read
 * the snapshot back through GET /api/research-dataset.
 *
 * It runs no engine code and makes no LLM call - it only reads the file and
 * writes one row. Service-role, so it sets user_id explicitly from the league row
 * (RLS is bypassed by the service key, exactly like research-run.ts's cache read).
 *
 * Newest row wins: the reader orders by created_at desc and takes one, so a
 * re-publish supersedes the previous snapshot without deleting history.
 *
 * Usage: npm run research:publish   (tsx scripts/research-publish.ts)
 *   Requires: npm run research:run first (to produce dataset.json).
 * Copy rule (Joe): plain English, NO em/en dashes anywhere in surfaced strings.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

import type { ResearchDataset } from '@/lib/research/dataset-types'
import { RESEARCH_DATASET_KIND } from '@/lib/research/dataset-types'

// ─── .env.local loader (tsx does not auto-load it) - same as research-run.ts ──

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

const DATASET_PATH = join(process.cwd(), 'research-output', 'dataset.json')

/** Refuse to publish a snapshot that is missing its spine or is empty. */
function assertPublishable(d: ResearchDataset): void {
  const problems: string[] = []
  if (!d.meta || !d.meta.generatedAt) problems.push('meta.generatedAt missing')
  if (!d.league || !d.league.name) problems.push('league missing')
  if (!Array.isArray(d.players) || d.players.length === 0) problems.push('players empty')
  if (!Array.isArray(d.strategies) || d.strategies.length === 0) problems.push('strategies empty')
  if (!d.leagueIntel) problems.push('leagueIntel missing')
  if (problems.length > 0) {
    throw new Error(`dataset.json is not publishable: ${problems.join('; ')}`)
  }
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local',
    )
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  // 1) Load + validate the finished artifact.
  console.log(`[research-publish] reading ${DATASET_PATH} ...`)
  let dataset: ResearchDataset
  try {
    dataset = JSON.parse(readFileSync(DATASET_PATH, 'utf-8')) as ResearchDataset
  } catch (err) {
    throw new Error(
      `Could not read research-output/dataset.json - run "npm run research:run" first. (${
        err instanceof Error ? err.message : String(err)
      })`,
    )
  }
  assertPublishable(dataset)
  const bytes = Buffer.byteLength(JSON.stringify(dataset), 'utf-8')
  console.log(
    `[research-publish] dataset ok: ${dataset.players.length} players, ${dataset.strategies.length} strategies, ${dataset.studCombos.length} combos, generated ${dataset.meta.generatedAt} (${(bytes / 1024 / 1024).toFixed(2)} MB)`,
  )

  // 2) Resolve the target league. Active league first; if DEV_USER_ID is set,
  // scope to it (matches the app's dev-mode filter). Take the top row and reuse
  // its owner as the row's user_id so RLS-scoped reads find it.
  const devUserId = process.env.DEV_USER_ID
  let leagueQuery = supabase
    .from('leagues')
    .select('id, user_id, name, is_active')
    .order('is_active', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(1)
  if (devUserId) leagueQuery = leagueQuery.eq('user_id', devUserId)

  const { data: leagues, error: leagueErr } = await leagueQuery
  if (leagueErr) throw new Error(`leagues lookup failed: ${leagueErr.message}`)
  const league = leagues?.[0]
  if (!league) {
    throw new Error(
      'No league found to attach the dataset to. Configure a league in the app first.',
    )
  }
  console.log(
    `[research-publish] attaching to league "${league.name}" (${league.id}), owner ${league.user_id}`,
  )

  // 3) Persist as one research_runs row, discriminated by kind: 'dataset'.
  const now = new Date().toISOString()
  const { data: inserted, error: insertErr } = await supabase
    .from('research_runs')
    .insert({
      user_id: league.user_id,
      league_id: league.id,
      strategy_settings: {
        kind: RESEARCH_DATASET_KIND,
        name: 'Draft research dataset',
        generatedAt: dataset.meta.generatedAt,
        playerCount: dataset.players.length,
      },
      results: dataset,
      status: 'completed',
      completed_at: now,
    })
    .select('id, created_at')
    .single()

  if (insertErr) throw new Error(`insert failed: ${insertErr.message}`)

  console.log(
    `[research-publish] published dataset row ${inserted.id} at ${inserted.created_at}.`,
  )
  console.log(
    `[research-publish] the app now reads this via GET /api/research-dataset?leagueId=${league.id}`,
  )
}

main().catch((err) => {
  console.error('[research-publish] FAILED:', err instanceof Error ? err.message : err)
  process.exit(1)
})
