'use client'

/**
 * Player Browser Client (FF-235)
 *
 * Browse all players with intel tags, sentiment data, and user tags.
 * Provides filtering by position, ADP range, and tag types.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, X, Target, AlertTriangle, Info, Play } from 'lucide-react'
import { FFIInput, FFIButton, FFIEmptyState } from '@/components/ui/ffi-primitives'
import { FFIPlayerIntelCard } from '@/components/prep/ffi-player-intel-card'
import { useUserTags, useToggleTag, useSystemTagActions } from '@/hooks/use-user-tags'
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
    refetch: refetchTags,
    isTarget,
    isAvoid,
  } = useUserTags({
    playerCacheIds,
    includeGlobal: true,
    enabled: players.length > 0,
  })

  const { toggle: toggleTag, isLoading: toggleLoading } = useToggleTag()
  const { dismissSystemTag, undismissSystemTag } = useSystemTagActions()

  // --- Fetch players ---
  const fetchPlayers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/players?limit=500')
      if (!res.ok) throw new Error('Failed to fetch players')
      const data = await res.json()
      setPlayers(cacheToPlayers(data.players || []))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPlayers()
  }, [fetchPlayers])

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

  const handleDismissSystemTag = useCallback(async (playerId: string, tag: string) => {
    const result = await dismissSystemTag(playerId, tag)
    if (result.success) refetchTags()
  }, [dismissSystemTag, refetchTags])

  const handleUndismissSystemTag = useCallback(async (playerId: string, tag: string) => {
    const result = await undismissSystemTag(playerId, tag)
    if (result.success) refetchTags()
  }, [undismissSystemTag, refetchTags])

  // --- Render ---
  if (loading) {
    return (
      <div className="pb-2">
        <PlayersHeader count={null} />
        <div className="ffi-skeleton h-11 w-full rounded-xl" />
        <div className="flex gap-1.5 mt-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="ffi-skeleton h-8 w-14 rounded-full" />
          ))}
        </div>
        <div className="flex flex-col gap-[6px] mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="ffi-skeleton rounded-[14px]"
              style={{ height: '72px' }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-2">
        <PlayersHeader count={null} />
        <div
          className="rounded-[14px] p-6 text-center"
          style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
        >
          <AlertTriangle className="h-7 w-7 mx-auto mb-2.5" style={{ color: 'var(--ffi-warning)' }} />
          <p className="text-[15px] font-bold mb-1" style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}>
            Couldn&apos;t load players
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--ffi-ink-2)' }}>
            The player database didn&apos;t respond. Check your connection and try again.
          </p>
          <FFIButton variant="secondary" onClick={fetchPlayers}>Retry</FFIButton>
        </div>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="pb-2">
        <PlayersHeader count={0} />
        <div
          className="rounded-[14px] p-8 text-center"
          style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
        >
          <Info className="h-7 w-7 mx-auto mb-2.5" style={{ color: 'var(--ffi-ink-3)' }} />
          <p className="text-[16px] font-bold mb-1" style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}>
            No player data yet
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--ffi-ink-2)' }}>
            Run research to populate the pool, then browse every player here.
          </p>
          <Link
            href="/prep"
            className="ffi-btn-hero inline-flex items-center gap-2 text-[13px] uppercase tracking-widest"
            style={{ borderRadius: '11px', padding: '0.7rem 1.4rem' }}
          >
            <Play className="w-[13px] h-[13px]" strokeWidth={2.5} color="var(--ffi-volt-ink)" />
            Run research
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-2">
      <PlayersHeader count={filteredPlayers.length} />

      {/* FF-249: Mobile-responsive search and filter bar */}
      <div className="space-y-3">
        {/* Row 1: Search + Filter toggle + Count */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Search - full width on mobile */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--ffi-ink-3)' }} />
            <FFIInput
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--ffi-ink-3)' }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 rounded-lg transition-all shrink-0"
            style={
              showFilters
                ? { background: 'rgba(121,166,255,0.16)', color: 'var(--ffi-blue-bright)' }
                : { background: 'var(--ffi-surface-2)', color: 'var(--ffi-ink-2)' }
            }
            aria-label="Toggle filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Row 2: Position pills - horizontal scroll on mobile */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 -mb-1 flex-1">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => setPositionFilter(pos)}
                className="px-3 sm:px-4 py-2 rounded-lg font-bold text-xs tracking-tight transition-all shrink-0"
                style={
                  positionFilter === pos
                    ? {
                        fontFamily: 'var(--font-cond)',
                        background: 'var(--ffi-volt)',
                        color: 'var(--ffi-volt-ink)',
                        boxShadow: '0 0 15px var(--ffi-volt-glow)',
                      }
                    : {
                        fontFamily: 'var(--font-cond)',
                        background: 'var(--ffi-surface-2)',
                        color: 'var(--ffi-ink-2)',
                      }
                }
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* FF-249: Mobile-friendly expanded filter panel */}
      {showFilters && (
        <div
          className="rounded-xl p-3 sm:p-4 space-y-4 mt-3"
          style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
        >
          {/* Tag filter - scrollable on mobile */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ffi-ink-3)' }}>
              Filter by Tag
            </label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mb-1 sm:flex-wrap">
              {TAG_FILTERS.map((filter) => {
                const active = tagFilter === filter.value
                let activeStyle: React.CSSProperties
                if (filter.value === 'target') {
                  activeStyle = { background: 'rgba(139,255,69,0.18)', color: 'var(--ffi-volt)', boxShadow: '0 0 8px var(--ffi-volt-glow)' }
                } else if (filter.value === 'avoid' || filter.value === 'bust') {
                  activeStyle = { background: 'rgba(255,110,138,0.18)', color: '#FF6E8A' }
                } else {
                  activeStyle = { background: 'rgba(121,166,255,0.18)', color: 'var(--ffi-blue-bright)' }
                }
                return (
                  <button
                    key={filter.value}
                    onClick={() => setTagFilter(filter.value)}
                    className="px-3 py-2 sm:py-1.5 rounded-full text-xs font-bold transition-all shrink-0"
                    style={active ? activeStyle : { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}
                  >
                    {filter.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ADP Range - stacked on mobile */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ffi-ink-3)' }}>
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
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: 'var(--ffi-surface-1)', accentColor: 'var(--ffi-blue-bright)' }}
              />
              <span className="text-sm w-12 text-center" style={{ color: 'var(--ffi-ink-2)' }}>{adpRange[0]}</span>
              <span style={{ color: 'var(--ffi-ink-3)' }}>-</span>
              <input
                type="range"
                min={1}
                max={300}
                value={adpRange[1]}
                onChange={(e) => setAdpRange([adpRange[0], Math.max(parseInt(e.target.value), adpRange[0] + 10)])}
                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                style={{ background: 'var(--ffi-surface-1)', accentColor: 'var(--ffi-blue-bright)' }}
              />
              <span className="text-sm w-12 text-center" style={{ color: 'var(--ffi-ink-2)' }}>{adpRange[1]}</span>
            </div>
            {/* Mobile: stacked with larger touch targets */}
            <div className="sm:hidden space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs w-8" style={{ color: 'var(--ffi-ink-3)' }}>Min</span>
                <input
                  type="range"
                  min={1}
                  max={300}
                  value={adpRange[0]}
                  onChange={(e) => setAdpRange([Math.min(parseInt(e.target.value), adpRange[1] - 10), adpRange[1]])}
                  className="flex-1 h-3 rounded-full appearance-none cursor-pointer"
                  style={{ background: 'var(--ffi-surface-1)', accentColor: 'var(--ffi-blue-bright)' }}
                />
                <span className="text-sm w-10 text-right" style={{ color: 'var(--ffi-ink-2)' }}>{adpRange[0]}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs w-8" style={{ color: 'var(--ffi-ink-3)' }}>Max</span>
                <input
                  type="range"
                  min={1}
                  max={300}
                  value={adpRange[1]}
                  onChange={(e) => setAdpRange([adpRange[0], Math.max(parseInt(e.target.value), adpRange[0] + 10)])}
                  className="flex-1 h-3 rounded-full appearance-none cursor-pointer"
                  style={{ background: 'var(--ffi-surface-1)', accentColor: 'var(--ffi-blue-bright)' }}
                />
                <span className="text-sm w-10 text-right" style={{ color: 'var(--ffi-ink-2)' }}>{adpRange[1]}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions for filtered results */}
      {tagFilter === 'untagged' && filteredPlayers.length > 0 && (
        <div className="flex items-center gap-2 text-sm mt-3" style={{ color: 'var(--ffi-ink-2)' }}>
          <span>Quick tag:</span>
          <button
            onClick={() => {
              // Mark first 5 as targets (demo)
              filteredPlayers.slice(0, 5).forEach(p => handleToggleTarget(p.id))
            }}
            className="px-2 py-1 rounded text-xs font-bold transition-colors"
            style={{ background: 'rgba(139,255,69,0.1)', color: 'var(--ffi-volt)' }}
          >
            <Target className="inline h-3 w-3 mr-1" />
            Top 5 as Targets
          </button>
        </div>
      )}

      {/* Player list - FF-250: Paginated for performance */}
      {filteredPlayers.length === 0 ? (
        <div className="mt-4">
          <FFIEmptyState
            icon={<Search className="h-8 w-8" style={{ color: 'var(--ffi-ink-3)' }} aria-hidden="true" />}
            title="No players match these filters"
            description="Try adjusting your search or clear the filters to see everyone."
            action={
              <FFIButton variant="ghost" onClick={() => {
                setSearchQuery('')
                setPositionFilter('ALL')
                setTagFilter('all')
                setAdpRange([1, 300])
              }}>
                Clear filters
              </FFIButton>
            }
          />
        </div>
      ) : (
        <div className="space-y-3 mt-4">
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
              dismissedSystemTags={userTagsMap[player.id]?.dismissedSystemTags ?? []}
              onDismissSystemTag={(tag) => handleDismissSystemTag(player.id, tag)}
              onUndismissSystemTag={(tag) => handleUndismissSystemTag(player.id, tag)}
            />
          ))}

          {/* FF-250: Load more button */}
          {hasMore && (
            <div className="flex justify-center pt-4 pb-2">
              <button
                onClick={loadMore}
                className="flex items-center gap-2 transition-colors py-3 px-6 rounded-xl text-xs font-bold tracking-widest uppercase"
                style={{
                  fontFamily: 'var(--font-cond)',
                  background: 'var(--ffi-surface-2)',
                  color: 'var(--ffi-ink-2)',
                  border: '1px solid var(--ffi-hairline)',
                }}
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

// --- Screen header (matches 9.1 / 9.3 pattern) ---
function PlayersHeader({ count }: { count: number | null }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <h1
          className="text-[26px] font-bold leading-none"
          style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)', letterSpacing: '-0.01em' }}
        >
          Players
        </h1>
        {count !== null && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-widest"
            style={{ background: 'rgba(121,166,255,0.14)', color: 'var(--ffi-blue-bright)' }}
          >
            <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{count}</span>
            in pool
          </span>
        )}
      </div>
    </div>
  )
}
