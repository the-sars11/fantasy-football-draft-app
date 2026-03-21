'use client'

/**
 * LeagueOverview (FF-038)
 *
 * All managers' rosters at a glance.
 * Shows picks, budget remaining (auction), position breakdown per manager.
 */

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, ChevronRight, LayoutGrid } from 'lucide-react'
import type { DraftState } from '@/lib/draft/state'

const posColors: Record<string, string> = {
  QB: 'text-red-400',
  RB: 'text-blue-400',
  WR: 'text-green-400',
  TE: 'text-orange-400',
  K: 'text-purple-400',
  DEF: 'text-yellow-400',
}

interface LeagueOverviewProps {
  state: DraftState
  myManager: string
}

export function LeagueOverview({ state, myManager }: LeagueOverviewProps) {
  const [expandedManager, setExpandedManager] = useState<string | null>(null)
  const isAuction = state.format === 'auction'

  const toggle = (name: string) => {
    setExpandedManager(prev => prev === name ? null : name)
  }

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5" />
          League Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-0.5">
          {state.manager_order.map(name => {
            const mgr = state.managers[name]
            if (!mgr) return null

            const isMe = name === myManager
            const isExpanded = expandedManager === name
            const isCurrent = state.current_manager === name

            // Position summary
            const posCounts = Object.entries(mgr.roster_count)
              .filter(([, count]) => count > 0)
              .sort(([a], [b]) => a.localeCompare(b))

            return (
              <div key={name}>
                <button
                  onClick={() => toggle(name)}
                  className={`w-full flex items-center justify-between py-1.5 px-2 rounded text-xs hover:bg-muted/50 transition-colors ${
                    isMe ? 'bg-primary/5 border border-primary/15' : ''
                  } ${isCurrent && !isAuction ? 'ring-1 ring-primary/30' : ''}`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isExpanded
                      ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    }
                    <span className={`font-medium truncate ${isMe ? 'text-primary' : ''}`}>
                      {name}
                    </span>
                    {isCurrent && !isAuction && (
                      <Badge className="text-[8px] px-1 py-0 bg-primary/20 text-primary border-primary/30">
                        OTC
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Position mini-summary */}
                    <div className="hidden sm:flex items-center gap-1">
                      {posCounts.map(([pos, count]) => (
                        <span key={pos} className={`text-[9px] ${posColors[pos] ?? ''}`}>
                          {count}{pos[0]}
                        </span>
                      ))}
                    </div>
                    <span className="text-muted-foreground">{mgr.picks.length}p</span>
                    {isAuction && mgr.budget_remaining != null && (
                      <span className="font-mono text-muted-foreground">${mgr.budget_remaining}</span>
                    )}
                  </div>
                </button>

                {/* Expanded: show picks */}
                {isExpanded && (
                  <div className="ml-5 mr-2 mb-1 mt-0.5 space-y-0.5">
                    {mgr.picks.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground py-1">No picks</p>
                    ) : (
                      mgr.picks.map(pick => (
                        <div
                          key={pick.pick_number}
                          className="flex items-center gap-1.5 text-[11px] py-0.5"
                        >
                          <span className="font-mono text-muted-foreground w-4 text-right text-[9px]">
                            {pick.pick_number}
                          </span>
                          {pick.position && (
                            <span className={`font-semibold text-[9px] ${posColors[pick.position.toUpperCase()] ?? ''}`}>
                              {pick.position}
                            </span>
                          )}
                          <span className="flex-1 truncate">{pick.player_name}</span>
                          {isAuction && pick.price != null && (
                            <span className="font-mono text-muted-foreground text-[10px]">${pick.price}</span>
                          )}
                          {!isAuction && pick.round && (
                            <span className="text-muted-foreground text-[10px]">Rd {pick.round}</span>
                          )}
                        </div>
                      ))
                    )}

                    {/* Position needs summary */}
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                      {Object.entries(state.roster_slots).map(([pos, required]) => {
                        const filled = mgr.roster_count[pos.toUpperCase()] || 0
                        const remaining = Math.max(0, required - filled)
                        if (remaining === 0) return null
                        return (
                          <Badge key={pos} variant="outline" className="text-[9px] px-1 py-0">
                            {pos.toUpperCase()} ×{remaining}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
