"use client"

import * as React from "react"
import { createContext, useContext } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo, LayoutGroup } from "framer-motion"
import { cn } from "@/lib/utils"

/* ========================================
   Shared Element Context — For cross-page morphs
   ======================================== */

interface SharedElementContextValue {
  activeId: string | null
  setActiveId: (id: string | null) => void
}

const SharedElementContext = createContext<SharedElementContextValue>({
  activeId: null,
  setActiveId: () => {},
})

export function SharedElementProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = React.useState<string | null>(null)

  return (
    <SharedElementContext.Provider value={{ activeId, setActiveId }}>
      <LayoutGroup>
        {children}
      </LayoutGroup>
    </SharedElementContext.Provider>
  )
}

export function useSharedElement() {
  return useContext(SharedElementContext)
}

/* ========================================
   Motion Card — Lift on press, spring expand
   ======================================== */

interface FFIMotionCardProps {
  className?: string
  variant?: "default" | "elevated" | "interactive"
  isExpanded?: boolean
  layoutId?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function FFIMotionCard({
  className,
  variant = "default",
  isExpanded,
  layoutId,
  onClick,
  children,
}: FFIMotionCardProps) {
  const variants = {
    default: "ffi-card",
    elevated: "ffi-card-elevated",
    interactive: "ffi-card-interactive",
  }

  return (
    <motion.div
      layoutId={layoutId}
      className={cn(variants[variant], className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      onClick={onClick}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? "expanded" : "collapsed"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}

/* ========================================
   Motion List — Staggered children animation
   ======================================== */

interface FFIMotionListProps {
  className?: string
  staggerDelay?: number
  children?: React.ReactNode
}

export function FFIMotionList({
  className,
  staggerDelay = 0.05,
  children,
}: FFIMotionListProps) {
  const childArray = React.Children.toArray(children)

  return (
    <div className={cn("space-y-3", className)}>
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            delay: index * staggerDelay,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

/* ========================================
   Motion Grid — Cascade load animation
   ======================================== */

interface FFIMotionGridProps {
  className?: string
  columns?: 2 | 3 | 4
  staggerDelay?: number
  children?: React.ReactNode
}

export function FFIMotionGrid({
  className,
  columns = 3,
  staggerDelay = 0.03,
  children,
}: FFIMotionGridProps) {
  const childArray = React.Children.toArray(children)
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  }

  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {childArray.map((child, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            delay: index * staggerDelay,
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  )
}

/* ========================================
   Swipe-to-Dismiss Card — AI Recommendations
   ======================================== */

interface FFISwipeDismissCardProps {
  className?: string
  onDismiss?: () => void
  slideDirection?: "left" | "right"
  children?: React.ReactNode
}

export function FFISwipeDismissCard({
  className,
  onDismiss,
  slideDirection = "right",
  children,
}: FFISwipeDismissCardProps) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 0.5, 1, 0.5, 0])

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100 || Math.abs(info.velocity.x) > 500) {
      onDismiss?.()
    }
  }

  return (
    <motion.div
      className={cn("ffi-card-elevated cursor-grab active:cursor-grabbing", className)}
      initial={{ opacity: 0, x: slideDirection === "right" ? 100 : -100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: slideDirection === "right" ? -200 : 200 }}
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
    >
      {children}
    </motion.div>
  )
}

/* ========================================
   Bounce-In Item — Live Draft Feed Picks
   ======================================== */

interface FFIBounceInProps {
  className?: string
  highlight?: boolean
  delay?: number
  children?: React.ReactNode
}

export function FFIBounceIn({
  className,
  highlight,
  delay = 0,
  children,
}: FFIBounceInProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, scale: 0.3, y: -50 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
      }}
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 25,
        delay,
      }}
    >
      {highlight && (
        <motion.div
          className="absolute inset-0 rounded-lg bg-[var(--ffi-accent)]/20"
          initial={{ opacity: 0.8, scale: 1 }}
          animate={{ opacity: 0, scale: 1.5 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      )}
      {children}
    </motion.div>
  )
}

/* ========================================
   Celebration Animation — Your Pick!
   ======================================== */

interface FFICelebrationProps {
  className?: string
  show: boolean
  children?: React.ReactNode
}

export function FFICelebration({
  className,
  show,
  children,
}: FFICelebrationProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={cn("relative", className)}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: 1,
            scale: [0.5, 1.1, 1],
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 20,
          }}
        >
          {/* Burst rings */}
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-[var(--ffi-accent)]"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-[var(--ffi-accent)]"
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
          />
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ========================================
   Press Scale — Subtle tap feedback
   ======================================== */

interface FFIPressScaleProps {
  className?: string
  scale?: number
  children?: React.ReactNode
  onClick?: () => void
}

export function FFIPressScale({
  className,
  scale = 0.97,
  children,
  onClick,
}: FFIPressScaleProps) {
  return (
    <motion.div
      className={cn(className)}
      whileTap={{ scale }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}

/* ========================================
   Fade In Up — Generic entrance animation
   ======================================== */

interface FFIFadeInUpProps {
  className?: string
  delay?: number
  duration?: number
  children?: React.ReactNode
}

export function FFIFadeInUp({
  className,
  delay = 0,
  duration = 0.4,
  children,
}: FFIFadeInUpProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      {children}
    </motion.div>
  )
}

/* ========================================
   Shared Player Card — Morphs between screens
   ======================================== */

type PositionType = "QB" | "RB" | "WR" | "TE" | "K" | "DEF"

interface SharedPlayerCardProps {
  playerId: string
  rank: number
  name: string
  team: string
  position: PositionType
  bye: number
  value: number
  className?: string
  onClick?: () => void
  variant?: "compact" | "expanded"
  children?: React.ReactNode
}

export function SharedPlayerCard({
  playerId,
  rank,
  name,
  team,
  position,
  bye,
  value,
  className,
  onClick,
  variant = "compact",
  children,
}: SharedPlayerCardProps) {
  const positionColors: Record<PositionType, string> = {
    QB: "text-red-400",
    RB: "text-green-400",
    WR: "text-blue-400",
    TE: "text-orange-400",
    K: "text-purple-400",
    DEF: "text-yellow-400",
  }

  return (
    <motion.div
      layoutId={`player-card-${playerId}`}
      className={cn(
        "ffi-card-interactive cursor-pointer",
        variant === "expanded" && "ffi-card-elevated",
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <motion.span
            layoutId={`player-rank-${playerId}`}
            className="ffi-display-md text-[var(--ffi-accent)] font-bold w-8"
          >
            {String(rank).padStart(2, "0")}
          </motion.span>
          <div>
            <motion.h4
              layoutId={`player-name-${playerId}`}
              className="ffi-title-lg text-white"
            >
              {name}
            </motion.h4>
            <motion.p
              layoutId={`player-meta-${playerId}`}
              className="ffi-body-md text-[var(--ffi-text-secondary)]"
            >
              {team} • <span className={positionColors[position]}>{position}</span> • BYE {bye}
            </motion.p>
          </div>
        </div>
        <motion.div
          layoutId={`player-value-${playerId}`}
          className="text-right"
        >
          <span className="ffi-display-md text-[var(--ffi-accent)] font-bold">${value}</span>
        </motion.div>
      </div>

      {/* Expanded content with AnimatePresence */}
      <AnimatePresence>
        {variant === "expanded" && children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-[var(--ffi-border)]/20">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
