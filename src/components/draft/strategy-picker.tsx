'use client'

/**
 * StrategyPicker (extracted from live/client.tsx, finding 9)
 *
 * Dropdown for swapping the active draft strategy during a live draft.
 * Presentational only - state and selection handling live in the parent.
 */

import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

export function StrategyPicker({
  strategies,
  activeStrategy,
  onSelect,
}: {
  strategies: DbStrategy[]
  activeStrategy: DbStrategy | null
  onSelect: (strategy: DbStrategy) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  if (strategies.length <= 1) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full ffi-card-interactive flex items-center justify-between gap-2 px-3 py-2"
      >
        <div>
          <div className="ffi-caption text-[var(--ffi-text-muted)]">ACTIVE STRATEGY</div>
          <div className="ffi-title-md text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--ffi-primary)]" />
            {activeStrategy?.name ?? 'None Selected'}
          </div>
        </div>
        <ChevronDown className={cn(
          'h-5 w-5 text-[var(--ffi-text-muted)] transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 ffi-card-elevated max-h-64 overflow-auto">
          {strategies.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onSelect(s)
                setIsOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-2 transition-colors',
                s.id === activeStrategy?.id
                  ? 'bg-[var(--ffi-primary)]/10 text-[var(--ffi-primary)]'
                  : 'hover:bg-[var(--ffi-surface)] text-white'
              )}
            >
              <div className="ffi-body-md font-medium">{s.name}</div>
              {s.description && (
                <div className="ffi-body-md text-[var(--ffi-text-muted)] truncate">
                  {s.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
