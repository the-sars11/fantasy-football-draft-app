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
    remoteLastSyncAt,
    remoteError,
    remoteRetry,
  } = useDraftFeed({
    format: format ?? null,
    connectionType: aifParam,
    onNewPicks: onAuctioneerpicks,
  })

  return {
    aifEnabled,
    aifConnected,
    aifImportedCount,
    aifError,
    remoteLastSyncAt,
    remoteError,
    remoteRetry,
  }
}
