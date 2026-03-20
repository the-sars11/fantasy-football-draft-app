'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronUp, Target, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react'
import type { StrategyProposal } from '@/lib/research/strategy/research'

interface StrategyProposalCardProps {
  proposal: StrategyProposal
  format: 'auction' | 'snake'
  onSelect?: (proposal: StrategyProposal) => void
  isSelected?: boolean
}

const RISK_COLORS = {
  conservative: 'text-blue-500 border-blue-500/50',
  balanced: 'text-yellow-500 border-yellow-500/50',
  aggressive: 'text-red-500 border-red-500/50',
} as const

const CONFIDENCE_COLORS = {
  high: 'bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  low: 'bg-red-500/10 text-red-600 dark:text-red-400',
} as const

export function StrategyProposalCard({ proposal, format, onSelect, isSelected }: StrategyProposalCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <CardTitle className="flex items-center gap-2 flex-wrap">
              {proposal.name}
              <Badge variant="outline" className={RISK_COLORS[proposal.risk_tolerance]}>
                {proposal.risk_tolerance}
              </Badge>
              <Badge variant="secondary" className={CONFIDENCE_COLORS[proposal.confidence]}>
                {proposal.confidence} confidence
              </Badge>
            </CardTitle>
            <CardDescription>{proposal.description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Ceiling / Floor bar */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingDown className="h-3 w-3" />
            <span>Floor {proposal.projected_floor}</span>
          </div>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
            <div
              className="absolute h-full bg-primary/30 rounded-full"
              style={{
                left: `${proposal.projected_floor}%`,
                width: `${proposal.projected_ceiling - proposal.projected_floor}%`,
              }}
            />
            <div
              className="absolute h-full w-1 bg-primary rounded-full"
              style={{ left: `${(proposal.projected_floor + proposal.projected_ceiling) / 2}%` }}
            />
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            <span>Ceiling {proposal.projected_ceiling}</span>
          </div>
        </div>

        {/* Philosophy */}
        <p className="text-sm text-muted-foreground">{proposal.philosophy}</p>

        {/* Key targets & avoids */}
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <Target className="h-3 w-3" />
              Targets
            </div>
            <div className="flex flex-wrap gap-1">
              {proposal.key_targets.map((name) => (
                <Badge key={name} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
            </div>
          </div>
          {proposal.key_avoids.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                <ShieldAlert className="h-3 w-3" />
                Avoids
              </div>
              <div className="flex flex-wrap gap-1">
                {proposal.key_avoids.map((name) => (
                  <Badge key={name} variant="outline" className="text-xs text-red-500 border-red-500/30">
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? 'Less detail' : 'More detail'}
        </button>

        {expanded && (
          <div className="space-y-3 pt-1">
            {/* Reasoning */}
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Why this works in your league
              </div>
              {proposal.reasoning}
            </div>

            {/* Position weights */}
            <div>
              <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Position emphasis
              </div>
              <div className="grid grid-cols-6 gap-1.5">
                {Object.entries(proposal.position_weights)
                  .filter(([pos]) => !['K', 'DST'].includes(pos))
                  .map(([pos, weight]) => (
                    <div key={pos} className="text-center">
                      <div className="text-xs font-medium">{pos}</div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(weight as number) * 10}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{weight as number}/10</div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Format-specific details */}
            {format === 'auction' && proposal.budget_allocation && (
              <div>
                <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Budget allocation
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(proposal.budget_allocation)
                    .filter(([, pct]) => pct > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([pos, pct]) => (
                      <div key={pos} className="text-center text-xs">
                        <span className="font-medium">{pos}</span>{' '}
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                    ))}
                </div>
                {proposal.max_bid_percentage && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Max single bid: {proposal.max_bid_percentage}% of budget
                  </div>
                )}
              </div>
            )}

            {format === 'snake' && proposal.round_targets && (
              <div>
                <div className="font-medium text-xs uppercase tracking-wider text-muted-foreground mb-2">
                  Round targets
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(proposal.round_targets)
                    .filter(([, rounds]) => (rounds as number[]).length > 0)
                    .map(([pos, rounds]) => (
                      <div key={pos} className="text-xs">
                        <span className="font-medium">{pos}</span>{' '}
                        <span className="text-muted-foreground">Rd {(rounds as number[]).join(', ')}</span>
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
            <Button
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(proposal)}
              className="w-full"
            >
              {isSelected ? 'Selected' : 'Use this strategy'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
