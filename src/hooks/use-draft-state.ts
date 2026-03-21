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
  getDraftedPlayerNames,
  getPositionNeeds,
  getRemainingBudget,
  getMaxBid,
} from '@/lib/draft/state'
import { applyKeepersToState, type KeeperAssignment } from '@/lib/draft/keepers'
import type { DraftState, DraftPick } from '@/lib/draft/state'
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

  // Initialize state from session
  useEffect(() => {
    if (!session) return

    let initial = createInitialState(
      session.format,
      session.managers,
      rosterSlots,
    )

    // Apply keepers first (FF-029) — deducts budgets, fills roster slots
    const keepers = (session.keepers ?? []) as KeeperAssignment[]
    if (keepers.length > 0) {
      initial = applyKeepersToState(initial, keepers, session.format)
    }

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

  // Undo last pick
  const undoLastPick = useCallback(() => {
    setState(prev => {
      if (!prev || prev.picks.length === 0) return prev

      // Rebuild state from scratch minus the last pick
      const allPicks = prev.picks.slice(0, -1)
      let rebuilt = createInitialState(
        prev.format,
        Object.values(prev.managers).map(m => ({
          name: m.name,
          budget: m.budget_total,
          draft_position: m.draft_position,
        })),
        prev.roster_slots,
      )

      // Re-apply keepers (FF-029)
      if (prev.keepers.length > 0) {
        rebuilt = applyKeepersToState(rebuilt, prev.keepers, prev.format)
      }

      for (const p of allPicks) {
        rebuilt = applyPick(rebuilt, p)
      }

      persistPicks(rebuilt.picks)
      return rebuilt
    })
  }, [persistPicks])

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
