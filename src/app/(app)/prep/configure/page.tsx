import { getUser } from '@/lib/supabase/server'
import { LeagueConfigForm } from '@/components/prep/league-config-form'

export default async function ConfigurePage() {
  const user = await getUser()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-0">
        <div>
          <h2 className="ffi-display-md text-white">League Configuration</h2>
          <p className="ffi-body-md text-[var(--ffi-text-secondary)]">
            Set up your league details, roster slots, scoring, and keeper rules
          </p>
        </div>
      </div>
      <LeagueConfigForm userId={user!.id} />
    </div>
  )
}
