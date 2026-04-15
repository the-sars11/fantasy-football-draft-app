'use client'

/**
 * AuctionAdvisor (FF-040 through FF-044)
 *
 * Auction-specific advisory panel combining:
 * - FF-040: Budget status bar (per-manager budget, slots, pace)
 * - FF-041: LLM "Top 3 targets now" with refresh
 * - FF-042: Max bid calculator (shown per-player in pool, summary here)
 * - FF-043: Budget strategy analysis (ahead/behind plan)
 * - FF-044: Position urgency + budget warnings
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Target,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import {
  analyzeBudgetStrategy,
  getPositionUrgencyWarnings,
  getPositionBudgetBreakdown,
  type BudgetAnalysis,
  type PositionUrgencyWarning,
} from '@/lib/draft/auction-advisor'
import { fetchAuctionRecommendation, type LLMAuctionRecommendation } from '@/lib/draft/recommend-auction'
import type { DraftState } from '@/lib/draft/state'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

interface AuctionAdvisorProps {
  state: DraftState
  managerName: string
  scoredPlayers: ScoredPlayer[]
  draftedNames: Set<string>
  strategy: DbStrategy | null
}

const statusIcon = {
  ahead: <TrendingUp className="h-3.5 w-3.5 text-orange-400" />,
  behind: <TrendingDown className="h-3.5 w-3.5 text-blue-400" />,
  on_track: <Minus className="h-3.5 w-3.5 text-green-400" />,
}

const statusColor = {
  ahead: 'text-orange-400',
  behind: 'text-blue-400',
  on_track: 'text-green-400',
}

const severityStyle = {
  critical: 'border-red-500/30 bg-red-500/10 text-red-400',
  warning: 'border-orange-500/30 bg-orange-500/10 text-orange-400',
  info: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
}

export function AuctionAdvisor({
  state,
  managerName,
  scoredPlayers,
  draftedNames,
  strategy,
}: AuctionAdvisorProps) {
  const [recommendation, setRecommendation] = useState<LLMAuctionRecommendation | null>(null)
  const [loadingRec, setLoadingRec] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)

  // FF-043: Budget strategy analysis
  const budget: BudgetAnalysis | null = analyzeBudgetStrategy(state, managerName)

  // FF-262: Position budget breakdown
  const posBreakdown = getPositionBudgetBreakdown(state, managerName, strategy)

  // FF-044: Position urgency warnings
  const warnings: PositionUrgencyWarning[] = getPositionUrgencyWarnings(
    state, managerName, scoredPlayers, draftedNames,
  )

  // FF-263: Budget Health Panel derived values
  const totalSlots = Object.values(state.roster_slots).reduce((s: number, v: number) => s + v, 0)
  const filledSlots = state.managers[managerName]?.picks.length ?? 0
  const remainingSlots = Math.max(0, totalSlots - filledSlots)
  const healthSpent = budget ? budget.budgetTotal - budget.budgetRemaining : 0
  const healthSafeRemaining = budget
    ? Math.max(1, budget.budgetRemaining - Math.max(0, remainingSlots - 1))
    : 0
  const healthImpliedPerSlot = budget && remainingSlots > 0
    ? Math.round(healthSafeRemaining / remainingSlots)
    : 0
  const healthDelta = budget ? healthImpliedPerSlot - budget.avgPricePerPick : 0
  const healthBurnStatus: 'flush' | 'tight' | 'balanced' =
    healthDelta >= 6 ? 'flush' : healthDelta <= -6 ? 'tight' : 'balanced'

  // FF-041: Fetch LLM recommendation
  const handleGetTargets = useCallback(async () => {
    setLoadingRec(true)
    setRecError(null)
    try {
      const rec = await fetchAuctionRecommendation(
        state, managerName, scoredPlayers, draftedNames, strategy,
      )
      setRecommendation(rec)
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Failed to get targets')
    } finally {
      setLoadingRec(false)
    }
  }, [state, managerName, scoredPlayers, draftedNames, strategy])

  if (state.format !== 'auction') return null

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" />
          Auction Advisor
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        {/* FF-263: Budget Health Panel — at-a-glance numbers */}
        {budget && (
          <div className="rounded-md bg-muted/40 border border-border/50 px-3 py-2 space-y-1.5">
            {/* Row 1: $ spent · $ left + slot count */}
            <div className="flex items-center justify-between text-xs">
              <span className="tabular-nums">
                <span className="text-muted-foreground">Spent </span>
                <span className="font-semibold">${healthSpent}</span>
                <span className="text-muted-foreground"> · </span>
                <span className="font-semibold text-primary">${budget.budgetRemaining} left</span>
              </span>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {filledSlots} / {totalSlots} slots
              </span>
            </div>
            {/* Row 2: Implied $/slot + burn rate indicator */}
            {remainingSlots > 0 && (
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground tabular-nums font-mono">
                  ~${healthImpliedPerSlot}/slot remaining
                </span>
                {budget.avgPricePerPick > 0 && (
                  <span className={`font-medium tabular-nums ${
                    healthBurnStatus === 'flush' ? 'text-green-400' :
                    healthBurnStatus === 'tight' ? 'text-orange-400' :
                    'text-muted-foreground'
                  }`}>
                    {healthBurnStatus === 'flush'
                      ? `+$${healthDelta} vs avg`
                      : healthBurnStatus === 'tight'
                      ? `−$${Math.abs(healthDelta)} vs avg`
                      : '≈ avg'}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* FF-043: Budget status */}
        {budget && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {statusIcon[budget.status]}
                <span className={`text-xs font-medium ${statusColor[budget.status]}`}>
                  {budget.status === 'ahead' ? 'Spending Fast' :
                   budget.status === 'behind' ? 'Under-spending' : 'On Pace'}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                ${budget.avgPricePerPick} avg/pick
              </span>
            </div>

            {/* Budget bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  budget.status === 'ahead' ? 'bg-orange-400' :
                  budget.status === 'behind' ? 'bg-blue-400' : 'bg-green-400'
                }`}
                style={{ width: `${Math.min(100, budget.pctSpent)}%` }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{budget.pctSpent}% spent · {budget.pctPicks}% picks done</span>
              <span>~${budget.projectedEndBudget} leftover</span>
            </div>

            <p className="text-[11px] text-muted-foreground">{budget.suggestion}</p>
          </div>
        )}

        {/* FF-262: Position budget tracker */}
        {posBreakdown.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              By Position
            </span>
            <div className="space-y-1">
              {posBreakdown.map(row => (
                <div key={row.position} className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-semibold w-7 shrink-0">
                    {row.position}
                  </span>
                  <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        row.planned === 0
                          ? 'bg-primary/50'
                          : row.delta >= 0
                          ? 'bg-green-500/70'
                          : 'bg-orange-500/70'
                      }`}
                      style={{
                        width: row.planned > 0
                          ? `${Math.min(100, Math.round((row.spent / row.planned) * 100))}%`
                          : row.spent > 0 ? '100%' : '0%',
                      }}
                    />
                  </div>
                  <span className="text-[10px] font-mono tabular-nums text-muted-foreground w-16 text-right shrink-0">
                    {row.planned > 0 ? `$${row.spent}/$${row.planned}` : `$${row.spent}`}
                  </span>
                  {row.planned > 0 && (
                    <span className={`text-[10px] font-mono tabular-nums w-10 text-right shrink-0 ${
                      row.delta > 0 ? 'text-green-400' :
                      row.delta < 0 ? 'text-orange-400' :
                      'text-muted-foreground'
                    }`}>
                      {row.delta > 0 ? `+$${row.delta}` :
                       row.delta < 0 ? `-$${Math.abs(row.delta)}` :
                       '—'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FF-044: Position urgency warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1">
            {warnings.map((w, i) => (
              <div
                key={`${w.position}-${i}`}
                className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] ${severityStyle[w.severity]}`}
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span className="flex-1">{w.message}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  {w.remaining} avail
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* FF-041: LLM Targets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium flex items-center gap-1">
              <Target className="h-3 w-3" />
              Top Targets
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] px-2 gap-1"
              onClick={handleGetTargets}
              disabled={loadingRec}
            >
              {loadingRec ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : recommendation ? (
                <RefreshCw className="h-3 w-3" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              {recommendation ? 'Refresh' : 'Get AI Targets'}
            </Button>
          </div>

          {recError && (
            <p className="text-[10px] text-destructive">{recError}</p>
          )}

          {recommendation && (
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground italic">
                {recommendation.summary}
              </p>
              {recommendation.targets.map((t, i) => (
                <div
                  key={t.name}
                  className="flex items-start gap-1.5 rounded-md bg-muted/30 px-2 py-1.5"
                >
                  <span className="text-[10px] font-bold text-primary mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate">{t.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">
                        {t.position}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1 py-0 ${
                          t.confidence === 'high' ? 'border-green-500/40 text-green-400' :
                          t.confidence === 'medium' ? 'border-yellow-500/40 text-yellow-400' :
                          'border-muted-foreground/40'
                        }`}
                      >
                        {t.confidence}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-[10px] text-muted-foreground">{t.reasoning}</p>
                      <span className="text-[10px] font-mono font-semibold text-primary shrink-0 ml-1">
                        ${t.maxBid}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!recommendation && !loadingRec && (
            <p className="text-[10px] text-muted-foreground text-center py-1">
              Tap &quot;Get AI Targets&quot; for personalized recommendations
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
