'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Target, Ban, TrendingUp } from 'lucide-react'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat, Position } from '@/lib/players/types'

interface PositionBreakdownProps {
  players: ScoredPlayer[]
  format: DraftFormat
}

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

const posColors: Record<string, string> = {
  QB: 'border-red-500/40 bg-red-500/5',
  RB: 'border-blue-500/40 bg-blue-500/5',
  WR: 'border-green-500/40 bg-green-500/5',
  TE: 'border-orange-500/40 bg-orange-500/5',
  K: 'border-purple-500/40 bg-purple-500/5',
  DEF: 'border-yellow-500/40 bg-yellow-500/5',
}

const posTextColors: Record<string, string> = {
  QB: 'text-red-400',
  RB: 'text-blue-400',
  WR: 'text-green-400',
  TE: 'text-orange-400',
  K: 'text-purple-400',
  DEF: 'text-yellow-400',
}

function tierColor(tier: number): string {
  if (tier <= 1) return 'bg-green-500/20 text-green-400 border-green-500/30'
  if (tier <= 2) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  if (tier <= 3) return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
  if (tier <= 4) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
  if (tier <= 5) return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
  return 'bg-muted text-muted-foreground border-border'
}

function scoreBar(score: number): string {
  if (score >= 75) return 'bg-green-500'
  if (score >= 60) return 'bg-emerald-500'
  if (score >= 40) return 'bg-yellow-500'
  if (score >= 25) return 'bg-orange-500'
  return 'bg-red-500'
}

export function PositionBreakdown({ players, format }: PositionBreakdownProps) {
  const isAuction = format === 'auction'

  const byPosition = useMemo(() => {
    const grouped: Record<string, ScoredPlayer[]> = {}
    for (const pos of POSITIONS) {
      grouped[pos] = players
        .filter((sp) => sp.player.position === pos)
        .slice(0, 20)
    }
    return grouped
  }, [players])

  return (
    <div className="space-y-6">
      {POSITIONS.map((pos) => {
        const group = byPosition[pos]
        if (!group || group.length === 0) return null

        // Detect tier breaks — where the consensus tier changes
        const tiers: { tier: number; players: ScoredPlayer[] }[] = []
        let currentTier = -1
        for (const sp of group) {
          const t = sp.player.consensusTier ?? 0
          if (t !== currentTier) {
            tiers.push({ tier: t, players: [] })
            currentTier = t
          }
          tiers[tiers.length - 1].players.push(sp)
        }

        return (
          <Card key={pos} className={`border ${posColors[pos]}`}>
            <CardContent className="pt-4 pb-3 px-3 space-y-3">
              {/* Position header */}
              <div className="flex items-center justify-between">
                <h3 className={`font-bold text-base ${posTextColors[pos]}`}>{pos}</h3>
                <span className="text-xs text-muted-foreground">{group.length} players</span>
              </div>

              {/* Tiered player rows */}
              {tiers.map(({ tier, players: tierPlayers }, tierIdx) => (
                <div key={tierIdx} className="space-y-0.5">
                  {/* Tier label */}
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${tierColor(tier)}`}>
                      Tier {tier || '?'}
                    </Badge>
                    <div className="flex-1 border-t border-border/40" />
                  </div>

                  {/* Players in this tier */}
                  {tierPlayers.map((sp) => {
                    const p = sp.player
                    const value = isAuction
                      ? sp.adjustedAuctionValue ?? p.consensusAuctionValue
                      : sp.adjustedRoundValue ?? p.adp

                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2 rounded px-2 py-1.5 text-sm ${
                          sp.targetStatus === 'avoid'
                            ? 'opacity-40'
                            : sp.targetStatus === 'target'
                              ? 'bg-green-500/5'
                              : 'hover:bg-muted/30'
                        }`}
                      >
                        {/* Rank */}
                        <span className="w-6 text-xs text-muted-foreground text-right shrink-0">
                          {p.consensusRank}
                        </span>

                        {/* Name + team */}
                        <div className="flex-1 min-w-0">
                          <span className="font-medium truncate block">{p.name}</span>
                          <span className="text-[10px] text-muted-foreground">{p.team} &middot; Bye {p.byeWeek}</span>
                        </div>

                        {/* Value */}
                        <span className="text-xs font-mono shrink-0">
                          {isAuction ? `$${value}` : value > 0 ? `Rd ${typeof value === 'number' ? Math.round(value) : value}` : '—'}
                        </span>

                        {/* Score bar */}
                        <div className="w-10 shrink-0 flex items-center gap-1">
                          <div className="w-6 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${scoreBar(sp.strategyScore)}`}
                              style={{ width: `${sp.strategyScore}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground w-4">
                            {sp.strategyScore}
                          </span>
                        </div>

                        {/* Status icon */}
                        <div className="w-4 shrink-0">
                          {sp.targetStatus === 'target' && <Target className="h-3 w-3 text-green-400" />}
                          {sp.targetStatus === 'avoid' && <Ban className="h-3 w-3 text-red-400" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
