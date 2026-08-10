'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Target, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react'
import type { StrategyProposal } from '@/lib/research/strategy/research'

interface StrategyProposalCardProps {
  proposal: StrategyProposal
  format: 'auction' | 'snake'
  onSelect?: (proposal: StrategyProposal) => void
  isSelected?: boolean
}

const RISK_STYLES = {
  conservative: { background: 'rgba(77,130,255,0.16)', color: 'var(--ffi-blue-bright)' },
  balanced: { background: 'rgba(255,176,92,0.16)', color: '#ffb05c' },
  aggressive: { background: 'rgba(255,110,138,0.16)', color: 'var(--ffi-danger)' },
} as const

const CONFIDENCE_STYLES = {
  high: { background: 'rgba(139,255,69,0.16)', color: 'var(--ffi-volt)' },
  medium: { background: 'rgba(255,176,92,0.16)', color: '#ffb05c' },
  low: { background: 'rgba(255,110,138,0.16)', color: 'var(--ffi-danger)' },
} as const

export function StrategyProposalCard({ proposal, format, onSelect, isSelected }: StrategyProposalCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="ffi-card"
      style={isSelected ? { borderColor: 'var(--ffi-volt)', boxShadow: '0 0 0 1px var(--ffi-volt), 0 0 22px rgba(139,255,69,0.18)' } : undefined}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap ffi-title-md" style={{ color: 'var(--ffi-ink)' }}>
            {proposal.name}
            <span className="ffi-badge" style={RISK_STYLES[proposal.risk_tolerance]}>
              {proposal.risk_tolerance}
            </span>
            <span className="ffi-badge" style={CONFIDENCE_STYLES[proposal.confidence]}>
              {proposal.confidence} confidence
            </span>
          </div>
          <p className="text-[13px]" style={{ color: 'var(--ffi-ink-2)' }}>{proposal.description}</p>
        </div>
      </div>

      <div className="space-y-3">
        {/* Ceiling / Floor bar */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1" style={{ color: 'var(--ffi-ink-2)' }}>
            <TrendingDown className="h-3 w-3" />
            <span>Floor {proposal.projected_floor}</span>
          </div>
          <div className="ffi-progress relative">
            <div
              className="absolute h-full rounded-full"
              style={{
                left: `${proposal.projected_floor}%`,
                width: `${proposal.projected_ceiling - proposal.projected_floor}%`,
                background: 'rgba(77,130,255,0.3)',
              }}
            />
            <div
              className="absolute h-full w-1 rounded-full"
              style={{ left: `${(proposal.projected_floor + proposal.projected_ceiling) / 2}%`, background: 'var(--ffi-blue-bright)' }}
            />
          </div>
          <div className="flex items-center gap-1" style={{ color: 'var(--ffi-ink-2)' }}>
            <TrendingUp className="h-3 w-3" />
            <span>Ceiling {proposal.projected_ceiling}</span>
          </div>
        </div>

        {/* Philosophy */}
        <p className="text-[13px]" style={{ color: 'var(--ffi-ink-2)' }}>{proposal.philosophy}</p>

        {/* Key targets & avoids */}
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ffi-volt)' }}>
              <Target className="h-3 w-3" />
              Targets
            </div>
            <div className="flex flex-wrap gap-1">
              {proposal.key_targets.map((name) => (
                <span key={name} className="ffi-badge" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>
                  {name}
                </span>
              ))}
            </div>
          </div>
          {proposal.key_avoids.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--ffi-danger)' }}>
                <ShieldAlert className="h-3 w-3" />
                Avoids
              </div>
              <div className="flex flex-wrap gap-1">
                {proposal.key_avoids.map((name) => (
                  <span key={name} className="ffi-badge" style={{ background: 'rgba(255,110,138,0.12)', color: 'var(--ffi-danger)' }}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: 'var(--ffi-ink-2)' }}
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Less detail' : 'More detail'}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1">
            {/* Reasoning */}
            <div className="rounded-md p-3 text-[13px]" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink)' }}>
              <div className="ffi-label mb-1" style={{ color: 'var(--ffi-ink-3)' }}>
                Why this works in your league
              </div>
              {proposal.reasoning}
            </div>

            {/* Position weights */}
            <div>
              <div className="ffi-label mb-2" style={{ color: 'var(--ffi-ink-3)' }}>
                Position emphasis
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {Object.entries(proposal.position_weights)
                  .filter(([pos]) => !['K', 'DST'].includes(pos))
                  .map(([pos, weight]) => (
                    <div key={pos} className="text-center">
                      <div className="text-xs font-medium" style={{ color: 'var(--ffi-ink)' }}>{pos}</div>
                      <div className="ffi-progress mt-1" style={{ height: '0.375rem' }}>
                        <div
                          className="ffi-progress-bar"
                          style={{ width: `${(weight as number) * 10}%` }}
                        />
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: 'var(--ffi-ink-2)' }}>{weight as number}/10</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Format-specific details */}
            {format === 'auction' && proposal.budget_allocation && (
              <div>
                <div className="ffi-label mb-2" style={{ color: 'var(--ffi-ink-3)' }}>
                  Budget allocation
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(proposal.budget_allocation)
                    .filter(([, pct]) => pct > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([pos, pct]) => (
                      <div key={pos} className="text-center text-xs">
                        <span className="font-medium" style={{ color: 'var(--ffi-ink)' }}>{pos}</span>{' '}
                        <span style={{ color: 'var(--ffi-ink-2)' }}>{pct}%</span>
                      </div>
                    ))}
                </div>
                {proposal.max_bid_percentage && (
                  <div className="text-xs mt-1" style={{ color: 'var(--ffi-ink-2)' }}>
                    Max single bid: {proposal.max_bid_percentage}% of budget
                  </div>
                )}
              </div>
            )}

            {format === 'snake' && proposal.round_targets && (
              <div>
                <div className="ffi-label mb-2" style={{ color: 'var(--ffi-ink-3)' }}>
                  Round targets
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(proposal.round_targets)
                    .filter(([, rounds]) => (rounds as number[]).length > 0)
                    .map(([pos, rounds]) => (
                      <div key={pos} className="text-xs">
                        <span className="font-medium" style={{ color: 'var(--ffi-ink)' }}>{pos}</span>{' '}
                        <span style={{ color: 'var(--ffi-ink-2)' }}>Rd {(rounds as number[]).join(', ')}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Select button */}
        {onSelect && (
          <div className="pt-1">
            <button
              onClick={() => onSelect(proposal)}
              className={isSelected ? 'ffi-btn-hero w-full text-[13px]' : 'ffi-btn-secondary w-full text-[13px]'}
            >
              {isSelected ? 'Selected' : 'Use this strategy'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
