'use client'

/**
 * PickFeed (extracted from live/client.tsx, finding 9)
 *
 * Real-time pick feed for the snake dashboard: broadcast lower-third for the
 * latest pick plus a scrolling history of the previous nine. Presentational only.
 */

import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { FFICard, FFIPositionBadge } from '@/components/ui/ffi-primitives'
import { PickLowerThird } from '@/components/draft/pick-lower-third'
import type { Position } from '@/lib/players/types'

export function PickFeed({
  picks,
  format,
  myManager,
}: {
  picks: Array<{
    pick_number: number
    player_name: string
    manager: string
    position?: string
    price?: number
    is_keeper?: boolean
  }>
  format: 'auction' | 'snake'
  myManager?: string
}) {
  const isAuction = format === 'auction'
  const ordered = [...picks].reverse() // newest first
  const latestPick = ordered[0] ?? null
  const latestIsMine = !!(myManager && latestPick && latestPick.manager === myManager)
  const history = ordered.slice(1, 10) // older picks shown under the hero strip

  return (
    <FFICard className="overflow-hidden">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-[var(--value-green)] animate-pulse" />
        <span className="ffi-label text-[var(--ffi-text-secondary)]">LIVE FEED</span>
        <span className="ffi-caption text-[var(--ffi-text-muted)] ml-auto">
          {picks.length} PICKS
        </span>
      </div>

      {/* Broadcast lower-third: the most recent pick, large, wiping in */}
      <PickLowerThird pick={latestPick} format={format} isMyPick={latestIsMine} />

      {history.length > 0 && (
        <div className="space-y-1 max-h-44 overflow-auto">
          <AnimatePresence mode="popLayout">
            {history.map(pick => {
              const isMyPick = !!(myManager && pick.manager === myManager)
              return (
                <motion.div
                  key={`${pick.manager}-${pick.pick_number}`}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className={cn(
                    'flex items-center gap-2 py-1.5 px-2 rounded-lg transition-colors',
                    isMyPick && 'border-l-2 border-[var(--ffi-gold)] bg-[var(--ffi-gold)]/5',
                  )}
                >
                  <span className="ffi-caption text-[var(--ffi-text-muted)] w-6 text-right tabular-nums">
                    {pick.pick_number}
                  </span>
                  {pick.position && (
                    <FFIPositionBadge position={pick.position.toUpperCase() as Position} />
                  )}
                  <span className={cn(
                    'ffi-body-md font-medium flex-1 truncate',
                    isMyPick ? 'text-[var(--ffi-gold-bright)]' : 'text-white',
                  )}>
                    {pick.player_name}
                  </span>
                  <span className="ffi-body-md text-[var(--ffi-text-secondary)] truncate max-w-20">
                    {pick.manager}
                  </span>
                  {isAuction && pick.price != null && (
                    <span className={cn(
                      'ffi-label font-mono tabular-nums',
                      isMyPick ? 'text-[var(--ffi-gold)]' : 'text-[var(--ffi-text-secondary)]',
                    )}>
                      ${pick.price}
                    </span>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </FFICard>
  )
}
