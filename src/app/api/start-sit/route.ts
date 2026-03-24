/**
 * Start/Sit Advisor API (FF-115 to FF-118)
 *
 * GET /api/start-sit — Get start/sit recommendation for a player
 * POST /api/start-sit — Analyze roster or compare two players
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  getStartSitRecommendation,
  compareStartSit,
  analyzeRosterStartSit,
  syncUserRoster,
  getCurrentWeek,
  type Position,
  type ScoringFormat,
  type Platform,
} from '@/lib/inseason'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId') || ''
    const playerName = searchParams.get('playerName') || ''
    const position = searchParams.get('position') as Position
    const team = searchParams.get('team') || ''
    const weekParam = searchParams.get('week')
    const scoringFormat = (searchParams.get('scoringFormat') || 'ppr') as ScoringFormat

    if (!playerName || !position || !team) {
      return NextResponse.json(
        { error: 'Missing required parameters: playerName, position, team' },
        { status: 400 }
      )
    }

    const { week: currentWeek } = await getCurrentWeek()
    const week = weekParam ? parseInt(weekParam) : currentWeek

    const recommendation = await getStartSitRecommendation(
      playerId,
      playerName,
      position,
      team,
      week,
      scoringFormat
    )

    return NextResponse.json({ recommendation })
  } catch (error) {
    console.error('Start/sit error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendation' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode, week: weekParam, scoringFormat = 'ppr' } = body

    const { week: currentWeek } = await getCurrentWeek()
    const week = weekParam || currentWeek

    // Mode: compare (two players) or analyze (full roster)
    if (mode === 'compare') {
      const { player1, player2 } = body

      if (!player1 || !player2) {
        return NextResponse.json(
          { error: 'Missing player1 or player2 for comparison' },
          { status: 400 }
        )
      }

      const decision = await compareStartSit(
        {
          playerId: player1.playerId || '',
          playerName: player1.playerName,
          position: player1.position,
          team: player1.team,
        },
        {
          playerId: player2.playerId || '',
          playerName: player2.playerName,
          position: player2.position,
          team: player2.team,
        },
        week,
        scoringFormat
      )

      return NextResponse.json({ decision })
    }

    if (mode === 'analyze') {
      // Requires authenticated user with connected platform
      const user = await getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { platform, leagueId } = body

      if (!platform || !leagueId) {
        return NextResponse.json(
          { error: 'Missing platform or leagueId for analysis' },
          { status: 400 }
        )
      }

      const roster = await syncUserRoster(user.id, leagueId, platform as Platform)
      if (!roster) {
        return NextResponse.json(
          { error: 'Failed to fetch roster' },
          { status: 404 }
        )
      }

      const analysis = await analyzeRosterStartSit(roster, week)

      return NextResponse.json({ analysis })
    }

    return NextResponse.json(
      { error: 'Invalid mode. Use "compare" or "analyze"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Start/sit analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze' },
      { status: 500 }
    )
  }
}
