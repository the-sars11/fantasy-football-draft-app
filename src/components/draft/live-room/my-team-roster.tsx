'use client'

/**
 * My Team roster (UXV2-6): compact two-column, glance only, at the BOTTOM.
 * Fills the league's starter slots from my picks, overflow to bench.
 */

import type { RosterSlots } from '@/lib/supabase/database.types'
import { ROOM, posColors } from './theme'

interface RosterPick {
  player_name: string
  position?: string
  price?: number
}

interface SlotRow {
  label: string // slot label shown in the badge (QB, RB, WR, TE, FLX, DEF, K, BN)
  posForColor: string // which position color to use for the badge
  name: string | null
  price: number | null
}

const FLEX_POSITIONS = new Set(['RB', 'WR', 'TE'])

/**
 * Assign my picks into the league's starter slots, in a stable priority order,
 * pushing anything that does not fit into the bench summary.
 */
export function buildSlotRows(
  picks: RosterPick[],
  roster: RosterSlots,
): { starters: SlotRow[]; benchFilled: number; benchTotal: number } {
  const pool = picks.map(p => ({
    name: p.player_name,
    pos: (p.position ?? '').toUpperCase(),
    price: p.price ?? null,
    used: false,
  }))

  const take = (match: (pos: string) => boolean): (typeof pool)[number] | null => {
    const found = pool.find(p => !p.used && match(p.pos))
    if (found) {
      found.used = true
      return found
    }
    return null
  }

  const starters: SlotRow[] = []
  const addSlots = (
    count: number,
    label: string,
    posForColor: string,
    match: (pos: string) => boolean,
  ) => {
    for (let i = 0; i < count; i++) {
      const pick = take(match)
      starters.push({
        label,
        posForColor,
        name: pick ? pick.name : null,
        price: pick ? pick.price : null,
      })
    }
  }

  addSlots(roster.qb ?? 0, 'QB', 'QB', pos => pos === 'QB')
  addSlots(roster.rb ?? 0, 'RB', 'RB', pos => pos === 'RB')
  addSlots(roster.wr ?? 0, 'WR', 'WR', pos => pos === 'WR')
  addSlots(roster.te ?? 0, 'TE', 'TE', pos => pos === 'TE')
  addSlots(roster.flex ?? 0, 'FLX', 'FLEX', pos => FLEX_POSITIONS.has(pos))
  addSlots(roster.dst ?? 0, 'DEF', 'DEF', pos => pos === 'DEF' || pos === 'DST')
  addSlots(roster.k ?? 0, 'K', 'K', pos => pos === 'K')

  const benchTotal = (roster.bench ?? 0) + (roster.ir ?? 0)
  const benchFilled = pool.filter(p => !p.used).length

  return { starters, benchFilled, benchTotal }
}

function RosterRow({ row }: { row: SlotRow }) {
  const isFlexLabel = row.label === 'FLX' || row.label === 'BN'
  const pc = posColors(row.posForColor)
  const badgeStyle = isFlexLabel
    ? { background: 'rgba(255,255,255,0.05)', color: ROOM.t3 }
    : { background: pc.bg, color: pc.color }
  return (
    <div
      className="flex items-center gap-2 py-1.5"
      style={{ borderBottom: `1px solid ${ROOM.border2}` }}
    >
      <div
        className="flex h-[18px] w-[26px] shrink-0 items-center justify-center rounded text-[8.5px] font-bold"
        style={badgeStyle}
      >
        {row.label}
      </div>
      <div
        className="flex-1 truncate text-[12px] font-medium"
        style={row.name ? { color: ROOM.t1 } : { color: ROOM.t3, fontStyle: 'italic' }}
      >
        {row.name ?? 'open'}
      </div>
      <div className="font-mono text-[11px] tabular-nums" style={{ color: row.price != null ? ROOM.t2 : ROOM.t3 }}>
        {row.price != null ? `$${row.price}` : '-'}
      </div>
    </div>
  )
}

export function MyTeamRoster({
  picks,
  roster,
}: {
  picks: RosterPick[]
  roster: RosterSlots
}) {
  const { starters, benchFilled, benchTotal } = buildSlotRows(picks, roster)

  return (
    <div className="grid grid-cols-2 gap-x-3.5">
      {starters.map((row, i) => (
        <RosterRow key={i} row={row} />
      ))}
      {benchTotal > 0 && (
        <div
          className="flex items-center gap-2 py-1.5"
          style={{ borderBottom: `1px solid ${ROOM.border2}` }}
        >
          <div
            className="flex h-[18px] w-[26px] shrink-0 items-center justify-center rounded text-[8px] font-bold"
            style={{ background: 'rgba(255,255,255,0.04)', color: ROOM.t3 }}
          >
            BN
          </div>
          <div className="flex-1 truncate text-[11px]" style={{ color: ROOM.t3, fontStyle: 'italic' }}>
            bench {benchFilled}/{benchTotal}
          </div>
          <div className="font-mono text-[11px]" style={{ color: ROOM.t3 }}>
            -
          </div>
        </div>
      )}
    </div>
  )
}
