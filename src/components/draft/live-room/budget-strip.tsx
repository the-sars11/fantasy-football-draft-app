'use client'

/**
 * Budget strip (UXV2-6, D6 restyle): three glance stats -- Remaining, Max bid,
 * Slots -- plus a spent-vs-remaining bar. D6 replaces the old red-to-green
 * bar (read as "danger" the closer you got to $0) with a calm steel-blue
 * remaining segment and a muted spent segment. There is no bad color here;
 * spending your budget is the point of the draft.
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
  leagueBudget = 200,
  maxBid,
  filledSlots,
  totalSlots,
}: {
  remaining: number | null
  /** League starting budget, used to size the spent-vs-remaining bar. */
  leagueBudget?: number
  maxBid: number | null
  filledSlots: number
  totalSlots: number
}) {
  const divider = (
    <div className="h-7 w-px shrink-0" style={{ background: ROOM.border }} />
  )
  const remainingPct =
    remaining != null && leagueBudget > 0
      ? Math.max(0, Math.min(100, (remaining / leagueBudget) * 100))
      : null

  return (
    <div
      className="rounded-[10px] px-3 py-2.5"
      style={{ background: ROOM.card, border: `1px solid ${ROOM.border}` }}
    >
      <div className="flex items-center gap-2">
        <Stat value={remaining != null ? `$${remaining}` : '--'} label="Remaining" />
        {divider}
        <Stat value={maxBid != null ? `$${maxBid}` : '--'} label="Max bid" />
        {divider}
        <Stat value={`${filledSlots}/${totalSlots}`} label="Slots" small />
      </div>
      {remainingPct != null && (
        <div
          className="mt-2.5 h-[5px] overflow-hidden rounded-full"
          style={{ background: ROOM.muted25 }}
          role="progressbar"
          aria-label="Budget remaining"
          aria-valuenow={Math.round(remainingPct)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${remainingPct}%`, background: ROOM.blue }}
          />
        </div>
      )}
    </div>
  )
}
