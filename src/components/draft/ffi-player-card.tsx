'use client'

/**
 * FFIPlayerCard (FF-097, FF-234)
 *
 * Premium player card ported from UI/draft_board/code.html
 * Uses "Tactical Hologram" design system with glass-panel styling.
 *
 * FF-234: Tag Hierarchy Display Logic
 * - Compact view: TARGET overrides all, else show most impactful system tag
 * - Expanded view: show ALL tags with reasoning
 * - Hierarchy: TARGET > BREAKOUT > VALUE > SLEEPER > BUST > AVOID
 */

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Target, Zap, TrendingUp, TrendingDown, Star, AlertTriangle } from 'lucide-react'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat, SystemTag } from '@/lib/supabase/database.types'
import type { Explanation } from '@/lib/draft/explain'
import { FFIAIInsight } from './ffi-ai-insight'

// --- Intel Context Types ---

export interface PlayerIntelDisplay {
  systemTags?: SystemTag[]
  userTags?: string[]
  dismissedSystemTags?: string[]
}

interface FFIPlayerCardProps {
  rank: number
  scoredPlayer: ScoredPlayer
  format: DraftFormat
  isExpanded?: boolean
  onToggleExpand?: () => void
  getExplanation?: (scored: ScoredPlayer) => Explanation | null
  intel?: PlayerIntelDisplay // Optional intel context for tag display
  onBid?: (player: Player) => void
  maxBid?: number | null
  /** FF-278: cross-source ADP divergence (max − min across sources). Show indicator when > 10. */
  adpDivergence?: number
}

// --- Badge Types & Configuration ---

// Extended badge types to include system tags
type BadgeType =
  | 'target'      // User TARGET tag (highest priority)
  | 'breakout'    // System BREAKOUT tag
  | 'value'       // System VALUE tag
  | 'sleeper'     // System SLEEPER tag
  | 'bust'        // System BUST tag
  | 'avoid'       // System/User AVOID tag
  | 'elite-tier'  // Strategy-based (high score)
  | 'recommended'
  | 'best-available'

// Badge hierarchy order (lower index = higher priority in compact view)
const BADGE_HIERARCHY: BadgeType[] = [
  'target',      // 0 - User TARGET always wins
  'breakout',    // 1 - System BREAKOUT
  'value',       // 2 - System VALUE
  'sleeper',     // 3 - System SLEEPER
  'bust',        // 4 - System BUST
  'avoid',       // 5 - System/User AVOID
]

// Badge styling configuration
const BADGE_CONFIG: Record<BadgeType, {
  bgClass: string
  textClass: string
  label: string
  icon?: typeof Target
  glow?: boolean
}> = {
  target: {
    bgClass: 'bg-secondary-container/40',
    textClass: 'text-[#2ff801]',
    label: 'TARGET',
    icon: Target,
    glow: true,
  },
  breakout: {
    bgClass: 'bg-secondary-container/30',
    textClass: 'text-[#2ff801]',
    label: 'BREAKOUT',
    icon: Zap,
  },
  value: {
    bgClass: 'bg-[#8bacff]/20',
    textClass: 'text-[#8bacff]',
    label: 'VALUE',
    icon: TrendingUp,
  },
  sleeper: {
    bgClass: 'bg-secondary-container/30',
    textClass: 'text-[#2ff801]',
    label: 'SLEEPER',
    icon: Star,
  },
  bust: {
    bgClass: 'bg-[#9f0519]/20',
    textClass: 'text-[#ff716c]',
    label: 'BUST',
    icon: TrendingDown,
  },
  avoid: {
    bgClass: 'bg-[#9f0519]/20',
    textClass: 'text-[#ff716c]',
    label: 'AVOID',
    icon: AlertTriangle,
  },
  'elite-tier': {
    bgClass: 'bg-[#8bacff]/20',
    textClass: 'text-[#8bacff]',
    label: 'ELITE TIER',
  },
  recommended: {
    bgClass: 'bg-secondary-container/30',
    textClass: 'text-[#2ff801]',
    label: 'RECOMMENDED',
  },
  'best-available': {
    bgClass: 'bg-[#8bacff]/20',
    textClass: 'text-[#8bacff]',
    label: 'BEST AVAILABLE',
  },
}

function getBadgeClasses(type: BadgeType): string {
  const config = BADGE_CONFIG[type]
  return config ? `${config.bgClass} ${config.textClass}` : 'bg-surface-container-high text-on-surface-variant'
}

function getBadgeLabel(type: BadgeType): string {
  return BADGE_CONFIG[type]?.label ?? ''
}

export function FFIPlayerCard({
  rank,
  scoredPlayer,
  format,
  isExpanded = false,
  onToggleExpand,
  getExplanation,
  intel,
  onBid,
  maxBid,
  adpDivergence,
}: FFIPlayerCardProps) {
  const player = scoredPlayer.player
  const isAuction = format === 'auction'
  const explanation = isExpanded && getExplanation ? getExplanation(scoredPlayer) : null

  // --- FF-234: Tag Hierarchy Display Logic ---
  // Build the full list of badges based on intel + strategy
  const allBadges = useMemo(() => {
    const badges: Array<{ type: BadgeType; reasoning?: string; priority: number }> = []
    const dismissedSet = new Set(intel?.dismissedSystemTags ?? [])

    // 1. User TARGET tag (highest priority)
    const userTags = intel?.userTags ?? []
    if (userTags.includes('target') || scoredPlayer.isUserTarget) {
      badges.push({ type: 'target', reasoning: 'Manually targeted by you', priority: 0 })
    }

    // 2. System tags from intel (BREAKOUT, VALUE, SLEEPER, BUST, AVOID)
    const systemTags = intel?.systemTags ?? []
    for (const sysTag of systemTags) {
      if (dismissedSet.has(sysTag.tag)) continue

      const tagType = sysTag.tag.toLowerCase() as BadgeType
      if (['breakout', 'value', 'sleeper', 'bust', 'avoid'].includes(tagType)) {
        const priority = BADGE_HIERARCHY.indexOf(tagType)
        badges.push({
          type: tagType,
          reasoning: sysTag.reasoning,
          priority: priority >= 0 ? priority : 99,
        })
      }
    }

    // 3. User AVOID tag
    if (userTags.includes('avoid') || scoredPlayer.isUserAvoid) {
      // Only add if not already in badges
      if (!badges.some(b => b.type === 'avoid')) {
        badges.push({ type: 'avoid', reasoning: 'Manually marked to avoid', priority: 5 })
      }
    }

    // 4. Strategy-based fallback badges (only if no intel tags)
    if (badges.length === 0) {
      if (scoredPlayer.targetStatus === 'target') {
        badges.push({ type: 'elite-tier', reasoning: 'High strategy fit score', priority: 10 })
      } else if (scoredPlayer.targetStatus === 'avoid') {
        badges.push({ type: 'avoid', reasoning: 'Low strategy fit score', priority: 5 })
      } else if (scoredPlayer.strategyScore >= 85) {
        badges.push({ type: 'elite-tier', priority: 10 })
      } else if (scoredPlayer.strategyScore >= 70) {
        badges.push({ type: 'sleeper', reasoning: 'Good value pick', priority: 3 })
      }
    }

    // Sort by priority (lower = higher priority)
    return badges.sort((a, b) => a.priority - b.priority)
  }, [intel, scoredPlayer])

  // For compact view: show only the highest priority badge
  const compactBadge = allBadges.length > 0 ? allBadges[0] : null

  // For expanded view: show all badges
  const expandedBadges = allBadges

  // Format rank with leading zero
  const rankDisplay = rank.toString().padStart(2, '0')

  // Calculate value display
  const auctionValue = scoredPlayer.adjustedAuctionValue ?? player.consensusAuctionValue ?? 0
  const roundValue = scoredPlayer.adjustedRoundValue ?? (player.adp > 0 ? Math.round(player.adp) : 0)

  // Calculate value range (±5% for auction, ±1 for rounds)
  const valueRangeLow = isAuction
    ? Math.round(auctionValue * 0.94)
    : Math.max(1, roundValue - 1)
  const valueRangeHigh = isAuction
    ? Math.round(auctionValue * 1.06)
    : roundValue + 1

  // Max bid delta vs consensus (auction only)
  const maxBidDelta = isAuction && maxBid != null
    ? maxBid - (player.consensusAuctionValue ?? 0)
    : null

  // Is this player highlighted (target or high score)?
  const isHighlighted = scoredPlayer.targetStatus === 'target' || scoredPlayer.strategyScore >= 80

  return (
    <div className="relative group">
      {/* Ambient glow for highlighted players */}
      {isHighlighted && (
        <div className="absolute inset-0 bg-[#2ff801]/5 blur-2xl rounded-xl -z-10" />
      )}

      <div className={`
        glass-panel rounded-xl overflow-hidden transition-all cursor-pointer
        ${isHighlighted
          ? 'shadow-[0_0_20px_rgba(47,248,1,0.05)] border border-[#2ff801]/10'
          : 'border border-[#8bacff]/5 hover:border-[#8bacff]/20'
        }
      `}>
        {/* Main card content */}
        <div
          className="p-5 flex items-center gap-4 relative"
          onClick={onToggleExpand}
        >
          {/* Flash streak for highlighted */}
          {isHighlighted && (
            <div className="flash-streak absolute top-0 left-0 w-full h-full pointer-events-none" />
          )}

          {/* Rank number */}
          <div className={`
            font-headline text-3xl font-extrabold tracking-tighter italic
            ${isHighlighted ? 'text-[#8bacff]/30' : 'text-[#8bacff]/20'}
          `}>
            {rankDisplay}
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-headline text-lg font-bold text-[#deedf9] leading-tight truncate">
              {player.name.toUpperCase()}
            </h3>
            <p className="font-body text-[10px] text-[#9eadb8] tracking-widest uppercase mt-0.5">
              {player.team} • {player.position}
              {player.byeWeek > 0 && ` • BYE ${player.byeWeek}`}
            </p>

            {/* Badges - Compact view shows only highest priority badge (FF-234) */}
            {!isExpanded && compactBadge && (
              <div className="flex gap-2 mt-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${getBadgeClasses(compactBadge.type)} ${
                    compactBadge.type === 'target' ? 'shadow-[0_0_8px_rgba(47,248,1,0.4)]' : ''
                  }`}
                >
                  {getBadgeLabel(compactBadge.type)}
                </span>
              </div>
            )}

            {/* Badges - Expanded view shows all badges with reasoning */}
            {isExpanded && expandedBadges.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2">
                {expandedBadges.map((badge, idx) => (
                  <div key={`${badge.type}-${idx}`} className="flex items-start gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider shrink-0 ${getBadgeClasses(badge.type)} ${
                        badge.type === 'target' ? 'shadow-[0_0_8px_rgba(47,248,1,0.4)]' : ''
                      }`}
                    >
                      {getBadgeLabel(badge.type)}
                    </span>
                    {badge.reasoning && (
                      <span className="text-[9px] text-[#9eadb8] leading-tight">
                        {badge.reasoning}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Value display */}
          <div className="text-right flex-shrink-0">
            <div className={`font-headline text-2xl font-bold ${isHighlighted ? 'text-[#2ff801]' : 'text-[#deedf9]'}`}>
              {isAuction ? `$${auctionValue}` : `Rd ${roundValue}`}
            </div>
            <div className="font-body text-[10px] text-[#9eadb8] flex items-center justify-end gap-1.5">
              {isAuction
                ? `$${valueRangeLow}-$${valueRangeHigh} RANGE`
                : `ADP ${player.adp > 0 ? player.adp.toFixed(1) : '—'}`
              }
              {/* FF-278: ADP divergence indicator */}
              {adpDivergence != null && adpDivergence > 10 && (
                <span
                  className="text-[#f97316] font-bold tracking-tight"
                  title={`ADP diverges ${adpDivergence.toFixed(0)} spots across sources`}
                >
                  ↕{adpDivergence.toFixed(0)}
                </span>
              )}
            </div>
            {isAuction && maxBid != null && (
              <div className="mt-1.5 space-y-0.5">
                <div className="font-headline text-sm font-bold text-[#deedf9]">
                  MAX ${maxBid}
                </div>
                <div className={`font-body text-[9px] font-bold tracking-wider ${
                  maxBidDelta != null && maxBidDelta > 2
                    ? 'text-[#2ff801]'
                    : maxBidDelta != null && maxBidDelta < -2
                      ? 'text-[#f97316]'
                      : 'text-[#9eadb8]'
                }`}>
                  {maxBidDelta != null && maxBidDelta > 2
                    ? `+$${maxBidDelta} OVER`
                    : maxBidDelta != null && maxBidDelta < -2
                      ? `−$${Math.abs(maxBidDelta)} UNDER`
                      : 'AT VALUE'
                  }
                </div>
              </div>
            )}
          </div>

          {/* BID nomination button — only rendered when onBid is provided */}
          {onBid && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onBid(player)
              }}
              className="shrink-0 text-[10px] font-bold tracking-widest px-2 py-1 rounded
                         bg-[#8bacff]/10 text-[#8bacff] border border-[#8bacff]/20
                         hover:bg-[#8bacff]/20 active:bg-[#8bacff]/30 transition-colors
                         min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={`Nominate ${player.name} for bidding`}
            >
              BID
            </button>
          )}

          {/* Expand icon */}
          <button className="text-[#9eadb8]/40 hover:text-[#9eadb8] transition-colors ml-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
            {isExpanded
              ? <ChevronUp className="w-5 h-5" />
              : <ChevronDown className="w-5 h-5" />
            }
          </button>
        </div>

        {/* FF-078: Expanded AI Insight section with smooth animation */}
        <AnimatePresence>
          {isExpanded && explanation && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="overflow-hidden"
            >
              <FFIAIInsight
                explanation={explanation}
                confidence={scoredPlayer.strategyScore}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}