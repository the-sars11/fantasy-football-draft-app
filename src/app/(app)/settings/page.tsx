import Link from 'next/link'
import { ChevronRight, Beaker, List, Flag, Play, Clock } from 'lucide-react'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { FFIBadge } from '@/components/ui/ffi-primitives'
import { SignOutRow } from './client'

// SHIELD section label (condensed, wide-tracked) - the prep-hub twin's QuietLabel
function QuietLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="font-bold text-[10px] uppercase mt-6 mb-2.5"
      style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.28em', color: 'var(--ffi-ink-3)' }}
    >
      {children}
    </p>
  )
}

// DestRow: nameplate navigation row with an icon chip, body, and chevron
function DestRow({
  icon,
  label,
  value,
  href,
  accent = 'red',
  badge,
}: {
  icon: React.ReactNode
  label: string
  value?: string
  href: string
  accent?: 'red' | 'blue'
  badge?: string
}) {
  const chipColor = accent === 'blue' ? 'var(--ffi-blue)' : 'var(--ffi-volt)'
  return (
    <Link
      href={href}
      className="ffi-nameplate ffi-nameplate-interactive flex items-center gap-3 px-3 py-3 group min-h-[44px]"
    >
      <div
        className="shrink-0 flex items-center justify-center rounded-full"
        style={{ width: 34, height: 34, background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
        aria-hidden
      >
        <span style={{ color: chipColor, display: 'flex' }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium truncate" style={{ color: 'var(--ffi-ink)' }}>{label}</span>
          {badge && <FFIBadge status="info" className="text-[9px]">{badge}</FFIBadge>}
        </div>
        {value && (
          <span className="ffi-caption truncate block mt-0.5" style={{ color: 'var(--ffi-ink-3)' }}>
            {value}
          </span>
        )}
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 transition-colors"
        style={{ color: 'var(--ffi-ink-3)' }}
        aria-hidden="true"
      />
    </Link>
  )
}

function InfoRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 min-h-[44px]">
      <span className="ffi-caption" style={{ color: 'var(--ffi-ink-3)' }}>{label}</span>
      <span
        className="ffi-body-md font-medium truncate max-w-[60%] text-right"
        style={{ color: danger ? 'var(--ffi-danger)' : 'var(--ffi-ink)' }}
      >
        {value}
      </span>
    </div>
  )
}

export default async function SettingsPage() {
  const user = await getUser()
  const supabase = await createClient()

  let leagueName: string | undefined
  let leagueSummary: string | undefined
  if (supabase) {
    const { data } = await supabase
      .from('leagues')
      .select('name, format, team_count, budget')
      .order('is_active', { ascending: false })
      .order('updated_at', { ascending: false })
      .limit(1)
    const league = data?.[0]
    if (league) {
      leagueName = league.name
      const parts = ['Auction', `${league.team_count} teams`]
      if (league.budget) parts.push(`$${league.budget}`)
      leagueSummary = parts.join(' · ')
    }
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Not set'
  const userEmail = user?.email || 'Not set'
  const configSummary = leagueName ? `${leagueName} · ${leagueSummary}` : 'Not configured yet'

  return (
    <div className="max-w-lg">
      <div className="pb-2">
        <h1 className="ffi-title-red ffi-display-md">Setup</h1>
      </div>

      {/* ACTIVE LEAGUE - hero anchor (prep-hub twin) */}
      <div className="ffi-hero p-4 mt-3">
        <div className="relative z-10">
          <div
            className="font-bold text-[10px] uppercase"
            style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.22em', color: 'var(--ffi-blue-bright)' }}
          >
            Active League
          </div>
          <div className="ffi-title-red mt-1" style={{ fontSize: 22, lineHeight: 1.1 }}>
            {leagueName ?? 'No league yet'}
          </div>
          <div className="ffi-caption mt-1" style={{ color: 'var(--ffi-ink-3)' }}>
            {leagueSummary ?? 'Configure a league to get started'}
          </div>
        </div>
      </div>

      <QuietLabel>League</QuietLabel>
      <DestRow
        icon={<List className="w-[18px] h-[18px]" strokeWidth={2} />}
        label="League Config"
        value={configSummary}
        href="/prep/configure"
      />

      <QuietLabel>Draft</QuietLabel>
      <div className="space-y-2">
        <DestRow
          icon={<Flag className="w-[18px] h-[18px]" strokeWidth={2} />}
          label="Draft Setup"
          value="Confirm managers before going live"
          href="/draft/setup"
        />
        <DestRow
          icon={<Play className="w-[18px] h-[18px]" strokeWidth={2} />}
          label="Demo Draft"
          value="Practice run · no real draft"
          href="/draft/live?sim=1"
          accent="blue"
          badge="Dev"
        />
      </div>

      <QuietLabel>History</QuietLabel>
      <DestRow
        icon={<Clock className="w-[18px] h-[18px]" strokeWidth={2} />}
        label="Run History"
        value="Past research runs"
        href="/prep/runs"
      />

      <QuietLabel>Account</QuietLabel>
      <div className="ffi-nameplate px-4">
        <InfoRow label="Name" value={userName} />
        <div style={{ borderTop: '1px solid var(--ffi-hairline)' }} />
        <InfoRow label="Email" value={userEmail} />
        <div style={{ borderTop: '1px solid var(--ffi-hairline)' }} />
        <SignOutRow />
      </div>

      <div className="flex items-center gap-2 mt-4 pb-2">
        <Beaker className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--ffi-ink-3)' }} aria-hidden="true" />
        <span className="ffi-caption" style={{ color: 'var(--ffi-ink-3)' }}>
          Demo Draft launches a sim against real player data. No AI calls fired.
        </span>
      </div>
    </div>
  )
}
