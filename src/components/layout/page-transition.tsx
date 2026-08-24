'use client'

import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useNavDirection, type NavDirection } from '@/lib/nav-context'
import { type ReactNode } from 'react'

const transitionConfig = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
  mass: 0.8,
}

// IA-0.1: horizontal (left/right) slide variants removed -- they powered the
// swipe-carousel's spring-slide feel, which we killed for clipping scroll on
// mobile prep pages. `left`/`right` directions (still emitted by
// nav-context.tsx's drill-in/out logic) now render as a fade, same as
// `fade`, instead of an x-axis slide.
const slideVariants: Record<NavDirection, Variants> = {
  left: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
  right: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
  up: {
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-30%', opacity: 0 },
  },
  down: {
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '30%', opacity: 0 },
  },
  fade: {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  },
}

interface PageTransitionProps {
  children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const { direction } = useNavDirection()
  const variants = slideVariants[direction]

  // R12 perf: was mode="wait", which serializes the swap (old page's full exit
  // spring finishes before the new page even mounts) -- a real, measurable
  // chunk of blocking time on every page switch. popLayout lets the incoming
  // page mount and animate in while the outgoing page animates out
  // concurrently (matches DESIGN_SYSTEM.md's own "spring cross-fade, never a
  // hard cut" -- mode="wait" was technically a sequential fade, not a
  // crossfade). Exiting elements are pulled out of layout flow immediately
  // (position: absolute) so there's no double-height flash; <main> already
  // has `relative` for that to anchor against.
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transitionConfig}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Wrapper for route group layouts to provide FrozenRouter capability
export function FrozenPageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname()
  const { direction } = useNavDirection()
  const variants = slideVariants[direction]

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transitionConfig}
        style={{ position: 'absolute', inset: 0 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
