// Backtest: score each Nasties team AS DRAFTED on that season's ACTUAL weekly PPR points.
// Best legal lineup each week (no waivers/trades). Isolates draft quality; bakes injuries in
// via real games-played. Data: local bundle.json (drafts) + Sleeper historical weekly stats.
// $0 (local file + free keyless Sleeper). Read-only analysis.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(__dirname, '..')
const CACHE = 'C:/Users/jrasa/AppData/Local/Temp/claude/C--Users-jrasa-AI-Projects/ef908f98-9fc2-47d5-b134-6d57228db2bf/scratchpad'

// All Nasties drafts present in bundle.json (2016 is absent from the archive).
const YEARS = [2010, 2011, 2012, 2013, 2014, 2015, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const WEEKS = 14 // fantasy regular season (ESPN 12-team default: wks 1-14)
// Nasties starting lineup: QB1 RB1 WR1 TE1 FLEX3(RB/WR/TE) DEF1 = 8 starters
const FLEX_ELIGIBLE = new Set(['RB', 'WR', 'TE'])

// ---------- load Sleeper players map -> name/def indexes ----------
const pm = JSON.parse(fs.readFileSync(path.join(CACHE, 'sleeper_players.json'), 'utf8'))

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/d\/st|dst|defense/g, '')
    .replace(/-/g, ' ')
    .replace(/[.'`,]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()

// Levenshtein for the fuzzy safety net
function lev(a, b) {
  const m = a.length,
    n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => i)
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]
    dp[0] = j
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i]
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return dp[m]
}

// Explicit, auditable aliases for garbled draft-board entries (canonical Sleeper name on right).
// Every >=$10 pick that failed the exact join is mapped here by hand and eyeball-verified.
const ALIAS = {
  'jemar chase': "Ja'Marr Chase",
  'cooper cup': 'Cooper Kupp',
  'cooper cuck': 'Cooper Kupp',
  'derek henry': 'Derrick Henry',
  'jameer gibbs': 'Jahmyr Gibbs',
  'amon st brown': 'Amon-Ra St. Brown',
  'amon ra st brown': 'Amon-Ra St. Brown',
  'st brown': 'Amon-Ra St. Brown',
  'terry mcclaren': 'Terry McLaurin',
  'taylor mclaren': 'Terry McLaurin',
  'malik neighbors': 'Malik Nabers',
  'jalen waddell': 'Jaylen Waddle',
  'devon achain': 'Devon Achane',
  'jaxon smith njigba': 'Jaxon Smith-Njigba',
  njigba: 'Jaxon Smith-Njigba',
  'gabriel davis': 'Gabe Davis',
  'allen robertson': 'Allen Robinson',
  'juju smith': 'JuJu Smith-Schuster',
  juju: 'JuJu Smith-Schuster',
  'clyde edwards': 'Clyde Edwards-Helaire',
  'ramanday stephenson': 'Rhamondre Stephenson',
  'ramanda stephenson': 'Rhamondre Stephenson',
  'tj hawkinson': 'T.J. Hockenson',
  'tj hockinson': 'T.J. Hockenson',
  't j hockinson': 'T.J. Hockenson',
  'jarek mckinnon': 'Jerick McKinnon',
  'j mckinnion': 'Jerick McKinnon',
  'jacobe myers': 'Jakobi Meyers',
  'jacobi myers': 'Jakobi Meyers',
  'jakoby myers': 'Jakobi Meyers',
  'kaleel herbert': 'Khalil Herbert',
  'kaheal herbert': 'Khalil Herbert',
  'cordell patterson': 'Cordarrelle Patterson',
  'deyante johnson': 'Diontae Johnson',
  'deante johnson': 'Diontae Johnson',
  aaronrodgers: 'Aaron Rodgers',
  'quinton johnson': 'Quentin Johnston',
  'naheem heinz': 'Nyheim Hines',
  'tua tagliaovoia': 'Tua Tagovailoa',
  'd montgomerey': 'David Montgomery',
  'de andre hopkins': 'DeAndre Hopkins',
  'hollywood brown': 'Marquise Brown',
  'rome adunzay': 'Rome Odunze',
  mcockney: 'Ladd McConkey',
  shakeel: 'Khalil Shakir',
  eckler: 'Austin Ekeler',
  zeke: 'Ezekiel Elliott',
  'chig okingawa': 'Chigoziem Okonkwo',
  'tyler alger': 'Tyler Allgeier',
  'garrett sutton': 'Courtland Sutton',
  sutton: 'Courtland Sutton',
  'jacory croskey merritt': 'Jacory Croskey-Merritt',
  'e mitchell': 'Elijah Mitchell',
  'j warren': 'Jaylen Warren',
  'd cook': 'Dalvin Cook',
  'mike deseke': 'Mike Gesicki',
  // older-era nicknames / typos (2013-2021)
  mcaffrey: 'Christian McCaffrey',
  obj: 'Odell Beckham',
  odb: 'Odell Beckham',
  gronk: 'Rob Gronkowski',
  megatron: 'Calvin Johnson',
  'reshard medenhall': 'Rashard Mendenhall',
  montyball: 'Montee Ball',
  rg3: 'Robert Griffin',
  'ben rothensumtin': 'Ben Roethlisberger',
  'jonnie taylor': 'Jonathan Taylor',
  'the ju ju': 'JuJu Smith-Schuster',
  'marlon mack daddy': 'Marlon Mack',
  'jjacobs': 'Josh Jacobs',
  'david wilsonn': 'David Wilson',
  'sony m': 'Sony Michel',
  'larry fitz': 'Larry Fitzgerald',
  'jermichael finley': 'Jermichael Finley',
  'easy e': 'Ezekiel Elliott', // 2017 only
  garsone: 'Pierre Garcon',
  'golden fag': 'Golden Tate',
  'b marsh': 'Brandon Marshall', // 2014
  aj: 'A.J. Green', // 2014
  ingrum: 'Mark Ingram',
}

const skillByName = new Map() // normName -> {id, pos}
const skillById = new Map() // id -> {pos, fullNorm}
const lastNameIndex = new Map() // normLastName -> [id,...]
const defByNick = new Map() // normalized nickname/city -> id (team abbrev)
for (const id of Object.keys(pm)) {
  const p = pm[id]
  if (!p) continue
  if (p.position === 'DEF') {
    if (p.last_name) defByNick.set(norm(p.last_name), id) // "Chiefs" -> KC
    if (p.first_name) defByNick.set(norm(p.first_name), id) // "Kansas City" -> KC
    if (p.first_name && p.last_name) defByNick.set(norm(p.first_name + ' ' + p.last_name), id)
    continue
  }
  if (!['QB', 'RB', 'WR', 'TE'].includes(p.position)) continue
  if (!p.full_name) continue
  const n = norm(p.full_name)
  if (!skillByName.has(n)) skillByName.set(n, { id, pos: p.position })
  skillById.set(id, { pos: p.position, fullNorm: n })
  const last = norm(p.last_name || n.split(' ').pop())
  if (!lastNameIndex.has(last)) lastNameIndex.set(last, [])
  lastNameIndex.get(last).push(id)
}

// DEF-only truncation fixes
const NAME_FIX = {
  raven: 'ravens',
}

function matchDef(name) {
  let key = norm(name)
  if (NAME_FIX[key]) key = norm(NAME_FIX[key])
  if (defByNick.has(key)) return defByNick.get(key)
  // last token (e.g. "san francisco 49ers" -> "49ers")
  const toks = key.split(' ')
  const last = toks[toks.length - 1]
  if (defByNick.has(last)) return defByNick.get(last)
  return null
}

function matchSkill(name, yr) {
  // 2019 archive used inconsistent comma formats ("Johnson,David", "R,Woods", "Sony,M").
  // Try both token orders and take the first that resolves.
  if ((name || '').includes(',')) {
    const parts = name.split(',').map((s) => norm(s)).filter(Boolean)
    if (parts.length >= 2) {
      const swapped = resolveOne(parts.slice().reverse().join(' '), yr) // First Last
      if (swapped) return swapped
      const asIs = resolveOne(parts.join(' '), yr) // Last First
      if (asIs) return asIs
    }
  }
  return resolveOne(norm(name), yr)
}

function resolveOne(rawKey, yr) {
  let key = rawKey
  if (ALIAS[key]) key = norm(ALIAS[key])
  // 1) exact
  if (skillByName.has(key)) return skillByName.get(key)
  const toks = key.split(' ').filter(Boolean)
  const last = toks[toks.length - 1]
  const first = toks[0] || ''
  // 2) lone last-name or first-initial ("Barkley", "S Barkley", "T Higgins"): pick that
  //    last name's highest actual scorer that season (the drafted stud almost always is).
  if ((toks.length === 1 || first.length <= 1) && lastNameIndex.has(last)) {
    const cands = lastNameIndex.get(last)
    let best = null,
      bestPts = -1
    for (const id of cands) {
      const pts = yrPts(yr, id)
      if (pts > bestPts) {
        bestPts = pts
        best = id
      }
    }
    if (best && bestPts > 0) return { id: best, pos: skillById.get(best).pos }
  }
  // 3) fuzzy safety net over that season's actual scorers (conservative)
  let bestId = null,
    bestScore = 0,
    bestP = -1
  for (const id of scorersByYear[yr]) {
    const cand = skillById.get(id).fullNorm
    const d = lev(key, cand)
    const ratio = 1 - d / Math.max(key.length, cand.length)
    // require last-name first char to line up to avoid absurd matches
    const candLast = cand.split(' ').pop()
    if (last[0] !== candLast[0]) continue
    if (ratio > bestScore || (ratio === bestScore && yrPts(yr, id) > bestP)) {
      bestScore = ratio
      bestId = id
      bestP = yrPts(yr, id)
    }
  }
  if (bestId && bestScore >= 0.72) return { id: bestId, pos: skillById.get(bestId).pos }
  return null
}

// ---------- load weekly stats: {year: [week -> {id: pts_ppr}]} ----------
const weekly = {} // year -> array[week] of Map(id->pts) ; also gp per year via season stats
for (const yr of YEARS) {
  weekly[yr] = []
  for (let wk = 1; wk <= WEEKS; wk++) {
    const j = JSON.parse(fs.readFileSync(path.join(CACHE, `stats_${yr}_wk${wk}.json`), 'utf8'))
    const m = new Map()
    for (const id of Object.keys(j)) {
      const v = j[id]?.pts_ppr
      if (typeof v === 'number') m.set(id, v)
    }
    weekly[yr].push(m)
  }
}

function weekPts(yr, wk, id) {
  return weekly[yr][wk - 1].get(id) ?? 0
}

// season points per id per year (for lone-lastname disambiguation + fuzzy tie-break)
const seasonPts = {} // year -> Map(id -> total pts)
const scorersByYear = {} // year -> [id,...] with pts>0 (skill only)
for (const yr of YEARS) {
  const m = new Map()
  for (let wk = 1; wk <= WEEKS; wk++) {
    for (const [id, pts] of weekly[yr][wk - 1]) m.set(id, (m.get(id) || 0) + pts)
  }
  seasonPts[yr] = m
  scorersByYear[yr] = [...m.keys()].filter((id) => skillById.has(id) && m.get(id) > 0)
}
const yrPts = (yr, id) => seasonPts[yr].get(id) || 0

// ---------- load drafts ----------
const bundle = JSON.parse(
  fs.readFileSync(path.join(REPO, 'src/data/league-history/bundle.json'), 'utf8'),
)

// ---------- best legal lineup for one team-week ----------
function bestLineupWeek(players, yr, wk) {
  // players: [{id,pos}] with pos resolved from Sleeper (or 'DEF')
  const byPos = { QB: [], RB: [], WR: [], TE: [], DEF: [] }
  for (const p of players) {
    const pts = weekPts(yr, wk, p.id)
    if (byPos[p.pos]) byPos[p.pos].push(pts)
  }
  for (const k of Object.keys(byPos)) byPos[k].sort((a, b) => b - a)
  let total = 0
  const take = (arr, n) => {
    const picked = arr.slice(0, n)
    return picked.reduce((s, x) => s + x, 0)
  }
  // required singles
  total += take(byPos.QB, 1)
  total += take(byPos.DEF, 1)
  // one each RB/WR/TE, then 3 flex from the remainder
  const rbRest = byPos.RB.slice(1)
  const wrRest = byPos.WR.slice(1)
  const teRest = byPos.TE.slice(1)
  total += take(byPos.RB, 1) + take(byPos.WR, 1) + take(byPos.TE, 1)
  const flexPool = [...rbRest, ...wrRest, ...teRest].sort((a, b) => b - a)
  total += take(flexPool, 3)
  return total
}

// ---------- run ----------
const rows = [] // {year, owner, points, top2Share, top1Price, spendConc, unmatchedCost, busts:[]}
const unmatchedGlobal = []

for (const yr of YEARS) {
  const key = `nasties-${yr}`
  const st = bundle.drafts[key]?.state
  if (!st) {
    console.log('MISSING draft', key)
    continue
  }
  const teams = st.config.teams
  const picksByTeam = new Map()
  for (const pick of st.picks) {
    if (!picksByTeam.has(pick.teamId)) picksByTeam.set(pick.teamId, [])
    picksByTeam.get(pick.teamId).push(pick)
  }

  for (const team of teams) {
    const picks = picksByTeam.get(team.id) || []
    const resolved = []
    let unmatchedCost = 0
    const unmatchedNames = []
    for (const pk of picks) {
      const nm = pk.player.name
      const isDef = /d\/st|dst/i.test(nm) || pk.player.position === 'DEF' || pk.player.position === 'DST'
      if (isDef) {
        const id = matchDef(nm)
        if (id) resolved.push({ id, pos: 'DEF', name: nm, price: pk.price })
        else {
          unmatchedCost += pk.price
          unmatchedNames.push(nm + '(DEF)')
        }
        continue
      }
      const m = matchSkill(nm, yr)
      if (m) resolved.push({ id: m.id, pos: m.pos, name: nm, price: pk.price })
      else {
        unmatchedCost += pk.price
        unmatchedNames.push(nm + `($${pk.price})`)
        unmatchedGlobal.push({ yr, owner: team.name, name: nm, price: pk.price })
      }
    }

    // season points = sum of best legal lineup each week
    let seasonPts = 0
    for (let wk = 1; wk <= WEEKS; wk++) seasonPts += bestLineupWeek(resolved, yr, wk)

    // concentration
    const prices = picks.map((p) => p.price).sort((a, b) => b - a)
    const top1 = prices[0] || 0
    const top2 = (prices[0] || 0) + (prices[1] || 0)
    const top2Share = top2 / 200

    // bust detector: expensive picks (>=$25) whose season pts landed low
    const busts = resolved
      .filter((r) => r.price >= 25)
      .map((r) => {
        let pts = 0
        for (let wk = 1; wk <= WEEKS; wk++) pts += weekPts(yr, wk, r.id)
        return { name: r.name, pos: r.pos, price: r.price, pts: Math.round(pts) }
      })
      .sort((a, b) => a.pts / a.price - b.pts / b.price)

    rows.push({
      year: yr,
      owner: team.name,
      points: Math.round(seasonPts),
      top1,
      top2,
      top2Share: +(top2Share * 100).toFixed(0),
      unmatchedCost,
      unmatchedNames,
      busts,
    })
  }
}

// rank within each year (finish = points rank, 1 = best)
for (const yr of YEARS) {
  const yrRows = rows.filter((r) => r.year === yr).sort((a, b) => b.points - a.points)
  yrRows.forEach((r, i) => {
    r.finish = i + 1
  })
}

// ---------- MATCH-QUALITY PER YEAR + CLEAN-SAMPLE GATE ----------
// Sleeper's player map drops players who retired before ~2012, so 2010-2011
// lose real studs (Randy Moss, Michael Turner, T.O., etc.) that cannot be
// recovered by any name-join. Those years are reported for standings context
// but EXCLUDED from the concentration correlation so the signal stays honest.
const UNMATCH_THRESHOLD = 100 // $ of unmatched draft capital per year that flips a year to low-confidence
const yearQuality = YEARS.map((yr) => {
  const yrRows = rows.filter((r) => r.year === yr)
  const unmatched = yrRows.reduce((s, r) => s + r.unmatchedCost, 0)
  return { year: yr, unmatched, clean: unmatched <= UNMATCH_THRESHOLD }
})
const CLEAN_YEARS = yearQuality.filter((q) => q.clean).map((q) => q.year)
const EXCLUDED_YEARS = yearQuality.filter((q) => !q.clean).map((q) => q.year)
const cleanRows = rows.filter((r) => CLEAN_YEARS.includes(r.year))
// tag each row with its year's confidence for the JSON consumers
const qualByYear = new Map(yearQuality.map((q) => [q.year, q]))
for (const r of rows) r.dataConfidence = qualByYear.get(r.year).clean ? 'clean' : 'low'

// ---------- OUTPUT ----------
const out = {
  years: YEARS,
  weeks: WEEKS,
  generatedFor: 'Nasties as-drafted backtest',
  cleanYears: CLEAN_YEARS,
  excludedYears: EXCLUDED_YEARS,
  excludedReason:
    'Sleeper NFL player map omits players who retired before ~2012, so pre-2012 drafts lose real studs that cannot be name-joined. These years appear in standings for context but are excluded from the concentration correlation.',
  yearQuality,
  rows,
}
fs.writeFileSync(path.join(REPO, 'research-output/backtest-as-drafted.json'), JSON.stringify(out, null, 2))

// console report
const line = (s = '') => console.log(s)
line('='.repeat(70))
line('NASTIES BACKTEST — team AS DRAFTED, scored on ACTUAL season PPR points')
line(`Best legal lineup each week, weeks 1-${WEEKS}. ${YEARS.join(', ')}.`)
line('='.repeat(70))

// match quality
const totalUnmatched = rows.reduce((s, r) => s + r.unmatchedCost, 0)
line(`\nUnmatched draft $ across all team-years: $${totalUnmatched} (lower = cleaner join)`)
if (unmatchedGlobal.length) {
  const big = unmatchedGlobal.filter((u) => u.price >= 15).sort((a, b) => b.price - a.price)
  if (big.length) line('  Notable unmatched (>=$15): ' + big.map((u) => `${u.name} $${u.price} [${u.yr} ${u.owner}]`).join(', '))
}

for (const yr of YEARS) {
  line(`\n----- ${yr} (as-drafted finish by total points) -----`)
  const yrRows = rows.filter((r) => r.year === yr).sort((a, b) => a.finish - b.finish)
  line('  #  Owner       Points  Top1  Top2  Top2%  Unmatched')
  for (const r of yrRows) {
    const star = r.owner === 'Rasar' ? ' <== YOU' : ''
    line(
      `  ${String(r.finish).padStart(2)}  ${r.owner.padEnd(10)}  ${String(r.points).padStart(5)}  $${String(r.top1).padStart(3)}  $${String(r.top2).padStart(3)}  ${String(r.top2Share).padStart(3)}%   ${r.unmatchedCost ? '$' + r.unmatchedCost : '-'}${star}`,
    )
  }
}

// KEY QUESTION: does concentration (top-2 spend) correlate with finish?
line(`\n${'='.repeat(70)}`)
line('DOES SPENDING BIG ON TWO GUYS WIN?  (clean-join years only)')
line('='.repeat(70))
line(`Excluded (Sleeper map gaps, unmatched > $${UNMATCH_THRESHOLD}): ${EXCLUDED_YEARS.join(', ') || 'none'}`)
line(`Clean years used: ${CLEAN_YEARS.join(', ')} (${cleanRows.length} team-seasons)`)
// split by concentration tercile
const sorted = [...cleanRows].sort((a, b) => b.top2Share - a.top2Share)
const n = sorted.length
const third = Math.floor(n / 3)
const highConc = sorted.slice(0, third)
const lowConc = sorted.slice(n - third)
const avgFinish = (g) => (g.reduce((s, r) => s + r.finish, 0) / g.length).toFixed(2)
const avgTop2 = (g) => (g.reduce((s, r) => s + r.top2Share, 0) / g.length).toFixed(0)
const topHalf = (g) => ((g.filter((r) => r.finish <= 6).length / g.length) * 100).toFixed(0)
line(`\nHIGH concentration (top third, avg top-2 = ${avgTop2(highConc)}% of budget):`)
line(`  avg as-drafted finish: ${avgFinish(highConc)} of 12   |  made top-6: ${topHalf(highConc)}%`)
line(`LOW concentration (bottom third, avg top-2 = ${avgTop2(lowConc)}% of budget):`)
line(`  avg as-drafted finish: ${avgFinish(lowConc)} of 12   |  made top-6: ${topHalf(lowConc)}%`)

// pearson corr top2Share vs finish (finish lower=better, so negative corr = concentration helps)
function pearson(xs, ys) {
  const n = xs.length
  const mx = xs.reduce((a, b) => a + b, 0) / n
  const my = ys.reduce((a, b) => a + b, 0) / n
  let num = 0,
    dx = 0,
    dy = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my)
    dx += (xs[i] - mx) ** 2
    dy += (ys[i] - my) ** 2
  }
  return num / Math.sqrt(dx * dy)
}
const r = pearson(cleanRows.map((x) => x.top2Share), cleanRows.map((x) => x.finish))
line(`\nCorrelation(top-2 spend %, finish rank) = ${r.toFixed(3)}`)
line(`  (negative = concentration tends to finish BETTER; positive = concentration finishes WORSE)`)

// Rasar's own history
line(`\n${'='.repeat(70)}`)
line('YOUR (Rasar) as-drafted finishes')
line('='.repeat(70))
for (const yr of YEARS) {
  const me = rows.find((x) => x.year === yr && x.owner === 'Rasar')
  if (!me) continue
  line(`  ${yr}: finished ${me.finish}/12  (${me.points} pts, top-2 spend ${me.top2Share}% = $${me.top2})`)
  const worst = me.busts.filter((b) => b.pts / b.price < 4).slice(0, 3)
  if (worst.length) line(`        underperforming pricey picks: ` + worst.map((b) => `${b.name} $${b.price}->${b.pts}pts`).join(', '))
}

// biggest busts leaguewide (expensive, low actual)
line(`\n${'='.repeat(70)}`)
line('BIGGEST DRAFT-CAPITAL BUSTS (>=$30, worst pts-per-$ = injuries/collapses)')
line('='.repeat(70))
const allBusts = []
for (const rrow of rows) for (const b of rrow.busts) if (b.price >= 30) allBusts.push({ ...b, year: rrow.year, owner: rrow.owner })
allBusts.sort((a, b) => a.pts / a.price - b.pts / b.price)
for (const b of allBusts.slice(0, 12)) line(`  ${b.year} ${b.owner.padEnd(9)} ${b.name.padEnd(20)} $${String(b.price).padStart(3)} -> ${String(b.pts).padStart(3)} pts`)

// ---------- markdown report ----------
const md = []
md.push('# Nasties Backtest — Draft Quality on Actual Points\n')
md.push(
  `Each team scored **as drafted** (exact picks, no waivers/trades) on that season's **actual weekly PPR points**, best legal lineup each week (QB1/RB1/WR1/TE1/FLEX3/DEF1), weeks 1-${WEEKS}. Data: local draft bundle + Sleeper historical stats. Injuries are baked in via real games played. Ranking = total points within the year (schedule luck removed).\n`,
)
md.push(`Years attempted: ${YEARS.join(', ')}.\n`)
md.push(
  `\n**Data confidence:** ${EXCLUDED_YEARS.length ? EXCLUDED_YEARS.join(', ') + ' are EXCLUDED from the concentration analysis' : 'all years used'} — Sleeper's NFL player map omits players who retired before ~2012, so those drafts lose real studs that cannot be name-joined (unmatched > $${UNMATCH_THRESHOLD}). Clean years used: ${CLEAN_YEARS.join(', ')}. Per-year unmatched $: ${yearQuality.map((q) => q.year + '=$' + q.unmatched).join(', ')}. Real end-of-season finishes for every year live in \`src/data/league-history/nasties-standings.json\`.\n`,
)
md.push('\n## The question: does spending big on two players win?\n')
md.push('| Group | avg top-2 spend | avg as-drafted finish | made top-6 |')
md.push('|---|---|---|---|')
md.push(`| HIGH concentration (top third) | ${avgTop2(highConc)}% of budget | ${avgFinish(highConc)} / 12 | ${topHalf(highConc)}% |`)
md.push(`| LOW concentration (bottom third) | ${avgTop2(lowConc)}% of budget | ${avgFinish(lowConc)} / 12 | ${topHalf(lowConc)}% |`)
md.push(`\nCorrelation(top-2 spend %, finish rank) = **${r.toFixed(3)}** (positive = concentration finishes worse). Sample: ${cleanRows.length} team-seasons across ${CLEAN_YEARS.length} clean years; directional, not conclusive.\n`)
md.push('\n## Rasar (you) — as-drafted finishes\n')
md.push('| Year | As-drafted finish | Total pts | Top-2 spend |')
md.push('|---|---|---|---|')
for (const yr of YEARS) {
  const me = rows.find((x) => x.year === yr && x.owner === 'Rasar')
  if (me) md.push(`| ${yr} | ${me.finish} / 12 | ${me.points} | ${me.top2Share}% ($${me.top2}) |`)
}
md.push('\n## Biggest draft-capital busts (>= $30, worst points-per-dollar)\n')
md.push('| Year | Owner | Player | Price | Actual pts (wk1-14) |')
md.push('|---|---|---|---|---|')
for (const b of allBusts.slice(0, 12)) md.push(`| ${b.year} | ${b.owner} | ${b.name} | $${b.price} | ${b.pts} |`)
md.push('\n## Full standings by year\n')
for (const yr of YEARS) {
  md.push(`\n### ${yr}\n`)
  md.push('| # | Owner | Points | Top-1 | Top-2 | Top-2 % |')
  md.push('|---|---|---|---|---|---|')
  const yrRows = rows.filter((x) => x.year === yr).sort((a, b) => a.finish - b.finish)
  for (const x of yrRows) md.push(`| ${x.finish} | ${x.owner} | ${x.points} | $${x.top1} | $${x.top2} | ${x.top2Share}% |`)
}
fs.writeFileSync(path.join(REPO, 'research-output/backtest-as-drafted.md'), md.join('\n') + '\n')

line('\nWrote research-output/backtest-as-drafted.json + .md')
