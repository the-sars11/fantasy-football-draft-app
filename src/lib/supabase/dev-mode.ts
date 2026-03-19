import type { User } from '@supabase/supabase-js'

export const DEV_MODE = process.env.DEV_MODE === 'true'

export const DEV_USER: User = {
  id: process.env.DEV_USER_ID || 'dev-user-001',
  email: process.env.DEV_USER_EMAIL || 'joe.rasar@propermuse.co',
  app_metadata: {},
  user_metadata: {
    full_name: process.env.DEV_USER_NAME || 'Joe Rasar',
  },
  aud: 'authenticated',
  created_at: new Date().toISOString(),
} as User
