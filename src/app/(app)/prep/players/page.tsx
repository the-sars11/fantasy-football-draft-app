'use client'

/**
 * Player Browser Page (FF-235)
 *
 * Browse all players with intel tags, sentiment data, and user tags.
 * Provides filtering by position, ADP range, and tag types.
 */

import { Suspense } from 'react'
import { FFISectionHeader } from '@/components/ui/ffi-primitives'
import { PlayerBrowserClient } from './client'

export default function PlayerBrowserPage() {
  return (
    <div className="space-y-6">
      <FFISectionHeader
        title="Player Browser"
        subtitle="Browse players, view intel tags, and mark your targets"
      />

      <Suspense fallback={<PlayerBrowserSkeleton />}>
        <PlayerBrowserClient />
      </Suspense>
    </div>
  )
}

function PlayerBrowserSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter bar skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-9 w-32 bg-surface-container-high rounded-lg animate-pulse" />
        <div className="h-9 w-48 bg-surface-container-high rounded-lg animate-pulse" />
        <div className="h-9 w-24 bg-surface-container-high rounded-lg animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="glass-panel rounded-xl p-5 animate-pulse"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-container-high rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-surface-container-high rounded" />
                <div className="h-3 w-32 bg-surface-container-high rounded" />
              </div>
              <div className="h-8 w-16 bg-surface-container-high rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
