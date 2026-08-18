/**
 * GET /api/sim-runs/[id] — R10b: full detail for one saved sim run (reload/compare).
 * Scoped to the caller and to sim-kind rows so a research run id cannot leak here.
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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const user = await requireUser()

    const { data, error } = await supabase
      .from('research_runs')
      .select('id, league_id, strategy_settings, results, status, created_at, completed_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('strategy_settings->>kind', SIM_RUN_KIND)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }

    return NextResponse.json({ run: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
