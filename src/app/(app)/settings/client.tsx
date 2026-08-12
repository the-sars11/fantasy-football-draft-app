'use client'

import { LogOut } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'

export function SignOutRow() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full flex items-center gap-3 py-3 px-4 text-left hover:bg-[var(--ffi-surface-elevated)] transition-colors rounded-b-2xl group min-h-[44px]"
      >
        <LogOut className="h-4 w-4 text-[var(--ffi-text-secondary)] group-hover:text-[var(--ffi-danger)] transition-colors" aria-hidden="true" />
        <span className="ffi-body-md text-[var(--ffi-text-secondary)] group-hover:text-[var(--ffi-danger)] transition-colors font-medium">
          Sign out
        </span>
      </button>
    </form>
  )
}
