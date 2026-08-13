'use client'

/**
 * Player Browser Client (FF-235)
 *
 * Browse all players with real, data-driven auction intel. Values are the VORP
 * model for Joe's exact league (12-tm / $200 / PPR / no-K), tags come from
 * computePlayerTags(). No ADP anywhere -- this is an auction, ADP is a
 * snake-draft stat. Filtering by position, tag type, and search.
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, X, AlertTriangle, Info, Play, ChevronLeft, RefreshCw } from 'lucide-react'
import { FFIInput, FFIButton, FFIEmptyState } from '@/components/ui/ffi-primitives'
import { FFIPlayerIntelCard } from '@/components/prep/ffi-player-intel-card'
import { useUserTags, useToggleTag, useSystemTagActions, useUpdateGrade } from '@/hooks/use-user-tags'
import { cacheToPlayers } from '@/lib/players/convert'
import { computePlayerTags } from '@/lib/players/tags'
import { computeRosterConstrainedMaxBid } from '@/lib/draft/roster-solver'
import type { BoardPlayer, SlotsRemaining, ReplacementCosts, SolverInput, RosterConstrainedMaxBid } from '@/lib/draft/roster-solver'
import { buildPrepFitLine } from '@/lib/players/prep-fit-line'
import type { Player, Position } from '@/lib/players/types'

// Position filter options — FLEX is a virtual position (RB+WR+TE combined); K omitted (no-kicker league)
type PositionFilter = Position | 'ALL' | 'FLEX'
const POSITIONS: PositionFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'FLEX', 'DEF']

// Tag filter options -- match the real tags from computePlayerTags().
type TagFilter = 'all' | 'target' | 'avoid' | 'pocket' | 'tax' | 'sleeper' | 'untagged'
const TAG_FILTERS: { value: TagFilter; label: string }[] = [
  { value: 'all', label: 'All Tags' },
  { value: 'target', label: 'My Targets' },
  { value: 'avoid', label: 'My Avoids' },
  { value: 'pocket', label: 'Value Pocket' },
  { value: 'tax', label: 'Room Tax' },
  { value: 'sleeper', label: 'Sleeper' },
  { value: 'untagged', label: 'Untagged' },
]

// Tier filter — FantasyPros expert tier (real data from R2)
type TierFilter = 'all' | 't1' | 't2' | 't3'
const TIER_FILTERS: { value: TierFilter; label: string }[] = [
  { value: 'all', label: 'All Tiers' },
  { value: 't1', label: 'T1' },
  { value: 't2', label: 'T2' },
  { value: 't3', label: 'T3+' },
]

// Grade filter — target priority weight (R7a weight 1-10); only shown when tagFilter='target'
type GradeFilter = 'all' | 'high' | 'elite'
const GRADE_FILTERS: { value: GradeFilter; label: string }[] = [
  { value: 'all', label: 'Any Priority' },
  { value: 'high', label: '7+ High' },
  { value: 'elite', label: '9+ Elite' },
]

// Severity filter — avoid severity (R7a soft/hard); only shown when tagFilter='avoid'
type SeverityFilter = 'all' | 'soft' | 'hard'
const SEVERITY_FILTERS: { value: SeverityFilter; label: string }[] = [
  { value: 'all', label: 'Any' },
  { value: 'soft', label: 'Soft' },
  { value: 'hard', label: 'Hard' },
]

// Nasties 13-slot full roster for prep-mode solver (R7b)
const NASTIES_FULL_SLOTS: SlotsRemaining = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, dst: 1, bench: 5,
}
const PREP_REPLACEMENT: ReplacementCosts = {
  qb: 1, rb: 1, wr: 1, te: 1, dst: 1, bench: 1,
}

export function PlayerBrowserClient() {
  // --- State ---
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [positionFilter, setPositionFilter] = useState<PositionFilter>('ALL')
  const [tagFilter, setTagFilter] = useState<TagFilter>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [tierFilter, setTierFilter] = useState<TierFilter>('all')
  const [byeFilter, setByeFilter] = useState<number | null>(null)
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')

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
  const { updateGrade } = useUpdateGrade()

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

    // Position filter — FLEX shows the combined RB/WR/TE flex-eligible pool
    if (positionFilter !== 'ALL') {
      if (positionFilter === 'FLEX') {
        result = result.filter(p => p.position === 'RB' || p.position === 'WR' || p.position === 'TE')
      } else {
        result = result.filter(p => p.position === positionFilter)
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q)
      )
    }

    // Tag filter -- against the real computed tags.
    if (tagFilter !== 'all') {
      result = result.filter(p => {
        const hasTarget = isTarget(p.id)
        const hasAvoid = isAvoid(p.id)
        const tags = computePlayerTags(p)

        switch (tagFilter) {
          case 'target':
            return hasTarget
          case 'avoid':
            return hasAvoid
          case 'pocket':
            return tags.some(t => t.id === 'pocket')
          case 'tax':
            return tags.some(t => t.id === 'tax')
          case 'sleeper':
            return tags.some(t => t.id === 'sleeper')
          case 'untagged':
            return !hasTarget && !hasAvoid && tags.length === 0
          default:
            return true
        }
      })
    }

    // Tier filter — FantasyPros expert tier
    if (tierFilter !== 'all') {
      result = result.filter(p => {
        if (tierFilter === 't1') return p.expertTier === 1
        if (tierFilter === 't2') return p.expertTier === 2
        return (p.expertTier ?? 99) >= 3
      })
    }

    // Bye week filter
    if (byeFilter !== null) {
      result = result.filter(p => p.byeWeek === byeFilter)
    }

    // Grade filter — only active when browsing targets; reads the R7a weight
    if (tagFilter === 'target' && gradeFilter !== 'all') {
      result = result.filter(p => {
        const weight = userTagsMap[p.id]?.tagWeight ?? 5
        if (gradeFilter === 'high') return weight >= 7
        return weight >= 9 // 'elite'
      })
    }

    // Severity filter — only active when browsing avoids; reads the R7a severity
    if (tagFilter === 'avoid' && severityFilter !== 'all') {
      result = result.filter(p => userTagsMap[p.id]?.tagSeverity === severityFilter)
    }

    // Sort by real auction value for Joe's league (VORP $), best first. Ties
    // fall back to expert consensus rank.
    result = [...result].sort((a, b) => {
      if (b.consensusAuctionValue !== a.consensusAuctionValue) {
        return b.consensusAuctionValue - a.consensusAuctionValue
      }
      return a.consensusRank - b.consensusRank
    })

    return result
  }, [players, positionFilter, searchQuery, tagFilter, isTarget, isAvoid, tierFilter, byeFilter, gradeFilter, severityFilter, userTagsMap])

  // FF-250: Reset pagination when any filter changes
  useEffect(() => {
    setDisplayCount(50)
  }, [positionFilter, searchQuery, tagFilter, tierFilter, byeFilter, gradeFilter, severityFilter])

  // Reset grade/severity when tagFilter changes (they're contextual to target/avoid mode)
  useEffect(() => {
    setGradeFilter('all')
    setSeverityFilter('all')
  }, [tagFilter])

  // R7b: derive available bye weeks from the loaded player pool
  const availableByeWeeks = useMemo(() => {
    const weeks = new Set<number>()
    players.forEach(p => { if (p.byeWeek > 0) weeks.add(p.byeWeek) })
    return [...weeks].sort((a, b) => a - b)
  }, [players])

  // BUG-R7b-01 fix: split into three memos so the 500 solver calls only re-run
  // when the player pool changes, not on every tag toggle.

  // Phase 1: map players → BoardPlayer[] (deps: players only)
  const boardPlayers = useMemo((): BoardPlayer[] => {
    return players
      .filter(p => p.position !== 'K')
      .map(p => ({
        id: p.id,
        name: p.name,
        position: p.position as BoardPlayer['position'],
        expectedCost: Math.max(1, Math.round(p.expectedRoomPrice ?? p.consensusAuctionValue ?? 1)),
        ceiling: Math.max(1, Math.round(p.ceilingValue ?? p.consensusAuctionValue ?? 1)),
      }))
  }, [players])

  // Phase 2: run the 500 solver calls (deps: boardPlayers only — expensive)
  const solverResultMap = useMemo((): Map<string, RosterConstrainedMaxBid> => {
    if (boardPlayers.length === 0) return new Map()
    const solverInput: SolverInput = {
      budgetRemaining: 200,
      slotsRemaining: NASTIES_FULL_SLOTS,
      availablePlayers: boardPlayers,
      replacementCosts: PREP_REPLACEMENT,
      minPerSlot: 1,
    }
    const map = new Map<string, RosterConstrainedMaxBid>()
    for (const bp of boardPlayers) {
      map.set(bp.id, computeRosterConstrainedMaxBid(bp, solverInput))
    }
    return map
  }, [boardPlayers])

  // Phase 3: cheap label selection (deps: solverResultMap + tags — no solver calls)
  const fitLineMap = useMemo((): Map<string, string> => {
    const map = new Map<string, string>()
    for (const bp of boardPlayers) {
      const result = solverResultMap.get(bp.id)
      if (result) {
        map.set(bp.id, buildPrepFitLine(bp.position, result, isTarget(bp.id), isAvoid(bp.id)))
      }
    }
    return map
  }, [boardPlayers, solverResultMap, isTarget, isAvoid])

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

  const handleUpdateGrade = useCallback(async (playerId: string, weight?: number, severity?: string) => {
    const result = await updateGrade(playerId, weight, severity)
    if (result.success) refetchTags()
  }, [updateGrade, refetchTags])

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

          {/* Refresh -- re-pulls the pool; values/tags/ranges re-derive live (FB-11) */}
          <button
            onClick={() => fetchPlayers()}
            disabled={loading}
            className="p-2 rounded-lg transition-all shrink-0 disabled:opacity-50"
            style={{ background: 'var(--ffi-surface-2)', color: 'var(--ffi-ink-2)' }}
            aria-label="Refresh player values"
            title="Refresh values from the latest pull"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

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
                } else if (filter.value === 'avoid' || filter.value === 'tax') {
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

            {/* Grade filter — visible only when browsing targets */}
            {tagFilter === 'target' && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-widest self-center pr-1" style={{ color: 'var(--ffi-ink-3)' }}>Priority:</span>
                {GRADE_FILTERS.map((f) => {
                  const active = gradeFilter === f.value
                  return (
                    <button
                      key={f.value}
                      onClick={() => setGradeFilter(f.value)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                      style={active
                        ? { background: 'rgba(139,255,69,0.18)', color: 'var(--ffi-volt)' }
                        : { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }
                      }
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Severity filter — visible only when browsing avoids */}
            {tagFilter === 'avoid' && (
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span className="text-[9px] font-bold uppercase tracking-widest self-center pr-1" style={{ color: 'var(--ffi-ink-3)' }}>Severity:</span>
                {SEVERITY_FILTERS.map((f) => {
                  const active = severityFilter === f.value
                  return (
                    <button
                      key={f.value}
                      onClick={() => setSeverityFilter(f.value)}
                      className="px-2.5 py-1 rounded-full text-[10px] font-bold transition-all"
                      style={active
                        ? { background: 'rgba(255,110,138,0.18)', color: '#FF6E8A' }
                        : { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }
                      }
                    >
                      {f.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Tier filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ffi-ink-3)' }}>
              Expert Tier
            </label>
            <div className="flex gap-2 flex-wrap">
              {TIER_FILTERS.map((f) => {
                const active = tierFilter === f.value
                return (
                  <button
                    key={f.value}
                    onClick={() => setTierFilter(f.value)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                    style={active
                      ? { background: 'rgba(121,166,255,0.18)', color: 'var(--ffi-blue-bright)' }
                      : { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }
                    }
                  >
                    {f.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bye week filter — pills populated from the actual player pool */}
          {availableByeWeeks.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--ffi-ink-3)' }}>
                Bye Week
              </label>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1 -mb-1 sm:flex-wrap">
                <button
                  onClick={() => setByeFilter(null)}
                  className="px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0"
                  style={byeFilter === null
                    ? { background: 'rgba(121,166,255,0.18)', color: 'var(--ffi-blue-bright)' }
                    : { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }
                  }
                >
                  Any
                </button>
                {availableByeWeeks.map((week) => (
                  <button
                    key={week}
                    onClick={() => setByeFilter(week === byeFilter ? null : week)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0"
                    style={byeFilter === week
                      ? { background: 'rgba(121,166,255,0.18)', color: 'var(--ffi-blue-bright)' }
                      : { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }
                    }
                  >
                    Wk {week}
                  </button>
                ))}
              </div>
            </div>
          )}
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
                setTierFilter('all')
                setByeFilter(null)
                setGradeFilter('all')
                setSeverityFilter('all')
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
              tags={computePlayerTags(player)}
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
              tagWeight={userTagsMap[player.id]?.tagWeight ?? 5}
              tagSeverity={userTagsMap[player.id]?.tagSeverity ?? 'soft'}
              onUpdateGrade={(w, s) => handleUpdateGrade(player.id, w, s)}
              fitLine={fitLineMap.get(player.id)}
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
    <div className="mb-4">
      <Link
        href="/prep"
        className="inline-flex items-center gap-1 ffi-caption text-[var(--ffi-text-secondary)] hover:text-white transition-colors mb-2"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        Research
      </Link>
      <div className="flex items-center justify-between">
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
    </div>
  )
}
