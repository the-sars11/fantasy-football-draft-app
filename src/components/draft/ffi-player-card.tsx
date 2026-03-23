'use client'

/**
 * FFIPlayerCard (FF-097)
 *
 * Premium player card ported from UI/draft_board/code.html
 * Uses "Tactical Hologram" design system with glass-panel styling.
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, Target, Ban } from 'lucide-react'
import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat } from '@/lib/supabase/database.types'
import type { Explanation } from '@/lib/draft/explain'
import { FFIAIInsight } from './ffi-ai-insight'

interface FFIPlayerCardProps {
  rank: number
  scoredPlayer: ScoredPlayer
  format: DraftFormat
  isExpanded?: boolean
  onToggleExpand?: () => void
  getExplanation?: (scored: ScoredPlayer) => Explanation | null
}

// Badge type mappings
type BadgeType = 'target' | 'elite-tier' | 'sleeper' | 'avoid' | 'recommended' | 'best-available'

function getBadgeClasses(type: BadgeType): string {
  switch (type) {
    case 'target':
    case 'recommended':
      return 'bg-secondary-container/30 text-[#2ff801]'
    case 'elite-tier':
      return 'bg-[#8bacff]/20 text-[#8bacff]'
    case 'sleeper':
      return 'bg-secondary-container/30 text-[#2ff801]'
    case 'avoid':
      return 'bg-[#9f0519]/20 text-[#ff716c]'
    case 'best-available':
      return 'bg-[#8bacff]/20 text-[#8bacff]'
    default:
      return 'bg-surface-container-high text-on-surface-variant'
  }
}

function getBadgeLabel(type: BadgeType): string {
  switch (type) {
    case 'target': return 'TARGET'
    case 'elite-tier': return 'ELITE TIER'
    case 'sleeper': return 'SLEEPER VALUE'
    case 'avoid': return 'AVOID OVERBID'
    case 'recommended': return 'RECOMMENDED'
    case 'best-available': return 'BEST AVAILABLE'
    default: return ''
  }
}

export function FFIPlayerCard({
  rank,
  scoredPlayer,
  format,
  isExpanded = false,
  onToggleExpand,
  getExplanation,
}: FFIPlayerCardProps) {
  const player = scoredPlayer.player
  const isAuction = format === 'auction'
  const explanation = isExpanded && getExplanation ? getExplanation(scoredPlayer) : null

  // Determine badges based on player status
  const badges: BadgeType[] = []
  if (scoredPlayer.targetStatus === 'target') badges.push('target')
  if (scoredPlayer.targetStatus === 'avoid') badges.push('avoid')
  if (scoredPlayer.strategyScore >= 85) badges.push('elite-tier')
  else if (scoredPlayer.strategyScore >= 70 && scoredPlayer.targetStatus !== 'target') badges.push('sleeper')

  // Format rank with leading zero
  const rankDisplay = rank.toString().padStart(2, '0')

  // Calculate value display
  const auctionValue = scoredPlayer.adjustedAuctionValue ?? player.consensusAuctionValue
  const roundValue = scoredPlayer.adjustedRoundValue ?? Math.round(player.adp)

  // Calculate value range (±5% for auction, ±1 for rounds)
  const valueRangeLow = isAuction
    ? Math.round(auctionValue * 0.94)
    : Math.max(1, roundValue - 1)
  const valueRangeHigh = isAuction
    ? Math.round(auctionValue * 1.06)
    : roundValue + 1

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

            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex gap-2 mt-2 flex-wrap">
                {badges.map((badge) => (
                  <span
                    key={badge}
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${getBadgeClasses(badge)}`}
                  >
                    {getBadgeLabel(badge)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Value display */}
          <div className="text-right flex-shrink-0">
            <div className={`font-headline text-2xl font-bold ${isHighlighted ? 'text-[#2ff801]' : 'text-[#deedf9]'}`}>
              {isAuction ? `$${auctionValue}` : `Rd ${roundValue}`}
            </div>
            <div className="font-body text-[10px] text-[#9eadb8]">
              {isAuction
                ? `$${valueRangeLow}-$${valueRangeHigh} RANGE`
                : `ADP ${player.adp > 0 ? player.adp.toFixed(1) : '—'}`
              }
            </div>
          </div>

          {/* Expand icon */}
          <button className="text-[#9eadb8]/40 hover:text-[#9eadb8] transition-colors ml-1">
            {isExpanded
              ? <ChevronUp className="w-5 h-5" />
              : <ChevronDown className="w-5 h-5" />
            }
          </button>
        </div>

        {/* Expanded AI Insight section */}
        {isExpanded && explanation && (
          <FFIAIInsight
            explanation={explanation}
            confidence={scoredPlayer.strategyScore}
          />
        )}
      </div>
    </div>
  )
}