'use client'

/**
 * PickLowerThird (Sunday Night Gridiron)
 *
 * Broadcast "lower third" for the most recent pick. Wipes in from the left like a TV
 * name-strip with a one-shot sheen (gold for your pick, cyan for everyone else). The
 * parent keys this on pick_number so it re-animates on each pick. Fixed wrapper height
 * means the feed never shifts as picks land.
 */

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { FFIPositionBadge } from '@/components/ui/ffi-primitives'
import type { Position } from '@/lib/players/types'

interface LatestPick {
  pick_number: number
  player_name: string
  manager: string
  position?: string
  price?: number
  is_keeper?: boolean
}

export function PickLowerThird({
  pick,
  format,
  isMyPick,
}: {
  pick: LatestPick | null
  format: 'auction' | 'snake'
  isMyPick: boolean
}) {
  const isAuction = format === 'auction'

  return (
    <div className="min-h-[3.25rem] mb-3">
      {pick ? (
        <motion.div
          key={pick.pick_number}
          initial={{ opacity: 0, x: -28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.34 }}
          className={cn(
            'ffi-lower-third flex items-center gap-2.5 rounded-xl px-3 py-2.5 border-l-[3px]',
            isMyPick
              ? 'border-l-[var(--ffi-gold)] bg-[var(--ffi-gold)]/8'
              : 'ffi-lower-third-live border-l-[var(--ffi-live)] bg-[var(--ffi-live-dim)]',
          )}
        >
          <span className="ffi-caption text-[var(--ffi-text-muted)] w-7 text-right tabular-nums shrink-0">
            {pick.pick_number}
          </span>
          {pick.position && (
            <FFIPositionBadge position={pick.position.toUpperCase() as Position} />
          )}
          <span
            className={cn(
              'font-display font-bold tracking-tight text-base leading-none flex-1 truncate',
              isMyPick ? 'text-[var(--ffi-gold-bright)]' : 'text-white',
            )}
          >
            {pick.player_name}
          </span>
          <span className="ffi-caption text-[var(--ffi-text-secondary)] truncate max-w-[6rem] shrink-0">
            {pick.manager}
          </span>
          {isAuction && pick.price != null && (
            <span
              className={cn(
                'font-mono font-bold tabular-nums shrink-0',
                isMyPick ? 'text-[var(--ffi-gold)]' : 'text-[var(--ffi-live)]',
              )}
            >
              ${pick.price}
            </span>
          )}
        </motion.div>
      ) : (
        <div className="flex h-[3.25rem] items-center gap-2 rounded-xl px-3 ffi-ghost-border">
          <span className="ffi-label text-[var(--ffi-text-muted)]">Waiting for first pick</span>
        </div>
      )}
    </div>
  )
}
