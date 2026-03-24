'use client'

/**
 * FFIPlayerIntelCard (FF-236 to FF-240)
 *
 * Player card for the Player Browser with intel tags, sentiment, and user tag controls.
 * Uses "Tactical Hologram" design system.
 *
 * - FF-236: Compact + expanded views
 * - FF-237: System tag badge styling
 * - FF-238: TARGET badge styling (lime, prominent, glowing)
 * - FF-239: User tag inline editor with quick-add TARGET button
 * - FF-240: Sentiment snippet display in expanded view
 */

import { useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Target,
  Ban,
  Zap,
  TrendingUp,
  TrendingDown,
  Star,
  AlertTriangle,
  Check,
  X,
} from 'lucide-react'
import type { Player } from '@/lib/players/types'
import type { SystemTag, SystemTagType } from '@/lib/supabase/database.types'

// --- Badge Configuration ---

interface BadgeConfig {
  bgClass: string
  textClass: string
  label: string
  icon: typeof Target
  glow?: boolean
}

const SYSTEM_TAG_CONFIG: Record<SystemTagType, BadgeConfig> = {
  BREAKOUT: {
    bgClass: 'bg-[#2ff801]/20',
    textClass: 'text-[#2ff801]',
    label: 'BREAKOUT',
    icon: Zap,
  },
  SLEEPER: {
    bgClass: 'bg-[#2ff801]/15',
    textClass: 'text-[#2ff801]',
    label: 'SLEEPER',
    icon: Star,
  },
  VALUE: {
    bgClass: 'bg-[#8bacff]/20',
    textClass: 'text-[#8bacff]',
    label: 'VALUE',
    icon: TrendingUp,
  },
  BUST: {
    bgClass: 'bg-[#ff716c]/20',
    textClass: 'text-[#ff716c]',
    label: 'BUST',
    icon: TrendingDown,
  },
  AVOID: {
    bgClass: 'bg-[#ff716c]/15',
    textClass: 'text-[#ff716c]',
    label: 'AVOID',
    icon: AlertTriangle,
  },
}

// User tag badge config
const USER_TAG_CONFIG: Record<string, BadgeConfig> = {
  target: {
    bgClass: 'bg-[#2ff801]/30',
    textClass: 'text-[#2ff801]',
    label: 'TARGET',
    icon: Target,
    glow: true,
  },
  avoid: {
    bgClass: 'bg-[#ff716c]/25',
    textClass: 'text-[#ff716c]',
    label: 'AVOID',
    icon: Ban,
  },
  watch: {
    bgClass: 'bg-[#8bacff]/20',
    textClass: 'text-[#8bacff]',
    label: 'WATCH',
    icon: Star,
  },
}

// --- Component Props ---

interface FFIPlayerIntelCardProps {
  rank: number
  player: Player
  systemTags: SystemTag[]
  userTags: string[]
  isTarget: boolean
  isAvoid: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  onToggleTarget?: () => void
  onToggleAvoid?: () => void
  isTagLoading?: boolean
  sentimentSnippets?: string[]
}

// --- Component ---

export function FFIPlayerIntelCard({
  rank,
  player,
  systemTags,
  userTags,
  isTarget,
  isAvoid,
  isExpanded = false,
  onToggleExpand,
  onToggleTarget,
  onToggleAvoid,
  isTagLoading = false,
  sentimentSnippets = [],
}: FFIPlayerIntelCardProps) {
  // Format rank with leading zero
  const rankDisplay = rank.toString().padStart(2, '0')

  // Determine primary badge for compact view (TARGET always wins)
  const primaryBadge = useMemo(() => {
    // User TARGET is always shown first
    if (isTarget) {
      return { type: 'user', tag: 'target', config: USER_TAG_CONFIG.target }
    }

    // User AVOID second
    if (isAvoid) {
      return { type: 'user', tag: 'avoid', config: USER_TAG_CONFIG.avoid }
    }

    // Then highest priority system tag (BREAKOUT > VALUE > SLEEPER > BUST > AVOID)
    const priority: SystemTagType[] = ['BREAKOUT', 'VALUE', 'SLEEPER', 'BUST', 'AVOID']
    for (const tagType of priority) {
      const found = systemTags.find(t => t.tag === tagType)
      if (found) {
        return { type: 'system', tag: found, config: SYSTEM_TAG_CONFIG[tagType] }
      }
    }

    return null
  }, [isTarget, isAvoid, systemTags])

  // Is this a highlighted player (target or positive tags)?
  const isHighlighted = isTarget || systemTags.some(t => ['BREAKOUT', 'VALUE', 'SLEEPER'].includes(t.tag))
  const isNegative = isAvoid || systemTags.some(t => ['BUST', 'AVOID'].includes(t.tag))

  return (
    <div className="relative group">
      {/* Ambient glow for highlighted players */}
      {isHighlighted && !isNegative && (
        <div className="absolute inset-0 bg-[#2ff801]/5 blur-2xl rounded-xl -z-10" />
      )}

      <div
        className={`
          glass-panel rounded-xl overflow-hidden transition-all cursor-pointer
          ${isTarget
            ? 'border border-[#2ff801]/30 shadow-[0_0_20px_rgba(47,248,1,0.1)]'
            : isNegative
            ? 'border border-[#ff716c]/20'
            : isHighlighted
            ? 'border border-[#2ff801]/10'
            : 'border border-[#8bacff]/5 hover:border-[#8bacff]/20'
          }
        `}
      >
        {/* Main card content */}
        <div
          className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4 relative"
          onClick={onToggleExpand}
        >
          {/* Flash streak for TARGET players */}
          {isTarget && (
            <div className="flash-streak absolute top-0 left-0 w-full h-full pointer-events-none" />
          )}

          {/* Rank number */}
          <div
            className={`
              font-headline text-2xl sm:text-3xl font-extrabold tracking-tighter italic
              ${isTarget ? 'text-[#2ff801]/40' : isHighlighted ? 'text-[#8bacff]/30' : 'text-[#8bacff]/20'}
            `}
          >
            {rankDisplay}
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-base sm:text-lg font-bold text-[#deedf9] leading-tight truncate">
              {player.name.toUpperCase()}
            </h3>
            <p className="font-body text-[10px] text-[#9eadb8] tracking-widest uppercase mt-0.5">
              {player.team} • {player.position}
              {player.byeWeek > 0 && ` • BYE ${player.byeWeek}`}
            </p>

            {/* Primary badge in compact view */}
            {!isExpanded && primaryBadge && (
              <div className="flex gap-2 mt-2">
                <span
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider
                    ${primaryBadge.config.bgClass} ${primaryBadge.config.textClass}
                    ${primaryBadge.config.glow ? 'shadow-[0_0_8px_rgba(47,248,1,0.4)]' : ''}
                  `}
                >
                  <primaryBadge.config.icon className="h-3 w-3" />
                  {primaryBadge.config.label}
                </span>
              </div>
            )}
          </div>

          {/* Value display */}
          <div className="text-right flex-shrink-0">
            <div
              className={`
                font-headline text-xl sm:text-2xl font-bold
                ${isTarget ? 'text-[#2ff801]' : isHighlighted ? 'text-[#2ff801]' : 'text-[#deedf9]'}
              `}
            >
              {player.consensusAuctionValue > 0 ? `$${player.consensusAuctionValue}` : '—'}
            </div>
            <div className="font-body text-[10px] text-[#9eadb8]">
              ADP {player.adp > 0 ? player.adp.toFixed(0) : '—'}
            </div>
          </div>

          {/* Expand icon */}
          <button className="text-[#9eadb8]/40 hover:text-[#9eadb8] transition-colors ml-1">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-[#8bacff]/10 space-y-4">
            {/* All tags with reasoning */}
            <div>
              <h4 className="text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
                Intelligence Tags
              </h4>

              {/* User tags */}
              {(isTarget || isAvoid || userTags.length > 0) && (
                <div className="space-y-2 mb-3">
                  {isTarget && (
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-[#2ff801]/30 text-[#2ff801] shadow-[0_0_8px_rgba(47,248,1,0.4)]">
                        <Target className="h-3 w-3" />
                        TARGET
                      </span>
                      <span className="text-[10px] text-[#9eadb8] leading-relaxed">
                        You've marked this player as a draft target
                      </span>
                    </div>
                  )}
                  {isAvoid && (
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-[#ff716c]/25 text-[#ff716c]">
                        <Ban className="h-3 w-3" />
                        AVOID
                      </span>
                      <span className="text-[10px] text-[#9eadb8] leading-relaxed">
                        You've marked this player to avoid
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* System tags */}
              {systemTags.length > 0 ? (
                <div className="space-y-2">
                  {systemTags.map((tag, idx) => {
                    const config = SYSTEM_TAG_CONFIG[tag.tag]
                    const Icon = config.icon
                    return (
                      <div key={`${tag.tag}-${idx}`} className="flex items-start gap-2">
                        <span
                          className={`
                            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider shrink-0
                            ${config.bgClass} ${config.textClass}
                          `}
                        >
                          <Icon className="h-3 w-3" />
                          {config.label}
                        </span>
                        <span className="text-[10px] text-[#9eadb8] leading-relaxed">
                          {tag.reasoning}
                          {tag.adp_gap && (
                            <span className="text-[#8bacff] ml-1">
                              ({tag.adp_gap > 0 ? '+' : ''}{tag.adp_gap} spots)
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : !isTarget && !isAvoid && (
                <p className="text-[10px] text-[#697782] italic">
                  No system tags detected for this player
                </p>
              )}
            </div>

            {/* Sentiment snippets (FF-240) */}
            {sentimentSnippets.length > 0 && (
              <div>
                <h4 className="text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
                  Expert Sentiment
                </h4>
                <div className="space-y-1">
                  {sentimentSnippets.map((snippet, idx) => (
                    <p key={idx} className="text-[11px] text-[#9eadb8] italic leading-relaxed">
                      "{snippet}"
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* User tag controls (FF-239) */}
            <div>
              <h4 className="text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
                Your Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                {/* TARGET toggle button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleTarget?.()
                  }}
                  disabled={isTagLoading}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${isTarget
                      ? 'bg-[#2ff801]/30 text-[#2ff801] shadow-[0_0_12px_rgba(47,248,1,0.3)]'
                      : 'bg-surface-container-high text-[#9eadb8] hover:bg-[#2ff801]/10 hover:text-[#2ff801]'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isTarget ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      TARGET SET
                    </>
                  ) : (
                    <>
                      <Target className="h-3.5 w-3.5" />
                      Mark as Target
                    </>
                  )}
                </button>

                {/* AVOID toggle button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onToggleAvoid?.()
                  }}
                  disabled={isTagLoading}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${isAvoid
                      ? 'bg-[#ff716c]/25 text-[#ff716c]'
                      : 'bg-surface-container-high text-[#9eadb8] hover:bg-[#ff716c]/10 hover:text-[#ff716c]'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isAvoid ? (
                    <>
                      <X className="h-3.5 w-3.5" />
                      AVOIDING
                    </>
                  ) : (
                    <>
                      <Ban className="h-3.5 w-3.5" />
                      Mark to Avoid
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Confidence indicator */}
            {systemTags.length > 0 && (
              <div className="pt-2 border-t border-[#8bacff]/10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#697782] uppercase tracking-wider">
                    Tag Confidence
                  </span>
                  <span className="text-[10px] text-[#9eadb8]">
                    {Math.round(Math.max(...systemTags.map(t => t.confidence)) * 100)}%
                  </span>
                </div>
                <div className="h-1 bg-surface-container-high rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#8bacff] to-[#2ff801] transition-all"
                    style={{
                      width: `${Math.max(...systemTags.map(t => t.confidence)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
