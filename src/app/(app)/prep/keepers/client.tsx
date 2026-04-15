'use client'

/**
 * KeeperDeclarationClient (P0 redesign — /prep/keepers)
 *
 * Declare keepers weeks before draft day.
 * Persists to localStorage: key = `ffi_keepers_${leagueId}`
 * Draft Setup Step 3 reads from this same storage.
 */

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Loader2, Lock } from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFISectionHeader,
  FFIBadge,
} from '@/components/ui/ffi-primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST'] as const
type Position = typeof POSITIONS[number]

export interface KeeperEntry {
  id: string
  player_name: string
  position: Position
  manager: string
  cost: number // round number (snake) or auction price
}

interface LeagueSummary {
  id: string
  name: string
  format: 'auction' | 'snake'
  team_count: number
  keeper_enabled: boolean
  keeper_settings: { max_keepers: number; cost_type: 'round' | 'auction_price' } | null
}

function storageKey(leagueId: string) {
  return `ffi_keepers_${leagueId}`
}

function loadKeepers(leagueId: string): KeeperEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(leagueId))
    return raw ? (JSON.parse(raw) as KeeperEntry[]) : []
  } catch {
    return []
  }
}

function saveKeepers(leagueId: string, keepers: KeeperEntry[]): void {
  try {
    localStorage.setItem(storageKey(leagueId), JSON.stringify(keepers))
  } catch {
    // Silently ignore storage errors
  }
}

export function KeeperDeclarationClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')
  const [keepers, setKeepers] = useState<KeeperEntry[]>([])
  const [loadingLeagues, setLoadingLeagues] = useState(true)
  const [saved, setSaved] = useState(false)

  const selectedLeague = leagues.find(l => l.id === selectedLeagueId)
  const isAuction = selectedLeague?.format === 'auction'
  const maxKeepers = selectedLeague?.keeper_settings?.max_keepers ?? 3

  // Load leagues on mount
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/leagues')
        const data = await res.json()
        if (data.leagues) {
          const keeperLeagues = (data.leagues as LeagueSummary[]).filter(l => l.keeper_enabled)
          setLeagues(keeperLeagues)
          if (keeperLeagues.length === 1) {
            setSelectedLeagueId(keeperLeagues[0].id)
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingLeagues(false)
      }
    }
    load()
  }, [])

  // Load keepers when league changes
  useEffect(() => {
    if (selectedLeagueId) {
      setKeepers(loadKeepers(selectedLeagueId))
      setSaved(false)
    }
  }, [selectedLeagueId])

  // Auto-save when keepers change
  useEffect(() => {
    if (selectedLeagueId && keepers.length >= 0) {
      saveKeepers(selectedLeagueId, keepers)
      setSaved(true)
      const t = setTimeout(() => setSaved(false), 2000)
      return () => clearTimeout(t)
    }
  }, [keepers, selectedLeagueId])

  const addKeeper = useCallback(() => {
    setKeepers(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        player_name: '',
        position: 'RB',
        manager: '',
        cost: isAuction ? 10 : 5,
      },
    ])
  }, [isAuction])

  const updateKeeper = useCallback((id: string, field: keyof KeeperEntry, value: string | number) => {
    setKeepers(prev => prev.map(k => k.id === id ? { ...k, [field]: value } : k))
  }, [])

  const removeKeeper = useCallback((id: string) => {
    setKeepers(prev => prev.filter(k => k.id !== id))
  }, [])

  if (loadingLeagues) {
    return (
      <div className="flex items-center gap-2 py-8 text-[var(--ffi-text-secondary)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading leagues...
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <FFICard className="py-8 text-center">
        <p className="ffi-body-md text-[var(--ffi-text-secondary)] mb-4">
          No keeper leagues configured. Enable keeper mode in League Settings first.
        </p>
        <FFIButton variant="secondary" onClick={() => { window.location.href = '/prep/configure' }}>
          Configure League
        </FFIButton>
      </FFICard>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <FFISectionHeader
        title="Keeper Declaration"
        subtitle="Declare keepers weeks before draft day. Draft day shows a read-only confirmation."
      />

      {/* League selector (keeper leagues only) */}
      {leagues.length > 1 && (
        <FFICard>
          <Label className="ffi-caption text-[var(--ffi-text-secondary)] mb-2 block">League</Label>
          <Select value={selectedLeagueId} onValueChange={v => { if (v !== null) setSelectedLeagueId(v) }}>
            <SelectTrigger>
              <SelectValue placeholder="Choose league..." />
            </SelectTrigger>
            <SelectContent>
              {leagues.map(l => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FFICard>
      )}

      {selectedLeague && (
        <>
          {/* League info + save indicator */}
          <div className="flex items-center gap-2 flex-wrap">
            <FFIBadge status="info">{selectedLeague.format.toUpperCase()}</FFIBadge>
            <span className="ffi-badge ffi-badge-info opacity-70">{selectedLeague.team_count} teams</span>
            <span className="ffi-badge ffi-badge-info opacity-70">max {maxKeepers}/manager</span>
            {saved && <span className="ffi-caption text-[var(--ffi-success)]">&#10003; Saved</span>}
          </div>

          {/* Keeper list */}
          <FFICard>
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-4 w-4 text-[var(--ffi-text-secondary)]" />
              <span className="ffi-title-md text-white">
                Declared Keepers ({keepers.length})
              </span>
            </div>

            {keepers.length === 0 && (
              <p className="ffi-body-md text-[var(--ffi-text-secondary)] text-center py-4">
                No keepers declared yet.
              </p>
            )}

            <div className="space-y-3">
              {keepers.map((keeper) => (
                <div
                  key={keeper.id}
                  className="flex items-center gap-2 p-3 rounded-lg border border-[var(--ffi-border)]/30 bg-[var(--ffi-surface)]"
                >
                  {/* Position */}
                  <Select
                    value={keeper.position}
                    onValueChange={v => { if (v !== null) updateKeeper(keeper.id, 'position', v) }}
                  >
                    <SelectTrigger className="w-20 h-9 text-sm shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map(pos => (
                        <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Player name */}
                  <Input
                    placeholder="Player name"
                    value={keeper.player_name}
                    onChange={e => updateKeeper(keeper.id, 'player_name', e.target.value)}
                    className="flex-1 h-9 text-sm"
                  />

                  {/* Manager */}
                  <Input
                    placeholder="Manager"
                    value={keeper.manager}
                    onChange={e => updateKeeper(keeper.id, 'manager', e.target.value)}
                    className="w-24 h-9 text-sm shrink-0"
                  />

                  {/* Cost (round or price) */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="ffi-caption text-[var(--ffi-text-secondary)]">
                      {isAuction ? '$' : 'Rd'}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={keeper.cost}
                      onChange={e => updateKeeper(keeper.id, 'cost', parseInt(e.target.value, 10) || 1)}
                      className="w-14 h-9 text-sm text-center"
                    />
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeKeeper(keeper.id)}
                    className="text-[var(--ffi-text-secondary)] hover:text-[var(--ffi-danger)] transition-colors shrink-0"
                    aria-label="Remove keeper"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <FFIButton
              variant="secondary"
              onClick={addKeeper}
              className="mt-4 w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Keeper
            </FFIButton>
          </FFICard>
        </>
      )}
    </div>
  )
}
