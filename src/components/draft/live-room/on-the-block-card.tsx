'use client'

/**
 * On-the-Block hero (D6b-1): aligned to locked v5 cockpit spec.
 * Answers "what do I do right now" with market band + CONF-rated Read.
 */

import { useState } from 'react'
import type { Player } from '@/lib/players/types'
import type { WhatToDoAdvice } from '@/lib/draft/what-to-do'
import type { RepricedPlayer } from '@/lib/draft/live-reprice'
import { ROOM, posColors, moveTheme } from './theme'

const ACTION_GLOW = 'rgba(166,60,65,0.32)'

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

/**
 * Positioned track: market-range band + red YOU marker. LB-5: when a live
 * reprice exists it also drops a blue ROOM marker (the price to beat) and shades
 * the gap between YOU and ROOM - blue when the room sits below Joe's number (a
 * pocket in his favor), muted when it has run past him (a tax). The red marker /
 * headline follow the repriced You; with no reprice (DEF / unpriced) it renders
 * exactly as before off the static advisor cap.
 */
function MarketBand({
  marketEst,
  capValue,
  repriced,
}: {
  marketEst: number | null
  capValue: number | null
  repriced?: RepricedPlayer | null
}) {
  const room = repriced?.room ?? null
  if (marketEst == null && capValue == null && room == null) return null

  const mktCenter = marketEst ?? room ?? capValue ?? 0
  const bandLow = Math.max(1, Math.round(mktCenter * 0.85))
  const bandHigh = Math.round(mktCenter * 1.15)
  // Live repriced You is Joe's real, roster-need-adjusted target; the static
  // advisor cap is the fallback only when the repricer skips this player.
  const target = repriced?.you ?? capValue ?? Math.round(mktCenter)

  // Track spans 0 to a comfortable max so nothing (band, You, Room) clips.
  const trackMax = Math.max(bandHigh, target, room ?? 0) * 1.3
  const pct = (v: number) => Math.min(98, Math.max(2, (v / trackMax) * 100))
  const regionLeft = Math.max(0, (bandLow / trackMax) * 100)
  const regionWidth = Math.min(100 - regionLeft, ((bandHigh - bandLow) / trackMax) * 100)
  const targetPct = pct(target)
  const roomPct = room != null ? pct(room) : null

  // The pocket/tax gap between YOU and ROOM, made visual.
  const gapLeft = roomPct != null ? Math.min(targetPct, roomPct) : null
  const gapWidth = roomPct != null ? Math.abs(targetPct - roomPct) : null
  const favorable = repriced != null && repriced.pocket > 0

  // Prose: you-vs-room when repriced; the old market-range read otherwise.
  const inBand = target >= bandLow && target <= bandHigh
  const marketNote = marketEst != null
    ? target <= bandLow
      ? `disciplined value at the bottom of the band.`
      : inBand
        ? `sits inside the market range.`
        : `is above market - bid with conviction.`
    : null

  return (
    <div
      className="mt-3"
      style={{
        background: 'rgba(5,7,12,0.6)',
        border: `1px solid ${ROOM.border}`,
        borderRadius: 11,
        padding: '11px 13px 12px',
      }}
    >
      {/* Label + target price */}
      <div className="mb-1 flex items-baseline justify-between">
        <span
          className="text-[9px] font-bold uppercase tracking-[1.5px]"
          style={{ color: ROOM.t3 }}
        >
          Your target price
        </span>
        <span
          className="font-mono text-[22px] font-bold leading-none"
          style={{ color: ROOM.action }}
          data-testid="mb-target"
        >
          ${target}
          <small className="ml-0.5 text-[11px] font-semibold" style={{ color: ROOM.t3 }}>
            {' '}max
          </small>
        </span>
      </div>

      {/* Track */}
      <div
        className="relative mx-0.5 mt-5 mb-2"
        style={{
          height: 12,
          borderRadius: 6,
          background:
            'repeating-linear-gradient(90deg,transparent,transparent 6px,rgba(255,255,255,0.03) 6px,rgba(255,255,255,0.03) 7px),' +
            'linear-gradient(90deg,#0e1622,#182338)',
        }}
      >
        {/* Steel-blue market range region */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: `${regionLeft}%`,
            width: `${regionWidth}%`,
            borderRadius: 5,
            background:
              'linear-gradient(180deg,rgba(95,168,224,0.34),rgba(95,168,224,0.16))',
            border: '1px solid rgba(95,168,224,0.5)',
          }}
        >
          {/* Band-edge prices - hidden when a ROOM marker owns the space below. */}
          {roomPct == null && (
            <>
              <span
                className="absolute font-mono text-[9px]"
                style={{ top: 15, left: 0, transform: 'translateX(-50%)', color: ROOM.blue }}
              >
                ${bandLow}
              </span>
              <span
                className="absolute font-mono text-[9px]"
                style={{ top: 15, right: 0, transform: 'translateX(50%)', color: ROOM.blue }}
              >
                ${bandHigh}
              </span>
            </>
          )}
        </div>

        {/* Pocket / tax gap between YOU and ROOM */}
        {gapLeft != null && gapWidth != null && gapWidth > 0.5 && (
          <div
            className="absolute"
            data-testid="mb-gap"
            style={{
              left: `${gapLeft}%`,
              width: `${gapWidth}%`,
              top: 3,
              bottom: 3,
              borderRadius: 3,
              background: favorable ? 'rgba(95,168,224,0.30)' : 'rgba(94,112,138,0.30)',
            }}
          />
        )}

        {/* Blue ROOM marker - the price Joe must beat (repriced live) */}
        {roomPct != null && room != null && (
          <div
            className="absolute"
            data-testid="mb-room-marker"
            style={{
              left: `${roomPct}%`,
              top: -4,
              bottom: -4,
              width: 3,
              borderRadius: 2,
              background: ROOM.blue,
              transform: 'translateX(-50%)',
            }}
          >
            <span
              className="absolute whitespace-nowrap font-mono text-[8px] font-bold tracking-[0.06em]"
              style={{ top: 15, left: '50%', transform: 'translateX(-50%)', color: ROOM.blue }}
            >
              ROOM ${room}
            </span>
          </div>
        )}

        {/* Red YOU marker - Joe's repriced target */}
        <div
          className="absolute"
          data-testid="mb-you-marker"
          style={{
            left: `${targetPct}%`,
            top: -4,
            bottom: -4,
            width: 3,
            borderRadius: 2,
            background: ROOM.action,
            boxShadow: `0 0 10px ${ACTION_GLOW}`,
            transform: 'translateX(-50%)',
          }}
        >
          <span
            className="absolute whitespace-nowrap font-mono text-[8px] font-bold tracking-[0.06em]"
            style={{
              top: -16,
              left: '50%',
              transform: 'translateX(-50%)',
              color: ROOM.action,
            }}
          >
            {roomPct != null ? `YOU $${target}` : 'YOUR TARGET'}
          </span>
        </div>
      </div>

      {/* Prose note */}
      {repriced != null && room != null ? (
        <p className="mt-6 text-[11px] leading-snug" style={{ color: ROOM.t2 }} data-testid="mb-note">
          {repriced.isPocket ? (
            <>
              You <span style={{ color: ROOM.t1 }}>${target}</span> clear the room{"'"}s{' '}
              <span style={{ color: ROOM.t1 }}>${room}</span> by{' '}
              <span style={{ color: ROOM.blue }}>${repriced.pocket}</span> - a pocket to pounce on.
            </>
          ) : repriced.isTax ? (
            <>
              The room{"'"}s <span style={{ color: ROOM.t1 }}>${room}</span> has run past your{' '}
              <span style={{ color: ROOM.t1 }}>${target}</span> - let him go, hunt value elsewhere.
            </>
          ) : (
            <>
              You <span style={{ color: ROOM.t1 }}>${target}</span> vs the room{"'"}s{' '}
              <span style={{ color: ROOM.t1 }}>${room}</span> - about even; bid to your number, not past it.
            </>
          )}
        </p>
      ) : (
        marketNote != null && marketEst != null && (
          <p className="mt-4 text-[11px] leading-snug" style={{ color: ROOM.t2 }} data-testid="mb-note">
            Market projects{' '}
            <span style={{ color: ROOM.t1 }}>
              ${bandLow}-${bandHigh}
            </span>
            {'. '}
            Your target <span style={{ color: ROOM.t1 }}>${target}</span>{' '}
            {marketNote}
          </p>
        )
      )}

      {/* Legend */}
      <div className="mt-2 flex gap-3.5 font-mono text-[9.5px]" style={{ color: ROOM.t3 }}>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-[7px] w-3 rounded-sm"
            style={{ background: 'rgba(95,168,224,0.5)' }}
          />
          Market range
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-[7px] w-3 rounded-sm"
            style={{ background: ROOM.action }}
          />
          Your target
        </span>
        {roomPct != null && (
          <span className="flex items-center gap-1.5">
            <span
              className="inline-block h-[7px] w-3 rounded-sm"
              style={{ background: ROOM.blue }}
            />
            Room price
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * LB-4: always-visible repriced glance - the roster-need-adjusted You over the
 * inflation-moved room price, plus a POCKET / tax chip. Same you-vs-room language
 * as the Value Board (arrows: amber up = room got hot, blue down = room went soft;
 * pocket chip blue, tax chip muted). The You number keeps this card's action red -
 * it is still "your target," just repriced live off the draft instead of static.
 */
function RepricedGlance({ rp }: { rp: RepricedPlayer }) {
  const roomArrow =
    rp.roomDelta > 0 ? (
      <span style={{ color: ROOM.amber }}> ▲</span>
    ) : rp.roomDelta < 0 ? (
      <span style={{ color: ROOM.blue }}> ▼</span>
    ) : null

  return (
    <div className="flex shrink-0 items-center gap-1.5" data-testid="otb-repriced">
      {rp.isPocket && (
        <span
          className="shrink-0 rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] font-bold"
          style={{ background: ROOM.blue10, color: ROOM.blue }}
          data-testid="otb-pocket"
        >
          +${rp.pocket}
        </span>
      )}
      {rp.isTax && (
        <span
          className="shrink-0 rounded-[5px] px-1.5 py-0.5 font-mono text-[10px] font-bold"
          style={{ background: ROOM.muted10, color: ROOM.muted }}
          data-testid="otb-tax"
        >
          tax
        </span>
      )}
      <span className="text-right" style={{ minWidth: 38 }}>
        <span
          className="block font-mono text-[15px] font-bold leading-none"
          style={{ color: ROOM.action }}
          data-testid="otb-you"
        >
          ${rp.you}
        </span>
        <span
          className="mt-0.5 block whitespace-nowrap font-mono text-[9px]"
          style={{ color: ROOM.t3 }}
          data-testid="otb-room"
        >
          room {rp.room}
          {roomArrow}
        </span>
      </span>
    </div>
  )
}

export function OnTheBlockCard({
  player,
  advice,
  confidence,
  landProbability,
  repriced,
  onChangePlayer,
  onToggleTarget,
  onToggleAvoid,
}: {
  player: Player | null
  advice: WhatToDoAdvice | null
  /** D6b-1: rule-based confidence from explain.ts (high/medium/low). */
  confidence?: 'high' | 'medium' | 'low'
  /**
   * D6b-2: real Monte-Carlo land probability (0..1) for this player from the
   * live board. Null/undefined => no meaningful signal, chip hidden. This is a
   * real runMonteCarlo fraction (DEC-2b), never a fabricated number.
   */
  landProbability?: number | null
  /**
   * LB-4: this player's live-repriced You/Room (roster-need-adjusted target over
   * the inflation-moved room price). Null/undefined => no live reprice for this
   * player (e.g. DEF / unpriced rows the repricer skips) => fall back to the
   * static advisor cap. Never fabricated; the caller passes repriced.get(id).
   */
  repriced?: RepricedPlayer | null
  onChangePlayer: () => void
  /** R11b: target and avoid settable right from the hero card. */
  onToggleTarget: (playerId: string) => void
  onToggleAvoid: (playerId: string) => void
}) {
  const [collapsed, setCollapsed] = useState(false)

  if (!player || !advice) {
    return <WaitingCard onChangePlayer={onChangePlayer} />
  }

  const pos = posColors(player.position)
  const move = moveTheme(advice.moveColor)

  // "RB6" positional rank label
  const posRankLabel =
    player.ecrPositionRank != null
      ? `${player.position}${player.ecrPositionRank}`
      : null

  // "LAR · RB6 · TIER 2 · BYE 6" meta line
  const tierNum =
    player.consensusTier != null && Number.isFinite(player.consensusTier)
      ? Math.max(1, Math.round(player.consensusTier))
      : null
  const metaParts = [
    player.team,
    posRankLabel,
    tierNum != null ? `TIER ${tierNum}` : null,
    player.byeWeek != null ? `BYE ${player.byeWeek}` : null,
  ].filter(Boolean)
  const metaLine = metaParts.join(' · ')

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(160deg,rgba(34,49,71,0.2),#141d2c 70%)',
        border: `1px solid ${ROOM.border}`,
        boxShadow: `0 8px 24px rgba(0,0,0,0.36),inset 3px 0 0 ${ROOM.action}`,
      }}
    >
      {/* ── Summary row (always visible, click to expand / collapse) ───── */}
      <div
        className="flex cursor-pointer items-center gap-2.5 px-3 py-2.5"
        onClick={() => setCollapsed(c => !c)}
        role="button"
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand on the block card' : 'Collapse on the block card'}
      >
        {/* Position chip — always visible */}
        <span
          className="shrink-0 rounded px-1.5 py-[3px] font-headline text-[10px] font-bold tracking-[0.05em]"
          style={{ background: pos.bg, color: pos.color }}
        >
          {player.position}
        </span>

        {/* Name (collapsed) or eyebrow (expanded) */}
        {collapsed ? (
          <span
            className="min-w-0 flex-1 truncate font-headline text-[16px] font-bold leading-none"
            style={{ color: ROOM.t1 }}
          >
            {player.name}
          </span>
        ) : (
          <span
            className="flex-1 font-headline text-[10.5px] font-semibold uppercase tracking-[1.6px]"
            style={{ color: ROOM.action }}
          >
            On The Block
          </span>
        )}

        {/* LB-4: always-visible glance. Live repriced You/Room when the repricer
            has a value for this player; otherwise the static advisor cap. */}
        {repriced ? (
          <RepricedGlance rp={repriced} />
        ) : (
          advice.capValue != null && (
            <span
              className="shrink-0 font-mono text-[14px] font-bold"
              style={{ color: ROOM.action }}
              data-testid="otb-max-bid"
            >
              ${advice.capValue}
              <small className="ml-0.5 text-[9px] font-semibold" style={{ color: ROOM.t3 }}>
                tgt
              </small>
            </span>
          )
        )}

        {/* Change player — only visible in expanded header */}
        {!collapsed && (
          <button
            onClick={e => {
              e.stopPropagation()
              onChangePlayer()
            }}
            className="relative shrink-0 rounded px-2 py-1 text-[9.5px] font-bold tracking-wide transition-opacity hover:opacity-80"
            style={{ background: ROOM.cardEl, border: `1px solid ${ROOM.border}`, color: ROOM.t2 }}
          >
            {/* Wider tap target without growing the visible box */}
            <span aria-hidden="true" className="absolute inset-x-0 -inset-y-[10px]" />
            Change
          </button>
        )}

        {/* Chevron */}
        <span
          className="shrink-0 text-[11px] transition-transform duration-200"
          style={{ color: ROOM.t3, transform: collapsed ? undefined : 'rotate(180deg)' }}
          aria-hidden="true"
        >
          {'▲'}
        </span>
      </div>

      {/* ── Expanded body ───────────────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-3 pb-3 pt-0">
          {/* ob-main: headshot slot + name/meta + star */}
          <div className="flex items-center gap-2.5 pb-2">
            {/* Headshot placeholder — silhouette per v5 spec */}
            <div
              className="relative shrink-0 overflow-hidden"
              style={{
                width: 52,
                height: 52,
                borderRadius: 11,
                background: 'radial-gradient(120% 100% at 50% 10%, #2b3d57, #131b28)',
                border: `1px solid ${ROOM.border}`,
                flexShrink: 0,
              }}
            >
              {/* Body silhouette */}
              <div
                className="absolute bottom-[-2px] left-1/2 -translate-x-1/2"
                style={{
                  width: 38,
                  height: 40,
                  background: 'rgba(95,168,224,0.22)',
                  borderRadius: '50% 50% 42% 42% / 60% 60% 40% 40%',
                  boxShadow: '0 -9px 0 -3px rgba(95,168,224,0.22)',
                }}
              />
              {/* Jersey / positional rank number */}
              {player.ecrPositionRank != null && (
                <span
                  className="absolute right-1 top-0.5 font-headline text-[11px] font-bold"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {player.ecrPositionRank}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div
                className="font-headline text-[20px] font-bold leading-[1.05]"
                style={{ color: ROOM.t1 }}
              >
                {player.name}
              </div>
              <div
                className="mt-0.5 font-mono text-[10px] tracking-[0.02em]"
                style={{ color: ROOM.t2 }}
              >
                {metaLine}
              </div>
            </div>

            {/* Target star toggle */}
            <button
              onClick={() => onToggleTarget(player.id)}
              className="flex shrink-0 items-center justify-center rounded-[7px] text-[14px] transition-transform active:scale-95"
              style={{
                width: 28,
                height: 28,
                border: advice.isTarget
                  ? `1px solid rgba(166,60,65,0.6)`
                  : `1px solid rgba(166,60,65,0.3)`,
                background: advice.isTarget
                  ? 'rgba(166,60,65,0.22)'
                  : 'rgba(166,60,65,0.08)',
                color: ROOM.action,
              }}
              aria-pressed={advice.isTarget}
              aria-label={
                advice.isTarget
                  ? `Remove ${player.name} from targets`
                  : `Add ${player.name} to targets`
              }
            >
              {advice.isTarget ? '★' : '☆'}
            </button>
          </div>

          {/* Tag row: tier label + avoid button + scarcity note */}
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className="rounded px-2 py-1 text-[10px] font-bold tracking-wide"
              style={{ background: 'rgba(255,255,255,0.08)', color: ROOM.t1 }}
            >
              {advice.tierLabel}
            </span>
            <button
              onClick={() => onToggleAvoid(player.id)}
              className="rounded px-2 py-1 text-[10px] font-bold transition-transform active:scale-95"
              style={
                advice.isAvoid
                  ? {
                      background: ROOM.danger10,
                      border: `1px solid ${ROOM.danger25}`,
                      color: ROOM.danger,
                    }
                  : {
                      background: 'rgba(255,255,255,0.05)',
                      border: `1px solid ${ROOM.border}`,
                      color: ROOM.t3,
                    }
              }
              aria-pressed={advice.isAvoid}
              aria-label={
                advice.isAvoid
                  ? `Remove ${player.name} from avoids`
                  : `Add ${player.name} to avoids`
              }
            >
              AVOID
            </button>
            {advice.scarcityNote && (
              <span className="ml-auto text-[11px]" style={{ color: ROOM.t2 }}>
                {advice.scarcityNote}
              </span>
            )}
          </div>

          {/* Market band — replaces plain "Your range" row (D6b-1 gap #1).
              LB-5: repriced You/Room drive the markers when a live reprice exists. */}
          <MarketBand marketEst={advice.marketEst} capValue={advice.capValue} repriced={repriced} />

          {/* The Read section — CONF chip + move directive + rationale */}
          <div
            className="mt-2.5 rounded-[10px] px-3 py-2.5"
            style={{ background: move.bg, border: `1px solid ${move.border}` }}
          >
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className="text-[8.5px] font-bold uppercase tracking-[2.5px]"
                style={{ color: ROOM.blue }}
              >
                The Read
              </span>
              {/* CONF chip — wired from explain.ts HIGH/MED/LOW (D6b-1) */}
              {confidence && (
                <span
                  className="rounded-full px-2 py-[2px] font-mono text-[10px] font-bold"
                  style={{
                    background: 'rgba(95,168,224,0.12)',
                    border: '1px solid rgba(95,168,224,0.28)',
                    color: ROOM.blue,
                  }}
                >
                  CONF · {confidence.toUpperCase()}
                </span>
              )}
              {/* LAND chip — real Monte-Carlo land probability (D6b-2). Neutral/
                  muted styling: a data readout, not a verdict, so it never
                  competes with the blue CONF or the one true action red. */}
              {landProbability != null && (
                <span
                  className="rounded-full px-2 py-[2px] font-mono text-[10px] font-bold"
                  style={{
                    background: ROOM.muted10,
                    border: `1px solid ${ROOM.muted25}`,
                    color: ROOM.muted,
                  }}
                  title="Chance you land this player, across simulated drafts"
                >
                  LAND · {Math.round(landProbability * 100)}%
                </span>
              )}
              <span
                className="ml-auto font-headline text-[14px] tracking-wide"
                style={{ color: move.color }}
              >
                {advice.move}
              </span>
              <span
                className="font-mono text-[12px] font-semibold"
                style={{ color: move.color }}
              >
                {advice.cap}
              </span>
            </div>

            <div className="text-[12.5px] leading-relaxed" style={{ color: ROOM.t1 }}>
              {advice.rationale}
            </div>

            {/* R5 roster-completion constraint note */}
            {advice.rosterNote && (
              <div
                className="mt-2 flex items-start gap-1.5 border-t pt-2 text-[11.5px] leading-snug"
                style={{ borderColor: 'rgba(255,255,255,0.08)', color: ROOM.t2 }}
              >
                <span
                  className="mt-px shrink-0 font-mono text-[10px] uppercase tracking-wide"
                  style={{ color: ROOM.t3 }}
                >
                  Roster
                </span>
                <span>{advice.rosterNote}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
