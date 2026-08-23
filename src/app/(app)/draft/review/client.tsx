'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  Trophy,
  Flame,
  Target,
  Check,
  X,
  ShieldCheck,
  ShieldAlert,
  Hash,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react'
import { FFIFadeInUp } from '@/components/ui/ffi-motion'
import { TeamReports } from '@/components/draft/team-reports'
import { RoastReportCard } from '@/components/draft/trash-talk'
import {
  GradeHero,
  StatTile,
  SwCard,
  SectHeader,
  PickCard,
  PositionalPowerRankings,
  BudgetAnalysisCard,
  TagAccuracyCard,
} from '@/components/draft/review-cards'
import { useDraftReviewData } from '@/hooks/use-draft-review-data'
import { picksToCSV, reviewToShareText, downloadCSV, copyToClipboard } from '@/lib/draft/export'
import type { DraftPick } from '@/lib/draft/state'

type ViewMode = 'my-draft' | 'all-teams' | 'trash-talk'

export function ReviewClient() {
  const {
    paramSessionId,
    sessions,
    selectedId,
    setSelectedId,
    session,
    league,
    strategy,
    loading,
    detailLoading,
    error,
    managerName,
    setManagerName,
    tagAccuracyAnalysis,
    roastReport,
    review,
  } = useDraftReviewData()

  const [copied, setCopied] = useState(false)
  const [expandedPick, setExpandedPick] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('my-draft')

  // --- Render ---

  const sessionDateLabel = session
    ? new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div className="pb-2">
      {/* ── Screen header (blueprint 9.7) ─────────────────────── */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="ffi-title-red font-extrabold text-[26px] leading-none">
          Post Draft
        </h1>
        {sessionDateLabel && (
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            style={{
              fontFamily: 'var(--font-cond)',
              background: 'rgba(166,60,65,0.10)',
              border: '1px solid rgba(166,60,65,0.18)',
              color: 'var(--ffi-volt)',
              letterSpacing: '0.14em',
            }}
          >
            <Trophy className="w-3 h-3" />
            {sessionDateLabel}
          </span>
        )}
      </div>

      {/* Back to Draft — secondary link */}
      <Link
        href="/draft"
        className="inline-flex items-center gap-1 ffi-caption mb-4 transition-colors"
        style={{ color: 'var(--ffi-ink-3)' }}
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        Back to Draft
      </Link>

      {/* ── Loading ───────────────────────────────────────────── */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--ffi-blue)]" />
          <span className="ffi-label text-[var(--ffi-ink-3)] ml-3">Loading sessions...</span>
        </div>
      )}

      {/* ── Error ─────────────────────────────────────────────── */}
      {!loading && error && (
        <div className="ffi-card border-l-4" style={{ borderLeftColor: 'var(--ffi-danger)' }}>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" color="var(--ffi-danger)" />
            <div>
              <p className="font-headline font-bold text-white">Error Loading Draft</p>
              <p className="ffi-body-md text-[var(--ffi-ink-3)] mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────── */}
      {!loading && !error && sessions.length === 0 && (
        <div className="ffi-card text-center py-12">
          <Trophy className="h-10 w-10 mx-auto mb-4" color="var(--ffi-ink-3)" />
          <p className="font-headline font-bold text-lg text-white mb-2">No completed draft yet</p>
          <p className="ffi-body-md text-[var(--ffi-ink-3)] max-w-xs mx-auto">
            Your grade shows up here after draft night.
          </p>
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────── */}
      {!loading && !error && sessions.length > 0 && (
      <div className="space-y-3">
      {/* Session + Manager selectors — hidden when session was pre-selected via URL */}
      {!paramSessionId && (
      <div className="ffi-card p-3">
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[180px]">
            <p className="ffi-caption text-[var(--ffi-ink-3)] mb-1.5">SELECT DRAFT</p>
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="ffi-input w-full text-sm"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.format === 'auction' ? 'Auction' : 'Snake'} &middot; {s.picks.length} picks &middot; {new Date(s.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          {session && session.managers.length > 0 && viewMode === 'my-draft' && (
            <div className="flex-1 min-w-[140px]">
              <p className="ffi-caption text-[var(--ffi-ink-3)] mb-1.5">SELECT MANAGER</p>
              <select
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                className="ffi-input w-full text-sm"
              >
                {session.managers.map(m => (
                  <option key={m.name} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* View Tabs */}
        {session && (
          <div
            className="flex gap-1 mt-3 rounded-xl p-1"
            style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}
          >
            {(['my-draft', 'all-teams', 'trash-talk'] as ViewMode[]).map((mode) => {
              const isActive = viewMode === mode
              const label = mode === 'my-draft' ? 'My Draft' : mode === 'all-teams' ? 'All Teams' : 'Trash Talk'
              const activeStyle = mode === 'trash-talk'
                ? { background: 'var(--ffi-danger)', boxShadow: '0 4px 14px -4px rgba(255,110,138,0.4)' }
                : { background: 'var(--ffi-blue)', boxShadow: '0 4px 14px -4px rgba(95,168,224,0.5)' }
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className="flex-1 min-h-[40px] flex items-center justify-center gap-1.5 rounded-lg transition-all"
                  style={isActive ? activeStyle : {}}
                >
                  {mode === 'trash-talk' && (
                    <Flame className="h-3.5 w-3.5" color={isActive ? '#fff' : 'var(--ffi-ink-3)'} />
                  )}
                  <span
                    className="ffi-label"
                    style={{ color: isActive ? '#fff' : 'var(--ffi-ink-3)', letterSpacing: '.12em' }}
                  >
                    {label}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
      )}

      {detailLoading && (
        <div className="flex items-center justify-center py-8 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" color="var(--ffi-blue)" />
          <span className="ffi-label text-[var(--ffi-ink-3)]">Analyzing draft...</span>
        </div>
      )}

      {/* All Teams */}
      {session && !detailLoading && viewMode === 'all-teams' && (
        <TeamReports
          picks={(session.picks || []).map(p => ({
            pick_number: p.pick_number, player_name: p.player_id, position: undefined,
            manager: p.manager, price: p.price, round: p.round,
          }))}
          managers={session.managers.map(m => m.name)}
          format={session.format}
          budget={league?.budget ?? undefined}
        />
      )}

      {/* Trash Talk */}
      {session && !detailLoading && viewMode === 'trash-talk' && roastReport && (
        <FFIFadeInUp>
          <RoastReportCard report={roastReport} />
        </FFIFadeInUp>
      )}

      {/* My Draft */}
      {review && !detailLoading && viewMode === 'my-draft' && (
        <FFIFadeInUp>
          <div className="space-y-3">
            <GradeHero
              review={review}
              managerName={managerName}
              strategyName={strategy?.name}
              onExportCSV={() => {
                if (!session) return
                const draftPicks: DraftPick[] = (session.picks || []).map(p => ({
                  pick_number: p.pick_number, player_name: p.player_id,
                  manager: p.manager, price: p.price, round: p.round,
                }))
                const csv = picksToCSV(draftPicks, session.format)
                const date = new Date(session.created_at).toISOString().split('T')[0]
                downloadCSV(csv, `draft-${date}.csv`)
              }}
              onShare={async () => {
                const text = reviewToShareText(review, managerName, session!.format, strategy?.name)
                const ok = await copyToClipboard(text)
                if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
              }}
              copied={copied}
            />

            {/* Quick Stats 2x2 */}
            <div className="grid grid-cols-2 gap-2">
              <StatTile
                label="STEALS"
                value={review.stealCount}
                icon={<Sparkles className="h-3.5 w-3.5" color="var(--ffi-volt)" />}
                valueColor={review.stealCount > 0 ? 'var(--ffi-volt)' : 'var(--ffi-ink-2)'}
                accentBorder={review.stealCount > 0 ? 'rgba(166,60,65,0.22)' : undefined}
              />
              <StatTile
                label="REACHES"
                value={review.reachCount}
                icon={<AlertTriangle className="h-3.5 w-3.5" color="var(--ffi-danger)" />}
                valueColor={review.reachCount > 0 ? 'var(--ffi-danger)' : 'var(--ffi-ink-2)'}
                accentBorder={review.reachCount > 0 ? 'rgba(255,110,138,0.22)' : undefined}
              />
              <StatTile
                label="TARGETS HIT"
                value={review.targetResults.filter(t => t.status === 'hit').length}
                icon={<Target className="h-3.5 w-3.5" color="var(--ffi-blue)" />}
                valueColor="var(--ffi-blue-bright)"
              />
              <StatTile
                label="TOTAL PICKS"
                value={review.pickAnalysis.length}
                icon={<Hash className="h-3.5 w-3.5" color="var(--ffi-ink-3)" />}
                valueColor="var(--ffi-ink-2)"
              />
            </div>

            {/* Strengths & Weaknesses */}
            <div className="grid grid-cols-2 gap-2">
              <SwCard
                title="Strengths"
                type="wins"
                items={review.strengths}
                emptyText="No standout strengths"
              />
              <SwCard
                title="Watch"
                type="risks"
                items={review.weaknesses}
                emptyText="No major weaknesses"
              />
            </div>

            {/* Pick-by-Pick */}
            <div>
              <SectHeader title="Pick by Pick" />
              <div className="space-y-1">
                {review.pickAnalysis.map((pick, index) => (
                  <PickCard
                    key={pick.pickNumber}
                    pick={pick}
                    format={session!.format}
                    index={index}
                    expanded={expandedPick === pick.pickNumber}
                    onToggle={() => setExpandedPick(expandedPick === pick.pickNumber ? null : pick.pickNumber)}
                  />
                ))}
              </div>
            </div>

            {/* Positional Power Rankings */}
            {review.positionGrades.length > 0 && (
              <div>
                <SectHeader title="Position Grades" />
                <PositionalPowerRankings grades={review.positionGrades} />
              </div>
            )}

            {/* Tag Accuracy */}
            {tagAccuracyAnalysis && (tagAccuracyAnalysis.totalTargets > 0 || tagAccuracyAnalysis.totalAvoids > 0) && (
              <TagAccuracyCard analysis={tagAccuracyAnalysis} />
            )}

            {/* Strategy Targets */}
            {review.targetResults.length > 0 && (
              <div className="ffi-card">
                <div className="flex items-center gap-2 mb-3">
                  <span className="ffi-caption text-[var(--ffi-ink-3)]">STRATEGY TARGETS</span>
                  <Target className="h-3.5 w-3.5" color="var(--ffi-blue)" />
                </div>
                <div className="space-y-0.5">
                  {review.targetResults.map((tr, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--ffi-surface-3)] transition-colors">
                      <div className="flex items-center gap-2.5">
                        {tr.status === 'hit' && <Check className="h-4 w-4" color="var(--ffi-volt)" />}
                        {tr.status === 'missed' && <X className="h-4 w-4" color="var(--ffi-danger)" />}
                        {tr.status === 'avoided_success' && <ShieldCheck className="h-4 w-4" color="var(--ffi-volt)" />}
                        {tr.status === 'avoided_fail' && <ShieldAlert className="h-4 w-4" color="var(--ffi-danger)" />}
                        <span className="font-headline font-bold text-sm text-white">{tr.playerName}</span>
                      </div>
                      <span className="ffi-body-md text-[var(--ffi-ink-3)]">{tr.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Budget Analysis */}
            {review.budgetAnalysis && <BudgetAnalysisCard analysis={review.budgetAnalysis} />}
          </div>
        </FFIFadeInUp>
      )}
    </div>
    )}
  </div>
  )
}
