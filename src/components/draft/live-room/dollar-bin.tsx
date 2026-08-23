'use client'

/**
 * Dollar Bin Watch (LB-3) - Joe's plan for when prices collapse to $1.
 *
 * Two groups, one shared star (the existing target state, no new "watch" concept):
 *   - Starred (blue star, pinned on top): his watchlist, held here so it surfaces
 *     the moment the draft hits the $1 tier.
 *   - Darts (hollow star, below the line): the model's $1-to-$3 shots that actually
 *     project to beat that tag - a flagged sleeper, positive VORP, or real upside.
 *
 * Presentational only. All selection lives in src/lib/draft/dollar-bin.ts. Clicking
 * a star toggles the same target state the Value Board uses, so Joe can pin a dart
 * or drop a stale watch from right here.
 *
 * Copy rule (Joe): plain English, no jargon, NO em/en dashes anywhere.
 */

import type { DollarBin, DollarBinRow } from '@/lib/draft/dollar-bin'
import { ROOM, posColors } from './theme'

export interface DollarBinPanelProps {
  bin: DollarBin
  onToggleTarget: (id: string) => void
  onSelectPlayer?: (id: string) => void
}

/** Price like "$1 to $3" with the "to $3" tail set smaller, per the approved mockup. */
function Price({ label }: { label: string }) {
  const [head, ...tail] = label.split(' ')
  return (
    <span className="shrink-0 text-right font-mono text-[12.5px] font-bold" style={{ color: ROOM.blue }}>
      {head}
      {tail.length > 0 && (
        <span className="font-mono text-[9.5px] font-semibold" style={{ color: ROOM.t3 }}>
          {' '}
          {tail.join(' ')}
        </span>
      )}
    </span>
  )
}

function BinRow({
  row,
  onToggleTarget,
  onSelectPlayer,
}: {
  row: DollarBinRow
  onToggleTarget: (id: string) => void
  onSelectPlayer?: (id: string) => void
}) {
  const pc = posColors(row.position)
  return (
    <div
      className="grid cursor-pointer items-center gap-2 py-1.5"
      style={{ gridTemplateColumns: '22px 1fr auto' }}
      onClick={() => onSelectPlayer?.(row.id)}
      data-testid={`bin-row-${row.id}`}
    >
      <button
        onClick={e => {
          e.stopPropagation()
          onToggleTarget(row.id)
        }}
        className="flex items-center justify-center text-[13px] transition-transform active:scale-95"
        style={{ color: row.starred ? ROOM.blue : ROOM.t3 }}
        aria-pressed={row.starred}
        aria-label={row.starred ? `Unpin ${row.name} from the dollar bin` : `Pin ${row.name} to the dollar bin`}
      >
        {row.starred ? '★' : '☆'}
      </button>
      <span className="min-w-0">
        <div className="truncate font-headline text-[13px] font-semibold leading-tight" style={{ color: ROOM.t1 }}>
          {row.name}
        </div>
        <div className="flex items-center gap-1 truncate font-mono text-[9.5px]" style={{ color: ROOM.t3 }}>
          {row.posRank && <span style={{ color: pc.color }}>{row.posRank}</span>}
          {row.signals.map((s, i) => (
            <span key={i}>
              {(row.posRank || i > 0) && <span style={{ color: ROOM.t3 }}> · </span>}
              {s}
            </span>
          ))}
        </div>
      </span>
      <Price label={row.priceLabel} />
    </div>
  )
}

export function DollarBinPanel({ bin, onToggleTarget, onSelectPlayer }: DollarBinPanelProps) {
  const { starred, darts } = bin
  const empty = starred.length === 0 && darts.length === 0

  return (
    <div
      style={{
        marginTop: 11,
        border: `1px solid ${ROOM.border}`,
        borderRadius: 12,
        background: ROOM.surface,
        overflow: 'hidden',
      }}
      data-testid="dollar-bin"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <span
            className="font-headline text-[12px] font-semibold uppercase tracking-[1.4px]"
            style={{ color: ROOM.blue }}
          >
            Dollar Bin Watch
          </span>
          <span className="font-mono text-[11px]" style={{ color: ROOM.t2 }}>
            for when prices collapse
          </span>
        </div>
      </div>

      <div className="px-3 pb-3">
        {empty && (
          <div className="py-4 text-center font-mono text-[11px]" style={{ color: ROOM.t3 }}>
            Star anyone to pin them here. The model fills in $1 to $3 darts as the board thins.
          </div>
        )}

        {/* Starred watchlist - pinned on top */}
        {starred.length > 0 && (
          <div>
            {starred.map(row => (
              <BinRow key={row.id} row={row} onToggleTarget={onToggleTarget} onSelectPlayer={onSelectPlayer} />
            ))}
          </div>
        )}

        {/* Divider between the watchlist and the model's darts */}
        {starred.length > 0 && darts.length > 0 && (
          <div className="my-2 flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: ROOM.border }} />
            <span
              className="font-headline text-[8.5px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: ROOM.t3 }}
            >
              model darts
            </span>
            <div className="h-px flex-1" style={{ background: ROOM.border }} />
          </div>
        )}

        {/* Model darts - below the line */}
        {darts.length > 0 && (
          <div>
            {darts.map(row => (
              <BinRow key={row.id} row={row} onToggleTarget={onToggleTarget} onSelectPlayer={onSelectPlayer} />
            ))}
          </div>
        )}

        {!empty && (
          <div
            className="mt-2 rounded-[8px] px-2.5 py-2 font-mono text-[9.5px] leading-relaxed"
            style={{ background: 'rgba(5,7,12,0.4)', border: `1px solid ${ROOM.border}`, color: ROOM.t3 }}
          >
            <span style={{ color: ROOM.blue }}>Starred</span> = your watchlist, pinned so they surface the moment the
            draft hits the $1 bin. Below the line = the model&apos;s darts more likely to beat a $1 to $3 tag (sleeper
            or positive VORP), not random filler.
          </div>
        )}
      </div>
    </div>
  )
}
