/**
 * Convert between DB cache shape (CachedPlayer) and app Player type.
 * Used by components that need to run scoring against cached data.
 */

import type { Player, Position } from './types'
import type { CachedPlayer } from '@/lib/research/cache'
import { expectedRoomPrice } from '@/lib/draft/league-calibration'
import { dedupePlayerIdentities } from './dedupe-identities'
import { imputeMissingProjections } from './impute-projections'

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

  // --- League-calibrated valuation (VAL-2.1, expert-hedged) ---
  // CEILING: our optimistic, naive-persistence worth (roster-aware VORP $ when
  // present, else averaged auction). This is the "he CAN be $97" number and it
  // runs wildly high on year-2 breakouts. Kept for context + the UPSIDE lane
  // below; it is NOT the price.
  const appPos = dbPosToAppPos(cached.position)
  const ceilingValue = vorpValue !== undefined ? vorpValue : Math.round(avgAuction)
  // PRICE FIX (VAL-2.1): the room drafts off the EXPERT sheet (ESPN/magazines),
  // not our model. Price the player by his expert (ECR) positional rank; fall
  // back to our points rank only when no ECR is present. Previously this trusted
  // our points rank FIRST, which priced last-year breakouts like Bo Nix as a
  // top-3 QB -> $28 against a ~$1-5 market. The room perceives ECR, so we price
  // off ECR. See DR: VAL-2.1 expert hedge.
  const roomRank = ecrPositionRank ?? posRankPoints
  const expectedRoom =
    roomRank !== undefined ? expectedRoomPrice(appPos, roomRank) : undefined
  // EXPERT-ANCHORED WORTH (VAL-2.2): worth = a disciplined shrink of our
  // optimistic model ceiling toward the expert (ECR) room price. Low LAMBDA =
  // expert-anchored (Joe's choice); our optimism lives on ONLY in the separate
  // upsideValue lane below. This restores PER-PLAYER signal (worth rides each
  // player's own ceilingValue) while keeping the number close to what the room
  // actually pays. The old VAL-2.1 "divide by positional inflation" collapsed
  // valueGap to expectedRoom * (1/mult - 1) -- a per-POSITION constant, so every
  // priced RB read as a pocket and every priced WR/TE as a tax, with zero
  // per-player signal. See DR: VAL-2.2 expert-anchored blend.
  const LAMBDA = 0.3
  const expertAdjustedValue =
    expectedRoom !== undefined && ceilingValue > 0
      ? Math.max(1, Math.round(LAMBDA * ceilingValue + (1 - LAMBDA) * expectedRoom))
      : expectedRoom
  // valueGap = expert-anchored worth vs room price, PER PLAYER. Positive = model
  // and room agree he is underpriced here; negative = the room overpays. Clamped
  // to +/-40 so a lone VORP outlier can't dominate the pockets sort downstream.
  const valueGap =
    expectedRoom !== undefined && ceilingValue > 0 && expertAdjustedValue !== undefined
      ? Math.max(-40, Math.min(40, Math.round(expertAdjustedValue - expectedRoom)))
      : undefined
  // UPSIDE (separate lane, VAL-2.1): where OUR model sees more than the market
  // price. Do NOT pay up for this -- it is a late-round dart / breakout-at-a-
  // discount signal only (a healthy Bo Nix at a $1 price lights up here).
  const upsideValue =
    expectedRoom !== undefined && ceilingValue > 0
      ? Math.round(ceilingValue - expectedRoom)
      : undefined

  return {
    id: cached.id,
    // Sleeper/external id joins the row to the measured risk model. `id` is a
    // Supabase UUID and never matches the model's Sleeper-id keys.
    sleeperId: cached.external_id ?? undefined,
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
    expertAdjustedValue,
    valueGap,
    upsideValue,
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

/**
 * Convert an array of CachedPlayers to Players, sorted by consensus rank, with
 * duplicate identities collapsed. The list is sorted best-first BEFORE the dedup
 * so the real pricing row (lowest ADP) survives and only its missing projection/
 * VORP is filled from the ghost row (e.g. "Luther Burden III" keeps its $27/ADP 47
 * and adopts the ghost "Luther Burden"'s projected points). This is the single
 * read path every consumer shares, so the sim, the published dataset, and the live
 * screens all see one row per player.
 */
export function cacheToPlayers(cached: CachedPlayer[]): Player[] {
  const sorted = cached
    .map(cacheToPlayer)
    .sort((a, b) => a.consensusRank - b.consensusRank)
  // Dedup first (so one human = one row), then impute missing projections from
  // the position rank->points curve so offseason nulls (Bowers, Jeanty, Taylor,
  // Lamar, Henry, Breece) stop silently scoring 0 in the sim.
  return imputeMissingProjections(dedupePlayerIdentities(sorted))
}
