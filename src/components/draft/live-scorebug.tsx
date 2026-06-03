'use client'

/**
 * LiveScoreBug (Sunday Night Gridiron)
 *
 * A persistent, glanceable broadcast "score bug" for the live draft. Always visible, it
 * shows the few numbers that matter at arm's length and flashes cyan whenever one changes
 * (zero layout shift). Format-pure: auction shows budget, snake shows round/pick.
 */

import { cn } from '@/lib/utils'
import type { DraftState } from '@/lib/draft/state'

interface ScoreBugItem {
  label: string
  value: string
  /** Changing this remounts the value span, re-firing the cyan flash. */
  flashKey: string | number
}

export function LiveScoreBug({ state, myManager }: { state: DraftState; myManager?: string }) {
  const isAuction = state.format === 'auction'
  const mgr = myManager ? state.managers[myManager] : undefined
  const totalSlots = Object.values(state.roster_slots).reduce((s, v) => s + v, 0)
  const filled = mgr?.picks.length ?? 0

  const items: ScoreBugItem[] = isAuction
    ? [
        { label: 'Budget', value: `$${mgr?.budget_remaining ?? 0}`, flashKey: mgr?.budget_remaining ?? 0 },
        { label: 'Roster', value: `${filled}/${totalSlots}`, flashKey: filled },
        { label: 'Picks', value: String(state.total_picks), flashKey: state.total_picks },
      ]
    : [
        { label: 'Round', value: String(state.current_round ?? '-'), flashKey: state.current_round ?? 0 },
        { label: 'Pick', value: String(state.current_pick_in_round ?? '-'), flashKey: state.current_pick_in_round ?? 0 },
        { label: 'Roster', value: `${filled}/${totalSlots}`, flashKey: filled },
      ]

  return (
    <div className="ffi-scorebug flex items-center gap-4 rounded-xl px-3.5 py-2 overflow-x-auto no-scrollbar">
      {items.map((it, i) => (
        <div
          key={it.label}
          className={cn(
            'flex items-baseline gap-1.5 shrink-0',
            i > 0 && 'pl-4 border-l border-white/[0.06]',
          )}
        >
          <span className="ffi-caption text-[var(--ffi-text-muted)]">{it.label}</span>
          <span
            key={it.flashKey}
            className="ffi-num-flash font-mono font-bold tabular-nums text-base leading-none text-white"
          >
            {it.value}
          </span>
        </div>
      ))}
    </div>
  )
}
