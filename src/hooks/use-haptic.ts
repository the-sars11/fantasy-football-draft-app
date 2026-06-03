'use client'

/**
 * useHaptic (Sunday Night Gridiron - sensory layer)
 *
 * Android-only vibration bonus. iOS Safari has no Vibration API, so this no-ops there and
 * the visual + motion confirmation always stands on its own. Skipped under reduced motion.
 */

import { useCallback } from 'react'

export type HapticPattern = 'pick' | 'yourTurn' | 'champion'

const PATTERNS: Record<HapticPattern, number | number[]> = {
  pick: 20,
  yourTurn: 30,
  champion: [40, 30, 40],
}

export function useHaptic() {
  return useCallback((pattern: HapticPattern) => {
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    try {
      navigator.vibrate(PATTERNS[pattern])
    } catch {
      /* vibration not permitted - ignore */
    }
  }, [])
}
