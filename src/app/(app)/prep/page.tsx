'use client'

/**
 * Research landing (`/prep`) — D2 redesign (2026-08-15).
 *
 * Hierarchy FLIP: the four destinations Joe lives in for weeks are the heroes —
 * Players · Cheat Sheet · Strategies · Sims — each a rich row with a glanceable
 * real stat. The AI "Player Pull" (run 2-4x/year) is DEMOTED to a subordinate
 * "Data" strip at the bottom: freshness at a glance, one plain line of what a
 * pull produces, and a quiet action.
 *
 * Cost guard: the pull fires the research pipeline behind an inline confirm,
 * never auto-run. It's a free data pull (no AI credits) — the confirm says so.
 *
 * Reference: row destinations pattern (quiet labels, one accent,
 * subordinate utilities). Rows, not a card grid (Joe's stated FF UI rule).
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  BarChart3,
  Layers,
  Activity,
  Trophy,
  ChevronRight,
  Play,
  Target,
  ShieldAlert,
  RotateCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageTitle, Nameplate, IconChip } from '@/components/ui/shield'
import { markPullComplete } from '@/lib/prep/pull-signal'

const NASTIES = 'The Nasties'

interface League {
  id: string
  name: string
  format: string
  team_count: number
  budget: number | null
}

interface RunListItem {
  id: string
  status: string
  created_at: string
  completed_at: string | null
  strategy_settings: { name?: string; archetype?: string }
}

interface ScoredPlayerSummary {
  id: string
  name: string
  team: string
  position: string
  consensusValue: number
  strategyScore: number
}

interface RunDetail {
  id: string
  status: string
  results: {
    analysis: {
      totalPlayers: number
      targets: ScoredPlayerSummary[]
      avoids: ScoredPlayerSummary[]
      byPosition: Record<string, ScoredPlayerSummary[]>
    }
  } | null
}

interface CacheStatus {
  totalPlayers: number
  lastUpdated: string | null
  isStale: boolean
}

type Phase = 'loading' | 'empty' | 'ready' | 'error'

/** Optional glanceable metric shown on the right of a destination row. */
type Metric = { value: string; label: string } | { badge: string } | null

function lastName(full: string): string {
  const parts = full.trim().split(/\s+/)
  return parts.length > 1 ? parts.slice(1).join(' ') : full
}

const POS_COLOR: Record<string, string> = {
  QB: '#ff6b8b',
  RB: '#56E0A0',
  WR: '#79a6ff',
  TE: '#ffb05c',
  DEF: '#b79cff',
  DST: '#b79cff',
  K: '#9fb0ce',
}

export default function PrepPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [league, setLeague] = useState<League | null>(null)
  const [cache, setCache] = useState<CacheStatus | null>(null)
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [strategyCount, setStrategyCount] = useState<number | null>(null)

  // Player Pull cost guard: idle → confirm → running.
  const [runState, setRunState] = useState<'idle' | 'confirm' | 'running'>('idle')
  const [runError, setRunError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setPhase('loading')
    try {
      const [lgRes, stRes] = await Promise.all([
        fetch('/api/leagues'),
        fetch('/api/players/status'),
      ])
      if (!lgRes.ok) throw new Error('leagues')
      const lgData = await lgRes.json()
      const lg: League | null = lgData.leagues?.[0] ?? null
      setLeague(lg)
      setCache(stRes.ok ? await stRes.json() : null)

      if (!lg) {
        setPhase('empty')
        return
      }

      // Runs + saved-strategy count in parallel (both need the league id).
      const [runsRes, stratRes] = await Promise.all([
        fetch(`/api/research?leagueId=${lg.id}`),
        fetch(`/api/strategies?leagueId=${lg.id}`),
      ])
      if (!runsRes.ok) throw new Error('runs')
      const runsData = await runsRes.json()
      const runs: RunListItem[] = runsData.runs ?? []

      if (stratRes.ok) {
        const stratData = await stratRes.json()
        setStrategyCount(Array.isArray(stratData.strategies) ? stratData.strategies.length : null)
      } else {
        setStrategyCount(null)
      }

      const latest = runs.find((r) => r.status === 'completed') ?? null

      if (!latest) {
        setDetail(null)
        setPhase('empty')
        return
      }

      const detRes = await fetch(`/api/research/${latest.id}`)
      const detData = detRes.ok ? await detRes.json() : null
      setDetail(detData?.run ?? null)
      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function doRun() {
    if (!league) return
    setRunState('running')
    setRunError(null)
    try {
      const res = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id, skipRefresh: false }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Research failed')
      // Signal the fresh pool so /prep/strategies re-flows its proposals.
      markPullComplete(league.id)
      setRunState('idle')
      await load()
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Research failed')
      setRunState('idle')
    }
  }

  // Guard the whole chain: non-research rows (sim/dataset/plan) have no
  // `analysis` key, so an unguarded `.analysis.targets` would throw. The
  // API filter below should keep them out of this list, but never crash the
  // hub if one slips through.
  const targets = detail?.results?.analysis?.targets ?? []
  const avoids = detail?.results?.analysis?.avoids ?? []

  // Real glanceable metrics for the destination rows — no fabricated numbers.
  const playersMetric: Metric = cache
    ? { value: cache.totalPlayers.toLocaleString(), label: 'in pool' }
    : null
  const cheatMetric: Metric = targets[0]
    ? { value: '#1', label: lastName(targets[0].name) }
    : null
  const strategiesMetric: Metric =
    strategyCount && strategyCount > 0 ? { value: String(strategyCount), label: 'saved' } : null
  const simsMetric: Metric = { badge: 'New' }
  const leaderboardMetric: Metric = { badge: 'New' }

  return (
    <div className="pb-2">
      {/* ── Screen header ─────────────────────────────────────── */}
      <p
        className="font-bold text-[10px] uppercase mb-1"
        style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.32em', color: 'var(--ffi-ink-3)' }}
      >
        Draft Advisor
      </p>
      <div className="flex items-end justify-between mb-1">
        <PageTitle className="text-[34px] leading-none">Research</PageTitle>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{
            fontFamily: 'var(--font-cond)',
            background: 'rgba(95,168,224,0.10)',
            border: '1px solid rgba(95,168,224,0.20)',
            color: 'var(--ffi-blue-bright)',
            letterSpacing: '0.14em',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: 'var(--ffi-volt)', boxShadow: '0 0 6px var(--ffi-volt-glow)' }}
          />
          {NASTIES}
        </span>
      </div>

      {/* ── Destinations (the heroes) ─────────────────────────── */}
      <QuietLabel>Where you work</QuietLabel>
      <div className="space-y-2.5">
        <DestRow
          href="/prep/players"
          icon={Search}
          label="Players"
          sub="Search &amp; scan the full pool"
          metric={playersMetric}
        />
        <DestRow
          href="/prep/board"
          icon={BarChart3}
          label="Cheat Sheet"
          sub="Ranked, position-colored board"
          metric={cheatMetric}
        />
        <DestRow
          href="/prep/strategies"
          icon={Layers}
          label="Strategies"
          sub="Budget-by-position plans"
          metric={strategiesMetric}
        />
        <DestRow
          href="/prep/simulate"
          icon={Activity}
          label="Sims"
          sub="Mock the auction, see your rosters"
          metric={simsMetric}
        />
        <DestRow
          href="/prep/leaderboard"
          icon={Trophy}
          label="Leaderboard"
          sub="Every strategy, ranked by projected wins"
          metric={leaderboardMetric}
        />
      </div>

      {/* ── Latest-run highlights (glanceable value) ──────────── */}
      {phase === 'ready' && (targets.length > 0 || avoids.length > 0) && (
        <>
          <QuietLabel>Latest run highlights</QuietLabel>
          <div className="space-y-2">
            {targets.length > 0 && (
              <HighlightCard
                href="/prep/board"
                accent="var(--ffi-gold-bright)"
                accentBg="rgba(166,60,65,0.12)"
                icon={<Target className="w-4 h-4" strokeWidth={2} color="var(--ffi-gold-bright)" />}
                title="Top targets"
                players={targets.slice(0, 5)}
              />
            )}
            {avoids.length > 0 && (
              <HighlightCard
                href="/prep/board"
                accent="var(--ffi-warning)"
                accentBg="rgba(255,176,92,0.10)"
                icon={<ShieldAlert className="w-4 h-4" strokeWidth={2} color="var(--ffi-warning)" />}
                title="Steer clear"
                players={avoids.slice(0, 3)}
              />
            )}
          </div>
        </>
      )}

      {/* ── Data: the demoted Player Pull utility ─────────────── */}
      <QuietLabel>Data</QuietLabel>
      {phase === 'loading' ? (
        <PullSkeleton />
      ) : phase === 'error' ? (
        <div className="ffi-nameplate p-4">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-[18px] h-[18px]" color="var(--ffi-warning)" strokeWidth={2} />
            <p className="font-bold text-[14px]" style={{ color: 'var(--ffi-ink)' }}>
              Couldn&apos;t reach the player database
            </p>
          </div>
          <p className="text-[12px] mt-1.5" style={{ color: 'var(--ffi-ink-2)' }}>
            Check your connection and try again.
          </p>
          <button
            onClick={load}
            className="ffi-btn-secondary w-full mt-3 text-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
            style={{ borderRadius: '11px', padding: '0.7rem' }}
          >
            <RotateCw className="w-[14px] h-[14px]" strokeWidth={2.5} color="var(--ffi-ink-2)" />
            Retry
          </button>
        </div>
      ) : (
        <div className="ffi-nameplate p-3.5">
          {/* Status row */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(95,168,224,0.10)',
                border: '1px solid rgba(95,168,224,0.22)',
              }}
            >
              <RotateCw className="w-[15px] h-[15px]" strokeWidth={2} color="var(--ffi-blue-bright)" />
            </div>
            <div className="min-w-0">
              <p
                className="font-bold text-[13px] leading-tight"
                style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)', letterSpacing: '0.02em' }}
              >
                Player Pull
              </p>
              <p
                className="text-[11px] leading-tight mt-0.5 tabular-nums"
                style={{ color: 'var(--ffi-ink-3)' }}
              >
                {cache ? `${cache.totalPlayers.toLocaleString()} players` : 'No pool yet'}
                {cache?.lastUpdated
                  ? ` · updated ${new Date(cache.lastUpdated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}`
                  : ''}
              </p>
            </div>
            {cache && (
              <span
                className="ml-auto shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase"
                style={{
                  fontFamily: 'var(--font-cond)',
                  letterSpacing: '0.1em',
                  ...(cache.isStale
                    ? {
                        background: 'rgba(255,176,92,0.12)',
                        color: 'var(--ffi-warning)',
                        border: '1px solid rgba(255,176,92,0.24)',
                      }
                    : {
                        background: 'rgba(86,224,160,0.10)',
                        color: '#56E0A0',
                        border: '1px solid rgba(86,224,160,0.28)',
                      }),
                }}
              >
                {cache.isStale ? 'Stale' : 'Fresh'}
              </span>
            )}
          </div>

          {/* What a pull produces — one plain line */}
          <p
            className="text-[11px] leading-[1.45] mt-2.5 pt-2.5"
            style={{ borderTop: '1px solid var(--ffi-hairline)', color: 'var(--ffi-ink-2)' }}
          >
            One pull refreshes{' '}
            <span style={{ color: 'var(--ffi-ink)', fontWeight: 600 }}>
              projections, injury &amp; starting roles, consensus ranks, auction values, tiers, and
              sleepers/breakouts/busts
            </span>{' '}
            for the Nasties&apos; scoring.
          </p>

          {/* Action + cost guard */}
          {runState === 'confirm' ? (
            <div
              className="mt-3 rounded-[11px] p-3"
              style={{ background: 'rgba(95,168,224,0.06)', border: '1px solid rgba(95,168,224,0.20)' }}
            >
              <p className="text-[12px] leading-[1.4]" style={{ color: 'var(--ffi-ink)' }}>
                Pulls fresh data from ESPN, Sleeper &amp; FantasyPros and re-scores every player.
                Takes 30-60 seconds. No AI credits used.
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={() => setRunState('idle')}
                  className="ffi-btn-secondary flex-1 text-[12px] font-bold"
                  style={{ borderRadius: '10px', padding: '0.6rem' }}
                >
                  Cancel
                </button>
                <button
                  onClick={doRun}
                  className="ffi-btn-hero flex-1 text-[12px] uppercase tracking-widest"
                  style={{ borderRadius: '10px' }}
                >
                  Run pull
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRunState('confirm')}
              disabled={runState === 'running'}
              className="ffi-btn-secondary w-full mt-3 text-[12px] font-bold uppercase tracking-widest disabled:opacity-70 flex items-center justify-center gap-2"
              style={{ borderRadius: '11px', padding: '0.7rem', fontFamily: 'var(--font-cond)', letterSpacing: '0.14em' }}
            >
              {runState === 'running' ? (
                <>
                  <Loader2 className="w-[14px] h-[14px] animate-spin" color="var(--ffi-ink-2)" />
                  Pulling…
                </>
              ) : (
                <>
                  <Play className="w-[13px] h-[13px]" strokeWidth={2.5} color="var(--ffi-ink-2)" />
                  {/* Key the label off `cache` (the player pool) -- the same
                      source as the "N players · Fresh/Stale" badge above. A
                      fresh pool means a pull already ran; keying off a saved
                      analysis run instead showed "Run first pull" while the
                      badge said "3,150 · Fresh" -- contradictory copy. */}
                  {cache ? 'Pull fresh data' : 'Run first pull'}
                </>
              )}
            </button>
          )}
          <p
            className="text-[9px] text-center mt-2 uppercase"
            style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink-3)', letterSpacing: '0.16em' }}
          >
            Free data pull · no AI credits
          </p>

          {runError && (
            <p className="text-[12px] mt-2 text-center" style={{ color: 'var(--ffi-warning)' }}>
              {runError}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function QuietLabel({ children }: { children: string }) {
  return (
    <p
      className="font-bold text-[10px] uppercase mt-6 mb-2.5"
      style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.28em', color: 'var(--ffi-ink-3)' }}
    >
      {children}
    </p>
  )
}

function DestRow({
  href,
  icon,
  label,
  sub,
  metric,
}: {
  href: string
  icon: LucideIcon
  label: string
  sub: string
  metric: Metric
}) {
  return (
    <Link href={href} className="block active:scale-[0.99] transition-transform duration-150">
      <Nameplate interactive className="flex items-center gap-3.5 p-[15px]">
        <IconChip icon={icon} size="md" className="h-11 w-11 rounded-[12px]" />
        <div className="flex-1 min-w-0">
          <p className="ffi-title-chrome text-[17px] leading-none">{label}</p>
          <p className="text-[12px] mt-1 truncate" style={{ color: 'var(--ffi-ink-2)' }}>
            {sub}
          </p>
        </div>
      {metric && 'badge' in metric ? (
        <span
          className="shrink-0 rounded-md px-1.5 py-1 text-[11px] font-bold uppercase"
          style={{
            fontFamily: 'var(--font-cond)',
            letterSpacing: '0.12em',
            color: 'var(--ffi-blue-bright)',
            background: 'rgba(95,168,224,0.08)',
            border: '1px solid rgba(95,168,224,0.30)',
          }}
        >
          {metric.badge}
        </span>
      ) : metric ? (
        <div className="text-right shrink-0">
          <p
            className="font-bold text-[19px] leading-none tabular-nums"
            style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
          >
            {metric.value}
          </p>
          <p
            className="text-[9px] uppercase mt-1"
            style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.12em', color: 'var(--ffi-ink-3)', fontWeight: 600 }}
          >
            {metric.label}
          </p>
        </div>
      ) : null}
        <ChevronRight
          className="w-4 h-4 shrink-0 opacity-30"
          color="var(--ffi-ink-2)"
          strokeWidth={2}
        />
      </Nameplate>
    </Link>
  )
}

function HighlightCard({
  href,
  accent,
  accentBg,
  icon,
  title,
  players,
}: {
  href: string
  accent: string
  accentBg: string
  icon: React.ReactNode
  title: string
  players: ScoredPlayerSummary[]
}) {
  return (
    <Link href={href} className="block active:scale-[0.99] transition-transform duration-150">
      <Nameplate interactive className="p-3.5">
      <div className="flex items-center gap-2 mb-2.5">
        <div
          className="w-6 h-6 rounded-[7px] flex items-center justify-center"
          style={{ background: accentBg }}
        >
          {icon}
        </div>
        <p
          className="font-bold text-[11px] uppercase flex-1"
          style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.16em', color: accent }}
        >
          {title}
        </p>
        <ChevronRight className="w-4 h-4 opacity-35" color="var(--ffi-ink-2)" strokeWidth={2} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {players.map((p) => (
          <span
            key={p.id}
            className="inline-flex items-center gap-1.5 rounded-full pl-1.5 pr-2.5 py-1 text-[12px]"
            style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
          >
            <span
              className="rounded-[5px] px-1 text-[9px] font-bold"
              style={{
                fontFamily: 'var(--font-mono)',
                background: `${POS_COLOR[p.position] ?? '#9fb0ce'}22`,
                color: POS_COLOR[p.position] ?? '#9fb0ce',
              }}
            >
              {p.position}
            </span>
            <span className="font-semibold" style={{ color: 'var(--ffi-ink)' }}>
              {p.name}
            </span>
          </span>
        ))}
      </div>
      </Nameplate>
    </Link>
  )
}

function PullSkeleton() {
  return (
    <div className="ffi-nameplate p-3.5">
      <div className="flex items-center gap-2.5">
        <div className="ffi-skeleton w-[30px] h-[30px] rounded-[9px]" />
        <div className="flex-1">
          <div className="ffi-skeleton h-3 w-24 rounded-full" />
          <div className="ffi-skeleton h-2.5 w-36 rounded-full mt-2" />
        </div>
      </div>
      <div className="ffi-skeleton h-3 w-full rounded mt-3" />
      <div className="ffi-skeleton h-9 w-full rounded-xl mt-3" />
    </div>
  )
}
