'use client'

/**
 * ConnectionStatusPill (FF-259)
 *
 * 4-state connection indicator for the live draft header.
 * States: LIVE (<30s) · STALE (30s-2m) · OFFLINE (>2m) · MANUAL (no sheet)
 *
 * Spec: docs/superpowers/specs/2026-04-14-p0-redesign-design.md - Decision 3
 */

import { useState, useEffect } from 'react'
import { Radio, Clock, WifiOff, Keyboard, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConnState = 'LIVE' | 'STALE' | 'OFFLINE' | 'MANUAL'

interface ConnectionStatusPillProps {
  /** ISO timestamp of last successful sheet poll. Null if never polled. */
  lastPollAt: Date | null
  /** Whether a sheet URL is configured */
  sheetConnected: boolean
  /** Current error message (used in OFFLINE error bar) */
  error: string | null
  /** Callback for retry button in error bar */
  onRetry?: () => void
}

const STATE_CONFIG: Record<ConnState, {
  bg: string
  color: string
  border: string
  label: string
  pulse: boolean
  Icon: LucideIcon
}> = {
  LIVE:    { bg: 'rgba(47,248,1,0.10)',    color: '#2ff801', border: 'rgba(47,248,1,0.22)',     label: 'LIVE',    pulse: true,  Icon: Radio    },
  STALE:   { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: 'rgba(251,191,36,0.22)',   label: 'STALE',   pulse: false, Icon: Clock    },
  OFFLINE: { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444', border: 'rgba(239,68,68,0.25)',    label: 'OFFLINE', pulse: false, Icon: WifiOff  },
  MANUAL:  { bg: 'rgba(148,163,184,0.08)', color: '#94a3b8', border: 'rgba(148,163,184,0.12)',  label: 'MANUAL',  pulse: false, Icon: Keyboard },
}

function getElapsedLabel(lastPollAt: Date | null, now: number): string {
  if (!lastPollAt) return ''
  const secs = Math.floor((now - lastPollAt.getTime()) / 1000)
  if (secs < 60) return `${secs}s`
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`
}

function getConnState(lastPollAt: Date | null, sheetConnected: boolean, now: number): ConnState {
  if (!sheetConnected) return 'MANUAL'
  if (!lastPollAt) return 'OFFLINE'
  const secs = Math.floor((now - lastPollAt.getTime()) / 1000)
  if (secs <= 30) return 'LIVE'
  if (secs <= 120) return 'STALE'
  return 'OFFLINE'
}

export function ConnectionStatusPill({
  lastPollAt,
  sheetConnected,
  error,
  onRetry,
}: ConnectionStatusPillProps) {
  const [now, setNow] = useState(() => Date.now())
  const [errorBarOpen, setErrorBarOpen] = useState(false)

  // Tick every second to update elapsed time
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const connState = getConnState(lastPollAt, sheetConnected, now)
  const cfg = STATE_CONFIG[connState]
  const showTimestamp = connState !== 'MANUAL'
  const elapsed = showTimestamp ? getElapsedLabel(lastPollAt, now) : ''

  return (
    <div className="flex flex-col items-end">
      {/* Pill */}
      <button
        onClick={() => {
          if (connState === 'OFFLINE') setErrorBarOpen(v => !v)
        }}
        style={{
          background: cfg.bg,
          color: cfg.color,
          border: `1px solid ${cfg.border}`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        className="flex items-center gap-[5px] px-[10px] py-[5px] rounded-[20px] cursor-default"
        aria-label={`Connection status: ${cfg.label}${elapsed ? ` - ${elapsed} ago` : ''}`}
      >
        {/* Per-state glyph - shape distinguishes state without relying on color */}
        <cfg.Icon
          aria-hidden="true"
          size={14}
          strokeWidth={2.5}
          className={cn('flex-shrink-0', cfg.pulse && 'motion-safe:animate-pulse')}
        />
        {/* Label */}
        <span
          style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', lineHeight: 1 }}
        >
          {cfg.label}
        </span>
        {/* Elapsed timestamp */}
        {showTimestamp && elapsed && (
          <span
            style={{ fontSize: 11, opacity: 0.7, fontWeight: 400, lineHeight: 1 }}
          >
            {elapsed}
          </span>
        )}
      </button>

      {/* Error bar - OFFLINE only, expands below pill */}
      {connState === 'OFFLINE' && errorBarOpen && (
        <div
          className="mt-1 flex items-center justify-between gap-2 px-3 py-2 rounded-xl w-64 ffi-glass"
          style={{ borderColor: 'rgba(239,68,68,0.22)' }}
        >
          <p style={{ fontSize: 10, color: '#f87171', lineHeight: 1.4, flex: 1 }}>
            {error ?? 'Sheet unreachable - check share permissions or your connection. Picks entered manually will still save.'}
          </p>
          <div className="flex items-center gap-1 shrink-0">
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: '#fff',
                  padding: '8px 14px',
                  borderRadius: 6,
                  background: 'rgba(239,68,68,0.2)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  minHeight: 44,
                  minWidth: 44,
                }}
              >
                Retry
              </button>
            )}
            <button
              onClick={() => setErrorBarOpen(false)}
              style={{ fontSize: 18, color: '#f87171', lineHeight: 1, minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
