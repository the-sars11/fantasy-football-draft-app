/**
 * READ-ONLY on the ledger, WRITES one artifact. $0 — local files only, no
 * network / DB / Claude.
 *
 * VAL-0 → VAL-2 foundation. Reads the REAL Nasties auction ledger that now lives
 * IN THIS REPO (src/data/league-history/) — no sibling-repo path — and derives
 * how Joe's room actually prices players, then writes a committed artifact
 * (src/data/league-history/league-calibration.json) that the runtime loads:
 *
 *   1. Per-position EXPECTED-PRICE-by-rank curves (the "REALITY" number): the
 *      Nth-most-expensive player at a position costs $X on average in the
 *      current-format era (156-pick / 13-slot, 2022-2025). This is what the room
 *      pays for "the RB5", "the WR3", "the TE1".
 *   2. Positional inflation vs a national PPR baseline (WR runs hot, RB runs cool
 *      in the Nasties) — the exploit signal VAL-2 builds on.
 *   3. Per-owner positional leans (who over-indexes on which position vs the
 *      room) — the VAL-2 exploit layer for reading the table.
 *
 * Position labels in bundle.json are corrupted (all flex/bench mislabeled "RB"),
 * so real positions come from history-corrected.json (VAL-0.1) via a
 * normalized-name join. DEF passes through from the bundle.
 *
 * Usage: npx tsx scripts/derive-league-calibration.ts
 *   (prints the human-readable calibration AND rewrites the JSON artifact)
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const DATA = join(process.cwd(), 'src', 'data', 'league-history')
const BUNDLE = join(DATA, 'bundle.json')
const CORRECTED = join(DATA, 'history-corrected.json')
const ARTIFACT = join(DATA, 'league-calibration.json')

interface Pick {
  player: { name: string; position: string }
  price: number
}
interface Draft {
  state: { config: { teams: { name?: string; roster: Pick[] }[] } }
}
interface Bundle {
  index: { id: string; year: number; pickCount: number }[]
  drafts: Record<string, Draft>
}

const corrected = JSON.parse(readFileSync(CORRECTED, 'utf-8')) as {
  byName: Record<string, { position: string }>
}

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v'])
function norm(raw: string): string {
  const s = String(raw ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return s
    .split(' ')
    .filter((t) => t && !SUFFIXES.has(t))
    .join(' ')
}

const normPos = (p: string) => (p === 'DST' ? 'DEF' : p)

// TRUE position: corrected layer first, bundle label (DEF passthrough) as fallback.
function truePos(p: Pick): string {
  if (normPos(p.player.position) === 'DEF') return 'DEF'
  const c = corrected.byName[norm(p.player.name)]
  return c ? normPos(c.position) : normPos(p.player.position)
}

function picksOf(d: Draft): Pick[] {
  const out: Pick[] = []
  for (const t of d.state.config.teams) for (const p of t.roster || []) out.push(p)
  return out
}

const POSITIONS = ['RB', 'WR', 'QB', 'TE', 'DEF'] as const
type Pos = (typeof POSITIONS)[number]

// National PPR spend baseline (share of a $200 x 12 room). Anchors the
// positional-inflation read; the room's own spend is measured against it.
const NATIONAL: Record<Pos, number> = { RB: 46, WR: 38, QB: 8, TE: 7, DEF: 1 }

function inflationTag(mult: number): 'HOT' | 'COOL' | 'NEUTRAL' {
  return mult >= 1.15 ? 'HOT' : mult <= 0.85 ? 'COOL' : 'NEUTRAL'
}

function ownerLeanTag(mult: number): 'HEAVY' | 'LIGHT' | 'NEUTRAL' {
  return mult >= 1.2 ? 'HEAVY' : mult <= 0.8 ? 'LIGHT' : 'NEUTRAL'
}

function main() {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf-8')) as Bundle
  const era = bundle.index.filter((i) => i.pickCount === 156).sort((a, b) => a.year - b.year)
  const yy = era.length

  // --- 1. Per-position expected-price-by-rank curves ---
  const rankPriceSum: Record<Pos, number[]> = { QB: [], RB: [], WR: [], TE: [], DEF: [] }
  const posCount: Record<Pos, number[]> = { QB: [], RB: [], WR: [], TE: [], DEF: [] }

  for (const idx of era) {
    const byPos: Record<Pos, number[]> = { QB: [], RB: [], WR: [], TE: [], DEF: [] }
    for (const p of picksOf(bundle.drafts[idx.id])) {
      const pos = truePos(p) as Pos
      if (byPos[pos]) byPos[pos].push(p.price)
    }
    for (const pos of POSITIONS) {
      byPos[pos].sort((a, b) => b - a)
      posCount[pos].push(byPos[pos].length)
      byPos[pos].forEach((price, i) => {
        rankPriceSum[pos][i] = (rankPriceSum[pos][i] || 0) + price
      })
    }
  }

  const curves = {} as Record<Pos, number[]>
  const avgDrafted = {} as Record<Pos, number>
  const curveDepth: Record<Pos, number> = { RB: 24, WR: 24, QB: 14, TE: 14, DEF: 6 }
  for (const pos of POSITIONS) {
    curves[pos] = rankPriceSum[pos]
      .slice(0, curveDepth[pos])
      .map((s) => Math.round(s / yy))
    avgDrafted[pos] = Math.round(posCount[pos].reduce((a, b) => a + b, 0) / yy)
  }

  // --- 2. Positional inflation vs national baseline ---
  const spend: Record<Pos, number> = { QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0 }
  let total = 0
  for (const idx of era)
    for (const p of picksOf(bundle.drafts[idx.id])) {
      const pos = truePos(p) as Pos
      if (spend[pos] === undefined) continue
      spend[pos] += p.price
      total += p.price
    }

  const inflation = {} as Record<Pos, { sharePct: number; nationalPct: number; multiplier: number; tag: string }>
  for (const pos of POSITIONS) {
    const yours = (spend[pos] / total) * 100
    const mult = yours / NATIONAL[pos]
    inflation[pos] = {
      sharePct: Math.round(yours * 10) / 10,
      nationalPct: NATIONAL[pos],
      multiplier: Math.round(mult * 100) / 100,
      tag: inflationTag(mult),
    }
  }

  // --- 3. Per-owner positional leans ---
  // owner (team.name) -> position -> total $ spent, across the era. Compared to
  // the room's own positional share to surface who over-/under-indexes where.
  const ownerSpend: Record<string, Record<Pos, number>> = {}
  const ownerTotal: Record<string, number> = {}
  const ownerYears: Record<string, Set<number>> = {}
  for (const idx of era) {
    for (const t of bundle.drafts[idx.id].state.config.teams) {
      const owner = (t.name || '').trim()
      if (!owner) continue
      ownerSpend[owner] ??= { QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0 }
      ownerTotal[owner] ??= 0
      ownerYears[owner] ??= new Set()
      ownerYears[owner].add(idx.year)
      for (const p of t.roster || []) {
        const pos = truePos(p) as Pos
        if (ownerSpend[owner][pos] === undefined) continue
        ownerSpend[owner][pos] += p.price
        ownerTotal[owner] += p.price
      }
    }
  }

  // Room-average positional share (denominator for each owner's lean multiplier).
  const roomShare = {} as Record<Pos, number>
  for (const pos of POSITIONS) roomShare[pos] = spend[pos] / total

  const ownerLeans: Record<
    string,
    {
      yearsPresent: number
      totalSpent: number
      byPos: Record<Pos, { sharePct: number; vsRoom: number; lean: string }>
      topLean: { position: Pos; vsRoom: number } | null
    }
  > = {}
  for (const owner of Object.keys(ownerSpend).sort()) {
    const tot = ownerTotal[owner]
    if (tot <= 0) continue
    const byPos = {} as Record<Pos, { sharePct: number; vsRoom: number; lean: string }>
    let top: { position: Pos; vsRoom: number } | null = null
    for (const pos of POSITIONS) {
      const share = ownerSpend[owner][pos] / tot
      const vsRoom = roomShare[pos] > 0 ? share / roomShare[pos] : 0
      byPos[pos] = {
        sharePct: Math.round(share * 1000) / 10,
        vsRoom: Math.round(vsRoom * 100) / 100,
        lean: ownerLeanTag(vsRoom),
      }
      if (byPos[pos].lean === 'HEAVY' && (!top || vsRoom > top.vsRoom)) {
        top = { position: pos, vsRoom: byPos[pos].vsRoom }
      }
    }
    ownerLeans[owner] = {
      yearsPresent: ownerYears[owner].size,
      totalSpent: tot,
      byPos,
      topLean: top,
    }
  }

  // --- Write the committed artifact ---
  const artifact = {
    _comment:
      'VAL-1.1 / VAL-2 calibration artifact. Generated by scripts/derive-league-calibration.ts ' +
      'from the corrected in-repo 16-year Nasties ledger. $0, local-only. Re-run the script to regenerate. ' +
      'curves[pos][i] = avg $ paid for the (i+1)-th most expensive player at that position in the room. ' +
      'inflation = room spend share vs national PPR baseline. ownerLeans = per-owner positional over/under-index.',
    era: era.map((e) => e.year),
    draftsUsed: era.length,
    curves,
    avgDrafted,
    inflation,
    roomTotalSpentPerYear: Math.round(total / yy),
    ownerLeans,
  }
  writeFileSync(ARTIFACT, JSON.stringify(artifact, null, 2) + '\n', 'utf-8')

  // --- Human-readable proof (unchanged behaviour + owner leans) ---
  console.log(`Source: in-repo src/data/league-history/ (era ${era.map((e) => e.year).join('/')})\n`)
  console.log("Your room's EXPECTED PRICE by position-rank (avg $):\n")
  for (const pos of POSITIONS) {
    const show = pos === 'RB' || pos === 'WR' ? 16 : pos === 'QB' || pos === 'TE' ? 12 : 4
    const line = curves[pos]
      .slice(0, show)
      .map((v, i) => `${pos}${i + 1}:$${v}`)
      .join('  ')
    console.log(`  ${pos} (${avgDrafted[pos]} drafted/yr)\n    ${line}\n`)
  }

  console.log('Positional inflation - your room vs national PPR baseline:')
  for (const pos of POSITIONS) {
    const inf = inflation[pos]
    const tag =
      inf.tag === 'HOT'
        ? 'RUNS HOT (let them overpay)'
        : inf.tag === 'COOL'
          ? 'RUNS COOL (value pocket)'
          : 'roughly national'
    console.log(
      `  ${pos.padEnd(3)} yours ${inf.sharePct.toFixed(0)}%  vs nat ${inf.nationalPct}%  =>  ${inf.multiplier.toFixed(2)}x  ${tag}`,
    )
  }

  console.log('\nPer-owner positional leans (vs room, HEAVY >= 1.2x / LIGHT <= 0.8x):')
  for (const owner of Object.keys(ownerLeans).sort(
    (a, b) => ownerLeans[b].totalSpent - ownerLeans[a].totalSpent,
  )) {
    const o = ownerLeans[owner]
    const top = o.topLean ? `${o.topLean.position} ${o.topLean.vsRoom.toFixed(2)}x` : 'balanced'
    console.log(`  ${owner.padEnd(12)} ${o.yearsPresent}yr  top lean: ${top}`)
  }

  console.log(`\nArtifact written: ${ARTIFACT}`)
}

main()
