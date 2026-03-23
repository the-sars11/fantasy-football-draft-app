'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, ArrowDown, Target, Ban, ChevronDown, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FFICard,
  FFIPositionBadge,
  FFIBadge,
  FFITacticalInsight,
} from '@/components/ui/ffi-primitives'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat, Position } from '@/lib/players/types'

type SortField = 'rank' | 'score' | 'value' | 'adp' | 'name'

interface DraftBoardTableProps {
  players: ScoredPlayer[]
  format: DraftFormat
  sortField: SortField
  sortAsc: boolean
  onSort: (field: SortField) => void
}

function SortButton({
  field,
  label,
  current,
  asc,
  onSort,
}: {
  field: SortField
  label: string
  current: SortField
  asc: boolean
  onSort: (f: SortField) => void
}) {
  const isActive = field === current
  return (
    <button
      onClick={() => onSort(field)}
      className={cn(
        'ffi-label px-2 py-1 rounded-md transition-all',
        isActive
          ? 'bg-[var(--ffi-primary)]/20 text-[var(--ffi-primary)]'
          : 'text-[var(--ffi-text-muted)] hover:text-white hover:bg-[var(--ffi-surface)]'
      )}
    >
      {label}
      {isActive && (
        asc
          ? <ArrowUp className="inline h-3 w-3 ml-1" />
          : <ArrowDown className="inline h-3 w-3 ml-1" />
      )}
    </button>
  )
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-[var(--ffi-success)]'
  if (score >= 60) return 'text-emerald-400'
  if (score >= 40) return 'text-[var(--ffi-text-secondary)]'
  if (score >= 25) return 'text-[var(--ffi-warning)]'
  return 'text-[var(--ffi-danger)]'
}

function generateInsight(sp: ScoredPlayer, format: DraftFormat): string {
  const p = sp.player
  const boostText = sp.boosts.length > 0 ? sp.boosts.slice(0, 2).join(', ') : ''

  if (sp.targetStatus === 'target') {
    return `High-value target. ${boostText ? `Boosted by: ${boostText}.` : ''} Strategy alignment score indicates strong fit for your build.`
  }
  if (sp.targetStatus === 'avoid') {
    return `Below strategy threshold. Consider alternatives at ${p.position} unless price drops significantly.`
  }

  const valueContext = format === 'auction'
    ? `Projected at $${sp.adjustedAuctionValue ?? p.consensusAuctionValue}.`
    : `ADP suggests round ${Math.ceil(p.adp / 12)} selection.`

  return `${valueContext} ${boostText ? `Strategy factors: ${boostText}.` : 'Neutral fit for current strategy.'}`
}

interface CompactPlayerCardProps {
  sp: ScoredPlayer
  rank: number
  format: DraftFormat
  isExpanded: boolean
  onToggle: () => void
}

function CompactPlayerCard({ sp, rank, format, isExpanded, onToggle }: CompactPlayerCardProps) {
  const p = sp.player
  const isAuction = format === 'auction'
  const value = isAuction
    ? sp.adjustedAuctionValue ?? p.consensusAuctionValue
    : sp.adjustedRoundValue ?? Math.ceil(p.adp / 12)
  const valueRange = isAuction
    ? { low: Math.floor(value * 0.85), high: Math.ceil(value * 1.15) }
    : undefined

  return (
    <div
      className={cn(
        'transition-all duration-200',
        sp.targetStatus === 'avoid' && 'opacity-60'
      )}
    >
      <FFICard
        variant={isExpanded ? 'elevated' : 'interactive'}
        className={cn(
          'cursor-pointer',
          sp.targetStatus === 'target' && 'border-l-2 border-l-[var(--ffi-success)]'
        )}
        onClick={onToggle}
      >
        {/* Main row */}
        <div className="flex items-center gap-3">
          {/* Rank */}
          <span className={cn(
            'ffi-display-md font-bold w-8 shrink-0 text-center',
            sp.targetStatus === 'target' ? 'text-[var(--ffi-accent)]' : 'text-[var(--ffi-primary)]'
          )}>
            {String(rank).padStart(2, '0')}
          </span>

          {/* Position badge */}
          <FFIPositionBadge position={p.position as Position} />

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="ffi-title-md text-white font-semibold truncate">{p.name}</span>
              {sp.targetStatus === 'target' && (
                <Target className="h-3.5 w-3.5 text-[var(--ffi-success)] shrink-0" />
              )}
              {sp.targetStatus === 'avoid' && (
                <Ban className="h-3.5 w-3.5 text-[var(--ffi-danger)] shrink-0" />
              )}
            </div>
            <div className="ffi-body-md text-[var(--ffi-text-secondary)]">
              {p.team} • BYE {p.byeWeek}
            </div>
          </div>

          {/* Value + Score */}
          <div className="text-right shrink-0">
            <div className="ffi-title-lg text-[var(--ffi-accent)] font-bold">
              {isAuction ? `$${value}` : `Rd ${value}`}
            </div>
            <div className={cn('ffi-label', scoreColor(sp.strategyScore))}>
              {sp.strategyScore} PTS
            </div>
          </div>

          {/* Expand indicator */}
          <ChevronDown className={cn(
            'h-4 w-4 text-[var(--ffi-text-muted)] transition-transform shrink-0',
            isExpanded && 'rotate-180'
          )} />
        </div>

        {/* Tags row */}
        {sp.boosts.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2 pl-11">
            {sp.boosts.slice(0, 3).map((boost, i) => (
              <FFIBadge key={i} variant="tag" status="info" className="text-[10px]">
                {boost}
              </FFIBadge>
            ))}
            {sp.boosts.length > 3 && (
              <span className="text-[10px] text-[var(--ffi-text-muted)]">
                +{sp.boosts.length - 3} more
              </span>
            )}
          </div>
        )}

        {/* Expanded tactical insight */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-[var(--ffi-border)]/20">
            <FFITacticalInsight
              insight={generateInsight(sp, format)}
              confidence={Math.min(100, sp.strategyScore + 20)}
              className="bg-transparent p-0"
            />

            {/* Additional stats when expanded */}
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[var(--ffi-border)]/10">
              <div>
                <div className="ffi-caption text-[var(--ffi-text-muted)]">RANK</div>
                <div className="ffi-title-md text-white">{p.consensusRank}</div>
              </div>
              <div>
                <div className="ffi-caption text-[var(--ffi-text-muted)]">ADP</div>
                <div className="ffi-title-md text-white">{p.adp > 0 ? p.adp.toFixed(1) : '—'}</div>
              </div>
              <div>
                <div className="ffi-caption text-[var(--ffi-text-muted)]">
                  {isAuction ? 'RANGE' : 'ECR'}
                </div>
                <div className="ffi-title-md text-white">
                  {isAuction && valueRange
                    ? `$${valueRange.low}-${valueRange.high}`
                    : p.consensusRank
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </FFICard>
    </div>
  )
}

export function DraftBoardTable({
  players,
  format,
  sortField,
  sortAsc,
  onSort,
}: DraftBoardTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="space-y-3">
      {/* Sort controls */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="ffi-caption text-[var(--ffi-text-muted)] shrink-0">Sort:</span>
        <SortButton field="score" label="Score" current={sortField} asc={sortAsc} onSort={onSort} />
        <SortButton field="value" label={format === 'auction' ? 'Value' : 'Round'} current={sortField} asc={sortAsc} onSort={onSort} />
        <SortButton field="rank" label="Rank" current={sortField} asc={sortAsc} onSort={onSort} />
        <SortButton field="adp" label="ADP" current={sortField} asc={sortAsc} onSort={onSort} />
        <SortButton field="name" label="Name" current={sortField} asc={sortAsc} onSort={onSort} />
      </div>

      {/* Player cards with cascade animation */}
      {players.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <FFICard className="text-center py-12">
            <div className="text-[var(--ffi-text-muted)]">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No players match your filters</p>
            </div>
          </FFICard>
        </motion.div>
      ) : (
        <motion.div className="space-y-2" layout>
          <AnimatePresence mode="popLayout">
            {players.map((sp, idx) => (
              <motion.div
                key={sp.player.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  delay: Math.min(idx * 0.02, 0.3), // Cap delay for long lists
                }}
              >
                <CompactPlayerCard
                  sp={sp}
                  rank={idx + 1}
                  format={format}
                  isExpanded={expandedId === sp.player.id}
                  onToggle={() => handleToggle(sp.player.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}