'use client'

/**
 * Tier context (UXV2-6): per-position remaining tiers, tappable to filter the
 * block picker. Sits ABOVE the roster now (v4 reorder). Glance + one tap.
 */

import type { Position } from '@/lib/players/types'
import { ROOM, posColors } from './theme'

export interface TierRow {
  position: Position
  fillPct: number // 0-100, startable pool remaining
  t1: number
  t2: number
  t3: number
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
        color: low ? '#ef4444' : ROOM.t2,
        background: low ? ROOM.red10 : 'rgba(255,255,255,0.05)',
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
  onTapPosition: (pos: Position) => void
  onTapTier: (pos: Position, tier: 1 | 2 | 3) => void
}) {
  return (
    <div className="px-0.5">
      {rows.map((row, idx) => {
        const pc = posColors(row.position)
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
              className="flex h-[23px] w-[30px] shrink-0 items-center justify-center rounded text-[10px] font-bold transition-opacity hover:opacity-80"
              style={{ background: pc.bg, color: pc.color, border: '1px solid rgba(255,255,255,0.12)' }}
            >
              {row.position}
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
            <div className="flex flex-1 items-center gap-1.5">
              <TierChip label="T1" count={row.t1} low={row.t1 <= 1} onTap={() => onTapTier(row.position, 1)} />
              <TierChip label="T2" count={row.t2} low={row.t2 <= 1} onTap={() => onTapTier(row.position, 2)} />
              <TierChip label="T3" count={row.t3} low={false} onTap={() => onTapTier(row.position, 3)} />
            </div>
            {row.targets > 0 && (
              <div
                className="ml-auto flex shrink-0 items-center gap-1 text-[11px] font-semibold"
                style={{ color: ROOM.gold }}
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
