'use client'

/**
 * AuctionDraftRoom (UXV2-6) -- the approved v4 decision-first live room.
 *
 * Layout, top to bottom: status bar -> on-the-block hero with What To Do ->
 * awareness strip -> budget strip -> tier context (tappable) -> My Team roster
 * (compact, bottom) -> record bar -> tap-only 4-tab nav. A fast block picker
 * sheet handles finding / setting who is on the block.
 *
 * Pure composition over the existing draft engine. No new data fetching.
 */

import { useMemo, useState, type ReactNode } from 'react'
import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { PositionScarcityExtended } from '@/lib/draft/explain'
import { explainPlayer } from '@/lib/draft/explain'
import type { DraftState, DraftPick } from '@/lib/draft/state'
import type { RosterSlots, Strategy as DbStrategy } from '@/lib/supabase/database.types'
import { computeWhatToDo } from '@/lib/draft/what-to-do'
import type { RosterMaxBidEntry } from '@/lib/draft/solver-bridge'
import { computeLandProbability } from '@/lib/draft/room-sim-probability'
import { computeMarketInflation, type SoldPlayer } from '@/lib/draft/market-inflation'
import {
  repriceBoard,
  openSlotsFromRoster,
  type RepricedPlayer,
  type PlayerRepriceInput,
} from '@/lib/draft/live-reprice'
import { computeValueRange } from '@/lib/players/value-range'
import { ROOM } from './theme'
import { StatusBar } from './status-bar'
import { OnTheBlockCard } from './on-the-block-card'
import { AwarenessStrip, type AwarenessItem } from './awareness-strip'
import { BudgetStrip } from './budget-strip'
import { MarketPulseStrip } from './market-pulse-strip'
import { TierContext, type TierRow } from './tier-context'
import { MyTeamRoster } from './my-team-roster'
import { BottomNav } from './bottom-nav'
import { BlockPickerSheet, type BlockPickerFilter } from './block-picker-sheet'
import { FixPickSheet } from './fix-pick-sheet'
import { ResearchView } from './research-view'
import { InlinePlayersPanel, type DraftedRow } from './inline-players-panel'
import { DollarBinPanel } from './dollar-bin'
import { selectDollarBin } from '@/lib/draft/dollar-bin'

const TIER_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE']
const FLEX_ELIGIBLE = new Set<Position>(['RB', 'WR', 'TE'])

/** T4/T5 aren't in the shared scarcity type (explain.ts caps at "T3 = 25+"),
 * so the room computes them locally from the raw available pool. T5 is a
 * catch-all for tier 5 and deeper, matching how T3 used to catch everything
 * >= 3 before this room split it further. */
function countTier(pool: ScoredPlayer[], tier: 4 | 5): number {
  return pool.filter(sp => {
    const raw = sp.player.consensusTier
    if (!Number.isFinite(raw)) return false
    const rounded = Math.max(1, Math.round(raw))
    return tier === 4 ? rounded === 4 : rounded >= 5
  }).length
}

function SectionHeader({ label, action }: { label: string; action?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-0.5 pb-1.5 pt-3">
      <span
        className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[2.5px]"
        style={{ color: ROOM.t3 }}
      >
        {label}
      </span>
      <span className="h-px flex-1" style={{ background: ROOM.border2 }} />
      {action}
    </div>
  )
}

export interface AuctionRoomProps {
  leagueName: string
  online: boolean
  state: DraftState
  scoredPlayers: ScoredPlayer[]
  draftedNames: Set<string>
  scarcity: PositionScarcityExtended[]
  maxBidMap: Map<string, number>
  /** R5 (RV-1): roster-completion max bid + plain-English note, keyed by lower name. */
  rosterAdviceMap: Map<string, RosterMaxBidEntry>
  myBudget: number | null
  /** D6: league starting budget (default 200) so BudgetStrip can render spent-vs-remaining. */
  leagueBudget?: number
  myMaxBid: number | null
  myPicks: Array<{ player_name: string; position?: string; price?: number }>
  rosterSlots: RosterSlots
  onBlockPlayer: Player | null
  setOnBlockPlayer: (p: Player | null) => void
  isTarget: (id: string) => boolean
  isAvoid: (id: string) => boolean
  /** DEC-1 (BIAS): severity of an avoid tag, undefined when the player has none. */
  avoidSeverity: (id: string) => 'soft' | 'hard' | undefined
  onLeave: () => void
  onNavigate: (href: string) => void
  /** Rendered just above the bottom nav (the pick/record bar). Draft view only. */
  recordBar?: ReactNode
  /** Draft-order manager names for the Research view's inline record dropdown. */
  managerNames: string[]
  /** The user's own manager, pre-selected as the default winning team. */
  myManager: string
  /** Record a sale from the Research view (reuses the shared addManualPick). */
  onRecordPick: (pick: Omit<DraftPick, 'pick_number'>) => void
  /** Toggle a player's target star from the Research list. */
  onToggleTarget: (playerId: string) => void
  /** R11b: toggle a player's avoid flag, settable anywhere target is settable. */
  onToggleAvoid: (playerId: string) => void
  /** Edit any recorded pick (finding 12). Rebuilds budgets/roster from scratch. */
  onEditPick: (pickNumber: number, changes: Partial<Omit<DraftPick, 'pick_number'>>) => void
  /** Remove any recorded pick (finding 12). Renumbers the remainder. */
  onRemovePick: (pickNumber: number) => void
  /** R11b: R9's adaptive pivot line, always reachable instead of buried in More tools. */
  pivot: string
  /** R11b: the currently active strategy plus the full switchable list. */
  activeStrategy: DbStrategy | null
  strategies: DbStrategy[]
  onSwitchStrategy: (strategy: DbStrategy) => void
}

export function AuctionDraftRoom({
  leagueName,
  online,
  state,
  scoredPlayers,
  draftedNames,
  scarcity,
  maxBidMap,
  rosterAdviceMap,
  myBudget,
  leagueBudget = 200,
  myMaxBid,
  myPicks,
  rosterSlots,
  onBlockPlayer,
  setOnBlockPlayer,
  isTarget,
  isAvoid,
  avoidSeverity,
  onLeave,
  onNavigate,
  recordBar,
  managerNames,
  myManager,
  onRecordPick,
  onToggleTarget,
  onToggleAvoid,
  onEditPick,
  onRemovePick,
  activeStrategy,
}: AuctionRoomProps) {
  const [view, setView] = useState<'draft' | 'research'>('draft')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerFilter, setPickerFilter] = useState<BlockPickerFilter | undefined>(undefined)
  const [fixOpen, setFixOpen] = useState(false)
  const [myTeamCollapsed, setMyTeamCollapsed] = useState(false)

  const teamCount = state.manager_order.length || 12

  // Undrafted, scored -- the pool for alternatives, tiers, and the picker.
  const available = useMemo(
    () => scoredPlayers.filter(sp => !draftedNames.has(sp.player.name.toLowerCase())),
    [scoredPlayers, draftedNames],
  )

  // Drafted players, ranked-in-place context for the Value Board: mine (Joe won)
  // vs gone (another owner), each with its sale price. Off the same scored pool
  // so board rank matches the live rows; classified by the winning manager.
  const draftedRows = useMemo<DraftedRow[]>(() => {
    if (state.picks.length === 0) return []
    const me = myManager.trim().toLowerCase()
    const info = new Map<string, { price: number | null; mine: boolean }>()
    for (const pk of state.picks) {
      info.set(pk.player_name.toLowerCase(), {
        price: pk.price ?? null,
        mine: pk.manager.trim().toLowerCase() === me,
      })
    }
    const rows: DraftedRow[] = []
    for (const sp of scoredPlayers) {
      const d = info.get(sp.player.name.toLowerCase())
      if (!d) continue
      rows.push({
        id: sp.player.id,
        name: sp.player.name,
        position: sp.player.position,
        team: sp.player.team,
        combinedScore: sp.combinedScore,
        price: d.price,
        mine: d.mine,
      })
    }
    return rows
  }, [state.picks, scoredPlayers, myManager])

  const scarcityByPos = useMemo(() => {
    const m = new Map<string, PositionScarcityExtended>()
    for (const s of scarcity) m.set(s.position, s)
    return m
  }, [scarcity])

  // --- LB-2: live repricing engine (market inflation + roster need) ----------
  // Driver 1: what the room has actually paid moves the ROOM price per position.
  const inflation = useMemo(() => {
    const byName = new Map<string, Player>()
    for (const sp of scoredPlayers) byName.set(sp.player.name.toLowerCase(), sp.player)
    const sold: SoldPlayer[] = []
    for (const pk of state.picks) {
      if (pk.price == null) continue
      const src = byName.get(pk.player_name.toLowerCase())
      const baselineRoom = src?.expectedRoomPrice
      const pos = (pk.position ?? src?.position)?.toUpperCase() as Position | undefined
      if (!pos || baselineRoom == null || baselineRoom <= 0) continue
      sold.push({ position: pos, actualPrice: pk.price, baselineRoom })
    }
    return computeMarketInflation(sold)
  }, [state.picks, scoredPlayers])

  // Driver 2: Joe's still-open slots (FLEX folded into RB/WR/TE) move HIS target.
  const openSlotsByPosition = useMemo(() => {
    const filled: Record<Position, number> = { QB: 0, RB: 0, WR: 0, TE: 0, K: 0, DEF: 0 }
    for (const pk of myPicks) {
      const pos = pk.position?.toUpperCase() as Position | undefined
      if (pos && pos in filled) filled[pos] += 1
    }
    return openSlotsFromRoster({
      required: {
        QB: rosterSlots.qb ?? 0,
        RB: rosterSlots.rb ?? 0,
        WR: rosterSlots.wr ?? 0,
        TE: rosterSlots.te ?? 0,
        K: rosterSlots.k ?? 0,
        DEF: rosterSlots.def ?? 0,
      },
      flex: (rosterSlots.flex ?? 0) + (rosterSlots.superflex ?? 0),
      filled,
    })
  }, [myPicks, rosterSlots])

  // Reprice every available, league-priced player -> Map by id for O(1) lookup.
  const repriced = useMemo(() => {
    const cap = myMaxBid ?? myBudget ?? leagueBudget
    const inputs: PlayerRepriceInput[] = []
    for (const sp of available) {
      const room = sp.player.expectedRoomPrice
      if (room == null || room <= 0) continue // DEF / unpriced rows keep their bare value
      const target = computeValueRange(sp.player).base
      inputs.push({ id: sp.player.id, position: sp.player.position, baselineRoom: room, baselineTarget: target })
    }
    const out = new Map<string, RepricedPlayer>()
    for (const r of repriceBoard(inputs, { inflation, openSlotsByPosition, maxBid: cap })) {
      out.set(r.id, r)
    }
    return out
  }, [available, inflation, openSlotsByPosition, myMaxBid, myBudget, leagueBudget])

  // LB-3: the Dollar Bin - Joe's starred watchlist (pinned) + the model's $1-$3
  // darts (unstarred, priced in the $1 bin, with a real reason to beat the tag).
  const dollarBin = useMemo(
    () => selectDollarBin(available, repriced, isTarget),
    [available, repriced, isTarget],
  )

  // --- What To Do + rule-based confidence for the player on the block -------
  const { advice, confidence } = useMemo(() => {
    if (!onBlockPlayer) return { advice: null, confidence: undefined }
    const scored =
      available.find(sp => sp.player.id === onBlockPlayer.id) ??
      scoredPlayers.find(sp => sp.player.id === onBlockPlayer.id) ??
      null
    const alternatives = available
      .filter(sp => sp.player.position === onBlockPlayer.position && sp.player.id !== onBlockPlayer.id)
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 12)
    const computedAdvice = computeWhatToDo({
      player: onBlockPlayer,
      scored,
      myMaxBid: maxBidMap.get(onBlockPlayer.name.toLowerCase()) ?? null,
      budgetMaxBid: myMaxBid,
      scarcity: scarcityByPos.get(onBlockPlayer.position) ?? null,
      alternatives,
      isTarget: isTarget(onBlockPlayer.id),
      isAvoid: isAvoid(onBlockPlayer.id),
      // DEC-1 (BIAS): soft avoid flows through at a discount instead of forcing PASS.
      avoidSeverity: avoidSeverity(onBlockPlayer.id),
      // RV-1: the roster-completion constraint line for the on-block card.
      rosterNote: rosterAdviceMap.get(onBlockPlayer.name.toLowerCase())?.note ?? null,
    })
    // D6b-1: plumb explain.ts HIGH/MED/LOW confidence onto the on-block card.
    const computedConf = scored
      ? explainPlayer(
          scored,
          state,
          myManager,
          available.map(sp => sp.player),
        ).confidence
      : undefined
    return { advice: computedAdvice, confidence: computedConf }
  }, [
    onBlockPlayer,
    available,
    scoredPlayers,
    maxBidMap,
    rosterAdviceMap,
    myMaxBid,
    scarcityByPos,
    isTarget,
    isAvoid,
    avoidSeverity,
    state,
    myManager,
  ])

  // --- D6b-2: real Monte-Carlo land probability for the on-block player ------
  // Runs once per nomination (memoized), not per render. The % it produces is a
  // real runMonteCarlo fraction (DEC-2b), never fabricated. Null => chip hidden.
  const landProbability = useMemo<number | null>(() => {
    if (!onBlockPlayer) return null
    const res = computeLandProbability({
      onBlockPlayer,
      availablePlayers: available.map(sp => sp.player),
      draftedNames,
      rosterSlots,
      myPicks,
      numManagers: teamCount,
      budget: myBudget ?? leagueBudget,
    })
    return res ? res.probability : null
  }, [
    onBlockPlayer,
    available,
    draftedNames,
    rosterSlots,
    myPicks,
    teamCount,
    myBudget,
    leagueBudget,
  ])

  // --- Awareness ("what's next") --------------------------------------------
  const awarenessItems = useMemo<AwarenessItem[]>(() => {
    const items: AwarenessItem[] = []
    // Scarcest tier-1 skill positions with a starred target, up to two.
    const ranked = [...scarcity]
      .filter(s => TIER_POSITIONS.includes(s.position) && s.tier1Remaining > 0)
      .sort((a, b) => a.tier1Remaining - b.tier1Remaining)
      .slice(0, 2)
    for (const s of ranked) {
      if (s.tier1Remaining > 3) continue
      const starred = available.find(sp => sp.player.position === s.position && sp.isUserTarget)
      const dim = starred
        ? `${starred.player.name.split(' ').slice(-1)[0]} starred, up to $${maxBidMap.get(starred.player.name.toLowerCase()) ?? Math.round(starred.player.consensusAuctionValue ?? 0)}`
        : undefined
      items.push({
        strong: `${s.tier1Remaining} T1 ${s.position}${s.tier1Remaining === 1 ? '' : 's'} left`,
        dim,
        testId: `urgency-${s.position}`,
      })
    }
    // Budget pace.
    const filled = myPicks.length
    const total = Object.values(rosterSlots).reduce((a, b) => a + (b ?? 0), 0)
    const openSlots = Math.max(0, total - filled)
    if (myBudget != null && openSlots > 0) {
      const avg = (myBudget / openSlots).toFixed(2)
      items.push({ strong: `$${myBudget} left · ${openSlots} slots`, dim: `avg $${avg} needed`, testId: 'budget-pace' })
    }
    return items
  }, [scarcity, available, maxBidMap, myPicks.length, rosterSlots, myBudget])

  // --- Tier context rows (D6: extended to T1-T5 + a FLEX row) ---------------
  const tierRows = useMemo<TierRow[]>(() => {
    const posRows = TIER_POSITIONS.map(pos => {
      const s = scarcityByPos.get(pos)
      const posPool = available.filter(sp => sp.player.position === pos)
      const targets = posPool.filter(sp => sp.isUserTarget).length
      const startable = s?.startableRemaining ?? 0
      const fillPct = Math.min(100, (startable / (teamCount * 1.5)) * 100)
      return {
        position: pos,
        fillPct,
        t1: s?.tier1Remaining ?? 0,
        t2: s?.tier2Remaining ?? 0,
        t3: s?.tier3Remaining ?? 0,
        t4: countTier(posPool, 4),
        t5: countTier(posPool, 5),
        targets,
      }
    })

    // FLEX (R11 gap): RB/WR/TE pooled together, since that's the actual
    // competing pool for the league's 3 FLEX slots.
    const flexPool = available.filter(sp => FLEX_ELIGIBLE.has(sp.player.position))
    const flexScarcity = scarcity.filter(s => FLEX_ELIGIBLE.has(s.position))
    const flexStartable = flexScarcity.reduce((a, s) => a + s.startableRemaining, 0)
    const flexRow: TierRow = {
      position: 'FLEX',
      fillPct: Math.min(100, (flexStartable / (teamCount * 3)) * 100),
      t1: flexScarcity.reduce((a, s) => a + s.tier1Remaining, 0),
      t2: flexScarcity.reduce((a, s) => a + s.tier2Remaining, 0),
      t3: flexScarcity.reduce((a, s) => a + s.tier3Remaining, 0),
      t4: countTier(flexPool, 4),
      t5: countTier(flexPool, 5),
      targets: flexPool.filter(sp => sp.isUserTarget).length,
    }

    return [...posRows, flexRow].sort((a, b) => a.t1 + a.t2 - (b.t1 + b.t2)) // scarcest first
  }, [scarcityByPos, available, teamCount, scarcity])

  const filledSlots = myPicks.length
  const totalSlots = Object.values(rosterSlots).reduce((a, b) => a + (b ?? 0), 0)

  // --- Picker open/close ----------------------------------------------------
  const openPicker = (filter?: BlockPickerFilter) => {
    setPickerFilter(filter)
    setPickerOpen(true)
  }
  const handlePick = (player: Player) => {
    setOnBlockPlayer(player)
    setPickerOpen(false)
    setPickerFilter(undefined)
  }

  // Auto-open the picker when sync drops and nobody is on the block (v4 ask).
  // Tracks the previous online value during render -- React's documented pattern
  // for reacting to a changed prop without a cascading effect.
  const [prevOnline, setPrevOnline] = useState(online)
  if (prevOnline !== online) {
    setPrevOnline(online)
    if (prevOnline && !online && !onBlockPlayer) setPickerOpen(true)
  }

  return (
    <div
      className="ffi-live-room mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col overflow-hidden rounded-2xl"
      style={{ background: ROOM.bg, border: `1px solid ${ROOM.border}` }}
    >
      <div className="sticky top-0 z-30">
        <StatusBar
          leagueName={leagueName}
          online={online}
          onLeave={onLeave}
          round={Math.floor(state.picks.length / teamCount) + 1}
          pick={state.picks.length + 1}
        />
      </div>

      <div className="flex-1 px-3 pb-3">
        {view === 'research' ? (
          <ResearchView
            available={available}
            maxBidMap={maxBidMap}
            scarcity={scarcity}
            teamCount={teamCount}
            onBlockPlayer={onBlockPlayer}
            setOnBlockPlayer={setOnBlockPlayer}
            managerNames={managerNames}
            myManager={myManager}
            onRecordPick={onRecordPick}
            onToggleTarget={onToggleTarget}
            onToggleAvoid={onToggleAvoid}
          />
        ) : (
          <>
            {/* LB-2: the strategy banner is gone. The Market Pulse strip reads
                what the room is actually paying, live, and the board below is
                repriced off it. The board is the strategy, in the moment. */}
            <div className="pt-3">
              <SectionHeader label="Market Pulse" />
              <MarketPulseStrip inflation={inflation} />
            </div>

            <div className="pt-2.5">
              <OnTheBlockCard
                player={onBlockPlayer}
                advice={advice}
                confidence={confidence}
                landProbability={landProbability}
                repriced={onBlockPlayer ? repriced.get(onBlockPlayer.id) ?? null : null}
                onChangePlayer={() => openPicker()}
                onToggleTarget={onToggleTarget}
                onToggleAvoid={onToggleAvoid}
              />
            </div>

            <div className="pt-2.5">
              <AwarenessStrip items={awarenessItems} />
            </div>

            <div className="pt-2.5">
              <BudgetStrip
                remaining={myBudget}
                leagueBudget={leagueBudget}
                maxBid={myMaxBid}
                filledSlots={filledSlots}
                totalSlots={totalSlots}
              />
            </div>

            <SectionHeader
              label="Tier Context"
              action={
                <button
                  onClick={() => openPicker()}
                  className="relative whitespace-nowrap text-[9.5px] font-bold uppercase tracking-wide underline"
                  style={{ color: ROOM.t2 }}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 -inset-y-[15px]" />
                  tap to filter
                </button>
              }
            />
            <TierContext
              rows={tierRows}
              onTapPosition={pos => openPicker({ position: pos })}
              onTapTier={(pos, tier) => openPicker({ position: pos, tier })}
            />

            <SectionHeader
              label="My Team · glance only"
              action={
                <button
                  onClick={() => setMyTeamCollapsed(v => !v)}
                  className="relative whitespace-nowrap text-[9.5px] font-bold uppercase tracking-wide underline"
                  style={{ color: ROOM.t2 }}
                  aria-expanded={!myTeamCollapsed}
                  aria-label={myTeamCollapsed ? 'Expand my team' : 'Collapse my team'}
                >
                  <span aria-hidden="true" className="absolute inset-x-0 -inset-y-[15px]" />
                  {myTeamCollapsed ? 'show' : 'hide'}
                </button>
              }
            />
            {!myTeamCollapsed && (
              <MyTeamRoster
                picks={myPicks}
                roster={rosterSlots}
                activeStrategy={activeStrategy}
                available={available}
                budgetRemaining={myBudget}
                onSelectPlayer={setOnBlockPlayer}
              />
            )}

            {/* D6b-1 gap #6: inline collapsible Players section */}
            <InlinePlayersPanel
              available={available}
              maxBidMap={maxBidMap}
              repriced={repriced}
              drafted={draftedRows}
              isTarget={isTarget}
              onToggleTarget={onToggleTarget}
              onSelectPlayer={setOnBlockPlayer}
            />

            {/* LB-3: Dollar Bin - starred watchlist + model $1-$3 darts */}
            <DollarBinPanel
              bin={dollarBin}
              onToggleTarget={onToggleTarget}
              onSelectPlayer={id => {
                const sp = available.find(s => s.player.id === id)
                if (sp) setOnBlockPlayer(sp.player)
              }}
            />
          </>
        )}
      </div>

      {view === 'draft' && recordBar && (
        <div className="sticky bottom-[52px] z-20" style={{ background: ROOM.surface }}>
          {state.picks.length > 0 && (
            <div className="flex justify-end px-3 pb-1 pt-1.5">
              <button
                onClick={() => setFixOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
                style={{ color: ROOM.t2 }}
              >
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                </svg>
                <span className="underline underline-offset-2">Fix a pick</span>
              </button>
            </div>
          )}
          <div className="px-3 py-2" style={{ borderTop: `1px solid ${ROOM.border2}` }}>
            {recordBar}
          </div>
        </div>
      )}

      <div className="sticky bottom-0 z-30">
        <BottomNav active={view} onNavigate={onNavigate} onSelectView={setView} />
      </div>

      <BlockPickerSheet
        open={pickerOpen}
        online={online}
        available={available}
        maxBidMap={maxBidMap}
        initialFilter={pickerFilter}
        onPick={handlePick}
        onClose={() => {
          setPickerOpen(false)
          setPickerFilter(undefined)
        }}
      />

      <FixPickSheet
        open={fixOpen}
        picks={state.picks}
        managerNames={state.manager_order}
        format={state.format}
        available={available}
        onEditPick={onEditPick}
        onRemovePick={onRemovePick}
        onClose={() => setFixOpen(false)}
      />
    </div>
  )
}
