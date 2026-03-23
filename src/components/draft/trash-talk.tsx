'use client'

/**
 * Trash Talk Components (FF-076)
 *
 * Live alerts during draft + post-draft roast report.
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Bookmark, Flame, AlertTriangle, Skull, Target, Meh } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FFICard,
  FFIButton,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import type {
  TrashTalkAlert,
  TrashTalkType,
  RoastReport,
  RoastReportEntry,
} from '@/lib/draft/trash-talk'

// Icon and color config for trash talk types
const trashTalkConfig: Record<TrashTalkType, {
  icon: typeof Flame
  emoji: string
  bgClass: string
  borderClass: string
  textClass: string
}> = {
  overpay: {
    icon: Flame,
    emoji: '🔥',
    bgClass: 'bg-[var(--ffi-danger)]/10',
    borderClass: 'border-l-[var(--ffi-danger)]',
    textClass: 'text-[var(--ffi-danger)]',
  },
  imbalance: {
    icon: AlertTriangle,
    emoji: '⚠️',
    bgClass: 'bg-[var(--ffi-warning)]/10',
    borderClass: 'border-l-[var(--ffi-warning)]',
    textClass: 'text-[var(--ffi-warning)]',
  },
  bye_disaster: {
    icon: Skull,
    emoji: '💀',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-l-purple-500',
    textClass: 'text-purple-400',
  },
  reach: {
    icon: Meh,
    emoji: '😬',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-l-orange-500',
    textClass: 'text-orange-400',
  },
  steal: {
    icon: Target,
    emoji: '🎯',
    bgClass: 'bg-[var(--ffi-success)]/10',
    borderClass: 'border-l-[var(--ffi-success)]',
    textClass: 'text-[var(--ffi-success)]',
  },
}

// --- Live Trash Talk Alert ---

interface LiveTrashTalkAlertProps {
  alert: TrashTalkAlert
  onDismiss: () => void
  onSave: () => void
}

export function LiveTrashTalkAlert({ alert, onDismiss, onSave }: LiveTrashTalkAlertProps) {
  const config = trashTalkConfig[alert.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'ffi-card-elevated border-l-4 overflow-hidden',
        config.borderClass,
        alert.severity === 'savage' && 'animate-shake'
      )}
    >
      {/* Glow effect for savage alerts */}
      {alert.severity === 'savage' && (
        <motion.div
          className="absolute inset-0 opacity-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.1, 0.2, 0.1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          style={{
            background: `radial-gradient(circle at center, ${
              alert.type === 'overpay' ? 'rgba(239,68,68,0.3)' : 'rgba(168,85,247,0.3)'
            } 0%, transparent 70%)`
          }}
        />
      )}

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">{config.emoji}</span>
          <span className={cn('ffi-label font-bold', config.textClass)}>
            TRASH TALK ALERT
          </span>
          {alert.severity === 'savage' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--ffi-danger)]/20 text-[var(--ffi-danger)] font-bold">
              SAVAGE
            </span>
          )}
        </div>

        {/* Message */}
        <p className="ffi-title-md text-white mb-1">{alert.message}</p>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)] mb-3">{alert.detail}</p>

        {/* Actions - mobile touch targets */}
        <div className="flex flex-col sm:flex-row gap-2">
          <FFIButton variant="ghost" size="touch" className="justify-center" onClick={onDismiss}>
            <X className="h-4 w-4 mr-1.5" />
            Dismiss
          </FFIButton>
          <FFIButton variant="secondary" size="touch" className="justify-center" onClick={onSave}>
            <Bookmark className="h-4 w-4 mr-1.5" />
            Save for Later
          </FFIButton>
        </div>
      </div>
    </motion.div>
  )
}

// --- Trash Talk Feed (Multiple Alerts) ---

interface TrashTalkFeedProps {
  alerts: TrashTalkAlert[]
  onDismiss: (id: string) => void
  onSave: (id: string) => void
  maxVisible?: number
}

export function TrashTalkFeed({
  alerts,
  onDismiss,
  onSave,
  maxVisible = 3,
}: TrashTalkFeedProps) {
  const visibleAlerts = alerts.slice(0, maxVisible)

  if (alerts.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="ffi-label text-[var(--ffi-text-muted)]">
          TRASH TALK ({alerts.length})
        </span>
        {alerts.length > maxVisible && (
          <span className="ffi-label text-[var(--ffi-text-muted)]">
            +{alerts.length - maxVisible} more
          </span>
        )}
      </div>
      <AnimatePresence mode="popLayout">
        {visibleAlerts.map(alert => (
          <LiveTrashTalkAlert
            key={alert.id}
            alert={alert}
            onDismiss={() => onDismiss(alert.id)}
            onSave={() => onSave(alert.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// --- Post-Draft Roast Report ---

interface RoastReportCardProps {
  report: RoastReport
}

export function RoastReportCard({ report }: RoastReportCardProps) {
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  if (report.entries.length === 0) {
    return (
      <FFICard className="text-center py-8">
        <Meh className="h-10 w-10 text-[var(--ffi-text-muted)] mx-auto mb-3" />
        <p className="ffi-title-md text-white mb-1">Everyone Played It Safe</p>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
          No major mistakes detected. How boring.
        </p>
      </FFICard>
    )
  }

  return (
    <FFICard>
      <FFISectionHeader
        title="How Everyone Screwed Up"
        subtitle="A comprehensive roast of your league's draft decisions"
        action={<Flame className="h-5 w-5 text-[var(--ffi-danger)]" />}
      />

      {/* Award Winners - mobile responsive grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {report.mvpOfOverpaying && (
          <AwardBadge
            emoji="🔥"
            title="MVP of Overpaying"
            winner={report.mvpOfOverpaying}
            color="danger"
          />
        )}
        {report.mostPanicked && (
          <AwardBadge
            emoji="😬"
            title="Most Panicked"
            winner={report.mostPanicked}
            color="warning"
          />
        )}
        {report.luckyBastard && (
          <AwardBadge
            emoji="🎯"
            title="Lucky Bastard"
            winner={report.luckyBastard}
            color="success"
          />
        )}
        {report.byeWeekChampion && (
          <AwardBadge
            emoji="💀"
            title="Bye Week Disaster"
            winner={report.byeWeekChampion}
            color="purple"
          />
        )}
      </div>

      {/* Detailed Entries */}
      <div className="space-y-2">
        {report.entries.map((entry, index) => (
          <RoastEntry
            key={`${entry.managerName}-${entry.roastType}-${index}`}
            entry={entry}
            expanded={expandedEntry === `${entry.managerName}-${index}`}
            onToggle={() => setExpandedEntry(
              expandedEntry === `${entry.managerName}-${index}`
                ? null
                : `${entry.managerName}-${index}`
            )}
          />
        ))}
      </div>
    </FFICard>
  )
}

interface AwardBadgeProps {
  emoji: string
  title: string
  winner: string
  color: 'danger' | 'warning' | 'success' | 'purple'
}

function AwardBadge({ emoji, title, winner, color }: AwardBadgeProps) {
  const colorClasses = {
    danger: 'border-[var(--ffi-danger)]/30 bg-[var(--ffi-danger)]/10',
    warning: 'border-[var(--ffi-warning)]/30 bg-[var(--ffi-warning)]/10',
    success: 'border-[var(--ffi-success)]/30 bg-[var(--ffi-success)]/10',
    purple: 'border-purple-500/30 bg-purple-500/10',
  }

  return (
    <div className={cn(
      'rounded-lg border p-3 text-center',
      colorClasses[color]
    )}>
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="ffi-label text-[var(--ffi-text-muted)] mb-0.5">{title}</div>
      <div className="ffi-body-md text-white font-semibold truncate">{winner}</div>
    </div>
  )
}

interface RoastEntryProps {
  entry: RoastReportEntry
  expanded: boolean
  onToggle: () => void
}

function RoastEntry({ entry, expanded, onToggle }: RoastEntryProps) {
  const severityColors = {
    mild: 'border-[var(--ffi-text-muted)]/20',
    medium: 'border-[var(--ffi-warning)]/30',
    savage: 'border-[var(--ffi-danger)]/40',
  }

  return (
    <motion.div
      className={cn(
        'rounded-lg border p-3 min-h-[48px] cursor-pointer transition-all',
        'bg-[var(--ffi-surface)]/40 hover:bg-[var(--ffi-surface)]/60 active:bg-[var(--ffi-surface)]/80',
        'ffi-no-select touch-manipulation',
        severityColors[entry.severity]
      )}
      onClick={onToggle}
      layout
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="ffi-body-md text-white font-semibold">{entry.title}</span>
          {entry.severity === 'savage' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--ffi-danger)]/20 text-[var(--ffi-danger)] font-bold">
              SAVAGE
            </span>
          )}
        </div>
        <span className="ffi-body-md text-[var(--ffi-text-secondary)]">
          {entry.managerName}
        </span>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <p className="ffi-body-md text-[var(--ffi-text-secondary)] mt-2 pt-2 border-t border-[var(--ffi-border)]/10">
              {entry.description}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// --- Saved Trash Talk Summary ---

interface SavedTrashTalkProps {
  alerts: TrashTalkAlert[]
  onRemove: (id: string) => void
}

export function SavedTrashTalk({ alerts, onRemove }: SavedTrashTalkProps) {
  if (alerts.length === 0) {
    return (
      <FFICard className="text-center py-6">
        <Bookmark className="h-8 w-8 text-[var(--ffi-text-muted)] mx-auto mb-2" />
        <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
          No saved trash talk yet. Save alerts during the draft!
        </p>
      </FFICard>
    )
  }

  return (
    <FFICard>
      <FFISectionHeader
        title="Saved Trash Talk"
        subtitle={`${alerts.length} moment${alerts.length !== 1 ? 's' : ''} worth remembering`}
        action={<Bookmark className="h-4 w-4 text-[var(--ffi-accent)]" />}
      />
      <div className="space-y-2">
        {alerts.map(alert => {
          const config = trashTalkConfig[alert.type]
          return (
            <div
              key={alert.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border-l-2',
                config.borderClass,
                config.bgClass
              )}
            >
              <span className="text-lg">{config.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="ffi-body-md text-white font-medium">{alert.message}</p>
                <p className="ffi-body-md text-[var(--ffi-text-secondary)] text-sm mt-0.5">
                  {alert.managerName} • Pick #{alert.pickNumber}
                </p>
              </div>
              <button
                onClick={() => onRemove(alert.id)}
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors flex items-center justify-center"
                aria-label="Remove"
              >
                <X className="h-5 w-5 text-[var(--ffi-text-muted)]" />
              </button>
            </div>
          )
        })}
      </div>
    </FFICard>
  )
}
