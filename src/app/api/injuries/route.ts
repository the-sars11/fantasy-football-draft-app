/**
 * GET /api/injuries
 *
 * Fetch recent injury updates or injured players.
 * Query params:
 * - season: NFL season year (default: current)
 * - week: specific week to filter
 * - playerId: get history for specific player
 * - limit: max updates to return (default: 50)
 * - severityMin: minimum severity level (1-4)
 * - mode: 'updates' (default) or 'injured' (list of injured players)
 *
 * POST /api/injuries/check
 *
 * Check for new injury status changes and record them.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  checkInjuryUpdates,
  getRecentInjuryUpdates,
  getPlayerInjuryHistory,
  getInjuredPlayers,
} from '@/lib/inseason/injury-tracker'
import { getCurrentWeek } from '@/lib/inseason/weekly-projections'
import type { InjurySeverity } from '@/lib/players/types'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const seasonParam = searchParams.get('season')
    const weekParam = searchParams.get('week')
    const playerId = searchParams.get('playerId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const severityMin = searchParams.get('severityMin')
    const mode = searchParams.get('mode') || 'updates'

    // Get current season if not provided
    let season: number
    if (seasonParam) {
      season = parseInt(seasonParam)
    } else {
      const current = await getCurrentWeek()
      season = current.season
    }

    // If playerId provided, get history for that player
    if (playerId) {
      const history = await getPlayerInjuryHistory(playerId, season)
      return NextResponse.json({
        playerId,
        season,
        updates: history,
        count: history.length,
      })
    }

    // Mode: injured - get list of currently injured players
    if (mode === 'injured') {
      const injured = await getInjuredPlayers(season)
      return NextResponse.json({
        season,
        injuredPlayers: injured,
        count: injured.length,
      })
    }

    // Mode: updates (default) - get recent injury updates
    const updates = await getRecentInjuryUpdates({
      season,
      week: weekParam ? parseInt(weekParam) : undefined,
      limit,
      severityMin: severityMin ? (parseInt(severityMin) as InjurySeverity) : undefined,
    })

    return NextResponse.json({
      season,
      week: weekParam ? parseInt(weekParam) : undefined,
      updates,
      count: updates.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Injuries API error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { season, week } = body as { season?: number; week?: number }

    // Get current season/week if not provided
    let targetSeason: number
    let targetWeek: number | undefined

    if (season) {
      targetSeason = season
    } else {
      const current = await getCurrentWeek()
      targetSeason = current.season
    }

    if (week !== undefined) {
      targetWeek = week
    } else {
      const current = await getCurrentWeek()
      targetWeek = current.week
    }

    // Check for updates
    const { updates, errors } = await checkInjuryUpdates(targetSeason, targetWeek)

    return NextResponse.json({
      success: true,
      season: targetSeason,
      week: targetWeek,
      updatesFound: updates.length,
      updates,
      errors: errors.length > 0 ? errors : undefined,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('Injury check error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
