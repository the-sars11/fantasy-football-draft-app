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
        <h2 className="ffi-display-md text-white">League Config</h2>
        <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
          The Nasties defaults are pre-filled. Edit as needed and save.
        </p>
      </div>
      <LeagueConfigForm userId={user!.id} />
    </div>
  )
}
