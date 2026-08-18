'use client'

/**
 * ResearchView (UXV2-6 part 2) — the Research tab in draft mode.
 *
 * A decision-first "who's available / who do I want / how much / record from
 * here" screen that lives INSIDE the live room (an internal tab, not a route
 * change). Locked to the approved v3 Phone 2 layout with Recent Sales removed
 * per the v4 sign-off.
 *
 * Top to bottom: sticky on-the-block mini strip + inline record -> filter bar
 * (position pills + Target View) -> available player list (star / position /
 * name + signal / tier / range or AVOID) -> tappable tier context that filters
 * the list. Pure composition over the existing draft engine — tapping a row
 * sets that player on the block, the inline record calls the same addManualPick
 * used everywhere else. No new data fetching, no paid calls.
 *
 * Copy rules (Joe): plain English, NO em/en dashes anywhere.
 */

import { useMemo, useState } from 'react'
import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { PositionScarcityExtended } from '@/lib/draft/explain'
import type { DraftPick } from '@/lib/draft/state'
import { ROOM, posColors } from './theme'
import { TierContext, type TierRow } from './tier-context'

type PosFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'DEF'

const POS_FILTERS: PosFilter[] = ['ALL', 'QB', 'WR', 'RB', 'TE', 'DEF']
const TIER_POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE']

/** Whole-tier for display; null when the source data is missing (dev cache). */
function tierOf(player: Player): number | null {
  const raw = player.consensusTier
  if (!Number.isFinite(raw)) return null
  return Math.max(1, Math.round(raw))
}

/** Your willingness band, floored at the $1 auction minimum. */
function rangeOf(sp: ScoredPlayer, maxBidMap: Map<string, number>): { low: number; high: number } {
  const market = sp.player.consensusAuctionValue ?? 1
  const suggested = maxBidMap.get(sp.player.name.toLowerCase()) ?? Math.round(market)
  const base = Math.max(market, suggested)
  const low = Math.max(1, Math.round(base * 0.8))
  const high = Math.max(low, Math.round(base * 1.2))
  return { low, high }
}

/**
 * A single research signal chip, derived from the real research analysis only.
 * Renders nothing when a run has not populated analysis (e.g. dev cache), so
 * the row never shows an invented tag.
 */
function signalTagOf(player: Player): { label: string; color: string; bg: string } | null {
  const a = player.analysis
  if (!a) return null
  if (a.isSleeper) return { label: 'SLEEPER', color: ROOM.blue, bg: ROOM.blue10 }
  if (a.riskLevel === 'high') return { label: 'RISK', color: ROOM.amber, bg: ROOM.amber10 }
  if (a.targetStatus === 'target') return { label: 'VALUE', color: ROOM.blue, bg: ROOM.blue10 }
  return null
}

function PlayerRow({
  sp,
  maxBidMap,
  onTapPlayer,
  onToggleTarget,
  onToggleAvoid,
}: {
  sp: ScoredPlayer
  maxBidMap: Map<string, number>
  onTapPlayer: (p: Player) => void
  onToggleTarget: (playerId: string) => void
  onToggleAvoid: (playerId: string) => void
}) {
  const pc = posColors(sp.player.position)
  const tier = tierOf(sp.player)
  const { low, high } = rangeOf(sp, maxBidMap)
  const isAvoid = sp.isUserAvoid
  const isTarget = sp.isUserTarget
  const signal = signalTagOf(sp.player)

  return (
    // Row is a plain container so the star, the avoid toggle and the
    // tap-target can be sibling buttons (nesting <button> in <button> is
    // invalid HTML / hydration error).
    <div
      className="flex w-full items-center gap-1 rounded-[10px] pr-2.5 transition-colors hover:bg-white/[0.03]"
      style={{ opacity: isAvoid ? 0.45 : 1 }}
    >
      {/* R11b: target and avoid are two independent toggles, each settable
          live during the draft, so tagging one never requires clearing the
          other through a separate screen. */}
      <button
        onClick={() => onToggleTarget(sp.player.id)}
        className="flex h-11 w-7 shrink-0 items-center justify-center pl-1.5 text-[15px] transition-transform active:scale-90"
        style={{ color: isTarget ? ROOM.blue : ROOM.t3 }}
        aria-label={isTarget ? `Remove ${sp.player.name} from targets` : `Add ${sp.player.name} to targets`}
        aria-pressed={isTarget}
      >
        ★
      </button>
      <button
        onClick={() => onToggleAvoid(sp.player.id)}
        className="flex h-11 w-6 shrink-0 items-center justify-center text-[13px] transition-transform active:scale-90"
        style={{ color: isAvoid ? ROOM.danger : ROOM.t3 }}
        aria-label={isAvoid ? `Remove ${sp.player.name} from avoids` : `Add ${sp.player.name} to avoids`}
        aria-pressed={isAvoid}
      >
        ✗
      </button>

      {/* Tap the player area to set them on the block */}
      <button
        onClick={() => onTapPlayer(sp.player)}
        className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 text-left active:opacity-70"
        aria-label={`Set ${sp.player.name} on the block`}
      >
        <span
          className="flex h-[22px] w-[30px] shrink-0 items-center justify-center rounded text-[9.5px] font-bold"
          style={{ background: pc.bg, color: pc.color }}
        >
          {sp.player.position}
        </span>

        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <span
            className="truncate text-[15px] font-semibold"
            style={{
              color: isAvoid ? ROOM.t3 : ROOM.t1,
              textDecoration: isAvoid ? 'line-through' : 'none',
            }}
          >
            {sp.player.name}
          </span>
          {signal && (
            <span
              className="shrink-0 rounded text-[8.5px] font-bold tracking-wide"
              style={{ padding: '1.5px 5px', color: signal.color, background: signal.bg }}
            >
              {signal.label}
            </span>
          )}
        </span>

        <span
          className="shrink-0 rounded text-[9.5px] font-bold"
          style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.06)', color: ROOM.t3 }}
        >
          {tier === null ? 'NR' : `T${tier}`}
        </span>

        {isAvoid ? (
          <span className="shrink-0 text-[11px] font-bold tracking-wide" style={{ color: ROOM.danger }}>
            AVOID
          </span>
        ) : (
          <span className="shrink-0 font-mono text-[12px] font-semibold" style={{ color: ROOM.t2 }}>
            ${low}-${high}
          </span>
        )}
      </button>
    </div>
  )
}

export interface ResearchViewProps {
  available: ScoredPlayer[]
  maxBidMap: Map<string, number>
  scarcity: PositionScarcityExtended[]
  teamCount: number
  onBlockPlayer: Player | null
  setOnBlockPlayer: (p: Player | null) => void
  managerNames: string[]
  myManager: string
  onRecordPick: (pick: Omit<DraftPick, 'pick_number'>) => void
  onToggleTarget: (playerId: string) => void
  onToggleAvoid: (playerId: string) => void
}

export function ResearchView({
  available,
  maxBidMap,
  scarcity,
  teamCount,
  onBlockPlayer,
  setOnBlockPlayer,
  managerNames,
  myManager,
  onRecordPick,
  onToggleTarget,
  onToggleAvoid,
}: ResearchViewProps) {
  const [posFilter, setPosFilter] = useState<PosFilter>('ALL')
  const [tierFilter, setTierFilter] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [targetView, setTargetView] = useState(false)

  // Inline record state (mirrors ManualPickEntry's bar): price + winning team.
  const [price, setPrice] = useState('')
  const [manager, setManager] = useState(myManager)

  // Re-seed the record fields whenever a new player lands on the block.
  // "prev player during render" avoids a cascading effect (react-hooks/purity).
  const [prevBlockId, setPrevBlockId] = useState<string | null>(onBlockPlayer?.id ?? null)
  if ((onBlockPlayer?.id ?? null) !== prevBlockId) {
    setPrevBlockId(onBlockPlayer?.id ?? null)
    setPrice(onBlockPlayer ? String(onBlockPlayer.consensusAuctionValue || 1) : '')
    setManager(myManager)
  }

  const scarcityByPos = useMemo(() => {
    const m = new Map<string, PositionScarcityExtended>()
    for (const s of scarcity) m.set(s.position, s)
    return m
  }, [scarcity])

  const filtered = useMemo(() => {
    let pool = available
    if (targetView) pool = pool.filter(sp => sp.isUserTarget)
    if (posFilter !== 'ALL') pool = pool.filter(sp => sp.player.position === posFilter)
    if (tierFilter != null) pool = pool.filter(sp => tierOf(sp.player) === tierFilter)
    return [...pool].sort((a, b) => b.combinedScore - a.combinedScore)
  }, [available, targetView, posFilter, tierFilter])

  const tierRows = useMemo<TierRow[]>(() => {
    return TIER_POSITIONS.map(pos => {
      const s = scarcityByPos.get(pos)
      const posPool = available.filter(sp => sp.player.position === pos)
      const targets = posPool.filter(sp => sp.isUserTarget).length
      const startable = s?.startableRemaining ?? 0
      const fillPct = Math.min(100, (startable / (teamCount * 1.5)) * 100)
      const countTier = (tier: 4 | 5) =>
        posPool.filter(sp => {
          const raw = sp.player.consensusTier
          if (!Number.isFinite(raw)) return false
          const rounded = Math.max(1, Math.round(raw))
          return tier === 4 ? rounded === 4 : rounded >= 5
        }).length
      return {
        position: pos,
        fillPct,
        t1: s?.tier1Remaining ?? 0,
        t2: s?.tier2Remaining ?? 0,
        t3: s?.tier3Remaining ?? 0,
        t4: countTier(4),
        t5: countTier(5),
        targets,
      }
    }).sort((a, b) => a.t1 + a.t2 - (b.t1 + b.t2))
  }, [scarcityByPos, available, teamCount])

  const listLabel =
    posFilter === 'ALL' ? 'players' : `${posFilter}${tierFilter ? ` · T${tierFilter}` : 's'}`

  const canRecord = !!onBlockPlayer && !!manager && !!price && parseInt(price, 10) > 0

  const doRecord = () => {
    if (!onBlockPlayer || !manager) return
    const p = parseInt(price, 10)
    if (!p || p <= 0) return
    onRecordPick({
      player_name: onBlockPlayer.name,
      position: onBlockPlayer.position,
      manager,
      price: p,
    })
    setOnBlockPlayer(null)
  }

  const blockRange = onBlockPlayer
    ? rangeOf(
        available.find(sp => sp.player.id === onBlockPlayer.id) ?? {
          player: onBlockPlayer,
          combinedScore: 0,
        } as ScoredPlayer,
        maxBidMap,
      )
    : null
  const blockTier = onBlockPlayer ? tierOf(onBlockPlayer) : null
  const blockIsTarget = onBlockPlayer
    ? available.find(sp => sp.player.id === onBlockPlayer.id)?.isUserTarget ?? false
    : false

  return (
    <div>
      {/* ── Sticky on-the-block mini strip + inline record ── */}
      <div
        className="sticky top-[37px] z-20 -mx-3 px-3 py-2.5"
        style={{ background: ROOM.surface, borderBottom: `1px solid ${ROOM.border}` }}
      >
        {onBlockPlayer ? (
          <>
            <div className="flex items-center gap-2">
              <span
                className="flex h-[19px] items-center justify-center rounded text-[9.5px] font-bold tracking-wider"
                style={{ padding: '0 6px', ...(() => { const pc = posColors(onBlockPlayer.position); return { background: pc.bg, color: pc.color } })() }}
              >
                {onBlockPlayer.position}
              </span>
              <span className="truncate text-[15px] font-semibold" style={{ color: ROOM.t1 }}>
                {onBlockPlayer.name}
              </span>
              <span
                className="shrink-0 rounded text-[9px] font-bold"
                style={{ padding: '2px 5px', background: 'rgba(255,255,255,0.06)', color: ROOM.t3 }}
              >
                {blockTier === null ? 'NR' : `T${blockTier}`}
              </span>
              {blockIsTarget && <span className="text-[11px]" style={{ color: ROOM.blue }}>★</span>}
              <span className="ml-auto truncate text-[11px]" style={{ color: ROOM.t3 }}>
                {onBlockPlayer.team}
                {onBlockPlayer.byeWeek ? ` · Bye ${onBlockPlayer.byeWeek}` : ''}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              {blockRange && (
                <span className="shrink-0 font-mono text-[13px] font-bold" style={{ color: ROOM.blue }}>
                  ${blockRange.low}-${blockRange.high}
                </span>
              )}
              <div className="ml-auto flex items-center gap-1.5">
                <div
                  className="flex items-center rounded-[8px]"
                  style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.border}` }}
                >
                  <span className="pl-2 text-[12px]" style={{ color: ROOM.t3 }}>$</span>
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-11 bg-transparent py-1.5 pr-1 text-center text-[14px] font-semibold outline-none"
                    style={{ color: ROOM.t1 }}
                    aria-label="Winning price"
                  />
                </div>
                <select
                  value={manager}
                  onChange={e => setManager(e.target.value)}
                  className="max-w-[92px] truncate rounded-[8px] py-1.5 pl-2 pr-1 text-[11px] font-semibold outline-none"
                  style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.border}`, color: ROOM.t2 }}
                  aria-label="Winning team"
                >
                  {managerNames.map(name => (
                    <option key={name} value={name} style={{ background: ROOM.card, color: ROOM.t1 }}>
                      {name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={doRecord}
                  disabled={!canRecord}
                  className="rounded-[8px] px-3 py-1.5 text-[10px] font-bold tracking-wider transition-transform active:scale-95"
                  style={
                    canRecord
                      ? { background: ROOM.blue, color: '#06131f' }
                      : { background: 'rgba(255,255,255,0.06)', color: ROOM.t3 }
                  }
                >
                  RECORD
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 py-0.5">
            <span className="text-[13px]" style={{ color: ROOM.t3 }} aria-hidden="true">🔨</span>
            <span className="text-[12px]" style={{ color: ROOM.t2 }}>
              Tap a player below to set who is on the block.
            </span>
          </div>
        )}
      </div>

      {/* ── Filter bar: position pills + Target View ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {POS_FILTERS.map(p => {
          const on = posFilter === p
          const pc = p === 'ALL' ? null : posColors(p)
          return (
            <button
              key={p}
              onClick={() => {
                setPosFilter(p)
                setTierFilter(null)
              }}
              className="shrink-0 rounded-full text-[11px] font-bold tracking-wide transition-colors"
              style={{
                padding: '5px 12px',
                background: on ? (pc ? pc.bg : ROOM.blue10) : 'rgba(255,255,255,0.05)',
                color: on ? (pc ? pc.color : ROOM.blue) : ROOM.t3,
                border: `1px solid ${on ? (pc ? pc.color : ROOM.blue20) : 'transparent'}`,
              }}
            >
              {p === 'ALL' ? 'All' : p}
            </button>
          )
        })}
        <button
          onClick={() => setTargetView(v => !v)}
          className="ml-auto shrink-0 rounded-full text-[11px] font-bold tracking-wide transition-colors"
          style={{
            padding: '5px 12px',
            background: targetView ? ROOM.blue10 : 'rgba(255,255,255,0.05)',
            color: targetView ? ROOM.blue : ROOM.t3,
            border: `1px solid ${targetView ? ROOM.blue20 : 'transparent'}`,
          }}
          aria-pressed={targetView}
        >
          ★ Target View
        </button>
      </div>

      {/* ── Section header ── */}
      <div className="flex items-center gap-2 px-0.5 pb-1.5">
        <span
          className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[2.5px]"
          style={{ color: ROOM.t3 }}
        >
          Available {listLabel} · {filtered.length} left
        </span>
        <span className="h-px flex-1" style={{ background: ROOM.border2 }} />
        {(posFilter !== 'ALL' || tierFilter != null || targetView) && (
          <button
            onClick={() => {
              setPosFilter('ALL')
              setTierFilter(null)
              setTargetView(false)
            }}
            className="whitespace-nowrap text-[9.5px] font-bold uppercase tracking-wide underline"
            style={{ color: ROOM.t2 }}
          >
            clear
          </button>
        )}
      </div>

      {/* ── Player list ── */}
      <div className="min-h-[120px]">
        {filtered.length === 0 ? (
          <div className="px-3 py-10 text-center text-[12px]" style={{ color: ROOM.t3 }}>
            No players match this filter.
          </div>
        ) : (
          filtered
            .slice(0, 80)
            .map(sp => (
              <PlayerRow
                key={sp.player.id}
                sp={sp}
                maxBidMap={maxBidMap}
                onTapPlayer={setOnBlockPlayer}
                onToggleTarget={onToggleTarget}
                onToggleAvoid={onToggleAvoid}
              />
            ))
        )}
      </div>

      {/* ── Tier context (tap chip to filter the list above) ── */}
      <div className="flex items-center gap-2 px-0.5 pb-1.5 pt-3">
        <span
          className="whitespace-nowrap text-[9px] font-bold uppercase tracking-[2.5px]"
          style={{ color: ROOM.t3 }}
        >
          Tier Context · tap to filter
        </span>
        <span className="h-px flex-1" style={{ background: ROOM.border2 }} />
      </div>
      <TierContext
        rows={tierRows}
        onTapPosition={pos => {
          setPosFilter(pos as PosFilter)
          setTierFilter(null)
        }}
        onTapTier={(pos, tier) => {
          setPosFilter(pos as PosFilter)
          setTierFilter(tier)
        }}
      />

      <div className="h-2" />
    </div>
  )
}
