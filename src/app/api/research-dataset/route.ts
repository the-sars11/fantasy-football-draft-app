/**
 * GET /api/research-dataset - read back the headless research dataset (W0 seam).
 *
 * research-publish.ts writes the big snapshot into `research_runs` as one row
 * discriminated by strategy_settings.kind === 'dataset'. This route returns the
 * newest such row for a league, scoped to the caller, so the Strategy Leaderboard
 * and League Intel screens (W1/W2) - and any LLM interrogating the app - read the
 * exact same $0, engine-derived numbers the file holds, with no recompute.
 *
 * Mirrors /api/sim-runs's getClient() + kind-filter pattern exactly: service-role
 * in DEV_MODE, cookie-scoped server client otherwise, filtered by
 * strategy_settings->>kind and user_id. ?meta=1 returns just the envelope +
 * payload size (no giant body) so a client can check freshness cheaply.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, requireUser } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import { RESEARCH_DATASET_KIND } from '@/lib/research/dataset-types'
import type { ResearchDataset, ResearchDatasetRun } from '@/lib/research/dataset-types'

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
    const metaOnly = req.nextUrl.searchParams.get('meta') === '1'

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const user = await requireUser()

    const { data, error } = await supabase
      .from('research_runs')
      .select('id, league_id, strategy_settings, results, created_at, completed_at')
      .eq('league_id', leagueId)
      .eq('user_id', user.id)
      .eq('strategy_settings->>kind', RESEARCH_DATASET_KIND)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      // No published dataset yet - not an error; the client shows the empty state.
      return NextResponse.json({ run: null }, { status: 200 })
    }

    const dataset = data.results as ResearchDataset
    const settings = (data.strategy_settings ?? {}) as Record<string, unknown>

    if (metaOnly) {
      return NextResponse.json({
        run: {
          id: data.id,
          leagueId: data.league_id,
          createdAt: data.created_at,
          completedAt: data.completed_at,
          generatedAt: dataset?.meta?.generatedAt ?? settings.generatedAt ?? null,
          playerCount: dataset?.players?.length ?? settings.playerCount ?? null,
          strategyCount: dataset?.strategies?.length ?? null,
          bytes: Buffer.byteLength(JSON.stringify(dataset ?? {}), 'utf-8'),
        },
      })
    }

    const run: ResearchDatasetRun = {
      id: data.id,
      leagueId: data.league_id,
      createdAt: data.created_at,
      completedAt: data.completed_at,
      dataset,
    }
    return NextResponse.json({ run })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
