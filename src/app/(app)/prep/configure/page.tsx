import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getUser } from '@/lib/supabase/server'
import { LeagueConfigForm } from '@/components/prep/league-config-form'

export default async function ConfigurePage() {
  const user = await getUser()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 ffi-caption text-[var(--ffi-text-secondary)] hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          Setup
        </Link>
        <h2 className="ffi-title-red ffi-display-md">League Config</h2>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)] mb-4">
          The Nasties defaults are pre-filled. Edit as needed and save.
        </p>
        <div className="ffi-hero px-4 py-3.5">
          <div className="ffi-title-red font-bold text-[22px] leading-none">The Nasties</div>
          <p className="ffi-caption mt-1.5 text-[var(--ffi-ink-3)]" style={{ letterSpacing: '0.06em' }}>
            Auction &middot; 12 teams &middot; $200 &middot; PPR, no-K
          </p>
        </div>
      </div>
      <LeagueConfigForm userId={user!.id} />
    </div>
  )
}
