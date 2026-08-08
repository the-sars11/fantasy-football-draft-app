'use client'

/**
 * useRemoteAuctioneerFeed — cross-device live sync from the deployed Auctioneer (FF-314).
 *
 * Polls THIS repo's server-side proxy (`/api/auctioneer-feed`, which server-side
 * fetches the deployed auctioneer's `/api/state` to dodge CORS) every ~3s. A
 * non-null payload with top-level `phase === 'drafting'` (or picks present) means
 * a live auction is up over the internet ⇒ connect automatically. Null / 404 /
 * error ⇒ stay silent so the caller falls back to its other feed sources.
 *
 * This is a NEW SOURCE, not a new mode: it emits the same `AuctioneerPick[]` shape
 * as `useAuctioneerfeed`, so `use-draft-feed.ts` folds it into the same merger and
 * dedup path. Same-device BroadcastChannel wins when present; remote covers the
 * cross-device case (host laptop + Joe's phone on different origins).
 *
 * Interruption handling: on a failed poll the hook does NOT blow away state — it
 * keeps the last-known `pickCount`/`lastSyncAt`, surfaces `error`, and backs off
 * (3s → 6s → 12s, capped at 15s), resetting to 3s the moment a poll succeeds.
 * `retry()` forces an immediate poll (wired to the connection chip's Retry).
 *
 * Auction-only: caller gates on `format === 'auction'`.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

// ---------------------------------------------------------------------------
// Types — mirror the auctioneer's on-the-wire DraftState (no import from repo)
// ---------------------------------------------------------------------------

/** Normalized pick emitted by the hook — maps directly to addManualPick args. */
export interface RemoteAuctioneerPick {
  player_name: string
  manager: string
  price: number
  position?: string
  /** Auctioneer's stable internal pick id — used for per-session dedup. */
  remoteId: string
}

interface _RemotePlayer {
  id?: string
  name: string
  position?: string
  team?: string
}

interface _RemotePick {
  id: string
  player: _RemotePlayer
  teamId: string
  price: number
  pickNumber?: number
  timestamp?: number
}

interface _RemoteTeam {
  id: string
  name: string
}

interface _RemoteDraftState {
  config?: { teams?: _RemoteTeam[]; budget?: number; teamCount?: number }
  picks?: _RemotePick[]
  phase?: string
  pickNumber?: number
}

interface _ProxyResponse {
  state: _RemoteDraftState | null
  error?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BASE_INTERVAL_MS = 3000
const MAX_INTERVAL_MS = 15000

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildTeamNameMap(teams: _RemoteTeam[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const t of teams) map.set(t.id, t.name)
  return map
}

function normalizeRemotePick(
  pick: _RemotePick,
  teamNameMap: Map<string, string>,
): RemoteAuctioneerPick {
  return {
    player_name: pick.player?.name ?? '',
    manager: teamNameMap.get(pick.teamId) ?? pick.teamId,
    price: pick.price ?? 0,
    position: pick.player?.position,
    remoteId: pick.id,
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseRemoteAuctioneerFeedOptions {
  /** Gate: set true only when format === 'auction'. */
  enabled: boolean
  /** Optional draft short-code for AA-FFI-2 forward-compat. Omit today. */
  draftCode?: string | null
  /** Fires with picks not seen before this session. Caller re-checks draftedNames. */
  onNewPicks?: (picks: RemoteAuctioneerPick[]) => void
}

export interface UseRemoteAuctioneerFeedResult {
  /** True when the last poll returned a live drafting payload. */
  connected: boolean
  /** Auctioneer lifecycle phase from the last successful poll, or null. */
  phase: string | null
  /** Timestamp of the last SUCCESSFUL poll that returned live data, or null. */
  lastSyncAt: Date | null
  /** Total remote picks imported since mount. */
  pickCount: number
  /** True once at least one poll has completed (success or failure). */
  hasPolled: boolean
  /** Human-readable error from the last failed poll, or null when healthy. */
  error: string | null
  /** Force an immediate poll (wired to the chip's Retry). */
  retry: () => void
}

export function useRemoteAuctioneerFeed({
  enabled,
  draftCode,
  onNewPicks,
}: UseRemoteAuctioneerFeedOptions): UseRemoteAuctioneerFeedResult {
  const [connected, setConnected] = useState(false)
  const [phase, setPhase] = useState<string | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [pickCount, setPickCount] = useState(0)
  const [hasPolled, setHasPolled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Per-session dedup: auctioneer pick ids already emitted.
  const seenIdsRef = useRef(new Set<string>())
  // Consecutive-failure count drives exponential backoff.
  const failuresRef = useRef(0)
  // Keep the latest onNewPicks without restarting the poll loop.
  const onNewPicksRef = useRef(onNewPicks)
  onNewPicksRef.current = onNewPicks
  // Manual-retry nonce — bumping it re-arms the poll loop immediately.
  const [retryNonce, setRetryNonce] = useState(0)

  const retry = useCallback(() => {
    failuresRef.current = 0
    setRetryNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled) return
    if (typeof window === 'undefined') return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function poll() {
      const url = draftCode
        ? `/api/auctioneer-feed?code=${encodeURIComponent(draftCode)}`
        : '/api/auctioneer-feed'
      try {
        const res = await fetch(url, { cache: 'no-store' })
        const data = (await res.json()) as _ProxyResponse

        if (cancelled) return
        setHasPolled(true)

        const state = data?.state ?? null
        const picks = state?.picks ?? []
        const isLive =
          !!state && (state.phase === 'drafting' || picks.length > 0)

        if (!isLive) {
          // No live draft up — not an error, just nothing to connect to yet.
          setConnected(false)
          setPhase(state?.phase ?? null)
          setError(data?.error ?? null)
          failuresRef.current = 0
          return
        }

        // Live payload — connect + fold new picks through internal dedup.
        const teamNameMap = buildTeamNameMap(state?.config?.teams ?? [])
        const fresh: RemoteAuctioneerPick[] = []
        for (const p of picks) {
          if (!p?.id || seenIdsRef.current.has(p.id)) continue
          seenIdsRef.current.add(p.id)
          fresh.push(normalizeRemotePick(p, teamNameMap))
        }

        setConnected(true)
        setPhase(state?.phase ?? 'drafting')
        setLastSyncAt(new Date())
        setError(null)
        failuresRef.current = 0

        if (fresh.length > 0) {
          setPickCount((prev) => prev + fresh.length)
          onNewPicksRef.current?.(fresh)
        }
      } catch (err) {
        if (cancelled) return
        setHasPolled(true)
        // Interruption: keep last-known state, surface error, back off.
        failuresRef.current += 1
        setError(
          err instanceof Error ? err.message : 'Could not reach the auctioneer',
        )
      } finally {
        if (cancelled) return
        const backoff = Math.min(
          BASE_INTERVAL_MS * 2 ** failuresRef.current,
          MAX_INTERVAL_MS,
        )
        const wait = failuresRef.current === 0 ? BASE_INTERVAL_MS : backoff
        timer = setTimeout(poll, wait)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [enabled, draftCode, retryNonce])

  return { connected, phase, lastSyncAt, pickCount, hasPolled, error, retry }
}
