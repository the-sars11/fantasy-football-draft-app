'use client'

/**
 * Sim results presentational components (D5).
 *
 * Restyles the /prep/simulate screen into the SHIELD look, consuming R10b's
 * already-computed sim output (GradeSummary, ModalRoster[], LandedPlayer[]).
 * Everything here is presentation-only: no Monte-Carlo math, no grading, no
 * network calls. See sim-engine.ts / sim-grade.ts / sim-results.ts for where
 * these real numbers actually come from; this file never invents a value that
 * isn't traceable to one of those.
 *
 * Winning-team-% bars note: R10b's SimSummary does not expose raw per-run
 * rosters to the client (only the aggregated grade, the top-5 modal shapes,
 * and the all-sims "landed" list), so a per-individual-sim-run winning filter
 * isn't derivable here without an engine change (out of scope for D5). Instead
 * deriveWinningTeamLanded re-aggregates the already-exposed topRosters: shapes
 * whose avgWins meets or beats the headline modal record, weighted by each
 * shape's real frequencyPct. This is explicitly different from (and narrower
 * than) the raw all-sims "landed" list, per the "winning teams only, not raw
 * roster frequency" requirement. Coverage is limited to the up-to-5 modal
 * shapes R10b already surfaces, not all individual sim runs; the UI subtitle
 * says so.
 *
 * Copy rule (Joe): plain English, no em or en dashes anywhere in rendered
 * strings (enforced by the project's ESLint dash guard too).
 */

import { Fragment, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Trophy } from 'lucide-react'
import {
  FFICard,
  FFIButton,
  FFIBadge,
  FFIPositionBadge,
  FFIProgress,
  FFISectionHeader,
} from '@/components/ui/ffi-primitives'
import type { GradeSummary, ModalRoster, LandedPlayer } from '@/lib/draft/sim-grade'
import type { SimWonPlayer } from '@/lib/draft/sim-engine'

// ─── Small shared bits ────────────────────────────────────────────────────

function SimStatTile({
  label,
  value,
  compact = false,
}: {
  label: string
  value: string
  compact?: boolean
}) {
  return (
    <div>
      <div className={compact ? 'ffi-caption text-[var(--ffi-ink-3)]' : 'ffi-caption text-[var(--ffi-ink-3)]'}>
        {label}
      </div>
      <div
        className={
          compact
            ? 'font-mono text-sm font-semibold text-[var(--ffi-ink)] tabular-nums'
            : 'font-mono text-lg font-semibold text-[var(--ffi-ink)] tabular-nums'
        }
      >
        {value}
      </div>
    </div>
  )
}

// ─── Projected record hero ────────────────────────────────────────────────

export function SimRecordHero({
  grade,
  biasedPlayers,
}: {
  grade: GradeSummary
  biasedPlayers: number
}) {
  return (
    <FFICard variant="elevated">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="ffi-label text-[var(--ffi-ink-2)] flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-[var(--ffi-blue-bright)]" aria-hidden="true" />
            Projected record
          </div>
          <div className="font-display text-4xl text-[var(--ffi-ink)] mt-1 tracking-tight">
            {grade.modalRecord.wins}-{grade.modalRecord.losses}
          </div>
          <div className="ffi-caption text-[var(--ffi-ink-3)] mt-1">
            Most likely, {grade.modalRecord.frequencyPct}% of sims
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 text-right">
          <SimStatTile label="Avg wins" value={grade.meanWins.toFixed(1)} />
          <SimStatTile label="Avg rank" value={`#${grade.meanRank.toFixed(1)}`} />
          <SimStatTile label="Starter pts" value={grade.meanStarterPoints.toFixed(0)} />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--ffi-hairline)] text-xs text-[var(--ffi-ink-3)] leading-relaxed">
        Range {grade.worstRecord.wins}-{grade.worstRecord.losses} to {grade.bestRecord.wins}-{grade.bestRecord.losses}
        {' '}across {grade.runs} sims of a {grade.games} game season, {grade.numManagers} teams.
        {' '}Your seat biased toward {biasedPlayers} graded {biasedPlayers === 1 ? 'player' : 'players'}.
      </div>
    </FFICard>
  )
}

// ─── Winning-team-% bars ──────────────────────────────────────────────────

export interface WinningTeamLandedPlayer {
  id: string
  name: string
  position: SimWonPlayer['position']
  /** Share of winning-shape frequency this player appeared in (0..100, one decimal). */
  sharePct: number
}

function coreDetails(shape: ModalRoster): Array<{ id: string; name: string; position?: SimWonPlayer['position']; price?: number }> {
  const repById = new Map(shape.representative.map((p) => [p.id, p]))
  return shape.coreIds.map((id, i) => {
    const rep = repById.get(id)
    return { id, name: shape.coreNames[i] ?? rep?.name ?? id, position: rep?.position, price: rep?.price }
  })
}

/**
 * Derives "players who land on winning teams" from R10b's already-computed
 * topRosters. See the file header for the full rationale and the coverage
 * caveat (up to 5 modal shapes, not every individual sim run).
 */
export function deriveWinningTeamLanded(
  topRosters: ModalRoster[],
  grade: GradeSummary,
): WinningTeamLandedPlayer[] {
  const winThreshold = grade.modalRecord.wins
  const winningShapes = topRosters.filter((r) => r.avgWins >= winThreshold)
  if (winningShapes.length === 0) return []

  const totalFreq = winningShapes.reduce((sum, r) => sum + r.frequencyPct, 0)
  if (totalFreq <= 0) return []

  const acc = new Map<string, { name: string; position: SimWonPlayer['position']; freq: number }>()
  for (const shape of winningShapes) {
    for (const player of shape.representative) {
      const existing = acc.get(player.id)
      if (existing) {
        existing.freq += shape.frequencyPct
      } else {
        acc.set(player.id, { name: player.name, position: player.position, freq: shape.frequencyPct })
      }
    }
  }

  return Array.from(acc.entries())
    .map(([id, v]) => ({
      id,
      name: v.name,
      position: v.position,
      sharePct: Math.round((v.freq / totalFreq) * 1000) / 10,
    }))
    .sort((a, b) => b.sharePct - a.sharePct || a.name.localeCompare(b.name))
}

export function SimWinningTeamPlayers({
  topRosters,
  grade,
}: {
  topRosters: ModalRoster[]
  grade: GradeSummary
}) {
  const players = deriveWinningTeamLanded(topRosters, grade)
  if (players.length === 0) return null
  const top = players.slice(0, 12)
  return (
    <FFICard>
      <FFISectionHeader
        title="Winning team players"
        subtitle={`Share of ${grade.modalRecord.wins}-win-or-better sample shapes that landed them`}
      />
      <div className="mt-1 space-y-2.5">
        {top.map((p) => (
          <div key={p.id} className="flex items-center gap-3">
            <FFIPositionBadge position={p.position} />
            <span className="flex-1 text-sm font-medium text-[var(--ffi-ink)] truncate">{p.name}</span>
            <FFIProgress value={p.sharePct} className="w-24 shrink-0" />
            <span className="font-mono text-xs text-[var(--ffi-blue-bright)] w-12 text-right tabular-nums">
              {p.sharePct}%
            </span>
          </div>
        ))}
      </div>
    </FFICard>
  )
}

// ─── Sample-roster carousel (up to 5) ─────────────────────────────────────

export function SimRosterCarousel({ rosters, runs }: { rosters: ModalRoster[]; runs: number }) {
  const trackRef = useRef<HTMLDivElement>(null)

  if (rosters.length === 0) return null

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current
    if (!track) return
    const card = track.querySelector<HTMLElement>('[data-sim-roster-card]')
    const step = card ? card.offsetWidth + 12 : track.clientWidth * 0.85
    track.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  return (
    <FFICard>
      <FFISectionHeader
        title="Sample rosters"
        subtitle={`Top ${rosters.length} recurring shapes across ${runs} sims`}
        action={
          rosters.length > 1 ? (
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => scrollByCard(-1)}
                aria-label="Previous sample roster"
                className="h-11 w-11 rounded-full flex items-center justify-center bg-[var(--ffi-surface-1)] border border-[var(--ffi-hairline)] text-[var(--ffi-ink-2)] active:scale-95 transition-transform"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard(1)}
                aria-label="Next sample roster"
                className="h-11 w-11 rounded-full flex items-center justify-center bg-[var(--ffi-surface-1)] border border-[var(--ffi-hairline)] text-[var(--ffi-ink-2)] active:scale-95 transition-transform"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          ) : undefined
        }
      />
      <div
        ref={trackRef}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 scroll-smooth"
      >
        {rosters.map((r, i) => (
          <div
            key={i}
            data-sim-roster-card
            className="snap-start shrink-0 w-[82%] sm:w-[280px] rounded-2xl border border-[var(--ffi-hairline)] bg-[var(--ffi-surface-1)] p-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="ffi-label text-[var(--ffi-ink-2)]">Shape {i + 1}</span>
              <span className="font-mono text-sm font-semibold text-[var(--ffi-blue-bright)] tabular-nums">
                {r.frequencyPct}%
              </span>
            </div>
            <div className="text-xs text-[var(--ffi-ink-3)] mt-0.5">
              {r.frequency} of {runs} sims
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {coreDetails(r).length === 0 ? (
                <span className="text-xs text-[var(--ffi-ink-3)]">No stud tier picks, all value plays</span>
              ) : (
                coreDetails(r).map((c) => (
                  <FFIBadge key={c.id} position={c.position} className="text-[10px]">
                    {c.name}
                    {c.price != null ? ` $${c.price}` : ''}
                  </FFIBadge>
                ))
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-[var(--ffi-hairline)] grid grid-cols-3 gap-2 text-right">
              <SimStatTile label="Spent" value={`$${r.avgSpent}`} compact />
              <SimStatTile label="Wins" value={r.avgWins.toFixed(1)} compact />
              <SimStatTile label="Pts" value={r.avgStarterPoints.toFixed(0)} compact />
            </div>
          </div>
        ))}
      </div>
    </FFICard>
  )
}

// ─── Full representative roster (all 13 slots, grouped by position) ────────

/** Position order for the roster breakdown (QB, RB, WR, TE, then DEF/DST). */
const ROSTER_POS_ORDER: SimWonPlayer['position'][] = ['QB', 'RB', 'WR', 'TE', 'DEF']

interface RosterPosGroup {
  pos: SimWonPlayer['position']
  players: SimWonPlayer[]
  spend: number
}

/** Split one shape's representative roster into position groups (priced high to low). */
function groupRosterByPosition(players: SimWonPlayer[]): RosterPosGroup[] {
  return ROSTER_POS_ORDER.map((pos) => {
    const inPos = players
      .filter((p) => p.position === pos)
      .sort((a, b) => b.price - a.price || a.name.localeCompare(b.name))
    return { pos, players: inPos, spend: inPos.reduce((s, p) => s + p.price, 0) }
  }).filter((g) => g.players.length > 0)
}

/**
 * The full 13-man representative roster for a strategy, grouped by position with
 * the dollar paid on every slot, plus a spend-by-position "shape" strip so the
 * $200 split is visible at a glance. When a strategy produced more than one
 * recurring shape, a pill selector flips between them (each shows its own full
 * roster and how often it recurred). Every number is the engine's own
 * representative price or frequency; nothing is derived or invented here.
 *
 * This replaces the old core-only badge view (which showed just the 3-4 stud
 * names) so the leaderboard finally shows what a strategy actually rosters and
 * what it pays across the whole team.
 */
export function SimRosterDetail({
  rosters,
  runs,
  budget = 200,
}: {
  rosters: ModalRoster[]
  runs: number
  budget?: number
}) {
  const [shapeIdx, setShapeIdx] = useState(0)
  if (rosters.length === 0) return null

  const active = rosters[Math.min(shapeIdx, rosters.length - 1)]
  const players = active.representative
  const groups = groupRosterByPosition(players)
  const totalSpent = players.reduce((s, p) => s + p.price, 0)
  const left = Math.max(0, budget - totalSpent)

  return (
    <FFICard>
      <FFISectionHeader
        title="Full roster"
        subtitle={`All ${players.length} players this build lands, and what it pays for each`}
      />

      {rosters.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {rosters.map((r, i) => {
            const selected = i === shapeIdx
            return (
              <button
                key={i}
                type="button"
                onClick={() => setShapeIdx(i)}
                aria-pressed={selected}
                className="min-h-[44px] px-3 rounded-full border text-xs font-semibold tabular-nums transition-colors"
                style={{
                  background: selected ? 'var(--ffi-surface-3)' : 'var(--ffi-surface-1)',
                  borderColor: selected ? 'var(--ffi-hairline-bright)' : 'var(--ffi-hairline)',
                  color: selected ? 'var(--ffi-ink)' : 'var(--ffi-ink-2)',
                }}
              >
                Shape {i + 1} · {r.frequencyPct}%
              </button>
            )
          })}
        </div>
      )}

      {/* Spend-by-position shape strip: where the $200 goes. */}
      <div
        className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 pb-3"
        style={{ borderBottom: '1px solid var(--ffi-hairline)' }}
      >
        {groups.map((g) => (
          <div key={g.pos} className="flex items-baseline gap-1.5">
            <span className="ffi-caption text-[var(--ffi-ink-3)]">{g.pos}</span>
            <span className="font-mono text-xs font-semibold text-[var(--ffi-ink)] tabular-nums">
              ${g.spend}
            </span>
            <span className="ffi-caption text-[var(--ffi-ink-3)] tabular-nums">x{g.players.length}</span>
          </div>
        ))}
      </div>

      {/* Every slot, grouped by position, priced high to low. */}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.pos}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="ffi-caption text-[var(--ffi-ink-3)]">{g.pos}</span>
              <span className="font-mono text-[11px] text-[var(--ffi-ink-3)] tabular-nums">${g.spend}</span>
            </div>
            <div className="space-y-1">
              {g.players.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <FFIPositionBadge position={p.position} />
                  <span className="flex-1 text-sm font-medium text-[var(--ffi-ink)] truncate">{p.name}</span>
                  <span className="font-mono text-sm font-semibold text-[var(--ffi-ink)] w-12 text-right tabular-nums">
                    ${p.price}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-3 pt-3 flex items-baseline justify-between"
        style={{ borderTop: '1px solid var(--ffi-hairline)' }}
      >
        <div className="ffi-caption text-[var(--ffi-ink-3)]">
          {active.frequency} of {runs} sims{left > 0 ? ` · $${left} left` : ''}
        </div>
        <span className="font-mono text-sm font-semibold text-[var(--ffi-ink)] tabular-nums">
          ${totalSpent} of ${budget}
        </span>
      </div>
    </FFICard>
  )
}

// ─── Players you land most ────────────────────────────────────────────────

export function SimLandedTable({ landed }: { landed: LandedPlayer[] }) {
  if (landed.length === 0) return null
  const top = landed.slice(0, 20)
  return (
    <FFICard>
      <FFISectionHeader title="Players you land most" subtitle="Share of all sims you end up with them" />
      <div className="mt-1 divide-y divide-[var(--ffi-hairline)]">
        {top.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <FFIPositionBadge position={p.position} />
            <span className="flex-1 text-sm font-medium text-[var(--ffi-ink)] truncate">{p.name}</span>
            <span className="font-mono text-xs text-[var(--ffi-blue-bright)] w-12 text-right tabular-nums">
              {Math.round(p.landRate * 100)}%
            </span>
            <span className="font-mono text-xs text-[var(--ffi-ink-3)] w-12 text-right tabular-nums">
              ${p.avgPrice}
            </span>
          </div>
        ))}
      </div>
    </FFICard>
  )
}

// ─── Collapsible narrative (no em dashes) ─────────────────────────────────

export function SimNarrative({
  grade,
  topRosters,
  landed,
  biasedPlayers,
}: {
  grade: GradeSummary
  topRosters: ModalRoster[]
  landed: LandedPlayer[]
  biasedPlayers: number
}) {
  const [open, setOpen] = useState(false)
  const topShape = topRosters[0]
  const topLanded = landed[0]

  const sentences: string[] = [
    `Across ${grade.runs} sims of a ${grade.games} game season against ${grade.numManagers} teams, your seat `
      + `projects to ${grade.modalRecord.wins}-${grade.modalRecord.losses} most often, in ${grade.modalRecord.frequencyPct}% `
      + `of sims. Average finish is ${grade.meanWins.toFixed(1)} wins at rank ${grade.meanRank.toFixed(1)} of ${grade.numManagers}.`,
  ]
  if (topShape) {
    const coreText = topShape.coreNames.length > 0 ? topShape.coreNames.join(', ') : 'value plays across the board'
    sentences.push(
      `Your most repeated build centers on ${coreText}, recurring in ${topShape.frequencyPct}% of sims `
        + `and averaging ${topShape.avgWins.toFixed(1)} wins.`,
    )
  }
  if (topLanded) {
    sentences.push(
      `You land ${topLanded.name} most often, in ${Math.round(topLanded.landRate * 100)}% of sims `
        + `at an average price of $${topLanded.avgPrice}.`,
    )
  }
  if (biasedPlayers > 0) {
    sentences.push(
      `Your seat leaned toward ${biasedPlayers} graded ${biasedPlayers === 1 ? 'player' : 'players'} this run.`,
    )
  }

  return (
    <FFICard>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="ffi-title-lg text-[var(--ffi-ink)]">What this run says</span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--ffi-ink-2)] transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="mt-3 pt-3 border-t border-[var(--ffi-hairline)] space-y-2 text-sm text-[var(--ffi-ink-2)] leading-relaxed">
          {sentences.map((s, i) => (
            <p key={i}>{s}</p>
          ))}
        </div>
      )}
    </FFICard>
  )
}

// ─── Compare (current run vs a saved run) ─────────────────────────────────

export function SimCompareRows({
  current,
  currentLabel,
  other,
  otherLabel,
}: {
  current: GradeSummary
  currentLabel: string
  other: GradeSummary
  otherLabel: string
}) {
  const rows: [string, string, string][] = [
    [
      'Most likely record',
      `${current.modalRecord.wins}-${current.modalRecord.losses}`,
      `${other.modalRecord.wins}-${other.modalRecord.losses}`,
    ],
    ['Avg wins', current.meanWins.toFixed(1), other.meanWins.toFixed(1)],
    ['Avg rank', `#${current.meanRank.toFixed(1)}`, `#${other.meanRank.toFixed(1)}`],
    ['Avg starter pts', current.meanStarterPoints.toFixed(0), other.meanStarterPoints.toFixed(0)],
  ]
  return (
    <FFICard>
      <FFISectionHeader title="Compare" subtitle="This run vs a saved run" />
      <div className="mt-1 grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-2.5 text-sm items-baseline">
        <span />
        <span className="ffi-caption text-[var(--ffi-ink-3)] text-right truncate max-w-[110px]">{currentLabel}</span>
        <span className="ffi-caption text-[var(--ffi-ink-3)] text-right truncate max-w-[110px]">{otherLabel}</span>
        {rows.map(([label, a, b]) => (
          <Fragment key={label}>
            <span className="text-[var(--ffi-ink-2)]">{label}</span>
            <span className="font-mono text-right text-[var(--ffi-ink)] font-semibold tabular-nums">{a}</span>
            <span className="font-mono text-right text-[var(--ffi-ink-2)] tabular-nums">{b}</span>
          </Fragment>
        ))}
      </div>
    </FFICard>
  )
}

// ─── Saved runs ────────────────────────────────────────────────────────────

export interface SavedSimRunRow {
  id: string
  name: string
  createdAt: string
}

export function SimSavedRunsList({
  runs,
  onLoad,
}: {
  runs: SavedSimRunRow[]
  onLoad: (id: string) => void
}) {
  if (runs.length === 0) return null
  return (
    <FFICard>
      <FFISectionHeader title="Saved runs" subtitle="Reload a past run to compare" />
      <div className="mt-1 divide-y divide-[var(--ffi-hairline)]">
        {runs.map((run) => (
          <div key={run.id} className="flex items-center gap-3 py-2">
            <span className="flex-1 text-sm font-medium text-[var(--ffi-ink)] truncate">{run.name}</span>
            <span className="text-xs text-[var(--ffi-ink-3)] shrink-0">{run.createdAt}</span>
            <FFIButton onClick={() => onLoad(run.id)} variant="ghost" size="sm">
              <RotateCcw className="h-3.5 w-3.5 mr-1" aria-hidden="true" />
              Load
            </FFIButton>
          </div>
        ))}
      </div>
    </FFICard>
  )
}
