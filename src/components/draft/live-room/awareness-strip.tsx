'use client'

/**
 * Awareness strip (UXV2-6): the "what's next" horizontal scroller.
 * Each item is a bold headline plus a dim follow-up hint.
 */

import { ROOM } from './theme'

export interface AwarenessItem {
  strong: string
  dim?: string
}

export function AwarenessStrip({ items }: { items: AwarenessItem[] }) {
  if (items.length === 0) return null
  return (
    <div
      className="flex items-center gap-2 overflow-hidden rounded-lg px-2.5 py-1.5"
      style={{ background: ROOM.gold10, border: `1px solid ${ROOM.gold25}` }}
    >
      <span className="text-[12px]" aria-hidden="true">
        ⚡
      </span>
      <div className="flex gap-4 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => (
          <span key={i} className="shrink-0 text-[11.5px]" style={{ color: ROOM.gold }}>
            <strong className="font-bold">{item.strong}</strong>
            {item.dim && (
              <span style={{ color: ROOM.gold55 }}> {item.dim}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
