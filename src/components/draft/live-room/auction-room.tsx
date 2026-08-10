'use client'

/**
 * AuctionDraftRoom (UXV2-6) — the approved v4 decision-first live room.
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
import type { DraftState, DraftPick } from '@/lib/draft/state'
import type { RosterSlots } from '@/lib/supabase/database.types'
import { computeWhatToDo } from '@/lib/draft/what-to-do'
import { ROOM } from './theme'
import { StatusBar } from './status-bar'
import { OnTheBlockCard } from './on-the-block-card'
import { AwarenessStrip, type AwarenessItem } from './awareness-strip'
import { BudgetStrip } from './budget-strip'
import { TierContext, type TierRow } from './tier-context'
import { MyTeamRoster } from './my-team-roster'
import { BottomNav } from './bottom-nav'
import { BlockPickerSheet, type BlockPickerFilter } from './block-picker-sheet'
import { FixPickSheet } from './fix-pick-sheet'
import { ResearchView } from './research-view'

const TIER_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE']

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
  myBudget: number | null
  myMaxBid: number | null
  myPicks: Array<{ player_name: string; position?: string; price?: number }>
  rosterSlots: RosterSlots
  onBlockPlayer: Player | null
  setOnBlockPlayer: (p: Player | null) => void
  isTarget: (id: string) => boolean
  isAvoid: (id: string) => boolean
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
  /** Edit any recorded pick (finding 12). Rebuilds budgets/roster from scratch. */
  onEditPick: (pickNumber: number, changes: Partial<Omit<DraftPick, 'pick_number'>>) => void
  /** Remove any recorded pick (finding 12). Renumbers the remainder. */
  onRemovePick: (pickNumber: number) => void
}

export function AuctionDraftRoom({
  leagueName,
  online,
  state,
  scoredPlayers,
  draftedNames,
  scarcity,
  maxBidMap,
  myBudget,
  myMaxBid,
  myPicks,
  rosterSlots,
  onBlockPlayer,
  setOnBlockPlayer,
  isTarget,
  isAvoid,
  onLeave,
  onNavigate,
  recordBar,
  managerNames,
  myManager,
  onRecordPick,
  onToggleTarget,
  onEditPick,
  onRemovePick,
}: AuctionRoomProps) {
  const [view, setView] = useState<'draft' | 'research'>('draft')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerFilter, setPickerFilter] = useState<BlockPickerFilter | undefined>(undefined)
  const [fixOpen, setFixOpen] = useState(false)

  const teamCount = state.manager_order.length || 12

  // Undrafted, scored — the pool for alternatives, tiers, and the picker.
  const available = useMemo(
    () => scoredPlayers.filter(sp => !draftedNames.has(sp.player.name.toLowerCase())),
    [scoredPlayers, draftedNames],
  )

  const scarcityByPos = useMemo(() => {
    const m = new Map<string, PositionScarcityExtended>()
    for (const s of scarcity) m.set(s.position, s)
    return m
  }, [scarcity])

  // --- What To Do for the player on the block -------------------------------
  const advice = useMemo(() => {
    if (!onBlockPlayer) return null
    const scored =
      available.find(sp => sp.player.id === onBlockPlayer.id) ??
      scoredPlayers.find(sp => sp.player.id === onBlockPlayer.id) ??
      null
    const alternatives = available
      .filter(sp => sp.player.position === onBlockPlayer.position && sp.player.id !== onBlockPlayer.id)
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 12)
    return computeWhatToDo({
      player: onBlockPlayer,
      scored,
      myMaxBid: maxBidMap.get(onBlockPlayer.name.toLowerCase()) ?? null,
      budgetMaxBid: myMaxBid,
      scarcity: scarcityByPos.get(onBlockPlayer.position) ?? null,
      alternatives,
      isTarget: isTarget(onBlockPlayer.id),
      isAvoid: isAvoid(onBlockPlayer.id),
    })
  }, [onBlockPlayer, available, scoredPlayers, maxBidMap, myMaxBid, scarcityByPos, isTarget, isAvoid])

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
      })
    }
    // Budget pace.
    const filled = myPicks.length
    const total = Object.values(rosterSlots).reduce((a, b) => a + (b ?? 0), 0)
    const openSlots = Math.max(0, total - filled)
    if (myBudget != null && openSlots > 0) {
      const avg = (myBudget / openSlots).toFixed(2)
      items.push({ strong: `$${myBudget} left · ${openSlots} slots`, dim: `avg $${avg} needed` })
    }
    return items
  }, [scarcity, available, maxBidMap, myPicks.length, rosterSlots, myBudget])

  // --- Tier context rows ----------------------------------------------------
  const tierRows = useMemo<TierRow[]>(() => {
    return TIER_POSITIONS.map(pos => {
      const s = scarcityByPos.get(pos)
      const targets = available.filter(sp => sp.player.position === pos && sp.isUserTarget).length
      const startable = s?.startableRemaining ?? 0
      const fillPct = Math.min(100, (startable / (teamCount * 1.5)) * 100)
      return {
        position: pos,
        fillPct,
        t1: s?.tier1Remaining ?? 0,
        t2: s?.tier2Remaining ?? 0,
        t3: s?.tier3Remaining ?? 0,
        targets,
      }
    }).sort((a, b) => a.t1 + a.t2 - (b.t1 + b.t2)) // scarcest first
  }, [scarcityByPos, available, teamCount])

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
  // Tracks the previous online value during render — React's documented pattern
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
        <StatusBar leagueName={leagueName} online={online} onLeave={onLeave} />
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
          />
        ) : (
          <>
            <div className="pt-3">
              <OnTheBlockCard
                player={onBlockPlayer}
                advice={advice}
                onChangePlayer={() => openPicker()}
              />
            </div>

            <div className="pt-2.5">
              <AwarenessStrip items={awarenessItems} />
            </div>

            <div className="pt-2.5">
              <BudgetStrip
                remaining={myBudget}
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
                  className="whitespace-nowrap text-[9.5px] font-bold uppercase tracking-wide underline"
                  style={{ color: ROOM.t2 }}
                >
                  tap to filter
                </button>
              }
            />
            <TierContext
              rows={tierRows}
              onTapPosition={pos => openPicker({ position: pos })}
              onTapTier={(pos, tier) => openPicker({ position: pos, tier })}
            />

            <SectionHeader label="My Team · glance only" />
            <MyTeamRoster picks={myPicks} roster={rosterSlots} />
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
