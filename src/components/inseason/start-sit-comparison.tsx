'use client'

/**
 * Start/Sit Comparison Component (FF-118)
 *
 * Side-by-side player comparison with:
 * - Confidence bars
 * - Expert consensus visualization
 * - Matchup ratings
 * - AI-powered reasoning
 */

import { useState } from 'react'
import {
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Shield,
  Target,
} from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFIBadge,
  FFIProgress,
  FFIPositionBadge,
} from '@/components/ui/ffi-primitives'
import type { StartSitRecommendation, StartSitDecision } from '@/lib/inseason'

// --- Types ---

interface StartSitComparisonProps {
  decision: StartSitDecision
  onClose?: () => void
}

interface PlayerComparisonCardProps {
  recommendation: StartSitRecommendation
  isWinner: boolean
  showWinnerBadge?: boolean
}

// --- Verdict Config ---

const VERDICT_CONFIG = {
  'must-start': {
    bgClass: 'bg-[#2ff801]/20',
    textClass: 'text-[#2ff801]',
    label: 'MUST START',
    icon: CheckCircle,
  },
  start: {
    bgClass: 'bg-[#2ff801]/15',
    textClass: 'text-[#2ff801]',
    label: 'START',
    icon: TrendingUp,
  },
  flex: {
    bgClass: 'bg-[#8bacff]/20',
    textClass: 'text-[#8bacff]',
    label: 'FLEX',
    icon: Target,
  },
  sit: {
    bgClass: 'bg-[#ff716c]/15',
    textClass: 'text-[#ff716c]',
    label: 'SIT',
    icon: TrendingDown,
  },
  'must-sit': {
    bgClass: 'bg-[#ff716c]/20',
    textClass: 'text-[#ff716c]',
    label: 'MUST SIT',
    icon: XCircle,
  },
}

const MATCHUP_CONFIG = {
  elite: { color: 'text-[#2ff801]', label: 'ELITE' },
  favorable: { color: 'text-[#2ff801]/80', label: 'FAVORABLE' },
  neutral: { color: 'text-[#8bacff]', label: 'NEUTRAL' },
  tough: { color: 'text-[#ff716c]/80', label: 'TOUGH' },
  brutal: { color: 'text-[#ff716c]', label: 'BRUTAL' },
}

// --- Player Card ---

function PlayerComparisonCard({
  recommendation,
  isWinner,
  showWinnerBadge = false,
}: PlayerComparisonCardProps) {
  const verdict = VERDICT_CONFIG[recommendation.verdict]
  const matchup = MATCHUP_CONFIG[recommendation.matchupRating]
  const VerdictIcon = verdict.icon

  return (
    <div
      className={`
        relative flex-1 rounded-xl p-4 transition-all
        ${isWinner
          ? 'bg-[#2ff801]/10 border border-[#2ff801]/30 shadow-[0_0_20px_rgba(47,248,1,0.1)]'
          : 'bg-surface-container-high border border-[#8bacff]/10'
        }
      `}
    >
      {/* Winner badge */}
      {showWinnerBadge && isWinner && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#2ff801] text-black text-[10px] font-bold tracking-wider shadow-[0_0_15px_rgba(47,248,1,0.5)]">
            <Zap className="w-3 h-3" />
            START
          </span>
        </div>
      )}

      {/* Player info */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-1">
          <h3 className="font-headline text-lg font-bold text-[#deedf9] uppercase">
            {recommendation.playerName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <FFIPositionBadge position={recommendation.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"} />
            <span className="text-[10px] text-[#9eadb8]">
              {recommendation.team}
            </span>
            {recommendation.opponent && (
              <span className="text-[10px] text-[#697782]">
                vs {recommendation.opponent}
              </span>
            )}
          </div>
        </div>

        {/* Verdict badge */}
        <div
          className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold
            ${verdict.bgClass} ${verdict.textClass}
          `}
        >
          <VerdictIcon className="w-3 h-3" />
          {verdict.label}
        </div>
      </div>

      {/* Projections */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 rounded-lg bg-surface-container">
          <div className="text-xs text-[#697782] uppercase">Floor</div>
          <div className="text-lg font-bold text-[#9eadb8]">
            {recommendation.projectedFloor.toFixed(1)}
          </div>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface-container">
          <div className="text-xs text-[#697782] uppercase">Proj</div>
          <div className={`text-xl font-bold ${isWinner ? 'text-[#2ff801]' : 'text-[#deedf9]'}`}>
            {recommendation.projectedPoints.toFixed(1)}
          </div>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface-container">
          <div className="text-xs text-[#697782] uppercase">Ceiling</div>
          <div className="text-lg font-bold text-[#9eadb8]">
            {recommendation.projectedCeiling.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Matchup */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-[#697782] uppercase">Matchup</span>
        <span className={`text-sm font-bold ${matchup.color}`}>
          {matchup.label}
        </span>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#697782] uppercase">Confidence</span>
          <span className="text-[10px] text-[#9eadb8]">{Math.round(recommendation.confidence)}%</span>
        </div>
        <div className="h-2 bg-surface-container rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              recommendation.confidence >= 70
                ? 'bg-[#2ff801]'
                : recommendation.confidence >= 40
                ? 'bg-[#8bacff]'
                : 'bg-[#ff716c]'
            }`}
            style={{ width: `${recommendation.confidence}%` }}
          />
        </div>
      </div>

      {/* Expert agreement */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-[#697782] uppercase">Expert Agreement</span>
        <span className="text-sm text-[#9eadb8]">
          {Math.round(recommendation.expertAgreement)}%
        </span>
      </div>

      {/* Rank */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#697782] uppercase">Position Rank</span>
        <span className="text-sm font-bold text-[#8bacff]">
          {recommendation.position}{recommendation.positionRank}
        </span>
      </div>

      {/* Injury status */}
      {recommendation.injuryStatus && recommendation.injuryStatus !== 'healthy' && (
        <div className="mt-3 flex items-center gap-2 text-[#ff716c]">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-xs uppercase">{recommendation.injuryStatus}</span>
        </div>
      )}
    </div>
  )
}

// --- Main Comparison Component ---

export function StartSitComparison({ decision, onClose }: StartSitComparisonProps) {
  const [showDetails, setShowDetails] = useState(false)

  const isPlayer1Winner = decision.winner === 'player1'
  const isPlayer2Winner = decision.winner === 'player2'
  const isTossUp = decision.winner === 'toss-up'

  return (
    <FFICard className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#8bacff]/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#8bacff]" />
            <h2 className="font-headline text-lg font-bold text-[#deedf9] uppercase">
              Start/Sit Analysis
            </h2>
          </div>
          {onClose && (
            <FFIButton variant="ghost" size="sm" onClick={onClose}>
              Close
            </FFIButton>
          )}
        </div>
      </div>

      {/* Player comparison */}
      <div className="p-4">
        <div className="flex gap-4 mb-6">
          <PlayerComparisonCard
            recommendation={decision.player1}
            isWinner={isPlayer1Winner}
            showWinnerBadge={!isTossUp}
          />

          {/* VS divider */}
          <div className="flex items-center justify-center">
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center">
              <span className="text-[#697782] font-bold text-sm">VS</span>
            </div>
          </div>

          <PlayerComparisonCard
            recommendation={decision.player2}
            isWinner={isPlayer2Winner}
            showWinnerBadge={!isTossUp}
          />
        </div>

        {/* Decision summary */}
        <div
          className={`
            p-4 rounded-xl border
            ${isTossUp
              ? 'bg-[#8bacff]/10 border-[#8bacff]/30'
              : 'bg-[#2ff801]/10 border-[#2ff801]/30'
            }
          `}
        >
          <div className="flex items-start gap-3">
            {isTossUp ? (
              <Target className="w-5 h-5 text-[#8bacff] mt-0.5" />
            ) : (
              <Zap className="w-5 h-5 text-[#2ff801] mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm text-[#deedf9] leading-relaxed">
                {decision.reasoning}
              </p>

              {/* Win margin */}
              {!isTossUp && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-[#697782] uppercase">Decision Confidence</span>
                    <span className="text-[10px] text-[#9eadb8]">{Math.round(decision.winMargin)}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#2ff801] transition-all"
                      style={{ width: `${Math.min(100, decision.winMargin)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key factors */}
        {decision.keyFactors.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 text-[#8bacff] text-sm hover:text-[#8bacff]/80 transition-colors"
            >
              <ChevronRight
                className={`w-4 h-4 transition-transform ${showDetails ? 'rotate-90' : ''}`}
              />
              Key Factors ({decision.keyFactors.length})
            </button>

            {showDetails && (
              <ul className="mt-3 space-y-2">
                {decision.keyFactors.map((factor, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-[#9eadb8]"
                  >
                    <CheckCircle className="w-4 h-4 text-[#2ff801] mt-0.5 shrink-0" />
                    {factor}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </FFICard>
  )
}

// --- Roster Analysis View ---

interface RosterStartSitViewProps {
  analysis: {
    optimalLineup: {
      qb: StartSitRecommendation[]
      rb: StartSitRecommendation[]
      wr: StartSitRecommendation[]
      te: StartSitRecommendation[]
      flex: StartSitRecommendation[]
      k: StartSitRecommendation[]
      def: StartSitRecommendation[]
    }
    toughDecisions: StartSitDecision[]
    alerts: Array<{
      type: string
      severity: string
      playerName: string
      message: string
    }>
  }
}

export function RosterStartSitView({ analysis }: RosterStartSitViewProps) {
  return (
    <div className="space-y-6">
      {/* Alerts */}
      {analysis.alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-headline text-sm font-bold text-[#deedf9] uppercase mb-3">
            Alerts
          </h3>
          {analysis.alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`
                flex items-center gap-3 p-3 rounded-lg border
                ${alert.severity === 'critical'
                  ? 'bg-[#ff716c]/10 border-[#ff716c]/30'
                  : alert.severity === 'warning'
                  ? 'bg-[#ffa500]/10 border-[#ffa500]/30'
                  : 'bg-[#8bacff]/10 border-[#8bacff]/30'
                }
              `}
            >
              <AlertTriangle
                className={`w-4 h-4 ${
                  alert.severity === 'critical'
                    ? 'text-[#ff716c]'
                    : alert.severity === 'warning'
                    ? 'text-[#ffa500]'
                    : 'text-[#8bacff]'
                }`}
              />
              <span className="text-sm text-[#deedf9]">{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tough decisions */}
      {analysis.toughDecisions.length > 0 && (
        <div>
          <h3 className="font-headline text-sm font-bold text-[#deedf9] uppercase mb-3">
            Tough Decisions
          </h3>
          <div className="space-y-4">
            {analysis.toughDecisions.map((decision, idx) => (
              <StartSitComparison key={idx} decision={decision} />
            ))}
          </div>
        </div>
      )}

      {/* Optimal lineup */}
      <div>
        <h3 className="font-headline text-sm font-bold text-[#deedf9] uppercase mb-3">
          Optimal Lineup
        </h3>
        <div className="space-y-2">
          {Object.entries(analysis.optimalLineup).map(([pos, players]) => {
            if (players.length === 0) return null
            return (
              <div key={pos} className="flex items-center gap-3">
                <span className="w-12 text-[10px] text-[#697782] uppercase">{pos}</span>
                <div className="flex-1 flex flex-wrap gap-2">
                  {players.map((player, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container-high text-sm text-[#deedf9]"
                    >
                      {player.playerName}
                      <span className="text-[10px] text-[#2ff801]">
                        {player.projectedPoints.toFixed(1)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
