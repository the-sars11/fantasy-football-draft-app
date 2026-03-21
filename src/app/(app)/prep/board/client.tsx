'use client'

import { useState, useEffect, useMemo } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DraftBoardTable } from '@/components/prep/draft-board-table'
import { PositionBreakdown } from '@/components/prep/position-breakdown'
import { scorePlayersWithStrategy, type ScoredPlayer } from '@/lib/research/strategy/scoring'
import { cacheToPlayers } from '@/lib/players/convert'
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
  const [targetFilter, setTargetFilter] = useState<'all' | 'target' | 'avoid' | 'neutral'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('score')
  const [sortAsc, setSortAsc] = useState(false)

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId)

  // Fetch leagues
  useEffect(() => {
    async function fetchLeagues() {
      try {
        const res = await fetch('/api/leagues')
        if (!res.ok) throw new Error('Failed to fetch leagues')
        const data = await res.json()
        setLeagues(data.leagues || [])
        if (data.leagues?.length > 0) {
          setSelectedLeagueId(data.leagues[0].id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load leagues')
      } finally {
        setLoading(false)
      }
    }
    fetchLeagues()
  }, [])

  // Fetch players + active strategy when league changes
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
        // Non-critical — board degrades to unsorted player list
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [selectedLeagueId])

  // Score players through active strategy
  const scoredPlayers = useMemo<ScoredPlayer[]>(() => {
    if (players.length === 0) return []
    if (!activeStrategy || !selectedLeague) {
      // No strategy — return neutral scores
      return players.map((p) => ({
        player: p,
        strategyScore: 50,
        targetStatus: 'neutral' as const,
        boosts: [],
      }))
    }
    return scorePlayersWithStrategy(
      players,
      activeStrategy,
      selectedLeague.format,
      selectedLeague.budget ?? undefined,
    )
  }, [players, activeStrategy, selectedLeague])

  // Filter + sort
  const filteredPlayers = useMemo(() => {
    let result = scoredPlayers

    // Position filter
    if (positionFilter !== 'ALL') {
      result = result.filter((sp) => sp.player.position === positionFilter)
    }

    // Target status filter
    if (targetFilter !== 'all') {
      result = result.filter((sp) => sp.targetStatus === targetFilter)
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (sp) =>
          sp.player.name.toLowerCase().includes(q) ||
          sp.player.team.toLowerCase().includes(q),
      )
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'rank':
          cmp = a.player.consensusRank - b.player.consensusRank
          break
        case 'score':
          cmp = b.strategyScore - a.strategyScore
          break
        case 'value':
          if (selectedLeague?.format === 'auction') {
            cmp = (b.adjustedAuctionValue ?? b.player.consensusAuctionValue) -
                  (a.adjustedAuctionValue ?? a.player.consensusAuctionValue)
          } else {
            cmp = (a.adjustedRoundValue ?? a.player.adp) - (b.adjustedRoundValue ?? b.player.adp)
          }
          break
        case 'adp':
          cmp = a.player.adp - b.player.adp
          break
        case 'name':
          cmp = a.player.name.localeCompare(b.player.name)
          break
      }
      return sortAsc ? -cmp : cmp
    })

    return result
  }, [scoredPlayers, positionFilter, targetFilter, searchQuery, sortField, sortAsc, selectedLeague])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  // --- Render ---

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading leagues...</div>
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <div className="rounded-md bg-muted/50 border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No leagues configured yet.{' '}
          <a href="/prep/configure" className="text-primary underline underline-offset-4">
            Configure a league
          </a>{' '}
          to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* League selector + strategy badge */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedLeagueId ?? ''} onValueChange={setSelectedLeagueId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Select a league" />
          </SelectTrigger>
          <SelectContent>
            {leagues.map((league) => (
              <SelectItem key={league.id} value={league.id}>
                {league.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedLeague && (
          <Badge variant="outline">
            {selectedLeague.format === 'auction' ? 'Auction' : 'Snake'}
          </Badge>
        )}

        {activeStrategy && (
          <Badge variant="secondary" className="gap-1">
            <span className="text-yellow-500">&#9733;</span>
            {activeStrategy.name}
          </Badge>
        )}

        {!activeStrategy && !dataLoading && players.length > 0 && (
          <span className="text-xs text-muted-foreground">
            No active strategy &mdash;{' '}
            <a href="/prep/strategies" className="text-primary underline underline-offset-4">
              set one
            </a>
          </span>
        )}
      </div>

      {/* Content */}
      {dataLoading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">Loading player data...</div>
      ) : players.length === 0 ? (
        <div className="rounded-md bg-muted/50 border border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No player data yet.{' '}
            <a href="/prep" className="text-primary underline underline-offset-4">
              Run a data refresh
            </a>{' '}
            from the Prep hub.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="board">
          <TabsList>
            <TabsTrigger value="board">All Players</TabsTrigger>
            <TabsTrigger value="position">By Position</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="space-y-3 mt-3">
            {/* Filters bar */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Position pills */}
              <div className="flex gap-1">
                {POSITIONS.map((pos) => (
                  <Button
                    key={pos}
                    variant={positionFilter === pos ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    onClick={() => setPositionFilter(pos)}
                  >
                    {pos}
                  </Button>
                ))}
              </div>

              {/* Target filter */}
              <Select value={targetFilter} onValueChange={(v) => setTargetFilter(v as typeof targetFilter)}>
                <SelectTrigger className="w-[120px] h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Players</SelectItem>
                  <SelectItem value="target">Targets</SelectItem>
                  <SelectItem value="avoid">Avoids</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <Input
                placeholder="Search name or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-[180px] text-xs"
              />

              {/* Count */}
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredPlayers.length} players
              </span>
            </div>

            <DraftBoardTable
              players={filteredPlayers}
              format={selectedLeague?.format ?? 'auction'}
              sortField={sortField}
              sortAsc={sortAsc}
              onSort={handleSort}
            />
          </TabsContent>

          <TabsContent value="position" className="mt-3">
            <PositionBreakdown
              players={scoredPlayers}
              format={selectedLeague?.format ?? 'auction'}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
