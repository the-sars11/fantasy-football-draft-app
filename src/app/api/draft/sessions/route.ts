/**
 * POST /api/draft/sessions — Create a new draft session
 * GET  /api/draft/sessions — List sessions for current user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE, DEV_USER } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import type { DraftFormat, DraftStatus } from '@/lib/supabase/database.types'

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
  throw new Error('Non-dev auth not implemented in this route yet')
}

interface CreateSessionBody {
  league_id: string
  format: DraftFormat
  sheet_url?: string
  managers: Array<{
    name: string
    budget?: number
    draft_position?: number
  }>
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionBody = await request.json()

    if (!body.league_id || !body.format) {
      return NextResponse.json(
        { error: 'league_id and format are required' },
        { status: 400 }
      )
    }

    if (!body.managers || body.managers.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 managers are required' },
        { status: 400 }
      )
    }

    // Validate manager names are non-empty and unique
    const names = body.managers.map(m => m.name.trim()).filter(Boolean)
    if (names.length !== body.managers.length) {
      return NextResponse.json(
        { error: 'All managers must have a name' },
        { status: 400 }
      )
    }
    if (new Set(names).size !== names.length) {
      return NextResponse.json(
        { error: 'Manager names must be unique' },
        { status: 400 }
      )
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const userId = getUserId()

    // Verify league exists and belongs to user
    const { data: league, error: leagueErr } = await supabase
      .from('leagues')
      .select('id, format, budget, team_count')
      .eq('id', body.league_id)
      .eq('user_id', userId)
      .single()

    if (leagueErr || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Auto-assign budgets for auction if not provided
    const managers = body.managers.map((m, i) => ({
      name: m.name.trim(),
      budget: body.format === 'auction'
        ? (m.budget ?? league.budget ?? 200)
        : undefined,
      draft_position: body.format === 'snake'
        ? (m.draft_position ?? i + 1)
        : undefined,
    }))

    const status: DraftStatus = 'setup'

    const { data, error } = await supabase
      .from('draft_sessions')
      .insert({
        user_id: userId,
        league_id: body.league_id,
        format: body.format,
        sheet_url: body.sheet_url || null,
        status,
        managers,
        picks: [],
        recommendations: [],
      })
      .select('id, status, format, managers, sheet_url, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const userId = getUserId()

    const { data, error } = await supabase
      .from('draft_sessions')
      .select('id, league_id, format, status, managers, sheet_url, created_at, updated_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions: data ?? [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
