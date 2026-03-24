'use client'

/**
 * Waiver Wire AI Page
 *
 * Full-featured waiver wire analysis with:
 * - Top pickup recommendations
 * - FAAB bid suggestions
 * - Roster fit analysis
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  RefreshCw,
  Zap,
  ShoppingCart,
  AlertCircle,
} from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFIEmptyState,
} from '@/components/ui/ffi-primitives'
import { WaiverWirePanel } from '@/components/inseason/waiver-wire-panel'
import type { WaiverWireAnalysis, WaiverTarget } from '@/lib/inseason'

export default function WaiversPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targets, setTargets] = useState<WaiverTarget[]>([])
  const [analysis, setAnalysis] = useState<WaiverWireAnalysis | null>(null)
  const [hasConnectedLeague, setHasConnectedLeague] = useState(false)

  // Load waiver targets on mount
  useEffect(() => {
    loadWaiverTargets()
  }, [])

  const loadWaiverTargets = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // First try to get personalized analysis if league is connected
      // For now, just get general targets
      const response = await fetch('/api/waivers/analyze?scoringFormat=ppr&limit=30')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load waiver targets')
      }

      setTargets(data.targets || [])

      // Build a mock analysis object for the UI
      // In production, this would come from the full analysis endpoint
      if (data.targets && data.targets.length > 0) {
        setAnalysis(buildMockAnalysis(data.targets))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Build a display-ready analysis from raw targets
  const buildMockAnalysis = (targets: WaiverTarget[]): WaiverWireAnalysis => {
    const byPosition: Record<string, WaiverTarget[]> = {
      QB: [],
      RB: [],
      WR: [],
      TE: [],
      K: [],
      DEF: [],
    }

    for (const t of targets) {
      if (byPosition[t.position]) {
        byPosition[t.position].push(t)
      }
    }

    return {
      week: 1,
      season: 2026,
      leagueId: '',
      scoringFormat: 'ppr',
      topOverall: targets.slice(0, 10),
      topByPosition: byPosition as WaiverWireAnalysis['topByPosition'],
      fastestRising: [...targets].sort((a, b) => b.trendVelocity - a.trendVelocity).slice(0, 10),
      deepSleepers: targets.filter(t => t.ownershipPercent < 20).slice(0, 10),
      bestFits: [], // Requires roster context
      depthNeeds: [],
      budgetRemaining: 100,
      budgetRecommendation: {
        aggressiveBids: 15,
        saveForLater: 85,
        reasoning: 'Standard week - maintain budget discipline',
      },
      watchlist: targets.filter(t => t.priorityScore < 30 && t.trendDirection === 'rising').slice(0, 10),
      analyzedAt: new Date().toISOString(),
    }
  }

  const handleAddToWatchlist = (playerId: string) => {
    // TODO: Implement watchlist functionality
    console.log('Add to watchlist:', playerId)
  }

  const handleBidOnPlayer = (playerId: string, amount: number) => {
    // TODO: Implement bid functionality
    console.log('Bid on player:', playerId, 'Amount:', amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#01040a] via-[#0a1628] to-[#01040a]">
      {/* Ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-[#8bacff]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-[#2ff801]/5 rounded-full blur-3xl" />
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
                Waiver Wire AI
              </h1>
              <p className="text-sm text-[#9eadb8]">
                Smart pickups with FAAB recommendations
              </p>
            </div>
          </div>

          <FFIButton
            variant="secondary"
            size="sm"
            onClick={loadWaiverTargets}
            disabled={isLoading}
          >
            {isLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </FFIButton>
        </div>

        {/* Connect league prompt (if not connected) */}
        {!hasConnectedLeague && (
          <div className="mb-6 p-4 rounded-xl bg-[#8bacff]/10 border border-[#8bacff]/30">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-[#8bacff] mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-[#deedf9] text-sm">
                  Connect Your League for Personalized Picks
                </h3>
                <p className="text-xs text-[#9eadb8] mt-1">
                  Get roster-aware recommendations and see which players fit your team's needs.
                </p>
              </div>
              <FFIButton
                variant="secondary"
                size="sm"
                onClick={() => router.push('/settings')}
              >
                Connect
              </FFIButton>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#ff716c]/10 border border-[#ff716c]/30">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-[#ff716c]" />
              <span className="text-sm text-[#ff716c]">{error}</span>
              <FFIButton variant="ghost" size="sm" onClick={loadWaiverTargets}>
                Retry
              </FFIButton>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 text-[#8bacff] animate-spin mx-auto mb-4" />
              <p className="text-[#9eadb8]">Scanning waiver wire...</p>
            </div>
          </div>
        )}

        {/* Main content */}
        {!isLoading && !error && analysis && (
          <WaiverWirePanel
            analysis={analysis}
            onAddToWatchlist={handleAddToWatchlist}
            onBidOnPlayer={handleBidOnPlayer}
          />
        )}

        {/* Empty state */}
        {!isLoading && !error && !analysis && (
          <FFIEmptyState
            icon={<ShoppingCart className="w-12 h-12 text-[#8bacff]/30" />}
            title="No Waiver Data"
            description="Unable to load waiver wire data. Try refreshing."
            action={
              <FFIButton variant="primary" onClick={loadWaiverTargets}>
                Refresh
              </FFIButton>
            }
          />
        )}
      </div>
    </div>
  )
}
