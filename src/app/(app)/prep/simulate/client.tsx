'use client'

/**
 * SimulateClient (R10b)
 *
 * Runs the R10a Monte-Carlo auction engine on the real Nasties pool, biased
 * toward Joe's graded targets/avoids (DEC-1), then grades the outcome:
 *   - a projected win-loss record vs the league,
 *   - the top-5 most likely roster shapes (modal, clustered by stud core),
 *   - the players you land most across the sims,
 *   - and saved runs you can reload and compare.
 *
 * Entirely client-side compute; only saved runs hit the server (/api/sim-runs).
 * This card is DATA ONLY. The visual pass is D5 - rendering here is plain FFI.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Play, Loader2, AlertCircle, Trophy, Save, RotateCcw } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  FFICard,
  FFIButton,
  FFIBadge,
  FFISectionHeader,
  FFIPositionBadge,
} from '@/components/ui/ffi-primitives'
import { cacheToPlayers } from '@/lib/players/convert'
import { buildBoardPlayers } from '@/lib/draft/solver-bridge'
import { buildSimSummary, buildMyBiasFromTags, toPersistedSim } from '@/lib/draft/sim-results'
import type { PersistedSimResults, SimSummary } from '@/lib/draft/sim-results'
import type { SimRosterConfig } from '@/lib/draft/sim-engine'
import type { GradeSummary, ModalRoster, LandedPlayer } from '@/lib/draft/sim-grade'
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
        const result = buildSimSummary({
          board,
          rosterConfig: NASTIES_ROSTER,
          numManagers: Math.max(2, selectedLeague.team_count || 12),
          budget: selectedLeague.budget ?? 200,
          runs: SIM_RUNS,
          seed: 1,
          myManagerIndex: 0,
          myBias,
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
              <SelectValue placeholder="Select a league" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedLeague && (
            <Badge variant="outline">
              {selectedLeague.team_count} teams · ${selectedLeague.budget ?? 200}
            </Badge>
          )}

          <Badge variant="secondary">
            {biasedCount} graded {biasedCount === 1 ? 'player' : 'players'} biasing your seat
          </Badge>

          <FFIButton
            onClick={handleRun}
            disabled={simulating || players.length === 0 || !selectedLeague}
            variant="primary"
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

        <p className="mt-3 text-xs text-muted-foreground">
          Runs {SIM_RUNS} Monte-Carlo auctions with {selectedLeague?.team_count ?? 12} managers and a
          ${selectedLeague?.budget ?? 200} budget. Your seat leans toward your graded targets and away
          from your avoids; the other eleven bid on generic value. Projected record ranks your best
          starting lineup against the league.
        </p>
      </FFICard>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
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
            {saveMsg && <span className="text-xs text-muted-foreground">{saveMsg}</span>}
          </div>

          <RecordCard grade={summary.grade} biasedPlayers={summary.config.biasedPlayers} />
          <ModalRostersCard rosters={summary.topRosters} runs={summary.config.runs} />
          <LandedCard landed={summary.landed} />
        </div>
      )}

      {/* Saved runs + compare */}
      {savedRuns.length > 0 && (
        <FFICard>
          <FFISectionHeader title="Saved runs" subtitle="Reload a past run to compare" />
          <div className="mt-3 space-y-1">
            {savedRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/30">
                <span className="flex-1 text-sm font-medium truncate">
                  {run.strategy_settings?.name ?? 'Sim run'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleDateString()}
                </span>
                <FFIButton onClick={() => handleLoad(run)} variant="ghost" size="sm">
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />Load
                </FFIButton>
              </div>
            ))}
          </div>
        </FFICard>
      )}

      {/* Comparison: current live run vs a loaded saved run */}
      {loadedRun && (
        <>
          {summary && (
            <CompareCard
              current={summary.grade}
              currentLabel="This run"
              other={loadedRun.results.grade}
              otherLabel={loadedRun.name}
            />
          )}
          <FFISectionHeader title={`Loaded: ${loadedRun.name}`} subtitle="Saved run detail" />
          <div className="space-y-4">
            <RecordCard grade={loadedRun.results.grade} biasedPlayers={loadedRun.results.config.biasedPlayers} />
            <ModalRostersCard rosters={loadedRun.results.topRosters} runs={loadedRun.results.config.runs} />
            <LandedCard landed={loadedRun.results.landed} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components (plain FFI rendering; D5 restyles) ────────────────────────

function RecordCard({ grade, biasedPlayers }: { grade: GradeSummary; biasedPlayers: number }) {
  return (
    <FFICard variant="elevated" className="border-l-4 border-[var(--ffi-success)]/30">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--ffi-success)]/15">
            <Trophy className="h-5 w-5 text-[var(--ffi-success)]" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Projected record</div>
            <div className="text-2xl font-bold text-foreground">
              {grade.modalRecord.wins}-{grade.modalRecord.losses}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                most likely ({grade.modalRecord.frequencyPct}% of sims)
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <Stat label="Avg wins" value={grade.meanWins.toFixed(1)} />
          <Stat label="Avg rank" value={`#${grade.meanRank.toFixed(1)}`} />
          <Stat label="Starter pts" value={grade.meanStarterPoints.toFixed(0)} />
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
        Range {grade.worstRecord.wins}-{grade.worstRecord.losses} to {grade.bestRecord.wins}-{grade.bestRecord.losses}
        {' '}across {grade.runs} sims of a {grade.games}-game season, {grade.numManagers} teams.
        {' '}Your seat biased toward {biasedPlayers} graded {biasedPlayers === 1 ? 'player' : 'players'}.
        {' '}Record ranks projected starting-lineup points vs the other {grade.numManagers - 1} teams.
      </div>
    </FFICard>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold text-foreground">{value}</div>
    </div>
  )
}

function ModalRostersCard({ rosters, runs }: { rosters: ModalRoster[]; runs: number }) {
  if (rosters.length === 0) return null
  return (
    <FFICard>
      <FFISectionHeader
        title="Most likely rosters"
        subtitle={`Top ${rosters.length} stud cores across ${runs} sims`}
      />
      <div className="mt-3 space-y-3">
        {rosters.map((r, i) => (
          <div key={i} className="rounded-lg border border-border/40 p-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-sm font-semibold text-foreground">
                Shape {i + 1}
                <span className="ml-2 text-[var(--ffi-accent)]">{r.frequencyPct}%</span>
                <span className="ml-1 text-xs text-muted-foreground">({r.frequency} of {runs})</span>
              </span>
              <span className="text-xs text-muted-foreground">
                avg ${r.avgSpent} spent · {r.avgWins.toFixed(1)} wins · {r.avgStarterPoints.toFixed(0)} pts
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.coreNames.length === 0 ? (
                <span className="text-xs text-muted-foreground">No stud-tier picks (all value plays)</span>
              ) : (
                r.coreNames.map((name, j) => (
                  <FFIBadge key={j} status="info" className="text-[10px]">{name}</FFIBadge>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </FFICard>
  )
}

function LandedCard({ landed }: { landed: LandedPlayer[] }) {
  if (landed.length === 0) return null
  const top = landed.slice(0, 20)
  return (
    <FFICard>
      <FFISectionHeader title="Players you land most" subtitle="Share of sims you end up with them" />
      <div className="mt-3 space-y-1">
        {top.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/30">
            <FFIPositionBadge position={p.position === 'DEF' ? 'DEF' : p.position} />
            <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
            <span className="text-xs font-mono text-[var(--ffi-accent)] w-14 text-right">
              {Math.round(p.landRate * 100)}%
            </span>
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">${p.avgPrice}</span>
          </div>
        ))}
      </div>
    </FFICard>
  )
}

function CompareCard({
  current, currentLabel, other, otherLabel,
}: {
  current: GradeSummary; currentLabel: string; other: GradeSummary; otherLabel: string
}) {
  const rows: [string, string, string][] = [
    ['Most likely record', `${current.modalRecord.wins}-${current.modalRecord.losses}`, `${other.modalRecord.wins}-${other.modalRecord.losses}`],
    ['Avg wins', current.meanWins.toFixed(1), other.meanWins.toFixed(1)],
    ['Avg rank', `#${current.meanRank.toFixed(1)}`, `#${other.meanRank.toFixed(1)}`],
    ['Avg starter pts', current.meanStarterPoints.toFixed(0), other.meanStarterPoints.toFixed(0)],
  ]
  return (
    <FFICard>
      <FFISectionHeader title="Compare" subtitle="This run vs a saved run" />
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground text-left">
              <th className="py-1.5 pr-3 font-medium"></th>
              <th className="py-1.5 pr-3 font-medium">{currentLabel}</th>
              <th className="py-1.5 font-medium truncate max-w-[140px]">{otherLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, a, b]) => (
              <tr key={label} className="border-t border-border/30">
                <td className="py-1.5 pr-3 text-muted-foreground">{label}</td>
                <td className="py-1.5 pr-3 font-mono font-semibold text-foreground">{a}</td>
                <td className="py-1.5 font-mono text-foreground">{b}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FFICard>
  )
}
