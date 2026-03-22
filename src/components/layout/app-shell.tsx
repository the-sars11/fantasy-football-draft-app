'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  Zap,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Home,
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
  { label: 'Home', href: '/prep', icon: Home },
  { label: 'Draft', href: '/draft', icon: Zap },
  { label: 'Settings', href: '/settings', icon: Settings },
]

function ProfileAvatar({
  initials,
  size = 'default'
}: {
  initials: string
  size?: 'default' | 'sm'
}) {
  const sizeClasses = size === 'sm'
    ? 'w-6 h-6 text-[10px]'
    : 'w-8 h-8 text-xs'

  return (
    <div className={cn(
      'rounded-full bg-[var(--ffi-surface)] border border-[var(--ffi-border)]/30 flex items-center justify-center font-semibold text-[var(--ffi-text-secondary)]',
      sizeClasses
    )}>
      {initials}
    </div>
  )
}

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
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

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
          <Image
            src="/icons/FFI - 32x32 - Favicon.png"
            alt="FFI"
            width={24}
            height={24}
            className="shrink-0"
          />
          {!collapsed && (
            <span className="ml-2 text-sm font-semibold truncate">
              <span className="text-white">FF</span>
              <span className="text-[var(--ffi-primary)]">I</span>
              <span className="text-[var(--ffi-text-secondary)] font-normal ml-1">ntelligence</span>
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
          {/* Profile section */}
          <div className={cn(
            'flex items-center gap-2 px-3 py-2',
            collapsed && 'justify-center px-0'
          )}>
            <ProfileAvatar initials={initials} size="sm" />
            {!collapsed && (
              <span className="text-xs text-[var(--ffi-text-muted)] truncate flex-1">
                {displayName}
              </span>
            )}
          </div>

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
          <Image
            src="/icons/FFI - 32x32 - Favicon.png"
            alt="FFI"
            width={20}
            height={20}
          />
          <span className="text-sm font-semibold">
            <span className="text-white">FF</span>
            <span className="text-[var(--ffi-primary)]">I</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ProfileAvatar initials={initials} size="sm" />
          <ThemeToggleMobile />
        </div>
      </header>

      {/* Main content — fills space between header and bottom nav on mobile */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl p-4 md:p-6 pb-20 md:pb-6">{children}</div>
      </main>

      {/* Mobile bottom tab bar — hidden on desktop */}
      <nav className="flex md:hidden items-center justify-around border-t border-[var(--ffi-border)]/20 ffi-glass-heavy h-16 shrink-0 safe-bottom">
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
                  ? 'text-[var(--ffi-accent)]'
                  : 'text-[var(--ffi-text-secondary)] active:text-white'
              )}
            >
              <div className={cn(
                'relative p-1.5 rounded-lg transition-all duration-200',
                isActive && 'bg-[var(--ffi-accent)]/10'
              )}>
                <Icon className={cn(
                  'h-5 w-5 transition-all duration-200',
                  isActive && 'drop-shadow-[0_0_8px_rgba(57,255,20,0.6)]'
                )} />
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--ffi-accent)] shadow-[0_0_6px_rgba(57,255,20,0.8)]" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isActive && 'text-[var(--ffi-accent)]'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
