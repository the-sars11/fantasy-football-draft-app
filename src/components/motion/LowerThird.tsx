'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { lowerThirdVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface LowerThirdProps {
  /** Unique key — change per pick to re-trigger the wipe animation */
  pickKey: string | number | null
  children: React.ReactNode
  className?: string
}

/**
 * Pick-lands lower-third wipe.
 * Slides up from below (broadcast curve, 480ms) with a light sheen sweep.
 * Use in the live auction room when a sale is recorded.
 */
export function LowerThird({ pickKey, children, className }: LowerThirdProps) {
  return (
    <div className="relative overflow-hidden">
      <AnimatePresence>
        {pickKey != null && (
          <motion.div
            key={pickKey}
            variants={lowerThirdVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              'relative overflow-hidden',
              'flex items-center justify-between px-4 py-3',
              'rounded-xl',
              'bg-gradient-to-r from-[rgba(77,130,255,0.16)] to-[rgba(139,255,69,0.06)]',
              'border-t border-[rgba(139,255,69,0.22)]',
              className,
            )}
          >
            {/* light sheen sweep on entry */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 40%, transparent 80%)',
                animation: 'ffi-sheen-sweep 0.7s ease-out 0.1s both',
              }}
            />
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
