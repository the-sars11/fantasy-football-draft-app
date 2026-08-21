'use client'

/**
 * FFIPlayerIntelCard
 *
 * Player card for the Player Browser. The D0-locked SHIELD layer: the card IS
 * <Nameplate> (gunmetal, shield.tsx) - never a hand-rolled shell. The D4 spec
 * (Joe-approved 2026-08-16, 4th attempt) governs the CONTENT:
 *   - collapsed = one thin ~50px row: position chip | name | tier | value | expand
 *   - NO headshot / NO ALL-CAPS / NO "Your value" label / NO range bar on the face
 *   - tier badge on the face (T1 red = elite, T2 blue, T3+ muted) - the one red signal
 *   - projected points, range bar, and the recommendation live in the EXPANSION
 *   - expansion = labeled groups: Valuation / Outlook / Draft Intel / Your Call / math
 *
 * Every number still traces to real data: VORP worth (ESPN 2026 full-PPR,
 * roster-aware), the 16-yr Nasties room-price ledger, FantasyPros ECR/tier/std,
 * and injury status. Nothing fabricated. No ADP (that's a snake stat; this is an
 * auction). SHIELD palette: steel-blue, brick-red, chrome - no green, no gold.
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
import type { Player, Position } from '@/lib/players/types'
import type { PlayerTag, PlayerTagId } from '@/lib/players/tags'
import type { EnrichedPlayer } from '@/lib/research/dataset-types'
import { computeValueRange } from '@/lib/players/value-range'
import { computeRecommendation } from '@/lib/players/recommendation'
import { CALIBRATION_ERA, CALIBRATION_DRAFTS_USED } from '@/lib/draft/league-calibration'
import { Nameplate } from '@/components/ui/shield'

// --- Tag styling (keyed by real tag id). Labels come from the tag itself
//     (they carry dynamic dollars, e.g. "+$21 POCKET"). SHIELD: positives are
//     steel-blue (never green), tax/injury/volatile carry warning hues. ---

interface TagStyle {
  bgClass: string
  textClass: string
  icon: typeof Target
  glow?: boolean
}

const TAG_STYLE: Record<PlayerTagId, TagStyle> = {
  elite: { bgClass: 'bg-[#5FA8E0]/18', textClass: 'text-[#5FA8E0]', icon: Zap, glow: true },
  pocket: { bgClass: 'bg-[#5FA8E0]/14', textClass: 'text-[#5FA8E0]', icon: TrendingUp },
  tax: { bgClass: 'bg-[#ff716c]/16', textClass: 'text-[#ff716c]', icon: TrendingDown },
  volatile: { bgClass: 'bg-[#f5b301]/15', textClass: 'text-[#f5b301]', icon: AlertTriangle },
  injury: { bgClass: 'bg-[#f5b301]/13', textClass: 'text-[#f5b301]', icon: Activity },
  sleeper: { bgClass: 'bg-[#8bacff]/16', textClass: 'text-[#8bacff]', icon: Star },
}

const POSITIVE_TAGS: PlayerTagId[] = ['elite', 'pocket', 'sleeper']
const NEGATIVE_TAGS: PlayerTagId[] = ['tax']

// Position chip color-encoding (SHIELD v4 --ffi-pos-*). QB/RB/WR/TE carry hue;
// DEF/K fall back to muted steel. `wash` is the faint left-to-right rail tint.
const POS_CHIP: Record<string, { bg: string; wash: string }> = {
  QB: { bg: 'var(--ffi-pos-qb)', wash: 'rgba(255,110,138,0.10)' },
  RB: { bg: 'var(--ffi-pos-rb)', wash: 'rgba(86,224,160,0.10)' },
  WR: { bg: 'var(--ffi-pos-wr)', wash: 'rgba(108,168,255,0.10)' },
  TE: { bg: 'var(--ffi-pos-te)', wash: 'rgba(255,176,92,0.10)' },
}
const POS_CHIP_FALLBACK = { bg: '#64768c', wash: 'rgba(100,118,140,0.10)' }

function posChipFor(position: Position) {
  return POS_CHIP[position] ?? POS_CHIP_FALLBACK
}

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
  tagWeight?: number
  tagSeverity?: string
  onUpdateGrade?: (weight?: number, severity?: string) => void
  /** R7b: solver-driven strategy-fit line, e.g. "Your target -- can bid up to $67, needs QB and 2 FLEX" */
  fitLine?: string
  /** W2: optional dataset enrichment (W0 seam) matched by player id. Absent
   *  entirely (no dataset published yet) or absent for this player both
   *  degrade silently - the card renders exactly as it does today. */
  enrichment?: EnrichedPlayer
}

// --- Component ---

export function FFIPlayerIntelCard({
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
  tagWeight = 5,
  tagSeverity = 'soft',
  onUpdateGrade,
  fitLine,
  enrichment,
}: FFIPlayerIntelCardProps) {
  const [showCalc, setShowCalc] = useState(false)

  // Visible (non-dismissed) tags.
  const visibleTags = tags.filter((t) => !dismissedSystemTags.includes(t.id))

  const isHighlighted = isTarget || visibleTags.some((t) => POSITIVE_TAGS.includes(t.id))
  const isNegative = isAvoid || visibleTags.some((t) => NEGATIVE_TAGS.includes(t.id))

  // Real value fields + derived S3 model.
  const market = player.marketAuctionValue
  const projPts = player.projectedPoints
  const posRank = player.positionRankByPoints // projection rank -> chip number
  const posRankLabel = posRank ? `${player.position}${posRank}` : null
  const expertRankLabel =
    player.ecrPositionRank != null ? `${player.position}${player.ecrPositionRank}` : null

  const range = computeValueRange(player)
  const rec = computeRecommendation(player)
  const isTax = (player.valueGap ?? 0) <= -4
  const rangeLabel = range.low === range.high ? `$${range.base}` : `$${range.low}-${range.high}`

  // Range bar geometry (only when there's a real spread). Scaled 0..high.
  const showBar = range.high > range.low && range.high > 0
  const fillLeft = showBar ? (range.low / range.high) * 100 : 0
  const fillWidth = showBar ? ((range.high - range.low) / range.high) * 100 : 0
  const baseLeft = showBar ? (range.base / range.high) * 100 : 0

  const chip = posChipFor(player.position)

  // Expert-consensus tier badge (real FantasyPros tier; 1 = elite). The one red
  // signal on the face (D4: RED = act-now elite, everything else earns its own tone).
  const tier = player.expertTier
  const tierBadge =
    tier != null ? (
      tier === 1 ? (
        <span
          className="font-headline font-bold text-[11px] leading-none px-[7px] py-[3px] rounded-md text-white"
          style={{ background: '#A63C41', boxShadow: '0 0 11px rgba(166,60,65,0.45)' }}
        >
          T1
        </span>
      ) : tier === 2 ? (
        <span
          className="font-headline font-bold text-[11px] leading-none px-[7px] py-[3px] rounded-md"
          style={{ background: 'rgba(95,168,224,0.12)', color: '#7FC0EA', border: '1px solid rgba(95,168,224,0.5)' }}
        >
          T2
        </span>
      ) : (
        <span
          className="font-headline font-bold text-[11px] leading-none px-[7px] py-[3px] rounded-md"
          style={{ color: '#5e708a', border: '1px solid rgba(180,200,224,0.1)' }}
        >
          T{tier}
        </span>
      )
    ) : null

  // Small position chip (color rail + POS + projection rank), used on face + hero.
  const posChipEl = (
    <div
      className="flex items-baseline justify-center gap-px h-[21px] px-[7px] rounded-md flex-shrink-0"
      style={{ background: chip.bg }}
    >
      <span className="font-headline font-bold text-[11px] leading-none text-[#04070d]">{player.position}</span>
      {posRank != null && (
        <span className="font-mono font-bold text-[9px] leading-none text-[#04070d]/85">{posRank}</span>
      )}
    </div>
  )

  return (
    <div className="relative group">
      {isHighlighted && !isNegative && (
        <div className="absolute inset-0 bg-[#5FA8E0]/5 blur-2xl rounded-2xl -z-10" />
      )}

      <Nameplate
        interactive
        className={`
          overflow-hidden rounded-2xl transition-all
          ${isTarget
            ? 'ring-1 ring-[#5FA8E0]/45 shadow-[0_0_22px_rgba(95,168,224,0.14)]'
            : isNegative
            ? 'ring-1 ring-[#ff716c]/28'
            : ''
          }
        `}
      >
        {/* ---------- COLLAPSED: one thin broadcast row (D4 spec) ---------- */}
        {!isExpanded && (
          <div
            onClick={onToggleExpand}
            className="relative grid items-center gap-3 pl-[13px] pr-3 py-[9px] min-h-[50px] cursor-pointer overflow-hidden"
            style={{
              gridTemplateColumns: 'auto minmax(0,1fr) auto 16px',
              background: `linear-gradient(90deg, ${chip.wash} 0%, transparent 42%)`,
            }}
          >
            {/* color rail */}
            <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: chip.bg }} />
            {isTarget && (
              <div className="flash-streak absolute top-0 left-0 w-full h-full pointer-events-none" />
            )}

            {posChipEl}

            <div className="min-w-0">
              <div className="font-headline font-semibold text-[16px] leading-[1.05] text-[#eaf1f8] truncate">
                {player.name}
              </div>
              <div className="font-body font-semibold text-[10px] tracking-[0.05em] uppercase text-[#5e708a] mt-[2px]">
                {player.team}
                {player.byeWeek > 0 && <> &middot; Bye {player.byeWeek}</>}
              </div>
            </div>

            <div className="flex items-center gap-[10px]">
              {tierBadge}
              <div className="text-right min-w-[58px]">
                <div className="font-mono font-extrabold text-[15px] leading-none text-[#eaf1f8]">{rangeLabel}</div>
                <div className="font-mono font-semibold text-[9.5px] text-[#5e708a] mt-[3px]">base ${range.base}</div>
              </div>
            </div>

            <ChevronDown className="w-4 h-4 text-[#5e708a] justify-self-end" />
          </div>
        )}

        {/* ---------- EXPANDED ---------- */}
        {isExpanded && (
          <>
            {/* HERO */}
            <div
              onClick={onToggleExpand}
              className="relative grid items-center gap-3 pl-[15px] pr-[14px] py-[13px] cursor-pointer overflow-hidden"
              style={{
                gridTemplateColumns: 'auto minmax(0,1fr) auto',
                background: `linear-gradient(90deg, ${chip.wash} 0%, transparent 60%)`,
              }}
            >
              <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: chip.bg }} />
              {posChipEl}
              <div className="min-w-0">
                <div className="font-headline font-bold text-[19px] leading-tight text-[#eaf1f8]">{player.name}</div>
                <div className="font-body font-semibold text-[10px] tracking-[0.05em] uppercase text-[#5e708a] mt-[2px]">
                  {player.team}
                  {player.byeWeek > 0 && <> &middot; Bye {player.byeWeek}</>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-[5px] text-right">
                {tierBadge}
                <div className="font-mono font-extrabold text-[21px] leading-none" style={{ color: '#7FC0EA' }}>
                  {rangeLabel}
                </div>
                <ChevronUp className="w-4 h-4 text-[#5e708a] mt-[2px]" />
              </div>
            </div>

            {/* VALUATION */}
            <div className="pl-[15px] pr-[14px] pt-3 pb-[13px] border-t border-[rgba(180,200,224,0.1)]">
              <div className="font-body font-bold text-[8.5px] tracking-[0.15em] uppercase text-[#5e708a] mb-[9px]">
                Valuation
              </div>
              {showBar && (
                <>
                  <div className="h-[7px] rounded-full relative overflow-hidden" style={{ background: 'rgba(95,168,224,0.12)' }}>
                    <div
                      className="absolute h-full"
                      style={{
                        left: `${fillLeft}%`,
                        width: `${fillWidth}%`,
                        background: isTax ? 'rgba(255,113,108,0.5)' : 'rgba(95,168,224,0.55)',
                      }}
                    />
                    <div className="absolute w-[2px] h-full bg-[#eaf1f8]" style={{ left: `${baseLeft}%` }} />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-[#5e708a] mt-[7px]">
                    <span>room <b className="text-[#eaf1f8] font-bold">${range.low}</b></span>
                    <span>base <b className="text-[#eaf1f8] font-bold">${range.base}</b></span>
                    <span>worth <b className="text-[#eaf1f8] font-bold">${range.high}</b></span>
                  </div>
                </>
              )}
              <div className="grid grid-cols-3 gap-px mt-3 rounded-lg overflow-hidden" style={{ background: 'rgba(180,200,224,0.1)' }}>
                <div className="px-[10px] py-2" style={{ background: 'var(--ffi-surface-1)' }}>
                  <div className="font-body font-bold text-[8px] tracking-[0.1em] uppercase text-[#5e708a]">Market</div>
                  <div className="font-mono font-extrabold text-[14px] text-[#eaf1f8] mt-[3px]">
                    {market != null && market > 0 ? `~$${Math.round(market)}` : '-'}
                  </div>
                </div>
                <div className="px-[10px] py-2" style={{ background: 'var(--ffi-surface-1)' }}>
                  <div className="font-body font-bold text-[8px] tracking-[0.1em] uppercase text-[#5e708a]">Proj Pts</div>
                  <div className="font-mono font-extrabold text-[14px] text-[#eaf1f8] mt-[3px]">
                    {projPts != null ? Math.round(projPts) : '-'}
                  </div>
                </div>
                <div className="px-[10px] py-2" style={{ background: 'var(--ffi-surface-1)' }}>
                  <div className="font-body font-bold text-[8px] tracking-[0.1em] uppercase text-[#5e708a]">Experts</div>
                  <div className="font-mono font-extrabold text-[14px] text-[#eaf1f8] mt-[3px]">{expertRankLabel ?? '-'}</div>
                </div>
              </div>
            </div>

            {/* OUTLOOK */}
            <div className="pl-[15px] pr-[14px] pt-3 pb-[13px] border-t border-[rgba(180,200,224,0.1)]">
              <div className="font-body font-bold text-[8.5px] tracking-[0.15em] uppercase text-[#5e708a] mb-[9px]">
                Outlook
              </div>
              <div className="flex gap-2 items-start">
                <span className={`text-[12px] leading-[1.3] mt-px ${rec.intent === 'pass' ? 'text-[#ff716c]' : 'text-[#5FA8E0]'}`}>▸</span>
                <span className="font-body text-[12.5px] text-[#eaf1f8] leading-[1.45]">{rec.line}</span>
              </div>
              {fitLine && (
                <div className="flex gap-2 items-start mt-[9px]">
                  <span className="text-[#8bacff]/50 text-[10px] shrink-0 mt-px">◆</span>
                  <span className="font-body text-[11px] leading-snug text-[#5e708a]">{fitLine}</span>
                </div>
              )}
              {enrichment && (() => {
                const parts = [
                  enrichment.landProbability != null
                    ? `land ${Math.round(enrichment.landProbability * 100)}%`
                    : null,
                  enrichment.expectedRoomPrice != null
                    ? enrichment.durabilityPriceFactor < 1
                      ? `room $${enrichment.expectedRoomPrice} · ${enrichment.durabilityPriceFactor.toFixed(2)}x`
                      : `room $${enrichment.expectedRoomPrice}`
                    : null,
                  enrichment.valueBand.low !== enrichment.valueBand.high
                    ? `band $${enrichment.valueBand.low}-${enrichment.valueBand.high}`
                    : null,
                ].filter((part): part is string => part !== null)
                if (parts.length === 0) return null
                return (
                  <div className="flex gap-2 items-start mt-[9px]">
                    <span className="text-[10px] shrink-0 mt-px" style={{ color: 'var(--ffi-blue)', opacity: 0.5 }}>▪</span>
                    <span className="font-mono text-[10.5px] leading-snug" style={{ color: 'var(--ffi-ink-3)' }}>
                      {parts.join('  ·  ')}
                    </span>
                  </div>
                )
              })()}
            </div>

            {/* DRAFT INTEL (real, computed tags) */}
            {(tags.length > 0 || isTarget || isAvoid) && (
              <div className="pl-[15px] pr-[14px] pt-3 pb-[13px] border-t border-[rgba(180,200,224,0.1)]">
                <div className="font-body font-bold text-[8.5px] tracking-[0.15em] uppercase text-[#5e708a] mb-[9px]">
                  Draft intel
                </div>

                {(isTarget || isAvoid) && (
                  <div className="space-y-2 mb-3">
                    {isTarget && (
                      <div className="flex items-start gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider bg-[#5FA8E0]/30 text-[#5FA8E0] shadow-[0_0_8px_rgba(95,168,224,0.4)] shrink-0">
                          <Target className="h-3 w-3" />
                          TARGET
                        </span>
                        <span className="text-[10px] text-[#9fb2c6] leading-relaxed">
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
                        <span className="text-[10px] text-[#9fb2c6] leading-relaxed">
                          You&apos;ve marked this player to avoid
                        </span>
                      </div>
                    )}
                  </div>
                )}

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
                          <span className="text-[10px] text-[#9fb2c6] leading-relaxed flex-1">
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
            )}

            {/* YOUR CALL (target / avoid + grades) */}
            <div className="pl-[15px] pr-[14px] pt-3 pb-[13px] border-t border-[rgba(180,200,224,0.1)]">
              <div className="font-body font-bold text-[8.5px] tracking-[0.15em] uppercase text-[#5e708a] mb-[9px]">
                Your call
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTarget?.() }}
                  disabled={isTagLoading}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${isTarget
                      ? 'bg-[#5FA8E0]/30 text-[#5FA8E0] shadow-[0_0_12px_rgba(95,168,224,0.3)]'
                      : 'bg-surface-container-high text-[#9fb2c6] hover:bg-[#5FA8E0]/10 hover:text-[#5FA8E0]'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isTarget ? <><Check className="h-3.5 w-3.5" />Target set</> : <><Target className="h-3.5 w-3.5" />Mark as target</>}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onToggleAvoid?.() }}
                  disabled={isTagLoading}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                    ${isAvoid
                      ? 'bg-[#ff716c]/25 text-[#ff716c]'
                      : 'bg-surface-container-high text-[#9fb2c6] hover:bg-[#ff716c]/10 hover:text-[#ff716c]'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {isAvoid ? <><X className="h-3.5 w-3.5" />Avoiding</> : <><Ban className="h-3.5 w-3.5" />Mark to avoid</>}
                </button>
              </div>

              {/* Grade controls - only shown when a tag is active */}
              {isTarget && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[rgba(180,200,224,0.1)]">
                  <span className="font-body text-[10px] font-bold uppercase tracking-widest text-[#697782] w-16 shrink-0">
                    Priority
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateGrade?.(Math.max(1, tagWeight - 1), undefined)
                      }}
                      disabled={isTagLoading || tagWeight <= 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all bg-[#5FA8E0]/10 text-[#5FA8E0] hover:bg-[#5FA8E0]/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Decrease priority"
                    >
                      −
                    </button>
                    <span className="font-mono text-lg font-bold text-[#5FA8E0] w-6 text-center tabular-nums">
                      {tagWeight}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onUpdateGrade?.(Math.min(10, tagWeight + 1), undefined)
                      }}
                      disabled={isTagLoading || tagWeight >= 10}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold transition-all bg-[#5FA8E0]/10 text-[#5FA8E0] hover:bg-[#5FA8E0]/20 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Increase priority"
                    >
                      +
                    </button>
                    <span className="font-body text-[10px] text-[#697782]">/ 10</span>
                  </div>
                </div>
              )}

              {isAvoid && (
                <div className="flex items-center gap-3 mt-3 pt-3 border-t border-[rgba(180,200,224,0.1)]">
                  <span className="font-body text-[10px] font-bold uppercase tracking-widest text-[#697782] w-16 shrink-0">
                    Severity
                  </span>
                  <div className="flex gap-1.5">
                    {(['soft', 'hard'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={(e) => { e.stopPropagation(); onUpdateGrade?.(undefined, s) }}
                        disabled={isTagLoading}
                        className={`
                          px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all
                          ${tagSeverity === s
                            ? s === 'hard'
                              ? 'bg-[#ff716c]/40 text-[#ff716c] shadow-[0_0_8px_rgba(255,113,108,0.3)]'
                              : 'bg-[#ff716c]/20 text-[#ff716c]'
                            : 'bg-[#8bacff]/8 text-[#697782] hover:text-[#9fb2c6]'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* HOW THIS IS CALCULATED (provenance) */}
            <div className="pl-[15px] pr-[14px] pt-3 pb-[13px] border-t border-[rgba(180,200,224,0.1)]">
              <button
                onClick={(e) => { e.stopPropagation(); setShowCalc((v) => !v) }}
                className={`inline-flex items-center gap-1.5 font-body text-[10px] font-bold uppercase tracking-widest transition-colors ${showCalc ? 'text-[#8bacff]' : 'text-[#5e708a] hover:text-[#9fb2c6]'}`}
              >
                <Info className="w-3.5 h-3.5" />
                {showCalc ? 'Hide the math' : 'How this value is calculated'}
              </button>

              {showCalc && (
                <div className="mt-3 space-y-2.5">
                  <div className="flex gap-3 text-[11px]">
                    <span className="w-[92px] flex-shrink-0 font-body text-[9px] font-bold uppercase tracking-wider text-[#5FA8E0] pt-0.5">Range</span>
                    <span className="text-[#9fb2c6] leading-relaxed">
                      {range.source === 'league' ? (
                        <>
                          <span className="text-[#eaf1f8] font-bold">Worth ${player.ceilingValue}</span> (roster-aware VORP, ESPN 2026 full-PPR) ↔{' '}
                          <span className="text-[#eaf1f8] font-bold">Room ${player.expectedRoomPrice}</span> (16-yr Nasties price for {posRankLabel ?? 'his rank'}). Band is those two real numbers; base is the midpoint.
                        </>
                      ) : range.source === 'national' ? (
                        <>Modeled from national FantasyPros expert-rank spread - no Nasties calibration for this player yet.</>
                      ) : (
                        <>A single consensus value - not enough data for a range.</>
                      )}
                    </span>
                  </div>

                  {visibleTags.map((t) => (
                    <div key={t.id} className="flex gap-3 text-[11px]">
                      <span className="w-[92px] flex-shrink-0 font-body text-[9px] font-bold uppercase tracking-wider text-[#5FA8E0] pt-0.5">{t.label}</span>
                      <span className="text-[#9fb2c6] leading-relaxed">{t.source}</span>
                    </div>
                  ))}

                  {projPts != null && (
                    <div className="flex gap-3 text-[11px]">
                      <span className="w-[92px] flex-shrink-0 font-body text-[9px] font-bold uppercase tracking-wider text-[#5FA8E0] pt-0.5">Projection</span>
                      <span className="text-[#9fb2c6] leading-relaxed">
                        <span className="text-[#eaf1f8] font-bold">{Math.round(projPts)} pts</span> - ESPN 2026 full-PPR season projection, your exact scoring.
                      </span>
                    </div>
                  )}

                  <p className="pt-2 border-t border-[rgba(180,200,224,0.1)] font-body text-[10px] text-[#697782] leading-relaxed">
                    Calibrated on {CALIBRATION_ERA.length} Nasties seasons ({CALIBRATION_DRAFTS_USED} drafts) · sources: ESPN projections · FantasyPros ECR · Nasties auction ledger
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </Nameplate>
    </div>
  )
}
