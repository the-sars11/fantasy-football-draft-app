'use client'

/**
 * useSleeperDraftFeed — polls Sleeper API for live snake draft picks.
 *
 * No auth required. Gated by caller (snake mode + sdi param present).
 *
 * Endpoints:
 *   GET https://api.sleeper.app/v1/draft/{draft_id}/picks  — all picks so far
 *   GET https://api.sleeper.app/v1/draft/{draft_id}        — draft status
 *
 * Manager resolution: uses managerOrder[] (ordered by draft_position, index 0 = pick 1)
 * + snake math to map pick_no → manager name without Sleeper user lookups.
 *
 * Dedup key: `sleeper:{pick_no}` — stable and unique per pick within a draft.
 */

import { useEffect, useRef, useState } from 'react'
import type { NormalizedPickEvent } from '@/lib/draft/auction-feed-merge'

const SLEEPER_BASE = 'https://api.sleeper.app/v1'
const POLL_MS = 5000

interface SleeperPick {
  pick_no: number
  round: number
  draft_slot: number
  player_id: string
  is_keeper: boolean | null
  metadata: {
    first_name?: string
    last_name?: string
    position?: string
    team?: string
  }
}

interface SleeperDraft {
  status: 'pre_draft' | 'drafting' | 'complete' | string
}

export interface UseSleeperDraftFeedResult {
  connected: boolean
  importedCount: number
  lastSyncAt: Date | null
  error: string | null
  draftComplete: boolean
}

/** Extract the numeric Sleeper draft ID from a full URL or raw ID string. */
export function extractSleeperDraftId(input: string): string | null {
  const match = input.trim().match(/(\d{10,20})\/?$/)
  return match ? match[1] : null
}

/**
 * Map a 1-indexed overall pick_no to a manager array index using snake order.
 * managerOrder length = team count.
 */
function pickNoToManagerIdx(pickNo: number, teamCount: number): number {
  const round = Math.ceil(pickNo / teamCount)
  const posInRound = pickNo - (round - 1) * teamCount // 1-indexed
  return round % 2 === 1 ? posInRound - 1 : teamCount - posInRound
}

export function useSleeperDraftFeed({
  draftId,
  enabled,
  managerOrder,
  onNewPicks,
  onDraftComplete,
}: {
  draftId: string | null
  enabled: boolean
  managerOrder: string[]
  onNewPicks: (picks: NormalizedPickEvent[]) => void
  onDraftComplete?: () => void
}): UseSleeperDraftFeedResult {
  const [connected, setConnected] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draftComplete, setDraftComplete] = useState(false)

  const seenPickNos = useRef(new Set<number>())
  // Keep callbacks + managerOrder fresh without restarting the poll interval.
  const onNewPicksRef = useRef(onNewPicks)
  const onDraftCompleteRef = useRef(onDraftComplete)
  const managerOrderRef = useRef(managerOrder)
  useEffect(() => { onNewPicksRef.current = onNewPicks }, [onNewPicks])
  useEffect(() => { onDraftCompleteRef.current = onDraftComplete }, [onDraftComplete])
  useEffect(() => { managerOrderRef.current = managerOrder }, [managerOrder])

  useEffect(() => {
    if (!enabled || !draftId) return
    let cancelled = false

    async function pollPicks() {
      try {
        const res = await fetch(`${SLEEPER_BASE}/draft/${draftId}/picks`, { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setError(`Sleeper API ${res.status}`)
          return
        }
        const picks: SleeperPick[] = await res.json()
        if (cancelled) return

        setConnected(true)
        setError(null)
        setLastSyncAt(new Date())

        const order = managerOrderRef.current
        const teamCount = order.length || 12
        const newEvents: NormalizedPickEvent[] = []

        for (const pick of picks) {
          if (seenPickNos.current.has(pick.pick_no)) continue
          seenPickNos.current.add(pick.pick_no)

          const firstName = pick.metadata?.first_name ?? ''
          const lastName = pick.metadata?.last_name ?? ''
          const playerName = [firstName, lastName].filter(Boolean).join(' ')
          if (!playerName) continue

          const idx = pickNoToManagerIdx(pick.pick_no, teamCount)
          const manager = order[idx] ?? `Manager ${idx + 1}`

          newEvents.push({
            pickId: `sleeper:${pick.pick_no}`,
            playerName,
            manager,
            price: 0,
            position: pick.metadata?.position,
            source: 'sleeper',
          })
        }

        if (newEvents.length > 0) {
          setImportedCount(prev => prev + newEvents.length)
          onNewPicksRef.current(newEvents)
        }
      } catch {
        if (!cancelled) setError('Could not reach Sleeper API')
      }
    }

    async function pollStatus() {
      try {
        const res = await fetch(`${SLEEPER_BASE}/draft/${draftId}`, { cache: 'no-store' })
        if (!res.ok) return
        const data: SleeperDraft = await res.json()
        if (data.status === 'complete' && !cancelled) {
          setDraftComplete(true)
          onDraftCompleteRef.current?.()
        }
      } catch {
        // non-critical — picks polling is the primary signal
      }
    }

    pollPicks()
    const interval = setInterval(() => {
      pollPicks()
      pollStatus()
    }, POLL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [enabled, draftId]) // managerOrder handled via ref — no restart on order change

  if (!enabled) {
    return { connected: false, importedCount: 0, lastSyncAt: null, error: null, draftComplete: false }
  }

  return { connected, importedCount, lastSyncAt, error, draftComplete }
}
