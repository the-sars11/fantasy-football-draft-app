/**
 * Convert between DB cache shape (CachedPlayer) and app Player type.
 * Used by components that need to run scoring against cached data.
 */

import type { Player, Position } from './types'
import type { CachedPlayer } from '@/lib/research/cache'
import { expectedRoomPrice } from '@/lib/draft/league-calibration'

/** Map DB position (DST) to app position (DEF) */
function dbPosToAppPos(pos: string): Position {
  if (pos === 'DST') return 'DEF'
  return pos as Position
}

/** Narrow a source_data number field. */
function sdNum(sd: Record<string, unknown>, key: string): number | undefined {
  const v = sd[key]
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined
}

/** Convert a CachedPlayer (DB shape) to a Player (app shape) */
export function cacheToPlayer(cached: CachedPlayer): Player {
  const adpValues = Object.values(cached.adp || {})
  const avgAdp = adpValues.length > 0
    ? adpValues.reduce((s, v) => s + v, 0) / adpValues.length
    : 999

  // Real VORP value for Joe's exact league is THE auction value when present
  // (populate-auction-values.ts). Fall back to the legacy averaged value only
  // for rows that predate the VORP run so nothing shows $0.
  const av = (cached.auction_values || {}) as Record<string, number>
  const vorpValue = typeof av['vorp_12_200_ppr'] === 'number' ? av['vorp_12_200_ppr'] : undefined
  const legacyAuctionVals = Object.entries(av)
    .filter(([k]) => k !== 'vorp_12_200_ppr')
    .map(([, v]) => v)
  const avgAuction = vorpValue !== undefined
    ? vorpValue
    : legacyAuctionVals.length > 0
      ? legacyAuctionVals.reduce((s, v) => s + v, 0) / legacyAuctionVals.length
      : 0

  // Real enriched fields from populate-fantasypros.ts (source_data). Present
  // for ranked players; undefined for legacy Sleeper-only rows -> fall back.
  const sd = (cached.source_data || {}) as Record<string, unknown>
  const realTier = sdNum(sd, 'tier')
  const vLow = sdNum(sd, 'value_low')
  const vBase = sdNum(sd, 'value_base')
  const vHigh = sdNum(sd, 'value_high')
  const rMin = sdNum(sd, 'rank_min')
  const rMax = sdNum(sd, 'rank_max')
  const rStd = sdNum(sd, 'rank_std')
  const filename = typeof sd['fp_filename'] === 'string' ? (sd['fp_filename'] as string) : undefined

  // Real VORP model fields (populate-auction-values.ts).
  const projPoints = sdNum(sd, 'proj_points')
  const vorp = sdNum(sd, 'vorp')
  const posRankPoints = sdNum(sd, 'pos_rank_points')
  const replacementPoints = sdNum(sd, 'replacement_points')
  const marketValue = sdNum(sd, 'espn_auction_value')
  // ECR positional rank stored as e.g. "RB5" / "WR12"; pull the number.
  const posRankStr = typeof sd['pos_rank'] === 'string' ? (sd['pos_rank'] as string) : ''
  const ecrPosRankMatch = posRankStr.match(/(\d+)/)
  const ecrPositionRank = ecrPosRankMatch ? parseInt(ecrPosRankMatch[1], 10) : undefined

  const valueRange =
    vLow !== undefined && vBase !== undefined && vHigh !== undefined
      ? { low: vLow, base: vBase, high: vHigh }
      : undefined

  // --- League-calibrated valuation (VAL-1.2) ---
  // CEILING: genuine worth in Nasties scoring = the roster-aware VORP $ when
  // present, else the averaged auction value. This is the "he CAN be $97" number.
  const appPos = dbPosToAppPos(cached.position)
  const ceilingValue = vorpValue !== undefined ? vorpValue : Math.round(avgAuction)
  // REALITY: map the player's projected positional rank onto Joe's room's real
  // price-by-rank curve. Prefer the VORP points rank; fall back to expert (ECR)
  // positional rank so ranked-but-no-VORP rows still price.
  const roomRank = posRankPoints ?? ecrPositionRank
  const expectedRoom =
    roomRank !== undefined ? expectedRoomPrice(appPos, roomRank) : undefined
  // Only a real, positive worth can produce a meaningful gap. A ranked-but-
  // unpriced row (ceiling 0) would otherwise paint a false "over" chip.
  const valueGap =
    expectedRoom !== undefined && ceilingValue > 0
      ? Math.round(ceilingValue - expectedRoom)
      : undefined

  return {
    id: cached.id,
    name: cached.name,
    team: cached.team ?? '',
    position: appPos,
    byeWeek: cached.bye_week ?? 0,
    injuryStatus: cached.injury_status ?? undefined,
    consensusRank: Math.round(avgAdp), // approximate from ADP
    consensusAuctionValue: Math.round(avgAuction),
    // Real FantasyPros tier when present; legacy rank/12 estimate otherwise.
    consensusTier: realTier ?? Math.ceil(avgAdp / 12),
    adp: avgAdp,
    valueRange,
    expertTier: realTier,
    rankSpread: rMin !== undefined && rMax !== undefined ? { min: rMin, max: rMax, std: rStd } : undefined,
    headshotFilename: filename,
    // Real VORP model (Joe's 12-tm/$200/PPR/no-K league).
    projectedPoints: projPoints,
    vorp,
    positionRankByPoints: posRankPoints,
    replacementPoints,
    marketAuctionValue: marketValue,
    ecrPositionRank,
    // League-calibrated valuation (VAL-1.2) — Nasties ledger, not national.
    ceilingValue,
    expectedRoomPrice: expectedRoom,
    valueGap,
    sourceData: [],
    projections: {
      points: cached.projections?.points ?? projPoints ?? 0,
      passingYards: cached.projections?.passing_yards,
      passingTDs: cached.projections?.passing_tds,
      rushingYards: cached.projections?.rushing_yards,
      rushingTDs: cached.projections?.rushing_tds,
      receivingYards: cached.projections?.receiving_yards,
      receivingTDs: cached.projections?.receiving_tds,
      receptions: cached.projections?.receptions,
    },
  }
}

/** Convert an array of CachedPlayers to Players, sorted by consensus rank */
export function cacheToPlayers(cached: CachedPlayer[]): Player[] {
  return cached
    .map(cacheToPlayer)
    .sort((a, b) => a.consensusRank - b.consensusRank)
}
