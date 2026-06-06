import type { Transition, Variants } from 'framer-motion'

// ================================================================
// GRIDIRON Motion System — UXV2-2b
// Framer Motion transition + variant presets matching the 4 CSS curves.
// ================================================================

export const transitions = {
  spring: {
    type: 'spring',
    stiffness: 420,
    damping: 30,
    mass: 0.8,
  } satisfies Transition,

  springFast: {
    type: 'spring',
    stiffness: 520,
    damping: 36,
    mass: 0.6,
  } satisfies Transition,

  broadcast: {
    type: 'tween',
    duration: 0.48,
    ease: [0.22, 1, 0.36, 1],
  } satisfies Transition,

  standard: {
    type: 'tween',
    duration: 0.2,
    ease: [0.25, 0.46, 0.45, 0.94],
  } satisfies Transition,

  swift: {
    type: 'tween',
    duration: 0.1,
    ease: [0.4, 0, 0.2, 1],
  } satisfies Transition,
}

// On-the-clock card entrance: spring in from below with slight scale
export const otcVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: transitions.spring,
  },
  exit: {
    opacity: 0,
    y: -12,
    scale: 0.97,
    transition: transitions.standard,
  },
}

// OTC badge delayed reveal (stacks on top of the card entrance)
export const otcBadgeVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { ...transitions.spring, delay: 0.18 },
  },
  exit: { opacity: 0, scale: 0.8, transition: transitions.swift },
}

// Lower-third: pick lands wipe from bottom (broadcast curve)
export const lowerThirdVariants: Variants = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: transitions.broadcast },
  exit: { y: '100%', transition: transitions.standard },
}

// List cascade: staggered children (parent controls timing)
export const cascadeContainerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.048,
      delayChildren: 0.02,
    },
  },
  exit: {},
}

export const cascadeItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.spring,
  },
  exit: { opacity: 0, y: -6, transition: transitions.swift },
}

// Filter pill: Framer Motion layoutId handles the spring slide automatically
// — no explicit variant needed; just wrap the indicator with motion.div + layoutId

// General fade-in (route transitions, modal overlays)
export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transitions.standard },
  exit: { opacity: 0, transition: transitions.swift },
}
