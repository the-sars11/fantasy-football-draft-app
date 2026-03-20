/**
 * POST /api/strategies
 *
 * Save an AI-proposed strategy to the database.
 * Body: { leagueId: string, proposal: StrategyProposal, setActive?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { StrategyInsert, Position as DbPosition } from '@/lib/supabase/database.types'

async function getClient() {
  if (DEV_MODE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
}

function proposalToInsert(
  proposal: StrategyProposal,
  leagueId: string,
  format: 'auction' | 'snake',
  setActive: boolean
): StrategyInsert {
  const positionWeights: Record<string, number> = {}
  for (const [key, val] of Object.entries(proposal.position_weights)) {
    positionWeights[key === 'DEF' ? 'DST' : key] = val
  }

  const base: StrategyInsert = {
    league_id: leagueId,
    name: proposal.name,
    description: proposal.description,
    archetype: proposal.archetype,
    source: 'ai',
    is_active: setActive,
    position_weights: positionWeights as Record<DbPosition, number>,
    player_targets: [],
    player_avoids: [],
    team_avoids: [],
    risk_tolerance: proposal.risk_tolerance,
    ai_reasoning: proposal.reasoning,
    ai_confidence: proposal.confidence,
    projected_ceiling: proposal.projected_ceiling,
    projected_floor: proposal.projected_floor,
  }

  if (format === 'auction') {
    base.budget_allocation = proposal.budget_allocation ?? null
    base.max_bid_percentage = proposal.max_bid_percentage ?? null
    base.round_targets = null
    base.position_round_priority = null
  } else {
    const roundTargets: Record<string, number[]> = {}
    if (proposal.round_targets) {
      for (const [key, val] of Object.entries(proposal.round_targets)) {
        roundTargets[key === 'DEF' ? 'DST' : key] = val
      }
    }
    const posPriority: Record<string, string[]> = {}
    if (proposal.position_round_priority) {
      for (const [phase, positions] of Object.entries(proposal.position_round_priority)) {
        posPriority[phase] = positions.map((p) => (p === 'DEF' ? 'DST' : p))
      }
    }
    base.round_targets = roundTargets as Record<DbPosition, number[]>
    base.position_round_priority = posPriority as Record<string, DbPosition[]>
    base.budget_allocation = null
    base.max_bid_percentage = null
  }

  return base
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leagueId, proposal, setActive = false } = body as {
      leagueId?: string
      proposal?: StrategyProposal
      setActive?: boolean
    }

    if (!leagueId || !proposal) {
      return NextResponse.json({ error: 'leagueId and proposal are required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Look up league format
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('format')
      .eq('id', leagueId)
      .single()

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    const insert = proposalToInsert(proposal, leagueId, league.format, setActive)

    // If setting active, deactivate other strategies for this league first
    if (setActive) {
      await supabase
        .from('strategies')
        .update({ is_active: false })
        .eq('league_id', leagueId)
        .eq('is_active', true)
    }

    const { data, error } = await supabase
      .from('strategies')
      .insert(insert)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ strategy: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /strategies POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
