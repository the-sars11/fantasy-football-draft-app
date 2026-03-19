import { getUser } from '@/lib/supabase/server'
import { LeagueConfigForm } from '@/components/prep/league-config-form'

export default async function ConfigurePage() {
  const user = await getUser()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">League Configuration</h1>
        <p className="text-muted-foreground">
          Set up your league details, roster slots, scoring, and keeper rules
        </p>
      </div>
      <LeagueConfigForm userId={user!.id} />
    </div>
  )
}
