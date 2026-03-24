/**
 * Matchup Preview API (FF-129 to FF-132)
 *
 * GET /api/matchup-preview — Get weekly matchup preview for authenticated user
 * POST /api/matchup-preview — Generate preview with custom roster data
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  generateMatchupPreview,
  syncUserRoster,
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
    const platform = (searchParams.get('platform') || 'sleeper') as Platform
    const leagueId = searchParams.get('leagueId')
    const weekParam = searchParams.get('week')

    if (!leagueId) {
      return NextResponse.json(
        { error: 'Missing leagueId parameter' },
        { status: 400 }
      )
    }

    const { week: currentWeek } = await getCurrentWeek()
    const week = weekParam ? parseInt(weekParam) : currentWeek

    // Sync user's roster
    const myRoster = await syncUserRoster(user.id, leagueId, platform)
    if (!myRoster) {
      return NextResponse.json(
        { error: 'Failed to fetch your roster. Please check your platform connection.' },
        { status: 404 }
      )
    }

    // For now, opponent roster is null (would need matchup lookup)
    // In a full implementation, we'd fetch the opponent from the platform
    const opponentRoster = null

    const preview = await generateMatchupPreview(
      myRoster,
      opponentRoster,
      week,
      leagueId
    )

    return NextResponse.json({ preview })
  } catch (error) {
    console.error('Matchup preview error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate matchup preview' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      myRoster,
      opponentRoster,
      week: weekParam,
      leagueId = 'manual',
    } = body

    if (!myRoster) {
      return NextResponse.json(
        { error: 'Missing myRoster in request body' },
        { status: 400 }
      )
    }

    const { week: currentWeek } = await getCurrentWeek()
    const week = weekParam || currentWeek

    const preview = await generateMatchupPreview(
      myRoster,
      opponentRoster || null,
      week,
      leagueId
    )

    return NextResponse.json({ preview })
  } catch (error) {
    console.error('Matchup preview POST error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate matchup preview' },
      { status: 500 }
    )
  }
}
