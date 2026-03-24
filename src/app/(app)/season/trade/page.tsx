'use client'

/**
 * Trade Analyzer Page
 *
 * Full-featured trade analysis with:
 * - Player value calculator
 * - Trade impact analysis
 * - Fair trade finder
 * - Veto risk assessment
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRightLeft,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Scale,
  Share2,
} from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFIBadge,
} from '@/components/ui/ffi-primitives'
import type { Position } from '@/lib/players/types'

interface TradePlayer {
  playerId: string
  playerName: string
  position: Position
  team: string
  tradeValue?: number
}

interface TradeAnalysis {
  giving: {
    players: Array<TradePlayer & { tradeValue: number; rosValue: number }>
    totalValue: number
  }
  receiving: {
    players: Array<TradePlayer & { tradeValue: number; rosValue: number }>
    totalValue: number
  }
  netValue: number
  verdict: 'strong_accept' | 'accept' | 'fair' | 'decline' | 'strong_decline'
  confidence: number
  rosProjectionChange: number
  ceilingChange: number
  floorChange: number
  reasoning: string[]
  warnings: string[]
  vetoRisk: 'none' | 'low' | 'medium' | 'high'
  vetoReasons: string[]
  rosterImpacts: Array<{
    position: Position
    improvement: number
    fillsNeed: boolean
    createsHole: boolean
  }>
}

const VERDICT_CONFIG = {
  strong_accept: {
    label: 'Smash Accept',
    color: 'text-[#2ff801]',
    bgColor: 'bg-[#2ff801]/20',
    borderColor: 'border-[#2ff801]/50',
    icon: CheckCircle,
  },
  accept: {
    label: 'Accept',
    color: 'text-[#2ff801]',
    bgColor: 'bg-[#2ff801]/10',
    borderColor: 'border-[#2ff801]/30',
    icon: TrendingUp,
  },
  fair: {
    label: 'Fair Trade',
    color: 'text-[#f0c000]',
    bgColor: 'bg-[#f0c000]/10',
    borderColor: 'border-[#f0c000]/30',
    icon: Scale,
  },
  decline: {
    label: 'Decline',
    color: 'text-[#ff716c]',
    bgColor: 'bg-[#ff716c]/10',
    borderColor: 'border-[#ff716c]/30',
    icon: TrendingDown,
  },
  strong_decline: {
    label: 'Hard Pass',
    color: 'text-[#ff716c]',
    bgColor: 'bg-[#ff716c]/20',
    borderColor: 'border-[#ff716c]/50',
    icon: X,
  },
}

const VETO_CONFIG = {
  none: { label: 'None', color: 'text-[#9eadb8]' },
  low: { label: 'Low', color: 'text-[#2ff801]' },
  medium: { label: 'Medium', color: 'text-[#f0c000]' },
  high: { label: 'High', color: 'text-[#ff716c]' },
}

export default function TradePage() {
  const router = useRouter()
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Trade builder state
  const [givingPlayers, setGivingPlayers] = useState<TradePlayer[]>([])
  const [receivingPlayers, setReceivingPlayers] = useState<TradePlayer[]>([])

  // Player input state
  const [givingInput, setGivingInput] = useState('')
  const [receivingInput, setReceivingInput] = useState('')
  const [givingPosition, setGivingPosition] = useState<Position>('WR')
  const [receivingPosition, setReceivingPosition] = useState<Position>('WR')

  const addPlayer = (side: 'giving' | 'receiving') => {
    const input = side === 'giving' ? givingInput : receivingInput
    const position = side === 'giving' ? givingPosition : receivingPosition

    if (!input.trim()) return

    const newPlayer: TradePlayer = {
      playerId: `manual-${Date.now()}`,
      playerName: input.trim(),
      position,
      team: 'UNK',
    }

    if (side === 'giving') {
      setGivingPlayers([...givingPlayers, newPlayer])
      setGivingInput('')
    } else {
      setReceivingPlayers([...receivingPlayers, newPlayer])
      setReceivingInput('')
    }
  }

  const removePlayer = (side: 'giving' | 'receiving', index: number) => {
    if (side === 'giving') {
      setGivingPlayers(givingPlayers.filter((_, i) => i !== index))
    } else {
      setReceivingPlayers(receivingPlayers.filter((_, i) => i !== index))
    }
    setAnalysis(null)
  }

  const analyzeTrade = async () => {
    if (givingPlayers.length === 0 || receivingPlayers.length === 0) {
      setError('Add at least one player to each side')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setAnalysis(null)

    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          giving: givingPlayers,
          receiving: receivingPlayers,
          scoringFormat: 'ppr',
          week: 1,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze trade')
      }

      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const clearTrade = () => {
    setGivingPlayers([])
    setReceivingPlayers([])
    setAnalysis(null)
    setError(null)
  }

  const shareTrade = () => {
    // TODO: Generate shareable link
    console.log('Share trade:', { giving: givingPlayers, receiving: receivingPlayers })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#01040a] via-[#0a1628] to-[#01040a]">
      {/* Ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-[#8bacff]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#f0c000]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[#9eadb8]" />
            </button>
            <div>
              <h1 className="font-headline text-2xl font-black text-[#deedf9] uppercase tracking-tight">
                Trade Analyzer
              </h1>
              <p className="text-sm text-[#9eadb8]">
                Evaluate trades with AI-powered analysis
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <FFIButton variant="ghost" size="sm" onClick={clearTrade}>
              Clear
            </FFIButton>
            <FFIButton variant="secondary" size="sm" onClick={shareTrade}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </FFIButton>
          </div>
        </div>

        {/* Trade Builder */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Giving Side */}
          <FFICard className="p-4">
            <h3 className="font-bold text-[#ff716c] text-sm uppercase tracking-wider mb-3">
              You Give
            </h3>

            {/* Player list */}
            <div className="space-y-2 mb-4">
              {givingPlayers.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-container"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#ff716c]">
                      {player.position}
                    </span>
                    <span className="text-[#deedf9]">{player.playerName}</span>
                  </div>
                  <button
                    onClick={() => removePlayer('giving', index)}
                    className="p-1 hover:bg-[#ff716c]/20 rounded"
                  >
                    <X className="w-4 h-4 text-[#9eadb8]" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add player input */}
            <div className="flex gap-2">
              <select
                value={givingPosition}
                onChange={(e) => setGivingPosition(e.target.value as Position)}
                className="w-20 px-2 py-2 rounded-lg bg-surface-container border border-[#3d4f5f] text-[#deedf9] text-sm"
              >
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DEF">DEF</option>
              </select>
              <input
                type="text"
                value={givingInput}
                onChange={(e) => setGivingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer('giving')}
                placeholder="Player name"
                className="flex-1 px-3 py-2 rounded-lg bg-surface-container border border-[#3d4f5f] text-[#deedf9] placeholder-[#9eadb8]/50"
              />
              <FFIButton
                variant="secondary"
                size="sm"
                onClick={() => addPlayer('giving')}
              >
                <Plus className="w-4 h-4" />
              </FFIButton>
            </div>
          </FFICard>

          {/* Receiving Side */}
          <FFICard className="p-4">
            <h3 className="font-bold text-[#2ff801] text-sm uppercase tracking-wider mb-3">
              You Receive
            </h3>

            {/* Player list */}
            <div className="space-y-2 mb-4">
              {receivingPlayers.map((player, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-container"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#2ff801]">
                      {player.position}
                    </span>
                    <span className="text-[#deedf9]">{player.playerName}</span>
                  </div>
                  <button
                    onClick={() => removePlayer('receiving', index)}
                    className="p-1 hover:bg-[#ff716c]/20 rounded"
                  >
                    <X className="w-4 h-4 text-[#9eadb8]" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add player input */}
            <div className="flex gap-2">
              <select
                value={receivingPosition}
                onChange={(e) => setReceivingPosition(e.target.value as Position)}
                className="w-20 px-2 py-2 rounded-lg bg-surface-container border border-[#3d4f5f] text-[#deedf9] text-sm"
              >
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DEF">DEF</option>
              </select>
              <input
                type="text"
                value={receivingInput}
                onChange={(e) => setReceivingInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer('receiving')}
                placeholder="Player name"
                className="flex-1 px-3 py-2 rounded-lg bg-surface-container border border-[#3d4f5f] text-[#deedf9] placeholder-[#9eadb8]/50"
              />
              <FFIButton
                variant="secondary"
                size="sm"
                onClick={() => addPlayer('receiving')}
              >
                <Plus className="w-4 h-4" />
              </FFIButton>
            </div>
          </FFICard>
        </div>

        {/* Analyze Button */}
        <div className="flex justify-center mb-6">
          <FFIButton
            variant="primary"
            size="lg"
            onClick={analyzeTrade}
            disabled={isAnalyzing || givingPlayers.length === 0 || receivingPlayers.length === 0}
            className="px-8"
          >
            {isAnalyzing ? (
              <>
                <ArrowRightLeft className="w-5 h-5 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-5 h-5 mr-2" />
                Analyze Trade
              </>
            )}
          </FFIButton>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#ff716c]/10 border border-[#ff716c]/30">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#ff716c]" />
              <span className="text-sm text-[#ff716c]">{error}</span>
            </div>
          </div>
        )}

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-4">
            {/* Verdict Card */}
            <FFICard className={`p-6 border ${VERDICT_CONFIG[analysis.verdict].borderColor}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {(() => {
                    const Icon = VERDICT_CONFIG[analysis.verdict].icon
                    return (
                      <div className={`p-3 rounded-xl ${VERDICT_CONFIG[analysis.verdict].bgColor}`}>
                        <Icon className={`w-8 h-8 ${VERDICT_CONFIG[analysis.verdict].color}`} />
                      </div>
                    )
                  })()}
                  <div>
                    <h2 className={`text-2xl font-black ${VERDICT_CONFIG[analysis.verdict].color}`}>
                      {VERDICT_CONFIG[analysis.verdict].label}
                    </h2>
                    <p className="text-sm text-[#9eadb8]">
                      {analysis.confidence}% confidence
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`text-3xl font-black ${analysis.netValue >= 0 ? 'text-[#2ff801]' : 'text-[#ff716c]'}`}>
                    {analysis.netValue >= 0 ? '+' : ''}{analysis.netValue.toFixed(1)}
                  </div>
                  <p className="text-xs text-[#9eadb8]">Net Value</p>
                </div>
              </div>

              {/* Value Comparison */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#ff716c]">
                    {analysis.giving.totalValue.toFixed(1)}
                  </p>
                  <p className="text-xs text-[#9eadb8]">Giving Value</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRightLeft className="w-6 h-6 text-[#9eadb8]" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#2ff801]">
                    {analysis.receiving.totalValue.toFixed(1)}
                  </p>
                  <p className="text-xs text-[#9eadb8]">Receiving Value</p>
                </div>
              </div>

              {/* Projection Changes */}
              <div className="grid grid-cols-3 gap-4 p-3 rounded-lg bg-surface-container">
                <div className="text-center">
                  <p className={`font-bold ${analysis.rosProjectionChange >= 0 ? 'text-[#2ff801]' : 'text-[#ff716c]'}`}>
                    {analysis.rosProjectionChange >= 0 ? '+' : ''}{analysis.rosProjectionChange.toFixed(1)}
                  </p>
                  <p className="text-xs text-[#9eadb8]">ROS Points</p>
                </div>
                <div className="text-center">
                  <p className={`font-bold ${analysis.ceilingChange >= 0 ? 'text-[#2ff801]' : 'text-[#ff716c]'}`}>
                    {analysis.ceilingChange >= 0 ? '+' : ''}{analysis.ceilingChange.toFixed(1)}
                  </p>
                  <p className="text-xs text-[#9eadb8]">Ceiling</p>
                </div>
                <div className="text-center">
                  <p className={`font-bold ${analysis.floorChange >= 0 ? 'text-[#2ff801]' : 'text-[#ff716c]'}`}>
                    {analysis.floorChange >= 0 ? '+' : ''}{analysis.floorChange.toFixed(1)}
                  </p>
                  <p className="text-xs text-[#9eadb8]">Floor</p>
                </div>
              </div>
            </FFICard>

            {/* Reasoning */}
            {analysis.reasoning.length > 0 && (
              <FFICard className="p-4">
                <h3 className="font-bold text-[#deedf9] text-sm uppercase tracking-wider mb-3">
                  Analysis
                </h3>
                <ul className="space-y-2">
                  {analysis.reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[#9eadb8]">
                      <span className="text-[#8bacff]">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </FFICard>
            )}

            {/* Warnings */}
            {analysis.warnings.length > 0 && (
              <FFICard className="p-4 border border-[#f0c000]/30">
                <h3 className="font-bold text-[#f0c000] text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Warnings
                </h3>
                <ul className="space-y-2">
                  {analysis.warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-[#f0c000]">
                      <span>⚠</span>
                      {warning}
                    </li>
                  ))}
                </ul>
              </FFICard>
            )}

            {/* Veto Risk */}
            {analysis.vetoRisk !== 'none' && (
              <FFICard className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-[#deedf9] text-sm uppercase tracking-wider">
                    Veto Risk
                  </h3>
                  <FFIBadge className={VETO_CONFIG[analysis.vetoRisk].color}>
                    {VETO_CONFIG[analysis.vetoRisk].label}
                  </FFIBadge>
                </div>
                {analysis.vetoReasons.length > 0 && (
                  <ul className="space-y-1">
                    {analysis.vetoReasons.map((reason, index) => (
                      <li key={index} className="text-sm text-[#9eadb8]">
                        • {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </FFICard>
            )}

            {/* Position Impact */}
            {analysis.rosterImpacts.length > 0 && (
              <FFICard className="p-4">
                <h3 className="font-bold text-[#deedf9] text-sm uppercase tracking-wider mb-3">
                  Position Impact
                </h3>
                <div className="space-y-2">
                  {analysis.rosterImpacts.map((impact, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-lg bg-surface-container"
                    >
                      <span className="font-mono text-[#8bacff]">{impact.position}</span>
                      <div className="flex items-center gap-3">
                        {impact.fillsNeed && (
                          <span className="text-xs text-[#2ff801]">Fills need</span>
                        )}
                        {impact.createsHole && (
                          <span className="text-xs text-[#ff716c]">Creates hole</span>
                        )}
                        <span className={`font-bold ${impact.improvement >= 0 ? 'text-[#2ff801]' : 'text-[#ff716c]'}`}>
                          {impact.improvement >= 0 ? '+' : ''}{impact.improvement.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </FFICard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
