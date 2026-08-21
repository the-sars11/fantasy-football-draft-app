/**
 * dataset-enrichment.ts - tiny pure helpers to join dataset EnrichedPlayer rows
 * onto the existing players_cache-driven UI by id.
 *
 * The research dataset (W0 seam) and the live /api/players pull are two
 * separate reads of the same underlying player pool, so they share ids
 * (dataset ids come straight from players_cache). This module is the one
 * place that keys a dataset into a lookup map and reads it back, so
 * /prep/players and /prep/board can additively surface dataset-only fields
 * (land odds, durability-adjusted room price, value band) without ever
 * requiring the dataset to be present. Absent dataset or absent match both
 * resolve to undefined - callers render nothing extra in that case.
 */

import type { EnrichedPlayer } from './dataset-types'

/** Build a lookup map of dataset players keyed by their id (== players_cache id). */
export function buildEnrichmentMap(players: EnrichedPlayer[]): Map<string, EnrichedPlayer> {
  const map = new Map<string, EnrichedPlayer>()
  for (const p of players) {
    map.set(p.id, p)
  }
  return map
}

/** Look up one player's dataset enrichment by id. Undefined when unmatched. */
export function pickEnrichment(
  map: Map<string, EnrichedPlayer>,
  playerId: string,
): EnrichedPlayer | undefined {
  return map.get(playerId)
}
