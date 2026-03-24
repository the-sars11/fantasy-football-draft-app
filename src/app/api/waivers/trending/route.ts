/**
 * GET /api/waivers/trending
 *
 * Fetch trending waiver wire activity.
 * Query params:
 * - mode: 'all' | 'adds' | 'drops' | 'rising' | 'falling' | 'summary' (default: 'all')
 * - position: filter by position (QB, RB, WR, TE, K, DEF)
 * - limit: max players to return (default: 50)
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchWaiverTrending,
  getTopWaiverTargets,
  getMostDropped,
  getRisingPlayers,
  getFallingPlayers,
  getTrendingByPosition,
  getTrendingSummary,
} from '@/lib/inseason/waiver-trending'
import type { Position } from '@/lib/players/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const mode = searchParams.get('mode') || 'all'
    const position = searchParams.get('position') as Position | null
    const limit = parseInt(searchParams.get('limit') || '50')

    // Position-specific mode
    if (position) {
      const trending = await getTrendingByPosition(position, limit)
      return NextResponse.json({
        mode: 'position',
        position,
        trending,
        count: trending.length,
        fetchedAt: new Date().toISOString(),
      })
    }

    // Mode-specific responses
    switch (mode) {
      case 'adds': {
        const trending = await getTopWaiverTargets(limit)
        return NextResponse.json({
          mode: 'adds',
          trending,
          count: trending.length,
          fetchedAt: new Date().toISOString(),
        })
      }

      case 'drops': {
        const trending = await getMostDropped(limit)
        return NextResponse.json({
          mode: 'drops',
          trending,
          count: trending.length,
          fetchedAt: new Date().toISOString(),
        })
      }

      case 'rising': {
        const trending = await getRisingPlayers(limit)
        return NextResponse.json({
          mode: 'rising',
          trending,
          count: trending.length,
          fetchedAt: new Date().toISOString(),
        })
      }

      case 'falling': {
        const trending = await getFallingPlayers(limit)
        return NextResponse.json({
          mode: 'falling',
          trending,
          count: trending.length,
          fetchedAt: new Date().toISOString(),
        })
      }

      case 'summary': {
        const summary = await getTrendingSummary()
        return NextResponse.json({
          mode: 'summary',
          ...summary,
        })
      }

      case 'all':
      default: {
        const trending = await fetchWaiverTrending(limit)
        return NextResponse.json({
          mode: 'all',
          trending,
          count: trending.length,
          fetchedAt: new Date().toISOString(),
        })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Waiver trending error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
