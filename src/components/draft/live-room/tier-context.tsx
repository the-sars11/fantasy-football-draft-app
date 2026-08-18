'use client'

/**
 * Tier context (UXV2-6, extended D6): per-position remaining tiers, tappable
 * to filter the block picker. Sits ABOVE the roster now (v4 reorder).
 *
 * D6 (R11 gap): extends T1-T3 to T1-T5 so the whole board's remaining depth
 * is visible, not just the top three tiers. T4/T5 are computed by the caller
 * from the raw available pool (explain.ts's shared scarcity type only carries
 * T1-T3, and that shared file is intentionally left untouched -- this is a
 * room-local display concern only).
 */

import type { Position } from '@/lib/players/types'
import { ROOM, posColors } from './theme'

export interface TierRow {
  position: Position | 'FLEX'
  fillPct: number // 0-100, startable pool remaining
  t1: number
  t2: number
  t3: number
  t4: number
  t5: number
  targets: number // user targets still available at this position
}

function TierChip({
  label,
  count,
  low,
  onTap,
}: {
  label: string
  count: number
  low: boolean
  onTap: () => void
}) {
  return (
    <button
      onClick={onTap}
      className="rounded font-mono text-[11px] transition-opacity hover:opacity-80"
      style={{
        padding: '3px 7px',
        color: low ? ROOM.amber : ROOM.t2,
        background: low ? ROOM.amber10 : 'rgba(255,255,255,0.05)',
        border: '1px solid transparent',
      }}
    >
      {label}:{count}
    </button>
  )
}

export function TierContext({
  rows,
  onTapPosition,
  onTapTier,
}: {
  rows: TierRow[]
  onTapPosition: (pos: Position | 'FLEX') => void
  onTapTier: (pos: Position | 'FLEX', tier: 1 | 2 | 3 | 4 | 5) => void
}) {
  return (
    <div className="px-0.5">
      {rows.map((row, idx) => {
        const pc = row.position === 'FLEX' ? { bg: 'rgba(255,255,255,0.05)', color: ROOM.t2 } : posColors(row.position)
        return (
          <div
            key={row.position}
            className="flex items-center gap-2 py-2"
            style={{
              borderBottom: idx === rows.length - 1 ? 'none' : `1px solid ${ROOM.border2}`,
            }}
          >
            <button
              onClick={() => onTapPosition(row.position)}
              className="flex h-[23px] w-[34px] shrink-0 items-center justify-center rounded text-[10px] font-bold transition-opacity hover:opacity-80"
              style={{ background: pc.bg, color: pc.color, border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {row.position === 'FLEX' ? 'FLX' : row.position}
            </button>
            <div className="w-9 shrink-0">
              <div
                className="h-[3px] overflow-hidden rounded-sm"
                style={{ background: 'rgba(255,255,255,0.07)' }}
              >
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${Math.max(0, Math.min(100, row.fillPct))}%`,
                    background: pc.color,
                    opacity: 0.65,
                  }}
                />
              </div>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-1.5">
              <TierChip label="T1" count={row.t1} low={row.t1 <= 1} onTap={() => onTapTier(row.position, 1)} />
              <TierChip label="T2" count={row.t2} low={row.t2 <= 1} onTap={() => onTapTier(row.position, 2)} />
              <TierChip label="T3" count={row.t3} low={false} onTap={() => onTapTier(row.position, 3)} />
              <TierChip label="T4" count={row.t4} low={false} onTap={() => onTapTier(row.position, 4)} />
              <TierChip label="T5" count={row.t5} low={false} onTap={() => onTapTier(row.position, 5)} />
            </div>
            {row.targets > 0 && (
              <div
                className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-semibold"
                style={{ color: ROOM.blue }}
              >
                <span className="text-[9.5px]">★</span>
                {row.targets}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
