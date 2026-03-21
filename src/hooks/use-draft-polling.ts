/**
 * useDraftPolling — polls a Google Sheet for new draft picks.
 *
 * Calls POST /api/draft/sheets every `intervalMs` milliseconds,
 * compares row count to last known count, and triggers onNewPicks
 * when new rows appear.
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { SheetRow, ColumnMapping } from '@/lib/sheets'

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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const pollOnce = useCallback(async () => {
    if (!sheetUrl) return

    setIsPolling(true)
    try {
      const res = await fetch('/api/draft/sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sheet_url: sheetUrl,
          mapping: initialMapping || detectedMapping || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        const msg = data.error || `Poll failed: ${res.status}`
        setError(msg)
        onError?.(msg)
        return
      }

      setError(null)
      setHeaders(data.headers || [])
      setLastPollAt(new Date())

      if (data.mapping) {
        setDetectedMapping(data.mapping)
      }

      const rows: SheetRow[] = data.rows || []
      const prevCount = prevCountRef.current

      if (rows.length > prevCount) {
        const newRows = rows.slice(prevCount)
        setAllPicks(rows)
        prevCountRef.current = rows.length
        onNewPicks?.(newRows, rows)
      } else if (rows.length !== prevCount) {
        // Row count decreased (unlikely but handle it)
        setAllPicks(rows)
        prevCountRef.current = rows.length
      }
    } catch {
      const msg = 'Network error polling sheet'
      setError(msg)
      onError?.(msg)
    } finally {
      setIsPolling(false)
    }
  }, [sheetUrl, initialMapping, detectedMapping, onNewPicks, onError])

  // Start/stop polling interval
  useEffect(() => {
    if (!enabled || !sheetUrl) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Initial poll
    pollOnce()

    // Set up interval
    intervalRef.current = setInterval(pollOnce, intervalMs)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
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
