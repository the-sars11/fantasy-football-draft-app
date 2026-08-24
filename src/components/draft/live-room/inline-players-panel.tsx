'use client'

/**
 * Value Board (LB-2, evolved from the D6b-1 inline Players panel).
 *
 * One scannable line per available player, repriced live off the two drivers
 * Joe named: what the room is paying (market inflation moves ROOM) and what his
 * roster still needs (need moves YOUR target). Each row shows YOUR target price,
 * the ROOM price it must beat with a hot/soft arrow, and a POCKET / tax chip when
 * the two diverge - so the openings surface themselves the instant they open.
 *
 * Injury truth is split (LB-1): FRAGILE = injury-prone but already priced in
 * (keep targeting), OUT = unavailable right now (late stash only). "Questionable"
 * is silenced. Keeps the search / position filter / star (watchlist) controls.
 *
 * Copy rule (Joe): plain English, no jargon, NO em/en dashes anywhere.
 */

import { useState, useMemo } from 'react'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { RepricedPlayer } from '@/lib/draft/live-reprice'
import { classifyInjury } from '@/lib/players/injury-flags'
import { ROOM, posColors } from './theme'

type PosFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'DEF'
const POS_FILTERS: PosFilter[] = ['ALL', 'QB', 'RB', 'WR', 'TE', 'DEF']

/**
 * A player already off the board, shown as dimmed context inside the ranked
 * ladder instead of silently vanishing. `mine` = Joe won him; otherwise gone to
 * another owner. `combinedScore` places him at his true board rank; `price` is
 * the sale price (null if unpriced/unknown).
 */
export interface DraftedRow {
  id: string
  name: string
  position: string
  team?: string
  combinedScore: number
  price: number | null
  mine: boolean
}

export interface InlinePlayersPanelProps {
  available: ScoredPlayer[]
  maxBidMap: Map<string, number>
  /** LB-2: live-repriced You/Room/pocket per player id. Empty before any sale. */
  repriced: Map<string, RepricedPlayer>
  /**
   * Drafted players interleaved into the ladder as dimmed context (mine/gone).
   * Defaults to none, which reproduces the original available-only board.
   */
  drafted?: DraftedRow[]
  isTarget: (id: string) => boolean
  onToggleTarget: (id: string) => void
  onSelectPlayer: (p: Player) => void
}

/** One merged ladder entry: a live (undrafted) player or a gone/mine context row. */
type BoardItem =
  | { kind: 'live'; sp: ScoredPlayer; score: number; name: string; position: string }
  | { kind: 'drafted'; row: DraftedRow; score: number; name: string; position: string }

/** Rows shown before "show more" -- keeps paint fast in a live auction. */
const DEFAULT_ROWS = 15

const GRID = '20px 1fr auto 26px'

/** Injury flag pill (LB-1 split). Null when the player wears neither flag. */
function InjuryFlag({ player }: { player: Player }) {
  const { fragile, out, outStatus } = classifyInjury(player.sleeperId, player.position, player.injuryStatus)
  if (out) {
    return (
      <span
        className="shrink-0 rounded-[3px] px-1 font-headline text-[8px] font-bold uppercase tracking-[0.5px]"
        style={{ background: ROOM.danger10, color: ROOM.danger }}
      >
        {outStatus ? `out ${outStatus}` : 'out'}
      </span>
    )
  }
  if (fragile) {
    return (
      <span
        className="shrink-0 rounded-[3px] px-1 font-headline text-[8px] font-bold uppercase tracking-[0.5px]"
        style={{ background: ROOM.amber10, color: ROOM.amber }}
      >
        fragile
      </span>
    )
  }
  return null
}

/** Right-side value cluster: pocket/tax chip + You over Room, or a bare value. */
function ValueCluster({
  rp,
  fallbackValue,
}: {
  rp: RepricedPlayer | undefined
  fallbackValue: number | null
}) {
  if (!rp) {
    return (
      <span className="text-right font-mono text-[12.5px] font-bold" style={{ color: ROOM.blue }}>
        {fallbackValue != null ? `$${fallbackValue}` : '-'}
      </span>
    )
  }

  const roomArrow =
    rp.roomDelta > 0 ? (
      <span style={{ color: ROOM.amber }}> ▲</span>
    ) : rp.roomDelta < 0 ? (
      <span style={{ color: ROOM.blue }}> ▼</span>
    ) : null

  return (
    <div className="flex items-center gap-2">
      {rp.isPocket && (
        <span
          className="shrink-0 rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] font-bold"
          style={{ background: ROOM.blue10, color: ROOM.blue }}
        >
          +${rp.pocket}
        </span>
      )}
      {rp.isTax && (
        <span
          className="shrink-0 rounded-[5px] px-1.5 py-0.5 font-mono text-[11px] font-bold"
          style={{ background: ROOM.muted10, color: ROOM.muted }}
        >
          tax
        </span>
      )}
      <span className="text-right" style={{ minWidth: 40 }}>
        <span className="block font-mono text-[16px] font-bold leading-none" style={{ color: ROOM.blue }}>
          ${rp.you}
        </span>
        <span className="mt-0.5 block whitespace-nowrap font-mono text-[9.5px]" style={{ color: ROOM.t3 }}>
          room {rp.room}
          {roomArrow}
        </span>
      </span>
    </div>
  )
}

/** A drafted player, dimmed and struck, holding his ranked slot as context. */
function DraftedRowLine({ row }: { row: DraftedRow }) {
  const pc = posColors(row.position)
  return (
    <div
      data-testid={row.mine ? 'vb-mine-row' : 'vb-gone-row'}
      className="grid items-center gap-2 border-t px-2 py-1.5"
      style={{ gridTemplateColumns: GRID, borderColor: ROOM.border, opacity: 0.55 }}
    >
      <span aria-hidden="true" />
      <span className="min-w-0">
        <div
          className="truncate font-headline text-[12px] font-semibold leading-tight"
          style={{ color: ROOM.t3, textDecoration: 'line-through' }}
        >
          {row.name}
        </div>
        <div className="font-mono text-[9px]" style={{ color: pc.color }}>
          {row.position}
          {row.team ? ` · ${row.team}` : ''}
        </div>
      </span>
      <span className="flex items-center justify-end gap-1.5 text-right">
        <span
          className="shrink-0 rounded-[4px] px-1.5 py-0.5 font-headline text-[8px] font-bold uppercase tracking-[0.5px]"
          style={row.mine ? { background: ROOM.blue10, color: ROOM.blue } : { background: ROOM.muted10, color: ROOM.muted }}
        >
          {row.mine ? 'mine' : 'gone'}
        </span>
        {row.price != null && (
          <span className="font-mono text-[11px] font-bold" style={{ color: ROOM.t3 }}>
            ${row.price}
          </span>
        )}
      </span>
      <span aria-hidden="true" />
    </div>
  )
}

export function InlinePlayersPanel({
  available,
  maxBidMap,
  repriced,
  drafted = [],
  isTarget,
  onToggleTarget,
  onSelectPlayer,
}: InlinePlayersPanelProps) {
  const [open, setOpen] = useState(true)
  const [posFilter, setPosFilter] = useState<PosFilter>('ALL')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(true)

  // Merge live + drafted into one ranked ladder so gone/mine players hold their
  // board slot instead of vanishing. Same search + position filter hits both.
  const merged = useMemo(() => {
    const items: BoardItem[] = []
    for (const sp of available) {
      items.push({ kind: 'live', sp, score: sp.combinedScore, name: sp.player.name, position: sp.player.position })
    }
    for (const row of drafted) {
      items.push({ kind: 'drafted', row, score: row.combinedScore, name: row.name, position: row.position })
    }
    const q = query.trim().toLowerCase()
    return items
      .filter(it => {
        if (posFilter !== 'ALL' && it.position !== posFilter) return false
        if (q && !it.name.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => b.score - a.score)
  }, [available, drafted, posFilter, query])

  // Default = the FULL ranked ladder, gone studs at the top included, so the
  // board opens on the true top of the room, not just Joe's live targets.
  // The compact view is an opt-in collapse: the top DEFAULT_ROWS LIVE targets
  // starting at Joe's best available player, gone/mine woven in between them.
  const compact = useMemo(() => {
    const firstLive = merged.findIndex(it => it.kind === 'live')
    if (firstLive === -1) return merged
    const out: BoardItem[] = []
    let live = 0
    for (let i = firstLive; i < merged.length; i++) {
      const it = merged[i]
      if (it.kind === 'live') {
        if (live >= DEFAULT_ROWS) break
        live++
      }
      out.push(it)
    }
    return out
  }, [merged])

  const rows = showAll ? merged : compact

  // Only LIVE rows carry a target rank (1, 2, 3...); drafted rows are context
  // and hold no actionable number.
  const withRank = useMemo(() => {
    const out: Array<{ it: BoardItem; rank: number | null }> = []
    let live = 0
    for (const it of rows) {
      if (it.kind === 'live') {
        live += 1
        out.push({ it, rank: live })
      } else {
        out.push({ it, rank: null })
      }
    }
    return out
  }, [rows])

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
            style={{ color: ROOM.blue }}
          >
            Value Board
          </span>
          <span className="font-mono text-[11px]" style={{ color: ROOM.t2 }}>
            you vs room · repriced live
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
            style={{ gridTemplateColumns: GRID, color: ROOM.t3 }}
          >
            <span>Rk</span>
            <span>Player</span>
            <span className="text-right">You · Room</span>
            <span className="text-center">Fav</span>
          </div>

          {/* Ranked ladder: live targets numbered, drafted players dimmed in place */}
          {withRank.map(({ it, rank }) => {
            if (it.kind === 'drafted') {
              return <DraftedRowLine key={it.row.id} row={it.row} />
            }
            const sp = it.sp
            const pc = posColors(sp.player.position)
            const rp = repriced.get(sp.player.id)
            const fallbackValue =
              maxBidMap.get(sp.player.name.toLowerCase()) ??
              (sp.player.consensusAuctionValue != null ? Math.round(sp.player.consensusAuctionValue) : null)
            const fav = isTarget(sp.player.id)

            return (
              <div
                key={sp.player.id}
                className="grid cursor-pointer items-center gap-2 border-t px-2 py-2 transition-colors"
                style={{
                  gridTemplateColumns: GRID,
                  borderColor: ROOM.border,
                  boxShadow: rp?.isPocket ? `inset 2.5px 0 0 ${ROOM.blue}` : undefined,
                }}
                onClick={() => onSelectPlayer(sp.player)}
              >
                <span className="font-mono text-[12px] font-semibold" style={{ color: rp?.isPocket ? ROOM.blue : ROOM.t3 }}>
                  {rank}
                </span>
                <span className="min-w-0">
                  <div
                    className="flex items-center gap-1.5 truncate font-headline text-[13.5px] font-semibold leading-tight"
                    style={{ color: ROOM.t1 }}
                  >
                    <span className="truncate">{sp.player.name}</span>
                    <InjuryFlag player={sp.player} />
                  </div>
                  <div className="font-mono text-[9.5px]" style={{ color: pc.color }}>
                    {sp.player.position} {sp.player.team ? `· ${sp.player.team}` : ''}
                  </div>
                </span>
                <ValueCluster rp={rp} fallbackValue={fallbackValue} />
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

          {/* Full board is the default; the toggle collapses to Joe's live targets */}
          {merged.length > compact.length && (
            <button
              onClick={() => setShowAll(v => !v)}
              className="mt-2 w-full rounded-lg py-2 text-[11px] font-bold uppercase tracking-wide"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${ROOM.border}`,
                color: ROOM.t2,
              }}
            >
              {showAll ? 'Show top targets' : 'Show full board'}
            </button>
          )}

          {merged.length === 0 && (
            <div className="py-4 text-center font-mono text-[11px]" style={{ color: ROOM.t3 }}>
              No players match
            </div>
          )}
        </div>
      )}
    </div>
  )
}
