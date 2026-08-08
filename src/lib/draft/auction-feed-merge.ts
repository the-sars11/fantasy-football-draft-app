/**
 * auction-feed-merge.ts — cross-source pick dedup for the Auctioneer integration feed.
 *
 * Pure utility module — no React, no hooks, SSR-safe.
 * Used by FF-282's use-draft-feed.ts to merge picks arriving from multiple paths
 * without emitting the same pick twice:
 *
 *   BroadcastChannel (instant) → localStorage poll (3s fallback) → file poll → Sheets poll
 *
 * Dedup key is `pickId`:
 *   - Auctioneer picks: stable internal ID produced by the reducer ('pick-1', 'pick-2', ...)
 *   - Sheets picks: synthesized from player name via playerNameToPickId()
 *
 * Usage pattern in a hook (FF-282):
 *   const mergerRef = useRef(createPickMerger())   // once per session
 *   const newPicks = mergerRef.current.merge(batch) // on every incoming batch
 *   mergerRef.current.reset()                       // on session restart / UNDO cascade
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Transport path that delivered the pick event. */
export type FeedSource = 'broadcast' | 'localstorage' | 'file' | 'sheets' | 'sleeper' | 'remote'

/**
 * Normalized pick event emitted by the merged feed.
 * Shape is a superset of addManualPick args — callers map directly.
 */
export interface NormalizedPickEvent {
  /**
   * Stable cross-source dedup key.
   * For Auctioneer picks: the internal reducer ID (e.g. 'pick-1').
   * For Sheets picks: use playerNameToPickId() to synthesize.
   */
  pickId: string
  playerName: string
  manager: string
  price: number
  position?: string
  source: FeedSource
}

/**
 * Stateful merger returned by createPickMerger().
 */
export interface PickMerger {
  /**
   * Filter `picks` down to only those with unseen pickIds.
   * Adds newly seen IDs to the internal set — call this once per incoming batch.
   */
  merge(picks: NormalizedPickEvent[]): NormalizedPickEvent[]
  /**
   * Clear the internal seen-IDs set.
   * Call when starting a new draft session or after a full UNDO back to pick 0.
   */
  reset(): void
  /**
   * Number of distinct pickIds seen so far — useful for debug / connection status.
   */
  readonly seenCount: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Synthesize a stable pickId from a player name for sources (e.g. Sheets) that
 * do not carry an Auctioneer pick ID. Lowercased + trimmed so casing differences
 * across sources do not create phantom duplicates.
 *
 * Prefixed with 'sheets:' so synthesized IDs never collide with Auctioneer IDs.
 */
export function playerNameToPickId(playerName: string): string {
  return `sheets:${playerName.toLowerCase().trim()}`
}

// ---------------------------------------------------------------------------
// Merger factory
// ---------------------------------------------------------------------------

/**
 * Create a new stateful PickMerger.
 *
 * Call once per draft session (store in a useRef in the consuming hook).
 * The merger owns a private Set<string> of seen pickIds — it never exposes
 * the set directly so callers cannot accidentally mutate it.
 */
export function createPickMerger(): PickMerger {
  const seenIds = new Set<string>()

  return {
    merge(picks: NormalizedPickEvent[]): NormalizedPickEvent[] {
      const newPicks: NormalizedPickEvent[] = []
      for (const pick of picks) {
        if (seenIds.has(pick.pickId)) continue
        seenIds.add(pick.pickId)
        newPicks.push(pick)
      }
      return newPicks
    },

    reset(): void {
      seenIds.clear()
    },

    get seenCount(): number {
      return seenIds.size
    },
  }
}
