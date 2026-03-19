import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) redirect('/sign-in')

  return <AppShell user={user}>{children}</AppShell>
}
