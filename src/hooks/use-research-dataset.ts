'use client'

/**
 * useResearchDataset - read the published headless research dataset (W0 seam).
 *
 * The heavy snapshot (every strategy sim, stud combo, enriched player, league
 * intel) is computed once headless by `npm run research:run` + `research:publish`
 * and stored in Supabase. This hook reads it back through GET /api/research-dataset
 * so the Strategy Leaderboard (W1), League Intel (W2), and Draft Plan (W4) screens
 * render the exact same $0, engine-derived numbers with zero recompute.
 *
 * Two modes:
 *   - full (default): the whole ResearchDataset, for a screen that renders it.
 *   - meta ({ metaOnly: true }): just freshness + size, for a cheap "is there a
 *     dataset, and how old" check without pulling megabytes.
 *
 * `run` is null (not an error) when nothing has been published yet - the caller
 * shows an empty state that points at the publish command.
 */

import { useState, useCallback, useEffect } from 'react'
import type { ResearchDatasetRun } from '@/lib/research/dataset-types'

/** Cheap freshness envelope returned when metaOnly is set. */
export interface ResearchDatasetMeta {
  id: string
  leagueId: string
  createdAt: string
  completedAt: string | null
  generatedAt: string | null
  playerCount: number | null
  strategyCount: number | null
  bytes: number
}

interface UseResearchDatasetOptions {
  leagueId?: string | null
  metaOnly?: boolean
  enabled?: boolean
}

interface UseResearchDatasetResult {
  run: ResearchDatasetRun | null
  meta: ResearchDatasetMeta | null
  isLoading: boolean
  error: string | null
  /** True once a fetch has completed and no dataset row exists for the league. */
  isEmpty: boolean
  refetch: () => Promise<void>
}

export function useResearchDataset({
  leagueId,
  metaOnly = false,
  enabled = true,
}: UseResearchDatasetOptions = {}): UseResearchDatasetResult {
  const [run, setRun] = useState<ResearchDatasetRun | null>(null)
  const [meta, setMeta] = useState<ResearchDatasetMeta | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(false)

  const fetchDataset = useCallback(async () => {
    if (!enabled || !leagueId) {
      setRun(null)
      setMeta(null)
      setIsEmpty(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({ leagueId })
      if (metaOnly) params.set('meta', '1')
      const response = await fetch(`/api/research-dataset?${params.toString()}`)

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to load research dataset')
      }

      const data = await response.json()
      if (!data.run) {
        setRun(null)
        setMeta(null)
        setIsEmpty(true)
        return
      }

      setIsEmpty(false)
      if (metaOnly) {
        setMeta(data.run as ResearchDatasetMeta)
        setRun(null)
      } else {
        setRun(data.run as ResearchDatasetRun)
        setMeta(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(message)
      console.error('[useResearchDataset] Error:', message)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, leagueId, metaOnly])

  useEffect(() => {
    fetchDataset()
  }, [fetchDataset])

  return { run, meta, isLoading, error, isEmpty, refetch: fetchDataset }
}
