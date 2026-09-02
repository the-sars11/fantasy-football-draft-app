'use client'

/**
 * LiveDraftClient (FF-066 Redesign)
 *
 * Main live draft dashboard with FFI design system.
 * Features: Real-time feed, strategy picker dropdown, My Squad panel, inline AI recs
 *
 * Snake fallback removed 2026-08-09 (scope freeze: auction-only).
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Radio,
  ChevronDown,
  ChevronLeft,
  AlertTriangle,
  Clock,
  Gavel,
  Check,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FFICard,
  FFIButton,
  FFIBadge,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import { useDraftState } from '@/hooks/use-draft-state'
import { useLiveDraftData } from '@/hooks/use-live-draft-data'
import { useUserTags, useToggleTag } from '@/hooks/use-user-tags'
import { useHaptic } from '@/hooks/use-haptic'
import { useSound } from '@/lib/sound/use-sound'
import { ManualPickEntry } from '@/components/draft/manual-pick-entry'
import { PlayerPool } from '@/components/draft/player-pool'
import { PositionScarcityTracker } from '@/components/draft/position-scarcity'
import { LeagueOverview } from '@/components/draft/league-overview'
import { ManagerTendencies } from '@/components/draft/manager-tendencies'
import { DraftFlowAlerts } from '@/components/draft/draft-flow-alerts'
import { PivotHistory } from '@/components/draft/pivot-history'
import { AuctionAdvisor } from '@/components/draft/auction-advisor'
import { PositionRunTicker } from '@/components/draft/position-run-ticker'
import { LiveScoreBug } from '@/components/draft/live-scorebug'
import { AuctionDraftRoom } from '@/components/draft/live-room/auction-room'
import { ArmorLiveRoom } from '@/components/draft/live-room/armor-live-room'
import { StrategyPicker } from '@/components/draft/strategy-picker'
import { PickFeed } from '@/components/draft/pick-feed'
import { MySquadPanel } from '@/components/draft/my-squad-panel'
import type { PivotEntry } from '@/components/draft/pivot-history'
import { scorePlayersWithStrategy, buildIntelContextMap } from '@/lib/research/strategy/scoring'
import { calculateScarcityExtended, explainPlayer } from '@/lib/draft/explain'
import { computeAdaptiveGuidance } from '@/lib/draft/adaptive-guidance'
import { analyzeDraftFlow, detectStrategyDrift } from '@/lib/draft/flow-monitor'
import type { StrategyDrift } from '@/lib/draft/flow-monitor'
import { detectPivotOpportunity } from '@/lib/draft/pivot-detector'
import type { Player } from '@/lib/players/types'
import type { RosterSlots } from '@/lib/supabase/database.types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'
import type { Explanation } from '@/lib/draft/explain'
import { clearRecommendationCache } from '@/lib/draft/recommend'
import { calculateMaxBidAdvice } from '@/lib/draft/auction-advisor'
import { buildSolverInput, computeRosterMaxBidMap, type RosterMaxBidEntry } from '@/lib/draft/solver-bridge'
import { positionalInflation } from '@/lib/draft/league-calibration'
import { InjuryWatch } from '@/components/draft/injury-watch'
import { TrashTalkFeed, SavedTrashTalk } from '@/components/draft/trash-talk'
import { type AuctioneerConnectionType } from '@/hooks/use-draft-feed'
import type { PickCorrection } from '@/lib/draft/state'
import { useDraftFeeds } from '@/hooks/use-draft-feeds'
import { useTrashTalkEngine } from '@/hooks/use-trash-talk-engine'
import { useDraftSimulator } from '@/hooks/use-draft-simulator'
import type { SimSpeed } from '@/hooks/use-draft-simulator'

// Nasties locked shape: QB1/RB1/WR1/TE1/FLEX3/DEF1/K0/Bench5/IR1 (14 total,
// 13 draftable). Never the generic ESPN 2RB/2WR/1FLEX/K1/bench6 default —
// see FANTASY_FOOTBALL_MASTER.md.
const DEFAULT_ROSTER: RosterSlots = {
  qb: 1, rb: 1, wr: 1, te: 1, flex: 3, k: 0, dst: 1, bench: 5, ir: 1,
}

type TrashTalkMode = 'off' | 'family-safe' | 'adult-only'

export function LiveDraftClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const trashTalkMode = (searchParams.get('ttm') ?? 'family-safe') as TrashTalkMode
  // FF-279 / FF-314: Auctioneer connection from setup.
  //   ?aif=localstorage|file -> same-device feed (BroadcastChannel / File API).
  //   ?aif=remote           -> cross-device sync via this repo's server proxy.
  // Only the two same-device values drive useAuctioneerfeed; 'remote' (and anything
  // else) leaves it null. The remote proxy path runs automatically for every auction
  // session inside useDraftFeed, so 'remote' needs no same-device wiring here.
  const rawAif = searchParams.get('aif')
  const aifParam: AuctioneerConnectionType =
    rawAif === 'localstorage' || rawAif === 'file' ? rawAif : null
  // UX-7.1: Dev-only sim (?sim=1, NODE_ENV !== 'production' gate)
  const simEnabled = process.env.NODE_ENV !== 'production' && searchParams.get('sim') === '1'

  // On Block: player nominated via BID button in the player pool
  const [onBlockPlayer, setOnBlockPlayer] = useState<Player | null>(null)

  // Data loading (extracted: finding 9)
  const {
    session,
    league,
    players,
    strategy,
    setStrategy,
    allStrategies,
    setAllStrategies,
    loading,
    error,
    usingCachedData,
  } = useLiveDraftData({ sessionId, simEnabled })
  const [pivotDismissed, setPivotDismissed] = useState(false)
  const [pivotHistory, setPivotHistory] = useState<PivotEntry[]>([])
  const [driftDismissed, setDriftDismissed] = useState(false)
  // UXV2-6: collapsed "More tools" for the auction room (mount on open so the
  // AI advisor never fires a paid call until Joe explicitly opens the panel).
  const [showMore, setShowMore] = useState(false)

  const rosterSlots = (league?.roster_slots ?? DEFAULT_ROSTER) as RosterSlots

  // FF-247: Load user tags for intel-aware recommendations
  const playerCacheIds = useMemo(() => players.map(p => p.id), [players])
  const { userTagsMap, isTarget, isAvoid, refetch: refetchUserTags } = useUserTags({
    playerCacheIds,
    leagueId: session?.league_id,
    includeGlobal: true,
    enabled: players.length > 0,
  })

  // Star toggle from the Research view: flip the target tag, then re-read tags
  // so the list star (derived from userTagsMap) updates. Read-only PATCH, no
  // paid endpoints.
  const { toggle: toggleTag } = useToggleTag(session?.league_id)
  const onToggleTarget = useCallback(
    async (playerId: string) => {
      const res = await toggleTag(playerId, 'target')
      if (res.success) await refetchUserTags()
    },
    [toggleTag, refetchUserTags],
  )
  // R11b: avoid is settable anywhere target is, using the same generic toggle.
  const onToggleAvoid = useCallback(
    async (playerId: string) => {
      const res = await toggleTag(playerId, 'avoid')
      if (res.success) await refetchUserTags()
    },
    [toggleTag, refetchUserTags],
  )
  // DEC-1 (BIAS): severity of an avoid tag, undefined when the player isn't
  // avoided at all. A quick-tapped avoid carries no severity, so an unset value
  // defaults to 'soft' (discount, not force-PASS) to match the sim + solver.
  // (Joe ruling 2026-08-17.) Feeds computeWhatToDo's soft-vs-hard path.
  const avoidSeverity = useCallback(
    (playerId: string): 'soft' | 'hard' | undefined => {
      const entry = userTagsMap[playerId]
      if (!entry || !entry.tags.includes('avoid')) return undefined
      return entry.tagSeverity === 'hard' ? 'hard' : 'soft'
    },
    [userTagsMap],
  )

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
    editPick,
    removePick,
    reconcileWithAuctioneer,
    draftedNames,
    getNeeds,
    getBudget,
    getMaxBidFor,
    saving,
    syncStatus,
  } = useDraftState({
    session,
    rosterSlots,
    usingCachedData,
  })

  // Trash-talk engine (extracted: finding 9)
  const {
    trashTalkAlerts,
    savedAlerts,
    handleDismissTrashTalk,
    handleSaveTrashTalk,
    handleRemoveSavedAlert,
  } = useTrashTalkEngine({ state, players, trashTalkMode, simEnabled })

  // Live pick feeds (extracted: finding 9): Auctioneer only (Sleeper removed 2026-08-09)
  const {
    aifEnabled,
    aifConnected,
    remoteConnected,
    // FF-315: offline resync signals.
    isOfflineFromAuctioneer,
    reconnectNonce,
    remoteLastSnapshot,
  } = useDraftFeeds({
    // UX-7.3: the ?sim=1 demo is fully self-contained -- the sim engine drives
    // every pick. Passing format:undefined here disables BOTH the same-device
    // and the automatic remote auctioneer poll (use-draft-feed gates on
    // format === 'auction'), so real live-auctioneer picks (other Nasties
    // managers) can never reconcile into the demo and balloon it to a
    // completed draft. Without this the demo inherits the real draft.
    format: simEnabled ? undefined : session?.format,
    aifParam,
    draftedNames,
    addManualPick,
  })

  // FF-315: Offline resync — corrections banner state.
  const [corrections, setCorrections] = useState<PickCorrection[]>([])

  // FF-315: When the phone reconnects to the auctioneer after being offline,
  // reconcile any provisional picks against the auctioneer's full snapshot.
  // Auctioneer is the system of record; corrected picks populate the banner.
  //
  // BUG-R13-01: reconcile once per reconnect. reconnectNonce increments on each
  // rising edge of the remote connection; a ref records the last nonce we
  // reconciled so a routine snapshot poll (same nonce) does not re-trigger, and a
  // reconnect that arrives before its snapshot still fires once the snapshot lands.
  const lastReconciledNonceRef = useRef(0)
  useEffect(() => {
    if (reconnectNonce === 0 || reconnectNonce === lastReconciledNonceRef.current) return
    if (!remoteLastSnapshot || remoteLastSnapshot.length === 0) return
    lastReconciledNonceRef.current = reconnectNonce
    const corrected = reconcileWithAuctioneer(remoteLastSnapshot)
    // Responding to an external reconnect signal, deduped by nonce above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (corrected.length > 0) setCorrections(corrected)
  }, [reconnectNonce, remoteLastSnapshot, reconcileWithAuctioneer])

  // FF-315: Tag manual picks as provisional when the auctioneer is offline
  // (was connected, now isn't). The auctioneer reconciles them on reconnect.
  const handleRecordPick = useCallback(
    (pick: Parameters<typeof addManualPick>[0]) => {
      addManualPick({ ...pick, provisional: isOfflineFromAuctioneer || undefined })
    },
    [addManualPick, isOfflineFromAuctioneer],
  )

  // Score players with active strategy and intel context (FF-247)
  const scoredPlayers: ScoredPlayer[] = useMemo(() => {
    if (!strategy || players.length === 0) {
      // No strategy -- return neutral scores but still apply user tags
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

  // R11b: R9's adaptive pivot line, surfaced always-on in the room instead of
  // buried inside the closed-by-default More tools accordion.
  const adaptiveGuidance = useMemo(() => {
    if (!state) return null
    const myMgr = state.manager_order[0]
    return computeAdaptiveGuidance(state, myMgr, players)
  }, [state, players])

  // D6b-2: memoize the me-seat picks. auction-room's land-probability memo depends
  // on this array, and each land probability is 16 Monte-Carlo auctions on the
  // render thread. A fresh `.filter()` array every render would give a new
  // reference each time, defeating that memo and re-running the sim on every
  // render (remote-feed poll, picker open, star toggle). Keyed off `state` so it
  // is stable between picks and only changes when a pick actually lands.
  const myPicks = useMemo(
    () => (state ? state.picks.filter(p => p.manager === state.manager_order[0]) : []),
    [state],
  )

  // R5 (RV-1): the roster-completion solver input, rebuilt on every pick. Maps
  // Joe's live budget + remaining slots (FLEX contention modeled) + the undrafted
  // board into the pure R4 solver. $0 math, no network.
  const solverInput = useMemo(() => {
    if (!state || state.format !== 'auction') return null
    const myMgr = state.manager_order[0]
    const budget = getBudget(myMgr) ?? league?.budget ?? 200
    const myPicksLocal = state.picks.filter(p => p.manager === myMgr)
    return buildSolverInput({
      budgetRemaining: budget,
      rosterConfig: rosterSlots,
      myPicks: myPicksLocal,
      players,
      draftedNames,
      // DEC-1 (BIAS): the solver's own selection priority honors Joe's graded
      // targets/avoids too, not just the live max-bid advisor.
      userTagsMap,
    })
  }, [state, getBudget, league?.budget, rosterSlots, players, draftedNames, userTagsMap])

  // R5: roster-constrained max bid + plain-English constraint per undrafted player.
  const rosterAdviceMap = useMemo((): Map<string, RosterMaxBidEntry> => {
    if (!solverInput) return new Map()
    return computeRosterMaxBidMap(solverInput)
  }, [solverInput])

  // FF-283 / R5: Per-player max-bid advice -- recomputes on every pick from any
  // source. The displayed max is now min(worth ceiling, roster-completion max):
  // the silo advisor caps at genuine worth, the solver caps at what still lets Joe
  // finish his roster (RV-1). deps: state, scoredPlayers, draftedNames, strategy,
  // rosterAdviceMap. All pick paths flow through setState -> memo invalidates.
  const maxBidAdviceMap = useMemo((): Map<string, number> => {
    if (!state || state.format !== 'auction') return new Map()
    const managerName = state.manager_order[0]
    const map = new Map<string, number>()
    for (const sp of scoredPlayers) {
      if (draftedNames.has(sp.player.name.toLowerCase())) continue
      // VAL-3: re-anchor the max bid off Joe's calibrated ledger when the player
      // carries ceiling + expected-room-price. Inflation tag is a directional
      // tilt only (already baked into the room curve).
      const calibrated =
        sp.player.ceilingValue != null && sp.player.expectedRoomPrice != null
          ? {
              ceiling: sp.player.ceilingValue,
              expectedRoomPrice: sp.player.expectedRoomPrice,
              inflationTag: positionalInflation(sp.player.position)?.tag,
            }
          : undefined
      const result = calculateMaxBidAdvice(
        state,
        managerName,
        sp.player.name,
        sp.player.position,
        sp.player.consensusAuctionValue ?? 1,
        sp.strategyScore,
        scoredPlayers,
        draftedNames,
        strategy,
        calibrated,
      )
      const key = sp.player.name.toLowerCase()
      // RV-1: fold in the roster-completion cap. min() so neither overpaying past
      // worth (silo) nor breaking roster completion (solver) is ever advised.
      const roster = rosterAdviceMap.get(key)
      const finalMax = roster ? Math.min(result.maxBid, roster.maxBid) : result.maxBid
      map.set(key, finalMax)
    }
    return map
  }, [state, scoredPlayers, draftedNames, strategy, rosterAdviceMap])

  // UX-7.1: Dev-only sim engine
  const { isSimActive, isRunning: simRunning, speed: simSpeed, setSpeed: setSimSpeed, start: simStart, pause: simPause, reset: simReset } =
    useDraftSimulator({
      enabled: simEnabled,
      players,
      draftedNames,
      state,
      addManualPick,
    })

  // UX-7.2 / UX-S6: Auto-navigate to Review when any draft completes (sim or real).
  useEffect(() => {
    if (state?.status !== 'completed') return
    if (!sessionId) return
    router.push(`/draft/review?session=${sessionId}`)
  }, [state?.status, sessionId, router])

  const handleDismissDrift = useCallback(() => {
    setDriftDismissed(true)
  }, [])

  // UX-2.1: the on-the-clock spotlight -- auction only, fires when a player is on the block.
  const onTheClock = !!(
    state &&
    state.status !== 'completed' &&
    state.format === 'auction' &&
    onBlockPlayer !== null
  )
  // Sensory layer (opt-in sound + Android haptics).
  const haptic = useHaptic()
  const { play } = useSound()
  const prevOnClockRef = useRef(false)
  useEffect(() => {
    document.body.classList.toggle('ffi-on-the-clock', onTheClock)
    if (onTheClock && !prevOnClockRef.current) {
      haptic('yourTurn')
      play('yourTurn')
    }
    prevOnClockRef.current = onTheClock
    return () => document.body.classList.remove('ffi-on-the-clock')
  }, [onTheClock, haptic, play])

  const prevPicksRef = useRef<number | null>(null)
  useEffect(() => {
    const n = state?.total_picks ?? 0
    if (prevPicksRef.current !== null && n > prevPicksRef.current) {
      haptic('pick')
      play('pick')
    }
    prevPicksRef.current = n
  }, [state?.total_picks, haptic, play])

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
  }, [strategy?.name, state?.total_picks, setStrategy, setAllStrategies])

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

  // RV-16/RV-19: this screen used to silently render null (a blank page, no
  // affordance out) whenever state/session hadn't hydrated yet -- e.g. loading
  // finished but a session lookup came back empty. Give it a real fallback
  // instead, matching the loading/error patterns above.
  if (!state || !session) {
    return (
      <div className="space-y-4">
        <FFISectionHeader title="Live Draft" subtitle="Real-time draft assistant" />
        <FFICard variant="elevated" className="border-l-4 border-l-[var(--ffi-warning)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[var(--ffi-warning)] shrink-0 mt-0.5" />
            <div>
              <p className="ffi-title-md text-white">No Draft Session Yet</p>
              <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
                Set up a draft session before entering the live room.
              </p>
            </div>
          </div>
          <FFIButton variant="secondary" onClick={() => router.push('/draft/setup')} className="mt-4">
            Go to Draft Setup
          </FFIButton>
        </FFICard>
      </div>
    )
  }

  const isAuction = state.format === 'auction'
  const managerNames = state.manager_order

  // manager_order can theoretically come back empty from a malformed/partial
  // session; myManager below assumes a first entry, so guard it explicitly
  // rather than letting downstream code throw on undefined.
  if (managerNames.length === 0) {
    return (
      <div className="space-y-4">
        <FFISectionHeader title="Live Draft" subtitle="Real-time draft assistant" />
        <FFICard variant="elevated" className="border-l-4 border-l-[var(--ffi-danger)]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-[var(--ffi-danger)] shrink-0 mt-0.5" />
            <div>
              <p className="ffi-title-md text-[var(--ffi-danger)]">No Managers Configured</p>
              <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
                This draft session has no manager order. Return to Draft Setup and confirm managers before going live.
              </p>
            </div>
          </div>
          <FFIButton variant="secondary" onClick={() => router.push('/draft/setup')} className="mt-4">
            Go to Draft Setup
          </FFIButton>
        </FFICard>
      </div>
    )
  }

  const myManager = managerNames[0]
  const myBudget = getBudget(myManager)
  const myMaxBid = getMaxBidFor(myManager)
  const myNeeds = getNeeds(myManager)
  // myPicks is memoized above (D6b-2) so the land-probability sim stays stable
  // between picks; do not recompute it here with a fresh filter().

  // UXV2-6: connection health for the room status pill. Sim has no real feed.
  // DR-5.2: reflect an ACTUAL connected feed (same-device or remote), not merely
  // "no error yet" -- the prior check showed LIVE before the first poll ever
  // landed, and stayed LIVE in pure Manual mode where no feed is connected at all.
  const online = simEnabled
    ? true
    : aifEnabled
      ? aifConnected
      : remoteConnected

  // Record bar (who won, at what price).
  const recordBar =
    state.status !== 'completed' ? (
      <ManualPickEntry
        players={players}
        draftedNames={draftedNames}
        managerNames={managerNames}
        format={state.format}
        currentManager={myManager}
        currentRound={state.current_round}
        onSubmit={handleRecordPick}
        onUndo={undoLastPick}
        canUndo={state.picks.length > 0}
        variant="bar"
        onBlockPlayer={onBlockPlayer}
        onClearBlock={() => setOnBlockPlayer(null)}
      />
    ) : undefined

  // Dev-only sim HUD (?sim=1).
  const simHud = isSimActive ? (
    <div className="sticky top-0 z-20 flex items-center gap-3 px-3 py-2 rounded-xl border border-amber-400/30 bg-[#0a1b25]/90 backdrop-blur-sm text-xs font-mono">
      <span className="text-amber-400 tracking-widest font-bold uppercase">SIM</span>
      <div className="h-4 w-px bg-white/10" />
      <button
        onClick={simRunning ? simPause : simStart}
        className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 transition-colors"
        aria-label={simRunning ? 'Pause sim' : 'Start sim'}
      >
        {simRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        <span>{simRunning ? 'Pause' : 'Start'}</span>
      </button>
      <button
        onClick={simReset}
        className="flex items-center gap-1 p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
        aria-label="Reset sim"
      >
        <RotateCcw className="h-3 w-3" />
      </button>
      <div className="h-4 w-px bg-white/10" />
      {(['slow', 'medium', 'fast'] as SimSpeed[]).map(s => (
        <button
          key={s}
          onClick={() => setSimSpeed(s)}
          className={cn(
            'px-1.5 py-0.5 rounded transition-colors capitalize',
            simSpeed === s ? 'text-amber-400 bg-amber-400/10' : 'text-white/30 hover:text-white/60',
          )}
        >
          {s}
        </button>
      ))}
      <div className="ml-auto text-white/30 tabular-nums">
        {state.picks.filter(p => !p.is_keeper).length} picks
      </div>
    </div>
  ) : null

  const goBack = () =>
    router.push(
      state?.status === 'completed' && sessionId
        ? `/draft/review?session=${sessionId}`
        : '/draft',
    )

  return (
    <div className="space-y-4">
      {simHud}

      {/* R11a: offline-cache banner — shown when the room is running off a locally
          cached session (network unreachable) or a pick write hasn't confirmed on
          the server yet. Clears itself the moment usingCachedData/syncStatus recover. */}
      {!simEnabled && (usingCachedData || syncStatus !== 'synced') && (
        <div
          className="mx-auto max-w-md rounded-[14px] px-3.5 py-3"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <div className="text-[11px] font-extrabold uppercase tracking-[1px]" style={{ color: '#f59e0b' }}>
            {usingCachedData ? 'Offline - showing cached draft' : 'Syncing pick to server...'}
          </div>
          <div className="mt-1 text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {usingCachedData
              ? 'Working from your last saved draft state. Picks are being recorded locally and will resync automatically once the connection returns.'
              : syncStatus === 'offline'
                ? 'The last pick could not reach the server. It is saved on this device and will retry automatically.'
                : 'Saving your last pick…'}
          </div>
        </div>
      )}

      {/* FF-315: Auto-correction banner — shown when provisional picks were corrected on reconnect. */}
      {corrections.length > 0 && (
        <div
          className="mx-auto max-w-md rounded-[14px] px-3.5 py-3"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-extrabold uppercase tracking-[1px]" style={{ color: '#f59e0b' }}>
                Auto-corrected on reconnect
              </div>
              <div className="mt-1 space-y-0.5">
                {corrections.map((c, i) => (
                  <div key={i} className="truncate text-[11px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                    {c.playerName}
                    {c.loggedManager !== c.actualManager && (
                      <span> · team {c.loggedManager} → {c.actualManager}</span>
                    )}
                    {c.loggedPrice !== c.actualPrice && (
                      <span> · ${c.loggedPrice} → ${c.actualPrice}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setCorrections([])}
              className="shrink-0 rounded p-1 transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
              aria-label="Dismiss corrections"
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ARMOR LIVE ROOM -- sim-only swap (dev). The look-first rebuild of the
          live screen renders here so it can be proven at 375px in ?sim=1
          side-by-side with the mockup. Real (non-sim) drafts keep the shipping
          AuctionDraftRoom below, untouched, until the armor room is signed off. */}
      {simEnabled ? (
        <ArmorLiveRoom
          leagueName={league?.name ?? 'The Nasties'}
          myBudget={myBudget}
          leagueBudget={league?.budget ?? 200}
          myMaxBid={myMaxBid}
          myPicks={myPicks}
          rosterSlots={rosterSlots}
          scoredPlayers={scoredPlayers}
          draftedNames={draftedNames}
          scarcity={scarcity}
          maxBidMap={maxBidAdviceMap}
          rosterAdviceMap={rosterAdviceMap}
          onBlockPlayer={onBlockPlayer}
          isTarget={isTarget}
          isAvoid={isAvoid}
          avoidSeverity={avoidSeverity}
          onLeave={goBack}
        />
      ) : (
      <AuctionDraftRoom
        leagueName={league?.name ?? 'The Nasties'}
        online={online}
        state={state}
        scoredPlayers={scoredPlayers}
        draftedNames={draftedNames}
        scarcity={scarcity}
        maxBidMap={maxBidAdviceMap}
        rosterAdviceMap={rosterAdviceMap}
        myBudget={myBudget}
        leagueBudget={league?.budget ?? 200}
        myMaxBid={myMaxBid}
        myPicks={myPicks}
        rosterSlots={rosterSlots}
        onBlockPlayer={onBlockPlayer}
        setOnBlockPlayer={setOnBlockPlayer}
        isTarget={isTarget}
        isAvoid={isAvoid}
        avoidSeverity={avoidSeverity}
        onLeave={goBack}
        onNavigate={(href) => router.push(href)}
        recordBar={recordBar}
        managerNames={managerNames}
        myManager={myManager}
        onRecordPick={handleRecordPick}
        onToggleTarget={onToggleTarget}
        onToggleAvoid={onToggleAvoid}
        onEditPick={editPick}
        onRemovePick={removePick}
        pivot={adaptiveGuidance?.pivot ?? ''}
        activeStrategy={strategy}
        strategies={allStrategies}
        onSwitchStrategy={(s) => handleStrategySwap(s, false)}
      />
      )}

      {/* More tools -- every secondary panel preserved, mounted only when
          opened so nothing is silently dropped and no paid AI call fires
          until Joe asks for it. */}
      <div className="mx-auto max-w-md">
        <button
          onClick={() => setShowMore(v => !v)}
          className="w-full ffi-card-interactive flex items-center justify-between gap-2 px-3 py-2.5"
          aria-expanded={showMore}
        >
          <span className="ffi-label text-[var(--ffi-text-secondary)]">
            {showMore ? 'Hide tools' : 'More tools'}
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-[var(--ffi-text-muted)] transition-transform',
              showMore && 'rotate-180',
            )}
          />
        </button>
      </div>
      {showMore && (
        <div className="space-y-4">
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
          <AuctionAdvisor
            state={state}
            managerName={myManager}
            scoredPlayers={scoredPlayers}
            draftedNames={draftedNames}
            strategy={strategy}
            suppressAI={isSimActive}
          />
          <StrategyPicker
            strategies={allStrategies}
            activeStrategy={strategy}
            onSelect={(s) => handleStrategySwap(s, false)}
          />
          <PositionScarcityTracker scarcity={scarcity} showSpendRanges />
          <InjuryWatch players={players} draftedNames={draftedNames} />
          <ManagerTendencies state={state} myManager={myManager} />
          <LeagueOverview state={state} myManager={myManager} />
          {pivotHistory.length > 0 && <PivotHistory entries={pivotHistory} />}
          <TrashTalkFeed
            alerts={trashTalkAlerts}
            onDismiss={handleDismissTrashTalk}
            onSave={handleSaveTrashTalk}
          />
          {savedAlerts.length > 0 && (
            <SavedTrashTalk alerts={savedAlerts} onRemove={handleRemoveSavedAlert} />
          )}
          <PlayerPool
            scoredPlayers={scoredPlayers}
            draftedNames={draftedNames}
            format={state.format}
            getExplanation={getExplanation}
            onBidPlayer={handleBidPlayer}
            maxBid={myMaxBid}
            maxBidMap={maxBidAdviceMap}
          />
        </div>
      )}
    </div>
  )
}
