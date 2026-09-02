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
import { cacheToPlayers } from '@/lib/players/convert'
import { saveSessionCache, loadSessionCache } from '@/lib/draft/offline-cache'

// UX-7.3: Seeded MID-draft board for sim demo mode. Boots the room into a
// realistic Nasties auction ~28 picks deep (2026 values from /api/players) so
// the live screen shows real budgets, open needs, and studs-with-pockets on the
// board instead of an empty (or, worse, a stale completed-draft) shell. The
// elite tier is absorbed by the 11 other managers; the user (Rasar, manager 0)
// is left value-heavy at RB with WR/FLEX/DEF still open and ~$127 to spend, so
// a marquee WR/TE floats to the top of the board on the block. player_id holds
// the player NAME (our schema); names/prices must match the real player pool or
// they will not register as drafted. See use-draft-state.ts replay path.
function DEMO_PICKS(): DraftSession['picks'] {
  // [player name, manager, price, position] -- nomination order (studs first).
  // Position is carried on every pick so the user's roster pips resolve from the
  // fixture itself; a live auctioneer feed omits it and the room resolves it by
  // name instead. See use-draft-state.ts replay + armor-live-room.tsx posByName.
  const rows: Array<[string, string, number, string]> = [
    ['Jahmyr Gibbs', 'Reggie', 82, 'RB'],
    ['Christian McCaffrey', 'Robbie', 76, 'RB'],
    ['Bijan Robinson', 'Hendrickson', 70, 'RB'],
    ['Puka Nacua', 'Moonshine', 80, 'WR'],
    ['Jaxon Smith-Njigba', 'Cross', 70, 'WR'],
    ['Amon-Ra St. Brown', 'Robbie', 66, 'WR'],
    ["Ja'Marr Chase", 'Simmons', 64, 'WR'],
    ['Justin Jefferson', 'Murphy', 52, 'WR'],
    ['Josh Allen', 'Bruce', 34, 'QB'],
    ['Saquon Barkley', 'Bruce', 48, 'RB'],
    ['Jonathan Taylor', 'Simmons', 52, 'RB'],
    ['Ashton Jeanty', 'Murphy', 50, 'RB'],
    ['Brock Bowers', 'Hendrickson', 48, 'TE'],
    ['CeeDee Lamb', 'Reggie', 46, 'WR'],
    ['Lamar Jackson', 'Garrett', 33, 'QB'],
    ['Jeremiyah Love', 'Garrett', 40, 'RB'],
    ['Drake Maye', 'Kevin', 30, 'QB'],
    ['Derrick Henry', 'Kevin', 30, 'RB'],
    ['Jalen Hurts', 'Cross', 28, 'QB'],
    ["De'Von Achane", 'Moonshine', 36, 'RB'],
    ['Jayden Daniels', 'Moe', 22, 'QB'],
    ['George Kittle', 'Moe', 20, 'TE'],
    ['Drake London', 'Bruce', 38, 'WR'],
    // --- Rasar (manager 0, the user): value-heavy start, ~$127 left, 5/13 ---
    ['James Cook III', 'Rasar', 26, 'RB'],
    ['Chase Brown', 'Rasar', 22, 'RB'],
    ['Bo Nix', 'Rasar', 6, 'QB'],
    ['Tyler Warren', 'Rasar', 7, 'TE'],
    ['Rashee Rice', 'Rasar', 12, 'WR'],
  ]
  return rows.map(([name, manager, price, position], i) => ({
    player_id: name,
    manager,
    price,
    position,
    pick_number: i + 1,
  }))
}

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
  picks: DEMO_PICKS(),
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
  // Nasties locked shape: QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1 (14 total,
  // 13 draftable). Must match the real league so the sim's Roster count reads
  // /13, not the generic ESPN 2RB/2WR/1FLEX/bench6 default. See
  // FANTASY_FOOTBALL_MASTER.md + client.tsx DEFAULT_ROSTER.
  roster_slots: { qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1 },
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
          // F1 fix: map raw CachedPlayer rows to the app Player shape (the
          // canonical read path every prep screen uses). Without this the live
          // room held raw DB rows with no consensusTier/consensusAuctionValue,
          // so scarcity tier counts were all 0 and urgency never surfaced.
          .then(data => { if (data.players) setPlayers(cacheToPlayers(data.players)) })
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
        const [sessionRes, playersRes] = await Promise.all([
          fetch(`/api/draft/sessions/${id}`),
          fetch('/api/players'),
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
          // F1 fix: canonical CachedPlayer -> Player mapping (see note above).
          setPlayers(cacheToPlayers(playersData.players))
        }

        // Strategies require leagueId -- GET /api/strategies 400s ("leagueId is
        // required") without it, so this could NOT ride in the Promise.all above
        // (the id only exists once the session resolves). Fetching it paramless
        // silently killed the room's strategy-awareness: the active plan never
        // loaded, so the advisor fell back to "No strategy set". The route
        // filters by league server-side, so no client-side league filter is
        // needed. Guarded so a transient strategy failure never blanks an
        // already-loaded session.
        const leagueId: string | undefined = sessionData.session?.league_id
        if (leagueId) {
          try {
            const stratRes = await fetch(`/api/strategies?leagueId=${leagueId}`)
            const stratData = await stratRes.json()
            if (stratRes.ok && stratData.strategies) {
              setAllStrategies(stratData.strategies)
              const active = stratData.strategies.find((s: DbStrategy) => s.is_active)
              if (active) setStrategy(active)
            }
          } catch {
            // Strategies are non-critical for rendering the room; ignore.
          }
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
            // F1 fix: canonical CachedPlayer -> Player mapping (see note above).
            .then(data => { if (data.players) setPlayers(cacheToPlayers(data.players)) })
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
