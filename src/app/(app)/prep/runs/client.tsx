'use client'

import { useState, useEffect } from 'react'
import { Loader2, Eye, GitCompare, ChevronUp, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import type { DraftFormat } from '@/lib/players/types'

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

const STATUS_STYLES: Record<string, React.CSSProperties> = {
  completed: { background: 'rgba(139,255,69,0.16)', color: 'var(--ffi-volt)' },
  failed: { background: 'rgba(255,110,138,0.16)', color: 'var(--ffi-danger)' },
}
const STATUS_DEFAULT: React.CSSProperties = { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }

export function RunHistoryClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [runs, setRuns] = useState<RunListItem[]>([])
  const [runsLoading, setRunsLoading] = useState(false)

  // Expanded run detail
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
          <div key={i} className="rounded-xl p-4 flex gap-4" style={{ border: '1px solid var(--ffi-hairline)', background: 'var(--ffi-surface-2)' }}>
            <div className="ffi-skeleton h-10 w-20 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="ffi-skeleton h-4 w-48" />
              <div className="ffi-skeleton h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="rounded-xl p-8 text-center space-y-1" style={{ border: '1px solid var(--ffi-hairline)', background: 'var(--ffi-surface-2)' }}>
        <p className="text-sm font-medium" style={{ color: 'var(--ffi-ink-2)' }}>No leagues configured</p>
        <p className="text-xs" style={{ color: 'var(--ffi-ink-3)' }}>Set up a league first to run research.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* League selector + Refresh button */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--ffi-ink)' }}>League:</span>
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
            style={{ color: refreshFeedback.type === 'success' ? 'var(--ffi-volt)' : 'var(--ffi-danger)' }}
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

      {/* Runs list */}
      {runsLoading ? (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--ffi-hairline)' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex gap-6 last:border-0" style={{ borderBottom: '1px solid var(--ffi-hairline)' }}>
              <div className="ffi-skeleton h-4 w-24" />
              <div className="ffi-skeleton h-4 flex-1" />
              <div className="ffi-skeleton h-4 w-16" />
              <div className="ffi-skeleton h-4 w-12" />
            </div>
          ))}
        </div>
      ) : runs.length === 0 ? (
        <div className="rounded-xl p-8 text-center space-y-1" style={{ border: '1px solid var(--ffi-hairline)', background: 'var(--ffi-surface-2)' }}>
          <p className="text-sm font-medium" style={{ color: 'var(--ffi-ink-2)' }}>No research runs yet</p>
          <p className="text-xs" style={{ color: 'var(--ffi-ink-3)' }}>Run research from the Prep page to create one.</p>
        </div>
      ) : (
        <>
          {/* Compare button */}
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

          <div className="space-y-2">
            {runs.map((run) => {
              const isExpanded = expandedRunId === run.id
              const isCompared = compareIds.includes(run.id)
              return (
                <div
                  key={run.id}
                  className="ffi-card"
                  style={{ padding: 0, ...(isCompared ? { borderColor: 'var(--ffi-blue-bright)' } : {}) }}
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={isCompared}
                      onChange={() => toggleCompare(run.id)}
                      className="h-4 w-4 shrink-0"
                      style={{ accentColor: 'var(--ffi-blue-bright)' }}
                    />
                    <span className="text-sm font-medium shrink-0" style={{ color: 'var(--ffi-ink)' }}>
                      {formatDate(run.created_at)}
                    </span>
                    <span className="ffi-badge text-[10px] shrink-0" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>
                      {run.strategy_settings?.name ?? run.strategy_settings?.archetype ?? 'Default'}
                    </span>
                    <span className="ffi-badge text-[10px] shrink-0" style={run.status === 'failed' ? STATUS_STYLES.failed : run.status === 'completed' ? STATUS_STYLES.completed : STATUS_DEFAULT}>
                      {run.status}
                    </span>
                    <button
                      onClick={() => loadRunDetail(run.id)}
                      className="ffi-btn-ghost text-xs ml-auto shrink-0"
                    >
                      {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {isExpanded ? 'Collapse' : 'View'}
                    </button>
                  </div>
                  {isExpanded && (
                    detailLoading ? (
                      <div className="p-4 space-y-2" style={{ borderTop: '1px solid var(--ffi-hairline)' }}>
                        <div className="ffi-skeleton h-4 w-full" />
                        <div className="ffi-skeleton h-4 w-3/4" />
                        <div className="ffi-skeleton h-4 w-1/2" />
                      </div>
                    ) : expandedRun?.results ? (
                      <RunDetailView run={expandedRun} />
                    ) : (
                      <div className="py-4 px-6 text-sm" style={{ color: 'var(--ffi-ink-2)', borderTop: '1px solid var(--ffi-hairline)' }}>
                        {expandedRun?.error_message ?? 'No results available'}
                      </div>
                    )
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Compare view */}
      {compareRuns.length === 2 && (
        <CompareView runs={compareRuns} />
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
          <span className="font-medium" style={{ color: 'var(--ffi-ink)' }}>{results.analysis.totalPlayers}</span>
        </div>
        <div>
          <span style={{ color: 'var(--ffi-ink-2)' }}>Targets:</span>{' '}
          <span className="font-medium" style={{ color: 'var(--ffi-volt)' }}>{results.analysis.targets.length}</span>
        </div>
        <div>
          <span style={{ color: 'var(--ffi-ink-2)' }}>Avoids:</span>{' '}
          <span className="font-medium" style={{ color: 'var(--ffi-danger)' }}>{results.analysis.avoids.length}</span>
        </div>
        <div>
          <span style={{ color: 'var(--ffi-ink-2)' }}>Value Plays:</span>{' '}
          <span className="font-medium" style={{ color: 'var(--ffi-blue-bright)' }}>{results.analysis.valuePlays.length}</span>
        </div>
      </div>

      {/* Data sources */}
      <div className="text-sm">
        <span style={{ color: 'var(--ffi-ink-2)' }}>Sources:</span>{' '}
        {Object.entries(results.ingest.sources).map(([name, info]) => (
          <span
            key={name}
            className="ffi-badge text-[10px] mr-1"
            style={info.success ? { background: 'var(--ffi-surface-2)', color: 'var(--ffi-ink-2)' } : STATUS_STYLES.failed}
          >
            {name} ({info.count})
          </span>
        ))}
      </div>

      {/* Top targets */}
      {results.analysis.targets.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--ffi-ink)' }}>Top Targets</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
            {results.analysis.targets.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1 rounded" style={{ background: 'var(--ffi-surface-2)' }}>
                <span style={{ color: 'var(--ffi-ink)' }}>
                  <span className="ffi-badge text-[10px] mr-1.5 w-8 justify-center" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>{p.position}</span>
                  {p.name}
                  <span className="ml-1 text-xs" style={{ color: 'var(--ffi-ink-3)' }}>{p.team}</span>
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--ffi-ink-2)' }}>
                  Score: {p.strategyScore}
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
                <span style={{ color: 'var(--ffi-ink)' }}>
                  <span className="ffi-badge text-[10px] mr-1.5 w-8 justify-center" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>{p.position}</span>
                  {p.name}
                </span>
                <span className="text-xs font-mono" style={{ color: 'var(--ffi-ink-2)' }}>Score: {p.strategyScore}</span>
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
    <div className="ffi-card space-y-4">
      <h3 className="ffi-title-md">Run Comparison</h3>

      {/* Header comparison */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1 text-sm">
          <div className="font-medium" style={{ color: 'var(--ffi-ink)' }}>{formatDateFull(a.created_at)}</div>
          <span className="ffi-badge text-[10px]" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>{stratA.name ?? stratA.archetype ?? 'Default'}</span>
          <div style={{ color: 'var(--ffi-ink-2)' }}>{a.results.analysis.totalPlayers} players</div>
        </div>
        <div className="space-y-1 text-sm">
          <div className="font-medium" style={{ color: 'var(--ffi-ink)' }}>{formatDateFull(b.created_at)}</div>
          <span className="ffi-badge text-[10px]" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>{stratB.name ?? stratB.archetype ?? 'Default'}</span>
          <div style={{ color: 'var(--ffi-ink-2)' }}>{b.results.analysis.totalPlayers} players</div>
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
            <div key={p.id} className="py-0.5" style={{ color: 'var(--ffi-ink)' }}>
              <span className="ffi-badge text-[10px] mr-1" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>{p.position}</span>
              {p.name}
            </div>
          ))}
        </div>
        <div>
          <h4 className="font-medium mb-2" style={{ color: 'var(--ffi-ink)' }}>Only in Run A ({onlyInA.length})</h4>
          {onlyInA.slice(0, 8).map((p) => (
            <div key={p.id} className="py-0.5" style={{ color: 'var(--ffi-ink)' }}>
              <span className="ffi-badge text-[10px] mr-1" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>{p.position}</span>
              {p.name}
            </div>
          ))}
        </div>
        <div>
          <h4 className="font-medium mb-2" style={{ color: 'var(--ffi-ink)' }}>Only in Run B ({onlyInB.length})</h4>
          {onlyInB.slice(0, 8).map((p) => (
            <div key={p.id} className="py-0.5" style={{ color: 'var(--ffi-ink)' }}>
              <span className="ffi-badge text-[10px] mr-1" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>{p.position}</span>
              {p.name}
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
