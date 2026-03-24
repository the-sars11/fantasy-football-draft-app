'use client'

/**
 * useUserTags — React hooks for user tag management (FF-226)
 *
 * Provides:
 * - useUserTags: Load and cache user tags for players
 * - useUserTagMutation: Create/update/delete user tags
 * - useToggleTag: Quick toggle for TARGET/AVOID tags
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { UserTags, UserTagType } from '@/lib/supabase/database.types'

// --- Types ---

interface UserTagsMap {
  [playerCacheId: string]: {
    id: string
    tags: string[]
    note: string | null
    overrideSystemTags: boolean
    dismissedSystemTags: string[]
    leagueId: string | null
  }
}

interface UseUserTagsOptions {
  leagueId?: string | null
  playerCacheIds?: string[]
  includeGlobal?: boolean
  enabled?: boolean
}

interface UseUserTagsResult {
  userTagsMap: UserTagsMap
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
  getTagsForPlayer: (playerCacheId: string) => string[]
  hasTag: (playerCacheId: string, tag: string) => boolean
  isTarget: (playerCacheId: string) => boolean
  isAvoid: (playerCacheId: string) => boolean
}

interface UseUserTagMutationResult {
  setTags: (params: {
    playerCacheId: string
    leagueId?: string | null
    tags: string[]
    note?: string
    overrideSystemTags?: boolean
    dismissedSystemTags?: string[]
  }) => Promise<{ success: boolean; error?: string }>
  addTag: (playerCacheId: string, tag: string, leagueId?: string | null) => Promise<{ success: boolean; error?: string }>
  removeTag: (playerCacheId: string, tag: string, leagueId?: string | null) => Promise<{ success: boolean; error?: string }>
  deleteUserTags: (playerCacheId: string, leagueId?: string | null) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  error: string | null
}

interface UseToggleTagResult {
  toggle: (playerCacheId: string, tag?: string) => Promise<{ success: boolean; nowHasTag: boolean; error?: string }>
  isLoading: boolean
  error: string | null
}

// --- Main Hooks ---

/**
 * Hook for loading user tags for multiple players
 */
export function useUserTags({
  leagueId,
  playerCacheIds = [],
  includeGlobal = true,
  enabled = true,
}: UseUserTagsOptions = {}): UseUserTagsResult {
  const [userTagsMap, setUserTagsMap] = useState<UserTagsMap>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track the last fetched IDs to avoid redundant fetches
  const lastFetchedRef = useRef<string>('')

  const fetchTags = useCallback(async () => {
    if (!enabled || playerCacheIds.length === 0) {
      setUserTagsMap({})
      return
    }

    // Build a cache key to avoid redundant fetches
    const cacheKey = `${leagueId ?? 'null'}-${playerCacheIds.sort().join(',')}`
    if (cacheKey === lastFetchedRef.current) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user-tags/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCacheIds,
          leagueId,
          includeGlobal,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch user tags')
      }

      const data = await response.json()
      setUserTagsMap(data.userTagsMap ?? {})
      lastFetchedRef.current = cacheKey
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useUserTags] Error:', message)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, playerCacheIds, leagueId, includeGlobal])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  // Helper functions
  const getTagsForPlayer = useCallback(
    (playerCacheId: string): string[] => {
      return userTagsMap[playerCacheId]?.tags ?? []
    },
    [userTagsMap]
  )

  const hasTag = useCallback(
    (playerCacheId: string, tag: string): boolean => {
      const tags = userTagsMap[playerCacheId]?.tags ?? []
      return tags.includes(tag.toLowerCase())
    },
    [userTagsMap]
  )

  const isTarget = useCallback(
    (playerCacheId: string): boolean => hasTag(playerCacheId, 'target'),
    [hasTag]
  )

  const isAvoid = useCallback(
    (playerCacheId: string): boolean => hasTag(playerCacheId, 'avoid'),
    [hasTag]
  )

  return {
    userTagsMap,
    isLoading,
    error,
    refetch: fetchTags,
    getTagsForPlayer,
    hasTag,
    isTarget,
    isAvoid,
  }
}

/**
 * Hook for mutating user tags (create/update/delete)
 */
export function useUserTagMutation(): UseUserTagMutationResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setTags = useCallback(async (params: {
    playerCacheId: string
    leagueId?: string | null
    tags: string[]
    note?: string
    overrideSystemTags?: boolean
    dismissedSystemTags?: string[]
  }): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCacheId: params.playerCacheId,
          leagueId: params.leagueId ?? null,
          tags: params.tags,
          note: params.note,
          overrideSystemTags: params.overrideSystemTags,
          dismissedSystemTags: params.dismissedSystemTags,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to set user tags')
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addTag = useCallback(async (
    playerCacheId: string,
    tag: string,
    leagueId?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      // First, get existing tags
      const getResponse = await fetch(
        `/api/user-tags?playerId=${playerCacheId}${leagueId ? `&leagueId=${leagueId}` : '&includeGlobal=true'}`
      )

      let existingTags: string[] = []
      let recordId: string | null = null

      if (getResponse.ok) {
        const getData = await getResponse.json()
        if (getData.userTags?.length > 0) {
          existingTags = getData.userTags[0].tags ?? []
          recordId = getData.userTags[0].id
        }
      }

      // Add new tag if not present
      if (!existingTags.includes(tag.toLowerCase())) {
        const newTags = [...existingTags, tag.toLowerCase()]

        const response = await fetch('/api/user-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerCacheId,
            leagueId: leagueId ?? null,
            tags: newTags,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to add tag')
        }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const removeTag = useCallback(async (
    playerCacheId: string,
    tag: string,
    leagueId?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      // Get existing record
      const getResponse = await fetch(
        `/api/user-tags?playerId=${playerCacheId}${leagueId ? `&leagueId=${leagueId}` : ''}`
      )

      if (!getResponse.ok) {
        throw new Error('Failed to fetch existing tags')
      }

      const getData = await getResponse.json()
      if (getData.userTags?.length === 0) {
        return { success: true } // Nothing to remove
      }

      const record = getData.userTags[0]
      const existingTags: string[] = record.tags ?? []
      const newTags = existingTags.filter((t) => t.toLowerCase() !== tag.toLowerCase())

      // If no tags left, delete the record
      if (newTags.length === 0 && !record.note) {
        const deleteResponse = await fetch('/api/user-tags', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: record.id }),
        })

        if (!deleteResponse.ok) {
          const data = await deleteResponse.json()
          throw new Error(data.error || 'Failed to delete record')
        }
      } else {
        // Update with remaining tags
        const updateResponse = await fetch('/api/user-tags', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: record.id,
            updates: { tags: newTags },
          }),
        })

        if (!updateResponse.ok) {
          const data = await updateResponse.json()
          throw new Error(data.error || 'Failed to update tags')
        }
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteUserTags = useCallback(async (
    playerCacheId: string,
    leagueId?: string | null
  ): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCacheId,
          leagueId: leagueId ?? null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete user tags')
      }

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    setTags,
    addTag,
    removeTag,
    deleteUserTags,
    isLoading,
    error,
  }
}

/**
 * Hook for quickly toggling a tag on/off (optimized for TARGET button)
 */
export function useToggleTag(leagueId?: string | null): UseToggleTagResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggle = useCallback(async (
    playerCacheId: string,
    tag: string = 'target'
  ): Promise<{ success: boolean; nowHasTag: boolean; error?: string }> => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/user-tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCacheId,
          leagueId: leagueId ?? null,
          toggleTag: tag,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to toggle tag')
      }

      const data = await response.json()
      return {
        success: true,
        nowHasTag: data.nowHasTag,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, nowHasTag: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [leagueId])

  return {
    toggle,
    isLoading,
    error,
  }
}

/**
 * Convenience hook for a single player's tags with real-time updates
 */
export function usePlayerTags(
  playerCacheId: string | null,
  leagueId?: string | null
): {
  tags: string[]
  note: string | null
  isTarget: boolean
  isAvoid: boolean
  isLoading: boolean
  error: string | null
  setTags: (tags: string[], note?: string) => Promise<{ success: boolean; error?: string }>
  toggleTag: (tag: string) => Promise<{ success: boolean; nowHasTag: boolean; error?: string }>
  dismiss: () => Promise<{ success: boolean; error?: string }>
} {
  const [tags, setTagsState] = useState<string[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch tags on mount
  useEffect(() => {
    if (!playerCacheId) {
      setTagsState([])
      setNote(null)
      return
    }

    const fetchTags = async () => {
      setIsLoading(true)
      try {
        const url = `/api/user-tags?playerId=${playerCacheId}${
          leagueId ? `&leagueId=${leagueId}&includeGlobal=true` : ''
        }`
        const response = await fetch(url)

        if (!response.ok) {
          throw new Error('Failed to fetch tags')
        }

        const data = await response.json()
        if (data.userTags?.length > 0) {
          // Merge tags from all records (global + league-specific)
          const allTags = new Set<string>()
          let selectedNote: string | null = null

          for (const record of data.userTags) {
            for (const tag of record.tags ?? []) {
              allTags.add(tag)
            }
            // Prefer league-specific note
            if (record.league_id === leagueId && record.note) {
              selectedNote = record.note
            } else if (!selectedNote && record.note) {
              selectedNote = record.note
            }
          }

          setTagsState([...allTags])
          setNote(selectedNote)
        } else {
          setTagsState([])
          setNote(null)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTags()
  }, [playerCacheId, leagueId])

  const setTags = useCallback(async (
    newTags: string[],
    newNote?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!playerCacheId) return { success: false, error: 'No player selected' }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCacheId,
          leagueId: leagueId ?? null,
          tags: newTags,
          note: newNote,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to set tags')
      }

      setTagsState(newTags)
      if (newNote !== undefined) setNote(newNote)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [playerCacheId, leagueId])

  const toggleTag = useCallback(async (
    tag: string
  ): Promise<{ success: boolean; nowHasTag: boolean; error?: string }> => {
    if (!playerCacheId) return { success: false, nowHasTag: false, error: 'No player selected' }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user-tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCacheId,
          leagueId: leagueId ?? null,
          toggleTag: tag,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to toggle tag')
      }

      const data = await response.json()

      // Update local state
      if (data.nowHasTag) {
        // Handle mutual exclusivity for target/avoid
        if (tag === 'target') {
          setTagsState((prev) => [...prev.filter((t) => t !== 'avoid'), tag])
        } else if (tag === 'avoid') {
          setTagsState((prev) => [...prev.filter((t) => t !== 'target'), tag])
        } else {
          setTagsState((prev) => [...prev, tag])
        }
      } else {
        setTagsState((prev) => prev.filter((t) => t !== tag))
      }

      return { success: true, nowHasTag: data.nowHasTag }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, nowHasTag: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [playerCacheId, leagueId])

  const dismiss = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!playerCacheId) return { success: false, error: 'No player selected' }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user-tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerCacheId,
          leagueId: leagueId ?? null,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete tags')
      }

      setTagsState([])
      setNote(null)
      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }, [playerCacheId, leagueId])

  return {
    tags,
    note,
    isTarget: tags.includes('target'),
    isAvoid: tags.includes('avoid'),
    isLoading,
    error,
    setTags,
    toggleTag,
    dismiss,
  }
}
