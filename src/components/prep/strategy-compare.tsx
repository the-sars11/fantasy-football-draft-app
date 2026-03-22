'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, TrendingUp, TrendingDown, Target, ShieldAlert } from 'lucide-react'
import type { StrategyProposal } from '@/lib/research/strategy/research'

interface StrategyCompareProps {
  proposals: StrategyProposal[]
  format: 'auction' | 'snake'
  onClose: () => void
  onSelect?: (proposal: StrategyProposal) => void
}

const RISK_COLORS = {
  conservative: 'text-blue-500',
  balanced: 'text-yellow-500',
  aggressive: 'text-red-500',
} as const

const POS_KEYS = ['QB', 'RB', 'WR', 'TE'] as const

export function StrategyCompare({ proposals, format, onClose, onSelect }: StrategyCompareProps) {
  // Allow selecting up to 3 for comparison
  const [selected, setSelected] = useState<number[]>(
    proposals.length <= 3 ? proposals.map((_, i) => i) : [0, 1]
  )

  const toggle = (idx: number) => {
    if (selected.includes(idx)) {
      if (selected.length > 2) setSelected(selected.filter((i) => i !== idx))
    } else if (selected.length < 3) {
      setSelected([...selected, idx])
    }
  }

  const compared = selected.map((i) => proposals[i])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Compare Strategies</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4 mr-1" />
          Close
        </Button>
      </div>

      {/* Strategy selector pills */}
      <div className="flex flex-wrap gap-2">
        {proposals.map((p, idx) => (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              selected.includes(idx)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            {p.name}
          </button>
        ))}
        <span className="self-center text-xs text-muted-foreground">Select 2-3 to compare</span>
      </div>

      {/* Comparison grid — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[600px]">
          {/* Strategy headers */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(${compared.length}, 1fr)` }}>
            <div />
            {compared.map((p, i) => (
              <Card key={i} size="sm" className="text-center">
                <CardContent className="py-2 px-3">
                  <div className="font-semibold text-sm">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.archetype}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Risk tolerance */}
          <CompareRow label="Risk" compared={compared}>
            {(p) => (
              <span className={`text-sm font-medium capitalize ${RISK_COLORS[p.risk_tolerance]}`}>
                {p.risk_tolerance}
              </span>
            )}
          </CompareRow>

          {/* Confidence */}
          <CompareRow label="Confidence" compared={compared}>
            {(p) => (
              <Badge variant="secondary" className="text-xs">
                {p.confidence}
              </Badge>
            )}
          </CompareRow>

          {/* Floor / Ceiling */}
          <CompareRow label="Floor / Ceiling" compared={compared}>
            {(p) => (
              <div className="flex items-center gap-2 text-xs">
                <TrendingDown className="h-3 w-3 text-muted-foreground" />
                <span>{p.projected_floor}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden relative">
                  <div
                    className="absolute h-full bg-primary/40 rounded-full"
                    style={{
                      left: `${p.projected_floor}%`,
                      width: `${p.projected_ceiling - p.projected_floor}%`,
                    }}
                  />
                </div>
                <span>{p.projected_ceiling}</span>
                <TrendingUp className="h-3 w-3 text-muted-foreground" />
              </div>
            )}
          </CompareRow>

          {/* Position weights */}
          {POS_KEYS.map((pos) => (
            <CompareRow key={pos} label={pos} compared={compared}>
              {(p) => {
                const weight = (p.position_weights[pos] as number) ?? 5
                const isMax = compared.every(
                  (other) => ((other.position_weights[pos] as number) ?? 5) <= weight
                )
                return (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isMax && compared.length > 1 ? 'bg-primary' : 'bg-primary/50'}`}
                        style={{ width: `${weight * 10}%` }}
                      />
                    </div>
                    <span className={`text-xs tabular-nums ${isMax && compared.length > 1 ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {weight}
                    </span>
                  </div>
                )
              }}
            </CompareRow>
          ))}

          {/* Format-specific: budget allocation or round targets */}
          {format === 'auction' && (
            <>
              <CompareRow label="Max Bid %" compared={compared}>
                {(p) => (
                  <span className="text-sm tabular-nums">{p.max_bid_percentage ?? '-'}%</span>
                )}
              </CompareRow>
              {POS_KEYS.map((pos) => (
                <CompareRow key={`budget-${pos}`} label={`${pos} Budget`} compared={compared}>
                  {(p) => {
                    const pct = p.budget_allocation?.[pos] ?? 0
                    const isMax = compared.every(
                      (other) => (other.budget_allocation?.[pos] ?? 0) <= pct
                    )
                    return (
                      <span className={`text-xs tabular-nums ${isMax && compared.length > 1 ? 'font-semibold' : 'text-muted-foreground'}`}>
                        {pct}%
                      </span>
                    )
                  }}
                </CompareRow>
              ))}
            </>
          )}

          {format === 'snake' && (
            POS_KEYS.map((pos) => (
              <CompareRow key={`round-${pos}`} label={`${pos} Rounds`} compared={compared}>
                {(p) => {
                  const rounds = p.round_targets?.[pos] as number[] | undefined
                  return (
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {rounds?.length ? rounds.join(', ') : '-'}
                    </span>
                  )
                }}
              </CompareRow>
            ))
          )}

          {/* Key targets — highlight shared vs unique */}
          <div className="mt-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Key Targets
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(${compared.length}, 1fr)` }}>
              <div />
              {compared.map((p, i) => (
                <div key={i} className="flex flex-wrap gap-1">
                  {p.key_targets.map((name) => {
                    const shared = compared.filter((o) => o.key_targets.includes(name)).length > 1
                    return (
                      <Badge
                        key={name}
                        variant={shared ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {name}
                      </Badge>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Key avoids */}
          <div className="mt-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" />
              Key Avoids
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(${compared.length}, 1fr)` }}>
              <div />
              {compared.map((p, i) => (
                <div key={i} className="flex flex-wrap gap-1">
                  {p.key_avoids.map((name) => (
                    <Badge key={name} variant="outline" className="text-xs text-red-500 border-red-500/30">
                      {name}
                    </Badge>
                  ))}
                  {p.key_avoids.length === 0 && (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Select buttons */}
          {onSelect && (
            <div className="grid gap-3 mt-4" style={{ gridTemplateColumns: `160px repeat(${compared.length}, 1fr)` }}>
              <div />
              {compared.map((p, i) => (
                <Button key={i} variant="outline" size="sm" onClick={() => onSelect(p)} className="w-full">
                  Use this
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Reusable comparison row */
function CompareRow({
  label,
  compared,
  children,
}: {
  label: string
  compared: StrategyProposal[]
  children: (proposal: StrategyProposal) => React.ReactNode
}) {
  return (
    <div
      className="grid gap-3 items-center py-2 border-b border-border/50"
      style={{ gridTemplateColumns: `160px repeat(${compared.length}, 1fr)` }}
    >
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      {compared.map((p, i) => (
        <div key={i}>{children(p)}</div>
      ))}
    </div>
  )
}
