'use client'

/**
 * SimulateClient (FF-276)
 *
 * Dry run simulation: stress-test active strategy vs ADP order.
 * Snake: user picks by strategy score, others pick by ADP.
 * Auction: round-robin, user picks by score within budget, others by ADP.
 * Entirely client-side — uses already-fetched /api/players data.
 */

import { useState, useEffect, useCallback } from 'react'
import { Play, Loader2, AlertCircle, Trophy, AlertTriangle, ChevronRight, Star } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  FFICard,
  FFIButton,
  FFIBadge,
  FFISectionHeader,
  FFIPositionBadge,
} from '@/components/ui/ffi-primitives'
import { scorePlayersWithStrategy } from '@/lib/research/strategy/scoring'
import { cacheToPlayers } from '@/lib/players/convert'
import type { Player, DraftFormat } from '@/lib/players/types'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

// --- Simulation constants ---

const DEFAULT_ROSTER = { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6, ir: 0 }
const TOTAL_SLOTS = Object.values(DEFAULT_ROSTER).reduce((s, v) => s + v, 0)

const STARTER_SLOTS: Record<string, number> = {
  QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1,
}

// --- Types ---

interface LeagueSummary {
  id: string
  name: string
  format: DraftFormat
  team_count: number
  budget: number | null
}

interface SimPick {
  player: Player
  pickNumber: number
  price?: number
}

interface PositionGrade {
  picks: Player[]
  starterCount: number
  grade: 'A' | 'B' | 'C' | 'F'
  tier1Count: number
}

interface SimResult {
  roster: SimPick[]
  positionGrades: Record<string, PositionGrade>
  verdict: 'Strong' | 'Average' | 'Weak'
  top50Count: number
  shutoutPositions: string[]
  format: DraftFormat
  managersCount: number
}

// --- Simulation logic ---

function computeGrade(
  picks: Player[],
  starters: number,
): { grade: 'A' | 'B' | 'C' | 'F'; tier1Count: number } {
  if (picks.length === 0) return { grade: 'F', tier1Count: 0 }
  const tier1Count = picks.slice(0, starters).filter((p) => p.consensusTier <= 1).length
  const tier2Count = picks.slice(0, starters).filter((p) => p.consensusTier <= 2).length
  const grade =
    tier1Count >= Math.ceil(starters / 2)
      ? 'A'
      : tier2Count >= Math.ceil(starters / 2)
        ? 'B'
        : picks.length > 0
          ? 'C'
          : 'F'
  return { grade, tier1Count }
}

function runSimulation(
  players: Player[],
  strategy: DbStrategy | null,
  league: LeagueSummary,
): SimResult {
  const format = league.format
  const numManagers = Math.max(2, league.team_count || 12)
  const budget = league.budget ?? 200
  const MY_IDX = 0

  // Score players through active strategy
  const scored = strategy
    ? scorePlayersWithStrategy(players, strategy, format, budget)
    : players.map((p) => ({
        player: p,
        combinedScore: 50,
        strategyScore: 50,
        intelScore: 0,
        targetStatus: 'neutral' as const,
        isUserTarget: false,
        isUserAvoid: false,
        boosts: [],
        intelBoosts: [],
      }))

  const scoreMap = new Map(scored.map((sp) => [sp.player.id, sp.combinedScore]))

  // Pool sorted by ADP for "others" picking
  let pool = [...players]
    .filter((p) => p.adp > 0 || p.consensusRank > 0)
    .sort((a, b) => {
      const adpA = a.adp > 0 ? a.adp : a.consensusRank * 1.2
      const adpB = b.adp > 0 ? b.adp : b.consensusRank * 1.2
      return adpA - adpB
    })

  const myPicks: Player[] = []
  const myPrices: number[] = []
  const otherRosters: Player[][] = Array.from({ length: numManagers }, () => [])
  const budgets = Array(numManagers).fill(budget)

  if (format === 'snake') {
    for (let round = 0; round < TOTAL_SLOTS; round++) {
      if (pool.length === 0) break
      const forward = round % 2 === 0
      for (let i = 0; i < numManagers; i++) {
        if (pool.length === 0) break
        const mgrIdx = forward ? i : numManagers - 1 - i

        let pick: Player
        if (mgrIdx === MY_IDX) {
          // Pick best by combined strategy score
          let bestScore = -Infinity
          let bestIdx = 0
          for (let j = 0; j < pool.length; j++) {
            const sc = scoreMap.get(pool[j].id) ?? 50
            if (sc > bestScore) {
              bestScore = sc
              bestIdx = j
            }
          }
          pick = pool[bestIdx]
          myPicks.push(pick)
        } else {
          // Others: best available by ADP (pool is pre-sorted)
          pick = pool[0]
          otherRosters[mgrIdx].push(pick)
        }
        pool = pool.filter((p) => p.id !== pick.id)
      }
    }
  } else {
    // Auction: simplified round-robin — each manager takes their top pick in turn
    const totalPicks = numManagers * TOTAL_SLOTS
    for (let pickIdx = 0; pickIdx < totalPicks; pickIdx++) {
      if (pool.length === 0) break
      const mgrIdx = pickIdx % numManagers
      const myBudget = budgets[mgrIdx]
      const currentRoster = mgrIdx === MY_IDX ? myPicks : otherRosters[mgrIdx]
      const slotsLeft = Math.max(1, TOTAL_SLOTS - currentRoster.length)
      const reserve = slotsLeft - 1 // $1 per remaining slot
      const maxSpend = Math.max(1, myBudget - reserve)

      const affordable = pool.filter((p) => Math.max(1, p.consensusAuctionValue || 1) <= maxSpend)
      const candidates = affordable.length > 0 ? affordable : pool.slice(0, 5)

      let pick: Player
      if (mgrIdx === MY_IDX) {
        pick = candidates.reduce((best, p) =>
          (scoreMap.get(p.id) ?? 50) > (scoreMap.get(best.id) ?? 50) ? p : best,
        )
      } else {
        // Others: best ADP from affordable candidates
        pick = candidates.reduce((best, p) => {
          const adpA = p.adp > 0 ? p.adp : p.consensusRank * 1.2
          const adpB = best.adp > 0 ? best.adp : best.consensusRank * 1.2
          return adpA < adpB ? p : best
        })
      }

      const price = Math.min(maxSpend, Math.max(1, pick.consensusAuctionValue || 1))
      budgets[mgrIdx] -= price

      if (mgrIdx === MY_IDX) {
        myPicks.push(pick)
        myPrices.push(price)
      } else {
        otherRosters[mgrIdx].push(pick)
      }
      pool = pool.filter((p) => p.id !== pick.id)
    }
  }

  // Build result
  const roster: SimPick[] = myPicks.map((p, idx) => ({
    player: p,
    pickNumber: idx + 1,
    price: format === 'auction' ? myPrices[idx] : undefined,
  }))

  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const
  const positionGrades: Record<string, PositionGrade> = {}
  const shutoutPositions: string[] = []

  for (const pos of positions) {
    const picks = myPicks.filter((p) => p.position === pos)
    const starters = STARTER_SLOTS[pos] ?? 1
    const { grade, tier1Count } = computeGrade(picks, starters)
    positionGrades[pos] = { picks, starterCount: starters, grade, tier1Count }
    if (picks.length === 0) shutoutPositions.push(pos)
  }

  const top50Count = myPicks.filter((p) => p.consensusRank > 0 && p.consensusRank <= 50).length
  const verdict: 'Strong' | 'Average' | 'Weak' =
    top50Count >= 5 ? 'Strong' : top50Count >= 3 ? 'Average' : 'Weak'

  return { roster, positionGrades, verdict, top50Count, shutoutPositions, format, managersCount: numManagers }
}

// --- Grade badge helpers ---

const gradeConfig = {
  A: { color: 'text-[var(--ffi-success)]', bg: 'bg-[var(--ffi-success)]/15' },
  B: { color: 'text-[var(--ffi-primary)]', bg: 'bg-[var(--ffi-primary)]/15' },
  C: { color: 'text-[var(--ffi-warning)]', bg: 'bg-[var(--ffi-warning)]/15' },
  F: { color: 'text-[var(--ffi-danger)]', bg: 'bg-[var(--ffi-danger)]/15' },
}

const verdictConfig = {
  Strong: { icon: Trophy, color: 'text-[var(--ffi-success)]', bg: 'bg-[var(--ffi-success)]/15', border: 'border-[var(--ffi-success)]/30' },
  Average: { icon: ChevronRight, color: 'text-[var(--ffi-warning)]', bg: 'bg-[var(--ffi-warning)]/15', border: 'border-[var(--ffi-warning)]/30' },
  Weak: { icon: AlertTriangle, color: 'text-[var(--ffi-danger)]', bg: 'bg-[var(--ffi-danger)]/15', border: 'border-[var(--ffi-danger)]/30' },
}

// --- Main component ---

export function SimulateClient() {
  const [leagues, setLeagues] = useState<LeagueSummary[]>([])
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [strategy, setStrategy] = useState<DbStrategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const selectedLeague = leagues.find((l) => l.id === selectedLeagueId)

  // Load leagues + players + strategy on mount / league change
  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setResult(null)
      try {
        const [leaguesRes, playersRes] = await Promise.all([
          fetch('/api/leagues'),
          fetch('/api/players?limit=500'),
        ])
        if (cancelled) return

        if (leaguesRes.ok) {
          const data = await leaguesRes.json()
          const list: LeagueSummary[] = data.leagues || []
          setLeagues(list)
          if (list.length > 0 && !selectedLeagueId) {
            setSelectedLeagueId(list[0].id)
          }
        }

        if (playersRes.ok) {
          const pData = await playersRes.json()
          setPlayers(cacheToPlayers(pData.players || []))
        }
      } catch {
        // non-critical
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load active strategy when league changes
  useEffect(() => {
    if (!selectedLeagueId) return
    let cancelled = false

    async function loadStrategy() {
      try {
        const res = await fetch(`/api/strategies?leagueId=${selectedLeagueId}`)
        if (!res.ok || cancelled) return
        const data = await res.json()
        const active = (data.strategies ?? []).find((s: DbStrategy) => s.is_active) ?? null
        if (!cancelled) setStrategy(active)
      } catch {
        // non-critical
      }
    }

    loadStrategy()
    return () => { cancelled = true }
  }, [selectedLeagueId])

  const handleRun = useCallback(() => {
    if (!selectedLeague || players.length === 0) return
    setSimulating(true)
    setError(null)
    setResult(null)

    // Run in a microtask to let UI update first
    setTimeout(() => {
      try {
        const sim = runSimulation(players, strategy, selectedLeague)
        setResult(sim)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Simulation failed')
      } finally {
        setSimulating(false)
      }
    }, 50)
  }, [selectedLeague, players, strategy])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading player data...
      </div>
    )
  }

  if (leagues.length === 0) {
    return (
      <FFICard>
        <p className="text-sm text-muted-foreground text-center py-4">
          No leagues configured.{' '}
          <a href="/prep/configure" className="text-primary underline underline-offset-4">
            Set up a league
          </a>{' '}
          first.
        </p>
      </FFICard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <FFICard>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedLeagueId ?? ''} onValueChange={setSelectedLeagueId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Select a league" />
            </SelectTrigger>
            <SelectContent>
              {leagues.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedLeague && (
            <Badge variant="outline">
              {selectedLeague.format === 'auction' ? 'Auction' : 'Snake'} · {selectedLeague.team_count} teams
            </Badge>
          )}

          {strategy && (
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3 text-yellow-500" aria-hidden="true" />
              {strategy.name}
            </Badge>
          )}

          {!strategy && (
            <span className="text-xs text-muted-foreground">
              No active strategy -{' '}
              <a href="/prep/strategies" className="text-primary underline underline-offset-4">
                set one
              </a>{' '}
              for best results
            </span>
          )}

          <FFIButton
            onClick={handleRun}
            disabled={simulating || players.length === 0 || !selectedLeague}
            variant="primary"
            size="sm"
            className="ml-auto"
          >
            {simulating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                Simulating...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Run Simulation
              </>
            )}
          </FFIButton>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          {selectedLeague?.format === 'snake'
            ? `Simulates a ${TOTAL_SLOTS}-round snake draft. You pick first (pick 1 overall). Your manager picks by strategy score; all others pick in ADP order.`
            : `Simulates an auction draft with ${selectedLeague?.team_count ?? 12} managers and $${selectedLeague?.budget ?? 200} budget. Your manager bids by strategy score; all others bid by ADP.`}
        </p>
      </FFICard>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Verdict */}
          <VerdictCard result={result} />

          {/* Position grades */}
          <PositionGradeCard result={result} />

          {/* Simulated roster */}
          <RosterCard result={result} />
        </div>
      )}
    </div>
  )
}

// --- Sub-components ---

function VerdictCard({ result }: { result: SimResult }) {
  const cfg = verdictConfig[result.verdict]
  const VerdictIcon = cfg.icon
  const isAuction = result.format === 'auction'

  return (
    <FFICard variant="elevated" className={`border-l-4 ${cfg.border}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${cfg.bg}`}>
            <VerdictIcon className={`h-5 w-5 ${cfg.color}`} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Simulation Verdict</div>
            <div className={`text-2xl font-bold ${cfg.color}`}>{result.verdict}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Top-50 players</div>
          <div className="text-xl font-bold text-foreground">{result.top50Count} / {TOTAL_SLOTS}</div>
        </div>
      </div>

      {result.shutoutPositions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              Shut out at: {result.shutoutPositions.join(', ')}
            </span>
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-muted-foreground">
        {isAuction
          ? 'Verdict based on top-50 count across a round-robin auction simulation'
          : `Verdict based on top-50 count across a ${result.managersCount}-team snake draft`
        }
      </div>
    </FFICard>
  )
}

function PositionGradeCard({ result }: { result: SimResult }) {
  const positions = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'] as const

  return (
    <FFICard>
      <FFISectionHeader title="Position Grades" subtitle="Tier-1 starter coverage" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-3">
        {positions.map((pos) => {
          const g = result.positionGrades[pos]
          if (!g) return null
          const cfg = gradeConfig[g.grade]
          return (
            <div
              key={pos}
              className={`rounded-lg p-3 text-center border ${cfg.bg} border-transparent`}
            >
              <FFIPositionBadge position={pos === 'DEF' ? 'DEF' : pos} />
              <div className={`text-2xl font-bold mt-2 ${cfg.color}`}>{g.grade}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {g.picks.length} picked
              </div>
              {g.tier1Count > 0 && (
                <div className="text-[9px] text-muted-foreground">
                  {g.tier1Count} T1
                </div>
              )}
            </div>
          )
        })}
      </div>
    </FFICard>
  )
}

function RosterCard({ result }: { result: SimResult }) {
  const isAuction = result.format === 'auction'

  return (
    <FFICard>
      <FFISectionHeader
        title="Simulated Roster"
        subtitle={isAuction ? 'Your picks in bid order' : 'Your picks in draft order'}
      />
      <div className="mt-3 space-y-1">
        {result.roster.map((pick) => {
          const tier = pick.player.consensusTier
          const isElite = tier <= 1
          const isSolid = tier <= 2 && !isElite

          return (
            <div
              key={pick.player.id}
              className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors"
            >
              <span className="text-xs text-muted-foreground w-6 text-right font-mono">
                {isAuction ? `#${pick.pickNumber}` : `R${Math.ceil(pick.pickNumber / 1)}`}
              </span>
              <FFIPositionBadge position={pick.player.position === 'DEF' ? 'DEF' : pick.player.position} />
              <span className="flex-1 text-sm font-medium truncate">{pick.player.name}</span>
              <span className="text-xs text-muted-foreground truncate max-w-[80px]">{pick.player.team}</span>

              {/* Tier badge */}
              {isElite && (
                <FFIBadge status="success" className="text-[9px]">T1</FFIBadge>
              )}
              {isSolid && (
                <FFIBadge status="info" className="text-[9px]">T2</FFIBadge>
              )}

              {/* Price or round */}
              {isAuction && pick.price != null ? (
                <span className="text-xs font-mono text-[var(--ffi-accent)] w-12 text-right">
                  ${pick.price}
                </span>
              ) : !isAuction ? (
                <span className="text-xs text-muted-foreground w-12 text-right font-mono">
                  Rd {Math.ceil(pick.pickNumber)}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </FFICard>
  )
}
