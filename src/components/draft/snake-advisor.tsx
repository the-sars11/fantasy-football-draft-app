'use client'

/**
 * SnakeAdvisor (FF-045 through FF-049)
 *
 * Snake-specific advisory panel combining:
 * - FF-045: Draft position tracking (round, pick, picks until your turn)
 * - FF-046: Best available projection (who survives to your pick)
 * - FF-047: LLM "Top 3 targets" for snake via shared API route
 * - FF-048: Keeper value display (if keepers exist)
 * - FF-049: Trade-up/down suggestions
 */

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowUpDown,
  Clock,
  Target,
  ArrowUp,
  Loader2,
  RefreshCw,
  Sparkles,
  CircleDot,
} from 'lucide-react'
import {
  getSnakePositionInfo,
  projectBestAvailable,
  getTradeSuggestions,
  type ProjectedAvailability,
  type TradeSuggestion,
} from '@/lib/draft/snake-advisor'
import { fetchRecommendation, type LLMRecommendation } from '@/lib/draft/recommend'
import type { DraftState } from '@/lib/draft/state'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

const posColors: Record<string, string> = {
  QB: 'text-red-400',
  RB: 'text-blue-400',
  WR: 'text-green-400',
  TE: 'text-orange-400',
  K: 'text-purple-400',
  DEF: 'text-yellow-400',
}

interface SnakeAdvisorProps {
  state: DraftState
  managerName: string
  scoredPlayers: ScoredPlayer[]
  draftedNames: Set<string>
  strategy: DbStrategy | null
}

function survivalColor(pct: number): string {
  if (pct >= 80) return 'text-green-400'
  if (pct >= 50) return 'text-yellow-400'
  if (pct >= 25) return 'text-orange-400'
  return 'text-red-400'
}

export function SnakeAdvisor({
  state,
  managerName,
  scoredPlayers,
  draftedNames,
  strategy,
}: SnakeAdvisorProps) {
  const [recommendation, setRecommendation] = useState<LLMRecommendation | null>(null)
  const [loadingRec, setLoadingRec] = useState(false)
  const [recError, setRecError] = useState<string | null>(null)
  const [showProjections, setShowProjections] = useState(false)

  // FF-045: Position tracking
  const posInfo = getSnakePositionInfo(state, managerName)

  // FF-046: Best available projections
  const projections: ProjectedAvailability[] = showProjections
    ? projectBestAvailable(state, managerName, scoredPlayers, draftedNames)
    : []

  // FF-049: Trade suggestions
  const trades: TradeSuggestion[] = getTradeSuggestions(
    state, managerName, scoredPlayers, draftedNames,
  )

  // FF-047: LLM recommendation (reuses same API route)
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

  if (state.format !== 'snake') return null
  if (!posInfo) return null

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ArrowUpDown className="h-3.5 w-3.5" />
          Snake Advisor
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3 space-y-3">
        {/* FF-045: Draft position status */}
        <div className="flex items-center gap-3 flex-wrap text-xs">
          <div className="flex items-center gap-1">
            <CircleDot className="h-3 w-3 text-muted-foreground" />
            <span>Rd {posInfo.currentRound} · Pick {posInfo.currentPick}</span>
          </div>
          {posInfo.isMyPick ? (
            <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
              YOUR PICK
            </Badge>
          ) : (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">
                {posInfo.picksUntilMyTurn} pick{posInfo.picksUntilMyTurn !== 1 ? 's' : ''} away
              </span>
            </div>
          )}
          <span className="text-[10px] text-muted-foreground">
            Draft pos #{posInfo.myDraftPosition}
          </span>
        </div>

        {/* Managers picking before you */}
        {!posInfo.isMyPick && posInfo.managersPickingBefore.length > 0 && (
          <div className="text-[10px] text-muted-foreground">
            Before you: {posInfo.managersPickingBefore.join(', ')}
          </div>
        )}

        {/* FF-046: Best available projections */}
        <div className="space-y-1">
          <button
            onClick={() => setShowProjections(p => !p)}
            className="text-xs font-medium flex items-center gap-1 hover:text-primary transition-colors"
          >
            <Target className="h-3 w-3" />
            {showProjections ? 'Hide' : 'Show'} Availability Projections
          </button>

          {showProjections && projections.length > 0 && (
            <div className="space-y-0.5 mt-1">
              {projections.map(proj => (
                <div
                  key={proj.player.player.name}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 text-[11px]"
                >
                  <span className={`font-mono font-semibold w-8 text-right ${survivalColor(proj.survivalProbability)}`}>
                    {proj.survivalProbability}%
                  </span>
                  <span className={`font-semibold text-[10px] ${posColors[proj.player.player.position] ?? ''}`}>
                    {proj.player.player.position}
                  </span>
                  <span className="font-medium truncate flex-1">{proj.player.player.name}</span>
                  <span className="text-[9px] text-muted-foreground">
                    score:{proj.player.strategyScore}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FF-049: Trade suggestions */}
        {trades.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs font-medium flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              Trade Ideas
            </span>
            {trades.map((t, i) => (
              <div
                key={i}
                className={`rounded-md border px-2 py-1.5 text-[11px] ${
                  t.urgency === 'high'
                    ? 'border-orange-500/30 bg-orange-500/5'
                    : 'border-muted bg-muted/20'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[9px] px-1 py-0">
                    Trade {t.direction}
                  </Badge>
                  <span className="font-medium">{t.targetPlayer}</span>
                  <Badge variant="outline" className={`text-[9px] px-1 py-0 ${posColors[t.targetPosition] ?? ''}`}>
                    {t.targetPosition}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">{t.reasoning}</p>
              </div>
            ))}
          </div>
        )}

        {/* FF-047: LLM Targets */}
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
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.reasoning}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!recommendation && !loadingRec && (
            <p className="text-[10px] text-muted-foreground text-center py-1">
              Tap &quot;Get AI Targets&quot; for personalized pick recommendations
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
