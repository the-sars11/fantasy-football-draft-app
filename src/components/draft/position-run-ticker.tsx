'use client'

/**
 * PositionRunTicker (Sunday Night Gridiron)
 *
 * Broadcast insight ticker: when a position run is happening (3+ of one position across
 * recent picks), a compact cyan strip slides in. Format-pure by construction: it shows
 * only a position and a count, never dollars (auction) or rounds (snake).
 */

import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import type { PositionRun } from '@/lib/draft/flow-monitor'

export function PositionRunTicker({ runs }: { runs: PositionRun[] }) {
  // Surface the most significant run (highest count).
  const top = runs.length > 0 ? [...runs].sort((a, b) => b.count - a.count)[0] : null

  return (
    <AnimatePresence>
      {top && (
        <motion.div
          key={`${top.position}-${top.count}`}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ type: 'tween', ease: [0.22, 1, 0.36, 1], duration: 0.3 }}
          className="ffi-ticker flex items-center gap-2 rounded-xl px-3 py-2"
          role="status"
          aria-live="polite"
        >
          <TrendingUp className="h-3.5 w-3.5 text-[var(--ffi-live)] shrink-0" aria-hidden="true" />
          <span className="ffi-label text-[var(--ffi-live)] shrink-0">{top.position} run</span>
          <span className="ffi-body-md text-white truncate">
            {top.count} straight picks at {top.position}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
