'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, XCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SourceFreshness {
  source: string
  fetchedAt: string
  playerCount: number
  status: 'fresh' | 'stale' | 'missing'
}

interface CacheStatus {
  totalPlayers: number
  lastUpdated: string | null
  sourceFreshness: SourceFreshness[]
  isStale: boolean
}

interface RefreshResult {
  success: boolean
  players: number
  upserted: number
  sources: Record<string, { success: boolean; count: number; error?: string }>
  freshness: SourceFreshness[]
  normalizedAt: string
  error?: string
}

const SOURCE_LABELS: Record<string, string> = {
  sleeper: 'Sleeper',
  espn: 'ESPN',
  fantasypros: 'FantasyPros',
  fantasy_footballers: 'Fantasy Footballers',
  fantasypros_articles: 'FP Articles',
  pro_football_reference: 'PFR Historical',
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'fresh':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />
    case 'stale':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    case 'missing':
      return <XCircle className="h-4 w-4 text-red-500" />
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />
  }
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return 'Never'
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  return `${diffDays}d ago`
}

export function DataFreshness() {
  const [status, setStatus] = useState<CacheStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshResult, setRefreshResult] = useState<RefreshResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/players/status')
      if (!res.ok) throw new Error('Failed to fetch cache status')
      const data = await res.json()
      setStatus(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleRefresh = async () => {
    setRefreshing(true)
    setRefreshResult(null)
    setError(null)

    try {
      const res = await fetch('/api/players/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scoringFormat: 'ppr' }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Refresh failed')
        return
      }

      setRefreshResult(data)
      // Re-fetch status to update the UI
      await fetchStatus()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Player Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading status...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Player Data</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-8"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Pulling...' : 'Refresh'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Summary */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {status?.totalPlayers || 0} players cached
          </span>
          {status?.lastUpdated && (
            <span className="text-muted-foreground">
              Updated {formatRelativeTime(status.lastUpdated)}
            </span>
          )}
          {status?.isStale && (
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
              Stale
            </Badge>
          )}
        </div>

        {/* Per-source freshness */}
        <div className="space-y-1.5">
          {(status?.sourceFreshness || []).map((sf) => (
            <div key={sf.source} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <StatusIcon status={sf.status} />
                <span>{SOURCE_LABELS[sf.source] || sf.source}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {sf.fetchedAt ? formatRelativeTime(sf.fetchedAt) : 'Not pulled'}
              </span>
            </div>
          ))}
          {(!status?.sourceFreshness || status.sourceFreshness.length === 0) && (
            <div className="text-sm text-muted-foreground">
              No data pulled yet. Click Refresh to pull player data.
            </div>
          )}
        </div>

        {/* Refresh result */}
        {refreshResult && (
          <div className="rounded-md bg-green-500/10 border border-green-500/20 p-2.5 text-sm">
            <div className="font-medium text-green-600 dark:text-green-400">
              Refresh complete
            </div>
            <div className="text-muted-foreground mt-1 space-y-0.5">
              <div>{refreshResult.players} players normalized</div>
              <div>{refreshResult.upserted} cached to database</div>
              {Object.entries(refreshResult.sources).map(([source, result]) => (
                <div key={source} className="flex items-center gap-1.5">
                  {result.success ? (
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500" />
                  )}
                  <span>
                    {SOURCE_LABELS[source]}: {result.success ? `${result.count} players` : result.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2.5 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
