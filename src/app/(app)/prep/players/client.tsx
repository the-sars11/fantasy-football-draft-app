'use client'

/**
 * Player Browser Client (FF-235)
 *
 * Browse all players with intel tags, sentiment data, and user tags.
 * Provides filtering by position, ADP range, and tag types.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, SlidersHorizontal, X, Target, Loader2 } from 'lucide-react'
import { FFIInput, FFIButton, FFIEmptyState } from '@/components/ui/ffi-primitives'
import { FFIPlayerIntelCard } from '@/components/prep/ffi-player-intel-card'
import { useUserTags, useToggleTag } from '@/hooks/use-user-tags'
import { cacheToPlayers } from '@/lib/players/convert'
import type { Player, Position } from '@/lib/players/types'
import type { SystemTag } from '@/lib/supabase/database.types'

// Position filter options
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

// Tag filter options
type TagFilter = 'all' | 'target' | 'avoid' | 'breakout' | 'sleeper' | 'value' | 'bust' | 'untagged'
const TAG_FILTERS: { value: TagFilter; label: string }[] = [
  { value: 'all', label: 'All Tags' },
  { value: 'target', label: 'My Targets' },
  { value: 'avoid', label: 'My Avoids' },
  { value: 'breakout', label: 'Breakout' },
  { value: 'sleeper', label: 'Sleeper' },
  { value: 'value', label: 'Value' },
  { value: 'bust', label: 'Bust' },
  { value: 'untagged', label: 'Untagged' },
]

// Mock system tags for demo (until intel API is built)
// These would come from player_intel table in production
function getMockSystemTags(player: Player): SystemTag[] {
  const tags: SystemTag[] = []

  // Simple heuristics for demo
  // In production, these come from tag-detector.ts and sentiment analysis
  const adp = player.adp
  const rank = player.consensusRank

  // VALUE: ADP much higher than rank (undervalued)
  if (adp && rank && adp > rank + 15) {
    tags.push({
      tag: 'VALUE',
      confidence: 0.7,
      sources: ['FantasyPros', 'Sleeper'],
      reasoning: `ADP ${adp} but ranked ${rank} by experts`,
      score_modifier: 12,
      adp_gap: adp - rank,
    })
  }

  // AVOID: ADP much lower than rank (overvalued)
  if (adp && rank && adp < rank - 20) {
    tags.push({
      tag: 'AVOID',
      confidence: 0.6,
      sources: ['ESPN'],
      reasoning: `Being drafted at ${adp} but experts rank ${rank}`,
      score_modifier: -25,
      adp_gap: rank - adp,
    })
  }

  // BREAKOUT: Young players with rising ADP
  if (player.position === 'WR' && rank <= 30 && adp && adp >= 20 && adp <= 50) {
    if (Math.random() > 0.7) {
      tags.push({
        tag: 'BREAKOUT',
        confidence: 0.8,
        sources: ['FantasyPros', 'Sleeper', 'ESPN'],
        reasoning: '3+ sources identify as breakout candidate',
        score_modifier: 15,
      })
    }
  }

  // SLEEPER: Late round value
  if (adp && adp >= 80 && rank && rank <= 60) {
    tags.push({
      tag: 'SLEEPER',
      confidence: 0.65,
      sources: ['FantasyPros'],
      reasoning: 'Expert rank significantly higher than ADP',
      score_modifier: 10,
    })
  }

  return tags
}

export function PlayerBrowserClient() {
  // --- State ---
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL')
  const [tagFilter, setTagFilter] = useState<TagFilter>('all')
  const [adpRange, setAdpRange] = useState<[number, number]>([1, 300])
  const [showFilters, setShowFilters] = useState(false)

  // Expanded card state
  const [expandedPlayerId, setExpandedPlayerId] = useState<string | null>(null)

  // FF-250: Pagination for performance
  const [displayCount, setDisplayCount] = useState(50)
  const LOAD_INCREMENT = 50

  // User tags
  const playerCacheIds = useMemo(() => players.map(p => p.id), [players])
  const {
    userTagsMap,
    isLoading: tagsLoading,
    refetch: refetchTags,
    isTarget,
    isAvoid,
  } = useUserTags({
    playerCacheIds,
    includeGlobal: true,
    enabled: players.length > 0,
  })

  const { toggle: toggleTag, isLoading: toggleLoading } = useToggleTag()

  // --- Fetch players ---
  useEffect(() => {
    async function fetchPlayers() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/players?limit=500')
        if (!res.ok) throw new Error('Failed to fetch players')

        const data = await res.json()
        const converted = cacheToPlayers(data.players || [])
        setPlayers(converted)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load players')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayers()
  }, [])

  // --- Filter logic ---
  const filteredPlayers = useMemo(() => {
    let result = players

    // Position filter
    if (positionFilter !== 'ALL') {
      result = result.filter(p => p.position === positionFilter)
    }

    // ADP range filter
    result = result.filter(p => {
      const adp = p.adp || 999
      return adp >= adpRange[0] && adp <= adpRange[1]
    })

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q)
      )
    }

    // Tag filter
    if (tagFilter !== 'all') {
      result = result.filter(p => {
        const hasTarget = isTarget(p.id)
        const hasAvoid = isAvoid(p.id)
        const systemTags = getMockSystemTags(p)

        switch (tagFilter) {
          case 'target':
            return hasTarget
          case 'avoid':
            return hasAvoid
          case 'breakout':
            return systemTags.some(t => t.tag === 'BREAKOUT')
          case 'sleeper':
            return systemTags.some(t => t.tag === 'SLEEPER')
          case 'value':
            return systemTags.some(t => t.tag === 'VALUE')
          case 'bust':
            return systemTags.some(t => t.tag === 'BUST')
          case 'untagged':
            return !hasTarget && !hasAvoid && systemTags.length === 0
          default:
            return true
        }
      })
    }

    // Sort by ADP (or rank if no ADP)
    result = [...result].sort((a, b) => {
      const adpA = a.adp || 999
      const adpB = b.adp || 999
      return adpA - adpB
    })

    return result
  }, [players, positionFilter, adpRange, searchQuery, tagFilter, isTarget, isAvoid])

  // FF-250: Reset pagination when filters change
  useEffect(() => {
    setDisplayCount(50)
  }, [positionFilter, adpRange, searchQuery, tagFilter])

  // FF-250: Players to display (paginated)
  const displayedPlayers = useMemo(() => {
    return filteredPlayers.slice(0, displayCount)
  }, [filteredPlayers, displayCount])

  const hasMore = displayCount < filteredPlayers.length
  const loadMore = () => setDisplayCount(prev => prev + LOAD_INCREMENT)

  // --- Handlers ---
  const handleToggleTarget = useCallback(async (playerId: string) => {
    const result = await toggleTag(playerId, 'target')
    if (result.success) {
      refetchTags()
    }
  }, [toggleTag, refetchTags])

  const handleToggleAvoid = useCallback(async (playerId: string) => {
    const result = await toggleTag(playerId, 'avoid')
    if (result.success) {
      refetchTags()
    }
  }, [toggleTag, refetchTags])

  const handleToggleExpand = useCallback((playerId: string) => {
    setExpandedPlayerId(prev => prev === playerId ? null : playerId)
  }, [])

  // --- Render ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#8bacff]" />
        <span className="ml-2 text-[#9eadb8] text-sm">Loading players...</span>
      </div>
    )
  }

  if (error) {
    return (
      <FFIEmptyState
        icon="⚠️"
        title="Failed to load players"
        description={error}
        action={
          <FFIButton variant="secondary" onClick={() => window.location.reload()}>
            Retry
          </FFIButton>
        }
      />
    )
  }

  if (players.length === 0) {
    return (
      <FFIEmptyState
        icon="📋"
        title="No player data"
        description="Run a data refresh from the Prep Hub to load player rankings."
        action={
          <a href="/prep">
            <FFIButton variant="secondary">Go to Prep Hub</FFIButton>
          </a>
        }
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* FF-249: Mobile-responsive search and filter bar */}
      <div className="space-y-3">
        {/* Row 1: Search + Filter toggle + Count */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search - full width on mobile */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9eadb8]" />
            <FFIInput
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9eadb8] hover:text-[#deedf9]"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`
              p-2 rounded-lg transition-all shrink-0
              ${showFilters
                ? 'bg-[#8bacff]/20 text-[#8bacff]'
                : 'bg-surface-container-high text-[#9eadb8] hover:bg-surface-bright'
              }
            `}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>

          {/* Player count - visible on larger screens inline */}
          <span className="hidden sm:block text-xs text-[#9eadb8] shrink-0">
            {filteredPlayers.length} players
          </span>
        </div>

        {/* Row 2: Position pills - horizontal scroll on mobile */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 -mb-1 flex-1">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setPositionFilter(pos)}
                className={`
                  px-3 sm:px-4 py-2 rounded-lg font-headline font-bold text-xs tracking-tight transition-all shrink-0
                  ${positionFilter === pos
                    ? 'bg-[#2ff801] text-[#0b5800] shadow-[0_0_15px_rgba(47,248,1,0.3)]'
                    : 'bg-surface-container-high text-[#9eadb8] hover:bg-surface-bright'
                  }
                `}
              >
                {pos}
              </button>
            ))}
          </div>

          {/* Player count - mobile only */}
          <span className="sm:hidden text-xs text-[#9eadb8] shrink-0">
            {filteredPlayers.length}
          </span>
        </div>
      </div>

      {/* FF-249: Mobile-friendly expanded filter panel */}
      {showFilters && (
        <div className="glass-panel rounded-xl p-3 sm:p-4 space-y-4">
          {/* Tag filter - scrollable on mobile */}
          <div>
            <label className="block text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
              Filter by Tag
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mb-1 sm:flex-wrap">
              {TAG_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setTagFilter(filter.value)}
                  className={`
                    px-3 py-2 sm:py-1.5 rounded-full text-xs font-bold transition-all shrink-0
                    ${tagFilter === filter.value
                      ? filter.value === 'target'
                        ? 'bg-[#2ff801]/20 text-[#2ff801] shadow-[0_0_8px_rgba(47,248,1,0.3)]'
                        : filter.value === 'avoid' || filter.value === 'bust'
                        ? 'bg-[#ff716c]/20 text-[#ff716c]'
                        : 'bg-[#8bacff]/20 text-[#8bacff]'
                      : 'bg-surface-container-high text-[#9eadb8] hover:bg-surface-bright'
                    }
                  `}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* ADP Range - stacked on mobile */}
          <div>
            <label className="block text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
              ADP Range: {adpRange[0]} - {adpRange[1]}
            </label>
            {/* Desktop: side by side */}
            <div className="hidden sm:flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={300}
                value={adpRange[0]}
                onChange={(e) => setAdpRange([Math.min(parseInt(e.target.value), adpRange[1] - 10), adpRange[1]])}
                className="flex-1 h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-[#8bacff]"
              />
              <span className="text-sm text-[#9eadb8] w-12 text-center">{adpRange[0]}</span>
              <span className="text-[#9eadb8]">—</span>
              <input
                type="range"
                min={1}
                max={300}
                value={adpRange[1]}
                onChange={(e) => setAdpRange([adpRange[0], Math.max(parseInt(e.target.value), adpRange[0] + 10)])}
                className="flex-1 h-2 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-[#8bacff]"
              />
              <span className="text-sm text-[#9eadb8] w-12 text-center">{adpRange[1]}</span>
            </div>
            {/* Mobile: stacked with larger touch targets */}
            <div className="sm:hidden space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9eadb8] w-8">Min</span>
                <input
                  type="range"
                  min={1}
                  max={300}
                  value={adpRange[0]}
                  onChange={(e) => setAdpRange([Math.min(parseInt(e.target.value), adpRange[1] - 10), adpRange[1]])}
                  className="flex-1 h-3 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-[#8bacff]"
                />
                <span className="text-sm text-[#9eadb8] w-10 text-right">{adpRange[0]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#9eadb8] w-8">Max</span>
                <input
                  type="range"
                  min={1}
                  max={300}
                  value={adpRange[1]}
                  onChange={(e) => setAdpRange([adpRange[0], Math.max(parseInt(e.target.value), adpRange[0] + 10)])}
                  className="flex-1 h-3 bg-surface-container-high rounded-full appearance-none cursor-pointer accent-[#8bacff]"
                />
                <span className="text-sm text-[#9eadb8] w-10 text-right">{adpRange[1]}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions for filtered results */}
      {tagFilter === 'untagged' && filteredPlayers.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-[#9eadb8]">
          <span>Quick tag:</span>
          <button
            onClick={() => {
              // Mark first 5 as targets (demo)
              filteredPlayers.slice(0, 5).forEach(p => handleToggleTarget(p.id))
            }}
            className="px-2 py-1 rounded bg-[#2ff801]/10 text-[#2ff801] text-xs font-bold hover:bg-[#2ff801]/20 transition-colors"
          >
            <Target className="inline h-3 w-3 mr-1" />
            Top 5 as Targets
          </button>
        </div>
      )}

      {/* Player list - FF-250: Paginated for performance */}
      {filteredPlayers.length === 0 ? (
        <FFIEmptyState
          icon="🔍"
          title="No players match filters"
          description="Try adjusting your filters or search query."
          action={
            <FFIButton variant="ghost" onClick={() => {
              setSearchQuery('')
              setPositionFilter('ALL')
              setTagFilter('all')
              setAdpRange([1, 300])
            }}>
              Clear Filters
            </FFIButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {displayedPlayers.map((player, idx) => (
            <FFIPlayerIntelCard
              key={player.id}
              rank={idx + 1}
              player={player}
              systemTags={getMockSystemTags(player)}
              userTags={userTagsMap[player.id]?.tags ?? []}
              isTarget={isTarget(player.id)}
              isAvoid={isAvoid(player.id)}
              isExpanded={expandedPlayerId === player.id}
              onToggleExpand={() => handleToggleExpand(player.id)}
              onToggleTarget={() => handleToggleTarget(player.id)}
              onToggleAvoid={() => handleToggleAvoid(player.id)}
              isTagLoading={toggleLoading}
            />
          ))}

          {/* FF-250: Load more button */}
          {hasMore && (
            <div className="flex justify-center pt-4 pb-2">
              <button
                onClick={loadMore}
                className="
                  flex items-center gap-2 text-[#9eadb8] hover:text-[#8bacff]
                  transition-colors py-3 px-6 rounded-xl bg-surface-container-high
                  hover:bg-surface-bright
                  font-headline text-xs font-bold tracking-widest uppercase
                "
              >
                Load More ({filteredPlayers.length - displayCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
