'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, RefreshCw, CheckCircle2, TrendingDown, Star, ArrowDown, ArrowUp, Play } from 'lucide-react'
import { DraftBoardTable } from '@/components/prep/draft-board-table'
import { PositionBreakdown } from '@/components/prep/position-breakdown'
import {
  scorePlayersWithStrategy,
  buildIntelContextMap,
  type ScoredPlayer,
} from '@/lib/research/strategy/scoring'
import { cacheToPlayers } from '@/lib/players/convert'
import { useUserTags, useToggleTag } from '@/hooks/use-user-tags'
import type { Strategy } from '@/lib/supabase/database.types'
import type { DraftFormat, Player, Position } from '@/lib/players/types'

interface LeagueSummary {
  id: string
  name: string
  format: DraftFormat
  team_count: number
  budget: number | null
  scoring_format: string
}

const POSITIONS: (Position | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']
type SortField = 'rank' | 'score' | 'value' | 'adp' | 'name'
type TargetFilter = 'all' | 'target' | 'avoid' | 'neutral'

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'score', label: 'Score' },
  { field: 'value', label: 'Value' },
  { field: 'rank',  label: 'Rank' },
  { field: 'adp',   label: 'ADP' },
]

const POS_PILL_COLORS: Record<string, { text: string; border: string }> = {
  QB:  { text: '#FF6E8A', border: 'rgba(255,110,138,0.30)' },
  RB:  { text: '#56E0A0', border: 'rgba(86,224,160,0.30)'  },
  WR:  { text: '#6CA8FF', border: 'rgba(108,168,255,0.30)' },
  TE:  { text: '#FFB05C', border: 'rgba(255,176,92,0.30)'  },
  K:   { text: '#A78BFA', border: 'rgba(167,139,250,0.30)' },
  DEF: { text: '#637396', border: 'rgba(99,115,150,0.30)'  },
}

function PlayerListSkeleton() {
  return (
    <div className="flex flex-col gap-[6px] mt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[14px] animate-pulse"
          style={{ height: '76px', background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
        />
      ))}
    </div>
  )
}

export function DraftBoardClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Data
  const [players, setPlayers] = useState<Player[]>([])
  const [activeStrategy, setActiveStrategy] = useState<Strategy | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [adpDivergenceMap, setAdpDivergenceMap] = useState<Map<string, number>>(new Map())
  const hasComputedMovers = useRef(false)

  // Filters
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL')
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all')
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortAsc, setSortAsc] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'position'>('board')

  // Refresh
  const [refreshing, setRefreshing] = useState(false)
  const [refreshFeedback, setRefreshFeedback] = useState<string | null>(null)

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId)

  // Load user tags
  const playerCacheIds = useMemo(() => players.map(p => p.id), [players])
  const {
    userTagsMap,
    isLoading: tagsLoading,
    refetch: refetchTags,
    isTarget,
    isAvoid,
  } = useUserTags({
    playerCacheIds,
    leagueId: selectedLeagueId,
    includeGlobal: true,
    enabled: players.length > 0,
  })
  const { toggle: toggleTag, isLoading: toggleLoading } = useToggleTag(selectedLeagueId)

  // Fetch leagues — single-league app: The Nasties (is_active) sorts to leagues[0].
  const fetchLeagues = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/leagues')
      if (!res.ok) throw new Error('Failed to fetch leagues')
      const data = await res.json()
      setLeagues(data.leagues || [])
      if (data.leagues?.length > 0) setSelectedLeagueId(data.leagues[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load leagues')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLeagues()
  }, [fetchLeagues])

  // Fetch players + strategy on league change
  useEffect(() => {
    if (!selectedLeagueId) return
    let cancelled = false

    async function fetchData() {
      setDataLoading(true)
      try {
        const [playersRes, strategiesRes] = await Promise.all([
          fetch('/api/players?limit=500'),
          fetch(`/api/strategies?leagueId=${selectedLeagueId}`),
        ])

        if (!cancelled && playersRes.ok) {
          const pData = await playersRes.json()
          setPlayers(cacheToPlayers(pData.players || []))
          if (!hasComputedMovers.current) {
            const divMap = new Map<string, number>()
            for (const raw of pData.players || []) {
              const vals = Object.values(raw.adp ?? {}).filter(
                (v): v is number => typeof v === 'number' && v > 0,
              )
              if (vals.length >= 2) {
                divMap.set(raw.id as string, Math.max(...vals) - Math.min(...vals))
              }
            }
            setAdpDivergenceMap(divMap)
            hasComputedMovers.current = true
          }
        }

        if (!cancelled && strategiesRes.ok) {
          const sData = await strategiesRes.json()
          const active = (sData.strategies ?? []).find((s: Strategy) => s.is_active) ?? null
          setActiveStrategy(active)
        }
      } catch {
        // Board degrades to unsorted player list
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [selectedLeagueId])

  // Full refresh
  const handleFullRefresh = useCallback(async () => {
    if (!selectedLeagueId || refreshing) return
    setRefreshing(true)
    setRefreshFeedback(null)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: selectedLeagueId, skipRefresh: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Research failed')

      const [playersRes, strategiesRes] = await Promise.all([
        fetch('/api/players?limit=500'),
        fetch(`/api/strategies?leagueId=${selectedLeagueId}`),
      ])
      if (playersRes.ok) {
        const pData = await playersRes.json()
        setPlayers(cacheToPlayers(pData.players || []))
        const divMap = new Map<string, number>()
        for (const raw of pData.players || []) {
          const vals = Object.values(raw.adp ?? {}).filter(
            (v): v is number => typeof v === 'number' && v > 0,
          )
          if (vals.length >= 2) {
            divMap.set(raw.id as string, Math.max(...vals) - Math.min(...vals))
          }
        }
        setAdpDivergenceMap(divMap)
      }
      if (strategiesRes.ok) {
        const sData = await strategiesRes.json()
        setActiveStrategy((sData.strategies ?? []).find((s: Strategy) => s.is_active) ?? null)
      }

      const stratName = data.strategy?.name ?? 'Balanced (default)'
      setRefreshFeedback(`Refreshed ${data.analysis?.totalPlayers ?? 0} players with "${stratName}" strategy.`)
      setTimeout(() => setRefreshFeedback(null), 6000)
    } catch (err) {
      setRefreshFeedback(`Error: ${err instanceof Error ? err.message : 'Refresh failed'}`)
    } finally {
      setRefreshing(false)
    }
  }, [selectedLeagueId, refreshing])

  // Build intel context map
  const intelContextMap = useMemo(() => {
    if (Object.keys(userTagsMap).length === 0) return undefined
    const formattedMap: Record<string, { tags: string[]; dismissedSystemTags?: string[] }> = {}
    for (const [playerId, data] of Object.entries(userTagsMap)) {
      formattedMap[playerId] = { tags: data.tags, dismissedSystemTags: data.dismissedSystemTags }
    }
    return buildIntelContextMap(formattedMap)
  }, [userTagsMap])

  // Score players
  const scoredPlayers = useMemo<ScoredPlayer[]>(() => {
    if (players.length === 0) return []
    if (!activeStrategy || !selectedLeague) {
      return players.map((p) => ({
        player: p,
        strategyScore: 50,
        intelScore: 0,
        combinedScore: 50,
        targetStatus: isTarget(p.id) ? 'target' as const : isAvoid(p.id) ? 'avoid' as const : 'neutral' as const,
        isUserTarget: isTarget(p.id),
        isUserAvoid: isAvoid(p.id),
        boosts: [],
        intelBoosts: [],
      }))
    }
    return scorePlayersWithStrategy(
      players,
      activeStrategy,
      selectedLeague.format,
      selectedLeague.budget ?? undefined,
      intelContextMap,
    )
  }, [players, activeStrategy, selectedLeague, intelContextMap, isTarget, isAvoid])

  // ADP Movers
  const topMovers = useMemo(() => {
    if (adpDivergenceMap.size === 0) return []
    return players
      .filter((p) => (adpDivergenceMap.get(p.id) ?? 0) > 10)
      .sort((a, b) => (adpDivergenceMap.get(b.id) ?? 0) - (adpDivergenceMap.get(a.id) ?? 0))
      .slice(0, 6)
  }, [players, adpDivergenceMap])

  // Filter + sort
  const filteredPlayers = useMemo(() => {
    let result = scoredPlayers
    if (positionFilter !== 'ALL') result = result.filter((sp) => sp.player.position === positionFilter)
    if (targetFilter !== 'all') result = result.filter((sp) => sp.targetStatus === targetFilter)
    return [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'rank':  cmp = a.player.consensusRank - b.player.consensusRank; break
        case 'score': cmp = b.strategyScore - a.strategyScore; break
        case 'value':
          cmp = selectedLeague?.format === 'auction'
            ? (b.adjustedAuctionValue ?? b.player.consensusAuctionValue) - (a.adjustedAuctionValue ?? a.player.consensusAuctionValue)
            : (a.adjustedRoundValue ?? a.player.adp) - (b.adjustedRoundValue ?? b.player.adp)
          break
        case 'adp':  cmp = a.player.adp - b.player.adp; break
        case 'name': cmp = a.player.name.localeCompare(b.player.name); break
      }
      return sortAsc ? -cmp : cmp
    })
  }, [scoredPlayers, positionFilter, targetFilter, sortField, sortAsc, selectedLeague])

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(false) }
  }

  const cycleTargetFilter = () => {
    const cycle: TargetFilter[] = ['all', 'target', 'avoid']
    const next = cycle[(cycle.indexOf(targetFilter) + 1) % cycle.length]
    setTargetFilter(next)
  }

  // ── Loading / error states ──
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8" style={{ color: 'var(--ffi-ink-3)' }}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading leagues...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="pb-2">
        <BoardHeader leagueName={selectedLeague?.name} />
        <div
          className="rounded-[14px] p-6 text-center"
          style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
        >
          <AlertCircle className="h-7 w-7 mx-auto mb-2.5" style={{ color: 'var(--ffi-warning)' }} />
          <p className="text-[15px] font-bold mb-1" style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}>
            Couldn&apos;t load the board
          </p>
          <p className="text-[13px] mb-4" style={{ color: 'var(--ffi-ink-2)' }}>
            The player database didn&apos;t respond. Check your connection and try again.
          </p>
          <button
            onClick={fetchLeagues}
            className="ffi-btn-secondary inline-flex items-center gap-2 text-[13px] font-bold"
            style={{ borderRadius: '11px', padding: '0.6rem 1.2rem' }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="pb-2">
        <BoardHeader />
        <BoardEmpty />
      </div>
    )
  }

  return (
    <div className="pb-2">

      {/* ── SCREEN HEADER ── */}
      <BoardHeader leagueName={selectedLeague?.name} />

      {/* ── META STRIP ── */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {/* Format badge */}
        {selectedLeague && (
          <span
            className="font-bold text-[10px] uppercase rounded-full px-[10px] py-[4px]"
            style={{
              fontFamily: 'var(--font-cond)',
              letterSpacing: '0.16em',
              background: 'rgba(77,130,255,0.10)',
              border: '1px solid rgba(77,130,255,0.18)',
              color: 'var(--ffi-blue-bright)',
            }}
          >
            {selectedLeague.format === 'auction' ? 'Auction' : 'Snake'}
          </span>
        )}

        {/* Strategy badge */}
        {activeStrategy && (
          <span
            className="flex items-center gap-1 font-bold text-[10px] uppercase rounded-full px-[10px] py-[4px]"
            style={{
              fontFamily: 'var(--font-cond)',
              letterSpacing: '0.14em',
              background: 'rgba(139,255,69,0.08)',
              border: '1px solid rgba(139,255,69,0.16)',
              color: 'var(--ffi-volt)',
            }}
          >
            <Star style={{ width: 11, height: 11 }} />
            {activeStrategy.name}
          </span>
        )}

        {!activeStrategy && !dataLoading && players.length > 0 && (
          <span className="text-[11px]" style={{ color: 'var(--ffi-ink-3)' }}>
            <a href="/prep/strategies" style={{ color: 'var(--ffi-blue-bright)' }}>Set a strategy</a>
          </span>
        )}

        {/* Player count + refresh */}
        <div className="flex items-center gap-2 ml-auto">
          {players.length > 0 && (
            <span
              className="font-bold text-[11px] tabular-nums"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink-3)' }}
            >
              {filteredPlayers.length} players
            </span>
          )}
          {selectedLeagueId && (
            <button
              onClick={handleFullRefresh}
              disabled={refreshing || dataLoading}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 font-bold text-[11px] uppercase transition-opacity disabled:opacity-50"
              style={{
                fontFamily: 'var(--font-cond)',
                letterSpacing: '0.12em',
                background: 'var(--ffi-surface-2)',
                border: '1px solid var(--ffi-hairline)',
                color: 'var(--ffi-ink-2)',
              }}
            >
              {refreshing
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <RefreshCw className="h-3 w-3" />
              }
              {refreshing ? 'Refreshing' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      {/* ── REFRESH FEEDBACK ── */}
      {refreshFeedback && (
        <div
          className="flex items-center gap-2 text-sm rounded-[11px] px-3 py-2 mb-4"
          style={
            refreshFeedback.startsWith('Error')
              ? { background: 'rgba(255,110,138,0.08)', border: '1px solid rgba(255,110,138,0.18)', color: '#FF6E8A' }
              : { background: 'rgba(139,255,69,0.08)', border: '1px solid rgba(139,255,69,0.18)', color: 'var(--ffi-volt)' }
          }
        >
          {refreshFeedback.startsWith('Error')
            ? <AlertCircle className="h-4 w-4 shrink-0" />
            : <CheckCircle2 className="h-4 w-4 shrink-0" />
          }
          {refreshFeedback}
        </div>
      )}

      {/* ── CONTENT ── */}
      {dataLoading ? (
        <PlayerListSkeleton />
      ) : players.length === 0 ? (
        <BoardEmpty />
      ) : (
        <>
          {/* ── ADP MOVERS STRIP ── */}
          {topMovers.length > 0 && (
            <div className="mb-4">
              <div
                className="flex items-center gap-2 mb-2"
                style={{ fontFamily: 'var(--font-cond)' }}
              >
                <span
                  className="font-bold text-[9px] uppercase tracking-[0.30em]"
                  style={{ color: 'var(--ffi-ink-3)' }}
                >
                  ADP Movers
                </span>
                <span
                  className="font-bold text-[9px] rounded-full px-[7px] py-[2px]"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    background: 'rgba(255,176,92,0.12)',
                    border: '1px solid rgba(255,176,92,0.22)',
                    color: 'var(--ffi-warning)',
                    letterSpacing: '0.02em',
                  }}
                >
                  Cross-source divergence &gt;10
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                {topMovers.map((p) => {
                  const div = adpDivergenceMap.get(p.id) ?? 0
                  const posColors = { QB: '#FF6E8A', RB: '#56E0A0', WR: '#6CA8FF', TE: '#FFB05C', K: '#A78BFA', DEF: '#637396' } as Record<string, string>
                  return (
                    <div
                      key={p.id}
                      className="flex-shrink-0 flex items-center gap-2 rounded-[11px] px-3 py-[9px]"
                      style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
                    >
                      <span
                        className="font-bold text-[10px] px-[6px] py-[3px] rounded-[6px] flex-shrink-0"
                        style={{
                          fontFamily: 'var(--font-cond)',
                          background: 'rgba(150,180,255,0.10)',
                          color: posColors[p.position] ?? 'var(--ffi-ink-2)',
                        }}
                      >
                        {p.position}
                      </span>
                      <span
                        className="font-bold text-[13px] whitespace-nowrap"
                        style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
                      >
                        {p.name}
                      </span>
                      <span
                        className="flex items-center gap-1 font-bold text-[11px]"
                        style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-warning)' }}
                      >
                        <TrendingDown className="h-[11px] w-[11px]" />
                        {div.toFixed(0)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TABS ── */}
          <div
            className="flex gap-1 mb-0 rounded-[12px] p-1"
            style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}
          >
            {(['board', 'position'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 rounded-[9px] py-[9px] font-bold text-[12px] uppercase transition-all"
                style={{
                  fontFamily: 'var(--font-cond)',
                  letterSpacing: '0.12em',
                  ...(activeTab === tab
                    ? {
                        background: 'var(--ffi-blue)',
                        color: '#fff',
                        boxShadow: '0 4px 14px -4px rgba(77,130,255,0.5)',
                      }
                    : {
                        color: 'var(--ffi-ink-3)',
                      }),
                }}
              >
                {tab === 'board' ? 'All Players' : 'By Position'}
              </button>
            ))}
          </div>

          {activeTab === 'board' && (
            <>
              {/* ── FILTER BAR ── */}
              <div className="py-2 sticky top-0 z-10" style={{ background: 'linear-gradient(180deg, var(--ffi-bg-0) 80%, transparent)' }}>
                {/* Position pills */}
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {POSITIONS.map((pos) => {
                    const isActive = positionFilter === pos
                    const posColor = pos !== 'ALL' ? POS_PILL_COLORS[pos] : null
                    return (
                      <button
                        key={pos}
                        onClick={() => setPositionFilter(pos)}
                        className="flex-shrink-0 rounded-full font-bold text-[12px] uppercase whitespace-nowrap transition-all"
                        style={{
                          fontFamily: 'var(--font-cond)',
                          letterSpacing: '0.10em',
                          padding: '7px 13px',
                          ...(pos === 'ALL' && isActive
                            ? {
                                background: 'var(--ffi-blue)',
                                color: '#fff',
                                boxShadow: '0 4px 14px -4px rgba(77,130,255,0.45)',
                                border: 'none',
                              }
                            : pos === 'ALL'
                              ? {
                                  background: 'var(--ffi-surface-2)',
                                  border: '1px solid var(--ffi-hairline)',
                                  color: 'var(--ffi-ink-3)',
                                }
                            : isActive && posColor
                              ? {
                                  background: 'var(--ffi-surface-2)',
                                  border: `1px solid ${posColor.border}`,
                                  color: posColor.text,
                                  boxShadow: `0 0 10px ${posColor.border}`,
                                }
                              : posColor
                                ? {
                                    background: 'var(--ffi-surface-2)',
                                    border: `1px solid rgba(150,180,255,0.10)`,
                                    color: posColor.text,
                                  }
                                : {
                                    background: 'var(--ffi-surface-2)',
                                    border: '1px solid var(--ffi-hairline)',
                                    color: 'var(--ffi-ink-3)',
                                  }),
                        }}
                      >
                        {pos}
                      </button>
                    )
                  })}
                </div>

                {/* Sort pills + target filter */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: 'none' }}>
                  <span
                    className="font-bold text-[9px] uppercase flex-shrink-0"
                    style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.25em', color: 'var(--ffi-ink-3)' }}
                  >
                    Sort
                  </span>
                  {SORT_OPTIONS.map(({ field, label }) => {
                    const isActive = sortField === field
                    return (
                      <button
                        key={field}
                        onClick={() => handleSort(field)}
                        className="flex-shrink-0 flex items-center gap-1 rounded-full font-bold text-[11px] uppercase transition-all"
                        style={{
                          fontFamily: 'var(--font-cond)',
                          letterSpacing: '0.10em',
                          padding: '5px 11px',
                          ...(isActive
                            ? {
                                background: 'rgba(77,130,255,0.18)',
                                border: '1px solid rgba(77,130,255,0.35)',
                                color: 'var(--ffi-blue-bright)',
                              }
                            : {
                                background: 'var(--ffi-surface-1)',
                                border: '1px solid var(--ffi-hairline)',
                                color: 'var(--ffi-ink-3)',
                              }),
                        }}
                      >
                        {label}
                        {isActive && (sortAsc
                          ? <ArrowUp style={{ width: 9, height: 9 }} />
                          : <ArrowDown style={{ width: 9, height: 9 }} />
                        )}
                      </button>
                    )
                  })}

                  {/* Target cycle filter */}
                  <button
                    onClick={cycleTargetFilter}
                    className="flex-shrink-0 ml-auto flex items-center gap-1 rounded-full font-bold text-[11px] uppercase transition-all"
                    style={{
                      fontFamily: 'var(--font-cond)',
                      letterSpacing: '0.10em',
                      padding: '5px 11px',
                      ...(targetFilter === 'target'
                        ? {
                            background: 'rgba(139,255,69,0.12)',
                            border: '1px solid rgba(139,255,69,0.25)',
                            color: 'var(--ffi-volt)',
                          }
                        : targetFilter === 'avoid'
                          ? {
                              background: 'rgba(255,110,138,0.10)',
                              border: '1px solid rgba(255,110,138,0.22)',
                              color: '#FF6E8A',
                            }
                          : {
                              background: 'var(--ffi-surface-1)',
                              border: '1px solid var(--ffi-hairline)',
                              color: 'var(--ffi-ink-3)',
                            }),
                    }}
                  >
                    {targetFilter === 'target' ? 'Targets' : targetFilter === 'avoid' ? 'Avoids' : 'All'}
                  </button>
                </div>
              </div>

              {/* ── PLAYER LIST ── */}
              <DraftBoardTable
                players={filteredPlayers}
                format={selectedLeague?.format ?? 'auction'}
                onToggleTarget={async (playerId) => {
                  const result = await toggleTag(playerId, 'target')
                  if (result.success) refetchTags()
                }}
                onToggleAvoid={async (playerId) => {
                  const result = await toggleTag(playerId, 'avoid')
                  if (result.success) refetchTags()
                }}
                isTagLoading={toggleLoading || tagsLoading}
              />
            </>
          )}

          {activeTab === 'position' && (
            <div className="mt-3">
              <PositionBreakdown
                players={scoredPlayers}
                format={selectedLeague?.format ?? 'auction'}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Sticky screen header: "Draft Board" + fixed league chip (single-league app) ──
function BoardHeader({ leagueName }: { leagueName?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h1
        className="font-extrabold text-[26px] leading-none"
        style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
      >
        Draft Board
      </h1>
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase"
        style={{
          fontFamily: 'var(--font-cond)',
          background: 'rgba(121,166,255,0.10)',
          border: '1px solid rgba(121,166,255,0.20)',
          color: 'var(--ffi-blue-bright)',
          letterSpacing: '0.14em',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--ffi-volt)', boxShadow: '0 0 6px var(--ffi-volt-glow)' }}
        />
        {leagueName ?? 'The Nasties'}
      </span>
    </div>
  )
}

// ── Empty state: no board yet → deep-link to Research landing (9.1) ──
function BoardEmpty() {
  return (
    <div
      className="rounded-[14px] p-8 text-center"
      style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
    >
      <p
        className="text-[16px] font-bold mb-1"
        style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
      >
        Run research to build your board
      </p>
      <p className="text-[13px] mb-4" style={{ color: 'var(--ffi-ink-2)' }}>
        Your ranked cheat sheet appears here once the player pool is analyzed.
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
  )
}
