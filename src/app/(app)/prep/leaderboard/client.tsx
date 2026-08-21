'use client'

/**
 * Strategy Leaderboard client (W1).
 *
 * Reads the headless research dataset (W0 seam) via useResearchDataset and
 * ranks dataset.strategies by their real 400-run sim grade (meanWins). $0 --
 * no Claude call, no recompute -- every number here is either the engine's
 * grade output, the roster solver's durability-adjusted target price, or a
 * player's own consensus/expected room price. Nothing is invented.
 *
 * Expandable rows (Joe's locked FF UI rule), not a card grid. Collapsed: rank,
 * strategy name, projected record, avg wins. Expanded: why it wins, the sim
 * record hero, key targets with durability prices, and the sample-roster
 * carousel -- all reused presentational pieces from sim-results-cards.tsx.
 * A stud combos section follows the same pattern for concrete stud pairs/trios.
 */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronDown, Trophy, AlertTriangle, RotateCw } from 'lucide-react'
import { PageTitle, Nameplate } from '@/components/ui/shield'
import { FFIPositionBadge, FFISectionHeader } from '@/components/ui/ffi-primitives'
import { SimRecordHero, SimRosterCarousel } from '@/components/prep/sim-results-cards'
import { LeagueIntelPanel } from '@/components/prep/league-intel-panel'
import { useResearchDataset } from '@/hooks/use-research-dataset'
import { rankStrategies, resolveTargetPrice } from '@/lib/research/leaderboard'
import type { ResolvedTargetPrice } from '@/lib/research/leaderboard'
import type { DatasetStrategy, DatasetStudCombo, EnrichedPlayer } from '@/lib/research/dataset-types'

interface LeagueSummary {
  id: string
  name: string
}

export function LeaderboardClient() {
  const [leagueId, setLeagueId] = useState<string | null>(null)
  const [leagueLoading, setLeagueLoading] = useState(true)
  const [leagueError, setLeagueError] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function loadLeague() {
      setLeagueLoading(true)
      setLeagueError(false)
      try {
        const res = await fetch('/api/leagues')
        if (!res.ok) throw new Error('leagues')
        const data = await res.json()
        const list: LeagueSummary[] = data.leagues ?? []
        if (!cancelled) setLeagueId(list[0]?.id ?? null)
      } catch {
        if (!cancelled) setLeagueError(true)
      } finally {
        if (!cancelled) setLeagueLoading(false)
      }
    }
    loadLeague()
    return () => {
      cancelled = true
    }
  }, [])

  const { run, isLoading, error, isEmpty, refetch } = useResearchDataset({
    leagueId,
    enabled: !leagueLoading && !!leagueId,
  })

  const dataset = run?.dataset ?? null
  const ranked = useMemo(
    () => (dataset ? rankStrategies(dataset.strategies) : []),
    [dataset],
  )

  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null)
  const [expandedCombo, setExpandedCombo] = useState<string | null>(null)

  const loading = leagueLoading || isLoading

  return (
    <div className="pb-2">
      <LeaderboardHeader />

      {loading ? (
        <LoadingSkeleton />
      ) : leagueError || error ? (
        <ErrorState onRetry={leagueError ? () => window.location.reload() : refetch} />
      ) : !leagueId ? (
        <NoLeagueState />
      ) : isEmpty || !dataset ? (
        <EmptyDatasetState />
      ) : (
        <>
          <LeagueIntelPanel intel={dataset.leagueIntel} />

          <QuietLabel>Ranked by projected wins</QuietLabel>
          <div className="space-y-2.5">
            {ranked.map((strategy, i) => (
              <StrategyRow
                key={strategy.proposal.name}
                rank={i + 1}
                strategy={strategy}
                players={dataset.players}
                isExpanded={expandedStrategy === strategy.proposal.name}
                onToggle={() =>
                  setExpandedStrategy((cur) =>
                    cur === strategy.proposal.name ? null : strategy.proposal.name,
                  )
                }
              />
            ))}
          </div>

          {dataset.studCombos.length > 0 && (
            <>
              <QuietLabel>Stud combos</QuietLabel>
              <div className="space-y-2.5">
                {dataset.studCombos.map((combo) => {
                  // patternKey repeats (3 combos per pattern), so it cannot be
                  // the React key or the expand identity - pair it with the
                  // anchor names to get one stable id per concrete combo.
                  const comboId = `${combo.patternKey}::${combo.anchorNames.join('|')}`
                  return (
                    <StudComboRow
                      key={comboId}
                      combo={combo}
                      players={dataset.players}
                      isExpanded={expandedCombo === comboId}
                      onToggle={() =>
                        setExpandedCombo((cur) => (cur === comboId ? null : comboId))
                      }
                    />
                  )
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── Header ─────────────────────────────────────────────────────────────────

function LeaderboardHeader() {
  return (
    <div className="mb-4">
      <Link
        href="/prep"
        className="inline-flex items-center gap-1 ffi-caption text-[var(--ffi-text-secondary)] hover:text-white transition-colors mb-2"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        Research
      </Link>
      <PageTitle as="h1" className="text-[26px] font-bold leading-none">
        Strategy Leaderboard
      </PageTitle>
      <p className="text-[12px] mt-1.5" style={{ color: 'var(--ffi-ink-2)' }}>
        Every anchor strategy, ranked by its real 400-run projected wins
      </p>
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

// ─── States ─────────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ffi-nameplate p-4">
          <div className="flex items-center gap-3">
            <div className="ffi-skeleton w-8 h-6 rounded-md" />
            <div className="flex-1">
              <div className="ffi-skeleton h-3.5 w-32 rounded-full" />
              <div className="ffi-skeleton h-2.5 w-44 rounded-full mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Nameplate className="p-4">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="w-[18px] h-[18px]" color="var(--ffi-warning)" strokeWidth={2} />
        <p className="font-bold text-[14px]" style={{ color: 'var(--ffi-ink)' }}>
          Couldn&apos;t load the strategy leaderboard
        </p>
      </div>
      <p className="text-[12px] mt-1.5" style={{ color: 'var(--ffi-ink-2)' }}>
        Check your connection and try again.
      </p>
      <button
        onClick={onRetry}
        className="ffi-btn-secondary w-full mt-3 text-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"
        style={{ borderRadius: '11px', padding: '0.7rem' }}
      >
        <RotateCw className="w-[14px] h-[14px]" strokeWidth={2.5} color="var(--ffi-ink-2)" />
        Retry
      </button>
    </Nameplate>
  )
}

function NoLeagueState() {
  return (
    <Nameplate className="p-4">
      <p className="font-bold text-[14px]" style={{ color: 'var(--ffi-ink)' }}>
        No league set up yet
      </p>
      <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--ffi-ink-2)' }}>
        Set up the Nasties league before running research.
      </p>
    </Nameplate>
  )
}

function EmptyDatasetState() {
  return (
    <Nameplate className="p-4">
      <p className="font-bold text-[14px]" style={{ color: 'var(--ffi-ink)' }}>
        No research dataset published yet
      </p>
      <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: 'var(--ffi-ink-2)' }}>
        This screen reads the headless research snapshot, not a live pull. Run it from a terminal,
        then come back:
      </p>
      <div className="mt-2.5 space-y-1.5">
        <code
          className="block rounded-md px-2.5 py-1.5 text-[11px]"
          style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)', color: 'var(--ffi-ink)' }}
        >
          npm run research:run
        </code>
        <code
          className="block rounded-md px-2.5 py-1.5 text-[11px]"
          style={{ background: 'var(--ffi-surface-2)', border: '1px solid var(--ffi-hairline)', color: 'var(--ffi-ink)' }}
        >
          npm run research:publish
        </code>
      </div>
    </Nameplate>
  )
}

// ─── Strategy row ───────────────────────────────────────────────────────────

function StrategyRow({
  rank,
  strategy,
  players,
  isExpanded,
  onToggle,
}: {
  rank: number
  strategy: DatasetStrategy
  players: EnrichedPlayer[]
  isExpanded: boolean
  onToggle: () => void
}) {
  const { proposal, sim } = strategy
  const record = sim.grade.modalRecord

  return (
    <Nameplate interactive className="p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 text-left"
      >
        <span
          className="font-bold w-7 shrink-0 tabular-nums text-[20px] leading-none"
          style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-blue-bright)' }}
        >
          {rank}
        </span>
        <div className="flex-1 min-w-0">
          <p className="ffi-title-chrome text-[16px] leading-tight truncate">{proposal.name}</p>
          <p className="text-[12px] mt-0.5 tabular-nums" style={{ color: 'var(--ffi-ink-2)' }}>
            {record.wins}-{record.losses} projected · {sim.grade.meanWins.toFixed(1)} avg wins
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--ffi-ink-2)' }}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--ffi-hairline)' }}>
          <div>
            <p
              className="font-bold text-[10px] uppercase"
              style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.2em', color: 'var(--ffi-blue-bright)' }}
            >
              Why it wins
            </p>
            <p className="text-[13px] leading-relaxed mt-1.5" style={{ color: 'var(--ffi-ink-2)' }}>
              {proposal.reasoning}
            </p>
          </div>

          <SimRecordHero grade={sim.grade} biasedPlayers={sim.config.biasedPlayers} />

          {proposal.key_targets.length > 0 && (
            <div>
              <FFISectionHeader
                title="Key targets"
                subtitle="Durability-adjusted price to plan on"
              />
              <div className="space-y-1.5 -mt-2">
                {proposal.key_targets.map((name) => (
                  <TargetPriceRow
                    key={name}
                    resolved={resolveTargetPrice(name, proposal.target_pricing, players)}
                  />
                ))}
              </div>
            </div>
          )}

          <SimRosterCarousel rosters={sim.topRosters} runs={sim.grade.runs} />
        </div>
      )}
    </Nameplate>
  )
}

function TargetPriceRow({ resolved }: { resolved: ResolvedTargetPrice }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      {resolved.position ? (
        <FFIPositionBadge position={resolved.position} />
      ) : (
        <span className="w-10 shrink-0" />
      )}
      <span className="flex-1 text-sm font-medium truncate" style={{ color: 'var(--ffi-ink)' }}>
        {resolved.name}
      </span>
      {resolved.price != null ? (
        <div className="text-right shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ffi-ink)' }}>
            ${resolved.price}
          </p>
          {resolved.source === 'solver' && resolved.roomPrice != null ? (
            <p className="text-[10px] tabular-nums" style={{ color: 'var(--ffi-ink-3)' }}>
              {resolved.durabilityFactor != null && resolved.roomPrice !== resolved.price
                ? `room $${resolved.roomPrice} · ${resolved.durabilityFactor.toFixed(2)}x durability`
                : `room $${resolved.roomPrice}`}
            </p>
          ) : resolved.source === 'consensus' ? (
            <p className="text-[10px]" style={{ color: 'var(--ffi-ink-3)' }}>
              consensus/expected
            </p>
          ) : null}
        </div>
      ) : (
        <span className="text-[11px]" style={{ color: 'var(--ffi-ink-3)' }}>
          price unavailable
        </span>
      )}
    </div>
  )
}

// ─── Stud combo row ─────────────────────────────────────────────────────────

function StudComboRow({
  combo,
  players,
  isExpanded,
  onToggle,
}: {
  combo: DatasetStudCombo
  players: EnrichedPlayer[]
  isExpanded: boolean
  onToggle: () => void
}) {
  const { proposal, sim } = combo
  const record = sim.grade.modalRecord

  return (
    <Nameplate interactive className="p-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 text-left"
      >
        <Trophy className="h-4 w-4 shrink-0" style={{ color: 'var(--ffi-blue-bright)' }} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="ffi-title-chrome text-[15px] leading-tight truncate">{combo.patternLabel}</p>
          <p className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--ffi-ink-2)' }}>
            {combo.anchorNames.join(' + ')}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-sm font-semibold tabular-nums" style={{ color: 'var(--ffi-ink)' }}>
            {record.wins}-{record.losses}
          </p>
          <p className="text-[10px]" style={{ color: 'var(--ffi-ink-3)' }}>
            projected
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--ffi-ink-2)' }}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--ffi-hairline)' }}>
          {proposal.reasoning && (
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--ffi-ink-2)' }}>
              {proposal.reasoning}
            </p>
          )}

          <SimRecordHero grade={sim.grade} biasedPlayers={sim.config.biasedPlayers} />

          {proposal.key_targets.length > 0 && (
            <div>
              <FFISectionHeader
                title="Key targets"
                subtitle="Durability-adjusted price to plan on"
              />
              <div className="space-y-1.5 -mt-2">
                {proposal.key_targets.map((name) => (
                  <TargetPriceRow
                    key={name}
                    resolved={resolveTargetPrice(name, proposal.target_pricing, players)}
                  />
                ))}
              </div>
            </div>
          )}

          <SimRosterCarousel rosters={sim.topRosters} runs={sim.grade.runs} />
        </div>
      )}
    </Nameplate>
  )
}
