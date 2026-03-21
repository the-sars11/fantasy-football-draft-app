'use client'

/**
 * PlayerPool (FF-034)
 *
 * Live-updated list of available (undrafted) players.
 * Features:
 * - Position filter tabs
 * - Name/team search
 * - Strategy score + value display
 * - Click to expand "Why?" reasoning
 */

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, ChevronDown, ChevronUp, Target, Ban } from 'lucide-react'
import type { Player, Position } from '@/lib/players/types'
import type { ScoredPlayer } from '@/lib/research/strategy/scoring'
import type { DraftFormat } from '@/lib/supabase/database.types'
import type { Explanation } from '@/lib/draft/explain'
import { WhyExplainer } from './why-explainer'

const posColors: Record<string, string> = {
  QB: 'bg-red-500/15 text-red-400 border-red-500/30',
  RB: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  WR: 'bg-green-500/15 text-green-400 border-green-500/30',
  TE: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  K: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  DEF: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

const positions: Array<Position | 'ALL'> = ['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF']

function scoreColor(score: number): string {
  if (score >= 75) return 'text-green-400'
  if (score >= 60) return 'text-emerald-400'
  if (score >= 40) return 'text-muted-foreground'
  if (score >= 25) return 'text-orange-400'
  return 'text-red-400'
}

interface PlayerPoolProps {
  scoredPlayers: ScoredPlayer[]
  draftedNames: Set<string>
  format: DraftFormat
  getExplanation?: (scored: ScoredPlayer) => Explanation | null
}

export function PlayerPool({
  scoredPlayers,
  draftedNames,
  format,
  getExplanation,
}: PlayerPoolProps) {
  const [posFilter, setPosFilter] = useState<Position | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'value' | 'rank'>('score')

  // Filter to available players
  const available = useMemo(() => {
    let filtered = scoredPlayers.filter(sp => !draftedNames.has(sp.player.name.toLowerCase()))

    if (posFilter !== 'ALL') {
      filtered = filtered.filter(sp => sp.player.position === posFilter)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(sp =>
        sp.player.name.toLowerCase().includes(q) ||
        sp.player.team.toLowerCase().includes(q)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'score') return b.strategyScore - a.strategyScore
      if (sortBy === 'value') {
        if (format === 'auction') {
          return (b.adjustedAuctionValue ?? b.player.consensusAuctionValue) -
                 (a.adjustedAuctionValue ?? a.player.consensusAuctionValue)
        }
        return (a.adjustedRoundValue ?? a.player.adp) - (b.adjustedRoundValue ?? b.player.adp)
      }
      return a.player.consensusRank - b.player.consensusRank
    })

    return filtered
  }, [scoredPlayers, draftedNames, posFilter, search, sortBy, format])

  const totalAvailable = scoredPlayers.filter(sp => !draftedNames.has(sp.player.name.toLowerCase())).length
  const isAuction = format === 'auction'

  return (
    <div className="space-y-3">
      {/* Header + search */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          Available Players
          <span className="text-xs font-normal text-muted-foreground ml-1.5">
            ({totalAvailable})
          </span>
        </h3>
        <div className="relative w-44">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Position filter tabs */}
      <div className="flex gap-1">
        {positions.map(pos => (
          <button
            key={pos}
            onClick={() => setPosFilter(pos)}
            className={`px-2 py-1 text-xs rounded-md transition-colors ${
              posFilter === pos
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            {pos}
          </button>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="flex gap-1 text-[10px]">
        {(['score', 'value', 'rank'] as const).map(s => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-2 py-0.5 rounded transition-colors ${
              sortBy === s
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'value' ? (isAuction ? 'Value' : 'ADP') : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-md border border-border max-h-[420px] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-10">Pos</TableHead>
              <TableHead>Player</TableHead>
              <TableHead className="w-14">{isAuction ? 'Val' : 'Rd'}</TableHead>
              <TableHead className="w-12">Score</TableHead>
              <TableHead className="w-8"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {available.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-6 text-xs">
                  No players match
                </TableCell>
              </TableRow>
            ) : (
              available.slice(0, 50).map(sp => {
                const p = sp.player
                const isExpanded = expandedId === p.id
                const explanation = isExpanded && getExplanation ? getExplanation(sp) : null

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
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] px-1 py-0 ${posColors[p.position] ?? ''}`}>
                        {p.position}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div>
                          <div className="text-sm font-medium leading-tight">{p.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {p.team}
                            {p.byeWeek > 0 && ` · Bye ${p.byeWeek}`}
                            {sp.targetStatus === 'target' && (
                              <Target className="inline h-2.5 w-2.5 ml-1 text-green-400" />
                            )}
                            {sp.targetStatus === 'avoid' && (
                              <Ban className="inline h-2.5 w-2.5 ml-1 text-red-400" />
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Expanded "Why?" section */}
                      {isExpanded && explanation && (
                        <div className="mt-2">
                          <WhyExplainer explanation={explanation} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {isAuction
                        ? `$${sp.adjustedAuctionValue ?? p.consensusAuctionValue}`
                        : sp.adjustedRoundValue
                          ? `Rd ${sp.adjustedRoundValue}`
                          : p.adp > 0 ? p.adp.toFixed(1) : '—'
                      }
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs font-mono font-semibold ${scoreColor(sp.strategyScore)}`}>
                        {sp.strategyScore}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Why?"
                      >
                        {isExpanded
                          ? <ChevronUp className="h-3.5 w-3.5" />
                          : <ChevronDown className="h-3.5 w-3.5" />
                        }
                      </button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
