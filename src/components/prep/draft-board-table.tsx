'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Target, Ban, ChevronDown, Sparkles, Check, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat } from '@/lib/players/types'
import { computeValueRange } from '@/lib/players/value-range'
import type { EnrichedPlayer } from '@/lib/research/dataset-types'
import { Nameplate } from '@/components/ui/shield'

interface DraftBoardTableProps {
  players: ScoredPlayer[]
  format: DraftFormat
  onToggleTarget?: (playerId: string) => Promise<void>
  onToggleAvoid?: (playerId: string) => Promise<void>
  isTagLoading?: boolean
  /** Optional dataset enrichment (W0 seam), keyed by player id. Absent entirely
   *  or absent per-row both degrade silently - the row renders exactly as it
   *  does today when there is no match. */
  enrichmentMap?: Map<string, EnrichedPlayer>
}

const POS_COLORS: Record<string, { bg: string; text: string }> = {
  QB:  { bg: 'rgba(255,110,138,0.18)', text: 'var(--ffi-pos-qb)' },
  RB:  { bg: 'rgba(86,224,160,0.18)',  text: 'var(--ffi-pos-rb)' },
  WR:  { bg: 'rgba(108,168,255,0.18)', text: 'var(--ffi-pos-wr)' },
  TE:  { bg: 'rgba(255,176,92,0.18)',  text: 'var(--ffi-pos-te)' },
  K:   { bg: 'rgba(167,139,250,0.18)', text: 'var(--ffi-pos-k)' },
  DEF: { bg: 'rgba(99,115,150,0.18)',  text: 'var(--ffi-pos-def)' },
}

function PositionChip({ position }: { position: string }) {
  const colors = POS_COLORS[position] ?? { bg: 'rgba(150,180,255,0.12)', text: 'var(--ffi-ink-2)' }
  return (
    <span
      className="font-bold text-[11px] px-[7px] py-[4px] rounded-[7px] flex-shrink-0 leading-none"
      style={{ fontFamily: 'var(--font-cond)', background: colors.bg, color: colors.text }}
    >
      {position}
    </span>
  )
}

function generateInsight(sp: ScoredPlayer, format: DraftFormat): string {
  const p = sp.player
  const boostText = sp.boosts.length > 0 ? sp.boosts.slice(0, 2).join(', ') : ''

  if (sp.targetStatus === 'target') {
    return `High-value target. ${boostText ? `Boosted by: ${boostText}.` : ''} Strategy alignment score indicates strong fit for your build.`
  }
  if (sp.targetStatus === 'avoid') {
    return `Below strategy threshold. Consider alternatives at ${p.position} unless price drops significantly.`
  }

  const valueContext = format === 'auction'
    ? `Projected at $${sp.adjustedAuctionValue ?? p.consensusAuctionValue}.`
    : `ADP suggests round ${Math.ceil(p.adp / 12)} selection.`

  return `${valueContext} ${boostText ? `Strategy factors: ${boostText}.` : 'Neutral fit for current strategy.'}`
}

interface PlayerCardProps {
  sp: ScoredPlayer
  rank: number
  format: DraftFormat
  isExpanded: boolean
  onToggle: () => void
  onToggleTarget?: (playerId: string) => Promise<void>
  onToggleAvoid?: (playerId: string) => Promise<void>
  isTagLoading?: boolean
  enrichment?: EnrichedPlayer
}

function PlayerCard({
  sp, rank, format, isExpanded, onToggle,
  onToggleTarget, onToggleAvoid, isTagLoading, enrichment,
}: PlayerCardProps) {
  const p = sp.player
  const isAuction = format === 'auction'
  const value = isAuction
    ? (sp.adjustedAuctionValue ?? p.consensusAuctionValue)
    : (sp.adjustedRoundValue ?? Math.ceil(p.adp / 12))
  const calibratedRange = isAuction ? computeValueRange(p) : undefined

  // League-calibrated three-number view (VAL-1): ceiling (worth) / room
  // (reality) / gap (the play). Falls back to the strategy value when a player
  // has no calibrated fields (legacy/unranked rows).
  const ceiling = p.ceilingValue ?? value
  const room = p.expectedRoomPrice
  const gap = p.valueGap
  // Expert-corroboration gate (VAL-2.2): the pocket chip must match the card's
  // POCKET tag, which is suppressed when experts are wildly split (std >= 20 =
  // VOLATILE). The hot chip (negative gap) is never gated, same as the TAX tag,
  // so the two views can't disagree (see tags.ts header invariant).
  const expertsSplit = (p.rankSpread?.std ?? 0) >= 20
  const gapChip =
    gap == null || Math.abs(gap) < 4 || (gap > 0 && expertsSplit)
      ? null
      : gap > 0
        ? {
            label: `+$${gap} pocket`,
            color: 'var(--ffi-blue)',
            bg: 'rgba(95,168,224,0.12)',
            border: 'rgba(95,168,224,0.28)',
          }
        : {
            label: `$${gap} hot`,
            color: 'var(--ffi-danger)',
            bg: 'rgba(255,110,138,0.10)',
            border: 'rgba(255,110,138,0.22)',
          }

  const isElite = rank <= 24
  const score = sp.strategyScore
  const scoreTier = score >= 75 ? 'high' : score >= 55 ? 'mid' : 'low'
  const scoreBarColor = { high: 'var(--ffi-blue-bright)', mid: 'var(--ffi-blue)', low: 'var(--ffi-ink-3)' }[scoreTier]
  const scoreTextColor = scoreBarColor

  return (
    <div
      className={cn('ffi-plate-row rounded-[14px] cursor-pointer transition-colors', sp.targetStatus === 'avoid' && 'opacity-[0.58]')}
      style={{
        borderTop: '1px solid var(--ffi-hairline)',
        borderRight: '1px solid var(--ffi-hairline)',
        borderBottom: '1px solid var(--ffi-hairline)',
        borderLeft: sp.targetStatus === 'target'
          ? '2.5px solid var(--ffi-blue)'
          : '1px solid var(--ffi-hairline)',
        padding: '12px 14px',
      }}
      onClick={onToggle}
    >
      {/* Main row */}
      <div className="flex items-center gap-[10px]">
        {/* Rank */}
        <span
          className="font-bold text-[22px] leading-none w-7 text-center flex-shrink-0"
          style={{
            fontFamily: 'var(--font-mono)',
            color: isElite ? 'var(--ffi-blue-bright)' : 'var(--ffi-blue)',
            letterSpacing: '-0.02em',
          }}
        >
          {String(rank).padStart(2, '0')}
        </span>

        <PositionChip position={p.position} />

        {/* Tier badge — real FantasyPros expert-consensus tier (T1=elite anchor, T2=starter quality, T3-4=depth) */}
        {p.expertTier != null && (
          <span
            className="font-bold text-[10px] px-[6px] py-[3px] rounded-[6px] flex-shrink-0 leading-none"
            style={{
              fontFamily: 'var(--font-cond)',
              letterSpacing: '0.04em',
              background: p.expertTier === 1
                ? 'rgba(166,60,65,0.16)'
                : p.expertTier === 2
                  ? 'rgba(95,168,224,0.12)'
                  : 'rgba(150,180,255,0.06)',
              color: p.expertTier === 1
                ? 'var(--ffi-gold)'
                : p.expertTier === 2
                  ? 'var(--ffi-blue-bright)'
                  : 'var(--ffi-ink-3)',
              border: `1px solid ${
                p.expertTier === 1
                  ? 'rgba(166,60,65,0.42)'
                  : p.expertTier === 2
                    ? 'rgba(95,168,224,0.30)'
                    : 'rgba(150,180,255,0.10)'
              }`,
            }}
          >
            T{p.expertTier}
          </span>
        )}

        {/* Name + meta + score bar */}
        <div className="flex-1 min-w-0">
          <div
            className="font-extrabold text-[16px] leading-none text-white truncate"
            style={{ fontFamily: 'var(--font-cond)' }}
          >
            {p.name}
          </div>
          <div
            className="text-[10px] mt-[3px]"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink-3)', letterSpacing: '0.02em' }}
          >
            {p.team} &middot; BYE {p.byeWeek}
          </div>
          {/* Score bar */}
          <div className="flex items-center gap-[6px] mt-[5px]">
            <div className="flex-1 rounded-full overflow-hidden" style={{ height: '3px', background: 'rgba(255,255,255,0.07)' }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${score}%`, background: scoreBarColor, transition: 'width 0.4s ease' }}
              />
            </div>
            <span
              className="font-bold text-[10px] flex-shrink-0"
              style={{ fontFamily: 'var(--font-mono)', color: scoreTextColor, letterSpacing: '0.02em' }}
            >
              {score}
            </span>
          </div>
        </div>

        {/* Calibrated value: ceiling (worth) / room (reality) / gap (the play).
            League-calibrated on Joe's 16-yr Nasties ledger, not national data. */}
        <div className="text-right flex-shrink-0">
          <div
            className="font-bold text-[20px] leading-none"
            style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-blue)', letterSpacing: '-0.01em' }}
          >
            {isAuction ? `$${ceiling}` : `Rd ${value}`}
          </div>
          {isAuction && room != null && (
            <div
              className="text-[10px] mt-[3px]"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink-3)' }}
            >
              room ~${room}
            </div>
          )}
          {isAuction && gapChip && (
            <div
              className="inline-block mt-[4px] font-bold text-[9px] uppercase rounded-[5px] px-[5px] py-[2px] leading-none"
              style={{
                fontFamily: 'var(--font-cond)',
                letterSpacing: '0.06em',
                background: gapChip.bg,
                color: gapChip.color,
                border: `1px solid ${gapChip.border}`,
              }}
            >
              {gapChip.label}
            </div>
          )}
        </div>

        {/* Chevron */}
        <ChevronDown
          className={cn('flex-shrink-0 transition-transform opacity-40', isExpanded && 'rotate-180')}
          style={{ width: 15, height: 15, color: 'var(--ffi-ink-2)' }}
        />
      </div>

      {/* Target / Avoid badge */}
      {sp.isUserTarget && (
        <div
          className="inline-flex items-center gap-1 mt-[6px] rounded-full font-bold uppercase"
          style={{
            fontFamily: 'var(--font-cond)',
            fontSize: '9px',
            letterSpacing: '0.14em',
            padding: '2px 7px',
            background: 'rgba(95,168,224,0.15)',
            border: '1px solid rgba(95,168,224,0.30)',
            color: 'var(--ffi-blue)',
            boxShadow: '0 0 10px rgba(95,168,224,0.15)',
          }}
        >
          <Target style={{ width: 10, height: 10 }} />
          TARGET SET
        </div>
      )}
      {sp.isUserAvoid && !sp.isUserTarget && (
        <div
          className="inline-flex items-center gap-1 mt-[6px] rounded-full font-bold uppercase"
          style={{
            fontFamily: 'var(--font-cond)',
            fontSize: '9px',
            letterSpacing: '0.14em',
            padding: '2px 7px',
            background: 'rgba(255,110,138,0.12)',
            border: '1px solid rgba(255,110,138,0.22)',
            color: 'var(--ffi-danger)',
          }}
        >
          <Ban style={{ width: 10, height: 10 }} />
          AVOID
        </div>
      )}

      {/* Boost tags */}
      {sp.boosts.length > 0 && (
        <div className="flex flex-wrap gap-[5px] mt-[7px]">
          {sp.boosts.slice(0, 3).map((boost, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold rounded-[6px]"
              style={{
                fontFamily: 'var(--font-cond)',
                padding: '2px 8px',
                background: 'rgba(77,130,255,0.08)',
                border: '1px solid rgba(77,130,255,0.14)',
                color: 'var(--ffi-blue-bright)',
              }}
            >
              {boost}
            </span>
          ))}
          {sp.boosts.length > 3 && (
            <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink-3)' }}>
              +{sp.boosts.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Expanded section */}
      {isExpanded && (
        <div className="mt-[14px] pt-[13px]" style={{ borderTop: '1px solid rgba(150,180,255,0.07)' }}>
          {/* Insight panel */}
          <div
            className="rounded-[11px] p-[11px_13px]"
            style={{ background: 'rgba(77,130,255,0.07)', border: '1px solid rgba(77,130,255,0.13)' }}
          >
            <div
              className="font-bold text-[9px] uppercase mb-[6px]"
              style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.26em', color: 'var(--ffi-blue-bright)' }}
            >
              Strategy Insight
            </div>
            <div className="text-[12px] leading-[1.50]" style={{ color: 'var(--ffi-ink-2)' }}>
              {generateInsight(sp, format)}
            </div>
            {/* Confidence meter */}
            <div className="flex items-center gap-[8px] mt-[9px]">
              <span
                className="font-bold text-[9px] uppercase flex-shrink-0"
                style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.26em', color: 'var(--ffi-blue-bright)' }}
              >
                Confidence
              </span>
              <div className="flex-1 rounded-full overflow-hidden" style={{ height: '2px', background: 'rgba(255,255,255,0.07)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, score + 20)}%`,
                    background: 'linear-gradient(90deg, var(--ffi-blue), var(--ffi-blue-bright))',
                  }}
                />
              </div>
              <span
                className="font-semibold text-[10px] flex-shrink-0"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-blue-bright)' }}
              >
                {Math.min(100, score + 20)}%
              </span>
            </div>
          </div>

          {/* Tag toggles */}
          {(onToggleTarget || onToggleAvoid) && (
            <div className="flex gap-[8px] mt-[12px]">
              {onToggleTarget && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleTarget(p.id) }}
                  disabled={isTagLoading}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-[7px] py-[10px] px-[14px] rounded-[11px]',
                    'font-bold text-[12px] uppercase transition-all',
                    isTagLoading && 'opacity-50 cursor-not-allowed',
                  )}
                  style={{
                    fontFamily: 'var(--font-cond)',
                    letterSpacing: '0.10em',
                    ...(sp.isUserTarget
                      ? {
                          background: 'rgba(95,168,224,0.14)',
                          border: '1px solid rgba(95,168,224,0.30)',
                          color: 'var(--ffi-blue)',
                          boxShadow: '0 0 14px rgba(95,168,224,0.14)',
                        }
                      : {
                          background: 'var(--ffi-surface-3)',
                          border: '1px solid var(--ffi-hairline)',
                          color: 'var(--ffi-ink-3)',
                        }),
                  }}
                >
                  {isTagLoading
                    ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} />
                    : sp.isUserTarget
                      ? <Check style={{ width: 13, height: 13 }} />
                      : <Target style={{ width: 13, height: 13 }} />
                  }
                  {sp.isUserTarget ? 'Target Set' : 'Target'}
                </button>
              )}
              {onToggleAvoid && (
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleAvoid(p.id) }}
                  disabled={isTagLoading}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-[7px] py-[10px] px-[14px] rounded-[11px]',
                    'font-bold text-[12px] uppercase transition-all',
                    isTagLoading && 'opacity-50 cursor-not-allowed',
                  )}
                  style={{
                    fontFamily: 'var(--font-cond)',
                    letterSpacing: '0.10em',
                    ...(sp.isUserAvoid
                      ? {
                          background: 'rgba(255,110,138,0.12)',
                          border: '1px solid rgba(255,110,138,0.24)',
                          color: 'var(--ffi-danger)',
                        }
                      : {
                          background: 'var(--ffi-surface-3)',
                          border: '1px solid var(--ffi-hairline)',
                          color: 'var(--ffi-ink-3)',
                        }),
                  }}
                >
                  {isTagLoading
                    ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} />
                    : <Ban style={{ width: 13, height: 13 }} />
                  }
                  {sp.isUserAvoid ? 'Avoiding' : 'Avoid'}
                </button>
              )}
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-[12px] mt-[14px]">
            {[
              { k: 'ECR',   v: p.ecrPositionRank != null ? `${p.position}${p.ecrPositionRank}` : '-', color: 'var(--ffi-blue-bright)' },
              { k: 'PTS',   v: p.projectedPoints != null ? String(Math.round(p.projectedPoints)) : '-', color: 'var(--ffi-blue-bright)' },
              {
                k: isAuction ? 'RANGE' : 'ECR',
                v: isAuction && calibratedRange
                  ? calibratedRange.low === calibratedRange.high
                    ? `$${calibratedRange.low}`
                    : `$${calibratedRange.low}-$${calibratedRange.high}`
                  : p.ecrPositionRank != null ? `${p.position}${p.ecrPositionRank}` : String(p.consensusRank),
                color: 'var(--ffi-blue-bright)',
              },
              { k: 'BYE',   v: String(p.byeWeek), color: 'var(--ffi-ink-2)' },
            ].map(({ k, v, color }) => (
              <div key={k}>
                <div
                  className="font-bold text-[9px] uppercase"
                  style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.22em', color: 'var(--ffi-ink-3)' }}
                >
                  {k}
                </div>
                <div
                  className="font-bold text-[16px] mt-[3px] leading-none"
                  style={{ fontFamily: 'var(--font-mono)', color }}
                >
                  {v}
                </div>
              </div>
            ))}
          </div>

          {/* Dataset intel (W0 seam, additive) - land odds + durability-adjusted
              room price. Renders nothing when the dataset has no match or no
              usable fields. */}
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
            ].filter((part): part is string => part !== null)
            if (parts.length === 0) return null
            return (
              <div
                className="text-[11px] mt-[12px]"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-ink-3)' }}
              >
                {parts.join('  ·  ')}
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export function DraftBoardTable({
  players,
  format,
  onToggleTarget,
  onToggleAvoid,
  isTagLoading,
  enrichmentMap,
}: DraftBoardTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (players.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Nameplate className="p-12 text-center">
          <Sparkles
            className="mx-auto mb-2 opacity-50"
            style={{ width: 32, height: 32, color: 'var(--ffi-ink-3)' }}
          />
          <p style={{ color: 'var(--ffi-ink-3)' }}>No players match your filters</p>
        </Nameplate>
      </motion.div>
    )
  }

  return (
    <motion.div className="flex flex-col gap-[6px]" layout>
      <AnimatePresence mode="popLayout">
        {players.map((sp, idx) => (
          <motion.div
            key={sp.player.id}
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              delay: Math.min(idx * 0.02, 0.3),
            }}
          >
            <PlayerCard
              sp={sp}
              rank={idx + 1}
              format={format}
              isExpanded={expandedId === sp.player.id}
              onToggle={() => handleToggle(sp.player.id)}
              onToggleTarget={onToggleTarget}
              onToggleAvoid={onToggleAvoid}
              isTagLoading={isTagLoading}
              enrichment={enrichmentMap?.get(sp.player.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
