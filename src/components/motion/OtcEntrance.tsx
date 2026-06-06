'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { otcVariants, otcBadgeVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface OtcEntranceProps {
  /** Unique key — change this when a new player goes on the block to trigger re-entrance */
  blockKey: string | number | null
  children: React.ReactNode
  className?: string
  /** When true, applies the breathing volt glow (CSS animation) */
  isOnBlock?: boolean
}

/**
 * Wraps the on-the-clock hero card with the spring entrance + exit.
 * Pass a new `blockKey` each time a player goes on the block to replay the animation.
 */
export function OtcEntrance({ blockKey, children, className, isOnBlock }: OtcEntranceProps) {
  return (
    <AnimatePresence mode="wait">
      {blockKey != null && (
        <motion.div
          key={blockKey}
          variants={otcVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={cn(isOnBlock && 'ffi-otc-on-block', className)}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

interface OtcBadgeProps {
  visible: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Delayed spring reveal for the "On the Block" badge.
 * Place inside OtcEntrance — it layers on 180ms after the card springs in.
 */
export function OtcBadge({ visible, children, className }: OtcBadgeProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          variants={otcBadgeVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
