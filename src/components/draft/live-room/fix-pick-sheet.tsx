'use client'

/**
 * FixPickSheet (finding 12 Stage B): correct or remove any recorded sale.
 *
 * In an in-person auction the app records every team's sale, so a mis-entry can
 * land on any manager. This sheet lists all recorded picks (newest first); tap
 * one to edit its player, winning team, or price, or remove it entirely. Edits
 * flow through the hook's editPick / removePick, which rebuild the whole draft
 * from scratch so budgets, roster counts, and the snake turn stay consistent.
 *
 * Logic lives in use-draft-state (Stage A, tested). This is presentation only.
 */

import { useMemo, useState } from 'react'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftPick } from '@/lib/draft/state'
import type { DraftFormat } from '@/lib/supabase/database.types'
import { ROOM, posColors } from './theme'

interface EditChanges {
  player_name?: string
  position?: string
  manager?: string
  price?: number
}

function PickRow({
  pick,
  onOpen,
}: {
  pick: DraftPick
  onOpen: (pickNumber: number) => void
}) {
  const pc = posColors(pick.position ?? '')
  return (
    <button
      onClick={() => onOpen(pick.pick_number)}
      className="flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-[11px] text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
    >
      <span className="w-[22px] shrink-0 text-right font-mono text-[10px]" style={{ color: ROOM.t3 }}>
        {pick.pick_number}
      </span>
      <div
        className="flex h-[23px] w-[32px] shrink-0 items-center justify-center rounded text-[10px] font-bold"
        style={{ background: pc.bg, color: pc.color }}
      >
        {pick.position ?? '?'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-semibold" style={{ color: ROOM.t1 }}>
          {pick.player_name}
        </div>
        <div className="mt-0.5 truncate text-[11px]" style={{ color: ROOM.t3 }}>
          won by {pick.manager}
        </div>
      </div>
      {pick.provisional && (
        <span
          className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[1px]"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}
        >
          UNCONFIRMED
        </span>
      )}
      {pick.price !== undefined && (
        <span className="shrink-0 font-mono text-[14px] font-bold" style={{ color: ROOM.blue }}>
          ${pick.price}
        </span>
      )}
      <span className="shrink-0" style={{ color: ROOM.t3 }} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </span>
    </button>
  )
}

function EditCard({
  pick,
  managerNames,
  format,
  available,
  onSave,
  onRemove,
  onCancel,
}: {
  pick: DraftPick
  managerNames: string[]
  format: DraftFormat
  available: ScoredPlayer[]
  onSave: (pickNumber: number, changes: EditChanges) => void
  onRemove: (pickNumber: number) => void
  onCancel: () => void
}) {
  const [playerName, setPlayerName] = useState(pick.player_name)
  const [position, setPosition] = useState(pick.position ?? '')
  const [manager, setManager] = useState(pick.manager)
  const [price, setPrice] = useState(pick.price !== undefined ? String(pick.price) : '')
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length === 0) return [] as Player[]
    return available
      .filter(sp => sp.player.name.toLowerCase().includes(q))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 20)
      .map(sp => sp.player)
  }, [available, query])

  const pc = posColors(position)

  const handleSave = () => {
    const changes: EditChanges = {}
    if (playerName !== pick.player_name) changes.player_name = playerName
    if (position !== (pick.position ?? '')) changes.position = position
    if (manager !== pick.manager) changes.manager = manager
    if (format === 'auction') {
      const parsed = parseInt(price, 10)
      if (Number.isFinite(parsed) && parsed >= 0 && parsed !== pick.price) {
        changes.price = parsed
      }
    }
    onSave(pick.pick_number, changes)
  }

  const pickPlayer = (p: Player) => {
    setPlayerName(p.name)
    setPosition(p.position)
    setQuery('')
    setSearchOpen(false)
  }

  return (
    <div
      className="mx-2 mb-3.5 overflow-hidden rounded-[14px]"
      style={{ background: ROOM.card, border: `1px solid ${ROOM.blue20}` }}
    >
      <div className="flex items-center gap-2.5 px-3 pb-2.5 pt-3" style={{ borderBottom: `1px solid ${ROOM.border2}` }}>
        <div
          className="flex h-[23px] w-[32px] shrink-0 items-center justify-center rounded text-[10px] font-bold"
          style={{ background: pc.bg, color: pc.color }}
        >
          {position || '?'}
        </div>
        <span className="truncate text-[16px] font-bold" style={{ color: ROOM.t1 }}>
          {playerName}
        </span>
        <span className="ml-auto text-[9px] font-extrabold uppercase tracking-[1.5px]" style={{ color: ROOM.blue }}>
          Pick {pick.pick_number}
        </span>
      </div>

      {/* Player */}
      <div className="px-3 pt-[11px]">
        <label className="mb-[5px] block text-[9px] font-extrabold uppercase tracking-[1.5px]" style={{ color: ROOM.t3 }}>
          Player
        </label>
        {!searchOpen ? (
          <button
            onClick={() => setSearchOpen(true)}
            className="flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-[14px]"
            style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.border}`, color: ROOM.t1 }}
          >
            <span className="truncate">{playerName}</span>
            <span className="shrink-0 text-[11px]" style={{ color: ROOM.t3 }}>change</span>
          </button>
        ) : (
          <div className="rounded-[10px]" style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.blue20}` }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search a player"
              className="w-full bg-transparent px-3 py-2.5 text-[14px] outline-none"
              style={{ color: ROOM.t1 }}
            />
            {matches.length > 0 && (
              <div className="max-h-[150px] overflow-y-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {matches.map(p => {
                  const mpc = posColors(p.position)
                  return (
                    <button
                      key={p.id}
                      onClick={() => pickPlayer(p)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]"
                    >
                      <span
                        className="flex h-[20px] w-[28px] shrink-0 items-center justify-center rounded text-[9px] font-bold"
                        style={{ background: mpc.bg, color: mpc.color }}
                      >
                        {p.position}
                      </span>
                      <span className="truncate text-[13px]" style={{ color: ROOM.t1 }}>{p.name}</span>
                      <span className="ml-auto shrink-0 text-[11px]" style={{ color: ROOM.t3 }}>{p.team}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Won by */}
      <div className="px-3 pt-[11px]">
        <label className="mb-[5px] block text-[9px] font-extrabold uppercase tracking-[1.5px]" style={{ color: ROOM.t3 }}>
          Won by
        </label>
        <div className="relative rounded-[10px]" style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.border}` }}>
          <select
            value={manager}
            onChange={e => setManager(e.target.value)}
            className="w-full appearance-none bg-transparent px-3 py-2.5 pr-8 text-[14px] outline-none"
            style={{ color: ROOM.t1 }}
          >
            {managerNames.map(name => (
              <option key={name} value={name} style={{ background: ROOM.cardEl, color: ROOM.t1 }}>
                {name}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px]" style={{ color: ROOM.t3 }}>
            &#9662;
          </span>
        </div>
      </div>

      {/* Price (auction only) */}
      {format === 'auction' && (
        <div className="px-3 pt-[11px]">
          <label className="mb-[5px] block text-[9px] font-extrabold uppercase tracking-[1.5px]" style={{ color: ROOM.t3 }}>
            Price
          </label>
          <div className="flex items-center gap-1 rounded-[10px] px-3 py-2.5" style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.border}` }}>
            <span className="font-mono text-[14px] font-bold" style={{ color: ROOM.blue }}>$</span>
            <input
              value={price}
              onChange={e => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="0"
              className="w-full bg-transparent font-mono text-[14px] font-bold tabular-nums outline-none"
              style={{ color: ROOM.blue }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2.5 px-3 pb-3 pt-3.5">
        <button
          onClick={onCancel}
          className="rounded-[10px] px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide"
          style={{ background: 'rgba(255,255,255,0.05)', color: ROOM.t2, border: `1px solid ${ROOM.border}` }}
        >
          Cancel
        </button>
        <button
          onClick={() => onRemove(pick.pick_number)}
          className="flex items-center gap-1.5 rounded-[10px] px-3.5 py-2.5 text-[12px] font-extrabold uppercase tracking-wide"
          style={{ background: ROOM.danger10, color: ROOM.danger, border: `1px solid ${ROOM.danger25}` }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
          Remove
        </button>
        <button
          onClick={handleSave}
          className="flex-1 rounded-[10px] px-4 py-2.5 text-[12px] font-extrabold uppercase tracking-wide"
          style={{ background: ROOM.blue, color: '#06131f' }}
        >
          Save
        </button>
      </div>
    </div>
  )
}

export function FixPickSheet({
  open,
  picks,
  managerNames,
  format,
  available,
  onEditPick,
  onRemovePick,
  onClose,
}: {
  open: boolean
  picks: DraftPick[]
  managerNames: string[]
  format: DraftFormat
  available: ScoredPlayer[]
  onEditPick: (pickNumber: number, changes: EditChanges) => void
  onRemovePick: (pickNumber: number) => void
  onClose: () => void
}) {
  const [editing, setEditing] = useState<number | null>(null)

  const sorted = useMemo(
    () => [...picks].sort((a, b) => b.pick_number - a.pick_number),
    [picks],
  )

  const editingPick = editing === null ? null : sorted.find(p => p.pick_number === editing) ?? null

  if (!open) return null

  const close = () => {
    setEditing(null)
    onClose()
  }

  const handleSave = (pickNumber: number, changes: EditChanges) => {
    if (Object.keys(changes).length > 0) onEditPick(pickNumber, changes)
    setEditing(null)
  }

  const handleRemove = (pickNumber: number) => {
    onRemovePick(pickNumber)
    setEditing(null)
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(4,8,14,0.6)' }}
        onClick={close}
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 flex max-h-[88%] flex-col rounded-t-[20px]"
        style={{
          background: ROOM.surface,
          borderTop: `1px solid ${ROOM.border}`,
          boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
        }}
        role="dialog"
        aria-label="Fix a pick"
      >
        <div className="mx-auto mb-1 mt-2.5 h-1 w-9 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        <div className="px-4 pb-2.5 pt-1">
          <div className="font-headline text-[17px]" style={{ color: ROOM.t1 }}>
            Fix a pick
          </div>
          <div className="mt-0.5 text-[11px]" style={{ color: ROOM.t3 }}>
            {editingPick
              ? 'Correct the sale, then Save. Budgets and roster recompute automatically.'
              : 'Tap a sale to edit its price, team, or player, or remove it. Newest first.'}
          </div>
        </div>

        {editingPick ? (
          <div className="overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <EditCard
              pick={editingPick}
              managerNames={managerNames}
              format={format}
              available={available}
              onSave={handleSave}
              onRemove={handleRemove}
              onCancel={() => setEditing(null)}
            />
            <div className="px-4 text-center text-[10px]" style={{ color: ROOM.t3 }}>
              Removing renumbers the remaining picks and refunds the team&apos;s budget.
            </div>
          </div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-10 text-center text-[12px]" style={{ color: ROOM.t3 }}>
            No picks recorded yet.
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-2 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sorted.map((pick, i) => (
              <div key={pick.pick_number}>
                <PickRow pick={pick} onOpen={setEditing} />
                {i < sorted.length - 1 && (
                  <div className="h-px" style={{ background: ROOM.border2, margin: '0 10px' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
