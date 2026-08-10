'use client'

import { useMemo } from 'react'
import { ArrowUp, ArrowDown, TrendingUp, Minus } from 'lucide-react'
import { scorePlayersWithStrategy } from '@/lib/research/strategy/scoring'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { Player, DraftFormat } from '@/lib/players/types'
import type { Strategy } from '@/lib/supabase/database.types'

interface ValueChange {
  player: Player
  before: number
  after: number
  delta: number
  deltaPct: number
  metric: string // e.g. "$47 → $52" or "Rd 3 → Rd 2"
}

interface StrategyValuePreviewProps {
  players: Player[]
  originalStrategy: Strategy
  editedStrategy: Strategy
  format: DraftFormat
  leagueBudget?: number
}

const MAX_CHANGES = 5

export function StrategyValuePreview({
  players,
  originalStrategy,
  editedStrategy,
  format,
  leagueBudget,
}: StrategyValuePreviewProps) {
  const changes = useMemo(() => {
    if (players.length === 0) return []

    const originalScored = scorePlayersWithStrategy(players, originalStrategy, format, leagueBudget)
    const editedScored = scorePlayersWithStrategy(players, editedStrategy, format, leagueBudget)

    // Build lookup by player id
    const originalMap = new Map<string, ScoredPlayer>()
    for (const sp of originalScored) {
      originalMap.set(sp.player.id, sp)
    }

    const valueChanges: ValueChange[] = []

    for (const edited of editedScored) {
      const original = originalMap.get(edited.player.id)
      if (!original) continue

      if (format === 'auction') {
        const before = original.adjustedAuctionValue ?? original.player.consensusAuctionValue
        const after = edited.adjustedAuctionValue ?? edited.player.consensusAuctionValue
        if (before === after) continue
        const delta = after - before
        valueChanges.push({
          player: edited.player,
          before,
          after,
          delta,
          deltaPct: before > 0 ? (delta / before) * 100 : 0,
          metric: `$${before} → $${after}`,
        })
      } else {
        // Snake: compare strategy scores (higher = more desirable)
        const before = original.strategyScore
        const after = edited.strategyScore
        if (before === after) continue
        const delta = after - before
        valueChanges.push({
          player: edited.player,
          before,
          after,
          delta,
          deltaPct: before > 0 ? (delta / before) * 100 : 0,
          metric: `${before} → ${after} pts`,
        })
      }
    }

    // Sort by absolute delta descending, take top N
    valueChanges.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    return valueChanges.slice(0, MAX_CHANGES)
  }, [players, originalStrategy, editedStrategy, format, leagueBudget])

  if (players.length === 0) {
    return (
      <div className="rounded-md p-3" style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--ffi-ink-2)' }}>
          No player data loaded. Import players to see value shifts.
        </p>
      </div>
    )
  }

  if (changes.length === 0) {
    return (
      <div className="rounded-md p-3" style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ffi-ink-2)' }}>
          <Minus className="h-3.5 w-3.5" />
          No value changes yet - adjust filters above
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md p-3 space-y-2" style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}>
      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: 'var(--ffi-ink-2)' }}>
        <TrendingUp className="h-3.5 w-3.5" />
        Top value shifts
      </div>
      <div className="space-y-1.5">
        {changes.map((c) => (
          <ValueChangeRow key={c.player.id} change={c} format={format} />
        ))}
      </div>
    </div>
  )
}

function ValueChangeRow({ change, format }: { change: ValueChange; format: DraftFormat }) {
  const isPositive = change.delta > 0
  // For auction: positive delta = value went up (good for targets)
  // For snake: positive delta = score went up (more desirable)
  const color = isPositive ? 'var(--ffi-volt)' : 'var(--ffi-danger)'
  const Icon = isPositive ? ArrowUp : ArrowDown

  const deltaLabel = format === 'auction'
    ? `${isPositive ? '+' : ''}$${change.delta}`
    : `${isPositive ? '+' : ''}${change.delta}`

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
      <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--ffi-ink)' }}>{change.player.name}</span>
      <span className="ffi-badge text-[10px] px-1.5 shrink-0" style={{ background: 'var(--ffi-surface-2)', color: 'var(--ffi-ink-2)' }}>
        {change.player.position}
      </span>
      <span className="text-xs tabular-nums shrink-0" style={{ color: 'var(--ffi-ink-2)' }}>
        {change.metric}
      </span>
      <span className="text-xs font-medium tabular-nums shrink-0" style={{ color }}>
        {deltaLabel}
      </span>
    </div>
  )
}
