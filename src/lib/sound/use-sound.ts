'use client'

/**
 * useSound (Sunday Night Gridiron - sensory layer)
 *
 * Opt-in, muted by default. Cues are SYNTHESIZED with the Web Audio API (no asset files to
 * download or ship). The AudioContext is created/resumed on the enabling gesture, so audio
 * is gesture-unlocked per browser policy. The on/off state persists in localStorage and is
 * read on every play, so any component can fire a cue and it respects the current setting.
 */

import { useCallback, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'ffi-sound-enabled'

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  freq: number,
  startOffset: number,
  duration: number,
  gain: number,
  type: OscillatorType = 'triangle',
) {
  const c = getCtx()
  if (!c) return
  const t0 = c.currentTime + startOffset
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + duration + 0.02)
}

export type SoundCue = 'pick' | 'yourTurn' | 'champion'

function synth(cue: SoundCue) {
  switch (cue) {
    case 'pick':
      tone(660, 0, 0.08, 0.04)
      break
    case 'yourTurn':
      tone(523.25, 0, 0.12, 0.05)
      tone(783.99, 0.08, 0.16, 0.05)
      break
    case 'champion':
      // Rising C major arpeggio (C5 E5 G5 C6)
      tone(523.25, 0, 0.18, 0.06)
      tone(659.25, 0.12, 0.22, 0.06)
      tone(783.99, 0.24, 0.3, 0.07)
      tone(1046.5, 0.36, 0.5, 0.07)
      break
  }
}

function isEnabled(): boolean {
  return typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === '1'
}

// Tiny external store so toggling updates THIS tab immediately (the `storage` event only
// fires in other tabs) while staying SSR-safe through useSyncExternalStore.
const listeners = new Set<() => void>()
function notify() {
  listeners.forEach((l) => l())
}
function subscribe(cb: () => void) {
  listeners.add(cb)
  if (typeof window !== 'undefined') window.addEventListener('storage', cb)
  return () => {
    listeners.delete(cb)
    if (typeof window !== 'undefined') window.removeEventListener('storage', cb)
  }
}

export function useSound() {
  const enabled = useSyncExternalStore(subscribe, isEnabled, () => false)

  const setEnabled = useCallback((on: boolean) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    }
    if (on) getCtx() // unlock the AudioContext on this enabling gesture
    notify()
  }, [])

  const play = useCallback((cue: SoundCue) => {
    if (!isEnabled()) return
    try {
      synth(cue)
    } catch {
      /* audio unavailable - ignore */
    }
  }, [])

  return { enabled, setEnabled, play }
}
