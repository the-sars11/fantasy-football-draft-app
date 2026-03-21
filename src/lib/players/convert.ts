/**
 * Convert between DB cache shape (CachedPlayer) and app Player type.
 * Used by components that need to run scoring against cached data.
 */

import type { Player, Position } from './types'
import type { CachedPlayer } from '@/lib/research/cache'

/** Map DB position (DST) to app position (DEF) */
function dbPosToAppPos(pos: string): Position {
  if (pos === 'DST') return 'DEF'
  return pos as Position
}

/** Convert a CachedPlayer (DB shape) to a Player (app shape) */
export function cacheToPlayer(cached: CachedPlayer): Player {
  const adpValues = Object.values(cached.adp || {})
  const avgAdp = adpValues.length > 0
    ? adpValues.reduce((s, v) => s + v, 0) / adpValues.length
    : 999

  const auctionValues = Object.values(cached.auction_values || {})
  const avgAuction = auctionValues.length > 0
    ? auctionValues.reduce((s, v) => s + v, 0) / auctionValues.length
    : 0

  return {
    id: cached.id,
    name: cached.name,
    team: cached.team ?? '',
    position: dbPosToAppPos(cached.position),
    byeWeek: cached.bye_week ?? 0,
    injuryStatus: cached.injury_status ?? undefined,
    consensusRank: Math.round(avgAdp), // approximate from ADP
    consensusAuctionValue: Math.round(avgAuction),
    consensusTier: Math.ceil(avgAdp / 12),
    adp: avgAdp,
    sourceData: [],
    projections: {
      points: cached.projections?.points ?? 0,
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
