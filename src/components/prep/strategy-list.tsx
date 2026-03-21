'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  Star,
  StarOff,
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
      <div className="rounded-md border border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
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
          <Card key={s.id} size="sm" className={s.is_active ? 'ring-1 ring-primary/50' : ''}>
            {/* Row header — always visible */}
            <button
              onClick={() => setExpandedId(isExpanded ? null : s.id)}
              className="flex items-center gap-2 w-full px-3 py-2.5 text-left"
            >
              {s.is_active && <Star className="h-3.5 w-3.5 text-primary shrink-0 fill-primary" />}
              <span className="text-sm font-medium flex-1 min-w-0 truncate">{s.name}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {s.archetype}
              </Badge>
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {s.source}
              </Badge>
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Expanded detail */}
            {isExpanded && (
              <CardContent className="pt-0 pb-3 space-y-3">
                {s.description && (
                  <p className="text-xs text-muted-foreground">{s.description}</p>
                )}

                {/* Key settings summary */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="text-muted-foreground">Risk</div>
                  <div className="capitalize">{s.risk_tolerance}</div>

                  <div className="text-muted-foreground">Targets</div>
                  <div>{s.player_targets.length} players</div>

                  <div className="text-muted-foreground">Avoids</div>
                  <div>{s.player_avoids.length} players, {s.team_avoids.length} teams</div>

                  {format === 'auction' && s.budget_allocation && (
                    <>
                      <div className="text-muted-foreground">Top budget</div>
                      <div>
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
                      <div className="text-muted-foreground">Round focus</div>
                      <div>
                        {Object.entries(s.round_targets as Record<string, number[]>)
                          .filter(([, rounds]) => rounds.length > 0)
                          .slice(0, 2)
                          .map(([pos, rounds]) => `${pos === 'DST' ? 'DEF' : pos}: R${rounds.join(',')}`).join('; ')}
                      </div>
                    </>
                  )}
                </div>

                {s.ai_reasoning && (
                  <p className="text-xs text-muted-foreground border-t border-border/50 pt-2 line-clamp-3">
                    {s.ai_reasoning}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(s)}
                    disabled={isLoading}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAction(s.id, () => onDuplicate(s))}
                    disabled={isLoading}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Save As New
                  </Button>

                  {!s.is_active && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAction(s.id, () => onSetActive(s.id))}
                      disabled={isLoading}
                    >
                      <Star className="h-3.5 w-3.5 mr-1" />
                      Set Active
                    </Button>
                  )}

                  {s.is_active && (
                    <Badge variant="secondary" className="text-xs self-center">
                      Active
                    </Badge>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 ml-auto"
                    onClick={() => {
                      if (confirm(`Delete "${s.name}"?`)) {
                        handleAction(s.id, () => onDelete(s.id))
                      }
                    }}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
