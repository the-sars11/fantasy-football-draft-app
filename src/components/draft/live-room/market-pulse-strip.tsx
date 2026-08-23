'use client'

/**
 * MarketPulseStrip (LB-2) -- the live read on what the room is actually paying,
 * per position, from the auctioneer feed. Replaces the old locked strategy
 * banner: instead of "here is your plan", it shows "here is what the room is
 * doing right now, so push your dollars here."
 *
 * Pure presentation over computeMarketInflation(): a chip per skill position
 * showing how far its live clearing price has moved off baseline (hot = the
 * room is overpaying, soft = it is letting the position go cheap), plus one
 * plain-English read that names the hottest and softest positions.
 *
 * Copy rule (Joe): plain English, no jargon, NO em/en dashes anywhere.
 */

import type { Position } from '@/lib/players/types'
import type { PositionInflation } from '@/lib/draft/market-inflation'
import { ROOM } from './theme'

/** Positions worth showing a pulse chip for (skill positions Joe spends on). */
const PULSE_POSITIONS: Position[] = ['RB', 'WR', 'TE', 'QB']

/** A move of at least this fraction off baseline reads as hot / soft, not flat. */
const HOT_THRESHOLD = 0.08

type Tone = 'hot' | 'soft' | 'flat'

interface PulseChip {
  position: Position
  pct: number
  tone: Tone
  hasSales: boolean
}

function toneOf(multiplier: number, hasSales: boolean): Tone {
  if (!hasSales) return 'flat'
  if (multiplier >= 1 + HOT_THRESHOLD) return 'hot'
  if (multiplier <= 1 - HOT_THRESHOLD) return 'soft'
  return 'flat'
}

const TONE_STYLE: Record<Tone, { bg: string; border: string; color: string }> = {
  hot: { bg: ROOM.amber10, border: ROOM.amber25, color: ROOM.amber },
  soft: { bg: ROOM.blue10, border: ROOM.blue20, color: ROOM.blue },
  flat: { bg: ROOM.muted10, border: ROOM.muted25, color: ROOM.muted },
}

export interface MarketPulseStripProps {
  inflation: Record<Position, PositionInflation>
}

export function MarketPulseStrip({ inflation }: MarketPulseStripProps) {
  const chips: PulseChip[] = PULSE_POSITIONS.map(pos => {
    const inf = inflation[pos]
    const hasSales = (inf?.soldCount ?? 0) > 0
    const mult = inf?.multiplier ?? 1
    return {
      position: pos,
      pct: Math.round((mult - 1) * 100),
      tone: toneOf(mult, hasSales),
      hasSales,
    }
  })

  const anySales = chips.some(c => c.hasSales)
  const hottest = chips.filter(c => c.tone === 'hot').sort((a, b) => b.pct - a.pct)[0]
  const softest = chips.filter(c => c.tone === 'soft').sort((a, b) => a.pct - b.pct)[0]

  return (
    <div
      className="rounded-[13px]"
      style={{ background: ROOM.card, border: `1px solid ${ROOM.border}`, padding: '11px 12px 12px' }}
      data-testid="market-pulse"
    >
      <div className="mb-2.5 flex flex-wrap gap-1.5">
        {chips.map(c => {
          const s = TONE_STYLE[c.tone]
          const label =
            !c.hasSales ? 'quiet' : c.tone === 'flat' ? 'flat' : `${c.pct > 0 ? '+' : ''}${c.pct}%`
          const arrow = c.tone === 'hot' ? ' ▲' : c.tone === 'soft' ? ' ▼' : ''
          return (
            <span
              key={c.position}
              className="flex items-center gap-1.5 rounded-lg font-mono text-[12px] font-bold"
              style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color, padding: '5px 8px 4px' }}
              data-testid={`pulse-${c.position}`}
            >
              <b className="font-headline text-[11px] font-bold tracking-[0.5px]">{c.position}</b>
              {label}
              {arrow}
            </span>
          )
        })}
      </div>
      <div className="text-[12px] leading-relaxed" style={{ color: ROOM.t2 }}>
        <PulseRead anySales={anySales} hottest={hottest} softest={softest} />
      </div>
    </div>
  )
}

function PulseRead({
  anySales,
  hottest,
  softest,
}: {
  anySales: boolean
  hottest?: PulseChip
  softest?: PulseChip
}) {
  if (!anySales) {
    return <>Nothing has cleared yet. The board is priced to your baseline until the room starts spending.</>
  }
  const strong = (t: string) => <b style={{ color: ROOM.t1, fontWeight: 600 }}>{t}</b>
  const up = (t: string) => <span style={{ color: ROOM.blue, fontWeight: 600 }}>{t}</span>

  if (hottest && softest) {
    return (
      <>
        The room is {strong(`overpaying ${hottest.position}`)} and letting {strong(`${softest.position} go cheap`)}.{' '}
        {up(`Push your dollars to ${softest.position} value now`)} - every {hottest.position} target below is repriced up,
        every {softest.position} down.
      </>
    )
  }
  if (hottest) {
    return (
      <>
        The room is {strong(`overpaying ${hottest.position}`)}. Every {hottest.position} target below is repriced up -{' '}
        {up('let the room win those and hunt value elsewhere')}.
      </>
    )
  }
  if (softest) {
    return (
      <>
        The room is letting {strong(`${softest.position} go cheap`)}.{' '}
        {up(`Push your dollars to ${softest.position} value now`)} - every {softest.position} target below is repriced down.
      </>
    )
  }
  return <>The room is pricing to form so far. No position is running hot or cheap yet.</>
}
