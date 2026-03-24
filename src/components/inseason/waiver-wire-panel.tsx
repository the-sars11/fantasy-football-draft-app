'use client'

/**
 * Waiver Wire Panel Component (FF-123)
 *
 * Displays waiver wire recommendations with:
 * - Prioritized pickup list
 * - FAAB bid suggestions
 * - Roster fit indicators
 * - Watchlist functionality
 */

import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Flame,
  Eye,
  Plus,
  ChevronDown,
  ChevronUp,
  Target,
  AlertCircle,
  Calendar,
  Users,
  Zap,
  Star,
} from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFIBadge,
  FFIProgress,
  FFIPositionBadge,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import type { WaiverTarget, WaiverWireAnalysis } from '@/lib/inseason'

// --- Types ---

interface WaiverWirePanelProps {
  analysis: WaiverWireAnalysis
  onAddToWatchlist?: (playerId: string) => void
  onBidOnPlayer?: (playerId: string, amount: number) => void
}

interface WaiverTargetCardProps {
  target: WaiverTarget
  showRosterFit?: boolean
  onAddToWatchlist?: () => void
  onBid?: () => void
}

// --- Trend Direction Config ---

const TREND_CONFIG = {
  rising: { icon: TrendingUp, color: 'text-[#2ff801]', label: 'RISING' },
  falling: { icon: TrendingDown, color: 'text-[#ff716c]', label: 'FALLING' },
  stable: { icon: Target, color: 'text-[#8bacff]', label: 'STABLE' },
}

const COMPETITION_CONFIG = {
  hot: { color: 'text-[#ff716c]', bgColor: 'bg-[#ff716c]/20', label: 'HOT' },
  moderate: { color: 'text-[#ffa500]', bgColor: 'bg-[#ffa500]/20', label: 'MODERATE' },
  low: { color: 'text-[#2ff801]', bgColor: 'bg-[#2ff801]/20', label: 'LOW' },
}

const SCHEDULE_CONFIG = {
  elite: { color: 'text-[#2ff801]', label: 'ELITE SCHEDULE' },
  favorable: { color: 'text-[#2ff801]/80', label: 'FAVORABLE' },
  neutral: { color: 'text-[#8bacff]', label: 'NEUTRAL' },
  tough: { color: 'text-[#ff716c]/80', label: 'TOUGH' },
  brutal: { color: 'text-[#ff716c]', label: 'BRUTAL' },
}

// --- Waiver Target Card ---

function WaiverTargetCard({
  target,
  showRosterFit = false,
  onAddToWatchlist,
  onBid,
}: WaiverTargetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const trend = TREND_CONFIG[target.trendDirection]
  const TrendIcon = trend.icon
  const competition = COMPETITION_CONFIG[target.faabRecommendation.competitionLevel]
  const schedule = SCHEDULE_CONFIG[target.upcomingScheduleRating]

  return (
    <div className="glass-panel rounded-xl overflow-hidden border border-[#8bacff]/10 hover:border-[#8bacff]/20 transition-all">
      {/* Main content */}
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start gap-3">
          {/* Priority rank */}
          <div className="text-center">
            <div className="text-2xl font-headline font-extrabold text-[#8bacff]/30 italic">
              {String(target.priorityRank).padStart(2, '0')}
            </div>
            <div className="flex items-center gap-1 mt-1">
              <TrendIcon className={`w-3 h-3 ${trend.color}`} />
              <span className={`text-[8px] font-bold ${trend.color}`}>
                {target.trendVelocity > 0.5 ? 'HOT' : trend.label}
              </span>
            </div>
          </div>

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-headline text-base font-bold text-[#deedf9] uppercase truncate">
                {target.playerName}
              </h3>
              {target.trendVelocity > 0.7 && (
                <Flame className="w-4 h-4 text-[#ff716c] animate-pulse" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <FFIPositionBadge position={target.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"} />
              <span className="text-[10px] text-[#9eadb8]">{target.team}</span>
              <span className={`text-[10px] ${schedule.color}`}>
                {schedule.label}
              </span>
            </div>

            {/* Roster fit badge */}
            {showRosterFit && target.rosterFit && (
              <div className="flex items-center gap-2 mt-2">
                {target.rosterFit.fillsNeed && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#2ff801]/20 text-[#2ff801] text-[9px] font-bold">
                    <Target className="w-3 h-3" />
                    FILLS NEED
                  </span>
                )}
                {target.rosterFit.wouldStart && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#8bacff]/20 text-[#8bacff] text-[9px] font-bold">
                    <Star className="w-3 h-3" />
                    STARTER
                  </span>
                )}
              </div>
            )}
          </div>

          {/* FAAB recommendation */}
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-[#2ff801]" />
              <span className="text-xl font-headline font-bold text-[#2ff801]">
                {target.faabRecommendation.recommendedBid}
              </span>
            </div>
            <span className={`text-[9px] font-bold ${competition.color}`}>
              {competition.label} DEMAND
            </span>
          </div>

          {/* Expand icon */}
          <button className="text-[#9eadb8]/40 hover:text-[#9eadb8] transition-colors">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Quick stats row */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#8bacff]/10">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-[#697782]" />
            <span className="text-[10px] text-[#9eadb8]">
              {target.ownershipPercent.toFixed(0)}% owned
            </span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#2ff801]" />
            <span className="text-[10px] text-[#9eadb8]">
              +{target.addCount} adds
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-[#8bacff]" />
            <span className="text-[10px] text-[#9eadb8]">
              {target.projectedPoints.toFixed(1)} proj
            </span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-[#8bacff]/10 space-y-4">
          {/* FAAB details */}
          <div>
            <h4 className="text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
              FAAB Recommendation
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-lg bg-surface-container">
                <div className="text-[10px] text-[#697782] uppercase">Bid</div>
                <div className="text-lg font-bold text-[#2ff801]">
                  ${target.faabRecommendation.recommendedBid}
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface-container">
                <div className="text-[10px] text-[#697782] uppercase">Max</div>
                <div className="text-lg font-bold text-[#8bacff]">
                  ${target.faabRecommendation.maxBid}
                </div>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface-container">
                <div className="text-[10px] text-[#697782] uppercase">% Budget</div>
                <div className="text-lg font-bold text-[#9eadb8]">
                  {target.faabRecommendation.bidPercentage}%
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#9eadb8] mt-2 italic">
              {target.faabRecommendation.reasoning}
            </p>
          </div>

          {/* Key factors */}
          {target.keyFactors.length > 0 && (
            <div>
              <h4 className="text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
                Why Target
              </h4>
              <ul className="space-y-1">
                {target.keyFactors.map((factor, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-[11px] text-[#9eadb8]"
                  >
                    <Zap className="w-3 h-3 text-[#2ff801] mt-0.5 shrink-0" />
                    {factor}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Roster fit details */}
          {showRosterFit && target.rosterFit && (
            <div>
              <h4 className="text-[10px] text-[#9eadb8] font-bold uppercase tracking-widest mb-2">
                Roster Fit
              </h4>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`
                    px-2 py-1 rounded-lg text-[10px] font-bold
                    ${target.rosterFit.positionNeed === 'critical'
                      ? 'bg-[#ff716c]/20 text-[#ff716c]'
                      : target.rosterFit.positionNeed === 'moderate'
                      ? 'bg-[#ffa500]/20 text-[#ffa500]'
                      : target.rosterFit.positionNeed === 'depth'
                      ? 'bg-[#8bacff]/20 text-[#8bacff]'
                      : 'bg-surface-container text-[#697782]'
                    }
                  `}
                >
                  {target.rosterFit.positionNeed.toUpperCase()} NEED
                </span>
                <span
                  className={`
                    px-2 py-1 rounded-lg text-[10px] font-bold
                    ${target.rosterFit.playoffSchedule === 'elite'
                      ? 'bg-[#2ff801]/20 text-[#2ff801]'
                      : target.rosterFit.playoffSchedule === 'favorable'
                      ? 'bg-[#2ff801]/10 text-[#2ff801]/80'
                      : target.rosterFit.playoffSchedule === 'tough'
                      ? 'bg-[#ff716c]/10 text-[#ff716c]/80'
                      : 'bg-surface-container text-[#9eadb8]'
                    }
                  `}
                >
                  <Calendar className="w-3 h-3 inline mr-1" />
                  {target.rosterFit.playoffSchedule.toUpperCase()} PLAYOFF SCHED
                </span>
              </div>

              {/* Drop suggestion */}
              {target.rosterFit.droppablePlayer && (
                <div className="mt-2 p-2 rounded-lg bg-[#ff716c]/10 border border-[#ff716c]/20">
                  <span className="text-[10px] text-[#ff716c]">
                    Consider dropping: <strong>{target.rosterFit.droppablePlayer.playerName}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {onBid && (
              <FFIButton variant="primary" size="sm" onClick={onBid} className="flex-1">
                <DollarSign className="w-4 h-4 mr-1" />
                Bid ${target.faabRecommendation.recommendedBid}
              </FFIButton>
            )}
            {onAddToWatchlist && (
              <FFIButton variant="secondary" size="sm" onClick={onAddToWatchlist}>
                <Eye className="w-4 h-4 mr-1" />
                Watch
              </FFIButton>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// --- Main Panel Component ---

export function WaiverWirePanel({
  analysis,
  onAddToWatchlist,
  onBidOnPlayer,
}: WaiverWirePanelProps) {
  const [activeTab, setActiveTab] = useState<'overall' | 'fits' | 'rising' | 'sleepers'>('overall')

  const tabs = [
    { id: 'overall', label: 'Top Picks', count: analysis.topOverall.length },
    { id: 'fits', label: 'Best Fits', count: analysis.bestFits.length },
    { id: 'rising', label: 'Rising', count: analysis.fastestRising.length },
    { id: 'sleepers', label: 'Sleepers', count: analysis.deepSleepers.length },
  ] as const

  const currentTargets = {
    overall: analysis.topOverall,
    fits: analysis.bestFits,
    rising: analysis.fastestRising,
    sleepers: analysis.deepSleepers,
  }[activeTab]

  return (
    <div className="space-y-6">
      {/* Budget summary */}
      <FFICard variant="elevated">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline text-lg font-bold text-[#deedf9] uppercase">
              FAAB Budget
            </h3>
            <p className="text-[10px] text-[#9eadb8]">
              {analysis.budgetRecommendation.reasoning}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-headline font-bold text-[#2ff801]">
              ${analysis.budgetRemaining}
            </div>
            <span className="text-[10px] text-[#697782]">REMAINING</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-surface-container text-center">
            <div className="text-xs text-[#697782] uppercase mb-1">Spend This Week</div>
            <div className="text-xl font-bold text-[#8bacff]">
              ${analysis.budgetRecommendation.aggressiveBids}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-surface-container text-center">
            <div className="text-xs text-[#697782] uppercase mb-1">Save for Later</div>
            <div className="text-xl font-bold text-[#9eadb8]">
              ${analysis.budgetRecommendation.saveForLater}
            </div>
          </div>
        </div>
      </FFICard>

      {/* Tab navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
              ${activeTab === tab.id
                ? 'bg-[#2ff801] text-black shadow-[0_0_15px_rgba(47,248,1,0.4)]'
                : 'bg-surface-container-high text-[#9eadb8] hover:bg-surface-container-high/80'
              }
            `}
          >
            {tab.label}
            <span
              className={`
                px-1.5 py-0.5 rounded-full text-[10px]
                ${activeTab === tab.id ? 'bg-black/20 text-black' : 'bg-surface-container text-[#697782]'}
              `}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Target list */}
      <div className="space-y-3">
        {currentTargets.length > 0 ? (
          currentTargets.map((target) => (
            <WaiverTargetCard
              key={target.playerId}
              target={target}
              showRosterFit={activeTab === 'fits'}
              onAddToWatchlist={
                onAddToWatchlist
                  ? () => onAddToWatchlist(target.playerId)
                  : undefined
              }
              onBid={
                onBidOnPlayer
                  ? () => onBidOnPlayer(target.playerId, target.faabRecommendation.recommendedBid)
                  : undefined
              }
            />
          ))
        ) : (
          <div className="text-center py-8 text-[#697782]">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No targets in this category</p>
          </div>
        )}
      </div>

      {/* Position breakdown */}
      <div>
        <FFISectionHeader title="By Position" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.entries(analysis.topByPosition) as [string, WaiverTarget[]][]).map(
            ([pos, targets]) => {
              if (targets.length === 0) return null
              const topTarget = targets[0]
              return (
                <div
                  key={pos}
                  className="p-3 rounded-lg bg-surface-container-high border border-[#8bacff]/10"
                >
                  <div className="flex items-center justify-between mb-2">
                    <FFIPositionBadge position={pos as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"} />
                    <span className="text-[10px] text-[#697782]">
                      {targets.length} available
                    </span>
                  </div>
                  <div className="text-sm font-bold text-[#deedf9] truncate">
                    {topTarget.playerName}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[#2ff801] text-sm font-bold">
                      ${topTarget.faabRecommendation.recommendedBid}
                    </span>
                    <span className="text-[10px] text-[#697782]">
                      {topTarget.projectedPoints.toFixed(1)} proj
                    </span>
                  </div>
                </div>
              )
            }
          )}
        </div>
      </div>

      {/* Watchlist */}
      {analysis.watchlist.length > 0 && (
        <div>
          <FFISectionHeader
            title="Watchlist"
            subtitle="Monitor these players for next week"
          />
          <div className="flex flex-wrap gap-2">
            {analysis.watchlist.map((target) => (
              <span
                key={target.playerId}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-container-high border border-[#8bacff]/10 text-sm text-[#9eadb8]"
              >
                <Eye className="w-3 h-3 text-[#8bacff]" />
                {target.playerName}
                <FFIPositionBadge position={target.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
