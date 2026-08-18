'use client'

/**
 * useLiveDraftData (extracted from live/client.tsx, finding 9)
 *
 * Owns the initial data load for the live draft screen: session, league,
 * players, and the league's strategies (with the active one selected). In sim
 * mode (?sim=1 with no ?session=) it injects mock session + league fixtures but
 * still fetches real players. Exposes the strategy setters because the live
 * strategy-swap handler mutates them. Behavior identical to the original inline
 * implementation.
 */

import { useState, useEffect } from 'react'
import type { DraftSession, League } from '@/lib/supabase/database.types'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'
import type { Player } from '@/lib/players/types'
import { saveSessionCache, loadSessionCache } from '@/lib/draft/offline-cache'

// UX-7.3: Mock session + league for sim demo mode (?sim=1 with no ?session=)
// Persistence calls to /api/draft/sessions/demo will 404 and fail silently.
const DEMO_SESSION: DraftSession = {
  id: 'demo',
  user_id: 'demo-user',
  league_id: 'demo-league',
  sheet_url: null,
  format: 'auction',
  status: 'live',
  managers: [
    { name: 'Rasar', budget: 200 },
    { name: 'Bruce', budget: 200 },
    { name: 'Garrett', budget: 200 },
    { name: 'Kevin', budget: 200 },
    { name: 'Cross', budget: 200 },
    { name: 'Moonshine', budget: 200 },
    { name: 'Reggie', budget: 200 },
    { name: 'Moe', budget: 200 },
    { name: 'Robbie', budget: 200 },
    { name: 'Hendrickson', budget: 200 },
    { name: 'Simmons', budget: 200 },
    { name: 'Murphy', budget: 200 },
  ],
  picks: [],
  keepers: [],
  recommendations: [],
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
}

const DEMO_LEAGUE: League = {
  id: 'demo-league',
  user_id: 'demo-user',
  name: 'The Nasties (Demo)',
  platform: 'espn',
  format: 'auction',
  team_count: 12,
  budget: 200,
  scoring_format: 'ppr',
  scoring_settings: null,
  roster_slots: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 0, dst: 1, bench: 6, ir: 0 },
  keeper_enabled: false,
  keeper_settings: null,
  is_active: true,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
}

export function useLiveDraftData({
  sessionId,
  simEnabled,
}: {
  sessionId: string | null
  simEnabled: boolean
}) {
  const [session, setSession] = useState<DraftSession | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [strategy, setStrategy] = useState<DbStrategy | null>(null)
  const [allStrategies, setAllStrategies] = useState<DbStrategy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // R11a: true when session/league came from the local offline cache because
  // the network fetch could not reach the server at all (not a real 404/500).
  const [usingCachedData, setUsingCachedData] = useState(false)

  // Load session + league + players + active strategy
  useEffect(() => {
    if (!sessionId) {
      if (simEnabled) {
        // UX-7.3: Demo mode, inject mock session + league, still fetch real players
        setSession(DEMO_SESSION)
        setLeague(DEMO_LEAGUE)
        fetch('/api/players')
          .then(r => r.json())
          .then(data => { if (data.players) setPlayers(data.players) })
          .catch(() => {})
          .finally(() => setLoading(false))
      } else {
        setError('No session ID in URL. Go back to Draft Setup.')
        setLoading(false)
      }
      return
    }

    // Narrow once outside the closure -- TS can't see the `if (!sessionId) return`
    // guard above from inside `load`, and the offline-cache calls need a `string`.
    const id: string = sessionId

    async function load() {
      try {
        const [sessionRes, playersRes, stratRes] = await Promise.all([
          fetch(`/api/draft/sessions/${id}`),
          fetch('/api/players'),
          fetch('/api/strategies'),
        ])

        const sessionData = await sessionRes.json()
        if (!sessionRes.ok) throw new Error(sessionData.error || 'Failed to load session')

        setSession(sessionData.session)
        setLeague(sessionData.league)
        setUsingCachedData(false)
        // R11a: cache the last known-good session+league so a later network
        // drop can fall back to it instead of a dead error screen.
        saveSessionCache(id, sessionData.session, sessionData.league ?? null)

        const playersData = await playersRes.json()
        if (playersRes.ok && playersData.players) {
          setPlayers(playersData.players)
        }

        const stratData = await stratRes.json()
        if (stratRes.ok && stratData.strategies) {
          const leagueStrats = stratData.strategies.filter(
            (s: DbStrategy) => s.league_id === sessionData.session.league_id
          )
          setAllStrategies(leagueStrats)
          const active = leagueStrats.find((s: DbStrategy) => s.is_active)
          if (active) setStrategy(active)
        }
      } catch (err) {
        // R11a: a network-level failure (offline, server unreachable -- `fetch`
        // itself throws a TypeError) falls back to the last cached session
        // instead of the dead error screen. An HTTP-level error (404 session
        // not found, 500) means we DID reach the server and it told us
        // something's genuinely wrong -- that still surfaces as a real error,
        // never masked by a stale cache.
        const isNetworkFailure = err instanceof TypeError
        const cached = isNetworkFailure ? loadSessionCache(id) : null
        if (cached) {
          setSession(cached.session)
          setLeague(cached.league)
          setUsingCachedData(true)
          setError(null)
          // Players are secondary -- best-effort, non-blocking, no cache needed
          // since the player pool doesn't change mid-draft.
          fetch('/api/players')
            .then(r => r.json())
            .then(data => { if (data.players) setPlayers(data.players) })
            .catch(() => {})
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load draft data')
        }
      } finally {
        setLoading(false)
      }
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  return {
    session,
    league,
    players,
    strategy,
    setStrategy,
    allStrategies,
    setAllStrategies,
    loading,
    error,
    usingCachedData,
  }
}
