'use client'

/**
 * Draft — pre-Go-Live "Go Live" screen (`/draft`) — UX-S4, blueprint 9.5.
 *
 * The Draft tab is the live auction room ONLY. This is its pre-draft face: ONE
 * hero — the connection block — with the 4-state status in plain words, a single
 * primary action (Go Live), a demoted Manual-mode text button, and a tiny
 * pre-flight line (which league / managers, link to Setup if something's wrong).
 *
 * FF-314: the hero polls this repo's server proxy (`/api/auctioneer-feed`) via
 * useRemoteAuctioneerFeed to auto-detect a live auctioneer over the internet, so
 * a phone at the draft table lights up the moment the host goes live. Manual mode
 * is always available so Joe is never blocked when the auctioneer isn't up.
 *
 * Client owns its own header (page.tsx wrappers must NOT add one — double-header bug).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Radio,
  Gavel,
  Hand,
  AlertTriangle,
  RotateCw,
  Settings2,
  Loader2,
} from 'lucide-react'
import { ConnectionStatusPill } from '@/components/draft/connection-status-pill'
import { useRemoteAuctioneerFeed } from '@/hooks/use-remote-auctioneer-feed'

interface League {
  id: string
  name: string
  format: string
  team_count: number
  budget: number | null
  scoring_format: string | null
}

interface DraftSessionRow {
  id: string
  league_id: string
  format: string
  status: string
  created_at: string
}

type Phase = 'loading' | 'no-league' | 'ready' | 'error'

export default function DraftPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('loading')
  const [league, setLeague] = useState<League | null>(null)
  const [session, setSession] = useState<DraftSessionRow | null>(null)
  const [errorExpanded, setErrorExpanded] = useState(false)
  // DR-5.1: cold-start auto-create — no /draft/setup detour when the auctioneer is live.
  const [autoCreating, setAutoCreating] = useState(false)
  const [autoCreateError, setAutoCreateError] = useState<string | null>(null)
  const autoCreateAttempted = useRef(false)

  // FF-314: auto-detect a live auctioneer over the internet (auction-only).
  const remote = useRemoteAuctioneerFeed({ enabled: true })

  const load = useCallback(async () => {
    setPhase('loading')
    try {
      const lgRes = await fetch('/api/leagues')
      if (!lgRes.ok) throw new Error('leagues')
      const lgData = await lgRes.json()
      const lg: League | null = lgData.leagues?.[0] ?? null
      setLeague(lg)

      if (!lg) {
        setPhase('no-league')
        return
      }

      // Find a resumable auction session for this league (most recent, not done).
      try {
        const sessRes = await fetch('/api/draft/sessions')
        if (sessRes.ok) {
          const sessData = await sessRes.json()
          const rows: DraftSessionRow[] = sessData.sessions ?? []
          const resumable =
            rows.find(
              (s) =>
                s.league_id === lg.id &&
                s.format === 'auction' &&
                s.status !== 'completed',
            ) ?? null
          setSession(resumable)
        }
      } catch {
        // Sessions are optional here — Go Live falls back to Draft Setup.
      }

      setPhase('ready')
    } catch {
      setPhase('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  // DR-5.1: when the auctioneer is detected live with no resumable session,
  // auto-create one seeded with the auctioneer's real team names -- so
  // `applyPick` (state.ts) can match manager names exactly and budgets/rosters
  // track correctly (DR-5.2) -- and Go Live drops straight into the room.
  useEffect(() => {
    if (phase !== 'ready' || !league) return
    if (session) return
    if (!remote.connected) return
    if (autoCreateAttempted.current) return
    const teams = remote.teams
    if (!teams || teams.length < 2) return

    autoCreateAttempted.current = true
    let cancelled = false
    setAutoCreating(true)
    setAutoCreateError(null)

    ;(async () => {
      try {
        const res = await fetch('/api/draft/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            league_id: league.id,
            format: 'auction',
            managers: teams.map((t) => ({ name: t.name, budget: league.budget ?? 200 })),
          }),
        })
        const data = await res.json()
        if (cancelled) return
        if (res.ok && data.session) {
          setSession({
            id: data.session.id,
            league_id: league.id,
            format: data.session.format,
            status: data.session.status,
            created_at: data.session.created_at,
          })
        } else {
          setAutoCreateError(data.error || 'Could not start the room automatically')
        }
      } catch {
        if (!cancelled) setAutoCreateError('Network error starting the room')
      } finally {
        if (!cancelled) setAutoCreating(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [phase, league, session, remote.connected, remote.teams])

  const detected = remote.connected
  const checking = !remote.hasPolled

  // Go Live resumes an existing session (remote sync auto-connects via aif=remote);
  // with no session yet it routes through Draft Setup so it's never a dead end.
  const goLiveHref = session
    ? `/draft/live?session=${session.id}&aif=remote`
    : '/draft/setup'
  const manualHref = session ? `/draft/live?session=${session.id}` : '/draft/setup'

  return (
    <div className="pb-2">
      {/* ── Screen header ─────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="ffi-title-red font-extrabold text-[26px] leading-none">
          Live Draft
        </h1>
        {remote.hasPolled && (
          <ConnectionStatusPill
            lastPollAt={remote.lastSyncAt}
            sheetConnected
            error={remote.error}
            onRetry={remote.retry}
          />
        )}
      </div>

      {phase === 'loading' ? (
        <HeroSkeleton />
      ) : phase === 'no-league' ? (
        <EmptyNoLeague onGoToSetup={() => router.push('/draft/setup')} />
      ) : phase === 'error' ? (
        <div className="ffi-hero p-5">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5" color="var(--ffi-warning)" strokeWidth={2} />
            <p
              className="font-extrabold text-[19px]"
              style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
            >
              Couldn&apos;t load your draft
            </p>
          </div>
          <p className="text-[13px] mt-1.5" style={{ color: 'var(--ffi-ink-2)' }}>
            We couldn&apos;t reach your league. Check your connection and try again.
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
        <>
          {/* ── Hero: connection block ────────────────────────── */}
          <div
            className="ffi-hero p-5"
            style={
              detected
                ? { borderColor: 'var(--ffi-volt)', boxShadow: '0 0 0 1px var(--ffi-volt-glow)' }
                : undefined
            }
          >
            <p
              className="font-bold text-[10px] uppercase flex items-center gap-1.5"
              style={{
                fontFamily: 'var(--font-cond)',
                letterSpacing: '0.26em',
                color: detected ? 'var(--ffi-volt)' : 'var(--ffi-blue-bright)',
              }}
            >
              <Radio className="w-3 h-3" strokeWidth={2.4} />
              Auctioneer connection
            </p>

            {/* Big status word */}
            <div className="flex items-center gap-2.5 mt-2">
              <span
                className={`w-3 h-3 rounded-full shrink-0${detected || checking ? ' animate-pulse' : ''}`}
                style={{
                  background: detected
                    ? 'var(--ffi-volt)'
                    : checking
                      ? 'var(--ffi-blue-bright)'
                      : 'var(--ffi-warning)',
                  boxShadow: detected ? '0 0 10px var(--ffi-volt-glow)' : 'none',
                }}
              />
              <p
                className="font-extrabold text-[26px] leading-[1.05]"
                style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
              >
                {checking
                  ? 'Checking for a live auction…'
                  : detected
                    ? 'Auctioneer is LIVE'
                    : 'Auctioneer not detected yet'}
              </p>
            </div>

            <p className="text-[13px] leading-[1.45] mt-2" style={{ color: 'var(--ffi-ink-2)' }}>
              {checking
                ? 'Looking for a draft running on the host device.'
                : detected
                  ? autoCreateError
                    ? `Picks are syncing over the internet${
                        remote.pickCount > 0 ? ` · ${remote.pickCount} in so far` : ''
                      }. Couldn't start the room automatically -- tap Go Live to set up manually.`
                    : `Picks are syncing over the internet${
                        remote.pickCount > 0 ? ` · ${remote.pickCount} in so far` : ''
                      }. Tap Go Live to enter the room.`
                  : 'Start the draft on the host device and this will light up automatically. Not up yet? Record picks by hand in Manual mode.'}
            </p>

            {/* OFFLINE / error — expandable, Retry (Manual mode always still works) */}
            {!detected && !checking && remote.error && (
              <div className="mt-3">
                <button
                  onClick={() => setErrorExpanded((v) => !v)}
                  className="text-[11px] font-semibold underline underline-offset-2"
                  style={{ color: 'var(--ffi-warning)' }}
                >
                  {errorExpanded ? 'Hide details' : 'Why not connected?'}
                </button>
                {errorExpanded && (
                  <div
                    className="mt-2 rounded-[10px] p-3 flex items-start justify-between gap-2"
                    style={{
                      background: 'rgba(255,176,92,0.08)',
                      border: '1px solid rgba(255,176,92,0.20)',
                    }}
                  >
                    <p className="text-[11px] leading-[1.4]" style={{ color: 'var(--ffi-ink-2)' }}>
                      {remote.error}
                    </p>
                    <button
                      onClick={remote.retry}
                      className="shrink-0 text-[10px] font-bold uppercase tracking-wide rounded-md px-2.5 py-1.5"
                      style={{
                        background: 'rgba(255,176,92,0.14)',
                        color: 'var(--ffi-warning)',
                        letterSpacing: '0.08em',
                      }}
                    >
                      Retry now
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Primary CTA — thumb zone */}
            {detected && autoCreating && !session ? (
              // DR-5.1: auto-creating the room -- don't let a tap detour to Setup mid-flight.
              <button
                disabled
                className="ffi-btn-hero w-full mt-4 text-[14px] uppercase tracking-widest opacity-70"
                style={{ borderRadius: '12px' }}
              >
                <Loader2 className="w-[15px] h-[15px] animate-spin" color="var(--ffi-volt-ink)" />
                Preparing room…
              </button>
            ) : detected ? (
              <Link
                href={goLiveHref}
                className="ffi-btn-hero w-full mt-4 text-[14px] uppercase tracking-widest"
                style={{ borderRadius: '12px' }}
              >
                <Gavel className="w-[15px] h-[15px]" strokeWidth={2.6} color="var(--ffi-volt-ink)" />
                Go Live
              </Link>
            ) : (
              <Link
                href={goLiveHref}
                className="ffi-btn-secondary w-full mt-4 text-[13px] font-bold uppercase tracking-widest inline-flex items-center justify-center gap-2"
                style={{ borderRadius: '12px', padding: '0.85rem' }}
              >
                {checking ? (
                  <Loader2 className="w-[14px] h-[14px] animate-spin" color="var(--ffi-ink-2)" />
                ) : (
                  <span
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: 'var(--ffi-warning)' }}
                  />
                )}
                {checking ? 'Checking…' : 'Waiting for auctioneer…'}
              </Link>
            )}

            {/* Secondary — Manual mode (always available, never a co-equal card) */}
            <Link
              href={manualHref}
              className="mt-3 w-full inline-flex items-center justify-center gap-2 text-[12px] font-semibold"
              style={{ color: 'var(--ffi-ink-2)' }}
            >
              <Hand className="w-[14px] h-[14px]" strokeWidth={2} />
              Start in Manual mode
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyNoLeague({ onGoToSetup }: { onGoToSetup: () => void }) {
  return (
    <div className="ffi-hero p-5">
      <p
        className="font-bold text-[10px] uppercase flex items-center gap-1.5"
        style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.26em', color: 'var(--ffi-blue-bright)' }}
      >
        <Radio className="w-3 h-3" strokeWidth={2.4} />
        Auctioneer connection
      </p>
      <p
        className="font-extrabold text-[24px] leading-[1.08] mt-1.5"
        style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
      >
        Set up your draft first
      </p>
      <p className="text-[13px] leading-[1.45] mt-1" style={{ color: 'var(--ffi-ink-2)' }}>
        Confirm your league and managers, then this screen connects to the auctioneer and lights up
        the moment your draft goes live.
      </p>
      <button
        onClick={onGoToSetup}
        className="ffi-btn-hero w-full mt-4 text-[14px] uppercase tracking-widest"
        style={{ borderRadius: '12px' }}
      >
        <Settings2 className="w-[15px] h-[15px]" strokeWidth={2.5} color="var(--ffi-volt-ink)" />
        Go to Draft Setup
      </button>
    </div>
  )
}

function HeroSkeleton() {
  return (
    <div className="ffi-hero p-5">
      <div className="ffi-skeleton h-3 w-40 rounded-full" />
      <div className="ffi-skeleton h-8 w-64 rounded-lg mt-3" />
      <div className="ffi-skeleton h-4 w-full rounded mt-3" />
      <div className="ffi-skeleton h-4 w-2/3 rounded mt-1.5" />
      <div className="ffi-skeleton h-12 w-full rounded-xl mt-4" />
    </div>
  )
}
