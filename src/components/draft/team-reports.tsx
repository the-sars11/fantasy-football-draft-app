'use client'

/**
 * TeamReports (FF-075)
 *
 * Per-team exportable reports with contextual callouts.
 * Generates analysis for every team in the league.
 */

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download,
  Mail,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Trophy,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FFICard,
  FFIButton,
  FFIPositionBadge,
  FFIGrade,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import {
  generateLeagueReport,
  teamReportToText,
  teamReportToHTML,
  leagueReportToText,
  copyToClipboard,
  type LeagueReport,
  type TeamReport,
} from '@/lib/draft/export'
import type { DraftPick } from '@/lib/draft/state'

interface TeamReportsProps {
  picks: DraftPick[]
  managers: string[]
  format: 'auction' | 'snake'
  budget?: number
}

export function TeamReports({ picks, managers, format, budget }: TeamReportsProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)
  const [copiedTeam, setCopiedTeam] = useState<string | null>(null)

  // Generate the league report
  const leagueReport = useMemo(() => {
    return generateLeagueReport(picks, managers, format, budget)
  }, [picks, managers, format, budget])

  // Copy team report to clipboard
  const copyTeamReport = async (report: TeamReport) => {
    const text = teamReportToText(report, format)
    const ok = await copyToClipboard(text)
    if (ok) {
      setCopiedTeam(report.managerName)
      setTimeout(() => setCopiedTeam(null), 2000)
    }
  }

  // Download team report as HTML
  const downloadTeamHTML = (report: TeamReport) => {
    const html = teamReportToHTML(report, format)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${report.managerName.toLowerCase().replace(/\s+/g, '-')}-draft-report.html`
    link.click()
    URL.revokeObjectURL(url)
  }

  // Download full league report
  const downloadLeagueReport = () => {
    const text = leagueReportToText(leagueReport)
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `league-draft-report-${leagueReport.draftDate}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <FFISectionHeader
          title="Team Reports"
          subtitle={`Analysis for all ${leagueReport.teamCount} teams`}
        />
        <FFIButton variant="primary" size="sm" onClick={downloadLeagueReport}>
          <Download className="h-4 w-4 mr-1.5" />
          Full Report
        </FFIButton>
      </div>

      {/* League Highlights */}
      {leagueReport.leagueHighlights.length > 0 && (
        <FFICard>
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-[var(--ffi-accent)]" />
            <span className="ffi-label text-[var(--ffi-text-muted)]">LEAGUE HIGHLIGHTS</span>
          </div>
          <div className="space-y-2">
            {leagueReport.leagueHighlights.map((h, i) => (
              <p key={i} className="ffi-body-md text-[var(--ffi-text-secondary)]">
                ★ {h}
              </p>
            ))}
          </div>
        </FFICard>
      )}

      {/* Team Rankings Quick View */}
      <FFICard>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-4 w-4 text-[var(--ffi-primary)]" />
          <span className="ffi-label text-[var(--ffi-text-muted)]">TEAM RANKINGS</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {leagueReport.teamReports.map((tr, i) => (
            <motion.div
              key={tr.managerName}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                'flex items-center gap-3 p-3 min-h-[48px] rounded-lg cursor-pointer transition-colors',
                'bg-[var(--ffi-surface)]/40 hover:bg-[var(--ffi-surface)]/60 active:bg-[var(--ffi-surface)]/80',
                'ffi-no-select touch-manipulation',
                expandedTeam === tr.managerName && 'ring-1 ring-[var(--ffi-primary)]/50'
              )}
              onClick={() => setExpandedTeam(
                expandedTeam === tr.managerName ? null : tr.managerName
              )}
            >
              <span className="ffi-label text-[var(--ffi-text-muted)] w-5">{i + 1}.</span>
              <span className="ffi-body-md text-white truncate flex-1">{tr.managerName}</span>
              <FFIGrade grade={tr.grade} size="sm" />
            </motion.div>
          ))}
        </div>
      </FFICard>

      {/* Individual Team Reports */}
      <div className="space-y-3">
        {leagueReport.teamReports.map((report, index) => (
          <TeamReportCard
            key={report.managerName}
            report={report}
            format={format}
            index={index}
            expanded={expandedTeam === report.managerName}
            onToggle={() => setExpandedTeam(
              expandedTeam === report.managerName ? null : report.managerName
            )}
            onCopy={() => copyTeamReport(report)}
            onDownload={() => downloadTeamHTML(report)}
            copied={copiedTeam === report.managerName}
          />
        ))}
      </div>
    </div>
  )
}

interface TeamReportCardProps {
  report: TeamReport
  format: 'auction' | 'snake'
  index: number
  expanded: boolean
  onToggle: () => void
  onCopy: () => void
  onDownload: () => void
  copied: boolean
}

function TeamReportCard({
  report,
  format,
  index,
  expanded,
  onToggle,
  onCopy,
  onDownload,
  copied,
}: TeamReportCardProps) {
  const letter = report.grade.charAt(0)
  const gradeColor = letter === 'A' ? 'text-[var(--ffi-success)]'
    : letter === 'B' ? 'text-green-400'
    : letter === 'C' ? 'text-[var(--ffi-warning)]'
    : letter === 'D' ? 'text-orange-400'
    : 'text-[var(--ffi-danger)]'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <FFICard
        className={cn(
          'cursor-pointer transition-all',
          expanded && 'ring-1 ring-[var(--ffi-primary)]/30'
        )}
      >
        {/* Header row - min 48px tap target */}
        <div
          className="flex items-center gap-4 min-h-[48px] ffi-no-select touch-manipulation"
          onClick={onToggle}
        >
          <span className="ffi-label text-[var(--ffi-text-muted)] w-6">#{index + 1}</span>

          <div className="flex-1 min-w-0">
            <h3 className="ffi-title-md text-white">{report.managerName}</h3>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
              {report.positionBreakdown.slice(0, 4).map(pos => (
                <FFIPositionBadge
                  key={pos.position}
                  position={pos.position as any}
                  className="text-[9px] px-1"
                />
              ))}
              <span className="ffi-body-md text-[var(--ffi-text-muted)]">
                {report.picks.length} picks
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right">
              <span className={cn('ffi-display-md font-bold', gradeColor)}>
                {report.grade}
              </span>
              <p className="ffi-label text-[var(--ffi-text-muted)]">{report.score}/100</p>
            </div>
            {expanded ? (
              <ChevronUp className="h-5 w-5 text-[var(--ffi-text-muted)]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[var(--ffi-text-muted)]" />
            )}
          </div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-[var(--ffi-border)]/20 space-y-4">
                {/* Strengths & Weaknesses */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {report.strengths.length > 0 && (
                    <div>
                      <p className="ffi-label text-[var(--ffi-success)] mb-2">STRENGTHS</p>
                      <ul className="space-y-1">
                        {report.strengths.map((s, i) => (
                          <li key={i} className="ffi-body-md text-[var(--ffi-text-secondary)]">
                            ✓ {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {report.weaknesses.length > 0 && (
                    <div>
                      <p className="ffi-label text-[var(--ffi-warning)] mb-2">NEEDS WORK</p>
                      <ul className="space-y-1">
                        {report.weaknesses.map((w, i) => (
                          <li key={i} className="ffi-body-md text-[var(--ffi-text-secondary)]">
                            ✗ {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Position Breakdown */}
                <div>
                  <p className="ffi-label text-[var(--ffi-text-muted)] mb-2">ROSTER</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {report.positionBreakdown.map(pos => (
                      <div
                        key={pos.position}
                        className="flex items-start gap-2 p-2 rounded-lg bg-[var(--ffi-surface)]/30"
                      >
                        <FFIPositionBadge position={pos.position as any} className="mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="ffi-body-md text-white">
                              {pos.players.length} player{pos.players.length !== 1 ? 's' : ''}
                            </span>
                            <span className={cn(
                              'ffi-label font-bold',
                              pos.grade.startsWith('A') || pos.grade.startsWith('B')
                                ? 'text-[var(--ffi-success)]'
                                : 'text-[var(--ffi-warning)]'
                            )}>
                              {pos.grade}
                            </span>
                          </div>
                          {pos.players.map((p, i) => (
                            <p key={i} className="text-[11px] text-[var(--ffi-text-muted)] truncate">
                              {p.name}
                              {p.price != null && ` ($${p.price})`}
                              {p.round != null && ` (Rd ${p.round})`}
                            </p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Contextual Callouts */}
                {report.contextualCallouts.length > 0 && (
                  <div>
                    <p className="ffi-label text-[var(--ffi-primary)] mb-2">WHAT HAPPENED</p>
                    <div className="space-y-2">
                      {report.contextualCallouts.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2 rounded-lg bg-[var(--ffi-primary)]/10 border-l-2 border-[var(--ffi-primary)]"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 text-[var(--ffi-primary)] mt-0.5 shrink-0" />
                          <p className="ffi-body-md text-[var(--ffi-text-secondary)]">{c}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Export Actions - mobile-optimized touch targets */}
                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <FFIButton
                    variant="secondary"
                    size="touch"
                    className="flex-1 sm:flex-initial"
                    onClick={(e) => { e.stopPropagation(); onCopy(); }}
                  >
                    {copied ? (
                      <CheckCheck className="h-4 w-4 mr-1.5 text-[var(--ffi-success)]" />
                    ) : (
                      <Copy className="h-4 w-4 mr-1.5" />
                    )}
                    {copied ? 'Copied!' : 'Copy Report'}
                  </FFIButton>
                  <FFIButton
                    variant="secondary"
                    size="touch"
                    className="flex-1 sm:flex-initial"
                    onClick={(e) => { e.stopPropagation(); onDownload(); }}
                  >
                    <Mail className="h-4 w-4 mr-1.5" />
                    Download HTML
                  </FFIButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </FFICard>
    </motion.div>
  )
}
