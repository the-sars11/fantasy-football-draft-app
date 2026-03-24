/**
 * Batch User Tags API (FF-225)
 *
 * Efficient batch operations for user tags - useful when loading player lists.
 *
 * Endpoints:
 * - POST /api/user-tags/batch - Get tags for multiple players at once
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

/**
 * POST /api/user-tags/batch
 *
 * Get user tags for multiple players in a single request.
 * Returns a map of playerCacheId -> userTags for efficient lookup.
 *
 * Body: {
 *   playerCacheIds: string[] (required, max 500)
 *   leagueId?: string | null (optional, filter by league)
 *   includeGlobal?: boolean (include tags where league_id is null)
 * }
 *
 * Response: {
 *   userTagsMap: Record<playerCacheId, UserTags>
 *   count: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      playerCacheIds,
      leagueId,
      includeGlobal = true,
    } = body as {
      playerCacheIds?: string[]
      leagueId?: string | null
      includeGlobal?: boolean
    }

    if (!playerCacheIds || !Array.isArray(playerCacheIds)) {
      return NextResponse.json(
        { error: 'playerCacheIds array is required' },
        { status: 400 }
      )
    }

    if (playerCacheIds.length === 0) {
      return NextResponse.json({ userTagsMap: {}, count: 0 })
    }

    if (playerCacheIds.length > 500) {
      return NextResponse.json(
        { error: 'Maximum 500 player IDs per batch request' },
        { status: 400 }
      )
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Build query
    let query = supabase
      .from('user_tags')
      .select('*')
      .in('player_cache_id', playerCacheIds)

    // Apply league filter
    if (leagueId !== undefined) {
      if (includeGlobal) {
        query = query.or(`league_id.eq.${leagueId},league_id.is.null`)
      } else if (leagueId === null) {
        query = query.is('league_id', null)
      } else {
        query = query.eq('league_id', leagueId)
      }
    }

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Build map for efficient lookup
    // If there are multiple records per player (league-specific + global), merge them
    const userTagsMap: Record<string, {
      id: string
      tags: string[]
      note: string | null
      overrideSystemTags: boolean
      dismissedSystemTags: string[]
      leagueId: string | null
      // For merged results, track all source records
      sourceRecords?: Array<{
        id: string
        leagueId: string | null
        tags: string[]
      }>
    }> = {}

    for (const record of data ?? []) {
      const playerId = record.player_cache_id

      if (!userTagsMap[playerId]) {
        // First record for this player
        userTagsMap[playerId] = {
          id: record.id,
          tags: record.tags,
          note: record.note,
          overrideSystemTags: record.override_system_tags,
          dismissedSystemTags: record.dismissed_system_tags,
          leagueId: record.league_id,
        }
      } else {
        // Merge with existing - prefer league-specific over global
        const existing = userTagsMap[playerId]

        // Track source records for debugging/display
        if (!existing.sourceRecords) {
          existing.sourceRecords = [{
            id: existing.id,
            leagueId: existing.leagueId,
            tags: [...existing.tags],
          }]
        }
        existing.sourceRecords.push({
          id: record.id,
          leagueId: record.league_id,
          tags: record.tags,
        })

        // Merge tags (union of all)
        const mergedTags = new Set([...existing.tags, ...record.tags])
        existing.tags = [...mergedTags]

        // Merge dismissed system tags
        const mergedDismissed = new Set([
          ...existing.dismissedSystemTags,
          ...record.dismissed_system_tags,
        ])
        existing.dismissedSystemTags = [...mergedDismissed]

        // If ANY record has override, use override
        if (record.override_system_tags) {
          existing.overrideSystemTags = true
        }

        // Prefer league-specific note over global
        if (record.league_id && record.note) {
          existing.note = record.note
          existing.id = record.id
          existing.leagueId = record.league_id
        }
      }
    }

    return NextResponse.json({
      userTagsMap,
      count: Object.keys(userTagsMap).length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-tags/batch POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
