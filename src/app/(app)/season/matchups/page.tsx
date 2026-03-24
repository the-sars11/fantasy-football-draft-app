'use client'

/**
 * Weekly Matchup Preview Page (FF-129 to FF-132)
 *
 * Head-to-head matchup analysis with:
 * - Team projections comparison
 * - Position-by-position breakdown
 * - Leverage plays identification
 * - Ceiling/floor analysis
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Zap,
  ChevronRight,
  RefreshCw,
  Users,
  Minus,
} from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFISectionHeader,
  FFIEmptyState,
} from '@/components/ui/ffi-primitives'
import type {
  MatchupPreview,
  TeamProjection,
  PositionMatchup,
  LeveragePlay,
  PlayerMatchupProjection,
} from '@/lib/inseason'

type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF'

export default function MatchupsPage() {
  const router = useRouter()
  const [preview, setPreview] = useState<MatchupPreview | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'overview' | 'positions' | 'leverage'>('overview')

  const loadPreview = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/matchup-preview')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load matchup preview')
      }

      setPreview(data.preview)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#01040a] via-[#0a1628] to-[#01040a]">
      {/* Ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-[#ff716c]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-[#8bacff]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-[#9eadb8]" />
          </button>
          <div className="flex-1">
            <h1 className="font-headline text-2xl font-black text-[#deedf9] uppercase tracking-tight">
              Weekly Matchup
            </h1>
            <p className="text-sm text-[#9eadb8]">
              Head-to-head projections and leverage plays
            </p>
          </div>
          <FFIButton
            variant="secondary"
            size="sm"
            onClick={loadPreview}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </FFIButton>
        </div>

        {/* Content */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#ff716c]/10 border border-[#ff716c]/30 text-sm text-[#ff716c]">
            {error}
          </div>
        )}

        {preview ? (
          <>
            {/* Score projection header */}
            <ScoreProjectionCard preview={preview} />

            {/* View toggle */}
            <div className="flex gap-2 mb-6">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'positions', label: 'By Position' },
                { id: 'leverage', label: 'Leverage Plays' },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setSelectedView(view.id as typeof selectedView)}
                  className={`
                    flex-1 py-2 rounded-lg font-bold text-sm transition-all
                    ${selectedView === view.id
                      ? 'bg-[#8bacff] text-black'
                      : 'bg-surface-container-high text-[#9eadb8] hover:bg-surface-container-high/80'
                    }
                  `}
                >
                  {view.label}
                </button>
              ))}
            </div>

            {/* View content */}
            {selectedView === 'overview' && (
              <OverviewView preview={preview} />
            )}
            {selectedView === 'positions' && (
              <PositionsView matchups={preview.keyMatchups} />
            )}
            {selectedView === 'leverage' && (
              <LeveragePlaysView plays={preview.leveragePlays} />
            )}
          </>
        ) : !isLoading ? (
          <FFIEmptyState
            icon={<Users className="w-12 h-12 text-[#8bacff]/30" />}
            title="Connect Your League"
            description="Link your fantasy platform to see head-to-head matchup projections."
            action={
              <div className="flex gap-3">
                <FFIButton
                  variant="primary"
                  onClick={() => router.push('/settings')}
                >
                  Connect Platform
                </FFIButton>
                <FFIButton
                  variant="secondary"
                  onClick={loadPreview}
                >
                  Try Demo
                </FFIButton>
              </div>
            }
          />
        ) : (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-[#8bacff] animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

// --- Sub-components ---

function ScoreProjectionCard({ preview }: { preview: MatchupPreview }) {
  const margin = preview.projectedMargin
  const isWinning = margin > 0
  const isTossup = Math.abs(margin) <= 5

  return (
    <FFICard className="mb-6 overflow-hidden">
      {/* Win probability bar */}
      <div className="relative h-2 bg-[#ff716c]/20 rounded-full mb-4 overflow-hidden">
        <div
          className="absolute h-full bg-[#2ff801] rounded-full transition-all duration-500"
          style={{ width: `${preview.winProbability}%` }}
        />
        <div
          className="absolute h-full bg-[#ff716c] rounded-full transition-all duration-500"
          style={{ width: `${100 - preview.winProbability}%`, left: `${preview.winProbability}%` }}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        {/* My team */}
        <div>
          <div className="text-[10px] text-[#697782] uppercase mb-1">Your Team</div>
          <div className="text-3xl font-headline font-bold text-[#2ff801]">
            {preview.myTeam.projectedTotal.toFixed(1)}
          </div>
          <div className="text-[10px] text-[#9eadb8]">
            {preview.myTeam.projectedFloor.toFixed(0)}-{preview.myTeam.projectedCeiling.toFixed(0)} range
          </div>
        </div>

        {/* Margin */}
        <div className="flex flex-col items-center justify-center">
          {isTossup ? (
            <>
              <Minus className="w-6 h-6 text-[#9eadb8] mb-1" />
              <div className="text-sm font-bold text-[#9eadb8]">TOSS-UP</div>
            </>
          ) : isWinning ? (
            <>
              <TrendingUp className="w-6 h-6 text-[#2ff801] mb-1" />
              <div className="text-sm font-bold text-[#2ff801]">+{margin.toFixed(1)}</div>
            </>
          ) : (
            <>
              <TrendingDown className="w-6 h-6 text-[#ff716c] mb-1" />
              <div className="text-sm font-bold text-[#ff716c]">{margin.toFixed(1)}</div>
            </>
          )}
          <div className="text-[10px] text-[#697782]">
            {preview.winProbability}% win prob
          </div>
        </div>

        {/* Opponent */}
        <div>
          <div className="text-[10px] text-[#697782] uppercase mb-1">Opponent</div>
          <div className="text-3xl font-headline font-bold text-[#ff716c]">
            {preview.opponent.projectedTotal.toFixed(1)}
          </div>
          <div className="text-[10px] text-[#9eadb8]">
            {preview.opponent.projectedFloor.toFixed(0)}-{preview.opponent.projectedCeiling.toFixed(0)} range
          </div>
        </div>
      </div>

      {/* Risk indicator */}
      {preview.riskLevel !== 'low' && (
        <div className={`
          mt-4 p-3 rounded-lg flex items-center gap-2 text-sm
          ${preview.riskLevel === 'high'
            ? 'bg-[#ff716c]/10 border border-[#ff716c]/30 text-[#ff716c]'
            : 'bg-[#ffa500]/10 border border-[#ffa500]/30 text-[#ffa500]'
          }
        `}>
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{preview.riskFactors[0]}</span>
        </div>
      )}
    </FFICard>
  )
}

function OverviewView({ preview }: { preview: MatchupPreview }) {
  return (
    <div className="space-y-6">
      {/* Recommendations */}
      <FFICard>
        <h3 className="font-headline text-sm font-bold text-[#9eadb8] uppercase tracking-widest mb-4 flex items-center gap-2">
          <Target className="w-4 h-4 text-[#8bacff]" />
          Key Insights
        </h3>
        <ul className="space-y-2">
          {preview.recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-[#deedf9]">
              <ChevronRight className="w-4 h-4 text-[#8bacff] flex-shrink-0 mt-0.5" />
              {rec}
            </li>
          ))}
        </ul>
      </FFICard>

      {/* Position summary */}
      <FFICard>
        <h3 className="font-headline text-sm font-bold text-[#9eadb8] uppercase tracking-widest mb-4">
          Position Breakdown
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {preview.keyMatchups.slice(0, 6).map((matchup) => (
            <PositionChip key={matchup.position} matchup={matchup} />
          ))}
        </div>
      </FFICard>

      {/* Top leverage play */}
      {preview.leveragePlays.length > 0 && (
        <FFICard className="border-[#ffa500]/30">
          <h3 className="font-headline text-sm font-bold text-[#ffa500] uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Top Leverage Play
          </h3>
          <LeveragePlayCard play={preview.leveragePlays[0]} />
        </FFICard>
      )}
    </div>
  )
}

function PositionChip({ matchup }: { matchup: PositionMatchup }) {
  const isAdvantage = matchup.advantage === 'mine'
  const isDisadvantage = matchup.advantage === 'opponent'

  return (
    <div className={`
      p-3 rounded-lg border text-center
      ${isAdvantage ? 'bg-[#2ff801]/10 border-[#2ff801]/30' :
        isDisadvantage ? 'bg-[#ff716c]/10 border-[#ff716c]/30' :
        'bg-surface-container border-[#8bacff]/20'}
    `}>
      <div className="font-headline text-xs font-bold text-[#697782] mb-1">
        {matchup.position}
      </div>
      <div className={`
        font-bold text-lg
        ${isAdvantage ? 'text-[#2ff801]' :
          isDisadvantage ? 'text-[#ff716c]' :
          'text-[#9eadb8]'}
      `}>
        {matchup.margin > 0 ? '+' : ''}{matchup.margin.toFixed(1)}
      </div>
      <div className="text-[10px] text-[#697782]">
        {matchup.myProjected.toFixed(1)} vs {matchup.opponentProjected.toFixed(1)}
      </div>
    </div>
  )
}

function PositionsView({ matchups }: { matchups: PositionMatchup[] }) {
  return (
    <div className="space-y-3">
      {matchups.map((matchup) => (
        <FFICard key={matchup.position}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-lg flex items-center justify-center font-headline font-bold
                ${matchup.advantage === 'mine' ? 'bg-[#2ff801]/20 text-[#2ff801]' :
                  matchup.advantage === 'opponent' ? 'bg-[#ff716c]/20 text-[#ff716c]' :
                  'bg-surface-container text-[#9eadb8]'}
              `}>
                {matchup.position}
              </div>
              <div>
                <div className="font-bold text-[#deedf9]">
                  {matchup.myProjected.toFixed(1)} vs {matchup.opponentProjected.toFixed(1)}
                </div>
                <div className="text-xs text-[#697782]">{matchup.analysis}</div>
              </div>
            </div>
            <div className={`
              font-headline font-bold text-xl
              ${matchup.advantage === 'mine' ? 'text-[#2ff801]' :
                matchup.advantage === 'opponent' ? 'text-[#ff716c]' :
                'text-[#9eadb8]'}
            `}>
              {matchup.margin > 0 ? '+' : ''}{matchup.margin.toFixed(1)}
            </div>
          </div>

          {/* Margin bar */}
          <div className="mt-3 relative h-2 bg-surface-container rounded-full overflow-hidden">
            <div
              className={`
                absolute h-full rounded-full transition-all
                ${matchup.advantage === 'mine' ? 'bg-[#2ff801] left-1/2' :
                  matchup.advantage === 'opponent' ? 'bg-[#ff716c] right-1/2' :
                  'bg-[#9eadb8] left-1/2'}
              `}
              style={{
                width: `${Math.min(50, Math.abs(matchup.margin) * 2.5)}%`,
                transform: matchup.advantage === 'opponent' ? 'translateX(-100%)' : 'none'
              }}
            />
          </div>
        </FFICard>
      ))}
    </div>
  )
}

function LeveragePlaysView({ plays }: { plays: LeveragePlay[] }) {
  if (plays.length === 0) {
    return (
      <FFIEmptyState
        icon={<Zap className="w-12 h-12 text-[#8bacff]/30" />}
        title="No Leverage Plays"
        description="Your lineup is optimized. No high-impact swaps available this week."
      />
    )
  }

  return (
    <div className="space-y-4">
      {plays.map((play, i) => (
        <FFICard key={i} className="border-[#ffa500]/20">
          <LeveragePlayCard play={play} />
        </FFICard>
      ))}
    </div>
  )
}

function LeveragePlayCard({ play }: { play: LeveragePlay }) {
  const recommendationColors = {
    'do-it': { bg: 'bg-[#2ff801]/20', text: 'text-[#2ff801]', label: 'DO IT' },
    'consider': { bg: 'bg-[#ffa500]/20', text: 'text-[#ffa500]', label: 'CONSIDER' },
    'risky': { bg: 'bg-[#ff716c]/20', text: 'text-[#ff716c]', label: 'RISKY' },
  }

  const rec = recommendationColors[play.recommendation]

  return (
    <div>
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="font-bold text-[#deedf9]">
            {play.player.playerName}
          </div>
          <div className="text-xs text-[#697782]">
            {play.player.position} - {play.player.team}
            {play.alternatePlayer && ` vs ${play.alternatePlayer.playerName}`}
          </div>
        </div>
        <span className={`px-2 py-1 rounded text-[10px] font-bold ${rec.bg} ${rec.text}`}>
          {rec.label}
        </span>
      </div>

      <p className="text-sm text-[#9eadb8] mb-3">{play.reasoning}</p>

      <div className="flex items-center gap-4 text-xs text-[#697782]">
        <div className="flex items-center gap-1">
          <Target className="w-3 h-3" />
          Impact: {play.impactScore}/10
        </div>
        <div>
          Proj: {play.player.projectedPoints.toFixed(1)} pts
        </div>
        <div>
          Range: {play.player.floor.toFixed(1)}-{play.player.ceiling.toFixed(1)}
        </div>
      </div>
    </div>
  )
}
