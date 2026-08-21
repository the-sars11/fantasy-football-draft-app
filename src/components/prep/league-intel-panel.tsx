'use client'

/**
 * LeagueIntelPanel (W2)
 *
 * Collapsible panel that renders the Nasties ledger intel published in the
 * research dataset (DatasetLeagueIntel): positional inflation (where the room
 * over/under-pays vs national) and owner positional leans. $0 - every number
 * here is read straight off the dataset, nothing computed or invented.
 *
 * Meaning rule (SHIELD v4.1): HOT = the room overpays vs national, an overpay
 * warning, so it takes the warning tone. COOL = the room underpays, a real
 * value pocket, so it takes the steel-blue/positive-info tone. NEUTRAL stays
 * muted ink. Collapsed by default so it never dominates the screen above the
 * strategies/board it sits on top of.
 */

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Nameplate } from '@/components/ui/shield'
import type { DatasetLeagueIntel } from '@/lib/research/dataset-types'
import type { CalibratedPosition, InflationTag } from '@/lib/draft/league-calibration'

const POSITION_ORDER: CalibratedPosition[] = ['QB', 'RB', 'WR', 'TE', 'DEF']

const TAG_TONE: Record<InflationTag, { color: string; label: string }> = {
  HOT: { color: 'var(--ffi-warning)', label: 'HOT' },
  COOL: { color: 'var(--ffi-blue-bright)', label: 'COOL' },
  NEUTRAL: { color: 'var(--ffi-ink-3)', label: 'NEUTRAL' },
}

interface LeagueIntelPanelProps {
  intel: DatasetLeagueIntel
}

export function LeagueIntelPanel({ intel }: LeagueIntelPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const eraYears = intel.era.length > 0 ? intel.era : []
  const eraLabel =
    eraYears.length > 0
      ? eraYears.length === 1
        ? `${eraYears[0]}`
        : `${Math.min(...eraYears)} to ${Math.max(...eraYears)}`
      : null

  const ownerRows = Object.entries(intel.ownerLeans)
    .filter(([, lean]) => lean.topLean !== null)
    .sort((a, b) => Math.abs(b[1].topLean!.vsRoom) - Math.abs(a[1].topLean!.vsRoom))

  return (
    <Nameplate interactive className="p-4 mb-4">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="ffi-title-chrome text-[15px] leading-tight">League intel</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--ffi-ink-2)' }}>
            {eraLabel
              ? `From ${intel.draftsUsed} drafts, ${eraLabel}`
              : `From ${intel.draftsUsed} drafts`}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ color: 'var(--ffi-ink-2)' }}
          aria-hidden="true"
        />
      </button>

      {isExpanded && (
        <div className="mt-4 pt-4 space-y-5" style={{ borderTop: '1px solid var(--ffi-hairline)' }}>
          {/* Positional inflation */}
          <div>
            <p
              className="font-bold text-[10px] uppercase mb-2"
              style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.2em', color: 'var(--ffi-blue-bright)' }}
            >
              Positional inflation
            </p>
            <div className="space-y-1.5">
              {POSITION_ORDER.filter((pos) => intel.positionalInflation[pos]).map((pos) => {
                const inf = intel.positionalInflation[pos]
                const tone = TAG_TONE[inf.tag]
                const pctDelta = Math.round((inf.multiplier - 1) * 100)
                const readLine =
                  inf.tag === 'HOT'
                    ? `room pays ${pctDelta}% over national`
                    : inf.tag === 'COOL'
                      ? `value pocket, room pays ${Math.abs(pctDelta)}% under`
                      : 'in line with national'
                return (
                  <div key={pos} className="flex items-center gap-3 py-1">
                    <span
                      className="w-8 shrink-0 font-bold text-[12px]"
                      style={{ fontFamily: 'var(--font-cond)', color: 'var(--ffi-ink)' }}
                    >
                      {pos}
                    </span>
                    <span
                      className="flex-1 min-w-0 text-[11px] truncate"
                      style={{ color: 'var(--ffi-ink-2)' }}
                    >
                      {readLine}
                    </span>
                    <span
                      className="font-bold text-[10px] uppercase shrink-0"
                      style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.08em', color: tone.color }}
                    >
                      {tone.label}
                    </span>
                    <span
                      className="font-mono text-[12px] font-semibold tabular-nums shrink-0 w-12 text-right"
                      style={{ color: 'var(--ffi-ink)' }}
                    >
                      {inf.multiplier.toFixed(2)}x
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Owner leans */}
          {ownerRows.length > 0 && (
            <div>
              <p
                className="font-bold text-[10px] uppercase mb-2"
                style={{ fontFamily: 'var(--font-cond)', letterSpacing: '0.2em', color: 'var(--ffi-blue-bright)' }}
              >
                Owner leans
              </p>
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
                {ownerRows.map(([owner, lean]) => {
                  const topLean = lean.topLean!
                  const isHeavy = topLean.vsRoom > 0
                  return (
                    <div key={owner} className="flex items-center gap-3 py-1">
                      <span
                        className="flex-1 min-w-0 text-[12px] font-medium truncate"
                        style={{ color: 'var(--ffi-ink)' }}
                      >
                        {owner}
                      </span>
                      <span
                        className="font-bold text-[10px] uppercase shrink-0"
                        style={{
                          fontFamily: 'var(--font-cond)',
                          letterSpacing: '0.06em',
                          color: isHeavy ? 'var(--ffi-warning)' : 'var(--ffi-blue-bright)',
                        }}
                      >
                        {isHeavy ? 'HEAVY' : 'LIGHT'} {topLean.position}
                      </span>
                      <span
                        className="font-mono text-[11px] tabular-nums shrink-0 w-14 text-right"
                        style={{ color: 'var(--ffi-ink-3)' }}
                      >
                        {topLean.vsRoom > 0 ? '+' : ''}
                        {Math.round(topLean.vsRoom)}% vs room
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </Nameplate>
  )
}
