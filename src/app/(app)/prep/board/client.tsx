'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { Loader2, AlertCircle, RefreshCw, CheckCircle2, Star, ArrowDown, ArrowUp, Play, ChevronLeft } from 'lucide-react'
import { DraftBoardTable } from '@/components/prep/draft-board-table'
import { PositionBreakdown } from '@/components/prep/position-breakdown'
import { LeagueIntelPanel } from '@/components/prep/league-intel-panel'
import { DraftPlanPanel } from '@/components/prep/draft-plan-panel'
import { Nameplate } from '@/components/ui/shield'
import {
  scorePlayersWithStrategy,
  buildIntelContextMap,
  type ScoredPlayer,
} from '@/lib/research/strategy/scoring'
import { cacheToPlayers } from '@/lib/players/convert'
import { useUserTags, useToggleTag } from '@/hooks/use-user-tags'
import { useResearchDataset } from '@/hooks/use-research-dataset'
import { buildEnrichmentMap } from '@/lib/research/dataset-enrichment'
import { buildDraftPlan } from '@/lib/prep/draft-plan'
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

// K omitted: the Nasties is a no-kicker league, so a kicker filter is dead
// weight here (mirrors /prep/players, which omits K for the same reason).
const POSITIONS: (Position | 'ALL')[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DEF']
type SortField = 'rank' | 'score' | 'value' | 'name'
type TargetFilter = 'all' | 'target' | 'avoid' | 'neutral'

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'score', label: 'Score' },
  { field: 'value', label: 'Value' },
  { field: 'rank',  label: 'Rank' },
]

const POS_PILL_COLORS: Record<string, { text: string; border: string }> = {
  QB:  { text: 'var(--ffi-pos-qb)',  border: 'rgba(255,110,138,0.30)' },
  RB:  { text: 'var(--ffi-pos-rb)',  border: 'rgba(86,224,160,0.30)'  },
  WR:  { text: 'var(--ffi-pos-wr)',  border: 'rgba(108,168,255,0.30)' },
  TE:  { text: 'var(--ffi-pos-te)',  border: 'rgba(255,176,92,0.30)'  },
  K:   { text: 'var(--ffi-pos-k)',   border: 'rgba(167,139,250,0.30)' },
  DEF: { text: 'var(--ffi-pos-def)', border: 'rgba(99,115,150,0.30)'  },
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

  // Filters
  const [positionFilter, setPositionFilter] = useState<Position | 'ALL'>('ALL')
  const [targetFilter, setTargetFilter] = useState<TargetFilter>('all')
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortAsc, setSortAsc] = useState(false)
  const [activeTab, setActiveTab] = useState<'board' | 'position' | 'flex'>('board')

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

  // Research dataset (W0 seam) - additive per-player enrichment + league intel.
  // Board keeps working exactly as before when no dataset is published yet.
  const { run: datasetRun, isEmpty: datasetEmpty } = useResearchDataset({
    leagueId: selectedLeagueId,
    enabled: !!selectedLeagueId,
  })
  const dataset = datasetRun?.dataset ?? null
  const enrichmentMap = useMemo(
    () => (dataset ? buildEnrichmentMap(dataset.players) : undefined),
    [dataset],
  )
  // "Your Plan" header view-model - anchor / second-buy / pockets / overpays,
  // all derived from the same dataset (no hand-entered picks).
  const draftPlan = useMemo(() => buildDraftPlan(dataset), [dataset])

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

  // Filter + sort
  const filteredPlayers = useMemo(() => {
    // No-kicker league: kickers never belong on the board, so drop them from
    // the base pool (mirrors /prep/players line ~247). Keeps the ALL view and
    // any sort from surfacing a kicker even though the K tab is gone.
    let result = scoredPlayers.filter((sp) => sp.player.position !== 'K')
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
        case 'name': cmp = a.player.name.localeCompare(b.player.name); break
      }
      return sortAsc ? -cmp : cmp
    })
  }, [scoredPlayers, positionFilter, targetFilter, sortField, sortAsc, selectedLeague])

  // FLEX tab: RB+WR+TE combined, sorted by value DESC (closes RV-9)
  const flexPlayers = useMemo(() => {
    return scoredPlayers
      .filter((sp) => sp.player.position === 'RB' || sp.player.position === 'WR' || sp.player.position === 'TE')
      .sort((a, b) => {
        const aVal = a.adjustedAuctionValue ?? a.player.consensusAuctionValue
        const bVal = b.adjustedAuctionValue ?? b.player.consensusAuctionValue
        if (bVal !== aVal) return bVal - aVal
        return a.player.consensusRank - b.player.consensusRank
      })
  }, [scoredPlayers])

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
        <Nameplate className="p-6 text-center">
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
        </Nameplate>
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

      {/* ── YOUR PLAN (answer up top, derived from the same dataset) ── */}
      {dataset && !datasetEmpty && <DraftPlanPanel plan={draftPlan} />}

      {dataset && !datasetEmpty && <LeagueIntelPanel intel={dataset.leagueIntel} />}

      {/* ── META STRIP ── */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {/* Format badge */}
        {selectedLeague && (
          <span
            className="font-bold text-[10px] uppercase rounded-full px-[10px] py-[4px]"
            style={{
              fontFamily: 'var(--font-cond)',
              letterSpacing: '0.16em',
              background: 'rgba(95,168,224,0.10)',
              border: '1px solid rgba(95,168,224,0.18)',
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
              background: 'rgba(166,60,65,0.12)',
              border: '1px solid rgba(166,60,65,0.26)',
              color: 'var(--ffi-gold-bright)',
            }}
          >
            <Star style={{ width: 11, height: 11 }} />
            {activeStrategy.name}
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
              ? { background: 'rgba(255,110,138,0.08)', border: '1px solid rgba(255,110,138,0.18)', color: 'var(--ffi-danger)' }
              : { background: 'rgba(95,168,224,0.08)', border: '1px solid rgba(95,168,224,0.18)', color: 'var(--ffi-blue-bright)' }
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
          {/* ── TABS ── */}
          <div
            className="flex gap-1 mb-0 rounded-[12px] p-1"
            style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}
          >
            {(['board', 'flex', 'position'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 rounded-[9px] py-[9px] font-bold text-[12px] uppercase transition-all"
                style={{
                  fontFamily: 'var(--font-cond)',
                  letterSpacing: '0.12em',
                  ...(activeTab === tab
                    ? {
                        background: tab === 'flex' ? 'var(--ffi-volt)' : 'var(--ffi-blue)',
                        color: tab === 'flex' ? 'var(--ffi-volt-ink)' : 'white',
                        boxShadow: tab === 'flex'
                          ? '0 4px 14px -4px var(--ffi-volt-glow)'
                          : '0 4px 14px -4px rgba(95,168,224,0.5)',
                      }
                    : {
                        color: 'var(--ffi-ink-3)',
                      }),
                }}
              >
                {tab === 'board' ? 'All Players' : tab === 'flex' ? 'FLEX' : 'By Position'}
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
                                color: 'white',
                                boxShadow: '0 4px 14px -4px rgba(95,168,224,0.45)',
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
                                background: 'rgba(95,168,224,0.18)',
                                border: '1px solid rgba(95,168,224,0.35)',
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
                            background: 'rgba(95,168,224,0.12)',
                            border: '1px solid rgba(95,168,224,0.28)',
                            color: 'var(--ffi-blue)',
                          }
                        : targetFilter === 'avoid'
                          ? {
                              background: 'rgba(255,110,138,0.10)',
                              border: '1px solid rgba(255,110,138,0.22)',
                              color: 'var(--ffi-danger)',
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
                enrichmentMap={enrichmentMap}
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

          {activeTab === 'flex' && (
            <div className="mt-3">
              {/* FLEX label */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="font-bold text-[10px] uppercase"
                  style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.20em', color: 'var(--ffi-ink-3)' }}
                >
                  RB / WR / TE - combined by value
                </span>
                <span
                  className="font-bold text-[10px] tabular-nums"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink-3)' }}
                >
                  {flexPlayers.length} players
                </span>
              </div>
              <DraftBoardTable
                players={flexPlayers}
                format={selectedLeague?.format ?? 'auction'}
                enrichmentMap={enrichmentMap}
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
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Sticky screen header: "Cheat Sheet" + fixed league chip (single-league app) ──
// FB-6: renamed from "Draft Board" -- collided with the "Live Draft" nav tab and
// read as if this screen WAS the live auction room. This is the pre-draft
// rankings reference; the auction itself happens under Live Draft.
function BoardHeader({ leagueName }: { leagueName?: string }) {
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
        <h1 className="ffi-title-red font-extrabold text-[26px] leading-none">
          Cheat Sheet
        </h1>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase"
          style={{
            fontFamily: 'var(--font-cond)',
            background: 'rgba(95,168,224,0.10)',
            border: '1px solid rgba(95,168,224,0.20)',
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
      <p className="ffi-caption mt-1.5" style={{ color: 'var(--ffi-text-secondary)' }}>
        Your pre-draft rankings - the auction itself happens under Live Draft
      </p>
    </div>
  )
}

// ── Empty state: no board yet → deep-link to Research landing (9.1) ──
function BoardEmpty() {
  return (
    <Nameplate className="p-8 text-center">
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
    </Nameplate>
  )
}
