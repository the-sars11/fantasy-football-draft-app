'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface StealFlashProps {
  /** Increment this to fire the burst (tie to a pick counter or sale event) */
  trigger: number
  children: React.ReactNode
  className?: string
  /** Text displayed in the floating banner (e.g. "STEAL" or "VALUE") */
  bannerText?: string
}

/**
 * Wraps a player card with the volt steal-burst animation.
 * When `trigger` changes, fires: card volt ring flash + floating Anton banner pop.
 * Animation is 600ms total; cooldown prevents double-fire.
 */
export function StealFlash({ trigger, children, className, bannerText = 'STEAL' }: StealFlashProps) {
  const [firing, setFiring] = useState(false)
  const cooldownRef = useRef(false)
  const prevTrigger = useRef(trigger)

  useEffect(() => {
    if (trigger === prevTrigger.current) return
    prevTrigger.current = trigger

    if (cooldownRef.current) return
    cooldownRef.current = true
    // BUG-R13-06: intentional. An external `trigger` prop change must start the
    // timed burst; there is no event handler in this component to hang it on, so
    // an effect + setState is the correct tool. The single extra render is the
    // animation starting, not a wasted pass.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFiring(true)

    setTimeout(() => {
      setFiring(false)
      cooldownRef.current = false
    }, 800)
  }, [trigger])

  return (
    <div className={cn('ffi-steal-card', firing && 'is-steal', className)}>
      <div className={cn('ffi-steal-banner', firing && 'fire')}>{bannerText}</div>
      {children}
    </div>
  )
}
