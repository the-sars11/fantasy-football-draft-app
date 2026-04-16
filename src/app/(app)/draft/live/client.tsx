'use client'

/**
 * LiveDraftClient (FF-066 Redesign)
 *
 * Main live draft dashboard with FFI design system.
 * Features: Real-time feed, strategy picker dropdown, My Squad panel, inline AI recs
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Radio,
  ChevronDown,
  Sparkles,
  Target,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FFICard,
  FFIButton,
  FFIBadge,
  FFIPositionBadge,
  FFIProgress,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import { useDraftState } from '@/hooks/use-draft-state'
import { useUserTags } from '@/hooks/use-user-tags'
import { ConnectionStatusPill } from '@/components/draft/connection-status-pill'
import { ManualPickEntry } from '@/components/draft/manual-pick-entry'
import { PlayerPool } from '@/components/draft/player-pool'
import { PositionScarcityTracker } from '@/components/draft/position-scarcity'
import { LeagueOverview } from '@/components/draft/league-overview'
import { ManagerTendencies } from '@/components/draft/manager-tendencies'
import { DraftFlowAlerts } from '@/components/draft/draft-flow-alerts'
import { PivotHistory } from '@/components/draft/pivot-history'
import { AuctionAdvisor } from '@/components/draft/auction-advisor'
import { SnakeAdvisor } from '@/components/draft/snake-advisor'
import type { PivotEntry } from '@/components/draft/pivot-history'
import { scorePlayersWithStrategy, buildIntelContextMap } from '@/lib/research/strategy/scoring'
import { calculateScarcityExtended, explainPlayer } from '@/lib/draft/explain'
import { analyzeDraftFlow, detectStrategyDrift } from '@/lib/draft/flow-monitor'
import type { StrategyDrift } from '@/lib/draft/flow-monitor'
import { detectPivotOpportunity } from '@/lib/draft/pivot-detector'
import type { Player, Position } from '@/lib/players/types'
import type { DraftSession, League, RosterSlots } from '@/lib/supabase/database.types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'
import type { Explanation } from '@/lib/draft/explain'
import { clearRecommendationCache } from '@/lib/draft/recommend'
import { isKeeperPick, displayPickNum, keepersToPicks } from '@/lib/draft/keepers'
import { InjuryWatch } from '@/components/draft/injury-watch'
import { TrashTalkFeed, SavedTrashTalk } from '@/components/draft/trash-talk'
import { analyzePickForTrashTalk, analyzeKeeperPicksForTrashTalk } from '@/lib/draft/trash-talk'
import type { TrashTalkAlert } from '@/lib/draft/trash-talk'

const DEFAULT_ROSTER: RosterSlots = {
  qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6, ir: 0,
}

// Strategy Picker Dropdown Component
function StrategyPicker({
  strategies,
  activeStrategy,
  onSelect,
}: {
  strategies: DbStrategy[]
  activeStrategy: DbStrategy | null
  onSelect: (strategy: DbStrategy) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (strategies.length <= 1) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full ffi-card-interactive flex items-center justify-between gap-2 px-3 py-2"
      >
        <div>
          <div className="ffi-caption text-[var(--ffi-text-muted)]">ACTIVE STRATEGY</div>
          <div className="ffi-title-md text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--ffi-accent)]" />
            {activeStrategy?.name ?? 'None Selected'}
          </div>
        </div>
        <ChevronDown className={cn(
          'h-5 w-5 text-[var(--ffi-text-muted)] transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 ffi-card-elevated max-h-64 overflow-auto">
          {strategies.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onSelect(s)
                setIsOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-2 transition-colors',
                s.id === activeStrategy?.id
                  ? 'bg-[var(--ffi-accent)]/10 text-[var(--ffi-accent)]'
                  : 'hover:bg-[var(--ffi-surface)] text-white'
              )}
            >
              <div className="ffi-body-md font-medium">{s.name}</div>
              {s.description && (
                <div className="ffi-body-md text-[var(--ffi-text-muted)] truncate">
                  {s.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Real-time Pick Feed Component
function PickFeed({
  picks,
  format,
}: {
  picks: Array<{
    pick_number: number
    player_name: string
    manager: string
    position?: string
    price?: number
    is_keeper?: boolean
  }>
  format: 'auction' | 'snake'
}) {
  const isAuction = format === 'auction'
  const recentPicks = [...picks].reverse().slice(0, 10)

  return (
    <FFICard className="overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[var(--ffi-danger)] animate-pulse" />
        <span className="ffi-label text-[var(--ffi-text-secondary)]">LIVE FEED</span>
        <span className="ffi-caption text-[var(--ffi-text-muted)] ml-auto">
          {picks.length} PICKS
        </span>
      </div>

      {picks.length === 0 ? (
        <p className="ffi-body-md text-[var(--ffi-text-muted)] text-center py-4">
          Waiting for first pick...
        </p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-auto">
          <AnimatePresence mode="popLayout">
            {recentPicks.map((pick, idx) => (
              <motion.div
                key={`${pick.manager}-${pick.pick_number}`}
                layout
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 25,
                }}
                className={cn(
                  'flex items-center gap-2 py-1.5 px-2 rounded-lg',
                  idx === 0 && 'bg-[var(--ffi-accent)]/10'
                )}
              >
                <span className="ffi-caption text-[var(--ffi-text-muted)] w-6 text-right">
                  {displayPickNum(pick.pick_number)}
                </span>
                {pick.position && (
                  <FFIPositionBadge position={pick.position.toUpperCase() as Position} />
                )}
                {isKeeperPick(pick) && <span className="text-[10px] shrink-0" aria-label="Keeper">🔒</span>}
                <span className={cn('ffi-body-md font-medium flex-1 truncate', isKeeperPick(pick) ? 'text-[#94a3b8]' : 'text-white')}>
                  {pick.player_name}
                </span>
                <span className="ffi-body-md text-[var(--ffi-text-secondary)] truncate max-w-20">
                  {pick.manager}
                </span>
                {!isKeeperPick(pick) && isAuction && pick.price != null && (
                  <span className="ffi-label text-[var(--ffi-accent)] font-mono">
                    ${pick.price}
                  </span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </FFICard>
  )
}

// My Squad Panel Component
function MySquadPanel({
  picks,
  budget,
  maxBid,
  needs,
  format,
  rosterSlots,
}: {
  picks: Array<{ player_name: string; position?: string; price?: number }>
  budget: number | null
  maxBid: number | null
  needs: Record<string, number>
  format: 'auction' | 'snake'
  rosterSlots: RosterSlots
}) {
  const isAuction = format === 'auction'
  const totalSlots = Object.values(rosterSlots).reduce((a, b) => a + b, 0)
  const filledSlots = picks.length

  return (
    <FFICard variant="elevated">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--ffi-accent)]" />
          <span className="ffi-label text-[var(--ffi-text-secondary)]">YOUR SQUAD</span>
        </div>
        <span className="ffi-label text-[var(--ffi-text-muted)]">
          {filledSlots}/{totalSlots}
        </span>
      </div>

      {/* Budget bar for auction */}
      {isAuction && budget != null && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="ffi-body-md text-[var(--ffi-text-secondary)]">Budget</span>
            <span className="ffi-title-md text-[var(--ffi-accent)] font-mono">${budget}</span>
          </div>
          <FFIProgress value={(budget / (budget + 100)) * 100} status="elite" />
          {maxBid != null && (
            <span className="ffi-caption text-[var(--ffi-text-muted)]">
              Max bid: ${maxBid}
            </span>
          )}
        </div>
      )}

      {/* Position needs */}
      <div className="mb-3">
        <span className="ffi-caption text-[var(--ffi-text-muted)]">NEEDS</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(needs).map(([pos, count]) => (
            <FFIBadge key={pos} status="info" className="text-[10px]">
              {pos} ×{count}
            </FFIBadge>
          ))}
          {Object.keys(needs).length === 0 && (
            <span className="ffi-body-md text-[var(--ffi-success)]">Roster complete!</span>
          )}
        </div>
      </div>

      {/* Recent squad picks */}
      {picks.length > 0 && (
        <div className="space-y-1 border-t border-[var(--ffi-border)]/20 pt-3">
          {picks.slice(-5).reverse().map((pick, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {pick.position && (
                <span className="ffi-caption text-[var(--ffi-text-muted)] w-8">
                  {pick.position}
                </span>
              )}
              <span className="ffi-body-md text-white flex-1 truncate">
                {pick.player_name}
              </span>
              {isAuction && pick.price != null && (
                <span className="ffi-label text-[var(--ffi-text-secondary)] font-mono">
                  ${pick.price}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </FFICard>
  )
}

type TrashTalkMode = 'off' | 'family-safe' | 'adult-only'

export function LiveDraftClient() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const trashTalkMode = (searchParams.get('ttm') ?? 'family-safe') as TrashTalkMode

  // On Block: player nominated via BID button in the player pool
  const [onBlockPlayer, setOnBlockPlayer] = useState<Player | null>(null)

  // Data loading
  const [session, setSession] = useState<DraftSession | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [strategy, setStrategy] = useState<DbStrategy | null>(null)
  const [allStrategies, setAllStrategies] = useState<DbStrategy[]>([])
  const [pivotDismissed, setPivotDismissed] = useState(false)
  const [pivotHistory, setPivotHistory] = useState<PivotEntry[]>([])
  const [driftDismissed, setDriftDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Trash talk alerts
  const [trashTalkAlerts, setTrashTalkAlerts] = useState<TrashTalkAlert[]>([])
  const [savedAlerts, setSavedAlerts] = useState<TrashTalkAlert[]>([])
  // null = not yet initialized (skip existing picks on load); number = picks processed so far
  const processedPickCountRef = useRef<number | null>(null)
  // false = keeper alerts not yet fired; true = already fired once
  const keeperAlertsProcessedRef = useRef(false)

  // Load session + league + players + active strategy
  useEffect(() => {
    if (!sessionId) {
      setError('No session ID in URL. Go back to Draft Setup.')
      setLoading(false)
      return
    }

    async function load() {
      try {
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

  // FF-247: Load user tags for intel-aware recommendations
  const playerCacheIds = useMemo(() => players.map(p => p.id), [players])
  const { userTagsMap, isTarget, isAvoid } = useUserTags({
    playerCacheIds,
    leagueId: session?.league_id,
    includeGlobal: true,
    enabled: players.length > 0,
  })

  // Build intel context map from user tags
  const intelContextMap = useMemo(() => {
    if (Object.keys(userTagsMap).length === 0) return undefined

    const formattedMap: Record<string, { tags: string[]; dismissedSystemTags?: string[] }> = {}
    for (const [playerId, data] of Object.entries(userTagsMap)) {
      formattedMap[playerId] = {
        tags: data.tags,
        dismissedSystemTags: data.dismissedSystemTags,
      }
    }
    return buildIntelContextMap(formattedMap)
  }, [userTagsMap])

  // Draft state machine
  const {
    state,
    addManualPick,
    undoLastPick,
    draftedNames,
    getNeeds,
    getBudget,
    getMaxBidFor,
    lastPollAt,
    sheetError,
    saving,
  } = useDraftState({
    session,
    rosterSlots,
  })

  // Score players with active strategy and intel context (FF-247)
  const scoredPlayers: ScoredPlayer[] = useMemo(() => {
    if (!strategy || players.length === 0) {
      // No strategy — return neutral scores but still apply user tags
      return players.map(p => ({
        player: p,
        strategyScore: 50,
        intelScore: 0,
        combinedScore: 50,
        targetStatus: isTarget(p.id) ? 'target' as const : isAvoid(p.id) ? 'avoid' as const : 'neutral' as const,
        isUserTarget: isTarget(p.id),
        isUserAvoid: isAvoid(p.id),
        boosts: [],
        intelBoosts: [],
      }))
    }
    return scorePlayersWithStrategy(
      players,
      strategy,
      session?.format ?? 'auction',
      league?.budget ?? undefined,
      intelContextMap, // FF-247: Pass intel context for tag-aware recommendations
    )
  }, [players, strategy, session?.format, league?.budget, intelContextMap, isTarget, isAvoid])

  // Position scarcity
  const scarcity = useMemo(() => {
    const available = players.filter(p => !draftedNames.has(p.name.toLowerCase()))
    return calculateScarcityExtended(available, state?.manager_order.length ?? 10)
  }, [players, draftedNames, state?.manager_order.length])

  // Explanation generator
  const getExplanation = useCallback((scored: ScoredPlayer): Explanation | null => {
    if (!state) return null
    const available = players.filter(p => !draftedNames.has(p.name.toLowerCase()))
    const managerName = state.manager_order[0]
    return explainPlayer(scored, state, managerName, available)
  }, [state, players, draftedNames])

  // Draft flow monitor
  const flow = useMemo(() => {
    if (!state) return null
    return analyzeDraftFlow(state, scoredPlayers, draftedNames, players)
  }, [state, scoredPlayers, draftedNames, players])

  // Pivot detection
  const pivotSuggestion = useMemo(() => {
    if (!state || !flow || pivotDismissed) return null
    return detectPivotOpportunity(strategy, allStrategies, state, flow, scoredPlayers, draftedNames)
  }, [strategy, allStrategies, state, flow, scoredPlayers, draftedNames, pivotDismissed])

  // FF-272: Strategy drift detection
  const myPickedNames = useMemo(() => {
    if (!state) return new Set<string>()
    const myMgr = state.manager_order[0]
    return new Set(
      state.picks
        .filter(p => p.manager === myMgr)
        .map(p => p.player_name.toLowerCase())
    )
  }, [state])

  const driftAlert = useMemo((): StrategyDrift | null => {
    if (!strategy || !state || driftDismissed || state.total_picks < 3) return null
    if (!strategy.player_targets?.length) return null
    const result = detectStrategyDrift(
      strategy.player_targets,
      draftedNames,
      myPickedNames,
    )
    return result.active ? result : null
  }, [strategy, state, draftedNames, myPickedNames, driftDismissed])

  // Analyze each new pick for trash talk opportunities
  useEffect(() => {
    if (!state || players.length === 0) return

    // First load: mark existing picks as already seen, don't generate alerts for them
    if (processedPickCountRef.current === null) {
      processedPickCountRef.current = state.picks.length
      return
    }

    // Mode is off — skip all analysis
    if (trashTalkMode === 'off') return

    if (state.picks.length <= processedPickCountRef.current) return

    const newPicks = state.picks.slice(processedPickCountRef.current)
    processedPickCountRef.current = state.picks.length

    const myManagerName = state.manager_order[0]
    const newAlerts: TrashTalkAlert[] = []

    // Include keeper picks in allPicks so QB-detection triggers work for keeper leagues
    const allPicksWithKeepers = [
      ...keepersToPicks(state.keepers, state.format),
      ...state.picks,
    ]

    for (const newPick of newPicks) {
      const alert = analyzePickForTrashTalk(
        newPick,
        allPicksWithKeepers,
        players,
        state.format,
        myManagerName,
        state.manager_order.length,
      )
      if (alert) newAlerts.push(alert)
    }

    if (newAlerts.length > 0) {
      setTrashTalkAlerts(prev => [...prev, ...newAlerts])
    }
  }, [state, players, trashTalkMode])

  // One-time keeper value analysis at draft start (keeper leagues only)
  useEffect(() => {
    if (!state || players.length === 0) return
    if (trashTalkMode === 'off') return
    if (keeperAlertsProcessedRef.current) return
    if (state.keepers.length === 0) return

    keeperAlertsProcessedRef.current = true
    const keeperAlerts = analyzeKeeperPicksForTrashTalk(
      state.keepers,
      players,
      state.format,
      state.manager_order.length,
    )
    if (keeperAlerts.length > 0) {
      setTrashTalkAlerts(prev => [...prev, ...keeperAlerts])
    }
  }, [state, players, trashTalkMode])

  const handleDismissTrashTalk = useCallback((id: string) => {
    setTrashTalkAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleSaveTrashTalk = useCallback((id: string) => {
    setTrashTalkAlerts(prev => {
      const alert = prev.find(a => a.id === id)
      if (alert) {
        setSavedAlerts(s => [...s, { ...alert, savedForLater: true }])
      }
      return prev.filter(a => a.id !== id)
    })
  }, [])

  const handleRemoveSavedAlert = useCallback((id: string) => {
    setSavedAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  const handleDismissDrift = useCallback(() => {
    setDriftDismissed(true)
  }, [])

  // Strategy swap handler
  const handleStrategySwap = useCallback((newStrategy: DbStrategy, fromRecommendation = false) => {
    const prevName = strategy?.name ?? 'None'
    setStrategy(newStrategy)
    clearRecommendationCache()
    setAllStrategies(prev => prev.map(s => ({
      ...s,
      is_active: s.id === newStrategy.id,
    })))
    setPivotDismissed(false)
    setPivotHistory(prev => [...prev, {
      pickNumber: state?.total_picks ?? 0,
      fromStrategy: prevName,
      toStrategy: newStrategy.name,
      reason: fromRecommendation ? 'accepted_recommendation' : 'user_swap',
      timestamp: new Date(),
    }])
  }, [strategy?.name, state?.total_picks])

  // Stable callback for PlayerPool BID button (FF-257)
  const handleBidPlayer = useCallback((player: Player) => {
    setOnBlockPlayer(player)
  }, [])

  // Dismiss pivot
  const handleDismissPivot = useCallback(() => {
    if (pivotSuggestion && strategy) {
      setPivotHistory(prev => [...prev, {
        pickNumber: state?.total_picks ?? 0,
        fromStrategy: strategy.name,
        toStrategy: strategy.name,
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
      <div className="flex items-center justify-center gap-3 py-12">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--ffi-primary)]" />
        <span className="ffi-body-lg text-[var(--ffi-text-secondary)]">Loading draft session...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <FFISectionHeader title="Live Draft" subtitle="Real-time draft assistant" />
        <FFICard variant="elevated" className="border-l-4 border-l-[var(--ffi-danger)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[var(--ffi-danger)] shrink-0 mt-0.5" />
            <div>
              <p className="ffi-title-md text-[var(--ffi-danger)]">Error Loading Draft</p>
              <p className="ffi-body-md text-[var(--ffi-text-secondary)]">{error}</p>
            </div>
          </div>
          <FFIButton variant="secondary" onClick={() => window.history.back()} className="mt-4">
            Go Back
          </FFIButton>
        </FFICard>
      </div>
    )
  }

  if (!state || !session) return null

  const isAuction = state.format === 'auction'
  const managerNames = state.manager_order
  const myManager = managerNames[0]
  const myBudget = getBudget(myManager)
  const myMaxBid = getMaxBidFor(myManager)
  const myNeeds = getNeeds(myManager)
  const myPicks = state.picks.filter(p => p.manager === myManager)

  return (
    <div className="space-y-4 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-xl bg-[var(--ffi-danger)]/20">
            <Radio className="h-5 w-5 text-[var(--ffi-danger)]" />
          </div>
          <div>
            <h1 className="ffi-display-md text-white">Live Draft</h1>
            <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
              {league?.name} • {isAuction ? 'Auction' : 'Snake'} • {managerNames.length} Teams
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <ConnectionStatusPill
            lastPollAt={lastPollAt}
            sheetConnected={!!session.sheet_url}
            error={sheetError}
            onRetry={undefined}
          />
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[var(--ffi-primary)]" />}
          <FFIBadge status={state.status === 'completed' ? 'success' : 'info'}>
            {state.status === 'completed' ? 'COMPLETE' : `${state.total_picks} PICKS`}
          </FFIBadge>
        </div>
      </div>

      {/* Sheet sync errors now surfaced via ConnectionStatusPill (FF-259) */}

      {/* Main layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        {/* Left column */}
        <div className="space-y-4">
          {/* Strategy picker dropdown */}
          <StrategyPicker
            strategies={allStrategies}
            activeStrategy={strategy}
            onSelect={(s) => handleStrategySwap(s, false)}
          />

          {/* My Squad panel */}
          <MySquadPanel
            picks={myPicks}
            budget={myBudget}
            maxBid={myMaxBid}
            needs={myNeeds}
            format={state.format}
            rosterSlots={rosterSlots}
          />

          {/* Real-time pick feed */}
          <PickFeed picks={state.picks} format={state.format} />

          {/* Trash talk feed */}
          <TrashTalkFeed
            alerts={trashTalkAlerts}
            onDismiss={handleDismissTrashTalk}
            onSave={handleSaveTrashTalk}
          />

          {/* Saved trash talk (only when items exist) */}
          {savedAlerts.length > 0 && (
            <SavedTrashTalk
              alerts={savedAlerts}
              onRemove={handleRemoveSavedAlert}
            />
          )}

          {/* Auction/Snake advisor with inline AI recs */}
          {isAuction ? (
            <AuctionAdvisor
              state={state}
              managerName={myManager}
              scoredPlayers={scoredPlayers}
              draftedNames={draftedNames}
              strategy={strategy}
            />
          ) : (
            <SnakeAdvisor
              state={state}
              managerName={myManager}
              scoredPlayers={scoredPlayers}
              draftedNames={draftedNames}
              strategy={strategy}
            />
          )}

          {/* Desktop only panels */}
          <div className="hidden lg:block space-y-4">
            <LeagueOverview state={state} myManager={myManager} />
            <ManagerTendencies state={state} myManager={myManager} />
            {pivotHistory.length > 0 && <PivotHistory entries={pivotHistory} />}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Draft flow alerts + pivot suggestions */}
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
              driftAlert={driftAlert}
              onDismissDrift={handleDismissDrift}
            />
          )}

          {/* Position scarcity — showSpendRanges is auction-only (FF-265) */}
          <PositionScarcityTracker
            scarcity={scarcity}
            showSpendRanges={state.format === 'auction'}
          />

          {/* FF-277: Injury Watch — flagged undrafted players */}
          <InjuryWatch
            players={players}
            draftedNames={draftedNames}
          />

          {/* Available players */}
          <PlayerPool
            scoredPlayers={scoredPlayers}
            draftedNames={draftedNames}
            format={state.format}
            getExplanation={getExplanation}
            onBidPlayer={handleBidPlayer}
            maxBid={myMaxBid}
          />
        </div>
      </div>

      {/* Mobile panels */}
      <div className="lg:hidden space-y-4">
        <LeagueOverview state={state} myManager={myManager} />
        <ManagerTendencies state={state} myManager={myManager} />
        {pivotHistory.length > 0 && <PivotHistory entries={pivotHistory} />}
      </div>

      {/* FF-257: Pinned quick-entry bar — always visible at viewport bottom */}
      {state.status !== 'completed' && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 ffi-glass-heavy border-t border-[var(--ffi-border)] shadow-2xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          role="region"
          aria-label="Quick pick entry"
        >
          <div className="mx-auto max-w-7xl px-3 py-2.5">
            <ManualPickEntry
              players={players}
              draftedNames={draftedNames}
              managerNames={managerNames}
              format={state.format}
              currentManager={isAuction ? myManager : state.current_manager}
              currentRound={state.current_round}
              onSubmit={addManualPick}
              onUndo={undoLastPick}
              canUndo={state.picks.length > 0}
              variant="bar"
              onBlockPlayer={onBlockPlayer}
              onClearBlock={() => setOnBlockPlayer(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
