/**
 * GET /api/research/[runId]
 *
 * Returns a single saved research run with full results (FF-026)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE, DEV_USER } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'

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
  { params }: { params: Promise<{ runId: string }> },
) {
  try {
    const { runId } = await params

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const userId = DEV_MODE ? DEV_USER.id : null
    if (!userId) {
      return NextResponse.json({ error: 'Auth not implemented for prod yet' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('research_runs')
      .select('*')
      .eq('id', runId)
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 })
    }

    return NextResponse.json({ run: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
