'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { cascadeContainerVariants, cascadeItemVariants } from '@/lib/motion'
import { cn } from '@/lib/utils'

interface CascadeListProps {
  /** Change this key to re-trigger the cascade (e.g. on filter change) */
  listKey: string | number
  children: React.ReactNode[]
  className?: string
  gap?: number
}

/**
 * Renders a list where each child springs in with a 48ms stagger.
 * Pass a new `listKey` when the filter changes to replay the cascade.
 * Children must be indexable (array).
 */
export function CascadeList({ listKey, children, className, gap = 6 }: CascadeListProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={listKey}
        variants={cascadeContainerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className={cn('flex flex-col', className)}
        style={{ gap }}
      >
        {children.map((child, i) => (
          <motion.div key={i} variants={cascadeItemVariants}>
            {child}
          </motion.div>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}
