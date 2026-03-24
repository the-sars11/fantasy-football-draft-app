/**
 * GET /api/players/weekly
 *
 * Fetch weekly projections for a specific week.
 * Query params:
 * - week: NFL week number (required)
 * - season: NFL season year (default: current)
 * - scoringFormat: 'standard' | 'half-ppr' | 'ppr' (default: 'ppr')
 * - position: filter by position (QB, RB, WR, TE, K, DEF)
 * - limit: max players to return (default: 200)
 * - refresh: if 'true', force refresh from sources
 *
 * POST /api/players/weekly
 *
 * Refresh weekly projections from all sources.
 * Body:
 * - week: NFL week number (required)
 * - season: NFL season year (default: current)
 * - scoringFormat: 'standard' | 'half-ppr' | 'ppr' (default: 'ppr')
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchWeeklyProjections,
  cacheWeeklyProjections,
  readWeeklyProjections,
  getCurrentWeek,
  isWeeklyProjectionsStale,
} from '@/lib/inseason/weekly-projections'
import type { ScoringFormat, Position } from '@/lib/players/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const weekParam = searchParams.get('week')
    const seasonParam = searchParams.get('season')
    const scoringFormat = (searchParams.get('scoringFormat') || 'ppr') as ScoringFormat
    const position = searchParams.get('position') as Position | null
    const limit = parseInt(searchParams.get('limit') || '200')
    const forceRefresh = searchParams.get('refresh') === 'true'

    // Get current week if not provided
    let week: number
    let season: number

    if (weekParam) {
      week = parseInt(weekParam)
    } else {
      const current = await getCurrentWeek()
      week = current.week
    }

    if (seasonParam) {
      season = parseInt(seasonParam)
    } else {
      const current = await getCurrentWeek()
      season = current.season
    }

    // Validate week
    if (week < 1 || week > 18) {
      return NextResponse.json(
        { error: 'Week must be between 1 and 18' },
        { status: 400 }
      )
    }

    // Check if we need to refresh
    const isStale = await isWeeklyProjectionsStale(week, season)
    if (forceRefresh || isStale) {
      // Fetch fresh data from sources
      const projections = await fetchWeeklyProjections(week, scoringFormat, season)

      // Cache to database
      const { upserted, errors } = await cacheWeeklyProjections(projections)

      if (errors.length > 0) {
        console.warn('Weekly projections cache errors:', errors)
      }

      // Filter by position if requested
      let filtered = projections
      if (position) {
        filtered = projections.filter((p) => p.position === position)
      }

      return NextResponse.json({
        projections: filtered.slice(0, limit),
        count: filtered.length,
        week,
        season,
        scoringFormat,
        source: 'fresh',
        upserted,
        errors: errors.length > 0 ? errors : undefined,
      })
    }

    // Read from cache
    const projections = await readWeeklyProjections(week, {
      season,
      scoringFormat,
      position: position || undefined,
      limit,
    })

    return NextResponse.json({
      projections,
      count: projections.length,
      week,
      season,
      scoringFormat,
      source: 'cache',
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Weekly projections error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { week, season, scoringFormat = 'ppr' } = body as {
      week?: number
      season?: number
      scoringFormat?: ScoringFormat
    }

    // Get current week/season if not provided
    let targetWeek: number
    let targetSeason: number

    if (week) {
      targetWeek = week
    } else {
      const current = await getCurrentWeek()
      targetWeek = current.week
    }

    if (season) {
      targetSeason = season
    } else {
      const current = await getCurrentWeek()
      targetSeason = current.season
    }

    // Validate
    if (targetWeek < 1 || targetWeek > 18) {
      return NextResponse.json(
        { error: 'Week must be between 1 and 18' },
        { status: 400 }
      )
    }

    // Fetch and cache
    const projections = await fetchWeeklyProjections(
      targetWeek,
      scoringFormat,
      targetSeason
    )

    const { upserted, errors } = await cacheWeeklyProjections(projections)

    return NextResponse.json({
      success: true,
      week: targetWeek,
      season: targetSeason,
      scoringFormat,
      totalProjections: projections.length,
      upserted,
      errors: errors.length > 0 ? errors : undefined,
      refreshedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Weekly projections refresh error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
