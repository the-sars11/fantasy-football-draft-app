'use client'

/**
 * LiveDraftClient
 *
 * Main live draft dashboard. Combines:
 * - Draft state (picks via sheet polling or manual entry)
 * - Manual pick entry (FF-033)
 * - Remaining player pool with strategy scores (FF-034)
 * - Position scarcity tracker (FF-035)
 * - "Why?" explainability on every player (FF-036)
 *
 * - My roster panel with strategy grade (FF-037)
 * - League overview — all managers at a glance (FF-038)
 * - Manager tendency tracker (FF-039)
 * - Strategy swap (FF-P01)
 * - Draft flow monitor + alerts (FF-P02)
 * - Proactive pivot detection (FF-P03)
 *
 * Layout: two-column on desktop, stacked on mobile.
 * Left: pick log + manual entry + my roster + strategy + managers/tendencies
 * Right: alerts + player pool + scarcity
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Radio,
  Wifi,
  WifiOff,
  Users,
  DollarSign,
} from 'lucide-react'
import { useDraftState } from '@/hooks/use-draft-state'
import { ManualPickEntry } from '@/components/draft/manual-pick-entry'
import { PlayerPool } from '@/components/draft/player-pool'
import { PositionScarcityTracker } from '@/components/draft/position-scarcity'
import { MyRoster } from '@/components/draft/my-roster'
import { LeagueOverview } from '@/components/draft/league-overview'
import { ManagerTendencies } from '@/components/draft/manager-tendencies'
import { StrategySwap } from '@/components/draft/strategy-swap'
import { DraftFlowAlerts } from '@/components/draft/draft-flow-alerts'
import { PivotHistory } from '@/components/draft/pivot-history'
import { AuctionAdvisor } from '@/components/draft/auction-advisor'
import { SnakeAdvisor } from '@/components/draft/snake-advisor'
import type { PivotEntry } from '@/components/draft/pivot-history'
import { scorePlayersWithStrategy } from '@/lib/research/strategy/scoring'
import { calculateScarcity, explainPlayer } from '@/lib/draft/explain'
import { analyzeDraftFlow } from '@/lib/draft/flow-monitor'
import { detectPivotOpportunity } from '@/lib/draft/pivot-detector'
import type { Player } from '@/lib/players/types'
import type { DraftSession, League, RosterSlots } from '@/lib/supabase/database.types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'
import type { Explanation } from '@/lib/draft/explain'
import { clearRecommendationCache } from '@/lib/draft/recommend'

const posColors: Record<string, string> = {
  QB: 'text-red-400',
  RB: 'text-blue-400',
  WR: 'text-green-400',
  TE: 'text-orange-400',
  K: 'text-purple-400',
  DEF: 'text-yellow-400',
}

const DEFAULT_ROSTER: RosterSlots = {
  qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6,
}

export function LiveDraftClient() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  // Data loading
  const [session, setSession] = useState<DraftSession | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [strategy, setStrategy] = useState<DbStrategy | null>(null)
  const [allStrategies, setAllStrategies] = useState<DbStrategy[]>([])
  const [pivotDismissed, setPivotDismissed] = useState(false)
  const [pivotHistory, setPivotHistory] = useState<PivotEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load session + league + players + active strategy
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID in URL. Go back to Draft Setup.')
      setLoading(false)
      return
    }

    async function load() {
      try {
        // Fetch session and league in parallel with players and strategy
        const [sessionRes, playersRes, stratRes] = await Promise.all([
          fetch(`/api/draft/sessions/${sessionId}`),
          fetch('/api/players'),
          fetch('/api/strategies'),
        ])

        const sessionData = await sessionRes.json()
        if (!sessionRes.ok) throw new Error(sessionData.error || 'Failed to load session')

        setSession(sessionData.session)
        setLeague(sessionData.league)

        const playersData = await playersRes.json()
        if (playersRes.ok && playersData.players) {
          setPlayers(playersData.players)
        }

        const stratData = await stratRes.json()
        if (stratRes.ok && stratData.strategies) {
          const leagueStrats = stratData.strategies.filter(
            (s: DbStrategy) => s.league_id === sessionData.session.league_id
          )
          setAllStrategies(leagueStrats)
          // Find active strategy for this league
          const active = leagueStrats.find((s: DbStrategy) => s.is_active)
          if (active) setStrategy(active)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load draft data')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [sessionId])

  const rosterSlots = (league?.roster_slots ?? DEFAULT_ROSTER) as RosterSlots

  // Draft state machine
  const {
    state,
    addManualPick,
    undoLastPick,
    draftedNames,
    getNeeds,
    getBudget,
    getMaxBidFor,
    isPolling,
    lastPollAt,
    sheetError,
    saving,
  } = useDraftState({
    session,
    rosterSlots,
  })

  // Score players with active strategy
  const scoredPlayers: ScoredPlayer[] = useMemo(() => {
    if (!strategy || players.length === 0) {
      // No strategy — return players with neutral scores
      return players.map(p => ({
        player: p,
        strategyScore: 50,
        targetStatus: 'neutral' as const,
        boosts: [],
      }))
    }
    return scorePlayersWithStrategy(
      players,
      strategy,
      session?.format ?? 'auction',
      league?.budget ?? undefined,
    )
  }, [players, strategy, session?.format, league?.budget])

  // Position scarcity
  const scarcity = useMemo(() => {
    const available = players.filter(p => !draftedNames.has(p.name.toLowerCase()))
    return calculateScarcity(available, state?.manager_order.length ?? 10)
  }, [players, draftedNames, state?.manager_order.length])

  // Explanation generator (memoized callback for player pool)
  const getExplanation = useCallback((scored: ScoredPlayer): Explanation | null => {
    if (!state) return null
    const available = players.filter(p => !draftedNames.has(p.name.toLowerCase()))
    const managerName = state.manager_order[0] // "Me" / first manager
    return explainPlayer(scored, state, managerName, available)
  }, [state, players, draftedNames])

  // Draft flow monitor (FF-P02)
  const flow = useMemo(() => {
    if (!state) return null
    return analyzeDraftFlow(state, scoredPlayers, draftedNames, players)
  }, [state, scoredPlayers, draftedNames, players])

  // Pivot detection (FF-P03)
  const pivotSuggestion = useMemo(() => {
    if (!state || !flow || pivotDismissed) return null
    return detectPivotOpportunity(strategy, allStrategies, state, flow, scoredPlayers, draftedNames)
  }, [strategy, allStrategies, state, flow, scoredPlayers, draftedNames, pivotDismissed])

  // Strategy swap handler (FF-P01 + FF-P05)
  const handleStrategySwap = useCallback((newStrategy: DbStrategy, fromRecommendation = false) => {
    const prevName = strategy?.name ?? 'None'
    setStrategy(newStrategy)
    clearRecommendationCache() // FF-055: Force fresh recommendation after strategy swap
    setAllStrategies(prev => prev.map(s => ({
      ...s,
      is_active: s.id === newStrategy.id,
    })))
    setPivotDismissed(false)
    // Record in pivot history (FF-P05)
    setPivotHistory(prev => [...prev, {
      pickNumber: state?.total_picks ?? 0,
      fromStrategy: prevName,
      toStrategy: newStrategy.name,
      reason: fromRecommendation ? 'accepted_recommendation' : 'user_swap',
      timestamp: new Date(),
    }])
  }, [strategy?.name, state?.total_picks])

  // Dismiss pivot with history tracking (FF-P05)
  const handleDismissPivot = useCallback(() => {
    if (pivotSuggestion && strategy) {
      setPivotHistory(prev => [...prev, {
        pickNumber: state?.total_picks ?? 0,
        fromStrategy: strategy.name,
        toStrategy: strategy.name, // stayed with current
        reason: 'dismissed_recommendation',
        recommendedStrategy: pivotSuggestion.strategy.name,
        timestamp: new Date(),
      }])
    }
    setPivotDismissed(true)
  }, [pivotSuggestion, strategy, state?.total_picks])

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading draft session...
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Live Draft</h1>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
        <Button variant="outline" onClick={() => window.history.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  if (!state || !session) return null

  const isAuction = state.format === 'auction'
  const managerNames = state.manager_order
  const myManager = managerNames[0] // first manager = "Me"
  const myBudget = getBudget(myManager)
  const myMaxBid = getMaxBidFor(myManager)
  const myNeeds = getNeeds(myManager)

  return (
    <div className="space-y-3">
      {/* Compact header — fits on one mobile line */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Radio className="h-4 w-4 text-red-400 shrink-0" />
          <h1 className="text-base font-bold truncate">Live Draft</h1>
        </div>

        <div className="flex items-center gap-2 text-xs shrink-0">
          {/* Polling status */}
          {session.sheet_url && (
            isPolling
              ? <Wifi className="h-3 w-3 text-green-400" />
              : <WifiOff className="h-3 w-3 text-red-400" />
          )}
          {saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          <Badge variant="outline" className="text-[10px]">
            {state.total_picks} pick{state.total_picks !== 1 ? 's' : ''}
          </Badge>
          {state.status === 'completed' && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px]">
              DONE
            </Badge>
          )}
        </div>
      </div>

      {/* My status bar — compact, always visible */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="font-semibold">{myManager}</span>
        {isAuction && myBudget != null && (
          <>
            <span className="font-mono">
              <DollarSign className="inline h-3 w-3" />
              {myBudget}
            </span>
            {myMaxBid != null && (
              <span className="text-muted-foreground">(max ${myMaxBid})</span>
            )}
          </>
        )}
        {!isAuction && state.current_round && (
          <span className="text-muted-foreground">
            Rd {state.current_round}.{state.current_pick_in_round}
          </span>
        )}
        <span className="text-muted-foreground hidden sm:inline">
          · {league?.name} · {isAuction ? 'Auction' : 'Snake'} / {managerNames.length}T
        </span>
      </div>

      {/* Position needs — compact inline */}
      <div className="flex flex-wrap gap-1">
        {Object.entries(myNeeds).map(([pos, needed]) => (
          <Badge key={pos} variant="outline" className="text-[10px] px-1.5 py-0">
            {pos} ×{needed}
          </Badge>
        ))}
        {Object.keys(myNeeds).length === 0 && (
          <span className="text-[10px] text-muted-foreground">All positions filled</span>
        )}
      </div>

      {sheetError && (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
          Sheet error: {sheetError}
        </div>
      )}

      {/* Mobile: Enter Pick + Pool stacked (most important first)
          Desktop: two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-3">
        {/* Left column on desktop */}
        <div className="space-y-3">
          {/* Manual pick entry — always first on mobile */}
          {state.status !== 'completed' && (
            <ManualPickEntry
              players={players}
              draftedNames={draftedNames}
              managerNames={managerNames}
              format={state.format}
              currentManager={state.current_manager}
              currentRound={state.current_round}
              onSubmit={addManualPick}
              onUndo={undoLastPick}
              canUndo={state.picks.length > 0}
            />
          )}

          {/* Recent picks log */}
          <Card>
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-3.5 w-3.5" />
                Pick Log
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              {state.picks.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3 text-center">
                  No picks yet
                </p>
              ) : (
                <div className="max-h-48 overflow-auto space-y-0.5">
                  {[...state.picks].reverse().map(pick => (
                    <div
                      key={pick.pick_number}
                      className="flex items-center gap-1.5 py-0.5 px-1.5 rounded text-xs hover:bg-muted/30"
                    >
                      <span className="font-mono text-muted-foreground w-5 text-right shrink-0 text-[10px]">
                        {pick.pick_number}
                      </span>
                      {pick.position && (
                        <span className={`font-semibold text-[10px] ${posColors[pick.position.toUpperCase()] ?? 'text-foreground'}`}>
                          {pick.position}
                        </span>
                      )}
                      <span className="flex-1 font-medium truncate">{pick.player_name}</span>
                      <span className="text-muted-foreground truncate max-w-16">{pick.manager}</span>
                      {isAuction && pick.price != null && (
                        <span className="font-mono text-muted-foreground">${pick.price}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auction advisor (FF-040 through FF-044) */}
          {isAuction && (
            <AuctionAdvisor
              state={state}
              managerName={myManager}
              scoredPlayers={scoredPlayers}
              draftedNames={draftedNames}
              strategy={strategy}
            />
          )}

          {/* Snake advisor (FF-045 through FF-049) */}
          {!isAuction && (
            <SnakeAdvisor
              state={state}
              managerName={myManager}
              scoredPlayers={scoredPlayers}
              draftedNames={draftedNames}
              strategy={strategy}
            />
          )}

          {/* Strategy swap (FF-P01) */}
          {allStrategies.length > 1 && (
            <StrategySwap
              strategies={allStrategies}
              activeStrategy={strategy}
              leagueId={session.league_id}
              onSwap={handleStrategySwap}
            />
          )}

          {/* My roster with strategy grade (FF-037) */}
          <MyRoster
            state={state}
            managerName={myManager}
            rosterSlots={rosterSlots}
            strategy={strategy}
          />

          {/* League overview — all managers (FF-038), desktop only */}
          <div className="hidden lg:block">
            <LeagueOverview state={state} myManager={myManager} />
          </div>

          {/* Manager tendencies (FF-039), desktop only */}
          <div className="hidden lg:block">
            <ManagerTendencies state={state} myManager={myManager} />
          </div>

          {/* Pivot history (FF-P05), desktop only */}
          {pivotHistory.length > 0 && (
            <div className="hidden lg:block">
              <PivotHistory entries={pivotHistory} />
            </div>
          )}
        </div>

        {/* Right column: alerts + scarcity + player pool */}
        <div className="space-y-3">
          {/* Draft flow alerts + pivot suggestions (FF-P02/P03) */}
          {flow && (
            <DraftFlowAlerts
              flow={flow}
              pivotSuggestion={pivotSuggestion}
              onAcceptPivot={(s) => handleStrategySwap(s, true)}
              onDismissPivot={handleDismissPivot}
              currentStrategy={strategy}
              players={players}
              draftedNames={draftedNames}
              format={state.format}
              leagueBudget={league?.budget ?? undefined}
            />
          )}

          {/* Position scarcity */}
          <PositionScarcityTracker scarcity={scarcity} />

          {/* Available players */}
          <PlayerPool
            scoredPlayers={scoredPlayers}
            draftedNames={draftedNames}
            format={state.format}
            getExplanation={getExplanation}
          />
        </div>
      </div>

      {/* League overview + tendencies + pivot history — shown on mobile below everything else */}
      <div className="lg:hidden space-y-3">
        <LeagueOverview state={state} myManager={myManager} />
        <ManagerTendencies state={state} myManager={myManager} />
        {pivotHistory.length > 0 && <PivotHistory entries={pivotHistory} />}
      </div>
    </div>
  )
}
