'use client'

/**
 * Budget strip (UXV2-6): three glance stats — Remaining, Max bid, Slots.
 * Max bid is the true single-item ceiling from getMaxBidFor (leaves $1 per
 * empty slot), which is the actionable "how high can I go right now" number.
 */

import { ROOM } from './theme'

function Stat({
  value,
  label,
  small,
}: {
  value: string
  label: string
  small?: boolean
}) {
  return (
    <div className="flex flex-1 flex-col items-center">
      <div
        className="font-mono font-bold tabular-nums"
        style={{ color: ROOM.t1, fontSize: small ? 17 : 19 }}
      >
        {value}
      </div>
      <div
        className="text-[8.5px] font-bold uppercase tracking-[2px]"
        style={{ color: ROOM.t3 }}
      >
        {label}
      </div>
    </div>
  )
}

export function BudgetStrip({
  remaining,
  maxBid,
  filledSlots,
  totalSlots,
}: {
  remaining: number | null
  maxBid: number | null
  filledSlots: number
  totalSlots: number
}) {
  const divider = (
    <div className="h-7 w-px shrink-0" style={{ background: ROOM.border }} />
  )
  return (
    <div
      className="flex items-center gap-2 rounded-[10px] px-3 py-2.5"
      style={{ background: ROOM.card, border: `1px solid ${ROOM.border}` }}
    >
      <Stat value={remaining != null ? `$${remaining}` : '--'} label="Remaining" />
      {divider}
      <Stat value={maxBid != null ? `$${maxBid}` : '--'} label="Max bid" />
      {divider}
      <Stat value={`${filledSlots}/${totalSlots}`} label="Slots" small />
    </div>
  )
}
