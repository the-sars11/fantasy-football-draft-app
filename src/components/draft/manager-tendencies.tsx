'use client'

/**
 * ManagerTendencies (FF-039)
 *
 * Tracks each manager's draft patterns:
 * - Positions targeted (what they're buying)
 * - Spending behavior (auction: avg price, big spenders vs bargain hunters)
 * - Pick behavior (snake: position by round patterns)
 * - Likely next move prediction
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import type { DraftState } from '@/lib/draft/state'

const posColors: Record<string, string> = {
  QB: 'bg-red-500/15 text-red-400 border-red-500/30',
  RB: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  WR: 'bg-green-500/15 text-green-400 border-green-500/30',
  TE: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  K: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  DEF: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

interface ManagerTendency {
  name: string
  pickCount: number
  positionFocus: string[] // positions drafted, in order of frequency
  avgPrice: number | null // auction only
  maxPrice: number | null // auction highest bid
  spendingStyle: string | null // auction: "aggressive" | "balanced" | "bargain"
  likelyNeeds: string[] // positions not yet drafted that are required
  budgetPct: number | null // % of budget spent
}

interface ManagerTendenciesProps {
  state: DraftState
  myManager: string
}

function analyzeTendencies(state: DraftState, myManager: string): ManagerTendency[] {
  const isAuction = state.format === 'auction'
  const totalSlots = Object.values(state.roster_slots).reduce((s, v) => s + v, 0)

  return state.manager_order
    .filter(name => name !== myManager)
    .map(name => {
      const mgr = state.managers[name]
      if (!mgr) return null

      // Position frequency
      const posCounts: Record<string, number> = {}
      let totalSpent = 0
      let maxPrice = 0

      for (const pick of mgr.picks) {
        if (pick.position) {
          const pos = pick.position.toUpperCase()
          posCounts[pos] = (posCounts[pos] || 0) + 1
        }
        if (isAuction && pick.price) {
          totalSpent += pick.price
          maxPrice = Math.max(maxPrice, pick.price)
        }
      }

      const positionFocus = Object.entries(posCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([pos]) => pos)

      // Likely needs: required positions not yet filled
      const likelyNeeds: string[] = []
      for (const [pos, required] of Object.entries(state.roster_slots)) {
        if (pos === 'bench' || pos === 'flex') continue
        const filled = mgr.roster_count[pos.toUpperCase()] || 0
        if (filled < required) {
          likelyNeeds.push(pos.toUpperCase())
        }
      }

      // Auction metrics
      let avgPrice: number | null = null
      let spendingStyle: string | null = null
      let budgetPct: number | null = null

      if (isAuction && mgr.picks.length > 0) {
        avgPrice = Math.round(totalSpent / mgr.picks.length)
        const budget = mgr.budget_total ?? 200
        budgetPct = Math.round((totalSpent / budget) * 100)
        const progressPct = (mgr.picks.length / totalSlots) * 100

        if (budgetPct > progressPct + 15) {
          spendingStyle = 'aggressive'
        } else if (budgetPct < progressPct - 15) {
          spendingStyle = 'bargain'
        } else {
          spendingStyle = 'balanced'
        }
      }

      return {
        name,
        pickCount: mgr.picks.length,
        positionFocus,
        avgPrice,
        maxPrice: isAuction && maxPrice > 0 ? maxPrice : null,
        spendingStyle,
        likelyNeeds,
        budgetPct,
      }
    })
    .filter(Boolean) as ManagerTendency[]
}

export function ManagerTendencies({ state, myManager }: ManagerTendenciesProps) {
  const tendencies = useMemo(
    () => analyzeTendencies(state, myManager),
    [state, myManager],
  )

  const isAuction = state.format === 'auction'

  if (tendencies.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5" />
          Manager Tendencies
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-2">
          {tendencies.map(t => (
            <div key={t.name} className="border border-border/50 rounded px-2 py-1.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium">{t.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground">{t.pickCount}p</span>
                  {isAuction && t.spendingStyle && (
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${
                        t.spendingStyle === 'aggressive'
                          ? 'border-red-500/30 text-red-400'
                          : t.spendingStyle === 'bargain'
                          ? 'border-green-500/30 text-green-400'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {t.spendingStyle}
                    </Badge>
                  )}
                </div>
              </div>

              {/* What they've drafted */}
              {t.positionFocus.length > 0 && (
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-[9px] text-muted-foreground shrink-0">Drafted:</span>
                  {t.positionFocus.map(pos => (
                    <Badge
                      key={pos}
                      variant="outline"
                      className={`text-[9px] px-1 py-0 ${posColors[pos] ?? ''}`}
                    >
                      {pos}
                    </Badge>
                  ))}
                  {isAuction && t.avgPrice != null && (
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      avg ${t.avgPrice}{t.maxPrice ? ` / max $${t.maxPrice}` : ''}
                    </span>
                  )}
                </div>
              )}

              {/* What they likely need */}
              {t.likelyNeeds.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-muted-foreground shrink-0">Needs:</span>
                  {t.likelyNeeds.map(pos => (
                    <span key={pos} className="text-[9px] text-orange-400">{pos}</span>
                  ))}
                  {isAuction && t.budgetPct != null && (
                    <span className="text-[9px] text-muted-foreground ml-auto">
                      {t.budgetPct}% spent
                    </span>
                  )}
                </div>
              )}

              {t.pickCount === 0 && (
                <p className="text-[9px] text-muted-foreground">No picks yet</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
