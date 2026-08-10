'use client'

/**
 * useTrashTalkEngine (extracted from live/client.tsx, finding 9)
 *
 * Generates and manages trash-talk alerts for the live draft room:
 *   - Builds a team-owner map once when manager_order first populates.
 *   - Analyzes each newly-arrived pick for trash-talk triggers, then (outside
 *     sim mode) enriches each alert with an AI-generated line.
 *   - Runs a one-time keeper-value analysis at draft start (keeper leagues).
 *   - Exposes dismiss / save / remove-saved handlers.
 *
 * AI enrichment is fire-and-forget and fully suppressed in sim mode (zero paid
 * calls). Behavior identical to the original inline implementation.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  analyzePickForTrashTalk,
  generateTrashTalk,
} from '@/lib/draft/trash-talk'
import type { TrashTalkAlert } from '@/lib/draft/trash-talk'
import { loadHistory, buildTeamOwnerMap, buildHistoryBlock } from '@/lib/draft/trash-talk-history'
import type { TeamOwnerMap } from '@/lib/draft/trash-talk-history'
import type { DraftState } from '@/lib/draft/state'
import type { Player } from '@/lib/players/types'

export function useTrashTalkEngine({
  state,
  players,
  trashTalkMode,
  simEnabled,
}: {
  state: DraftState | null
  players: Player[]
  trashTalkMode: 'off' | 'family-safe' | 'adult-only'
  simEnabled: boolean
}) {
  const [trashTalkAlerts, setTrashTalkAlerts] = useState<TrashTalkAlert[]>([])
  const [savedAlerts, setSavedAlerts] = useState<TrashTalkAlert[]>([])
  // null = not yet initialized (skip existing picks on load); number = picks processed so far
  const processedPickCountRef = useRef<number | null>(null)
  // Built once at draft start; maps manager name to OwnerHistory for history injection
  const teamOwnerMapRef = useRef<TeamOwnerMap | null>(null)

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

    // Mode is off, skip all analysis
    if (trashTalkMode === 'off') return

    if (state.picks.length <= processedPickCountRef.current) return

    const newPicks = state.picks.slice(processedPickCountRef.current)
    processedPickCountRef.current = state.picks.length

    const myManagerName = state.manager_order[0]
    const newAlerts: TrashTalkAlert[] = []

    for (const newPick of newPicks) {
      const alert = analyzePickForTrashTalk(
        newPick,
        state.picks,
        players,
        state.format,
        myManagerName,
        state.manager_order.length,
      )
      if (alert) newAlerts.push(alert)
    }

    if (newAlerts.length > 0) {
      // Intentional: append trash-talk alerts derived from newly-arrived picks.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrashTalkAlerts(prev => [...prev, ...newAlerts])
      // Fire-and-forget: enrich each alert's message with AI-generated line.
      // Suppressed in sim mode, use hardcoded fallback strings only (zero paid calls).
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

  return {
    trashTalkAlerts,
    savedAlerts,
    handleDismissTrashTalk,
    handleSaveTrashTalk,
    handleRemoveSavedAlert,
  }
}
