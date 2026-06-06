'use client'

import { motion, LayoutGroup } from 'framer-motion'
import { cn } from '@/lib/utils'
import { transitions } from '@/lib/motion'

export interface PillOption<T extends string = string> {
  label: string
  value: T
}

interface FilterPillBarProps<T extends string> {
  options: PillOption<T>[]
  value: T
  onChange: (v: T) => void
  /** Unique id per pill bar instance on the page — needed for Framer layoutId */
  layoutId?: string
  className?: string
}

/**
 * Filter pill bar with a spring-sliding active indicator.
 * Framer Motion layoutId handles the smooth slide when the active pill changes.
 */
export function FilterPillBar<T extends string>({
  options,
  value,
  onChange,
  layoutId = 'pill-bar',
  className,
}: FilterPillBarProps<T>) {
  return (
    <LayoutGroup id={layoutId}>
      <div className={cn('ffi-pill-bar', className)}>
        {options.map(opt => {
          const active = opt.value === value
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={cn('ffi-pill-item', active && 'active')}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {active && (
                <motion.span
                  layoutId={`${layoutId}-indicator`}
                  className="ffi-pill-indicator"
                  style={{ position: 'absolute', inset: 0 }}
                  transition={transitions.spring}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </LayoutGroup>
  )
}
