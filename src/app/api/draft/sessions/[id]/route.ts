/**
 * GET  /api/draft/sessions/[id] — Fetch a draft session with league data
 * PATCH /api/draft/sessions/[id] — Update picks, status, recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient, requireUser } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import type { DraftStatus } from '@/lib/supabase/database.types'

async function getClient() {
  if (DEV_MODE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const user = await requireUser()
    const userId = user.id

    // Fetch session
    const { data: session, error } = await supabase
      .from('draft_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Fetch league for roster_slots
    const { data: league } = await supabase
      .from('leagues')
      .select('id, name, format, team_count, budget, scoring_format, roster_slots, keeper_enabled, keeper_settings')
      .eq('id', session.league_id)
      .single()

    return NextResponse.json({ session, league })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface PatchBody {
  picks?: Array<{
    player_id: string
    manager: string
    price?: number
    round?: number
    pick_number: number
  }>
  status?: DraftStatus
  recommendations?: Array<Record<string, unknown>>
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const body: PatchBody = await request.json()

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const user = await requireUser()
    const userId = user.id

    // Verify ownership
    const { data: existing, error: fetchErr } = await supabase
      .from('draft_sessions')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (fetchErr || !existing) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Build update object
    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body.picks !== undefined) update.picks = body.picks
    if (body.status !== undefined) update.status = body.status
    if (body.recommendations !== undefined) update.recommendations = body.recommendations

    const { data, error } = await supabase
      .from('draft_sessions')
      .update(update)
      .eq('id', id)
      .select('id, status, picks, updated_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
