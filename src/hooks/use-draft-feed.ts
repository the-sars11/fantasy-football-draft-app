'use client'

/**
 * useDraftFeed — unified multi-source pick feed for the live draft client.
 *
 * Generalizes useAuctioneerfeed (FF-279/FF-280) by wrapping its AuctioneerPick[]
 * output in NormalizedPickEvent[] via auction-feed-merge.ts (FF-281), providing
 * a consistent interface that is ready to absorb additional sources (e.g. Sheets)
 * in future sprints without changing the caller signature.
 *
 * Source priority (auction mode only):
 *   BroadcastChannel (instant) > localStorage poll (3 s fallback) > file poll
 *
 * Google Sheets polling is handled separately in use-draft-state.ts and is NOT
 * included here to avoid double-polling. Sheets picks are prevented from
 * double-adding at the caller level via the draftedNames set.
 *
 * Snake / Sleeper mode: hook is a no-op when format !== 'auction'.
 * Tyler's manual entry + Sheets polling path is completely unaffected.
 */

import { useRef, useCallback } from 'react'
import {
  useAuctioneerfeed,
  type AuctioneerPick,
  type AuctioneerConnectionType,
} from './use-auctioneer-feed'
import {
  createPickMerger,
  playerNameToPickId,
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
   * Auctioneer connection path from the ?aif= URL param at setup time.
   * 'localstorage' — BroadcastChannel + localStorage poll (same device).
   * 'file'          — File System Access API poll.
   * null            — Auctioneer not configured; feed is a no-op.
   */
  connectionType: AuctioneerConnectionType
  /**
   * Fires with new, deduplicated NormalizedPickEvent[] from all Auctioneer paths.
   * Must be stable (useCallback with [] deps) so the feed interval never restarts.
   */
  onNewPicks?: (picks: NormalizedPickEvent[]) => void
}

export interface UseDraftFeedResult {
  /** True when Auctioneer data is actively being received. */
  connected: boolean
  /** Total Auctioneer picks imported since session start. */
  importedCount: number
  /** Timestamp of the last successful sync, or null before first sync. */
  lastSyncAt: Date | null
  /** Human-readable error, or null when healthy. */
  error: string | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function connectionTypeToSource(ct: AuctioneerConnectionType): FeedSource {
  return ct === 'file' ? 'file' : 'localstorage'
}

function toNormalizedEvent(pick: AuctioneerPick, source: FeedSource): NormalizedPickEvent {
  return {
    // Synthesize pickId from player name — unique per player within a draft session.
    // When Sheets is added as a source, playerNameToPickId() ensures cross-source
    // dedup: a player drafted in Auctioneer won't be double-added from Sheets.
    pickId: playerNameToPickId(pick.player_name),
    playerName: pick.player_name,
    manager: pick.manager,
    price: pick.price,
    position: pick.position,
    source,
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDraftFeed({
  format,
  connectionType,
  onNewPicks,
}: UseDraftFeedOptions): UseDraftFeedResult {
  const enabled = format === 'auction' && !!connectionType

  // One merger per mount — deduplicates pickIds across BroadcastChannel + poll paths.
  // Sheets picks can be routed through this merger in a future sprint without
  // changing the caller interface.
  const mergerRef = useRef(createPickMerger())

  const handleAuctioneerPicks = useCallback(
    (picks: AuctioneerPick[]) => {
      const source = connectionTypeToSource(connectionType)
      const events = picks.map(p => toNormalizedEvent(p, source))
      const newEvents = mergerRef.current.merge(events)
      if (newEvents.length > 0) onNewPicks?.(newEvents)
    },
    [onNewPicks, connectionType],
  )

  // Delegate entirely to the existing hook — it owns BroadcastChannel,
  // localStorage poll, and file poll logic.
  return useAuctioneerfeed({
    enabled,
    connectionType: enabled ? connectionType : null,
    onNewPicks: enabled ? handleAuctioneerPicks : undefined,
  })
}
