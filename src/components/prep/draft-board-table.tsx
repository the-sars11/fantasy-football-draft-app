'use client'

import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowUp, ArrowDown, ArrowUpDown, Target, Ban, TrendingUp } from 'lucide-react'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat } from '@/lib/players/types'

type SortField = 'rank' | 'score' | 'value' | 'adp' | 'name'

interface DraftBoardTableProps {
  players: ScoredPlayer[]
  format: DraftFormat
  sortField: SortField
  sortAsc: boolean
  onSort: (field: SortField) => void
}

function SortIcon({ field, current, asc }: { field: SortField; current: SortField; asc: boolean }) {
  if (field !== current) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />
  return asc
    ? <ArrowUp className="h-3 w-3 ml-1" />
    : <ArrowDown className="h-3 w-3 ml-1" />
}

function SortableHead({
  field,
  label,
  current,
  asc,
  onSort,
  className,
}: {
  field: SortField
  label: string
  current: SortField
  asc: boolean
  onSort: (f: SortField) => void
  className?: string
}) {
  return (
    <TableHead
      className={`cursor-pointer select-none ${className ?? ''}`}
      onClick={() => onSort(field)}
    >
      <span className="inline-flex items-center">
        {label}
        <SortIcon field={field} current={current} asc={asc} />
      </span>
    </TableHead>
  )
}

const posColors: Record<string, string> = {
  QB: 'bg-red-500/15 text-red-400 border-red-500/30',
  RB: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  WR: 'bg-green-500/15 text-green-400 border-green-500/30',
  TE: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  K: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  DEF: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-400'
  if (score >= 60) return 'text-emerald-400'
  if (score >= 40) return 'text-muted-foreground'
  if (score >= 25) return 'text-orange-400'
  return 'text-red-400'
}

function StatusBadge({ status }: { status: 'target' | 'avoid' | 'neutral' }) {
  switch (status) {
    case 'target':
      return (
        <Badge variant="outline" className="gap-1 text-green-400 border-green-500/30 bg-green-500/10 text-[10px] px-1.5 py-0">
          <Target className="h-2.5 w-2.5" /> TGT
        </Badge>
      )
    case 'avoid':
      return (
        <Badge variant="outline" className="gap-1 text-red-400 border-red-500/30 bg-red-500/10 text-[10px] px-1.5 py-0">
          <Ban className="h-2.5 w-2.5" /> AVD
        </Badge>
      )
    default:
      return null
  }
}

export function DraftBoardTable({
  players,
  format,
  sortField,
  sortAsc,
  onSort,
}: DraftBoardTableProps) {
  const isAuction = format === 'auction'

  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-8 text-center">#</TableHead>
            <SortableHead field="name" label="Player" current={sortField} asc={sortAsc} onSort={onSort} className="min-w-[140px]" />
            <TableHead className="w-12">Pos</TableHead>
            <TableHead className="w-12">Team</TableHead>
            <SortableHead field="rank" label="Rank" current={sortField} asc={sortAsc} onSort={onSort} />
            <SortableHead field="adp" label="ADP" current={sortField} asc={sortAsc} onSort={onSort} />
            <SortableHead
              field="value"
              label={isAuction ? 'Value' : 'Round'}
              current={sortField}
              asc={sortAsc}
              onSort={onSort}
            />
            <SortableHead field="score" label="Score" current={sortField} asc={sortAsc} onSort={onSort} />
            <TableHead className="w-12">Status</TableHead>
            <TableHead className="hidden md:table-cell">Boosts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                No players match your filters
              </TableCell>
            </TableRow>
          ) : (
            players.map((sp, idx) => {
              const p = sp.player
              const consensusVal = isAuction ? p.consensusAuctionValue : p.adp
              const adjustedVal = isAuction ? sp.adjustedAuctionValue : sp.adjustedRoundValue
              const hasAdjustment = adjustedVal != null && adjustedVal !== consensusVal

              return (
                <TableRow
                  key={p.id}
                  className={
                    sp.targetStatus === 'avoid'
                      ? 'opacity-50'
                      : sp.targetStatus === 'target'
                        ? 'bg-green-500/5'
                        : ''
                  }
                >
                  {/* Row number */}
                  <TableCell className="text-center text-xs text-muted-foreground">
                    {idx + 1}
                  </TableCell>

                  {/* Name + bye */}
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="text-sm">{p.name}</span>
                      {p.byeWeek > 0 && (
                        <span className="text-[10px] text-muted-foreground">Bye {p.byeWeek}</span>
                      )}
                    </div>
                  </TableCell>

                  {/* Position */}
                  <TableCell>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${posColors[p.position] ?? ''}`}>
                      {p.position}
                    </Badge>
                  </TableCell>

                  {/* Team */}
                  <TableCell className="text-xs text-muted-foreground">{p.team}</TableCell>

                  {/* Consensus rank */}
                  <TableCell className="text-xs">{p.consensusRank}</TableCell>

                  {/* ADP */}
                  <TableCell className="text-xs">{p.adp > 0 ? p.adp.toFixed(1) : '—'}</TableCell>

                  {/* Value / Round */}
                  <TableCell className="text-xs">
                    {isAuction ? (
                      <span className="inline-flex items-center gap-1">
                        <span className={hasAdjustment ? 'line-through text-muted-foreground' : ''}>
                          ${consensusVal}
                        </span>
                        {hasAdjustment && (
                          <span className="font-medium text-primary">
                            ${adjustedVal}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        {adjustedVal != null ? (
                          <>
                            <span className="font-medium">Rd {adjustedVal}</span>
                            {hasAdjustment && (
                              <span className="text-muted-foreground text-[10px]">
                                (ADP {consensusVal.toFixed(1)})
                              </span>
                            )}
                          </>
                        ) : (
                          <span>{consensusVal > 0 ? consensusVal.toFixed(1) : '—'}</span>
                        )}
                      </span>
                    )}
                  </TableCell>

                  {/* Strategy score */}
                  <TableCell>
                    <span className={`text-sm font-mono font-semibold ${scoreColor(sp.strategyScore)}`}>
                      {sp.strategyScore}
                    </span>
                  </TableCell>

                  {/* Target status */}
                  <TableCell>
                    <StatusBadge status={sp.targetStatus} />
                  </TableCell>

                  {/* Boosts (desktop only) */}
                  <TableCell className="hidden md:table-cell">
                    {sp.boosts.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {sp.boosts.slice(0, 3).map((boost, i) => (
                          <span key={i} className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/50 rounded px-1.5 py-0.5">
                            <TrendingUp className="h-2.5 w-2.5" />
                            {boost}
                          </span>
                        ))}
                        {sp.boosts.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{sp.boosts.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}
