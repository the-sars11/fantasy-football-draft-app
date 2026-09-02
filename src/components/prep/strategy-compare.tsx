'use client'

import { useState } from 'react'
import { X, TrendingUp, TrendingDown, Target, ShieldAlert } from 'lucide-react'
import type { StrategyProposal } from '@/lib/research/strategy/research'

interface StrategyCompareProps {
  proposals: StrategyProposal[]
  format: 'auction' | 'snake'
  onClose: () => void
  onSelect?: (proposal: StrategyProposal) => void
}

const RISK_COLORS = {
  conservative: 'var(--ffi-blue-bright)',
  balanced: '#ffb05c',
  aggressive: 'var(--ffi-danger)',
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
        <h3 className="ffi-title-chrome text-xl">Compare Strategies</h3>
        <button onClick={onClose} className="ffi-btn-ghost text-[13px]">
          <X className="h-4 w-4" />
          Close
        </button>
      </div>

      {/* Strategy selector pills */}
      <div className="flex flex-wrap gap-2 items-center">
        {proposals.map((p, idx) => (
          <button
            key={idx}
            onClick={() => toggle(idx)}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={
              selected.includes(idx)
                ? { background: 'rgba(77,130,255,0.18)', color: 'var(--ffi-blue-bright)', border: '1px solid rgba(77,130,255,0.4)' }
                : { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)', border: '1px solid var(--ffi-hairline)' }
            }
          >
            {p.name}
          </button>
        ))}
        <span className="self-center text-xs" style={{ color: 'var(--ffi-ink-3)' }}>Select 2-3 to compare</span>
      </div>

      {/* Comparison grid — scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="min-w-[600px]">
          {/* Strategy headers */}
          <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(${compared.length}, 1fr)` }}>
            <div />
            {compared.map((p, i) => (
              <div key={i} className="ffi-nameplate text-center" style={{ padding: '0.5rem 0.75rem' }}>
                <div className="ffi-title-chrome text-sm">{p.name}</div>
                <div className="text-xs" style={{ color: 'var(--ffi-ink-2)' }}>{p.archetype}</div>
              </div>
            ))}
          </div>

          {/* Risk tolerance */}
          <CompareRow label="Risk" compared={compared}>
            {(p) => (
              <span className="text-sm font-medium capitalize" style={{ color: RISK_COLORS[p.risk_tolerance] }}>
                {p.risk_tolerance}
              </span>
            )}
          </CompareRow>

          {/* Confidence */}
          <CompareRow label="Confidence" compared={compared}>
            {(p) => (
              <span className="ffi-badge" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>
                {p.confidence}
              </span>
            )}
          </CompareRow>

          {/* Floor / Ceiling */}
          <CompareRow label="Floor / Ceiling" compared={compared}>
            {(p) => (
              <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ffi-ink-2)' }}>
                <TrendingDown className="h-3 w-3" />
                <span>{p.projected_floor}</span>
                <div className="ffi-progress flex-1 relative" style={{ height: '0.375rem' }}>
                  <div
                    className="absolute h-full rounded-full"
                    style={{
                      left: `${p.projected_floor}%`,
                      width: `${p.projected_ceiling - p.projected_floor}%`,
                      background: 'rgba(77,130,255,0.4)',
                    }}
                  />
                </div>
                <span>{p.projected_ceiling}</span>
                <TrendingUp className="h-3 w-3" />
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
                const highlight = isMax && compared.length > 1
                return (
                  <div className="flex items-center gap-2">
                    <div className="ffi-progress flex-1" style={{ height: '0.375rem' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${weight * 10}%`, background: highlight ? 'var(--ffi-blue-bright)' : 'rgba(77,130,255,0.4)' }}
                      />
                    </div>
                    <span
                      className="text-xs tabular-nums"
                      style={{ color: highlight ? 'var(--ffi-ink)' : 'var(--ffi-ink-2)', fontWeight: highlight ? 600 : 400 }}
                    >
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
                  <span className="text-sm tabular-nums" style={{ color: 'var(--ffi-ink)' }}>{p.max_bid_percentage ?? '-'}%</span>
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
                      <span
                        className="text-xs tabular-nums"
                        style={{ color: isMax && compared.length > 1 ? 'var(--ffi-ink)' : 'var(--ffi-ink-2)', fontWeight: isMax && compared.length > 1 ? 600 : 400 }}
                      >
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
                    <span className="text-xs tabular-nums" style={{ color: 'var(--ffi-ink-2)' }}>
                      {rounds?.length ? rounds.join(', ') : '-'}
                    </span>
                  )
                }}
              </CompareRow>
            ))
          )}

          {/* Key targets — highlight shared vs unique */}
          <div className="mt-4">
            <div className="ffi-label mb-2 flex items-center gap-1" style={{ color: 'var(--ffi-ink-3)' }}>
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
                      <span
                        key={name}
                        className="ffi-badge"
                        style={shared ? { background: 'rgba(139,255,69,0.16)', color: 'var(--ffi-volt)' } : { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}
                      >
                        {name}
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Key avoids */}
          <div className="mt-3">
            <div className="ffi-label mb-2 flex items-center gap-1" style={{ color: 'var(--ffi-ink-3)' }}>
              <ShieldAlert className="h-3 w-3" />
              Key Avoids
            </div>
            <div className="grid gap-3" style={{ gridTemplateColumns: `160px repeat(${compared.length}, 1fr)` }}>
              <div />
              {compared.map((p, i) => (
                <div key={i} className="flex flex-wrap gap-1">
                  {p.key_avoids.map((name) => (
                    <span key={name} className="ffi-badge" style={{ background: 'rgba(255,110,138,0.12)', color: 'var(--ffi-danger)' }}>
                      {name}
                    </span>
                  ))}
                  {p.key_avoids.length === 0 && (
                    <span className="text-xs" style={{ color: 'var(--ffi-ink-3)' }}>None</span>
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
                <button key={i} onClick={() => onSelect(p)} className="ffi-btn-secondary w-full text-[13px]">
                  Use this
                </button>
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
      className="grid gap-3 items-center py-2"
      style={{ gridTemplateColumns: `160px repeat(${compared.length}, 1fr)`, borderBottom: '1px solid var(--ffi-hairline)' }}
    >
      <div className="text-xs font-medium" style={{ color: 'var(--ffi-ink-2)' }}>{label}</div>
      {compared.map((p, i) => (
        <div key={i}>{children(p)}</div>
      ))}
    </div>
  )
}
