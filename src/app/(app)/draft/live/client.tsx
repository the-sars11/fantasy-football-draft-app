'use client'

/**
 * LiveDraftClient (FF-066 Redesign)
 *
 * Main live draft dashboard with FFI design system.
 * Features: Real-time feed, strategy picker dropdown, My Squad panel, inline AI recs
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  Radio,
  ChevronDown,
  ChevronLeft,
  Sparkles,
  Target,
  AlertTriangle,
  Clock,
  Gavel,
  Lock,
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
  FFIPositionBadge,
  FFIProgress,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import { useDraftState } from '@/hooks/use-draft-state'
import { useUserTags } from '@/hooks/use-user-tags'
import { useHaptic } from '@/hooks/use-haptic'
import { useSound } from '@/lib/sound/use-sound'
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
import { PickLowerThird } from '@/components/draft/pick-lower-third'
import { PositionRunTicker } from '@/components/draft/position-run-ticker'
import { LiveScoreBug } from '@/components/draft/live-scorebug'
import { AuctionDraftRoom } from '@/components/draft/live-room/auction-room'
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
import { calculateMaxBidAdvice } from '@/lib/draft/auction-advisor'
import { isKeeperPick, displayPickNum, keepersToPicks } from '@/lib/draft/keepers'
import { InjuryWatch } from '@/components/draft/injury-watch'
import { TrashTalkFeed, SavedTrashTalk } from '@/components/draft/trash-talk'
import { analyzePickForTrashTalk, analyzeKeeperPicksForTrashTalk, generateTrashTalk } from '@/lib/draft/trash-talk'
import type { TrashTalkAlert } from '@/lib/draft/trash-talk'
import { loadHistory, buildTeamOwnerMap, buildHistoryBlock } from '@/lib/draft/trash-talk-history'
import type { TeamOwnerMap } from '@/lib/draft/trash-talk-history'
import {
  useDraftFeed,
  type AuctioneerConnectionType,
  type NormalizedPickEvent,
} from '@/hooks/use-draft-feed'
import { useSleeperDraftFeed } from '@/hooks/use-sleeper-draft-feed'
import { useDraftSimulator } from '@/hooks/use-draft-simulator'
import type { SimSpeed } from '@/hooks/use-draft-simulator'

const DEFAULT_ROSTER: RosterSlots = {
  qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6, ir: 0,
}

// UX-7.3: Mock session + league for sim demo mode (?sim=1 with no ?session=)
// Persistence calls to /api/draft/sessions/demo will 404 and fail silently.
const DEMO_SESSION: DraftSession = {
  id: 'demo',
  user_id: 'demo-user',
  league_id: 'demo-league',
  sheet_url: null,
  format: 'auction',
  status: 'live',
  managers: [
    { name: 'Rasar', budget: 200 },
    { name: 'Bruce', budget: 200 },
    { name: 'Garrett', budget: 200 },
    { name: 'Kevin', budget: 200 },
    { name: 'Cross', budget: 200 },
    { name: 'Moonshine', budget: 200 },
    { name: 'Reggie', budget: 200 },
    { name: 'Moe', budget: 200 },
    { name: 'Robbie', budget: 200 },
    { name: 'Hendrickson', budget: 200 },
    { name: 'Simmons', budget: 200 },
    { name: 'Murphy', budget: 200 },
  ],
  picks: [],
  keepers: [],
  recommendations: [],
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
}

const DEMO_LEAGUE: League = {
  id: 'demo-league',
  user_id: 'demo-user',
  name: 'The Nasties (Demo)',
  platform: 'espn',
  format: 'auction',
  team_count: 12,
  budget: 200,
  scoring_format: 'ppr',
  scoring_settings: null,
  roster_slots: { qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 0, dst: 1, bench: 6, ir: 0 },
  keeper_enabled: false,
  keeper_settings: null,
  is_active: true,
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
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
            <Sparkles className="h-4 w-4 text-[var(--ffi-primary)]" />
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
                  ? 'bg-[var(--ffi-primary)]/10 text-[var(--ffi-primary)]'
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
  myManager,
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
  myManager?: string
}) {
  const isAuction = format === 'auction'
  const ordered = [...picks].reverse() // newest first
  const latestPick = ordered[0] ?? null
  const latestIsMine = !!(myManager && latestPick && latestPick.manager === myManager)
  const history = ordered.slice(1, 10) // older picks shown under the hero strip

  return (
    <FFICard className="overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[var(--value-green)] animate-pulse" />
        <span className="ffi-label text-[var(--ffi-text-secondary)]">LIVE FEED</span>
        <span className="ffi-caption text-[var(--ffi-text-muted)] ml-auto">
          {picks.length} PICKS
        </span>
      </div>

      {/* Broadcast lower-third: the most recent pick, large, wiping in */}
      <PickLowerThird pick={latestPick} format={format} isMyPick={latestIsMine} />

      {history.length > 0 && (
        <div className="space-y-1 max-h-44 overflow-auto">
          <AnimatePresence mode="popLayout">
            {history.map(pick => {
              const isMyPick = !!(myManager && pick.manager === myManager)
              const keeper = isKeeperPick(pick)
              return (
                <motion.div
                  key={`${pick.manager}-${pick.pick_number}`}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className={cn(
                    'flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors',
                    isMyPick && 'border-l-2 border-[var(--ffi-gold)] bg-[var(--ffi-gold)]/5',
                  )}
                >
                  <span className="ffi-caption text-[var(--ffi-text-muted)] w-6 text-right tabular-nums">
                    {displayPickNum(pick.pick_number)}
                  </span>
                  {pick.position && (
                    <FFIPositionBadge position={pick.position.toUpperCase() as Position} />
                  )}
                  {keeper && <Lock className="h-2.5 w-2.5 shrink-0 text-[#94a3b8]" aria-label="Keeper" />}
                  <span className={cn(
                    'ffi-body-md font-medium flex-1 truncate',
                    keeper ? 'text-[#94a3b8]' :
                    isMyPick ? 'text-[var(--ffi-gold-bright)]' : 'text-white',
                  )}>
                    {pick.player_name}
                  </span>
                  <span className="ffi-body-md text-[var(--ffi-text-secondary)] truncate max-w-20">
                    {pick.manager}
                  </span>
                  {!keeper && isAuction && pick.price != null && (
                    <span className={cn(
                      'ffi-label font-mono tabular-nums',
                      isMyPick ? 'text-[var(--ffi-gold)]' : 'text-[var(--ffi-text-secondary)]',
                    )}>
                      ${pick.price}
                    </span>
                  )}
                </motion.div>
              )
            })}
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
          <Target className="h-4 w-4 text-[var(--ffi-primary)]" />
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
            <span className="ffi-title-md text-[var(--ffi-primary)] font-mono">${budget}</span>
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
            <span className="ffi-body-md text-[var(--value-green)]">Roster complete!</span>
          )}
        </div>
      </div>

      {/* Recent squad picks */}
      {picks.length > 0 && (
        <div className="space-y-1 border-t border-white/[0.06] pt-3">
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
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const trashTalkMode = (searchParams.get('ttm') ?? 'family-safe') as TrashTalkMode
  // FF-279 / FF-314: Auctioneer connection from setup.
  //   ?aif=localstorage|file → same-device feed (BroadcastChannel / File API).
  //   ?aif=remote           → cross-device sync via this repo's server proxy.
  // Only the two same-device values drive useAuctioneerfeed; 'remote' (and anything
  // else) leaves it null. The remote proxy path runs automatically for every auction
  // session inside useDraftFeed, so 'remote' needs no same-device wiring here.
  const rawAif = searchParams.get('aif')
  const aifParam: AuctioneerConnectionType =
    rawAif === 'localstorage' || rawAif === 'file' ? rawAif : null
  // FF-312: Sleeper draft ID from setup (?sdi=...)
  const sdiParam = searchParams.get('sdi')
  // UX-7.1: Dev-only sim (?sim=1, NODE_ENV !== 'production' gate)
  const simEnabled = process.env.NODE_ENV !== 'production' && searchParams.get('sim') === '1'

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
  // UXV2-6: collapsed "More tools" for the auction room (mount on open so the
  // AI advisor never fires a paid call until Joe explicitly opens the panel).
  const [showMore, setShowMore] = useState(false)

  // Trash talk alerts
  const [trashTalkAlerts, setTrashTalkAlerts] = useState<TrashTalkAlert[]>([])
  const [savedAlerts, setSavedAlerts] = useState<TrashTalkAlert[]>([])
  // null = not yet initialized (skip existing picks on load); number = picks processed so far
  const processedPickCountRef = useRef<number | null>(null)
  // false = keeper alerts not yet fired; true = already fired once
  const keeperAlertsProcessedRef = useRef(false)
  // Built once at draft start; maps manager name → OwnerHistory for history injection
  const teamOwnerMapRef = useRef<TeamOwnerMap | null>(null)

  // FF-279/FF-282: ref declared early; assigned after useDraftState gives us draftedNames + addManualPick
  const handleAuctioneerPicksRef = useRef<((picks: NormalizedPickEvent[]) => void) | null>(null)

  // Load session + league + players + active strategy
  useEffect(() => {
    if (!sessionId) {
      if (simEnabled) {
        // UX-7.3: Demo mode — inject mock session + league, still fetch real players
        setSession(DEMO_SESSION)
        setLeague(DEMO_LEAGUE)
        fetch('/api/players')
          .then(r => r.json())
          .then(data => { if (data.players) setPlayers(data.players) })
          .catch(() => {})
          .finally(() => setLoading(false))
      } else {
        setError('No session ID in URL. Go back to Draft Setup.')
        setLoading(false)
      }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // FF-279: Update Auctioneer handler ref every render so it always sees the
  // latest draftedNames + addManualPick without rethrashing hook deps.
  handleAuctioneerPicksRef.current = (picks: NormalizedPickEvent[]) => {
    for (const pick of picks) {
      // draftedNames keys are lowercase player names (see getDraftedPlayerNames)
      if (!draftedNames.has(pick.playerName.toLowerCase())) {
        addManualPick({
          player_name: pick.playerName,
          manager: pick.manager,
          price: pick.price,
          position: pick.position,
        })
      }
    }
  }

  // FF-282: Unified draft feed — gating is internal (format + connectionType).
  // onAuctioneerpicks is stable (empty deps) — routes through ref so it always
  // sees latest draftedNames+addManualPick without restarting the feed interval.
  const aifEnabled = !!aifParam && session?.format === 'auction'
  const onAuctioneerpicks = useCallback(
    (picks: NormalizedPickEvent[]) => handleAuctioneerPicksRef.current?.(picks),
    [], // stable — routes through ref
  )
  const {
    connected: aifConnected,
    importedCount: aifImportedCount,
    error: aifError,
    // FF-314: cross-device remote source — surfaced for the connection chip.
    remoteLastSyncAt,
    remoteError,
    remoteRetry,
  } = useDraftFeed({
    format: session?.format ?? null,
    connectionType: aifParam,
    onNewPicks: onAuctioneerpicks,
  })

  // FF-312: Sleeper live draft feed (snake mode only)
  const handleSleeperPicksRef = useRef<((picks: NormalizedPickEvent[]) => void) | null>(null)
  handleSleeperPicksRef.current = (picks: NormalizedPickEvent[]) => {
    for (const pick of picks) {
      if (!draftedNames.has(pick.playerName.toLowerCase())) {
        addManualPick({
          player_name: pick.playerName,
          manager: pick.manager,
          price: pick.price,
          position: pick.position,
        })
      }
    }
  }
  const sleeperEnabled = !!sdiParam && session?.format === 'snake'
  const onSleeperPicks = useCallback(
    (picks: NormalizedPickEvent[]) => handleSleeperPicksRef.current?.(picks),
    [], // stable — routes through ref
  )
  const {
    connected: sleeperConnected,
    importedCount: sleeperImportedCount,
    error: sleeperError,
  } = useSleeperDraftFeed({
    draftId: sdiParam,
    enabled: sleeperEnabled,
    managerOrder: state?.manager_order ?? [],
    onNewPicks: onSleeperPicks,
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

  // FF-283: Per-player max-bid advice — recomputes on every pick from any source.
  // deps: state (changes on every pick), scoredPlayers, draftedNames, strategy.
  // All three pick paths (Auctioneer BroadcastChannel/localStorage, Sheets, manual)
  // flow through setState → invalidates this memo → recomputes for remaining players.
  const maxBidAdviceMap = useMemo((): Map<string, number> => {
    if (!state || state.format !== 'auction') return new Map()
    const managerName = state.manager_order[0]
    const map = new Map<string, number>()
    for (const sp of scoredPlayers) {
      if (draftedNames.has(sp.player.name.toLowerCase())) continue
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
      )
      map.set(sp.player.name.toLowerCase(), result.maxBid)
    }
    return map
  }, [state, scoredPlayers, draftedNames, strategy])

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
  // Sim guard removed — real drafts with a sessionId now also route to Review on completion.
  // Sim mode has no ?session= param, so sessionId is null there → the !sessionId guard still blocks.
  useEffect(() => {
    if (state?.status !== 'completed') return
    if (!sessionId) return
    router.push(`/draft/review?session=${sessionId}`)
  }, [state?.status, sessionId, router])

  // Build owner map once when manager_order is first populated
  useEffect(() => {
    if (teamOwnerMapRef.current !== null) return
    if (!state?.manager_order.length) return
    teamOwnerMapRef.current = buildTeamOwnerMap(state.manager_order, loadHistory())
  }, [state])

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
      // Fire-and-forget: enrich each alert's message with AI-generated line.
      // Suppressed in sim mode — use hardcoded fallback strings only (zero paid calls).
      if (!simEnabled) {
        for (const alert of newAlerts) {
          const owner = teamOwnerMapRef.current?.[alert.managerName] ?? null
          const historyBlock = buildHistoryBlock(alert.type, owner) || undefined
          void generateTrashTalk(alert, trashTalkMode as 'family-safe' | 'adult-only', historyBlock).then(line => {
            if (line) {
              setTrashTalkAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, message: line } : a))
            }
          })
        }
      }
    }
  }, [state, players, trashTalkMode, simEnabled])

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
      // Suppressed in sim mode — use hardcoded fallback strings only (zero paid calls).
      if (!simEnabled) {
        for (const alert of keeperAlerts) {
          const owner = teamOwnerMapRef.current?.[alert.managerName] ?? null
          const historyBlock = buildHistoryBlock(alert.type, owner) || undefined
          void generateTrashTalk(alert, trashTalkMode as 'family-safe' | 'adult-only', historyBlock).then(line => {
            if (line) {
              setTrashTalkAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, message: line } : a))
            }
          })
        }
      }
    }
  }, [state, players, trashTalkMode, simEnabled])

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

  // UX-2.1 (Opus elevation): the on-the-clock spotlight follows the MOMENT, not the whole
  // session. Snake → it's your turn; Auction → a player is on the block. Reads existing
  // draft state only — visual-only, no engine change.
  const myManagerForClock = state?.manager_order[0]
  const onTheClock = !!(
    state &&
    state.status !== 'completed' &&
    (state.format === 'auction'
      ? onBlockPlayer !== null
      : state.current_manager === myManagerForClock)
  )
  // Sensory layer (opt-in sound + Android haptics). Fires the moment it becomes your turn
  // and on each new pick. The visuals always stand alone; these are bonuses.
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

  // UXV2-6: connection health for the room status pill. Sim has no real feed.
  const online = simEnabled
    ? true
    : !(sheetError || remoteError || aifError || sleeperError)

  // Record bar (who won, at what price). Shared by both layouts.
  const recordBar =
    state.status !== 'completed' ? (
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
    ) : undefined

  // Dev-only sim HUD (?sim=1). Hoisted so both the auction room and the snake
  // layout render the identical controls without duplicating the markup.
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

  // UXV2-6: Joe's auction path — the approved v4 decision-first room. Tyler's
  // snake path falls through to the existing full dashboard below, unchanged.
  if (isAuction) {
    return (
      <div className="space-y-4">
        {simHud}
        <AuctionDraftRoom
          leagueName={league?.name ?? 'The Nasties'}
          online={online}
          state={state}
          scoredPlayers={scoredPlayers}
          draftedNames={draftedNames}
          scarcity={scarcity}
          maxBidMap={maxBidAdviceMap}
          myBudget={myBudget}
          myMaxBid={myMaxBid}
          myPicks={myPicks}
          rosterSlots={rosterSlots}
          onBlockPlayer={onBlockPlayer}
          setOnBlockPlayer={setOnBlockPlayer}
          isTarget={isTarget}
          isAvoid={isAvoid}
          onLeave={goBack}
          onNavigate={(href) => router.push(href)}
          recordBar={recordBar}
        />

        {/* More tools — every secondary panel preserved, mounted only when
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

  return (
    <div className="space-y-4 pb-32">
      {/* UX-7.1: Dev-only sim HUD (NODE_ENV !== 'production' + ?sim=1) */}
      {simHud}
      {/* Header — UX-2.1 gold spotlight + mode badge. Leave draft top-left (blueprint 9.6). */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() =>
              router.push(
                state?.status === 'completed' && sessionId
                  ? `/draft/review?session=${sessionId}`
                  : '/draft',
              )
            }
            className="shrink-0 inline-flex items-center gap-1 pl-1.5 pr-2.5 py-1.5 rounded-lg text-[12px] font-semibold text-[var(--ffi-text-secondary)] hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Leave draft"
          >
            <ChevronLeft className="h-4 w-4" />
            Leave
          </button>
          <div className="p-2 rounded-xl bg-[var(--ffi-gold)]/15">
            <Radio className="h-5 w-5 text-[var(--ffi-gold)]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="ffi-display-md text-white">Live Draft</h1>
              <span
                className="text-[10px] font-bold px-2.5 py-0.5 rounded-full font-headline tracking-widest"
                style={{
                  background: 'rgba(224,194,122,0.12)',
                  color: 'var(--ffi-gold-bright)',
                  border: '1px solid rgba(224,194,122,0.22)',
                }}
              >
                {isAuction ? 'AUCTION' : 'SNAKE'}
              </span>
            </div>
            <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
              {league?.name} • {managerNames.length} Teams
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* FF-314: for an auction with no Google sheet, the chip reflects the
              cross-device remote proxy; otherwise it stays on the sheet poll. */}
          <ConnectionStatusPill
            lastPollAt={isAuction && !session.sheet_url ? remoteLastSyncAt : lastPollAt}
            sheetConnected={isAuction && !session.sheet_url ? true : !!session.sheet_url}
            error={isAuction && !session.sheet_url ? remoteError : sheetError}
            onRetry={isAuction && !session.sheet_url ? remoteRetry : undefined}
          />
          {/* FF-279: Auctioneer sync indicator — auction-only */}
          {aifEnabled && (
            <FFIBadge
              status={aifError ? 'danger' : aifConnected ? 'success' : 'info'}
              title={aifError ?? (aifConnected ? `${aifImportedCount} picks imported from Auctioneer` : 'Waiting for Auctioneer data...')}
            >
              AA{' '}
              {aifConnected ? (
                <>
                  <Check className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
                  {aifImportedCount > 0 ? ` ${aifImportedCount}` : ''}
                </>
              ) : (
                '...'
              )}
            </FFIBadge>
          )}
          {/* FF-312: Sleeper sync indicator — snake-only */}
          {sleeperEnabled && (
            <FFIBadge
              status={sleeperError ? 'danger' : sleeperConnected ? 'success' : 'info'}
              title={sleeperError ?? (sleeperConnected ? `${sleeperImportedCount} picks from Sleeper` : 'Connecting to Sleeper...')}
            >
              SL{' '}
              {sleeperConnected ? (
                <>
                  <Check className="inline h-3 w-3 align-[-2px]" aria-hidden="true" />
                  {sleeperImportedCount > 0 ? ` ${sleeperImportedCount}` : ''}
                </>
              ) : (
                '...'
              )}
            </FFIBadge>
          )}
          {saving && <Loader2 className="h-4 w-4 animate-spin text-[var(--ffi-primary)]" />}
          <FFIBadge status={state.status === 'completed' ? 'success' : 'info'}>
            {state.status === 'completed' ? 'COMPLETE' : `${state.total_picks} PICKS`}
          </FFIBadge>
        </div>
      </div>

      {/* Sheet sync errors now surfaced via ConnectionStatusPill (FF-259) */}

      {/* UX-2.1 (Opus elevation): On-the-clock HERO — the primetime spotlight moment.
          Snake: it's your pick. Auction: a player is on the block. Gold = the moment. */}
      <AnimatePresence>
        {onTheClock && (
          <motion.div
            key="on-the-clock"
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="ffi-glass-heavy ffi-onclock-banner rounded-2xl px-4 py-3 flex items-center gap-3"
            role="status"
            aria-live="polite"
          >
            <div
              className="shrink-0 grid place-items-center h-11 w-11 rounded-xl"
              style={{ background: 'rgba(253,239,182,0.14)' }}
            >
              {isAuction
                ? <Gavel className="h-5 w-5 text-[var(--ffi-gold-bright)]" />
                : <Clock className="h-5 w-5 text-[var(--ffi-gold-bright)]" />}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="font-headline font-bold tracking-widest text-[13px] leading-none"
                style={{ color: 'var(--ffi-gold-bright)' }}
              >
                {isAuction ? 'ON THE BLOCK' : "YOU'RE ON THE CLOCK"}
              </div>
              <div className="mt-1 truncate ffi-body-md text-white">
                {isAuction ? (
                  <>
                    <span className="font-semibold text-[var(--ffi-gold)]">
                      {onBlockPlayer?.name}
                    </span>
                    {onBlockPlayer?.position && (
                      <span className="text-[var(--ffi-text-secondary)]"> · {onBlockPlayer.position}</span>
                    )}
                  </>
                ) : (
                  <span className="font-mono text-[var(--ffi-text-secondary)]">
                    Round {state.current_round ?? '-'} · Pick {state.current_pick_in_round ?? '-'}
                  </span>
                )}
              </div>
            </div>
            <span
              className="shrink-0 h-2.5 w-2.5 rounded-full animate-pulse"
              style={{ background: 'var(--ffi-gold-bright)', boxShadow: '0 0 10px rgba(253,239,182,0.8)' }}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live score-bug + position-run ticker - broadcast glance layer */}
      <LiveScoreBug state={state} myManager={myManager} />
      {flow && <PositionRunTicker runs={flow.currentRuns} />}

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
          <PickFeed picks={state.picks} format={state.format} myManager={myManager} />

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
              suppressAI={isSimActive}
            />
          ) : (
            <SnakeAdvisor
              state={state}
              managerName={myManager}
              scoredPlayers={scoredPlayers}
              draftedNames={draftedNames}
              strategy={strategy}
              suppressAI={isSimActive}
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
            maxBidMap={isAuction ? maxBidAdviceMap : undefined}
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
