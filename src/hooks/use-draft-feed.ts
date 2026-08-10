'use client'

/**
 * useDraftFeed — unified multi-source pick feed for the live draft client.
 *
 * Generalizes useAuctioneerfeed (FF-279/FF-280) by wrapping its AuctioneerPick[]
 * output in NormalizedPickEvent[] via auction-feed-merge.ts (FF-281), providing
 * a consistent interface that absorbs additional sources without changing the
 * caller signature.
 *
 * Sources (auction mode only), all folded into ONE cross-source merger:
 *   same-device BroadcastChannel (instant) > same-device localStorage/file poll (3s)
 *   > remote KV proxy (FF-314, cross-device, 3s)
 * Same-device wins when present; the remote proxy covers the cross-device case
 * (host laptop + Joe's phone on different origins). Dedup is by the auctioneer's
 * stable pick id (auctionPickId), the single source of truth defined in
 * auction-feed-merge.ts (Finding 8). Both sources read the same auctioneer draft,
 * so a player carries the same id on both paths and is never double-added.
 *
 * Google Sheets polling is handled separately in use-draft-state.ts and is NOT
 * included here to avoid double-polling. Sheets picks are prevented from
 * double-adding at the caller level via the draftedNames set.
 *
 * Snake / Sleeper mode: hook is a no-op when format !== 'auction'.
 * Tyler's manual entry + Sheets polling path is completely unaffected.
 */

import { useRef, useCallback, useEffect } from 'react'
import {
  useAuctioneerfeed,
  type AuctioneerPick,
  type AuctioneerConnectionType,
} from './use-auctioneer-feed'
import {
  useRemoteAuctioneerFeed,
  type RemoteAuctioneerPick,
} from './use-remote-auctioneer-feed'
import {
  createPickMerger,
  auctionPickId,
  type NormalizedPickEvent,
  type FeedSource,
} from '@/lib/draft/auction-feed-merge'

// Re-export types consumed by live/client.tsx so it imports from one place.
export type { NormalizedPickEvent, AuctioneerConnectionType }

// ---------------------------------------------------------------------------
// Hook interface
// ---------------------------------------------------------------------------

interface UseDraftFeedOptions {
  /**
   * Draft format — feed is active only when 'auction'.
   * Any other value (including 'snake', null, undefined) = no-op.
   * Pass session.format directly.
   */
  format: string | null | undefined
  /**
   * Same-device Auctioneer connection path from the ?aif= URL param at setup time.
   * 'localstorage' — BroadcastChannel + localStorage poll (same device).
   * 'file'          — File System Access API poll.
   * null            — no same-device Auctioneer; the remote proxy still runs.
   */
  connectionType: AuctioneerConnectionType
  /**
   * Optional Auctioneer draft short-code for AA-FFI-2 forward-compat (FF-314).
   * Omit today — the proxy hits the single global `draft-current` key.
   */
  draftCode?: string | null
  /**
   * Fires with new, deduplicated NormalizedPickEvent[] from ALL sources
   * (same-device + remote). Must be stable (useCallback with [] deps) so the
   * feed interval never restarts.
   */
  onNewPicks?: (picks: NormalizedPickEvent[]) => void
}

export interface UseDraftFeedResult {
  /** True when any source (same-device OR remote) is actively receiving data. */
  connected: boolean
  /** Total picks imported across all sources since session start. */
  importedCount: number
  /** Timestamp of the most recent successful sync from any source, or null. */
  lastSyncAt: Date | null
  /** Human-readable error, or null when healthy. */
  error: string | null
  // --- FF-314: remote (cross-device) source, surfaced for the connection chip ---
  /** True when the remote proxy last returned a live drafting payload. */
  remoteConnected: boolean
  /** Timestamp of the last successful REMOTE poll that returned live data. */
  remoteLastSyncAt: Date | null
  /** True once the remote proxy has been polled at least once. */
  remoteHasPolled: boolean
  /** Error from the last failed remote poll, or null. */
  remoteError: string | null
  /** Force an immediate remote poll (wire to the chip's Retry). */
  remoteRetry: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function connectionTypeToSource(ct: AuctioneerConnectionType): FeedSource {
  return ct === 'file' ? 'file' : 'localstorage'
}

function toNormalizedEvent(pick: AuctioneerPick, source: FeedSource): NormalizedPickEvent {
  return {
    // Dedup by the auctioneer's stable pick id (single source of truth). Both the
    // same-device and remote paths read the same auctioneer draft, so a player
    // carries the same id on both and is never double-added across sources.
    pickId: auctionPickId(pick.sourceId),
    playerName: pick.player_name,
    manager: pick.manager,
    price: pick.price,
    position: pick.position,
    source,
  }
}

function remoteToNormalizedEvent(pick: RemoteAuctioneerPick): NormalizedPickEvent {
  return {
    // Same auctioneer id space as the same-device path (pick.remoteId === pick.id
    // in the auctioneer), so the merger dedups a player across both sources.
    pickId: auctionPickId(pick.remoteId),
    playerName: pick.player_name,
    manager: pick.manager,
    price: pick.price,
    position: pick.position,
    source: 'remote',
  }
}

function mostRecent(a: Date | null, b: Date | null): Date | null {
  if (!a) return b
  if (!b) return a
  return a.getTime() >= b.getTime() ? a : b
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDraftFeed({
  format,
  connectionType,
  draftCode,
  onNewPicks,
}: UseDraftFeedOptions): UseDraftFeedResult {
  const isAuction = format === 'auction'
  const localEnabled = isAuction && !!connectionType
  // Remote is auto-attempted for every auction session — it silently no-ops when
  // the proxy returns null, so it costs nothing until an auctioneer is actually up.
  const remoteEnabled = isAuction

  // One merger per mount — deduplicates pickIds across ALL source paths
  // (same-device BroadcastChannel + poll + remote proxy).
  const mergerRef = useRef(createPickMerger())

  // Stable emit path — merge, then forward only the never-seen events.
  // Latest-ref pattern (synced in an effect, never during render) keeps
  // emitThroughMerger stable while always calling the current onNewPicks.
  const onNewPicksRef = useRef(onNewPicks)
  useEffect(() => {
    onNewPicksRef.current = onNewPicks
  }, [onNewPicks])
  const emitThroughMerger = useCallback((events: NormalizedPickEvent[]) => {
    const fresh = mergerRef.current.merge(events)
    if (fresh.length > 0) onNewPicksRef.current?.(fresh)
  }, [])

  const handleAuctioneerPicks = useCallback(
    (picks: AuctioneerPick[]) => {
      const source = connectionTypeToSource(connectionType)
      emitThroughMerger(picks.map((p) => toNormalizedEvent(p, source)))
    },
    [emitThroughMerger, connectionType],
  )

  const handleRemotePicks = useCallback(
    (picks: RemoteAuctioneerPick[]) => {
      emitThroughMerger(picks.map(remoteToNormalizedEvent))
    },
    [emitThroughMerger],
  )

  // Same-device path — owns BroadcastChannel, localStorage poll, and file poll.
  const local = useAuctioneerfeed({
    enabled: localEnabled,
    connectionType: localEnabled ? connectionType : null,
    onNewPicks: localEnabled ? handleAuctioneerPicks : undefined,
  })

  // Remote (cross-device) path — polls this repo's server proxy (FF-314).
  const remote = useRemoteAuctioneerFeed({
    enabled: remoteEnabled,
    draftCode,
    onNewPicks: remoteEnabled ? handleRemotePicks : undefined,
  })

  return {
    connected: local.connected || remote.connected,
    importedCount: local.importedCount + remote.pickCount,
    lastSyncAt: mostRecent(local.lastSyncAt, remote.lastSyncAt),
    error: local.error ?? remote.error,
    remoteConnected: remote.connected,
    remoteLastSyncAt: remote.lastSyncAt,
    remoteHasPolled: remote.hasPolled,
    remoteError: remote.error,
    remoteRetry: remote.retry,
  }
}
