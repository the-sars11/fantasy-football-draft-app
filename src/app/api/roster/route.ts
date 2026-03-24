/**
 * Roster API
 *
 * GET /api/roster — Get user's roster for a league
 * POST /api/roster — Sync roster from connected platform
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  syncUserRoster,
  getUserLeagues,
  getCurrentWeek,
  type Platform,
} from '@/lib/inseason'

export async function GET(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') as Platform | null
    const leagueId = searchParams.get('leagueId')

    if (!platform) {
      return NextResponse.json(
        { error: 'Missing platform parameter' },
        { status: 400 }
      )
    }

    // If leagueId provided, get specific roster
    if (leagueId) {
      const roster = await syncUserRoster(user.id, leagueId, platform)
      if (!roster) {
        return NextResponse.json(
          { error: 'Roster not found' },
          { status: 404 }
        )
      }
      return NextResponse.json({ roster })
    }

    // Otherwise, get all leagues
    const leagues = await getUserLeagues(user.id, platform)
    return NextResponse.json({ leagues })
  } catch (error) {
    console.error('Roster error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get roster' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { platform, leagueId } = body

    if (!platform || !leagueId) {
      return NextResponse.json(
        { error: 'Missing platform or leagueId' },
        { status: 400 }
      )
    }

    const { week } = await getCurrentWeek()
    const roster = await syncUserRoster(user.id, leagueId, platform)

    if (!roster) {
      return NextResponse.json(
        { error: 'Failed to sync roster' },
        { status: 500 }
      )
    }

    roster.week = week

    return NextResponse.json({
      success: true,
      roster,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Roster sync error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync roster' },
      { status: 500 }
    )
  }
}
