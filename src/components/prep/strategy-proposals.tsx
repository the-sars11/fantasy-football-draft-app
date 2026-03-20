'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StrategyProposalCard } from './strategy-proposal-card'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { DraftFormat } from '@/lib/players/types'

interface StrategyProposalsProps {
  leagueId: string
  format: DraftFormat
  onSave?: (proposal: StrategyProposal) => void
}

interface ProposalResponse {
  proposals: StrategyProposal[]
  meta: {
    leagueId: string
    format: DraftFormat
    playerCount: number
    proposalCount: number
  }
}

export function StrategyProposals({ leagueId, format, onSave }: StrategyProposalsProps) {
  const [proposals, setProposals] = useState<StrategyProposal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [playerCount, setPlayerCount] = useState(0)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setProposals([])
    setSelectedIdx(null)

    try {
      const res = await fetch('/api/strategies/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to generate strategies')
        return
      }

      const response = data as ProposalResponse
      setProposals(response.proposals)
      setPlayerCount(response.meta.playerCount)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate strategies')
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  const handleSelect = (proposal: StrategyProposal, idx: number) => {
    setSelectedIdx(idx)
  }

  const handleSave = () => {
    if (selectedIdx !== null && onSave) {
      onSave(proposals[selectedIdx])
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Strategy Proposals</h2>
          <p className="text-sm text-muted-foreground">
            {proposals.length > 0
              ? `${proposals.length} strategies generated from ${playerCount} players`
              : `Claude will analyze your league settings and player data to propose ${format === 'auction' ? 'auction' : 'snake'} strategies`}
          </p>
        </div>
        <Button
          onClick={generate}
          disabled={loading}
          size="sm"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1.5" />
              {proposals.length > 0 ? 'Regenerate' : 'Generate Strategies'}
            </>
          )}
        </Button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="rounded-md bg-muted/50 border border-border p-8 flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground text-center">
            Claude is analyzing your league settings and player data...
            <br />
            <span className="text-xs">This usually takes 10-20 seconds</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Proposals list */}
      {proposals.length > 0 && (
        <div className="space-y-3">
          {proposals.map((proposal, idx) => (
            <StrategyProposalCard
              key={`${proposal.archetype}-${idx}`}
              proposal={proposal}
              format={format}
              isSelected={selectedIdx === idx}
              onSelect={() => handleSelect(proposal, idx)}
            />
          ))}
        </div>
      )}

      {/* Save selected */}
      {selectedIdx !== null && onSave && (
        <div className="sticky bottom-16 sm:bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t p-3 -mx-4 px-4">
          <Button onClick={handleSave} className="w-full">
            Save &ldquo;{proposals[selectedIdx].name}&rdquo; as active strategy
          </Button>
        </div>
      )}
    </div>
  )
}
