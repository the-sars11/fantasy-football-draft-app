'use client'

/**
 * PivotHistory (FF-P05)
 *
 * Tracks all strategy changes during a draft:
 * - Timestamp (pick number)
 * - From → To strategy
 * - Reason (user choice or accepted recommendation)
 * - What the app recommended vs what was chosen
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History, ArrowRight, Check, X } from 'lucide-react'

export interface PivotEntry {
  pickNumber: number
  fromStrategy: string
  toStrategy: string
  reason: 'user_swap' | 'accepted_recommendation' | 'dismissed_recommendation'
  recommendedStrategy?: string // what the app suggested (if different from what was chosen)
  timestamp: Date
}

interface PivotHistoryProps {
  entries: PivotEntry[]
}

export function PivotHistory({ entries }: PivotHistoryProps) {
  if (entries.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-3.5 w-3.5" />
          Pivot History ({entries.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="space-y-1.5">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-[11px] py-1 px-1.5 rounded hover:bg-muted/30"
            >
              <span className="font-mono text-muted-foreground w-8 text-right shrink-0 text-[10px] pt-0.5">
                #{entry.pickNumber}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-muted-foreground truncate">{entry.fromStrategy}</span>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">{entry.toStrategy}</span>
                </div>
                {entry.reason === 'accepted_recommendation' && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Check className="h-2.5 w-2.5 text-green-400" />
                    <span className="text-[9px] text-green-400">Accepted recommendation</span>
                  </div>
                )}
                {entry.reason === 'dismissed_recommendation' && entry.recommendedStrategy && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <X className="h-2.5 w-2.5 text-orange-400" />
                    <span className="text-[9px] text-orange-400">
                      Dismissed (app suggested {entry.recommendedStrategy})
                    </span>
                  </div>
                )}
                {entry.reason === 'user_swap' && (
                  <span className="text-[9px] text-muted-foreground">Manual switch</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
