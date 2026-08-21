// derive-risk-model.mjs -- turn 15 years of real Sleeper weekly actuals into a
// compact, versioned risk table the sim consumes. Two separated layers:
//   (1) DURABILITY  -- real games played (gp flag), per player + position baseline.
//   (2) OUTCOME     -- per-game bust/breakout, measured as year-over-year change in
//                      points-per-game by prior-year positional tier. Availability is
//                      handled by layer 1, so this isolates PERFORMANCE variance and
//                      does not double-count injuries.
//
// $0: self-sufficient. Pulls the raw actuals from the Sleeper API (free, keyless, no
// auth) and caches each response under scripts/.sleeper-cache/ (gitignored) so re-runs
// are instant and offline. No Claude, no paid source. Writes one JSON to
// src/data/risk-model.json. Run: `npm run risk:derive`
// (`npm run risk:derive:fresh` ignores the local cache and re-pulls from Sleeper).
//
// Honesty: every number below is measured from real actuals. Per-player durability is
// MEASURED for players with >=2 real seasons; everyone else falls back to the position
// baseline (also measured). Outcome tiers use PRIOR-YEAR positional finish as the
// expectation proxy because we do not have historical preseason projections on disk;
// that is labeled, not hidden.

import fs from 'node:fs'
import path from 'node:path'

const REPO = 'C:/Users/jrasa/AI Projects/fantasy_football_draft_app'
const OUT = path.join(REPO, 'src/data/risk-model.json')

// Self-sufficient data layer. This script no longer depends on any ephemeral session
// scratchpad: it pulls the raw actuals straight from Sleeper (free, keyless, $0) and
// caches each response under scripts/.sleeper-cache/ (gitignored) so re-runs are
// instant and offline. A legacy scratchpad dir is still honored if present, purely so
// an existing local cache is reused instead of re-pulled -- it is never required.
const CACHE_DIR = path.join(REPO, 'scripts/.sleeper-cache')
const LEGACY_CACHE =
  'C:/Users/jrasa/AppData/Local/Temp/claude/C--Users-jrasa-AI-Projects/ef908f98-9fc2-47d5-b134-6d57228db2bf/scratchpad'
const SLEEPER = 'https://api.sleeper.app/v1'
const playersUrl = () => `${SLEEPER}/players/nfl`
const statsUrl = (yr, wk) => `${SLEEPER}/stats/nfl/regular/${yr}/${wk}`

fs.mkdirSync(CACHE_DIR, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Load one cached JSON by filename, fetching from Sleeper on a miss.
 * Order: repo cache -> legacy scratchpad (copied forward) -> live fetch (then cached).
 */
// Pass --fresh (or set DERIVE_FRESH=1) to ignore every local cache and re-pull
// straight from Sleeper. The flag is portable across Windows/POSIX shells.
const FRESH = process.env.DERIVE_FRESH === '1' || process.argv.includes('--fresh')
async function loadJson(name, url) {
  const repoPath = path.join(CACHE_DIR, name)
  if (!FRESH && fs.existsSync(repoPath)) return JSON.parse(fs.readFileSync(repoPath, 'utf8'))

  const legacyPath = path.join(LEGACY_CACHE, name)
  if (!FRESH && fs.existsSync(legacyPath)) {
    const raw = fs.readFileSync(legacyPath, 'utf8')
    fs.writeFileSync(repoPath, raw) // migrate into the permanent cache
    return JSON.parse(raw)
  }

  process.stdout.write(`  fetch ${url} ... `)
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.text()
      fs.writeFileSync(repoPath, raw)
      console.log('ok')
      await sleep(120) // be polite to Sleeper (well under their rate limit)
      return JSON.parse(raw)
    } catch (err) {
      lastErr = err
      await sleep(500 * attempt)
    }
  }
  throw new Error(`failed to load ${name} from ${url}: ${lastErr?.message}`)
}

// Fantasy regular-season window. Every NFL team's bye falls inside weeks 1-14, so a
// fully healthy player tops out at 13 games in this window (one bye). Denominator = 13.
const WEEKS = 14
const HEALTHY_GAMES = 13
const YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const SKILL = ['QB', 'RB', 'WR', 'TE']

// ---------- player map: id -> {pos, name} ----------
console.log('loading Sleeper player map ...')
const pm = await loadJson('sleeper_players.json', playersUrl())
const posById = new Map()
const nameById = new Map()
for (const id of Object.keys(pm)) {
  const p = pm[id]
  if (!p) continue
  if (SKILL.includes(p.position)) {
    posById.set(id, p.position)
    nameById.set(id, p.full_name || id)
  }
}

// ---------- load weekly gp + pts_ppr per player per year ----------
// perYear[yr] = Map(id -> { gp, pts })  season aggregates over weeks 1-14 (skill only)
console.log(`loading weekly actuals for ${YEARS.length} seasons (wks 1-${WEEKS}) ...`)
const perYear = {}
for (const yr of YEARS) {
  const agg = new Map()
  for (let wk = 1; wk <= WEEKS; wk++) {
    const j = await loadJson(`stats_${yr}_wk${wk}.json`, statsUrl(yr, wk))
    for (const id of Object.keys(j)) {
      if (!posById.has(id)) continue
      const row = j[id]
      const pts = typeof row.pts_ppr === 'number' ? row.pts_ppr : 0
      // gp: 1 when the player was active/played that week. Fall back to "scored" when
      // the gp flag is absent but points exist (rare), else 0.
      let gp = Number(row.gp)
      if (!Number.isFinite(gp)) gp = pts > 0 ? 1 : 0
      gp = gp >= 1 ? 1 : 0
      const cur = agg.get(id) || { gp: 0, pts: 0 }
      cur.gp += gp
      cur.pts += pts
      agg.set(id, cur)
    }
  }
  perYear[yr] = agg
}

// ---------- positional finish rank per year (by season pts among players who played) ----------
// rankByYear[yr] = Map(id -> { rank, pos })  ; rank 1 = best at his position that year.
const rankByYear = {}
for (const yr of YEARS) {
  const byPos = { QB: [], RB: [], WR: [], TE: [] }
  for (const [id, v] of perYear[yr]) {
    if (v.gp < 1) continue // never active that year
    byPos[posById.get(id)].push({ id, pts: v.pts })
  }
  const rank = new Map()
  for (const pos of SKILL) {
    byPos[pos].sort((a, b) => b.pts - a.pts)
    byPos[pos].forEach((r, i) => rank.set(r.id, { rank: i + 1, pos }))
  }
  rankByYear[yr] = rank
}

// ---------- LAYER 1: durability ----------
// Count a player-season as "real role" if he finished top-48 at his position that year
// (roughly the draftable pool) -- avoids diluting the rate with cameo/pre-breakout years.
const REAL_ROLE_RANK = 48
const durSeasons = new Map() // id -> [{yr, gp}]
const baselineAcc = { QB: [], RB: [], WR: [], TE: [] }
for (const yr of YEARS) {
  for (const [id, v] of perYear[yr]) {
    const r = rankByYear[yr].get(id)
    if (!r || r.rank > REAL_ROLE_RANK) continue
    const rate = Math.min(1, v.gp / HEALTHY_GAMES)
    if (!durSeasons.has(id)) durSeasons.set(id, [])
    durSeasons.get(id).push({ yr, gp: v.gp, rate })
    // Baseline (the fallback for players with no measured history) is built only from
    // STARTER-grade seasons (top-24) so it is not dragged down by part-season backups
    // who still crack the top-48 in total points.
    if (r.rank <= 24) baselineAcc[r.pos].push(rate)
  }
}
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
const durabilityBaseline = {}
for (const pos of SKILL) durabilityBaseline[pos] = round(mean(baselineAcc[pos]), 4)
durabilityBaseline.DEF = 1 // team defenses do not "miss games"

// per-player measured rate for players with >=2 real seasons
const MIN_SEASONS = 2
const byPlayer = {}
for (const [id, seasons] of durSeasons) {
  if (seasons.length < MIN_SEASONS) continue
  byPlayer[id] = {
    name: nameById.get(id),
    pos: posById.get(id),
    gpRate: round(mean(seasons.map((s) => s.rate)), 4),
    seasons: seasons.length,
  }
}

// ---------- LAYER 2: outcome (per-game bust/breakout) ----------
// For each consecutive-year pair, multiplier = ppg(Y) / ppg(Y-1), grouped by the
// player's PRIOR-year positional tier. Requires gp>=6 in both years so per-game is
// stable. Isolates performance (availability lives in layer 1).
const TIERS = [
  { key: '1-3', lo: 1, hi: 3 },
  { key: '4-6', lo: 4, hi: 6 },
  { key: '7-12', lo: 7, hi: 12 },
  { key: '13-24', lo: 13, hi: 24 },
  { key: '25-48', lo: 25, hi: 48 },
]
const MIN_GP_FOR_PPG = 6
function tierOf(rank) {
  return TIERS.find((t) => rank >= t.lo && rank <= t.hi)?.key ?? null
}
// samples[pos][tierKey] = [multiplier, ...]
const samples = {}
for (const pos of SKILL) {
  samples[pos] = {}
  for (const t of TIERS) samples[pos][t.key] = []
}
for (let i = 1; i < YEARS.length; i++) {
  const yr = YEARS[i]
  const prev = YEARS[i - 1]
  if (yr - prev !== 1) continue // skip the 2015->2017 gap (2016 not cached)
  for (const [id, vPrev] of perYear[prev]) {
    const rPrev = rankByYear[prev].get(id)
    if (!rPrev) continue
    const tier = tierOf(rPrev.rank)
    if (!tier) continue
    const vCur = perYear[yr].get(id)
    if (!vCur) continue
    if (vPrev.gp < MIN_GP_FOR_PPG || vCur.gp < MIN_GP_FOR_PPG) continue
    const ppgPrev = vPrev.pts / vPrev.gp
    const ppgCur = vCur.pts / vCur.gp
    if (ppgPrev <= 0) continue
    samples[rPrev.pos][tier].push(ppgCur / ppgPrev)
  }
}
function quantile(sorted, q) {
  if (!sorted.length) return null
  const idx = (sorted.length - 1) * q
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return sorted[lo]
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}
const BUST = 0.75 // >25% per-game drop = bust
const BREAKOUT = 1.25 // >25% per-game gain = breakout
const outcome = {}
for (const pos of SKILL) {
  outcome[pos] = {}
  for (const t of TIERS) {
    const arr = samples[pos][t.key].slice().sort((a, b) => a - b)
    if (arr.length < 8) {
      outcome[pos][t.key] = { n: arr.length, note: 'thin sample -> sim falls back to neighbor tier / position pooled' }
      continue
    }
    outcome[pos][t.key] = {
      n: arr.length,
      p10: round(quantile(arr, 0.1), 3),
      p25: round(quantile(arr, 0.25), 3),
      p50: round(quantile(arr, 0.5), 3),
      p75: round(quantile(arr, 0.75), 3),
      p90: round(quantile(arr, 0.9), 3),
      bustRate: round(arr.filter((x) => x < BUST).length / arr.length, 3),
      breakoutRate: round(arr.filter((x) => x > BREAKOUT).length / arr.length, 3),
      // compact empirical CDF (21 points) so the sim resamples the REAL distribution,
      // not a fitted Gaussian. Draw u~U(0,1) -> interpolate this ladder.
      cdf: Array.from({ length: 21 }, (_, k) => round(quantile(arr, k / 20), 3)),
    }
  }
}

function round(x, d = 4) {
  if (x == null || !Number.isFinite(x)) return x
  const f = 10 ** d
  return Math.round(x * f) / f
}

const model = {
  meta: {
    generated_from: 'Sleeper historical weekly PPR actuals (free, keyless)',
    years: YEARS,
    excluded: [2016],
    weeks_window: `1-${WEEKS} (fantasy regular season)`,
    healthy_games_max: HEALTHY_GAMES,
    durability_definition:
      'gpRate = mean over real-role seasons of (games played in wks 1-14) / 13 (one bye baked in). Real role = top-48 positional finish that year.',
    outcome_definition:
      'per-game multiplier = ppg(year) / ppg(prior year), grouped by PRIOR-year positional tier; requires gp>=6 both years. Prior-year finish is the expectation proxy (no historical preseason projections on disk). Availability is layer 1, so this isolates performance variance.',
    bust_threshold: BUST,
    breakout_threshold: BREAKOUT,
    note: 'All values measured from real actuals. Players lacking >=2 real seasons use the position durability baseline; thin outcome tiers fall back in the sim.',
  },
  durability: { baseline: durabilityBaseline, byPlayer },
  outcome,
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(model, null, 2))

// ---------- evidence dump ----------
console.log('=== DURABILITY baseline (real games played / 13, top-48 seasons) ===')
console.log(durabilityBaseline)
console.log(`per-player measured rates: ${Object.keys(byPlayer).length} players with >=${MIN_SEASONS} real seasons`)
const spot = (name) => {
  const hit = Object.entries(byPlayer).find(([, v]) => (v.name || '').toLowerCase() === name.toLowerCase())
  return hit ? `${hit[1].name} (${hit[1].pos}): gpRate ${hit[1].gpRate} over ${hit[1].seasons} seasons` : `${name}: no measured sample`
}
for (const n of ['Christian McCaffrey', 'Derrick Henry', 'Cooper Kupp', 'Davante Adams', 'Aaron Rodgers', 'Josh Allen']) {
  console.log('  ' + spot(n))
}
console.log('\n=== OUTCOME (per-game bust/breakout by prior-year tier) ===')
for (const pos of SKILL) {
  console.log(`-- ${pos} --`)
  for (const t of TIERS) {
    const o = outcome[pos][t.key]
    if (o.n < 8) { console.log(`  ${t.key}: n=${o.n} (thin)`); continue }
    console.log(
      `  ${t.key}: n=${o.n}  bust ${(o.bustRate * 100).toFixed(0)}%  breakout ${(o.breakoutRate * 100).toFixed(0)}%  median x${o.p50}  p10 x${o.p10}  p90 x${o.p90}`,
    )
  }
}
console.log(`\nwrote ${OUT}`)
