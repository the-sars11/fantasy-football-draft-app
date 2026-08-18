'use client'

/**
 * Inline collapsible Players panel (D6b-1 gap #6).
 * Shows search + position filters + ranked player list directly in the cockpit
 * scroll, coexisting with the Research tab. No new data fetching.
 */

import { useState, useMemo } from 'react'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import { ROOM, posColors } from './theme'

type PosFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'DEF'
const POS_FILTERS: PosFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DEF']

export interface InlinePlayersPanelProps {
  available: ScoredPlayer[]
  maxBidMap: Map<string, number>
  isTarget: (id: string) => boolean
  onToggleTarget: (id: string) => void
  onSelectPlayer: (p: Player) => void
}

/** Rows shown before "show more" — keeps paint fast in a live auction. */
const DEFAULT_ROWS = 15

export function InlinePlayersPanel({
  available,
  maxBidMap,
  isTarget,
  onToggleTarget,
  onSelectPlayer,
}: InlinePlayersPanelProps) {
  const [open, setOpen] = useState(true)
  const [posFilter, setPosFilter] = useState<PosFilter>('ALL')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return available
      .filter(sp => {
        if (posFilter !== 'ALL' && sp.player.position !== posFilter) return false
        if (q && !sp.player.name.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => b.combinedScore - a.combinedScore)
  }, [available, posFilter, query])

  const rows = showAll ? filtered : filtered.slice(0, DEFAULT_ROWS)

  return (
    <div
      style={{
        marginTop: 11,
        border: `1px solid ${ROOM.border}`,
        borderRadius: 12,
        background: ROOM.surface,
        overflow: 'hidden',
      }}
    >
      {/* Section header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="flex w-full items-center justify-between px-3 py-3"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-headline text-[12px] font-semibold uppercase tracking-[1.4px]"
            style={{ color: ROOM.action }}
          >
            Players
          </span>
          <span className="font-mono text-[11px]" style={{ color: ROOM.t2 }}>
            sort · filter · star
          </span>
        </div>
        <span
          className="text-[12px] transition-transform duration-200"
          style={{ color: ROOM.t3, transform: open ? 'rotate(180deg)' : undefined }}
          aria-hidden="true"
        >
          {'▲'}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-3">
          {/* Search */}
          <div
            className="mb-2 flex items-center gap-2 rounded-[10px] px-3 py-2"
            style={{ border: `1px solid ${ROOM.border}`, background: 'rgba(5,7,12,0.4)' }}
          >
            <span className="text-[13px]" style={{ color: ROOM.t3 }}>
              {'⌕'}
            </span>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search players..."
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none"
              style={{ color: ROOM.t1 }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="shrink-0 text-[11px]"
                style={{ color: ROOM.t3 }}
                aria-label="Clear search"
              >
                {'×'}
              </button>
            )}
          </div>

          {/* Position filter pills */}
          <div className="mb-2 flex flex-wrap gap-1.5">
            {POS_FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setPosFilter(f)}
                className="rounded-full px-3 py-[5px] font-headline text-[11px] font-semibold tracking-[0.04em] transition-colors"
                style={
                  posFilter === f
                    ? { background: ROOM.blue, border: `1px solid ${ROOM.blue}`, color: '#04121f' }
                    : {
                        background: 'rgba(5,7,12,0.4)',
                        border: `1px solid ${ROOM.border}`,
                        color: ROOM.t2,
                      }
                }
              >
                {f}
              </button>
            ))}
          </div>

          {/* Column headers */}
          <div
            className="mb-1 grid gap-2 px-2 pb-1.5 font-headline text-[9.5px] font-semibold uppercase tracking-[0.06em]"
            style={{
              gridTemplateColumns: '26px 1fr 52px 48px 28px',
              color: ROOM.t3,
            }}
          >
            <span>Rk</span>
            <span>Player</span>
            <span className="text-right">Proj</span>
            <span className="text-right">Value</span>
            <span className="text-center">Fav</span>
          </div>

          {/* Player rows */}
          {rows.map((sp, i) => {
            const pc = posColors(sp.player.position)
            const proj = sp.player.projectedPoints != null
              ? Math.round(sp.player.projectedPoints)
              : null
            const value = maxBidMap.get(sp.player.name.toLowerCase())
              ?? (sp.player.consensusAuctionValue != null
                ? Math.round(sp.player.consensusAuctionValue)
                : null)
            const fav = isTarget(sp.player.id)

            return (
              <div
                key={sp.player.id}
                className="grid cursor-pointer items-center gap-2 border-t px-2 py-2 transition-colors"
                style={{
                  gridTemplateColumns: '26px 1fr 52px 48px 28px',
                  borderColor: ROOM.border,
                }}
                onClick={() => onSelectPlayer(sp.player)}
              >
                <span className="font-mono text-[12px] font-semibold" style={{ color: ROOM.t3 }}>
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <div
                    className="truncate font-headline text-[13.5px] font-semibold leading-tight"
                    style={{ color: ROOM.t1 }}
                  >
                    {sp.player.name}
                  </div>
                  <div className="font-mono text-[9.5px]" style={{ color: pc.color }}>
                    {sp.player.position} {sp.player.team ? `· ${sp.player.team}` : ''}
                  </div>
                </span>
                <span
                  className="text-right font-mono text-[12.5px] font-bold"
                  style={{ color: ROOM.t1 }}
                >
                  {proj ?? '-'}
                </span>
                <span
                  className="text-right font-mono text-[12.5px] font-bold"
                  style={{ color: ROOM.blue }}
                >
                  {value != null ? `$${value}` : '-'}
                </span>
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onToggleTarget(sp.player.id)
                  }}
                  className="flex items-center justify-center text-[14px] transition-transform active:scale-95"
                  style={{ color: fav ? ROOM.action : ROOM.t3 }}
                  aria-pressed={fav}
                  aria-label={fav ? `Remove ${sp.player.name} from favorites` : `Star ${sp.player.name}`}
                >
                  {fav ? '★' : '☆'}
                </button>
              </div>
            )
          })}

          {/* Show more / less */}
          {filtered.length > DEFAULT_ROWS && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-2 w-full rounded-lg py-2 text-[11px] font-bold uppercase tracking-wide"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${ROOM.border}`,
                color: ROOM.t2,
              }}
            >
              {showAll
                ? 'Show less'
                : `Show all ${filtered.length} players`}
            </button>
          )}

          {filtered.length === 0 && (
            <div
              className="py-4 text-center font-mono text-[11px]"
              style={{ color: ROOM.t3 }}
            >
              No players match
            </div>
          )}
        </div>
      )}
    </div>
  )
}
