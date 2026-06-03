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
import { PenLine, Search, Check, Undo2 } from 'lucide-react'
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
  /** On Block seat: player currently nominated via BID button */
  onBlockPlayer?: Player | null
  /** Clear the On Block seat (called on × tap or successful record) */
  onClearBlock?: () => void
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
  onBlockPlayer,
  onClearBlock,
}: ManualPickEntryProps) {
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

  // Bar variant: pre-fill price when a player is put On Block
  useEffect(() => {
    if (variant === 'bar' && onBlockPlayer && format === 'auction') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPrice(String(onBlockPlayer.consensusAuctionValue || 1))
    }
    if (variant === 'bar' && !onBlockPlayer && format === 'auction') {
      setPrice('')
    }
  }, [onBlockPlayer, variant, format])

  // Bar variant: is the bar ready to record?
  const isBarValid = !!(onBlockPlayer && manager && (format === 'snake' || (price && parseInt(price, 10) > 0)))

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
  // BAR variant — always-open horizontal layout for sticky bottom bar (FF-257)
  // Parent owns positioning + glass background.
  // On Block seat replaces search input — tap BID on any player card to nominate.
  // ============================================================
  if (variant === 'bar') {
    return (
      <div className="w-full flex items-center gap-2 min-h-[56px]">
        {/* ── On Block slot ── */}
        <div className={`
          flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-w-0 min-h-[44px]
          bg-[var(--ffi-surface-2,#0a1b25)] border transition-colors
          ${onBlockPlayer
            ? 'border-[#8bacff]/30'
            : 'border-[var(--ffi-border,#3c4a53)]/30'}
        `}>
          {onBlockPlayer ? (
            <>
              {/* Position badge */}
              <span className={`
                text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0
                ${posColors[onBlockPlayer.position] ?? 'bg-[#8bacff]/10 text-[#8bacff]'}
              `}>
                {onBlockPlayer.position}
              </span>
              {/* Player name */}
              <span className="ffi-body-md font-semibold text-white flex-1 truncate">
                {onBlockPlayer.name}
              </span>
              {/* Clear button */}
              <button
                onClick={() => {
                  onClearBlock?.()
                  setPrice('')
                }}
                className="w-11 h-11 flex items-center justify-center text-[var(--ffi-text-muted)] hover:text-white transition-colors shrink-0 text-lg"
                aria-label="Clear nomination"
              >
                ×
              </button>
            </>
          ) : (
            <span className="ffi-body-md text-[var(--ffi-text-muted)] italic text-sm">
              Tap BID on any player
            </span>
          )}
        </div>

        {/* ── Manager dropdown (auction) or Round display (snake) ── */}
        {format === 'auction' ? (
          <div className="w-28 shrink-0">
            <Select value={manager} onValueChange={v => { if (v) setManager(v) }}>
              <SelectTrigger className="h-11 text-sm">
                <SelectValue placeholder="Manager" />
              </SelectTrigger>
              <SelectContent>
                {managerNames.map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="ffi-caption px-2 py-1 rounded bg-[var(--ffi-surface-2)] text-[var(--ffi-text-secondary)] shrink-0 text-sm">
            Rd {currentRound ?? '-'}
          </div>
        )}

        {/* ── Price field (auction only) ── */}
        {format === 'auction' && (
          <div className="relative w-16 shrink-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--ffi-text-secondary)] pointer-events-none">$</span>
            <Input
              type="number"
              min={1}
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="0"
              className="pl-6 h-11 text-base text-center"
              aria-label="Price"
            />
          </div>
        )}

        {/* ── Record button — gold hero on valid, muted when not (UX-2.2) ── */}
        <button
          onClick={() => {
            if (!onBlockPlayer || !manager) return
            const pick: Omit<DraftPick, 'pick_number'> = {
              player_name: onBlockPlayer.name,
              position: onBlockPlayer.position,
              manager,
              price: format === 'auction' ? parseInt(price, 10) || 1 : undefined,
              round: format === 'snake' ? currentRound : undefined,
            }
            onSubmit(pick)
            onClearBlock?.()
            setPrice('')
          }}
          disabled={!isBarValid}
          className={`h-11 px-4 shrink-0 min-w-[84px] rounded-full font-bold inline-flex items-center justify-center transition-all duration-200 ${
            isBarValid
              ? 'active:scale-95'
              : 'bg-[var(--ffi-surface-elevated)] text-[var(--ffi-text-muted)] cursor-not-allowed opacity-50'
          }`}
          style={isBarValid ? {
            background: 'linear-gradient(135deg, #fdefb6 0%, #e0c27a 50%, #d3c791 100%)',
            boxShadow: '0 4px 15px rgba(224,194,122,0.30)',
            color: '#383008',
          } : undefined}
        >
          Record
        </button>

        {/* ── Undo ── */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-11 w-11 p-0 shrink-0 text-[var(--ffi-text-secondary)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Undo last pick"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
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
            <Button variant="ghost" size="sm" onClick={onUndo} className="h-11 text-xs gap-1">
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
                    <span className="text-xs font-mono text-muted-foreground">${player.consensusAuctionValue ?? 0}</span>
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
              {selectedPlayer.name} - {selectedPlayer.team}
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
          className="w-full h-11"
        >
          Record Pick
        </Button>
      </CardContent>
    </Card>
  )
}
