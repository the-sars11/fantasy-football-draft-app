'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  ClipboardList,
  Zap,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle, ThemeToggleMobile } from '@/components/theme-toggle'
import { signOut } from '@/app/(auth)/actions'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const navItems: NavItem[] = [
  { label: 'Prep', href: '/prep', icon: ClipboardList },
  { label: 'Draft', href: '/draft', icon: Zap },
  { label: 'Settings', href: '/settings', icon: Settings },
]

export function AppShell({
  user,
  children,
}: {
  user: User
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const displayName = user.user_metadata?.full_name || user.email || 'User'

  return (
    <div className="flex h-dvh flex-col md:flex-row overflow-hidden ffi-bg-gradient">
      {/* Desktop sidebar — hidden on mobile */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-[var(--ffi-border)]/20 ffi-surface-secondary transition-all duration-200',
          collapsed ? 'w-14' : 'w-56'
        )}
      >
        <div className="flex h-14 items-center border-b border-[var(--ffi-border)]/20 px-3">
          <Trophy className="h-5 w-5 shrink-0 text-[var(--ffi-accent)]" />
          {!collapsed && (
            <span className="ml-2 text-sm font-semibold truncate">
              <span className="text-white">FF</span>
              <span className="text-[var(--ffi-primary)]">Intelligence</span>
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[var(--ffi-surface)] text-[var(--ffi-accent)] ffi-glow-accent'
                    : 'text-[var(--ffi-text-secondary)] hover:bg-[var(--ffi-surface)]/50 hover:text-white'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-[var(--ffi-border)]/20 p-2 space-y-1">
          {!collapsed && (
            <div className="px-3 py-2 text-xs text-[var(--ffi-text-muted)] truncate">
              {displayName}
            </div>
          )}

          <ThemeToggle collapsed={collapsed} />

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--ffi-text-secondary)] hover:bg-[var(--ffi-surface)]/50 hover:text-white transition-all duration-200"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </>
            )}
          </button>

          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              title={collapsed ? 'Sign Out' : undefined}
              className={cn(
                'w-full justify-start gap-3 text-muted-foreground hover:text-foreground',
                collapsed && 'px-3'
              )}
              size="sm"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Sign Out</span>}
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top header — hidden on desktop */}
      <header className="flex md:hidden items-center justify-between border-b border-[var(--ffi-border)]/20 ffi-surface-secondary px-4 h-12 shrink-0">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[var(--ffi-accent)]" />
          <span className="text-sm font-semibold">
            <span className="text-white">FF</span>
            <span className="text-[var(--ffi-primary)]">Intelligence</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggleMobile />
          <form action={signOut}>
            <Button variant="ghost" size="sm" className="text-[var(--ffi-text-secondary)] h-8 px-2">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </header>

      {/* Main content — fills space between header and bottom nav on mobile */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-4 md:p-6 pb-20 md:pb-6">{children}</div>
      </main>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <nav className="flex md:hidden items-center justify-around border-t border-[var(--ffi-border)]/20 ffi-surface-secondary h-16 shrink-0 safe-bottom">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 flex-1 h-full transition-all duration-200',
                isActive
                  ? 'ffi-nav-active'
                  : 'text-[var(--ffi-text-secondary)] active:text-white'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
