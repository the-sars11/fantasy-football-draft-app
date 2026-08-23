'use client'

import { useState, useEffect } from 'react'
import { Loader2, Eye, GitCompare, ChevronUp, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { FFIBadge, FFIPositionBadge } from '@/components/ui/ffi-primitives'
import type { DraftFormat } from '@/lib/players/types'

type Pos = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF'

interface LeagueSummary {
  id: string
  name: string
  format: DraftFormat
  team_count: number
  budget: number | null
}

interface RunListItem {
  id: string
  league_id: string
  strategy_settings: {
    name?: string
    archetype?: string
    [key: string]: unknown
  }
  status: string
  error_message: string | null
  created_at: string
  completed_at: string | null
}

interface ScoredPlayerSummary {
  id: string
  name: string
  team: string
  position: string
  adp: number
  consensusValue: number
  strategyScore: number
  adjustedAuctionValue?: number
  adjustedRoundValue?: number
  targetStatus: string
  boosts: string[]
}

interface RunDetail {
  id: string
  league_id: string
  strategy_settings: Record<string, unknown>
  results: {
    league: { id: string; name: string; format: string; teamCount: number; budget: number | null; scoringFormat: string }
    ingest: { sources: Record<string, { success: boolean; count: number; error?: string }>; totalPlayers: number; fetchedAt: string }
    analysis: {
      totalPlayers: number
      targets: ScoredPlayerSummary[]
      avoids: ScoredPlayerSummary[]
      valuePlays: ScoredPlayerSummary[]
      byPosition: Record<string, ScoredPlayerSummary[]>
    }
    completedAt: string
  } | null
  status: string
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export function RunHistoryClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [runs, setRuns] = useState<RunListItem[]>([])
  const [runsLoading, setRunsLoading] = useState(false)

  // Latest-run detail — auto-loaded to populate the hero stat cluster + top targets
  const [latestDetail, setLatestDetail] = useState<RunDetail | null>(null)
  const [latestLoading, setLatestLoading] = useState(false)

  // Expanded run detail (manual, per row)
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null)
  const [expandedRun, setExpandedRun] = useState<RunDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Refresh (re-run research with fresh data) — FF-028
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFeedback, setRefreshFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Compare mode
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareRuns, setCompareRuns] = useState<RunDetail[]>([])
  const [compareLoading, setCompareLoading] = useState(false)

  // Fetch leagues
  useEffect(() => {
    fetch('/api/leagues')
      .then((r) => r.json())
      .then((data) => {
        setLeagues(data.leagues ?? [])
        if (data.leagues?.length > 0) {
          setSelectedLeagueId(data.leagues[0].id)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Fetch runs for selected league
  useEffect(() => {
    if (!selectedLeagueId) {
      setRuns([])
      return
    }
    setRunsLoading(true)
    fetch(`/api/research?leagueId=${selectedLeagueId}`)
      .then((r) => r.json())
      .then((data) => setRuns(data.runs ?? []))
      .catch(() => setRuns([]))
      .finally(() => setRunsLoading(false))
  }, [selectedLeagueId])

  // Auto-load the newest completed run's detail for the hero stat cluster + top targets
  useEffect(() => {
    const latest = runs[0]
    if (!latest || latest.status !== 'completed') {
      setLatestDetail(null)
      return
    }
    let cancelled = false
    setLatestLoading(true)
    fetch(`/api/research/${latest.id}`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setLatestDetail(data.run ?? null) })
      .catch(() => { if (!cancelled) setLatestDetail(null) })
      .finally(() => { if (!cancelled) setLatestLoading(false) })
    return () => { cancelled = true }
  }, [runs])

  // Load run detail
  async function loadRunDetail(runId: string) {
    if (expandedRunId === runId) {
      setExpandedRunId(null)
      setExpandedRun(null)
      return
    }
    setExpandedRunId(runId)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/research/${runId}`)
      const data = await res.json()
      setExpandedRun(data.run ?? null)
    } catch {
      setExpandedRun(null)
    } finally {
      setDetailLoading(false)
    }
  }

  // Toggle compare selection
  function toggleCompare(runId: string) {
    setCompareIds((prev) => {
      if (prev.includes(runId)) return prev.filter((id) => id !== runId)
      if (prev.length >= 2) return [prev[1], runId] // replace oldest
      return [...prev, runId]
    })
  }

  // Load compare runs
  async function runCompare() {
    if (compareIds.length !== 2) return
    setCompareLoading(true)
    try {
      const [a, b] = await Promise.all(
        compareIds.map((id) => fetch(`/api/research/${id}`).then((r) => r.json()))
      )
      setCompareRuns([a.run, b.run].filter(Boolean))
    } catch {
      setCompareRuns([])
    } finally {
      setCompareLoading(false)
    }
  }

  // Refresh: re-pull all data sources and re-analyze with current strategy (FF-028)
  async function handleRefresh() {
    if (!selectedLeagueId || refreshing) return
    setRefreshing(true)
    setRefreshFeedback(null)

    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: selectedLeagueId, skipRefresh: false }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Research failed')
      }

      // Refresh the runs list
      const runsRes = await fetch(`/api/research?leagueId=${selectedLeagueId}`)
      const runsData = await runsRes.json()
      setRuns(runsData.runs ?? [])

      const stratName = data.strategy?.name ?? 'Balanced (default)'
      setRefreshFeedback({
        type: 'success',
        message: `Refreshed! ${data.analysis?.totalPlayers ?? 0} players analyzed with "${stratName}" strategy. Saved as new run.`,
      })

      // Auto-clear feedback after 5 seconds
      setTimeout(() => setRefreshFeedback(null), 5000)
    } catch (err) {
      setRefreshFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Refresh failed',
      })
    } finally {
      setRefreshing(false)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="ffi-nameplate p-4 flex gap-4">
            <div className="ffi-skeleton h-10 w-20 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="ffi-skeleton h-4 w-48 rounded-full" />
              <div className="ffi-skeleton h-4 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="ffi-nameplate p-8 text-center space-y-1">
        <p className="ffi-body-md font-medium" style={{ color: 'var(--ffi-ink-2)' }}>No leagues configured</p>
        <p className="ffi-caption" style={{ color: 'var(--ffi-ink-3)' }}>Set up a league first to run research.</p>
      </div>
    )
  }

  const latestRun = runs[0]
  const restRuns = runs.slice(1)

  return (
    <div className="space-y-5">
      {/* League selector + Refresh button */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="ffi-body-md font-medium" style={{ color: 'var(--ffi-ink)' }}>League:</span>
        <select
          value={selectedLeagueId ?? ''}
          onChange={(e) => setSelectedLeagueId(e.target.value)}
          className="ffi-input ffi-form-input w-64"
          style={{ paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
        >
          {leagues.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.format})
            </option>
          ))}
        </select>

        {/* Refresh button — FF-028 */}
        <button
          onClick={handleRefresh}
          disabled={!selectedLeagueId || refreshing}
          className="ffi-btn-secondary text-sm disabled:opacity-50"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>

        {/* Refresh feedback */}
        {refreshFeedback && (
          <div
            className="flex items-center gap-1.5 text-sm"
            style={{ color: refreshFeedback.type === 'success' ? 'var(--ffi-blue-bright)' : 'var(--ffi-danger)' }}
          >
            {refreshFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            {refreshFeedback.message}
          </div>
        )}
      </div>

      {/* Runs content */}
      {runsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="ffi-nameplate px-4 py-3 flex gap-4 items-center">
              <div className="ffi-skeleton h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="ffi-skeleton h-4 w-32 rounded-full" />
                <div className="ffi-skeleton h-3 w-24 rounded-full" />
              </div>
              <div className="ffi-skeleton h-5 w-16 rounded-md" />
            </div>
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="ffi-nameplate p-8 text-center space-y-1">
          <p className="ffi-body-md font-medium" style={{ color: 'var(--ffi-ink-2)' }}>No research runs yet</p>
          <p className="ffi-caption" style={{ color: 'var(--ffi-ink-3)' }}>Run research from the Prep page to create one.</p>
        </div>
      ) : (
        <>
          {/* Compare bar (contextual) */}
          {compareIds.length === 2 && (
            <div className="flex items-center gap-2">
              <button onClick={runCompare} disabled={compareLoading} className="ffi-btn-secondary text-sm disabled:opacity-50">
                {compareLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
                Compare Selected
              </button>
              <button className="ffi-btn-ghost text-sm" onClick={() => { setCompareIds([]); setCompareRuns([]) }}>
                Clear
              </button>
            </div>
          )}

          {/* LATEST RUN — hero */}
          {latestRun && (
            <>
              <QuietLabel>Latest Run</QuietLabel>
              <LatestRunHero
                run={latestRun}
                detail={latestDetail}
                loading={latestLoading}
                isCompared={compareIds.includes(latestRun.id)}
                onToggleCompare={() => toggleCompare(latestRun.id)}
                formatDate={formatDate}
              />
            </>
          )}

          {/* ALL RUNS — destrows */}
          {restRuns.length > 0 && (
            <>
              <QuietLabel>All Runs</QuietLabel>
              <div className="space-y-2">
                {restRuns.map((run) => (
                  <RunRow
                    key={run.id}
                    run={run}
                    isCompared={compareIds.includes(run.id)}
                    isExpanded={expandedRunId === run.id}
                    detailLoading={detailLoading}
                    expandedRun={expandedRunId === run.id ? expandedRun : null}
                    onToggleCompare={() => toggleCompare(run.id)}
                    onToggleExpand={() => loadRunDetail(run.id)}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </>
          )}

          {/* TOP TARGETS · latest */}
          {latestRun?.status === 'completed' && (
            <>
              <QuietLabel>Top Targets &middot; latest</QuietLabel>
              {latestLoading ? (
                <div className="ffi-nameplate p-4 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="ffi-skeleton h-5 w-9 rounded-md shrink-0" />
                      <div className="ffi-skeleton h-4 flex-1 rounded-full" />
                      <div className="ffi-skeleton h-4 w-16 rounded-full" />
                    </div>
                  ))}
                </div>
              ) : latestDetail ? (
                <TopTargetsCard detail={latestDetail} />
              ) : null}
            </>
          )}
        </>
      )}

      {/* Compare view */}
      {compareRuns.length === 2 && (
        <CompareView runs={compareRuns} />
      )}
    </div>
  )
}

// ─── SHIELD section label ────────────────────────────────────────────────────

function QuietLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-bold text-[10px] uppercase mt-6 mb-2.5"
      style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.28em', color: 'var(--ffi-ink-3)' }}
    >
      {children}
    </p>
  )
}

// ─── Status badge (SET palette: completed steel-blue, failed pink) ────────────

function StatusBadge({ status }: { status: string }) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  if (status === 'completed') return <FFIBadge status="success" className="text-[10px] shrink-0">{label}</FFIBadge>
  if (status === 'failed') return <FFIBadge status="danger" className="text-[10px] shrink-0">{label}</FFIBadge>
  return <FFIBadge status="info" className="text-[10px] shrink-0">{label}</FFIBadge>
}

// ─── Hero stat cluster ────────────────────────────────────────────────────────

function StatCluster({ detail }: { detail: RunDetail }) {
  const a = detail.results?.analysis
  if (!a) return null
  const items: { n: number; l: string; c: string }[] = [
    { n: a.totalPlayers, l: 'Players', c: 'var(--ffi-ink)' },
    { n: a.targets.length, l: 'Targets', c: 'var(--ffi-volt)' },
    { n: a.avoids.length, l: 'Avoids', c: 'var(--ffi-danger)' },
    { n: a.valuePlays.length, l: 'Value', c: 'var(--ffi-blue-bright)' },
  ]
  return (
    <div className="grid grid-cols-4 gap-3 mt-4">
      {items.map((it) => (
        <div key={it.l} className="text-center">
          <div className="font-mono font-bold tabular-nums" style={{ fontSize: 26, lineHeight: 1, color: it.c }}>{it.n}</div>
          <div className="ffi-caption mt-1" style={{ color: 'var(--ffi-ink-3)' }}>{it.l}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Latest run hero ──────────────────────────────────────────────────────────

function LatestRunHero({
  run, detail, loading, isCompared, onToggleCompare, formatDate,
}: {
  run: RunListItem
  detail: RunDetail | null
  loading: boolean
  isCompared: boolean
  onToggleCompare: () => void
  formatDate: (iso: string) => string
}) {
  const strat = run.strategy_settings?.name ?? run.strategy_settings?.archetype ?? 'Default'
  return (
    <div className="ffi-hero p-5">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <input
              type="checkbox"
              checked={isCompared}
              onChange={onToggleCompare}
              aria-label="Select for compare"
              className="h-4 w-4 shrink-0"
              style={{ accentColor: 'var(--ffi-blue-bright)' }}
            />
            <div className="ffi-title-red" style={{ fontSize: 20, lineHeight: 1.15 }}>{formatDate(run.created_at)}</div>
          </div>
          <StatusBadge status={run.status} />
        </div>

        <div className="mt-2">
          <FFIBadge status="info" className="text-[10px]">{strat}</FFIBadge>
        </div>

        {run.status === 'failed' ? (
          <p className="ffi-body-md mt-4" style={{ color: 'var(--ffi-danger)' }}>
            {run.error_message ?? 'Run failed'}
          </p>
        ) : loading ? (
          <div className="grid grid-cols-4 gap-3 mt-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="ffi-skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : detail ? (
          <StatCluster detail={detail} />
        ) : null}
      </div>
    </div>
  )
}

// ─── Top targets card ─────────────────────────────────────────────────────────

function TopTargetsCard({ detail }: { detail: RunDetail }) {
  const targets = detail.results?.analysis.targets ?? []
  if (targets.length === 0) return null
  return (
    <div className="ffi-nameplate p-4">
      {targets.slice(0, 5).map((p, i) => (
        <div
          key={p.id}
          className="flex items-center gap-3 py-2"
          style={i > 0 ? { borderTop: '1px solid var(--ffi-hairline)' } : undefined}
        >
          <FFIPositionBadge position={p.position as Pos} className="text-[10px] px-1.5 w-9 justify-center shrink-0" />
          <span className="flex-1 text-[13px] truncate" style={{ color: 'var(--ffi-ink)' }}>{p.name}</span>
          <span className="font-mono text-xs tabular-nums" style={{ color: 'var(--ffi-ink-3)' }}>
            {p.strategyScore}
            {p.adjustedAuctionValue != null && <> &middot; ${p.adjustedAuctionValue}</>}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Run row (DestRow style) ──────────────────────────────────────────────────

function RunRow({
  run, isCompared, isExpanded, detailLoading, expandedRun, onToggleCompare, onToggleExpand, formatDate,
}: {
  run: RunListItem
  isCompared: boolean
  isExpanded: boolean
  detailLoading: boolean
  expandedRun: RunDetail | null
  onToggleCompare: () => void
  onToggleExpand: () => void
  formatDate: (iso: string) => string
}) {
  const strat = run.strategy_settings?.name ?? run.strategy_settings?.archetype ?? 'Default'
  return (
    <div
      className="ffi-nameplate"
      style={{ padding: 0, ...(isCompared ? { borderColor: 'var(--ffi-blue-bright)' } : {}) }}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <input
          type="checkbox"
          checked={isCompared}
          onChange={onToggleCompare}
          aria-label="Select for compare"
          className="h-4 w-4 shrink-0"
          style={{ accentColor: 'var(--ffi-blue-bright)' }}
        />
        <div
          className="shrink-0 flex items-center justify-center rounded-full"
          style={{ width: 34, height: 34, background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
          aria-hidden
        >
          <Clock className="w-4 h-4" strokeWidth={2} style={{ color: 'var(--ffi-volt)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium truncate" style={{ color: 'var(--ffi-ink)' }}>
            {formatDate(run.created_at)}
          </div>
          <div className="ffi-caption mt-0.5 truncate" style={{ color: 'var(--ffi-ink-3)' }}>{strat}</div>
        </div>
        <StatusBadge status={run.status} />
        <button onClick={onToggleExpand} className="ffi-btn-ghost text-xs shrink-0">
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {isExpanded ? 'Collapse' : 'View'}
        </button>
      </div>
      {isExpanded && (
        detailLoading ? (
          <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--ffi-hairline)' }}>
            <div className="ffi-skeleton h-4 w-full rounded-full" />
            <div className="ffi-skeleton h-4 w-3/4 rounded-full" />
            <div className="ffi-skeleton h-4 w-1/2 rounded-full" />
          </div>
        ) : expandedRun?.results ? (
          <RunDetailView run={expandedRun} />
        ) : (
          <div className="py-4 px-6 ffi-body-md" style={{ color: 'var(--ffi-ink-2)', borderTop: '1px solid var(--ffi-hairline)' }}>
            {expandedRun?.error_message ?? 'No results available'}
          </div>
        )
      )}
    </div>
  )
}

// --- Run Detail View ---

function RunDetailView({ run }: { run: RunDetail }) {
  const results = run.results
  if (!results) return null

  return (
    <div className="p-4 space-y-4" style={{ borderTop: '1px solid var(--ffi-hairline)', background: 'var(--ffi-surface-1)' }}>
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <span style={{ color: 'var(--ffi-ink-2)' }}>Players:</span>{' '}
          <span className="font-medium tabular-nums" style={{ color: 'var(--ffi-ink)' }}>{results.analysis.totalPlayers}</span>
        </div>
        <div>
          <span style={{ color: 'var(--ffi-ink-2)' }}>Targets:</span>{' '}
          <span className="font-medium tabular-nums" style={{ color: 'var(--ffi-volt)' }}>{results.analysis.targets.length}</span>
        </div>
        <div>
          <span style={{ color: 'var(--ffi-ink-2)' }}>Avoids:</span>{' '}
          <span className="font-medium tabular-nums" style={{ color: 'var(--ffi-danger)' }}>{results.analysis.avoids.length}</span>
        </div>
        <div>
          <span style={{ color: 'var(--ffi-ink-2)' }}>Value Plays:</span>{' '}
          <span className="font-medium tabular-nums" style={{ color: 'var(--ffi-blue-bright)' }}>{results.analysis.valuePlays.length}</span>
        </div>
      </div>

      {/* Data sources */}
      <div className="text-sm flex flex-wrap items-center gap-1">
        <span style={{ color: 'var(--ffi-ink-2)' }}>Sources:</span>{' '}
        {Object.entries(results.ingest.sources).map(([name, info]) => (
          <FFIBadge
            key={name}
            status={info.success ? 'info' : 'danger'}
            className="text-[10px]"
          >
            {name} ({info.count})
          </FFIBadge>
        ))}
      </div>

      {/* Top targets */}
      {results.analysis.targets.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--ffi-ink)' }}>Top Targets</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
            {results.analysis.targets.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1 rounded" style={{ background: 'var(--ffi-surface-2)' }}>
                <span className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--ffi-ink)' }}>
                  <FFIPositionBadge position={p.position as Pos} className="text-[10px] w-8 justify-center shrink-0" />
                  <span className="truncate">{p.name}</span>
                  <span className="text-xs shrink-0" style={{ color: 'var(--ffi-ink-3)' }}>{p.team}</span>
                </span>
                <span className="text-xs font-mono tabular-nums shrink-0" style={{ color: 'var(--ffi-ink-2)' }}>
                  {p.strategyScore}
                  {p.adjustedAuctionValue != null && <> | ${p.adjustedAuctionValue}</>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top value plays */}
      {results.analysis.valuePlays.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--ffi-ink)' }}>Value Plays</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
            {results.analysis.valuePlays.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1 rounded" style={{ background: 'var(--ffi-surface-2)' }}>
                <span className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--ffi-ink)' }}>
                  <FFIPositionBadge position={p.position as Pos} className="text-[10px] w-8 justify-center shrink-0" />
                  <span className="truncate">{p.name}</span>
                </span>
                <span className="text-xs font-mono tabular-nums shrink-0" style={{ color: 'var(--ffi-ink-2)' }}>{p.strategyScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Compare View ---

function CompareView({ runs }: { runs: RunDetail[] }) {
  const [a, b] = runs
  if (!a.results || !b.results) return null

  const stratA = a.strategy_settings as { name?: string; archetype?: string }
  const stratB = b.strategy_settings as { name?: string; archetype?: string }

  // Find targets that differ between runs
  const targetsA = new Set(a.results.analysis.targets.map((p) => p.id))
  const targetsB = new Set(b.results.analysis.targets.map((p) => p.id))
  const onlyInA = a.results.analysis.targets.filter((p) => !targetsB.has(p.id))
  const onlyInB = b.results.analysis.targets.filter((p) => !targetsA.has(p.id))
  const shared = a.results.analysis.targets.filter((p) => targetsB.has(p.id))

  return (
    <div className="ffi-nameplate p-5 space-y-4">
      <h3 className="ffi-title-chrome text-lg">Run Comparison</h3>

      {/* Header comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5 text-sm">
          <div className="font-medium" style={{ color: 'var(--ffi-ink)' }}>{formatDateFull(a.created_at)}</div>
          <FFIBadge status="info" className="text-[10px]">{stratA.name ?? stratA.archetype ?? 'Default'}</FFIBadge>
          <div className="tabular-nums" style={{ color: 'var(--ffi-ink-2)' }}>{a.results.analysis.totalPlayers} players</div>
        </div>
        <div className="space-y-1.5 text-sm">
          <div className="font-medium" style={{ color: 'var(--ffi-ink)' }}>{formatDateFull(b.created_at)}</div>
          <FFIBadge status="info" className="text-[10px]">{stratB.name ?? stratB.archetype ?? 'Default'}</FFIBadge>
          <div className="tabular-nums" style={{ color: 'var(--ffi-ink-2)' }}>{b.results.analysis.totalPlayers} players</div>
        </div>
      </div>

      {/* Stats comparison — CSS-grid rows, no HTML table */}
      <div>
        <CompareStatRow label="Total Players" a={a.results.analysis.totalPlayers} b={b.results.analysis.totalPlayers} />
        <CompareStatRow label="Targets" a={a.results.analysis.targets.length} b={b.results.analysis.targets.length} color="var(--ffi-volt)" />
        <CompareStatRow label="Avoids" a={a.results.analysis.avoids.length} b={b.results.analysis.avoids.length} color="var(--ffi-danger)" />
        <CompareStatRow label="Value Plays" a={a.results.analysis.valuePlays.length} b={b.results.analysis.valuePlays.length} color="var(--ffi-blue-bright)" />
      </div>

      {/* Target differences */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <div>
          <h4 className="font-medium mb-2" style={{ color: 'var(--ffi-volt)' }}>Shared Targets ({shared.length})</h4>
          {shared.slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 py-0.5 min-w-0" style={{ color: 'var(--ffi-ink)' }}>
              <FFIPositionBadge position={p.position as Pos} className="text-[10px] w-8 justify-center shrink-0" />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
        <div>
          <h4 className="font-medium mb-2" style={{ color: 'var(--ffi-ink)' }}>Only in Run A ({onlyInA.length})</h4>
          {onlyInA.slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 py-0.5 min-w-0" style={{ color: 'var(--ffi-ink)' }}>
              <FFIPositionBadge position={p.position as Pos} className="text-[10px] w-8 justify-center shrink-0" />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
        <div>
          <h4 className="font-medium mb-2" style={{ color: 'var(--ffi-ink)' }}>Only in Run B ({onlyInB.length})</h4>
          {onlyInB.slice(0, 8).map((p) => (
            <div key={p.id} className="flex items-center gap-1.5 py-0.5 min-w-0" style={{ color: 'var(--ffi-ink)' }}>
              <FFIPositionBadge position={p.position as Pos} className="text-[10px] w-8 justify-center shrink-0" />
              <span className="truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CompareStatRow({ label, a, b, color }: { label: string; a: number; b: number; color?: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 text-sm items-center" style={{ borderBottom: '1px solid var(--ffi-hairline)' }}>
      <span style={{ color: 'var(--ffi-ink-2)' }}>{label}</span>
      <span className="text-center font-mono tabular-nums" style={{ color: color ?? 'var(--ffi-ink)' }}>{a}</span>
      <span className="text-center font-mono tabular-nums" style={{ color: color ?? 'var(--ffi-ink)' }}>{b}</span>
    </div>
  )
}

function formatDateFull(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
