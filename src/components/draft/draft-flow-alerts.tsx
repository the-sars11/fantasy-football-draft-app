'use client'

/**
 * DraftFlowAlerts (FF-P02 + FF-P03)
 *
 * Displays draft flow alerts (position runs, value anomalies, pool depletion)
 * and proactive pivot suggestions when conditions favor a different strategy.
 */

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Info,
  X,
  TrendingUp,
  Zap,
} from 'lucide-react'
import type { DraftFlowState, FlowAlert } from '@/lib/draft/flow-monitor'
import type { Strategy as DbStrategy } from '@/lib/supabase/database.types'

interface PivotSuggestion {
  strategy: DbStrategy
  reason: string
  opportunities: string[]
}

interface DraftFlowAlertsProps {
  flow: DraftFlowState
  pivotSuggestion: PivotSuggestion | null
  onAcceptPivot: (strategy: DbStrategy) => void
  onDismissPivot: () => void
}

const severityIcon = {
  info: <Info className="h-3 w-3 text-blue-400 shrink-0" />,
  warning: <AlertTriangle className="h-3 w-3 text-orange-400 shrink-0" />,
  critical: <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />,
}

const severityBorder = {
  info: 'border-blue-500/20',
  warning: 'border-orange-500/20',
  critical: 'border-red-500/20',
}

export function DraftFlowAlerts({
  flow,
  pivotSuggestion,
  onAcceptPivot,
  onDismissPivot,
}: DraftFlowAlertsProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const visibleAlerts = flow.alerts.filter(
    a => !dismissedAlerts.has(`${a.type}-${a.message}`)
  )

  const dismissAlert = (alert: FlowAlert) => {
    setDismissedAlerts(prev => new Set([...prev, `${alert.type}-${alert.message}`]))
  }

  if (visibleAlerts.length === 0 && !pivotSuggestion) return null

  return (
    <div className="space-y-1.5">
      {/* Pivot suggestion — highest priority */}
      {pivotSuggestion && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
          <div className="flex items-start gap-2">
            <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium">
                Pivot to {pivotSuggestion.strategy.name}?
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {pivotSuggestion.reason}
              </p>
              {pivotSuggestion.opportunities.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {pivotSuggestion.opportunities.map((opp, i) => (
                    <Badge key={i} variant="outline" className="text-[9px] px-1 py-0">
                      {opp}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1.5">
                <Button
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => onAcceptPivot(pivotSuggestion.strategy)}
                >
                  Switch
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 text-[10px] px-2"
                  onClick={onDismissPivot}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Flow alerts */}
      {visibleAlerts.map((alert, i) => (
        <div
          key={`${alert.type}-${alert.message}-${i}`}
          className={`flex items-start gap-2 rounded-md border ${severityBorder[alert.severity]} bg-muted/30 px-2.5 py-1.5`}
        >
          {severityIcon[alert.severity]}
          <span className="text-[11px] flex-1">{alert.message}</span>
          <button
            onClick={() => dismissAlert(alert)}
            className="text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
