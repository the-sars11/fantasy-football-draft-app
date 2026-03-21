'use client'

import { useState, useEffect, useCallback } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { StrategyProposals } from '@/components/prep/strategy-proposals'
import { StrategyEditor } from '@/components/prep/strategy-editor'
import { StrategyList } from '@/components/prep/strategy-list'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { Strategy, StrategyUpdate } from '@/lib/supabase/database.types'
import type { DraftFormat, Player } from '@/lib/players/types'
import { cacheToPlayers } from '@/lib/players/convert'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'

interface LeagueSummary {
  id: string
  name: string
  format: DraftFormat
  team_count: number
  budget: number | null
  platform: string
}

export function StrategiesPageClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Saved strategies
  const [savedStrategies, setSavedStrategies] = useState<Strategy[]>([])
  const [strategiesLoading, setStrategiesLoading] = useState(false)

  // Editor state
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null)
  const [players, setPlayers] = useState<Player[]>([])

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId)

  // Fetch cached players for value preview (lazy — only when editing)
  useEffect(() => {
    if (!editingStrategy) return
    let cancelled = false
    async function fetchPlayers() {
      try {
        const res = await fetch('/api/players?limit=300')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && data.players) {
          setPlayers(cacheToPlayers(data.players))
        }
      } catch {
        // Non-critical — preview degrades gracefully
      }
    }
    fetchPlayers()
    return () => { cancelled = true }
  }, [editingStrategy])

  // Fetch leagues
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

  // Fetch saved strategies when league changes
  const refreshStrategies = useCallback(async () => {
    if (!selectedLeagueId) return
    setStrategiesLoading(true)
    try {
      const res = await fetch(`/api/strategies?leagueId=${selectedLeagueId}`)
      if (!res.ok) return
      const data = await res.json()
      setSavedStrategies(data.strategies ?? [])
    } catch {
      // Non-critical
    } finally {
      setStrategiesLoading(false)
    }
  }, [selectedLeagueId])

  useEffect(() => {
    refreshStrategies()
  }, [refreshStrategies])

  // --- Handlers ---

  const handleSaveProposal = async (proposal: StrategyProposal) => {
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
      await refreshStrategies()
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
    await refreshStrategies()
  }

  const handleSaveAsNew = async (updates: StrategyUpdate & { name: string }) => {
    if (!editingStrategy || !selectedLeagueId) return

    // Create a new strategy based on the current editor state
    const res = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId: selectedLeagueId,
        proposal: {
          name: updates.name,
          description: updates.description ?? editingStrategy.description,
          archetype: editingStrategy.archetype,
          risk_tolerance: updates.risk_tolerance ?? editingStrategy.risk_tolerance,
          position_weights: updates.position_weights ?? editingStrategy.position_weights,
          confidence: editingStrategy.ai_confidence,
          reasoning: editingStrategy.ai_reasoning,
          projected_ceiling: editingStrategy.projected_ceiling,
          projected_floor: editingStrategy.projected_floor,
          budget_allocation: updates.budget_allocation,
          max_bid_percentage: updates.max_bid_percentage,
          round_targets: updates.round_targets,
          position_round_priority: updates.position_round_priority,
        },
        setActive: false,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to save new strategy')
    }

    const { strategy } = await res.json()
    await refreshStrategies()
    // Switch to editing the new copy
    setEditingStrategy(strategy as Strategy)
  }

  const handleDelete = async (strategyId: string) => {
    const res = await fetch('/api/strategies', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategyId }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to delete strategy')
    }

    await refreshStrategies()
  }

  const handleSetActive = async (strategyId: string) => {
    if (!selectedLeagueId) return

    const res = await fetch('/api/strategies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategyId, leagueId: selectedLeagueId }),
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || 'Failed to set active strategy')
    }

    await refreshStrategies()
  }

  const handleDuplicate = async (strategy: Strategy) => {
    // Open the editor with this strategy, then user clicks Save As New
    setEditingStrategy(strategy)
  }

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading leagues...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive flex items-start gap-3">
        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">Failed to load data</p>
          <p className="text-destructive/80 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="rounded-lg bg-muted/50 border border-border p-8 text-center space-y-2">
        <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
        <p className="text-sm font-medium">No leagues configured</p>
        <p className="text-sm text-muted-foreground">
          <a href="/prep/configure" className="text-primary underline underline-offset-4">
            Configure a league
          </a>{' '}
          to create strategies.
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
          players={players}
          leagueBudget={selectedLeague.budget ?? undefined}
          onSave={handleEditorSave}
          onSaveAsNew={handleSaveAsNew}
          onCancel={() => setEditingStrategy(null)}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
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

      {/* Saved strategy profiles */}
      {selectedLeague && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Saved Strategies</h3>
          {strategiesLoading ? (
            <div className="text-xs text-muted-foreground">Loading...</div>
          ) : (
            <StrategyList
              strategies={savedStrategies}
              format={selectedLeague.format}
              onEdit={setEditingStrategy}
              onDelete={handleDelete}
              onSetActive={handleSetActive}
              onDuplicate={handleDuplicate}
            />
          )}
        </div>
      )}

      {/* Strategy proposals (generate new) */}
      {selectedLeague && (
        <StrategyProposals
          leagueId={selectedLeague.id}
          format={selectedLeague.format}
          onSave={handleSaveProposal}
        />
      )}
    </div>
  )
}
