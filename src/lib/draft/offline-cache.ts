/**
 * Offline draft cache (R11a)
 *
 * A mid-draft network drop must not lose Joe's picks. This module is the pure,
 * $0, localStorage-backed cache layer that two hooks write through:
 *
 * - `use-live-draft-data.ts` caches the last successfully-fetched
 *   session+league so a network failure on reload can fall back to it instead
 *   of showing a dead error screen.
 * - `use-draft-state.ts` caches the full live `DraftState` (picks, budgets,
 *   roster counts) on every change, and marks it `synced: false` until the
 *   Supabase PATCH confirms it landed. On reload, `resolveInitialDraftState`
 *   decides whether to trust the cache or the server-replayed state.
 *
 * No secrets live here — a draft session id (already visible in the page URL)
 * and non-sensitive fantasy-draft picks. All reads/writes are guarded so a
 * disabled/full/absent localStorage (private browsing, SSR, quota exceeded)
 * degrades to "no cache" rather than throwing.
 */

import type { DraftSession, League } from '@/lib/supabase/database.types'
import type { DraftState } from './state'

const SESSION_KEY_PREFIX = 'ffi-draft-session-cache:'
const STATE_KEY_PREFIX = 'ffi-draft-state-cache:'

export interface SessionCacheEntry {
  session: DraftSession
  league: League | null
  savedAt: string
}

export interface DraftStateCacheEntry {
  state: DraftState
  savedAt: string
  /** false = written locally but not yet confirmed persisted to Supabase. */
  synced: boolean
}

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function safeGet(key: string): string | null {
  if (!isBrowser()) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Quota exceeded / private-browsing storage disabled -- degrade silently.
    // A missed write just means the next successful write catches up.
  }
}

function safeRemove(key: string): void {
  if (!isBrowser()) return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

// --- Session + league cache (used by use-live-draft-data.ts) ---------------

export function saveSessionCache(sessionId: string, session: DraftSession, league: League | null): void {
  const entry: SessionCacheEntry = { session, league, savedAt: new Date().toISOString() }
  safeSet(SESSION_KEY_PREFIX + sessionId, JSON.stringify(entry))
}

export function loadSessionCache(sessionId: string): SessionCacheEntry | null {
  const raw = safeGet(SESSION_KEY_PREFIX + sessionId)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as SessionCacheEntry
    if (!parsed || typeof parsed !== 'object' || !parsed.session || parsed.session.id !== sessionId) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

// --- Draft state cache (used by use-draft-state.ts) -------------------------

export function saveDraftStateCache(sessionId: string, state: DraftState, synced: boolean): void {
  const entry: DraftStateCacheEntry = { state, savedAt: new Date().toISOString(), synced }
  safeSet(STATE_KEY_PREFIX + sessionId, JSON.stringify(entry))
}

export function loadDraftStateCache(sessionId: string): DraftStateCacheEntry | null {
  const raw = safeGet(STATE_KEY_PREFIX + sessionId)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DraftStateCacheEntry
    if (!parsed || typeof parsed !== 'object' || !parsed.state || !Array.isArray(parsed.state.picks)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearDraftCache(sessionId: string): void {
  safeRemove(SESSION_KEY_PREFIX + sessionId)
  safeRemove(STATE_KEY_PREFIX + sessionId)
}

// --- Resolution policy --------------------------------------------------

/**
 * Decide whether a freshly-initialized/replayed DraftState or a cached one
 * should seed the live session on load.
 *
 * - No cache -> server replay wins (nothing to recover).
 * - We're currently offline (the session itself came from cache, so the
 *   server couldn't be reached at all) -> the local cache is the only source
 *   that can possibly reflect picks made since the last successful sync, so
 *   it wins outright.
 * - We're online with a fresh server session -> whichever has strictly more
 *   picks wins. This recovers local picks that silently failed to PATCH
 *   (server hiccup) while still letting the server win when it's ahead
 *   (e.g. a pick was removed, or another device already synced further).
 *
 * This is a simple pick-count heuristic, not a full merge/CRDT -- adequate
 * for a single-user personal tool where the server is the eventual system of
 * record whenever it's reachable.
 */
export function resolveInitialDraftState(
  replayed: DraftState,
  cached: DraftStateCacheEntry | null,
  offline: boolean,
): { state: DraftState; source: 'server' | 'cache' } {
  if (!cached) return { state: replayed, source: 'server' }
  if (offline) return { state: cached.state, source: 'cache' }
  return cached.state.picks.length > replayed.picks.length
    ? { state: cached.state, source: 'cache' }
    : { state: replayed, source: 'server' }
}
