'use client'

/**
 * WhyExplainer (FF-036)
 *
 * Expandable reasoning panel for any draft recommendation.
 * Shows structured factors with impact badges and detail text.
 */

import { Badge } from '@/components/ui/badge'
import { ThumbsUp, ThumbsDown, Minus, MessageSquare } from 'lucide-react'
import type { Explanation, ExplainFactor } from '@/lib/draft/explain'

const impactStyles: Record<ExplainFactor['impact'], { icon: typeof ThumbsUp; color: string }> = {
  positive: { icon: ThumbsUp, color: 'text-green-400' },
  negative: { icon: ThumbsDown, color: 'text-red-400' },
  neutral:  { icon: Minus, color: 'text-muted-foreground' },
}

const confidenceStyles: Record<string, string> = {
  high: 'text-green-400 border-green-500/30 bg-green-500/10',
  medium: 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
  low: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
}

interface WhyExplainerProps {
  explanation: Explanation
}

export function WhyExplainer({ explanation }: WhyExplainerProps) {
  return (
    <div className="rounded-md border border-border/60 bg-muted/20 p-2.5 space-y-2">
      {/* Summary */}
      <div className="flex items-start gap-1.5">
        <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
        <p className="text-xs leading-relaxed">{explanation.summary}</p>
      </div>

      {/* Confidence badge */}
      <div className="flex items-center gap-1.5">
        <Badge
          variant="outline"
          className={`text-[9px] px-1.5 py-0 ${confidenceStyles[explanation.confidence]}`}
        >
          {explanation.confidence} confidence
        </Badge>
      </div>

      {/* Factors */}
      <div className="space-y-1">
        {explanation.factors.map((factor, i) => {
          const style = impactStyles[factor.impact]
          const Icon = style.icon
          return (
            <div key={i} className="flex items-start gap-1.5 text-[11px]">
              <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${style.color}`} />
              <div>
                <span className="font-medium">{factor.label}:</span>{' '}
                <span className="text-muted-foreground">{factor.detail}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
