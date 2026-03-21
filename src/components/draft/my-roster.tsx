'use client'

/**
 * MyRoster (FF-037)
 *
 * Shows the user's current picks, position needs,
 * and a grade vs. the active strategy plan.
 */

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, Check, AlertTriangle } from 'lucide-react'
import type { DraftState, DraftPick } from '@/lib/draft/state'
import type { RosterSlots } from '@/lib/supabase/database.types'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

const posColors: Record<string, string> = {
  QB: 'text-red-400',
  RB: 'text-blue-400',
  WR: 'text-green-400',
  TE: 'text-orange-400',
  K: 'text-purple-400',
  DEF: 'text-yellow-400',
}

interface MyRosterProps {
  state: DraftState
  managerName: string
  rosterSlots: RosterSlots
  strategy: DbStrategy | null
}

interface RosterGrade {
  letter: string
  score: number // 0-100
  summary: string
  details: string[]
}

function gradeRoster(
  picks: DraftPick[],
  rosterSlots: RosterSlots,
  strategy: DbStrategy | null,
  format: string,
): RosterGrade {
  if (picks.length === 0) {
    return { letter: '-', score: 0, summary: 'No picks yet', details: [] }
  }

  let score = 70 // baseline C+
  const details: string[] = []

  // Check position balance vs roster needs
  const filled: Record<string, number> = {}
  for (const p of picks) {
    if (p.position) {
      const pos = p.position.toUpperCase()
      filled[pos] = (filled[pos] || 0) + 1
    }
  }

  const totalSlots = Object.values(rosterSlots).reduce((s, v) => s + v, 0)
  const progress = picks.length / totalSlots

  // Check if strategy targets were hit
  if (strategy) {
    const targetNames = new Set(strategy.player_targets.map(t => t.player_name.toLowerCase()))
    const avoidNames = new Set(strategy.player_avoids.map(a => a.player_name.toLowerCase()))

    let targetsHit = 0
    let avoidsHit = 0

    for (const p of picks) {
      const name = p.player_name.toLowerCase()
      if (targetNames.has(name)) targetsHit++
      if (avoidNames.has(name)) avoidsHit++
    }

    if (targetsHit > 0) {
      score += targetsHit * 5
      details.push(`${targetsHit} strategy target${targetsHit > 1 ? 's' : ''} acquired`)
    }

    if (avoidsHit > 0) {
      score -= avoidsHit * 8
      details.push(`${avoidsHit} avoided player${avoidsHit > 1 ? 's' : ''} drafted`)
    }

    // Check budget allocation alignment (auction)
    if (format === 'auction' && strategy.budget_allocation) {
      const alloc = strategy.budget_allocation as Record<string, number>
      const totalSpent: Record<string, number> = {}
      let totalPrice = 0

      for (const p of picks) {
        if (p.price && p.position) {
          const pos = p.position.toUpperCase()
          totalSpent[pos] = (totalSpent[pos] || 0) + p.price
          totalPrice += p.price
        }
      }

      if (totalPrice > 0) {
        let allocDrift = 0
        for (const [pos, targetPct] of Object.entries(alloc)) {
          const actualPct = ((totalSpent[pos.toUpperCase()] || 0) / totalPrice) * 100
          allocDrift += Math.abs(actualPct - targetPct)
        }
        if (allocDrift < 20) {
          score += 5
          details.push('Budget allocation on track')
        } else if (allocDrift > 40) {
          score -= 5
          details.push('Budget allocation drifting from plan')
        }
      }
    }

    // Position weight alignment
    const posWeights = strategy.position_weights as Record<string, number>
    const priorityPositions = Object.entries(posWeights)
      .filter(([, w]) => w >= 7)
      .map(([pos]) => pos.toUpperCase())

    if (priorityPositions.length > 0 && progress > 0.2) {
      const priorityFilled = priorityPositions.filter(pos => (filled[pos] || 0) > 0)
      if (priorityFilled.length === priorityPositions.length) {
        score += 5
        details.push('Priority positions addressed')
      } else if (progress > 0.5) {
        const missing = priorityPositions.filter(pos => !(filled[pos] || 0))
        score -= 3
        details.push(`Priority gap: ${missing.join(', ')} still needed`)
      }
    }
  }

  // Auction value efficiency
  if (format === 'auction') {
    const prices = picks.filter(p => p.price).map(p => p.price!)
    if (prices.length >= 3) {
      const avg = prices.reduce((s, v) => s + v, 0) / prices.length
      if (avg < 15) {
        details.push('Bargain shopping approach')
      } else if (avg > 30) {
        details.push('Stars & scrubs spending pattern')
      }
    }
  }

  score = Math.max(0, Math.min(100, score))

  const letter = score >= 90 ? 'A+' : score >= 85 ? 'A' : score >= 80 ? 'A-'
    : score >= 77 ? 'B+' : score >= 73 ? 'B' : score >= 70 ? 'B-'
    : score >= 67 ? 'C+' : score >= 63 ? 'C' : score >= 60 ? 'C-'
    : score >= 55 ? 'D+' : score >= 50 ? 'D' : 'F'

  const summary = score >= 80 ? 'On track with strategy'
    : score >= 65 ? 'Mostly aligned'
    : 'Drifting from plan'

  return { letter, score, summary, details }
}

export function MyRoster({ state, managerName, rosterSlots, strategy }: MyRosterProps) {
  const manager = state.managers[managerName]
  if (!manager) return null

  const myPicks = manager.picks

  const grade = useMemo(() =>
    gradeRoster(myPicks, rosterSlots, strategy, state.format),
    [myPicks, rosterSlots, strategy, state.format],
  )

  // Group picks by position for roster view
  const byPosition = useMemo(() => {
    const groups: Record<string, DraftPick[]> = {}
    for (const p of myPicks) {
      const pos = p.position?.toUpperCase() || 'UNKNOWN'
      if (!groups[pos]) groups[pos] = []
      groups[pos].push(p)
    }
    return groups
  }, [myPicks])

  // Remaining needs
  const needs: Record<string, number> = {}
  for (const [pos, required] of Object.entries(rosterSlots)) {
    const filled = manager.roster_count[pos.toUpperCase()] || 0
    const remaining = Math.max(0, required - filled)
    if (remaining > 0) {
      needs[pos.toUpperCase()] = remaining
    }
  }

  const totalSlots = Object.values(rosterSlots).reduce((s, v) => s + v, 0)
  const gradeColor = grade.score >= 80 ? 'text-green-400'
    : grade.score >= 65 ? 'text-yellow-400'
    : 'text-red-400'

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <User className="h-3.5 w-3.5" />
            My Roster ({myPicks.length}/{totalSlots})
          </span>
          {myPicks.length > 0 && (
            <span className={`text-lg font-bold ${gradeColor}`}>
              {grade.letter}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-2">
        {/* Grade details */}
        {myPicks.length > 0 && (
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>{grade.summary}</p>
            {grade.details.map((d, i) => (
              <p key={i} className="flex items-center gap-1">
                {d.includes('acquired') || d.includes('on track') || d.includes('addressed')
                  ? <Check className="h-2.5 w-2.5 text-green-400 shrink-0" />
                  : <AlertTriangle className="h-2.5 w-2.5 text-orange-400 shrink-0" />
                }
                {d}
              </p>
            ))}
          </div>
        )}

        {/* Roster by position */}
        {myPicks.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2 text-center">
            No picks yet
          </p>
        ) : (
          <div className="space-y-1">
            {Object.entries(byPosition).map(([pos, picks]) => (
              <div key={pos}>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className={`text-[10px] font-bold ${posColors[pos] ?? 'text-foreground'}`}>
                    {pos}
                  </span>
                </div>
                {picks.map(pick => (
                  <div
                    key={pick.pick_number}
                    className="flex items-center justify-between py-0.5 px-1.5 text-xs hover:bg-muted/30 rounded"
                  >
                    <span className="font-medium truncate">{pick.player_name}</span>
                    <span className="text-muted-foreground font-mono text-[10px] shrink-0">
                      {state.format === 'auction' && pick.price != null ? `$${pick.price}` : ''}
                      {state.format === 'snake' && pick.round ? `Rd ${pick.round}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Remaining needs */}
        {Object.keys(needs).length > 0 && (
          <div className="pt-1 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-1">Still need:</p>
            <div className="flex flex-wrap gap-1">
              {Object.entries(needs).map(([pos, count]) => (
                <Badge key={pos} variant="outline" className="text-[10px] px-1.5 py-0">
                  {pos} ×{count}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
