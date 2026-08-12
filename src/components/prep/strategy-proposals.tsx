'use client'

import { useState, useCallback } from 'react'
import { Sparkles, Loader2, Columns2, Zap } from 'lucide-react'
import { StrategyProposalCard } from './strategy-proposal-card'
import { StrategyCompare } from './strategy-compare'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { DraftFormat } from '@/lib/players/types'

interface StrategyProposalsProps {
  leagueId: string
  format: DraftFormat
  onSave?: (proposal: StrategyProposal) => void
  /** Player names from the active strategy's target list to inform proposals */
  targetNames?: string[]
  /** Player names from the active strategy's avoid list to inform proposals */
  avoidNames?: string[]
}

interface ProposalResponse {
  proposals: StrategyProposal[]
  source?: 'ai' | 'rule-based'
  meta: {
    leagueId: string
    format: DraftFormat
    playerCount: number
    proposalCount: number
  }
}

export function StrategyProposals({ leagueId, format, onSave, targetNames = [], avoidNames = [] }: StrategyProposalsProps) {
  const [proposals, setProposals] = useState<StrategyProposal[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [playerCount, setPlayerCount] = useState(0)
  const [proposalSource, setProposalSource] = useState<'ai' | 'rule-based' | null>(null)
  const [comparing, setComparing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const generate = useCallback(async () => {
    setConfirming(false)
    setLoading(true)
    setError(null)
    setProposals([])
    setSelectedIdx(null)
    setProposalSource(null)

    try {
      const res = await fetch('/api/strategies/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId, targetNames, avoidNames }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to generate strategies')
        return
      }

      const response = data as ProposalResponse
      setProposals(response.proposals)
      setPlayerCount(response.meta.playerCount)
      setProposalSource(response.source ?? 'ai')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate strategies')
    } finally {
      setLoading(false)
    }
  }, [leagueId, targetNames, avoidNames])

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
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h2 className="ffi-title-lg" style={{ color: 'var(--ffi-ink)' }}>Strategy Proposals</h2>
            {proposalSource === 'rule-based' && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(139,255,69,0.14)', color: 'var(--ffi-volt)' }}
              >
                <Zap className="h-2.5 w-2.5" />
                Calibrated
              </span>
            )}
            {proposalSource === 'ai' && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest"
                style={{ background: 'rgba(121,166,255,0.14)', color: 'var(--ffi-blue-bright)' }}
              >
                <Sparkles className="h-2.5 w-2.5" />
                AI
              </span>
            )}
          </div>
          <p className="text-[13px]" style={{ color: 'var(--ffi-ink-2)' }}>
            {proposals.length > 0
              ? `${proposals.length} strategies from ${playerCount} players${targetNames.length > 0 ? ` - ${targetNames.length} target${targetNames.length > 1 ? 's' : ''} applied` : ''}`
              : `Generates ${format === 'auction' ? 'auction' : 'snake'} strategies from your player pool${targetNames.length > 0 ? ` - ${targetNames.length} target${targetNames.length > 1 ? 's' : ''} from active strategy` : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {proposals.length >= 2 && !comparing && (
            <button
              onClick={() => setComparing(true)}
              className="ffi-btn-secondary text-[13px]"
              style={{ padding: '0.5rem 1rem' }}
            >
              <Columns2 className="h-4 w-4" />
              Compare
            </button>
          )}
          <button
            onClick={() => setConfirming(true)}
            disabled={loading || confirming}
            className="ffi-btn-hero text-[13px] disabled:opacity-50"
            style={{ padding: '0.5rem 1.25rem' }}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {proposals.length > 0 ? 'Regenerate' : 'Generate Strategies'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI cost confirm */}
      {confirming && (
        <div className="rounded-md p-3.5" style={{ background: 'rgba(139,255,69,0.06)', border: '1px solid rgba(139,255,69,0.20)' }}>
          <p className="text-[13px] leading-[1.4]" style={{ color: 'var(--ffi-ink)' }}>
            Claude will analyze your player pool and generate 4-6 draft strategies. This uses your Anthropic API credits (~$0.01-0.05 per run).
          </p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setConfirming(false)}
              className="ffi-btn-secondary flex-1 text-[13px] font-bold"
              style={{ borderRadius: '11px', padding: '0.6rem' }}
            >
              Cancel
            </button>
            <button
              onClick={generate}
              className="ffi-btn-hero flex-1 text-[13px] uppercase tracking-widest"
              style={{ borderRadius: '11px' }}
            >
              Use AI credits
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="rounded-md p-8 flex flex-col items-center gap-3" style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}>
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--ffi-blue-bright)' }} />
          <div className="text-[13px] text-center" style={{ color: 'var(--ffi-ink-2)' }}>
            Generating strategies from your player pool...
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-md p-3 text-[13px]" style={{ background: 'rgba(255,110,138,0.12)', border: '1px solid rgba(255,110,138,0.24)', color: 'var(--ffi-danger)' }}>
          {error}
        </div>
      )}

      {/* Compare view or Proposals list */}
      {proposals.length > 0 && comparing && (
        <StrategyCompare
          proposals={proposals}
          format={format}
          onClose={() => setComparing(false)}
          onSelect={onSave ? (proposal) => {
            setComparing(false)
            const idx = proposals.indexOf(proposal)
            if (idx !== -1) setSelectedIdx(idx)
            onSave(proposal)
          } : undefined}
        />
      )}

      {proposals.length > 0 && !comparing && (
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
      {selectedIdx !== null && onSave && !comparing && (
        <div className="sticky bottom-16 sm:bottom-0 z-10 p-3 -mx-4 px-4" style={{ background: 'var(--ffi-bg-1)', borderTop: '1px solid var(--ffi-hairline)' }}>
          <button onClick={handleSave} className="ffi-btn-hero w-full text-[13px]">
            Save &ldquo;{proposals[selectedIdx].name}&rdquo; as active strategy
          </button>
        </div>
      )}
    </div>
  )
}
