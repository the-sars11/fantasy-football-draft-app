/**
 * pull-signal.ts - cross-route "a fresh Player Pull just landed" signal.
 *
 * The Player Pull on /prep refreshes the cached player pool. Strategy
 * proposals on /prep/strategies are DERIVED from that pool, but they fetch
 * once and cache (fetchedRef), so a later pull would not re-flow them.
 *
 * The pull writes a per-league timestamp here on completion; the strategies
 * screen reads it and re-flows when the stamp is newer than the one its
 * proposals were built from. localStorage (not the `storage` event) because
 * pull + strategies live in the SAME tab under SPA navigation, so the reader
 * polls on mount + focus rather than listening for a cross-tab event.
 *
 * Degrades to a no-op when localStorage is unavailable (SSR, private mode,
 * quota) - the screen simply falls back to its normal once-on-mount fetch.
 */

const KEY_PREFIX = 'ffi:last-pull:'

/** Stamp a completed Player Pull for `leagueId`. Safe on the server (no-op). */
export function markPullComplete(leagueId: string, now: number = Date.now()): void {
  if (typeof window === 'undefined' || !leagueId) return
  try {
    window.localStorage.setItem(`${KEY_PREFIX}${leagueId}`, String(now))
  } catch {
    // localStorage blocked/full - signal degrades to a no-op.
  }
}

/** Read the last pull stamp for `leagueId`. Returns 0 when none/unavailable. */
export function readPullStamp(leagueId: string): number {
  if (typeof window === 'undefined' || !leagueId) return 0
  try {
    const raw = window.localStorage.getItem(`${KEY_PREFIX}${leagueId}`)
    if (!raw) return 0
    const n = Number(raw)
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}
