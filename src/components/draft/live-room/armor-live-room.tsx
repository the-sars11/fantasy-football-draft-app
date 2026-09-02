'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { DraftPick } from '@/lib/draft/state'
import type { RosterSlots } from '@/lib/supabase/database.types'
import type { Player } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { PositionScarcityExtended } from '@/lib/draft/explain'
import type { RosterMaxBidEntry } from '@/lib/draft/solver-bridge'
import { computeWhatToDo } from '@/lib/draft/what-to-do'
import { computeValueRange } from '@/lib/players/value-range'

// ARMOR LIVE ROOM -- 1:1 port of UI/board-live-mockup-IA-3.0.html, wired to the
// live engine's real numbers.
//
// Every element uses the mockup's own class names (.mast, .livebar, .needs,
// .otb, .keys, .gauge, .vd, .row, ...) which are defined, scoped under
// `.ffi-live`, at the end of src/app/globals.css. That scoping recreates the
// mockup's reset + brushed-steel material exactly without leaking into the rest
// of the app.
//
// The whole screen is built here: masthead, budget strip, needs pips, a tight
// contextual need summary, the ON THE BLOCK card (three key tiles: Steal
// under / Your number / Ceiling + a real price-map gauge with a green steal
// zone, blue value band, and a glowing target dot + a QUIET verdict), and the
// mini live board with sortable column headers.
//
// The card verdict is the REAL HOLD/BID/PUSH/PASS the app computes today
// (computeWhatToDo). "Your number" is the disciplined max the dot on the gauge
// sits at -- one value, no separate target. "Steal under" is that number minus
// a margin: land him below it and it is a clear bargain versus your own ceiling.
//
// Two additions beyond the static mockup, both explicitly requested: the ON THE
// BLOCK card collapses/expands, and the board columns sort on header tap.

interface ArmorLiveRoomProps {
  leagueName: string
  myBudget: number | null
  leagueBudget: number
  myMaxBid: number | null
  myPicks: DraftPick[]
  rosterSlots: RosterSlots
  scoredPlayers: ScoredPlayer[]
  draftedNames: Set<string>
  scarcity: PositionScarcityExtended[]
  maxBidMap: Map<string, number>
  rosterAdviceMap: Map<string, RosterMaxBidEntry>
  onBlockPlayer: Player | null
  isTarget: (id: string) => boolean
  isAvoid: (id: string) => boolean
  avoidSeverity: (id: string) => 'soft' | 'hard' | undefined
  onLeave: () => void
}

/** Draftable roster size = every slot except IR. Nasties = 13. */
function totalDraftableSlots(r: RosterSlots): number {
  return (
    (r.qb ?? 0) +
    (r.rb ?? 0) +
    (r.wr ?? 0) +
    (r.te ?? 0) +
    (r.flex ?? 0) +
    (r.k ?? 0) +
    (r.dst ?? 0) +
    (r.bench ?? 0)
  )
}

const POS_VAR: Record<string, string> = {
  QB: 'var(--pos-qb)',
  RB: 'var(--pos-rb)',
  WR: 'var(--pos-wr)',
  TE: 'var(--pos-te)',
  FLEX: 'var(--ink-2)',
  DEF: 'var(--pos-def)',
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n))
}

function titleCase(move: string): string {
  return move.charAt(0) + move.slice(1).toLowerCase()
}

interface BoardRow {
  player: Player
  scored: ScoredPlayer
  room: number
  target: number
  delta: number
}

type SortKey = 'smart' | 'star' | 'rk' | 'name' | 'room' | 'tgt' | 'delta'

export function ArmorLiveRoom({
  myBudget,
  myMaxBid,
  myPicks,
  rosterSlots,
  scoredPlayers,
  draftedNames,
  scarcity,
  maxBidMap,
  rosterAdviceMap,
  onBlockPlayer,
  isTarget,
  isAvoid,
  avoidSeverity,
}: ArmorLiveRoomProps) {
  const budget = myBudget ?? 0
  const maxBid = myMaxBid ?? 0
  const filledSlots = myPicks.length
  const totalSlots = useMemo(() => totalDraftableSlots(rosterSlots), [rosterSlots])

  // On-the-block card open/closed (Joe: the card must expand/collapse).
  const [otbOpen, setOtbOpen] = useState(true)
  // Board sort. 'smart' = the default pockets-first order; any header tap
  // switches to an explicit column sort and toggles direction on re-tap.
  const [sortKey, setSortKey] = useState<SortKey>('smart')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Name/id -> position index over the scored universe. Some pick sources
  // (the sim demo fixture, older manual entries) omit position on the pick, so
  // the roster pips would read empty. Resolve the missing position by matching
  // the pick's name/id against the known players.
  const posByName = useMemo(() => {
    const m = new Map<string, string>()
    for (const sp of scoredPlayers) {
      m.set(sp.player.name.toLowerCase(), sp.player.position)
      m.set(String(sp.player.id).toLowerCase(), sp.player.position)
    }
    return m
  }, [scoredPlayers])

  // --- needs strip: pips per starter position, FLEX folded from RB/WR/TE overflow
  const chips = useMemo(() => {
    const filled: Record<string, number> = { QB: 0, RB: 0, WR: 0, TE: 0, DEF: 0 }
    for (const pk of myPicks) {
      const rawPos =
        pk.position ?? posByName.get(String(pk.player_name ?? '').toLowerCase()) ?? ''
      let p = rawPos.toUpperCase()
      if (p === 'DST') p = 'DEF'
      if (p in filled) filled[p] += 1
    }
    const flexReq = rosterSlots.flex ?? 0
    const flexUsed = Math.min(
      flexReq,
      Math.max(0, filled.RB - (rosterSlots.rb ?? 0)) +
        Math.max(0, filled.WR - (rosterSlots.wr ?? 0)) +
        Math.max(0, filled.TE - (rosterSlots.te ?? 0)),
    )
    return [
      { pos: 'QB', req: rosterSlots.qb ?? 0, on: Math.min(filled.QB, rosterSlots.qb ?? 0) },
      { pos: 'RB', req: rosterSlots.rb ?? 0, on: Math.min(filled.RB, rosterSlots.rb ?? 0) },
      { pos: 'WR', req: rosterSlots.wr ?? 0, on: Math.min(filled.WR, rosterSlots.wr ?? 0) },
      { pos: 'TE', req: rosterSlots.te ?? 0, on: Math.min(filled.TE, rosterSlots.te ?? 0) },
      { pos: 'FLEX', req: flexReq, on: flexUsed },
      { pos: 'DEF', req: rosterSlots.dst ?? 0, on: Math.min(filled.DEF, rosterSlots.dst ?? 0) },
    ].filter(c => c.req > 0)
  }, [myPicks, rosterSlots, posByName])

  // --- tight contextual need summary (replaces the old re-list of every pip).
  // Names what is SET, folds flex into a parenthetical, then the real holes and
  // the strategic takeaway. Mirrors the mockup's needline exactly in spirit.
  const needParts = useMemo(() => {
    const starters = chips.filter(c => c.pos !== 'FLEX')
    const flexChip = chips.find(c => c.pos === 'FLEX')
    const flexFull = flexChip ? flexChip.on >= flexChip.req : true
    const setStarters = starters.filter(c => c.on >= c.req).map(c => c.pos)
    const needStarters = starters
      .filter(c => c.on < c.req)
      .map(c => ({ pos: c.pos, n: c.req - c.on }))
    return { setStarters, needStarters, flexFull, hasFlex: !!flexChip }
  }, [chips])

  // --- mini live board rows + positional-rank fallback map
  const { boardRows, posRank } = useMemo(() => {
    const rows: BoardRow[] = []
    for (const sp of scoredPlayers) {
      if (draftedNames.has(sp.player.name.toLowerCase())) continue
      const room = sp.player.expectedRoomPrice
      if (room == null || room <= 0) continue
      const target = computeValueRange(sp.player).base
      rows.push({
        player: sp.player,
        scored: sp,
        room: Math.round(room),
        target,
        delta: target - Math.round(room),
      })
    }
    // Positional rank fallback (only used when ecrPositionRank is missing).
    const rank = new Map<string, number>()
    const byPos = new Map<string, BoardRow[]>()
    for (const r of rows) {
      const list = byPos.get(r.player.position) ?? []
      list.push(r)
      byPos.set(r.player.position, list)
    }
    for (const list of byPos.values()) {
      list.sort((a, b) => b.target - a.target)
      list.forEach((r, i) => rank.set(r.player.id, i + 1))
    }
    // Default (smart) order: pockets first (delta >= 4), each group richest target first.
    rows.sort((a, b) => {
      const ap = a.delta >= 4 ? 0 : 1
      const bp = b.delta >= 4 ? 0 : 1
      if (ap !== bp) return ap - bp
      return b.target - a.target
    })
    return { boardRows: rows.slice(0, 30), posRank: rank }
  }, [scoredPlayers, draftedNames])

  const rankLabel = (p: Player): string => {
    const r = p.ecrPositionRank ?? posRank.get(p.id)
    return r ? `${p.position}${r}` : p.position
  }

  // --- apply the active column sort on top of the smart default
  const sortedRows = useMemo(() => {
    if (sortKey === 'smart') return boardRows
    const dir = sortDir === 'asc' ? 1 : -1
    const rankOf = (p: Player) => p.ecrPositionRank ?? posRank.get(p.id) ?? 999
    const arr = [...boardRows]
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'star': {
          const av = isTarget(a.player.id) ? 1 : 0
          const bv = isTarget(b.player.id) ? 1 : 0
          return dir * (av - bv)
        }
        case 'rk': {
          const pc = a.player.position.localeCompare(b.player.position)
          if (pc !== 0) return pc
          return dir * (rankOf(a.player) - rankOf(b.player))
        }
        case 'name':
          return dir * a.player.name.localeCompare(b.player.name)
        case 'room':
          return dir * (a.room - b.room)
        case 'tgt':
          return dir * (a.target - b.target)
        case 'delta':
          return dir * (a.delta - b.delta)
        default:
          return 0
      }
    })
    return arr
  }, [boardRows, sortKey, sortDir, isTarget, posRank])

  const clickSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // text columns read best ascending; numbers read best high-to-low
      setSortDir(key === 'name' || key === 'rk' || key === 'star' ? 'asc' : 'desc')
    }
  }

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : '')

  // --- ON THE BLOCK player: the real nominee, or (sim/idle) the top board value
  const obPlayer = onBlockPlayer ?? boardRows[0]?.player ?? null

  const card = useMemo(() => {
    if (!obPlayer) return null
    const key = obPlayer.name.toLowerCase()
    const scored = scoredPlayers.find(sp => sp.player.id === obPlayer.id) ?? null
    const vr = computeValueRange(obPlayer)
    const ceil = vr.high
    const room = Math.round(obPlayer.expectedRoomPrice ?? vr.low)
    // One number Joe acts on: the disciplined max. The gauge dot sits here too,
    // so "Your number" and the target are the SAME value (no more mismatch).
    const yourNumber = maxBidMap.get(key) ?? Math.min(vr.base, maxBid)
    // Steal line: your number minus a margin (~15%, at least $3). Land him under
    // this and it is a clear bargain against your own ceiling.
    const stealUnder = Math.max(1, yourNumber - Math.max(3, Math.round(yourNumber * 0.15)))
    const alternatives = scoredPlayers
      .filter(
        sp =>
          sp.player.position === obPlayer.position &&
          sp.player.id !== obPlayer.id &&
          !draftedNames.has(sp.player.name.toLowerCase()),
      )
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 12)
    const scar = scarcity.find(s => s.position === obPlayer.position) ?? null
    const advice = computeWhatToDo({
      player: obPlayer,
      scored,
      myMaxBid: maxBidMap.get(key) ?? null,
      budgetMaxBid: myMaxBid,
      scarcity: scar,
      alternatives,
      isTarget: isTarget(obPlayer.id),
      isAvoid: isAvoid(obPlayer.id),
      avoidSeverity: avoidSeverity(obPlayer.id),
      rosterNote: rosterAdviceMap.get(key)?.note ?? null,
    })
    // Gauge axis: a price map from just under the steal line to the ceiling.
    const glo = Math.max(1, Math.min(stealUnder, room) - 4)
    const ghi = Math.max(ceil, yourNumber, glo + 1)
    const stealPct = clampPct(((stealUnder - glo) / (ghi - glo)) * 100)
    const tgtPct = clampPct(((yourNumber - glo) / (ghi - glo)) * 100)
    const move = advice.move
    const vdClass = move.toLowerCase()
    const big = advice.capValue != null ? `$${advice.capValue}` : titleCase(move)
    const sm =
      move === 'PASS'
        ? 'skip this one'
        : move === 'PUSH'
          ? 'go up to'
          : move === 'HOLD'
            ? 'or wait'
            : 'max bid'
    const tier = obPlayer.consensusTier > 0 ? `Tier ${Math.round(obPlayer.consensusTier)}` : null
    return {
      advice,
      ceil,
      room,
      yourNumber,
      stealUnder,
      stealPct,
      tgtPct,
      move,
      vdClass,
      big,
      sm,
      tier,
    }
  }, [
    obPlayer,
    scoredPlayers,
    draftedNames,
    scarcity,
    maxBidMap,
    rosterAdviceMap,
    myMaxBid,
    maxBid,
    isTarget,
    isAvoid,
    avoidSeverity,
  ])

  return (
    // Full-bleed: cancel the app-shell's p-4 padding + pb-24 so the room spans
    // the full mobile viewport the mockup was designed at, not the padded column.
    // The .ffi-live root flex-centers the inner max-w column on wide viewports.
    <div className="ffi-live -mx-4 -mt-4 -mb-24 min-h-dvh w-auto">
      <div className="w-full max-w-[430px]">
        {/* masthead */}
        <div className="mast">
          <div className="top">
            <div className="wordmark">
              NASTIES <span className="g">LIVE</span>
            </div>
            <span className="livedot">
              <i />
              On the clock
            </span>
            <div className="segwrap">
              <span className="seg">Board</span>
              <span className="seg on">Live</span>
            </div>
          </div>
        </div>

        {/* status / budget */}
        <div className="livebar">
          <div className="lb hi">
            <div className="k">Budget left</div>
            <div className="v">${budget}</div>
          </div>
          <div className="lb">
            <div className="k">Your max bid</div>
            <div className="v">${maxBid}</div>
          </div>
          <div className="lb">
            <div className="k">Roster</div>
            <div className="v">
              {filledSlots}
              <small>/{totalSlots}</small>
            </div>
          </div>
        </div>

        {/* needs */}
        <div className="needs">
          {chips.map(c => (
            <div key={c.pos} className={`nd ${c.on >= c.req ? 'set' : 'need'}`}>
              <span className={`pos ${c.pos}`}>{c.pos}</span>
              <span className="pips">
                {Array.from({ length: c.req }).map((_, i) => (
                  <i
                    key={i}
                    className={`pip ${i < c.on ? 'on' : ''}`}
                    style={i < c.on ? ({ color: POS_VAR[c.pos] } as CSSProperties) : undefined}
                  />
                ))}
              </span>
            </div>
          ))}
        </div>
        <div className="needline">
          {needParts.needStarters.length === 0 && needParts.flexFull ? (
            <>
              Starters <b>set</b>. Save your powder for depth and upside.
            </>
          ) : (
            <>
              {needParts.setStarters.length > 0 && (
                <>
                  {needParts.setStarters.join('/')} <b>set</b>
                  {needParts.flexFull && needParts.hasFlex ? ' (flex full)' : ''} {'·'}{' '}
                </>
              )}
              still need{' '}
              {needParts.needStarters.map((t, i) => (
                <span key={t.pos}>
                  <span style={{ color: POS_VAR[t.pos], fontWeight: 600 }}>
                    {t.n} {t.pos}
                  </span>
                  {i < needParts.needStarters.length - 1 ? ', ' : ''}
                </span>
              ))}
              {!needParts.flexFull && needParts.hasFlex ? ', flex' : ''} {'·'} keep the powder for
              them.
            </>
          )}
        </div>

        {/* ON THE BLOCK */}
        {obPlayer && card && (
          <div className="otb">
            <div className="otb-top">
              <span className="otb-kick">On the block</span>
              <button
                type="button"
                className="otb-toggle"
                aria-expanded={otbOpen}
                onClick={() => setOtbOpen(o => !o)}
              >
                {otbOpen ? 'Collapse' : 'Expand'}
                <span className="chev">{otbOpen ? '▲' : '▼'}</span>
              </button>
            </div>

            <div className="otb-head">
              <div className="otb-id">
                <span className={`otb-rk ${obPlayer.position}`}>{rankLabel(obPlayer)}</span>
                <div className="otb-nm">{obPlayer.name}</div>
                <div className="otb-sub">
                  {obPlayer.team} {'·'} BYE {obPlayer.byeWeek}
                </div>
              </div>
              {card.tier && <span className="otb-t1 t-3">{card.tier}</span>}
            </div>

            {!otbOpen && (
              <div className="otb-peek">
                <span className={`pk ${card.vdClass}`}>{titleCase(card.move)}</span>
                <span className="pkamt">
                  {card.big} {card.sm}
                </span>
                <span className="pkspacer" />
                <span className="pkline">
                  steal {'<'} ${card.stealUnder} {'·'} your ${card.yourNumber} {'·'} ceil $
                  {card.ceil}
                </span>
              </div>
            )}

            {otbOpen && (
              <>
                <div className="vitals">
                  <div className="keys">
                    <div className="key steal">
                      <div className="kk">Steal under</div>
                      <div className="kv">${card.stealUnder}</div>
                    </div>
                    <div className="key num">
                      <div className="kk">Your number</div>
                      <div className="kv">${card.yourNumber}</div>
                    </div>
                    <div className="key ceil">
                      <div className="kk">Ceiling</div>
                      <div className="kv">${card.ceil}</div>
                    </div>
                  </div>
                  <div className="gwrap">
                    <div
                      className="gauge"
                      style={
                        {
                          ['--steal']: `${card.stealPct}%`,
                          ['--tgt']: `${card.tgtPct}%`,
                        } as CSSProperties
                      }
                    >
                      <div className="track">
                        <div className="steal" />
                        <div className="band" />
                        <span className="stlab">{`STEAL < $${card.stealUnder}`}</span>
                        <span className="mk tgt" />
                      </div>
                    </div>
                    <div className="gcap">
                      <span className="l">Steal zone</span>
                      <span className="r">Your ceiling</span>
                    </div>
                  </div>
                </div>

                <div className={`vd ${card.vdClass}`}>
                  <span className="dot" />
                  <div className="vmain">
                    <div className="word">{titleCase(card.move)}</div>
                    <div className="why">{card.advice.rationale}</div>
                  </div>
                  <div className="amt">
                    <span className="big">{card.big}</span>
                    <span className="sm">{card.sm}</span>
                  </div>
                </div>

                <div className="advise">
                  <i />
                  The app reads. You place the bid in ESPN.
                </div>
              </>
            )}
          </div>
        )}

        {/* mini live board */}
        <div className="boardhd">
          <span className="t">The board {'·'} live</span>
          <span className="s">
            {sortKey === 'smart' ? 'pockets first' : 'sorted'} {'·'} drafted removed
          </span>
        </div>
        <div className="rowhd">
          <span
            className={`h ${sortKey === 'star' ? 'on' : ''}`}
            onClick={() => clickSort('star')}
          >
            {'★'}
            <span className="ar">{arrow('star')}</span>
          </span>
          <span className={`h ${sortKey === 'rk' ? 'on' : ''}`} onClick={() => clickSort('rk')}>
            POS<span className="ar">{arrow('rk')}</span>
          </span>
          <span
            className={`h ${sortKey === 'name' ? 'on' : ''}`}
            onClick={() => clickSort('name')}
          >
            PLAYER<span className="ar">{arrow('name')}</span>
          </span>
          <span
            className={`h r ${sortKey === 'room' ? 'on' : ''}`}
            onClick={() => clickSort('room')}
          >
            ROOM<span className="ar">{arrow('room')}</span>
          </span>
          <span
            className={`h r ${sortKey === 'tgt' ? 'on' : ''}`}
            onClick={() => clickSort('tgt')}
          >
            TGT<span className="ar">{arrow('tgt')}</span>
          </span>
          <span
            className={`h r ${sortKey === 'delta' ? 'on' : ''}`}
            onClick={() => clickSort('delta')}
          >
            +/-<span className="ar">{arrow('delta')}</span>
          </span>
        </div>
        <div className="list">
          {sortedRows.map(r => {
            const starred = isTarget(r.player.id)
            const onBlock = obPlayer != null && r.player.id === obPlayer.id
            const dCls = r.delta >= 4 ? 'up' : r.delta <= -4 ? 'dn' : 'fl'
            const dTxt =
              r.delta > 0 ? `+$${r.delta}` : r.delta < 0 ? `-$${Math.abs(r.delta)}` : 'even'
            return (
              <div
                key={r.player.id}
                className={`row ${r.delta >= 4 ? 'pocket' : ''} ${onBlock ? 'onblock' : ''}`}
              >
                <span className={`c-star ${starred ? 'on' : ''}`}>
                  {starred ? '★' : '☆'}
                </span>
                <span className={`c-rk ${r.player.position}`}>{rankLabel(r.player)}</span>
                <span className="c-name">
                  <span className="nm">
                    {r.player.name}
                    {onBlock && <span className="tag-ob">On block</span>}
                  </span>
                  <span className="tm">{r.player.team}</span>
                </span>
                <span className="c-room">${r.room}</span>
                <span className="c-tgt">${r.target}</span>
                <span className={`c-delta ${dCls}`}>{dTxt}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
