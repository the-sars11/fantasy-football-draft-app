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
  type BudgetAnalysis,
  type PositionUrgencyWarning,
} from '@/lib/draft/auction-advisor'
import { fetchRecommendation, type LLMRecommendation } from '@/lib/draft/recommend'
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
  const [recommendation, setRecommendation] = useState<LLMRecommendation | null>(null)
  const [loadingRec, setLoadingRec] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)

  // FF-043: Budget strategy analysis
  const budget: BudgetAnalysis | null = analyzeBudgetStrategy(state, managerName)

  // FF-044: Position urgency warnings
  const warnings: PositionUrgencyWarning[] = getPositionUrgencyWarnings(
    state, managerName, scoredPlayers, draftedNames,
  )

  // FF-041: Fetch LLM recommendation
  const handleGetTargets = useCallback(async () => {
    setLoadingRec(true)
    setRecError(null)
    try {
      const rec = await fetchRecommendation(
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
