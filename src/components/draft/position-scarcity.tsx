'use client'

/**
 * PositionScarcityTracker (FF-035, FF-073 Redesign)
 *
 * Premium position scarcity display with FFI design system:
 * - Smooth gradient progress bars (not segmented)
 * - CRITICAL / STABLE / ELITE status labels
 * - Spend range indicators per position
 * - Stagger animation on mount
 */

import { motion } from 'framer-motion'
import { AlertTriangle, TrendingDown, Shield, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PositionScarcity } from '@/lib/draft/explain'
import type { Position } from '@/lib/players/types'

// Map old scarcity levels to new FFI status system
type ScarcityStatus = 'critical' | 'stable' | 'elite'

interface StatusConfig {
  label: string
  icon: typeof AlertTriangle
  progressClass: string
  badgeClass: string
  textClass: string
}

const statusMap: Record<PositionScarcity['scarcityLevel'], ScarcityStatus> = {
  critical: 'critical',
  low: 'critical', // low is still critical in the new design
  moderate: 'stable',
  abundant: 'elite',
}

const statusConfig: Record<ScarcityStatus, StatusConfig> = {
  critical: {
    label: 'CRITICAL',
    icon: AlertTriangle,
    progressClass: 'ffi-progress-critical',
    badgeClass: 'bg-[var(--ffi-danger)]/15 text-[var(--ffi-danger)] border-[var(--ffi-danger)]/30',
    textClass: 'text-[var(--ffi-danger)]',
  },
  stable: {
    label: 'STABLE',
    icon: Shield,
    progressClass: 'ffi-progress-stable',
    badgeClass: 'bg-[var(--ffi-warning)]/15 text-[var(--ffi-warning)] border-[var(--ffi-warning)]/30',
    textClass: 'text-[var(--ffi-warning)]',
  },
  elite: {
    label: 'ELITE',
    icon: Sparkles,
    progressClass: 'ffi-progress-elite',
    badgeClass: 'bg-[var(--ffi-success)]/15 text-[var(--ffi-success)] border-[var(--ffi-success)]/30',
    textClass: 'text-[var(--ffi-success)]',
  },
}

// Position badge colors (matching FFI design system)
const positionBadgeClass: Record<Position, string> = {
  QB: 'ffi-badge-qb',
  RB: 'ffi-badge-rb',
  WR: 'ffi-badge-wr',
  TE: 'ffi-badge-te',
  K: 'ffi-badge-k',
  DEF: 'ffi-badge-def',
}

// Extended scarcity data with spend ranges
export interface PositionScarcityExtended extends PositionScarcity {
  spendRange?: { low: number; high: number }
  avgValue?: number
}

interface PositionScarcityTrackerProps {
  scarcity: PositionScarcityExtended[]
  maxStartable?: number // baseline for progress calculation (default: 24)
  showSpendRanges?: boolean
  compact?: boolean
}

export function PositionScarcityTracker({
  scarcity,
  maxStartable = 24,
  showSpendRanges = true,
  compact = false,
}: PositionScarcityTrackerProps) {
  const criticalCount = scarcity.filter(
    s => statusMap[s.scarcityLevel] === 'critical'
  ).length

  // Calculate progress percentage (inverted: lower remaining = higher urgency)
  const getProgressValue = (s: PositionScarcityExtended) => {
    const percentage = (s.startableRemaining / maxStartable) * 100
    return Math.max(5, Math.min(100, percentage)) // clamp 5-100%
  }

  return (
    <div className="space-y-4">
      {/* Header with alert count */}
      <div className="flex items-center justify-between">
        <h3 className="ffi-title-md text-white flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-[var(--ffi-primary)]" />
          Position Scarcity
        </h3>
        {criticalCount > 0 && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ffi-danger)]/15 border border-[var(--ffi-danger)]/30"
          >
            <AlertTriangle className="h-3 w-3 text-[var(--ffi-danger)]" />
            <span className="ffi-label text-[var(--ffi-danger)]">
              {criticalCount} CRITICAL
            </span>
          </motion.div>
        )}
      </div>

      {/* Position grid */}
      <div className={cn(
        "grid gap-3",
        compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
      )}>
        {scarcity.map((s, index) => {
          const status = statusMap[s.scarcityLevel]
          const config = statusConfig[status]
          const StatusIcon = config.icon
          const progress = getProgressValue(s)

          return (
            <motion.div
              key={s.position}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 25,
                delay: index * 0.05,
              }}
              className="ffi-card group"
            >
              {/* Top row: Position badge + Status */}
              <div className="flex items-center justify-between mb-3">
                <span className={cn('ffi-badge', positionBadgeClass[s.position])}>
                  {s.position}
                </span>
                <div className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border',
                  config.badgeClass
                )}>
                  <StatusIcon className="h-2.5 w-2.5" />
                  {config.label}
                </div>
              </div>

              {/* Progress bar */}
              <div className={cn('ffi-progress mb-2', config.progressClass)}>
                <motion.div
                  className="ffi-progress-bar"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 + 0.2, ease: 'easeOut' }}
                />
              </div>

              {/* Stats row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-[var(--ffi-text-secondary)]">
                    <span className={cn('font-mono font-bold', config.textClass)}>
                      {s.startableRemaining}
                    </span>
                    {' '}startable
                  </span>
                  <span className="text-[var(--ffi-text-muted)]">
                    ({s.tier1Remaining} T1 · {s.tier2Remaining} T2)
                  </span>
                </div>
              </div>

              {/* Spend range (optional) */}
              {showSpendRanges && s.spendRange && (
                <div className="mt-2 pt-2 border-t border-[var(--ffi-border)]/10">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--ffi-text-muted)] uppercase tracking-wider">
                      Spend Range
                    </span>
                    <span className="font-mono text-[var(--ffi-text-secondary)]">
                      ${s.spendRange.low}–${s.spendRange.high}
                    </span>
                  </div>
                </div>
              )}

              {/* Average value indicator (when no spend range) */}
              {showSpendRanges && !s.spendRange && s.avgValue && (
                <div className="mt-2 pt-2 border-t border-[var(--ffi-border)]/10">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--ffi-text-muted)] uppercase tracking-wider">
                      Avg Value
                    </span>
                    <span className="font-mono text-[var(--ffi-accent)]">
                      ${s.avgValue}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-[var(--ffi-text-muted)]">
        <span className="flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-[var(--ffi-danger)]" />
          CRITICAL = Act Now
        </span>
        <span className="flex items-center gap-1.5">
          <Shield className="h-3 w-3 text-[var(--ffi-warning)]" />
          STABLE = Monitor
        </span>
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-[var(--ffi-success)]" />
          ELITE = Deep Pool
        </span>
      </div>
    </div>
  )
}

/**
 * Mini variant for compact displays (e.g., sidebar summary)
 */
interface PositionScarcityMiniProps {
  scarcity: PositionScarcityExtended[]
}

export function PositionScarcityMini({ scarcity }: PositionScarcityMiniProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {scarcity.map(s => {
        const status = statusMap[s.scarcityLevel]
        const config = statusConfig[status]

        return (
          <div
            key={s.position}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-lg',
              'bg-[var(--ffi-surface)]/60 border',
              status === 'critical' && 'border-[var(--ffi-danger)]/30',
              status === 'stable' && 'border-[var(--ffi-warning)]/30',
              status === 'elite' && 'border-[var(--ffi-success)]/30'
            )}
          >
            <span className={cn('ffi-badge text-[10px] px-1.5', positionBadgeClass[s.position])}>
              {s.position}
            </span>
            <span className={cn('ffi-label', config.textClass)}>
              {s.startableRemaining}
            </span>
          </div>
        )
      })}
    </div>
  )
}