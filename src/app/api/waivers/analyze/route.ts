/**
 * Waiver Wire Advisor API (FF-119 to FF-122)
 *
 * GET /api/waivers/analyze — Get top waiver targets (no auth required)
 * POST /api/waivers/analyze — Full roster-aware waiver analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  scanWaiverWire,
  analyzeWaiverWire,
  getFaabRecommendation,
  syncUserRoster,
  type ScoringFormat,
  type Position,
  type Platform,
} from '@/lib/inseason'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const scoringFormat = (searchParams.get('scoringFormat') || 'ppr') as ScoringFormat
    const limit = parseInt(searchParams.get('limit') || '20')
    const position = searchParams.get('position') as Position | null

    // Get top waiver targets
    const targets = await scanWaiverWire(scoringFormat, limit * 2)

    // Filter by position if specified
    const filtered = position
      ? targets.filter((t) => t.position === position)
      : targets

    return NextResponse.json({
      targets: filtered.slice(0, limit),
      count: filtered.length,
      scoringFormat,
    })
  } catch (error) {
    console.error('Waiver scan error:', error)
    return NextResponse.json(
      { error: 'Failed to scan waiver wire' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mode } = body

    // Mode: analyze (full roster analysis) or faab (single player FAAB recommendation)
    if (mode === 'faab') {
      const { playerId, playerName, position } = body

      if (!playerName || !position) {
        return NextResponse.json(
          { error: 'Missing playerName or position' },
          { status: 400 }
        )
      }

      // Optionally get roster context if authenticated
      let roster = undefined
      const user = await getUser()

      if (user && body.platform && body.leagueId) {
        roster = await syncUserRoster(user.id, body.leagueId, body.platform as Platform)
        if (roster) roster.week = body.week || 1
      }

      const recommendation = await getFaabRecommendation(
        playerId || '',
        playerName,
        position,
        roster || undefined
      )

      return NextResponse.json({ recommendation })
    }

    if (mode === 'analyze') {
      // Requires authenticated user
      const user = await getUser()

      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { platform, leagueId } = body

      if (!platform || !leagueId) {
        return NextResponse.json(
          { error: 'Missing platform or leagueId' },
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

      const analysis = await analyzeWaiverWire(roster)

      return NextResponse.json({ analysis })
    }

    // Default: just scan without roster context
    const scoringFormat = (body.scoringFormat || 'ppr') as ScoringFormat
    const limit = body.limit || 50

    const targets = await scanWaiverWire(scoringFormat, limit)

    return NextResponse.json({ targets })
  } catch (error) {
    console.error('Waiver analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze waivers' },
      { status: 500 }
    )
  }
}
