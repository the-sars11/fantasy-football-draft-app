'use client'

/**
 * FFIPlayerIntelCard
 *
 * Player card for the Player Browser. Shows the REAL auction value for Joe's
 * exact league (VORP: value over replacement, budget-balanced to $2,400) next
 * to the market anchor (what the room actually pays), projected points, and
 * live data-driven tags. No ADP anywhere -- ADP is a snake-draft stat and this
 * is an auction.
 *
 * Tags come from computePlayerTags() (src/lib/players/tags.ts) -- ELITE, VALUE,
 * FADE, VOLATILE, SLEEPER -- every one computed from real projection-vs-expert
 * data, never fabricated.
 */

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
import type { PlayerTag } from '@/lib/players/tags'

// --- Tag styling (keyed by real tag id) ---

interface TagStyle {
  bgClass: string
  textClass: string
  label: string
  icon: typeof Target
  glow?: boolean
}

const TAG_STYLE: Record<PlayerTag['id'], TagStyle> = {
  elite: { bgClass: 'bg-[#2ff801]/20', textClass: 'text-[#2ff801]', label: 'ELITE', icon: Zap, glow: true },
  value: { bgClass: 'bg-[#8bacff]/20', textClass: 'text-[#8bacff]', label: 'VALUE', icon: TrendingUp },
  sleeper: { bgClass: 'bg-[#2ff801]/15', textClass: 'text-[#2ff801]', label: 'SLEEPER', icon: Star },
  volatile: { bgClass: 'bg-[#f5b301]/15', textClass: 'text-[#f5b301]', label: 'VOLATILE', icon: AlertTriangle },
  fade: { bgClass: 'bg-[#ff716c]/20', textClass: 'text-[#ff716c]', label: 'FADE', icon: TrendingDown },
}

// TARGET / AVOID user badge styles
const TARGET_STYLE: TagStyle = { bgClass: 'bg-[#2ff801]/30', textClass: 'text-[#2ff801]', label: 'TARGET', icon: Target, glow: true }
const AVOID_STYLE: TagStyle = { bgClass: 'bg-[#ff716c]/25', textClass: 'text-[#ff716c]', label: 'AVOID', icon: Ban }

// Priority order for the single compact-view badge.
const TAG_PRIORITY: PlayerTag['id'][] = ['elite', 'value', 'sleeper', 'fade', 'volatile']
const POSITIVE_TAGS: PlayerTag['id'][] = ['elite', 'value', 'sleeper']
const NEGATIVE_TAGS: PlayerTag['id'][] = ['fade']

// --- Component Props ---

interface FFIPlayerIntelCardProps {
  rank: number
  player: Player
  tags: PlayerTag[]
  isTarget: boolean
  isAvoid: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  onToggleTarget?: () => void
  onToggleAvoid?: () => void
  isTagLoading?: boolean
  dismissedSystemTags?: string[]
  onDismissSystemTag?: (tag: string) => void
  onUndismissSystemTag?: (tag: string) => void
}

// --- Component ---

export function FFIPlayerIntelCard({
  rank,
  player,
  tags,
  isTarget,
  isAvoid,
  isExpanded = false,
  onToggleExpand,
  onToggleTarget,
  onToggleAvoid,
  isTagLoading = false,
  dismissedSystemTags = [],
  onDismissSystemTag,
  onUndismissSystemTag,
}: FFIPlayerIntelCardProps) {
  const rankDisplay = rank.toString().padStart(2, '0')

  // Visible (non-dismissed) tags.
  const visibleTags = tags.filter((t) => !dismissedSystemTags.includes(t.id))

  // Compact-view primary badge: TARGET > AVOID > highest-priority tag.
  const primaryBadge = ((): { style: TagStyle } | null => {
    if (isTarget) return { style: TARGET_STYLE }
    if (isAvoid) return { style: AVOID_STYLE }
    for (const id of TAG_PRIORITY) {
      const found = visibleTags.find((t) => t.id === id)
      if (found) return { style: TAG_STYLE[found.id] }
    }
    return null
  })()

  const isHighlighted = isTarget || visibleTags.some((t) => POSITIVE_TAGS.includes(t.id))
  const isNegative = isAvoid || visibleTags.some((t) => NEGATIVE_TAGS.includes(t.id))

  // Real value fields.
  const value = player.consensusAuctionValue
  const market = player.marketAuctionValue
  const projPts = player.projectedPoints
  const posRank = player.positionRankByPoints
  const posRankLabel = posRank ? `${player.position}${posRank}` : null

  return (
    <div className="relative group">
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
              {projPts != null && (
                <>
                  {' · '}
                  <span className="text-[#deedf9] font-bold">{Math.round(projPts)} PTS</span>
                </>
              )}
              {posRankLabel && (
                <>
                  {' • '}
                  <span className="text-[#deedf9] font-bold">{posRankLabel}</span>
                </>
              )}
            </p>

            {/* Primary badge in compact view */}
            {!isExpanded && primaryBadge && (
              <div className="flex gap-2 mt-2">
                <span
                  className={`
                    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider
                    ${primaryBadge.style.bgClass} ${primaryBadge.style.textClass}
                    ${primaryBadge.style.glow ? 'shadow-[0_0_8px_rgba(47,248,1,0.4)]' : ''}
                  `}
                >
                  <primaryBadge.style.icon className="h-3 w-3" />
                  {primaryBadge.style.label}
                </span>
                {visibleTags.length > 1 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold text-[#697782]">
                    +{visibleTags.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Value display -- REAL VORP value for Joe's league + market anchor */}
          <div className="text-right flex-shrink-0">
            <div className="font-body text-[8px] text-[#697782] font-bold uppercase tracking-widest">
              Your value
            </div>
            <div
              className={`
                font-headline text-xl sm:text-2xl font-bold leading-none mt-0.5
                ${value > 0 ? 'text-[#2ff801]' : 'text-[#9eadb8]'}
              `}
            >
              {value > 0 ? `$${value}` : '$1'}
            </div>
            {market != null && market > 0 && (
              <div className="font-body text-[10px] text-[#9eadb8] mt-1">
                market <span className="text-[#deedf9] font-bold">~${Math.round(market)}</span>
              </div>
            )}
          </div>

          {/* Expand icon */}
          <button className="text-[#9eadb8]/40 hover:text-[#9eadb8] transition-colors ml-1">
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-[#8bacff]/10 space-y-4">
            {/* Value breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg py-2" style={{ background: 'rgba(47,248,1,0.06)' }}>
                <div className="text-[9px] text-[#697782] uppercase tracking-widest font-bold">Your value</div>
                <div className="font-headline text-lg font-bold text-[#2ff801]">{value > 0 ? `$${value}` : '$1'}</div>
              </div>
              <div className="rounded-lg py-2" style={{ background: 'rgba(139,172,255,0.06)' }}>
                <div className="text-[9px] text-[#697782] uppercase tracking-widest font-bold">Market</div>
                <div className="font-headline text-lg font-bold text-[#deedf9]">
                  {market != null && market > 0 ? `~$${Math.round(market)}` : '-'}
                </div>
              </div>
              <div className="rounded-lg py-2" style={{ background: 'rgba(139,172,255,0.06)' }}>
                <div className="text-[9px] text-[#697782] uppercase tracking-widest font-bold">Proj Pts</div>
                <div className="font-headline text-lg font-bold text-[#deedf9]">{projPts != null ? Math.round(projPts) : '-'}</div>
              </div>
            </div>

            {/* Tags with reasoning */}
            <div>
              <h4 className="text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
                Draft Intel
              </h4>

              {/* User tags */}
              {(isTarget || isAvoid) && (
                <div className="space-y-2 mb-3">
                  {isTarget && (
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-[#2ff801]/30 text-[#2ff801] shadow-[0_0_8px_rgba(47,248,1,0.4)] shrink-0">
                        <Target className="h-3 w-3" />
                        TARGET
                      </span>
                      <span className="text-[10px] text-[#9eadb8] leading-relaxed">
                        You&apos;ve marked this player as a draft target
                      </span>
                    </div>
                  )}
                  {isAvoid && (
                    <div className="flex items-start gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-[#ff716c]/25 text-[#ff716c] shrink-0">
                        <Ban className="h-3 w-3" />
                        AVOID
                      </span>
                      <span className="text-[10px] text-[#9eadb8] leading-relaxed">
                        You&apos;ve marked this player to avoid
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* System tags (real, computed) */}
              {tags.length > 0 ? (
                <div className="space-y-2">
                  {tags.map((tag) => {
                    const style = TAG_STYLE[tag.id]
                    const Icon = style.icon
                    const isDismissed = dismissedSystemTags.includes(tag.id)
                    return (
                      <div key={tag.id} className={`flex items-start gap-2 ${isDismissed ? 'opacity-40' : ''}`}>
                        <span
                          className={`
                            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider shrink-0
                            ${isDismissed ? 'bg-[#8bacff]/10 text-[#697782]' : `${style.bgClass} ${style.textClass}`}
                          `}
                        >
                          <Icon className="h-3 w-3" />
                          {style.label}
                        </span>
                        <span className="text-[10px] text-[#9eadb8] leading-relaxed flex-1">
                          {isDismissed ? <span className="text-[#697782] italic">Dismissed</span> : tag.hint}
                        </span>
                        {isDismissed ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); onUndismissSystemTag?.(tag.id) }}
                            disabled={isTagLoading}
                            className="text-[9px] text-[#8bacff] hover:text-[#deedf9] transition-colors shrink-0 disabled:opacity-50"
                          >
                            restore
                          </button>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDismissSystemTag?.(tag.id) }}
                            disabled={isTagLoading}
                            className="text-[#697782] hover:text-[#ff716c] transition-colors shrink-0 disabled:opacity-50 opacity-0 group-hover:opacity-100"
                            title="Dismiss tag"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : !isTarget && !isAvoid && (
                <p className="text-[10px] text-[#697782] italic">No standout signals for this player</p>
              )}
            </div>

            {/* User tag controls */}
            <div>
              <h4 className="text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
                Your Tags
              </h4>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTarget?.() }}
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
                  {isTarget ? <><Check className="h-3.5 w-3.5" />TARGET SET</> : <><Target className="h-3.5 w-3.5" />Mark as Target</>}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onToggleAvoid?.() }}
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
                  {isAvoid ? <><X className="h-3.5 w-3.5" />AVOIDING</> : <><Ban className="h-3.5 w-3.5" />Mark to Avoid</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
