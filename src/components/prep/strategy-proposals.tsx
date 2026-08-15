'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { RefreshCw, Star, ChevronRight } from 'lucide-react'
import type { StrategyProposal } from '@/lib/research/strategy/research'
import type { DraftFormat } from '@/lib/players/types'

interface StrategyProposalsProps {
  leagueId: string
  format: DraftFormat
  onSave?: (proposal: StrategyProposal) => void
  targetNames?: string[]
  avoidNames?: string[]
}

interface ProposalResponse {
  proposals: StrategyProposal[]
  source?: 'ai' | 'rule-based' | 'generated'
  meta: { leagueId: string; format: DraftFormat; playerCount: number; proposalCount: number }
}

interface RatingEntry {
  archetype: string
  rating: number
}

// --- Helpers ---

const POS_COLORS: Record<string, string> = {
  RB: 'var(--ffi-pos-rb)',
  WR: 'var(--ffi-pos-wr)',
  QB: 'var(--ffi-pos-qb)',
  TE: 'var(--ffi-pos-te)',
  DEF: 'var(--ffi-ink-3)',
  DST: 'var(--ffi-ink-3)',
}

function getTargetTypes(proposal: StrategyProposal, budget = 200): Array<{ pos: string; label: string }> {
  const alloc = proposal.budget_allocation
  const weights = proposal.position_weights as Record<string, number>
  const CORE = ['RB', 'WR', 'QB', 'TE']

  const posWithDollars: Array<{ pos: string; dollars: number }> = []

  if (alloc && Object.keys(alloc).length > 0) {
    for (const pos of CORE) {
      if ((alloc[pos] ?? 0) >= 8) {
        posWithDollars.push({ pos, dollars: Math.round(alloc[pos]) })
      }
    }
  } else if (weights) {
    const total = CORE.reduce((s, p) => s + (weights[p] ?? 0), 0) || 1
    for (const pos of CORE) {
      const dollars = Math.round(((weights[pos] ?? 0) / total) * budget)
      if (dollars >= 8) posWithDollars.push({ pos, dollars })
    }
  }

  return posWithDollars
    .sort((a, b) => b.dollars - a.dollars)
    .slice(0, 4)
    .map(({ pos, dollars }) => {
      const tier =
        dollars >= 55 ? 'Elite' : dollars >= 30 ? 'Mid-tier' : dollars >= 12 ? 'Value' : 'Bargain'
      return { pos, label: `${tier} ${pos} ~$${dollars}` }
    })
}

function strengthLabel(ceiling: number): string {
  if (ceiling >= 80) return 'Strong'
  if (ceiling >= 60) return 'Good'
  if (ceiling >= 40) return 'Fair'
  return 'Speculative'
}

// --- Star rating ---

function StarRating({
  value,
  onChange,
  size = 14,
}: {
  value: number
  onChange?: (n: number) => void
  size?: number
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = (hover || value) >= n
        return (
          <button
            key={n}
            onClick={() => onChange?.(n === value ? 0 : n)}
            onMouseEnter={() => onChange && setHover(n)}
            onMouseLeave={() => onChange && setHover(0)}
            className="transition-colors leading-none"
            aria-label={`Rate ${n} star${n !== 1 ? 's' : ''}`}
            disabled={!onChange}
          >
            <Star
              style={{
                width: size,
                height: size,
                fill: filled ? 'var(--ffi-volt)' : 'none',
                stroke: filled ? 'var(--ffi-volt)' : 'var(--ffi-ink-3)',
                strokeWidth: 1.5,
              }}
            />
          </button>
        )
      })}
    </div>
  )
}

// --- Single ranked row ---

function RankedRow({
  proposal,
  rank,
  rating,
  onRating,
  onSave,
}: {
  proposal: StrategyProposal
  rank: number
  rating: number
  onRating: (archetype: string, n: number) => void
  onSave?: (proposal: StrategyProposal) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const isTop = rank === 1

  const targetTypes = getTargetTypes(proposal)
  const strengthPct = proposal.projected_ceiling
  const floorPct = proposal.projected_floor

  return (
    <div
      className="rounded-[14px] overflow-hidden"
      style={{
        background: 'var(--ffi-surface-2)',
        border: `1px solid ${expanded ? 'var(--ffi-hairline-bright)' : 'var(--ffi-hairline)'}`,
        position: 'relative',
      }}
    >
      {/* Red left rail on #1 */}
      {isTop && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: 'linear-gradient(180deg, var(--ffi-volt), var(--ffi-volt-deep))',
          }}
        />
      )}

      {/* Collapsed row */}
      <button
        className="w-full flex items-center gap-0 text-left"
        style={{ padding: '13px 13px 13px 0' }}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        {/* Rank */}
        <div
          className="w-8 flex-shrink-0 flex items-center justify-center font-mono font-bold text-[11px]"
          style={{ color: isTop ? 'var(--ffi-volt)' : 'var(--ffi-ink-3)' }}
        >
          {rank}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div
            className="text-[14px] font-bold leading-tight truncate"
            style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
          >
            {proposal.name}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-[9px] font-bold uppercase tracking-widest rounded px-1.5 py-0.5"
              style={{
                fontFamily: 'var(--font-cond)',
                color: 'var(--ffi-ink-2)',
                background: 'rgba(159,178,198,0.10)',
                border: '1px solid rgba(159,178,198,0.14)',
              }}
            >
              {proposal.archetype}
            </span>
            {/* Strength bar */}
            <div className="flex items-center gap-1.5">
              <div
                className="h-[3px] rounded-full overflow-hidden"
                style={{ width: 56, background: 'rgba(95,168,224,0.12)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${strengthPct}%`,
                    background: 'linear-gradient(90deg, var(--ffi-blue), var(--ffi-blue-bright))',
                  }}
                />
              </div>
              <span
                className="text-[10px] font-mono font-bold"
                style={{ color: 'var(--ffi-ink-3)' }}
              >
                {strengthPct}
              </span>
            </div>
            <StarRating value={rating} size={12} />
          </div>
        </div>

        {/* Inline Use button on #1 */}
        {isTop && onSave && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSave(proposal)
            }}
            className="text-[10px] font-bold uppercase tracking-widest rounded-[7px] px-2.5 py-1.5 flex-shrink-0 mr-2"
            style={{
              fontFamily: 'var(--font-cond)',
              background: 'var(--ffi-volt)',
              color: 'var(--ffi-volt-ink)',
            }}
          >
            Use
          </button>
        )}

        {/* Chevron */}
        <ChevronRight
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            width: 14,
            height: 14,
            stroke: 'var(--ffi-ink-3)',
            strokeWidth: 2,
            fill: 'none',
            opacity: 0.5,
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            marginRight: 2,
          }}
        />
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            padding: '0 13px 14px 32px',
            borderTop: '1px solid var(--ffi-hairline)',
          }}
        >
          {/* How to approach */}
          <div className="mt-3">
            <span
              className="text-[9px] font-bold uppercase tracking-widest block mb-1.5"
              style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink-3)', letterSpacing: '0.22em' }}
            >
              How to approach
            </span>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ffi-ink-2)' }}>
              {proposal.philosophy || proposal.description}
            </p>
          </div>

          {/* Target player types */}
          {targetTypes.length > 0 && (
            <div className="mt-3">
              <span
                className="text-[9px] font-bold uppercase tracking-widest block mb-1.5"
                style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink-3)', letterSpacing: '0.22em' }}
              >
                Player types to target
              </span>
              <div className="flex flex-wrap gap-1.5">
                {targetTypes.map(({ pos, label }) => (
                  <span
                    key={pos}
                    className="inline-flex items-center gap-1.5 text-[11px] rounded-[7px] px-2 py-1"
                    style={{
                      background: 'rgba(95,168,224,0.08)',
                      border: '1px solid rgba(95,168,224,0.16)',
                      color: 'var(--ffi-ink-2)',
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-sm flex-shrink-0"
                      style={{ background: POS_COLORS[pos] ?? 'var(--ffi-ink-3)' }}
                    />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Players you likely can't get */}
          {proposal.key_avoids.length > 0 && (
            <div className="mt-3">
              <span
                className="text-[9px] font-bold uppercase tracking-widest block mb-1.5"
                style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink-3)', letterSpacing: '0.22em' }}
              >
                Players you likely can&apos;t get
              </span>
              <div className="flex flex-col gap-1">
                {proposal.key_avoids.slice(0, 3).map((name) => (
                  <div
                    key={name}
                    className="flex items-center justify-between px-2 py-1.5 rounded-[7px]"
                    style={{
                      background: 'rgba(255,110,138,0.07)',
                      border: '1px solid rgba(255,110,138,0.14)',
                    }}
                  >
                    <span
                      className="text-[12px] font-bold"
                      style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
                    >
                      {name}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--ffi-ink-3)' }}>
                      likely priced out
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strength vs league */}
          <div className="mt-3">
            <span
              className="text-[9px] font-bold uppercase tracking-widest block mb-1.5"
              style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink-3)', letterSpacing: '0.22em' }}
            >
              Strength vs league
            </span>
            <div className="flex items-center gap-3">
              <div>
                <div
                  className="text-[20px] font-mono font-bold leading-none"
                  style={{ color: 'var(--ffi-ink)' }}
                >
                  {strengthPct}
                </div>
                <div className="text-[9px] mt-0.5" style={{ color: 'var(--ffi-ink-3)' }}>
                  / 100 score
                </div>
              </div>
              <div
                style={{ width: 1, height: 28, background: 'var(--ffi-hairline)', flexShrink: 0 }}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px]" style={{ color: 'var(--ffi-ink-3)' }}>
                  Floor{' '}
                  <span
                    className="font-mono font-bold"
                    style={{ color: 'var(--ffi-blue)' }}
                  >
                    {floorPct}
                  </span>
                </span>
                <span className="text-[10px]" style={{ color: 'var(--ffi-ink-3)' }}>
                  Ceiling{' '}
                  <span
                    className="font-mono font-bold"
                    style={{ color: 'var(--ffi-blue)' }}
                  >
                    {strengthPct}
                  </span>
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10px]" style={{ color: 'var(--ffi-ink-3)' }}>
                  <span
                    className="font-bold capitalize"
                    style={{ color: 'var(--ffi-ink-2)' }}
                  >
                    {strengthLabel(strengthPct)}
                  </span>{' '}
                  overall
                </span>
                <span className="text-[10px]" style={{ color: 'var(--ffi-ink-3)' }}>
                  <span
                    className="font-bold capitalize"
                    style={{ color: 'var(--ffi-ink-2)' }}
                  >
                    {proposal.risk_tolerance}
                  </span>{' '}
                  risk
                </span>
              </div>
            </div>
          </div>

          {/* Star rating (interactive) */}
          <div className="mt-3">
            <span
              className="text-[9px] font-bold uppercase tracking-widest block mb-1.5"
              style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink-3)', letterSpacing: '0.22em' }}
            >
              Your rating
            </span>
            <StarRating
              value={rating}
              onChange={(n) => onRating(proposal.archetype, n)}
              size={16}
            />
          </div>

          {/* Use this strategy */}
          {onSave && (
            <button
              onClick={() => onSave(proposal)}
              className="ffi-btn-hero w-full text-[12px] mt-4"
            >
              Use this strategy
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// --- Main exported component ---

export function StrategyProposals({
  leagueId,
  format,
  onSave,
  targetNames = [],
  avoidNames = [],
}: StrategyProposalsProps) {
  const [proposals, setProposals] = useState<StrategyProposal[]>([])
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetchedRef = useRef(false)

  const fetchProposals = useCallback(
    async (isRegenerate = false) => {
      setLoading(true)
      if (isRegenerate) setProposals([])
      setError(null)
      fetchedRef.current = true
      try {
        const res = await fetch('/api/strategies/propose', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leagueId, format, targetNames, avoidNames }),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || 'Failed to load strategies')
          return
        }
        const response = data as ProposalResponse
        const sorted = [...response.proposals].sort(
          (a, b) => b.projected_ceiling - a.projected_ceiling
        )
        setProposals(sorted)
      } catch {
        setError('Failed to load strategies')
      } finally {
        setLoading(false)
      }
    },
    [leagueId, format, targetNames, avoidNames]
  )

  const fetchRatings = useCallback(async () => {
    try {
      const res = await fetch(`/api/strategies/ratings?leagueId=${leagueId}`)
      if (!res.ok) return
      const data = await res.json()
      const map: Record<string, number> = {}
      for (const entry of (data.ratings ?? []) as RatingEntry[]) {
        map[entry.archetype] = entry.rating
      }
      setRatings(map)
    } catch {
      // Non-critical — ratings degrade gracefully
    }
  }, [leagueId])

  // Auto-load on mount
  useEffect(() => {
    if (fetchedRef.current) return
    fetchProposals()
    fetchRatings()
  }, [fetchProposals, fetchRatings])

  const handleRating = useCallback(
    async (archetype: string, n: number) => {
      setRatings((prev) => {
        if (n === 0) {
          const next = { ...prev }
          delete next[archetype]
          return next
        }
        return { ...prev, [archetype]: n }
      })
      try {
        await fetch('/api/strategies/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leagueId, archetype, rating: n }),
        })
      } catch {
        // Non-critical optimistic update — silently fail
      }
    },
    [leagueId]
  )

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="ffi-skeleton rounded-[14px]"
            style={{ height: 60 }}
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-[14px] p-4 text-center"
        style={{
          background: 'rgba(255,110,138,0.08)',
          border: '1px solid rgba(255,110,138,0.20)',
        }}
      >
        <p className="text-[13px] mb-3" style={{ color: 'var(--ffi-danger)' }}>
          {error}
        </p>
        <button
          onClick={() => fetchProposals(true)}
          className="ffi-btn-secondary text-[12px]"
        >
          Retry
        </button>
      </div>
    )
  }

  if (proposals.length === 0) {
    return (
      <div
        className="rounded-[14px] p-6 text-center"
        style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}
      >
        <p className="text-[13px]" style={{ color: 'var(--ffi-ink-2)' }}>
          No strategy options available for this pool yet.
        </p>
        <button
          onClick={() => fetchProposals(true)}
          className="ffi-btn-secondary text-[12px] mt-3"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-1.5">
        {proposals.map((proposal, i) => (
          <RankedRow
            key={`${proposal.archetype}-${i}`}
            proposal={proposal}
            rank={i + 1}
            rating={ratings[proposal.archetype] ?? 0}
            onRating={handleRating}
            onSave={onSave}
          />
        ))}
      </div>

      {/* Quiet regenerate */}
      <button
        onClick={() => {
          fetchedRef.current = false
          fetchProposals(true)
        }}
        className="flex items-center justify-center gap-1.5 w-full mt-4 text-[11px] font-bold uppercase tracking-widest"
        style={{
          fontFamily: 'var(--font-cond)',
          color: 'var(--ffi-ink-3)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <RefreshCw style={{ width: 11, height: 11, stroke: 'var(--ffi-ink-3)', fill: 'none' }} />
        Regenerate strategies
      </button>
    </div>
  )
}
