/**
 * useAutoRecommend (UX make-it-real)
 *
 * Auto-fires an AI recommendation fetch when the draft board changes, so the advisor
 * reacts within seconds of a pick instead of waiting for a manual tap (the flagship
 * North Star behavior: pick detected -> recommendation on screen).
 *
 * Uses a ref for the callback so a changing fetch closure does NOT restart the debounce
 * timer (the stable-effect pattern use-sleeper-draft-feed relies on). Fires once per new
 * triggerKey; the manual Refresh button still works as an override.
 */

import { useEffect, useRef } from 'react'

interface UseAutoRecommendOptions {
  /** Master switch (e.g. correct format for this advisor). */
  enabled: boolean
  /** Whether an auto-fetch is relevant right now (e.g. your turn, draft not complete). */
  active: boolean
  /** Changing this triggers a fetch. Use state.picks.length so each pick refreshes once. */
  triggerKey: number
  /** Calls the existing fetch handler (e.g. handleGetTargets). */
  onFetch: () => void
  /** Debounce window in ms (default 500) to coalesce rapid board updates. */
  debounceMs?: number
}

export function useAutoRecommend({
  enabled,
  active,
  triggerKey,
  onFetch,
  debounceMs = 500,
}: UseAutoRecommendOptions) {
  const onFetchRef = useRef(onFetch)
  useEffect(() => {
    onFetchRef.current = onFetch
  }, [onFetch])
  const firedKey = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled || !active) return
    if (firedKey.current === triggerKey) return
    const timer = setTimeout(() => {
      firedKey.current = triggerKey
      onFetchRef.current()
    }, debounceMs)
    return () => clearTimeout(timer)
  }, [enabled, active, triggerKey, debounceMs])
}
