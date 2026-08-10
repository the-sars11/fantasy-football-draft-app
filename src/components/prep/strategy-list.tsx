'use client'

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Star,
  Copy,
} from 'lucide-react'
import type { Strategy } from '@/lib/supabase/database.types'
import type { DraftFormat } from '@/lib/players/types'

interface StrategyListProps {
  strategies: Strategy[]
  format: DraftFormat
  onEdit: (strategy: Strategy) => void
  onDelete: (strategyId: string) => Promise<void>
  onSetActive: (strategyId: string) => Promise<void>
  onDuplicate: (strategy: Strategy) => Promise<void>
}

export function StrategyList({
  strategies,
  format,
  onEdit,
  onDelete,
  onSetActive,
  onDuplicate,
}: StrategyListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  if (strategies.length === 0) {
    return (
      <div className="rounded-md p-6 text-center" style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}>
        <p className="text-sm" style={{ color: 'var(--ffi-ink-2)' }}>
          No saved strategies yet. Generate proposals above, then save one to get started.
        </p>
      </div>
    )
  }

  const handleAction = async (id: string, action: () => Promise<void>) => {
    setActionLoading(id)
    try {
      await action()
    } finally {
      setActionLoading(id === actionLoading ? null : actionLoading)
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      {strategies.map((s) => {
        const isExpanded = expandedId === s.id
        const isLoading = actionLoading === s.id

        return (
          <div
            key={s.id}
            className="ffi-card"
            style={{ padding: 0, ...(s.is_active ? { borderColor: 'var(--ffi-blue-bright)' } : {}) }}
          >
            {/* Row header — always visible */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : s.id)}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-left"
            >
              {s.is_active && <Star className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--ffi-blue-bright)', fill: 'var(--ffi-blue-bright)' }} />}
              <span className="text-sm font-medium flex-1 min-w-0 truncate" style={{ color: 'var(--ffi-ink)' }}>{s.name}</span>
              <span className="ffi-badge text-[10px] shrink-0" style={{ background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }}>
                {s.archetype}
              </span>
              <span className="ffi-badge text-[10px] shrink-0" style={{ background: 'var(--ffi-surface-2)', color: 'var(--ffi-ink-2)' }}>
                {s.source}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 shrink-0" style={{ color: 'var(--ffi-ink-3)' }} />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0" style={{ color: 'var(--ffi-ink-3)' }} />
              )}
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <div className="pb-3 px-3 space-y-3">
                {s.description && (
                  <p className="text-xs" style={{ color: 'var(--ffi-ink-2)' }}>{s.description}</p>
                )}

                {/* Key settings summary */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div style={{ color: 'var(--ffi-ink-3)' }}>Risk</div>
                  <div className="capitalize" style={{ color: 'var(--ffi-ink)' }}>{s.risk_tolerance}</div>

                  <div style={{ color: 'var(--ffi-ink-3)' }}>Targets</div>
                  <div style={{ color: 'var(--ffi-ink)' }}>{s.player_targets.length} players</div>

                  <div style={{ color: 'var(--ffi-ink-3)' }}>Avoids</div>
                  <div style={{ color: 'var(--ffi-ink)' }}>{s.player_avoids.length} players, {s.team_avoids.length} teams</div>

                  {format === 'auction' && s.budget_allocation && (
                    <>
                      <div style={{ color: 'var(--ffi-ink-3)' }}>Top budget</div>
                      <div style={{ color: 'var(--ffi-ink)' }}>
                        {Object.entries(s.budget_allocation)
                          .filter(([k]) => k !== 'bench')
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .slice(0, 2)
                          .map(([k, v]) => `${k === 'DST' ? 'DEF' : k} ${v}%`)
                          .join(', ')}
                      </div>
                    </>
                  )}

                  {format === 'snake' && s.round_targets && (
                    <>
                      <div style={{ color: 'var(--ffi-ink-3)' }}>Round focus</div>
                      <div style={{ color: 'var(--ffi-ink)' }}>
                        {Object.entries(s.round_targets as Record<string, number[]>)
                          .filter(([, rounds]) => rounds.length > 0)
                          .slice(0, 2)
                          .map(([pos, rounds]) => `${pos === 'DST' ? 'DEF' : pos}: R${rounds.join(',')}`).join('; ')}
                      </div>
                    </>
                  )}
                </div>

                {s.ai_reasoning && (
                  <p className="text-xs pt-2 line-clamp-3" style={{ color: 'var(--ffi-ink-2)', borderTop: '1px solid var(--ffi-hairline)' }}>
                    {s.ai_reasoning}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1 items-center">
                  <button
                    onClick={() => onEdit(s)}
                    disabled={isLoading}
                    className="ffi-btn-secondary text-xs disabled:opacity-50"
                    style={{ padding: '0.4rem 0.9rem' }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>

                  <button
                    onClick={() => handleAction(s.id, () => onDuplicate(s))}
                    disabled={isLoading}
                    className="ffi-btn-secondary text-xs disabled:opacity-50"
                    style={{ padding: '0.4rem 0.9rem' }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Save As New
                  </button>

                  {!s.is_active && (
                    <button
                      onClick={() => handleAction(s.id, () => onSetActive(s.id))}
                      disabled={isLoading}
                      className="ffi-btn-secondary text-xs disabled:opacity-50"
                      style={{ padding: '0.4rem 0.9rem' }}
                    >
                      <Star className="h-3.5 w-3.5" />
                      Set Active
                    </button>
                  )}

                  {s.is_active && (
                    <span className="ffi-badge text-xs self-center" style={{ background: 'rgba(77,130,255,0.16)', color: 'var(--ffi-blue-bright)' }}>
                      Active
                    </span>
                  )}

                  <button
                    className="ffi-btn-ghost text-xs ml-auto disabled:opacity-50"
                    style={{ color: 'var(--ffi-danger)' }}
                    onClick={() => {
                      if (confirm(`Delete "${s.name}"?`)) {
                        handleAction(s.id, () => onDelete(s.id))
                      }
                    }}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
