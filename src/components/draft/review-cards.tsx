'use client'

/**
 * Review cards (extracted from review/client.tsx, finding 9)
 *
 * Presentational sub-components for the post-draft review screen plus the
 * grade/verdict color maps they depend on. All presentational - data and
 * state live in ReviewClient.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  DollarSign,
  Hash,
  ArrowRight,
  Download,
  Copy,
  CheckCheck,
  Sparkles,
  Zap,
  AlertTriangle,
  Target,
} from 'lucide-react'
import { FFIPositionBadge } from '@/components/ui/ffi-primitives'
import { FFICelebration, FFIConfettiBurst } from '@/components/ui/ffi-motion'
import { useHaptic } from '@/hooks/use-haptic'
import { useSound } from '@/lib/sound/use-sound'
import type { DraftReview, PickAnalysis, PickVerdict } from '@/lib/draft/review'

// Grade color map — volt for A, blue for B/C, warning for D, danger for F. No gold.
const gradeColors: Record<string, {
  letter: string; borderColor: string; glow: string; blob: string; verdictColor: string
}> = {
  A: {
    letter: 'var(--ffi-volt)',
    borderColor: 'rgba(139,255,69,0.38)',
    glow: '0 0 44px rgba(139,255,69,0.32), 0 0 80px rgba(139,255,69,0.12)',
    blob: 'rgba(139,255,69,0.20)',
    verdictColor: 'var(--ffi-volt)',
  },
  B: {
    letter: 'var(--ffi-blue-bright)',
    borderColor: 'rgba(77,130,255,0.38)',
    glow: '0 0 40px rgba(77,130,255,0.30)',
    blob: 'rgba(77,130,255,0.18)',
    verdictColor: 'var(--ffi-blue-bright)',
  },
  C: {
    letter: 'var(--ffi-warning)',
    borderColor: 'rgba(255,176,92,0.30)',
    glow: '0 0 36px rgba(255,176,92,0.22)',
    blob: 'rgba(255,176,92,0.10)',
    verdictColor: 'var(--ffi-warning)',
  },
  D: {
    letter: 'var(--ffi-warning)',
    borderColor: 'rgba(255,176,92,0.22)',
    glow: '0 0 28px rgba(255,176,92,0.16)',
    blob: 'rgba(255,176,92,0.07)',
    verdictColor: 'var(--ffi-warning)',
  },
  F: {
    letter: 'var(--ffi-danger)',
    borderColor: 'rgba(255,110,138,0.38)',
    glow: '0 0 40px rgba(255,110,138,0.30)',
    blob: 'rgba(255,110,138,0.14)',
    verdictColor: 'var(--ffi-danger)',
  },
}

// Verdict badge styling — GRIDIRON palette
const verdictConfig: Record<PickVerdict, {
  label: string
  bg: string
  border: string
  color: string
  icon: typeof Sparkles
}> = {
  steal: {
    label: 'STEAL',
    bg: 'rgba(139,255,69,0.12)',
    border: 'rgba(139,255,69,0.28)',
    color: 'var(--ffi-volt)',
    icon: Sparkles,
  },
  reach: {
    label: 'REACH',
    bg: 'rgba(255,110,138,0.10)',
    border: 'rgba(255,110,138,0.24)',
    color: 'var(--ffi-danger)',
    icon: AlertTriangle,
  },
  fair: {
    label: 'FAIR VALUE',
    bg: 'rgba(77,130,255,0.10)',
    border: 'rgba(77,130,255,0.22)',
    color: 'var(--ffi-blue-bright)',
    icon: Check,
  },
  ai_pivot: {
    label: 'AI PIVOT',
    bg: 'rgba(167,139,250,0.10)',
    border: 'rgba(167,139,250,0.22)',
    color: '#a78bfa',
    icon: Zap,
  },
}

// Champion verdict word per grade
const gradeVerdict: Record<string, string> = {
  A: 'ELITE DRAFT',
  B: 'STRONG BOARD',
  C: 'SOLID WORK',
  D: 'ROOM TO RUN',
  F: 'REBUILD MODE',
}

export function GradeHero({
  review, managerName, strategyName, onExportCSV, onShare, copied,
}: {
  review: DraftReview
  managerName: string
  strategyName?: string
  onExportCSV: () => void
  onShare: () => void
  copied: boolean
}) {
  const letter = review.overallGrade.charAt(0)
  const colors = gradeColors[letter] ?? gradeColors['C']
  const verdict = gradeVerdict[letter] ?? ''
  const isChampion = letter === 'A' || letter === 'B'
  const haptic = useHaptic()
  const { play } = useSound()
  const [celebrate, setCelebrate] = useState(false)

  useEffect(() => {
    if (!isChampion) return
    const t = setTimeout(() => {
      setCelebrate(true)
      haptic('champion')
      play('champion')
    }, 350)
    return () => clearTimeout(t)
  }, [isChampion, haptic, play])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="ffi-hero p-6"
    >
      {/* Atmosphere blob */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: -50, left: '50%', transform: 'translateX(-50%)',
          width: 260, height: 200, pointerEvents: 'none',
          background: `radial-gradient(ellipse at 50% 30%, ${colors.blob}, transparent 70%)`,
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Celebration burst */}
        <div className="relative">
          <FFICelebration show={celebrate} tone="gold" className="absolute inset-0">
            <span className="sr-only">Draft graded</span>
          </FFICelebration>
          <FFIConfettiBurst show={celebrate} />

          {/* Verdict label above ring */}
          {verdict && (
            <p className="ffi-caption mb-3" style={{ letterSpacing: '.38em', color: colors.verdictColor }}>
              {verdict}
            </p>
          )}

          {/* Grade ring */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24, delay: 0.18 }}
            style={{
              width: 112, height: 112,
              borderRadius: 20,
              background: 'var(--ffi-surface-3)',
              border: `2px solid ${colors.borderColor}`,
              boxShadow: colors.glow,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto',
            }}
          >
            <span
              className="font-display"
              style={{ fontSize: 68, lineHeight: 1, color: colors.letter }}
            >
              {letter}
            </span>
          </motion.div>
        </div>

        {/* Score */}
        <div className="flex items-baseline gap-1.5 mt-4 mb-1">
          <span
            className="font-mono font-bold"
            style={{ fontSize: 30, lineHeight: 1, color: colors.letter }}
          >
            {review.overallScore}
          </span>
          <span className="ffi-caption text-[var(--ffi-ink-3)]">/ 100</span>
        </div>

        {/* Summary */}
        <p className="font-headline font-bold text-lg text-white mb-1">{review.summary}</p>
        <p className="ffi-body-md text-[var(--ffi-ink-3)] mb-1">
          {managerName}&apos;s draft{strategyName && <> &middot; &ldquo;{strategyName}&rdquo;</>}
        </p>
        {review.pivotImpact && (
          <p className="ffi-body-md text-[var(--ffi-ink-3)] flex items-center gap-1.5 mb-3">
            <ArrowRight className="h-3.5 w-3.5" color="var(--ffi-blue)" />
            {review.pivotImpact}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4 w-full">
          <button
            onClick={onExportCSV}
            className="flex-1 flex items-center justify-center gap-2 min-h-[42px] rounded-xl ffi-label"
            style={{
              background: 'var(--ffi-surface-3)',
              border: '1px solid var(--ffi-hairline)',
              color: 'var(--ffi-ink-2)',
              letterSpacing: '.12em',
            }}
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 min-h-[42px] rounded-xl ffi-label"
            style={{
              background: 'var(--ffi-surface-3)',
              border: '1px solid var(--ffi-hairline)',
              color: copied ? 'var(--ffi-volt)' : 'var(--ffi-ink-2)',
              letterSpacing: '.12em',
            }}
          >
            {copied
              ? <><CheckCheck className="h-4 w-4" />Copied!</>
              : <><Copy className="h-4 w-4" />Share</>
            }
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export function StatTile({
  label, value, icon, valueColor, accentBorder,
}: {
  label: string
  value: number
  icon: React.ReactNode
  valueColor: string
  accentBorder?: string
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--ffi-surface-2)',
        border: `1px solid ${accentBorder ?? 'var(--ffi-hairline)'}`,
        boxShadow: '0 8px 32px rgba(0,0,0,0.36)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="ffi-caption text-[var(--ffi-ink-3)]">{label}</span>
      </div>
      <span
        className="font-mono font-bold"
        style={{ fontSize: 36, lineHeight: 1, color: valueColor }}
      >
        {value}
      </span>
    </div>
  )
}

export function SwCard({ title, type, items, emptyText }: {
  title: string
  type: 'wins' | 'risks'
  items: string[]
  emptyText: string
}) {
  const dotColor = type === 'wins' ? 'var(--ffi-volt)' : 'var(--ffi-warning)'
  const headColor = type === 'wins' ? 'var(--ffi-volt)' : 'var(--ffi-warning)'
  const Icon = type === 'wins' ? TrendingUp : TrendingDown

  return (
    <div className="ffi-card">
      <div className="flex items-center gap-1.5 mb-3">
        <Icon className="h-3.5 w-3.5" color={headColor} />
        <span className="ffi-caption" style={{ color: headColor, letterSpacing: '.22em' }}>{title.toUpperCase()}</span>
      </div>
      {items.length === 0 ? (
        <p className="ffi-body-md text-[var(--ffi-ink-3)]">{emptyText}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className="mt-[5px] shrink-0 rounded-full"
                style={{ width: 5, height: 5, background: dotColor }}
              />
              <span className="ffi-body-md text-[var(--ffi-ink-2)] leading-snug">{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function SectHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-2 mt-1">
      <span className="ffi-caption text-[var(--ffi-ink-3)]">{title.toUpperCase()}</span>
      <div className="flex-1 h-px" style={{ background: 'var(--ffi-hairline)' }} />
    </div>
  )
}

export function PickCard({ pick, format, index, expanded, onToggle }: {
  pick: PickAnalysis
  format: 'auction' | 'snake'
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const vc = verdictConfig[pick.verdict]
  const VerdictIcon = vc.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.025, duration: 0.22 }}
    >
      <div
        className="ffi-card-interactive"
        style={{ borderRadius: expanded ? '14px 14px 0 0' : 14, borderBottomColor: expanded ? 'transparent' : undefined }}
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          {/* Pick number */}
          <div className="text-center shrink-0 w-10">
            <p className="ffi-caption text-[var(--ffi-ink-3)]">
              {format === 'snake' && pick.round ? `RD ${pick.round}` : 'PICK'}
            </p>
            <p className="font-mono font-bold text-sm text-[var(--ffi-ink-2)]">#{pick.pickNumber}</p>
          </div>

          {/* Divider */}
          <div className="w-px h-8 shrink-0" style={{ background: 'var(--ffi-hairline)' }} />

          {/* Player info */}
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-[15px] text-white truncate mb-0.5">{pick.playerName}</p>
            <div className="flex items-center gap-2">
              <FFIPositionBadge position={pick.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"} className="text-[10px] px-1.5 py-0.5" />
              {format === 'auction' && pick.price != null && (
                <span className="font-mono text-xs text-[var(--ffi-ink-3)]">${pick.price}</span>
              )}
              {pick.adpValue != null && (
                <span
                  className="font-mono font-bold text-xs"
                  style={{ color: pick.adpValue > 0 ? 'var(--ffi-volt)' : 'var(--ffi-danger)' }}
                >
                  {pick.adpValue > 0 ? '+' : ''}{pick.adpValue}
                </span>
              )}
            </div>
          </div>

          {/* Verdict badge */}
          <div
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full ffi-caption"
            style={{
              background: vc.bg,
              border: `1px solid ${vc.border}`,
              color: vc.color,
              fontSize: 9,
              letterSpacing: '.18em',
            }}
          >
            <VerdictIcon className="h-2.5 w-2.5" />
            {vc.label}
          </div>
        </div>
      </div>

      {/* Expanded narrative */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-3 rounded-b-[14px]"
              style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)', borderTop: 'none' }}
            >
              <p className="ffi-body-md text-[var(--ffi-ink-2)] leading-relaxed">{pick.narrative}</p>
              {!pick.strategyAlignment && (
                <p className="ffi-body-md mt-2 flex items-center gap-1.5" style={{ color: 'var(--ffi-warning)' }}>
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Deviated from strategy at this pick
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export function PositionalPowerRankings({ grades }: { grades: DraftReview['positionGrades'] }) {
  const SEGMENTS = 10
  const positionNames: Record<string, string> = {
    QB: 'Quarterback', RB: 'Running Back', WR: 'Wide Receiver',
    TE: 'Tight End', K: 'Kicker', DEF: 'Defense',
  }

  function segColor(score: number, filled: boolean) {
    if (!filled) return 'var(--ffi-surface-3)'
    if (score >= 80) return 'var(--ffi-volt)'
    if (score >= 50) return 'var(--ffi-blue)'
    return 'var(--ffi-danger)'
  }

  function scoreColor(score: number) {
    if (score >= 80) return 'var(--ffi-volt)'
    if (score >= 50) return 'var(--ffi-blue-bright)'
    return 'var(--ffi-danger)'
  }

  return (
    <div className="ffi-card space-y-5">
      {grades.map(grade => {
        const filledCount = Math.round(grade.score / 10)
        return (
          <div key={grade.position}>
            <div className="flex justify-between items-center mb-2">
              <span className="font-headline font-bold text-sm text-white">
                {positionNames[grade.position] || grade.position}
              </span>
              <span className="font-mono font-bold text-sm" style={{ color: scoreColor(grade.score) }}>
                {grade.score}
              </span>
            </div>
            <div className="flex gap-[3px]">
              {Array.from({ length: SEGMENTS }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-1.5 rounded-sm"
                  style={{ background: segColor(grade.score, i < filledCount) }}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function BudgetAnalysisCard({ analysis }: { analysis: NonNullable<DraftReview['budgetAnalysis']> }) {
  return (
    <div className="ffi-card">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign className="h-3.5 w-3.5" color="var(--ffi-blue)" />
        <span className="ffi-caption text-[var(--ffi-ink-3)]">BUDGET ANALYSIS</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <MiniStat label="SPENT" value={`$${analysis.totalSpent}`} />
        <MiniStat label="REMAINING" value={`$${analysis.remaining}`} />
        <MiniStat label="AVG PRICE" value={`$${analysis.avgPrice}`} />
        <MiniStat label="HIGHEST" value={`$${analysis.highestPick.price}`} sub={analysis.highestPick.name} />
      </div>
      {analysis.allocationVsPlan.length > 0 && (
        <div className="pt-3 border-t border-[var(--ffi-hairline)]">
          <p className="ffi-caption text-[var(--ffi-ink-3)] mb-3">BUDGET VS. PLAN</p>
          <div className="space-y-2">
            {analysis.allocationVsPlan.map(a => (
              <div key={a.position} className="flex items-center gap-3">
                <FFIPositionBadge position={a.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"} className="text-[10px] px-1.5 w-10" />
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--ffi-surface-3)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, a.actual)}%`,
                      background: 'linear-gradient(90deg, var(--ffi-blue) 0%, var(--ffi-volt) 100%)',
                    }}
                  />
                </div>
                <span className="font-mono text-xs text-[var(--ffi-ink-3)] w-20 text-right">
                  {a.actual}% / {a.planned}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function SnakeAnalysisCard({ analysis }: { analysis: NonNullable<DraftReview['snakeAnalysis']> }) {
  return (
    <div className="ffi-card">
      <div className="flex items-center gap-2 mb-3">
        <Hash className="h-3.5 w-3.5" color="var(--ffi-blue)" />
        <span className="ffi-caption text-[var(--ffi-ink-3)]">DRAFT ORDER ANALYSIS</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4">
        <MiniStat label="TOTAL PICKS" value={String(analysis.totalPicks)} />
        <MiniStat label="ROUNDS" value={String(analysis.totalRounds)} />
        <MiniStat label="FIRST PICK" value={`Rd ${analysis.earliestPick.round}`} sub={analysis.earliestPick.name} />
      </div>
      <div className="pt-3 border-t border-[var(--ffi-hairline)]">
        <p className="ffi-caption text-[var(--ffi-ink-3)] mb-2">ROUND BY ROUND</p>
        <div className="space-y-1">
          {analysis.positionByRound.map((p, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <span className="font-mono text-xs text-[var(--ffi-ink-3)] w-12">Rd {p.round}</span>
              <FFIPositionBadge position={p.position as "QB" | "RB" | "WR" | "TE" | "K" | "DEF"} className="text-[10px] px-1.5" />
              <span className="font-headline font-bold text-sm text-white truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'var(--ffi-surface-3)' }}>
      <p className="ffi-caption text-[var(--ffi-ink-3)] mb-1">{label}</p>
      <p className="font-mono font-bold text-sm text-white">{value}</p>
      {sub && <p className="text-[10px] text-[var(--ffi-ink-3)] truncate mt-0.5">{sub}</p>}
    </div>
  )
}

export function TagAccuracyCard({ analysis }: {
  analysis: {
    targetsHit: Array<{ name: string; id: string; drafted: boolean }>
    targetsMissed: Array<{ name: string; id: string; drafted: boolean }>
    avoidsSuccessful: Array<{ name: string; id: string; drafted: boolean }>
    avoidsViolated: Array<{ name: string; id: string; drafted: boolean }>
    totalTargets: number
    totalAvoids: number
    hitRate: number
    avoidRate: number
  }
}) {
  return (
    <div className="ffi-card">
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-3.5 w-3.5" color="var(--ffi-blue)" />
        <span className="ffi-caption text-[var(--ffi-ink-3)]">PRE-DRAFT TAG ACCURACY</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <MiniStat label="TARGETS SET" value={String(analysis.totalTargets)} />
        <MiniStat
          label="HIT RATE"
          value={`${analysis.hitRate}%`}
        />
        <MiniStat label="AVOIDS SET" value={String(analysis.totalAvoids)} />
        <MiniStat
          label="AVOID RATE"
          value={`${analysis.avoidRate}%`}
        />
      </div>

      {analysis.targetsHit.length > 0 && (
        <TagPillGroup label="TARGETS DRAFTED" color="var(--ffi-volt)" items={analysis.targetsHit} icon={<Check className="h-3 w-3" />} />
      )}
      {analysis.targetsMissed.length > 0 && (
        <TagPillGroup label="TARGETS MISSED" color="var(--ffi-warning)" items={analysis.targetsMissed} icon={<X className="h-3 w-3" />} />
      )}
      {analysis.avoidsSuccessful.length > 0 && (
        <TagPillGroup label="SUCCESSFULLY AVOIDED" color="var(--ffi-blue-bright)" items={analysis.avoidsSuccessful} icon={<ShieldCheck className="h-3 w-3" />} />
      )}
      {analysis.avoidsViolated.length > 0 && (
        <TagPillGroup label="AVOIDS VIOLATED" color="var(--ffi-danger)" items={analysis.avoidsViolated} icon={<ShieldAlert className="h-3 w-3" />} />
      )}
    </div>
  )
}

function TagPillGroup({ label, color, items, icon }: {
  label: string
  color: string
  items: Array<{ name: string; id: string }>
  icon: React.ReactNode
}) {
  return (
    <div className="mb-3 last:mb-0">
      <p className="ffi-caption mb-2 flex items-center gap-1.5" style={{ color }}>
        {icon}
        {label} ({items.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(p => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full ffi-caption"
            style={{
              background: `${color}18`,
              border: `1px solid ${color}30`,
              color,
              fontSize: 10,
            }}
          >
            {p.name}
          </span>
        ))}
      </div>
    </div>
  )
}
