/**
 * Trade Analyzer API (FF-124 to FF-127)
 *
 * POST /api/trade — Analyze a proposed trade
 * POST /api/trade?mode=fair — Find fair trade options for a target player
 * POST /api/trade?mode=values — Get trade values for players
 */

import { NextRequest, NextResponse } from 'next/server'
import { getUser } from '@/lib/supabase/server'
import {
  analyzeTrade,
  findFairTrades,
  getPlayerValues,
  type PlayerValue,
  type TradeAnalysis,
  type FairTradeOption,
} from '@/lib/inseason/trade-analyzer'
import { syncUserRoster, type Platform } from '@/lib/inseason'
import type { Position, ScoringFormat } from '@/lib/players/types'

interface TradePlayer {
  playerId: string
  playerName: string
  position: Position
  team: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('mode') || 'analyze'

    const scoringFormat = (body.scoringFormat || 'ppr') as ScoringFormat
    const currentWeek = body.week || 1

    // Mode: values — just get trade values for a list of players
    if (mode === 'values') {
      const { players } = body as { players: TradePlayer[] }

      if (!players || !Array.isArray(players)) {
        return NextResponse.json(
          { error: 'Missing players array' },
          { status: 400 }
        )
      }

      const values: PlayerValue[] = await getPlayerValues(
        players,
        scoringFormat,
        currentWeek
      )

      return NextResponse.json({ values })
    }

    // Mode: fair — find fair trade options for a target player
    if (mode === 'fair') {
      const { targetPlayer, platform, leagueId } = body as {
        targetPlayer: TradePlayer
        platform?: Platform
        leagueId?: string
      }

      if (!targetPlayer) {
        return NextResponse.json(
          { error: 'Missing targetPlayer' },
          { status: 400 }
        )
      }

      // Need roster context for fair trade finder
      const user = await getUser()
      if (!user) {
        return NextResponse.json(
          { error: 'Authentication required for fair trade finder' },
          { status: 401 }
        )
      }

      if (!platform || !leagueId) {
        return NextResponse.json(
          { error: 'Missing platform or leagueId' },
          { status: 400 }
        )
      }

      const roster = await syncUserRoster(user.id, leagueId, platform)
      if (!roster) {
        return NextResponse.json(
          { error: 'Failed to fetch roster' },
          { status: 404 }
        )
      }

      const options: FairTradeOption[] = await findFairTrades(
        targetPlayer,
        roster,
        scoringFormat,
        currentWeek
      )

      return NextResponse.json({ options, targetPlayer })
    }

    // Mode: analyze — full trade analysis
    const { giving, receiving, platform, leagueId } = body as {
      giving: TradePlayer[]
      receiving: TradePlayer[]
      platform?: Platform
      leagueId?: string
    }

    if (!giving || !receiving || !Array.isArray(giving) || !Array.isArray(receiving)) {
      return NextResponse.json(
        { error: 'Missing giving or receiving player arrays' },
        { status: 400 }
      )
    }

    if (giving.length === 0 || receiving.length === 0) {
      return NextResponse.json(
        { error: 'Both sides of trade must have at least one player' },
        { status: 400 }
      )
    }

    // Optionally get roster context if authenticated
    let roster = null
    const user = await getUser()

    if (user && platform && leagueId) {
      try {
        roster = await syncUserRoster(user.id, leagueId, platform)
      } catch (e) {
        // Continue without roster context
        console.warn('Could not fetch roster for trade analysis:', e)
      }
    }

    const analysis: TradeAnalysis = await analyzeTrade(
      giving,
      receiving,
      roster,
      scoringFormat,
      currentWeek
    )

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Trade analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze trade' },
      { status: 500 }
    )
  }
}
