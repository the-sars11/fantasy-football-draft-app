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

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat } from '@/lib/supabase/database.types'
import type { Explanation } from '@/lib/draft/explain'
import { FFIPlayerCard } from './ffi-player-card'
import { FFIPositionFilters, FFISortTabs } from './ffi-position-filters'

const positions: readonly (Position | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const

interface PlayerPoolProps {
  scoredPlayers: ScoredPlayer[]
  draftedNames: Set<string>
  format: DraftFormat
  getExplanation?: (scored: ScoredPlayer) => Explanation | null
}

export function PlayerPool({
  scoredPlayers,
  draftedNames,
  format,
  getExplanation,
}: PlayerPoolProps) {
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'value' | 'rank'>('score')

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
    <div className="space-y-4">
      {/* Header + search - FF-077: Mobile responsive layout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-1 bg-[#8bacff] shadow-[0_0_8px_#8bacff]" />
          <h3 className="font-headline text-lg font-bold tracking-tight text-[#deedf9]">
            Available Players
          </h3>
          <span className="text-sm font-body text-[#9eadb8] ml-1">
            ({totalAvailable})
          </span>
        </div>

        {/* Search input - FF-077: Full width on mobile */}
        <div className="relative w-full sm:w-52">
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
