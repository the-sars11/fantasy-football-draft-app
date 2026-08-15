/**
 * /api/strategies/ratings
 *
 * GET  ?leagueId=xxx  -- list all ratings for a user/league (keyed by archetype)
 * POST { leagueId, archetype, rating }
 *       rating 1-5: upsert
 *       rating 0:   delete (clear rating)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'

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

    const { data, error } = await supabase
      .from('user_strategy_ratings')
      .select('archetype, rating')
      .eq('league_id', leagueId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ratings: data ?? [] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { leagueId, archetype, rating } = body as {
      leagueId?: string
      archetype?: string
      rating?: number
    }

    if (!leagueId || !archetype || rating === undefined) {
      return NextResponse.json(
        { error: 'leagueId, archetype, and rating are required' },
        { status: 400 }
      )
    }

    if (typeof rating !== 'number' || (!Number.isInteger(rating)) || rating < 0 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be an integer 0-5 (0 clears the rating)' },
        { status: 400 }
      )
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    if (rating === 0) {
      const { error } = await supabase
        .from('user_strategy_ratings')
        .delete()
        .eq('league_id', leagueId)
        .eq('archetype', archetype)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ cleared: true })
    }

    const { data, error } = await supabase
      .from('user_strategy_ratings')
      .upsert(
        { league_id: leagueId, archetype, rating, updated_at: new Date().toISOString() },
        { onConflict: 'user_id,league_id,archetype' }
      )
      .select('archetype, rating')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ rating: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
