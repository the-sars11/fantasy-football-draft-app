'use client'

/**
 * InjuryWatch (FF-277)
 *
 * Draft-day injury status panel for the live draft sidebar.
 * Surfaces undrafted players whose injury status is flagged.
 *
 * Data note: the live draft loads raw CachedPlayer objects from /api/players
 * which have injury_status (snake_case), while the Player type uses injuryStatus
 * (camelCase). The helper below checks both to handle both paths safely.
 */

import { useMemo } from 'react'
import { AlertTriangle, Clock } from 'lucide-react'
import { FFICard } from '@/components/ui/ffi-primitives'
import type { Player } from '@/lib/players/types'

type InjuryLevel = 'OUT' | 'IR' | 'PUP' | 'DOUBTFUL' | 'QUESTIONABLE' | 'SUSPENDED' | 'UNKNOWN'

function getRawStatus(player: Player): string | undefined {
  // Player.injuryStatus (camelCase) is set when players go through cacheToPlayer.
  // In the live draft the players are raw API objects, so check injury_status too.
  return (
    player.injuryStatus ??
    (player as unknown as { injury_status?: string }).injury_status ??
    undefined
  )
}

function parseInjuryLevel(raw: string | undefined): InjuryLevel | null {
  if (!raw) return null
  const upper = raw.toUpperCase().trim()
  if (upper === '' || upper === 'HEALTHY' || upper === 'ACTIVE') return null
  if (upper === 'O' || upper === 'OUT') return 'OUT'
  if (upper === 'IR') return 'IR'
  if (upper === 'PUP') return 'PUP'
  if (upper === 'D' || upper === 'DOUBTFUL') return 'DOUBTFUL'
  if (upper === 'Q' || upper === 'QUESTIONABLE') return 'QUESTIONABLE'
  if (upper === 'SUSPENDED' || upper === 'SUSP') return 'SUSPENDED'
  return 'UNKNOWN'
}

const STATUS_COLORS: Record<InjuryLevel, string> = {
  OUT: 'text-[var(--ffi-danger)] bg-[var(--ffi-danger)]/20 border-[var(--ffi-danger)]/30',
  IR: 'text-[var(--ffi-danger)]/70 bg-[var(--ffi-danger)]/10 border-[var(--ffi-danger)]/20',
  PUP: 'text-[var(--ffi-danger)]/70 bg-[var(--ffi-danger)]/10 border-[var(--ffi-danger)]/20',
  DOUBTFUL: 'text-[#f97316] bg-[#f97316]/15 border-[#f97316]/25',
  QUESTIONABLE: 'text-[var(--ffi-warning)] bg-[var(--ffi-warning)]/15 border-[var(--ffi-warning)]/25',
  SUSPENDED: 'text-[var(--ffi-danger)]/70 bg-[var(--ffi-danger)]/10 border-[var(--ffi-danger)]/20',
  UNKNOWN: 'text-[var(--ffi-text-muted)] bg-[var(--ffi-surface)] border-[var(--ffi-border)]/20',
}

interface InjuryWatchProps {
  players: Player[]
  draftedNames: Set<string>
  refreshedAt?: Date | null
}

export function InjuryWatch({ players, draftedNames, refreshedAt }: InjuryWatchProps) {
  const flagged = useMemo(() => {
    return players
      .filter((p) => {
        if (draftedNames.has(p.name.toLowerCase())) return false
        const level = parseInjuryLevel(getRawStatus(p))
        return level !== null
      })
      .slice(0, 8)
  }, [players, draftedNames])

  const formattedTime = refreshedAt
    ? refreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  if (flagged.length === 0) return null

  return (
    <FFICard>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--ffi-warning)]" />
          <span className="ffi-label text-[var(--ffi-text-secondary)]">INJURY WATCH</span>
          <span className="ffi-caption text-[var(--ffi-danger)] font-bold">
            {flagged.length}
          </span>
        </div>
        {formattedTime && (
          <div className="flex items-center gap-1 ffi-caption text-[var(--ffi-text-muted)]">
            <Clock className="h-3 w-3" />
            {formattedTime}
          </div>
        )}
      </div>

      {/* Player rows */}
      <div className="space-y-1.5">
        {flagged.map((p) => {
          const level = parseInjuryLevel(getRawStatus(p)) ?? 'UNKNOWN'
          const colorClass = STATUS_COLORS[level]

          return (
            <div key={p.id} className="flex items-center gap-2 py-1">
              <span className="ffi-caption font-bold text-[var(--ffi-text-muted)] w-8 uppercase shrink-0">
                {p.position}
              </span>
              <span className="ffi-body-md text-[var(--ffi-text-secondary)] flex-1 truncate">
                {p.name}
              </span>
              <span className="ffi-caption text-[var(--ffi-text-muted)] truncate max-w-[48px] hidden sm:block">
                {p.team}
              </span>
              <span
                className={`px-2 py-0.5 rounded border text-[9px] font-bold tracking-wider shrink-0 ${colorClass}`}
              >
                {level}
              </span>
            </div>
          )
        })}
      </div>
    </FFICard>
  )
}
