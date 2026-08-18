'use client'

/**
 * Fast block picker (UXV2-6): opened by "Change player" or a lost sync.
 * Big search + one-tap shortlist of top-available and my-targets. Tapping a
 * row sets that player on the block, pre-loaded with tier / range / tags.
 */

import { useMemo, useState } from 'react'
import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import { ROOM, posColors } from './theme'

type Segment = 'top' | 'targets' | 'search'

const FLEX_ELIGIBLE = new Set<Position>(['RB', 'WR', 'TE'])

export interface BlockPickerFilter {
  /** 'FLEX' pools RB/WR/TE, matching the room's TierContext FLEX row. */
  position?: Position | 'FLEX'
  tier?: 1 | 2 | 3 | 4 | 5
}

function rangeFor(sp: ScoredPlayer, maxBidMap: Map<string, number>): {
  low: number
  high: number
  suggested: number
} {
  const market = sp.player.consensusAuctionValue ?? 1
  const suggested = maxBidMap.get(sp.player.name.toLowerCase()) ?? Math.round(market)
  const low = Math.max(1, Math.round(market * 0.8))
  const high = Math.max(low, Math.round(market * 1.2))
  return { low, high, suggested }
}

function PickerRow({
  sp,
  maxBidMap,
  onPick,
}: {
  sp: ScoredPlayer
  maxBidMap: Map<string, number>
  onPick: (player: Player) => void
}) {
  const pc = posColors(sp.player.position)
  const rawTier = sp.player.consensusTier
  const tier = Number.isFinite(rawTier) ? Math.max(1, Math.round(rawTier)) : null
  const { low, high, suggested } = rangeFor(sp, maxBidMap)
  return (
    <button
      onClick={() => onPick(sp.player)}
      className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
    >
      <div
        className="flex h-[22px] w-[30px] shrink-0 items-center justify-center rounded text-[9.5px] font-bold"
        style={{ background: pc.bg, color: pc.color }}
      >
        {sp.player.position}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[15px] font-semibold" style={{ color: ROOM.t1 }}>
          <span className="truncate">{sp.player.name}</span>
          {sp.isUserTarget && <span className="text-[11px]" style={{ color: ROOM.blue }}>★</span>}
          {sp.isUserAvoid && <span className="text-[10px]" style={{ color: ROOM.danger }}>avoid</span>}
        </div>
        <div className="mt-0.5 truncate text-[11px]" style={{ color: ROOM.t3 }}>
          {sp.player.team}
          {sp.player.byeWeek ? ` · Bye ${sp.player.byeWeek}` : ''} · range ${low}-${high}
        </div>
      </div>
      <span
        className="shrink-0 rounded text-[9.5px] font-bold"
        style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.06)', color: ROOM.t3 }}
      >
        {tier === null ? 'NR' : `T${tier}`}
      </span>
      <span className="shrink-0 font-mono text-[13px] font-semibold" style={{ color: ROOM.blue }}>
        ${suggested}
      </span>
    </button>
  )
}

export function BlockPickerSheet({
  open,
  online,
  available,
  maxBidMap,
  initialFilter,
  onPick,
  onClose,
}: {
  open: boolean
  online: boolean
  available: ScoredPlayer[]
  maxBidMap: Map<string, number>
  initialFilter?: BlockPickerFilter
  onPick: (player: Player) => void
  onClose: () => void
}) {
  const [segment, setSegment] = useState<Segment>('top')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => {
    let pool = available
    if (initialFilter?.position === 'FLEX') {
      pool = pool.filter(sp => FLEX_ELIGIBLE.has(sp.player.position))
    } else if (initialFilter?.position) {
      pool = pool.filter(sp => sp.player.position === initialFilter.position)
    }
    if (initialFilter?.tier) {
      pool = pool.filter(sp => Math.max(1, Math.round(sp.player.consensusTier)) === initialFilter.tier)
    }
    const q = query.trim().toLowerCase()
    if (q.length > 0) {
      return pool
        .filter(sp => sp.player.name.toLowerCase().includes(q))
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, 40)
    }
    if (segment === 'targets') {
      return pool.filter(sp => sp.isUserTarget).sort((a, b) => b.combinedScore - a.combinedScore).slice(0, 40)
    }
    return [...pool].sort((a, b) => b.combinedScore - a.combinedScore).slice(0, 40)
  }, [available, segment, query, initialFilter])

  if (!open) return null

  const activeSeg: Segment = query.trim().length > 0 ? 'search' : segment

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(4,8,14,0.6)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col rounded-t-[20px]"
        style={{
          background: ROOM.surface,
          borderTop: `1px solid ${ROOM.border}`,
          boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
        }}
        role="dialog"
        aria-label="Who's on the block"
      >
        <div className="mx-auto mb-1 mt-2.5 h-1 w-9 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="px-4 pb-2.5 pt-1">
          <div className="font-headline text-[17px]" style={{ color: ROOM.t1 }}>
            Who&apos;s on the block?
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: ROOM.t3 }}>
            {online
              ? 'Tap a player to set them up, or search.'
              : 'Sync is down. Tap a player to set them up, or search.'}
          </div>
        </div>

        <div className="px-4 pb-3">
          <div
            className="flex items-center gap-2.5 rounded-[10px] px-3 py-2.5"
            style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.blue20}` }}
          >
            <span className="text-[15px]" style={{ color: ROOM.t3 }} aria-hidden="true">🔍</span>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search a player"
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-[color:var(--room-t3)]"
              style={{ color: ROOM.t1, ['--room-t3' as string]: ROOM.t3 }}
            />
          </div>
        </div>

        <div className="flex gap-2 px-4 pb-2.5">
          {(
            [
              { key: 'top' as Segment, label: 'Top available' },
              { key: 'targets' as Segment, label: 'My targets' },
            ]
          ).map(seg => {
            const on = activeSeg === seg.key
            return (
              <button
                key={seg.key}
                onClick={() => {
                  setQuery('')
                  setSegment(seg.key)
                }}
                className="rounded-full text-[10px] font-bold tracking-wide"
                style={{
                  padding: '5px 12px',
                  background: on ? ROOM.blue10 : 'rgba(255,255,255,0.05)',
                  color: on ? ROOM.blue : ROOM.t3,
                  border: `1px solid ${on ? ROOM.blue20 : ROOM.border}`,
                }}
              >
                {seg.label}
              </button>
            )
          })}
          {query.trim().length > 0 && (
            <span
              className="rounded-full text-[10px] font-bold tracking-wide"
              style={{ padding: '5px 12px', background: ROOM.blue10, color: ROOM.blue, border: `1px solid ${ROOM.blue20}` }}
            >
              Search: &quot;{query.trim()}&quot;
            </span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {rows.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px]" style={{ color: ROOM.t3 }}>
              No players match. Try a different search.
            </div>
          ) : (
            rows.map(sp => (
              <PickerRow key={sp.player.id} sp={sp} maxBidMap={maxBidMap} onPick={onPick} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
