/**
 * User Tags API Routes (FF-225)
 *
 * CRUD operations for user-defined player tags (TARGET, AVOID, custom tags).
 * Supports league-specific tags or global tags (league_id = null).
 *
 * Endpoints:
 * - GET /api/user-tags?leagueId=xxx&playerId=xxx - List user tags (filter by league/player)
 * - POST /api/user-tags - Create or upsert user tags for a player
 * - PUT /api/user-tags - Update existing user tags
 * - DELETE /api/user-tags - Remove user tags for a player
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { DEV_MODE } from '@/lib/supabase/dev-mode'
import { createClient } from '@supabase/supabase-js'
import type { UserTagsInsert, UserTagsUpdate, UserTagType } from '@/lib/supabase/database.types'

// Standard user tag types
const STANDARD_USER_TAGS: UserTagType[] = ['target', 'avoid', 'watch', 'sleeper', 'breakout']

async function getClient() {
  if (DEV_MODE) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (url && serviceKey) return createClient(url, serviceKey)
  }
  return createServerClient()
}

/**
 * GET /api/user-tags
 *
 * Query params:
 * - leagueId: Filter by league (optional, null = global tags)
 * - playerId: Filter by player cache ID (optional)
 * - includeGlobal: Include global tags (league_id is null) when filtering by league
 */
export async function GET(req: NextRequest) {
  try {
    const leagueId = req.nextUrl.searchParams.get('leagueId')
    const playerId = req.nextUrl.searchParams.get('playerId')
    const includeGlobal = req.nextUrl.searchParams.get('includeGlobal') === 'true'

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Build query
    let query = supabase
      .from('user_tags')
      .select('*, players_cache(name, team, position)')

    // Apply filters
    if (playerId) {
      query = query.eq('player_cache_id', playerId)
    }

    if (leagueId) {
      if (includeGlobal) {
        // Get both league-specific and global tags
        query = query.or(`league_id.eq.${leagueId},league_id.is.null`)
      } else {
        query = query.eq('league_id', leagueId)
      }
    }

    query = query.order('updated_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      userTags: data ?? [],
      count: data?.length ?? 0,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-tags GET]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/user-tags
 *
 * Create or upsert user tags for a player.
 * If a record exists for the user/player/league combo, it will be updated (upsert).
 *
 * Body: {
 *   playerCacheId: string (required)
 *   leagueId?: string | null (optional, null = applies to all leagues)
 *   tags?: string[] (optional, defaults to [])
 *   note?: string (optional)
 *   overrideSystemTags?: boolean (optional, default false)
 *   dismissedSystemTags?: string[] (optional)
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      playerCacheId,
      leagueId = null,
      tags = [],
      note,
      overrideSystemTags = false,
      dismissedSystemTags = [],
    } = body as {
      playerCacheId?: string
      leagueId?: string | null
      tags?: string[]
      note?: string
      overrideSystemTags?: boolean
      dismissedSystemTags?: string[]
    }

    if (!playerCacheId) {
      return NextResponse.json({ error: 'playerCacheId is required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Normalize tags (lowercase, remove duplicates)
    const normalizedTags = [...new Set(tags.map((t) => t.toLowerCase()))]

    const insert: UserTagsInsert = {
      player_cache_id: playerCacheId,
      league_id: leagueId,
      tags: normalizedTags,
      note: note || null,
      override_system_tags: overrideSystemTags,
      dismissed_system_tags: dismissedSystemTags,
    }

    // Use upsert to handle create-or-update in one operation
    // The unique constraint is on (user_id, player_cache_id, league_id)
    const { data, error } = await supabase
      .from('user_tags')
      .upsert(insert, {
        onConflict: 'user_id,player_cache_id,league_id',
        ignoreDuplicates: false,
      })
      .select('*, players_cache(name, team, position)')
      .single()

    if (error) {
      // If upsert fails, try insert (might be first record)
      const { data: insertData, error: insertError } = await supabase
        .from('user_tags')
        .insert(insert)
        .select('*, players_cache(name, team, position)')
        .single()

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      return NextResponse.json({ userTag: insertData, created: true })
    }

    return NextResponse.json({ userTag: data, created: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-tags POST]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * PUT /api/user-tags
 *
 * Update existing user tags.
 *
 * Body: {
 *   id: string (required) - user_tags record ID
 *   updates: {
 *     tags?: string[]
 *     note?: string | null
 *     overrideSystemTags?: boolean
 *     dismissedSystemTags?: string[]
 *   }
 * }
 *
 * Or for atomic tag operations:
 * Body: {
 *   id: string
 *   addTags?: string[] - tags to add
 *   removeTags?: string[] - tags to remove
 * }
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, updates, addTags, removeTags } = body as {
      id?: string
      updates?: UserTagsUpdate
      addTags?: string[]
      removeTags?: string[]
    }

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Handle atomic tag operations (add/remove specific tags)
    if (addTags || removeTags) {
      // First fetch current tags
      const { data: current, error: fetchError } = await supabase
        .from('user_tags')
        .select('tags')
        .eq('id', id)
        .single()

      if (fetchError || !current) {
        return NextResponse.json({ error: 'User tag record not found' }, { status: 404 })
      }

      let newTags = new Set(current.tags as string[])

      // Add new tags
      if (addTags) {
        for (const tag of addTags) {
          newTags.add(tag.toLowerCase())
        }
      }

      // Remove tags
      if (removeTags) {
        for (const tag of removeTags) {
          newTags.delete(tag.toLowerCase())
        }
      }

      const { data, error } = await supabase
        .from('user_tags')
        .update({
          tags: [...newTags],
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*, players_cache(name, team, position)')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ userTag: data })
    }

    // Handle full updates
    if (!updates) {
      return NextResponse.json({ error: 'updates, addTags, or removeTags is required' }, { status: 400 })
    }

    // Build update object with snake_case keys
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (updates.tags !== undefined) {
      updateData.tags = [...new Set(updates.tags.map((t) => t.toLowerCase()))]
    }
    if (updates.note !== undefined) {
      updateData.note = updates.note
    }
    if (updates.override_system_tags !== undefined) {
      updateData.override_system_tags = updates.override_system_tags
    }
    if (updates.dismissed_system_tags !== undefined) {
      updateData.dismissed_system_tags = updates.dismissed_system_tags
    }

    const { data, error } = await supabase
      .from('user_tags')
      .update(updateData)
      .eq('id', id)
      .select('*, players_cache(name, team, position)')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ userTag: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-tags PUT]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * DELETE /api/user-tags
 *
 * Delete user tags for a player.
 *
 * Body: {
 *   id: string (required) - user_tags record ID
 * }
 *
 * Or:
 * Body: {
 *   playerCacheId: string
 *   leagueId?: string | null
 * }
 */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, playerCacheId, leagueId } = body as {
      id?: string
      playerCacheId?: string
      leagueId?: string | null
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    // Delete by ID
    if (id) {
      const { error } = await supabase
        .from('user_tags')
        .delete()
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, deletedId: id })
    }

    // Delete by player + league
    if (playerCacheId) {
      let query = supabase
        .from('user_tags')
        .delete()
        .eq('player_cache_id', playerCacheId)

      if (leagueId === null) {
        query = query.is('league_id', null)
      } else if (leagueId) {
        query = query.eq('league_id', leagueId)
      }

      const { error } = await query

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ success: true, deletedPlayer: playerCacheId })
    }

    return NextResponse.json({ error: 'id or playerCacheId is required' }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-tags DELETE]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Convenience endpoint for quickly toggling TARGET tag
 * PATCH /api/user-tags
 *
 * Body: {
 *   playerCacheId: string
 *   leagueId?: string | null
 *   toggleTag: string (e.g., 'target', 'avoid')
 * }
 *
 * Returns the updated user tags with the tag toggled (added if not present, removed if present)
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { playerCacheId, leagueId = null, toggleTag } = body as {
      playerCacheId?: string
      leagueId?: string | null
      toggleTag?: string
    }

    if (!playerCacheId || !toggleTag) {
      return NextResponse.json(
        { error: 'playerCacheId and toggleTag are required' },
        { status: 400 }
      )
    }

    const supabase = await getClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 })
    }

    const normalizedTag = toggleTag.toLowerCase()

    // Check if a record exists
    let query = supabase
      .from('user_tags')
      .select('*')
      .eq('player_cache_id', playerCacheId)

    if (leagueId === null) {
      query = query.is('league_id', null)
    } else {
      query = query.eq('league_id', leagueId)
    }

    const { data: existing, error: fetchError } = await query.maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (existing) {
      // Toggle tag in existing record
      const currentTags = new Set(existing.tags as string[])
      const hasTag = currentTags.has(normalizedTag)

      if (hasTag) {
        currentTags.delete(normalizedTag)
      } else {
        // Special handling: if adding 'target', remove 'avoid' (mutually exclusive)
        if (normalizedTag === 'target') {
          currentTags.delete('avoid')
        }
        // If adding 'avoid', remove 'target'
        if (normalizedTag === 'avoid') {
          currentTags.delete('target')
        }
        currentTags.add(normalizedTag)
      }

      const { data, error } = await supabase
        .from('user_tags')
        .update({
          tags: [...currentTags],
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select('*, players_cache(name, team, position)')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        userTag: data,
        toggled: normalizedTag,
        nowHasTag: !hasTag,
      })
    } else {
      // Create new record with the tag
      const insert: UserTagsInsert = {
        player_cache_id: playerCacheId,
        league_id: leagueId,
        tags: [normalizedTag],
      }

      const { data, error } = await supabase
        .from('user_tags')
        .insert(insert)
        .select('*, players_cache(name, team, position)')
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({
        userTag: data,
        toggled: normalizedTag,
        nowHasTag: true,
        created: true,
      })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[API /user-tags PATCH]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
