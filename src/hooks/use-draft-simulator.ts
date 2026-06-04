'use client'

/**
 * useDraftSimulator (UX-7.1)
 *
 * Dev-only sim engine. Gate: NODE_ENV !== 'production' AND caller passes enabled=true
 * (caller checks ?sim=1 in the URL). Auto-plays scripted picks into the existing draft
 * state via the real addManualPick path so every broadcast moment fires naturally:
 * lower-third wipe, score-bug flash, on-the-clock banner, trash talk triggers.
 *
 * No paid AI calls: ANTHROPIC_API_KEY is absent in dev; the advisor route falls back to
 * rule-based results silently. UX-7.2 adds an explicit advisor-suppress flag.
 *
 * Pick selection: players sorted by consensusRank (best available first).
 * Auction price: player.consensusAuctionValue capped at 40% of manager budget.
 * Snake manager: derived from state.current_manager (set by the state machine).
 * Auction manager: round-robin through manager_order.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DraftState, DraftPick } from '@/lib/draft/state'
import type { Player } from '@/lib/players/types'

export type SimSpeed = 'slow' | 'medium' | 'fast'

export const SIM_SPEED_MS: Record<SimSpeed, number> = {
  slow: 3000,
  medium: 1500,
  fast: 600,
}

function simAuctionPrice(player: Player, budget: number): number {
  const ceiling = Math.round(budget * 0.4)
  return Math.max(1, Math.min(ceiling, player.consensusAuctionValue || 1))
}

export interface SimulatorResult {
  isSimActive: boolean
  isRunning: boolean
  speed: SimSpeed
  setSpeed: (s: SimSpeed) => void
  start: () => void
  pause: () => void
  reset: () => void
}

const INACTIVE: SimulatorResult = {
  isSimActive: false,
  isRunning: false,
  speed: 'medium',
  setSpeed: () => {},
  start: () => {},
  pause: () => {},
  reset: () => {},
}

export function useDraftSimulator({
  enabled,
  players,
  draftedNames,
  state,
  addManualPick,
}: {
  enabled: boolean
  players: Player[]
  draftedNames: Set<string>
  state: DraftState | null
  addManualPick: (pick: Omit<DraftPick, 'pick_number'>) => void
}): SimulatorResult {
  const [isRunning, setIsRunning] = useState(false)
  const [speed, setSpeed] = useState<SimSpeed>('medium')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Round-robin index for auction (snake uses state.current_manager)
  const auctionMgrIdxRef = useRef(0)

  // Keep latest reactive values in refs so the interval closure never goes stale.
  // Pattern mirrors use-sleeper-draft-feed.ts.
  const playersRef = useRef(players)
  const draftedNamesRef = useRef(draftedNames)
  const stateRef = useRef(state)
  const addManualPickRef = useRef(addManualPick)
  useEffect(() => { playersRef.current = players }, [players])
  useEffect(() => { draftedNamesRef.current = draftedNames }, [draftedNames])
  useEffect(() => { stateRef.current = state }, [state])
  useEffect(() => { addManualPickRef.current = addManualPick }, [addManualPick])

  const fireNextPick = useCallback(() => {
    const s = stateRef.current
    if (!s) return
    if (s.status === 'completed') {
      setIsRunning(false)
      return
    }

    const dn = draftedNamesRef.current
    // Sort available players by consensusRank ascending (best player first)
    const pool = playersRef.current
      .filter(p => !dn.has(p.name.toLowerCase()))
      .sort((a, b) => a.consensusRank - b.consensusRank)

    if (!pool.length || !s.manager_order.length) {
      setIsRunning(false)
      return
    }

    const mgrs = s.manager_order
    const manager =
      s.format === 'snake'
        ? (s.current_manager ?? mgrs[auctionMgrIdxRef.current % mgrs.length])
        : mgrs[auctionMgrIdxRef.current % mgrs.length]

    const player = pool[0]
    const budget = s.managers[manager]?.budget_total ?? 200

    const pick: Omit<DraftPick, 'pick_number'> = {
      player_name: player.name,
      position: player.position as string,
      manager,
      ...(s.format === 'auction' ? { price: simAuctionPrice(player, budget) } : {}),
    }

    addManualPickRef.current(pick)
    auctionMgrIdxRef.current += 1
  }, []) // empty deps: all state read via refs

  // Timer effect - restarts whenever speed or running state changes
  useEffect(() => {
    if (!enabled || !isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }
    intervalRef.current = setInterval(fireNextPick, SIM_SPEED_MS[speed])
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, isRunning, speed, fireNextPick])

  // Draft completion is handled inside fireNextPick (status === 'completed' stops the timer).
  // No synchronous-setState effect needed here.

  const start = useCallback(() => setIsRunning(true), [])
  const pause = useCallback(() => setIsRunning(false), [])
  const reset = useCallback(() => {
    setIsRunning(false)
    auctionMgrIdxRef.current = 0
  }, [])

  if (!enabled) return INACTIVE

  return { isSimActive: true, isRunning, speed, setSpeed, start, pause, reset }
}
