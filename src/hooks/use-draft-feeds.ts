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

import { useCallback, useRef } from 'react'
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

  // FF-315: Detect offline→online transition for offline resync.
  // `wasConnectedRef` tracks whether the remote auctioneer was ever connected
  // this session — if it was never connected (manual-only mode) there is nothing
  // to reconcile against and we skip provisional tagging entirely.
  const wasConnectedRef = useRef(false)
  const prevRemoteConnectedRef = useRef(false)

  // Update refs in render path (not in effect) so they are always current.
  const prevConnected = prevRemoteConnectedRef.current
  prevRemoteConnectedRef.current = remoteConnected
  if (remoteConnected) wasConnectedRef.current = true

  const isOfflineFromAuctioneer = wasConnectedRef.current && !remoteConnected
  const justReconnected = wasConnectedRef.current && !prevConnected && remoteConnected

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
    justReconnected,
    /**
     * FF-315: Full normalized pick list from the last successful remote poll.
     * Pass to reconcileWithAuctioneer when justReconnected is true.
     * RemoteAuctioneerPick is structurally a superset of AuctioneerPickSnapshot,
     * so the caller can pass it directly to reconcileWithAuctioneer.
     */
    remoteLastSnapshot,
  }
}
