'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Plus,
  Trash2,
  Target,
  ShieldAlert,
  SlidersHorizontal,
  DollarSign,
  ListOrdered,
} from 'lucide-react'
import { StrategyValuePreview } from './strategy-value-preview'
import type { Strategy, StrategyUpdate, StrategyPlayerTarget, StrategyPlayerAvoid, Position as DbPosition } from '@/lib/supabase/database.types'
import type { DraftFormat, Player } from '@/lib/players/types'

/** Extract first value from slider's onValueChange (number | readonly number[]) */
function sliderVal(v: number | readonly number[]): number {
  return typeof v === 'number' ? v : v[0]
}

interface StrategyEditorProps {
  strategy: Strategy
  format: DraftFormat
  players?: Player[]
  leagueBudget?: number
  onSave: (updates: StrategyUpdate) => Promise<void>
  onCancel: () => void
}

const CORE_POSITIONS: DbPosition[] = ['QB', 'RB', 'WR', 'TE']
const ALL_POSITIONS: DbPosition[] = ['QB', 'RB', 'WR', 'TE', 'K', 'DST']
const BUDGET_POSITIONS = ['QB', 'RB', 'WR', 'TE', 'K', 'DST', 'bench'] as const

const RISK_OPTIONS = [
  { value: 'conservative' as const, label: 'Conservative', color: 'text-blue-500' },
  { value: 'balanced' as const, label: 'Balanced', color: 'text-yellow-500' },
  { value: 'aggressive' as const, label: 'Aggressive', color: 'text-red-500' },
]

// NFL teams for team avoids
const NFL_TEAMS = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
  'DAL','DEN','DET','GB','HOU','IND','JAX','KC',
  'LAC','LAR','LV','MIA','MIN','NE','NO','NYG',
  'NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS',
] as const

type Section = 'weights' | 'targets' | 'avoids' | 'teams' | 'budget' | 'rounds' | 'risk'

export function StrategyEditor({ strategy, format, players = [], leagueBudget, onSave, onCancel }: StrategyEditorProps) {
  // Editable state — initialized from strategy
  const [name, setName] = useState(strategy.name)
  const [description, setDescription] = useState(strategy.description ?? '')
  const [riskTolerance, setRiskTolerance] = useState(strategy.risk_tolerance)
  const [positionWeights, setPositionWeights] = useState<Record<string, number>>({ ...strategy.position_weights })
  const [playerTargets, setPlayerTargets] = useState<StrategyPlayerTarget[]>([...(strategy.player_targets ?? [])])
  const [playerAvoids, setPlayerAvoids] = useState<StrategyPlayerAvoid[]>([...(strategy.player_avoids ?? [])])
  const [teamAvoids, setTeamAvoids] = useState<string[]>([...(strategy.team_avoids ?? [])])
  const [budgetAllocation, setBudgetAllocation] = useState<Record<string, number>>(
    strategy.budget_allocation ? { ...strategy.budget_allocation } : { QB: 8, RB: 35, WR: 30, TE: 10, K: 1, DST: 1, bench: 15 }
  )
  const [maxBidPct, setMaxBidPct] = useState(strategy.max_bid_percentage ?? 35)
  const [roundTargets, setRoundTargets] = useState<Record<string, number[]>>(
    strategy.round_targets ? JSON.parse(JSON.stringify(strategy.round_targets)) : { QB: [], RB: [], WR: [], TE: [], K: [], DST: [] }
  )

  const [saving, setSaving] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['weights']))

  // New target/avoid input state
  const [newTargetName, setNewTargetName] = useState('')
  const [newAvoidName, setNewAvoidName] = useState('')

  // Build transient strategy from current editor state for live preview
  const editedStrategy = useMemo<Strategy>(() => ({
    ...strategy,
    name,
    description: description || null,
    risk_tolerance: riskTolerance,
    position_weights: positionWeights as Record<DbPosition, number>,
    player_targets: playerTargets,
    player_avoids: playerAvoids,
    team_avoids: teamAvoids,
    budget_allocation: format === 'auction' ? budgetAllocation : null,
    max_bid_percentage: format === 'auction' ? maxBidPct : null,
    round_targets: format === 'snake' ? roundTargets as Record<DbPosition, number[]> : null,
  }), [strategy, name, description, riskTolerance, positionWeights, playerTargets, playerAvoids, teamAvoids, budgetAllocation, maxBidPct, roundTargets, format])

  const toggleSection = (section: Section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updates: StrategyUpdate = {
        name,
        description: description || null,
        risk_tolerance: riskTolerance,
        position_weights: positionWeights as Record<DbPosition, number>,
        player_targets: playerTargets,
        player_avoids: playerAvoids,
        team_avoids: teamAvoids,
      }

      // Format-specific — NO cross-contamination
      if (format === 'auction') {
        updates.budget_allocation = budgetAllocation
        updates.max_bid_percentage = maxBidPct
        updates.round_targets = null
        updates.position_round_priority = null
      } else {
        updates.round_targets = roundTargets as Record<DbPosition, number[]>
        updates.budget_allocation = null
        updates.max_bid_percentage = null
      }

      await onSave(updates)
    } finally {
      setSaving(false)
    }
  }

  // Budget allocation helpers
  const budgetTotal = Object.values(budgetAllocation).reduce((s, v) => s + v, 0)
  const setBudgetFor = (key: string, val: number) => {
    setBudgetAllocation((prev) => ({ ...prev, [key]: val }))
  }

  // Round target helpers
  const toggleRound = (pos: string, round: number) => {
    setRoundTargets((prev) => {
      const current = prev[pos] ?? []
      const next = current.includes(round)
        ? current.filter((r) => r !== round)
        : [...current, round].sort((a, b) => a - b)
      return { ...prev, [pos]: next }
    })
  }

  // Player target helpers
  const addTarget = () => {
    const trimmed = newTargetName.trim()
    if (!trimmed || playerTargets.some((t) => t.player_name === trimmed)) return
    setPlayerTargets((prev) => [...prev, { player_id: '', player_name: trimmed, weight: 7 }])
    setNewTargetName('')
  }

  const removeTarget = (name: string) => {
    setPlayerTargets((prev) => prev.filter((t) => t.player_name !== name))
  }

  const setTargetWeight = (name: string, weight: number) => {
    setPlayerTargets((prev) =>
      prev.map((t) => (t.player_name === name ? { ...t, weight } : t))
    )
  }

  // Player avoid helpers
  const addAvoid = () => {
    const trimmed = newAvoidName.trim()
    if (!trimmed || playerAvoids.some((a) => a.player_name === trimmed)) return
    setPlayerAvoids((prev) => [...prev, { player_id: '', player_name: trimmed, severity: 'soft' }])
    setNewAvoidName('')
  }

  const removeAvoid = (name: string) => {
    setPlayerAvoids((prev) => prev.filter((a) => a.player_name !== name))
  }

  const toggleAvoidSeverity = (name: string) => {
    setPlayerAvoids((prev) =>
      prev.map((a) =>
        a.player_name === name ? { ...a, severity: a.severity === 'soft' ? 'hard' : 'soft' } : a
      )
    )
  }

  // Team avoid helpers
  const toggleTeamAvoid = (team: string) => {
    setTeamAvoids((prev) =>
      prev.includes(team) ? prev.filter((t) => t !== team) : [...prev, team]
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg font-semibold border-none px-0 h-auto focus-visible:ring-0"
            placeholder="Strategy name"
          />
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="text-sm text-muted-foreground border-none px-0 h-auto focus-visible:ring-0 mt-0.5"
            placeholder="Short description"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !name.trim()}>
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      <Badge variant="outline" className="text-xs">{strategy.archetype}</Badge>

      {/* Risk Tolerance */}
      <SectionToggle
        title="Risk Tolerance"
        icon={<ShieldAlert className="h-4 w-4" />}
        expanded={expandedSections.has('risk')}
        onToggle={() => toggleSection('risk')}
      >
        <div className="flex gap-2">
          {RISK_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRiskTolerance(opt.value)}
              className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
                riskTolerance === opt.value
                  ? `${opt.color} border-current bg-current/10`
                  : 'text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </SectionToggle>

      {/* Position Weights */}
      <SectionToggle
        title="Position Emphasis"
        icon={<SlidersHorizontal className="h-4 w-4" />}
        expanded={expandedSections.has('weights')}
        onToggle={() => toggleSection('weights')}
      >
        <div className="space-y-4">
          {CORE_POSITIONS.map((pos) => (
            <div key={pos} className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{pos}</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {positionWeights[pos] ?? 5}/10
                </span>
              </div>
              <Slider
                value={[positionWeights[pos] ?? 5]}
                min={1}
                max={10}
                step={1}
                onValueChange={(v) => setPositionWeights((prev) => ({ ...prev, [pos]: sliderVal(v) }))}
              />
            </div>
          ))}
          {/* K and DST as minor toggles */}
          <div className="flex gap-4">
            {(['K', 'DST'] as DbPosition[]).map((pos) => (
              <div key={pos} className="flex items-center gap-2">
                <Label className="text-xs">{pos === 'DST' ? 'DEF' : pos}</Label>
                <Slider
                  value={[positionWeights[pos] ?? 2]}
                  min={1}
                  max={5}
                  step={1}
                  className="w-20"
                  onValueChange={(v) => setPositionWeights((prev) => ({ ...prev, [pos]: sliderVal(v) }))}
                />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {positionWeights[pos] ?? 2}
                </span>
              </div>
            ))}
          </div>
        </div>
      </SectionToggle>

      {/* Player Targets */}
      <SectionToggle
        title={`Player Targets (${playerTargets.length})`}
        icon={<Target className="h-4 w-4" />}
        expanded={expandedSections.has('targets')}
        onToggle={() => toggleSection('targets')}
      >
        <div className="space-y-3">
          {playerTargets.map((t) => (
            <div key={t.player_name} className="flex items-center gap-2">
              <span className="text-sm flex-1 min-w-0 truncate">{t.player_name}</span>
              <Slider
                value={[t.weight]}
                min={1}
                max={10}
                step={1}
                className="w-24"
                onValueChange={(v) => setTargetWeight(t.player_name, sliderVal(v))}
              />
              <span className="text-xs tabular-nums w-5 text-center text-muted-foreground">{t.weight}</span>
              <button onClick={() => removeTarget(t.player_name)} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newTargetName}
              onChange={(e) => setNewTargetName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTarget()}
              placeholder="Player name"
              className="flex-1 h-8 text-sm"
            />
            <Button variant="outline" size="sm" onClick={addTarget} disabled={!newTargetName.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </SectionToggle>

      {/* Player Avoids */}
      <SectionToggle
        title={`Player Avoids (${playerAvoids.length})`}
        icon={<ShieldAlert className="h-4 w-4" />}
        expanded={expandedSections.has('avoids')}
        onToggle={() => toggleSection('avoids')}
      >
        <div className="space-y-3">
          {playerAvoids.map((a) => (
            <div key={a.player_name} className="flex items-center gap-2">
              <span className="text-sm flex-1 min-w-0 truncate">{a.player_name}</span>
              <button
                onClick={() => toggleAvoidSeverity(a.player_name)}
                className={`text-xs px-2 py-0.5 rounded border ${
                  a.severity === 'hard'
                    ? 'text-red-500 border-red-500/50 bg-red-500/10'
                    : 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10'
                }`}
              >
                {a.severity}
              </button>
              <button onClick={() => removeAvoid(a.player_name)} className="text-muted-foreground hover:text-red-500">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <Input
              value={newAvoidName}
              onChange={(e) => setNewAvoidName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addAvoid()}
              placeholder="Player name"
              className="flex-1 h-8 text-sm"
            />
            <Button variant="outline" size="sm" onClick={addAvoid} disabled={!newAvoidName.trim()}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </div>
      </SectionToggle>

      {/* Team Avoids */}
      <SectionToggle
        title={`Team Avoids (${teamAvoids.length})`}
        icon={<ShieldAlert className="h-4 w-4" />}
        expanded={expandedSections.has('teams')}
        onToggle={() => toggleSection('teams')}
      >
        <div className="flex flex-wrap gap-1.5">
          {NFL_TEAMS.map((team) => {
            const active = teamAvoids.includes(team)
            return (
              <button
                key={team}
                onClick={() => toggleTeamAvoid(team)}
                className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                  active
                    ? 'text-red-500 border-red-500/50 bg-red-500/10'
                    : 'text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {team}
              </button>
            )
          })}
        </div>
      </SectionToggle>

      {/* Auction: Budget Allocation */}
      {format === 'auction' && (
        <SectionToggle
          title="Budget Allocation"
          icon={<DollarSign className="h-4 w-4" />}
          expanded={expandedSections.has('budget')}
          onToggle={() => toggleSection('budget')}
        >
          <div className="space-y-4">
            {BUDGET_POSITIONS.map((pos) => (
              <div key={pos} className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{pos === 'DST' ? 'DEF' : pos === 'bench' ? 'Bench' : pos}</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">{budgetAllocation[pos] ?? 0}%</span>
                </div>
                <Slider
                  value={[budgetAllocation[pos] ?? 0]}
                  min={0}
                  max={60}
                  step={1}
                  onValueChange={(v) => setBudgetFor(pos, sliderVal(v))}
                />
              </div>
            ))}
            <div className={`text-xs font-medium ${budgetTotal >= 95 && budgetTotal <= 105 ? 'text-green-500' : 'text-red-500'}`}>
              Total: {budgetTotal}% {budgetTotal < 95 ? '(too low)' : budgetTotal > 105 ? '(too high)' : ''}
            </div>

            {/* Max bid */}
            <div className="space-y-1 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Max single bid</Label>
                <span className="text-xs tabular-nums text-muted-foreground">{maxBidPct}%</span>
              </div>
              <Slider
                value={[maxBidPct]}
                min={10}
                max={70}
                step={1}
                onValueChange={(v) => setMaxBidPct(sliderVal(v))}
              />
            </div>
          </div>
        </SectionToggle>
      )}

      {/* Snake: Round Targets */}
      {format === 'snake' && (
        <SectionToggle
          title="Round Targets"
          icon={<ListOrdered className="h-4 w-4" />}
          expanded={expandedSections.has('rounds')}
          onToggle={() => toggleSection('rounds')}
        >
          <div className="space-y-4">
            {ALL_POSITIONS.map((pos) => {
              const rounds = roundTargets[pos] ?? []
              return (
                <div key={pos} className="space-y-1.5">
                  <Label className="text-sm">{pos === 'DST' ? 'DEF' : pos}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.from({ length: 16 }, (_, i) => i + 1).map((round) => {
                      const active = rounds.includes(round)
                      return (
                        <button
                          key={round}
                          onClick={() => toggleRound(pos, round)}
                          className={`w-7 h-7 rounded text-xs font-medium border transition-colors ${
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'text-muted-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          {round}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </SectionToggle>
      )}

      {/* Real-time value preview (FF-S07) */}
      {players.length > 0 && (
        <StrategyValuePreview
          players={players}
          originalStrategy={strategy}
          editedStrategy={editedStrategy}
          format={format}
          leagueBudget={leagueBudget}
        />
      )}

      {/* Bottom save bar — sticky on mobile */}
      <div className="sticky bottom-16 sm:bottom-0 z-10 bg-background/80 backdrop-blur-sm border-t p-3 -mx-4 px-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()} className="flex-1">
            <Save className="h-4 w-4 mr-1" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Collapsible section wrapper */
function SectionToggle({
  title,
  icon,
  expanded,
  onToggle,
  children,
}: {
  title: string
  icon: React.ReactNode
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <Card size="sm">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2.5 text-left"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {title}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <CardContent className="pt-0 pb-3">
          {children}
        </CardContent>
      )}
    </Card>
  )
}
