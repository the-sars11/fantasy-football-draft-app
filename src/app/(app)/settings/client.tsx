'use client'

import { LogOut } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'

export function SignOutRow() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full flex items-center gap-2 py-3 text-left min-h-[44px] transition-opacity hover:opacity-80"
        style={{ color: 'var(--ffi-danger)' }}
      >
        <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="ffi-body-md font-medium">Sign out</span>
      </button>
    </form>
  )
}
