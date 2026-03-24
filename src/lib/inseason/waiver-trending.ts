/**
 * Waiver Wire Trending Service
 *
 * Aggregates add/drop trending data from multiple sources
 * to identify hot waiver targets and fading players.
 */

import {
  fetchSleeperTrendingAdds,
  fetchSleeperTrendingDrops,
  fetchSleeperPlayers,
  type NormalizedSleeperTrending,
  type NormalizedSleeperPlayer,
} from '@/lib/research/sources/sleeper'
import type { WaiverTrending, Position } from '@/lib/players/types'

/**
 * Fetch trending waiver wire activity.
 * Combines add and drop data to show net movement.
 */
export async function fetchWaiverTrending(
  limit: number = 50
): Promise<WaiverTrending[]> {
  // Fetch data in parallel
  const [adds, drops, players] = await Promise.all([
    fetchSleeperTrendingAdds(limit * 2), // Get more to ensure overlap
    fetchSleeperTrendingDrops(limit * 2),
    fetchSleeperPlayers(),
  ])

  // Build player lookup by Sleeper ID
  const playerMap = new Map<string, NormalizedSleeperPlayer>()
  for (const p of players) {
    playerMap.set(p.sleeperId, p)
  }

  // Build trending map combining adds and drops
  const trendingMap = new Map<string, {
    addCount: number
    dropCount: number
    player: NormalizedSleeperPlayer
  }>()

  // Process adds
  for (const add of adds) {
    const player = playerMap.get(add.sleeperId)
    if (!player) continue

    const existing = trendingMap.get(add.sleeperId)
    if (existing) {
      existing.addCount = add.count
    } else {
      trendingMap.set(add.sleeperId, {
        addCount: add.count,
        dropCount: 0,
        player,
      })
    }
  }

  // Process drops
  for (const drop of drops) {
    const player = playerMap.get(drop.sleeperId)
    if (!player) continue

    const existing = trendingMap.get(drop.sleeperId)
    if (existing) {
      existing.dropCount = drop.count
    } else {
      trendingMap.set(drop.sleeperId, {
        addCount: 0,
        dropCount: drop.count,
        player,
      })
    }
  }

  // Convert to WaiverTrending array
  const trending: WaiverTrending[] = []

  for (const [sleeperId, data] of trendingMap) {
    const netAdds = data.addCount - data.dropCount

    trending.push({
      playerId: sleeperId,
      playerName: data.player.name,
      position: data.player.position,
      team: data.player.team || 'FA',
      addCount: data.addCount,
      dropCount: data.dropCount,
      netAdds,
      trendDirection: determineTrendDirection(netAdds, data.addCount, data.dropCount),
    })
  }

  // Sort by net adds (most added first)
  trending.sort((a, b) => b.netAdds - a.netAdds)

  return trending.slice(0, limit)
}

/**
 * Determine trend direction based on add/drop counts.
 */
function determineTrendDirection(
  netAdds: number,
  addCount: number,
  dropCount: number
): 'rising' | 'falling' | 'stable' {
  // Significant threshold based on activity level
  const threshold = Math.max(addCount, dropCount) * 0.2

  if (netAdds > threshold) return 'rising'
  if (netAdds < -threshold) return 'falling'
  return 'stable'
}

/**
 * Get top waiver targets (most adds).
 */
export async function getTopWaiverTargets(
  limit: number = 25
): Promise<WaiverTrending[]> {
  const trending = await fetchWaiverTrending(100)

  return trending
    .filter((t) => t.addCount > 0)
    .sort((a, b) => b.addCount - a.addCount)
    .slice(0, limit)
}

/**
 * Get players being dropped most (potential sell-high / avoid).
 */
export async function getMostDropped(
  limit: number = 25
): Promise<WaiverTrending[]> {
  const trending = await fetchWaiverTrending(100)

  return trending
    .filter((t) => t.dropCount > 0)
    .sort((a, b) => b.dropCount - a.dropCount)
    .slice(0, limit)
}

/**
 * Get rising players (most net adds).
 */
export async function getRisingPlayers(
  limit: number = 25
): Promise<WaiverTrending[]> {
  const trending = await fetchWaiverTrending(100)

  return trending
    .filter((t) => t.trendDirection === 'rising')
    .sort((a, b) => b.netAdds - a.netAdds)
    .slice(0, limit)
}

/**
 * Get falling players (most net drops).
 */
export async function getFallingPlayers(
  limit: number = 25
): Promise<WaiverTrending[]> {
  const trending = await fetchWaiverTrending(100)

  return trending
    .filter((t) => t.trendDirection === 'falling')
    .sort((a, b) => a.netAdds - b.netAdds)
    .slice(0, limit)
}

/**
 * Get trending by position.
 */
export async function getTrendingByPosition(
  position: Position,
  limit: number = 15
): Promise<WaiverTrending[]> {
  const trending = await fetchWaiverTrending(200)

  return trending
    .filter((t) => t.position === position)
    .slice(0, limit)
}

/**
 * Summarize trending activity for display.
 */
export interface TrendingSummary {
  topAdds: WaiverTrending[]
  topDrops: WaiverTrending[]
  risingQB: WaiverTrending[]
  risingRB: WaiverTrending[]
  risingWR: WaiverTrending[]
  risingTE: WaiverTrending[]
  fetchedAt: string
}

export async function getTrendingSummary(): Promise<TrendingSummary> {
  const trending = await fetchWaiverTrending(200)

  const byPosition = (pos: Position) =>
    trending
      .filter((t) => t.position === pos && t.trendDirection === 'rising')
      .slice(0, 5)

  return {
    topAdds: trending.filter((t) => t.addCount > 0).slice(0, 10),
    topDrops: trending
      .filter((t) => t.dropCount > 0)
      .sort((a, b) => b.dropCount - a.dropCount)
      .slice(0, 10),
    risingQB: byPosition('QB'),
    risingRB: byPosition('RB'),
    risingWR: byPosition('WR'),
    risingTE: byPosition('TE'),
    fetchedAt: new Date().toISOString(),
  }
}
