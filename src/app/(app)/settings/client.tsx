'use client'

import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon, LogOut } from 'lucide-react'
import { signOut } from '@/app/(auth)/actions'

export function ThemeRow() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const isDark = mounted ? theme === 'dark' : false

  return (
    <div className="flex items-center justify-between py-3 px-4">
      <span className="ffi-body-md text-white font-medium">Theme</span>
      {mounted && (
        <button
          type="button"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--ffi-border)]/30 bg-[var(--ffi-surface)] hover:border-[#8bacff]/40 transition-all min-h-[44px]"
        >
          {isDark ? (
            <>
              <Moon className="h-4 w-4 text-[#8bacff]" aria-hidden="true" />
              <span className="ffi-caption text-[#8bacff] font-semibold">Dark</span>
            </>
          ) : (
            <>
              <Sun className="h-4 w-4 text-[#fbbf24]" aria-hidden="true" />
              <span className="ffi-caption text-[#fbbf24] font-semibold">Light</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}

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
