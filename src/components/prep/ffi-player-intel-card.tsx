'use client'

/**
 * FFIPlayerIntelCard
 *
 * Player card for the Player Browser. Enriched in S3 (FB-9/10/13/14):
 *   - real ESPN headshot (name -> espnId -> CDN, silhouette fallback)   [FB-13]
 *   - value shown as a RANGE ($low-$high) not a false-precision point    [FB-10]
 *   - a one-line, league-specific recommendation strip                   [FB-13]
 *   - dollar-based, sourced tags (POCKET/TAX/INJURY/…)                    [FB-9]
 *   - a "how this is calculated / sources" popover on every card         [FB-14]
 *
 * Every number traces to real data: VORP worth (ESPN 2026 full-PPR,
 * roster-aware), the 16-yr Nasties room-price ledger, FantasyPros ECR/tier/std,
 * and injury status. Nothing fabricated. No ADP (that's a snake stat; this is an
 * auction). All of it re-derives on each pull, so a fresh fetch refreshes values.
 */

import { useState } from 'react'
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
  Activity,
  Info,
  Check,
  X,
} from 'lucide-react'
import type { Player } from '@/lib/players/types'
import type { PlayerTag, PlayerTagId } from '@/lib/players/tags'
import { computeValueRange } from '@/lib/players/value-range'
import { computeRecommendation } from '@/lib/players/recommendation'
import { headshotUrl, SILHOUETTE_SRC } from '@/lib/players/headshot'
import { CALIBRATION_ERA, CALIBRATION_DRAFTS_USED } from '@/lib/draft/league-calibration'

// --- Tag styling (keyed by real tag id). Labels come from the tag itself
//     (they carry dynamic dollars, e.g. "+$21 POCKET"). ---

interface TagStyle {
  bgClass: string
  textClass: string
  icon: typeof Target
  glow?: boolean
}

const TAG_STYLE: Record<PlayerTagId, TagStyle> = {
  elite: { bgClass: 'bg-[#2ff801]/18', textClass: 'text-[#2ff801]', icon: Zap, glow: true },
  pocket: { bgClass: 'bg-[#2ff801]/14', textClass: 'text-[#2ff801]', icon: TrendingUp },
  tax: { bgClass: 'bg-[#ff716c]/16', textClass: 'text-[#ff716c]', icon: TrendingDown },
  volatile: { bgClass: 'bg-[#f5b301]/15', textClass: 'text-[#f5b301]', icon: AlertTriangle },
  injury: { bgClass: 'bg-[#f5b301]/13', textClass: 'text-[#f5b301]', icon: Activity },
  sleeper: { bgClass: 'bg-[#8bacff]/16', textClass: 'text-[#8bacff]', icon: Star },
}

// TARGET / AVOID user badge styles
const TARGET_STYLE: TagStyle = { bgClass: 'bg-[#2ff801]/30', textClass: 'text-[#2ff801]', icon: Target, glow: true }
const AVOID_STYLE: TagStyle = { bgClass: 'bg-[#ff716c]/25', textClass: 'text-[#ff716c]', icon: Ban }

// Priority order for the single compact-view badge.
const TAG_PRIORITY: PlayerTagId[] = ['elite', 'pocket', 'sleeper', 'tax', 'volatile', 'injury']
const POSITIVE_TAGS: PlayerTagId[] = ['elite', 'pocket', 'sleeper']
const NEGATIVE_TAGS: PlayerTagId[] = ['tax']

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
  const [showCalc, setShowCalc] = useState(false)
  const rankDisplay = rank.toString().padStart(2, '0')

  // Visible (non-dismissed) tags.
  const visibleTags = tags.filter((t) => !dismissedSystemTags.includes(t.id))

  // Compact-view primary badge: TARGET > AVOID > highest-priority tag.
  const primaryBadge = ((): { style: TagStyle; label: string } | null => {
    if (isTarget) return { style: TARGET_STYLE, label: 'TARGET' }
    if (isAvoid) return { style: AVOID_STYLE, label: 'AVOID' }
    for (const id of TAG_PRIORITY) {
      const found = visibleTags.find((t) => t.id === id)
      if (found) return { style: TAG_STYLE[found.id], label: found.label }
    }
    return null
  })()

  const isHighlighted = isTarget || visibleTags.some((t) => POSITIVE_TAGS.includes(t.id))
  const isNegative = isAvoid || visibleTags.some((t) => NEGATIVE_TAGS.includes(t.id))

  // Real value fields + derived S3 model.
  const market = player.marketAuctionValue
  const projPts = player.projectedPoints
  const posRank = player.positionRankByPoints
  const posRankLabel = posRank ? `${player.position}${posRank}` : null

  const range = computeValueRange(player)
  const rec = computeRecommendation(player)
  const isTax = (player.valueGap ?? 0) <= -4
  const rangeLabel = range.low === range.high ? `$${range.base}` : `$${range.low}-${range.high}`
  const rangeColor = isTax ? 'text-[#deedf9]' : 'text-[#2ff801]'

  // Range bar geometry (only when there's a real spread). Scaled 0..high.
  const showBar = range.high > range.low && range.high > 0
  const fillLeft = showBar ? (range.low / range.high) * 100 : 0
  const fillWidth = showBar ? ((range.high - range.low) / range.high) * 100 : 0
  const baseLeft = showBar ? (range.base / range.high) * 100 : 0

  // Headshot with silhouette fallback (guarded against error loops).
  const shot = headshotUrl(player.name) ?? SILHOUETTE_SRC

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

          {/* Headshot (FB-13) */}
          <img
            src={shot}
            alt=""
            loading="lazy"
            onError={(e) => {
              if (!e.currentTarget.src.endsWith(SILHOUETTE_SRC)) e.currentTarget.src = SILHOUETTE_SRC
            }}
            className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0 rounded-xl object-cover bg-[#15181d] border border-[#8bacff]/10"
          />

          {/* Rank number */}
          <div
            className={`
              font-headline text-2xl sm:text-3xl font-extrabold tracking-tighter italic hidden sm:block
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
                  {primaryBadge.label}
                </span>
                {visibleTags.length > 1 && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold text-[#697782]">
                    +{visibleTags.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Value RANGE (FB-10) + market anchor */}
          <div className="text-right flex-shrink-0">
            <div className="font-body text-[8px] text-[#697782] font-bold uppercase tracking-widest">
              Your value
            </div>
            <div className={`font-headline text-lg sm:text-xl font-bold leading-none mt-0.5 whitespace-nowrap ${rangeColor}`}>
              {rangeLabel}
            </div>
            <div className="font-body text-[10px] text-[#9eadb8] mt-1 whitespace-nowrap">
              base <span className="text-[#deedf9] font-bold">${range.base}</span>
              {market != null && market > 0 && <> · mkt ~${Math.round(market)}</>}
            </div>
          </div>

          {/* Info (how-calculated) + expand */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setShowCalc((v) => !v) }}
              className={`transition-colors ${showCalc ? 'text-[#8bacff]' : 'text-[#9eadb8]/40 hover:text-[#9eadb8]'}`}
              aria-label="How this is calculated"
              title="How this is calculated"
            >
              <Info className="w-4 h-4" />
            </button>
            <button className="text-[#9eadb8]/40 hover:text-[#9eadb8] transition-colors" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Range bar (compact) */}
        {showBar && (
          <div className="mx-4 sm:mx-5 mb-2 h-[5px] rounded-full bg-[#8bacff]/10 relative overflow-hidden">
            <div
              className={`absolute h-full ${isTax ? 'bg-[#ff716c]/50' : 'bg-[#2ff801]/55'}`}
              style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
            />
            <div className="absolute w-0.5 h-full bg-[#deedf9]" style={{ left: `${baseLeft}%` }} />
          </div>
        )}

        {/* Recommendation strip (FB-13) */}
        <div
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 border-t border-[#8bacff]/10"
          style={{
            background:
              rec.intent === 'pass'
                ? 'linear-gradient(90deg, rgba(255,113,108,0.09), transparent)'
                : 'linear-gradient(90deg, rgba(47,248,1,0.08), rgba(47,248,1,0.02))',
          }}
        >
          <span className={`text-sm ${rec.intent === 'pass' ? 'text-[#ff716c]' : 'text-[#2ff801]'}`}>▸</span>
          <span className="font-body text-[12px] sm:text-[13px] text-[#deedf9] leading-snug">{rec.line}</span>
        </div>

        {/* How-this-is-calculated popover (FB-14) */}
        {showCalc && (
          <div className="px-4 sm:px-5 py-4 border-t border-[#8bacff]/10 bg-[#101318]/60 space-y-2.5">
            <h4 className="font-headline text-xs font-bold text-[#deedf9] uppercase tracking-wide">
              How this value is calculated
            </h4>

            {/* Range provenance */}
            <div className="flex gap-3 text-[11px]">
              <span className="w-[92px] flex-shrink-0 font-body text-[9px] font-bold uppercase tracking-wider text-[#2ff801] pt-0.5">Range</span>
              <span className="text-[#9eadb8] leading-relaxed">
                {range.source === 'league' ? (
                  <>
                    <span className="text-[#deedf9] font-bold">Worth ${player.ceilingValue}</span> (roster-aware VORP, ESPN 2026 full-PPR) ↔{' '}
                    <span className="text-[#deedf9] font-bold">Room ${player.expectedRoomPrice}</span> (16-yr Nasties price for {posRankLabel ?? 'his rank'}). Band is those two real numbers; base is the midpoint.
                  </>
                ) : range.source === 'national' ? (
                  <>Modeled from national FantasyPros expert-rank spread - no Nasties calibration for this player yet.</>
                ) : (
                  <>A single consensus value - not enough data for a range.</>
                )}
              </span>
            </div>

            {/* Per-tag sources - every tag traces to real data (FB-9) */}
            {visibleTags.map((t) => (
              <div key={t.id} className="flex gap-3 text-[11px]">
                <span className="w-[92px] flex-shrink-0 font-body text-[9px] font-bold uppercase tracking-wider text-[#2ff801] pt-0.5">{t.label}</span>
                <span className="text-[#9eadb8] leading-relaxed">{t.source}</span>
              </div>
            ))}

            {/* Projection */}
            {projPts != null && (
              <div className="flex gap-3 text-[11px]">
                <span className="w-[92px] flex-shrink-0 font-body text-[9px] font-bold uppercase tracking-wider text-[#2ff801] pt-0.5">Projection</span>
                <span className="text-[#9eadb8] leading-relaxed">
                  <span className="text-[#deedf9] font-bold">{Math.round(projPts)} pts</span> - ESPN 2026 full-PPR season projection, your exact scoring.
                </span>
              </div>
            )}

            <p className="pt-2 border-t border-[#8bacff]/10 font-body text-[10px] text-[#697782] leading-relaxed">
              Calibrated on {CALIBRATION_ERA.length} Nasties seasons ({CALIBRATION_DRAFTS_USED} drafts) · sources: ESPN projections · FantasyPros ECR · Nasties auction ledger
            </p>
          </div>
        )}

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 border-t border-[#8bacff]/10 space-y-4">
            {/* Value breakdown - range / market / proj */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg py-2" style={{ background: 'rgba(47,248,1,0.06)' }}>
                <div className="text-[9px] text-[#697782] uppercase tracking-widest font-bold">Value range</div>
                <div className={`font-headline text-lg font-bold ${rangeColor}`}>{rangeLabel}</div>
                <div className="text-[9px] text-[#9eadb8]">base ${range.base}</div>
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
                          {tag.label}
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
