'use client'

/**
 * On-the-Block hero (UXV2-6): the tallest, top-most thing on the Draft tab.
 * Answers "what do I do right now" with a color-coded move + a plain rationale.
 */

import type { Player } from '@/lib/players/types'
import type { WhatToDoAdvice } from '@/lib/draft/what-to-do'
import { ROOM, posColors, moveTheme } from './theme'

function WaitingCard({ onChangePlayer }: { onChangePlayer: () => void }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ background: ROOM.card, border: `1px solid ${ROOM.border}` }}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: ROOM.t3 }} />
      <div className="relative py-4 pl-[18px] pr-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-[8.5px] font-bold uppercase tracking-[2.5px]"
            style={{ color: ROOM.t3 }}
          >
            On the Block
          </span>
          <button
            onClick={onChangePlayer}
            className="rounded px-2 py-1 text-[9.5px] font-bold tracking-wide transition-opacity hover:opacity-80"
            style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.border}`, color: ROOM.t2 }}
          >
            Set player
          </button>
        </div>
        <div className="font-headline text-[20px] leading-none" style={{ color: ROOM.t3 }}>
          Waiting for the next nomination
        </div>
        <div className="mt-2 text-[12px]" style={{ color: ROOM.t3 }}>
          Tap Set player when the auctioneer calls someone.
        </div>
      </div>
    </div>
  )
}

export function OnTheBlockCard({
  player,
  advice,
  onChangePlayer,
}: {
  player: Player | null
  advice: WhatToDoAdvice | null
  onChangePlayer: () => void
}) {
  if (!player || !advice) {
    return <WaitingCard onChangePlayer={onChangePlayer} />
  }

  const pos = posColors(player.position)
  const move = moveTheme(advice.moveColor)
  const rangeText =
    advice.range != null ? `$${advice.range.low}-$${advice.range.high}` : 'no read'

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ background: ROOM.card, border: `1px solid ${ROOM.border}` }}
    >
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: pos.color }} />
      <div className="relative py-3 pl-[18px] pr-3.5">
        {/* eyebrow */}
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-[8.5px] font-bold uppercase tracking-[2.5px]"
            style={{ color: ROOM.t3 }}
          >
            On the Block
          </span>
          <button
            onClick={onChangePlayer}
            className="rounded px-2 py-1 text-[9.5px] font-bold tracking-wide transition-opacity hover:opacity-80"
            style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.border}`, color: ROOM.t2 }}
          >
            Change player
          </button>
        </div>

        {/* row 1: badge, name, meta */}
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span
            className="shrink-0 rounded px-1.5 py-1 text-[10px] font-bold tracking-wide"
            style={{ background: pos.bg, color: pos.color }}
          >
            {player.position}
          </span>
          <span className="font-headline text-[22px] leading-none" style={{ color: ROOM.t1 }}>
            {player.name}
          </span>
          <span
            className="ml-auto shrink-0 font-mono text-[11px]"
            style={{ color: ROOM.t3 }}
          >
            {player.team}
            {player.byeWeek ? ` · Bye ${player.byeWeek}` : ''}
          </span>
        </div>

        {/* row 2: tier, tag, scarcity */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded px-2 py-1 text-[10px] font-bold tracking-wide"
            style={{ background: 'rgba(255,255,255,0.08)', color: ROOM.t1 }}
          >
            {advice.tierLabel}
          </span>
          {advice.isTarget && (
            <span
              className="rounded px-2 py-1 text-[10px] font-bold"
              style={{ background: ROOM.gold10, border: `1px solid ${ROOM.gold25}`, color: ROOM.gold }}
            >
              ★ TARGET
            </span>
          )}
          {advice.isAvoid && (
            <span
              className="rounded px-2 py-1 text-[10px] font-bold"
              style={{ background: ROOM.red10, border: `1px solid ${ROOM.red25}`, color: ROOM.red }}
            >
              AVOID
            </span>
          )}
          {advice.scarcityNote && (
            <span className="ml-auto text-[11px]" style={{ color: ROOM.t2 }}>
              {advice.scarcityNote}
            </span>
          )}
        </div>

        {/* range row */}
        <div
          className="mb-2.5 flex items-center gap-2 rounded-lg px-3 py-1.5"
          style={{ background: ROOM.volt10, border: `1px solid ${ROOM.volt20}` }}
        >
          <span
            className="text-[8.5px] font-bold uppercase tracking-[2px]"
            style={{ color: 'rgba(212,255,0,0.5)' }}
          >
            Your range
          </span>
          <span className="font-headline text-[20px]" style={{ color: ROOM.volt }}>
            {rangeText}
          </span>
          {advice.marketEst != null && (
            <span className="ml-auto text-[11px]" style={{ color: ROOM.volt45 }}>
              mkt ≈ ${advice.marketEst}
            </span>
          )}
        </div>

        {/* What To Do */}
        <div
          className="rounded-[10px] px-3 py-2.5"
          style={{ background: move.bg, border: `1px solid ${move.border}` }}
        >
          <div className="mb-1.5 flex items-center gap-2.5">
            <span
              className="text-[8.5px] font-bold uppercase tracking-[2.5px]"
              style={{ color: ROOM.t3 }}
            >
              What to do
            </span>
            <span className="font-headline text-[15px] tracking-wide" style={{ color: move.color }}>
              {advice.move}
            </span>
            <span
              className="ml-auto font-mono text-[12px] font-semibold"
              style={{ color: move.color }}
            >
              {advice.cap}
            </span>
          </div>
          <div className="text-[12.5px] leading-relaxed" style={{ color: ROOM.t1 }}>
            {advice.rationale}
          </div>
        </div>
      </div>
    </div>
  )
}
