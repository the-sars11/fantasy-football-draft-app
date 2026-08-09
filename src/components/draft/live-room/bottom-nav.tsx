'use client'

/**
 * Live-room bottom nav (UXV2-6): tap-only 4-tab bar. The app shell strips its
 * own nav on /draft/live, so the room supplies this. Draft is the active tab.
 */

import { Search, Zap, Trophy, Settings } from 'lucide-react'
import { ROOM } from './theme'

type TabKey = 'research' | 'draft' | 'review' | 'setup'

const TABS: Array<{ key: TabKey; label: string; href: string; Icon: typeof Search }> = [
  { key: 'research', label: 'Research', href: '/prep', Icon: Search },
  { key: 'draft', label: 'Draft', href: '/draft/live', Icon: Zap },
  { key: 'review', label: 'Review', href: '/draft/review', Icon: Trophy },
  { key: 'setup', label: 'Setup', href: '/settings', Icon: Settings },
]

export function BottomNav({
  active = 'draft',
  onNavigate,
}: {
  active?: TabKey
  onNavigate: (href: string) => void
}) {
  return (
    <div
      className="flex items-stretch"
      style={{
        background: ROOM.card,
        borderTop: `1px solid ${ROOM.border}`,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {TABS.map(tab => {
        const isActive = tab.key === active
        const color = isActive ? ROOM.volt : ROOM.t3
        return (
          <button
            key={tab.key}
            onClick={() => (isActive ? undefined : onNavigate(tab.href))}
            className="relative flex flex-1 flex-col items-center gap-1 px-0 pb-1 pt-2"
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
          >
            {isActive && (
              <span
                className="absolute left-1/2 top-0 h-0.5 w-3.5 -translate-x-1/2 rounded-b-sm"
                style={{ background: ROOM.volt }}
              />
            )}
            <tab.Icon className="h-4 w-4" style={{ color }} />
            <span
              className="text-[8.5px] font-bold uppercase tracking-[1.5px]"
              style={{ color }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
