/**
 * Draft Recommendations — Barrel (FF-266)
 *
 * Re-exports format-specific recommendation modules.
 * Keeps legacy imports (clearRecommendationCache, LLMRecommendation, fetchRecommendation)
 * working without changes to call sites.
 */

export {
  fetchAuctionRecommendation,
  clearAuctionRecommendationCache,
  type LLMAuctionTarget,
  type LLMAuctionRecommendation,
} from './recommend-auction'

export {
  fetchSnakeRecommendation,
  clearSnakeRecommendationCache,
  type LLMSnakeTarget,
  type LLMSnakeRecommendation,
} from './recommend-snake'

// --- Legacy aliases (client.tsx imports clearRecommendationCache) ---

import { clearAuctionRecommendationCache } from './recommend-auction'
import { clearSnakeRecommendationCache } from './recommend-snake'

/** Clears both auction and snake recommendation caches. */
export function clearRecommendationCache() {
  clearAuctionRecommendationCache()
  clearSnakeRecommendationCache()
}
