import { describe, it, expect } from 'vitest'
import { buildDraftPlan } from './draft-plan'
import type {
  ResearchDataset,
  EnrichedPlayer,
  DatasetStudCombo,
  DatasetStrategy,
} from '@/lib/research/dataset-types'
import type { Position } from '@/lib/players/types'
import type { PlayerTagId } from '@/lib/players/tags'

// ── Minimal typed fixtures - only the fields buildDraftPlan actually reads are
// meaningful; the rest are filled to satisfy the contract via a narrow cast. ──

function player(
  id: string,
  name: string,
  position: Position,
  opts: {
    ceilingValue?: number | null
    expectedRoomPrice?: number | null
    valueGap?: number | null
    tags?: PlayerTagId[]
    durabilityPriceFactor?: number
    injuryStatus?: string | null
  } = {},
): EnrichedPlayer {
  return {
    id,
    name,
    position,
    ceilingValue: opts.ceilingValue ?? null,
    expectedRoomPrice: opts.expectedRoomPrice ?? null,
    valueGap: opts.valueGap ?? null,
    durabilityPriceFactor: opts.durabilityPriceFactor ?? 1,
    injuryStatus: opts.injuryStatus ?? null,
    tags: (opts.tags ?? []).map((id) => ({ id, label: id, hint: '' })),
  } as unknown as EnrichedPlayer
}

function combo(
  anchorNames: string[],
  meanWins: number,
  prices: { name: string; walkUp: number }[] = [],
): DatasetStudCombo {
  return {
    patternKey: anchorNames.join('+'),
    patternLabel: anchorNames.join(' + '),
    anchorNames,
    proposal: {
      name: anchorNames.join(' + '),
      target_pricing: { prices: prices.map((p) => ({ ...p, position: 'RB', price: p.walkUp, baseValue: p.walkUp })) },
    },
    sim: { grade: { meanWins, meanLosses: 14 - meanWins } },
  } as unknown as DatasetStudCombo
}

function strategy(meanWins: number): DatasetStrategy {
  return { sim: { grade: { meanWins, meanLosses: 14 - meanWins } } } as unknown as DatasetStrategy
}

function dataset(over: Partial<ResearchDataset>): ResearchDataset {
  return {
    meta: { generatedAt: '2026-08-23T00:00:00Z', simRunsPerStrategy: 400 },
    leagueIntel: {
      positionalInflation: {
        RB: { sharePct: 38.6, nationalPct: 46, multiplier: 0.84, tag: 'COOL' },
        WR: { sharePct: 44.7, nationalPct: 38, multiplier: 1.18, tag: 'HOT' },
      },
    },
    strategies: [],
    studCombos: [],
    players: [],
    ...over,
  } as unknown as ResearchDataset
}

describe('buildDraftPlan', () => {
  it('returns null for a null dataset', () => {
    expect(buildDraftPlan(null)).toBeNull()
  })

  it('picks the most-frequent stud across top combos as the anchor', () => {
    const players = [
      player('gibbs', 'Jahmyr Gibbs', 'RB', { ceilingValue: 96, expectedRoomPrice: 76 }),
      player('jsn', 'Jaxon Smith-Njigba', 'WR', { ceilingValue: 74, expectedRoomPrice: 64 }),
      player('bijan', 'Bijan Robinson', 'RB', { ceilingValue: 88, expectedRoomPrice: 78 }),
    ]
    const plan = buildDraftPlan(
      dataset({
        players,
        studCombos: [
          combo(['Jahmyr Gibbs', 'Jaxon Smith-Njigba'], 8.9, [{ name: 'Jahmyr Gibbs', walkUp: 86 }, { name: 'Jaxon Smith-Njigba', walkUp: 75 }]),
          combo(['Jahmyr Gibbs', 'Bijan Robinson'], 8.8, [{ name: 'Jahmyr Gibbs', walkUp: 84 }, { name: 'Bijan Robinson', walkUp: 75 }]),
        ],
      }),
    )
    expect(plan?.anchor?.player.name).toBe('Jahmyr Gibbs')
    // Anchor walk-away is the MAX walk-up seen across combos.
    expect(plan?.anchor?.player.walkAway).toBe(86)
    // Top pairing record shown.
    expect(plan?.anchor?.record).toBe('8.9-5.1')
  })

  it('lists the other stud in each pairing as a second-buy, best first, best flag on top grade', () => {
    const players = [
      player('gibbs', 'Jahmyr Gibbs', 'RB', { ceilingValue: 96, expectedRoomPrice: 76 }),
      player('jsn', 'Jaxon Smith-Njigba', 'WR', { ceilingValue: 74, expectedRoomPrice: 64 }),
      player('bijan', 'Bijan Robinson', 'RB', { ceilingValue: 88, expectedRoomPrice: 78 }),
    ]
    const plan = buildDraftPlan(
      dataset({
        players,
        studCombos: [
          combo(['Jahmyr Gibbs', 'Bijan Robinson'], 8.8, [{ name: 'Bijan Robinson', walkUp: 75 }]),
          combo(['Jahmyr Gibbs', 'Jaxon Smith-Njigba'], 8.9, [{ name: 'Jaxon Smith-Njigba', walkUp: 75 }]),
        ],
      }),
    )
    const names = plan?.secondBuys.map((b) => b.name)
    expect(names).toEqual(['Jaxon Smith-Njigba', 'Bijan Robinson'])
    expect(plan?.secondBuys[0].best).toBe(true) // 8.9 is top
    expect(plan?.secondBuys[1].best).toBe(false) // 8.8 is not
    expect(plan?.secondBuys[0].walkAway).toBe(75)
  })

  it('derives pockets from pocket/sleeper tags and flags injuries', () => {
    const plan = buildDraftPlan(
      dataset({
        players: [
          player('nix', 'Bo Nix', 'QB', { ceilingValue: 33, expectedRoomPrice: 1, valueGap: 32, tags: ['pocket'] }),
          player('judkins', 'Quinshon Judkins', 'RB', { ceilingValue: 33, expectedRoomPrice: 12, valueGap: 21, tags: ['pocket'], durabilityPriceFactor: 0.9 }),
          player('nobody', 'Regular Guy', 'WR', { ceilingValue: 20, expectedRoomPrice: 20, valueGap: 0 }),
        ],
      }),
    )
    const names = plan?.pockets.map((p) => p.name)
    expect(names).toEqual(['Bo Nix', 'Quinshon Judkins']) // sorted by valueGap desc, non-tagged excluded
    expect(plan?.pockets.find((p) => p.name === 'Quinshon Judkins')?.injury).toBe(true)
    expect(plan?.pockets.find((p) => p.name === 'Bo Nix')?.injury).toBe(false)
    // Pocket walk-away falls back to worth (ceilingValue) when no combo price.
    expect(plan?.pockets[0].walkAway).toBe(33)
  })

  it('derives overpays from tax tags with room-over-worth math', () => {
    const plan = buildDraftPlan(
      dataset({
        players: [
          player('lamb', 'CeeDee Lamb', 'WR', { ceilingValue: 49, expectedRoomPrice: 60, valueGap: -11, tags: ['tax'] }),
        ],
      }),
    )
    expect(plan?.overpays[0].name).toBe('CeeDee Lamb')
    expect(plan?.overpays[0].overpay).toBe(11) // 60 - 49
  })

  it('carries the room read and strategy spread', () => {
    const plan = buildDraftPlan(
      dataset({ strategies: [strategy(8.3), strategy(9.0), strategy(8.6)] }),
    )
    expect(plan?.roomRead.find((r) => r.position === 'WR')?.tag).toBe('HOT')
    expect(plan?.spread).toEqual({ min: 8.3, max: 9.0 })
  })
})
