/**
 * F1 regression: live-draft tier scarcity requires the CachedPlayer -> Player
 * mapping (cacheToPlayers).
 *
 * The bug (TEST_FINDINGS F1): the live draft room fetched raw `players_cache`
 * rows from GET /api/players and fed them straight into a `Player[]`-typed
 * state without running the canonical `cacheToPlayers` mapping that every prep
 * screen uses. Raw rows have NO top-level `consensusTier` (the FantasyPros tier
 * lives under `source_data.tier`), so `calculateScarcity`'s tier filters
 * (`consensusTier <= 1`, `=== 2`, `>= 3`) all evaluated against `undefined` and
 * returned 0 for every tier at every position. The Tier Context read
 * T1:0..T5:0 across the board and the `urgency-<POS>` awareness items (gated on
 * `tier1Remaining > 0`) never surfaced.
 *
 * The fix maps the fetched rows through `cacheToPlayers` in
 * `src/hooks/use-live-draft-data.ts` at all three setPlayers sites, so
 * `consensusTier` is populated from the real FP tier (or an ADP fallback).
 *
 * These assertions are un-fakable: the SAME rows, unmapped, must yield 0 (the
 * documented bug) and, mapped, must yield the exact real tier-1/tier-2 counts.
 */

import { describe, it, expect } from 'vitest'
import type { CachedPlayer } from '@/lib/research/cache'
import type { Player } from '@/lib/players/types'
import { cacheToPlayers } from '@/lib/players/convert'
import { calculateScarcityExtended } from '@/lib/draft/explain'

/** Minimal raw players_cache row (DB shape), mirroring GET /api/players. */
function cachedRow(
  name: string,
  position: string,
  adp: number,
  tier: number,
): CachedPlayer {
  return {
    id: `id-${name.replace(/\s+/g, '-').toLowerCase()}`,
    external_id: `ext-${adp}`,
    name,
    team: 'FA',
    position,
    bye_week: 7,
    adp: { fantasypros_ppr: adp },
    auction_values: { vorp_12_200_ppr: Math.max(1, Math.round(60 - adp)) },
    projections: { points: Math.max(1, 300 - adp) },
    injury_status: null,
    // The real FP tier lives here, NOT at the top level. This is exactly why
    // unmapped rows have no usable consensusTier.
    source_data: { tier },
    last_updated_at: '2026-08-20T00:00:00.000Z',
  }
}

// Two tier-1 WRs, one tier-2 WR, one tier-3 WR; one tier-1 RB, one tier-3 RB.
// Mirrors the live board at draft start (Chase/Nacua = WR tier 1, etc.).
const RAW: CachedPlayer[] = [
  cachedRow('Elite WR One', 'WR', 1, 1),
  cachedRow('Elite WR Two', 'WR', 3, 1),
  cachedRow('Good WR Three', 'WR', 7, 2),
  cachedRow('Depth WR Four', 'WR', 30, 3),
  cachedRow('Elite RB One', 'RB', 2, 1),
  cachedRow('Depth RB Two', 'RB', 40, 4),
]

const TEAM_COUNT = 12

describe('F1: scarcity tiers require cacheToPlayers mapping', () => {
  it('BUG: raw players_cache rows (unmapped) yield tier1Remaining = 0 for every position', () => {
    // Cast raw rows to Player[] exactly as the buggy hook did (a type lie at
    // runtime: no consensusTier present).
    const asPlayers = RAW as unknown as Player[]
    const scarcity = calculateScarcityExtended(asPlayers, TEAM_COUNT)

    const wr = scarcity.find(s => s.position === 'WR')!
    const rb = scarcity.find(s => s.position === 'RB')!

    // The documented defect: undefined consensusTier -> all tier buckets 0.
    expect(wr.tier1Remaining).toBe(0)
    expect(wr.tier2Remaining).toBe(0)
    expect(wr.tier3Remaining).toBe(0)
    expect(rb.tier1Remaining).toBe(0)
  })

  it('FIX: cacheToPlayers-mapped rows populate consensusTier and the real tier counts', () => {
    const players = cacheToPlayers(RAW)

    // consensusTier is now populated from the real FP tier.
    const eliteWr = players.find(p => p.name === 'Elite WR One')!
    expect(eliteWr.consensusTier).toBe(1)

    const scarcity = calculateScarcityExtended(players, TEAM_COUNT)
    const wr = scarcity.find(s => s.position === 'WR')!
    const rb = scarcity.find(s => s.position === 'RB')!

    // Exact real counts from the fixture: 2 tier-1 WRs, 1 tier-2 WR, and the
    // remaining WR is tier 3+ (calculateScarcity counts consensusTier >= 3).
    expect(wr.tier1Remaining).toBe(2)
    expect(wr.tier2Remaining).toBe(1)
    expect(wr.tier3Remaining).toBe(1)
    // startableRemaining = tier1 + tier2 = 3 startable WRs.
    expect(wr.startableRemaining).toBe(3)

    // 1 tier-1 RB present -> the urgency gate (tier1Remaining > 0) can now fire.
    expect(rb.tier1Remaining).toBe(1)
    expect(rb.tier1Remaining).toBeGreaterThan(0)
  })
})
