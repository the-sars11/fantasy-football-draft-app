'use client'

/**
 * ReviewClient (FF-053, FF-074 Redesign)
 *
 * Premium post-draft review with FFI design system.
 * Features: Letter grade hero with glow, story-driven pick breakdown,
 * STEAL/REACH/AI PIVOT badges.
 */

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  AlertCircle,
  Trophy,
  Target,
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FFICard,
  FFIButton,
  FFIPositionBadge,
  FFIGrade,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import { FFIFadeInUp } from '@/components/ui/ffi-motion'
import { TeamReports } from '@/components/draft/team-reports'
import { RoastReportCard } from '@/components/draft/trash-talk'
import { analyzeDraft, type DraftReview, type PickAnalysis, type PickVerdict } from '@/lib/draft/review'
import { generateRoastReport } from '@/lib/draft/trash-talk'
import { picksToCSV, reviewToShareText, downloadCSV, copyToClipboard } from '@/lib/draft/export'
import type { DraftPick } from '@/lib/draft/state'
import type { DraftSession, League, Strategy, RosterSlots } from '@/lib/supabase/database.types'
import type { Player } from '@/lib/players/types'

type ViewMode = 'my-draft' | 'all-teams' | 'trash-talk'

// Verdict styling configuration
const verdictConfig: Record<PickVerdict, { label: string; class: string; icon: typeof Sparkles }> = {
  steal: {
    label: 'STEAL',
    class: 'bg-[var(--ffi-success)]/15 text-[var(--ffi-success)] border-[var(--ffi-success)]/30',
    icon: Sparkles,
  },
  reach: {
    label: 'REACH',
    class: 'bg-[var(--ffi-danger)]/15 text-[var(--ffi-danger)] border-[var(--ffi-danger)]/30',
    icon: AlertTriangle,
  },
  fair: {
    label: 'FAIR VALUE',
    class: 'bg-[var(--ffi-primary)]/15 text-[var(--ffi-primary)] border-[var(--ffi-primary)]/30',
    icon: Check,
  },
  ai_pivot: {
    label: 'AI PIVOT',
    class: 'bg-[var(--ffi-accent)]/15 text-[var(--ffi-accent)] border-[var(--ffi-accent)]/30',
    icon: Zap,
  },
}

// Grade glow colors
const gradeGlow: Record<string, string> = {
  A: 'shadow-[0_0_40px_rgba(57,255,20,0.4)]',
  B: 'shadow-[0_0_40px_rgba(34,197,94,0.3)]',
  C: 'shadow-[0_0_40px_rgba(251,191,36,0.3)]',
  D: 'shadow-[0_0_40px_rgba(249,115,22,0.3)]',
  F: 'shadow-[0_0_40px_rgba(239,68,68,0.4)]',
}

export function ReviewClient() {
  const [sessions, setSessions] = useState<DraftSession[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [session, setSession] = useState<DraftSession | null>(null)
  const [league, setLeague] = useState<League | null>(null)
  const [strategy, setStrategy] = useState<Strategy | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [managerName, setManagerName] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [expandedPick, setExpandedPick] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('my-draft')

  // Load sessions list
  useEffect(() => {
    async function fetchSessions() {
      try {
        const res = await fetch('/api/draft/sessions')
        if (!res.ok) throw new Error('Failed to load sessions')
        const data = await res.json()
        const completed = (data.sessions || []).filter(
          (s: DraftSession) => s.picks && s.picks.length > 0
        )
        setSessions(completed)
        if (completed.length > 0) {
          setSelectedId(completed[0].id)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sessions')
      } finally {
        setLoading(false)
      }
    }
    fetchSessions()
  }, [])

  // Load selected session details
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false

    async function loadSession() {
      setDetailLoading(true)
      try {
        const res = await fetch(`/api/draft/sessions/${selectedId}`)
        if (!res.ok) throw new Error('Failed to load session')
        const data = await res.json()

        if (cancelled) return
        setSession(data.session)
        setLeague(data.league)

        if (data.session?.managers?.length > 0) {
          setManagerName(data.session.managers[0].name)
        }

        if (data.league?.id) {
          const stratRes = await fetch(`/api/strategies?leagueId=${data.league.id}`)
          if (stratRes.ok && !cancelled) {
            const stratData = await stratRes.json()
            const active = (stratData.strategies ?? []).find((s: Strategy) => s.is_active) ?? null
            setStrategy(active)
          }
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load session')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    loadSession()
    return () => { cancelled = true }
  }, [selectedId])

  // Build roast report
  const roastReport = useMemo(() => {
    if (!session) return null

    const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
      pick_number: p.pick_number,
      player_name: p.player_id,
      position: undefined,
      manager: p.manager,
      price: p.price,
      round: p.round,
    }))

    return generateRoastReport(
      draftPicks,
      [], // Players not loaded in this view - roster imbalance checks still work
      session.managers.map(m => m.name),
      session.format,
      session.managers.length,
    )
  }, [session])

  // Build review
  const review = useMemo<DraftReview | null>(() => {
    if (!session || !managerName) return null

    const rosterSlots: RosterSlots = league?.roster_slots || {
      qb: 1, rb: 2, wr: 2, te: 1, flex: 1, k: 1, dst: 1, bench: 6, ir: 0,
    }

    const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
      pick_number: p.pick_number,
      player_name: p.player_id,
      position: undefined,
      manager: p.manager,
      price: p.price,
      round: p.round,
    }))

    return analyzeDraft(
      draftPicks,
      managerName,
      strategy,
      rosterSlots,
      session.format,
      league?.budget ?? undefined,
    )
  }, [session, managerName, strategy, league])

  // --- Render ---

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-[var(--ffi-text-secondary)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--ffi-primary)]" />
          <span className="ffi-body-md">Loading draft sessions...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <FFICard className="border-l-4 border-l-[var(--ffi-danger)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[var(--ffi-danger)] shrink-0 mt-0.5" />
          <div>
            <p className="ffi-title-md text-white">Error Loading Draft</p>
            <p className="ffi-body-md text-[var(--ffi-text-secondary)] mt-1">{error}</p>
          </div>
        </div>
      </FFICard>
    )
  }

  if (sessions.length === 0) {
    return (
      <FFICard className="text-center py-12">
        <Trophy className="h-12 w-12 text-[var(--ffi-text-muted)] mx-auto mb-4" />
        <h3 className="ffi-title-lg text-white mb-2">No Drafts to Review</h3>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)] max-w-md mx-auto">
          Complete a live draft first, then come back here to see your grades and analysis.
        </p>
      </FFICard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Selector + View Toggle */}
      <FFICard>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="ffi-label text-[var(--ffi-text-muted)] mb-1.5 block">
              SELECT DRAFT
            </label>
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="ffi-input w-full"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.format === 'auction' ? 'Auction' : 'Snake'} — {s.picks.length} picks — {new Date(s.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          {session && session.managers.length > 0 && viewMode === 'my-draft' && (
            <div className="flex-1 min-w-[180px]">
              <label className="ffi-label text-[var(--ffi-text-muted)] mb-1.5 block">
                SELECT MANAGER
              </label>
              <select
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="ffi-input w-full"
              >
                {session.managers.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* View Mode Toggle */}
        {session && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-[var(--ffi-border)]/20">
            <button
              onClick={() => setViewMode('my-draft')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all',
                viewMode === 'my-draft'
                  ? 'bg-[var(--ffi-primary)] text-white'
                  : 'bg-[var(--ffi-surface)]/50 text-[var(--ffi-text-secondary)] hover:bg-[var(--ffi-surface)]'
              )}
            >
              My Draft
            </button>
            <button
              onClick={() => setViewMode('all-teams')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all',
                viewMode === 'all-teams'
                  ? 'bg-[var(--ffi-primary)] text-white'
                  : 'bg-[var(--ffi-surface)]/50 text-[var(--ffi-text-secondary)] hover:bg-[var(--ffi-surface)]'
              )}
            >
              All Teams
            </button>
            <button
              onClick={() => setViewMode('trash-talk')}
              className={cn(
                'flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all',
                viewMode === 'trash-talk'
                  ? 'bg-[var(--ffi-danger)] text-white'
                  : 'bg-[var(--ffi-surface)]/50 text-[var(--ffi-text-secondary)] hover:bg-[var(--ffi-surface)]'
              )}
            >
              🔥 Trash Talk
            </button>
          </div>
        )}
      </FFICard>

      {detailLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--ffi-primary)]" />
          <span className="ffi-body-md text-[var(--ffi-text-secondary)] ml-3">
            Analyzing draft...
          </span>
        </div>
      )}

      {/* All Teams View */}
      {session && !detailLoading && viewMode === 'all-teams' && (
        <TeamReports
          picks={(session.picks || []).map(p => ({
            pick_number: p.pick_number,
            player_name: p.player_id,
            position: undefined,
            manager: p.manager,
            price: p.price,
            round: p.round,
          }))}
          managers={session.managers.map(m => m.name)}
          format={session.format}
          budget={league?.budget ?? undefined}
        />
      )}

      {/* Trash Talk View */}
      {session && !detailLoading && viewMode === 'trash-talk' && roastReport && (
        <FFIFadeInUp>
          <RoastReportCard report={roastReport} />
        </FFIFadeInUp>
      )}

      {/* My Draft View */}
      {review && !detailLoading && viewMode === 'my-draft' && (
        <FFIFadeInUp>
          <div className="space-y-6">
            {/* Grade Hero Card */}
            <GradeHero
              review={review}
              managerName={managerName}
              strategyName={strategy?.name}
              onExportCSV={() => {
                if (!session) return
                const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
                  pick_number: p.pick_number,
                  player_name: p.player_id,
                  manager: p.manager,
                  price: p.price,
                  round: p.round,
                }))
                const csv = picksToCSV(draftPicks, session.format)
                const date = new Date(session.created_at).toISOString().split('T')[0]
                downloadCSV(csv, `draft-${date}.csv`)
              }}
              onShare={async () => {
                const text = reviewToShareText(review, managerName, session!.format, strategy?.name)
                const ok = await copyToClipboard(text)
                if (ok) {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }
              }}
              copied={copied}
            />

            {/* Quick Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="STEALS"
                value={review.stealCount}
                icon={<Sparkles className="h-4 w-4 text-[var(--ffi-success)]" />}
                highlight={review.stealCount > 0 ? 'success' : undefined}
              />
              <StatCard
                label="REACHES"
                value={review.reachCount}
                icon={<AlertTriangle className="h-4 w-4 text-[var(--ffi-danger)]" />}
                highlight={review.reachCount > 0 ? 'danger' : undefined}
              />
              <StatCard
                label="TARGETS HIT"
                value={review.targetResults.filter(t => t.status === 'hit').length}
                icon={<Target className="h-4 w-4 text-[var(--ffi-primary)]" />}
              />
              <StatCard
                label="TOTAL PICKS"
                value={review.pickAnalysis.length}
                icon={<Hash className="h-4 w-4 text-[var(--ffi-text-muted)]" />}
              />
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid gap-4 sm:grid-cols-2">
              <FFICard>
                <FFISectionHeader
                  title="Strengths"
                  action={<TrendingUp className="h-4 w-4 text-[var(--ffi-success)]" />}
                />
                {review.strengths.length === 0 ? (
                  <p className="ffi-body-md text-[var(--ffi-text-muted)]">No standout strengths</p>
                ) : (
                  <ul className="space-y-2">
                    {review.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 ffi-body-md text-white">
                        <Check className="h-4 w-4 text-[var(--ffi-success)] shrink-0 mt-0.5" />
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
              </FFICard>

              <FFICard>
                <FFISectionHeader
                  title="Areas to Improve"
                  action={<TrendingDown className="h-4 w-4 text-[var(--ffi-warning)]" />}
                />
                {review.weaknesses.length === 0 ? (
                  <p className="ffi-body-md text-[var(--ffi-text-muted)]">No major weaknesses</p>
                ) : (
                  <ul className="space-y-2">
                    {review.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 ffi-body-md text-white">
                        <AlertCircle className="h-4 w-4 text-[var(--ffi-warning)] shrink-0 mt-0.5" />
                        {w}
                      </li>
                    ))}
                  </ul>
                )}
              </FFICard>
            </div>

            {/* Pick-by-Pick Story */}
            <FFICard>
              <FFISectionHeader
                title="Pick-by-Pick Breakdown"
                subtitle="Your draft story, one pick at a time"
              />
              <div className="space-y-2">
                {review.pickAnalysis.map((pick, index) => (
                  <PickCard
                    key={pick.pickNumber}
                    pick={pick}
                    format={session!.format}
                    index={index}
                    expanded={expandedPick === pick.pickNumber}
                    onToggle={() => setExpandedPick(
                      expandedPick === pick.pickNumber ? null : pick.pickNumber
                    )}
                  />
                ))}
              </div>
            </FFICard>

            {/* Positional Power Rankings (FF-074 segmented bars) */}
            {review.positionGrades.length > 0 && (
              <PositionalPowerRankings grades={review.positionGrades} />
            )}

            {/* Position Grades (detailed breakdown) */}
            <FFICard>
              <FFISectionHeader title="Position Grades" subtitle="Detailed breakdown by position" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {review.positionGrades.map(pg => (
                  <PositionGradeCard key={pg.position} grade={pg} />
                ))}
              </div>
            </FFICard>

            {/* Strategy Targets */}
            {review.targetResults.length > 0 && (
              <FFICard>
                <FFISectionHeader
                  title="Strategy Target Report"
                  action={<Target className="h-4 w-4 text-[var(--ffi-primary)]" />}
                />
                <div className="space-y-1">
                  {review.targetResults.map((tr, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[var(--ffi-surface)]/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {tr.status === 'hit' && <Check className="h-4 w-4 text-[var(--ffi-success)]" />}
                        {tr.status === 'missed' && <X className="h-4 w-4 text-[var(--ffi-danger)]" />}
                        {tr.status === 'avoided_success' && <ShieldCheck className="h-4 w-4 text-[var(--ffi-success)]" />}
                        {tr.status === 'avoided_fail' && <ShieldAlert className="h-4 w-4 text-[var(--ffi-danger)]" />}
                        <span className="ffi-body-md text-white font-medium">{tr.playerName}</span>
                      </div>
                      <span className="ffi-body-md text-[var(--ffi-text-secondary)]">{tr.detail}</span>
                    </div>
                  ))}
                </div>
              </FFICard>
            )}

            {/* Budget Analysis */}
            {review.budgetAnalysis && (
              <BudgetAnalysisCard analysis={review.budgetAnalysis} />
            )}

            {/* Snake Analysis */}
            {review.snakeAnalysis && (
              <SnakeAnalysisCard analysis={review.snakeAnalysis} />
            )}
          </div>
        </FFIFadeInUp>
      )}
    </div>
  )
}

// --- Sub-components ---

function GradeHero({
  review,
  managerName,
  strategyName,
  onExportCSV,
  onShare,
  copied,
}: {
  review: DraftReview
  managerName: string
  strategyName?: string
  onExportCSV: () => void
  onShare: () => void
  copied: boolean
}) {
  const letter = review.overallGrade.charAt(0)
  const glowClass = gradeGlow[letter] || ''

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="ffi-card-elevated"
    >
      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Grade Circle with Glow */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.2 }}
          className={cn(
            'w-28 h-28 rounded-2xl ffi-glass flex items-center justify-center shrink-0',
            glowClass
          )}
        >
          <FFIGrade grade={review.overallGrade} size="lg" />
        </motion.div>

        {/* Summary */}
        <div className="flex-1 text-center sm:text-left">
          <h2 className="ffi-display-md text-white mb-1">{review.summary}</h2>
          <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
            Score: <span className="text-[var(--ffi-accent)] font-mono font-bold">{review.overallScore}</span>/100
            {' · '}{managerName}&apos;s draft
            {strategyName && <> vs. &ldquo;{strategyName}&rdquo;</>}
          </p>
          {review.pivotImpact && (
            <p className="ffi-body-md text-[var(--ffi-text-muted)] mt-2 flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-[var(--ffi-accent)]" />
              {review.pivotImpact}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <FFIButton variant="secondary" size="sm" onClick={onExportCSV}>
            <Download className="h-4 w-4 mr-1.5" />
            CSV
          </FFIButton>
          <FFIButton variant="secondary" size="sm" onClick={onShare}>
            {copied
              ? <CheckCheck className="h-4 w-4 mr-1.5 text-[var(--ffi-success)]" />
              : <Copy className="h-4 w-4 mr-1.5" />
            }
            {copied ? 'Copied!' : 'Share'}
          </FFIButton>
        </div>
      </div>
    </motion.div>
  )
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string
  value: number
  icon: React.ReactNode
  highlight?: 'success' | 'danger'
}) {
  return (
    <FFICard className={cn(
      highlight === 'success' && 'border border-[var(--ffi-success)]/20',
      highlight === 'danger' && 'border border-[var(--ffi-danger)]/20',
    )}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="ffi-label text-[var(--ffi-text-muted)]">{label}</span>
      </div>
      <span className={cn(
        'ffi-display-md font-mono font-bold',
        highlight === 'success' && 'text-[var(--ffi-success)]',
        highlight === 'danger' && 'text-[var(--ffi-danger)]',
        !highlight && 'text-white',
      )}>
        {value}
      </span>
    </FFICard>
  )
}

function PickCard({
  pick,
  format,
  index,
  expanded,
  onToggle,
}: {
  pick: PickAnalysis
  format: 'auction' | 'snake'
  index: number
  expanded: boolean
  onToggle: () => void
}) {
  const config = verdictConfig[pick.verdict]
  const VerdictIcon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn(
        'ffi-card-interactive',
        expanded && 'ffi-card-elevated'
      )}
      onClick={onToggle}
    >
      {/* Main row */}
      <div className="flex items-center gap-4">
        {/* Pick number */}
        <div className="text-center w-12 shrink-0">
          {format === 'snake' && pick.round ? (
            <>
              <div className="ffi-label text-[var(--ffi-text-muted)]">RD {pick.round}</div>
              <div className="ffi-body-md text-[var(--ffi-text-secondary)] font-mono">#{pick.pickNumber}</div>
            </>
          ) : (
            <>
              <div className="ffi-label text-[var(--ffi-text-muted)]">PICK</div>
              <div className="ffi-body-md text-[var(--ffi-text-secondary)] font-mono">#{pick.pickNumber}</div>
            </>
          )}
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="ffi-title-md text-white truncate">{pick.playerName}</span>
            <FFIPositionBadge position={pick.position as any} className="text-[10px] px-1.5" />
          </div>
          {format === 'auction' && pick.price != null && (
            <div className="ffi-body-md text-[var(--ffi-text-secondary)]">
              ${pick.price}
              {pick.adpValue != null && (
                <span className={cn(
                  'ml-2 font-mono',
                  pick.adpValue > 0 ? 'text-[var(--ffi-success)]' : 'text-[var(--ffi-danger)]'
                )}>
                  {pick.adpValue > 0 ? '+' : ''}{pick.adpValue} value
                </span>
              )}
            </div>
          )}
        </div>

        {/* Verdict badge */}
        <div className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider shrink-0',
          config.class
        )}>
          <VerdictIcon className="h-3 w-3" />
          {config.label}
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
            <div className="mt-3 pt-3 border-t border-[var(--ffi-border)]/20">
              <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
                {pick.narrative}
              </p>
              {!pick.strategyAlignment && (
                <p className="ffi-body-md text-[var(--ffi-warning)] mt-2 flex items-center gap-1.5">
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

/**
 * PositionalPowerRankings (FF-074)
 * Segmented progress bars like the prototype (lines 174-205)
 */
function PositionalPowerRankings({ grades }: { grades: DraftReview['positionGrades'] }) {
  const SEGMENTS = 10

  // Position name mapping for display
  const positionNames: Record<string, string> = {
    QB: 'Quarterback',
    RB: 'Running Back',
    WR: 'Wide Receiver',
    TE: 'Tight End',
    K: 'Kicker',
    DEF: 'Defense',
  }

  return (
    <FFICard>
      <FFISectionHeader title="Positional Power Rankings" />
      <div className="space-y-6">
        {grades.map(grade => {
          const filledCount = Math.round(grade.score / 10)
          const isDanger = grade.score < 50

          return (
            <div key={grade.position} className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="ffi-label text-white uppercase tracking-wider">
                  {positionNames[grade.position] || grade.position}
                </span>
                <span
                  className={cn(
                    'font-headline text-lg font-bold',
                    isDanger ? 'text-[var(--ffi-danger)]' : 'text-[var(--ffi-primary)]'
                  )}
                >
                  {grade.score}
                </span>
              </div>
              <div className="segmented-progress">
                {Array.from({ length: SEGMENTS }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'segment',
                      i < filledCount
                        ? isDanger ? 'segment-filled danger' : 'segment-filled'
                        : 'segment-empty'
                    )}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </FFICard>
  )
}

function PositionGradeCard({ grade }: { grade: DraftReview['positionGrades'][0] }) {
  const letter = grade.grade.charAt(0)
  const gradeColor = letter === 'A' ? 'text-[var(--ffi-success)]'
    : letter === 'B' ? 'text-green-400'
    : letter === 'C' ? 'text-[var(--ffi-warning)]'
    : letter === 'D' ? 'text-orange-400'
    : 'text-[var(--ffi-danger)]'

  return (
    <FFICard>
      <div className="flex items-center justify-between mb-2">
        <FFIPositionBadge position={grade.position as any} />
        <span className={cn('ffi-display-md font-bold', gradeColor)}>
          {grade.grade}
        </span>
      </div>
      <div className="space-y-1">
        {grade.picks.map((p, i) => (
          <div key={i} className="flex items-center justify-between text-[12px]">
            <span className="text-[var(--ffi-text-secondary)] truncate">{p.name}</span>
            <span className="text-[var(--ffi-text-muted)] font-mono shrink-0 ml-2">
              {p.price != null ? `$${p.price}` : p.round != null ? `Rd ${p.round}` : ''}
            </span>
          </div>
        ))}
      </div>
      {grade.notes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--ffi-border)]/10 space-y-0.5">
          {grade.notes.map((n, i) => (
            <p key={i} className="text-[10px] text-[var(--ffi-text-muted)]">{n}</p>
          ))}
        </div>
      )}
    </FFICard>
  )
}

function BudgetAnalysisCard({ analysis }: { analysis: NonNullable<DraftReview['budgetAnalysis']> }) {
  return (
    <FFICard>
      <FFISectionHeader
        title="Budget Analysis"
        action={<DollarSign className="h-4 w-4 text-[var(--ffi-accent)]" />}
      />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <MiniStat label="SPENT" value={`$${analysis.totalSpent}`} />
        <MiniStat label="REMAINING" value={`$${analysis.remaining}`} />
        <MiniStat label="AVG PRICE" value={`$${analysis.avgPrice}`} />
        <MiniStat label="HIGHEST" value={`$${analysis.highestPick.price}`} sub={analysis.highestPick.name} />
      </div>

      {analysis.allocationVsPlan.length > 0 && (
        <div className="pt-3 border-t border-[var(--ffi-border)]/10">
          <p className="ffi-label text-[var(--ffi-text-muted)] mb-2">BUDGET VS. PLAN</p>
          <div className="space-y-2">
            {analysis.allocationVsPlan.map(a => (
              <div key={a.position} className="flex items-center gap-3">
                <FFIPositionBadge position={a.position as any} className="w-10 text-[10px] px-1" />
                <div className="flex-1 h-2 bg-[var(--ffi-surface)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--ffi-primary)] to-[var(--ffi-accent)]"
                    style={{ width: `${Math.min(100, a.actual)}%` }}
                  />
                </div>
                <span className="ffi-body-md text-[var(--ffi-text-secondary)] font-mono w-20 text-right">
                  {a.actual}% / {a.planned}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </FFICard>
  )
}

function SnakeAnalysisCard({ analysis }: { analysis: NonNullable<DraftReview['snakeAnalysis']> }) {
  return (
    <FFICard>
      <FFISectionHeader
        title="Draft Order Analysis"
        action={<Hash className="h-4 w-4 text-[var(--ffi-primary)]" />}
      />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <MiniStat label="TOTAL PICKS" value={String(analysis.totalPicks)} />
        <MiniStat label="ROUNDS" value={String(analysis.totalRounds)} />
        <MiniStat label="FIRST PICK" value={`Rd ${analysis.earliestPick.round}`} sub={analysis.earliestPick.name} />
      </div>

      <div className="pt-3 border-t border-[var(--ffi-border)]/10">
        <p className="ffi-label text-[var(--ffi-text-muted)] mb-2">ROUND BY ROUND</p>
        <div className="space-y-1">
          {analysis.positionByRound.map((p, i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <span className="ffi-body-md text-[var(--ffi-text-muted)] font-mono w-12">Rd {p.round}</span>
              <FFIPositionBadge position={p.position as any} className="text-[10px] px-1.5" />
              <span className="ffi-body-md text-white truncate">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </FFICard>
  )
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-[var(--ffi-surface)]/40 p-2.5">
      <p className="ffi-label text-[var(--ffi-text-muted)]">{label}</p>
      <p className="ffi-title-md text-white font-mono">{value}</p>
      {sub && <p className="text-[10px] text-[var(--ffi-text-muted)] truncate">{sub}</p>}
    </div>
  )
}
