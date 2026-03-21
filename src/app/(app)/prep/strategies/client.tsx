'use client'

import { useState, useEffect } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { StrategyProposals } from '@/components/prep/strategy-proposals'
import { StrategyEditor } from '@/components/prep/strategy-editor'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { Strategy, StrategyUpdate } from '@/lib/supabase/database.types'
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

  // Editor state
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)

  useEffect(() => {
    async function fetchLeagues() {
      try {
        const res = await fetch('/api/leagues')
        if (!res.ok) throw new Error('Failed to fetch leagues')
        const data = await res.json()
        setLeagues(data.leagues || [])
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

      const { strategy } = await res.json()
      // Open the editor with the newly saved strategy
      setEditingStrategy(strategy as Strategy)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to save strategy')
    }
  }

  const handleEditorSave = async (updates: StrategyUpdate) => {
    if (!editingStrategy) return

    const res = await fetch('/api/strategies', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        strategyId: editingStrategy.id,
        updates,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to update strategy')
    }

    const { strategy } = await res.json()
    setEditingStrategy(strategy as Strategy)
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

  // If editing, show the editor
  if (editingStrategy && selectedLeague) {
    return (
      <div className="space-y-4">
        {/* League context bar */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{selectedLeague.name}</span>
          <Badge variant="outline" className="text-xs">
            {selectedLeague.format === 'auction' ? 'Auction' : 'Snake'}
          </Badge>
        </div>

        <StrategyEditor
          strategy={editingStrategy}
          format={selectedLeague.format}
          onSave={handleEditorSave}
          onCancel={() => setEditingStrategy(null)}
        />
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
