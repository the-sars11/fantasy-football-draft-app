'use client'

/**
 * StrategyStrip (R11b) — the always-reachable strategy display + quick
 * switcher, plus R9's adaptive pivot line, surfaced directly in the draft
 * view instead of buried inside the closed-by-default "More tools" accordion.
 *
 * Switching strategy here reuses the exact same onSelect callback the old
 * buried StrategyPicker used (client.tsx's handleStrategySwap), so every
 * downstream memo that depends on `strategy` (maxBidAdviceMap, the What To
 * Do advice, etc) re-runs exactly as before. Pure composition, no new
 * data fetching, no new solver logic: this is a visibility fix.
 *
 * Copy rule (Joe): plain English, no jargon, and NO em/en dashes anywhere.
 */

import { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'
import { ROOM } from './theme'

export interface StrategyStripProps {
  activeStrategy: DbStrategy | null
  strategies: DbStrategy[]
  onSelect: (strategy: DbStrategy) => void
  /** R9 adaptive-guidance pivot line. Empty string when not applicable. */
  pivot: string
}

export function StrategyStrip({ activeStrategy, strategies, onSelect, pivot }: StrategyStripProps) {
  const [open, setOpen] = useState(false)

  const otherStrategies = strategies.filter(s => s.id !== activeStrategy?.id)

  return (
    <div
      className="overflow-hidden rounded-[10px]"
      style={{ background: ROOM.card, border: `1px solid ${ROOM.border}` }}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
        aria-expanded={open}
        aria-label="Switch strategy"
      >
        <div className="min-w-0 flex-1">
          <div className="text-[8.5px] font-bold uppercase tracking-[2px]" style={{ color: ROOM.t3 }}>
            Strategy
          </div>
          <div className="truncate text-[14px] font-bold" style={{ color: ROOM.t1 }}>
            {activeStrategy?.name ?? 'No strategy set'}
          </div>
        </div>
        {strategies.length > 1 && (
          <ChevronDown
            className="h-4 w-4 shrink-0 transition-transform"
            style={{ color: ROOM.t3, transform: open ? 'rotate(180deg)' : undefined }}
          />
        )}
      </button>

      {pivot && (
        <div
          className="mx-2.5 mb-2.5 rounded-lg px-2.5 py-1.5 text-[11.5px] leading-snug"
          style={{ background: ROOM.gold10, border: `1px solid ${ROOM.gold25}`, color: ROOM.t1 }}
        >
          {pivot}
        </div>
      )}

      {open && otherStrategies.length > 0 && (
        <div className="border-t px-1.5 py-1.5" style={{ borderColor: ROOM.border2 }}>
          {otherStrategies.map(s => (
            <button
              key={s.id}
              onClick={() => {
                onSelect(s)
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors"
              style={{ color: ROOM.t2 }}
            >
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{s.name}</span>
            </button>
          ))}
        </div>
      )}

      {open && activeStrategy && (
        <div
          className={cn('flex items-center gap-1.5 px-3 pb-2.5 text-[10.5px]')}
          style={{ color: ROOM.t3 }}
        >
          <Check className="h-3 w-3" style={{ color: ROOM.gold }} />
          <span>{activeStrategy.name} is active</span>
        </div>
      )}
    </div>
  )
}
