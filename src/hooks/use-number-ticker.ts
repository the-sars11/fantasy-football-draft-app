'use client'

import { useEffect, useRef, useState } from 'react'

export type TickerDirection = 'up' | 'down' | 'neutral'

export interface TickerState {
  flashing: boolean
  direction: TickerDirection
  delta: number | null
}

/**
 * Detects when a numeric value changes and emits a short flash state.
 * Components use `flashing` + `direction` to apply CSS animation classes.
 * Flash clears automatically after 1.4s.
 */
export function useNumberTicker(value: number): TickerState {
  const prevRef = useRef<number>(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [state, setState] = useState<TickerState>({
    flashing: false,
    direction: 'neutral',
    delta: null,
  })

  useEffect(() => {
    const prev = prevRef.current
    if (prev === value) return

    const delta = value - prev
    prevRef.current = value

    if (timerRef.current) clearTimeout(timerRef.current)

    setState({ flashing: true, direction: delta > 0 ? 'up' : 'down', delta })

    timerRef.current = setTimeout(() => {
      setState(s => ({ ...s, flashing: false, delta: null }))
    }, 1400)
  }, [value])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return state
}
