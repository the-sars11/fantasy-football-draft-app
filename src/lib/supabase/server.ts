import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'
import { DEV_MODE, DEV_USER } from './dev-mode'

export async function createClient() {
  if (DEV_MODE) return null

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware handles session refresh.
          }
        },
      },
    }
  )
}

export async function getUser(): Promise<User | null> {
  if (DEV_MODE) return DEV_USER

  const supabase = await createClient()
  if (!supabase) return null

  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireUser(): Promise<User> {
  const user = await getUser()
  if (!user) throw new Error('Authentication required')
  return user
}
