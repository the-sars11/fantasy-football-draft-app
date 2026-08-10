/**
 * Draft Recommendations — Barrel (FF-266)
 *
 * Re-exports auction recommendation module.
 * Snake/keeper recommendation removed 2026-08-09 (scope freeze to auction-only).
 */

export {
  fetchAuctionRecommendation,
  clearAuctionRecommendationCache,
  type LLMAuctionTarget,
  type LLMAuctionRecommendation,
} from './recommend-auction'

// --- Legacy alias (client.tsx imports clearRecommendationCache) ---

import { clearAuctionRecommendationCache } from './recommend-auction'

/** Clears auction recommendation cache. */
export function clearRecommendationCache() {
  clearAuctionRecommendationCache()
}
