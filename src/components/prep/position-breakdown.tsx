'use client'

import { useMemo } from 'react'
import { Target, Ban } from 'lucide-react'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat, Position } from '@/lib/players/types'

interface PositionBreakdownProps {
  players: ScoredPlayer[]
  format: DraftFormat
}

const POSITIONS: Position[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DEF']

const posAccent: Record<string, string> = {
  QB: 'var(--ffi-pos-qb)',
  RB: 'var(--ffi-pos-rb)',
  WR: 'var(--ffi-pos-wr)',
  TE: 'var(--ffi-pos-te)',
  K: 'var(--ffi-ink-2)',
  DEF: 'var(--ffi-ink-2)',
}

const posBorder: Record<string, string> = {
  QB: 'rgba(255,110,138,0.4)',
  RB: 'rgba(86,224,160,0.4)',
  WR: 'rgba(108,168,255,0.4)',
  TE: 'rgba(255,176,92,0.4)',
  K: 'var(--ffi-hairline-bright)',
  DEF: 'var(--ffi-hairline-bright)',
}

function cardBorderStyle(pos: string): React.CSSProperties {
  return { border: `1px solid ${posBorder[pos]}`, background: 'var(--ffi-surface-2)' }
}

function tierStyle(tier: number): React.CSSProperties {
  if (tier <= 1) return { background: 'rgba(139,255,69,0.16)', color: 'var(--ffi-volt)' }
  if (tier <= 2) return { background: 'rgba(86,224,160,0.16)', color: '#56e0a0' }
  if (tier <= 3) return { background: 'rgba(77,130,255,0.16)', color: 'var(--ffi-blue-bright)' }
  if (tier <= 4) return { background: 'rgba(255,176,92,0.16)', color: '#ffb05c' }
  if (tier <= 5) return { background: 'rgba(255,154,92,0.16)', color: '#ff9a5c' }
  return { background: 'var(--ffi-surface-1)', color: 'var(--ffi-ink-2)' }
}

function scoreBarColor(score: number): string {
  if (score >= 75) return 'var(--ffi-volt)'
  if (score >= 60) return '#56e0a0'
  if (score >= 40) return '#ffb05c'
  if (score >= 25) return '#ff9a5c'
  return 'var(--ffi-danger)'
}

export function PositionBreakdown({ players, format }: PositionBreakdownProps) {
  const isAuction = format === 'auction'

  const byPosition = useMemo(() => {
    const grouped: Record<string, ScoredPlayer[]> = {}
    for (const pos of POSITIONS) {
      grouped[pos] = players
        .filter((sp) => sp.player.position === pos)
        .slice(0, 20)
    }
    return grouped
  }, [players])

  return (
    <div className="space-y-6">
      {POSITIONS.map((pos) => {
        const group = byPosition[pos]
        if (!group || group.length === 0) return null

        // Detect tier breaks — where the consensus tier changes
        const tiers: { tier: number; players: ScoredPlayer[] }[] = []
        let currentTier = -1
        for (const sp of group) {
          const t = sp.player.consensusTier ?? 0
          if (t !== currentTier) {
            tiers.push({ tier: t, players: [] })
            currentTier = t
          }
          tiers[tiers.length - 1].players.push(sp)
        }

        return (
          <div key={pos} className="rounded-2xl pt-4 pb-3 px-3 space-y-3" style={cardBorderStyle(pos)}>
            {/* Position header */}
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: posAccent[pos] }}>{pos}</h3>
              <span className="text-xs" style={{ color: 'var(--ffi-ink-2)' }}>{group.length} players</span>
            </div>

            {/* Tiered player rows */}
            {tiers.map(({ tier, players: tierPlayers }, tierIdx) => (
              <div key={tierIdx} className="space-y-0.5">
                {/* Tier label */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="ffi-badge text-[10px] px-1.5 py-0" style={tierStyle(tier)}>
                    Tier {tier || '?'}
                  </span>
                  <div className="flex-1" style={{ borderTop: '1px solid var(--ffi-hairline)' }} />
                </div>

                {/* Players in this tier */}
                {tierPlayers.map((sp) => {
                  const p = sp.player
                  const value = isAuction
                    ? sp.adjustedAuctionValue ?? p.consensusAuctionValue
                    : sp.adjustedRoundValue ?? p.adp

                  const rowStyle: React.CSSProperties =
                    sp.targetStatus === 'avoid'
                      ? { opacity: 0.4 }
                      : sp.targetStatus === 'target'
                        ? { background: 'rgba(139,255,69,0.06)' }
                        : {}

                  return (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-sm"
                      style={rowStyle}
                    >
                      {/* Rank */}
                      <span className="w-6 text-xs text-right shrink-0" style={{ color: 'var(--ffi-ink-2)' }}>
                        {p.consensusRank}
                      </span>

                      {/* Name + team */}
                      <div className="flex-1 min-w-0">
                        <span className="font-medium truncate block" style={{ color: 'var(--ffi-ink)' }}>{p.name}</span>
                        <span className="text-[10px]" style={{ color: 'var(--ffi-ink-3)' }}>{p.team} &middot; Bye {p.byeWeek}</span>
                      </div>

                      {/* Value */}
                      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--ffi-ink)' }}>
                        {isAuction ? `$${value}` : value > 0 ? `Rd ${typeof value === 'number' ? Math.round(value) : value}` : '-'}
                      </span>

                      {/* Score bar */}
                      <div className="w-10 shrink-0 flex items-center gap-1">
                        <div className="ffi-progress" style={{ width: '1.5rem', height: '0.375rem' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${sp.strategyScore}%`, background: scoreBarColor(sp.strategyScore) }}
                          />
                        </div>
                        <span className="text-[10px] font-mono w-4" style={{ color: 'var(--ffi-ink-2)' }}>
                          {sp.strategyScore}
                        </span>
                      </div>

                      {/* Status icon */}
                      <div className="w-4 shrink-0">
                        {sp.targetStatus === 'target' && <Target className="h-3 w-3" style={{ color: 'var(--ffi-volt)' }} />}
                        {sp.targetStatus === 'avoid' && <Ban className="h-3 w-3" style={{ color: 'var(--ffi-danger)' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
