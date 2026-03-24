'use client'

/**
 * Start/Sit Advisor Page
 *
 * Full-featured start/sit analysis with:
 * - Quick player comparison
 * - Full roster analysis
 * - Expert consensus visualization
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Search,
  Users,
  Zap,
  RefreshCw,
  ChevronDown,
} from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFIInput,
  FFIPositionBadge,
  FFISectionHeader,
  FFIEmptyState,
} from '@/components/ui/ffi-primitives'
import {
  StartSitComparison,
  RosterStartSitView,
} from '@/components/inseason/start-sit-comparison'
import type { StartSitDecision, RosterStartSitAnalysis } from '@/lib/inseason'

type Position = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DEF'

export default function StartSitPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'compare' | 'roster'>('compare')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Compare mode state
  const [player1, setPlayer1] = useState({ name: '', position: 'RB' as Position, team: '' })
  const [player2, setPlayer2] = useState({ name: '', position: 'RB' as Position, team: '' })
  const [decision, setDecision] = useState<StartSitDecision | null>(null)

  // Roster mode state
  const [rosterAnalysis, setRosterAnalysis] = useState<RosterStartSitAnalysis | null>(null)

  const positions: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

  const handleCompare = async () => {
    if (!player1.name || !player2.name) {
      setError('Please enter both player names')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/start-sit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'compare',
          player1: {
            playerName: player1.name,
            position: player1.position,
            team: player1.team || 'UNK',
          },
          player2: {
            playerName: player2.name,
            position: player2.position,
            team: player2.team || 'UNK',
          },
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to compare players')
      }

      setDecision(data.decision)
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
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-[#2ff801]/5 rounded-full blur-3xl" />
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
          <div>
            <h1 className="font-headline text-2xl font-black text-[#deedf9] uppercase tracking-tight">
              Start/Sit Advisor
            </h1>
            <p className="text-sm text-[#9eadb8]">
              AI-powered lineup recommendations
            </p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('compare')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all
              ${mode === 'compare'
                ? 'bg-[#2ff801] text-black shadow-[0_0_20px_rgba(47,248,1,0.3)]'
                : 'bg-surface-container-high text-[#9eadb8] hover:bg-surface-container-high/80'
              }
            `}
          >
            <Users className="w-5 h-5" />
            Compare Players
          </button>
          <button
            onClick={() => setMode('roster')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all
              ${mode === 'roster'
                ? 'bg-[#2ff801] text-black shadow-[0_0_20px_rgba(47,248,1,0.3)]'
                : 'bg-surface-container-high text-[#9eadb8] hover:bg-surface-container-high/80'
              }
            `}
          >
            <Zap className="w-5 h-5" />
            Full Roster
          </button>
        </div>

        {/* Compare mode */}
        {mode === 'compare' && (
          <div className="space-y-6">
            {/* Player inputs */}
            <FFICard>
              <h3 className="font-headline text-sm font-bold text-[#9eadb8] uppercase tracking-widest mb-4">
                Select Players to Compare
              </h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Player 1 */}
                <div className="space-y-3">
                  <label className="text-[10px] text-[#697782] uppercase">Player 1</label>
                  <FFIInput
                    placeholder="e.g. Christian McCaffrey"
                    value={player1.name}
                    onChange={(e) => setPlayer1({ ...player1, name: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <select
                      value={player1.position}
                      onChange={(e) => setPlayer1({ ...player1, position: e.target.value as Position })}
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-container border border-[#8bacff]/20 text-[#deedf9] text-sm"
                    >
                      {positions.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                    <FFIInput
                      placeholder="Team"
                      value={player1.team}
                      onChange={(e) => setPlayer1({ ...player1, team: e.target.value })}
                      className="w-20"
                    />
                  </div>
                </div>

                {/* Player 2 */}
                <div className="space-y-3">
                  <label className="text-[10px] text-[#697782] uppercase">Player 2</label>
                  <FFIInput
                    placeholder="e.g. Derrick Henry"
                    value={player2.name}
                    onChange={(e) => setPlayer2({ ...player2, name: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <select
                      value={player2.position}
                      onChange={(e) => setPlayer2({ ...player2, position: e.target.value as Position })}
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-container border border-[#8bacff]/20 text-[#deedf9] text-sm"
                    >
                      {positions.map((pos) => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                    <FFIInput
                      placeholder="Team"
                      value={player2.team}
                      onChange={(e) => setPlayer2({ ...player2, team: e.target.value })}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-[#ff716c]/10 border border-[#ff716c]/30 text-sm text-[#ff716c]">
                  {error}
                </div>
              )}

              {/* Compare button */}
              <FFIButton
                variant="primary"
                className="w-full mt-4"
                onClick={handleCompare}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Compare Players
                  </>
                )}
              </FFIButton>
            </FFICard>

            {/* Results */}
            {decision ? (
              <StartSitComparison decision={decision} />
            ) : !isLoading && (
              <FFIEmptyState
                icon={<Users className="w-12 h-12 text-[#8bacff]/30" />}
                title="No Comparison Yet"
                description="Enter two players above to get a side-by-side analysis with AI-powered recommendations."
              />
            )}
          </div>
        )}

        {/* Roster mode */}
        {mode === 'roster' && (
          <div className="space-y-6">
            {rosterAnalysis ? (
              <RosterStartSitView analysis={rosterAnalysis} />
            ) : (
              <FFIEmptyState
                icon={<Zap className="w-12 h-12 text-[#8bacff]/30" />}
                title="Connect Your League"
                description="Link your fantasy platform to analyze your full roster."
                action={
                  <FFIButton
                    variant="primary"
                    onClick={() => router.push('/settings')}
                  >
                    Connect Platform
                  </FFIButton>
                }
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
