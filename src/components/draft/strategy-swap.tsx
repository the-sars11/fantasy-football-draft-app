'use client'

/**
 * StrategySwap (FF-P01)
 *
 * One-tap strategy switching during live draft.
 * Shows all available strategies with the active one highlighted.
 * Switching recalculates all values/targets/recommendations instantly.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, Check } from 'lucide-react'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

interface StrategySwapProps {
  strategies: DbStrategy[]
  activeStrategy: DbStrategy | null
  leagueId: string
  onSwap: (strategy: DbStrategy) => void
}

const riskColors: Record<string, string> = {
  conservative: 'text-blue-400 border-blue-500/30',
  balanced: 'text-yellow-400 border-yellow-500/30',
  aggressive: 'text-red-400 border-red-500/30',
}

export function StrategySwap({ strategies, activeStrategy, leagueId, onSwap }: StrategySwapProps) {
  const [swapping, setSwapping] = useState<string | null>(null)

  const handleSwap = async (strategy: DbStrategy) => {
    if (strategy.id === activeStrategy?.id) return
    setSwapping(strategy.id)

    try {
      const res = await fetch('/api/strategies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strategyId: strategy.id, leagueId }),
      })

      if (res.ok) {
        onSwap(strategy)
      }
    } catch (err) {
      console.error('Strategy swap failed:', err)
    } finally {
      setSwapping(null)
    }
  }

  if (strategies.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5" />
          Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-1">
          {strategies.map(strat => {
            const isActive = strat.id === activeStrategy?.id
            const isSwapping = swapping === strat.id

            return (
              <button
                key={strat.id}
                onClick={() => handleSwap(strat)}
                disabled={isActive || isSwapping}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                  isActive
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isActive && <Check className="h-3 w-3 text-primary shrink-0" />}
                    {isSwapping && <Loader2 className="h-3 w-3 animate-spin shrink-0" />}
                    <span className={`font-medium truncate ${isActive ? 'text-primary' : ''}`}>
                      {strat.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${riskColors[strat.risk_tolerance] ?? ''}`}
                    >
                      {strat.risk_tolerance}
                    </Badge>
                  </div>
                </div>
                {strat.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1 ml-4">
                    {strat.description}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
