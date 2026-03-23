'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useDrag } from '@use-gesture/react'
import { cn } from '@/lib/utils'

// Main sections for carousel navigation
const sections = [
  { href: '/prep', label: 'Home' },
  { href: '/draft', label: 'Draft' },
  { href: '/settings', label: 'Settings' },
]

interface SwipeCarouselProps {
  children: React.ReactNode
}

export function SwipeCarousel({ children }: SwipeCarouselProps) {
  const router = useRouter()
  const pathname = usePathname()
  const containerRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const [isDragging, setIsDragging] = useState(false)

  // Find current section index
  const currentIndex = sections.findIndex(s => pathname.startsWith(s.href))
  const activeIndex = currentIndex === -1 ? 0 : currentIndex

  // Rubber-band resistance factor
  const rubberBand = (offset: number, limit: number) => {
    const c = 0.55 // Resistance coefficient
    const d = limit
    const x = Math.abs(offset)
    return Math.sign(offset) * (d * (1 - Math.exp(-x / d / c)))
  }

  // Calculate opacity for edge indicator (shows when near edge)
  const edgeOpacity = useTransform(x, [-100, -30, 0, 30, 100], [0.4, 0.1, 0, 0.1, 0.4])

  const bind = useDrag(
    ({ active, movement: [mx], velocity: [vx], direction: [dx], cancel }) => {
      setIsDragging(active)

      if (active) {
        // Apply rubber-band resistance at edges
        const isAtStart = activeIndex === 0 && mx > 0
        const isAtEnd = activeIndex === sections.length - 1 && mx < 0

        if (isAtStart || isAtEnd) {
          x.set(rubberBand(mx, 100))
        } else {
          x.set(mx)
        }
      } else {
        // On release, check if we should navigate
        const threshold = 80 // minimum px to trigger navigation
        const velocityThreshold = 0.5 // minimum velocity to trigger

        const shouldNavigate = Math.abs(mx) > threshold || Math.abs(vx) > velocityThreshold

        if (shouldNavigate) {
          if (mx > 0 && activeIndex > 0) {
            // Swipe right - go to previous section
            router.push(sections[activeIndex - 1].href)
          } else if (mx < 0 && activeIndex < sections.length - 1) {
            // Swipe left - go to next section
            router.push(sections[activeIndex + 1].href)
          }
        }

        // Animate back to center
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
      rubberband: false,
    }
  )

  // Reset position when route changes
  useEffect(() => {
    x.set(0)
  }, [pathname, x])

  // Transform for subtle parallax effect on content
  const contentX = useTransform(x, v => v * 0.3)

  return (
    <div ref={containerRef} className="relative h-full overflow-hidden touch-pan-y">
      {/* Edge indicators */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[var(--ffi-accent)]/20 to-transparent z-10 pointer-events-none"
        style={{ opacity: activeIndex > 0 ? edgeOpacity : 0 }}
      />
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[var(--ffi-accent)]/20 to-transparent z-10 pointer-events-none"
        style={{ opacity: activeIndex < sections.length - 1 ? edgeOpacity : 0 }}
      />

      {/* Main content with drag handling */}
      <motion.div
        style={{ x: contentX }}
        className={cn(
          'h-full',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        <div {...bind()} className="h-full">
          {children}
        </div>
      </motion.div>

      {/* Dot indicators - fixed at bottom, above tab bar */}
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2 z-20 md:hidden">
        {sections.map((section, index) => (
          <motion.button
            key={section.href}
            onClick={() => router.push(section.href)}
            className={cn(
              'w-2 h-2 rounded-full transition-colors',
              index === activeIndex
                ? 'bg-[var(--ffi-accent)]'
                : 'bg-[var(--ffi-text-muted)]/40'
            )}
            animate={{
              scale: index === activeIndex ? 1.2 : 1,
            }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            aria-label={`Go to ${section.label}`}
          />
        ))}
      </div>
    </div>
  )
}

/* ========================================
   Edge Swipe Back — iOS-style back gesture
   ======================================== */

interface EdgeSwipeBackProps {
  children: React.ReactNode
  onBack?: () => void
}

export function EdgeSwipeBack({ children, onBack }: EdgeSwipeBackProps) {
  const router = useRouter()
  const x = useMotionValue(0)
  const [isEdgeDragging, setIsEdgeDragging] = useState(false)

  // Preview offset for the "peek" effect
  const previewX = useTransform(x, [0, 100], [0, 50])
  const shadowOpacity = useTransform(x, [0, 100], [0, 0.3])

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }, [router, onBack])

  const bind = useDrag(
    ({ active, xy: [px], movement: [mx], velocity: [vx], first }) => {
      // Only trigger from left edge (first 20px)
      if (first && px > 20) {
        return
      }

      setIsEdgeDragging(active && mx > 0)

      if (active && mx > 0) {
        x.set(Math.min(mx, 150))
      } else {
        if (mx > 100 || vx > 0.5) {
          handleBack()
        }
        animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
        setIsEdgeDragging(false)
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
    }
  )

  return (
    <div className="relative h-full">
      <div {...bind()} className="h-full">
        {/* Shadow overlay during swipe */}
        <motion.div
          className="absolute inset-0 bg-black pointer-events-none z-10"
          style={{ opacity: shadowOpacity }}
        />

        {/* Content with peek effect */}
        <motion.div style={{ x: previewX }} className="h-full">
          {children}
        </motion.div>

        {/* Left edge indicator during drag */}
        {isEdgeDragging && (
          <motion.div
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-20 rounded-full bg-[var(--ffi-accent)] z-20"
            initial={{ opacity: 0, scaleY: 0 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0 }}
          />
        )}
      </div>
    </div>
  )
}
