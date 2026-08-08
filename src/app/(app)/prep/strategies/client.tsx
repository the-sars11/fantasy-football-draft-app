'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { StrategyProposals } from '@/components/prep/strategy-proposals'
import { StrategyEditor } from '@/components/prep/strategy-editor'
import { StrategyList } from '@/components/prep/strategy-list'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { Strategy, StrategyUpdate } from '@/lib/supabase/database.types'
import type { DraftFormat, Player } from '@/lib/players/types'
import { cacheToPlayers } from '@/lib/players/convert'
import { AlertTriangle, Sparkles, SlidersHorizontal, PlayCircle, ChevronRight, Pencil } from 'lucide-react'

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
  const fetchLeagues = useCallback(async () => {
    setLoading(true)
    setError(null)
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
  }, [])

  useEffect(() => {
    fetchLeagues()
  }, [fetchLeagues])

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
      <div className="pb-2">
        <StrategiesHeader />
        <div className="ffi-skeleton rounded-[16px]" style={{ height: '148px' }} />
        <div className="flex flex-col gap-[6px] mt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="ffi-skeleton rounded-[14px]" style={{ height: '64px' }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-2">
        <StrategiesHeader />
        <div
          className="rounded-[14px] p-6 text-center"
          style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
        >
          <AlertTriangle className="h-7 w-7 mx-auto mb-2.5" style={{ color: 'var(--ffi-warning)' }} />
          <p className="text-[15px] font-bold mb-1" style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}>
            Couldn&apos;t load strategies
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--ffi-ink-2)' }}>
            {error}. Check your connection and try again.
          </p>
          <button
            onClick={fetchLeagues}
            className="ffi-btn-secondary inline-flex items-center gap-2 text-[13px]"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="pb-2">
        <StrategiesHeader />
        <div
          className="rounded-[14px] p-8 text-center"
          style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
        >
          <Sparkles className="h-7 w-7 mx-auto mb-2.5" style={{ color: 'var(--ffi-ink-3)' }} />
          <p className="text-[16px] font-bold mb-1" style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}>
            No leagues configured
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--ffi-ink-2)' }}>
            Configure your league first, then build a draft strategy.
          </p>
          <Link
            href="/prep/configure"
            className="ffi-btn-secondary inline-flex items-center gap-2 text-[13px]"
          >
            Configure a league
          </Link>
        </div>
      </div>
    )
  }

  // If editing, show the editor
  if (editingStrategy && selectedLeague) {
    return (
      <div className="pb-2">
        {/* Back + league context bar */}
        <button
          onClick={() => setEditingStrategy(null)}
          className="flex items-center gap-1.5 text-[12px] mb-3 transition-colors"
          style={{ color: 'var(--ffi-ink-2)' }}
        >
          <ChevronRight className="h-3.5 w-3.5 rotate-180" />
          Back to strategies
        </button>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[15px] font-bold" style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}>
            {selectedLeague.name}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(121,166,255,0.14)', color: 'var(--ffi-blue-bright)' }}
          >
            {selectedLeague.format === 'auction' ? 'Auction' : 'Snake'}
          </span>
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

  const activeStrategy = savedStrategies.find((s) => s.is_active) ?? null

  return (
    <div className="pb-2">
      <StrategiesHeader leagueName={selectedLeague?.name} />

      {/* Active-strategy hero */}
      {strategiesLoading ? (
        <div className="ffi-skeleton rounded-[16px]" style={{ height: '148px' }} />
      ) : activeStrategy ? (
        <ActiveStrategyHero
          strategy={activeStrategy}
          budget={selectedLeague?.budget ?? 200}
          onEdit={() => setEditingStrategy(activeStrategy)}
        />
      ) : (
        <StrategyEmptyHero hasSaved={savedStrategies.length > 0} />
      )}

      {/* Saved-strategy list (load / compare) */}
      {selectedLeague && savedStrategies.length > 0 && (
        <div className="mt-6">
          <QuietLabel>All strategies</QuietLabel>
          <div className="mt-2">
            <StrategyList
              strategies={savedStrategies}
              format={selectedLeague.format}
              onEdit={setEditingStrategy}
              onDelete={handleDelete}
              onSetActive={handleSetActive}
              onDuplicate={handleDuplicate}
            />
          </div>
        </div>
      )}

      {/* Build a new strategy (AI — explicit tap) */}
      {selectedLeague && (
        <div className="mt-6">
          <QuietLabel>Build a new strategy</QuietLabel>
          <div className="mt-2">
            <StrategyProposals
              leagueId={selectedLeague.id}
              format={selectedLeague.format}
              onSave={handleSaveProposal}
            />
          </div>
        </div>
      )}

      {/* Dry Run — quiet power-tool row */}
      <Link
        href="/prep/simulate"
        className="ffi-card-interactive flex items-center gap-3 mt-6 rounded-[14px] px-4 py-3.5"
      >
        <PlayCircle className="h-5 w-5 shrink-0" style={{ color: 'var(--ffi-ink-2)' }} />
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold" style={{ color: 'var(--ffi-ink)' }}>
            Dry-run this strategy
          </div>
          <div className="text-[12px]" style={{ color: 'var(--ffi-ink-3)' }}>
            Simulate a full auction against the field
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--ffi-ink-3)' }} />
      </Link>
    </div>
  )
}

// --- Screen header (matches 9.1 / 9.2 / 9.3 pattern) ---
function StrategiesHeader({ leagueName }: { leagueName?: string }) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <h1
        className="text-[26px] font-bold leading-none"
        style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)', letterSpacing: '-0.01em' }}
      >
        Strategies
      </h1>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
        style={{ background: 'rgba(121,166,255,0.14)', color: 'var(--ffi-blue-bright)' }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--ffi-volt)' }} />
        {leagueName ?? 'The Nasties'}
      </span>
    </div>
  )
}

function QuietLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--ffi-ink-3)' }}>
      {children}
    </span>
  )
}

// --- Active-strategy hero: name + budget-by-position glance ---
function ActiveStrategyHero({
  strategy,
  budget,
  onEdit,
}: {
  strategy: Strategy
  budget: number
  onEdit: () => void
}) {
  // Prefer explicit dollar allocation; fall back to position weights → dollars.
  const alloc = strategy.budget_allocation
  const weights = strategy.position_weights as Record<string, number>
  const rows: { pos: string; dollars: number }[] = []
  const CORE = ['QB', 'RB', 'WR', 'TE']
  if (alloc && Object.keys(alloc).length > 0) {
    for (const pos of CORE) {
      if (alloc[pos] != null) rows.push({ pos, dollars: Math.round(alloc[pos]) })
    }
  } else if (weights) {
    const total = CORE.reduce((s, p) => s + (weights[p] ?? 0), 0) || 1
    for (const pos of CORE) {
      const w = weights[pos] ?? 0
      rows.push({ pos, dollars: Math.round((w / total) * budget) })
    }
  }
  const maxDollars = Math.max(1, ...rows.map((r) => r.dollars))

  return (
    <div className="ffi-hero rounded-[16px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest"
              style={{ background: 'var(--ffi-volt)', color: 'var(--ffi-volt-ink)' }}
            >
              Active
            </span>
            <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--ffi-ink-3)' }}>
              {strategy.archetype}
            </span>
          </div>
          <h2
            className="text-[22px] font-bold leading-tight truncate"
            style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
          >
            {strategy.name}
          </h2>
        </div>
        <button
          onClick={onEdit}
          className="ffi-btn-secondary inline-flex items-center gap-1.5 text-[12px] shrink-0"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
      </div>

      {rows.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ffi-ink-3)' }}>
            Budget by position
          </div>
          <div className="flex flex-col gap-2">
            {rows.map((r) => (
              <div key={r.pos} className="flex items-center gap-3">
                <span
                  className="w-8 text-[12px] font-bold"
                  style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink-2)' }}
                >
                  {r.pos}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--ffi-surface-1)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(r.dollars / maxDollars) * 100}%`, background: 'var(--ffi-volt)' }}
                  />
                </div>
                <span
                  className="w-12 text-right text-[13px] font-bold tabular-nums"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink)' }}
                >
                  ${r.dollars}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Empty hero: no active strategy yet ---
function StrategyEmptyHero({ hasSaved }: { hasSaved: boolean }) {
  return (
    <div
      className="rounded-[16px] p-8 text-center"
      style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
    >
      <SlidersHorizontal className="h-7 w-7 mx-auto mb-2.5" style={{ color: 'var(--ffi-ink-3)' }} />
      <p className="text-[17px] font-bold mb-1" style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}>
        {hasSaved ? 'No active strategy' : 'No strategy yet'}
      </p>
      <p className="text-[13px] max-w-xs mx-auto" style={{ color: 'var(--ffi-ink-2)' }}>
        {hasSaved
          ? 'Pick one from your saved strategies below to make it active.'
          : 'Start from a template or build one with AI below. Your active plan feeds the Board and the live draft room.'}
      </p>
    </div>
  )
}
