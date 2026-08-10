/**
 * auction-feed-merge.ts - cross-source pick dedup for the Auctioneer integration feed.
 *
 * Pure utility module: no React, no hooks, SSR-safe.
 * Used by use-draft-feed.ts to merge Auctioneer picks arriving from multiple
 * transport paths without emitting the same pick twice:
 *
 *   same-device BroadcastChannel (instant) > same-device localStorage/file poll (3s)
 *   > remote KV proxy (cross-device, 3s)
 *
 * SINGLE SOURCE OF TRUTH FOR DEDUP (Finding 8, 2026-08-09):
 * The one dedup key is `pickId`, and it is always the source-assigned stable
 * pick id, namespaced so ids from different producers never collide:
 *   - Auctioneer picks (same-device AND remote): 'auction:<auctioneerPickId>',
 *     built via auctionPickId(). Both sources read the SAME auctioneer draft, so
 *     a given player carries the same auctioneer id on both paths - keying by that
 *     id is what deduplicates a player across sources.
 *   - Sleeper picks: 'sleeper:<pick_no>' (assigned in use-sleeper-draft-feed.ts).
 *   - playerNameToPickId() is the FALLBACK ONLY, for a source that carries no
 *     stable id of its own. It is not used by any current caller.
 *
 * What this merger does NOT handle: Google Sheets picks. Those are polled in
 * use-draft-state.ts, and are kept from double-adding at the caller level via the
 * name-based draftedNames set (see use-draft-feeds.ts), not through this merger.
 * The historical 'sheets' FeedSource value is retained only for back-compat of the
 * union type.
 *
 * Usage pattern in a hook:
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
   * Stable cross-source dedup key - the SINGLE source of truth for dedup.
   * Always a source-assigned stable id, namespaced by producer:
   *   - Auctioneer: auctionPickId(auctioneerPickId) => 'auction:<id>'
   *   - Sleeper:    'sleeper:<pick_no>'
   *   - Fallback:   playerNameToPickId(name) => 'name:<lowercased-trimmed>'
   *                 (only for a source with no stable id; unused today)
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
 * Namespace an Auctioneer pick id into the merger's dedup key space.
 * Both auction sources (same-device + remote KV proxy) read the same auctioneer
 * draft, so the same player carries the same auctioneer id on both paths - this
 * is what makes a player dedup across sources.
 *
 * Prefixed with 'auction:' so ids never collide with Sleeper ('sleeper:') or the
 * name-based fallback ('name:').
 */
export function auctionPickId(auctioneerPickId: string): string {
  return `auction:${auctioneerPickId}`
}

/**
 * FALLBACK ONLY. Synthesize a dedup key from a player name for a source that
 * carries no stable id of its own. Lowercased + trimmed so casing/whitespace
 * differences do not create phantom duplicates.
 *
 * Prefixed with 'name:' so synthesized keys never collide with real source ids
 * ('auction:' / 'sleeper:'). No current caller uses this - every live source has
 * a stable id. Retained for a future id-less source and covered by tests.
 */
export function playerNameToPickId(playerName: string): string {
  return `name:${playerName.toLowerCase().trim()}`
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
