/**
 * GET /api/leagues
 *
 * Returns all leagues for the current user.
 */

import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    let query = supabase
      .from('leagues')
      .select('id, name, format, team_count, platform, scoring_format, budget, is_active')
      .order('updated_at', { ascending: false })

    // In dev mode, filter by dev user
    if (DEV_MODE) {
      query = query.eq('user_id', DEV_USER.id)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ leagues: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
