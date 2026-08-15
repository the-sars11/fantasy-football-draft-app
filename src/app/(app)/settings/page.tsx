import Link from 'next/link'
import { ChevronRight, Beaker } from 'lucide-react'
import { getUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { SignOutRow } from './client'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 pb-1 pt-5 first:pt-0">
      <span className="text-[10px] font-bold tracking-widest uppercase text-[var(--ffi-text-muted)]">
        {children}
      </span>
    </div>
  )
}

function SettingsGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--ffi-border)]/20 bg-[var(--ffi-surface)] divide-y divide-[var(--ffi-border)]/10 overflow-hidden">
      {children}
    </div>
  )
}

function NavRow({
  label,
  value,
  href,
  badge,
}: {
  label: string
  value?: string
  href: string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3 px-4 hover:bg-[var(--ffi-surface-elevated)] transition-colors group min-h-[44px]"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="ffi-body-md text-white font-medium">{label}</span>
          {badge && (
            <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-[#8bacff]/15 text-[#8bacff]">
              {badge}
            </span>
          )}
        </div>
        {value && (
          <span className="ffi-caption text-[var(--ffi-text-secondary)] truncate block mt-0.5">
            {value}
          </span>
        )}
      </div>
      <ChevronRight className="h-4 w-4 text-[var(--ffi-text-muted)] group-hover:text-[var(--ffi-text-secondary)] transition-colors shrink-0" aria-hidden="true" />
    </Link>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3 px-4 min-h-[44px]">
      <span className="ffi-caption text-[var(--ffi-text-secondary)]">{label}</span>
      <span className="ffi-body-md text-white font-medium truncate max-w-[60%] text-right">{value}</span>
    </div>
  )
}

export default async function SettingsPage() {
  const user = await getUser()
  const supabase = await createClient()

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
      const parts = [league.name, 'Auction', `${league.team_count} teams`]
      if (league.budget) parts.push(`$${league.budget}`)
      leagueSummary = parts.join(' · ')
    }
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Not set'
  const userEmail = user?.email || 'Not set'

  return (
    <div className="space-y-0 max-w-lg">
      <div className="pb-4">
        <h1 className="ffi-title-red ffi-display-md">Setup</h1>
      </div>

      <SectionLabel>League</SectionLabel>
      <SettingsGroup>
        <NavRow
          label="League Config"
          value={leagueSummary ?? 'Not configured yet'}
          href="/prep/configure"
        />
      </SettingsGroup>

      <SectionLabel>Draft</SectionLabel>
      <SettingsGroup>
        <NavRow
          label="Draft Setup"
          value="Confirm managers before going live"
          href="/draft/setup"
        />
        <NavRow
          label="Demo Draft"
          value="Practice run · no real draft"
          href="/draft/live?sim=1"
          badge="Dev"
        />
      </SettingsGroup>

      <SectionLabel>History</SectionLabel>
      <SettingsGroup>
        <NavRow
          label="Run History"
          value="Past research runs"
          href="/prep/runs"
        />
      </SettingsGroup>

      <SectionLabel>Account</SectionLabel>
      <SettingsGroup>
        <InfoRow label="Name" value={userName} />
        <InfoRow label="Email" value={userEmail} />
        <SignOutRow />
      </SettingsGroup>

      <div className="pt-6 pb-2">
        <p className="ffi-caption text-[var(--ffi-text-muted)] text-center flex items-center justify-center gap-1">
          <Beaker className="h-3 w-3" aria-hidden="true" />
          Demo Draft launches a sim against real player data. No AI calls fired.
        </p>
      </div>
    </div>
  )
}
