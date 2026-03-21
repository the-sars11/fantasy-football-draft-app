/**
 * POST /api/research
 *
 * Runs the full research pipeline: configure → ingest → normalize → analyze → output
 *
 * Body: {
 *   leagueId: string,
 *   skipRefresh?: boolean  // use cached data instead of pulling fresh
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import { runResearchPipeline, type PipelineConfig } from '@/lib/research/service'
import type { Strategy } from '@/lib/supabase/database.types'

async function getClient() {
  if (DEV_MODE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leagueId, skipRefresh = false } = body as {
      leagueId?: string
      skipRefresh?: boolean
    }

    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Fetch league config
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('*')
      .eq('id', leagueId)
      .single()

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Fetch active strategy for this league (if any)
    const { data: strategyData } = await supabase
      .from('strategies')
      .select('*')
      .eq('league_id', leagueId)
      .eq('is_active', true)
      .single()

    const activeStrategy = (strategyData as Strategy) ?? null

    // Build pipeline config
    const config: PipelineConfig = {
      leagueId,
      format: league.format,
      scoringFormat: league.scoring_format,
      teamCount: league.team_count,
      budget: league.budget ?? undefined,
      skipRefresh,
    }

    // Run the pipeline
    const result = await runResearchPipeline(config, activeStrategy, supabase)

    // Return a summary (not the full scored players array — too large for JSON response)
    return NextResponse.json({
      success: true,
      league: {
        id: league.id,
        name: league.name,
        format: league.format,
        teamCount: league.team_count,
      },
      strategy: activeStrategy
        ? { id: activeStrategy.id, name: activeStrategy.name, archetype: activeStrategy.archetype }
        : null,
      ingest: result.ingest,
      analysis: {
        totalPlayers: result.analysis.scoredPlayers.length,
        targets: result.analysis.targets.map(summarizeScoredPlayer),
        avoids: result.analysis.avoids.map(summarizeScoredPlayer),
        valuePlays: result.analysis.valuePlays.map(summarizeScoredPlayer),
        byPosition: Object.fromEntries(
          Object.entries(result.analysis.byPosition).map(([pos, players]) => [
            pos,
            players.slice(0, 10).map(summarizeScoredPlayer),
          ])
        ),
      },
      completedAt: result.completedAt,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /research POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Slim down a ScoredPlayer for JSON response */
function summarizeScoredPlayer(sp: { player: { id: string; name: string; team: string; position: string; adp: number; consensusAuctionValue: number }; strategyScore: number; adjustedAuctionValue?: number; adjustedRoundValue?: number; targetStatus: string; boosts: string[] }) {
  return {
    id: sp.player.id,
    name: sp.player.name,
    team: sp.player.team,
    position: sp.player.position,
    adp: sp.player.adp,
    consensusValue: sp.player.consensusAuctionValue,
    strategyScore: sp.strategyScore,
    adjustedAuctionValue: sp.adjustedAuctionValue,
    adjustedRoundValue: sp.adjustedRoundValue,
    targetStatus: sp.targetStatus,
    boosts: sp.boosts,
  }
}
