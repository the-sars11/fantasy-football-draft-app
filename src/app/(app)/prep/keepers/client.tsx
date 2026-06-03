'use client'

/**
 * KeeperDeclarationClient (P0 redesign — /prep/keepers)
 *
 * Declare keepers weeks before draft day.
 * Persists to localStorage: key = `ffi_keepers_${leagueId}`
 * Draft Setup Step 3 reads from this same storage.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Plus, Trash2, Loader2, Lock, ChevronDown, ChevronRight, TrendingUp } from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFISectionHeader,
  FFIBadge,
} from '@/components/ui/ffi-primitives'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { analyzeKeeperValues } from '@/lib/draft/keepers'
import type { KeeperAssignment, KeeperValue } from '@/lib/draft/keepers'
import type { Player } from '@/lib/players/types'

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

function normalizePosition(raw: string): Position | null {
  const upper = raw.toUpperCase().replace(/\s/g, '')
  if (upper === 'DEF' || upper === 'D/ST' || upper === 'DST') return 'DST'
  if ((POSITIONS as readonly string[]).includes(upper)) return upper as Position
  return null
}

/**
 * Parse raw text copied from Yahoo's keeper confirmation page.
 *
 * Handles two formats:
 *   Format 1 (colon style): "Round 3: Justin Jefferson (WR) - Tyler"
 *   Format 2 (tabular):     "Justin Jefferson  WR  Round 3  Tyler"
 *
 * Returns parsed entries and a count of lines that couldn't be parsed.
 */
function parseYahooKeeperText(
  raw: string,
  managerFallback: string
): { entries: Omit<KeeperEntry, 'id'>[]; skipped: number } {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const entries: Omit<KeeperEntry, 'id'>[] = []
  let skipped = 0

  for (const line of lines) {
    // Format 1: "Round N: Player Name (POS) - Manager"
    const fmt1 = line.match(/^Round\s+(\d+)\s*:\s*(.+?)\s*\(([^)]+)\)\s*(?:-\s*(.+))?$/i)
    if (fmt1) {
      const round = parseInt(fmt1[1], 10)
      const playerName = fmt1[2].trim()
      const pos = normalizePosition(fmt1[3])
      const manager = fmt1[4]?.trim() || managerFallback
      if (pos && round > 0 && playerName) {
        entries.push({ player_name: playerName, position: pos, manager, cost: round })
        continue
      }
    }

    // Format 2: "Player Name  POS  Round N  Manager" (2+ spaces as delimiter)
    const fmt2 = line.match(/^(.+?)\s{2,}([A-Za-z/]+)\s{2,}Round\s+(\d+)(?:\s{2,}(.*))?$/i)
    if (fmt2) {
      const playerName = fmt2[1].trim()
      const pos = normalizePosition(fmt2[2])
      const round = parseInt(fmt2[3], 10)
      const manager = fmt2[4]?.trim() || managerFallback
      if (pos && round > 0 && playerName) {
        entries.push({ player_name: playerName, position: pos, manager, cost: round })
        continue
      }
    }

    skipped++
  }

  return { entries, skipped }
}

export function KeeperDeclarationClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>('')
  const [keepers, setKeepers] = useState<KeeperEntry[]>([])
  const [loadingLeagues, setLoadingLeagues] = useState(true)
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)

  // Yahoo import state
  const [importOpen, setImportOpen] = useState(false)
  const [importRaw, setImportRaw] = useState('')
  const [importFeedback, setImportFeedback] = useState<{ imported: number; skipped: number } | null>(null)

  // Player data for equity calculation
  const [players, setPlayers] = useState<Player[]>([])
  const [playersLoading, setPlayersLoading] = useState(false)

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
      initialized.current = false
      setKeepers(loadKeepers(selectedLeagueId))
      setSaved(false)
      const t = setTimeout(() => { initialized.current = true }, 0)
      return () => clearTimeout(t)
    }
  }, [selectedLeagueId])

  // Auto-save when keepers change
  useEffect(() => {
    if (!selectedLeagueId || !initialized.current) return
    saveKeepers(selectedLeagueId, keepers)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 2000)
    return () => clearTimeout(t)
  }, [keepers, selectedLeagueId])

  // Lazy-load player data when keepers exist (needed for equity calc)
  useEffect(() => {
    if (!selectedLeagueId || keepers.length === 0 || players.length > 0) return
    setPlayersLoading(true)
    fetch('/api/players')
      .then(r => r.json())
      .then(data => { if (data.players) setPlayers(data.players) })
      .catch(() => {})
      .finally(() => setPlayersLoading(false))
  }, [selectedLeagueId, keepers.length, players.length])

  // Keeper equity: cost vs. market value, sorted best deal first
  const keeperEquity = useMemo((): (KeeperValue & { hasData: boolean })[] => {
    const named = keepers.filter(k => k.player_name.trim())
    if (named.length === 0 || players.length === 0) return []
    const knownNames = new Set(players.map(p => p.name.toLowerCase()))
    return analyzeKeeperValues(
      named as unknown as KeeperAssignment[],
      players,
      isAuction ? 'auction' : 'snake',
    )
      .map(kv => ({ ...kv, hasData: knownNames.has(kv.player_name.toLowerCase()) }))
      .sort((a, b) => b.surplus - a.surplus)
  }, [keepers, players, isAuction])

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

  const handleImport = useCallback(() => {
    const managerFallback = keepers.find(k => k.manager)?.manager ?? ''
    const { entries, skipped } = parseYahooKeeperText(importRaw, managerFallback)
    const existingNames = new Set(keepers.map(k => k.player_name.toLowerCase()))
    const seen = new Set<string>()
    const newEntries: KeeperEntry[] = []
    for (const e of entries) {
      const key = e.player_name.toLowerCase()
      if (!existingNames.has(key) && !seen.has(key)) {
        seen.add(key)
        newEntries.push({ ...e, id: crypto.randomUUID() })
      }
    }
    setKeepers(prev => [...prev, ...newEntries])
    setImportFeedback({ imported: newEntries.length, skipped })
  }, [importRaw, keepers])

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

          {/* Import from Yahoo — snake leagues only */}
          {!isAuction && (
            <FFICard>
              <button
                type="button"
                className="flex items-center gap-2 w-full text-left"
                onClick={() => setImportOpen(o => !o)}
              >
                {importOpen
                  ? <ChevronDown className="h-4 w-4 text-[var(--ffi-text-secondary)]" />
                  : <ChevronRight className="h-4 w-4 text-[var(--ffi-text-secondary)]" />
                }
                <span className="ffi-title-md text-white">Import from Yahoo</span>
                <span className="ffi-caption text-[var(--ffi-text-secondary)] ml-auto">
                  Paste keeper text to auto-fill
                </span>
              </button>

              {importOpen && (
                <div className="mt-4 space-y-3">
                  <textarea
                    className="w-full h-32 px-3 py-2 text-sm rounded-lg border border-[var(--ffi-border)] bg-[var(--ffi-surface)] text-white placeholder:text-[var(--ffi-text-secondary)] resize-y focus:outline-none focus:ring-1 focus:ring-[var(--ffi-border)]"
                    placeholder={"Round 3: Justin Jefferson (WR) - Tyler\nRound 7: Davante Adams (WR) - Tyler\nRound 11: Mark Andrews (TE) - Tyler"}
                    value={importRaw}
                    onChange={e => { setImportRaw(e.target.value); setImportFeedback(null) }}
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <FFIButton
                      onClick={handleImport}
                      disabled={!importRaw.trim()}
                    >
                      Parse &amp; Import
                    </FFIButton>
                    {importFeedback !== null && (
                      <span className="ffi-caption">
                        {importFeedback.imported > 0 ? (
                          <span className="text-[var(--ffi-success)]">
                            {importFeedback.imported} keeper{importFeedback.imported !== 1 ? 's' : ''} imported
                          </span>
                        ) : (
                          <span className="text-[var(--ffi-text-secondary)]">Nothing new to import</span>
                        )}
                        {importFeedback.skipped > 0 && (
                          <span className="text-amber-400 ml-2">
                            , {importFeedback.skipped} line{importFeedback.skipped !== 1 ? 's' : ''} skipped
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </FFICard>
          )}

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

          {/* Keeper Equity Panel */}
          {keepers.filter(k => k.player_name.trim()).length > 0 && (
            <FFICard>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-[var(--ffi-accent)]" />
                <span className="ffi-title-md text-white">Keeper Equity</span>
                <span className="ffi-caption text-[var(--ffi-text-secondary)] ml-auto">
                  {isAuction ? 'cost vs. auction value' : 'round cost vs. ADP round'}
                </span>
              </div>

              {playersLoading ? (
                <div className="flex items-center gap-2 py-3 text-[var(--ffi-text-secondary)]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ffi-body-md">Loading market data...</span>
                </div>
              ) : keeperEquity.length === 0 ? (
                <p className="ffi-body-md text-[var(--ffi-text-secondary)] py-2">
                  Run a research pass to load market data.
                </p>
              ) : (
                <div className="space-y-2">
                  {keeperEquity.map((kv) => {
                    const surplusAbs = Math.abs(kv.surplus)
                    const surplusColor =
                      !kv.hasData ? 'text-[var(--ffi-text-muted)]'
                      : kv.surplus > 0 ? 'text-[var(--ffi-success)]'
                      : kv.surplus < 0 ? 'text-[var(--ffi-danger)]'
                      : 'text-[var(--ffi-text-secondary)]'
                    const surplusLabel =
                      !kv.hasData ? '-'
                      : kv.surplus > 0 ? `+${surplusAbs}${isAuction ? ' $' : ' rd'}`
                      : kv.surplus < 0 ? `-${surplusAbs}${isAuction ? ' $' : ' rd'}`
                      : `±0`

                    return (
                      <div
                        key={kv.player_name}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--ffi-border)]/20 bg-[var(--ffi-surface)]"
                      >
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-[#8bacff]/10 text-[#8bacff]">
                          {kv.position}
                        </span>
                        <span className="ffi-body-md text-white flex-1 truncate min-w-0">
                          {kv.player_name}
                        </span>
                        <span className="ffi-caption text-[var(--ffi-text-secondary)] shrink-0">
                          {isAuction ? `$${kv.cost}` : `Rd ${kv.cost}`}
                        </span>
                        <span className="ffi-caption text-[var(--ffi-text-muted)] shrink-0">
                          {kv.hasData
                            ? isAuction ? `mkt $${kv.marketValue}` : `ADP Rd ${kv.marketValue}`
                            : 'no data'}
                        </span>
                        <span className={`ffi-caption font-mono font-bold w-12 text-right shrink-0 ${surplusColor}`}>
                          {surplusLabel}
                        </span>
                      </div>
                    )
                  })}
                  <p className="ffi-caption text-[var(--ffi-text-muted)] pt-1">
                    {isAuction ? 'Positive = paying less than market value' : 'Positive = keeping in a later round than ADP'}
                  </p>
                </div>
              )}
            </FFICard>
          )}
        </>
      )}
    </div>
  )
}
