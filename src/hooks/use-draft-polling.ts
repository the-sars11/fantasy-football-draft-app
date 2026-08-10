/**
 * useDraftPolling - polls a Google Sheet for new draft picks.
 *
 * Calls POST /api/draft/sheets every `intervalMs` milliseconds,
 * compares row count to last known count, and triggers onNewPicks
 * when new rows appear.
 *
 * Resilience (finding 10):
 *   - Callbacks + mapping + sheet URL are held in refs so the poll loop is
 *     NEVER restarted mid-draft by a changing callback identity or by the
 *     first mapping-detection. The loop only restarts on enable/disable or a
 *     genuine sheet-URL change (mirrors use-sleeper-draft-feed.ts).
 *   - Consecutive failures back off exponentially (intervalMs * 2^failures,
 *     capped at MAX_BACKOFF_MS) and reset to intervalMs on the next success,
 *     so a rate-limited or offline sheet is not hammered.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { SheetRow, ColumnMapping } from '@/lib/sheets'

/** Upper bound on the backoff delay between failed polls (60s). */
const MAX_BACKOFF_MS = 60000

interface UseDraftPollingOptions {
  sheetUrl: string | null
  mapping?: ColumnMapping
  intervalMs?: number       // default 7000 (7 seconds)
  enabled?: boolean         // default true
  onNewPicks?: (picks: SheetRow[], allPicks: SheetRow[]) => void
  onError?: (error: string) => void
}

interface UseDraftPollingResult {
  allPicks: SheetRow[]
  headers: string[]
  mapping: ColumnMapping | null
  isPolling: boolean
  lastPollAt: Date | null
  error: string | null
  pollNow: () => Promise<void>
}

export function useDraftPolling({
  sheetUrl,
  mapping: initialMapping,
  intervalMs = 7000,
  enabled = true,
  onNewPicks,
  onError,
}: UseDraftPollingOptions): UseDraftPollingResult {
  const [allPicks, setAllPicks] = useState<SheetRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [detectedMapping, setDetectedMapping] = useState<ColumnMapping | null>(initialMapping || null)
  const [isPolling, setIsPolling] = useState(false)
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const prevCountRef = useRef(0)
  // Consecutive failed polls; drives exponential backoff, reset to 0 on success.
  const failureCountRef = useRef(0)

  // Keep callbacks + mapping + sheet URL fresh WITHOUT restarting the poll loop.
  const onNewPicksRef = useRef(onNewPicks)
  const onErrorRef = useRef(onError)
  const initialMappingRef = useRef(initialMapping)
  const detectedMappingRef = useRef<ColumnMapping | null>(initialMapping || null)
  const sheetUrlRef = useRef(sheetUrl)
  useEffect(() => { onNewPicksRef.current = onNewPicks }, [onNewPicks])
  useEffect(() => { onErrorRef.current = onError }, [onError])
  useEffect(() => { initialMappingRef.current = initialMapping }, [initialMapping])
  useEffect(() => { detectedMappingRef.current = detectedMapping }, [detectedMapping])
  useEffect(() => { sheetUrlRef.current = sheetUrl }, [sheetUrl])

  // Stable poll function: reads everything mutable from refs, so its identity
  // never changes and the scheduling effect below does not tear down the loop.
  const pollOnce = useCallback(async () => {
    const url = sheetUrlRef.current
    if (!url) return

    setIsPolling(true)
    try {
      const res = await fetch('/api/draft/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_url: url,
          mapping: initialMappingRef.current || detectedMappingRef.current || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.error || `Poll failed: ${res.status}`
        failureCountRef.current += 1
        setError(msg)
        onErrorRef.current?.(msg)
        return
      }

      failureCountRef.current = 0
      setError(null)
      setHeaders(data.headers || [])
      setLastPollAt(new Date())

      if (data.mapping) {
        detectedMappingRef.current = data.mapping
        setDetectedMapping(data.mapping)
      }

      const rows: SheetRow[] = data.rows || []
      const prevCount = prevCountRef.current

      if (rows.length > prevCount) {
        const newRows = rows.slice(prevCount)
        setAllPicks(rows)
        prevCountRef.current = rows.length
        onNewPicksRef.current?.(newRows, rows)
      } else if (rows.length !== prevCount) {
        // Row count decreased (unlikely but handle it)
        setAllPicks(rows)
        prevCountRef.current = rows.length
      }
    } catch {
      const msg = 'Network error polling sheet'
      failureCountRef.current += 1
      setError(msg)
      onErrorRef.current?.(msg)
    } finally {
      setIsPolling(false)
    }
  }, [])

  // Self-scheduling poll loop with exponential backoff on failure.
  // Deps: enabled/sheetUrl/intervalMs are the ONLY legitimate restart triggers;
  // pollOnce is stable so callback/mapping churn never restarts the loop.
  useEffect(() => {
    if (!enabled || !sheetUrl) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      await pollOnce()
      if (cancelled) return
      const failures = failureCountRef.current
      const delay = failures > 0
        ? Math.min(intervalMs * 2 ** failures, MAX_BACKOFF_MS)
        : intervalMs
      timer = setTimeout(tick, delay)
    }

    // Reset backoff whenever the loop (re)starts, then poll immediately.
    failureCountRef.current = 0
    tick()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, sheetUrl, intervalMs, pollOnce])

  return {
    allPicks,
    headers,
    mapping: detectedMapping,
    isPolling,
    lastPollAt,
    error,
    pollNow: pollOnce,
  }
}
