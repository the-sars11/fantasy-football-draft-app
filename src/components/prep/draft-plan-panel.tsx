'use client'

/**
 * draft-plan-panel.tsx - the "Your Plan" header that sits ON TOP of the existing
 * board table. It answers the draft in one glance: the anchor to win, the single
 * second big buy, the pockets the room sleeps on, and who to let others overpay
 * for - each with a walk-away price. It reads the SAME research dataset the board
 * already loads (via buildDraftPlan), so nothing here is hand-entered; when a
 * section has no data it simply doesn't render.
 *
 * Design: approved direction in .claude/mockups/board-plan-panel-direction.html.
 * One brick-red moment (the anchor); everything else is restrained list rows in
 * the SHIELD palette. The board table stays below as the lookup tool.
 */

import type { Position } from '@/lib/players/types'
import type {
  DraftPlan,
  PlanPlayer,
  SecondBuyOption,
  OverpayLine,
} from '@/lib/prep/draft-plan'

// Position chip colors - mirrors the board's POS_COLORS (rgba fill + token text).
const POS_CHIP: Record<string, { bg: string; fg: string }> = {
  QB:  { bg: 'rgba(255,110,138,0.18)', fg: 'var(--ffi-pos-qb)' },
  RB:  { bg: 'rgba(86,224,160,0.18)',  fg: 'var(--ffi-pos-rb)' },
  WR:  { bg: 'rgba(108,168,255,0.18)', fg: 'var(--ffi-pos-wr)' },
  TE:  { bg: 'rgba(255,176,92,0.18)',  fg: 'var(--ffi-pos-te)' },
  DEF: { bg: 'rgba(99,115,150,0.20)',  fg: '#93a6c2' },
  K:   { bg: 'rgba(167,139,250,0.18)', fg: 'var(--ffi-pos-k)' },
}

function PosChip({ position }: { position: Position }) {
  const c = POS_CHIP[position] ?? POS_CHIP.DEF
  return (
    <span
      className="flex-shrink-0 rounded-[7px] leading-none"
      style={{
        fontFamily: 'var(--font-cond)',
        fontWeight: 700,
        fontSize: '11px',
        padding: '4px 7px',
        background: c.bg,
        color: c.fg,
      }}
    >
      {position}
    </span>
  )
}

const money = (n: number | null): string => (n == null ? '--' : `$${Math.round(n)}`)

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="uppercase"
      style={{
        fontFamily: 'var(--font-cond)',
        fontWeight: 700,
        letterSpacing: '0.22em',
        fontSize: '9.5px',
        color: 'var(--ffi-ink-3)',
        marginBottom: '9px',
      }}
    >
      {children}
    </div>
  )
}

// ── The anchor: the one brick-red moment ──────────────────────────────────
function AnchorRow({ anchor }: { anchor: NonNullable<DraftPlan['anchor']> }) {
  const { player, record, presence } = anchor
  return (
    <div
      className="flex items-center gap-[10px]"
      style={{
        borderLeft: '2.5px solid var(--ffi-volt)',
        background: 'rgba(166,60,65,0.06)',
        borderRadius: '11px',
        padding: '10px 12px',
      }}
    >
      <PosChip position={player.position} />
      <span className="flex-1 min-w-0">
        <span
          className="block truncate"
          style={{ fontFamily: 'var(--font-cond)', fontWeight: 800, fontSize: '17px', color: '#fff', lineHeight: 1 }}
        >
          {player.name}
        </span>
        <span
          className="block"
          style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 500, color: 'var(--ffi-ink-3)', marginTop: '3px', letterSpacing: '0.02em' }}
        >
          {record} &middot; {presence}
        </span>
      </span>
      <span
        className="flex-shrink-0 uppercase"
        style={{
          fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: '9px', letterSpacing: '0.10em',
          color: 'var(--ffi-gold-bright)', background: 'rgba(166,60,65,0.14)', border: '1px solid rgba(166,60,65,0.34)',
          borderRadius: '6px', padding: '2px 6px',
        }}
      >
        Anchor
      </span>
      <span className="flex-shrink-0 text-right">
        <span className="block" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '19px', color: 'var(--ffi-blue)', lineHeight: 1 }}>
          {money(player.walkAway)}
        </span>
        <span
          className="block uppercase"
          style={{ fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: '8px', letterSpacing: '0.10em', color: 'var(--ffi-ink-3)', marginTop: '3px' }}
        >
          walk-away
        </span>
      </span>
    </div>
  )
}

// ── Second buy: pick-one option rows ──────────────────────────────────────
function SecondBuyRow({ opt, last }: { opt: SecondBuyOption; last: boolean }) {
  return (
    <div
      className="flex items-center gap-[10px]"
      style={{ padding: '8px 2px', borderBottom: last ? 'none' : '1px solid rgba(180,200,224,0.055)' }}
    >
      <PosChip position={opt.position} />
      <span className="flex-1 min-w-0 truncate" style={{ fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: '14.5px', color: 'var(--ffi-ink)' }}>
        {opt.name}
      </span>
      {opt.best && (
        <span
          className="uppercase flex-shrink-0"
          style={{
            fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: '8px', letterSpacing: '0.08em',
            color: 'var(--ffi-blue-bright)', border: '1px solid rgba(95,168,224,0.30)', background: 'rgba(95,168,224,0.10)',
            borderRadius: '5px', padding: '1px 5px',
          }}
        >
          best
        </span>
      )}
      <span className="flex-shrink-0 text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--ffi-ink-3)', width: '52px' }}>
        {opt.record}
      </span>
      <span className="flex-shrink-0 tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '14px', color: 'var(--ffi-blue)' }}>
        {money(opt.walkAway)}
      </span>
    </div>
  )
}

// ── Pocket rows: worth vs room, mono walk price on the right ───────────────
function PocketRow({ p }: { p: PlanPlayer }) {
  return (
    <div className="flex items-center gap-[9px]" style={{ padding: '6px 2px' }}>
      <span className="flex-1 min-w-0 truncate" style={{ fontFamily: 'var(--font-cond)', fontWeight: 600, fontSize: '13.5px', color: 'var(--ffi-ink)' }}>
        {p.name}
      </span>
      <PosChip position={p.position} />
      <span className="whitespace-nowrap tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--ffi-ink-3)' }}>
        worth {money(p.worth)} &middot; room {money(p.roomPrice)}
      </span>
      {p.injury && (
        <span
          className="uppercase"
          style={{
            fontFamily: 'var(--font-cond)', fontWeight: 700, fontSize: '7.5px', letterSpacing: '0.06em', color: 'var(--ffi-pos-te)',
            border: '1px solid rgba(255,176,92,0.28)', borderRadius: '4px', padding: '0 3px', lineHeight: 1.5,
          }}
        >
          INJ
        </span>
      )}
      <span className="whitespace-nowrap text-right tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: 'var(--ffi-pos-rb)', width: '38px' }}>
        {money(p.walkAway)}
      </span>
    </div>
  )
}

// ── Overpay strip (dim) ────────────────────────────────────────────────────
function OverpayStrip({ overpays }: { overpays: OverpayLine[] }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: '11.5px', color: 'var(--ffi-ink-3)', lineHeight: 1.6 }}>
      {overpays.map((o, i) => (
        <span key={o.id}>
          <span style={{ color: 'var(--ffi-ink-2)', fontWeight: 600 }}>{o.name}</span>{' '}
          <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--ffi-danger)', fontSize: '10.5px' }}>
            {money(o.roomPrice)}/{money(o.worth)}
          </span>
          {i < overpays.length - 1 && <span style={{ color: 'var(--ffi-ink-3)' }}> &middot; </span>}
        </span>
      ))}
    </div>
  )
}

const SECT_STYLE: React.CSSProperties = { padding: '12px 15px', borderBottom: '1px solid var(--ffi-hairline)' }

/** The full panel. Renders nothing when there is no dataset-derived plan. */
export function DraftPlanPanel({ plan }: { plan: DraftPlan | null }) {
  if (!plan) return null
  const { anchor, secondBuys, pockets, overpays, source } = plan
  // Nothing to say if the sim produced no picks and no lists.
  if (!anchor && secondBuys.length === 0 && pockets.length === 0 && overpays.length === 0) {
    return null
  }

  const sims = source.simRuns * source.strategies

  return (
    <div className="ffi-nameplate mb-[10px] overflow-hidden">
      {/* head */}
      <div className="flex items-center gap-[9px]" style={{ padding: '13px 15px 11px', borderBottom: '1px solid var(--ffi-hairline)' }}>
        <div className="uppercase" style={{ fontFamily: 'var(--font-cond)', fontWeight: 800, letterSpacing: '0.14em', fontSize: '15px', color: 'var(--ffi-ink)' }}>
          Your <b style={{ color: 'var(--ffi-gold-bright)', fontWeight: 800 }}>Plan</b>
        </div>
        <div className="ml-auto text-right" style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--ffi-ink-3)', lineHeight: 1.35 }}>
          {sims > 0 ? `${sims.toLocaleString('en-US')} sims of your room` : 'your room, simulated'}
          <br />graded on wins
        </div>
      </div>

      {/* 1 - anchor */}
      {anchor && (
        <div style={SECT_STYLE}>
          <SectionLabel>1 &middot; The Anchor - win him</SectionLabel>
          <AnchorRow anchor={anchor} />
        </div>
      )}

      {/* 2 - second buy */}
      {secondBuys.length > 0 && (
        <div style={SECT_STYLE}>
          <SectionLabel>2 &middot; Second big buy - pick one</SectionLabel>
          {secondBuys.map((opt, i) => (
            <SecondBuyRow key={opt.id} opt={opt} last={i === secondBuys.length - 1} />
          ))}
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--ffi-ink-2)', marginTop: '9px', lineHeight: 1.45 }}>
            Best-graded pairing gets the <b style={{ color: 'var(--ffi-ink)' }}>best</b> chip. Walk-away is the max to win the lot.
          </div>
        </div>
      )}

      {/* 3 - pockets */}
      {pockets.length > 0 && (
        <div style={SECT_STYLE}>
          <SectionLabel>3 &middot; Pockets - your room sleeps on these</SectionLabel>
          {pockets.map((p) => (
            <PocketRow key={p.id} p={p} />
          ))}
        </div>
      )}

      {/* let them overpay */}
      {overpays.length > 0 && (
        <div style={{ padding: '12px 15px' }}>
          <SectionLabel>Let them overpay - walk away</SectionLabel>
          <OverpayStrip overpays={overpays} />
        </div>
      )}
    </div>
  )
}
