/**
 * GET /api/players
 *
 * Read cached players from Supabase.
 * Query params:
 * - position: filter by position (QB, RB, WR, TE, K, DEF)
 * - limit: max players to return (default: 300)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'

async function getClient() {
  if (DEV_MODE) {
    // In dev mode, use service role to bypass RLS
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const { searchParams } = new URL(req.url)
    const position = searchParams.get('position')
    const limit = parseInt(searchParams.get('limit') || '300')

    let query = supabase
      .from('players_cache')
      .select('*')
      .order('last_updated_at', { ascending: false })
      .limit(limit)

    if (position) {
      const dbPosition = position === 'DEF' ? 'DST' : position
      query = query.eq('position', dbPosition)
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ players: data || [], count: data?.length || 0 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
