'use client'

/**
 * PositionScarcityTracker (FF-035)
 *
 * Visual display of remaining startable players per position per tier.
 * Color-coded urgency: critical (red), low (orange), moderate (yellow), abundant (green).
 */

import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'
import type { PositionScarcity } from '@/lib/draft/explain'

const scarcityStyles: Record<PositionScarcity['scarcityLevel'], { bg: string; text: string; label: string }> = {
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'CRITICAL' },
  low:      { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'LOW' },
  moderate: { bg: 'bg-yellow-500/15', text: 'text-yellow-300', label: 'OK' },
  abundant: { bg: 'bg-green-500/15', text: 'text-green-400', label: 'DEEP' },
}

const posColors: Record<string, string> = {
  QB: 'border-red-500/40',
  RB: 'border-blue-500/40',
  WR: 'border-green-500/40',
  TE: 'border-orange-500/40',
  K: 'border-purple-500/40',
  DEF: 'border-yellow-500/40',
}

interface PositionScarcityTrackerProps {
  scarcity: PositionScarcity[]
}

export function PositionScarcityTracker({ scarcity }: PositionScarcityTrackerProps) {
  const alerts = scarcity.filter(s => s.scarcityLevel === 'critical' || s.scarcityLevel === 'low')

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-1.5">
        Position Scarcity
        {alerts.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-orange-400 border-orange-500/30 bg-orange-500/10">
            <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
            {alerts.length} alert{alerts.length > 1 ? 's' : ''}
          </Badge>
        )}
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {scarcity.map(s => {
          const style = scarcityStyles[s.scarcityLevel]
          return (
            <div
              key={s.position}
              className={`rounded-lg border ${posColors[s.position] ?? 'border-border'} ${style.bg} p-2.5`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-semibold">{s.position}</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] px-1 py-0 ${style.text} border-current/30`}
                >
                  {style.label}
                </Badge>
              </div>

              {/* Tier breakdown bar */}
              <div className="flex gap-0.5 h-2 rounded overflow-hidden bg-muted/30 mb-1.5">
                {s.tier1Remaining > 0 && (
                  <div
                    className="bg-green-500/70 rounded-sm"
                    style={{ flex: s.tier1Remaining }}
                    title={`Tier 1: ${s.tier1Remaining}`}
                  />
                )}
                {s.tier2Remaining > 0 && (
                  <div
                    className="bg-yellow-500/60 rounded-sm"
                    style={{ flex: s.tier2Remaining }}
                    title={`Tier 2: ${s.tier2Remaining}`}
                  />
                )}
                {s.tier3Remaining > 0 && (
                  <div
                    className="bg-muted-foreground/30 rounded-sm"
                    style={{ flex: s.tier3Remaining }}
                    title={`Tier 3+: ${s.tier3Remaining}`}
                  />
                )}
              </div>

              {/* Counts */}
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  <span className="text-green-400 font-mono">{s.tier1Remaining}</span> T1
                  {' · '}
                  <span className="text-yellow-400 font-mono">{s.tier2Remaining}</span> T2
                </span>
                <span className="font-mono">{s.totalRemaining} total</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-green-500/70" /> Tier 1 (startable)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-yellow-500/60" /> Tier 2 (depth)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-muted-foreground/30" /> Tier 3+
        </span>
      </div>
    </div>
  )
}
