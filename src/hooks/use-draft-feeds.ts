'use client'

/**
 * useDraftFeeds (extracted from live/client.tsx, finding 9)
 *
 * Wires the auctioneer live pick feed for the draft room:
 *   - Auctioneer feed (FF-279/FF-282): same-device (localstorage/file) and the
 *     automatic cross-device remote proxy, active only in auction format.
 *
 * Sleeper feed removed 2026-08-09 (scope freeze to auction-only).
 *
 * The feed routes pick handlers through a ref that is reassigned every render,
 * so the callback always sees the latest draftedNames + addManualPick without
 * restarting the feed interval.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  useDraftFeed,
  type AuctioneerConnectionType,
  type NormalizedPickEvent,
} from '@/hooks/use-draft-feed'
import type { DraftPick } from '@/lib/draft/state'

export function useDraftFeeds({
  format,
  aifParam,
  draftedNames,
  addManualPick,
}: {
  format: string | null | undefined
  aifParam: AuctioneerConnectionType
  draftedNames: Set<string>
  addManualPick: (pick: Omit<DraftPick, 'pick_number'>) => void
}) {
  // FF-279: Update Auctioneer handler ref every render so it always sees the
  // latest draftedNames + addManualPick without rethrashing hook deps.
  const handleAuctioneerPicksRef = useRef<((picks: NormalizedPickEvent[]) => void) | null>(null)
  // Intentional every-render ref assignment.
  // eslint-disable-next-line react-hooks/refs
  handleAuctioneerPicksRef.current = (picks: NormalizedPickEvent[]) => {
    for (const pick of picks) {
      // draftedNames keys are lowercase player names (see getDraftedPlayerNames)
      if (!draftedNames.has(pick.playerName.toLowerCase())) {
        addManualPick({
          player_name: pick.playerName,
          manager: pick.manager,
          price: pick.price,
          position: pick.position,
        })
      }
    }
  }

  // FF-282: Unified draft feed, gating is internal (format + connectionType).
  // onAuctioneerpicks is stable (empty deps), routes through ref so it always
  // sees latest draftedNames+addManualPick without restarting the feed interval.
  const aifEnabled = !!aifParam && format === 'auction'
  const onAuctioneerpicks = useCallback(
    (picks: NormalizedPickEvent[]) => handleAuctioneerPicksRef.current?.(picks),
    [], // stable, routes through ref
  )
  const {
    connected: aifConnected,
    importedCount: aifImportedCount,
    error: aifError,
    // FF-314: cross-device remote source, surfaced for the connection chip.
    remoteConnected,
    remoteLastSyncAt,
    remoteError,
    remoteRetry,
    remoteHasPolled,
    // FF-315: full snapshot for offline reconciliation.
    remoteLastSnapshot,
  } = useDraftFeed({
    format: format ?? null,
    connectionType: aifParam,
    onNewPicks: onAuctioneerpicks,
  })

  // FF-315: Detect offline/online transitions for offline resync.
  // `wasConnected` records whether the remote auctioneer was ever connected this
  // session. If it was never connected (manual-only mode) there is nothing to
  // reconcile against and provisional tagging is skipped.
  //
  // BUG-R13-01 fix: edge detection lives in an effect, not the render body. The
  // previous version mutated and read refs during render, so a discarded React 19
  // concurrent/StrictMode render could eat the one-shot reconnect signal and the
  // offline resync would silently never fire. `reconnectNonce` increments once per
  // rising edge of the remote connection; the consumer reconciles once per nonce.
  const [wasConnected, setWasConnected] = useState(false)
  const [reconnectNonce, setReconnectNonce] = useState(0)
  const prevRemoteConnectedRef = useRef(false)

  useEffect(() => {
    const prev = prevRemoteConnectedRef.current
    prevRemoteConnectedRef.current = remoteConnected
    if (remoteConnected && !prev) {
      // Rising edge of the remote connection (first connect included): fire the
      // one-shot reconcile signal and mark that we have been connected.
      setReconnectNonce(n => n + 1)
      if (!wasConnected) setWasConnected(true)
    }
  }, [remoteConnected, wasConnected])

  const isOfflineFromAuctioneer = wasConnected && !remoteConnected

  return {
    aifEnabled,
    aifConnected,
    aifImportedCount,
    aifError,
    remoteConnected,
    remoteLastSyncAt,
    remoteError,
    remoteRetry,
    remoteHasPolled,
    // FF-315 reconnect / offline-mode signals + snapshot for reconciliation.
    isOfflineFromAuctioneer,
    /**
     * BUG-R13-01: monotonic counter that increments once on each rising edge of
     * the remote connection. The consumer reconciles once per nonce (deduped by a
     * ref), which survives React 19 concurrent/StrictMode re-renders where the old
     * "true for one render" boolean could be dropped.
     */
    reconnectNonce,
    /**
     * FF-315: Full normalized pick list from the last successful remote poll.
     * Pass to reconcileWithAuctioneer once per new reconnectNonce.
     * RemoteAuctioneerPick is structurally a superset of AuctioneerPickSnapshot,
     * so the caller can pass it directly to reconcileWithAuctioneer.
     */
    remoteLastSnapshot,
  }
}
