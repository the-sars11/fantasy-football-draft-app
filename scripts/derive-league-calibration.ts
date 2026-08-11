/**
 * READ-ONLY. $0 — local files only, no network / DB / Claude.
 *
 * VAL-0/VAL-1 foundation. Reads the REAL Nasties auction ledger that now lives
 * IN THIS REPO (src/data/league-history/) — no sibling-repo path — and derives
 * how Joe's room actually prices players:
 *
 *   1. Per-position EXPECTED-PRICE-by-rank curves (the "REALITY" number): the
 *      Nth-most-expensive player at a position costs $X on average in the
 *      current-format era (156-pick / 13-slot, 2022-2025). This is what the room
 *      pays for "the RB5", "the WR3", "the TE1".
 *   2. Positional inflation vs a national PPR baseline (WR runs hot, RB runs cool
 *      in the Nasties) — the exploit signal VAL-2 builds on.
 *
 * Position labels in bundle.json are corrupted (all flex/bench mislabeled "RB"),
 * so real positions come from history-corrected.json (VAL-0.1) via a
 * normalized-name join. DEF passes through from the bundle.
 *
 * Usage: npx tsx scripts/derive-league-calibration.ts
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const DATA = join(process.cwd(), 'src', 'data', 'league-history')
const BUNDLE = join(DATA, 'bundle.json')
const CORRECTED = join(DATA, 'history-corrected.json')

interface Pick {
  player: { name: string; position: string }
  price: number
}
interface Draft {
  state: { config: { teams: { roster: Pick[] }[] } }
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

function main() {
  const bundle = JSON.parse(readFileSync(BUNDLE, 'utf-8')) as Bundle
  const era = bundle.index.filter((i) => i.pickCount === 156).sort((a, b) => a.year - b.year)
  const yy = era.length

  const rankPriceSum: Record<string, number[]> = { QB: [], RB: [], WR: [], TE: [], DEF: [] }
  const posCount: Record<string, number[]> = { QB: [], RB: [], WR: [], TE: [], DEF: [] }

  for (const idx of era) {
    const byPos: Record<string, number[]> = { QB: [], RB: [], WR: [], TE: [], DEF: [] }
    for (const p of picksOf(bundle.drafts[idx.id])) {
      const pos = truePos(p)
      if (byPos[pos]) byPos[pos].push(p.price)
    }
    for (const pos of Object.keys(byPos)) {
      byPos[pos].sort((a, b) => b - a)
      posCount[pos].push(byPos[pos].length)
      byPos[pos].forEach((price, i) => {
        rankPriceSum[pos][i] = (rankPriceSum[pos][i] || 0) + price
      })
    }
  }

  console.log(`Source: in-repo src/data/league-history/ (era ${era.map((e) => e.year).join('/')})\n`)
  console.log("Your room's EXPECTED PRICE by position-rank (avg $):\n")
  for (const pos of ['RB', 'WR', 'QB', 'TE', 'DEF']) {
    const avg = rankPriceSum[pos].map((s) => Math.round(s / yy))
    const avgCount = Math.round(posCount[pos].reduce((a, b) => a + b, 0) / yy)
    const show = pos === 'RB' || pos === 'WR' ? 16 : pos === 'QB' || pos === 'TE' ? 12 : 4
    const line = avg
      .slice(0, show)
      .map((v, i) => `${pos}${i + 1}:$${v}`)
      .join('  ')
    console.log(`  ${pos} (${avgCount} drafted/yr)\n    ${line}\n`)
  }

  const NATIONAL: Record<string, number> = { RB: 46, WR: 38, QB: 8, TE: 7, DEF: 1 }
  const spend: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0 }
  let total = 0
  for (const idx of era)
    for (const p of picksOf(bundle.drafts[idx.id])) {
      const pos = truePos(p)
      if (spend[pos] === undefined) continue
      spend[pos] += p.price
      total += p.price
    }
  console.log('Positional inflation — your room vs national PPR baseline:')
  for (const pos of ['RB', 'WR', 'QB', 'TE', 'DEF']) {
    const yours = (spend[pos] / total) * 100
    const nat = NATIONAL[pos]
    const mult = yours / nat
    const tag =
      mult >= 1.15
        ? 'RUNS HOT (let them overpay)'
        : mult <= 0.85
          ? 'RUNS COOL (value pocket)'
          : 'roughly national'
    console.log(
      `  ${pos.padEnd(3)} yours ${yours.toFixed(0)}%  vs nat ${nat}%  =>  ${mult.toFixed(2)}x  ${tag}`,
    )
  }
}

main()
