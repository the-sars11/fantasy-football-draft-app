'use client'

/**
 * SimulateClient (R10b data + D5 SHIELD visual pass)
 *
 * Runs the R10a Monte-Carlo auction engine on the real Nasties pool, biased
 * toward Joe's graded targets/avoids (DEC-1), then grades the outcome:
 *   - a projected win-loss record vs the league,
 *   - the top-5 most likely roster shapes (modal, clustered by stud core),
 *   - the players you land most across the sims,
 *   - and saved runs you can reload and compare.
 *
 * Entirely client-side compute; only saved runs hit the server (/api/sim-runs).
 * Data wiring is unchanged from R10b; D5 swaps the plain-FFI rendering for the
 * SHIELD-look presentational components in sim-results-cards.tsx.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Play, Loader2, AlertCircle, Save } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FFICard, FFIButton } from '@/components/ui/ffi-primitives'
import {
  SimRecordHero,
  SimWinningTeamPlayers,
  SimRosterCarousel,
  SimLandedTable,
  SimNarrative,
  SimCompareRows,
  SimSavedRunsList,
} from '@/components/prep/sim-results-cards'
import { cacheToPlayers } from '@/lib/players/convert'
import { buildBoardPlayers } from '@/lib/draft/solver-bridge'
import { buildSimSummary, buildMyBiasFromTags, toPersistedSim } from '@/lib/draft/sim-results'
import { buildOpponentProfiles } from '@/lib/draft/league-opponents'
import type { PersistedSimResults, SimSummary } from '@/lib/draft/sim-results'
import type { SimRosterConfig } from '@/lib/draft/sim-engine'
import { useUserTags } from '@/hooks/use-user-tags'
import type { Player, DraftFormat } from '@/lib/players/types'

// Locked Nasties roster shape (no kicker; FLEX3 covers extra RB/WR/TE starters).
const NASTIES_ROSTER: SimRosterConfig = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5, ir: 1,
}
// Monte-Carlo runs per simulation and how deep a board to feed the engine. The
// $1 tail past ~240 players never affects the stud core, so trimming keeps the
// client responsive without changing outcomes.
const SIM_RUNS = 30
const BOARD_DEPTH = 240

interface LeagueSummary {
  id: string
  name: string
  format: DraftFormat
  team_count: number
  budget: number | null
}

/** A saved sim run row from /api/sim-runs. */
interface SavedSimRun {
  id: string
  strategy_settings: { name?: string } | null
  created_at: string
  completed_at: string | null
}

export function SimulateClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [summary, setSummary] = useState<SimSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Saved runs
  const [savedRuns, setSavedRuns] = useState<SavedSimRun[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [loadedRun, setLoadedRun] = useState<{ name: string; results: PersistedSimResults } | null>(null)

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId)

  const playerCacheIds = useMemo(() => players.map((p) => p.id), [players])
  const { userTagsMap } = useUserTags({
    leagueId: selectedLeagueId,
    playerCacheIds,
    enabled: playerCacheIds.length > 0,
  })
  const biasedCount = useMemo(
    () => Object.keys(buildMyBiasFromTags(userTagsMap)).length,
    [userTagsMap],
  )

  // Load leagues + players on mount.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setSummary(null)
      try {
        const [leaguesRes, playersRes] = await Promise.all([
          fetch('/api/leagues'),
          fetch('/api/players?limit=500'),
        ])
        if (cancelled) return
        if (leaguesRes.ok) {
          const data = await leaguesRes.json()
          const list: LeagueSummary[] = data.leagues || []
          setLeagues(list)
          if (list.length > 0 && !selectedLeagueId) setSelectedLeagueId(list[0].id)
        }
        if (playersRes.ok) {
          const pData = await playersRes.json()
          setPlayers(cacheToPlayers(pData.players || []))
        }
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load saved sim runs when the league changes.
  const refreshSavedRuns = useCallback(async (leagueId: string) => {
    try {
      const res = await fetch(`/api/sim-runs?leagueId=${leagueId}`)
      if (!res.ok) return
      const data = await res.json()
      setSavedRuns(data.runs ?? [])
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    if (!selectedLeagueId) return
    setLoadedRun(null)
    refreshSavedRuns(selectedLeagueId)
  }, [selectedLeagueId, refreshSavedRuns])

  const handleRun = useCallback(() => {
    if (!selectedLeague || players.length === 0) return
    setSimulating(true)
    setError(null)
    setSummary(null)
    setSaveMsg(null)

    // Defer so the spinner paints before the synchronous engine work runs.
    setTimeout(() => {
      try {
        const board = buildBoardPlayers(players, new Set<string>())
          .sort((a, b) => b.ceiling - a.ceiling)
          .slice(0, BOARD_DEPTH)
        const myBias = buildMyBiasFromTags(userTagsMap)
        const numManagers = Math.max(2, selectedLeague.team_count || 12)
        // Replicate the real Nasties opponents from the ledger so the sim field
        // bids off ROOM price (expectedCost × each owner's positional lean),
        // matching the headless engine. Without this the opponents fall through
        // to the national-ceiling branch and clear studs ~$15-20 too high.
        const { profiles: opponentProfiles } = buildOpponentProfiles({
          count: numManagers - 1,
          meOwner: 'Rasar',
        })
        const result = buildSimSummary({
          board,
          rosterConfig: NASTIES_ROSTER,
          numManagers,
          budget: selectedLeague.budget ?? 200,
          runs: SIM_RUNS,
          seed: 1,
          myManagerIndex: 0,
          myBias,
          opponentProfiles,
        })
        setSummary(result)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Simulation failed')
      } finally {
        setSimulating(false)
      }
    }, 50)
  }, [selectedLeague, players, userTagsMap])

  const handleSave = useCallback(async () => {
    if (!summary || !selectedLeagueId) return
    setSaving(true)
    setSaveMsg(null)
    try {
      const res = await fetch('/api/sim-runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: selectedLeagueId,
          name: `Sim ${summary.grade.modalRecord.wins}-${summary.grade.modalRecord.losses} (${summary.config.biasedPlayers} graded)`,
          results: toPersistedSim(summary),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSaveMsg('Saved.')
      await refreshSavedRuns(selectedLeagueId)
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }, [summary, selectedLeagueId, refreshSavedRuns])

  const handleLoad = useCallback(async (run: SavedSimRun) => {
    try {
      const res = await fetch(`/api/sim-runs/${run.id}`)
      if (!res.ok) return
      const data = await res.json()
      const results = data.run?.results as PersistedSimResults | undefined
      if (results?.kind === 'sim') {
        setLoadedRun({ name: run.strategy_settings?.name ?? 'Saved run', results })
      }
    } catch {
      // non-critical
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading player data...
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <FFICard>
        <p className="text-sm text-muted-foreground text-center py-4">
          No leagues configured.{' '}
          <a href="/prep/configure" className="text-primary underline underline-offset-4">Set up a league</a>{' '}
          first.
        </p>
      </FFICard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <FFICard>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedLeagueId ?? ''} onValueChange={setSelectedLeagueId}>
            <SelectTrigger className="w-[220px]">
              {/* Render the league NAME explicitly. Radix SelectValue auto-text
                  fails when the value is set programmatically on load (before the
                  items register), leaking the raw league uuid into the trigger. */}
              <SelectValue placeholder="Select a league">
                {selectedLeague?.name ?? undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {leagues.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedLeague && (
            <Badge variant="outline">
              {selectedLeague.team_count} teams, ${selectedLeague.budget ?? 200}
            </Badge>
          )}

          <Badge variant="secondary">
            {biasedCount} graded {biasedCount === 1 ? 'player' : 'players'} biasing your seat
          </Badge>

          <FFIButton
            onClick={handleRun}
            disabled={simulating || players.length === 0 || !selectedLeague}
            variant="hero"
            size="sm"
            className="ml-auto"
          >
            {simulating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Simulating...</>
            ) : (
              <><Play className="h-3.5 w-3.5 mr-1.5" />Run {SIM_RUNS} sims</>
            )}
          </FFIButton>
        </div>

        <p className="mt-3 text-xs text-[var(--ffi-ink-3)]">
          Runs {SIM_RUNS} Monte-Carlo auctions with {selectedLeague?.team_count ?? 12} managers and a
          ${selectedLeague?.budget ?? 200} budget. Your seat leans toward your graded targets and away
          from your avoids; the other eleven bid on generic value. Projected record ranks your best
          starting lineup against the league.
        </p>
      </FFICard>

      {error && (
        <div className="flex items-center gap-2 text-sm text-[var(--ffi-danger)] bg-[var(--ffi-danger)]/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Live results */}
      {summary && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FFIButton onClick={handleSave} disabled={saving} variant="secondary" size="sm">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Save this run
            </FFIButton>
            {saveMsg && <span className="text-xs text-[var(--ffi-ink-3)]">{saveMsg}</span>}
          </div>

          <SimRecordHero grade={summary.grade} biasedPlayers={summary.config.biasedPlayers} />
          <SimWinningTeamPlayers topRosters={summary.topRosters} grade={summary.grade} />
          <SimRosterCarousel rosters={summary.topRosters} runs={summary.config.runs} />
          <SimLandedTable landed={summary.landed} />
          <SimNarrative
            grade={summary.grade}
            topRosters={summary.topRosters}
            landed={summary.landed}
            biasedPlayers={summary.config.biasedPlayers}
          />
        </div>
      )}

      {/* Saved runs + compare */}
      {savedRuns.length > 0 && (
        <SimSavedRunsList
          runs={savedRuns.map((run) => ({
            id: run.id,
            name: run.strategy_settings?.name ?? 'Sim run',
            createdAt: new Date(run.created_at).toLocaleDateString(),
          }))}
          onLoad={(id) => {
            const run = savedRuns.find((r) => r.id === id)
            if (run) handleLoad(run)
          }}
        />
      )}

      {/* Comparison: current live run vs a loaded saved run */}
      {loadedRun && (
        <>
          {summary && (
            <SimCompareRows
              current={summary.grade}
              currentLabel="This run"
              other={loadedRun.results.grade}
              otherLabel={loadedRun.name}
            />
          )}
          <div>
            <h2 className="ffi-title-red ffi-display-md">Loaded: {loadedRun.name}</h2>
            <p className="text-sm text-[var(--ffi-ink-2)]">Saved run detail</p>
          </div>
          <div className="space-y-4">
            <SimRecordHero grade={loadedRun.results.grade} biasedPlayers={loadedRun.results.config.biasedPlayers} />
            <SimWinningTeamPlayers topRosters={loadedRun.results.topRosters} grade={loadedRun.results.grade} />
            <SimRosterCarousel rosters={loadedRun.results.topRosters} runs={loadedRun.results.config.runs} />
            <SimLandedTable landed={loadedRun.results.landed} />
          </div>
        </>
      )}
    </div>
  )
}
