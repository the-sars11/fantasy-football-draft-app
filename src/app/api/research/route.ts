/**
 * POST /api/research
 *
 * Runs the full research pipeline: configure → ingest → normalize → analyze → output
 * Saves the run snapshot to Supabase (FF-026)
 *
 * Body: {
 *   leagueId: string,
 *   skipRefresh?: boolean  // use cached data instead of pulling fresh
 * }
 *
 * GET /api/research?leagueId=xxx
 *
 * Returns saved research runs for a league (FF-026)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE, DEV_USER } from '@/lib/supabase/dev-mode'
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

function getUserId(): string {
  if (DEV_MODE) return DEV_USER.id
  // In prod, this would come from the auth session
  throw new Error('Auth not implemented for prod yet')
}

export async function GET(req: NextRequest) {
  try {
    const leagueId = req.nextUrl.searchParams.get('leagueId')
    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const userId = getUserId()

    const { data, error } = await supabase
      .from('research_runs')
      .select('id, league_id, strategy_settings, status, error_message, created_at, completed_at')
      .eq('league_id', leagueId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ runs: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
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

    const userId = getUserId()

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

    // Create a pending research_run row before running
    const strategySnapshot = activeStrategy
      ? {
          id: activeStrategy.id,
          name: activeStrategy.name,
          archetype: activeStrategy.archetype,
          position_weights: activeStrategy.position_weights,
          player_targets: activeStrategy.player_targets,
          player_avoids: activeStrategy.player_avoids,
          team_avoids: activeStrategy.team_avoids,
          risk_tolerance: activeStrategy.risk_tolerance,
          budget_allocation: activeStrategy.budget_allocation,
          round_targets: activeStrategy.round_targets,
        }
      : { name: 'Balanced (default)', archetype: 'balanced' }

    const { data: runRow, error: insertError } = await supabase
      .from('research_runs')
      .insert({
        user_id: userId,
        league_id: leagueId,
        strategy_settings: strategySnapshot,
        status: 'running',
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('[API /research] Failed to create run row:', insertError.message)
      // Non-fatal — run the pipeline anyway, just won't be persisted
    }

    const runId = runRow?.id ?? null

    // Run the pipeline
    let result
    try {
      result = await runResearchPipeline(config, activeStrategy, supabase)
    } catch (pipelineError) {
      // Mark run as failed
      if (runId) {
        await supabase
          .from('research_runs')
          .update({
            status: 'failed',
            error_message: pipelineError instanceof Error ? pipelineError.message : 'Unknown error',
          })
          .eq('id', runId)
      }
      throw pipelineError
    }

    // Build the results summary to persist
    const resultsSummary = {
      league: {
        id: league.id,
        name: league.name,
        format: league.format,
        teamCount: league.team_count,
        budget: league.budget,
        scoringFormat: league.scoring_format,
      },
      ingest: result.ingest,
      analysis: {
        totalPlayers: result.analysis.scoredPlayers.length,
        targets: result.analysis.targets.map(summarizeScoredPlayer),
        avoids: result.analysis.avoids.map(summarizeScoredPlayer),
        valuePlays: result.analysis.valuePlays.map(summarizeScoredPlayer),
        byPosition: Object.fromEntries(
          Object.entries(result.analysis.byPosition).map(([pos, players]) => [
            pos,
            players.map(summarizeScoredPlayer),
          ])
        ),
      },
      completedAt: result.completedAt,
    }

    // Update the run row with results
    if (runId) {
      const { error: updateError } = await supabase
        .from('research_runs')
        .update({
          results: resultsSummary,
          status: 'completed',
          completed_at: result.completedAt,
        })
        .eq('id', runId)

      if (updateError) {
        console.error('[API /research] Failed to save run results:', updateError.message)
      }
    }

    return NextResponse.json({
      success: true,
      runId,
      league: resultsSummary.league,
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
