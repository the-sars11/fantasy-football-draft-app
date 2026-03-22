'use client'

/**
 * StrategyImpactPreview (FF-P04)
 *
 * Before accepting a pivot, shows what changes:
 * - Top 3 targets shift
 * - Budget allocation changes (auction)
 * - Position priority changes
 */

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { ArrowRight } from 'lucide-react'
import { scorePlayersWithStrategy } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'

const posColors: Record<string, string> = {
  QB: 'text-red-400',
  RB: 'text-blue-400',
  WR: 'text-green-400',
  TE: 'text-orange-400',
  K: 'text-purple-400',
  DEF: 'text-yellow-400',
}

interface StrategyImpactPreviewProps {
  currentStrategy: DbStrategy
  newStrategy: DbStrategy
  players: Player[]
  draftedNames: Set<string>
  format: 'auction' | 'snake'
  leagueBudget?: number
}

export function StrategyImpactPreview({
  currentStrategy,
  newStrategy,
  players,
  draftedNames,
  format,
  leagueBudget,
}: StrategyImpactPreviewProps) {
  const { currentTop3, newTop3, posChanges, budgetChanges } = useMemo(() => {
    const available = players.filter(p => !draftedNames.has(p.name.toLowerCase()))

    const currentScored = scorePlayersWithStrategy(available, currentStrategy, format, leagueBudget)
    const newScored = scorePlayersWithStrategy(available, newStrategy, format, leagueBudget)

    const currentTop3 = currentScored.slice(0, 3)
    const newTop3 = newScored.slice(0, 3)

    // Position priority changes
    const currentWeights = currentStrategy.position_weights as Record<string, number>
    const newWeights = newStrategy.position_weights as Record<string, number>
    const posChanges: Array<{ pos: string; from: number; to: number; direction: 'up' | 'down' }> = []

    for (const pos of ['QB', 'RB', 'WR', 'TE', 'K', 'DST']) {
      const from = currentWeights[pos] ?? 5
      const to = newWeights[pos] ?? 5
      if (Math.abs(to - from) >= 2) {
        posChanges.push({ pos, from, to, direction: to > from ? 'up' : 'down' })
      }
    }

    // Budget allocation changes (auction)
    const budgetChanges: Array<{ pos: string; from: number; to: number }> = []
    if (format === 'auction' && currentStrategy.budget_allocation && newStrategy.budget_allocation) {
      const currentAlloc = currentStrategy.budget_allocation as Record<string, number>
      const newAlloc = newStrategy.budget_allocation as Record<string, number>
      const allPositions = new Set([...Object.keys(currentAlloc), ...Object.keys(newAlloc)])

      for (const pos of allPositions) {
        const from = currentAlloc[pos] ?? 0
        const to = newAlloc[pos] ?? 0
        if (Math.abs(to - from) >= 3) {
          budgetChanges.push({ pos: pos.toUpperCase(), from: Math.round(from), to: Math.round(to) })
        }
      }
    }

    return { currentTop3, newTop3, posChanges, budgetChanges }
  }, [currentStrategy, newStrategy, players, draftedNames, format, leagueBudget])

  return (
    <div className="space-y-2 text-xs">
      {/* Top targets shift */}
      <div>
        <p className="text-[10px] text-muted-foreground mb-1">Top targets change:</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-0.5">
            {currentTop3.map((sp, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`text-[9px] font-bold ${posColors[sp.player.position] ?? ''}`}>
                  {sp.player.position}
                </span>
                <span className="truncate text-muted-foreground">{sp.player.name}</span>
              </div>
            ))}
          </div>
          <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
          <div className="flex-1 space-y-0.5">
            {newTop3.map((sp, i) => (
              <div key={i} className="flex items-center gap-1">
                <span className={`text-[9px] font-bold ${posColors[sp.player.position] ?? ''}`}>
                  {sp.player.position}
                </span>
                <span className="truncate font-medium">{sp.player.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Position priority changes */}
      {posChanges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {posChanges.map(({ pos, direction }) => (
            <Badge
              key={pos}
              variant="outline"
              className={`text-[9px] px-1 py-0 ${
                direction === 'up' ? 'text-green-400 border-green-500/30' : 'text-red-400 border-red-500/30'
              }`}
            >
              {pos} {direction === 'up' ? '↑' : '↓'}
            </Badge>
          ))}
        </div>
      )}

      {/* Budget allocation changes */}
      {budgetChanges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {budgetChanges.map(({ pos, from, to }) => (
            <span key={pos} className="text-[9px] text-muted-foreground">
              {pos}: {from}%→{to}%
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
