'use client'

/**
 * ManualPickEntry (FF-033, FF-257)
 *
 * Quick-entry UI for manually recording a draft pick:
 * 1. Search/filter player by name
 * 2. Select from filtered results
 * 3. Choose manager
 * 4. Enter price (auction) or auto-assign round (snake)
 * 5. Submit → applyPick
 *
 * FF-257: Two layout variants:
 *  - `card` (default): vertical Card layout — backward compatible
 *  - `bar`: horizontal chrome-less layout for sticky bottom bar.
 *          Parent supplies the positioning + glass background.
 *          On mobile, defaults to collapsed (search + submit only);
 *          tap chevron to expand for manager + price.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { PenLine, Search, Check, Undo2, ChevronUp, ChevronDown } from 'lucide-react'
import type { Player } from '@/lib/players/types'
import type { DraftFormat } from '@/lib/supabase/database.types'
import type { DraftPick } from '@/lib/draft/state'

const posColors: Record<string, string> = {
  QB: 'bg-red-500/15 text-red-400 border-red-500/30',
  RB: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  WR: 'bg-green-500/15 text-green-400 border-green-500/30',
  TE: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  K: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  DEF: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

interface ManualPickEntryProps {
  players: Player[]
  draftedNames: Set<string>
  managerNames: string[]
  format: DraftFormat
  currentManager?: string // snake: whose turn it is
  currentRound?: number   // snake: what round
  onSubmit: (pick: Omit<DraftPick, 'pick_number'>) => void
  onUndo: () => void
  canUndo: boolean
  /** Layout variant. 'card' (default) = legacy vertical Card. 'bar' = chrome-less horizontal for sticky bottom bar. */
  variant?: 'card' | 'bar'
}

export function ManualPickEntry({
  players,
  draftedNames,
  managerNames,
  format,
  currentManager,
  currentRound,
  onSubmit,
  onUndo,
  canUndo,
  variant = 'card',
}: ManualPickEntryProps) {
  // Bar mode: track expanded/collapsed for mobile compactness.
  // Default collapsed on small screens (single-row), expanded on desktop.
  const [expanded, setExpanded] = useState(false)
  useEffect(() => {
    if (variant === 'bar' && typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpanded(window.matchMedia('(min-width: 1024px)').matches)
    }
  }, [variant])
  const [search, setSearch] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [manager, setManager] = useState(currentManager || managerNames[0] || '')
  const [price, setPrice] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Sync manager state when snake draft turn changes (prop → state pattern)
  // This is a valid use case for useEffect setState: syncing external state
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currentManager) setManager(currentManager)
  }, [currentManager])

  // Available players (not drafted)
  const available = useMemo(() =>
    players.filter(p => !draftedNames.has(p.name.toLowerCase())),
    [players, draftedNames],
  )

  // Filtered by search
  const filtered = useMemo(() => {
    if (!search.trim()) return []
    const q = search.toLowerCase()
    return available
      .filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.position.toLowerCase() === q
      )
      .slice(0, 8) // max 8 results
  }, [available, search])

  // Close results on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        resultsRef.current && !resultsRef.current.contains(e.target as Node) &&
        searchRef.current && !searchRef.current.contains(e.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const selectPlayer = (player: Player) => {
    setSelectedPlayer(player)
    setSearch(player.name)
    setShowResults(false)
    // Pre-fill price with consensus value for auction
    if (format === 'auction') {
      setPrice(String(player.consensusAuctionValue || 1))
    }
  }

  const handleSubmit = () => {
    if (!selectedPlayer || !manager) return

    const pick: Omit<DraftPick, 'pick_number'> = {
      player_name: selectedPlayer.name,
      position: selectedPlayer.position,
      manager,
      price: format === 'auction' ? parseInt(price, 10) || 1 : undefined,
      round: format === 'snake' ? currentRound : undefined,
    }

    onSubmit(pick)

    // Reset form
    setSelectedPlayer(null)
    setSearch('')
    setPrice('')
    searchRef.current?.focus()
  }

  const isValid = selectedPlayer && manager && (format === 'snake' || (price && parseInt(price, 10) > 0))

  // ============================================================
  // BAR variant — chrome-less horizontal layout for sticky bottom bar (FF-257)
  // Parent owns positioning + glass background.
  // ============================================================
  if (variant === 'bar') {
    return (
      <div className="w-full">
        {/* Always-visible row: search + record + expand toggle */}
        <div className="flex items-center gap-2">
          {/* Player search (flex-1 to fill) */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--ffi-text-secondary)] pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder={selectedPlayer ? selectedPlayer.name : 'Search player…'}
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setSelectedPlayer(null)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
              className="pl-8 h-11 text-base"
              aria-label="Search player"
            />

            {/* Search results dropdown — opens UPWARD from a bottom bar */}
            {showResults && filtered.length > 0 && (
              <div
                ref={resultsRef}
                className="absolute z-50 w-full bottom-full mb-1 rounded-md border border-[var(--ffi-border)] bg-[var(--ffi-surface)] shadow-lg max-h-64 overflow-auto ffi-glass"
              >
                {filtered.map(player => (
                  <button
                    key={player.id}
                    onClick={() => selectPlayer(player)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--ffi-primary)]/10 transition-colors text-sm"
                  >
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${posColors[player.position] ?? ''}`}>
                      {player.position}
                    </Badge>
                    <span className="flex-1 font-medium truncate">{player.name}</span>
                    <span className="text-xs text-[var(--ffi-text-secondary)]">{player.team}</span>
                    {format === 'auction' && (
                      <span className="text-xs font-mono text-[var(--ffi-text-secondary)]">${player.consensusAuctionValue}</span>
                    )}
                    {format === 'snake' && player.adp > 0 && (
                      <span className="text-xs font-mono text-[var(--ffi-text-secondary)]">ADP {player.adp.toFixed(1)}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price (auction, always visible — small inline) */}
          {format === 'auction' && (
            <div className="relative w-16 shrink-0">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--ffi-text-secondary)] pointer-events-none">$</span>
              <Input
                type="number"
                min={1}
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="pl-5 h-11 text-base text-center"
                aria-label="Price"
              />
            </div>
          )}

          {/* Submit (44px touch target) */}
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="h-11 px-4 shrink-0 min-w-[88px]"
            size="default"
          >
            Record
          </Button>

          {/* Expand/collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(e => !e)}
            className="h-11 w-11 p-0 shrink-0"
            aria-label={expanded ? 'Collapse' : 'Expand'}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>

        {/* Expanded row: manager + undo + selected player confirmation */}
        {expanded && (
          <div className="mt-2 flex items-center gap-2">
            {/* Manager */}
            <div className="flex-1 min-w-0">
              <Select value={manager} onValueChange={v => { if (v) setManager(v) }}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Manager" />
                </SelectTrigger>
                <SelectContent>
                  {managerNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Round indicator (snake only — read-only) */}
            {format === 'snake' && currentRound && (
              <div className="ffi-caption px-2 py-1 rounded bg-[var(--ffi-surface-2)] text-[var(--ffi-text-secondary)] shrink-0">
                Rd {currentRound}
              </div>
            )}

            {/* Selected player confirmation */}
            {selectedPlayer && (
              <div className="flex items-center gap-1 text-xs text-[var(--ffi-text-secondary)] truncate">
                <Check className="h-3 w-3 text-[var(--ffi-success)] shrink-0" />
                <span className="truncate">{selectedPlayer.team}</span>
              </div>
            )}

            {/* Undo */}
            {canUndo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                className="h-9 px-2 text-xs gap-1 shrink-0"
                aria-label="Undo last pick"
              >
                <Undo2 className="h-3 w-3" />
                Undo
              </Button>
            )}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // CARD variant — original vertical layout (backward compatible)
  // ============================================================
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <PenLine className="h-4 w-4" />
            Enter Pick
          </span>
          {canUndo && (
            <Button variant="ghost" size="sm" onClick={onUndo} className="h-7 text-xs gap-1">
              <Undo2 className="h-3 w-3" />
              Undo
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Player search */}
        <div className="relative">
          <Label className="text-xs text-muted-foreground mb-1 block">Player</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search player..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setSelectedPlayer(null)
                setShowResults(true)
              }}
              onFocus={() => setShowResults(true)}
              className="pl-8 h-9"
            />
          </div>

          {/* Search results dropdown */}
          {showResults && filtered.length > 0 && (
            <div
              ref={resultsRef}
              className="absolute z-50 w-full mt-1 rounded-md border border-border bg-popover shadow-md max-h-56 overflow-auto"
            >
              {filtered.map(player => (
                <button
                  key={player.id}
                  onClick={() => selectPlayer(player)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors text-sm"
                >
                  <Badge variant="outline" className={`text-[10px] px-1 py-0 ${posColors[player.position] ?? ''}`}>
                    {player.position}
                  </Badge>
                  <span className="flex-1 font-medium">{player.name}</span>
                  <span className="text-xs text-muted-foreground">{player.team}</span>
                  {format === 'auction' && (
                    <span className="text-xs font-mono text-muted-foreground">${player.consensusAuctionValue}</span>
                  )}
                  {format === 'snake' && player.adp > 0 && (
                    <span className="text-xs font-mono text-muted-foreground">ADP {player.adp.toFixed(1)}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Selected player confirmation */}
          {selectedPlayer && (
            <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-green-400" />
              <Badge variant="outline" className={`text-[10px] px-1 py-0 ${posColors[selectedPlayer.position] ?? ''}`}>
                {selectedPlayer.position}
              </Badge>
              {selectedPlayer.name} — {selectedPlayer.team}
            </div>
          )}
        </div>

        {/* Manager + Price/Round row */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground mb-1 block">Manager</Label>
            <Select value={manager} onValueChange={v => { if (v) setManager(v) }}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {managerNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {format === 'auction' && (
            <div className="w-24">
              <Label className="text-xs text-muted-foreground mb-1 block">Price</Label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  min={1}
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="pl-6 h-9"
                />
              </div>
            </div>
          )}

          {format === 'snake' && currentRound && (
            <div className="w-20">
              <Label className="text-xs text-muted-foreground mb-1 block">Round</Label>
              <Input
                type="number"
                value={currentRound}
                disabled
                className="h-9 text-center"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="w-full h-9"
          size="sm"
        >
          Record Pick
        </Button>
      </CardContent>
    </Card>
  )
}
