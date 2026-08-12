/**
 * build-headshot-map.mjs — S3 / FB-13 headshot source map ($0, local-only).
 *
 * The draft app's players_cache has NO espn_id (the FantasyPros populate path
 * only carries fp_player_id). ESPN headshots are keyed by ESPN athlete id. The
 * sibling auctioneer repo already resolved the real 2026 pool to ESPN ids
 * (fantasy_auction_auctioneer/src/data/players-2026.json, 284 with espnId), and
 * that repo does NOT deploy with this app — so, exactly like the VAL-0 ledger
 * import, we bring a self-contained artifact in-repo here.
 *
 * Emits src/data/headshots/name-to-espn.json: { normalizedName: espnId }.
 * Runtime (src/lib/players/headshot.ts) maps a player name -> espnId -> the free
 * public ESPN CDN headshot URL, with a local silhouette fallback on error. No
 * 77MB image bundle committed; the research surface runs with wifi.
 *
 * Free — reads a local JSON from the sibling repo, writes a local JSON. No
 * network, no paid/Claude API. Re-run when the auctioneer refreshes its pool.
 *
 * Usage: node scripts/build-headshot-map.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(__dirname, '..')
const SIBLING_POOL = path.join(
  REPO_ROOT,
  '..',
  'fantasy_auction_auctioneer',
  'src',
  'data',
  'players-2026.json',
)
const OUT_DIR = path.join(REPO_ROOT, 'src', 'data', 'headshots')
const OUT_FILE = path.join(OUT_DIR, 'name-to-espn.json')

/** Shared name normaliser — MUST match normalizeName() in src/lib/players/headshot.ts. */
function normalizeName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[.'’,]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function main() {
  if (!fs.existsSync(SIBLING_POOL)) {
    console.error(`Sibling pool not found: ${SIBLING_POOL}`)
    process.exit(1)
  }
  const pool = JSON.parse(fs.readFileSync(SIBLING_POOL, 'utf-8'))
  const map = {}
  let withId = 0
  for (const p of pool) {
    if (p.espnId == null || !p.name) continue
    const key = normalizeName(p.name)
    if (!key) continue
    // First writer wins; log collisions so a real dupe surfaces.
    if (map[key] !== undefined && map[key] !== p.espnId) {
      console.warn(`name collision: "${key}" ${map[key]} vs ${p.espnId} (${p.name})`)
    }
    map[key] = p.espnId
    withId++
  }
  fs.mkdirSync(OUT_DIR, { recursive: true })
  // Sorted keys for a stable, reviewable diff.
  const sorted = Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
  fs.writeFileSync(OUT_FILE, JSON.stringify(sorted, null, 0) + '\n')
  console.log(`Wrote ${Object.keys(sorted).length} name->espnId entries (${withId} pool rows with espnId) to`)
  console.log(`  ${OUT_FILE}`)
}
main()
