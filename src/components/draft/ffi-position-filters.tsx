'use client'

/**
 * FFIPositionFilters (FF-100)
 *
 * Position filter tabs ported from UI/draft_board/code.html lines 119-127
 * Active state has neon glow, inactive has surface-container styling.
 */

import type { Position } from '@/lib/players/types'

type FilterValue = Position | 'ALL'

interface FFIPositionFiltersProps {
  positions: readonly FilterValue[]
  activeFilter: FilterValue
  onFilterChange: (filter: FilterValue) => void
}

export function FFIPositionFilters({
  positions,
  activeFilter,
  onFilterChange,
}: FFIPositionFiltersProps) {
  return (
    <section className="mb-6 relative overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-4 w-1 bg-[#2ff801] shadow-[0_0_8px_#2ff801]" />
        <h2 className="font-headline font-bold text-sm tracking-widest uppercase text-[#9eadb8]">
          Tactical Filters
        </h2>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
        {positions.map((pos) => (
          <button
            key={pos}
            onClick={() => onFilterChange(pos)}
            className={`
              px-6 py-2 rounded-lg font-headline font-bold text-xs tracking-tighter
              transition-all active:scale-95 whitespace-nowrap
              ${activeFilter === pos
                ? 'bg-[#2ff801] text-[#0b5800] shadow-[0_0_15px_rgba(47,248,1,0.3)]'
                : 'bg-[#0f222c] text-[#9eadb8] hover:bg-[#192f3b]'
              }
            `}
          >
            {pos}
          </button>
        ))}
      </div>
    </section>
  )
}

/**
 * Sort tabs for player list
 */
type SortOption = 'score' | 'value' | 'rank'

interface FFISortTabsProps {
  sortBy: SortOption
  onSortChange: (sort: SortOption) => void
  isAuction: boolean
}

export function FFISortTabs({
  sortBy,
  onSortChange,
  isAuction,
}: FFISortTabsProps) {
  const options: { value: SortOption; label: string }[] = [
    { value: 'score', label: 'Score' },
    { value: 'value', label: isAuction ? 'Value' : 'ADP' },
    { value: 'rank', label: 'Rank' },
  ]

  return (
    <div className="flex gap-2 text-[10px] mb-4">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSortChange(option.value)}
          className={`
            px-3 py-1 rounded-md font-headline tracking-wider uppercase transition-colors
            ${sortBy === option.value
              ? 'bg-[#0f222c] text-[#deedf9] border border-[#3c4a53]/30'
              : 'text-[#9eadb8] hover:text-[#deedf9]'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}