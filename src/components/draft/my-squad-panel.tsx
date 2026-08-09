'use client'

/**
 * MySquadPanel (extracted from live/client.tsx, finding 9)
 *
 * Your-squad summary for the snake dashboard: budget bar (auction), position
 * needs, and recent squad picks. Presentational only.
 */

import { Target } from 'lucide-react'
import { FFICard, FFIBadge, FFIProgress } from '@/components/ui/ffi-primitives'
import type { RosterSlots } from '@/lib/supabase/database.types'

export function MySquadPanel({
  picks,
  budget,
  maxBid,
  needs,
  format,
  rosterSlots,
}: {
  picks: Array<{ player_name: string; position?: string; price?: number }>
  budget: number | null
  maxBid: number | null
  needs: Record<string, number>
  format: 'auction' | 'snake'
  rosterSlots: RosterSlots
}) {
  const isAuction = format === 'auction'
  const totalSlots = Object.values(rosterSlots).reduce((a, b) => a + b, 0)
  const filledSlots = picks.length

  return (
    <FFICard variant="elevated">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--ffi-primary)]" />
          <span className="ffi-label text-[var(--ffi-text-secondary)]">YOUR SQUAD</span>
        </div>
        <span className="ffi-label text-[var(--ffi-text-muted)]">
          {filledSlots}/{totalSlots}
        </span>
      </div>

      {/* Budget bar for auction */}
      {isAuction && budget != null && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="ffi-body-md text-[var(--ffi-text-secondary)]">Budget</span>
            <span className="ffi-title-md text-[var(--ffi-primary)] font-mono">${budget}</span>
          </div>
          <FFIProgress value={(budget / (budget + 100)) * 100} status="elite" />
          {maxBid != null && (
            <span className="ffi-caption text-[var(--ffi-text-muted)]">
              Max bid: ${maxBid}
            </span>
          )}
        </div>
      )}

      {/* Position needs */}
      <div className="mb-3">
        <span className="ffi-caption text-[var(--ffi-text-muted)]">NEEDS</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {Object.entries(needs).map(([pos, count]) => (
            <FFIBadge key={pos} status="info" className="text-[10px]">
              {pos} ×{count}
            </FFIBadge>
          ))}
          {Object.keys(needs).length === 0 && (
            <span className="ffi-body-md text-[var(--value-green)]">Roster complete!</span>
          )}
        </div>
      </div>

      {/* Recent squad picks */}
      {picks.length > 0 && (
        <div className="space-y-1 border-t border-white/[0.06] pt-3">
          {picks.slice(-5).reverse().map((pick, idx) => (
            <div key={idx} className="flex items-center gap-2 text-sm">
              {pick.position && (
                <span className="ffi-caption text-[var(--ffi-text-muted)] w-8">
                  {pick.position}
                </span>
              )}
              <span className="ffi-body-md text-white flex-1 truncate">
                {pick.player_name}
              </span>
              {isAuction && pick.price != null && (
                <span className="ffi-label text-[var(--ffi-text-secondary)] font-mono">
                  ${pick.price}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </FFICard>
  )
}
