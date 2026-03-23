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

const slideVariants: Record<NavDirection, Variants> = {
  left: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-30%', opacity: 0 },
  },
  right: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '30%', opacity: 0 },
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

  return (
    <AnimatePresence mode="wait" initial={false}>
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
