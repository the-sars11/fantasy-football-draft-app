'use client'

/**
 * My Team roster (UXV2-6, D6 extended): compact two-column, glance only, at
 * the BOTTOM. Fills the league's starter slots from my picks, overflow to
 * bench.
 *
 * D6 (R11 gap): open slots now show a solver-fit target-at-price (reusing
 * assignTargetPrices via room-target-pricing.ts) instead of a plain "open"
 * -- this is what replaces the old top-of-room "Next Target" banner. Tapping
 * an open slot expands it to the top-3 still-available alternates for that
 * slot, driven by the active strategy's own ranking (combinedScore).
 */

import { useMemo, useState } from 'react'
import type { RosterSlots } from '@/lib/supabase/database.types'
import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import { computeOpenSlotTargets, type SlotTarget } from '@/lib/draft/room-target-pricing'
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
  /** D6: solver-fit target price + name for this open slot, null when filled or unpriced. */
  target: SlotTarget | null
}

const FLEX_POSITIONS = new Set(['RB', 'WR', 'TE'])
const LABEL_TO_MATCH: Record<string, (pos: Position) => boolean> = {
  QB: pos => pos === 'QB',
  RB: pos => pos === 'RB',
  WR: pos => pos === 'WR',
  TE: pos => pos === 'TE',
  FLX: pos => FLEX_POSITIONS.has(pos),
  DEF: pos => pos === 'DEF',
  K: pos => pos === 'K',
}

/**
 * Assign my picks into the league's starter slots, in a stable priority order,
 * pushing anything that does not fit into the bench summary. D6 also claims
 * one solver-fit target per still-open slot, in the same fill order, so
 * targets line up 1:1 with the open slots shown.
 */
export function buildSlotRows(
  picks: RosterPick[],
  roster: RosterSlots,
  openTargets: SlotTarget[] = [],
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

  let nextTarget = 0
  const claimTarget = (label: string): SlotTarget | null => {
    if (nextTarget >= openTargets.length) return null
    const want = label === 'FLX' ? 'FLEX' : label
    if (openTargets[nextTarget].position === want) {
      return openTargets[nextTarget++]
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
        target: pick ? null : claimTarget(label),
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

function AlternateRow({ sp, onPick }: { sp: ScoredPlayer; onPick?: (p: Player) => void }) {
  const pc = posColors(sp.player.position)
  return (
    <button
      onClick={() => onPick?.(sp.player)}
      disabled={!onPick}
      className="flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05] disabled:pointer-events-none"
    >
      <div
        className="flex h-[17px] w-[24px] shrink-0 items-center justify-center rounded text-[8px] font-bold"
        style={{ background: pc.bg, color: pc.color }}
      >
        {sp.player.position}
      </div>
      <span className="min-w-0 flex-1 truncate text-[11.5px]" style={{ color: ROOM.t2 }}>
        {sp.player.name}
      </span>
      <span className="shrink-0 font-mono text-[10.5px]" style={{ color: ROOM.t3 }}>
        ${Math.max(1, Math.round(sp.player.consensusAuctionValue ?? 1))}
      </span>
    </button>
  )
}

function RosterRow({
  row,
  expanded,
  alternates,
  onToggle,
  onPickAlternate,
}: {
  row: SlotRow
  expanded: boolean
  alternates: ScoredPlayer[]
  onToggle?: () => void
  onPickAlternate?: (p: Player) => void
}) {
  const isFlexLabel = row.label === 'FLX' || row.label === 'BN'
  const pc = posColors(row.posForColor)
  const badgeStyle = isFlexLabel
    ? { background: 'rgba(255,255,255,0.05)', color: ROOM.t3 }
    : { background: pc.bg, color: pc.color }
  const openWithTarget = row.name === null && row.target != null
  const canExpand = row.name === null && !!onToggle

  return (
    <div style={{ borderBottom: `1px solid ${ROOM.border2}` }}>
      <button
        onClick={canExpand ? onToggle : undefined}
        disabled={!canExpand}
        className="flex w-full items-center gap-2 py-1.5 text-left disabled:pointer-events-none"
      >
        <div
          className="flex h-[18px] w-[26px] shrink-0 items-center justify-center rounded text-[8.5px] font-bold"
          style={badgeStyle}
        >
          {row.label}
        </div>
        <div
          className="flex-1 truncate text-[12px] font-medium"
          style={row.name ? { color: ROOM.t1 } : { color: openWithTarget ? ROOM.blue : ROOM.t3, fontStyle: row.name ? 'normal' : 'italic' }}
        >
          {row.name ?? (openWithTarget ? row.target!.name : 'open')}
        </div>
        <div
          className="font-mono text-[11px] tabular-nums"
          style={{ color: row.price != null ? ROOM.t2 : openWithTarget ? ROOM.blue : ROOM.t3 }}
        >
          {row.price != null ? `$${row.price}` : openWithTarget ? `~$${row.target!.price}` : '-'}
        </div>
        {canExpand && (
          <span className="shrink-0 text-[9px]" style={{ color: ROOM.t3 }} aria-hidden="true">
            {expanded ? '▴' : '▾'}
          </span>
        )}
      </button>
      {expanded && (
        <div className="pb-1.5 pl-[30px]">
          {alternates.length === 0 ? (
            <div className="py-1 text-[10.5px]" style={{ color: ROOM.t3 }}>
              No alternates left on the board.
            </div>
          ) : (
            alternates.map(sp => <AlternateRow key={sp.player.id} sp={sp} onPick={onPickAlternate} />)
          )}
        </div>
      )}
    </div>
  )
}

export function MyTeamRoster({
  picks,
  roster,
  activeStrategy,
  available,
  budgetRemaining,
  onSelectPlayer,
}: {
  picks: RosterPick[]
  roster: RosterSlots
  /** D6: strategy driving per-slot target-at-price + alternates ranking. */
  activeStrategy?: { player_targets: { player_id: string; player_name: string; weight: number }[]; budget_allocation?: Record<string, number> | null; max_bid_percentage?: number | null } | null
  /** D6: undrafted pool, used for target pricing and the expand-to-alternates list. */
  available?: ScoredPlayer[]
  /** D6: my remaining budget, the ceiling the solver-fit prices must fit within. */
  budgetRemaining?: number | null
  /** D6: tapping an alternate sets it on the block, same as the block picker. */
  onSelectPlayer?: (p: Player) => void
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const openTargets = useMemo(() => {
    if (!activeStrategy || !available) return []
    return computeOpenSlotTargets({
      activeStrategy,
      available,
      myPicks: picks,
      rosterSlots: roster,
      budgetRemaining: budgetRemaining ?? null,
    }).bySlot
  }, [activeStrategy, available, picks, roster, budgetRemaining])

  const { starters, benchFilled, benchTotal } = useMemo(
    () => buildSlotRows(picks, roster, openTargets),
    [picks, roster, openTargets],
  )

  const alternatesFor = (row: SlotRow): ScoredPlayer[] => {
    if (!available) return []
    const match = LABEL_TO_MATCH[row.label]
    if (!match) return []
    return [...available]
      .filter(sp => match(sp.player.position))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 3)
  }

  return (
    <div className="grid grid-cols-2 gap-x-3.5">
      {starters.map((row, i) => (
        <RosterRow
          key={i}
          row={row}
          expanded={expandedIdx === i}
          alternates={expandedIdx === i ? alternatesFor(row) : []}
          onToggle={row.name === null ? () => setExpandedIdx(v => (v === i ? null : i)) : undefined}
          onPickAlternate={onSelectPlayer}
        />
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
