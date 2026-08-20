'use client'

import { useState } from 'react'
import { useIsMobile } from '@/hooks/use-is-mobile'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import {
  Gavel,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Search,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/(auth)/actions'
import { NavProvider } from '@/lib/nav-context'
import { PageTransition } from '@/components/layout/page-transition'
import { SwipeCarousel } from '@/components/layout/swipe-carousel'
import { ShieldBackground } from '@/components/ui/shield'
import { motion, AnimatePresence } from 'framer-motion'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

// UX-S2 (2026-08-08): 4-tab IA spine — Research (landing) / Draft (live only) /
// Review / Setup. URL slugs still point at existing routes; content + slug
// cleanup happens as each tab is rebuilt in UX-S3..S6. See
// .claude/UX_OVERHAUL_2026-08.md.
const navItems: NavItem[] = [
  { label: 'Research', href: '/prep', icon: Search },
  { label: 'Live Draft', href: '/draft', icon: Gavel },
  { label: 'Post Draft', href: '/draft/review', icon: Trophy },
  { label: 'Setup', href: '/settings', icon: Settings },
]

// RV-12: these pages are conceptually Setup but live under other tabs' URL
// trees (/prep, /draft), so the plain longest-prefix match below would light
// up Research or Live Draft instead. Check this override before falling
// through to prefix matching.
const SETUP_OVERRIDE_PREFIXES = ['/prep/configure', '/draft/setup']

// Longest-prefix match so nested routes resolve to the right tab —
// e.g. /draft/review lights up Review, not Draft.
export function getActiveHref(pathname: string): string | undefined {
  if (SETUP_OVERRIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return '/settings'
  }
  return [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    )?.href
}

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
  const activeHref = getActiveHref(pathname)
  // UX-S4 / blueprint 9.6: the live auction room is full-screen — no sidebar, no
  // mobile top header, no bottom tab bar. The room owns its own "Leave draft"
  // affordance, and the swipe-carousel is bypassed so a stray horizontal swipe
  // can't navigate Joe out mid-auction.
  const isLiveRoom = pathname.startsWith('/draft/live')
  const [collapsed, setCollapsed] = useState(false)
  const isMobile = useIsMobile()
  const displayName = user.user_metadata?.full_name || user.email || 'User'
  const initials = displayName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <NavProvider>
    <div className="flex h-dvh flex-col md:flex-row overflow-hidden bg-[var(--ffi-background)] relative">
      {/* SHIELD background — D0-locked blacked-out shield photo + veil (2026-08-14) */}
      <ShieldBackground />
      {/* Desktop sidebar — hidden on mobile, and entirely on the live room */}
      {!isLiveRoom && (
      <aside
        className={cn(
          'hidden md:flex flex-col border-r border-[var(--ffi-border)]/20 ffi-surface-secondary transition-all duration-200 relative z-10',
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
              <span className="text-white">Fantasy Football</span>
              <span className="text-[var(--ffi-primary)] ml-1">Intelligence</span>
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => {
            const isActive = item.href === activeHref
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-[var(--ffi-gold)]/10 text-[var(--ffi-gold-bright)]'
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
      )}

      {/* Mobile top header — hidden on desktop, and entirely on the live room */}
      {!isLiveRoom && (
      <header className="shield-glass shield-glass--bottom flex md:hidden items-center justify-between px-4 h-12 shrink-0 relative z-10">
        <div className="flex items-center gap-2">
          <Image
            src="/icons/FFI - 32x32 - Favicon.png"
            alt="FFI"
            width={20}
            height={20}
          />
          <span className="text-sm font-semibold">
            <span className="text-white">FF</span>
            <span className="text-[var(--ffi-primary)]">Intelligence</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ProfileAvatar initials={initials} size="sm" />
        </div>
      </header>
      )}

      {/* Main content — single render; wrapper chosen at runtime to prevent double-mount (FF-313) */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {isMobile ? (
          <div className="h-full">
            {isLiveRoom ? (
              // Live room: no swipe-carousel (a stray swipe must not leave the auction).
              <PageTransition>
                <div className="mx-auto max-w-6xl p-4 pb-24">{children}</div>
              </PageTransition>
            ) : (
              <SwipeCarousel>
                <PageTransition>
                  <div className="mx-auto max-w-6xl p-4 pb-24">{children}</div>
                </PageTransition>
              </SwipeCarousel>
            )}
          </div>
        ) : (
          <div className="h-full">
            <PageTransition>
              <div className="mx-auto max-w-6xl p-4 md:p-6 pb-6">{children}</div>
            </PageTransition>
          </div>
        )}
      </main>

      {/* Mobile bottom tab bar — hidden on desktop and on the live room (FF-103) */}
      {!isLiveRoom && (
      <nav className="shield-glass shield-glass--top flex md:hidden items-center justify-around h-16 shrink-0 safe-bottom rounded-t-xl relative z-10">
        {navItems.map((item) => {
          const isActive = item.href === activeHref
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 flex-1 h-full',
                isActive
                  ? 'text-[var(--ffi-gold-bright)]'
                  : 'text-[var(--ffi-text-secondary)] active:text-white'
              )}
            >
              <div className="relative p-1.5 rounded-lg">
                {/* Sliding background indicator */}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-[var(--ffi-gold)]/12 rounded-lg"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Icon className={cn(
                    'h-5 w-5 relative z-10',
                    isActive && 'drop-shadow-[0_0_8px_rgba(166,60,65,0.6)]'
                  )} />
                </motion.div>
                {/* Animated dot indicator */}
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--ffi-gold-bright)] shadow-[0_0_8px_rgba(166,60,65,0.85)]"
                    />
                  )}
                </AnimatePresence>
              </div>
              <motion.span
                animate={{
                  opacity: isActive ? 1 : 0.7,
                  y: isActive ? -1 : 0,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'text-[10px] font-medium',
                  isActive && 'text-[var(--ffi-gold-bright)]'
                )}
              >
                {item.label}
              </motion.span>
            </Link>
          )
        })}
      </nav>
      )}
    </div>
    </NavProvider>
  )
}
