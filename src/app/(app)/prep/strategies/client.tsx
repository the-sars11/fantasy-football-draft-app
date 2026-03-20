'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StrategyProposals } from '@/components/prep/strategy-proposals'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { DraftFormat } from '@/lib/players/types'

interface LeagueSummary {
  id: string
  name: string
  format: DraftFormat
  team_count: number
  platform: string
}

export function StrategiesPageClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeagues() {
      try {
        const res = await fetch('/api/leagues')
        if (!res.ok) throw new Error('Failed to fetch leagues')
        const data = await res.json()
        setLeagues(data.leagues || [])
        // Auto-select first league
        if (data.leagues?.length > 0) {
          setSelectedLeagueId(data.leagues[0].id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load leagues')
      } finally {
        setLoading(false)
      }
    }
    fetchLeagues()
  }, [])

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId)

  const handleSave = async (proposal: StrategyProposal) => {
    if (!selectedLeagueId) return

    try {
      const res = await fetch('/api/strategies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId: selectedLeagueId,
          proposal,
          setActive: true,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save strategy')
      }

      // TODO: navigate to strategy editor or show success
      alert(`Strategy "${proposal.name}" saved as active!`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save strategy')
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading leagues...</div>
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="rounded-md bg-muted/50 border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No leagues configured yet.{' '}
          <a href="/prep/configure" className="text-primary underline underline-offset-4">
            Configure a league
          </a>{' '}
          to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* League selector */}
      <div className="flex items-center gap-3">
        <Select value={selectedLeagueId ?? ''} onValueChange={setSelectedLeagueId}>
          <SelectTrigger className="w-[260px]">
            <SelectValue placeholder="Select a league" />
          </SelectTrigger>
          <SelectContent>
            {leagues.map((league) => (
              <SelectItem key={league.id} value={league.id}>
                {league.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedLeague && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedLeague.format === 'auction' ? 'Auction' : 'Snake'}
            </Badge>
            <Badge variant="secondary">
              {selectedLeague.team_count} teams
            </Badge>
          </div>
        )}
      </div>

      {/* Strategy proposals */}
      {selectedLeague && (
        <StrategyProposals
          leagueId={selectedLeague.id}
          format={selectedLeague.format}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
