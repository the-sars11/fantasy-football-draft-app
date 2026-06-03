'use client'

/**
 * PlayerPool (FF-034 / FF-099)
 *
 * Live-updated list of available (undrafted) players.
 * Ported to use FFI design system from UI/draft_board/code.html
 *
 * Features:
 * - Glass-panel player cards (not HTML tables)
 * - Position filter tabs with neon glow
 * - Name/team search
 * - Strategy score + value display
 * - Expandable AI tactical insights
 */

import { useState, useMemo, useCallback } from 'react'
import { Search, AlignJustify, LayoutList } from 'lucide-react'
import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat } from '@/lib/supabase/database.types'
import type { Explanation } from '@/lib/draft/explain'
import { FFIPlayerCard } from './ffi-player-card'
import { FFIPositionFilters, FFISortTabs } from './ffi-position-filters'

const positions: readonly (Position | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const

/**
 * FF-278: Compute ADP divergence for a player.
 * In the live draft, player.adp is actually Record<string, number> from the raw API
 * (typed as number but runtime is object). When it IS an object, compute max-min.
 */
function getAdpDivergence(player: { adp: number }): number {
  const adpRaw = (player as unknown as { adp: Record<string, number> | number }).adp
  if (typeof adpRaw !== 'object' || adpRaw === null) return 0
  const vals = Object.values(adpRaw).filter((v): v is number => typeof v === 'number' && v > 0)
  if (vals.length < 2) return 0
  return Math.max(...vals) - Math.min(...vals)
}

interface PlayerPoolProps {
  scoredPlayers: ScoredPlayer[]
  draftedNames: Set<string>
  format: DraftFormat
  getExplanation?: (scored: ScoredPlayer) => Explanation | null
  onBidPlayer?: (player: Player) => void
  maxBid?: number | null
  /** FF-283: per-player strategy-aware max bids (player name lowercase → maxBid).
   *  When provided, overrides the global `maxBid` for each card. */
  maxBidMap?: Map<string, number>
}

export function PlayerPool({
  scoredPlayers,
  draftedNames,
  format,
  getExplanation,
  onBidPlayer,
  maxBid,
  maxBidMap,
}: PlayerPoolProps) {
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'value' | 'rank'>('score')
  const [compact, setCompact] = useState(false)

  const isAuction = format === 'auction'

  // Filter to available players
  const available = useMemo(() => {
    let filtered = scoredPlayers.filter(sp => !draftedNames.has(sp.player.name.toLowerCase()))

    if (posFilter !== 'ALL') {
      filtered = filtered.filter(sp => sp.player.position === posFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(sp =>
        sp.player.name.toLowerCase().includes(q) ||
        sp.player.team.toLowerCase().includes(q)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'score') return b.strategyScore - a.strategyScore
      if (sortBy === 'value') {
        if (isAuction) {
          return (b.adjustedAuctionValue ?? b.player.consensusAuctionValue) -
                 (a.adjustedAuctionValue ?? a.player.consensusAuctionValue)
        }
        return (a.adjustedRoundValue ?? a.player.adp) - (b.adjustedRoundValue ?? b.player.adp)
      }
      return a.player.consensusRank - b.player.consensusRank
    })

    return filtered
  }, [scoredPlayers, draftedNames, posFilter, search, sortBy, isAuction])

  const totalAvailable = scoredPlayers.filter(sp => !draftedNames.has(sp.player.name.toLowerCase())).length

  return (
    <div className="space-y-2">
      {/* Sticky filter header — glass backdrop */}
      <div className="ffi-filter-sticky space-y-2">
        {/* Header row: title + search + density toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <div className="h-5 w-1 bg-[#8bacff] shadow-[0_0_8px_rgba(139,172,255,0.6)]" />
            <h3 className="font-headline text-lg font-bold tracking-tight text-[#deedf9]">
              Available Players
            </h3>
            <span className="font-mono text-sm tabular-nums text-[#9eadb8] ml-1">
              ({totalAvailable})
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Density toggle — compact / comfortable */}
            <button
              onClick={() => setCompact(c => !c)}
              className={`
                shrink-0 p-2 rounded-lg transition-all min-h-[44px] min-w-[44px] flex items-center justify-center
                ${compact
                  ? 'bg-[var(--ffi-primary)]/20 text-[#8bacff] shadow-[0_0_8px_rgba(85,130,230,0.3)]'
                  : 'bg-[#0f222c] text-[#9eadb8] hover:bg-[#192f3b]'
                }
              `}
              title={compact ? 'Switch to comfortable view' : 'Switch to compact view'}
              aria-label="Toggle row density"
            >
              {compact ? <AlignJustify className="h-4 w-4" /> : <LayoutList className="h-4 w-4" />}
            </button>

            {/* Search input - FF-077: Full width on mobile */}
            <div className="relative flex-1 sm:w-52">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9eadb8]" />
              <input
                type="text"
                placeholder="Search players..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="
                  w-full pl-10 pr-4 py-2.5 sm:py-2 rounded-lg
                  bg-black/60 border border-[#3c4a53]/30
                  text-[#deedf9] text-sm font-body placeholder:text-[#9eadb8]/50
                  focus:outline-none focus:border-[#8bacff]/50 focus:ring-1 focus:ring-[#8bacff]/30
                  transition-colors min-h-[44px] sm:min-h-0
                "
              />
            </div>
          </div>
        </div>

        {/* Position filter tabs */}
        <FFIPositionFilters
          positions={positions}
          activeFilter={posFilter}
          onFilterChange={setPosFilter}
        />

        {/* Sort tabs */}
        <FFISortTabs
          sortBy={sortBy}
          onSortChange={setSortBy}
          isAuction={isAuction}
        />
      </div>

      {/* Player cards list - FF-077: Adaptive height on mobile */}
      <div className="space-y-3 sm:space-y-4 max-h-[60vh] sm:max-h-[520px] overflow-auto no-scrollbar pr-1 ffi-scroll-container">
        {available.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 sm:p-8 text-center">
            <p className="text-[#9eadb8] font-body text-sm">
              No players match your filters
            </p>
          </div>
        ) : (
          available.slice(0, 50).map((sp, index) => (
            <FFIPlayerCard
              key={sp.player.id}
              rank={index + 1}
              scoredPlayer={sp}
              format={format}
              isExpanded={expandedId === sp.player.id}
              onToggleExpand={() => setExpandedId(
                expandedId === sp.player.id ? null : sp.player.id
              )}
              getExplanation={getExplanation}
              onBid={onBidPlayer}
              maxBid={maxBidMap ? (maxBidMap.get(sp.player.name.toLowerCase()) ?? null) : maxBid}
              adpDivergence={getAdpDivergence(sp.player)}
              compact={compact}
            />
          ))
        )}
      </div>

      {/* Load more indicator - FF-077: 44px touch target */}
      {available.length > 50 && (
        <div className="flex justify-center pt-4 pb-2">
          <button className="
            flex items-center gap-2 text-[#9eadb8] hover:text-[#8bacff]
            active:text-[#8bacff] active:scale-98
            transition-all py-3 px-6 rounded-xl bg-[#05151e]/50
            font-headline text-xs font-bold tracking-widest uppercase
            min-h-[44px] touch-manipulation
          ">
            Load More Tactical Data
          </button>
        </div>
      )}
    </div>
  )
}
