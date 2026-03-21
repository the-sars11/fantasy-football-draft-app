'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Eye, GitCompare, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No leagues configured. Set up a league first to run research.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* League selector + Refresh button */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">League:</span>
        <Select value={selectedLeagueId ?? ''} onValueChange={setSelectedLeagueId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select league" />
          </SelectTrigger>
          <SelectContent>
            {leagues.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
                <Badge variant="outline" className="ml-2 text-xs">
                  {l.format}
                </Badge>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Refresh button — FF-028 */}
        <Button
          onClick={handleRefresh}
          disabled={!selectedLeagueId || refreshing}
          size="sm"
          variant="outline"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-1.5" />
          )}
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </Button>

        {/* Refresh feedback */}
        {refreshFeedback && (
          <div
            className={`flex items-center gap-1.5 text-sm ${
              refreshFeedback.type === 'success' ? 'text-green-600' : 'text-red-600'
            }`}
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
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : runs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No research runs saved yet. Run research from the Prep page to create one.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Compare button */}
          {compareIds.length === 2 && (
            <div className="flex items-center gap-2">
              <Button onClick={runCompare} disabled={compareLoading} size="sm">
                {compareLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <GitCompare className="h-4 w-4 mr-1" />}
                Compare Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setCompareIds([]); setCompareRuns([]) }}>
                Clear
              </Button>
            </div>
          )}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Strategy</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Players</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <>
                  <TableRow key={run.id} className={compareIds.includes(run.id) ? 'bg-primary/5' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={compareIds.includes(run.id)}
                        onChange={() => toggleCompare(run.id)}
                        className="h-4 w-4 rounded border-border"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{formatDate(run.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {run.strategy_settings?.name ?? run.strategy_settings?.archetype ?? 'Default'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={run.status === 'completed' ? 'default' : run.status === 'failed' ? 'destructive' : 'secondary'}>
                        {run.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => loadRunDetail(run.id)}>
                        {expandedRunId === run.id ? <ChevronUp className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                        {expandedRunId === run.id ? 'Collapse' : 'View'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedRunId === run.id && (
                    <TableRow key={`${run.id}-detail`}>
                      <TableCell colSpan={6} className="p-0">
                        {detailLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                          </div>
                        ) : expandedRun?.results ? (
                          <RunDetailView run={expandedRun} />
                        ) : (
                          <div className="py-4 px-6 text-muted-foreground text-sm">
                            {expandedRun?.error_message ?? 'No results available'}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
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

  const strategy = run.strategy_settings as { name?: string; archetype?: string }

  return (
    <div className="p-4 space-y-4 bg-muted/30">
      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <div>
          <span className="text-muted-foreground">Players:</span>{' '}
          <span className="font-medium">{results.analysis.totalPlayers}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Targets:</span>{' '}
          <span className="font-medium text-green-500">{results.analysis.targets.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Avoids:</span>{' '}
          <span className="font-medium text-red-500">{results.analysis.avoids.length}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Value Plays:</span>{' '}
          <span className="font-medium text-blue-500">{results.analysis.valuePlays.length}</span>
        </div>
      </div>

      {/* Data sources */}
      <div className="text-sm">
        <span className="text-muted-foreground">Sources:</span>{' '}
        {Object.entries(results.ingest.sources).map(([name, info]) => (
          <Badge key={name} variant={info.success ? 'secondary' : 'destructive'} className="mr-1 text-xs">
            {name} ({info.count})
          </Badge>
        ))}
      </div>

      {/* Top targets */}
      {results.analysis.targets.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Top Targets</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
            {results.analysis.targets.slice(0, 10).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1 rounded bg-background">
                <span>
                  <Badge variant="outline" className="mr-1.5 text-xs w-8 justify-center">{p.position}</Badge>
                  {p.name}
                  <span className="text-muted-foreground ml-1 text-xs">{p.team}</span>
                </span>
                <span className="text-xs font-mono">
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
          <h4 className="text-sm font-medium mb-2">Value Plays</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm">
            {results.analysis.valuePlays.slice(0, 8).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-2 py-1 rounded bg-background">
                <span>
                  <Badge variant="outline" className="mr-1.5 text-xs w-8 justify-center">{p.position}</Badge>
                  {p.name}
                </span>
                <span className="text-xs font-mono">Score: {p.strategyScore}</span>
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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Run Comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Header comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 text-sm">
            <div className="font-medium">{formatDateFull(a.created_at)}</div>
            <Badge variant="secondary">{stratA.name ?? stratA.archetype ?? 'Default'}</Badge>
            <div className="text-muted-foreground">{a.results.analysis.totalPlayers} players</div>
          </div>
          <div className="space-y-1 text-sm">
            <div className="font-medium">{formatDateFull(b.created_at)}</div>
            <Badge variant="secondary">{stratB.name ?? stratB.archetype ?? 'Default'}</Badge>
            <div className="text-muted-foreground">{b.results.analysis.totalPlayers} players</div>
          </div>
        </div>

        {/* Stats comparison */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-center">Run A</TableHead>
              <TableHead className="text-center">Run B</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Total Players</TableCell>
              <TableCell className="text-center">{a.results.analysis.totalPlayers}</TableCell>
              <TableCell className="text-center">{b.results.analysis.totalPlayers}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Targets</TableCell>
              <TableCell className="text-center text-green-500">{a.results.analysis.targets.length}</TableCell>
              <TableCell className="text-center text-green-500">{b.results.analysis.targets.length}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Avoids</TableCell>
              <TableCell className="text-center text-red-500">{a.results.analysis.avoids.length}</TableCell>
              <TableCell className="text-center text-red-500">{b.results.analysis.avoids.length}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Value Plays</TableCell>
              <TableCell className="text-center text-blue-500">{a.results.analysis.valuePlays.length}</TableCell>
              <TableCell className="text-center text-blue-500">{b.results.analysis.valuePlays.length}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {/* Target differences */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2 text-green-500">Shared Targets ({shared.length})</h4>
            {shared.slice(0, 8).map((p) => (
              <div key={p.id} className="py-0.5">
                <Badge variant="outline" className="mr-1 text-xs">{p.position}</Badge>
                {p.name}
              </div>
            ))}
          </div>
          <div>
            <h4 className="font-medium mb-2">Only in Run A ({onlyInA.length})</h4>
            {onlyInA.slice(0, 8).map((p) => (
              <div key={p.id} className="py-0.5">
                <Badge variant="outline" className="mr-1 text-xs">{p.position}</Badge>
                {p.name}
              </div>
            ))}
          </div>
          <div>
            <h4 className="font-medium mb-2">Only in Run B ({onlyInB.length})</h4>
            {onlyInB.slice(0, 8).map((p) => (
              <div key={p.id} className="py-0.5">
                <Badge variant="outline" className="mr-1 text-xs">{p.position}</Badge>
                {p.name}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
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
