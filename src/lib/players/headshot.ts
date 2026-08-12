/**
 * headshot.ts - FB-13. Resolve a player NAME to a real ESPN headshot URL.
 *
 * The draft app's players_cache has no espn_id (the FantasyPros populate path
 * only carries fp_player_id). The sibling auctioneer repo already resolved the
 * real 2026 pool to ESPN athlete ids; scripts/build-headshot-map.mjs bakes that
 * into src/data/headshots/name-to-espn.json (a tiny committed artifact - no
 * 77 MB image bundle ships). At runtime we map name -> espnId -> the free public
 * ESPN CDN, falling back to a local silhouette when a name isn't in the map
 * (recently-traded/renamed players absent from the auctioneer snapshot).
 *
 * normalizeName() MUST stay byte-for-byte identical to the one in
 * build-headshot-map.mjs or the keys won't match.
 *
 * Pure + deterministic → unit-tested in headshot.test.ts. No network at import.
 */

import nameToEspn from '@/data/headshots/name-to-espn.json'

const MAP = nameToEspn as Record<string, number>

/** Local fallback served from /public - never a broken-image icon. */
export const SILHOUETTE_SRC = '/player-silhouette.svg'

/** Shared name normaliser - MUST match normalizeName() in build-headshot-map.mjs. */
export function normalizeName(name: string): string {
  return String(name || '')
    .toLowerCase()
    .replace(/[.'’,]/g, '')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * The real ESPN CDN headshot URL for a player name, or null when unmapped.
 * Callers render <img src={headshotUrl(name) ?? SILHOUETTE_SRC} ... onError=…>.
 */
export function headshotUrl(name: string): string | null {
  const id = MAP[normalizeName(name)]
  if (id == null) return null
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${id}.png`
}
