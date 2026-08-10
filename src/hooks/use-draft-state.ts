'use client'

/**
 * useDraftState — manages live draft state.
 *
 * Combines:
 * - Draft state machine (auction + snake)
 * - Google Sheet polling (optional)
 * - Manual pick entry
 * - Session persistence (saves picks to Supabase)
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  createInitialState,
  applyPick,
  applySheetRows,
  removePickByNumber,
  editPickByNumber,
  reconcileWithAuctioneerPicks,
  getDraftedPlayerNames,
  getPositionNeeds,
  getRemainingBudget,
  getMaxBid,
} from '@/lib/draft/state'
import type {
  DraftState,
  DraftPick,
  AuctioneerPickSnapshot,
  PickCorrection,
} from '@/lib/draft/state'
import type { DraftFormat, RosterSlots, DraftSession } from '@/lib/supabase/database.types'
import { useDraftPolling } from './use-draft-polling'
import type { SheetRow } from '@/lib/sheets'

interface UseDraftStateOptions {
  session: DraftSession | null
  rosterSlots: RosterSlots
  onPickApplied?: (pick: DraftPick) => void
}

interface UseDraftStateResult {
  state: DraftState | null
  addManualPick: (pick: Omit<DraftPick, 'pick_number'>) => void
  undoLastPick: () => void
  editPick: (pickNumber: number, changes: Partial<Omit<DraftPick, 'pick_number'>>) => void
  removePick: (pickNumber: number) => void
  /**
   * FF-315: Reconcile provisional picks against the auctioneer's full snapshot on
   * reconnect. Auctioneer is the system of record — it wins on discrepancies.
   * Returns the list of picks that were auto-corrected, for the toast banner.
   */
  reconcileWithAuctioneer: (auctioneerPicks: AuctioneerPickSnapshot[]) => PickCorrection[]
  draftedNames: Set<string>
  getNeeds: (manager: string) => Record<string, number>
  getBudget: (manager: string) => number | null
  getMaxBidFor: (manager: string) => number | null
  isPolling: boolean
  lastPollAt: Date | null
  pollNow: () => Promise<void>
  sheetError: string | null
  saving: boolean
}

export function useDraftState({
  session,
  rosterSlots,
  onPickApplied,
}: UseDraftStateOptions): UseDraftStateResult {
  const [state, setState] = useState<DraftState | null>(null)
  const [saving, setSaving] = useState(false)
  const onPickAppliedRef = useRef(onPickApplied)
  onPickAppliedRef.current = onPickApplied

  // Keep a ref to the latest state so reconcileWithAuctioneer can read it
  // synchronously (setState updaters are async in React).
  const stateRef = useRef(state)
  stateRef.current = state

  // Initialize state from session
  useEffect(() => {
    if (!session) return

    let initial = createInitialState(
      session.format,
      session.managers,
      rosterSlots,
    )

    // Replay any existing picks from the session
    if (session.picks && session.picks.length > 0) {
      let replayed = initial
      for (const p of session.picks) {
        replayed = applyPick(replayed, {
          pick_number: p.pick_number,
          player_name: p.player_id, // stored as player name in our schema
          manager: p.manager,
          price: p.price,
          round: p.round,
          position: undefined,
        })
      }
      setState(replayed)
    } else {
      setState(initial)
    }
  }, [session, rosterSlots])

  // Persist picks to Supabase
  const persistPicks = useCallback(async (picks: DraftPick[]) => {
    if (!session) return
    setSaving(true)
    try {
      await fetch(`/api/draft/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          picks: picks.map(p => ({
            player_id: p.player_name,
            manager: p.manager,
            price: p.price,
            round: p.round,
            pick_number: p.pick_number,
          })),
          status: 'live',
        }),
      })
    } catch (err) {
      console.error('Failed to persist picks:', err)
    } finally {
      setSaving(false)
    }
  }, [session])

  // Handle new picks from Google Sheet polling
  const handleNewSheetPicks = useCallback((_newRows: SheetRow[], allRows: SheetRow[]) => {
    setState(prev => {
      if (!prev) return prev
      const updated = applySheetRows(prev, allRows)
      // Persist after sheet update
      persistPicks(updated.picks)
      return updated
    })
  }, [persistPicks])

  // Sheet polling (only if session has a sheet URL)
  const {
    isPolling,
    lastPollAt,
    error: sheetError,
    pollNow,
  } = useDraftPolling({
    sheetUrl: session?.sheet_url ?? null,
    enabled: !!session?.sheet_url && state?.status === 'live',
    onNewPicks: handleNewSheetPicks,
  })

  // Manual pick entry
  const addManualPick = useCallback((pickData: Omit<DraftPick, 'pick_number'>) => {
    setState(prev => {
      if (!prev) return prev

      const pick: DraftPick = {
        ...pickData,
        pick_number: prev.picks.length + 1,
      }

      const updated = applyPick(prev, pick)
      onPickAppliedRef.current?.(pick)
      persistPicks(updated.picks)
      return updated
    })
  }, [persistPicks])

  // Rebuild the whole state from a known-good pick list. Undo / edit / remove all
  // reconstruct from scratch (fresh managers -> re-apply keepers -> replay picks)
  // so budgets, roster counts, and the snake turn stay perfectly consistent.
  const rebuildFromPicks = useCallback((prev: DraftState, picks: DraftPick[]): DraftState => {
    let rebuilt = createInitialState(
      prev.format,
      // manager_order preserves draft order (matters for snake turn calc)
      prev.manager_order.map(name => {
        const m = prev.managers[name]
        return { name, budget: m?.budget_total, draft_position: m?.draft_position }
      }),
      prev.roster_slots,
    )

    for (const p of picks) {
      rebuilt = applyPick(rebuilt, p)
    }

    return rebuilt
  }, [])

  // Undo last pick
  const undoLastPick = useCallback(() => {
    setState(prev => {
      if (!prev || prev.picks.length === 0) return prev
      const rebuilt = rebuildFromPicks(prev, prev.picks.slice(0, -1))
      persistPicks(rebuilt.picks)
      return rebuilt
    })
  }, [persistPicks, rebuildFromPicks])

  // Remove an arbitrary pick by pick_number (renumbers the remainder)
  const removePick = useCallback((pickNumber: number) => {
    setState(prev => {
      if (!prev) return prev
      const next = removePickByNumber(prev.picks, pickNumber)
      if (next.length === prev.picks.length) return prev // no matching pick
      const rebuilt = rebuildFromPicks(prev, next)
      persistPicks(rebuilt.picks)
      return rebuilt
    })
  }, [persistPicks, rebuildFromPicks])

  // Edit an existing pick (correct price / manager / player / position)
  const editPick = useCallback((pickNumber: number, changes: Partial<Omit<DraftPick, 'pick_number'>>) => {
    setState(prev => {
      if (!prev) return prev
      const next = editPickByNumber(prev.picks, pickNumber, changes)
      const rebuilt = rebuildFromPicks(prev, next)
      persistPicks(rebuilt.picks)
      return rebuilt
    })
  }, [persistPicks, rebuildFromPicks])

  // FF-315: Reconcile provisional picks against the auctioneer snapshot on reconnect.
  // Reads the latest state via stateRef (synchronous) to compute and return corrections
  // immediately, then applies them inside setState for a consistent state rebuild.
  const reconcileWithAuctioneer = useCallback(
    (auctioneerPicks: AuctioneerPickSnapshot[]): PickCorrection[] => {
      const current = stateRef.current
      if (!current) return []

      const result = reconcileWithAuctioneerPicks(current.picks, auctioneerPicks)

      // Apply reconciled picks + add any net-new auctioneer picks after the setState batch.
      setState(prev => {
        if (!prev) return prev
        // Re-run inside setState for freshness in concurrent mode.
        const fresh = reconcileWithAuctioneerPicks(prev.picks, auctioneerPicks)
        const rebuilt = rebuildFromPicks(prev, fresh.picks)
        persistPicks(fresh.picks)
        return rebuilt
      })

      // Fold in picks the auctioneer has that state doesn't (did not go through onNewPicks
      // because they arrived while the phone was offline and the merger's seenIds were reset).
      for (const ap of result.newPicksFromAuctioneer) {
        addManualPick({
          player_name: ap.player_name,
          manager: ap.manager,
          price: ap.price,
          position: ap.position,
        })
      }

      return result.corrections
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rebuildFromPicks, addManualPick, persistPicks],
  )

  // Derived queries
  const draftedNames = state ? getDraftedPlayerNames(state) : new Set<string>()

  const getNeeds = useCallback((manager: string) => {
    if (!state) return {}
    return getPositionNeeds(state, manager)
  }, [state])

  const getBudget = useCallback((manager: string) => {
    if (!state) return null
    return getRemainingBudget(state, manager)
  }, [state])

  const getMaxBidFor = useCallback((manager: string) => {
    if (!state) return null
    return getMaxBid(state, manager)
  }, [state])

  return {
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
    isPolling,
    lastPollAt,
    pollNow,
    sheetError,
    saving,
  }
}
