'use client'

/**
 * FFIAIInsight (FF-098)
 *
 * Expandable AI insight section ported from UI/draft_board/code.html lines 152-173
 * Shows tactical reasoning with confidence bar.
 */

import type { Explanation } from '@/lib/draft/explain'

interface FFIAIInsightProps {
  explanation: Explanation
  confidence: number // 0-100
}

export function FFIAIInsight({ explanation, confidence }: FFIAIInsightProps) {
  // Build insight text from explanation factors
  const insightText = explanation.factors
    .slice(0, 3)
    .map(f => f.detail)
    .join(' ')

  return (
    <div className="bg-black/80 p-5 space-y-4 border-t border-[#3c4a53]/10">
      {/* Insight header and content */}
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-[#2ff801] text-sm mt-1" style={{ fontVariationSettings: "'FILL' 1" }}>
          query_stats
        </span>
        <div className="space-y-2 flex-1">
          <h4 className="font-headline text-xs font-bold text-[#2ff801] uppercase tracking-widest">
            Tactical Insight
          </h4>
          <p className="text-xs text-[#9eadb8] leading-relaxed">
            {insightText || 'Strategic analysis based on your league settings and draft position.'}
          </p>
        </div>
      </div>

      {/* Confidence bar and action */}
      <div className="flex items-center justify-between pt-2">
        {/* Confidence meter */}
        <div className="flex-1 max-w-[140px]">
          <div className="flex justify-between mb-1">
            <span className="text-[9px] font-headline uppercase tracking-widest text-[#9eadb8]">
              Confidence
            </span>
            <span className="text-[9px] font-headline font-bold text-[#2ff801]">
              {confidence}%
            </span>
          </div>
          <div className="h-1 bg-[#142834] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2ff801] shadow-[0_0_8px_#2ff801] transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
            />
          </div>
        </div>

        {/* Action button */}
        <button className="px-4 py-2 rounded-lg bg-[#142834] text-[#8bacff] font-headline font-bold text-[10px] tracking-widest hover:bg-[#192f3b] transition-colors">
          FULL ANALYTICS
        </button>
      </div>

      {/* Factor breakdown (if available) */}
      {explanation.factors.length > 0 && (
        <div className="pt-3 border-t border-[#3c4a53]/10 space-y-2">
          <h5 className="text-[9px] font-headline uppercase tracking-widest text-[#9eadb8]">
            Key Factors
          </h5>
          <div className="flex flex-wrap gap-2">
            {explanation.factors.map((factor, i) => (
              <span
                key={i}
                className={`px-2 py-1 rounded text-[9px] font-bold tracking-wider ${
                  factor.impact === 'positive'
                    ? 'bg-[#106e00]/30 text-[#2ff801]'
                    : factor.impact === 'negative'
                      ? 'bg-[#9f0519]/20 text-[#ff716c]'
                      : 'bg-[#142834] text-[#9eadb8]'
                }`}
              >
                {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : ''}{factor.weight} {factor.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}