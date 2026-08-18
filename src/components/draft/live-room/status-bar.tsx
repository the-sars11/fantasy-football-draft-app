'use client'

/**
 * Live-room status bar (UXV2-6): Leave · LIVE/OFFLINE pill + elapsed · league chip.
 * The room owns its own chrome because the app shell strips nav on /draft/live.
 */

import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { ROOM } from './theme'

/**
 * Elapsed clock that starts on mount. All Date.now() reads live inside the
 * effect/interval closure so render stays pure (react-hooks/purity).
 */
function useElapsed(): string {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    }, 1000)
    return () => clearInterval(id)
  }, [])
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const hh = Math.floor(m / 60)
  const mm = m % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return hh > 0 ? `${pad(hh)}:${pad(mm)}:${pad(s)}` : `${pad(mm)}:${pad(s)}`
}

export function StatusBar({
  leagueName,
  online,
  onLeave,
}: {
  leagueName: string
  online: boolean
  onLeave: () => void
}) {
  // Draft clock starts when the room first mounts.
  const elapsed = useElapsed()

  return (
    <div
      className="flex items-center justify-between px-3.5 py-2"
      style={{
        background: ROOM.surface,
        borderBottom: `1px solid ${ROOM.border2}`,
      }}
    >
      <button
        onClick={onLeave}
        className="flex items-center gap-1 text-[13px] font-medium transition-opacity hover:opacity-80"
        style={{ color: ROOM.t2 }}
        aria-label="Leave draft"
      >
        <ChevronLeft className="h-4 w-4" />
        Leave
      </button>

      <div className="flex items-center gap-2">
        {online ? (
          <span
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider"
            style={{
              background: 'rgba(95,168,224,0.12)',
              border: '1px solid rgba(95,168,224,0.28)',
              color: ROOM.live,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full motion-safe:animate-pulse"
              style={{ background: ROOM.live }}
            />
            LIVE
          </span>
        ) : (
          <span
            className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider"
            style={{
              background: 'rgba(249,115,22,0.12)',
              border: '1px solid rgba(249,115,22,0.3)',
              color: ROOM.offline,
            }}
          >
            OFFLINE
          </span>
        )}
        <span className="font-mono text-[11px] tabular-nums" style={{ color: ROOM.t3 }}>
          {elapsed}
        </span>
      </div>

      <span
        className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold"
        style={{ background: 'rgba(255,255,255,0.06)', color: ROOM.t2 }}
      >
        {leagueName}
      </span>
    </div>
  )
}
