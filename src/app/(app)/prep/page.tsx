'use client'

/**
 * Research landing (`/prep`) — UX-S3, blueprint 9.1.
 *
 * Replaces the old card-dump hub. ONE hero: the Research Run panel (status +
 * the single primary action). Below it, three quiet jump rows to the Research
 * sub-screens, then latest-run highlights (only when a completed run exists).
 *
 * Cost guard: `Run Research` fires Claude API calls — it is ALWAYS an explicit
 * tap behind an inline confirm, never auto-run. The button carries a "uses AI"
 * hint. Nothing here triggers the POST without the user confirming.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  BarChart3,
  Layers,
  ChevronRight,
  Sparkles,
  Play,
  Target,
  ShieldAlert,
  RotateCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

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

function relTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const min = Math.floor((Date.now() - then) / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  const [latestRun, setLatestRun] = useState<RunListItem | null>(null)
  const [detail, setDetail] = useState<RunDetail | null>(null)

  // Run Research cost guard: idle → confirm → running.
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

      const runsRes = await fetch(`/api/research?leagueId=${lg.id}`)
      if (!runsRes.ok) throw new Error('runs')
      const runsData = await runsRes.json()
      const runs: RunListItem[] = runsData.runs ?? []

      const latest = runs.find((r) => r.status === 'completed') ?? null
      setLatestRun(latest)

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
      setRunState('idle')
      await load()
    } catch (e) {
      setRunError(e instanceof Error ? e.message : 'Research failed')
      setRunState('idle')
    }
  }

  const analyzed = detail?.results?.analysis.totalPlayers ?? null
  const targets = detail?.results?.analysis.targets ?? []
  const avoids = detail?.results?.analysis.avoids ?? []

  return (
    <div className="pb-2">
      {/* ── Screen header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h1
          className="font-extrabold text-[26px] leading-none"
          style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
        >
          Research
        </h1>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
          style={{
            fontFamily: 'var(--font-cond)',
            background: 'rgba(121,166,255,0.10)',
            border: '1px solid rgba(121,166,255,0.20)',
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

      {/* ── Hero: Research Run panel ──────────────────────────── */}
      {phase === 'loading' ? (
        <HeroSkeleton />
      ) : phase === 'error' ? (
        <div className="ffi-hero p-5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5" color="var(--ffi-warning)" strokeWidth={2} />
            <p
              className="font-extrabold text-[19px]"
              style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
            >
              Couldn&apos;t reach the research engine
            </p>
          </div>
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--ffi-ink-2)' }}>
            The player database didn&apos;t respond. Check your connection and try again.
          </p>
          <button
            onClick={load}
            className="ffi-btn-hero w-full mt-4 text-[14px] uppercase tracking-widest"
            style={{ borderRadius: '12px' }}
          >
            <RotateCw className="w-[15px] h-[15px]" strokeWidth={2.5} color="var(--ffi-volt-ink)" />
            Retry
          </button>
        </div>
      ) : (
        <div className="ffi-hero p-5">
          <p
            className="font-bold text-[10px] uppercase flex items-center gap-1.5"
            style={{
              fontFamily: 'var(--font-cond)',
              letterSpacing: '0.26em',
              color: 'var(--ffi-blue-bright)',
            }}
          >
            <Sparkles className="w-3 h-3" strokeWidth={2.4} />
            Analysis Engine
          </p>

          {phase === 'ready' && latestRun ? (
            <>
              <p
                className="font-extrabold text-[24px] leading-[1.08] mt-1.5"
                style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
              >
                Last run {relTime(latestRun.completed_at ?? latestRun.created_at)}
              </p>
              <p className="text-[13px] leading-[1.45] mt-1" style={{ color: 'var(--ffi-ink-2)' }}>
                {analyzed != null ? `${analyzed.toLocaleString()} players analyzed` : 'Analysis saved'}
                {latestRun.strategy_settings?.name
                  ? ` · ${latestRun.strategy_settings.name}`
                  : ''}
              </p>
            </>
          ) : (
            <>
              <p
                className="font-extrabold text-[24px] leading-[1.08] mt-1.5"
                style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
              >
                Run your first research
              </p>
              <p className="text-[13px] leading-[1.45] mt-1" style={{ color: 'var(--ffi-ink-2)' }}>
                Pull ESPN, Sleeper &amp; FantasyPros, then rank and value every player for the
                Nasties&apos; exact scoring: targets, avoids, and tiers in one pass.
              </p>
            </>
          )}

          {/* Pool status line — real cache data, subordinate to run status */}
          {cache && (
            <div
              className="flex items-center gap-2 mt-3 pt-3 text-[11px]"
              style={{ borderTop: '1px solid var(--ffi-hairline)', color: 'var(--ffi-ink-3)' }}
            >
              <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>
                {cache.totalPlayers.toLocaleString()} players in pool
              </span>
              {cache.lastUpdated && (
                <>
                  <span>·</span>
                  <span>
                    updated{' '}
                    {new Date(cache.lastUpdated).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </>
              )}
              {cache.isStale && (
                <span
                  className="ml-auto rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{
                    background: 'rgba(255,176,92,0.12)',
                    color: 'var(--ffi-warning)',
                    letterSpacing: '0.1em',
                  }}
                >
                  Stale
                </span>
              )}
            </div>
          )}

          {/* Primary action + cost guard */}
          {runState === 'confirm' ? (
            <div
              className="mt-4 rounded-[12px] p-3.5"
              style={{
                background: 'rgba(139,255,69,0.06)',
                border: '1px solid rgba(139,255,69,0.20)',
              }}
            >
              <p className="text-[13px] leading-[1.4]" style={{ color: 'var(--ffi-ink)' }}>
                This pulls fresh data from ESPN, Sleeper &amp; FantasyPros, then scores every player
                for your league settings. Takes 30-60 seconds. No AI credits used.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setRunState('idle')}
                  className="ffi-btn-secondary flex-1 text-[13px] font-bold"
                  style={{ borderRadius: '11px', padding: '0.7rem' }}
                >
                  Cancel
                </button>
                <button
                  onClick={doRun}
                  className="ffi-btn-hero flex-1 text-[13px] uppercase tracking-widest"
                  style={{ borderRadius: '11px' }}
                >
                  Run analysis
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setRunState('confirm')}
              disabled={runState === 'running'}
              className="ffi-btn-hero w-full mt-4 text-[14px] uppercase tracking-widest disabled:opacity-70"
              style={{ borderRadius: '12px' }}
            >
              {runState === 'running' ? (
                <>
                  <Loader2 className="w-[15px] h-[15px] animate-spin" color="var(--ffi-volt-ink)" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Play className="w-[14px] h-[14px]" strokeWidth={2.5} color="var(--ffi-volt-ink)" />
                  {latestRun ? 'Run research again' : 'Run research'}
                </>
              )}
            </button>
          )}
          <p
            className="text-[10px] text-center mt-2 uppercase tracking-wider"
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

      {/* ── Jump-to rows ──────────────────────────────────────── */}
      <QuietLabel>Jump to</QuietLabel>
      <div className="space-y-2">
        <JumpRow
          href="/prep/players"
          icon={<Search className="w-[18px] h-[18px]" strokeWidth={1.8} color="#56E0A0" />}
          iconBg="rgba(86,224,160,0.10)"
          label="Player Browser"
          sub="Search and scan the full pool"
        />
        <JumpRow
          href="/prep/board"
          icon={<BarChart3 className="w-[18px] h-[18px]" strokeWidth={1.8} color="var(--ffi-blue-bright)" />}
          iconBg="rgba(121,166,255,0.10)"
          label="Cheat Sheet"
          sub="Your ranked, position-colored board - for reference during the live draft"
        />
        <JumpRow
          href="/prep/strategies"
          icon={<Layers className="w-[18px] h-[18px]" strokeWidth={1.8} color="var(--ffi-volt)" />}
          iconBg="rgba(139,255,69,0.10)"
          label="Strategies"
          sub="Set budget-by-position targets"
        />
      </div>

      {/* ── Latest-run highlights (only when a run exists) ────── */}
      {phase === 'ready' && (targets.length > 0 || avoids.length > 0) && (
        <>
          <QuietLabel>Latest run highlights</QuietLabel>
          <div className="space-y-2">
            {targets.length > 0 && (
              <HighlightCard
                href="/prep/board"
                accent="var(--ffi-volt)"
                accentBg="rgba(139,255,69,0.10)"
                icon={<Target className="w-4 h-4" strokeWidth={2} color="var(--ffi-volt)" />}
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
    </div>
  )
}

function QuietLabel({ children }: { children: string }) {
  return (
    <p
      className="font-bold text-[10px] uppercase mt-6 mb-2.5"
      style={{
        fontFamily: 'var(--font-cond)',
        letterSpacing: '0.28em',
        color: 'var(--ffi-ink-3)',
      }}
    >
      {children}
    </p>
  )
}

function JumpRow({
  href,
  icon,
  iconBg,
  label,
  sub,
}: {
  href: string
  icon: React.ReactNode
  iconBg: string
  label: string
  sub: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 rounded-[13px] p-3.5 transition-all duration-150 active:scale-[0.99]"
      style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)' }}
    >
      <div
        className="w-10 h-10 rounded-[11px] flex items-center justify-center shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="font-extrabold text-[15px] leading-tight"
          style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
        >
          {label}
        </p>
        <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ffi-ink-2)' }}>
          {sub}
        </p>
      </div>
      <ChevronRight className="w-[18px] h-[18px] shrink-0 opacity-35" color="var(--ffi-ink-2)" strokeWidth={2} />
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
    <Link
      href={href}
      className="block rounded-[13px] p-3.5 transition-all duration-150 active:scale-[0.99]"
      style={{ background: 'var(--ffi-surface-1)', border: '1px solid var(--ffi-hairline)' }}
    >
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
    </Link>
  )
}

function HeroSkeleton() {
  return (
    <div className="ffi-hero p-5">
      <div className="ffi-skeleton h-3 w-28 rounded-full" />
      <div className="ffi-skeleton h-7 w-52 rounded-lg mt-3" />
      <div className="ffi-skeleton h-4 w-full rounded mt-2.5" />
      <div className="ffi-skeleton h-4 w-2/3 rounded mt-1.5" />
      <div className="ffi-skeleton h-12 w-full rounded-xl mt-4" />
    </div>
  )
}
