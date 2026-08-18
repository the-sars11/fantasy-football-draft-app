/**
 * /api/sim-runs — R10b: persist, list, and (via [id]) reload saved sim runs.
 *
 * Sim runs share the research_runs table but are discriminated by
 * strategy_settings.kind === 'sim' (and results.kind === 'sim'), so they never
 * mix with research runs on the /prep/runs screen. No migration needed.
 *
 * The Simulate screen computes the sim client-side (it already holds the player
 * pool and Joe's graded tags) and POSTs the trimmed PersistedSimResults here.
 * This route only persists and reads back — it never re-runs the engine.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, requireUser } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import { SIM_RUN_KIND } from '@/lib/draft/sim-results'

async function getClient() {
  if (DEV_MODE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
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

    const user = await requireUser()

    const { data, error } = await supabase
      .from('research_runs')
      .select('id, league_id, strategy_settings, status, created_at, completed_at')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('strategy_settings->>kind', SIM_RUN_KIND)
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
    const { leagueId, name, results } = body as {
      leagueId?: string
      name?: string
      results?: { kind?: string } & Record<string, unknown>
    }

    if (!leagueId) {
      return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
    }
    if (!results || results.kind !== SIM_RUN_KIND) {
      return NextResponse.json({ error: 'results must be a sim result payload' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const user = await requireUser()
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('research_runs')
      .insert({
        user_id: user.id,
        league_id: leagueId,
        strategy_settings: { kind: SIM_RUN_KIND, name: name?.trim() || 'Sim run' },
        results,
        status: 'completed',
        completed_at: now,
      })
      .select('id, strategy_settings, created_at, completed_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, run: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /sim-runs POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
